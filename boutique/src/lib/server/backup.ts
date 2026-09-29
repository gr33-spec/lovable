import "server-only";
import type { PoolClient } from "pg";
import { query, transaction } from "./db";
import { getFile, putFile, removeFiles } from "./storage";

// Sauvegarde logique complète de la base (JSON) et restauration.
// - automatique chaque nuit dans l'espace de stockage PRIVÉ (30 conservées) ;
// - téléchargeable à tout moment depuis l'administration (copie hors ligne) ;
// - restaurable avec `npm run db:restore -- fichier.json` (testé automatiquement).
// Les sessions, limites de débit et jetons temporaires ne sont pas sauvegardés.

export const BACKUP_TABLES = [
  "admin_user",
  "category",
  "collection",
  "product",
  "product_slug_redirect",
  "image",
  "shipping_method",
  "shop_settings",
  "legal_page",
  "customer_order",
  "order_item",
  "stock_movement",
  "payment_event",
  "email_outbox",
  "invoice_counter",
  "audit_log",
] as const;

export interface BackupFile {
  format: "boheme-backup";
  version: 1;
  createdAt: string;
  schema: string;
  tables: Record<string, Record<string, unknown>[]>;
}

export async function createBackup(): Promise<BackupFile> {
  return transaction(async (c) => {
    // Instantané cohérent : toutes les tables lues au même instant.
    await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const schema = await query<{ version: string }>("SELECT version FROM schema_migration ORDER BY version DESC LIMIT 1", [], c);
    const tables: BackupFile["tables"] = {};
    for (const t of BACKUP_TABLES) tables[t] = await query(`SELECT * FROM ${t}`, [], c);
    return { format: "boheme-backup", version: 1, createdAt: new Date().toISOString(), schema: schema[0]?.version ?? "", tables };
  });
}

