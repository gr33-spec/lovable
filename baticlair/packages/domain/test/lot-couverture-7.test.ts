import { describe, expect, it } from "vitest";
import { ROOFING_REFERENTIAL } from "../src/index.js";
import { describeLot, type Metier } from "./support/paquet.js";
import { readQuote } from "./support/read-quote.js";
import { readQuoteComplet } from "./support/complet.js";

/**
 * LOT COUVERTURE, POINT 7 : descentes PVC et zinc (réponse du fondateur, 2026-10-05). Tubes en longueurs de 4 m (2 m
 * si le devis le dit), par descente la hauteur en longueurs entières ; 2 coudes par descente par défaut ; un collier
 * tous les 2 m plus un ; le dauphin est une question du comptoir (lue au devis : « avec dauphin », « sans dauphin »).
 * Compte rendu : `docs/lot-couverture/point-7.md`, tableau de Brest compris.
 */
const CAS: Metier[] = [
  {
    nom: "Deux descentes zinc de 5 m, dauphin à demander",
    ref: ROOFING_REFERENTIAL,
    metier: "couverture",
    bench: [{ ref: "1", designation: "Descente zinc Ø100, hauteur 5 m", quantity: "2", unit: "u" }],
    questions: [],
    couleurs: { vert: 0, orange: 1, gris: 0 },
  },
  {
    nom: "Une descente PVC en longueurs de 2 m, avec dauphin",
    ref: ROOFING_REFERENTIAL,
    metier: "couverture",
    bench: [{ ref: "1", designation: "Descente PVC Ø80 grise en longueurs de 2 m, hauteur 4,5 m, avec dauphin", quantity: "1", unit: "u" }],
    questions: [],
    couleurs: { vert: 2, orange: 0, gris: 0 },
  },
];

describeLot({
  suite: "lot couverture, point 7 : descentes",
  titre: "Lot couverture, point 7 : descentes PVC et zinc",
  fichier: "lot-couverture/point-7.md",
  test: "lot-couverture-7.test.ts",
  colonne: "Devis de test",
  intro: "Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),",
  paquet: CAS,
});

const got = (v: ReturnType<typeof readQuote>) => Object.fromEntries(v.toBuy.map((b) => [b.label, b.quantity]));

describe("descentes : longueurs de 4 m, coudes, colliers tous les 2 m, dauphin du comptoir", () => {
  it("2 descentes zinc de 5 m : 4 longueurs de 4 m, 4 coudes, 8 colliers ; avec dauphin : 2 dauphins", () => {
    const v = readQuoteComplet([{ ref: "1", designation: "Descente zinc Ø100, hauteur 5 m", quantity: "2", unit: "u" }], { "param:dauphin": { value: "1", unit: "u" } });
    expect(v.questions).toEqual([]);
    expect(got(v)).toEqual({
      "Tubes de descente zinc Ø100, longueur 4 m": "4 pièces", // 2 × arrondi_sup(5 / 4)
      "Coudes de descente zinc Ø100": "4 pièces",
      "Colliers de descente Ø100": "8 pièces", // 2 × (arrondi_sup(5 / 2) + 1)
      "Dauphins Ø100, 1 m": "2 pièces",
    });
  });

  it("« en longueurs de 2 m » et « sans dauphin » lus au devis : aucune question", () => {
    const v = readQuoteComplet([{ ref: "1", designation: "Descente PVC Ø80 en longueurs de 2 m, hauteur 3 m, sans dauphin", quantity: "1", unit: "u" }]);
    expect(v.questions).toEqual([]);
    expect(got(v)).toMatchObject({ "Tubes de descente PVC Ø80, longueur 2 m": "2 pièces" });
    expect(v.toBuy.some((b) => /Dauphin/.test(b.label))).toBe(false);
  });
});
