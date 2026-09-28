import { Decimal as DecimalJs } from "decimal.js";

/**
 * Décimal à précision arbitraire utilisé pour TOUS les calculs métier
 * (argent, quantités, taux). Jamais de `number` flottant pour un montant.
 *
 * Arrondi commercial par défaut : au plus proche, demi vers le haut.
 */
export const Decimal = DecimalJs.clone({
  precision: 40,
  rounding: DecimalJs.ROUND_HALF_UP,
});
export type Decimal = InstanceType<typeof Decimal>;

/** Valeurs acceptées pour construire un décimal. Préférer les chaînes. */
export type DecimalInput = string | number | Decimal;

export function toDecimal(value: DecimalInput): Decimal {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new RangeError(`Valeur numérique invalide : ${value}`);
  }
  return new Decimal(value);
}

/** Médiane d'une liste non vide de décimaux. */
export function median(values: readonly Decimal[]): Decimal {
  if (values.length === 0) throw new RangeError("median() sur une liste vide");
  const sorted = [...values].sort((a, b) => a.comparedTo(b));
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return sorted[mid - 1]!.plus(sorted[mid]!).dividedBy(2);
}
