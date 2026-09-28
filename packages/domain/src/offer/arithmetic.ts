import { Money } from "../money/money";
import { Decimal } from "../shared/decimal";
import {
  COUNTED_KINDS,
  DISCOUNTABLE_KINDS,
  effectiveGlobalDiscountRate,
  computedLineAmount,
  computedTotalHT,
  lineAmount,
  type SupplierOffer,
} from "./offer";

/**
 * Vérification de la cohérence mathématique d'une offre (§54).
 *
 * Un écart n'est JAMAIS présenté comme une erreur du fournisseur : c'est un
 * point « à vérifier » (l'extraction elle-même peut s'être trompée).
 */
export type ArithmeticIssue =
  | { code: "LINE_TOTAL_MISMATCH"; lineId: string; computed: Money; printed: Money }
  | { code: "TOTAL_HT_MISMATCH"; computed: Money; printed: Money; explanation?: TotalMismatchExplanation }
  | { code: "VAT_MISMATCH"; computed: Money; printed: Money }
  | { code: "TOTAL_TTC_MISMATCH"; computed: Money; printed: Money };

/** Hypothèse vérifiée expliquant un écart de total HT. */
export type TotalMismatchExplanation = {
  code: "PRINTED_TOTAL_INCLUDES_NON_COUNTED_LINES";
  lineIds: string[];
};

export interface ArithmeticCheck {
  status: "consistent" | "inconsistent" | "insufficient_data";
  issues: ArithmeticIssue[];
}

export interface ArithmeticTolerance {
  /** Écart toléré par ligne (arrondis fournisseur). */
  perLine: Money;
  /** Écart toléré sur un total. */
  perTotal: Money;
}

export const DEFAULT_ARITHMETIC_TOLERANCE: ArithmeticTolerance = {
  perLine: Money.of("0.02"),
  perTotal: Money.of("0.05"),
};

function withinTolerance(a: Money, b: Money, tolerance: Money): boolean {
  return !a.subtract(b).abs().greaterThan(tolerance);
}

export function verifyOfferArithmetic(
  offer: SupplierOffer,
  tolerance: ArithmeticTolerance = DEFAULT_ARITHMETIC_TOLERANCE,
): ArithmeticCheck {
  const issues: ArithmeticIssue[] = [];
  let checks = 0;

  for (const line of offer.lines) {
    const computed = computedLineAmount(line);
    if (!computed || !line.lineTotal) continue;
    checks++;
    if (!withinTolerance(computed, line.lineTotal, tolerance.perLine)) {
      issues.push({
        code: "LINE_TOTAL_MISMATCH",
        lineId: line.id,
        computed: computed.roundToCents(),
        printed: line.lineTotal,
      });
    }
  }

  const printed = offer.printed;
  const computedHT = computedTotalHT(offer);

  if (printed?.totalHT) {
    checks++;
    if (!withinTolerance(computedHT, printed.totalHT, tolerance.perTotal)) {
      issues.push({
        code: "TOTAL_HT_MISMATCH",
        computed: computedHT.roundToCents(),
        printed: printed.totalHT,
        ...explainTotalMismatch(offer, computedHT, printed.totalHT, tolerance),
      });
    }
  }

  const vatBase = computeVat(offer);
  if (printed?.totalVAT && vatBase) {
    checks++;
    if (!withinTolerance(vatBase, printed.totalVAT, tolerance.perTotal)) {
      issues.push({ code: "VAT_MISMATCH", computed: vatBase.roundToCents(), printed: printed.totalVAT });
    }
  }

  if (printed?.totalTTC && printed.totalHT && printed.totalVAT) {
    checks++;
    const expectedTTC = printed.totalHT.add(printed.totalVAT);
    if (!withinTolerance(expectedTTC, printed.totalTTC, tolerance.perTotal)) {
      issues.push({ code: "TOTAL_TTC_MISMATCH", computed: expectedTTC, printed: printed.totalTTC });
    }
  }

  if (checks === 0) return { status: "insufficient_data", issues };
  return { status: issues.length === 0 ? "consistent" : "inconsistent", issues };
}

/**
 * Cas fréquent : le fournisseur a additionné une variante ou une option dans
 * son total imprimé. On teste cette hypothèse précise plutôt que de conclure
 * à une simple erreur.
 */
function explainTotalMismatch(
  offer: SupplierOffer,
  computedHT: Money,
  printedHT: Money,
  tolerance: ArithmeticTolerance,
): { explanation?: TotalMismatchExplanation } {
  const nonCounted = offer.lines.filter(
    (l) => (l.kind === "variant" || l.kind === "option") && lineAmount(l) !== null,
  );
  // Essaie chaque ligne seule, puis toutes ensemble (suffisant en pratique ;
  // une recherche combinatoire complète serait inutilement coûteuse).
  const candidates = [...nonCounted.map((l) => [l]), nonCounted];
  const discountRate = offer.globalDiscount?.rate ?? new Decimal(0);

  for (const group of candidates) {
    if (group.length === 0) continue;
    const extra = Money.sum(group.map((l) => lineAmount(l)!));
    const hypotheses = [computedHT.add(extra), computedHT.add(extra.multiply(new Decimal(1).minus(discountRate)))];
    if (hypotheses.some((h) => withinTolerance(h, printedHT, tolerance.perTotal))) {
      return {
        explanation: {
          code: "PRINTED_TOTAL_INCLUDES_NON_COUNTED_LINES",
          lineIds: group.map((l) => l.id),
        },
      };
    }
  }
  return {};
}

/**
 * TVA calculée ligne à ligne, seulement si toutes les lignes comptées ont un
 * taux. La remise globale ne réduit que la base des lignes produit.
 */
function computeVat(offer: SupplierOffer): Money | null {
  const counted = offer.lines.filter((l) => COUNTED_KINDS.has(l.kind) && lineAmount(l));
  if (counted.length === 0 || counted.some((l) => !l.vatRate)) return null;
  const keep = new Decimal(1).minus(effectiveGlobalDiscountRate(offer));
  return Money.sum(
    counted.map((l) => {
      const base = DISCOUNTABLE_KINDS.has(l.kind) ? lineAmount(l)!.multiply(keep) : lineAmount(l)!;
      return base.multiply(l.vatRate!);
    }),
  );
}
