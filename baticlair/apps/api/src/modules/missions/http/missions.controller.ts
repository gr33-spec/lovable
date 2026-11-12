import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Put, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { FICHIER_MAX_OCTETS } from "@baticlair/domain";
import { memoryStorage } from "multer";
import { z } from "zod";
import { validationFailed } from "../../../platform/errors/domain-error.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CurrentUser, type AuthenticatedUser } from "../../identity/index.js";
import { PilotageService } from "../../pilotage/index.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { BoiteService } from "../application/boite.service.js";
import { MissionsService } from "../application/missions.service.js";

const jour = z.iso.date();
const court = (max: number) => z.string().trim().max(max);
const missionBody = z.object({
  type: z.literal("mission"),
  metier: court(60),
  lieu: court(80),
  codePostal: court(5),
  debut: jour,
  fin: jour,
  types: z.array(court(40)).max(4),
  description: court(1500),
  niveau: court(40).nullable().optional(),
  experience: court(40).nullable().optional(),
  qualifications: z.array(court(60)).max(10).optional(),
  equipe: court(40).nullable().optional(),
  contexte: court(600).nullable().optional(),
  modeChiffrage: court(40).nullable().optional(),
  budgetMin: z.number().nullable().optional(),
  budgetMax: z.number().nullable().optional(),
  frais: court(40).nullable().optional(),
  conditions: court(600).nullable().optional(),
});
const disponibiliteBody = z.object({
  type: z.literal("disponibilite"),
  metier: court(60),
  autreMetier: court(60).nullable().optional(),
  ville: court(80),
  codePostal: court(5),
  rayonKm: z.number(),
  debut: jour,
  fin: jour.nullable().optional(),
  types: z.array(court(40)).max(4),
  presentation: court(1500),
  equipe: court(40).nullable().optional(),
  tarifJour: z.number().nullable().optional(),
  tarifUnite: court(20).nullable().optional(),
  dureeMinJours: z.number().nullable().optional(),
  negociable: z.boolean().optional(),
  tarifVisible: z.boolean().optional(),
});
const annonceBody = z.discriminatedUnion("type", [missionBody, disponibiliteBody]);
const statutBody = z.object({ action: z.enum(["suspendre", "reprendre", "fermer"]) });
const garderBody = z.object({ garder: z.boolean() });
const reponseBody = z.object({
  niveau: court(40),
  experienceAns: z.number(),
  equipe: z.number(),
  message: court(1500),
  tarifJour: z.number().nullable().optional(),
  tarifUnite: court(20).nullable().optional(),
  jours: court(120).nullable().optional(),
  deplacement: court(40).nullable().optional(),
  documentIds: z.array(z.uuid()).max(12).optional(),
});
const ouvrirBody = z.object({ autreId: z.uuid().nullable() });
const messageBody = z.object({ texte: z.string().max(4000), cle: z.string().min(8).max(80) });
const coordonneesBody = z.object({ accepte: z.boolean() });
const archiveBody = z.object({ archive: z.boolean() });
const bloquerBody = z.object({ confirmer: z.literal(true) });
const signalerBody = z.object({ motif: court(40), precision: court(600).nullable().optional() });
const documentBody = z.object({ titre: court(120).nullable().optional(), surProfil: z.boolean().optional() });
const profilBody = z.object({ visible: z.boolean(), presentation: court(1500).nullable(), metiers: z.array(court(60)).max(8), services: court(600).nullable(), equipe: court(60).nullable(), ville: court(80).nullable() });
const luBody = z.object({ cle: z.string().min(8).max(80) });
const toutLireBody = z.object({ avant: z.iso.datetime() });
const aFaireBody = z.object({ cles: z.array(z.string().min(1).max(300)).min(1).max(60), geste: z.enum(["vu", "masquer", "restaurer"]) });
const reglagesBody = z.object({ prix: z.boolean(), groupe: z.boolean(), missions: z.boolean(), conseils: z.boolean(), email: z.boolean(), push: z.boolean() });

