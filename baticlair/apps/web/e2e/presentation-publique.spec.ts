import { expect, test, type Page, type Request } from "@playwright/test";

/**
 * « VOIR MOBIIZ EN IMAGES » (Greg, 11 novembre 2026) : la présentation publique remplace l'ancienne démonstration. Elle
 * est STATIQUE : de vraies captures, aucun compte, aucune session, aucune écriture, aucun appel à l'API métier. Ici les
 * missions sont coupées : trois écrans, et le mot « mission » n'est jamais prononcé. (Missions ouvertes : quatre écrans,
 * `e2e-ag-v1/missions.spec.ts`.) Ce n'est pas le guide d'accueil, qui reste celui des vrais comptes.
 */
const CAPTURES = process.env.PRESENTATION_CAPTURES;

/** Tout ce qui part vers le serveur pendant la présentation. */
function ecoute(page: Page) {
  const vus: Request[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/v1/")) vus.push(r);
  });
  return vus;
}

test("« Voir Mobiiz en images » : trois écrans statiques, aucun compte ni session ni écriture ; clavier, focus, retour au même endroit", async ({ page, context }, info) => {
  await page.goto("/decouvrir");
  await page.waitForLoadState("networkidle");
  // L'ancienne démonstration n'a plus d'entrée sur la page.
  await expect(page.getByRole("button", { name: "Découvrir l'application" })).toHaveCount(0);
  await expect(page.getByText("Découvrir l'application")).toHaveCount(0);
  const bouton = page.getByRole("button", { name: "Voir Mobiiz en images" });
  await expect(bouton).toBeVisible();

  // Le visiteur a un peu défilé : à la fermeture, il doit se retrouver exactement là.
  await page.evaluate(() => window.scrollTo(0, 120));
  const avant = { y: await page.evaluate(() => window.scrollY), cookies: await context.cookies(), stockage: await page.evaluate(() => JSON.stringify({ ...localStorage })) };
  const requetes = ecoute(page);

  await bouton.click();
  const fenetre = page.getByRole("dialog", { name: "Prépare ton quantitatif" });
  await expect(fenetre).toBeVisible();
  await expect(fenetre).toHaveAttribute("aria-modal", "true");
  const photo = async (nom: string) => {
    if (!CAPTURES) return;
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${CAPTURES}/${info.project.name}/presentation-sans-missions-${nom}.png` });
    if (page.viewportSize()!.width < 900) {
      const taille = page.viewportSize()!;
      await page.setViewportSize({ width: 320, height: 568 });
      await page.waitForTimeout(250);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), "petit téléphone : aucun débordement").toBeLessThanOrEqual(0);
      await expect(page.getByRole("dialog").getByRole("button", { name: "Fermer la présentation" })).toBeInViewport();
      // Sur le plus petit écran aussi, les boutons du pied restent à l'écran (jamais à chercher en défilant).
      for (const b of await page.getByRole("dialog").locator(".mz2-pres-pied").locator("button, a").all()) await expect(b).toBeInViewport({ ratio: 1 });
      await page.screenshot({ path: `${CAPTURES}/petit-telephone/presentation-sans-missions-${nom}.png` });
      await page.setViewportSize(taille);
    }
  };
  const ecrans: [string, RegExp][] = [
    ["Prépare ton quantitatif", /vérifie chaque ligne et chaque quantité/],
    ["Consulte tes négoces", /envoyée jusqu'à 5 négoces/],
    ["Achète à plusieurs", /à part de tes demandes individuelles/],
  ];
  const dialogue = page.getByRole("dialog");
  for (const [i, [titre, texte]] of ecrans.entries()) {
    await expect(dialogue.getByRole("heading", { name: titre, exact: true })).toBeVisible();
    await expect(dialogue.getByText(texte)).toBeVisible();
    await expect(dialogue.getByText(`${i + 1} sur 3`, { exact: true })).toBeVisible();
    await expect(dialogue.getByText("Exemple", { exact: true })).toBeVisible();
    // « Fermer » toujours visible ; une vraie capture, chargée ; aucun débordement.
    await expect(dialogue.getByRole("button", { name: "Fermer la présentation" })).toBeInViewport();
    const image = dialogue.locator("img");
    await expect(image).toHaveAttribute("src", /\/landing\/v3\/pres-(quantitatif|negoces|groupes)-900\.webp$/);
    await expect.poll(() => image.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0)).toBe(true);
    expect((await image.getAttribute("alt"))!.length).toBeGreaterThan(30);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await photo(String(i + 1));
    await expect(dialogue.getByRole("button", { name: "Précédent" })).toBeEnabled({ enabled: i > 0 });
    if (i < ecrans.length - 1) await dialogue.getByRole("button", { name: "Suivant" }).click();
  }
  // Missions coupées : le mot n'est jamais prononcé ; aucun prix, aucune économie promise, jamais « IA ».
  const dit = await dialogue.innerText();
  expect(dit).not.toMatch(/missions?/i);
  expect(dit).not.toMatch(/€|\b(IA|automatiques?|garanti\w*|économi\w*)\b/i);
  // Le dernier écran : « Commencer gratuitement » vers l'inscription, et « Fermer » ; plus de « Suivant ».
  await expect(dialogue.getByRole("button", { name: "Suivant" })).toHaveCount(0);
  await expect(dialogue.getByRole("link", { name: "Commencer gratuitement" })).toHaveAttribute("href", "/inscription");
  await expect(dialogue.getByRole("button", { name: "Fermer", exact: true })).toBeVisible();
  // « Précédent » revient en arrière ; les flèches du clavier aussi.
  await dialogue.getByRole("button", { name: "Précédent" }).click();
  await expect(dialogue.getByText("2 sur 3", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(dialogue.getByText("1 sur 3", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialogue.getByText("2 sur 3", { exact: true })).toBeVisible();
  // Le focus reste dans la fenêtre : dix tabulations plus tard, il y est toujours.
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')), `tabulation ${i + 1}`).toBe(true);
  }
  // Échap ferme, le focus revient au bouton, la page n'a pas bougé.
  await page.keyboard.press("Escape");
  await expect(dialogue).toHaveCount(0);
  await expect(bouton).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(avant.y);
  // Rouverte, elle repart du premier écran ; « Fermer » la ferme aussi, toujours au même endroit.
  await bouton.click();
  await expect(dialogue.getByText("1 sur 3", { exact: true })).toBeVisible();
  await dialogue.getByRole("button", { name: "Fermer la présentation" }).click();
  await expect(dialogue).toHaveCount(0);
  await expect(bouton).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(avant.y);

  // AUCUNE ÉCRITURE, AUCUN COMPTE, AUCUNE SESSION : pendant toute la présentation, rien d'autre que la lecture publique
  // des réglages (route de santé) ; jamais l'ancien point d'entrée de la démonstration ; cookies et stockage inchangés.
  expect(requetes.filter((r) => r.method() !== "GET").map((r) => `${r.method()} ${new URL(r.url()).pathname}`)).toEqual([]);
  expect(requetes.map((r) => new URL(r.url()).pathname).filter((p) => p !== "/v1/health")).toEqual([]);
  expect(await context.cookies()).toEqual(avant.cookies);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(avant.stockage);
  // Toujours visiteur : l'app reste fermée.
  expect((await page.request.get("/v1/me")).status()).toBe(401);
});

test("« Commencer gratuitement », au dernier écran de la présentation, mène à l'inscription", async ({ page }) => {
  await page.goto("/decouvrir");
  await page.getByRole("button", { name: "Voir Mobiiz en images" }).click();
  const dialogue = page.getByRole("dialog");
  await dialogue.getByRole("button", { name: "Suivant" }).click();
  await dialogue.getByRole("button", { name: "Suivant" }).click();
  await dialogue.getByRole("link", { name: "Commencer gratuitement" }).click();
  await expect(page).toHaveURL(/\/inscription$/);
});
