import { describe, expect, it } from "vitest";
import { CARRELAGE_REFERENTIAL, PEINTURE_REFERENTIAL } from "../src/index.js";
import { readQuote } from "./support/read-quote.js";
import { readTradeQuote } from "./support/read-trade.js";

/**
 * RIEN NE PART VIDE NI AVEC UNE QUESTION OUVERTE (retour du fondateur, 2026-10-05), dans tous les métiers : la liste
 * part quand chaque ligne est verte ou grise, qu'il en reste au moins une, et qu'aucune question n'attend.
 */
describe("l'envoi attend une liste pleine et sans question", () => {
  it("une liste vide ne part pas (le devis n'a que de la main-d'œuvre)", () => {
    const p = readTradeQuote(CARRELAGE_REFERENTIAL, [{ ref: "1", designation: "Dépose de l'ancien carrelage", quantity: "20", unit: "m²" }]);
    expect(p.toBuy).toEqual([]);
    expect(p.toQuote).toEqual([]);
    expect(p.canValidate).toBe(false);
  });

  it("une question du comptoir ouverte bloque (peinture : finition non dite)", () => {
    const p = readTradeQuote(PEINTURE_REFERENTIAL, [{ ref: "1", designation: "Peinture murs séjour, 2 couches", quantity: "85", unit: "m²" }]);
    expect(p.questions.some((q) => q.question)).toBe(true);
    expect(p.canValidate).toBe(false);
  });

  it("couverture : Brest attend ses quatre réponses avant de partir", () => {
    const brest = readQuote([
      { ref: "1", designation: "Couverture en ardoises naturelles 30x22 posées au crochet", quantity: "200", unit: "m²" },
      { ref: "2", designation: "Gouttière demi-ronde zinc développé 33", quantity: "24", unit: "ml" },
    ], {}, [], {});
    expect(brest.questions.filter((q) => q.question)).toHaveLength(4);
    expect(brest.canValidate).toBe(false);
  });
});
