import { Module } from "@nestjs/common";
import { DocumentsModule } from "../documents/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { PrivacyController } from "./http/privacy.controller.js";
import { NotificationsController } from "./http/notifications.controller.js";
import { CguController } from "./http/cgu.controller.js";
import { RetentionController } from "./http/retention.controller.js";
import { EmailsController } from "./http/emails.controller.js";
import { AccountData } from "./infrastructure/account-data.js";

/** RGPD : export et suppression du compte (audit de lancement, B4). */
@Module({
  imports: [DocumentsModule, TenancyModule],
  controllers: [PrivacyController, RetentionController, NotificationsController, CguController, EmailsController],
  providers: [{ provide: AccountData, useFactory: (p: PrismaService) => new AccountData(p), inject: [PrismaService] }],
})
export class PrivacyModule {}
