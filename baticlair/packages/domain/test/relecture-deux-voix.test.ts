import { describe, expect, it } from "vitest";
import { applyReviewDoubts, panelDoubts, reviewDossier, REVIEW, ROOFING_REFERENTIAL } from "../src/index.js";
import { readTradeQuote } from "./support/read-trade.js";

/**
 * LA RELECTURE À DEUX VOIX (décision du fondateur, 2026-10-05) : un fournisseur et un artisan discutent la liste
 * calculée ; le CODE tire la conclusion. Une remarque ne tombe que si les deux finissent d'accord qu'elle ne pose pas
 * problème ; le moindre doute passe la ligne ORANGE avec ce qu'ils ont dit. Ils ne changent jamais un chiffre.
 */
const LINES = [
  { ref: "1", designation: "Tuile romane canal rouge 12,5 u/m²", quantity: "100", unit: "m²" },
  { ref: "2", designation: "Gouttière zinc demi-ronde dév. 33", quantity: "20", unit: "ml" },
];
const purchase = readTradeQuote(ROOFING_REFERENTIAL, LINES, { "param:pente": { value: "35", unit: "°" } });
const dossier = reviewDossier(
  purchase,
  LINES.map((l) => ({ ...l })),
);
const ref = (label: RegExp) => Object.entries(dossier.refs).find(([, key]) => purchase.toBuy.find((b) => b.key === key && label.test(b.label)))![0];

describe("le dossier des relecteurs", () => {
  it("le devis lu (L1…), la liste calculée (A1…) avec d'où vient chaque article, les hypothèses", () => {
    expect(dossier.text).toMatch(/^DEVIS DU CLIENT/);
    expect(dossier.text).toContain("L1 · Tuile romane canal rouge 12,5 u/m² · 100 m²");
    expect(dossier.text).toMatch(/A1 · .+ — d'après L\d/);
    expect(Object.keys(dossier.refs).length).toBe(purchase.toBuy.length + purchase.toQuote.length);
  });
});

describe("la conclusion de l'échange, tirée par le code", () => {
  const tuile = ref(/liteaux/i);
  const gouttiere = ref(/gouttière/i);

  it("accord sur un problème, objection maintenue, remarque de l'artisan : orange ; objection retirée : rien", () => {
    const doubts = panelDoubts(
      dossier,
      {
        remarques: [
          { article: tuile, sujet: "precision", texte: "Quel coloris exact ? Rouge vieilli ou rouge ?" },
          { article: gouttiere, sujet: "precision", texte: "Naissances : combien ?" },
          { article: gouttiere, sujet: "quantite", texte: "20 ml en longueurs de 4 m : 5 longueurs, ça colle." },
        ],
      },
      {
        reponses: [
          { remarque: 1, accord: true, texte: "Oui, le devis ne le dit pas." },
          { remarque: 2, accord: false, texte: "Les naissances sont déjà dans la liste." },
          { remarque: 3, accord: false, texte: "Rien à redire." },
        ],
        remarques: [{ article: null, sujet: "manque", texte: "Pas de closoir de faîtage alors qu'il y a des faîtières." }],
      },
      {
        objections: [
          { remarque: 2, maintient: true, texte: "Je ne les vois pas, il m'en faut le nombre." },
          { remarque: 3, maintient: false, texte: "D'accord." },
        ],
        avis: [{ remarque: 1, accord: true, texte: "Exact, il en faut." }],
      },
    );
    const byKey = (ref: string) => doubts.find((d) => d.itemKey === dossier.refs[ref]);
    expect(byKey(tuile)!.text).toBe("Fournisseur : Quel coloris exact ? Rouge vieilli ou rouge ? — Artisan : Oui, le devis ne le dit pas.");
    // Objection maintenue : la gouttière reste orange (la remarque 3, retirée d'un commun accord, tombe).
    expect(byKey(gouttiere)!.text).toBe("Fournisseur : Naissances : combien ? — Artisan : Les naissances sont déjà dans la liste. — Fournisseur : Je ne les vois pas, il m'en faut le nombre.");
    expect(doubts.filter((d) => d.itemKey === null).map((d) => d.text)).toEqual(["Artisan : Pas de closoir de faîtage alors qu'il y a des faîtières. — Fournisseur : Exact, il en faut."]);
    expect(doubts).toHaveLength(3);
  });

  it("à l'écran : la ligne passe orange avec leurs mots, « C'est bon » la lève ; un oubli possible a sa ligne ; jamais un chiffre changé", () => {
    const doubts = [
      { itemKey: dossier.refs[tuile]!, text: "Fournisseur : Quel coloris exact ?" },
      { itemKey: null, text: "Artisan : Pas de closoir de faîtage." },
    ];
    const reviewed = applyReviewDoubts(purchase, doubts, {});
    const rows = reviewed.screen.groups.flatMap((g) => g.rows);
    const row = rows.find((r) => r.itemKey === dossier.refs[tuile])!;
    expect(row).toMatchObject({ status: "check", decisionKey: `${REVIEW}${dossier.refs[tuile]}`, reason: "Fournisseur : Quel coloris exact ?" });
    expect(rows.find((r) => r.pending?.label === "Remarque de la relecture")).toMatchObject({ status: "check" });
    expect(reviewed.canValidate).toBe(false);
    expect(reviewed.toBuy.map((b) => b.quantity)).toEqual(purchase.toBuy.map((b) => b.quantity));
    // « C'est bon » sur les deux : plus rien de la relecture.
    const answered = applyReviewDoubts(purchase, doubts, { [`${REVIEW}${dossier.refs[tuile]}`]: "ok", [`${REVIEW}dossier:2`]: "ok" });
    expect(answered.questions.filter((q) => q.key.startsWith(REVIEW))).toHaveLength(0);
  });
});
