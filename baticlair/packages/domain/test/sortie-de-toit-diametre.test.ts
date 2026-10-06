import { describe, expect, it } from "vitest";
import { readQuote } from "./support/read-quote.js";

/**
 * SORTIE DE TOIT (réponse du fondateur, 2026-10-04) : « une embase par sortie, adaptée à la couverture (embase plomb
 * pour ardoise et tuile, platine zinc soudée pour zinc), au diamètre du conduit, plus un chapeau. Collerette
 * d'étanchéité seulement pour un conduit de fumée (solin). Question à boutons Ø 80 / 100 / 125 / 150 / 180 ou VMC, plus
 * fumée / ventilation. »
 */
const ardoise = { ref: "1", designation: "Couverture ardoises naturelles 32×22 au crochet", quantity: "80", unit: "m²" };
const zinc = { ref: "1", designation: "Couverture zinc à joint debout 0,65 mm, rampant 7 m", quantity: "91", unit: "m²" };
const sortie = (designation: string, quantity = "1") => ({ ref: "2", designation, quantity, unit: "u" });
const mm = (value: string) => ({ value, unit: "mm" });
const u = (value: string) => ({ value, unit: "u" });
const ZINC = { "param:faconnage": u("1"), "param:egout_faitage": u("4") };
type V = ReturnType<typeof readQuote>;
const pieces = (v: V) => v.toBuy.filter((b) => /embase|platine|chapeau|collerette/i.test(b.label)).map((b) => [b.label, b.quantity, b.precision]);

describe("sortie de toit : embase ou platine, chapeau, collerette pour la fumée", () => {
  it("sans diamètre : la question à six boutons (Ø 80 à Ø 180, VMC), puis fumée ou ventilation", () => {
    const v = readQuote([ardoise, sortie("Sortie de toit Poujoulat")]);
    const q = v.questions.find((d) => d.key === "engine:param:diametre_sortie")!;
    expect(q.question!.options!.map((o) => o.label)).toEqual(["Ø 80", "Ø 100", "Ø 125", "Ø 150", "Ø 180", "VMC"]);
    expect(v.questions.map((d) => d.key)).toContain("engine:param:usage_sortie");
    // §49.2.5 : l'embase et le chapeau sortent quand même, orange « Info manquante » (le diamètre), jamais un Ø deviné.
    expect(pieces(v)).toEqual([
      ["Embase plomb de sortie de toit", "1 pièce", undefined],
      ["Chapeau de sortie de toit", "1 pièce", undefined],
    ]);
    const rows = v.screen.groups.flatMap((g) => g.rows).filter((r) => v.toBuy.some((b) => b.key === r.itemKey && /embase|chapeau/i.test(b.label)));
    for (const r of rows) expect(r).toMatchObject({ status: "check", reason: expect.stringMatching(/^Info manquante : diamètre/) });
  });

  it("ardoise, Ø 150, conduit de fumée : embase plomb, chapeau et collerette, le diamètre en précision", () => {
    const v = readQuote([ardoise, sortie("Sortie de toit Poujoulat")], { "param:diametre_sortie": mm("150"), "param:usage_sortie": u("1") });
    expect(pieces(v)).toEqual([
      ["Embase plomb de sortie de toit", "1 pièce", "Ø 150, pour ardoise ou tuile"],
      ["Chapeau de sortie de toit", "1 pièce", "Ø 150"],
      ["Collerette d'étanchéité", "1 pièce", "Ø 150, solin du conduit de fumée"],
    ]);
  });

  it("ventilation : pas de collerette", () => {
    const v = readQuote([ardoise, sortie("Sortie de toit Poujoulat", "2")], { "param:diametre_sortie": mm("125"), "param:usage_sortie": u("2") });
    expect(pieces(v)).toEqual([
      ["Embase plomb de sortie de toit", "2 pièces", "Ø 125, pour ardoise ou tuile"],
      ["Chapeau de sortie de toit", "2 pièces", "Ø 125"],
    ]);
  });

  it("couverture zinc : platine zinc soudée ; « VMC » lu dans la ligne : ni question, ni collerette", () => {
    const v = readQuote([zinc, sortie("Sortie de toit VMC", "2")], ZINC);
    expect(v.questions.filter((d) => /sortie/.test(d.key))).toEqual([]);
    expect(pieces(v)).toEqual([
      ["Platine zinc de sortie de toit", "2 pièces", "VMC, soudée sur la couverture zinc"],
      ["Chapeau de sortie de toit", "2 pièces", "VMC"],
    ]);
  });

  it.each([
    ["Sortie de toit Ø 150 Poujoulat pour poêle", "Ø 150"],
    ["Sortie de toit poêle diamètre 125 mm", "Ø 125"],
    ["Sortie de toit conduit de fumée Ø 180 mm", "Ø 180"],
  ])("« %s » : le diamètre et l'usage sont lus, aucune question", (d, diam) => {
    const v = readQuote([ardoise, sortie(d)]);
    expect(v.questions.filter((q) => /sortie/.test(q.key))).toEqual([]);
    expect(pieces(v).map((p) => p[2])).toEqual([`${diam}, pour ardoise ou tuile`, diam, `${diam}, solin du conduit de fumée`]);
  });

  it("sans couverture au devis : la question « sur quelle couverture ? »", () => {
    const v = readQuote([sortie("Sortie de toit Ø 150 ventilation")]);
    expect(v.questions.map((q) => q.key)).toContain("engine:param:support_sortie");
  });
});
