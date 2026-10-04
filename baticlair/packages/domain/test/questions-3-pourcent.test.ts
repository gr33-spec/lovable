import { describe, expect, it } from "vitest";
import { computeWithAnswers, planQuote, QUESTION_THRESHOLD, ROOFING_REFERENTIAL, tradeProfile, type Referential } from "../src/index.js";
import { readQuote } from "./support/read-quote.js";

/**
 * § 41 : une question ne se pose que si sa réponse change une quantité commandée de plus de 3 %, une unité ou un
 * matériau ; les autres se posent dans l'ordre du levier le plus gros. Le moteur rejoue le calcul avec chaque réponse.
 */
const ZINC = [
  { ref: "z1", designation: "Couverture zinc joint debout", quantity: "91", unit: "m²" },
  { ref: "z4", designation: "Gouttière zinc demi-ronde", quantity: "13", unit: "ml" },
];

describe("tri des questions par levier", () => {
  it("le façonnage (change l'unité : kg ou pièces) passe avant le nombre de descentes (quelques naissances)", () => {
    const v = readQuote(ZINC);
    expect(v.questions.map((q) => q.question?.key ?? q.key)).toEqual(["param:faconnage", "param:nb_descentes"]);
    expect(QUESTION_THRESHOLD).toBe(0.03);
  });
});

describe("une question dont toutes les réponses donnent la même commande (à 3 % près) n'est pas posée", () => {
  /** Un ouvrage d'essai : la gouttière, avec un coefficient à boutons qui ne change les crochets que de 1 %. */
  const gouttiere = ROOFING_REFERENTIAL.workItems.find((w) => w.id === "gouttiere")!;
  const REF: Referential = {
    ...ROOFING_REFERENTIAL,
    workItems: ROOFING_REFERENTIAL.workItems.map((w) =>
      w.id !== "gouttiere"
        ? w
        : {
            ...w,
            params: [
              ...w.params,
              { key: "serrage", label: "Serrage des crochets", unit: "u", kind: "artisan_preference", question: "Serrage des crochets ?", choices: [{ label: "Normal", value: "1" }, { label: "Un peu plus serré", value: "1.01" }] },
            ],
            needs: w.needs.map((n) => (n.id === "crochets" ? { ...n, formula: `(${n.formula}) * serrage` } : n)),
          },
    ),
  };
  const lines = [{ ref: "g", designation: "Gouttière zinc demi-ronde", quantity: "13", unit: "ml" }];
  const profile = tradeProfile("roofing");

  it("« serrage » (1 % d'écart) : pas de question, la première réponse vaut hypothèse dite ; « descentes » (naissances 1 à 4) : question", () => {
    const plan = planQuote(lines, REF, profile);
    const r = computeWithAnswers(REF, plan, { "param:nb_descentes": { value: "2", unit: "u" } });
    expect(r.questions).toEqual([]);
    const crochets = r.needs.find((n) => n.needId === "crochets")!;
    expect(crochets.status).toBe("calculated");
    expect(crochets.assumptions).toContainEqual(expect.objectContaining({ key: "param:serrage", label: "Serrage des crochets", value: "Normal" }));
    // Sans la réponse « descentes » : une seule question, celle qui change vraiment la commande.
    const open = computeWithAnswers(REF, plan, {});
    expect(open.questions.map((q) => q.key)).toEqual(["param:nb_descentes"]);
    expect(gouttiere.params.some((p) => p.key === "serrage")).toBe(false);
  });
});
