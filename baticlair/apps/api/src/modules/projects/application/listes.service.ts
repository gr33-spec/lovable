import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { DomainError, notFound } from "../../../platform/errors/domain-error.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";

/**
 * « MES LISTES » ET LA SUPPRESSION DÉFINITIVE (Greg, 1er novembre 2026). Une liste est un chantier (`Project`) et ce qui en
 * dépend. Audit des relations (`docs/accueil-et-mes-listes.md`) :
 * - supprimés avec la liste : chantier, documents importés et leurs fichiers (blob, traitements, pages : cascade),
 *   quantitatifs (cascade), relevés et leurs lignes (`Takeoff` n'a PAS de lien en cascade vers le chantier : supprimés
 *   ici), brouillons de la liste, reprises en attente de ses documents, journal des corrections de la liste (il cite le
 *   document) ;
 * - gardés : la consommation d'IA (`ai_execution`, `ai_analysis` : coût, jetons, décompte, aucun contenu), pour que les
 *   crédits déjà utilisés ne soient jamais recrédités ; une trace minimale (`liste_supprimee` : identifiant, auteur, date) ;
 * - JAMAIS supprimable directement (raison dite) : une demande de prix partie (réponses, offres, commandes avec), une
 *   réponse reçue par l'adresse Mobiiz, un devis de négoce rangé, une participation à un achat groupé (active ou close),
 *   un besoin d'un regroupement.
 */

export type RaisonRefus = "demande" | "reponse" | "offre" | "achat_groupe";

export const PHRASES_REFUS: Readonly<Record<RaisonRefus, string>> = {
  demande: "Cette liste est liée à une demande déjà envoyée. Elle ne peut pas être supprimée.",
  reponse: "Cette liste a reçu une réponse d'un négoce. Elle ne peut pas être supprimée.",
  offre: "Cette liste a une offre de négoce. Elle ne peut pas être supprimée.",
  achat_groupe: "Cette liste est liée à un achat groupé. Elle ne peut pas être supprimée.",
};

export interface Eligibilite {
  id: string;
  nom: string;
  supprimable: boolean;
  raison: RaisonRefus | null;
  phrase: string | null;
}

const MAX_IDS = 50;

/** Ce que la carte d'une liste montre (« Mes listes ») et ce que l'accueil suit (`resume.demande`). */
export interface ResumeListe {
  lignes: number;
  origine: "Devis" | "Photo ou document" | "Saisie" | null;
  statut: string;
  demande: { negoces: number; reponses: number; choisi: boolean } | null;
  achatGroupe: boolean;
  supprimable: boolean;
  raison: RaisonRefus | null;
  phrase: string | null;
}

export class ListesService {
  constructor(private readonly prisma: PrismaService) {}

  /** L'éligibilité de chaque liste demandée ; une seule liste d'une autre entreprise (ou inconnue) : 404 pour tout. */
  async verifier(tenant: TenantContext, ids: readonly string[]): Promise<Eligibilite[]> {
    const uniques = [...new Set(ids)].slice(0, MAX_IDS);
    const projets = await this.prisma.project.findMany({ where: { id: { in: uniques }, companyId: tenant.companyId }, select: { id: true, name: true } });
    if (projets.length !== uniques.length) throw notFound("Project");
    const raisons = await this.raisons(tenant.companyId, uniques);
    return uniques.map((id) => {
      const raison = raisons.get(id) ?? null;
      return { id, nom: projets.find((p) => p.id === id)!.name, supprimable: raison === null, raison, phrase: raison ? PHRASES_REFUS[raison] : null };
    });
  }

  /** Le résumé de chaque liste, en sept requêtes pour toute la page (jamais une par liste). */
  async resumes(companyId: string, projets: readonly { id: string; status: string }[]): Promise<Map<string, ResumeListe>> {
    const ids = projets.map((p) => p.id);
    const out = new Map<string, ResumeListe>();
    if (ids.length === 0) return out;
    const [takeoffs, demandes, raisons] = await Promise.all([
      this.prisma.takeoff.findMany({
        where: { companyId, projectId: { in: ids } },
        orderBy: { createdAt: "desc" },
        select: { projectId: true, status: true, source: true, _count: { select: { lines: true } }, lines: { select: { origin: true }, take: 1, orderBy: { position: "asc" } } },
      }),
      this.prisma.priceRequest.findMany({
        where: { companyId, projectId: { in: ids } },
        orderBy: { createdAt: "desc" },
        select: { projectId: true, classifiedAt: true, retainedSupplierIds: true, recipients: { select: { status: true, sentAt: true, reponduLe: true, documentId: true } } },
      }),
      this.raisons(companyId, ids),
    ]);
    for (const p of projets) {
      const t = takeoffs.find((x) => x.projectId === p.id);
      const ds = demandes.filter((d) => d.projectId === p.id);
      const recipients = ds.flatMap((d) => d.recipients);
      const demande = ds.length
        ? {
            negoces: recipients.filter((r) => r.status !== "to_send" || r.sentAt !== null).length,
            reponses: recipients.filter((r) => r.status === "received" || r.reponduLe !== null || r.documentId !== null).length,
            choisi: ds.some((d) => d.classifiedAt !== null || d.retainedSupplierIds.length > 0),
          }
        : null;
      const raison = raisons.get(p.id) ?? null;
      const achatGroupe = raison === "achat_groupe";
      const origine = !t ? null : t.source === "pdf" ? "Devis" : t.lines[0]?.origin === "liste" ? "Photo ou document" : "Saisie";
      const statut =
        p.status === "archived"
          ? "Terminée"
          : demande?.choisi
            ? "Négoce retenu"
            : demande && demande.reponses > 0
              ? demande.reponses > 1
                ? `${demande.reponses} réponses reçues`
                : "1 réponse reçue"
              : demande
                ? "Demande envoyée"
                : achatGroupe
                  ? "Achat groupé"
                  : t?.status === "validated"
                    ? "Prête"
                    : t
                      ? "À vérifier"
                      : "Brouillon";
      out.set(p.id, { lignes: t?._count.lines ?? 0, origine, statut, demande, achatGroupe, supprimable: raison === null, raison, phrase: raison ? PHRASES_REFUS[raison] : null });
    }
    return out;
  }

