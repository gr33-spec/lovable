import { confidenceLevel, type ConfidenceLevel } from "../confidence/confidence";
import { Money } from "../money/money";
import { verifyOfferArithmetic } from "../offer/arithmetic";
import {
  computedTotalHT,
  effectiveGlobalDiscountRate,
  lineAmount,
  type OfferLine,
  type SupplierOffer,
} from "../offer/offer";
import { Quantity } from "../quantity/quantity";
import { Decimal, median } from "../shared/decimal";
import type {
  Comparability,
  ComparisonConfig,
  ComparisonInput,
  ComparisonResult,
  Finding,
  ItemComparison,
  ItemFlag,
  ItemOfferResult,
  RequestedItem,
  SupplierSummary,
} from "./types";

/**
 * Version du moteur, enregistrée avec chaque comparaison pour pouvoir
 * expliquer / rejouer un résultat. À incrémenter à chaque changement de règle.
 */
export const COMPARISON_ENGINE_VERSION = "0.1.0";

export const DEFAULT_COMPARISON_CONFIG: ComparisonConfig = {
  categoryGapMinRatio: new Decimal("0.10"),
  categoryGapMinAmount: Money.of(50),
};

const PRODUCT_KINDS = new Set(["main", "substitution"]);
const ALTERNATIVE_KINDS = new Set(["variant", "option"]);

/**
 * Moteur de comparaison déterministe (docs/comparison-engine.md).
 *
 * Il ne « choisit » rien par lui-même : il établit des faits, des inférences
 * (fondées sur les correspondances) et des avertissements. Toute somme
 * d'argent est calculée ici, jamais par un modèle d'IA.
 */
export function compareOffers(
  input: ComparisonInput,
  config: ComparisonConfig = DEFAULT_COMPARISON_CONFIG,
): ComparisonResult {
  const findings: Finding[] = [];
  const offersById = new Map(input.offers.map((o) => [o.supplierId, o]));

  // 1. Chaque besoin × chaque fournisseur, sur les données du fournisseur seul.
  const items: ItemComparison[] = input.items.map((item) => ({
    itemId: item.id,
    offers: input.offers.map((offer) => evaluateItem(item, offer, input)),
    lowestSupplierId: null,
  }));

  // 2. Estimation des manquants à partir des autres fournisseurs.
  const notQuotedByAnyone: string[] = [];
  for (const cmp of items) {
    const priced = cmp.offers.filter((o) => o.status === "covered" && o.normalizedAmount);
    if (priced.length === 0) {
      notQuotedByAnyone.push(cmp.itemId);
      continue;
    }
    const reference = Money.of(median(priced.map((o) => o.normalizedAmount!.amount)));
    for (const o of cmp.offers) {
      if (o.status === "missing") o.estimatedAmount = reference;
    }
    cmp.lowestSupplierId = [...priced].sort((a, b) =>
      a.normalizedAmount!.compare(b.normalizedAmount!),
    )[0]!.supplierId;
  }
  if (notQuotedByAnyone.length > 0) {
    findings.push({
      code: "ITEM_NOT_QUOTED_BY_ANYONE",
      nature: "INFERENCE",
      severity: "attention",
      itemIds: notQuotedByAnyone,
      count: notQuotedByAnyone.length,
      priority: 70,
    });
  }
  const commonBase = new Set(
    input.items.map((i) => i.id).filter((id) => !notQuotedByAnyone.includes(id)),
  );

  // 3. Synthèse par fournisseur.
  const suppliers = input.offers.map((offer) =>
    summarizeSupplier(offer, items, commonBase, input, findings),
  );

  // 4. Constats transverses.
  findings.push(...rankingFindings(suppliers));
  findings.push(...categoryFindings(input.items, items, config));

  findings.sort((a, b) => b.priority - a.priority);
  return { engineVersion: COMPARISON_ENGINE_VERSION, items, suppliers, findings };
}

