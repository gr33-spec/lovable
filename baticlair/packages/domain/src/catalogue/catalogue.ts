import type { FamilleGroupe } from "../groupe/groupe.js";

/**
 * LE CATALOGUE COMPLET, MÉTIER PAR MÉTIER (correction après test de Greg, 30 octobre 2026, point 3 : « un charpentier qui
 * tape panne ne trouve rien ; l'artisan doit pouvoir choisir dans des listes »). Désignations génériques, telles que les
 * artisans les emploient, SANS MARQUE ; trois niveaux au plus : famille › produit › format / dimension / qualité ; les
 * unités du métier. Ces fichiers sont l'amorce : la base les reprend (une ligne par article, clé stable) et l'admin les
 * modifie ensuite (ajouter, renommer, masquer) sans toucher au code.
 *
 * Un article choisi au catalogue se regroupe par SA clé : deux artisans qui prennent « Panne 75×225 · 6 m · classe 2 »
 * s'additionnent, jamais une 75×200. La ligne qu'on ne trouve pas s'écrit librement (« ligne libre ») : elle part
 * telle quelle, sans être cumulée, sauf si l'admin la rattache à un article.
 */

/** Les métiers du catalogue (le sélecteur « Métier : Couverture ▾ »). */
export const METIERS_CATALOGUE = ["couverture", "zinguerie", "charpente", "menuiserie", "maconnerie", "platrerie_isolation", "peinture", "carrelage", "plomberie", "electricite", "chauffage"] as const;
export type MetierCatalogue = (typeof METIERS_CATALOGUE)[number];

export const LIBELLES_METIERS_CATALOGUE: Readonly<Record<MetierCatalogue, string>> = {
  couverture: "Couverture",
  zinguerie: "Zinguerie",
  charpente: "Charpente",
  menuiserie: "Menuiserie",
  maconnerie: "Maçonnerie",
  platrerie_isolation: "Plâtrerie et isolation",
  peinture: "Peinture",
  carrelage: "Carrelage",
  plomberie: "Plomberie",
  electricite: "Électricité",
  chauffage: "Chauffage",
};

/**
 * L'achat groupé d'un métier du catalogue : un achat groupé reste rattaché à UN métier (famille des négoces). La
 * zinguerie se commande avec la couverture ; plâtrerie, peinture et carrelage sont le second œuvre ; le chauffage
 * va chez le négoce de plomberie.
 */
export const FAMILLE_DU_METIER_CATALOGUE: Readonly<Record<MetierCatalogue, FamilleGroupe>> = {
  couverture: "couverture",
  zinguerie: "couverture",
  charpente: "charpente",
  menuiserie: "menuiseries_fermetures",
  maconnerie: "maconnerie",
  platrerie_isolation: "second_oeuvre",
  peinture: "second_oeuvre",
  carrelage: "second_oeuvre",
  plomberie: "plomberie",
  electricite: "electricite",
  chauffage: "plomberie",
};

/** Les métiers du catalogue d'un métier du compte (`trades` : roofing, carpentry…), dans l'ordre. */
const METIERS_DU_COMPTE: Readonly<Record<string, readonly MetierCatalogue[]>> = {
  roofing: ["couverture", "zinguerie"],
  waterproofing: ["couverture"],
  cladding: ["couverture"],
  carpentry: ["charpente"],
  joinery: ["menuiserie"],
  interior_joinery: ["menuiserie"],
  masonry: ["maconnerie"],
  facade: ["maconnerie", "peinture"],
  earthworks: ["maconnerie"],
  paving: ["maconnerie"],
  plastering: ["platrerie_isolation"],
  drywall: ["platrerie_isolation"],
  ceilings: ["platrerie_isolation"],
  painting: ["peinture"],
  tiling: ["carrelage"],
  plumbing: ["plomberie"],
  hvac: ["chauffage", "plomberie"],
  electrical: ["electricite"],
  solar: ["electricite"],
  kitchen: ["menuiserie"],
  decking: ["menuiserie"],
};

export function metiersCatalogueDuCompte(trades: readonly string[]): MetierCatalogue[] {
  return [...new Set(trades.flatMap((t) => METIERS_DU_COMPTE[t] ?? []))];
}

