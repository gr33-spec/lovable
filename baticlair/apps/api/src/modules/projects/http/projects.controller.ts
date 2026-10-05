import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { validationFailed } from "../../../platform/errors/domain-error.js";
import { Idempotent } from "../../../platform/http/idempotency.interceptor.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { isUuid } from "../../../platform/validation/ids.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import type { ProjectCursor } from "../application/project.repository.js";
import { ProjectsService } from "../application/projects.service.js";
import type { Project } from "../domain/project.js";
import { BillingService } from "../../billing/index.js";

const createBody = z.object({
  name: z.string(),
  clientName: z.string().nullish(),
  address: z.string().nullish(),
  /** Métier du chantier, quand le devis ne le dit pas (« tiling ») ; absent : celui de l'entreprise. */
  trade: z.string().max(40).nullish(),
});

const updateBody = z
  .object({
    name: z.string(),
    clientName: z.string().nullable(),
    address: z.string().nullable(),
    siteNotes: z.string().max(4000).nullable(),
    status: z.enum(["active", "archived"]),
  })
  .partial()
  .strict();

const listQuery = z.object({
  /** Texte libre : nom du chantier, du client ou adresse. */
  q: z.string().trim().max(100).optional(),
  /** Par défaut : en cours ; en recherche : tous. */
  status: z.enum(["active", "archived", "all"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().max(200).optional(),
});

/** Curseur opaque pour le client : base64url de « date|id ». */
function encodeCursor(c: ProjectCursor): string {
  return Buffer.from(`${c.lastActivityAt.toISOString()}|${c.id}`).toString("base64url");
}

function decodeCursor(raw: string): ProjectCursor {
  const [iso, id] = Buffer.from(raw, "base64url").toString("utf8").split("|");
  const date = iso ? new Date(iso) : new Date(Number.NaN);
  if (!id || !isUuid(id) || Number.isNaN(date.getTime())) {
    throw validationFailed("Invalid cursor", [{ path: "cursor", message: "invalid" }]);
  }
  return { lastActivityAt: date, id };
}

function toDto(p: Project) {
  return {
    id: p.id,
    name: p.name,
    clientName: p.clientName,
    address: p.address,
    siteNotes: p.siteNotes,
    trade: p.trade,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    lastActivityAt: p.lastActivityAt.toISOString(),
  };
}

@Controller("v1/projects")
@UseGuards(TenantGuard)
export class ProjectsController {
  constructor(
    @Inject(ProjectsService) private readonly projects: ProjectsService,
    @Inject(BillingService) private readonly billing: BillingService,
  ) {}

  @Post()
  @HttpCode(201)
  @Idempotent()
  async create(@Tenant() tenant: TenantContext, @Body(new ZodPipe(createBody)) body: z.infer<typeof createBody>) {
    // La formule limite les nouveaux chantiers ; jamais un chantier déjà commencé.
    await this.billing.assertCanCreateProject(tenant);
    return toDto(await this.projects.create(tenant, { name: body.name, clientName: body.clientName, address: body.address, trade: body.trade }));
  }

  @Get()
  async list(@Tenant() tenant: TenantContext, @Query(new ZodPipe(listQuery)) query: z.infer<typeof listQuery>) {
    const search = query.q ? query.q.split(/\s+/).filter(Boolean).slice(0, 8) : [];
    const page = await this.projects.list(tenant, {
      status: query.status ?? (search.length > 0 ? "all" : "active"),
      limit: query.limit,
      ...(search.length > 0 ? { search } : {}),
      ...(query.cursor ? { cursor: decodeCursor(query.cursor) } : {}),
    });
    return { items: page.items.map(toDto), nextCursor: page.nextCursor ? encodeCursor(page.nextCursor) : null };
  }

  @Get(":id")
  async get(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return toDto(await this.projects.get(tenant, id));
  }

  @Patch(":id")
  async update(
    @Tenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body(new ZodPipe(updateBody)) body: z.infer<typeof updateBody>,
  ) {
    return toDto(await this.projects.update(tenant, id, body));
  }
}
