import { z } from "zod";
import { cartProducts } from "@/lib/server/catalog";
import { getSettings } from "@/lib/server/cached";
import { errorResponse, json, readJson } from "@/lib/server/http";
import { query } from "@/lib/server/db";

// Informations ACTUELLES des produits du panier (prix, stock, photo) et
// modes de livraison. Le navigateur n'envoie que des identifiants.
const schema = z.object({ ids: z.array(z.string().uuid()).max(30) }).strict();

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await readJson(request, 4_000));
    if (!parsed.success) return json({ error: "Panier invalide." }, 400);
    const settings = await getSettings();
    const [products, shipping] = await Promise.all([
      cartProducts(parsed.data.ids, settings.lowStockThreshold),
      query<{ id: string; name: string; price_cents: number; free_over_cents: number | null }>(
        "SELECT id, name, price_cents, free_over_cents FROM shipping_method WHERE is_active ORDER BY position",
      ),
    ]);
    return json({
      products: products.map((p) => ({ id: p.id, slug: p.slug, name: p.name, priceCents: p.priceCents, stock: p.stock, image: p.image })),
      shipping: shipping.map((s) => ({ id: s.id, name: s.name, priceCents: s.price_cents, freeOverCents: s.free_over_cents })),
      ordersOpen: settings.ordersOpen,
      closedMessage: settings.closedMessage,
    });
  } catch (err) {
    return errorResponse(err, "cart");
  }
}
