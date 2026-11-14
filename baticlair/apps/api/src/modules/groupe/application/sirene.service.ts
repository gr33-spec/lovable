import { zoneDuCodePostal } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { TenantContext } from "../../tenancy/index.js";

/**
 * LA BASE NÉGOCES PRÉREMPLIE (plan du 20 octobre 2026, bloc 3) : les établissements actifs de l'API Sirene en négoce de
 * matériaux de construction (NAF 46.73A, 46.73B, 47.52A, 47.52B) dans les départements ouverts (22, 29, 35, 56). À la
 * saisie d'un négoce (trois lettres), « Mes négoces » les suggère, avec la source « Sirene » et la date d'import.
 * Sirene ne donne aucun e-mail : l'artisan le saisit, et le négoce ne reçoit rien sans lui.
 */
export interface SuggestionNegoce {
  siret: string;
  nom: string;
  adresse: string;
  codePostal: string;
  commune: string;
  departement: string;
  source: "Sirene";
  importeLe: string;
}

/** Le strict nécessaire de `fetch` (voir `siret-verifier.ts`). */
export type SireneHttp = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<{ status: number; ok: boolean; json(): Promise<unknown> }>;
export const SIRENE_HTTP = Symbol("SIRENE_HTTP");

interface PageSirene {
  header?: { curseur?: string; curseurSuivant?: string; total?: number };
  etablissements?: {
    siret: string;
    siren: string;
    uniteLegale?: { denominationUniteLegale?: string | null; prenom1UniteLegale?: string | null; nomUniteLegale?: string | null };
    adresseEtablissement?: { numeroVoieEtablissement?: string | null; indiceRepetitionEtablissement?: string | null; typeVoieEtablissement?: string | null; libelleVoieEtablissement?: string | null; codePostalEtablissement?: string | null; libelleCommuneEtablissement?: string | null };
    periodesEtablissement?: { enseigne1Etablissement?: string | null; denominationUsuelleEtablissement?: string | null; activitePrincipaleEtablissement?: string | null; etatAdministratifEtablissement?: string | null }[];
  }[];
}

/** Un cycle complet (tous les couples) par mois environ ; 50 pages de 1 000 au plus par couple. */
const CYCLE_JOURS = 25;
const PAGES_MAX = 50;

