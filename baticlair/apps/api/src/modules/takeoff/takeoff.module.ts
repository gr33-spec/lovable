import { FILE_REPRISE } from "../../platform/reprise/reprise.module.js";
import type { FileReprise } from "../../platform/reprise/file-reprise.js";
import { waitUntil } from "@vercel/functions";
import type { Alerter } from "../../platform/alerts/alerter.js";
import { Inject, Module, type OnModuleInit } from "@nestjs/common";
import type { TenantContext } from "../tenancy/index.js";
import { communeOf, DEFAULT_EXTRACTION_POLICY, loadReferential, NEW_PROJECT_NAME, ruleValidatedBy, siteNameFromQuote } from "@baticlair/domain";
import type { Prisma } from "../../generated/prisma/client.js";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { AppLogger } from "../../platform/logging/logger.js";
import { CONFIG, LOGGER, ALERTER, PUSH_SENDER } from "../../platform/tokens.js";
import type { PushSender } from "../../platform/push/push.port.js";
import { AiUsageModule, AiUsageRecorder, AnalysisMeter } from "../ai-usage/index.js";
import { DOCUMENT_REPOSITORY, DocumentAiInput, DocumentsModule, type DocumentRepository } from "../documents/index.js";
import { CompanyMemory, CorrectionJournal, HabitudesService, LearningModule } from "../learning/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { TAKEOFF_REPOSITORY, type TakeoffRepository } from "./application/takeoff.repository.js";
import { manualKey, TakeoffService } from "./application/takeoff.service.js";
import { TakeoffController } from "./http/takeoff.controller.js";
import { FICHE_RELECTEUR, type FicheRelecteur } from "./application/fiche-relecture.js";
import { IaFicheRelecteur } from "./infrastructure/ia-fiche-relecteur.js";
import { fabriqueIa } from "../../platform/ai/fabrique-ia.js";
import { FakeFicheRelecteur } from "./infrastructure/fake-fiche-relecteur.js";
import { LECTURE_READER, type LectureReader } from "./application/lecture-reader.js";
import { IaLectureReader } from "./infrastructure/ia-lecture-reader.js";
import { FakeLectureReader } from "./infrastructure/fake-lecture-reader.js";
import { LISTE_READER, type ListeReader } from "./application/liste-reader.js";
import { IaListeReader } from "./infrastructure/ia-liste-reader.js";
import { FakeListeReader } from "./infrastructure/fake-liste-reader.js";
import { PrismaTakeoffRepository } from "./infrastructure/prisma-takeoff.repository.js";

