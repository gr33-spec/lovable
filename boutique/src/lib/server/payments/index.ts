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
