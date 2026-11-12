import { Body, Controller, HttpCode, Inject, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { QuestionNumerotee } from "@baticlair/domain";
import { z } from "zod";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { AssistantIaService } from "../application/assistant-ia.service.js";
import { InterpretationService } from "../application/interpretation.service.js";

const question = z.object({
  numero: z.number().int().min(1).max(50),
  cle: z.string().min(1).max(200),
  texte: z.string().min(1).max(400),
  options: z.array(z.object({ label: z.string().max(120), value: z.string().max(120) })).max(20),
  unite: z.string().max(20).nullable(),
  libre: z.enum(["number", "text", "written"]).optional(),
  numerique: z.boolean().optional(),
});
const body = z.object({ questions: z.array(question).min(1).max(30), texte: z.string().max(2000) });
/** La conversation en cours de l'assistant : ce que l'artisan a dit et les questions posées, dans l'ordre ; le dernier est de l'artisan. */
const description = z.object({ echanges: z.array(z.object({ de: z.enum(["artisan", "assistant"]), texte: z.string().min(1).max(2000) })).min(1).max(20) }).refine((d) => d.echanges[d.echanges.length - 1]!.de === "artisan", { message: "Le dernier message est celui de l'artisan." });

/**
 * LOT 7 : `POST /v1/assistant/interpretation`. La réponse libre de l'artisan rattachée à ses questions : le code d'abord,
 * l'IA ensuite seulement si `INTERPRETE_IA=on` ; rien n'est enregistré ici (le serveur revalide chaque réponse au calcul).
 */
@Controller("v1/assistant")
@UseGuards(TenantGuard)
export class InterpretationController {
  constructor(
    @Inject(InterpretationService) private readonly service: InterpretationService,
    @Inject(AssistantIaService) private readonly assistant: AssistantIaService,
  ) {}

  /**
   * `POST /v1/assistant/description` (Greg, 12 novembre 2026 : « Ici, je veux une IA connectée ») : ce que l'artisan dit ou
   * écrit, découpé en articles, avec les questions du comptoir. Éteint (`ASSISTANT_IA=off`) : le code seul lit la phrase.
   */
  @Throttle({ default: HOURLY(120) })
  @Post("description")
  @HttpCode(200)
  decrire(@Tenant() tenant: TenantContext, @Body(new ZodPipe(description)) b: z.infer<typeof description>) {
    return this.assistant.decrire(b.echanges, { companyId: tenant.companyId, userId: tenant.userId ?? null });
  }

  @Throttle({ default: HOURLY(120) })
  @Post("interpretation")
  @HttpCode(200)
  interpreter(@Tenant() tenant: TenantContext, @Body(new ZodPipe(body)) b: z.infer<typeof body>) {
    return this.service.interpreter(b.questions as QuestionNumerotee[], b.texte, { companyId: tenant.companyId, userId: tenant.userId ?? null });
  }
}
