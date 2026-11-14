import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { FAMILLES_GROUPE } from "@baticlair/domain";
import { z } from "zod";
import type { AppConfig } from "../../../platform/config/config.js";
import { notFound } from "../../../platform/errors/domain-error.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Public } from "../../identity/index.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { CommandeDuMoisService } from "../application/commande-du-mois.service.js";
import { NegocesService } from "../application/negoces.service.js";

const famille = z.enum(FAMILLES_GROUPE);
const ajoutBody = z.object({
  nom: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  departement: z.string().trim().regex(/^(\d{2}|2A|2B|97\d|98\d)$/).nullish(),
  familles: z.array(famille).min(1).max(FAMILLES_GROUPE.length),
  favori: z.boolean().optional(),
  numeroCompte: z.string().trim().max(60).nullish(),
  siret: z.string().trim().regex(/^\d{14}$/).nullish(),
});
/** « Mets ton négoce dans la boucle » : l'e-mail suffit ; nom, SIRET (choisi dans Sirene) et département sont facultatifs. */
const boucleBody = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  nom: z.string().trim().max(120).nullish(),
  siret: z.string().trim().regex(/^\d{14}$/).nullish(),
  departement: z.string().trim().regex(/^(\d{2}|2A|2B|97\d|98\d)$/).nullish(),
});

/** L'instant de la requête ; `?maintenant=` seulement en test, pour ajouter un négoce avant ou après une clôture rejouée. */
function instant(config: AppConfig, demande?: string): Date {
  return config.env === "test" && demande && !Number.isNaN(Date.parse(demande)) ? new Date(demande) : new Date();
}
const modifBody = z.object({ familles: z.array(famille).max(FAMILLES_GROUPE.length).optional(), numeroCompte: z.string().trim().max(60).nullish(), favori: z.boolean().optional() }).strict();
const lienBody = z.object({ jeton: z.string().min(10).max(1000) });

/** BatiClair Groupé, étape 3 : « Mes négoces » (l'artisan) et les liens des e-mails (le négoce, sans compte). 404 drapeau éteint. */
@Controller("v1")
export class NegocesController {
  constructor(
    @Inject(NegocesService) private readonly negoces: NegocesService,
    @Inject(CommandeDuMoisService) private readonly commande: CommandeDuMoisService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  private actif() {
    if (!this.config.groupe.enabled) throw notFound("Route");
  }

  @Get("groupe/negoces")
  @UseGuards(TenantGuard)
  async liste(@Tenant() tenant: TenantContext) {
    this.actif();
    return { negoces: await this.negoces.mesNegoces(tenant) };
  }

  /** Le message type à envoyer à son négoce pour le prévenir. */
  @Get("groupe/negoces/message")
  @UseGuards(TenantGuard)
  async message(@Tenant() tenant: TenantContext) {
    this.actif();
    return this.negoces.message(tenant);
  }

  @Post("groupe/negoces")
  @UseGuards(TenantGuard)
  @HttpCode(201)
  async ajouter(@Tenant() tenant: TenantContext, @Body(new ZodPipe(ajoutBody)) body: z.infer<typeof ajoutBody>, @Query("maintenant") m?: string) {
    this.actif();
    return { negoces: await this.negoces.ajouter(tenant, { ...body, email: body.email ?? "" }, instant(this.config, m)) };
  }

  /**
   * « METS TON NÉGOCE DANS LA BOUCLE » (Greg, 23 octobre 2026) : un e-mail, un bouton. Le négoce rejoint la base couverture
   * du département (dédoublonné par SIRET ou e-mail) et ma liste ; la réponse dit la commande qu'il recevra : celle du mois
   * en cours s'il est ajouté avant la clôture, sinon la suivante (c'est toujours la prochaine clôture affichée).
   */
  @Post("groupe/negoces/boucle")
  @UseGuards(TenantGuard)
  @HttpCode(200)
  async boucle(@Tenant() tenant: TenantContext, @Body(new ZodPipe(boucleBody)) body: z.infer<typeof boucleBody>, @Query("maintenant") m?: string) {
    this.actif();
    const maintenant = instant(this.config, m);
    const r = await this.negoces.mettreDansLaBoucle(tenant, { ...body, email: body.email ?? "" }, maintenant);
    const prochaine = await this.commande.prochaineCommande(tenant, maintenant).catch(() => null);
    return { ...r, mois: prochaine ? { mois: prochaine.mois, de: prochaine.de, clotureLe: prochaine.clotureLe } : null };
  }

  @Patch("groupe/negoces/:negoceId")
  @UseGuards(TenantGuard)
  async modifier(@Tenant() tenant: TenantContext, @Param("negoceId") negoceId: string, @Body(new ZodPipe(modifBody)) body: z.infer<typeof modifBody>) {
    this.actif();
    return { negoces: await this.negoces.modifier(tenant, negoceId, body) };
  }

  @Delete("groupe/negoces/:negoceId")
  @UseGuards(TenantGuard)
  @HttpCode(200)
  async retirer(@Tenant() tenant: TenantContext, @Param("negoceId") negoceId: string) {
    this.actif();
    return { negoces: await this.negoces.retirer(tenant, negoceId) };
  }

  /** Le lien d'un e-mail, lu avant confirmation (la page dit ce qu'il fera). */
  @Public()
  @Throttle({ default: HOURLY(60) })
  @Post("negoces/lien/apercu")
  @HttpCode(200)
  async apercu(@Body(new ZodPipe(lienBody)) body: z.infer<typeof lienBody>) {
    this.actif();
    return this.negoces.apercuLien(body.jeton);
  }

  /** « Pas concerné » ou « stop », confirmé par le négoce. */
  @Public()
  @Throttle({ default: HOURLY(60) })
  @Post("negoces/lien")
  @HttpCode(200)
  async appliquer(@Body(new ZodPipe(lienBody)) body: z.infer<typeof lienBody>) {
    this.actif();
    return this.negoces.appliquerLien(body.jeton);
  }
}