@Module({
  imports: [TenancyModule, DocumentsModule, AiUsageModule, LearningModule],
  controllers: [TakeoffController],
  providers: [
    { provide: TAKEOFF_REPOSITORY, useFactory: (p: PrismaService) => new PrismaTakeoffRepository(p), inject: [PrismaService] },
    {
      // §51.5 : la lecture du devis par le modèle le plus capable, en un appel ; simulée (lectures enregistrées) en test.
      provide: LECTURE_READER,
      useFactory: (config: AppConfig): LectureReader | null => {
        const ia = fabriqueIa(config);
        return ia ? new IaLectureReader(ia, config.ai.extractionModel, config.ai.effort, config.ai.quantitatifModel) : config.ai.provider === "fake" ? new FakeLectureReader() : null;
      },
      inject: [CONFIG],
    },
    {
      // « J'ai déjà ma liste » : la lecture d'image ou de PDF d'une liste déjà comptée, sans calcul ; même client que les devis.
      provide: LISTE_READER,
      useFactory: (config: AppConfig): ListeReader | null => {
        const ia = fabriqueIa(config);
        return ia ? new IaListeReader(ia, config.ai.extractionModel, config.ai.effort) : config.ai.provider === "fake" ? new FakeListeReader() : null;
      },
      inject: [CONFIG],
    },
    {
      // §51.2 : la relecture d'une réponse « Autre », par le modèle de la lecture (le plus capable).
      provide: FICHE_RELECTEUR,
      useFactory: (config: AppConfig): FicheRelecteur | null => {
        const ia = fabriqueIa(config);
        return ia ? new IaFicheRelecteur(ia, config.ai.extractionModel) : config.ai.provider === "fake" ? new FakeFicheRelecteur() : null;
      },
      inject: [CONFIG],
    },
    {
      provide: TakeoffService,
      useFactory: (
        repo: TakeoffRepository,
        docs: DocumentRepository,
        meter: AnalysisMeter,
        recorder: AiUsageRecorder,
        aiInput: DocumentAiInput,
        journal: CorrectionJournal,
        memory: CompanyMemory,
        logger: AppLogger,
        config: AppConfig,
        prisma: PrismaService,
        alerter: Alerter,
        push: PushSender,
        relecteur: FicheRelecteur | null,
        lecteur: LectureReader | null,
        listeur: ListeReader | null,
        habitudes: HabitudesService,
        reprise: FileReprise,
      ) =>
        new TakeoffService(
          repo,
          docs,
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
            ...(relecteur ? { relecteur } : {}),
            ...(lecteur ? { lecteur } : {}),
            ...(listeur ? { listeur } : {}),
            habitudes,
            companyName: async (tenant) => (await prisma.company.findUnique({ where: { id: tenant.companyId }, select: { name: true } }))?.name ?? null,
            onStats: (stats) => logger.info({ reading: stats }, "takeoff: lecture du devis"),
            // §48 : « je te préviens quand c'est prêt » : une notification sur chaque appareil abonné de la personne qui
            // a lancé la lecture ou le calcul (application fermée comprise) ; un abonnement disparu est oublié.
            onReady: async (tenant, ready) => {
              const devices = await prisma.pushSubscription.findMany({ where: { userId: tenant.userId } });
              const message =
                ready.step === "questions"
                  ? { title: "Ton devis est lu", body: "J'ai quelques questions pour toi avant de calculer." }
                  : { title: "Ta liste est prête", body: "Les matériaux sont calculés : il te reste à vérifier les lignes orange." };
              for (const d of devices) {
                const sent = await push.send(d, { ...message, url: `/chantiers/${ready.projectId}`, tag: `chantier-${ready.projectId}` });
                if (sent === "gone") await prisma.pushSubscription.deleteMany({ where: { endpoint: d.endpoint } });
              }
            },
            // Sur Vercel, la lecture d'un gros devis continue après la réponse (sinon la fonction s'arrête).
            keepAlive: (work) => waitUntil(work),
            answerWithinMs: config.ai.answerWithinMs,
            onReadingFailed: (reason) => alerter.alert("ai_reading_failed", `raison : ${reason}.`),
            // Revue du 26 octobre 2026 : une panne passagère de l'IA repart seule (file de reprise, 2 nouveaux essais).
            onEchecPassager: (tenant, documentId, reason) => {
              void reprise.planifier({ sorte: "lecture_ia", cle: `lecture_ia:${documentId}`, charge: { tenant, documentId }, erreur: reason, companyId: tenant.companyId }).catch(() => undefined);
            },
            isValidator: async (tenant) => {
              if (config.referentialValidators.length === 0) return false;
              const user = await prisma.user.findUnique({ where: { id: tenant.userId }, select: { email: true } });
              return !!user && config.referentialValidators.includes(user.email.toLowerCase());
            },
            // §48 : le chantier né du dépôt prend le nom lu dans le devis ; l'adresse et le client remplissent les vides.
            nameProject: async (tenant, projectId, read) => {
              const project = await prisma.project.findFirst({ where: { id: projectId, companyId: tenant.companyId }, select: { name: true, address: true, clientName: true } });
              if (!project) return;
              // Le texte lu est déjà anonymisé : d'une adresse lue, il ne reste que la commune.
              const lue = read.address ? read.address.replace(/\[(?:adresse retirée|client)\],?\s*/g, "").trim() || null : null;
              const address = project.address ?? lue?.slice(0, 300) ?? null;
              // RGPD (Greg, 24 octobre 2026 ; RÈGLE CHANGÉE §48, avant : « Chantier Dupont ») : le chantier prend le nom de sa
              // commune, jamais celui du client lu dans le devis, et le nom du client n'est plus recopié.
              const name = project.name === NEW_PROJECT_NAME ? siteNameFromQuote({ client: null, commune: communeOf(address) }) : null;
              const data = {
                ...(name ? { name } : {}),
                ...(!project.address && lue ? { address: lue.slice(0, 300) } : {}),
              };
              if (Object.keys(data).length > 0) await prisma.project.updateMany({ where: { id: projectId, companyId: tenant.companyId }, data });
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
            // Le chantier fictif du mode démo : la lecture simulée déterministe, jamais un appel au modèle.
            lecteurDemo: async (tenant, projectId) => {
              const project = await prisma.project.findFirst({ where: { id: projectId, companyId: tenant.companyId }, select: { demo: true } });
              return project?.demo === true ? new FakeLectureReader() : null;
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
      inject: [TAKEOFF_REPOSITORY, DOCUMENT_REPOSITORY, AnalysisMeter, AiUsageRecorder, DocumentAiInput, CorrectionJournal, CompanyMemory, LOGGER, CONFIG, PrismaService, ALERTER, PUSH_SENDER, FICHE_RELECTEUR, LECTURE_READER, LISTE_READER, HabitudesService, FILE_REPRISE],
    },
  ],
  exports: [TakeoffService],
})
export class TakeoffModule implements OnModuleInit {
  constructor(
    @Inject(FILE_REPRISE) private readonly reprise: FileReprise,
    @Inject(TakeoffService) private readonly takeoff: TakeoffService,
  ) {}

  /** Revue du 26 octobre 2026 : la file de reprise sait relancer une lecture IA (même artisan, même document). */
  onModuleInit(): void {
    this.reprise.brancher("lecture_ia", async (charge) => {
      const { tenant, documentId } = charge as { tenant: TenantContext; documentId: string };
      await this.takeoff.extract(tenant, documentId);
    });
  }
}
