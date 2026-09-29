import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { activeShipping, checkoutInput, closePool, makeProduct, resetDatabase, sql, stockOf } from "./helpers";

import { checkoutSchema } from "../src/lib/validation";
import { cancelPendingByToken, findOrderByToken, handlePaymentEvent, startCheckout, sweepExpiredReservations, syncPendingOrder } from "../src/lib/server/orders";
import { payments } from "../src/lib/server/payments";
import type { FakeProvider } from "../src/lib/server/payments/fake";
import { refundOrder, setOrderStatus } from "../src/lib/server/admin-orders";
import { salesStats } from "../src/lib/server/admin-queries";
import { processOutbox } from "../src/lib/server/email/outbox";
import { sent } from "../src/lib/server/email/provider";

const fake = () => payments() as FakeProvider;

async function checkout(shipId: string, items: { productId: string; quantity: number }[], extra: Record<string, unknown> = {}) {
  return startCheckout(checkoutSchema.parse(checkoutInput(shipId, items, extra)));
}

async function orderBySession(sessionId: string) {
  const [o] = await sql<{ id: string; status: string; invoice_number: string | null; total_cents: number }>(
    "SELECT id, status, invoice_number, total_cents FROM customer_order WHERE payment_session_id = $1",
    [sessionId],
  );
  return o;
}

function sessionIdFrom(url: string) {
  return url.split("/").pop()!;
}

let shipId = "";
let pickupId = "";

before(async () => {
  await resetDatabase();
  ({ shipId, pickupId } = await activeShipping());
  await sql("UPDATE shop_settings SET notification_email = 'atelier@exemple.fr', contact_email = 'contact@exemple.fr'");
});
after(closePool);
beforeEach(() => {
  sent.length = 0;
});

describe("prix calculés par le serveur", () => {
  test("le navigateur ne peut pas envoyer de prix (champ refusé)", () => {
    const input = { ...checkoutInput(shipId, [{ productId: "00000000-0000-4000-8000-000000000000", quantity: 1 }]), priceCents: 100 };
    assert.equal(checkoutSchema.safeParse(input).success, false);
    const withLinePrice = checkoutInput(shipId, [{ productId: "00000000-0000-4000-8000-000000000000", quantity: 1, price: 1 } as never]);
    // Les champs inconnus d'une ligne sont ignorés : seul l'identifiant et la quantité sont lus.
    const parsed = checkoutSchema.parse(withLinePrice);
    assert.deepEqual(Object.keys(parsed.items[0]).sort(), ["productId", "quantity"]);
  });

  test("quantité négative, nulle ou décimale refusée", () => {
    for (const quantity of [-1, 0, 1.5, 11]) {
      assert.equal(checkoutSchema.safeParse(checkoutInput(shipId, [{ productId: "00000000-0000-4000-8000-000000000000", quantity }])).success, false, `quantité ${quantity}`);
    }
  });

  test("achat normal : total = prix en base + livraison, stock réservé", async () => {
    const id = await makeProduct({ price: 2400, stock: 3 });
    const res = await checkout(shipId, [{ productId: id, quantity: 2 }]);
    assert.equal(res.ok, true);
    if (!res.ok) return;
    const order = await orderBySession(sessionIdFrom(res.url));
    assert.equal(order.status, "pending");
    assert.equal(order.total_cents, 2400 * 2 + 490);
    assert.equal(await stockOf(id), 1);
    const request = fake().requestOf(sessionIdFrom(res.url));
    assert.equal(request.lines[0].unitAmountCents, 2400);
  });

  test("retrait en main propre : aucune adresse exigée, livraison gratuite", async () => {
    const id = await makeProduct({ price: 1500 });
    const res = await checkout(pickupId, [{ productId: id, quantity: 1 }], { line1: "", postalCode: "", city: "" });
    assert.equal(res.ok, true);
    if (!res.ok) return;
    const order = await orderBySession(sessionIdFrom(res.url));
    assert.equal(order.total_cents, 1500);
  });

  test("adresse incomplète ou code postal faux : erreurs par champ", async () => {
    const id = await makeProduct();
    const res = await checkout(shipId, [{ productId: id, quantity: 1 }], { postalCode: "2250" });
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.ok(res.fieldErrors?.postalCode);
    assert.equal(await stockOf(id), 3, "aucun stock réservé");
  });
});

