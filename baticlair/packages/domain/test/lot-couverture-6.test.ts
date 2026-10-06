import { describe, expect, it } from "vitest";
import { planQuote, ROOFING_REFERENTIAL, supplierTest, tradeProfile } from "../src/index.js";
import { describeLot, type Metier } from "./support/paquet.js";
import { readQuote } from "./support/read-quote.js";
import { REFERENTIEL_COMPLET, readQuoteComplet } from "./support/complet.js";

/**
 * LOT COUVERTURE, POINT 6 : sécurité définitive et accès (§14), désamiantage (§18). Les lignes sont reconnues (crochets
 * de sécurité, crochets de service, échelle de toit, ligne de vie, points d'ancrage, garde-corps ; désamiantage,
 * amiante) et partent telles que le devis les écrit, sans calcul ni question. L'amiante l'emporte sur tout autre mot de
 * la ligne (« plaques fibres-ciment amiantées » n'est jamais une ardoise) et avertit l'artisan en haut de la liste ;
 * l'avertissement ne part jamais au fournisseur. Compte rendu : `docs/lot-couverture/point-6.md`, Brest compris.
 */
const CAS: Metier[] = [
  {
    nom: "Sécurité et accès, désamiantage",
    ref: ROOFING_REFERENTIAL,
    metier: "couverture",
    bench: [
      { ref: "1", designation: "Crochets de sécurité inox NF EN 517 type B", quantity: "4", unit: "u" },
      { ref: "2", designation: "Échelle de toit aluminium", quantity: "1", unit: "u" },
      { ref: "3", designation: "Ligne de vie câble inox", quantity: "12", unit: "ml" },
      { ref: "4", designation: "Désamiantage plaques fibres-ciment amiantées, évacuation en ISDD", quantity: "80", unit: "m²" },
      { ref: "5", designation: "Crochets de service pour échelle", quantity: "2", unit: "u" },
    ],
    questions: [],
    couleurs: { vert: 5, orange: 0, gris: 0 },
  },
];

describeLot({
  suite: "lot couverture, point 6 : sécurité, accès et amiante",
  titre: "Lot couverture, point 6 : sécurité et accès (§14), désamiantage (§18)",
  fichier: "lot-couverture/point-6.md",
  test: "lot-couverture-6.test.ts",
  colonne: "Devis de test",
  intro: "Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),",
  paquet: CAS,
});

describe("sécurité et amiante : reconnus, partis tels qu'écrits, l'amiante dite à l'artisan", () => {
  it("chaque ligne part telle qu'écrite, avec sa quantité, sans question", () => {
    const v = readQuoteComplet(CAS[0]!.bench);
    expect(v.questions).toEqual([]);
    expect(v.toBuy.map((b) => [b.label, b.quantity, b.kind])).toEqual([
      ["Crochets de sécurité inox NF EN 517 type B", "4 pièces", "direct"],
      ["Échelle de toit aluminium", "1 pièce", "direct"],
      ["Ligne de vie câble inox", "12 ml", "direct"],
      ["Désamiantage plaques fibres-ciment amiantées, évacuation en ISDD", "80 m²", "direct"],
      ["Crochets de service pour échelle", "2 pièces", "direct"],
    ]);
  });

  it("l'amiante l'emporte sur tout autre mot de la ligne, et avertit l'artisan, même sur une ligne de dépose", () => {
    const plan = planQuote([{ ref: "1", designation: "Plaques fibres-ciment amiantées à déposer", quantity: "60", unit: "m2" }], REFERENTIEL_COMPLET, tradeProfile("roofing"));
    expect(plan.lines[0]).not.toMatchObject({ status: "planned" });
    const v = readQuoteComplet([
      { ref: "1", designation: "Dépose de la couverture fibres-ciment amiantée", quantity: "60", unit: "m²" },
      { ref: "2", designation: "Couverture en ardoises naturelles 30x22 posées au crochet", quantity: "60", unit: "m²" },
    ]);
    expect(v.warnings).toHaveLength(1);
    expect(v.warnings[0]).toMatch(/^Amiante : le retrait se fait par une entreprise certifiée \(SS3\)/);
    // L'avertissement ne part jamais au fournisseur : il n'est ni une ligne, ni une précision.
    expect(JSON.stringify(v.toBuy)).not.toMatch(/SS3/);
    // Sans amiante, aucun avertissement (Brest).
    expect(readQuoteComplet([{ ref: "1", designation: "Couverture en ardoises naturelles 30x22 posées au crochet", quantity: "200", unit: "m²" }]).warnings).toEqual([]);
  });

  it("le test du fournisseur laisse passer la ligne de vie à sa longueur et le désamiantage au m²", () => {
    expect(supplierTest("Ligne de vie câble inox", "ml")).toBeNull();
    expect(supplierTest("Désamiantage des plaques", "m2")).toBeNull();
    expect(supplierTest("Bande zinc", "ml")).not.toBeNull();
  });
});
