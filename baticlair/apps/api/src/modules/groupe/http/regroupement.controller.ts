import { Controller, Get, Headers, Inject } from "@nestjs/common";
import type { AppConfig } from "../../../platform/config/config.js";
import { forbidden, notFound } from "../../../platform/errors/domain-error.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Public } from "../../identity/index.js";
import { ChoixService } from "../application/choix.service.js";
import { DemandeService } from "../application/demande.service.js";
import { RegroupementService } from "../application/regroupement.service.js";

/**
 * La tâche planifiée du groupé (parcours groupé, étape 4 : « un lundi sur deux à 7 h ») : `vercel.json` l'appelle chaque
 * jour à 6 h UTC (le lundi pour le regroupement, chaque jour pour les choix passés le délai) ; le service décide si c'est un lundi de formation, puis les lots formés partent aux négoces (étape 5). Seulement avec le secret de la tâche (CRON_SECRET) ; 404 tant
 * que le drapeau `GROUPE` est éteint.
 */
@Controller("v1/internal/groupe")
export class RegroupementController {
  constructor(
    @Inject(RegroupementService) private readonly regroupement: RegroupementService,
    @Inject(DemandeService) private readonly demande: DemandeService,
    @Inject(ChoixService) private readonly choix: ChoixService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Get("regrouper")
  async regrouper(@Headers("authorization") authorization: string | undefined) {
    if (!this.config.groupe.enabled) throw notFound("Route");
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Scheduled task only");
    const range = await this.regroupement.tachePlanifiee();
    // Étape 5 : les lots formés (par le seuil ou par ce lundi) partent aux négoces.
    const envoi = await this.demande.envoyerLesLotsFormes();
    // Étape 6 : les lots envoyés dont le délai de réponse est passé se décident.
    const choix = await this.choix.choisirLesLotsEnvoyes();
    return { ...range, ...envoi, ...choix };
  }
}
