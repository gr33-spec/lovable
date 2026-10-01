import { Decimal } from "../shared/decimal.js";

/**
 * Unités du référentiel, avec analyse dimensionnelle : une formule qui
 * additionne des m² et des ml, ou qui annonce des ml en calculant des m²,
 * est refusée au chargement, pas découverte sur un chantier.
 *
 * Les pièces sont des nombres purs : « u » est sans dimension, donc
 * « m² × u/m² » donne bien des pièces.
 */
export interface Dim {
  /** Exposant de la longueur (m = 1, m² = 2, u/m² = -2). */
  L: number;
  /** Exposant de la masse (kg = 1). */
  M: number;
}

export interface RefUnit {
  /** Facteur vers l'unité de base (m, kg, pièce). */
  factor: Decimal;
  dim: Dim;
}

const NONE: Dim = { L: 0, M: 0 };

/** Symboles admis (minuscules, sans accent ; « m² » s'écrit aussi « m2 »). */
const SYMBOLS: Record<string, RefUnit> = {
  "1": { factor: new Decimal(1), dim: NONE },
  u: { factor: new Decimal(1), dim: NONE },
  "%": { factor: new Decimal("0.01"), dim: NONE },
  mm: { factor: new Decimal("0.001"), dim: { L: 1, M: 0 } },
  cm: { factor: new Decimal("0.01"), dim: { L: 1, M: 0 } },
  m: { factor: new Decimal(1), dim: { L: 1, M: 0 } },
  ml: { factor: new Decimal(1), dim: { L: 1, M: 0 } },
  m2: { factor: new Decimal(1), dim: { L: 2, M: 0 } },
  m3: { factor: new Decimal(1), dim: { L: 3, M: 0 } },
  kg: { factor: new Decimal(1), dim: { L: 0, M: 1 } },
  t: { factor: new Decimal(1000), dim: { L: 0, M: 1 } },
};

export const DIMENSIONLESS: Dim = NONE;

export function sameDim(a: Dim, b: Dim): boolean {
  return a.L === b.L && a.M === b.M;
}

export function mulDim(a: Dim, b: Dim, sign: 1 | -1 = 1): Dim {
  return { L: a.L + sign * b.L, M: a.M + sign * b.M };
}

export function dimLabel(d: Dim): string {
  if (d.L === 0 && d.M === 0) return "sans dimension (pièces, ratio)";
  const parts = [d.L ? `longueur^${d.L}` : "", d.M ? `masse^${d.M}` : ""].filter(Boolean);
  return parts.join(" × ");
}

function symbol(token: string): RefUnit {
  const key = token.trim().toLowerCase().replace("²", "2").replace("³", "3");
  const unit = SYMBOLS[key];
  if (!unit) throw new Error(`Unité inconnue : « ${token} »`);
  return unit;
}

/**
 * « m2 », « u/m2 », « ml/m2 », « kg/m2 », « % ». Un seul « / » ;
 * produits avec « . » (« kg/m2.cm » interdit pour rester lisible).
 */
export function parseRefUnit(text: string): RefUnit {
  const [num, den, extra] = text.split("/");
  if (extra !== undefined || num === undefined) throw new Error(`Unité invalide : « ${text} »`);
  const top = symbol(num);
  if (den === undefined) return top;
  const bottom = symbol(den);
  return { factor: top.factor.dividedBy(bottom.factor), dim: mulDim(top.dim, bottom.dim, -1) };
}
