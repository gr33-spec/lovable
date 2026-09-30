import { DomainError, notFound } from "../../../platform/errors/domain-error.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import type { SupplierFields, SupplierRecord, SupplierRepository } from "./supplier.repository.js";

/** Carnet de fournisseurs : l'e-mail sert aux demandes de prix, il est donc obligatoire et unique. */
export class SuppliersService {
  constructor(private readonly suppliers: SupplierRepository) {}

  list(tenant: TenantContext, options: { search: string[]; includeArchived: boolean }): Promise<SupplierRecord[]> {
    return this.suppliers.list(tenant, options);
  }

  async get(tenant: TenantContext, id: string): Promise<SupplierRecord> {
    const supplier = await this.suppliers.findById(tenant, id);
    if (!supplier) throw notFound("Supplier");
    return supplier;
  }

  async create(tenant: TenantContext, fields: SupplierFields): Promise<SupplierRecord> {
    assertCanWrite(tenant);
    await this.assertEmailFree(tenant, fields.email, null);
    return this.suppliers.create(tenant, fields);
  }

  async update(tenant: TenantContext, id: string, fields: Partial<SupplierFields> & { archived?: boolean }): Promise<SupplierRecord> {
    assertCanWrite(tenant);
    if (fields.email) await this.assertEmailFree(tenant, fields.email, id);
    const updated = await this.suppliers.update(tenant, id, fields);
    if (!updated) throw notFound("Supplier");
    return updated;
  }

  private async assertEmailFree(tenant: TenantContext, email: string, exceptId: string | null): Promise<void> {
    const existing = await this.suppliers.findByEmail(tenant, email);
    if (existing && existing.id !== exceptId) {
      throw new DomainError("conflict", "A supplier already uses this e-mail", {
        reason: "email_taken",
        supplierId: existing.id,
        name: existing.name,
      });
    }
  }
}
