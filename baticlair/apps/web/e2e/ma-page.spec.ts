import { readFileSync } from "node:fs";
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
  // L'aperçu est déjà là, prérempli depuis le profil : le grand titre est le métier, le nom dessous ; les prestations du
  // métier sont proposées.
  await expect(apercu(page).locator("h1")).toHaveText("Couvreur");
  await expect(apercu(page).locator(".pe-accueil-nom")).toHaveText(nom);
  await expect(apercu(page).getByText("Zinguerie").first()).toBeVisible();
  const adresse = ((await page.getByText(/\/e\/[a-z0-9-]+$/).first().textContent()) ?? "").split("/e/")[1]!.trim();
  expect(adresse).toMatch(/^toits-martin-/);

  // Privée : un visiteur ne la voit pas.
  const v = await visiteur(browser, { viewport: page.viewportSize()!, isMobile: info.project.name === "telephone", hasTouch: info.project.name === "telephone" });
  await v.goto(`/e/${adresse}`);
  await expect(v.getByRole("heading", { name: "Page introuvable" })).toBeVisible();

  // Un seul modèle ; une des quatre teintes.
  await expect(page.getByRole("radio", { name: "Classique en colonnes" })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "Fond sombre" })).toHaveCount(0);
  await page.getByRole("radio", { name: "Bleu nuit" }).click();
  await enregistre(page);
  // Une prestation se retire.
  await page.getByRole("button", { name: "Retirer la prestation Entretien et démoussage" }).click();
  await enregistre(page);
  // Textes, téléphone, zone, certification.
  await page.getByRole("textbox", { name: /^Accroche/ }).fill("Ardoise, zinc et tuile autour de Lannion");
  await page.getByRole("textbox", { name: /^Présentation/ }).fill("Couvreur depuis 15 ans, nous refaisons vos toitures avec soin.");
  await page.getByRole("textbox", { name: /^Téléphone/ }).fill("02 96 11 22 33");
  await page.getByRole("textbox", { name: /^Zone d'intervention/ }).fill("Lannion");
  await page.getByRole("button", { name: "Assurance décennale" }).click();
  await enregistre(page);
  await expect(apercu(page).locator("h1")).toHaveText("Couvreur à Lannion");
  await expect(apercu(page).getByText("Ardoise, zinc et tuile autour de Lannion")).toBeVisible();
  // « Mobiiz m'aide à l'écrire » propose, rien n'est remplacé sans l'artisan.
  await page.getByRole("button", { name: "Mobiiz m'aide à l'écrire" }).click();
  await expect(page.getByTestId("proposition")).toBeVisible();
  await page.getByRole("button", { name: "Garder les miens" }).click();
  await expect(page.getByRole("textbox", { name: /^Accroche/ })).toHaveValue("Ardoise, zinc et tuile autour de Lannion");
  // Un chantier et sa photo : envoyée telle quelle, préparée par Mobiiz en arrière-plan.
  await page.getByRole("checkbox", { name: /J'ai pris ces photos ou j'ai le droit de les utiliser/ }).check();
  await page.getByRole("textbox", { name: "Titre du nouveau chantier" }).fill("Toiture ardoise · Paimpol");
  await page.getByRole("button", { name: "Nouveau chantier" }).click();
  await expect(page.getByRole("textbox", { name: "Titre du chantier" })).toHaveValue("Toiture ardoise · Paimpol");
  await page.locator('input[type=file][multiple]').first().setInputFiles(PHOTO);
  await expect(page.getByRole("list", { name: "Photos du chantier" }).locator("img")).toHaveCount(1, { timeout: 30_000 });
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
  await expect(v.getByRole("heading", { name: "Couvreur à Lannion", level: 1 })).toBeVisible();
  await expect(v.locator(".pe-accueil-nom")).toHaveText(nom);
  await expect(v.getByRole("navigation", { name: "Menu de la page" }).or(v.getByRole("button", { name: "Ouvrir le menu" })).first()).toBeVisible();
  await expect(v.getByText("Ardoise, zinc et tuile autour de Lannion")).toBeVisible();
  await expect(v.getByText("Décennale", { exact: true })).toBeVisible();
  await expect(v.getByRole("navigation", { name: "Navigation principale" })).toHaveCount(0);
  await expect(v).toHaveTitle(`Couvreur à Lannion – ${nom}`);
  const ld = JSON.parse((await v.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld).toMatchObject({ "@type": "RoofingContractor", name: nom, telephone: "02 96 11 22 33", areaServed: "Lannion" });
  expect(ld).not.toHaveProperty("address");
  expect(await v.locator('meta[property="og:image"]').getAttribute("content")).toMatch(/partage\.jpg|apercu\.png/);
  // Le chantier : sa photo en grand, son titre dessus ; on le touche pour voir ses photos.
  await v.getByRole("button", { name: /Toiture ardoise · Paimpol/ }).click();
  await expect(v.getByRole("dialog", { name: /Toiture ardoise · Paimpol/ })).toBeVisible();
  await v.getByRole("button", { name: "Fermer" }).click();
  // Plus aucun visuel dessiné ni fond sombre : la page est claire.
  await expect(v.locator(".pe svg[viewBox='0 0 800 600']")).toHaveCount(0);
  expect(await v.locator(".pe").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(251, 248, 243)");
  if (info.project.name === "telephone") {
    // « Appeler » dans la barre du haut ; une fois l'accueil passé, le bouton fixé en bas prend le relais (pas en double).
    await v.evaluate(() => window.scrollTo(0, 0));
    await expect(v.locator(".pe-entete-appel")).toBeVisible();
    await expect(v.locator(".pe-barre-appel")).not.toBeInViewport();
    await v.locator("#contact").scrollIntoViewIfNeeded();
    await expect(v.locator(".pe-barre-appel a")).toBeInViewport();
    await expect(v.locator(".pe-barre-appel a")).toHaveAttribute("href", "tel:0296112233");
    await expect(v.locator(".pe-entete-appel")).toHaveCSS("opacity", "0");
  } else {
    await expect(v.locator(".pe-entete-appel")).toContainText("02 96 11 22 33");
    await expect(v.locator(".pe-barre-appel")).toBeHidden();
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
  await expect(apercu(b).locator(".pe-accueil-nom")).toHaveText(nomB);
  await expect(apercu(b).locator("h1")).toHaveText("Peintre");
  await expect(b.getByText("Accroche privée de A")).toHaveCount(0);
  await expect(b.getByText(a)).toHaveCount(0);
  // Le peintre a les prestations de son métier.
  await expect(apercu(b).getByText("Peinture intérieure").first()).toBeVisible();
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

test.describe("captures du rapport", () => {
  test("Ma page : un couvreur avec 3 chantiers, téléphone et ordinateur (captures pleine page)", async ({ browser }, info) => {
    test.skip(info.project.name !== "telephone", "une seule passe suffit");
    test.setTimeout(300_000);
    const dossier = process.env.CAPTURES_MA_PAGE;
    const fichier = (cle: string, defaut = PHOTO) => (process.env[cle] ?? defaut).split(",");
    const ctx = await browser.newContext({ baseURL: "http://localhost:3000", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.addLocatorHandler(p.getByRole("dialog", { name: "Guide" }), async () => {
      await p.getByRole("button", { name: "Passer le guide" }).click();
    });
    await inscrire(p, dossier ? "Toitures Le Bihan" : `Toitures Le Bihan ${unique()}`);
    await p.goto("/compte/ma-page");
    const companyId = await p.evaluate(() => localStorage.getItem("baticlair.companyId"));
    const appel = (methode: "post" | "patch" | "put", url: string, data: Record<string, unknown>) => p.request[methode](url, { data, headers: { "x-company-id": companyId ?? "" } });
    await appel("patch", "/v1/ma-page", {
      accroche: "Ardoise naturelle, zinc et réparations, du Trégor au Goëlo.",
      presentation: "Entreprise familiale de couverture, nous refaisons et entretenons les toitures de la région depuis 2011. Chaque chantier est bâché chaque soir et laissé propre.\n\nDevis gratuit sous 48 heures, interventions rapides après tempête.",
      telephone: "02 96 11 22 33",
      zone: "Lannion",
      horaires: "Du lundi au vendredi, 8 h à 18 h",
      creeeEn: 2011,
      certifications: ["Assurance décennale", "RGE", "Qualibat"],
      visible: true,
    });
    await appel("post", "/v1/ma-page/accord-photos", {});
    const envoyer = async (chemin: string, champs: Record<string, string>) => {
      const res = await p.request.post("/v1/ma-page/photos", { headers: { "x-company-id": companyId ?? "" }, multipart: { ...champs, file: { name: "photo.jpg", mimeType: "image/jpeg", buffer: readFileSync(chemin) } } });
      expect(res.status()).toBe(202);
    };
    await envoyer(fichier("PHOTO_ACCUEIL")[0]!, { role: "couverture" });
    for (const [titre, cle] of [["Réfection en ardoise · Paimpol", "CHANTIER_1"], ["Longère rénovée · Pleumeur-Bodou", "CHANTIER_2"], ["Zinguerie et faîtage · Perros-Guirec", "CHANTIER_3"]] as const) {
      const r = (await (await appel("post", "/v1/ma-page/realisations", { titre })).json()) as { realisation: { id: string } };
      for (const f of fichier(cle)) await envoyer(f, { realisationId: r.realisation.id });
    }
    await expect.poll(async () => ((await (await p.request.get("/v1/ma-page", { headers: { "x-company-id": companyId ?? "" } })).json()) as { photos: { statut: string }[] }).photos.every((x) => x.statut === "prete"), { timeout: 90_000 }).toBe(true);
    await p.request.post("/api/pages-entreprises/rafraichir", { headers: { "x-company-id": companyId ?? "" }, data: {} });
    const adresse = ((await (await p.request.get("/v1/ma-page", { headers: { "x-company-id": companyId ?? "" } })).json()) as { reglages: { adresse: string } }).reglages.adresse;
    for (const [nomAppareil, taille, mobile] of [["telephone", { width: 390, height: 844 }, true], ["ordinateur", { width: 1440, height: 900 }, false]] as const) {
      const vctx = await browser.newContext({ baseURL: "http://localhost:3000", viewport: taille, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 });
      const v = await vctx.newPage();
      await v.goto(`/e/${adresse}`);
      await expect(v.getByRole("heading", { level: 1 })).toHaveText("Couvreur à Lannion");
      await expect(v.locator(".pe-chantier")).toHaveCount(3);
      await sansDefilementHorizontal(v);
      if (dossier) {
        // Les photos sont chargées à la demande : on descend une fois pour les faire venir, puis on remonte.
        await v.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 500) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 120));
          }
          window.scrollTo(0, 0);
        });
        await v.waitForTimeout(600);
        await v.screenshot({ path: `${dossier}/${nomAppareil}-accueil.png` });
        await v.screenshot({ path: `${dossier}/${nomAppareil}-page-entiere.png`, fullPage: true });
        if (nomAppareil === "telephone") {
          await v.locator("#realisations").scrollIntoViewIfNeeded();
          await v.waitForTimeout(400);
          await v.screenshot({ path: `${dossier}/${nomAppareil}-defile.png` });
          await v.getByRole("button", { name: "Ouvrir le menu" }).click();
          await v.screenshot({ path: `${dossier}/${nomAppareil}-menu.png` });
        }
        await v.getByRole("button", { name: /Réfection en ardoise/ }).click();
        await v.waitForTimeout(500);
        await v.screenshot({ path: `${dossier}/${nomAppareil}-visionneuse.png` });
      }
      await vctx.close();
    }
    if (dossier) await p.screenshot({ path: `${dossier}/telephone-editeur.png` });
    await ctx.close();
  });
});
