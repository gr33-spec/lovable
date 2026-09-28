import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getOrigin } from "@/lib/url";

/** Ouvre le portail de facturation Stripe pour gérer/annuler l'abonnement (§6, étape 6). */
export async function POST() {
  const session = await auth();
  const origin = await getOrigin();

  if (!session?.user?.id) {
    return NextResponse.redirect(`${origin}/connexion`, { status: 303 });
  }

  if (!stripe) {
    return NextResponse.redirect(`${origin}/compte?abonnement=indisponible`, { status: 303 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.stripeCustomerId) {
    return NextResponse.redirect(`${origin}/compte?abonnement=erreur`, { status: 303 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/compte`,
  });

  return NextResponse.redirect(portalSession.url, { status: 303 });
}
