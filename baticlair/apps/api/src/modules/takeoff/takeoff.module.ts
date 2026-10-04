import { waitUntil } from "@vercel/functions";
import type { Alerter } from "../../platform/alerts/alerter.js";
import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { AppLogger } from "../../platform/logging/logger.js";
import { CONFIG, LOGGER, ALERTER } from "../../platform/tokens.js";
import { AiUsageModule, AiUsageRecorder, AnalysisMeter } from "../ai-usage/index.js";
import { DOCUMENT_REPOSITORY, DocumentAiInput, DocumentsModule, type DocumentRepository } from "../documents/index.js";
import { CompanyMemory, CorrectionJournal, LearningModule } from "../learning/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { TAKEOFF_EXTRACTOR, type TakeoffExtractor } from "./application/takeoff-extractor.js";
import { TAKEOFF_REPOSITORY, type TakeoffRepository } from "./application/takeoff.repository.js";
import { TakeoffService } from "./application/takeoff.service.js";
import { TakeoffController } from "./http/takeoff.controller.js";
import { AnthropicTakeoffExtractor } from "./infrastructure/anthropic-takeoff-extractor.js";
import { FakeTakeoffExtractor } from "./infrastructure/fake-takeoff-extractor.js";
import { PrismaTakeoffRepository } from "./infrastructure/prisma-takeoff.repository.js";

@Module({
  imports: [TenancyModule, DocumentsModule, AiUsageModule, LearningModule],
  controllers: [TakeoffController],
  providers: [
    { provide: TAKEOFF_REPOSITORY, useFactory: (p: PrismaService) => new PrismaTakeoffRepository(p), inject: [PrismaService] },
    {
      provide: TAKEOFF_EXTRACTOR,
      useFactory: (config: AppConfig): TakeoffExtractor | null => {
        switch (config.ai.provider) {
          case "anthropic":
            return new AnthropicTakeoffExtractor(config.ai.apiKey!, config.ai.extractionModel, config.ai.effort);
          case "fake":
            return new FakeTakeoffExtractor();
          case "disabled":
            return null;
        }
      },
      inject: [CONFIG],
    },
    {
      provide: TakeoffService,
      useFactory: (
        repo: TakeoffRepository,
        docs: DocumentRepository,
        extractor: TakeoffExtractor | null,
        meter: AnalysisMeter,
        recorder: AiUsageRecorder,
        aiInput: DocumentAiInput,
        journal: CorrectionJournal,
        memory: CompanyMemory,
        logger: AppLogger,
        config: AppConfig,
        prisma: PrismaService,
        alerter: Alerter,
      ) =>
        new TakeoffService(
          repo,
          docs,
          extractor,
          meter,
          recorder,
          aiInput,
          journal,
          memory,
          (error) => logger.error({ err: error }, "takeoff: coût IA non enregistré"),
          {
            maxAnalysisMicroUsd: Math.round((Number(config.aiCost.analysisMaxEur) / Number(config.aiCost.usdToEur)) * 1_000_000),
            onStats: (stats) => logger.info({ reading: stats }, "takeoff: lecture du devis"),
            // Sur Vercel, la lecture d'un gros devis continue après la réponse (sinon la fonction s'arrête).
            keepAlive: (work) => waitUntil(work),
            answerWithinMs: config.ai.answerWithinMs,
            onReadingFailed: (reason) => alerter.alert("ai_reading_failed", `raison : ${reason}.`),
            isValidator: async (tenant) => {
              if (config.referentialValidators.length === 0) return false;
              const user = await prisma.user.findUnique({ where: { id: tenant.userId }, select: { email: true } });
              return !!user && config.referentialValidators.includes(user.email.toLowerCase());
            },
            projectAddress: async (tenant, projectId) => {
              const project = await prisma.project.findFirst({ where: { id: projectId, companyId: tenant.companyId }, select: { address: true } });
              return project?.address ?? null;
            },
            projectNotes: async (tenant, projectId) => {
              const project = await prisma.project.findFirst({ where: { id: projectId, companyId: tenant.companyId }, select: { siteNotes: true } });
              return project?.siteNotes ?? null;
            },
          },
        ),
      inject: [TAKEOFF_REPOSITORY, DOCUMENT_REPOSITORY, TAKEOFF_EXTRACTOR, AnalysisMeter, AiUsageRecorder, DocumentAiInput, CorrectionJournal, CompanyMemory, LOGGER, CONFIG, PrismaService, ALERTER],
    },
  ],
  exports: [TakeoffService],
})
export class TakeoffModule {}
