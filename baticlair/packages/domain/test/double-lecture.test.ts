import { describe, expect, it } from "vitest";
import { isCalculationDoubt, reconcileReadings, SINGLE_READ_DOUBT, type ReadLine } from "../src/index.js";

/**
 * LA DOUBLE LECTURE (décision du fondateur, 2026-10-05) : deux lectures indépendantes, le CODE compare. D'accord : vert
 * (même si une lecture hésitait) ; en désaccord : orange avec les deux valeurs ; lue une seule fois : gardée, orange.
 */
const l = (ref: string, designation: string, quantity: string | null, unit: string | null, doubt: string | null = null): ReadLine => ({
  designation,
  quantity,
  unit,
  sourceRefs: [ref],
  sourcePages: [Number(ref.split(":")[0])],
  section: [],
  doubt,
});

describe("double lecture", () => {
  it("d'accord : la ligne est sûre, même si une seule lecture hésitait", () => {
    const r = reconcileReadings([l("1:3", "Prise 2P+T 16 A", "12", "u", "Chiffre peu lisible")], [l("1:3", "Prise 2P+T 16A", "12", "U")]);
    expect(r).toMatchObject({ agreed: 1, disagreed: 0, single: 0 });
    expect(r.lines[0]!.doubt).toBeNull();
  });

  it("les deux lectures hésitent : le doute reste", () => {
    const r = reconcileReadings([l("1:3", "Crochet inox", "2", "paquet", "2 ou 3 ?")], [l("1:3", "Crochet inox", "2", "paquet", "2 ou 3 ?")]);
    expect(r.lines[0]!.doubt).toBe("2 ou 3 ?");
  });

  it("en désaccord : la première lecture est gardée, les deux valeurs sont dites (doute de LECTURE, jamais de calcul)", () => {
    const r = reconcileReadings([l("1:4", "Liteaux 27x38", "480", "ml")], [l("1:4", "Liteaux 27x38", "430", "ml")]);
    expect(r.disagreed).toBe(1);
    expect(r.lines[0]).toMatchObject({ quantity: "480", doubt: "Chiffre peu lisible : les deux lectures donnent « 480 ml » et « 430 ml ». Lequel est le bon ?" });
    expect(isCalculationDoubt(r.lines[0]!.doubt!)).toBe(false);
  });

  it("une ligne vue par une seule lecture : gardée à sa place dans le devis, orange", () => {
    const r = reconcileReadings(
      [l("1:3", "Tuiles", "1250", "u"), l("1:9", "Gouttière", "36", "ml")],
      [l("1:3", "Tuiles", "1250", "u"), l("1:6", "Faîtières", "42", "u"), l("1:9", "Gouttière", "36", "ml")],
    );
    expect(r).toMatchObject({ agreed: 2, single: 1 });
    expect(r.lines.map((x) => x.designation)).toEqual(["Tuiles", "Faîtières", "Gouttière"]);
    expect(r.lines[1]!.doubt).toBe(SINGLE_READ_DOUBT);
    expect(isCalculationDoubt(SINGLE_READ_DOUBT)).toBe(false);
  });
});
