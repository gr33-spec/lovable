// Contrat d'un fournisseur de paiement. Le reste de la boutique ne connaît
// que cette interface : remplacer Stripe ne demande qu'une nouvelle
// implémentation de ce fichier, sans toucher au panier ni aux commandes.

export interface CheckoutLine {
  name: string;
  unitAmountCents: number;
  quantity: number;
  imageUrl?: string;
}

export interface CheckoutRequest {
  orderId: string;
  orderNumber: string;
  email: string;
  lines: CheckoutLine[];
  shipping: { name: string; amountCents: number };
  successUrl: string;
  cancelUrl: string;
  expiresAt: Date;
  allowPromotionCodes: boolean;
}

export interface CheckoutSessionInfo {
  id: string;
  /** open : en attente ; complete : terminée côté client ; expired : plus utilisable. */
  status: "open" | "complete" | "expired";
  paymentStatus: "paid" | "unpaid" | "no_payment_required";
  paymentIntentId: string | null;
  orderId: string | null;
  amountSubtotalCents: number | null;
  amountShippingCents: number | null;
  amountDiscountCents: number;
  amountTotalCents: number | null;
  livemode: boolean;
}

export type PaymentEvent =
  | { id: string; kind: "checkout_completed" | "checkout_expired" | "async_payment_succeeded" | "async_payment_failed"; livemode: boolean; session: CheckoutSessionInfo }
  | { id: string; kind: "charge_refunded"; livemode: boolean; paymentIntentId: string; amountRefundedCents: number; fullyRefunded: boolean }
  | { id: string; kind: "ignored"; livemode: boolean; type: string };

export interface AccountInfo {
  id: string;
  displayName: string;
  email: string | null;
  country: string | null;
  chargesEnabled: boolean;
  livemode: boolean;
}

export interface PaymentProvider {
  readonly name: "stripe" | "fake";
  readonly livemode: boolean;
  createCheckout(req: CheckoutRequest): Promise<{ id: string; url: string }>;
  retrieveCheckout(sessionId: string): Promise<CheckoutSessionInfo>;
  /** Rend la session inutilisable. Si le paiement a déjà abouti, renvoie simplement son état « complete ». */
  expireCheckout(sessionId: string): Promise<CheckoutSessionInfo>;
  refund(paymentIntentId: string, amountCents: number, idempotencyKey: string): Promise<{ id: string }>;
  /** Vérifie la signature et décode l'événement. Lève une erreur si la signature est invalide. */
  parseWebhook(rawBody: string, signature: string | null): Promise<PaymentEvent>;
  account(): Promise<AccountInfo>;
}

export class PaymentUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "PaymentUnavailableError";
  }
}
