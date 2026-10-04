import { describe, expect, it } from "vitest";
import { factsFromReading, planQuote, ROOFING_REFERENTIAL, tradeProfile } from "../src/index.js";
import { readQuote } from "./support/read-quote.js";

/**
 * LES DIMENSIONS LUES PAR LE PROMPT A (§41.1) ENTRENT DANS LE CALCUL : « ce n'est pas à l'artisan de
 * calculer, mais à l'IA ». Une pente ou un rampant que l'IA a lus dans la ligne ou dans l'en-tête ne
 * sont plus une hypothèse à 45° : ils deviennent des faits du chantier, preuve citée, après le texte
 * lu par le code et avant les hypothèses par défaut.
 */
const ARDOISES = [{ ref: "1", designation: "Couverture en ardoises naturelles 30x22 posées au crochet", quantity: "200", unit: "m²" }];
const read = (dimensions: Record<string, string> | null, context: Record<string, string> | null = null) => factsFromReading(ROOFING_REFERENTIAL, [{ ref: "1", dimensions }], context);

describe("factsFromReading : les dimensions du prompt A deviennent des faits du chantier", () => {
  it("pente et rampant d'une ligne, avec leur preuve", () => {
    expect(read({ pente: "35°", rampant: "5,50 m" })).toEqual([
      { key: "pente", value: "35", unit: "°", evidence: "Devis, 1 (« pente : 35° »)", origin: "devis" },
      { key: "longueur_rampant", value: "5.50", unit: "m", evidence: "Devis, 1 (« rampant : 5,50 m »)", origin: "devis" },
    ]);
  });

  it("une pente en % est convertie en degrés (la pente est en degrés partout)", () => {
    expect(read({ pente: "100 %" })).toContainEqual(expect.objectContaining({ key: "pente", value: "45", unit: "°" }));
  });

  it("l'en-tête compte aussi, et les noms du devis (« ep », « épaisseur ») sont reconnus", () => {
    const facts = read({ Épaisseur: "0,65 mm" }, { Pente: "40 °", "type de bâtiment": "maison" });
    expect(facts).toContainEqual(expect.objectContaining({ key: "epaisseur_zinc", value: "0.65", unit: "mm" }));
    expect(facts).toContainEqual(expect.objectContaining({ key: "pente", value: "40", unit: "°", evidence: "Devis, en-tête (« Pente : 40 ° »)" }));
    expect(facts.some((f) => f.evidence.includes("bâtiment"))).toBe(false);
  });

  it("rien sans unité, rien pour une donnée inconnue, rien pour une unité d'une autre dimension", () => {
    expect(read({ pente: "35", largeur_fenetre: "1,20 m", rampant: "35°" })).toEqual([]);
  });
});

describe("dans le calcul : la pente lue par l'IA n'est plus une hypothèse à 45°", () => {
  it("pente 35° lue par le prompt A : les ardoises sont calculées à 35° (recouvrement plus grand), origine devis", () => {
    const facts = read({ pente: "35°" });
    const at45 = readQuote(ARDOISES);
    const at35 = readQuote(ARDOISES, {}, facts);
    const ardoises45 = at45.toBuy.find((i) => i.needIds.includes("ardoises"))!;
    const ardoises35 = at35.toBuy.find((i) => i.needIds.includes("ardoises"))!;
    expect(at45.assumptions.some((a) => a.key === "param:pente")).toBe(true);
    expect(at35.assumptions.some((a) => a.key === "param:pente")).toBe(false);
    expect(ardoises35.order!.count).not.toBe(ardoises45.order!.count);
    expect(Number(ardoises35.order!.count)).toBeGreaterThan(Number(ardoises45.order!.count));
    expect(ardoises35.assumptionKeys).not.toContain("param:pente");
  });

  it("texte de la ligne et lecture de l'IA : d'accord → une seule valeur ; en désaccord → une question, jamais un choix en silence", () => {
    const profile = tradeProfile("roofing");
    const agree = planQuote([{ ...ARDOISES[0]!, designation: `${ARDOISES[0]!.designation}, pente 40°` }], ROOFING_REFERENTIAL, profile, undefined, read({ pente: "40°" }));
    expect(agree.inputs[0]!.params.pente).toMatchObject({ value: "40", unit: "°" });
    expect(agree.conflicts).toEqual([]);
    const disagree = planQuote([{ ...ARDOISES[0]!, designation: `${ARDOISES[0]!.designation}, pente 40°` }], ROOFING_REFERENTIAL, profile, undefined, read({ pente: "35°" }));
    expect(disagree.inputs[0]!.params.pente).toBeUndefined();
    expect(disagree.contradictions).toHaveLength(1);
    const twoReadings = planQuote(ARDOISES, ROOFING_REFERENTIAL, profile, undefined, factsFromReading(ROOFING_REFERENTIAL, [{ ref: "1", dimensions: { pente: "35°" } }], { pente: "30°" }));
    expect(twoReadings.inputs[0]!.params.pente).toBeUndefined();
    expect(twoReadings.conflicts).toHaveLength(1);
  });
});
