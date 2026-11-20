import { expect, test, type Page } from "@playwright/test";
import { confirmerEmail } from "../e2e/confirmer-email";

/**
 * DOSSIER UX DU 15 NOVEMBRE 2026 (Greg), sur iPhone SE, Android et ordinateur : les onglets d'Apparence se lisent comme
 * des boutons (lot A), la carte Apparence n'est plus jaune et dit le réglage en cours (lot A), le mot de passe se change
 * depuis le compte (lot B), un besoin groupé publié se lit aussitôt sur l'accueil avec son type, son volume et le nombre
 * d'entreprises, sans aucun nom (lots G et H), la date de besoin réagit tout de suite (lot E).
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const jourDans = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

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

async function inscrire(page: Page) {
  const email = `artisan-${unique()}@example.fr`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Lise Martin");
  await page.getByLabel("Nom de ton entreprise").fill(`Toitures ${unique()}`);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: /^Bonjour Lise/ }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  expect((await apiJson(page, "POST", "/v1/me/guide/vu")).status).toBeLessThan(300);
  expect((await apiJson(page, "PATCH", "/v1/company/profile", { address: "3 rue des Ajoncs, 35000 Rennes", siret: "73282932000074", phone: null, email: null })).status).toBe(200);
  expect((await apiJson(page, "POST", "/v1/groupe/siret")).status).toBe(200);
  await confirmerEmail(page, email);
  return email;
}

test("Apparence : deux onglets qui se lisent comme des boutons ; la carte du sommaire n'est plus jaune et dit le réglage en cours", async ({ page }) => {
  await inscrire(page);
  await page.goto("/compte");
  const carte = page.getByRole("main").getByRole("link", { name: /^Apparence/ });
  await expect(carte).toContainText(/Mode (clair|sombre|automatique)/);
  // Plus de fond jaune permanent : la carte a le même fond que ses voisines.
  const fond = (nom: RegExp) => page.getByRole("main").getByRole("link", { name: nom }).evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(await fond(/^Apparence/)).toBe(await fond(/^Compte et sécurité/));
  await carte.click();
  const onglets = page.getByRole("tablist", { name: "Apparence" });
  const application = onglets.getByRole("tab", { name: "Application" });
  const demande = onglets.getByRole("tab", { name: "Demande de prix" });
  // L'onglet inactif a un contour visible et une vraie zone tactile ; les deux ont la même taille.
  for (const o of [application, demande]) {
    const b = (await o.boundingBox())!;
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(await o.evaluate((e) => parseFloat(getComputedStyle(e).borderTopWidth))).toBeGreaterThanOrEqual(2);
  }
  expect(Math.abs((await application.boundingBox())!.width - (await demande.boundingBox())!.width)).toBeLessThanOrEqual(1);
  // L'état ne tient pas à la couleur seule : `aria-selected`, et une coche sur l'onglet actif.
  await demande.click();
  await expect(demande).toHaveAttribute("aria-selected", "true");
  await expect(application).toHaveAttribute("aria-selected", "false");
  await expect(demande.locator("svg")).toHaveCount(1);
  await expect(application.locator("svg")).toHaveCount(0);
  // Au clavier : le focus se voit et Entrée change d'onglet.
  await application.focus();
  await page.keyboard.press("Enter");
  await expect(application).toHaveAttribute("aria-selected", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("Compte et sécurité : « Modifier mon mot de passe » ; l'actuel faux est refusé sur son champ, le bon passe, l'ancien ne marche plus", async ({ page }) => {
  const email = await inscrire(page);
  await page.goto("/compte/informations");
  await expect(page.getByText(/se change depuis l'écran de connexion/)).toHaveCount(0);
  await page.getByRole("button", { name: "Modifier mon mot de passe" }).click();
  const form = page.getByRole("form", { name: "Modifier mon mot de passe" });
  await expect(form.getByText("10 caractères au moins. Un mot de passe déjà fuité sur Internet est refusé.")).toBeVisible();
  // Afficher / masquer.
  await form.getByLabel("Nouveau mot de passe", { exact: true }).fill("nouveau-motdepasse");
  await form.getByRole("button", { name: "Afficher : Nouveau mot de passe" }).click();
  await expect(form.getByLabel("Nouveau mot de passe", { exact: true })).toHaveAttribute("type", "text");
  // La confirmation différente : dite sur son champ, rien n'est envoyé.
  await form.getByLabel("Mot de passe actuel", { exact: true }).fill("pas-le-bon-mot");
  await form.getByLabel("Confirmer le nouveau mot de passe", { exact: true }).fill("autre-chose-ici");
  await form.getByRole("button", { name: "Enregistrer" }).click();
  await expect(form.getByRole("alert")).toHaveText("Les deux mots de passe ne sont pas identiques.");
  // Le mot de passe actuel faux : refusé, sans rien dire d'autre.
  await form.getByLabel("Confirmer le nouveau mot de passe", { exact: true }).fill("nouveau-motdepasse");
  await form.getByRole("button", { name: "Enregistrer" }).click();
  await expect(form.getByRole("alert")).toHaveText("Le mot de passe actuel ne correspond pas.");
  // Le bon : confirmé, l'état des autres appareils est dit, on reste connecté.
  await form.getByLabel("Mot de passe actuel", { exact: true }).fill("motdepasse-solide");
  await expect(form.getByRole("checkbox", { name: "Déconnecter mes autres appareils" })).toBeChecked();
  await form.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Mot de passe modifié. Tes autres appareils sont déconnectés ; celui-ci reste connecté." })).toBeVisible();
  expect((await apiJson(page, "GET", "/v1/me")).status).toBe(200);
  // L'ancien mot de passe ne connecte plus ; le nouveau, oui.
  const essai = (motDePasse: string) => apiJson(page, "POST", "/v1/auth/sign-in/email", { email, password: motDePasse });
  expect((await essai("motdepasse-solide")).status).toBe(401);
  expect((await essai("nouveau-motdepasse")).status).toBe(200);
});

test("un besoin groupé publié : la date réagit tout de suite, puis l'accueil le montre avec son type, son volume et le nombre d'entreprises, sans aucun nom", async ({ page }) => {
  test.setTimeout(120_000);
  await inscrire(page);
  expect((await apiJson(page, "POST", "/v1/ag/habilitation", { role: "dirigeant" })).status).toBe(200);
  const q = await apiJson<{ id: string; projetId: string }>(page, "POST", "/v1/quantitatifs", { lignes: [{ libelle: "Ardoise naturelle 32x22 Espagne 1er choix", quantite: "1000", unite: "pièces" }] });
  expect(q.status).toBe(201);
  let courant = (await apiJson<{ questions: { id: string; boutons: { valeur: string }[] }[] }>(page, "GET", `/v1/quantitatifs/${q.body.id}`)).body;
  for (let i = 0; i < 15 && courant.questions.length > 0; i++) {
    const question = courant.questions[0]!;
    courant = (await apiJson<typeof courant>(page, "POST", `/v1/quantitatifs/${q.body.id}/reponses`, { reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await apiJson(page, "POST", `/v1/quantitatifs/${q.body.id}/validation`)).status).toBe(200);
  await page.goto(`/achats-groupes/quantitatif/${q.body.projetId}`);
  // Lot D : sans épaisseur, l'article se coche quand même ; le détail se dit en petit.
  const article = page.getByRole("listitem").filter({ hasText: "Ardoise naturelle" });
  await article.getByRole("checkbox").check();
  await expect(article.getByText(/Épaisseur à préciser : facultatif/)).toBeVisible();
  await page.getByRole("button", { name: "Continuer avec 1 article" }).click();
  await page.getByText("Livraison sur chantier").click();
  await page.getByLabel(/Lieu de livraison/).fill("Rennes");
  const date = page.getByLabel("J'ai besoin de ces matériaux avant le");
  // Trop proche : l'erreur se lit sous la date, tout de suite, sans attendre le serveur.
  await date.fill(jourDans(3));
  await expect(page.getByText(/Choisis une date au moins 7 jours après aujourd'hui/)).toBeVisible();
  // Corrigée : l'erreur disparaît aussitôt ; une date proche est dite urgente, sans promesse.
  const debut = Date.now();
  await date.fill(jourDans(10));
  await expect(page.getByText(/Choisis une date au moins 7 jours après aujourd'hui/)).toHaveCount(0);
  await expect(page.getByText(/^Date proche :/)).toBeVisible();
  // (Les appareils du parcours partagent la base : le premier ouvre l'achat, les suivants le rejoignent.)
  await expect(page.getByText(/^(Ouvre un nouvel achat groupé|Rejoint un achat groupé ouvert)$/)).toBeVisible();
  const latence = Date.now() - debut;
  test.info().annotations.push({ type: "latence-date-ms", description: String(latence) });
  expect(latence, "le changement de date se voit en moins de trois secondes").toBeLessThan(3000);
  await date.fill(jourDans(40));
  await expect(page.getByText(/^Date proche :/)).toHaveCount(0);
  await expect(page.getByText(/Fin des participations le/)).toBeVisible();
  const cond = page.getByRole("button", { name: /^Confirmer \d+ pièces par palette/ });
  if (await cond.count()) await cond.click();
  await page.getByRole("checkbox", { name: /Je confirme que cette quantité correspond à un besoin réel/ }).check();
  const publier = page.getByRole("button", { name: "Publier mon besoin", exact: true });
  await expect(publier).toBeEnabled();
  const clic = Date.now();
  await publier.click();
  // Greg, 18 novembre 2026 : le besoin publié se retrouve dans Demandes › Groupées, avec la confirmation.
  await expect(page).toHaveURL(/\/demandes\?type=groupees&ajoutes=1/);
  await expect(page.getByRole("status").filter({ hasText: "Tes besoins sont confirmés" })).toBeVisible();
  test.info().annotations.push({ type: "latence-publication-ms", description: String(Date.now() - clic) });
  // Le nombre d'entreprises, créateur compris ; le volume à partir de 3 (Greg, 16 novembre 2026).
  await expect(page.getByRole("tabpanel", { name: "Groupées" }).getByText(/^\d+ entreprises? · (en cours de regroupement|[\d\s]+ pièces)/)).toBeVisible();
  // L'accueil (« Mon activité », accueil premium du 20 novembre 2026) : le besoin y est aussitôt, avec son type écrit ;
  // la règle des 3 ; jamais le nom d'une entreprise.
  await page.goto("/");
  const demandes = page.getByRole("region", { name: "Mon activité" });
  const carte = demandes.getByRole("link", { name: /: Ardoise naturelle/ }).first();
  await expect(carte).toContainText("Achat groupé");
  await expect(carte).toContainText(/(\d+ entreprises · [\d\s]+ pièces au total|en cours de regroupement)/);
  await expect(demandes).not.toContainText("Toitures");
  await carte.click();
  await expect(page).toHaveURL(/\/achats-groupes\/besoins\/[0-9a-f-]{36}/);
  await expect(page.getByText("Entreprises vérifiées")).toBeVisible();
});
