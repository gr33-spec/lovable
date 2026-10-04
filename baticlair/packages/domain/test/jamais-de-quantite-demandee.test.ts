import { describe, expect, it } from "vitest";
import {
  applyLineRoles,
  artisanView,
  computeWithAnswers,
  planQuote,
  proposeLineRoles,
  purchaseView,
  reviewExtractedTakeoff,
  ROOFING_REFERENTIAL,
  slotsGivenByQuote,
  tradeProfile,
  validateTakeoff,
  type EngineAnswer,
  type LineRole,
  type PurchaseView,
} from "../src/index.js";
import { HABITUDES_BANC } from "./support/habitudes.js";
import { ARDOISES_LUCARNES_LINES } from "./devis-reels/ardoises-lucarnes.js";
import type { BenchLine } from "./devis-reels/truth.js";

/**
 * RÈGLE DU FONDATEUR (2026-10-03) : l'app ne demande JAMAIS une quantité à l'artisan.
 * « Ardoises 30×22, 200 m², crochets compris » → ardoises, crochets, liteaux calculés avec
 * les hypothèses par défaut (pente 45°, zone 3), dites et modifiables. Si une donnée
 * manque vraiment : UNE question courte, avec des boutons de valeur.
 */
function read(bench: BenchLine[], answers: Record<string, EngineAnswer> = {}): PurchaseView {
  const profile = tradeProfile("roofing");
  const lines = bench.map((l) => ({ ref: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit }));
  const raw = validateTakeoff(lines.map((l) => ({ id: l.ref, designation: l.designation, quantityRaw: l.quantity, unitRaw: l.unit, source: "client_quote" as const })), profile);
  const plan = planQuote(lines, ROOFING_REFERENTIAL, profile);
  const proposals = proposeLineRoles(lines, plan, raw, ROOFING_REFERENTIAL);
  const roles = new Map<string, LineRole>([...proposals].map(([k, v]) => [k, v.role]));
  for (const [key, value] of Object.entries(answers)) if (key.startsWith("role:") && (value === "measure" || value === "purchase")) roles.set(key.slice(5), value);
  const asks = new Map([...proposals].filter(([id, p]) => p.ask && roles.get(id) === "undetermined").map(([k, p]) => [k, p.ask!]));
  const validation = applyLineRoles(raw, roles);
  const engine = computeWithAnswers(ROOFING_REFERENTIAL, plan, answers, HABITUDES_BANC, {}, slotsGivenByQuote(plan, validation));
  const view = artisanView(
    lines.map((l) => ({ id: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit, confirmed: false, enteredByArtisan: false })),
    validation,
    engine,
    { plan, roles, ref: ROOFING_REFERENTIAL, asks },
  );
  return purchaseView(view, engine, { plan, roles, ref: ROOFING_REFERENTIAL, validation });
}

const short = (d: string) => d.replace(/\s*\((?:fourniture\s*(?:&|et)\s*pose|f\.?\s*(?:&|et)\s*p\.?|fourniture)\)/gi, "").split(/\s[-–—]\s/)[0]!.trim();


const one = (designation: string, quantity: string | null, unit: string | null) => read([{ ref: "1", designation, quantity, unit } as unknown as BenchLine]);
const bought = (v: PurchaseView) => Object.fromEntries(v.toBuy.map((b) => [b.label, b.quantity]));
// Formule Cupa (§34), crochet 1 mm : 9 271 ardoises ; crochets = ardoises commandées × 1,02.
const COMPLETE = {
  "Ardoises naturelles Espagne 1er choix 30×22": "9 271 pièces",
  "Crochets d'ardoise inox standard, longueur 11 cm": "9 457 pièces",
  "Liteaux 18×40": "2 049 ml",
};

