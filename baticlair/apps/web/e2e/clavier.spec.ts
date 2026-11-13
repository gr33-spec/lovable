import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * LE CLAVIER (Greg, 28 octobre 2026, point 1 : « quand j'écris, je ne vois pas ce que je tape ») : sur un iPhone SE, le
 * clavier ouvert laisse environ 330 px visibles. Règle pour toute l'app : le champ qui a le focus reste visible au-dessus
 * du clavier, aucun élément fixe ne le recouvre, la barre du bas se cache pendant la saisie. On simule le clavier ouvert
 * avec une fenêtre de 375 × 330 et on passe chaque champ en revue : inscription, connexion, « Écris ta liste », quantités,
 * commune, négoces (e-mail, nom, téléphone), profil. La page du négoce (prix) et le code admin sont vérifiés dans
 * `achat-groupe.spec.ts`, au fil du parcours.
 */
const CLAVIER = { width: 375, height: 330 };
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Le champ prend le focus : visible en entier, et rien par-dessus (ce qu'on touche à son centre, c'est lui). */
async function champVisible(page: Page, champ: Locator) {
  await champ.click();
  await expect(champ).toBeFocused();
  await expect(champ).toBeInViewport({ ratio: 1 });
  const recouvert = await champ.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const dessus = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !(dessus === el || el.contains(dessus) || (dessus instanceof HTMLLabelElement && dessus.contains(el)));
  });
  expect(recouvert, "un élément recouvre le champ").toBe(false);
  const barre = page.getByRole("navigation", { name: "Navigation principale" });
  const rect = await champ.boundingBox();
  if (rect && (await barre.count())) {
    const chevauche = await barre.evaluate((n, r) => {
      const b = n.getBoundingClientRect();
      return b.bottom > 0 && b.top < window.innerHeight && b.top < r.y + r.height && b.bottom > r.y;
    }, rect);
    expect(chevauche, "la barre du bas recouvre le champ").toBe(false);
  }
}

async function apiJson(page: Page, method: string, url: string, body?: unknown) {
  return page.evaluate(
    async ({ method, url, body }) => {
      const companyId = localStorage.getItem("baticlair.companyId");
      const res = await fetch(url, { method, headers: { "content-type": "application/json", accept: "application/json", ...(companyId ? { "x-company-id": companyId } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return res.status;
    },
    { method, url, body },
  );
}

test.describe("Le clavier ouvert sur iPhone SE", () => {
  test.setTimeout(240_000);

  test("chaque champ reste visible au-dessus du clavier, rien ne le recouvre, la barre du bas s'efface", async ({ page }, info) => {
    test.skip(info.project.name !== "telephone", "le clavier simulé est celui du téléphone");
    await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
      await page.getByRole("button", { name: "Passer le guide" }).click();
    });
    // 1. L'inscription.
    await page.goto("/inscription");
    await page.setViewportSize(CLAVIER);
    const email = `artisan-${unique()}@example.fr`;
    for (const [label, valeur] of [
      ["Prénom et nom", "Jean Martin"],
      ["Nom de ton entreprise", `Toitures ${unique()}`],
      ["E-mail professionnel", email],
      ["Mot de passe", "motdepasse-solide"],
    ] as const) {
      const champ = page.getByLabel(label, { exact: true });
      await champVisible(page, champ);
      await champ.fill(valeur);
    }
    await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
    await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByRole("heading", { name: "Voici ton adresse Mobiiz :" })).toBeVisible();
    await page.getByRole("button", { name: "C'est compris" }).click();
    await expect(page.getByRole("heading", { name: /^Bonjour Jean/ }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
    expect(await apiJson(page, "PATCH", "/v1/company/profile", { name: `Toitures ${unique()}`, address: "3 rue de la Gare, 22100 Ville-22", siret: "73282932000074", phone: null, email: null })).toBe(200);
    expect(await apiJson(page, "POST", "/v1/groupe/siret")).toBe(200);

    // 2. « Saisir ma liste » (31 octobre 2026) : la recherche, la ligne libre, la quantité ; le bouton du bas reste visible.
    await page.goto("/chantiers/nouveau?mode=manuel");
    const dialogue = page.getByRole("dialog", { name: "Saisir ma liste" });
    // Le guide du premier passage se ferme avant qu'on tape (même précaution que `catalogue-rayons.spec.ts`).
    await expect(dialogue.getByText("Chargement du catalogue…")).toHaveCount(0);
    await dialogue.getByRole("heading", { name: "Quels matériaux veux-tu ajouter ?" }).click();
    await expect(page.getByRole("dialog", { name: "Guide" })).toHaveCount(0);
    await champVisible(page, dialogue.getByLabel("Rechercher un matériau"));
    await dialogue.getByLabel("Rechercher un matériau").fill("Crochets inox maison");
    await dialogue.getByRole("button", { name: /Ajouter « Crochets inox maison » tel que je l'écris/ }).click();
    await champVisible(page, dialogue.getByLabel("Quantité de la ligne libre"));
    await dialogue.getByLabel("Quantité de la ligne libre").fill("90");
    await dialogue.getByRole("button", { name: "Ajouter à la sélection" }).click();
    await champVisible(page, dialogue.getByLabel("Quantité de Crochets inox maison").filter({ visible: true }));
    await dialogue.getByRole("button", { name: "Retour" }).click();
    await page.getByRole("alertdialog", { name: "Quitter la saisie ?" }).getByRole("button", { name: "Quitter" }).click();

    // 3. L'achat groupé : la quantité, la commune, les négoces (e-mail, nom, téléphone).
    await page.goto("/achats-groupes/lancer");
    // Point 3 du 30 octobre : le catalogue en listes, famille › produit › format.
    await page.getByRole("button", { name: "Ardoises", exact: true }).filter({ visible: true }).click();
    await page.getByRole("button", { name: "Ardoise naturelle", exact: true }).click();
    await page.getByRole("button", { name: "32×22", exact: true }).click();
    await page.getByRole("button", { name: "Espagne 1er choix", exact: true }).click();
    const qte = page.getByLabel("Quantité de Ardoise naturelle 32×22 · Espagne 1er choix");
    await champVisible(page, qte);
    await qte.fill("900");
    await page.getByRole("button", { name: "Ajouter à ma liste" }).click();
    await page.getByRole("button", { name: "Continuer" }).click();
    const commune = page.getByLabel("Commune de livraison");
    await champVisible(page, commune);
    await commune.fill("22300 Lannion");
    await page.getByRole("button", { name: "Continuer" }).click();
    const courriel = page.getByLabel(/^(E-mail de ton commercial|Ou l'e-mail du commercial d'un autre négoce)$/);
    await champVisible(page, courriel);
    await courriel.fill(`n-${unique()}@negoce.example`);
    const nom = page.getByLabel("Nom du négoce");
    await champVisible(page, nom);
    await nom.fill("Négoce Clavier");
    const tel = page.getByLabel("Son téléphone (pour le prévenir)");
    await champVisible(page, tel);
    await tel.fill("02 96 00 00 09");

    // 4. Le profil.
    await page.goto("/compte/entreprise");
    for (const label of ["Nom de l'entreprise", "Adresse", "SIRET", "Téléphone"]) await champVisible(page, page.getByLabel(label, { exact: true }));

    // 5. La connexion.
    await page.context().clearCookies();
    await page.goto("/connexion");
    for (const label of ["E-mail", "Mot de passe"]) await champVisible(page, page.getByLabel(label, { exact: true }));
  });
});
