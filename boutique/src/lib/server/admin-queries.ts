import "server-only";
import type { ImageRef } from "../image-ref";
import type { OrderStatus } from "../order-status";
import { query, queryOne } from "./db";
import { toImageRef, type ImageRow } from "./images";

// Lectures réservées à l'administration (toujours appelées après requireAdmin).

export async function dashboard(lowThreshold: number) {
  const [counts, toPrepare, soldOut, lowStock, incidents, emailsFailed, lastWebhook, today] = await Promise.all([
    queryOne<{ paid: string; preparing: string; new24: string }>(
      `SELECT count(*) FILTER (WHERE status = 'paid') AS paid, count(*) FILTER (WHERE status = 'preparing') AS preparing,
              count(*) FILTER (WHERE status NOT IN ('pending', 'expired') AND paid_at > now() - interval '24 hours') AS new24
       FROM customer_order`,
    ),
    query<{ id: string; number: string; first_name: string; last_name: string; total_cents: number; status: OrderStatus; paid_at: Date; item_count: string; needs_attention: string | null }>(
      `SELECT o.id, o.number, o.first_name, o.last_name, o.total_cents, o.status, o.paid_at, o.needs_attention,
              (SELECT sum(quantity) FROM order_item i WHERE i.order_id = o.id) AS item_count
       FROM customer_order o WHERE o.status IN ('paid', 'preparing') ORDER BY o.paid_at LIMIT 20`,
    ),
    query<{ id: string; name: string }>("SELECT id, name FROM product WHERE status = 'published' AND stock = 0 ORDER BY updated_at DESC LIMIT 12"),
    lowThreshold > 0
      ? query<{ id: string; name: string; stock: number }>(
          "SELECT id, name, stock FROM product WHERE status = 'published' AND stock > 0 AND stock <= $1 ORDER BY stock, name LIMIT 12",
          [lowThreshold],
        )
      : Promise.resolve([]),
    query<{ id: string; level: string; source: string; message: string; created_at: Date }>(
      "SELECT id, level, source, message, created_at FROM system_event WHERE resolved_at IS NULL AND level <> 'info' AND created_at > now() - interval '14 days' ORDER BY created_at DESC LIMIT 8",
    ),
    queryOne<{ n: string }>("SELECT count(*) AS n FROM email_outbox WHERE status = 'failed'"),
    queryOne<{ received_at: Date }>("SELECT received_at FROM payment_event ORDER BY received_at DESC LIMIT 1"),
    queryOne<{ n: string; total: string | null }>(
      "SELECT count(*) AS n, sum(total_cents - refunded_cents) AS total FROM customer_order WHERE paid_at > date_trunc('month', now()) AND status NOT IN ('pending','expired')",
    ),
  ]);
  return {
    toPrepareCount: Number(counts?.paid ?? 0) + Number(counts?.preparing ?? 0),
    newCount: Number(counts?.paid ?? 0),
    last24: Number(counts?.new24 ?? 0),
    toPrepare,
    soldOut,
    lowStock,
    incidents,
    emailsFailed: Number(emailsFailed?.n ?? 0),
    lastWebhookAt: lastWebhook?.received_at ?? null,
    month: { orders: Number(today?.n ?? 0), revenueCents: Number(today?.total ?? 0) },
  };
}

export interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  status: "draft" | "published" | "archived";
  price_cents: number;
  stock: number;
  reserved: number;
  category_name: string;
  image: ImageRef | null;
  updated_at: Date;
}

