// Parcours de bout en bout dans un vrai navigateur (Chromium), sur un écran
// de téléphone. Prérequis : `npm run dev` avec PAYMENT_PROVIDER=fake et la
// base de démonstration (`npm run db:seed`).
//   PLAYWRIGHT=/chemin/vers/node_modules/playwright/index.mjs node e2e/parcours.mjs
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const { chromium } = await import(process.env.PLAYWRIGHT ?? "playwright");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DB = process.env.DATABASE_URL ?? "postgresql://postgres@localhost:5433/boutique";
const SHOTS = new URL("./screenshots/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const sql = (q) => execSync(`psql "${DB}" -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "fr-FR" };
const results = [];
const errors = [];

async function step(name, fn) {
  try {
    await fn();
    results.push(`✓ ${name}`);
  } catch (err) {
    results.push(`✗ ${name}\n    ${err.message.split("\n").slice(0, 3).join("\n    ")}`);
  }
}

function watch(page) {
  page.on("pageerror", (e) => errors.push(`${page.url()} : ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(`${page.url()} : ${m.text()}`));
}

// ───────────── Parcours cliente ─────────────
const client = await browser.newContext(phone);
const page = await client.newPage();
watch(page);
const productSlug = "fleurs-pailletees-arc-en-ciel-exemple";
// Pièce unique : la réservation doit la bloquer pour les autres clientes.
sql(`UPDATE product SET stock = 1 WHERE slug = '${productSlug}'`);
const stockBefore = 1;

await step("La cliente arrive directement sur une fiche produit (lien Facebook)", async () => {
  await page.goto(`${BASE}/produit/${productSlug}`);
  await page.getByRole("heading", { level: 1, name: /Fleurs pailletées Arc-en-ciel/ }).waitFor();
  await page.screenshot({ path: `${SHOTS}01-fiche.png` });
});

await step("Elle swipe les photos", async () => {
  const track = page.locator('[aria-roledescription="carrousel"]');
  await track.evaluate((el) => el.scrollTo({ left: el.clientWidth }));
  await page.waitForTimeout(400);
  assert.ok((await track.evaluate((el) => el.scrollLeft)) > 100);
});

await step("« Je réserve ce bijou » : petit formulaire, erreurs claires, saisie conservée", async () => {
  await page.getByRole("button", { name: "Je réserve ce bijou" }).click();
  const dialog = page.getByRole("dialog", { name: /Fleurs pailletées Arc-en-ciel/ });
  await dialog.waitFor();
  await dialog.getByLabel("Prénom").fill("Camille");
  await dialog.getByRole("button", { name: "Confirmer ma réservation" }).click();
  await dialog.getByText("Indiquez un numéro de téléphone valide").waitFor();
  await dialog.getByText("Choisissez la remise en main propre ou l'envoi").waitFor();
  assert.equal(await dialog.getByLabel("Prénom").inputValue(), "Camille", "le prénom n'est pas effacé");
  await page.screenshot({ path: `${SHOTS}02-reservation-formulaire.png` });
});

await step("Champ falsifié envoyé directement (prix, statut) : refusé par le serveur", async () => {
  const productId = sql(`SELECT id FROM product WHERE slug = '${productSlug}'`);
  const status = await page.evaluate(async (id) => {
    const r = await fetch("/api/reservation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), productId: id, firstName: "A", phone: "0612345678", delivery: "hand", priceCents: 1 }) });
    return r.status;
  }, productId);
  assert.equal(status, 400);
  assert.equal(Number(sql(`SELECT stock FROM product WHERE slug = '${productSlug}'`)), stockBefore);
});

await step("Réservation enregistrée : message clair, pièce bloquée, e-mail à la créatrice", async () => {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Numéro de téléphone").fill("06 12 34 56 78");
  await dialog.getByText("Envoi postal").click();
  await dialog.getByRole("button", { name: "Confirmer ma réservation" }).click();
  await dialog.getByText("Votre demande de réservation a bien été enregistrée").waitFor();
  await dialog.getByText("Aucun paiement n'est demandé sur le site").waitFor();
  await page.screenshot({ path: `${SHOTS}03-reservation-ok.png` });
  assert.equal(Number(sql(`SELECT stock FROM product WHERE slug = '${productSlug}'`)), stockBefore - 1);
  assert.equal(sql("SELECT status || ' ' || delivery || ' ' || phone FROM reservation WHERE first_name = 'Camille'"), "pending post 06 12 34 56 78");
  assert.equal(sql("SELECT count(*) FROM email_outbox o JOIN reservation r ON r.id = o.reservation_id WHERE r.first_name = 'Camille' AND o.kind = 'admin_new_reservation'"), "1");
  await dialog.getByRole("button", { name: "Fermer" }).last().click();
});

await step("Une autre cliente voit « Réservé » et ne peut plus réserver la pièce", async () => {
  const other = await browser.newContext(phone);
  const p = await other.newPage();
  await p.goto(`${BASE}/produit/${productSlug}`);
  await p.getByText("Réservé – en attente de confirmation").waitFor();
  assert.equal(await p.getByRole("button", { name: "Je réserve ce bijou" }).count(), 0);
  await p.screenshot({ path: `${SHOTS}04-reserve.png` });
  // Même en appelant le serveur directement : refusé.
  const productId = sql(`SELECT id FROM product WHERE slug = '${productSlug}'`);
  const status = await p.evaluate(async (id) => {
    const r = await fetch("/api/reservation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), productId: id, firstName: "Inès", phone: "0698765432", delivery: "hand" }) });
    return r.status;
  }, productId);
  assert.equal(status, 409);
  await other.close();
});

await step("Panier et paiement en ligne désactivés", async () => {
  await page.goto(`${BASE}/panier`);
  await page.waitForURL(`${BASE}/boutique`);
  assert.equal(await page.getByRole("link", { name: /^Panier/ }).count(), 0);
  const status = await page.evaluate(async () => (await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status);
  assert.equal(status, 422);
});

await step("Ancien lien produit / page inconnue : page propre, pas d'erreur", async () => {
  const res = await page.goto(`${BASE}/produit/n-existe-plus`);
  assert.equal(res.status(), 404);
  await page.getByText("cette page s'est envolée").waitFor();
});

await step("Recherche sans résultat : message et action suivante", async () => {
  await page.goto(`${BASE}/boutique?q=zzzzqqq`);
  await page.getByText("Aucune création ne correspond").waitFor();
  await page.getByRole("link", { name: "Voir toutes les créations" }).waitFor();
});

// ───────────── Sécurité ─────────────
await step("Administration inaccessible sans connexion (page et API)", async () => {
  const anon = await browser.newContext();
  const p = await anon.newPage();
  await p.goto(`${BASE}/admin/commandes`);
  assert.match(p.url(), /\/admin\/connexion/);
  const api = await p.request.post(`${BASE}/api/admin/images`, { multipart: { kind: "product" } });
  assert.equal(api.status(), 401);
  const exp = await p.request.get(`${BASE}/api/admin/export/sauvegarde`);
  assert.equal(exp.status(), 401);
  // Faux cookie : refusé par la vérification en base.
  await anon.addCookies([{ name: "bp_admin", value: "a".repeat(43), url: BASE }]);
  await p.goto(`${BASE}/admin`);
  assert.match(p.url(), /\/admin\/connexion/);
  const exp2 = await p.request.get(`${BASE}/api/admin/export/sauvegarde`);
  assert.equal(exp2.status(), 401);
  await anon.close();
});

await step("Réservation envoyée depuis un autre site : refusée", async () => {
  const r = await fetch(`${BASE}/api/reservation`, { method: "POST", headers: { Origin: "https://attaquant.example", "Content-Type": "application/json" }, body: "{}" });
  assert.equal(r.status, 403);
});

await step("Faux webhook Stripe : refusé", async () => {
  const r = await fetch(`${BASE}/api/stripe/webhook`, { method: "POST", body: JSON.stringify({ id: "evt_x", kind: "checkout_completed" }) });
  assert.equal(r.status, 400);
});

await step("Tâche planifiée sans secret : refusée", async () => {
  assert.equal((await fetch(`${BASE}/api/cron`)).status, 401);
});

await step("En-têtes de sécurité présents", async () => {
  const r = await fetch(`${BASE}/`);
  for (const h of ["content-security-policy", "strict-transport-security", "x-content-type-options", "referrer-policy", "x-frame-options"]) assert.ok(r.headers.get(h), h);
  const a = await fetch(`${BASE}/admin/connexion`);
  assert.match(a.headers.get("x-robots-tag") ?? "", /noindex/);
});

// ───────────── Parcours créatrice (sur téléphone) ─────────────
const adminCtx = await browser.newContext(phone);
const admin = await adminCtx.newPage();
watch(admin);

await step("Connexion : mauvais mot de passe refusé", async () => {
  await admin.goto(`${BASE}/admin/connexion`);
  await admin.getByLabel("E-mail").fill("creatrice@boutique.test");
  await admin.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
  await admin.getByRole("button", { name: "Se connecter" }).click();
  await admin.getByText("E-mail ou mot de passe incorrect").waitFor();
});

await step("Connexion réussie : tableau de bord avec la réservation en attente", async () => {
  await admin.getByLabel("Mot de passe").fill("paillettes-demo-2026");
  await admin.getByRole("button", { name: "Se connecter" }).click();
  await admin.waitForURL(`${BASE}/admin`);
  await admin.getByText("Réservations en attente").waitFor();
  await admin.screenshot({ path: `${SHOTS}05-admin-dashboard.png`, fullPage: true });
});

await step("Réservations : fiche complète, appel et WhatsApp en un geste, confirmation", async () => {
  await admin.getByRole("link", { name: /Réservations/ }).first().click();
  await admin.waitForURL(`${BASE}/admin/reservations`);
  const card = admin.getByRole("listitem").filter({ hasText: "Camille" });
  await card.getByText("Fleurs pailletées Arc-en-ciel").waitFor();
  await card.getByText("Envoi postal").waitFor();
  assert.equal(await card.getByRole("link", { name: "Appeler" }).getAttribute("href"), "tel:0612345678");
  assert.match(await card.getByRole("link", { name: "Contacter sur WhatsApp" }).getAttribute("href"), /^https:\/\/wa\.me\/33612345678\?text=/);
  await admin.screenshot({ path: `${SHOTS}06-admin-reservations.png`, fullPage: true });
  await card.getByRole("button", { name: "Confirmer" }).click();
  await admin.getByText("Réservation confirmée.").waitFor();
  assert.equal(sql("SELECT status FROM reservation WHERE first_name = 'Camille'"), "confirmed");
  assert.equal(Number(sql(`SELECT stock FROM product WHERE slug = '${productSlug}'`)), stockBefore - 1);
});

await step("Annuler une réservation : le bijou redevient disponible", async () => {
  await admin.goto(`${BASE}/admin/reservations?statut=confirmed`);
  const card = admin.getByRole("listitem").filter({ hasText: "Camille" });
  await card.getByRole("button", { name: /Annuler · remettre disponible/ }).click();
  await admin.getByRole("button", { name: "Annuler et remettre disponible" }).click();
  await admin.getByText("le bijou est de nouveau disponible").waitFor();
  assert.equal(sql("SELECT status FROM reservation WHERE first_name = 'Camille'"), "cancelled");
  assert.equal(Number(sql(`SELECT stock FROM product WHERE slug = '${productSlug}'`)), stockBefore);
  await page.goto(`${BASE}/produit/${productSlug}`);
  await page.getByRole("button", { name: "Je réserve ce bijou" }).waitFor();
});

const photo = (color) =>
  execSync(`node -e "require('sharp')({create:{width:1600,height:1200,channels:3,background:'${color}'}}).jpeg().toBuffer().then(b=>process.stdout.write(b))"`, { cwd: new URL("..", import.meta.url).pathname });

await step("Nouvelle création depuis le téléphone : 2 photos, principale choisie, nouvelle sous-catégorie, publiée", async () => {
  await admin.goto(`${BASE}/admin/produits/nouveau`);
  const chooser = admin.waitForEvent("filechooser");
  await admin.getByRole("button", { name: "Ajouter des photos" }).click();
  await (await chooser).setFiles([
    { name: "IMG_0001.jpg", mimeType: "image/jpeg", buffer: photo("#c96") },
    { name: "IMG_0002.jpg", mimeType: "image/jpeg", buffer: photo("#69c") },
  ]);
  await admin.getByText("Principale", { exact: true }).waitFor();
  await admin.waitForFunction(() => document.querySelectorAll("li img").length >= 2, null, { timeout: 30000 });
  await admin.getByRole("button", { name: "Choisir la photo 2 comme principale" }).click();
  await admin.locator("#field-name").fill("Boucles Soleil Test E2E");
  await admin.locator("#field-priceCents").fill("26,50");
  // Catégorie puis nouvelle sous-catégorie créée sans quitter la fiche.
  await admin.locator("#field-category-0").selectOption({ label: "Boucles d'oreilles" });
  await admin.getByRole("button", { name: /Sous-catégorie dans « Boucles d'oreilles »/ }).click();
  await admin.getByLabel("Nom", { exact: true }).fill("Soleils");
  await admin.getByRole("button", { name: "Créer", exact: true }).click();
  await admin.getByText("« Soleils » créée.").waitFor();
  assert.equal(await admin.locator("#field-category-1 option:checked").textContent(), "Soleils");
  // Une caractéristique qui servira de filtre.
  await admin.getByRole("button", { name: "Motif", exact: true }).click();
  await admin.getByLabel("Valeur").last().fill("Soleil");
  await admin.getByRole("button", { name: "Ajouter une pièce" }).click();
  await admin.screenshot({ path: `${SHOTS}07-admin-produit.png`, fullPage: true });
  await admin.getByRole("button", { name: "Publier" }).click();
  await admin.waitForURL(/\/admin\/produits\/[0-9a-f-]{36}$/);
  await admin.getByText("Publié : la création est en ligne").waitFor();
  assert.equal(sql("SELECT status || '/' || stock || '/' || price_cents FROM product WHERE name = 'Boucles Soleil Test E2E'"), "published/2/2650");
});

await step("Le produit apparaît immédiatement dans la boutique, dans sa sous-catégorie et sa famille", async () => {
  await page.goto(`${BASE}/boutique`);
  await page.getByText("Boucles Soleil Test E2E").waitFor();
  await page.goto(`${BASE}/boutique/boucles-d-oreilles/soleils`);
  await page.getByRole("heading", { name: "Soleils" }).first().waitFor();
  await page.getByText("Boucles Soleil Test E2E").waitFor();
  await page.getByRole("link", { name: "Boucles d'oreilles" }).first().waitFor();
  await page.goto(`${BASE}/boutique/boucles-d-oreilles`);
  await page.getByText("Boucles Soleil Test E2E").waitFor();
  await page.getByRole("link", { name: /Soleils/ }).first().waitFor();
});

await step("Catégories : sous-catégorie ajoutée, renommée avec son adresse, ancienne adresse redirigée, vide supprimée", async () => {
  await admin.goto(`${BASE}/admin/categories`);
  await admin.getByRole("button", { name: "Ajouter une sous-catégorie dans Boucles d'oreilles" }).click();
  await admin.getByLabel("Nom").fill("Créoles");
  await admin.getByRole("button", { name: "Enregistrer" }).click();
  await admin.getByText("« Créoles » créée.").waitFor();
  // Renommer « Soleils » et changer son adresse.
  await admin.getByRole("button", { name: "Plus d'actions pour Soleils" }).click();
  await admin.getByRole("button", { name: /Renommer, déplacer/ }).click();
  await admin.getByLabel("Nom").fill("Soleils dorés");
  await admin.getByLabel("Fin de l'adresse").fill("soleils-dores");
  await admin.getByRole("button", { name: "Enregistrer" }).click();
  await admin.getByText("Catégorie enregistrée.").waitFor();
  await admin.screenshot({ path: `${SHOTS}07b-admin-categories.png`, fullPage: true });
  await page.goto(`${BASE}/boutique/boucles-d-oreilles/soleils`);
  await page.waitForURL(`${BASE}/boutique/boucles-d-oreilles/soleils-dores`);
  await page.getByRole("heading", { name: "Soleils dorés" }).first().waitFor();
  // « Créoles » est vide : supprimée directement ; une catégorie pleine ne l'est jamais sans destination.
  await admin.getByRole("button", { name: "Plus d'actions pour Créoles" }).click();
  await admin.getByRole("button", { name: "Supprimer…" }).click();
  await admin.getByRole("button", { name: "Supprimer", exact: true }).click();
  await admin.getByText("Catégorie supprimée.").waitFor();
  await admin.getByRole("button", { name: "Plus d'actions pour Soleils dorés" }).click();
  await admin.getByRole("button", { name: "Supprimer…" }).click();
  await admin.getByText("Rien n'est supprimé brutalement").waitFor();
  await admin.getByRole("button", { name: "Annuler" }).last().click();
  assert.equal(sql("SELECT count(*) FROM category WHERE slug = 'soleils-dores'"), "1");
});

await step("Fichier piégé (texte renommé en .jpg) : refusé avec un message clair", async () => {
  await admin.goto(`${BASE}/admin/produits/nouveau`);
  const chooser = admin.waitForEvent("filechooser");
  await admin.getByRole("button", { name: "Ajouter des photos" }).click();
  await (await chooser).setFiles([{ name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from("<script>alert(1)</script>") }]);
  await admin.getByText(/pas une photo|non reconnu|pas une image/).waitFor();
});

await step("Stock modifié depuis la liste des produits", async () => {
  await admin.goto(`${BASE}/admin/produits`);
  await admin.getByRole("button", { name: "Ajouter une pièce à Boucles Soleil Test E2E" }).click();
  await admin.waitForTimeout(1200);
  assert.equal(sql("SELECT stock FROM product WHERE name = 'Boucles Soleil Test E2E'"), "3");
});

await step("Changement de thème : aperçu immédiat, puis appliqué à la boutique", async () => {
  await admin.goto(`${BASE}/admin/apparence`);
  await admin.getByRole("radio", { name: /Framboise/ }).click();
  // Aperçu : l'administration change aussitôt, la boutique pas encore.
  const preview = await admin.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--c-primary").trim());
  assert.equal(preview.toLowerCase(), "#ae1f4e");
  await admin.getByRole("button", { name: "Appliquer à la boutique" }).click();
  await admin.getByText(/Couleurs « Framboise » appliquées/).waitFor();
  await page.goto(`${BASE}/`);
  const primary = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--c-primary").trim());
  assert.equal(primary.toLowerCase(), "#ae1f4e");
  await page.screenshot({ path: `${SHOTS}08-theme-framboise.png` });
  // Palette personnalisée : 3 couleurs, une principale trop claire est approfondie.
  await admin.getByRole("radio", { name: /Créer ma palette/ }).click();
  await admin.getByLabel("Couleur principale", { exact: true }).fill("#F4A6B8");
  await admin.getByText(/version plus profonde/).waitFor();
  await admin.getByRole("button", { name: "Appliquer à la boutique" }).click();
  await admin.getByText(/Couleurs « Ma palette » appliquées/).waitFor();
  assert.match(sql("SELECT theme || ' ' || (theme_custom->>'primary') FROM shop_settings"), /^personnalise #F4A6B8$/);
  await admin.getByRole("radio", { name: /Sauge & Champagne/ }).click();
  await admin.getByRole("button", { name: "Appliquer à la boutique" }).click();
  await admin.getByText(/Couleurs « Sauge & Champagne » appliquées/).waitFor();
});

await step("Session expirée / déconnexion : les actions sont refusées", async () => {
  sql("UPDATE admin_session SET revoked_at = now()");
  await admin.goto(`${BASE}/admin/produits`);
  assert.match(admin.url(), /\/admin\/connexion/);
});

await browser.close();
writeFileSync(`${SHOTS}resultats.txt`, results.join("\n"));
console.log(results.join("\n"));
if (errors.length) console.log(`\nErreurs navigateur :\n${[...new Set(errors)].join("\n")}`);
process.exit(results.some((r) => r.startsWith("✗")) ? 1 : 0);
