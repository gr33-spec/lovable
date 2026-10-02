import { normalizeText } from "../trades/trade-profile.js";

/** Mots qui désignent un LIEU du chantier (pièce, logement, niveau) : vocabulaire général du bâtiment. */
const PLACE_WORDS = new Set(
  (
    "cuisine sejour salon chambre salle bain bains eau wc toilette toilettes degagement couloir entree hall mezzanine " +
    "cellier buanderie garage bureau dressing palier escalier logement logements appartement maison villa niveau etage " +
    "rdc commun communs commune communes partie parties combles sous sol cave terrasse balcon exterieur interieur piece pieces espace " +
    "independant grenier sde sdb ch type bis ter de d du des la le les et n no"
  ).split(" "),
);

/**
 * « Cuisine/Séjour », « Chambre 1 », « N°1 TYPE T3 », « Espace WC niveau 0 » :
 * un titre qui ne nomme qu'un lieu ne dit rien de l'article.
 */
export function isPlaceTitle(title: string): boolean {
  const words = normalizeText(title)
    .replace(/[^a-z0-9+ ]/g, " ")
    .split(" ")
    .filter((w) => w.length > 0);
  return words.length > 0 && words.every((w) => PLACE_WORDS.has(w) || /^(?:\d+|t\d|r\+?\d?|[a-c])$/.test(w));
}

/**
 * Titres de section qui DISTINGUENT un article (marque, gamme, ouvrage, lot),
 * normalisés : deux lignes identiques sous des titres différents hors lieux
 * ne sont pas le même article (« Plus-value PPM » sous « Cloison SAD » et
 * sous « BA13 collée »).
 */
export function articleScope(section: readonly string[] | undefined): string[] {
  return (section ?? []).filter((t) => !isPlaceTitle(t)).map(normalizeText);
}
