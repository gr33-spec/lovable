import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../platform/email/email.port.js";
import { CONFIG, EMAIL_SENDER } from "../../platform/tokens.js";
import { PilotageModule } from "../pilotage/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { CommunauteService } from "./application/communaute.service.js";
import { CommunauteAdminController, CommunauteController, CommunautePublicController } from "./http/communaute.controller.js";

/** CHANTIER 05 (Greg, 28 novembre 2026) : liste d'attente par métier et département, annonces d'ouverture, invitations. */
@Module({
  imports: [PilotageModule, TenancyModule],
  controllers: [CommunauteController, CommunautePublicController, CommunauteAdminController],
  providers: [{ provide: CommunauteService, useFactory: (p: PrismaService, e: TransactionalEmailSender, c: AppConfig) => new CommunauteService(p, e, c.webAppUrl), inject: [PrismaService, EMAIL_SENDER, CONFIG] }],
  exports: [CommunauteService],
})
export class CommunauteModule {}
