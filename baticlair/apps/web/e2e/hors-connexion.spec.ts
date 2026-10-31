import { expect, test } from "@playwright/test";

/**
 * HORS CONNEXION (revue du 26 octobre 2026) : le service worker garde sur l'appareil les pages déjà vues et précharge
 * « Pas de réseau pour l'instant ». Chromium ne coupe pas le réseau du service worker en test (`setOffline`) : on vérifie
 * donc le cache lui-même, puis la page de secours telle qu'elle s'affiche, et le cache vidé à la demande (déconnexion).
 */
test("les pages vues sont gardées sur l'appareil, « Pas de réseau » est prête, le cache se vide à la déconnexion", async ({ page }) => {
  await page.goto("/mentions-legales");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Mentions légales" })).toBeVisible();
  const enCache = () =>
    page.evaluate(async () => {
      const nom = (await caches.keys()).find((c) => c.endsWith("-pages"));
      if (!nom) return [];
      return (await (await caches.open(nom)).keys()).map((r) => new URL(r.url).pathname);
    });
  await expect.poll(enCache).toEqual(expect.arrayContaining(["/hors-connexion", "/mentions-legales"]));
  // Jamais en cache : l'authentification et l'admin.
  const donnees = await page.evaluate(async () => {
    const nom = (await caches.keys()).find((c) => c.endsWith("-donnees"));
    return nom ? (await (await caches.open(nom)).keys()).map((r) => new URL(r.url).pathname) : [];
  });
  expect(donnees.filter((p) => /^\/v1\/(auth|admin)/.test(p))).toEqual([]);

  await page.goto("/hors-connexion");
  await expect(page.getByRole("heading", { name: "Pas de réseau pour l'instant" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Réessayer" })).toHaveAttribute("href", "/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  // Déconnexion ou suppression du compte : plus rien de ce compte sur l'appareil.
  await page.evaluate(async () => {
    navigator.serviceWorker.controller?.postMessage("vider");
    await Promise.all((await caches.keys()).map((c) => caches.delete(c)));
  });
  expect(await page.evaluate(async () => (await caches.keys()).length)).toBe(0);
});
