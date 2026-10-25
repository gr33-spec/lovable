import { Inject, Module, type OnModuleInit } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../platform/email/email.port.js";
import { CONFIG, EMAIL_SENDER } from "../../platform/tokens.js";
import { AbonnementModule, AbonnementService } from "../abonnement/index.js";
import { AiUsageModule, AnalysisMeter } from "../ai-usage/index.js";
import { CommandeDuMoisService, EspaceNegoceService, GroupeModule } from "../groupe/index.js";
import { PriceRequestsModule, PriceRequestsService } from "../price-requests/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { PilotageModule } from "../pilotage/index.js";
import { DemandePersoService } from "./application/demande-perso.service.js";
import { DroitsService } from "./application/droits.service.js";
import { RegroupementsService } from "./application/regroupements.service.js";
import { HypothesesService } from "./application/hypotheses.service.js";
import { ChiffrageController, RecentrageController, RecentrageNegoceController, RegroupementsController, HypothesesController } from "./http/recentrage.controller.js";

/**
 * RECENTRAGE (Greg, 25 octobre 2026) : la demande perso, « Mes prix », les droits gratuit / payant. Branche au démarrage
 * le lien de chiffrage dans le mail de demande de devis, le payant offert dans l'abonnement, la limite gratuite des lectures.
 */
@Module({
  imports: [TenancyModule, AbonnementModule, PriceRequestsModule, GroupeModule, AiUsageModule, PilotageModule],
  controllers: [RecentrageController, ChiffrageController, RecentrageNegoceController, RegroupementsController, HypothesesController],
  providers: [
    {
      provide: DroitsService,
      useFactory: (p: PrismaService, a: AbonnementService, c: AppConfig) => new DroitsService(p, a, { zonesActives: c.groupe.departements, seuilZoneActive: c.groupe.recentrage.seuilZoneActive, lecturesGratuites: c.groupe.recentrage.lecturesGratuites }),
      inject: [PrismaService, AbonnementService, CONFIG],
    },
    {
      provide: DemandePersoService,
      useFactory: (p: PrismaService, pr: PriceRequestsService, d: DroitsService, espace: EspaceNegoceService, e: TransactionalEmailSender, c: AppConfig) =>
        new DemandePersoService(p, pr, d, (n) => espace.inviter(n), e, { webAppUrl: c.webAppUrl }),
      inject: [PrismaService, PriceRequestsService, DroitsService, EspaceNegoceService, EMAIL_SENDER, CONFIG],
    },
    {
      provide: RegroupementsService,
      useFactory: (p: PrismaService, cmd: CommandeDuMoisService, d: DroitsService, dp: DemandePersoService, c: AppConfig) => new RegroupementsService(p, cmd, d, dp, c.groupe.recentrage),
      inject: [PrismaService, CommandeDuMoisService, DroitsService, DemandePersoService, CONFIG],
    },
    {
      provide: HypothesesService,
      useFactory: (p: PrismaService, d: DroitsService, dp: DemandePersoService, c: AppConfig) => new HypothesesService(p, d, dp, () => (c.abonnement.paiement === "stripe" ? "F" : "TEST")),
      inject: [PrismaService, DroitsService, DemandePersoService, CONFIG],
    },
  ],
  exports: [DroitsService, DemandePersoService, RegroupementsService],
})
export class RecentrageModule implements OnModuleInit {
  constructor(
    @Inject(PriceRequestsService) private readonly priceRequests: PriceRequestsService,
    @Inject(AbonnementService) private readonly abonnement: AbonnementService,
    @Inject(AnalysisMeter) private readonly meter: AnalysisMeter,
    @Inject(DroitsService) private readonly droits: DroitsService,
    @Inject(DemandePersoService) private readonly demandes: DemandePersoService,
    @Inject(CommandeDuMoisService) private readonly commande: CommandeDuMoisService,
    @Inject(RegroupementsService) private readonly regroupements: RegroupementsService,
  ) {}

  onModuleInit(): void {
    this.priceRequests.brancherComplement((requestId, recipientId) => this.demandes.complement(requestId, recipientId));
    this.abonnement.brancherOffert((companyId) => this.droits.offertPour(companyId));
    this.meter.brancherLimiteGratuite((companyId) => this.droits.limiteGratuite(companyId));
    this.commande.brancherVolume((c) => this.regroupements.volume(c));
  }
}
