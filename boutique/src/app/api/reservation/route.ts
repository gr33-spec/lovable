import { after } from "next/server";
import { invalidateCatalog } from "@/lib/server/cached";
import { processOutbox } from "@/lib/server/email/outbox";
import { errorResponse, json, readJson, sameOrigin } from "@/lib/server/http";
import { clientIp, hit } from "@/lib/server/rate-limit";
import { createReservation } from "@/lib/server/reservations";
import { RESERVATION_MODE } from "@/lib/sales-mode";
import { fieldErrors, reservationSchema } from "@/lib/validation";

// Réservation d'un bijou (sans paiement) : prénom, téléphone, e-mail facultatif.
export async function POST(request: Request) {
  try {
    if (!RESERVATION_MODE) return json({ ok: false, code: "closed", message: "Les réservations ne sont pas ouvertes." }, 404);
    if (!sameOrigin(request)) return json({ error: "Origine refusée." }, 403);
    const ip = await clientIp();
    const limit = await hit(`reservation:${ip}`, 8, 60 * 60);
    if (!limit.allowed) return json({ ok: false, code: "rate", message: "Trop de demandes. Merci de patienter un peu ou de nous contacter directement." }, 429, { "Retry-After": String(limit.retryAfter) });
    const parsed = reservationSchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ ok: false, code: "invalid", message: "Certains champs sont à vérifier.", fieldErrors: fieldErrors(parsed.error) }, 400);
    const result = await createReservation(parsed.data);
    // Le bijou change d'état (réservé ou libéré) : la boutique affichée est mise à jour.
    invalidateCatalog();
    if (result.ok) after(() => processOutbox(5).catch(() => undefined));
    return json(result, result.ok ? 200 : result.code === "unavailable" ? 409 : 422);
  } catch (err) {
    return errorResponse(err, "reservation");
  }
}
