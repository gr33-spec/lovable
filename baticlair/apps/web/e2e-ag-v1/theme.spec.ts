import { expect, test, type Page } from "@playwright/test";
import { confirmerEmail } from "../e2e/confirmer-email";

/**
 * LE THÈME DEPUIS L'EN-TÊTE, SANS FLASH (Greg, 12 novembre 2026, dossier de corrections UX, point 14).
 * Le changement Automatique / Clair / Sombre se trouve dans l'en-tête, sur téléphone comme sur ordinateur ; le choix reste
 * gardé sur l'appareil ; au rechargement, le fond a sa couleur avant même que l'application soit arrivée ; aucun écran
 * principal ne déborde en largeur, en clair comme en sombre.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const IVOIRE = "rgb(251, 248, 243)";
const NUIT = "rgb(11, 11, 12)";

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
});

async function inscrire(page: Page) {
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Greg Exemple");
  await page.getByLabel("Nom de ton entreprise").fill(`Couverture Exemple ${unique()}`);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  const email = `artisan-${unique()}@example.fr`;
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await confirmerEmail(page, email);
}

const fondDePage = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const deborde = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("le thème se change depuis l'en-tête, reste gardé, et le fond est posé avant l'application", async ({ page }) => {
  const erreurs: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /Content Security Policy|hydrat/i.test(m.text())) erreurs.push(m.text());
  });
  await inscrire(page);
  await page.goto("/chantiers");

  // Sombre tant que rien n'est choisi ; le bouton dit le choix en cours.
  const bouton = page.getByRole("button", { name: /^Apparence : / });
  await expect(bouton).toHaveAccessibleName("Apparence : Sombre");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sombre");

  // Un appui, trois choix ; Échap referme et rend le focus au bouton.
  await bouton.click();
  const choix = page.getByRole("radiogroup", { name: "Apparence de Mobiiz" });
  await expect(choix.getByRole("radio")).toHaveText(["Automatique", "Clair", "Sombre"]);
  await expect(choix.getByRole("radio", { name: "Sombre" })).toBeChecked();
  // La fenêtre des choix tient tout entière dans l'écran (petit téléphone compris).
  const cadre = (await choix.boundingBox())!;
  expect(cadre.x).toBeGreaterThanOrEqual(0);
  expect(cadre.x + cadre.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.keyboard.press("Escape");
  await expect(choix).toBeHidden();
  await expect(bouton).toBeFocused();

  // Clair : appliqué tout de suite.
  await bouton.click();
  await choix.getByRole("radio", { name: "Clair" }).click();
  await expect(bouton).toHaveAccessibleName("Apparence : Clair");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "clair");
  await expect(page.locator(".app-clair")).toHaveCount(1);
  expect(await fondDePage(page)).toBe(IVOIRE);

  // Au rechargement SANS le code de l'application (scripts retenus) : le thème gardé est déjà posé, le fond déjà ivoire.
  await page.route("**/_next/static/**/*.js", (r) => r.abort());
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "clair");
  expect(await fondDePage(page)).toBe(IVOIRE);
  await page.unroute("**/_next/static/**/*.js");

  // Rechargement normal : toujours clair. Puis sombre, gardé lui aussi.
  await page.reload();
  await expect(page.getByRole("button", { name: "Apparence : Clair" })).toBeVisible();
  await page.getByRole("button", { name: "Apparence : Clair" }).click();
  await page.getByRole("radio", { name: "Sombre" }).click();
  await expect(page.locator(".app-nuit")).toHaveCount(1);
  await page.route("**/_next/static/**/*.js", (r) => r.abort());
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sombre");
  expect(await fondDePage(page)).toBe(NUIT);
  await page.unroute("**/_next/static/**/*.js");

  // Automatique : suit l'appareil.
  await page.reload();
  await page.getByRole("button", { name: "Apparence : Sombre" }).click();
  await page.getByRole("radio", { name: "Automatique" }).click();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator(".app-clair")).toHaveCount(1);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator(".app-nuit")).toHaveCount(1);

  expect(erreurs).toEqual([]);
});

test("aucun écran principal ne déborde en largeur, en clair comme en sombre", async ({ page }) => {
  await inscrire(page);
  for (const theme of ["clair", "sombre"] as const) {
    await page.evaluate((t) => localStorage.setItem("mobiiz-theme", t), theme);
    for (const chemin of ["/chantiers", "/missions", "/recus", "/messages", "/compte", "/abonnement", "/fournisseurs", "/notifications"]) {
      await page.goto(chemin);
      await expect(page.locator(theme === "clair" ? ".app-clair" : ".app-nuit")).toHaveCount(1);
      await expect(page.getByRole("button", { name: /^Apparence : / })).toBeVisible();
      expect(await deborde(page), `${chemin} en ${theme}`).toBeLessThanOrEqual(0);
    }
  }
});
