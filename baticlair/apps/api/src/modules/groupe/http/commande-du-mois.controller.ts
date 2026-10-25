import { Body, Controller, Delete, Get, Header, Headers, HttpCode, Inject, Param, Post, Put, Query, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { memoryStorage } from "multer";
import { PHRASE_SANS_ENGAGEMENT, SEUIL_CYCLES_ECONOMIE, argumentTarif, eurosDeCentimes, offresAbonnement, prixParMoisAnnuel } from "@baticlair/domain";
import { z } from "zod";
import type { AppConfig } from "../../../platform/config/config.js";
import { PrismaService } from "../../../platform/database/prisma.service.js";
import { forbidden, notFound } from "../../../platform/errors/domain-error.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Public } from "../../identity/index.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { AbonnementService } from "../../abonnement/index.js";
import { CommandeDuMoisService } from "../application/commande-du-mois.service.js";
import { EspaceNegoceService } from "../application/espace-negoce.service.js";

const depotBody = z.object({
  articles: z.array(z.string().min(1).max(300)).min(1).max(500),
  nature: z.enum(["chantier", "stock"]),
  /** La commande que l'écran montrait (« 2026-10-15 ») : close entre-temps, la réponse dit « Trop tard pour le 15 octobre… ». */
  mois: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
});
const commanderBody = z.object({ negoceId: z.uuid().optional(), combinaison: z.string().min(1).max(4000).optional() }).refine((b) => !!b.negoceId || !!b.combinaison);
/** « Prix fermes » (obligatoire) et, par article, « non garanti » : des champs du formulaire multipart. */
const grilleBody = z.object({ fermes: z.string().max(10).optional(), conditions: z.string().max(10).optional(), nonGarantis: z.union([z.string().max(300), z.array(z.string().max(300))]).optional() });
const recommanderBody = z.object({ lignes: z.array(z.object({ cle: z.string().min(1).max(300), quantite: z.number().positive().max(1_000_000) })).min(1).max(200), adresseLivraison: z.string().trim().min(5).max(300) });
const configBody = z.object({ jourCloture1: z.number().int(), jourCloture2: z.number().int(), heureCloture: z.number().int(), joursOuvresReponse: z.number().int(), heureReponse: z.number().int() });
const datesBody = z.object({ clotureLe: z.iso.datetime().optional(), reponseAvant: z.iso.datetime().optional() });

/** L'instant de la requête ; `?maintenant=` seulement en test, pour rejouer une clôture ou une limite. */
function instant(config: AppConfig, demande?: string): Date {
  return config.env === "test" && demande && !Number.isNaN(Date.parse(demande)) ? new Date(demande) : new Date();
}

/**
 * LA COMMANDE COMMUNE DU MOIS (Greg, 22 octobre 2026), côté artisan : voir sa commande (chrono, quantités, résultats),
 * déposer des lignes de sa liste, en retirer avant la clôture, commander au négoce choisi. 404 drapeau éteint.
 */
@Controller("v1")
@UseGuards(TenantGuard)
export class CommandeDuMoisController {
  constructor(
    @Inject(CommandeDuMoisService) private readonly commande: CommandeDuMoisService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  private actif() {
    if (!this.config.groupe.enabled) throw notFound("Route");
  }

  /** Les écritures n'existent qu'en mode « mois » ; en mode « lots », seule la lecture (qui dit le mode) répond. */
  private ecriture() {
    if (!this.config.groupe.enabled || this.config.groupe.mode !== "mois") throw notFound("Route");
  }

  @Get("commande-du-mois")
  async vue(@Tenant() tenant: TenantContext, @Query("maintenant") m?: string, @Query("projectId") projectId?: string) {
    this.actif();
    const maintenant = instant(this.config, m);
    // `projectId` : la commande ouverte du département de ce chantier (le bloc de « Ton chantier »).
    const prochaine = await this.commande.prochaineCommande(tenant, maintenant, projectId);
    return {
      mode: this.config.groupe.mode,
      commandes: await this.commande.vues(tenant, maintenant),
      prochaine,
      // La grille garantie 30 jours (Greg, 23 octobre 2026) : visible par tout artisan de la zone, même nouveau.
      garanties: await this.commande.garanties(tenant, maintenant),
      phrases: { sansEngagement: PHRASE_SANS_ENGAGEMENT },
    };
  }

  /** « Recommander à ce prix » sur une grille garantie : le bon part au négoce retenu. */
  @Post("commande-du-mois/:cycleId/recommander")
  @HttpCode(201)
  async recommander(@Tenant() tenant: TenantContext, @Param("cycleId") cycleId: string, @Body(new ZodPipe(recommanderBody)) body: z.infer<typeof recommanderBody>, @Query("maintenant") m?: string) {
    this.ecriture();
    return this.commande.recommander(tenant, cycleId, body, instant(this.config, m));
  }

  @Post("projects/:projectId/commande-du-mois")
  @HttpCode(201)
  async deposer(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string, @Body(new ZodPipe(depotBody)) body: z.infer<typeof depotBody>, @Query("maintenant") m?: string) {
    this.ecriture();
    return this.commande.deposer(tenant, projectId, body, instant(this.config, m));
  }

  @Delete("commande-du-mois/lignes/:id")
  @HttpCode(204)
  async retirer(@Tenant() tenant: TenantContext, @Param("id") id: string, @Query("maintenant") m?: string) {
    this.ecriture();
    await this.commande.retirer(tenant, id, instant(this.config, m));
  }

  @Post("commande-du-mois/:cycleId/commander")
  @HttpCode(200)
  async commander(@Tenant() tenant: TenantContext, @Param("cycleId") cycleId: string, @Body(new ZodPipe(commanderBody)) body: z.infer<typeof commanderBody>, @Query("maintenant") m?: string) {
    this.ecriture();
    return this.commande.commander(tenant, cycleId, body, instant(this.config, m));
  }

  @Get("projects/:projectId/commande-du-mois/suivi")
  async suivi(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string, @Query("maintenant") m?: string) {
    this.actif();
    return { suivi: await this.commande.suiviDuChantier(tenant, projectId, instant(this.config, m)) };
  }
}

/** La page du négoce : sa grille, sans compte (lien unique), et le dépôt de son devis. Publique, limitée en débit. */
@Controller("v1/grille")
export class GrilleNegoceController {
  constructor(
    @Inject(CommandeDuMoisService) private readonly commande: CommandeDuMoisService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Throttle({ default: HOURLY(120) })
  @Get(":jeton")
  async page(@Param("jeton") jeton: string, @Query("maintenant") m?: string) {
    if (!this.config.groupe.enabled) throw notFound("Route");
    return this.commande.pageGrille(jeton, instant(this.config, m));
  }

  @Public()
  @Throttle({ default: HOURLY(30) })
  @Post(":jeton")
  @UseInterceptors(FilesInterceptor("file", 2, { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 2 } }))
  async deposer(@Param("jeton") jeton: string, @Body(new ZodPipe(grilleBody)) body: z.infer<typeof grilleBody>, @UploadedFiles() files: { originalname: string; mimetype: string; buffer: Buffer }[] | undefined, @Query("maintenant") m?: string) {
    if (!this.config.groupe.enabled || this.config.groupe.mode !== "mois") throw notFound("Route");
    const nonGarantis = body.nonGarantis === undefined ? [] : Array.isArray(body.nonGarantis) ? body.nonGarantis : [body.nonGarantis];
    return this.commande.deposerGrille(jeton, { fichiers: (files ?? []).map((f) => ({ nom: f.originalname, type: f.mimetype, contenu: f.buffer })), fermes: body.fermes === "oui" || body.fermes === "true" || body.fermes === "on", conditions: body.conditions === "oui" || body.conditions === "true" || body.conditions === "on", nonGarantis }, instant(this.config, m));
  }
}

/** La tâche planifiée (vercel.json → crons, chaque heure) : clôture, grille aux négoces, relance, résultats, ajouts. */
@Controller("v1/internal")
export class CommandeDuMoisTacheController {
  constructor(
    @Inject(CommandeDuMoisService) private readonly commande: CommandeDuMoisService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Throttle({ default: HOURLY(120) })
  @Get("commande-du-mois")
  async tache(@Headers("authorization") authorization: string | undefined, @Query("maintenant") m?: string) {
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Scheduled task only");
    if (!this.config.groupe.enabled || this.config.groupe.mode !== "mois") return { clos: 0, grillesEnvoyees: 0, relances: 0, resultats: 0, ajouts: 0 };
    return this.commande.tache(instant(this.config, m));
  }
}

/** L'admin : les dates du cycle (une seule config, modifiable) et les dates d'une commande précise. */
@Controller("v1/admin/commande-du-mois")
@UseGuards(TenantGuard)
export class CommandeDuMoisAdminController {
  constructor(
    @Inject(CommandeDuMoisService) private readonly commande: CommandeDuMoisService,
    @Inject(EspaceNegoceService) private readonly espace: EspaceNegoceService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  private async garde(tenant: TenantContext): Promise<void> {
    if (!this.config.groupe.enabled) throw notFound("Route");
    const user = await this.prisma.user.findUnique({ where: { id: tenant.userId }, select: { email: true } });
    if (!user || !this.config.groupe.admins.includes(user.email.toLowerCase())) throw forbidden("Reserved to groupé admins");
  }

  @Get("config")
  async config_(@Tenant() tenant: TenantContext) {
    await this.garde(tenant);
    return this.commande.config();
  }

  @Put("config")
  async changer(@Tenant() tenant: TenantContext, @Body(new ZodPipe(configBody)) body: z.infer<typeof configBody>) {
    await this.garde(tenant);
    return this.commande.changerConfig({ ...(await this.commande.config()), ...body });
  }

  /** Le tableau des négoces (espace négoce, point 8) : inscrits, invités jamais venus, désabonnés, taux de réponse et de commande. */
  @Get("negoces")
  async negoces(@Tenant() tenant: TenantContext) {
    await this.garde(tenant);
    return this.espace.tableau();
  }

  @Post("cycles/:id/dates")
  @HttpCode(204)
  async dates(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(datesBody)) body: z.infer<typeof datesBody>) {
    await this.garde(tenant);
    await this.commande.datesDuCycleAdmin(id, { ...(body.clotureLe ? { clotureLe: new Date(body.clotureLe) } : {}), ...(body.reponseAvant ? { reponseAvant: new Date(body.reponseAvant) } : {}) });
  }
}

/** L'argument des tarifs (landing, /tarifs) : la vraie économie moyenne dès 3 cycles publiés, sinon la phrase de possibilité. */
@Controller("v1/public")
export class EconomiePubliqueController {
  constructor(
    @Inject(CommandeDuMoisService) private readonly commande: CommandeDuMoisService,
    @Inject(AbonnementService) private readonly abonnement: AbonnementService,
  ) {}

  @Public()
  @Throttle({ default: { ttl: 3_600_000, limit: 600 } })
  @Header("Cache-Control", "public, max-age=3600")
  @Get("tarif")
  async tarif() {
    const [moyenne, reglages] = await Promise.all([this.commande.economieMoyenne().catch(() => ({ cycles: 0, parCommande: null, total: 0 })), this.abonnement.reglages()]);
    // Les deux formules (Greg, 24 octobre 2026) : l'annuel d'abord, mis en avant ; « dès 29 € » pour la landing.
    return { argument: argumentTarif(moyenne, reglages), prixHt: eurosDeCentimes(reglages.prixHtCentimes), prixAnnuelHt: eurosDeCentimes(reglages.prixAnnuelHtCentimes), prixDes: prixParMoisAnnuel(reglages), offres: offresAbonnement(reglages), moyenneReelle: moyenne.cycles >= SEUIL_CYCLES_ECONOMIE && !!moyenne.parCommande };
  }
}