/** Un article de l'amorce : trois niveaux au plus, une unité, les mots du chantier en plus. */
export interface ArticleCatalogue {
  /** Clé stable (jamais réécrite, même si l'admin renomme) : `couverture/ardoise-naturelle/32x22-espagne-1er`. */
  cle: string;
  metier: MetierCatalogue;
  famille: string;
  produit: string;
  /** Format, dimension ou qualité ; vide quand le produit suffit. */
  variante: string | null;
  /** La désignation envoyée au négoce. */
  designation: string;
  unite: string;
  synonymes: readonly string[];
  /**
   * Le catalogue métier (Greg, 31 octobre 2026) : une RÉFÉRENCE COMMERCIALE (marque, référence fabricant) n'entre que
   * vérifiée sur une source (fiche du fabricant, référentiel du fondateur), avec sa date ; une désignation GÉNÉRIQUE
   * (« Liteau 18×40 ») n'a ni marque ni référence. Sans statut : article de l'amorce d'origine, générique.
   */
  marque?: string;
  reference?: string;
  /** Le code EAN (GTIN-13) d'un coloris ou d'un format, publié par le fabricant : la même tuile partout. */
  ean?: string;
  statut?: "verifie" | "generique";
  source?: { libelle: string; url?: string; verifieLe: string };
}

/** Le texte « à plat » : sans accent, en minuscules, × écrit x, ponctuation retirée. */
export const aPlat = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[×*]/g, "x")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/[^a-z0-9.x ]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/(\d) ?x ?(\d)/g, "$1x$2")
    .trim();

const slug = (s: string) => aPlat(s).replace(/\./g, "-").replace(/\s+/g, "-");

/** La fiche d'un article : marque, référence, EAN, statut et source (une par variante quand elle en dépend). */
export type Fiche = Pick<ArticleCatalogue, "marque" | "reference" | "ean" | "statut" | "source">;

/** Fabrique d'articles : un produit et ses variantes (formats, dimensions, qualités). */
export function produit(
  metier: MetierCatalogue,
  famille: string,
  nom: string,
  unite: string,
  variantes: readonly (string | null)[] = [null],
  o: { synonymes?: readonly string[]; designation?: (v: string | null) => string; fiche?: Fiche | ((v: string | null) => Fiche) } = {},
): ArticleCatalogue[] {
  return variantes.map((v) => ({
    ...(typeof o.fiche === "function" ? o.fiche(v) : o.fiche),
    cle: `${metier}/${slug(famille)}/${slug(nom)}${v ? `/${slug(v)}` : ""}`,
    metier,
    famille,
    produit: nom,
    variante: v,
    designation: o.designation ? o.designation(v) : v ? `${nom} ${v}` : nom,
    unite,
    synonymes: o.synonymes ?? [],
  }));
}

/** Toutes les combinaisons « a · b » (section et longueur, épaisseur et format…). */
export const croiser = (a: readonly string[], b: readonly string[], sep = " · "): string[] => a.flatMap((x) => b.map((y) => `${x}${sep}${y}`));

/* ---------------------------------------------------------------------- la recherche tolérante aux fautes */

/** Distance d'édition (insertion, suppression, substitution, inversion de deux lettres voisines). */
export function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cout);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
    }
  return d[a.length]![b.length]!;
}

/** Une faute admise selon la longueur du mot : aucune sous 4 lettres, une jusqu'à 7, deux au-delà. */
const fautesAdmises = (mot: string) => (mot.length < 4 ? 0 : mot.length < 8 ? 1 : 2);

/** Le singulier simple (« pannes » → « panne », « chevrons » → « chevron »). */
const singulier = (m: string) => (m.length > 3 && /[sx]$/.test(m) && !/(ss|us)$/.test(m) ? m.slice(0, -1) : m);

/**
 * Le masculin des qualificatifs du comptoir (catalogue métier, Greg, 31 octobre 2026 : « peinture blanche mate » doit
 * trouver « blanc mat ») : la forme sous laquelle le catalogue les écrit.
 */
const MASCULINS: Readonly<Record<string, string>> = {
  blanche: "blanc", mate: "mat", grise: "gris", noire: "noir", brune: "brun", verte: "vert", bleue: "bleu", satinee: "satine",
  vieillie: "vieilli", sablee: "sable", ardoisee: "ardoise", galvanisee: "galvanise", laquee: "laque", traitee: "traite",
};
const forme = (m: string) => MASCULINS[m] ?? MASCULINS[singulier(m)] ?? singulier(m);

/**
 * Les mots qui PRÉCISENT sans désigner (couleur, finition, gamme de qualité) : absents d'un article, ils ne l'écartent pas
 * (« H14 rouge » trouve la H14, dont le coloris n'est pas au catalogue) ; ils restent dans la désignation de l'artisan.
 */
