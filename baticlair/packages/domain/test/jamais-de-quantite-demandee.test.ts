import { describe, expect, it } from "vitest";
import type { EngineAnswer, PurchaseView } from "../src/index.js";
import { CROCHETS_A_AGRAFE, EGOUT_COMPRIS_OUI, readQuote } from "./support/read-quote.js";
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


const one = (designation: string, quantity: string | null, unit: string | null, answers: Record<string, EngineAnswer> = {}) => read([{ ref: "1", designation, quantity, unit } as unknown as BenchLine], answers);
const bought = (v: PurchaseView) => Object.fromEntries(v.toBuy.map((b) => [b.label, b.quantity]));
// Formule Cupa (§34), crochet 1 mm : 9 271 ardoises ; crochets = ardoises commandées × 1,02. RÈGLE NUMÉRO UN : les
// crochets sortent parce que la ligne les écrit (« crochets compris ») ; les liteaux, non écrits, ne sortent pas.
const COMPLETE = {
  "Ardoises naturelles Espagne 1er choix 30×22": "8 925 pièces",
  // Fiche couverture (2026-11-19) : NF DTU 40.11, 45°, région III → recouvrement 89 mm, crochet 89 + 3 mm → 10 cm, un par ardoise
  // (avant : recouvrement 95 mm, 9 271 ardoises, crochets 11 cm, 9 457).
  // Greg, 21 novembre 2026 : en boîtes de 500, le nombre de pièces écrit sur la ligne (8 925 pièces → 18 boîtes).
  // Règle changée (Greg, 22 novembre 2026), répondu « À agrafe » : 8 925 × 0,8 = 7 140 agrafes, 7 140 / 500 = 14,28 → 15 boîtes
  // de 500 ; 8 925 × 0,2 = 1 785 pointes, 1 785 / 700 = 2,55 → 3 boîtes de 700 (avant : une ligne, 18 boîtes de 500).
  "Crochets d'ardoise inox à agrafe standard, longueur 10 cm": "15 boîtes de 500",
  "Crochets d'ardoise inox à pointe standard, longueur 10 cm": "3 boîtes de 700",
};
// Règle changée (Greg, 22 novembre 2026) : sans type de crochet écrit, « Agrafe ou pointe ? » (avant : aucune question, un crochet par ardoise).
const QUESTION_CROCHETS = ["param:type_crochet@crochets-ardoise", "Tes crochets d'ardoise : à agrafe ou à pointe ?"];

