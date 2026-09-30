import { computeAiCost, type PriceTable } from "../ai-cost/pricing.js";
import type { PageRoute } from "./page-analysis.js";

/**
 * Estimation du coût d'extraction d'un document **avant** tout appel IA.
 *
 * Sert à deux choses : mesurer sur de vrais devis le volume réellement
 * envoyé (pages en texte, en image, écartées) sans rien dépenser, et
 * refuser proprement un document dont le coût dépasserait un plafond.
 * Ce n'est pas le coût réel : celui-ci est enregistré appel par appel
 * (AIExecution) à partir de la consommation renvoyée par le fournisseur.
 *
 * Les estimations sont volontairement **hautes** (on préfère surestimer).
 */
export interface ExtractionPolicy {
  /** Modèle pour les pages en texte. */
  textModel: string;
  /** Modèle pour les pages en image (scans, photos). */
  visionModel: string;
  /** Consignes + schéma, envoyés à chaque appel. */
  promptTokens: number;
  /** Sortie JSON compacte attendue par page utile (lignes citées par numéro). */
  outputTokensPerPage: number;
  /** Réflexion interne facturée en sortie, par appel. */
  reasoningTokensPerCall: number;
  /** Bord long du rendu des pages envoyées en image, en pixels. */
  visionLongEdgePx: number;
}

/**
 * Politique par défaut (audit coûts IA, 2026-09-30) : Sonnet 5.5 pour tout
 * tant que l'évaluation sur de vrais devis de couvreurs n'a pas prouvé
 * qu'un modèle moins cher fait aussi bien (PD-026 : la précision d'abord).
 */
export const DEFAULT_EXTRACTION_POLICY: ExtractionPolicy = {
  textModel: "claude-sonnet-5-5",
  visionModel: "claude-sonnet-5-5",
  promptTokens: 2000,
  outputTokensPerPage: 600,
  reasoningTokensPerCall: 500,
  visionLongEdgePx: 1568,
};

/** Environ 3 caractères par token pour du français de devis (majoré). */
export function estimateTextTokens(chars: number): number {
  return Math.ceil(Math.max(0, chars) / 3);
}

/**
 * Tokens d'une page rendue en image : la page est mise à l'échelle pour
 * que son bord long fasse `longEdgePx`, puis découpée en carrés de 28 px
 * (règle publiée par le fournisseur).
 */
export function estimateImageTokens(widthPt: number, heightPt: number, longEdgePx: number): number {
  if (!(widthPt > 0) || !(heightPt > 0)) throw new RangeError("Dimensions de page invalides");
  const scale = longEdgePx / Math.max(widthPt, heightPt);
  const w = Math.round(widthPt * scale);
  const h = Math.round(heightPt * scale);
  return Math.ceil(w / 28) * Math.ceil(h / 28);
}

export interface PageForEstimate {
  route: PageRoute;
  chars: number;
  widthPt: number;
  heightPt: number;
}

export interface CallEstimate {
  model: string;
  pages: number;
  inputTokens: number;
  imageTokens: number;
  outputTokens: number;
  microUsd: number;
}

export interface DocumentCostEstimate {
  priceTableVersion: string;
  pagesText: number;
  pagesVision: number;
  pagesSkipped: number;
  calls: CallEstimate[];
  totalMicroUsd: number;
}

export function estimateDocumentCost(
  pages: readonly PageForEstimate[],
  policy: ExtractionPolicy,
  table: PriceTable,
): DocumentCostEstimate {
  const text = pages.filter((p) => p.route === "text");
  const vision = pages.filter((p) => p.route === "vision");
  const calls: CallEstimate[] = [];

  if (text.length > 0) {
    const inputTokens = policy.promptTokens + text.reduce((s, p) => s + estimateTextTokens(p.chars), 0);
    const outputTokens = text.length * policy.outputTokensPerPage + policy.reasoningTokensPerCall;
    calls.push({
      model: policy.textModel,
      pages: text.length,
      inputTokens,
      imageTokens: 0,
      outputTokens,
      microUsd: computeAiCost(policy.textModel, { inputTokens, outputTokens }, table).totalMicroUsd,
    });
  }
  if (vision.length > 0) {
    const imageTokens = vision.reduce((s, p) => s + estimateImageTokens(p.widthPt, p.heightPt, policy.visionLongEdgePx), 0);
    const inputTokens = policy.promptTokens;
    const outputTokens = vision.length * policy.outputTokensPerPage + policy.reasoningTokensPerCall;
    calls.push({
      model: policy.visionModel,
      pages: vision.length,
      inputTokens,
      imageTokens,
      outputTokens,
      microUsd: computeAiCost(policy.visionModel, { inputTokens: inputTokens + imageTokens, outputTokens }, table).totalMicroUsd,
    });
  }

  return {
    priceTableVersion: table.version,
    pagesText: text.length,
    pagesVision: vision.length,
    pagesSkipped: pages.length - text.length - vision.length,
    calls,
    totalMicroUsd: calls.reduce((s, c) => s + c.microUsd, 0),
  };
}