async function insertRows(c: PoolClient, table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const typeRows = await query<{ column_name: string; data_type: string; is_identity: string }>(
    "SELECT column_name, data_type, is_identity FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
    [table],
    c,
  );
  const known = new Map(typeRows.map((r) => [r.column_name, r]));
  const cols = Object.keys(rows[0]).filter((k) => known.has(k));
  const identity = cols.some((k) => known.get(k)?.is_identity === "YES");
  for (const row of rows) {
    const values = cols.map((k) => {
      const v = row[k];
      return known.get(k)?.data_type === "jsonb" && v !== null ? JSON.stringify(v) : v;
    });
    await c.query(
      `INSERT INTO ${table} (${cols.map((k) => `"${k}"`).join(", ")}) ${identity ? "OVERRIDING SYSTEM VALUE" : ""} VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")})`,
      values,
    );
  }
  if (identity) {
    await c.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), coalesce((SELECT max(id) FROM ${table}), 1))`);
  }
}

/** Remplace TOUTES les données par celles de la sauvegarde (dans une transaction : tout ou rien). */
export async function restoreBackup(file: BackupFile): Promise<void> {
  if (file.format !== "boheme-backup" || file.version !== 1) throw new Error("Fichier de sauvegarde non reconnu.");
  await transaction(async (c) => {
    await c.query(`TRUNCATE ${[...BACKUP_TABLES, "admin_session", "password_reset", "system_event"].join(", ")} RESTART IDENTITY CASCADE`);
    // Ordre des dépendances ; les paramètres (qui pointent vers des images) en dernier.
    const settings = file.tables.shop_settings ?? [];
    for (const t of BACKUP_TABLES) {
      if (t === "shop_settings") continue;
      await insertRows(c, t, file.tables[t] ?? []);
    }
    await insertRows(c, "shop_settings", settings);
  });
}

export async function storeNightlyBackup(): Promise<string> {
  const backup = await createBackup();
  const key = `backups/${backup.createdAt.slice(0, 10)}.json`;
  await putFile("private", key, Buffer.from(JSON.stringify(backup)), "application/json");
  // Conservation : 30 jours.
  const old = new Date(Date.now() - 31 * 86_400_000).toISOString().slice(0, 10);
  await removeFiles("private", [`backups/${old}.json`]).catch(() => undefined);
  return key;
}

export async function readStoredBackup(date: string): Promise<Buffer | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return getFile("private", `backups/${date}.json`);
}

// ───────────── Exports CSV (tableur) ─────────────

function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
  // Neutralise les formules (injection dans Excel).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[], columns: [string, string][]): string {
  const header = columns.map(([, label]) => csvCell(label)).join(";");
  const lines = rows.map((r) => columns.map(([key]) => csvCell(r[key])).join(";"));
  return `﻿${[header, ...lines].join("\r\n")}\r\n`;
}

export async function exportProductsCsv(): Promise<string> {
  const rows = await query(
    `SELECT p.name, p.sku, c.name AS category, col.name AS collection, p.price_cents / 100.0 AS price, p.stock, p.status, p.slug, p.created_at, p.published_at
     FROM product p JOIN category c ON c.id = p.category_id LEFT JOIN collection col ON col.id = p.collection_id ORDER BY p.name`,
  );
  return toCsv(rows, [
    ["name", "Nom"],
    ["sku", "Référence"],
    ["category", "Catégorie"],
    ["collection", "Collection"],
    ["price", "Prix (€)"],
    ["stock", "Stock"],
    ["status", "Statut"],
    ["slug", "Adresse"],
    ["created_at", "Créé le"],
    ["published_at", "Publié le"],
  ]);
}

/** Livre des recettes : ventes encaissées, dans l'ordre chronologique. */
export async function exportOrdersCsv(from?: string, to?: string): Promise<string> {
  const rows = await query(
    `SELECT o.paid_at, o.invoice_number, o.number, o.last_name || ' ' || o.first_name AS client, o.status,
            o.subtotal_cents / 100.0 AS subtotal, o.shipping_cents / 100.0 AS shipping, o.discount_cents / 100.0 AS discount,
            o.total_cents / 100.0 AS total, o.refunded_cents / 100.0 AS refunded, o.vat_cents / 100.0 AS vat, o.payment_provider AS payment
     FROM customer_order o
     WHERE o.paid_at IS NOT NULL AND ($1::date IS NULL OR o.paid_at >= $1::date) AND ($2::date IS NULL OR o.paid_at < $2::date + 1)
     ORDER BY o.paid_at`,
    [from ?? null, to ?? null],
  );
  return toCsv(rows, [
    ["paid_at", "Date d'encaissement"],
    ["invoice_number", "N° de facture"],
    ["number", "N° de commande"],
    ["client", "Client"],
    ["status", "Statut"],
    ["subtotal", "Articles (€)"],
    ["shipping", "Livraison (€)"],
    ["discount", "Réduction (€)"],
    ["total", "Total encaissé (€)"],
    ["refunded", "Remboursé (€)"],
    ["vat", "TVA incluse (€)"],
    ["payment", "Mode de paiement"],
  ]);
}

export async function exportStockCsv(): Promise<string> {
  const rows = await query(
    `SELECT m.created_at, p.name, m.delta, m.stock_after, m.reason, o.number AS order_number
     FROM stock_movement m JOIN product p ON p.id = m.product_id LEFT JOIN customer_order o ON o.id = m.order_id
     ORDER BY m.created_at DESC LIMIT 20000`,
  );
  return toCsv(rows, [
    ["created_at", "Date"],
    ["name", "Produit"],
    ["delta", "Variation"],
    ["stock_after", "Stock après"],
    ["reason", "Motif"],
    ["order_number", "Commande"],
  ]);
}

/** RGPD : toutes les données d'une cliente (droit d'accès / portabilité). */
export async function exportCustomerData(email: string) {
  const orders = await query(
    `SELECT number, created_at, status, email, first_name, last_name, phone, ship_line1, ship_line2, ship_postal_code, ship_city, ship_country,
            shipping_method_name, total_cents, paid_at, shipped_at
     FROM customer_order WHERE lower(email) = lower($1) AND status NOT IN ('pending')`,
    [email.trim().slice(0, 254)],
  );
  return { email, generatedAt: new Date().toISOString(), orders };
}
