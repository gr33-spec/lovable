import "server-only";

// Lecture centralisée et vérifiée de la configuration. Toute incohérence
// dangereuse (clé de test en production, simulateur de paiement en ligne…)
// arrête le paiement plutôt que de laisser passer une erreur silencieuse.

export type DeployEnv = "production" | "preview" | "development" | "test";

export function deployEnv(): DeployEnv {
  if (process.env.NODE_ENV === "test" || process.env.BOUTIQUE_TEST === "1") return "test";
  const vercel = process.env.VERCEL_ENV;
  if (vercel === "production") return "production";
  if (vercel === "preview") return "preview";
  return process.env.NODE_ENV === "production" && process.env.BOUTIQUE_LOCAL_PROD !== "1" ? "production" : "development";
}

export function isProduction(): boolean {
  return deployEnv() === "production";
}

export function siteUrl(): string {
  const raw = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return raw.replace(/\/+$/, "");
}

export function appSecret(): string {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("APP_SECRET manquant ou trop court (32 caractères minimum).");
  }
  if (isProduction() && secret.startsWith("dev-")) {
    throw new Error("APP_SECRET de développement utilisé en production.");
  }
  return secret;
}

export type PaymentConfig =
  | { ok: true; provider: "fake"; mode: "test" }
  | { ok: true; provider: "stripe"; mode: "test" | "live"; secretKey: string; webhookSecret: string; accountId?: string }
  | { ok: false; reason: string };

/** Configuration du paiement, vérifiée. `ok: false` = le paiement est bloqué (et signalé). */
export function paymentConfig(): PaymentConfig {
  const provider = process.env.PAYMENT_PROVIDER ?? "stripe";
  const env = deployEnv();
  if (provider === "fake") {
    if (env === "production") return { ok: false, reason: "Le simulateur de paiement est interdit en production." };
    return { ok: true, provider: "fake", mode: "test" };
  }
  if (provider !== "stripe") return { ok: false, reason: `Fournisseur de paiement inconnu : ${provider}` };
  const mode = process.env.STRIPE_MODE;
  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (mode !== "test" && mode !== "live") return { ok: false, reason: "STRIPE_MODE doit valoir « test » ou « live »." };
  if (!secretKey) return { ok: false, reason: "STRIPE_SECRET_KEY manquante." };
  if (!webhookSecret.startsWith("whsec_")) return { ok: false, reason: "STRIPE_WEBHOOK_SECRET manquant ou invalide." };
  const keyMode = /^(sk|rk)_live_/.test(secretKey) ? "live" : /^(sk|rk)_test_/.test(secretKey) ? "test" : null;
  if (!keyMode) return { ok: false, reason: "STRIPE_SECRET_KEY n'est pas une clé secrète Stripe." };
  if (keyMode !== mode) {
    return { ok: false, reason: `STRIPE_MODE=${mode} mais la clé Stripe est une clé ${keyMode === "live" ? "de production" : "de test"}.` };
  }
  // Une préproduction ne doit jamais encaisser de vrais paiements.
  if (mode === "live" && env !== "production") return { ok: false, reason: "Clés Stripe de production refusées hors production." };
  const accountId = process.env.STRIPE_ACCOUNT_ID || undefined;
  if (mode === "live" && !accountId) return { ok: false, reason: "STRIPE_ACCOUNT_ID requis en production (compte Stripe officiel)." };
  return { ok: true, provider: "stripe", mode, secretKey, webhookSecret, accountId };
}

/** Vrai quand le site de production encaisse en mode test : affiché clairement à tous. */
export function isTestModeInProduction(): boolean {
  const cfg = paymentConfig();
  return isProduction() && cfg.ok && cfg.mode === "test";
}

export function cronSecret(): string | undefined {
  return process.env.CRON_SECRET || undefined;
}
