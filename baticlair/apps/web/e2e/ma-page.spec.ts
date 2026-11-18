import { readFileSync } from "node:fs";
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";

/**
 * MA PAGE MOBIIZ (Greg, 16 novembre 2026) : le parcours complet, sur téléphone (Pixel 7, et petit iPhone 375 px plus bas)
 * et sur ordinateur. L'artisan règle son site depuis l'onglet « Mon site » (modèle, couleur, textes, photo), la rend visible ;
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

/** Toucher un réglage du bas de l'éditeur : centré à l'écran d'abord (la barre du menu est figée en bas du téléphone). */
async function toucher(l: Locator) {
  await l.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await l.click();
}

/** Ouvre un onglet des réglages de « Mon site » (Greg, 17 novembre 2026) ; déjà ouvert, on n'y touche pas. */
async function onglet(page: Page, nom: string) {
  const t = page.getByRole("tab", { name: nom, exact: true });
  // Le clavier se referme d'abord (la barre des onglets se cache pendant la saisie, comme le menu de l'app).
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  // Une attente qui laisse le guide du premier passage se fermer (lire un attribut ne le ferme pas).
  await expect(t).toBeVisible();
  if ((await t.getAttribute("aria-selected")) !== "true") await toucher(t);
  await expect(page.getByRole("tabpanel", { name: nom })).toBeVisible();
}

const enregistre = (page: Page) => expect(page.getByText("Enregistré : ton site est à jour.")).toBeVisible();
const apercu = (page: Page) => page.locator("[data-testid=apercu-page]:visible").first();