type Televerse = { buffer: Buffer; originalname: string; mimetype: string } | undefined;
const TELEVERSEMENT = FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: FICHIER_MAX_OCTETS + 1, files: 1 } });
function fichierDe(file: Televerse) {
  if (!file) throw validationFailed("Missing file", { reason: "fichier_absent", phrase: "Choisis un fichier." });
  // Le nom arrive en latin-1 dans un envoi multipart : on le relit en UTF-8, sans jamais garder un chemin.
  const nom = Buffer.from(file.originalname, "latin1").toString("utf8").split(/[\\/]/).pop()!.slice(0, 160);
  return { nom, type: file.mimetype, contenu: new Uint8Array(file.buffer) };
}

/** MISSIONS ENTRE ENTREPRISES : tout passe par l'entreprise courante ; coupé (MISSIONS_V1=off), chaque route répond 404. */
@Controller("v1/missions")
@UseGuards(TenantGuard)
export class MissionsController {
  constructor(@Inject(MissionsService) private readonly m: MissionsService) {}

  @Get("etat")
  etat(@Tenant() t: TenantContext) {
    return this.m.etat(t);
  }

  @Get("annonces")
  annonces(@Tenant() t: TenantContext, @Query("type") type?: string, @Query("q") q?: string, @Query("departement") departement?: string) {
    return this.m.annonces(t, { ...(type ? { type } : {}), ...(q ? { q: q.slice(0, 80) } : {}), ...(departement ? { departement: departement.slice(0, 3) } : {}) });
  }

  @Get("miennes")
  miennes(@Tenant() t: TenantContext) {
    return this.m.miennes(t);
  }

  @Get("enregistrees")
  enregistrees(@Tenant() t: TenantContext) {
    return this.m.enregistrees(t);
  }

  @Post("annonces")
  publier(@Tenant() t: TenantContext, @Body(new ZodPipe(annonceBody)) b: z.infer<typeof annonceBody>) {
    const { type, ...saisie } = b;
    return this.m.publier(t, type, saisie as never);
  }

  @Get("annonces/:id")
  annonce(@Tenant() t: TenantContext, @Param("id") id: string) {
    return this.m.annonce(t, id);
  }

  @Patch("annonces/:id")
  modifier(@Tenant() t: TenantContext, @Param("id") id: string, @Body(new ZodPipe(annonceBody)) b: z.infer<typeof annonceBody>) {
    return this.m.modifier(t, id, b as never);
  }

  @Post("annonces/:id/statut")
  @HttpCode(200)
  statut(@Tenant() t: TenantContext, @Param("id") id: string, @Body(new ZodPipe(statutBody)) b: z.infer<typeof statutBody>) {
    return this.m.changerStatut(t, id, b.action);
  }

  @Post("annonces/:id/enregistrement")
  @HttpCode(200)
  enregistrer(@Tenant() t: TenantContext, @Param("id") id: string, @Body(new ZodPipe(garderBody)) b: z.infer<typeof garderBody>) {
    return this.m.enregistrer(t, id, b.garder);
  }

  @Post("annonces/:id/fichiers")
  @UseInterceptors(TELEVERSEMENT)
  joindre(@Tenant() t: TenantContext, @Param("id") id: string, @UploadedFile() file: Televerse) {
    return this.m.joindreAAnnonce(t, id, fichierDe(file));
  }

  @Get("annonces/:id/reponses")
  reponses(@Tenant() t: TenantContext, @Param("id") id: string) {
    return this.m.reponses(t, id);
  }

  @Put("annonces/:id/reponse")
  repondre(@Tenant() t: TenantContext, @Param("id") id: string, @Body(new ZodPipe(reponseBody)) b: z.infer<typeof reponseBody>) {
    return this.m.repondre(t, id, b);
  }

  @Delete("annonces/:id/reponse")
  retirerReponse(@Tenant() t: TenantContext, @Param("id") id: string) {
    return this.m.retirerReponse(t, id);
  }

  @Post("annonces/:id/conversation")
  @HttpCode(200)
  ouvrir(@Tenant() t: TenantContext, @Param("id") id: string, @Body(new ZodPipe(ouvrirBody)) b: z.infer<typeof ouvrirBody>) {
    return this.m.ouvrir(t, id, b.autreId);
  }

  @Get("reponses/:id")
  reponse(@Tenant() t: TenantContext, @Param("id") id: string) {
    return this.m.reponse(t, id);
  }

  @Get("conversations")
  conversations(@Tenant() t: TenantContext, @Query("filtre") filtre?: string) {
    return this.m.conversations(t, filtre === "non-lues" || filtre === "archivees" ? filtre : "toutes");
  }

