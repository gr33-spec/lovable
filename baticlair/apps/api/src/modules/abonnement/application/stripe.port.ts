import type { Formule } from "@baticlair/domain";

/** Le port de paiement Stripe (Checkout, portail, passage à Pro, résiliation) ; l'adapter HTTP est dans `infrastructure/stripe.ts`. */
export interface StripeClient {
  checkout(c: { companyId: string; customerId: string | null; email: string | null; formule: Formule; succes: string; annulation: string }): Promise<{ id: string; url: string }>;
  portail(customerId: string, retour: string): Promise<{ url: string }>;
  /** Le passage d'Essentiel à Pro : le prix de l'abonnement change, Stripe facture tout de suite Pro moins ce qui reste du mois. */
  passerPro(subscriptionId: string): Promise<void>;
  resilierEnFinDePeriode(subscriptionId: string): Promise<void>;
  /** La formule d'un identifiant de prix Stripe (webhooks) ; null pour un prix inconnu. */
  formuleDuPrix(priceId: string | null): Formule | null;
}
