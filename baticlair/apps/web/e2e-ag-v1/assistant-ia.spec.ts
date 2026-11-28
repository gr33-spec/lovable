import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { confirmerEmail } from "../e2e/confirmer-email";

/**
 * L'ASSISTANT CONNECTÉ À L'IA (Greg, 12 novembre 2026, capture de l'assistant : « Ici, je veux une IA connectée. Quand
 * je parle ça doit retranscrire et convertir en quantitatif, l'IA doit poser des questions si besoin »). La phrase dictée
 * de la capture, sans ponctuation, sortait en UNE ligne. Avec `ASSISTANT_IA=on` : deux articles, la question du comptoir
 * avec ses boutons, la réponse qui complète l'article ; rien dans la liste sans « Ajouter ». Le modèle est joué par son
 * double (`AI_PROVIDER=fake`) : aucun appel payant.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const DICTEE = "J'aurais besoin de 52 m² d'ardoise 32 22 premier choix d'Espagne j'ai besoin d'une gouttière de 25 gouttières à braise";

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
});

async function inscrire(page: Page) {
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Jean Martin");
  await page.getByLabel("Nom de ton entreprise").fill(`Toitures ${unique()}`);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  const email = `artisan-${unique()}@example.fr`;
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await confirmerEmail(page, email);
}

/**
 * La conversation est prête : le bonjour est affiché et le guide de première visite, qui s'ouvre par-dessus un instant après
 * l'arrivée, est refermé. Sans cette attente, une saisie faite AVANT l'ouverture du guide pouvait être perdue (chaîne du
 * 12 novembre 2026, iPhone SE : « Envoyer le message » resté grisé).
 */
async function pret(page: Page) {
  const chat = page.getByRole("dialog", { name: "Nouveau quantitatif" });
  await expect(chat.getByText(/Donne-moi ce que tu as/)).toBeVisible();
  // Une action déclenche la fermeture du guide (gestionnaire plus haut), puis on vérifie qu'il n'est plus là.
  await chat.getByText(/Donne-moi ce que tu as/).click();
  await page.waitForTimeout(800);
  await chat.getByText(/Donne-moi ce que tu as/).click();
  await expect(page.getByRole("dialog", { name: "Guide" })).toHaveCount(0);
}

