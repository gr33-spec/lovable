import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import sharp from "sharp";
import { closePool, makeProduct, resetDatabase, sql, stockOf } from "./helpers";

import { THEMES, STATUS_COLORS, contrastRatio, themeContrastChecks } from "../src/lib/themes";
import { computeTotals, includedVat } from "../src/lib/pricing";
import { emailSchema, parseEuros, whatsappUrl, addressErrors } from "../src/lib/validation";
import { slugify, formatPrice } from "../src/lib/format";
import { hashPassword, verifyPassword, newTotpSecret, totpCode, verifyTotp, encrypt, decrypt, signShortLived, readShortLived } from "../src/lib/server/crypto";
import { processImage, ImageRejectedError } from "../src/lib/server/images";
import { saveProduct, setStock, deleteProduct } from "../src/lib/server/admin-catalog";
import { findProduct, listProducts } from "../src/lib/server/catalog";
import { createBackup, restoreBackup, toCsv } from "../src/lib/server/backup";
import { paymentConfig } from "../src/lib/server/env";
import { putFile } from "../src/lib/server/storage";
import { esc } from "../src/lib/server/email/templates";
import { renderRichText } from "../src/lib/rich-text";

before(resetDatabase);
after(closePool);

describe("thèmes et accessibilité", () => {
  for (const theme of THEMES) {
    test(`contrastes du thème ${theme.name}`, () => {
      for (const check of themeContrastChecks(theme)) {
        assert.ok(check.ratio >= check.min, `${theme.name} — ${check.label} : ${check.ratio.toFixed(2)} < ${check.min}`);
      }
    });
  }
  test("couleurs métier lisibles sur tous les thèmes", () => {
    for (const [name, c] of Object.entries(STATUS_COLORS)) {
      assert.ok(contrastRatio(c.fg, c.bg) >= 4.5, `${name} sur son fond`);
      for (const theme of THEMES) assert.ok(contrastRatio(c.fg, theme.tokens.surface) >= 4.5, `${name} sur ${theme.name}`);
    }
  });
  test("entre 5 et 8 thèmes, identifiants uniques", () => {
    assert.ok(THEMES.length >= 5 && THEMES.length <= 8);
    assert.equal(new Set(THEMES.map((t) => t.id)).size, THEMES.length);
  });
});

describe("calculs et saisies", () => {
  test("livraison offerte au-delà du seuil, TVA incluse", () => {
    const rule = { priceCents: 490, freeOverCents: 5000 };
    assert.equal(computeTotals([{ unitPriceCents: 2400, quantity: 2 }], rule, { regime: "franchise", rateBp: 2000 }).totalCents, 5290);
    const t = computeTotals([{ unitPriceCents: 2500, quantity: 2 }], rule, { regime: "assujetti", rateBp: 2000 });
    assert.equal(t.shippingCents, 0);
    assert.equal(t.vatCents, 833);
    assert.equal(includedVat(1200, 2000), 200);
    assert.throws(() => computeTotals([{ unitPriceCents: -100, quantity: 1 }], rule, { regime: null, rateBp: 0 }));
  });
  test("prix saisis en euros", () => {
    assert.equal(parseEuros("24"), 2400);
    assert.equal(parseEuros("24,50 €"), 2450);
    assert.equal(parseEuros("-3"), null);
    assert.equal(parseEuros("abc"), null);
    assert.equal(formatPrice(2400), "24 €");
  });
  test("e-mail, code postal, WhatsApp, adresses web", () => {
    assert.equal(emailSchema.safeParse("Prenom@Exemple.fr").data, "prenom@exemple.fr");
    assert.equal(emailSchema.safeParse("pas-un-email").success, false);
    assert.equal(emailSchema.safeParse("a@b.c<script>").success, false);
    assert.deepEqual(addressErrors({ line1: "1 rue", postalCode: "22500", city: "Paimpol", country: "FR" }), {});
    assert.ok(addressErrors({ line1: "1 rue", postalCode: "ABCDE", city: "Paimpol", country: "FR" }).postalCode);
    assert.equal(whatsappUrl("06 12 34 56 78"), "https://wa.me/33612345678");
    assert.equal(whatsappUrl("+33 6 12 34 56 78"), "https://wa.me/33612345678");
    assert.equal(whatsappUrl("bonjour"), null);
    assert.equal(slugify("Boucles d'oreilles « Été » !"), "boucles-d-oreilles-ete");
    assert.equal(slugify("Cœur zébré"), "coeur-zebre");
  });
  test("textes riches : aucun HTML interprété, liens https uniquement", () => {
    const out = JSON.stringify(renderRichText("## Titre\nBonjour <img src=x onerror=alert(1)> **gras** [lien](javascript:alert(1)) [ok](https://exemple.fr)"));
    assert.ok(!/"href":"javascript/.test(out), "lien javascript: jamais cliquable");
    assert.ok(out.includes("https://exemple.fr"));
    assert.ok(out.includes("<img src=x onerror=alert(1)>"), "rendu comme du texte, jamais comme du HTML");
    assert.equal(esc(`<a href="x">'`), "&lt;a href=&quot;x&quot;&gt;&#39;");
  });
  test("export tableur : pas d'injection de formule", () => {
    const csv = toCsv([{ a: "=HYPERLINK(\"x\")", b: "normal;texte" }], [["a", "A"], ["b", "B"]]);
    assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));
    assert.ok(csv.includes(`"normal;texte"`));
  });
});

