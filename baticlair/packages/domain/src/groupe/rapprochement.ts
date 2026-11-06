import { referenceStricte, type AttributReference } from "./reference-stricte.js";

/**
 * LE RAPPROCHEMENT ENTRE BESOINS (Greg, 6 novembre 2026, « parcours produit », points 7 à 9) : un artisan envoie sa
 * demande individuelle tout de suite et peut laisser certaines lignes disponibles, jusqu'à une date, pour qu'un besoin
 * compatible d'un autre artisan (ou une collecte ouverte) soit repéré. Du code pur, prudent et explicable, sans IA :
 *  - CORRESPONDANCE EXACTE : même article et mêmes caractéristiques essentielles (la référence stricte), même unité,
 *    même secteur, dates compatibles ;
 *  - ALTERNATIVE POSSIBLE : même type d'article, mais des écarts que l'artisan doit lire et confirmer (dimensions,
 *    marque, qualité, origine, conditionnement, teinte, date ou mode de livraison) ;
 *  - NON COMPATIBLE : autre article, autre unité, autre secteur, dates trop éloignées, ou ligne non reconnue (le doute
 *    protège l'artisan : jamais de rapprochement sur une ligne que la référence stricte ne lit pas).
 * Un score interne existe pour trier, jamais à la place des écarts. RIEN n'est modifié : ni quantité, ni dimension, ni
 * marque, ni qualité ; l'artisan décide.
 */

export type NiveauRapprochement = "exacte" | "alternative" | "incompatible";

export interface BesoinComparable {
  designation: string;
  unite: string;
  /** Le département (« 29 »). */
  departement: string | null;
  /** La date à laquelle il faut les matériaux au plus tard (jour ISO), si l'artisan l'a dite. */
  dateMax: string | null;
  /** Livraison sur chantier ou retrait au dépôt. */
  modeLivraison: "livraison" | "retrait";
}

export interface ResultatRapprochement {
  niveau: NiveauRapprochement;
  /** Les écarts, en phrases courtes (« Format différent : 32×22 et 30×20 »). Vide pour une correspondance exacte. */
  differences: string[];
  /** Interne (tri) : 100 pour une correspondance exacte. */
  score: number;
}

const NOMS: Readonly<Record<AttributReference, string>> = {
  format: "Format différent",
  epaisseur: "Épaisseur différente",
  largeur: "Largeur différente",
  origine: "Origine différente",
  qualite: "Qualité ou classement différent",
  marque: "Marque différente",
  aspect: "Aspect différent",
  conditionnement: "Conditionnement différent",
  teinte: "Couleur différente",
  finition: "Finition différente",
};

/** L'écart d'une date au-delà duquel deux besoins ne se rapprochent pas (une collecte livre en une fois). */
export const ECART_DATES_MAX_JOURS = 30;
/** Au-delà de cet écart, des dates compatibles restent une différence à lire. */
export const ECART_DATES_SIGNALE_JOURS = 7;

const JOUR = 86_400_000;
const lisible = (a: AttributReference, v: string) => (a === "format" ? v.replace(/x/g, "×") : a === "epaisseur" || a === "largeur" ? `${v.replace(".", ",")} mm` : v);
const uniteNormale = (u: string) => u.trim().toLowerCase().replace(/^pi[eè]ces?$|^pcs?$|^u$|^unit[eé]s?$/, "u").replace(/^m²$/, "m2").replace(/^ml$/, "m");

