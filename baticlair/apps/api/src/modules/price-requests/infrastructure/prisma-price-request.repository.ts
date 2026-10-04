import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { isUuid } from "../../../platform/validation/ids.js";
import type { TenantContext } from "../../tenancy/index.js";
import type { RequestedLine } from "../application/price-request-email.js";
import type { SupplierPacket } from "../application/supplier-packet.js";
import type {
  PriceRequestRecord,
  PriceRequestRepository,
  RecipientStatus,
  Sender,
  ValidatedTakeoff,
} from "../application/price-request.repository.js";

const INCLUDE = {
  recipients: {
    orderBy: [{ createdAt: "asc" as const }, { supplier: { name: "asc" as const } }, { id: "asc" as const }],
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
          contactName: true,
          email: true,
          phone: true,
        },
      },
      document: { select: { id: true, originalName: true, status: true } },
    },
  },
};

interface Row {
  id: string;
  projectId: string;
  takeoffId: string;
  lines: unknown;
  packet: unknown;
  message: string | null;
  dueDate: Date | null;
  createdAt: Date;
  classifiedAt: Date | null;
  retainedSupplierIds: string[];
  recipients: {
    id: string;
    status: RecipientStatus;
    sentAt: Date | null;
    supplier: {
      id: string;
      name: string;
      contactName: string | null;
      email: string;
      phone: string | null;
    };
    document: { id: string; originalName: string; status: string } | null;
  }[];
}

function lines(value: unknown): RequestedLine[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw: unknown) => {
    const l = (raw ?? {}) as Record<string, unknown>;
    return {
      designation: typeof l.designation === "string" ? l.designation : "",
      quantity: typeof l.quantity === "string" ? l.quantity : null,
      unit: typeof l.unit === "string" ? l.unit : null,
      reference: typeof l.reference === "string" ? l.reference : null,
      ...(l.basis === "work" ? { basis: "work" as const } : {}),
      ...(Array.isArray(l.section) ? { section: l.section.filter((t): t is string => typeof t === "string") } : {}),
      ...(typeof l.mergedFrom === "number" && l.mergedFrom > 1 ? { mergedFrom: l.mergedFrom } : {}),
    };
  });
}

/** Le contenu fournisseur tel qu'enregistré ; une forme inattendue vaut « pas de contenu ». */
function packet(value: unknown): SupplierPacket | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  if (typeof p.entreprise !== "string" || typeof p.chantier !== "string" || typeof p.date !== "string") return null;
  return {
    entreprise: p.entreprise,
    chantier: p.chantier,
    commune: typeof p.commune === "string" ? p.commune : null,
    date: p.date,
    articles: strings(p.articles),
    a_chiffrer: strings(p.a_chiffrer),
    resume: strings(p.resume),
    detail: Array.isArray(p.detail)
      ? p.detail
          .filter((d): d is Record<string, unknown> => !!d && typeof d === "object")
          .map((d) => ({ libelle: typeof d.libelle === "string" ? d.libelle : "", mesure: typeof d.mesure === "string" ? d.mesure : null, precisions: strings(d.precisions) }))
      : [],
    joindre_detail: p.joindre_detail !== false,
    question_lien: typeof p.question_lien === "string" ? p.question_lien : null,
    ...(Array.isArray(p.croquis) && p.croquis.length > 0
      ? {
          croquis: p.croquis
            .filter((c): c is Record<string, unknown> => !!c && typeof c === "object" && typeof (c as Record<string, unknown>).id === "string")
            .map((c) => ({ article: String(c.article ?? ""), id: String(c.id), nom: String(c.nom ?? ""), commentaire: typeof c.commentaire === "string" ? c.commentaire : null })),
        }
      : {}),
  };
}

function toRecord(row: Row): PriceRequestRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    takeoffId: row.takeoffId,
    lines: lines(row.lines),
    packet: packet(row.packet),
    message: row.message,
    dueDate: row.dueDate,
    createdAt: row.createdAt,
    classifiedAt: row.classifiedAt,
    retainedSupplierIds: row.retainedSupplierIds,
    recipients: row.recipients.map((r) => ({
      id: r.id,
      supplier: r.supplier,
      // Devis reçu puis supprimé du chantier : on revient à « envoyée ».
      status: r.status === "received" && !r.document ? "sent" : r.status,
      sentAt: r.sentAt,
      document: r.document
        ? {
            id: r.document.id,
            name: r.document.originalName,
            status: r.document.status,
          }
        : null,
    })),
  };
}

