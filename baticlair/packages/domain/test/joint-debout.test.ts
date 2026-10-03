import { describe, expect, it } from "vitest";
import { checkReferential, ROOFING_REFERENTIAL, supplierTest } from "../src/index.js";
import { readQuote } from "./support/read-quote.js";

/**
 * JOINT DEBOUT (référentiel §7, §36, §40.2) : « 91 m² de joint debout » ne passe pas le test du
 * fournisseur. BatiClair demande d'abord « tu façonnes toi-même ou tu commandes façonné ? » :
 * bobines de zinc en kg d'un côté, bacs à la longueur du rampant de l'autre. Jamais de quantité demandée.
 */
const DEVIS = [
  { ref: "z1", designation: "Couverture zinc joint debout", quantity: "91", unit: "m²" },
  { ref: "z3", designation: "Voligeage en sapin traité 18×200 mm", quantity: "91", unit: "m²" },
];
const bought = (v: ReturnType<typeof readQuote>) => Object.fromEntries(v.toBuy.map((b) => [b.label, b.quantity]));

describe("joint debout : la question de façonnage, puis des lignes que le fournisseur peut charger", () => {
  it("à l'ouverture : UNE question, « tu façonnes ? », à boutons ; rien n'est commandé en m²", () => {
    const v = readQuote(DEVIS);
    expect(v.understood).toEqual(["Couverture zinc à joint debout : 91 m²"]);
    const q = v.questions.find((d) => d.question?.key === "param:faconnage")!;
    expect(q.question).toMatchObject({
      kind: "param",
      text: "Tu façonnes tes bacs toi-même, ou tu les commandes façonnés ?",
      options: [
        { label: "Je façonne (bobines)", value: "1" },
        { label: "Je commande façonné (bacs)", value: "2" },
      ],
    });
    for (const d of v.questions) expect(d.text).not.toMatch(/quelle quantité|combien de m²|combien de kg/i);
    expect(bought(v)["Couverture zinc joint debout"]).toBeUndefined();
    // Le reste se calcule déjà : pattes (91 × 7,6, rampant 5,5 m, zone 3) et voliges (91 × 1,05).
    expect(bought(v)).toMatchObject({ "Pattes de fixation": "692 pièces", "Voliges sapin 18 mm": "96 m²" });
  });

  it("« je façonne » : des bobines de zinc en kg (91 × 5,5 = 500,5 kg), largeur 500 mm en bord de mer", () => {
    const v = readQuote(DEVIS, { "param:faconnage": { value: "1", unit: "u" } });
    expect(v.questions.filter((d) => d.question?.key === "param:faconnage")).toEqual([]);
    expect(bought(v)["Zinc naturel en bobine"]).toBe("501 kg");
    expect(bought(v)["Bacs joint debout zinc"]).toBeUndefined();
    expect(v.assumptions.map((a) => `${a.key}=${a.value}`)).toEqual(expect.arrayContaining(["param:epaisseur_zinc=0,65", "derived:largeur_bobine=500", "param:zone=3"]));
    // 0,70 mm : 6 kg/m².
    const thick = readQuote(DEVIS, { "param:faconnage": { value: "1", unit: "u" }, "param:epaisseur_zinc": { value: "0.7", unit: "mm" } });
    expect(bought(thick)["Zinc naturel en bobine"]).toBe("546 kg");
    expect(v.canValidate).toBe(false); // le voligeage du devis reste à confirmer (article inconnu)
  });

  it("« je commande façonné » : des bacs à la longueur du rampant (91 m² / 5,5 m = 16,5 m de pan ÷ 0,43 = 39 bacs)", () => {
    const v = readQuote(DEVIS, { "param:faconnage": { value: "2", unit: "u" } });
    expect(bought(v)["Bacs joint debout zinc"]).toBe("39 pièces");
    expect(bought(v)["Zinc naturel en bobine"]).toBeUndefined();
    expect(v.assumptions.map((a) => `${a.key}=${a.value}`)).toEqual(expect.arrayContaining(["param:longueur_rampant=5,5", "derived:entraxe_joints=430"]));
    // Intérieur des terres : bobine 650, entraxe 580 → 16,5 / 0,58 = 29 bacs ; pattes 91 × 5,6 = 510.
    const inland = readQuote(DEVIS, { "param:faconnage": { value: "2", unit: "u" }, "param:zone": { value: "1", unit: "u" } });
    expect(bought(inland)).toMatchObject({ "Bacs joint debout zinc": "29 pièces", "Pattes de fixation": "510 pièces" });
  });

  it("chaque ligne commandée passe le test du fournisseur", () => {
    for (const answer of ["1", "2"]) {
      const v = readQuote(DEVIS, { "param:faconnage": { value: answer, unit: "u" } });
      for (const b of v.toBuy) expect(supplierTest(b.label, b.order?.unit ?? null)).toBeNull();
    }
    expect(checkReferential(ROOFING_REFERENTIAL)).toEqual([]);
  });
});
