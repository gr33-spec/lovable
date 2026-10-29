import { Inject, Module, type OnModuleInit } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../platform/email/email.port.js";
import { CONFIG, EMAIL_SENDER, PUSH_SENDER } from "../../platform/tokens.js";
import type { PushSender } from "../../platform/push/push.port.js";
import { AbonnementModule, AbonnementService } from "../abonnement/index.js";
import { AiUsageModule, AnalysisMeter } from "../ai-usage/index.js";
import { CommandeDuMoisService, EspaceNegoceService, GroupeModule } from "../groupe/index.js";
import { PriceRequestsModule, PriceRequestsService } from "../price-requests/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { PilotageModule } from "../pilotage/index.js";
import { DemandePersoService } from "./application/demande-perso.service.js";
import { AdresseMobiizModule, AdresseMobiizService } from "../adresse-mobiiz/index.js";
import { DroitsService } from "./application/droits.service.js";
import { RegroupementsService } from "./application/regroupements.service.js";
import { HypothesesService } from "./application/hypotheses.service.js";
import { NegocieService } from "./application/negocie.service.js";
import { ObservatoireService } from "./application/observatoire.service.js";
import { ApiRechercheEntreprises, FakeRechercheEntreprises, VerificationNegoceService } from "./application/verification-negoce.service.js";
import { ChasseurController, NegocieAdminController, NegocieController } from "./http/negocie.controller.js";
import { ChiffrageController, RecentrageController, RecentrageNegoceController, RegroupementsController, HypothesesController } from "./http/recentrage.controller.js";

/**
 * RECENTRAGE (Greg, 25 octobre 2026) : la demande perso, « Mes prix », les droits gratuit / payant. Branche au démarrage
 * le lien de chiffrage dans le mail de demande de devis, le payant offert dans l'abonnement, la limite gratuite des lectures.
 */
@Module({
  imports: [TenancyModule, AbonnementModule, PriceRequestsModule, GroupeModule, AiUsageModule, PilotageModule, AdresseMobiizModule],
  controllers: [RecentrageController, ChiffrageController, RecentrageNegoceController, RegroupementsController, HypothesesController, NegocieController, ChasseurController, NegocieAdminController],
  providers: [
    {
      provide: DroitsService,
      useFactory: (p: PrismaService, a: AbonnementService, c: AppConfig) => new DroitsService(p, a, { zonesActives: c.groupe.departements, seuilZoneActive: c.groupe.recentrage.seuilZoneActive, lecturesGratuites: c.groupe.recentrage.lecturesGratuites, lecturesIaGratuitTotal: c.groupe.negocie.lecturesIaGratuitTotal }),
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
    {
      provide: ObservatoireService,
      useFactory: (p: PrismaService) => new ObservatoireService(p),
      inject: [PrismaService],
    },
    {
      provide: NegocieService,
      useFactory: (p: PrismaService, d: DroitsService, cmd: CommandeDuMoisService, o: ObservatoireService, e: TransactionalEmailSender, push: PushSender, c: AppConfig) =>
        new NegocieService(p, d, cmd, o, e, push, { webAppUrl: c.webAppUrl, mode: c.groupe.negocie.mode, chasseurs: c.groupe.negocie.chasseurs, admins: c.groupe.admins, commissionDefaut: c.groupe.negocie.commissionDefaut, seuilAnonymat: c.groupe.recentrage.seuilAnonymat, emailChasseur: c.groupe.negocie.emailChasseur, delaiLivraisonJours: c.groupe.negocie.delaiLivraisonJours }),
      inject: [PrismaService, DroitsService, CommandeDuMoisService, ObservatoireService, EMAIL_SENDER, PUSH_SENDER, CONFIG],
    },
    {
      provide: VerificationNegoceService,
      useFactory: (c: AppConfig) => {
        const r = c.groupe.negocie.rechercheEntreprises;
        return new VerificationNegoceService(r === "off" ? null : r === "fake" ? new FakeRechercheEntreprises() : new ApiRechercheEntreprises(), { naf: c.groupe.negocie.naf, fake: r === "fake" });
      },
      inject: [CONFIG],
    },
  ],
  exports: [DroitsService, DemandePersoService, RegroupementsService, NegocieService, ObservatoireService],
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
    @Inject(NegocieService) private readonly negocie: NegocieService,
    @Inject(AdresseMobiizService) private readonly adresses: AdresseMobiizService,
    @Inject(ObservatoireService) private readonly observatoire: ObservatoireService,
    @Inject(VerificationNegoceService) private readonly verification: VerificationNegoceService,
    @Inject(EspaceNegoceService) private readonly espace: EspaceNegoceService,
  ) {}

  onModuleInit(): void {
    // R7 : le SMS « Préviens ton négoce » nomme l'adresse Mobiiz qui envoie la demande.
    this.demandes.brancherAdresseEnvoi(async (companyId) => (await this.adresses.expediteur(companyId))?.from.match(/<([^>]+)>/)?.[1] ?? null);
    this.priceRequests.brancherComplement((requestId, recipientId) => this.demandes.complement(requestId, recipientId), () => this.demandes.apercuComplement());
    this.abonnement.brancherOffert((companyId) => this.droits.offertPour(companyId));
    this.meter.brancherLimiteGratuite((companyId) => this.droits.limiteGratuite(companyId));
    this.commande.brancherVolume((c) => this.regroupements.volume(c));
    // Business model final (25 octobre 2026) : veille, observatoire, vérification des négoces, mode des regroupements.
    this.demandes.brancherApresEnvoi((companyId, requestId) => this.negocie.mettreEnVeille(companyId, requestId));
    this.demandes.brancherObservatoire(this.observatoire);
    this.espace.brancherVerification((i) => this.verification.verifier(i));
    this.regroupements.brancherMode(() => this.negocie.mode());
    // Achat groupé par métier (27 octobre 2026, 2e message) : en mode automatique, plus d'essai (gratuit sans limite de temps).
    const modeAuto = async () => (await this.negocie.mode()) === "automatique";
    this.droits.brancherModeAuto(modeAuto);
    this.abonnement.brancherSansEssai(modeAuto);
  }
}
