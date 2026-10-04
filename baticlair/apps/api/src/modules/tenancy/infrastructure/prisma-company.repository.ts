import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { CompanyMembershipView, CompanyProfile, CompanyRepository } from "../application/company.repository.js";

export class PrismaCompanyRepository implements CompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async profile(companyId: string): Promise<CompanyProfile | null> {
    const c = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, address: true, siret: true, phone: true, contactEmail: true, logoType: true },
    });
    return c ? { name: c.name, address: c.address, siret: c.siret, phone: c.phone, email: c.contactEmail, hasLogo: !!c.logoType } : null;
  }

  async setProfile(companyId: string, p: Omit<CompanyProfile, "hasLogo">): Promise<void> {
    await this.prisma.company.update({
      where: { id: companyId },
      data: { name: p.name, address: p.address, siret: p.siret, phone: p.phone, contactEmail: p.email },
    });
  }

  async logo(companyId: string): Promise<{ bytes: Uint8Array; type: string } | null> {
    const c = await this.prisma.company.findUnique({ where: { id: companyId }, select: { logo: true, logoType: true } });
    return c?.logo && c.logoType ? { bytes: new Uint8Array(c.logo), type: c.logoType } : null;
  }

  async setLogo(companyId: string, logo: { bytes: Uint8Array; type: string } | null): Promise<void> {
    await this.prisma.company.update({
      where: { id: companyId },
      data: logo ? { logo: Buffer.from(logo.bytes), logoType: logo.type } : { logo: null, logoType: null },
    });
  }

  async createWithOwner(name: string, ownerUserId: string, trades: string[]): Promise<CompanyMembershipView> {
    const company = await this.prisma.company.create({
      data: { name, trades, memberships: { create: { userId: ownerUserId, role: "owner" } } },
    });
    return { companyId: company.id, companyName: company.name, role: "owner", trades: company.trades };
  }

  async setTrades(companyId: string, trades: string[]): Promise<void> {
    await this.prisma.company.update({ where: { id: companyId }, data: { trades } });
  }

  async listMembershipsOfUser(userId: string): Promise<CompanyMembershipView[]> {
    const rows = await this.prisma.membership.findMany({
      where: { userId },
      include: { company: { select: { name: true, trades: true } } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((m) => ({ companyId: m.companyId, companyName: m.company.name, role: m.role, trades: m.company.trades }));
  }

  async findMembership(userId: string, companyId: string): Promise<CompanyMembershipView | null> {
    const m = await this.prisma.membership.findUnique({
      where: { companyId_userId: { companyId, userId } },
      include: { company: { select: { name: true, trades: true } } },
    });
    return m ? { companyId: m.companyId, companyName: m.company.name, role: m.role, trades: m.company.trades } : null;
  }
}
