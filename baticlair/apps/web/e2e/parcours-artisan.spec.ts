import fs from "node:fs";
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
  await expect(page.getByRole("heading", { name: /^Bonjour Jean/ })).toBeVisible();
  return email;
}

/** La question ouverte en bas de l'écran : « C'est bon » / « Oui… » s'il y en a, sinon le premier bouton de réponse. */
async function answerSheet(page: Page) {
  const sheet = page.getByRole("dialog", { name: /^Question : / });
  // La réponse précédente s'enregistre encore (boutons « aria-busy ») : la fiche va changer ou se fermer. On attend
  // qu'elle soit au repos, sinon le clic part sur un bouton désactivé qui disparaît (course vue en CI).
  await expect(sheet.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
  if (!(await sheet.isVisible())) return;
  const name = (await sheet.getAttribute("aria-label"))!;
  const yes = sheet.getByRole("button", { name: /^(C'est bon|Oui)/ }).first();
  const input = sheet.getByRole("textbox");
  if (await yes.isVisible()) await yes.click();
  else if (await input.isVisible()) {
    await input.fill("2");
    await sheet.getByRole("button", { name: "Valider" }).click();
  } else await sheet.locator("button:not([aria-label])").first().click();
  await expect(page.getByRole("dialog", { name, exact: true })).toHaveCount(0, { timeout: 15_000 });
}

/** La page des fournitures (`?vue=fournitures`) : ouverte d'elle-même à l'arrivée des matériaux, sinon d'un appui sur le chantier. */
async function openList(page: Page) {
  const listPage = page.getByRole("region", { name: "Page des fournitures" });
  await expect(page.getByRole("region", { name: /^(Page des fournitures|Liste de matériaux)$/ }).first()).toBeVisible();
  if (await listPage.isVisible()) return;
  await page.getByRole("region", { name: "Liste de matériaux" }).getByRole("button").first().click();
  await expect(listPage).toBeVisible();
}

/** Retour au fil du chantier (ce que BatiClair a compris, la barre de message, les fournisseurs). */
async function backToSite(page: Page) {
  await page.getByRole("region", { name: "Page des fournitures" }).getByRole("button", { name: "Retour au chantier" }).click();
  await expect(page.getByRole("region", { name: "Page des fournitures" })).toHaveCount(0);
}

/**
 * LA LISTE DES FOURNITURES : tant qu'il reste de l'orange, l'artisan touche « Vérifier… », répond à la question qui
 * s'ouvre en bas, et recommence ; fini quand le gros bouton dit « Envoyer au fournisseur ».
 */
async function confirmDoubts(page: Page) {
  if (!(await page.getByRole("dialog", { name: /^Question : / }).isVisible())) await openList(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  for (let i = 0; i < 30; i++) {
    if (await page.getByRole("dialog", { name: /^Question : / }).isVisible()) {
      await answerSheet(page);
      continue;
    }
    await expect(list).toBeVisible();
    const verify = list.getByRole("button", { name: /^Vérifier (la ligne|les \d+ lignes)$/ });
    if (!(await verify.isVisible())) {
      await expect(list.getByRole("button", { name: "Envoyer au fournisseur" })).toBeVisible();
      return;
    }
    await verify.click();
    await expect(page.getByRole("dialog", { name: /^Question : / })).toBeVisible();
    await answerSheet(page);
  }
}

/** L'artisan vérifie les lignes orange une à une jusqu'à voir cette carte dans la question ouverte (qui reste ouverte). */
async function answerUntil(page: Page, name: string) {
  if (!(await page.getByRole("dialog", { name: /^Question : / }).isVisible())) await openList(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  for (let i = 0; i < 30; i++) {
    const sheet = page.getByRole("dialog", { name: /^Question : / });
    if (!(await sheet.isVisible())) {
      await list.getByRole("button", { name: /^Vérifier (la ligne|les \d+ lignes)$/ }).click();
      await expect(sheet).toBeVisible();
    }
    if (await sheet.getByRole("region", { name }).isVisible()) return;
    await answerSheet(page);
  }
}

/**
 * Un chantier déjà nommé (client, adresse) : créé par la porte de l'API, comme le ferait un partenaire. Dans l'app,
 * « Nouveau chantier » n'a plus qu'une action, déposer le PDF (§48) : le test « depuis le + » la couvre.
 */
async function createProject(page: Page, name: string, client: string, address: string) {
  const id = await page.evaluate(
    async (body) => {
      const companyId = localStorage.getItem("baticlair.companyId");
      const res = await fetch("/v1/projects", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json", ...(companyId ? { "x-company-id": companyId } : {}) },
        body: JSON.stringify(body),
      });
      return res.ok ? ((await res.json()) as { id: string }).id : null;
    },
    { name, clientName: client || null, address: address || null, trade: null },
  );
  expect(id, "chantier créé").not.toBeNull();
  await page.goto(`/chantiers/${id}`);
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

/**
 * §48 : après la lecture, les questions de comptoir (toutes d'un coup, avant le calcul) ; « Calculer ma liste » les
 * laisse en orange. Sans question, le calcul part tout seul. Fini quand la liste des fournitures est à l'écran.
 */
async function passQuestions(page: Page) {
  // La page des fournitures : la liste, ou d'abord « par logement » pour un chantier de plusieurs logements.
  const list = page.getByRole("region", { name: "Page des fournitures" });
  const questions = page.getByRole("region", { name: /^J'ai quelques questions/ });
  await expect(list.or(questions).first()).toBeVisible({ timeout: 60_000 });
  if (await questions.isVisible()) await page.getByRole("button", { name: /^Calculer ma liste/ }).click();
  await expect(list).toBeVisible({ timeout: 60_000 });
}

test("un artisan crée son compte et son premier chantier depuis le +", async ({ page }) => {
  await signUp(page);
  await expect(page.getByText("Toitures Martin")).toBeVisible();
  await expect(page.getByText("Créez votre premier chantier")).toBeVisible();

  // Le « + » : un nouveau chantier = déposer le PDF, rien d'autre à remplir (§48).
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Nouveau chantier" }).click();
  await expect(page).toHaveURL(/\/chantiers\/nouveau$/);
  await expect(page.getByRole("heading", { name: "Dépose ton devis, je te sors le quantitatif." })).toBeVisible();
  await expect(page.getByLabel("Nom du chantier")).toHaveCount(0);
  await page.getByLabel("Choisir le devis (PDF)").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  // Le chantier est créé au dépôt ; la lecture part d'elle-même, sans champ « précisions » ni bouton à toucher.
  await expect(page).toHaveURL(/\/chantiers\/[0-9a-f-]{36}/);
  await expect(page.getByRole("button", { name: "Lire le devis" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Ajouter des informations sur le chantier/ })).toHaveCount(0);
  await passQuestions(page);
  await expect(page.getByText("L'IA peut se tromper, n'hésite pas à peaufiner.", { exact: false })).toBeVisible();

  // Le nom (lu dans le devis, sinon d'attente) se change d'un tap.
  await page.getByRole("button", { name: /^Renommer le chantier : / }).click();
  await page.getByLabel("Nom du chantier").fill("Toiture Dupont");
  await page.getByRole("button", { name: "Enregistrer le nom" }).click();
  await expect(page.getByRole("heading", { name: "Toiture Dupont" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Toiture Dupont" })).toBeVisible();

  // Retour depuis la fiche : jamais vers le dépôt (il a été remplacé par le chantier).
  await page.getByRole("button", { name: "Retour" }).click();
  await expect(page).not.toHaveURL(/\/chantiers\/nouveau/);
  await page.goto("/chantiers");
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

/** Glisse une ligne de la liste vers la gauche, du bout du doigt (souris en test), sur `ratio` de sa largeur. */
async function swipeLeft(page: Page, name: RegExp, ratio: number) {
  const box = (await page.getByRole("link", { name }).boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width - 10, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.width - 10 - (box.width * ratio * i) / 10, y);
  await page.mouse.up();
}

test("glisser un chantier vers la gauche le range dans Terminés, et « Annuler » le remet", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Toiture Le Bris", "M. Le Bris", "Quimper");
  await createProject(page, "Zinguerie Morvan", "Mme Morvan", "Brest");
  await page.goto("/chantiers");
  const bris = page.getByRole("link", { name: /Toiture Le Bris/ });
  await expect(bris).toBeVisible();

  // Petit glissement : le bouton « Terminé » apparaît, le chantier ne s'ouvre pas.
  await swipeLeft(page, /Toiture Le Bris/, 0.3);
  await expect(page).toHaveURL(/\/chantiers$/);
  await page.getByRole("button", { name: "Marquer terminé : Toiture Le Bris" }).click();
  await expect(bris).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Rangé dans Terminés" })).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(bris).toBeVisible();

  // Long glissement : rangé d'un geste. Rien n'est perdu : il est dans « Terminés », d'où on le reprend.
  await swipeLeft(page, /Toiture Le Bris/, 0.8);
  await expect(bris).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Zinguerie Morvan/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: /Zinguerie Morvan/ })).toBeVisible();
  await expect(bris).toHaveCount(0);
  await page.getByRole("button", { name: "Terminés" }).click();
  await expect(bris).toBeVisible();
  await page.getByRole("button", { name: "Reprendre : Toiture Le Bris" }).focus();
  await page.keyboard.press("Enter");
  await expect(bris).toHaveCount(0);
  await page.getByRole("button", { name: "En cours" }).click();
  await expect(bris).toBeVisible();

  // Un simple appui ouvre toujours le chantier.
  await bris.click();
  await expect(page.getByRole("heading", { name: "Toiture Le Bris" })).toBeVisible();
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
  // §48 : déposé, il est lu tout de suite (aucun champ, aucun bouton), puis les questions, puis la liste.
  await passQuestions(page);
  await expect(page.getByText("devis-client-couvreur.pdf")).toBeVisible();
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
  await passQuestions(page);
  await expect(page.getByText("devis-client-couvreur.pdf")).toBeVisible();

  // Un devis scanné de 7 Mo (au-delà des 4,5 Mo d'une requête chez l'hébergeur) part en morceaux, et se rouvre entier.
  await page.getByRole("button", { name: "Supprimer devis-client-couvreur.pdf" }).click();
  await page.getByRole("button", { name: "Oui, supprimer" }).click();
  await expect(page.getByText("devis-client-couvreur.pdf")).toHaveCount(0);
  const heavy = Buffer.concat([fs.readFileSync(fixture("devis-client-couvreur.pdf")), Buffer.from(`\n%${"x".repeat(7_000_000)}\n`)]);
  const parts: string[] = [];
  page.on("request", (r) => r.url().includes("/v1/uploads/") && parts.push(r.url()));
  await page.getByLabel("Choisir le devis (PDF)").setInputFiles({ name: "devis-scanne.pdf", mimeType: "application/pdf", buffer: heavy });
  await passQuestions(page);
  await expect(page.getByText("devis-scanne.pdf")).toBeVisible();
  expect(parts).toHaveLength(3);
  await expect(page.getByRole("alert").filter({ hasText: /volumineux|Introuvable/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Ouvrir devis-scanne.pdf" }).click();
  const viewer = page.getByRole("dialog", { name: "devis-scanne.pdf" });
  await expect(viewer.getByRole("link", { name: "Télécharger" })).toBeVisible();
  const size = await viewer.locator("iframe").evaluate(async (frame) => (await (await fetch((frame as HTMLIFrameElement).src)).blob()).size);
  expect(size).toBe(heavy.byteLength);
  await viewer.getByRole("button", { name: "Fermer le document" }).click();
});

test("un couvreur fait préparer sa liste de matériaux par l'IA, la corrige et la valide", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Toiture Morel", "Mme Morel", "3 impasse des Lilas, Lorient");
  await page.getByLabel("Choisir le devis (PDF)").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  // IA simulée en test (AI_PROVIDER=fake) : même parcours, aucun appel payant. La lecture part d'elle-même (§48).
  await passQuestions(page);

  // Les crochets en paquets : seul un doute de LECTURE est posé (« 2 ou 3 ? »), jamais « combien par paquet ».
  await answerUntil(page, "À régler : Crochet inox ardoise 100 mm");
  await expect(page.getByText("Chiffre peu lisible : 2 ou 3 paquets ?")).toBeVisible();
  // La poubelle est dans la question : retirer la ligne sans quitter l'enchaînement (retour du fondateur, 2026-10-05).
  await expect(page.getByRole("dialog", { name: /^Question : / }).getByRole("button", { name: /^Retirer de la liste : / })).toBeVisible();
  await expect(page.getByText(/combien par paquet|pièces par paquet/i)).toHaveCount(0);
  await confirmDoubts(page);
  // UN SEUL ÉCRAN : la liste des fournitures, tout est vert ou gris, le gros bouton dit « Envoyer au fournisseur ».
  const liste = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(liste.getByText(/^\d+ fournitures · tout est prêt$/)).toBeVisible();
  await expect(liste.getByRole("img", { name: "à vérifier" })).toHaveCount(0);
  // Un seul geste par ligne : la toucher ouvre sa fiche, où l'on retire (« Annuler » pendant 3 s).
  const premiere = liste.getByRole("button", { name: /^Modifier : / }).first();
  const retiree = (await premiere.getAttribute("aria-label"))!;
  await premiere.click();
  await liste.getByRole("button", { name: "Retirer de la liste" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Retiré de la liste" })).toBeVisible();
  await page.getByRole("status").getByRole("button", { name: "Annuler" }).click();
  await expect(liste.getByRole("button", { name: retiree, exact: true })).toHaveCount(1);

  // La preuve dans la fiche de l'article.
  await page.getByRole("button", { name: "Modifier : Tuile romane canal rouge 12,5 u/m²" }).click();
  await page.getByRole("button", { name: "Voir la ligne du devis : Tuile romane canal rouge 12,5 u/m²" }).click();
  await expect(page.getByText("(lu dans le devis)").first()).toBeVisible();

  // § 41.4 : la désignation d'une ligne se réécrit d'un tap, sans aide (test de recette : une personne hors BTP).
  const edit = page.getByRole("form", { name: "Modifier : Tuile romane canal rouge 12,5 u/m²" });
  await edit.getByLabel("Désignation").fill("Tuile romane canal rouge 12,5 u/m² Toit principal");
  await edit.getByRole("button", { name: "Enregistrer" }).click();
  // Une ligne réécrite repasse par « C'est bon » (ligne modifiée = à confirmer), puis la carte la montre sous son nouveau nom.
  await confirmDoubts(page);
  await expect(page.getByRole("button", { name: "Modifier : Tuile romane canal rouge 12,5 u/m² Toit principal", exact: true })).toBeVisible();

  // Un croquis sur la ligne (couvertine, habillage…) : le crayon permet de joindre une photo avec une précision ; elle
  // reste sous l'article, et se retire d'un appui.
  const tuile = "Tuile romane canal rouge 12,5 u/m² Toit principal";
  await page.getByRole("button", { name: `Modifier : ${tuile}` }).click();
  await page.getByLabel(`Précision du croquis : ${tuile}`).fill("Rive côté jardin, voir photo");
  await page.getByLabel("Joindre une photo ou un PDF").setInputFiles({ name: "rive.png", mimeType: "image/png", buffer: PNG_1PX });
  const joints = page.getByRole("list", { name: `Croquis joints : ${tuile}` });
  await expect(joints.getByText("rive.png · Rive côté jardin, voir photo")).toBeVisible();
  await joints.getByRole("button", { name: "Retirer le croquis rive.png" }).click();
  await expect(joints).toHaveCount(0);
  await page.getByRole("form", { name: `Modifier : ${tuile}` }).getByRole("button", { name: "Annuler" }).click();

  // Le devis lu reste à un appui : noms courts, ajout et retrait d'une ligne.
  await page.getByRole("button", { name: "Corriger le devis lu" }).click();
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
  await page.getByRole("button", { name: "Revenir à la liste des fournitures" }).last().click();

  await confirmDoubts(page);
  // « Envoyer au fournisseur » valide la liste et ouvre l'aperçu (§45.9) ; « Revenir à la liste » le referme.
  await openList(page);
  await page.getByRole("button", { name: "Envoyer au fournisseur" }).click();
  const apercu = page.getByRole("dialog", { name: "Aperçu de la demande de devis" });
  await expect(apercu.getByRole("article", { name: "Demande de devis" })).toBeVisible();
  await expect(apercu.getByRole("button", { name: "Choisissez un fournisseur" })).toBeDisabled();
  await apercu.getByRole("button", { name: "Revenir à la liste" }).click();
  await expect(apercu).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Liste des fournitures" })).toBeVisible();

  // La liste validée est conservée.
  await page.reload();
  await openList(page);
  await expect(page.getByText(/^\d+ fournitures · liste validée$/)).toBeVisible();
  // « Voir la liste en PDF » (§21.3) : la demande de devis s'ouvre DANS l'app, avec « Fermer », « Télécharger » (et
  // « Partager » sur téléphone) : on ne reste jamais coincé dans un PDF (retour du fondateur, 2026-10-04).
  await page.getByRole("button", { name: "Voir la liste en PDF" }).click();
  const viewer = page.getByRole("dialog", { name: "Liste des fournitures" });
  await expect(viewer.getByRole("link", { name: "Télécharger" })).toHaveAttribute("download", "demande-de-devis.pdf");
  await expect(viewer.locator("iframe")).toBeVisible();
  await viewer.getByRole("button", { name: "Fermer le document" }).click();
  await expect(viewer).toHaveCount(0);

  // Une correction du devis lu reste possible après validation : la liste est à valider à nouveau.
  await page.getByRole("button", { name: "Corriger le devis lu" }).click();
  await page.getByRole("button", { name: "Corriger Tuile romane canal rouge 12,5 u/m²" }).click();
  await page.getByLabel("Quantité").fill("1 300");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("button", { name: "Revenir à la liste des fournitures" }).last().click();
  await confirmDoubts(page);
  await page.getByRole("button", { name: "Envoyer au fournisseur" }).click();
  await expect(page.getByRole("dialog", { name: "Aperçu de la demande de devis" })).toBeVisible();
});

test("un couvreur demande les prix à ses fournisseurs et range leurs devis", async ({ page }) => {
  // Parcours long (aperçu avant envoi, deux devis, comparaison) : le temps de la machine, pas un défaut.
  test.slow();
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
  await passQuestions(page);
  await page.getByRole("button", { name: "Corriger le devis lu" }).click();
  await page.getByRole("button", { name: "Corriger Crochet inox ardoise 100 mm" }).click();
  await page.getByLabel("Quantité").fill("200");
  await page.getByLabel("Unité").fill("u");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("button", { name: "Revenir à la liste des fournitures" }).last().click();
  await confirmDoubts(page);
  // §45.9 : « Envoyer au fournisseur » ouvre l'aperçu, le document tel que le fournisseur le recevra ; on y choisit
  // les fournisseurs (dont un créé sur place) et une ligne s'y corrige d'un tap.
  await page.getByRole("button", { name: "Envoyer au fournisseur" }).click();
  const apercu = page.getByRole("dialog", { name: "Aperçu de la demande de devis" });
  await expect(apercu.getByRole("heading", { name: "À QUI J'ENVOIE ?" })).toBeVisible();
  await apercu.getByRole("checkbox", { name: /Point.P Vannes/ }).check();
  await apercu.getByRole("button", { name: "Nouveau fournisseur" }).click();
  await apercu.getByLabel("Société").fill("Tuiles & Co");
  await apercu.getByLabel("E-mail pour les demandes de prix").fill("devis@tuiles.fr");
  await apercu.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(apercu.getByRole("checkbox", { name: /Tuiles & Co/ })).toBeChecked();
  await expect(apercu.getByRole("article", { name: "Demande de devis" })).toBeVisible();
  await expect(apercu.getByRole("heading", { name: "2. Fournitures à chiffrer" })).toBeVisible();
  await expect(apercu.getByText(/^Bonjour,/)).toBeVisible();
  await expect(apercu.getByText(/command/i)).toHaveCount(0);
  await apercu.getByRole("button", { name: /^Modifier : Gouttière/ }).click();
  await apercu.getByLabel("Précision").fill("pour façonnage naissances");
  await apercu.getByRole("button", { name: "Enregistrer" }).click();
  await expect(apercu.getByText("pour façonnage naissances")).toBeVisible();
  await apercu.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(page.getByRole("list", { name: "Vos fournisseurs" })).toBeVisible();
  // § 43.4 : juste après le premier envoi, et jamais avant, l'écran des notifications ; « Plus tard » le referme.
  const prompt = page.getByRole("dialog", { name: "Activer les notifications" });
  await expect(prompt).toBeVisible();
  await prompt.getByRole("button", { name: "Plus tard" }).click();
  await expect(prompt).toHaveCount(0);

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
  // §45 : « Envoyer » de l'aperçu a envoyé la demande de devis à chacun, le PDF joint.
  await expect(pointp.getByText("En attente", { exact: true })).toBeVisible();
  await expect(tuiles.getByText("En attente", { exact: true })).toBeVisible();
  await pointp.getByRole("button", { name: "Voir la demande de devis (PDF)" }).click();
  const demande = page.getByRole("dialog", { name: "Demande de devis" });
  await expect(demande.getByRole("link", { name: "Télécharger" })).toHaveAttribute("download", "demande-de-devis.pdf");
  await demande.getByRole("button", { name: "Fermer le document" }).click();
  await expect(demande).toHaveCount(0);
  // L'e-mail se relit mot pour mot : le contenu en trois blocs, sans un prix.
  await menu(pointp, "Voir l'e-mail");
  await expect(pointp.getByText("Objet :")).toBeVisible();
  await expect(pointp.getByText(/^Bonjour,/)).toBeVisible();
  await expect(pointp.getByText(/command/i)).toHaveCount(0);
  await expect(pointp.getByText(/€/)).toHaveCount(0);
  await expect(page.getByText("Demande envoyée. Ajoutez ici le devis de chaque fournisseur quand il répond.")).toBeVisible();
  // La demande est partie : la liste se replie en une ligne, les réponses des fournisseurs passent au-dessus
  // (retour du fondateur, 2026-10-05) ; un appui la rouvre.
  const repliee = page.getByRole("button", { name: /Liste des fournitures envoyée/ });
  await expect(repliee).toBeVisible();
  const [haut, bas] = await Promise.all([pointp.boundingBox(), repliee.boundingBox()]);
  expect(haut!.y).toBeLessThan(bas!.y);
  await repliee.click();
  // Le gros bouton de la liste ne propose plus un premier envoi.
  const liste = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(liste.getByRole("button", { name: "Voir la demande envoyée" })).toBeVisible();
  await expect(liste.getByRole("button", { name: "Envoyer au fournisseur" })).toHaveCount(0);
  await backToSite(page);
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

  // §47.5 retour fournisseur : la commande passée, d'un tap ; « modifié » : le bon de commande collé.
  await expect(offers.first().getByText(/Vous avez commandé chez .* : tel quel \?/)).toBeVisible();
  await offers.first().getByRole("button", { name: "Modifié" }).click();
  await offers.first().getByLabel(/Collez votre bon de commande/).fill("Tuile romane canal rouge : 1 200 u");
  await offers.first().getByRole("button", { name: "Enregistrer la commande" }).click();
  await expect(offers.first().getByText(/✓ Commande notée : \d+ écarts? avec la liste/)).toBeVisible();

  // Tout est conservé.
  await page.reload();
  await expect(pointp.getByText("6/6 articles chiffrés")).toBeVisible();
  await expect(page.locator("section#comparer").getByText("✓ Offre retenue")).toBeVisible();
  await expect(page.locator("section#comparer").getByText(/✓ Commande notée/)).toBeVisible();
});

test("plusieurs articles inconnus, sans unité : UNE décision les règle tous, rien n'est ✓ en fermant l'écran", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Piscine Le Goff", "M. Le Goff", "2 rue des Dunes, Carnac");
  await page.getByLabel("Choisir le devis (PDF)").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  await passQuestions(page);
  await expect(page.getByRole("region", { name: "Page des fournitures" })).toBeVisible();

  // L'artisan ajoute trois articles d'un autre métier, sans unité (comme sur un devis de pisciniste).
  await page.getByRole("button", { name: "Corriger le devis lu" }).click();
  for (const [designation, quantity] of [["Skimmer pour piscine liner", "1"], ["Buse de refoulement", "2"], ["Prise balai", "1"]]) {
    await page.getByRole("button", { name: "Ajouter une ligne" }).click();
    await page.getByLabel("Désignation").fill(designation!);
    await page.getByLabel("Quantité").fill(quantity!);
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(page.getByText(designation!)).toBeVisible();
  }
  await page.getByRole("button", { name: "Revenir à la liste des fournitures" }).last().click();

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
  // Gardés tels qu'écrits, à la pièce : la preuve dit que c'est un choix pour ce chantier.
  await page.getByRole("button", { name: "Modifier : Skimmer pour piscine liner" }).click();
  await page.getByRole("button", { name: "Voir la ligne du devis : Skimmer pour piscine liner" }).click();
  await expect(page.getByText("Article gardé tel qu'écrit pour ce chantier.")).toBeVisible();
});

test("mode démo : tout le parcours avec un chantier et des fournisseurs fictifs", async ({ page }) => {
  await signUp(page);
  await page.getByRole("button", { name: "Lancer la démonstration" }).click();
  await expect(page.getByRole("heading", { name: "Démo – Toiture Martin" })).toBeVisible();
  // La lecture part d'elle-même (§48), puis les questions de comptoir, puis la liste.
  await passQuestions(page);
  await expect(page.getByRole("region", { name: "Page des fournitures" })).toBeVisible();
  await expect(page.getByText("devis-client-demo.pdf")).toBeVisible();
  // Un exemple « potable » (retour du fondateur, 2026-10-04) : la liste est prête dès la lecture, rien à vérifier.
  const demoList = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(demoList.getByText(/^\d+ fournitures · tout est prêt$/)).toBeVisible();
  await expect(demoList.getByRole("img", { name: "à vérifier" })).toHaveCount(0);
  await expect(demoList.getByText("Embase plomb de sortie de toit")).toBeVisible();
  await page.getByRole("button", { name: "Envoyer au fournisseur" }).click();
  const apercu = page.getByRole("dialog", { name: "Aperçu de la demande de devis" });
  for (const name of ["Tuilerie de l'Ouest (démo)", "Négoce Breizh (démo)", "Matériaux Atlantique (démo)"]) {
    await apercu.getByRole("checkbox", { name: new RegExp(name.replace(/[()]/g, "\\$&")) }).check();
  }
  await apercu.getByRole("button", { name: "Envoyer", exact: true }).click();
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

test("RGPD : l'artisan télécharge ses données, puis supprime son compte (en tapant SUPPRIMER)", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Toiture Dupont", "M. Dupont", "4 rue du Port, Quimper");
  await page.goto("/compte");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger mes données" }).click();
  expect((await download).suggestedFilename()).toMatch(/^baticlair-mes-donnees-\d{4}-\d{2}-\d{2}\.json$/);

  // Des essais au hasard ne restent pas des habitudes : on efface ce que BatiClair a appris, les chantiers restent.
  await page.getByRole("button", { name: "Effacer ce que BatiClair a appris" }).click();
  await page.getByRole("button", { name: "Oui, tout effacer" }).click();
  await expect(page.getByText("C'est effacé. Les prochains chantiers reposeront les questions.")).toBeVisible();

  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  const confirm = page.getByRole("button", { name: "Supprimer définitivement" });
  await expect(confirm).toBeDisabled();
  await page.getByLabel("Tapez SUPPRIMER pour confirmer").fill("supprimer");
  await confirm.click();
  await expect(page.getByText("Votre compte et toutes ses données ont été supprimés.")).toBeVisible();
  // Plus de session : l'accueil renvoie vers la connexion.
  await page.goto("/");
  await expect(page).toHaveURL(/\/connexion/);
});

test("plusieurs logements : le chantier rangé par logement, puis le total à commander", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Résidence Les Pins", "SCI Les Pins", "4 allée des Pins, Vannes");
  await page.getByLabel("Choisir le devis (PDF)").setInputFiles(path.join(__dirname, "fixtures", "devis-electricien-logements.pdf"));
  await passQuestions(page);
  // D'abord par logement (retour du fondateur, 2026-10-05) : les identiques regroupés, chacun avec ses quantités du devis.
  await expect(page.getByRole("tab", { name: "Par logement (3)" })).toHaveAttribute("aria-selected", "true");
  const vue = page.getByRole("region", { name: "Le chantier par logement" });
  const identiques = vue.getByRole("article", { name: "2 logements identiques" });
  await expect(identiques.getByText("× 2")).toBeVisible();
  await expect(identiques.getByText("Logement 1, Logement 2")).toBeVisible();
  await expect(identiques.getByRole("listitem").filter({ hasText: "Prise 2P+T 16 A" })).toContainText("9");
  await expect(vue.getByRole("article", { name: "Logement 3" }).getByRole("listitem").filter({ hasText: "Prise 2P+T 16 A" })).toContainText("6");
  // Puis le total, regroupé pour le fournisseur.
  await vue.getByRole("button", { name: "Voir le total à commander" }).click();
  await expect(page.getByRole("tab", { name: "Total à commander" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("region", { name: "Liste des fournitures" })).toBeVisible();
});

test("§48.4 : questions au bouton seulement, avant le calcul ; puis la voix sur la liste ; les suggestions décochées", async ({ page }) => {
  // Un micro simulé : la dictée du navigateur « entend » une phrase, comme un artisan devant sa liste.
  await page.addInitScript(() => {
    class FakeRecognition {
      lang = "fr-FR";
      interimResults = false;
      continuous = true;
      onresult: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      // Comme un iPhone : le micro se coupe après une pause, et les résultats repartent de zéro au redémarrage
      // (avant : seul le dernier morceau restait, « Ok »). Il n'applique qu'au « Terminer ».
      static starts = 0;
      start() {
        FakeRecognition.starts += 1;
        const n = FakeRecognition.starts;
        setTimeout(() => {
          const final = (transcript: string) => Object.assign([{ transcript }], { isFinal: true });
          if (n === 1) {
            this.onresult?.({ resultIndex: 0, results: [final("Ok alors enlève l'écran")] });
            this.onend?.();
          } else if (n === 2) {
            this.onresult?.({ resultIndex: 0, results: [final("j'ai oublié 2 cartouches de silicone")] });
          }
        }, 50);
      }
      stop() {
        setTimeout(() => this.onend?.(), 20);
      }
    }
    const w = window as unknown as { SpeechRecognition: unknown; webkitSpeechRecognition: unknown };
    w.SpeechRecognition = FakeRecognition;
    w.webkitSpeechRecognition = FakeRecognition;
  });
  await signUp(page);
  await createProject(page, "Toiture Kervella", "M. Kervella", "2 rue du Port, Lorient");
  await page.getByLabel("Choisir le devis (PDF)").setInputFiles(path.join(__dirname, "fixtures", "devis-questions-comptoir.pdf"));

  // ÉTAPE 3 : un seul écran, AU BOUTON : ni micro, ni zone de texte ici.
  const questions = page.getByRole("region", { name: /^J'ai quelques questions pour éviter les allers-retours avec ton fournisseur/ });
  await expect(questions).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: /voix/ })).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  // Tout ce qui manque au calcul : ce que le devis ne dit pas, les valeurs prises par défaut, la quincaillerie.
  await expect(page.getByRole("region", { name: "Ce que le devis ne dit pas" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Je pars sur ces valeurs" })).toBeVisible();
  await expect(page.getByText("par défaut").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Quincaillerie et consommables : on les ajoute ?" })).toBeVisible();
  await questions.getByRole("button", { name: "Espagne 1er choix" }).click();
  await expect(questions.getByRole("button", { name: "Espagne 1er choix" })).toHaveAttribute("aria-pressed", "true");
  await questions.getByRole("button", { name: /Je commande façonné/ }).click();
  // La quincaillerie : on répond à l'égout seulement ; le faîtage reste sans réponse.
  const quincaillerie = page.getByRole("region", { name: "Quincaillerie et consommables : on les ajoute ?" });
  await quincaillerie.getByRole("listitem").filter({ hasText: /égout/ }).getByRole("button", { name: "Oui" }).click();
  await page.getByRole("button", { name: /^Calculer ma liste/ }).click();

  const list = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(list).toBeVisible({ timeout: 60_000 });
  // §48.4 : plus aucune question après la sortie de la liste.
  await expect(questions).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: /^Question : / })).toHaveCount(0);
  await expect(list.getByText(/égout/i).first()).toBeVisible();
  // Le faîtage, pas demandé : il attend dans « Suggestions », décoché, hors de la liste.
  const suggestions = list.getByRole("region", { name: "Suggestions" });
  await expect(suggestions).toBeVisible();
  const faitage = suggestions.getByRole("checkbox", { name: /Faîtage zinc/ });
  await expect(faitage).not.toBeChecked();
  await faitage.check();
  await expect(list.getByRole("region", { name: "Suggestions" }).getByRole("checkbox", { name: /Faîtage zinc/ })).toHaveCount(0);

  // La voix arrive sur l'écran du quantitatif, la liste sous les yeux.
  const voix = page.getByRole("region", { name: "Modifier à la voix" });
  await expect(voix.getByText("Modifie ton quantitatif à la voix : dis-moi ce que tu enlèves, ce que tu ajoutes, ce que tu as oublié.")).toBeVisible();
  await voix.getByRole("button", { name: "Modifier à la voix" }).click();
  // Le texte s'écrit pendant qu'il parle, la pause ne coupe rien ; « Terminer » modifie tout de suite.
  await expect(voix.getByLabel("Ce que j'entends")).toContainText("j'ai oublié 2 cartouches de silicone");
  await expect(voix.getByLabel("Ce que j'entends")).toContainText("enlève l'écran");
  await voix.getByRole("button", { name: "Terminer" }).click();
  const fait = page.getByRole("status", { name: "Ce que j'ai modifié" });
  // Le texte entier du résumé : en cas d'échec, le message dit ce qui a été compris.
  await expect(fait).toContainText(/Retiré :.*Écran HPV/);
  await expect(fait).toContainText("Ajouté : Silicone · 2 cartouches");
  await expect(list.getByText(/^Silicone$/)).toBeVisible();
  await expect(list.getByRole("button", { name: /Écran HPV/ })).toHaveCount(0);
  // La main reste : plus / moins, crayon, corbeille.
  await expect(list.getByText("L'IA peut se tromper, n'hésite pas à peaufiner.", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: /^J'ai quelques questions/ })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Liste des fournitures" }).getByText(/^Silicone$/)).toBeVisible();
});

test("§48.5 : envoyer une sélection à un autre fournisseur, discret, puis l'envoi normal inchangé", async ({ page }) => {
  await signUp(page);
  // Deux fournisseurs au carnet (par l'API : le carnet a son propre test).
  for (const [name, email] of [
    ["Point.P", "devis@pointp.fr"],
    ["Tuiles & Co", "devis@tuiles.fr"],
  ]) {
    const ok = await page.evaluate(
      async (body) => {
        const companyId = localStorage.getItem("baticlair.companyId");
        const res = await fetch("/v1/suppliers", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json", ...(companyId ? { "x-company-id": companyId } : {}) },
          body: JSON.stringify(body),
        });
        return res.ok;
      },
      { name, email },
    );
    expect(ok).toBe(true);
  }
  await createProject(page, "Toiture Le Bihan", "M. Le Bihan", "3 quai Duguay-Trouin, Saint-Malo");
  await page.getByLabel("Choisir le devis (PDF)").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  await passQuestions(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(list).toBeVisible();

  // Par défaut, rien ne change : aucune case à cocher.
  await expect(list.getByRole("checkbox")).toHaveCount(0);
  await list.getByRole("button", { name: "Envoyer une sélection à un autre fournisseur" }).click();
  const boxes = list.getByRole("checkbox", { name: /^Envoyer à part : / });
  await expect(boxes.first()).toBeVisible();
  // Deux lignes prêtes, vers Point.P.
  const ready = boxes.and(page.locator(":enabled"));
  await ready.nth(0).check();
  await ready.nth(1).check();
  const bar = page.getByRole("region", { name: "Envoyer la sélection" });
  await expect(bar.getByText("2 lignes cochées")).toBeVisible();
  await bar.getByLabel("Fournisseur").selectOption({ label: "Point.P" });
  await bar.getByRole("button", { name: "Envoyer" }).click();
  // Elles restent dans la liste, en gris « Envoyé », et les cases disparaissent.
  await expect(list.getByText("Envoyé · Point.P")).toHaveCount(2);
  await expect(list.getByRole("checkbox")).toHaveCount(0);

  // Une autre sélection, vers un autre fournisseur.
  await list.getByRole("button", { name: "Envoyer une sélection à un autre fournisseur" }).click();
  await ready.nth(2).check();
  await bar.getByLabel("Fournisseur").selectOption({ label: "Tuiles & Co" });
  await bar.getByRole("button", { name: "Envoyer" }).click();
  await expect(list.getByText("Envoyé · Tuiles & Co")).toHaveCount(1);
  await expect(list.getByText("Envoyé · Point.P")).toHaveCount(2);

  // L'envoi normal n'a pas bougé : toute la liste, d'un coup, au fournisseur habituel.
  await expect(list.getByRole("button", { name: /^(Envoyer au fournisseur|Vérifier (la ligne|les \d+ lignes))$/ })).toBeVisible();
  await expect(list.getByRole("button", { name: "Voir la demande envoyée" })).toHaveCount(0);
});
