import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../platform/email/email.port.js";
import { CONFIG, EMAIL_SENDER } from "../../platform/tokens.js";
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
      useFactory: (p: PrismaService, config: AppConfig, email: TransactionalEmailSender) =>
        new AbonnementService(p, config, email, config.abonnement.stripe ? new HttpStripeClient(config.abonnement.stripe) : null),
      inject: [PrismaService, CONFIG, EMAIL_SENDER],
    },
  ],
  exports: [AbonnementService],
})
export class AbonnementModule {}
