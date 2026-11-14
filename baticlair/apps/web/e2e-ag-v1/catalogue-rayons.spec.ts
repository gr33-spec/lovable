import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { confirmerEmail } from "../e2e/confirmer-email";

/**
 * LE CATALOGUE PAR MÉTIER (Greg, 12 novembre 2026, puis 13 novembre : chaque métier est un catalogue de premier niveau : « Métier › Rayon › Famille › Produit › Caractéristiques › Quantité […]
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

// RÈGLE CHANGÉE (Greg, 13 novembre 2026, « cœur métier ») : Zinguerie et Étanchéité sont des métiers de premier niveau ;
// métier › famille › sous-famille éventuelle › article › caractéristiques ; « Laisser à préciser » ; contexte des résultats.
test("catalogue par métier : Zinguerie › Feuilles, bobines et bandes › Bobine › zinc › finition › épaisseur › largeur ; retour sans perte ; laisser à préciser ; précision libre ; recherche directe ; sélecteur", async ({ page }, info) => {
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

  // 1. Couverture : ses familles seulement, pas des centaines de références ; ni zinguerie ni étanchéité dedans.
  for (const r of ["Ardoises", "Tuiles en terre cuite", "Fixations"]) await expect(bouton(saisie, r)).toHaveCount(1);
  for (const r of ["Zinguerie", "Étanchéité et toitures-terrasses", "Gouttières et descentes", "Membranes bitumineuses"]) await expect(bouton(saisie, r)).toHaveCount(0);
  // Zinguerie et Étanchéité sont des métiers à part, parmi ceux du couvreur.
  await expect(saisie.getByLabel("Métier").locator('optgroup[label="Tes métiers"] option')).toHaveText(["Couverture", "Zinguerie", "Étanchéité"]);
  if (ordinateur) {
    // Ordinateur : la navigation à gauche, le contenu au centre, la liste en cours à droite, en même temps.
    await expect(saisie.getByRole("navigation", { name: "Familles du catalogue" })).toBeVisible();
    await expect(saisie.getByRole("complementary", { name: "Ma liste" })).toBeVisible();
  }
  await sansDebordement();
  await cap("01-familles-couverture");
  // Une famille qui en a besoin a des sous-familles : les tuiles en terre cuite.
  await bouton(saisie, "Tuiles en terre cuite").click();
  // Greg, 13 novembre 2026 : les tuiles à emboîtement se rangent par format relevé (tuiles au m²), jamais par fabricant.
  for (const r of ["Tuiles canal", "Tuiles plates", "Emboîtement grand format (jusqu'à 12 au m²)", "Emboîtement format moyen (12 à 17 au m²)", "Emboîtement petit format (18 au m² et plus)", "Autres tuiles à emboîtement"]) await expect(bouton(saisie, r)).toHaveCount(1);
  await expect(saisie.getByRole("button", { name: /Edilians|Huguenot|Poudenx/ }).filter({ visible: true })).toHaveCount(0);
  await expect(saisie.getByLabel("Tu es ici")).toHaveText("Couverture › Tuiles en terre cuite");

  // 2. Métier, famille, produit : chaque écran reste court.
  await saisie.getByLabel("Métier").selectOption({ label: "Zinguerie" });
  for (const r of ["Gouttières et descentes", "Feuilles, bobines et bandes", "Rives, solins et habillages", "Soudure et consommables"]) await expect(bouton(saisie, r)).toHaveCount(1);
  await cap("02-familles-zinguerie");
  await bouton(saisie, "Feuilles, bobines et bandes").click();
  await expect(saisie.getByLabel("Tu es ici")).toHaveText("Zinguerie › Feuilles, bobines et bandes");
  await expect(bouton(saisie, "Bobine")).toContainText("À choisir : matériau, finition, épaisseur, largeur");
  // Bobine et bobineau restent deux produits ; jamais « Bobine de cuivre » à côté de « Bobine de zinc ».
  await expect(bouton(saisie, "Bobineau")).toHaveCount(1);
  const produits = saisie.getByRole("list", { name: "Feuilles, bobines et bandes" });
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
  await expect(saisie.getByLabel("Tu es ici")).toHaveText("Zinguerie › Feuilles, bobines et bandes › Bobine › zinc");
  await bouton(choix, "naturel").click();
  // « Laisser à préciser » : la ligne part avec ce qui est choisi ; l'épaisseur est écrite « à préciser », jamais devinée.
  await bouton(saisie, "Laisser à préciser").click();
  await expect(saisie.getByLabel("Quantité de Bobine zinc naturel · épaisseur à préciser").first()).toBeVisible();
  await saisie.getByRole("button", { name: "Ajouter à la sélection" }).click();
  const enCours = saisie.getByRole("region", { name: "Ma liste en cours" }).filter({ visible: true });
  await expect(enCours.getByLabel("Désignation").first()).toHaveValue("Bobine zinc naturel · épaisseur à préciser");
  // Revenir en arrière ne perd pas la liste en cours : la ligne est toujours là après deux retours et un changement de métier.
  await bouton(saisie, "Bobine").click();
  await saisie.getByRole("button", { name: "Choix précédent" }).click();
  await saisie.getByRole("button", { name: "Choix précédent" }).click();
  await saisie.getByLabel("Métier").selectOption({ label: "Étanchéité" });
  for (const r of ["Membranes bitumineuses", "Membranes synthétiques", "Évacuation des eaux"]) await expect(bouton(saisie, r)).toHaveCount(1);
  await expect(bouton(saisie, "Ardoises")).toHaveCount(0);
  await expect(enCours.getByLabel("Désignation").first()).toHaveValue("Bobine zinc naturel · épaisseur à préciser");
  await saisie.getByLabel("Métier").selectOption({ label: "Zinguerie" });
  await bouton(saisie, "Feuilles, bobines et bandes").click();
  await bouton(saisie, "Bobine").click();
  await bouton(choix, "zinc").click();
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
  await expect(saisie.getByRole("button", { name: /Créer le quantitatif · 2 matériaux/ }).filter({ visible: true }).first()).toBeVisible();
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
  await expect(saisie.getByRole("region", { name: "Ma liste en cours" }).filter({ visible: true }).getByLabel("Désignation").nth(2)).toHaveValue(/^Peinture murs et plafonds acrylique .* · teinte : RAL 9010$/);

  // 5. La recherche directe contourne l'arborescence et dit où l'article se range.
  await saisie.getByLabel("Rechercher un matériau").fill("bobinot zinc");
  const resultats = saisie.getByRole("list", { name: "Résultats" });
  await expect(resultats.getByRole("button", { name: /^Bobineau de zinc/ }).first()).toContainText("Zinguerie · Feuilles, bobines et bandes · Bobineau");
  // Jamais deux résultats que rien ne distingue : chaque ligne des résultats est unique.
  const lignes = await resultats.getByRole("button").allInnerTexts();
  expect(new Set(lignes).size).toBe(lignes.length);
  await cap("08-recherche");
  await saisie.getByLabel("Rechercher un matériau").fill("prise 16 A étanche");
  await expect(resultats.getByRole("button", { name: /^Prise de courant 2P\+T/ }).first()).toContainText("À préciser : étanche");
  await expect(resultats.getByRole("button", { name: /^Prise de courant 2P\+T/ }).first()).toContainText("Électricité · Appareillage · Prise de courant 2P+T");
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
    const bas = (await saisie.getByRole("button", { name: /Créer le quantitatif · 3 matériaux/ }).filter({ visible: true }).first().boundingBox())!;
    expect(bas.y + bas.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
  await cap("09-electricite");
});


// Greg, 13 novembre 2026 (derniers écarts du cœur métier) : « Teste Couverture, Zinguerie et Étanchéité comme trois métiers
// indépendants : navigation, recherche, ajout au brouillon » ; les sept métiers partiels restent visibles et disent
// « Catalogue en cours d'enrichissement », avec toujours « Je saisis mon matériau ».
test("trois métiers indépendants : navigation, recherche et ajout au brouillon pour Couverture, Zinguerie et Étanchéité ; un métier partiel se dit en cours d'enrichissement", async ({ page }) => {
  test.setTimeout(180_000);
  await inscrire(page);
  await page.goto("/chantiers/nouveau?mode=manuel");
  const saisie = page.getByRole("dialog", { name: "Saisir ma liste" });
  await expect(saisie.getByText("Chargement du catalogue…")).toHaveCount(0);
  await saisie.getByRole("heading", { name: "Quels matériaux veux-tu ajouter ?" }).click();
  await expect(page.getByRole("dialog", { name: "Guide" })).toHaveCount(0);
  const enCours = saisie.getByRole("region", { name: "Ma liste en cours" }).filter({ visible: true });
  const METIERS = [
    { nom: "Couverture", siennes: ["Ardoises", "Tuiles en terre cuite"], pasSiennes: ["Gouttières et descentes", "Membranes bitumineuses"], cherche: "ardoise naturelle", contexte: /Couverture · Ardoises/ },
    { nom: "Zinguerie", siennes: ["Gouttières et descentes", "Soudure et consommables"], pasSiennes: ["Ardoises", "Membranes bitumineuses"], cherche: "bobineau zinc", contexte: /Zinguerie · Feuilles, bobines et bandes/ },
    { nom: "Étanchéité", siennes: ["Membranes bitumineuses", "Évacuation des eaux"], pasSiennes: ["Ardoises", "Gouttières et descentes"], cherche: "membrane epdm", contexte: /Étanchéité · Membranes synthétiques/ },
  ];
  let lignes = 0;
  for (const m of METIERS) {
    // Navigation : le métier s'ouvre sur SES familles, jamais celles d'un autre ; le fil d'Ariane commence par lui.
    await saisie.getByLabel("Métier").selectOption({ label: m.nom });
    for (const f of m.siennes) await expect(bouton(saisie, f), `${m.nom} : ${f}`).toHaveCount(1);
    for (const f of m.pasSiennes) await expect(bouton(saisie, f), `${m.nom} sans ${f}`).toHaveCount(0);
    await bouton(saisie, m.siennes[0]!).click();
    await expect(saisie.getByLabel("Tu es ici")).toContainText(`${m.nom} › ${m.siennes[0]}`);
    // Un métier réellement fourni ne se dit pas « en cours d'enrichissement ».
    await expect(saisie.getByText("Catalogue en cours d'enrichissement")).toHaveCount(0);
    // Recherche : le résultat dit son métier et sa famille.
    await saisie.getByLabel("Rechercher un matériau").fill(m.cherche);
    const resultat = saisie.getByRole("list", { name: "Résultats" }).getByRole("button").filter({ hasText: m.contexte }).first();
    await expect(resultat, `recherche « ${m.cherche} »`).toBeVisible();
    // Ajout au brouillon : la ligne rejoint la liste en cours, et y reste quand on change de métier.
    await resultat.click();
    await saisie.getByRole("button", { name: "Ajouter à la sélection" }).click();
    lignes += 1;
    await expect(enCours.getByLabel("Désignation")).toHaveCount(lignes);
    await saisie.getByLabel("Rechercher un matériau").fill("");
  }
  await expect(saisie.getByRole("button", { name: /Créer le quantitatif · 3 matériaux/ }).filter({ visible: true }).first()).toBeVisible();

  // Un métier partiel reste visible et ouvrable ; il dit que son catalogue grandit, et l'on peut toujours écrire son matériau.
  await saisie.getByLabel("Métier").selectOption({ label: "Plomberie" });
  const note = saisie.getByRole("note").filter({ hasText: "Catalogue en cours d'enrichissement" });
  await expect(note).toBeVisible();
  await expect(bouton(saisie, "Alimentation en eau")).toHaveCount(1);
  await note.getByRole("button", { name: "Je saisis mon matériau" }).click();
  await saisie.locator("#libre-texte").fill("Collecteur laiton 5 départs");
  await saisie.getByRole("button", { name: "Ajouter à la sélection" }).click();
  await expect(enCours.getByLabel("Désignation")).toHaveCount(4);
  // L'action reste là pour un métier fourni aussi.
  await saisie.getByLabel("Métier").selectOption({ label: "Couverture" });
  await expect(saisie.getByRole("button", { name: "Je saisis mon matériau" }).filter({ visible: true })).toHaveCount(1);
});
