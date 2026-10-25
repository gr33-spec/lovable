import { FAMILLES_GROUPE } from "@baticlair/domain";
import { Body, Controller, Delete, Get, Headers, HttpCode, Inject, Param, Post, Put, Query, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { CONDITIONS_NEGOCE, CONDITIONS_NEGOCE_VERSION } from "@baticlair/domain";
import { z } from "zod";
import type { AppConfig } from "../../../platform/config/config.js";
import { DomainError, notFound } from "../../../platform/errors/domain-error.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Public } from "../../identity/index.js";
import { CommandeDuMoisService } from "../application/commande-du-mois.service.js";
import { EspaceNegoceService } from "../application/espace-negoce.service.js";
import { cookieNegoce, enTeteCookieNegoce } from "../application/jetons-negoce.js";
import { pdfDesDonnees } from "../../privacy/index.js";
import { NOM_APP } from "@baticlair/domain";

const departement = z.string().trim().regex(/^(\d{2}|2A|2B|97\d|98\d)$/);
const paliers = z.object({ gratuiteJusquaKm: z.union([z.number(), z.string()]), paliers: z.array(z.object({ jusquaKm: z.union([z.number(), z.string()]), prixHt: z.union([z.number(), z.string()]) })).max(2), maxKm: z.union([z.number(), z.string()]) });
const depots = z.array(z.object({ adresse: z.string().trim().max(300) })).min(1).max(10);
const inscriptionBody = z.object({
  jeton: z.string().min(10).max(600),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  siret: z.string().trim().max(20).nullish(),
  enseigne: z.string().trim().min(1).max(120),
  telephone: z.string().trim().max(30).nullish(),
  depots,
  livraison: paliers,
  departements: z.array(departement).max(20).nullish(),
  conditions: z.boolean(),
  // Multimétier (Greg, 25 octobre 2026) : « Généraliste : je chiffre toute la liste » ou « Spécialiste : mes familles ».
  offre: z.enum(["generaliste", "specialiste"]).optional(),
  familles: z.array(z.enum(FAMILLES_GROUPE)).max(FAMILLES_GROUPE.length).optional(),
});
const modifBody = z.object({ enseigne: z.string().trim().min(1).max(120).optional(), telephone: z.string().trim().max(30).nullish(), depots: depots.optional(), livraison: paliers.optional(), departements: z.array(departement).max(20).optional(), offre: z.enum(["generaliste", "specialiste"]).optional(), familles: z.array(z.enum(FAMILLES_GROUPE)).max(FAMILLES_GROUPE.length).optional() }).strict();
const connexionBody = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()) });
const desabonnerBody = z.object({ departement: departement.nullish() });

/** L'instant de la requête ; `?maintenant=` seulement en test. */
function instant(config: AppConfig, demande?: string): Date {
  return config.env === "test" && demande && !Number.isNaN(Date.parse(demande)) ? new Date(demande) : new Date();
}

/**
 * L'ESPACE NÉGOCE (Greg, 23 octobre 2026) : invitation, inscription en une page, lien magique, compte (dépôts, paliers,
 * départements, grilles en cours, commandes reçues), désabonnement, suppression. Toutes publiques au sens du garde de
 * session des artisans ; la session du négoce est un cookie signé, lu ici. 404 drapeau éteint.
 */
