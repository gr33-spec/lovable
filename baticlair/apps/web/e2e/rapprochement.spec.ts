import { expect, test, type Browser, type Page } from "@playwright/test";
import { confirmerEmail } from "./confirmer-email";

/**
 * LE RAPPROCHEMENT CONTINU, À L'ÉCRAN (Greg, 6 novembre 2026, points 7 à 11) : sur une liste validée, « Rechercher des
 * besoins compatibles » ligne par ligne jusqu'à une date ; la demande individuelle reste libre ; un besoin compatible
 * d'une autre entreprise apparaît dans « Groupes › Mes groupes » (« Mes rapprochements »), sans son nom ni sa quantité ;
 * « Pas intéressé » arrête ; « Découvrir » filtre sans métier imposé. Données de test seulement, aucun vrai e-mail.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const jour = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const SECRET = "Bearer e2e-secret-de-la-tache";

/** Le guide d'accueil se referme de lui-même ; le regroupement en mode automatique (celui des collectes). */
async function passerLeGuide(page: Page) {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
}

test.beforeEach(async ({ page, request }) => {
  await passerLeGuide(page);
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

async function inscrire(page: Page, prenom: string, entreprise: string) {
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill(`${prenom} Martin`);
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  const email = `artisan-${unique()}@example.fr`;
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`^Bonjour ${prenom}`) }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  await confirmerEmail(page, email);
}

