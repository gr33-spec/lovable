import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";

// Lot final, point 1 : au premier envoi, « Avant d'envoyer » (SIRET, prénom, portable) se remplit tout seul dans ces parcours.
test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Avant d'envoyer" }), async () => {
    const d = page.getByRole("dialog", { name: "Avant d'envoyer" });
    await d.getByLabel("SIRET de ton entreprise").fill("73282932000074");
    if (!(await d.getByLabel("Ton prénom").inputValue())) await d.getByLabel("Ton prénom").fill("Jean");
    await d.getByLabel("Ton portable").fill("06 12 34 56 78");
    await d.getByRole("button", { name: "Continuer" }).click();
    await d.waitFor({ state: "detached" });
  });
});


/**
 * LE GUIDE DU PREMIER LANCEMENT (Greg, 24 octobre 2026) s'ouvre par-dessus l'app une fois par compte : chaque parcours le
 * passe dès qu'il paraît (« Passer le guide »), sauf le test du guide, qui retire ce réflexe.
 */
async function passeGuide(page: Page): Promise<Page> {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  return page;
}

test.beforeEach(async ({ page }) => {
  await passeGuide(page);
});

/**
 * L'ANCIEN MODE (commande du mois, commande commune par lots) ne se voit qu'en mode « mois » (Greg, 26 et 27 octobre 2026) :
 * ses parcours (`@ancien`, `@lots`) le rallument, tous les autres repartent en mode humain, le mode par défaut.
 */
test.beforeEach(async ({ request }, info) => {
  const ancien = info.tags.includes("@ancien") || info.tags.includes("@lots");
  const r = await request.post("/v1/internal/test/mode-regroupement", { headers: { authorization: "Bearer e2e-secret-de-la-tache" }, data: { mode: ancien ? "mois" : "humain" } });
  expect(r.status()).toBe(200);
});

/** Adresse unique par exécution : les tests ne dépendent pas de l'état de la base. */
/** Photo minimale (1 px, PNG valide). */
const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

/**
 * Le regroupement du mois (Greg, 22 octobre 2026) est le mode par défaut. Les parcours de l'ancien regroupement par
 * lot (`@lots`) tournent dans une passe à part (`E2E_COMMANDE_COMMUNE=lots`, deuxième étape de la CI) ; ailleurs ils
 * sont sautés en le disant, jamais en silence.
 */
