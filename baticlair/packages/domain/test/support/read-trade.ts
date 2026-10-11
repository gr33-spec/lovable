import { ecranDeLecture, type EngineAnswer, type PurchaseView, type Referential } from "../../src/index.js";
import type { QuoteLineInput } from "./read-quote.js";
import { lectureEnregistree } from "./lectures.js";

/**
 * Tout le parcours d'un devis d'un métier quelconque jusqu'à la liste des fournitures, comme l'API (sans IA) : règles
 * « à vérifier » comprises (§47.1, pas de mode brouillon), confirmations de règles appliquées (§47.3).
 */
export function readTradeQuote(
  ref: Referential,
  bench: readonly QuoteLineInput[],
  answers: Record<string, EngineAnswer> = {},
  validated: ReadonlySet<string> = new Set(),
): PurchaseView {
  const lecture = lectureEnregistree(ref, bench, [], {}, { acceptDraft: true }, undefined, answers);
  return ecranDeLecture({ ref, lecture, answers, options: { acceptDraft: true }, validated, interdits: false }).purchase;
}

/** Les couleurs de la liste (§46) : vert, orange, gris. */
export function colours(p: PurchaseView): {
  vert: number;
  orange: number;
  gris: number;
} {
  const rows = p.screen.groups.flatMap((g) => g.rows);
  return {
    vert: rows.filter((r) => r.status === "ok").length,
    orange: rows.filter((r) => r.status === "check").length,
    gris: rows.filter((r) => r.status === "supplier").length,
  };
}
