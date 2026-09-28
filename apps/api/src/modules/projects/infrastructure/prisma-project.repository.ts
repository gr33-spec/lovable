import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { TenantContext } from "../../tenancy/index.js";
import type { Project, ProjectStatus } from "../domain/project.js";
import type { NewProject, ProjectPage, ProjectPatch, ProjectRepository } from "../application/project.repository.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenant: TenantContext, data: NewProject): Promise<Project> {
    return this.prisma.project.create({
      data: { ...data, companyId: tenant.companyId, createdById: tenant.userId },
    });
  }

  findById(tenant: TenantContext, id: string): Promise<Project | null> {
    // Un identifiant mal formé est simplement introuvable (et ne fait pas échouer la requête SQL).
    if (!UUID.test(id)) return Promise.resolve(null);
    return this.prisma.project.findFirst({ where: { id, companyId: tenant.companyId } });
  }

  /**
   * Pagination par curseur. Les identifiants UUID v7 étant ordonnés dans le
   * temps, trier par id décroissant = du plus récent au plus ancien.
   */
  async list(
    tenant: TenantContext,
    query: { status: ProjectStatus; limit: number; cursor?: string },
  ): Promise<ProjectPage> {
    const rows = await this.prisma.project.findMany({
      where: {
        companyId: tenant.companyId,
        status: query.status,
        ...(query.cursor && UUID.test(query.cursor) ? { id: { lt: query.cursor } } : {}),
      },
      orderBy: { id: "desc" },
      take: query.limit + 1,
    });
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
  }

  async update(tenant: TenantContext, id: string, patch: ProjectPatch): Promise<Project | null> {
    if (!UUID.test(id)) return null;
    // updateMany filtre sur l'entreprise : impossible de modifier le chantier d'un autre tenant.
    const { count } = await this.prisma.project.updateMany({
      where: { id, companyId: tenant.companyId },
      data: patch,
    });
    return count === 0 ? null : this.findById(tenant, id);
  }
}