describe("jamais de quantité demandée à l'artisan", () => {
  it.each([
    ["Ardoises 30×22, 200 m², crochets compris", "200", "m2"],
    ["Couverture ardoises 30x22 crochets compris", "200", "m²"],
    ["Fourniture et pose ardoises 30x22 sur 200 m2", "1", "ens"],
    ["Couverture en ardoises 30 x 22, crochets compris, 200 m²", "1", "forfait"],
  ])("« %s » (%s %s) : tout est calculé, aucune question", (designation, quantity, unit) => {
    // Règle changée (Greg, 21 novembre 2026) : avant, aucune question → l'égout se demande quand aucune gouttière n'est écrite.
    const ouverture = one(designation, quantity, unit);
    // Les crochets écrits (« crochets compris ») sans leur type : la question des crochets en plus.
    const avecCrochets = /crochet/i.test(designation);
    expect(ouverture.questions.map((q) => [q.question?.key, q.text])).toEqual([["param:egout_compris", "Tes m² d'ardoise comprennent déjà l'égout et les coupes ?"], ...(avecCrochets ? [QUESTION_CROCHETS] : [])]);
    expect(ouverture.questions[0]!.question?.options).toEqual([{ label: "Oui", value: "1" }, { label: "Non", value: "2" }]);
    if (avecCrochets) expect(ouverture.questions[1]!.question?.options).toEqual([{ label: "À agrafe", value: "1" }, { label: "À pointe", value: "2" }]);
    // Jamais « quelle quantité ? » : un oui ou un non, une agrafe ou une pointe.
    expect(JSON.stringify(ouverture.questions)).not.toMatch(/quantit|combien/i);
    // « Oui » (et « À agrafe ») : plus aucune question, tout est calculé.
    const v = one(designation, quantity, unit, { ...EGOUT_COMPRIS_OUI, ...CROCHETS_A_AGRAFE });
    expect(v.questions).toEqual([]);
    // « Fourniture et pose ardoises » n'écrit pas de crochets : des ardoises, rien d'autre.
    expect(bought(v)).toEqual(/crochet/i.test(designation) ? COMPLETE : { "Ardoises naturelles Espagne 1er choix 30×22": "8 925 pièces" });
    // Hypothèses dites, en tête la pente (45°) et la zone (3).
    // Greg, 21 novembre 2026 : avant elles, les ouvrages au mètre que le devis n'écrit pas (arêtier, noue : zéro, dit).
    expect(v.assumptions.slice(0, 2).map((a) => [a.key, a.value, a.unit])).toEqual([
      ["param:pente", "45", "°"],
      ["param:zone", "III", "u"],
    ]);
    expect(v.canValidate).toBe(true);
  });

  it("autres formats du référentiel (§3) : 32×22 calculé comme 30×22", () => {
    // Règle changée (Greg, 22 novembre 2026), « À agrafe » : 8 148 × 0,8 = 6 518,4 → 6 519 agrafes, / 500 = 13,04 → 14 boîtes ;
    // 8 148 × 0,2 = 1 629,6 → 1 630 pointes, / 700 = 2,33 → 3 boîtes (avant : 8 148 crochets, 17 boîtes de 500).
    expect(bought(one("Ardoises naturelles 32x22 pose au crochet", "200", "m²", { ...EGOUT_COMPRIS_OUI, ...CROCHETS_A_AGRAFE }))).toMatchObject({
      "Ardoises naturelles Espagne 1er choix 32×22": "8 148 pièces",
      "Crochets d'ardoise inox à agrafe standard, longueur 10 cm": "14 boîtes de 500",
      "Crochets d'ardoise inox à pointe standard, longueur 10 cm": "3 boîtes de 700",
    });
  });

  // NF DTU 40.11 (fiche couverture, 2026-11-19) : un rampant de 6 m prend la table « 5,50 à 11 m » : 94 mm à 45° en région III,
  // dans la plage Cupa du 32×22 (69 à 103 mm). Avant : ancien tableau + 10 mm = 105 mm, hors table, 8 840 en estimation.
  it("exemple du §3 (32×22, 45°, région III, rampant 6 m) : table du DTU de 5,50 à 11 m, recouvrement 94 mm, 8 316 ardoises, aucune question", () => {
    const v = read([{ ref: "1", designation: "Ardoises 32x22 crochets compris", quantity: "200", unit: "m2" } as unknown as BenchLine], {
      "param:longueur_rampant": { value: "6", unit: "m" },
      // « Aucune question » : celle de l'égout (Greg, 21 novembre 2026) est répondue « Oui ».
      ...EGOUT_COMPRIS_OUI,
      // Règle changée (Greg, 22 novembre 2026) : sans type de crochet écrit, « Agrafe ou pointe ? » (avant : aucune question,
      // un crochet par ardoise). Répondu « À agrafe ».
      ...CROCHETS_A_AGRAFE,
    });
    expect(v.questions).toEqual([]);
    expect(bought(v)["Ardoises naturelles Espagne 1er choix 32×22"]).toBe("8 316 pièces");
    // 8 316 × 0,8 = 6 652,8 → 6 653 agrafes, / 500 = 13,31 → 14 boîtes ; 8 316 × 0,2 = 1 663,2 → 1 664 pointes, / 700 = 2,38 → 3
    // boîtes (avant : 8 316 crochets, 17 boîtes de 500).
    expect(bought(v)["Crochets d'ardoise inox à agrafe standard, longueur 10 cm"]).toBe("14 boîtes de 500");
    expect(bought(v)["Crochets d'ardoise inox à pointe standard, longueur 10 cm"]).toBe("3 boîtes de 700");
    expect(v.questions.some((d) => d.question?.key === "product:ardoise")).toBe(false);
    expect(v.canValidate).toBe(true);
  });

  it("surface vraiment absente (1 forfait, rien d'écrit) : UNE question, à boutons, jamais « quelle quantité ? »", () => {
    // Règle changée (Greg, 21 novembre 2026) : avant, aucune autre question → l'égout se demande quand aucune gouttière n'est
    // écrite (oui ou non, jamais une quantité). La surface reste la seule donnée demandée.
    // Règle changée (Greg, 22 novembre 2026) : sans type de crochet écrit, « Agrafe ou pointe ? » (avant : aucune question, un
    // crochet par ardoise) : un choix à boutons, pas une quantité.
    const v = one("Ardoises 30×22 crochets compris", "1", "forfait");
    expect(v.questions.map((q) => q.question?.key).sort()).toEqual(["param:egout_compris", "param:surface", "param:type_crochet@crochets-ardoise"]);
    const seule = one("Ardoises 30×22 crochets compris", "1", "forfait", { ...EGOUT_COMPRIS_OUI, ...CROCHETS_A_AGRAFE });
    expect(seule.questions).toHaveLength(1);
    expect(seule.questions[0]).toMatchObject({ text: "Surface du toit ?", question: { options: [{ label: "50 m²" }, { label: "100 m²" }, { label: "150 m²" }, { label: "200 m²" }] } });
    expect(JSON.stringify(v.questions)).not.toMatch(/quantit/i);
    // Réponse d'un geste → la liste complète.
    expect(bought(read([{ ref: "1", designation: "Ardoises 30×22 crochets compris", quantity: "1", unit: "forfait" } as unknown as BenchLine], { "param:surface": { value: "200", unit: "m2" }, ...EGOUT_COMPRIS_OUI, ...CROCHETS_A_AGRAFE }))).toEqual(COMPLETE);
  });
});
