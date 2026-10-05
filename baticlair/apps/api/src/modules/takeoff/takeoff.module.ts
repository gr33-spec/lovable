import { waitUntil } from "@vercel/functions";
import type { Alerter } from "../../platform/alerts/alerter.js";
import { Module } from "@nestjs/common";
import { DEFAULT_EXTRACTION_POLICY, loadReferential, ruleValidatedBy } from "@baticlair/domain";
import type { Prisma } from "../../generated/prisma/client.js";
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
import { manualKey, TakeoffService } from "./application/takeoff.service.js";
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
            // Le modèle de lecture choisi (Opus par défaut) sert aussi à l'estimation du coût avant lecture.
            policy: { ...DEFAULT_EXTRACTION_POLICY, textModel: config.ai.extractionModel, visionModel: config.ai.extractionModel },
            doubleReading: config.ai.doubleReading && config.ai.provider === "anthropic",
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
            // §47.4 / §47.5 : une entreprise ne compte qu'une fois par règle, sous sa preuve la plus forte (bon de commande
            // > écran) ; validée par 3 écrans, 2 bons de commande, ou 1 bon + 1 autre entreprise (`ruleValidatedBy`).
            rules: {
              validated: async (keys) => {
                const rows = await prisma.ruleConfirmation.findMany({ where: { ruleKey: { in: [...keys] } }, select: { ruleKey: true, source: true } });
                const counts = new Map<string, { screen: number; order: number }>();
                for (const r of rows) {
                  const c = counts.get(r.ruleKey) ?? { screen: 0, order: 0 };
                  if (r.source === "order") c.order += 1;
                  else c.screen += 1;
                  counts.set(r.ruleKey, c);
                }
                return new Set([...counts].filter(([, c]) => ruleValidatedBy(c)).map(([k]) => k));
              },
              confirm: async (tenant, keys, source = "screen") => {
                for (const ruleKey of keys) {
                  await prisma.ruleConfirmation.upsert({
                    where: { companyId_ruleKey: { companyId: tenant.companyId, ruleKey } },
                    create: { companyId: tenant.companyId, ruleKey, userId: tenant.userId, source },
                    // Un bon de commande renforce une confirmation d'écran ; l'inverse ne l'affaiblit jamais.
                    update: source === "order" ? { source } : {},
                  });
                }
              },
            },
            // §45.8 : la mémoire des consommables de chaque entreprise.
            consumables: {
              hidden: async (tenant) =>
                new Set((await prisma.consumableHabit.findMany({ where: { companyId: tenant.companyId, refusedInARow: { gte: 3 } }, select: { key: true } })).map((h) => h.key)),
              manual: async (tenant) =>
                (await prisma.consumableHabit.findMany({ where: { companyId: tenant.companyId, key: { startsWith: "manual:" }, refusedInARow: { lt: 3 } }, orderBy: { updatedAt: "desc" } }))
                  .filter((h) => h.manualProjects.length >= 2)
                  .map((h) => ({ key: h.key, designation: h.designation, quantity: h.lastQuantity, unit: h.lastUnit })),
              answered: async (tenant, e) => {
                const current = await prisma.consumableHabit.findUnique({ where: { companyId_key: { companyId: tenant.companyId, key: e.key } } });
                // Refusé « trois fois d'affilée » : trois chantiers, pas trois taps sur le même.
                const refused = e.accepted ? 0 : current?.lastRefusedProject === e.projectId ? current.refusedInARow : (current?.refusedInARow ?? 0) + 1;
                await prisma.consumableHabit.upsert({
                  where: { companyId_key: { companyId: tenant.companyId, key: e.key } },
                  create: { companyId: tenant.companyId, key: e.key, designation: e.designation, refusedInARow: refused, lastRefusedProject: e.accepted ? null : e.projectId },
                  update: { refusedInARow: refused, lastRefusedProject: e.accepted ? null : e.projectId },
                });
              },
              addedByHand: async (tenant, e) => {
                const key = manualKey(e.designation);
                const current = await prisma.consumableHabit.findUnique({ where: { companyId_key: { companyId: tenant.companyId, key } } });
                const projects = [...new Set([...(current?.manualProjects ?? []), e.projectId])];
                await prisma.consumableHabit.upsert({
                  where: { companyId_key: { companyId: tenant.companyId, key } },
                  create: { companyId: tenant.companyId, key, designation: e.designation, manualProjects: projects, lastQuantity: e.quantity, lastUnit: e.unit },
                  update: { designation: e.designation, manualProjects: projects, lastQuantity: e.quantity, lastUnit: e.unit, refusedInARow: 0 },
                });
              },
            },
            projectNotes: async (tenant, projectId) => {
              const project = await prisma.project.findFirst({ where: { id: projectId, companyId: tenant.companyId }, select: { siteNotes: true } });
              return project?.siteNotes ?? null;
            },
            // Version figée par chantier : l'instantané est écrit à la première rencontre d'une version, relu ensuite
            // et revalidé par le schéma (un instantané abîmé ne sert jamais : on retombe sur le référentiel du jour).
            referentials: {
              ensure: async (ref) => {
                await prisma.referentialSnapshot.upsert({ where: { version: ref.version }, create: { trade: ref.trade, version: ref.version, data: ref as unknown as Prisma.InputJsonValue }, update: {} });
              },
              load: async (version) => {
                const row = await prisma.referentialSnapshot.findUnique({ where: { version } });
                if (!row) return null;
                try {
                  return loadReferential(row.data);
                } catch (error) {
                  logger.error({ err: error, version }, "takeoff: instantané de référentiel invalide, référentiel du jour utilisé");
                  return null;
                }
              },
            },
          },
        ),
      inject: [TAKEOFF_REPOSITORY, DOCUMENT_REPOSITORY, TAKEOFF_EXTRACTOR, AnalysisMeter, AiUsageRecorder, DocumentAiInput, CorrectionJournal, CompanyMemory, LOGGER, CONFIG, PrismaService, ALERTER],
    },
  ],
  exports: [TakeoffService],
})
export class TakeoffModule {}