describe("cryptographie et authentification", () => {
  test("mot de passe : haché, salé, vérifié", async () => {
    const h1 = await hashPassword("un mot de passe solide");
    const h2 = await hashPassword("un mot de passe solide");
    assert.notEqual(h1, h2);
    assert.ok(!h1.includes("solide"));
    assert.equal(await verifyPassword("un mot de passe solide", h1), true);
    assert.equal(await verifyPassword("un mot de passe Solide", h1), false);
  });
  test("double authentification : code valide une seule fois", () => {
    const secret = newTotpSecret();
    const now = Date.now();
    const code = totpCode(secret, Math.floor(now / 30_000));
    const step = verifyTotp(secret, code, null, now);
    assert.notEqual(step, null);
    assert.equal(verifyTotp(secret, code, step, now), null, "rejeu refusé");
    // Vecteur officiel RFC 6238 (secret « 12345678901234567890 », T = 59 s → 94287082).
    assert.equal(totpCode("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 1), "287082");
  });
  test("chiffrement et signatures courtes", () => {
    const enc = encrypt("secret", "p");
    assert.equal(decrypt(enc, "p"), "secret");
    assert.throws(() => decrypt(enc, "autre"));
    assert.throws(() => decrypt(enc.slice(0, -2) + "AA", "p"));
    const s = signShortLived("admin-1", "x", 1000);
    assert.equal(readShortLived(s, "x"), "admin-1");
    assert.equal(readShortLived(s, "y"), null);
    assert.equal(readShortLived(s, "x", Date.now() + 2000), null, "expiré");
    assert.equal(readShortLived(s.replace(/.$/, "A"), "x"), null);
  });
});

describe("configuration du paiement", () => {
  const saved = { ...process.env };
  const setEnv = (vars: Record<string, string | undefined>) => {
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
  after(() => setEnv(saved));
  test("simulateur interdit en production", () => {
    setEnv({ BOUTIQUE_TEST: undefined, NODE_ENV: "production", VERCEL_ENV: "production", PAYMENT_PROVIDER: "fake" });
    assert.equal(paymentConfig().ok, false);
    setEnv(saved);
  });
  test("clé de test avec STRIPE_MODE=live refusée ; clé live hors production refusée", () => {
    setEnv({ PAYMENT_PROVIDER: "stripe", STRIPE_MODE: "live", STRIPE_SECRET_KEY: "sk_test_abc", STRIPE_WEBHOOK_SECRET: "whsec_x" });
    assert.equal(paymentConfig().ok, false);
    setEnv({ STRIPE_MODE: "live", STRIPE_SECRET_KEY: "sk_live_abc", STRIPE_ACCOUNT_ID: "acct_1" });
    assert.equal(paymentConfig().ok, false, "préproduction / test : jamais de clé live");
    setEnv({ STRIPE_MODE: "test", STRIPE_SECRET_KEY: "sk_test_abc" });
    assert.equal(paymentConfig().ok, true);
    setEnv({ STRIPE_WEBHOOK_SECRET: "" });
    assert.equal(paymentConfig().ok, false);
    setEnv(saved);
  });
});

describe("photos", () => {
  test("un faux fichier .jpg (texte, script) est refusé", async () => {
    await assert.rejects(() => processImage(Buffer.from("<?php system($_GET['x']); ?>"), randomUUID(), "product"), ImageRejectedError);
    await assert.rejects(() => processImage(Buffer.from("<svg onload=alert(1)></svg>"), randomUUID(), "product"), ImageRejectedError);
    await assert.rejects(() => processImage(Buffer.alloc(0), randomUUID(), "product"), ImageRejectedError);
  });
  test("image trop lourde ou trop petite refusée", async () => {
    await assert.rejects(() => processImage(Buffer.alloc(5 * 1024 * 1024, 1), randomUUID(), "product"), ImageRejectedError);
    const tiny = await sharp({ create: { width: 50, height: 50, channels: 3, background: "#fff" } }).png().toBuffer();
    await assert.rejects(() => processImage(tiny, randomUUID(), "product"), ImageRejectedError);
  });
  test("photo de téléphone : redressée, métadonnées GPS supprimées, déclinée en WebP", async () => {
    const photo = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: "#c9a" } })
      .jpeg()
      .withMetadata({ orientation: 6, exif: { IFD0: { Make: "iPhone", Copyright: "gps-secret" } } })
      .toBuffer();
    const out = await processImage(photo, randomUUID(), "product");
    assert.equal(out.width, 1800, "orientation appliquée");
    assert.deepEqual(out.widths, [320, 640, 1024, 1600]);
    for (const v of out.variants) {
      const meta = await sharp(v.body).metadata();
      assert.equal(meta.exif, undefined, "aucune métadonnée conservée");
      assert.ok(v.key.startsWith("images/") && !v.key.includes(".."));
    }
    assert.ok(out.placeholder.startsWith("data:image/webp;base64,"));
  });
  test("chemins de fichiers : aucune remontée de dossier possible", async () => {
    await assert.rejects(() => putFile("public", "../../etc/passwd", Buffer.from("x"), "text/plain"));
    await assert.rejects(() => putFile("public", "/abs/path", Buffer.from("x"), "text/plain"));
  });
});

