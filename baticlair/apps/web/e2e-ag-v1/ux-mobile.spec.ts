import { expect, test, type Page } from "@playwright/test";
import { confirmerEmail } from "../e2e/confirmer-email";

/**
 * LOT UX MOBILE (Greg, 15 novembre 2026), la passe complète sur iPhone SE, Android et ordinateur : l'entrée
 * « Quantitatifs » à deux choix, « Publier un besoin » au-dessus du menu, la page Missions réordonnée, l'accueil en
 * tableau de bord. Sur chaque écran : aucun débordement horizontal, le menu du bas reste collé au bas de l'écran, rien ne
 * passe dessous, les grandes actions font au moins 44 px, et tout s'atteint au clavier.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const telephone = () => test.info().project.name !== "ordinateur";

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

async function inscrire(page: Page) {
  const email = `artisan-${unique()}@example.fr`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Lise Martin");
  await page.getByLabel("Nom de ton entreprise").fill(`Toitures ${unique()}`);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: /^Bonjour Lise/ }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  expect((await apiJson(page, "POST", "/v1/me/guide/vu")).status).toBeLessThan(300);
  expect((await apiJson(page, "PATCH", "/v1/company/profile", { address: "3 rue des Ajoncs, 35000 Rennes", siret: "73282932000074", phone: null, email: null })).status).toBe(200);
  expect((await apiJson(page, "POST", "/v1/groupe/siret")).status).toBe(200);
  await confirmerEmail(page, email);
}

/** Ce que chaque écran doit tenir : pas de débordement, le menu du bas fixe, rien dessous une fois tout en bas. */
async function tientSurLEcran(page: Page, nom: string) {
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `débordement horizontal sur « ${nom} »`).toBeLessThanOrEqual(0);
  if (!telephone()) return;
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(100);
  const [n, h] = [await nav.boundingBox(), page.viewportSize()!.height];
  expect(Math.abs(n!.y + n!.height - h), `le menu du bas reste collé en bas sur « ${nom} »`).toBeLessThanOrEqual(1);
  // Le dernier lien ou bouton du contenu se lit au-dessus du menu (le bouton flottant vit dans sa propre marge).
  const dernier = await page.evaluate(() => {
    const els = [...document.querySelectorAll("main a, main button")].filter((e) => getComputedStyle(e).position !== "fixed" && !e.closest("[class*='fixed']") && (e as HTMLElement).offsetParent !== null);
    const e = els[els.length - 1];
    return e ? e.getBoundingClientRect().bottom : 0;
  });
  expect(dernier, `rien sous le menu du bas sur « ${nom} »`).toBeLessThanOrEqual(n!.y + 1);
  await page.evaluate(() => window.scrollTo(0, 0));
}