  @Get("conversations/:id")
  conversation(@Tenant() t: TenantContext, @Param("id") id: string) {
    return this.m.conversation(t, id);
  }

  @Post("conversations/:id/messages")
  ecrire(@Tenant() t: TenantContext, @Param("id") id: string, @Body(new ZodPipe(messageBody)) b: z.infer<typeof messageBody>) {
    return this.m.ecrire(t, id, b.texte, b.cle);
  }

  /** Une pièce jointe dans la conversation (multipart : `file`, `cle`, `texte` facultatif). */
  @Post("conversations/:id/fichiers")
  @UseInterceptors(TELEVERSEMENT)
  joindreAuMessage(@Tenant() t: TenantContext, @Param("id") id: string, @UploadedFile() file: Televerse, @Body() corps: { cle?: unknown; texte?: unknown }) {
    const b = messageBody.safeParse({ texte: typeof corps?.texte === "string" ? corps.texte : "", cle: corps?.cle });
    if (!b.success) throw validationFailed("Invalid body", { reason: "saisie", phrase: "Envoi incomplet, réessaie." });
    return this.m.ecrire(t, id, b.data.texte, b.data.cle, fichierDe(file));
  }

  @Post("conversations/:id/coordonnees")
  @HttpCode(200)
  coordonnees(@Tenant() t: TenantContext, @Param("id") id: string, @Body(new ZodPipe(coordonneesBody)) b: z.infer<typeof coordonneesBody>) {
    return this.m.coordonnees(t, id, b.accepte);
  }

  @Post("conversations/:id/archive")
  @HttpCode(200)
  archiver(@Tenant() t: TenantContext, @Param("id") id: string, @Body(new ZodPipe(archiveBody)) b: z.infer<typeof archiveBody>) {
    return this.m.archiver(t, id, b.archive);
  }

  @Post("conversations/:id/blocage")
  @HttpCode(200)
  bloquer(@Tenant() t: TenantContext, @Param("id") id: string, @Body(new ZodPipe(bloquerBody)) b: z.infer<typeof bloquerBody>) {
    return b.confirmer ? this.m.bloquer(t, id) : { bloquee: false };
  }

  @Post("conversations/:id/signalement")
  @HttpCode(200)
  signaler(@Tenant() t: TenantContext, @Param("id") id: string, @Body(new ZodPipe(signalerBody)) b: z.infer<typeof signalerBody>) {
    return this.m.signaler(t, id, b.motif, b.precision ?? null);
  }
}

/** Le dossier professionnel, le profil public et l'ouverture privée des fichiers. */
@Controller("v1")
@UseGuards(TenantGuard)
export class DossierProController {
  constructor(@Inject(MissionsService) private readonly m: MissionsService) {}

  @Get("dossier-pro")
  dossier(@Tenant() t: TenantContext) {
    return this.m.dossier(t);
  }

  /** Multipart : `file`, `categorie`, `titre` facultatif. */
  @Post("dossier-pro")
  @UseInterceptors(TELEVERSEMENT)
  ajouter(@Tenant() t: TenantContext, @UploadedFile() file: Televerse, @Body() corps: { categorie?: unknown; titre?: unknown }) {
    return this.m.ajouterAuDossier(t, typeof corps?.categorie === "string" ? corps.categorie : "", typeof corps?.titre === "string" ? corps.titre : null, fichierDe(file));
  }

  @Patch("dossier-pro/:id")
  modifier(@Tenant() t: TenantContext, @Param("id") id: string, @Body(new ZodPipe(documentBody)) b: z.infer<typeof documentBody>) {
    return this.m.modifierDocument(t, id, { ...(b.titre !== undefined ? { titre: b.titre } : {}), ...(b.surProfil !== undefined ? { surProfil: b.surProfil } : {}) });
  }

  @Delete("fichiers-pro/:id")
  supprimer(@Tenant() t: TenantContext, @Param("id") id: string) {
    return this.m.supprimerFichier(t, id);
  }

  @Get("fichiers-pro/:id/lien")
  lien(@Tenant() t: TenantContext, @Param("id") id: string) {
    return this.m.lienFichier(t, id);
  }

