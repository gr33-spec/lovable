import { Prisma } from "../../../generated/prisma/client.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { isUuid } from "../../../platform/validation/ids.js";
import type { TenantContext } from "../../tenancy/index.js";
import type { Project } from "../domain/project.js";
import type {
  NewProject,
  ProjectListQuery,
  ProjectPage,
  ProjectPatch,
  ProjectRepository,
} from "../application/project.repository.js";

/** Échappe les jokers de LIKE : « 100% » cherche littéralement « 100% ». */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenant: TenantContext, data: NewProject): Promise<Project> {
    return this.prisma.project.create({
      data: { ...data, companyId: tenant.companyId, createdById: tenant.userId },
    });
  }

  findById(tenant: TenantContext, id: string): Promise<Project | null> {
    if (!isUuid(id)) return Promise.resolve(null);
    return this.prisma.project.findFirst({ where: { id, companyId: tenant.companyId } });
  }

  /**
   * Liste paginée par curseur, du plus récemment travaillé au plus ancien.
   * La recherche utilise l'index trigramme sans accents (voir la migration
   * *_project_activity_idempotency) : rapide même avec des années de chantiers.
   */
  async list(tenant: TenantContext, query: ProjectListQuery): Promise<ProjectPage> {
    const conditions: Prisma.Sql[] = [Prisma.sql`"companyId" = ${tenant.companyId}::uuid`];
    if (query.status !== "all") {
      conditions.push(Prisma.sql`"status" = ${query.status}::"ProjectStatus"`);
    }
    for (const word of query.search ?? []) {
      conditions.push(
        Prisma.sql`immutable_unaccent(lower("name" || ' ' || coalesce("clientName", '') || ' ' || coalesce("address", '')))
          LIKE '%' || immutable_unaccent(lower(${escapeLike(word)})) || '%'`,
      );
    }
    if (query.cursor) {
      conditions.push(
        Prisma.sql`("lastActivityAt", "id") < (${query.cursor.lastActivityAt}, ${query.cursor.id}::uuid)`,
      );
    }

    const rows = await this.prisma.$queryRaw<Project[]>`
      SELECT "id", "companyId", "name", "clientName", "address", "siteNotes", "status",
             "createdAt", "updatedAt", "lastActivityAt"
      FROM "project"
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY "lastActivityAt" DESC, "id" DESC
      LIMIT ${query.limit + 1}`;

    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    const last = items.at(-1);
    return {
      items,
      nextCursor: hasMore && last ? { lastActivityAt: last.lastActivityAt, id: last.id } : null,
    };
  }

  async update(tenant: TenantContext, id: string, patch: ProjectPatch): Promise<Project | null> {
    if (!isUuid(id)) return null;
    // updateMany filtre sur l'entreprise : impossible de modifier le chantier d'un autre tenant.
    const { count } = await this.prisma.project.updateMany({
      where: { id, companyId: tenant.companyId },
      data: { ...patch, lastActivityAt: new Date() },
    });
    return count === 0 ? null : this.findById(tenant, id);
  }
}