const PASSE_LOTS = process.env.E2E_COMMANDE_COMMUNE === "lots";
function passeLots() {
  test.skip(!PASSE_LOTS, "Ancien regroupement par lot : joué dans la passe COMMANDE_COMMUNE=lots (CI, deuxième étape).");
}

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function signUp(page: Page, email = `artisan-${unique()}@example.fr`) {
  await page.goto("/");
  // Sans session : la page publique, puis « Créer un compte » mène à l'inscription.
  // Landing « niveau studio » (Greg, 26 octobre 2026) : l'accroche.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Achète tes matériaux au prix des gros\.$/);
  // L'aperçu WhatsApp : écrit dès le serveur avec l'adresse du site, jamais vercel.app.
  const html = await (await page.request.get("/")).text();
  expect(html).toMatch(/<meta property="og:image" content="http:\/\/localhost:3000\/marque\/partage\.png"/);
  await page.getByRole("link", { name: "Créer mon compte gratuit" }).first().click();
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
  // R7 (Greg, 27 octobre 2026) : l'écran dédié « Voici ton adresse Mobiiz : … » avant l'accueil.
  await expect(page.getByRole("heading", { name: "Voici ton adresse Mobiiz :" })).toBeVisible();
  await page.getByRole("button", { name: "C'est compris" }).click();
  // L'accueil, ou d'abord le guide du premier lancement (qui rend la page derrière inerte).
  await expect(page.getByRole("heading", { name: /^(Bonjour Jean|Paie tes matériaux moins cher)/ }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
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
 * quitter la liste (§49.8) ; fini quand le gros bouton dit « Demander les prix à mes négoces ».
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
      await expect(list.getByRole("button", { name: "Demander les prix à mes négoces" })).toBeVisible();
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
/** Le menu derrière l'initiale de l'artisan (en haut à droite) : Mes fournisseurs, Mon compte, l'essai sur un chantier fictif. */
async function menuArtisan(page: Page, entree: string) {
  await page.getByRole("button", { name: "Mon menu" }).click();
  await page.getByRole("menuitem", { name: entree }).click();
}

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
  await expect(page.getByRole("link", { name: "Ma liste de matériaux" })).toBeVisible();

  // Le « + » : un nouveau chantier = déposer un fichier, rien d'autre à remplir (§48).
  // Recentrage (25 octobre 2026) : plus de « + » au centre de la barre ; le gros bouton « Nouveau chantier » de l'accueil.
  await page.goto("/");
  await page.getByRole("link", { name: "Ma liste de matériaux" }).first().click();
  await expect(page).toHaveURL(/\/chantiers\/nouveau$/);
  // Greg, 27 octobre 2026, 2e message, point 31 : trois choix, le devis d'abord.
  await expect(page.getByText("Depuis mon devis — on t'avance", { exact: true })).toBeVisible();
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

test("le menu : cinq onglets (recentrage du 25 octobre 2026) ; fournisseurs et compte sont derrière l'initiale", async ({ page }) => {
  await signUp(page);
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  // Achat groupé (Greg, 27 octobre 2026) : Accueil, Achats groupés, le « + » jaune au centre, Mes listes, Profil.
  await expect(nav.getByRole("link")).toHaveText(["Accueil", "Achats groupés", "Mes listes", "Profil"]);
  await expect(nav.getByRole("button", { name: /Nouveau/ })).toBeVisible();
  await menuArtisan(page, "Mon compte");
  await expect(page.getByRole("heading", { name: "Profil" })).toBeVisible();

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
  // L'abonnement (24 octobre 2026) et, l'ancien paywall allumé en e2e, la formule par chantiers.
  await expect(page.getByText("Essai gratuit", { exact: true }).first()).toBeVisible();
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
  // §50.3 : tout est vert, plus de barre « à régler », un seul bouton « Demander les prix à mes négoces » ; aucun compteur (§50.4).
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
  // §50.7 : « Demander les prix à mes négoces » valide la liste et demande seulement à qui l'envoyer (le document est l'écran) ;
  // « Revenir à la liste » referme.
  await openList(page);
  await page.getByRole("button", { name: "Demander les prix à mes négoces" }).click();
  const apercu = page.getByRole("dialog", { name: "À qui j'envoie ?" });
  await expect(apercu.getByRole("button", { name: "Choisis un négoce" })).toBeDisabled();
  await apercu.getByRole("button", { name: "Revenir à la liste" }).click();
  await expect(apercu).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Liste des fournitures" })).toBeVisible();

  // La liste validée est conservée.
  await page.reload();
  await openList(page);
  await expect(page.getByRole("button", { name: "Demander les prix à mes négoces" })).toBeVisible();
  // Point 8 (Greg, 28 octobre 2026) : liste prête, UN seul bouton principal « Demander les prix à mes négoces ».
  await expect(page.getByRole("button", { name: "Demander les prix à mes négoces" })).toHaveCount(1);

  // Une ligne se corrige encore après validation, d'un tap sur la ligne puis le plus : la liste est à valider à nouveau.
  await page.getByRole("button", { name: `Modifier : ${tuile}` }).click();
  await page.getByRole("button", { name: `Plus : ${tuile}` }).click();
  // Le plus part une seconde après le dernier appui (une seule correction au journal).
  await page.waitForTimeout(1300);
  await settle(page);
  await confirmDoubts(page);
  await page.getByRole("button", { name: "Demander les prix à mes négoces" }).click();
  await expect(page.getByRole("dialog", { name: "À qui j'envoie ?" })).toBeVisible();
});

test("un couvreur demande les prix à ses fournisseurs et range leurs devis", { tag: "@lots" }, async ({ page }) => {
  passeLots();
  // Parcours long (aperçu avant envoi, deux devis, comparaison) : le temps de la machine, pas un défaut.
  test.slow();
  await signUp(page);

  // Carnet de fournisseurs : « Nouveau fournisseur » vit dans sa page.
  await menuArtisan(page, "Mes fournisseurs");
  await page.getByRole("button", { name: "Nouveau fournisseur" }).click();
  await page.getByLabel("Société").fill("Point.P Vannes");
  await page.getByLabel("E-mail de ton commercial").fill("pas-un-email");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByText("Cette adresse e-mail n'est pas valide.")).toBeVisible();
  await page.getByLabel("E-mail de ton commercial").fill("Devis@PointP.fr");
  // Lot final, point 2 : une adresse générale est signalée gentiment, sans bloquer.
  await expect(page.getByText("C'est une adresse générale. Si tu as celle de ton commercial, mets plutôt la sienne : il répondra plus vite.")).toBeVisible();
  await page.getByLabel("Son prénom (si tu le connais)").fill("Paul");
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
  // §50.7 : « Demander les prix à mes négoces » ne montre plus d'aperçu (le document, c'est l'écran) : on y choisit seulement les
  // fournisseurs, dont un créé sur place.
  await page.getByRole("button", { name: "Demander les prix à mes négoces" }).click();
  const apercu = page.getByRole("dialog", { name: "À qui j'envoie ?" });
  await expect(apercu.getByRole("heading", { name: "À qui j'envoie ?" })).toBeVisible();
  // Retour du fondateur (2026-10-10) : « les fournisseurs cochés par défaut, avec possibilité d'en ajouter un facilement ».
  await expect(apercu.getByRole("checkbox", { name: /Point.P Vannes/ })).toBeChecked();
  await apercu.getByRole("button", { name: "Ajouter un fournisseur" }).click();
  await apercu.getByLabel("Société").fill("Tuiles & Co");
  await apercu.getByLabel("E-mail de ton commercial").fill("devis@tuiles.fr");
  await apercu.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(apercu.getByRole("checkbox", { name: /Tuiles & Co/ })).toBeChecked();
  await expect(apercu.getByRole("article", { name: "Demande de devis" })).toHaveCount(0);
  await apercu.getByRole("button", { name: "Continuer" }).click();
  // Lot final, point 4 : « Voici ce que ton négoce va recevoir » : l'objet et le mail mot pour mot, au prénom du commercial,
  // signé du prénom et de l'entreprise ; seul le texte libre se modifie ; « Le tutoyer » ; un seul bouton, « Envoyer ».
  const recoit = page.getByRole("dialog", { name: "Voici ce que ton négoce va recevoir" });
  const mail = recoit.getByLabel("Le mail à ton négoce");
  await expect(mail).toContainText(/Objet : .+ : demande de prix/);
  await expect(mail).toContainText("Bonjour Paul,");
  await expect(mail).toContainText("Je consulte plusieurs fournisseurs, réponse souhaitée avant le");
  await expect(mail).toContainText("Vous pouvez aussi répondre directement à ce mail, il m'arrive.");
  await expect(mail).toContainText("Un doute ? Appelez-moi au 06 12 34 56 78.");
  await expect(mail).toContainText("Mobiiz, des artisans qui achètent ensemble.");
  await recoit.getByRole("button", { name: "Modifier le message" }).click();
  await recoit.getByLabel("Ton message").fill("Pouvez-vous me chiffrer cette liste pour la semaine prochaine ?");
  await recoit.getByRole("button", { name: "Garder ce message" }).click();
  await expect(mail).toContainText("Pouvez-vous me chiffrer cette liste pour la semaine prochaine ?");
  await recoit.getByRole("button", { name: "Le tutoyer" }).click();
  await expect(mail).toContainText("Salut Paul,");
  await recoit.getByRole("button", { name: "Le vouvoyer" }).click();
  await expect(mail).toContainText("Bonjour Paul,");
  await recoit.getByRole("button", { name: "Envoyer", exact: true }).click();
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
  await menu(pointp, "Voir la demande de devis (PDF)");
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
  // Point 8 (Greg, 28 octobre 2026) : en attente, pas de bouton principal, seulement l'état.
  await expect(page.getByText("Demande envoyée à 2 négoces. Tu seras prévenu à chaque réponse.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Demander les prix à mes négoces" })).toHaveCount(0);
  // La demande est partie : la liste se replie en une ligne, « Ma liste · N lignes », sous les réponses ; un appui la rouvre.
  const repliee = page.getByRole("button", { name: /^Ma liste · \d+ lignes?/ });
  await expect(repliee).toBeVisible();
  const [haut, bas] = await Promise.all([pointp.boundingBox(), repliee.boundingBox()]);
  expect(haut!.y).toBeLessThan(bas!.y);
  await repliee.click();
  // Le gros bouton de la liste ne propose plus un premier envoi.
  const liste = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(liste.getByRole("button", { name: "Voir la demande envoyée" })).toBeVisible();
  await expect(liste.getByRole("button", { name: "Demander les prix à mes négoces" })).toHaveCount(0);
  await backToSite(page);
  // Le menu « ··· » du chantier porte les actions secondaires de l'étape.
  await page.getByRole("button", { name: "Plus d'actions sur le chantier" }).click();
  const actions = page.getByRole("menu", { name: "Actions sur le chantier" });
  for (const item of ["Ajouter un négoce", "Renvoyer à un négoce", "Modifier ma liste", "Supprimer la demande"]) await expect(actions.getByRole("menuitem", { name: item })).toBeVisible();
  await page.getByRole("button", { name: "Plus d'actions sur le chantier" }).click();
  // Pour tester sans attendre, un devis fictif peut être simulé (dans le menu).
  await pointp.getByRole("button", { name: /^Plus d'actions/ }).click();
  await expect(pointp.getByRole("menuitem", { name: "Test : simuler un devis fictif" })).toBeVisible();
  await pointp.getByRole("button", { name: /^Plus d'actions/ }).click();

  // Le devis du fournisseur arrive (téléphone, comptoir) : on le range sur sa carte, depuis son menu.
  await menu(pointp, "Ajouter son devis reçu");
  await pointp.getByLabel("Ajouter son devis (PDF ou photos)").setInputFiles(path.join(__dirname, "fixtures", "devis-fournisseur-couvreur.pdf"));
  await expect(pointp.getByText("Devis reçu")).toBeVisible();
  await page.reload();
  await expect(pointp.getByText("Devis reçu")).toBeVisible();
  // Point 7 : aucune lecture IA, ni « Comparer » ; le devis s'ouvre tel quel.
  await expect(page.getByRole("button", { name: /^(Comparer les offres|Voir l'offre reçue|Réessayer)$/ })).toHaveCount(0);
  await expect(pointp.getByRole("button", { name: "Ouvrir le devis (PDF)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Voir le devis reçu" })).toBeVisible();

  // Le même PDF ne peut pas aller chez un second fournisseur.
  await menu(tuiles, "Ajouter son devis reçu");
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

  // L'action de l'étape : « Voir les devis reçus », puis « Je retiens ce négoce ».
  await expect(page.getByRole("region", { name: "Suivi du chantier" })).toContainText("2 devis reçus sur 2 demandes.");
  await page.getByRole("button", { name: "Voir les devis reçus" }).click();
  const feuille = page.getByRole("dialog", { name: "Devis reçus" });
  await expect(feuille.getByLabel(/^Devis de /)).toHaveCount(2);
  await feuille.getByLabel("Devis de Point.P Vannes").getByRole("button", { name: "Je retiens ce négoce" }).click();
  await expect(feuille).toHaveCount(0);
  const commande = page.getByRole("status", { name: "Commandé" });
  await expect(commande).toContainText("Commandé chez Point.P Vannes.");
  await expect(page.getByRole("button", { name: /^Voir les devis reçus$/ })).toHaveCount(0);

  // Tout est conservé ; « Changer de négoce » rouvre le choix.
  await page.reload();
  await expect(commande).toContainText("Commandé chez Point.P Vannes.");
  await page.getByRole("button", { name: "Plus d'actions sur le chantier" }).click();
  await page.getByRole("menuitem", { name: "Changer de négoce" }).click();
  await expect(page.getByRole("button", { name: "Voir les devis reçus" })).toBeVisible();
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
  await expect(page.getByText("Articles que Mobiiz ne connaît pas encore")).toHaveCount(0);
  await confirmDoubts(page);
  // Gardés tels qu'écrits, à la pièce : la ligne est verte, prête à partir.
  const skimmer = list.getByRole("listitem").filter({ hasText: "Skimmer pour piscine liner" }).first();
  // Point 2 (Greg, 28 octobre 2026) : une ligne prête n'a rien de spécial ; ni marque, ni « Valider ».
  await expect(skimmer.getByRole("img")).toHaveCount(0);
  await expect(skimmer.getByRole("button", { name: /^(Valider|À préciser, ouvrir) : / })).toHaveCount(0);
  await page.reload();
  await openList(page);
  await expect(list.getByRole("listitem").filter({ hasText: "Skimmer pour piscine liner" }).first()).toBeVisible();
});

test("mode démo : tout le parcours avec un chantier et des fournisseurs fictifs", { tag: "@lots" }, async ({ page }) => {
  passeLots();
  await signUp(page);
  await menuArtisan(page, "Essayer avec un chantier fictif");
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
  await page.getByRole("button", { name: "Demander les prix à mes négoces" }).click();
  const apercu = page.getByRole("dialog", { name: "À qui j'envoie ?" });
  for (const name of ["Tuilerie de l'Ouest (démo)", "Négoce Breizh (démo)", "Matériaux Atlantique (démo)"]) {
    await apercu.getByRole("checkbox", { name: new RegExp(name.replace(/[()]/g, "\\$&")) }).check();
  }
  await apercu.getByRole("button", { name: "Continuer" }).click();
  // Lot final, point 4 : « Voici ce que ton négoce va recevoir », puis « Envoyer ».
  await page.getByRole("dialog", { name: "Voici ce que ton négoce va recevoir" }).getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(page.getByRole("list", { name: "Tes fournisseurs" })).toBeVisible();

  const cards = page.getByRole("list", { name: "Tes fournisseurs" }).getByRole("listitem");
  for (const name of ["Tuilerie de l'Ouest", "Négoce Breizh", "Matériaux Atlantique"]) {
    const card = cards.filter({ hasText: name });
    await card.getByRole("button", { name: "Simuler sa réponse (démo)" }).click();
    await expect(card.getByText("Devis reçu")).toBeVisible();
  }
  // Point 7 (28 octobre 2026) : plus de lecture IA ; les devis s'ouvrent et l'artisan retient un négoce.
  await page.getByRole("button", { name: "Voir les devis reçus" }).click();
  const feuille = page.getByRole("dialog", { name: "Devis reçus" });
  await expect(feuille.getByRole("button", { name: "Ouvrir le devis (PDF)" })).toHaveCount(3);
  await feuille.getByLabel("Devis de Négoce Breizh (démo)").getByRole("button", { name: "Je retiens ce négoce" }).click();
  await expect(page.getByRole("status", { name: "Commandé" })).toContainText("Commandé chez Négoce Breizh (démo).");
});

test("accueil : la prochaine action de chaque chantier, puis l'essai et les formules", async ({ page }) => {
  await signUp(page);
  const todo = page.getByRole("region", { name: /à faire|Tout est à jour/i });
  await createProject(page, "Toiture Garnier", "M. Garnier", "5 rue du Port, 56000 Vannes");
  await page.goto("/");
  // Greg (23 octobre) : commande du mois, plus d'« Ajouter le devis client » ; un chantier vide n'a rien à faire, et le
  // bloc de la commande du mois est en haut avec « Dépose ta liste avant le JJ/MM ».
  await expect(todo.getByRole("link", { name: "Ajouter le devis client" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /^Bonjour Jean$/ })).toBeVisible();
  await expect(page.getByText(/Comparer les offres|offres reçues|on avance/)).toHaveCount(0);
  // Recentrage (Greg, 25 octobre 2026, maquette) : l'accueil dit « Bonjour », le gros « Nouveau chantier », puis les
  // chantiers ; plus de bloc de la commande du mois (il vit dans l'onglet Regroupements).
  await expect(page.getByRole("link", { name: "Ma liste de matériaux" })).toHaveAttribute("href", "/chantiers/nouveau");
  await expect(page.getByRole("region", { name: /^Commande d/ })).toHaveCount(0);

  // Essai : 3 chantiers. Au 4e, l'écran des formules, sans jargon ni crédits.
  await createProject(page, "Chantier 2", "", "");
  // « Client non renseigné » n'existe plus : un chantier sans client ni adresse n'a rien sous son nom.
  await page.goto("/chantiers");
  await expect(page.getByText("Chantier 2")).toBeVisible();
  await expect(page.getByText("Client non renseigné")).toHaveCount(0);
  await createProject(page, "Chantier 3", "", "");
  await page.goto("/chantiers/nouveau");
  await expect(page.getByRole("heading", { name: "Ton essai est terminé" })).toBeVisible();
  await expect(page.getByText("Continue à utiliser Mobiiz pour lire tes devis et comparer tes fournisseurs.")).toBeVisible();
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
  expect((await download).suggestedFilename()).toMatch(/^mobiiz-mes-donnees-\d{4}-\d{2}-\d{2}\.json$/);
  // Le même contenu en PDF, et le réglage des e-mails (RGPD, 24 octobre 2026).
  await expect(page.getByRole("link", { name: "En PDF" })).toHaveAttribute("href", "/v1/me/export.pdf");
  const pdf = await page.request.get("/v1/me/export.pdf");
  expect(pdf.headers()["content-type"]).toMatch(/application\/pdf/);
  const recevoir = page.getByRole("checkbox", { name: /Recevoir les e-mails/ });
  await expect(recevoir).toBeChecked();
  await recevoir.uncheck();
  await expect(recevoir).not.toBeChecked();
  expect(((await page.request.get("/v1/me/emails")).ok())).toBe(true);
  // Un lien « Ne plus recevoir » ou « Ne plus être contacté » faux ne coupe rien.
  await page.goto("/emails/stop/faux");
  await expect(page.getByText("Ce lien n'est plus valable.")).toBeVisible();
  await page.goto("/negoce/opposition/faux");
  await expect(page.getByText("Ce lien n'est plus valable.")).toBeVisible();
  await page.goto("/compte");

  // Des essais au hasard ne restent pas des habitudes : on efface ce que BatiClair a appris, les chantiers restent.
  await page.getByRole("button", { name: "Effacer ce que Mobiiz a appris" }).click();
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
  // §52 : un devis d'un seul lot n'a pas de carte « Parties du devis ».
  await expect(page.getByRole("region", { name: "Parties du devis" })).toHaveCount(0);
  // §51.5 : la lecture ne porte plus les titres de logement de l'ancien extracteur ; la liste est celle du devis, dans son ordre.
  await expect(page.getByRole("tab", { name: /Par logement/ })).toHaveCount(0);
  await openList(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(list.getByRole("listitem").filter({ hasText: "Prise 2P+T 16 A" }).first()).toBeVisible();
  await expect(list.getByRole("listitem").filter({ hasText: "Tableau électrique" }).first()).toBeVisible();
});

test("§52 : la carte « Parties du devis » : retirer un lot, en ajouter un, « C'est bon », une section par lot gardé", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Immeuble Les Tilleuls", "SCI Les Tilleuls", "8 rue des Tilleuls, Vannes");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-multi-lots.pdf"));
  // Directive du fondateur (2026-10-13) : après la lecture, « Parties du devis : Électricité · VMC · Sanitaire ».
  const carte = page.getByRole("region", { name: "Parties du devis" });
  await expect(carte.getByRole("heading", { name: "Parties du devis : Électricité · VMC · Sanitaire" })).toBeVisible({ timeout: 60_000 });
  // Un bouton par lot pour le retirer ; la VMC n'est pas un lot à part ici.
  await carte.getByRole("button", { name: "Retirer la partie VMC" }).click();
  await expect(carte.getByRole("heading", { name: "Parties du devis : Électricité · Sanitaire" })).toBeVisible();
  // « Ajouter un lot » : les métiers qui ont leur référentiel.
  await carte.getByRole("button", { name: "Ajouter une partie" }).click();
  await carte.getByRole("group", { name: "Ajouter une partie" }).getByRole("button", { name: "Maçonnerie" }).click();
  await expect(carte.getByRole("heading", { name: "Parties du devis : Électricité · Sanitaire · Maçonnerie" })).toBeVisible();
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
  await expect(list.getByRole("button", { name: "Demander les prix à mes négoces" })).toBeVisible();
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
  await expect(actions.getByRole("button", { name: "Demander les prix à mes négoces" })).toBeInViewport();
  // L'aperçu : l'objet et le mail mot pour mot, et le PDF joint qui s'ouvre dans BatiClair. Rien ne part.
  await actions.getByRole("button", { name: "Aperçu" }).click();
  const apercu = page.getByRole("dialog", { name: "Ce que reçoit le fournisseur" });
  await expect(apercu.getByText("Objet :")).toBeVisible();
  // Lot final, point 3 : l'objet est « Entreprise : demande de prix [famille], [commune] ».
  await expect(apercu.getByText(/: demande de prix/).first()).toBeVisible();
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
  await apercu.getByRole("button", { name: "Demander les prix à mes négoces" }).click();
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
  await expect(actions.getByRole("button", { name: "Demander les prix à mes négoces" })).toBeInViewport();
  // « Envoyer » : rien ne part, la phrase dit pourquoi et la première ligne orange vient à l'écran.
  await actions.getByRole("button", { name: "Demander les prix à mes négoces" }).click();
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
  // « Demander les prix à mes négoces » tient sur une ligne, même sur un iPhone étroit (375 px).
  await page.setViewportSize({ width: 375, height: 812 });
  const envoyer = page.getByRole("group", { name: "Envoyer la liste" }).getByRole("button", { name: "Demander les prix à mes négoces" });
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
  await expect(list.getByRole("button", { name: "Demander les prix à mes négoces" })).toBeVisible();
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
  // Point 2 (Greg, 28 octobre 2026) : « N lignes à vérifier », un bouton qui amène à la première ; rien d'autre.
  const bar = list.getByRole("button", { name: /^\d+ lignes? à vérifier$/ });
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
  await expect(page.getByRole("button", { name: /Demander les prix à mes négoces/ })).toHaveCount(0);
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
  // 1. Un bouton pour le devis (point 31 du 27 octobre 2026 : « Depuis mon devis — on t'avance »).
  await expect(page.getByText("Depuis mon devis — on t'avance", { exact: true })).toBeVisible();
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
  await expect(list.getByRole("button", { name: /^\d+ lignes? à vérifier$/ })).toBeVisible();
  // Nouveau cap (22 octobre) : un gros « + Ajouter » sous les cartes ; plus de petits liens sous l'envoi.
  await expect(list.getByRole("button", { name: "Ajouter un article" })).toHaveText("Ajouter");
  await expect(list.getByRole("navigation", { name: "Autres gestes sur la liste" })).toHaveCount(0);

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
  // « Demander les prix à mes négoces » ne montre plus d'aperçu : seulement « À qui j'envoie ? ».
  await confirmDoubts(page);
  await list.getByRole("button", { name: "Demander les prix à mes négoces" }).click();
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
  // Greg, 28 octobre 2026 (point 2) : plus de légende ; l'état est sur la ligne (bordure orange, « Valider » à droite).
  await expect(list.getByText("Prêt à commander", { exact: true })).toHaveCount(0);
  await expect(list.getByText("À préciser : coche pour valider")).toHaveCount(0);
  await expect(list.getByRole("button", { name: /^(Valider|À préciser, ouvrir) : / }).first()).toBeVisible();
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

test("BatiClair Groupé, étape 2 : proposer des lignes au groupé, s'engager, passer en signé, retirer", { tag: "@lots" }, async ({ page }) => {
  passeLots();
  await signUp(page);
  const adresse = adresseDuProjet();
  await createProject(page, "Toiture Le Groupé", "M. Le Bihan", adresse);
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  await passQuestions(page);
  await confirmDoubts(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  // Sans SIRET vérifié, le groupé n'existe pas à l'écran (gratuit pour l'artisan : l'abonnement n'y est pour rien).
  await expect(list.getByRole("button", { name: "Ajouter au regroupement" })).toHaveCount(0);

  // SIRET renseigné puis vérifié (hors production : sans appel INSEE) ; le compte reste en essai gratuit.
  expect(await apiCall(page, "PATCH", "/v1/company/profile", { name: "Toitures Martin", address: adresse, siret: "73282932000074", phone: null, email: null })).toBe(200);
  expect(await apiCall(page, "POST", "/v1/groupe/siret")).toBe(200);
  await page.reload();

  const proposer = list.getByRole("button", { name: "Ajouter au regroupement" });
  await expect(proposer).toBeVisible();
  await proposer.click();
  await expect(list.getByText("Coche ce que tu ajoutes au regroupement. Ton nom ne part pas avec.")).toBeVisible();
  const boxes = list.getByRole("checkbox", { name: /^Ajouter au regroupement : / }).and(page.locator(":enabled"));
  // Rien de coché d'office : l'engagement se choisit ligne par ligne.
  await expect(boxes.first()).not.toBeChecked();
  await boxes.first().check();
  const bar = page.getByRole("region", { name: "Ajouter au regroupement", exact: true });
  await expect(bar.getByText("1 ligne pour le regroupement")).toBeVisible();
  // « Chantier signé » : « Proposer » attend la phrase d'engagement.
  await bar.getByRole("radio", { name: "Chantier signé" }).click();
  await expect(bar.getByRole("button", { name: "Proposer" })).toBeDisabled();
  await bar.getByRole("checkbox", { name: /je m'engage à commander ces quantités au prix obtenu par le regroupement, chez le négoce retenu/ }).check();
  await bar.getByRole("button", { name: "Proposer" }).click();

  const groupe = page.getByRole("region", { name: "Dans le regroupement", exact: true });
  await expect(groupe.getByText("Chantier signé", { exact: true })).toBeVisible();
  await expect(groupe.getByRole("button", { name: "Retirer du regroupement" })).toBeVisible();

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
  await groupe.getByRole("button", { name: "Retirer du regroupement" }).first().click();
  await expect(groupe.getByRole("button", { name: "Retirer du regroupement" })).toHaveCount(1);
  await groupe.getByRole("button", { name: "Retirer du regroupement" }).click();
  await expect(groupe).toHaveCount(0);
  // Sur iPhone, rien ne déborde.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("BatiClair Groupé, étape 3 : « Mes négoces », e-mail, familles, favori, message type", { tag: "@ancien" }, async ({ page }) => {
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
  // Multi-agences : le même e-mail peut déjà exister dans un autre département (base e2e partagée), d'où « (aussi en 44) ».
  await expect(premier).toContainText(/ardoises@example\.com · 35( \(aussi en [^)]*\))? · Couverture/);
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

test("BatiClair Groupé, étape 5 : la page du lien « pas concerné » (confirmée d'un bouton) et la page de réponse d'un lien inconnu", { tag: "@ancien" }, async ({ page }) => {
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

test("BatiClair Groupé, l'onglet : visible sans SIRET ni devis, trois étapes cochées une à une, puis « Mes commandes groupées » ; le bloc en haut de « Ton chantier »", { tag: "@lots" }, async ({ page }) => {
  passeLots();
  await signUp(page);
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  await nav.getByRole("link", { name: "Regroupement" }).click();
  await expect(page).toHaveURL(/\/groupe$/);
  await expect(page.getByRole("heading", { name: "Regroupement" })).toBeVisible();
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
  const ferme = page.getByRole("region", { name: "Regroupement fermée" });
  await expect(ferme.getByText("Renseigne ton SIRET pour rejoindre le regroupement")).toBeVisible();
  await expect(page.getByRole("region", { name: "Ajouter au regroupement" })).toHaveCount(0);
  await ferme.getByRole("link", { name: "Regroupement" }).click();
  await expect(page).toHaveURL(/\/groupe$/);
  await expect(manque.getByLabel("Fait")).toHaveCount(1);
  // SIRET renseigné : « Vérifier mon SIRET » le coche ; « Ton chantier » montre alors le bloc « Proposer au groupé » en haut.
  expect(await apiCall(page, "PATCH", "/v1/company/profile", { name: "Toitures Martin", address: "3 quai Duguay-Trouin, 35400 Saint-Malo", siret: "73282932000074", phone: null, email: null })).toBe(200);
  await page.reload();
  await manque.getByRole("button", { name: "Vérifier mon SIRET" }).click();
  await expect(manque.getByLabel("Fait")).toHaveCount(2);
  await expect(manque.getByLabel("À faire")).toHaveCount(1);
  await page.goto(chantier);
  const bloc = page.getByRole("region", { name: "Ajouter au regroupement" });
  await expect(bloc).toBeVisible();
  await expect(bloc.getByRole("button", { name: "Ajouter au regroupement" })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(bloc).toBeInViewport();
  await expect(page.getByRole("region", { name: "Regroupement fermée" })).toHaveCount(0);
  // Sur téléphone, le chantier se lit en plein écran sans la barre du menu : retour à l'onglet par l'adresse.
  await page.goto("/groupe");
  await expect(manque.getByLabel("Fait")).toHaveCount(2);
  // Les négoces : tout est coché, l'onglet montre « Mes commandes groupées », vide.
  expect(await apiCall(page, "POST", "/v1/groupe/negoces", { nom: "Négoce Ardoises", email: "ardoises@example.com", familles: ["couverture"] })).toBe(201);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Mes regroupements" })).toBeVisible();
  await expect(page.getByText("Rien pour l'instant : ajoute un chantier au regroupement.")).toBeVisible();
  await expect(manque).toHaveCount(0);
  // Étape 7 : le compteur « Économisé grâce au groupé » dans Compte, à zéro.
  await page.goto("/compte");
  const economies = page.getByRole("region", { name: "Économisé grâce au regroupement" });
  await expect(economies).toContainText("0,00 €");
  await expect(economies).toContainText("Aucune regroupement pour l'instant.");
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
/** Le code à 6 chiffres de l'admin : demandé, lu dans la boîte de test, saisi (Greg, 26 octobre 2026). */
async function codeAdminRecu(page: Page, email: string, bouton: string): Promise<void> {
  await page.getByRole("button", { name: "Recevoir mon code" }).click();
  await expect(page.getByLabel("Code reçu par e-mail")).toBeVisible();
  const mail = (await emailsVers(page, email)).filter((m) => /code d'accès au pilotage/.test(m.subject)).at(-1)!;
  await page.getByLabel("Code reçu par e-mail").fill(/(\d{6})/.exec(mail.text)![1]!);
  await page.getByRole("button", { name: bouton }).click();
}

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
  await list.getByRole("button", { name: "Ajouter au regroupement" }).click();
  const boxes = list.getByRole("checkbox", { name: /^Ajouter au regroupement : / }).and(page.locator(":enabled"));
  await boxes.first().check();
  const bar = page.getByRole("region", { name: "Ajouter au regroupement", exact: true });
  await bar.getByRole("radio", { name: statut }).click();
  if (statut === "Chantier signé") await bar.getByRole("checkbox", { name: /je m'engage à commander ces quantités au prix obtenu par le regroupement, chez le négoce retenu/ }).check();
  await bar.getByRole("button", { name: "Proposer" }).click();
}

async function artisanAuGroupe(page: Page, entreprise: string, adresse: string): Promise<void> {
  await compteAuGroupe(page, entreprise, adresse);
  await chantierAuGroupe(page, `Toiture ${entreprise}`, adresse);
  // « Chantier signé » tant que le lot attend ; « Engagé, lot parti » quand ce signé a formé le lot et que la demande est partie.
  await expect(page.getByRole("region", { name: "Dans le regroupement", exact: true }).getByText(/^(Chantier signé|Parti chez les négoces, tu es engagé)$/)).toBeVisible();
}

/** La dernière demande de prix reçue par un négoce (la boîte de test garde celles des parcours précédents). */
async function derniereDemande(page: Page, negoce: string, dejaRecus: number) {
  // Nouveau cap (22 octobre) : un négoce ajouté reçoit d'abord le mail qui le prévient du regroupement ; on attend la demande.
  const demandes = async () => (await emailsVers(page, negoce)).slice(dejaRecus).filter((m) => m.subject.includes("Regroupement"));
  await expect.poll(async () => (await demandes()).length, { timeout: 20_000 }).toBeGreaterThan(0);
  return (await demandes()).at(-1)!;
}

/** Décision de Greg (22 octobre) : le négoce donne son dépôt, « gratuite jusqu'à X km » et « Y € au-delà » (obligatoire). */
async function prixDeLivraison(form: Locator, prix = "45") {
  await form.getByLabel("Adresse d'où partent vos livraisons").fill("Zone de Kerampont, 22300 Lannion");
  await form.getByLabel("Livraison gratuite jusqu'à, en km").fill("30");
  await form.getByLabel("Prix d'une livraison au-delà, en euros HT").fill(prix);
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
  const pageN = await passeGuide(await contexteN.newPage());
  await pageN.goto(lien);
  await expect(pageN.getByRole("heading", { name: /^Demande de prix, lot n° \d+/ })).toBeVisible();
  const form = pageN.getByRole("form", { name: "Déposer mon devis" });
  await form.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures", fixture));
  await form.getByRole("checkbox", { name: "J'accepte les conditions" }).check();
  await prixDeLivraison(form, "60");
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

test("BatiClair Groupé, étape 8 : un lot de bout en bout, deux artisans, deux négoces qui répondent par e-mail, dépôt avec la case des conditions, choix, bon de commande, « Livré »", { tag: "@lots" }, async ({ page, browser }) => {
  passeLots();
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
  await expect(page.getByRole("region", { name: "Dans le regroupement", exact: true }).getByText(/^(Chantier signé|Parti chez les négoces, tu es engagé)$/)).toBeVisible();
  const contexteB = await browser.newContext({ ...(test.info().project.use as object) });
  const pageB = await passeGuide(await contexteB.newPage());
  await artisanAuGroupe(pageB, "Toitures Le Bihan", adresseB);
  // La demande est partie aux deux négoces, avec l'adresse de réponse du lot.
  const demande = await derniereDemande(page, "ardoises@example.com", dejaRecus);
  expect(demande.replyTo).toMatch(/^lot-\d+@reponses\.example\.com$/);
  await derniereDemande(page, "general@example.com", dejaRecusB);
  await expect(page.getByRole("region", { name: "Dans le regroupement", exact: true })).toBeVisible();
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
    const pageN = await passeGuide(await contexteN.newPage());
    await pageN.goto(lien);
    await expect(pageN.getByRole("heading", { name: /^Demande de prix, lot n° \d+/ })).toBeVisible();
    await expect(pageN.getByRole("list", { name: "Chantiers à livrer" }).getByRole("listitem")).toHaveCount(2);
    await expect(pageN.getByText("Toitures Martin")).toHaveCount(0);
    // Plan « finition » : zéro bouton mort sur la page du négoce (liens du contrat et des pages légales compris).
    expect(await toutCliquer(pageN, "page du négoce", async () => {
      await pageN.goto(lien);
      await pageN.waitForLoadState("networkidle");
    })).toEqual([]);
    const form = pageN.getByRole("form", { name: "Déposer mon devis" });
    await expect(form.getByRole("link", { name: /Lire les conditions/ })).toHaveAttribute("href", /contrat\.pdf$/);
    await form.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures", "devis-fournisseur-couvreur.pdf"));
    await expect(form.getByRole("button", { name: "Déposer mon devis" })).toBeDisabled();
    await form.getByRole("checkbox", { name: "J'accepte les conditions" }).check();
    // Décision de Greg (22 octobre) : la livraison (dépôt, gratuite jusqu'à X km, Y € au-delà) est obligatoire.
    await expect(form.getByRole("button", { name: "Déposer mon devis" })).toBeDisabled();
    await prixDeLivraison(form);
    await form.getByRole("button", { name: "Déposer mon devis" }).click();
    await expect(pageN.getByRole("status")).toContainText("Devis reçu, merci.");
    expect(await pageN.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await contexteN.close();
  }
  // Le second, de la même façon.
  await negoceDepose(page, browser, "general@example.com", demande.replyTo!, "devis-fournisseur-2.pdf");
  // Tous ont répondu : le négoce est retenu, le bon de commande est parti, chaque artisan voit son offre et peut dire « Livré ».
  await page.goto("/groupe");
  const lots = page.getByRole("list", { name: "Mes regroupements" });
  await expect(lots.getByText(/Négoce retenu/)).toBeVisible({ timeout: 20_000 });
  await expect(lots.getByText(/€ HT l'unité chez Négoce/)).toBeVisible();
  // Nouveau cap (22 octobre) : le compteur du groupe, sans nom ni chantier des autres.
  await expect(lots.getByLabel("Compteur du groupe")).toHaveText(/^2 couvreurs, 2 demandes envoyées, 2 devis reçus/);
  await expect(lots.getByText("Toitures Le Bihan")).toHaveCount(0);
  await lots.getByRole("button", { name: "Livré" }).click();
  await expect(lots.getByText("Livré, merci.")).toBeVisible();
  // Le bon de commande est parti chez le négoce retenu ; aucune facture (Greg, 24 octobre 2026 : `FACTURATION_NEGOCE=off`).
  const auNegoce = [...(await emailsVers(page, "ardoises@example.com")), ...(await emailsVers(page, "general@example.com"))];
  expect(auNegoce.some((m) => /bons? de commande/.test(m.subject))).toBe(true);
  expect(auNegoce.some((m) => /^Facture n°/.test(m.subject))).toBe(false);
  // B voit aussi son offre, sans le nom de A.
  await pageB.goto("/groupe");
  const lotsB = pageB.getByRole("list", { name: "Mes regroupements" });
  await expect(lotsB.getByText(/Négoce retenu/)).toBeVisible();
  await expect(lotsB.getByText("Toitures Martin")).toHaveCount(0);
  // Plan « finition » : zéro bouton mort sur le regroupement avec une offre, un bon parti et une livraison dite.
  expect(await toutCliquer(pageB, "Regroupement avec offre", async () => {
    await pageB.goto("/groupe");
    await pageB.waitForLoadState("networkidle");
  })).toEqual([]);
  await contexteB.close();
});

test("BatiClair Groupé, étape 9 : l'admin (Greg seul) voit les lots, le journal d'un lot, les factures et leur export CSV", { tag: "@lots" }, async ({ page }) => {
  passeLots();
  test.setTimeout(600_000);
  // Un artisan ordinaire ne voit pas le lien ; le compte admin (GROUPE_ADMINS) le voit sur l'onglet Groupé.
  await signUp(page);
  await page.goto("/groupe");
  await expect(page.getByRole("heading", { name: "Regroupement" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Admin regroupement" })).toHaveCount(0);
  expect(await page.evaluate(async () => (await fetch("/v1/admin/groupe")).status)).toBe(403);
  await page.context().clearCookies();
  // Le compte admin est unique (GROUPE_ADMINS) : créé au premier passage, retrouvé ensuite (téléphone puis ordinateur, même base).
  await page.goto("/connexion");
  await page.getByLabel("E-mail").fill("admin-groupe@example.fr");
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("heading", { name: /^(Bonjour|Paie tes matériaux moins cher)/ }).or(page.getByRole("alert").filter({ hasText: "incorrect" }))).toBeVisible();
  if (await page.getByRole("alert").filter({ hasText: "incorrect" }).count()) await signUp(page, "admin-groupe@example.fr");
  await page.goto("/groupe");
  await page.getByRole("link", { name: "Admin regroupement" }).click();
  // Sécurité (Greg, 26 octobre 2026) : l'admin des commandes communes demande aussi le code à 6 chiffres de la session.
  await codeAdminRecu(page, "admin-groupe@example.fr", "Ouvrir les commandes communes");
  await expect(page.getByRole("heading", { name: "Admin regroupement" })).toBeVisible();
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
  // Plan « finition », bloc 6 : « Clore le lot » demande « Oui » ou « Non » ; « Non » ne change rien.
  await rubriques.getByRole("button", { name: "Lots" }).click();
  const premierLot = page.getByRole("list", { name: "Lots" }).getByRole("listitem").first();
  if (await premierLot.getByRole("button", { name: "Clore le lot" }).count()) {
    await premierLot.getByRole("button", { name: "Clore le lot" }).click();
    const confirmation = page.getByRole("alertdialog", { name: /^Clore le lot n° \d+ \? Il ne reçoit plus rien, c'est définitif\.$/ });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole("button", { name: "Non" }).click();
    await expect(confirmation).toHaveCount(0);
    await expect(premierLot.getByRole("button", { name: "Clore le lot" })).toBeVisible();
  }
  // Plan « finition » : zéro bouton mort dans l'admin. Forcer, Clore et Annuler ouvrent leur confirmation (cliqués) ;
  // les gestes qui changent un lot des autres parcours (« Oui, … », retenir un autre négoce, payée) sont vérifiés par
  // le test API `groupe-admin`.
  const gestes = /^(Oui, clore|Oui, annuler|Oui, forcer|Retenir ce négoce|Payée)$/;
  const defauts: string[] = [];
  for (const rubrique of ["Lots", "Négoces", "Accords", "Factures", "Exclusions"]) {
    defauts.push(
      ...(await toutCliquer(page, `admin, ${rubrique}`, async () => {
        await page.goto("/admin/groupe");
        await page.waitForLoadState("networkidle");
        const bouton = rubriques.getByRole("button", { name: rubrique });
        if (await bouton.count()) await bouton.click();
      }, gestes)),
    );
  }
  expect(defauts).toEqual([]);
});

test("Pages légales : mentions légales, CGU, conditions négoce et confidentialité, lisibles sans compte ; l'acceptation des CGU est gardée", async ({ page }) => {
  await page.goto("/mentions-legales");
  await expect(page.getByRole("heading", { name: "Mentions légales" })).toBeVisible();
  await expect(page.getByText(/édité par BATI INVEST, SARL au capital de .* SIRET 910 796 325 00017, dont le siège est situé 6 impasse du Ouipoure, 22620 Ploubazlanec/)).toBeVisible();
  await expect(page.getByText(/TVA intracommunautaire FR61910796325/)).toBeVisible();
  await expect(page.getByText(/Vercel Inc\./)).toBeVisible();
  // Greg, 26 octobre 2026 : le Kbis complet, le directeur de la publication, contact@mobiiz.fr, Neon ; plus aucun repère.
  await expect(page.getByText(/au capital de 1 000 €, immatriculée au RCS de Saint-Brieuc sous le numéro 910 796 325/)).toBeVisible();
  await expect(page.getByText("Directeur de la publication : Grégory Roy, gérant.")).toBeVisible();
  await expect(page.getByText(/Par e-mail : contact@mobiiz\.fr/)).toBeVisible();
  await expect(page.getByText(/Neon, LLC \(groupe Databricks, Inc\.\), 160 Spear Street/)).toBeVisible();
  await expect(page.getByText(/A COMPLETER/)).toHaveCount(0);
  await page.getByRole("navigation", { name: "Pages légales" }).getByRole("link", { name: "CGU" }).click();
  await expect(page.getByRole("heading", { name: "Conditions générales d'utilisation" })).toBeVisible();
  // L'abonnement (24 octobre 2026) : l'article 3 des CGU ; gratuit pour les négoces ; aucun « 2 % » sur les pages légales.
  await expect(page.getByRole("heading", { name: "3. L'abonnement" })).toBeVisible();
  await expect(page.getByText(/49 € HT par mois, sans engagement de durée/)).toBeVisible();
  await expect(page.getByText(/348 € HT par an, payés en une fois pour douze mois/)).toBeVisible();
  await expect(page.getByText(/un e-mail vous rappelle la date et le montant 30\s+jours avant le renouvellement/)).toBeVisible();
  await expect(page.getByText(/sans remboursement au prorata de la période commencée/)).toBeVisible();
  await expect(page.getByText(/Pas de droit de rétractation/)).toBeVisible();
  await expect(page.getByText(/tribunal de commerce de Saint-Brieuc/)).toBeVisible();
  await expect(page.getByText(/2 %/)).toHaveCount(0);
  await expect(page.getByText(/avocat/)).toHaveCount(0);
  await page.getByRole("navigation", { name: "Pages légales" }).getByRole("link", { name: "Conditions négoces" }).click();
  await expect(page.getByRole("heading", { name: "Conditions négoces" })).toBeVisible();
  // RGPD et concurrence (24 octobre 2026) : la formule unique, et les prix d'un négoce jamais montrés à un autre.
  await expect(page.getByText(/^Aucun frais pour l'instant\. BATI INVEST pourra introduire une commission ultérieurement, avec un préavis de 60 jours et l'accord du négoce\./)).toBeVisible();
  await expect(page.getByText(/Les prix d'un négoce ne sont jamais communiqués à un autre négoce/)).toBeVisible();
  // Greg, 26 octobre 2026 (point D) : une commission de 1 à 2 % sur les seuls regroupements négociés, et la non-sollicitation.
  await expect(page.getByText(/commission de 1 à 2 % du montant HT/)).toBeVisible();
  await expect(page.getByText(/(?<!à )2 %/)).toHaveCount(0);
  await expect(page.getByText("Non-sollicitation")).toBeVisible();
  await page.getByRole("navigation", { name: "Pages légales" }).getByRole("link", { name: "Confidentialité" }).click();
  await expect(page.getByRole("heading", { name: "Confidentialité" })).toBeVisible();
  // En tableau (24 octobre 2026) : chaque traitement, sa base légale, sa durée ; chaque sous-traitant, son pays, sa garantie.
  await expect(page.getByRole("table", { name: /base légale/ })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Neon, LLC (groupe Databricks, Inc.)" })).toBeVisible();
  await expect(page.getByText(/Ne plus recevoir ces e-mails/)).toBeVisible();
  await expect(page.getByText(/Resend/).first()).toBeVisible();
  await expect(page.getByText(/API Sirene de l'INSEE/)).toBeVisible();
  await expect(page.getByText(/API Adresse de l'État/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cookies" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/");
  // Plan « finition », bloc 4 : un lien négoce tronqué dit qu'il ne vaut plus, jamais « un champ mal rempli ».
  await page.goto("/negoces/lien/xxx");
  await expect(page.getByText("Ce lien n'est plus valable.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  // Le compte créé (case cochée) garde la date et la version des CGU.
  await signUp(page);
  const cgu = await page.evaluate(async () => (await (await fetch("/v1/me/cgu")).json()) as { accepteLe: string | null; version: string | null });
  expect(cgu.version).toBe("2026-10-27");
  expect(cgu.accepteLe).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

test("BatiClair Groupé, scénarios 1 : deux départements et deux références font des lots séparés, retrait avant départ, SIRET invalide, plafond 3 × médiane", { tag: "@lots" }, async ({ page, browser }) => {
  passeLots();
  test.setTimeout(240_000);
  // A (Côtes-d'Armor ou Finistère selon le projet) et B (Ille-et-Vilaine ou Morbihan) proposent la même référence : deux lots,
  // un par département. Un lot du même département peut déjà exister (autre parcours, même base) : il est alors formé, pas ouvert.
  const telephone = test.info().project.name === "telephone";
  const adresseA = telephone ? "4 rue de Kerampont, 22300 Lannion" : "5 rue de Siam, 29200 Brest";
  const adresseB = telephone ? "12 rue de Kerampont, 35400 Saint-Malo" : "2 rue Thiers, 56000 Vannes";
  await artisanAuGroupe(page, "Toitures Trégor", adresseA);
  const contexteB = await browser.newContext({ ...(test.info().project.use as object) });
  const pageB = await passeGuide(await contexteB.newPage());
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
  await expect(page.getByRole("list", { name: "Mes regroupements" }).getByText(/Regroupement n° \d+ · (On attend d'autres artisans|Commande prête|Demande partie)/)).toBeVisible();
  await contexteB.close();

  // A propose une deuxième référence : un autre lot ; puis la retire tant que rien n'est parti (section 4 a).
  await page.goto(`/chantiers/${lotsA[0] && (await apiJson<{ besoins: { projectId: string }[] }>(page, "GET", "/v1/groupe/lots")).body.besoins[0]!.projectId}`);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  await list.getByRole("button", { name: "Ajouter au regroupement" }).click();
  await list.getByRole("checkbox", { name: /^Ajouter au regroupement : / }).and(page.locator(":enabled")).first().check();
  const bar = page.getByRole("region", { name: "Ajouter au regroupement", exact: true });
  await bar.getByRole("radio", { name: "Chantier signé" }).click();
  await bar.getByRole("checkbox", { name: /je m'engage/ }).check();
  await bar.getByRole("button", { name: "Proposer" }).click();
  const groupe = page.getByRole("region", { name: "Dans le regroupement", exact: true });
  await expect(groupe.getByText(/^(Chantier signé|Parti chez les négoces, tu es engagé)$/)).toHaveCount(2);
  const apres = (await apiJson<{ besoins: Lot[] }>(page, "GET", "/v1/groupe/lots")).body.besoins;
  expect(apres).toHaveLength(2);
  expect(new Set(apres.map((b) => b.lot!.numero)).size).toBe(2);
  // La deuxième référence vient d'ouvrir son lot : retrait libre tant que rien n'est parti.
  await groupe.getByRole("button", { name: "Retirer du regroupement" }).last().click();
  await expect(groupe.getByText(/^(Chantier signé|Parti chez les négoces, tu es engagé)$/)).toHaveCount(1);
  expect((await apiJson<{ besoins: Lot[] }>(page, "GET", "/v1/groupe/lots")).body.besoins).toHaveLength(1);

  // Un SIRET mal formé (clé de Luhn fausse) : « Vérifier mon SIRET » le dit, le groupé reste fermé.
  const contexteS = await browser.newContext({ ...(test.info().project.use as object) });
  const pageS = await passeGuide(await contexteS.newPage());
  await signUp(pageS);
  expect(await apiCall(pageS, "PATCH", "/v1/company/profile", { name: "Toitures Siret", address: "1 rue du Port, 22500 Paimpol", siret: "12345678901234", phone: null, email: null })).toBe(200);
  await pageS.goto("/groupe");
  await pageS.getByRole("button", { name: "Vérifier mon SIRET" }).click();
  await expect(pageS.getByText("Ce SIRET n'a pas 14 chiffres valides : corrige-le dans Compte.")).toBeVisible();
  await expect(pageS.getByRole("list", { name: "Ce qui manque" }).getByLabel("Fait")).toHaveCount(0);
  await contexteS.close();

  // Le plafond (section 5) : A et B proposent 480 m de liteau chacun (la tuile, vague, n'entre pas dans le regroupement) ;
  // C en met 5 000 (plus de 3 × la médiane) : refusé, dit en clair.
  const contexteC = await browser.newContext({ ...(test.info().project.use as object) });
  const pageC = await passeGuide(await contexteC.newPage());
  await compteAuGroupe(pageC, "Toitures Plafond", adresseA);
  const projetC = await createProject(pageC, "Toiture Plafond", "M. Client", adresseA);
  await pageC.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  await passQuestions(pageC);
  await confirmDoubts(pageC);
  const takeoff = (await apiJson<{ takeoff: { lines: { id: string; designation: string; quantity: string | null; unit: string | null }[] } }>(pageC, "GET", `/v1/projects/${projetC}/takeoff`)).body.takeoff;
  const liteaux = takeoff.lines.find((l) => /liteau/i.test(l.designation))!;
  expect((await apiJson(pageC, "PATCH", `/v1/takeoff-lines/${liteaux.id}`, { designation: liteaux.designation, quantity: "5000", unit: liteaux.unit ?? "m" })).status).toBe(200);
  await pageC.reload();
  const listC = pageC.getByRole("region", { name: "Liste des fournitures" });
  await listC.getByRole("button", { name: "Ajouter au regroupement" }).click();
  await listC.getByRole("checkbox", { name: /^Ajouter au regroupement : Liteau/ }).check();
  const barC = pageC.getByRole("region", { name: "Ajouter au regroupement", exact: true });
  await barC.getByRole("radio", { name: "Chantier signé" }).click();
  await barC.getByRole("checkbox", { name: /je m'engage/ }).check();
  await barC.getByRole("button", { name: "Proposer" }).click();
  await expect(barC.getByRole("alert")).toContainText("Cette quantité dépasse trois fois ce que les autres artisans proposent");
  expect((await apiJson<{ besoins: Lot[] }>(pageC, "GET", "/v1/groupe/lots")).body.besoins).toHaveLength(0);
  await contexteC.close();
});

test("BatiClair Groupé, scénarios 2 : lot sans offre clos à 7 jours, négoce « pas concerné », désistement ×2 → exclusion 6 mois, nouveau lot refusé", { tag: "@lots" }, async ({ page, browser }) => {
  passeLots();
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
  const pageB = await passeGuide(await contexteB.newPage());
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
  await expect(page.getByRole("list", { name: "Mes regroupements" }).getByText(`Regroupement n° ${lot1} · Aucun négoce n'a répondu, commande fermée`)).toBeVisible();

  // 2) Deuxième lot : N1 dit « pas concerné » par le lien de l'e-mail ; N2 dépose ; N2 est retenu, les bons partent.
  avant = await recus();
  await chantierAuGroupe(page, "Toiture Nord 2", "3 quai Duguay-Trouin, 35400 Saint-Malo");
  await chantierAuGroupe(pageB, "Toiture Sud 2", "12 rue de Kerampont, 35400 Saint-Malo");
  const demande2 = await derniereDemande(page, N1, avant.n1);
  await derniereDemande(page, N2, avant.n2);
  const lienPasConcerne = /Pas concerné : (\S+)/.exec(demande2.text)![1]!.replace(/^https?:\/\/[^/]+/, "");
  const contexteN = await browser.newContext({ ...(test.info().project.use as object) });
  const pageN = await passeGuide(await contexteN.newPage());
  await pageN.goto(lienPasConcerne);
  await expect(pageN.getByText(/Négoce Ardoises : ne plus recevoir les demandes « Couverture » \?/)).toBeVisible();
  await pageN.getByRole("button", { name: "Confirmer" }).click();
  await expect(pageN.getByRole("status")).toContainText("C'est fait.");
  await contexteN.close();
  await negoceDepose(page, browser, N2, demande2.replyTo!, "devis-fournisseur-2.pdf");
  await page.goto("/groupe");
  const lots = page.getByRole("list", { name: "Mes regroupements" });
  await expect(lots.getByText(/Négoce retenu/)).toBeVisible({ timeout: 20_000 });
  await expect(lots.getByText(/chez Négoce Généraliste/)).toBeVisible();

  // 3) Premier désistement : un avertissement, le lot reste commandé pour B.
  await lots.getByRole("button", { name: "Je ne commande pas" }).click();
  await expect(lots.getByText(/deuxième fois sur 12 mois : le regroupement se ferme 6 mois/)).toBeVisible();
  await lots.getByRole("button", { name: "Je ne commande pas, c'est sûr" }).click();
  await expect(lots.getByText("Tu ne commandes pas. C'est noté.")).toBeVisible();
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
  await expect(lots.getByText("Tu ne commandes pas. C'est noté.")).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole("status").filter({ hasText: /Le regroupement t'est fermée jusqu'au .* : deux commandes annulées en 12 mois/ })).toBeVisible();
  const etat2 = (await apiJson<{ eligible: boolean; raisons: string[]; excluJusquau: string | null }>(page, "GET", "/v1/groupe")).body;
  expect(etat2.eligible).toBe(false);
  expect(etat2.raisons).toContain("exclu_du_groupe");
  expect(etat2.excluJusquau).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  // Un nouveau lot est refusé : « Ton chantier » montre le bloc grisé, l'API ferme.
  const projet4 = await createProject(page, "Toiture Nord 4", "M. Client", "3 quai Duguay-Trouin, 35400 Saint-Malo");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  await passQuestions(page);
  await confirmDoubts(page);
  await expect(page.getByRole("region", { name: "Regroupement fermée" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Liste des fournitures" }).getByRole("button", { name: "Ajouter au regroupement" })).toHaveCount(0);
  const refus = await apiJson<{ error: { code: string; details: { reason: string } } }>(page, "POST", `/v1/projects/${projet4}/groupe`, { articles: ["x"], fenetre: { tot: "2026-11-02", tard: "2026-11-20" }, statut: "signe", engagement: true });
  expect(refus.status).toBe(403);
  expect(refus.body.error.details.reason).toBe("groupe_ferme");
  // B, lui, voit toujours ses lots et son négoce retenu.
  await pageB.goto("/groupe");
  await expect(pageB.getByRole("list", { name: "Mes regroupements" }).getByText(/Négoce retenu/).first()).toBeVisible();
  await contexteB.close();
});

test("Aide « ? » : sur chaque écran, trois lignes au plus, tutoiement, un tap ouvre, un tap ferme", { tag: "@ancien" }, async ({ page }) => {
  await signUp(page);
  for (const [chemin, titre] of [
    ["/groupe", "Aide : Regroupement"],
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

test("Mets ton négoce dans la boucle sans adresse d'entreprise (Greg, 25 octobre 2026) : la case adresse s'ouvre dans le bloc, plus de détour par Compte", { tag: "@ancien" }, async ({ page }) => {
  await compteAuGroupe(page, "Bati Test", "3 rue des Ajoncs, 22300 Lannion");
  expect(await apiCall(page, "PATCH", "/v1/company/profile", { name: "Bati Test", address: null, siret: "73282932000074", phone: null, email: null })).toBe(200);
  await page.goto("/");
  const bloc = page.getByRole("region", { name: "Mets ton négoce dans la boucle" });
  await bloc.getByLabel("E-mail de ton négoce").fill(`agence-${unique()}@negoce-du-ponant.fr`);
  await bloc.getByRole("button", { name: "Ajouter mon négoce" }).click();
  const adresse = bloc.getByLabel("Adresse de ton entreprise");
  await expect(adresse).toBeVisible();
  await adresse.fill("3 rue des Ajoncs, Lannion");
  await expect(bloc.getByText("Ajoute le code postal (5 chiffres).")).toBeVisible();
  await adresse.fill("3 rue des Ajoncs, 22300 Lannion");
  await bloc.getByRole("button", { name: "Ajouter mon négoce" }).click();
  await expect(bloc.getByRole("list", { name: "Négoces dans la boucle" }).getByRole("listitem")).toHaveCount(1);
  expect((await apiJson<{ address: string }>(page, "GET", "/v1/company/profile")).body.address).toBe("3 rue des Ajoncs, 22300 Lannion");
});

test("Mets ton négoce dans la boucle (Greg, 23 octobre) : un e-mail, un bouton, « Ton négoce X est dans la boucle », et de quoi le prévenir", { tag: "@ancien" }, async ({ page }) => {
  const projet = test.info().project.name;
  const email = `agence-${projet}-${unique()}@negoce-du-ponant.fr`;
  await compteAuGroupe(page, "Toitures Martin", "3 rue des Ajoncs, 22300 Lannion");
  await page.goto("/");
  // Sur l'accueil, sous le bloc du mois : le texte de Greg, un champ e-mail, un seul bouton.
  const bloc = page.getByRole("region", { name: "Mets ton négoce dans la boucle" });
  await expect(bloc.getByText("Ton négoce habituel n'est pas encore dans la commande ? Ajoute-le : il recevra tout le volume de la commande et pourra faire son prix.")).toBeVisible();
  await expect(bloc.getByRole("button")).toHaveText(["Ajouter mon négoce"]);
  await bloc.getByLabel("E-mail de ton négoce").fill(email);
  // Une panne du serveur dit sa raison et son code support, jamais « Ça n'a pas marché » seul (retour de Greg, 24 octobre 2026).
  await page.route("**/v1/groupe/negoces/boucle", (r) => r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "internal_error", supportId: "sup-12345" } }) }));
  await bloc.getByRole("button", { name: "Ajouter mon négoce" }).click();
  await expect(bloc.getByText("Un problème est survenu de notre côté. Tes données sont conservées ; réessaie dans un instant. Code support : sup-12345.")).toBeVisible();
  await expect(bloc.getByText(/Ça n'a pas marché/)).toHaveCount(0);
  await page.unroute("**/v1/groupe/negoces/boucle");
  await bloc.getByRole("button", { name: "Ajouter mon négoce" }).click();
  // Ajouté : « Ton négoce X est dans la boucle », la commande qu'il recevra, et le message vouvoyé à lui envoyer.
  const ligne = bloc.getByRole("list", { name: "Négoces dans la boucle" }).getByRole("listitem");
  await expect(ligne).toHaveCount(1);
  await expect(ligne).toContainText("Ton négoce negoce-du-ponant.fr est dans la boucle : il recevra la commande d");
  const prevenir = bloc.getByRole("group", { name: "Prévenir negoce-du-ponant.fr" });
  // Le lien du message est l'invitation du négoce (espace négoce, 23 octobre) : `/negoce/rejoindre/<jeton>`, jamais le nom de l'artisan.
  const message = await prevenir.getByText(/^Bonjour, je passe par Mobiiz pour commander mes matériaux groupés avec d'autres artisans de mon métier\. Vous pouvez chiffrer tout le volume de la commande ici : /).textContent();
  expect(message).toMatch(new RegExp(`ici : ${new URL(page.url()).origin}/negoce/rejoindre/[A-Za-z0-9_.-]+$`));
  expect(message).not.toContain("Toitures Martin");
  await expect(prevenir.getByRole("link", { name: "Envoyer sur WhatsApp" })).toHaveAttribute("href", `https://wa.me/?text=${encodeURIComponent(message!)}`);
  await expect(prevenir.getByRole("link", { name: "Envoyer par SMS" })).toHaveAttribute("href", `sms:?&body=${encodeURIComponent(message!)}`);
  // Le négoce a reçu son invitation, vouvoyée, sans le nom de l'artisan.
  await expect.poll(async () => (await emailsVers(page, email.toLowerCase())).map((m) => m.subject)).toContainEqual("Des artisans de votre secteur vous ont ajouté au regroupement : créez votre accès");
  expect((await emailsVers(page, email.toLowerCase())).map((m) => m.text).join("\n")).not.toContain("Toitures Martin");
  await expect(prevenir.getByRole("button", { name: "Copier le message" })).toBeVisible();
  // Rappuyer avec le même e-mail (autre casse) : toujours un seul négoce.
  await bloc.getByRole("button", { name: "Ajouter un autre négoce" }).click();
  await bloc.getByLabel("E-mail de ton négoce").fill(email.toUpperCase());
  await bloc.getByRole("button", { name: "Ajouter mon négoce" }).click();
  await expect(bloc.getByRole("list", { name: "Négoces dans la boucle" }).getByRole("listitem")).toHaveCount(1);
  // Il est dans « Mes négoces » (couverture, favori) et le bloc de l'onglet Regroupement le dit aussi.
  const negoces = (await apiJson<{ negoces: { email: string; familles: string[]; favori: boolean }[] }>(page, "GET", "/v1/groupe/negoces")).body.negoces;
  expect(negoces).toEqual([expect.objectContaining({ email: email.toLowerCase(), familles: ["couverture"], favori: true })]);
  await page.goto("/groupe");
  const blocOnglet = page.getByRole("region", { name: "Mets ton négoce dans la boucle" });
  await expect(blocOnglet.getByRole("list", { name: "Négoces dans la boucle" }).getByRole("listitem")).toContainText("Ton négoce negoce-du-ponant.fr est dans la boucle");
  // Dans l'onglet, le nom se cherche aussi dans Sirene ; l'accueil n'a que l'e-mail.
  await blocOnglet.getByRole("button", { name: "Ajouter un autre négoce" }).click();
  await expect(blocOnglet.getByLabel("Nom du négoce (facultatif)")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("Liste donnée en photo, chantier sans adresse : la barre de la commande demande l'adresse d'emblée, sans refus du serveur (recette en ligne, 25 octobre 2026)", { tag: "@ancien" }, async ({ page }) => {
  // Un département à lui (35 ou 53) : sa commande ne se mêle pas à celles des autres parcours.
  const [ville, rue] = test.info().project.name === "ordinateur" ? ["53000 Laval", "8 rue du Pont, 53000 Laval"] : ["35000 Rennes", "8 rue du Pont, 35000 Rennes"];
  await compteAuGroupe(page, "Toitures Photo", `2 place de la Mairie, ${ville}`);
  const refus: string[] = [];
  page.on("response", (r) => {
    if (r.status() === 400 && /\/commande-du-mois/.test(r.url())) refus.push(r.url());
  });
  await page.goto("/chantiers/nouveau");
  await page.getByLabel("Déposer ma liste").setInputFiles(path.join(__dirname, "fixtures", "liste-manuscrite.png"));
  await expect(page).toHaveURL(/\/chantiers\/[0-9a-f-]{36}/, { timeout: 60_000 });
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(list).toBeVisible({ timeout: 60_000 });
  await page.getByRole("region", { name: /^Regroupement/ }).getByRole("button", { name: /^Ajouter à la commande/ }).click();
  const boxes = list.getByRole("checkbox", { name: /^Ajouter à la commande : / }).and(page.locator(":enabled"));
  await boxes.first().check();
  const bar = page.getByRole("region", { name: /^Ajouter à la commande/ }).last();
  await bar.getByRole("radio", { name: "Un chantier signé" }).click();
  // L'adresse est demandée tout de suite ; « Ajouter » attend un code postal.
  await expect(bar.getByLabel(/Adresse du chantier, avec le code postal/)).toBeVisible();
  await expect(bar.getByRole("button", { name: "Ajouter" })).toBeDisabled();
  await bar.getByLabel(/Adresse du chantier, avec le code postal/).fill(rue);
  await bar.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByRole("region", { name: /^Dans la commande/ })).toBeVisible();
  expect(refus).toEqual([]);
  // Rien ne reste ouvert pour les parcours suivants : la liste est retirée de la commande.
  await page.goto("/groupe");
  await page.getByRole("region", { name: /^Commande d/ }).first().getByRole("button", { name: "Retirer" }).click();
  await expect(page.getByRole("region", { name: /^Commande d/ }).first().getByRole("button", { name: "Retirer" })).toHaveCount(0);
});

test("Guide du premier lancement (Greg, 24 octobre 2026) : trois écrans une fois inscrit, sautable, la prochaine clôture, « Déposer ma première liste », une seule fois, « Revoir le guide » dans le menu", { tag: "@ancien" }, async ({ page }) => {
  await page.removeLocatorHandler(page.getByRole("dialog", { name: "Guide" }));
  await signUp(page);
  const guide = page.getByRole("dialog", { name: "Guide" });
  await expect(guide).toBeVisible();
  await expect(guide.getByRole("heading", { name: "Dépose ton devis" })).toBeVisible();
  await expect(guide.getByText(/^Prochaine clôture : \w+ \d{1,2} \w+ à \d{1,2} h/)).toBeVisible();
  await expect(guide.getByRole("button", { name: "Passer le guide" })).toBeVisible();
  // La page derrière est inerte.
  await expect(page.getByRole("button", { name: "Mon menu" })).toHaveCount(0);
  await guide.getByRole("button", { name: "Suivant" }).click();
  await expect(guide.getByRole("heading", { name: "Mobiiz prépare ton quantitatif" })).toBeVisible();
  await guide.getByRole("button", { name: "Suivant" }).click();
  await expect(guide.getByRole("heading", { name: "Envoie à tes négoces et compare" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await guide.getByRole("link", { name: "Déposer mon premier devis" }).click();
  await expect(page).toHaveURL(/\/chantiers\/nouveau/);
  await expect(guide).toHaveCount(0);
  // Une seule fois : ni au rechargement, ni ailleurs.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^(Bonjour Jean|Paie tes matériaux moins cher)/ })).toBeVisible();
  await expect(guide).toHaveCount(0);
  // « Revoir le guide » dans le menu le rouvre ; « Passer le guide » le referme.
  await page.getByRole("button", { name: "Mon menu" }).click();
  await page.getByRole("menuitem", { name: "Revoir le guide" }).click();
  await expect(guide.getByRole("heading", { name: "Dépose ton devis" })).toBeVisible();
  await guide.getByRole("button", { name: "Passer le guide" }).click();
  await expect(guide).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Mon menu" })).toBeVisible();
  await expect(guide).toHaveCount(0);
});

test("La page d'accueil publique : un visiteur la voit à la racine, un artisan connecté garde l'app", async ({ page }) => {
  // La landing « premium V3 » (Greg, 30 octobre 2026, maquette du ZIP) : l'accroche, comment ça marche, le pont, « Plus on
  // est, moins on paie » et ses 20 artisans, l'offre, les questions, le dernier appel.
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Achète tes matériaux au prix des gros\.$/);
  await expect(page.getByText("Par un artisan, pour les artisans", { exact: true })).toBeVisible();
  const ordre = await Promise.all(
    [/^Achète tes matériaux/, /^Simple pour toi\./, /^Seul, tu représentes une commande\./, /^Plus on est, moins on paie\./, /^À ton rythme\./, "Tu te poses des questions ?", /^Le prochain bon prix/].map(
      async (t) => (await page.getByRole("heading", { name: t }).boundingBox())!.y,
    ),
  );
  expect([...ordre].sort((x, y) => x - y)).toEqual(ordre);
  for (const etape of ["Prépare ta liste.", "Vérifie le quantitatif.", "Compare et choisis."]) await expect(page.getByRole("heading", { name: etape })).toBeVisible();
  // Les conditions en vigueur (vérifiées avant publication) : gratuit pour les listes et les négoces, achats groupés sur
  // abonnement avec le premier offert, les réponses validées par Greg.
  await expect(page.getByText(/Sans carte bancaire · Tes listes et tes négoces restent gratuits/)).toBeVisible();
  await expect(page.getByText("Sur abonnement : le premier achat groupé est offert")).toBeVisible();
  await expect(page.getByText("3 premières listes préparées depuis un devis ou une photo")).toBeVisible();
  const faq = page.getByRole("region", { name: "Tu te poses des questions ?" });
  await expect(faq.locator("summary")).toHaveText(["Je peux garder mes négoces habituels ?", "Est-ce que Mobiiz est gratuit ?", "Est-ce que je dois obligatoirement commander ?", "Est-ce que je vais forcément payer moins cher ?"]);
  for (const s of await faq.locator("summary").all()) await s.click();
  await expect(faq.getByText("Oui. C'est toi qui les ajoutes, et Mobiiz leur demande un prix de ta part.")).toBeVisible();
  await expect(faq.getByText("Oui pour tes listes et tes négoces, sans limite de temps. Les achats groupés sont sur abonnement, et le premier est offert.", { exact: false })).toBeVisible();
  await expect(faq.getByText("Oui, mais seulement ce que tu as coché, et au moins cher entre l'offre du groupe et ton négoce habituel.", { exact: false })).toBeVisible();
  await expect(faq.getByText(/^Non, aucun prix ni niveau d’économie n’est garanti\./)).toBeVisible();
  // Jamais les mots « IA », « automatique », « précis », « exact » ; aucun montant d'abonnement (l'exemple fictif 6 € → 3 € HT/L est permis, marqué « Exemple fictif »).
  expect(await page.locator("main").innerText()).not.toMatch(/\b(IA|automatiques?|automatisée?s?|précise?s?|exacte?s?)\b/i);
  await expect(page.getByText(/€ HT (par|\/) (mois|an)/)).toHaveCount(0);
  // L'animation des 20 artisans : à 1 tant qu'elle n'est pas à l'écran, puis jusqu'à 20 au défilement ; « Rejouer » la relance.
  const demo = page.locator("#animationSurface");
  await expect(demo).toHaveAttribute("data-artisans", "1");
  await expect(demo.getByText("EXEMPLE FICTIF")).toBeVisible();
  await demo.scrollIntoViewIfNeeded();
  await expect(demo).toHaveAttribute("data-artisans", "20", { timeout: 10_000 });
  await expect(demo.getByText("20 artisans réunis. Plus on est, moins on paie.")).toBeVisible();
  await expect(demo.getByText("3,00")).toBeVisible();
  await expect(demo.getByText(/Simulation pédagogique fictive \(6 € → 3 € HT\/L\)\. Aucun prix ni pourcentage d’économie garanti/)).toBeVisible();
  await demo.getByRole("button", { name: "Revoir l'animation" }).click();
  await expect(demo).not.toHaveAttribute("data-artisans", "20");
  await expect(demo).toHaveAttribute("data-artisans", "20", { timeout: 10_000 });
  // Les liens : l'inscription (deux boutons et l'en-tête), la connexion, les tarifs, les pages légales, l'accès négoce. En
  // haut de page, le bouton fixe du téléphone est caché (hors de l'arbre d'accessibilité).
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator(".sticky-cta")).not.toHaveAttribute("data-visible", "");
  await expect(page.getByRole("link", { name: "Créer mon compte gratuit", exact: true })).toHaveCount(2);
  // L'en-tête (caché sur téléphone, comme la maquette : le menu et le bouton fixe y suffisent).
  await expect(page.locator(".nav-right a", { hasText: "Commencer gratuitement" })).toHaveAttribute("href", "/inscription");
  await expect(page.locator(".nav-right a", { hasText: "Se connecter" })).toHaveAttribute("href", "/connexion");
  await expect(page.getByRole("link", { name: /^Découvrir l'offre/ })).toHaveAttribute("href", "/tarifs");
  const pied = page.getByRole("navigation", { name: "Informations et liens légaux" });
  for (const [nom, href] of <[string, string][]>[["Tarifs", "/tarifs"], ["Mentions légales", "/mentions-legales"], ["CGU", "/cgu"], ["Conditions négoces", "/conditions-negoce"], ["Confidentialité", "/confidentialite"], ["Contact", "/mentions-legales#contact"], ["Accès négoce", "/negoce/connexion"]])
    await expect(pied.getByRole("link", { name: nom })).toHaveAttribute("href", href);
  await expect(page.getByText(/BATI INVEST, SARL au capital de 1 000 €, RCS Saint-Brieuc 910 796 325, SIRET 910 796 325 00017/)).toBeVisible();
  // Sur téléphone : le menu s'ouvre et mène à sa section ; le bouton fixe n'apparaît qu'une fois celui de l'accroche passé,
  // et s'efface devant celui du bas.
  const taille = page.viewportSize();
  await page.setViewportSize({ width: 375, height: 667 });
  await page.evaluate(() => window.scrollTo(0, 0));
  const fixe = page.locator(".sticky-cta");
  await expect(fixe).not.toHaveAttribute("data-visible", "");
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  // « Se connecter », caché dans l'en-tête du téléphone, est dans le menu.
  await expect(page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/connexion");
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "L'offre" }).click();
  await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("heading", { name: /^À ton rythme\./ })).toBeInViewport();
  await expect(fixe).toHaveAttribute("data-visible", "");
  await expect(fixe.getByRole("link", { name: "Créer mon compte gratuit" })).toBeVisible();
  await page.locator("#finalPrimaryCTA").scrollIntoViewIfNeeded();
  await expect(fixe).not.toHaveAttribute("data-visible", "");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  if (taille) await page.setViewportSize(taille);
  // Rien d'extérieur ; aucun débordement.
  const externes = await page.evaluate(() => [...document.querySelectorAll("script[src], img, link[rel=stylesheet], iframe")].map((e) => (e as HTMLElement).getAttribute("src") ?? (e as HTMLElement).getAttribute("href") ?? "").filter((u) => /^https?:\/\//.test(u)));
  expect(externes).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  // L'aperçu WhatsApp : écrit dès le serveur avec l'adresse du site.
  const html = await (await page.request.get("/")).text();
  expect(html).toMatch(/<meta property="og:image" content="http:\/\/localhost:3000\/marque\/partage\.png"/);
  // La démo guidée et le partage restent sur /couvreurs (ancienne page) : « Revoir la démo » y mène.
  await page.goto("/couvreurs");
  await page.getByRole("button", { name: "Voir comment ça marche (30 s)" }).click();
  await expect(page.getByText("Démo · écran 1 sur 3 · données fictives")).toBeVisible();
  await page.getByRole("button", { name: "Passer" }).click();
  await expect(page.getByText("Démo · écran")).toHaveCount(0);
  await page.getByRole("link", { name: "Revoir la démo" }).click();
  await expect(page.getByText("Démo · écran 1 sur 3 · données fictives")).toBeVisible();
  await page.getByRole("button", { name: "Passer" }).click();
  const partage = page.getByRole("region", { name: "Fais venir tes collègues" });
  await expect(partage.getByRole("button", { name: "Copier le lien" })).toBeVisible();
  // Connecté : la racine reste l'accueil de l'app.
  await signUp(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^(Bonjour Jean|Paie tes matériaux moins cher)/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Créer mon compte gratuit" })).toHaveCount(0);
  // « Inviter un collègue » aussi dans l'app, après l'inscription (accueil) et sur l'écran Regroupement.
  await expect(page.getByRole("region", { name: "Inviter un collègue" }).getByRole("link", { name: "Envoyer sur WhatsApp" })).toBeVisible();
  await page.goto("/regroupements");
  await expect(page.getByRole("region", { name: "Inviter un collègue" }).getByRole("button", { name: "Copier le lien" })).toBeVisible();
});

test("PWA : manifeste et icônes installables ; sur le téléphone, « Ajouter à l'écran d'accueil » expliqué une fois", async ({ page }) => {
  const manifest = (await (await page.request.get("/manifest.webmanifest")).json()) as { display: string; start_url: string; icons: { src: string; sizes: string; purpose?: string }[] };
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  expect(manifest.icons.map((i) => i.src)).toEqual(expect.arrayContaining(["/icon-192.png", "/icon-512.png", "/icon-512-maskable.png"]));
  for (const f of ["/icon-192.png", "/icon-512.png", "/icon-512-maskable.png", "/apple-touch-icon.png"]) expect((await page.request.get(f)).headers()["content-type"]).toContain("image/png");
  await signUp(page);
  // Accueil vide = une phrase et un bouton : le conseil « écran d'accueil » vient avec le premier chantier.
  await createProject(page, "Toiture Hint", "M. Hint", "3 rue du Port, Brest");
  await page.goto("/");
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


test("Rapport mensuel : le 1er du mois, l'artisan reçoit « ce mois : X chantiers lus, Y € économisés au groupé, Z lots » ; rien à qui n'a rien fait", async ({ page }) => {
  // Un artisan qui a déposé un devis ce mois-ci, un autre qui n'a rien fait.
  const email = await signUp(page);
  await createProject(page, "Toiture Rapport", "M. Client", "4 rue du Port, 22500 Paimpol");
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-client-couvreur.pdf"));
  await passQuestions(page);
  const dejaRecus = (await emailsVers(page, email)).length;
  // Le 1er du mois suivant, 7 h (la date ne se force qu'en test).
  const now = new Date();
  const premier = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 7)).toISOString();
  const r = (await page.evaluate(async (maintenant) => {
    const res = await fetch(`/v1/internal/rapport-mensuel?maintenant=${encodeURIComponent(maintenant)}`, { headers: { authorization: "Bearer e2e-secret-de-la-tache" } });
    return { status: res.status, body: (await res.json()) as { envoyes: number } };
  }, premier)) as { status: number; body: { envoyes: number } };
  expect(r.status).toBe(200);
  expect(r.body.envoyes).toBeGreaterThanOrEqual(1);
  await expect.poll(async () => (await emailsVers(page, email)).length).toBeGreaterThan(dejaRecus);
  const rapport = (await emailsVers(page, email)).at(-1)!;
  expect(rapport.subject).toMatch(/^Ton mois d[e'’ ]+[a-zû]+ \d{4} avec Mobiiz : 1 chantier lu, 0 € économisés, 0 lot$/);
  expect(rapport.text).toContain("Ce mois : 1 chantier lu, 0 € économisés grâce au regroupement, 0 lot.");
  expect(rapport.text).toContain("Pas de lot ce mois-ci");
  expect(rapport.text).not.toMatch(/\bvous\b|\bvotre\b/i);
  // Relancée : pas de second e-mail.
  await page.evaluate(async (maintenant) => fetch(`/v1/internal/rapport-mensuel?maintenant=${encodeURIComponent(maintenant)}`, { headers: { authorization: "Bearer e2e-secret-de-la-tache" } }), premier);
  expect((await emailsVers(page, email)).filter((m) => /^Ton mois d/.test(m.subject))).toHaveLength(1);
});

// « J'ai déjà ma liste » (demande du fondateur, 21 octobre 2026) : crédit API à zéro, le faux lecteur rend trois listes
// enregistrées (manuscrite, bon de négoce, tableau), choisies par le nom du fichier.
test("« + Nouvelle liste » : « Donne ta liste de matériaux » lit la photo sans calcul ni question, la liste se corrige d'un doigt, puis part comme un devis", async ({ page }) => {
  test.slow();
  await signUp(page);
  // Une adresse propre à ce test : la boîte de test est partagée par toute la série.
  const negoce = `liste-${Date.now()}@example.com`;
  await menuArtisan(page, "Mes fournisseurs");
  await page.getByRole("button", { name: "Nouveau fournisseur" }).click();
  await page.getByLabel("Société").fill("Point.P Paimpol");
  await page.getByLabel("E-mail de ton commercial").fill(negoce);
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByText(negoce)).toBeVisible();

  // 1. Les deux gros boutons.
  // Recentrage (25 octobre 2026) : plus de « + » au centre de la barre ; le gros bouton « Nouveau chantier » de l'accueil.
  await page.goto("/");
  await page.getByRole("link", { name: "Ma liste de matériaux" }).first().click();
  await expect(page).toHaveURL(/\/chantiers\/nouveau$/);
  // Point 31 (27 octobre 2026) : trois choix, « Depuis mon devis — on t'avance », « Photo de ma liste », « Je la note moi-même ».
  await expect(page.getByText("Depuis mon devis — on t'avance", { exact: true })).toBeVisible();
  await expect(page.getByText("Photo de ma liste", { exact: true })).toBeVisible();
  await expect(page.getByText("Je la note moi-même", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Déposer mon devis")).toHaveAttribute("accept", /pdf/);
  await expect(page.getByLabel("Déposer ma liste")).toHaveAttribute("accept", /image\/jpeg.*application\/pdf/);

  // 2. La photo d'une liste écrite à la main : les lignes telles qu'écrites, aucune question, aucun calcul.
  await page.getByLabel("Déposer ma liste").setInputFiles(path.join(__dirname, "fixtures", "liste-manuscrite.png"));
  await expect(page).toHaveURL(/\/chantiers\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /^Ma liste du / })).toBeVisible();
  const liste = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(liste).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("region", { name: "Les questions" })).toHaveCount(0);
  for (const article of ["Tuile romane canal rouge", "Faîtière ronde à emboîtement", "Liteau sapin 27x38", "Écran sous-toiture", "Pointes inox"]) {
    await expect(liste.getByRole("button", { name: new RegExp(`^Modifier : ${article}`) })).toBeVisible();
  }
  // Rien d'ajouté, rien de calculé : cinq lignes, comme sur la feuille, toutes prêtes (aucune ligne à régler).
  await expect(liste.getByRole("img", { name: "à vérifier" })).toHaveCount(0);
  await expect(liste.getByRole("button", { name: /^Modifier : / })).toHaveCount(5);
  await expect(liste.getByText(/1[\s\u00a0\u202f]?250/).filter({ visible: true }).first()).toBeVisible();

  // Nouveau cap (22 octobre) : une ligne vague a sa pastille orange, « Précise pour l'ajouter au regroupement », et sa
  // question en boutons ; la réponse s'écrit dans la désignation et la pastille passe au vert. Le liteau est déjà précis.
  await expect(liste.getByText("Précise pour l'ajouter au regroupement")).toHaveCount(4);
  await liste.getByRole("button", { name: "Modifier : Tuile romane canal rouge" }).click();
  const tuile = page.getByRole("group", { name: "Préciser : Tuile romane canal rouge" });
  await expect(tuile.getByRole("group", { name: "Marque ?" })).toBeVisible();
  await tuile.getByRole("button", { name: "Edilians", exact: true }).click();
  await expect(liste.getByRole("button", { name: /^(Modifier|Fermer) : Tuile romane canal rouge Edilians/ })).toBeVisible();
  await closeOpenLine(page);
  await expect(liste.getByText("Précise pour l'ajouter au regroupement")).toHaveCount(3);
  await expect(liste.getByRole("button", { name: /Liteau sapin 27x38/ }).first()).toBeVisible();
  // Nouveau cap (22 octobre) : le suivi façon colis, en haut du chantier.
  const suivi = page.getByRole("region", { name: "Suivi du chantier" });
  await expect(suivi.getByRole("listitem")).toHaveText(["Liste prête", "Prix demandés", "Prix reçus", "Commandé"]);
  await expect(suivi).toContainText("Ta liste est prête.");

  // 3. Corriger d'un doigt ce qui est mal lu : renommer, retirer, ajouter une ligne.
  await page.getByRole("button", { name: "Modifier : Pointes inox" }).click();
  await page.getByRole("button", { name: "Modifier le nom : Pointes inox" }).click();
  await page.getByLabel("Nom : Pointes inox").fill("Pointes inox 2,8x40");
  await page.getByRole("button", { name: "OK" }).click();
  await confirmDoubts(page);
  await expect(liste.getByRole("button", { name: /^(Modifier|Fermer) : Pointes inox 2,8x40/ })).toBeVisible();
  await closeOpenLine(page);
  await liste.getByRole("button", { name: "Modifier : Écran sous-toiture" }).click();
  await liste.getByRole("button", { name: "Retirer de la liste" }).click();
  await expect(liste.getByRole("button", { name: /^Modifier : Écran sous-toiture/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Ajouter un article" }).click();
  await page.getByLabel("Désignation").fill("Chatière tuile");
  await page.getByLabel("Quantité").fill("6");
  await page.getByLabel("Unité").fill("pièces");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(liste.getByRole("button", { name: /^Modifier : Chatière/ })).toBeVisible();
  await confirmDoubts(page);

  // 4. Rien ne part sans sa validation ; puis même suite qu'un devis : envoi aux négoces.
  await page.reload();
  await openList(page);
  expect(await emailsVers(page, negoce)).toHaveLength(0);
  await page.getByRole("button", { name: "Demander les prix à mes négoces" }).click();
  const apercu = page.getByRole("dialog", { name: "À qui j'envoie ?" });
  await expect(apercu.getByRole("checkbox", { name: /Point.P Paimpol/ })).toBeChecked();
  await apercu.getByRole("button", { name: "Continuer" }).click();
  // Lot final, point 4 : « Voici ce que ton négoce va recevoir », puis « Envoyer ».
  await page.getByRole("dialog", { name: "Voici ce que ton négoce va recevoir" }).getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(page.getByRole("list", { name: "Tes fournisseurs" })).toBeVisible();
  const [demande] = await emailsVers(page, negoce);
  expect(demande, "la demande de devis est partie").toBeDefined();
  await page.reload();
  await expect(page.getByRole("region", { name: "Suivi du chantier" })).toContainText("Demande envoyée à 1 négoce. Tu seras prévenu à chaque réponse.");
  // Le PDF joint porte les lignes (un seul document, §43) ; la liste corrigée est celle qui est partie.
  expect(demande!.attachments.join(" ")).toMatch(/demande-de-devis/);
  // Point 8 (28 octobre 2026) : « Ma liste · N lignes », repliée ; un toucher l'ouvre.
  await page.getByRole("button", { name: /^Ma liste · \d+ lignes?/ }).click();
  const envoyee = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(envoyee.getByRole("button", { name: /^Modifier : Chatière/ })).toBeVisible();
  await expect(envoyee.getByRole("button", { name: /^Modifier : Pointes inox 2,8x40/ })).toBeVisible();
  await expect(envoyee.getByRole("button", { name: /^Modifier : Écran sous-toiture/ })).toHaveCount(0);
});

test("« J'ai déjà ma liste » : un bon de négoce (photo) et un tableau (PDF) se lisent de la même façon, sans question", async ({ page }) => {
  test.slow();
  await signUp(page);
  const cas = [
    { fichier: "bon-negoce.png", premiere: /^Modifier : Ardoise naturelle 32x22 Espagne 1er choix/, lignes: 4 },
    { fichier: "liste-tableau.pdf", premiere: /^Modifier : Plaque de plâtre BA13 2,50x1,20/, lignes: 6 },
  ];
  for (const c of cas) {
    await page.goto("/chantiers/nouveau");
    await page.getByLabel("Déposer ma liste").setInputFiles(path.join(__dirname, "fixtures", c.fichier));
    await expect(page).toHaveURL(/\/chantiers\/[0-9a-f-]{36}$/, { timeout: 60_000 });
    const liste = page.getByRole("region", { name: "Liste des fournitures" });
    await expect(liste).toBeVisible({ timeout: 60_000 });
    await expect(liste.getByRole("button", { name: c.premiere })).toBeVisible();
    await expect(liste.getByRole("button", { name: /^Modifier : / })).toHaveCount(c.lignes);
    await expect(page.getByRole("region", { name: "Les questions" })).toHaveCount(0);
  }
});

test("« J'ai déjà ma liste » : un fichier qui n'est ni une photo ni un PDF se dit en clair, rien n'est créé", async ({ page }) => {
  await signUp(page);
  await page.goto("/chantiers/nouveau");
  await page.getByLabel("Déposer ma liste").setInputFiles({ name: "liste.txt", mimeType: "text/plain", buffer: Buffer.from("du texte") });
  await expect(page.getByRole("alert").filter({ hasText: /ni une photo ni un PDF|rien lu/ })).toBeVisible();
  await expect(page).toHaveURL(/\/chantiers\/nouveau$/);
});

/**
 * PLAN « FINITION » (Greg, 22 octobre) : « zéro bouton mort ». Sur un écran, chaque lien est suivi (une page qui répond,
 * une ancre qui existe, un lien externe connu) et chaque bouton visible est cliqué, l'écran rouvert entre deux clics.
 * Est un défaut : l'écran d'erreur, « Page introuvable », une erreur JavaScript, une réponse 5xx de l'API, un bouton
 * qu'on ne peut pas toucher (caché sous un autre élément). Les gestes qui ferment la session ou effacent le compte
 * sont laissés aux tests qui les vérifient (déconnexion, RGPD).
 */
const NE_PAS_CLIQUER = /^(Se déconnecter|Supprimer (mon|le|définitivement)|Effacer mes données|Supprimer)\b/i;
const LIENS_EXTERNES = /^(mailto:|tel:|sms:|https:\/\/wa\.me\/|https:\/\/www\.google\.com\/maps\/|https:\/\/www\.cnil\.fr|https:\/\/www\.legifrance\.gouv\.fr|https:\/\/annuaire-entreprises\.data\.gouv\.fr|https:\/\/www\.service-public\.fr)/;

async function toutCliquer(page: Page, ecran: string, ouvrir: () => Promise<void>, aussiSans: RegExp | null = null): Promise<string[]> {
  const defauts: string[] = [];
  const surErreur = (e: Error) => defauts.push(`${ecran} : erreur JavaScript « ${e.message} »`);
  const surReponse = (r: import("@playwright/test").Response) => {
    if (r.status() >= 500 && r.url().includes("/v1/")) defauts.push(`${ecran} : ${r.status()} sur ${new URL(r.url()).pathname}`);
  };
  page.on("pageerror", surErreur);
  page.on("response", surReponse);
  page.on("dialog", (d) => void d.dismiss().catch(() => undefined));
  const casse = async (quoi: string) => {
    if (await page.getByText(/Oups, cet écran a eu un souci|Page introuvable/).count()) defauts.push(`${ecran} : ${quoi} mène à un écran d'erreur`);
  };
  await ouvrir();
  await casse("l'ouverture");
  // Les liens : une page qui répond (ou une ancre présente), un lien externe connu.
  const liens = await page.locator("a[href]").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href") ?? ""))]);
  for (const href of liens) {
    if (href.startsWith("#")) {
      if (href.length > 1 && !(await page.locator(href).count())) defauts.push(`${ecran} : l'ancre ${href} n'existe pas`);
    } else if (href.startsWith("/")) {
      const r = await page.request.get(href, { maxRedirects: 5 }).catch(() => null);
      if (!r || r.status() >= 400) defauts.push(`${ecran} : le lien ${href} répond ${r?.status() ?? "rien"}`);
    } else if (!LIENS_EXTERNES.test(href)) {
      defauts.push(`${ecran} : lien externe inattendu ${href}`);
    }
  }
  // Les boutons visibles, un par un, l'écran rouvert entre deux clics.
  const noms = await page.getByRole("button").evaluateAll((bs) => bs.map((b) => ((b as HTMLElement).getAttribute("aria-label") ?? (b as HTMLElement).innerText ?? "").trim().replace(/\s+/g, " ")));
  for (let i = 0; i < noms.length; i++) {
    const nom = noms[i]!;
    if (!nom || NE_PAS_CLIQUER.test(nom) || aussiSans?.test(nom)) continue;
    if (i > 0) {
      await ouvrir();
    }
    const bouton = page.getByRole("button").nth(i);
    if (!(await bouton.isVisible().catch(() => false)) || !(await bouton.isEnabled().catch(() => false))) continue;
    const vu = ((await bouton.getAttribute("aria-label").catch(() => null)) ?? (await bouton.innerText().catch(() => "")) ?? "").trim().replace(/\s+/g, " ");
    if (vu !== nom) continue; // l'écran a changé depuis le relevé (une ligne retirée…) : le bouton n'est plus le même
    // Un champ fichier caché s'ouvre par son étiquette visible (la zone « Donne ta liste… ») : c'est elle qu'on touche.
    if ((await bouton.evaluate((el) => el instanceof HTMLInputElement && el.type === "file").catch(() => false)) as boolean) {
      const id = await bouton.getAttribute("id");
      const etiquette = id ? page.locator(`label[for="${id}"]`).first() : null;
      if (!etiquette || !(await etiquette.isVisible().catch(() => false))) defauts.push(`${ecran} : le champ « ${nom} » n'a pas d'étiquette visible à toucher`);
      else {
        const choix = page.waitForEvent("filechooser", { timeout: 3000 }).catch(() => null);
        await etiquette.click();
        if (!(await choix)) defauts.push(`${ecran} : « ${nom} » n'ouvre pas le choix du fichier`);
      }
      continue;
    }
    const fichier = page.waitForEvent("filechooser", { timeout: 1500 }).catch(() => null);
    try {
      await bouton.click({ timeout: 3000 });
    } catch {
      // Une action qu'on découvre en glissant la ligne se donne aussi au clavier (le focus la montre) : on essaie ainsi.
      try {
        await bouton.focus();
        await bouton.click({ timeout: 2000 });
      } catch {
        defauts.push(`${ecran} : le bouton « ${nom} » ne se touche pas`);
        continue;
      }
    }
    await fichier;
    await page.waitForTimeout(400);
    await casse(`le bouton « ${nom} »`);
  }
  page.off("pageerror", surErreur);
  page.off("response", surReponse);
  return defauts;
}

test("Zéro bouton mort (visiteur) : landing, connexion, inscription, mot de passe, pages légales, liens négoce inconnus", async ({ page }) => {
  test.setTimeout(600_000);
  const defauts: string[] = [];
  const ecrans: [string, string][] = [
    ["landing", "/"],
    ["démo guidée", "/couvreurs?demo"],
    ["connexion", "/connexion"],
    ["inscription", "/inscription"],
    ["mot de passe oublié", "/mot-de-passe-oublie"],
    ["nouveau mot de passe sans jeton", "/nouveau-mot-de-passe"],
    ["mentions légales", "/mentions-legales"],
    ["CGU", "/cgu"],
    ["conditions négoce", "/conditions-negoce"],
    ["confidentialité", "/confidentialite"],
    ["réponse négoce, lien inconnu", "/reponse/lien-inconnu"],
    ["lien négoce inconnu", "/negoces/lien/lien-inconnu"],
    ["adresse inconnue", "/nulle-part"],
  ];
  for (const [ecran, url] of ecrans) {
    defauts.push(
      ...(await toutCliquer(page, ecran, async () => {
        await page.goto(url);
        await page.waitForLoadState("networkidle");
      })),
    );
  }
  // « Page introuvable » est attendu sur une adresse inconnue : seul le reste compte.
  expect(defauts.filter((d) => !/^adresse inconnue : l'ouverture/.test(d))).toEqual([]);
});

test("Zéro bouton mort (artisan) : accueil, chantiers, nouvelle liste, Ton chantier, fournisseurs, compte, formules, Regroupement", async ({ page }) => {
  test.setTimeout(900_000);
  await compteAuGroupe(page, "Toitures Clics", "4 rue de Kerampont, 22300 Lannion");
  // Une liste lue (photo), avec une ligne vague et des lignes précises.
  await page.goto("/chantiers/nouveau");
  await page.getByLabel("Déposer ma liste").setInputFiles(path.join(__dirname, "fixtures", "liste-manuscrite.png"));
  await expect(page).toHaveURL(/\/chantiers\/[0-9a-f-]{36}/, { timeout: 60_000 });
  const chantier = new URL(page.url()).pathname;
  await expect(page.getByRole("region", { name: "Liste des fournitures" })).toBeVisible({ timeout: 60_000 });
  const defauts: string[] = [];
  const ecrans: [string, string][] = [
    ["accueil", "/"],
    ["mes chantiers", "/chantiers"],
    ["nouvelle liste", "/chantiers/nouveau"],
    ["Ton chantier", chantier],
    ["page des fournitures", `${chantier}?vue=fournitures`],
    ["fournisseurs", "/fournisseurs"],
    ["compte", "/compte"],
    ["formules", "/formules"],
    ["Regroupement", "/groupe"],
    ["bienvenue", "/bienvenue"],
  ];
  for (const [ecran, url] of ecrans) {
    defauts.push(
      ...(await toutCliquer(page, ecran, async () => {
        await page.goto(url);
        await page.waitForLoadState("networkidle");
      })),
    );
  }
  expect(defauts).toEqual([]);
});

test("Cas limites (plan « finition », bloc 6) : fichier trop lourd, réseau coupé, photo floue, un seul chantier malgré les essais, retour arrière, session expirée, liens expirés", { tag: "@ancien" }, async ({ page }) => {
  await signUp(page);
  await page.goto("/chantiers/nouveau");
  const depot = page.getByLabel("Déposer ma liste");
  const photo = fs.readFileSync(path.join(__dirname, "fixtures", "liste-manuscrite.png"));
  // Un fichier de plus de 20 Mo : refusé avant l'envoi, en clair.
  await depot.setInputFiles({ name: "liste.png", mimeType: "image/png", buffer: Buffer.alloc(21_000_000, 1) });
  await expect(page.getByText("C'est trop volumineux pour être envoyé.")).toBeVisible();
  // Réseau coupé : rien n'est perdu, l'écran le dit.
  await page.context().setOffline(true);
  await depot.setInputFiles({ name: "liste-manuscrite.png", mimeType: "image/png", buffer: photo });
  await expect(page.getByText("Pas de connexion internet. Rien n'est perdu : réessaie dès que le réseau revient.")).toBeVisible();
  await page.context().setOffline(false);
  // Photo floue : le modèle ne lit aucune ligne ; on dit comment refaire la photo, jamais « devis » ni « PDF » abîmé.
  await depot.setInputFiles({ name: "photo-floue.png", mimeType: "image/png", buffer: photo });
  await expect(page.getByText("Je n'ai rien lu sur ce fichier. Reprends la photo bien à plat, bien éclairée, ou envoie un PDF.")).toBeVisible();
  // Le service de lecture en panne (recette en ligne, 24 octobre 2026) : la panne et son code support, jamais « reprends la photo ».
  await depot.setInputFiles({ name: "liste-panne.png", mimeType: "image/png", buffer: photo });
  await expect(page.getByText("Le service de lecture n'a pas répondu.", { exact: false })).toBeVisible();
  await expect(page.getByText(/^Code support : /)).toBeVisible();
  await expect(page.getByText("Je n'ai rien lu sur ce fichier.", { exact: false })).toHaveCount(0);
  // Puis la bonne photo : la liste arrive, et tous ces essais n'ont créé qu'un chantier.
  await depot.setInputFiles({ name: "liste-manuscrite.png", mimeType: "image/png", buffer: photo });
  await expect(page).toHaveURL(/\/chantiers\/[0-9a-f-]{36}/, { timeout: 60_000 });
  const chantier = page.url();
  await expect(page.getByRole("region", { name: "Liste des fournitures" })).toBeVisible({ timeout: 60_000 });
  const projets = await apiJson<{ items: unknown[] }>(page, "GET", "/v1/projects?status=all");
  expect(projets.body.items).toHaveLength(1);
  // Retour arrière : on ne retombe pas sur le dépôt (il reprendrait de zéro), et « en avant » rend la liste.
  await page.goBack();
  await expect(page).not.toHaveURL(/\/chantiers\/nouveau/);
  await expect(page.getByText("Oups, cet écran a eu un souci")).toHaveCount(0);
  await page.goForward();
  await expect(page.getByRole("region", { name: "Liste des fournitures" })).toBeVisible();
  expect(page.url()).toBe(chantier);
  // Session expirée en pleine action : la phrase, et un bouton pour se reconnecter qui ramène ici.
  await page.goto("/chantiers/nouveau");
  // Les lectures de l'écran (le bandeau de l'abonnement) finissent avant que la session expire.
  await page.waitForLoadState("networkidle");
  await page.context().clearCookies();
  await depot.setInputFiles({ name: "liste-manuscrite.png", mimeType: "image/png", buffer: photo });
  await expect(page.getByText("Ta session a expiré. Reconnecte-toi.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Me reconnecter" })).toHaveAttribute("href", "/connexion?retour=%2Fchantiers%2Fnouveau");
  // Liens expirés ou tronqués (négoce) : la page le dit, sans formulaire.
  await page.goto("/reponse/lien-expire");
  await expect(page.getByText("Ce lien n'est plus valable.")).toBeVisible();
  await page.goto("/negoces/lien/lien-expire");
  await expect(page.getByText("Ce lien n'est plus valable.")).toBeVisible();
});

/**
 * LA COMMANDE COMMUNE DU MOIS (Greg, 22 octobre 2026, au soir), de bout en bout dans le navigateur. Le cas posé à la main
 * dans `docs/groupe/RECETTE.md` (« Commande du mois : les totaux à la main ») : A à Lannion (2 000 ardoises, 400 m de
 * liteaux), B à Paimpol (3 000 ardoises, 10 boîtes de crochets, du stock), C à Lannion qui arrive après la clôture et part
 * au mois suivant ; N1 (Lannion, gratuit jusqu'à 20 km, 50 € au-delà), N2 (Paimpol, 30 km, 40 €), N3 (Lannion, 10 km,
 * 60 €) qui ne chiffre pas les crochets. Les dates viennent de l'API (le mois dépend du jour où la série tourne) ; la
 * tâche planifiée est appelée à la clôture puis à la limite (`?maintenant=`, test seulement).
 */
const ARDOISE_MOIS = "Ardoise naturelle 32×22 Espagne 1er choix";
const LITEAU_MOIS = "Liteau sapin traité 27×38";
const CROCHET_MOIS = "Crochet inox 100 mm";

interface CommandeMoisApi {
  cycleId: string;
  mois: string;
  de: string;
  phase: string;
  clotureLe: string;
  reponseAvant: string;
}

/** Une liste déjà prête (lignes données à la porte `/v1/quantitatifs`), au bon chantier, à la bonne adresse. Rend son id. */
async function listePrete(page: Page, adresse: string, lignes: { libelle: string; quantite: string; unite: string }[]): Promise<string> {
  const q = await apiJson<{ projetId: string }>(page, "POST", "/v1/quantitatifs", { lignes });
  expect(q.status).toBe(201);
  expect(await apiCall(page, "PATCH", `/v1/projects/${q.body.projetId}`, { address: adresse })).toBe(200);
  return q.body.projetId;
}

/** Sur « Ton chantier » : « Ajouter à la commande de … », toutes les lignes cochées, chantier signé ou stock, « Ajouter ». */
async function ajouterAuMois(page: Page, projectId: string, nature: "Un chantier signé" | "Du stock"): Promise<void> {
  await page.goto(`/chantiers/${projectId}`);
  const bloc = page.getByRole("region", { name: /^Regroupement d/ });
  await expect(bloc.getByText("Une commande toutes les deux semaines avec les artisans de ta région.")).toBeVisible();
  await expect(bloc.getByText(/^Clôture dans \d+ j/)).toBeVisible();
  await bloc.getByRole("button", { name: /^Ajouter à la commande d/ }).click();
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  const boxes = list.getByRole("checkbox", { name: /^Ajouter à la commande : / }).and(page.locator(":enabled"));
  for (const box of await boxes.all()) await box.check();
  const bar = page.getByRole("region", { name: /^Ajouter à la commande d/ });
  await expect(bar.getByText("Sans engagement : tu commandes seulement si le prix te plaît.", { exact: false })).toBeVisible();
  await expect(bar.getByRole("button", { name: "Ajouter" })).toBeDisabled();
  await bar.getByRole("radio", { name: nature }).click();
  await bar.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByRole("region", { name: /^Dans la commande d/ })).toBeVisible();
}

async function tacheDuMois(page: Page, maintenant: string): Promise<Record<string, number>> {
  return page.evaluate(async (maintenant) => {
    const res = await fetch(`/v1/internal/commande-du-mois?maintenant=${encodeURIComponent(maintenant)}`, { headers: { authorization: "Bearer e2e-secret-de-la-tache" } });
    return res.json();
  }, maintenant);
}

/**
 * ESPACE NÉGOCE (Greg, 23 octobre 2026) : le négoce crée son accès depuis le lien d'invitation reçu par e-mail
 * (`/negoce/rejoindre/<jeton>`) : e-mail prérempli, enseigne, un dépôt, ses paliers (gratuite jusqu'à X km, Y € jusqu'à
 * 1 000 km), le 22 coché d'office, les conditions. Puis son espace : « Prochaine clôture dans », jamais un nom d'artisan.
 */
async function accesNegoceCree(browser: Browser, page: Page, email: string, enseigne: string, depot: string, livraison: [string, string]) {
  const mail = (await emailsVers(page, email)).filter((m) => /\/negoce\/rejoindre\//.test(m.text)).at(-1)!;
  expect(mail.subject).toBe("Des artisans de votre secteur vous ont ajouté au regroupement : créez votre accès");
  expect(mail.text).toContain("Un artisan de votre secteur (22) vous a ajouté");
  expect(mail.text).not.toMatch(/Toitures [ABC]/);
  const lien = /https?:\/\/[^\s]+\/negoce\/rejoindre\/[A-Za-z0-9_.-]+/.exec(mail.text)![0]!.replace(/^https?:\/\/[^/]+/, "");
  const contexte = await browser.newContext({ ...(test.info().project.use as object) });
  const pageN = await passeGuide(await contexte.newPage());
  await pageN.goto(lien);
  const form = pageN.getByRole("form", { name: "Créer mon accès" });
  await expect(form.getByLabel("E-mail")).toHaveValue(email);
  await form.getByLabel("Nom de l'enseigne").fill(enseigne);
  await form.getByLabel("Adresse du dépôt 1").fill(depot);
  await form.getByLabel("Livraison gratuite jusqu'à, en km").fill(livraison[0]);
  await form.getByLabel("Prix du palier 1, en euros HT").fill(livraison[1]);
  await form.getByLabel("Distance du palier 1, en km").fill("1000");
  await form.getByLabel("Distance maximale de livraison, en km").fill("1000");
  await expect(form.getByRole("button", { name: "Retirer le département 22" })).toBeVisible();
  await expect(form.getByRole("button", { name: "Créer mon accès" })).toBeDisabled();
  await form.getByRole("checkbox", { name: /J'accepte les conditions/ }).check();
  // Multimétier (25 octobre 2026) : sans choix généraliste / spécialiste, l'accès ne se crée pas.
  await expect(form.getByRole("button", { name: "Créer mon accès" })).toBeDisabled();
  await form.getByRole("radio", { name: "Spécialiste : je chiffre seulement mes familles" }).check();
  await form.getByRole("group", { name: "Mes familles" }).getByRole("checkbox", { name: "Couverture" }).check();
  await form.getByRole("button", { name: "Créer mon accès" }).click();
  await expect(pageN.getByRole("status")).toContainText(/^Vous recevrez la prochaine grille de votre secteur à la clôture du (1er|\d{1,2}) \S+ à 12 h\.$/);
  // Son espace, pendant les dépôts des artisans : le chrono, rien d'autre ; aucun nom d'artisan.
  await pageN.goto("/negoce");
  await expect(pageN.getByRole("heading", { name: enseigne })).toBeVisible();
  await expect(pageN.getByRole("region", { name: "Prochaine clôture" })).toContainText(/Prochaine clôture dans\s*\d+ j/);
  await expect(pageN.getByText(/Toitures [ABC]|rue des Ajoncs|rue du Port/)).toHaveCount(0);
  expect(await pageN.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await contexte.close();
}

/** Le négoce ouvre son lien (dans le dernier e-mail qu'il a reçu), coche « prix fermes quel que soit le volume » et dépose son PDF. */
async function grilleDeposee(browser: Browser, page: Page, email: string, rows: [string, string, string, string, string][]) {
  const mail = (await emailsVers(page, email)).filter((m) => /\/grille\//.test(m.text)).at(-1)!;
  const lien = /https?:\/\/[^\s]+\/grille\/[A-Za-z0-9_-]+/.exec(mail.text)![0]!.replace(/^https?:\/\/[^/]+/, "");
  const contexte = await browser.newContext({ ...(test.info().project.use as object) });
  const pageN = await passeGuide(await contexte.newPage());
  await pageN.goto(lien);
  await expect(pageN.getByRole("heading", { name: /^Regroupement du (1er|\d{1,2}) \S+ \d{4}$/ })).toBeVisible();
  await expect(pageN.getByText(/^Réponse avant le \d\d\/\d\d à 18 h, il reste \d+ j/)).toBeVisible();
  await expect(pageN.getByText("Chaque artisan choisit le négoce le moins cher pour lui.", { exact: false })).toBeVisible();
  await expect(pageN.getByRole("region", { name: "La grille" }).getByRole("listitem")).toHaveCount(3);
  await expect(pageN.getByText(/Toitures [ABC]|Lannion \(|Paimpol \(|rue des Ajoncs|rue du Port/)).toHaveCount(0);
  // Les zones de livraison en communes seulement (confidentialité, point 4).
  await expect(pageN.getByText(/^Livraisons à : 22300 Lannion, 22500 Paimpol\./)).toBeVisible();
  const { makePdf } = await import("../../api/test/support/pdf-fixtures");
  const pdf = Buffer.from(await makePdf(["devis"], rows, "Total HT 1 000,00", "DEVIS"));
  const form = pageN.getByRole("form", { name: "Déposer mon devis" });
  await form.locator('input[type="file"]').setInputFiles({ name: "devis.pdf", mimeType: "application/pdf", buffer: pdf });
  // Sans la case « Prix fermes, quel que soit le volume final », rien ne part (point 5).
  await expect(form.getByRole("button", { name: "Déposer mon devis" })).toBeDisabled();
  await form.getByRole("checkbox", { name: "Prix fermes, quel que soit le volume final." }).check();
  await form.getByRole("button", { name: "Déposer mon devis" }).click();
  const statut = pageN.getByRole("status", { name: "Votre dépôt" });
  await expect(statut).toContainText("Devis reçu");
  expect(await pageN.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  return { pageN, contexte, statut, lien };
}

test("Commande du mois : un cycle complet, trois artisans (C après la clôture), trois négoces (N3 sans les crochets), les totaux posés à la main", { tag: "@ancien" }, async ({ page, browser }) => {
  test.setTimeout(300_000);
  const projet = test.info().project.name;
  const n = (i: number) => `n${i}-${projet}@example.com`;
  // A, à Lannion : il ajoute les trois négoces couverture du 22.
  await compteAuGroupe(page, "Toitures A", "3 rue des Ajoncs, 22300 Lannion");
  for (const i of [1, 2, 3]) expect(await apiCall(page, "POST", "/v1/groupe/negoces", { nom: `Négoce N${i}`, email: n(i), familles: ["couverture"] })).toBe(201);
  // Invitation → inscription : chaque négoce crée son accès (dépôt, paliers) depuis son lien ; N1 et N3 à Lannion, N2 à Paimpol.
  await accesNegoceCree(browser, page, n(1), "Négoce N1", "Zone de Kerampont, 22300 Lannion", ["20", "50"]);
  await accesNegoceCree(browser, page, n(2), "Négoce N2", "ZA de Kerfolic, 22500 Paimpol", ["30", "40"]);
  await accesNegoceCree(browser, page, n(3), "Négoce N3", "Zone de Kerampont, 22300 Lannion", ["10", "60"]);
  const projetA = await listePrete(page, "3 rue des Ajoncs, 22300 Lannion", [
    { libelle: ARDOISE_MOIS, quantite: "2000", unite: "pièces" },
    { libelle: LITEAU_MOIS, quantite: "400", unite: "m" },
  ]);
  await ajouterAuMois(page, projetA, "Un chantier signé");
  // L'onglet : en quantités, jamais en nombre d'entreprises ; « tu es le premier » ; le partage dessous.
  await page.goto("/groupe");
  // Les trois étapes, repliées une fois tout fait (SIRET, liste, négoces).
  await page.getByText("Comment ça marche", { exact: true }).click();
  await expect(page.getByRole("list", { name: "Comment ça marche" }).getByRole("listitem")).toHaveText(["1. Dépose ta liste avant la clôture.", "2. On envoie tout le volume aux négoces.", "3. Tu vois le meilleur prix et tu commandes si ça te plaît."]);
  const carteA = page.getByRole("region", { name: /^Commande d/ }).first();
  await expect(carteA.getByText(/^Toi seul : 2\s000 pièces d'ardoise naturelle 32×22/)).toBeVisible();
  await expect(carteA.getByText("Pour l'instant, tu es le premier. Partage le lien pour faire grossir la commande.")).toBeVisible();
  await expect(carteA.getByText(/^Clôture dans \d+ j/)).toBeVisible();
  await expect(page.getByText(/\d+ couvreurs|\d+ demandes envoyées|entreprises/)).toHaveCount(0);
  const cycle = (await apiJson<{ commandes: CommandeMoisApi[] }>(page, "GET", "/v1/commande-du-mois")).body.commandes.find((c) => c.phase === "inscriptions")!;

  // B, à Paimpol, du stock, dans un autre navigateur.
  const contexteB = await browser.newContext({ ...(test.info().project.use as object) });
  const pageB = await passeGuide(await contexteB.newPage());
  await compteAuGroupe(pageB, "Toitures B", "12 rue du Port, 22500 Paimpol");
  const projetB = await listePrete(pageB, "12 rue du Port, 22500 Paimpol", [
    { libelle: ARDOISE_MOIS, quantite: "3000", unite: "pièces" },
    { libelle: CROCHET_MOIS, quantite: "10", unite: "boîtes" },
  ]);
  await ajouterAuMois(pageB, projetB, "Du stock");
  await page.goto("/groupe");
  await expect(page.getByText(/^Toute la commande du (1er|\d{1,2}) \S+ : 5\s000 pièces d'ardoise naturelle 32×22 Espagne 1er choix, 400 m de liteau sapin traité 27×38, 10 boîtes de crochet inox 100 mm$/)).toBeVisible();
  await expect(page.getByText("Pour l'instant, tu es le premier.", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Toitures B")).toHaveCount(0);

  // La clôture : tout est figé, la grille fusionnée part aux trois négoces.
  const apresCloture = new Date(Date.parse(cycle.clotureLe) + 60_000).toISOString();
  // Trois négoces de plus quand la série « ordinateur » passe après « téléphone » (même département, même base).
  const cloture = await tacheDuMois(page, apresCloture);
  // Une commande ouverte par un autre parcours (autre département, même date) peut se clore au même instant.
  expect(cloture.clos).toBeGreaterThanOrEqual(1);
  expect(cloture.grillesEnvoyees).toBeGreaterThanOrEqual(3);
  await page.goto(`/chantiers/${projetA}`);
  await expect(page.getByRole("region", { name: "Suivi du chantier" }).getByRole("list", { name: "Étapes" }).getByRole("listitem")).toHaveCount(5);
  await page.goto("/groupe");
  await expect(page.getByRole("button", { name: "Retirer" })).toHaveCount(0);

  // C, à Lannion, après la clôture, l'écran encore sur la commande close : sa liste part avec la suivante, en clair ; il la
  // retire tant que celle-ci est ouverte.
  const contexteC = await browser.newContext({ ...(test.info().project.use as object) });
  const pageC = await passeGuide(await contexteC.newPage());
  await compteAuGroupe(pageC, "Toitures C", "5 rue de Kerampont, 22300 Lannion");
  const projetC = await listePrete(pageC, "5 rue de Kerampont, 22300 Lannion", [{ libelle: ARDOISE_MOIS, quantite: "1000", unite: "pièces" }]);
  const articlesC = (await apiJson<{ takeoff: { purchase: { toBuy: { key: string }[] } } }>(pageC, "GET", `/v1/projects/${projetC}/takeoff`)).body.takeoff.purchase.toBuy.map((b) => b.key);
  const depotC = await apiJson<{ mois: string; message: string }>(pageC, "POST", `/v1/projects/${projetC}/commande-du-mois?maintenant=${encodeURIComponent(apresCloture)}`, { articles: articlesC, nature: "chantier", mois: cycle.mois });
  expect(depotC.status).toBe(201);
  expect(depotC.body.mois).not.toBe(cycle.mois);
  expect(depotC.body.message).toMatch(/^Trop tard pour le (1er|\d{1,2}) \S+, ta liste part avec la commande du (1er|\d{1,2}) \S+\.$/);
  await pageC.goto("/groupe");
  const carteC = pageC.getByRole("region", { name: /^Commande d/ }).first();
  await expect(carteC.getByText(/^Toi seul : 1\s000 pièces/)).toBeVisible();
  await carteC.getByRole("button", { name: "Retirer" }).click();
  await expect(carteC.getByRole("button", { name: "Retirer" })).toHaveCount(0);
  await contexteC.close();

  // Les négoces chiffrent la MÊME grille. Pendant le chrono : premier ou pas, jamais les prix des autres.
  const n1 = await grilleDeposee(browser, page, n(1), [["A", ARDOISE_MOIS, "5000 pièces", "0,90", "4 500,00"], ["L", LITEAU_MOIS, "400 m", "0,80", "320,00"], ["C", CROCHET_MOIS, "10 boîtes", "30,00", "300,00"]]);
  await expect(n1.statut).toContainText("Vous êtes premier sur le total de la commande.");
  const n2 = await grilleDeposee(browser, page, n(2), [["A", ARDOISE_MOIS, "5000 pièces", "0,88", "4 400,00"], ["L", LITEAU_MOIS, "400 m", "0,85", "340,00"], ["C", CROCHET_MOIS, "10 boîtes", "32,00", "320,00"]]);
  await expect(n2.statut).toContainText("Vous êtes premier sur le total de la commande.");
  const n3 = await grilleDeposee(browser, page, n(3), [["A", ARDOISE_MOIS, "5000 pièces", "0,80", "4 000,00"], ["L", LITEAU_MOIS, "400 m", "0,70", "280,00"]]);
  // N3 est le moins cher sur ce qu'il chiffre, mais incomplet : il passe derrière.
  await expect(n3.statut).toContainText("Vous n'êtes pas premier sur le total de la commande.");
  await expect(n3.statut).toContainText("1 article sans prix");
  await n1.pageN.reload();
  await expect(n1.pageN.getByRole("status", { name: "Votre dépôt" })).toContainText("Vous n'êtes pas premier sur le total de la commande.");
  await expect(n1.pageN.getByText(/0,88|0,85|32,00/)).toHaveCount(0);
  for (const x of [n1, n2, n3]) await x.contexte.close();

  // À la limite : figé, résultats. A : N2 en avant (le moins cher sur toute la commande), N3 le moins cher pour lui.
  // Les projets téléphone et ordinateur partagent la base e2e : la tâche publie aussi un cycle laissé par l'autre passe
  // (même famille, même zone). Ce cycle-ci est publié : les e-mails de ses négoces, juste dessous, le prouvent.
  expect((await tacheDuMois(page, new Date(Date.parse(cycle.reponseAvant) + 60_000).toISOString())).resultats).toBeGreaterThanOrEqual(1);
  expect((await emailsVers(page, n(2))).at(-1)!.text).toContain("Votre grille est la moins chère sur le total");
  expect((await emailsVers(page, n(1))).at(-1)!.text).not.toMatch(/0,88|Négoce N2/);
  await page.goto("/groupe");
  const prixA = page.getByRole("region", { name: "Tes prix" });
  // Multimétier (25 octobre 2026) : les meilleures options livrées, la moins chère d'abord et cochée d'office ; l'écart
  // en euros et le nombre de livraisons. Une liste toute en couverture : « Tout chez … » pour chaque négoce complet.
  await expect(prixA.getByRole("radio", { name: /^Tout chez Négoce N3 : 1\s880,00 € HT livré, 1 livraison/ })).toBeChecked();
  await expect(prixA.getByRole("radio", { name: /^Tout chez Négoce N1 : 2\s120,00 € HT livré, 1 livraison/ })).not.toBeChecked();
  const chezN2 = prixA.getByRole("radio", { name: /^Tout chez Négoce N2 : 2\s140,00 € HT livré, 1 livraison/ });
  await expect(prixA.getByText("La moins chère", { exact: true })).toBeVisible();
  await expect(prixA.getByText(/^260,00 € de plus$/)).toBeVisible();
  await expect(prixA.getByText("Livraison 40,00 €", { exact: true })).toBeVisible();
  // L'artisan choisit : ici N2, plus cher pour lui.
  await chezN2.check();
  // Confidentialité (point 4) : avant la commande, l'écran dit ce qui part, et attend la confirmation.
  await prixA.getByRole("button", { name: "Commander : Tout chez Négoce N2" }).click();
  const confirmation = prixA.getByRole("group", { name: "Confirmer la commande" });
  await expect(confirmation).toContainText("En commandant, tu transmets tes coordonnées et ton adresse de livraison à Négoce N2.");
  await confirmation.getByRole("button", { name: "Confirmer la commande" }).click();
  await expect(prixA.getByRole("status")).toContainText(/Commandé : Tout chez Négoce N2, 2\s140,00 € HT livré/);
  await expect.poll(async () => (await emailsVers(page, n(2))).some((m) => /bon de commande/i.test(m.subject))).toBe(true);
  // Le bon porte « Prix ferme du regroupement du … » ; N1 et N3 n'ont rien reçu d'A.
  expect((await emailsVers(page, n(2))).filter((m) => /bon de commande/i.test(m.subject)).at(-1)!.text).toContain("Toitures A");
  expect((await emailsVers(page, n(1))).map((m) => m.text).join("\n")).not.toContain("Toitures A");
  await page.goto(`/chantiers/${projetA}`);
  await expect(page.getByRole("region", { name: "Suivi du chantier" })).toContainText("C'est commandé.");

  // GRILLE GARANTIE 30 JOURS (point 6) : « Prix garantis jusqu'au … », et A recommande 100 ardoises au prix garanti.
  await page.goto("/groupe");
  // Deux fenêtres ouvertes (la série « ordinateur » après « téléphone », même zone) = deux blocs, le plus récent d'abord.
  const garantie = page.getByRole("region", { name: /^Prix garantis jusqu'au (1er|\d{1,2}) \S+$/ }).first();
  await expect(garantie).toContainText("Chez Négoce N2, sur la grille garantie du");
  await expect(garantie.getByText(/0,88 € HT \/ pièces/)).toBeVisible();
  await garantie.getByRole("button", { name: "Recommander à ce prix" }).click();
  const recommande = garantie.getByRole("form", { name: "Recommander à ce prix" });
  await recommande.getByLabel(new RegExp(`^${ARDOISE_MOIS}`)).fill("100");
  await recommande.getByLabel("Adresse de livraison (avec le code postal)").fill("3 rue des Ajoncs, 22300 Lannion");
  await expect(recommande.getByText("88,00 € HT de matériaux", { exact: false })).toBeVisible();
  // Livré à Lannion depuis le dépôt de Paimpol : 40 € de livraison, les paliers de N2 ; 128 € livré.
  await recommande.getByRole("button", { name: "Commander chez Négoce N2" }).click();
  await recommande.getByRole("group", { name: "Confirmer la commande" }).getByRole("button", { name: "Confirmer la commande" }).click();
  await expect(garantie.getByRole("status")).toContainText(/^C'est commandé : bon n° \d+, 128,00 € HT livré, parti chez Négoce N2\. Commande sur grille garantie du/);
  await expect.poll(async () => (await emailsVers(page, n(2))).filter((m) => /bon de commande/i.test(m.subject)).length).toBe(2);
  expect((await emailsVers(page, n(2))).at(-1)!.text).toContain("grille garantie");
  // Un autre artisan de la zone la voit aussi, sans avoir rien déposé pour elle (recentrage : sur l'écran du regroupement,
  // plus sur l'accueil).
  await pageB.goto("/groupe");
  await expect(pageB.getByRole("region", { name: /^Prix garantis jusqu'au/ }).first().getByRole("button", { name: "Recommander à ce prix" })).toBeVisible();

  // B : N3 n'a pas chiffré ses crochets, il n'entre dans aucune option ; N2 en tête à 2 960 €.
  await pageB.goto("/groupe");
  const prixB = pageB.getByRole("region", { name: "Tes prix" });
  await expect(prixB.getByRole("radio", { name: /^Tout chez Négoce N2 : 2\s960,00 € HT livré/ })).toBeChecked();
  await expect(prixB.getByRole("radio", { name: /^Tout chez Négoce N1 : 3\s050,00 € HT livré/ })).toBeVisible();
  await expect(prixB.getByRole("radio", { name: /Négoce N3/ })).toHaveCount(0);
  await expect(prixB.getByText("Toitures A")).toHaveCount(0);
  expect(await pageB.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await contexteB.close();
});

/**
 * LE SUIVI DES DEMANDES DE PRIX (Greg, 24 octobre 2026) : 0, 1, plusieurs, puis toutes les réponses, à l'écran. Un
 * département par série (29 au téléphone, 56 sur ordinateur) : rien ne se mêle à la commande du 22. Jamais un nom de
 * concurrent ni un prix avant les résultats ; le négoce sait combien sont consultés, jamais lesquels.
 */
test("Suivi des demandes de prix : 0, 1, plusieurs puis toutes les réponses, le bilan à l'échéance", { tag: "@ancien" }, async ({ page }) => {
  test.setTimeout(240_000);
  const projet = test.info().project.name;
  const [dep, ville] = projet === "ordinateur" ? ["56", "56000 Vannes"] : ["29", "29600 Morlaix"];
  const adresse = `8 rue du Port, ${ville}`;
  const n = (i: number) => `suivi${i}-${projet}@example.com`;
  await compteAuGroupe(page, "Toitures S", adresse);
  for (const i of [1, 2, 3]) {
    expect(await apiCall(page, "POST", "/v1/groupe/negoces", { nom: `Négoce S${i}`, email: n(i), familles: ["couverture"] })).toBe(201);
    const mail = (await emailsVers(page, n(i))).filter((m) => /\/negoce\/rejoindre\//.test(m.text)).at(-1)!;
    const jeton = /\/negoce\/rejoindre\/([A-Za-z0-9_.-]+)/.exec(mail.text)![1]!;
    const r = await page.request.post("/v1/negoce/inscription", {
      data: { jeton, email: n(i), siret: null, enseigne: `Négoce S${i}`, telephone: "02 98 00 00 00", depots: [{ adresse: `ZA du Port, ${ville}` }], livraison: { gratuiteJusquaKm: 30, paliers: [{ jusquaKm: 1000, prixHt: 50 }], maxKm: 1000 }, departements: [dep], conditions: true },
    });
    expect(r.status()).toBe(201);
  }
  const projetS = await listePrete(page, adresse, [{ libelle: ARDOISE_MOIS, quantite: "1200", unite: "pièces" }]);
  const articles = (await apiJson<{ takeoff: { purchase: { toBuy: { key: string }[] } } }>(page, "GET", `/v1/projects/${projetS}/takeoff`)).body.takeoff.purchase.toBuy.map((b) => b.key);
  expect((await apiJson(page, "POST", `/v1/projects/${projetS}/commande-du-mois`, { articles, nature: "chantier" })).status).toBe(201);
  const cycle = (await apiJson<{ commandes: CommandeMoisApi[] }>(page, "GET", "/v1/commande-du-mois")).body.commandes.find((c) => c.phase === "inscriptions")!;
  // Une autre commande ouverte par un parcours précédent (autre département, même date) peut se clore avec celle-ci.
  const cloture = await tacheDuMois(page, new Date(Date.parse(cycle.clotureLe) + 60_000).toISOString());
  expect(cloture.clos).toBeGreaterThanOrEqual(1);
  expect(cloture.grillesEnvoyees).toBeGreaterThanOrEqual(3);

  // 0 réponse : « Demandes envoyées à 3 négoces de ton secteur », le chrono des résultats, la barre à zéro.
  await page.goto("/groupe");
  const suivi = page.getByRole("region", { name: "Prix demandés" }).first();
  await expect(suivi.getByText("Demandes envoyées à 3 négoces de ton secteur")).toBeVisible();
  await expect(suivi.getByText(/^Résultats le \d\d\/\d\d à 18 h$/)).toBeVisible();
  await expect(suivi.getByText("Aucun négoce sur 3 n'a encore répondu")).toBeVisible();
  await expect(suivi.getByRole("progressbar", { name: "Réponses des négoces" })).toHaveAttribute("aria-valuenow", "0");
  await expect(suivi.getByText("Ton négoce Négoce S1 n'a pas encore répondu.")).toBeVisible();

  const { makePdf } = await import("../../api/test/support/pdf-fixtures");
  const repond = async (i: number) => {
    const mail = (await emailsVers(page, n(i))).filter((m) => /\/grille\//.test(m.text)).at(-1)!;
    const jeton = /\/grille\/([A-Za-z0-9_-]+)/.exec(mail.text)![1]!;
    const pdf = Buffer.from(await makePdf(["devis"], [["A", ARDOISE_MOIS, "1200 pièces", `0,9${i}`, ""]], "Total HT 1 000,00", "DEVIS"));
    const r = await page.request.post(`/v1/grille/${jeton}`, { multipart: { fermes: "oui", file: { name: "devis.pdf", mimeType: "application/pdf", buffer: pdf } } });
    expect(r.status()).toBe(201);
    return jeton;
  };
  // 1 réponse : le compteur bouge, son négoce « a répondu », jamais son prix.
  const jeton1 = await repond(1);
  await page.reload();
  await expect(suivi.getByText("1 négoce sur 3 a répondu")).toBeVisible();
  await expect(suivi.getByText("Ton négoce Négoce S1 a répondu.")).toBeVisible();
  await expect(page.getByText(/0,91/)).toHaveCount(0);
  // Plusieurs : 2 sur 3 ; sur l'accueil, la même carte ; le bandeau des autres écrans aussi.
  await repond(2);
  await page.goto(`/chantiers/${projetS}`);
  await expect(page.getByRole("link", { name: /2 négoces sur 3 ont répondu/ })).toContainText("2/3 réponses");
  await expect(page.getByRole("region", { name: "Suivi du chantier" })).toContainText("Demandes envoyées à 3 négoces de ton secteur.");
  // Toutes : « Les 3 négoces ont répondu ».
  await repond(3);
  await page.goto("/groupe");
  await expect(page.getByRole("region", { name: "Prix demandés" }).first().getByText("Les 3 négoces ont répondu")).toBeVisible();
  // Le négoce sait combien sont consultés, jamais lesquels.
  const vueNegoce = await page.request.get(`/v1/grille/${jeton1}`);
  const corps = (await vueNegoce.json()) as { consultation: string };
  expect(corps.consultation.replace(/[\u202f\u00a0]/g, " ")).toMatch(/^3 négoces consultés, résultats le \d\d\/\d\d à 18 h\.$/);
  expect(JSON.stringify(corps)).not.toMatch(/Négoce S2|Négoce S3|0,92|0,93/);

  // À l'échéance : le bilan, puis les prix.
  // Les projets téléphone et ordinateur partagent la base e2e : la tâche publie aussi un cycle laissé par l'autre passe
  // (même famille, même zone). Ce cycle-ci est publié : les e-mails de ses négoces, juste dessous, le prouvent.
  expect((await tacheDuMois(page, new Date(Date.parse(cycle.reponseAvant) + 60_000).toISOString())).resultats).toBeGreaterThanOrEqual(1);
  await page.goto("/groupe");
  await expect(page.getByText("Sur 3 demandes, 3 négoces ont répondu. Voici le meilleur prix livré pour toi.").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Tes prix" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("Abonnement (24 octobre 2026) : « Tarifs » depuis la landing, deux formules, bandeau d'essai, paiement simulé du mensuel, passage à l'annuel au prorata, factures TEST, résiliation en deux clics", async ({ page }) => {
  // La landing mène aux tarifs : trois étapes, l'argument (une possibilité), gratuit pour les négoces, la FAQ.
  await page.goto("/");
  // Landing premium V3 (30 octobre 2026) : « Tarifs » dans le pied de page.
  await page.getByRole("navigation", { name: "Informations et liens légaux" }).getByRole("link", { name: "Tarifs" }).click();
  await expect(page).toHaveURL(/\/tarifs$/);
  await expect(page.getByRole("heading", { level: 1, name: "Tarifs" })).toBeVisible();
  // Greg, 27 octobre 2026, 2e message, points 26 et 34 : la phrase des tarifs, aucun montant, plus d'essai.
  // Greg, 29 octobre 2026 : la même phrase que la landing, ce qui est gratuit et ce qui est payant.
  await expect(page.getByText("Gratuit pour tes listes et tes négoces. Les achats groupés sont sur abonnement : le premier est offert.", { exact: true })).toBeVisible();
  for (const etape of ["Commence gratuitement", "Ton premier achat groupé est offert", "Abonne-toi si ça te sert"]) {
    await expect(page.getByRole("heading", { name: etape })).toBeVisible();
  }
  const ga = page.getByRole("region", { name: "Gratuit ou abonné" });
  await expect(ga.getByText("· Envoyées à tes négoces, leurs prix comparés")).toBeVisible();
  await expect(ga.getByText("· 3 listes préparées pour toi depuis un devis ou une photo")).toBeVisible();
  await expect(ga.getByText("· Rejoindre les achats groupés de ton métier")).toBeVisible();
  await expect(page.getByText("Qu'est-ce qui est payant ?")).toBeVisible();
  await expect(page.getByText(/\d+ € HT/)).toHaveCount(0);
  await expect(page.getByText(/essai/i)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Gratuit pour les négoces" })).toBeVisible();
  await expect(page.getByText("Comment je résilie ?")).toBeVisible();

  // L'essai du mode humain (ce parcours y tourne ; le mode automatique n'en a plus) : le bandeau compte les jours.
  await signUp(page);
  await expect(page.getByRole("link", { name: /Essai gratuit : encore 60 jours/ })).toBeVisible();
  await page.getByRole("link", { name: /Essai gratuit : encore 60 jours/ }).click();
  await expect(page).toHaveURL(/\/abonnement$/);
  await expect(page.getByText("Mode test : aucun paiement réel")).toBeVisible();
  await expect(page.getByText("Essai gratuit", { exact: true })).toBeVisible();

  // Les deux formules, l'annuel coché d'office ; l'artisan prend le mensuel.
  await expect(page.getByRole("radio", { name: /Annuel/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: /Mensuel/ }).click();
  await expect(page.getByRole("radio", { name: /Mensuel/ })).toHaveAttribute("aria-checked", "true");
  // « M'abonner » : la page de paiement simulée, au prix du mensuel, puis « Payer ».
  await page.getByRole("button", { name: "M'abonner dès maintenant" }).click();
  await expect(page).toHaveURL(/\/paiement-simule\?session=sim_/);
  await expect(page.getByRole("heading", { name: "Paiement (simulation)" })).toBeVisible();
  await expect(page.getByText("Mode test : aucun paiement réel")).toBeVisible();
  await expect(page.getByText("Abonnement mensuel : 49 € HT par mois (58,80 € TTC), sans engagement.")).toBeVisible();
  await page.getByRole("button", { name: "Payer", exact: true }).click();
  await expect(page).toHaveURL(/\/abonnement$/);
  await expect(page.getByText("Abonné au mois", { exact: true })).toBeVisible();
  await expect(page.getByText("49 € HT par mois (58,80 € TTC), sans engagement.")).toBeVisible();

  // Du mois à l'année, au prorata : ce qui reste du mois est déduit, l'année est payée tout de suite.
  await expect(page.getByText("Passe à l'annuel : -40 %")).toBeVisible();
  await expect(page.getByText(/^29 € HT par mois, payé à l'année\. Ce qui reste de ton mois \([\d,]+ €\) est déduit : tu paies [\d\s\u202f,]+ € HT/)).toBeVisible();
  await page.getByRole("button", { name: "Passer à l'annuel" }).click();
  await page.getByRole("button", { name: /^Oui, payer [\d\s\u202f,]+ € TTC$/ }).click();
  await expect(page.getByText("Abonné à l'année", { exact: true })).toBeVisible();
  await expect(page.getByText("348 € HT par an (417,60 € TTC), payé en une fois, renouvelé chaque année.")).toBeVisible();
  await expect(page.getByText(/Je te préviens par e-mail 30 jours avant\./)).toBeVisible();

  // « Mes factures » : les deux factures TEST (le mois, puis le passage à l'annuel), téléchargeables.
  await page.getByRole("tab", { name: "Mes factures" }).click();
  const factures = page.getByRole("list", { name: "Mes factures" });
  await expect(factures.getByText(/^TEST-\d{6}/)).toHaveCount(2);
  await expect(factures.getByText(/ 58,80 € TTC/)).toBeVisible();
  const download = page.waitForEvent("download");
  await factures.getByRole("link", { name: "Télécharger" }).first().click();
  expect((await download).suggestedFilename()).toMatch(/^TEST-\d{6}\.pdf$/);

  // Résilier en deux clics : effet en fin de période.
  await page.getByRole("tab", { name: "Mon abonnement" }).click();
  await page.getByRole("button", { name: "Résilier" }).click();
  await expect(page.getByText(/Une année commencée n'est pas remboursée au prorata\./)).toBeVisible();
  await page.getByRole("button", { name: "Oui, résilier" }).click();
  await expect(page.getByText(/^Résilié : ton accès reste jusqu'au/)).toBeVisible();
});

test("Abonnement : un paiement refusé met le bandeau rouge, avec la date limite", async ({ page }) => {
  await signUp(page);
  await menuArtisan(page, "Mon abonnement");
  await page.getByRole("button", { name: "M'abonner dès maintenant" }).click();
  await page.getByRole("button", { name: "Échec du paiement" }).click();
  await expect(page).toHaveURL(/\/abonnement$/);
  await expect(page.getByText("Paiement refusé")).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("link", { name: /^Ton paiement n'est pas passé\. Mets à jour ta carte avant le \d{2}\/\d{2} pour garder l'accès\./ })).toBeVisible();
});

test("Apprentissage (24 octobre 2026) : la même correction sur 2 chantiers s'applique d'elle-même, « Ajusté selon tes habitudes », annulable d'un clic", async ({ page }) => {
  await signUp(page);
  const ardoise = "Ardoise naturelle 32×22 Espagne 1er choix";
  const liste = async () => {
    const q = await apiJson<{ projetId: string }>(page, "POST", "/v1/quantitatifs", { lignes: [{ libelle: ardoise, quantite: "2400", unite: "pièces" }] });
    const t = await apiJson<{ takeoff: { id: string; purchase: { toBuy: { key: string }[] } } }>(page, "GET", `/v1/projects/${q.body.projetId}/takeoff`);
    return { projetId: q.body.projetId, id: t.body.takeoff.id, key: t.body.takeoff.purchase.toBuy[0]!.key };
  };
  for (let i = 0; i < 2; i++) {
    const l = await liste();
    expect((await apiJson(page, "POST", `/v1/takeoffs/${l.id}/answers`, { key: `libelle:${l.key}`, value: "Ardoise Cupa Heavy 32×22" })).status).toBe(200);
  }
  const l3 = await liste();
  await page.goto(`/chantiers/${l3.projetId}`);
  const fournitures = page.getByRole("region", { name: "Liste des fournitures" });
  await expect(fournitures.getByText("Ardoise Cupa Heavy 32×22")).toBeVisible();
  await expect(fournitures.getByText("Ajusté selon tes habitudes")).toBeVisible();
  await fournitures.getByRole("button", { name: /^Annuler l'ajustement/ }).click();
  await expect(fournitures.getByText("Ajusté selon tes habitudes")).toHaveCount(0);
  await expect(fournitures.getByText(ardoise, { exact: true })).toBeVisible();
});

test("Espace admin (24 octobre 2026, refait le 25 : « compréhensible pour un enfant de 15 ans ») : refusé à un artisan ; l'admin entre par le menu avec un code reçu par e-mail ; 4 chiffres en mots simples, 4 onglets, chaque bloc dit à quoi il sert", async ({ page }) => {
  await signUp(page);
  await page.goto("/admin/pilotage");
  await expect(page.getByText("Cette page est réservée à l'équipe.")).toBeVisible();
  expect(await page.evaluate(async () => (await fetch("/v1/admin/pilotage")).status)).toBe(403);
  // Un artisan n'a pas « Espace admin » dans son menu.
  await page.goto("/");
  await page.getByRole("button", { name: "Mon menu" }).click();
  await expect(page.getByRole("menu", { name: "Mon menu" }).getByRole("menuitem").first()).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Espace admin" })).toHaveCount(0);
  await page.context().clearCookies();
  await page.goto("/connexion");
  await page.getByLabel("E-mail").fill("admin-groupe@example.fr");
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("heading", { name: /^(Bonjour|Paie tes matériaux moins cher)/ }).or(page.getByRole("alert").filter({ hasText: "incorrect" }))).toBeVisible();
  if (await page.getByRole("alert").filter({ hasText: "incorrect" }).count()) await signUp(page, "admin-groupe@example.fr");
  // L'admin le trouve dans son menu.
  await page.goto("/");
  await page.getByRole("button", { name: "Mon menu" }).click();
  await page.getByRole("menuitem", { name: "Espace admin" }).click();
  await expect(page.getByRole("heading", { name: "Espace admin" })).toBeVisible();
  // Sans le code, rien : la double authentification d'abord.
  expect(await page.evaluate(async () => (await fetch("/v1/admin/pilotage")).status)).toBe(403);
  await page.getByRole("button", { name: "Recevoir mon code" }).click();
  await expect(page.getByLabel("Code reçu par e-mail")).toBeVisible();
  await expect(page.getByText(/Regarde dans les indésirables/)).toBeVisible();
  const mail = (await emailsVers(page, "admin-groupe@example.fr")).filter((m) => /code d'accès au pilotage/.test(m.subject)).at(-1)!;
  await page.getByLabel("Code reçu par e-mail").fill(/(\d{6})/.exec(mail.text)![1]!);
  await page.getByRole("button", { name: "Ouvrir l'espace admin" }).click();
  const bref = page.getByRole("region", { name: "En bref" });
  for (const titre of ["Artisans actifs", "Artisans qui paient", "Argent par mois", "Coût de l'IA ce mois"]) await expect(bref.getByText(titre, { exact: true })).toBeVisible();
  const onglets = page.getByRole("tablist", { name: "Parties de l'espace admin" });
  await expect(onglets.getByRole("tab")).toHaveText(["À faire", "Chiffres", "Réglages", "Test"]);
  // À faire : ce qui attend un geste, chaque bloc avec sa phrase.
  for (const bloc of ["Regroupements à négocier", "Artisans à relancer", "Les autres écrans"]) await expect(page.getByRole("heading", { name: bloc })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Négoces à vérifier/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Corrections proposées par les artisans/ })).toBeVisible();
  await page.getByRole("button", { name: /Essais qui finissent cette semaine/ }).click();
  await expect(page.getByText("Détail ouvert et noté au journal. Rien ne s'exporte.")).toBeVisible();
  // Chiffres : des titres de tous les jours.
  await onglets.getByRole("tab", { name: "Chiffres" }).click();
  for (const bloc of ["Nouveaux venus (ce mois)", "Qui paie", "Qui part", "Ce qui se passe dans l'app (ce mois)", "Coût de l'IA (14 derniers jours)", "Est-ce qu'on gagne de l'argent ? (ce mois)"]) await expect(page.getByRole("heading", { name: bloc })).toBeVisible();
  await expect(page.getByText(/jetons/)).toHaveCount(0);
  // Réglages.
  await onglets.getByRole("tab", { name: "Réglages" }).click();
  for (const bloc of ["Qui négocie les regroupements ?", "Qui peut s'inscrire ?", "Prix et durées", "Qui est venu ici"]) await expect(page.getByRole("heading", { name: bloc })).toBeVisible();
  // Test : la démo, étape par étape, un jeu de test d'un bouton, effacé d'un autre.
  await onglets.getByRole("tab", { name: "Test" }).click();
  const demo = page.getByRole("region", { name: "Démo" });
  await demo.getByRole("button", { name: "1. Créer un jeu de test" }).click();
  await expect(demo.getByRole("status")).toHaveText("5 faux artisans et 3 faux négoces dans le 22 (un généraliste, deux spécialistes), 18 lignes déposées. Ta liste de démonstration (couverture et placo) est dans la commande. Deux regroupements négociés (ardoise avec offre, zinc en collecte) sont dans Regroupements et sur l'écran du chasseur.");
  await demo.getByRole("button", { name: "Tout effacer" }).click();
  await expect(demo.getByRole("status")).toContainText("Effacé : 5 faux artisans");
});

test("« Je la note moi-même » (28 octobre 2026, point 1) : en plein écran, le champ reste visible clavier ouvert, Entrée ajoute la ligne, un tap la modifie, « Terminé » mène à la liste", async ({ page }) => {
  await signUp(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/chantiers/nouveau");
  await page.getByRole("button", { name: /Je la note moi-même/ }).click();
  const ecran = page.getByRole("dialog", { name: "Écris ta liste" });
  const champ = ecran.getByLabel("Matériau et quantité");
  await expect(champ).toBeFocused();
  // Le clavier de l'iPhone SE laisse environ 330 px visibles : le champ, le texte tapé et « Terminé » y restent.
  await page.setViewportSize({ width: 375, height: 330 });
  await champ.fill("Ardoise naturelle 32×22 Espagne 1er choix, 1800 pièces");
  await expect(champ).toBeInViewport({ ratio: 1 });
  await expect(ecran.getByRole("button", { name: "Terminé" })).toBeInViewport({ ratio: 1 });
  await champ.press("Enter");
  await expect(ecran.getByRole("list", { name: "Ma liste" }).getByText("Ardoise naturelle 32×22 Espagne 1er choix")).toBeVisible();
  await expect(champ).toHaveValue("");
  await expect(champ).toBeFocused();
  // Le catalogue se propose pendant la frappe, d'un tap.
  await champ.fill("liteau");
  // Le catalogue complet (30 octobre, point 3) : « Liteau 27×38 · sapin traité classe 2 ».
  await ecran.getByRole("list", { name: "Références proposées" }).getByRole("button", { name: "Liteau 27×38 · sapin traité classe 2" }).click();
  await expect(champ).toHaveValue("Liteau 27×38 · sapin traité classe 2, ");
  await champ.fill("Liteau 27×38 · sapin traité classe 2, 200 m");
  await champ.press("Enter");
  // Une ligne sans quantité reste en texte libre, « à vérifier » ; un tap la remet dans le champ.
  await champ.fill("Crochets inox");
  await champ.press("Enter");
  await expect(ecran.getByText("à vérifier")).toBeVisible();
  await ecran.getByRole("button", { name: "Modifier : Crochets inox" }).click();
  await expect(champ).toHaveValue("Crochets inox");
  await champ.fill("Crochets inox, 2 paquets");
  await champ.press("Enter");
  await expect(champ).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.setViewportSize({ width: 375, height: 667 });
  await ecran.getByRole("button", { name: "Terminé" }).click();
  await page.waitForURL(/\/chantiers\/[0-9a-f-]{36}/);
  await expect(page.getByText(/Ardoise naturelle 32×22/).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Liteau 27×38/).first()).toBeVisible();
});