/** Compare deux besoins : l'article (référence stricte), l'unité, le secteur, les dates et le mode de livraison. */
export function comparerBesoins(a: BesoinComparable, b: BesoinComparable): ResultatRapprochement {
  const ra = referenceStricte(a.designation);
  const rb = referenceStricte(b.designation);
  const non = (raison: string): ResultatRapprochement => ({ niveau: "incompatible", differences: [raison], score: 0 });
  if (!ra.ok || !rb.ok) return non("Article non reconnu avec certitude");
  if (ra.reference.type !== rb.reference.type) return non("Autre article");
  if (uniteNormale(a.unite) !== uniteNormale(b.unite)) return non(`Unités différentes : ${a.unite} et ${b.unite}`);
  if (!a.departement || !b.departement || a.departement !== b.departement) return non("Autre secteur de livraison");
  const differences: string[] = [];
  if (a.dateMax && b.dateMax) {
    const ecart = Math.abs(Date.parse(a.dateMax) - Date.parse(b.dateMax)) / JOUR;
    if (ecart > ECART_DATES_MAX_JOURS) return non("Dates de livraison trop éloignées");
    if (ecart > ECART_DATES_SIGNALE_JOURS) differences.push(`Date de livraison différente : ${Math.round(ecart)} jours d'écart`);
  }
  const attributs = new Set<AttributReference>([...(Object.keys(ra.reference.attributs) as AttributReference[]), ...(Object.keys(rb.reference.attributs) as AttributReference[])]);
  for (const at of attributs) {
    const va = ra.reference.attributs[at];
    const vb = rb.reference.attributs[at];
    if (va === vb) continue;
    if (va && vb) differences.push(`${NOMS[at]} : ${lisible(at, va)} et ${lisible(at, vb)}`);
    else differences.push(`${NOMS[at].replace(/ différente?$/, "")} précisé${at === "qualite" || at === "marque" || at === "origine" || at === "epaisseur" || at === "largeur" || at === "teinte" || at === "finition" ? "e" : ""} d'un seul côté : ${lisible(at, (va ?? vb)!)}`);
  }
  if (a.modeLivraison !== b.modeLivraison) differences.push("Mode différent : livraison sur chantier et retrait au dépôt");
  if (differences.length === 0) return { niveau: "exacte", differences: [], score: 100 };
  return { niveau: "alternative", differences, score: Math.max(10, 100 - 15 * differences.length) };
}

/* ------------------------------------------------------------------------------------- les états d'une ligne */

/**
 * LA VIE D'UNE LIGNE LAISSÉE EN RAPPROCHEMENT (point 19) : une seule machine d'états, pour qu'aucun écran ne contredise
 * un autre. « disponible » : l'artisan l'a laissée chercher jusqu'à une date ; « proposee » : un rapprochement l'attend ;
 * « rejointe » : il a confirmé dans une collecte ; « retiree » : il l'a retirée, ou une offre l'a couverte (plus de double
 * commande) ; « expiree » : la date est passée. Rien ne revient tout seul d'un état final.
 */
export const ETATS_LIGNE_RAPPROCHEMENT = ["disponible", "proposee", "rejointe", "retiree", "expiree"] as const;
export type EtatLigneRapprochement = (typeof ETATS_LIGNE_RAPPROCHEMENT)[number];

const TRANSITIONS: Readonly<Record<EtatLigneRapprochement, readonly EtatLigneRapprochement[]>> = {
  disponible: ["proposee", "rejointe", "retiree", "expiree"],
  proposee: ["disponible", "rejointe", "retiree", "expiree"],
  rejointe: ["retiree"],
  retiree: ["disponible"],
  expiree: ["disponible"],
};

/** Une transition permise (retiree / expiree → disponible : seulement par un nouveau geste de l'artisan). */
export const transitionPermise = (de: EtatLigneRapprochement, vers: EtatLigneRapprochement): boolean => de === vers || TRANSITIONS[de].includes(vers);

/* ------------------------------------------------------------------------------------------ les phrases */

export const PHRASE_RECHERCHE_RAPPROCHEMENT =
  "Ta demande peut partir maintenant à tes négoces. MOBIIZ peut aussi rechercher pendant quelques jours des besoins compatibles pour les lignes que tu choisis. Si un rapprochement apparaît, tu décideras librement de le rejoindre ou non.";
export const PHRASE_RESTE_INDIVIDUELLE = "Ta demande reste individuelle. Si un besoin compatible apparaît, tu seras libre d'examiner le regroupement.";
export const PHRASE_COLLECTIF = "Un achat groupé fonctionne si chacun joue sa part : un besoin réel, des informations fiables et une réponse dans les délais. MOBIIZ organise le reste.";
export const LIBELLES_NIVEAU: Readonly<Record<NiveauRapprochement, string>> = { exacte: "Correspondance exacte", alternative: "Alternative possible", incompatible: "Non compatible" };

/** Le corps d'une notification ciblée : jamais le nom ni la quantité d'un autre artisan. */
export function phraseNotificationRapprochement(p: { produit: string; niveau: NiveauRapprochement; collecte: boolean }): string {
  const quoi = p.collecte ? "Une collecte ouverte dans ton secteur correspond" : "Un besoin compatible vient d'apparaître dans ton secteur";
  const niveau = p.niveau === "exacte" ? "correspondance exacte" : "alternative possible, avec des différences à vérifier";
  return `${quoi} pour « ${p.produit} » (${niveau}). Veux-tu examiner le rapprochement ?`;
}
