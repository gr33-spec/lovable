import { describe, expect, it } from "vitest";
import { normalizeTrades, parseUnit, TRADES, TRADE_PROFILES, tradeKey, tradeProfile} from "../src/index.js";

const line = (designation: string, quantityRaw: string, unitRaw: string) => ({ id: "l1", designation, quantityRaw, unitRaw, reference: null, source: "client_quote" as const });

describe("un moteur, des profils métier (données)", () => {
  it("chaque métier proposé a son profil", () => {
    expect(TRADES).toHaveLength(24);
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
    expect(p.materialKeywords).toContain("ba13");
    expect(p.materialKeywords).toContain("peinture");
    expect(tradeProfile("inconnu").id).toBe("other");
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
