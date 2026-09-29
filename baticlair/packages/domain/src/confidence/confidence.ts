/**
 * Niveau de confiance présenté à l'utilisateur. Le score précis (0..1)
 * reste interne ; l'interface n'affiche que ces trois niveaux
 * (« ✓ Correspondance », « ~ Probable », « ? À vérifier »).
 */
export type ConfidenceLevel = "certain" | "probable" | "to_verify";

export interface ConfidenceThresholds {
  certain: number;
  probable: number;
}

/**
 * Seuils volontairement prudents : une fausse correspondance fausse la
 * comparaison (plus grave qu'une question en trop). À recalibrer avec les
 * évaluations (docs/ai-architecture.md).
 */
export const DEFAULT_CONFIDENCE_THRESHOLDS: ConfidenceThresholds = {
  certain: 0.9,
  probable: 0.7,
};

export function confidenceLevel(
  score: number,
  thresholds: ConfidenceThresholds = DEFAULT_CONFIDENCE_THRESHOLDS,
): ConfidenceLevel {
  if (!Number.isFinite(score) || score < 0 || score > 1) {
    throw new RangeError(`Score de confiance invalide : ${score}`);
  }
  if (score >= thresholds.certain) return "certain";
  if (score >= thresholds.probable) return "probable";
  return "to_verify";
}