test("la phrase dictée de la capture : une surface à calculer, elle passe par le moteur comme un devis (jamais « 52 m² » recopiés)", async ({ page }) => {
  await inscrire(page);
  await page.goto("/chantiers/nouveau?mode=assistant");
  const chat = page.getByRole("dialog", { name: "Nouveau quantitatif" });
  await pret(page);
  await chat.getByRole("textbox", { name: "Ton message" }).fill(DICTEE);
  await chat.getByRole("button", { name: "Envoyer le message" }).click();
  // RÈGLE CHANGÉE (Greg, 28 novembre 2026, test réel sur iPhone) : « on n'envoie JAMAIS des m² à un fournisseur ». Avant :
  // la carte « Mobiiz propose · 2 articles » recopiait « 52 m² ». Maintenant : le quantitatif s'ouvre sur les questions du
  // moteur (comme un devis), puis le calcul, les suggestions et la liste.
  await expect(page).toHaveURL(/\/chantiers\/[0-9a-f-]{36}/, { timeout: 60_000 });
  await expect(page.getByRole("region", { name: "Les questions" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("52 m²")).toHaveCount(0);
});

test("une photo de chantier : ce que l'assistant voit, les matériaux à confirmer sans quantité, ses questions ; les mesures dites complètent", async ({ page }) => {
  // Greg, 12 novembre 2026 (feuille « Ajouter ») : « un artisan doit pouvoir donner une photo pour aider l'IA à comprendre le
  // contexte du chantier et analyser les matériaux […] et poser les questions nécessaires ».
  await inscrire(page);
  await page.goto("/chantiers/nouveau?mode=assistant");
  const chat = page.getByRole("dialog", { name: "Nouveau quantitatif" });
  await pret(page);
  await page.getByLabel("Choisir une photo").setInputFiles(path.join(__dirname, "fixtures", "toiture.jpg"));
  await expect(chat.getByRole("img", { name: "Photo du chantier" })).toBeVisible();
  await expect(chat.getByText("Je vois une couverture en ardoises et une gouttière en zinc.")).toBeVisible();
  const compris = chat.getByRole("region", { name: "J'ai compris" });
  await expect(compris).toContainText("Vu sur ta photo · 2 articles");
  await expect(compris).toContainText(/Ardoise naturelle/);
  await expect(compris).toContainText(/Gouttière/);
  // Une photo ne mesure rien : ni la quantité ni le format inventés par le modèle ne passent.
  await expect(compris).not.toContainText(/12\s?m\b/);
  await expect(compris).not.toContainText(/32\s?×\s?22/);
  // UNE question à la fois (Greg, 14 novembre 2026) : d'abord ce qu'il veut faire ; la surface viendra ensuite.
  await expect(chat.getByText("Tu refais toute la couverture ou une partie ?")).toBeVisible();
  await expect(chat.getByText("Quelle surface de couverture, en m² ?")).toHaveCount(0);
  // L'artisan dit ses mesures : la carte se complète, toujours une seule.
  await chat.getByRole("textbox", { name: "Ton message" }).fill("85 m² en 32 22 et 14 mètres de gouttière");
  await chat.getByRole("button", { name: "Envoyer le message" }).click();
  // Les mesures dites : un quantitatif à calculer, par le moteur (Greg, 28 novembre 2026 ; avant : « 85 m² » recopiés).
  await expect(page).toHaveURL(/\/chantiers\/[0-9a-f-]{36}/, { timeout: 60_000 });
  await expect(page.getByRole("region", { name: "Les questions" })).toBeVisible({ timeout: 60_000 });
});

test("une photo d'une liste écrite : l'assistant la reconnaît et propose la lecture du document, comme avant", async ({ page }) => {
  await inscrire(page);
  await page.goto("/chantiers/nouveau?mode=assistant");
  await pret(page);
  await page.getByLabel("Choisir une photo").setInputFiles(path.join(__dirname, "fixtures", "liste-papier.jpg"));
  // La confirmation habituelle avant l'analyse d'une liste (son coût est dit avant) ; rien n'est recopié par l'assistant.
  await expect(page.getByRole("dialog", { name: "Nouveau quantitatif" }).getByRole("region", { name: "J'ai compris" })).toHaveCount(0);
  await expect(page.getByRole("alertdialog", { name: "Analyser ce document ?" })).toBeVisible();
});

/**
 * « ARDOISE 5 ET FRUITIER » (Greg, 14 novembre 2026) : l'objectif est un quantitatif parfait. Un article flou ou inconnu se
 * demande AVANT d'entrer dans la liste, une question à la fois, avec des choix à toucher ; les étapes du travail se voient
 * en direct et se déplient ; plus de gros boutons en vrac : la barre du bas, son « + » et le micro ; l'écran suit le thème.
 */
test("« Ardoise 5 et fruitier » : une question avant d'ajouter, une à la fois ; les étapes en direct, dépliables ; fond blanc en mode jour", async ({ page }) => {
  await inscrire(page);
  await page.goto("/chantiers/nouveau?mode=assistant");
  const chat = page.getByRole("dialog", { name: "Nouveau quantitatif" });
  await pret(page);
  // Comme dans Claude ou ChatGPT : aucun gros bouton dans le fil, tout est dans la barre du bas.
  await expect(chat.getByRole("group", { name: "Donne à Mobiiz ce que tu as" })).toHaveCount(0);
  await expect(chat.getByRole("button", { name: "Ajouter : photo ou document" })).toBeVisible();
  await expect(chat.getByRole("button", { name: "Dicter" })).toBeVisible();
  await expect(chat.getByText(/Analyses disponibles/)).toHaveCount(0);
  const dossier = process.env.CAPTURES_ASSISTANT;
  if (dossier) await page.screenshot({ path: path.join(dossier, `${test.info().project.name}-1-accueil-nuit.png`) });

  await chat.getByRole("textbox", { name: "Ton message" }).fill("Ardoise 5 et fruitier");
  await chat.getByRole("button", { name: "Envoyer le message" }).click();
  // Rien n'entre dans la liste : la question d'abord, avec ses choix.
  await expect(chat.getByText("Quelle ardoise : format, origine, choix ?")).toBeVisible();
  await expect(chat.getByRole("region", { name: "J'ai compris" })).toHaveCount(0);
  // Les étapes : repliées sur « Terminé », dépliables pour voir ce qui a été fait.
  const etapes = chat.getByRole("button", { name: /Terminé/ });
  await expect(etapes).toBeVisible();
  await etapes.click();
  const detail = chat.getByRole("list", { name: "Ce que Mobiiz a fait" });
  for (const t of ["Réflexion…", "Lecture de ta demande…", "Vérification des quantités…", "Terminé"]) await expect(detail).toContainText(t);
  if (dossier) await page.screenshot({ path: path.join(dossier, `${test.info().project.name}-2-question-etapes-nuit.png`) });

  // Un choix à toucher ; l'ardoise est proposée, et le mot inconnu se demande, avec les mots de l'artisan.
  await chat.getByRole("button", { name: "32×22 Espagne 1er choix", exact: true }).click();
  const compris = chat.getByRole("region", { name: "J'ai compris" });
  await expect(compris).toContainText(/Ardoise naturelle 32\s?×\s?22/);
  await expect(chat.getByText("« fruitier », tu veux dire quoi ?")).toBeVisible();
  await expect(compris).not.toContainText(/fruit/i);

  // MODE JOUR : l'assistant suit le thème de l'app, fond blanc.
  await page.evaluate(() => {
    window.localStorage.setItem("mobiiz-theme", "clair");
    document.documentElement.dataset.theme = "clair";
    window.dispatchEvent(new Event("mobiiz-theme"));
  });
  await expect(chat.getByText("« fruitier », tu veux dire quoi ?")).toBeVisible();
  await expect.poll(() => chat.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(255, 255, 255)");
  if (dossier) await page.screenshot({ path: path.join(dossier, `${test.info().project.name}-3-suite-jour.png`) });
});