describe("administration du catalogue", () => {
  async function category() {
    return (await sql<{ id: string }>("SELECT id FROM category ORDER BY position LIMIT 1"))[0].id;
  }
  function productInput(categoryId: string, over: Record<string, unknown> = {}) {
    return { id: randomUUID(), version: 0, name: "Fleurs pailletées", categoryId, priceCents: 2400, stock: 3, originalStock: 0, status: "published", ...over };
  }

  test("création, double envoi sans doublon, modification concurrente détectée", async () => {
    const input = productInput(await category());
    const first = await saveProduct(input, null as unknown as string);
    assert.equal(first.ok, true);
    const replay = await saveProduct(input, null as unknown as string);
    assert.equal(replay.ok, false, "même identifiant : pas de second produit");
    const [{ n }] = await sql<{ n: string }>("SELECT count(*) AS n FROM product WHERE name = 'Fleurs pailletées'");
    assert.equal(Number(n), 1);
    const update = await saveProduct({ ...input, version: 1, originalStock: 3, name: "Fleurs pailletées bleues" }, null as unknown as string);
    assert.equal(update.ok, true);
    const stale = await saveProduct({ ...input, version: 1, originalStock: 3, name: "Ancienne version" }, null as unknown as string);
    assert.equal(stale.ok, false);
  });

  test("une vente pendant la modification n'est jamais écrasée", async () => {
    const input = productInput(await category(), { name: "Cœur zébré" });
    await saveProduct(input, null as unknown as string);
    await sql("UPDATE product SET stock = 2 WHERE id = $1", [input.id]); // vente
    // La créatrice change seulement le prix : le stock réel (2) est conservé.
    const priceOnly = await saveProduct({ ...input, version: 1, originalStock: 3, stock: 3, priceCents: 2600 }, null as unknown as string);
    assert.equal(priceOnly.ok, true);
    assert.equal(await stockOf(input.id), 2);
    // Elle modifie le stock en partant d'une valeur périmée : refus explicite.
    const stale = await saveProduct({ ...input, version: 2, originalStock: 3, stock: 5 }, null as unknown as string);
    assert.equal(stale.ok, false);
    const quick = await setStock(input.id, 5, 3, null as unknown as string);
    assert.equal(quick.ok, false);
    assert.equal((await setStock(input.id, 5, 2, null as unknown as string)).ok, true);
    assert.equal((await setStock(input.id, -1, 5, null as unknown as string)).ok, false, "pas de stock négatif");
  });

  test("renommer l'adresse d'un produit publié : l'ancien lien redirige", async () => {
    const input = productInput(await category(), { name: "Pendentif soleil" });
    const saved = await saveProduct(input, null as unknown as string);
    assert.ok(saved.ok);
    if (!saved.ok) return;
    await saveProduct({ ...input, version: 1, originalStock: 3, slug: "pendentif-soleil-dore" }, null as unknown as string);
    const old = await findProduct(saved.slug, 2);
    assert.deepEqual(old, { kind: "redirect", slug: "pendentif-soleil-dore" });
  });

  test("produit commandé : suppression refusée, archivage possible, historique intact", async () => {
    const id = await makeProduct({ name: "Boucles historiques", price: 3000 });
    const orderId = randomUUID();
    await sql(
      `INSERT INTO customer_order (id, number, access_token_hash, access_token_enc, idempotency_key, status, email, first_name, last_name,
         shipping_method_name, shipping_requires_address, subtotal_cents, shipping_cents, total_cents, payment_provider, paid_at)
       VALUES ($1, 'BP-HIST01', 'h1', 'e1', $2, 'completed', 'a@b.fr', 'A', 'B', 'Retrait', false, 3000, 0, 3000, 'fake', now())`,
      [orderId, randomUUID()],
    );
    await sql(
      "INSERT INTO order_item (order_id, product_id, product_name, product_slug, unit_price_cents, quantity, line_total_cents) VALUES ($1, $2, 'Boucles historiques', 'x', 3000, 1, 3000)",
      [orderId, id],
    );
    assert.equal((await deleteProduct(id, null as unknown as string)).ok, false);
    await assert.rejects(() => sql("DELETE FROM product WHERE id = $1", [id]), "la base elle-même refuse");
    await sql("UPDATE product SET name = 'Nouveau nom', price_cents = 9900, status = 'archived' WHERE id = $1", [id]);
    const [item] = await sql<{ product_name: string; unit_price_cents: number }>("SELECT product_name, unit_price_cents FROM order_item WHERE order_id = $1", [orderId]);
    assert.deepEqual(item, { product_name: "Boucles historiques", unit_price_cents: 3000 }, "la commande garde ce qui a été acheté");
    const page = await findProduct((await sql<{ slug: string }>("SELECT slug FROM product WHERE id = $1", [id]))[0].slug, 2);
    assert.equal(page.kind, "unavailable", "ancienne fiche : page « plus disponible », jamais d'erreur");
  });

  test("recherche : accents, référence, caractères spéciaux sans erreur", async () => {
    await makeProduct({ name: "Boucles Été Pailletées" });
    const r1 = await listProducts({ q: "ete paillet" }, 2);
    assert.ok(r1.items.some((p) => p.name === "Boucles Été Pailletées"));
    const r2 = await listProducts({ q: "%' OR zzqq=zzqq --" }, 2);
    assert.equal(r2.items.length, 0);
    const r3 = await listProducts({ q: "__" }, 2);
    assert.ok(Array.isArray(r3.items));
  });
});

