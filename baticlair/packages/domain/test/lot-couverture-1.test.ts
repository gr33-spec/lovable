import { describe, expect, it } from "vitest";
import { ROOFING_REFERENTIAL } from "../src/index.js";
import { describeLot, type Metier } from "./support/paquet.js";
import { readQuote } from "./support/read-quote.js";
import { readQuoteComplet } from "./support/complet.js";

/**
 * LOT COUVERTURE, POINT 1 : noues et arêtiers (§3, §5, §7, §25.2). Noue zinc commandée façonnée en longueurs de 2 m
 * (longueur utile 1,85 m), ou façonnée sur place (feuilles 2 × 1 m, bobineau au-delà de 6 ml), au développé du devis
 * (noue préformée de 50 sinon). Arêtier en tuiles (arêtières, closoir de 23 cm, crochets, abouts) ou en bande zinc
 * (longueurs de 2 m depuis le 2026-11-19, avant 3 m ; pattes 3/ml) : lu dans la ligne ou sur la couverture du devis, sinon demandé avec les mots du
 * comptoir. Compte rendu : `docs/lot-couverture/point-1.md`, tableau de Brest compris.
 */
const CAS: Metier[] = [
  {
    nom: "Tuiles, quatre arêtiers et une noue",
    ref: ROOFING_REFERENTIAL,
    metier: "couverture",
    bench: [
      { ref: "1", designation: "Couverture tuiles HP10 terre cuite", quantity: "120", unit: "m²" },
      { ref: "2", designation: "Arêtiers, toit à 4 pans", quantity: "24", unit: "ml" },
      { ref: "3", designation: "Noue zinc", quantity: "8", unit: "ml" },
    ],
    questions: ["Tes pièces pliées (rive, bandes, noue, faîtage…) : tu les plies toi-même, ou tu les achètes toutes faites ?", "J'ai identifié : Tuiles HP10. C'est bien ce modèle ?"],
    couleurs: { vert: 1, orange: 2, gris: 0 },
  },
  {
    nom: "Ardoises, arêtier zinc et noue de 66",
    ref: ROOFING_REFERENTIAL,
    metier: "couverture",
    bench: [
      { ref: "1", designation: "Couverture en ardoises naturelles 30x22 posées au crochet", quantity: "150", unit: "m²" },
      { ref: "2", designation: "Arêtier zinc dév. 33", quantity: "10", unit: "ml" },
      { ref: "3", designation: "Noue encaissée zinc", quantity: "4", unit: "ml" },
    ],
    // Dans l'ordre du calcul (Greg, 20 novembre 2026 : les questions sont décidées par le code).
    // Règle changée (Greg, 21 novembre 2026) : avant, deux questions → l'égout se demande quand aucune gouttière n'est écrite.
    // Tant qu'elle attend, les ardoises n'ont pas de chiffre et la ligne des crochets (un par ardoise) n'est pas encore là :
    // 2 lignes orange au lieu de 3. Répondu « Oui » : 150 m² + 10 m d'arêtier × 0,66 + 4 m de noue × 0,50 = 158,6 m² ;
    // × 42,5 = 6 740,5 ; + 5 % = 7 077,5 → 7 078 ardoises (avant 6 694).
    questions: ["Tes m² d'ardoise comprennent déjà l'égout et les coupes ?", "Tes pièces pliées (rive, bandes, noue, faîtage…) : tu les plies toi-même, ou tu les achètes toutes faites ?", "Quelle ardoise : Espagne 1er choix, ou ardoise NF (type Cupa) ?"],
    couleurs: { vert: 0, orange: 2, gris: 1 },
  },
];

describeLot({
  suite: "lot couverture, point 1 : noues et arêtiers",
  titre: "Lot couverture, point 1 : noues et arêtiers (§3, §5, §7, §25.2)",
  fichier: "lot-couverture/point-1.md",
  test: "lot-couverture-1.test.ts",
  colonne: "Devis de test",
  intro: "Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),",
  paquet: CAS,
});

const u = (value: string, unit = "u") => ({ value, unit });
const labels = (v: ReturnType<typeof readQuote>) => v.toBuy.map((b) => `${b.label} : ${b.quantity}`);

