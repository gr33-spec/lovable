import { createHash, createHmac, randomUUID } from "node:crypto";
import {
  affichageDeLaCommande,
  bonDuMois,
  chrono,
  classerLesGrilles,
  cleDeLigne,
  cleDeReference,
  comparatifDeLArtisan,
  CONFIG_CYCLE_DEFAUT,
  datesDuCycle,
  deMois,
  distanceRouteKm,
  echeanceNegoce,
  fusionnerLesListes,
  lireRegleDeLivraison,
  mailGrilleAuNegoce,
  mailRelanceNegoce,
  mailResultatNegoce,
  messageAjout,
  messageTropTard,
  moisDe,
  moisSuivant,
  NATURES,
  normalizeText,
  phraseDeRang,
  PHRASE_AU_NEGOCE,
  PHRASE_PRIX_FERMES,
  suiviDansLeMois,
  zoneDuCodePostal,
  type CommandeDArtisan,
  type ConfigCycle,
  type GrilleChiffree,
  type LigneDeGrille,
  type MessageArtisan,
  type Mois,
  type Nature,
  type PhaseCycle,
} from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import { isUuid } from "../../../platform/validation/ids.js";
import type { PdfReader } from "../../documents/index.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import type { ReviewedTakeoff } from "../../takeoff/index.js";
import type { Geocodeur } from "./geocodeur.js";
import { lignesProposables } from "./groupe.service.js";
import { jetonDeLien } from "./lien-negoce.js";
import { statutDeLecture, type NegoceExtractor, type ReponseLue } from "./negoce-extractor.js";
import { pdfDeTexte } from "./pdf-texte.js";

/** Les lignes qui comptent dans une commande du mois : déposées, puis commandées (jamais les retirées). */
const DANS_LA_COMMANDE = ["signe", "commande"] as const;
const hash = (jeton: string) => createHash("sha256").update(jeton).digest("hex");
/**
 * Le lien d'une grille, tiré de son identifiant et du secret : le même dans l'e-mail de la demande et dans la relance
 * (revue à froid, 23 octobre : la relance renouvelait le lien, celui du premier e-mail ne marchait plus).
 */
const jetonDeGrille = (secret: string, grilleId: string) => createHmac("sha256", secret).update(`grille-du-mois:${grilleId}`).digest("base64url").slice(0, 32);
/** Une grille part au plus à 10 négoces du métier et du département (Greg : « 5 à 10 »), les plus anciens dans la base d'abord. */
export const NEGOCES_PAR_GRILLE = 10;
const CLE_CONFIG = "cycle:config";
const JOUR_MS = 86_400_000;

export interface ReglagesCommandeDuMois {
  webAppUrl: string;
  authSecret: string;
}

export interface FichierGrille {
  nom: string;
  type: string;
  contenu: Buffer;
}

/** Ce qu'un artisan voit d'une commande du mois. */
export interface VueDuMois {
  cycleId: string;
  numero: number;
  mois: Mois;
  /** « d'octobre », « de novembre » : pour « la commande d'octobre ». */
  de: string;
  phase: PhaseCycle;
  zone: string;
  clotureLe: string;
  reponseAvant: string;
  clotureDans: string | null;
  reponseDans: string | null;
  toi: string;
  tout: string;
  cloture: string | null;
  premier: string | null;
  mesLignes: { id: string; designation: string; quantite: number; unite: string; nature: string | null; chantier: string; projectId: string }[];
  suivi: ReturnType<typeof suiviDansLeMois>;
  resultats: null | {
    parDefaut: string | null;
    moinsCherPourToi: string | null;
    negoces: { negoceId: string; nom: string; totalHt: number; marchandiseHt: number; livraisonHt: number; manquantes: number; complet: boolean; premierSurLeTotal: boolean }[];
    choix: { negoceId: string; totalHt: number; commandeLe: string | null } | null;
  };
}

type LivraisonEnregistree = { depart: string; francoKm: number; prixAuDela: number; distances: Record<string, (number | null)[]> };

/**
 * LA COMMANDE COMMUNE DU MOIS (décision de Greg, 22 octobre 2026, au soir), côté serveur. Elle remplace le regroupement
 * par lot au fil de l'eau quand `COMMANDE_COMMUNE=mois` (par défaut) : une commande par mois, par métier et par
 * département. Le dépôt (artisan), la tâche planifiée (clôture, envoi de la grille, relance de la veille, résultats,
 * notifications d'ajout regroupées), la page du négoce (sa grille), et les résultats (comparatif, choix, commande).
 * Le devis du négoce est lu UNE fois à son arrivée ; tout le reste est du code (`packages/domain`).
 */
