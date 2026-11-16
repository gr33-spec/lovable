import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * MA PAGE MOBIIZ (Greg, 16 novembre 2026) : le parcours complet, sur téléphone (Pixel 7, et petit iPhone 375 px plus bas)
 * et sur ordinateur. L'artisan règle sa page depuis Profil › Ma page (modèle, couleur, textes, photo), la rend visible ;
 * un visiteur sans compte la voit (bouton « Appeler » toujours visible sur téléphone, données structurées, image
 * d'aperçu), écrit à l'entreprise et peut la signaler. Une page privée n'existe pas pour un visiteur ; un autre compte ne
 * voit rien de la page d'un autre. Thèmes clair et sombre de l'application.
 *
 * Captures (rapport) : `CAPTURES_MA_PAGE=<dossier>` écrit les trois modèles, couvreur et peintre ; sans la variable, aucune.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const PHOTO = "e2e/fixtures/chantier-toiture.jpg";

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
});

async function inscrire(page: Page, entreprise: string, metier = "Couverture, charpente, zinguerie") {
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Greg Martin");
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: metier }).click();
  await page.getByLabel("E-mail professionnel").fill(`artisan-${unique()}@example.fr`);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
}

const enregistre = (page: Page) => expect(page.getByText("Enregistré : ta page est à jour.")).toBeVisible();
const apercu = (page: Page) => page.locator("[data-testid=apercu-page]:visible").first();

async function sansDefilementHorizontal(page: Page) {
  const deborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(deborde).toBeLessThanOrEqual(1);
}

async function visiteur(browser: Browser, appareil: { viewport: { width: number; height: number }; isMobile: boolean; hasTouch: boolean }) {
  const ctx = await browser.newContext({ ...appareil, baseURL: "http://localhost:3000" });
  return ctx.newPage();
}

