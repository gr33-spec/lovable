import { describe, expect, it } from "vitest";
import {
  applyLineRoles,
  artisanView,
  computeWithAnswers,
  planQuote,
  proposeLineRoles,
  ROOFING_REFERENTIAL,
  slotsGivenByQuote,
  tradeProfile,
  validateTakeoff,
  type EngineAnswer,
  type LineRole,
} from "../src/index.js";

/**
 * COUVREUR — ARDOISES ET OUVRAGES COMPTÉS (2026-10-02). Deux risques réels
 * relevés par le fondateur sur un devis d'ardoises :
 *  - « Ardoises pour jouées de lucarnes — 6 unités » partait comme 6 ardoises ;
 *  - « Entourage de cheminée zinc et solin — 2 unités » partait comme 2 articles ;
 * et aucune quantité n'était proposée pour la couverture en ardoises.
 * Règles générales (vocabulaire du référentiel), jamais une correction d'un devis.
 */
const LINES = [
  { ref: "a1", designation: "Couverture en ardoises naturelles 30x22 posées au crochet", quantity: "200", unit: "m²" },
  { ref: "a2", designation: "Liteaux bois pour ardoises", quantity: "200", unit: "m²" },
  { ref: "a3", designation: "Ardoises pour jouées de lucarnes", quantity: "6", unit: "unités" },
  { ref: "a4", designation: "Entourage de cheminée zinc et solin", quantity: "2", unit: "unités" },
  { ref: "a5", designation: "Chatières de ventilation", quantity: "12", unit: "unités" },
];

function read(answers: Record<string, EngineAnswer> = {}, acceptDraft = false) {
  const profile = tradeProfile("roofing");
  const raw = validateTakeoff(LINES.map((l) => ({ id: l.ref, designation: l.designation, quantityRaw: l.quantity, unitRaw: l.unit, source: "client_quote" as const })), profile);
  const plan = planQuote(LINES.map((l) => ({ ...l })), ROOFING_REFERENTIAL, profile);
  const proposals = proposeLineRoles(LINES.map((l) => ({ ref: l.ref, designation: l.designation })), plan, raw, ROOFING_REFERENTIAL);
  const roles = new Map<string, LineRole>([...proposals].map(([k, v]) => [k, v.role]));
  for (const [key, value] of Object.entries(answers)) {
    if (key.startsWith("role:") && (value === "measure" || value === "purchase")) roles.set(key.slice(5), value);
  }
  const asks = new Map([...proposals].filter(([, p]) => p.ask).map(([k, p]) => [k, p.ask!]));
  const validation = applyLineRoles(raw, roles);
  const engine = computeWithAnswers(ROOFING_REFERENTIAL, plan, answers, {}, { acceptDraft }, slotsGivenByQuote(plan, validation));
  const view = artisanView(
    LINES.map((l) => ({ id: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit, confirmed: false, enteredByArtisan: false })),
    validation,
    engine,
    { plan, roles, ref: ROOFING_REFERENTIAL, asks },
  );
  return { proposals, view, ouvrage: (ref: string) => view.ouvrages.find((o) => o.lineId === ref)! };
}

describe("ouvrages comptés : jamais un nombre d'articles", () => {
  it("« Entourage de cheminée … 2 unités » = 2 ouvrages, jamais 2 articles à commander", () => {
    const { proposals, ouvrage, view } = read();
    expect(proposals.get("a4")).toMatchObject({ role: "measure" });
    expect(ouvrage("a4").direct).toBeNull();
    expect(view.items.find((i) => i.id === "a4")!.state).not.toBe("verified");
  });

  it("« Ardoises pour jouées de lucarnes … 6 unités » : 6 ardoises ou 6 jouées ? UNE question, pas de ✓", () => {
    const { proposals, view } = read();
    expect(proposals.get("a3")).toMatchObject({ role: "undetermined" });
    const decision = view.decisions.find((d) => d.key === "role:a3")!;
    expect(decision.question).toMatchObject({ kind: "choose" });
    expect(decision.question!.options!.map((o) => o.value)).toEqual(["purchase", "measure"]);
    expect(decision.question!.options!.map((o) => o.label)).toEqual(["6 ardoises à commander", "6 jouées (matériaux à calculer)"]);
    expect(view.items.find((i) => i.id === "a3")!.state).toBe("to_confirm");
  });

  it("la réponse de l'artisan tranche : « ce sont des jouées » → mesure ; « des ardoises » → à commander", () => {
    const asJouees = read({ "role:a3": "measure" });
    expect(asJouees.view.decisions.some((d) => d.key === "role:a3")).toBe(false);
    expect(asJouees.ouvrage("a3").direct).toBeNull();
    const asArdoises = read({ "role:a3": "purchase" });
    expect(asArdoises.ouvrage("a3").direct).toEqual({ quantity: "6", unit: "unités" });
  });

  it("une vraie quantité d'articles reste à commander telle quelle (chatières)", () => {
    expect(read().ouvrage("a5")).toMatchObject({ role: "purchase", direct: { quantity: "12", unit: "unités" } });
  });
});

describe("couverture en ardoises au crochet : chaque composant détaillé", () => {
  it("ardoises, crochets d'ardoise, liteaux (18×40 d'usage, à confirmer) : visibles même avant tout calcul", () => {
    const { ouvrage } = read();
    const couverture = ouvrage("a1");
    expect(couverture.role).toBe("measure");
    expect(couverture.needs.map((n) => n.slot)).toEqual(expect.arrayContaining(["ardoise", "crochet"]));
    const liteaux = ouvrage("a2").needs.find((n) => n.slot === "liteau")!;
    expect(liteaux.usual).toMatch(/18×40.*à confirmer/);
    // Règles en brouillon : rien n'est calculé pour l'artisan, rien n'est ✓.
    for (const o of [couverture, ouvrage("a2")]) for (const n of o.needs) expect(n).toMatchObject({ need: null, provisional: false });
  });

  it("mode validateur : quantités provisoires visibles, jamais ✓ (pureau donné pour l'exemple)", () => {
    const { ouvrage } = read({ "param:pureau": { value: "11", unit: "cm" } }, true);
    const ardoises = ouvrage("a1").needs.find((n) => n.slot === "ardoise")!;
    const crochets = ouvrage("a1").needs.find((n) => n.slot === "crochet")!;
    const liteaux = ouvrage("a2").needs.find((n) => n.slot === "liteau")!;
    // 200 / (0,22 × 0,11) = 8 264,46 ardoises ; un crochet par ardoise (hypothèse à valider) ; 200 / 0,11 = 1 818,18 m.
    expect(ardoises.need).toEqual({ value: "8264.46", unit: "u" });
    expect(crochets.need).toEqual({ value: "8264.46", unit: "u" });
    expect(liteaux.need).toEqual({ value: "1818.18", unit: "ml" });
    for (const n of [ardoises, crochets, liteaux]) expect(n).toMatchObject({ provisional: true });
    for (const n of [ardoises, crochets, liteaux]) expect(n.state).not.toBe("verified");
  });
});
