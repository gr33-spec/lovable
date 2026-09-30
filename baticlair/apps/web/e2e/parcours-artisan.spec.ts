import path from "node:path";
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
  // Seule question métier : un appui (ici un couvreur).
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("heading", { name: "Bonjour Jean" })).toBeVisible();
  return email;
}

/** Chaque ligne douteuse est regardée : « C'est bon » (l'artisan la garde telle quelle). */
async function confirmDoubts(page: Page) {
  const buttons = page.getByRole("button", { name: /^C'est bon/ });
  while ((await buttons.count()) > 0) {
    const before = await buttons.count();
    await buttons.first().click();
    await expect(buttons).toHaveCount(before - 1);
  }
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
  // Deux choses seulement : un chantier ou un fournisseur.
  await expect(page.getByRole("dialog").getByRole("link", { name: /Nouveau fournisseur/ })).toBeVisible();
  await page.getByRole("link", { name: /Nouveau chantier/ }).click();

  await page.getByLabel("Nom du chantier").fill("Toiture Dupont");
  await page.getByLabel("Client (facultatif)").fill("M. Dupont");
  await page.getByLabel("Adresse du chantier (facultatif)").fill("12 rue des Ardoisiers, Vannes");
  await page.getByRole("button", { name: "Créer le chantier" }).click();
  await expect(page.getByRole("heading", { name: "Toiture Dupont" })).toBeVisible();
  await expect(page.getByText("PROCHAINE ÉTAPE")).toBeVisible();
  // Le fil du chantier montre où on en est et quoi faire ensuite.
  const progress = page.getByRole("navigation", { name: "Avancement du chantier" });
  await expect(progress.getByRole("link", { name: "Ajouter le devis client" })).toBeVisible();

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

test("le menu ne propose que l'essentiel : accueil, chantiers, fournisseurs, compte", async ({ page }) => {
  await signUp(page);
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  await expect(nav.getByRole("link")).toHaveText(["Accueil", "Chantiers", "Fournisseurs", "Compte"]);
  await nav.getByRole("link", { name: "Compte" }).click();
  await expect(page.getByRole("heading", { name: "Mon compte" })).toBeVisible();

  // Les métiers se changent en deux appuis ; BatiClair adapte la lecture des prochains devis.
  await expect(page.getByRole("button", { name: "Couverture, charpente, zinguerie" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Peinture" }).click();
  await page.getByRole("button", { name: "Enregistrer mes métiers" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Métiers enregistrés." })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Peinture" })).toHaveAttribute("aria-pressed", "true");
});

test("un couvreur dépose son devis client (lecture sans IA)", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Toiture Leroy", "M. Leroy", "8 rue du Moulin, Vannes");

  const fixture = (name: string) => path.join(__dirname, "fixtures", name);

  // Un fichier qui n'est pas un PDF est refusé avec un message clair.
  await page.getByLabel("Choisir le devis (PDF)").setInputFiles({
    name: "devis.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("<html>pas un pdf</html>"),
  });
  await expect(page.getByRole("alert").filter({ hasText: "Ce fichier n'est pas un PDF" })).toBeVisible();

  // Devis client : 3 pages (tableau, page scannée, conditions générales).
  await page.getByLabel("Choisir le devis (PDF)").setInputFiles(fixture("devis-client-couvreur.pdf"));
  await expect(page.getByText("DEVIS CLIENT", { exact: true })).toBeVisible();
  await expect(page.getByText("devis-client-couvreur.pdf")).toBeVisible();
  await expect(page.getByText("1 page lue · 1 page à lire en image · 1 page ignorée (conditions générales…)")).toBeVisible();
  await expect(page.getByText("PROCHAINE ÉTAPE", { exact: true })).toHaveCount(0);

  // Après rechargement, le devis est toujours là.
  await page.reload();
  await expect(page.getByText("devis-client-couvreur.pdf")).toBeVisible();

  // Le propriétaire voit la consommation IA : rien de dépensé, volume lu mesuré.
  await page.goto("/compte");
  const usage = page.locator("section, div").filter({ has: page.getByRole("heading", { name: "Consommation IA ce mois-ci" }) }).last();
  await expect(usage.getByText("0,00 €").first()).toBeVisible();
  await expect(usage.getByText("1 · 3 pages")).toBeVisible();
  await expect(usage.getByText("· sans plafond pendant l'essai")).toBeVisible();
  await expect(usage.getByText(/la lecture des devis est gratuite/)).toBeVisible();

  // Un devis déposé par erreur se supprime (avec confirmation), puis se redépose.
  await page.goBack();
  await page.getByRole("button", { name: "Supprimer devis-client-couvreur.pdf" }).click();
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByText("devis-client-couvreur.pdf")).toBeVisible();
  await page.getByRole("button", { name: "Supprimer devis-client-couvreur.pdf" }).click();
  await page.getByRole("button", { name: "Oui, supprimer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Devis supprimé." })).toBeVisible();
  await expect(page.getByText("devis-client-couvreur.pdf")).toHaveCount(0);
  await page.getByLabel("Choisir le devis (PDF)").setInputFiles(fixture("devis-client-couvreur.pdf"));
  await expect(page.getByText("devis-client-couvreur.pdf")).toBeVisible();
});

test("un couvreur fait préparer sa liste de matériaux par l'IA, la corrige et la valide", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Toiture Morel", "Mme Morel", "3 impasse des Lilas, Lorient");
  await page.getByLabel("Choisir le devis (PDF)").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  await expect(page.getByText("devis-client-couvreur.pdf")).toBeVisible();

  // IA simulée en test (AI_PROVIDER=fake) : même parcours, aucun appel payant.
  await page.getByRole("button", { name: "Préparer la liste de matériaux" }).click();
  await expect(page.getByText("Tuile romane canal rouge 12,5 u/m²")).toBeVisible();
  await expect(page.getByText(/^6 lignes · \d+ à vérifier/)).toBeVisible();

  // Le doute de l'IA est affiché directement sur la ligne ; un appui sur la ligne montre d'où elle vient.
  const doubts = page.getByRole("list", { name: "Lignes à vérifier" });
  await doubts.getByRole("button", { name: /^Crochet inox ardoise 100 mm/ }).click();
  await expect(doubts.getByText(/Devis : page 1, ligne \d+/)).toBeVisible();
  await expect(doubts.getByText("L'IA hésite : Vendu en paquets, sans nombre de pièces par paquet.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Encore \d+ lignes? à vérifier/ })).toBeDisabled();

  // Crochets en paquets sans contenu indiqué : l'artisan précise la quantité en pièces.
  await page.getByRole("button", { name: "Corriger Crochet inox ardoise 100 mm" }).click();
  await page.getByLabel("Quantité").fill("200");
  await page.getByLabel("Unité").fill("u");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(doubts.getByText("Crochet inox ardoise 100 mm")).toHaveCount(0);
  await expect(page.getByText("Vérifiée par vous").first()).toBeVisible();

  // Une ligne ajoutée à la main, puis retirée.
  await page.getByRole("button", { name: "Ajouter une ligne" }).click();
  await page.getByLabel("Désignation").fill("Closoir ventilé");
  await page.getByLabel("Quantité").fill("12");
  await page.getByLabel("Unité").fill("ml");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByText("Closoir ventilé")).toBeVisible();
  await page.getByRole("button", { name: "Retirer Closoir ventilé" }).click();
  await page.getByRole("button", { name: "Oui, retirer" }).click();
  await expect(page.getByText("Closoir ventilé")).toHaveCount(0);

  await confirmDoubts(page);
  await page.getByRole("button", { name: "Valider la liste" }).click();
  await expect(page.getByText(/^Liste validée le /)).toBeVisible();

  // La liste validée est conservée.
  await page.reload();
  await expect(page.getByText(/^Liste validée le /)).toBeVisible();

  // Une correction reste possible après validation : la liste est à valider à nouveau.
  await page.getByRole("button", { name: "Voir ou corriger la liste" }).click();
  await page.getByRole("button", { name: "Corriger Tuile romane canal rouge 12,5 u/m²" }).click();
  await page.getByLabel("Quantité").fill("1 300");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("button", { name: "Valider la liste" }).click();
  await expect(page.getByText(/^Liste validée le /)).toBeVisible();

  // L'analyse est décomptée dans la consommation du mois.
  await page.goto("/compte");
  await expect(page.getByRole("heading", { name: "Consommation IA ce mois-ci" })).toBeVisible();
});

test("un couvreur demande les prix à ses fournisseurs et range leurs devis", async ({ page }) => {
  await signUp(page);

  // Carnet de fournisseurs, depuis le « + ».
  await page.getByRole("button", { name: /Ajouter : nouveau chantier/ }).click();
  await page.getByRole("link", { name: /Nouveau fournisseur/ }).click();
  await page.getByLabel("Société").fill("Point.P Vannes");
  await page.getByLabel("E-mail pour les demandes de prix").fill("pas-un-email");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByText("Cette adresse e-mail n'est pas valide.")).toBeVisible();
  await page.getByLabel("E-mail pour les demandes de prix").fill("Devis@PointP.fr");
  await page.getByLabel("Contact (facultatif)").fill("Paul");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByText("devis@pointp.fr")).toBeVisible();

  // Modifier une fiche.
  await page.getByRole("button", { name: "Modifier Point.P Vannes" }).click();
  await page.getByLabel("Notes, spécialités (facultatif)").fill("Tuiles, zinc");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Tuiles, zinc")).toBeVisible();

  // Chantier, devis client, liste validée.
  await createProject(page, "Toiture Garnier", "M. Garnier", "5 rue du Port, Vannes");
  await page.getByLabel("Choisir le devis (PDF)").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  await page.getByRole("button", { name: "Préparer la liste de matériaux" }).click();
  await expect(page.getByText("Tuile romane canal rouge 12,5 u/m²")).toBeVisible();
  await page.getByRole("button", { name: "Corriger Crochet inox ardoise 100 mm" }).click();
  await page.getByLabel("Quantité").fill("200");
  await page.getByLabel("Unité").fill("u");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await confirmDoubts(page);
  await page.getByRole("button", { name: "Valider la liste" }).click();

  // Prochaine étape : choisir les fournisseurs, dont un créé sur place.
  const progress = page.getByRole("navigation", { name: "Avancement du chantier" });
  await expect(progress.getByRole("link", { name: "Choisir les fournisseurs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Demander les prix aux fournisseurs" })).toBeVisible();
  await page.getByRole("checkbox", { name: /Point.P Vannes/ }).check();
  await page.getByRole("button", { name: "Nouveau fournisseur" }).click();
  await page.getByLabel("Société").fill("Tuiles & Co");
  await page.getByLabel("E-mail pour les demandes de prix").fill("devis@tuiles.fr");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /Tuiles & Co/ })).toBeChecked();
  await page.getByRole("button", { name: "Préparer les 2 e-mails" }).click();
  await expect(page.getByText("DEMANDES DE PRIX")).toBeVisible();

  // Rechargement à chaque étape : rien ne se perd.
  await page.reload();
  await expect(page.getByText("DEMANDES DE PRIX")).toBeVisible();
  const pointp = page.locator("li").filter({ hasText: "Point.P Vannes" });
  const tuiles = page.locator("li").filter({ hasText: "Tuiles & Co" });
  await expect(pointp.getByText("À envoyer")).toBeVisible();
  // « Envoyer l'e-mail » ouvre la messagerie avec l'e-mail rempli.
  const href = await pointp.getByRole("link", { name: "Envoyer l'e-mail" }).getAttribute("href");
  expect(href).toMatch(/^mailto:devis@pointp\.fr\?subject=Demande%20de%20prix/);
  expect(decodeURIComponent(href!)).toContain("Bonjour Paul,");
  expect(decodeURIComponent(href!)).toContain("Tuile romane canal rouge 12,5 u/m²");

  // Envoyé autrement : marqué à la main.
  await pointp.getByRole("button", { name: "Déjà envoyé" }).click();
  await expect(pointp.getByText("En attente de réponse", { exact: true })).toBeVisible();
  // L'e-mail envoyé se relit mot pour mot.
  await pointp.getByText("Voir l'e-mail").click();
  await expect(pointp.getByText("Objet :")).toBeVisible();
  await expect(pointp.getByText(/Bonjour Paul,/)).toBeVisible();
  await expect(progress.getByRole("link", { name: "Envoyer la demande" })).toBeVisible();

  // Le devis du fournisseur arrive : on le dépose sur sa ligne.
  await pointp.getByLabel("Ajouter son devis (PDF)").setInputFiles(path.join(__dirname, "fixtures", "devis-fournisseur-couvreur.pdf"));
  await expect(pointp.getByText("Devis reçu")).toBeVisible();
  await expect(pointp.getByText(/Ouvrir son devis \(devis-fournisseur-couvreur\.pdf\)/)).toBeVisible();
  await expect(page.getByText("1 devis reçu sur 2")).toBeVisible();
  await page.reload();
  await expect(page.getByText("1 devis reçu sur 2")).toBeVisible();
  await expect(pointp.getByText("Devis reçu")).toBeVisible();

  // Le même PDF ne peut pas aller chez un second fournisseur.
  await tuiles.getByRole("button", { name: "Déjà envoyé" }).click();
  await tuiles.getByLabel("Ajouter son devis (PDF)").setInputFiles(path.join(__dirname, "fixtures", "devis-fournisseur-couvreur.pdf"));
  await expect(tuiles.getByRole("alert")).toContainText("déjà rangé chez un autre fournisseur");
  await tuiles.getByLabel("Ajouter son devis (PDF)").setInputFiles(path.join(__dirname, "fixtures", "devis-fournisseur-2.pdf"));
  await expect(tuiles.getByText("Devis reçu")).toBeVisible();
  await expect(progress.getByRole("link", { name: "Lire les 2 devis reçus" })).toBeVisible();

  // L'IA lit chaque devis une fois (simulée en test) ; le code recalcule tout.
  await pointp.getByRole("button", { name: "Lire ce devis (1 analyse)" }).click();
  await expect(pointp.getByText("Devis lu · 6/6 articles")).toBeVisible();
  await expect(pointp.getByText("2 805,30 € HT")).toBeVisible();
  await tuiles.getByRole("button", { name: "Lire ce devis (1 analyse)" }).click();
  await expect(tuiles.getByText("Devis lu · 5/6 articles")).toBeVisible();
  await expect(tuiles.getByText("Il manque 1 article de votre liste.")).toBeVisible();
  await page.reload();
  await expect(pointp.getByText("Devis lu · 6/6 articles")).toBeVisible();
  await expect(tuiles.getByText("Devis lu · 5/6 articles")).toBeVisible();
  await tuiles.getByRole("button", { name: "Voir le détail" }).click();
  await expect(tuiles.getByText("Livraison chantier")).toBeVisible();

  // Comparer : un total honnête, le manquant estimé, jamais compté à zéro.
  const compare = page.locator("section#comparer");
  await expect(compare.getByRole("listitem").first()).toContainText("Tuiles & Co");
  await expect(compare.getByRole("listitem").first()).toContainText("2 724,40 €");
  await expect(compare.getByText(/1 article manquant \(estimé 511,20\s€\)/)).toBeVisible();
  await expect(compare.getByText("Moins cher sur le total")).toBeVisible();
  await expect(compare.getByText(/\+80,90\s€ par rapport à Tuiles & Co/)).toBeVisible();
  await expect(compare.getByText("1 ligne non reconnue")).toHaveCount(0);
  await expect(progress.getByRole("link", { name: "Comparer et classer" })).toBeVisible();

  // « Classé », avec le fournisseur retenu (facultatif).
  await compare.getByRole("button", { name: "Classer" }).click();
  await compare.getByRole("checkbox", { name: "Point.P Vannes" }).check();
  await compare.getByRole("button", { name: "Classer" }).last().click();
  await expect(compare.getByText(/Classé le .* · retenu : Point.P Vannes/)).toBeVisible();
  await expect(progress.getByText("Chantier classé ✓")).toBeVisible();

  // Tout est conservé.
  await page.reload();
  await expect(page.locator("li").filter({ hasText: "Point.P Vannes" }).getByText("Devis lu · 6/6 articles")).toBeVisible();
  await expect(page.locator("section#comparer").getByText(/Classé le/)).toBeVisible();
});

