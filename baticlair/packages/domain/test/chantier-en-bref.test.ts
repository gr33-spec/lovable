import { describe, expect, it } from "vitest";
import { briefFacts, briefSentence, materialOf, planQuote, PLATRERIE_REFERENTIAL, ROOFING_REFERENTIAL, siteBrief, tradeProfile } from "../src/index.js";

/**
 * LE CHANTIER EN BREF (§45.3 bloc 1) et la première phrase du mail (§45.2) : des faits du devis, de la note ou des
 * réponses de l'artisan ; jamais une hypothèse de l'app (§45.7 test 6), jamais un paramètre interne.
 */
const TEST = [
  { id: "1", designation: "Couverture zinc à joint debout prépatiné gris quartz 0,65 mm, monopente, rampant 7 m, largeur 13 m", quantity: "91", unit: "m²" },
  { id: "2", designation: "Voligeage en sapin traité 18×200 mm", quantity: "91", unit: "m²" },
  { id: "3", designation: "Bande zinc d'égout", quantity: "13", unit: "ml" },
  { id: "4", designation: "Gouttière zinc demi-ronde", quantity: "13", unit: "ml" },
];
const brest = { key: "zone", value: "3", unit: "u", evidence: "Code postal du chantier (29200)", origin: "document" as const };
const briefOf = (answers: Record<string, { value: string; unit: string }> = {}) => {
  const plan = planQuote(TEST.map((l) => ({ ref: l.id, designation: l.designation, quantity: l.quantity, unit: l.unit })), ROOFING_REFERENTIAL, tradeProfile("roofing"), undefined, [brest]);
  return siteBrief({ ref: ROOFING_REFERENTIAL, plan, answers, lines: TEST, ville: "Brest" });
};

describe("le chantier en bref", () => {
  it("chantier Test : la phrase du gabarit 45.2, mot pour mot", () => {
    expect(briefSentence(briefOf())).toBe(
      "Je vous envoie la liste des fournitures pour un chantier de couverture zinc à joint debout à Brest : 91 m² en monopente, rampant 7 m, largeur 13 m, zinc prépatiné gris quartz 0,65 mm, pose sur voligeage.",
    );
    expect(briefFacts(briefOf())).toEqual(["Couverture zinc à joint debout", "91 m² en monopente", "rampant 7 m", "largeur 13 m", "zinc prépatiné gris quartz 0,65 mm", "pose sur voligeage", "Brest, bord de mer"]);
  });

  it("une hypothèse non confirmée n'y figure pas : les descentes absentes du devis n'apparaissent qu'une fois répondues (§45.7 test 6)", () => {
    expect(briefFacts(briefOf()).join(" ")).not.toMatch(/descente/);
    expect(briefFacts(briefOf({ "param:nb_descentes": { value: "2", unit: "u" } }))).toContain("2 descentes");
    // Pente par défaut (45°) : une hypothèse, pas un fait ; répondue : un fait.
    expect(briefFacts(briefOf()).join(" ")).not.toMatch(/\bpente \d/);
    expect(briefFacts(briefOf({ "param:pente": { value: "35", unit: "°" } }))).toContain("pente 35°");
  });

  it("jamais un paramètre interne (zone, poids posé, marge, largeur de bobine), au plus huit faits", () => {
    const all = briefFacts(briefOf({ "param:nb_descentes": { value: "2", unit: "u" }, "param:pente": { value: "35", unit: "°" } }));
    expect(all.join(" ")).not.toMatch(/zone|kg|marge|bobine|référentiel/i);
    expect(all.length).toBeLessThanOrEqual(8);
  });

  it("la phrase s'adapte au métier : une cloison ne se décrit pas comme une toiture", () => {
    const lines = [{ id: "1", designation: "Cloison 72/48 en plaques de plâtre BA13", quantity: "40", unit: "m²" }];
    const plan = planQuote(lines.map((l) => ({ ref: l.id, designation: l.designation, quantity: l.quantity, unit: l.unit })), PLATRERIE_REFERENTIAL, tradeProfile("drywall"));
    const sentence = briefSentence(siteBrief({ ref: PLATRERIE_REFERENTIAL, plan, answers: {}, lines, ville: "Lyon" }));
    expect(sentence).toMatch(/^Je vous envoie la liste des fournitures pour un chantier de platrerie \(cloison/);
    expect(sentence).toContain("40 m²");
    expect(sentence).not.toMatch(/toiture|rampant|couverture/);
  });

  it("le matériau est lu dans la ligne quand l'IA ne l'a pas lu, sans les mots de pose", () => {
    expect(materialOf("Couverture zinc à joint debout prépatiné gris quartz 0,65 mm, monopente")).toBe("zinc prépatiné gris quartz 0,65 mm");
    expect(materialOf("Couverture en ardoises naturelles 30x22 posées au crochet")).toBe("ardoises naturelles 30x22");
    expect(materialOf("Dépose de l'existant")).toBeNull();
  });
});
