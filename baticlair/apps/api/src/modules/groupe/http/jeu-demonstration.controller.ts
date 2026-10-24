import { Controller, Delete, Headers, Inject, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { AppConfig } from "../../../platform/config/config.js";
import { forbidden } from "../../../platform/errors/domain-error.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Public } from "../../identity/index.js";
import { JeuDemonstrationService } from "../application/jeu-demonstration.service.js";

/**
 * Le jeu de données de démonstration (plan 2, bloc 6), sur une prévisualisation seulement : jamais en production.
 * Secret de la tâche obligatoire. `?entreprise=<e-mail>` : cette entreprise entre dans les trois lots.
 *
 *   curl -X POST "https://<api de prévisualisation>/v1/internal/demo/jeu?entreprise=greg@…" -H "Authorization: Bearer $CRON_SECRET"
 */
@Controller("v1/internal/demo")
export class JeuDemonstrationController {
  constructor(
    @Inject(JeuDemonstrationService) private readonly jeu: JeuDemonstrationService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Throttle({ default: HOURLY(10) })
  @Post("jeu")
  async creer(@Headers("authorization") authorization: string | undefined, @Query("entreprise") entreprise?: string) {
    this.garde(authorization);
    return this.jeu.creer(entreprise?.trim() || null);
  }

  @Public()
  @Throttle({ default: HOURLY(10) })
  @Delete("jeu")
  async effacer(@Headers("authorization") authorization: string | undefined) {
    this.garde(authorization);
    return this.jeu.effacer();
  }

  private garde(authorization: string | undefined) {
    if (this.config.env === "production") throw forbidden("Never in production");
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Scheduled task only");
  }
}
