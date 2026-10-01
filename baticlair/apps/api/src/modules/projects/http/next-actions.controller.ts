import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { PrismaNextActionsQuery } from "../infrastructure/prisma-next-actions.query.js";

/** Accueil « À faire » : la prochaine action réelle de chaque chantier en cours. */
@Controller("v1/next-actions")
@UseGuards(TenantGuard)
export class NextActionsController {
  constructor(@Inject(PrismaNextActionsQuery) private readonly query: PrismaNextActionsQuery) {}

  @Get()
  async list(@Tenant() tenant: TenantContext) {
    return { items: await this.query.list(tenant) };
  }
}