const propre = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|[\s'-])([a-zà-ÿ])/g, (m) => m.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();

export class SireneService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly http: SireneHttp,
    private readonly reglages: { apiKey: string | null; departements: string[]; naf: string[] },
  ) {}

  /**
   * L'import, repris page par page (dette n° 1) : la tâche quotidienne travaille `budgetMs` au plus (une fonction Vercel
   * est bornée), garde en base le curseur de chaque couple (département, NAF) et reprend là où elle s'est arrêtée. Un
   * cycle fini se relance tout seul `CYCLE_JOURS` plus tard ; `cycleTermine` dit où en est le cycle en cours.
   */
  async importer(maintenant = new Date(), budgetMs = 40_000): Promise<{ importes: number; departements: string[]; disponible: boolean; cycleTermine: boolean; couplesRestants: number }> {
    const couples = this.reglages.departements.flatMap((departement) => this.reglages.naf.map((naf) => ({ departement, naf, cle: `sirene:${departement}:${naf}` })));
    if (!this.reglages.apiKey) return { importes: 0, departements: this.reglages.departements, disponible: false, cycleTermine: false, couplesRestants: couples.length };
    const debut = Date.now();
    // Un cycle terminé depuis plus de CYCLE_JOURS repart de zéro.
    const cycle = await this.lire<{ termineLe?: string }>("sirene:cycle");
    if (cycle?.termineLe && maintenant.getTime() - Date.parse(cycle.termineLe) > CYCLE_JOURS * 24 * 3600 * 1000) {
      await this.prisma.parametreGroupe.deleteMany({ where: { cle: { startsWith: "sirene:" } } });
    }
    let importes = 0;
    let restants = 0;
    // Au moins une page par appel, quel que soit le budget : la tâche avance toujours.
    let pagesCeTour = 0;
    for (const couple of couples) {
      const etat = (await this.lire<{ curseur: string; termine: boolean; pages: number }>(couple.cle)) ?? { curseur: "*", termine: false, pages: 0 };
      if (etat.termine) continue;
      while (!etat.termine && etat.pages < PAGES_MAX) {
        if (pagesCeTour > 0 && Date.now() - debut > budgetMs) break;
        const q = `periode(activitePrincipaleEtablissement:${couple.naf} AND etatAdministratifEtablissement:A) AND codePostalEtablissement:${couple.departement}*`;
        const url = `https://api.insee.fr/api-sirene/3.11/siret?q=${encodeURIComponent(q)}&nombre=1000&curseur=${encodeURIComponent(etat.curseur)}`;
        let body: PageSirene;
        try {
          const res = await this.http(url, { headers: { "X-INSEE-Api-Key-Integration": this.reglages.apiKey, accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
          if (res.status === 404) {
            etat.termine = true;
            break;
          }
          if (!res.ok) break;
          body = (await res.json()) as PageSirene;
        } catch {
          break;
        }
        importes += await this.enregistrer(body, couple.naf, maintenant);
        etat.pages++;
        pagesCeTour++;
        const suivant = body.header?.curseurSuivant;
        if (!suivant || suivant === etat.curseur || (body.etablissements?.length ?? 0) === 0) etat.termine = true;
        else etat.curseur = suivant;
        await this.ecrire(couple.cle, etat);
      }
      if (etat.pages >= PAGES_MAX) etat.termine = true;
      await this.ecrire(couple.cle, etat);
      if (!etat.termine) restants++;
    }
    const cycleTermine = restants === 0;
    if (cycleTermine) await this.ecrire("sirene:cycle", { termineLe: maintenant.toISOString() });
    return { importes, departements: this.reglages.departements, disponible: true, cycleTermine, couplesRestants: restants };
  }

  private async enregistrer(body: PageSirene, nafDemande: string, maintenant: Date): Promise<number> {
    let n = 0;
    for (const e of body.etablissements ?? []) {
      const periode = e.periodesEtablissement?.[0];
      const ul = e.uniteLegale;
      const nom = periode?.enseigne1Etablissement || periode?.denominationUsuelleEtablissement || ul?.denominationUniteLegale || [ul?.prenom1UniteLegale, ul?.nomUniteLegale].filter(Boolean).join(" ");
      const a = e.adresseEtablissement ?? {};
      const codePostal = a.codePostalEtablissement ?? "";
      const zone = zoneDuCodePostal(codePostal);
      if (!nom || !zone || !/^\d{14}$/.test(e.siret)) continue;
      const data = {
        siren: e.siren,
        nom: propre(nom),
        adresse: [a.numeroVoieEtablissement, a.indiceRepetitionEtablissement, a.typeVoieEtablissement, a.libelleVoieEtablissement].filter(Boolean).join(" ").trim(),
        codePostal,
        commune: propre(a.libelleCommuneEtablissement ?? ""),
        departement: zone,
        naf: periode?.activitePrincipaleEtablissement ?? nafDemande,
        importeLe: maintenant,
      };
      await this.prisma.negoceSirene.upsert({ where: { siret: e.siret }, create: { siret: e.siret, ...data }, update: data });
      n++;
    }
    return n;
  }

  private async lire<T>(cle: string): Promise<T | null> {
    const p = await this.prisma.parametreGroupe.findUnique({ where: { cle } });
    return p ? (p.valeur as T) : null;
  }

  private async ecrire(cle: string, valeur: object): Promise<void> {
    await this.prisma.parametreGroupe.upsert({ where: { cle }, create: { cle, valeur }, update: { valeur } });
  }

  /** Trois lettres au moins ; le département de l'entreprise d'abord, sinon tous ceux importés ; huit au plus. */
  async suggestions(tenant: TenantContext, q: string): Promise<SuggestionNegoce[]> {
    const texte = q.trim();
    if (texte.length < 3) return [];
    const c = await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { address: true } });
    const departement = zoneDuCodePostal(c?.address ?? "");
    const where = { nom: { contains: texte, mode: "insensitive" as const } };
    const rows = await this.prisma.negoceSirene.findMany({ where: departement ? { ...where, departement } : where, orderBy: [{ nom: "asc" }], take: 8 });
    const reste = rows.length < 8 && departement ? await this.prisma.negoceSirene.findMany({ where: { ...where, departement: { not: departement } }, orderBy: [{ nom: "asc" }], take: 8 - rows.length }) : [];
    return [...rows, ...reste].map((r) => ({ siret: r.siret, nom: r.nom, adresse: r.adresse, codePostal: r.codePostal, commune: r.commune, departement: r.departement, source: "Sirene", importeLe: r.importeLe.toISOString().slice(0, 10) }));
  }
}
