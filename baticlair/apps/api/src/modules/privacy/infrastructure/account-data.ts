import type { PrismaService } from "../../../platform/database/prisma.service.js";

/**
 * RGPD (audit de lancement, B4) : ce que BatiClair garde d'un artisan, à emporter (article 20) ou à
 * effacer (article 17). Les données appartiennent à l'entreprise : celle dont l'artisan est le seul
 * membre part avec lui ; une entreprise partagée reste, il en est seulement retiré.
 */
/** Durée de conservation après la dernière connexion (page Confidentialité). */
export const INACTIVE_YEARS = 3;

export class AccountData {
  constructor(private readonly prisma: PrismaService) {}

  /** Tout ce que BatiClair garde, lisible : profil, entreprises, chantiers, devis (sans le fichier), listes, fournisseurs, demandes, offres. */
  async export(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, emailVerified: true, createdAt: true } });
    const memberships = await this.prisma.membership.findMany({ where: { userId }, select: { role: true, companyId: true } });
    const companies = [];
    for (const m of memberships) {
      const companyId = m.companyId;
      const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true, plan: true, trades: true, createdAt: true } });
      companies.push({
        ...company,
        role: m.role,
        projects: await this.prisma.project.findMany({
          where: { companyId },
          select: { id: true, name: true, clientName: true, address: true, status: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
        documents: (
          await this.prisma.document.findMany({
            where: { companyId },
            select: { id: true, projectId: true, purpose: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          })
        ).map((d) => ({ ...d, file: `/v1/documents/${d.id}/file` })),
        takeoffs: await this.prisma.takeoff.findMany({
          where: { companyId },
          select: {
            id: true,
            projectId: true,
            status: true,
            answers: true,
            createdAt: true,
            validatedAt: true,
            lines: { select: { designation: true, quantityRaw: true, unitRaw: true, reference: true, role: true }, orderBy: { position: "asc" } },
          },
        }),
        suppliers: await this.prisma.supplier.findMany({ where: { companyId }, select: { name: true, contactName: true, email: true, phone: true, notes: true, createdAt: true } }),
        priceRequests: await this.prisma.priceRequest.findMany({
          where: { companyId },
          select: { id: true, projectId: true, message: true, dueDate: true, createdAt: true, recipients: { select: { status: true, supplier: { select: { name: true } } } } },
        }),
        offers: await this.prisma.supplierOffer.findMany({
          where: { companyId },
          select: { id: true, documentId: true, createdAt: true, lines: { select: { designation: true, quantityRaw: true, unitRaw: true, unitPrice: true, discountRate: true, lineTotal: true } } },
        }),
        preferences: await this.prisma.companyPreference.findMany({ where: { companyId }, select: { kind: true, key: true, value: true, status: true, createdAt: true } }),
        corrections: await this.prisma.correctionEvent.findMany({ where: { companyId }, select: { action: true, cause: true, reason: true, before: true, after: true, createdAt: true } }),
      });
    }
    return { exportedAt: new Date().toISOString(), user, companies };
  }

  /** Comptes sans visite depuis 3 ans : effacés comme une suppression demandée (page Confidentialité). */
  async purgeInactive(now: Date = new Date()): Promise<{ usersDeleted: number }> {
    const cutoff = new Date(now);
    cutoff.setFullYear(cutoff.getFullYear() - INACTIVE_YEARS);
    const stale = await this.prisma.user.findMany({ where: { lastSeenAt: { lt: cutoff } }, select: { id: true }, take: 200 });
    for (const u of stale) await this.delete(u.id);
    return { usersDeleted: stale.length };
  }

  /**
   * Efface le compte. Entreprise dont l'artisan est le seul membre : supprimée avec tout son
   * contenu (chantiers, devis et leurs fichiers, listes, fournisseurs, demandes, offres, mesures
   * d'usage). Entreprise partagée : l'artisan en est retiré, ses traces nominatives sont anonymisées.
   */
  async delete(userId: string): Promise<{ companiesDeleted: number; companiesLeft: number }> {
    return this.prisma.$transaction(async (tx) => {
      const memberships = await tx.membership.findMany({ where: { userId }, select: { companyId: true } });
      let companiesDeleted = 0;
      let companiesLeft = 0;
      for (const { companyId } of memberships) {
        const others = await tx.membership.count({ where: { companyId, userId: { not: userId } } });
        if (others === 0) {
          // Les destinataires d'une demande retiennent leur fournisseur : les demandes partent d'abord.
          await tx.priceRequest.deleteMany({ where: { companyId } });
          await tx.company.delete({ where: { id: companyId } });
          companiesDeleted++;
        } else {
          await tx.membership.deleteMany({ where: { companyId, userId } });
          companiesLeft++;
        }
      }
      // Traces nominatives restant dans une entreprise partagée : anonymisées.
      await tx.aiExecution.updateMany({ where: { userId }, data: { userId: null } });
      await tx.aiAnalysis.updateMany({ where: { userId }, data: { userId: null } });
      await tx.correctionEvent.updateMany({ where: { userId }, data: { userId: null } });
      await tx.idempotencyRecord.deleteMany({ where: { userId } });
      // Le compte, ses sessions et ses identifiants (cascade).
      await tx.user.delete({ where: { id: userId } });
      return { companiesDeleted, companiesLeft };
    });
  }
}
