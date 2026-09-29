import { expect, test, type Page } from "@playwright/test";

/** Adresse unique par exécution : les tests ne dépendent pas de l'état de la base. */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function signUp(page: Page) {
  const email = `artisan-${unique()}@example.fr`;
  await page.goto("/");
  // Sans session : renvoyé vers la connexion, puis vers l'inscription.
  await expect(page).toHaveURL(/\/connexion\?retour=%2F/);
  await page.getByRole("link", { name: "Créer un compte" }).click();
  await page.getByLabel("Prénom et nom").fill("Jean Martin");
  await page.getByLabel("Nom de votre entreprise").fill("Toitures Martin");
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("heading", { name: "Bonjour Jean" })).toBeVisible();
  return email;
}

async function createProject(page: Page, name: string, client: string, address: string) {
  await page.goto("/chantiers/nouveau");
  await page.getByLabel("Nom du chantier").fill(name);
  await page.getByLabel("Client (facultatif)").fill(client);
  await page.getByLabel("Adresse du chantier (facultatif)").fill(address);
  await page.getByRole("button", { name: "Créer le chantier" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

test("un artisan crée son compte et son premier chantier depuis le +", async ({ page }) => {
  await signUp(page);
  await expect(page.getByText("Toitures Martin")).toBeVisible();
  await expect(page.getByText("Créez votre premier chantier")).toBeVisible();

  await page.getByRole("button", { name: /Ajouter : nouveau chantier/ }).click();
  await expect(page.getByRole("dialog", { name: "Ajouter" })).toBeVisible();
  // La lecture de documents n'existe pas encore : c'est affiché honnêtement.
  await expect(page.getByText("Prendre en photo un devis")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("Bientôt").first()).toBeVisible();
  await page.getByRole("link", { name: /Nouveau chantier/ }).click();

  await page.getByLabel("Nom du chantier").fill("Toiture Dupont");
  await page.getByLabel("Client (facultatif)").fill("M. Dupont");
  await page.getByLabel("Adresse du chantier (facultatif)").fill("12 rue des Ardoisiers, Vannes");
  await page.getByRole("button", { name: "Créer le chantier" }).click();
  await expect(page.getByRole("heading", { name: "Toiture Dupont" })).toBeVisible();
  await expect(page.getByText("PROCHAINE ÉTAPE")).toBeVisible();

  // Retour depuis la fiche : on revient à l'accueil (d'où l'on venait), pas au formulaire.
  await page.getByRole("button", { name: "Retour" }).click();
  await expect(page.getByRole("heading", { name: "Bonjour Jean" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Toiture Dupont/ })).toBeVisible();
});

test("un client appelle : on retrouve son chantier, et Retour garde la recherche", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Réfection toiture", "M. Dupont", "12 rue des Ardoisiers, Vannes");
  await createProject(page, "Extension garage", "Mme Moreau", "3 impasse du Port, Auray");

  // Recherche depuis l'accueil, sans accent ni majuscule.
  await page.goto("/");
  await page.getByLabel("Chercher un chantier, un client ou une adresse").fill("refection");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/chantiers\?q=refection/);
  await expect(page.getByRole("link", { name: /Réfection toiture/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Extension garage/ })).toHaveCount(0);

  // Au fil de la frappe dans la liste.
  const search = page.getByRole("searchbox");
  await search.fill("moreau");
  await expect(page).toHaveURL(/q=moreau/);
  await expect(page.getByRole("link", { name: /Extension garage/ })).toBeVisible();

  // Ouvrir la fiche puis Retour : la recherche est toujours là.
  await page.getByRole("link", { name: /Extension garage/ }).click();
  await expect(page.getByRole("heading", { name: "Extension garage" })).toBeVisible();
  await page.getByRole("button", { name: "Retour" }).click();
  await expect(page).toHaveURL(/q=moreau/);
  await expect(page.getByRole("searchbox")).toHaveValue("moreau");
  await expect(page.getByRole("link", { name: /Extension garage/ })).toBeVisible();
});

test("marquer terminé retire le chantier des « En cours » sans le perdre", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Bardage Lefèvre", "SCI Lefèvre", "Zone artisanale, Vannes");
  await page.getByRole("button", { name: "Marquer terminé" }).click();
  await expect(page.getByText("Ce chantier est terminé.")).toBeVisible();

  await page.goto("/chantiers");
  await expect(page.getByText("Aucun chantier en cours")).toBeVisible();
  await page.getByRole("button", { name: "Terminés" }).click();
  await expect(page.getByRole("link", { name: /Bardage Lefèvre/ })).toBeVisible();
  // Filtre « En cours » choisi, puis recherche : la recherche voit tout (PD-022).
  await page.getByRole("button", { name: "En cours" }).click();
  await page.getByRole("searchbox").fill("lefevre");
  await expect(page.getByRole("link", { name: /Bardage Lefèvre/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tous" })).toHaveAttribute("aria-pressed", "true");
});

test("un double appui sur « Créer » ne crée qu'un chantier", async ({ page }) => {
  await signUp(page);
  await page.goto("/chantiers/nouveau");
  await page.getByLabel("Nom du chantier").fill("Charpente Le Goff");
  const button = page.getByRole("button", { name: "Créer le chantier" });
  await button.dblclick();
  await expect(page.getByRole("heading", { name: "Charpente Le Goff" })).toBeVisible();
  await page.goto("/chantiers");
  await expect(page.getByRole("link", { name: /Charpente Le Goff/ })).toHaveCount(1);
});

test("un formulaire interrompu est retrouvé tel quel", async ({ page }) => {
  await signUp(page);
  await page.goto("/chantiers/nouveau");
  await page.getByLabel("Nom du chantier").fill("Toiture Garnier");
  await page.getByLabel("Client (facultatif)").fill("M. Garnier");
  await page.reload();
  await expect(page.getByLabel("Nom du chantier")).toHaveValue("Toiture Garnier");
  await expect(page.getByLabel("Client (facultatif)")).toHaveValue("M. Garnier");
});

test("déconnexion puis reconnexion ramène à la page demandée", async ({ page }) => {
  const email = await signUp(page);
  await page.goto("/compte");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/connexion/);

  await page.goto("/chantiers?q=dupont");
  await expect(page).toHaveURL(/\/connexion\?retour=/);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "incorrect" })).toContainText("E-mail ou mot de passe incorrect");
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/chantiers\?q=dupont/);
});

test("les onglets pas encore construits le disent clairement", async ({ page }) => {
  await signUp(page);
  await page.getByRole("link", { name: "Factures" }).click();
  await expect(page.getByRole("heading", { name: "Bientôt ici" })).toBeVisible();
  await page.getByRole("link", { name: "Fournisseurs" }).click();
  await expect(page.getByRole("heading", { name: "Bientôt ici" })).toBeVisible();
});
