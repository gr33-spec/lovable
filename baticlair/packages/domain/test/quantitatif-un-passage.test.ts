import { describe, expect, it } from "vitest";
import { AI_ADDITION, AI_DOUBT, applyOrangeFlags, completionDossier, completionFlags, completionRecord, ROOFING_REFERENTIAL } from "../src/index.js";
import { readTradeQuote } from "./support/read-trade.js";

/**
 * LE QUANTITATIF EN UN PASSAGE (décision du fondateur, 2026-10-06) : le moteur calcule ; l'appel IA n° 2 rend des
 * AJOUTS (fixations, scellements, étanchéité, consommables qui manquent) et des DOUTES (avec un remplacement). Tout
 * sort ORANGE ; aucune quantité du moteur ne bouge sans l'appui de l'artisan.
 */
const LINES = [
  { ref: "1", designation: "Gouttière zinc demi-ronde dév. 33", quantity: "20", unit: "ml" },
  { ref: "2", designation: "Liteaux 27x40", quantity: "100", unit: "m²" },
];
const purchase = readTradeQuote(ROOFING_REFERENTIAL, LINES);
const dossier = completionDossier(purchase, LINES);
const ref = (re: RegExp) => Object.entries(dossier.refs).find(([, k]) => purchase.toBuy.some((b) => b.key === k && re.test(b.label)))![0];

describe("le dossier de l'appel n° 2", () => {
  it("le devis lu (L1…), la liste du moteur (A1…) avec son origine", () => {
    expect(dossier.text).toMatch(/^DEVIS DU CLIENT/);
    expect(dossier.text).toContain("L1 · Gouttière zinc demi-ronde dév. 33 · 20 ml");
    expect(dossier.text).toMatch(/A\d · Gouttière zinc demi-ronde dév\. 33 · .+ — d'après L1/);
  });
});

describe("§41.2 réécrit : l'appel n° 2 relit, il ne complète jamais", () => {
  const gouttiere = ref(/Gouttière/);
  const record = completionRecord(
    {
      doutes: [
        { repere: gouttiere, raison: "Zinc naturel ou prépatiné ? Le comptoir doit le savoir.", proposition: "Gouttière zinc naturel demi-ronde dév. 33" },
        { repere: "A99", raison: "Repère inconnu", proposition: null },
      ],
      // « ajouts : TOUJOURS une liste vide » ; ce que l'IA y mettrait quand même est ignoré (§49.1 point 5).
      ajouts: ["Mastic silicone neutre"],
    },
    dossier,
  );

  it("les repères sont résolus ; un repère inconnu est écarté ; aucun ajout, jamais", () => {
    expect(record.additions).toEqual([]);
    expect(record.doubts).toEqual([{ itemKey: dossier.refs[gouttiere], reason: "Zinc naturel ou prépatiné ? Le comptoir doit le savoir.", replacement: { label: "Gouttière zinc naturel demi-ronde dév. 33", quantity: null, unit: null } }]);
  });

  it("à l'écran : le doute colore l'article avec sa proposition ; aucune quantité ne bouge ; aucune ligne ajoutée", () => {
    const shown = applyOrangeFlags(purchase, completionFlags(record), {});
    const rows = shown.screen.groups.flatMap((g) => g.rows);
    expect(rows.filter((r) => r.decisionKey?.startsWith(AI_ADDITION))).toEqual([]);
    const doubt = rows.find((r) => r.itemKey === dossier.refs[gouttiere])!;
    expect(doubt).toMatchObject({ status: "check", decisionKey: `${AI_DOUBT}${dossier.refs[gouttiere]}`, reason: "Zinc naturel ou prépatiné ? Le comptoir doit le savoir." });
    expect(shown.questions.find((q) => q.key === doubt.decisionKey)).toMatchObject({ suggestion: { label: "Gouttière zinc naturel demi-ronde dév. 33", quantity: null, unit: null } });
    expect(shown.toBuy.map((b) => b.quantity)).toEqual(purchase.toBuy.map((b) => b.quantity));
    expect(shown.canValidate).toBe(false);
  });
});
