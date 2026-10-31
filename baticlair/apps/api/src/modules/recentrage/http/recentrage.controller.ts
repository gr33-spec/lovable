import { Body, Controller, Get, Headers, HttpCode, Inject, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { BUTS_DEMANDE, MODES_REGROUPEMENT } from "@baticlair/domain";
import { z } from "zod";
import type { AppConfig } from "../../../platform/config/config.js";
import { DomainError, forbidden, notFound } from "../../../platform/errors/domain-error.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CONFIG } from "../../../platform/tokens.js";
import { cookieNegoce, EspaceNegoceService } from "../../groupe/index.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { DemandePersoService } from "../application/demande-perso.service.js";
import { DroitsService } from "../application/droits.service.js";
import { RegroupementsService } from "../application/regroupements.service.js";
import { HypothesesService } from "../application/hypotheses.service.js";
import { NegocieService } from "../application/negocie.service.js";
import { PilotageService } from "../../pilotage/index.js";
import { CurrentUser, Public, type AuthenticatedUser } from "../../identity/index.js";

/** En test seulement : « maintenant » se règle par la requête (relances, validité, clôture). */
function instant(config: AppConfig, demande?: string): Date {
  return config.env === "test" && demande && !Number.isNaN(Date.parse(demande)) ? new Date(demande) : new Date();
}

const negoceChoisi = z.union([z.object({ supplierId: z.uuid() }), z.object({ negoceId: z.uuid() }), z.object({ nom: z.string().trim().min(1).max(120), email: z.email().max(254) })]);
const envoiBody = z.object({
  but: z.enum(BUTS_DEMANDE),
  accord: z.literal(true),
  negoces: z.array(negoceChoisi).min(1).max(20),
  dateBesoin: z.iso.date().nullable().optional(),
  message: z.string().trim().max(2000).nullable().optional(),
  articles: z.array(z.string().min(1).max(200)).max(500).optional(),
});
const destinataireBody = z.object({ recipientId: z.uuid() });
const finEssaiBody = z.object({ email: z.email().max(254) });
const modeTestBody = z.object({ mode: z.enum(MODES_REGROUPEMENT) });
const zoneTestBody = z.object({ zone: z.string().regex(/^\d[\dAB]$/), franchiLe: z.iso.datetime().nullable() });
const chiffrageBody = z.object({
  prix: z.record(z.string().max(10), z.number().min(0).max(1_000_000)),
  livraisonHt: z.number().min(0).max(100_000),
  delaiJours: z.number().int().min(0).max(365).nullable(),
  validiteJours: z.number().int().min(1).max(365),
});

/**
 * RECENTRAGE (Greg, 25 octobre 2026), côté artisan : les droits (gratuit ou payant), la DEMANDE PERSO à ses négoces
 * (envoi, comparaison livraison comprise, commande, livrée) et « MES PRIX ».
 */
@Controller("v1")
@UseGuards(TenantGuard)
export class RecentrageController {
  constructor(
    @Inject(DroitsService) private readonly droits: DroitsService,
    @Inject(DemandePersoService) private readonly demandes: DemandePersoService,
  ) {}

  @Get("droits")
  mesDroits(@Tenant() tenant: TenantContext) {
    return this.droits.droits(tenant.companyId);
  }

  @Get("projects/:projectId/demandes-perso/negoces")
  negoces(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string) {
    return this.demandes.negocesProposes(tenant, projectId);
  }

  @Get("projects/:projectId/demandes-perso")
  duChantier(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string) {
    return this.demandes.duChantier(tenant, projectId);
  }

  @Throttle({ default: HOURLY(120) })
  @Post("projects/:projectId/demandes-perso")
  envoyer(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string, @Body(new ZodPipe(envoiBody)) body: z.infer<typeof envoiBody>) {
    return this.demandes.envoyer(tenant, projectId, {
      but: body.but,
      accord: body.accord,
      negoces: body.negoces,
      dateBesoin: body.dateBesoin ? new Date(`${body.dateBesoin}T00:00:00Z`) : null,
      message: body.message ?? null,
      ...(body.articles ? { articles: body.articles } : {}),
    });
  }

  @Get("demandes-perso/:id")
  vue(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return this.demandes.vue(tenant, id);
  }

  @Post("demandes-perso/:id/commander")
  @HttpCode(200)
  commander(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(destinataireBody)) body: z.infer<typeof destinataireBody>) {
    return this.demandes.commander(tenant, id, body.recipientId);
  }

  @Post("demandes-perso/:id/livree")
  @HttpCode(200)
  livree(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(destinataireBody)) body: z.infer<typeof destinataireBody>) {
    return this.demandes.livree(tenant, id, body.recipientId);
  }

  @Get("mes-prix")
  mesPrix(@Tenant() tenant: TenantContext) {
    return this.demandes.mesPrix(tenant);
  }
}