describe("base de données", () => {
  test("toutes les tables ont la sécurité par ligne (RLS) activée", async () => {
    const rows = await sql<{ relname: string }>(
      "SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity",
    );
    assert.deepEqual(rows, []);
  });
  test("contraintes : stock négatif et prix nul impossibles même en SQL direct", async () => {
    const id = await makeProduct({ stock: 1 });
    await assert.rejects(() => sql("UPDATE product SET stock = -1 WHERE id = $1", [id]));
    await assert.rejects(() => sql("UPDATE product SET price_cents = 0 WHERE id = $1", [id]));
    await assert.rejects(() => sql("UPDATE product SET status = 'epuise' WHERE id = $1", [id]));
  });
  test("sauvegarde puis restauration : données identiques", async () => {
    const backup = await createBackup();
    const before = await sql("SELECT id, name, stock, price_cents FROM product ORDER BY id");
    await sql("UPDATE product SET stock = 0, name = 'cassé'");
    await restoreBackup(JSON.parse(JSON.stringify(backup)));
    const afterRestore = await sql("SELECT id, name, stock, price_cents FROM product ORDER BY id");
    assert.deepEqual(afterRestore, before);
    const [{ n }] = await sql<{ n: string }>("SELECT count(*) AS n FROM customer_order");
    assert.equal(Number(n), backup.tables.customer_order.length);
  });
});
