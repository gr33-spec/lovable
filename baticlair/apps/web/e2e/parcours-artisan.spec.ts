import fs from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

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
  await page.getByLabel("Nom de ton entreprise").fill("Toitures Martin");
  // Seule question métier : un appui (ici un couvreur).
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("heading", { name: /^Bonjour Jean/ })).toBeVisible();
  return email;
}

/** La réponse précédente s'enregistre encore (boutons « aria-busy ») : on attend que la liste soit au repos. */
async function settle(page: Page) {
  await expect(page.getByRole("region", { name: "Liste des fournitures" }).locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
}

/**
 * §49.8 : UNE LIGNE ORANGE SE RÈGLE DANS SA CARTE, D'UN GESTE. « C'est bon » / « Garder » / « Oui » s'il y en a, sinon le
 * premier choix, sinon le petit champ (« 2 », OK). Jamais un autre écran.
 */
async function settleCard(page: Page, card: ReturnType<Page["getByRole"]>) {
  const yes = card.getByRole("button", { name: /^(C'est bon|Garder|Oui)/ }).first();
  const input = card.getByRole("textbox");
  if (await yes.isVisible()) await yes.click();
  else if (await input.isVisible()) {
    await input.fill("2");
    await card.getByRole("button", { name: "OK" }).click();
  } else await card.getByRole("group").getByRole("button").first().click();
  await settle(page);
}

/** Une ligne ouverte passe au premier plan, le reste flouté (§50.7) : un tap sur le flou la referme. */
async function closeOpenLine(page: Page) {
  const voile = page.getByRole("button", { name: "Fermer la ligne ouverte" });
  if (await voile.isVisible()) await voile.click({ position: { x: 5, y: 5 } });
  await expect(voile).toHaveCount(0);
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
 * LA LISTE DES FOURNITURES : tant qu'il reste de l'orange, l'artisan règle la première carte orange d'un geste, sans
 * quitter la liste (§49.8) ; fini quand le gros bouton dit « Envoyer au fournisseur ».
 */
async function confirmDoubts(page: Page) {
  await openList(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  for (let i = 0; i < 40; i++) {
    await settle(page);
    // §50.7 : une ligne orange garde son point et sa raison ; un tap l'ouvre, ses boutons se règlent là.
    const orange = list.getByRole("listitem").filter({ has: page.getByRole("img", { name: "à vérifier" }) }).first();
    if (!(await orange.isVisible())) {
      await closeOpenLine(page);
      await expect(list.getByRole("button", { name: "Envoyer au fournisseur" })).toBeVisible();
      return;
    }
    await settleCard(page, await openRow(orange));
  }
}

/** §50.7 : une ligne du document s'ouvre d'un tap ; ouverte, elle porte ses boutons (« Régler : … »). */
async function openRow(row: Locator) {
  const opener = row.getByRole("button", { name: /^(Modifier|Fermer) : / }).first();
  if ((await opener.getAttribute("aria-expanded")) !== "true") await opener.click();
  return row.getByRole("group", { name: /^Régler : / });
}

/** La carte orange d'une ligne, dans la liste (§49.8 : tout se règle là). */
async function orangeCard(page: Page, label: string) {
  await openList(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  const row = list.getByRole("listitem").filter({ has: page.getByRole("button", { name: `Modifier : ${label}`, exact: true }).or(page.getByRole("button", { name: `Fermer : ${label}`, exact: true })) }).first();
  await openRow(row);
  const card = list.getByRole("group", { name: `Régler : ${label}`, exact: true });
  await expect(card).toBeVisible();
  return card;
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
  const questions = page.getByRole("region", { name: "Les questions" });
  await expect(list.or(questions).first()).toBeVisible({ timeout: 60_000 });
  if (await questions.isVisible()) {
    // §49.4 : le façonnage de chaque pièce de zinc est obligatoire avant le calcul.
    const faconne = questions.getByRole("button", { name: /^Je façonne/ });
    for (let i = 0; i < (await faconne.count()); i++) await faconne.nth(i).click();
    await page.getByRole("button", { name: /^Calculer ma liste/ }).click();
  }
  await expect(list).toBeVisible({ timeout: 60_000 });
}

test("un artisan crée son compte et son premier chantier depuis le +", async ({ page }) => {
  await signUp(page);
  await expect(page.getByText("Toitures Martin")).toBeVisible();
  await expect(page.getByText("Crée ton premier chantier")).toBeVisible();

  // Le « + » : un nouveau chantier = déposer le PDF, rien d'autre à remplir (§48).
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Nouveau chantier" }).click();
  await expect(page).toHaveURL(/\/chantiers\/nouveau$/);
  // §50.1 : un bouton, « Déposer mon devis ».
  await expect(page.getByText("Déposer mon devis", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Nom du chantier")).toHaveCount(0);
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  // Le chantier est créé au dépôt ; la lecture part d'elle-même, sans champ « précisions » ni bouton à toucher.
  await expect(page).toHaveURL(/\/chantiers\/[0-9a-f-]{36}/);
  await expect(page.getByRole("button", { name: "Lire le devis" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Ajouter des informations sur le chantier/ })).toHaveCount(0);
  await passQuestions(page);
  // Retour du fondateur (2026-10-09) : ni bandeau « L'IA peut se tromper… », ni gros bouton « Corriger » sur les cartes.
  await expect(page.getByRole("region", { name: "Liste des fournitures" })).toBeVisible();
  await expect(page.getByText("L'IA peut se tromper", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Corriger : / })).toHaveCount(0);

  // §50.4 : le titre du chantier rouvre le devis ; le nom se change par « Modifier le chantier ».
  await expect(page.getByRole("button", { name: /^Ouvrir le devis : / })).toBeVisible();
  await page.getByRole("button", { name: "Plus d'actions sur le chantier" }).click();
  await page.getByRole("menuitem", { name: "Modifier le chantier" }).click();
  await page.getByLabel("Nom du chantier").fill("Toiture Dupont");
  await page.getByRole("button", { name: "Enregistrer" }).click();
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
  // Le chantier disparaît tout de suite ; le bandeau dit qu'il est enregistré. Recharger avant reperdrait l'appel en cours.
  await expect(page.getByRole("status").filter({ hasText: "Rangé dans Terminés" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: /Zinguerie Morvan/ })).toBeVisible();
  await expect(bris).toHaveCount(0);
  await page.getByRole("button", { name: "Terminés" }).click();
  await expect(bris).toBeVisible();
  await page.getByRole("button", { name: "Reprendre : Toiture Le Bris" }).focus();
  // Le chantier quitte « Terminés » tout de suite ; on attend que le serveur l'ait enregistré avant d'ouvrir « En cours »
  // (sinon la liste peut se relire avant, sans lui : échec vu en CI).
  const saved = page.waitForResponse((r) => r.request().method() === "PATCH" && /\/v1\/projects\/[^/]+$/.test(new URL(r.url()).pathname));
  await page.keyboard.press("Enter");
  await expect(bris).toHaveCount(0);
  expect((await saved).ok()).toBe(true);
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
  await page.getByLabel("Déposer mon devis").setInputFiles({
    name: "devis.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("<html>pas un pdf</html>"),
  });
  await expect(page.getByRole("alert").filter({ hasText: "Ce fichier n'est pas un PDF" })).toBeVisible();

  // Devis client : 3 pages (tableau, page scannée, conditions générales).
  await page.getByLabel("Déposer mon devis").setInputFiles(fixture("devis-client-couvreur.pdf"));
  // §48 : déposé, il est lu tout de suite (aucun champ, aucun bouton), puis les questions, puis la liste.
  await passQuestions(page);
  // §50.4 : plus de carte du PDF ; le titre du chantier rouvre le devis.
  const title = page.getByRole("button", { name: "Ouvrir le devis : Toiture Leroy" });
  await expect(title).toBeVisible();
  await expect(page.getByText("devis-client-couvreur.pdf")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Préparer la liste de matériaux" })).toHaveCount(0);
  await expect(page.getByText(/page lue|pages lues/)).toHaveCount(0);
  await expect(page.getByText("PROCHAINE ÉTAPE", { exact: true })).toHaveCount(0);

  // Après rechargement, le devis est toujours là.
  await page.reload();
  await expect(title).toBeVisible();

  // Compte : la formule en mots simples (essai, chantiers utilisés), jamais de coûts techniques.
  await page.goto("/compte");
  await expect(page.getByText("Essai gratuit")).toBeVisible();
  await expect(page.getByText("1 chantier sur 3")).toBeVisible();
  await expect(page.getByText(/Consommation IA|analyse|tokens/i)).toHaveCount(0);

  // Un devis déposé par erreur se retire depuis le menu du chantier (avec confirmation), puis se redépose.
  await page.goBack();
  const removeQuote = async () => {
    await page.getByRole("button", { name: "Plus d'actions sur le chantier" }).click();
    await page.getByRole("menuitem", { name: "Retirer le devis" }).click();
    await page.getByRole("button", { name: "Oui, retirer" }).click();
    await expect(page.getByLabel("Déposer mon devis")).toBeAttached();
  };
  await page.getByRole("button", { name: "Plus d'actions sur le chantier" }).click();
  await page.getByRole("menuitem", { name: "Retirer le devis" }).click();
  await page.getByRole("button", { name: "Non" }).click();
  await expect(title).toBeVisible();
  await page.getByRole("button", { name: "Plus d'actions sur le chantier" }).click();
  await removeQuote();
  await expect(title).toHaveCount(0);
  await page.getByLabel("Déposer mon devis").setInputFiles(fixture("devis-client-couvreur.pdf"));
  await passQuestions(page);
  await expect(title).toBeVisible();

  // Un devis scanné de 7 Mo (au-delà des 4,5 Mo d'une requête chez l'hébergeur) part en morceaux, et se rouvre entier.
  await removeQuote();
  const heavy = Buffer.concat([fs.readFileSync(fixture("devis-client-couvreur.pdf")), Buffer.from(`\n%${"x".repeat(7_000_000)}\n`)]);
  const parts: string[] = [];
  page.on("request", (r) => r.url().includes("/v1/uploads/") && parts.push(r.url()));
  await page.getByLabel("Déposer mon devis").setInputFiles({ name: "devis-scanne.pdf", mimeType: "application/pdf", buffer: heavy });
  await passQuestions(page);
  await expect(title).toBeVisible();
  expect(parts).toHaveLength(3);
  await expect(page.getByRole("alert").filter({ hasText: /volumineux|Introuvable/ })).toHaveCount(0);
  await title.click();
  const viewer = page.getByRole("dialog", { name: "devis-scanne.pdf" });
  await expect(viewer.getByRole("link", { name: "Télécharger" })).toBeVisible();
  const size = await viewer.locator("iframe").evaluate(async (frame) => (await (await fetch((frame as HTMLIFrameElement).src)).blob()).size);
  expect(size).toBe(heavy.byteLength);
  await viewer.getByRole("button", { name: "Fermer le document" }).click();
});

test("un couvreur fait préparer sa liste de matériaux par l'IA, la corrige et la valide", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Toiture Morel", "Mme Morel", "3 impasse des Lilas, Lorient");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  // IA simulée en test (AI_PROVIDER=fake) : même parcours, aucun appel payant. La lecture part d'elle-même (§48).
  await passQuestions(page);

  // Les crochets en paquets : seul un doute de LECTURE est posé (« 2 ou 3 ? »), jamais « combien par paquet ».
  // §49.8 : la carte orange dit sa raison en entier, dans la liste, et se règle là.
  await orangeCard(page, "Crochet inox ardoise 100 mm");
  // §50.3 : la raison en cinq mots au plus.
  await expect(page.getByText("Chiffre peu lisible", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/combien par paquet|pièces par paquet/i)).toHaveCount(0);
  await confirmDoubts(page);
  // §50.3 : tout est vert, plus de barre « à régler », un seul bouton « Envoyer au fournisseur » ; aucun compteur (§50.4).
  const liste = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(liste.getByText(/lignes? à régler/)).toHaveCount(0);
  await expect(liste.getByText(/\d+ fournitures? ·/)).toHaveCount(0);
  await expect(liste.getByRole("img", { name: "à vérifier" })).toHaveCount(0);

  // § 41.4 et §50.7 : la ligne s'ouvre d'un tap, et un tap sur son nom le réécrit, sur le document même.
  await closeOpenLine(page);
  await page.getByRole("button", { name: "Modifier : Tuile romane canal rouge 12,5 u/m²" }).click();
  await page.getByRole("button", { name: "Modifier le nom : Tuile romane canal rouge 12,5 u/m²" }).click();
  await page.getByLabel("Nom : Tuile romane canal rouge 12,5 u/m²").fill("Tuile romane canal rouge 12,5 u/m² Toit principal");
  await page.getByRole("button", { name: "OK" }).click();
  // Une ligne réécrite repasse par « C'est bon » (ligne modifiée = à confirmer), puis la carte la montre sous son nouveau nom.
  await confirmDoubts(page);
  await expect(page.getByRole("button", { name: /^(Modifier|Fermer) : Tuile romane canal rouge 12,5 u\/m² Toit principal$/ })).toBeVisible();

  // Un croquis sur la ligne (couvertine, habillage…) : la ligne ouverte permet de joindre une photo ; elle reste sous
  // l'article, et se retire d'un appui.
  const tuile = "Tuile romane canal rouge 12,5 u/m² Toit principal";
  const tuileOpen = page.getByRole("button", { name: `Modifier : ${tuile}` });
  if (await tuileOpen.isVisible()) await tuileOpen.click();
  await page.getByLabel(`Joindre un croquis : ${tuile}`).setInputFiles({ name: "rive.png", mimeType: "image/png", buffer: PNG_1PX });
  const joints = page.getByRole("list", { name: `Croquis joints : ${tuile}` });
  await expect(joints.getByText("rive.png")).toBeVisible();
  await joints.getByRole("button", { name: "Retirer le croquis rive.png" }).click();
  await expect(joints).toHaveCount(0);
  await page.getByRole("button", { name: `Fermer : ${tuile}` }).click();

  // §50.3 : « Ajouter un article », en petit sous le bouton d'envoi ; l'article se retire depuis sa fiche, sans message flottant.
  await page.getByRole("button", { name: "Ajouter un article" }).click();
  await page.getByLabel("Désignation").fill("Closoir ventilé");
  await page.getByLabel("Quantité").fill("12");
  await page.getByLabel("Unité").fill("ml");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  // Le nom court du comptoir (« Closoir ») : la carte le dit tel qu'on le demande.
  const closoir = liste.getByRole("button", { name: /^Modifier : Closoir/ });
  await expect(closoir).toBeVisible();
  await closoir.click();
  await liste.getByRole("button", { name: "Retirer de la liste" }).click();
  await expect(closoir).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Retiré de la liste" })).toHaveCount(0);

  await confirmDoubts(page);
  // §50.7 : « Envoyer au fournisseur » valide la liste et demande seulement à qui l'envoyer (le document est l'écran) ;
  // « Revenir à la liste » referme.
  await openList(page);
  await page.getByRole("button", { name: "Envoyer au fournisseur" }).click();
  const apercu = page.getByRole("dialog", { name: "À qui j'envoie ?" });
  await expect(apercu.getByRole("button", { name: "Choisis un fournisseur" })).toBeDisabled();
  await apercu.getByRole("button", { name: "Revenir à la liste" }).click();
  await expect(apercu).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Liste des fournitures" })).toBeVisible();

  // La liste validée est conservée.
  await page.reload();
  await openList(page);
  await expect(page.getByRole("button", { name: "Envoyer au fournisseur" })).toBeVisible();

  // Une ligne se corrige encore après validation, d'un tap sur la ligne puis le plus : la liste est à valider à nouveau.
  await page.getByRole("button", { name: `Modifier : ${tuile}` }).click();
  await page.getByRole("button", { name: `Plus : ${tuile}` }).click();
  // Le plus part une seconde après le dernier appui (une seule correction au journal).
  await page.waitForTimeout(1300);
  await settle(page);
  await confirmDoubts(page);
  await page.getByRole("button", { name: "Envoyer au fournisseur" }).click();
  await expect(page.getByRole("dialog", { name: "À qui j'envoie ?" })).toBeVisible();
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
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  await passQuestions(page);
  // §50.7 : une ligne se règle sur le document même (§50.4 : plus de « Corriger le devis lu »).
  await confirmDoubts(page);
  // §50.7 : « Envoyer au fournisseur » ne montre plus d'aperçu (le document, c'est l'écran) : on y choisit seulement les
  // fournisseurs, dont un créé sur place.
  await page.getByRole("button", { name: "Envoyer au fournisseur" }).click();
  const apercu = page.getByRole("dialog", { name: "À qui j'envoie ?" });
  await expect(apercu.getByRole("heading", { name: "À qui j'envoie ?" })).toBeVisible();
  // Retour du fondateur (2026-10-10) : « les fournisseurs cochés par défaut, avec possibilité d'en ajouter un facilement ».
  await expect(apercu.getByRole("checkbox", { name: /Point.P Vannes/ })).toBeChecked();
  await apercu.getByRole("button", { name: "Ajouter un fournisseur" }).click();
  await apercu.getByLabel("Société").fill("Tuiles & Co");
  await apercu.getByLabel("E-mail pour les demandes de prix").fill("devis@tuiles.fr");
  await apercu.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(apercu.getByRole("checkbox", { name: /Tuiles & Co/ })).toBeChecked();
  await expect(apercu.getByRole("article", { name: "Demande de devis" })).toHaveCount(0);
  await apercu.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(page.getByRole("list", { name: "Tes fournisseurs" })).toBeVisible();
  // § 43.4 : juste après le premier envoi, et jamais avant, l'écran des notifications ; « Plus tard » le referme.
  const prompt = page.getByRole("dialog", { name: "Activer les notifications" });
  await expect(prompt).toBeVisible();
  await prompt.getByRole("button", { name: "Plus tard" }).click();
  await expect(prompt).toHaveCount(0);

  // Rechargement à chaque étape : rien ne se perd.
  await page.reload();
  await expect(page.getByRole("list", { name: "Tes fournisseurs" })).toBeVisible();
  const suppliers = page.getByRole("list", { name: "Tes fournisseurs" });
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
  await expect(page.getByText("Demande envoyée. Quand un fournisseur te répond, ajoute son devis sur sa carte.")).toBeVisible();
  // La demande est partie : la liste se replie en une ligne, les réponses des fournisseurs passent au-dessus
  // (retour du fondateur, 2026-10-05) ; un appui la rouvre.
  const repliee = page.getByRole("button", { name: /Ma liste, envoyée/ });
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
  await expect(offers.first().getByText(/Tu as commandé chez .* : tel quel \?/)).toBeVisible();
  await offers.first().getByRole("button", { name: "Modifié" }).click();
  await offers.first().getByLabel(/Colle ton bon de commande/).fill("Tuile romane canal rouge : 1 200 u");
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
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  await passQuestions(page);
  await expect(page.getByRole("region", { name: "Page des fournitures" })).toBeVisible();

  // L'artisan ajoute trois articles d'un autre métier, sans unité (comme sur un devis de pisciniste), par « Ajouter un article ».
  for (const [designation, quantity] of [["Skimmer pour piscine liner", "1"], ["Buse de refoulement", "2"], ["Prise balai", "1"]]) {
    await page.getByRole("button", { name: "Ajouter un article" }).click();
    await page.getByLabel("Désignation").fill(designation!);
    await page.getByLabel("Quantité").fill(quantity!);
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(page.getByRole("region", { name: "Liste des fournitures" })).toBeVisible();
  }

  // Une seule carte pour les trois, jamais trois alertes identiques ; sa raison en entier, et son « C'est bon ».
  const name = "Articles que BatiClair ne connaît pas encore";
  await orangeCard(page, name);
  // §50.3 : la raison en cinq mots au plus.
  await expect(page.getByText("Article inconnu, sans unité", { exact: true })).toBeVisible();
  // Recharger la page ne règle rien à la place de l'artisan.
  await page.reload();
  await orangeCard(page, name);
  // Rien ne part avec une ligne orange : « Envoyer » dit pourquoi, sans ouvrir « À qui j'envoie ? ».
  await closeOpenLine(page);
  await page.getByRole("button", { name: "Envoyer au fournisseur" }).click();
  await expect(page.getByRole("dialog", { name: "À qui j'envoie ?" })).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: /^Règle d'abord/ })).toBeVisible();

  const group = await orangeCard(page, name);
  await group.getByRole("button", { name: /^C'est bon/ }).click();
  await expect(group).toHaveCount(0);
  await confirmDoubts(page);
  // Gardés tels qu'écrits, à la pièce : la ligne est verte, prête à partir.
  const skimmer = page.getByRole("region", { name: "Liste des fournitures" }).getByRole("listitem").filter({ hasText: "Skimmer pour piscine liner" }).first();
  await expect(skimmer.getByRole("img", { name: "sûr" })).toBeVisible();
});

test("mode démo : tout le parcours avec un chantier et des fournisseurs fictifs", async ({ page }) => {
  await signUp(page);
  await page.getByRole("button", { name: "Lancer la démonstration" }).click();
  await expect(page.getByRole("heading", { name: "Démo – Toiture Martin" })).toBeVisible();
  // La lecture part d'elle-même (§48), puis les questions de comptoir, puis la liste.
  await passQuestions(page);
  await expect(page.getByRole("region", { name: "Page des fournitures" })).toBeVisible();
  // §50.4 : le titre du chantier rouvre le devis de la démo.
  await expect(page.getByRole("button", { name: "Ouvrir le devis : Démo – Toiture Martin" })).toBeVisible();
  // Un exemple « potable » (retour du fondateur, 2026-10-04) : la liste est prête dès la lecture, rien à régler.
  const demoList = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(demoList.getByText(/lignes? à régler/)).toHaveCount(0);
  await expect(demoList.getByRole("img", { name: "à vérifier" })).toHaveCount(0);
  await expect(demoList.getByText("Embase plomb de sortie de toit")).toBeVisible();
  await page.getByRole("button", { name: "Envoyer au fournisseur" }).click();
  const apercu = page.getByRole("dialog", { name: "À qui j'envoie ?" });
  for (const name of ["Tuilerie de l'Ouest (démo)", "Négoce Breizh (démo)", "Matériaux Atlantique (démo)"]) {
    await apercu.getByRole("checkbox", { name: new RegExp(name.replace(/[()]/g, "\\$&")) }).check();
  }
  await apercu.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(page.getByRole("list", { name: "Tes fournisseurs" })).toBeVisible();

  const cards = page.getByRole("list", { name: "Tes fournisseurs" }).getByRole("listitem");
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
  await expect(page.getByRole("heading", { name: "Ton essai est terminé" })).toBeVisible();
  await expect(page.getByText("Continue à utiliser BatiClair pour lire tes devis et comparer tes fournisseurs.")).toBeVisible();
  const plans = page.getByRole("list", { name: "Formules" }).getByRole("listitem");
  await expect(plans).toHaveCount(2);
  await expect(plans.first()).toContainText("chantiers / mois");
  await plans.first().getByRole("button", { name: "Choisir cette formule" }).click();
  await expect(page.getByText(/Merci ! On te contacte très vite/)).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Ton essai est terminé")).toBeVisible();

  // Activation manuelle (tests, premiers clients) : un code, et c'est reparti.
  await page.goto("/formules");
  await page.getByRole("button", { name: "J'ai un code d'activation" }).click();
  await page.getByLabel("Code d'activation").fill("E2E-SOLO-CODE");
  await page.getByRole("button", { name: "Activer" }).click();
  await expect(page.getByText("Ta formule actuelle")).toBeVisible();
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
  await expect(page.getByText("Ton compte et toutes ses données ont été supprimés.")).toBeVisible();
  // Plus de session : l'accueil renvoie vers la connexion.
  await page.goto("/");
  await expect(page).toHaveURL(/\/connexion/);
});

test("plusieurs logements : le chantier rangé par logement, puis le total à commander", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Résidence Les Pins", "SCI Les Pins", "4 allée des Pins, Vannes");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-electricien-logements.pdf"));
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

test("§48.4 et règle numéro un : questions au bouton seulement, avant le calcul ; rien d'absent du devis ; puis la main sur le document (§50.7)", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Toiture Kervella", "M. Kervella", "2 rue du Port, Lorient");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-questions-comptoir.pdf"));

  // ÉTAPE 3 : un seul écran, AU BOUTON : ni micro, ni zone de texte ici.
  const questions = page.getByRole("region", { name: "Les questions" });
  await expect(questions).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: /voix/ })).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  // §50.2 : une question par carte, groupées par ouvrage, sans explication ; la valeur prise par défaut est marquée. §49.4 :
  // les consommables ne sont jamais une liste d'articles proposés, seulement UNE question oui / non ; ici, non.
  await expect(questions.getByRole("heading", { level: 3 }).first()).toBeVisible();
  await expect(page.getByText(/Tout se règle ici|allers-retours|renseignée/)).toHaveCount(0);
  await expect(page.getByText("par défaut").first()).toBeVisible();
  const consommables = page.getByRole("region", { name: "Consommables" });
  await expect(consommables.getByText(/^Consommables de pose/)).toHaveCount(1);
  await consommables.getByRole("button", { name: "Non", exact: true }).click();
  await questions.getByRole("button", { name: "Espagne 1er choix" }).click();
  await expect(questions.getByRole("button", { name: "Espagne 1er choix" })).toHaveAttribute("aria-pressed", "true");
  await questions.getByRole("button", { name: /Je commande façonné/ }).click();
  await page.getByRole("button", { name: "Calculer ma liste", exact: true }).click();

  const list = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(list).toBeVisible({ timeout: 60_000 });
  // §48.4 : plus aucune question après la sortie de la liste.
  await expect(questions).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // RÈGLE NUMÉRO UN : ni suggestion, ni écran, ni liteaux, ni crochets que le devis n'écrit pas.
  await expect(list.getByRole("region", { name: "Suggestions" })).toHaveCount(0);
  await expect(list.getByText(/Écran|Liteaux|Pattes|Faîtage|égout/i)).toHaveCount(0);
  await expect(list.getByRole("button", { name: /Ardoises naturelles/ }).first()).toBeVisible();

  // §50.7 : plus de voix ; tout se fait à la main, sur le document même.
  await expect(page.getByText(/à la voix/i)).toHaveCount(0);
  // Un tap ouvre la ligne ; « Retirer de la liste » (ou le glissement à gauche) la retire.
  const ardoises = list.getByRole("listitem").filter({ hasText: /Ardoises naturelles/ }).first();
  await ardoises.getByRole("button", { name: /^Modifier : Ardoises naturelles/ }).click();
  await ardoises.getByRole("button", { name: "Retirer de la liste" }).click();
  await expect(list.getByRole("button", { name: /Ardoises naturelles/ })).toHaveCount(0);
  // Un tap sur le nom le corrige (« gouttière zinc demi-ronde rouge ») ; la quantité ne bouge pas.
  const gouttiere = list.getByRole("listitem").filter({ hasText: /Gouttière zinc demi-ronde/ }).first();
  await gouttiere.getByRole("button", { name: /^Modifier : Gouttière zinc demi-ronde/ }).click();
  await gouttiere.getByRole("button", { name: /^Modifier le nom : / }).click();
  await gouttiere.getByRole("textbox").fill("Gouttière zinc demi-ronde rouge");
  await gouttiere.getByRole("button", { name: "OK" }).click();
  await expect(list.getByRole("button", { name: /^(Modifier|Fermer) : Gouttière zinc demi-ronde rouge/ })).toBeVisible();
  await expect(list.getByText(/^20 ml$/).filter({ visible: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Les questions" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Liste des fournitures" }).getByRole("button", { name: /Ardoises naturelles/ })).toHaveCount(0);
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
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  await passQuestions(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(list).toBeVisible();

  // Par défaut, rien ne change : aucune case à cocher.
  await expect(list.getByRole("checkbox")).toHaveCount(0);
  await list.getByRole("button", { name: "Envoyer une sélection à un autre fournisseur" }).click();
  const boxes = list.getByRole("checkbox", { name: /^Envoyer à part : / });
  await expect(boxes.first()).toBeVisible();
  // Retour du fondateur (2026-10-10) : « je dois tout avoir de coché » : chaque ligne prête l'est d'office, on décoche.
  const ready = boxes.and(page.locator(":enabled"));
  const count = await ready.count();
  expect(count).toBeGreaterThan(2);
  for (let i = 0; i < count; i++) await expect(ready.nth(i)).toBeChecked();
  const bar = page.getByRole("region", { name: "Envoyer la sélection" });
  await expect(bar.getByText(`${count} lignes cochées`)).toBeVisible();
  // Retour du fondateur (2026-10-10) : « les fournisseurs cochés par défaut » : on décoche ceux qui ne reçoivent pas.
  const fournisseur = (name: string) => bar.getByRole("checkbox", { name: `Fournisseur : ${name}` });
  await expect(fournisseur("Point.P")).toBeChecked();
  await expect(fournisseur("Tuiles & Co")).toBeChecked();
  // Deux lignes, vers Point.P.
  for (let i = 2; i < count; i++) await ready.nth(i).uncheck();
  await expect(bar.getByText("2 lignes cochées")).toBeVisible();
  await fournisseur("Tuiles & Co").uncheck();
  await bar.getByRole("button", { name: "Envoyer" }).click();
  // Elles restent dans la liste, en gris « Envoyé », et les cases disparaissent.
  await expect(list.getByText("Envoyé · Point.P")).toHaveCount(2);
  await expect(list.getByRole("checkbox")).toHaveCount(0);

  // Retour du fondateur (2026-10-10) : « il pourra envoyer le reste de la fourniture vers un autre fournisseur ; un devis peut
  // contenir des matériaux qui se trouvent chez plusieurs fournisseurs ». La liste dit la répartition et ce qui reste.
  const reparti = list.getByRole("region", { name: "Commande répartie" });
  await expect(reparti.getByText("Point.P · 2 lignes")).toBeVisible();
  // « Envoyer le reste » : seules les lignes pas encore envoyées sont cochées ; Point.P, qui a déjà sa part, ne l'est plus.
  await reparti.getByRole("button", { name: /^Envoyer le reste/ }).click();
  await expect(bar.getByText(`${count - 2} ligne${count - 2 > 1 ? "s" : ""} cochée${count - 2 > 1 ? "s" : ""}`)).toBeVisible();
  await expect(fournisseur("Point.P")).not.toBeChecked();
  await expect(fournisseur("Tuiles & Co")).toBeChecked();
  for (let i = 0; i < count; i++) if (i !== 2) await ready.nth(i).uncheck();
  await bar.getByRole("button", { name: "Envoyer" }).click();
  await expect(list.getByText("Envoyé · Tuiles & Co")).toHaveCount(1);
  await expect(list.getByText("Envoyé · Point.P")).toHaveCount(2);
  await expect(reparti.getByText("Tuiles & Co · 1 ligne", { exact: true })).toBeVisible();

  // « Je dois aussi pouvoir en ajouter » : un fournisseur qui n'est pas au carnet s'ajoute ici, sans quitter la liste.
  await list.getByRole("button", { name: "Envoyer une sélection à un autre fournisseur" }).click();
  await bar.getByRole("button", { name: "Ajouter un fournisseur" }).click();
  await bar.getByLabel("Nom du fournisseur").fill("Négoce Test");
  await bar.getByLabel("E-mail du fournisseur").fill("devis@example.com");
  await bar.getByRole("button", { name: "Ajouter", exact: true }).click();
  // Ajouté et coché d'office, avec les autres ; on ne garde que lui.
  await expect(fournisseur("Négoce Test")).toBeChecked();
  await fournisseur("Point.P").uncheck();
  await fournisseur("Tuiles & Co").uncheck();
  await bar.getByRole("button", { name: "Envoyer" }).click();
  await expect(list.getByText("Envoyé · Négoce Test").first()).toBeVisible();

  // L'envoi normal n'a pas bougé : toute la liste, d'un coup, au fournisseur habituel.
  await expect(list.getByRole("button", { name: "Envoyer au fournisseur" })).toBeVisible();
  await expect(list.getByRole("button", { name: "Voir la demande envoyée" })).toHaveCount(0);
});

test("§49.8 : sur chaque ligne, un ✓ pour valider sans l'ouvrir, et un crayon pour la modifier", async ({ page }) => {
  // Retour du fondateur (2026-10-10, capture iPhone) : « pouvoir cliquer directement sur un bouton pour valider, ligne par
  // ligne. Et un crayon pour modifier. »
  await signUp(page);
  await createProject(page, "Toiture Kerjean", "M. Kerjean", "5 rue du Port, Douarnenez");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-questions-comptoir.pdf"));
  await passQuestions(page);
  await openList(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  const valider = list.getByRole("button", { name: /^Valider : / });
  const start = await valider.count();
  expect(start).toBeGreaterThan(0);
  const name = (await valider.first().getAttribute("aria-label"))!.replace(/^Valider : /, "");
  await valider.first().click();
  await settle(page);
  // La ligne passe au vert sans s'être ouverte.
  await expect(list.getByRole("group", { name: /^Ligne ouverte : / })).toHaveCount(0);
  await expect(list.getByRole("button", { name: `Valider : ${name}`, exact: true })).toHaveCount(0);
  // Le crayon ouvre la ligne (nom, quantité, choix).
  const crayon = list.getByRole("button", { name: /^Modifier la ligne : / }).first();
  await crayon.click();
  const ouverte = list.getByRole("group", { name: /^Ligne ouverte : / });
  await expect(ouverte).toHaveCount(1);
  // Retour du fondateur (2026-10-10) : « on ne comprend pas comment la fermer ». Le crayon devient une croix, et la ligne
  // ouverte a son bouton « Fermer » en bas.
  await ouverte.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(ouverte).toHaveCount(0);
  await list.getByRole("button", { name: /^Modifier la ligne : / }).first().click();
  await expect(ouverte).toHaveCount(1);
  await list.getByRole("button", { name: /^Fermer la ligne : / }).click();
  await expect(ouverte).toHaveCount(0);
});

test("§50.7 : en bas, deux boutons figés : l'aperçu (le mail et le PDF du fournisseur) et l'envoi", async ({ page }) => {
  // Retour du fondateur (2026-10-10) : « deux boutons flottants d'actions en bas (figé), un pour l'envoi et l'autre pour
  // prévisualiser le PDF et le mail envoyé ».
  await signUp(page);
  await createProject(page, "Toiture Kerjean", "M. Kerjean", "5 rue du Port, Douarnenez");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-questions-comptoir.pdf"));
  await passQuestions(page);
  await confirmDoubts(page);
  const actions = page.getByRole("group", { name: "Envoyer la liste" });
  // Figés en bas : visibles dès le haut du document, sans descendre.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(actions.getByRole("button", { name: "Aperçu" })).toBeInViewport();
  await expect(actions.getByRole("button", { name: "Envoyer au fournisseur" })).toBeInViewport();
  // L'aperçu : l'objet et le mail mot pour mot, et le PDF joint qui s'ouvre dans BatiClair. Rien ne part.
  await actions.getByRole("button", { name: "Aperçu" }).click();
  const apercu = page.getByRole("dialog", { name: "Ce que reçoit le fournisseur" });
  await expect(apercu.getByText("Objet :")).toBeVisible();
  await expect(apercu.getByText(/Toiture Kerjean/).first()).toBeVisible();
  await apercu.getByRole("button", { name: "Voir le PDF" }).click();
  const pdf = page.getByRole("dialog", { name: "Le PDF joint" });
  await expect(pdf.getByRole("button", { name: "Fermer le document" })).toBeVisible();
  // Le PDF est arrivé (le même générateur que celui du fournisseur) : il se télécharge.
  await expect(pdf.getByRole("link", { name: "Télécharger" })).toBeVisible();
  await pdf.getByRole("button", { name: "Fermer le document" }).click();
  // Depuis l'aperçu, l'envoi : on choisit à qui.
  await apercu.getByRole("button", { name: "Envoyer au fournisseur" }).click();
  await expect(page.getByRole("dialog", { name: "À qui j'envoie ?" })).toBeVisible();
});

test("§50.7 : les deux boutons du bas sont là même s'il reste des lignes orange", async ({ page }) => {
  // Retour du fondateur (2026-10-10, capture iPhone) : « je ne vois toujours pas les deux boutons flottants ici » : la liste
  // avait encore des lignes orange. Les boutons sont toujours là ; l'aperçu montre ce qui partirait, et « Envoyer » mène
  // d'abord à la première ligne à régler (rien ne part avec une ligne orange).
  await signUp(page);
  await createProject(page, "Toiture Kerjean", "M. Kerjean", "5 rue du Port, Douarnenez");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-questions-comptoir.pdf"));
  await passQuestions(page);
  await openList(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(list.getByRole("img", { name: "à vérifier" }).first()).toBeVisible();
  const actions = page.getByRole("group", { name: "Envoyer la liste" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(actions.getByRole("button", { name: "Aperçu" })).toBeInViewport();
  await expect(actions.getByRole("button", { name: "Envoyer au fournisseur" })).toBeInViewport();
  // « Envoyer » : rien ne part, la phrase dit pourquoi et la première ligne orange vient à l'écran.
  await actions.getByRole("button", { name: "Envoyer au fournisseur" }).click();
  await expect(page.getByRole("dialog", { name: "À qui j'envoie ?" })).toHaveCount(0);
  await expect(actions.getByRole("status")).toHaveText(/^Règle d'abord \d+ lignes? orange\.$/);
  await expect(list.getByRole("listitem").filter({ has: page.getByRole("img", { name: "à vérifier" }) }).first()).toBeInViewport();
  // L'aperçu, lui, s'ouvre tout de suite : le mail et le PDF tels qu'ils partiraient.
  await actions.getByRole("button", { name: "Aperçu" }).click();
  const apercu = page.getByRole("dialog", { name: "Ce que reçoit le fournisseur" });
  await expect(apercu.getByText("Objet :")).toBeVisible();
  await apercu.getByRole("button", { name: "Voir le PDF" }).click();
  const pdf = page.getByRole("dialog", { name: "Le PDF joint" });
  await expect(pdf.getByRole("link", { name: "Télécharger" })).toBeVisible();
});

test("§50.7 : une ligne ouverte passe au premier plan, le reste flouté ; un tap à côté la referme", async ({ page }) => {
  // Retour du fondateur (2026-10-11, capture iPhone) : « quand on ouvre une case, c'est pas terrible visuellement ; floute le
  // reste pour rendre plus lisible et visible la case ouverte ».
  await signUp(page);
  await createProject(page, "Toiture Kerjean", "M. Kerjean", "5 rue du Port, Douarnenez");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-questions-comptoir.pdf"));
  await passQuestions(page);
  await openList(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  // « Envoyer au fournisseur » tient sur une ligne, même sur un iPhone étroit (375 px).
  await page.setViewportSize({ width: 375, height: 812 });
  const envoyer = page.getByRole("group", { name: "Envoyer la liste" }).getByRole("button", { name: "Envoyer au fournisseur" });
  expect((await envoyer.boundingBox())!.height).toBeLessThan(60);
  await list.getByRole("button", { name: /^Modifier la ligne : / }).first().click();
  const ouverte = list.getByRole("group", { name: /^Ligne ouverte : / });
  await expect(ouverte).toHaveCount(1);
  const voile = page.getByRole("button", { name: "Fermer la ligne ouverte" });
  await expect(voile).toBeVisible();
  await expect(voile).toHaveCSS("backdrop-filter", /blur/);
  // La ligne ouverte est AU-DESSUS du voile : un tap en son milieu la touche, elle.
  const box = (await ouverte.boundingBox())!;
  const dessus = await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.closest("[aria-label^='Ligne ouverte']") !== null, [box.x + box.width / 2, box.y + box.height / 2]);
  expect(dessus).toBe(true);
  // Un tap sur le flou, à côté, la referme.
  await voile.click({ position: { x: 10, y: 10 } });
  await expect(ouverte).toHaveCount(0);
  await expect(voile).toHaveCount(0);
});

test("§49.8 : une info qui manque se demande en clair sur la ligne qu'elle concerne, avec ses boutons", async ({ page }) => {
  // Retour du fondateur (2026-10-11, capture iPhone) : « Liteaux 27×40, Section à préciser : je ne sais pas quoi faire. On
  // doit comprendre sans réfléchir. » Ce qui manquait aux liteaux était dit aussi sur les tuiles, et sa question vivait sur
  // la carte des tuiles : celle des liteaux, ouverte, était vide.
  await signUp(page);
  await createProject(page, "Toiture Kerjean", "M. Kerjean", "5 rue du Port, Douarnenez");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-canal-manque.pdf"));
  // Les questions au premier bouton, sauf le traitement des liteaux : laissé sans réponse, il revient sur la ligne, orange.
  const questions = page.getByRole("region", { name: "Les questions" });
  await expect(questions).toBeVisible({ timeout: 60_000 });
  const cards = questions.getByRole("listitem");
  for (let i = 0; i < (await cards.count()); i++) {
    const card = cards.nth(i);
    if (/traitement/i.test((await card.textContent()) ?? "")) continue;
    await card.getByRole("button").filter({ hasNotText: /^Autre$/ }).first().click();
  }
  await page.getByRole("button", { name: /^Calculer ma liste/ }).click();
  await expect(page.getByRole("region", { name: "Page des fournitures" })).toBeVisible({ timeout: 60_000 });
  await openList(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  const liteaux = list.getByRole("listitem").filter({ hasText: /^Liteaux/ }).first();
  const tuiles = list.getByRole("listitem").filter({ hasText: /^Tuiles Canal/ }).first();
  await expect(liteaux.getByText("Traitement à préciser")).toBeVisible();
  // La tuile n'a pas à dire ce qui manque aux liteaux.
  await expect(tuiles.getByText("Traitement à préciser")).toHaveCount(0);
  await liteaux.getByRole("button", { name: /^Modifier la ligne : / }).click();
  // La question, en toutes lettres, et ses réponses : rien à deviner.
  const question = liteaux.getByRole("group", { name: "Traitement des liteaux" });
  await expect(question.getByText("Traitement des liteaux ?")).toBeVisible();
  await question.getByRole("button", { name: "Classe 2" }).click();
  await settle(page);
  await expect(list.getByText("Traitement à préciser")).toHaveCount(0);
});

test("§49.8 : un tap refusé par le serveur se dit DANS la ligne ouverte, jamais en silence", async ({ page }) => {
  // Retour du fondateur (2026-10-10, capture iPhone) : « Quand je clique sur un bouton, rien ne se passe. »
  await signUp(page);
  await createProject(page, "Toiture Kerjean", "M. Kerjean", "5 rue du Port, Douarnenez");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-questions-comptoir.pdf"));
  await passQuestions(page);
  await openList(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  const orange = list.getByRole("listitem").filter({ has: page.getByRole("img", { name: "à vérifier" }) }).first();
  const card = await openRow(orange);
  await page.route(/\/v1\/quantitatifs\/[^/]+\/(reponses|corrections)/, (route) =>
    route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: { code: "conflict", message: "Cette liste a changé, recharge la page.", retryable: false } }) }),
  );
  await card.getByRole("button").first().click();
  await expect(orange.getByRole("alert")).toBeVisible();
});

test("§49.8 : chaque ligne orange passe au vert dans sa carte, un geste par ligne, sans quitter la liste", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Toiture Kerjean", "M. Kerjean", "5 rue du Port, Douarnenez");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-questions-comptoir.pdf"));
  // Les questions de comptoir laissées sans réponse : leurs lignes sortent orange « Info manquante ».
  await passQuestions(page);
  await openList(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  const url = page.url();
  // Plus de bouton vers un autre écran.
  await expect(list.getByRole("button", { name: /^Vérifier/ })).toHaveCount(0);
  // §50.7 : une ligne orange garde son point et sa raison, sans carte dépliée ; un tap l'ouvre, un geste la règle.
  const oranges = list.getByRole("listitem").filter({ has: page.getByRole("img", { name: "à vérifier" }) });
  const start = await oranges.count();
  expect(start).toBeGreaterThan(0);
  await expect(list.getByRole("group", { name: /^Régler : / })).toHaveCount(0);
  // La raison en entier, jamais coupée par « … ».
  for (const li of await oranges.all()) expect(await li.innerText()).not.toContain("…");

  // Un geste par ligne : une réponse peut faire naître une ligne (« Je façonne » → la bobine) ; elle compte pour une.
  const seen = new Set<string>();
  let gestures = 0;
  let choices = 0;
  while ((await oranges.count()) > 0 && gestures < 20) {
    const card = await openRow(oranges.first());
    seen.add((await card.getAttribute("aria-label"))!);
    const asks = card.getByRole("group");
    // Un choix à faire : un tap sur un bouton, la ligne se recalcule. Plusieurs valeurs par défaut : « C'est bon » les
    // confirme d'un coup. Un écart : « Garder ».
    if ((await asks.count()) === 1) {
      await asks.getByRole("button").first().click();
      choices++;
    } else await card.getByRole("button", { name: /^(Garder|C'est bon|Oui)/ }).first().click();
    gestures++;
    await settle(page);
    // Jamais un autre écran : pas de fenêtre, pas de changement d'adresse.
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(page.url()).toBe(url);
  }
  expect(gestures).toBe(seen.size);
  expect(choices).toBeGreaterThan(0);
  await expect(list.getByRole("img", { name: "à vérifier" })).toHaveCount(0);
  await expect(list.getByRole("button", { name: "Envoyer au fournisseur" })).toBeVisible();
});

test("une lecture refusée au départ se dit, avec sa raison et « Réessayer » : jamais d'analyse sans fin", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Toiture Le Goff", "M. Le Goff", "4 rue du Port, Paimpol");
  // Le serveur refuse le lancement (ici : trop d'essais en une heure).
  let refused = 0;
  await page.route(/\/v1\/quantitatifs\?ecran=1$/, async (route) => {
    if (route.request().method() !== "POST" || refused > 0) return route.fallback();
    refused++;
    await route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: { code: "too_many_requests", message: "Too many requests, retry later" } }) });
  });
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  // §50.1 : la raison en une phrase, et « Réessayer ».
  await expect(page.getByRole("alert").filter({ hasText: "Trop d'essais en peu de temps" })).toBeVisible({ timeout: 30_000 });
  // « Réessayer » relance la lecture, qui passe cette fois.
  await page.getByRole("button", { name: "Réessayer" }).click();
  await passQuestions(page);
  expect(refused).toBe(1);
});

test("§48.6 zinguerie pièce par pièce, et la barre des lignes orange reste en haut sans rien cacher", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Toiture Le Goff", "M. Le Goff", "4 rue du Port, Paimpol");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-zinguerie.pdf"));
  const questions = page.getByRole("region", { name: "Les questions" });
  await expect(questions).toBeVisible({ timeout: 60_000 });
  // Une question par pièce écrite, à son nom ; jamais « Bandes zinc (solin, rive, égout…) : tu façonnes ? ».
  await expect(questions.getByText("Bande de ventilation en Z en zinc quartz : tu façonnes toi-même ou tu commandes façonné ?")).toBeVisible();
  await expect(questions.getByText("Bande de rive zinc quartz dév. 200 : tu façonnes toi-même ou tu commandes façonné ?")).toBeVisible();
  await expect(questions.getByText(/Bandes zinc \(solin/)).toHaveCount(0);
  // « Dév. 200 » est écrit : jamais redemandé.
  await expect(questions.getByText(/^Bande de rive .*développé/)).toHaveCount(0);
  // §49.4 : le façonnage de chaque pièce est obligatoire ici ; sans lui, pas de calcul (jamais une pièce sans réponse dans la liste).
  await page.getByRole("button", { name: "Calculer ma liste", exact: true }).click();
  await expect(questions).toBeVisible();
  await expect(page.getByRole("region", { name: "Liste des fournitures" })).toHaveCount(0);
  const faconne = questions.getByRole("button", { name: /^Je façonne/ });
  for (let i = 0; i < (await faconne.count()); i++) await faconne.nth(i).click();
  await page.getByRole("button", { name: /^Calculer ma liste/ }).click();
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(list).toBeVisible({ timeout: 60_000 });
  // Plus de bulle flottante : une barre fine, collée en haut de l'écran quand on descend dans la liste.
  // §50.3 : « N lignes à régler », rien d'autre (plus de « Tout est bon »).
  const bar = list.getByRole("status").filter({ hasText: /^\d+ lignes? à régler$/ });
  await expect(bar.getByRole("button")).toHaveCount(0);
  await expect(bar).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await expect.poll(async () => (await bar.boundingBox())?.y ?? 999).toBeLessThan(40);
  expect((await bar.boundingBox())!.height).toBeLessThan(64);
});

test("rien ne part vide : un devis où je ne lis aucune ligne se dit en une phrase, avec « Réessayer », jamais un bouton d'envoi", async ({ page }) => {
  await signUp(page);
  await page.goto("/chantiers/nouveau");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-vide.pdf"));
  // §50.1 : en cas d'échec, la raison en une phrase et « Réessayer », rien d'autre.
  const failure = page.getByRole("region", { name: "Lecture du devis" });
  await expect(failure.getByText("Je n'ai rien lu dans ce devis.")).toBeVisible({ timeout: 60_000 });
  await expect(failure.getByRole("button")).toHaveText(["Réessayer"]);
  await expect(page.getByRole("button", { name: /Envoyer au fournisseur/ })).toHaveCount(0);
  // Un devis déposé par erreur se retire depuis le menu du chantier ; le chantier attend un autre PDF.
  await page.getByRole("button", { name: "Plus d'actions sur le chantier" }).click();
  await page.getByRole("menuitem", { name: "Retirer le devis" }).click();
  await page.getByRole("button", { name: "Oui, retirer" }).click();
  await expect(page.getByLabel("Déposer mon devis")).toBeAttached({ timeout: 20_000 });
});

test("§50 : trois écrans, et rien de ce que le §50.4 a retiré", async ({ page }) => {
  const banned = [/L'IA peut se tromper/, /coupes/, /Info manquante/, /\d+ fournitures? ·/, /À vérifier \(/, /C'est bon \(/, /Tout est bon/, /Corriger le devis lu/, /Une mesure mal lue/];
  const clean = async () => {
    const text = await page.locator("main").innerText();
    for (const b of banned) expect(text, String(b)).not.toMatch(b);
    await expect(page.getByRole("button", { name: /^Corriger/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^(Ouvrir|Supprimer) devis/ })).toHaveCount(0);
  };
  await signUp(page);
  await page.goto("/chantiers/nouveau");
  // 1. Un bouton.
  await expect(page.getByText("Déposer mon devis", { exact: true })).toBeVisible();
  await clean();
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-questions-comptoir.pdf"));
  // 2. Les questions : une par carte, en boutons, groupées par ouvrage, puis « Calculer ma liste ».
  const questions = page.getByRole("region", { name: "Les questions" });
  await expect(questions).toBeVisible({ timeout: 60_000 });
  await clean();
  await expect(questions.getByRole("heading", { level: 3 }).first()).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  // Le façonnage est obligatoire (48.6) ; le reste peut rester sans réponse.
  await questions.getByRole("button", { name: /^Je commande façonné/ }).click();
  await page.getByRole("button", { name: "Calculer ma liste", exact: true }).click();
  // 3. Ma liste : les oranges d'abord, chaque raison en cinq mots au plus ; un seul bouton d'envoi, deux liens dessous.
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(list).toBeVisible({ timeout: 60_000 });
  await clean();
  const cards = list.getByRole("list", { name: "Fournitures" }).locator(":scope > li");
  const n = await cards.count();
  let greenSeen = false;
  for (let i = 0; i < n; i++) {
    const orange = (await cards.nth(i).getByRole("img", { name: "à vérifier" }).count()) > 0;
    if (!orange) greenSeen = true;
    // Les oranges en premier : jamais une orange après une verte.
    else expect(greenSeen, `orange après une verte (carte ${i + 1})`).toBe(false);
  }
  await expect(list.getByRole("status").filter({ hasText: /^\d+ lignes? à régler$/ })).toBeVisible();
  const links = list.getByRole("navigation", { name: "Autres gestes sur la liste" }).getByRole("button");
  await expect(links).toHaveText(["Ajouter un article", "Envoyer une sélection à un autre fournisseur"]);

  // §50.7 : l'écran 3 est le document : « Ton chantier », le chantier en bref, puis la liste ; aucune voix.
  await expect(list.getByRole("heading", { name: "Ton chantier" })).toBeVisible();
  await expect(list.getByRole("region", { name: "Le chantier en bref" })).toBeVisible();
  await expect(page.getByText(/à la voix/i)).toHaveCount(0);
  // Une ligne orange garde son point et sa raison sur la ligne, sans carte dépliée : ses boutons n'existent qu'ouverte.
  await expect(list.getByRole("group", { name: /^Régler : / })).toHaveCount(0);
  const first = cards.first();
  await first.getByRole("button", { name: /^Modifier : / }).click();
  await expect(first.getByRole("group", { name: /^Régler : / })).toBeVisible();
  await expect(first.getByRole("button", { name: "Retirer de la liste" })).toBeVisible();
  // Une ligne du bref se corrige d'un tap, sur le document même.
  await closeOpenLine(page);
  const bref = list.getByRole("region", { name: "Le chantier en bref" });
  const line = bref.getByRole("button", { name: /^Modifier le bref : / }).first();
  await line.click();
  await bref.getByRole("textbox").fill("Couverture de la maison principale");
  await bref.getByRole("button", { name: "OK" }).click();
  // §51 : une ligne de la fiche garde son nom (« Ouvrage : … ») ; la valeur réécrite est celle de l'artisan.
  await expect(bref.getByRole("button", { name: /^Modifier le bref : (?:[^:]+ : )?Couverture de la maison principale$/ })).toBeVisible();
  // « Envoyer au fournisseur » ne montre plus d'aperçu : seulement « À qui j'envoie ? ».
  await confirmDoubts(page);
  await list.getByRole("button", { name: "Envoyer au fournisseur" }).click();
  const sheet = page.getByRole("dialog", { name: "À qui j'envoie ?" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("article", { name: "Demande de devis" })).toHaveCount(0);
  await expect(page.getByText("Ce que le fournisseur va recevoir", { exact: false })).toHaveCount(0);
});

test("§49.9 : une ligne nomme une fourniture ; les heures et le forfait sont repliés sous « lignes sans fourniture »", async ({ page }) => {
  await signUp(page);
  await page.goto("/chantiers/nouveau");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-reparation.pdf"));
  await passQuestions(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(list.getByText(/^Tuile terre cuite mécanique/).first()).toBeVisible();
  // Jamais dans la liste : « Repositionnement des tuiles · 1,5 h », « Accès toiture… · 1 fft ».
  await expect(list.getByRole("listitem").filter({ hasText: "Repositionnement" })).toHaveCount(0);
  const folded = list.getByText("2 lignes sans fourniture");
  await expect(folded).toBeVisible();
  await expect(list.getByRole("list", { name: "Lignes sans fourniture" })).toBeHidden();
  await folded.click();
  const without = list.getByRole("list", { name: "Lignes sans fourniture" });
  await expect(without).toContainText("Repositionnement des tuiles");
  await expect(without).toContainText("1,5 h");
  await expect(without).toContainText("Accès toiture et mise en sécurité");
});

test("§50.2 : « Calculer ma liste » reste collé en bas de l'écran, même après avoir écrit sous « Autre »", async ({ page }) => {
  // Retour du fondateur (2026-10-10, capture iPhone) : le bouton flottait au milieu de l'écran, des cartes passaient dessous.
  // Sur iPhone, un élément « position: fixed » reste coincé à la hauteur du clavier une fois celui-ci refermé : la barre est
  // « sticky », comme celle de la liste, et suit la page.
  await signUp(page);
  await createProject(page, "Toiture Kerjean", "M. Kerjean", "5 rue du Port, Douarnenez");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-questions-comptoir.pdf"));
  const questions = page.getByRole("region", { name: "Les questions" });
  await expect(questions).toBeVisible({ timeout: 60_000 });
  const pente = questions.getByRole("group", { name: "Pente du toit ?" });
  await pente.getByRole("button", { name: "Autre", exact: true }).click();
  await pente.getByLabel("Autre valeur : Pente du toit ?").fill("38");
  await pente.getByRole("button", { name: "OK" }).click();
  const calculer = page.getByRole("button", { name: "Calculer ma liste", exact: true });
  const bar = page.getByRole("group", { name: "Calculer ma liste" });
  await expect(bar).toHaveCSS("position", "sticky");
  // En haut de la page : collé en bas de l'écran, rien ne passe sous la barre.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(calculer).toBeInViewport();
  const box = (await bar.boundingBox())!;
  expect(Math.abs(box.y + box.height - page.viewportSize()!.height)).toBeLessThan(2);
  // Tout en bas : toujours là, sous la dernière question.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(calculer).toBeInViewport();
});

test("Autre : quand la bonne réponse n'est pas dans les boutons, elle s'écrit (une pente de 38°)", async ({ page }) => {
  await signUp(page);
  await page.goto("/chantiers/nouveau");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-questions-comptoir.pdf"));
  const questions = page.getByRole("region", { name: "Les questions" });
  await expect(questions).toBeVisible({ timeout: 60_000 });
  // Retour du fondateur (2026-10-10) : une valeur à boutons a aussi « Autre », qui laisse écrire.
  const pente = questions.getByRole("group", { name: "Pente du toit ?" });
  await pente.getByRole("button", { name: "Autre", exact: true }).click();
  await pente.getByLabel("Autre valeur : Pente du toit ?").fill("38");
  await pente.getByRole("button", { name: "OK" }).click();
  await expect(pente.getByLabel("Autre valeur : Pente du toit ?")).toHaveValue("38");
  // §51.4 : le façonnage a aussi « Autre » ; ce qui s'y écrit est relu (§51.2). Les consommables (oui / non), non.
  const faconnage = questions.getByRole("group", { name: /façonnes/i }).first();
  await expect(faconnage.getByRole("button", { name: "Autre", exact: true })).toHaveCount(1);
  await faconnage.getByRole("button", { name: /^Je commande façonné/ }).click();
  // Une qualité qui se nomme (l'ardoise) : « Autre » laisse écrire la sienne, qui part telle quelle dans la désignation.
  const ardoise = questions.getByRole("group", { name: /^Quelle ardoise/ });
  await ardoise.getByRole("button", { name: "Autre", exact: true }).click();
  await ardoise.getByLabel(/^Autre : Quelle ardoise/).fill("Ardoise d'Angers");
  await ardoise.getByRole("button", { name: "OK" }).click();
  await page.getByRole("button", { name: "Calculer ma liste", exact: true }).click();
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(list).toBeVisible({ timeout: 60_000 });
  await expect(list.getByText(/Ardoise d'Angers/).first()).toBeVisible();
});
