import {
  applyLineRoles,
  applyPurchaseOverrides,
  applyRuleConfirmations,
  artisanView,
  computeWithAnswers,
  planQuote,
  proposeLineRoles,
  purchaseView,
  slotsGivenByQuote,
  tradeProfile,
  validateTakeoff,
  type EngineAnswer,
  type LineRole,
  type PurchaseView,
  type Referential,
} from "../../src/index.js";
import type { QuoteLineInput } from "./read-quote.js";

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
  const profile = tradeProfile(ref.trade);
  const lines = bench.map((l) => ({
    ref: l.ref,
    designation: l.designation,
    quantity: l.quantity,
    unit: l.unit,
  }));
  const raw = validateTakeoff(
    lines.map((l) => ({
      id: l.ref,
      designation: l.designation,
      quantityRaw: l.quantity,
      unitRaw: l.unit,
      source: "client_quote" as const,
    })),
    profile,
  );
  const plan = planQuote(lines, ref, profile);
  const proposals = proposeLineRoles(lines, plan, raw, ref);
  const roles = new Map<string, LineRole>([...proposals].map(([k, v]) => [k, v.role]));
  const asks = new Map([...proposals].filter(([id, p]) => p.ask && roles.get(id) === "undetermined").map(([k, p]) => [k, p.ask!]));
  const validation = applyLineRoles(raw, roles);
  const engine = computeWithAnswers(ref, plan, answers, {}, { acceptDraft: true }, slotsGivenByQuote(plan, validation));
  const view = artisanView(
    lines.map((l) => ({
      id: l.ref,
      designation: l.designation,
      quantity: l.quantity,
      unit: l.unit,
      confirmed: false,
      enteredByArtisan: false,
    })),
    validation,
    engine,
    { plan, roles, ref, asks },
  );
  return applyRuleConfirmations(applyPurchaseOverrides(purchaseView(view, engine, { plan, roles, ref, validation }), answers), answers, validated);
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
