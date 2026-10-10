import { describe, expect, it } from "vitest";
import { checkReferential, ROOFING_REFERENTIAL, supplierTest } from "../src/index.js";
import { readQuote } from "./support/read-quote.js";

/**
 * JOINT DEBOUT (référentiel §7, §36, §40.2) : « 91 m² de joint debout » ne passe pas le test du
 * fournisseur. BatiClair demande d'abord « tu façonnes toi-même ou tu commandes façonné ? » :
 * bobines de zinc au mètre linéaire d'un côté (jamais au kg, retour du fondateur 2026-10-04), bacs à la longueur du rampant de l'autre. Jamais de quantité demandée.
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
    // RÈGLE NUMÉRO UN : seul ce que le devis écrit sort. Les voliges (ligne z3) se calculent déjà (91 × 1,05) ; pattes et
    // pointes, absentes du devis, ne sortent pas (avant : 519 coulissantes, 173 fixes, 1 384 pointes ajoutées d'office).
    // §49.2.5 : la couverture attend sa réponse (façonnage) : elle sort orange « Info manquante », sans quantité (jamais
    // de m² au comptoir).
    expect(bought(v)).toEqual({ "Couverture zinc à joint debout": null, "Voliges sapin 18×200 mm traité": "96 m²" });
  });

  it("« je façonne » : de la bobine au mètre linéaire, jamais au kg : 39 bacs × (5,5 m + 15 cm de surlongueur) = 221 ml de bobine 500 mm en bord de mer", () => {
    const v = readQuote(DEVIS, { "param:faconnage": { value: "1", unit: "u" }, "param:consommables": { value: "0", unit: "u" } });
    expect(v.questions.filter((d) => d.question?.key === "param:faconnage")).toEqual([]);
    expect(bought(v)["Bobine zinc naturel 0,65 mm, largeur 500 mm"]).toBe("221 ml");
    expect(JSON.stringify(v.toBuy)).not.toMatch(/\bkg\b/);
    expect(bought(v)["Bacs joint debout zinc"]).toBeUndefined();
    expect(v.assumptions.map((a) => `${a.key}=${a.value}`)).toEqual(expect.arrayContaining(["param:epaisseur_zinc=0,65", "derived:largeur_bobine=500", "param:zone=3"]));
    // 0,70 mm : la longueur ne change pas ; l'épaisseur part dans « Le chantier en bref ».
    const thick = readQuote(DEVIS, { "param:faconnage": { value: "1", unit: "u" }, "param:epaisseur_zinc": { value: "0.7", unit: "mm" } });
    expect(bought(thick)["Bobine zinc naturel 0,70 mm, largeur 500 mm"]).toBe("221 ml");
    expect(v.canValidate).toBe(true); // le voligeage du devis est reconnu (§7) : plus rien à confirmer
  });

  it("« je commande façonné » : des bacs à la longueur du rampant (91 m² / 5,5 m = 16,5 m de pan ÷ 0,43 = 39 bacs)", () => {
    const v = readQuote(DEVIS, { "param:faconnage": { value: "2", unit: "u" } });
    expect(bought(v)["Bacs joint debout zinc naturel 0,65 mm, longueur 5,65 m"]).toBe("39 bacs");
    expect(bought(v)["Bobine zinc naturel 0,65 mm, largeur 500 mm"]).toBeUndefined();
    expect(v.assumptions.map((a) => `${a.key}=${a.value}`)).toEqual(expect.arrayContaining(["param:longueur_rampant=5,5", "derived:entraxe_joints=430"]));
    // Intérieur des terres : bobine 650, entraxe 580 → 16,5 / 0,58 = 29 bacs ; pas de pattes, le devis n'en écrit pas.
    const inland = readQuote(DEVIS, { "param:faconnage": { value: "2", unit: "u" }, "param:zone": { value: "1", unit: "u" } });
    expect(bought(inland)).toEqual({ "Bacs joint debout zinc naturel 0,65 mm, longueur 5,65 m": "29 bacs", "Voliges sapin 18×200 mm traité": "96 m²" });
  });

  it("chaque ligne commandée passe le test du fournisseur", () => {
    for (const answer of ["1", "2"]) {
      const v = readQuote(DEVIS, { "param:faconnage": { value: answer, unit: "u" } });
      for (const b of v.toBuy) expect(supplierTest(b.label, b.order?.unit ?? null)).toBeNull();
    }
    expect(checkReferential(ROOFING_REFERENTIAL)).toEqual([]);
  });
});
