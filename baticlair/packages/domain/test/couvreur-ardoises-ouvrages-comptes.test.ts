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
import { HABITUDES_BANC } from "./support/habitudes.js";

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

function read(answers: Record<string, EngineAnswer> = {}, acceptDraft = false, lines: typeof LINES = LINES) {
  const profile = tradeProfile("roofing");
  const raw = validateTakeoff(lines.map((l) => ({ id: l.ref, designation: l.designation, quantityRaw: l.quantity, unitRaw: l.unit, source: "client_quote" as const })), profile);
  const plan = planQuote(lines.map((l) => ({ ...l })), ROOFING_REFERENTIAL, profile);
  const proposals = proposeLineRoles(lines.map((l) => ({ ref: l.ref, designation: l.designation })), plan, raw, ROOFING_REFERENTIAL);
  const roles = new Map<string, LineRole>([...proposals].map(([k, v]) => [k, v.role]));
  for (const [key, value] of Object.entries(answers)) {
    if (key.startsWith("role:") && (value === "measure" || value === "purchase")) roles.set(key.slice(5), value);
  }
  const asks = new Map([...proposals].filter(([, p]) => p.ask).map(([k, p]) => [k, p.ask!]));
  const validation = applyLineRoles(raw, roles);
  const engine = computeWithAnswers(ROOFING_REFERENTIAL, plan, answers, HABITUDES_BANC, { acceptDraft }, slotsGivenByQuote(plan, validation));
  const view = artisanView(
    lines.map((l) => ({ id: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit, confirmed: false, enteredByArtisan: false })),
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
  it("dès l'ouverture, sans rien demander : ardoises, crochets et liteaux 18×40 calculés avec les hypothèses du référentiel, dites", () => {
    const { ouvrage } = read();
    const couverture = ouvrage("a1");
    expect(couverture.role).toBe("measure");
    const ardoises = couverture.needs.find((n) => n.slot === "ardoise")!;
    const crochets = couverture.needs.find((n) => n.slot === "crochet")!;
    const liteaux = ouvrage("a2").needs.find((n) => n.slot === "liteau")!;
    // Pente 45°, zone 3, rampant ≤ 5,5 m → recouvrement 95 mm → pureau (300 − 95) / 2 = 102,5 mm.
    // Formule Cupa (§34), crochet 1 mm : 200 / (0,1025 × 0,221) = 8 829,05 ardoises + 5 % = 9 270,50, soit 9 271 commandées ;
    // crochets = 9 271 × 1,02 = 9 456,42 ; 200 / 0,1025 = 1 951,22 ml + 5 % = 2 048,78 ml.
    expect(ardoises.need).toEqual({ value: "9270.5", unit: "u" });
    expect(crochets.need).toEqual({ value: "9456.42", unit: "u" });
    expect(liteaux.need).toEqual({ value: "2048.78", unit: "ml" });
    expect(ardoises.assumptions.map((a) => `${a.key}=${a.value}`)).toEqual(["param:pente=45", "param:zone=III", "param:longueur_rampant=5,5", "derived:recouvrement=95", "param:pureau=10,25", "param:diametre_crochet=standard"]);
    // Le devis ne précise pas la section : 18×40 par défaut, dit comme hypothèse (modifiable).
    expect(liteaux.label).toBe("Liteaux 18×40");
    expect(liteaux.assumptions).toContainEqual(expect.objectContaining({ key: "product:liteau", value: "Liteaux 18×40", note: expect.stringMatching(/18×40 par défaut/) }));
    for (const n of [ardoises, crochets, liteaux]) expect(n).toMatchObject({ provisional: false, state: "verified" });
  });

  it("pureau donné par l'artisan : il remplace l'hypothèse, les pertes restent", () => {
    const { ouvrage } = read({ "param:pureau": { value: "11", unit: "cm" } });
    const ardoises = ouvrage("a1").needs.find((n) => n.slot === "ardoise")!;
    const crochets = ouvrage("a1").needs.find((n) => n.slot === "crochet")!;
    const liteaux = ouvrage("a2").needs.find((n) => n.slot === "liteau")!;
    // Pureau 110 mm sur 30×22 = recouvrement posé 80 mm : ligne de la table Cupa (40,7/m²) → 8 140 + 5 % = 8 547 ;
    // crochets 8 547 × 1,02 = 8 717,94 ; 200 / 0,11 = 1 818,18 ml + 5 % = 1 909,09.
    expect(ardoises.need).toEqual({ value: "8547", unit: "u" });
    expect(crochets.need).toEqual({ value: "8717.94", unit: "u" });
    expect(liteaux.need).toEqual({ value: "1909.09", unit: "ml" });
    expect(ardoises.assumptions.some((a) => a.key === "param:pureau" || a.key === "derived:recouvrement")).toBe(false);
    for (const n of [ardoises, crochets, liteaux]) expect(n).toMatchObject({ provisional: false });
  });

  it("le devis nomme une autre section de liteau : elle l'emporte, plus de « 18×40 par défaut »", () => {
    const lines = LINES.map((l) => (l.ref === "a2" ? { ...l, designation: "Liteaux sapin 27x40 pour ardoises" } : l));
    const liteaux = read({}, false, lines).ouvrage("a2").needs.find((n) => n.slot === "liteau")!;
    expect(liteaux.label).toBe("Liteaux 27×40");
    expect(liteaux.usual).toBeNull();
  });
});

describe("un crochet d'ardoise n'est jamais une ardoise", () => {
  // Cas réel (devis de démonstration, 2026-10-02) : un devis de TUILES qui achète « Crochet inox ardoise 100 mm — 2 paquets ».
  const TUILES = [
    { ref: "t1", designation: "Fourniture et pose tuile romane canal rouge 12,5 u/m² (réf. TUI-RC12)", quantity: "1 250", unit: "u" },
    { ref: "t2", designation: "Crochet inox ardoise 100 mm", quantity: "2", unit: "paquet" },
  ];
  const familyOf = (designation: string) => {
    const p = planQuote([{ ref: "x", designation, quantity: "10", unit: "u" }], ROOFING_REFERENTIAL, tradeProfile("roofing")).lines[0]!;
    if (p.status === "not_material") return null;
    if (p.status === "not_covered") return p.family;
    return ROOFING_REFERENTIAL.workItems.find((w) => w.id === p.workItemId)!.slots.find((s) => s.key === p.slot)!.family;
  };

  it("« Crochet inox ardoise » est lu comme un crochet ; aucune question sur des ardoises que le devis n'a pas", () => {
    expect(familyOf(TUILES[1]!.designation)).toBe("slate_hook");
    const { view } = read({}, false, TUILES);
    expect(view.decisions.map((d) => d.key)).not.toContain("product:ardoise");
    expect(view.ouvrages.flatMap((o) => o.needs).some((n) => n.slot === "ardoise")).toBe(false);
  });

  it("le vocabulaire reste juste : « Crochets d'ardoise », « crochet pour ardoise » → crochet ; « crochet de gouttière » → gouttière", () => {
    expect(familyOf("Crochets d'ardoise inox")).toBe("slate_hook");
    expect(familyOf("Crochet pour ardoise 90 mm")).toBe("slate_hook");
    expect(familyOf("Crochet de gouttière zinc")).toBe("gutter_hook");
    expect(familyOf("Ardoises naturelles 30x22")).toBe("roof_slate");
  });
});