function evaluateItem(
  item: RequestedItem,
  offer: SupplierOffer,
  input: ComparisonInput,
): ItemOfferResult {
  const match = input.matches.find(
    (m) => m.itemId === item.id && m.supplierId === offer.supplierId,
  );
  const matchedLines = (match?.lineIds ?? [])
    .map((id) => offer.lines.find((l) => l.id === id))
    .filter((l): l is OfferLine => l !== undefined);
  const productLines = matchedLines.filter((l) => PRODUCT_KINDS.has(l.kind));

  const base: ItemOfferResult = {
    supplierId: offer.supplierId,
    status: "missing",
    confidence: null,
    lineIds: [],
    offeredQuantity: null,
    billedAmount: null,
    normalizedAmount: null,
    effectiveUnitPrice: null,
    estimatedAmount: null,
    flags: [],
  };

  if (!match || productLines.length === 0) {
    // Le produit n'existe éventuellement qu'en variante : il reste manquant
    // dans l'offre principale, mais on le signale.
    if (matchedLines.some((l) => ALTERNATIVE_KINDS.has(l.kind))) {
      base.flags.push("ONLY_AS_VARIANT");
      base.lineIds = matchedLines.map((l) => l.id);
    }
    return base;
  }

  const confidence: ConfidenceLevel =
    match.status === "confirmed" ? "certain" : confidenceLevel(match.score);
  const flags: ItemFlag[] = [];
  if (productLines.some((l) => l.kind === "substitution")) flags.push("SUBSTITUTION");

  const keep = new Decimal(1).minus(effectiveGlobalDiscountRate(offer));
  const amounts = productLines.map((l) => lineAmount(l));
  const billed = amounts.every((a) => a !== null)
    ? Money.sum(amounts as Money[]).multiply(keep)
    : null;
  if (!billed) flags.push("NOT_PRICED");

  // Quantité proposée dans l'unité du besoin (conditionnement compris).
  const converted = productLines.map((l) =>
    l.quantity ? l.quantity.convertTo(item.quantity.unit, l.packaging) : null,
  );
  let offered: Quantity | null = null;
  if (converted.every((q) => q !== null)) {
    offered = Quantity.of(
      converted.reduce((acc, q) => acc.plus(q!.value), new Decimal(0)),
      item.quantity.unit,
    );
  } else {
    flags.push("UNIT_NOT_COMPARABLE");
  }

  let normalized: Money | null = null;
  let unitPrice: Money | null = null;
  if (billed && offered && !offered.value.isZero()) {
    unitPrice = billed.divide(offered.value);
    normalized = unitPrice.multiply(item.quantity.value);
    const cmp = offered.value.comparedTo(item.quantity.value);
    if (cmp < 0) flags.push("QUANTITY_LOWER");
    if (cmp > 0) flags.push("QUANTITY_HIGHER");
  } else if (billed) {
    // Impossible de ramener à la quantité demandée : on garde le facturé,
    // signalé comme non comparable.
    normalized = billed;
  }

  return {
    ...base,
    status: "covered",
    confidence,
    lineIds: productLines.map((l) => l.id),
    offeredQuantity: offered,
    billedAmount: billed,
    normalizedAmount: normalized,
    effectiveUnitPrice: unitPrice,
    flags,
  };
}

