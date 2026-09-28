import { Decimal, toDecimal, type DecimalInput } from "../shared/decimal";
import { UNIT_DEFINITIONS, dimensionOf, type UnitCode } from "./unit";

/**
 * Contenu d'un conditionnement, tel qu'indiqué par le document
 * (ex. « rouleau de 47 m² » → { packageUnit: ROULEAU, content: 47 M2 }).
 * C'est la SEULE source autorisée pour convertir une unité de conditionnement.
 */
export interface PackagingSpec {
  packageUnit: UnitCode;
  content: Quantity;
}

/** Une quantité n'existe jamais sans son unité. */
export class Quantity {
  private constructor(
    readonly value: Decimal,
    readonly unit: UnitCode,
  ) {}

  static of(value: DecimalInput, unit: UnitCode): Quantity {
    const v = toDecimal(value);
    if (v.isNegative()) throw new RangeError("Une quantité ne peut pas être négative");
    return new Quantity(v, unit);
  }

  /**
   * Convertit dans l'unité cible si — et seulement si — la conversion est sûre.
   * Retourne `null` sinon : l'appelant doit alors signaler l'incompatibilité,
   * jamais inventer un facteur.
   */
  convertTo(target: UnitCode, packaging?: PackagingSpec): Quantity | null {
    if (target === this.unit) return this;

    const from = UNIT_DEFINITIONS[this.unit];
    const to = UNIT_DEFINITIONS[target];

    if (from.dimension === to.dimension && from.toBase !== null && to.toBase !== null) {
      return new Quantity(
        this.value.times(from.toBase).dividedBy(to.toBase),
        target,
      );
    }

    if (!packaging) return null;

    // Conditionnement → contenu (ex. 2 rouleaux de 47 m² → 94 m²)
    if (this.unit === packaging.packageUnit) {
      const content = packaging.content.convertTo(target);
      return content ? new Quantity(this.value.times(content.value), target) : null;
    }

    // Contenu → conditionnement (ex. 94 m² → 2 rouleaux de 47 m²)
    if (target === packaging.packageUnit) {
      const self = this.convertTo(packaging.content.unit);
      if (!self || packaging.content.value.isZero()) return null;
      return new Quantity(self.value.dividedBy(packaging.content.value), target);
    }

    return null;
  }

  isComparableWith(other: Quantity, packaging?: PackagingSpec): boolean {
    return other.convertTo(this.unit, packaging) !== null;
  }

  get dimension() {
    return dimensionOf(this.unit);
  }

  toJSON(): { value: string; unit: UnitCode } {
    return { value: this.value.toFixed(), unit: this.unit };
  }

  toString(): string {
    return `${this.value.toFixed()} ${this.unit}`;
  }
}
