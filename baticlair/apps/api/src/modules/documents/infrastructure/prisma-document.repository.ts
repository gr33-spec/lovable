import type { Prisma } from "../../../generated/prisma/client.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { isUuid } from "../../../platform/validation/ids.js";
import type { TenantContext } from "../../tenancy/index.js";
import type {
  DocumentRecord,
  DocumentRepository,
  DocumentWithProcessing,
  NewDocument,
  NewProcessing,
  NumberedLineRecord,
  PageRecord,
  ProcessingRecord,
} from "../application/document.repository.js";

const DOCUMENT_FIELDS = {
  id: true,
  projectId: true,
  purpose: true,
  trade: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  sha256: true,
  pageCount: true,
  status: true,
  createdAt: true,
} as const;

const PROCESSING_FIELDS = {
  id: true,
  pipelineVersion: true,
  status: true,
  errorCode: true,
  pagesTotal: true,
  pagesText: true,
  pagesVision: true,
  pagesSkipped: true,
  estimatedMicroUsd: true,
  actualMicroUsd: true,
  estimate: true,
  startedAt: true,
  finishedAt: true,
} as const;

type DocumentRow = Prisma.DocumentGetPayload<{
  select: typeof DOCUMENT_FIELDS & { processings: { select: typeof PROCESSING_FIELDS } };
}>;

function toDocument(row: DocumentRow): DocumentWithProcessing {
  const { processings, ...doc } = row;
  const latest = processings[0];
  return { ...doc, processing: latest ? (latest as ProcessingRecord) : null };
}

const WITH_LATEST_PROCESSING = {
  ...DOCUMENT_FIELDS,
  processings: { select: PROCESSING_FIELDS, orderBy: { startedAt: "desc" as const }, take: 1 },
};

export class PrismaDocumentRepository implements DocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async projectExists(tenant: TenantContext, projectId: string): Promise<boolean> {
    if (!isUuid(projectId)) return false;
    const count = await this.prisma.project.count({ where: { id: projectId, companyId: tenant.companyId } });
    return count > 0;
  }

  findByHash(tenant: TenantContext, projectId: string, sha256: string): Promise<DocumentRecord | null> {
    return this.prisma.document.findFirst({
      where: { companyId: tenant.companyId, projectId, sha256 },
      select: DOCUMENT_FIELDS,
      orderBy: { createdAt: "asc" },
    });
  }

  async create(tenant: TenantContext, data: NewDocument, bytes: Uint8Array): Promise<DocumentRecord> {
    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          ...data,
          companyId: tenant.companyId,
          uploadedById: tenant.userId,
          blob: { create: { bytes: Buffer.from(bytes) } },
        },
        select: DOCUMENT_FIELDS,
      });
      await tx.project.update({
        where: { id: data.projectId, companyId: tenant.companyId },
        data: { lastActivityAt: new Date() },
      });
      return doc;
    });
  }

  async saveProcessing(
    tenant: TenantContext,
    documentId: string,
    pipelineVersion: string,
    result: NewProcessing,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (result.status === "failed") {
        await tx.documentProcessing.create({
          data: {
            companyId: tenant.companyId,
            documentId,
            pipelineVersion,
            status: "failed",
            errorCode: result.errorCode,
            finishedAt: new Date(),
          },
        });
        await tx.document.update({ where: { id: documentId, companyId: tenant.companyId }, data: { status: "failed" } });
        return;
      }
      const count = (route: string) => result.pages.filter((p) => p.route === route).length;
      await tx.documentProcessing.create({
        data: {
          companyId: tenant.companyId,
          documentId,
          pipelineVersion,
          status: "completed",
          pagesTotal: result.pages.length,
          pagesText: count("text"),
          pagesVision: count("vision"),
          pagesSkipped: count("skip"),
          estimatedMicroUsd: BigInt(result.estimatedMicroUsd),
          estimate: result.estimate as Prisma.InputJsonValue,
          finishedAt: new Date(),
          pages: {
            create: result.pages.map((p) => ({
              pageNumber: p.pageNumber,
              route: p.route,
              reason: p.reason,
              widthPt: p.widthPt,
              heightPt: p.heightPt,
              chars: p.chars,
              metrics: p.metrics,
              lines: p.lines as unknown as Prisma.InputJsonValue,
            })),
          },
        },
      });
      await tx.document.update({
        where: { id: documentId, companyId: tenant.companyId },
        data: { status: "read", pageCount: result.pageCount },
      });
    });
  }

  async listByProject(tenant: TenantContext, projectId: string): Promise<DocumentWithProcessing[]> {
    if (!isUuid(projectId)) return [];
    const rows = await this.prisma.document.findMany({
      where: { companyId: tenant.companyId, projectId },
      select: WITH_LATEST_PROCESSING,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDocument);
  }

  async findById(tenant: TenantContext, id: string): Promise<DocumentWithProcessing | null> {
    if (!isUuid(id)) return null;
    const row = await this.prisma.document.findFirst({
      where: { id, companyId: tenant.companyId },
      select: WITH_LATEST_PROCESSING,
    });
    return row ? toDocument(row) : null;
  }

  async findPages(tenant: TenantContext, processingId: string): Promise<PageRecord[]> {
    const rows = await this.prisma.documentPage.findMany({
      where: { processingId, processing: { companyId: tenant.companyId } },
      orderBy: { pageNumber: "asc" },
    });
    return rows.map((r) => ({
      pageNumber: r.pageNumber,
      route: r.route,
      reason: r.reason,
      widthPt: r.widthPt.toNumber(),
      heightPt: r.heightPt.toNumber(),
      chars: r.chars,
      metrics: r.metrics as Record<string, number>,
      lines: r.lines as unknown as NumberedLineRecord[],
    }));
  }

  async readContent(tenant: TenantContext, id: string) {
    if (!isUuid(id)) return null;
    const row = await this.prisma.document.findFirst({
      where: { id, companyId: tenant.companyId },
      select: { mimeType: true, originalName: true, blob: { select: { bytes: true } } },
    });
    if (!row?.blob) return null;
    return { bytes: new Uint8Array(row.blob.bytes), mimeType: row.mimeType, originalName: row.originalName };
  }

  async delete(tenant: TenantContext, id: string): Promise<boolean> {
    if (!isUuid(id)) return false;
    const { count } = await this.prisma.document.deleteMany({ where: { id, companyId: tenant.companyId } });
    return count > 0;
  }
}
