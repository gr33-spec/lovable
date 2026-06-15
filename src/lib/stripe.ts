import "server-only";
import Stripe from "stripe";

/** Identifiant du prix Stripe (abonnement Pro mensuel). */
export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;

/**
 * Client Stripe (étape 6). `null` si la clé n'est pas configurée (dev sans
 * infra de paiement) : les routes /api/stripe renvoient alors une erreur claire.
 */
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
