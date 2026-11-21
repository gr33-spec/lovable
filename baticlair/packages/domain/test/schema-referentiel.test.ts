import { describe, expect, it } from "vitest";
import { loadReferential, PLATRERIE_REFERENTIAL, ReferentialFileError, ROOFING_REFERENTIAL, validateReferential } from "../src/index.js";

/**
 * SCHÉMA DE VALIDATION (plan v3 §3) : un référentiel métier est un fichier de données, vérifié au chargement par sa
 * forme (schéma) puis par son sens (intégrité). Un fichier faux est refusé avec le chemin de la faute.
 * Le JSON exporté de la couverture est tenu à jour par ce test (referentiels/couverture/referentiel.json).
 */
const asFile = (ref: unknown) => JSON.parse(JSON.stringify(ref)) as unknown;

describe("un référentiel passe par le schéma avant le moteur", () => {
  it("la couverture et la plâtrerie, écrites en TypeScript, passent le schéma et l'intégrité une fois sérialisées en JSON", () => {
    expect(loadReferential(asFile(ROOFING_REFERENTIAL)).version).toBe(ROOFING_REFERENTIAL.version);
    expect(loadReferential(asFile(PLATRERIE_REFERENTIAL)).trade).toBe("drywall");
  });

  it("un fichier faux est refusé, avec le chemin exact de chaque faute", () => {
    const file = asFile(ROOFING_REFERENTIAL) as { workItems: { needs: { formula?: string; unit: string }[] }[]; wasteRules: { rate: string }[] };
    delete file.workItems[0]!.needs[0]!.formula;
    file.wasteRules[0]!.rate = "cinq";
    let error: unknown;
    try {
      validateReferential(file);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ReferentialFileError);
    const problems = (error as ReferentialFileError).problems;
    expect(problems.some((p) => p.startsWith("workItems.0.needs.0.formula :"))).toBe(true);
    expect(problems.some((p) => p.startsWith("wasteRules.0.rate :"))).toBe(true);
    // Pas un référentiel du tout : refusé aussi, sans planter.
    expect(() => validateReferential({ id: "x" })).toThrow(ReferentialFileError);
    expect(() => validateReferential(null)).toThrow(ReferentialFileError);
  });

  it("la forme juste mais le sens faux (unité inconnue dans une formule) est refusé par l'intégrité", () => {
    const file = asFile(ROOFING_REFERENTIAL) as { workItems: { needs: { formula: string }[] }[] };
    file.workItems[0]!.needs[0]!.formula = "surface * variable_inconnue";
    expect(() => loadReferential(file)).toThrow(/incohérent/);
  });

  it("le JSON exporté de la couverture est à jour (referentiels/couverture/referentiel.json)", async () => {
    await expect(`${JSON.stringify(ROOFING_REFERENTIAL, null, 2)}\n`).toMatchFileSnapshot("../../../referentiels/couverture/referentiel.json");
  });
});
