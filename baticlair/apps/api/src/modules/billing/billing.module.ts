import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { CONFIG } from "../../platform/tokens.js";
import { TenancyModule } from "../tenancy/index.js";
import { BillingService } from "./application/billing.service.js";
import { BillingController } from "./http/billing.controller.js";

@Module({
  imports: [TenancyModule],
  controllers: [BillingController],
  providers: [
    {
      provide: BillingService,
      useFactory: (p: PrismaService, config: AppConfig) => new BillingService(p, config.billing),
      inject: [PrismaService, CONFIG],
    },
  ],
  exports: [BillingService],
})
export class BillingModule {}
