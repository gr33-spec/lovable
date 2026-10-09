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
  supplyLines,
  tradeProfile,
  validateTakeoff,
  type EngineAnswer,
  type LineRole,
  type CompanyPreferences,
  type PurchaseView,
  type SiteFact,
  type EngineOptions,
  type QuoteLineReading,
} from "../../src/index.js";
import { HABITUDES_BANC } from "./habitudes.js";

export interface QuoteLineInput {
  ref: string;
  designation: string;
  quantity: string | null;
  unit: string | null;
}

/** Tout le parcours d'un devis de couvreur jusqu'à la liste d'achats, comme le fait l'API (sans IA). */
export function readQuote(
  bench: readonly QuoteLineInput[],
  answers: Record<string, EngineAnswer> = {},
  extraFacts: readonly SiteFact[] = [],
  preferences: CompanyPreferences = HABITUDES_BANC,
  options: EngineOptions = {},
  /** La lecture §41.1 de chaque ligne (son « manque », §49.4), comme l'IA la rend. */
  readings?: ReadonlyMap<string, QuoteLineReading>,
): PurchaseView {
  const profile = tradeProfile("roofing");
  // §49.9 : une prestation est remplacée par la fourniture qu'elle contient (les articles de sa lecture), comme à l'enregistrement.
  // Une ligne hors quantitatif (§41.1 : accès, évacuation, nettoyage) n'entre pas au calcul.
  const supplied = supplyLines(bench.filter((l) => readings?.get(l.ref)?.role !== "hors_quantitatif"), readings);
  readings = readings ? supplied.readings : undefined;
  const lines = supplied.lines.map((l) => ({ ref: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit }));
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
  return applyPurchaseOverrides(purchaseView(view, engine, { plan, roles, ref: ROOFING_REFERENTIAL, validation, ...(readings ? { readings } : {}) }), answers);
}
