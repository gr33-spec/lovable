import { expect, test, type Browser, type Page } from "@playwright/test";
import { confirmerEmail } from "../e2e/confirmer-email";

/**
 * « MON SITE » ET « ENTRE PROS » (Greg, 16 novembre 2026) : une seule page, deux niveaux. Dans Mission, le profil d'une
 * entreprise ouvre son site ; une entreprise connectée y voit en plus le bloc « Entre pros » (disponibilités, compétences,
 * « Proposer une mission ») ; un visiteur non connecté ne le voit jamais. Ni CV, ni diplôme, ni attestation affichés.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const CAPTURES = process.env.AG_CAPTURES ?? "test-results/ag-v1";
const jourDans = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

async function apiJson<T = unknown>(page: Page, method: string, url: string, body?: unknown): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ({ method, url, body }) => {
      const companyId = localStorage.getItem("baticlair.companyId");
      const res = await fetch(url, { method, headers: { "content-type": "application/json", accept: "application/json", ...(companyId ? { "x-company-id": companyId } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: res.status, body: (await res.json().catch(() => null)) as T };
    },
    { method, url, body },
  );
}

async function nouvelArtisan(browser: Browser, prenom: string, entreprise: string) {
  const ctx = await browser.newContext({ ...(test.info().project.use as object) });
  const page = await ctx.newPage();
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  const email = `artisan-${unique()}@example.fr`;
  const nom = `${entreprise} ${unique().slice(-5)}`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill(`${prenom} Martin`);
  await page.getByLabel("Nom de ton entreprise").fill(nom);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
  expect((await apiJson(page, "PATCH", "/v1/company/profile", { address: "3 rue des Ajoncs, 22300 Lannion", siret: "73282932000074", phone: "06 12 34 56 78", email: null })).status).toBe(200);
  expect((await apiJson(page, "POST", "/v1/groupe/siret")).status).toBe(200);
  await confirmerEmail(page, email);
  const companyId = (await apiJson<{ companies: { id: string }[] }>(page, "GET", "/v1/me")).body.companies[0]!.id;
  return { ctx, page, nom, companyId };
}

test("Entre pros : le profil Mission ouvre le site ; une entreprise connectée voit disponibilités, compétences et « Proposer une mission » ; un visiteur jamais", async ({ browser }) => {
  test.setTimeout(240_000);
  const a = await nouvelArtisan(browser, "Yann", "Toitures Le Bihan");
  const b = await nouvelArtisan(browser, "Greg", "Couverture Martin");

  // A : son site en ligne, son profil Mission, une disponibilité publiée, un CV dans son dossier (jamais montré).
  expect((await apiJson(a.page, "PATCH", "/v1/ma-page", { visible: true, accroche: "Ardoise naturelle et zinc, du Trégor au Goëlo.", zone: "Lannion" })).status).toBe(200);
  expect((await apiJson(a.page, "PUT", "/v1/profil-public", { visible: true, presentation: "Équipe de deux couvreurs.", metiers: ["Ardoise naturelle", "Zinc joint debout", "Travail en hauteur"], services: null, equipe: "2 personnes", ville: "Lannion" })).status).toBe(200);
  const dispo = await apiJson<{ id: string }>(a.page, "POST", "/v1/missions/annonces", { type: "disponibilite", metier: "Couverture - Toiture", ville: "Lannion", codePostal: "22300", rayonKm: 40, debut: jourDans(5), fin: jourDans(20), types: ["renfort"], presentation: "Équipe de 2 disponible.", tarifJour: null, tarifUnite: "personne", dureeMinJours: 2, negociable: true });
  expect(dispo.status).toBe(201);
  const adresse = (await apiJson<{ reglages: { adresse: string } }>(a.page, "GET", "/v1/ma-page")).body.reglages.adresse;
  await apiJson(a.page, "POST", "/api/pages-entreprises/rafraichir", {});

  // B, connecté : depuis Mission, le profil de A ouvre son site, avec le bloc « Entre pros ».
  await b.page.goto(`/missions/profil/${a.companyId}`);
  await expect(b.page).toHaveURL(new RegExp(`/e/${adresse}`));
  const bloc = b.page.getByRole("region", { name: "Besoin de renfort sur un chantier ?" });
  await expect(bloc).toBeVisible();
  await expect(bloc.getByText("Entre pros", { exact: true })).toBeVisible();
  await expect(bloc.getByRole("heading", { name: "Disponibilités" })).toBeVisible();
  await expect(bloc.getByText(/^Disponible du /)).toBeVisible();
  await expect(bloc.getByRole("heading", { name: "Compétences" })).toBeVisible();
  await expect(bloc.getByText("Zinc joint debout")).toBeVisible();
  await expect(bloc.getByRole("link", { name: "Proposer une mission" })).toHaveAttribute("href", `/missions/${dispo.body.id}`);
  await expect(b.page.getByText(/CV|diplôme/i)).toHaveCount(0);
  const deborde = await b.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(deborde).toBeLessThanOrEqual(0);
  await bloc.scrollIntoViewIfNeeded();
  await b.page.screenshot({ path: `${CAPTURES}/${test.info().project.name}/entre-pros-connecte.png` });
  await b.page.screenshot({ path: `${CAPTURES}/${test.info().project.name}/entre-pros-connecte-page.png`, fullPage: true });
  // « Proposer une mission » mène à la disponibilité (le contact passe par Mission, jamais libre).
  await bloc.getByRole("link", { name: "Proposer une mission" }).click();
  await expect(b.page).toHaveURL(new RegExp(`/missions/${dispo.body.id}$`));

  // Un visiteur non connecté : le même site, jamais le bloc.
  const v = await browser.newContext({ ...(test.info().project.use as object) });
  const vp = await v.newPage();
  await vp.goto(`/e/${adresse}`);
  await expect(vp.getByRole("heading", { level: 1 })).toBeVisible();
  await vp.waitForLoadState("networkidle");
  await expect(vp.getByText("Entre pros")).toHaveCount(0);
  await expect(vp.getByText("Proposer une mission")).toHaveCount(0);
  await expect(vp.getByText("Zinc joint debout")).toHaveCount(0);
  await vp.screenshot({ path: `${CAPTURES}/${test.info().project.name}/entre-pros-visiteur.png` });

  // A voit son propre bloc tel que les entreprises le voient ; son onglet « Mon site ».
  await a.page.goto(`/e/${adresse}`);
  await expect(a.page.getByRole("region", { name: "Ce que voient les entreprises connectées" })).toBeVisible();
  await a.page.goto("/mon-site");
  await expect(a.page.getByRole("heading", { name: "Mon site", level: 1 })).toBeVisible();
  await a.page.screenshot({ path: `${CAPTURES}/${test.info().project.name}/mon-site-onglet.png` });
  await a.page.screenshot({ path: `${CAPTURES}/${test.info().project.name}/mon-site-onglet-page.png`, fullPage: true });
  await Promise.all([a.ctx.close(), b.ctx.close(), v.close()]);
});
