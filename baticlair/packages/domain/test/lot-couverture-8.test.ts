import { describe, expect, it } from "vitest";
import { ROOFING_REFERENTIAL } from "../src/index.js";
import { describeLot, type Metier } from "./support/paquet.js";
import type { QuoteLineInput } from "./support/read-quote.js";
import { readTradeQuote } from "./support/read-trade.js";

/** Comme l'API : les règles « à vérifier » calculent (orange), §47.1. */
const readQuote = (lines: QuoteLineInput[], answers: Parameters<typeof readTradeQuote>[2] = {}) => readTradeQuote(ROOFING_REFERENTIAL, lines, answers);

/**
 * LOT COUVERTURE, POINT 8 : plomb et cuivre (§12, réponse du fondateur, 2026-10-05). Plomb en bande commandé en
 * rouleaux : largeur lue au devis, sinon 30 cm ; épaisseur 1,5 mm par défaut ; ml × 1,1 ; la longueur du rouleau
 * (§12 : 3 à 6 m, 6 m retenus) reste à confirmer, la ligne sort orange avec sa règle. Cuivre comme le zinc, avec ses
 * propres largeurs : commandé façonné en longueurs de 2 m, ou feuilles 2 × 1 m jusqu'à 6 ml, bobine au mètre au-delà
 * (largeurs 500, 600, 670 mm, à confirmer) ; 0,6 mm par défaut. Compte rendu : `docs/lot-couverture/point-8.md`.
 */
const CAS: Metier[] = [
  {
    nom: "Bavette de plomb de 40 cm",
    ref: ROOFING_REFERENTIAL,
    metier: "couverture",
    bench: [{ ref: "1", designation: "Bavette plomb largeur 40 cm", quantity: "8", unit: "ml" }],
    questions: [],
    couleurs: { vert: 0, orange: 1, gris: 0 },
  },
  {
    nom: "Bande cuivre de 33",
    ref: ROOFING_REFERENTIAL,
    metier: "couverture",
    bench: [{ ref: "1", designation: "Bande cuivre dév. 33", quantity: "12", unit: "ml" }],
    questions: ["Bandes cuivre : tu les façonnes toi-même ou tu les commandes façonnées ?"],
    couleurs: { vert: 0, orange: 1, gris: 0 },
  },
];

describeLot({
  suite: "lot couverture, point 8 : plomb et cuivre",
  titre: "Lot couverture, point 8 : plomb et cuivre (§12)",
  fichier: "lot-couverture/point-8.md",
  test: "lot-couverture-8.test.ts",
  colonne: "Devis de test",
  intro: "Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),",
  paquet: CAS,
});

const u = (value: string, unit = "u") => ({ value, unit });

describe("plomb et cuivre : rouleaux de plomb, cuivre comme le zinc", () => {
  it("plomb sans largeur : 30 cm, 1,5 mm, rouleaux de 6 m à confirmer ; la largeur et l'épaisseur lues l'emportent", () => {
    const sans = readQuote([{ ref: "1", designation: "Solin plomb", quantity: "5", unit: "ml" }]);
    expect(sans.toBuy.map((b) => [b.label, b.quantity])).toEqual([["Plomb laminé 1,5 mm, rouleau largeur 30 cm × 6 m", "1 rouleau"]]);
    const lu = readQuote([{ ref: "1", designation: "Bande de plomb largeur 50 cm ép. 2 mm", quantity: "12", unit: "ml" }]);
    expect(lu.toBuy.map((b) => [b.label, b.quantity])).toEqual([["Plomb laminé 2 mm, rouleau largeur 50 cm × 6 m", "3 rouleaux"]]); // 12 × 1,1 / 6 = 2,2
  });

  it("cuivre commandé façonné : longueurs de 2 m ; façonné sur place court : feuilles 2 × 1 m ; long : bobine au mètre à sa largeur", () => {
    const faconne = readQuote([{ ref: "1", designation: "Bande cuivre dév. 33", quantity: "12", unit: "ml" }], { "param:faconnage": u("2") });
    expect(faconne.toBuy.map((b) => [b.label, b.quantity])).toEqual([["Bandes cuivre façonnées 0,6 mm", "7 longueurs de 2 m"]]); // 13,2 / 1,9
    const court = readQuote([{ ref: "1", designation: "Couvertine cuivre dév. 40", quantity: "4", unit: "ml" }], { "param:faconnage": u("1") });
    expect(court.toBuy.map((b) => [b.label, b.quantity])).toEqual([["Feuilles cuivre 2 × 1 m, 0,6 mm", "1 pièce"]]); // 4,4 × 0,4 / 2
    const long = readQuote([{ ref: "1", designation: "Bande cuivre dév. 33", quantity: "12", unit: "ml" }], { "param:faconnage": u("1") });
    expect(long.toBuy.map((b) => b.label)).toEqual(["Cuivre en bobine largeur 500 mm, 0,6 mm"]);
    // Une bande zinc du même devis garde son développé à elle.
    expect(ROOFING_REFERENTIAL.workItems.find((w) => w.id === "bandes-cuivre")!.params.some((p) => p.key === "developpe")).toBe(false);
  });
});
