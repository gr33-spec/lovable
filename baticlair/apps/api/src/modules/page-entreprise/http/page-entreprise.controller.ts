import { Body, Controller, Delete, Get, Headers, HttpCode, Inject, NotFoundException, Param, Patch, Post, Put, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { memoryStorage } from "multer";
import { z } from "zod";
import type { AppConfig } from "../../../platform/config/config.js";
import { PrismaService } from "../../../platform/database/prisma.service.js";
import { forbidden } from "../../../platform/errors/domain-error.js";
import { exigerDeuxFacteurs } from "../../../platform/http/deux-facteurs.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { exigerTurnstile } from "../../../platform/http/turnstile.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { qrSvg } from "../../../platform/qr/qr.js";
import { currentRequestContext } from "../../../platform/logging/request-context.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Public } from "../../identity/index.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { AideEcriture } from "../application/aide-ecriture.js";
import { LIBELLES_METIERS, MOTIFS_SIGNALEMENT_PAGE, PageEntrepriseService } from "../application/page-entreprise.service.js";
import { PHOTO_MAX_OCTETS } from "../application/photos.js";
import { StockageLocal } from "../infrastructure/stockage-photos.js";
import { STOCKAGE_PAGES } from "../tokens.js";

const texte = (max: number) => z.string().max(max * 2).nullable().optional();
const corpsReglages = z.object({
  visible: z.boolean().optional(),
  modele: z.string().max(20).optional(),
  couleur: z.string().max(7).nullable().optional(),
  fond: z.enum(["clair", "sombre"]).nullable().optional(),
  pictos: z.boolean().optional(),
  motif: z.boolean().optional(),
  accroche: texte(90),
  presentation: texte(900),
  telephone: texte(25),
  zone: texte(120),
  horaires: texte(200),
  siteWeb: texte(200),
  creeeEn: z.number().int().nullable().optional(),
  certifications: z.array(z.string().max(120)).max(20).optional(),
  afficherAdresse: z.boolean().optional(),
});
const corpsAdresse = z.object({ adresse: z.string().trim().min(1).max(80) });
const corpsLegende = z.object({ legende: z.string().max(240).nullable() });
const corpsOrdre = z.object({ ids: z.array(z.string().max(40)).max(40) });
const corpsAide = z.object({ accroche: z.string().max(400).nullish(), presentation: z.string().max(4000).nullish() });
const corpsContact = z.object({
  nom: z.string().trim().min(2).max(80),
  telephone: z.string().trim().max(25).nullish(),
  email: z.email().max(200).nullish(),
  commune: z.string().trim().max(80).nullish(),
  message: z.string().trim().min(5).max(2000),
});
const corpsSignalement = z.object({ motif: z.enum(MOTIFS_SIGNALEMENT_PAGE.map((m) => m.id) as [string, ...string[]]), precision: z.string().trim().max(1000).nullish() });
const corpsMasquage = z.object({ masquer: z.boolean(), motif: z.string().trim().max(300).nullish() });

/** Les réglages de SA page : seule l'entreprise active (`x-company-id`, membre vérifié par le garde) les lit et les change. */
@Controller("v1/ma-page")
@UseGuards(TenantGuard)
export class MaPageController {
  constructor(
    @Inject(PageEntrepriseService) private readonly pages: PageEntrepriseService,
    @Inject(AideEcriture) private readonly aide: AideEcriture,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Get()
  lire(@Tenant() t: TenantContext) {
    return this.pages.maPage(t);
  }

  @Patch()
  modifier(@Tenant() t: TenantContext, @Body(new ZodPipe(corpsReglages)) b: z.infer<typeof corpsReglages>) {
    // Champ par champ (l'hébergeur compile en mode non strict, cf. CLAUDE.md).
    return this.pages.modifier(t, {
      ...(b.visible !== undefined ? { visible: b.visible } : {}),
      ...(b.modele !== undefined ? { modele: b.modele } : {}),
      ...(b.couleur !== undefined ? { couleur: b.couleur } : {}),
      ...(b.fond !== undefined ? { fond: b.fond } : {}),
      ...(b.pictos !== undefined ? { pictos: b.pictos } : {}),
      ...(b.motif !== undefined ? { motif: b.motif } : {}),
      ...(b.accroche !== undefined ? { accroche: b.accroche } : {}),
      ...(b.presentation !== undefined ? { presentation: b.presentation } : {}),
      ...(b.telephone !== undefined ? { telephone: b.telephone } : {}),
      ...(b.zone !== undefined ? { zone: b.zone } : {}),
      ...(b.horaires !== undefined ? { horaires: b.horaires } : {}),
      ...(b.siteWeb !== undefined ? { siteWeb: b.siteWeb } : {}),
      ...(b.creeeEn !== undefined ? { creeeEn: b.creeeEn } : {}),
      ...(b.certifications !== undefined ? { certifications: b.certifications } : {}),
      ...(b.afficherAdresse !== undefined ? { afficherAdresse: b.afficherAdresse } : {}),
    });
  }

  @Put("adresse")
  changerAdresse(@Tenant() t: TenantContext, @Body(new ZodPipe(corpsAdresse)) b: z.infer<typeof corpsAdresse>) {
    return this.pages.changerAdresse(t, b.adresse);
  }

  /** « Partager » : le QR code de l'adresse de la page (SVG, généré par le code, aucun service tiers). */
  @Get("qr.svg")
  async qr(@Tenant() t: TenantContext, @Res() res: Response) {
    const [adresse] = await this.pages.adressesARafraichir(t.companyId);
    if (!adresse) throw new NotFoundException();
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(qrSvg(`${this.config.webAppUrl.replace(/\/$/, "")}/e/${adresse}`, 240));
  }

  /** Pour le site : les adresses dont le cache est à régénérer après un changement. */
  @Get("adresses")
  async adresses(@Tenant() t: TenantContext) {
    return { adresses: await this.pages.adressesARafraichir(t.companyId) };
  }

  /** Une photo (multipart, champ `file`), `role` galerie ou couverture ; traitée en arrière-plan (statut « traitement »). */
  @Throttle({ default: HOURLY(120) })
  @Post("photos")
  @HttpCode(202)
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: PHOTO_MAX_OCTETS + 1, files: 1 } }))
  ajouterPhoto(@Tenant() t: TenantContext, @UploadedFile() file: { buffer: Buffer } | undefined, @Body() b: { role?: string; legende?: string }) {
    return this.pages.ajouterPhoto(t, file?.buffer ?? Buffer.alloc(0), b?.role === "couverture" ? "couverture" : "galerie", typeof b?.legende === "string" ? b.legende : null);
  }

  @Put("photos/ordre")
  ordonner(@Tenant() t: TenantContext, @Body(new ZodPipe(corpsOrdre)) b: z.infer<typeof corpsOrdre>) {
    return this.pages.ordonner(t, b.ids);
  }

  @Patch("photos/:id")
  legende(@Tenant() t: TenantContext, @Param("id") id: string, @Body(new ZodPipe(corpsLegende)) b: z.infer<typeof corpsLegende>) {
    return this.pages.modifierPhoto(t, id, b.legende);
  }

  @Delete("photos/:id")
  supprimer(@Tenant() t: TenantContext, @Param("id") id: string) {
    return this.pages.supprimerPhoto(t, id);
  }

  @Delete("couverture")
  retirerCouverture(@Tenant() t: TenantContext) {
    return this.pages.retirerCouverture(t);
  }

  /** « Mobiiz m'aide à l'écrire » : une proposition, jamais enregistrée sans l'artisan. */
  @Throttle({ default: HOURLY(20) })
  @Post("aide-ecriture")
  @HttpCode(200)
  async aideEcriture(@Tenant() t: TenantContext, @Body(new ZodPipe(corpsAide)) b: z.infer<typeof corpsAide>) {
    const { contenu } = await this.pages.maPage(t);
    return this.aide.proposer(t.companyId, t.userId, { nom: contenu.nom, metiers: contenu.metiers, zone: contenu.zone, creeeEn: contenu.creeeEn, certifications: contenu.certifications, verifiee: contenu.verifiee }, LIBELLES_METIERS, { accroche: b.accroche ?? null, presentation: b.presentation ?? null });
  }
}

