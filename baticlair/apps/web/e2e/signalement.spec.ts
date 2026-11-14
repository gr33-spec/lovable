import { expect, test, type Page } from "@playwright/test";
import { confirmerEmail } from "./confirmer-email";

/**
 * SIGNALER UN PROBLÈME (Greg, 13 novembre 2026) : « Bouton « Signaler un problème » partout dans l'appli et côté négoce,
 * avec capture d'écran et page concernée jointes automatiquement. Accusé de réception automatique immédiat à l'utilisateur
 * (« Merci, on regarde »). » Téléphone et ordinateur. Aucun e-mail réel (ils sont capturés par le serveur de test).
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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

test("un artisan signale un problème depuis « Mon menu » : la page et la capture d'écran sont jointes toutes seules, puis « Merci, on regarde »", async ({ page }) => {
  test.setTimeout(120_000);
  await inscrire(page);
  await page.goto("/chantiers");
  await expect(page.getByRole("dialog", { name: "Guide" })).toHaveCount(0);
  const envoye = page.waitForRequest((r) => r.url().endsWith("/v1/signalements") && r.method() === "POST");
  await page.getByRole("button", { name: "Mon menu" }).click();
  await page.getByRole("menu", { name: "Mon menu" }).getByRole("menuitem", { name: "Signaler un problème" }).click();
  const fenetre = page.getByRole("dialog", { name: "Signaler un problème" });
  await expect(fenetre).toBeVisible();
  // Le menu s'est refermé : la capture montre l'écran, pas le menu.
  await expect(page.getByRole("menu", { name: "Mon menu" })).toHaveCount(0);
  // Rien à saisir pour la page ni pour la capture : elles sont déjà là. Aucun e-mail demandé à un compte connecté.
  await expect(fenetre).toContainText("Page jointe : /chantiers");
  await expect(fenetre.getByAltText("Capture de l'écran jointe")).toBeVisible();
  await expect(fenetre.getByLabel(/Ton e-mail/)).toHaveCount(0);
  // Sans message, rien ne part.
  await expect(fenetre.getByRole("button", { name: "Envoyer" })).toBeDisabled();
  await fenetre.getByLabel("Que se passe-t-il ?").fill("Le bouton Créer un quantitatif ne répond pas.");
  await fenetre.getByRole("button", { name: "Envoyer" }).click();
  const corps = (await envoye).postDataJSON() as { page: string; capture?: string; message: string };
  expect(corps.page).toBe("/chantiers");
  expect(corps.capture).toMatch(/^data:image\/jpeg;base64,/);
  expect(corps.capture!.length).toBeLessThan(900_000);
  await expect(fenetre.getByText("Merci, on regarde.")).toBeVisible();
  await expect(fenetre).toContainText("Tu reçois un e-mail de confirmation");
  await fenetre.getByRole("button", { name: "Fermer" }).click();
  await expect(fenetre).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});

test("côté négoce et sans compte : le bouton est en bas de page, l'e-mail est facultatif, la capture peut se retirer", async ({ page }) => {
  await page.goto("/conditions-negoce");
  const bouton = page.getByRole("button", { name: "Signaler un problème" });
  await expect(bouton).toBeVisible();
  const envoye = page.waitForRequest((r) => r.url().endsWith("/v1/public/signalements") && r.method() === "POST");
  await bouton.click();
  const fenetre = page.getByRole("dialog", { name: "Signaler un problème" });
  await expect(fenetre).toContainText("Page jointe : /conditions-negoce");
  await fenetre.getByLabel("Que se passe-t-il ?").fill("Je ne trouve pas où déposer mon offre.");
  // Sur une page négoce, on vouvoie (recette du 13 novembre 2026).
  await fenetre.getByLabel(/Votre e-mail/).fill("vendeur@example.fr");
  await fenetre.getByRole("button", { name: "Retirer la capture" }).click();
  await expect(fenetre.getByAltText("Capture de l'écran jointe")).toHaveCount(0);
  await fenetre.getByRole("button", { name: "Envoyer" }).click();
  const corps = (await envoye).postDataJSON() as { origine: string; email: string; capture?: string };
  expect(corps).toMatchObject({ origine: "negoce", email: "vendeur@example.fr" });
  expect(corps.capture).toBeUndefined();
  await expect(fenetre.getByText("Merci, on regarde.")).toBeVisible();
  // Échap ferme la fenêtre.
  await page.keyboard.press("Escape");
  await expect(fenetre).toHaveCount(0);
});
