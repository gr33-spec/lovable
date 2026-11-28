import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { codeInvitationValide } from "@baticlair/domain";
import { z } from "zod";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CurrentUser, Public, type AuthenticatedUser } from "../../identity/index.js";
import { PilotageService } from "../../pilotage/index.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { CommunauteService, metierConnu } from "../application/communaute.service.js";

/** Le choix explicite : la case cochée par l'artisan, jamais présumée. */
const inscriptionBody = z.object({ consentement: z.literal(true) });
const invitationBody = z.object({ code: z.string().trim().toLowerCase().refine(codeInvitationValide, { message: "Code d'invitation inconnu." }) });
const desinscriptionBody = z.object({ jeton: z.string().trim().max(60) });
const departements = z
  .string()
  .trim()
  .max(200)
  .transform((s) => s.split(",").map((d) => d.trim()).filter(Boolean));
const apercuQuery = z.object({ metier: z.string().refine(metierConnu, { message: "Métier inconnu." }), departements: departements.optional() });
const annonceBody = z.object({
  metier: z.string().refine(metierConnu, { message: "Métier inconnu." }),
  departements: z.array(z.string().trim().min(2).max(3)).min(1).max(30),
  /** Le nombre lu dans l'aperçu : la confirmation porte sur CE nombre de personnes. */
  nombre: z.number().int().min(0).max(100_000),
});
const idParam = z.uuid();

/** L'artisan connecté : sa place sur la liste d'attente et son lien d'invitation (accueil). */
@Controller("v1/communaute")
@UseGuards(TenantGuard)
export class CommunauteController {
  constructor(@Inject(CommunauteService) private readonly communaute: CommunauteService) {}

  @Get()
  etat(@Tenant() tenant: TenantContext) {
    return this.communaute.etat(tenant.companyId);
  }

  @Throttle({ default: HOURLY(30) })
  @Post("liste-attente")
  inscrire(@Tenant() tenant: TenantContext, @CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(inscriptionBody)) b: z.infer<typeof inscriptionBody>) {
    void b.consentement; // la case cochée est exigée par le schéma : sans elle, 400.
    return this.communaute.inscrire(tenant.companyId, user.email);
  }

  @Delete("liste-attente")
  desinscrire(@Tenant() tenant: TenantContext) {
    return this.communaute.desinscrireCompte(tenant.companyId);
  }

  /** Juste après l'inscription par un lien d'invitation : qui a invité qui (rien d'autre). */
  @Throttle({ default: HOURLY(10) })
  @Post("invitation")
  suivre(@Tenant() tenant: TenantContext, @Body(new ZodPipe(invitationBody)) b: z.infer<typeof invitationBody>) {
    return this.communaute.suivreInvitation(tenant.companyId, b.code);
  }
}

/** La désinscription en un clic, depuis le lien de l'e-mail, sans compte. */
@Controller("v1/public/liste-attente")
export class CommunautePublicController {
  constructor(@Inject(CommunauteService) private readonly communaute: CommunauteService) {}

  @Public()
  @Throttle({ default: HOURLY(60) })
  @Post("desinscription")
  @HttpCode(204)
  async desinscrire(@Body(new ZodPipe(desinscriptionBody)) b: z.infer<typeof desinscriptionBody>) {
    await this.communaute.desinscrireParJeton(b.jeton);
  }
}

/** L'espace admin : « Prévenir les inscrits » (aperçu, confirmation, lots, journal) et les invitations. */
@Controller("v1/admin")
export class CommunauteAdminController {
  constructor(
    @Inject(CommunauteService) private readonly communaute: CommunauteService,
    @Inject(PilotageService) private readonly pilotage: PilotageService,
  ) {}

  @Get("annonces")
  async annonces(@CurrentUser() user: AuthenticatedUser) {
    await this.pilotage.exiger(user);
    return this.communaute.annonces();
  }

  @Get("annonces/apercu")
  async apercu(@CurrentUser() user: AuthenticatedUser, @Query(new ZodPipe(apercuQuery)) q: z.infer<typeof apercuQuery>) {
    await this.pilotage.exiger(user);
    return this.communaute.apercu(q.metier, q.departements ?? []);
  }

  @Post("annonces")
  @HttpCode(201)
  async annoncer(@CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(annonceBody)) b: z.infer<typeof annonceBody>) {
    await this.pilotage.exiger(user);
    const r = await this.communaute.annoncer(user.email, b.metier, b.departements, b.nombre);
    await this.pilotage.journal(user, "annonce_ouverture", `${b.metier}:${b.departements.join(",")}:${r.total}`);
    return r;
  }

  @Post("annonces/:id/lot")
  async lot(@CurrentUser() user: AuthenticatedUser, @Param("id", new ZodPipe(idParam)) id: string) {
    await this.pilotage.exiger(user);
    return this.communaute.lot(id);
  }

  @Post("annonces/:id/echecs")
  async relancer(@CurrentUser() user: AuthenticatedUser, @Param("id", new ZodPipe(idParam)) id: string) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "annonce_relance_echecs", id);
    return this.communaute.relancerEchecs(id);
  }

  @Get("annonces/:id/journal")
  async journal(@CurrentUser() user: AuthenticatedUser, @Param("id", new ZodPipe(idParam)) id: string) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "vue_annonce_journal", id);
    return this.communaute.journal(id);
  }

  @Get("invitations")
  async invitations(@CurrentUser() user: AuthenticatedUser) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "vue_invitations");
    return this.communaute.invitations();
  }
}
