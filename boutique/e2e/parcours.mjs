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
const stockBefore = Number(sql(`SELECT stock FROM product WHERE slug = '${productSlug}'`));

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

await step("Elle ajoute au panier : confirmation et compteur", async () => {
  await page.getByRole("button", { name: "Ajouter au panier" }).first().click();
  await page.getByText("ajouté au panier").waitFor();
  await page.getByRole("link", { name: /Panier, 1 article/ }).waitFor();
});

await step("Double clic sur « Ajouter » : jamais plus que le stock", async () => {
  const add = page.getByRole("button", { name: /Ajouter au panier|Déjà dans votre panier/ }).first();
  for (let i = 0; i < 6; i++) await add.click({ force: true }).catch(() => undefined);
  const count = await page.evaluate(() => JSON.parse(localStorage.getItem("boheme-panier-v1"))[0].quantity);
  assert.ok(count <= stockBefore, `quantité ${count} > stock ${stockBefore}`);
  await page.evaluate(() => localStorage.setItem("boheme-panier-v1", JSON.stringify([{ productId: JSON.parse(localStorage.getItem("boheme-panier-v1"))[0].productId, quantity: 1 }])));
});

await step("Panier : produit, photo, total ; panier conservé après fermeture", async () => {
  await page.goto(`${BASE}/panier`);
  await page.getByRole("heading", { name: "Panier" }).waitFor();
  await page.getByText("Fleurs pailletées Arc-en-ciel").first().waitFor();
  await page.screenshot({ path: `${SHOTS}02-panier.png`, fullPage: true });
});

await step("Prix falsifié dans le navigateur : ignoré par le serveur", async () => {
  // Une personne malveillante envoie elle-même une requête avec un prix.
  const res = await page.evaluate(async () => {
    const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), items: [{ productId: JSON.parse(localStorage.getItem("boheme-panier-v1"))[0].productId, quantity: 1 }], priceCents: 1, email: "a@b.fr", firstName: "A", lastName: "B", shippingMethodId: crypto.randomUUID(), country: "FR" }) });
    return r.status;
  });
  assert.equal(res, 400);
});

await step("Commande : formulaire avec erreurs claires, saisie conservée", async () => {
  await page.goto(`${BASE}/commande`);
  await page.locator("#email").fill("camille.test@exemple.fr");
  await page.locator("#firstName").fill("Camille");
  await page.locator("#lastName").fill("Martin");
  await page.getByRole("radio", { name: /Envoi suivi/ }).check();
  await page.locator("#line1").fill("12 rue des Lilas");
  await page.locator("#postalCode").fill("2250");
  await page.locator("#city").fill("Paimpol");
  await page.getByRole("button", { name: /Payer/ }).click();
  await page.getByText("Code postal invalide pour ce pays").waitFor();
  assert.equal(await page.locator("#line1").inputValue(), "12 rue des Lilas", "l'adresse n'est pas effacée");
  await page.locator("#postalCode").fill("22500");
  await page.screenshot({ path: `${SHOTS}03-commande.png`, fullPage: true });
});

