import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe, STRIPE_PRICE_ID } from "@/lib/stripe";
import { getOrigin } from "@/lib/url";

/** Démarre le paiement de l'abonnement Pro via Stripe Checkout (§6, étape 6). */
export async function POST() {
  const session = await auth();
  const origin = await getOrigin();

  if (!session?.user?.id) {
    return NextResponse.redirect(`${origin}/connexion`, { status: 303 });
  }

  if (!stripe || !STRIPE_PRICE_ID) {
    return NextResponse.redirect(`${origin}/compte?abonnement=indisponible`, { status: 303 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    customer: user.stripeCustomerId ?? undefined,
    customer_email: user.stripeCustomerId ? undefined : user.email,
    client_reference_id: user.id,
    success_url: `${origin}/compte?abonnement=succes`,
    cancel_url: `${origin}/compte?abonnement=annule`,
  });

  if (!checkoutSession.url) {
    return NextResponse.redirect(`${origin}/compte?abonnement=erreur`, { status: 303 });
  }

  return NextResponse.redirect(checkoutSession.url, { status: 303 });
}
