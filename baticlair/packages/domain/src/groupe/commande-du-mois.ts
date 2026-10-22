import { fraisDeLivraison, type RegleDeLivraison } from "./cap-22-octobre.js";

/**
 * LA COMMANDE COMMUNE DU MOIS (décision de Greg, 22 octobre 2026, au soir) : elle remplace le regroupement par lot au fil
 * de l'eau. Une seule commande par mois et par métier (la couverture d'abord) et par département, pour accumuler un gros
 * volume et négocier fort.
 *
 * 1. Inscriptions : les artisans déposent leur liste jusqu'à la clôture (par défaut le 25 à 12 h, heure de Paris). Ce qui
 *    arrive après part avec le mois suivant.
 * 2. Négoces : à la clôture, les listes sont fusionnées en UNE grille (produits identiques additionnés), envoyée à tous
 *    les négoces du métier et du département ; ils ont 14 jours (jusqu'à 18 h) pour la chiffrer, relance la veille.
 * 3. Résultats : chaque grille est appliquée à la liste de chaque artisan, livraison comprise ; le moins cher sur le
 *    total de la commande est mis en avant, chacun peut prendre un autre négoce moins cher pour lui.
 *
 * Tout ici est du calcul pur : aucune IA, aucune base. Le devis de chaque négoce est lu une fois à son arrivée (API).
 */

/** Les réglages du cycle, modifiables par l'admin (`parametre_groupe`, clé `cycle:config`). Un seul jeu pour l'instant. */
export interface ConfigCycle {
  /** Jour de clôture des inscriptions dans le mois (1 à 28). */
  jourCloture: number;
  /** Heure de clôture, heure de Paris. */
  heureCloture: number;
  /** Jours laissés aux négoces après la clôture. */
  joursReponse: number;
  /** Heure limite de réponse des négoces, heure de Paris. */
  heureReponse: number;
}

export const CONFIG_CYCLE_DEFAUT: ConfigCycle = { jourCloture: 25, heureCloture: 12, joursReponse: 14, heureReponse: 18 };

export const PHASES_CYCLE = ["inscriptions", "negoces", "resultats"] as const;
export type PhaseCycle = (typeof PHASES_CYCLE)[number];

/** Un mois, « AAAA-MM ». */
export type Mois = string;

const MOIS_NOMS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"] as const;

/** « octobre » pour « 2026-10 ». */
export function moisEnLettres(mois: Mois): string {
  return MOIS_NOMS[Number(mois.slice(5, 7)) - 1] ?? mois;
}

/** « d'octobre », « de novembre » : l'élision devant une voyelle. */
export function deMois(mois: Mois): string {
  const nom = moisEnLettres(mois);
  return /^[aeiouyéèêàâî]/i.test(nom) ? `d'${nom}` : `de ${nom}`;
}

export function moisSuivant(mois: Mois): Mois {
  const [a, m] = [Number(mois.slice(0, 4)), Number(mois.slice(5, 7))];
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
}

/** Le décalage de Paris (en minutes) à un instant donné : +60 l'hiver, +120 l'été. */
function decalageParis(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(instant);
  const v = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const local = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"));
  return Math.round((local - instant.getTime()) / 60_000);
}

/** L'instant du jour `jour` du mois, à `heure` h, heure de Paris (changement d'heure compris). */
export function heureDeParis(mois: Mois, jour: number, heure: number): Date {
  const [a, m] = [Number(mois.slice(0, 4)), Number(mois.slice(5, 7))];
  const naif = Date.UTC(a, m - 1, jour, heure, 0);
  return new Date(naif - decalageParis(new Date(naif)) * 60_000);
}

/** Le mois d'un instant, à Paris. */
export function moisDe(instant: Date): Mois {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" }).formatToParts(instant);
  return `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}`;
}

