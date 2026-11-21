import { describe, expect, it } from "vitest";
import { CurrencyMismatchError, Money } from "../src/index.js";

describe("Money", () => {
  it("calcule sans erreur de flottant", () => {
    expect(Money.of("0.1").add(Money.of("0.2")).equals(Money.of("0.3"))).toBe(true);
    expect(Money.of("19.90").multiply(3).toJSON()).toEqual({ amount: "59.7", currency: "EUR" });
  });

  it("n'arrondit qu'explicitement, au centime, demi vers le haut", () => {
    const third = Money.of(10).divide(3);
    expect(third.amount.toFixed(4)).toBe("3.3333");
    expect(third.roundToCents().toString()).toBe("3.33 EUR");
    expect(Money.of("2.345").roundToCents().toString()).toBe("2.35 EUR");
  });

  it("refuse de mélanger les devises", () => {
    const other = Money.of(1, "USD" as never);
    expect(() => Money.of(1).add(other)).toThrow(CurrencyMismatchError);
  });

  it("refuse les valeurs non finies et la division par zéro", () => {
    expect(() => Money.of(Number.NaN)).toThrow(RangeError);
    expect(() => Money.of(1).divide(0)).toThrow(RangeError);
  });

  it("sérialise le montant en chaîne (jamais un number)", () => {
    expect(JSON.stringify(Money.of("1234.5"))).toBe('{"amount":"1234.5","currency":"EUR"}');
  });
});
