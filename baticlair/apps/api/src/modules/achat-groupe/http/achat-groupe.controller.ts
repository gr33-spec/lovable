import { Body, Controller, Delete, Get, Header, Headers, HttpCode, Inject, Param, Post, Put, Query, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CONDITIONS_OUVERTURE, MOTIFS_SORTIE, PAIEMENTS_DEPART, REGLAGES_ALERTES } from "@baticlair/domain";
import { z } from "zod";
import type { AppConfig } from "../../../platform/config/config.js";
import { forbidden } from "../../../platform/errors/domain-error.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CONFIG } from "../../../platform/tokens.js";
import { CurrentUser, Public, type AuthenticatedUser } from "../../identity/index.js";
import { PilotageService } from "../../pilotage/index.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { AchatGroupeService, type NegoceAjoute } from "../application/achat-groupe.service.js";

/** En test seulement : « maintenant » se règle par la requête (clôture, échéance). */
function instant(config: AppConfig, demande?: string): Date {
  return config.env === "test" && demande && !Number.isNaN(Date.parse(demande)) ? new Date(demande) : new Date();
}

const negoce = z.union([
  z.object({ supplierId: z.uuid() }),
  z.object({ negoceId: z.uuid() }),
  z.object({ nom: z.string().trim().min(1).max(120), email: z.email().max(254), telephone: z.string().trim().max(30).nullable().optional() }),
]);
// Précision 1 (27 octobre 2026) : au moins un négoce ; le message vient du service (« Ajoute au moins un négoce… »).
const negoces = z.array(negoce).max(10);
const ligne = z.object({ designation: z.string().trim().min(3).max(300), quantite: z.number().positive().max(10_000_000), unite: z.string().trim().min(1).max(40) });
const engagerBody = z.object({
  achatId: z.uuid().nullable().optional(),
  lignes: z.array(ligne).min(1).max(200),
  livraison: z.string().trim().min(3).max(300),
  dateBesoin: z.iso.date().nullable().optional(),
  negoces,
  engagement: z.boolean(),
});
const modifierBody = z.object({ quantites: z.record(z.string().max(60), z.number().min(0).max(10_000_000)).optional(), negoces: negoces.optional() });
const listeBody = z.object({
  confirmees: z.array(z.string().min(1).max(200)).max(500),
  dateBesoin: z.iso.date().nullable().optional(),
  livraison: z.string().trim().min(3).max(300).nullable().optional(),
  negoces,
  engagement: z.boolean(),
  achatId: z.uuid().nullable().optional(),
});
const sortirBody = z.object({ motif: z.enum(MOTIFS_SORTIE) });
const commanderBody = z.object({ consultationId: z.uuid() });
const coordonneesBody = z.object({ consultationId: z.uuid(), consentement: z.boolean() });
const livreBody = z.object({ probleme: z.string().trim().min(1).max(1000).nullable().optional() });
const alertesBody = z.object({ reglage: z.enum(REGLAGES_ALERTES) });
const reponseBody = z.object({
  accepteConditions: z.literal(true),
  prix: z.record(z.string().max(200), z.number().positive().max(1_000_000).nullable()).nullable().optional(),
  delaiJours: z.number().int().min(0).max(365).nullable().optional(),
  commentaire: z.string().trim().max(1000).nullable().optional(),
  pdf: z.object({ nom: z.string().trim().min(1).max(200), contenuBase64: z.string().min(10).max(12_000_000) }).nullable().optional(),
  conditionsOuverture: z
    .object({ pieces: z.array(z.enum(CONDITIONS_OUVERTURE)).max(10), paiement: z.enum(PAIEMENTS_DEPART).nullable(), autre: z.string().trim().max(300).nullable().optional() })
    .nullable()
    .optional(),
});
const excelBody = z.object({ contenuBase64: z.string().min(10).max(6_000_000) });
const avancerBody = z.object({ etape: z.enum(["cloture", "echeance", "commande"]) });
const volumeBody = z.object({ famille: z.string().trim().min(1).max(40), montantHt: z.number().min(0).max(1_000_000) });
const prixBody = z.object({ cle: z.string().min(1).max(200), prixHt: z.number().positive().max(1_000_000).nullable() });

const date = (s: string) => new Date(`${s}T00:00:00Z`);