/** Les visiteurs sans compte : la page visible, son logo, le formulaire de contact et « Signaler cette page ». Rien d'autre. */
@Controller("v1/public")
export class PagesPubliquesController {
  constructor(
    @Inject(PageEntrepriseService) private readonly pages: PageEntrepriseService,
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(STOCKAGE_PAGES) private readonly stockage: unknown,
  ) {}

  @Public()
  @Get("pages/:adresse")
  async page(@Param("adresse") adresse: string, @Res({ passthrough: true }) res: Response) {
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
    return this.pages.publique(adresse);
  }

  @Public()
  @Get("pages/:adresse/logo")
  async logo(@Param("adresse") adresse: string, @Res() res: Response) {
    const l = await this.pages.logoPublic(adresse);
    res.setHeader("Content-Type", l.type);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.send(Buffer.from(l.octets));
  }

  @Public()
  @Throttle({ default: HOURLY(10) })
  @Post("pages/:adresse/contact")
  @HttpCode(200)
  async contact(@Param("adresse") adresse: string, @Body(new ZodPipe(corpsContact)) b: z.infer<typeof corpsContact>, @Headers("x-captcha-response") captcha?: string) {
    const ip = currentRequestContext()?.ip;
    await exigerTurnstile(this.config.turnstileSecret, captcha, ip);
    return this.pages.contacter(adresse, { nom: b.nom, telephone: b.telephone?.trim() || null, email: b.email ?? null, commune: b.commune?.trim() || null, message: b.message }, ip);
  }

