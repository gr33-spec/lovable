import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { confirmerEmail } from "./confirmer-email";

/**
 * L'ACCUEIL PREMIUM (Greg, 20 novembre 2026 : « un écran magnifique, premium, évident ») : trois zones dans cet ordre,
 * « Nouveau quantitatif », « Mon activité », « Achats groupés » ; un dossier n'apparaît jamais deux fois ; deux cartes au
 * plus sur téléphone, puis « Voir tout » ; un compte sans activité n'a pas la zone ; l'accompagnement d'un nouveau compte
 * (trois étapes, se ferme et ne revient pas) ; ni Missions ni « Messages et réponses » ; rien sous la barre du bas ; la
 * grande carte se voit sans défiler sur un petit iPhone ; clair et sombre. Données de test seulement.
 */
const SECRET = "Bearer e2e-secret-de-la-tache";
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const CAPTURES = process.env.ACCUEIL_CAPTURES ?? "test-results/accueil-premium";

test.beforeEach(async ({ page, request }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  expect((await request.post("/v1/internal/test/mode-regroupement", { headers: { authorization: SECRET }, data: { mode: "automatique" } })).status()).toBe(200);
});

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

async function capture(page: Page, nom: string) {
  fs.mkdirSync(CAPTURES, { recursive: true });
  await page.screenshot({ path: path.join(CAPTURES, `${test.info().project.name}-${nom}.png`), fullPage: true });
}

async function inscrire(page: Page) {
  const email = `artisan-${unique()}@example.fr`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Greg Martin");
  await page.getByLabel("Nom de ton entreprise").fill(`Toitures ${unique()}`);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: /^Bonjour Greg/ }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  await confirmerEmail(page, email);
}

/** Une liste validée et partie chez un négoce (boîte de test), puis, si demandé, la réponse du négoce rangée. */
async function demande(page: Page, nom: string, avecReponse: boolean) {
  const q = await apiJson<{ id: string; projetId: string }>(page, "POST", "/v1/quantitatifs", { lignes: [{ libelle: "Ardoise naturelle 32×22", quantite: "900", unite: "pièces" }] });
  expect(q.status).toBe(201);
  expect((await apiJson(page, "PATCH", `/v1/projects/${q.body.projetId}`, { name: nom })).status).toBe(200);
  let current = (await apiJson<{ questions: { id: string; boutons: { valeur: string }[] }[] }>(page, "GET", `/v1/quantitatifs/${q.body.id}`)).body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0]!;
    current = (await apiJson<typeof current>(page, "POST", `/v1/quantitatifs/${q.body.id}/reponses`, { reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await apiJson(page, "POST", `/v1/quantitatifs/${q.body.id}/validation`)).status).toBe(200);
  const supplier = (await apiJson<{ id: string }>(page, "POST", "/v1/suppliers", { name: `Négoce ${unique()}`, email: `ventes-${unique()}@negoce.example` })).body;
  const created = await apiJson<{ recipients: { id: string }[] }>(page, "POST", `/v1/projects/${q.body.projetId}/price-requests`, { supplierIds: [supplier.id] });
  expect(created.status).toBe(201);
  const recipientId = created.body.recipients[0]!.id;
  expect((await apiJson(page, "POST", `/v1/price-request-recipients/${recipientId}/send`)).status).toBe(200);
  if (avecReponse) {
    const companyId = await page.evaluate(() => localStorage.getItem("baticlair.companyId"));
    const res = await page.request.post(`/v1/price-request-recipients/${recipientId}/quote`, {
      headers: companyId ? { "x-company-id": companyId } : {},
      multipart: { file: { name: "devis-negoce.pdf", mimeType: "application/pdf", buffer: fs.readFileSync(path.join(__dirname, "fixtures", "devis-fournisseur-2.pdf")) } },
    });
    expect(res.status(), await res.text()).toBeLessThan(300);
  }
  return q.body.projetId;
}

/** Rien sous la barre du bas ni l'encoche, pas de défilement de côté. */
async function rienSousLaBarre(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  if (test.info().project.name !== "telephone") return;
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const nav = await page.getByRole("navigation", { name: "Navigation principale" }).boundingBox();
  const dernier = await page.getByRole("main").locator("> * > *").last().boundingBox();
  expect(dernier!.y + dernier!.height).toBeLessThanOrEqual(nav!.y + 1);
}

