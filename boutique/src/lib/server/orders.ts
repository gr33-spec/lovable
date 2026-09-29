import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { computeTotals, includedVat } from "../pricing";
import { addressErrors, type CheckoutInput } from "../validation";
import { decrypt, encrypt, randomToken, tokenHash } from "./crypto";
import { isUniqueViolation, query, queryOne, transaction, type Queryable } from "./db";
import { siteUrl } from "./env";
import { ogImageUrl } from "./images";
import { errorMessage, reportEvent } from "./monitoring";
import { payments, PaymentUnavailableError, type CheckoutSessionInfo, type PaymentEvent } from "./payments";
import { loadSettings } from "./settings";

// ═══════════════════════════════════════════════════════════════════════
// Commandes, stock et paiement.
//
// Règle du stock : il est RÉSERVÉ (décrémenté) au moment où la cliente part
// payer, dans une transaction qui verrouille les produits concernés — deux
// clientes ne peuvent donc jamais obtenir la même dernière pièce. La
// réservation dure le temps de la session de paiement (30 min) ; si le
// paiement n'aboutit pas (abandon, refus, expiration), le stock est rendu.
// Une commande n'est « payée » que sur confirmation vérifiée du prestataire
// (webhook signé, ou lecture directe de la session côté serveur).
// ═══════════════════════════════════════════════════════════════════════

export const SESSION_MINUTES = 31; // minimum Stripe : 30 minutes
export const RESERVATION_MINUTES = 36; // marge au-delà de la session
export const ORDER_TOKEN_PURPOSE = "order-access";

const NUMBER_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function newOrderNumber(): string {
  let out = "BP-";
  for (let i = 0; i < 6; i++) out += NUMBER_ALPHABET[randomInt(NUMBER_ALPHABET.length)];
  return out;
}

export function orderUrl(token: string): string {
  return `${siteUrl()}/commande/suivi/${token}`;
}

export type CheckoutResult =
  | { ok: true; url: string; orderToken: string }
  | {
      ok: false;
      code: "closed" | "invalid" | "unavailable" | "shipping" | "payment_unavailable" | "in_progress" | "already_paid" | "error";
      message: string;
      fieldErrors?: Record<string, string>;
      unavailable?: { productId: string; available: number }[];
      orderToken?: string;
    };

interface LockedProduct {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price_cents: number;
  stock: number;
  status: string;
  category_visible: boolean;
  image_id: string | null;
}

async function moveStock(
  client: Queryable,
  productId: string,
  delta: number,
  reason: "reservation" | "release" | "admin" | "restock" | "late_payment",
  orderId: string | null,
  adminId: string | null = null,
): Promise<number | null> {
  // La contrainte CHECK (stock >= 0) et la condition WHERE empêchent tout stock négatif.
  const row = await queryOne<{ stock: number }>(
    "UPDATE product SET stock = stock + $2 WHERE id = $1 AND stock + $2 >= 0 RETURNING stock",
    [productId, delta],
    client,
  );
  if (!row) return null;
  await query(
    "INSERT INTO stock_movement (product_id, delta, stock_after, reason, order_id, admin_id) VALUES ($1, $2, $3, $4, $5, $6)",
    [productId, delta, row.stock, reason, orderId, adminId],
    client,
  );
  return row.stock;
}

/** Rend le stock d'une commande en attente de paiement (abandon, refus, expiration). Idempotent. */
export async function releaseReservation(orderId: string, client?: PoolClient): Promise<boolean> {
  const run = async (c: PoolClient) => {
    const order = await queryOne<{ status: string }>("SELECT status FROM customer_order WHERE id = $1 FOR UPDATE", [orderId], c);
    if (!order || order.status !== "pending") return false;
    const items = await query<{ product_id: string; quantity: number }>(
      "SELECT product_id, quantity FROM order_item WHERE order_id = $1 AND product_id IS NOT NULL ORDER BY product_id",
      [orderId],
      c,
    );
    for (const item of items) await moveStock(c, item.product_id, item.quantity, "release", orderId);
    await query("UPDATE customer_order SET status = 'expired', expired_at = now(), payment_url = NULL WHERE id = $1", [orderId], c);
    return true;
  };
  return client ? run(client) : transaction(run);
}

