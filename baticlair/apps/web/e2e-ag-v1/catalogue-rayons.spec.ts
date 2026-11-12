import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { confirmerEmail } from "../e2e/confirmer-email";

/**
 * LE CATALOGUE EN RAYONS (Greg, 12 novembre 2026 : « Métier › Rayon › Famille › Produit › Caractéristiques › Quantité […]
 * l'artisan doit naviguer comme dans un catalogue de négoce […] Une catégorie « Zinc » ne doit jamais afficher du cuivre »),
 * et le sélecteur de métier qui ne se déroulait pas toujours sur iPhone (capture du même jour). Petit téléphone, Android,
 * ordinateur. Aucun appel payant.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const CAPTURES = process.env.CATALOGUE_CAPTURES;

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

const bouton = (ou: Locator, nom: string) => ou.getByRole("button", { name: nom, exact: true }).filter({ visible: true });

test("catalogue en rayons : Couverture › Zinguerie › Feuilles, bobines… › Bobine › zinc › finition › épaisseur › largeur ; retour sans perte ; précision libre ; recherche directe ; sélecteur", async ({ page }, info) => {
  test.setTimeout(180_000);
  const ordinateur = info.project.name === "ordinateur";
  const cap = async (nom: string) => {
    if (CAPTURES) await page.screenshot({ path: path.join(CAPTURES, info.project.name, `${nom}.png`) });
  };
  await inscrire(page);
  await page.goto("/chantiers/nouveau?mode=manuel");
  const saisie = page.getByRole("dialog", { name: "Saisir ma liste" });
  await expect(saisie.getByText("Chargement du catalogue…")).toHaveCount(0);
  await saisie.getByRole("heading", { name: "Quels matériaux veux-tu ajouter ?" }).click();
  await expect(page.getByRole("dialog", { name: "Guide" })).toHaveCount(0);
  const sansDebordement = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);

  // 1. Trois rayons, pas des centaines de références ; Étanchéité est un rayon de Couverture, plus un métier à part.
  for (const r of ["Couverture", "Zinguerie", "Étanchéité et toitures-terrasses"]) await expect(bouton(saisie, r)).toHaveCount(1);
  await expect(saisie.getByLabel("Métier").locator("option", { hasText: /^(Étanchéité|Zinguerie)$/ })).toHaveCount(0);
  if (ordinateur) {
    // Ordinateur : la navigation à gauche, le contenu au centre, la liste en cours à droite, en même temps.
    await expect(saisie.getByRole("navigation", { name: "Rayons du catalogue" })).toBeVisible();
    await expect(saisie.getByRole("complementary", { name: "Ma liste" })).toBeVisible();
  }
  await sansDebordement();
  await cap("01-rayons");

  // 2. Rayon, famille, produit : chaque écran reste court.
  await bouton(saisie, "Zinguerie").click();
  await cap("02-familles");
  await bouton(saisie, "Feuilles, bobines, bobineaux et bandes").click();
  await expect(bouton(saisie, "Bobine")).toContainText("À choisir : matériau, finition, épaisseur, largeur");
  // Bobine et bobineau restent deux produits ; jamais « Bobine de cuivre » à côté de « Bobine de zinc ».
  await expect(bouton(saisie, "Bobineau")).toHaveCount(1);
  const produits = saisie.getByRole("list", { name: "Feuilles, bobines, bobineaux et bandes" });
  await expect(produits.getByRole("button", { name: /Bobine de (zinc|cuivre)/ })).toHaveCount(0);
  await expect(produits.getByRole("button", { name: /joint debout/i })).toHaveCount(0);
  await cap("03-produits");

  // 3. Les caractéristiques, une à une : la matière d'abord. Sous « zinc », rien que du zinc.
  await bouton(saisie, "Bobine").click();
  const choix = saisie.getByRole("list", { name: /^Bobine : / });
  await expect(choix).toHaveAccessibleName("Bobine : Matériau");
  await expect(choix.getByRole("button")).toHaveText(["zinc", "cuivre"]);
  await cap("04-materiau");
  await bouton(choix, "zinc").click();
  await expect(choix).toHaveAccessibleName("Bobine : Finition");
  await bouton(choix, "naturel").click();
  await expect(choix).toHaveAccessibleName("Bobine : Épaisseur");
  // « Choix précédent » remonte d'un cran, sans rien perdre du chemin.
  await saisie.getByRole("button", { name: "Choix précédent" }).click();
  await expect(choix).toHaveAccessibleName("Bobine : Finition");
  await expect(saisie.getByLabel("Tu es ici")).toHaveText(/Zinguerie › Feuilles, bobines, bobineaux et bandes › Bobine › zinc$/);
  await bouton(choix, "naturel").click();
  await bouton(choix, "0,65 mm").click();
  await expect(choix).toHaveAccessibleName("Bobine : Largeur");
  await cap("05-largeur");
  await bouton(choix, "largeur 500 mm").click();
  // L'article exact, à sa clé d'origine : la désignation que lira le négoce n'a pas changé.
  const quantite = saisie.getByLabel("Quantité de Bobine de zinc naturel · 0,65 mm · largeur 500 mm").first();
  await expect(quantite).toBeVisible();
  await quantite.fill("40");
  await cap("06-quantite");
  await saisie.getByRole("button", { name: "Ajouter à la sélection" }).click();
  await expect(saisie.getByRole("button", { name: /Créer le quantitatif · 1 matériau/ }).filter({ visible: true }).first()).toBeVisible();
  // La famille reste ouverte pour le produit suivant.
  await expect(bouton(saisie, "Bobineau")).toHaveCount(1);
  await sansDebordement();

  // 4. Un autre catalogue : Peinture. La teinte est une précision écrite, jamais un article de plus.
  await saisie.getByLabel("Métier").selectOption({ label: "Peinture" });
  await bouton(saisie, "Peintures murs et plafonds").click();
  await bouton(saisie, "Peinture murs et plafonds acrylique").click();
  const peinture = saisie.getByRole("list", { name: /^Peinture murs et plafonds acrylique : / });
  for (let i = 0; i < 4 && (await peinture.count()); i++) await peinture.getByRole("button").first().click();
  await saisie.getByLabel("Teinte").fill("RAL 9010");
  await cap("07-precision-teinte");
  await saisie.getByRole("button", { name: "Ajouter à la sélection" }).click();
  await expect(saisie.getByRole("region", { name: "Ma liste en cours" }).filter({ visible: true }).getByLabel("Désignation").nth(1)).toHaveValue(/^Peinture murs et plafonds acrylique .* · teinte : RAL 9010$/);

  // 5. La recherche directe contourne l'arborescence et dit où l'article se range.
  await saisie.getByLabel("Rechercher un matériau").fill("bobinot zinc");
  const resultats = saisie.getByRole("list", { name: "Résultats" });
  await expect(resultats.getByRole("button", { name: /^Bobineau de zinc/ }).first()).toContainText("Couverture › Zinguerie › Feuilles, bobines, bobineaux et bandes");
  await cap("08-recherche");
  await saisie.getByLabel("Rechercher un matériau").fill("prise 16 A étanche");
  await expect(resultats.getByRole("button", { name: /^Prise de courant 2P\+T/ }).first()).toContainText("À préciser : étanche");
  await expect(resultats.getByRole("button", { name: /^Prise de courant 2P\+T/ }).first()).toContainText("Électricité › Appareillage");
  await saisie.getByLabel("Rechercher un matériau").fill("");

  // 6. Le sélecteur : toute la carte ouvre la liste (le mot « Catalogue : » compris), et il garde ses métiers pendant un rechargement.
  const select = saisie.getByLabel("Métier");
  await select.scrollIntoViewIfNeeded();
  const s = (await select.boundingBox())!;
  for (const x of [s.x + 12, s.x + s.width / 2, s.x + s.width - 12]) expect(await page.evaluate(([px, py]) => document.elementFromPoint(px!, py!)?.tagName, [x, s.y + s.height / 2])).toBe("SELECT");
  expect(s.height).toBeGreaterThanOrEqual(48);
  await page.route("**/v1/catalogue?*", async (route) => {
    await new Promise((r) => setTimeout(r, 1200));
    await route.continue();
  });
  await select.selectOption({ label: "Électricité" });
  expect(await select.locator("option").count()).toBeGreaterThanOrEqual(10);
  await expect(bouton(saisie, "Tableau et protections")).toHaveCount(1);
  await page.unroute("**/v1/catalogue?*");
  if (!ordinateur) {
    // Téléphone : rien sous le bord de l'écran, le bouton du bas entier.
    const bas = (await saisie.getByRole("button", { name: /Créer le quantitatif · 2 matériaux/ }).filter({ visible: true }).first().boundingBox())!;
    expect(bas.y + bas.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
  await cap("09-electricite");
});
