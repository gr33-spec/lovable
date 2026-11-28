import { mkdirSync } from "node:fs";
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";

/**
 * SITES DES ARTISANS, LE SOCLE (Greg, 27 novembre 2026, cahier 03) : deux modèles qui lisent les mêmes données, l'aller-retour
 * sans perte, le brouillon qui attend « Publier », les palettes ; « Voir mon site » qui s'ouvre selon l'appareil et dont la
 * bascule Ordinateur / Téléphone ne perd aucun changement en cours ; la tablette dans les deux sens.
 *
 * Captures : `CAPTURES_SITES=<dossier>` écrit les deux modèles (ordinateur 1440 px et téléphone) ; sans la variable, aucune.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const CAPTURES = process.env.CAPTURES_SITES;

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
});

async function inscrire(page: Page, entreprise: string) {
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Greg Martin");
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(`artisan-${unique()}@example.fr`);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
  await page.evaluate(async () => {
    const c = localStorage.getItem("baticlair.companyId");
    await fetch("/v1/me/guide/vu", { method: "POST", headers: c ? { "x-company-id": c } : {} });
  });
}

async function toucher(l: Locator) {
  await l.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await l.click();
}

async function onglet(page: Page, nom: string) {
  const t = page.getByRole("tab", { name: nom, exact: true });
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(t).toBeVisible();
  if ((await t.getAttribute("aria-selected")) !== "true") await toucher(t);
  await expect(page.getByRole("tabpanel", { name: nom })).toBeVisible();
}

/** Enregistré : la phrase, ou, sur téléphone quand il reste des changements à mettre en ligne, le bouton « Publier » qui la remplace. */
const enregistre = (page: Page) => expect(page.getByText("Enregistré dans ton brouillon.").or(page.getByRole("button", { name: "Publier", exact: true })).first()).toBeVisible();
const apercu = (page: Page) => page.locator("[data-testid=apercu-page]:visible").first();

async function visiteur(browser: Browser, page: Page, telephone: boolean) {
  const ctx = await browser.newContext({ viewport: page.viewportSize()!, isMobile: telephone, hasTouch: telephone, baseURL: "http://localhost:3000" });
  return ctx.newPage();
}

async function sansDefilementHorizontal(page: Page, quoi: string) {
  const deborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(deborde, quoi).toBeLessThanOrEqual(1);
}

