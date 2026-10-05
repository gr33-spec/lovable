import { describe, expect, it } from "vitest";
import { normalizeTrades, parseUnit, TRADES, TRADE_PROFILES, tradeKey, tradeProfile, validateTakeoffLine } from "../src/index.js";

const line = (designation: string, quantityRaw: string, unitRaw: string) => ({ id: "l1", designation, quantityRaw, unitRaw, reference: null, source: "client_quote" as const });

describe("un moteur, des profils métier (données)", () => {
  it("chaque métier proposé a son profil", () => {
    expect(TRADES).toHaveLength(11);
    for (const t of TRADES) expect(TRADE_PROFILES[t.id]?.id).toBe(t.id);
  });

  it("garde les métiers connus, sans doublon ; « autre métier » par défaut", () => {
    expect(normalizeTrades(["painting", "roofing", "painting", "inconnu"])).toEqual(["painting", "roofing"]);
    expect(normalizeTrades([])).toEqual(["other"]);
    expect(normalizeTrades(["other", "tiling"])).toEqual(["tiling"]);
    expect(tradeKey(["drywall", "painting"])).toBe("drywall,painting");
  });

  it("fusionne les profils d'une entreprise multi-métiers", () => {
    const p = tradeProfile("drywall,painting");
    expect(p.label).toBe("Plâtrerie, isolation + Peinture");
    const codes = p.families.map((f) => f.code);
    expect(codes).toContain("drywall_board");
    expect(codes).toContain("paint_paint");
    expect(new Set(codes).size).toBe(codes.length);
    expect(tradeProfile("inconnu").id).toBe("other");
  });

  it("un profil léger reconnaît le matériau sans poser de contrôle non validé", () => {
    const v = validateTakeoffLine(line("Peinture acrylique velours blanc 10 L", "6", "pot"), tradeProfile("painting"));
    expect(v.kind).toBe("material");
    expect(v.familyLabel).toBe("Peinture, laque, lasure");
    expect(v.status).toBe("certain");
    expect(v.issues).toEqual([]);
  });

  it("repère la main-d'œuvre de chaque métier", () => {
    expect(validateTakeoffLine(line("Ponçage et vitrification du parquet", "35", "m2"), tradeProfile("flooring")).kind).toBe("labor");
    expect(validateTakeoffLine(line("Raccordement au tableau", "1", "u"), tradeProfile("electrical")).kind).toBe("labor");
  });

  it("comprend les conditionnements courants des autres métiers", () => {
    expect(parseUnit("pots")).toBe("POT");
    expect(parseUnit("Seau")).toBe("SEAU");
    expect(parseUnit("ctn")).toBe("CARTON");
    expect(parseUnit("barres")).toBe("BARRE");
    expect(parseUnit("couronne")).toBe("COURONNE");
    expect(parseUnit("plaques")).toBe("U");
  });
});
