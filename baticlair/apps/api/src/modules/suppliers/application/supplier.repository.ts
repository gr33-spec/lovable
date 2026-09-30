import type { TenantContext } from "../../tenancy/index.js";

export interface SupplierFields {
  name: string;
  contactName: string | null;
  email: string;
  phone: string | null;
  notes: string | null;
}

export interface SupplierRecord extends SupplierFields {
  id: string;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierRepository {
  list(tenant: TenantContext, options: { search: string[]; includeArchived: boolean }): Promise<SupplierRecord[]>;
  findById(tenant: TenantContext, id: string): Promise<SupplierRecord | null>;
  findByIds(tenant: TenantContext, ids: readonly string[]): Promise<SupplierRecord[]>;
  findByEmail(tenant: TenantContext, email: string): Promise<SupplierRecord | null>;
  create(tenant: TenantContext, fields: SupplierFields): Promise<SupplierRecord>;
  update(tenant: TenantContext, id: string, fields: Partial<SupplierFields> & { archived?: boolean }): Promise<SupplierRecord | null>;
}

export const SUPPLIER_REPOSITORY = Symbol("SUPPLIER_REPOSITORY");
