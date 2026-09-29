import { Money } from "../money/money.js";
import { Decimal } from "../shared/decimal.js";
import type { PackagingSpec, Quantity } from "../quantity/quantity.js";

/**
 * Nature d'une ligne d'offre fournisseur. C'est une notion MÉTIER explicite :
 * elle détermine ce qui entre dans les totaux (docs/comparison-engine.md).
 *
 * - main          : offre principale, comptée.
 * - substitution  : le fournisseur REMPLACE le produit demandé par un autre ; comptée, à valider.
 * - variant       : proposition alternative EN PLUS de l'offre principale ; jamais additionnée.
 *                   (« variante » et « alternative » ont le même traitement métier.)
 * - option        : article facultatif non demandé ; jamais additionné.
 * - fee           : frais (livraison, éco-contribution, manutention…) ; comptés.
 * - deposit       : consigne remboursable (palette…) ; payée mais exclue du total comparable.
 * - info          : ligne de texte sans prix (commentaire, titre de section).
 */
export type OfferLineKind =
  | "main"
  | "substitution"
  | "variant"
  | "option"
  | "fee"
  | "deposit"
  | "info";

export type FeeType = "delivery" | "eco_contribution" | "handling" | "other";

export interface OfferLine {
  id: string;
  kind: OfferLineKind;
  designation: string;
  reference?: string;
  /** Quantité proposée, dans l'unité imprimée par le fournisseur. */
  quantity?: Quantity;
  /** Contenu du conditionnement lorsque le document l'indique. */
  packaging?: PackagingSpec;
  /** Prix unitaire HT par unité de `quantity`. */
  unitPrice?: Money;
  /** Remise ligne, taux décimal (« 0.10 » = 10 %). */
  discountRate?: Decimal;
  /** Total HT imprimé sur la ligne (FAIT issu du document). */
  lineTotal?: Money;
  /** Taux de TVA décimal (« 0.20 »). */
  vatRate?: Decimal;
  feeType?: FeeType;
  /** Pour une variante / option / substitution : lignes principales concernées. */
  relatesToLineIds?: string[];
}

export interface GlobalDiscount {
  /** Taux décimal appliqué au sous-total des lignes comptées hors frais. */
  rate?: Decimal;
  /** Ou montant HT fixe. */
  amount?: Money;
}

/** Totaux tels qu'imprimés sur le document (FAITS, possiblement incohérents). */
export interface PrintedTotals {
  totalHT?: Money;
  totalVAT?: Money;
  totalTTC?: Money;
}

export interface SupplierOffer {
  supplierId: string;
  lines: OfferLine[];
  globalDiscount?: GlobalDiscount;
  printed?: PrintedTotals;
  /** Le document indique explicitement que la livraison est incluse / franco. */
  deliveryIncluded?: boolean;
}

/** Lignes qui composent le montant réellement engagé de l'offre principale. */
export const COUNTED_KINDS: ReadonlySet<OfferLineKind> = new Set([
  "main",
  "substitution",
  "fee",
  "deposit",
]);

/** Lignes « produit » soumises à la remise globale. */
export const DISCOUNTABLE_KINDS: ReadonlySet<OfferLineKind> = new Set([
  "main",
  "substitution",
]);

/** Montant HT calculé d'une ligne à partir de ses composants, si possible. */
export function computedLineAmount(line: OfferLine): Money | null {
  if (!line.unitPrice || !line.quantity) return null;
  const gross = line.unitPrice.multiply(line.quantity.value);
  return line.discountRate
    ? gross.multiply(new Decimal(1).minus(line.discountRate))
    : gross;
}

/**
 * Montant HT retenu pour une ligne : le total imprimé s'il existe (fait),
 * sinon le montant calculé. `null` si la ligne n'est pas chiffrée.
 */
export function lineAmount(line: OfferLine): Money | null {
  return line.lineTotal ?? computedLineAmount(line);
}

function sumLines(lines: readonly OfferLine[], kinds: ReadonlySet<OfferLineKind>): Money {
  return Money.sum(
    lines
      .filter((l) => kinds.has(l.kind))
      .map((l) => lineAmount(l))
      .filter((m): m is Money => m !== null),
  );
}

/** Sous-total des lignes produit comptées (base de la remise globale). */
export function discountableSubtotal(offer: SupplierOffer): Money {
  return sumLines(offer.lines, DISCOUNTABLE_KINDS);
}

/** Montant de la remise globale (positif). */
export function globalDiscountAmount(offer: SupplierOffer): Money {
  const d = offer.globalDiscount;
  if (!d) return Money.zero();
  if (d.amount) return d.amount;
  if (d.rate) return discountableSubtotal(offer).multiply(d.rate);
  return Money.zero();
}

/**
 * Taux effectif de remise globale (utile pour la répartir sur chaque article
 * lors de la comparaison). 0 si aucune remise ou sous-total nul.
 */
export function effectiveGlobalDiscountRate(offer: SupplierOffer): Decimal {
  const d = offer.globalDiscount;
  if (!d) return new Decimal(0);
  if (d.rate) return d.rate;
  const base = discountableSubtotal(offer);
  if (!d.amount || base.isZero()) return new Decimal(0);
  return d.amount.ratioTo(base);
}

/** Total HT calculé de l'offre principale (lignes comptées − remise globale). */
export function computedTotalHT(offer: SupplierOffer): Money {
  return sumLines(offer.lines, COUNTED_KINDS).subtract(globalDiscountAmount(offer));
}