export class PrismaPriceRequestRepository implements PriceRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async validatedTakeoff(tenant: TenantContext, projectId: string): Promise<ValidatedTakeoff | null> {
    if (!isUuid(projectId)) return null;
    const row = await this.prisma.takeoff.findFirst({
      where: { projectId, companyId: tenant.companyId, status: "validated" },
      orderBy: { validatedAt: "desc" },
      include: { lines: { orderBy: { position: "asc" } } },
    });
    if (!row) return null;
    return {
      id: row.id,
      trade: row.trade,
      lines: row.lines.map((l) => ({
        id: l.id,
        designation: l.designation,
        quantity: l.quantityRaw,
        unit: l.unitRaw,
        reference: l.reference,
        section: Array.isArray(l.section) ? l.section.filter((t): t is string => typeof t === "string") : [],
        role: l.role === "measure" || l.role === "purchase" || l.role === "undetermined" ? l.role : null,
      })),
    };
  }

  async itemSketches(tenant: TenantContext, projectId: string): Promise<{ id: string; nom: string; itemKey: string; note: string | null }[]> {
    if (!isUuid(projectId)) return [];
    const rows = await this.prisma.document.findMany({
      where: { projectId, companyId: tenant.companyId, purpose: "sketch", itemKey: { not: null } },
      select: { id: true, originalName: true, itemKey: true, note: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({ id: r.id, nom: r.originalName, itemKey: r.itemKey!, note: r.note }));
  }

  async sender(tenant: TenantContext, projectId: string): Promise<Sender | null> {
    const [company, user, project] = await Promise.all([
      this.prisma.company.findUnique({
        where: { id: tenant.companyId },
        select: { name: true },
      }),
      this.prisma.user.findUnique({
        where: { id: tenant.userId },
        select: { name: true },
      }),
      isUuid(projectId)
        ? this.prisma.project.findFirst({
            where: { id: projectId, companyId: tenant.companyId },
            select: { name: true, address: true, siteNotes: true },
          })
        : Promise.resolve(null),
    ]);
    if (!company || !project) return null;
    return { companyName: company.name, senderName: user?.name ?? "", project };
  }

  async create(
    tenant: TenantContext,
    data: {
      projectId: string;
      takeoffId: string;
      lines: RequestedLine[];
      message: string | null;
      dueDate: Date | null;
      supplierIds: string[];
      packet: SupplierPacket;
    },
  ): Promise<PriceRequestRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.priceRequest.create({
        data: {
          companyId: tenant.companyId,
          projectId: data.projectId,
          takeoffId: data.takeoffId,
          lines: data.lines.map((l) => ({ ...l })),
          packet: JSON.parse(JSON.stringify(data.packet)) as object,
          message: data.message,
          dueDate: data.dueDate,
          createdById: tenant.userId,
          recipients: {
            create: data.supplierIds.map((supplierId) => ({ supplierId })),
          },
        },
        include: INCLUDE,
      });
      await tx.project.update({
        where: { id: data.projectId, companyId: tenant.companyId },
        data: { lastActivityAt: new Date() },
      });
      return created;
    });
    return toRecord(row);
  }

  async addRecipients(tenant: TenantContext, requestId: string, supplierIds: string[]): Promise<void> {
    const request = await this.prisma.priceRequest.findFirst({
      where: { id: requestId, companyId: tenant.companyId },
      select: { id: true },
    });
    if (!request) return;
    await this.prisma.priceRequestRecipient.createMany({
      data: supplierIds.map((supplierId) => ({
        priceRequestId: request.id,
        supplierId,
      })),
      skipDuplicates: true,
    });
  }

  async listByProject(tenant: TenantContext, projectId: string): Promise<PriceRequestRecord[]> {
    if (!isUuid(projectId)) return [];
    const rows = await this.prisma.priceRequest.findMany({
      where: { projectId, companyId: tenant.companyId },
      orderBy: { createdAt: "desc" },
      include: INCLUDE,
    });
    return rows.map(toRecord);
  }

  async findById(tenant: TenantContext, id: string): Promise<PriceRequestRecord | null> {
    if (!isUuid(id)) return null;
    const row = await this.prisma.priceRequest.findFirst({
      where: { id, companyId: tenant.companyId },
      include: INCLUDE,
    });
    return row ? toRecord(row) : null;
  }

  async findByRecipient(tenant: TenantContext, recipientId: string): Promise<PriceRequestRecord | null> {
    if (!isUuid(recipientId)) return null;
    const row = await this.prisma.priceRequest.findFirst({
      where: {
        companyId: tenant.companyId,
        recipients: { some: { id: recipientId } },
      },
      include: INCLUDE,
    });
    return row ? toRecord(row) : null;
  }

  async findByDocument(tenant: TenantContext, documentId: string): Promise<PriceRequestRecord | null> {
    if (!isUuid(documentId)) return null;
    const row = await this.prisma.priceRequest.findFirst({
      where: { companyId: tenant.companyId, recipients: { some: { documentId } } },
      include: INCLUDE,
    });
    return row ? toRecord(row) : null;
  }

  async setStatus(tenant: TenantContext, recipientId: string, status: RecipientStatus): Promise<void> {
    await this.prisma.priceRequestRecipient.updateMany({
      where: { id: recipientId, priceRequest: { companyId: tenant.companyId } },
      data: {
        status,
        ...(status === "sent" ? { sentAt: new Date() } : status === "to_send" ? { sentAt: null } : {}),
      },
    });
  }

  async attachDocument(tenant: TenantContext, recipientId: string, documentId: string): Promise<void> {
    await this.prisma.priceRequestRecipient.updateMany({
      where: { id: recipientId, priceRequest: { companyId: tenant.companyId } },
      data: { documentId, status: "received" },
    });
  }

  async delete(tenant: TenantContext, id: string): Promise<boolean> {
    if (!isUuid(id)) return false;
    const { count } = await this.prisma.priceRequest.deleteMany({
      where: { id, companyId: tenant.companyId },
    });
    return count > 0;
  }

  async classify(tenant: TenantContext, id: string, retainedSupplierIds: string[] | null): Promise<void> {
    await this.prisma.priceRequest.updateMany({
      where: { id, companyId: tenant.companyId },
      data: retainedSupplierIds ? { classifiedAt: new Date(), retainedSupplierIds } : { classifiedAt: null, retainedSupplierIds: [] },
    });
  }

  async attachQuoteDetail(tenant: TenantContext): Promise<boolean> {
    const c = await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { attachQuoteDetail: true } });
    return c?.attachQuoteDetail ?? true;
  }

  async setAttachQuoteDetail(tenant: TenantContext, value: boolean): Promise<void> {
    await this.prisma.company.update({ where: { id: tenant.companyId }, data: { attachQuoteDetail: value } });
  }
}
