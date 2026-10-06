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

describe("ajouts et doutes : orange, jamais vert", () => {
  const gouttiere = ref(/Gouttière/);
  const record = completionRecord(
    {
      ajouts: [
        { ouvrage: gouttiere, designation: "Naissance zinc Ø 80 dév. 33", quantite: "1", unite: "pièce", raison: "Une descente au moins : il faut sa naissance." },
        { ouvrage: null, designation: "Mastic silicone neutre", quantite: "2", unite: "cartouches", raison: "Étanchéité des raccords." },
        { ouvrage: "Z9", designation: " ", quantite: null, unite: null, raison: "vide" },
      ],
      doutes: [
        { article: gouttiere, raison: "Zinc naturel ou prépatiné ? Le comptoir doit le savoir.", remplacement: { designation: "Gouttière zinc naturel demi-ronde dév. 33", quantite: null, unite: null } },
        { article: "A99", raison: "Repère inconnu", remplacement: null },
      ],
    },
    dossier,
  );

  it("les repères sont résolus ; un ajout vide ou un repère inconnu est écarté", () => {
    expect(record.additions.map((a) => a.label)).toEqual(["Naissance zinc Ø 80 dév. 33", "Mastic silicone neutre"]);
    expect(record.additions[0]!.nearItemKey).toBe(dossier.refs[gouttiere]);
    expect(record.doubts).toHaveLength(1);
  });

  it("à l'écran : l'ajout a sa ligne orange près de son ouvrage (« Oui, on l'ajoute ») ; le doute colore l'article avec son remplacement ; aucune quantité ne bouge", () => {
    const shown = applyOrangeFlags(purchase, completionFlags(record), {});
    const rows = shown.screen.groups.flatMap((g) => g.rows);
    const add = rows.find((r) => r.pending?.label === "Naissance zinc Ø 80 dév. 33")!;
    expect(add).toMatchObject({ status: "check", pending: { quantity: "1 pièce" } });
    expect(add.decisionKey!.startsWith(AI_ADDITION)).toBe(true);
    // Rangé dans le groupe de la gouttière ; le mastic, sans ouvrage, dans « À ajouter ou vérifier ».
    const groupOf = (label: string) => shown.screen.groups.find((g) => g.rows.some((r) => r.pending?.label === label))!;
    expect(groupOf("Naissance zinc Ø 80 dév. 33").rows.some((r) => r.itemKey === dossier.refs[gouttiere])).toBe(true);
    expect(groupOf("Mastic silicone neutre").label).toBe("À ajouter ou vérifier");
    expect(shown.questions.find((q) => q.key === add.decisionKey)).toMatchObject({ primary: { label: "Oui, on l'ajoute" }, suggestion: { label: "Naissance zinc Ø 80 dév. 33", quantity: "1", unit: "pièce" } });
    const doubt = rows.find((r) => r.itemKey === dossier.refs[gouttiere])!;
    expect(doubt).toMatchObject({ status: "check", decisionKey: `${AI_DOUBT}${dossier.refs[gouttiere]}`, reason: "Zinc naturel ou prépatiné ? Le comptoir doit le savoir." });
    expect(shown.toBuy.map((b) => b.quantity)).toEqual(purchase.toBuy.map((b) => b.quantity));
    expect(shown.canValidate).toBe(false);
  });
});
