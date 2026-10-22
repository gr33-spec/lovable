import { Controller, Get, Inject, Param, UseGuards } from "@nestjs/common";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { SuiviService } from "../application/suivi.service.js";

/** Le suivi façon colis d'un chantier (nouveau cap du 22 octobre) : ouvert même groupé éteint (l'envoi seul se suit aussi). */
@Controller("v1")
@UseGuards(TenantGuard)
export class SuiviController {
  constructor(@Inject(SuiviService) private readonly suivi: SuiviService) {}

  @Get("projects/:projectId/suivi")
  async get(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string) {
    return this.suivi.suivi(tenant, projectId);
  }
}
