/** Le port de paiement Stripe (Checkout, portail, résiliation) ; l'adapter HTTP est dans `infrastructure/stripe.ts`. */
export interface StripeClient {
  checkout(c: { companyId: string; customerId: string | null; email: string | null; succes: string; annulation: string }): Promise<{ id: string; url: string }>;
  portail(customerId: string, retour: string): Promise<{ url: string }>;
  resilierEnFinDePeriode(subscriptionId: string): Promise<void>;
}
