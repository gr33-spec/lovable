/**
 * Profil métier : ce qui change d'un corps d'état à l'autre (vocabulaire,
 * unités usuelles, pages sans intérêt). Le pipeline et, plus tard, les
 * consignes d'extraction et les contrôles lisent le profil au lieu de coder
 * un métier en dur : ajouter un métier = ajouter un profil.
 *
 * MVP : charpente-couverture uniquement (PD-025).
 */
export interface TradeProfile {
  id: string;
  label: string;
  /** Mots (normalisés : minuscules, sans accents) typiques des matériaux du métier. */
  materialKeywords: readonly string[];
  /** Libellés d'unités fréquents dans ce métier (reconnus par parseUnit ou signalés « à vérifier »). */
  usualUnits: readonly string[];
  /**
   * Marqueurs de pages sans ligne de matériaux (conditions générales,
   * mentions légales). Une page n'est écartée que si elle en contient
   * plusieurs ET aucun montant ni aucune unité (voir page-analysis).
   */
  boilerplateMarkers: readonly string[];
}

/** Minuscules, sans accents, espaces simples : base de toutes les comparaisons de texte. */
export function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
