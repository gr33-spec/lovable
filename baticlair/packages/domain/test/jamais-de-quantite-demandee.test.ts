import { describe, expect, it } from "vitest";
import type { EngineAnswer, PurchaseView } from "../src/index.js";
import { readQuote } from "./support/read-quote.js";
import { ARDOISES_LUCARNES_LINES } from "./devis-reels/ardoises-lucarnes.js";
import type { BenchLine } from "./devis-reels/truth.js";

/**
 * RÈGLE DU FONDATEUR (2026-10-03) : l'app ne demande JAMAIS une quantité à l'artisan.
 * « Ardoises 30×22, 200 m², crochets compris » → ardoises, crochets, liteaux calculés avec
 * les hypothèses par défaut (pente 45°, zone 3), dites et modifiables. Si une donnée
 * manque vraiment : UNE question courte, avec des boutons de valeur.
 */
const read = (bench: BenchLine[], answers: Record<string, EngineAnswer> = {}): PurchaseView => readQuote(bench, answers);

const short = (d: string) => d.replace(/\s*\((?:fourniture\s*(?:&|et)\s*pose|f\.?\s*(?:&|et)\s*p\.?|fourniture)\)/gi, "").split(/\s[-–—]\s/)[0]!.trim();


const one = (designation: string, quantity: string | null, unit: string | null) => read([{ ref: "1", designation, quantity, unit } as unknown as BenchLine]);
const bought = (v: PurchaseView) => Object.fromEntries(v.toBuy.map((b) => [b.label, b.quantity]));
// Formule Cupa (§34), crochet 1 mm : 9 271 ardoises ; crochets = ardoises commandées × 1,02. RÈGLE NUMÉRO UN : les
// crochets sortent parce que la ligne les écrit (« crochets compris ») ; les liteaux, non écrits, ne sortent pas.
const COMPLETE = {
  "Ardoises naturelles Espagne 1er choix 30×22": "8 925 pièces",
  // Fiche couverture (2026-11-19) : NF DTU 40.11, 45°, région III → recouvrement 89 mm, crochet 89 + 3 mm → 10 cm, un par ardoise
  // (avant : recouvrement 95 mm, 9 271 ardoises, crochets 11 cm, 9 457).
  "Crochets d'ardoise inox standard, longueur 10 cm": "8 925 pièces",
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
    // « Fourniture et pose ardoises » n'écrit pas de crochets : des ardoises, rien d'autre.
    expect(bought(v)).toEqual(/crochet/i.test(designation) ? COMPLETE : { "Ardoises naturelles Espagne 1er choix 30×22": "8 925 pièces" });
    // Hypothèses dites, en tête la pente (45°) et la zone (3).
    expect(v.assumptions.slice(0, 2).map((a) => [a.key, a.value, a.unit])).toEqual([
      ["param:pente", "45", "°"],
      ["param:zone", "III", "u"],
    ]);
    expect(v.canValidate).toBe(true);
  });

  it("autres formats du référentiel (§3) : 32×22 calculé comme 30×22", () => {
    expect(bought(one("Ardoises naturelles 32x22 pose au crochet", "200", "m²"))).toMatchObject({ "Ardoises naturelles Espagne 1er choix 32×22": "8 148 pièces", "Crochets d'ardoise inox standard, longueur 10 cm": "8 148 pièces" });
  });

  // NF DTU 40.11 (fiche couverture, 2026-11-19) : un rampant de 6 m prend la table « 5,50 à 11 m » : 94 mm à 45° en région III,
  // dans la plage Cupa du 32×22 (69 à 103 mm). Avant : ancien tableau + 10 mm = 105 mm, hors table, 8 840 en estimation.
  it("exemple du §3 (32×22, 45°, région III, rampant 6 m) : table du DTU de 5,50 à 11 m, recouvrement 94 mm, 8 316 ardoises, aucune question", () => {
    const v = read([{ ref: "1", designation: "Ardoises 32x22 crochets compris", quantity: "200", unit: "m2" } as unknown as BenchLine], {
      "param:longueur_rampant": { value: "6", unit: "m" },
    });
    expect(bought(v)["Ardoises naturelles Espagne 1er choix 32×22"]).toBe("8 316 pièces");
    expect(bought(v)["Crochets d'ardoise inox standard, longueur 10 cm"]).toBe("8 316 pièces");
    expect(v.questions.some((d) => d.question?.key === "product:ardoise")).toBe(false);
    expect(v.canValidate).toBe(true);
  });

  it("surface vraiment absente (1 forfait, rien d'écrit) : UNE question, à boutons, jamais « quelle quantité ? »", () => {
    const v = one("Ardoises 30×22 crochets compris", "1", "forfait");
    expect(v.questions).toHaveLength(1);
    expect(v.questions[0]).toMatchObject({ text: "Surface du toit ?", question: { options: [{ label: "50 m²" }, { label: "100 m²" }, { label: "150 m²" }, { label: "200 m²" }] } });
    expect(JSON.stringify(v.questions)).not.toMatch(/quantit/i);
    // Réponse d'un geste → la liste complète.
    expect(bought(read([{ ref: "1", designation: "Ardoises 30×22 crochets compris", quantity: "1", unit: "forfait" } as unknown as BenchLine], { "param:surface": { value: "200", unit: "m2" } }))).toEqual(COMPLETE);
  });
});
