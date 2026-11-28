// Environnement de test : vraie base PostgreSQL (boutique_test), simulateur
// de paiement, e-mails en mémoire.
import { randomUUID } from "node:crypto";
import { Client } from "pg";

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5433/boutique_test";
process.env.APP_SECRET = "test-secret-0123456789-0123456789-0123456789";
process.env.PAYMENT_PROVIDER = "fake";
process.env.EMAIL_PROVIDER = "dev";
process.env.STORAGE_DRIVER = "local";
process.env.SITE_URL = "https://boutique.test";
process.env.BOUTIQUE_TEST = "1";

export async function resetDatabase() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await client.end();
  const { migrate } = await import("../scripts/migrate");
  await migrate(process.env.DATABASE_URL!, () => undefined);
}

export async function closePool() {
  const { pool } = await import("../src/lib/server/db");
  await pool().end();
  (globalThis as unknown as { boutiquePool?: unknown }).boutiquePool = undefined;
}

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const { query } = await import("../src/lib/server/db");
  return query(text, params) as Promise<T[]>;
}

/** Crée un produit publié et renvoie son id. */
export async function makeProduct(opts: { name?: string; price?: number; stock?: number; status?: string } = {}) {
  const [cat] = await sql<{ id: string }>("SELECT id FROM category ORDER BY position LIMIT 1");
  const id = randomUUID();
  const name = opts.name ?? `Boucles ${id.slice(0, 6)}`;
  await sql(
    `INSERT INTO product (id, slug, name, category_id, price_cents, stock, status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
    [id, `p-${id.slice(0, 8)}`, name, cat.id, opts.price ?? 2400, opts.stock ?? 3, opts.status ?? "published"],
  );
  return id;
}

export async function activeShipping() {
  await sql("UPDATE shipping_method SET is_active = true");
  const [m] = await sql<{ id: string }>("SELECT id FROM shipping_method WHERE requires_address ORDER BY position LIMIT 1");
  const [pickup] = await sql<{ id: string }>("SELECT id FROM shipping_method WHERE NOT requires_address LIMIT 1");
  return { shipId: m.id, pickupId: pickup.id };
}

export function checkoutInput(shippingMethodId: string, items: { productId: string; quantity: number }[], extra: Record<string, unknown> = {}) {
  return {
    idempotencyKey: randomUUID(),
    items,
    email: "cliente@exemple.fr",
    firstName: "Camille",
    lastName: "Martin",
    phone: "",
    shippingMethodId,
    country: "FR",
    line1: "12 rue des Lilas",
    line2: "",
    postalCode: "22500",
    city: "Paimpol",
    ...extra,
  };
}

export async function stockOf(productId: string): Promise<number> {
  const [row] = await sql<{ stock: number }>("SELECT stock FROM product WHERE id = $1", [productId]);
  return row.stock;
}
