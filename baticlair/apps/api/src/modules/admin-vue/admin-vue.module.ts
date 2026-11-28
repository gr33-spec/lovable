import { Module } from "@nestjs/common";
import { fabriqueIa } from "../../platform/ai/fabrique-ia.js";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { CONFIG } from "../../platform/tokens.js";
import { AiUsageModule, AiUsageRecorder } from "../ai-usage/index.js";
import { budgetInterpretation } from "../interpretation/index.js";
import { PilotageModule } from "../pilotage/index.js";
import { AdminVueService } from "./application/admin-vue.service.js";
import { QUESTION_ADMIN_PROMPT, QuestionAdminService, TACHE_QUESTION_ADMIN } from "./application/question-admin.service.js";
import { AdminVueController, AdminVuePublicController } from "./http/admin-vue.controller.js";

/** L'espace admin, vue globale (Greg, 14 novembre 2026) : accueil, listes, fiches, question, adresse d'alerte, codes promo. */
@Module({
  imports: [PilotageModule, AiUsageModule],
  controllers: [AdminVueController, AdminVuePublicController],
  providers: [
    { provide: AdminVueService, useFactory: (p: PrismaService) => new AdminVueService(p), inject: [PrismaService] },
    {
      provide: QuestionAdminService,
      useFactory: (vue: AdminVueService, p: PrismaService, config: AppConfig, recorder: AiUsageRecorder) => {
        // Le même interrupteur que l'assistant des artisans (`ASSISTANT_IA`) : éteint, le code répond seul.
        const ia = config.ai.assistant ? fabriqueIa(config) : null;
        const lecteur = ia ? ia({ model: config.ai.assistantModel, effort: "low" }) : null;
        const budget = lecteur
          ? budgetInterpretation(p, recorder, { appels: 200, microUsd: 1_000_000 }, { nom: TACHE_QUESTION_ADMIN, prompt: QUESTION_ADMIN_PROMPT, modele: config.ai.assistantModel, cle: "credit-ia-admin", titre: "Crédit IA indisponible : « Pose ta question » répond sans l'IA" }, { budgetEur: config.groupe.negocie.budgetIaJourEur, usdToEur: Number(config.aiCost.usdToEur) })
          : null;
        return new QuestionAdminService(vue, p, lecteur, budget);
      },
      inject: [AdminVueService, PrismaService, CONFIG, AiUsageRecorder],
    },
  ],
})
export class AdminVueModule {}
