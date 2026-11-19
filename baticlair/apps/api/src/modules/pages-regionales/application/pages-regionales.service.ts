import { departement as departementConnu, estLotV1, lotsComprisV1, metierInscriptionOuvert, PARCOURS_ESSAI, TRADES, zoneDuCodePostal, type LotV1 } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";

/** Les métiers qui peuvent s'inscrire en liste d'attente : tous ceux qui ne sont pas ouverts, « Autre métier » compris. */
export const METIERS_EN_ATTENTE: readonly string[] = TRADES.map((t) => t.id).filter((id) => !metierInscriptionOuvert(id));
const LIBELLES = new Map(TRADES.map((t) => [t.id, t.label]));
export const libelleMetier = (id: string) => LIBELLES.get(id) ?? id;

/** Au plus cinq achats montrés sur une page publique : le nom du produit et sa date de fin, jamais une entreprise. */
const ACHATS_MONTRES = 5;

export interface RegroupementsDuDepartement {
  departement: { code: string; nom: string } | null;
  /** Le nombre d'achats groupés ouverts ; 0 se dit « Sois le premier » à l'écran, jamais « 0 ». */
  total: number;
  achats: { nom: string; finLe: string }[];
}

/**
 * LES PAGES RÉGIONALES (Greg, 19 novembre 2026, « Couvreurs de Bretagne ») : deux points d'entrée publics.
 * 1) Les regroupements en cours d'un département, pour la carte : seulement ce que n'importe quel artisan du département
 *    verrait en ouvrant les achats groupés (nom du produit, fin), jamais un nom d'entreprise ni une quantité.
 * 2) La liste d'attente des métiers pas encore ouverts : un e-mail par métier, sans compte, lue dans l'espace admin.
 */
export class PagesRegionalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly options: { achatsGroupesV1: boolean },
    private readonly now: () => Date = () => new Date(),
  ) {}

  async regroupements(code: string, lots: readonly string[]): Promise<RegroupementsDuDepartement> {
    const dep = departementConnu(code);
    if (!dep) return { departement: null, total: 0, achats: [] };
    const zone = { code: dep.code, nom: dep.nom };
    // Achats groupés coupés : rien d'ouvert à rejoindre, la page invite à lancer le premier.
    if (!this.options.achatsGroupesV1) return { departement: zone, total: 0, achats: [] };
    const retenus = [...new Set(lots.filter((l): l is LotV1 => estLotV1(l)).flatMap((l) => lotsComprisV1(l)))];
    const where = { departement: dep.code, statut: "ouvert", ouvertJusquau: { gt: this.now() }, ...(retenus.length ? { lot: { in: retenus } } : {}) };
    const [total, achats] = await Promise.all([
      this.prisma.achatGroupeV1.count({ where }),
      this.prisma.achatGroupeV1.findMany({ where, orderBy: { ouvertJusquau: "asc" }, take: ACHATS_MONTRES, select: { nom: true, ouvertJusquau: true } }),
    ]);
    return { departement: zone, total, achats: achats.map((a) => ({ nom: a.nom, finLe: a.ouvertJusquau.toISOString() })) };
  }

  /** Inscrit (ou met à jour) l'e-mail pour un métier. Idempotent : la même adresse pour le même métier ne fait qu'une ligne. */
  async rejoindreListeAttente(entree: { email: string; metier: string; departement?: string | null; source?: string | null }): Promise<void> {
    const email = entree.email.trim().toLowerCase();
    const departement = entree.departement ? (departementConnu(entree.departement)?.code ?? null) : null;
    const source = entree.source?.trim().slice(0, 60) || null;
    await this.prisma.listeAttenteMetier.upsert({
      where: { email_metier: { email, metier: entree.metier } },
      create: { email, metier: entree.metier, departement, source },
      update: { ...(departement ? { departement } : {}), ...(source ? { source } : {}) },
    });
  }

  /**
   * LE DÉCOMPTE DES INSCRITS (nouvel onboarding, Greg, 19 novembre 2026) : les entreprises par métier et par département
   * (celui choisi sur la carte, sinon celui de l'adresse). Chiffres d'ensemble seulement, aucun nom.
   */
  async inscrits() {
    const cs = await this.prisma.company.findMany({ select: { trades: true, departement: true, address: true, parcoursInscription: true } });
    const metiers = new Map<string, { nombre: number; essai: number }>();
    const deps = new Map<string, { nombre: number; essai: number }>();
    const ajouter = (m: Map<string, { nombre: number; essai: number }>, k: string, essai: boolean) => {
      const v = m.get(k) ?? { nombre: 0, essai: 0 };
      v.nombre += 1;
      if (essai) v.essai += 1;
      m.set(k, v);
    };
    for (const c of cs) {
      const essai = c.parcoursInscription === PARCOURS_ESSAI;
      for (const t of c.trades.length ? c.trades : ["other"]) ajouter(metiers, t, essai);
      ajouter(deps, departementConnu(c.departement)?.code ?? zoneDuCodePostal(c.address) ?? "", essai);
    }
    const trier = <T extends { nombre: number }>(l: T[]) => l.sort((a, b) => b.nombre - a.nombre);
    return {
      total: cs.length,
      essai: cs.filter((c) => c.parcoursInscription === PARCOURS_ESSAI).length,
      parMetier: trier([...metiers].map(([metier, v]) => ({ metier, libelle: libelleMetier(metier), ...v }))),
      parDepartement: trier([...deps].map(([code, v]) => ({ code: code || null, nom: code ? (departementConnu(code)?.nom ?? code) : "Non indiqué", ...v }))),
    };
  }

  /** L'espace admin : le décompte par métier et par département, puis les inscrits (les plus récents d'abord). */
  async listeAttente() {
    const lignes = await this.prisma.listeAttenteMetier.findMany({ orderBy: { createdAt: "desc" }, take: 2000 });
    const compter = (cles: string[]) => [...cles.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return {
      total: await this.prisma.listeAttenteMetier.count(),
      parMetier: compter(lignes.map((l) => l.metier)).map(([metier, nombre]) => ({ metier, libelle: libelleMetier(metier), nombre })),
      parDepartement: compter(lignes.map((l) => l.departement ?? "")).map(([code, nombre]) => ({ code: code || null, nom: code ? (departementConnu(code)?.nom ?? code) : "Non indiqué", nombre })),
      inscrits: lignes.slice(0, 500).map((l) => ({ id: l.id, email: l.email, metier: l.metier, libelle: libelleMetier(l.metier), departement: l.departement, nomDepartement: l.departement ? (departementConnu(l.departement)?.nom ?? l.departement) : null, source: l.source, le: l.createdAt.toISOString() })),
    };
  }
}
