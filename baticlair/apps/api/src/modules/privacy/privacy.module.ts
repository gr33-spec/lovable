import { Module } from "@nestjs/common";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { PrivacyController } from "./http/privacy.controller.js";
import { NotificationsController } from "./http/notifications.controller.js";
import { RetentionController } from "./http/retention.controller.js";
import { AccountData } from "./infrastructure/account-data.js";

/** RGPD : export et suppression du compte (audit de lancement, B4). */
@Module({
  controllers: [PrivacyController, RetentionController, NotificationsController],
  providers: [{ provide: AccountData, useFactory: (p: PrismaService) => new AccountData(p), inject: [PrismaService] }],
})
export class PrivacyModule {}
