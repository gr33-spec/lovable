import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { CompanyMembershipView, CompanyRepository } from "../application/company.repository.js";

export class PrismaCompanyRepository implements CompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

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
