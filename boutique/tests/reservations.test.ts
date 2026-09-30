import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, describe, test } from "node:test";
import { closePool, makeProduct, resetDatabase, sql, stockOf } from "./helpers";
import { reservationSchema, whatsappUrl } from "../src/lib/validation";
import { createReservation, expireReservations, listReservations, updateReservation } from "../src/lib/server/reservations";
import { listProducts } from "../src/lib/server/catalog";
import { processOutbox } from "../src/lib/server/email/outbox";
import { sent } from "../src/lib/server/email/provider";

// Réservation sans paiement : la pièce est bloquée à la demande, la
// créatrice confirme ou annule, et une réservation oubliée peut expirer.

let adminId = "";

function input(productId: string, extra: Record<string, unknown> = {}) {
  return reservationSchema.parse({
    idempotencyKey: randomUUID(),
    productId,
    firstName: "Camille",
    phone: "06 12 34 56 78",
    email: "",
    delivery: "hand",
    ...extra,
  });
}

before(async () => {
  await resetDatabase();
  await sql("UPDATE shop_settings SET notification_email = 'atelier@exemple.fr', contact_email = 'contact@exemple.fr'");
  [{ id: adminId }] = await sql<{ id: string }>("INSERT INTO admin_user (email, password_hash) VALUES ('creatrice@exemple.fr', 'x') RETURNING id");
});
after(closePool);
beforeEach(() => {
  sent.length = 0;
});

describe("formulaire de réservation", () => {
  test("prénom et téléphone suffisent ; e-mail facultatif", () => {
    const ok = reservationSchema.safeParse({ idempotencyKey: randomUUID(), productId: randomUUID(), firstName: "Léa", phone: "0612345678", delivery: "post" });
    assert.equal(ok.success, true);
  });

  test("téléphone invalide, prénom vide ou mode de remise manquant : refusés", () => {
    const base = { idempotencyKey: randomUUID(), productId: randomUUID(), firstName: "Léa", phone: "06 12 34 56 78", delivery: "hand" };
    assert.equal(reservationSchema.safeParse({ ...base, phone: "12" }).success, false);
    assert.equal(reservationSchema.safeParse({ ...base, phone: "appelez-moi" }).success, false);
    assert.equal(reservationSchema.safeParse({ ...base, firstName: "  " }).success, false);
    assert.equal(reservationSchema.safeParse({ ...base, delivery: "drone" }).success, false);
    assert.equal(reservationSchema.safeParse({ ...base, email: "pas-un-email" }).success, false);
    // Aucun champ inattendu (prix, statut…) n'est accepté.
    assert.equal(reservationSchema.safeParse({ ...base, priceCents: 1 }).success, false);
  });

  test("lien WhatsApp à partir d'un numéro français", () => {
    assert.equal(whatsappUrl("06 12 34 56 78"), "https://wa.me/33612345678");
    assert.equal(whatsappUrl("+33 6 12 34 56 78"), "https://wa.me/33612345678");
  });
});

describe("blocage de la pièce", () => {
  test("réservation : pièce retirée du stock, statut en attente, bijou affiché « Réservé »", async () => {
    const id = await makeProduct({ stock: 1, name: "Créoles Aurore" });
    const res = await createReservation(input(id));
    assert.equal(res.ok, true);
    assert.equal(await stockOf(id), 0);
    const [r] = await listReservations("pending");
    assert.equal(r.productName, "Créoles Aurore");
    assert.equal(r.firstName, "Camille");
    assert.equal(r.status, "pending");
    const listing = await listProducts({ q: "Aurore" }, 2);
    assert.equal(listing.items[0].availability, "reserved");
  });

  test("dernière pièce, deux clientes au même instant : une seule réservation", async () => {
    const id = await makeProduct({ stock: 1 });
    const results = await Promise.all([createReservation(input(id)), createReservation(input(id, { firstName: "Inès" }))]);
    assert.equal(results.filter((r) => r.ok).length, 1);
    const refused = results.find((r) => !r.ok);
    assert.equal(refused && !refused.ok && refused.code, "unavailable");
    assert.equal(await stockOf(id), 0);
  });

  test("double envoi du formulaire (même clé) : une seule réservation", async () => {
    const id = await makeProduct({ stock: 2 });
    const data = input(id);
    const [a, b] = await Promise.all([createReservation(data), createReservation(data)]);
    assert.ok(a.ok && b.ok && a.number === b.number);
    assert.equal(await stockOf(id), 1);
  });

  test("brouillon ou archivé : impossible à réserver, même en appelant le serveur directement", async () => {
    const draft = await makeProduct({ stock: 1, status: "draft" });
    const res = await createReservation(input(draft));
    assert.equal(res.ok, false);
    assert.equal(await stockOf(draft), 1);
  });

  test("réservations en pause : refusées avec le message de la créatrice", async () => {
    const id = await makeProduct({ stock: 1 });
    await sql("UPDATE shop_settings SET orders_open = false, closed_message = 'En vacances !'");
    const res = await createReservation(input(id));
    await sql("UPDATE shop_settings SET orders_open = true, closed_message = ''");
    assert.equal(res.ok, false);
    assert.equal(!res.ok && res.message, "En vacances !");
    assert.equal(await stockOf(id), 1);
  });
});