const PRECISIONS = new Set([
  "rouge", "brun", "noir", "gris", "blanc", "beige", "vert", "bleu", "anthracite", "ardoise", "vieilli", "sable", "flamme", "nuance", "naturel", "terre",
  "mat", "satin", "satine", "velours", "brillant", "lisse", "pro", "professionnel", "professionnelle", "qualite", "premium", "standard", "interieur", "exterieur",
]);

/** La qualité de la rencontre d'un mot tapé avec des mots : 3 le mot même, 2 son début, 1 ou 1,5 à une faute près, 0 rien. */
function rencontre(tape: string, mots: readonly string[]): number {
  const t = forme(tape);
  // Une dimension ou une référence (un chiffre dans le mot : « 18x40 », « h14 », « hp10 ») ne se rapproche jamais à une
  // faute près : une 18×50 n'est pas une 18×40, une H14 n'est pas une HP10.
  const technique = /\d/.test(tape);
  let meilleure = 0;
  for (const m of mots) {
    const s = forme(m);
    if (s === t || m === tape) return 3;
    if (s.startsWith(t) || m.startsWith(tape)) meilleure = Math.max(meilleure, 2);
    else if (!technique) {
      const admis = fautesAdmises(t);
      // Une lettre oubliée ou doublée (« pane » pour « panne ») est la faute la plus courante : elle passe devant une lettre changée.
      if (admis > 0 && Math.abs(s.length - t.length) <= admis && distance(s, t) <= admis) meilleure = Math.max(meilleure, s.length !== t.length ? 1.5 : 1);
    }
  }
  return meilleure;
}

/**
 * Le score d'un article pour une recherche (null : pas trouvé). Tous les mots tapés doivent être trouvés ; le mot même
 * passe devant son début (« panne » avant « panneau »), un mot du produit devant un mot de famille ou un synonyme.
 */
export function scoreArticle(a: Pick<ArticleCatalogue, "designation" | "famille" | "produit" | "synonymes">, q: string): number | null {
  const tapes = aPlat(q).split(" ").filter(Boolean);
  if (!tapes.length) return 0;
  const duProduit = aPlat(a.produit).split(" ");
  const tout = aPlat(`${a.designation} ${a.famille} ${a.produit} ${a.synonymes.join(" ")}`).split(" ");
  let score = 0;
  for (const t of tapes) {
    const r = rencontre(t, tout);
    if (r === 0) return null;
    score += r + rencontre(t, duProduit) * 2;
  }
  // Le produit qui COMMENCE par le premier mot tapé passe devant (« panne » : la Panne, puis le porte-panne).
  score += rencontre(tapes[0]!, duProduit.slice(0, 1));
  return score;
}

/**
 * La recherche telle que l'artisan la tape, à plat : « 18 x 40 », « 18/40 », « 18*40 » et « 18 40 » deviennent « 18x40 » ;
 * « hp 10 » reste deux mots (le catalogue porte les deux écritures dans ses synonymes).
 */
export const requeteAPlat = (q: string) => aPlat(q.replace(/(\d)\s*[/x×*]\s*(\d)/gi, "$1x$2")).replace(/\b(\d{1,3}) (\d{2,3})\b/g, "$1x$2");

/** Un article trouvé, avec les mots de l'artisan qui le précisent sans être au catalogue (« rouge » pour « H14 rouge »). */
export interface Trouvaille<T> {
  article: T;
  precisions: string[];
  score: number;
}

/**
 * LE MOTEUR DE RECHERCHE MÉTIER (Greg, 31 octobre 2026 : « Mobiiz doit comprendre le langage des artisans ») : mots
 * partiels, fautes légères, synonymes et abréviations ; dimensions écrites de toutes les façons ; références exactes
 * (jamais une à la place d'une autre) ; une couleur, une finition ou une gamme absente de l'article le précise au lieu
 * de l'écarter. Chaque mot qui désigne doit être trouvé ; un article sans aucun mot désignant trouvé n'est pas proposé.
 */
