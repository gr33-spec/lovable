import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

/**
 * Webhook Stripe : synchronise le plan de l'artisan avec son abonnement
 * (§6, étape 6). À configurer sur l'URL /api/stripe/webhook avec les
 * événements checkout.session.completed, customer.subscription.updated et
 * customer.subscription.deleted.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Webhook Stripe non configuré." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Signature Stripe invalide :", error);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (userId && customerId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: "pro",
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId ?? null,
          },
        });
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      const isActive = subscription.status === "active" || subscription.status === "trialing";

      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          plan: isActive ? "pro" : "free",
          stripeSubscriptionId: isActive ? subscription.id : null,
        },
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