/**
 * Clôt une commande en attente : rend la session de paiement inutilisable
 * chez le prestataire, puis libère le stock. Si la cliente a payé entre-temps,
 * la commande est confirmée au lieu d'être annulée.
 */
export async function expirePendingOrder(orderId: string): Promise<"released" | "paid" | "noop"> {
  const order = await queryOne<{ status: string; payment_session_id: string | null }>(
    "SELECT status, payment_session_id FROM customer_order WHERE id = $1",
    [orderId],
  );
  if (!order || order.status !== "pending") return "noop";
  if (order.payment_session_id) {
    const info = await payments().expireCheckout(order.payment_session_id);
    if (info.status === "complete") {
      if (info.paymentStatus === "paid" || info.paymentStatus === "no_payment_required") {
        await transaction((c) => markPaid(c, info));
        return "paid";
      }
      // Paiement différé (virement…) encore en cours : on garde la réservation.
      await query("UPDATE customer_order SET reserved_until = now() + interval '7 days' WHERE id = $1 AND status = 'pending'", [orderId]);
      return "noop";
    }
  }
  return (await releaseReservation(orderId)) ? "released" : "noop";
}

/** Filet de sécurité : libère les réservations dépassées (si un webhook d'expiration s'est perdu). */
export async function sweepExpiredReservations(limit = 20, productIds?: string[]): Promise<number> {
  const rows = await query<{ id: string }>(
    `SELECT o.id FROM customer_order o
     WHERE o.status = 'pending' AND o.reserved_until < now()
       AND ($2::uuid[] IS NULL OR EXISTS (SELECT 1 FROM order_item i WHERE i.order_id = o.id AND i.product_id = ANY($2::uuid[])))
     ORDER BY o.reserved_until LIMIT $1`,
    [limit, productIds ?? null],
  );
  let released = 0;
  for (const r of rows) {
    try {
      if ((await expirePendingOrder(r.id)) === "released") released++;
    } catch (err) {
      await reportEvent("warning", "stock", "Réservation expirée non libérée (nouvel essai plus tard)", { orderId: r.id, error: errorMessage(err) });
    }
  }
  return released;
}

async function orderTokenFromHash(token: string | undefined): Promise<{ id: string; status: string } | null> {
  if (!token || token.length > 100) return null;
  return queryOne("SELECT id, status FROM customer_order WHERE access_token_hash = $1", [tokenHash(token, ORDER_TOKEN_PURPOSE)]);
}

