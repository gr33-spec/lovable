import { after } from "next/server";
import { invalidateCatalog } from "@/lib/server/cached";
import { processOutbox } from "@/lib/server/email/outbox";
import { json } from "@/lib/server/http";
import { errorMessage, reportEvent } from "@/lib/server/monitoring";
import { handlePaymentEvent } from "@/lib/server/orders";
import { payments } from "@/lib/server/payments";

// Webhook Stripe : signature vérifiée avec le secret du webhook, traitement
// idempotent (un événement reçu plusieurs fois n'a d'effet qu'une fois).
// En cas d'erreur, on répond 500 : Stripe renverra l'événement plus tard.
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 1_000_000) return json({ error: "Trop volumineux" }, 413);
  let provider;
  try {
    provider = payments();
  } catch (err) {
    await reportEvent("error", "webhook", "Webhook reçu mais paiement non configuré", { error: errorMessage(err) });
    return json({ error: "Indisponible" }, 503);
  }
  let event;
  try {
    if (!(process.env.PAYMENT_PROVIDER === "fake" || process.env.STRIPE_WEBHOOK_SECRET)) return json({ error: "Webhook non configuré" }, 503);
    event = await provider.parseWebhook(raw, request.headers.get("stripe-signature"));
  } catch (err) {
    await reportEvent("warning", "webhook", "Webhook refusé : signature invalide", { error: errorMessage(err) });
    return json({ error: "Signature invalide" }, 400);
  }
  if (event.livemode !== provider.livemode) {
    await reportEvent("warning", "webhook", "Webhook ignoré : mode test/production différent", { eventId: event.id });
    return json({ received: true, ignored: true });
  }
  try {
    const outcome = await handlePaymentEvent(event);
    if (outcome === "processed") {
      invalidateCatalog();
      // Les e-mails partent après la réponse (Stripe n'attend pas l'envoi).
      after(() => processOutbox(10).catch(() => undefined));
    }
    return json({ received: true, outcome });
  } catch (err) {
    await reportEvent("error", "webhook", "Échec du traitement d'un webhook (Stripe réessaiera)", { eventId: event.id, error: errorMessage(err) });
    return json({ error: "Erreur de traitement" }, 500);
  }
}