describe("stock", () => {
  test("produit épuisé : commande impossible", async () => {
    const id = await makeProduct({ stock: 0 });
    const res = await checkout(shipId, [{ productId: id, quantity: 1 }]);
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.code, "unavailable");
  });

  test("brouillon ou archivé : jamais achetable, même en appelant l'API directement", async () => {
    for (const status of ["draft", "archived"]) {
      const id = await makeProduct({ status });
      const res = await checkout(shipId, [{ productId: id, quantity: 1 }]);
      assert.equal(res.ok, false, status);
    }
  });

  test("dernière pièce, deux clientes simultanées : une seule obtient la pièce", async () => {
    const id = await makeProduct({ stock: 1 });
    const results = await Promise.all(Array.from({ length: 6 }, () => checkout(shipId, [{ productId: id, quantity: 1 }])));
    assert.equal(results.filter((r) => r.ok).length, 1);
    assert.equal(await stockOf(id), 0);
    const [{ n }] = await sql<{ n: string }>("SELECT count(*) AS n FROM customer_order o JOIN order_item i ON i.order_id = o.id WHERE i.product_id = $1", [id]);
    assert.equal(Number(n), 1);
  });

  test("double clic (même clé) : une seule commande, une seule réservation", async () => {
    const id = await makeProduct({ stock: 5 });
    const input = checkoutSchema.parse(checkoutInput(shipId, [{ productId: id, quantity: 1 }]));
    const [a, b] = await Promise.all([startCheckout(input), startCheckout(input)]);
    const c = await startCheckout(input);
    assert.ok(a.ok || b.ok);
    assert.equal(c.ok, true);
    if (c.ok && a.ok) assert.equal(c.url, a.url);
    assert.equal(await stockOf(id), 4);
  });

  test("paiement abandonné (retour arrière) : stock rendu immédiatement", async () => {
    const id = await makeProduct({ stock: 1 });
    const res = await checkout(shipId, [{ productId: id, quantity: 1 }]);
    assert.ok(res.ok);
    if (!res.ok) return;
    assert.equal(await stockOf(id), 0);
    assert.equal(await cancelPendingByToken(res.orderToken), true);
    assert.equal(await stockOf(id), 1);
    const order = await orderBySession(sessionIdFrom(res.url));
    assert.equal(order.status, "expired");
    // Rejouer l'annulation ne rend pas le stock deux fois.
    assert.equal(await cancelPendingByToken(res.orderToken), false);
    assert.equal(await stockOf(id), 1);
  });

  test("nouvelle tentative avec l'ancien jeton : l'ancienne réservation est libérée", async () => {
    const id = await makeProduct({ stock: 1 });
    const first = await checkout(shipId, [{ productId: id, quantity: 1 }]);
    assert.ok(first.ok);
    if (!first.ok) return;
    const second = await checkout(shipId, [{ productId: id, quantity: 1 }], { previousOrderToken: first.orderToken });
    assert.equal(second.ok, true, "la cliente peut reprendre sa propre dernière pièce");
  });

  test("réservation expirée sans webhook : libérée par le filet de sécurité", async () => {
    const id = await makeProduct({ stock: 1 });
    const res = await checkout(shipId, [{ productId: id, quantity: 1 }]);
    assert.ok(res.ok);
    await sql("UPDATE customer_order SET reserved_until = now() - interval '1 minute' WHERE status = 'pending'");
    await sweepExpiredReservations(100);
    assert.equal(await stockOf(id), 1);
  });
});

