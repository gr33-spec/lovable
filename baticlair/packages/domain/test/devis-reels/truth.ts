import type { QuoteLine } from "../../src/index.js";

/**
 * VÉRITÉ TERRAIN d'une ligne de devis, annotée à la main (BatiClair, à
 * valider par le fondateur) pour juger le moteur, jamais pour le régler :
 *  - « D » achat direct : la quantité de la ligne se commande telle quelle (produit défini) ;
 *  - « C » ouvrage à convertir : la quantité mesure l'ouvrage (m², points…), les
 *    matériaux à commander s'en déduisent (plaques, rails, câble, colle…) ;
 *  - « P » élément principal + accessoires : la quantité compte bien l'article principal
 *    (8 prises, 20 m de gouttière), mais d'autres matériaux s'y ajoutent (boîtes, câble, crochets) ;
 *  - « X » fourniture en vrac indéterminée (« accessoires de raccordement : raccords, coudes… ») ;
 *  - « L » main-d'œuvre ou service ; « LI » main-d'œuvre qui consomme des matériaux non listés
 *    (étanchéité, colle, joints…) ;
 *  - « I » information, frais, remise (rien à commander).
 */
export type Truth = "D" | "P" | "C" | "X" | "L" | "LI" | "I";

export interface BenchLine extends QuoteLine {
  truth: Truth;
  /** Ce qu'un artisan doit savoir sur cette ligne (piège, info ailleurs, question réelle). */
  note?: string;
}

export const MATERIAL_TRUTHS: readonly Truth[] = ["D", "P", "C", "X"];

let counter = 0;
/** Ligne de banc : référence automatique « l001 »… dans l'ordre du devis. */
export const line = (designation: string, quantity: string | null, unit: string | null, truth: Truth, note?: string): BenchLine => ({
  ref: `l${String(++counter).padStart(3, "0")}`,
  designation,
  quantity,
  unit,
  truth,
  ...(note ? { note } : {}),
});
/** Repart à « l001 » pour un nouveau devis. */
export const resetLines = () => {
  counter = 0;
};

/**
 * Titres du devis au-dessus de ces lignes (du plus général au plus précis),
 * tels qu'écrits : ce que la lecture du document doit rattacher à chaque ligne.
 */
export const under = (section: string[], ...lines: (BenchLine | BenchLine[])[]): BenchLine[] => lines.flat().map((l) => ({ ...l, section }));
