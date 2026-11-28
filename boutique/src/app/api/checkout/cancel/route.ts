import { z } from "zod";
import { invalidateCatalog } from "@/lib/server/cached";
import { errorResponse, json, readJson, sameOrigin } from "@/lib/server/http";
import { cancelPendingByToken } from "@/lib/server/orders";
import { clientIp, hit } from "@/lib/server/rate-limit";

// La cliente revient de la page de paiement sans payer : sa réservation est
// libérée tout de suite (le stock redevient disponible pour les autres).
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return json({ error: "Origine refusée." }, 403);
    const limit = await hit(`cancel:${await clientIp()}`, 30, 10 * 60);
    if (!limit.allowed) return json({ error: "Trop de requêtes." }, 429);
    const parsed = z.object({ token: z.string().min(20).max(100) }).strict().safeParse(await readJson(request, 1_000));
    if (!parsed.success) return json({ released: false });
    const released = await cancelPendingByToken(parsed.data.token);
    if (released) invalidateCatalog();
    return json({ released });
  } catch (err) {
    return errorResponse(err, "checkout-cancel");
  }
}
