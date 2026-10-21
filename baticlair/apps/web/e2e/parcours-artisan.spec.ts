import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";

/** Adresse unique par exécution : les tests ne dépendent pas de l'état de la base. */
/** Photo minimale (1 px, PNG valide). */
const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function signUp(page: Page, email = `artisan-${unique()}@example.fr`) {
  await page.goto("/");
  // Sans session : la page publique, puis « Créer un compte » mène à l'inscription.
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tes devis deviennent tes bons de commande");
  await page.getByRole("link", { name: "Créer un compte" }).first().click();
  await expect(page).toHaveURL(/\/inscription/);
  await page.getByLabel("Prénom et nom").fill("Jean Martin");
  await page.getByLabel("Nom de ton entreprise").fill("Toitures Martin");
  // Seule question métier : un appui (ici un couvreur).
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  // Bloc 6 : la case CGU est obligatoire ; cochée, l'acceptation est enregistrée avec le compte.
  await expect(page.getByRole("button", { name: "Créer mon compte" })).toBeDisabled();
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
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
  return id!;
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
  // §52 (mission du fondateur, 2026-10-19) : « Métiers couverts », l'état de chaque métier. FRICTIONS : la liste est
  // repliée derrière « Voir les N métiers ».
  await page.getByText(/^Voir les \d+ métiers$/).click();
  const metiers = page.getByRole("list", { name: "Métiers couverts" });
  await expect(metiers.getByRole("listitem").filter({ hasText: "Couverture" }).first()).toContainText("Relu par un artisan");
  await expect(metiers.getByRole("listitem").filter({ hasText: "Électricité" }).first()).toContainText("En validation");
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

test("2026-10-12 : sur téléphone, la barre du menu reste figée en bas de chaque page, et le bas de page ne passe jamais dessous", async ({ page }, info) => {
  test.skip(info.project.name !== "telephone", "la barre flottante est celle du téléphone");
  await signUp(page);
  await createProject(page, "Toiture Barre", "M. Barre", "3 rue du Port, Brest");
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  const viewport = page.viewportSize()!;
  for (const path of ["/", "/chantiers", "/fournisseurs", "/compte", "/chantiers/nouveau"]) {
    await page.goto(path);
    await expect(nav).toBeVisible();
    for (const scroll of ["haut", "bas"] as const) {
      await page.evaluate((s) => window.scrollTo(0, s === "bas" ? document.documentElement.scrollHeight : 0), scroll);
      await page.waitForTimeout(300);
      const box = (await nav.boundingBox())!;
      // Ancrée au bas de l'écran : le bas de la barre touche le bas de la fenêtre, jamais au milieu (capture du fondateur).
      expect(Math.abs(box.y + box.height - viewport.height), `${path}, ${scroll} : la barre est à ${Math.round(box.y)} px`).toBeLessThanOrEqual(1);
      const pill = (await nav.locator("> div").boundingBox())!;
      expect(pill.y, `${path} : la barre reste en bas`).toBeGreaterThan(viewport.height - 120);
      if (scroll === "bas") {
        // Le dernier contenu de la page s'arrête au-dessus de la barre.
        const last = await page.evaluate(() => {
          // Le contenu d'un <details> replié garde une boîte dans Chromium sans être affiché : on l'ignore.
          const els = [...document.querySelectorAll("main *")].filter((e) => (e as HTMLElement).offsetParent !== null && e.getBoundingClientRect().height > 0 && !e.closest("details:not([open]) > :not(summary)"));
          return Math.max(...els.map((e) => e.getBoundingClientRect().bottom));
        });
        expect(last, `${path} : le bas de page passe sous la barre`).toBeLessThanOrEqual(pill.y);
      }
    }
  }
});

test("le menu ne propose que l'essentiel : accueil, chantiers, fournisseurs, compte", async ({ page }) => {
  await signUp(page);
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  // Quatre rubriques (cinq avec le groupé, allumé dans les parcours), et au centre le « + » : un nouveau chantier, directement.
  await expect(nav.getByRole("link")).toHaveText(["Accueil", "Chantiers", "Groupé", "Nouveau chantier", "Fournisseurs", "Compte"]);
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
  // Le fichier entier, celui que « Télécharger » enregistre (le PDF s'affiche page par page, en entier).
  const size = await viewer.getByRole("link", { name: "Télécharger" }).evaluate(async (a) => (await (await fetch((a as HTMLAnchorElement).href)).blob()).size);
  expect(size).toBe(heavy.byteLength);
  await viewer.getByRole("button", { name: "Fermer le document" }).click();
});

test("un couvreur fait préparer sa liste de matériaux par l'IA, la corrige et la valide", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Toiture Morel", "Mme Morel", "3 impasse des Lilas, Lorient");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  // IA simulée en test (AI_PROVIDER=fake) : même parcours, aucun appel payant. La lecture part d'elle-même (§48).
  await passQuestions(page);

  // §51.5 : les crochets en paquets partent tels qu'écrits ; jamais « combien par paquet » (§49.4 : rien sur une donnée écrite).
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
  await expect(pointp.getByText("6/7 articles chiffrés")).toBeVisible();
  await expect(tuiles.getByText("5/7 articles chiffrés · 2 manquants")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Comparer les/ })).toHaveCount(0);
  await expect(page.getByText(/analyse/i)).toHaveCount(0);
  await page.reload();
  await expect(tuiles.getByText("5/7 articles chiffrés · 2 manquants")).toBeVisible();
  // Le détail lu reste accessible, au second plan.
  await menu(tuiles, "Voir les lignes de son devis");
  await expect(tuiles.getByText("Livraison chantier")).toBeVisible();

  // Choisir : ce qui est vraiment chiffré d'un côté, l'estimation de l'autre ; une offre incomplète n'est jamais « la moins chère ».
  const compare = page.locator("section#comparer");
  await expect(compare.getByRole("heading", { name: "Choisir un fournisseur" })).toBeVisible();
  const offers = compare.getByRole("list", { name: "Offres" }).getByRole("listitem");
  // Les naissances (calculées, §49.1 point 3) ne sont chiffrées par personne : aucune offre n'est complète, aucune n'est « la moins chère ».
  const pointpOffer = offers.filter({ hasText: "Point.P Vannes" });
  await expect(pointpOffer).toContainText("2 805,30 €");
  await expect(pointpOffer.getByText("⚠️ 1 article manquant")).toBeVisible();
  await expect(compare.getByText("Le moins cher des offres complètes")).toHaveCount(0);
  const tuilesOffer = offers.filter({ hasText: "Tuiles & Co" });
  await expect(tuilesOffer.getByText(/2\s213,20\s€/)).toBeVisible();
  await expect(tuilesOffer.getByText("chiffrés")).toBeVisible();
  await expect(tuilesOffer.getByText("⚠️ 2 articles manquants")).toBeVisible();
  await expect(tuilesOffer.getByText(/Total estimé avec les articles manquants : 2\s724,40\s€/)).toBeVisible();
  await expect(tuilesOffer.getByText(/Livraison 60,00\s€/)).toBeVisible();
  await expect(tuilesOffer.getByText(/moins cher/i)).toHaveCount(0);

  // « Retenir cette offre » : un geste, compris tout de suite.
  await pointpOffer.getByRole("button", { name: "Retenir cette offre" }).click();
  await expect(compare.getByRole("heading", { name: "Offre retenue" })).toBeVisible();
  await expect(pointpOffer.getByText("✓ Offre retenue")).toBeVisible();

  // §47.5 retour fournisseur : la commande passée, d'un tap ; « modifié » : le bon de commande collé.
  await expect(pointpOffer.getByText(/Tu as commandé chez .* : tel quel \?/)).toBeVisible();
  await pointpOffer.getByRole("button", { name: "Modifié" }).click();
  await pointpOffer.getByLabel(/Colle ton bon de commande/).fill("Tuile romane canal rouge : 1 200 u");
  await pointpOffer.getByRole("button", { name: "Enregistrer la commande" }).click();
  await expect(pointpOffer.getByText(/✓ Commande notée : \d+ écarts? avec la liste/)).toBeVisible();

  // Tout est conservé.
  await page.reload();
  await expect(pointp.getByText("6/7 articles chiffrés")).toBeVisible();
  await expect(page.locator("section#comparer").getByText("✓ Offre retenue")).toBeVisible();
  await expect(page.locator("section#comparer").getByText(/✓ Commande notée/)).toBeVisible();
});

test("plusieurs articles ajoutés à la main, sans unité : gardés tels qu'écrits, la liste part", async ({ page }) => {
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
  // §51.5 : une ligne écrite par l'artisan est une fourniture telle qu'écrite, sans décision ni carte orange ; rien n'est inventé.
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  for (const designation of ["Skimmer pour piscine liner", "Buse de refoulement", "Prise balai"]) {
    await expect(list.getByRole("listitem").filter({ hasText: designation }).first()).toBeVisible();
  }
  await expect(page.getByText("Articles que BatiClair ne connaît pas encore")).toHaveCount(0);
  await confirmDoubts(page);
  // Gardés tels qu'écrits, à la pièce : la ligne est verte, prête à partir.
  const skimmer = list.getByRole("listitem").filter({ hasText: "Skimmer pour piscine liner" }).first();
  await expect(skimmer.getByRole("img", { name: "sûr" })).toBeVisible();
  await page.reload();
  await openList(page);
  await expect(list.getByRole("listitem").filter({ hasText: "Skimmer pour piscine liner" }).first()).toBeVisible();
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

test("plusieurs logements : un devis d'électricien pièce par pièce donne la liste à commander", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Résidence Les Pins", "SCI Les Pins", "4 allée des Pins, Vannes");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-electricien-logements.pdf"));
  await passQuestions(page);
  // §52 : un devis d'un seul lot n'a pas de carte « Lots repérés ».
  await expect(page.getByRole("region", { name: "Lots repérés" })).toHaveCount(0);
  // §51.5 : la lecture ne porte plus les titres de logement de l'ancien extracteur ; la liste est celle du devis, dans son ordre.
  await expect(page.getByRole("tab", { name: /Par logement/ })).toHaveCount(0);
  await openList(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(list.getByRole("listitem").filter({ hasText: "Prise 2P+T 16 A" }).first()).toBeVisible();
  await expect(list.getByRole("listitem").filter({ hasText: "Tableau électrique" }).first()).toBeVisible();
});

