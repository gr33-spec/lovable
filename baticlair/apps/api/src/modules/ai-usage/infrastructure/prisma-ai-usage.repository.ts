import { Prisma } from "../../../generated/prisma/client.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type {
  AiExecutionRecord,
  AiUsageRepository,
  ModelUsage,
  MonthlyUsage,
  MonthWindow,
  ProjectUsage,
  ReadingTotals,
  UsageTotals,
} from "../application/ai-usage.repository.js";

/** Bornes du mois civil, en heure locale (les horodatages sont stockés en UTC). */
function monthBounds(window: MonthWindow): { start: string; end: string } {
  const [y, m] = window.month.split("-").map(Number) as [number, number];
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { start: `${window.month}-01 00:00:00`, end: `${next}-01 00:00:00` };
}

function inMonth(column: string, window: MonthWindow): Prisma.Sql {
  const { start, end } = monthBounds(window);
  const local = Prisma.sql`(${Prisma.raw(column)} AT TIME ZONE 'UTC' AT TIME ZONE ${window.timezone})`;
  return Prisma.sql`${local} >= ${start}::timestamp AND ${local} < ${end}::timestamp`;
}

const n = (v: bigint | number | null | undefined) => Number(v ?? 0);
const big = (v: bigint | number | null | undefined) => BigInt(v ?? 0);

export class PrismaAiUsageRepository implements AiUsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async insert(record: AiExecutionRecord): Promise<{ id: string }> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.aiExecution.create({
        data: { ...record, costMicroUsd: BigInt(record.costMicroUsd) },
        select: { id: true },
      });
      if (record.processingId) {
        await tx.documentProcessing.update({
          where: { id: record.processingId, companyId: record.companyId },
          data: { actualMicroUsd: { increment: BigInt(record.costMicroUsd) } },
        });
      }
      return row;
    });
  }

  async monthly(companyId: string, window: MonthWindow): Promise<MonthlyUsage> {
    const company = Prisma.sql`e."companyId" = ${companyId}::uuid`;
    const month = inMonth(`e."createdAt"`, window);

    const [totalsRows, projectRows, modelRows, readingRows, versionRows] = await Promise.all([
      this.prisma.$queryRaw<Record<string, bigint | null>[]>`
        SELECT count(*) AS calls,
               count(*) FILTER (WHERE e.attempt > 1) AS retries,
               count(*) FILTER (WHERE e.status <> 'success') AS failed,
               sum(e."pagesText")::bigint AS pages_text,
               sum(e."pagesVision")::bigint AS pages_vision,
               sum(e."inputTokens")::bigint AS input_tokens,
               sum(e."outputTokens")::bigint AS output_tokens,
               sum(e."cacheReadTokens")::bigint AS cache_read,
               sum(e."cacheWrite5mTokens" + e."cacheWrite1hTokens")::bigint AS cache_write,
               sum(e."costMicroUsd")::bigint AS cost
        FROM ai_execution e WHERE ${company} AND ${month}`,
      this.prisma.$queryRaw<{ project_id: string | null; name: string | null; documents: bigint; calls: bigint; cost: bigint }[]>`
        SELECT e."projectId" AS project_id, p.name, count(DISTINCT e."documentId") AS documents,
               count(*) AS calls, sum(e."costMicroUsd")::bigint AS cost
        FROM ai_execution e LEFT JOIN project p ON p.id = e."projectId" AND p."companyId" = e."companyId"
        WHERE ${company} AND ${month}
        GROUP BY e."projectId", p.name ORDER BY cost DESC`,
      this.prisma.$queryRaw<{ model: string; calls: bigint; input_tokens: bigint; output_tokens: bigint; cost: bigint }[]>`
        SELECT e.model, count(*) AS calls, sum(e."inputTokens")::bigint AS input_tokens,
               sum(e."outputTokens")::bigint AS output_tokens, sum(e."costMicroUsd")::bigint AS cost
        FROM ai_execution e WHERE ${company} AND ${month}
        GROUP BY e.model ORDER BY cost DESC`,
      this.prisma.$queryRaw<Record<string, bigint | null>[]>`
        SELECT count(DISTINCT e."documentId") AS documents,
               sum(e."pagesTotal")::bigint AS pages_total, sum(e."pagesText")::bigint AS pages_text,
               sum(e."pagesVision")::bigint AS pages_vision, sum(e."pagesSkipped")::bigint AS pages_skipped,
               sum(e."estimatedMicroUsd")::bigint AS estimated
        FROM document_processing e
        WHERE ${company} AND e.status = 'completed' AND ${inMonth(`e."startedAt"`, window)}`,
      this.prisma.$queryRaw<{ version: string }[]>`
        SELECT DISTINCT e."priceTableVersion" AS version FROM ai_execution e WHERE ${company} AND ${month} ORDER BY 1`,
    ]);

    const t = totalsRows[0] ?? {};
    const totals: UsageTotals = {
      calls: n(t.calls),
      retries: n(t.retries),
      failedCalls: n(t.failed),
      pagesText: n(t.pages_text),
      pagesVision: n(t.pages_vision),
      inputTokens: n(t.input_tokens),
      outputTokens: n(t.output_tokens),
      cacheReadTokens: n(t.cache_read),
      cacheWriteTokens: n(t.cache_write),
      costMicroUsd: big(t.cost),
    };
    const byProject: ProjectUsage[] = projectRows.map((r) => ({
      projectId: r.project_id,
      projectName: r.name,
      documents: n(r.documents),
      calls: n(r.calls),
      costMicroUsd: big(r.cost),
    }));
    const byModel: ModelUsage[] = modelRows.map((r) => ({
      model: r.model,
      calls: n(r.calls),
      inputTokens: n(r.input_tokens),
      outputTokens: n(r.output_tokens),
      costMicroUsd: big(r.cost),
    }));
    const r = readingRows[0] ?? {};
    const reading: ReadingTotals = {
      documents: n(r.documents),
      pagesTotal: n(r.pages_total),
      pagesText: n(r.pages_text),
      pagesVision: n(r.pages_vision),
      pagesSkipped: n(r.pages_skipped),
      estimatedMicroUsd: big(r.estimated),
    };
    return { totals, byProject, byModel, reading, priceTableVersions: versionRows.map((v) => v.version) };
  }
}
