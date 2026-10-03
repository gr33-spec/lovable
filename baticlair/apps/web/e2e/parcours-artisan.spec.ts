import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/** Adresse unique par exécution : les tests ne dépendent pas de l'état de la base. */
/** Photo minimale (1 px, PNG valide). */
const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

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

/** Chaque question : l'artisan accepte la proposition (« C'est bon », « Oui… ») ou passe (« Je ne sais pas »). */
async function confirmDoubts(page: Page) {
  for (let i = 0; i < 30; i++) {
    const card = page.getByRole("region", { name: /^À régler : / }).first();
    if (!(await card.isVisible())) return;
    const name = (await card.getAttribute("aria-label"))!;
    const yes = card.getByRole("button", { name: /^(C'est bon|Oui)/ }).first();
    const skip = card.getByRole("button", { name: "Je ne sais pas" });
    if (await yes.isVisible()) await yes.click();
    else if (await skip.isVisible()) await skip.click();
    else await card.getByRole("button").first().click();
    await expect(page.getByRole("region", { name, exact: true })).toHaveCount(0);
  }
}

/** Les questions arrivent une à une : l'artisan répond aux précédentes jusqu'à voir celle-ci. */
async function answerUntil(page: Page, name: string) {
  for (let i = 0; i < 30; i++) {
    const card = page.getByRole("region", { name: /^À régler : / }).first();
    await expect(card).toBeVisible();
    if (await page.getByRole("region", { name }).isVisible()) return;
    const current = (await card.getAttribute("aria-label"))!;
    const yes = card.getByRole("button", { name: /^(C'est bon|Oui)/ }).first();
    const skip = card.getByRole("button", { name: "Je ne sais pas" });
    if (await yes.isVisible()) await yes.click();
    else if (await skip.isVisible()) await skip.click();
    else await card.getByRole("button").first().click();
    await expect(page.getByRole("region", { name: current, exact: true })).toHaveCount(0);
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

  // Le « + » crée un chantier, directement : aucune question intermédiaire.
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Nouveau chantier" }).click();
  await expect(page).toHaveURL(/\/chantiers\/nouveau$/);

  await page.getByLabel("Nom du chantier").fill("Toiture Dupont");
  await page.getByLabel("Client (facultatif)").fill("M. Dupont");
  await page.getByLabel("Adresse du chantier (facultatif)").fill("12 rue des Ardoisiers, Vannes");
  await page.getByRole("button", { name: "Créer le chantier" }).click();
  await expect(page.getByRole("heading", { name: "Toiture Dupont" })).toBeVisible();
  // Le chat du chantier : une seule invitation, déposer le devis ; plus de barre en 5 étapes.
  await expect(page.getByRole("heading", { name: /^Déposez le devis de votre client/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Avancement du chantier" })).toHaveCount(0);

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
  // Action secondaire : dans le menu « ••• » du chantier.
  await page.getByRole("button", { name: "Plus d'actions sur le chantier" }).click();
  await page.getByRole("menuitem", { name: "Marquer terminé" }).click();
  await expect(page.getByText("Terminé", { exact: true })).toBeVisible();

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
  // Quatre rubriques, et au centre le « + » : un nouveau chantier, directement.
  await expect(nav.getByRole("link")).toHaveText(["Accueil", "Chantiers", "Nouveau chantier", "Fournisseurs", "Compte"]);
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
  await expect(page.getByText("devis-client-couvreur.pdf")).toBeVisible();
  // Déposé : BatiClair lit le devis tout seul, sans appui de plus, et dit ce qu'il a compris.
  await expect(page.getByRole("button", { name: /^Devis lu · \d+ étapes$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Préparer la liste de matériaux" })).toHaveCount(0);
  await expect(page.getByText(/page lue|pages lues/)).toHaveCount(0);
  await expect(page.getByText("PROCHAINE ÉTAPE", { exact: true })).toHaveCount(0);

  // Après rechargement, le devis est toujours là.
  await page.reload();
  await expect(page.getByText("devis-client-couvreur.pdf")).toBeVisible();

  // Compte : la formule en mots simples (essai, chantiers utilisés), jamais de coûts techniques.
  await page.goto("/compte");
  await expect(page.getByText("Essai gratuit")).toBeVisible();
  await expect(page.getByText("1 chantier sur 3")).toBeVisible();
  await expect(page.getByText(/Consommation IA|analyse|tokens/i)).toHaveCount(0);

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

  // IA simulée en test (AI_PROVIDER=fake) : même parcours, aucun appel payant. La lecture part seule.
  // Ce que BatiClair a compris, déplié juste après la lecture.
  await expect(page.getByRole("list", { name: "Ce que BatiClair a compris" })).toBeVisible();
  await expect(page.getByText(/^J'ai lu les \d+ lignes du devis\.$/)).toBeVisible();

  // Les crochets vendus en paquets : l'IA hésite, l'artisan précise en pièces (les questions arrivent une à une).
  const crochets = page.getByRole("region", { name: "À régler : Crochet inox ardoise 100 mm" });
  await answerUntil(page, "À régler : Crochet inox ardoise 100 mm");
  await expect(crochets.getByText("Combien de pièces par paquet ?")).toBeVisible();
  await crochets.getByRole("button", { name: "Corriger Crochet inox ardoise 100 mm" }).click();
  await page.getByLabel("Quantité").fill("200");
  await page.getByLabel("Unité").fill("u");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  // Corrigée en pièces, la ligne n'a plus de doute : la carte disparaît d'elle-même.
  await expect(crochets).toHaveCount(0);
  await confirmDoubts(page);
  // Les réponses restent dans le fil, comme des messages.
  await expect(page.getByText("Voici votre quantitatif.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Quantitatif" })).toBeVisible();

  // La preuve à un appui, sur l'article lui-même.
  await page.getByRole("button", { name: "Voir le calcul : Tuile romane canal rouge 12,5 u/m²" }).click();
  await expect(page.getByText("(lu dans le devis)").first()).toBeVisible();

  // Le devis lu reste à un appui : noms courts, ajout et retrait d'une ligne.
  await page.getByRole("button", { name: "Voir le devis lu (6 lignes)" }).click();
  await expect(page.getByText("Tuile romane canal rouge 12,5 u/m²")).toBeVisible();
  await page.getByRole("button", { name: "Ajouter une ligne" }).click();
  await page.getByLabel("Désignation").fill("Closoir ventilé");
  await page.getByLabel("Quantité").fill("12");
  await page.getByLabel("Unité").fill("ml");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByText("Closoir ventilé")).toBeVisible();
  await page.getByRole("button", { name: "Retirer Closoir ventilé" }).click();
  await page.getByRole("button", { name: "Oui, retirer" }).click();
  await expect(page.getByText("Closoir ventilé")).toHaveCount(0);
  await page.getByRole("button", { name: "Revenir au quantitatif" }).click();

  await confirmDoubts(page);
  await expect(page.getByText("Voici votre quantitatif.")).toBeVisible();
  // Écrire au lieu d'appuyer : BatiClair comprend la pente, la zone, la surface ; le reste, il le dit.
  const message = page.getByLabel("Message à BatiClair");
  await message.fill("mets 30° de pente");
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(page.getByText(/^C'est noté : Pente 30°\./)).toBeVisible();
  await message.fill("livraison mardi");
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(page.getByText(/^Je comprends pour l'instant la pente/)).toBeVisible();
  await page.getByRole("button", { name: "Envoyer au fournisseur" }).click();
  await expect(page.getByText("Liste validée · 6 articles")).toBeVisible();

  // La liste validée est conservée.
  await page.reload();
  await expect(page.getByText("Liste validée · 6 articles")).toBeVisible();

  // Une correction reste possible après validation : la liste est à valider à nouveau.
  await page.getByRole("button", { name: "Voir ou corriger la liste" }).click();
  await page.getByRole("button", { name: "Corriger Tuile romane canal rouge 12,5 u/m²" }).click();
  await page.getByLabel("Quantité").fill("1 300");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("button", { name: "Revenir au quantitatif" }).click();
  await confirmDoubts(page);
  await page.getByRole("button", { name: "Envoyer au fournisseur" }).click();
  await expect(page.getByText("Liste validée · 6 articles")).toBeVisible();
});

test("un couvreur demande les prix à ses fournisseurs et range leurs devis", async ({ page }) => {
  await signUp(page);

  // Carnet de fournisseurs : « Nouveau fournisseur » vit dans sa page.
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Fournisseurs" }).click();
  await page.getByRole("button", { name: "Nouveau fournisseur" }).click();
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
  await page.getByRole("button", { name: "Voir le devis lu (6 lignes)" }).click();
  await page.getByRole("button", { name: "Corriger Crochet inox ardoise 100 mm" }).click();
  await page.getByLabel("Quantité").fill("200");
  await page.getByLabel("Unité").fill("u");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("button", { name: "Revenir au quantitatif" }).click();
  await confirmDoubts(page);
  await page.getByRole("button", { name: "Envoyer au fournisseur" }).click();

  // BatiClair demande à qui envoyer : choisir les fournisseurs, dont un créé sur place.
  await expect(page.getByRole("heading", { name: "À qui j'envoie la liste ?" })).toBeVisible();
  await page.getByRole("checkbox", { name: /Point.P Vannes/ }).check();
  await page.getByRole("button", { name: "Nouveau fournisseur" }).click();
  await page.getByLabel("Société").fill("Tuiles & Co");
  await page.getByLabel("E-mail pour les demandes de prix").fill("devis@tuiles.fr");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /Tuiles & Co/ })).toBeChecked();
  await page.getByRole("button", { name: "Préparer les 2 e-mails" }).click();
  await expect(page.getByRole("list", { name: "Vos fournisseurs" })).toBeVisible();

  // Rechargement à chaque étape : rien ne se perd.
  await page.reload();
  await expect(page.getByRole("list", { name: "Vos fournisseurs" })).toBeVisible();
  const suppliers = page.getByRole("list", { name: "Vos fournisseurs" });
  const pointp = suppliers.getByRole("listitem").filter({ hasText: "Point.P Vannes" });
  const tuiles = suppliers.getByRole("listitem").filter({ hasText: "Tuiles & Co" });
  const menu = async (card: typeof pointp, item: string) => {
    await card.getByRole("button", { name: /^Plus d'actions/ }).click();
    await card.getByRole("menuitem", { name: item }).click();
  };
  await expect(pointp.getByText("À envoyer")).toBeVisible();
  // Une seule action à l'écran : « Envoyer l'e-mail » ouvre la messagerie avec l'e-mail rempli.
  const href = await pointp.getByRole("link", { name: "Envoyer l'e-mail" }).getAttribute("href");
  expect(href).toMatch(/^mailto:devis@pointp\.fr\?subject=Demande%20de%20prix/);
  expect(decodeURIComponent(href!)).toContain("Bonjour Paul,");
  expect(decodeURIComponent(href!)).toContain("Tuile romane canal rouge 12,5 u/m²");
  await expect(pointp.getByText("Voir l'e-mail")).toHaveCount(0);

  // Le reste est dans « ••• » : envoyé autrement, marqué à la main ; l'e-mail se relit mot pour mot.
  await menu(pointp, "Déjà envoyé");
  await expect(pointp.getByText("En attente", { exact: true })).toBeVisible();
  await menu(pointp, "Voir l'e-mail");
  await expect(pointp.getByText("Objet :")).toBeVisible();
  await expect(pointp.getByText(/Bonjour Paul,/)).toBeVisible();
  await expect(page.getByText("La demande est prête. Envoyez-la à chaque fournisseur :")).toBeVisible();
  // Pour tester sans attendre, un devis fictif peut être simulé (dans le menu).
  await pointp.getByRole("button", { name: /^Plus d'actions/ }).click();
  await expect(pointp.getByRole("menuitem", { name: "Test : simuler un devis fictif" })).toBeVisible();
  await pointp.getByRole("button", { name: /^Plus d'actions/ }).click();

  // Le devis du fournisseur arrive : on le dépose sur sa ligne.
  await pointp.getByLabel("Ajouter son devis (PDF ou photos)").setInputFiles(path.join(__dirname, "fixtures", "devis-fournisseur-couvreur.pdf"));
  await expect(pointp.getByText("Devis reçu")).toBeVisible();
  await expect(pointp.getByText("Prêt à comparer")).toBeVisible();
  await page.reload();
  await expect(pointp.getByText("Devis reçu")).toBeVisible();
  // Un seul devis : on peut déjà le voir, ou attendre l'autre.
  await expect(page.getByRole("button", { name: "Voir l'offre reçue" })).toBeVisible();

  // Le même PDF ne peut pas aller chez un second fournisseur.
  await menu(tuiles, "Déjà envoyé");
  await tuiles.getByLabel("Ajouter son devis (PDF ou photos)").setInputFiles(path.join(__dirname, "fixtures", "devis-fournisseur-couvreur.pdf"));
  await expect(tuiles.getByRole("alert")).toContainText("déjà rangé chez un autre fournisseur");
  // Un devis peut aussi arriver en photos (une par page), mais jamais mélangées à un PDF.
  await tuiles.getByLabel("Ajouter son devis (PDF ou photos)").setInputFiles([
    { name: "devis.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") },
    { name: "page-2.png", mimeType: "image/png", buffer: PNG_1PX },
  ]);
  await expect(tuiles.getByRole("alert")).toContainText("soit un PDF, soit des photos");
  await tuiles.getByLabel("Ajouter son devis (PDF ou photos)").setInputFiles(path.join(__dirname, "fixtures", "devis-fournisseur-2.pdf"));
  await expect(tuiles.getByText("Devis reçu")).toBeVisible();

  // L'action de l'étape : « Comparer ». BatiClair lit les devis (simulé en test), rapproche et calcule tout.
  await expect(page.getByText("2 offres reçues")).toBeVisible();
  await page.getByRole("button", { name: "Comparer les offres" }).click();
  await expect(pointp.getByText("6/6 articles chiffrés")).toBeVisible();
  await expect(tuiles.getByText("5/6 articles chiffrés · 1 manquant")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Comparer les/ })).toHaveCount(0);
  await expect(page.getByText(/analyse/i)).toHaveCount(0);
  await page.reload();
  await expect(tuiles.getByText("5/6 articles chiffrés · 1 manquant")).toBeVisible();
  // Le détail lu reste accessible, au second plan.
  await menu(tuiles, "Voir les lignes de son devis");
  await expect(tuiles.getByText("Livraison chantier")).toBeVisible();

  // Choisir : ce qui est vraiment chiffré d'un côté, l'estimation de l'autre ; une offre incomplète n'est jamais « la moins chère ».
  const compare = page.locator("section#comparer");
  await expect(compare.getByRole("heading", { name: "Choisir un fournisseur" })).toBeVisible();
  const offers = compare.getByRole("list", { name: "Offres" }).getByRole("listitem");
  await expect(offers.first()).toContainText("Point.P Vannes");
  await expect(offers.first()).toContainText("2 805,30 €");
  await expect(offers.first().getByText("Le moins cher des offres complètes")).toBeVisible();
  const tuilesOffer = offers.filter({ hasText: "Tuiles & Co" });
  await expect(tuilesOffer.getByText(/2\s213,20\s€/)).toBeVisible();
  await expect(tuilesOffer.getByText("chiffrés")).toBeVisible();
  await expect(tuilesOffer.getByText("⚠️ 1 article manquant")).toBeVisible();
  await expect(tuilesOffer.getByText(/Total estimé avec l'article manquant : 2\s724,40\s€/)).toBeVisible();
  await expect(tuilesOffer.getByText(/Livraison 60,00\s€/)).toBeVisible();
  await expect(tuilesOffer.getByText(/moins cher/i)).toHaveCount(0);

  // « Retenir cette offre » : un geste, compris tout de suite.
  await offers.first().getByRole("button", { name: "Retenir cette offre" }).click();
  await expect(compare.getByRole("heading", { name: "Offre retenue" })).toBeVisible();
  await expect(offers.first().getByText("✓ Offre retenue")).toBeVisible();

  // Tout est conservé.
  await page.reload();
  await expect(pointp.getByText("6/6 articles chiffrés")).toBeVisible();
  await expect(page.locator("section#comparer").getByText("✓ Offre retenue")).toBeVisible();
});

test("plusieurs articles inconnus, sans unité : UNE décision les règle tous, rien n'est ✓ en fermant l'écran", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Piscine Le Goff", "M. Le Goff", "2 rue des Dunes, Carnac");
  await page.getByLabel("Choisir le devis (PDF)").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  await expect(page.getByRole("button", { name: /^Devis lu ·/ })).toBeVisible();

  // L'artisan ajoute trois articles d'un autre métier, sans unité (comme sur un devis de pisciniste).
  await page.getByRole("button", { name: /^Voir le devis lu/ }).click();
  for (const [designation, quantity] of [["Skimmer pour piscine liner", "1"], ["Buse de refoulement", "2"], ["Prise balai", "1"]]) {
    await page.getByRole("button", { name: "Ajouter une ligne" }).click();
    await page.getByLabel("Désignation").fill(designation!);
    await page.getByLabel("Quantité").fill(quantity!);
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(page.getByText(designation!)).toBeVisible();
  }
  await page.getByRole("button", { name: "Revenir au quantitatif" }).click();

  // Une seule carte pour les trois, jamais trois alertes identiques.
  const group = page.getByRole("region", { name: "À régler : Articles que BatiClair ne connaît pas encore" });
  await answerUntil(page, "À régler : Articles que BatiClair ne connaît pas encore");
  await expect(group).toHaveCount(1);
  await expect(group.getByText(/^3 articles que BatiClair ne connaît pas encore, dont 3 sans unité/)).toBeVisible();
  // Recharger la page ne règle rien à la place de l'artisan.
  await page.reload();
  await answerUntil(page, "À régler : Articles que BatiClair ne connaît pas encore");
  await expect(group).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Envoyer au fournisseur" })).toHaveCount(0);

  await group.getByRole("button", { name: "Oui, tels qu'écrits" }).click();
  await expect(group).toHaveCount(0);
  await confirmDoubts(page);
  await expect(page.getByText("Voici votre quantitatif.")).toBeVisible();
  // Gardés tels qu'écrits, à la pièce : la preuve dit que c'est un choix pour ce chantier.
  await page.getByRole("button", { name: "Voir le calcul : Skimmer pour piscine liner" }).click();
  await expect(page.getByText("Article gardé tel qu'écrit pour ce chantier.")).toBeVisible();
});

test("mode démo : tout le parcours avec un chantier et des fournisseurs fictifs", async ({ page }) => {
  await signUp(page);
  await page.getByRole("button", { name: "Lancer la démonstration" }).click();
  await expect(page.getByRole("heading", { name: "Démo – Toiture Martin" })).toBeVisible();
  await expect(page.getByText("devis-client-demo.pdf")).toBeVisible();

  await page.getByRole("button", { name: "Lire le devis" }).click();
  await expect(page.getByRole("button", { name: /^Devis lu ·/ })).toBeVisible();
  await confirmDoubts(page);
  await page.getByRole("button", { name: "Envoyer au fournisseur" }).click();
  await expect(page.getByText(/^Liste validée · \d+ articles$/)).toBeVisible();

  for (const name of ["Tuilerie de l'Ouest (démo)", "Négoce Breizh (démo)", "Matériaux Atlantique (démo)"]) {
    await page.getByRole("checkbox", { name: new RegExp(name.replace(/[()]/g, "\\$&")) }).check();
  }
  await page.getByRole("button", { name: "Préparer les 3 e-mails" }).click();
  await expect(page.getByRole("list", { name: "Vos fournisseurs" })).toBeVisible();

  const cards = page.getByRole("list", { name: "Vos fournisseurs" }).getByRole("listitem");
  for (const name of ["Tuilerie de l'Ouest", "Négoce Breizh", "Matériaux Atlantique"]) {
    const card = cards.filter({ hasText: name });
    await card.getByRole("button", { name: "Simuler sa réponse (démo)" }).click();
    await expect(card.getByText("Devis reçu")).toBeVisible();
  }
  await page.getByRole("button", { name: "Comparer les offres" }).click();
  for (const name of ["Tuilerie de l'Ouest", "Négoce Breizh", "Matériaux Atlantique"]) {
    await expect(cards.filter({ hasText: name }).getByText(/articles chiffrés/)).toBeVisible();
  }
  await expect(cards.filter({ hasText: "Négoce Breizh" }).getByText(/1 manquant/)).toBeVisible();
  const compare = page.locator("section#comparer");
  await expect(compare.getByRole("button", { name: "Retenir cette offre" }).first()).toBeVisible();
  await expect(compare.getByText("⚠️ 1 article manquant")).toBeVisible();
});

test("accueil : la prochaine action de chaque chantier, puis l'essai et les formules", async ({ page }) => {
  await signUp(page);
  const todo = page.getByRole("region", { name: /à faire|Tout est à jour/i });
  await createProject(page, "Toiture Garnier", "M. Garnier", "5 rue du Port, Vannes");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^\d+ actions? à faire$/ })).toBeVisible();
  await expect(todo.getByText("Toiture Garnier")).toBeVisible();
  await todo.getByRole("link", { name: "Ajouter le devis client" }).click();
  await expect(page.getByRole("heading", { name: "Toiture Garnier" })).toBeVisible();

  // Essai : 3 chantiers. Au 4e, l'écran des formules, sans jargon ni crédits.
  await createProject(page, "Chantier 2", "", "");
  await createProject(page, "Chantier 3", "", "");
  await page.goto("/chantiers/nouveau");
  await expect(page.getByRole("heading", { name: "Votre essai est terminé" })).toBeVisible();
  await expect(page.getByText("Continuez à utiliser BatiClair pour analyser vos devis et comparer vos fournisseurs.")).toBeVisible();
  const plans = page.getByRole("list", { name: "Formules" }).getByRole("listitem");
  await expect(plans).toHaveCount(2);
  await expect(plans.first()).toContainText("chantiers / mois");
  await plans.first().getByRole("button", { name: "Choisir cette formule" }).click();
  await expect(page.getByText(/Merci ! Nous vous contactons très vite/)).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Votre essai est terminé")).toBeVisible();

  // Activation manuelle (tests, premiers clients) : un code, et c'est reparti.
  await page.goto("/formules");
  await page.getByRole("button", { name: "J'ai un code d'activation" }).click();
  await page.getByLabel("Code d'activation").fill("E2E-SOLO-CODE");
  await page.getByRole("button", { name: "Activer" }).click();
  await expect(page.getByText("Votre formule actuelle")).toBeVisible();
  await createProject(page, "Chantier 4", "", "");
});