export async function adminProducts(filter: { q?: string; status?: string; categoryId?: string; stock?: string }): Promise<AdminProductRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.status && ["draft", "published", "archived"].includes(filter.status)) {
    params.push(filter.status);
    where.push(`p.status = $${params.length}`);
  } else where.push("p.status <> 'archived'");
  if (filter.categoryId && /^[0-9a-f-]{36}$/.test(filter.categoryId)) {
    params.push(filter.categoryId);
    where.push(`p.category_id = $${params.length}`);
  }
  if (filter.stock === "epuise") where.push("p.stock = 0");
  if (filter.q) {
    params.push(`%${filter.q.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`).slice(0, 60)}%`);
    where.push(`(lower(p.name) LIKE $${params.length} OR lower(coalesce(p.sku, '')) LIKE $${params.length})`);
  }
  const rows = await query<Omit<AdminProductRow, "image" | "reserved"> & { reserved: string; img_id: string | null }>(
    `SELECT p.id, p.name, p.slug, p.sku, p.status, p.price_cents, p.stock, p.updated_at, c.name AS category_name,
            coalesce((SELECT sum(i.quantity) FROM order_item i JOIN customer_order o ON o.id = i.order_id WHERE i.product_id = p.id AND o.status = 'pending'), 0) AS reserved,
            (SELECT im.id FROM image im WHERE im.product_id = p.id AND im.kind = 'product' ORDER BY im.position LIMIT 1) AS img_id
     FROM product p JOIN category c ON c.id = p.category_id
     WHERE ${where.join(" AND ")}
     ORDER BY p.position, p.published_at DESC NULLS FIRST, p.created_at DESC LIMIT 500`,
    params,
  );
  const ids = rows.map((r) => r.img_id).filter(Boolean) as string[];
  const images = ids.length ? await query<ImageRow>("SELECT id, width, height, widths, placeholder, alt, base_url FROM image WHERE id = ANY($1::uuid[])", [ids]) : [];
  return rows.map((r) => {
    const img = images.find((i) => i.id === r.img_id);
    return { ...r, reserved: Number(r.reserved), image: img ? toImageRef(img) : null };
  });
}

export async function adminProduct(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const p = await queryOne<Record<string, unknown>>("SELECT * FROM product WHERE id = $1", [id]);
  if (!p) return null;
  const images = await query<ImageRow>("SELECT id, width, height, widths, placeholder, alt, base_url FROM image WHERE product_id = $1 AND kind = 'product' ORDER BY position, created_at", [id]);
  const orders = await queryOne<{ n: string }>("SELECT count(DISTINCT order_id) AS n FROM order_item WHERE product_id = $1", [id]);
  return {
    id: p.id as string,
    version: p.version as number,
    name: p.name as string,
    slug: p.slug as string,
    sku: (p.sku as string) ?? "",
    description: p.description as string,
    categoryId: p.category_id as string,
    collectionId: (p.collection_id as string) ?? null,
    priceCents: p.price_cents as number,
    compareAtCents: (p.compare_at_cents as number) ?? null,
    stock: p.stock as number,
    status: p.status as "draft" | "published" | "archived",
    colors: p.colors as string[],
    tags: p.tags as string[],
    features: p.features as { label: string; value: string }[],
    seoTitle: (p.seo_title as string) ?? "",
    seoDescription: (p.seo_description as string) ?? "",
    images: images.map(toImageRef),
    orderCount: Number(orders?.n ?? 0),
  };
}

export async function groups() {
  const [categories, collections] = await Promise.all([
    query<{ id: string; name: string; slug: string; description: string; is_visible: boolean; product_count: string }>(
      "SELECT c.*, (SELECT count(*) FROM product p WHERE p.category_id = c.id AND p.status <> 'archived') AS product_count FROM category c ORDER BY position, name",
    ),
    query<{ id: string; name: string; slug: string; description: string; is_visible: boolean; product_count: string }>(
      "SELECT c.*, (SELECT count(*) FROM product p WHERE p.collection_id = c.id AND p.status <> 'archived') AS product_count FROM collection c ORDER BY position, name",
    ),
  ]);
  return { categories, collections };
}

export interface AdminOrderRow {
  id: string;
  number: string;
  status: OrderStatus;
  first_name: string;
  last_name: string;
  total_cents: number;
  paid_at: Date | null;
  created_at: Date;
  item_count: string;
  needs_attention: string | null;
}

export async function adminOrders(filter: { status?: string; q?: string }): Promise<AdminOrderRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.status === "a-preparer") where.push("o.status IN ('paid', 'preparing')");
  else if (filter.status === "non-abouties") where.push("o.status IN ('pending', 'expired')");
  else if (filter.status && ["paid", "preparing", "shipped", "completed", "cancelled", "refunded"].includes(filter.status)) {
    params.push(filter.status);
    where.push(`o.status = $${params.length}`);
  } else where.push("o.status NOT IN ('pending', 'expired')");
  if (filter.q) {
    params.push(`%${filter.q.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`).slice(0, 60)}%`);
    where.push(`(lower(o.number) LIKE $${params.length} OR lower(o.last_name || ' ' || o.first_name) LIKE $${params.length} OR lower(o.first_name || ' ' || o.last_name) LIKE $${params.length} OR lower(o.email) LIKE $${params.length})`);
  }
  return query<AdminOrderRow>(
    `SELECT o.id, o.number, o.status, o.first_name, o.last_name, o.total_cents, o.paid_at, o.created_at, o.needs_attention,
            (SELECT coalesce(sum(quantity), 0) FROM order_item i WHERE i.order_id = o.id) AS item_count
     FROM customer_order o WHERE ${where.join(" AND ")}
     ORDER BY coalesce(o.paid_at, o.created_at) DESC LIMIT 300`,
    params,
  );
}

