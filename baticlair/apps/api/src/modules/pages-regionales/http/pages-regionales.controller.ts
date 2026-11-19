import { Body, Controller, Get, HttpCode, Inject, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CurrentUser, Public, type AuthenticatedUser } from "../../identity/index.js";
import { PilotageService } from "../../pilotage/index.js";
import { METIERS_EN_ATTENTE, PagesRegionalesService } from "../application/pages-regionales.service.js";

const regroupementsQuery = z.object({
  departement: z.string().trim().min(2).max(3),
  lots: z.string().trim().max(120).optional(),
});
const listeAttenteBody = z.object({
  email: z.string().trim().email().max(200),
  metier: z.string().refine((m) => METIERS_EN_ATTENTE.includes(m), { message: "Métier inconnu ou déjà ouvert." }),
  departement: z.string().trim().max(3).nullable().optional(),
  source: z.string().trim().max(60).nullable().optional(),
});

/** Les pages régionales (Greg, 19 novembre 2026) : la carte et la liste d'attente, sans compte. */
@Controller("v1/public")
export class PagesRegionalesPublicController {
  constructor(@Inject(PagesRegionalesService) private readonly pages: PagesRegionalesService) {}

  @Public()
  @Throttle({ default: HOURLY(600) })
  @Get("regroupements")
  regroupements(@Query(new ZodPipe(regroupementsQuery)) q: z.infer<typeof regroupementsQuery>) {
    return this.pages.regroupements(q.departement, (q.lots ?? "").split(",").filter(Boolean));
  }

  @Public()
  @Throttle({ default: HOURLY(20) })
  @Post("liste-attente")
  @HttpCode(204)
  async listeAttente(@Body(new ZodPipe(listeAttenteBody)) b: z.infer<typeof listeAttenteBody>) {
    await this.pages.rejoindreListeAttente({ email: b.email, metier: b.metier, departement: b.departement ?? null, source: b.source ?? null });
  }
}

/** L'espace admin : la liste d'attente par métier et par département (double authentification, consultation au journal). */
@Controller("v1/admin")
export class PagesRegionalesAdminController {
  constructor(
    @Inject(PagesRegionalesService) private readonly pages: PagesRegionalesService,
    @Inject(PilotageService) private readonly pilotage: PilotageService,
  ) {}

  @Get("liste-attente")
  async liste(@CurrentUser() user: AuthenticatedUser) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "vue_liste_attente");
    return this.pages.listeAttente();
  }
}
