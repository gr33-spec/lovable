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

  it("pattes fixes et pattes coulissantes en deux lignes, pointes à part (2 par patte)", () => {
    const v = readQuote(TEST, REPONSES);
    expect(line(v, "Pattes coulissantes")).toMatchObject({ quantity: "519 pièces", precision: "pour bobine 500 mm" });
    expect(line(v, "Pattes fixes")).toMatchObject({ quantity: "173 pièces", precision: "pour bobine 500 mm, zone fixe de chaque bac" });
    expect(line(v, "Pointes annelées 2,5 × 28 mm")).toMatchObject({ quantity: "1 384 pièces", precision: "2 par patte, sur volige 18 mm" });
    expect(line(v, "Pattes de fixation")).toBeUndefined();
  });

  it("bandes zinc commandées façonnées : en longueurs de 2 m, avec ce qu'elles couvrent", () => {
    const v = readQuote(TEST, { ...REPONSES, "param:faconnage": u("2") });
    expect(line(v, "Bandes façonnées Quartz-Zinc 0,65 mm")).toMatchObject({ quantity: "8 longueurs de 2 m", precision: "13 ml à couvrir, développé 33 cm" });
  });

  it("égout et faîtage (§47.8) : jamais une question, proposés dans « On ajoute ? » ; l'égout déjà au devis n'est pas reproposé", () => {
    const v = readQuote(TEST, REPONSES);
    expect(v.questions.map((d) => d.question?.key)).not.toContain("param:egout_faitage");
    // Le devis cite la bande d'égout : seul le faîtage est proposé, avec le zinc du chantier.
    expect(v.suggestions.map((s) => `${s.label} : ${s.quantity}`)).toContain("Faîtage Quartz-Zinc 0,65 mm, bande dév. 33 cm : 5 longueurs de 3 m");
    expect(v.suggestions.map((s) => s.label).some((l) => l.startsWith("Bandes d'égout"))).toBe(false);
    expect(line(v, "Faîtage")).toBeUndefined();
    // Sans ligne d'égout au devis : l'égout est proposé aussi.
    const sansEgout = readQuote(TEST.filter((l) => l.ref !== "3"), REPONSES);
    expect(sansEgout.suggestions.map((s) => `${s.label} : ${s.quantity}`)).toContain("Bandes d'égout Quartz-Zinc 0,65 mm, dév. 33 cm : 8 longueurs de 2 m");
  });

  it("bande de 13 ml façonnée sur place : un bobineau (plus de 6 ml), toujours avec son usage", () => {
    const f = line(readQuote(TEST, REPONSES), "Bobineau")!;
    expect(f).toMatchObject({ label: "Bobineau Quartz-Zinc 500 × 17 m, 0,65", quantity: "1 pièce", precision: "pour façonner 13 ml de bande" });
    expect(line(readQuote(TEST, REPONSES), "Feuilles zinc 2 × 1 m")).toBeUndefined();
  });

  it("descentes absentes du devis : une question, jamais une quantité d'office", () => {
    const { "param:nb_descentes": _n, ...sansDescentes } = REPONSES;
    const v = readQuote(TEST, sansDescentes);
    expect(v.questions.map((d) => d.question?.key)).toContain("param:nb_descentes");
    expect(line(v, "Naissances")).toBeUndefined();
  });

  it("§45.8 « On ajoute ? » : silicone zinc et vis inox proposés avec une quantité, jamais ajoutés d'office ; une ligne « mastic » du devis reste la sienne", () => {
    const v = readQuote(TEST, REPONSES);
    expect(v.suggestions.map((s) => `${s.label} : ${s.quantity}`)).toEqual([
      "Cartouches de silicone zinc : 2 cartouches",
      "Vis inox 4 × 40 : 1 boîte de 200",
      "Faîtage Quartz-Zinc 0,65 mm, bande dév. 33 cm : 5 longueurs de 3 m",
    ]);
    expect(v.toBuy.map((b) => b.label)).not.toContain("Cartouches de silicone zinc");
    const avecMastic = readQuote([...TEST, { ref: "5", designation: "Mastic colle polyuréthane 310 ml", quantity: "2", unit: "u" }], REPONSES);
    expect(avecMastic.toBuy.map((b) => `${b.label} : ${b.quantity}`)).toContain("Mastic colle polyuréthane 310 ml : 2 pièces");
    expect(line(avecMastic, "Bobineau")?.quantity).toBe("1 pièce");
  });

  it("toutes les réponses données : plus de question, rien à chiffrer, chaque ligne passe le test du fournisseur", () => {
    const v = readQuote(TEST, REPONSES);
    expect(v.questions).toEqual([]);
    expect(v.toQuote).toEqual([]);
    for (const b of v.toBuy) expect(supplierTest(b.label, b.order?.unit ?? null)).toBeNull();
  });
});
