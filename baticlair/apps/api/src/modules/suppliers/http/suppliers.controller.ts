import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { Idempotent } from "../../../platform/http/idempotency.interceptor.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import type { SupplierRecord } from "../application/supplier.repository.js";
import { SuppliersService } from "../application/suppliers.service.js";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

const fields = {
  name: z.string().trim().min(1).max(120),
  contactName: optional(120),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  phone: optional(40),
  notes: optional(1000),
};

const createBody = z.object(fields);
const updateBody = z
  .object({ ...fields, archived: z.boolean() })
  .partial()
  .strict();
const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  archived: z.enum(["include", "exclude"]).default("exclude"),
});

export function supplierDto(s: SupplierRecord) {
  return {
    id: s.id,
    name: s.name,
    contactName: s.contactName,
    email: s.email,
    phone: s.phone,
    notes: s.notes,
    archived: s.archived,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

@Controller("v1/suppliers")
@UseGuards(TenantGuard)
export class SuppliersController {
  constructor(@Inject(SuppliersService) private readonly suppliers: SuppliersService) {}

  @Get()
  async list(@Tenant() tenant: TenantContext, @Query(new ZodPipe(listQuery)) query: z.infer<typeof listQuery>) {
    const search = query.q ? query.q.split(/\s+/).filter(Boolean).slice(0, 8) : [];
    const items = await this.suppliers.list(tenant, {
      search,
      includeArchived: query.archived === "include",
    });
    return { items: items.map(supplierDto) };
  }

  @Get(":id")
  async get(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return supplierDto(await this.suppliers.get(tenant, id));
  }

  @Post()
  @HttpCode(201)
  @Idempotent()
  async create(@Tenant() tenant: TenantContext, @Body(new ZodPipe(createBody)) body: z.infer<typeof createBody>) {
    // Champs explicites : la compilation Vercel (non stricte) voit les champs zod comme facultatifs.
    const fields = {
      name: body.name,
      email: body.email,
      contactName: body.contactName ?? null,
      phone: body.phone ?? null,
      notes: body.notes ?? null,
    };
    return supplierDto(await this.suppliers.create(tenant, fields));
  }

  @Patch(":id")
  async update(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(updateBody)) body: z.infer<typeof updateBody>) {
    return supplierDto(await this.suppliers.update(tenant, id, body));
  }
}