  /** Les raisons de refus, une par liste (la plus forte d'abord), calculées en six requêtes pour toutes les listes. */
  async raisons(companyId: string, ids: readonly string[], db: Pick<PrismaService, "besoinNegocie" | "ligneAchatGroupe" | "priceRequest" | "document" | "emailRecuArtisan" | "besoin"> = this.prisma): Promise<Map<string, RaisonRefus>> {
    const out = new Map<string, RaisonRefus>();
    if (ids.length === 0) return out;
    const [achats, achatsAnciens, demandes, offres, emails, besoins] = await Promise.all([
      db.besoinNegocie.findMany({ where: { companyId, projectId: { in: [...ids] } }, select: { projectId: true } }),
      db.ligneAchatGroupe.findMany({ where: { companyId, projectId: { in: [...ids] } }, select: { projectId: true } }),
      db.priceRequest.findMany({ where: { companyId, projectId: { in: [...ids] } }, select: { projectId: true } }),
      db.document.findMany({ where: { companyId, projectId: { in: [...ids] }, purpose: "supplier_quote" }, select: { projectId: true } }),
      db.emailRecuArtisan.findMany({ where: { companyId, projectId: { in: [...ids] } }, select: { projectId: true } }),
      db.besoin.findMany({ where: { companyId, projectId: { in: [...ids] } }, select: { projectId: true } }),
    ]);
    const poser = (rows: { projectId: string | null }[], r: RaisonRefus) => rows.forEach((x) => x.projectId && !out.has(x.projectId) && out.set(x.projectId, r));
    poser(achats, "achat_groupe");
    poser(achatsAnciens, "achat_groupe");
    poser(besoins, "achat_groupe");
    poser(demandes, "demande");
    poser(emails, "reponse");
    poser(offres, "offre");
    return out;
  }

  /**
   * Supprime définitivement des listes, toutes ou aucune : une seule non supprimable et rien n'est touché (409, avec la
   * liste des refus). Idempotent : une liste déjà supprimée par cette entreprise compte comme supprimée (trace).
   */
  async supprimer(tenant: TenantContext, ids: readonly string[]): Promise<{ supprimees: string[] }> {
    assertCanWrite(tenant);
    const uniques = [...new Set(ids)].slice(0, MAX_IDS);
    const deja = await this.prisma.listeSupprimee.findMany({ where: { companyId: tenant.companyId, projectId: { in: uniques } }, select: { projectId: true } });
    const dejaIds = new Set(deja.map((d) => d.projectId));
    const restantes = uniques.filter((id) => !dejaIds.has(id));
    if (restantes.length === 0) return { supprimees: uniques };
    const verif = await this.verifier(tenant, restantes);
    const refus = verif.filter((v) => !v.supprimable);
    if (refus.length > 0) {
      throw new DomainError("conflict", "Some lists cannot be deleted", { reason: "liste_non_supprimable", phrase: refus[0]!.phrase, refus: refus.map((r) => ({ id: r.id, nom: r.nom, raison: r.raison, phrase: r.phrase })) });
    }
    await this.prisma.$transaction(async (tx) => {
      // Re-vérifiée dans la transaction : une demande envoyée entre-temps bloque tout.
      const encore = await this.raisons(tenant.companyId, restantes, tx);
      if (encore.size > 0) {
        const [premier] = [...encore.values()];
        throw new DomainError("conflict", "Some lists cannot be deleted", { reason: "liste_non_supprimable", phrase: PHRASES_REFUS[premier!], refus: [...encore].map(([id, raison]) => ({ id, raison, phrase: PHRASES_REFUS[raison] })) });
      }
      const documents = await tx.document.findMany({ where: { companyId: tenant.companyId, projectId: { in: restantes } }, select: { id: true } });
      const docIds = documents.map((d) => d.id);
      await tx.takeoff.deleteMany({ where: { companyId: tenant.companyId, projectId: { in: restantes } } });
      await tx.correctionEvent.deleteMany({ where: { companyId: tenant.companyId, projectId: { in: restantes } } });
      await tx.brouillon.deleteMany({ where: { companyId: tenant.companyId, OR: restantes.map((id) => ({ url: { startsWith: `/chantiers/${id}` } })) } });
      if (docIds.length > 0) await tx.reprise.deleteMany({ where: { companyId: tenant.companyId, cle: { in: docIds.map((d) => `lecture_ia:${d}`) } } });
      // Le chantier : ses documents (fichiers, traitements, pages), quantitatifs suivent en cascade.
      await tx.project.deleteMany({ where: { companyId: tenant.companyId, id: { in: restantes } } });
      await tx.listeSupprimee.createMany({ data: restantes.map((projectId) => ({ companyId: tenant.companyId, projectId, userId: tenant.userId })), skipDuplicates: true });
    });
    return { supprimees: uniques };
  }
}
