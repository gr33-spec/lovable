import { describe, expect, it } from "vitest";
import {
  computeAiCost,
  microUsdToEur,
  priceTableAt,
  priceTableByVersion,
  UnknownModelPriceError,
  type PriceTable,
} from "../src/index.js";

const table = priceTableByVersion("anthropic-2026-09-30");

describe("computeAiCost", () => {
  it("applique les tarifs publiés (Sonnet 5.5 : 2 $ / 10 $ par million)", () => {
    const cost = computeAiCost("claude-sonnet-5-5", { inputTokens: 10_000, outputTokens: 3_000 }, table);
    // 10 000 × 2 + 3 000 × 10 = 50 000 micro-dollars = 0,05 $
    expect(cost.totalMicroUsd).toBe(50_000);
    expect(cost.priceTableVersion).toBe("anthropic-2026-09-30");
  });

  it("compte séparément les lectures et écritures de cache", () => {
    const cost = computeAiCost(
      "claude-haiku-4-5",
      { inputTokens: 1000, outputTokens: 0, cacheReadTokens: 10_000, cacheWrite5mTokens: 2000 },
      table,
    );
    // 1000×1 + 10 000×0,10 + 2000×1,25 = 1000 + 1000 + 2500
    expect(cost.totalMicroUsd).toBe(4500);
    expect(cost.cacheMicroUsd.toString()).toBe("3500");
  });

  it("applique la réduction du traitement différé", () => {
    const cost = computeAiCost("claude-opus-5-5", { inputTokens: 1000, outputTokens: 1000, batch: true }, table);
    expect(cost.totalMicroUsd).toBe(12_000); // (4 000 + 20 000) / 2
  });

  it("arrondit au micro-dollar supérieur (jamais de sous-estimation)", () => {
    const cost = computeAiCost("claude-haiku-4-5", { inputTokens: 0, outputTokens: 0, cacheReadTokens: 1 }, table);
    expect(cost.totalMicroUsd).toBe(1); // 0,1 → 1
  });

  it("refuse un modèle sans tarif plutôt que de compter zéro", () => {
    expect(() => computeAiCost("modele-inconnu", { inputTokens: 1, outputTokens: 1 }, table)).toThrow(UnknownModelPriceError);
  });

  it("refuse des tokens négatifs ou non entiers", () => {
    expect(() => computeAiCost("claude-haiku-4-5", { inputTokens: -1, outputTokens: 0 }, table)).toThrow(RangeError);
    expect(() => computeAiCost("claude-haiku-4-5", { inputTokens: 1.5, outputTokens: 0 }, table)).toThrow(RangeError);
  });
});

describe("grilles datées", () => {
  const tables: PriceTable[] = [
    { ...table, version: "v1", effectiveFrom: "2026-01-01" },
    { ...table, version: "v2", effectiveFrom: "2026-06-01" },
  ];
  it("choisit la grille en vigueur à la date de l'appel", () => {
    expect(priceTableAt(new Date("2026-03-15T10:00:00Z"), tables).version).toBe("v1");
    expect(priceTableAt(new Date("2026-06-01T00:00:00Z"), tables).version).toBe("v2");
  });
  it("convertit en euros avec un taux fourni", () => {
    expect(microUsdToEur(2_500_000, "0.92").toString()).toBe("2.3");
  });
});
