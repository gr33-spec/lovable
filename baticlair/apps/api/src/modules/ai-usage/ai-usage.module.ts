import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { CONFIG } from "../../platform/tokens.js";
import { TenancyModule } from "../tenancy/index.js";
import { AiUsageRecorder } from "./application/ai-usage-recorder.js";
import { AnalysisMeter } from "./application/analysis-meter.js";
import { ANALYSIS_REPOSITORY, type AnalysisRepository } from "./application/analysis.repository.js";
import { AI_USAGE_REPOSITORY, type AiUsageRepository } from "./application/ai-usage.repository.js";
import { AiUsageService } from "./application/ai-usage.service.js";
import { AiUsageController } from "./http/ai-usage.controller.js";
import { PrismaAiUsageRepository } from "./infrastructure/prisma-ai-usage.repository.js";
import { PrismaAnalysisRepository } from "./infrastructure/prisma-analysis.repository.js";

@Module({
  imports: [TenancyModule],
  controllers: [AiUsageController],
  providers: [
    { provide: AI_USAGE_REPOSITORY, useFactory: (p: PrismaService) => new PrismaAiUsageRepository(p), inject: [PrismaService] },
    { provide: ANALYSIS_REPOSITORY, useFactory: (p: PrismaService) => new PrismaAnalysisRepository(p), inject: [PrismaService] },
    { provide: AnalysisMeter, useFactory: (r: AnalysisRepository) => new AnalysisMeter(r), inject: [ANALYSIS_REPOSITORY] },
    { provide: AiUsageRecorder, useFactory: (r: AiUsageRepository) => new AiUsageRecorder(r), inject: [AI_USAGE_REPOSITORY] },
    {
      provide: AiUsageService,
      useFactory: (r: AiUsageRepository, c: AppConfig) => new AiUsageService(r, c.aiCost),
      inject: [AI_USAGE_REPOSITORY, CONFIG],
    },
  ],
  exports: [AiUsageRecorder, AnalysisMeter],
})
export class AiUsageModule {}
