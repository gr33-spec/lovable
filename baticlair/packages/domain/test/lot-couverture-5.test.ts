import { describe, expect, it } from "vitest";
import { ROOFING_REFERENTIAL } from "../src/index.js";
import { describeLot, type Metier } from "./support/paquet.js";
import { readQuote } from "./support/read-quote.js";
import { readQuoteComplet } from "./support/complet.js";

/**
 * LOT COUVERTURE, POINT 5 : ardoise fibres-ciment (§4). Le même calcul que l'ardoise naturelle (ardoises au m² du
 * format, liteaux, contre-liteaux, écran), avec ses formats (40 × 24, 40 × 27, 60 × 30, 60 × 40, recouvrement courant
 * 100 mm) et ses fixations : 2 clous inox et 1 crochet d'antivent par ardoise (« clous = 2,1 × ardoises, antivents =
 * 1,05 × ardoises »). Le comptoir demande le format et la teinte quand le devis ne les dit pas. Compte rendu :
 * `docs/lot-couverture/point-5.md`, tableau de Brest compris (l'ardoise naturelle ne change pas).
 */
const CAS: Metier[] = [
  {
    nom: "Ardoises fibres-ciment 40 × 24 bleu-noir",
    ref: ROOFING_REFERENTIAL,
    metier: "couverture",
    bench: [{ ref: "1", designation: "Couverture en ardoises fibres-ciment 40x24 bleu-noir", quantity: "100", unit: "m²" }],
    questions: [],
    couleurs: { vert: 1, orange: 0, gris: 0 },
  },
  {
    nom: "Ardoises fibro-ciment sans format ni teinte",
    ref: ROOFING_REFERENTIAL,
    metier: "couverture",
    bench: [{ ref: "1", designation: "Couverture ardoises fibro-ciment", quantity: "80", unit: "m²" }],
    questions: ["Ardoises fibres-ciment : bleu-noir, noir ou brun ?", "Ardoises fibres-ciment : 40 × 24, 40 × 27, 60 × 30 ou 60 × 40 ?"],
    couleurs: { vert: 0, orange: 1, gris: 0 },
  },
];

describeLot({
  suite: "lot couverture, point 5 : ardoise fibres-ciment",
  titre: "Lot couverture, point 5 : ardoise fibres-ciment (§4)",
  fichier: "lot-couverture/point-5.md",
  test: "lot-couverture-5.test.ts",
  colonne: "Devis de test",
  intro: "Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),",
  paquet: CAS,
});

describe("ardoise fibres-ciment : le moteur de l'ardoise, ses formats, ses clous et ses antivents", () => {
  it("100 m² de 40 × 24 : 2 919 ardoises (27,8/m² + 5 %), 6 130 clous (× 2,1), 3 065 antivents (× 1,05), 701 ml de liteaux (6,67/m² + 5 %)", () => {
    const v = readQuoteComplet([{ ref: "1", designation: "Couverture en ardoises fibres-ciment 40x24 bleu-noir", quantity: "100", unit: "m²" }]);
    expect(v.questions).toEqual([]);
    expect(Object.fromEntries(v.toBuy.map((b) => [b.label, b.quantity]))).toMatchObject({
      "Ardoises fibres-ciment bleu-noir 40×24": "2 919 pièces",
      "Clous inox d'ardoise": "6 130 pièces",
      "Crochets d'antivent": "3 065 pièces",
      "Liteaux 18×40": "701 ml",
    });
  });

  it("60 × 40 : 10 ardoises et 4 ml de liteaux au m² ; jamais de crochets d'ardoise naturelle", () => {
    const v = readQuoteComplet([{ ref: "1", designation: "Ardoises fibres-ciment 60x40 noires", quantity: "50", unit: "m²" }]);
    const got = Object.fromEntries(v.toBuy.map((b) => [b.label, b.quantity]));
    expect(got["Ardoises fibres-ciment noir 60×40"]).toBe("525 pièces"); // 50 × 10 + 5 %
    expect(v.toBuy.some((b) => /Crochets d'ardoise/.test(b.label))).toBe(false);
    // Une ardoise naturelle reste une ardoise naturelle (Brest).
    const naturelle = readQuoteComplet([{ ref: "1", designation: "Couverture en ardoises naturelles 30x22 posées au crochet", quantity: "200", unit: "m²" }]);
    expect(naturelle.toBuy.some((b) => /fibres-ciment|antivent/i.test(b.label))).toBe(false);
  });
});