export async function adminOrder(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const o = await queryOne<Record<string, unknown>>("SELECT * FROM customer_order WHERE id = $1", [id]);
  if (!o) return null;
  const items = await query<{ product_id: string | null; product_name: string; product_sku: string | null; quantity: number; unit_price_cents: number; line_total_cents: number; image_id: string | null }>(
    "SELECT product_id, product_name, product_sku, quantity, unit_price_cents, line_total_cents, image_id FROM order_item WHERE order_id = $1 ORDER BY product_name",
    [id],
  );
  const imgIds = items.map((i) => i.image_id).filter(Boolean) as string[];
  const images = imgIds.length ? await query<ImageRow>("SELECT id, width, height, widths, placeholder, alt, base_url FROM image WHERE id = ANY($1::uuid[])", [imgIds]) : [];
  const emails = await query<{ kind: string; status: string; sent_at: Date | null; last_error: string | null }>(
    "SELECT kind, status, sent_at, last_error FROM email_outbox WHERE order_id = $1 ORDER BY created_at",
    [id],
  );
  const history = await query<{ action: string; details: Record<string, unknown>; created_at: Date }>(
    "SELECT action, details, created_at FROM audit_log WHERE entity_type = 'order' AND entity_id = $1 ORDER BY created_at",
    [id],
  );
  return {
    order: o,
    items: items.map((i) => {
      const img = images.find((x) => x.id === i.image_id);
      return { ...i, image: img ? toImageRef(img) : null };
    }),
    emails,
    history,
  };
}

export async function shippingMethods() {
  return query<{
    id: string;
    name: string;
    description: string;
    price_cents: number;
    free_over_cents: number | null;
    countries: string[];
    requires_address: boolean;
    delivery_estimate: string;
    is_active: boolean;
  }>("SELECT * FROM shipping_method ORDER BY position, name");
}

export async function auditTrail(limit = 100) {
  return query<{ action: string; entity_type: string; entity_id: string; details: Record<string, unknown>; created_at: Date; email: string | null }>(
    "SELECT l.action, l.entity_type, l.entity_id, l.details, l.created_at, a.email FROM audit_log l LEFT JOIN admin_user a ON a.id = l.admin_id ORDER BY l.created_at DESC LIMIT $1",
    [limit],
  );
}

// ───────────── Statistiques de ventes (tableau de bord) ─────────────
//
// Une commande « vendue » = payée et ni annulée ni remboursée en totalité.
// Le chiffre d'affaires est net des remboursements. Jours et mois comptés à
// l'heure de Paris.

export type StatsPeriod = "7j" | "30j" | "12m";

const ACTIVE = "o.status IN ('paid', 'preparing', 'shipped', 'completed')";
const LOCAL = "(o.paid_at AT TIME ZONE 'Europe/Paris')";

export interface SalesStats {
  period: StatsPeriod;
  current: { revenueCents: number; orders: number; items: number; averageCents: number; customers: number };
  previous: { revenueCents: number; orders: number; items: number; averageCents: number; customers: number };
  series: { label: string; key: string; revenueCents: number; orders: number }[];
  topProducts: { name: string; productId: string | null; image: ImageRef | null; quantity: number; revenueCents: number }[];
  categories: { name: string; revenueCents: number; quantity: number }[];
  shipping: { name: string; orders: number }[];
  returning: { newCustomers: number; returningCustomers: number };
}

