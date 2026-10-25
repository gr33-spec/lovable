import { emailsDemo } from "../../../platform/demo-domaine.js";
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
  finDeGarantie,
  finDeValidite,
  referenceStricte,
  phraseVolumeNonAtteint,
  validiteAcceptee,
  VALIDITE_MIN_JOURS,
  mailClotureSansCompte,
  mailGrilleAuNegoce,
  mentionGarantie,
  mentionPrixFerme,
  PHRASE_PRIX_FERMES_VOLUME,
  phrasePaliers,
  fraisDeLivraisonPaliers,
  titreGarantie,
  mailRelanceNegoce,
  mailResultatNegoce,
  messageAjout,
  messageTropTard,
  clesDeCommande,
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
  type PaliersLivraison,
  type PhaseCycle,
  familleDuMetier,
  consultationPourLeNegoce,
  messageDeReport,
  messageNouvellesReponses,
  phraseDeMonNegoce,
  phraseDeReport,
  phraseResultatsLe,
  suiviDesDemandes,
  CONDITIONS_NEGOCE_VERSION,
  conditionsNegoceAJour,
  type SuiviDesDemandes,
  combinaisonsDeLArtisan,
  libelleDeCombinaison,
  phraseDeLivraisons,
  lignesDuNegoce,
  concerne,
  rangSurSonPerimetre,
  type ProfilNegoce,
  prixChezUnNegoce,
  LIBELLES_COURTS_FAMILLES,
} from "@baticlair/domain";
import type { Alerter } from "../../../platform/alerts/alerter.js";
import { estExclu } from "../../privacy/index.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import { isUuid } from "../../../platform/validation/ids.js";
import type { PdfReader } from "../../documents/index.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import type { ReviewedTakeoff } from "../../takeoff/index.js";
import type { EspaceNegoceService } from "./espace-negoce.service.js";
import type { Geocodeur } from "./geocodeur.js";
import { lignesProposables } from "./groupe.service.js";
import { statutDeLecture, type NegoceExtractor, type ReponseLue } from "./negoce-extractor.js";
import { pdfDeTexte } from "../../../platform/pdf/pdf-texte.js";
import { NOM_APP, ecartDuCycle, type ActionPayante } from "@baticlair/domain";

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
  /** Le suivi des demandes de prix (Greg, 24 octobre 2026) : des comptes, jamais un nom ni un prix avant les résultats. */
  demandes: SuiviDesDemandes | null;
  /** Les négoces que l'artisan a mis dans la boucle : répondu ou pas (phase des négoces seulement). */
  mesNegoces: string[];
  /** La liste reportée d'une commande sans réponse : « Aucun négoce n'a répondu à la commande du 1er novembre… ». */
  report: string | null;
  /** Les résultats existent mais le paywall les cache (essai fini, liste déposée après l'accès). */
  resultatsBloques: boolean;
  resultats: null | {
    parDefaut: string | null;
    moinsCherPourToi: string | null;
    negoces: { negoceId: string; nom: string; totalHt: number; marchandiseHt: number; livraisonHt: number; manquantes: number; complet: boolean; livrable: boolean; indicatives: { designation: string; prixUnitaire: number }[]; premierSurLeTotal: boolean }[];
    choix: { negoceId: string; totalHt: number; commandeLe: string | null; libelle: string | null } | null;
    /** Multimétier (Greg, 25 octobre 2026) : les 2 ou 3 meilleures combinaisons livrées, la moins chère d'abord. */
    combinaisons: { cle: string; libelle: string; totalHt: number; livraisons: number; phraseLivraisons: string; ecartHt: number; toutChez: string | null; parts: { negoceId: string; nom: string; familles: string[]; lignes: number; totalHt: number; livraisonHt: number }[] }[];
    /** Les familles de sa liste qu'aucun négoce n'a entièrement chiffrées, en toutes lettres (« second œuvre »). */
    sansPrix: string[];
  };
}

/**
 * MULTIMÉTIER (Greg, 25 octobre 2026) : une seule commande du mois par département, toutes familles ensemble ; chaque
 * ligne porte sa famille. Les commandes d'avant gardent leur famille (une seule) et restent servies telles quelles.
 */
export const FAMILLE_TOUTES = "toutes";
const profilDe = (n: { id: string; generaliste: boolean; familles: readonly string[] }): ProfilNegoce => ({ negoceId: n.id, generaliste: n.generaliste, familles: n.familles });
/** La famille d'une commande d'avant le multimétier (sinon null : chaque ligne porte la sienne). */
const familleHeritee = (c: { famille: string }) => (c.famille === FAMILLE_TOUTES ? null : c.famille);

/** La grille garantie 30 jours d'une commande (Greg, 23 octobre 2026) : ce que tout artisan de la zone voit après les résultats. */
export interface GarantieVue {
  cycleId: string;
  mois: Mois;
  de: string;
  zone: string;
  titre: string;
  jusquau: string;
  negoce: { id: string; nom: string };
  livraison: string;
  lignes: { cle: string; designation: string; unite: string; prixUnitaire: number }[];
  /** Les recommandes déjà passées par l'entreprise sur cette grille. */
  commandes: { numero: number; totalHt: number; le: string; adresse: string }[];
}

/** Une part de la combinaison commandée : ce qui part chez ce négoce, et quand son bon est parti. */
type PartChoisie = { negoceId: string; familles: string[]; cles: string[]; totalHt: number; livraisonHt: number; envoyeLe: string | null };

/** La livraison figée au dépôt d'une grille : les dépôts du négoce, ses paliers, la distance du dépôt le plus proche à chaque chantier. */
type LivraisonEnregistree = { depots: { adresse: string; lat: number | null; lon: number | null }[]; paliers: PaliersLivraison; distances: Record<string, (number | null)[]> };
/**
 * MULTIMÉTIER (Greg, 23 octobre au soir : « on va faire en multimétier ») : le regroupement d'une entreprise est celle
 * de la famille de son métier (couverture pour un couvreur, électricité pour un électricien…), dans son département.
 * Sans métier connu, la couverture (le premier métier de BatiClair).
 */
export function familleDeLEntreprise(trades: readonly string[] | null | undefined): string {
  return familleDuMetier(trades?.[0]) ?? "couverture";
}