test("§52 : la carte « Lots repérés » : retirer un lot, en ajouter un, « C'est bon », une section par lot gardé", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Immeuble Les Tilleuls", "SCI Les Tilleuls", "8 rue des Tilleuls, Vannes");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-multi-lots.pdf"));
  // Directive du fondateur (2026-10-13) : après la lecture, « Lots repérés : Électricité · VMC · Sanitaire ».
  const carte = page.getByRole("region", { name: "Lots repérés" });
  await expect(carte.getByRole("heading", { name: "Lots repérés : Électricité · VMC · Sanitaire" })).toBeVisible({ timeout: 60_000 });
  // Un bouton par lot pour le retirer ; la VMC n'est pas un lot à part ici.
  await carte.getByRole("button", { name: "Retirer le lot VMC" }).click();
  await expect(carte.getByRole("heading", { name: "Lots repérés : Électricité · Sanitaire" })).toBeVisible();
  // « Ajouter un lot » : les métiers qui ont leur référentiel.
  await carte.getByRole("button", { name: "Ajouter un lot" }).click();
  await carte.getByRole("group", { name: "Ajouter un lot" }).getByRole("button", { name: "Maçonnerie" }).click();
  await expect(carte.getByRole("heading", { name: "Lots repérés : Électricité · Sanitaire · Maçonnerie" })).toBeVisible();
  await carte.getByRole("button", { name: "C'est bon" }).click();
  await expect(carte).toHaveCount(0);
  await passQuestions(page);
  await openList(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  // Une section par lot qui a des lignes ; la bouche d'extraction (lot retiré) est restée, dans le lot principal.
  await expect(list.getByRole("heading", { name: /^Électricité/ })).toBeVisible();
  await expect(list.getByRole("heading", { name: /^Sanitaire/ })).toBeVisible();
  await expect(list.getByRole("heading", { name: /^VMC/ })).toHaveCount(0);
  await expect(list.getByRole("listitem").filter({ hasText: "Bouche d'extraction" }).first()).toBeVisible();
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
  // §52 : la couverture est relue (référentiel du fondateur) : pas de « Ratios en cours de validation ».
  await expect(list.getByText("Ratios en cours de validation")).toHaveCount(0);

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
  // §50.5 : la quantité reste celle du calcul, en unité commandable (20 ml → 5 longueurs de 4 m).
  await expect(list.getByText(/^5 longueurs de 4 m$/).filter({ visible: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Les questions" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Liste des fournitures" }).getByRole("button", { name: /Ardoises naturelles/ })).toHaveCount(0);
});

