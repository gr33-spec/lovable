import { describe, expect, it } from "vitest";
import { applyLineRoles, artisanView, checkReferential, computeWithAnswers, planQuote, PLATRERIE_REFERENTIAL, proposeLineRoles, purchaseView, slotsGivenByQuote, tradeProfile, validateTakeoff, type EngineAnswer, type LineRole, type Referential } from "../src/index.js";

/**
 * PLÂTRERIE MINIMALE (plan v3 §4.4) : une cloison 72/48 calculée par le MÊME moteur que la couverture, sans qu'une
 * ligne de moteur change. Les règles sourcées (§16 : plaques, vis, bande, enduit) sortent telles quelles ; les
 * chiffres d'usage non validés (rails, montants, hauteur) restent en brouillon, visibles du seul validateur.
 */
const LINES = [{ ref: "c1", designation: "Cloison 72/48 BA13 sur ossature métallique", quantity: "20", unit: "m²" }];

function read(acceptDraft: boolean, ref: Referential = PLATRERIE_REFERENTIAL, answers: Record<string, EngineAnswer> = {}) {
  const profile = tradeProfile("drywall");
  const raw = validateTakeoff(LINES.map((l) => ({ id: l.ref, designation: l.designation, quantityRaw: l.quantity, unitRaw: l.unit, source: "client_quote" as const })), profile);
  const plan = planQuote(LINES, ref, profile);
  const proposals = proposeLineRoles(LINES, plan, raw, ref);
  const roles = new Map<string, LineRole>([...proposals].map(([k, v]) => [k, v.role]));
  const validation = applyLineRoles(raw, roles);
  const engine = computeWithAnswers(ref, plan, answers, {}, { acceptDraft }, slotsGivenByQuote(plan, validation));
  const view = artisanView(LINES.map((l) => ({ id: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit, confirmed: false, enteredByArtisan: false })), validation, engine, { plan, roles, ref, asks: new Map() });
  return { plan, engine, purchase: purchaseView(view, engine, { plan, roles, ref, validation }) };
}

describe("référentiel plâtrerie : cohérent et chargé comme la couverture", () => {
  it("passe le contrôle d'intégrité", () => {
    expect(checkReferential(PLATRERIE_REFERENTIAL)).toEqual([]);
  });

  it("20 m² de cloison 72/48 : 15 plaques BA13 (20 × 2 × 1,10 / 3) ; la ligne est une mesure, jamais 20 plaques ; vis, bande, enduit seulement sur le « oui » consommables (§49.1)", () => {
    const { plan, purchase } = read(false);
    expect(plan.lines[0]).toMatchObject({ status: "planned", workItemId: "cloison-72-48", slot: "cloison" });
    const bought = Object.fromEntries(purchase.toBuy.map((b) => [b.needIds[0], b.quantity]));
    expect(bought).toEqual({ plaques: "15 plaques" });
    expect(purchase.toBuy.some((b) => b.label.startsWith("Cloison"))).toBe(false);
    // §49.4 : la seule question, celle des consommables (rails et montants : pas écrits comme articles, chiffres d'usage).
    expect(purchase.questions.map((q) => q.question?.key)).toEqual(["param:consommables"]);
    const oui = read(false, PLATRERIE_REFERENTIAL, { "param:consommables": { value: "1", unit: "u" } }).purchase;
    const avec = Object.fromEntries(oui.toBuy.map((b) => [b.needIds[0], b.quantity]));
    expect(avec).toEqual({ plaques: "15 plaques", vis: "600 vis", bande: "80 ml", enduit: "16 kg" });
    expect(oui.toBuy.filter((b) => b.consumable).map((b) => b.needIds[0])).toEqual(["vis", "bande", "enduit"]);
  });

  it("en mode validateur du référentiel, rails et montants se calculent (hauteur 2,5 m, entraxe 60 cm) et sont marqués provisoires", () => {
    const { engine, purchase } = read(true, { ...PLATRERIE_REFERENTIAL, writtenOnly: false });
    const bought = Object.fromEntries(purchase.toBuy.map((b) => [b.needIds[0], b.quantity]));
    // 20 m² / 2,5 m = 8 m de cloison : rails 16 ml (6 longueurs de 3 m) ; montants 8 / 0,6 = 13,3 → 14 + 1 = 15.
    expect(bought).toMatchObject({ rails: "6 longueurs de 3 m", montants: "15 pièces" });
    expect(engine.needs.find((n) => n.needId === "rails")?.provisional).toBe(true);
    expect(engine.needs.find((n) => n.needId === "plaques")?.provisional).toBe(false);
  });
});