describe("décision de la créatrice", () => {
  test("confirmer : la pièce reste vendue", async () => {
    const id = await makeProduct({ stock: 1 });
    await createReservation(input(id));
    const [r] = (await listReservations("pending")).filter((x) => x.productId === id);
    assert.deepEqual(await updateReservation(r.id, "confirm", adminId), { ok: true });
    assert.equal(await stockOf(id), 0);
    assert.equal((await updateReservation(r.id, "confirm", adminId)).ok, false);
  });

  test("annuler (même après confirmation) : le bijou redevient disponible, une seule fois", async () => {
    const id = await makeProduct({ stock: 1 });
    await createReservation(input(id));
    const [r] = (await listReservations("pending")).filter((x) => x.productId === id);
    await updateReservation(r.id, "confirm", adminId);
    assert.deepEqual(await updateReservation(r.id, "cancel", adminId), { ok: true });
    assert.equal(await stockOf(id), 1);
    // Un second clic ne rajoute pas une pièce fantôme.
    assert.equal((await updateReservation(r.id, "cancel", adminId)).ok, false);
    assert.equal(await stockOf(id), 1);
    // Et une autre cliente peut la réserver.
    assert.equal((await createReservation(input(id))).ok, true);
  });
});

describe("expiration après 24 h", () => {
  test("non confirmée à temps : libérée automatiquement", async () => {
    const id = await makeProduct({ stock: 1 });
    await createReservation(input(id));
    await sql("UPDATE reservation SET expires_at = now() - interval '1 minute' WHERE product_id = $1", [id]);
    assert.equal(await expireReservations(), 1);
    assert.equal(await stockOf(id), 1);
    const [row] = await sql<{ status: string }>("SELECT status FROM reservation WHERE product_id = $1", [id]);
    assert.equal(row.status, "expired");
  });

  test("option désactivée : rien n'expire, la créatrice garde la main", async () => {
    const id = await makeProduct({ stock: 1 });
    await createReservation(input(id));
    await sql("UPDATE reservation SET expires_at = now() - interval '1 minute' WHERE product_id = $1", [id]);
    await sql("UPDATE shop_settings SET reservation_auto_expire = false");
    assert.equal(await expireReservations(), 0);
    await sql("UPDATE shop_settings SET reservation_auto_expire = true");
    assert.equal(await stockOf(id), 0);
  });

  test("confirmée : n'expire jamais", async () => {
    const id = await makeProduct({ stock: 1 });
    await createReservation(input(id));
    const [r] = (await listReservations("pending")).filter((x) => x.productId === id);
    await updateReservation(r.id, "confirm", adminId);
    await sql("UPDATE reservation SET expires_at = now() - interval '1 minute' WHERE id = $1", [r.id]);
    await expireReservations();
    assert.equal(await stockOf(id), 0);
  });
});

describe("notifications", () => {
  test("e-mail à la créatrice (téléphone, WhatsApp) ; accusé à la cliente seulement si e-mail donné", async () => {
    await sql("DELETE FROM email_outbox");
    const id = await makeProduct({ stock: 2, name: "Broche <Lune>" });
    await createReservation(input(id, { firstName: "Zoé", delivery: "post" }));
    await processOutbox(10);
    assert.equal(sent.length, 1);
    const admin = sent[0];
    assert.equal(admin.to, "atelier@exemple.fr");
    assert.match(admin.subject, /Nouvelle réservation/);
    assert.match(admin.html, /tel:0612345678/);
    assert.match(admin.html, /wa\.me\/33612345678/);
    assert.match(admin.html, /Envoi postal/);
    assert.match(admin.html, /Broche &lt;Lune&gt;/);

    sent.length = 0;
    await createReservation(input(id, { email: "zoe@exemple.fr" }));
    await processOutbox(10);
    assert.deepEqual(sent.map((m) => m.to).sort(), ["atelier@exemple.fr", "zoe@exemple.fr"]);
    const client = sent.find((m) => m.to === "zoe@exemple.fr")!;
    assert.match(client.text, /Aucun paiement n'est demandé sur le site/);
  });
});

describe("données personnelles", () => {
  test("réservations closes anonymisées après 30 jours ; en attente jamais touchées", async () => {
    const { purgeOldAddresses } = await import("../src/lib/server/admin-orders");
    const id = await makeProduct({ stock: 3 });
    await createReservation(input(id, { firstName: "Vieille", email: "v@exemple.fr" }));
    await createReservation(input(id, { firstName: "Recente" }));
    await sql("UPDATE reservation SET status = 'cancelled', closed_at = now() - interval '40 days' WHERE first_name = 'Vieille'");
    await sql("UPDATE reservation SET created_at = now() - interval '40 days' WHERE first_name = 'Recente'");
    await purgeOldAddresses(null);
    const rows = await sql<{ first_name: string; phone: string; email: string | null }>("SELECT first_name, phone, email FROM reservation WHERE product_id = $1 ORDER BY created_at", [id]);
    assert.deepEqual(rows.map((r) => r.first_name).sort(), ["Anonyme", "Recente"]);
    assert.ok(rows.some((r) => r.phone === "••••••" && r.email === null));
  });
});