describe("webhooks de paiement", () => {
  test("paiement réussi : commande payée, numéro de facture, 2 e-mails ; webhook rejoué sans effet", async () => {
    const id = await makeProduct({ stock: 2, name: "Fleurs <script>alert(1)</script>" });
    const res = await checkout(shipId, [{ productId: id, quantity: 1 }]);
    assert.ok(res.ok);
    if (!res.ok) return;
    const sessionId = sessionIdFrom(res.url);
    const session = fake().pay(sessionId);
    const event = { id: "evt_1", kind: "checkout_completed" as const, livemode: false, session };
    assert.equal(await handlePaymentEvent(event), "processed");
    assert.equal(await handlePaymentEvent(event), "duplicate");
    assert.equal(await handlePaymentEvent({ ...event, id: "evt_1bis" }), "processed");
    const order = await orderBySession(sessionId);
    assert.equal(order.status, "paid");
    assert.match(order.invoice_number!, /^F\d{4}-\d{4}$/);
    assert.equal(await stockOf(id), 1, "stock décrémenté une seule fois");
    const [{ n }] = await sql<{ n: string }>("SELECT count(*) AS n FROM email_outbox WHERE order_id = $1", [order.id]);
    assert.equal(Number(n), 2);
    await processOutbox();
    await processOutbox();
    assert.equal(sent.length, 2, "un e-mail cliente + un e-mail créatrice, pas plus");
    for (const m of sent) {
      assert.ok(!m.html.includes("<script>"), "contenu échappé");
      assert.ok(m.html.includes("&lt;script&gt;"));
    }
    const customerMail = sent.find((m) => m.to === "cliente@exemple.fr")!;
    assert.ok(customerMail.html.includes(`/commande/suivi/${res.orderToken}`));
  });

  test("retour sur la page de confirmation avant le webhook : confirmation immédiate et cohérente", async () => {
    const id = await makeProduct();
    const res = await checkout(shipId, [{ productId: id, quantity: 1 }]);
    assert.ok(res.ok);
    if (!res.ok) return;
    fake().pay(sessionIdFrom(res.url));
    const before = await findOrderByToken(res.orderToken);
    assert.equal(before?.status, "pending");
    await syncPendingOrder(before!.id);
    await syncPendingOrder(before!.id); // rafraîchissement
    const afterSync = await findOrderByToken(res.orderToken);
    assert.equal(afterSync?.status, "paid");
    // Le webhook arrive ensuite : aucun doublon.
    await handlePaymentEvent({ id: "evt_late", kind: "checkout_completed", livemode: false, session: await fake().retrieveCheckout(sessionIdFrom(res.url)) });
    const [{ n }] = await sql<{ n: string }>("SELECT count(*) AS n FROM email_outbox WHERE order_id = $1 AND kind = 'order_confirmation'", [before!.id]);
    assert.equal(Number(n), 1);
  });

  test("session expirée (webhook) : stock rendu ; paiement tardif malgré tout : commande sauvée ou signalée", async () => {
    const id = await makeProduct({ stock: 1 });
    const res = await checkout(shipId, [{ productId: id, quantity: 1 }]);
    assert.ok(res.ok);
    if (!res.ok) return;
    const sessionId = sessionIdFrom(res.url);
    const info = await fake().retrieveCheckout(sessionId);
    await handlePaymentEvent({ id: "evt_exp", kind: "checkout_expired", livemode: false, session: { ...info, status: "expired" } });
    assert.equal(await stockOf(id), 1);
    // Une autre cliente achète la pièce entre-temps.
    const other = await checkout(shipId, [{ productId: id, quantity: 1 }], { email: "autre@exemple.fr" });
    assert.ok(other.ok);
    const paid = fake().pay(sessionId);
    await handlePaymentEvent({ id: "evt_latepay", kind: "checkout_completed", livemode: false, session: paid });
    const [order] = await sql<{ status: string; needs_attention: string | null }>("SELECT status, needs_attention FROM customer_order WHERE payment_session_id = $1", [sessionId]);
    assert.equal(order.status, "paid", "l'argent a été encaissé : la commande existe");
    assert.ok(order.needs_attention, "et elle est signalée à la créatrice");
    assert.equal(await stockOf(id), 0, "jamais de stock négatif");
  });

  test("paiement refusé / échoué : rien n'est payé, stock rendu", async () => {
    const id = await makeProduct({ stock: 1 });
    const res = await checkout(shipId, [{ productId: id, quantity: 1 }]);
    assert.ok(res.ok);
    if (!res.ok) return;
    const info = await fake().retrieveCheckout(sessionIdFrom(res.url));
    await handlePaymentEvent({ id: "evt_fail", kind: "async_payment_failed", livemode: false, session: info });
    assert.equal(await stockOf(id), 1);
    assert.equal((await orderBySession(info.id)).status, "expired");
  });

  test("faux webhook (signature invalide) refusé", async () => {
    const body = JSON.stringify({ id: "evt_forged", kind: "checkout_completed", livemode: false, session: {} });
    await assert.rejects(() => fake().parseWebhook(body, "0".repeat(64)));
    await assert.rejects(() => fake().parseWebhook(body, null));
  });

  test("vraie vérification de signature Stripe", async () => {
    const Stripe = (await import("stripe")).default;
    const { StripeProvider } = await import("../src/lib/server/payments/stripe");
    const secret = "whsec_test_secret";
    const provider = new StripeProvider("sk_test_x", secret, "test");
    const payload = JSON.stringify({ id: "evt_s", object: "event", type: "customer.created", livemode: false, data: { object: {} } });
    const stripe = new Stripe("sk_test_x");
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const ok = await provider.parseWebhook(payload, header);
    assert.equal(ok.kind, "ignored");
    const forged = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_autre" });
    await assert.rejects(() => provider.parseWebhook(payload, forged));
    await assert.rejects(() => provider.parseWebhook(payload.replace("customer", "charge"), header), "contenu modifié");
  });
});

