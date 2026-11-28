import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { AccountInfo, CheckoutRequest, CheckoutSessionInfo, PaymentEvent, PaymentProvider } from "./types";

// Simulateur de paiement pour le développement et les tests automatiques :
// reproduit le comportement de Stripe Checkout (session, expiration,
// webhook signé, remboursement). Interdit en production (voir env.ts).

interface FakeSession {
  info: CheckoutSessionInfo;
  request: CheckoutRequest;
  refunds: number;
}

const store = globalThis as unknown as { fakePayments?: Map<string, FakeSession> };
function sessions() {
  store.fakePayments ??= new Map();
  return store.fakePayments;
}

export class FakeProvider implements PaymentProvider {
  readonly name = "fake" as const;
  readonly livemode = false;

  constructor(private secret: string) {}

  async createCheckout(req: CheckoutRequest) {
    const existing = [...sessions().values()].find((s) => s.info.orderId === req.orderId);
    if (existing) return { id: existing.info.id, url: `/dev/paiement/${existing.info.id}` };
    const id = `cs_fake_${randomUUID().replace(/-/g, "")}`;
    const subtotal = req.lines.reduce((s, l) => s + l.unitAmountCents * l.quantity, 0);
    sessions().set(id, {
      request: req,
      refunds: 0,
      info: {
        id,
        status: "open",
        paymentStatus: "unpaid",
        paymentIntentId: null,
        orderId: req.orderId,
        amountSubtotalCents: subtotal,
        amountShippingCents: req.shipping.amountCents,
        amountDiscountCents: 0,
        amountTotalCents: subtotal + req.shipping.amountCents,
        livemode: false,
      },
    });
    return { id, url: `/dev/paiement/${id}` };
  }

  private get(id: string): FakeSession {
    const s = sessions().get(id);
    if (!s) throw new Error(`Session inconnue : ${id}`);
    return s;
  }

  async retrieveCheckout(id: string) {
    return { ...this.get(id).info };
  }

  async expireCheckout(id: string) {
    const s = this.get(id);
    if (s.info.status === "open") s.info.status = "expired";
    return { ...s.info };
  }

  /** Simule le paiement réussi de la cliente (utilisé par la page /dev/paiement et les tests). */
  pay(id: string): CheckoutSessionInfo {
    const s = this.get(id);
    if (s.info.status !== "open") throw new Error("Session plus ouverte");
    s.info.status = "complete";
    s.info.paymentStatus = "paid";
    s.info.paymentIntentId = `pi_fake_${randomUUID().replace(/-/g, "")}`;
    return { ...s.info };
  }

  requestOf(id: string): CheckoutRequest {
    return this.get(id).request;
  }

  async refund(paymentIntentId: string, amountCents: number, idempotencyKey: string) {
    const s = [...sessions().values()].find((x) => x.info.paymentIntentId === paymentIntentId);
    if (!s) throw new Error("Paiement inconnu");
    s.refunds += amountCents;
    return { id: `re_fake_${idempotencyKey}` };
  }

  sign(body: string): string {
    return createHmac("sha256", this.secret).update(body).digest("hex");
  }

  async parseWebhook(rawBody: string, signature: string | null): Promise<PaymentEvent> {
    const expected = Buffer.from(this.sign(rawBody));
    const given = Buffer.from(signature ?? "");
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new Error("Signature invalide");
    return JSON.parse(rawBody) as PaymentEvent;
  }

  async account(): Promise<AccountInfo> {
    return { id: "acct_simulateur", displayName: "Simulateur (développement)", email: null, country: "FR", chargesEnabled: true, livemode: false };
  }
}
