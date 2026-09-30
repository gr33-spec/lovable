import { DomainError } from "../../../platform/errors/domain-error.js";

export type MembershipRole = "owner" | "admin" | "member" | "viewer";

/**
 * Contexte d'entreprise d'une opération. Tout accès à une donnée métier
 * l'exige : c'est la garantie structurelle de l'isolation multi-tenant.
 */
export interface TenantContext {
  readonly companyId: string;
  readonly userId: string;
  readonly role: MembershipRole;
}

/** Au MVP, seul le rôle « viewer » est en lecture seule. */
export function assertCanWrite(tenant: TenantContext): void {
  if (tenant.role === "viewer") {
    throw new DomainError("forbidden", "Read-only membership");
  }
}