/**
 * L'ACHAT GROUPÉ PAR MÉTIER, CÔTÉ ARTISAN (Greg, 27 octobre 2026, 2e message) : le catalogue, ses négoces, s'engager, ses
 * cartes et leur détail, modifier, retirer, se désister, « Je l'ai prévenu », l'offre et la commande, le plan B, les
 * lignes d'une liste à acheter en groupe, le réglage des alertes.
 */
@Controller("v1")
@UseGuards(TenantGuard)
export class AchatGroupeController {
  constructor(@Inject(AchatGroupeService) private readonly achats: AchatGroupeService) {}

  @Get("achats-groupes/catalogue")
  catalogue(@Tenant() tenant: TenantContext, @Query("q") q?: string) {
    return this.achats.catalogue(tenant, (q ?? "").slice(0, 100));
  }

  @Get("achats-groupes/negoces")
  negoces(@Tenant() tenant: TenantContext, @Query("q") q?: string) {
    return this.achats.negoces(tenant, (q ?? "").slice(0, 100));
  }

  @Get("achats-groupes")
  mesAchats(@Tenant() tenant: TenantContext) {
    return this.achats.mesAchats(tenant);
  }

  @Get("achats-groupes/pres-de-chez-moi")
  presDeChezMoi(@Tenant() tenant: TenantContext) {
    return this.achats.presDeChezMoi(tenant);
  }

  @Post("achats-groupes")
  engager(@Tenant() tenant: TenantContext, @Body(new ZodPipe(engagerBody)) b: z.infer<typeof engagerBody>) {
    return this.achats.engager(tenant, { ...b, achatId: b.achatId ?? null, dateBesoin: b.dateBesoin ? date(b.dateBesoin) : null, negoces: b.negoces as NegoceAjoute[] });
  }

  @Get("achats-groupes/:besoinId")
  detail(@Tenant() tenant: TenantContext, @Param("besoinId") besoinId: string) {
    return this.achats.detail(tenant, besoinId);
  }

  @Put("achats-groupes/:besoinId")
  modifier(@Tenant() tenant: TenantContext, @Param("besoinId") besoinId: string, @Body(new ZodPipe(modifierBody)) b: z.infer<typeof modifierBody>) {
    return this.achats.modifier(tenant, besoinId, { quantites: b.quantites, negoces: b.negoces as NegoceAjoute[] | undefined });
  }

  @Delete("achats-groupes/:besoinId/negoces/:participantId")
  retirerNegoce(@Tenant() tenant: TenantContext, @Param("besoinId") besoinId: string, @Param("participantId") participantId: string) {
    return this.achats.retirerNegoce(tenant, besoinId, participantId);
  }

  @Get("achats-groupes/:besoinId/prevenir")
  prevenir(@Tenant() tenant: TenantContext, @Param("besoinId") besoinId: string) {
    return this.achats.ecranPrevenir(tenant, besoinId);
  }

  @Post("achats-groupes/negoces/:participantId/prevenu")
  @HttpCode(200)
  prevenu(@Tenant() tenant: TenantContext, @Param("participantId") participantId: string) {
    return this.achats.prevenu(tenant, participantId);
  }

  @Post("achats-groupes/:besoinId/retirer")
  @HttpCode(200)
  retirer(@Tenant() tenant: TenantContext, @Param("besoinId") besoinId: string) {
    return this.achats.retirer(tenant, besoinId);
  }

  @Post("achats-groupes/:besoinId/sortir")
  @HttpCode(200)
  sortir(@Tenant() tenant: TenantContext, @Param("besoinId") besoinId: string, @Body(new ZodPipe(sortirBody)) b: z.infer<typeof sortirBody>) {
    return this.achats.sortir(tenant, besoinId, b.motif);
  }

  @Post("achats-groupes/:besoinId/coordonnees")
  @HttpCode(200)
  coordonnees(@Tenant() tenant: TenantContext, @Param("besoinId") besoinId: string, @Body(new ZodPipe(coordonneesBody)) b: z.infer<typeof coordonneesBody>) {
    return this.achats.transmettreCoordonnees(tenant, besoinId, b.consultationId, b.consentement);
  }

  @Post("achats-groupes/:besoinId/livre")
  @HttpCode(200)
  livre(@Tenant() tenant: TenantContext, @Param("besoinId") besoinId: string, @Body(new ZodPipe(livreBody)) b: z.infer<typeof livreBody>) {
    return this.achats.livre(tenant, besoinId, b.probleme ?? null);
  }

