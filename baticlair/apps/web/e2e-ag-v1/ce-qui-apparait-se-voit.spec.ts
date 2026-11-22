import { expect, test, type Locator, type Page } from "@playwright/test";
import { confirmerEmail } from "../e2e/confirmer-email";

/**
 * CE QUI APPARAÎT SE VOIT (Greg, 22 novembre 2026 : « quand je touche “longueurs” ou “m”, ce qui s'ouvre apparaît juste
 * en dessous, caché sous la barre “Continuer” ; j'ai l'impression qu'il ne se passe rien »). Sur petit iPhone : après le
 * toucher, ce qui vient d'apparaître est en vue, au-dessus de la barre « Continuer » et de la barre du bas ; son premier
 * champ est mis en avant ; rien de la page ne reste coincé sous les barres (le lien « Pas exactement ton produit ? »
 * compris).
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Comme un vrai iPhone : la zone du geste en bas (34 px) que l'émulateur ne donne pas. */
async function zoneDuGeste(page: Page) {
  await page.addStyleTag({ content: ":root { --nav-gap: 34px !important; }" });
}

async function inscrire(page: Page) {
  const email = `artisan-${unique()}@example.fr`;
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Jean Martin");
  await page.getByLabel("Nom de ton entreprise").fill(`Toitures ${unique()}`);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: /^Bonjour Jean/ }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  await confirmerEmail(page, email);
}

/** Le haut de ce qui est fixé en bas de l'écran (barre « Continuer », sinon barre du menu). */
async function hautDesBarres(page: Page): Promise<number> {
  return page.evaluate(() => {
    const h = window.innerHeight;
    let haut = h;
    for (const el of document.elementsFromPoint(window.innerWidth / 2, h - 2)) {
      let n: Element | null = el;
      while (n && n !== document.body) {
        if (getComputedStyle(n).position === "fixed") {
          haut = Math.min(haut, n.getBoundingClientRect().top);
          break;
        }
        n = n.parentElement;
      }
    }
    return haut;
  });
}

/** Fait défiler pour que `l` touche le haut des barres du bas : ce qui s'ouvre juste dessous naît caché. */
async function auRasDesBarres(page: Page, l: Locator) {
  await l.scrollIntoViewIfNeeded();
  const r = (await l.boundingBox())!;
  const barres = await hautDesBarres(page);
  await page.evaluate((d) => window.scrollBy(0, d), r.y + r.height - barres + 2);
  await page.waitForTimeout(200);
  // La page garde la place en bas (Greg, 22 novembre 2026) : on peut toujours amener un élément contre les barres.
  const apres = (await l.boundingBox())!;
  expect(Math.abs(apres.y + apres.height - (await hautDesBarres(page)))).toBeLessThanOrEqual(6);
}

/** Un toucher de doigt sur l'élément, sans le défilement que le robot de test ferait avant (le vrai téléphone ne le fait pas). */
async function toucher(l: Locator) {
  await l.dispatchEvent("click");
}

async function auDessusDesBarres(page: Page, l: Locator) {
  await expect
    .poll(async () => {
      const r = await l.boundingBox();
      return r ? r.y + r.height <= (await hautDesBarres(page)) + 1 && r.y >= 0 : false;
    }, { timeout: 5000 })
    .toBe(true);
}

test("petit iPhone : toucher « longueurs » montre la question qui s'ouvre, au-dessus de « Continuer » ; rien n'est coincé sous les barres", async ({ page }, info) => {
  test.skip(info.project.name !== "iphone-se", "Le petit iPhone est le cas qui cache le plus.");
  await inscrire(page);
  await page.goto("/achats-groupes/nouveau?type=gouttiere");
  await zoneDuGeste(page);
  await expect(page.getByRole("heading", { name: "Choisis précisément le produit" })).toBeVisible();
  await page.getByLabel("Matière").selectOption("zinc");
  await page.getByLabel("Développé").selectOption("33");
  // Comme sur le téléphone de Greg : le choix est tout en bas de ce qui se voit, juste au-dessus de la barre « Continuer ».
  const longueurs = page.getByText("longueurs", { exact: true });
  await auRasDesBarres(page, longueurs);
  await toucher(longueurs);
  // Ce qui s'ouvre (le conditionnement) est en vue, au-dessus de la barre « Continuer ».
  const conditionnement = page.getByText(/^Conditionnement/);
  await expect(conditionnement).toBeVisible();
  await auDessusDesBarres(page, conditionnement);
  // En bas de page, le dernier lien n'est jamais sous les barres.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const lien = page.getByRole("link", { name: "Je ne trouve pas mon produit" });
  await auDessusDesBarres(page, lien);
  // Le premier champ apparu (la correction du conditionnement) est amené en vue quand on l'ouvre.
  const corriger = page.getByRole("button", { name: "Corriger" });
  if (await corriger.isVisible()) {
    await corriger.click();
    await auDessusDesBarres(page, page.getByLabel(/par longueur$/));
  }
});

test("petit iPhone : « Ajoute ta quantité » (produit verrouillé), en longueurs : le lien « Pas exactement ton produit ? » se lit au-dessus des barres", async ({ page }, info) => {
  test.skip(info.project.name !== "iphone-se", "Le petit iPhone est le cas qui cache le plus.");
  await inscrire(page);
  // L'écran verrouillé, comme depuis la carte d'un achat ouvert par d'autres.
  await page.goto("/achats-groupes/nouveau?type=gouttiere&matiere=zinc&developpe=33&achat=verrouille");
  await zoneDuGeste(page);
  await expect(page.getByRole("heading", { name: "Ajoute ta quantité" })).toBeVisible();
  const longueurs = page.getByText("longueurs", { exact: true });
  await auRasDesBarres(page, longueurs);
  await toucher(longueurs);
  await auDessusDesBarres(page, page.getByText(/^Conditionnement/));
  // La barre grandit (la raison du bouton désactivé) : le bas de page garde toujours la place.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await auDessusDesBarres(page, page.getByRole("link", { name: "Pas exactement ton produit ? Saisis ton besoin" }));
});
