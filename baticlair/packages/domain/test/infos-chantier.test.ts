import { describe, expect, it } from "vitest";
import { ROOFING_REFERENTIAL, type SiteFact } from "../src/index.js";
import { planOf } from "./support/plan-of.js";
import { readQuote } from "./support/read-quote.js";

/**
 * INFOS CHANTIER FACULTATIVES (docs/infos-chantier-facultatives.md) : la note tapée par l'artisan au dépôt ou dans le
 * chat, ou le commentaire d'un croquis. Seule une mesure nommée devient un fait ; elle passe devant le devis et
 * l'explication dit les deux ; deux documents qui se contredisent font une question avec les deux valeurs.
 */
const ARDOISES = [{ ref: "1", designation: "Couverture en ardoises naturelles 30x22 posées au crochet", quantity: "200", unit: "m²" }];
/** La note de l'artisan (« Pente 35° »), telle que la lecture la rend : un fait du chantier, origine artisan. */
const NOTE_PENTE: SiteFact[] = [{ key: "pente", value: "35", unit: "°", evidence: "Votre note (« Pente 35° »)", origin: "artisan" }];
const NOTE_PENTE_RAMPANT: SiteFact[] = [...NOTE_PENTE, { key: "longueur_rampant", value: "6", unit: "m", evidence: "Votre note (« Rampant 6 m »)", origin: "artisan" }];

describe("la note de l'artisan passe devant le devis, et l'explication dit les deux", () => {
  it("devis « pente 40° » et note « Pente 35° » : 35° retenu, origine artisan, le devis cité", () => {
    const line = { ...ARDOISES[0]!, designation: `${ARDOISES[0]!.designation}, pente 40°` };
    const plan = planOf(ROOFING_REFERENTIAL, [line], NOTE_PENTE);
    expect(plan.inputs[0]!.params.pente).toMatchObject({ value: "35", unit: "°", origin: "artisan" });
    expect(plan.inputs[0]!.params.pente!.evidence).toMatch(/^Votre note \(« Pente 35° »\) ; .*40 °$/);
    expect(plan.contradictions).toEqual([]);
    const v = readQuote([line], {}, NOTE_PENTE);
    expect(v.questions.map((q) => q.question?.key)).not.toContain("param:pente");
    expect(v.assumptions.some((a) => a.key === "param:pente")).toBe(false);
  });

  it("note sans devis sur la pente : plus d'hypothèse 45°, aucune question", () => {
    const v = readQuote(ARDOISES, {}, NOTE_PENTE_RAMPANT);
    expect(v.assumptions.map((a) => a.key)).not.toContain("param:pente");
    expect(v.assumptions.map((a) => a.key)).not.toContain("param:longueur_rampant");
  });
});

describe("deux documents qui se contredisent : une question avec les deux valeurs, rien ne part", () => {
  it("devis « pente 40° » et lecture IA de l'en-tête « 30° » : question à deux boutons, ardoises en attente ; la réponse tranche", () => {
    const line = { ...ARDOISES[0]!, designation: `${ARDOISES[0]!.designation}, pente 40°` };
    const v = readQuote([line], {}, [{ key: "pente", value: "30", unit: "°", evidence: "Devis, en-tête (« Pente : 30° »)", origin: "devis" }]);
    const q = v.questions.find((d) => d.question?.key === "param:pente")!;
    expect(q.question).toMatchObject({ text: "Pente du toit : 40° (devis : « pente »), ou 30° (en-tête du devis : « Pente : 30° ») ?", options: [{ value: "40" }, { value: "30" }] });
    expect(v.questions[0]!.question?.key).toBe("param:pente");
    expect(v.toBuy.some((b) => b.needIds.includes("ardoises"))).toBe(false);
    const answered = readQuote([line], { "param:pente": { value: "30", unit: "°" } }, [{ key: "pente", value: "30", unit: "°", evidence: "Devis, en-tête", origin: "devis" }]);
    expect(answered.questions.map((d) => d.question?.key)).not.toContain("param:pente");
    expect(answered.toBuy.some((b) => b.needIds.includes("ardoises"))).toBe(true);
  });
});
