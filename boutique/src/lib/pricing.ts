// Calcul des montants — fonction pure, sans accès réseau, testée
// unitairement. Le serveur l'utilise avec les prix lus EN BASE, jamais avec
// ceux envoyés par le navigateur.

export interface PricedLine {
  unitPriceCents: number;
  quantity: number;
}

export interface ShippingRule {
  priceCents: number;
  freeOverCents: number | null;
}

export type VatRegime = "franchise" | "assujetti" | null;

export interface Totals {
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  /** TVA incluse dans le total (prix TTC), null si non applicable ou non renseignée. */
  vatCents: number | null;
}

export function shippingPrice(rule: ShippingRule, subtotalCents: number): number {
  if (rule.freeOverCents !== null && subtotalCents >= rule.freeOverCents) return 0;
  return rule.priceCents;
}

/** TVA contenue dans un prix TTC. */
export function includedVat(totalCents: number, rateBp: number): number {
  return Math.round((totalCents * rateBp) / (10_000 + rateBp));
}

export function computeTotals(lines: PricedLine[], rule: ShippingRule, vat: { regime: VatRegime; rateBp: number }, discountCents = 0): Totals {
  for (const l of lines) {
    if (!Number.isInteger(l.unitPriceCents) || l.unitPriceCents <= 0) throw new Error("Prix unitaire invalide");
    if (!Number.isInteger(l.quantity) || l.quantity <= 0) throw new Error("Quantité invalide");
  }
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
  const shippingCents = shippingPrice(rule, subtotalCents);
  const discount = Math.min(Math.max(0, discountCents), subtotalCents + shippingCents);
  const totalCents = subtotalCents + shippingCents - discount;
  const vatCents = vat.regime === "assujetti" ? includedVat(totalCents, vat.rateBp) : null;
  return { subtotalCents, shippingCents, discountCents: discount, totalCents, vatCents };
}

/** Montant restant avant la livraison offerte (pour un message encourageant, jamais insistant). */
export function remainingForFreeShipping(rule: ShippingRule, subtotalCents: number): number | null {
  if (rule.freeOverCents === null || subtotalCents >= rule.freeOverCents) return null;
  return rule.freeOverCents - subtotalCents;
}
