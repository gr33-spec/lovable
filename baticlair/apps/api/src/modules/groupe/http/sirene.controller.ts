import { Controller, Get, Headers, Inject, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import type { AppConfig } from "../../../platform/config/config.js";
import { forbidden, notFound } from "../../../platform/errors/domain-error.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Public } from "../../identity/index.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { SireneService } from "../application/sirene.service.js";

const suggestionsQuery = z.object({ q: z.string().trim().min(3).max(80) });

/** La base négoces Sirene (bloc 3) : suggestions à la saisie pour l'artisan ; import mensuel par la tâche planifiée. */
@Controller("v1")
export class SireneController {
  constructor(
    @Inject(SireneService) private readonly sirene: SireneService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Get("groupe/negoces/suggestions")
  @UseGuards(TenantGuard)
  async suggestions(@Tenant() tenant: TenantContext, @Query(new ZodPipe(suggestionsQuery)) query: z.infer<typeof suggestionsQuery>) {
    if (!this.config.groupe.enabled) throw notFound("Route");
    return { suggestions: await this.sirene.suggestions(tenant, query.q) };
  }

  /** `vercel.json` : chaque jour à 5 h UTC, avec le secret de la tâche ; reprend page par page, un cycle complet par mois. */
  @Public()
  @Get("internal/groupe/sirene")
  async importer(@Headers("authorization") authorization: string | undefined) {
    if (!this.config.groupe.enabled) throw notFound("Route");
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Scheduled task only");
    return this.sirene.importer();
  }
}
