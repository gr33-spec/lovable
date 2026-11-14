import type { TenantContext } from "../../tenancy/index.js";

export interface SupplierFields {
  name: string;
  contactName: string | null;
  email: string;
  phone: string | null;
  notes: string | null;
  /** Spécialités déclarées par l'artisan (Greg, 1er novembre 2026) ; vide : non renseignées. */
  specialites?: string[];
}

export interface SupplierRecord extends SupplierFields {
  id: string;
  specialites: string[];
  /** D'où viennent les spécialités affichées : l'artisan, le négoce inscrit lié (une seule source pour l'artisan), ou rien. */
  specialitesSource: "artisan" | "negoce" | null;
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
  /**
   * Supprime un fournisseur jamais consulté. `in_use` s'il a déjà reçu une
   * demande de prix (il reste alors dans l'historique des chantiers : on l'archive).
   */
  delete(tenant: TenantContext, id: string): Promise<"deleted" | "in_use" | "not_found">;
}

export const SUPPLIER_REPOSITORY = Symbol("SUPPLIER_REPOSITORY");