test("Ma page : réglée depuis le profil, privée par défaut, publiée, vue par un visiteur, contact et signalement", async ({ page, browser }, info) => {
  test.setTimeout(240_000);
  const nom = `Toits Martin ${unique()}`;
  await inscrire(page, nom);
  await page.goto("/compte");
  await page.getByRole("link", { name: /Ma page/ }).first().click();
  await expect(page.getByRole("heading", { name: "Ma page", level: 1 })).toBeVisible();
  await expect(page.getByRole("switch", { name: /Page visible/ })).toHaveAttribute("aria-checked", "false");
  // L'aperçu est déjà là, prérempli depuis le profil (le nom, le métier).
  await expect(apercu(page).locator("h1")).toHaveText(nom);
  await expect(apercu(page).getByText("Couvreur").first()).toBeVisible();
  const adresse = ((await page.getByText(/\/e\/[a-z0-9-]+$/).first().textContent()) ?? "").split("/e/")[1]!.trim();
  expect(adresse).toMatch(/^toits-martin-/);

  // Privée : un visiteur ne la voit pas.
  const v = await visiteur(browser, { viewport: page.viewportSize()!, isMobile: info.project.name === "telephone", hasTouch: info.project.name === "telephone" });
  await v.goto(`/e/${adresse}`);
  await expect(v.getByRole("heading", { name: "Page introuvable" })).toBeVisible();

  // Le modèle se voit en direct dans l'aperçu (trois architectures).
  await page.getByRole("radio", { name: "Classique en colonnes" }).click();
  await expect(apercu(page).locator(".pe-grille")).toBeVisible();
  await page.getByRole("radio", { name: "Sobre et direct" }).click();
  await expect(apercu(page).locator(".pe-sobre-tete")).toBeVisible();
  await enregistre(page);
  // Couleur du nuancier, fond sombre.
  await page.getByRole("radio", { name: "Bleu nuit" }).click();
  await page.getByRole("radio", { name: "Fond sombre" }).click();
  await enregistre(page);
  // Textes, téléphone, zone, certification.
  await page.getByRole("textbox", { name: /^Accroche/ }).fill("Ardoise, zinc et tuile autour de Lannion");
  await page.getByRole("textbox", { name: /^Présentation/ }).fill("Couvreur depuis 15 ans, nous refaisons vos toitures avec soin.");
  await page.getByRole("textbox", { name: /^Téléphone/ }).fill("02 96 11 22 33");
  await page.getByRole("textbox", { name: /^Zone d'intervention/ }).fill("Lannion");
  await page.getByRole("button", { name: "Assurance décennale" }).click();
  await enregistre(page);
  await expect(apercu(page).getByText("Ardoise, zinc et tuile autour de Lannion")).toBeVisible();
  // « Mobiiz m'aide à l'écrire » propose, rien n'est remplacé sans l'artisan.
  await page.getByRole("button", { name: "Mobiiz m'aide à l'écrire" }).click();
  await expect(page.getByTestId("proposition")).toBeVisible();
  await page.getByRole("button", { name: "Garder les miens" }).click();
  await expect(page.getByRole("textbox", { name: /^Accroche/ })).toHaveValue("Ardoise, zinc et tuile autour de Lannion");
  // Une photo de chantier : envoyée telle quelle, préparée par Mobiiz en arrière-plan.
  await page.locator('input[type=file][multiple]').setInputFiles(PHOTO);
  await expect(page.getByRole("list", { name: "Photos de chantiers" }).locator("img")).toHaveCount(1, { timeout: 30_000 });
  // Publier.
  await page.getByRole("switch", { name: /Page visible/ }).click();
  await enregistre(page);
  await expect(page.getByRole("link", { name: "Voir ma page" })).toHaveAttribute("href", `/e/${adresse}`);
  await page.getByRole("button", { name: "Partager" }).click();
  await expect(page.getByRole("dialog", { name: "Partager ma page" }).getByRole("img", { name: /QR code/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Envoyer sur WhatsApp" })).toHaveAttribute("href", /wa\.me/);
  await page.getByRole("button", { name: "Fermer" }).click();

  // Le visiteur : la page tout de suite à jour (cache régénéré), rien d'autre de Mobiiz.
  await v.goto(`/e/${adresse}`);
  await expect(v.getByRole("heading", { name: nom, level: 1 })).toBeVisible();
  await expect(v.getByText("Ardoise, zinc et tuile autour de Lannion")).toBeVisible();
  await expect(v.getByText("Assurance décennale")).toBeVisible();
  await expect(v.getByRole("navigation", { name: "Navigation principale" })).toHaveCount(0);
  await expect(v).toHaveTitle(`Couvreur à Lannion – ${nom}`);
  const ld = JSON.parse((await v.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld).toMatchObject({ "@type": "RoofingContractor", name: nom, telephone: "02 96 11 22 33", areaServed: "Lannion" });
  expect(ld).not.toHaveProperty("address");
  expect(await v.locator('meta[property="og:image"]').getAttribute("content")).toMatch(/partage\.jpg|apercu\.png/);
  await expect(v.locator(".pe-galerie img")).toHaveCount(1);
  if (info.project.name === "telephone") {
    // Le bouton « Appeler » reste visible en bas, même après avoir fait défiler.
    await v.mouse.wheel(0, 3000);
    await expect(v.getByRole("navigation", { name: "Contacter l'entreprise" }).getByRole("link", { name: "Appeler" })).toBeInViewport();
    await expect(v.getByRole("navigation", { name: "Contacter l'entreprise" }).getByRole("link", { name: "Appeler" })).toHaveAttribute("href", "tel:0296112233");
  } else {
    await expect(v.locator(".pe-entete-appel")).toBeVisible();
  }
  await sansDefilementHorizontal(v);

  // Contact : sans exposer l'e-mail de l'entreprise.
  expect(await v.content()).not.toContain("@example.fr");
  await v.getByLabel("Votre nom").fill("Paul Client");
  await v.getByLabel("Téléphone").fill("06 00 00 00 00");
  await v.getByLabel("Votre projet").fill("Bonjour, j'ai une fuite sur ma toiture.");
  await v.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(v.getByRole("status").filter({ hasText: "Message envoyé" })).toBeVisible();
  // Signaler cette page.
  await v.getByText("Signaler cette page").click();
  await v.getByRole("radio", { name: "Cette page usurpe une entreprise" }).check();
  await v.getByRole("button", { name: "Envoyer le signalement" }).click();
  await expect(v.getByText("Merci, l'équipe Mobiiz va regarder cette page.")).toBeVisible();

  // Repasser en privée : la page disparaît tout de suite pour le visiteur.
  await page.getByRole("switch", { name: /Page visible/ }).click();
  await enregistre(page);
  await v.goto(`/e/${adresse}`);
  await expect(v.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await v.context().close();
});

test("Ma page : deux comptes, chacun ne voit et ne règle que la sienne", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const a = `Toits Martin ${unique()}`;
  await inscrire(page, a);
  await page.goto("/compte/ma-page");
  await page.getByRole("textbox", { name: /^Accroche/ }).fill("Accroche privée de A");
  await enregistre(page);
  const ctxB = await browser.newContext({ baseURL: "http://localhost:3000", viewport: page.viewportSize()! });
  const b = await ctxB.newPage();
  await b.addLocatorHandler(b.getByRole("dialog", { name: "Guide" }), async () => {
    await b.getByRole("button", { name: "Passer le guide" }).click();
  });
  const nomB = `Peinture Le Gall ${unique()}`;
  await inscrire(b, nomB, "Peinture");
  await b.goto("/compte/ma-page");
  await expect(apercu(b).locator("h1")).toHaveText(nomB);
  await expect(b.getByText("Accroche privée de A")).toHaveCount(0);
  await expect(b.getByText(a)).toHaveCount(0);
  // Le peintre a l'ambiance de son métier (visuel de finitions), le couvreur la sienne.
  await expect(b.getByText("Sans photo : un visuel « peintre » à tes couleurs.")).toBeVisible();
  await ctxB.close();
});

test("Ma page : l'éditeur dans les thèmes clair et sombre de l'application, sans défilement horizontal", async ({ page }) => {
  test.setTimeout(120_000);
  await inscrire(page, `Toits Martin ${unique()}`);
  for (const theme of ["clair", "sombre"]) {
    await page.evaluate((t) => localStorage.setItem("mobiiz-theme", t), theme);
    await page.goto("/compte/ma-page");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.getByRole("heading", { name: "Ma page", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mobiiz m'aide à l'écrire" })).toBeVisible();
    await sansDefilementHorizontal(page);
  }
});

test.describe("petit iPhone (375 px)", () => {
  test.use({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test("Ma page : les trois modèles, couvreur et peintre, tiennent sur un petit écran (captures du rapport)", async ({ page, browser }, info) => {
    test.skip(info.project.name !== "telephone", "une seule passe suffit");
    test.setTimeout(300_000);
    const dossier = process.env.CAPTURES_MA_PAGE;
    const cas = [
      { nom: `Toits Martin ${unique()}`.slice(0, 32), metier: "Couverture, charpente, zinguerie", court: "couvreur", accroche: "Ardoise, zinc et tuile autour de Lannion", zone: "Lannion", presentation: "Couvreur depuis 2008 : réfection de toitures en ardoise naturelle, zinguerie et réparations après tempête. Devis clair, chantier propre et bâché chaque soir.", photo: process.env.PHOTO_COUVREUR ?? PHOTO, galerie: process.env.GALERIE_COUVREUR },
      { nom: `Couleurs Le Gall ${unique()}`.slice(0, 32), metier: "Peinture", court: "peintre", accroche: "Peinture intérieure et façades à Saint-Brieuc", zone: "Saint-Brieuc", presentation: "Peintres en bâtiment : murs, plafonds, boiseries et ravalements. Protection des meubles et nettoyage compris.", photo: process.env.PHOTO_PEINTRE ?? PHOTO, galerie: process.env.GALERIE_PEINTRE },
    ];
    for (const c of cas) {
      const ctx = await browser.newContext({ baseURL: "http://localhost:3000", viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      const p = await ctx.newPage();
      await p.addLocatorHandler(p.getByRole("dialog", { name: "Guide" }), async () => {
        await p.getByRole("button", { name: "Passer le guide" }).click();
      });
      await inscrire(p, c.nom, c.metier);
      await p.goto("/compte/ma-page");
      await p.getByRole("textbox", { name: /^Accroche/ }).fill(c.accroche);
      await p.getByRole("textbox", { name: /^Présentation/ }).fill(c.presentation);
      await p.getByRole("textbox", { name: /^Téléphone/ }).fill("02 96 11 22 33");
      await p.getByRole("textbox", { name: /^Zone d'intervention/ }).fill(c.zone);
      await p.getByRole("button", { name: "Assurance décennale" }).click();
      await p.getByRole("button", { name: "RGE" }).click();
      await enregistre(p);
      await p.locator('input[type=file]:not([multiple])').nth(1).setInputFiles(c.photo);
      await expect(p.getByAltText("Photo de couverture")).toBeVisible({ timeout: 30_000 });
      const galerie = (c.galerie ?? PHOTO).split(",");
      await p.locator('input[type=file][multiple]').setInputFiles(galerie);
      await expect(p.getByRole("list", { name: "Photos de chantiers" }).locator("img")).toHaveCount(galerie.length, { timeout: 60_000 });
      await p.getByRole("switch", { name: /Page visible/ }).click();
      await enregistre(p);
      const adresse = ((await p.getByText(/\/e\/[a-z0-9-]+$/).first().textContent()) ?? "").split("/e/")[1]!.trim();
      for (const modele of ["Plein écran photo", "Classique en colonnes", "Sobre et direct"]) {
        await p.getByRole("radio", { name: modele }).click();
        await enregistre(p);
        const v = await ctx.newPage();
        await v.goto(`/e/${adresse}`);
        await expect(v.getByRole("heading", { level: 1 })).toBeVisible();
        await sansDefilementHorizontal(v);
        if (dossier) {
          await v.waitForTimeout(500);
          const id = modele.startsWith("Plein") ? "1-plein-ecran-photo" : modele.startsWith("Classique") ? "2-classique-colonnes" : "3-sobre-direct";
          await v.screenshot({ path: `${dossier}/${c.court}-${id}.png` });
          await v.screenshot({ path: `${dossier}/${c.court}-${id}-page-entiere.png`, fullPage: true });
        }
        await v.close();
      }
      if (dossier) await p.screenshot({ path: `${dossier}/${c.court}-editeur.png` });
      await ctx.close();
    }
  });
});