  @Post("achats-groupes/:besoinId/commander")
  @HttpCode(200)
  commander(@Tenant() tenant: TenantContext, @Param("besoinId") besoinId: string, @Body(new ZodPipe(commanderBody)) b: z.infer<typeof commanderBody>) {
    return this.achats.commander(tenant, besoinId, b.consultationId);
  }

  @Get("achats-groupes/:besoinId/bon.pdf")
  async bon(@Tenant() tenant: TenantContext, @Param("besoinId") besoinId: string, @Res() res: { setHeader(n: string, v: string): void; end(b: Buffer): void }) {
    const pdf = await this.achats.bonPdf(tenant, besoinId);
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", 'attachment; filename="bon-de-commande.pdf"');
    res.end(Buffer.from(pdf));
  }

  @Post("achats-groupes/:besoinId/plan-b")
  @HttpCode(200)
  planB(@Tenant() tenant: TenantContext, @Param("besoinId") besoinId: string) {
    return this.achats.planB(tenant, besoinId);
  }

  @Get("projects/:projectId/achat-groupe")
  depuisListe(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string) {
    return this.achats.depuisListe(tenant, projectId);
  }

  @Post("projects/:projectId/achat-groupe")
  lancerDepuisListe(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string, @Body(new ZodPipe(listeBody)) b: z.infer<typeof listeBody>) {
    return this.achats.lancerDepuisListe(tenant, projectId, { confirmees: b.confirmees, dateBesoin: b.dateBesoin ? date(b.dateBesoin) : null, livraison: b.livraison ?? null, negoces: b.negoces as NegoceAjoute[], engagement: b.engagement, achatId: b.achatId ?? null });
  }

  @Get("me/alertes-achats-groupes")
  alertes(@Tenant() tenant: TenantContext) {
    return this.achats.reglageAlertes(tenant);
  }

  @Put("me/alertes-achats-groupes")
  changerAlertes(@Tenant() tenant: TenantContext, @Body(new ZodPipe(alertesBody)) b: z.infer<typeof alertesBody>) {
    return this.achats.changerAlertes(tenant, b.reglage);
  }
}

/** LA RÉPONSE DU NÉGOCE, SANS INSCRIPTION (vouvoiement côté écran) : une seule offre, avant l'échéance. */
@Controller("v1/public/achat-groupe")
export class AchatGroupePublicController {
  constructor(@Inject(AchatGroupeService) private readonly achats: AchatGroupeService) {}

  @Public()
  @Throttle({ default: HOURLY(120) })
  @Get(":jeton")
  page(@Param("jeton") jeton: string) {
    return this.achats.page(jeton);
  }

  @Public()
  @Throttle({ default: HOURLY(30) })
  @Post(":jeton")
  @HttpCode(200)
  repondre(@Param("jeton") jeton: string, @Body(new ZodPipe(reponseBody)) b: z.infer<typeof reponseBody>) {
    return this.achats.repondre(jeton, {
      accepteConditions: b.accepteConditions,
      prix: b.prix ?? null,
      delaiJours: b.delaiJours ?? null,
      commentaire: b.commentaire ?? null,
      pdf: b.pdf ?? null,
      conditionsOuverture: b.conditionsOuverture ? { pieces: b.conditionsOuverture.pieces, paiement: b.conditionsOuverture.paiement, autre: b.conditionsOuverture.autre ?? null } : null,
    });
  }

  /** « Télécharger en PDF » (Greg, 28 octobre 2026, point 3). */
  @Public()
  @Throttle({ default: HOURLY(60) })
  @Get(":jeton/demande.pdf")
  async demandePdf(@Param("jeton") jeton: string, @Res() res: { setHeader(n: string, v: string): void; end(b: Buffer): void }) {
    const pdf = await this.achats.demandePdf(jeton);
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", 'attachment; filename="demande-mobiiz.pdf"');
    res.end(Buffer.from(pdf));
  }

