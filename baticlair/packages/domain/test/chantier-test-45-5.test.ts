import { describe, expect, it } from "vitest";
import { supplierTest } from "../src/index.js";
import { readQuote } from "./support/read-quote.js";

/**
 * CHANTIER TEST (§45.5, retour du fondateur) : zinc à joint debout 91 m² en monopente à Brest, rampant 7 m,
 * largeur 13 m, voligeage, bande zinc d'égout 13 ml, gouttière 13 ml. Ce que le comptoir sert, ligne à ligne.
 */
const TEST = [
  { ref: "1", designation: "Couverture zinc à joint debout prépatiné gris quartz 0,65 mm, monopente, rampant 7 m, largeur 13 m", quantity: "91", unit: "m²" },
  { ref: "2", designation: "Voligeage en sapin traité 18×200 mm", quantity: "91", unit: "m²" },
  { ref: "3", designation: "Bande zinc d'égout", quantity: "13", unit: "ml" },
  { ref: "4", designation: "Gouttière zinc demi-ronde", quantity: "13", unit: "ml" },
];
const u = (value: string, unit = "u") => ({ value, unit });
// Les réponses de Greg : il façonne, 2 descentes en Ø 80, développé 33 cm (bande et gouttière), crochets bandeau.
const REPONSES = {
  "param:faconnage": u("1"),
  "param:nb_descentes": u("2"),
  "param:developpe": u("330", "mm"),
  "param:developpe_gouttiere": u("33", "cm"),
  "param:fixation_crochet": u("2"),
  "param:diametre_descente": u("80", "mm"),
};
const line = (v: ReturnType<typeof readQuote>, label: string) => v.toBuy.find((b) => b.label.startsWith(label));

describe("chantier Test : les corrections du §45.5", () => {
  it("gouttière 13 ml : « 4 longueurs de 4 m (13 ml à couvrir) », jamais « soit 13 ml »", () => {
    const g = line(readQuote(TEST, REPONSES), "Gouttière zinc demi-ronde dév. 33")!;
    expect(`${g.quantity} (${g.approx})`).toBe("4 longueurs de 4 m (13 ml à couvrir)");
    expect(JSON.stringify(g)).not.toMatch(/soit/);
  });

  it("RÈGLE NUMÉRO UN : ni pattes ni pointes, le devis n'en écrit pas (avant : 519 coulissantes, 173 fixes, 1 384 pointes d'office)", () => {
    const v = readQuote(TEST, REPONSES);
    for (const absent of ["Pattes coulissantes", "Pattes fixes", "Pointes annelées", "Pattes de fixation"]) expect(line(v, absent)).toBeUndefined();
  });

  it("bandes zinc commandées façonnées : en longueurs de 2 m, avec ce qu'elles couvrent", () => {
    const v = readQuote(TEST, { ...REPONSES, "param:faconnage": u("2") });
    expect(line(v, "Bandes façonnées Quartz-Zinc 0,65 mm")).toMatchObject({ quantity: "8 longueurs de 2 m", precision: "13 ml à couvrir, développé 33 cm" });
  });

  it("égout et faîtage absents du devis : ni question, ni ligne, ni suggestion (règle numéro un)", () => {
    const v = readQuote(TEST, REPONSES);
    expect(v.questions.map((d) => d.question?.key)).not.toContain("param:egout_faitage");
    expect(v.suggestions).toEqual([]);
    expect(line(v, "Faîtage")).toBeUndefined();
    expect(readQuote(TEST.filter((l) => l.ref !== "3"), REPONSES).suggestions).toEqual([]);
  });

  it("bande de 13 ml façonnée sur place : des feuilles 2 × 1 m estimées d'après le développé (§48.6), jamais un bobineau", () => {
    const v = readQuote(TEST, REPONSES);
    expect(line(v, "Feuilles")).toMatchObject({
      label: "Feuilles Quartz-Zinc 2 × 1 m, 0,65 mm",
      quantity: "3 pièces",
      precision: "pour 13 ml de bande : estimation d'après un développé de 33 cm, ajuste selon ton façonnage",
    });
    expect(line(v, "Bobineau")).toBeUndefined();
  });

  it("descentes absentes du devis : une question, jamais une quantité d'office", () => {
    const { "param:nb_descentes": _n, ...sansDescentes } = REPONSES;
    const v = readQuote(TEST, sansDescentes);
    expect(v.questions.map((d) => d.question?.key)).toContain("param:nb_descentes");
    expect(line(v, "Naissances")).toBeUndefined();
  });

  it("rien d'absent du devis, pas même en suggestion (ni silicone, ni vis) ; une ligne « mastic » du devis reste la sienne", () => {
    const v = readQuote(TEST, REPONSES);
    expect(v.suggestions).toEqual([]);
    expect(v.toBuy.map((b) => b.label)).not.toContain("Cartouches de silicone zinc");
    const avecMastic = readQuote([...TEST, { ref: "5", designation: "Mastic colle polyuréthane 310 ml", quantity: "2", unit: "u" }], REPONSES);
    expect(avecMastic.toBuy.map((b) => `${b.label} : ${b.quantity}`)).toContain("Mastic colle polyuréthane 310 ml : 2 pièces");
    expect(line(avecMastic, "Feuilles")?.quantity).toBe("3 pièces");
  });

  it("toutes les réponses données : plus de question, rien à chiffrer, chaque ligne passe le test du fournisseur", () => {
    const v = readQuote(TEST, REPONSES);
    expect(v.questions).toEqual([]);
    expect(v.toQuote).toEqual([]);
    for (const b of v.toBuy) expect(supplierTest(b.label, b.order?.unit ?? null)).toBeNull();
  });
});
