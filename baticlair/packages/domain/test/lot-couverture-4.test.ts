import { describe, expect, it } from "vitest";
import { ROOFING_REFERENTIAL } from "../src/index.js";
import { describeLot, type Metier } from "./support/paquet.js";
import { readQuote } from "./support/read-quote.js";
import { readQuoteComplet } from "./support/complet.js";

/**
 * LOT COUVERTURE, POINT 4 : bac acier (§8). Plaques à la longueur du rampant (+ 5 cm de débord), une par rampant,
 * autant que la largeur du pan compte de largeurs utiles (1,00 m) ; vis 7/m² + 3/ml de rive ; closoirs en bas et en
 * haut de chaque plaque ; faîtière en longueurs de 2 m (+1). Le comptoir demande ce qu'il ne devine pas : la longueur
 * des plaques, la teinte, le feutre anti-condensation. Compte rendu : `docs/lot-couverture/point-4.md`, Brest compris.
 */
const CAS: Metier[] = [
  {
    nom: "Bac acier deux pans, tout est écrit",
    ref: ROOFING_REFERENTIAL,
    metier: "couverture",
    bench: [{ ref: "1", designation: "Couverture bac acier anti-condensation RAL 7016, rampant 6 m", quantity: "120", unit: "m²" }],
    questions: [],
    couleurs: { vert: 0, orange: 1, gris: 0 },
  },
  {
    nom: "Bac acier monopente, rien d'écrit",
    ref: ROOFING_REFERENTIAL,
    metier: "couverture",
    bench: [{ ref: "1", designation: "Bac acier monopente sur hangar", quantity: "80", unit: "m²" }],
    questions: ["Bac acier : longueur du rampant (longueur des plaques) ?", "Bac acier : quelle teinte ?", "Bac acier : avec ou sans feutre anti-condensation ?"],
    couleurs: { vert: 0, orange: 1, gris: 0 },
  },
];

describeLot({
  suite: "lot couverture, point 4 : bac acier",
  titre: "Lot couverture, point 4 : bac acier (§8)",
  fichier: "lot-couverture/point-4.md",
  test: "lot-couverture-4.test.ts",
  colonne: "Devis de test",
  intro: "Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),",
  paquet: CAS,
});

describe("bac acier : des plaques à longueur, jamais des m²", () => {
  it("120 m², rampant 6 m, deux pans : 20 plaques de 6,05 m, 912 vis, 40 closoirs, 6 faîtières", () => {
    const v = readQuoteComplet([{ ref: "1", designation: "Couverture bac acier anti-condensation RAL 7016, rampant 6 m", quantity: "120", unit: "m²" }]);
    expect(v.questions).toEqual([]);
    expect(v.toBuy.map((b) => [b.label, b.quantity])).toEqual([
      ["Plaques bac acier simple peau RAL 7016 avec feutre anti-condensation, longueur 6,05 m", "20 pièces"],
      ["Vis autoperceuses bac acier avec rondelle EPDM", "10 boîtes de 100"], // 120 × 7 + 2 pans × 2 rives × 6 m × 3 = 912
      ["Closoirs mousse profilés au bac acier", "40 pièces"],
      ["Faîtières bac acier RAL 7016, longueur 2 m", "6 pièces"], // 10 ml / 2 + 1
    ]);
  });

  it("panneau sandwich lu dans la ligne : pas de feutre à demander ; monopente : pas de faîtière", () => {
    const v = readQuoteComplet([{ ref: "1", designation: "Panneaux sandwich monopente RAL 9005, rampant 5 m", quantity: "50", unit: "m²" }]);
    expect(v.questions).toEqual([]);
    expect(v.toBuy.map((b) => b.label)).toEqual([
      "Panneaux sandwich RAL 9005, longueur 5,05 m",
      "Vis autoperceuses bac acier avec rondelle EPDM",
      "Closoirs mousse profilés au bac acier",
    ]);
    expect(v.toBuy[0]!.quantity).toBe("10 pièces");
  });
});
