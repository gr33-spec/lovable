import type { MembershipRole } from "../domain/tenant-context.js";

export interface CompanyMembershipView {
  companyId: string;
  companyName: string;
  role: MembershipRole;
  trades: string[];
}

/** Coordonnées de l'entreprise (§45.3 en-tête du PDF, §45.2 signature du mail). */
export interface CompanyProfile {
  name: string;
  address: string | null;
  siret: string | null;
  phone: string | null;
  email: string | null;
  hasLogo: boolean;
}

/** Port de persistance des entreprises et de leurs membres. */
export interface CompanyRepository {
  profile(companyId: string): Promise<CompanyProfile | null>;
  setProfile(companyId: string, profile: Omit<CompanyProfile, "hasLogo">): Promise<void>;
  logo(companyId: string): Promise<{ bytes: Uint8Array; type: string } | null>;
  setLogo(companyId: string, logo: { bytes: Uint8Array; type: string } | null): Promise<void>;
  createWithOwner(name: string, ownerUserId: string, trades: string[]): Promise<CompanyMembershipView>;
  setTrades(companyId: string, trades: string[]): Promise<void>;
  listMembershipsOfUser(userId: string): Promise<CompanyMembershipView[]>;
  findMembership(userId: string, companyId: string): Promise<CompanyMembershipView | null>;
}

export const COMPANY_REPOSITORY = Symbol("COMPANY_REPOSITORY");
