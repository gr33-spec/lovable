import "server-only";
import { decrypt } from "../crypto";
import { query, transaction } from "../db";
import { siteUrl } from "../env";
import { errorMessage, reportEvent } from "../monitoring";
import { loadPublicOrder, ORDER_TOKEN_PURPOSE, orderUrl } from "../orders";
import { loadSettings, vatMention } from "../settings";
import { emailProvider } from "./provider";
import {
  adminAlertEmail,
  adminNewOrderEmail,
  orderConfirmationEmail,
  orderRefundedEmail,
  orderShippedEmail,
  type EmailBrand,
  type EmailOrder,
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

async function renderFor(kind: string, orderId: string | null, payload: Record<string, unknown>, b: EmailBrand) {
  if (kind === "admin_alert") {
    return adminAlertEmail(b, String(payload.title ?? "Alerte"), String(payload.message ?? ""), `${siteUrl()}/admin`);
  }
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

export async function processOutbox(limit = 20): Promise<{ sent: number; failed: number }> {
  const claimed = await transaction(async (c) => {
    const rows = await query<{ id: string; order_id: string | null; kind: string; recipient: string; payload: Record<string, unknown>; attempts: number }>(
      `SELECT id, order_id, kind, recipient, payload, attempts FROM email_outbox
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
      const message = await renderFor(row.kind, row.order_id, row.payload, b);
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
