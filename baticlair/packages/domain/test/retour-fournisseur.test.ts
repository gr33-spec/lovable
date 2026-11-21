import { describe, expect, it } from "vitest";
import { orderGaps, parseOrderText, quantityNumber } from "../src/index.js";

/**
 * §47.5 RETOUR FOURNISSEUR : le bon de commande, collé ou lu sur une photo, comparé ligne à ligne à la liste envoyée.
 * Le code lit les quantités et compare ; les écarts vont au journal, marqués « bon de commande » (test API
 * `apps/api/test/retour-fournisseur.test.ts`).
 */
const ENVOYE = [
  { designation: "Ardoises naturelles Espagne 1er choix 30×22", quantity: "9 271", unit: "pièces" },
  { designation: "Crochets d'ardoise inox standard, longueur 11 cm", quantity: "9 457", unit: "pièces" },
  { designation: "Liteaux 18×40", quantity: "2 049", unit: "ml" },
  { designation: "Gouttière zinc demi-ronde dév. 33", quantity: "6", unit: "longueurs de 4 m" },
];

describe("retour fournisseur (§47.5) : le bon de commande comparé à la liste envoyée", () => {
  it("lit un bon de commande collé : quantité en fin ou en tête, prix et totaux ignorés", () => {
    expect(
      parseOrderText(
        [
          "BON DE COMMANDE n° 4512",
          "Ardoises Espagne 1er choix 30x22 : 9 000 pièces  12 450,00 € HT",
          "9 457 x Crochets ardoise inox 11 cm",
          "Liteaux sapin 18x40 2 100 ml",
          "Liteaux 27×40 350",
          "Closoir ventilé 2 rouleaux",
          "Total HT 15 230,00 €",
        ].join("\n"),
      ),
    ).toEqual([
      { designation: "Ardoises Espagne 1er choix 30x22", quantity: "9 000", unit: "pièces" },
      { designation: "Crochets ardoise inox 11 cm", quantity: "9 457", unit: null },
      { designation: "Liteaux sapin 18x40", quantity: "2 100", unit: "ml" },
      { designation: "Liteaux 27×40", quantity: "350", unit: null },
      { designation: "Closoir ventilé", quantity: "2", unit: "rouleaux" },
    ]);
    expect(quantityNumber("4 longueurs de 4 m")).toBe(4);
  });

  it("chaque ligne envoyée : la même, changée (avec l'écart), retirée ; une ligne du bon en plus : ajoutée", () => {
    const gaps = orderGaps(
      ENVOYE,
      parseOrderText("Ardoises Espagne 1er choix 30x22 : 9 000 pièces\n9 457 x Crochets ardoise inox 11 cm\nLiteaux sapin 18x40 2 100 ml\nClosoir ventilé 2 rouleaux"),
    );
    expect(gaps.map((g) => [g.kind, g.designation, g.sent, g.ordered, g.gapPercent])).toEqual([
      ["changed", "Ardoises naturelles Espagne 1er choix 30×22", "9 271", "9 000", -2.9],
      ["same", "Crochets d'ardoise inox standard, longueur 11 cm", "9 457", "9 457", 0],
      ["changed", "Liteaux 18×40", "2 049", "2 100", 2.5],
      ["removed", "Gouttière zinc demi-ronde dév. 33", "6", null, -100],
      ["added", "Closoir ventilé", null, "2", null],
    ]);
  });

  it("une lecture de photo qui dit le rang de la ligne demandée l'emporte sur les mots", () => {
    const gaps = orderGaps(ENVOYE, [{ designation: "Art. 33417 bande", quantity: "7", unit: "u", requestIndex: 3 }]);
    expect(gaps.find((g) => g.index === 3)).toMatchObject({ kind: "changed", sent: "6", ordered: "7" });
    expect(gaps.filter((g) => g.kind === "removed")).toHaveLength(3);
  });
});

describe("§47.4 / §47.5 : quand une règle « à vérifier » passe validée (réponse du fondateur)", () => {
  it("3 écrans, ou 2 bons de commande, ou 1 bon + 1 autre entreprise ; un bon seul ne valide jamais", async () => {
    const { ruleValidatedBy } = await import("../src/index.js");
    expect(ruleValidatedBy({ screen: 3, order: 0 })).toBe(true);
    expect(ruleValidatedBy({ screen: 2, order: 0 })).toBe(false);
    expect(ruleValidatedBy({ screen: 0, order: 2 })).toBe(true);
    expect(ruleValidatedBy({ screen: 1, order: 1 })).toBe(true);
    expect(ruleValidatedBy({ screen: 0, order: 1 })).toBe(false);
  });
});