export async function salesStats(period: StatsPeriod): Promise<SalesStats> {
  const months = period === "12m";
  const span = period === "7j" ? 7 : period === "30j" ? 30 : 12;
  const unit = months ? "month" : "day";
  // Début de la période (inclus) et de la période précédente, à l'heure de Paris.
  const start = `date_trunc('${unit}', now() AT TIME ZONE 'Europe/Paris') - interval '${span - 1} ${unit}'`;
  const prevStart = `${start} - interval '${span} ${unit}'`;

  const totals = (from: string, to: string | null) =>
    queryOne<{ revenue: string | null; orders: string; items: string | null; customers: string }>(
      `SELECT sum(o.total_cents - o.refunded_cents) FILTER (WHERE ${ACTIVE}) AS revenue,
              count(*) FILTER (WHERE ${ACTIVE}) AS orders,
              (SELECT sum(i.quantity) FROM order_item i JOIN customer_order o2 ON o2.id = i.order_id
                WHERE o2.status IN ('paid', 'preparing', 'shipped', 'completed')
                  AND (o2.paid_at AT TIME ZONE 'Europe/Paris') >= ${from} ${to ? `AND (o2.paid_at AT TIME ZONE 'Europe/Paris') < ${to}` : ""}) AS items,
              count(DISTINCT lower(o.email)) FILTER (WHERE ${ACTIVE}) AS customers
       FROM customer_order o
       WHERE o.paid_at IS NOT NULL AND ${LOCAL} >= ${from} ${to ? `AND ${LOCAL} < ${to}` : ""}`,
    );

  const [cur, prev, series, top, cats, ship, ret] = await Promise.all([
    totals(start, null),
    totals(prevStart, start),
    query<{ bucket: Date; revenue: string | null; orders: string }>(
      `SELECT b.bucket, sum(o.total_cents - o.refunded_cents) AS revenue, count(o.id) AS orders
       FROM generate_series(${start}, date_trunc('${unit}', now() AT TIME ZONE 'Europe/Paris'), interval '1 ${unit}') AS b(bucket)
       LEFT JOIN customer_order o ON ${ACTIVE} AND date_trunc('${unit}', ${LOCAL}) = b.bucket
       GROUP BY b.bucket ORDER BY b.bucket`,
    ),
    query<{ name: string; product_id: string | null; image_id: string | null; quantity: string; revenue: string }>(
      `SELECT min(i.product_name) AS name, i.product_id, coalesce((array_agg(i.image_id ORDER BY o.paid_at DESC) FILTER (WHERE i.image_id IS NOT NULL))[1],
                (SELECT im.id FROM image im WHERE im.product_id = i.product_id ORDER BY im.position LIMIT 1)) AS image_id,
              sum(i.quantity) AS quantity, sum(i.line_total_cents) AS revenue
       FROM order_item i JOIN customer_order o ON o.id = i.order_id
       WHERE ${ACTIVE} AND ${LOCAL} >= ${start}
       GROUP BY i.product_id ORDER BY sum(i.line_total_cents) DESC, sum(i.quantity) DESC LIMIT 5`,
    ),
    query<{ name: string | null; revenue: string; quantity: string }>(
      `SELECT c.name, sum(i.line_total_cents) AS revenue, sum(i.quantity) AS quantity
       FROM order_item i JOIN customer_order o ON o.id = i.order_id
       LEFT JOIN product p ON p.id = i.product_id LEFT JOIN category c ON c.id = p.category_id
       WHERE ${ACTIVE} AND ${LOCAL} >= ${start}
       GROUP BY c.name ORDER BY sum(i.line_total_cents) DESC`,
    ),
    query<{ name: string; orders: string }>(
      `SELECT o.shipping_method_name AS name, count(*) AS orders FROM customer_order o
       WHERE ${ACTIVE} AND ${LOCAL} >= ${start} GROUP BY o.shipping_method_name ORDER BY count(*) DESC`,
    ),
    // Fidèles : clientes de la période qui avaient déjà commandé avant.
    queryOne<{ new_customers: string; returning_customers: string }>(
      `WITH buyers AS (
         SELECT DISTINCT lower(o.email) AS email FROM customer_order o WHERE ${ACTIVE} AND ${LOCAL} >= ${start}
       )
       SELECT count(*) FILTER (WHERE NOT EXISTS (
                SELECT 1 FROM customer_order p WHERE lower(p.email) = b.email AND p.status IN ('paid', 'preparing', 'shipped', 'completed')
                  AND (p.paid_at AT TIME ZONE 'Europe/Paris') < ${start})) AS new_customers,
              count(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM customer_order p WHERE lower(p.email) = b.email AND p.status IN ('paid', 'preparing', 'shipped', 'completed')
                  AND (p.paid_at AT TIME ZONE 'Europe/Paris') < ${start})) AS returning_customers
       FROM buyers b`,
    ),
  ]);

  const imageIds = top.map((t) => t.image_id).filter(Boolean) as string[];
  const images = imageIds.length
    ? await query<ImageRow>("SELECT id, width, height, widths, placeholder, alt, base_url FROM image WHERE id = ANY($1::uuid[])", [imageIds])
    : [];
  const imageOf = (id: string | null) => {
    const row = images.find((i) => i.id === id);
    return row ? toImageRef(row) : null;
  };
  const shape = (r: typeof cur) => {
    const revenueCents = Number(r?.revenue ?? 0);
    const orders = Number(r?.orders ?? 0);
    return { revenueCents, orders, items: Number(r?.items ?? 0), averageCents: orders ? Math.round(revenueCents / orders) : 0, customers: Number(r?.customers ?? 0) };
  };
  const dayFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
  const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" });
  return {
    period,
    current: shape(cur),
    previous: shape(prev),
    series: series.map((s) => {
      const d = new Date(s.bucket);
      const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      return { key: utc.toISOString().slice(0, 10), label: (months ? monthFmt : dayFmt).format(utc), revenueCents: Number(s.revenue ?? 0), orders: Number(s.orders) };
    }),
    topProducts: top.map((t) => ({ name: t.name, productId: t.product_id, image: imageOf(t.image_id), quantity: Number(t.quantity), revenueCents: Number(t.revenue) })),
    categories: cats.map((c) => ({ name: c.name ?? "Sans catégorie", revenueCents: Number(c.revenue), quantity: Number(c.quantity) })),
    shipping: ship.map((s) => ({ name: s.name, orders: Number(s.orders) })),
    returning: { newCustomers: Number(ret?.new_customers ?? 0), returningCustomers: Number(ret?.returning_customers ?? 0) },
  };
}
