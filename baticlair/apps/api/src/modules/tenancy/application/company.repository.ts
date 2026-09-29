import type { MembershipRole } from "../domain/tenant-context.js";

export interface CompanyMembershipView {
  companyId: string;
  companyName: string;
  role: MembershipRole;
}

/** Port de persistance des entreprises et de leurs membres. */
export interface CompanyRepository {
  createWithOwner(name: string, ownerUserId: string): Promise<CompanyMembershipView>;
  listMembershipsOfUser(userId: string): Promise<CompanyMembershipView[]>;
  findMembership(userId: string, companyId: string): Promise<CompanyMembershipView | null>;
}

export const COMPANY_REPOSITORY = Symbol("COMPANY_REPOSITORY");
