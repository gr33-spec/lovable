import { Decimal, toDecimal, type DecimalInput } from "../shared/decimal.js";

/**
 * Devises supportées. EUR uniquement pour l'instant ; ajouter une devise
 * ne nécessite que d'étendre ce type (aucune conversion implicite n'existe).
 */
export type CurrencyCode = "EUR";

export class CurrencyMismatchError extends Error {
  constructor(a: CurrencyCode, b: CurrencyCode) {
    super(`Opération entre devises différentes : ${a} / ${b}`);
    this.name = "CurrencyMismatchError";
  }
}

/**
 * Montant d'argent immuable.
 *
 * - Précision décimale exacte (pas de flottant).
 * - Aucun arrondi implicite : les calculs intermédiaires restent exacts,
 *   l'arrondi au centime est une décision explicite (`roundToCents`).
 * - Les opérations entre devises différentes sont interdites.
 */
export class Money {
  private constructor(
    readonly amount: Decimal,
    readonly currency: CurrencyCode,
  ) {}

  static of(amount: DecimalInput, currency: CurrencyCode = "EUR"): Money {
    return new Money(toDecimal(amount), currency);
  }

  static zero(currency: CurrencyCode = "EUR"): Money {
    return new Money(new Decimal(0), currency);
  }

  static sum(values: readonly Money[], currency: CurrencyCode = "EUR"): Money {
    return values.reduce((acc, v) => acc.add(v), Money.zero(currency));
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount.plus(other.amount), this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount.minus(other.amount), this.currency);
  }

  multiply(factor: DecimalInput): Money {
    return new Money(this.amount.times(toDecimal(factor)), this.currency);
  }

  divide(divisor: DecimalInput): Money {
    const d = toDecimal(divisor);
    if (d.isZero()) throw new RangeError("Division d'un montant par zéro");
    return new Money(this.amount.dividedBy(d), this.currency);
  }

  /** Rapport entre deux montants (ex. 0.18 pour 18 %). */
  ratioTo(other: Money): Decimal {
    this.assertSameCurrency(other);
    if (other.amount.isZero()) throw new RangeError("Rapport à un montant nul");
    return this.amount.dividedBy(other.amount);
  }

  negate(): Money {
    return new Money(this.amount.negated(), this.currency);
  }

  abs(): Money {
    return new Money(this.amount.abs(), this.currency);
  }

  roundToCents(): Money {
    return new Money(
      this.amount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      this.currency,
    );
  }

  isZero(): boolean {
    return this.amount.isZero();
  }

  isNegative(): boolean {
    return this.amount.isNegative() && !this.amount.isZero();
  }

  compare(other: Money): -1 | 0 | 1 {
    this.assertSameCurrency(other);
    return this.amount.comparedTo(other.amount) as -1 | 0 | 1;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amount.equals(other.amount);
  }

  greaterThan(other: Money): boolean {
    return this.compare(other) > 0;
  }

  lessThan(other: Money): boolean {
    return this.compare(other) < 0;
  }

  /** Représentation stable pour la persistance et l'API (jamais un number). */
  toJSON(): { amount: string; currency: CurrencyCode } {
    return { amount: this.amount.toFixed(), currency: this.currency };
  }

  toString(): string {
    return `${this.amount.toFixed(2)} ${this.currency}`;
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
  }
}
