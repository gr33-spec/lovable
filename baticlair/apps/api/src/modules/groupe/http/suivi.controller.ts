import { Controller, Get, Inject, Param, UseGuards } from "@nestjs/common";
import type { AppConfig } from "../../../platform/config/config.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { CommandeDuMoisService } from "../application/commande-du-mois.service.js";
import { SuiviService } from "../application/suivi.service.js";

/**
 * Le suivi façon colis d'un chantier (nouveau cap du 22 octobre) : ouvert même groupé éteint (l'envoi seul se suit aussi).
 * Un chantier inscrit au regroupement du mois suit ses cinq étapes (Greg, 22 octobre au soir) : Liste déposée →
 * Commande close → Prix demandés → Prix reçus → Commandé ; sinon les quatre de l'envoi seul.
 */
@Controller("v1")
@UseGuards(TenantGuard)
export class SuiviController {
  constructor(
    @Inject(SuiviService) private readonly suivi: SuiviService,
    @Inject(CommandeDuMoisService) private readonly commande: CommandeDuMoisService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Get("projects/:projectId/suivi")
  async get(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string) {
    const base = await this.suivi.suivi(tenant, projectId);
    if (!this.config.groupe.enabled) return base;
    return (await this.commande.suiviDuChantier(tenant, projectId)) ?? base;
  }
}
