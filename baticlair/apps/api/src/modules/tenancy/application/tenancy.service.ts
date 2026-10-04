import { normalizeTrades } from "@baticlair/domain";
import { DomainError } from "../../../platform/errors/domain-error.js";
import { isUuid } from "../../../platform/validation/ids.js";
import { normalizeCompanyName } from "../domain/company-name.js";
import { assertCanWrite, type TenantContext } from "../domain/tenant-context.js";
import type { CompanyMembershipView, CompanyProfile, CompanyRepository } from "./company.repository.js";

/** Logo de l'en-tête (§45.3) : PNG ou JPEG (seuls formats que le PDF embarque), 500 Ko au plus. */
export const MAX_LOGO_BYTES = 500 * 1024;
const blank = (v: string | null | undefined, max: number) => {
  const t = (v ?? "").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
};

export class TenancyService {
  constructor(private readonly companies: CompanyRepository) {}

  /** Onboarding : crée l'entreprise et en fait l'utilisateur propriétaire. */
  createCompany(userId: string, rawName: string, trades: readonly string[] = []): Promise<CompanyMembershipView> {
    return this.companies.createWithOwner(normalizeCompanyName(rawName), userId, normalizeTrades(trades));
  }

  /** L'artisan change ses métiers (Mon compte) : s'applique aux prochains devis lus. */
  async setTrades(tenant: TenantContext, trades: readonly string[]): Promise<string[]> {
    assertCanWrite(tenant);
    const normalized = normalizeTrades(trades);
    await this.companies.setTrades(tenant.companyId, normalized);
    return normalized;
  }

  async profile(tenant: TenantContext): Promise<CompanyProfile> {
    const p = await this.companies.profile(tenant.companyId);
    if (!p) throw new DomainError("not_found", "Company not found");
    return p;
  }

  /** Coordonnées de l'en-tête de la demande de devis (§45.3) : rien d'obligatoire, un SIRET a 14 chiffres. */
  async setProfile(
    tenant: TenantContext,
    input: { name?: string | null; address?: string | null; siret?: string | null; phone?: string | null; email?: string | null },
  ): Promise<CompanyProfile> {
    assertCanWrite(tenant);
    const current = await this.profile(tenant);
    const siret = input.siret === undefined ? current.siret : blank(input.siret, 40)?.replace(/\s/g, "") ?? null;
    if (siret && !/^\d{14}$/.test(siret)) throw new DomainError("validation_failed", "SIRET must have 14 digits", { field: "siret" });
    const email = input.email === undefined ? current.email : blank(input.email, 200);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DomainError("validation_failed", "Invalid email", { field: "email" });
    const next = {
      name: input.name === undefined || !blank(input.name, 120) ? current.name : normalizeCompanyName(input.name!),
      address: input.address === undefined ? current.address : blank(input.address, 300),
      siret,
      phone: input.phone === undefined ? current.phone : blank(input.phone, 40),
      email,
    };
    await this.companies.setProfile(tenant.companyId, next);
    return { ...next, hasLogo: current.hasLogo };
  }

  logo(tenant: TenantContext): Promise<{ bytes: Uint8Array; type: string } | null> {
    return this.companies.logo(tenant.companyId);
  }

  /** Le format est lu dans le fichier (signature PNG ou JPEG), jamais dans son nom. */
  async setLogo(tenant: TenantContext, bytes: Uint8Array | null): Promise<void> {
    assertCanWrite(tenant);
    if (!bytes) return this.companies.setLogo(tenant.companyId, null);
    if (bytes.length > MAX_LOGO_BYTES) throw new DomainError("payload_too_large", "Logo larger than 500 KB");
    const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!png && !jpeg) throw new DomainError("validation_failed", "Logo must be PNG or JPEG", { field: "logo" });
    await this.companies.setLogo(tenant.companyId, { bytes, type: png ? "image/png" : "image/jpeg" });
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
      return { companyId: membership.companyId, userId, role: membership.role, trades: normalizeTrades(membership.trades) };
    }

    const memberships = await this.companies.listMembershipsOfUser(userId);
    if (memberships.length === 0) {
      throw new DomainError("onboarding_required", "Create a company first");
    }
    if (memberships.length > 1) {
      throw new DomainError("company_selection_required", "Specify the x-company-id header");
    }
    const [only] = memberships as [CompanyMembershipView];
    return { companyId: only.companyId, userId, role: only.role, trades: normalizeTrades(only.trades) };
  }
}