/** Une liste saisie (aucune IA), à l'adresse du chantier, validée (questions au premier bouton). */
async function listeValidee(page: Page, dep: string, designation: string, quantite: string) {
  const q = await apiJson<{ id: string; projetId: string }>(page, "POST", "/v1/quantitatifs", { lignes: [{ libelle: designation, quantite, unite: "pièces" }] });
  expect(q.status).toBe(201);
  expect((await apiJson(page, "PATCH", `/v1/projects/${q.body.projetId}`, { name: `Chantier ${unique()}`, address: `3 rue de la Gare, ${dep}100 Ville-${dep}` })).status).toBe(200);
  let courant = (await apiJson<{ questions: { id: string; boutons: { valeur: string }[] }[] }>(page, "GET", `/v1/quantitatifs/${q.body.id}`)).body;
  for (let i = 0; i < 10 && courant.questions.length > 0; i++) {
    const question = courant.questions[0]!;
    courant = (await apiJson<typeof courant>(page, "POST", `/v1/quantitatifs/${q.body.id}/reponses`, { reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await apiJson(page, "POST", `/v1/quantitatifs/${q.body.id}/validation`)).status).toBe(200);
  return q.body.projetId;
}

async function autreArtisan(browser: Browser, baseURL: string | undefined, prenom: string, entreprise: string) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await passerLeGuide(page);
  await inscrire(page, prenom, entreprise);
  return { context, page };
}

test("Rapprochement : la ligne cherche jusqu'à une date, la demande reste libre ; un besoin compatible arrive dans « Mes rapprochements » sans nom ni quantité ; « Pas intéressé »", async ({ page, browser }, info) => {
  test.setTimeout(180_000);
  // Un département à part (les autres parcours e2e partagent la base) ; tous les départements sont actifs en e2e.
  const dep = String(40 + Math.floor(Math.random() * 40)).padStart(2, "0");
  const entrepriseA = `Toitures A ${unique()}`;
  const entrepriseB = `Couvreurs B ${unique()}`;
  await inscrire(page, "Jean", entrepriseA);
  const projetA = await listeValidee(page, dep, "Ardoise naturelle 32×22 Espagne 1er choix", "900");

  // 1. Sur la liste validée : la carte, la phrase, la case de la ligne, la date, le bouton.
  await page.goto(`/chantiers/${projetA}`);
  // Deux parcours reliés (Greg, 7 novembre 2026) : les réglages détaillés sont sous « Plus d'options de regroupement ».
  await page.getByRole("button", { name: "Plus d'options de regroupement" }).click();
  const carte = page.getByRole("region", { name: "Rechercher des besoins compatibles" });
  await expect(carte).toBeVisible({ timeout: 30_000 });
  await expect(carte.getByText(/^Ta demande peut partir maintenant à tes négoces\./)).toBeVisible();
  const bouton = carte.getByRole("button", { name: "Rechercher des besoins compatibles" });
  await expect(bouton).toBeDisabled();
  await carte.getByRole("checkbox", { name: /Ardoise/ }).check();
  await carte.getByLabel("Chercher jusqu'au").fill(jour(10));
  await carte.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/rapprochement/${info.project.name}-1-recherche.png` });
  await bouton.click();
  const enRecherche = carte.getByRole("list", { name: "Lignes en recherche" });
  await expect(enRecherche.getByText(/^En recherche jusqu'au/)).toBeVisible();
  await expect(carte.getByRole("status")).toContainText(/individuelle/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

  // 2. Une autre entreprise du même secteur cherche la même ardoise : la tâche du jour la rapproche.
  const b = await autreArtisan(browser, info.project.use.baseURL, "Paul", entrepriseB);
  const projetB = await listeValidee(b.page, dep, "ardoise 32x22 espagne 1er choix", "450");
  const analyseB = (await apiJson<{ lignes: { key: string; designation: string }[] }>(b.page, "GET", `/v1/projects/${projetB}/rapprochement`)).body;
  const cleB = analyseB.lignes.find((l) => /ardoise/i.test(l.designation))!.key;
  expect((await apiJson(b.page, "POST", `/v1/projects/${projetB}/rapprochement`, { articles: [cleB], jusquau: jour(10) })).status).toBe(200);
  await b.context.close();

  // 3. Groupes › Mes groupes : « Mes rapprochements », le niveau, jamais le nom ni la quantité de l'autre.
  // Sur téléphone, la page de la liste couvre la barre du menu : « Groupes » s'ouvre par son adresse.
  await page.goto("/achats-groupes");
  await page.getByRole("tab", { name: "Mes groupes" }).click();
  const panneau = page.getByRole("region", { name: "Mes rapprochements" });
  await expect(panneau).toBeVisible({ timeout: 30_000 });
  const article = panneau.getByRole("article").first();
  await expect(article).toContainText("Rapprochement à examiner");
  await expect(article).toContainText(/correspondance exacte/i);
  await expect(article).toContainText(new RegExp(`Département ${dep}`));
  await expect(article).toContainText("moins de 5 entreprises");
  await expect(panneau).not.toContainText(entrepriseB);
  await expect(panneau).not.toContainText("450");
  await expect(article.getByRole("button", { name: "Examiner le rapprochement" })).toBeVisible();
  await page.screenshot({ path: `test-results/rapprochement/${info.project.name}-2-mes-rapprochements.png`, fullPage: true });
  // « À faire » le signale aussi, sans rien ajouter.
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "À faire" }).click();
  await expect(page.getByRole("region", { name: "À faire maintenant" })).toContainText(/Correspondance exacte pour « .*Ardoise/i);

  // 4. « Pas intéressé » : la proposition est close, plus de bouton.
  await page.goto("/achats-groupes?vue=mes-groupes");
  await panneau.getByRole("button", { name: "Pas intéressé" }).first().click();
  await expect(panneau.getByText("Tu n'es pas intéressé.").first()).toBeVisible();
});

test("Groupes › Découvrir : les filtres (produit, famille, secteur, clôture) vivent dans l'adresse ; aucun métier imposé", async ({ page }) => {
  await inscrire(page, "Jean", `Toitures ${unique()}`);
  await page.goto("/achats-groupes?vue=decouvrir");
  await expect(page.getByRole("heading", { name: "Achat en gros", level: 1 })).toBeVisible();
  // La phrase du collectif (section 17) : la même à l'écran (ordinateur) que celle du serveur.
  const { collectif } = (await apiJson<{ collectif: string }>(page, "GET", "/v1/achats-groupes/decouvrir")).body;
  expect(collectif).toMatch(/^Un achat groupé fonctionne si chacun joue sa part/);
  if (page.viewportSize()!.width >= 1024) await expect(page.getByText(collectif, { exact: true })).toBeVisible();
  const recherche = page.getByRole("search", { name: "Chercher une collecte" });
  await expect(recherche).toBeVisible();
  await recherche.getByLabel("Matériau ou produit").fill("ardoise");
  await recherche.getByRole("button", { name: "Chercher" }).click();
  await expect(page).toHaveURL(/q=ardoise/);
  await recherche.getByLabel("Secteur").selectOption("tous");
  await expect(page).toHaveURL(/departement=tous/);
  await recherche.getByLabel("Clôture avant le").fill(jour(20));
  await expect(page).toHaveURL(new RegExp(`clotureAvant=${jour(20)}`));
  // Le résultat : des collectes, ou l'écran vide qui le dit ; jamais un compteur inventé.
  await expect(page.getByRole("tabpanel", { name: "Découvrir" }).getByText(/Aucune collecte ouverte avec ces critères|Ajouter mes quantités/).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("Lot 3 : une collecte ouverte qui correspond se rejoint depuis la carte (négoce, engagement) ; la recherche garde retrait et date de besoin", async ({ page, browser }, info) => {
  test.setTimeout(180_000);
  const dep = String(40 + Math.floor(Math.random() * 40)).padStart(2, "0");
  const siret = async (p: Page) => {
    expect((await apiJson(p, "PATCH", "/v1/company/profile", { name: `Toitures ${unique()}`, address: `3 rue de la Gare, ${dep}100 Ville-${dep}`, siret: "73282932000074", phone: null, email: null })).status).toBe(200);
    expect((await apiJson(p, "POST", "/v1/groupe/siret")).status).toBe(200);
  };
  // B ouvre une collecte dans le département avec la même ardoise.
  const b = await autreArtisan(browser, info.project.use.baseURL, "Paul", `Couvreurs ${unique()}`);
  await siret(b.page);
  const projetB = await listeValidee(b.page, dep, "Ardoise naturelle 32×22 Espagne 1er choix", "450");
  const cleB = (await apiJson<{ lignes: { key: string; designation: string }[] }>(b.page, "GET", `/v1/projects/${projetB}/rapprochement`)).body.lignes[0]!.key;
  const ouvre = await apiJson(b.page, "POST", `/v1/projects/${projetB}/achat-groupe`, { confirmees: [cleB], dateBesoin: jour(30), negoces: [{ nom: "Négoce test", email: `test-${unique()}@negoce.example` }], engagement: true });
  expect(ouvre.status, JSON.stringify(ouvre.body)).toBe(201);
  await b.context.close();

  // A, même ardoise : la carte propose la collecte.
  await inscrire(page, "Jean", `Toitures ${unique()}`);
  await siret(page);
  const projetA = await listeValidee(page, dep, "Ardoise naturelle 32×22 Espagne 1er choix", "900");
  await page.goto(`/chantiers/${projetA}`);
  // Deux parcours reliés (Greg, 7 novembre 2026) : les réglages détaillés sont sous « Plus d'options de regroupement ».
  await page.getByRole("button", { name: "Plus d'options de regroupement" }).click();
  const carte = page.getByRole("region", { name: "Rechercher des besoins compatibles" });
  await expect(carte.getByText(/^Une collecte ouverte correspond/)).toBeVisible({ timeout: 30_000 });
  await carte.getByRole("button", { name: "Rejoindre cette collecte" }).click();
  const panneau = carte.getByRole("region", { name: "Rejoindre la collecte" });
  await expect(panneau).toContainText(/livraison avant le/);
  const bouton = panneau.getByRole("button", { name: "Rejoindre la collecte" });
  await expect(bouton).toBeDisabled();
  await panneau.getByLabel("Nom du négoce").fill("Négoce de Jean");
  await panneau.getByLabel("E-mail du négoce").fill(`jean-${unique()}@negoce.example`);
  await expect(bouton).toBeDisabled();
  await panneau.getByRole("checkbox", { name: /besoin réel de mon entreprise/ }).check();
  await panneau.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/rapprochement/${info.project.name}-3-rejoindre.png` });
  await bouton.click();
  await expect(carte.getByRole("status").filter({ hasText: /a rejoint la collecte/ })).toBeVisible();
  await expect(carte.getByRole("link", { name: "Voir l'achat groupé" })).toHaveAttribute("href", /\/achats-groupes\/[0-9a-f-]{36}$/);
  const cycle = (await apiJson<{ lignes: { etat: string }[] }>(page, "GET", `/v1/projects/${projetA}/cycle`)).body.lignes;
  expect(cycle[0]!.etat).toBe("dans_un_groupe");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

  // Une autre liste : la recherche garde retrait au dépôt et date de besoin.
  const projetC = await listeValidee(page, String((Number(dep) % 90) + 1).padStart(2, "0"), "Ardoise naturelle 30×20 Espagne 1er choix", "300");
  await page.goto(`/chantiers/${projetC}`);
  // Deux parcours reliés (Greg, 7 novembre 2026) : les réglages détaillés sont sous « Plus d'options de regroupement ».
  await page.getByRole("button", { name: "Plus d'options de regroupement" }).click();
  const carteC = page.getByRole("region", { name: "Rechercher des besoins compatibles" });
  await carteC.getByRole("checkbox", { name: /Ardoise/ }).check();
  await carteC.getByLabel("Besoin au plus tard le (facultatif)").fill(jour(25));
  await carteC.getByRole("radio", { name: "Retrait au dépôt" }).check();
  await carteC.getByRole("button", { name: "Rechercher des besoins compatibles" }).click();
  await expect(carteC.getByRole("list", { name: "Lignes en recherche" })).toContainText("retrait au dépôt");
  await expect(carteC.getByRole("list", { name: "Lignes en recherche" })).toContainText("besoin avant le");
});

