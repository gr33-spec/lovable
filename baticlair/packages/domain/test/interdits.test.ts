import { describe, expect, it } from "vitest";
import { applyOrangeFlags, FORBIDDEN, forbiddenFlags, type PurchaseItem, type PurchaseView } from "../src/index.js";

/**
 * LES INTERDITS, 100 % CODE (décision du fondateur, 2026-10-06) : joint debout en m², ardoise sans crochets, tuile sans
 * faîtage… forcent la ligne en ORANGE, avec la raison et l'article à ajouter. Aucune IA.
 */
let n = 0;
const item = (label: string, count: string, unit: string): PurchaseItem => ({
  key: `k${++n}`,
  label,
  quantity: `${count} ${unit}`,
  order: { count, unit },
  approx: null,
  kind: "computed",
  needIds: [],
  lineIds: [],
  state: "ready",
  assumptionKeys: [],
});
const view = (toBuy: PurchaseItem[], toQuote: string[] = []): PurchaseView => ({
  understood: [],
  toBuy,
  groups: [],
  toQuote: toQuote.map((label, i) => ({ key: `q${i}`, label, measure: "1 u", reason: "", lineIds: [] })),
  assumptions: [],
  questions: [],
  suggestions: [],
  canValidate: true,
  screen: { groups: [{ key: "g", label: "Couverture", measure: null, kind: "principal", rows: toBuy.map((b) => ({ key: `item:${b.key}`, status: "ok", itemKey: b.key, lineIds: [] })) }], total: toBuy.length, toCheck: 0 },
  warnings: [],
});
const rules = (v: PurchaseView) => forbiddenFlags(v).map((f) => f.key.slice(FORBIDDEN.length).split(":")[0]);

describe("interdits par article", () => {
  it("jamais au m² ce qui se pose en éléments ; le m² reste admis pour ce qui se vend au m²", () => {
    expect(rules(view([item("Bacs joint debout zinc 0,65 mm", "120", "m²"), item("Ardoises naturelles 32x22", "200", "m²"), item("Crochets d'ardoise", "10", "boîtes"), item("Pattes coulissantes joint debout", "300", "pièces")]))).toEqual(["m2", "m2"]);
    expect(rules(view([item("Écran HPV, rouleau 1,50 × 50 m", "107", "m²"), item("Voliges sapin 18 mm", "96", "m²")]))).toEqual([]);
  });

  it("« lot », « forfait » ; métal au ml sans largeur ni épaisseur", () => {
    expect(rules(view([item("Zinguerie diverse", "1", "forfait"), item("Bande zinc", "12", "ml"), item("Bande zinc dév. 33, 0,65 mm", "12", "ml")]))).toEqual(["vague", "metal-ml"]);
    // « Ensemble haut et bas » décrit un vrai article (un jeu de pièces) : pas un interdit.
    expect(rules(view([item("Bouchon d'angle. Ensemble haut et bas.", "4", "pièces")]))).toEqual([]);
  });

  it("§49.1 : un article absent du devis n'est jamais réclamé (ardoises sans crochets, tuiles sans faîtage, gouttière sans crochets…)", () => {
    expect(rules(view([item("Ardoises naturelles 32x22", "9200", "pièces")]))).toEqual([]);
    expect(rules(view([item("Tuiles romanes canal", "1250", "pièces")]))).toEqual([]);
    expect(rules(view([item("Zinc joint debout en bobine 650 mm, 0,65 mm", "120", "ml")]))).toEqual([]);
    expect(rules(view([item("Gouttière zinc demi-ronde dév. 33", "5", "longueurs de 4 m")]))).toEqual([]);
    expect(rules(view([item("Bacs acier 1000 mm RAL 7016", "18", "pièces")]))).toEqual([]);
  });

  it("à l'écran : la ligne passe orange avec la raison ; « C'est bon » la lève", () => {
    const v = view([item("Ardoises naturelles 32x22", "200", "m²")]);
    const flags = forbiddenFlags(v);
    const shown = applyOrangeFlags(v, flags, {});
    const row = shown.screen.groups[0]!.rows[0]!;
    expect(row).toMatchObject({ status: "check", decisionKey: flags[0]!.key, reason: "Interdit : vendu à la pièce, au ml ou en bobine, jamais au m². Le comptoir ne peut pas le charger tel quel." });
    expect(shown.questions[0]).toMatchObject({ primary: { label: "C'est bon" } });
    expect(shown.canValidate).toBe(false);
    expect(applyOrangeFlags(v, flags, { [flags[0]!.key]: "ok" }).questions).toHaveLength(0);
  });
});
