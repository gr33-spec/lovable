import { describe, expect, it } from "vitest";
import { ROOFING_REFERENTIAL, supplierTest } from "../src/index.js";
import { describeLot, type Metier } from "./support/paquet.js";
import { readQuote } from "./support/read-quote.js";

/**
 * LOT COUVERTURE, POINT 3 : gouttières PVC et aluminium (§15), mêmes règles que le zinc : longueurs de 4 m, crochets
 * tous les 50 cm (40 en bord de mer) plus un en bout de ligne, jonctions entre longueurs, deux talons par ligne, un
 * angle par angle, une naissance par descente, joint de dilatation PVC tous les 12 m. La matière est lue dans la ligne
 * (elle choisit l'ouvrage) ; la teinte et le développé aussi, sinon le comptoir les demande. La gouttière zinc ne
 * change pas (Brest). Compte rendu : `docs/lot-couverture/point-3.md`, tableau de Brest compris.
 */
const CAS: Metier[] = [
  {
    nom: "Gouttière PVC grise, deux descentes",
    ref: ROOFING_REFERENTIAL,
    metier: "couverture",
    bench: [
      { ref: "1", designation: "Gouttière PVC demi-ronde 25 grise avec 2 descentes", quantity: "18", unit: "ml" },
      { ref: "2", designation: "Descente PVC Ø80 grise, hauteur 5 m", quantity: "2", unit: "u" },
    ],
    questions: ["Crochets de gouttière : sur les chevrons ou en façade (bandeau) ?", "Combien d'angles sur cette gouttière ?"],
    couleurs: { vert: 8, orange: 2, gris: 0 },
  },
  {
    nom: "Gouttière alu anthracite sans développé",
    ref: ROOFING_REFERENTIAL,
    metier: "couverture",
    bench: [
      { ref: "1", designation: "Gouttière aluminium laqué anthracite, 2 angles", quantity: "11", unit: "ml" },
      { ref: "2", designation: "Descente alu Ø80, hauteur 5 m", quantity: "1", unit: "u" },
    ],
    questions: ["Gouttière de 25, de 28, de 33 ou de 40 ?", "Crochets de gouttière : sur les chevrons ou en façade (bandeau) ?"],
    couleurs: { vert: 3, orange: 2, gris: 0 },
  },
];

describeLot({
  suite: "lot couverture, point 3 : gouttières PVC et alu",
  titre: "Lot couverture, point 3 : gouttières PVC et aluminium (§15)",
  fichier: "lot-couverture/point-3.md",
  test: "lot-couverture-3.test.ts",
  colonne: "Devis de test",
  intro: "Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),",
  paquet: CAS,
});

const u = (value: string, unit = "u") => ({ value, unit });
const got = (v: ReturnType<typeof readQuote>) => Object.fromEntries(v.toBuy.map((b) => [b.label, b.quantity]));

describe("gouttières PVC et alu : les règles du zinc, la matière lue dans la ligne", () => {
  it("PVC, 26 m d'une ligne, 1 angle : 7 longueurs, 6 jonctions, 2 talons, 1 angle, 1 naissance, 2 joints de dilatation", () => {
    const v = readQuote([{ ref: "1", designation: "Gouttière PVC 33 blanche, 1 descente, 1 angle", quantity: "26", unit: "ml" }], {
      "param:fixation_crochet": u("1"),
      "param:diametre_descente": u("100", "mm"),
      "param:zone": u("1"),
    });
    expect(v.questions).toEqual([]);
    expect(got(v)).toEqual({
      "Gouttière PVC blanche de 33": "7 longueurs de 4 m",
      "Crochets de gouttière PVC sur chevron de 33": "53 pièces", // 26 / 0,5 + 1
      "Jonctions de gouttière PVC blanche de 33": "6 pièces",
      "Talons de gouttière PVC blanche de 33": "2 pièces",
      "Angles extérieurs 90° PVC blanche de 33": "1 pièce",
      "Naissances PVC blanche de 33 Ø100": "1 pièce",
      "Joints de dilatation de gouttière PVC blanche de 33": "2 pièces", // 26 m : un tous les 12 m
    });
  });

  it("« 2 x 10 m » : deux lignes, deux fois les talons ; aucune ligne au-delà de 12 m, pas de joint de dilatation", () => {
    const v = readQuote([{ ref: "1", designation: "Gouttière PVC de 25 sable (Longueur : 2 x 10 m), 2 descentes", quantity: "20", unit: "ml" }], {
      "param:fixation_crochet": u("1"),
      "param:diametre_descente": u("80", "mm"),
      "param:nb_angles": u("0"),
    });
    expect(got(v)).toMatchObject({ "Talons de gouttière PVC sable de 25": "4 pièces", "Jonctions de gouttière PVC sable de 25": "4 pièces" });
    expect(v.toBuy.some((b) => /dilatation/.test(b.label))).toBe(false);
  });

  it("sans teinte, le comptoir la demande ; la gouttière zinc garde ses règles (pas de talon, pas de teinte)", () => {
    const pvc = readQuote([{ ref: "1", designation: "Gouttière PVC de 25", quantity: "8", unit: "ml" }]);
    expect(pvc.questions.map((q) => q.question?.text)).toContain("Gouttière : grise, blanche, sable, brune ou anthracite ?");
    const zinc = readQuote([{ ref: "1", designation: "Gouttière zinc demi-ronde de 25", quantity: "8", unit: "ml" }]);
    expect(zinc.questions.map((q) => q.question?.text)).not.toContain("Gouttière : grise, blanche, sable, brune ou anthracite ?");
  });

  it("un tube de descente alu au mètre avec son Ø passe le test du fournisseur", () => {
    expect(supplierTest("Tubes de descente alu Ø80", "ml")).toBeNull();
    expect(supplierTest("Bande zinc", "ml")).not.toBeNull();
  });
});
