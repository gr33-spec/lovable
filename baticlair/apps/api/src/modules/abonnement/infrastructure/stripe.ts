import { createHmac, timingSafeEqual } from "node:crypto";
import type { Formule } from "@baticlair/domain";
import type { StripeClient } from "../application/stripe.port.js";

/**
 * STRIPE, PRÊT MAIS ÉTEINT (Greg, 24 octobre 2026 : « Stripe branché à la fin sans rien refaire ») : les appels de
 * l'API REST (Checkout en abonnement, Essentiel ou Pro ; portail client ; passage à Pro au prorata ; résiliation en
 * fin de période) et la vérification de la signature
 * des webhooks, sans dépendance (aucune nouvelle bibliothèque sans l'accord du fondateur). Allumé par `PAIEMENT=stripe`
 * et les variables de `docs/groupe/STRIPE.md`.
 */

type Fetch = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Les paramètres de formulaire de Stripe (`a[b][0][c]=…`). */
function formulaire(params: Record<string, string | number | boolean | null | undefined>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

export class HttpStripeClient implements StripeClient {
  constructor(
    private readonly cfg: { secretKey: string; prix: { essentiel: string; pro: string }; taxRateId: string | null },
    private readonly fetcher: Fetch = fetch as unknown as Fetch,
  ) {}

  private async appel<T>(chemin: string, params: Record<string, string | number | boolean | null | undefined>, method: "POST" | "GET" = "POST"): Promise<T> {
    const corpsForm = formulaire(params);
    const res = await this.fetcher(`https://api.stripe.com/v1/${chemin}${method === "GET" && corpsForm ? `?${corpsForm}` : ""}`, {
      method,
      headers: { Authorization: `Bearer ${this.cfg.secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      ...(method === "GET" ? {} : { body: corpsForm }),
    });
    const corps = (await res.json()) as T & { error?: { message?: string } };
    if (!res.ok) throw new Error(`Stripe ${chemin} : ${res.status} ${corps.error?.message ?? ""}`.trim());
    return corps;
  }

  formuleDuPrix(priceId: string | null): Formule | null {
    if (!priceId) return null;
    return priceId === this.cfg.prix.pro ? "pro" : priceId === this.cfg.prix.essentiel ? "essentiel" : null;
  }

  async checkout(c: { companyId: string; customerId: string | null; email: string | null; formule: Formule; succes: string; annulation: string }) {
    const s = await this.appel<{ id: string; url: string }>("checkout/sessions", {
      mode: "subscription",
      "line_items[0][price]": this.cfg.prix[c.formule],
      "line_items[0][quantity]": 1,
      ...(this.cfg.taxRateId ? { "line_items[0][tax_rates][0]": this.cfg.taxRateId } : {}),
      client_reference_id: c.companyId,
      "metadata[companyId]": c.companyId,
      "subscription_data[metadata][companyId]": c.companyId,
      "metadata[formule]": c.formule,
      "subscription_data[metadata][formule]": c.formule,
      ...(c.customerId ? { customer: c.customerId, "customer_update[name]": "auto", "customer_update[address]": "auto" } : { customer_email: c.email }),
      // Le n° de TVA de l'artisan (facultatif) et son adresse, écrits sur la facture.
      "tax_id_collection[enabled]": true,
      billing_address_collection: "required",
      // Toujours en euros, le prix des CGU (recette en ligne du 25 octobre 2026 : la conversion automatique de Stripe
      // affichait des dollars à un navigateur situé hors de France).
      "adaptive_pricing[enabled]": false,
      locale: "fr",
      success_url: c.succes,
      cancel_url: c.annulation,
    });
    return { id: s.id, url: s.url };
  }

  async portail(customerId: string, retour: string) {
    const s = await this.appel<{ url: string }>("billing_portal/sessions", { customer: customerId, return_url: retour, locale: "fr" });
    return { url: s.url };
  }

  async passerPro(subscriptionId: string) {
    const abo = await this.appel<{ items?: { data?: { id: string }[] } }>(`subscriptions/${encodeURIComponent(subscriptionId)}`, {}, "GET");
    const item = abo.items?.data?.[0]?.id;
    if (!item) throw new Error("Stripe : abonnement sans ligne de prix");
    // D'Essentiel à Pro : Stripe recommence la période le jour même, déduit ce qui reste du mois et facture tout de suite.
    await this.appel(`subscriptions/${encodeURIComponent(subscriptionId)}`, {
      "items[0][id]": item,
      "items[0][price]": this.cfg.prix.pro,
      proration_behavior: "always_invoice",
      billing_cycle_anchor: "now",
      payment_behavior: "error_if_incomplete",
      "metadata[formule]": "pro",
    });
  }

  async resilierEnFinDePeriode(subscriptionId: string) {
    await this.appel(`subscriptions/${encodeURIComponent(subscriptionId)}`, { cancel_at_period_end: true });
  }
}

/** La signature d'un webhook Stripe (`Stripe-Signature: t=…,v1=…`) : HMAC-SHA256 de « t.corps », 5 minutes de tolérance. */
export function signatureStripeValide(secret: string, entete: string | undefined, corps: Buffer, maintenant = Date.now(), toleranceS = 300): boolean {
  if (!entete) return false;
  const morceaux = entete.split(",").map((p) => p.trim().split("="));
  const t = morceaux.find(([k]) => k === "t")?.[1];
  const signatures = morceaux.filter(([k]) => k === "v1").map(([, v]) => v ?? "");
  if (!t || signatures.length === 0 || !/^\d+$/.test(t)) return false;
  if (Math.abs(maintenant / 1000 - Number(t)) > toleranceS) return false;
  const attendu = createHmac("sha256", secret).update(`${t}.${corps.toString("utf8")}`).digest();
  return signatures.some((s) => {
    const donne = Buffer.from(s, "hex");
    return donne.length === attendu.length && timingSafeEqual(donne, attendu);
  });
}

/** Pour les tests : l'en-tête qu'enverrait Stripe pour ce corps. */
export function signerCommeStripe(secret: string, corps: string, t = Math.floor(Date.now() / 1000)): string {
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${corps}`).digest("hex")}`;
}
