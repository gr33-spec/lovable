import { expect, test, type Page } from "@playwright/test";

/**
 * L'ASSISTANT MOBIIZ (Greg, 31 octobre 2026, « Refonte de l'expérience de création des quantitatifs, assistant IA et PDF
 * interactif ») : les questions qui manquent dans un seul message, plusieurs réponses d'un coup, une consigne dictée ou
 * écrite (retirer, ajouter), « Annuler », une ligne modifiée depuis le PDF, « Passer », le PDF en plein écran sur
 * téléphone, et la conversation, la liste et le PDF toujours d'accord. Aucun appel IA (l'interprète est du code).
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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

type Ecran = { purchase: { toBuy: { key: string; label: string; quantity: string | null }[] }; chantier?: { adresse: string | null; livraison: string | null } };

async function compteEtListe(page: Page) {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Alex Martin");
  await page.getByLabel("Nom de ton entreprise").fill(`Toitures ${unique()}`);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(`assistant-${unique()}@example.fr`);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: /^Bonjour Alex/ }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  const q = await apiJson<{ id: string; projetId: string }>(page, "POST", "/v1/quantitatifs", {
    lignes: [
      { libelle: "Ardoise naturelle 32×22", quantite: "1200", unite: "pièces" },
      { libelle: "Crochet ardoise inox 90 mm", quantite: "1250", unite: "pièces" },
      { libelle: "Vis inox 4×40", quantite: "2", unite: "boîtes" },
    ],
  });
  expect(q.status).toBe(201);
  return q.body;
}

const ecran = async (page: Page, id: string) => (await apiJson<{ ecran: Ecran }>(page, "GET", `/v1/quantitatifs/${id}?ecran=1`)).body.ecran;

test("Assistant Mobiiz : questions d'un coup, réponses multiples, consignes, annuler, ligne du PDF, passer", async ({ page }, info) => {
  test.setTimeout(180_000);
  const tel = info.project.name === "telephone";
  const { id, projetId } = await compteEtListe(page);
  await page.goto(`/chantiers/${projetId}`);
  await page.getByRole("button", { name: "Ouvrir l'assistant" }).click();
  const assistant = page.getByRole("dialog", { name: "Assistant Mobiiz" });
  await expect(assistant).toBeVisible();
  // L'aide d'une fois.
  await expect(assistant.getByRole("note")).toHaveText(/Réponds par écrit, utilise le micro ou passe directement à ta liste\./);
  await assistant.getByRole("button", { name: "Compris" }).click();
  await expect(assistant.getByRole("note")).toHaveCount(0);
  // Toutes les questions dans un seul message, jamais une quantité.
  await expect(assistant.getByText(/Ta liste est prête : 3 lignes\. Pour ta demande de prix, 2 questions : Adresse du chantier \? Souhaites-tu une livraison \?/)).toBeVisible();
  await expect(assistant.getByRole("group", { name: "Adresse du chantier ?" })).toBeVisible();
  await expect(assistant.getByText(/combien/i)).toHaveCount(0);
  // Le micro est là (la dictée remplit la case, n'envoie rien) ; ici, on écrit.
  await expect(assistant.getByRole("button", { name: "Dicter" })).toBeVisible();
  const champ = assistant.getByLabel("Ton message");
  // Deux réponses d'un coup.
  await champ.fill("3 rue du Port 22300 Lannion. Livraison sur chantier demain");
  await assistant.getByRole("button", { name: "Envoyer le message" }).click();
  await expect(assistant.getByText("C'est fait : adresse notée : 3 rue du Port 22300 Lannion, noté : livraison sur le chantier, demain. C'est tout bon de mon côté : relis le PDF, puis envoie-le à tes négoces.")).toBeVisible();
  await expect(assistant.getByRole("group", { name: "Adresse du chantier ?" })).toHaveCount(0);
  expect((await ecran(page, id)).chantier).toEqual({ adresse: "3 rue du Port 22300 Lannion", livraison: "Livraison sur le chantier, demain" });
  // Deux consignes dans une phrase : retirer, ajouter (quantité dite seulement).
  await champ.fill("retire les vis et ajoute 10 sacs de colle C2");
  await champ.press("Enter");
  await expect(assistant.getByText(/C'est fait : retiré « Vis inox 4×40 », ajouté « Colle C2 », 10 sacs\./)).toBeVisible();
  let lignes = (await ecran(page, id)).purchase.toBuy.map((b) => b.label);
  expect(lignes.some((l) => /Colle C2/.test(l))).toBe(true);
  expect(lignes.some((l) => /Vis inox/.test(l))).toBe(false);
  // Annuler : la dernière modification (l'ajout de la colle, puis le retrait des vis).
  await assistant.getByRole("button", { name: "Annuler la dernière modification" }).click();
  await expect(assistant.getByText("J'ai annulé l'ajout de « Colle C2 ».")).toBeVisible();
  await assistant.getByRole("button", { name: "Annuler la dernière modification" }).click();
  await expect(assistant.getByText("J'ai annulé le retrait de « Vis inox 4×40 ».")).toBeVisible();
  lignes = (await ecran(page, id)).purchase.toBuy.map((b) => b.label);
  expect(lignes.some((l) => /Colle C2/.test(l))).toBe(false);
  expect(lignes.some((l) => /Vis inox/.test(l))).toBe(true);

  // Une ligne touchée dans le PDF : « Modifier la ligne ».
  if (tel) {
    await assistant.getByRole("button", { name: "Voir PDF" }).click();
    await expect(page.getByRole("dialog", { name: "Le PDF de ta demande" })).toBeVisible();
  }
  const zone = page.locator("button[data-cle]").first();
  await expect(zone).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("button[data-cle]")).toHaveCount(3);
  // Le PDF vu est celui du négoce : la livraison y est (même document que l'envoi).
  const cle = await zone.getAttribute("data-cle");
  await zone.click();
  const feuille = page.getByRole("dialog", { name: "Modifier la ligne" });
  await expect(feuille).toBeVisible();
  const avant = (await ecran(page, id)).purchase.toBuy.find((b) => b.key === cle)!;
  await feuille.getByLabel("Quantité").fill("1300");
  await feuille.getByRole("button", { name: "Enregistrer" }).click();
  await expect(feuille).toHaveCount(0);
  if (tel) await page.getByRole("button", { name: "Retour à l'assistant" }).click();
  await expect(assistant.getByText(/est à jour\./)).toBeVisible();
  const apres = (await ecran(page, id)).purchase.toBuy.find((b) => b.label === avant.label)!;
  expect(apres.quantity).toMatch(/1\s?300/);

  // Fermer : la liste est là, à jour ; on rouvre, rien n'est reposé.
  await assistant.getByRole("button", { name: "Fermer l'assistant" }).click();
  await expect(assistant).toHaveCount(0);
  await page.getByRole("button", { name: "Ouvrir l'assistant" }).click();
  await expect(page.getByRole("dialog", { name: "Assistant Mobiiz" }).getByText(/Je n'ai rien à te demander/)).toBeVisible();
});

test("Assistant Mobiiz : « Passer » ferme une question pour de bon ; « Je ne sais pas » aussi", async ({ page }) => {
  test.setTimeout(120_000);
  const { projetId } = await compteEtListe(page);
  await page.goto(`/chantiers/${projetId}`);
  await page.getByRole("button", { name: "Ouvrir l'assistant" }).click();
  const assistant = page.getByRole("dialog", { name: "Assistant Mobiiz" });
  await assistant.getByRole("group", { name: "Adresse du chantier ?" }).getByRole("button", { name: "Passer" }).click();
  await expect(assistant.getByRole("group", { name: "Adresse du chantier ?" })).toHaveCount(0);
  await assistant.getByLabel("Ton message").fill("je ne sais pas");
  await assistant.getByRole("button", { name: "Envoyer le message" }).click();
  await expect(assistant.getByText(/Pas de souci, on passe\./)).toBeVisible();
  await expect(assistant.getByRole("group", { name: "Souhaites-tu une livraison ?" })).toHaveCount(0);
  await assistant.getByRole("button", { name: "Fermer l'assistant" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Ouvrir l'assistant" }).click();
  await expect(page.getByRole("dialog", { name: "Assistant Mobiiz" }).getByText(/Je n'ai rien à te demander/)).toBeVisible();
});

test("Décris ton chantier : les quantités dites deviennent la liste, le reste se coche, rien d'inventé", async ({ page }) => {
  test.setTimeout(120_000);
  await compteEtListe(page);
  await page.goto("/chantiers/nouveau");
  await page.getByRole("button", { name: /Je décris mon chantier/ }).click();
  const d = page.getByRole("dialog", { name: "Décris ton chantier" });
  await expect(d.getByRole("button", { name: "Dicter" })).toBeVisible();
  await d.getByLabel("Ta description").fill("Il me faut 40 m² de placo BA13, 3 rouleaux de laine de verre 100 mm et un WC suspendu, plus de la colle carrelage");
  await d.getByRole("button", { name: "Lire ma description" }).click();
  const compris = d.getByRole("region", { name: "Ce que j'ai compris" });
  await expect(compris.getByRole("checkbox", { name: /Placo BA13/ })).toBeChecked();
  await expect(compris.getByRole("checkbox", { name: /Laine de verre 100 mm/ })).toBeChecked();
  await expect(compris.getByRole("checkbox", { name: /WC suspendu/ })).not.toBeChecked();
  await expect(compris.getByRole("checkbox", { name: /Colle carrelage.*Quantité à préciser/ })).not.toBeChecked();
  await compris.getByText("WC suspendu").click();
  await d.getByRole("button", { name: "Créer ma liste (3 lignes)" }).click();
  await expect(page).toHaveURL(/\/chantiers\/[0-9a-f-]{36}/);
  await expect(page.getByText("Placo BA13").first()).toBeVisible();
  await expect(page.getByText(/Colle carrelage/)).toHaveCount(0);
});
