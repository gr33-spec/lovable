import { describe, expect, it } from "vitest";
import { readQuote } from "./support/read-quote.js";

/**
 * DEUX TOITURES DANS UN DEVIS (relevé en préparant le compte rendu du §44, 2026-10-04) : 200 m² d'ardoises sur la
 * maison et 20 m² de tuiles au garage sont deux surfaces, pas une contradiction. Avant : « Surface du toit ? » et
 * les ardoises disparaissaient de la commande.
 */
describe("une surface par ouvrage", () => {
  const LIGNES = [
    { ref: "1", designation: "Couverture en ardoises naturelles 30x22 posées au crochet", quantity: "200", unit: "m²" },
    { ref: "2", designation: "Couverture du garage en tuiles mécaniques", quantity: "20", unit: "m²" },
  ];
  it("ardoises sur 200 m², tuiles sur 20 m² ; aucune question de surface", () => {
    const v = readQuote(LIGNES);
    expect(v.questions.map((q) => q.question?.key)).not.toContain("param:surface");
    // Sans adresse : le même nombre que le devis d'ardoises seul, sans le garage.
    const seul = readQuote([LIGNES[0]!]).toBuy.find((b) => b.needIds.includes("ardoises"))?.quantity;
    expect(seul).toBe("9 271 pièces");
    expect(v.toBuy.find((b) => b.needIds.includes("ardoises"))?.quantity).toBe(seul);
  });
  it("le nombre de descentes écrit sur la ligne « descente » sert toujours à la gouttière", () => {
    const v = readQuote([
      { ref: "1", designation: "Gouttière demi-ronde zinc développé 33", quantity: "24", unit: "ml" },
      { ref: "2", designation: "Descente zinc diamètre 80, hauteur 4 m", quantity: "2", unit: "u" },
    ]);
    expect(v.questions.map((q) => q.question?.key)).not.toContain("param:nb_descentes");
  });
});
