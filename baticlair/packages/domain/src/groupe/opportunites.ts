/**
 * LES OPPORTUNITÉS D'ACHAT EN GROS D'UN QUANTITATIF (Greg, 7 novembre 2026, « deux parcours distincts mais reliés »,
 * points 6 et 7) : après validation, chaque ligne est examinée SEULE. Du code pur, sans IA, prudent :
 *  - ÉLIGIBLE : la ligne a une fiche produit sûre (référence stricte, type connu, attributs exigés présents), n'est pas un
 *    petit accessoire, et n'est ni commandée ni déjà dans un groupe ;
 *  - RECOMMANDÉE : éligible ET (une collecte ouverte correspond exactement, OU des besoins identiques d'autres artisans
 *    existent, OU la quantité atteint le palier de gros de son type).
 * Le potentiel ne dépend pas que de la taille : un Velux vaut le coup dès une pièce ; un écran dès quelques rouleaux.
 * Rien n'est publié ni inscrit : la recommandation coche seulement les lignes que l'artisan pourra décocher.
 */

/** Le palier de gros d'un type (quantité dans son unité habituelle). HYPOTHÈSES DE DÉPART à valider par Greg (DECISIONS). */
export const PALIERS_GROS: Readonly<Record<string, { unites: readonly string[]; min: number }>> = {
  ardoise: { unites: ["u"], min: 1000 },
  "ardoise-fibres-ciment": { unites: ["u"], min: 500 },
  tuile: { unites: ["u"], min: 500 },
  "fenetre-de-toit": { unites: ["u"], min: 1 },
  gouttiere: { unites: ["m"], min: 30 },
  zinc: { unites: ["m", "m2", "kg"], min: 30 },
  "ecran-sous-toiture": { unites: ["u", "rouleaux", "rouleau"], min: 3 },
  liteau: { unites: ["m"], min: 300 },
  volige: { unites: ["m", "m2"], min: 50 },
  "bois-charpente": { unites: ["m", "m3"], min: 100 },
  osb: { unites: ["u", "m2"], min: 20 },
  isolant: { unites: ["m2", "u", "rouleaux", "rouleau"], min: 50 },
  "plaque-platre": { unites: ["u", "plaques", "plaque"], min: 30 },
  peinture: { unites: ["u", "pots", "pot"], min: 10 },
  "sous-couche": { unites: ["u", "pots", "pot"], min: 10 },
};

const uniteCourte = (u: string) => u.trim().toLowerCase().replace(/^pi[eè]ces?$|^pcs?$|^u$|^unit[eé]s?$/, "u").replace(/^m²$/, "m2").replace(/^ml$/, "m");

export interface FaitsOpportunite {
  /** La ligne a une fiche produit sûre et peut entrer dans un groupe (rapprochable). */
  rapprochable: boolean;
  /** Le type de sa référence stricte (null si non reconnue). */
  type: string | null;
  quantite: number | null;
  unite: string;
  /** Une collecte ouverte qui correspond exactement. */
  collecte: boolean;
  /** Le nombre d'AUTRES entreprises qui cherchent exactement ce produit dans le secteur. */
  besoinsCompatibles: number;
}

export interface Recommandation {
  recommandee: boolean;
  /** La raison en une phrase courte, jamais un nom ni une quantité d'un autre artisan. */
  raison: string | null;
}

export function recommander(f: FaitsOpportunite): Recommandation {
  if (!f.rapprochable || !f.type) return { recommandee: false, raison: null };
  if (f.collecte) return { recommandee: true, raison: "Collecte ouverte près de toi" };
  if (f.besoinsCompatibles > 0) return { recommandee: true, raison: f.besoinsCompatibles > 1 ? `${f.besoinsCompatibles} artisans cherchent ce produit` : "Un artisan cherche ce produit" };
  const palier = PALIERS_GROS[f.type];
  if (palier && f.quantite !== null && palier.unites.includes(uniteCourte(f.unite)) && f.quantite >= palier.min) return { recommandee: true, raison: "Gros volume" };
  return { recommandee: false, raison: null };
}

/**
 * La phrase d'ensemble (point 6) : jamais une opportunité globale sur une seule correspondance faible. Avec des
 * correspondances réelles (collecte ou besoins), elle le dit ; sinon, le potentiel seul.
 */
export function phraseOpportunites(lignes: readonly { recommandee: boolean; collecte: boolean; besoinsCompatibles: number }[]): string | null {
  const reco = lignes.filter((l) => l.recommandee);
  const correspondances = reco.filter((l) => l.collecte || l.besoinsCompatibles > 0).length;
  if (correspondances >= 2) return `${correspondances} articles de ton quantitatif correspondent à des besoins recherchés par d'autres artisans. Veux-tu ajouter tes quantités ?`;
  if (correspondances === 1) return "Un article de ton quantitatif correspond à une collecte ou à un besoin recherché par d'autres artisans.";
  if (reco.length > 0) return "Certaines lignes de ton quantitatif pourraient bénéficier d'un achat groupé.";
  return null;
}
