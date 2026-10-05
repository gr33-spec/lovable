import { describe, expect, it } from "vitest";
import {
  applyLineRoles,
  artisanView,
  computeWithAnswers,
  planQuote,
  proposeLineRoles,
  purchaseView,
  ROOFING_REFERENTIAL,
  slotsGivenByQuote,
  tradeProfile,
  validateTakeoff,
  type LineRole,
} from "../src/index.js";
import { HABITUDES_BANC } from "./support/habitudes.js";
import { ARDOISES_LUCARNES_LINES } from "./devis-reels/ardoises-lucarnes.js";

/**
 * UNE MESURE DOUTEUSE N'EST JAMAIS UN ARTICLE (retour du fondateur, 2026-10-05, devis ardoises 200 m² lu sur une
 * capture : « pourquoi j'ai plusieurs fois les liteaux ? On met en ml, jamais en m² »). Quand l'IA hésite sur une ligne
 * qui est la MESURE d'un ouvrage (« Liteaux bois pour ardoises 200 m² »), la ligne orange dit « Mesure lue dans le
 * devis · 200 m² » sous l'ouvrage ; elle ne reprend jamais le nom d'un article déjà calculé dans son unité.
 */
function screenWithDoubts(doubtful: readonly string[]) {
  const profile = tradeProfile("roofing");
  const lines = ARDOISES_LUCARNES_LINES.map((l) => ({ ref: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit }));
  const raw = validateTakeoff(lines.map((l) => ({ id: l.ref, designation: l.designation, quantityRaw: l.quantity, unitRaw: l.unit, source: "client_quote" as const })), profile);
  // Ce que l'IA écrit sur une capture d'écran difficile à lire.
  const withDoubts = {
    ...raw,
    lines: raw.lines.map((v) => (doubtful.includes(v.lineId) ? { ...v, issues: [...v.issues, { code: "AI_DOUBT" as const, severity: "to_verify" as const, message: "L'IA hésite : chiffre peu lisible." }] } : v)),
  };
  const plan = planQuote(lines, ROOFING_REFERENTIAL, profile);
  const proposals = proposeLineRoles(lines, plan, withDoubts, ROOFING_REFERENTIAL);
  const roles = new Map<string, LineRole>([...proposals].map(([k, v]) => [k, v.role]));
  const validation = applyLineRoles(withDoubts, roles);
  const engine = computeWithAnswers(ROOFING_REFERENTIAL, plan, {}, HABITUDES_BANC, {}, slotsGivenByQuote(plan, validation));
  const view = artisanView(
    lines.map((l) => ({ id: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit, confirmed: false, enteredByArtisan: false })),
    validation,
    engine,
    { plan, roles, ref: ROOFING_REFERENTIAL },
  );
  return purchaseView(view, engine, { plan, roles, ref: ROOFING_REFERENTIAL, validation });
}

describe("une mesure douteuse n'est jamais un article", () => {
  it("« Liteaux bois pour ardoises 200 m² » mal lu : une ligne « Mesure lue dans le devis · 200 m² », les liteaux restent en ml", () => {
    const p = screenWithDoubts(["ligne 1", "ligne 4"]);
    const rows = p.screen.groups.flatMap((g) => g.rows.map((r) => ({ group: g.label, ...r })));
    const pending = rows.filter((r) => r.pending);
    // Aucune ligne orange ne reprend le nom de la ligne du devis avec sa mesure.
    expect(pending.map((r) => r.pending!.label)).not.toContain("Liteaux bois pour ardoises");
    expect(pending.map((r) => r.pending!.label)).not.toContain("Faîtage zinc");
    const liteaux = pending.find((r) => r.lineIds.includes("ligne 1"))!;
    expect(liteaux.pending).toEqual({ label: "Mesure lue dans le devis", quantity: "200 m²" });
    // Les liteaux calculés : en ml, jamais en m².
    const battens = p.toBuy.filter((b) => /liteau/i.test(b.label));
    expect(battens.length).toBeGreaterThan(0);
    for (const b of battens) expect(b.quantity).toMatch(/ml$/);
  });
});
