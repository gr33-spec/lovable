import { suiviDuChantier, prixAuVolume, type Suivi } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { notFound } from "../../../platform/errors/domain-error.js";
import { isUuid } from "../../../platform/validation/ids.js";
import type { TenantContext } from "../../tenancy/index.js";
import type { ReviewedTakeoff } from "../../takeoff/index.js";

const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/**
 * LE SUIVI FAÇON COLIS (nouveau cap du 22 octobre 2026) : « sur chaque chantier : Liste prête → Prix demandés → Prix
 * reçus → Commandé, avec une phrase sur ce qui se passe et quoi faire ». Lu dans la base, sans IA : la liste du chantier,
 * ses demandes de prix (envoi seul) et ses lignes au groupé (demande commune), les devis reçus, la commande. Ouvert que le
 * groupé soit allumé ou non : l'envoi seul suffit à suivre un chantier.
 */
export class SuiviService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewed: (tenant: TenantContext, takeoffId: string) => Promise<ReviewedTakeoff>,
  ) {}

  async suivi(tenant: TenantContext, projectId: string): Promise<Suivi> {
    if (!isUuid(projectId)) throw notFound("Project");
    const project = await this.prisma.project.findFirst({ where: { id: projectId, companyId: tenant.companyId }, select: { id: true } });
    if (!project) throw notFound("Project");
    const takeoff = await this.prisma.takeoff.findFirst({ where: { projectId, companyId: tenant.companyId }, orderBy: { createdAt: "desc" }, select: { id: true, calculatedAt: true, status: true } });
    let liste = false;
    // Plan « finition », bloc 5 : avant « Calculer ma liste », la liste n'est pas prête (le suivi cochait « Liste prête »
    // au-dessus des questions). Une liste validée avant que le calcul soit daté compte comme calculée.
    const questions = !!takeoff && !takeoff.calculatedAt && takeoff.status !== "validated";
    let lignesARegler = 0;
    if (takeoff) {
      const r = await this.reviewed(tenant, takeoff.id).catch(() => null);
      const rows = r ? r.purchase.screen.groups.flatMap((g) => g.rows) : [];
      liste = !questions && rows.length > 0;
      lignesARegler = rows.filter((row) => row.status === "check").length;
    }
    // L'envoi seul : chaque négoce à qui la demande est partie, et les devis reçus (déposés ou lus).
    const demandesSeul = await this.prisma.priceRequest.findMany({
      where: { projectId, companyId: tenant.companyId },
      select: { classifiedAt: true, retainedSupplierIds: true, orderFeedback: true, recipients: { select: { status: true, documentId: true } } },
    });
    const envoyes = demandesSeul.flatMap((d) => d.recipients).filter((x) => x.status === "sent" || x.status === "received" || x.documentId);
    const recus = envoyes.filter((x) => x.documentId || x.status === "received");
    const offres = recus.length
      ? await this.prisma.supplierOffer.findMany({ where: { companyId: tenant.companyId, documentId: { in: recus.map((x) => x.documentId).filter((id): id is string => !!id) } }, select: { totalHT: true } })
      : [];
    const totaux = offres.map((o) => Number((o.totalHT ?? "").replace(",", "."))).filter((n) => Number.isFinite(n) && n > 0);
    // Le groupé : la demande commune partie aux négoces du lot, leurs devis, le meilleur prix unitaire lu.
    const besoins = await this.prisma.besoin.findMany({
      where: { projectId, companyId: tenant.companyId, statut: { not: "retire" } },
      select: { statut: true, lot: { select: { statut: true, besoins: { where: { statut: { not: "retire" } }, select: { quantite: true, statut: true } }, reponses: { select: { deposeLe: true, statutExtraction: true, prix: true } } } }, offre: { select: { bon: { select: { id: true } } } } },
    });
    let demandesGroupe = 0;
    let devisGroupe = 0;
    let meilleurUnitaire: number | null = null;
    for (const b of besoins) {
      if (!b.lot || b.lot.statut === "ouvert") continue;
      demandesGroupe = Math.max(demandesGroupe, b.lot.reponses.length);
      devisGroupe = Math.max(devisGroupe, b.lot.reponses.filter((x) => x.deposeLe).length);
      const volume = b.lot.besoins.filter((x) => x.statut !== "en_attente").reduce((s, x) => s + Number(x.quantite), 0);
      for (const x of b.lot.reponses) {
        if (!x.deposeLe || x.statutExtraction !== "lue") continue;
        const p = prixAuVolume(Array.isArray(x.prix) ? (x.prix as { palier: string | null; prixUnitaire: string | null; totalHt: string | null }[]) : [], volume);
        if (p !== null) meilleurUnitaire = meilleurUnitaire === null ? p : Math.min(meilleurUnitaire, p);
      }
    }
    const commande =
      demandesSeul.some((d) => d.orderFeedback !== null || (d.classifiedAt !== null && d.retainedSupplierIds.length > 0)) ||
      besoins.some((b) => b.statut === "commande" || b.statut === "livre" || !!b.offre?.bon);
    const meilleur = totaux.length ? `${euros(Math.min(...totaux))} HT` : meilleurUnitaire !== null ? `${euros(meilleurUnitaire)} HT l'unité` : null;
    return suiviDuChantier({ liste, questions, lignesARegler, demandes: envoyes.length + demandesGroupe, devis: recus.length + devisGroupe, commande, meilleur });
  }
}
