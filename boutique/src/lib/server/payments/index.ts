import "server-only";
import { appSecret, paymentConfig } from "../env";
import { FakeProvider } from "./fake";
import { StripeProvider } from "./stripe";
import { PaymentUnavailableError, type PaymentProvider } from "./types";

const cache = globalThis as unknown as { paymentProvider?: PaymentProvider; paymentProviderKey?: string };

/** Fournisseur de paiement configuré. Lève PaymentUnavailableError si la configuration est dangereuse ou incomplète. */
export function payments(): PaymentProvider {
  const cfg = paymentConfig();
  if (!cfg.ok) throw new PaymentUnavailableError(cfg.reason);
  const key = cfg.provider === "stripe" ? `stripe|${cfg.mode}|${cfg.secretKey.slice(-6)}` : "fake";
  if (cache.paymentProvider && cache.paymentProviderKey === key) return cache.paymentProvider;
  cache.paymentProvider =
    cfg.provider === "stripe" ? new StripeProvider(cfg.secretKey, cfg.webhookSecret, cfg.mode) : new FakeProvider(`${appSecret()}|fake-webhook`);
  cache.paymentProviderKey = key;
  return cache.paymentProvider;
}

/** Réservé aux tests et au simulateur : remplace le fournisseur. */
export function setPaymentProviderForTests(provider: PaymentProvider | undefined) {
  cache.paymentProvider = provider;
  cache.paymentProviderKey = provider ? paymentConfigKey() : undefined;
}

function paymentConfigKey(): string {
  const cfg = paymentConfig();
  return cfg.ok && cfg.provider === "stripe" ? `stripe|${cfg.mode}|${cfg.secretKey.slice(-6)}` : "fake";
}

export { PaymentUnavailableError } from "./types";
export type { PaymentProvider, PaymentEvent, CheckoutSessionInfo } from "./types";

const accountCheck = globalThis as unknown as { stripeAccountVerified?: { key: string; promise: Promise<boolean> } };

/**
 * Vérifie (une fois par instance) que la clé Stripe appartient bien au compte
 * officiel déclaré dans STRIPE_ACCOUNT_ID. Sinon, le paiement est bloqué.
 */
export async function verifyExpectedAccount(): Promise<boolean> {
  const cfg = paymentConfig();
  if (!cfg.ok || cfg.provider !== "stripe" || !cfg.accountId) return true;
  const key = `${cfg.accountId}|${cfg.secretKey.slice(-6)}`;
  if (accountCheck.stripeAccountVerified?.key !== key) {
    const promise = payments()
      .account()
      .then((a) => a.id === cfg.accountId);
    promise.catch(() => (accountCheck.stripeAccountVerified = undefined));
    accountCheck.stripeAccountVerified = { key, promise };
  }
  return accountCheck.stripeAccountVerified!.promise;
}