test("Lot 5 : Découvrir par secteur, région, retrait au dépôt et sur la carte ; la recherche de besoins compatibles prend un rayon", async ({ page, browser }, info) => {
  test.setTimeout(180_000);
  const dep = String(40 + Math.floor(Math.random() * 40)).padStart(2, "0");
  const siret = async (p: Page) => {
    expect((await apiJson(p, "PATCH", "/v1/company/profile", { name: `Toitures ${unique()}`, address: `3 rue de la Gare, ${dep}100 Ville-${dep}`, siret: "73282932000074", phone: null, email: null })).status).toBe(200);
    expect((await apiJson(p, "POST", "/v1/groupe/siret")).status).toBe(200);
  };
  // B lance un achat groupé en RETRAIT AU DÉPÔT dans le département.
  const b = await autreArtisan(browser, info.project.use.baseURL, "Paul", `Couvreurs ${unique()}`);
  await siret(b.page);
  const projetB = await listeValidee(b.page, dep, "Ardoise naturelle 32×22 Espagne 1er choix", "450");
  const cleB = (await apiJson<{ lignes: { key: string }[] }>(b.page, "GET", `/v1/projects/${projetB}/rapprochement`)).body.lignes[0]!.key;
  const ouvre = await apiJson<{ achatId: string; titre: string }>(b.page, "POST", `/v1/projects/${projetB}/achat-groupe`, { confirmees: [cleB], dateBesoin: jour(30), negoces: [{ nom: "Négoce test", email: `test-${unique()}@negoce.example` }], engagement: true, modeLivraison: "retrait" });
  expect(ouvre.status, JSON.stringify(ouvre.body)).toBe(201);
  await b.context.close();

  await inscrire(page, "Jean", `Toitures ${unique()}`);
  await siret(page);
  await page.goto("/achats-groupes?vue=decouvrir");
  const recherche = page.getByRole("search", { name: "Chercher une collecte" });
  await expect(recherche.getByLabel("Secteur")).toHaveValue("mien");
  await recherche.getByLabel("Livraison").selectOption("retrait");
  await expect(page).toHaveURL(/mode=retrait/);
  const panneau = page.getByRole("tabpanel", { name: "Découvrir" });
  const carteCollecte = panneau.locator("div").filter({ hasText: ouvre.body.titre }).filter({ has: page.getByRole("link", { name: "Ajouter mes quantités" }) }).last();
  await expect(carteCollecte).toContainText("Retrait au dépôt");
  await expect(carteCollecte).toContainText(`(${dep})`);
  await recherche.getByLabel("Secteur").selectOption("rayon:100");
  await expect(page).toHaveURL(/rayon=100/);
  await expect(recherche.getByText(/Distance à vol d'oiseau entre chefs-lieux/)).toBeVisible();
  await expect(panneau.getByText(ouvre.body.titre).first()).toBeVisible();
  // La carte : un rond pour le département, qui filtre la liste.
  await page.getByRole("group", { name: "Affichage" }).getByRole("button", { name: "Carte" }).click();
  const plan = page.getByRole("region", { name: "Carte des collectes" });
  await expect(plan).toBeVisible();
  await page.screenshot({ path: `test-results/rapprochement/${info.project.name}-5-carte.png`, fullPage: true });
  await plan.getByRole("button", { name: new RegExp(`\\(${dep}\\) : \\d+ collectes?`) }).click();
  await expect(page).toHaveURL(new RegExp(`departement=${dep}`));
  await expect(panneau.getByText(ouvre.body.titre).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

  // La recherche de besoins compatibles prend un rayon, rappelé sur la ligne.
  const projetA = await listeValidee(page, dep, "Ardoise naturelle 30×20 Espagne 1er choix", "300");
  await page.goto(`/chantiers/${projetA}`);
  // Deux parcours reliés (Greg, 7 novembre 2026) : les réglages détaillés sont sous « Plus d'options de regroupement ».
  await page.getByRole("button", { name: "Plus d'options de regroupement" }).click();
  const carteA = page.getByRole("region", { name: "Rechercher des besoins compatibles" });
  await carteA.getByRole("checkbox", { name: /Ardoise/ }).check();
  await carteA.getByLabel("Secteur").selectOption("100");
  await expect(carteA.getByText(/si l'autre artisan accepte aussi la distance/)).toBeVisible();
  await carteA.getByRole("button", { name: "Rechercher des besoins compatibles" }).click();
  await expect(carteA.getByRole("list", { name: "Lignes en recherche" })).toContainText("jusqu'à 100 km");
});