test("deux modèles, mêmes données : Atelier → Sobre → Atelier sans rien perdre ; rien n'est en ligne avant « Publier »", async ({ page, browser }, info) => {
  test.setTimeout(240_000);
  const telephone = info.project.name === "telephone";
  const nom = `Toits Martin ${unique()}`;
  await inscrire(page, nom);
  await page.goto("/mon-site");
  await onglet(page, "À propos");
  await page.getByRole("textbox", { name: /^Accroche/ }).fill("Ardoise, zinc et tuile autour de Lannion");
  await page.getByRole("textbox", { name: /^Présentation/ }).fill("Couvreur depuis 15 ans. Nous refaisons vos toitures en ardoise naturelle et en zinc, de Lannion à Paimpol.");
  await toucher(page.getByRole("button", { name: "Assurance décennale" }));
  await onglet(page, "Contact");
  await page.getByRole("textbox", { name: /^Téléphone/ }).fill("02 96 11 22 33");
  await page.getByRole("textbox", { name: /^Zone d'intervention/ }).fill("Lannion");
  await page.getByRole("textbox", { name: /^Horaires/ }).fill("Du lundi au vendredi, 8 h à 18 h");
  await enregistre(page);
  // Une palette : la teinte et les boutons d'un toucher (le jaune Mobiiz n'est pas imposé).
  await onglet(page, "Couleurs");
  await toucher(page.getByRole("radiogroup", { name: "Palettes" }).getByRole("radio", { name: "Bleu nuit et orange" }));
  await enregistre(page);
  await expect(apercu(page).locator(".pe-btn-appel").first()).toHaveCSS("background-color", "rgb(247, 147, 30)");
  // Publier une première fois.
  await onglet(page, "Publier");
  await toucher(page.getByRole("switch", { name: /Page visible/ }));
  await enregistre(page);
  const adresse = ((await page.getByText(/\/e\/[a-z0-9-]+$/).first().textContent()) ?? "").split("/e/")[1]!.trim();
  const v = await visiteur(browser, page, telephone);
  await v.goto(`/e/${adresse}`);
  await expect(v.locator("[data-modele=atelier]")).toBeVisible();
  const texteAtelier = await v.locator("main").innerText();
  if (CAPTURES) {
    mkdirSync(CAPTURES, { recursive: true });
    await v.screenshot({ path: `${CAPTURES}/${info.project.name}-atelier.png`, fullPage: true });
  }

  // Sobre : le modèle change dans le brouillon ; le visiteur voit toujours Atelier. Les modèles ont leur onglet (Greg,
  // 28 novembre 2026 : avant, le choix était caché dans « Couleurs »).
  await onglet(page, "Modèles");
  await expect(page.getByRole("radiogroup", { name: "Modèle du site" }).getByRole("radio", { name: /Atelier/ })).toHaveAttribute("aria-checked", "true");
  await toucher(page.getByRole("radiogroup", { name: "Modèle du site" }).getByRole("radio", { name: /Sobre/ }));
  await enregistre(page);
  await expect(apercu(page).locator("[data-modele=sobre]")).toHaveCount(1);
  await v.reload();
  await expect(v.locator("[data-modele=atelier]")).toBeVisible();
  // « Publier » met le nouveau modèle en ligne.
  await toucher(page.getByRole("button", { name: "Publier", exact: true }));
  await expect(page.getByRole("button", { name: "Publier", exact: true })).toHaveCount(0);
  await v.reload();
  await expect(v.locator("[data-modele=sobre]")).toBeVisible();
  // Mêmes données : chaque texte de l'artisan est là.
  for (const t of ["Ardoise, zinc et tuile autour de Lannion", "Du lundi au vendredi", "02 96 11 22 33", "Assurance décennale", "Couvreur depuis 15 ans"]) await expect(v.locator("main").getByText(t, { exact: false }).first()).toBeVisible();
  await expect(v.locator(".pe-btn-appel").first()).toHaveCSS("background-color", "rgb(247, 147, 30)");
  await sansDefilementHorizontal(v, "Sobre");
  if (CAPTURES) await v.screenshot({ path: `${CAPTURES}/${info.project.name}-sobre.png`, fullPage: true });

  // Retour au modèle précédent, publié : le site est le même qu'avant, mot pour mot.
  await onglet(page, "Modèles");
  await toucher(page.getByRole("button", { name: "Revenir au modèle Atelier" }));
  await enregistre(page);
  await toucher(page.getByRole("button", { name: "Publier", exact: true }));
  await expect(page.getByRole("button", { name: "Publier", exact: true })).toHaveCount(0);
  await v.reload();
  await expect(v.locator("[data-modele=atelier]")).toBeVisible();
  expect(await v.locator("main").innerText()).toBe(texteAtelier);
  await v.context().close();
});

test("« Voir mon site » : ordinateur sur ordinateur, téléphone sur téléphone ; la bascule ne perd aucun changement en cours", async ({ page }, info) => {
  test.setTimeout(150_000);
  const telephone = info.project.name === "telephone";
  await inscrire(page, `Toits Martin ${unique()}`);
  await page.goto("/mon-site");
  await onglet(page, "À propos");
  const accroche = page.getByRole("textbox", { name: /^Accroche/ });
  // Un changement en cours de frappe, pas encore enregistré, puis tout de suite l'aperçu.
  await accroche.fill("Texte tapé à l'instant");
  await toucher(page.getByRole("button", { name: "Voir mon site" }));
  const plein = page.getByRole("dialog", { name: "Aperçu de mon site" });
  await expect(plein).toBeVisible();
  const choix = plein.getByRole("radiogroup", { name: "Taille de l'aperçu" });
  await expect(choix.getByRole("radio", { name: telephone ? "Téléphone" : "Ordinateur" })).toHaveAttribute("aria-checked", "true");
  await expect(plein.getByTestId("apercu-page").getByText("Texte tapé à l'instant")).toHaveCount(1);
  // L'autre format, puis retour : le texte est toujours là.
  await choix.getByRole("radio", { name: telephone ? "Ordinateur" : "Téléphone" }).click();
  await expect(plein.getByTestId("apercu-page").getByText("Texte tapé à l'instant")).toHaveCount(1);
  await sansDefilementHorizontal(page, "aperçu basculé");
  await choix.getByRole("radio", { name: telephone ? "Téléphone" : "Ordinateur" }).click();
  await plein.getByRole("button", { name: "Retour" }).click();
  await expect(plein).toHaveCount(0);
  await expect(accroche).toHaveValue("Texte tapé à l'instant");
  await enregistre(page);
  await page.reload();
  await onglet(page, "À propos");
  await expect(page.getByRole("textbox", { name: /^Accroche/ })).toHaveValue("Texte tapé à l'instant");
});

test("« Voir mon site » sur tablette, en portrait puis en paysage : le bon format, rien ne déborde", async ({ page }, info) => {
  test.skip(info.project.name !== "ordinateur", "une seule passe suffit (tailles posées à la main)");
  test.setTimeout(120_000);
  await inscrire(page, `Toits Martin ${unique()}`);
  for (const [l, h, attendu] of [[768, 1024, "Téléphone"], [1024, 768, "Ordinateur"]] as const) {
    await page.setViewportSize({ width: l, height: h });
    await page.goto("/mon-site");
    await expect(page.getByRole("heading", { name: "Mon site", level: 1 })).toBeAttached();
    await sansDefilementHorizontal(page, `éditeur ${l}`);
    await toucher(page.getByRole("button", { name: "Voir mon site" }));
    const plein = page.getByRole("dialog", { name: "Aperçu de mon site" });
    await expect(plein.getByRole("radiogroup", { name: "Taille de l'aperçu" }).getByRole("radio", { name: attendu })).toHaveAttribute("aria-checked", "true");
    await sansDefilementHorizontal(page, `aperçu ${l}`);
    await plein.getByRole("button", { name: "Retour" }).click();
  }
});

test("appli sur ordinateur : le menu se parcourt au clavier, le focus se voit, rien ne déborde à 1280, 1440 et 1920 px", async ({ page }, info) => {
  test.skip(info.project.name !== "ordinateur", "le menu de gauche n'existe que sur ordinateur");
  test.setTimeout(120_000);
  await inscrire(page, `Toits Martin ${unique()}`);
  for (const largeur of [1280, 1440, 1920]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    for (const chemin of ["/", "/demandes", "/messages", "/achats-groupes", "/compte", "/mon-site", "/chantiers/nouveau"]) {
      await page.goto(chemin);
      await page.waitForLoadState("domcontentloaded");
      await sansDefilementHorizontal(page, `${chemin} à ${largeur} px`);
    }
  }
  // Au clavier : de lien en lien jusqu'à « Messages », Entrée l'ouvre ; le lien qui a le focus porte un contour visible.
  await page.goto("/");
  const messages = page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: /Messages/ });
  let trouve = false;
  for (let i = 0; i < 30 && !trouve; i++) {
    await page.keyboard.press("Tab");
    trouve = await messages.evaluate((el) => el === document.activeElement);
  }
  expect(trouve).toBe(true);
  const contour = await messages.evaluate((el) => {
    const s = getComputedStyle(el);
    return { style: s.outlineStyle, largeur: parseFloat(s.outlineWidth), ombre: s.boxShadow };
  });
  expect(contour.style !== "none" && contour.largeur > 0 ? true : contour.ombre !== "none").toBe(true);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/messages$/);
});