  /** « Exporter en Excel ». */
  @Public()
  @Throttle({ default: HOURLY(60) })
  @Get(":jeton/demande.xlsx")
  async demandeXlsx(@Param("jeton") jeton: string, @Res() res: { setHeader(n: string, v: string): void; end(b: Buffer): void }) {
    const xlsx = await this.achats.demandeXlsx(jeton);
    res.setHeader("content-type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("content-disposition", 'attachment; filename="demande-mobiiz.xlsx"');
    res.end(xlsx);
  }

  /** « Déposer l'Excel rempli » : lu par le code, les lignes reviennent pour confirmation. */
  @Public()
  @Throttle({ default: HOURLY(30) })
  @Post(":jeton/excel")
  @HttpCode(200)
  lireExcel(@Param("jeton") jeton: string, @Body(new ZodPipe(excelBody)) b: z.infer<typeof excelBody>) {
    return this.achats.lireExcel(jeton, b.contenuBase64);
  }

  /** Le lien du bon de commande : « Commande reçue » d'un clic. */
  @Public()
  @Throttle({ default: HOURLY(120) })
  @Get("commande/:jeton")
  commande(@Param("jeton") jeton: string) {
    return this.achats.pageCommande(jeton);
  }

  @Public()
  @Throttle({ default: HOURLY(30) })
  @Post("commande/:jeton")
  @HttpCode(200)
  commandeRecue(@Param("jeton") jeton: string) {
    return this.achats.commandeRecue(jeton);
  }
}

/** La tâche du jour (Vercel Cron, après la clôture de 10 h UTC) et l'admin des achats groupés. */
@Controller("v1")
export class AchatGroupeTacheController {
  constructor(
    @Inject(AchatGroupeService) private readonly achats: AchatGroupeService,
    @Inject(PilotageService) private readonly pilotage: PilotageService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Throttle({ default: HOURLY(120) })
  @Get("internal/achats-groupes")
  tache(@Headers("authorization") authorization: string | undefined, @Query("maintenant") m?: string) {
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Scheduled task only");
    return this.achats.tache(instant(this.config, m));
  }

  @Get("admin/pilotage/achats-groupes")
  async admin(@CurrentUser() user: AuthenticatedUser, @Query("maintenant") m?: string) {
    await this.pilotage.exiger(user);
    return this.achats.admin(instant(this.config, m));
  }

  @Put("admin/pilotage/achats-groupes/volume-min")
  async volumeMin(@CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(volumeBody)) b: z.infer<typeof volumeBody>) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "achat_groupe_volume_min", `${b.famille}=${b.montantHt}`);
    return { volumesMin: await this.achats.changerVolumeMin(b.famille, b.montantHt) };
  }

  /** Recette en prévisualisation : « Clôturer maintenant » / « Analyser maintenant ». Jamais en production. */
  @Post("admin/pilotage/achats-groupes/:id/avancer")
  @HttpCode(200)
  async avancer(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body(new ZodPipe(avancerBody)) b: z.infer<typeof avancerBody>) {
    if (this.config.env === "production" && !this.config.previewOriginPattern) throw forbidden("Never in production");
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "achat_groupe_avancer", `${id}:${b.etape}`);
    return this.achats.avancer(id, b.etape);
  }

  /** L'écran de validation d'un achat (point 14). */
  @Get("admin/pilotage/achats-groupes/:id")
  async achat(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.pilotage.exiger(user);
    return this.achats.adminAchat(id);
  }

  @Post("admin/pilotage/achats-groupes/:id/publier")
  @HttpCode(200)
  async publier(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "achat_groupe_publie", id);
    return this.achats.publier(id, user.email);
  }

  @Post("admin/pilotage/achats-groupes/consultations/:id/valider")
  @HttpCode(200)
  async valider(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "achat_groupe_offre_validee", id);
    return this.achats.validerOffre(id, user.email);
  }

  @Post("admin/pilotage/achats-groupes/consultations/:id/ecarter")
  @HttpCode(200)
  async ecarter(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "achat_groupe_offre_ecartee", id);
    return this.achats.ecarter(id, user.email);
  }

  @Put("admin/pilotage/achats-groupes/consultations/:id/prix")
  async prix(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body(new ZodPipe(prixBody)) b: z.infer<typeof prixBody>) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "achat_groupe_prix_corrige", `${id}:${b.cle}=${b.prixHt}`);
    return this.achats.corrigerPrix(id, b.cle, b.prixHt, user.email);
  }

  @Get("admin/pilotage/achats-groupes/consultations/:id/devis.pdf")
  @Header("content-type", "application/pdf")
  async devis(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Res() res: { end(b: Buffer): void }) {
    await this.pilotage.exiger(user);
    res.end(Buffer.from(await this.achats.devisPdf(id)));
  }
}
