import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { confirmerEmail } from "../e2e/confirmer-email";

/**
 * CRÉATION D'UN QUANTITATIF, direction A (Greg, 12 novembre 2026 : « Le quantitatif doit redevenir le cœur du parcours »).
 * « Nouveau quantitatif » : deux choix entiers (« Je saisis ma liste », « Mobiiz m'aide ») ; depuis la liste en cours,
 * Mobiiz propose, rien n'entre sans accord, une question va avec sa ligne et peut rester « À préciser » ; un document est
 * LU dans la liste en cours (lignes à part, jamais d'écrasement, pas de second quantitatif) ; le quota pris et la panne se
 * disent sans toucher à la liste. Modèle et lecteur simulés : aucun appel payant.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const DICTEE = "J'aurais besoin de 52 m² d'ardoise 32 22 premier choix d'Espagne j'ai besoin d'une gouttière de 25 gouttières à braise";
const FIXTURES = path.join(__dirname, "fixtures");

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

test("nouveau quantitatif : deux choix entiers, la liste à la main, Mobiiz depuis la liste, un document lu dans la liste en cours, le retour dans la même liste", async ({ page }, info) => {
  test.setTimeout(240_000);
  const telephone = info.project.name !== "ordinateur";
  await inscrire(page);

  // 1. Le choix : les deux cartes entières au-dessus du menu du bas, sans défiler, même sur le plus petit téléphone.
  await page.goto("/chantiers/nouveau");
  await expect(page.getByRole("heading", { name: "Nouveau quantitatif" })).toBeVisible();
  await page.getByRole("heading", { name: "Nouveau quantitatif" }).click();
  await expect(page.getByRole("dialog", { name: "Guide" })).toHaveCount(0);
  if (telephone) {
    const carte = (await page.getByRole("link", { name: /Mobiiz m'aide/ }).boundingBox())!;
    const menu = (await page.getByRole("navigation", { name: "Navigation principale" }).boundingBox())!;
    expect(carte.y + carte.height).toBeLessThanOrEqual(menu.y - 8);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);

  // 2. À la main : un article du catalogue avec sa quantité, un article écrit sans quantité (« à préciser »).
  await page.getByRole("link", { name: /Je saisis ma liste/ }).click();
  const saisie = page.getByRole("dialog", { name: "Saisir ma liste" });
  await expect(saisie.getByText("Chargement du catalogue…")).toHaveCount(0);
  await saisie.getByRole("button", { name: "Couverture", exact: true }).filter({ visible: true }).click();
  await saisie.getByRole("button", { name: "Ardoises", exact: true }).filter({ visible: true }).click();
  await saisie.getByRole("button", { name: "Ardoise naturelle", exact: true }).click();
  await saisie.getByRole("button", { name: "32×22", exact: true }).click();
  await saisie.getByRole("button", { name: "Espagne 1er choix", exact: true }).click();
  await saisie.getByLabel("Quantité de Ardoise naturelle 32×22 · Espagne 1er choix").first().fill("52");
  await saisie.getByRole("button", { name: "Ajouter à la sélection" }).click();
  await saisie.getByLabel("Rechercher un matériau").fill("Crochets inox maison");
  await saisie.getByRole("button", { name: /Ajouter « Crochets inox maison » tel que je l'écris/ }).click();
  await saisie.getByRole("button", { name: "Ajouter à la sélection" }).click();
  await saisie.getByLabel("Rechercher un matériau").fill("");
  await expect(saisie.getByText("Quantité à préciser").filter({ visible: true }).first()).toBeVisible();
  await expect(saisie.getByRole("button", { name: /Créer le quantitatif · 2 matériaux/ }).filter({ visible: true }).first()).toBeVisible();

  // 3. Mobiiz depuis la liste : il propose, rien n'entre sans accord ; la question va avec sa ligne, une seule fois.
  await saisie.getByRole("button", { name: "Mobiiz m'aide" }).click();
  const chat = page.getByRole("dialog", { name: "Nouveau quantitatif" });
  await expect(chat.getByRole("group", { name: "Donne à Mobiiz ce que tu as" })).toBeVisible();
  await chat.getByRole("textbox", { name: "Ton message" }).fill(DICTEE);
  await chat.getByRole("button", { name: "Envoyer le message" }).click();
  const carte = chat.getByRole("region", { name: "J'ai compris" }).last();
  await expect(carte).toContainText("Mobiiz propose · 2 articles");
  await carte.getByRole("group", { name: /^Question de Mobiiz/ }).getByRole("button", { name: "Zinc" }).click();
  const suite = chat.getByRole("region", { name: "J'ai compris" }).last();
  await expect(suite).toContainText(/zinc/i);
  // Le choix « Zinc » n'est appliqué qu'une fois : aucune bulle ne repose la même question.
  await expect(chat.getByRole("group", { name: /^Question de Mobiiz/ }).getByRole("button", { name: "Zinc" })).toHaveCount(0);
  await suite.getByRole("button", { name: "Laisser « À préciser »" }).click();
  await suite.getByRole("button", { name: /^Ajouter/ }).click();
  await expect(chat.getByRole("button", { name: /Revenir à ma liste · 1 ajouté/ })).toBeVisible();

  // 4. Un document dans la liste en cours : le coût est dit avant, les lignes arrivent à part, rien n'est créé ailleurs.
  const creations: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (r.method() === "POST" && /^\/v1\/(projects|quantitatifs)/.test(u.pathname)) creations.push(u.pathname);
  });
  await page.getByLabel("Choisir un PDF ou un fichier").setInputFiles(path.join(FIXTURES, "bon-du-negoce.pdf"));
  const accord = page.getByRole("alertdialog", { name: "Analyser ce document ?" });
  await expect(accord).toBeVisible();
  await accord.getByRole("button", { name: "Analyser le document" }).click();
  const lu = chat.getByRole("region", { name: "J'ai compris" }).last();
  await expect(lu).toContainText("Lu dans ton document · 4 articles");
  await expect(chat.getByText(/Rien n'est ajouté pour l'instant/)).toBeVisible();
  // L'ardoise 32×22 est déjà dans la liste : signalée, décochée ; elle n'écrase rien et n'entre pas d'elle-même.
  await expect(lu.getByText(/ressemble|Déjà dans ta liste/i).first()).toBeVisible();
  await lu.getByRole("button", { name: /^Ajouter les 3/ }).click();
  expect(creations).toEqual([]);

  // 5. La panne et le quota pris : dits en clair, la liste en cours ne bouge pas.
  await page.getByLabel("Choisir un PDF ou un fichier").setInputFiles(path.join(FIXTURES, "panne-liste.pdf"));
  await accord.getByRole("button", { name: "Analyser le document" }).click();
  await expect(chat.getByText(/n'est pas disponible pour le moment/)).toBeVisible();
  await page.route("**/v1/assistant/document", (r) => r.fulfill({ status: 402, contentType: "application/json", body: JSON.stringify({ error: { code: "abonnement_requis", message: "Scan quota reached", details: { action: "scan", refus: "scans", phrase: "Tes scans de liste offerts sont utilisés." } } }) }));
  await page.getByLabel("Choisir un PDF ou un fichier").setInputFiles(path.join(FIXTURES, "bon-du-negoce.pdf"));
  await accord.getByRole("button", { name: "Analyser le document" }).click();
  await expect(chat.getByText(/Tes scans de liste offerts sont utilisés\. Ta liste en cours n'a pas bougé/)).toBeVisible();
  await page.unroute("**/v1/assistant/document");

  // 6. Le retour dans LA MÊME liste : ses 2 lignes, la gouttière proposée et les 3 lignes du document ; un seul quantitatif.
  await chat.getByRole("button", { name: /Revenir à ma liste/ }).click();
  await expect(saisie.getByText("Proposé par Mobiiz · vérifie et complète").filter({ visible: true }).first()).toBeVisible();
  await saisie.getByRole("button", { name: /Créer le quantitatif · 6 matériaux/ }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/chantiers\/[0-9a-f-]{36}/);
  expect(creations.filter((c) => c === "/v1/quantitatifs")).toHaveLength(1);
});
