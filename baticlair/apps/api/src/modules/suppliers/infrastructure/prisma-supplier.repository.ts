import type { Prisma } from "../../../generated/prisma/client.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { isUuid } from "../../../platform/validation/ids.js";
import type { TenantContext } from "../../tenancy/index.js";
import type { SupplierFields, SupplierRecord, SupplierRepository } from "../application/supplier.repository.js";

type Row = Awaited<ReturnType<PrismaService["supplier"]["findFirstOrThrow"]>>;

function toRecord(r: Row): SupplierRecord {
  return {
    id: r.id,
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
    return rows.map(toRecord);
  }

  async findById(tenant: TenantContext, id: string): Promise<SupplierRecord | null> {
    if (!isUuid(id)) return null;
    const row = await this.prisma.supplier.findFirst({
      where: { id, companyId: tenant.companyId },
    });
    return row ? toRecord(row) : null;
  }

  async findByIds(tenant: TenantContext, ids: readonly string[]): Promise<SupplierRecord[]> {
    const valid = ids.filter(isUuid);
    if (valid.length === 0) return [];
    const rows = await this.prisma.supplier.findMany({
      where: { id: { in: valid }, companyId: tenant.companyId },
    });
    return rows.map(toRecord);
  }

  async findByEmail(tenant: TenantContext, email: string): Promise<SupplierRecord | null> {
    const row = await this.prisma.supplier.findFirst({
      where: {
        companyId: tenant.companyId,
        email: { equals: email, mode: "insensitive" },
      },
    });
    return row ? toRecord(row) : null;
  }

  async create(tenant: TenantContext, fields: SupplierFields): Promise<SupplierRecord> {
    return toRecord(
      await this.prisma.supplier.create({
        data: { ...fields, companyId: tenant.companyId },
      }),
    );
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
}
