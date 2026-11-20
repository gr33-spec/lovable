import { expect, test, type Browser, type Page } from "@playwright/test";
import { confirmerEmail } from "../e2e/confirmer-email";

/**
 * L'ACCUEIL PREMIUM, ZONE « ACHATS GROUPÉS » (Greg, 20 novembre 2026) : « Rejoins les couvreurs de [département] » ; un
 * groupé ouvert de son métier avec « Rejoindre » ; la règle des 3 (sous 3 entreprises, « En cours de regroupement »,
 * jamais le volume) ; à moins de 48 h, un chrono calculé sur la VRAIE clôture qui défile jusqu'à zéro puis « Clôturé » et
 * ne redémarre jamais ; aucun groupé : « Sois le premier dans ton département » vers le parcours « Besoin groupé ».
 * Les horloges du navigateur sont simulées (`page.clock`) : le serveur et ses données ne bougent pas.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
/** Un département par appareil, pris par aucun autre parcours des achats groupés. */
const ZONES: Record<string, { cp: string; ville: string; code: string; de: string }> = {
  "iphone-se": { cp: "44000", ville: "Nantes", code: "44", de: "de la Loire-Atlantique" },
  android: { cp: "49000", ville: "Angers", code: "49", de: "du Maine-et-Loire" },
  ordinateur: { cp: "53000", ville: "Laval", code: "53", de: "de la Mayenne" },
};
const zone = () => ZONES[test.info().project.name] ?? ZONES["iphone-se"]!;
const CAPTURES = process.env.ACCUEIL_CAPTURES ?? "test-results/accueil-premium";
async function capture(page: Page, nom: string) {
  await page.screenshot({ path: `${CAPTURES}/${test.info().project.name}-${nom}.png`, fullPage: true });
}
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

async function artisan(browser: Browser, prenom: string, avecAdresse = true) {
  const ctx = await browser.newContext({ ...(test.info().project.use as object) });
  const page = await ctx.newPage();
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  const email = `artisan-${unique()}@example.fr`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill(`${prenom} Martin`);
  await page.getByLabel("Nom de ton entreprise").fill(`Toitures ${unique()}`);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`^Bonjour ${prenom}`) }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  expect((await apiJson(page, "POST", "/v1/me/guide/vu")).status).toBeLessThan(300);
  if (avecAdresse) {
    expect((await apiJson(page, "PATCH", "/v1/company/profile", { address: `3 rue des Ajoncs, ${zone().cp} ${zone().ville}`, siret: "73282932000074", phone: null, email: null })).status).toBe(200);
    expect((await apiJson(page, "POST", "/v1/groupe/siret")).status).toBe(200);
  }
  await confirmerEmail(page, email);
  return { ctx, page };
}

test("Achats groupés de l'accueil : « Rejoindre », la règle des 3, le chrono qui va jusqu'à « Clôturé » sans jamais redémarrer", async ({ browser }) => {
  test.setTimeout(180_000);
  // A publie un besoin de couverture dans son département : un groupé ouvert, une seule entreprise.
  const a = await artisan(browser, "Anne");
  expect((await apiJson(a.page, "POST", "/v1/ag/habilitation", { role: "autorise" })).status).toBe(200);
  const r = await apiJson(a.page, "POST", "/v1/ag/besoins", { confirmation: true, cleIdempotence: `e2e-${unique()}`, besoins: [{ type: "gouttiere", attributs: { matiere: "zinc", developpe: "33" }, quantite: 40, unite: "m", reception: "livraison", lieu: zone().ville, dateBesoin: jourDans(40) }] });
  expect(r.status, JSON.stringify(r.body)).toBe(201);

  // B, couvreur du même département : le groupé qui se ferme le plus tôt, avec « Rejoindre ».
  const b = await artisan(browser, "Bruno");
  const { achats } = (await apiJson<{ achats: { id: string; nom: string; lot: string; ouvertJusquau: string; resume?: { entreprises: number } }[] }>(b.page, "GET", "/v1/ag/achats")).body;
  const montre = achats.find((x) => x.lot === "couverture" || x.lot === "zinguerie")!;
  expect(montre).toBeTruthy();
  const fin = Date.parse(montre.ouvertJusquau.length === 10 ? `${montre.ouvertJusquau}T23:59:59` : montre.ouvertJusquau);
  // Le navigateur de B se croit 24 h avant la vraie clôture.
  await b.page.clock.install({ time: new Date(fin - 24 * 3600 * 1000) });
  await b.page.goto("/");
  const groupes = b.page.getByRole("region", { name: "Achats groupés" });
  await expect(groupes.getByRole("link", { name: `Rejoins les couvreurs ${zone().de}` })).toHaveAttribute("href", "/achats-groupes");
  await expect(groupes.getByText(montre.nom, { exact: true })).toBeVisible();
  // La règle des 3 : sous 3 entreprises, jamais le volume ni le nombre d'entreprises.
  if ((montre.resume?.entreprises ?? 0) < 3) {
    await expect(groupes.getByText("En cours de regroupement", { exact: true })).toBeVisible();
    await expect(groupes.getByText(/ au total|\d+ m\b|\d+ entreprises?/)).toHaveCount(0);
  } else await expect(groupes.getByText(/^\d+ entreprises · .+ au total$/)).toBeVisible();
  await expect(groupes.getByRole("link", { name: "Rejoindre" })).toBeVisible();
  await capture(b.page, "groupe-24h");
  // Le chrono : à moins de 48 h, il défile.
  const chrono = groupes.getByText(/^\d\d:\d\d:\d\d$/);
  await expect(chrono).toHaveText(/^2[34]:\d\d:\d\d$/);
  const avant = await chrono.textContent();
  await b.page.clock.runFor(3000);
  await expect(chrono).not.toHaveText(avant!);
  // Il va jusqu'à zéro : « Clôturé », plus de « Rejoindre ».
  await b.page.clock.runFor(24 * 3600 * 1000 + 5000);
  await expect(groupes.getByText("Clôturé", { exact: true })).toBeVisible();
  await expect(groupes.getByRole("link", { name: "Rejoindre" })).toHaveCount(0);
  // Il ne redémarre jamais : l'accueil rouvert, toujours « Clôturé » (le serveur, lui, peut ne plus le rendre).
  await b.page.reload();
  await expect(groupes.getByText(/^2[34]:\d\d:\d\d$/)).toHaveCount(0);
  // Un toucher sur la carte mène à l'onglet Groupés.
  await groupes.getByRole("link", { name: `Rejoins les couvreurs ${zone().de}` }).click();
  await expect(b.page).toHaveURL(/\/achats-groupes$/);
  await a.ctx.close();
  await b.ctx.close();
});

test("Achats groupés de l'accueil : aucun groupé, « Sois le premier dans ton département » mène au parcours « Besoin groupé »", async ({ browser }) => {
  test.setTimeout(120_000);
  // Sans adresse ni département : aucun regroupement ne peut se montrer.
  const c = await artisan(browser, "Chloé", false);
  await c.page.goto("/");
  const groupes = c.page.getByRole("region", { name: "Achats groupés" });
  await expect(groupes.getByText("Sois le premier dans ton département")).toBeVisible();
  await expect(groupes.getByRole("link", { name: "Rejoindre" })).toHaveCount(0);
  await capture(c.page, "aucun-groupe");
  await groupes.getByRole("link", { name: "Publier un besoin groupé" }).click();
  await expect(c.page).toHaveURL(/\/achats-groupes\/publier$/);
  await c.ctx.close();
});
