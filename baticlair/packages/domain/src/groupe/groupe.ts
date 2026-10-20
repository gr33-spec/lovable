import { normalizeText } from "../trades/trade-profile.js";

/**
 * BATICLAIR GROUPÉ (document du fondateur, 2026-10-19, « parcours complet », sections 1 à 6) : les besoins FERMES de
 * plusieurs artisans d'une même zone, regroupés pour un prix de volume chez UN négoce par lot ; chacun commande ensuite
 * sur son propre compte. Le regroupement est du code pur (référence, zone, fenêtre) : ce module en porte les règles
 * (statuts, familles, clé de référence, zone, fenêtres), sans base ni IA. Tout reste derrière le drapeau `groupe`.
 */

/**
 * Section 2, étape 3 : les familles qu'un négoce coche (« ce que chacun vend ») : les six du document, plus trois ajoutées
 * par le fondateur le 20 octobre 2026 (« menuiseries et fermetures », « second œuvre », « serrurerie et métallerie »).
 */
export const FAMILLES_GROUPE = [
  "couverture",
  "charpente",
  "maconnerie",
  "electricite",
  "plomberie",
  "amenagement_exterieur",
  "menuiseries_fermetures",
  "second_oeuvre",
  "serrurerie_metallerie",
] as const;
export type FamilleGroupe = (typeof FAMILLES_GROUPE)[number];

export const LIBELLES_FAMILLES: Readonly<Record<FamilleGroupe, string>> = {
  couverture: "Couverture",
  charpente: "Charpente",
  maconnerie: "Maçonnerie",
  electricite: "Électricité",
  plomberie: "Plomberie",
  amenagement_exterieur: "Aménagement extérieur",
  menuiseries_fermetures: "Menuiseries et fermetures",
  second_oeuvre: "Second œuvre (peinture, carrelage, plâtrerie, sols)",
  serrurerie_metallerie: "Serrurerie et métallerie",
};

/**
 * Les familles d'un métier (décision du fondateur, 2026-10-20 : « chaque métier du référentiel rattaché à au moins une ») :
 * la première est celle de ses besoins ; le constructeur couvre toutes les familles. « Autre métier » n'a pas de
 * référentiel, donc pas de famille.
 */
const FAMILLES_DU_METIER: Readonly<Record<string, readonly FamilleGroupe[]>> = {
  roofing: ["couverture"],
  waterproofing: ["couverture"],
  cladding: ["couverture"],
  solar: ["electricite", "couverture"],
  carpentry: ["charpente"],
  masonry: ["maconnerie"],
  facade: ["maconnerie"],
  earthworks: ["maconnerie", "amenagement_exterieur"],
  electrical: ["electricite"],
  plumbing: ["plomberie"],
  hvac: ["plomberie"],
  paving: ["amenagement_exterieur"],
  decking: ["amenagement_exterieur"],
  irrigation: ["amenagement_exterieur"],
  joinery: ["menuiseries_fermetures"],
  interior_joinery: ["menuiseries_fermetures"],
  kitchen: ["menuiseries_fermetures"],
  painting: ["second_oeuvre"],
  tiling: ["second_oeuvre"],
  drywall: ["second_oeuvre"],
  flooring: ["second_oeuvre"],
  ceiling: ["second_oeuvre"],
  metalwork: ["serrurerie_metallerie"],
  general: FAMILLES_GROUPE,
};

export function famillesDuMetier(metier: string | null | undefined): readonly FamilleGroupe[] {
  return (metier && FAMILLES_DU_METIER[metier]) || [];
}

/** La famille des besoins d'un métier (la première des siennes), ou null sans famille. */
export function familleDuMetier(metier: string | null | undefined): FamilleGroupe | null {
  return famillesDuMetier(metier)[0] ?? null;
}

/** section 2, étape 2 et section 4 : la vie d'un besoin, de la proposition à la livraison. */
export const STATUTS_BESOIN = ["en_attente", "signe", "retire", "engage", "commande", "livre"] as const;
export type StatutBesoin = (typeof STATUTS_BESOIN)[number];

/** section 2, étapes 4 à 8 : la vie d'un lot. */
export const STATUTS_LOT = ["ouvert", "envoye", "choisi", "clos", "annule"] as const;
export type StatutLot = (typeof STATUTS_LOT)[number];

/** section 2, étape 6 : la lecture d'un devis de négoce ; un cas douteux est « à vérifier » pour Greg, jamais bloquant. */
export const STATUTS_EXTRACTION = ["en_attente", "lue", "a_verifier", "echec"] as const;
export type StatutExtraction = (typeof STATUTS_EXTRACTION)[number];

/** section 2, étape 8 : la confirmation d'un tap. */
export const STATUTS_LIVRAISON = ["prevue", "livre", "probleme"] as const;
export type StatutLivraison = (typeof STATUTS_LIVRAISON)[number];

export type RefusTransition = "inconnue" | "lot_parti" | "pas_signe" | "deja_engage";