export class CommandeDuMoisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewed: (tenant: TenantContext, takeoffId: string) => Promise<ReviewedTakeoff>,
    private readonly email: TransactionalEmailSender,
    private readonly notifications: { prevenir(companyId: string, message: MessageArtisan): Promise<unknown> },
    private readonly geocodeur: Geocodeur | null,
    private readonly extracteur: NegoceExtractor | null,
    private readonly pdf: PdfReader,
    private readonly reglages: ReglagesCommandeDuMois,
    /** L'ouverture de la commande commune pour l'entreprise (SIRET vérifié, département ouvert, pas d'exclusion). */
    private readonly ouverte: (tenant: TenantContext) => Promise<void>,
  ) {}

  // ---------------------------------------------------------------------------------------------------------------
  // Réglages (admin)
  // ---------------------------------------------------------------------------------------------------------------

  async config(): Promise<ConfigCycle> {
    const p = await this.prisma.parametreGroupe.findUnique({ where: { cle: CLE_CONFIG } });
    return { ...CONFIG_CYCLE_DEFAUT, ...((p?.valeur as Partial<ConfigCycle> | null) ?? {}) };
  }

  /** L'admin change les dates : elles valent pour les cycles pas encore clos (leurs dates sont recalculées). */
  async changerConfig(c: ConfigCycle): Promise<ConfigCycle> {
    if (!(c.jourCloture >= 1 && c.jourCloture <= 28 && c.heureCloture >= 0 && c.heureCloture <= 23 && c.joursReponse >= 1 && c.joursReponse <= 60 && c.heureReponse >= 0 && c.heureReponse <= 23 && c.jourClotureDecembre >= 1 && c.jourClotureDecembre <= 28)) {
      throw validationFailed("Invalid cycle settings", { reason: "reglages_invalides" });
    }
    await this.prisma.parametreGroupe.upsert({ where: { cle: CLE_CONFIG }, create: { cle: CLE_CONFIG, valeur: { ...c } }, update: { valeur: { ...c } } });
    for (const cycle of await this.prisma.cycleCommande.findMany({ where: { phase: "inscriptions" } })) {
      const d = datesDuCycle(cycle.mois, c);
      await this.prisma.cycleCommande.update({ where: { id: cycle.id }, data: { clotureLe: d.clotureLe, reponseAvant: d.reponseAvant, relanceLe: d.relanceLe } });
    }
    return c;
  }

  /** L'admin (ou un test) fixe les dates d'un cycle précis. */
  async datesDuCycleAdmin(cycleId: string, dates: { clotureLe?: Date; reponseAvant?: Date }): Promise<void> {
    if (!isUuid(cycleId)) throw notFound("Cycle");
    const c = await this.prisma.cycleCommande.findUnique({ where: { id: cycleId } });
    if (!c) throw notFound("Cycle");
    const reponseAvant = dates.reponseAvant ?? c.reponseAvant;
    await this.prisma.cycleCommande.update({ where: { id: cycleId }, data: { ...(dates.clotureLe ? { clotureLe: dates.clotureLe } : {}), reponseAvant, relanceLe: new Date(reponseAvant.getTime() - JOUR_MS) } });
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Le dépôt de l'artisan
  // ---------------------------------------------------------------------------------------------------------------

  /**
   * Le cycle ouvert pour (famille, zone) à `maintenant` : celui du mois si sa clôture n'est pas passée, sinon le suivant
   * (créé au besoin). `tardPour` : le mois manqué, pour « Trop tard pour octobre… ».
   */
  private async cycleOuvert(famille: string, zone: string, maintenant: Date): Promise<{ cycle: { id: string; mois: string; numero: number }; tardPour: Mois | null }> {
    const config = await this.config();
    const premier = moisDe(maintenant);
    let mois = premier;
    for (let i = 0; i < 24; i++) {
      const existant = await this.prisma.cycleCommande.findUnique({ where: { mois_famille_zone: { mois, famille, zone } } });
      if (existant) {
        if (existant.phase === "inscriptions" && maintenant < existant.clotureLe) return { cycle: existant, tardPour: mois === premier ? null : premier };
      } else {
        const d = datesDuCycle(mois, config);
        if (maintenant < d.clotureLe) {
          const cycle = await this.prisma.cycleCommande.upsert({
            where: { mois_famille_zone: { mois, famille, zone } },
            create: { mois, famille, zone, clotureLe: d.clotureLe, reponseAvant: d.reponseAvant, relanceLe: d.relanceLe },
            update: {},
          });
          return { cycle, tardPour: mois === premier ? null : premier };
        }
      }
      mois = moisSuivant(mois);
    }
    throw new DomainError("conflict", "No open cycle", { reason: "pas_de_cycle" });
  }

  /**
   * Déposer des lignes de sa liste dans la commande du mois : seulement du matériel sûr (chantier signé ou stock), des
   * lignes précises. Sans engagement : l'artisan commandera seulement si le prix lui plaît.
   */
  async deposer(tenant: TenantContext, projectId: string, d: { articles: readonly string[]; nature: Nature }, maintenant = new Date()): Promise<{ mois: Mois; message: string | null; vue: VueDuMois }> {
    assertCanWrite(tenant);
    await this.ouverte(tenant);
    if (!NATURES.includes(d.nature)) throw validationFailed("Unknown nature", { reason: "nature_inconnue" });
    if (!isUuid(projectId)) throw notFound("Project");
    const project = await this.prisma.project.findFirst({ where: { id: projectId, companyId: tenant.companyId }, select: { id: true, address: true } });
    if (!project) throw notFound("Project");
    const zone = zoneDuCodePostal(project.address);
    if (!zone || !project.address) throw validationFailed("The site needs an address with a postcode", { reason: "adresse_requise" });
    const takeoff = await this.prisma.takeoff.findFirst({ where: { projectId, companyId: tenant.companyId }, orderBy: { createdAt: "desc" }, select: { id: true } });
    if (!takeoff) throw validationFailed("No materials list", { reason: "pas_de_liste" });
    const lignes = lignesProposables(await this.reviewed(tenant, takeoff.id), d.articles);
    const familles = [...new Set(lignes.map((l) => l.famille))];
    if (familles.length === 0) throw validationFailed("Nothing to add", { reason: "rien_a_ajouter" });
    const ajoutes: { quantite: number; unite: string; designation: string; cycleId: string }[] = [];
    let moisDeLaListe: Mois | null = null;
    let tardPour: Mois | null = null;
    for (const famille of familles) {
      const { cycle, tardPour: tard } = await this.cycleOuvert(famille, zone, maintenant);
      moisDeLaListe ??= cycle.mois;
      tardPour ??= tard;
      await this.prisma.$transaction(async (tx) => {
        // Même verrou que la clôture : la ligne entre dans la grille, ou la commande est déjà close et l'artisan réessaie.
        const [etat] = await tx.$queryRaw<{ phase: string; clotureLe: Date }[]>`SELECT phase, "clotureLe" FROM cycle_commande WHERE id = ${cycle.id}::uuid FOR UPDATE`;
        if (!etat || etat.phase !== "inscriptions" || maintenant >= etat.clotureLe) throw new DomainError("conflict", "Order closed", { reason: "commande_close" });
        for (const { item, q } of lignes.filter((l) => l.famille === famille)) {
          const data = {
            designation: item.label,
            cle: cleDeReference({ libelle: item.label }),
            famille,
            quantite: q.quantite,
            unite: q.unite,
            zone,
            adresseLivraison: project.address!,
            // Plus de fenêtre demandée : la commande du mois livre après ses résultats ; les dates du cycle en tiennent lieu.
            fenetreTot: maintenant,
            fenetreTard: new Date(maintenant.getTime() + 60 * JOUR_MS),
            statut: "signe",
            signeLe: maintenant,
            retireLe: null,
            lotId: null,
            cycleId: cycle.id,
            nature: d.nature,
          };
          const deja = await tx.besoin.findUnique({ where: { takeoffId_articleKey: { takeoffId: takeoff.id, articleKey: item.key } }, select: { id: true, statut: true } });
          if (deja && deja.statut !== "retire") throw new DomainError("conflict", "Already proposed", { reason: "deja_propose", article: item.key });
          if (deja) await tx.besoin.update({ where: { id: deja.id }, data });
          else await tx.besoin.create({ data: { ...data, companyId: tenant.companyId, projectId, takeoffId: takeoff.id, articleKey: item.key } });
          ajoutes.push({ quantite: Number(q.quantite), unite: q.unite, designation: item.label, cycleId: cycle.id });
        }
      });
    }
    await this.annoncerAjouts(tenant.companyId, ajoutes, maintenant);
    const vue = (await this.vues(tenant, maintenant)).find((v) => v.mois === moisDeLaListe) ?? (await this.vues(tenant, maintenant))[0]!;
    return { mois: moisDeLaListe!, message: tardPour ? messageTropTard(tardPour, moisDeLaListe!) : null, vue };
  }

  /** Retirer une ligne : libre tant que la commande n'est pas close. */
  async retirer(tenant: TenantContext, besoinId: string, maintenant = new Date()): Promise<void> {
    assertCanWrite(tenant);
    if (!isUuid(besoinId)) throw notFound("Besoin");
    const b = await this.prisma.besoin.findFirst({ where: { id: besoinId, companyId: tenant.companyId, cycleId: { not: null } }, include: { cycle: true } });
    if (!b || !b.cycle) throw notFound("Besoin");
    if (b.cycle.phase !== "inscriptions" || maintenant >= b.cycle.clotureLe) throw new DomainError("conflict", "Order closed", { reason: "commande_close" });
    await this.prisma.besoin.update({ where: { id: b.id }, data: { statut: "retire", retireLe: maintenant } });
  }

  /**
   * « +6 palettes d'ardoises 32×22 viennent d'être ajoutées. L'union fait la force ! » : chaque autre artisan de la
   * commande est prévenu, au plus une fois par jour (les ajouts suivants attendent le passage du lendemain, regroupés).
   */
  private async annoncerAjouts(auteurId: string, ajoutes: readonly { quantite: number; unite: string; designation: string; cycleId: string }[], maintenant: Date): Promise<void> {
    for (const cycleId of new Set(ajoutes.map((a) => a.cycleId))) {
      const lignes = ajoutes.filter((a) => a.cycleId === cycleId).map((a) => ({ quantite: a.quantite, unite: a.unite, designation: a.designation }));
      const autres = await this.prisma.besoin.findMany({ where: { cycleId, statut: { in: [...DANS_LA_COMMANDE] }, companyId: { not: auteurId } }, select: { companyId: true }, distinct: ["companyId"] });
      for (const { companyId } of autres) {
        const cle = `ajouts:${cycleId}:${companyId}`;
        const p = await this.prisma.parametreGroupe.findUnique({ where: { cle } });
        const etat = (p?.valeur as { enAttente?: typeof lignes; dernierEnvoi?: string } | null) ?? {};
        const enAttente = [...(etat.enAttente ?? []), ...lignes];
        if (etat.dernierEnvoi && moisJour(new Date(etat.dernierEnvoi)) === moisJour(maintenant)) {
          await this.prisma.parametreGroupe.upsert({ where: { cle }, create: { cle, valeur: { enAttente, dernierEnvoi: etat.dernierEnvoi } }, update: { valeur: { enAttente, dernierEnvoi: etat.dernierEnvoi } } });
          continue;
        }
        await this.notifications.prevenir(companyId, messageDAjout(enAttente)).catch(() => undefined);
        await this.prisma.parametreGroupe.upsert({ where: { cle }, create: { cle, valeur: { enAttente: [], dernierEnvoi: maintenant.toISOString() } }, update: { valeur: { enAttente: [], dernierEnvoi: maintenant.toISOString() } } });
      }
    }
  }

  /** Les ajouts restés en attente (un autre a déjà été prévenu ce jour-là) partent au premier passage d'un autre jour. */
  private async ajoutsEnAttente(maintenant: Date): Promise<number> {
    let envoyes = 0;
    for (const p of await this.prisma.parametreGroupe.findMany({ where: { cle: { startsWith: "ajouts:" } } })) {
      const etat = p.valeur as { enAttente?: { quantite: number; unite: string; designation: string }[]; dernierEnvoi?: string };
      if (!etat.enAttente?.length || (etat.dernierEnvoi && moisJour(new Date(etat.dernierEnvoi)) === moisJour(maintenant))) continue;
      const companyId = p.cle.split(":")[2]!;
      await this.notifications.prevenir(companyId, messageDAjout(etat.enAttente)).catch(() => undefined);
      await this.prisma.parametreGroupe.update({ where: { cle: p.cle }, data: { valeur: { enAttente: [], dernierEnvoi: maintenant.toISOString() } } });
      envoyes++;
    }
    return envoyes;
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Ce que voit l'artisan
  // ---------------------------------------------------------------------------------------------------------------

  /** Les commandes du mois de l'entreprise : celles où elle a déposé, et celle ouverte de son département. */
  async vues(tenant: TenantContext, maintenant = new Date()): Promise<VueDuMois[]> {
    const mesBesoins = await this.prisma.besoin.findMany({ where: { companyId: tenant.companyId, cycleId: { not: null }, statut: { not: "retire" } }, select: { cycleId: true } });
    const ids = new Set(mesBesoins.map((b) => b.cycleId!));
    const company = await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { address: true, trades: true } });
    const zone = zoneDuCodePostal(company?.address ?? "");
    if (zone) {
      const ouvert = await this.prisma.cycleCommande.findFirst({ where: { zone, famille: "couverture", phase: "inscriptions", clotureLe: { gt: maintenant } }, orderBy: { clotureLe: "asc" }, select: { id: true } });
      if (ouvert) ids.add(ouvert.id);
    }
    const cycles = await this.prisma.cycleCommande.findMany({ where: { id: { in: [...ids] } }, orderBy: { clotureLe: "desc" } });
    return Promise.all(cycles.map((c) => this.vueDuCycle(tenant, c, maintenant)));
  }

  /**
   * La commande ouverte d'un département (chrono, quantités) : celui du chantier quand il est donné (le bloc de « Ton
   * chantier », Greg, 23 octobre 2026), sinon celui de l'entreprise (l'onglet « Commande commune »).
   */
  async prochaineCommande(tenant: TenantContext, maintenant = new Date(), projectId?: string): Promise<{ mois: Mois; de: string; zone: string; clotureLe: string; clotureDans: string; toi: string | null; tout: string; vide: boolean } | null> {
    let adresse: string | null;
    if (projectId) {
      if (!isUuid(projectId)) throw notFound("Project");
      const project = await this.prisma.project.findFirst({ where: { id: projectId, companyId: tenant.companyId }, select: { address: true } });
      if (!project) throw notFound("Project");
      adresse = project.address;
    } else {
      adresse = (await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { address: true } }))?.address ?? null;
      // Entreprise sans adresse (compte tout neuf) : le département du dernier chantier adressé, pour que l'accueil
      // montre quand même la commande du mois (Greg, 23 octobre 2026).
      if (!zoneDuCodePostal(adresse ?? "")) {
        const projets = await this.prisma.project.findMany({ where: { companyId: tenant.companyId, address: { not: null } }, select: { address: true }, orderBy: { updatedAt: "desc" }, take: 20 });
        adresse = projets.map((p) => p.address).find((a) => zoneDuCodePostal(a ?? "")) ?? null;
      }
    }
    const zone = zoneDuCodePostal(adresse ?? "");
    if (!zone) return null;
    // Lecture seule : afficher la commande ne crée pas de cycle en base (il naît au premier dépôt).
    const c = await this.cycleAffiche("couverture", zone, maintenant);
    if (!c) return null;
    const tout = c.id ? await this.lignesDuCycle(c.id) : [];
    // Greg (23 octobre) : l'accueil montre « Toi seul : … » quand l'entreprise a déjà déposé dans cette commande.
    const toi = c.id ? await this.lignesDuCycle(c.id, tenant.companyId) : [];
    const affichage = affichageDeLaCommande({ mois: c.mois, toi, tout, seul: false, clotureDans: null });
    return { mois: c.mois, de: deMois(c.mois), zone, clotureLe: c.clotureLe.toISOString(), clotureDans: chrono(maintenant, c.clotureLe), toi: toi.length ? affichage.toi : null, tout: affichage.tout, vide: tout.length === 0 };
  }

  /** La commande ouverte d'un département, sans rien créer : le cycle en base s'il existe, sinon ses dates seules. */
  private async cycleAffiche(famille: string, zone: string, maintenant: Date): Promise<{ id: string | null; mois: Mois; clotureLe: Date } | null> {
    const config = await this.config();
    let mois = moisDe(maintenant);
    for (let i = 0; i < 24; i++) {
      const existant = await this.prisma.cycleCommande.findUnique({ where: { mois_famille_zone: { mois, famille, zone } } });
      if (existant) {
        if (existant.phase === "inscriptions" && maintenant < existant.clotureLe) return { id: existant.id, mois: existant.mois, clotureLe: existant.clotureLe };
      } else {
        const d = datesDuCycle(mois, config);
        if (maintenant < d.clotureLe) return { id: null, mois, clotureLe: d.clotureLe };
      }
      mois = moisSuivant(mois);
    }
    return null;
  }

  private async lignesDuCycle(cycleId: string, companyId?: string): Promise<LigneDeGrille[]> {
    const besoins = await this.prisma.besoin.findMany({ where: { cycleId, statut: { in: [...DANS_LA_COMMANDE] }, ...(companyId ? { companyId } : {}) }, orderBy: { createdAt: "asc" }, select: { cle: true, designation: true, quantite: true, unite: true } });
    return fusionnerLesListes(besoins.map((b) => ({ cle: b.cle, designation: b.designation, quantite: Number(b.quantite), unite: b.unite })));
  }

  private async vueDuCycle(tenant: TenantContext, c: { id: string; numero: number; mois: string; phase: string; zone: string; clotureLe: Date; reponseAvant: Date; lignes: unknown }, maintenant: Date): Promise<VueDuMois> {
    const phase = c.phase as PhaseCycle;
    const mes = await this.prisma.besoin.findMany({ where: { cycleId: c.id, companyId: tenant.companyId, statut: { in: [...DANS_LA_COMMANDE] } }, orderBy: { createdAt: "asc" }, include: { project: { select: { name: true } } } });
    const toi = fusionnerLesListes(mes.map((b) => ({ cle: b.cle, designation: b.designation, quantite: Number(b.quantite), unite: b.unite })));
    const tout = phase === "inscriptions" ? await this.lignesDuCycle(c.id) : (c.lignes as unknown as LigneDeGrille[]);
    const autres = await this.prisma.besoin.count({ where: { cycleId: c.id, statut: { in: [...DANS_LA_COMMANDE] }, companyId: { not: tenant.companyId } } });
    const clotureDans = phase === "inscriptions" ? chrono(maintenant, c.clotureLe) : null;
    const reponseDans = phase === "negoces" ? chrono(maintenant, c.reponseAvant) : null;
    const affichage = affichageDeLaCommande({ mois: c.mois, toi, tout, seul: autres === 0 && toi.length > 0, clotureDans });
    const grilles = await this.prisma.grilleNegoce.findMany({ where: { cycleId: c.id }, include: { negoce: { select: { nom: true } } }, orderBy: { deposeLe: "asc" } });
    const choix = await this.prisma.choixArtisan.findUnique({ where: { cycleId_companyId: { cycleId: c.id, companyId: tenant.companyId } } });
    let resultats: VueDuMois["resultats"] = null;
    if (phase === "resultats" && toi.length > 0) {
      const { chiffrees, classement, commandes } = await this.classement(c.id, c.lignes as unknown as LigneDeGrille[]);
      const moi = commandes.find((x) => x.companyId === tenant.companyId);
      if (moi && chiffrees.length > 0) {
        const comp = comparatifDeLArtisan(moi, chiffrees, classement);
        const nom = new Map(grilles.map((g) => [g.negoceId, g.negoce.nom]));
        resultats = {
          parDefaut: comp.parDefaut,
          moinsCherPourToi: comp.moinsCherPourToi,
          negoces: comp.lignes.map((l) => ({ negoceId: l.negoceId, nom: nom.get(l.negoceId) ?? "", totalHt: l.totalHt, marchandiseHt: l.marchandiseHt, livraisonHt: l.livraisonHt, manquantes: l.manquantes, complet: l.complet, premierSurLeTotal: l.negoceId === comp.parDefaut })),
          choix: choix ? { negoceId: choix.negoceId, totalHt: Number(choix.totalHt), commandeLe: choix.commandeLe?.toISOString() ?? null } : null,
        };
      }
    }
    const deposees = grilles.filter((g) => g.deposeLe).length;
    return {
      cycleId: c.id,
      numero: c.numero,
      mois: c.mois,
      de: deMois(c.mois),
      phase,
      zone: c.zone,
      clotureLe: c.clotureLe.toISOString(),
      reponseAvant: c.reponseAvant.toISOString(),
      clotureDans,
      reponseDans,
      ...affichage,
      mesLignes: mes.map((b) => ({ id: b.id, designation: b.designation, quantite: Number(b.quantite), unite: b.unite, nature: b.nature, chantier: b.project.name, projectId: b.projectId })),
      suivi: suiviDansLeMois({ mois: c.mois, phase, clotureDans, reponseDans, grilles: deposees, negoces: grilles.length, commande: !!choix?.commandeLe }),
      resultats,
    };
  }

  /** Le suivi façon colis d'un chantier inscrit à une commande du mois (le plus récent), ou null. */
  async suiviDuChantier(tenant: TenantContext, projectId: string, maintenant = new Date()): Promise<VueDuMois["suivi"] | null> {
    const b = await this.prisma.besoin.findFirst({ where: { projectId, companyId: tenant.companyId, cycleId: { not: null }, statut: { in: [...DANS_LA_COMMANDE] } }, orderBy: { createdAt: "desc" }, select: { cycleId: true } });
    if (!b) return null;
    const c = await this.prisma.cycleCommande.findUniqueOrThrow({ where: { id: b.cycleId! } });
    return (await this.vueDuCycle(tenant, c, maintenant)).suivi;
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Les résultats : choix et commande
  // ---------------------------------------------------------------------------------------------------------------

  private async classement(cycleId: string, lignes: readonly LigneDeGrille[]) {
    const grilles = await this.prisma.grilleNegoce.findMany({ where: { cycleId, deposeLe: { not: null } }, orderBy: { deposeLe: "asc" } });
    const chiffrees: GrilleChiffree[] = grilles
      .filter((g) => g.livraison)
      .map((g) => ({ negoceId: g.negoceId, prix: g.prix as Record<string, number>, livraison: g.livraison as LivraisonEnregistree }));
    const besoins = await this.prisma.besoin.findMany({ where: { cycleId, statut: { in: [...DANS_LA_COMMANDE] } }, orderBy: { createdAt: "asc" }, select: { companyId: true, cle: true, designation: true, quantite: true, unite: true, adresseLivraison: true } });
    const parEntreprise = new Map<string, typeof besoins>();
    for (const b of besoins) parEntreprise.set(b.companyId, [...(parEntreprise.get(b.companyId) ?? []), b]);
    const commandes: CommandeDArtisan[] = [...parEntreprise.entries()].map(([companyId, bs]) => {
      const distances: Record<string, (number | null)[]> = {};
      for (const g of grilles) {
        const l = g.livraison as LivraisonEnregistree | null;
        // Une entreprise absente des distances (jamais attendu : la commande est figée) paie la livraison, jamais zéro.
        if (l?.distances[companyId]) distances[g.negoceId] = l.distances[companyId]!;
      }
      return { companyId, chantiers: new Set(bs.map((b) => b.adresseLivraison)).size, distances, lignes: fusionnerLesListes(bs.map((b) => ({ cle: b.cle, designation: b.designation, quantite: Number(b.quantite), unite: b.unite }))) };
    });
    return { chiffrees, classement: classerLesGrilles(chiffrees, lignes, commandes), commandes };
  }

  /** Choisir un négoce (par défaut le premier sur le total), puis « Commander » : le bon part au négoce. */
  async commander(tenant: TenantContext, cycleId: string, negoceId: string, maintenant = new Date()): Promise<VueDuMois> {
    assertCanWrite(tenant);
    if (!isUuid(cycleId) || !isUuid(negoceId)) throw notFound("Cycle");
    const c = await this.prisma.cycleCommande.findUnique({ where: { id: cycleId } });
    if (!c) throw notFound("Cycle");
    if (c.phase !== "resultats") throw new DomainError("conflict", "No results yet", { reason: "pas_de_resultats" });
    const deja = await this.prisma.choixArtisan.findUnique({ where: { cycleId_companyId: { cycleId, companyId: tenant.companyId } } });
    if (deja?.commandeLe) throw new DomainError("conflict", "Already ordered", { reason: "deja_commande" });
    const vue = await this.vueDuCycle(tenant, c, maintenant);
    const ligne = vue.resultats?.negoces.find((n) => n.negoceId === negoceId);
    if (!ligne) throw notFound("Negoce");
    if (!ligne.complet) throw validationFailed("This négoce did not price every line of your list", { reason: "grille_incomplete" });
    const grille = await this.prisma.grilleNegoce.findUniqueOrThrow({ where: { cycleId_negoceId: { cycleId, negoceId } }, include: { negoce: true } });
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { name: true, siret: true, phone: true, contactEmail: true } });
    const compte = await this.prisma.negoceArtisan.findUnique({ where: { companyId_negoceId: { companyId: tenant.companyId, negoceId } }, select: { numeroCompte: true } });
    const besoins = await this.prisma.besoin.findMany({ where: { cycleId, companyId: tenant.companyId, statut: { in: [...DANS_LA_COMMANDE] } }, orderBy: { createdAt: "asc" } });
    const prix = grille.prix as Record<string, number>;
    const lignes = fusionnerLesListes(besoins.map((b) => ({ cle: b.cle, designation: b.designation, quantite: Number(b.quantite), unite: b.unite }))).map((l) => ({ designation: l.designation, quantite: l.quantite, unite: l.unite, prixUnitaire: prix[l.cle]! }));
    const doc = bonDuMois({ numero: c.numero, mois: c.mois, negoce: grille.negoce.nom, artisan: { nom: company.name, siret: company.siret, telephone: company.phone, email: company.contactEmail }, numeroCompte: compte?.numeroCompte ?? null, chantiers: [...new Set(besoins.map((b) => b.adresseLivraison))], lignes, livraisonHt: ligne.livraisonHt });
    const pdf = await pdfDeTexte(doc.titre, doc.blocs);
    // La commande est d'abord réservée (une seule passe, double appui compris), puis le bon part ; s'il ne part pas, rien
    // n'est commandé et l'artisan peut recommencer (revue à froid, 23 octobre : deux appuis envoyaient deux bons).
    const choix = { negoceId, totalHt: ligne.totalHt, livraisonHt: ligne.livraisonHt, commandeLe: maintenant };
    const reserve = deja
      ? (await this.prisma.choixArtisan.updateMany({ where: { id: deja.id, commandeLe: null }, data: choix })).count === 1
      : await this.prisma.choixArtisan.create({ data: { cycleId, companyId: tenant.companyId, ...choix } }).then(
          () => true,
          (e: unknown) => (isUniqueViolation(e) ? false : Promise.reject(e)),
        );
    if (!reserve) throw new DomainError("conflict", "Already ordered", { reason: "deja_commande" });
    try {
      await this.email.send({
        to: grille.negoce.email,
        subject: doc.titre,
        text: ["Bonjour,", "", `${company.name} commande au prix de votre grille de la commande commune. Le bon de commande est joint.`, "", "BatiClair"].join("\n"),
        attachments: [{ filename: `bon-de-commande-${c.mois}-${c.numero}.pdf`, contentType: "application/pdf", contentBase64: Buffer.from(pdf).toString("base64") }],
        ...(company.contactEmail ? { replyTo: company.contactEmail } : {}),
        mustDeliver: true,
      });
    } catch (e) {
      await this.prisma.choixArtisan.updateMany({ where: { cycleId, companyId: tenant.companyId }, data: { commandeLe: null } });
      throw e;
    }
    await this.prisma.besoin.updateMany({ where: { cycleId, companyId: tenant.companyId, statut: "signe" }, data: { statut: "commande" } });
    return this.vueDuCycle(tenant, c, maintenant);
  }

  // ---------------------------------------------------------------------------------------------------------------
  // La tâche planifiée
  // ---------------------------------------------------------------------------------------------------------------

  /** Clôture, envoi de la grille, relance de la veille, résultats ; puis les ajouts en attente. Rejouable sans doublon. */
  async tache(maintenant = new Date()): Promise<{ clos: number; grillesEnvoyees: number; relances: number; resultats: number; ajouts: number }> {
    let clos = 0;
    let grillesEnvoyees = 0;
    let relances = 0;
    let resultats = 0;
    for (const c of await this.prisma.cycleCommande.findMany({ where: { phase: "inscriptions", clotureLe: { lte: maintenant } } })) {
      grillesEnvoyees += await this.clore(c, maintenant);
      clos++;
    }
    for (const c of await this.prisma.cycleCommande.findMany({ where: { phase: "negoces" } })) {
      if (maintenant >= c.reponseAvant) {
        await this.publierLesResultats(c, maintenant);
        resultats++;
      } else {
        grillesEnvoyees += await this.envoyerLesGrilles(c, maintenant);
        if (maintenant >= c.relanceLe) relances += await this.relancer(c, maintenant);
      }
    }
    const ajouts = await this.ajoutsEnAttente(maintenant);
    return { clos, grillesEnvoyees, relances, resultats, ajouts };
  }

  /** À la clôture : tout est figé, les listes fusionnées en UNE grille, envoyée à chaque négoce du métier et du département. */
  private async clore(c: { id: string; mois: string; famille: string; zone: string; clotureLe: Date; reponseAvant: Date }, maintenant: Date): Promise<number> {
    // Verrou sur la commande : un dépôt en cours (même verrou) finit avant que la grille ne soit figée, ou voit la clôture.
    const lignes = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM cycle_commande WHERE id = ${c.id}::uuid FOR UPDATE`;
      const besoins = await tx.besoin.findMany({ where: { cycleId: c.id, statut: { in: [...DANS_LA_COMMANDE] } }, orderBy: { createdAt: "asc" }, select: { cle: true, designation: true, quantite: true, unite: true } });
      const l = fusionnerLesListes(besoins.map((b) => ({ cle: b.cle, designation: b.designation, quantite: Number(b.quantite), unite: b.unite })));
      await tx.cycleCommande.update({ where: { id: c.id }, data: { phase: l.length ? "negoces" : "resultats", closLe: maintenant, lignes: l.map((x) => ({ ...x })), ...(l.length ? {} : { resultatsLe: maintenant }) } });
      return l;
    });
    if (!lignes.length) return 0;
    return this.envoyerLesGrilles({ ...c, lignes }, maintenant);
  }

  /**
   * La grille à chaque négoce du métier et du département qui ne l'a pas encore : rejouée à chaque passage tant que la
   * limite n'est pas atteinte (un e-mail refusé par le prestataire repart). Greg, 23 octobre 2026 (« Mets ton négoce dans
   * la boucle ») : seuls les négoces ajoutés AVANT la clôture reçoivent cette grille ; un négoce ajouté après attend la
   * commande suivante (règle changée : avant, un négoce ajouté pendant les deux semaines la recevait aussi).
   */
  private async envoyerLesGrilles(c: { id: string; mois: string; famille: string; zone: string; clotureLe: Date; reponseAvant: Date; lignes: unknown }, maintenant: Date): Promise<number> {
    const lignes = c.lignes as LigneDeGrille[];
    const negoces = await this.prisma.negoce.findMany({ where: { departement: c.zone, stopLe: null, familles: { has: c.famille }, createdAt: { lt: c.clotureLe } }, orderBy: { createdAt: "asc" }, take: NEGOCES_PAR_GRILLE });
    let envoyees = 0;
    for (const n of negoces) {
      const deja = await this.prisma.grilleNegoce.findUnique({ where: { cycleId_negoceId: { cycleId: c.id, negoceId: n.id } } });
      if (deja) continue;
      const id = randomUUID();
      const jeton = jetonDeGrille(this.reglages.authSecret, id);
      const grille = await this.prisma.grilleNegoce.create({ data: { id, cycleId: c.id, negoceId: n.id, tokenHash: hash(jeton) } });
      const mail = mailGrilleAuNegoce({ negoce: n.nom, mois: c.mois, departement: c.zone, lignes, reponseAvant: c.reponseAvant, maintenant, lien: `${this.reglages.webAppUrl}/grille/${jeton}`, stop: `${this.reglages.webAppUrl}/negoces/lien/${jetonDeLien(this.reglages.authSecret, { action: "stop", negoceId: n.id })}` });
      const pdf = await pdfDeTexte(mail.objet, [{ titre: "Le volume à chiffrer", lignes: [["Désignation", "Quantité"], ...lignes.map((l) => [l.designation, `${l.quantite.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${l.unite}`])] }, { lignes: [PHRASE_PRIX_FERMES, PHRASE_AU_NEGOCE] }]);
      try {
        await this.email.send({ to: n.email, subject: mail.objet, text: mail.texte, attachments: [{ filename: `commande-commune-${c.mois}.pdf`, contentType: "application/pdf", contentBase64: Buffer.from(pdf).toString("base64") }], mustDeliver: true });
        envoyees++;
      } catch {
        // Pas parti : la grille est retirée, le passage suivant retentera (avant la limite).
        await this.prisma.grilleNegoce.delete({ where: { id: grille.id } });
      }
    }
    return envoyees;
  }

  /** La veille de la limite, une relance à qui n'a pas encore déposé (une seule fois), avec le même lien. */
  private async relancer(c: { id: string; mois: string; zone: string; reponseAvant: Date }, maintenant: Date): Promise<number> {
    let n = 0;
    for (const g of await this.prisma.grilleNegoce.findMany({ where: { cycleId: c.id, deposeLe: null, relanceLe: null }, include: { negoce: true } })) {
      const jeton = jetonDeGrille(this.reglages.authSecret, g.id);
      await this.prisma.grilleNegoce.update({ where: { id: g.id }, data: { relanceLe: maintenant } });
      const mail = mailRelanceNegoce({ mois: c.mois, departement: c.zone, reponseAvant: c.reponseAvant, maintenant, lien: `${this.reglages.webAppUrl}/grille/${jeton}` });
      await this.email.send({ to: g.negoce.email, subject: mail.objet, text: mail.texte }).catch(() => undefined);
      n++;
    }
    return n;
  }

  /** À la limite : figé ; chaque artisan est prévenu, chaque négoce reçoit son message (retenu ou neutre). */
  private async publierLesResultats(c: { id: string; mois: string; zone: string; lignes: unknown }, maintenant: Date): Promise<void> {
    await this.prisma.cycleCommande.update({ where: { id: c.id }, data: { phase: "resultats", resultatsLe: maintenant } });
    const { classement } = await this.classement(c.id, c.lignes as unknown as LigneDeGrille[]);
    const premier = classement[0]?.negoceId ?? null;
    for (const g of await this.prisma.grilleNegoce.findMany({ where: { cycleId: c.id, deposeLe: { not: null }, resultatLe: null }, include: { negoce: true } })) {
      const mail = mailResultatNegoce({ mois: c.mois, departement: c.zone, premier: g.negoceId === premier });
      await this.email.send({ to: g.negoce.email, subject: mail.objet, text: mail.texte }).catch(() => undefined);
      await this.prisma.grilleNegoce.update({ where: { id: g.id }, data: { resultatLe: maintenant } });
    }
    const entreprises = await this.prisma.besoin.findMany({ where: { cycleId: c.id, statut: { in: [...DANS_LA_COMMANDE] } }, select: { companyId: true }, distinct: ["companyId"] });
    for (const { companyId } of entreprises) {
      await this.notifications.prevenir(companyId, { titre: "Les prix sont là", corps: "Regarde ton prix livré chez chaque négoce et commande si ça te plaît.", url: "/groupe", etiquette: `resultats-${c.id}` }).catch(() => undefined);
    }
  }

  // ---------------------------------------------------------------------------------------------------------------
  // La page du négoce
  // ---------------------------------------------------------------------------------------------------------------

  private async grilleDuJeton(jeton: string) {
    if (!/^[A-Za-z0-9_-]{20,200}$/.test(jeton)) throw notFound("Lien");
    const g = await this.prisma.grilleNegoce.findUnique({ where: { tokenHash: hash(jeton) }, include: { cycle: true, negoce: true, fichiers: { select: { nom: true } } } });
    if (!g) throw notFound("Lien");
    return g;
  }

  async pageGrille(jeton: string, maintenant = new Date()) {
    const g = await this.grilleDuJeton(jeton);
    const lignes = g.cycle.lignes as unknown as LigneDeGrille[];
    const ouverte = g.cycle.phase === "negoces" && maintenant < g.cycle.reponseAvant;
    let rang: number | null = null;
    if (g.deposeLe) rang = (await this.classement(g.cycleId, lignes)).classement.find((x) => x.negoceId === g.negoceId)?.rang ?? null;
    const prix = g.prix as Record<string, number>;
    const livraison = g.livraison as LivraisonEnregistree | null;
    return {
      negoce: g.negoce.nom,
      mois: g.cycle.mois,
      departement: g.cycle.zone,
      ouverte,
      echeance: ouverte ? echeanceNegoce(g.cycle.reponseAvant, maintenant) : null,
      reponseAvant: g.cycle.reponseAvant.toISOString(),
      lignes: lignes.map((l) => ({ designation: l.designation, quantite: l.quantite, unite: l.unite, prixUnitaire: prix[l.cle] ?? null })),
      depose: g.deposeLe ? { le: g.deposeLe.toISOString(), fichiers: g.fichiers.map((f) => f.nom), statut: g.statutExtraction, manquantes: lignes.filter((l) => prix[l.cle] === undefined).length, livraison: livraison ? { depart: livraison.depart, francoKm: livraison.francoKm, prixAuDela: livraison.prixAuDela } : null } : null,
      rang: g.deposeLe ? phraseDeRang(rang) : null,
      phrases: { regles: PHRASE_AU_NEGOCE, fermes: PHRASE_PRIX_FERMES },
    };
  }

  /**
   * Le négoce dépose son devis (un ou deux PDF) et ses deux chiffres de livraison, avant la limite. Le devis est lu UNE
   * fois ; les prix lus sont rapprochés des lignes de la grille par le code ; un nouveau dépôt remplace le précédent.
   */
  async deposerGrille(jeton: string, depot: { fichiers: FichierGrille[]; livraison: { depart?: string | null; francoKm?: string | null; prixAuDela?: string | null } }, maintenant = new Date()) {
    const g = await this.grilleDuJeton(jeton);
    if (g.cycle.phase !== "negoces" || maintenant >= g.cycle.reponseAvant) throw new DomainError("conflict", "Deadline passed", { reason: "delai_passe" });
    if (depot.fichiers.length === 0) throw validationFailed("Quote required", { reason: "devis_requis" });
    if (depot.fichiers.length > 2) throw validationFailed("Two quotes at most", { reason: "deux_devis_au_plus" });
    for (const f of depot.fichiers) if (f.type !== "application/pdf" || !f.contenu.subarray(0, 5).toString().startsWith("%PDF")) throw validationFailed("PDF only", { reason: "pdf_seulement" });
    const regle = lireRegleDeLivraison(depot.livraison);
    if (!regle) throw validationFailed("Delivery terms required", { reason: "livraison_requise" });
    const lignes = g.cycle.lignes as unknown as LigneDeGrille[];
    const lecture = await this.lire(g.cycle.numero, lignes, depot.fichiers);
    const distances = await this.distances(g.cycleId, regle.depart);
    await this.prisma.$transaction(async (tx) => {
      await tx.grilleNegoceFichier.deleteMany({ where: { grilleId: g.id } });
      await tx.grilleNegoce.update({
        where: { id: g.id },
        data: { deposeLe: maintenant, prix: lecture.prix, statutExtraction: lecture.statut, livraison: { ...regle, distances }, fichiers: { create: depot.fichiers.map((f) => ({ nom: f.nom, type: f.type, contenu: new Uint8Array(f.contenu) })) } },
      });
    });
    return this.pageGrille(jeton, maintenant);
  }

  /** Lit le devis (une fois) et rapproche chaque prix lu d'une ligne de la grille : même clé de référence, sinon même texte. */
  private async lire(numero: number, lignes: readonly LigneDeGrille[], fichiers: readonly FichierGrille[]): Promise<{ statut: "lue" | "a_verifier" | "echec"; prix: Record<string, number> }> {
    if (!this.extracteur) return { statut: "a_verifier", prix: {} };
    const prix: Record<string, number> = {};
    let statut: "lue" | "a_verifier" | "echec" = "lue";
    for (const f of fichiers) {
      let texte = "";
      try {
        const contenu = await this.pdf.read(new Uint8Array(f.contenu), { maxPages: 10 });
        texte = contenu.pages.map((p) => p.lines.map((l, i) => `[${p.pageNumber}:${String(i + 1).padStart(3, "0")}] ${l}`).join("\n")).join("\n");
      } catch {
        texte = "";
      }
      const document = texte.trim() ? { numberedText: texte, imagePdf: null, imagePages: [] } : { numberedText: "", imagePdf: new Uint8Array(f.contenu), imagePages: [1] };
      const total = lignes.reduce((s, l) => s + l.quantite, 0);
      const tentative = await this.extracteur
        .lire({ ...document, lot: { numero, designation: lignes.map((l) => `${l.designation} (${l.quantite} ${l.unite})`).join(" ; "), unite: "", volumeFerme: String(total), volumeProbable: String(total) } })
        .catch(() => null);
      const s = statutDeLecture(tentative);
      if (s !== "lue") statut = statut === "echec" ? statut : s;
      if (tentative?.output) Object.assign(prix, rapprocher(tentative.output, lignes));
    }
    return { statut, prix };
  }

  /** La distance du dépôt à chaque chantier de chaque artisan de la commande (une liste par entreprise). */
  private async distances(cycleId: string, depart: string): Promise<Record<string, (number | null)[]>> {
    const besoins = await this.prisma.besoin.findMany({ where: { cycleId, statut: { in: [...DANS_LA_COMMANDE] } }, select: { companyId: true, adresseLivraison: true }, orderBy: { createdAt: "asc" } });
    const parEntreprise = new Map<string, Set<string>>();
    for (const b of besoins) parEntreprise.set(b.companyId, (parEntreprise.get(b.companyId) ?? new Set()).add(b.adresseLivraison));
    const point = async (a: string) => (this.geocodeur ? await this.geocodeur.point(a).catch(() => null) : null);
    const pDepot = await point(depart);
    const out: Record<string, (number | null)[]> = {};
    for (const [companyId, adresses] of parEntreprise) {
      out[companyId] = await Promise.all([...adresses].map(async (a) => {
        const p = await point(a);
        return pDepot && p ? distanceRouteKm(pDepot, p) : null;
      }));
    }
    return out;
  }
}

/** Le jour (Paris) d'un instant : « 2026-10-22 ». */
function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

function moisJour(d: Date): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function messageDAjout(lignes: readonly { quantite: number; unite: string; designation: string }[]): MessageArtisan {
  return { titre: "La commande commune grossit", corps: messageAjout(lignes), url: "/groupe", etiquette: "ajouts-commande-du-mois" };
}

const lireNombre = (s: string | null | undefined): number | null => {
  if (!s) return null;
  const n = Number(s.replace(/[\s€\u202f\u00a0]/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/**
 * Le rapprochement d'un prix lu avec une ligne de la grille, sans IA : même clé de référence (libellé, dimension,
 * teinte), sinon le libellé de la ligne contenu dans celui du devis (ou l'inverse). Une ligne déjà rapprochée garde son
 * premier prix ; un prix sans ligne est ignoré.
 */
export function rapprocher(lue: ReponseLue, lignes: readonly LigneDeGrille[]): Record<string, number> {
  const prix: Record<string, number> = {};
  const norm = (t: string) => normalizeText(t).replace(/\s+/g, " ").trim();
  for (const p of lue.paliers) {
    const pu = lireNombre(p.prixUnitaireHt);
    if (pu === null) continue;
    const cleLue = cleDeReference({ libelle: p.designation });
    const texte = norm(p.designation);
    const ligne = lignes.find((l) => l.cle.split("#")[0] === cleLue) ?? lignes.find((l) => texte.includes(norm(l.designation)) || norm(l.designation).includes(texte));
    if (ligne && prix[ligne.cle] === undefined) prix[ligne.cle] = pu;
  }
  return prix;
}

export { cleDeLigne };