export function rechercherAvecPrecisions<T extends Pick<ArticleCatalogue, "designation" | "famille" | "produit" | "synonymes"> & { statut?: string | null }>(
  articles: readonly T[],
  q: string,
  max = 30,
  /** À score égal, les articles de la région du chantier d'abord (§26.2, `REGIONS_COUVERTURE`). */
  prefere?: (a: T) => boolean,
): Trouvaille<T>[] {
  const tapes = requeteAPlat(q).split(" ").filter(Boolean);
  if (!tapes.length) return [];
  const originaux = new Map(q.split(/\s+/).filter(Boolean).map((w) => [aPlat(w), w] as const));
  const trouves: (Trouvaille<T> & { i: number })[] = [];
  articles.forEach((a, i) => {
    const duProduit = aPlat(a.produit).split(" ");
    const tout = aPlat(`${a.designation} ${a.famille} ${a.produit} ${a.synonymes.join(" ")}`).split(" ");
    let score = 0;
    let designants = 0;
    const precisions: string[] = [];
    for (const t of tapes) {
      const precision = PRECISIONS.has(forme(t));
      const r = rencontre(t, tout);
      // Un mot qui précise ne compte que s'il est écrit tel quel (« pro » ne choisit pas « plafond profond »).
      if (r > 0 && (!precision || r === 3)) {
        score += r + rencontre(t, duProduit) * 2;
        if (!precision) designants++;
      } else if (precision) {
        precisions.push(originaux.get(t) ?? t);
        score -= 0.5;
      } else return;
    }
    if (designants === 0) return;
    score += rencontre(tapes[0]!, duProduit.slice(0, 1));
    trouves.push({ article: a, precisions, score, i });
  });
  return trouves
    // À score égal : moins de précisions laissées, puis un article sourcé (référentiel, fabricant), puis l'ordre du catalogue.
    .sort(
      (x, y) =>
        y.score - x.score ||
        x.precisions.length - y.precisions.length ||
        (prefere ? (prefere(x.article) ? 0 : 1) - (prefere(y.article) ? 0 : 1) : 0) ||
        (x.article.statut ? 0 : 1) - (y.article.statut ? 0 : 1) ||
        x.i - y.i,
    )
    .slice(0, max)
    .map(({ i: _i, ...t }) => t);
}

export function rechercherArticles<T extends Pick<ArticleCatalogue, "designation" | "famille" | "produit" | "synonymes">>(articles: readonly T[], q: string, max = 30): T[] {
  return articles
    .map((a, i) => ({ a, i, s: scoreArticle(a, q) }))
    .filter((x): x is { a: T; i: number; s: number } => x.s !== null)
    .sort((x, y) => y.s - x.s || x.i - y.i)
    .slice(0, max)
    .map((x) => x.a);
}

/** L'arbre de navigation : famille › produit › variante (un toucher par niveau). */
export interface NiveauCatalogue<T> {
  libelle: string;
  enfants: NiveauCatalogue<T>[];
  article: T | null;
}

export function arbreArticles<T extends Pick<ArticleCatalogue, "famille" | "produit" | "variante">>(articles: readonly T[]): NiveauCatalogue<T>[] {
  const racine: NiveauCatalogue<T>[] = [];
  const dans = (niveau: NiveauCatalogue<T>[], libelle: string) => {
    let n = niveau.find((x) => x.libelle === libelle);
    if (!n) {
      n = { libelle, enfants: [], article: null };
      niveau.push(n);
    }
    return n;
  };
  for (const a of articles) {
    const p = dans(dans(racine, a.famille).enfants, a.produit);
    if (a.variante) dans(p.enfants, a.variante).article = a;
    else p.article = a;
  }
  return racine;
}

/**
 * La clé de regroupement d'un article du catalogue. Quand la référence stricte le reconnaît ET que sa clé ne désigne
 * QUE lui dans le catalogue, il prend cette clé : il s'additionne aussi avec la même ligne lue dans un devis (« Ardoise
 * naturelle 32×22 Espagne 1er choix »). Sinon (une panne de 6 m et une de 4 m ont la même section, donc la même clé
 * stricte), il garde la sienne : jamais deux articles différents additionnés.
 */
export function clesDeRegroupement(articles: readonly Pick<ArticleCatalogue, "cle" | "designation">[], cleStricte: (designation: string) => string | null): Map<string, string> {
  const parStricte = new Map<string, string[]>();
  for (const a of articles) {
    const k = cleStricte(a.designation);
    if (k) parStricte.set(k, [...(parStricte.get(k) ?? []), a.cle]);
  }
  const resultat = new Map<string, string>();
  for (const a of articles) {
    const k = cleStricte(a.designation);
    resultat.set(a.cle, k && parStricte.get(k)!.length === 1 ? k : `cat:${a.cle}`);
  }
  return resultat;
}
