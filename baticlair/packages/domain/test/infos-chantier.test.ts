import { describe, expect, it } from "vitest";
import { planQuote, readSiteNotes, ROOFING_REFERENTIAL, tradeProfile } from "../src/index.js";
import { readQuote } from "./support/read-quote.js";

/**
 * INFOS CHANTIER FACULTATIVES (docs/infos-chantier-facultatives.md) : la note tapée par l'artisan au dépôt ou dans le
 * chat, ou le commentaire d'un croquis. Seule une mesure nommée devient un fait ; elle passe devant le devis et
 * l'explication dit les deux ; deux documents qui se contredisent font une question avec les deux valeurs.
 */
const ARDOISES = [{ ref: "1", designation: "Couverture en ardoises naturelles 30x22 posées au crochet", quantity: "200", unit: "m²" }];
const profile = tradeProfile("roofing");

describe("readSiteNotes : seules les mesures nommées deviennent des faits", () => {
  it("mesures en lignes, mesures dans une phrase, pans « 2 × 6,50 m », comptes « 2 descentes » ; le contexte reste du contexte", () => {
    const facts = readSiteNotes(
      ROOFING_REFERENTIAL,
      "Rénovation complète d'une toiture ardoise. Les Velux sont conservés.\nNoue : 12 ml\nRampants 2 x 6,50 m. Faîtage : 9 ml\nPente : 42°\nGouttière avec 2 descentes.",
    );
    expect(facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "longueur_rampant", value: "6.50", unit: "m", origin: "artisan", evidence: "Votre note (« Rampants 2 x 6,50 m »)" }),
        expect.objectContaining({ key: "longueur_faitage", value: "9", unit: "m" }),
        expect.objectContaining({ key: "pente", value: "42", unit: "°" }),
        expect.objectContaining({ key: "nb_descentes", value: "2", unit: "u" }),
        // La noue a son ouvrage (§7) : « Noue : 12 ml » est une mesure nommée (§44, « noue 12 m »).
        expect.objectContaining({ key: "longueur_noue", value: "12", unit: "m" }),
      ]),
    );
    // « 9 000 ardoises » n'est pas une donnée d'ouvrage.
    expect(readSiteNotes(ROOFING_REFERENTIAL, "Prévoir 9 000 ardoises. C'est pentu.")).toEqual([]);
    expect(readSiteNotes(ROOFING_REFERENTIAL, "Pente 100 %")).toContainEqual(expect.objectContaining({ key: "pente", value: "45", unit: "°" }));
    expect(readSiteNotes(ROOFING_REFERENTIAL, "")).toEqual([]);
  });
});

describe("la note de l'artisan passe devant le devis, et l'explication dit les deux", () => {
  it("devis « pente 40° » et note « Pente 35° » : 35° retenu, origine artisan, le devis cité", () => {
    const line = { ...ARDOISES[0]!, designation: `${ARDOISES[0]!.designation}, pente 40°` };
    const plan = planQuote([line], ROOFING_REFERENTIAL, profile, undefined, readSiteNotes(ROOFING_REFERENTIAL, "Pente 35°"));
    expect(plan.inputs[0]!.params.pente).toMatchObject({ value: "35", unit: "°", origin: "artisan" });
    expect(plan.inputs[0]!.params.pente!.evidence).toBe("Votre note (« Pente 35° ») ; Devis, 1 (« pente ») : 40 °");
    expect(plan.contradictions).toEqual([]);
    const v = readQuote([line], {}, readSiteNotes(ROOFING_REFERENTIAL, "Pente 35°"));
    expect(v.questions.map((q) => q.question?.key)).not.toContain("param:pente");
    expect(v.assumptions.some((a) => a.key === "param:pente")).toBe(false);
  });

  it("note sans devis sur la pente : plus d'hypothèse 45°, aucune question", () => {
    const v = readQuote(ARDOISES, {}, readSiteNotes(ROOFING_REFERENTIAL, "Pente 35°\nRampant 6 m"));
    expect(v.assumptions.map((a) => a.key)).not.toContain("param:pente");
    expect(v.assumptions.map((a) => a.key)).not.toContain("param:longueur_rampant");
  });
});

describe("deux documents qui se contredisent : une question avec les deux valeurs, rien ne part", () => {
  it("devis « pente 40° » et lecture IA de l'en-tête « 30° » : question à deux boutons, ardoises en attente ; la réponse tranche", () => {
    const line = { ...ARDOISES[0]!, designation: `${ARDOISES[0]!.designation}, pente 40°` };
    const plan = planQuote([line], ROOFING_REFERENTIAL, profile, undefined, [
      { key: "pente", value: "30", unit: "°", evidence: "Devis, en-tête (« Pente : 30° »)", origin: "devis" },
    ]);
    expect(plan.contradictions).toHaveLength(1);
    const v = readQuote([line], {}, [{ key: "pente", value: "30", unit: "°", evidence: "Devis, en-tête (« Pente : 30° »)", origin: "devis" }]);
    const q = v.questions.find((d) => d.question?.key === "param:pente")!;
    expect(q.question).toMatchObject({ text: "Pente du toit : 40 ° (Devis, 1 (« pente »)), ou 30 ° (Devis, en-tête (« Pente : 30° »)) ?", options: [{ value: "40" }, { value: "30" }] });
    expect(v.questions[0]!.question?.key).toBe("param:pente");
    expect(v.toBuy.some((b) => b.needIds.includes("ardoises"))).toBe(false);
    const answered = readQuote([line], { "param:pente": { value: "30", unit: "°" } }, [{ key: "pente", value: "30", unit: "°", evidence: "Devis, en-tête", origin: "devis" }]);
    expect(answered.questions.map((d) => d.question?.key)).not.toContain("param:pente");
    expect(answered.toBuy.some((b) => b.needIds.includes("ardoises"))).toBe(true);
  });
});