export interface DatesDuCycle {
  mois: Mois;
  /** Clôture des inscriptions. */
  clotureLe: Date;
  /** Réponse des négoces avant cet instant. */
  reponseAvant: Date;
  /** La relance part à partir de cet instant (la veille de la limite). */
  relanceLe: Date;
}

/** Les dates du cycle d'un mois, d'après les réglages. Le nom du cycle est le mois de sa clôture. */
export function datesDuCycle(mois: Mois, config: ConfigCycle = CONFIG_CYCLE_DEFAUT): DatesDuCycle {
  const clotureLe = heureDeParis(mois, config.jourCloture, config.heureCloture);
  // La limite des négoces : `joursReponse` jours plus tard, à `heureReponse` h (heure de Paris, ce jour-là).
  const jourLimite = new Date(clotureLe.getTime() + config.joursReponse * 86_400_000);
  const reponseAvant = heureDeParis(moisDe(jourLimite), Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", day: "numeric" }).format(jourLimite)), config.heureReponse);
  return { mois, clotureLe, reponseAvant, relanceLe: new Date(reponseAvant.getTime() - 86_400_000) };
}

/**
 * Le mois où part une liste déposée à `maintenant` : celui du mois en cours si sa clôture n'est pas passée, sinon le
 * suivant. `fermes` : les mois déjà clos par l'admin ou la tâche (une clôture avancée à la main compte aussi).
 */
export function moisDeDepot(maintenant: Date, config: ConfigCycle = CONFIG_CYCLE_DEFAUT, fermes: readonly Mois[] = []): Mois {
  let mois = moisDe(maintenant);
  for (let i = 0; i < 24; i++) {
    if (!fermes.includes(mois) && maintenant < datesDuCycle(mois, config).clotureLe) return mois;
    mois = moisSuivant(mois);
  }
  return mois;
}

/** « Clôture dans 9 j 4 h » : le temps qui reste, en mots courts (jamais négatif). */
export function chrono(maintenant: Date, echeance: Date): string {
  const minutes = Math.max(0, Math.floor((echeance.getTime() - maintenant.getTime()) / 60_000));
  if (minutes < 1) return "moins d'une minute";
  const j = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const min = minutes % 60;
  if (j > 0) return h > 0 ? `${j} j ${h} h` : `${j} j`;
  if (h > 0) return min > 0 ? `${h} h ${min} min` : `${h} h`;
  return `${min} min`;
}

/** « Trop tard pour octobre, ta liste part avec la commande de novembre. » */
export function messageTropTard(moisFerme: Mois, moisDeLaListe: Mois): string {
  return `Trop tard pour ${moisEnLettres(moisFerme)}, ta liste part avec la commande ${deMois(moisDeLaListe)}.`;
}

/** Ce que l'artisan lit avant de déposer (Greg, 22 octobre). */
export const PHRASE_SANS_ENGAGEMENT = "Mets seulement ce que tu es sûr de commander. Sans engagement : tu commandes seulement si le prix te plaît.";

/** Ce que le négoce lit (vouvoiement). */
export const PHRASE_AU_NEGOCE =
  "Chaque artisan choisit le négoce le moins cher pour lui. Plus vos prix sont bons sur tout, plus vous récupérez de chantiers et de nouveaux clients.";

/** Prix fermes : dit au négoce dès la demande. */
export const PHRASE_PRIX_FERMES = "Vos prix sont fermes pour tout le cycle, même si vous ne remportez pas toute la commande.";

/** Ce qui entre : un chantier signé (devis validé) ou du stock. Les deux dans la même commande. */
export const NATURES = ["chantier", "stock"] as const;
export type Nature = (typeof NATURES)[number];

/** Une ligne déposée par un artisan, telle que la fusion la reçoit. */
export interface LigneDeposee {
  cle: string;
  designation: string;
  quantite: number;
  unite: string;
}

/** Une ligne de la grille du mois : produits identiques fusionnés, quantités additionnées. */
export interface LigneDeGrille {
  /** La clé de fusion : la clé de référence et l'unité (on n'additionne jamais des pièces et des palettes). */
  cle: string;
  designation: string;
  quantite: number;
  unite: string;
}

export const cleDeLigne = (l: { cle: string; unite: string }) => `${l.cle}#${normaliserUnite(l.unite)}`;

function normaliserUnite(u: string): string {
  return u.trim().toLowerCase().replace(/\.$/, "");
}

const arrondi3 = (n: number) => Math.round(n * 1000) / 1000;
const arrondi2 = (n: number) => Math.round(n * 100) / 100;

/**
 * LA FUSION DES LISTES À LA CLÔTURE : les produits identiques (même clé de référence, même unité) sont additionnés
 * (« 12 000 ardoises 32×22 »), les produits différents restent des lignes à part. Ordre : celui de la première apparition.
 */
export function fusionnerLesListes(lignes: readonly LigneDeposee[]): LigneDeGrille[] {
  const parCle = new Map<string, LigneDeGrille>();
  for (const l of lignes) {
    if (!(l.quantite > 0)) continue;
    const cle = cleDeLigne(l);
    const deja = parCle.get(cle);
    if (deja) deja.quantite = arrondi3(deja.quantite + l.quantite);
    else parCle.set(cle, { cle, designation: l.designation, quantite: arrondi3(l.quantite), unite: l.unite });
  }
  return [...parCle.values()];
}

/** La grille chiffrée d'un négoce : un prix unitaire HT par ligne (le MÊME pour tous), et ses deux chiffres de livraison. */
export interface GrilleChiffree {
  negoceId: string;
  /** Prix unitaire HT par clé de ligne ; une ligne absente n'est pas chiffrée. */
  prix: Readonly<Record<string, number>>;
  livraison: Pick<RegleDeLivraison, "francoKm" | "prixAuDela">;
}

/** Les lignes de la grille que ce négoce n'a pas chiffrées. */
export function lignesManquantes(grille: GrilleChiffree, lignes: readonly LigneDeGrille[]): LigneDeGrille[] {
  return lignes.filter((l) => !(grille.prix[l.cle] !== undefined && grille.prix[l.cle]! >= 0));
}

/** Une grille est complète quand chaque ligne a son prix. */
export const grilleComplete = (grille: GrilleChiffree, lignes: readonly LigneDeGrille[]) => lignesManquantes(grille, lignes).length === 0;

/** Ce qu'un artisan doit livrer : ses lignes (déjà fusionnées pour lui) et la distance de chacun de ses chantiers. */
export interface CommandeDArtisan {
  companyId: string;
  lignes: readonly LigneDeGrille[];
  /** Le nombre de chantiers (adresses de livraison distinctes) : une livraison chacun. */
  chantiers: number;
  /**
   * Par négoce, la distance (km) de son dépôt à chaque chantier ; `null` = adresse introuvable, comptée au-delà du franco
   * (on n'annonce jamais une livraison gratuite qu'on n'a pas vérifiée). Un négoce absent : toutes inconnues.
   */
  distances: Readonly<Record<string, readonly (number | null)[]>>;
}

export interface PrixChezUnNegoce {
  negoceId: string;
  marchandiseHt: number;
  livraisonHt: number;
  totalHt: number;
  /** Lignes de l'artisan que ce négoce n'a pas chiffrées (elles ne sont pas dans le total). */
  manquantes: number;
  complet: boolean;
}

/** La grille d'un négoce appliquée à la liste d'un artisan, livraison comprise (une livraison par chantier). */
export function prixChezUnNegoce(commande: CommandeDArtisan, grille: GrilleChiffree): PrixChezUnNegoce {
  let marchandise = 0;
  let manquantes = 0;
  for (const l of commande.lignes) {
    const p = grille.prix[l.cle];
    if (p === undefined) manquantes++;
    else marchandise += l.quantite * p;
  }
  const distances = commande.distances[grille.negoceId] ?? Array.from({ length: commande.chantiers }, () => null);
  const livraison = distances.reduce<number>((s, d) => s + fraisDeLivraison(d, grille.livraison), 0);
  const marchandiseHt = arrondi2(marchandise);
  const livraisonHt = arrondi2(livraison);
  return { negoceId: grille.negoceId, marchandiseHt, livraisonHt, totalHt: arrondi2(marchandiseHt + livraisonHt), manquantes, complet: manquantes === 0 };
}

export interface GrilleClassee {
  negoceId: string;
  /** Total de toute la commande chez ce négoce : marchandise + livraisons de chaque artisan. */
  totalHt: number;
  complete: boolean;
  manquantes: number;
  rang: number;
}

/**
 * LE CLASSEMENT SUR LE TOTAL DE LA COMMANDE : les grilles complètes d'abord (une grille incomplète passe derrière, quel
 * que soit son prix), puis du moins cher au plus cher, livraisons comprises. À égalité, l'ordre d'arrivée (le premier
 * déposé gagne) : `grilles` est passé dans l'ordre de dépôt.
 */
export function classerLesGrilles(grilles: readonly GrilleChiffree[], lignes: readonly LigneDeGrille[], commandes: readonly CommandeDArtisan[]): GrilleClassee[] {
  const lignesParCle = new Map(lignes.map((l) => [l.cle, l]));
  const evalues = grilles.map((g, ordre) => {
    const totalHt = arrondi2(commandes.reduce((s, c) => s + prixChezUnNegoce({ ...c, lignes: c.lignes.filter((l) => lignesParCle.has(l.cle)) }, g).totalHt, 0));
    const manquantes = lignesManquantes(g, lignes).length;
    return { negoceId: g.negoceId, totalHt, complete: manquantes === 0, manquantes, ordre };
  });
  evalues.sort((a, b) => Number(b.complete) - Number(a.complete) || a.totalHt - b.totalHt || a.ordre - b.ordre);
  return evalues.map(({ ordre: _o, ...g }, i) => ({ ...g, rang: i + 1 }));
}

export interface ComparatifArtisan {
  /** Le négoce mis en avant : le premier sur le total de la commande (choix par défaut). */
  parDefaut: string | null;
  /** Le moins cher pour CET artisan, parmi les grilles complètes pour sa liste ; peut différer du choix par défaut. */
  moinsCherPourToi: string | null;
  lignes: (PrixChezUnNegoce & { rangCommande: number })[];
}

/** Le comparatif de chaque artisan : « Chez A, 8 400 € livré ; chez B, 7 900 € livré ». */
export function comparatifDeLArtisan(commande: CommandeDArtisan, grilles: readonly GrilleChiffree[], classement: readonly GrilleClassee[]): ComparatifArtisan {
  const rang = new Map(classement.map((c) => [c.negoceId, c.rang]));
  const lignes = grilles
    .map((g) => ({ ...prixChezUnNegoce(commande, g), rangCommande: rang.get(g.negoceId) ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => Number(b.complet) - Number(a.complet) || a.totalHt - b.totalHt || a.rangCommande - b.rangCommande);
  const parDefaut = classement[0]?.negoceId ?? null;
  return { parDefaut, moinsCherPourToi: lignes.find((l) => l.complet)?.negoceId ?? null, lignes };
}

/** Pendant le chrono, le négoce voit seulement s'il est premier sur le total, jamais les prix des autres. */
export function phraseDeRang(rang: number | null): string {
  if (rang === null) return "Déposez votre grille pour savoir où vous en êtes.";
  return rang === 1 ? "Vous êtes premier sur le total de la commande." : "Vous n'êtes pas premier sur le total de la commande.";
}

const FEMININS = new Set(["palette", "pièce", "piece", "plaque", "boîte", "boite", "longueur", "feuille", "botte", "barre", "bobine"]);

function feminin(unite: string): boolean {
  const u = normaliserUnite(unite).replace(/s$/, "");
  return FEMININS.has(u);
}

/** « 3 palettes d'ardoises 32×22 » : une quantité, son unité, ce que c'est. */
export function phraseDeQuantite(l: { quantite: number; unite: string; designation: string }): string {
  const q = l.quantite.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  // « ml » s'écrit « m » à l'écran (retour du fondateur, 2026-10-12).
  const unite = l.unite.trim().replace(/^ml$/i, "m");
  const designation = l.designation.trim().replace(/^./, (c) => c.toLowerCase());
  if (!unite || /^u(nités?)?$/i.test(unite)) return `${q} ${designation}`;
  const de = /^[aeiouyéèêàâîh]/i.test(designation) ? "d'" : "de ";
  return `${q} ${unite} ${de}${designation}`;
}

/** « 3 palettes d'ardoises 32×22, 400 m de liteaux » : les trois plus grosses lignes, puis « et N autres articles ». */
export function phraseDeVolume(lignes: readonly LigneDeGrille[], max = 3): string {
  if (lignes.length === 0) return "rien encore";
  const montrees = lignes.slice(0, max).map(phraseDeQuantite).join(", ");
  const reste = lignes.length - max;
  return reste > 0 ? `${montrees} et ${reste} autre${reste > 1 ? "s" : ""} article${reste > 1 ? "s" : ""}` : montrees;
}

/** L'affichage principal : en quantités, jamais en nombre d'entreprises (Greg, 22 octobre). */
export function affichageDeLaCommande(a: { mois: Mois; toi: readonly LigneDeGrille[]; tout: readonly LigneDeGrille[]; seul: boolean; clotureDans: string | null }): { toi: string; tout: string; cloture: string | null; premier: string | null } {
  return {
    toi: `Toi seul : ${phraseDeVolume(a.toi)}`,
    tout: `Toute la commande ${deMois(a.mois)} : ${phraseDeVolume(a.tout)}`,
    cloture: a.clotureDans ? `Clôture dans ${a.clotureDans}` : null,
    premier: a.seul ? "Pour l'instant, tu es le premier. Partage le lien pour faire grossir la commande." : null,
  };
}

/** « +6 palettes d'ardoises 32×22 viennent d'être ajoutées. L'union fait la force ! » (regroupé si plusieurs). */
export function messageAjout(ajouts: readonly { quantite: number; unite: string; designation: string }[]): string {
  const lignes = ajouts.filter((a) => a.quantite > 0);
  const tous = lignes.slice(0, 3).map(phraseDeQuantite);
  const reste = lignes.length - tous.length;
  const liste = tous.length > 1 ? `${tous.slice(0, -1).join(", ")} et ${tous.at(-1)}` : (tous[0] ?? "");
  const pluriel = lignes.length > 1 || (lignes[0]?.quantite ?? 0) > 1;
  const participe = `ajouté${lignes.every((l) => feminin(l.unite)) ? "e" : ""}${pluriel ? "s" : ""}`;
  const suite = reste > 0 ? ` (et ${reste} autre${reste > 1 ? "s" : ""} article${reste > 1 ? "s" : ""})` : "";
  return `+${liste}${suite} ${pluriel ? "viennent" : "vient"} d'être ${participe}. L'union fait la force !`;
}

/** Le suivi façon colis d'un chantier inscrit à la commande du mois (Greg, 22 octobre). */
export const ETAPES_SUIVI_MOIS = ["Liste déposée", "Commande close", "Prix demandés", "Prix reçus", "Commandé"] as const;

export interface EtatDansLeMois {
  mois: Mois;
  phase: PhaseCycle;
  clotureDans: string | null;
  reponseDans: string | null;
  /** Grilles déposées par les négoces. */
  grilles: number;
  /** Négoces à qui la grille est partie. */
  negoces: number;
  commande: boolean;
}

export function suiviDansLeMois(e: EtatDansLeMois): { etape: number; etapes: { nom: (typeof ETAPES_SUIVI_MOIS)[number]; fait: boolean }[]; phrase: string; aFaire: string | null } {
  const etape = e.commande ? 4 : e.phase === "resultats" && e.grilles > 0 ? 3 : e.phase !== "inscriptions" && e.negoces > 0 ? 2 : e.phase !== "inscriptions" ? 1 : 0;
  const etapes = ETAPES_SUIVI_MOIS.map((nom, i) => ({ nom, fait: i <= etape }));
  const de = deMois(e.mois);
  if (etape === 0) return { etape, etapes, phrase: `Ta liste est dans la commande ${de}.`, aFaire: e.clotureDans ? `Clôture dans ${e.clotureDans}. Partage le lien pour faire grossir la commande.` : null };
  if (etape === 1) return { etape, etapes, phrase: `La commande ${de} est close.`, aFaire: null };
  // Revue à froid (23 octobre) : la limite passée sans aucune grille, le suivi ne dit plus « chez N négoces » pour toujours.
  if (etape === 2 && e.phase === "resultats") return { etape, etapes, phrase: `Aucun négoce n'a chiffré la commande ${de}.`, aFaire: "Commande ta liste en direct chez ton négoce." };
  if (etape === 2) return { etape, etapes, phrase: `La commande ${de} est chez ${e.negoces} négoce${e.negoces > 1 ? "s" : ""}.`, aFaire: e.reponseDans ? `Leurs prix arrivent dans ${e.reponseDans}.` : null };
  if (etape === 3) return { etape, etapes, phrase: "Les prix sont là.", aFaire: "Regarde ton prix livré et commande si ça te plaît." };
  return { etape, etapes, phrase: "C'est commandé.", aFaire: null };
}

const eurosFr = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dateFr = (d: Date) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" }).format(d);
const heureFr = (d: Date) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric" }).format(d).replace(/\s?h$/, "");

/** « Réponse avant le 08/11 à 18 h, il reste 13 j 6 h » : le chrono du négoce. */
export function echeanceNegoce(reponseAvant: Date, maintenant: Date): string {
  return `Réponse avant le ${dateFr(reponseAvant)} à ${heureFr(reponseAvant)} h, il reste ${chrono(maintenant, reponseAvant)}`;
}

/** L'e-mail de la demande au négoce (vouvoiement) : la grille entière, un lien, le chrono, les règles du jeu. */
export function mailGrilleAuNegoce(m: { negoce: string; mois: Mois; departement: string; lignes: readonly LigneDeGrille[]; reponseAvant: Date; maintenant: Date; lien: string; stop: string }): { objet: string; texte: string } {
  const lignes = m.lignes.map((l) => `- ${l.designation} : ${l.quantite.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${l.unite}`);
  return {
    objet: `Commande commune ${deMois(m.mois)} (${m.departement}) : demande de prix sur ${m.lignes.length} article${m.lignes.length > 1 ? "s" : ""}`,
    texte: [
      "Bonjour,",
      "",
      `Les couvreurs du département ${m.departement} ont regroupé leurs commandes ${deMois(m.mois)}. Voici le volume total à chiffrer :`,
      "",
      ...lignes,
      "",
      "Un prix unitaire HT par article, le même pour tous les artisans, et vos deux chiffres de livraison (gratuite jusqu'à X km de votre dépôt, Y € HT par livraison au-delà). Merci de chiffrer toutes les lignes : une grille incomplète passe derrière les grilles complètes.",
      PHRASE_PRIX_FERMES,
      PHRASE_AU_NEGOCE,
      "",
      `${echeanceNegoce(m.reponseAvant, m.maintenant)}.`,
      `Déposez votre devis ici : ${m.lien}`,
      "",
      "Aucun nom d'artisan ne vous est communiqué avant sa commande. Aucun frais pour vous.",
      `Pour ne plus rien recevoir : ${m.stop}`,
      "",
      "BatiClair, la commande commune des couvreurs",
    ].join("\n"),
  };
}

/** La relance de la veille, à qui n'a pas encore déposé. */
export function mailRelanceNegoce(m: { mois: Mois; departement: string; reponseAvant: Date; maintenant: Date; lien: string }): { objet: string; texte: string } {
  return {
    objet: `Rappel : commande commune ${deMois(m.mois)} (${m.departement}), réponse avant demain ${heureFr(m.reponseAvant)} h`,
    texte: ["Bonjour,", "", `Nous n'avons pas encore votre grille pour la commande commune ${deMois(m.mois)}.`, `${echeanceNegoce(m.reponseAvant, m.maintenant)}.`, `Déposez votre devis ici : ${m.lien}`, "", "BatiClair"].join("\n"),
  };
}

/** Le message de fin : le premier sur le total le sait ; les autres reçoivent un message neutre, sans les prix des autres. */
export function mailResultatNegoce(m: { mois: Mois; departement: string; premier: boolean }): { objet: string; texte: string } {
  return {
    objet: `Commande commune ${deMois(m.mois)} (${m.departement}) : les résultats`,
    texte: [
      "Bonjour,",
      "",
      m.premier
        ? `Votre grille est la moins chère sur le total de la commande ${deMois(m.mois)}. Elle est proposée par défaut à chaque artisan ; vous recevrez un bon de commande de chacun de ceux qui commandent.`
        : `Merci pour votre grille. Elle n'est pas la moins chère sur le total de la commande ${deMois(m.mois)}. Chaque artisan reste libre de choisir le négoce le moins cher pour lui : vous recevrez un bon de commande de ceux qui vous choisissent.`,
      PHRASE_PRIX_FERMES,
      "",
      "BatiClair",
    ].join("\n"),
  };
}

/** Le bon de commande d'un artisan pour la commande du mois : c'est ici que le négoce voit son nom. */
export function bonDuMois(b: {
  numero: number;
  mois: Mois;
  negoce: string;
  artisan: { nom: string; siret: string | null; telephone: string | null; email: string | null };
  numeroCompte: string | null;
  chantiers: readonly string[];
  lignes: readonly { designation: string; quantite: number; unite: string; prixUnitaire: number }[];
  livraisonHt: number;
}): { titre: string; blocs: { titre?: string; lignes: (string | string[])[] }[] } {
  const marchandise = Math.round(b.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0) * 100) / 100;
  return {
    titre: `Bon de commande, commande commune ${deMois(b.mois)} n° ${b.numero}`,
    blocs: [
      { titre: "Client", lignes: [b.artisan.nom, ...(b.artisan.siret ? [`SIRET ${b.artisan.siret}`] : []), b.numeroCompte ? `Numéro de compte chez ${b.negoce} : ${b.numeroCompte}` : `Ouverture de compte demandée chez ${b.negoce}`, ...(b.artisan.telephone ? [`Téléphone : ${b.artisan.telephone}`] : []), ...(b.artisan.email ? [`E-mail : ${b.artisan.email}`] : [])] },
      { titre: "Livraison", lignes: [...b.chantiers.map((c) => `Chantier : ${c}`), `Livraison : ${b.livraisonHt > 0 ? `${eurosFr(b.livraisonHt)} HT` : "gratuite"}`] },
      {
        titre: "Fournitures",
        lignes: [
          ["Désignation", "Quantité", "P.U. HT", "Total HT"],
          ...b.lignes.map((l) => [l.designation, `${l.quantite.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${l.unite}`, eurosFr(l.prixUnitaire), eurosFr(Math.round(l.quantite * l.prixUnitaire * 100) / 100)]),
          `Total HT : ${eurosFr(marchandise)}`,
          `Total HT livraison comprise : ${eurosFr(Math.round((marchandise + b.livraisonHt) * 100) / 100)}`,
        ],
      },
      { lignes: [`Prix de votre grille de la commande commune ${deMois(b.mois)}. Facturation et paiement comme d'habitude, sur le compte du client.`] },
    ],
  };
}
