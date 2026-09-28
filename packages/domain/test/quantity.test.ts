import { describe, expect, it } from "vitest";
import { Quantity, parseUnit } from "../src";

describe("parseUnit", () => {
  it.each([
    ["m²", "M2"], ["M2", "M2"], ["m2", "M2"], ["ml", "ML"], ["m.l.", "ML"], ["mètre linéaire", "ML"],
    ["pce", "U"], ["Pièces", "U"], ["u", "U"], ["kg", "KG"], ["Tonnes", "T"], ["rlx", "ROULEAU"],
    ["sac", "SAC"], ["bte", "BOITE"], ["Palette", "PALETTE"], ["fft", "FORFAIT"],
  ])("reconnaît « %s » → %s", (raw, expected) => {
    expect(parseUnit(raw)).toBe(expected);
  });

  it("ne devine jamais une unité inconnue", () => {
    expect(parseUnit("zorglub")).toBeNull();
    expect(parseUnit("")).toBeNull();
    expect(parseUnit(undefined)).toBeNull();
  });
});

describe("Quantity.convertTo", () => {
  it("convertit les unités de même grandeur indépendantes du produit", () => {
    expect(Quantity.of(18, "M").convertTo("ML")?.toString()).toBe("18 ML");
    expect(Quantity.of("1.5", "T").convertTo("KG")?.toString()).toBe("1500 KG");
    expect(Quantity.of(250, "L").convertTo("M3")?.toString()).toBe("0.25 M3");
  });

  it("refuse une conversion qui dépendrait du produit", () => {
    expect(Quantity.of(10, "SAC").convertTo("KG")).toBeNull();
    expect(Quantity.of(85, "M2").convertTo("U")).toBeNull();
    expect(Quantity.of(3, "ROULEAU").convertTo("M2")).toBeNull();
  });

  it("convertit un conditionnement seulement avec son contenu explicite", () => {
    const rouleau = { packageUnit: "ROULEAU" as const, content: Quantity.of(47, "M2") };
    expect(Quantity.of(2, "ROULEAU").convertTo("M2", rouleau)?.toString()).toBe("94 M2");
    expect(Quantity.of(94, "M2").convertTo("ROULEAU", rouleau)?.toString()).toBe("2 ROULEAU");
    const sac = { packageUnit: "SAC" as const, content: Quantity.of(25, "KG") };
    expect(Quantity.of(40, "SAC").convertTo("T", sac)?.toString()).toBe("1 T");
  });

  it("interdit les quantités négatives", () => {
    expect(() => Quantity.of(-1, "U")).toThrow(RangeError);
  });
});
