import { describe, expect, it } from "vitest";
import { lineKind, PEINTURE_REFERENTIAL, planQuote, poseOfSuppliedArticle, ROOFING_REFERENTIAL, tradeProfile } from "../src/index.js";
import { readQuote } from "./support/read-quote.js";
import { readTradeQuote } from "./support/read-trade.js";

/**
 * « POSE » NE RETIRE JAMAIS LE MATÉRIAU (retour du fondateur, 2026-10-05). Seuls « pose seule », « main-d'œuvre
 * seule », « fourni par le client » et « hors fourniture » font d'une ligne une prestation sans rien à commander.
 * Une seule autre exception, pour ne jamais commander deux fois : l'article est déjà fourni par une autre ligne du
 * même devis (« Feutre piscine 43 m² » puis « Pose feutre piscine 43 m² »).
 */
describe("« Pose » en début de ligne ne retire jamais le matériau", () => {
  it("« Pose toile de verre » se calcule : toile et colle", () => {
    const p = readTradeQuote(PEINTURE_REFERENTIAL, [{ ref: "1", designation: "Pose toile de verre", quantity: "30", unit: "m²" }]);
    expect(p.toBuy.map((b) => b.label)).toEqual(expect.arrayContaining([expect.stringMatching(/^Toile de verre/), expect.stringMatching(/^Colle toile de verre/)]));
  });

  it("« Pose de tuiles » se calcule : tuiles et liteaux", () => {
    const p = readQuote([{ ref: "1", designation: "Pose de tuiles", quantity: "100", unit: "m²" }]);
    const plan = planQuote([{ ref: "1", designation: "Pose de tuiles", quantity: "100", unit: "m²" }], ROOFING_REFERENTIAL, tradeProfile("roofing"));
    expect(plan.lines[0]!.status).not.toBe("not_material");
    expect(p.toBuy.length + p.questions.length).toBeGreaterThan(0);
    expect([...p.toBuy.map((b) => b.label), ...p.questions.map((q) => q.title)].join(" ")).toMatch(/[Tt]uile|[Ll]iteau/);
  });

  it("seuls « pose seule », « main-d'œuvre seule », « fourni par le client », « hors fourniture » font une prestation", () => {
    const tiling = tradeProfile("tiling");
    expect(lineKind("Pose de faïence 20x60", tiling).kind).toBe("material");
    for (const d of ["Pose seule de faïence 20x60", "Main-d'œuvre seule faïence 20x60", "Faïence 20x60 fournie par le client", "Pose faïence 20x60 hors fourniture"]) {
      expect(lineKind(d, tiling).kind, d).toBe("labor");
    }
  });

  it("l'article déjà fourni par une autre ligne : la pose en est la main-d'œuvre, jamais commandé deux fois", () => {
    expect(poseOfSuppliedArticle("Pose feutre piscine", ["Feutre pour piscine 350 g/m²", "Pose feutre piscine"])).toBe(true);
    expect(poseOfSuppliedArticle("Pose paroi de douche", ["Paroi de douche fixe vitrée"])).toBe(true);
    expect(poseOfSuppliedArticle("Pose toile de verre", ["Peinture murs séjour"])).toBe(false);
    expect(poseOfSuppliedArticle("Pose de tuiles", [])).toBe(false);
  });
});