describe("commandes côté créatrice", () => {
  async function paidOrder(stock = 2) {
    const id = await makeProduct({ stock });
    const res = await checkout(shipId, [{ productId: id, quantity: 1 }]);
    assert.ok(res.ok);
    if (!res.ok) throw new Error();
    const session = fake().pay(sessionIdFrom(res.url));
    await handlePaymentEvent({ id: `evt_${session.id}`, kind: "checkout_completed", livemode: false, session });
    const order = await orderBySession(session.id);
    return { productId: id, orderId: order.id };
  }

  test("préparation → expédition : un seul e-mail d'expédition, transitions contrôlées", async () => {
    const { orderId } = await paidOrder();
    const admin = null as unknown as string;
    assert.equal((await setOrderStatus(orderId, "completed", admin)).ok, false, "on ne saute pas l'expédition");
    assert.equal((await setOrderStatus(orderId, "preparing", admin)).ok, true);
    assert.equal((await setOrderStatus(orderId, "shipped", admin, { trackingUrl: "javascript:alert(1)" })).ok, false);
    assert.equal((await setOrderStatus(orderId, "shipped", admin, { trackingNumber: "6A123", trackingUrl: "https://suivi.exemple/6A123" })).ok, true);
    await setOrderStatus(orderId, "preparing", admin);
    await setOrderStatus(orderId, "shipped", admin);
    const [{ n }] = await sql<{ n: string }>("SELECT count(*) AS n FROM email_outbox WHERE order_id = $1 AND kind = 'order_shipped'", [orderId]);
    assert.equal(Number(n), 1);
  });

  test("annulation : remboursement unique même en double clic, stock rendu une fois", async () => {
    const { orderId, productId } = await paidOrder(2);
    assert.equal(await stockOf(productId), 1);
    const [a, b] = await Promise.all([
      refundOrder(orderId, null as unknown as string, { restock: true, cancel: true }),
      refundOrder(orderId, null as unknown as string, { restock: true, cancel: true }),
    ]);
    assert.ok(a.ok && b.ok);
    assert.equal(await stockOf(productId), 2);
    const [o] = await sql<{ status: string; refunded_cents: number; total_cents: number }>("SELECT status, refunded_cents, total_cents FROM customer_order WHERE id = $1", [orderId]);
    assert.equal(o.status, "cancelled");
    assert.equal(o.refunded_cents, o.total_cents);
    // Le webhook de remboursement de Stripe arrive ensuite : aucun effet de plus.
    const [{ payment_intent_id }] = await sql<{ payment_intent_id: string }>("SELECT payment_intent_id FROM customer_order WHERE id = $1", [orderId]);
    await handlePaymentEvent({ id: "evt_ref", kind: "charge_refunded", livemode: false, paymentIntentId: payment_intent_id, amountRefundedCents: o.total_cents, fullyRefunded: true });
    const [again] = await sql<{ status: string }>("SELECT status FROM customer_order WHERE id = $1", [orderId]);
    assert.equal(again.status, "cancelled");
  });

  test("remboursement fait directement dans Stripe : la commande est synchronisée", async () => {
    const { orderId } = await paidOrder();
    await setOrderStatus(orderId, "shipped", null as unknown as string);
    const [o] = await sql<{ payment_intent_id: string; total_cents: number }>("SELECT payment_intent_id, total_cents FROM customer_order WHERE id = $1", [orderId]);
    await handlePaymentEvent({ id: "evt_dash", kind: "charge_refunded", livemode: false, paymentIntentId: o.payment_intent_id, amountRefundedCents: o.total_cents, fullyRefunded: true });
    const [after] = await sql<{ status: string }>("SELECT status FROM customer_order WHERE id = $1", [orderId]);
    assert.equal(after.status, "refunded");
  });

  test("lien de commande : jeton exact obligatoire", async () => {
    assert.equal(await findOrderByToken("abc"), null);
    assert.equal(await findOrderByToken("A".repeat(43)), null);
    assert.equal(await findOrderByToken("../../etc/passwd"), null);
  });

  test("les numéros de commande ne sont pas séquentiels", async () => {
    const rows = await sql<{ number: string }>("SELECT number FROM customer_order");
    assert.ok(rows.length > 5);
    for (const r of rows) assert.match(r.number, /^BP-[0-9A-Z]{6}$/);
    assert.equal(new Set(rows.map((r) => r.number)).size, rows.length);
  });

  test("numéros de facture continus, sans trou", async () => {
    const rows = await sql<{ invoice_number: string }>("SELECT invoice_number FROM customer_order WHERE invoice_number IS NOT NULL ORDER BY invoice_number");
    const numbers = rows.map((r) => Number(r.invoice_number.split("-")[1]));
    numbers.forEach((n, i) => assert.equal(n, i + 1));
  });

  test("tableau de bord : ventes nettes, périodes comparées, clientes fidèles", async () => {
    async function paid(email: string) {
      const id = await makeProduct({ stock: 3, price: 2000 });
      const res = await checkout(shipId, [{ productId: id, quantity: 1 }], { email });
      assert.ok(res.ok);
      if (!res.ok) throw new Error();
      const session = fake().pay(sessionIdFrom(res.url));
      await handlePaymentEvent({ id: `evt_${session.id}`, kind: "checkout_completed", livemode: false, session });
      return orderBySession(session.id);
    }
    const before = await salesStats("30j");
    const kept = await paid("fidele@exemple.fr");
    const cancelled = await paid("annulee@exemple.fr");
    await refundOrder(cancelled.id, null as unknown as string, { restock: true, cancel: true });
    const old = await paid("fidele@exemple.fr");
    await sql("UPDATE customer_order SET paid_at = now() - interval '40 days' WHERE id = $1", [old.id]);
    const after = await salesStats("30j");
    const [{ total_cents }] = await sql<{ total_cents: number }>("SELECT total_cents FROM customer_order WHERE id = $1", [kept.id]);

    assert.equal(after.current.orders, before.current.orders + 1, "commande annulée non comptée");
    assert.equal(after.current.revenueCents, before.current.revenueCents + total_cents, "chiffre d'affaires net");
    assert.equal(after.previous.orders, before.previous.orders + 1, "commande d'il y a 40 jours = période précédente");
    assert.equal(after.series.length, 30);
    assert.equal(after.series.reduce((a, x) => a + x.revenueCents, 0), after.current.revenueCents, "graphique = total");
    assert.ok(after.returning.returningCustomers >= 1, "cliente revenue reconnue comme fidèle");
    assert.ok(after.topProducts.length > 0 && after.categories.length > 0 && after.shipping.length > 0);
    assert.equal((await salesStats("12m")).series.length, 12);
  });
});

describe("boutique fermée", () => {
  test("commandes en pause : message clair, aucun stock réservé", async () => {
    const id = await makeProduct({ stock: 1 });
    await sql("UPDATE shop_settings SET orders_open = false");
    const res = await checkout(shipId, [{ productId: id, quantity: 1 }]);
    await sql("UPDATE shop_settings SET orders_open = true");
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.code, "closed");
    assert.equal(await stockOf(id), 1);
  });
});
