import type { Formule, Periodicite } from "@baticlair/domain";

/** Le port de paiement Stripe (Checkout, portail, passage à Pro, résiliation) ; l'adapter HTTP est dans `infrastructure/stripe.ts`. */
export interface StripeClient {
  checkout(c: { companyId: string; customerId: string | null; email: string | null; formule: Formule; periodicite?: Periodicite; succes: string; annulation: string }): Promise<{ id: string; url: string }>;
  portail(customerId: string, retour: string): Promise<{ url: string }>;
  /** Le passage de Pro à Pro Max : le prix de l'abonnement change, Stripe facture tout de suite Pro Max moins ce qui reste du mois. */
  passerProMax(subscriptionId: string): Promise<void>;
  resilierEnFinDePeriode(subscriptionId: string): Promise<void>;
  /** La formule d'un identifiant de prix Stripe (webhooks) ; null pour un prix inconnu. */
  formuleDuPrix(priceId: string | null): Formule | null;
  /** La périodicité d'un identifiant de prix Stripe ; null pour un prix inconnu. */
  periodiciteDuPrix(priceId: string | null): Periodicite | null;
  /** Les deux prix annuels sont-ils configurés ? Sans eux, l'annuel n'est pas proposé au paiement (rien n'est créé chez Stripe). */
  annuelDisponible(): boolean;
  /** Code promo (Greg, 14 novembre 2026) : les identifiants des coupons actifs sur un abonnement. Facultatif (doubles de test). */
  couponsDe?(subscriptionId: string): Promise<string[]>;
  /** Pose un coupon sur un abonnement (la remise à vie qui suit les mois offerts). */
  appliquerCoupon?(subscriptionId: string, coupon: string): Promise<void>;
}

/**
 * LE CODE « FONDATEUR » (Greg, 14 novembre 2026 : « 6 mois offerts puis -30 % à vie »). Stripe ne sait pas enchaîner deux
 * remises dans un seul coupon : le code du Checkout pose le premier coupon (100 % pendant 6 mois) ; quand il s'éteint, le
 * serveur pose le second (30 %, pour toujours). Les deux coupons et le code n'existent qu'en mode test tant que Greg ne
 * les crée pas en production.
 */
export const PROMO_FONDATEUR = { code: "FONDATEUR", offert: "FONDATEUR_6MOIS", aVie: "FONDATEUR_VIE" } as const;
