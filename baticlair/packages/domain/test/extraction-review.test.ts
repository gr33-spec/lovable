import { describe, expect, it } from "vitest";
import { reviewExtractedTakeoff, ROOFING_PROFILE } from "../src/index.js";

const source = new Map([
  ["1:004", "TUI-01  Tuile terre cuite Romane  1 250  u  1,20  1 500,00"],
  ["1:005", "LIT-02  Liteaux 27x38  320  ml  0,90  288,00"],
  ["1:006", "Dépose de la couverture existante  85  m2"],
]);

const line = (over: Partial<Parameters<typeof reviewExtractedTakeoff>[0][number]>) => ({
  id: "l1",
  designation: "Tuile terre cuite Romane",
  quantity: "1 250",
  unit: "u",
  reference: "TUI-01",
  sourceRefs: ["1:004"],
  sourcePages: [],
  ...over,
});

describe("relecture du quantitatif proposé par l'IA", () => {
  it("garde « certaine » une ligne justifiée par le devis", () => {
    const { validation } = reviewExtractedTakeoff([line({})], source, ROOFING_PROFILE);
    expect(validation.lines[0]!.status).toBe("certain");
  });

  it("met à vérifier une quantité absente de la ligne citée", () => {
    const { validation } = reviewExtractedTakeoff([line({ quantity: "1 520" })], source, ROOFING_PROFILE);
    expect(validation.lines[0]!.status).toBe("to_verify");
    expect(validation.lines[0]!.issues.map((i) => i.code)).toContain("QUANTITY_NOT_IN_SOURCE");
  });

  it("met à vérifier une ligne qui ne cite aucune ligne existante", () => {
    const { validation } = reviewExtractedTakeoff([line({ sourceRefs: ["9:999"] })], source, ROOFING_PROFILE);
    expect(validation.lines[0]!.issues.map((i) => i.code)).toContain("SOURCE_NOT_FOUND");
  });

  it("signale une ligne lue sur une image", () => {
    const { validation } = reviewExtractedTakeoff([line({ sourceRefs: [], sourcePages: [2] })], source, ROOFING_PROFILE);
    expect(validation.lines[0]!.issues.map((i) => i.code)).toContain("READ_FROM_IMAGE");
    // Simple information : seul un doute de l'IA rend la ligne « à vérifier ».
    expect(validation.lines[0]!.status).toBe("certain");
  });

  it("fait confiance à une ligne corrigée par l'artisan", () => {
    const { validation } = reviewExtractedTakeoff([line({ quantity: "1 300", sourceRefs: [], enteredByArtisan: true })], source, ROOFING_PROFILE);
    expect(validation.lines[0]!.status).toBe("certain");
  });

  it("ne demande rien sur une prestation", () => {
    const { validation } = reviewExtractedTakeoff(
      [line({ id: "l2", designation: "Dépose de la couverture existante", quantity: "85", unit: "m2", reference: null, sourceRefs: ["1:006"] })],
      source,
      ROOFING_PROFILE,
    );
    expect(validation.lines[0]!.kind).toBe("labor");
  });

  it("montre à l'artisan un doute de LECTURE exprimé par l'IA", () => {
    const { validation } = reviewExtractedTakeoff([line({ aiDoubt: "Chiffre peu lisible : 1 250 ou 1 280 m² ?" })], source, ROOFING_PROFILE);
    expect(validation.lines[0]!.status).toBe("to_verify");
    expect(validation.lines[0]!.issues.find((i) => i.code === "AI_DOUBT")?.message).toBe("L'IA hésite : Chiffre peu lisible : 1 250 ou 1 280 m² ?");
  });

  // Règle du fondateur (2026-10-03) : « ce n'est pas à l'artisan de calculer, mais à l'IA ».
  it.each([
    "Quantité en m² : combien de mètres linéaires de liteaux ?",
    "contenu du paquet non indiqué",
    "Combien de crochets par paquet ?",
    "Surface en m², à convertir en nombre de tuiles ?",
    "Combien de ml de gouttière ?",
  ])("un doute de CALCUL (« %s ») n'est jamais posé à l'artisan : BatiClair calcule", (doubt) => {
    const { validation } = reviewExtractedTakeoff([line({ aiDoubt: doubt })], source, ROOFING_PROFILE);
    expect(validation.lines[0]!.status).toBe("certain");
    expect(validation.lines[0]!.issues.find((i) => i.code === "AI_DOUBT")).toBeUndefined();
    expect(validation.lines[0]!.issues.find((i) => i.code === "AI_CALCULATION_NOTE")).toMatchObject({ severity: "info" });
  });

  it("une ligne confirmée par l'artisan devient sûre", () => {
    const { validation } = reviewExtractedTakeoff(
      [line({ quantity: "1 520", aiDoubt: "chiffre peu lisible", confirmedByArtisan: true })],
      source,
      ROOFING_PROFILE,
    );
    expect(validation.lines[0]!.status).toBe("certain");
    expect(validation.lines[0]!.issues).toEqual([]);
  });

  it("une confirmation ne remplace pas une quantité absente", () => {
    const { validation } = reviewExtractedTakeoff([line({ quantity: null, confirmedByArtisan: true })], source, ROOFING_PROFILE);
    expect(validation.lines[0]!.status).toBe("to_verify");
    expect(validation.counts.blocking).toBe(1);
  });

  it("ne met pas en doute un matériau hors référentiel (autre métier) : simple information", () => {
    const src = new Map([["1:010", "Mitigeur thermostatique encastré  1  u  420,00"]]);
    const { validation } = reviewExtractedTakeoff(
      [line({ designation: "Mitigeur thermostatique encastré", quantity: "1", unit: "u", reference: null, sourceRefs: ["1:010"] })],
      src,
      ROOFING_PROFILE,
    );
    expect(validation.lines[0]!.status).toBe("certain");
    expect(validation.lines[0]!.issues.map((i) => [i.code, i.severity])).toContainEqual(["FAMILY_UNKNOWN", "info"]);
  });
});
