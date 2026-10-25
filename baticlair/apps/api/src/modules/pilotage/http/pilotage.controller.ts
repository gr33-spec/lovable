import { Body, Controller, Delete, Get, Headers, HttpCode, Inject, Param, Post, Put } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { reglagesAbonnementSchema } from "@baticlair/domain";
import { z } from "zod";
import type { AppConfig } from "../../../platform/config/config.js";
import { forbidden } from "../../../platform/errors/domain-error.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CONFIG } from "../../../platform/tokens.js";
import { AbonnementService } from "../../abonnement/index.js";
import { CurrentUser, Public, type AuthenticatedUser } from "../../identity/index.js";
import { HabitudesService } from "../../learning/index.js";
import { DemoService } from "../application/demo.service.js";
import { PilotageService } from "../application/pilotage.service.js";

const codeBody = z.object({ code: z.string().trim().regex(/^\d{6}$/) });
const reglagesBody = z.object({
  seuilIaJourEur: z.number().min(0).max(10_000),
  coutServicesMensuelEur: z.number().min(0).max(100_000),
  abonnement: reglagesAbonnementSchema.optional(),
});
const decisionBody = z.object({ decision: z.enum(["valider", "refuser"]) });

/**
 * LE PILOTAGE (Greg, 24 octobre 2026) : `/v1/admin/pilotage`. Réservé à GROUPE_ADMINS ; toute route demande la double
 * authentification de la session (code par e-mail), sauf l'envoi et la vérification du code eux-mêmes.
 */
@Controller("v1/admin/pilotage")
export class PilotageController {
  constructor(
    @Inject(PilotageService) private readonly pilotage: PilotageService,
    @Inject(HabitudesService) private readonly habitudes: HabitudesService,
    @Inject(AbonnementService) private readonly abonnement: AbonnementService,
    @Inject(DemoService) private readonly demo: DemoService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  /** Ce que l'écran doit montrer : rien (pas admin), le code (pas encore), ou le tableau. */
  @Get("statut")
  async statut(@CurrentUser() user: AuthenticatedUser) {
    const admin = (await this.pilotage.exiger(user).then(() => "ok").catch((e: { details?: { reason?: string } }) => e.details?.reason ?? "non")) as string;
    return { admin: admin !== "non", deuxFacteurs: admin === "ok" };
  }

  @Throttle({ default: HOURLY(20) })
  @Post("code")
  @HttpCode(200)
  envoyer(@CurrentUser() user: AuthenticatedUser) {
    return this.pilotage.envoyerCode(user);
  }

  @Throttle({ default: HOURLY(30) })
  @Post("code/verifier")
  @HttpCode(200)
  verifier(@CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(codeBody)) body: z.infer<typeof codeBody>) {
    return this.pilotage.verifierCode(user, body.code);
  }

  @Get()
  tableau(@CurrentUser() user: AuthenticatedUser) {
    return this.pilotage.tableau(user);
  }

  @Get("detail/:quoi")
  detail(@CurrentUser() user: AuthenticatedUser, @Param("quoi") quoi: string) {
    if (quoi !== "a_risque" && quoi !== "essais_semaine" && quoi !== "paiements_echoues") throw forbidden("Unknown detail");
    return this.pilotage.detail(user, quoi);
  }

  @Get("reglages")
  async reglages(@CurrentUser() user: AuthenticatedUser) {
    await this.pilotage.exiger(user);
    return { ...(await this.pilotage.reglages()), abonnement: await this.abonnement.reglages() };
  }

  /** Le seuil d'alerte IA, le coût des services, et le prix et les durées de l'abonnement. */
  @Put("reglages")
  async majReglages(@CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(reglagesBody)) body: z.infer<typeof reglagesBody>) {
    const { abonnement, ...pilotage } = body;
    const r = await this.pilotage.majReglages(user, pilotage);
    return { ...r, abonnement: abonnement ? await this.abonnement.majReglages(abonnement) : await this.abonnement.reglages() };
  }

  /** L'apprentissage : les règles globales à valider (3 artisans), d'un clic. */
  @Get("apprentissage")
  async apprentissage(@CurrentUser() user: AuthenticatedUser) {
    await this.pilotage.exiger(user);
    return this.habitudes.admin();
  }

  @Post("apprentissage/:id")
  @HttpCode(200)
  async decider(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body(new ZodPipe(decisionBody)) body: z.infer<typeof decisionBody>) {
    await this.pilotage.exiger(user);
    return this.habitudes.decider(id, body.decision, user.email);
  }

  // La démo (24 octobre 2026) : jouer un cycle sans attendre le calendrier. Jamais en production ; chaque geste est journalisé.
  @Throttle({ default: HOURLY(60) })
  @Post("demo/:geste")
  @HttpCode(200)
  async demoGeste(@CurrentUser() user: AuthenticatedUser, @Param("geste") geste: string) {
    await this.gardeDemo(user, geste);
    switch (geste) {
      case "jeu":
        return this.demo.creer(new Date(), user.userId);
      case "cloturer":
        return this.demo.cloturer();
      case "repondre":
        return this.demo.repondre();
      case "publier":
        return this.demo.publier();
      case "finir-essai":
        return this.demo.finirEssai(user.userId);
      case "echec-paiement":
        return this.demo.simulerEchec(user.userId);
      case "purger-recettes":
        return this.demo.purgerRecettes();
    }
    throw forbidden("Unknown demo action");
  }

  @Delete("demo")
  async demoEffacer(@CurrentUser() user: AuthenticatedUser) {
    await this.gardeDemo(user, "effacer");
    return this.demo.effacer();
  }

  private async gardeDemo(user: AuthenticatedUser, geste: string) {
    if (this.config.env === "production" && !this.config.previewOriginPattern) throw forbidden("Never in production");
    if (!["jeu", "cloturer", "repondre", "publier", "finir-essai", "echec-paiement", "effacer", "purger-recettes"].includes(geste)) throw forbidden("Unknown demo action");
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "demo", geste);
  }
}

/** Les compteurs sans cookie (visites, installations) et la tâche horaire (alerte de coût IA). */
@Controller("v1")
export class PilotagePublicController {
  constructor(
    @Inject(PilotageService) private readonly pilotage: PilotageService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  /** Une visite de la page publique, comptée par le serveur du site : aucun cookie, aucune adresse, un nombre par jour. */
  @Public()
  @Throttle({ default: HOURLY(5000) })
  @Post("public/visite")
  @HttpCode(204)
  async visite() {
    await this.pilotage.compter("visite");
  }

  /** L'app ouverte depuis l'écran d'accueil pour la première fois sur cet appareil. */
  @Throttle({ default: HOURLY(30) })
  @Post("me/installation")
  @HttpCode(204)
  async installation() {
    await this.pilotage.compter("installation");
  }

  @Public()
  @Throttle({ default: HOURLY(120) })
  @Get("internal/pilotage")
  async tache(@Headers("authorization") authorization: string | undefined) {
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Scheduled task only");
    return { alerteIa: await this.pilotage.alerteIa() };
  }
}
