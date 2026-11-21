import type { OfferLineKind } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { isUuid } from "../../../platform/validation/ids.js";
import type { TenantContext } from "../../tenancy/index.js";
import type {
  MatchConfidence,
  NewOffer,
  OfferLineFields,
  OfferRecord,
  OfferRepository,
} from "../application/offer.repository.js";

const INCLUDE = { lines: { orderBy: { position: "asc" as const } } };
const KINDS = new Set<OfferLineKind>(["main", "substitution", "variant", "option", "fee", "deposit", "info"]);
const CONFIDENCES = new Set<MatchConfidence>(["sure", "probable", "unsure"]);

type Row = Awaited<ReturnType<PrismaService["supplierOffer"]["findFirstOrThrow"]>> & {
  lines: Awaited<ReturnType<PrismaService["supplierOfferLine"]["findFirstOrThrow"]>>[];
};

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function toRecord(row: Row): OfferRecord {
  return {
    id: row.id,
    documentId: row.documentId,
    model: row.model,
    promptVersion: row.promptVersion,
    notes: strings(row.notes),
    createdAt: row.createdAt,
    totalHT: row.totalHT,
    totalVAT: row.totalVAT,
    totalTTC: row.totalTTC,
    globalDiscountRate: row.globalDiscountRate,
    globalDiscountAmount: row.globalDiscountAmount,
    deliveryIncluded: row.deliveryIncluded,
    lines: row.lines.map((l) => ({
      id: l.id,
      position: l.position,
      kind: KINDS.has(l.kind as OfferLineKind) ? (l.kind as OfferLineKind) : "info",
      designation: l.designation,
      reference: l.reference,
      quantityRaw: l.quantityRaw,
      unitRaw: l.unitRaw,
      unitPrice: l.unitPrice,
      discountRate: l.discountRate,
      lineTotal: l.lineTotal,
      packagingQuantity: l.packagingQuantity,
      packagingUnit: l.packagingUnit,
      requestIndex: l.requestIndex,
      matchConfidence: CONFIDENCES.has(l.matchConfidence as MatchConfidence) ? (l.matchConfidence as MatchConfidence) : null,
      matchConfirmed: l.matchConfirmed,
      aiDoubt: l.aiDoubt,
      sourceRefs: strings(l.sourceRefs),
      edited: l.edited,
    })),
  };
}

export class PrismaOfferRepository implements OfferRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByDocument(tenant: TenantContext, documentId: string): Promise<OfferRecord | null> {
    if (!isUuid(documentId)) return null;
    const row = await this.prisma.supplierOffer.findFirst({ where: { documentId, companyId: tenant.companyId }, include: INCLUDE });
    return row ? toRecord(row) : null;
  }

  async findByDocuments(tenant: TenantContext, documentIds: string[]): Promise<OfferRecord[]> {
    const ids = documentIds.filter(isUuid);
    if (ids.length === 0) return [];
    const rows = await this.prisma.supplierOffer.findMany({ where: { documentId: { in: ids }, companyId: tenant.companyId }, include: INCLUDE });
    return rows.map(toRecord);
  }

  async findByLine(tenant: TenantContext, lineId: string): Promise<OfferRecord | null> {
    if (!isUuid(lineId)) return null;
    const row = await this.prisma.supplierOffer.findFirst({
      where: { companyId: tenant.companyId, lines: { some: { id: lineId } } },
      include: INCLUDE,
    });
    return row ? toRecord(row) : null;
  }

  async create(tenant: TenantContext, data: NewOffer): Promise<OfferRecord> {
    const row = await this.prisma.supplierOffer.create({
      data: {
        companyId: tenant.companyId,
        documentId: data.documentId,
        analysisId: data.analysisId,
        promptId: data.promptId,
        promptVersion: data.promptVersion,
        model: data.model,
        totalHT: data.totalHT,
        totalVAT: data.totalVAT,
        totalTTC: data.totalTTC,
        globalDiscountRate: data.globalDiscountRate,
        globalDiscountAmount: data.globalDiscountAmount,
        deliveryIncluded: data.deliveryIncluded,
        notes: data.notes,
        lines: { create: data.lines.map((l, i) => ({ ...l, position: i + 1 })) },
      },
      include: INCLUDE,
    });
    return toRecord(row);
  }

  async updateLine(tenant: TenantContext, lineId: string, fields: OfferLineFields): Promise<void> {
    await this.prisma.supplierOfferLine.updateMany({
      where: { id: lineId, offer: { companyId: tenant.companyId } },
      data: { ...fields, edited: true, matchConfirmed: true },
    });
  }
}
