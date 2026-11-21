import { doublonIncertain } from "@baticlair/domain";
import { DomainError, notFound } from "../../../platform/errors/domain-error.js";
import type { ExceptionSignalee } from "../../../platform/supervision/exceptions.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import type { SupplierFields, SupplierRecord, SupplierRepository } from "./supplier.repository.js";

/** Carnet de fournisseurs : l'e-mail sert aux demandes de prix, il est donc obligatoire et unique. */
export class SuppliersService {
  constructor(
    private readonly suppliers: SupplierRepository,
    /** Lot 6 : la file d'exceptions (branchée par le module ; rien en test unitaire). */
    private readonly signaler: (e: ExceptionSignalee) => Promise<void> = async () => undefined,
  ) {}

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
    // Lot 6 (Greg, 7 novembre 2026) : un négoce partiellement semblable à un négoce du carnet remonte « doublon incertain » ;
    // il est créé tel quel, rien n'est fusionné.
    const connus = await this.suppliers.list(tenant, { search: [], includeArchived: false });
    const d = doublonIncertain({ nom: fields.name, email: fields.email, telephone: fields.phone }, connus.map((s) => ({ nom: s.name, email: s.email, telephone: s.phone })));
    const cree = await this.suppliers.create(tenant, fields);
    if (d) await this.signaler({ type: "doublon_incertain", cle: `${tenant.companyId}:${cree.id}`, titre: `Négoce peut-être en double : « ${fields.name} » et « ${d.avec} »`, detail: `${d.raison}. Rien n'est fusionné : à examiner.`, companyId: tenant.companyId }).catch(() => undefined);
    return cree;
  }

  async update(tenant: TenantContext, id: string, fields: Partial<SupplierFields> & { archived?: boolean }): Promise<SupplierRecord> {
    assertCanWrite(tenant);
    if (fields.email) await this.assertEmailFree(tenant, fields.email, id);
    const updated = await this.suppliers.update(tenant, id, fields);
    if (!updated) throw notFound("Supplier");
    return updated;
  }

  async remove(tenant: TenantContext, id: string): Promise<void> {
    assertCanWrite(tenant);
    const result = await this.suppliers.delete(tenant, id);
    if (result === "not_found") throw notFound("Supplier");
    if (result === "in_use") throw new DomainError("conflict", "Supplier already consulted", { reason: "supplier_in_use" });
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
