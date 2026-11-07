import { Module } from "@nestjs/common";
import { INTERPRETATION_PROMPT } from "@baticlair/domain";
import { fabriqueIa } from "../../platform/ai/fabrique-ia.js";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { AppLogger } from "../../platform/logging/logger.js";
import { signalerException } from "../../platform/supervision/exceptions.js";
import { CONFIG, LOGGER } from "../../platform/tokens.js";
import { AiUsageModule, AiUsageRecorder } from "../ai-usage/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { InterpretationService, type BudgetInterpretation } from "./application/interpretation.service.js";
import { InterpretationController } from "./http/interpretation.controller.js";
import { FakeInterpreteur } from "./infrastructure/fake-interpreteur.js";
import { IaInterpreteur } from "./infrastructure/ia-interpreteur.js";

export const TACHE_INTERPRETATION = "interpretation_reponses";
const CREDIT_EPUISE = /credit|balance|billing|quota|402/i;

/**
 * Le budget, compté dans le journal des appels IA (`ai_execution`, tâche `interpretation_reponses`) : nombre d'appels et
 * coût cumulés, toutes entreprises, depuis le début. Un crédit épuisé chez le fournisseur coupe l'interprète jusqu'au
 * redémarrage et le signale à l'admin (file d'exceptions) ; rien n'est jamais acheté ni rechargé.
 */
export function budgetInterpretation(prisma: PrismaService, recorder: AiUsageRecorder, plafond: { microUsd: number; appels: number }): BudgetInterpretation {
  let creditEpuise = false;
  return {
    async autorise() {
      if (creditEpuise) return false;
      const agg = await prisma.aiExecution.aggregate({ where: { task: TACHE_INTERPRETATION }, _count: { _all: true }, _sum: { costMicroUsd: true } });
      return agg._count._all < plafond.appels && Number(agg._sum.costMicroUsd ?? 0) < plafond.microUsd;
    },
    async enregistrer({ companyId, userId, attempt, provider }) {
      const statut = !attempt ? "provider_error" : attempt.status === "success" ? "success" : attempt.status === "timeout" ? "timeout" : attempt.status === "invalid_output" ? "invalid_output" : attempt.status === "refused" ? "refused" : "provider_error";
      await recorder.record({
        companyId,
        userId,
        task: TACHE_INTERPRETATION,
        route: "text",
        provider,
        model: attempt?.model ?? "claude-haiku-4-5",
        promptId: INTERPRETATION_PROMPT.id,
        promptVersion: INTERPRETATION_PROMPT.version,
        attempt: 1,
        usage: attempt?.usage ?? { inputTokens: 0, outputTokens: 0 },
        status: statut,
        errorCode: attempt?.errorCode ?? (attempt ? null : "exception"),
        durationMs: attempt?.durationMs ?? 0,
      });
      if (attempt && attempt.status !== "success" && CREDIT_EPUISE.test(attempt.errorCode ?? "")) {
        creditEpuise = true;
        await signalerException(prisma, { type: "autre", cle: "credit-ia-interprete", titre: "Crédit IA indisponible : l'interprète des réponses libres est coupé", detail: `Erreur du fournisseur : ${attempt.errorCode}. Le code seul répond ; aucun achat ni rechargement sans l'accord de Greg.` });
      }
    },
  };
}

/** Lot 7 : l'interprétation IA des réponses libres, éteinte par défaut (`INTERPRETE_IA`), plafonnée et journalisée. */
@Module({
  imports: [TenancyModule, AiUsageModule],
  controllers: [InterpretationController],
  providers: [
    {
      provide: InterpretationService,
      useFactory: (config: AppConfig, logger: AppLogger, prisma: PrismaService, recorder: AiUsageRecorder) => {
        if (!config.ai.interprete) return new InterpretationService(null);
        const ia = fabriqueIa(config);
        const interpreteur = ia ? new IaInterpreteur(ia, config.ai.interpreteModel) : config.ai.provider === "fake" ? new FakeInterpreteur() : null;
        return new InterpretationService(interpreteur, (e) => logger.info({ interpretation: e }, "interprétation IA d'une réponse libre"), budgetInterpretation(prisma, recorder, config.ai.interpretePlafond));
      },
      inject: [CONFIG, LOGGER, PrismaService, AiUsageRecorder],
    },
  ],
})
export class InterpretationModule {}
