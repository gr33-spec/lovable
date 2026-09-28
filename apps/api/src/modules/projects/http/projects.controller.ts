import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodPipe } from "../../../platform/http/zod.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { ProjectsService } from "../application/projects.service.js";
import type { Project } from "../domain/project.js";

const createBody = z.object({
  name: z.string(),
  clientName: z.string().nullish(),
  address: z.string().nullish(),
});

const updateBody = z
  .object({
    name: z.string(),
    clientName: z.string().nullable(),
    address: z.string().nullable(),
    status: z.enum(["active", "archived"]),
  })
  .partial()
  .strict();

const listQuery = z.object({
  status: z.enum(["active", "archived"]).default("active"),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().optional(),
});

function toDto(p: Project) {
  return {
    id: p.id,
    name: p.name,
    clientName: p.clientName,
    address: p.address,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

@Controller("v1/projects")
@UseGuards(TenantGuard)
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projects: ProjectsService) {}

  @Post()
  @HttpCode(201)
  async create(@Tenant() tenant: TenantContext, @Body(new ZodPipe(createBody)) body: z.infer<typeof createBody>) {
    return toDto(await this.projects.create(tenant, body));
  }

  @Get()
  async list(@Tenant() tenant: TenantContext, @Query(new ZodPipe(listQuery)) query: z.infer<typeof listQuery>) {
    const page = await this.projects.list(tenant, {
      status: query.status,
      limit: query.limit,
      ...(query.cursor ? { cursor: query.cursor } : {}),
    });
    return { items: page.items.map(toDto), nextCursor: page.nextCursor };
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
