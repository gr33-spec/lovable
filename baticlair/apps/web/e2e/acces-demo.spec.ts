import { expect, test } from "@playwright/test";

/**
 * L'ACCÈS DÉMO (Greg, 7 novembre 2026, option 1, test.mobiiz.fr seulement) : sur la landing, « Découvrir l'application »
 * ouvre un espace FICTIF sans inscription ni mot de passe ; le bandeau « Mode démonstration » dit sur chaque écran que tout
 * est simulé ; « Recommencer » repart d'un espace neuf ; « Quitter » revient à la landing. Rien ne part (tests de l'API).
 */
test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
});

// RETIRÉE DU PUBLIC (Greg, 11 novembre 2026) : la landing n'a plus de bouton « Découvrir l'application ». La session fictive
// reste sous test, ouverte ici par son point d'entrée (allumé dans ces parcours seulement), le temps de l'inventaire.
test("la session de démonstration (interne) : un espace fictif, le bandeau partout, puis Quitter ; la landing n'y mène plus", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Découvrir l'application" })).toHaveCount(0);
  expect(await page.evaluate(async () => (await fetch("/v1/public/demo/session", { method: "POST" })).status)).toBe(201);
  await page.goto("/");
  const bandeau = page.getByTestId("bandeau-demo");
  await expect(bandeau).toBeVisible({ timeout: 20_000 });
  await expect(bandeau).toContainText("Mode démonstration");
  await expect(bandeau).toContainText("ni paiement");
  // Les données fictives de la démo : la demande déjà chiffrée par trois négoces fictifs.
  await page.goto("/chantiers");
  await expect(page.getByText("Chantier Lannion (démo)").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("bandeau-demo")).toBeVisible();
  // Recommencer : un espace neuf, toujours fictif.
  await page.getByRole("button", { name: "Recommencer" }).click();
  await expect(page.getByTestId("bandeau-demo")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Quitter" }).click();
  await expect(page.getByRole("button", { name: "Voir Mobiiz en images" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Découvrir l'application" })).toHaveCount(0);
});
