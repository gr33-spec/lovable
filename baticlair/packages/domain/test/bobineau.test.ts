import { describe, expect, it } from "vitest";
import { readQuote } from "./support/read-quote.js";

/**
 * BOBINEAU (réponse du fondateur, 2026-10-04) : « largeurs 500, 650 et 1 000 mm ; longueurs 17, 21, 31 m (40 m en
 * 500) ; épaisseurs 0,65 par défaut, 0,70 et 0,80. Vendu à la pièce, désignation "bobineau 650 × 31 m, 0,65". Je le
 * prends pour les bandes façonnées (égout, rive, faîtage, noue, solin) à la place des feuilles 2 × 1 m dès que la
 * longueur dépasse 6 ml. »
 */
const u = (value: string, unit = "u") => ({ value, unit });
const bande = (ml: string, designation = "Bande zinc de rive") => [{ ref: "1", designation, quantity: ml, unit: "ml" }];
type V = ReturnType<typeof readQuote>;
const zinc = (v: V) => v.toBuy.filter((b) => /bobineau|feuille/i.test(b.label)).map((b) => [b.label, b.quantity, b.precision]);

describe("bobineau au-delà de 6 ml de bande façonnée sur place", () => {
  it("6 ml : des feuilles 2 × 1 m, avec leur usage", () => {
    expect(zinc(readQuote(bande("6"), { "param:faconnage": u("1"), "param:developpe": u("250", "mm") }))).toEqual([["Feuilles zinc naturel 2 × 1 m, 0,65 mm", "1 pièce", "pour façonner 6 ml de bande, développé 25 cm"]]);
  });

  it("13 ml (chantier Test) : un bobineau 500 × 17 m, 0,65 — sans demander le développé (500 mm le contient)", () => {
    const v = readQuote(bande("13", "Bande zinc d'égout"), { "param:faconnage": u("1") });
    expect(zinc(v)).toEqual([["Bobineau zinc naturel 500 × 17 m, 0,65", "1 pièce", "pour façonner 13 ml de bande"]]);
    expect(v.questions.map((q) => q.key)).not.toContain("engine:param:developpe");
  });

  it("la plus courte longueur qui couvre (marge 10 % comprise) : 18 ml → 19,8 m → 21 m ; 25 ml → 31 m ; 35 ml → 40 m en 500", () => {
    const label = (ml: string) => zinc(readQuote(bande(ml), { "param:faconnage": u("1") }))[0]![0];
    expect(label("18")).toBe("Bobineau zinc naturel 500 × 21 m, 0,65");
    expect(label("25")).toBe("Bobineau zinc naturel 500 × 31 m, 0,65");
    expect(label("35")).toBe("Bobineau zinc naturel 500 × 40 m, 0,65");
  });

  it("l'épaisseur du chantier est écrite comme au comptoir : 0,70, 0,80", () => {
    expect(zinc(readQuote(bande("13"), { "param:faconnage": u("1"), "param:epaisseur_zinc": u("0.8", "mm") }))[0]![0]).toBe("Bobineau zinc naturel 500 × 17 m, 0,80");
  });

  it("commandé façonné : jamais de bobineau, des bandes en longueurs de 2 m, au développé demandé", () => {
    const v = readQuote(bande("13"), { "param:faconnage": u("2") });
    expect(zinc(v)).toEqual([]);
    expect(v.questions.map((q) => q.key)).toContain("engine:param:developpe");
  });

  it("abergement de cheminée : 2 × 4 m × 1,3 = 10,4 ml de zinc → bobineau 500 × 17 m", () => {
    const v = readQuote([{ ref: "1", designation: "Abergement de cheminée zinc", quantity: "2", unit: "u" }], { "param:faconnage": u("1"), "param:perimetre_cheminee": u("4", "m") });
    expect(zinc(v)).toEqual([["Bobineau zinc naturel 500 × 17 m, 0,65", "1 pièce", "pour façonner 10,4 ml d'abergement, développé 33 cm"]]);
  });
});
