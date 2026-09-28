import { DomainError } from "../../../platform/errors/domain-error.js";
import { isUuid } from "../../../platform/validation/ids.js";
import { normalizeCompanyName } from "../domain/company-name.js";
import type { TenantContext } from "../domain/tenant-context.js";
import type { CompanyMembershipView, CompanyRepository } from "./company.repository.js";

export class TenancyService {
  constructor(private readonly companies: CompanyRepository) {}

  /** Onboarding : crée l'entreprise et en fait l'utilisateur propriétaire. */
  createCompany(userId: string, rawName: string): Promise<CompanyMembershipView> {
    return this.companies.createWithOwner(normalizeCompanyName(rawName), userId);
  }

  listMemberships(userId: string): Promise<CompanyMembershipView[]> {
    return this.companies.listMembershipsOfUser(userId);
  }

  /**
   * Détermine l'entreprise active d'une requête :
   * - entreprise demandée explicitement → l'utilisateur doit en être membre
   *   (sinon « introuvable », pour ne pas révéler son existence) ;
   * - sinon, son unique entreprise ;
   * - aucune → onboarding à terminer ; plusieurs → choix requis.
   */
  async resolveTenant(userId: string, requestedCompanyId: string | undefined): Promise<TenantContext> {
    if (requestedCompanyId !== undefined) {
      const membership = isUuid(requestedCompanyId)
        ? await this.companies.findMembership(userId, requestedCompanyId)
        : null;
      if (!membership) throw new DomainError("not_found", "Company not found");
      return { companyId: membership.companyId, userId, role: membership.role };
    }

    const memberships = await this.companies.listMembershipsOfUser(userId);
    if (memberships.length === 0) {
      throw new DomainError("onboarding_required", "Create a company first");
    }
    if (memberships.length > 1) {
      throw new DomainError("company_selection_required", "Specify the x-company-id header");
    }
    const [only] = memberships as [CompanyMembershipView];
    return { companyId: only.companyId, userId, role: only.role };
  }
}