function summarizeSupplier(
  offer: SupplierOffer,
  items: ItemComparison[],
  commonBase: ReadonlySet<string>,
  input: ComparisonInput,
  findings: Finding[],
): SupplierSummary {
  const sid = offer.supplierId;
  const results = items.map((i) => ({ itemId: i.itemId, r: i.offers.find((o) => o.supplierId === sid)! }));
  const sumKind = (kind: string) =>
    Money.sum(offer.lines.filter((l) => l.kind === kind).map(lineAmount).filter((m): m is Money => m !== null));

  const feesHT = sumKind("fee");
  const depositsHT = sumKind("deposit");

  // Lignes principales qui ne correspondent à aucun besoin.
  const matchedLineIds = new Set(
    input.matches.filter((m) => m.supplierId === sid).flatMap((m) => m.lineIds),
  );
  const extras = offer.lines.filter((l) => PRODUCT_KINDS.has(l.kind) && !matchedLineIds.has(l.id));
  const keep = new Decimal(1).minus(effectiveGlobalDiscountRate(offer));
  const extrasHT = Money.sum(extras.map(lineAmount).filter((m): m is Money => m !== null)).multiply(keep);

  const covered = results.filter((x) => x.r.status === "covered");
  const missing = results.filter((x) => x.r.status === "missing");
  const uncertain = covered.filter((x) => x.r.confidence === "to_verify");

  // Total comparable sur la base commune.
  let comparable = Money.zero();
  let estimated = Money.zero();
  let computable = true;
  for (const { itemId, r } of results) {
    if (!commonBase.has(itemId)) continue;
    if (r.status === "covered" && r.normalizedAmount) {
      comparable = comparable.add(r.normalizedAmount);
    } else if (r.estimatedAmount) {
      comparable = comparable.add(r.estimatedAmount);
      estimated = estimated.add(r.estimatedAmount);
    } else {
      computable = false;
    }
  }
  comparable = comparable.add(feesHT);

  const missingInBase = missing.filter((x) => commonBase.has(x.itemId));
  let comparability: Comparability = "complete";
  if (!computable) comparability = "incomplete";
  else if (missingInBase.length > 0) comparability = "estimated";
  else if (uncertain.length > 0) comparability = "provisional";

  const arithmetic = verifyOfferArithmetic(offer);

  // --- Constats propres au fournisseur ---
  if (missingInBase.length > 0) {
    findings.push({
      code: "ITEMS_MISSING",
      nature: "INFERENCE",
      severity: "important",
      supplierId: sid,
      itemIds: missingInBase.map((x) => x.itemId),
      count: missingInBase.length,
      amount: estimated.roundToCents(),
      priority: 90,
    });
  } else if (missing.length === 0 && uncertain.length === 0) {
    findings.push({ code: "FULL_COVERAGE", nature: "INFERENCE", severity: "info", supplierId: sid, priority: 60 });
  }

  for (const { itemId, r } of results) {
    if (r.flags.includes("ONLY_AS_VARIANT")) {
      findings.push({ code: "VARIANT_AVAILABLE", nature: "FACT", severity: "info", supplierId: sid, itemIds: [itemId], lineIds: r.lineIds, priority: 30 });
    }
    if (r.flags.includes("SUBSTITUTION")) {
      findings.push({ code: "SUBSTITUTION_PROPOSED", nature: "FACT", severity: "attention", supplierId: sid, itemIds: [itemId], lineIds: r.lineIds, priority: 65 });
    }
    if (r.flags.includes("QUANTITY_LOWER") || r.flags.includes("QUANTITY_HIGHER")) {
      findings.push({ code: "QUANTITY_DIFFERS", nature: "FACT", severity: r.flags.includes("QUANTITY_LOWER") ? "attention" : "info", supplierId: sid, itemIds: [itemId], lineIds: r.lineIds, priority: r.flags.includes("QUANTITY_LOWER") ? 55 : 25 });
    }
    if (r.flags.includes("UNIT_NOT_COMPARABLE")) {
      findings.push({ code: "UNIT_NOT_COMPARABLE", nature: "WARNING", severity: "attention", supplierId: sid, itemIds: [itemId], lineIds: r.lineIds, priority: 58 });
    }
    if (r.status === "covered" && r.confidence === "to_verify") {
      findings.push({ code: "UNCERTAIN_MATCH", nature: "WARNING", severity: "attention", supplierId: sid, itemIds: [itemId], lineIds: r.lineIds, priority: 62 });
    }
  }

  for (const line of offer.lines) {
    if (line.kind === "variant" && !results.some((x) => x.r.lineIds.includes(line.id))) {
      findings.push({ code: "VARIANT_AVAILABLE", nature: "FACT", severity: "info", supplierId: sid, lineIds: [line.id], ...(lineAmount(line) ? { amount: lineAmount(line)! } : {}), priority: 28 });
    }
    if (line.kind === "option") {
      findings.push({ code: "OPTION_PRESENT", nature: "FACT", severity: "info", supplierId: sid, lineIds: [line.id], ...(lineAmount(line) ? { amount: lineAmount(line)! } : {}), priority: 20 });
    }
  }

  const deliveryLines = offer.lines.filter((l) => l.kind === "fee" && l.feeType === "delivery");
  if (deliveryLines.length > 0) {
    findings.push({ code: "DELIVERY_FEE", nature: "FACT", severity: "info", supplierId: sid, lineIds: deliveryLines.map((l) => l.id), amount: Money.sum(deliveryLines.map(lineAmount).filter((m): m is Money => m !== null)), priority: 40 });
  } else if (!offer.deliveryIncluded) {
    findings.push({ code: "DELIVERY_NOT_SPECIFIED", nature: "WARNING", severity: "attention", supplierId: sid, priority: 45 });
  }
  if (!depositsHT.isZero()) {
    findings.push({ code: "DEPOSIT_PRESENT", nature: "FACT", severity: "info", supplierId: sid, amount: depositsHT, priority: 15 });
  }
  if (extras.length > 0) {
    findings.push({ code: "EXTRA_LINES", nature: "INFERENCE", severity: "info", supplierId: sid, lineIds: extras.map((l) => l.id), amount: extrasHT.roundToCents(), count: extras.length, priority: 35 });
  }

  for (const issue of arithmetic.issues) {
    if (issue.code === "TOTAL_HT_MISMATCH" && issue.explanation) {
      findings.push({ code: "PRINTED_TOTAL_INCLUDES_NON_COUNTED_LINES", nature: "INFERENCE", severity: "important", supplierId: sid, lineIds: issue.explanation.lineIds, amount: issue.printed.subtract(issue.computed), priority: 85 });
    } else {
      findings.push({
        code: "ARITHMETIC_MISMATCH",
        nature: "WARNING",
        severity: "attention",
        supplierId: sid,
        ...(issue.code === "LINE_TOTAL_MISMATCH" ? { lineIds: [issue.lineId] } : {}),
        amount: issue.printed.subtract(issue.computed),
        priority: 50,
      });
    }
  }

  return {
    supplierId: sid,
    arithmetic,
    printedTotalHT: offer.printed?.totalHT ?? null,
    computedTotalHT: computedTotalHT(offer).roundToCents(),
    feesHT,
    depositsHT,
    extrasHT: extrasHT.roundToCents(),
    coveredCount: covered.length,
    missingCount: missing.length,
    uncertainCount: uncertain.length,
    comparableTotalHT: computable ? comparable.roundToCents() : null,
    estimatedPartHT: estimated.roundToCents(),
    comparability,
  };
}

