import { describe, expect, it } from "vitest";
import { readQuote } from "./support/read-quote.js";

/**
 * ZINC FAÇONNÉ, CONDITIONNEMENT PAR OUVRAGE (§48.6, fondateur, 2026-10-06) : « Bobineau uniquement pour les ouvrages
 * continus : joint debout, terrasse à tasseaux, chéneaux. Feuilles de zinc 2 m × 1 m pour tout le reste des pièces
 * façonnées : bandes porte-solin, bandes de rive, abergements, couvre-joints, faîtage… Estimation approximative des
 * feuilles d'après le développé : une feuille 2 × 1 m avec un développé de 25 cm donne 4 bandes dans la longueur du
 * mètre, soit 8 m par feuille ; 8 m de porte-solin ⇒ 1 feuille. » Remplace la règle « bobineau au-delà de 6 ml ».
 */
const u = (value: string, unit = "u") => ({ value, unit });
const bande = (ml: string, designation = "Bande zinc de rive") => [{ ref: "1", designation, quantity: ml, unit: "ml" }];
type V = ReturnType<typeof readQuote>;
const zinc = (v: V) => v.toBuy.filter((b) => /bobineau|feuille/i.test(b.label)).map((b) => [b.label, b.quantity, b.precision]);
const estimation = (ml: string, dev: string, what = "bande") => `pour ${ml} ml de ${what} : estimation d'après un développé de ${dev} cm, ajuste selon ton façonnage`;

describe("§48.6 : une pièce façonnée sur place = des feuilles 2 × 1 m, jamais un bobineau", () => {
  it("8 m de porte-solin, développé 25 cm : 1 feuille (4 bandes de 2 m par feuille), le raisonnement dit en clair", () => {
    const v = readQuote(bande("8", "Bande porte-solin zinc"), { "param:faconnage": u("1"), "param:developpe": u("250", "mm") });
    expect(zinc(v)).toEqual([["Feuilles zinc naturel 2 × 1 m, 0,65 mm", "1 pièce", estimation("8", "25", "porte-solin")]]);
  });

  it("13 ml de bande, développé 25 cm : 2 feuilles ; développé 33 cm : 3 bandes par feuille, 3 feuilles", () => {
    expect(zinc(readQuote(bande("13", "Bande zinc d'égout"), { "param:faconnage": u("1"), "param:developpe": u("250", "mm") }))).toEqual([
      ["Feuilles zinc naturel 2 × 1 m, 0,65 mm", "2 pièces", estimation("13", "25")],
    ]);
    expect(zinc(readQuote(bande("13", "Bande zinc d'égout"), { "param:faconnage": u("1"), "param:developpe": u("330", "mm") }))[0]![1]).toBe("3 pièces");
  });

  it("35 ml de bande : toujours des feuilles, jamais de bobineau ; l'épaisseur du chantier est écrite comme au comptoir", () => {
    const v = readQuote(bande("35"), { "param:faconnage": u("1"), "param:developpe": u("250", "mm"), "param:epaisseur_zinc": u("0.8", "mm") });
    expect(zinc(v)).toEqual([["Feuilles zinc naturel 2 × 1 m, 0,80 mm", "5 pièces", estimation("35", "25")]]);
  });

  it("commandé façonné : ni feuille ni bobineau, des bandes en longueurs de 2 m, au développé demandé", () => {
    const v = readQuote(bande("13"), { "param:faconnage": u("2") });
    expect(zinc(v)).toEqual([]);
    expect(v.questions.map((q) => q.key)).toContain("engine:param:developpe");
  });

  it("abergement de cheminée : 2 × 4 m × 1,3 = 10,4 ml de zinc, développé 33 cm → 2 feuilles", () => {
    const v = readQuote([{ ref: "1", designation: "Abergement de cheminée zinc", quantity: "2", unit: "u" }], { "param:faconnage": u("1"), "param:perimetre_cheminee": u("4", "m") });
    expect(zinc(v).map(([label, quantity]) => [label, quantity])).toEqual([["Feuilles zinc naturel 2 × 1 m, 0,65 mm", "2 pièces"]]);
  });
});
