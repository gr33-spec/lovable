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

test("la phrase dictée de la capture : deux articles, la question du comptoir, la réponse complète la gouttière", async ({ page }) => {
  await inscrire(page);
  await page.goto("/chantiers/nouveau");
  const chat = page.getByRole("dialog", { name: "Nouveau quantitatif" });
  await chat.getByRole("textbox", { name: "Ton message" }).fill(DICTEE);
  await chat.getByRole("button", { name: "Envoyer le message" }).click();
  const compris = chat.getByRole("region", { name: "J'ai compris" });
  await expect(compris).toContainText("J'ai compris 2 articles");
  await expect(compris).toContainText("52 m²");
  await expect(compris).toContainText(/Ardoise naturelle 32\s?×\s?22/);
  await expect(compris).toContainText(/Gouttière havraise/);
  // Jamais la phrase entière dans une désignation.
  await expect(compris).not.toContainText("j'ai besoin");
  // La question du comptoir, avec ses boutons.
  await expect(chat.getByText("Gouttière de 25 : en zinc, en cuivre ou en PVC ?")).toBeVisible();
  const reponses = chat.getByRole("group", { name: /^Réponses à : Gouttière de 25/ });
  await expect(reponses.getByRole("button")).toHaveText(["Zinc", "Cuivre", "PVC"]);
  await reponses.getByRole("button", { name: "Zinc" }).click();
  // Une seule carte, à jour : la gouttière est en zinc, la question n'est plus posée.
  await expect(chat.getByRole("region", { name: "J'ai compris" })).toHaveCount(1);
  await expect(compris).toContainText(/Gouttière havraise zinc/i);
  await expect(compris).toContainText("52 m²");
  // Rien n'est dans la liste sans le bouton.
  await expect(chat.getByRole("button", { name: /^Ma liste/ })).toHaveCount(0);
});