describe("noues et arêtiers : les règles du fondateur", () => {
  it("noue commandée façonnée : longueurs de 2 m à 1,85 m utile (§25.2), au développé lu", () => {
    const v = readQuoteComplet([{ ref: "1", designation: "Noue zinc dév. 66", quantity: "12", unit: "ml" }], { "param:faconnage": u("2") });
    expect(v.questions).toEqual([]);
    const noue = v.toBuy.find((b) => /^Noues/.test(b.label))!;
    expect(noue.label).toBe("Noues zinc naturel 0,65 mm, dév. 66");
    expect(noue.quantity).toBe("7 longueurs de 2 m"); // 12 / 1,85 = 6,5 → 7
  });

  it("noue façonnée sur place : feuilles 2 × 1 m estimées d'après le développé (§48.6), jamais un bobineau ; noue de 50 par défaut, dite", () => {
    // Développé 50 cm : 2 bandes de 2 m par feuille, soit 4 m par feuille.
    const court = readQuoteComplet([{ ref: "1", designation: "Noue zinc", quantity: "4", unit: "ml" }], { "param:faconnage": u("1") });
    expect(court.toBuy.map((b) => [b.label, b.quantity])).toEqual([["Feuilles zinc naturel 2 × 1 m, 0,65 mm", "1 pièce"]]);
    expect(court.assumptions.map((a) => a.key)).toContain("param:developpe_noue");
    const long = readQuoteComplet([{ ref: "1", designation: "Noue zinc", quantity: "12", unit: "ml" }], { "param:faconnage": u("1") });
    expect(long.toBuy.map((b) => [b.label, b.quantity])).toEqual([["Feuilles zinc naturel 2 × 1 m, 0,65 mm", "3 pièces"]]);
  });

  it("arêtier sur un toit de tuiles : arêtières 3/ml, closoir de 23 cm, un crochet par arêtière, un about par arêtier", () => {
    const v = readQuoteComplet(
      [
        { ref: "1", designation: "Couverture tuiles HP10 terre cuite", quantity: "120", unit: "m²" },
        { ref: "2", designation: "Arêtiers, 2 arêtiers", quantity: "12", unit: "ml" },
      ],
      {},
    );
    expect(v.questions.map((q) => q.question?.key)).not.toContain("param:aretier_matiere");
    const got = Object.fromEntries(v.toBuy.map((b) => [b.label, b.quantity]));
    expect(got).toMatchObject({ Arêtiers: "36 pièces", "Crochets d'arêtier": "36 pièces", "Abouts d'arêtier": "2 pièces" }); // 12 × 3 = 36 (fiche couverture, 2026-11-19 ; avant 2,9 : 35)
    expect(v.toBuy.find((b) => b.label === "Closoir d'arêtier")!.quantity).toBe("3 rouleaux de 5 m"); // 12 ml en rouleaux de 5 m
  });

  it("arêtier seul : le comptoir demande tuiles ou zinc ; en zinc, la bande de 25 ou de 33 et 3 pattes par mètre", () => {
    const before = readQuoteComplet([{ ref: "1", designation: "Arêtier", quantity: "9", unit: "ml" }]);
    expect(before.questions.map((q) => q.question?.text)).toContain("Arêtier en tuiles (arêtières) ou en bande zinc ?");
    // Banc du calcul (21 novembre 2026) : un arêtier en bande zinc est une pièce pliée ; la réponse « je plie » du devis vaut
    // pour lui. Commandé façonné : des bandes de 2 m (comme avant). Plié sur place : des feuilles 2 × 1 m.
    const plie = readQuoteComplet([{ ref: "1", designation: "Arêtier", quantity: "9", unit: "ml" }], { "param:aretier_matiere": u("2"), "param:developpe_aretier": u("330", "mm"), "param:faconnage@pieces-pliees": u("1") });
    expect(plie.toBuy.find((b) => b.label.startsWith("Feuilles"))!.quantity).toBe("2 pièces"); // 9 ml ÷ (2 m × 3 bandes de 33 dans 1 m) = 1,5 → 2
    const v = readQuoteComplet([{ ref: "1", designation: "Arêtier", quantity: "9", unit: "ml" }], { "param:aretier_matiere": u("2"), "param:developpe_aretier": u("330", "mm"), "param:faconnage@pieces-pliees": u("2") });
    expect(v.questions).toEqual([]);
    expect(labels(v)).toEqual(expect.arrayContaining([expect.stringMatching(/^Arêtier zinc naturel 0,65 mm, bande dév\. 33/), expect.stringMatching(/^Pattes de fixation/)]));
    expect(v.toBuy.find((b) => b.label.startsWith("Arêtier zinc"))!.quantity).toBe("5 longueurs de 2 m"); // 9 × 1,05 = 9,45 ml en longueurs de 2 m (fiche couverture, 2026-11-19 ; avant 3 m)
    expect(v.toBuy.find((b) => b.label.startsWith("Pattes"))!.quantity).toBe("27 pièces");
  });
});
