import { Controller, Get, Headers, Inject, Query } from "@nestjs/common";
import type { AppConfig } from "../../../platform/config/config.js";
import { forbidden, notFound } from "../../../platform/errors/domain-error.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Throttle } from "@nestjs/throttler";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { Public } from "../../identity/index.js";
import { ChoixService } from "../application/choix.service.js";
import { CommandeService } from "../application/commande.service.js";
import { DemandeService } from "../application/demande.service.js";
import { RegroupementService } from "../application/regroupement.service.js";

/**
 * La tâche planifiée du groupé (parcours groupé, étape 4 : « un lundi sur deux à 7 h ») : `vercel.json` l'appelle chaque
 * jour à 6 h UTC (le lundi pour le regroupement, chaque jour pour les choix passés le délai) ; le service décide si c'est un lundi de formation, puis les lots formés partent aux négoces (étape 5). Seulement avec le secret de la tâche (CRON_SECRET) ; 404 tant
 * que le drapeau `GROUPE` est éteint.
 */
/** Le budget d'un passage de la tâche (une fonction Vercel s'arrête à 60 s au plus) ; au-delà, le reste attend le prochain. */
const BUDGET_MS = 40_000;

@Controller("v1/internal/groupe")
export class RegroupementController {
  constructor(
    @Inject(RegroupementService) private readonly regroupement: RegroupementService,
    @Inject(DemandeService) private readonly demande: DemandeService,
    @Inject(ChoixService) private readonly choix: ChoixService,
    @Inject(CommandeService) private readonly commande: CommandeService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Throttle({ default: HOURLY(60) })
  @Get("regrouper")
  async regrouper(@Headers("authorization") authorization: string | undefined, @Query("maintenant") maintenantDemande?: string) {
    if (!this.config.groupe.enabled) throw notFound("Route");
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Scheduled task only");
    // Les parcours de test rejouent « sept jours plus tard » (lot sans offre, relances) : la date ne se force qu'en test.
    const maintenant = this.config.env === "test" && maintenantDemande && !Number.isNaN(Date.parse(maintenantDemande)) ? new Date(maintenantDemande) : new Date();
    // Tests de charge (21 octobre) : une fonction Vercel a un temps limité ; chaque étape s'arrête à l'échéance, lot entier
    // par lot entier, et reprend au passage suivant (chaque étape est rejouable : statuts, « déjà envoyé », « déjà relancé »).
    const jusqua = Date.now() + BUDGET_MS;
    const range = await this.regroupement.tachePlanifiee(maintenant);
    // Étape 5 : les lots formés (par le seuil ou par ce lundi) partent aux négoces.
    const envoi = await this.demande.envoyerLesLotsFormes(maintenant, jusqua);
    // Étape 6 : les lots envoyés dont le délai de réponse est passé se décident.
    const choix = await this.choix.choisirLesLotsEnvoyes(maintenant, jusqua);
    // Étape 7 : les bons de commande des lots choisis, la facture, les relances (factures échues, livraisons à J+15).
    const commandes = await this.commande.passerLesCommandes(maintenant, jusqua);
    const factures = await this.commande.relancerLesFactures(maintenant, jusqua);
    const livraisons = await this.commande.relancerLesLivraisons(maintenant, jusqua);
    // Étape 8 : « Livraison aujourd'hui. Tout est arrivé ? »
    const duJour = await this.commande.prevenirLesLivraisonsDuJour(maintenant, jusqua);
    return { ...range, ...envoi, ...choix, ...commandes, facturesRelancees: factures.relancees, livraisonsRelancees: livraisons.relancees, livraisonsPrevenues: duJour.prevenues, tempsEpuise: Date.now() > jusqua };
  }
}
