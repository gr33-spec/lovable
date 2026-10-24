import type { Formule } from "@baticlair/domain";

/** Le port de paiement Stripe (Checkout, portail, passage à l'annuel, résiliation) ; l'adapter HTTP est dans `infrastructure/stripe.ts`. */
export interface StripeClient {
  checkout(c: { companyId: string; customerId: string | null; email: string | null; formule: Formule; succes: string; annulation: string }): Promise<{ id: string; url: string }>;
  portail(customerId: string, retour: string): Promise<{ url: string }>;
  /** Le passage du mensuel à l'annuel : le prix de l'abonnement change, Stripe facture tout de suite l'année moins ce qui reste du mois. */
  basculerAnnuel(subscriptionId: string): Promise<void>;
  resilierEnFinDePeriode(subscriptionId: string): Promise<void>;
  /** La formule d'un identifiant de prix Stripe (webhooks) ; null pour un prix inconnu. */
  formuleDuPrix(priceId: string | null): Formule | null;
}
