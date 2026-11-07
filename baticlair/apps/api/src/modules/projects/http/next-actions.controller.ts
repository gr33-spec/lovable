import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import type { AppConfig } from "../../../platform/config/config.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { PrismaNextActionsQuery } from "../infrastructure/prisma-next-actions.query.js";

/** Accueil « À faire » : la prochaine action réelle de chaque chantier en cours. */
@Controller("v1/next-actions")
@UseGuards(TenantGuard)
export class NextActionsController {
  constructor(
    @Inject(PrismaNextActionsQuery) private readonly query: PrismaNextActionsQuery,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Get()
  async list(@Tenant() tenant: TenantContext) {
    const items = await this.query.list(tenant);
    // Commande du mois (Greg, 23 octobre) : l'ancienne logique « devis client → offres → comparer » ne se propose plus ;
    // restent la liste à préparer ou à valider, et les demandes à envoyer.
    const mois = this.config.groupe.enabled && this.config.groupe.mode === "mois";
    return { items: mois ? items.filter((a) => !["add_quote", "compare", "view_offer", "choose_supplier"].includes(a.kind)) : items };
  }
}
