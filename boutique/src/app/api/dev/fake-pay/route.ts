import { randomUUID } from "node:crypto";
import { z } from "zod";
import { invalidateCatalog } from "@/lib/server/cached";
import { processOutbox } from "@/lib/server/email/outbox";
import { paymentConfig } from "@/lib/server/env";
import { json, readJson, sameOrigin } from "@/lib/server/http";
import { handlePaymentEvent } from "@/lib/server/orders";
import { payments } from "@/lib/server/payments";
import type { FakeProvider } from "@/lib/server/payments/fake";

// Simulateur de paiement (développement uniquement) : reproduit ce que
// fait Stripe (paiement puis webhook signé, éventuellement envoyé deux fois).
export async function POST(request: Request) {
  const cfg = paymentConfig();
  if (!cfg.ok || cfg.provider !== "fake") return json({ error: "Indisponible" }, 404);
  if (!sameOrigin(request)) return json({ error: "Origine refusée." }, 403);
  const body = z.object({ sessionId: z.string().max(100), action: z.enum(["pay", "cancel", "expire"]), duplicate: z.boolean().optional() }).parse(await readJson(request));
  const provider = payments() as FakeProvider;
  if (body.action === "cancel") return json({ ok: true });
  const session = body.action === "pay" ? provider.pay(body.sessionId) : await provider.expireCheckout(body.sessionId);
  const event = { id: `evt_fake_${randomUUID()}`, kind: body.action === "pay" ? ("checkout_completed" as const) : ("checkout_expired" as const), livemode: false, session };
  // Passage par la vérification de signature, comme un vrai webhook.
  const raw = JSON.stringify(event);
  const parsed = await provider.parseWebhook(raw, provider.sign(raw));
  await handlePaymentEvent(parsed);
  if (body.duplicate) await handlePaymentEvent(parsed);
  await processOutbox(10);
  invalidateCatalog();
  return json({ ok: true });
}