/** Le 30 % de lignes « non garanties » au-delà duquel Greg est prévenu (point 8). */
const PART_NON_GARANTIE_ALERTE = 0.3;
const CLE_RAPPELS = (cycleId: string) => `rappels-cloture:${cycleId}`;
const CLE_ALERTE = (quoi: string, cycleId: string) => `alerte:${quoi}:${cycleId}`;
/** Les listes reportées dans une commande (une entrée par commande sans réponse) : `[{ de, entreprises }]`. */
const CLE_REPORT = (cycleId: string) => `report:${cycleId}`;
/** Les réponses de négoces pas encore annoncées à un artisan (une notification par jour au plus). */
const CLE_REPONSES = (cycleId: string, companyId: string) => `reponses:${cycleId}:${companyId}`;

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
    /** L'ouverture du regroupement pour l'entreprise (SIRET vérifié, département ouvert, pas d'exclusion). */
    private readonly ouverte: (tenant: TenantContext) => Promise<void>,
    /** L'espace négoce (23 octobre 2026) : liens d'invitation et de désabonnement, comptes inscrits. */
    private readonly espace: EspaceNegoceService,
    private readonly alerter: Alerter,
    /** L'abonnement artisan (24 octobre 2026) : le paywall sur déposer, voir les résultats, commander, recommander. */
    private readonly abonnement: { exiger(companyId: string, action: ActionPayante, maintenant?: Date, deposeeLe?: Date | null): Promise<void>; permis(companyId: string, action: ActionPayante, maintenant?: Date, deposeeLe?: Date | null): Promise<boolean> } | null = null,
  ) {}

  /**
   * Recentrage (Greg, 25 octobre 2026) : à la clôture d'un REGROUPEMENT (une famille), le volume minimum ; branché par le
   * module des regroupements. Null : pas de contrôle (la commande toutes familles d'avant).
   */
  private volume: (c: { id: string; famille: string }) => Promise<{ atteint: boolean; estimeHt: number } | null> = async () => null;
  brancherVolume(f: (c: { id: string; famille: string }) => Promise<{ atteint: boolean; estimeHt: number } | null>): void {
    this.volume = f;
  }

  /** Le lien d'une grille, pour l'espace du négoce. */
  jetonDeGrille(grilleId: string): string {
    return jetonDeGrille(this.reglages.authSecret, grilleId);
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Réglages (admin)
  // ---------------------------------------------------------------------------------------------------------------

  async config(): Promise<ConfigCycle> {
    const p = await this.prisma.parametreGroupe.findUnique({ where: { cle: CLE_CONFIG } });
    return { ...CONFIG_CYCLE_DEFAUT, ...((p?.valeur as Partial<ConfigCycle> | null) ?? {}) };
  }

  /**
   * L'admin change les réglages : les heures et le délai de réponse valent pour les commandes pas encore closes (leurs
   * dates sont recalculées) ; les deux jours de clôture valent pour les commandes pas encore ouvertes (le jour d'une
   * commande ouverte est dans sa clé : il se change par ses propres dates, `datesDuCycleAdmin`).
   */
  async changerConfig(c: ConfigCycle): Promise<ConfigCycle> {
    const jour = (j: number) => Number.isInteger(j) && j >= 1 && j <= 28;
    const heure = (h: number) => Number.isInteger(h) && h >= 0 && h <= 23;
    if (!(jour(c.jourCloture1) && jour(c.jourCloture2) && c.jourCloture1 !== c.jourCloture2 && heure(c.heureCloture) && Number.isInteger(c.joursOuvresReponse) && c.joursOuvresReponse >= 1 && c.joursOuvresReponse <= 40 && heure(c.heureReponse))) {
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
   * La commande ouverte pour (famille, zone) à `maintenant` : celle déjà en base dont la clôture n'est pas passée, sinon
   * la première clé des réglages pas encore close (créée au besoin). `visee` : la commande que l'artisan avait sous les
   * yeux ; si elle n'est plus celle qui s'ouvre, `tardPour` la nomme (« Trop tard pour le 15 octobre… »).
   */
  private async cycleOuvert(zone: string, maintenant: Date, visee: Mois | null = null, famille: string = FAMILLE_TOUTES): Promise<{ cycle: { id: string; mois: string; numero: number }; tardPour: Mois | null }> {
    const tard = (mois: Mois) => (visee && visee !== mois ? visee : null);
    // Une seule commande ouverte par département et par famille (« toutes » : la commande commune d'avant ; une famille :
    // un regroupement, recentrage du 25 octobre 2026).
    const ouvert = await this.prisma.cycleCommande.findFirst({ where: { zone, famille, phase: "inscriptions", clotureLe: { gt: maintenant } }, orderBy: { clotureLe: "asc" } });
    if (ouvert) return { cycle: ouvert, tardPour: tard(ouvert.mois) };
    const config = await this.config();
    for (const mois of clesDeCommande(maintenant, config)) {
      const d = datesDuCycle(mois, config);
      if (maintenant >= d.clotureLe) continue;
      const existant = await this.prisma.cycleCommande.findFirst({ where: { mois, zone, famille }, select: { id: true } });
      // Une commande déjà close par l'admin (clôture avancée) ne se rouvre pas : la suivante.
      if (existant) continue;
      const cycle = await this.prisma.cycleCommande.create({ data: { mois, famille, zone, clotureLe: d.clotureLe, reponseAvant: d.reponseAvant, relanceLe: d.relanceLe } });
      return { cycle, tardPour: tard(mois) };
    }
    throw new DomainError("conflict", "No open cycle", { reason: "pas_de_cycle" });
  }

  /**
   * Recentrage (25 octobre 2026) : le regroupement d'une famille pour le cycle choisi (« ce cycle » ou « le suivant »),
   * créé au besoin ; refusé s'il est déjà clos (une référence n'est jamais reconsultée dans le même cycle).
   */
  async regroupementPour(zone: string, famille: string, mois: Mois, maintenant = new Date()): Promise<{ id: string; mois: string; numero: number; clotureLe: Date }> {
    const config = await this.config();
    const d = datesDuCycle(mois, config);
    if (maintenant >= d.clotureLe) throw new DomainError("conflict", "Order closed", { reason: "commande_close" });
    const existant = await this.prisma.cycleCommande.findUnique({ where: { mois_famille_zone: { mois, famille, zone } } });
    if (existant) {
      if (existant.phase !== "inscriptions" || maintenant >= existant.clotureLe) throw new DomainError("conflict", "Order closed", { reason: "commande_close" });
      return existant;
    }
    return this.prisma.cycleCommande
      .create({ data: { mois, famille, zone, clotureLe: d.clotureLe, reponseAvant: d.reponseAvant, relanceLe: d.relanceLe } })
      .catch(async (e: unknown) => {
        if (!isUniqueViolation(e)) throw e;
        return this.prisma.cycleCommande.findUniqueOrThrow({ where: { mois_famille_zone: { mois, famille, zone } } });
      });
  }

  /** Les lignes d'une liste qu'on peut proposer (quantité établie, famille), pour les regroupements. */
  async lignesDuChantier(tenant: TenantContext, projectId: string): Promise<{ takeoffId: string; adresse: string | null; lignes: { key: string; designation: string; quantite: number; unite: string; famille: string }[] }> {
    if (!isUuid(projectId)) throw notFound("Project");
    const project = await this.prisma.project.findFirst({ where: { id: projectId, companyId: tenant.companyId }, select: { address: true } });
    if (!project) throw notFound("Project");
    const takeoff = await this.prisma.takeoff.findFirst({ where: { projectId, companyId: tenant.companyId }, orderBy: { createdAt: "desc" }, select: { id: true } });
    if (!takeoff) return { takeoffId: "", adresse: project.address, lignes: [] };
    const reviewed = await this.reviewed(tenant, takeoff.id);
    const lignes = lignesProposables(reviewed, reviewed.purchase.toBuy.map((b) => b.key));
    return { takeoffId: takeoff.id, adresse: project.address, lignes: lignes.map(({ item, q, famille }) => ({ key: item.key, designation: item.label, quantite: Number(q.quantite), unite: q.unite, famille })) };
  }

  /**
   * Déposer des lignes de sa liste dans la commande du mois : seulement du matériel sûr (chantier signé ou stock), des
   * lignes précises. Sans engagement : l'artisan commandera seulement si le prix lui plaît.
   */
  async deposer(tenant: TenantContext, projectId: string, d: { articles: readonly string[]; nature: Nature; mois?: Mois | null }, maintenant = new Date()): Promise<{ mois: Mois; message: string | null; vue: VueDuMois }> {
    assertCanWrite(tenant);
    await this.ouverte(tenant);
    await this.abonnement?.exiger(tenant.companyId, "deposer", maintenant);
    if (!NATURES.includes(d.nature)) throw validationFailed("Unknown nature", { reason: "nature_inconnue" });
    if (!isUuid(projectId)) throw notFound("Project");
    const project = await this.prisma.project.findFirst({ where: { id: projectId, companyId: tenant.companyId }, select: { id: true, address: true } });
    if (!project) throw notFound("Project");
    const zone = zoneDuCodePostal(project.address);
    if (!zone || !project.address) throw validationFailed("The site needs an address with a postcode", { reason: "adresse_requise" });
    const takeoff = await this.prisma.takeoff.findFirst({ where: { projectId, companyId: tenant.companyId }, orderBy: { createdAt: "desc" }, select: { id: true } });
    if (!takeoff) throw validationFailed("No materials list", { reason: "pas_de_liste" });
    const lignes = lignesProposables(await this.reviewed(tenant, takeoff.id), d.articles);
    if (lignes.length === 0) throw validationFailed("Nothing to add", { reason: "rien_a_ajouter" });
    const ajoutes: { quantite: number; unite: string; designation: string; cycleId: string }[] = [];
    let moisDeLaListe: Mois | null = null;
    let tardPour: Mois | null = null;
    {
      const { cycle, tardPour: tard } = await this.cycleOuvert(zone, maintenant, d.mois ?? null);
      moisDeLaListe ??= cycle.mois;
      tardPour ??= tard;
      await this.prisma.$transaction(async (tx) => {
        // Même verrou que la clôture : la ligne entre dans la grille, ou la commande est déjà close et l'artisan réessaie.
        const [etat] = await tx.$queryRaw<{ phase: string; clotureLe: Date }[]>`SELECT phase, "clotureLe" FROM cycle_commande WHERE id = ${cycle.id}::uuid FOR UPDATE`;
        if (!etat || etat.phase !== "inscriptions" || maintenant >= etat.clotureLe) throw new DomainError("conflict", "Order closed", { reason: "commande_close" });
        for (const { item, q, famille } of lignes) {
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
      const ouvert = await this.prisma.cycleCommande.findFirst({ where: { zone, phase: "inscriptions", clotureLe: { gt: maintenant } }, orderBy: { clotureLe: "asc" }, select: { id: true } });
      if (ouvert) ids.add(ouvert.id);
    }
    const cycles = await this.prisma.cycleCommande.findMany({ where: { id: { in: [...ids] } }, orderBy: { clotureLe: "desc" } });
    return Promise.all(cycles.map((c) => this.vueDuCycle(tenant, c, maintenant)));
  }

  /**
   * La commande ouverte d'un département (chrono, quantités) : celui du chantier quand il est donné (le bloc de « Ton
   * chantier », Greg, 23 octobre 2026), sinon celui de l'entreprise (l'onglet « Regroupement »).
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
    const c = await this.cycleAffiche(zone, maintenant);
    if (!c) return null;
    const tout = c.id ? await this.lignesDuCycle(c.id) : [];
    // Greg (23 octobre) : l'accueil montre « Toi seul : … » quand l'entreprise a déjà déposé dans cette commande.
    const toi = c.id ? await this.lignesDuCycle(c.id, tenant.companyId) : [];
    const affichage = affichageDeLaCommande({ mois: c.mois, toi, tout, seul: false, clotureDans: null });
    return { mois: c.mois, de: deMois(c.mois), zone, clotureLe: c.clotureLe.toISOString(), clotureDans: chrono(maintenant, c.clotureLe), toi: toi.length ? affichage.toi : null, tout: affichage.tout, vide: tout.length === 0 };
  }

  /** La commande ouverte d'un département, sans rien créer : le cycle en base s'il existe, sinon ses dates seules. */
  private async cycleAffiche(zone: string, maintenant: Date): Promise<{ id: string | null; mois: Mois; clotureLe: Date } | null> {
    const ouvert = await this.prisma.cycleCommande.findFirst({ where: { zone, phase: "inscriptions", clotureLe: { gt: maintenant } }, orderBy: { clotureLe: "asc" } });
    if (ouvert) return { id: ouvert.id, mois: ouvert.mois, clotureLe: ouvert.clotureLe };
    const config = await this.config();
    for (const mois of clesDeCommande(maintenant, config)) {
      const d = datesDuCycle(mois, config);
      if (maintenant >= d.clotureLe) continue;
      if (await this.prisma.cycleCommande.findFirst({ where: { mois, zone }, select: { id: true } })) continue;
      return { id: null, mois, clotureLe: d.clotureLe };
    }
    return null;
  }

  private async lignesDuCycle(cycleId: string, companyId?: string): Promise<LigneDeGrille[]> {
    const besoins = await this.prisma.besoin.findMany({ where: { cycleId, statut: { in: [...DANS_LA_COMMANDE] }, ...(companyId ? { companyId } : {}) }, orderBy: { createdAt: "asc" }, select: { cle: true, designation: true, quantite: true, unite: true } });
    return fusionnerLesListes(besoins.map((b) => ({ cle: b.cle, designation: b.designation, quantite: Number(b.quantite), unite: b.unite })));
  }

  private async vueDuCycle(tenant: TenantContext, c: { id: string; numero: number; mois: string; famille: string; phase: string; zone: string; clotureLe: Date; reponseAvant: Date; relanceLe: Date; lignes: unknown }, maintenant: Date): Promise<VueDuMois> {
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
    // Le paywall (24 octobre 2026) : sans abonnement, les résultats d'une liste déposée APRÈS la fin de l'accès sont cachés ;
    // ceux d'une liste déposée pendant l'essai restent visibles.
    const resultatsBloques = phase === "resultats" && toi.length > 0 && !!this.abonnement && !(await this.abonnement.permis(tenant.companyId, "voir_resultats", maintenant, mes[0]?.createdAt ?? null));
    if (phase === "resultats" && toi.length > 0 && !resultatsBloques) {
      const { chiffrees, classement, commandes } = await this.classement(c.id, c.lignes as unknown as LigneDeGrille[]);
      const moi = commandes.find((x) => x.companyId === tenant.companyId);
      if (moi && chiffrees.length > 0) {
        const comp = comparatifDeLArtisan(moi, chiffrees, classement);
        const nom = new Map(grilles.map((g) => [g.negoceId, g.negoce.nom]));
        const designationDe = new Map((c.lignes as unknown as LigneDeGrille[]).map((l) => [l.cle, l.designation]));
        const multi = combinaisonsDeLArtisan(moi, chiffrees, { familleDuCycle: familleHeritee(c) });
        const nomDe = (id: string) => nom.get(id) ?? "";
        const partsChoisies = (choix?.parts as PartChoisie[] | null) ?? null;
        resultats = {
          combinaisons: multi.combinaisons.map((x) => ({
            cle: x.cle,
            libelle: libelleDeCombinaison(x, nomDe),
            totalHt: x.totalHt,
            livraisons: x.livraisons,
            phraseLivraisons: phraseDeLivraisons(x.livraisons),
            ecartHt: x.ecartHt,
            toutChez: x.toutChez,
            parts: x.parts.map((p) => ({ negoceId: p.negoceId, nom: nomDe(p.negoceId), familles: p.familles, lignes: p.cles.length, totalHt: p.totalHt, livraisonHt: p.livraisonHt })),
          })),
          sansPrix: multi.sansPrix.map((f) => LIBELLES_COURTS_FAMILLES[f as keyof typeof LIBELLES_COURTS_FAMILLES] ?? f),
          parDefaut: comp.parDefaut,
          moinsCherPourToi: comp.moinsCherPourToi,
          negoces: comp.lignes.map((l) => ({ negoceId: l.negoceId, nom: nom.get(l.negoceId) ?? "", totalHt: l.totalHt, marchandiseHt: l.marchandiseHt, livraisonHt: l.livraisonHt, manquantes: l.manquantes, complet: l.complet, livrable: l.livrable, indicatives: l.indicatives.map((i) => ({ designation: designationDe.get(i.cle) ?? i.cle, prixUnitaire: i.prixUnitaire })), premierSurLeTotal: l.negoceId === comp.parDefaut })),
          choix: choix ? { negoceId: choix.negoceId, totalHt: Number(choix.totalHt), commandeLe: choix.commandeLe?.toISOString() ?? null, libelle: partsChoisies ? libelleDeCombinaison({ parts: partsChoisies, toutChez: partsChoisies.length === 1 && multi.sansPrix.length === 0 ? partsChoisies[0]!.negoceId : null }, nomDe) : null } : null,
        };
      }
    }
    const deposees = grilles.filter((g) => g.deposeLe).length;
    const demandes = suiviDesDemandes({ mois: c.mois, phase, consultes: grilles.length, repondus: deposees, reponseAvant: c.reponseAvant, relanceLe: c.relanceLe, maintenant });
    // Les négoces de l'artisan dans ce département : a répondu ou pas, jamais leur prix avant les résultats.
    let mesNegoces: string[] = [];
    if (phase === "negoces") {
      const liens = await this.prisma.negoceArtisan.findMany({ where: { companyId: tenant.companyId, negoce: { departement: c.zone, stopLe: null } }, include: { negoce: { select: { id: true, nom: true } } }, orderBy: { rang: "asc" } });
      const grilleDe = new Map(grilles.map((g) => [g.negoceId, g]));
      mesNegoces = liens.map((l) => {
        const g = grilleDe.get(l.negoce.id);
        return phraseDeMonNegoce(l.negoce.nom, !g ? "pas_consulte" : g.deposeLe ? "repondu" : "attente");
      });
    }
    const reports = ((await this.prisma.parametreGroupe.findUnique({ where: { cle: CLE_REPORT(c.id) } }))?.valeur as { de: string; entreprises: string[] }[] | null) ?? [];
    const report = reports.find((r) => r.entreprises.includes(tenant.companyId));
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
      suivi: suiviDansLeMois({ mois: c.mois, phase, clotureDans, reponseDans, grilles: deposees, negoces: grilles.length, commande: !!choix?.commandeLe, resultatsLe: phase === "negoces" ? phraseResultatsLe(c.reponseAvant) : null }),
      demandes,
      mesNegoces,
      report: report ? phraseDeReport(report.de, c.mois) : null,
      resultats,
      resultatsBloques,
    };
  }

  /**
   * L'économie réelle du premier cycle de l'entreprise (le paywall et les rappels de fin d'essai, 24 octobre 2026) : l'écart
   * entre le prix le plus cher reçu et le prix choisi (sinon le moins cher), sur les négoces qui ont tout chiffré. Null tant
   * qu'aucun cycle de l'entreprise n'a de résultats.
   */
  async ecartPremierCycle(companyId: string): Promise<number | null> {
    const premier = await this.prisma.besoin.findFirst({ where: { companyId, cycleId: { not: null }, cycle: { phase: "resultats" } }, orderBy: { createdAt: "asc" }, select: { cycleId: true } });
    if (!premier?.cycleId) return null;
    const c = await this.prisma.cycleCommande.findUniqueOrThrow({ where: { id: premier.cycleId } });
    const { chiffrees, classement, commandes } = await this.classement(c.id, c.lignes as unknown as LigneDeGrille[]);
    const moi = commandes.find((x) => x.companyId === companyId);
    if (!moi || chiffrees.length === 0) return null;
    const comp = comparatifDeLArtisan(moi, chiffrees, classement);
    const complets = comp.lignes.filter((l) => l.complet && l.livrable);
    const choix = await this.prisma.choixArtisan.findUnique({ where: { cycleId_companyId: { cycleId: c.id, companyId } }, select: { totalHt: true } });
    return ecartDuCycle(complets.map((l) => l.totalHt), choix ? Number(choix.totalHt) : null);
  }

  /**
   * L'économie moyenne réelle (l'argument des tarifs, 24 octobre 2026) : sur les cycles publiés (les 24 derniers), l'écart
   * moyen par artisan et par commande entre le prix le plus cher reçu et le prix choisi (ou le moins cher). Les comptes de
   * démonstration ne comptent pas.
   */
  async economieMoyenne(): Promise<{ cycles: number; parCommande: number | null; total: number }> {
    const cycles = await this.prisma.cycleCommande.findMany({ where: { phase: "resultats" }, orderBy: { resultatsLe: "desc" }, take: 24 });
    const ecarts: number[] = [];
    let publies = 0;
    for (const c of cycles) {
      const { chiffrees, classement, commandes } = await this.classement(c.id, c.lignes as unknown as LigneDeGrille[]);
      if (chiffrees.length === 0) continue;
      publies++;
      const choix = new Map((await this.prisma.choixArtisan.findMany({ where: { cycleId: c.id }, select: { companyId: true, totalHt: true } })).map((x) => [x.companyId, Number(x.totalHt)]));
      const demo = new Set((await this.prisma.membership.findMany({ where: { companyId: { in: commandes.map((x) => x.companyId) }, user: { OR: emailsDemo() } }, select: { companyId: true } })).map((m) => m.companyId));
      for (const moi of commandes) {
        if (demo.has(moi.companyId)) continue;
        const comp = comparatifDeLArtisan(moi, chiffrees, classement);
        const e = ecartDuCycle(comp.lignes.filter((l) => l.complet && l.livrable).map((l) => l.totalHt), choix.get(moi.companyId) ?? null);
        if (e) ecarts.push(e);
      }
    }
    const total = ecarts.reduce((s, x) => s + x, 0);
    return { cycles: publies, parCommande: ecarts.length ? Math.round(total / ecarts.length) : null, total: Math.round(total) };
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
    const grilles = await this.prisma.grilleNegoce.findMany({ where: { cycleId, deposeLe: { not: null } }, orderBy: { deposeLe: "asc" }, include: { negoce: { select: { id: true, generaliste: true, familles: true } } } });
    const profils = new Map(grilles.map((g) => [g.negoceId, profilDe(g.negoce)]));
    const chiffrees: GrilleChiffree[] = grilles
      .filter((g) => g.livraison)
      .map((g) => ({ negoceId: g.negoceId, prix: g.prix as Record<string, number>, livraison: (g.livraison as unknown as LivraisonEnregistree).paliers, nonGarantis: g.nonGarantis }));
    const besoins = await this.prisma.besoin.findMany({ where: { cycleId, statut: { in: [...DANS_LA_COMMANDE] } }, orderBy: { createdAt: "asc" }, select: { companyId: true, cle: true, designation: true, quantite: true, unite: true, adresseLivraison: true, famille: true } });
    const parEntreprise = new Map<string, typeof besoins>();
    for (const b of besoins) parEntreprise.set(b.companyId, [...(parEntreprise.get(b.companyId) ?? []), b]);
    const commandes: CommandeDArtisan[] = [...parEntreprise.entries()].map(([companyId, bs]) => {
      const distances: Record<string, (number | null)[]> = {};
      for (const g of grilles) {
        const l = g.livraison as unknown as LivraisonEnregistree | null;
        // Une entreprise absente des distances (jamais attendu : la commande est figée) paie la livraison, jamais zéro.
        if (l?.distances[companyId]) distances[g.negoceId] = l.distances[companyId]!;
      }
      return { companyId, chantiers: new Set(bs.map((b) => b.adresseLivraison)).size, distances, lignes: fusionnerLesListes(bs.map((b) => ({ cle: b.cle, designation: b.designation, quantite: Number(b.quantite), unite: b.unite, famille: b.famille }))) };
    });
    return { chiffrees, classement: classerLesGrilles(chiffrees, lignes, commandes), commandes, profils };
  }

  /**
   * « Commander » une combinaison (multimétier, Greg, 25 octobre 2026) : « Tout chez X », ou une famille chez l'un et une
   * autre chez l'autre. Le serveur recalcule la combinaison ; chaque négoce retenu reçoit UNIQUEMENT sa part du bon de
   * commande (ses lignes, sa livraison). L'ancien appel par négoce vaut « Tout chez ce négoce ».
   */
  async commander(tenant: TenantContext, cycleId: string, demande: { negoceId?: string | null; combinaison?: string | null }, maintenant = new Date()): Promise<VueDuMois> {
    assertCanWrite(tenant);
    await this.abonnement?.exiger(tenant.companyId, "commander", maintenant);
    if (!isUuid(cycleId) || (demande.negoceId && !isUuid(demande.negoceId)) || (!demande.negoceId && !demande.combinaison)) throw notFound("Cycle");
    const c = await this.prisma.cycleCommande.findUnique({ where: { id: cycleId } });
    if (!c) throw notFound("Cycle");
    if (c.phase !== "resultats") throw new DomainError("conflict", "No results yet", { reason: "pas_de_resultats" });
    const deja = await this.prisma.choixArtisan.findUnique({ where: { cycleId_companyId: { cycleId, companyId: tenant.companyId } } });
    if (deja?.commandeLe) throw new DomainError("conflict", "Already ordered", { reason: "deja_commande" });
    const { chiffrees, commandes } = await this.classement(c.id, c.lignes as unknown as LigneDeGrille[]);
    const moi = commandes.find((x) => x.companyId === tenant.companyId);
    if (!moi || chiffrees.length === 0) throw notFound("Negoce");
    const toutes = combinaisonsDeLArtisan(moi, chiffrees, { familleDuCycle: familleHeritee(c), max: Number.MAX_SAFE_INTEGER }).combinaisons;
    const combo = demande.combinaison ? toutes.find((x) => x.cle === demande.combinaison) : toutes.find((x) => x.toutChez === demande.negoceId);
    if (!combo) {
      const g = demande.negoceId ? chiffrees.find((x) => x.negoceId === demande.negoceId) : null;
      if (g) {
        const p = prixChezUnNegoce(moi, g);
        if (!p.livrable) throw validationFailed("This négoce does not deliver your area", { reason: "ne_livre_pas" });
        if (!p.complet) throw validationFailed("This négoce did not price every line of your list", { reason: "grille_incomplete" });
      }
      throw notFound("Negoce");
    }
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { name: true, siret: true, phone: true, contactEmail: true } });
    const besoins = await this.prisma.besoin.findMany({ where: { cycleId, companyId: tenant.companyId, statut: { in: [...DANS_LA_COMMANDE] } }, orderBy: { createdAt: "asc" } });
    // Une commande d'abord réservée (une seule passe, double appui compris) ; une part déjà partie lors d'un essai
    // précédent de la MÊME combinaison ne repart pas (un négoce ne reçoit jamais deux fois son bon).
    const anciennes = (deja?.parts as PartChoisie[] | null) ?? [];
    const memePart = (p: { negoceId: string; cles: readonly string[] }) => anciennes.find((a) => a.negoceId === p.negoceId && a.cles.join("|") === p.cles.join("|") && a.envoyeLe);
    const parts: PartChoisie[] = combo.parts.map((p) => ({ negoceId: p.negoceId, familles: p.familles, cles: p.cles, totalHt: p.totalHt, livraisonHt: p.livraisonHt, envoyeLe: memePart(p)?.envoyeLe ?? null }));
    const choix = { negoceId: parts[0]!.negoceId, totalHt: combo.totalHt, livraisonHt: Math.round(parts.reduce((s, p) => s + p.livraisonHt, 0) * 100) / 100, parts: parts as unknown as object, commandeLe: maintenant };
    const reserve = deja
      ? (await this.prisma.choixArtisan.updateMany({ where: { id: deja.id, commandeLe: null }, data: choix })).count === 1
      : await this.prisma.choixArtisan.create({ data: { cycleId, companyId: tenant.companyId, ...choix } }).then(
          () => true,
          (e: unknown) => (isUniqueViolation(e) ? false : Promise.reject(e)),
        );
    if (!reserve) throw new DomainError("conflict", "Already ordered", { reason: "deja_commande" });
    for (const part of parts) {
      if (part.envoyeLe) continue;
      const grille = await this.prisma.grilleNegoce.findUniqueOrThrow({ where: { cycleId_negoceId: { cycleId, negoceId: part.negoceId } }, include: { negoce: true } });
      const compte = await this.prisma.negoceArtisan.findUnique({ where: { companyId_negoceId: { companyId: tenant.companyId, negoceId: part.negoceId } }, select: { numeroCompte: true } });
      const prix = grille.prix as Record<string, number>;
      const cles = new Set(part.cles);
      const siens = besoins.filter((b) => cles.has(cleDeLigne(b)));
      const lignes = fusionnerLesListes(siens.map((b) => ({ cle: b.cle, designation: b.designation, quantite: Number(b.quantite), unite: b.unite }))).map((l) => ({ designation: l.designation, quantite: l.quantite, unite: l.unite, prixUnitaire: prix[l.cle]! }));
      const doc = bonDuMois({ numero: c.numero, mois: c.mois, negoce: grille.negoce.nom, artisan: { nom: company.name, siret: company.siret, telephone: company.phone, email: company.contactEmail }, numeroCompte: compte?.numeroCompte ?? null, chantiers: [...new Set(siens.map((b) => b.adresseLivraison))], lignes, livraisonHt: part.livraisonHt });
      const pdf = await pdfDeTexte(doc.titre, doc.blocs);
      try {
        await this.email.send({
          to: grille.negoce.email,
          subject: doc.titre,
          text: ["Bonjour,", "", `${company.name} commande au prix de votre grille du regroupement. Le bon de commande est joint.`, "", NOM_APP].join("\n"),
          attachments: [{ filename: `bon-de-commande-${c.mois}-${c.numero}.pdf`, contentType: "application/pdf", contentBase64: Buffer.from(pdf).toString("base64") }],
          ...(company.contactEmail ? { replyTo: company.contactEmail } : {}),
          mustDeliver: true,
        });
      } catch (e) {
        // Rien n'est commandé tant que toutes les parts ne sont pas parties ; celles déjà parties sont gardées.
        await this.prisma.choixArtisan.updateMany({ where: { cycleId, companyId: tenant.companyId }, data: { commandeLe: null, parts: parts as unknown as object } });
        throw e;
      }
      part.envoyeLe = maintenant.toISOString();
      await this.prisma.choixArtisan.updateMany({ where: { cycleId, companyId: tenant.companyId }, data: { parts: parts as unknown as object } });
    }
    await this.prisma.besoin.updateMany({ where: { cycleId, companyId: tenant.companyId, statut: "signe" }, data: { statut: "commande", participation: "commande" } });
    return this.vueDuCycle(tenant, c, maintenant);
  }

  // ---------------------------------------------------------------------------------------------------------------
  // La tâche planifiée
  // ---------------------------------------------------------------------------------------------------------------

  /** Clôture, envoi de la grille, relance de la veille, résultats ; puis les ajouts en attente. Rejouable sans doublon. */
  // ---------------------------------------------------------------------------------------------------------------
  // La démo admin (Greg, 24 octobre 2026) : jouer un cycle complet sans attendre le calendrier. Jamais en production
  // (la garde est dans le contrôleur) ; seuls les faux comptes `@demo.mobiiz.fr` y sont touchés.
  // ---------------------------------------------------------------------------------------------------------------

  /** Un faux artisan dépose ses lignes dans la commande ouverte de son département, sans passer par une vraie liste. */
  async deposerPourLaDemo(d: { companyId: string; projectId: string; takeoffId: string; adresse: string; lignes: readonly { designation: string; quantite: number; unite: string; famille: string }[] }, maintenant = new Date()): Promise<number> {
    const zone = zoneDuCodePostal(d.adresse);
    if (!zone) throw validationFailed("The site needs an address with a postcode", { reason: "adresse_requise" });
    let n = 0;
    for (const [i, l] of d.lignes.entries()) {
      // Recentrage (25 octobre 2026) : la démo joue les REGROUPEMENTS, une famille chacun ; seuls les gros articles à
      // référence stricte y entrent (les petits accessoires restent en demande perso). Le montant estimé reprend le prix
      // de base fictif des faux négoces.
      const r = referenceStricte(l.designation);
      if (!r.ok) continue;
      const { cycle } = await this.cycleOuvert(zone, maintenant, null, r.reference.famille);
      const lanceur = (await this.prisma.besoin.count({ where: { cycleId: cycle.id, statut: { in: [...DANS_LA_COMMANDE] } } })) === 0;
      await this.prisma.besoin.create({
        data: {
          companyId: d.companyId,
          projectId: d.projectId,
          takeoffId: d.takeoffId,
          articleKey: `demo-${i + 1}`,
          designation: l.designation,
          cle: r.reference.cle,
          famille: r.reference.famille,
          quantite: l.quantite,
          unite: l.unite,
          zone,
          adresseLivraison: d.adresse,
          fenetreTot: maintenant,
          fenetreTard: new Date(maintenant.getTime() + 60 * JOUR_MS),
          statut: "signe",
          signeLe: maintenant,
          cycleId: cycle.id,
          nature: "chantier",
          participation: "intention",
          estimeHt: Math.round(l.quantite * prixDeBaseDemo(`${r.reference.cle}#${l.unite.trim().toLowerCase()}`) * 100) / 100,
          lanceur,
        },
      });
      n++;
    }
    return n;
  }

  /** « Clôturer maintenant » ou « Publier les résultats » : la date passe à maintenant, puis la tâche du cycle tourne. */
  async avancerPourLaDemo(quoi: "cloturer" | "publier", zone: string, maintenant = new Date()) {
    if (quoi === "cloturer") {
      await this.prisma.cycleCommande.updateMany({ where: { zone, phase: "inscriptions", clotureLe: { gt: maintenant } }, data: { clotureLe: maintenant } });
    } else {
      await this.prisma.cycleCommande.updateMany({ where: { zone, phase: "negoces", reponseAvant: { gt: maintenant } }, data: { reponseAvant: maintenant } });
    }
    return this.tache(maintenant);
  }

  /**
   * « Faire répondre les négoces » : chaque faux négoce dépose sa grille, prix fictifs tirés de la désignation (un prix de
   * base par article, puis un écart propre à chaque négoce), prix fermes, livraison de son compte. Aucun PDF, aucune IA.
   */
  async repondrePourLaDemo(domaine: string, maintenant = new Date()): Promise<number> {
    const grilles = await this.prisma.grilleNegoce.findMany({ where: { deposeLe: null, cycle: { phase: "negoces", reponseAvant: { gt: maintenant } }, negoce: { email: { endsWith: `@${domaine}` } } }, include: { cycle: true, negoce: { include: { compte: { include: { depots: true } } } } }, orderBy: { createdAt: "asc" } });
    let n = 0;
    for (const [k, g] of grilles.entries()) {
      const compte = g.negoce.compte;
      if (!compte?.livraison) continue;
      const ecart = [0.94, 1, 1.07][k % 3]!;
      const prix: Record<string, number> = {};
      // Chaque faux négoce ne chiffre que ce qu'il vend : le spécialiste, ses familles ; le généraliste, tout.
      for (const l of lignesDuNegoce(g.cycle.lignes as unknown as LigneDeGrille[], profilDe(g.negoce), familleHeritee(g.cycle))) prix[l.cle] = Math.round(prixDeBaseDemo(l.cle) * ecart * 100) / 100;
      const depots = compte.depots.map((x) => ({ adresse: x.adresse, lat: x.lat, lon: x.lon }));
      const livraison: LivraisonEnregistree = { depots, paliers: compte.livraison as unknown as PaliersLivraison, distances: await this.distances(g.cycleId, depots) };
      await this.prisma.grilleNegoce.update({ where: { id: g.id }, data: { deposeLe: maintenant, prix, statutExtraction: "lue", livraison: livraison as object } });
      await this.annoncerReponse(g.cycle, maintenant).catch(() => undefined);
      n++;
    }
    return n;
  }

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
    await this.reponsesEnAttente(maintenant);
    await this.alertesDeSurveillance(maintenant).catch(() => undefined);
    return { clos, grillesEnvoyees, relances, resultats, ajouts };
  }

  /**
   * Les alertes à Greg (espace négoce, point 8), une fois par commande chacune : aucun négoce inscrit dans un département
   * où des artisans ont déposé ; aucune réponse 48 h avant la fin du délai des négoces. (La grille retenue trop « non
   * garantie » est vérifiée à la publication des résultats.)
   */
  private async alertesDeSurveillance(maintenant: Date): Promise<void> {
    const uneFois = async (quoi: string, cycleId: string, message: string) => {
      const cle = CLE_ALERTE(quoi, cycleId);
      if (await this.prisma.parametreGroupe.findUnique({ where: { cle } })) return;
      await this.prisma.parametreGroupe.create({ data: { cle, valeur: { le: maintenant.toISOString() } } });
      this.alerter.alert("commande_commune", message);
    };
    for (const c of await this.prisma.cycleCommande.findMany({ where: { phase: "inscriptions" } })) {
      const depots = await this.prisma.besoin.count({ where: { cycleId: c.id, statut: { in: [...DANS_LA_COMMANDE] } } });
      if (depots === 0) continue;
      const inscrits = await this.prisma.negoce.count({ where: { departement: c.zone, stopLe: null, compte: { inscritLe: { not: null } } } });
      if (inscrits === 0) await uneFois("sans-negoce", c.id, `aucun négoce inscrit dans le ${c.zone} alors que des artisans ont déposé pour la commande ${deMois(c.mois)}`);
    }
    for (const c of await this.prisma.cycleCommande.findMany({ where: { phase: "negoces", reponseAvant: { lte: new Date(maintenant.getTime() + 48 * 3600_000), gt: maintenant } } })) {
      const deposees = await this.prisma.grilleNegoce.count({ where: { cycleId: c.id, deposeLe: { not: null } } });
      if (deposees === 0) await uneFois("sans-reponse", c.id, `aucune réponse de négoce 48 h avant la fin du délai, commande ${deMois(c.mois)} (${c.zone})`);
    }
  }

  /** À la clôture : tout est figé, les listes fusionnées en UNE grille, envoyée à chaque négoce du métier et du département. */
  private async clore(c: { id: string; mois: string; famille: string; zone: string; clotureLe: Date; reponseAvant: Date }, maintenant: Date): Promise<number> {
    // Verrou sur la commande : un dépôt en cours (même verrou) finit avant que la grille ne soit figée, ou voit la clôture.
    const lignes = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM cycle_commande WHERE id = ${c.id}::uuid FOR UPDATE`;
      const besoins = await tx.besoin.findMany({ where: { cycleId: c.id, statut: { in: [...DANS_LA_COMMANDE] } }, orderBy: { createdAt: "asc" }, select: { cle: true, designation: true, quantite: true, unite: true, famille: true } });
      const l = fusionnerLesListes(besoins.map((b) => ({ cle: b.cle, designation: b.designation, quantite: Number(b.quantite), unite: b.unite, famille: b.famille })));
      await tx.cycleCommande.update({ where: { id: c.id }, data: { phase: l.length ? "negoces" : "resultats", closLe: maintenant, lignes: l.map((x) => ({ ...x })), ...(l.length ? {} : { resultatsLe: maintenant }) } });
      return l;
    });
    if (!lignes.length) return 0;
    // Recentrage : un regroupement sous son volume minimum n'est pas consulté ; ses participants sont prévenus et basculent
    // d'un clic (cycle suivant ou demande perso). Au-dessus, les intentions deviennent des quantités confirmées.
    const v = c.famille === FAMILLE_TOUTES ? null : await this.volume(c);
    if (v && !v.atteint) {
      await this.prisma.cycleCommande.update({ where: { id: c.id }, data: { phase: "resultats", resultatsLe: maintenant, statutVolume: "non_consulte", estimeHt: v.estimeHt } });
      const entreprises = await this.prisma.besoin.findMany({ where: { cycleId: c.id, statut: { in: [...DANS_LA_COMMANDE] } }, select: { companyId: true }, distinct: ["companyId"] });
      for (const { companyId } of entreprises)
        await this.notifications.prevenir(companyId, { titre: "Regroupement non consulté", corps: phraseVolumeNonAtteint(lignes[0]?.designation ?? "ce regroupement"), url: `/regroupements/${c.id}`, etiquette: `volume-${c.id}` }).catch(() => undefined);
      return 0;
    }
    if (v) {
      await this.prisma.cycleCommande.update({ where: { id: c.id }, data: { estimeHt: v.estimeHt } });
      await this.prisma.besoin.updateMany({ where: { cycleId: c.id, participation: "intention", statut: { in: [...DANS_LA_COMMANDE] } }, data: { participation: "quantite_confirmee" } });
    }
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
    // Les abonnés du département (espace négoce, 23 octobre 2026) : une ligne `negoce` par département desservi, reliée
    // à un compte inscrit ; un négoce invité sans compte reçoit l'e-mail de clôture avec son lien (3 cycles au plus).
    // Multimétier (Greg, 25 octobre 2026) : le généraliste reçoit tout ; un spécialiste seulement ses familles, et rien du
    // tout (ni grille, ni e-mail, ni relance) quand la commande n'en a aucune ligne.
    const negoces = (await this.prisma.negoce.findMany({ where: { departement: c.zone, stopLe: null, createdAt: { lt: c.clotureLe } }, include: { compte: true }, orderBy: { createdAt: "asc" } }))
      .filter((n) => concerne(lignes, profilDe(n), familleHeritee(c)))
      .slice(0, NEGOCES_PAR_GRILLE);
    let envoyees = 0;
    for (const n of negoces) {
      const siennes = lignesDuNegoce(lignes, profilDe(n), familleHeritee(c));
      if (!n.compte?.inscritLe) {
        await this.rappelerSansCompte(c, n, maintenant);
        continue;
      }
      const deja = await this.prisma.grilleNegoce.findUnique({ where: { cycleId_negoceId: { cycleId: c.id, negoceId: n.id } } });
      if (deja) continue;
      const id = randomUUID();
      const jeton = jetonDeGrille(this.reglages.authSecret, id);
      const grille = await this.prisma.grilleNegoce.create({ data: { id, cycleId: c.id, negoceId: n.id, tokenHash: hash(jeton) } });
      const mail = mailGrilleAuNegoce({ negoce: n.nom, mois: c.mois, departement: c.zone, lignes: siennes, reponseAvant: c.reponseAvant, maintenant, lien: `${this.reglages.webAppUrl}/grille/${jeton}`, stop: this.espace.lienDesabonnement(n.compte.id, c.zone, maintenant) });
      const pdf = await pdfDeTexte(mail.objet, [{ titre: "Le volume à chiffrer", lignes: [["Désignation", "Quantité"], ...siennes.map((l) => [l.designation, `${l.quantite.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${l.unite}`])] }, { lignes: [PHRASE_PRIX_FERMES, PHRASE_AU_NEGOCE] }]);
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

  /** Un négoce invité, jamais inscrit : l'e-mail de clôture avec son lien d'inscription, une fois par cycle, trois cycles au plus. */
  private async rappelerSansCompte(c: { id: string; mois: string; zone: string }, n: { id: string; email: string; siret: string | null; nom: string; compteId: string | null; compte: { id: string; rappels: number } | null }, maintenant: Date): Promise<void> {
    const compteId = n.compte?.id ?? null;
    const compte = n.compte ?? (await this.prisma.compteNegoce.findUnique({ where: { id: (await this.espace.inviter(n, maintenant), (await this.prisma.negoce.findUniqueOrThrow({ where: { id: n.id }, select: { compteId: true } })).compteId!) } }));
    if (!compte || compte.rappels >= 3) return;
    const cle = CLE_RAPPELS(c.id);
    const p = await this.prisma.parametreGroupe.findUnique({ where: { cle } });
    const faits = ((p?.valeur as string[] | null) ?? []).filter((x) => typeof x === "string");
    if (faits.includes(compte.id)) return;
    // Droit d'opposition (24 octobre 2026) : jamais un rappel à qui a demandé à ne plus être contacté.
    if (await estExclu(this.prisma, { email: n.email, siret: n.siret })) return;
    const mail = mailClotureSansCompte({ mois: c.mois, departement: c.zone, lien: this.espace.lienInvitation(compte.id, maintenant), opposition: this.espace.lienOpposition(compte.id, maintenant) });
    await this.email.send({ to: n.email, subject: mail.objet, text: mail.texte }).catch(() => undefined);
    await this.prisma.compteNegoce.update({ where: { id: compte.id }, data: { rappels: { increment: 1 }, invitationLe: maintenant } });
    await this.prisma.parametreGroupe.upsert({ where: { cle }, create: { cle, valeur: [...faits, compte.id] }, update: { valeur: [...faits, compte.id] } });
    void compteId;
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
  private async publierLesResultats(c: { id: string; mois: string; famille: string; zone: string; lignes: unknown }, maintenant: Date): Promise<void> {
    const { classement, chiffrees, commandes, profils } = await this.classement(c.id, c.lignes as unknown as LigneDeGrille[]);
    if (chiffrees.length === 0) {
      await this.reporter(c, maintenant);
      return;
    }
    const premier = classement[0]?.negoceId ?? null;
    // La grille garantie 30 jours (Greg, 23 octobre 2026) : le premier sur le total tient ses prix pour toute la zone.
    const retenu = classement[0]?.complete ? premier : null;
    // Recentrage (25 octobre 2026) : la garantie est la VALIDITÉ que le retenu a fixée (7 jours au moins) ; 30 jours sans elle.
    const validite = retenu ? (await this.prisma.grilleNegoce.findUnique({ where: { cycleId_negoceId: { cycleId: c.id, negoceId: retenu } }, select: { validiteJours: true } }))?.validiteJours : null;
    await this.prisma.cycleCommande.update({ where: { id: c.id }, data: { phase: "resultats", resultatsLe: maintenant, retenuId: retenu, garantieJusquau: retenu ? (validite ? finDeValidite(maintenant, validite) : finDeGarantie(maintenant)) : null } });
    if (retenu) {
      const g = chiffrees.find((x) => x.negoceId === retenu);
      const lignes = (c.lignes as unknown as LigneDeGrille[]).length;
      if (g && lignes > 0 && (g.nonGarantis?.length ?? 0) / lignes > PART_NON_GARANTIE_ALERTE) this.alerter.alert("commande_commune", `commande ${deMois(c.mois)} (${c.zone}) : la grille retenue a ${g.nonGarantis!.length} ligne(s) « non garantie(s) » sur ${lignes}`);
    }
    for (const g of await this.prisma.grilleNegoce.findMany({ where: { cycleId: c.id, deposeLe: { not: null }, resultatLe: null }, include: { negoce: true } })) {
      // Multimétier : « premier » sur son périmètre (ses lignes), comme pendant le chrono.
      const sienne = chiffrees.find((x) => x.negoceId === g.negoceId);
      const profil = profils.get(g.negoceId);
      const estPremier = sienne && profil ? rangSurSonPerimetre(sienne, profil, chiffrees, c.lignes as unknown as LigneDeGrille[], commandes, familleHeritee(c)) === 1 : g.negoceId === premier;
      const mail = mailResultatNegoce({ mois: c.mois, departement: c.zone, premier: estPremier });
      await this.email.send({ to: g.negoce.email, subject: mail.objet, text: mail.texte }).catch(() => undefined);
      await this.prisma.grilleNegoce.update({ where: { id: g.id }, data: { resultatLe: maintenant } });
    }
    const entreprises = await this.prisma.besoin.findMany({ where: { cycleId: c.id, statut: { in: [...DANS_LA_COMMANDE] } }, select: { companyId: true }, distinct: ["companyId"] });
    for (const { companyId } of entreprises) {
      await this.notifications.prevenir(companyId, { titre: "Les prix sont là", corps: "Regarde ton prix livré chez chaque négoce et commande si ça te plaît.", url: "/groupe", etiquette: `resultats-${c.id}` }).catch(() => undefined);
    }
  }

  /**
   * AUCUNE RÉPONSE À L'ÉCHÉANCE (Greg, 24 octobre 2026) : la liste de chaque artisan passe toute seule à la commande
   * suivante du même métier et du même département (« Ta liste passe automatiquement à la commande du 15 novembre »).
   * Les lignes ne sont pas recopiées : elles changent de commande. Chaque artisan est prévenu une fois.
   */
  private async reporter(c: { id: string; mois: string; famille: string; zone: string }, maintenant: Date): Promise<void> {
    await this.prisma.cycleCommande.update({ where: { id: c.id }, data: { phase: "resultats", resultatsLe: maintenant, retenuId: null, garantieJusquau: null } });
    const besoins = await this.prisma.besoin.findMany({ where: { cycleId: c.id, statut: "signe" }, select: { id: true, companyId: true } });
    if (besoins.length === 0) return;
    const { cycle: suivant } = await this.cycleOuvert(c.zone, maintenant, null, c.famille);
    const entreprises = [...new Set(besoins.map((b) => b.companyId))];
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM cycle_commande WHERE id = ${suivant.id}::uuid FOR UPDATE`;
      await tx.besoin.updateMany({ where: { id: { in: besoins.map((b) => b.id) } }, data: { cycleId: suivant.id } });
      const p = await tx.parametreGroupe.findUnique({ where: { cle: CLE_REPORT(suivant.id) } });
      const reports = [...(((p?.valeur as { de: string; entreprises: string[] }[] | null) ?? []).filter((r) => r.de !== c.mois)), { de: c.mois, entreprises }];
      await tx.parametreGroupe.upsert({ where: { cle: CLE_REPORT(suivant.id) }, create: { cle: CLE_REPORT(suivant.id), valeur: reports }, update: { valeur: reports } });
    });
    const message = messageDeReport(c.mois, suivant.mois);
    for (const companyId of entreprises) {
      await this.notifications.prevenir(companyId, { ...message, url: "/groupe", etiquette: `report-${c.id}` }).catch(() => undefined);
    }
  }

  /**
   * « 2 nouvelles réponses. » : chaque artisan de la commande est prévenu d'une grille déposée, au plus une fois par jour
   * (les suivantes attendent le passage d'un autre jour, regroupées). Jamais le nom du négoce ni son prix.
   */
  private async annoncerReponse(cycle: { id: string; reponseAvant: Date }, maintenant: Date): Promise<void> {
    const entreprises = await this.prisma.besoin.findMany({ where: { cycleId: cycle.id, statut: { in: [...DANS_LA_COMMANDE] } }, select: { companyId: true }, distinct: ["companyId"] });
    for (const { companyId } of entreprises) {
      const cle = CLE_REPONSES(cycle.id, companyId);
      const p = await this.prisma.parametreGroupe.findUnique({ where: { cle } });
      const etat = (p?.valeur as { enAttente?: number; dernierEnvoi?: string } | null) ?? {};
      const enAttente = (etat.enAttente ?? 0) + 1;
      if (etat.dernierEnvoi && moisJour(new Date(etat.dernierEnvoi)) === moisJour(maintenant)) {
        await this.prisma.parametreGroupe.upsert({ where: { cle }, create: { cle, valeur: { enAttente, dernierEnvoi: etat.dernierEnvoi } }, update: { valeur: { enAttente, dernierEnvoi: etat.dernierEnvoi } } });
        continue;
      }
      await this.notifications.prevenir(companyId, { ...messageNouvellesReponses(enAttente, cycle.reponseAvant), url: "/groupe", etiquette: `reponses-${cycle.id}` }).catch(() => undefined);
      await this.prisma.parametreGroupe.upsert({ where: { cle }, create: { cle, valeur: { enAttente: 0, dernierEnvoi: maintenant.toISOString() } }, update: { valeur: { enAttente: 0, dernierEnvoi: maintenant.toISOString() } } });
    }
  }

  /** Les réponses restées en attente partent au premier passage d'un autre jour, tant que les résultats ne sont pas là. */
  private async reponsesEnAttente(maintenant: Date): Promise<number> {
    let envoyes = 0;
    for (const p of await this.prisma.parametreGroupe.findMany({ where: { cle: { startsWith: "reponses:" } } })) {
      const etat = p.valeur as { enAttente?: number; dernierEnvoi?: string };
      if (!etat.enAttente || (etat.dernierEnvoi && moisJour(new Date(etat.dernierEnvoi)) === moisJour(maintenant))) continue;
      const [, cycleId, companyId] = p.cle.split(":");
      const cycle = await this.prisma.cycleCommande.findUnique({ where: { id: cycleId! }, select: { phase: true, reponseAvant: true } });
      // Les résultats publiés ont leur propre notification : les réponses en attente n'ont plus lieu d'être.
      if (cycle?.phase === "negoces") {
        await this.notifications.prevenir(companyId!, { ...messageNouvellesReponses(etat.enAttente, cycle.reponseAvant), url: "/groupe", etiquette: `reponses-${cycleId}` }).catch(() => undefined);
        envoyes++;
      }
      await this.prisma.parametreGroupe.update({ where: { cle: p.cle }, data: { valeur: { enAttente: 0, dernierEnvoi: maintenant.toISOString() } } });
    }
    return envoyes;
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
    // Un spécialiste ne voit que les lignes de ses familles (Greg, 25 octobre 2026) ; le généraliste toute la liste.
    const toutes = g.cycle.lignes as unknown as LigneDeGrille[];
    const lignes = lignesDuNegoce(toutes, profilDe(g.negoce), familleHeritee(g.cycle));
    const ouverte = g.cycle.phase === "negoces" && maintenant < g.cycle.reponseAvant;
    let rang: number | null = null;
    if (g.deposeLe) {
      // Le rang sur SON périmètre : rien ne dit s'il a en face un généraliste ou un spécialiste.
      const { chiffrees, commandes } = await this.classement(g.cycleId, toutes);
      const sienne = chiffrees.find((x) => x.negoceId === g.negoceId);
      rang = sienne ? rangSurSonPerimetre(sienne, profilDe(g.negoce), chiffrees, toutes, commandes, familleHeritee(g.cycle)) : null;
    }
    const prix = g.prix as Record<string, number>;
    const livraison = g.livraison as unknown as LivraisonEnregistree | null;
    const compte = g.negoce.compteId ? await this.prisma.compteNegoce.findUnique({ where: { id: g.negoce.compteId }, include: { depots: { select: { id: true } } } }) : null;
    const inscrit = !!compte?.inscritLe && compte.depots.length > 0 && !!compte.livraison;
    // Confidentialité (point 4) : les zones de livraison en communes, jamais une adresse exacte ni un nom.
    const besoins = await this.prisma.besoin.findMany({ where: { cycleId: g.cycleId, statut: { in: [...DANS_LA_COMMANDE] } }, select: { adresseLivraison: true } });
    const zones = [...new Set(besoins.map((b) => communeDe(b.adresseLivraison)).filter((z): z is string => !!z))].sort();
    return {
      negoce: g.negoce.nom,
      mois: g.cycle.mois,
      departement: g.cycle.zone,
      ouverte,
      echeance: ouverte ? echeanceNegoce(g.cycle.reponseAvant, maintenant) : null,
      // Combien de négoces sont consultés, jamais lesquels (Greg, 24 octobre 2026).
      consultation: consultationPourLeNegoce(await this.prisma.grilleNegoce.count({ where: { cycleId: g.cycleId } }), g.cycle.reponseAvant),
      reponseAvant: g.cycle.reponseAvant.toISOString(),
      zones,
      lignes: lignes.map((l) => ({ cle: l.cle, designation: l.designation, quantite: l.quantite, unite: l.unite, prixUnitaire: prix[l.cle] ?? null, nonGaranti: g.nonGarantis.includes(l.cle) })),
      depose: g.deposeLe ? { le: g.deposeLe.toISOString(), fichiers: g.fichiers.map((f) => f.nom), statut: g.statutExtraction, manquantes: lignes.filter((l) => prix[l.cle] === undefined).length, livraison: livraison ? phrasePaliers(livraison.paliers) : null } : null,
      rang: g.deposeLe ? phraseDeRang(rang) : null,
      // Le dépôt demande un compte inscrit (dépôts et paliers) : sans lui, le lien pour le créer.
      inscription: inscrit ? null : { lien: g.negoce.compteId ? this.espace.lienInvitation(g.negoce.compteId, maintenant) : await this.espace.inviter(g.negoce, maintenant) },
      livraison: inscrit ? phrasePaliers(compte!.livraison as unknown as PaliersLivraison) : null,
      // Une version majeure des conditions (24 octobre 2026) se redemande avant le prochain dépôt : sa date, ou null.
      conditionsAAccepter: inscrit && !conditionsNegoceAJour(compte!.conditionsVersion) ? CONDITIONS_NEGOCE_VERSION : null,
      phrases: { regles: PHRASE_AU_NEGOCE, fermes: PHRASE_PRIX_FERMES, volume: PHRASE_PRIX_FERMES_VOLUME },
    };
  }

  /**
   * Le négoce dépose son devis (un ou deux PDF), coche « prix fermes quel que soit le volume » (obligatoire) et, par
   * article, « prix non garanti » (matière cotée). La livraison vient de son compte : dépôts et paliers, figés avec la
   * grille, la distance du dépôt le plus proche à chaque chantier. Le devis est lu UNE fois ; un nouveau dépôt remplace
   * le précédent.
   */
  async deposerGrille(jeton: string, depot: { fichiers: FichierGrille[]; fermes: boolean; conditions?: boolean; nonGarantis: readonly string[]; validiteJours?: number | null }, maintenant = new Date()) {
    const g = await this.grilleDuJeton(jeton);
    if (depot.validiteJours !== undefined && depot.validiteJours !== null && !validiteAcceptee(depot.validiteJours)) throw validationFailed("Validity of at least 7 days", { reason: "validite_trop_courte", min: VALIDITE_MIN_JOURS });
    if (g.cycle.phase !== "negoces" || maintenant >= g.cycle.reponseAvant) throw new DomainError("conflict", "Deadline passed", { reason: "delai_passe" });
    const compte = g.negoce.compteId ? await this.prisma.compteNegoce.findUnique({ where: { id: g.negoce.compteId }, include: { depots: true } }) : null;
    if (!compte?.inscritLe || compte.depots.length === 0 || !compte.livraison) throw new DomainError("conflict", "Account required", { reason: "inscription_requise" });
    if (!depot.fermes) throw validationFailed("Firm prices required", { reason: "prix_fermes_requis" });
    // Les conditions en vigueur (version majeure) : acceptées une fois, horodatées sur le compte.
    if (!conditionsNegoceAJour(compte.conditionsVersion)) {
      if (!depot.conditions) throw validationFailed("Current terms must be accepted", { reason: "conditions_requises", version: CONDITIONS_NEGOCE_VERSION });
      await this.prisma.compteNegoce.update({ where: { id: compte.id }, data: { conditionsAccepteesLe: maintenant, conditionsVersion: CONDITIONS_NEGOCE_VERSION } });
    }
    if (depot.fichiers.length === 0) throw validationFailed("Quote required", { reason: "devis_requis" });
    if (depot.fichiers.length > 2) throw validationFailed("Two quotes at most", { reason: "deux_devis_au_plus" });
    for (const f of depot.fichiers) if (f.type !== "application/pdf" || !f.contenu.subarray(0, 5).toString().startsWith("%PDF")) throw validationFailed("PDF only", { reason: "pdf_seulement" });
    // Une grille partielle d'un spécialiste est acceptée : il ne chiffre que ses lignes (Greg, 25 octobre 2026).
    const lignes = lignesDuNegoce(g.cycle.lignes as unknown as LigneDeGrille[], profilDe(g.negoce), familleHeritee(g.cycle));
    const cles = new Set(lignes.map((l) => l.cle));
    const nonGarantis = [...new Set(depot.nonGarantis.filter((c) => cles.has(c)))];
    const lecture = await this.lire(g.cycle.numero, lignes, depot.fichiers);
    const depots = compte.depots.map((d) => ({ adresse: d.adresse, lat: d.lat, lon: d.lon }));
    const distances = await this.distances(g.cycleId, depots);
    const livraison: LivraisonEnregistree = { depots, paliers: compte.livraison as unknown as PaliersLivraison, distances };
    const premierDepot = !g.deposeLe;
    await this.prisma.$transaction(async (tx) => {
      await tx.grilleNegoceFichier.deleteMany({ where: { grilleId: g.id } });
      await tx.grilleNegoce.update({
        where: { id: g.id },
        data: { deposeLe: maintenant, prix: lecture.prix, statutExtraction: lecture.statut, livraison: livraison as object, nonGarantis, refuseLe: null, ...(depot.validiteJours ? { validiteJours: depot.validiteJours } : {}), fichiers: { create: depot.fichiers.map((f) => ({ nom: f.nom, type: f.type, contenu: new Uint8Array(f.contenu) })) } },
      });
    });
    if (premierDepot) await this.annoncerReponse(g.cycle, maintenant).catch(() => undefined);
    return this.pageGrille(jeton, maintenant);
  }

  /** Recentrage : « Je ne chiffre pas » (le négoce peut refuser une consultation). */
  async refuserGrille(jeton: string, maintenant = new Date()) {
    const g = await this.grilleDuJeton(jeton);
    if (g.deposeLe) throw new DomainError("conflict", "Already answered", { reason: "deja_repondu" });
    await this.prisma.grilleNegoce.update({ where: { id: g.id }, data: { refuseLe: maintenant, relanceLe: maintenant } });
    return { fait: true };
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

  /** La distance du dépôt LE PLUS PROCHE à chaque chantier de chaque artisan de la commande (une liste par entreprise). */
  private async distances(cycleId: string, depots: readonly { adresse: string; lat: number | null; lon: number | null }[]): Promise<Record<string, (number | null)[]>> {
    const besoins = await this.prisma.besoin.findMany({ where: { cycleId, statut: { in: [...DANS_LA_COMMANDE] } }, select: { companyId: true, adresseLivraison: true }, orderBy: { createdAt: "asc" } });
    const parEntreprise = new Map<string, Set<string>>();
    for (const b of besoins) parEntreprise.set(b.companyId, (parEntreprise.get(b.companyId) ?? new Set()).add(b.adresseLivraison));
    const points = await this.pointsDesDepots(depots);
    const out: Record<string, (number | null)[]> = {};
    for (const [companyId, adresses] of parEntreprise) {
      out[companyId] = await Promise.all([...adresses].map((a) => this.distanceDepuisLesDepots(points, a)));
    }
    return out;
  }

  private async pointsDesDepots(depots: readonly { adresse: string; lat: number | null; lon: number | null }[]): Promise<{ lat: number; lon: number }[]> {
    const points: { lat: number; lon: number }[] = [];
    for (const d of depots) {
      if (d.lat !== null && d.lon !== null) points.push({ lat: d.lat, lon: d.lon });
      else {
        const p = this.geocodeur ? await this.geocodeur.point(d.adresse).catch(() => null) : null;
        if (p) points.push(p);
      }
    }
    return points;
  }

  /** La distance du dépôt le plus proche à une adresse ; `null` quand l'adresse ou tous les dépôts sont introuvables. */
  private async distanceDepuisLesDepots(points: readonly { lat: number; lon: number }[], adresse: string): Promise<number | null> {
    const p = this.geocodeur ? await this.geocodeur.point(adresse).catch(() => null) : null;
    if (!p || points.length === 0) return null;
    return Math.min(...points.map((d) => distanceRouteKm(d, p)));
  }

  // ---------------------------------------------------------------------------------------------------------------
  // La grille garantie 30 jours (Greg, 23 octobre 2026)
  // ---------------------------------------------------------------------------------------------------------------

  /** Les grilles garanties ouvertes dans la zone de l'entreprise (la plus récente en premier), même sans dépôt. */
  async garanties(tenant: TenantContext, maintenant = new Date()): Promise<GarantieVue[]> {
    const zone = await this.zoneDeLEntreprise(tenant);
    if (!zone) return [];
    const cycles = await this.prisma.cycleCommande.findMany({ where: { zone, phase: "resultats", retenuId: { not: null }, garantieJusquau: { gt: maintenant } }, orderBy: { resultatsLe: "desc" } });
    const out: GarantieVue[] = [];
    for (const c of cycles) {
      const grille = await this.prisma.grilleNegoce.findUnique({ where: { cycleId_negoceId: { cycleId: c.id, negoceId: c.retenuId! } }, include: { negoce: { select: { nom: true } } } });
      if (!grille?.livraison) continue;
      const prix = grille.prix as Record<string, number>;
      const lignes = (c.lignes as unknown as LigneDeGrille[]).filter((l) => prix[l.cle] !== undefined && !grille.nonGarantis.includes(l.cle)).map((l) => ({ cle: l.cle, designation: l.designation, unite: l.unite, prixUnitaire: prix[l.cle]! }));
      if (lignes.length === 0) continue;
      const commandes = await this.prisma.commandeGarantie.findMany({ where: { cycleId: c.id, companyId: tenant.companyId }, orderBy: { commandeLe: "desc" } });
      out.push({
        cycleId: c.id,
        mois: c.mois,
        de: deMois(c.mois),
        zone: c.zone,
        titre: titreGarantie(c.garantieJusquau!),
        jusquau: c.garantieJusquau!.toISOString(),
        negoce: { id: c.retenuId!, nom: grille.negoce.nom },
        livraison: phrasePaliers((grille.livraison as unknown as LivraisonEnregistree).paliers),
        lignes,
        commandes: commandes.map((x) => ({ numero: x.numero, totalHt: Number(x.totalHt), le: x.commandeLe.toISOString(), adresse: x.adresseLivraison })),
      });
    }
    return out;
  }

  private async zoneDeLEntreprise(tenant: TenantContext): Promise<string | null> {
    const company = await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { address: true } });
    const zone = zoneDuCodePostal(company?.address ?? "");
    if (zone) return zone;
    const projets = await this.prisma.project.findMany({ where: { companyId: tenant.companyId, address: { not: null } }, select: { address: true }, orderBy: { updatedAt: "desc" }, take: 20 });
    return projets.map((p) => zoneDuCodePostal(p.address ?? "")).find((z): z is string => !!z) ?? null;
  }

  /**
   * « Recommander à ce prix » : une liste préremplie des articles garantis, les quantités voulues, une adresse de
   * livraison ; le bon part au négoce retenu, au prix de sa grille, avec la mention « Commande sur grille garantie ».
   */
  async recommander(tenant: TenantContext, cycleId: string, r: { lignes: readonly { cle: string; quantite: number }[]; adresseLivraison: string }, maintenant = new Date()) {
    assertCanWrite(tenant);
    await this.ouverte(tenant);
    await this.abonnement?.exiger(tenant.companyId, "recommander", maintenant);
    if (!isUuid(cycleId)) throw notFound("Cycle");
    const g = (await this.garanties(tenant, maintenant)).find((x) => x.cycleId === cycleId);
    if (!g) throw notFound("Garantie");
    const adresse = r.adresseLivraison.trim();
    if (!zoneDuCodePostal(adresse)) throw validationFailed("Address with postcode required", { reason: "adresse_requise" });
    const prixDe = new Map(g.lignes.map((l) => [l.cle, l]));
    const lignes = r.lignes
      .filter((l) => l.quantite > 0 && prixDe.has(l.cle))
      .map((l) => ({ cle: l.cle, designation: prixDe.get(l.cle)!.designation, unite: prixDe.get(l.cle)!.unite, quantite: Math.round(l.quantite * 1000) / 1000, prixUnitaire: prixDe.get(l.cle)!.prixUnitaire }));
    if (lignes.length === 0) throw validationFailed("Nothing to order", { reason: "rien_a_ajouter" });
    const grille = await this.prisma.grilleNegoce.findUniqueOrThrow({ where: { cycleId_negoceId: { cycleId, negoceId: g.negoce.id } }, include: { negoce: true } });
    const livraison = grille.livraison as unknown as LivraisonEnregistree;
    const distance = await this.distanceDepuisLesDepots(await this.pointsDesDepots(livraison.depots), adresse);
    const livraisonHt = fraisDeLivraisonPaliers(distance, livraison.paliers);
    if (livraisonHt === null) throw validationFailed("This négoce does not deliver your area", { reason: "ne_livre_pas" });
    const marchandiseHt = Math.round(lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0) * 100) / 100;
    const totalHt = Math.round((marchandiseHt + livraisonHt) * 100) / 100;
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { name: true, siret: true, phone: true, contactEmail: true } });
    const compte = await this.prisma.negoceArtisan.findUnique({ where: { companyId_negoceId: { companyId: tenant.companyId, negoceId: g.negoce.id } }, select: { numeroCompte: true } });
    const cmd = await this.prisma.commandeGarantie.create({ data: { cycleId, companyId: tenant.companyId, negoceId: g.negoce.id, adresseLivraison: adresse, lignes: lignes as object[], marchandiseHt, livraisonHt, totalHt, commandeLe: maintenant } });
    const doc = bonDuMois({ numero: cmd.numero, mois: g.mois, negoce: grille.negoce.nom, artisan: { nom: company.name, siret: company.siret, telephone: company.phone, email: company.contactEmail }, numeroCompte: compte?.numeroCompte ?? null, chantiers: [adresse], lignes, livraisonHt, garantie: true });
    const pdf = await pdfDeTexte(doc.titre, doc.blocs);
    try {
      await this.email.send({
        to: grille.negoce.email,
        subject: doc.titre,
        text: ["Bonjour,", "", `${company.name} commande au prix de votre grille garantie ${deMois(g.mois)} (${mentionGarantie(g.mois)}). Le bon de commande est joint ; vous n'avez rien à refaire.`, "", NOM_APP].join("\n"),
        attachments: [{ filename: `bon-de-commande-${g.mois}-garantie-${cmd.numero}.pdf`, contentType: "application/pdf", contentBase64: Buffer.from(pdf).toString("base64") }],
        ...(company.contactEmail ? { replyTo: company.contactEmail } : {}),
        mustDeliver: true,
      });
    } catch (e) {
      await this.prisma.commandeGarantie.delete({ where: { id: cmd.id } });
      throw e;
    }
    void mentionPrixFerme;
    return { numero: cmd.numero, totalHt, marchandiseHt, livraisonHt, negoce: grille.negoce.nom, mention: mentionGarantie(g.mois), suivi: suiviDansLeMois({ mois: g.mois, phase: "resultats", clotureDans: null, reponseDans: null, grilles: 1, negoces: 1, commande: true }) };
  }
}

/** « 22300 Lannion » : la commune d'une adresse de livraison, jamais la rue (confidentialité, point 4). */
export function communeDe(adresse: string): string | null {
  const m = /\b(\d{5})\b\s*([^,\n]*)/.exec(adresse);
  if (!m) return null;
  const commune = (m[2] ?? "").trim().replace(/\s+/g, " ");
  return commune ? `${m[1]} ${commune}` : m[1]!;
}

/** Le jour (Paris) d'un instant : « 2026-10-22 ». */
function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

function moisJour(d: Date): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function messageDAjout(lignes: readonly { quantite: number; unite: string; designation: string }[]): MessageArtisan {
  return { titre: "Le regroupement grossit", corps: messageAjout(lignes), url: "/groupe", etiquette: "ajouts-commande-du-mois" };
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

/** Un prix de base fictif et stable par article (démo seulement) : de 0,80 € à 40 € HT l'unité. */
function prixDeBaseDemo(cle: string): number {
  let h = 0;
  for (const c of cle) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 0.8 + (h % 3920) / 100;
}
