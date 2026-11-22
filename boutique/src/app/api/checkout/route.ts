import { checkoutSchema, fieldErrors } from "@/lib/validation";
import { invalidateCatalog } from "@/lib/server/cached";
import { errorResponse, json, readJson, sameOrigin } from "@/lib/server/http";
import { startCheckout } from "@/lib/server/orders";
import { clientIp, hit } from "@/lib/server/rate-limit";
import { RESERVATION_MODE } from "@/lib/sales-mode";

// Création de la commande et de la session de paiement.
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return json({ error: "Origine refusée." }, 403);
    // Paiement en ligne désactivé : les bijoux se réservent (voir /api/reservation).
    if (RESERVATION_MODE) return json({ ok: false, code: "closed", message: "Le paiement en ligne n'est pas proposé : réservez le bijou depuis sa page." }, 422);
    const ip = await clientIp();
    const limit = await hit(`checkout:${ip}`, 15, 10 * 60);
    if (!limit.allowed) return json({ error: "Trop de tentatives. Merci de patienter quelques minutes." }, 429, { "Retry-After": String(limit.retryAfter) });
    const parsed = checkoutSchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ ok: false, code: "invalid", message: "Certains champs sont à vérifier.", fieldErrors: fieldErrors(parsed.error) }, 400);
    const result = await startCheckout(parsed.data);
    if (result.ok) invalidateCatalog();
    return json(result, result.ok ? 200 : result.code === "in_progress" ? 409 : 422);
  } catch (err) {
    return errorResponse(err, "checkout");
  }
}