  @Public()
  @Throttle({ default: HOURLY(10) })
  @Post("pages/:adresse/signalement")
  @HttpCode(200)
  signaler(@Param("adresse") adresse: string, @Body(new ZodPipe(corpsSignalement)) b: z.infer<typeof corpsSignalement>) {
    return this.pages.signaler(adresse, b.motif as (typeof MOTIFS_SIGNALEMENT_PAGE)[number]["id"], b.precision ?? null, currentRequestContext()?.ip);
  }

  /** Les fichiers du stockage LOCAL (développement, tests) ; en ligne, les photos sont servies par le CDN du stockage objet. */
  @Public()
  @Get("fichiers-pages/*chemin")
  async fichier(@Param("chemin") chemin: string | string[], @Res() res: Response) {
    if (!(this.stockage instanceof StockageLocal)) throw new NotFoundException();
    const cle = (Array.isArray(chemin) ? chemin.join("/") : chemin).replace(/^\/+/, "");
    if (!/^pages\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/(\d+\.(avif|webp)|partage\.jpg)$/.test(cle)) throw new NotFoundException();
    const octets = await this.stockage.lire(cle).catch(() => null);
    if (!octets) throw new NotFoundException();
    res.setHeader("Content-Type", cle.endsWith(".avif") ? "image/avif" : cle.endsWith(".webp") ? "image/webp" : "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(octets);
  }
}

/** La modération : réservée aux `GROUPE_ADMINS` (code à 6 chiffres), chaque geste au journal de l'admin. */
@Controller("v1/admin/pages-publiques")
@UseGuards(TenantGuard)
export class PagesPubliquesAdminController {
  constructor(
    @Inject(PageEntrepriseService) private readonly pages: PageEntrepriseService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  private async garde(t: TenantContext): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: t.userId }, select: { email: true } });
    if (!user || !this.config.groupe.admins.includes(user.email.toLowerCase())) throw forbidden("Reserved to admins");
    await exigerDeuxFacteurs(this.prisma, t.userId);
    return user.email;
  }

  @Get()
  async liste(@Tenant() t: TenantContext) {
    await this.garde(t);
    return this.pages.listeAdmin();
  }

  /** Pour le site : les adresses d'une page à régénérer après un geste de l'admin. */
  @Get(":adresse/adresses")
  async adresses(@Tenant() t: TenantContext, @Param("adresse") adresse: string) {
    await this.garde(t);
    const p = await this.prisma.pageEntreprise.findUnique({ where: { adresse }, select: { companyId: true } });
    return { adresses: p ? await this.pages.adressesARafraichir(p.companyId) : [] };
  }

  @Put(":adresse/masquage")
  async masquer(@Tenant() t: TenantContext, @Param("adresse") adresse: string, @Body(new ZodPipe(corpsMasquage)) b: z.infer<typeof corpsMasquage>) {
    const email = await this.garde(t);
    const r = await this.pages.masquer(adresse, b.masquer, b.motif ?? null);
    await this.prisma.journalAdmin.create({ data: { userId: t.userId, email, action: b.masquer ? "page_publique:masquée" : "page_publique:rétablie", cible: adresse } });
    return { adresses: r.adresses };
  }

  @Post("signalements/:id/traite")
  @HttpCode(200)
  async traiter(@Tenant() t: TenantContext, @Param("id") id: string) {
    const email = await this.garde(t);
    const r = await this.pages.traiterSignalement(id);
    await this.prisma.journalAdmin.create({ data: { userId: t.userId, email, action: "page_publique:signalement traité", cible: id } });
    return r;
  }
}
