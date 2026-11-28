import { expect, test, type Browser, type Page } from "@playwright/test";
import { confirmerEmail } from "./confirmer-email";

/**
 * CHANTIER 05 (Greg, 28 novembre 2026) : LISTE D'ATTENTE PAR MÉTIER ET DÉPARTEMENT, ET INVITATIONS, de bout en bout :
 * le lien d'invitation d'un couvreur → l'inscription d'un plaquiste (case « Préviens-moi » jamais cochée d'office) →
 * « Tu es sur la liste » sur l'accueil, désinscription et réinscription → l'admin voit qui a invité qui, prévient les
 * plaquistes du département (aperçu, confirmation, envoi) → l'e-mail reçu, une seule fois, et sa désinscription en un clic.
 */
const SECRET = { authorization: "Bearer e2e-secret-de-la-tache" };
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function emailsDe(page: Page, email: string) {
  const r = await page.request.get(`/v1/internal/test/emails?to=${encodeURIComponent(email)}`, { headers: SECRET });
  return ((await r.json()) as { emails: { subject: string; text: string }[] }).emails;
}

async function appel<T>(page: Page, method: string, url: string, body?: unknown): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ({ method, url, body }) => {
      const companyId = localStorage.getItem("baticlair.companyId");
      const r = await fetch(url, { method, headers: { "content-type": "application/json", ...(companyId ? { "x-company-id": companyId } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: r.status, body: await r.json().catch(() => ({})) };
    },
    { method, url, body },
  );
}

/** Le couvreur qui invite : un compte et son entreprise, créés par l'API (ce n'est pas lui qu'on teste). */
async function couvreurQuiInvite(browser: Browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/connexion");
  const email = `parrain-${unique()}@example.fr`;
  expect((await page.request.post("/v1/auth/sign-up/email", { data: { email, password: "motdepasse-solide-123", name: "Yann" }, headers: { origin: "http://localhost:3000" } })).status()).toBe(200);
  const c = await page.request.post("/v1/companies", { data: { name: "Toitures du Trieux", trades: ["roofing"], departement: "22" } });
  const { id } = (await c.json()) as { id: string };
  const etat = (await (await page.request.get("/v1/communaute", { headers: { "x-company-id": id } })).json()) as { invitation: { code: string; lien: string } };
  return { ctx, email, ...etat.invitation };
}

/** L'admin Mobiiz (double authentification par le code reçu dans la boîte de test), avec une entreprise pour entrer dans l'app. */
async function admin(browser: Browser) {
  const ctx = await browser.newContext({ ...(test.info().project.use as object) });
  const page = await ctx.newPage();
  await page.goto("/connexion");
  const email = "admin-groupe@example.fr";
  const r = await page.request.post("/v1/auth/sign-in/email", { data: { email, password: "motdepasse-admin-solide" }, headers: { origin: "http://localhost:3000" } });
  if (r.status() !== 200) await page.request.post("/v1/auth/sign-up/email", { data: { email, password: "motdepasse-admin-solide", name: "Admin Groupe" }, headers: { origin: "http://localhost:3000" } });
  const me = (await (await page.request.get("/v1/me")).json()) as { companies: unknown[] };
  if (!me.companies.length) await page.request.post("/v1/companies", { data: { name: "Bati Invest", trades: ["roofing"], departement: "22" } });
  await page.request.post("/v1/admin/pilotage/code");
  const mails = await emailsDe(page, email);
  const code = /(\d{6})/.exec([...mails].reverse().find((m) => /code d'accès au pilotage/.test(m.subject))!.text)![1]!;
  expect((await page.request.post("/v1/admin/pilotage/code/verifier", { data: { code } })).status()).toBe(200);
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  return { ctx, page };
}

test("invitation, liste d'attente, prévenir les inscrits : de bout en bout, une seule fois, sans fuite d'adresse", async ({ page, browser }) => {
  test.setTimeout(180_000);
  // Un département par appareil : les deux passes ne se mêlent jamais.
  const dep = test.info().project.name === "telephone" ? { code: "56", nom: "Morbihan" } : { code: "35", nom: "Ille-et-Vilaine" };
  const parrain = await couvreurQuiInvite(browser);

  // 1. Le plaquiste ouvre le lien partagé : Mobiiz se présente, rien sur celui qui invite.
  await page.goto(`/invitation/${parrain.code}`);
  await expect(page.getByRole("heading", { name: "Un artisan t'invite à découvrir Mobiiz." })).toBeVisible();
  await expect(page.getByText(/Mobiiz démarre avec les couvreurs des Côtes-d'Armor \(22\)/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(parrain.email);
  await expect(page.locator("body")).not.toContainText("Toitures du Trieux");
  await page.getByRole("link", { name: "Commencer" }).click();
  await expect(page).toHaveURL(new RegExp(`/commencer\\?invitation=${parrain.code}$`));

  // 2. Il s'inscrit : la carte, « Plaquiste », puis la case « Préviens-moi », jamais cochée d'office.
  await page.locator('path[data-region="53"]').click();
  await page.locator(`g[data-departement="${dep.code}"]`).waitFor();
  await page.locator(`g[data-departement="${dep.code}"]`).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Plaquiste", exact: true }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  const email = `placo-${unique()}@example.fr`;
  await page.getByLabel("Ton e-mail").fill(email);
  await page.getByLabel("Ton portable").fill("06 12 34 56 78");
  const prevenir = page.getByRole("checkbox", { name: new RegExp(`Préviens-moi quand Mobiiz ouvre pour les plaquistes du ${dep.code}`) });
  await expect(prevenir).not.toBeChecked();
  await prevenir.check();
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Essayer Mobiiz" }).click();
  await expect(page.getByRole("heading", { name: "Vérifie ton e-mail." })).toBeVisible();
  await confirmerEmail(page, email);
  await expect(page).toHaveURL(/\/chantiers\/nouveau/, { timeout: 15_000 });

  // 3. L'accueil : il voit clairement qu'il est sur la liste ; il a son propre lien d'invitation (jamais celui du parrain).
  await page.goto("/");
  const liste = page.getByRole("region", { name: "Tu es sur la liste" });
  await expect(liste).toBeVisible();
  await expect(liste).toContainText(`On t'écrit dès que Mobiiz ouvre pour les plaquistes du ${dep.code}.`);
  const inviter = page.getByRole("region", { name: "Invite d'autres artisans" });
  await expect(inviter).toContainText("Tu connais d'autres artisans ? Invite-les à découvrir Mobiiz. Plus on est, moins on paie.");
  const sms = await inviter.getByRole("link", { name: "SMS" }).getAttribute("href");
  expect(sms).toMatch(/^sms:/);
  expect(decodeURIComponent(sms!)).toMatch(/\/invitation\/[23456789a-z]{10}/);
  expect(decodeURIComponent(sms!)).not.toContain(parrain.code);
  expect(await inviter.getByRole("link", { name: "WhatsApp" }).getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\?text=/);
  expect(await inviter.getByRole("link", { name: "E-mail" }).getAttribute("href")).toMatch(/^mailto:\?subject=/);

  // Désinscription en un clic, puis réinscription seulement sur la case cochée.
  await liste.getByRole("button", { name: "Me désinscrire" }).click();
  const question = page.getByRole("region", { name: `Tu veux qu'on t'écrive quand Mobiiz ouvre pour les plaquistes du ${dep.code} ?` });
  await expect(question).toBeVisible();
  await expect(question.getByRole("button", { name: "M'inscrire" })).toBeDisabled();
  await question.getByRole("checkbox").check();
  await question.getByRole("button", { name: "M'inscrire" }).click();
  await expect(page.getByRole("region", { name: "Tu es sur la liste" })).toBeVisible();
  // L'encart d'invitation se ferme pour de bon (sur cet appareil).
  await inviter.getByRole("button", { name: "Fermer l'invitation" }).click();
  await page.reload();
  await expect(page.getByRole("region", { name: "Tu es sur la liste" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Invite d'autres artisans" })).toHaveCount(0);

  // 4. L'admin : qui a invité qui ; puis « Prévenir les inscrits » (aperçu, confirmation, envoi par lots).
  const a = await admin(browser);
  await a.page.goto("/admin/invitations");
  await expect(a.page.getByText(/Toitures du Trieux → /).first()).toBeVisible();
  await a.page.goto("/admin/prevenir");
  await a.page.getByLabel("Métier").selectOption("drywall");
  await a.page.getByText(new RegExp(`^${dep.code} · ${dep.nom}`)).click();
  await expect(a.page.getByText(/sera prévenue|seront prévenues/)).toBeVisible();
  await expect(a.page.getByText(`Mobiiz ouvre pour les plaquistes du ${dep.code}`, { exact: true })).toBeVisible();
  await a.page.getByRole("button", { name: /^Prévenir \d+ personnes?$/ }).click();
  await a.page.getByRole("button", { name: "Confirmer l'envoi" }).click();
  await expect(a.page.getByText("Envoi terminé")).toBeVisible({ timeout: 30_000 });
  await expect(a.page.getByRole("button", { name: "Voir le journal" }).first()).toBeVisible();

  // 5. L'e-mail reçu : un seul, à lui seul ; il ne contient l'adresse de personne d'autre.
  const recus = (await emailsDe(page, email)).filter((m) => m.subject === `Mobiiz ouvre pour les plaquistes du ${dep.code}`);
  expect(recus).toHaveLength(1);
  expect(recus[0]!.text).not.toContain(parrain.email);
  expect(recus[0]!.text).not.toContain("admin-groupe@example.fr");
  // Prévenir une deuxième fois ne le prévient plus.
  const encore = await appel<{ nombre: number; dejaPrevenus: number }>(a.page, "GET", `/v1/admin/annonces/apercu?metier=drywall&departements=${dep.code}`);
  expect(encore.body.nombre).toBe(0);

  // C'est ouvert pour lui : l'accueil ne dit plus « sur la liste ».
  await page.reload();
  await expect(page.getByRole("heading", { name: /^Bonjour/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Tu es sur la liste" })).toHaveCount(0);

  // 6. La désinscription en un clic, par le lien de l'e-mail, sans compte.
  const lien = /Ne plus recevoir ces e-mails : (\S+)/.exec(recus[0]!.text)![1]!;
  const visiteur = await browser.newPage();
  await visiteur.goto(lien.replace(/^https?:\/\/[^/]+/, ""));
  await expect(visiteur.getByRole("heading", { name: "C'est fait." })).toBeVisible();
  await expect(visiteur.getByText("Tu es désinscrit de la liste d'attente de Mobiiz.")).toBeVisible();
  await visiteur.close();
  await a.ctx.close();
  await parrain.ctx.close();
});