describe("jamais de quantité demandée à l'artisan", () => {
  it.each([
    ["Ardoises 30×22, 200 m², crochets compris", "200", "m2"],
    ["Couverture ardoises 30x22 crochets compris", "200", "m²"],
    ["Fourniture et pose ardoises 30x22 sur 200 m2", "1", "ens"],
    ["Couverture en ardoises 30 x 22, crochets compris, 200 m²", "1", "forfait"],
  ])("« %s » (%s %s) : tout est calculé, aucune question", (designation, quantity, unit) => {
    const v = one(designation, quantity, unit);
    expect(v.questions).toEqual([]);
    expect(bought(v)).toMatchObject(COMPLETE);
    // Hypothèses dites, en tête la pente (45°) et la zone (3).
    expect(v.assumptions.slice(0, 2).map((a) => [a.key, a.value, a.unit])).toEqual([
      ["param:pente", "45", "°"],
      ["param:zone", "III", "u"],
    ]);
    expect(v.canValidate).toBe(true);
  });

  it("autres formats du référentiel (§3) : 32×22 calculé comme 30×22", () => {
    expect(bought(one("Ardoises naturelles 32x22 pose au crochet", "200", "m²"))).toMatchObject({ "Ardoises naturelles Espagne 1er choix 32×22": "8 447 pièces", "Crochets d'ardoise inox standard, longueur 11 cm": "8 616 pièces" });
  });

  it("exemple du §3 (32×22, 45°, région III, rampant 6 m) : recouvrement 105 mm, au-delà du maximum Cupa (103 mm) → le devis fait foi, 8 840 ardoises en estimation, le 33×23 conseillé", () => {
    const v = read([{ ref: "1", designation: "Ardoises 32x22 crochets compris", quantity: "200", unit: "m2" } as unknown as BenchLine], {
      "param:longueur_rampant": { value: "6", unit: "m" },
    });
    // R = 95 + 10 = 105 mm ; formule Cupa : 200 / (0,1075 × 0,221) = 8 418,4 ; + 5 % = 8 839,3. Aucune question.
    expect(bought(v)["Ardoises naturelles Espagne 1er choix 32×22"]).toBe("8 840 pièces");
    expect(bought(v)["Crochets d'ardoise inox standard, longueur 12 cm"]).toBe("9 017 pièces");
    expect(v.questions.some((d) => d.question?.key === "product:ardoise")).toBe(false);
    // Le conseil (33×23, la plage Cupa la plus proche qui admet 105 mm) : une hypothèse à boutons, pas une question.
    const conseil = v.assumptions.find((a) => a.key === "product:ardoise")!;
    expect(conseil.value).toBe("Ardoises 32×22");
    expect(conseil.choices!.map((c) => c.label)).toEqual(["Ardoises 32×22 (devis)", "Ardoises 33×23 (conseillé)", "Ardoises 35×22", "Ardoises 35×25", "Ardoises 40×22"]);
    expect(v.canValidate).toBe(true);
  });

  it("surface vraiment absente (1 forfait, rien d'écrit) : UNE question, à boutons, jamais « quelle quantité ? »", () => {
    const v = one("Ardoises 30×22 crochets compris", "1", "forfait");
    expect(v.questions).toHaveLength(1);
    expect(v.questions[0]).toMatchObject({ text: "Surface du toit ?", question: { options: [{ label: "50 m²" }, { label: "100 m²" }, { label: "150 m²" }, { label: "200 m²" }] } });
    expect(JSON.stringify(v.questions)).not.toMatch(/quantit/i);
    // Réponse d'un geste → la liste complète.
    expect(bought(read([{ ref: "1", designation: "Ardoises 30×22 crochets compris", quantity: "1", unit: "forfait" } as unknown as BenchLine], { "param:surface": { value: "200", unit: "m2" } }))).toMatchObject(COMPLETE);
  });
});

/**
 * Capture du fondateur (2026-10-03) : la lecture IA avait mis un « doute » sur les liteaux
 * (« Quantité en m² : combien de mètres linéaires de liteaux ? ») et sur d'autres lignes : 7 questions.
 * Les doutes de CALCUL sont désormais ignorés ; restent les deux vraies questions du devis.
 */
describe("doutes de calcul de l'IA : jamais posés à l'artisan", () => {
  const DOUBTS: Record<string, string> = {
    "ligne 1": "Quantité en m² : combien de mètres linéaires de liteaux ?",
    "ligne 2": "Surface en m² : combien d'ardoises à commander ?",
    "ligne 3": "Combien de ml de gouttière et de descentes ?",
    "ligne 4": "Quantité en mètres : combien de faîtières ?",
    "ligne 7": "Combien de chatières par paquet ?",
  };
  function readWithDoubts(answers: Record<string, EngineAnswer> = {}): PurchaseView {
    const profile = tradeProfile("roofing");
    const lines = ARDOISES_LUCARNES_LINES.map((l) => ({ ref: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit }));
    const { validation: raw } = reviewExtractedTakeoff(
      lines.map((l) => ({ id: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit, reference: null, sourceRefs: [], sourcePages: [1], aiDoubt: DOUBTS[l.ref] ?? null })),
      new Map(),
      profile,
    );
    const plan = planQuote(lines, ROOFING_REFERENTIAL, profile);
    const proposals = proposeLineRoles(lines, plan, raw, ROOFING_REFERENTIAL);
    const roles = new Map<string, LineRole>([...proposals].map(([k, v]) => [k, v.role]));
    for (const [key, value] of Object.entries(answers)) if (key.startsWith("role:") && (value === "measure" || value === "purchase")) roles.set(key.slice(5), value);
    const asks = new Map([...proposals].filter(([id, p]) => p.ask && roles.get(id) === "undetermined").map(([k, p]) => [k, p.ask!]));
    const validation = applyLineRoles(raw, roles);
    const engine = computeWithAnswers(ROOFING_REFERENTIAL, plan, answers, HABITUDES_BANC, {}, slotsGivenByQuote(plan, validation));
    const view = artisanView(
      lines.map((l) => ({ id: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit, confirmed: false, enteredByArtisan: false })),
      validation,
      engine,
      { plan, roles, ref: ROOFING_REFERENTIAL, asks },
    );
    return purchaseView(view, engine, { plan, roles, ref: ROOFING_REFERENTIAL, validation });
  }

  it("le devis ardoises du fondateur, doutes de l'IA compris : les questions du comptoir (façonnage, développé, périmètre de cheminée, descentes et leur Ø, 6 jouées ?), aucune de quantité", () => {
    const v = readWithDoubts();
    expect(v.questions.map((q) => q.key).sort()).toEqual([
      "engine:param:developpe",
      "engine:param:diametre_descente",
      "engine:param:faconnage",
      "engine:param:nb_descentes",
      "engine:param:perimetre_cheminee",
      "role:ligne 5",
    ]);
    expect(JSON.stringify(v.questions)).not.toMatch(/linéaires|combien d'ardoises|faîtières/);
    // Les liteaux sont calculés en mètres linéaires par BatiClair, pas demandés.
    expect(bought(v)).toMatchObject({ "Liteaux 18×40": "2 049 ml", "Ardoises naturelles Espagne 1er choix 30×22": "9 271 pièces" });
  });
});
