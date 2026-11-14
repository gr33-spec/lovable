import { expect, test, type Page } from "@playwright/test";
import { confirmerEmail } from "../e2e/confirmer-email";

/**
 * RECETTE COMPLÈTE DU 13 NOVEMBRE 2026, corrections du 14. Chaque défaut vu à l'écran par un testeur a ici son parcours.
 *  - B9 : une ligne ajoutée sans quantité reçoit sa quantité dans la liste (avant : aucun champ, la demande partait sans).
 *  - B2 : l'ancienne page des formules (« Solo 39 € », « Pro 79 € ») mène à « Mon abonnement ».
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
  await page.getByLabel("Nom de ton entreprise").fill(`Couverture Recette ${unique()}`);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  const email = `recette-${unique()}@example.fr`;
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await confirmerEmail(page, email);
}

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

test("une ligne sans quantité reçoit sa quantité dans la liste ; l'ancienne page des formules mène à « Mon abonnement »", async ({ page }) => {
  test.setTimeout(180_000);
  await inscrire(page);
  const q = await apiJson<{ projetId: string }>(page, "POST", "/v1/quantitatifs", { lignes: [{ libelle: "Ardoise naturelle 32x22 Espagne 1er choix", quantite: "52", unite: "pièces" }, { libelle: "Bande de rive alu maison" }] });
  expect(q.status).toBe(201);
  await page.goto(`/chantiers/${q.body.projetId}`);
  const ligne = "Bande de rive alu maison";
  await page.getByRole("button", { name: new RegExp(`^Modifier la ligne : ${ligne}`) }).click();
  const ouverte = page.getByRole("group", { name: new RegExp(`^Ligne ouverte : ${ligne}`) });
  const form = ouverte.getByRole("form", { name: new RegExp(`^Quantité : ${ligne}`) });
  await expect(form.getByRole("button", { name: "OK" })).toBeDisabled();
  await form.getByLabel(new RegExp(`^Quantité à ajouter : ${ligne}`)).fill("12,5");
  await form.getByLabel(new RegExp(`^Unité : ${ligne}`)).fill("m");
  await form.getByRole("button", { name: "OK" }).click();
  // La quantité est gardée par le serveur : elle se relit après rechargement, et la ligne a maintenant ses boutons − / +.
  await expect(form).toHaveCount(0);
  await page.reload();
  const relue = JSON.stringify((await apiJson(page, "GET", `/v1/projects/${q.body.projetId}/takeoff`)).body);
  expect(relue).toMatch(/12[.,]5/);
  await expect(page.getByRole("form", { name: new RegExp(`^Quantité : ${ligne}`) })).toHaveCount(0);

  await page.goto("/formules");
  await expect(page).toHaveURL(/\/abonnement$/);
  await expect(page.getByText(/Solo|79 €/)).toHaveCount(0);
});