/** Le CHIFFRAGE EN LIGNE SANS COMPTE (vouvoiement côté écran) : par le lien reçu, jamais un prix d'un autre négoce. */
@Controller("v1/public/chiffrer")
export class ChiffrageController {
  constructor(@Inject(DemandePersoService) private readonly demandes: DemandePersoService) {}

  @Public()
  @Throttle({ default: HOURLY(120) })
  @Get(":jeton")
  page(@Param("jeton") jeton: string) {
    return this.demandes.page(jeton);
  }

  @Public()
  @Throttle({ default: HOURLY(60) })
  @Post(":jeton")
  @HttpCode(200)
  chiffrer(@Param("jeton") jeton: string, @Body(new ZodPipe(chiffrageBody)) body: z.infer<typeof chiffrageBody>) {
    return this.demandes.chiffrer(jeton, { prix: body.prix, livraisonHt: body.livraisonHt, delaiJours: body.delaiJours ?? null, validiteJours: body.validiteJours });
  }

  @Public()
  @Throttle({ default: HOURLY(60) })
  @Post(":jeton/refuser")
  @HttpCode(200)
  refuser(@Param("jeton") jeton: string) {
    return this.demandes.refuser(jeton);
  }

  @Public()
  @Throttle({ default: HOURLY(60) })
  @Post(":jeton/confirmer")
  @HttpCode(200)
  confirmer(@Param("jeton") jeton: string) {
    return this.demandes.confirmer(jeton);
  }
}

/** « Vos résultats » dans l'espace négoce (session du négoce), et la tâche planifiée des relances. */
@Controller("v1")
export class RecentrageNegoceController {
  constructor(
    @Inject(DemandePersoService) private readonly demandes: DemandePersoService,
    @Inject(EspaceNegoceService) private readonly espace: EspaceNegoceService,
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(DroitsService) private readonly droits: DroitsService,
    @Inject(NegocieService) private readonly negocie: NegocieService,
  ) {}

  @Public()
  @Throttle({ default: HOURLY(300) })
  @Get("negoce/resultats")
  async resultats(@Headers("cookie") cookie: string | undefined) {
    const s = await this.espace.session(cookieNegoce(cookie));
    if (!s) throw new DomainError("unauthenticated", "Négoce session required");
    return this.demandes.resultatsNegoce(s.compteId);
  }

  /**
   * Parcours e2e seulement (`NODE_ENV=test`, secret de la tâche) : la date de franchissement du seuil d'une zone, pour
   * jouer le gratuit (seuil franchi depuis longtemps) ou le préavis de 30 jours. En ligne, la route n'existe pas (404).
   */
  @Public()
  @Post("internal/test/zone")
  @HttpCode(200)
  async zoneDeTest(@Headers("authorization") authorization: string | undefined, @Body(new ZodPipe(zoneTestBody)) body: z.infer<typeof zoneTestBody>) {
    if (this.config.env !== "test") throw notFound("Route");
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Test only");
    await this.droits.fixerSeuilFranchi(body.zone, body.franchiLe ? new Date(body.franchiLe) : null);
    return { fait: true };
  }

  /** Parcours e2e seulement : le mode des regroupements (les cas automatiques le passent en « automatique », puis le rendent). */
  @Public()
  @Post("internal/test/mode-regroupement")
  @HttpCode(200)
  async modeDeTest(@Headers("authorization") authorization: string | undefined, @Body(new ZodPipe(modeTestBody)) body: z.infer<typeof modeTestBody>) {
    if (this.config.env !== "test") throw notFound("Route");
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Test only");
    return this.negocie.changerMode(body.mode);
  }

  /** Parcours e2e seulement : l'essai de ce compte s'arrête, pour jouer le gratuit. */
  @Public()
  @Post("internal/test/fin-essai")
  @HttpCode(200)
  async finEssaiDeTest(@Headers("authorization") authorization: string | undefined, @Body(new ZodPipe(finEssaiBody)) body: z.infer<typeof finEssaiBody>) {
    if (this.config.env !== "test") throw notFound("Route");
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Test only");
    return { fait: await this.droits.finirEssaiDe(body.email) };
  }

