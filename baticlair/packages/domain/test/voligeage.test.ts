import { describe, expect, it } from "vitest";
import { planQuote, ROOFING_REFERENTIAL, tradeProfile } from "../src/index.js";
import { readQuote } from "./support/read-quote.js";

/**
 * VOLIGEAGE SEUL (retour du fondateur, 2026-10-04 : « Voligeage en sapin traité 18×200 mm, 91 m² » restait bloqué,
 * « n'existe pas dans le référentiel ») : §7 « Support voligeage : m² rampant × 1,05 ».
 */
describe("une ligne de voligeage se calcule", () => {
  const LIGNE = { ref: "1", designation: "Voligeage en sapin traité 18x200 mm", quantity: "91", unit: "m²" };
  it("rattachée à l'ouvrage voligeage ; 91 m² × 1,05 = 96 m² de voliges sapin 18 mm, sans question", () => {
    const plan = planQuote([LIGNE], ROOFING_REFERENTIAL, tradeProfile("roofing"));
    expect(plan.lines[0]).toMatchObject({ status: "planned", workItemId: "voligeage", slot: "volige" });
    const v = readQuote([LIGNE]);
    expect(v.toBuy.map((b) => `${b.label} : ${b.quantity}`)).toEqual(["Voliges sapin 18 mm : 96 m²"]);
    expect(v.toQuote).toEqual([]);
    expect(v.questions).toEqual([]);
  });
  it("sous un zinc à joint debout, la volige reste à l'ouvrage zinc : un seul article voliges", () => {
    const v = readQuote(
      [
        { ref: "1", designation: "Couverture zinc à joint debout 0,65 mm", quantity: "91", unit: "m²" },
        { ref: "2", designation: "Voligeage sapin 18 mm", quantity: "91", unit: "m²" },
      ],
      { "param:faconnage": { value: "1", unit: "u" } },
    );
    expect(v.toBuy.filter((b) => /[Vv]olige/.test(b.label))).toHaveLength(1);
  });
});
