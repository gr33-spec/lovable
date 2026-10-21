import { Controller, Get, Headers, Inject, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { AppConfig } from "../../../platform/config/config.js";
import { forbidden } from "../../../platform/errors/domain-error.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Public } from "../../identity/index.js";
import { RapportMensuelService } from "../application/rapport-mensuel.service.js";

/**
 * La tâche du 1er du mois (vercel.json → crons, 7 h UTC) : le rapport mensuel de chaque artisan. Secret de la tâche
 * obligatoire ; `?maintenant=` seulement en test, pour rejouer « le 1er du mois suivant ».
 */
@Controller("v1/internal")
export class RapportMensuelController {
  constructor(
    @Inject(RapportMensuelService) private readonly rapport: RapportMensuelService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Throttle({ default: HOURLY(60) })
  @Get("rapport-mensuel")
  async envoyer(@Headers("authorization") authorization: string | undefined, @Query("maintenant") maintenantDemande?: string) {
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Scheduled task only");
    const maintenant = this.config.env === "test" && maintenantDemande && !Number.isNaN(Date.parse(maintenantDemande)) ? new Date(maintenantDemande) : new Date();
    return this.rapport.envoyer(maintenant);
  }
}