/**
 * Cas critique (§52) : le total affiché le plus bas ne doit jamais être
 * présenté comme « le moins cher » si l'offre est incomplète.
 */
function rankingFindings(suppliers: SupplierSummary[]): Finding[] {
  const findings: Finding[] = [];
  if (suppliers.length < 2) return findings;

  const displayed = (s: SupplierSummary) => s.printedTotalHT ?? s.computedTotalHT;
  const byDisplayed = [...suppliers].sort((a, b) => displayed(a).compare(displayed(b)));
  const lowestDisplayed = byDisplayed[0]!;

  // Référence : l'offre complète au total affiché le plus bas.
  const fullCoverage = byDisplayed.find((s) => s.missingCount === 0);
  if (lowestDisplayed.missingCount > 0 && fullCoverage) {
    findings.push({
      code: "LOWEST_TOTAL_NOT_COMPARABLE",
      nature: "WARNING",
      severity: "important",
      supplierId: lowestDisplayed.supplierId,
      otherSupplierId: fullCoverage.supplierId,
      amount: displayed(fullCoverage).subtract(displayed(lowestDisplayed)).roundToCents(),
      count: lowestDisplayed.missingCount,
      priority: 95,
    });
  }

  const comparable = suppliers.filter(
    (s) => s.comparableTotalHT && s.comparability !== "incomplete",
  );
  const byComparable = [...comparable].sort((a, b) => a.comparableTotalHT!.compare(b.comparableTotalHT!));
  const best = byComparable[0];

  // Une recommandation n'est émise que si la meilleure offre est complète
  // ou seulement provisoire, et qu'elle devance une autre offre complète.
  if (best && (best.comparability === "complete" || best.comparability === "provisional")) {
    const runnerUp = byComparable[1];
    if (runnerUp) {
      findings.push({
        code: "BEST_COMPARABLE_OFFER",
        nature: "RECOMMENDATION",
        severity: "info",
        supplierId: best.supplierId,
        otherSupplierId: runnerUp.supplierId,
        amount: runnerUp.comparableTotalHT!.subtract(best.comparableTotalHT!),
        priority: 80,
      });
    }
  }
  return findings;
}

/**
 * « X est 18 % moins cher que Y sur le bardage » : calculé uniquement sur
 * les besoins de la famille couverts par LES DEUX fournisseurs.
 */
function categoryFindings(
  requested: RequestedItem[],
  items: ItemComparison[],
  config: ComparisonConfig,
): Finding[] {
  const findings: Finding[] = [];
  const categories = new Map<string, string[]>();
  for (const it of requested) {
    if (!it.category) continue;
    categories.set(it.category, [...(categories.get(it.category) ?? []), it.id]);
  }
  const supplierIds = items[0]?.offers.map((o) => o.supplierId) ?? [];

  for (const [category, itemIds] of categories) {
    for (const a of supplierIds) {
      for (const b of supplierIds) {
        if (a === b) continue;
        let totalA = Money.zero();
        let totalB = Money.zero();
        const shared: string[] = [];
        for (const id of itemIds) {
          const cmp = items.find((i) => i.itemId === id)!;
          const ra = cmp.offers.find((o) => o.supplierId === a)!;
          const rb = cmp.offers.find((o) => o.supplierId === b)!;
          if (ra.normalizedAmount && rb.normalizedAmount && ra.status === "covered" && rb.status === "covered") {
            totalA = totalA.add(ra.normalizedAmount);
            totalB = totalB.add(rb.normalizedAmount);
            shared.push(id);
          }
        }
        if (shared.length === 0 || !totalA.lessThan(totalB)) continue;
        const gap = totalB.subtract(totalA);
        const ratio = gap.ratioTo(totalB);
        if (ratio.greaterThanOrEqualTo(config.categoryGapMinRatio) && !gap.lessThan(config.categoryGapMinAmount)) {
          findings.push({
            code: "CATEGORY_PRICE_GAP",
            nature: "INFERENCE",
            severity: "info",
            supplierId: a,
            otherSupplierId: b,
            category,
            itemIds: shared,
            amount: gap.roundToCents(),
            ratio: ratio.toDecimalPlaces(3),
            priority: 50 + Math.min(20, Math.round(ratio.toNumber() * 50)),
          });
        }
      }
    }
  }
  return findings;
}
