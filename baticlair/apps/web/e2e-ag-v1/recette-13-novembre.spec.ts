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
  // Recette n° 2 du 14 novembre 2026 : sans quantité, la ligne est orange « Quantité à préciser » et ne part pas chez un négoce.
  await expect(page.getByText("Quantité à préciser").first()).toBeVisible();
  const liste = (await apiJson<{ takeoff: { purchase: { toBuy: { key: string; label: string }[] } } }>(page, "GET", `/v1/projects/${q.body.projetId}/takeoff`)).body.takeoff.purchase.toBuy;
  const cle = liste.find((b) => b.label.includes("Bande de rive"))!.key;
  const negoce = (await apiJson<{ id: string }>(page, "POST", "/v1/suppliers", { name: "Négoce Test", email: `n-${unique()}@negoce.example` })).body.id;
  const refus = await apiJson<{ error: { details: { reason: string; message: string } } }>(page, "POST", `/v1/projects/${q.body.projetId}/price-requests`, { supplierIds: [negoce], articles: [cle] });
  expect(refus.status).toBe(400);
  expect(refus.body.error.details.reason).toBe("ligne_sans_quantite");
  expect(refus.body.error.details.message).toContain("Donne d'abord une quantité à « Bande de rive alu maison »");
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
  // Avec sa quantité, la ligne n'est plus orange et peut partir.
  await expect(page.getByText("Quantité à préciser")).toHaveCount(0);
  // Avec « 12,5 m », cette bande de métal devient une ligne « à faire chiffrer » (mètre de métal sans largeur) : elle part.
  const apres = (await apiJson<{ takeoff: { purchase: { toQuote: { key: string; measure: string | null }[] } } }>(page, "GET", `/v1/projects/${q.body.projetId}/takeoff`)).body.takeoff.purchase.toQuote;
  const envoi = await apiJson(page, "POST", `/v1/projects/${q.body.projetId}/price-requests`, { supplierIds: [negoce], articles: [`quote:${apres.find((b) => /12[.,]5/.test(b.measure ?? ""))!.key}`] });
  expect(JSON.stringify(envoi)).toContain('"status":201');

  await page.goto("/formules");
  await expect(page).toHaveURL(/\/abonnement$/);
  await expect(page.getByText(/Solo|79 €/)).toHaveCount(0);
});
