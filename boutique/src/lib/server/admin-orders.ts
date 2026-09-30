import "server-only";
import { canCancel, canRefund, canTransition, type OrderStatus } from "../order-status";
import { query, queryOne, transaction } from "./db";
import { audit, errorMessage, reportEvent } from "./monitoring";
import { enqueueEmail } from "./orders";
import { payments } from "./payments";

// Actions de la créatrice sur les commandes. Chaque action relit l'état en
// base (verrouillé) et refuse toute transition incohérente, même si
// l'interface a été contournée.

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export interface ShipDetails {
  trackingNumber?: string;
  trackingUrl?: string;
}

export async function setOrderStatus(orderId: string, to: OrderStatus, adminId: string, ship: ShipDetails = {}): Promise<ActionResult> {
  return transaction(async (c) => {
    const order = await queryOne<{ status: OrderStatus; email: string; anonymized_at: Date | null }>(
      "SELECT status, email, anonymized_at FROM customer_order WHERE id = $1 FOR UPDATE",
      [orderId],
      c,
    );
    if (!order) return { ok: false, error: "Commande introuvable." };
    if (order.status === to) return { ok: true };
    if (!canTransition(order.status, to)) return { ok: false, error: "Ce changement de statut n'est pas possible pour cette commande." };
    const trackingUrl = ship.trackingUrl?.trim() || null;
    if (trackingUrl && !/^https:\/\/[^\s<>"]{3,490}$/.test(trackingUrl)) return { ok: false, error: "Le lien de suivi doit commencer par https://" };
    const trackingNumber = ship.trackingNumber?.trim().slice(0, 80) || null;
    await query(
      `UPDATE customer_order SET status = $2,
         shipped_at = CASE WHEN $2 = 'shipped' THEN coalesce(shipped_at, now()) ELSE shipped_at END,
         completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE completed_at END,
         tracking_number = CASE WHEN $2 = 'shipped' THEN coalesce($3, tracking_number) ELSE tracking_number END,
         tracking_url = CASE WHEN $2 = 'shipped' THEN coalesce($4, tracking_url) ELSE tracking_url END
       WHERE id = $1`,
      [orderId, to, trackingNumber, trackingUrl],
      c,
    );
    // Un seul e-mail d'expédition par commande, même si le statut change plusieurs fois.
    if (to === "shipped" && !order.anonymized_at) await enqueueEmail(c, orderId, "order_shipped", order.email);
    await audit(adminId, "order_status", "order", orderId, { from: order.status, to }, "", c);
    return { ok: true };
  });
}

export async function updateOrderNote(orderId: string, note: string, adminId: string): Promise<ActionResult> {
  await query("UPDATE customer_order SET admin_note = $2 WHERE id = $1", [orderId, note.slice(0, 2000)]);
  await audit(adminId, "order_note", "order", orderId);
  return { ok: true };
}

export async function clearAttention(orderId: string, adminId: string): Promise<ActionResult> {
  await query("UPDATE customer_order SET needs_attention = NULL WHERE id = $1", [orderId]);
  await audit(adminId, "order_attention_cleared", "order", orderId);
  return { ok: true };
}

/**
 * Annulation (avant expédition) ou remboursement (après). Le remboursement
 * est demandé au prestataire avec une clé d'idempotence : un double clic ne
 * rembourse jamais deux fois.
 */
export async function refundOrder(orderId: string, adminId: string, opts: { restock: boolean; cancel: boolean }): Promise<ActionResult> {
  const order = await queryOne<{ status: OrderStatus; payment_intent_id: string | null; total_cents: number; refunded_cents: number }>(
    "SELECT status, payment_intent_id, total_cents, refunded_cents FROM customer_order WHERE id = $1",
    [orderId],
  );
  if (!order) return { ok: false, error: "Commande introuvable." };
  const allowed = opts.cancel ? canCancel(order.status) : canRefund(order.status);
  if (!allowed) return { ok: false, error: opts.cancel ? "Cette commande ne peut plus être annulée." : "Cette commande ne peut pas être remboursée." };
  const remaining = order.total_cents - order.refunded_cents;
  if (remaining > 0) {
    if (!order.payment_intent_id) return { ok: false, error: "Paiement introuvable chez le prestataire : remboursez depuis Stripe." };
    try {
      await payments().refund(order.payment_intent_id, remaining, `refund-${orderId}`);
    } catch (err) {
      await reportEvent("error", "refund", "Remboursement refusé par le prestataire", { orderId, error: errorMessage(err) });
      return { ok: false, error: "Le remboursement n'a pas pu être effectué. Réessayez, ou remboursez depuis le tableau de bord Stripe." };
    }
  }
  return transaction(async (c) => {
    const current = await queryOne<{ status: OrderStatus; email: string; anonymized_at: Date | null }>(
      "SELECT status, email, anonymized_at FROM customer_order WHERE id = $1 FOR UPDATE",
      [orderId],
      c,
    );
    if (!current) return { ok: false, error: "Commande introuvable." };
    const target: OrderStatus = opts.cancel ? "cancelled" : "refunded";
    if (current.status === "cancelled" || current.status === "refunded") return { ok: true, message: "Déjà remboursée." };
    await query(
      `UPDATE customer_order SET status = $2, refunded_cents = total_cents, refunded_at = now(),
         cancelled_at = CASE WHEN $2 = 'cancelled' THEN now() ELSE cancelled_at END WHERE id = $1`,
      [orderId, target],
      c,
    );
    if (opts.restock) {
      const items = await query<{ product_id: string; quantity: number }>(
        "SELECT product_id, quantity FROM order_item WHERE order_id = $1 AND product_id IS NOT NULL ORDER BY product_id",
        [orderId],
        c,
      );
      for (const i of items) {
        const row = await queryOne<{ stock: number }>("UPDATE product SET stock = stock + $2 WHERE id = $1 RETURNING stock", [i.product_id, i.quantity], c);
        if (row) {
          await query("INSERT INTO stock_movement (product_id, delta, stock_after, reason, order_id, admin_id) VALUES ($1, $2, $3, 'restock', $4, $5)", [
            i.product_id,
            i.quantity,
            row.stock,
            orderId,
            adminId,
          ], c);
        }
      }
    }
    if (!current.anonymized_at) await enqueueEmail(c, orderId, opts.cancel ? "order_cancelled" : "order_refunded", current.email);
    await audit(adminId, opts.cancel ? "order_cancelled" : "order_refunded", "order", orderId, { amount: remaining, restock: opts.restock }, "", c);
    return { ok: true };
  });
}

/**
 * RGPD : efface les données personnelles d'une commande (demande
 * d'effacement). Les montants et produits restent (obligations comptables).
 */
export async function anonymizeOrder(orderId: string, adminId: string): Promise<ActionResult> {
  const row = await queryOne<{ status: OrderStatus }>("SELECT status FROM customer_order WHERE id = $1", [orderId]);
  if (!row) return { ok: false, error: "Commande introuvable." };
  if (row.status === "paid" || row.status === "preparing" || row.status === "pending") {
    return { ok: false, error: "Terminez, annulez ou expédiez la commande avant d'effacer les données de la cliente." };
  }
  await query(
    `UPDATE customer_order SET email = 'anonyme@invalid', first_name = 'Anonyme', last_name = '', phone = NULL,
       ship_line1 = NULL, ship_line2 = NULL, ship_postal_code = NULL, ship_city = NULL,
       tracking_number = NULL, tracking_url = NULL, admin_note = '', anonymized_at = now()
     WHERE id = $1`,
    [orderId],
  );
  await query("DELETE FROM email_outbox WHERE order_id = $1 AND status <> 'sent'", [orderId]);
  await audit(adminId, "order_anonymized", "order", orderId);
  return { ok: true };
}

/** Effacement automatique des adresses de livraison au-delà de la durée choisie. */
export async function purgeOldAddresses(months: number | null): Promise<number> {
  // Les paiements jamais aboutis ne sont pas des ventes : rien à conserver au-delà de 30 jours.
  await query(
    `UPDATE customer_order SET email = 'anonyme@invalid', first_name = 'Anonyme', last_name = '', phone = NULL,
       ship_line1 = NULL, ship_line2 = NULL, ship_postal_code = NULL, ship_city = NULL, anonymized_at = now()
     WHERE status = 'expired' AND anonymized_at IS NULL AND created_at < now() - interval '30 days'`,
  );
  // Réservations annulées ou expirées : aucune vente, coordonnées effacées après 30 jours.
  await query(
    `UPDATE reservation SET first_name = 'Anonyme', phone = '••••••', email = NULL
     WHERE status IN ('cancelled', 'expired') AND first_name <> 'Anonyme' AND coalesce(closed_at, created_at) < now() - interval '30 days'`,
  );
  if (!months) return 0;
  // Réservations confirmées : même durée de conservation que les adresses des commandes.
  await query(
    `UPDATE reservation SET first_name = 'Anonyme', phone = '••••••', email = NULL
     WHERE status = 'confirmed' AND first_name <> 'Anonyme' AND coalesce(confirmed_at, created_at) < now() - make_interval(months => $1)`,
    [months],
  );
  const rows = await query(
    `UPDATE customer_order SET phone = NULL, ship_line1 = NULL, ship_line2 = NULL, tracking_number = NULL, tracking_url = NULL, anonymized_at = coalesce(anonymized_at, now())
     WHERE status IN ('completed', 'cancelled', 'refunded', 'shipped') AND ship_line1 IS NOT NULL
       AND coalesce(completed_at, refunded_at, cancelled_at, shipped_at, created_at) < now() - make_interval(months => $1)
     RETURNING id`,
    [months],
  );
  return rows.length;
}
