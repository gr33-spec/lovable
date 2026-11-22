import "server-only";
import { decrypt } from "../crypto";
import { query, transaction } from "../db";
import { siteUrl } from "../env";
import { errorMessage, reportEvent } from "../monitoring";
import { loadPublicOrder, ORDER_TOKEN_PURPOSE, orderUrl } from "../orders";
import { loadReservation } from "../reservations";
import { loadSettings, vatMention } from "../settings";
import { DELIVERY_LABELS, whatsappUrl } from "../../validation";
import { dashboard, salesStats } from "../admin-queries";
import { emailProvider } from "./provider";
import {
  adminAlertEmail,
  adminNewOrderEmail,
  adminNewReservationEmail,
  orderConfirmationEmail,
  reservationReceivedEmail,
  orderRefundedEmail,
  orderShippedEmail,
  type EmailBrand,
  type EmailOrder,
  type WeeklyReport,
  weeklyReportEmail,
} from "./templates";

// Envoi des e-mails en attente. Chaque e-mail est « réservé » avant l'envoi
// (FOR UPDATE SKIP LOCKED) : deux exécutions simultanées n'envoient jamais le
// même message. En cas d'échec : nouvel essai avec délai croissant, puis
// alerte visible dans l'administration.

const MAX_ATTEMPTS = 6;

export async function brand(): Promise<EmailBrand> {
  const s = await loadSettings();
  return {
    shopName: s.shopName,
    themeId: s.themeId,
    themeCustom: s.themeCustom,
    siteUrl: siteUrl(),
    contactEmail: s.contactEmail,
    // JPEG : lisible par tous les logiciels de messagerie (Outlook ne lit pas le WebP).
    logoUrl: s.logo ? `${s.logo.base}/og.jpg` : null,
  };
}

async function renderReservation(kind: string, reservationId: string, b: EmailBrand) {
  const r = await loadReservation(reservationId);
  if (!r) throw new Error("Réservation introuvable");
  const data = {
    ...r,
    deliveryLabel: DELIVERY_LABELS[r.delivery],
    telUrl: `tel:${r.phone.replace(/[^\d+]/g, "")}`,
    whatsappUrl: whatsappUrl(r.phone),
  };
  if (kind === "admin_new_reservation") return adminNewReservationEmail(b, data, `${siteUrl()}/admin/reservations`);
  if (kind === "reservation_received") return reservationReceivedEmail(b, data);
  throw new Error(`Type d'e-mail inconnu : ${kind}`);
}

async function renderFor(kind: string, orderId: string | null, payload: Record<string, unknown>, b: EmailBrand, reservationId: string | null = null) {
  if (reservationId) return renderReservation(kind, reservationId, b);
  if (kind === "admin_alert") {
    return adminAlertEmail(b, String(payload.title ?? "Alerte"), String(payload.message ?? ""), `${siteUrl()}/admin`);
  }
  if (kind === "weekly_report") return weeklyReportEmail(b, await buildWeeklyReport(), `${siteUrl()}/admin?periode=7j`);
  if (!orderId) throw new Error("E-mail sans commande");
  const order = await loadPublicOrder("id = $1", orderId);
  if (!order) throw new Error("Commande introuvable");
  if (order.anonymized) throw new Error("Commande anonymisée : e-mail abandonné");
  const tokenRow = (await query<{ access_token_enc: string }>("SELECT access_token_enc FROM customer_order WHERE id = $1", [orderId]))[0];
  const link = orderUrl(decrypt(tokenRow.access_token_enc, ORDER_TOKEN_PURPOSE));
  const s = await loadSettings();
  const data: EmailOrder = { ...order, phone: null, vatMention: vatMention(s) };
  switch (kind) {
    case "order_confirmation":
      return orderConfirmationEmail(b, data, link);
    case "admin_new_order":
      return adminNewOrderEmail(b, data, `${siteUrl()}/admin/commandes/${orderId}`);
    case "order_shipped":
      return orderShippedEmail(b, data, link);
    case "order_refunded":
      return orderRefundedEmail(b, data, link, false);
    case "order_cancelled":
      return orderRefundedEmail(b, data, link, true);
    default:
      throw new Error(`Type d'e-mail inconnu : ${kind}`);
  }
}

const NOT_CONFIGURED = "Service d'e-mail pas encore configuré : les e-mails attendent et partiront dès sa configuration (Resend, voir le guide).";

