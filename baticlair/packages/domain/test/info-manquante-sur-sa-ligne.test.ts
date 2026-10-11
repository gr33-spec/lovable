import { describe, expect, it } from "vitest";
import type { QuoteLineReading } from "../src/index.js";
import { readQuote } from "./support/read-quote.js";

/**
 * §49.4, §49.8, retour du fondateur (2026-10-11, capture iPhone : « Liteaux 27×40 · Section à préciser : je ne sais pas
 * quoi faire, on doit comprendre sans réfléchir ») : ce que le comptoir demanderait encore pour UNE ligne du devis qui
 * donne plusieurs articles (« tuiles canal avec liteaunage ») ne va qu'à l'article qu'il nomme. Les liteaux attendent leur
 * traitement ; les tuiles, non.
 */
const DEVIS = [
  { ref: "1", designation: "Tuiles canal Charentaise sable avec liteaunage", quantity: "100", unit: "m2" },
  { ref: "2", designation: "Tuiles de rive", quantity: "20", unit: "m" },
];
const READINGS = new Map<string, QuoteLineReading>([["1", { role: null, articles: [], faconnage: null, manque: ["traitement des liteaux (classe 2, classe 3)"] }]]);
const ANSWERS = { "product:tuile": "edilians-canal-charentaise", "param:recouvrement_canal": { value: "150", unit: "mm" } } as const;

describe("une info qui manque va à l'article qu'elle nomme", () => {
  it("« traitement des liteaux » : la ligne des liteaux attend la réponse, celle des tuiles non", () => {
    const v = readQuote(DEVIS, ANSWERS, [], undefined, {}, READINGS);
    const question = v.questions.find((q) => q.key.startsWith("comptoir:1:"))!;
    expect(question.text).toBe("Traitement des liteaux ?");
    const liteaux = v.toBuy.find((b) => /^Liteaux/.test(b.label))!;
    const tuiles = v.toBuy.find((b) => /^Tuiles Canal/.test(b.label))!;
    expect(liteaux.waitsOn).toContain(question.key);
    expect(liteaux.asks?.map((a) => a.key)).toContain(question.key);
    expect(tuiles.waitsOn ?? []).not.toContain(question.key);
    expect((tuiles.rules ?? []).some((r) => r.key === `manque:${question.key}`)).toBe(false);
  });

  it("une donnée qui ne nomme aucun article de la ligne va à tous ses articles, comme avant", () => {
    const v = readQuote(DEVIS, ANSWERS, [], undefined, {}, new Map([["1", { role: null, articles: [], faconnage: null, manque: ["date de livraison (lundi, mardi)"] }]]));
    const question = v.questions.find((q) => q.key.startsWith("comptoir:1:"))!;
    const fromLine = v.toBuy.filter((b) => b.lineIds.includes("1"));
    expect(fromLine.length).toBeGreaterThan(1);
    for (const b of fromLine) expect(b.waitsOn).toContain(question.key);
  });
});
