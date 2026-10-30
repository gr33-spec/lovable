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
    .trim();

const slug = (s: string) => aPlat(s).replace(/\./g, "-").replace(/\s+/g, "-");

/** Fabrique d'articles : un produit et ses variantes (formats, dimensions, qualités). */
export function produit(
  metier: MetierCatalogue,
  famille: string,
  nom: string,
  unite: string,
  variantes: readonly (string | null)[] = [null],
  o: { synonymes?: readonly string[]; designation?: (v: string | null) => string } = {},
): ArticleCatalogue[] {
  return variantes.map((v) => ({
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

/** La qualité de la rencontre d'un mot tapé avec des mots : 3 le mot même, 2 son début, 1 ou 1,5 à une faute près, 0 rien. */
function rencontre(tape: string, mots: readonly string[]): number {
  const t = singulier(tape);
  let meilleure = 0;
  for (const m of mots) {
    const s = singulier(m);
    if (s === t || m === tape) return 3;
    if (s.startsWith(t) || m.startsWith(tape)) meilleure = Math.max(meilleure, 2);
    else {
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
