import { describe, expect, it } from "vitest";
import { ROOFING_REFERENTIAL } from "../src/index.js";
import { planOf } from "./support/plan-of.js";
import { readQuote } from "./support/read-quote.js";

/**
 * Retour du fondateur (2026-10-11, capture iPhone : « Oula… Erreur là ») : un devis avec deux fenêtres de toit de tailles
 * différentes, sur deux lignes (« 114x118 » et « Velux MK04 »), posait « Taille de la fenêtre de toit : 114118 u (Devis,
 * 01a12a11-… (« 114×118 »)), ou 7898 u (Devis, … (« mk04 »)) ? ». Deux défauts :
 *  - deux fenêtres écrites sur deux lignes sont DEUX fenêtres (§11 : « un raccord par fenêtre », à sa taille), jamais une
 *    contradiction : l'ouvrage se prend ligne par ligne, comme les pièces de zinc (§48.6) ;
 *  - une vraie contradiction se dit avec les mots du comptoir (« fenêtre 114 × 118 », « 40° »), et sa source par le texte
 *    cité, jamais un code interne ni l'identifiant d'une ligne.
 */
const DEUX_FENETRES = [
  { ref: "01a12a11-6f9d-7238-88bd-be0524bd4e15", designation: "Couverture bac acier", quantity: "90", unit: "m²" },
  { ref: "01a12a11-6f9d-7238-88bd-c0524bd4e15a", designation: "Fenêtre de toit 114x118", quantity: "1", unit: "u" },
  { ref: "01a12a11-6f9d-7238-88bd-c7b46f516a15", designation: "Fenêtre de toit Velux GGL MK04", quantity: "1", unit: "u" },
];

describe("deux fenêtres de toit de tailles différentes (fondateur, 2026-10-11)", () => {
  it("deux lignes, deux fenêtres : chacune sa taille, jamais une contradiction", () => {
    const plan = planOf(ROOFING_REFERENTIAL, DEUX_FENETRES);
    expect(plan.contradictions).toEqual([]);
    const fenetres = plan.inputs.filter((i) => i.workItemId.startsWith("fenetre-de-toit"));
    expect(fenetres.map((f) => [f.params.taille_fenetre?.value, f.params.nb_fenetres?.value]).sort()).toEqual([
      ["114118", "1"],
      ["7898", "1"],
    ]);
    // Rien d'autre ne bouge : pas de question de taille, les deux fenêtres partent telles qu'écrites.
    const v = readQuote(DEUX_FENETRES);
    expect(v.questions.map((q) => q.question?.text ?? "").filter((t) => /fenêtre/i.test(t))).toEqual([]);
    expect(v.toBuy.map((b) => b.label)).toEqual(expect.arrayContaining(["Fenêtre de toit 114x118", "Fenêtre de toit Velux GGL MK04"]));
  });

  it("une contradiction sur une fenêtre ne touche pas l'autre : sa question porte le nom de sa ligne, une seule", () => {
    const v = readQuote([
      { ref: "a", designation: "Fenêtre de toit Velux MK04 114x118", quantity: "1", unit: "u" },
      { ref: "b", designation: "Fenêtre de toit 78x98", quantity: "1", unit: "u" },
    ]);
    const asked = v.questions.filter((q) => /taille de la fenêtre/i.test(q.question?.text ?? "")).map((q) => q.question!.key);
    expect(asked).toEqual(["param:taille_fenetre@fenetre-de-toit__a"]);
    const answered = readQuote(
      [
        { ref: "a", designation: "Fenêtre de toit Velux MK04 114x118", quantity: "1", unit: "u" },
        { ref: "b", designation: "Fenêtre de toit 78x98", quantity: "1", unit: "u" },
      ],
      { "param:taille_fenetre@fenetre-de-toit__a": "114118" },
    );
    expect(answered.questions.filter((q) => /fenêtre/i.test(q.question?.text ?? ""))).toEqual([]);
  });

  it("une vraie contradiction se dit avec les mots du comptoir et le texte cité, jamais un identifiant de ligne", () => {
    const line = { ref: "01a12a11-6f9d-7238-88bd-be0524bd4e15", designation: "Couverture en ardoises naturelles 30x22 posées au crochet, pente 40°", quantity: "120", unit: "m²" };
    const entete = [{ key: "pente", value: "30", unit: "°", evidence: "Devis, en-tête (« Pente : 30° »)", origin: "devis" as const }];
    const q = readQuote([line], {}, entete).questions.find((d) => d.question?.key === "param:pente")!.question!;
    expect(q.text).toBe("Pente du toit : 40° (devis : « pente »), ou 30° (en-tête du devis : « Pente : 30° ») ?");
    expect((q.options ?? []).map((o) => o.label)).toEqual(["40° (devis : « pente »)", "30° (en-tête du devis : « Pente : 30° »)"]);
  });
});
