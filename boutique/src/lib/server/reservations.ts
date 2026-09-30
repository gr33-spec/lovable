import "server-only";
import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import type { ImageRef } from "../image-ref";
import { RESERVATION_HOURS } from "../sales-mode";
import type { ReservationInput } from "../validation";
import { isUniqueViolation, query, queryOne, transaction } from "./db";
import { toImageRef, type ImageRow } from "./images";
import { audit, errorMessage, reportEvent } from "./monitoring";
import { loadSettings } from "./settings";

// ═══════════════════════════════════════════════════════════════════════
// Réservations sans paiement en ligne.
//
// La pièce est retirée du stock DANS la même transaction que la création
// de la réservation, produit verrouillé (FOR UPDATE) : deux clientes qui
// valident à la même seconde ne peuvent pas obtenir la même pièce.
// Annulation ou expiration : la pièce est remise en stock. Confirmation :
// elle reste vendue. Chaque changement est journalisé (stock_movement).
// ═══════════════════════════════════════════════════════════════════════

export type ReservationStatus = "pending" | "confirmed" | "cancelled" | "expired";

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Réservé – en attente de confirmation",
  confirmed: "Confirmée",
  cancelled: "Annulée",
  expired: "Expirée (non confirmée)",
};

const NUMBER_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function newReservationNumber(): string {
  let out = "R-";
  for (let i = 0; i < 6; i++) out += NUMBER_ALPHABET[randomInt(NUMBER_ALPHABET.length)];
  return out;
}

export type ReserveResult =
  | { ok: true; number: string }
  | { ok: false; code: "closed" | "unavailable" | "error"; message: string };

async function moveStock(c: PoolClient, productId: string, delta: 1 | -1, reservationId: string, adminId: string | null): Promise<boolean> {
  const row = await queryOne<{ stock: number }>("UPDATE product SET stock = stock + $2 WHERE id = $1 AND stock + $2 >= 0 RETURNING stock", [productId, delta], c);
  if (!row) return false;
  await query(
    "INSERT INTO stock_movement (product_id, delta, stock_after, reason, reservation_id, admin_id) VALUES ($1, $2, $3, $4, $5, $6)",
    [productId, delta, row.stock, delta < 0 ? "reservation" : "release", reservationId, adminId],
    c,
  );
  return true;
}

