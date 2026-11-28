import { METIERS_CATALOGUE, type MetierCatalogue } from "./catalogue.js";

/**
 * L'OUVERTURE DES MÉTIERS (Greg, 15 novembre 2026, lot C : « au lancement public seuls Couverture et Peinture seront
 * utilisables ; tous les autres métiers restent visibles avec le badge "Bientôt" »). UNE liste canonique (les métiers du
 * catalogue) et UN réglage (`METIERS_OUVERTS`) : ouvrir un métier ne demande aucune modification d'écran. Zinguerie et
 * Étanchéité restent des métiers à part, même « Bientôt ».
 */
export type MetiersOuverts = "tous" | readonly MetierCatalogue[];
export const METIERS_OUVERTS_AU_LANCEMENT: readonly MetierCatalogue[] = ["couverture", "peinture"];
export const BADGE_BIENTOT = "Bientôt";
export const PHRASE_METIER_BIENTOT = "Ce métier arrive bientôt sur Mobiiz.";

/**
 * Le réglage, lu une fois : « tous », ou des codes de métier séparés par des virgules. Sans réglage : la production ouvre
 * Couverture et Peinture ; ailleurs (site de test, développement), tout est ouvert. Un code inconnu est ignoré ; un
 * réglage qui n'ouvre rien retombe sur le lancement (jamais une application sans métier).
 */
export function lireMetiersOuverts(valeur: string | undefined | null, production: boolean): MetiersOuverts {
  const v = (valeur ?? "").trim().toLowerCase();
  if (!v) return production ? METIERS_OUVERTS_AU_LANCEMENT : "tous";
  if (v === "tous") return "tous";
  const codes = v.split(",").map((x) => x.trim()).filter((x): x is MetierCatalogue => (METIERS_CATALOGUE as readonly string[]).includes(x));
  return codes.length ? codes : METIERS_OUVERTS_AU_LANCEMENT;
}

export const metierOuvert = (m: string, ouverts: MetiersOuverts): boolean => ouverts === "tous" || (ouverts as readonly string[]).includes(m);

/** Les métiers ouverts d'abord, dans l'ordre d'origine : un métier « Bientôt » ne passe jamais devant un métier utilisable. */
export function ouvertsDAbord<T extends { ouvert: boolean }>(liste: readonly T[]): T[] {
  return [...liste.filter((x) => x.ouvert), ...liste.filter((x) => !x.ouvert)];
}

/**
 * Le métier du catalogue derrière un lot des achats groupés. Les lots « Isolation » et « Bois » s'affichent sous le nom
 * de leur métier (« Plâtrerie et isolation », « Charpente ») : pas de libellé vague, pas de doublon. « Divers » n'a pas
 * de métier : ouvert seulement quand tout l'est.
 */
export const METIER_DU_LOT_V1: Readonly<Record<string, MetierCatalogue | null>> = {
  couverture: "couverture",
  zinguerie: "zinguerie",
  isolation: "platrerie_isolation",
  bois: "charpente",
  electricite: "electricite",
  plomberie: "plomberie",
  maconnerie: "maconnerie",
  platrerie: "platrerie_isolation",
  menuiserie: "menuiserie",
  peinture: "peinture",
  divers: null,
};
export function lotOuvertV1(lot: string, ouverts: MetiersOuverts): boolean {
  const m = METIER_DU_LOT_V1[lot];
  return m ? metierOuvert(m, ouverts) : ouverts === "tous";
}