/**
 * Les passages permis d'un besoin (section 4) : « en attente » bascule « signé » d'un tap (d) ; un besoin se retire librement
 * tant que la demande n'est pas partie aux négoces (a), plus ensuite (b) ; seul un besoin signé s'engage au départ du lot
 * (un besoin en attente part comme volume probable, sans engagement) ; puis commandé (bon de commande), puis livré.
 */
export function transitionBesoin(de: StatutBesoin, vers: StatutBesoin, contexte: { lotParti: boolean }): { ok: true } | { ok: false; raison: RefusTransition } {
  if (vers === "retire") {
    if (de === "en_attente" || de === "signe") return contexte.lotParti && de === "signe" ? { ok: false, raison: "lot_parti" } : { ok: true };
    return { ok: false, raison: de === "retire" ? "inconnue" : "deja_engage" };
  }
  if (de === "en_attente" && vers === "signe") return { ok: true };
  if (vers === "engage") return de === "signe" ? { ok: true } : { ok: false, raison: "pas_signe" };
  if (de === "engage" && vers === "commande") return { ok: true };
  if (de === "commande" && vers === "livre") return { ok: true };
  return { ok: false, raison: "inconnue" };
}

/** Une dimension écrite de plusieurs façons (« 32 x 22 », « 32×22 », « 0,65 mm ») ramenée à une forme. */
function dimensionNormale(d: string): string {
  return normalizeText(d).replace(/\s*x\s*/g, "x").replace(/(\d),(\d)/g, "$1.$2").replace(/\s+/g, "");
}

/**
 * LA CLÉ D'UN BESOIN (section 7, étape 1, « Normalisation ») : la référence fabricant quand elle existe (marque comprise, une
 * référence ne vaut que chez son fabricant), sinon le libellé du référentiel + la dimension + la teinte. Deux besoins
 * ne se groupent que sur une clé IDENTIQUE : jamais un rapprochement approché.
 */
export function cleDeReference(article: { referenceFabricant?: string | null; marque?: string | null; libelle: string; dimension?: string | null; teinte?: string | null }): string {
  const ref = article.referenceFabricant?.trim();
  if (ref) {
    const r = normalizeText(ref).replace(/[\s./]+/g, "").toUpperCase();
    const marque = article.marque?.trim() ? normalizeText(article.marque).replace(/\s+/g, "-") : "";
    return `ref:${marque ? `${marque}:` : ""}${r}`;
  }
  const libelle = normalizeText(article.libelle);
  const dimension = article.dimension?.trim() ? dimensionNormale(article.dimension) : "";
  const teinte = article.teinte?.trim() ? normalizeText(article.teinte) : "";
  return `lib:${libelle}|${dimension}|${teinte}`;
}

/**
 * La ZONE d'un chantier (section 2, étape 4) : son département, tiré du code postal. Corse : 2A (200xx, 201xx) et 2B ; outre-mer :
 * trois chiffres (971…). `null` sans code postal lisible : le besoin n'entre pas au groupé.
 */
export function zoneDuCodePostal(codePostal: string | null | undefined): string | null {
  const cp = /\b(\d{5})\b/.exec(codePostal ?? "")?.[1];
  if (!cp) return null;
  if (cp.startsWith("97") || cp.startsWith("98")) return cp.slice(0, 3);
  if (cp.startsWith("20")) return Number(cp.slice(0, 3)) <= 201 ? "2A" : "2B";
  return cp.slice(0, 2);
}

/** Une fenêtre de livraison : la date la plus tôt et la date limite (incluses). */
export interface FenetreLivraison {
  tot: Date;
  tard: Date;
}

/** Deux fenêtres sont compatibles quand une même date de livraison tient dans les deux (section 2, étape 4). */
export function fenetresCompatibles(a: FenetreLivraison, b: FenetreLivraison): boolean {
  return a.tot.getTime() <= b.tard.getTime() && b.tot.getTime() <= a.tard.getTime();
}

/** Une fenêtre se lit dans le bon sens : la date limite n'est jamais avant la date la plus tôt. */
export function fenetreValide(f: FenetreLivraison): boolean {
  return Number.isFinite(f.tot.getTime()) && Number.isFinite(f.tard.getTime()) && f.tot.getTime() <= f.tard.getTime();
}

/**
 * La quantité d'un besoin, prise sur la ligne de la liste d'achats (« 31 », « bacs ») : le nombre en point décimal, sans
 * séparateur de milliers. `null` quand la ligne n'a pas de quantité établie : elle n'entre pas au groupé.
 */
export function quantiteDuBesoin(order: { count: string; unit: string } | null, quantity: string | null): { quantite: string; unite: string } | null {
  const lire = (texte: string) => {
    const m = /^\s*(\d[\d\s  ]*(?:[.,]\d+)?)\s*(.*)$/.exec(texte);
    if (!m) return null;
    const n = Number(m[1]!.replace(/[\s  ]/g, "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? { n: String(n), reste: m[2]!.trim() } : null;
  };
  if (order) {
    const q = lire(order.count);
    if (q && order.unit.trim()) return { quantite: q.n, unite: order.unit.trim() };
  }
  const q = quantity ? lire(quantity) : null;
  return q && q.reste ? { quantite: q.n, unite: q.reste } : null;
}