/** Enregistre la demande et bloque la pièce. Un double envoi (même clé) renvoie la même réservation. */
export async function createReservation(input: ReservationInput): Promise<ReserveResult> {
  const settings = await loadSettings();
  if (!settings.ordersOpen) {
    return { ok: false, code: "closed", message: settings.closedMessage || "Les réservations sont momentanément en pause. Revenez très vite !" };
  }
  const existing = await queryOne<{ number: string }>("SELECT number FROM reservation WHERE idempotency_key = $1", [input.idempotencyKey]);
  if (existing) return { ok: true, number: existing.number };

  // Une réservation dépassée sur ce bijou est d'abord libérée (si l'option est active).
  await expireReservations(5, input.productId).catch(() => 0);

  try {
    const result = await transaction(async (c): Promise<ReserveResult & { id?: string }> => {
      const product = await queryOne<{ id: string; name: string; sku: string | null; slug: string; price_cents: number; stock: number; status: string; category_visible: boolean }>(
        `SELECT p.id, p.name, p.sku, p.slug, p.price_cents, p.stock, p.status, c.is_visible AS category_visible
         FROM product p JOIN category c ON c.id = p.category_id WHERE p.id = $1 FOR UPDATE OF p`,
        [input.productId],
        c,
      );
      if (!product || product.status !== "published" || !product.category_visible || product.stock <= 0) {
        return { ok: false, code: "unavailable", message: "Désolée, ce bijou vient d'être réservé ou n'est plus disponible." };
      }
      const image = await queryOne<{ id: string }>("SELECT id FROM image WHERE product_id = $1 AND kind = 'product' ORDER BY position, created_at LIMIT 1", [product.id], c);
      let row: { id: string; number: string } | null = null;
      for (let attempt = 0; !row && attempt < 5; attempt++) {
        try {
          await query("SAVEPOINT numero", [], c);
          row = await queryOne<{ id: string; number: string }>(
            `INSERT INTO reservation (number, idempotency_key, product_id, product_name, product_sku, product_slug, image_id, price_cents,
                                      first_name, phone, email, delivery, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now() + make_interval(hours => $13))
             RETURNING id, number`,
            [
              newReservationNumber(),
              input.idempotencyKey,
              product.id,
              product.name,
              product.sku,
              product.slug,
              image?.id ?? null,
              product.price_cents,
              input.firstName,
              input.phone,
              input.email || null,
              input.delivery,
              RESERVATION_HOURS,
            ],
            c,
          );
        } catch (err) {
          await query("ROLLBACK TO SAVEPOINT numero", [], c);
          if (!isUniqueViolation(err, "reservation_number_key")) throw err;
        }
      }
      if (!row) throw new Error("Numéro de réservation indisponible");
      await moveStock(c, product.id, -1, row.id, null);

      // Notifications : la créatrice, et la cliente si elle a laissé son e-mail.
      const to = settings.notificationEmail || settings.contactEmail;
      if (to) await query("INSERT INTO email_outbox (reservation_id, kind, recipient) VALUES ($1, 'admin_new_reservation', $2)", [row.id, to], c);
      if (input.email) await query("INSERT INTO email_outbox (reservation_id, kind, recipient) VALUES ($1, 'reservation_received', $2)", [row.id, input.email], c);
      return { ok: true, number: row.number, id: row.id };
    });
    return result.ok ? { ok: true, number: result.number } : result;
  } catch (err) {
    // Double clic simultané : la première demande a gagné, on renvoie la même.
    if (isUniqueViolation(err, "reservation_idempotency_key_key")) {
      const again = await queryOne<{ number: string }>("SELECT number FROM reservation WHERE idempotency_key = $1", [input.idempotencyKey]);
      if (again) return { ok: true, number: again.number };
    }
    await reportEvent("error", "reservation", "Réservation non enregistrée", { error: errorMessage(err) });
    return { ok: false, code: "error", message: "La réservation n'a pas pu être enregistrée. Réessayez dans un instant." };
  }
}

export type ReservationAction = "confirm" | "cancel";

/**
 * Décision de la créatrice.
 * - confirm : en attente → confirmée (la pièce reste vendue) ;
 * - cancel : en attente ou confirmée → annulée, la pièce redevient disponible.
 */
export async function updateReservation(id: string, action: ReservationAction, adminId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  return transaction(async (c) => {
    const r = await queryOne<{ status: ReservationStatus; product_id: string }>("SELECT status, product_id FROM reservation WHERE id = $1 FOR UPDATE", [id], c);
    if (!r) return { ok: false as const, error: "Réservation introuvable." };
    if (action === "confirm") {
      if (r.status !== "pending") return { ok: false as const, error: "Cette réservation n'est plus en attente." };
      await query("UPDATE reservation SET status = 'confirmed', confirmed_at = now() WHERE id = $1", [id], c);
    } else {
      if (r.status !== "pending" && r.status !== "confirmed") return { ok: false as const, error: "Cette réservation est déjà close." };
      await query("UPDATE reservation SET status = 'cancelled', closed_at = now() WHERE id = $1", [id], c);
      await moveStock(c, r.product_id, 1, id, adminId);
    }
    await audit(adminId, `reservation_${action}`, "reservation", id, {}, "", c);
    return { ok: true as const };
  });
}