test("§48.5 : envoyer une partie de la liste à un fournisseur, le reste à un autre, puis l'envoi normal inchangé", async ({ page }) => {
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
  // Retour du fondateur (2026-10-11) : « je ne vois toujours pas la possibilité d'envoyer une partie du quantitatif à un
  // négoce, puis une autre partie à un autre ». Un vrai bouton, à côté du titre « Fournitures », visible sans descendre.
  const partie = list.getByRole("button", { name: "Envoyer une partie" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(partie).toBeInViewport();
  await partie.click();
  // Ce qu'il faut faire, en une phrase, au-dessus de la liste.
  await expect(list.getByText("Coche ce qui part chez ce fournisseur. Le reste pourra partir chez un autre.")).toBeVisible();
  const boxes = list.getByRole("checkbox", { name: /^Envoyer à part : / });
  await expect(boxes.first()).toBeVisible();
  // Retour du fondateur (2026-10-10) : « je dois tout avoir de coché » : chaque ligne prête l'est d'office, on décoche.
  const ready = boxes.and(page.locator(":enabled"));
  const count = await ready.count();
  expect(count).toBeGreaterThan(2);
  for (let i = 0; i < count; i++) await expect(ready.nth(i)).toBeChecked();
  const bar = page.getByRole("region", { name: "Envoyer la sélection" });
  await expect(bar.getByText(`${count} lignes cochées`)).toBeVisible();
  // « Tout décocher », puis « Tout cocher » : en un geste.
  await list.getByRole("button", { name: "Tout décocher" }).click();
  await expect(bar.getByText("Coche les lignes à envoyer")).toBeVisible();
  await list.getByRole("button", { name: "Tout cocher" }).click();
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
  await list.getByRole("button", { name: "Envoyer une partie" }).click();
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
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-doublon.pdf"));
  // Une faîtière écrite deux fois de suite : doublon ou quantités à additionner ? La ligne est orange, un ✓ la garde (§49.1).
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
  // Retour du fondateur (2026-10-11) : « quand le PDF s'ouvre, qu'on le voie en entier ; on zoome si on veut plus
  // grand ». La première page tient entière dans l'écran, en largeur et en hauteur.
  const premiere = pdf.getByRole("img", { name: "Page 1" });
  await expect(premiere).toBeVisible();
  const box = (await premiere.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 0.5);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 0.5);
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
    // Les boutons de réponse (la poubelle de la carte n'en est pas un).
    await card.getByRole("group").getByRole("button").filter({ hasNotText: /^Autre$/ }).first().click();
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
  await expect(links).toHaveText(["Ajouter un article"]);

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
  // Retour du fondateur (2026-10-11) : le bref est UN texte descriptif, en un bloc ; « Modifier » ouvre ses lignes, chacune
  // se corrige d'un tap, et le texte suit.
  await closeOpenLine(page);
  const bref = list.getByRole("region", { name: "Le chantier en bref" });
  const texte = bref.getByRole("paragraph");
  await expect(texte).toHaveCount(1);
  await expect(bref.getByRole("button", { name: /^Modifier le bref : / })).toHaveCount(0);
  await bref.getByRole("button", { name: "Modifier le bref", exact: true }).click();
  const line = bref.getByRole("button", { name: /^Modifier le bref : / }).first();
  await line.click();
  await bref.getByRole("textbox").fill("Couverture de la maison principale");
  await bref.getByRole("button", { name: "OK" }).click();
  // §51 : une ligne de la fiche garde son nom (« Ouvrage : … ») ; la valeur réécrite est celle de l'artisan.
  await expect(bref.getByRole("button", { name: /^Modifier le bref : (?:[^:]+ : )?Couverture de la maison principale$/ })).toBeVisible();
  await expect(texte).toContainText("Couverture de la maison principale");
  // Le client et l'adresse ne partent que si l'artisan les ajoute : la case existe, décochée.
  await expect(bref.getByRole("checkbox", { name: "Ajouter le nom du client et l'adresse" })).not.toBeChecked();
  await bref.getByRole("button", { name: "Terminer", exact: true }).click();
  await expect(bref.getByRole("button", { name: /^Modifier le bref : / })).toHaveCount(0);
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

test("§51.6 (2026-10-12) : chaque ligne orange ouverte montre sa question en premier, avec ses réponses", async ({ page }) => {
  // Retour du fondateur (capture « Crochets … · Finition à préciser ») : la fiche proposait le nom, +/−, croquis, retirer,
  // mais rien pour répondre. Une ligne orange se règle là où on l'ouvre : sa question d'abord, ses boutons, « Autre ».
  await signUp(page);
  await page.goto("/chantiers/nouveau");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-questions-comptoir.pdf"));
  const questions = page.getByRole("region", { name: "Les questions" });
  await expect(questions).toBeVisible({ timeout: 60_000 });
  await questions.getByRole("button", { name: /^Je commande façonné/ }).click();
  await page.getByRole("button", { name: "Calculer ma liste", exact: true }).click();
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(list).toBeVisible({ timeout: 60_000 });
  await expect(list.getByText("Prêt à commander", { exact: true })).toBeVisible();
  await expect(list.getByText("À préciser : coche pour valider")).toBeVisible();
  const cards = list.getByRole("list", { name: "Fournitures" }).locator(":scope > li");
  const oranges = cards.filter({ has: page.getByRole("img", { name: "à vérifier" }) });
  const n = await oranges.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const card = oranges.nth(i);
    await card.getByRole("button", { name: /^Modifier : / }).click();
    const regler = card.getByRole("group", { name: /^Régler : / });
    await expect(regler).toBeVisible();
    // Au moins une réponse possible, d'un tap, dans la fiche même.
    expect(await regler.getByRole("button").count(), `carte orange ${i + 1}`).toBeGreaterThan(0);
    // La question passe avant le reste de la fiche (le nom, la quantité).
    const nom = card.getByRole("button", { name: /^Modifier le nom/ });
    if (await nom.count()) expect((await regler.boundingBox())!.y).toBeLessThan((await nom.boundingBox())!.y);
    await closeOpenLine(page);
  }
});

test("§50.2 : « Calculer ma liste » reste collé en bas de l'écran, même après avoir écrit sous « Autre »", async ({ page }, info) => {
  // Retours du fondateur (2026-10-10 puis 2026-10-12, captures iPhone) : le bouton flottait au milieu de l'écran une fois le
  // clavier refermé. Sur téléphone : « position: fixed; bottom: 0 », la zone du geste en marge intérieure, caché pendant la
  // saisie ; la place est gardée sous la dernière carte. Sur ordinateur : collé en bas de la colonne (sticky).
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
  const phone = info.project.name === "telephone";
  await expect(bar).toHaveCSS("position", phone ? "fixed" : "sticky");
  // Pendant la saisie, la barre laisse la place au clavier ; le champ refermé, elle revient.
  if (phone) {
    await pente.getByLabel("Autre valeur : Pente du toit ?").focus();
    await expect(bar).toHaveAttribute("data-typing", "true");
    await pente.getByLabel("Autre valeur : Pente du toit ?").blur();
    await expect(bar).not.toHaveAttribute("data-typing");
  }
  const height = page.viewportSize()!.height;
  for (const to of ["haut", "bas"] as const) {
    await page.evaluate((t) => window.scrollTo(0, t === "bas" ? document.documentElement.scrollHeight : 0), to);
    await page.waitForTimeout(300);
    await expect(calculer).toBeInViewport();
    const box = (await bar.boundingBox())!;
    // Collée au bas de l'écran, jamais au milieu (sur ordinateur, en bas de page elle se pose sous la dernière carte).
    if (phone || to === "haut") expect(Math.abs(box.y + box.height - height), `${to} de page : la barre est à ${Math.round(box.y)} px`).toBeLessThan(2);
    if (to === "bas") {
      // La dernière question s'arrête au-dessus du bouton.
      const lastCard = (await questions.locator("li").last().boundingBox())!;
      const button = (await calculer.boundingBox())!;
      expect(lastCard.y + lastCard.height).toBeLessThanOrEqual(button.y);
    }
  }
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

test("retour du fondateur (2026-10-12) : un refus du serveur se dit sur la carte fautive, voyant rouge et phrase", async ({ page }) => {
  // Capture iPhone : « Un champ n'est pas correctement rempli » en haut de l'écran, sans dire où. Le refus nomme la réponse
  // (`reponses.N.valeur`) : la carte de cette question passe au rouge avec sa phrase, l'écran l'amène, rien en haut.
  await signUp(page);
  await page.goto("/chantiers/nouveau");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-questions-comptoir.pdf"));
  const questions = page.getByRole("region", { name: "Les questions" });
  await expect(questions).toBeVisible({ timeout: 60_000 });
  await page.route("**/calcul?**", async (route) => {
    const body = route.request().postDataJSON() as { reponses: { question: string }[] };
    const n = body.reponses.findIndex((r) => r.question.includes("pente"));
    await route.fulfill({ status: 400, json: { error: { code: "validation_failed", message: "Invalid request", supportId: "TEST-0001", retryable: false, details: [{ path: `reponses.${n}.valeur`, message: "Too big: expected string to have <=300 characters" }] } } });
  });
  const pente = questions.getByRole("group", { name: "Pente du toit ?" });
  await pente.getByRole("button", { name: "Autre", exact: true }).click();
  await pente.getByLabel("Autre valeur : Pente du toit ?").fill("38");
  await pente.getByRole("button", { name: "OK" }).click();
  await questions.getByRole("group", { name: /façonnes/i }).first().getByRole("button", { name: /^Je commande façonné/ }).click();
  await page.getByRole("button", { name: "Calculer ma liste", exact: true }).click();
  const carte = questions.getByRole("listitem").filter({ has: page.getByRole("group", { name: "Pente du toit ?" }) });
  await expect(carte.getByRole("alert")).toHaveText("Réponse trop longue : 300 caractères au plus.");
  await expect(carte).toBeInViewport();
  await expect(page.getByText("Un champ n'est pas correctement rempli.")).toHaveCount(0);
  // Une seule carte en rouge : celle de la réponse refusée.
  await expect(questions.getByRole("alert")).toHaveCount(1);
});

test("retour du fondateur (2026-10-12) : une question qui ne sert pas se retire d'un tap (poubelle), et se remet", async ({ page }) => {
  // « Donne la possibilité de supprimer des questions avec une poubelle car parfois tout n'est pas pertinent. » La question
  // part sans réponse ; sa ligne reste orange dans la liste, où elle se règle (§51.6). Le façonnage, obligatoire, n'en a pas.
  await signUp(page);
  await page.goto("/chantiers/nouveau");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-questions-comptoir.pdf"));
  const questions = page.getByRole("region", { name: "Les questions" });
  await expect(questions).toBeVisible({ timeout: 60_000 });
  const ardoise = () => questions.getByRole("listitem").filter({ has: page.getByRole("group", { name: /^Quelle ardoise/ }) });
  const faconnage = questions.getByRole("listitem").filter({ has: page.getByRole("group", { name: /façonnes/i }) }).first();
  await expect(faconnage.getByRole("button", { name: "Retirer cette question" })).toHaveCount(0);
  await ardoise().getByRole("button", { name: "Retirer cette question" }).click();
  const retiree = questions.getByRole("listitem").filter({ hasText: /^Question retirée/ });
  await expect(retiree).toContainText("Quelle ardoise");
  await expect(questions.getByRole("group", { name: /^Quelle ardoise/ })).toHaveCount(0);
  // « Remettre » la ramène telle quelle ; on la retire de nouveau pour le calcul.
  await retiree.getByRole("button", { name: "Remettre" }).click();
  await expect(questions.getByRole("group", { name: /^Quelle ardoise/ })).toBeVisible();
  await ardoise().getByRole("button", { name: "Retirer cette question" }).click();
  await faconnage.getByRole("button", { name: /^Je commande façonné/ }).click();
  const sent = page.waitForRequest((r) => r.url().includes("/calcul") && r.method() === "POST");
  await page.getByRole("button", { name: "Calculer ma liste", exact: true }).click();
  const body = (await sent).postDataJSON() as { reponses: { question: string; valeur: string | null }[] };
  expect(body.reponses.filter((r) => r.valeur === null)).toHaveLength(1);
  await expect(page.getByRole("region", { name: "Liste des fournitures" })).toBeVisible({ timeout: 60_000 });
});

test("temps deux (2026-10-12) : « Autre » partout où il y a des boutons, consommables compris", async ({ page }) => {
  await signUp(page);
  await page.goto("/chantiers/nouveau");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-questions-comptoir.pdf"));
  const questions = page.getByRole("region", { name: "Les questions" });
  await expect(questions).toBeVisible({ timeout: 60_000 });
  const cards = questions.getByRole("listitem").filter({ has: page.getByRole("group") });
  const n = await cards.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const card = cards.nth(i);
    const answers = card.getByRole("group").getByRole("button").filter({ hasNotText: /^Autre$/ });
    if ((await answers.count()) > 0) await expect(card.getByRole("button", { name: "Autre", exact: true })).toHaveCount(1);
  }
});

test("une adresse inconnue : une page en français, avec le chemin du retour (audit avant commercialisation)", async ({ page }) => {
  await page.goto("/cette-page-n-existe-pas");
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await expect(page.getByText(/This page could not be found|404/)).toHaveCount(0);
  await page.getByRole("link", { name: "Retour à l'accueil" }).click();
  await expect(page).not.toHaveURL(/cette-page-n-existe-pas/);
});

test("§50.1 : « Je lis ton devis » prend tout l'écran, avec le retour pour ne jamais rester coincé", async ({ page }) => {
  // Retour du fondateur (2026-10-11) : « je veux une animation plus fun qui prend tout l'écran ». La lecture simulée est
  // instantanée : ici l'API répond « lecture en cours », pour regarder l'écran le temps qu'il faut.
  await signUp(page);
  // L'écran lit l'état du quantitatif (`/v1/quantitatifs?…&ecran=1`) : « en cours », sans liste encore.
  const reading = (q: Record<string, unknown>) => ({ ...q, etat: "en_cours", ecran: null });
  await page.route(/\/v1\/quantitatifs(\?|$)/, async (route) => {
    try {
      const res = await route.fetch();
      const body = (await res.json()) as { items?: Record<string, unknown>[] } & Record<string, unknown>;
      await route.fulfill({ response: res, json: body.items ? { ...body, items: body.items.map(reading) } : reading(body) });
    } catch {
      // Requête annulée par l'application (elle relit l'état) : rien à répondre.
    }
  });
  await createProject(page, "Toiture Kerjean", "M. Kerjean", "5 rue du Port, Douarnenez");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  const lecture = page.getByRole("region", { name: "Analyse du devis" });
  await expect(lecture.getByRole("heading", { name: "Je lis ton devis" })).toBeVisible();
  const box = (await lecture.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(box.x).toBeLessThanOrEqual(0.5);
  expect(box.y).toBeLessThanOrEqual(0.5);
  expect(box.width).toBeGreaterThanOrEqual(vp.width - 1);
  expect(box.height).toBeGreaterThanOrEqual(vp.height - 1);
  // Une seule phrase (§50.1) ; et un retour : la lecture continue, l'artisan est prévenu quand c'est prêt.
  await expect(lecture.getByRole("heading")).toHaveCount(1);
  await expect(lecture.getByRole("button", { name: "Revenir à mes chantiers" })).toBeVisible();
});

test("§50.1 : passé 30 s, « Gros devis, j'y suis encore… » (une seule phrase)", async ({ page }) => {
  // Décision du fondateur (2026-10-13) : une lecture longue ne laisse plus croire que plus rien ne se passe.
  await page.clock.install();
  await signUp(page);
  const reading = (q: Record<string, unknown>) => ({ ...q, etat: "en_cours", ecran: null });
  await page.route(/\/v1\/quantitatifs(\?|$)/, async (route) => {
    try {
      const res = await route.fetch();
      const body = (await res.json()) as { items?: Record<string, unknown>[] } & Record<string, unknown>;
      await route.fulfill({ response: res, json: body.items ? { ...body, items: body.items.map(reading) } : reading(body) });
    } catch {
      // Requête annulée par l'application (elle relit l'état) : rien à répondre.
    }
  });
  await createProject(page, "Toiture Kerjean", "M. Kerjean", "5 rue du Port, Douarnenez");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  const lecture = page.getByRole("region", { name: "Analyse du devis" });
  await expect(lecture.getByRole("heading", { name: "Je lis ton devis" })).toBeVisible();
  await page.clock.fastForward(31_000);
  await expect(lecture.getByRole("heading", { name: "Gros devis, j'y suis encore…" })).toBeVisible();
  await expect(lecture.getByRole("heading")).toHaveCount(1);
});

/** Un appel à l'API avec la session de la page (entreprise active comprise) ; rend le statut HTTP. */
async function apiCall(page: Page, method: string, url: string, body?: unknown): Promise<number> {
  return page.evaluate(
    async ({ method, url, body }) => {
      const companyId = localStorage.getItem("baticlair.companyId");
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json", accept: "application/json", ...(companyId ? { "x-company-id": companyId } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return res.status;
    },
    { method, url, body },
  );
}

/** Les parcours partagent une base (téléphone puis ordinateur) : chacun son département, pour ne pas rejoindre le lot d'un autre. */
const adresseDuProjet = () => (test.info().project.name === "telephone" ? "2 rue Thiers, 56000 Vannes" : "5 rue de Siam, 29200 Brest");

test("BatiClair Groupé, étape 2 : proposer des lignes au groupé, s'engager, passer en signé, retirer", async ({ page }) => {
  await signUp(page);
  const adresse = adresseDuProjet();
  await createProject(page, "Toiture Le Groupé", "M. Le Bihan", adresse);
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  await passQuestions(page);
  await confirmDoubts(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  // Sans SIRET vérifié, le groupé n'existe pas à l'écran (gratuit pour l'artisan : l'abonnement n'y est pour rien).
  await expect(list.getByRole("button", { name: "Proposer au groupé" })).toHaveCount(0);

  // SIRET renseigné puis vérifié (hors production : sans appel INSEE) ; le compte reste en essai gratuit.
  expect(await apiCall(page, "PATCH", "/v1/company/profile", { name: "Toitures Martin", address: adresse, siret: "73282932000074", phone: null, email: null })).toBe(200);
  expect(await apiCall(page, "POST", "/v1/groupe/siret")).toBe(200);
  await page.reload();

  const proposer = list.getByRole("button", { name: "Proposer au groupé" });
  await expect(proposer).toBeVisible();
  await proposer.click();
  await expect(list.getByText("Coche ce que tu proposes au groupé. Ton nom ne part pas avec.")).toBeVisible();
  const boxes = list.getByRole("checkbox", { name: /^Proposer au groupé : / }).and(page.locator(":enabled"));
  // Rien de coché d'office : l'engagement se choisit ligne par ligne.
  await expect(boxes.first()).not.toBeChecked();
  await boxes.first().check();
  const bar = page.getByRole("region", { name: "Proposer au groupé", exact: true });
  await expect(bar.getByText("1 ligne au groupé")).toBeVisible();
  // « Chantier signé » : « Proposer » attend la phrase d'engagement.
  await bar.getByRole("radio", { name: "Chantier signé" }).click();
  await expect(bar.getByRole("button", { name: "Proposer" })).toBeDisabled();
  await bar.getByRole("checkbox", { name: /je m'engage à commander ces quantités au prix groupé obtenu, chez le négoce retenu/ }).check();
  await bar.getByRole("button", { name: "Proposer" }).click();

  const groupe = page.getByRole("region", { name: "Au groupé", exact: true });
  await expect(groupe.getByText("Chantier signé", { exact: true })).toBeVisible();
  await expect(groupe.getByRole("button", { name: "Retirer du groupé" })).toBeVisible();

  // Une deuxième ligne, en « Devis en attente », puis passée en signé d'un tap (avec l'engagement).
  await proposer.click();
  await boxes.first().check();
  await bar.getByRole("radio", { name: "Devis en attente" }).click();
  await bar.getByRole("button", { name: "Proposer" }).click();
  await expect(groupe.getByText("Devis en attente", { exact: true })).toBeVisible();
  await groupe.getByRole("button", { name: "Passer en signé" }).click();
  await groupe.getByRole("checkbox", { name: /je m'engage/ }).check();
  await groupe.getByRole("button", { name: "Chantier signé" }).click();
  await expect(groupe.getByText("Devis en attente", { exact: true })).toHaveCount(0);
  await expect(groupe.getByText("Chantier signé", { exact: true })).toHaveCount(2);

  // Retirées tant que le lot n'est pas parti : la section disparaît.
  await groupe.getByRole("button", { name: "Retirer du groupé" }).first().click();
  await expect(groupe.getByRole("button", { name: "Retirer du groupé" })).toHaveCount(1);
  await groupe.getByRole("button", { name: "Retirer du groupé" }).click();
  await expect(groupe).toHaveCount(0);
  // Sur iPhone, rien ne déborde.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("BatiClair Groupé, étape 3 : « Mes négoces », e-mail, familles, favori, message type", async ({ page }) => {
  await signUp(page);
  await page.goto("/fournisseurs");
  // Sans SIRET vérifié, pas de carte « Mes négoces » : la page des fournisseurs ne change pas.
  await expect(page.getByRole("heading", { name: "Fournisseurs" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Mes négoces" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ajouter un négoce" })).toHaveCount(0);

  expect(await apiCall(page, "PATCH", "/v1/company/profile", { name: "Toitures Martin", address: "3 quai Duguay-Trouin, 35400 Saint-Malo", siret: "73282932000074", phone: null, email: null })).toBe(200);
  expect(await apiCall(page, "POST", "/v1/groupe/siret")).toBe(200);
  await page.reload();
  await page.getByRole("button", { name: "Ajouter un négoce" }).click();
  const form = page.getByRole("form", { name: "Nouveau négoce" });
  await form.getByLabel("Nom du négoce").fill("Négoce Ardoises");
  await form.getByLabel("E-mail où il reçoit les demandes").fill("ardoises@example.com");
  await form.getByLabel("Ton numéro de compte chez lui").fill("C-12");
  // « Ajouter » attend au moins une famille cochée.
  await expect(form.getByRole("button", { name: "Ajouter" })).toBeDisabled();
  await form.getByLabel("Vend : Couverture").check();
  await form.getByRole("button", { name: "Ajouter" }).click();
  const liste = page.getByRole("list", { name: "Mes négoces" });
  const premier = liste.getByRole("listitem").filter({ hasText: "Négoce Ardoises" });
  await expect(premier).toBeVisible();
  await expect(premier.getByLabel("Favori")).toBeVisible();
  await expect(premier).toContainText("ardoises@example.com · 35 · Couverture");
  await expect(premier).toContainText("Compte C-12");

  // Un deuxième, généraliste, puis favori d'un tap : il passe en premier.
  await page.getByRole("button", { name: "Ajouter un négoce" }).click();
  await form.getByLabel("Nom du négoce").fill("Négoce Généraliste");
  await form.getByLabel("E-mail où il reçoit les demandes").fill("general@example.com");
  await form.getByLabel("Vend : Couverture").check();
  await form.getByLabel("Vend : Second œuvre").check();
  await form.getByRole("button", { name: "Ajouter" }).click();
  const second = liste.getByRole("listitem").filter({ hasText: "Négoce Généraliste" });
  await expect(second).toContainText("Numéro de compte à ajouter");
  await second.getByRole("button", { name: "En faire mon favori" }).click();
  await expect(liste.getByRole("listitem").first()).toContainText("Négoce Généraliste");
  await expect(liste.getByRole("listitem").first().getByLabel("Favori")).toBeVisible();

  // Le message type à envoyer au négoce, prêt à copier.
  await page.getByText("Le message à envoyer à ton négoce pour le prévenir").click();
  await expect(page.getByText("Toitures Martin", { exact: false }).last()).toBeVisible();
  await expect(page.getByText(/pas concerné/)).toBeVisible();

  // Retirer de ma liste : il part de la liste (il reste dans la base du département).
  await premier.getByRole("button", { name: "Retirer de ma liste" }).click();
  await expect(liste.getByRole("listitem")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

/** Le jeton signé d'un lien d'e-mail au négoce (étape 3), tel que l'API le fabrique, avec le secret des parcours. */
function jetonDeLienE2e(lien: { a: "stop" } | { a: "pas_concerne"; f: string }, negoceId: string): string {
  const corps = Buffer.from(JSON.stringify({ ...lien, n: negoceId, e: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${corps}.${createHmac("sha256", "e2e-secret-e2e-secret-e2e-secret-0000").update(`lien-negoce:${corps}`).digest("base64url")}`;
}

test("BatiClair Groupé, étape 5 : la page du lien « pas concerné » (confirmée d'un bouton) et la page de réponse d'un lien inconnu", async ({ page }) => {
  await signUp(page);
  expect(await apiCall(page, "PATCH", "/v1/company/profile", { name: "Toitures Martin", address: "3 quai Duguay-Trouin, 35400 Saint-Malo", siret: "73282932000074", phone: null, email: null })).toBe(200);
  expect(await apiCall(page, "POST", "/v1/groupe/siret")).toBe(200);
  expect(await apiCall(page, "POST", "/v1/groupe/negoces", { nom: "Négoce Ardoises", email: "ardoises@example.com", familles: ["couverture", "plomberie"] })).toBe(201);
  const negoces = await page.evaluate(async () => {
    const companyId = localStorage.getItem("baticlair.companyId");
    const res = await fetch("/v1/groupe/negoces", { headers: { accept: "application/json", ...(companyId ? { "x-company-id": companyId } : {}) } });
    return (await res.json()).negoces as { id: string; familles: string[] }[];
  });
  // Le négoce ouvre le lien de l'e-mail, sans compte : la page dit ce qu'il fera, rien ne change avant « Confirmer ».
  await page.context().clearCookies();
  await page.goto(`/negoces/lien/${jetonDeLienE2e({ a: "pas_concerne", f: "plomberie" }, negoces[0]!.id)}`);
  await expect(page.getByText("Négoce Ardoises : ne plus recevoir les demandes « Plomberie » ?")).toBeVisible();
  await page.getByRole("button", { name: "Confirmer" }).click();
  await expect(page.getByRole("status")).toContainText("C'est fait.");
  // Un lien de réponse inconnu (étape 5) : la page le dit, sans rien d'autre.
  await page.goto("/reponse/jeton-inconnu-0000000000000000000000");
  await expect(page.getByRole("status")).toContainText("Ce lien n'est plus valable.");
  await expect(page.getByRole("button", { name: /Déposer/ })).toHaveCount(0);
});

test("BatiClair Groupé, l'onglet : visible sans SIRET ni devis, trois étapes cochées une à une, puis « Mes lots » ; le bloc en haut de « Ton chantier »", async ({ page }) => {
  await signUp(page);
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  await nav.getByRole("link", { name: "Groupé" }).click();
  await expect(page).toHaveURL(/\/groupe$/);
  await expect(page.getByRole("heading", { name: "Groupé" })).toBeVisible();
  // L'accroche suit le métier du compte (un couvreur ici).
  await expect(page.getByText("Tes commandes d'ardoise regroupées avec les autres couvreurs du département, un seul négoce, un seul prix.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Comment ça marche" }).getByRole("listitem")).toHaveCount(3);
  const manque = page.getByRole("list", { name: "Ce qui manque" });
  await expect(manque.getByLabel("À faire")).toHaveCount(3);
  await expect(manque.getByRole("link", { name: "Renseigner mon SIRET" })).toBeVisible();
  // Un devis déposé sans SIRET : « Ton chantier » montre le bloc grisé qui renvoie à l'onglet Groupé.
  await createProject(page, "Toiture Le Bihan", "M. Le Bihan", "3 quai Duguay-Trouin, Saint-Malo");
  const chantier = page.url();
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  await passQuestions(page);
  const ferme = page.getByRole("region", { name: "Groupé fermé" });
  await expect(ferme.getByText("Renseigne ton SIRET pour proposer au groupé")).toBeVisible();
  await expect(page.getByRole("region", { name: "Proposer au groupé" })).toHaveCount(0);
  await ferme.getByRole("link", { name: "Groupé" }).click();
  await expect(page).toHaveURL(/\/groupe$/);
  await expect(manque.getByLabel("Fait")).toHaveCount(1);
  // SIRET renseigné : « Vérifier mon SIRET » le coche ; « Ton chantier » montre alors le bloc « Proposer au groupé » en haut.
  expect(await apiCall(page, "PATCH", "/v1/company/profile", { name: "Toitures Martin", address: "3 quai Duguay-Trouin, 35400 Saint-Malo", siret: "73282932000074", phone: null, email: null })).toBe(200);
  await page.reload();
  await manque.getByRole("button", { name: "Vérifier mon SIRET" }).click();
  await expect(manque.getByLabel("Fait")).toHaveCount(2);
  await expect(manque.getByLabel("À faire")).toHaveCount(1);
  await page.goto(chantier);
  const bloc = page.getByRole("region", { name: "Proposer au groupé" });
  await expect(bloc).toBeVisible();
  await expect(bloc.getByRole("button", { name: "Proposer au groupé" })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(bloc).toBeInViewport();
  await expect(page.getByRole("region", { name: "Groupé fermé" })).toHaveCount(0);
  // Sur téléphone, le chantier se lit en plein écran sans la barre du menu : retour à l'onglet par l'adresse.
  await page.goto("/groupe");
  await expect(manque.getByLabel("Fait")).toHaveCount(2);
  // Les négoces : tout est coché, l'onglet montre « Mes lots », vide.
  expect(await apiCall(page, "POST", "/v1/groupe/negoces", { nom: "Négoce Ardoises", email: "ardoises@example.com", familles: ["couverture"] })).toBe(201);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Mes lots" })).toBeVisible();
  await expect(page.getByText("Aucun lot pour l'instant, propose un chantier au groupé.")).toBeVisible();
  await expect(manque).toHaveCount(0);
  // Étape 7 : le compteur « Économisé grâce au groupé » dans Compte, à zéro.
  await page.goto("/compte");
  const economies = page.getByRole("region", { name: "Économisé grâce au groupé" });
  await expect(economies).toContainText("0,00 €");
  await expect(economies).toContainText("Aucune commande groupée pour l'instant.");
});

/** La boîte aux lettres de test (décision du 2026-10-20) : les e-mails capturés par l'API, lus par le parcours. */
async function emailsVers(page: Page, to: string): Promise<{ subject: string; text: string; replyTo: string | null; attachments: string[] }[]> {
  return page.evaluate(async (to) => {
    const res = await fetch(`/v1/internal/test/emails?to=${encodeURIComponent(to)}`, { headers: { authorization: "Bearer e2e-secret-de-la-tache" } });
    return (await res.json()).emails;
  }, to);
}
/** Le webhook Resend (`email.received`), signé comme Svix le fait, avec le secret des parcours. */
async function reponseParEmail(page: Page, from: string, to: string): Promise<unknown> {
  const corps = JSON.stringify({ type: "email.received", data: { from, to: [to], subject: "Re: demande de prix" } });
  const id = `msg_${Date.now()}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const secret = Buffer.from("e2e-secret-du-webhook-0000");
  const signature = createHmac("sha256", secret).update(`${id}.${timestamp}.${corps}`).digest("base64");
  return page.evaluate(
    async ({ corps, id, timestamp, signature }) => {
      const res = await fetch("/v1/webhooks/resend", { method: "POST", headers: { "content-type": "application/json", "svix-id": id, "svix-timestamp": timestamp, "svix-signature": `v1,${signature}` }, body: corps });
      return { status: res.status, body: await res.json() };
    },
    { corps, id, timestamp, signature },
  );
}
/** Un artisan prêt pour le groupé : compte, SIRET vérifié, un devis lu, une ligne proposée « chantier signé ». */
/** Comme `apiCall`, avec le corps de la réponse. */
async function apiJson<T = unknown>(page: Page, method: string, url: string, body?: unknown): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ({ method, url, body }) => {
      const companyId = localStorage.getItem("baticlair.companyId");
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json", accept: "application/json", ...(companyId ? { "x-company-id": companyId } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: res.status, body: (await res.json().catch(() => null)) as T };
    },
    { method, url, body },
  );
}

/** Un compte au groupé : entreprise, adresse, SIRET vérifié. */
async function compteAuGroupe(page: Page, entreprise: string, adresse: string, siret = "73282932000074"): Promise<void> {
  await signUp(page);
  expect(await apiCall(page, "PATCH", "/v1/company/profile", { name: entreprise, address: adresse, siret, phone: null, email: null })).toBe(200);
  expect(await apiCall(page, "POST", "/v1/groupe/siret")).toBe(200);
}

/** Un chantier déposé, lu, et sa première ligne proposée au groupé en « Chantier signé ». Rend l'id du chantier. */
async function chantierAuGroupe(page: Page, nom: string, adresse: string, avant?: (projectId: string) => Promise<void>): Promise<string> {
  const projectId = await createProject(page, nom, "M. Client", adresse);
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  await passQuestions(page);
  await confirmDoubts(page);
  if (avant) {
    await avant(projectId);
    await page.reload();
  }
  await proposerLaPremiereLigne(page);
  return projectId;
}

async function proposerLaPremiereLigne(page: Page, statut: "Chantier signé" | "Devis en attente" = "Chantier signé"): Promise<void> {
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  await list.getByRole("button", { name: "Proposer au groupé" }).click();
  const boxes = list.getByRole("checkbox", { name: /^Proposer au groupé : / }).and(page.locator(":enabled"));
  await boxes.first().check();
  const bar = page.getByRole("region", { name: "Proposer au groupé", exact: true });
  await bar.getByRole("radio", { name: statut }).click();
  if (statut === "Chantier signé") await bar.getByRole("checkbox", { name: /je m'engage à commander ces quantités au prix groupé obtenu, chez le négoce retenu/ }).check();
  await bar.getByRole("button", { name: "Proposer" }).click();
}

async function artisanAuGroupe(page: Page, entreprise: string, adresse: string): Promise<void> {
  await compteAuGroupe(page, entreprise, adresse);
  await chantierAuGroupe(page, `Toiture ${entreprise}`, adresse);
  // « Chantier signé » tant que le lot attend ; « Engagé, lot parti » quand ce signé a formé le lot et que la demande est partie.
  await expect(page.getByRole("region", { name: "Au groupé", exact: true }).getByText(/^(Chantier signé|Parti chez les négoces, tu es engagé)$/)).toBeVisible();
}

/** La dernière demande de prix reçue par un négoce (la boîte de test garde celles des parcours précédents). */
async function derniereDemande(page: Page, negoce: string, dejaRecus: number) {
  await expect.poll(async () => (await emailsVers(page, negoce)).length, { timeout: 20_000 }).toBeGreaterThan(dejaRecus);
  const demande = (await emailsVers(page, negoce)).at(-1)!;
  expect(demande.subject).toContain("Regroupement artisans");
  return demande;
}

/** Le négoce répond par e-mail, reçoit son lien neuf, l'ouvre sans compte, coche la commission et dépose son devis. */
async function negoceDepose(page: Page, browser: Browser, negoce: string, replyTo: string, fixture: string): Promise<void> {
  const r = (await reponseParEmail(page, `Négoce <${negoce}>`, replyTo)) as { status: number; body: { traite: boolean } };
  expect(r.status).toBe(200);
  expect(r.body.traite).toBe(true);
  const relance = (await emailsVers(page, negoce)).at(-1)!;
  expect(relance.subject).toContain("n'est pas encore prise en compte");
  const lien = /https?:\/\/[^\s]+\/reponse\/[A-Za-z0-9_-]+/.exec(relance.text)![0]!.replace(/^https?:\/\/[^/]+/, "");
  const contexteN = await browser.newContext({ ...(test.info().project.use as object) });
  const pageN = await contexteN.newPage();
  await pageN.goto(lien);
  await expect(pageN.getByRole("heading", { name: /^Demande de prix, lot n° \d+/ })).toBeVisible();
  const form = pageN.getByRole("form", { name: "Déposer mon devis" });
  await form.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures", fixture));
  await form.getByRole("checkbox", { name: "J'accepte la commission" }).check();
  await form.getByRole("button", { name: "Déposer mon devis" }).click();
  await expect(pageN.getByRole("status")).toContainText("Devis reçu, merci.");
  await contexteN.close();
}

/** La tâche planifiée du groupé, à une date choisie (test seulement). */
async function tachePlanifiee(page: Page, maintenant: string): Promise<unknown> {
  return page.evaluate(async (maintenant) => {
    const res = await fetch(`/v1/internal/groupe/regrouper?maintenant=${encodeURIComponent(maintenant)}`, { headers: { authorization: "Bearer e2e-secret-de-la-tache" } });
    return { status: res.status, body: await res.json() };
  }, maintenant);
}

const dansJours = (n: number) => new Date(Date.now() + n * 24 * 3600 * 1000).toISOString();

test("BatiClair Groupé, étape 8 : un lot de bout en bout, deux artisans, deux négoces qui répondent par e-mail, dépôt avec la case 2 %, choix, bon de commande, « Livré »", async ({ page, browser }) => {
  test.setTimeout(180_000);
  // Artisan A (deux négoces de couverture dans sa liste), puis artisan B dans un autre navigateur : le lot se forme au deuxième signé.
  // Un département par projet (base partagée), et les e-mails des parcours précédents comptés avant toute proposition.
  const telephone = test.info().project.name === "telephone";
  // Des départements que les autres parcours n'utilisent pas : le lot ne peut se former qu'avec ces deux-là.
  const adresseA = telephone ? "3 rue Crébillon, 44000 Nantes" : "4 quai Alexandre III, 50100 Cherbourg";
  const adresseB = telephone ? "12 rue de Strasbourg, 44000 Nantes" : "8 rue au Blé, 50100 Cherbourg";
  await compteAuGroupe(page, "Toitures Martin", adresseA);
  const dejaRecus = (await emailsVers(page, "ardoises@example.com")).length;
  const dejaRecusB = (await emailsVers(page, "general@example.com")).length;
  expect(await apiCall(page, "POST", "/v1/groupe/negoces", { nom: "Négoce Ardoises", email: "ardoises@example.com", familles: ["couverture"], numeroCompte: "C-12" })).toBe(201);
  expect(await apiCall(page, "POST", "/v1/groupe/negoces", { nom: "Négoce Généraliste", email: "general@example.com", familles: ["couverture", "second_oeuvre"] })).toBe(201);
  await chantierAuGroupe(page, "Toiture Toitures Martin", adresseA);
  await expect(page.getByRole("region", { name: "Au groupé", exact: true }).getByText(/^(Chantier signé|Parti chez les négoces, tu es engagé)$/)).toBeVisible();
  const contexteB = await browser.newContext({ ...(test.info().project.use as object) });
  const pageB = await contexteB.newPage();
  await artisanAuGroupe(pageB, "Toitures Le Bihan", adresseB);
  // La demande est partie aux deux négoces, avec l'adresse de réponse du lot.
  const demande = await derniereDemande(page, "ardoises@example.com", dejaRecus);
  expect(demande.replyTo).toMatch(/^lot-\d+@reponses\.example\.com$/);
  await derniereDemande(page, "general@example.com", dejaRecusB);
  await expect(page.getByRole("region", { name: "Au groupé", exact: true })).toBeVisible();
  // Le premier négoce répond par e-mail : le webhook lui renvoie un lien de dépôt neuf, rien n'est pris sans la case.
  {
    const r = (await reponseParEmail(page, "Négoce <ardoises@example.com>", demande.replyTo!)) as { status: number; body: { traite: boolean } };
    expect(r.status).toBe(200);
    expect(r.body.traite).toBe(true);
    const relance = (await emailsVers(page, "ardoises@example.com")).at(-1)!;
    expect(relance.subject).toContain("n'est pas encore prise en compte");
    const lien = /https?:\/\/[^\s]+\/reponse\/[A-Za-z0-9_-]+/.exec(relance.text)![0]!.replace(/^https?:\/\/[^/]+/, "");
    // Le négoce ouvre son lien, sans compte : le lot, la case obligatoire, le contrat à côté.
    const contexteN = await browser.newContext({ ...(test.info().project.use as object) });
    const pageN = await contexteN.newPage();
    await pageN.goto(lien);
    await expect(pageN.getByRole("heading", { name: /^Demande de prix, lot n° \d+/ })).toBeVisible();
    await expect(pageN.getByRole("list", { name: "Chantiers à livrer" }).getByRole("listitem")).toHaveCount(2);
    await expect(pageN.getByText("Toitures Martin")).toHaveCount(0);
    const form = pageN.getByRole("form", { name: "Déposer mon devis" });
    await expect(form.getByRole("link", { name: /Lire le contrat/ })).toHaveAttribute("href", /contrat\.pdf$/);
    await form.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures", "devis-fournisseur-couvreur.pdf"));
    await expect(form.getByRole("button", { name: "Déposer mon devis" })).toBeDisabled();
    await form.getByRole("checkbox", { name: "J'accepte la commission" }).check();
    await form.getByRole("button", { name: "Déposer mon devis" }).click();
    await expect(pageN.getByRole("status")).toContainText("Devis reçu, merci.");
    expect(await pageN.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await contexteN.close();
  }
  // Le second, de la même façon.
  await negoceDepose(page, browser, "general@example.com", demande.replyTo!, "devis-fournisseur-2.pdf");
  // Tous ont répondu : le négoce est retenu, le bon de commande est parti, chaque artisan voit son offre et peut dire « Livré ».
  await page.goto("/groupe");
  const lots = page.getByRole("list", { name: "Mes lots" });
  await expect(lots.getByText(/Négoce retenu/)).toBeVisible({ timeout: 20_000 });
  await expect(lots.getByText(/€ HT l'unité chez Négoce/)).toBeVisible();
  await expect(lots.getByText("Toitures Le Bihan")).toHaveCount(0);
  await lots.getByRole("button", { name: "Livré" }).click();
  await expect(lots.getByText("Livré, merci.")).toBeVisible();
  // Le bon de commande et la facture sont partis chez le négoce retenu.
  const auNegoce = [...(await emailsVers(page, "ardoises@example.com")), ...(await emailsVers(page, "general@example.com"))];
  expect(auNegoce.some((m) => /bons? de commande/.test(m.subject))).toBe(true);
  expect(auNegoce.some((m) => /^Facture n°/.test(m.subject))).toBe(true);
  // B voit aussi son offre, sans le nom de A.
  await pageB.goto("/groupe");
  const lotsB = pageB.getByRole("list", { name: "Mes lots" });
  await expect(lotsB.getByText(/Négoce retenu/)).toBeVisible();
  await expect(lotsB.getByText("Toitures Martin")).toHaveCount(0);
  await contexteB.close();
});

test("BatiClair Groupé, étape 9 : l'admin (Greg seul) voit les lots, le journal d'un lot, les factures et leur export CSV", async ({ page }) => {
  // Un artisan ordinaire ne voit pas le lien ; le compte admin (GROUPE_ADMINS) le voit sur l'onglet Groupé.
  await signUp(page);
  await page.goto("/groupe");
  await expect(page.getByRole("heading", { name: "Groupé" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Admin groupé" })).toHaveCount(0);
  expect(await page.evaluate(async () => (await fetch("/v1/admin/groupe")).status)).toBe(403);
  await page.context().clearCookies();
  // Le compte admin est unique (GROUPE_ADMINS) : créé au premier passage, retrouvé ensuite (téléphone puis ordinateur, même base).
  await page.goto("/connexion");
  await page.getByLabel("E-mail").fill("admin-groupe@example.fr");
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("heading", { name: /^Bonjour Jean/ }).or(page.getByRole("alert").filter({ hasText: "incorrect" }))).toBeVisible();
  if (await page.getByRole("alert").filter({ hasText: "incorrect" }).count()) await signUp(page, "admin-groupe@example.fr");
  await page.goto("/groupe");
  await page.getByRole("link", { name: "Admin groupé" }).click();
  await expect(page.getByRole("heading", { name: "Admin groupé" })).toBeVisible();
  const rubriques = page.getByRole("navigation", { name: "Rubriques de l'admin" });
  // Les lots des parcours précédents (même base) : chacun avec son journal ; sinon « Aucun lot ».
  const lots = page.getByRole("list", { name: "Lots" });
  await expect(lots).toBeVisible();
  const premier = lots.getByRole("button", { name: "Journal" }).first();
  if (await premier.count()) {
    await premier.click();
    await expect(page.getByRole("region", { name: /^Journal du lot n° \d+/ })).toBeVisible();
  } else {
    await expect(lots.getByText("Aucun lot.")).toBeVisible();
  }
  await rubriques.getByRole("button", { name: "Factures" }).click();
  await expect(page.getByRole("link", { name: /CSV/ })).toHaveAttribute("href", "/v1/admin/groupe/factures.csv");
  const csv = await page.evaluate(async () => (await fetch("/v1/admin/groupe/factures.csv")).text());
  expect(csv.split("\n")[0]).toBe("mois;numero;negoce;lot;total_lot_ht;commission_ht;tva;ttc;statut;emise_le;echeance_le;payee_le");
  await rubriques.getByRole("button", { name: "Exclusions" }).click();
  await expect(page.getByRole("list", { name: "Exclusions" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("Pages légales : mentions légales, CGU, conditions négoce et confidentialité, lisibles sans compte ; l'acceptation des CGU est gardée", async ({ page }) => {
  await page.goto("/mentions-legales");
  await expect(page.getByRole("heading", { name: "Mentions légales" })).toBeVisible();
  await expect(page.getByText(/BATI INVEST, SARL, SIRET 910 796 325 00017, 6 impasse du Ouipoure, 22620 Ploubazlanec/)).toBeVisible();
  await expect(page.getByText(/TVA intracommunautaire FR61910796325/)).toBeVisible();
  await expect(page.getByText(/Vercel Inc\./)).toBeVisible();
  await page.getByRole("navigation", { name: "Pages légales" }).getByRole("link", { name: "CGU" }).click();
  await expect(page.getByRole("heading", { name: "Conditions générales d'utilisation" })).toBeVisible();
  await expect(page.getByText(/Le négoce retenu verse 2 % du montant HT du lot à BatiClair/)).toBeVisible();
  await expect(page.getByText(/avocat/)).toHaveCount(0);
  await page.getByRole("navigation", { name: "Pages légales" }).getByRole("link", { name: "Conditions négoce" }).click();
  await expect(page.getByRole("heading", { name: "Conditions négoce" })).toBeVisible();
  await expect(page.getByText(/2 % du montant hors taxes du lot/)).toBeVisible();
  await page.getByRole("navigation", { name: "Pages légales" }).getByRole("link", { name: "Confidentialité" }).click();
  await expect(page.getByRole("heading", { name: "Confidentialité" })).toBeVisible();
  await expect(page.getByText(/Neon, à Francfort/)).toBeVisible();
  await expect(page.getByText(/Resend/).first()).toBeVisible();
  await expect(page.getByText(/API Sirene de l'INSEE/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  // Le compte créé (case cochée) garde la date et la version des CGU.
  await signUp(page);
  const cgu = await page.evaluate(async () => (await (await fetch("/v1/me/cgu")).json()) as { accepteLe: string | null; version: string | null });
  expect(cgu.version).toBe("2026-10-20");
  expect(cgu.accepteLe).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

test("BatiClair Groupé, scénarios 1 : deux départements et deux références font des lots séparés, retrait avant départ, SIRET invalide, plafond 3 × médiane", async ({ page, browser }) => {
  test.setTimeout(240_000);
  // A (Côtes-d'Armor ou Finistère selon le projet) et B (Ille-et-Vilaine ou Morbihan) proposent la même référence : deux lots,
  // un par département. Un lot du même département peut déjà exister (autre parcours, même base) : il est alors formé, pas ouvert.
  const telephone = test.info().project.name === "telephone";
  const adresseA = telephone ? "4 rue de Kerampont, 22300 Lannion" : "5 rue de Siam, 29200 Brest";
  const adresseB = telephone ? "12 rue de Kerampont, 35400 Saint-Malo" : "2 rue Thiers, 56000 Vannes";
  await artisanAuGroupe(page, "Toitures Trégor", adresseA);
  const contexteB = await browser.newContext({ ...(test.info().project.use as object) });
  const pageB = await contexteB.newPage();
  await artisanAuGroupe(pageB, "Toitures Malouines", adresseB);
  type Lot = { designation: string; statut: string; lot: { numero: number; statut: string } | null };
  const lotsA = (await apiJson<{ besoins: Lot[] }>(page, "GET", "/v1/groupe/lots")).body.besoins;
  const lotsB = (await apiJson<{ besoins: Lot[] }>(pageB, "GET", "/v1/groupe/lots")).body.besoins;
  expect(lotsA).toHaveLength(1);
  expect(lotsB).toHaveLength(1);
  expect(["ouvert", "forme", "envoye"]).toContain(lotsA[0]!.lot!.statut);
  expect(["ouvert", "forme", "envoye"]).toContain(lotsB[0]!.lot!.statut);
  expect(lotsA[0]!.lot!.numero).not.toBe(lotsB[0]!.lot!.numero);
  await page.goto("/groupe");
  await expect(page.getByRole("list", { name: "Mes lots" }).getByText(/Lot n° \d+ · (Lot ouvert, en attente d'autres artisans|Lot formé|Demande partie)/)).toBeVisible();
  await contexteB.close();

  // A propose une deuxième référence : un autre lot ; puis la retire tant que rien n'est parti (section 4 a).
  await page.goto(`/chantiers/${lotsA[0] && (await apiJson<{ besoins: { projectId: string }[] }>(page, "GET", "/v1/groupe/lots")).body.besoins[0]!.projectId}`);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  await list.getByRole("button", { name: "Proposer au groupé" }).click();
  await list.getByRole("checkbox", { name: /^Proposer au groupé : / }).and(page.locator(":enabled")).first().check();
  const bar = page.getByRole("region", { name: "Proposer au groupé", exact: true });
  await bar.getByRole("radio", { name: "Chantier signé" }).click();
  await bar.getByRole("checkbox", { name: /je m'engage/ }).check();
  await bar.getByRole("button", { name: "Proposer" }).click();
  const groupe = page.getByRole("region", { name: "Au groupé", exact: true });
  await expect(groupe.getByText(/^(Chantier signé|Parti chez les négoces, tu es engagé)$/)).toHaveCount(2);
  const apres = (await apiJson<{ besoins: Lot[] }>(page, "GET", "/v1/groupe/lots")).body.besoins;
  expect(apres).toHaveLength(2);
  expect(new Set(apres.map((b) => b.lot!.numero)).size).toBe(2);
  // La deuxième référence vient d'ouvrir son lot : retrait libre tant que rien n'est parti.
  await groupe.getByRole("button", { name: "Retirer du groupé" }).last().click();
  await expect(groupe.getByText(/^(Chantier signé|Parti chez les négoces, tu es engagé)$/)).toHaveCount(1);
  expect((await apiJson<{ besoins: Lot[] }>(page, "GET", "/v1/groupe/lots")).body.besoins).toHaveLength(1);

  // Un SIRET mal formé (clé de Luhn fausse) : « Vérifier mon SIRET » le dit, le groupé reste fermé.
  const contexteS = await browser.newContext({ ...(test.info().project.use as object) });
  const pageS = await contexteS.newPage();
  await signUp(pageS);
  expect(await apiCall(pageS, "PATCH", "/v1/company/profile", { name: "Toitures Siret", address: "1 rue du Port, 22500 Paimpol", siret: "12345678901234", phone: null, email: null })).toBe(200);
  await pageS.goto("/groupe");
  await pageS.getByRole("button", { name: "Vérifier mon SIRET" }).click();
  await expect(pageS.getByText("Ce SIRET n'a pas 14 chiffres valides : corrige-le dans Compte.")).toBeVisible();
  await expect(pageS.getByRole("list", { name: "Ce qui manque" }).getByLabel("Fait")).toHaveCount(0);
  await contexteS.close();

  // Le plafond (section 5) : A et B proposent 1 250 tuiles chacun ; C en met 5 000 (plus de 3 × la médiane) : refusé, dit en clair.
  const contexteC = await browser.newContext({ ...(test.info().project.use as object) });
  const pageC = await contexteC.newPage();
  await compteAuGroupe(pageC, "Toitures Plafond", adresseA);
  const projetC = await createProject(pageC, "Toiture Plafond", "M. Client", adresseA);
  await pageC.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  await passQuestions(pageC);
  await confirmDoubts(pageC);
  const takeoff = (await apiJson<{ takeoff: { lines: { id: string; designation: string; quantity: string | null; unit: string | null }[] } }>(pageC, "GET", `/v1/projects/${projetC}/takeoff`)).body.takeoff;
  const tuiles = takeoff.lines.find((l) => /tuile romane/i.test(l.designation))!;
  expect((await apiJson(pageC, "PATCH", `/v1/takeoff-lines/${tuiles.id}`, { designation: tuiles.designation, quantity: "5000", unit: tuiles.unit ?? "u" })).status).toBe(200);
  await pageC.reload();
  const listC = pageC.getByRole("region", { name: "Liste des fournitures" });
  await listC.getByRole("button", { name: "Proposer au groupé" }).click();
  await listC.getByRole("checkbox", { name: /^Proposer au groupé : Tuile romane/ }).check();
  const barC = pageC.getByRole("region", { name: "Proposer au groupé", exact: true });
  await barC.getByRole("radio", { name: "Chantier signé" }).click();
  await barC.getByRole("checkbox", { name: /je m'engage/ }).check();
  await barC.getByRole("button", { name: "Proposer" }).click();
  await expect(barC.getByRole("alert")).toContainText("Cette quantité dépasse trois fois ce que les autres artisans proposent");
  expect((await apiJson<{ besoins: Lot[] }>(pageC, "GET", "/v1/groupe/lots")).body.besoins).toHaveLength(0);
  await contexteC.close();
});

test("BatiClair Groupé, scénarios 2 : lot sans offre clos à 7 jours, négoce « pas concerné », désistement ×2 → exclusion 6 mois, nouveau lot refusé", async ({ page, browser }) => {
  test.setTimeout(300_000);
  const N1 = "ardoises@example.com";
  const N2 = "general@example.com";
  const recus = async () => ({ n1: (await emailsVers(page, N1)).length, n2: (await emailsVers(page, N2)).length });
  // A et B, même département ; A connaît deux négoces de couverture. A aura quatre chantiers : au-delà de l'essai (3), formule Solo.
  await compteAuGroupe(page, "Toitures Nord", "3 quai Duguay-Trouin, 35400 Saint-Malo");
  expect(await apiCall(page, "POST", "/v1/billing/activate", { code: "E2E-SOLO-CODE" })).toBe(200);
  expect(await apiCall(page, "POST", "/v1/groupe/negoces", { nom: "Négoce Ardoises", email: N1, familles: ["couverture"] })).toBe(201);
  expect(await apiCall(page, "POST", "/v1/groupe/negoces", { nom: "Négoce Généraliste", email: N2, familles: ["couverture", "second_oeuvre"] })).toBe(201);
  const contexteB = await browser.newContext({ ...(test.info().project.use as object) });
  const pageB = await contexteB.newPage();
  await compteAuGroupe(pageB, "Toitures Sud", "12 rue de Kerampont, 35400 Saint-Malo");

  // 1) Lot sans offre : la demande part, personne ne répond ; huit jours plus tard, la tâche clôt le lot (décision du 20 octobre).
  let avant = await recus();
  await chantierAuGroupe(page, "Toiture Nord 1", "3 quai Duguay-Trouin, 35400 Saint-Malo");
  await chantierAuGroupe(pageB, "Toiture Sud 1", "12 rue de Kerampont, 35400 Saint-Malo");
  const demande1 = await derniereDemande(page, N1, avant.n1);
  await derniereDemande(page, N2, avant.n2);
  const lot1 = Number(/^lot-(\d+)@/.exec(demande1.replyTo!)![1]);
  const tache = (await tachePlanifiee(page, dansJours(8))) as { status: number; body: { lotsClos: number } };
  expect(tache.status).toBe(200);
  expect(tache.body.lotsClos).toBeGreaterThanOrEqual(1);
  await page.goto("/groupe");
  await expect(page.getByRole("list", { name: "Mes lots" }).getByText(`Lot n° ${lot1} · Aucun négoce n'a répondu, lot fermé`)).toBeVisible();

  // 2) Deuxième lot : N1 dit « pas concerné » par le lien de l'e-mail ; N2 dépose ; N2 est retenu, les bons partent.
  avant = await recus();
  await chantierAuGroupe(page, "Toiture Nord 2", "3 quai Duguay-Trouin, 35400 Saint-Malo");
  await chantierAuGroupe(pageB, "Toiture Sud 2", "12 rue de Kerampont, 35400 Saint-Malo");
  const demande2 = await derniereDemande(page, N1, avant.n1);
  await derniereDemande(page, N2, avant.n2);
  const lienPasConcerne = /Pas concerné : (\S+)/.exec(demande2.text)![1]!.replace(/^https?:\/\/[^/]+/, "");
  const contexteN = await browser.newContext({ ...(test.info().project.use as object) });
  const pageN = await contexteN.newPage();
  await pageN.goto(lienPasConcerne);
  await expect(pageN.getByText(/Négoce Ardoises : ne plus recevoir les demandes « Couverture » \?/)).toBeVisible();
  await pageN.getByRole("button", { name: "Confirmer" }).click();
  await expect(pageN.getByRole("status")).toContainText("C'est fait.");
  await contexteN.close();
  await negoceDepose(page, browser, N2, demande2.replyTo!, "devis-fournisseur-2.pdf");
  await page.goto("/groupe");
  const lots = page.getByRole("list", { name: "Mes lots" });
  await expect(lots.getByText(/Négoce retenu/)).toBeVisible({ timeout: 20_000 });
  await expect(lots.getByText(/chez Négoce Généraliste/)).toBeVisible();

  // 3) Premier désistement : un avertissement, le lot reste commandé pour B.
  await lots.getByRole("button", { name: "Je ne commande pas" }).click();
  await expect(lots.getByText(/deuxième fois sur 12 mois : le groupé se ferme 6 mois/)).toBeVisible();
  await lots.getByRole("button", { name: "Je ne commande pas, c'est sûr" }).click();
  await expect(lots.getByText("Tu ne commandes pas ce lot (désistement).")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "fermé" })).toHaveCount(0);
  const etat1 = (await apiJson<{ eligible: boolean; raisons: string[] }>(page, "GET", "/v1/groupe")).body;
  expect(etat1.eligible).toBe(true);

  // 4) Troisième lot, N1 n'est plus demandé (pas concerné) ; N2 dépose ; deuxième désistement : exclu 6 mois.
  avant = await recus();
  await chantierAuGroupe(page, "Toiture Nord 3", "3 quai Duguay-Trouin, 35400 Saint-Malo");
  await chantierAuGroupe(pageB, "Toiture Sud 3", "12 rue de Kerampont, 35400 Saint-Malo");
  const demande3 = await derniereDemande(page, N2, avant.n2);
  expect((await emailsVers(page, N1)).length).toBe(avant.n1);
  await negoceDepose(page, browser, N2, demande3.replyTo!, "devis-fournisseur-2.pdf");
  await page.goto("/groupe");
  await expect(lots.getByRole("button", { name: "Je ne commande pas" })).toBeVisible({ timeout: 20_000 });
  await lots.getByRole("button", { name: "Je ne commande pas" }).click();
  await lots.getByRole("button", { name: "Je ne commande pas, c'est sûr" }).click();
  await expect(lots.getByText("Tu ne commandes pas ce lot (désistement).")).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole("status").filter({ hasText: /Le groupé t'est fermé jusqu'au .* : deux désistements en 12 mois/ })).toBeVisible();
  const etat2 = (await apiJson<{ eligible: boolean; raisons: string[]; excluJusquau: string | null }>(page, "GET", "/v1/groupe")).body;
  expect(etat2.eligible).toBe(false);
  expect(etat2.raisons).toContain("exclu_du_groupe");
  expect(etat2.excluJusquau).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  // Un nouveau lot est refusé : « Ton chantier » montre le bloc grisé, l'API ferme.
  const projet4 = await createProject(page, "Toiture Nord 4", "M. Client", "3 quai Duguay-Trouin, 35400 Saint-Malo");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  await passQuestions(page);
  await confirmDoubts(page);
  await expect(page.getByRole("region", { name: "Groupé fermé" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Liste des fournitures" }).getByRole("button", { name: "Proposer au groupé" })).toHaveCount(0);
  const refus = await apiJson<{ error: { code: string; details: { reason: string } } }>(page, "POST", `/v1/projects/${projet4}/groupe`, { articles: ["x"], fenetre: { tot: "2026-11-02", tard: "2026-11-20" }, statut: "signe", engagement: true });
  expect(refus.status).toBe(403);
  expect(refus.body.error.details.reason).toBe("groupe_ferme");
  // B, lui, voit toujours ses lots et son négoce retenu.
  await pageB.goto("/groupe");
  await expect(pageB.getByRole("list", { name: "Mes lots" }).getByText(/Négoce retenu/).first()).toBeVisible();
  await contexteB.close();
});

test("Aide « ? » : sur chaque écran, trois lignes au plus, tutoiement, un tap ouvre, un tap ferme", async ({ page }) => {
  await signUp(page);
  for (const [chemin, titre] of [
    ["/groupe", "Aide : Le groupé"],
    ["/fournisseurs", "Aide : Tes négoces"],
    ["/compte", "Aide : Ton compte"],
    ["/chantiers", "Aide : Tes chantiers"],
  ] as const) {
    await page.goto(chemin);
    const bouton = page.getByRole("button", { name: "Aide" });
    await expect(bouton).toBeVisible();
    await expect(page.getByRole("dialog", { name: titre })).toHaveCount(0);
    await bouton.click();
    const aide = page.getByRole("dialog", { name: titre });
    await expect(aide).toBeVisible();
    const lignes = await aide.getByRole("listitem").allTextContents();
    expect(lignes.length).toBeLessThanOrEqual(3);
    expect(lignes.length).toBeGreaterThan(0);
    for (const l of lignes) expect(l).toMatch(/\b(tu|te|ton|ta|tes|toi)\b|\bt'/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await aide.getByRole("button", { name: "Compris" }).click();
    await expect(aide).toHaveCount(0);
  }
  // Sur « Ton chantier » (le quantitatif), le « ? » est à côté du titre de la liste.
  await createProject(page, "Toiture Aide", "M. Client", "3 quai Duguay-Trouin, 35400 Saint-Malo");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  await passQuestions(page);
  await confirmDoubts(page);
  await page.getByRole("region", { name: "Liste des fournitures" }).getByRole("button", { name: "Aide" }).click();
  await expect(page.getByRole("dialog", { name: "Aide : Ton chantier" })).toBeVisible();
});

test("La page d'accueil publique : un visiteur la voit à la racine, un artisan connecté garde l'app", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tes devis deviennent tes bons de commande");
  // Les sections demandées : quantitatif, groupé, prix, métiers, compte, mentions légales. Rien d'extérieur.
  await expect(page.getByRole("heading", { name: "Du devis à la liste de fournitures, en trois étapes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Le groupé : un seul négoce, un seul prix" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gratuit pour l'artisan" })).toBeVisible();
  await expect(page.getByText("Le négoce paie 2 %")).toBeVisible();
  await expect(page.getByRole("list", { name: "Métiers couverts" }).getByRole("listitem")).toHaveCount(24);
  await expect(page.getByRole("link", { name: "Créer un compte" })).toHaveCount(2);
  await expect(page.getByText(/BATI INVEST, SARL, SIRET 910 796 325 00017/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Confidentialité" })).toHaveAttribute("href", "/confidentialite");
  const externes = await page.evaluate(() => [...document.querySelectorAll("script[src], img, link[rel=stylesheet], iframe")].map((e) => (e as HTMLElement).getAttribute("src") ?? (e as HTMLElement).getAttribute("href") ?? "").filter((u) => /^https?:\/\//.test(u)));
  expect(externes).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  // Connecté : la racine reste l'accueil de l'app.
  await signUp(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Bonjour Jean/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Créer un compte" })).toHaveCount(0);
});

test("PWA : manifeste et icônes installables ; sur le téléphone, « Ajouter à l'écran d'accueil » expliqué une fois", async ({ page }) => {
  const manifest = (await (await page.request.get("/manifest.webmanifest")).json()) as { display: string; start_url: string; icons: { src: string; sizes: string; purpose?: string }[] };
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  expect(manifest.icons.map((i) => i.src)).toEqual(expect.arrayContaining(["/icon-192.png", "/icon-512.png", "/icon-512-maskable.png"]));
  for (const f of ["/icon-192.png", "/icon-512.png", "/icon-512-maskable.png", "/apple-touch-icon.png"]) expect((await page.request.get(f)).headers()["content-type"]).toContain("image/png");
  await signUp(page);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /apple-touch-icon\.png/);
  const aide = page.getByRole("region", { name: "Ajouter à l'écran d'accueil" });
  if (test.info().project.name === "telephone") {
    await expect(aide).toBeVisible();
    await expect(aide.getByText(/Ajouter à l'écran d'accueil|Sur l'écran d'accueil/)).toBeVisible();
    await aide.getByRole("button", { name: "Compris" }).click();
    await expect(aide).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: /^Bonjour Jean/ })).toBeVisible();
    await expect(aide).toHaveCount(0);
  } else {
    await expect(page.getByRole("heading", { name: /^Bonjour Jean/ })).toBeVisible();
    await expect(aide).toHaveCount(0);
  }
});