  /** La tâche du soir des alertes du chasseur (18 h, Paris) : digest des ajouts, rappels J-5 et J-2, rappel 48 h à l'artisan. */
  @Public()
  @Throttle({ default: HOURLY(120) })
  @Get("internal/negocie")
  tacheNegocie(@Headers("authorization") authorization: string | undefined, @Query("maintenant") m?: string) {
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Scheduled task only");
    return this.negocie.tacheDuSoir(instant(this.config, m));
  }

  @Public()
  @Throttle({ default: HOURLY(120) })
  @Get("internal/demandes-perso")
  tache(@Headers("authorization") authorization: string | undefined, @Query("maintenant") m?: string) {
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Scheduled task only");
    return this.demandes.tache(instant(this.config, m));
  }
}

const tenterBody = z.object({ articles: z.array(z.string().min(1).max(200)).min(1).max(500), mois: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
const rejoindreBody = z.object({ cle: z.string().min(1).max(500), quantite: z.number().positive().max(10_000_000) });
const basculerBody = z.object({ vers: z.enum(["suivant", "perso"]) });

/**
 * LES REGROUPEMENTS (Greg, 25 octobre 2026) : la liste des regroupements pertinents de sa zone, le détail, « Tenter un
 * prix de groupe » depuis un chantier, « Rejoindre » en tapant une quantité, la bascule quand le volume manque.
 */
@Controller("v1")
@UseGuards(TenantGuard)
export class RegroupementsController {
  constructor(
    @Inject(RegroupementsService) private readonly regroupements: RegroupementsService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Get("regroupements")
  liste(@Tenant() tenant: TenantContext, @Query("maintenant") m?: string) {
    return this.regroupements.liste(tenant, instant(this.config, m));
  }

  @Get("regroupements/:id")
  detail(@Tenant() tenant: TenantContext, @Param("id") id: string, @Query("maintenant") m?: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new DomainError("not_found", "Regroupement not found");
    return this.regroupements.detail(tenant, id, instant(this.config, m));
  }

  @Post("regroupements/:id/rejoindre")
  @HttpCode(200)
  rejoindre(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(rejoindreBody)) body: z.infer<typeof rejoindreBody>, @Query("maintenant") m?: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new DomainError("not_found", "Regroupement not found");
    return this.regroupements.rejoindre(tenant, id, body, instant(this.config, m));
  }

  @Post("regroupements/:id/basculer")
  @HttpCode(200)
  basculer(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(basculerBody)) body: z.infer<typeof basculerBody>, @Query("maintenant") m?: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new DomainError("not_found", "Regroupement not found");
    return this.regroupements.basculer(tenant, id, body.vers, instant(this.config, m));
  }

  @Get("projects/:projectId/regroupements/lignes")
  lignes(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string) {
    return this.regroupements.lignesDuChantier(tenant, projectId);
  }

  @Post("projects/:projectId/regroupements")
  tenter(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string, @Body(new ZodPipe(tenterBody)) body: z.infer<typeof tenterBody>, @Query("maintenant") m?: string) {
    return this.regroupements.tenter(tenant, projectId, body, instant(this.config, m));
  }
}

const inscriptionsBody = z.object({ gratuitesOuvertes: z.boolean() });

/** L'admin (double authentification) : les hypothèses de lancement, le coût IA des comptes gratuits, les inscriptions. */
@Controller("v1/admin/pilotage")
export class HypothesesController {
  constructor(
    @Inject(PilotageService) private readonly pilotage: PilotageService,
    @Inject(HypothesesService) private readonly hypotheses: HypothesesService,
    @Inject(NegocieService) private readonly negocie: NegocieService,
  ) {}

  @Get("hypotheses")
  async lesHypotheses(@CurrentUser() user: AuthenticatedUser) {
    await this.pilotage.exiger(user);
    const debut = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
    return { ...(await this.hypotheses.hypotheses()), negocie: await this.negocie.indicateurs(debut) };
  }

  @Get("cout-ia-gratuits")
  async coutIa(@CurrentUser() user: AuthenticatedUser) {
    await this.pilotage.exiger(user);
    return this.hypotheses.coutIaGratuits();
  }

  @Get("inscriptions")
  async inscriptions(@CurrentUser() user: AuthenticatedUser) {
    await this.pilotage.exiger(user);
    return this.hypotheses.inscriptions();
  }

  @Put("inscriptions")
  async changerInscriptions(@CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(inscriptionsBody)) body: z.infer<typeof inscriptionsBody>) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "inscriptions", body.gratuitesOuvertes ? "ouvertes" : "fermees");
    return this.hypotheses.changerInscriptions(body.gratuitesOuvertes);
  }
}
