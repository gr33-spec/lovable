import { Body, Controller, Get, Header, HttpCode, Inject, Param, Post, Put, Res, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { MODES_REGROUPEMENT } from "@baticlair/domain";
import { notFound } from "../../../platform/errors/domain-error.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CurrentUser, type AuthenticatedUser } from "../../identity/index.js";
import { PilotageService } from "../../pilotage/index.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { DemandePersoService } from "../application/demande-perso.service.js";
import { DroitsService } from "../application/droits.service.js";
import { NegocieService } from "../application/negocie.service.js";
import { ObservatoireService } from "../application/observatoire.service.js";
import { PrismaService } from "../../../platform/database/prisma.service.js";

const declarerBody = z.object({
  projectId: z.uuid().nullable().optional(),
  articleKey: z.string().min(1).max(200).nullable().optional(),
  designation: z.string().trim().min(1).max(300).nullable().optional(),
  quantite: z.number().positive().max(10_000_000).nullable().optional(),
  unite: z.string().trim().min(1).max(40).nullable().optional(),
  dateBesoin: z.iso.date(),
  livraison: z.string().trim().min(3).max(300).nullable().optional(),
});
const appelBody = z.object({ negoce: z.string().trim().min(1).max(120), note: z.string().trim().max(500) });
const offreBody = z.object({
  negoceNom: z.string().trim().min(1).max(120),
  negoceEmail: z.email().max(254),
  negoceTelephone: z.string().trim().max(30).nullable().optional(),
  prixNegocieHt: z.number().positive().max(1_000_000),
  commissionPct: z.number().min(0).max(20).nullable().optional(),
  livraisonHt: z.number().min(0).max(100_000),
  conditions: z.string().trim().max(1000).nullable().optional(),
  valideJusquau: z.iso.date(),
});
const modeBody = z.object({ mode: z.enum(MODES_REGROUPEMENT) });

/**
 * LE REGROUPEMENT NÉGOCIÉ, CÔTÉ ARTISAN (business model final, Greg, 25 octobre 2026) : ses besoins, ses lignes en
 * veille, l'offre à accepter ou refuser, le bon de commande ; « Préviens ton négoce » ; le bloc « Prix observés dans ton
 * secteur » de « Mes prix ».
 */
@Controller("v1")
@UseGuards(TenantGuard)
export class NegocieController {
  constructor(
    @Inject(NegocieService) private readonly negocie: NegocieService,
    @Inject(DemandePersoService) private readonly demandes: DemandePersoService,
    @Inject(ObservatoireService) private readonly observatoire: ObservatoireService,
    @Inject(DroitsService) private readonly droits: DroitsService,
  ) {}

  @Get("regroupement/mode")
  async mode() {
    return { mode: await this.negocie.mode() };
  }

  @Get("negocie")
  mesBesoins(@Tenant() tenant: TenantContext) {
    return this.negocie.mesBesoins(tenant);
  }

  @Get("projects/:projectId/negocie/lignes")
  lignes(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string) {
    return this.negocie.lignesNegociables(tenant, projectId);
  }

  @Post("negocie/besoins")
  declarer(@Tenant() tenant: TenantContext, @Body(new ZodPipe(declarerBody)) body: z.infer<typeof declarerBody>) {
    return this.negocie.declarer(tenant, {
      projectId: body.projectId ?? null,
      articleKey: body.articleKey ?? null,
      designation: body.designation ?? null,
      quantite: body.quantite ?? null,
      unite: body.unite ?? null,
      dateBesoin: new Date(`${body.dateBesoin}T00:00:00Z`),
      livraison: body.livraison ?? null,
    });
  }

  @Post("negocie/besoins/:id/accepter")
  @HttpCode(200)
  accepter(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return this.negocie.accepter(tenant, id);
  }

  @Post("negocie/besoins/:id/refuser")
  @HttpCode(200)
  refuser(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return this.negocie.refuser(tenant, id);
  }

  @Post("negocie/besoins/:id/ajouter")
  @HttpCode(200)
  ajouter(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return this.negocie.ajouterDepuisVeille(tenant, id);
  }

  @Post("negocie/besoins/:id/non-merci")
  @HttpCode(200)
  nonMerci(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return this.negocie.nonMerci(tenant, id);
  }

  @Post("negocie/besoins/:id/retirer")
  @HttpCode(200)
  retirer(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return this.negocie.retirer(tenant, id);
  }

  @Get("negocie/besoins/:id/bon.pdf")
  @Header("content-type", "application/pdf")
  async bon(@Tenant() tenant: TenantContext, @Param("id") id: string, @Res() res: { setHeader(k: string, v: string): void; end(b: Buffer): void }) {
    const pdf = await this.negocie.bonPdf(tenant, id);
    res.setHeader("content-disposition", 'inline; filename="bon-de-commande.pdf"');
    res.end(Buffer.from(pdf));
  }

  @Get("demandes-perso/:id/prevenir")
  aPrevenir(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return this.demandes.aPrevenir(tenant, id);
  }

  @Post("suppliers/:id/prevenu")
  @HttpCode(200)
  prevenu(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return this.demandes.marquerPrevenu(tenant, id);
  }

  @Get("mes-prix/secteur")
  async secteur(@Tenant() tenant: TenantContext) {
    const zone = await this.droits.zoneDe(tenant.companyId);
    return { departement: zone, articles: await this.observatoire.secteur(zone) };
  }
}

/** LE CHASSEUR D'OPPORTUNITÉS (rôle `CHASSEURS`, double authentification) : prendre en charge, appeler, offrir, transmettre. */
@Controller("v1/chasseur")
export class ChasseurController {
  constructor(
    @Inject(NegocieService) private readonly negocie: NegocieService,
    @Inject(PilotageService) private readonly pilotage: PilotageService,
  ) {}

  @Get("statut")
  async statut(@CurrentUser() user: AuthenticatedUser) {
    const etat = (await this.pilotage.exigerChasseur(user).then(() => "ok").catch((e: { details?: { reason?: string } }) => e.details?.reason ?? "non")) as string;
    return { chasseur: etat !== "non", deuxFacteurs: etat === "ok" };
  }

  @Get("regroupements")
  async liste(@CurrentUser() user: AuthenticatedUser) {
    await this.pilotage.exigerChasseur(user);
    return this.negocie.regroupementsDuChasseur();
  }

  @Post("regroupements/:id/prendre")
  @HttpCode(200)
  async prendre(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const c = await this.pilotage.exigerChasseur(user);
    await this.pilotage.journal(user, "chasseur_prise_en_charge", id);
    return this.negocie.prendreEnCharge(c, id);
  }

  @Post("regroupements/:id/appels")
  @HttpCode(200)
  async appel(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body(new ZodPipe(appelBody)) body: z.infer<typeof appelBody>) {
    const c = await this.pilotage.exigerChasseur(user);
    return this.negocie.noterAppel(c, id, body);
  }

  @Put("regroupements/:id/offre")
  async offre(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body(new ZodPipe(offreBody)) body: z.infer<typeof offreBody>) {
    const c = await this.pilotage.exigerChasseur(user);
    return this.negocie.saisirOffre(c, id, {
      negoceNom: body.negoceNom,
      negoceEmail: body.negoceEmail,
      negoceTelephone: body.negoceTelephone ?? null,
      prixNegocieHt: body.prixNegocieHt,
      commissionPct: body.commissionPct ?? null,
      livraisonHt: body.livraisonHt,
      conditions: body.conditions ?? null,
      valideJusquau: new Date(`${body.valideJusquau}T00:00:00Z`),
    });
  }

  @Post("regroupements/:id/envoyer")
  @HttpCode(200)
  async envoyer(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const c = await this.pilotage.exigerChasseur(user);
    await this.pilotage.journal(user, "chasseur_offre_envoyee", id);
    return this.negocie.envoyerOffre(c, id);
  }

  @Post("regroupements/:id/transmettre")
  @HttpCode(200)
  async transmettre(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const c = await this.pilotage.exigerChasseur(user);
    await this.pilotage.journal(user, "chasseur_commande_transmise", id);
    return this.negocie.transmettre(c, id);
  }

  @Post("regroupements/:id/abandonner")
  @HttpCode(200)
  async abandonner(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const c = await this.pilotage.exigerChasseur(user);
    return this.negocie.abandonner(c, id);
  }
}

/** L'admin : le mode des regroupements, les négoces à vérifier, l'export de l'observatoire. */
@Controller("v1/admin/pilotage")
export class NegocieAdminController {
  constructor(
    @Inject(NegocieService) private readonly negocie: NegocieService,
    @Inject(PilotageService) private readonly pilotage: PilotageService,
    @Inject(ObservatoireService) private readonly observatoire: ObservatoireService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  @Get("mode-regroupement")
  async mode(@CurrentUser() user: AuthenticatedUser) {
    await this.pilotage.exiger(user);
    return { mode: await this.negocie.mode() };
  }

  @Put("mode-regroupement")
  async changerMode(@CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(modeBody)) body: z.infer<typeof modeBody>) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "mode_regroupement", body.mode);
    return this.negocie.changerMode(body.mode);
  }

  /** Les négoces inscrits « à vérifier » ou bloqués, et le badge « Nouveau négoce » (aucune commande livrée). */
  @Get("negoces-a-verifier")
  async aVerifier(@CurrentUser() user: AuthenticatedUser) {
    await this.pilotage.exiger(user);
    const comptes = await this.prisma.compteNegoce.findMany({ where: { inscritLe: { not: null } }, orderBy: { inscritLe: "desc" }, take: 200, select: { id: true, enseigne: true, raisonSociale: true, email: true, siret: true, naf: true, verification: true, telephone: true, departements: true } });
    const sortie = [];
    for (const c of comptes) {
      const livree =
        !!(await this.prisma.priceRequestRecipient.findFirst({ where: { livreLe: { not: null }, supplier: { email: { equals: c.email, mode: "insensitive" } } }, select: { id: true } })) ||
        !!(await this.prisma.bonCommande.findFirst({ where: { livraison: { statut: "livre" }, negoce: { compteId: c.id } }, select: { id: true } }));
      sortie.push({ ...c, verification: c.verification ?? "valide", nouveau: !livree });
    }
    return { negoces: sortie };
  }

  @Post("negoces/:id/valider")
  @HttpCode(200)
  async valider(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.pilotage.exiger(user);
    const c = await this.prisma.compteNegoce.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw notFound("Negoce");
    await this.prisma.compteNegoce.update({ where: { id }, data: { verification: "valide", valideParAdminLe: new Date() } });
    await this.pilotage.journal(user, "negoce_valide", id);
    return { fait: true };
  }

  @Post("negoces/:id/bloquer")
  @HttpCode(200)
  async bloquer(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.pilotage.exiger(user);
    const c = await this.prisma.compteNegoce.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw notFound("Negoce");
    await this.prisma.compteNegoce.update({ where: { id }, data: { verification: "bloque" } });
    await this.pilotage.journal(user, "negoce_bloque", id);
    return { fait: true };
  }

  @Get("observatoire.csv")
  @Header("content-type", "text/csv; charset=utf-8")
  @Header("content-disposition", 'attachment; filename="observations-prix.csv"')
  async csv(@CurrentUser() user: AuthenticatedUser) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "export_observatoire");
    return this.observatoire.csv();
  }
}