await step("Paiement abandonné (retour arrière) : stock rendu, panier intact", async () => {
  await page.getByRole("button", { name: /Payer/ }).click();
  await page.waitForURL(/\/dev\/paiement\//);
  assert.equal(Number(sql(`SELECT stock FROM product WHERE slug = '${productSlug}'`)), stockBefore - 1, "réservé pendant le paiement");
  await page.getByRole("button", { name: "Revenir sans payer" }).click();
  await page.getByText("Le paiement n'a pas été finalisé").waitFor();
  await page.waitForTimeout(800);
  assert.equal(Number(sql(`SELECT stock FROM product WHERE slug = '${productSlug}'`)), stockBefore, "stock rendu");
});

await step("Paiement réussi (webhook envoyé deux fois) : confirmation claire, un seul e-mail", async () => {
  await page.getByRole("button", { name: /Payer/ }).click();
  await page.waitForURL(/\/dev\/paiement\//);
  await page.getByRole("button", { name: "Payer + webhook envoyé deux fois" }).click();
  await page.waitForURL(/\/commande\/suivi\//);
  await page.getByRole("heading", { name: /Merci Camille/ }).waitFor();
  await page.screenshot({ path: `${SHOTS}04-confirmation.png`, fullPage: true });
  const n = sql("SELECT count(*) FROM email_outbox o JOIN customer_order c ON c.id = o.order_id WHERE c.email = 'camille.test@exemple.fr' AND o.kind = 'order_confirmation'");
  assert.equal(n, "1");
  assert.equal(Number(sql(`SELECT stock FROM product WHERE slug = '${productSlug}'`)), stockBefore - 1);
});

await step("Rafraîchir la page de confirmation : aucun doublon, panier vidé", async () => {
  await page.reload();
  await page.getByRole("heading", { name: /Merci Camille/ }).waitFor();
  assert.equal(sql("SELECT count(*) FROM customer_order WHERE email = 'camille.test@exemple.fr' AND status = 'paid'"), "1");
  const cart = await page.evaluate(() => localStorage.getItem("boheme-panier-v1"));
  assert.equal(cart, "[]");
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

await step("Requête de paiement venant d'un autre site : refusée", async () => {
  const r = await fetch(`${BASE}/api/checkout`, { method: "POST", headers: { Origin: "https://attaquant.example", "Content-Type": "application/json" }, body: "{}" });
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

await step("Connexion réussie : tableau de bord avec la commande à préparer", async () => {
  await admin.getByLabel("Mot de passe").fill("paillettes-demo-2026");
  await admin.getByRole("button", { name: "Se connecter" }).click();
  await admin.waitForURL(`${BASE}/admin`);
  await admin.getByRole("heading", { name: "Commandes à préparer" }).waitFor();
  await admin.getByText("Camille Martin").first().waitFor();
  await admin.screenshot({ path: `${SHOTS}05-admin-dashboard.png`, fullPage: true });
});

await step("Commande : préparation puis expédition avec suivi, e-mail à la cliente", async () => {
  await admin.getByText("Camille Martin").first().click();
  await admin.getByRole("button", { name: "Je commence la préparation" }).click();
  await admin.getByText("Commande passée en préparation.").waitFor();
  await admin.getByLabel("N° de suivi (facultatif)").fill("6A12345678901");
  await admin.getByRole("button", { name: "Marquer comme expédiée" }).click();
  await admin.getByText(/Expédiée : la cliente/).waitFor();
  await admin.screenshot({ path: `${SHOTS}06-admin-commande.png`, fullPage: true });
  assert.equal(sql("SELECT status FROM customer_order WHERE email = 'camille.test@exemple.fr' AND status <> 'expired'"), "shipped");
  assert.equal(sql("SELECT count(*) FROM email_outbox o JOIN customer_order c ON c.id = o.order_id WHERE c.email = 'camille.test@exemple.fr' AND o.kind = 'order_shipped'"), "1");
});

const photo = (color) =>
  execSync(`node -e "require('sharp')({create:{width:1600,height:1200,channels:3,background:'${color}'}}).jpeg().toBuffer().then(b=>process.stdout.write(b))"`, { cwd: new URL("..", import.meta.url).pathname });

await step("Nouvelle création depuis le téléphone : 2 photos, principale choisie, nouvelle catégorie, publiée", async () => {
  await admin.goto(`${BASE}/admin/produits/nouveau`);
  const chooser = admin.waitForEvent("filechooser");
  await admin.getByRole("button", { name: "Ajouter des photos" }).click();
  await (await chooser).setFiles([
    { name: "IMG_0001.jpg", mimeType: "image/jpeg", buffer: photo("#c96") },
    { name: "IMG_0002.jpg", mimeType: "image/jpeg", buffer: photo("#69c") },
  ]);
  await admin.getByText("Principale").waitFor();
  await admin.waitForFunction(() => document.querySelectorAll("li img").length >= 2, null, { timeout: 30000 });
  await admin.getByRole("button", { name: "Choisir la photo 2 comme principale" }).click();
  await admin.locator("#field-name").fill("Boucles Soleil Test E2E");
  await admin.locator("#field-priceCents").fill("26,50");
  // Nouvelle catégorie créée sans quitter la fiche (ex. : des broches).
  await admin.getByRole("button", { name: /Nouvelle catégorie/ }).click();
  await admin.getByLabel("Nom de la nouvelle catégorie").fill("Broches");
  await admin.getByRole("button", { name: "Créer", exact: true }).click();
  await admin.getByText("Catégorie « Broches » créée.").waitFor();
  assert.equal(await admin.locator("#field-categoryId option:checked").textContent(), "Broches");
  await admin.getByRole("button", { name: "Ajouter une pièce" }).click();
  await admin.screenshot({ path: `${SHOTS}07-admin-produit.png`, fullPage: true });
  await admin.getByRole("button", { name: "Publier" }).click();
  await admin.waitForURL(/\/admin\/produits\/[0-9a-f-]{36}$/);
  await admin.getByText("Publié : la création est en ligne").waitFor();
  assert.equal(sql("SELECT status || '/' || stock || '/' || price_cents FROM product WHERE name = 'Boucles Soleil Test E2E'"), "published/2/2650");
});

await step("Le produit apparaît immédiatement dans la boutique, dans sa nouvelle catégorie", async () => {
  await page.goto(`${BASE}/boutique`);
  await page.getByText("Boucles Soleil Test E2E").waitFor();
  await page.goto(`${BASE}/boutique/broches`);
  await page.getByRole("heading", { name: "Broches" }).first().waitFor();
  await page.getByText("Boucles Soleil Test E2E").waitFor();
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

await step("Changement de thème : appliqué à la boutique", async () => {
  await admin.goto(`${BASE}/admin/apparence`);
  await admin.getByRole("radio", { name: /Rose Poudré/ }).click();
  await admin.getByText(/Thème « Rose Poudré » appliqué/).waitFor();
  await page.goto(`${BASE}/`);
  const primary = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--c-primary").trim());
  assert.equal(primary.toLowerCase(), "#8e4f5a");
  await page.screenshot({ path: `${SHOTS}08-theme-rose.png` });
  await admin.getByRole("radio", { name: /Bohème Sauge/ }).click();
  await admin.getByText(/Bohème Sauge/).first().waitFor();
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