@Controller("v1/negoce")
export class EspaceNegoceController {
  constructor(
    @Inject(EspaceNegoceService) private readonly espace: EspaceNegoceService,
    @Inject(CommandeDuMoisService) private readonly commande: CommandeDuMoisService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  private actif() {
    if (!this.config.groupe.enabled) throw notFound("Route");
  }

  private get secure(): boolean {
    return this.config.env === "production" || this.config.env === "staging";
  }

  private async compteConnecte(cookie: string | undefined, m?: string): Promise<string> {
    const s = await this.espace.session(cookieNegoce(cookie), instant(this.config, m));
    if (!s) throw new DomainError("unauthenticated", "Négoce session required");
    return s.compteId;
  }

  @Public()
  @Throttle({ default: HOURLY(120) })
  @Get("invitation/:jeton")
  async invitation(@Param("jeton") jeton: string, @Query("maintenant") m?: string) {
    this.actif();
    return this.espace.invitation(jeton, instant(this.config, m));
  }

  @Public()
  @Throttle({ default: HOURLY(30) })
  @Post("inscription")
  @HttpCode(201)
  async inscrire(@Body(new ZodPipe(inscriptionBody)) body: z.infer<typeof inscriptionBody>, @Res({ passthrough: true }) res: Response, @Query("maintenant") m?: string) {
    this.actif();
    const maintenant = instant(this.config, m);
    const r = await this.espace.inscrire({ ...body, email: body.email ?? "" }, maintenant);
    res.setHeader("set-cookie", enTeteCookieNegoce(this.espace.jetonDeSession(r.compteId, maintenant), this.secure));
    return { phrase: r.phrase, departements: r.departements };
  }

  @Public()
  @Throttle({ default: HOURLY(20) })
  @Post("connexion")
  @HttpCode(200)
  async demanderConnexion(@Body(new ZodPipe(connexionBody)) body: z.infer<typeof connexionBody>, @Query("maintenant") m?: string) {
    this.actif();
    await this.espace.demanderConnexion(body.email ?? "", instant(this.config, m));
    return { envoye: true };
  }

  @Public()
  @Throttle({ default: HOURLY(60) })
  @Post("connexion/:jeton")
  @HttpCode(200)
  async connecter(@Param("jeton") jeton: string, @Res({ passthrough: true }) res: Response, @Query("maintenant") m?: string) {
    this.actif();
    const maintenant = instant(this.config, m);
    const { compteId } = await this.espace.connecter(jeton, maintenant);
    res.setHeader("set-cookie", enTeteCookieNegoce(this.espace.jetonDeSession(compteId, maintenant), this.secure));
    return { connecte: true };
  }

  @Public()
  @Post("deconnexion")
  @HttpCode(200)
  deconnexion(@Res({ passthrough: true }) res: Response) {
    res.setHeader("set-cookie", enTeteCookieNegoce(null, this.secure));
    return { deconnecte: true };
  }

  @Public()
  @Throttle({ default: HOURLY(240) })
  @Get("compte")
  async compte(@Headers("cookie") cookie: string | undefined, @Query("maintenant") m?: string) {
    this.actif();
    const compteId = await this.compteConnecte(cookie, m);
    return this.espace.compte(compteId, instant(this.config, m), (id) => this.commande.jetonDeGrille(id));
  }

  @Public()
  @Throttle({ default: HOURLY(60) })
  @Put("compte")
  async modifier(@Headers("cookie") cookie: string | undefined, @Body(new ZodPipe(modifBody)) body: z.infer<typeof modifBody>, @Query("maintenant") m?: string) {
    this.actif();
    const compteId = await this.compteConnecte(cookie, m);
    await this.espace.modifier(compteId, body, instant(this.config, m));
    return this.espace.compte(compteId, instant(this.config, m), (id) => this.commande.jetonDeGrille(id));
  }

  @Public()
  @Throttle({ default: HOURLY(30) })
  @Post("desabonner")
  @HttpCode(200)
  async desabonner(@Headers("cookie") cookie: string | undefined, @Body(new ZodPipe(desabonnerBody)) body: z.infer<typeof desabonnerBody>, @Query("maintenant") m?: string) {
    this.actif();
    const compteId = await this.compteConnecte(cookie, m);
    return this.espace.desabonner(compteId, body.departement ?? null, instant(this.config, m));
  }

  /** Le lien « Se désabonner » de chaque e-mail : signé, confirmé d'un bouton sur la page. */
  @Public()
  @Throttle({ default: HOURLY(60) })
  @Post("desabonner/:jeton")
  @HttpCode(200)
  async desabonnerParJeton(@Param("jeton") jeton: string, @Query("maintenant") m?: string) {
    this.actif();
    return this.espace.desabonnerParJeton(jeton, instant(this.config, m));
  }

  @Public()
  @Throttle({ default: HOURLY(10) })
  @Delete("compte")
  @HttpCode(200)
  async supprimer(@Headers("cookie") cookie: string | undefined, @Res({ passthrough: true }) res: Response, @Query("maintenant") m?: string) {
    this.actif();
    const compteId = await this.compteConnecte(cookie, m);
    await this.espace.supprimer(compteId, instant(this.config, m));
    res.setHeader("set-cookie", enTeteCookieNegoce(null, this.secure));
    return { supprime: true };
  }

  /** « Ne plus jamais être contacté » (RGPD, 24 octobre 2026) : la page lit l'enseigne, puis le négoce confirme. */
  @Public()
  @Throttle({ default: HOURLY(60) })
  @Get("opposition/:jeton")
  async opposition(@Param("jeton") jeton: string, @Query("maintenant") m?: string) {
    return this.espace.pageOpposition(jeton, instant(this.config, m));
  }

  @Public()
  @Throttle({ default: HOURLY(30) })
  @Post("opposition/:jeton")
  @HttpCode(200)
  async opposer(@Param("jeton") jeton: string, @Res({ passthrough: true }) res: Response, @Query("maintenant") m?: string) {
    const r = await this.espace.opposer(jeton, instant(this.config, m));
    res.setHeader("set-cookie", enTeteCookieNegoce(null, this.secure));
    return r;
  }

  /** Mes données (RGPD, accès et portabilité) : un fichier JSON, puis le même contenu en PDF lisible. */
  @Public()
  @Throttle({ default: HOURLY(10) })
  @Get("export")
  async export(@Headers("cookie") cookie: string | undefined, @Res({ passthrough: true }) res: Response, @Query("maintenant") m?: string) {
    const compteId = await this.compteConnecte(cookie, m);
    res.setHeader("Content-Disposition", `attachment; filename="mobiiz-negoce-mes-donnees-${new Date().toISOString().slice(0, 10)}.json"`);
    return this.espace.export(compteId);
  }

  @Public()
  @Throttle({ default: HOURLY(10) })
  @Get("export.pdf")
  async exportPdf(@Headers("cookie") cookie: string | undefined, @Res() res: Response, @Query("maintenant") m?: string) {
    const compteId = await this.compteConnecte(cookie, m);
    const pdf = await pdfDesDonnees(`Mes données ${NOM_APP} (négoce)`, await this.espace.export(compteId));
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", `attachment; filename="mobiiz-negoce-mes-donnees-${new Date().toISOString().slice(0, 10)}.pdf"`);
    res.send(Buffer.from(pdf));
  }

  /** Les conditions, versionnées : la page les lit ici (le texte vit dans le domaine). */
  @Public()
  @Get("conditions")
  conditions() {
    return { version: CONDITIONS_NEGOCE_VERSION, points: CONDITIONS_NEGOCE };
  }
}
