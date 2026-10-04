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
const REPONSES = { "param:faconnage": u("1"), "param:egout_faitage": u("2"), "param:nb_descentes": u("2"), "param:developpe": u("330", "mm") };
const line = (v: ReturnType<typeof readQuote>, label: string) => v.toBuy.find((b) => b.label.startsWith(label));

describe("chantier Test : les corrections du §45.5", () => {
  it("gouttière 13 ml : « 4 longueurs de 4 m (13 ml à couvrir) », jamais « soit 13 ml »", () => {
    const g = line(readQuote(TEST, REPONSES), "Gouttière")!;
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
    expect(line(v, "Bandes zinc façonnées")).toMatchObject({ quantity: "8 longueurs de 2 m", precision: "13 ml à couvrir, développé 33 cm" });
  });

  it("égout et faîtage : une question à boutons, jamais comptés d'office", () => {
    const sans = readQuote(TEST, { "param:faconnage": u("1"), "param:nb_descentes": u("2"), "param:developpe": u("330", "mm") });
    const q = sans.questions.find((d) => d.question?.key === "param:egout_faitage")!;
    expect(q.question?.options?.map((o) => o.label)).toEqual(["Égout et faîtage", "Faîtage seulement", "Égout seulement", "Déjà au devis"]);
    expect(line(sans, "Bandes d'égout")).toBeUndefined();
    const tout = readQuote(TEST, { ...REPONSES, "param:egout_faitage": u("3") });
    expect(line(tout, "Bandes d'égout zinc dév. 33 cm")).toMatchObject({ quantity: "8 longueurs de 2 m", precision: "13 ml d'égout à couvrir" });
    expect(line(tout, "Faîtage zinc")).toMatchObject({ quantity: "5 longueurs de 3 m", precision: "13 ml de faîtage à couvrir" });
    const rien = readQuote(TEST, { ...REPONSES, "param:egout_faitage": u("0") });
    expect(line(rien, "Bandes d'égout")).toBeUndefined();
    expect(line(rien, "Faîtage zinc")).toBeUndefined();
  });

  it("feuilles 2 × 1 m : toujours avec leur usage", () => {
    const f = line(readQuote(TEST, REPONSES), "Feuilles zinc 2 × 1 m")!;
    expect(f).toMatchObject({ quantity: "3 pièces", precision: "pour façonner 13 ml de bande, développé 33 cm" });
  });

  it("descentes absentes du devis : une question, jamais une quantité d'office", () => {
    const v = readQuote(TEST, { "param:faconnage": u("1"), "param:egout_faitage": u("2"), "param:developpe": u("330", "mm") });
    expect(v.questions.map((d) => d.question?.key)).toContain("param:nb_descentes");
    expect(line(v, "Naissances")).toBeUndefined();
  });

  it("toutes les réponses données : plus de question, rien à chiffrer, chaque ligne passe le test du fournisseur", () => {
    const v = readQuote(TEST, REPONSES);
    expect(v.questions).toEqual([]);
    expect(v.toQuote).toEqual([]);
    for (const b of v.toBuy) expect(supplierTest(b.label, b.order?.unit ?? null)).toBeNull();
  });
});
