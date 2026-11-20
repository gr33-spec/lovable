import type { Prisma } from "../../../generated/prisma/client.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { isUuid } from "../../../platform/validation/ids.js";
import type { TenantContext } from "../../tenancy/index.js";
import { SPECIALITES } from "@baticlair/domain";
import type { SupplierFields, SupplierRecord, SupplierRepository } from "../application/supplier.repository.js";

type Row = Awaited<ReturnType<PrismaService["supplier"]["findFirstOrThrow"]>>;

/** Les familles d'un négoce inscrit (base des achats groupés), lues comme spécialités quand l'artisan n'en a pas déclaré. */
function specialitesDuNegoce(n: { familles: string[]; generaliste: boolean } | undefined): string[] {
  if (!n) return [];
  const connues = new Set<string>(SPECIALITES);
  return [...(n.generaliste ? ["generaliste"] : []), ...n.familles.filter((f) => connues.has(f))];
}

function toRecord(r: Row, negoce?: { familles: string[]; generaliste: boolean }): SupplierRecord {
  const duNegoce = r.specialites.length === 0 ? specialitesDuNegoce(negoce) : [];
  return {
    id: r.id,
    specialites: r.specialites.length ? r.specialites : duNegoce,
    specialitesSource: r.specialites.length ? "artisan" : duNegoce.length ? "negoce" : null,
    name: r.name,
    contactName: r.contactName,
    email: r.email,
    phone: r.phone,
    notes: r.notes,
    archived: r.archivedAt !== null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaSupplierRepository implements SupplierRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Une seule source pour l'artisan : sans spécialité déclarée, celles du négoce inscrit lié (une requête par page). */
  private async avecNegoces(rows: Row[]): Promise<SupplierRecord[]> {
    const ids = [...new Set(rows.filter((r) => r.specialites.length === 0 && r.negoceId).map((r) => r.negoceId!))];
    const negoces = ids.length ? await this.prisma.negoce.findMany({ where: { id: { in: ids } }, select: { id: true, familles: true, generaliste: true } }) : [];
    const parId = new Map(negoces.map((n) => [n.id, n]));
    return rows.map((r) => toRecord(r, r.negoceId ? parId.get(r.negoceId) : undefined));
  }

  async list(tenant: TenantContext, options: { search: string[]; includeArchived: boolean }): Promise<SupplierRecord[]> {
    const where: Prisma.SupplierWhereInput = {
      companyId: tenant.companyId,
      ...(options.includeArchived ? {} : { archivedAt: null }),
      AND: options.search.map((term) => ({
        OR: [
          { name: { contains: term, mode: "insensitive" as const } },
          { contactName: { contains: term, mode: "insensitive" as const } },
          { email: { contains: term, mode: "insensitive" as const } },
          { notes: { contains: term, mode: "insensitive" as const } },
        ],
      })),
    };
    const rows = await this.prisma.supplier.findMany({
      where,
      orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { name: "asc" }],
      take: 500,
    });
    return this.avecNegoces(rows);
  }

  async findById(tenant: TenantContext, id: string): Promise<SupplierRecord | null> {
    if (!isUuid(id)) return null;
    const row = await this.prisma.supplier.findFirst({
      where: { id, companyId: tenant.companyId },
    });
    return row ? (await this.avecNegoces([row]))[0]! : null;
  }

  async findByIds(tenant: TenantContext, ids: readonly string[]): Promise<SupplierRecord[]> {
    const valid = ids.filter(isUuid);
    if (valid.length === 0) return [];
    const rows = await this.prisma.supplier.findMany({
      where: { id: { in: valid }, companyId: tenant.companyId },
    });
    return this.avecNegoces(rows);
  }

  async findByEmail(tenant: TenantContext, email: string): Promise<SupplierRecord | null> {
    const row = await this.prisma.supplier.findFirst({
      where: {
        companyId: tenant.companyId,
        email: { equals: email, mode: "insensitive" },
      },
    });
    return row ? (await this.avecNegoces([row]))[0]! : null;
  }

  async create(tenant: TenantContext, fields: SupplierFields): Promise<SupplierRecord> {
    const row = await this.prisma.supplier.create({
      data: { ...fields, specialites: fields.specialites ?? [], companyId: tenant.companyId },
    });
    return (await this.avecNegoces([row]))[0]!;
  }

  async update(
    tenant: TenantContext,
    id: string,
    fields: Partial<SupplierFields> & { archived?: boolean },
  ): Promise<SupplierRecord | null> {
    if (!isUuid(id)) return null;
    const { archived, ...rest } = fields;
    const { count } = await this.prisma.supplier.updateMany({
      where: { id, companyId: tenant.companyId },
      data: {
        ...rest,
        ...(archived === undefined ? {} : { archivedAt: archived ? new Date() : null }),
      },
    });
    return count > 0 ? this.findById(tenant, id) : null;
  }

  async delete(tenant: TenantContext, id: string): Promise<"deleted" | "in_use" | "not_found"> {
    if (!isUuid(id)) return "not_found";
    const supplier = await this.prisma.supplier.findFirst({ where: { id, companyId: tenant.companyId }, select: { id: true } });
    if (!supplier) return "not_found";
    const used = await this.prisma.priceRequestRecipient.count({ where: { supplierId: id } });
    if (used > 0) return "in_use";
    await this.prisma.supplier.deleteMany({ where: { id, companyId: tenant.companyId } });
    return "deleted";
  }
}
