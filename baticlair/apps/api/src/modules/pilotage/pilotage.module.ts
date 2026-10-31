import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../platform/email/email.port.js";
import { CONFIG, EMAIL_SENDER } from "../../platform/tokens.js";
import { AbonnementModule, AbonnementService } from "../abonnement/index.js";
import { CommandeDuMoisService, DOMAINE_DEMO, GroupeModule, JeuDemonstrationService } from "../groupe/index.js";
import { HabitudesService, LearningModule } from "../learning/index.js";
import { DemoService } from "./application/demo.service.js";
import { PilotageService } from "./application/pilotage.service.js";
import { PilotageController, PilotagePublicController } from "./http/pilotage.controller.js";

/** Le pilotage admin (24 octobre 2026) : tableau de bord, double authentification, journal des accès. */
@Module({
  imports: [AbonnementModule, LearningModule, GroupeModule],
  controllers: [PilotageController, PilotagePublicController],
  providers: [
    {
      provide: PilotageService,
      useFactory: (p: PrismaService, c: AppConfig, e: TransactionalEmailSender, abo: AbonnementService, h: HabitudesService, cmd: CommandeDuMoisService) =>
        new PilotageService(p, c, e, {
          etatAbonnement: (companyId, maintenant) => abo.etat(companyId, maintenant),
          apprentissage: () => h.admin(),
          economies: () => cmd.economieMoyenne(),
          prixFormules: async () => {
            const r = await abo.reglages();
            return { essentiel: r.prixEssentielHtCentimes, pro: r.prixProHtCentimes, annuel: r.prixAnnuelHtCentimes };
          },
          paiementSimule: c.abonnement.paiement === "simule",
          stripeDeTest: c.abonnement.paiement === "stripe" && !!c.abonnement.stripe?.secretKey.startsWith("sk_test_"),
          demoPermise: !(c.env === "production" && !c.previewOriginPattern),
        }),
      inject: [PrismaService, CONFIG, EMAIL_SENDER, AbonnementService, HabitudesService, CommandeDuMoisService],
    },
    {
      provide: DemoService,
      useFactory: (p: PrismaService, jeu: JeuDemonstrationService, cmd: CommandeDuMoisService, abo: AbonnementService) => new DemoService(p, jeu, cmd, abo, DOMAINE_DEMO),
      inject: [PrismaService, JeuDemonstrationService, CommandeDuMoisService, AbonnementService],
    },
  ],
  exports: [PilotageService],
})
export class PilotageModule {}
