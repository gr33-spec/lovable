import { expect, test, type Page } from "@playwright/test";
import { confirmerEmail } from "./confirmer-email";

/**
 * DEUX PARCOURS RELIÉS (Greg, 7 novembre 2026, captures « Mobiiz | Assistant ») : 1) une seule porte, la conversation :
 * plusieurs articles dans une phrase, « J'ai compris » article par article, rien d'ajouté sans « Ajouter à ma liste » ;
 * le « + » ouvre « Ajouter » (photo, document, catalogue). 2) « Ton quantitatif est prêt » : « Demander des prix » et
 * l'interrupteur « Chercher aussi un regroupement », les lignes recommandées cochées, chacune cherchant seule.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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
  // Le secteur de l'entreprise (une liste écrite n'a pas d'adresse de chantier).
  const r = await page.evaluate(async () => {
    const companyId = localStorage.getItem("baticlair.companyId");
    const res = await fetch("/v1/company/profile", { method: "PATCH", headers: { "content-type": "application/json", ...(companyId ? { "x-company-id": companyId } : {}) }, body: JSON.stringify({ address: "3 rue des Ajoncs, 22300 Lannion" }) });
    return res.status;
  });
  expect(r).toBe(200);
}

test("une phrase, deux articles : « J'ai compris », ajouter, voir ma liste, puis la carte du regroupement", async ({ page }) => {
  await inscrire(page);
  await page.goto("/chantiers/nouveau?mode=assistant");
  const chat = page.getByRole("dialog", { name: "Nouveau quantitatif" });
  await expect(chat.getByText("Bonjour Jean. Donne-moi ce que tu as : je prépare, tu vérifies.")).toBeVisible();
  // Le « + » : photo, document, catalogue.
  await chat.getByRole("button", { name: "Ajouter : photo, document ou catalogue" }).click();
  const feuille = page.getByRole("dialog", { name: "Ajouter" });
  for (const o of ["Prendre une photo", "Choisir un document", "Parcourir le catalogue"]) await expect(feuille.getByText(o, { exact: true })).toBeVisible();
  await feuille.getByRole("button", { name: "Fermer" }).click();
  // Plusieurs articles dans une phrase, l'espace des milliers compris.
  await chat.getByRole("textbox", { name: "Ton message" }).fill("1 000 ardoises naturelles 32×22 Espagne 1er choix et 950 crochets inox 100 mm");
  await chat.getByRole("button", { name: "Envoyer le message" }).click();
  const compris = chat.getByRole("region", { name: "J'ai compris" });
  await expect(compris).toContainText("J'ai compris 2 articles");
  await expect(compris).toContainText("1 000 pièces");
  await expect(compris).toContainText("950 pièces");
  await expect(compris).toContainText("Espagne · 1er choix");
  await compris.getByRole("button", { name: "Ajouter les 2 à ma liste" }).click();
  await expect(chat.getByRole("button", { name: "Ma liste · 2" })).toBeVisible();
  await chat.getByRole("button", { name: "Voir ma liste (2)" }).click();
  await expect(page).toHaveURL(/\/chantiers\/[0-9a-f-]{36}/);
  // « Ton quantitatif est prêt » : l'interrupteur allumé sur l'article à fort potentiel ; un seul bouton principal.
  const prete = page.getByRole("region", { name: "Ton quantitatif est prêt" });
  await expect(prete).toBeVisible({ timeout: 20_000 });
  await expect(prete).toContainText("Ton quantitatif est prêt : 2 articles.");
  const inter = prete.getByRole("switch", { name: "Chercher aussi un regroupement" });
  await expect(inter).toHaveAttribute("aria-checked", "true");
  await prete.getByRole("button", { name: "Voir les 1 article sélectionné" }).click();
  await expect(prete.getByRole("list", { name: "Articles pour le regroupement" })).toContainText(/Gros volume|cherchen?t? ce produit/);
  await expect(prete.getByText("Rien ne rejoint un groupe sans ton accord.")).toBeVisible();
  await expect(prete.getByRole("button", { name: "Continuer" })).toHaveCount(0);
  // « Demander les prix à mes négoces » (le bouton de la liste) : la demande s'ouvre ET la ligne cherche, seule.
  const projectId = /\/chantiers\/([0-9a-f-]{36})/.exec(page.url())![1]!;
  await page.getByRole("button", { name: "Demander les prix à mes négoces" }).first().click();
  await expect
    .poll(async () => {
      const a = await page.evaluate(async (url) => {
        const companyId = localStorage.getItem("baticlair.companyId");
        const r = await fetch(url, { headers: { accept: "application/json", ...(companyId ? { "x-company-id": companyId } : {}) } });
        return (await r.json()) as { lignes: { recherche: { statut: string } | null }[] };
      }, `/v1/projects/${projectId}/rapprochement`);
      // « proposee » quand un besoin compatible d'une autre entreprise existe déjà (série ordinateur après téléphone).
      return a.lignes.filter((l) => ["disponible", "proposee", "rejointe"].includes(l.recherche?.statut ?? "")).length;
    }, { timeout: 15_000 })
    .toBe(1);
});

test("le langage des artisans (Greg, 8 novembre 2026) : « 36 mètres de Lito » → « Tu veux dire 36 mètres linéaires de liteaux ? », la section, puis la validation finale", async ({ page }) => {
  await inscrire(page);
  await page.goto("/chantiers/nouveau?mode=assistant");
  const chat = page.getByRole("dialog", { name: "Nouveau quantitatif" });
  await expect(chat.getByText("Bonjour Jean. Donne-moi ce que tu as : je prépare, tu vérifies.")).toBeVisible();
  // Le guide de première visite peut s'ouvrir par-dessus et vider la case en se fermant : on réécrit jusqu'à pouvoir envoyer.
  await expect(async () => {
    await chat.getByRole("textbox", { name: "Ton message" }).fill("36 mètres de Lito");
    await expect(chat.getByRole("button", { name: "Envoyer le message" })).toBeEnabled({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await chat.getByRole("button", { name: "Envoyer le message" }).click();
  const compris = chat.getByRole("region", { name: "J'ai compris" });
  const question = compris.getByRole("group", { name: "Question de Mobiiz" });
  await expect(question).toContainText("Tu veux dire 36 mètres linéaires de liteaux ?");
  // Tant que l'artisan n'a pas dit « Oui », la ligne garde SES mots.
  await expect(compris).toContainText("Lito");
  await question.getByRole("button", { name: "Oui" }).click();
  await expect(question).toContainText("Quelle section ?");
  for (const s of ["18×40", "27×40", "Autre"]) await expect(question.getByRole("button", { name: s, exact: true })).toBeVisible();
  await question.getByRole("button", { name: "27×40", exact: true }).click();
  await expect(question).toContainText("Quel traitement ?");
  await question.getByRole("button", { name: "Passer : le négoce précisera" }).click();
  await expect(compris.getByRole("group", { name: "Question de Mobiiz" })).toHaveCount(0);
  await expect(compris).toContainText("Liteau 27×40");
  await expect(compris).toContainText("36 m");
  // La validation finale reste à l'artisan.
  await compris.getByRole("button", { name: "Ajouter à ma liste" }).click();
  await expect(chat.getByRole("button", { name: "Ma liste · 1" })).toBeVisible();
  await chat.getByRole("button", { name: "Voir ma liste (1)" }).click();
  await expect(page).toHaveURL(/\/chantiers\/[0-9a-f-]{36}/);
  await expect(page.getByText("Liteau 27×40").first()).toBeVisible({ timeout: 20_000 });
});