  @Get("fichiers-pro/ouvrir/:jeton")
  async ouvrir(@Tenant() t: TenantContext, @Param("jeton") jeton: string, @Res({ passthrough: true }) res: { setHeader(n: string, v: string): void }) {
    const f = await this.m.ouvrirFichier(t, jeton);
    res.setHeader("Content-Type", f.type);
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(f.nom)}`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return new StreamableFile(f.contenu);
  }

  @Get("profil-public")
  monProfil(@Tenant() t: TenantContext) {
    return this.m.monProfil(t);
  }

  @Put("profil-public")
  enregistrerProfil(@Tenant() t: TenantContext, @Body(new ZodPipe(profilBody)) b: z.infer<typeof profilBody>) {
    // Objet écrit champ par champ : la compilation de l'hébergeur (mode non strict) lit ces champs comme facultatifs.
    return this.m.enregistrerProfil(t, {
      visible: b.visible,
      presentation: b.presentation ?? null,
      metiers: b.metiers,
      services: b.services ?? null,
      equipe: b.equipe ?? null,
      ville: b.ville ?? null,
    });
  }

  @Get("profil-public/:companyId")
  profil(@Tenant() t: TenantContext, @Param("companyId") companyId: string) {
    return this.m.profil(t, companyId);
  }
}

/** « Messages et réponses » et la cloche : toujours là, missions allumées ou non (les réponses des négoces y vivent). */
@Controller("v1")
@UseGuards(TenantGuard)
export class BoiteController {
  constructor(@Inject(BoiteService) private readonly b: BoiteService) {}

  @Get("boite")
  boite(@Tenant() t: TenantContext) {
    return this.b.boite(t);
  }

  @Post("boite/lu")
  @HttpCode(200)
  lu(@Tenant() t: TenantContext, @Body(new ZodPipe(luBody)) b: z.infer<typeof luBody>) {
    return this.b.marquerLu(t, b.cle);
  }

  @Get("alertes")
  alertes(@Tenant() t: TenantContext) {
    return this.b.alertes(t);
  }

  @Post("alertes/lues")
  @HttpCode(200)
  toutLire(@Tenant() t: TenantContext, @Body(new ZodPipe(toutLireBody)) b: z.infer<typeof toutLireBody>) {
    return this.b.toutLire(t, new Date(b.avant));
  }

  @Post("alertes/:id/lue")
  @HttpCode(200)
  lire(@Tenant() t: TenantContext, @Param("id") id: string) {
    return this.b.lire(t, id);
  }

  /** Greg, 12 novembre 2026 : une notification se retire de la liste, et se remet avec « Annuler ». */
  @Delete("alertes/:id")
  @HttpCode(200)
  supprimerAlerte(@Tenant() t: TenantContext, @Param("id") id: string) {
    return this.b.supprimerAlerte(t, id, true);
  }

  @Post("alertes/:id/restaurer")
  @HttpCode(200)
  restaurerAlerte(@Tenant() t: TenantContext, @Param("id") id: string) {
    return this.b.supprimerAlerte(t, id, false);
  }

  @Get("alertes/a-faire")
  etatsAFaire(@Tenant() t: TenantContext) {
    return this.b.etatsAFaire(t);
  }

  @Post("alertes/a-faire")
  @HttpCode(200)
  marquerAFaire(@Tenant() t: TenantContext, @Body(new ZodPipe(aFaireBody)) b: z.infer<typeof aFaireBody>) {
    return this.b.marquerAFaire(t, b.cles, b.geste);
  }

  @Get("alertes/reglages")
  reglages(@Tenant() t: TenantContext) {
    return this.b.reglages(t);
  }

  @Put("alertes/reglages")
  regler(@Tenant() t: TenantContext, @Body(new ZodPipe(reglagesBody)) b: z.infer<typeof reglagesBody>) {
    return this.b.reglerAlertes(t, b);
  }
}

/** Admin : les signalements (réservé, 403 pour tout autre compte). */
@Controller("v1/admin/missions")
export class MissionsAdminController {
  constructor(
    @Inject(MissionsService) private readonly m: MissionsService,
    @Inject(PilotageService) private readonly pilotage: PilotageService,
  ) {}

  @Get("signalements")
  async signalements(@CurrentUser() u: AuthenticatedUser) {
    await this.pilotage.exiger(u);
    return this.m.signalements();
  }
}