export async function processOutbox(limit = 20): Promise<{ sent: number; failed: number }> {
  // Service d'e-mail absent : une seule alerte claire (pas une par e-mail et par essai),
  // et les e-mails restent en attente sans consommer leurs essais.
  try {
    emailProvider();
  } catch {
    const open = await query("SELECT 1 FROM system_event WHERE source = 'email' AND message = $1 AND resolved_at IS NULL LIMIT 1", [NOT_CONFIGURED]);
    const waiting = await query("SELECT 1 FROM email_outbox WHERE status = 'pending' LIMIT 1");
    if (!open.length && waiting.length) await reportEvent("warning", "email", NOT_CONFIGURED);
    return { sent: 0, failed: 0 };
  }
  // Notifications de réservation devenues trop anciennes (service configuré tardivement) :
  // abandonnées plutôt qu'envoyées des jours après (la réservation reste visible dans l'administration).
  await query(
    `UPDATE email_outbox SET status = 'failed', last_error = 'Abandonné : trop ancien (service d''e-mail configuré après coup)'
     WHERE status = 'pending' AND kind IN ('admin_new_reservation', 'reservation_received') AND created_at < now() - interval '3 days'`,
  );
  const claimed = await transaction(async (c) => {
    const rows = await query<{ id: string; order_id: string | null; reservation_id: string | null; kind: string; recipient: string; payload: Record<string, unknown>; attempts: number }>(
      `SELECT id, order_id, reservation_id, kind, recipient, payload, attempts FROM email_outbox
       WHERE status = 'pending' AND next_attempt_at <= now()
       ORDER BY created_at LIMIT $1 FOR UPDATE SKIP LOCKED`,
      [limit],
      c,
    );
    if (rows.length) {
      // Réservation : pendant l'envoi, aucune autre exécution ne reprend ces messages.
      await query("UPDATE email_outbox SET attempts = attempts + 1, next_attempt_at = now() + interval '10 minutes' WHERE id = ANY($1::uuid[])", [rows.map((r) => r.id)], c);
    }
    return rows;
  });
  if (!claimed.length) return { sent: 0, failed: 0 };
  const b = await brand();
  let sent = 0;
  let failed = 0;
  for (const row of claimed) {
    try {
      const message = await renderFor(row.kind, row.order_id, row.payload, b, row.reservation_id);
      await emailProvider().send({ ...message, to: row.recipient, replyTo: b.contactEmail || undefined });
      await query("UPDATE email_outbox SET status = 'sent', sent_at = now(), last_error = NULL WHERE id = $1", [row.id]);
      sent++;
    } catch (err) {
      failed++;
      const attempts = row.attempts + 1;
      const final = attempts >= MAX_ATTEMPTS;
      await query(
        `UPDATE email_outbox SET status = $2, last_error = $3, next_attempt_at = now() + make_interval(mins => $4) WHERE id = $1`,
        [row.id, final ? "failed" : "pending", errorMessage(err), 2 ** attempts * 2],
      );
      await reportEvent(final ? "error" : "warning", "email", final ? "E-mail définitivement non envoyé" : "Échec d'envoi d'un e-mail (nouvel essai prévu)", {
        kind: row.kind,
        orderId: row.order_id,
        attempts,
        error: errorMessage(err),
      });
    }
  }
  return { sent, failed };
}

/** Alerte envoyée à la créatrice (incident important). */
export async function queueAdminAlert(title: string, message: string): Promise<void> {
  const s = await loadSettings();
  const to = s.notificationEmail || s.contactEmail;
  if (!to) return;
  await query(
    `INSERT INTO email_outbox (order_id, kind, recipient, payload)
     SELECT NULL, 'admin_alert', $1, $2
     WHERE NOT EXISTS (SELECT 1 FROM email_outbox WHERE kind = 'admin_alert' AND payload->>'title' = $3 AND created_at > now() - interval '6 hours')`,
    [to, { title, message }, title],
  );
}

async function buildWeeklyReport(): Promise<WeeklyReport> {
  const s = await loadSettings();
  const [stats, d] = await Promise.all([salesStats("7j"), dashboard(s.lowStockThreshold)]);
  const to = new Date();
  const from = new Date(to.getTime() - 6 * 86_400_000);
  return {
    from,
    to,
    revenueCents: stats.current.revenueCents,
    previousRevenueCents: stats.previous.revenueCents,
    orders: stats.current.orders,
    previousOrders: stats.previous.orders,
    averageCents: stats.current.averageCents,
    items: stats.current.items,
    toPrepare: d.toPrepareCount,
    top: stats.topProducts.slice(0, 3).map((p) => ({ name: p.name, quantity: p.quantity, revenueCents: p.revenueCents })),
    soldOut: d.soldOut.map((p) => p.name),
    lowStock: d.lowStock.map((p) => ({ name: p.name, stock: p.stock })),
  };
}

/** Semaine ISO (ex. « 2026-W40 ») à l'heure de Paris : un seul récapitulatif par semaine. */
export function isoWeek(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const d = new Date(`${parts}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Récapitulatif du lundi : programmé par la tâche de nuit ; seulement le
 * lundi (heure de Paris), une seule fois par semaine même si la tâche
 * repasse. Renvoie vrai si un récapitulatif a été programmé.
 */
export async function queueWeeklyReport(now = new Date(), force = false): Promise<boolean> {
  const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short" }).format(now);
  if (!force && weekday !== "Mon") return false;
  const s = await loadSettings();
  const to = s.notificationEmail || s.contactEmail;
  if (!to) return false;
  const week = isoWeek(now);
  const rows = await query(
    `INSERT INTO email_outbox (order_id, kind, recipient, payload)
     SELECT NULL, 'weekly_report', $1, $2
     WHERE NOT EXISTS (SELECT 1 FROM email_outbox WHERE kind = 'weekly_report' AND payload->>'week' = $3)
     RETURNING id`,
    [to, { week }, week],
  );
  return rows.length > 0;
}
