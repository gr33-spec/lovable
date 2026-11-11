import { expect, test, type Page } from "@playwright/test";
import { confirmerEmail } from "./confirmer-email";

/**
 * L'ACCUEIL ET « MES LISTES » (Greg, 1er novembre 2026, maquette « Bonjour Greg ») : 1) « À faire maintenant » (une action,
 * la règle de priorité, « Voir N autres brouillons », la reprise exacte)
 * (Greg, 6 novembre 2026 : « À faire » ne montre que des actions, sinon « Aucun besoin en cours ») ; 2) « Mes listes » : la carte et son « … », la suppression
 * définitive (annuler, confirmer, double clic, refus motivé, sélection multiple sans suppression partielle silencieuse).
 * Rien n'est envoyé à un négoce depuis l'accueil. Données de test seulement.
 */
const SECRET = "Bearer e2e-secret-de-la-tache";
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

test.beforeEach(async ({ page, request }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  expect((await request.post("/v1/internal/test/mode-regroupement", { headers: { authorization: SECRET }, data: { mode: "automatique" } })).status()).toBe(200);
});

async function apiJson<T = unknown>(page: Page, method: string, url: string, body?: unknown): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ({ method, url, body }) => {
      const companyId = localStorage.getItem("baticlair.companyId");
      const res = await fetch(url, { method, headers: { "content-type": "application/json", accept: "application/json", ...(companyId ? { "x-company-id": companyId } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: res.status, body: (await res.json().catch(() => null)) as T };
    },
    { method, url, body },
  );
}

async function inscrire(page: Page, prenom = "Jean") {
  const entreprise = `Toitures ${unique()}`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill(`${prenom} Martin`);
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  const email = `artisan-${unique()}@example.fr`;
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`^Bonjour ${prenom}`) }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  // Greg, 1er novembre 2026 : un e-mail confirmé pour ajouter des quantités à un achat groupé (boîte de test).
  await confirmerEmail(page, email);
  return entreprise;
}

/** Une liste saisie (aucune IA), renommée. */
async function liste(page: Page, nom: string) {
  const q = await apiJson<{ id: string; projetId: string }>(page, "POST", "/v1/quantitatifs", { lignes: [{ libelle: "Ardoise naturelle 32×22", quantite: "900", unite: "pièces" }] });
  expect(q.status).toBe(201);
  expect((await apiJson(page, "PATCH", `/v1/projects/${q.body.projetId}`, { name: nom })).status).toBe(200);
  return q.body;
}

/** Une liste validée et une demande partie chez un négoce (boîte de test, jamais un vrai e-mail). */

/**
 * JUSQU'À 5 NÉGOCES PAR DEMANDE (Greg, 11 novembre 2026) : pour toutes les formules et tous les parcours. La page Tarifs
 * le dit ; la feuille « À qui j'envoie ? » ne laisse pas cocher un sixième négoce et dit la règle d'une phrase neutre.
 */
const CAPTURES = process.env.NEGOCES_CAPTURES ?? "test-results/negoces";

test("Tarifs : « l'envoi jusqu'à 5 négoces par demande », plus jamais « à tous tes négoces »", async ({ page }, info) => {
  await page.goto("/tarifs");
  await expect(page.getByText("Le PDF et l'envoi jusqu'à 5 négoces par demande")).toBeVisible();
  await expect(page.getByText(/tous tes négoces/)).toHaveCount(0);
  await expect(page.getByText(/un seul négoce/)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByText("Le PDF et l'envoi jusqu'à 5 négoces par demande").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${CAPTURES}/${info.project.name}-tarifs.png` });
});

test("Feuille « À qui j'envoie ? » : six négoces au carnet, cinq cochés ; le sixième ne se coche pas, la phrase est neutre ; en décocher un le libère", async ({ page }, info) => {
  test.setTimeout(120_000);
  await inscrire(page);
  const q = await liste(page, "Chantier six négoces");
  let current = (await apiJson<{ questions: { id: string; boutons: { valeur: string }[] }[] }>(page, "GET", `/v1/quantitatifs/${q.id}`)).body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) current = (await apiJson<typeof current>(page, "POST", `/v1/quantitatifs/${q.id}/reponses`, { reponses: [{ question: current.questions[0]!.id, valeur: current.questions[0]!.boutons[0]?.valeur ?? "ok" }] })).body;
  expect((await apiJson(page, "POST", `/v1/quantitatifs/${q.id}/validation`)).status).toBe(200);
  const ids: string[] = [];
  for (let i = 1; i <= 6; i++) ids.push((await apiJson<{ id: string }>(page, "POST", "/v1/suppliers", { name: `Négoce ${i}`, email: `n${i}-${unique()}@negoce.example` })).body.id);
  // Le serveur : six d'un coup est refusé d'une phrase neutre, sans écran d'abonnement.
  const six = await apiJson<{ error: { code: string; details: { phrase: string } } }>(page, "POST", `/v1/projects/${q.projetId}/price-requests`, { supplierIds: ids });
  expect(six.status).toBe(400);
  expect(six.body.error.details.phrase).toBe("Jusqu'à 5 négoces par demande.");

  await page.goto(`/chantiers/${q.projetId}`);
  await page.getByRole("button", { name: "Demander les prix à mes négoces" }).click();
  // Premier envoi : l'identité (SIRET, prénom, portable) d'abord, une seule fois.
  const avant = page.getByRole("dialog", { name: "Avant d'envoyer" });
  await expect(avant).toBeVisible();
  await avant.getByLabel("SIRET de ton entreprise").fill("73282932000074");
  await avant.getByLabel("Ton portable").fill("06 12 34 56 78");
  await avant.getByRole("button", { name: "Continuer" }).click();
  const feuille = page.getByRole("dialog", { name: "À qui j'envoie ?" });
  await expect(feuille.getByText(/Jusqu'à 5 négoces par demande\./)).toBeVisible();
  const cases = feuille.getByRole("checkbox", { name: /^Négoce \d/ });
  await expect(cases).toHaveCount(6);
  await expect(feuille.getByRole("checkbox", { name: /^Négoce \d/, checked: true })).toHaveCount(5);
  const sixieme = feuille.getByRole("checkbox", { name: /^Négoce \d/, checked: false });
  await expect(sixieme).toHaveCount(1);
  await expect(sixieme).toBeDisabled();
  await expect(feuille.getByText("Décoche un négoce pour en choisir un autre.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ton essai est terminé" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: `${CAPTURES}/${info.project.name}-sixieme-negoce.png` });
  // Décocher l'un rend le sixième disponible.
  await feuille.getByRole("checkbox", { name: /^Négoce \d/, checked: true }).first().uncheck();
  await expect(feuille.getByRole("checkbox", { name: /^Négoce \d/, checked: false })).toHaveCount(2);
  await expect(feuille.getByRole("checkbox", { name: /^Négoce \d/, checked: false }).first()).toBeEnabled();
});
