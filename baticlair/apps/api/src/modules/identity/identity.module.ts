import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../platform/email/email.port.js";
import { AUTH, CONFIG, EMAIL_SENDER } from "../../platform/tokens.js";
import { SessionGuard } from "./http/session.guard.js";
import { createAuth } from "./infrastructure/auth.js";

@Module({
  providers: [
    {
      provide: AUTH,
      useFactory: (config: AppConfig, prisma: PrismaService, email: TransactionalEmailSender) =>
        createAuth(config, prisma, email),
      inject: [CONFIG, PrismaService, EMAIL_SENDER],
    },
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
  exports: [AUTH],
})
export class IdentityModule {}