/** Libère les réservations non confirmées à temps (si l'option est active). Renvoie le nombre libéré. */
export async function expireReservations(limit = 50, productId?: string): Promise<number> {
  const settings = await loadSettings();
  if (!settings.reservationAutoExpire) return 0;
  const rows = await query<{ id: string }>(
    `SELECT id FROM reservation WHERE status = 'pending' AND expires_at < now() AND ($2::uuid IS NULL OR product_id = $2)
     ORDER BY expires_at LIMIT $1`,
    [limit, productId ?? null],
  );
  let released = 0;
  for (const { id } of rows) {
    const done = await transaction(async (c) => {
      const r = await queryOne<{ product_id: string }>("SELECT product_id FROM reservation WHERE id = $1 AND status = 'pending' AND expires_at < now() FOR UPDATE", [id], c);
      if (!r) return false;
      await query("UPDATE reservation SET status = 'expired', closed_at = now() WHERE id = $1", [id], c);
      await moveStock(c, r.product_id, 1, id, null);
      return true;
    });
    if (done) released++;
  }
  return released;
}

export interface AdminReservation {
  id: string;
  number: string;
  productId: string;
  productName: string;
  productSku: string | null;
  productSlug: string;
  priceCents: number;
  image: ImageRef | null;
  firstName: string;
  phone: string;
  email: string | null;
  delivery: "hand" | "post";
  status: ReservationStatus;
  createdAt: string;
  expiresAt: string;
}

export type ReservationFilter = "pending" | "confirmed" | "closed" | "all";

async function selectReservations(where: string, params: unknown[], limit: number): Promise<AdminReservation[]> {
  const rows = await query<ImageRow & Record<string, unknown>>(
    `SELECT r.id AS rid, r.number, r.product_id, r.product_name, r.product_sku, r.product_slug, r.price_cents, r.first_name, r.phone, r.email,
            r.delivery, r.status, r.created_at, r.expires_at,
            i.id, i.width, i.height, i.widths, i.placeholder, i.alt, i.base_url
     FROM reservation r LEFT JOIN image i ON i.id = r.image_id
     WHERE ${where} ORDER BY r.created_at DESC LIMIT $1`,
    [limit, ...params],
  );
  return rows.map((r) => ({
    id: r.rid as string,
    number: r.number as string,
    productId: r.product_id as string,
    productName: r.product_name as string,
    productSku: (r.product_sku as string | null) ?? null,
    productSlug: r.product_slug as string,
    priceCents: r.price_cents as number,
    image: r.id ? toImageRef(r) : null,
    firstName: r.first_name as string,
    phone: r.phone as string,
    email: (r.email as string | null) ?? null,
    delivery: r.delivery as "hand" | "post",
    status: r.status as ReservationStatus,
    createdAt: new Date(r.created_at as Date).toISOString(),
    expiresAt: new Date(r.expires_at as Date).toISOString(),
  }));
}

const FILTERS: Record<ReservationFilter, string> = {
  pending: "r.status = 'pending'",
  confirmed: "r.status = 'confirmed'",
  closed: "r.status IN ('cancelled', 'expired')",
  all: "true",
};

export function listReservations(filter: ReservationFilter, limit = 200): Promise<AdminReservation[]> {
  return selectReservations(FILTERS[filter], [], limit);
}

export async function reservationCounts(): Promise<Record<ReservationFilter, number>> {
  const row = await queryOne<{ pending: string; confirmed: string; closed: string; all: string }>(
    `SELECT count(*) FILTER (WHERE status = 'pending') AS pending, count(*) FILTER (WHERE status = 'confirmed') AS confirmed,
            count(*) FILTER (WHERE status IN ('cancelled', 'expired')) AS closed, count(*) AS all FROM reservation`,
  );
  return { pending: Number(row?.pending ?? 0), confirmed: Number(row?.confirmed ?? 0), closed: Number(row?.closed ?? 0), all: Number(row?.all ?? 0) };
}

/** Données d'une réservation pour les e-mails. */
export async function loadReservation(id: string): Promise<AdminReservation | null> {
  return (await selectReservations("r.id = $2", [id], 1))[0] ?? null;
}
