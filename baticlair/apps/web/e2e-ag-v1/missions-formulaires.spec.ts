import { expect, test, type Page } from "@playwright/test";
import { confirmerEmail } from "../e2e/confirmer-email";

/**
 * PARCOURS MISSIONS, AIDE ET NAVIGATION (Greg, 12 novembre 2026, dossier de corrections UX, points 4, 7 et 9).
 * Le code postal propose la commune et réciproquement, sans choix arbitraire quand un code a plusieurs communes ; le
 * métier se choisit dans un sélecteur avec recherche, un métier absent se garde sur demande ; les trois filtres Missions
 * tiennent dans la largeur du téléphone ; la fenêtre d'aide des quantitatifs tient dans l'écran, se ferme à Échap et rend
 * le focus ; « Mes négoces » et les réponses des négoces s'ouvrent depuis les quantitatifs.
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

const sansDebordement = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test("missions : code postal et commune se proposent, métier avec recherche, filtres entiers dans la largeur", async ({ page }) => {
  test.setTimeout(180_000);
  await inscrire(page);
  await page.goto("/missions");
  // Les trois filtres sont entiers dans l'écran, sans défilement latéral, avec une cible d'au moins 44 px.
  const filtres = page.getByRole("group", { name: "Type d'annonces" });
  const largeur = page.viewportSize()!.width;
  for (const nom of ["Missions", "Entreprises dispo", "Mes annonces"]) {
    const boite = (await filtres.getByRole("button", { name: nom, exact: true }).boundingBox())!;
    expect(boite.x).toBeGreaterThanOrEqual(0);
    expect(boite.x + boite.width).toBeLessThanOrEqual(largeur);
    expect(boite.height).toBeGreaterThanOrEqual(44);
  }
  expect(await filtres.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await sansDebordement(page)).toBe(true);
  await filtres.getByRole("button", { name: "Mes annonces" }).click();
  await expect(filtres.getByRole("button", { name: "Mes annonces" })).toHaveAttribute("aria-pressed", "true");

  // « Proposer une mission ».
  await page.goto("/missions/nouvelle");
  await expect(page.getByRole("heading", { name: "De quelle aide as-tu besoin ?" })).toBeVisible();
  // Le métier : des propositions dès les premières lettres, les mots du chantier compris.
  const metier = page.getByRole("combobox", { name: "Métier recherché" });
  await metier.fill("couv");
  const propositions = page.getByRole("listbox", { name: "Métier recherché : propositions" });
  await expect(propositions.getByRole("option", { name: "Couverture - Toiture" })).toBeVisible();
  await metier.fill("placo");
  await expect(propositions.getByRole("option", { name: "Plâtrerie - Plaquiste" })).toBeVisible();
  await propositions.getByRole("option", { name: "Plâtrerie - Plaquiste" }).click();
  await expect(metier).toHaveValue("Plâtrerie - Plaquiste");
  await expect(propositions).toHaveCount(0);
  // Au clavier : flèche puis Entrée.
  await metier.fill("zing");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(metier).toHaveValue("Zinguerie");
  // Un métier réellement absent : rien n'est inventé, il se garde tel qu'écrit sur demande.
  await metier.fill("Scaphandrier");
  await expect(propositions.getByRole("option")).toHaveText(["Pas dans la liste : garder « Scaphandrier »"]);
  await propositions.getByRole("option").click();
  await expect(metier).toHaveValue("Scaphandrier");
  await metier.fill("Couverture - Toiture");

  // Le lieu : un code postal à une seule commune la remplit.
  const commune = page.getByLabel("Lieu de la mission (commune)");
  const cp = page.getByLabel("Code postal");
  await cp.fill("22580");
  await expect(commune).toHaveValue("Plouha");
  await expect(page.getByRole("group", { name: "Communes proposées" })).toHaveCount(0);
  // Un code postal à plusieurs communes : aucun choix arbitraire, l'artisan choisit.
  await commune.fill("");
  await cp.fill("22300");
  const choix = page.getByRole("group", { name: "Communes proposées" });
  await expect(choix).toContainText("Plusieurs communes ont le code postal 22300. Laquelle ?");
  await expect(choix.getByRole("button")).toHaveText(["Lannion", "Ploubezre", "Ploulec'h", "Rospez"]);
  await expect(commune).toHaveValue("");
  await choix.getByRole("button", { name: "Ploubezre" }).click();
  await expect(commune).toHaveValue("Ploubezre");
  await expect(cp).toHaveValue("22300");
  await expect(choix).toHaveCount(0);
  // La commune propose son code postal ; une commune à plusieurs codes postaux les montre tous.
  await cp.fill("");
  await commune.fill("Renn");
  await expect(choix.getByRole("button")).toHaveText(["Rennes · 35000", "Rennes · 35200", "Rennes · 35700"]);
  await choix.getByRole("button", { name: "Rennes · 35200" }).click();
  await expect(commune).toHaveValue("Rennes");
  await expect(cp).toHaveValue("35200");
  await cp.fill("");
  await commune.fill("Plouha");
  await expect(cp).toHaveValue("22580");
  // Une commune inconnue de l'annuaire reste saisissable : rien n'est bloqué.
  await commune.fill("Lieu-dit Inconnu");
  await expect(commune).toHaveValue("Lieu-dit Inconnu");
  // « Type de mission » : le libellé est dans sa carte, lisible, et nomme le groupe.
  const types = page.getByRole("group", { name: "Type de mission" });
  await expect(types.getByText("Type de mission", { exact: true })).toBeVisible();
  const boiteGroupe = (await types.boundingBox())!;
  const boiteLibelle = (await types.getByText("Type de mission", { exact: true }).boundingBox())!;
  expect(boiteLibelle.y).toBeGreaterThanOrEqual(boiteGroupe.y);
  expect(await sansDebordement(page)).toBe(true);

  // « Proposer mes services » : les mêmes champs.
  await page.goto("/missions/services");
  await page.getByRole("combobox", { name: "Métier principal" }).fill("charp");
  await page.getByRole("listbox", { name: "Métier principal : propositions" }).getByRole("option", { name: "Charpente" }).click();
  await page.getByLabel("Code postal").fill("22580");
  await expect(page.getByLabel("Zone d'intervention, autour de")).toHaveValue("Plouha");
  await expect(page.getByRole("group", { name: "Type de missions" })).toBeVisible();
  expect(await sansDebordement(page)).toBe(true);
});

test("quantitatifs : la fenêtre d'aide tient dans l'écran, dit le parcours actuel, se ferme à Échap ; « Mes négoces » et les réponses s'ouvrent d'ici", async ({ page }) => {
  test.setTimeout(120_000);
  await inscrire(page);
  await page.goto("/chantiers");
  const bouton = page.getByRole("button", { name: "Aide", exact: true });
  await bouton.click();
  const aide = page.getByRole("dialog", { name: "Aide : Tes quantitatifs" });
  await expect(aide).toBeVisible();
  await expect(aide).toContainText("tu saisis ta liste toi-même, ou Mobiiz t'aide");
  await expect(aide).toContainText("c'est toi qui vérifies et valides chaque ligne");
  await expect(aide).not.toContainText("devis déposé");
  // Entièrement dans l'écran, avec des marges, au-dessus du menu du bas ; « Compris » et la croix visibles.
  const ecran = page.viewportSize()!;
  const boite = (await aide.boundingBox())!;
  expect(boite.x).toBeGreaterThanOrEqual(8);
  expect(boite.x + boite.width).toBeLessThanOrEqual(ecran.width - 8);
  expect(boite.y).toBeGreaterThanOrEqual(0);
  expect(boite.y + boite.height).toBeLessThanOrEqual(ecran.height);
  await expect(aide.getByRole("button", { name: "Compris" })).toBeInViewport();
  await expect(aide.getByRole("button", { name: "Fermer", exact: true })).toBeInViewport();
  expect(await sansDebordement(page)).toBe(true);
  // Échap ferme et rend le focus au « ? ».
  await page.keyboard.press("Escape");
  await expect(aide).toHaveCount(0);
  await expect(bouton).toBeFocused();
  await bouton.click();
  await aide.getByRole("button", { name: "Compris" }).click();
  await expect(aide).toHaveCount(0);

  // Les deux chemins qui ont quitté le menu du compte.
  const autour = page.getByRole("navigation", { name: "Autour de mes quantitatifs" });
  await expect(autour.getByRole("link", { name: "Mes négoces" })).toHaveAttribute("href", "/fournisseurs");
  await expect(autour.getByRole("link", { name: "Réponses des négoces" })).toHaveAttribute("href", "/messages");
  expect(await sansDebordement(page)).toBe(true);
});
