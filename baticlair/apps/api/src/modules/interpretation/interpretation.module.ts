import { Module } from "@nestjs/common";
import { ASSISTANT_IA_PROMPT, INTERPRETATION_PROMPT } from "@baticlair/domain";
import { fabriqueIa } from "../../platform/ai/fabrique-ia.js";
import { estRequeteDemo } from "../../platform/logging/request-context.js";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { AppLogger } from "../../platform/logging/logger.js";
import { signalerException } from "../../platform/supervision/exceptions.js";
import { CONFIG, LOGGER } from "../../platform/tokens.js";
import { AiUsageModule, AiUsageRecorder } from "../ai-usage/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { InterpretationService, type BudgetInterpretation } from "./application/interpretation.service.js";
import { AssistantIaService, TACHE_ASSISTANT } from "./application/assistant-ia.service.js";
import { InterpretationController } from "./http/interpretation.controller.js";
import { FakeDecoupeur } from "./infrastructure/fake-decoupeur.js";
import { IaDecoupeur } from "./infrastructure/ia-decoupeur.js";
import { FakeInterpreteur } from "./infrastructure/fake-interpreteur.js";
import { IaInterpreteur } from "./infrastructure/ia-interpreteur.js";

export const TACHE_INTERPRETATION = "interpretation_reponses";
const CREDIT_EPUISE = /credit|balance|billing|quota|402/i;

/**
 * Le budget, compté dans le journal des appels IA (`ai_execution`, tâche `interpretation_reponses`) : nombre d'appels et
 * coût cumulés, toutes entreprises, depuis le début. Un crédit épuisé chez le fournisseur coupe l'interprète jusqu'au
 * redémarrage et le signale à l'admin (file d'exceptions) ; rien n'est jamais acheté ni rechargé.
 */
export function budgetInterpretation(
  prisma: PrismaService,
  recorder: AiUsageRecorder,
  plafond: { microUsd: number; appels: number },
  /** La tâche comptée (son propre plafond), son prompt et le nom dit à l'admin : l'interprète par défaut. */
  tache: { nom: string; prompt: { id: string; version: number }; modele: string; cle: string; titre: string } = {
    nom: TACHE_INTERPRETATION,
    prompt: INTERPRETATION_PROMPT,
    modele: "claude-haiku-4-5",
    cle: "credit-ia-interprete",
    titre: "Crédit IA indisponible : l'interprète des réponses libres est coupé",
  },
): BudgetInterpretation {
  let creditEpuise = false;
  return {
    async autorise() {
      // Accès démo (Greg, 7 novembre 2026) : un visiteur fictif ne consomme jamais d'IA ; le code seul répond.
      if (creditEpuise || estRequeteDemo()) return false;
      const agg = await prisma.aiExecution.aggregate({ where: { task: tache.nom }, _count: { _all: true }, _sum: { costMicroUsd: true } });
      return agg._count._all < plafond.appels && Number(agg._sum.costMicroUsd ?? 0) < plafond.microUsd;
    },
    async enregistrer({ companyId, userId, attempt, provider }) {
      const statut = !attempt ? "provider_error" : attempt.status === "success" ? "success" : attempt.status === "timeout" ? "timeout" : attempt.status === "invalid_output" ? "invalid_output" : attempt.status === "refused" ? "refused" : "provider_error";
      await recorder.record({
        companyId,
        userId,
        task: tache.nom,
        route: "text",
        provider,
        model: attempt?.model ?? tache.modele,
        promptId: tache.prompt.id,
        promptVersion: tache.prompt.version,
        attempt: 1,
        usage: attempt?.usage ?? { inputTokens: 0, outputTokens: 0 },
        status: statut,
        errorCode: attempt?.errorCode ?? (attempt ? null : "exception"),
        durationMs: attempt?.durationMs ?? 0,
      });
      if (attempt && attempt.status !== "success" && CREDIT_EPUISE.test(attempt.errorCode ?? "")) {
        creditEpuise = true;
        await signalerException(prisma, { type: "autre", cle: tache.cle, titre: tache.titre, detail: `Erreur du fournisseur : ${attempt.errorCode}. Le code seul répond ; aucun achat ni rechargement sans l'accord de Greg.` });
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
        return new InterpretationService(
          interpreteur,
          (e) => logger.info({ interpretation: e }, "interprétation IA d'une réponse libre"),
          budgetInterpretation(prisma, recorder, config.ai.interpretePlafond),
          // Lot 6 : une réponse du modèle refusée par la validation du serveur (le texte de l'artisan n'est pas recopié).
          (e) => signalerException(prisma, { type: "resultat_ia_incoherent", cle: `interpretation:${e.companyId}:${new Date().toISOString().slice(0, 13)}`, titre: "Interprète IA : réponse refusée par la validation du serveur", detail: `${e.refusees} valeur(s) refusée(s) sur ${e.questions} question(s) ; la question est reposée à l'artisan.`, companyId: e.companyId }),
        );
      },
      inject: [CONFIG, LOGGER, PrismaService, AiUsageRecorder],
    },
    {
      // L'assistant connecté à l'IA (Greg, 12 novembre 2026) : éteint par défaut (`ASSISTANT_IA`), plafonné, journalisé.
      provide: AssistantIaService,
      useFactory: (config: AppConfig, logger: AppLogger, prisma: PrismaService, recorder: AiUsageRecorder) => {
        if (!config.ai.assistant) return new AssistantIaService(null);
        const ia = fabriqueIa(config);
        const decoupeur = ia ? new IaDecoupeur(ia, config.ai.assistantModel) : config.ai.provider === "fake" ? new FakeDecoupeur() : null;
        return new AssistantIaService(
          decoupeur,
          (e) => logger.info({ assistantIa: e }, "assistant IA : une description découpée"),
          budgetInterpretation(prisma, recorder, config.ai.assistantPlafond, {
            nom: TACHE_ASSISTANT,
            prompt: ASSISTANT_IA_PROMPT,
            modele: config.ai.assistantModel,
            cle: "credit-ia-assistant",
            titre: "Crédit IA indisponible : l'assistant connecté à l'IA est coupé",
          }),
        );
      },
      inject: [CONFIG, LOGGER, PrismaService, AiUsageRecorder],
    },
  ],
})
export class InterpretationModule {}
