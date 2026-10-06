import {
  applyLineRoles,
  artisanView,
  computeWithAnswers,
  planQuote,
  proposeLineRoles,
  purchaseView,
  applyPurchaseOverrides,
  ROOFING_REFERENTIAL,
  slotsGivenByQuote,
  tradeProfile,
  validateTakeoff,
  type EngineAnswer,
  type LineRole,
  type CompanyPreferences,
  type PurchaseView,
  type SiteFact,
  type EngineOptions,
} from "../../src/index.js";
import { HABITUDES_BANC } from "./habitudes.js";

export interface QuoteLineInput {
  ref: string;
  designation: string;
  quantity: string | null;
  unit: string | null;
}

/** Tout le parcours d'un devis de couvreur jusqu'à la liste d'achats, comme le fait l'API (sans IA). */
export function readQuote(bench: readonly QuoteLineInput[], answers: Record<string, EngineAnswer> = {}, extraFacts: readonly SiteFact[] = [], preferences: CompanyPreferences = HABITUDES_BANC, options: EngineOptions = {}): PurchaseView {
  const profile = tradeProfile("roofing");
  const lines = bench.map((l) => ({ ref: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit }));
  const raw = validateTakeoff(lines.map((l) => ({ id: l.ref, designation: l.designation, quantityRaw: l.quantity, unitRaw: l.unit, source: "client_quote" as const })), profile);
  const plan = planQuote(lines, ROOFING_REFERENTIAL, profile, undefined, extraFacts);
  const proposals = proposeLineRoles(lines, plan, raw, ROOFING_REFERENTIAL);
  const roles = new Map<string, LineRole>([...proposals].map(([k, v]) => [k, v.role]));
  for (const [key, value] of Object.entries(answers)) if (key.startsWith("role:") && (value === "measure" || value === "purchase")) roles.set(key.slice(5), value);
  const asks = new Map([...proposals].filter(([id, p]) => p.ask && roles.get(id) === "undetermined").map(([k, p]) => [k, p.ask!]));
  const validation = applyLineRoles(raw, roles);
  const engine = computeWithAnswers(ROOFING_REFERENTIAL, plan, answers, preferences, options, slotsGivenByQuote(plan, validation));
  const view = artisanView(
    lines.map((l) => ({ id: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit, confirmed: false, enteredByArtisan: false })),
    validation,
    engine,
    { plan, roles, ref: ROOFING_REFERENTIAL, asks },
  );
  return applyPurchaseOverrides(purchaseView(view, engine, { plan, roles, ref: ROOFING_REFERENTIAL, validation }), answers);
}