test("mode démo : tout le parcours avec un chantier et des fournisseurs fictifs", async ({ page }) => {
  await signUp(page);
  await page.getByRole("button", { name: "Créer un chantier de démonstration" }).click();
  await expect(page.getByRole("heading", { name: "Démo – Toiture Martin" })).toBeVisible();
  await expect(page.getByText("devis-client-demo.pdf")).toBeVisible();

  await page.getByRole("button", { name: "Préparer la liste de matériaux" }).click();
  await expect(page.getByText(/^\d+ lignes · /)).toBeVisible();
  await confirmDoubts(page);
  await page.getByRole("button", { name: "Valider la liste" }).click();
  await expect(page.getByText(/^Liste validée le /)).toBeVisible();

  for (const name of ["Tuilerie de l'Ouest (démo)", "Négoce Breizh (démo)", "Matériaux Atlantique (démo)"]) {
    await page.getByRole("checkbox", { name: new RegExp(name.replace(/[()]/g, "\\$&")) }).check();
  }
  await page.getByRole("button", { name: "Préparer les 3 e-mails" }).click();
  await expect(page.getByText("DEMANDES DE PRIX")).toBeVisible();

  const progress = page.getByRole("navigation", { name: "Avancement du chantier" });
  for (const name of ["Tuilerie de l'Ouest", "Négoce Breizh", "Matériaux Atlantique"]) {
    const card = page.locator("li").filter({ hasText: name });
    await card.getByRole("button", { name: "Simuler sa réponse (démo)" }).click();
    await expect(card.getByText("Devis reçu")).toBeVisible();
    await card.getByRole("button", { name: "Lire ce devis (1 analyse)" }).click();
    await expect(card.getByText(/^Devis lu · /)).toBeVisible();
  }
  await expect(page.locator("li").filter({ hasText: "Négoce Breizh" }).getByText("Il manque 1 article de votre liste.")).toBeVisible();
  const compare = page.locator("section#comparer");
  await expect(compare.getByText("Moins cher sur le total")).toBeVisible();
  await expect(progress.getByRole("link", { name: "Comparer et classer" })).toBeVisible();
});
