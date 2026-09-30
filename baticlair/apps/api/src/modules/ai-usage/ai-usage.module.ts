import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { CONFIG } from "../../platform/tokens.js";
import { TenancyModule } from "../tenancy/index.js";
import { AiUsageRecorder } from "./application/ai-usage-recorder.js";
import { AI_USAGE_REPOSITORY, type AiUsageRepository } from "./application/ai-usage.repository.js";
import { AiUsageService } from "./application/ai-usage.service.js";
import { AiUsageController } from "./http/ai-usage.controller.js";
import { PrismaAiUsageRepository } from "./infrastructure/prisma-ai-usage.repository.js";

@Module({
  imports: [TenancyModule],
  controllers: [AiUsageController],
  providers: [
    { provide: AI_USAGE_REPOSITORY, useFactory: (p: PrismaService) => new PrismaAiUsageRepository(p), inject: [PrismaService] },
    { provide: AiUsageRecorder, useFactory: (r: AiUsageRepository) => new AiUsageRecorder(r), inject: [AI_USAGE_REPOSITORY] },
    {
      provide: AiUsageService,
      useFactory: (r: AiUsageRepository, c: AppConfig) => new AiUsageService(r, c.aiCost),
      inject: [AI_USAGE_REPOSITORY, CONFIG],
    },
  ],
  exports: [AiUsageRecorder],
})
export class AiUsageModule {}
