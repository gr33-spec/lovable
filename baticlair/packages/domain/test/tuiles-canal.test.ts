import { describe, expect, it } from "vitest";
import { planQuote, ROOFING_REFERENTIAL, tradeProfile } from "../src/index.js";
import { readQuote } from "./support/read-quote.js";

/**
 * TUILES CANAL (référentiel §35.3, Edilians Poudenx ; retour du fondateur du 2026-10-04) : un devis de tuiles canal
 * n'est jamais calculé comme une tuile à emboîtement (HP10). Le modèle est demandé quand le devis ne le nomme pas,
 * le recouvrement aussi ; couvert + courant = 2 × le nombre au m² du couvert.
 */
const DEVIS = [
  { ref: "1", designation: "Tuiles (Fourniture et pose de tuiles canal sablées (avec liteaunage))", quantity: "100", unit: "m²" },
  { ref: "2", designation: "Liteaux 27x40 (Fourniture et pose de tuiles canal sablées (avec liteaunage))", quantity: "100", unit: "m²" },
  { ref: "3", designation: "Tuiles de rive (Rives scellées au ciment)", quantity: "20", unit: "m" },
];
const A = (o: Record<string, string | { value: string; unit: string }>) => o;

describe("la tuile canal est reconnue, même quand la ligne commence par « Tuiles »", () => {
  it("rattachée à l'ouvrage canal, jamais à la tuile à emboîtement ; pas de HP10 proposée", () => {
    const plan = planQuote(DEVIS, ROOFING_REFERENTIAL, tradeProfile("roofing"));
    expect(plan.lines.map((l) => (l.status === "planned" ? `${l.ref}:${l.workItemId}/${l.slot}` : `${l.ref}:${l.status}`))).toEqual([
      "1:couverture-tuiles-canal/tuile",
      "2:couverture-tuiles-canal/liteau",
      "3:couverture-tuiles-canal/rive",
    ]);
    const v = readQuote(DEVIS);
    const modele = v.questions.find((q) => q.question?.key === "product:tuile")!;
    expect(modele.question?.options?.map((o) => o.label)).toEqual([
      "Tuiles canal 50",
      "Tuiles Canal Gironde 50",
      "Tuiles Canal Gironde à blocage",
      "Tuiles Canal Lyonnaise 40",
      "Tuiles Canal Charentaise",
      "Tuiles Canal Charentaise à blocage",
    ]);
    expect(JSON.stringify(v)).not.toMatch(/HP ?10/);
    expect(v.questions.map((q) => q.question?.key)).toContain("param:recouvrement_canal");
  });

  it("une « tuile romane canal » reste une tuile à emboîtement (grand moule, §5)", () => {
    const plan = planQuote([{ ref: "r", designation: "Tuile romane canal rouge", quantity: "100", unit: "m²" }], ROOFING_REFERENTIAL, tradeProfile("roofing"));
    expect(plan.lines[0]).toMatchObject({ workItemId: "couverture-tuiles-emboitement" });
  });
});

describe("le calcul canal (§35.3)", () => {
  it("Canal Gironde 50 à R 150 sur 100 m² : 2 540 tuiles (12,7 × 2), 307 ml de liteaux 27×40 (2,92 + 5 %), 54 bardelis (20 m × 2,7)", () => {
    const v = readQuote(DEVIS, A({ "product:tuile": "edilians-canal-gironde-50", "param:recouvrement_canal": { value: "150", unit: "mm" } }));
    const q = Object.fromEntries(v.toBuy.map((b) => [b.needIds[0], b.quantity]));
    expect(q).toMatchObject({ "tuiles-canal": "2 540 pièces", "liteaux-canal": "307 ml", bardelis: "54 pièces" });
    expect(v.toQuote).toEqual([]);
    expect(v.questions).toEqual([]);
  });

  it("tuile à blocage : le recouvrement est fixe (150 mm), la question ne change rien et n'est pas posée", () => {
    const v = readQuote(DEVIS, A({ "product:tuile": "edilians-canal-gironde-blocage" }));
    expect(v.questions.map((q) => q.question?.key)).not.toContain("param:recouvrement_canal");
    expect(v.toBuy.find((b) => b.needIds.includes("tuiles-canal"))?.quantity).toBe("2 540 pièces");
  });

  it("le devis nomme le modèle (« Canal Charentaise ») : une simple confirmation, pas un choix parmi six", () => {
    const lu = readQuote([{ ref: "1", designation: "Tuiles canal Charentaise", quantity: "100", unit: "m²" }]);
    expect(lu.questions.find((q) => q.question?.key === "product:tuile")?.question).toMatchObject({ kind: "confirm_product", text: "J'ai identifié : Tuiles Canal Charentaise. C'est bien ce modèle ?" });
    // La question du recouvrement est posée en même temps, pas après.
    expect(lu.questions.map((q) => q.question?.key)).toContain("param:recouvrement_canal");
    const v = readQuote([{ ref: "1", designation: "Tuiles canal Charentaise", quantity: "100", unit: "m²" }], A({ "product:tuile": "edilians-canal-charentaise", "param:recouvrement_canal": { value: "160", unit: "mm" } }));
    expect(v.questions.map((q) => q.question?.key)).not.toContain("product:tuile");
    // 100 × 18,1 × 2 = 3 620.
    expect(v.toBuy.find((b) => b.needIds.includes("tuiles-canal"))?.quantity).toBe("3 620 pièces");
  });
});

describe("gouttières et descentes ne sont jamais façonnées par l'artisan", () => {
  it("un devis de gouttière et de descentes zinc ne pose aucune question de façonnage", () => {
    const v = readQuote([
      { ref: "g", designation: "Gouttière zinc demi-ronde dév. 25", quantity: "24", unit: "ml" },
      { ref: "d", designation: "Descente zinc Ø 80", quantity: "2", unit: "u" },
    ]);
    expect(v.questions.map((q) => q.question?.key)).not.toContain("param:faconnage");
    expect(JSON.stringify(v.toBuy)).not.toMatch(/feuille|bobine/i);
  });
});
