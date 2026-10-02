import {
  Decimal,
  Money,
  parseFrenchQuantity,
  parseUnit,
  Quantity,
  type ItemMatch,
  type OfferLine,
  type RequestedItem,
  type SupplierOffer,
} from "@baticlair/domain";
import type { MatchConfidence, OfferRecord } from "./offer.repository.js";

/** Ligne de la liste envoyée au fournisseur (copie figée de la demande de prix). */
export interface RequestedLine {
  designation: string;
  quantity: string | null;
  unit: string | null;
  reference: string | null;
  /** « work » : mesure d'un ouvrage, pas une quantité à commander. */
  basis?: "work";
}

/** « 1 250,00 € » → « 1250.00 » ; null si ce n'est pas un nombre clair (jamais de devinette). */
export function decimalText(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const value = parseFrenchQuantity(raw.replace(/€|EUR|HT|%/gi, "").trim());
  return value ? value.toString() : null;
}

/** « 10 » (%) → « 0.1 ». */
export function percentToRate(raw: string | null | undefined): string | null {
  const value = decimalText(raw);
  return value ? new Decimal(value).dividedBy(100).toString() : null;
}

const itemId = (index: number) => `item-${index}`;

/** Les besoins de la comparaison : la liste demandée, dans l'ordre. */
export function requestedItems(lines: readonly RequestedLine[]): RequestedItem[] {
  return lines.map((l, i) => {
    // Mesure d'ouvrage, quantité ou unité inconnue : pas de quantité à commander (jamais 1 par défaut).
    const qty = l.basis === "work" ? null : parseFrenchQuantity(l.quantity);
    const unit = parseUnit(l.unit);
    return { id: itemId(i), designation: l.designation, quantity: qty !== null && unit ? Quantity.of(qty, unit) : null };
  });
}

function quantityOf(raw: string | null, unitRaw: string | null): Quantity | undefined {
  const value = parseFrenchQuantity(raw);
  const unit = parseUnit(unitRaw);
  return value && unit ? Quantity.of(value, unit) : undefined;
}

/** Devis lu → offre du domaine : tous les montants deviennent des décimaux exacts. */
export function toSupplierOffer(supplierId: string, offer: OfferRecord): SupplierOffer {
  const lines: OfferLine[] = offer.lines.map((l) => {
    const quantity = quantityOf(l.quantityRaw, l.unitRaw);
    const content = quantityOf(l.packagingQuantity, l.packagingUnit);
    const line: OfferLine = { id: l.id, kind: l.kind, designation: l.designation };
    if (l.reference) line.reference = l.reference;
    if (quantity) line.quantity = quantity;
    if (quantity && content) line.packaging = { packageUnit: quantity.unit, content };
    if (l.unitPrice) line.unitPrice = Money.of(l.unitPrice);
    if (l.discountRate) line.discountRate = new Decimal(l.discountRate);
    if (l.lineTotal) line.lineTotal = Money.of(l.lineTotal);
    if (l.kind === "fee") line.feeType = /livraison|transport|port/i.test(l.designation) ? "delivery" : "other";
    return line;
  });
  const result: SupplierOffer = { supplierId, lines };
  if (offer.globalDiscountRate) result.globalDiscount = { rate: new Decimal(offer.globalDiscountRate) };
  else if (offer.globalDiscountAmount) result.globalDiscount = { amount: Money.of(offer.globalDiscountAmount) };
  const printed: NonNullable<SupplierOffer["printed"]> = {};
  if (offer.totalHT) printed.totalHT = Money.of(offer.totalHT);
  if (offer.totalVAT) printed.totalVAT = Money.of(offer.totalVAT);
  if (offer.totalTTC) printed.totalTTC = Money.of(offer.totalTTC);
  result.printed = printed;
  if (offer.deliveryIncluded !== null) result.deliveryIncluded = offer.deliveryIncluded;
  return result;
}

const SCORE: Record<MatchConfidence, number> = { sure: 0.95, probable: 0.8, unsure: 0.5 };

/** Correspondances ligne demandée ↔ lignes du devis : proposées par l'IA, confirmées par l'artisan. */
export function offerMatches(supplierId: string, offer: OfferRecord, itemCount: number): ItemMatch[] {
  const byItem = new Map<number, { lineIds: string[]; score: number; confirmed: boolean }>();
  for (const l of offer.lines) {
    if (l.requestIndex === null || l.requestIndex < 0 || l.requestIndex >= itemCount) continue;
    const entry = byItem.get(l.requestIndex) ?? { lineIds: [], score: 1, confirmed: true };
    entry.lineIds.push(l.id);
    entry.score = Math.min(entry.score, l.matchConfirmed ? 1 : SCORE[l.matchConfidence ?? "unsure"]);
    entry.confirmed = entry.confirmed && l.matchConfirmed;
    byItem.set(l.requestIndex, entry);
  }
  return [...byItem.entries()].map(([index, e]) => ({
    itemId: itemId(index),
    supplierId,
    lineIds: e.lineIds,
    score: e.score,
    status: e.confirmed ? "confirmed" : "proposed",
  }));
}
