import type { Prisma } from "../../../generated/prisma/client.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { AnalysisKind, AnalysisRecord, AnalysisRepository } from "../application/analysis.repository.js";

const FIELDS = {
  id: true,
  companyId: true,
  userId: true,
  projectId: true,
  documentId: true,
  kind: true,
  status: true,
  billable: true,
  billingMonth: true,
  costMicroUsd: true,
  startedAt: true,
  readingStats: true,
} as const;

export class PrismaAnalysisRepository implements AnalysisRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByDocument(companyId: string, documentId: string): Promise<AnalysisRecord | null> {
    return this.prisma.aiAnalysis.findFirst({ where: { companyId, documentId }, select: FIELDS });
  }

  async monthlyLimit(companyId: string): Promise<number | null> {
    const c = await this.prisma.company.findUnique({ where: { id: companyId }, select: { monthlyAnalysisLimit: true } });
    return c?.monthlyAnalysisLimit ?? null;
  }

  async countBillable(companyId: string, billingMonth: string | null): Promise<number> {
    const r = await this.prisma.aiAnalysis.aggregate({ where: { companyId, ...(billingMonth ? { billingMonth } : {}), billable: true }, _sum: { poids: true } });
    return r._sum.poids ?? 0;
  }

  create(data: { companyId: string; userId: string | null; projectId: string; documentId: string; kind: AnalysisKind; poids?: number }): Promise<AnalysisRecord> {
    return this.prisma.aiAnalysis.create({ data: { ...data, status: "started" }, select: FIELDS });
  }

  restart(id: string, userId: string | null, poids?: number): Promise<AnalysisRecord> {
    return this.prisma.aiAnalysis.update({ where: { id }, data: { status: "started", userId, completedAt: null, startedAt: new Date(), ...(poids ? { poids } : {}) }, select: FIELDS });
  }

  async complete(id: string, billingMonth: string, at: Date, billable = true): Promise<AnalysisRecord> {
    const current = await this.prisma.aiAnalysis.findUniqueOrThrow({ where: { id }, select: { billingMonth: true } });
    return this.prisma.aiAnalysis.update({
      where: { id },
      // Le mois de décompte est fixé une fois pour toutes, à la première réussite.
      data: { status: "completed", billable, billingMonth: current.billingMonth ?? billingMonth, completedAt: at },
      select: FIELDS,
    });
  }

  async markBillable(id: string): Promise<void> {
    await this.prisma.aiAnalysis.update({ where: { id }, data: { billable: true } });
  }

  async saveReadingStats(id: string, stats: object): Promise<void> {
    await this.prisma.aiAnalysis.update({ where: { id }, data: { readingStats: stats as Prisma.InputJsonValue } });
  }

  fail(id: string, at: Date): Promise<AnalysisRecord> {
    return this.prisma.aiAnalysis.update({ where: { id }, data: { status: "failed", completedAt: at }, select: FIELDS });
  }
}
