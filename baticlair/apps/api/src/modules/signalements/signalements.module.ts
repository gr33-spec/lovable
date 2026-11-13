import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../platform/email/email.port.js";
import type { AppLogger } from "../../platform/logging/logger.js";
import { CONFIG, EMAIL_SENDER, LOGGER } from "../../platform/tokens.js";
import { TenancyModule } from "../tenancy/index.js";
import { SignalementsAdminController, SignalementsController, SignalementsPublicsController } from "./signalements.controller.js";
import { SignalementsService } from "./signalements.service.js";

/** SIGNALEMENT DE BUGS (Greg, 13 novembre 2026) : une table nouvelle, trois portes (compte, public, admin). */
@Module({
  imports: [TenancyModule],
  controllers: [SignalementsController, SignalementsPublicsController, SignalementsAdminController],
  providers: [{ provide: SignalementsService, useFactory: (p: PrismaService, e: TransactionalEmailSender, c: AppConfig, l: AppLogger) => new SignalementsService(p, e, c, l), inject: [PrismaService, EMAIL_SENDER, CONFIG, LOGGER] }],
})
export class SignalementsModule {}
