import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import { AdresseAlerte } from "../../../platform/alerts/adresse-alerte.js";
import { notFound } from "../../../platform/errors/domain-error.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CurrentUser, Public, type AuthenticatedUser } from "../../identity/index.js";
import { PilotageService } from "../../pilotage/index.js";
import { AdminVueService } from "../application/admin-vue.service.js";
import { QuestionAdminService } from "../application/question-admin.service.js";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const court = z.string().trim().max(80).optional();
const filtresArtisans = z.object({ q: court, metier: court, departement: court, formule: z.enum(["payant", "decouverte", "essentiel", "pro", "echec"]).optional(), promo: court, recents: z.enum(["1"]).optional() });
const filtresNegoces = z.object({ q: court, verifie: z.enum(["oui", "non"]).optional(), famille: court });
const questionBody = z.object({ question: z.string().trim().min(2).max(400) });
const alerteBody = z.object({ adresse: z.string().trim().email().max(200) });
const jetonBody = z.object({ jeton: z.string().min(10).max(200) });

/**
 * L'ESPACE ADMIN, VUE GLOBALE (Greg, 14 novembre 2026) : `/v1/admin/vue`. Réservé à l'équipe, double authentification
 * comprise (`exiger`). LECTURE SEULE, sauf l'adresse d'alerte. RGPD : chaque liste ou fiche consultée, et chaque question
 * posée, est écrite au journal de l'admin (qui, quoi, quand).
 */
@Controller("v1/admin/vue")
export class AdminVueController {
  constructor(
    @Inject(AdminVueService) private readonly vue: AdminVueService,
    @Inject(PilotageService) private readonly pilotage: PilotageService,
    @Inject(QuestionAdminService) private readonly questions: QuestionAdminService,
    @Inject(AdresseAlerte) private readonly adresse: AdresseAlerte,
  ) {}

  @Get("accueil")
  async accueil(@CurrentUser() user: AuthenticatedUser) {
    await this.pilotage.exiger(user);
    return this.vue.accueil();
  }

  @Get("artisans")
  async artisans(@CurrentUser() user: AuthenticatedUser, @Query(new ZodPipe(filtresArtisans)) f: z.infer<typeof filtresArtisans>) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "vue_liste_artisans", f.q ?? null);
    return this.vue.artisans({ q: f.q, metier: f.metier, departement: f.departement, formule: f.formule, promo: f.promo, recents: f.recents === "1" });
  }

  @Get("artisans/:id")
  async artisan(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.pilotage.exiger(user);
    const fiche = uuid.test(id) ? await this.vue.ficheArtisan(id) : null;
    if (!fiche) throw notFound("Company");
    await this.pilotage.journal(user, "vue_fiche_artisan", id);
    return fiche;
  }

  @Get("negoces")
  async negoces(@CurrentUser() user: AuthenticatedUser, @Query(new ZodPipe(filtresNegoces)) f: z.infer<typeof filtresNegoces>) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "vue_liste_negoces", f.q ?? null);
    return this.vue.negoces({ q: f.q, verifie: f.verifie, famille: f.famille });
  }

  @Get("negoces/:id")
  async negoce(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.pilotage.exiger(user);
    const fiche = uuid.test(id) ? await this.vue.ficheNegoce(id) : null;
    if (!fiche) throw notFound("CompteNegoce");
    await this.pilotage.journal(user, "vue_fiche_negoce", id);
    return fiche;
  }

  @Get("promos")
  async promos(@CurrentUser() user: AuthenticatedUser) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "vue_codes_promo");
    return this.vue.codesPromo();
  }

  /** « Pose ta question » : des chiffres agrégés, lecture seule ; la question est journalisée. */
  @Throttle({ default: HOURLY(120) })
  @Post("question")
  @HttpCode(200)
  async question(@CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(questionBody)) b: z.infer<typeof questionBody>) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "vue_question", b.question.slice(0, 200));
    return this.questions.repondre(b.question, user.userId);
  }

  @Get("reglages/alerte")
  async alerte(@CurrentUser() user: AuthenticatedUser) {
    await this.pilotage.exiger(user);
    return this.adresse.etat();
  }

  /** Étape 1 de la double validation : le lien part vers la nouvelle adresse ; rien ne change avant le clic. */
  @Throttle({ default: HOURLY(10) })
  @Post("reglages/alerte")
  @HttpCode(200)
  async demanderAlerte(@CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(alerteBody)) b: z.infer<typeof alerteBody>) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "alerte_adresse_demandee", b.adresse);
    return this.adresse.demander(b.adresse, user.email);
  }
}

/** Étape 2 : le clic du lien reçu sur la nouvelle adresse. Le jeton fait foi (comme un lien de confirmation d'e-mail). */
@Controller("v1/public/admin")
export class AdminVuePublicController {
  constructor(@Inject(AdresseAlerte) private readonly adresse: AdresseAlerte) {}

  @Public()
  @Throttle({ default: HOURLY(30) })
  @Post("alerte/confirmer")
  @HttpCode(200)
  confirmer(@Body(new ZodPipe(jetonBody)) b: z.infer<typeof jetonBody>) {
    return this.adresse.confirmer(b.jeton);
  }
}