test("passe mobile : Quantitatifs à deux choix, tableau de bord, Publier un besoin, Missions ; rien ne déborde ni ne passe sous le menu", async ({ page }) => {
  test.setTimeout(180_000);
  await inscrire(page);

  // 1. L'onglet « Quantitatifs » : deux choix, rien d'autre ; le suivi garde la recherche et les filtres.
  await page.goto("/chantiers");
  const choix = page.getByRole("navigation", { name: "Quantitatifs", exact: true });
  await expect(choix.getByRole("link")).toHaveCount(2);
  await expect(choix.getByRole("link", { name: /^Créer un quantitatif/ })).toHaveAttribute("href", "/chantiers/nouveau");
  await expect(choix.getByRole("link", { name: /^Suivre mes demandes/ })).toHaveAttribute("href", "/chantiers?vue=suivi");
  for (const lien of await choix.getByRole("link").all()) expect((await lien.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await tientSurLEcran(page, "Quantitatifs");
  // Au clavier : le premier choix s'atteint et s'ouvre avec Entrée.
  await choix.getByRole("link", { name: /^Suivre mes demandes/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/chantiers\?vue=suivi$/);
  await expect(page.getByRole("heading", { name: "Mes demandes", level: 1 })).toBeVisible();
  await tientSurLEcran(page, "Mes demandes");
  // Un ancien lien (recherche ou filtre dans l'adresse) ouvre toujours le suivi.
  await page.goto("/chantiers?q=ardoise");
  await expect(page.getByRole("heading", { name: "Mes demandes", level: 1 })).toBeVisible();

  // 4. L'accueil : compte vide, un seul départ ; avec une liste, elle paraît et la carte de départ s'efface.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Bonjour Lise/ })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /^Créer un quantitatif/ })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /^Voir les achats groupés|^Missions entre entreprises/ })).toHaveCount(0);
  await tientSurLEcran(page, "Accueil vide");
  const q = await apiJson<{ projetId: string }>(page, "POST", "/v1/quantitatifs", { lignes: [{ libelle: "Ardoise naturelle 32×22", quantite: "900", unite: "pièces" }] });
  expect(q.status).toBe(201);
  expect((await apiJson(page, "PATCH", `/v1/projects/${q.body.projetId}`, { name: "Toiture de la passe mobile" })).status).toBe(200);
  await page.goto("/");
  await expect(page.getByRole("main").getByText("Toiture de la passe mobile").first()).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /^Créer un quantitatif/ })).toHaveCount(0);
  for (const lien of await page.getByRole("main").getByRole("link").all()) expect((await lien.boundingBox())!.height, "cible de 44 px sur l'accueil").toBeGreaterThanOrEqual(44);
  await tientSurLEcran(page, "Accueil");

  // 2. « Publier un besoin » : flottant au-dessus du menu sur téléphone, dans l'en-tête sur ordinateur ; deux chemins.
  await page.goto("/achats-groupes");
  const publier = page.getByRole("button", { name: /Publier un besoin/ }).filter({ visible: true });
  await expect(publier).toHaveCount(1);
  if (telephone()) {
    const [b, n] = [await publier.boundingBox(), await page.getByRole("navigation", { name: "Navigation principale" }).boundingBox()];
    expect(b!.y + b!.height).toBeLessThanOrEqual(n!.y);
    expect(b!.height).toBeGreaterThanOrEqual(44);
  }
  await tientSurLEcran(page, "Achats groupés");
  await publier.focus();
  await page.keyboard.press("Enter");
  const feuille = page.getByRole("dialog", { name: "Publier un besoin" });
  await expect(feuille.getByRole("link", { name: /Choisir dans un quantitatif/ })).toHaveAttribute("href", "/achats-groupes/quantitatif");
  await expect(feuille.getByRole("link", { name: /Saisir un nouveau besoin/ })).toHaveAttribute("href", "/chantiers/nouveau?pour=achat-groupe");
  await page.keyboard.press("Escape");
  await expect(feuille).toHaveCount(0);

  // 3. Missions : recherche, trois filtres sans défilement horizontal, deux actions compactes, puis les résultats.
  await page.goto("/missions");
  const recherche = page.getByPlaceholder("Rechercher un métier ou une ville");
  const filtres = page.getByRole("button", { name: /^(Missions|Entreprises|Mes annonces)$/ }).or(page.getByRole("tab", { name: /^(Missions|Entreprises|Mes annonces)$/ }));
  await expect(filtres).toHaveCount(3);
  const actions = page.getByRole("navigation", { name: "Publier une annonce" });
  await expect(actions.getByRole("link")).toHaveText(["Je propose une mission", "Je propose mes services"]);
  const y = async (l: ReturnType<Page["locator"]>) => (await l.first().boundingBox())!.y;
  const ordre = [await y(recherche), await y(filtres), await y(actions), await y(page.getByRole("heading", { name: "Près de toi" }))];
  expect([...ordre].sort((a, b) => a - b)).toEqual(ordre);
  const largeur = page.viewportSize()!.width;
  for (const f of await filtres.all()) {
    const b = (await f.boundingBox())!;
    expect(b.x + b.width, "un filtre ne sort pas de l'écran").toBeLessThanOrEqual(largeur);
    expect(b.height).toBeGreaterThanOrEqual(44);
  }
  await tientSurLEcran(page, "Missions");
});