/** Création de la commande + réservation du stock + session de paiement. */
export async function startCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const settings = await loadSettings();
  if (!settings.ordersOpen) {
    return { ok: false, code: "closed", message: settings.closedMessage || "Les commandes sont momentanément en pause. Revenez très vite !" };
  }

  try {
    payments();
  } catch (err) {
    await reportEvent("error", "checkout", "Paiement indisponible (configuration)", { reason: errorMessage(err) });
    return { ok: false, code: "payment_unavailable", message: "Le paiement est momentanément indisponible. Merci de réessayer un peu plus tard." };
  }

  // Double clic / double envoi : même clé = même commande.
  const existing = await queryOne<{ id: string; status: string; payment_url: string | null; access_token_enc: string }>(
    "SELECT id, status, payment_url, access_token_enc FROM customer_order WHERE idempotency_key = $1",
    [input.idempotencyKey],
  );
  if (existing) return resumeExisting(existing);

  // La cliente revient de la page de paiement et modifie sa commande : on libère l'ancienne réservation.
  const previous = await orderTokenFromHash(input.previousOrderToken);
  if (previous?.status === "pending") {
    await expirePendingOrder(previous.id).catch((err) =>
      reportEvent("warning", "checkout", "Ancienne réservation non libérée", { orderId: previous.id, error: errorMessage(err) }),
    );
  }

  const method = await queryOne<{ id: string; name: string; price_cents: number; free_over_cents: number | null; countries: string[]; requires_address: boolean; is_active: boolean }>(
    "SELECT id, name, price_cents, free_over_cents, countries, requires_address, is_active FROM shipping_method WHERE id = $1",
    [input.shippingMethodId],
  );
  if (!method || !method.is_active) return { ok: false, code: "shipping", message: "Ce mode de livraison n'est plus disponible.", fieldErrors: { shippingMethodId: "Choisissez un mode de livraison" } };
  if (!method.countries.includes(input.country)) {
    return { ok: false, code: "shipping", message: "Ce mode de livraison n'est pas disponible pour ce pays.", fieldErrors: { shippingMethodId: "Non disponible pour ce pays" } };
  }
  if (method.requires_address) {
    const errors = addressErrors(input);
    if (Object.keys(errors).length) return { ok: false, code: "invalid", message: "Vérifiez votre adresse de livraison.", fieldErrors: errors };
  }

  const productIds = input.items.map((i) => i.productId);
  // Des réservations abandonnées bloquent peut-être ces produits : on les libère d'abord.
  await sweepExpiredReservations(5, productIds).catch(() => undefined);

  const token = randomToken();
  let created: { orderId: string; number: string; lines: { name: string; unitAmountCents: number; quantity: number; imageId: string | null }[]; shippingCents: number };
  try {
    created = await transaction(async (c) => {
      // Verrouillage des produits dans un ordre fixe (évite les interblocages).
      const products = await query<LockedProduct>(
        `SELECT p.id, p.name, p.slug, p.sku, p.price_cents, p.stock, p.status, c.is_visible AS category_visible,
                (SELECT i.id FROM image i WHERE i.product_id = p.id AND i.kind = 'product' ORDER BY i.position, i.created_at LIMIT 1) AS image_id
         FROM product p JOIN category c ON c.id = p.category_id
         WHERE p.id = ANY($1::uuid[]) ORDER BY p.id FOR UPDATE OF p`,
        [productIds],
        c,
      );
      const unavailable: { productId: string; available: number }[] = [];
      for (const item of input.items) {
        const p = products.find((x) => x.id === item.productId);
        const sellable = p && p.status === "published" && p.category_visible;
        if (!sellable) unavailable.push({ productId: item.productId, available: 0 });
        else if (p.stock < item.quantity) unavailable.push({ productId: item.productId, available: p.stock });
      }
      if (unavailable.length) throw new UnavailableError(unavailable);

      const lines = input.items.map((item) => {
        const p = products.find((x) => x.id === item.productId)!;
        return { product: p, quantity: item.quantity };
      });
      // Prix OFFICIELS lus en base — jamais ceux du navigateur.
      const totals = computeTotals(
        lines.map((l) => ({ unitPriceCents: l.product.price_cents, quantity: l.quantity })),
        { priceCents: method.price_cents, freeOverCents: method.free_over_cents },
        { regime: settings.vatRegime, rateBp: settings.vatRateBp },
      );

      let orderId = "";
      let number = "";
      for (let attempt = 0; attempt < 5 && !orderId; attempt++) {
        number = newOrderNumber();
        await c.query("SAVEPOINT order_number");
        try {
          const row = await queryOne<{ id: string }>(
            `INSERT INTO customer_order (
               number, access_token_hash, access_token_enc, idempotency_key, status,
               email, first_name, last_name, phone,
               ship_line1, ship_line2, ship_postal_code, ship_city, ship_country,
               shipping_method_id, shipping_method_name, shipping_requires_address,
               subtotal_cents, shipping_cents, discount_cents, total_cents,
               vat_regime, vat_rate_bp, vat_cents, payment_provider, reserved_until)
             VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,0,$19,$20,$21,$22,$23, now() + make_interval(mins => $24))
             RETURNING id`,
            [
              number,
              tokenHash(token, ORDER_TOKEN_PURPOSE),
              encrypt(token, ORDER_TOKEN_PURPOSE),
              input.idempotencyKey,
              input.email,
              input.firstName,
              input.lastName,
              input.phone || null,
              method.requires_address ? input.line1 : null,
              method.requires_address ? input.line2 || null : null,
              method.requires_address ? input.postalCode.toUpperCase() : null,
              method.requires_address ? input.city : null,
              input.country,
              method.id,
              method.name,
              method.requires_address,
              totals.subtotalCents,
              totals.shippingCents,
              totals.totalCents,
              settings.vatRegime,
              settings.vatRegime === "assujetti" ? settings.vatRateBp : null,
              totals.vatCents,
              payments().name,
              RESERVATION_MINUTES,
            ],
            c,
          );
          orderId = row!.id;
          await c.query("RELEASE SAVEPOINT order_number");
        } catch (err) {
          await c.query("ROLLBACK TO SAVEPOINT order_number");
          if (isUniqueViolation(err, "customer_order_number_key")) continue;
          throw err;
        }
      }
      if (!orderId) throw new Error("Impossible d'attribuer un numéro de commande");

      for (const l of lines) {
        await query(
          `INSERT INTO order_item (order_id, product_id, product_name, product_sku, product_slug, image_id, unit_price_cents, quantity, line_total_cents)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [orderId, l.product.id, l.product.name, l.product.sku, l.product.slug, l.product.image_id, l.product.price_cents, l.quantity, l.product.price_cents * l.quantity],
          c,
        );
        const after = await moveStock(c, l.product.id, -l.quantity, "reservation", orderId);
        if (after === null) throw new UnavailableError([{ productId: l.product.id, available: l.product.stock }]);
      }
      return {
        orderId,
        number,
        shippingCents: totals.shippingCents,
        lines: lines.map((l) => ({ name: l.product.name, unitAmountCents: l.product.price_cents, quantity: l.quantity, imageId: l.product.image_id })),
      };
    });
  } catch (err) {
    if (err instanceof UnavailableError) {
      return { ok: false, code: "unavailable", message: "Un article de votre panier n'est plus disponible dans la quantité demandée.", unavailable: err.items };
    }
    if (err instanceof PaymentUnavailableError) {
      await reportEvent("error", "checkout", "Paiement indisponible (configuration)", { reason: err.message });
      return { ok: false, code: "payment_unavailable", message: "Le paiement est momentanément indisponible. Merci de réessayer un peu plus tard." };
    }
    if (isUniqueViolation(err, "customer_order_idempotency_key_key")) {
      // Deux envois simultanés du même formulaire : l'autre requête crée la commande.
      return { ok: false, code: "in_progress", message: "Votre commande est en cours de création…" };
    }
    throw err;
  }

  // Création de la session de paiement, hors transaction (appel réseau).
  try {
    const session = await payments().createCheckout({
      orderId: created.orderId,
      orderNumber: created.number,
      email: input.email,
      lines: created.lines.map((l) => ({ name: l.name, unitAmountCents: l.unitAmountCents, quantity: l.quantity, imageUrl: l.imageId ? ogImageUrl({ id: l.imageId }) : undefined })),
      shipping: { name: method.name, amountCents: created.shippingCents },
      successUrl: `${siteUrl()}/commande/suivi/${token}?merci=1`,
      cancelUrl: `${siteUrl()}/commande?retour=1`,
      expiresAt: new Date(Date.now() + SESSION_MINUTES * 60_000),
      allowPromotionCodes: settings.allowPromotionCodes,
    });
    await query("UPDATE customer_order SET payment_session_id = $2, payment_url = $3 WHERE id = $1", [created.orderId, session.id, session.url]);
    return { ok: true, url: session.url, orderToken: token };
  } catch (err) {
    await releaseReservation(created.orderId).catch(() => undefined);
    await reportEvent("error", "checkout", "Création de la session de paiement impossible", { orderId: created.orderId, error: errorMessage(err) });
    return { ok: false, code: "payment_unavailable", message: "Le paiement est momentanément indisponible. Votre panier est conservé : merci de réessayer dans quelques minutes." };
  }
}

async function resumeExisting(existing: { id: string; status: string; payment_url: string | null; access_token_enc: string }): Promise<CheckoutResult> {
  const token = decrypt(existing.access_token_enc, ORDER_TOKEN_PURPOSE);
  if (existing.status === "pending") {
    if (existing.payment_url) return { ok: true, url: existing.payment_url, orderToken: token };
    return { ok: false, code: "in_progress", message: "Votre commande est en cours de création…" };
  }
  if (existing.status === "expired") {
    return { ok: false, code: "error", message: "Cette tentative de paiement a expiré. Merci de valider à nouveau votre commande." };
  }
  return { ok: false, code: "already_paid", message: "Cette commande est déjà payée.", orderToken: token };
}

class UnavailableError extends Error {
  constructor(public items: { productId: string; available: number }[]) {
    super("unavailable");
  }
}

// ───────────────────────── Paiement confirmé ─────────────────────────

async function nextInvoiceNumber(c: Queryable): Promise<string> {
  const year = Number(new Intl.DateTimeFormat("fr-FR", { year: "numeric", timeZone: "Europe/Paris" }).format(new Date()));
  const row = await queryOne<{ last_number: number }>(
    `INSERT INTO invoice_counter (year, last_number) VALUES ($1, 1)
     ON CONFLICT (year) DO UPDATE SET last_number = invoice_counter.last_number + 1 RETURNING last_number`,
    [year],
    c,
  );
  return `F${year}-${String(row!.last_number).padStart(4, "0")}`;
}

export async function enqueueEmail(c: Queryable, orderId: string | null, kind: string, recipient: string, payload: Record<string, unknown> = {}) {
  if (!recipient) return;
  await query(
    `INSERT INTO email_outbox (order_id, kind, recipient, payload) VALUES ($1, $2, $3, $4)
     ON CONFLICT (order_id, kind) WHERE order_id IS NOT NULL DO NOTHING`,
    [orderId, kind, recipient, payload],
    c,
  );
}

/**
 * Passe une commande en « payée ». Idempotent : appelé plusieurs fois pour la
 * même session (webhook rejoué, page de confirmation rafraîchie…), l'effet
 * n'a lieu qu'une fois — un seul changement de statut, un seul e-mail.
 */
export async function markPaid(c: PoolClient, session: CheckoutSessionInfo): Promise<"paid" | "already" | "unknown"> {
  const order = await queryOne<{
    id: string;
    status: string;
    email: string;
    payment_session_id: string | null;
    subtotal_cents: number;
    shipping_cents: number;
    total_cents: number;
    vat_regime: string | null;
    vat_rate_bp: number | null;
  }>(
    `SELECT id, status, email, payment_session_id, subtotal_cents, shipping_cents, total_cents, vat_regime, vat_rate_bp
     FROM customer_order WHERE payment_session_id = $1 FOR UPDATE`,
    [session.id],
    c,
  );
  if (!order) {
    await reportEvent("error", "payment", "Paiement reçu pour une session inconnue", { sessionId: session.id, orderId: session.orderId }, c);
    return "unknown";
  }
  if (order.status !== "pending" && order.status !== "expired") return "already";

  const attention: string[] = [];
  if (order.status === "expired") {
    // Paiement arrivé après la libération du stock : on tente de le reprendre.
    const items = await query<{ product_id: string; quantity: number }>(
      "SELECT product_id, quantity FROM order_item WHERE order_id = $1 AND product_id IS NOT NULL ORDER BY product_id",
      [order.id],
      c,
    );
    for (const item of items) {
      await query("SELECT 1 FROM product WHERE id = $1 FOR UPDATE", [item.product_id], c);
      const ok = await moveStock(c, item.product_id, -item.quantity, "late_payment", order.id);
      if (ok === null) attention.push("Paiement reçu après expiration : un article n'est plus en stock. Contactez la cliente (remboursement ou délai).");
    }
  }
  const provider = payments();
  if (session.livemode !== provider.livemode) attention.push("Paiement reçu dans un mode Stripe différent (test / production) de celui du site.");

  let discount = 0;
  let total = order.total_cents;
  if (session.amountTotalCents !== null) {
    if (session.amountSubtotalCents !== null && session.amountSubtotalCents !== order.subtotal_cents) {
      attention.push(`Sous-total payé (${session.amountSubtotalCents / 100} €) différent du sous-total attendu (${order.subtotal_cents / 100} €).`);
    }
    discount = order.subtotal_cents + order.shipping_cents - session.amountTotalCents;
    if (discount < 0) {
      attention.push(`Montant payé (${session.amountTotalCents / 100} €) supérieur au montant attendu.`);
      discount = 0;
    }
    total = order.subtotal_cents + order.shipping_cents - discount;
  }
  const vatCents = order.vat_regime === "assujetti" && order.vat_rate_bp !== null ? includedVat(total, order.vat_rate_bp) : null;
  const invoice = await nextInvoiceNumber(c);
  await query(
    `UPDATE customer_order SET status = 'paid', paid_at = now(), reserved_until = NULL, payment_url = NULL,
       payment_intent_id = $2, payment_livemode = $3, discount_cents = $4, total_cents = $5, vat_cents = $6,
       invoice_number = $7, needs_attention = $8
     WHERE id = $1`,
    [order.id, session.paymentIntentId, session.livemode, discount, total, vatCents, invoice, attention.length ? attention.join(" ").slice(0, 500) : null],
    c,
  );
  const settings = await loadSettings(c);
  await enqueueEmail(c, order.id, "order_confirmation", order.email);
  // La créatrice est toujours prévenue : adresse dédiée, sinon contact, sinon e-mail du compte administrateur.
  const adminEmail = settings.notificationEmail || settings.contactEmail || (await queryOne<{ email: string }>("SELECT email FROM admin_user ORDER BY created_at LIMIT 1", [], c))?.email;
  if (adminEmail) await enqueueEmail(c, order.id, "admin_new_order", adminEmail);
  else await reportEvent("warning", "email", "Nouvelle commande : aucune adresse pour prévenir la créatrice", { orderId: order.id }, c);
  if (attention.length) await reportEvent("warning", "payment", "Commande payée à vérifier", { orderId: order.id, reason: attention.join(" ") }, c);
  return "paid";
}

/** Traitement d'un événement de paiement vérifié. Idempotent (un même événement n'est traité qu'une fois). */
export async function handlePaymentEvent(event: PaymentEvent): Promise<"processed" | "duplicate" | "ignored"> {
  if (event.kind === "ignored") return "ignored";
  return transaction(async (c) => {
    const inserted = await queryOne<{ id: string }>(
      "INSERT INTO payment_event (id, type) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING RETURNING id",
      [event.id, event.kind],
      c,
    );
    if (!inserted) return "duplicate";
    switch (event.kind) {
      case "checkout_completed":
      case "async_payment_succeeded": {
        if (event.session.paymentStatus === "paid" || event.session.paymentStatus === "no_payment_required") {
          await markPaid(c, event.session);
        } else {
          // Paiement différé : on prolonge la réservation en attendant la confirmation.
          await query(
            "UPDATE customer_order SET reserved_until = now() + interval '7 days' WHERE payment_session_id = $1 AND status = 'pending'",
            [event.session.id],
            c,
          );
        }
        break;
      }
      case "checkout_expired":
      case "async_payment_failed": {
        const order = await queryOne<{ id: string }>("SELECT id FROM customer_order WHERE payment_session_id = $1", [event.session.id], c);
        if (order) await releaseReservation(order.id, c);
        break;
      }
      case "charge_refunded": {
        const order = await queryOne<{ id: string; status: string; email: string; total_cents: number; refunded_cents: number }>(
          "SELECT id, status, email, total_cents, refunded_cents FROM customer_order WHERE payment_intent_id = $1 FOR UPDATE",
          [event.paymentIntentId],
          c,
        );
        if (!order) break;
        const refunded = Math.min(event.amountRefundedCents, order.total_cents);
        if (event.fullyRefunded && !["cancelled", "refunded"].includes(order.status)) {
          // Remboursement fait directement depuis Stripe : on synchronise la commande.
          await query("UPDATE customer_order SET status = 'refunded', refunded_at = now(), refunded_cents = $2 WHERE id = $1", [order.id, refunded], c);
          await enqueueEmail(c, order.id, "order_refunded", order.email);
        } else if (refunded > order.refunded_cents) {
          await query("UPDATE customer_order SET refunded_cents = $2 WHERE id = $1", [order.id, refunded], c);
        }
        break;
      }
    }
    await query("UPDATE payment_event SET order_id = (SELECT id FROM customer_order WHERE payment_session_id = $2 OR payment_intent_id = $3 LIMIT 1) WHERE id = $1", [
      event.id,
      "session" in event ? event.session.id : null,
      "paymentIntentId" in event ? event.paymentIntentId : null,
    ], c);
    return "processed";
  });
}

/**
 * Au retour de la page de paiement, le webhook peut avoir quelques secondes
 * de retard : on interroge directement le prestataire (côté serveur) pour
 * afficher tout de suite la bonne confirmation.
 */
export async function syncPendingOrder(orderId: string): Promise<void> {
  const order = await queryOne<{ status: string; payment_session_id: string | null }>(
    "SELECT status, payment_session_id FROM customer_order WHERE id = $1",
    [orderId],
  );
  if (!order || order.status !== "pending" || !order.payment_session_id) return;
  const info = await payments().retrieveCheckout(order.payment_session_id);
  if (info.status === "complete" && (info.paymentStatus === "paid" || info.paymentStatus === "no_payment_required")) {
    await transaction((c) => markPaid(c, info));
  }
}

// ───────────────────────── Lecture d'une commande (cliente) ─────────────────────────

export interface PublicOrder {
  id: string;
  number: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  firstName: string;
  lastName: string;
  email: string;
  items: { name: string; slug: string; quantity: number; unitPriceCents: number; lineTotalCents: number; imageId: string | null }[];
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  refundedCents: number;
  shippingMethodName: string;
  requiresAddress: boolean;
  address: { line1: string | null; line2: string | null; postalCode: string | null; city: string | null; country: string | null };
  trackingNumber: string | null;
  trackingUrl: string | null;
  invoiceNumber: string | null;
  vatRegime: string | null;
  vatCents: number | null;
  anonymized: boolean;
}

export async function findOrderByToken(token: string): Promise<PublicOrder | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  return loadPublicOrder("access_token_hash = $1", tokenHash(token, ORDER_TOKEN_PURPOSE));
}

export async function loadPublicOrder(condition: "access_token_hash = $1" | "id = $1", value: string, client?: Queryable): Promise<PublicOrder | null> {
  const o = await queryOne<Record<string, unknown>>(`SELECT * FROM customer_order WHERE ${condition}`, [value], client);
  if (!o) return null;
  const items = await query<{ product_name: string; product_slug: string; quantity: number; unit_price_cents: number; line_total_cents: number; image_id: string | null }>(
    "SELECT product_name, product_slug, quantity, unit_price_cents, line_total_cents, image_id FROM order_item WHERE order_id = $1 ORDER BY product_name",
    [o.id],
    client,
  );
  const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
  return {
    id: o.id as string,
    number: o.number as string,
    status: o.status as string,
    createdAt: iso(o.created_at)!,
    paidAt: iso(o.paid_at),
    shippedAt: iso(o.shipped_at),
    firstName: o.first_name as string,
    lastName: o.last_name as string,
    email: o.email as string,
    items: items.map((i) => ({ name: i.product_name, slug: i.product_slug, quantity: i.quantity, unitPriceCents: i.unit_price_cents, lineTotalCents: i.line_total_cents, imageId: i.image_id })),
    subtotalCents: o.subtotal_cents as number,
    shippingCents: o.shipping_cents as number,
    discountCents: o.discount_cents as number,
    totalCents: o.total_cents as number,
    refundedCents: o.refunded_cents as number,
    shippingMethodName: o.shipping_method_name as string,
    requiresAddress: o.shipping_requires_address as boolean,
    address: {
      line1: (o.ship_line1 as string) ?? null,
      line2: (o.ship_line2 as string) ?? null,
      postalCode: (o.ship_postal_code as string) ?? null,
      city: (o.ship_city as string) ?? null,
      country: (o.ship_country as string) ?? null,
    },
    trackingNumber: (o.tracking_number as string) ?? null,
    trackingUrl: (o.tracking_url as string) ?? null,
    invoiceNumber: (o.invoice_number as string) ?? null,
    vatRegime: (o.vat_regime as string) ?? null,
    vatCents: (o.vat_cents as number) ?? null,
    anonymized: Boolean(o.anonymized_at),
  };
}

/** Annule une tentative de paiement abandonnée par la cliente (retour depuis la page de paiement). */
export async function cancelPendingByToken(token: string): Promise<boolean> {
  const order = await orderTokenFromHash(token);
  if (!order || order.status !== "pending") return false;
  return (await expirePendingOrder(order.id)) === "released";
}

export function newIdempotencyKey(): string {
  return randomUUID();
}
