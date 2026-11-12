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

test("la phrase dictée de la capture : deux articles, la question du comptoir, la réponse complète la gouttière", async ({ page }) => {
  await inscrire(page);
  await page.goto("/chantiers/nouveau?mode=assistant");
  const chat = page.getByRole("dialog", { name: "Nouveau quantitatif" });
  await pret(page);
  await chat.getByRole("textbox", { name: "Ton message" }).fill(DICTEE);
  await chat.getByRole("button", { name: "Envoyer le message" }).click();
  const compris = chat.getByRole("region", { name: "J'ai compris" });
  await expect(compris).toContainText("Mobiiz propose · 2 articles");
  await expect(compris).toContainText("52 m²");
  await expect(compris).toContainText(/Ardoise naturelle 32\s?×\s?22/);
  await expect(compris).toContainText(/Gouttière havraise/);
  // Jamais la phrase entière dans une désignation.
  await expect(compris).not.toContainText("j'ai besoin");
  // La question du comptoir, AVEC SA LIGNE dans la carte, avec ses boutons (direction A : jamais reposée en bulle).
  const reponses = compris.getByRole("group", { name: /^Question de Mobiiz/ });
  await expect(reponses).toContainText("En quelle matière ?");
  await expect(reponses.getByRole("button", { name: "Zinc" })).toBeVisible();
  await expect(reponses.getByRole("button", { name: "Cuivre" })).toBeVisible();
  await expect(reponses.getByRole("button", { name: "PVC" })).toBeVisible();
  await reponses.getByRole("button", { name: "Zinc" }).click();
  // Une seule carte, à jour : la gouttière est en zinc, la question n'est plus posée.
  await expect(chat.getByRole("region", { name: "J'ai compris" })).toHaveCount(1);
  await expect(compris).toContainText(/Gouttière havraise zinc/i);
  await expect(compris).toContainText("52 m²");
  // Rien n'est dans la liste sans le bouton.
  await expect(chat.getByRole("button", { name: /^Ma liste/ })).toHaveCount(0);
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
  await expect(compris.getByText("Quelle surface de couverture, en m² ?")).toBeVisible();
  // L'artisan dit ses mesures : la carte se complète, toujours une seule.
  await chat.getByRole("textbox", { name: "Ton message" }).fill("85 m² en 32 22 et 14 mètres de gouttière");
  await chat.getByRole("button", { name: "Envoyer le message" }).click();
  await expect(chat.getByRole("region", { name: "J'ai compris" })).toHaveCount(1);
  await expect(compris).toContainText("85 m²");
  await expect(compris).toContainText(/32\s?×\s?22/);
  await expect(compris).toContainText("14 m");
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
