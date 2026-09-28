import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { CompanyMembershipView, CompanyRepository } from "../application/company.repository.js";

export class PrismaCompanyRepository implements CompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createWithOwner(name: string, ownerUserId: string): Promise<CompanyMembershipView> {
    const company = await this.prisma.company.create({
      data: { name, memberships: { create: { userId: ownerUserId, role: "owner" } } },
    });
    return { companyId: company.id, companyName: company.name, role: "owner" };
  }

  async listMembershipsOfUser(userId: string): Promise<CompanyMembershipView[]> {
    const rows = await this.prisma.membership.findMany({
      where: { userId },
      include: { company: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((m) => ({ companyId: m.companyId, companyName: m.company.name, role: m.role }));
  }

  async findMembership(userId: string, companyId: string): Promise<CompanyMembershipView | null> {
    const m = await this.prisma.membership.findUnique({
      where: { companyId_userId: { companyId, userId } },
      include: { company: { select: { name: true } } },
    });
    return m ? { companyId: m.companyId, companyName: m.company.name, role: m.role } : null;
  }
}
