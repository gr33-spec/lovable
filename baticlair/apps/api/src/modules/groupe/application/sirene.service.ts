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

  /** L'import (tâche mensuelle) : chaque département × chaque NAF, page par page (curseur Sirene), upsert par SIRET. */
  async importer(): Promise<{ importes: number; departements: string[]; disponible: boolean }> {
    if (!this.reglages.apiKey) return { importes: 0, departements: this.reglages.departements, disponible: false };
    let importes = 0;
    const maintenant = new Date();
    for (const departement of this.reglages.departements) {
      for (const naf of this.reglages.naf) {
        let curseur = "*";
        for (let page = 0; page < 50; page++) {
          const q = `periode(activitePrincipaleEtablissement:${naf} AND etatAdministratifEtablissement:A) AND codePostalEtablissement:${departement}*`;
          const url = `https://api.insee.fr/api-sirene/3.11/siret?q=${encodeURIComponent(q)}&nombre=1000&curseur=${encodeURIComponent(curseur)}`;
          let body: PageSirene;
          try {
            const res = await this.http(url, { headers: { "X-INSEE-Api-Key-Integration": this.reglages.apiKey, accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
            if (res.status === 404) break;
            if (!res.ok) break;
            body = (await res.json()) as PageSirene;
          } catch {
            break;
          }
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
              naf: periode?.activitePrincipaleEtablissement ?? naf,
              importeLe: maintenant,
            };
            await this.prisma.negoceSirene.upsert({ where: { siret: e.siret }, create: { siret: e.siret, ...data }, update: data });
            importes++;
          }
          const suivant = body.header?.curseurSuivant;
          if (!suivant || suivant === curseur || (body.etablissements?.length ?? 0) === 0) break;
          curseur = suivant;
        }
      }
    }
    return { importes, departements: this.reglages.departements, disponible: true };
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
