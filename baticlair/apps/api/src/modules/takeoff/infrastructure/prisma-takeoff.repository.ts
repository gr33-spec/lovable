import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { isUuid } from "../../../platform/validation/ids.js";
import type { TenantContext } from "../../tenancy/index.js";
import type {
  LineFields,
  NewTakeoff,
  TakeoffRecord,
  TakeoffRepository,
  TakeoffStatus,
} from "../application/takeoff.repository.js";

const INCLUDE = { lines: { orderBy: { position: "asc" as const } } };

type Row = Awaited<ReturnType<PrismaService["takeoff"]["findFirstOrThrow"]>> & {
  lines: Awaited<ReturnType<PrismaService["takeoffLine"]["findFirstOrThrow"]>>[];
};

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const numbers = (v: unknown): number[] => (Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : []);

function toRecord(row: Row): TakeoffRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    documentId: row.documentId,
    trade: row.trade,
    status: row.status,
    promptId: row.promptId,
    promptVersion: row.promptVersion,
    model: row.model,
    notes: strings(row.notes),
    createdAt: row.createdAt,
    validatedAt: row.validatedAt,
    lines: row.lines.map((l) => ({
      id: l.id,
      position: l.position,
      designation: l.designation,
      quantityRaw: l.quantityRaw,
      unitRaw: l.unitRaw,
      reference: l.reference,
      sourceRefs: strings(l.sourceRefs),
      sourcePages: numbers(l.sourcePages),
      section: strings(l.section),
      origin: l.origin === "manual" ? "manual" : "ai",
      edited: l.edited,
      aiDoubt: l.aiDoubt,
      confirmed: l.confirmedAt !== null,
    })),
  };
}

export class PrismaTakeoffRepository implements TakeoffRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByDocument(tenant: TenantContext, documentId: string): Promise<TakeoffRecord | null> {
    if (!isUuid(documentId)) return null;
    const row = await this.prisma.takeoff.findFirst({ where: { documentId, companyId: tenant.companyId }, include: INCLUDE });
    return row ? toRecord(row) : null;
  }

  async findLatestByProject(tenant: TenantContext, projectId: string): Promise<TakeoffRecord | null> {
    if (!isUuid(projectId)) return null;
    const row = await this.prisma.takeoff.findFirst({
      where: { projectId, companyId: tenant.companyId },
      orderBy: { createdAt: "desc" },
      include: INCLUDE,
    });
    return row ? toRecord(row) : null;
  }

  async findById(tenant: TenantContext, id: string): Promise<TakeoffRecord | null> {
    if (!isUuid(id)) return null;
    const row = await this.prisma.takeoff.findFirst({ where: { id, companyId: tenant.companyId }, include: INCLUDE });
    return row ? toRecord(row) : null;
  }

  async findByLine(tenant: TenantContext, lineId: string): Promise<TakeoffRecord | null> {
    if (!isUuid(lineId)) return null;
    const row = await this.prisma.takeoff.findFirst({
      where: { companyId: tenant.companyId, lines: { some: { id: lineId } } },
      include: INCLUDE,
    });
    return row ? toRecord(row) : null;
  }

  async create(tenant: TenantContext, data: NewTakeoff): Promise<TakeoffRecord> {
    const row = await this.prisma.takeoff.create({
      data: {
        companyId: tenant.companyId,
        projectId: data.projectId,
        documentId: data.documentId,
        analysisId: data.analysisId,
        trade: data.trade,
        promptId: data.promptId,
        promptVersion: data.promptVersion,
        model: data.model,
        notes: data.notes,
        createdById: tenant.userId,
        lines: {
          create: data.lines.map((l, i) => ({
            position: i + 1,
            designation: l.designation,
            quantityRaw: l.quantityRaw,
            unitRaw: l.unitRaw,
            reference: l.reference,
            sourceRefs: l.sourceRefs,
            sourcePages: l.sourcePages,
            section: l.section,
            aiDoubt: l.aiDoubt,
          })),
        },
      },
      include: INCLUDE,
    });
    return toRecord(row);
  }

  async updateLine(tenant: TenantContext, lineId: string, fields: LineFields): Promise<void> {
    await this.prisma.takeoffLine.updateMany({
      where: { id: lineId, takeoff: { companyId: tenant.companyId } },
      data: { ...fields, edited: true, confirmedAt: null },
    });
  }

  async confirmLine(tenant: TenantContext, lineId: string): Promise<void> {
    await this.prisma.takeoffLine.updateMany({
      where: { id: lineId, takeoff: { companyId: tenant.companyId } },
      data: { confirmedAt: new Date() },
    });
  }

  async addLine(tenant: TenantContext, takeoffId: string, fields: LineFields): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const last = await tx.takeoffLine.aggregate({ where: { takeoffId, takeoff: { companyId: tenant.companyId } }, _max: { position: true } });
      await tx.takeoffLine.create({ data: { ...fields, takeoffId, origin: "manual", position: (last._max.position ?? 0) + 1 } });
    });
  }

  async deleteLine(tenant: TenantContext, lineId: string): Promise<void> {
    await this.prisma.takeoffLine.deleteMany({ where: { id: lineId, takeoff: { companyId: tenant.companyId } } });
  }

  async setStatus(tenant: TenantContext, id: string, status: TakeoffStatus): Promise<void> {
    await this.prisma.takeoff.updateMany({
      where: { id, companyId: tenant.companyId },
      data: status === "validated" ? { status, validatedAt: new Date(), validatedById: tenant.userId } : { status, validatedAt: null, validatedById: null },
    });
  }
}
