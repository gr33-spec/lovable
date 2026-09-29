import "server-only";
import Stripe from "stripe";
import type { AccountInfo, CheckoutRequest, CheckoutSessionInfo, PaymentEvent, PaymentProvider } from "./types";

// Stripe Checkout (page de paiement hébergée par Stripe) : les données de
// carte ne transitent jamais par la boutique ; Apple Pay / Google Pay sont
// proposés automatiquement selon l'appareil et le tableau de bord Stripe.

function toInfo(s: Stripe.Checkout.Session): CheckoutSessionInfo {
  const pi = s.payment_intent;
  return {
    id: s.id,
    status: (s.status ?? "open") as CheckoutSessionInfo["status"],
    paymentStatus: (["paid", "unpaid", "no_payment_required"].includes(s.payment_status) ? s.payment_status : "unpaid") as CheckoutSessionInfo["paymentStatus"],
    paymentIntentId: typeof pi === "string" ? pi : (pi?.id ?? null),
    orderId: s.metadata?.order_id ?? s.client_reference_id ?? null,
    amountSubtotalCents: s.amount_subtotal ?? null,
    amountShippingCents: s.shipping_cost?.amount_total ?? null,
    amountDiscountCents: s.total_details?.amount_discount ?? 0,
    amountTotalCents: s.amount_total ?? null,
    livemode: s.livemode,
  };
}

export class StripeProvider implements PaymentProvider {
  readonly name = "stripe" as const;
  readonly livemode: boolean;
  private stripe: Stripe;

  constructor(
    secretKey: string,
    private webhookSecret: string,
    mode: "test" | "live",
  ) {
    this.stripe = new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 20_000, appInfo: { name: "La Boheme en Paillettes" } });
    this.livemode = mode === "live";
  }

  async createCheckout(req: CheckoutRequest) {
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: "payment",
        locale: "fr",
        customer_email: req.email,
        client_reference_id: req.orderId,
        metadata: { order_id: req.orderId, order_number: req.orderNumber },
        payment_intent_data: {
          metadata: { order_id: req.orderId, order_number: req.orderNumber },
          description: `Commande ${req.orderNumber}`,
        },
        line_items: req.lines.map((l) => ({
          quantity: l.quantity,
          price_data: {
            currency: "eur",
            unit_amount: l.unitAmountCents,
            product_data: { name: l.name, ...(l.imageUrl?.startsWith("https://") ? { images: [l.imageUrl] } : {}) },
          },
        })),
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              display_name: req.shipping.name.slice(0, 100),
              fixed_amount: { amount: req.shipping.amountCents, currency: "eur" },
            },
          },
        ],
        allow_promotion_codes: req.allowPromotionCodes || undefined,
        expires_at: Math.floor(req.expiresAt.getTime() / 1000),
        success_url: req.successUrl,
        cancel_url: req.cancelUrl,
      },
      // Un double envoi réseau ne crée jamais deux sessions pour une commande.
      { idempotencyKey: `checkout-${req.orderId}` },
    );
    if (!session.url) throw new Error("Stripe n'a pas renvoyé d'adresse de paiement");
    return { id: session.id, url: session.url };
  }

  async retrieveCheckout(sessionId: string) {
    return toInfo(await this.stripe.checkout.sessions.retrieve(sessionId));
  }

  async expireCheckout(sessionId: string) {
    const current = await this.stripe.checkout.sessions.retrieve(sessionId);
    if (current.status !== "open") return toInfo(current);
    try {
      return toInfo(await this.stripe.checkout.sessions.expire(sessionId));
    } catch (err) {
      // Course possible : la cliente vient de payer. On relit l'état réel.
      const again = await this.stripe.checkout.sessions.retrieve(sessionId);
      if (again.status !== "open") return toInfo(again);
      throw err;
    }
  }

  async refund(paymentIntentId: string, amountCents: number, idempotencyKey: string) {
    const refund = await this.stripe.refunds.create({ payment_intent: paymentIntentId, amount: amountCents }, { idempotencyKey });
    return { id: refund.id };
  }

  async parseWebhook(rawBody: string, signature: string | null): Promise<PaymentEvent> {
    if (!signature) throw new Error("Signature absente");
    const event = await this.stripe.webhooks.constructEventAsync(rawBody, signature, this.webhookSecret);
    const base = { id: event.id, livemode: event.livemode };
    switch (event.type) {
      case "checkout.session.completed":
        return { ...base, kind: "checkout_completed", session: toInfo(event.data.object) };
      case "checkout.session.async_payment_succeeded":
        return { ...base, kind: "async_payment_succeeded", session: toInfo(event.data.object) };
      case "checkout.session.async_payment_failed":
        return { ...base, kind: "async_payment_failed", session: toInfo(event.data.object) };
      case "checkout.session.expired":
        return { ...base, kind: "checkout_expired", session: toInfo(event.data.object) };
      case "charge.refunded": {
        const charge = event.data.object;
        const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (!pi) return { ...base, kind: "ignored", type: event.type };
        return { ...base, kind: "charge_refunded", paymentIntentId: pi, amountRefundedCents: charge.amount_refunded, fullyRefunded: charge.refunded };
      }
      default:
        return { ...base, kind: "ignored", type: event.type };
    }
  }

  async account(): Promise<AccountInfo> {
    const acct = await this.stripe.accounts.retrieveCurrent();
    return {
      id: acct.id,
      displayName: acct.settings?.dashboard?.display_name || acct.business_profile?.name || acct.email || acct.id,
      email: acct.email ?? null,
      country: acct.country ?? null,
      chargesEnabled: acct.charges_enabled ?? false,
      livemode: this.livemode,
    };
  }
}
