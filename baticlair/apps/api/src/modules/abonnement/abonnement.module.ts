import type { Alerter } from "../../platform/alerts/alerter.js";
import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../platform/email/email.port.js";
import { ALERTER, CONFIG, EMAIL_SENDER } from "../../platform/tokens.js";
import { TenancyModule } from "../tenancy/index.js";
import { AbonnementService } from "./application/abonnement.service.js";
import { AbonnementController, AbonnementPublicController } from "./http/abonnement.controller.js";
import { HttpStripeClient } from "./infrastructure/stripe.js";

@Module({
  imports: [TenancyModule],
  controllers: [AbonnementController, AbonnementPublicController],
  providers: [
    {
      provide: AbonnementService,
      useFactory: (p: PrismaService, config: AppConfig, email: TransactionalEmailSender, alerter: Alerter) => {
        const s = new AbonnementService(p, config, email, config.abonnement.stripe ? new HttpStripeClient(config.abonnement.stripe) : null);
        s.brancherAlerte((m) => alerter.alert("paiement_refuse", m));
        return s;
      },
      inject: [PrismaService, CONFIG, EMAIL_SENDER, ALERTER],
    },
  ],
  exports: [AbonnementService],
})
export class AbonnementModule {}