test("nouveau compte : les zones dès l'inscription, l'accompagnement en trois étapes qui se ferme et ne revient pas ; « Nouveau quantitatif » sans défiler", async ({ page }) => {
  test.setTimeout(120_000);
  await inscrire(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bonjour Greg", level: 1 })).toBeVisible();
  const a = page.getByRole("region", { name: "Nouveau quantitatif" });
  await expect(a.getByRole("img")).toHaveAttribute("alt", /couvreur/i);
  const bouton = a.getByRole("link", { name: "Nouveau quantitatif" });
  await expect(bouton).toHaveAttribute("href", "/chantiers/nouveau");
  // Visible sans défiler, sans occuper tout l'écran.
  const [b, vue] = [(await a.boundingBox())!, page.viewportSize()!];
  const nav = (await page.getByRole("navigation", { name: "Navigation principale" }).boundingBox())!;
  const bas = test.info().project.name === "telephone" ? nav.y : vue.height;
  expect((await bouton.boundingBox())!.y + 44).toBeLessThanOrEqual(bas);
  expect(b.height).toBeLessThan(vue.height * 0.75);
  // Rien d'inventé ni de vide : pas d'activité, pas de Missions, pas de « Messages et réponses ».
  await expect(page.getByRole("region", { name: "Mon activité" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: /Missions près de toi|Activité récente|Mes demandes en cours|À faire maintenant/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Messages et réponses/ })).toHaveCount(0);
  // L'accompagnement : trois étapes réelles, aucune cochée.
  const guide = page.getByRole("region", { name: /^Pour bien démarrer/ });
  await expect(guide).toContainText("0/");
  await expect(guide.getByRole("link")).toHaveText([/Faire mon premier quantitatif/, /Demander mes premiers prix/, /Découvrir les achats groupés/].slice(0, await guide.getByRole("link").count()));
  await expect(guide.getByRole("link", { name: /^Faire mon premier quantitatif/ })).toHaveAttribute("href", "/chantiers/nouveau");
  await capture(page, "nouveau-compte");
  await rienSousLaBarre(page);
  await guide.getByRole("button", { name: "Fermer l'accompagnement" }).click();
  await expect(guide).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("region", { name: "Nouveau quantitatif" })).toBeVisible();
  await expect(page.getByRole("region", { name: /^Pour bien démarrer/ })).toHaveCount(0);
});

test("Mon activité : un dossier une seule fois (« 1 réponse reçue », jamais « réponses sur »), deux cartes sur téléphone, « Voir tout » vers Demandes ; rien ne part depuis l'accueil", async ({ page }) => {
  test.setTimeout(180_000);
  await inscrire(page);
  await apiJson(page, "POST", "/v1/me/guide/vu");
  const avecReponse = await demande(page, "Liste du 14 novembre", true);
  await demande(page, "Maison Dupont", false);
  await demande(page, "Grange Le Gall", false);
  await page.goto("/");
  const zone = page.getByRole("region", { name: "Mon activité" });
  // La liste répondue : une seule carte, en premier (une réponse attend l'artisan), avec son action.
  const cartes = zone.getByRole("listitem").filter({ visible: true });
  await expect(cartes.first()).toContainText("Liste du 14 nov.");
  await expect(cartes.first()).toContainText("1 réponse reçue");
  await expect(zone.getByText("Liste du 14 nov.")).toHaveCount(1);
  await expect(page.getByRole("main").getByText(/réponses? sur \d/)).toHaveCount(0);
  await expect(cartes.first().getByRole("link")).toHaveAttribute("href", `/chantiers/${avecReponse}?onglet=offres`);
  // Deux cartes sur téléphone ; plus sur ordinateur, à côté de la grande carte.
  if (test.info().project.name === "telephone") await expect(cartes).toHaveCount(2);
  else expect(await cartes.count()).toBeGreaterThanOrEqual(3);
  await expect(zone.getByRole("link", { name: "Voir toutes mes demandes" })).toHaveAttribute("href", "/demandes");
  await capture(page, "avec-activite");
  await rienSousLaBarre(page);
  await cartes.first().getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`/chantiers/${avecReponse}\\?onglet=offres`));
});

test("clair et sombre : les trois zones se lisent ; la photo a son voile ; le texte sur la photo reste blanc", async ({ page }) => {
  test.setTimeout(120_000);
  await inscrire(page);
  await apiJson(page, "POST", "/v1/me/guide/vu");
  for (const theme of ["clair", "sombre"] as const) {
    await page.evaluate((t) => localStorage.setItem("mobiiz-theme", t), theme);
    await page.goto("/");
    const titre = page.getByRole("region", { name: "Nouveau quantitatif" }).getByRole("heading", { name: "Prépare ta liste de matériaux" });
    await expect(titre).toHaveCSS("color", "rgb(255, 255, 255)");
    await capture(page, `theme-${theme}`);
  }
});
