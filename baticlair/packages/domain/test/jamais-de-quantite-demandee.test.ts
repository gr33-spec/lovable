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
  const engine = computeWithAnswers(ROOFING_REFERENTIAL, plan, answers, {}, {}, slotsGivenByQuote(plan, validation));
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
  "Ardoises 30×22": "9 271 pièces",
  "Crochets d'ardoise": "9 457 pièces",
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
    expect(bought(one("Ardoises naturelles 32x22 pose au crochet", "200", "m²"))).toMatchObject({ "Ardoises 32×22": "8 447 pièces", "Crochets d'ardoise": "8 616 pièces" });
  });

  it("exemple du §3 (32×22, 45°, région III, rampant 6 m) : recouvrement 105 mm, au-delà du maximum Cupa (103 mm) → format non admis, le voisin proposé", () => {
    const v = read([{ ref: "1", designation: "Ardoises 32x22 crochets compris", quantity: "200", unit: "m2" } as unknown as BenchLine], {
      "param:longueur_rampant": { value: "6", unit: "m" },
    });
    // R = 95 + 10 = 105 mm ; la table Cupa (§34) admet le 32×22 de 69 à 103 mm : « proposer le format voisin ».
    expect(bought(v)["Ardoises 32×22"]).toBeUndefined();
    const q = v.questions.find((d) => d.question?.key === "product:ardoise")!;
    expect(q.question!.text).toMatch(/^Ardoises 32×22 non admis ici : recouvrement posé 105 mm, au-delà du maximum de 103 mm pour ce format \(Cupa Pizarras\)\. Quel format \?$/);
    expect(q.question!.options!.map((o) => o.label)).toEqual(["Ardoises 33×23 (conseillé)", "Ardoises 35×22", "Ardoises 35×25", "Ardoises 40×22"]);
    expect(q.question!.text).not.toMatch(/quelle quantité/i);
    // L'artisan prend le 33×23 conseillé : tout se calcule (table Cupa : pas de ligne à 105, formule hors table).
    const after = read([{ ref: "1", designation: "Ardoises 32x22 crochets compris", quantity: "200", unit: "m2" } as unknown as BenchLine], {
      "param:longueur_rampant": { value: "6", unit: "m" },
      "product:ardoise": "ardoise-33x23",
    });
    expect(after.questions.some((d) => d.question?.key === "product:ardoise")).toBe(false);
    expect(bought(after)["Ardoises 33×23"]).toMatch(/^\d[\d ]* pièces$/);
    expect(Number(bought(after)["Crochets d'ardoise"]!.replace(/\D/g, ""))).toBeGreaterThanOrEqual(Number(bought(after)["Ardoises 33×23"]!.replace(/\D/g, "")));
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
    const engine = computeWithAnswers(ROOFING_REFERENTIAL, plan, answers, {}, {}, slotsGivenByQuote(plan, validation));
    const view = artisanView(
      lines.map((l) => ({ id: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit, confirmed: false, enteredByArtisan: false })),
      validation,
      engine,
      { plan, roles, ref: ROOFING_REFERENTIAL, asks },
    );
    return purchaseView(view, engine, { plan, roles, ref: ROOFING_REFERENTIAL, validation });
  }

  it("le devis ardoises du fondateur, doutes de l'IA compris : 2 questions seulement, aucune de quantité", () => {
    const v = readWithDoubts();
    expect(v.questions.map((q) => q.key).sort()).toEqual(["engine:param:nb_descentes", "role:ligne 5"]);
    expect(JSON.stringify(v.questions)).not.toMatch(/linéaires|combien d'ardoises|faîtières/);
    // Les liteaux sont calculés en mètres linéaires par BatiClair, pas demandés.
    expect(bought(v)).toMatchObject({ "Liteaux 18×40": "2 049 ml", "Ardoises 30×22": "9 271 pièces" });
  });
});
