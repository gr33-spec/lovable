import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { TenantContext } from "../../tenancy/index.js";
import { nextAction, type NextAction } from "../application/next-action.js";

export interface ProjectNextAction extends NextAction {
  projectId: string;
  projectName: string;
}

/** Prochaine action de chaque chantier en cours (les plus récemment travaillés d'abord). */
export class PrismaNextActionsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenant: TenantContext, limit = 30): Promise<ProjectNextAction[]> {
    const projects = await this.prisma.project.findMany({
      where: { companyId: tenant.companyId, status: "active" },
      orderBy: { lastActivityAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        documents: { where: { purpose: "client_quote" }, select: { id: true }, take: 1 },
        priceRequests: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            classifiedAt: true,
            recipients: { select: { status: true, document: { select: { offer: { select: { id: true } } } } } },
          },
        },
      },
    });
    if (projects.length === 0) return [];
    const takeoffs = await this.prisma.takeoff.findMany({
      where: { companyId: tenant.companyId, projectId: { in: projects.map((p) => p.id) } },
      orderBy: { createdAt: "desc" },
      select: { projectId: true, status: true },
    });
    const takeoffOf = new Map<string, "draft" | "validated">();
    for (const t of takeoffs) if (!takeoffOf.has(t.projectId)) takeoffOf.set(t.projectId, t.status === "validated" ? "validated" : "draft");

    return projects.flatMap((p) => {
      const request = p.priceRequests[0];
      const action = nextAction({
        hasClientQuote: p.documents.length > 0,
        takeoff: takeoffOf.get(p.id) ?? "none",
        request: request
          ? {
              chosen: request.classifiedAt !== null,
              recipients: request.recipients.map((r) => ({ status: r.status, hasQuote: r.document !== null, read: r.document?.offer != null })),
            }
          : null,
      });
      return action ? [{ ...action, projectId: p.id, projectName: p.name }] : [];
    });
  }
}