/** Les liens d'appel réellement visibles à l'écran (Greg, 18 novembre 2026 : jamais trois à la fois). */
const appelsVisibles = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('a[href^="tel:"]')].filter((a) => {
      const r = a.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(a).visibility !== "hidden";
    }).length,
  );

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
  // Onglet « Mon site » de la navigation principale (Greg, 16 novembre 2026) ; plus d'entrée « Ma page » dans le Profil.
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Mon site" }).click();
  await expect(page).toHaveURL(/\/mon-site$/);
  await expect(page.getByRole("heading", { name: "Mon site", level: 1 })).toBeVisible();
  await onglet(page, "Publier");
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
  await onglet(page, "Couleurs");
  await expect(page.getByRole("radio", { name: "Classique en colonnes" })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "Fond sombre" })).toHaveCount(0);
  await page.getByRole("radio", { name: "Bleu nuit" }).click();
  await enregistre(page);
  // La couleur des boutons se choisit (Greg, 17 novembre 2026) ; le texte du bouton reste lisible.
  await page.getByRole("radiogroup", { name: "Couleur des boutons" }).getByRole("radio", { name: "Bleu", exact: true }).click();
  await enregistre(page);
  await expect(apercu(page).locator(".pe-accueil .pe-btn-appel").first()).toHaveCSS("background-color", "rgb(25, 113, 194)");
  await expect(apercu(page).locator(".pe-accueil .pe-btn-appel").first()).toHaveCSS("color", "rgb(255, 255, 255)");
  await page.getByRole("radiogroup", { name: "Couleur des boutons" }).getByRole("radio", { name: "Jaune Mobiiz" }).click();
  await enregistre(page);
  // Une prestation se retire.
  await onglet(page, "Prestations");
  await page.getByRole("button", { name: "Retirer la prestation Entretien et démoussage" }).click();
  await enregistre(page);
  // Textes, téléphone, zone, certification.
  await onglet(page, "À propos");
  await page.getByRole("textbox", { name: /^Accroche/ }).fill("Ardoise, zinc et tuile autour de Lannion");
  await page.getByRole("textbox", { name: /^Présentation/ }).fill("Couvreur depuis 15 ans, nous refaisons vos toitures avec soin.");
  await toucher(page.getByRole("button", { name: "Assurance décennale" }));
  await onglet(page, "Contact");
  await page.getByRole("textbox", { name: /^Téléphone/ }).fill("02 96 11 22 33");
  await page.getByRole("textbox", { name: /^Zone d'intervention/ }).fill("Lannion");
  await enregistre(page);
  await expect(apercu(page).locator("h1")).toHaveText("Couvreur à Lannion");
  await expect(apercu(page).getByText("Ardoise, zinc et tuile autour de Lannion")).toBeVisible();
  // « Mobiiz m'aide à l'écrire » propose, rien n'est remplacé sans l'artisan.
  await onglet(page, "À propos");
  await toucher(page.getByRole("button", { name: "Mobiiz m'aide à l'écrire" }));
  await expect(page.getByTestId("proposition")).toBeVisible();
  await page.getByRole("button", { name: "Garder les miens" }).click();
  await expect(page.getByRole("textbox", { name: /^Accroche/ })).toHaveValue("Ardoise, zinc et tuile autour de Lannion");
  // Un chantier et sa photo : envoyée telle quelle, préparée par Mobiiz en arrière-plan.
  await onglet(page, "Chantiers");
  await page.getByRole("checkbox", { name: /J'ai pris ces photos ou j'ai le droit de les utiliser/ }).check();
  await page.getByRole("textbox", { name: "Titre du nouveau chantier" }).fill("Toiture ardoise · Paimpol");
  await page.getByRole("button", { name: "Nouveau chantier" }).click();
  await expect(page.getByRole("textbox", { name: "Titre du chantier" })).toHaveValue("Toiture ardoise · Paimpol");
  await page.locator('input[type=file][multiple]').first().setInputFiles(PHOTO);
  await expect(page.getByRole("list", { name: "Photos du chantier" }).locator("img")).toHaveCount(1, { timeout: 30_000 });
  // Publier.
  await onglet(page, "Publier");
  await toucher(page.getByRole("switch", { name: /Page visible/ }));
  await enregistre(page);
  await expect(page.getByRole("link", { name: "Ouvrir en ligne" })).toHaveAttribute("href", `/e/${adresse}?depuis=mon-site`);
  // « Voir mon site » flottant (Greg, 17 novembre 2026) : le site en plein écran, qui défile, et « Retour » en haut.
  await toucher(page.getByRole("button", { name: "Voir mon site" }));
  const plein = page.getByRole("dialog", { name: "Aperçu de mon site" });
  await expect(plein).toBeVisible();
  const cadre = plein.getByTestId("apercu-page");
  await cadre.hover();
  await page.mouse.wheel(0, 900);
  await expect.poll(() => cadre.evaluate((el) => el.scrollTop)).toBeGreaterThan(200);
  await toucher(plein.getByRole("button", { name: "Retour" }));
  await expect(plein).toHaveCount(0);
  await toucher(page.getByRole("button", { name: "Partager" }));
  await expect(page.getByRole("dialog", { name: "Partager mon site" }).getByRole("img", { name: /QR code/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Envoyer sur WhatsApp" })).toHaveAttribute("href", /wa\.me/);
  await page.getByRole("dialog", { name: "Partager mon site" }).getByRole("button", { name: "Fermer", exact: true }).click();

  // Le visiteur : la page tout de suite à jour (cache régénéré), rien d'autre de Mobiiz.
  await v.goto(`/e/${adresse}`);
  await expect(v.getByRole("heading", { name: "Couvreur à Lannion", level: 1 })).toBeVisible();
  await expect(v.locator(".pe-accueil-nom")).toHaveText(nom);
  await expect(v.getByRole("navigation", { name: "Menu de la page" }).or(v.getByRole("button", { name: "Ouvrir le menu" })).first()).toBeVisible();
  await expect(v.getByText("Ardoise, zinc et tuile autour de Lannion")).toBeVisible();
  await expect(v.getByText("Décennale", { exact: true })).toBeVisible();
  await expect(v.getByRole("navigation", { name: "Navigation principale" })).toHaveCount(0);
  await expect(v).toHaveTitle(`Couvreur à Lannion – ${nom}`);
  // « Retour à Mon site » seulement quand l'artisan vient de l'app, jamais pour un visiteur.
  await expect(v.getByRole("link", { name: "Retour à Mon site" })).toHaveCount(0);
  await v.goto(`/e/${adresse}?depuis=mon-site`);
  await expect(v.getByRole("link", { name: "Retour à Mon site" })).toHaveAttribute("href", "/mon-site");
  await v.goto(`/e/${adresse}`);
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
    // Greg, 18 novembre 2026 : dans l'accueil, « Demander un devis » et le numéro (jamais le rond du haut en plus) ; une
    // fois l'accueil passé, la barre « Appeler » collée TOUT EN BAS de l'écran ; revenu en haut, elle disparaît.
    await v.evaluate(() => window.scrollTo(0, 0));
    await expect(v.locator(".pe-entete-appel")).toBeHidden();
    await expect(v.locator(".pe-accueil").getByRole("link", { name: /02 96 11 22 33/ })).toBeVisible();
    await expect(v.locator(".pe-barre-appel")).not.toBeInViewport();
    expect(await appelsVisibles(v)).toBeLessThanOrEqual(2);
    // Les prestations à l'écran : un seul bouton d'appel, la barre du bas (le formulaire de contact a son propre numéro).
    await v.evaluate(() => document.querySelector("#prestations")!.scrollIntoView({ block: "start" }));
    await expect(v.locator(".pe-barre-appel a")).toBeInViewport();
    await expect(v.locator(".pe-barre-appel a")).toHaveAttribute("href", "tel:0296112233");
    await expect.poll(() => v.locator(".pe-barre-appel").evaluate((b) => Math.round(innerHeight - b.getBoundingClientRect().bottom))).toBe(0);
    expect(await appelsVisibles(v)).toBe(1);
    await v.locator("#contact").scrollIntoViewIfNeeded();
    await expect.poll(() => v.locator(".pe-barre-appel").evaluate((b) => Math.round(innerHeight - b.getBoundingClientRect().bottom))).toBe(0);
    await v.evaluate(() => window.scrollTo(0, 0));
    await expect(v.locator(".pe-barre-appel")).not.toBeInViewport();
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
  await expect(v.getByRole("status").filter({ hasText: "votre demande est bien partie" })).toBeVisible();
  // Signaler cette page.
  await v.getByText("Signaler cette page").click();
  await v.getByRole("radio", { name: "Cette page usurpe une entreprise" }).check();
  await v.getByRole("button", { name: "Envoyer le signalement" }).click();
  await expect(v.getByText("Merci, l'équipe Mobiiz va regarder cette page.")).toBeVisible();

  // Greg, 17 novembre 2026 : la demande arrive aussi dans « Messages et réponses », avec le téléphone du client.
  await page.goto("/messages");
  await page.getByRole("link", { name: /^Mon site, Paul Client, non lu/ }).click();
  await expect(page.getByRole("heading", { name: "Paul Client", level: 1 })).toBeVisible();
  await expect(page.getByText("Bonjour, j'ai une fuite sur ma toiture.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Appeler Paul Client" })).toHaveAttribute("href", "tel:0600000000");
  await page.goto("/mon-site");
  await expect(page.getByRole("heading", { name: "Mon site", level: 1 })).toBeVisible();
  await onglet(page, "Publier");

  // Repasser en privée : la page disparaît tout de suite pour le visiteur.
  await toucher(page.getByRole("switch", { name: /Page visible/ }));
  await enregistre(page);
  await v.goto(`/e/${adresse}`);
  await expect(v.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await v.context().close();
});

test("Ma page : deux comptes, chacun ne voit et ne règle que la sienne", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const a = `Toits Martin ${unique()}`;
  await inscrire(page, a);
  await page.goto("/mon-site");
  await onglet(page, "À propos");
  await page.getByRole("textbox", { name: /^Accroche/ }).fill("Accroche privée de A");
  await enregistre(page);
  const ctxB = await browser.newContext({ baseURL: "http://localhost:3000", viewport: page.viewportSize()! });
  const b = await ctxB.newPage();
  await b.addLocatorHandler(b.getByRole("dialog", { name: "Guide" }), async () => {
    await b.getByRole("button", { name: "Passer le guide" }).click();
  });
  const nomB = `Peinture Le Gall ${unique()}`;
  await inscrire(b, nomB, "Peinture");
  await b.goto("/mon-site");
  await expect(apercu(b).locator(".pe-accueil-nom")).toHaveText(nomB);
  await expect(apercu(b).locator("h1")).toHaveText("Peintre");
  await expect(b.getByText("Accroche privée de A")).toHaveCount(0);
  await expect(b.getByText(a)).toHaveCount(0);
  // Le peintre a les prestations de son métier.
  await expect(apercu(b).getByText("Peinture intérieure").first()).toBeVisible();
  await ctxB.close();
});

test("Mon site : la photo par défaut du métier, remplacée d'un tap depuis la galerie (Greg, 17 novembre 2026)", async ({ page }) => {
  test.setTimeout(150_000);
  await inscrire(page, `Plâtrerie Martin ${unique()}`, "Plâtrerie, isolation");
  await page.goto("/mon-site");
  const couverture = apercu(page).locator(".pe-accueil-photo img");
  // Sans photo à lui, le plaquiste a la photo de son métier, jamais un chantier qu'il n'a pas fait.
  await expect(couverture).toHaveAttribute("src", /\/site\/photos\/drywall/);
  await expect(couverture).toHaveAttribute("alt", "Photo d'illustration du métier");
  await expect(apercu(page).locator(".pe-credit-photo")).toContainText("Asurnipal");
  await onglet(page, "Photos");
  await expect(page.getByText("Photo de la galerie")).toBeVisible();
  await toucher(page.getByRole("button", { name: /Choisir dans la galerie/ }));
  const galerie = page.getByRole("radiogroup", { name: "Galerie de photos" });
  await expect(galerie.getByRole("radio", { name: "Selon mon métier" })).toHaveAttribute("aria-checked", "true");
  await toucher(galerie.getByRole("radio", { name: "Maisons neuves terminées" }));
  await enregistre(page);
  await expect(galerie.getByRole("radio", { name: "Maisons neuves terminées" })).toHaveAttribute("aria-checked", "true");
  await expect(couverture).toHaveAttribute("src", /\/site\/photos\/neutre-4/);
  // CC0 : pas de crédit.
  await expect(apercu(page).locator(".pe-credit-photo")).toHaveCount(0);
  // Rechargé : le choix est gardé ; « Selon mon métier » le rend.
  await page.reload();
  await expect(couverture).toHaveAttribute("src", /\/site\/photos\/neutre-4/);
  await onglet(page, "Photos");
  await toucher(page.getByRole("button", { name: /Choisir dans la galerie/ }));
  await toucher(page.getByRole("radiogroup", { name: "Galerie de photos" }).getByRole("radio", { name: "Selon mon métier" }));
  await enregistre(page);
  await expect(couverture).toHaveAttribute("src", /\/site\/photos\/drywall/);
  await sansDefilementHorizontal(page);
});

test("Mon site : engagements cochés et « Voir nos avis Google » (Greg, 18 novembre 2026)", async ({ page, browser }, info) => {
  test.setTimeout(150_000);
  await inscrire(page, `Toits Martin ${unique()}`);
  await page.goto("/mon-site");
  // L'aperçu est caché aux lecteurs d'écran (aria-hidden) : on le lit par sa classe.
  const garanties = apercu(page).locator(".pe-preuves");
  // Sans logo envoyé : les initiales de l'entreprise, jamais le logo Mobiiz (Greg, 18 novembre 2026).
  await expect(apercu(page).locator(".pe-entete .pe-initiales")).toHaveText("TM");
  await expect(apercu(page).locator(".pe-entete img")).toHaveCount(0);
  // Rien de coché : aucun engagement ni bouton Google.
  await expect(apercu(page).getByText("Devis gratuit")).toHaveCount(0);
  await expect(apercu(page).getByText("Voir nos avis Google")).toHaveCount(0);
  await onglet(page, "À propos");
  await toucher(page.getByRole("button", { name: "Devis gratuit" }));
  await toucher(page.getByRole("button", { name: "Intervention rapide" }));
  await enregistre(page);
  await expect(garanties.getByText("Devis gratuit")).toBeVisible();
  await expect(garanties.getByText("Intervention rapide")).toBeVisible();
  await expect(garanties.getByText("Déplacement gratuit")).toHaveCount(0);
  await onglet(page, "Contact");
  const champ = page.getByRole("textbox", { name: /^Lien de ma fiche Google/ });
  await champ.fill("https://avis-pas-chers.fr/x");
  await expect(page.getByText(/Colle le lien de ta fiche Google/)).toBeVisible();
  await champ.fill("https://maps.app.goo.gl/AbCd123");
  await enregistre(page);
  await expect(apercu(page).getByText("Voir nos avis Google")).toBeVisible();
  // En ligne : le bouton mène à la fiche, dans un autre onglet.
  await onglet(page, "Publier");
  await page.getByRole("switch", { name: /Page visible/ }).click();
  await enregistre(page);
  const adresse = ((await page.getByText(/\/e\/[a-z0-9-]+$/).first().textContent()) ?? "").split("/e/")[1]!.trim();
  const v = await visiteur(browser, { viewport: page.viewportSize()!, isMobile: info.project.name === "telephone", hasTouch: info.project.name === "telephone" });
  await v.goto(`/e/${adresse}`);
  await expect(v.getByRole("link", { name: "Voir nos avis Google" })).toHaveAttribute("href", "https://maps.app.goo.gl/AbCd123");
  await expect(v.getByRole("list", { name: "Garanties" }).getByText("Devis gratuit")).toBeVisible();
  await v.context().close();
});

test("Mon site : dans l'aperçu Téléphone, la barre « Appeler » reste collée en bas du téléphone (Greg, 18 novembre 2026)", async ({ page }, info) => {
  test.skip(info.project.name !== "telephone", "l'aperçu téléphone de l'éditeur");
  test.setTimeout(120_000);
  await inscrire(page, `Toits Martin ${unique()}`);
  await page.goto("/mon-site");
  await onglet(page, "Contact");
  await page.getByRole("textbox", { name: /^Téléphone/ }).fill("06 47 10 04 99");
  await enregistre(page);
  await page.getByRole("button", { name: /^Fermer les réglages/ }).click();
  const tel = apercu(page);
  const barre = tel.locator(".pe-barre-appel");
  // En haut (l'onglet Contact avait fait défiler l'aperçu jusqu'au formulaire) : la barre est cachée sous le bas du téléphone.
  await tel.evaluate((d) => d.scrollTo(0, 0));
  const sousLeBas = () => barre.evaluate((b) => Math.round(b.getBoundingClientRect().top - b.closest("[data-testid=apercu-page]")!.getBoundingClientRect().bottom));
  await expect.poll(sousLeBas).toBeGreaterThanOrEqual(0);
  // Après l'accueil : collée tout en bas du téléphone, jamais au milieu, à chaque hauteur de défilement.
  for (const y of [900, 1500, 99999]) {
    await tel.evaluate((d, y) => d.scrollTo(0, y), y);
    await expect.poll(() => barre.evaluate((b) => Math.round(b.closest("[data-testid=apercu-page]")!.getBoundingClientRect().bottom - b.getBoundingClientRect().bottom))).toBe(0);
  }
  await tel.evaluate((d) => d.scrollTo(0, 0));
  await expect.poll(sousLeBas).toBeGreaterThanOrEqual(0);
});

test("Ma page : l'éditeur dans les thèmes clair et sombre de l'application, sans défilement horizontal", async ({ page }) => {
  test.setTimeout(120_000);
  await inscrire(page, `Toits Martin ${unique()}`);
  for (const theme of ["clair", "sombre"]) {
    await page.evaluate((t) => localStorage.setItem("mobiiz-theme", t), theme);
    await page.goto("/mon-site");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.getByRole("heading", { name: "Mon site", level: 1 })).toBeVisible();
    await onglet(page, "À propos");
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
    await p.goto("/mon-site");
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
    for (const [titre, cle] of [["Réfection en ardoise · Paimpol", "CHANTIER_1"], ["Longère rénovée · Pleumeur-Bodou", "CHANTIER_2"], ["Couvertures de bourg · Tréguier", "CHANTIER_3"]] as const) {
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
        // Capture pleine page : la barre « Appeler » fixe (téléphone) n'a pas de place fixe sur une image géante ; elle est
        // montrée à part (capture « défilé »).
        const cache = await v.addStyleTag({ content: ".pe-barre-appel{display:none!important}" });
        await v.screenshot({ path: `${dossier}/${nomAppareil}-page-entiere.png`, fullPage: true });
        await cache.evaluate((el) => (el as Element).remove());
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
    if (dossier) {
      await p.screenshot({ path: `${dossier}/telephone-editeur.png` });
      // Retour de Greg (17 novembre 2026) : une ville en capitales, une teinte bien visible, « Voir mon site » flottant,
      // le site en plein écran qui défile, le nuancier.
      await appel("patch", "/v1/ma-page", { zone: "PLOUBAZLANEC", couleur: "#1F4D3A" });
      await p.reload();
      await expect(p.getByRole("button", { name: "Voir mon site" })).toBeVisible();
      await p.screenshot({ path: `${dossier}/telephone-editeur-flottant.png` });
      await onglet(p, "Couleurs");
      await p.screenshot({ path: `${dossier}/telephone-nuancier.png` });
      await p.getByRole("button", { name: "Voir mon site" }).click();
      const plein = p.getByRole("dialog", { name: "Aperçu de mon site" });
      await expect(plein.locator("h1")).toHaveText("Couvreur à Ploubazlanec");
      await p.waitForTimeout(600);
      await p.screenshot({ path: `${dossier}/telephone-apercu-plein.png` });
      await plein.getByTestId("apercu-page").evaluate((el) => el.scrollTo(0, 900));
      await p.waitForTimeout(600);
      await p.screenshot({ path: `${dossier}/telephone-apercu-defile.png` });
      for (const [id, hex] of [["bleu", "#1971C2"], ["orange", "#F7931E"]] as const) {
        await appel("patch", "/v1/ma-page", { couleurBoutons: hex });
        await p.reload();
        await p.getByRole("button", { name: "Voir mon site" }).click();
        await p.waitForTimeout(600);
        await p.screenshot({ path: `${dossier}/telephone-boutons-${id}.png` });
      }
      await p.getByRole("button", { name: "Retour" }).click();
      await onglet(p, "Couleurs");
      await p.screenshot({ path: `${dossier}/telephone-couleur-boutons.png` });
    }
    await ctx.close();
  });
});

test("Mon site : cinq onglets tiennent sur un petit iPhone, sans texte coupé ; un seul chemin vers l'éditeur", async ({ browser }) => {
  test.setTimeout(120_000);
  for (const largeur of [375, 320]) {
    const ctx = await browser.newContext({ baseURL: "http://localhost:3000", viewport: { width: largeur, height: 667 }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    await p.addLocatorHandler(p.getByRole("dialog", { name: "Guide" }), async () => {
      await p.getByRole("button", { name: "Passer le guide" }).click();
    });
    await inscrire(p, `Toits Martin ${unique()}`);
    const nav = p.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav.getByRole("link")).toHaveText(["Accueil", "Quantitatifs", "Achats groupés", /Missions/, "Mon site"]);
    // Chaque libellé tient dans son onglet : rien ne dépasse, rien n'est rogné, au plus deux lignes, assez grand. Les lettres
    // elles-mêmes sont mesurées (une plage sur le texte) ; moins d'un demi-pixel (arrondi du rendu) ne se voit pas.
    const mesures = await nav.evaluate((n) =>
      [...n.querySelectorAll("a")]
        .filter((a) => a.getClientRects().length)
        .map((a) => {
          const texte = a.querySelector(":scope > span.text-center") as HTMLElement;
          const plage = document.createRange();
          plage.selectNodeContents(texte);
          const r = a.getBoundingClientRect();
          const t = plage.getBoundingClientRect();
          return { nom: texte.textContent ?? "", gauche: t.left - r.left, droite: r.right - t.right, lignes: plage.getClientRects().length, taille: parseFloat(getComputedStyle(texte).fontSize), x: r.left, fin: r.right };
        }),
    );
    expect(mesures.map((m) => m.nom)).toEqual(["Accueil", "Quantitatifs", "Achats groupés", "Missions", "Mon site"]);
    for (const m of mesures) {
      expect(m.gauche, m.nom).toBeGreaterThanOrEqual(-0.5);
      expect(m.droite, m.nom).toBeGreaterThanOrEqual(-0.5);
      // Greg, 17 novembre 2026 : chaque libellé sur UNE ligne (« Achats groupés » compris), lisible.
      expect(m.lignes, m.nom).toBe(1);
      expect(m.taille, m.nom).toBeGreaterThanOrEqual(largeur >= 360 ? 10.5 : 9.5);
      expect(m.x, m.nom).toBeGreaterThanOrEqual(0);
      expect(m.fin, m.nom).toBeLessThanOrEqual(largeur);
    }
    await p.screenshot({ path: `test-results/mon-site-onglets-${largeur}.png` });
    // L'onglet ouvre l'éditeur (Greg, 17 novembre 2026, « style Lovable ») : le site en haut, toujours visible ; en bas,
    // les sept onglets des réglages ; un onglet ouvre son tiroir sous le site.
    await nav.getByRole("link", { name: "Mon site" }).click();
    await expect(nav.getByRole("link", { name: "Mon site" })).toHaveAttribute("aria-current", "page");
    await expect(p.getByRole("tablist", { name: "Réglages du site" }).getByRole("tab")).toHaveText(["Couleurs", "Photos", "Prestations", "Chantiers", "À propos", "Contact", "Publier"]);
    await expect(apercu(p)).toBeVisible();
    await onglet(p, "Couleurs");
    await expect(p.getByRole("heading", { name: "Teinte" })).toBeVisible();
    expect((await apercu(p).boundingBox())!.y).toBeLessThan((await p.getByRole("tabpanel", { name: "Couleurs" }).boundingBox())!.y);
    // Une couleur touchée change le site aussitôt, sans rien faire d'autre.
    await toucher(p.getByRole("radiogroup", { name: "Couleur des boutons" }).getByRole("radio", { name: "Rouge" }));
    await expect(apercu(p).locator(".pe-accueil .pe-btn-appel").first()).toHaveCSS("background-color", "rgb(224, 49, 49)");
    // « Voir mon site » et l'état « Enregistré » ne recouvrent jamais un champ : ils vivent au-dessus du site.
    await onglet(p, "À propos");
    const champ = (await p.getByRole("textbox", { name: /^Accroche/ }).boundingBox())!;
    const bouton = (await p.getByRole("button", { name: "Voir mon site" }).boundingBox())!;
    expect(bouton.y + bouton.height <= champ.y || bouton.y >= champ.y + champ.height).toBe(true);
    await onglet(p, "Publier");
    await expect(p.getByRole("switch", { name: /Page visible/ })).toBeVisible();
    await expect(p.getByRole("button", { name: "Partager" })).toBeVisible();
    await sansDefilementHorizontal(p);
    // Un seul chemin : plus d'entrée « Ma page » au Profil ; l'ancienne adresse mène à l'onglet.
    await p.goto("/compte");
    await expect(p.getByRole("link", { name: /Ma page/ })).toHaveCount(0);
    await p.goto("/compte/ma-page");
    await expect(p).toHaveURL(/\/mon-site$/);
    await ctx.close();
  }
});
