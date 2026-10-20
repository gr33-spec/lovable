import { Controller, Get, Headers, Inject } from "@nestjs/common";
import type { AppConfig } from "../../../platform/config/config.js";
import { forbidden, notFound } from "../../../platform/errors/domain-error.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Public } from "../../identity/index.js";
import { RegroupementService } from "../application/regroupement.service.js";

/**
 * La tâche planifiée du groupé (parcours groupé, étape 4 : « un lundi sur deux à 7 h ») : `vercel.json` l'appelle chaque
 * lundi ; le service décide si c'est un lundi de formation. Seulement avec le secret de la tâche (CRON_SECRET) ; 404 tant
 * que le drapeau `GROUPE` est éteint.
 */
@Controller("v1/internal/groupe")
export class RegroupementController {
  constructor(
    @Inject(RegroupementService) private readonly regroupement: RegroupementService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Get("regrouper")
  async regrouper(@Headers("authorization") authorization: string | undefined) {
    if (!this.config.groupe.enabled) throw notFound("Route");
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Scheduled task only");
    return this.regroupement.tachePlanifiee();
  }
}
