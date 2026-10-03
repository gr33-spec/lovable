import type { UnitCode } from "../quantity/unit.js";

/**
 * Profil métier : tout ce qui change d'un corps d'état à l'autre
 * (référentiel de matériaux, unités admises, lignes de main-d'œuvre, oublis
 * fréquents, pages sans intérêt). Le pipeline, la validation du quantitatif
 * et, plus tard, les consignes d'extraction lisent le profil au lieu de
 * coder un métier en dur : ouvrir un corps d'état = écrire un profil.
 *
 * Un seul moteur pour tous les métiers : le profil n'est que de la donnée.
 * Une entreprise multi-métiers lit ses devis avec la fusion de ses profils
 * (voir trades/index.ts, PD-033).
 */
export interface TradeProfile {
  id: string;
  label: string;
  /** Référentiel : familles de matériaux, de la plus précise à la plus générale (l'ordre compte). */
  families: readonly MaterialFamily[];
  /** Mots qui signalent une prestation (dépose, échafaudage…) et non un matériau à commander. */
  laborKeywords: readonly string[];
  /** Mots qui signalent une fourniture, même accompagnée de pose (« fourniture et pose de… »). */
  supplyKeywords: readonly string[];
  /** Oublis fréquents : quand une famille est présente, une autre est attendue. */
  companionRules: readonly CompanionRule[];
  /**
   * Marqueurs de pages sans ligne de matériaux (conditions générales,
   * mentions légales). Une page n'est écartée que si elle en contient
   * plusieurs ET aucun montant ni aucune unité (voir page-analysis).
   */
  boilerplateMarkers: readonly string[];
  /** Mots (normalisés) typiques du métier, pour reconnaître une page utile. */
  materialKeywords: readonly string[];
}

export interface MaterialFamily {
  /** Code stable (ex. « roof_tile »), utilisé dans les données et les évaluations. */
  code: string;
  label: string;
  /** Mots (normalisés, singulier) qui désignent la famille ; un pluriel est reconnu. */
  keywords: readonly string[];
  /** Si l'un de ces mots est présent, ce n'est PAS cette famille (ex. crochet de gouttière ≠ crochet d'ardoise). */
  excludes?: readonly string[];
  /**
   * Unités dans lesquelles la famille se commande ou se chiffre normalement.
   * Absent = famille « légère » : elle sert à reconnaître le matériau (et à
   * guider l'IA), sans aucun contrôle d'unité, de quantité ni de conditionnement.
   */
  allowedUnits?: readonly UnitCode[];
  /** Au-delà, la quantité est inhabituelle pour un chantier : « à vérifier » (jamais un refus). */
  plausibleMax?: Partial<Record<UnitCode, number>>;
  /** Vendu à la pièce : une quantité en unités doit être entière. */
  wholeUnits?: boolean;
  /**
   * Sur un devis client, une surface (m²) de ce matériau doit être convertie
   * en nombre de pièces avec le rendement du produit choisi (u/m²). Le
   * logiciel ne suppose jamais ce rendement.
   */
  areaNeedsYield?: boolean;
  /**
   * Une quantité EN PIÈCES de cette famille compte des OUVRAGES (« 2 points
   * lumineux », « 17 alimentations radiateur ») : chacun se décompose en
   * matériaux (appareillage, boîte, câble…) ; ce n'est pas un nombre d'articles.
   */
  countOfWork?: boolean;
  /**
   * Sur un devis client, une surface (m²) de cette famille est la surface
   * de l'OUVRAGE (« liteaux 120 m² » = 120 m² de toiture liteautée) : la
   * quantité d'achat (ml, longueurs) reste à calculer.
   */
  areaOfWork?: boolean;
  /**
   * Sur un devis client, une longueur (m, ml) de cette famille est la
   * longueur de l'OUVRAGE (« faîtage 10 m », « rives 24 m ») : ce qui
   * s'achète, ce sont des pièces (faîtières, tuiles de rive) à calculer.
   */
  lengthOfWork?: boolean;
}

export interface CompanionRule {
  /** Famille présente… */
  when: string;
  /** …au moins une de ces familles est attendue. */
  expectAnyOf: readonly string[];
  /** Question posée à l'artisan (jamais un ajout automatique). */
  message: string;
}

/** Minuscules, sans accents, apostrophes et tirets en espaces, espaces simples. */
export function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    // Ligatures : « main d'œuvre » = « main d'oeuvre ».
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    // Formats : « 30×22 » = « 30x22 ».
    .replace(/[×✕]/g, "x")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const keywordCache = new Map<string, RegExp>();

/**
 * Le mot (ou l'expression) apparaît comme mot entier, pluriel en « s » ou
 * « x » accepté : « tuile » reconnaît « tuiles », mais « pose » ne
 * reconnaît pas « dépose ».
 */
export function containsKeyword(normalized: string, keyword: string): boolean {
  return keywordPosition(normalized, keyword) >= 0;
}

/** Position du mot (ou de l'expression) dans le texte normalisé, ou -1. */
export function keywordPosition(normalized: string, keyword: string): number {
  let re = keywordCache.get(keyword);
  if (!re) {
    // Pluriel accepté sur chaque mot : « tuile de rive » reconnaît « tuiles de rives ».
    const words = normalizeText(keyword).split(" ").map(escapeRegExp);
    re = new RegExp(`(?:^|[^a-z0-9])(${words.map((w, i) => (i < words.length - 1 ? `${w}(?:s|x)?` : w)).join(" ")})(?:s|x)?(?![a-z0-9])`);
    keywordCache.set(keyword, re);
  }
  const m = re.exec(normalized);
  return m ? m.index + m[0].indexOf(m[1]!) : -1;
}
