import { describe, expect, it } from "vitest";
import { ROOFING_REFERENTIAL } from "../src/index.js";
import { describeLot, type Metier } from "./support/paquet.js";
import { readQuote } from "./support/read-quote.js";
import { readQuoteComplet } from "./support/complet.js";

/**
 * LOT COUVERTURE, POINT 2 : fenêtres de toit (§11). La fenêtre part telle que le devis l'écrit (marque, modèle, taille) ;
 * sans taille, le comptoir la demande sur la ligne (la réponse part en précision). Un raccord d'étanchéité par fenêtre,
 * adapté à la couverture (tuiles, ardoises, tuiles plates : lue dans la ligne ou sur la couverture du devis, sinon
 * demandée) et à la taille lue. Compte rendu : `docs/lot-couverture/point-2.md`, tableau de Brest compris.
 */
const CAS: Metier[] = [
  {
    nom: "Tuiles et deux fenêtres Velux MK04",
    ref: ROOFING_REFERENTIAL,
    metier: "couverture",
    bench: [
      { ref: "1", designation: "Couverture tuiles HP10 terre cuite", quantity: "120", unit: "m²" },
      { ref: "2", designation: "Fenêtre de toit Velux GGL MK04 tout confort", quantity: "2", unit: "u" },
    ],
    questions: ["J'ai identifié : Tuiles HP10. C'est bien ce modèle ?"],
    couleurs: { vert: 2, orange: 1, gris: 0 },
  },
  {
    nom: "Ardoises et une fenêtre de toit sans taille",
    ref: ROOFING_REFERENTIAL,
    metier: "couverture",
    bench: [
      { ref: "1", designation: "Couverture en ardoises naturelles 30x22 posées au crochet", quantity: "150", unit: "m²" },
      { ref: "2", designation: "Fourniture et pose fenêtre de toit", quantity: "1", unit: "u" },
    ],
    questions: ["Quelle ardoise : Espagne 1er choix, ou ardoise NF (type Cupa) ?", "Fenêtre de toit : quelle taille ?"],
    couleurs: { vert: 1, orange: 2, gris: 0 },
  },
  {
    nom: "Une fenêtre de toit seule, sur tuiles plates",
    ref: ROOFING_REFERENTIAL,
    metier: "couverture",
    bench: [{ ref: "1", designation: "Fenêtre de toit 114x118 sur tuiles plates", quantity: "1", unit: "u" }],
    questions: [],
    couleurs: { vert: 2, orange: 0, gris: 0 },
  },
];

describeLot({
  suite: "lot couverture, point 2 : fenêtres de toit",
  titre: "Lot couverture, point 2 : fenêtres de toit (§11)",
  fichier: "lot-couverture/point-2.md",
  test: "lot-couverture-2.test.ts",
  colonne: "Devis de test",
  intro: "Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),",
  paquet: CAS,
});

describe("fenêtres de toit : la fenêtre telle qu'écrite, son raccord adapté", () => {
  it("un raccord par fenêtre, à la couverture du devis et à la taille lue (référence Velux comprise)", () => {
    const v = readQuoteComplet([
      { ref: "1", designation: "Couverture tuiles HP10 terre cuite", quantity: "120", unit: "m²" },
      { ref: "2", designation: "Fenêtre de toit Velux GGL MK04 tout confort", quantity: "2", unit: "u" },
    ]);
    const raccord = v.toBuy.find((b) => b.label.startsWith("Raccords"))!;
    expect(raccord.label).toBe("Raccords d'étanchéité pour tuiles, fenêtre 78 × 98");
    expect(raccord.quantity).toBe("2 pièces");
    expect(v.toBuy.find((b) => b.kind === "direct")!.label).toBe("Fenêtre de toit Velux GGL MK04 tout confort");
  });

  it("sans couverture au devis : « pour tuiles, pour ardoises ou pour tuiles plates ? » ; sans taille : la question du comptoir sur la ligne", () => {
    const v = readQuoteComplet([{ ref: "1", designation: "Fenêtre de toit", quantity: "1", unit: "u" }]);
    expect(v.questions.map((q) => q.question?.text)).toEqual(["Raccord de fenêtre de toit : pour tuiles, pour ardoises ou pour tuiles plates ?", "Fenêtre de toit : quelle taille ?"]);
    const answered = readQuoteComplet([{ ref: "1", designation: "Fenêtre de toit", quantity: "1", unit: "u" }], {
      "param:raccord_couverture": { value: "2", unit: "u" },
      "precise:1": "78 × 118",
    });
    expect(answered.questions).toEqual([]);
    expect(answered.toBuy.map((b) => [b.label, b.precision ?? ""])).toEqual([
      ["Raccords d'étanchéité pour ardoises, à la taille de la fenêtre de toit", ""],
      ["Fenêtre de toit", "78 × 118"],
    ]);
  });
});
