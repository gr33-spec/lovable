import type { CompanyPreference, CorrectionAction, CorrectionCause, LineSnapshot, PreferenceKind } from "@baticlair/domain";
import type { Prisma } from "../../../generated/prisma/client.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { isUuid } from "../../../platform/validation/ids.js";
import type { TenantContext } from "../../tenancy/index.js";
import type { CompanyMemoryStore } from "../application/company-memory.js";
import type { CorrectionJournalStore, CorrectionRecord } from "../application/correction-journal.js";

const json = (v: unknown) => v as Prisma.InputJsonValue;

/** Journal : uniquement des créations et des lectures, toujours filtrées par l'entreprise active. */
export class PrismaCorrectionJournalStore implements CorrectionJournalStore {
  constructor(private readonly prisma: PrismaService) {}

  async append(tenant: TenantContext, r: Omit<CorrectionRecord, "id" | "createdAt">): Promise<void> {
    await this.prisma.correctionEvent.create({
      data: {
        companyId: tenant.companyId,
        projectId: r.projectId,
        takeoffId: r.takeoffId,
        takeoffLineId: r.takeoffLineId,
        action: r.action,
        cause: r.cause,
        reason: r.reason ?? null,
        ...(r.before ? { before: json(r.before) } : {}),
        ...(r.after ? { after: json(r.after) } : {}),
        documentExcerpt: json(r.documentExcerpt),
        context: json(r.context),
        patternKey: r.patternKey,
        userId: r.userId,
      },
    });
  }

  async list(tenant: TenantContext, filter: { projectId?: string; takeoffLineId?: string } = {}): Promise<CorrectionRecord[]> {
    if ((filter.projectId && !isUuid(filter.projectId)) || (filter.takeoffLineId && !isUuid(filter.takeoffLineId))) return [];
    const rows = await this.prisma.correctionEvent.findMany({
      where: { companyId: tenant.companyId, ...filter },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      takeoffId: row.takeoffId,
      takeoffLineId: row.takeoffLineId,
      action: row.action as CorrectionAction,
      cause: row.cause as CorrectionCause | null,
      reason: row.reason,
      before: (row.before ?? null) as unknown as LineSnapshot | null,
      after: (row.after ?? null) as unknown as LineSnapshot | null,
      documentExcerpt: Array.isArray(row.documentExcerpt) ? row.documentExcerpt.filter((x): x is string => typeof x === "string") : [],
      context: (row.context ?? {}) as Record<string, unknown>,
      patternKey: row.patternKey,
      userId: row.userId,
      createdAt: row.createdAt,
    }));
  }
}

/** Mémoire de l'entreprise : jamais supprimée, seulement créée ou mise à jour (statut, confirmations). */
export class PrismaCompanyMemoryStore implements CompanyMemoryStore {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenant: TenantContext, filter: { kind?: PreferenceKind; key?: string } = {}): Promise<CompanyPreference[]> {
    const rows = await this.prisma.companyPreference.findMany({
      where: { companyId: tenant.companyId, ...filter },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind as PreferenceKind,
      key: row.key,
      value: row.value,
      status: row.status === "replaced" || row.status === "disabled" ? row.status : "active",
      explicit: row.explicit,
      confirmations: Array.isArray(row.confirmations) ? (row.confirmations as { projectId: string; at: string }[]) : [],
      lastContradictedAt: row.lastContradictedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async save(tenant: TenantContext, preferences: CompanyPreference[]): Promise<void> {
    await this.prisma.$transaction(
      preferences.map((p) => {
        const data = {
          status: p.status,
          explicit: p.explicit,
          confirmations: json(p.confirmations),
          lastContradictedAt: p.lastContradictedAt ? new Date(p.lastContradictedAt) : null,
        };
        return p.id
          ? // Mise à jour bornée à l'entreprise active : une préférence d'une autre entreprise ne peut pas être touchée.
            this.prisma.companyPreference.updateMany({ where: { id: p.id, companyId: tenant.companyId }, data })
          : this.prisma.companyPreference.create({
              data: { companyId: tenant.companyId, kind: p.kind, key: p.key, value: p.value, createdAt: new Date(p.createdAt), ...data },
            });
      }),
    );
  }
}
