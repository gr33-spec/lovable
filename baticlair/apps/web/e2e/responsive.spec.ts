import { expect, test, type Page } from "@playwright/test";

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

/**
 * PASSE RESPONSIVE (lot B) : chaque écran du parcours tient sur un téléphone, une tablette (portrait et paysage) et un
 * ordinateur, sans défilement horizontal ni bouton coupé. Les captures (test-results/responsive) servent à relire la
 * mise en page ; le test casse si une page déborde en largeur.
 */
const WIDTHS = [
  { name: "telephone", width: 375, height: 812 },
  // Plan « finition », bloc 5 : le plus petit iPhone encore vendu (SE, 375 × 667) ; les barres figées en bas y mangent le plus.
  { name: "iphone-se", width: 375, height: 667 },
  { name: "tablette", width: 768, height: 1024 },
  { name: "tablette-paysage", width: 1024, height: 768 },
  { name: "ordinateur", width: 1440, height: 900 },
] as const;

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Aucune page ne défile en largeur, et aucun bouton visible ne sort de l'écran. */
async function fits(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const wide = document.documentElement.scrollWidth > width + 1;
    const cut = [...document.querySelectorAll("button, a")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && style.visibility !== "hidden" && (r.right > width + 1 || r.left < -1);
      })
      .map((el) => (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40));
    return { wide, cut };
  });
  expect(overflow, label).toEqual({ wide: false, cut: [] });
}

async function shoot(page: Page, size: string, name: string) {
  await page.screenshot({ path: `test-results/responsive/${size}-${name}.png`, fullPage: true });
  await fits(page, `${size} · ${name}`);
}

for (const size of WIDTHS) {
  test(`responsive ${size.name} (${size.width} px) : du compte à la comparaison, rien ne déborde`, async ({ page }, info) => {
    test.skip(info.project.name !== "ordinateur", "Une passe par largeur suffit (les largeurs sont fixées ici).");
    await page.setViewportSize({ width: size.width, height: size.height });

    await page.goto("/connexion");
    await shoot(page, size.name, "01-connexion");
    await page.getByRole("link", { name: "Créer un compte" }).click();
    await shoot(page, size.name, "02-inscription");
    await page.getByLabel("Prénom et nom").fill("Jean Martin");
    await page.getByLabel("Nom de ton entreprise").fill("Toitures Martin");
    await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
    await page.getByLabel("E-mail professionnel").fill(`responsive-${unique()}@example.fr`);
    await page.getByLabel("Mot de passe").fill("motdepasse-solide");
    await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    // R7 (27 octobre 2026) : l'écran dédié « Voici ton adresse Mobiiz : … » avant l'accueil.
    await expect(page.getByRole("heading", { name: "Voici ton adresse Mobiiz :" })).toBeVisible();
    await shoot(page, size.name, "02b-adresse-mobiiz");
    await page.getByRole("button", { name: "C'est compris" }).click();
    await expect(page.getByRole("heading", { name: /^(Bonjour|Paie tes matériaux moins cher)/ })).toBeVisible();
    await shoot(page, size.name, "03-accueil");

    await page.goto("/chantiers/nouveau");
    await expect(page.getByLabel("Déposer mon devis")).toBeVisible();
    await shoot(page, size.name, "04-nouveau-chantier");

    await page.goto("/");
    await page.getByRole("button", { name: "Mon menu" }).click();
    await page.getByRole("menuitem", { name: "Essayer avec un chantier fictif" }).click();
    await expect(page.getByRole("heading", { name: "Démo – Toiture Martin" })).toBeVisible();
    // §48 : la lecture part d'elle-même ; l'écran des questions (s'il y en a) passe par « Calculer ma liste ».
    const questions = page.getByRole("region", { name: "Les questions" });
    const list = page.getByRole("region", { name: "Liste des fournitures" });
    await expect(list.or(questions).first()).toBeVisible({ timeout: 60_000 });
    if (await questions.isVisible()) {
      await shoot(page, size.name, "05a-questions");
      const faconne = questions.getByRole("button", { name: /^Je façonne/ });
      for (let i = 0; i < (await faconne.count()); i++) await faconne.nth(i).click();
      await page.getByRole("button", { name: /^Calculer ma liste/ }).click();
    }
    await expect(list.getByRole("button", { name: "Demander les prix à mes négoces" })).toBeVisible();
    // Plan « finition », bloc 5 (capture iPhone SE) : le suivi suit la liste tout de suite, jamais « Ta liste se prépare » au-dessus d'elle.
    await expect(page.getByRole("region", { name: "Suivi du chantier" })).toContainText(/Ta liste est (là|prête)/, { timeout: 5_000 });
    await shoot(page, size.name, "05-liste-des-fournitures");

    await page.getByRole("button", { name: "Demander les prix à mes négoces" }).click();
    const apercu = page.getByRole("dialog", { name: "À qui j'envoie ?" });
    await expect(apercu).toBeVisible();
    await shoot(page, size.name, "06-apercu-envoi");
    for (const name of ["Tuilerie de l'Ouest (démo)", "Négoce Breizh (démo)", "Matériaux Atlantique (démo)"]) {
      await apercu.getByRole("checkbox", { name: new RegExp(name.replace(/[()]/g, "\\$&")) }).check();
    }
    await apercu.getByRole("button", { name: "Continuer" }).click();
  // Lot final, point 4 : « Voici ce que ton négoce va recevoir », puis « Envoyer ».
  await page.getByRole("dialog", { name: "Voici ce que ton négoce va recevoir" }).getByRole("button", { name: "Envoyer", exact: true }).click();
    const cards = page.getByRole("list", { name: "Tes fournisseurs" }).getByRole("listitem");
    await expect(cards.first()).toBeVisible();
    await shoot(page, size.name, "07-apres-envoi");

    // Greg (23 octobre) : plus de « Comparer les offres » par chantier en mode mois ; les prix viennent du regroupement.
    await expect(page.getByRole("button", { name: "Comparer les offres" })).toHaveCount(0);

    await page.goto("/chantiers");
    await expect(page.getByText("Démo – Toiture Martin").first()).toBeVisible();
    await shoot(page, size.name, "09-chantiers");
    await page.goto("/fournisseurs");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await shoot(page, size.name, "10-fournisseurs");
    await page.goto("/compte");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await shoot(page, size.name, "11-compte");
  });
}

/** Un appel à l'API avec la session de la page (et l'entreprise choisie). */
async function appel<T = unknown>(page: Page, method: string, url: string, body?: unknown): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ({ method, url, body }) => {
      const companyId = localStorage.getItem("baticlair.companyId");
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json", accept: "application/json", ...(url.startsWith("/v1/internal") ? { authorization: "Bearer e2e-secret-de-la-tache" } : {}), ...(companyId ? { "x-company-id": companyId } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: res.status, body: (await res.json().catch(() => null)) as T };
    },
    { method, url, body },
  );
}

async function inscription(page: Page, email: string) {
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Jean Martin");
  await page.getByLabel("Nom de ton entreprise").fill("Toitures du Finistère");
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  // R7 (27 octobre 2026) : l'écran dédié « Voici ton adresse Mobiiz : … » avant l'accueil.
  await expect(page.getByRole("heading", { name: "Voici ton adresse Mobiiz :" })).toBeVisible();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: /^(Bonjour Jean|Paie tes matériaux moins cher)/ })).toBeVisible();
}

/**
 * Revue à froid (23 octobre 2026) : les écrans du regroupement du mois, à chaque largeur (iPhone SE compris) :
 * l'onglet, « Ton chantier » avec son bloc et sa barre, la page du négoce, l'admin des dates. Dans le Finistère (29),
 * pour ne rien mêler aux parcours du 22.
 */
test("responsive : la commande du mois (artisan, négoce, admin), rien ne déborde", { tag: "@ancien" }, async ({ page, browser }, info) => {
  test.skip(info.project.name !== "ordinateur", "Une passe par largeur suffit (les largeurs sont fixées ici).");
  test.setTimeout(240_000);
  await inscription(page, `responsive-mois-${unique()}@example.fr`);
  expect((await appel(page, "PATCH", "/v1/company/profile", { name: "Toitures du Finistère", address: "2 rue de Siam, 29200 Brest", siret: "73282932000074", phone: null, email: null })).status).toBe(200);
  expect((await appel(page, "POST", "/v1/groupe/siret")).status).toBe(200);
  const ponant = `ponant-${unique()}@example.com`;
  expect((await appel(page, "POST", "/v1/groupe/negoces", { nom: "Négoce du Ponant", email: ponant, familles: ["couverture"] })).status).toBe(201);
  const q = await appel<{ projetId: string }>(page, "POST", "/v1/quantitatifs", { lignes: [{ libelle: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "2400", unite: "pièces" }, { libelle: "Liteau sapin traité 27×38", quantite: "520", unite: "m" }] });
  const projet = q.body.projetId;
  expect((await appel(page, "PATCH", `/v1/projects/${projet}`, { address: "2 rue de Siam, 29200 Brest" })).status).toBe(200);
  const articles = (await appel<{ takeoff: { purchase: { toBuy: { key: string }[] } } }>(page, "GET", `/v1/projects/${projet}/takeoff`)).body.takeoff.purchase.toBuy.map((b) => b.key);
  // Une ligne déposée, l'autre pas : « Ton chantier » montre à la fois le bloc et « Dans la commande ».
  expect((await appel(page, "POST", `/v1/projects/${projet}/commande-du-mois`, { articles: [articles[0]], nature: "chantier" })).status).toBe(201);

  for (const size of WIDTHS) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto("/groupe");
    await expect(page.getByRole("region", { name: /^Commande d/ }).first()).toBeVisible();
    await shoot(page, size.name, "mois-01-onglet");
    await page.goto(`/chantiers/${projet}`);
    await expect(page.getByRole("region", { name: /^Regroupement d/ })).toBeVisible();
    await shoot(page, size.name, "mois-02-ton-chantier");
    await page.getByRole("region", { name: /^Regroupement d/ }).getByRole("button", { name: /^Ajouter à la commande d/ }).click();
    await expect(page.getByRole("region", { name: /^Ajouter à la commande d/ })).toBeVisible();
    await shoot(page, size.name, "mois-03-barre");
  }

  // Espace négoce (23 octobre) : l'invitation, la page « Créez votre accès », puis le compte (dépôt, paliers) par l'API.
  const invitations = (await appel<{ emails: { text: string }[] }>(page, "GET", `/v1/internal/test/emails?to=${encodeURIComponent(ponant)}`)).body.emails;
  const lienInvitation = invitations.map((m) => /https?:\/\/[^\s]+(\/negoce\/rejoindre\/[A-Za-z0-9_.-]+)/.exec(m.text)?.[1]).filter(Boolean).at(-1)!;
  const negoce = await passeGuide(await (await browser.newContext()).newPage());
  for (const size of WIDTHS) {
    await negoce.setViewportSize({ width: size.width, height: size.height });
    await negoce.goto(lienInvitation);
    await expect(negoce.getByRole("form", { name: "Créer mon accès" })).toBeVisible();
    await shoot(negoce, size.name, "mois-04-negoce-rejoindre");
  }
  const jetonInvitation = lienInvitation.split("/").at(-1)!;
  expect((await appel(negoce, "POST", "/v1/negoce/inscription", { jeton: jetonInvitation, email: ponant, siret: null, enseigne: "Négoce du Ponant", telephone: null, depots: [{ adresse: "Zone de Kergaradec, 29490 Guipavas" }], livraison: { gratuiteJusquaKm: 30, paliers: [{ jusquaKm: 100, prixHt: 60 }], maxKm: 100 }, departements: ["29"], conditions: true })).status).toBe(201);
  for (const size of WIDTHS) {
    await negoce.setViewportSize({ width: size.width, height: size.height });
    await negoce.goto("/negoce");
    await expect(negoce.getByRole("region", { name: "Prochaine clôture" })).toBeVisible();
    await shoot(negoce, size.name, "mois-05-negoce-compte");
  }

  // La clôture : la grille part au négoce inscrit ; sa page de grille.
  const cycle = (await appel<{ commandes: { clotureLe: string; phase: string }[] }>(page, "GET", "/v1/commande-du-mois")).body.commandes.find((c) => c.phase === "inscriptions")!;
  expect((await appel(page, "GET", `/v1/internal/commande-du-mois?maintenant=${encodeURIComponent(new Date(Date.parse(cycle.clotureLe) + 60_000).toISOString())}`)).status).toBe(200);
  const mails = (await appel<{ emails: { text: string }[] }>(page, "GET", `/v1/internal/test/emails?to=${encodeURIComponent(ponant)}`)).body.emails;
  const lien = mails.map((m) => /https?:\/\/[^\s]+(\/grille\/[A-Za-z0-9_-]+)/.exec(m.text)?.[1]).filter(Boolean).at(-1)!;
  for (const size of WIDTHS) {
    await negoce.setViewportSize({ width: size.width, height: size.height });
    await negoce.goto(lien);
    await expect(negoce.getByRole("form", { name: "Déposer mon devis" })).toBeVisible();
    await shoot(negoce, size.name, "mois-06-page-negoce-grille");
  }

  // L'admin des dates (le compte admin des parcours).
  const admin = await passeGuide(await (await browser.newContext()).newPage());
  await admin.goto("/connexion");
  await admin.getByLabel("E-mail").fill("admin-groupe@example.fr");
  await admin.getByLabel("Mot de passe").fill("motdepasse-solide");
  await admin.getByRole("button", { name: "Se connecter" }).click();
  await expect(admin.getByRole("heading", { name: /^(Bonjour|Paie tes matériaux moins cher)/ }).or(admin.getByRole("alert").filter({ hasText: "incorrect" }))).toBeVisible();
  if (await admin.getByRole("alert").filter({ hasText: "incorrect" }).count()) {
    await admin.goto("/inscription");
    await admin.getByLabel("Prénom et nom").fill("Greg Admin");
    await admin.getByLabel("Nom de ton entreprise").fill("BatiClair");
    await admin.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
    await admin.getByLabel("E-mail professionnel").fill("admin-groupe@example.fr");
    await admin.getByLabel("Mot de passe").fill("motdepasse-solide");
    await admin.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
    await admin.getByRole("button", { name: "Créer mon compte" }).click();
    // R7 (27 octobre 2026) : l'écran dédié « Voici ton adresse Mobiiz : … » avant l'accueil.
    await expect(admin.getByRole("heading", { name: "Voici ton adresse Mobiiz :" })).toBeVisible();
    await admin.getByRole("button", { name: "C'est compris" }).click();
    await expect(admin.getByRole("heading", { name: /^(Bonjour Greg|Paie tes matériaux moins cher)/ })).toBeVisible();
  }
  // Sécurité (Greg, 26 octobre 2026) : le code à 6 chiffres de la session d'abord.
  await admin.goto("/admin/groupe");
  await admin.getByRole("button", { name: "Recevoir mon code" }).click();
  const code = await admin.evaluate(async () => {
    const r = await fetch("/v1/internal/test/emails?to=admin-groupe%40example.fr", { headers: { authorization: "Bearer e2e-secret-de-la-tache" } });
    const { emails } = (await r.json()) as { emails: { subject: string; text: string }[] };
    return /(\d{6})/.exec(emails.filter((m) => /code d'accès au pilotage/.test(m.subject)).at(-1)!.text)![1]!;
  });
  await admin.getByLabel("Code reçu par e-mail").fill(code);
  await admin.getByRole("button", { name: "Ouvrir les commandes communes" }).click();
  // Attendre la page ouverte : naviguer avant la fin de la vérification du code coupait la requête (ordinateur).
  await expect(admin.getByRole("button", { name: "Enregistrer les dates" })).toBeVisible();
  for (const size of WIDTHS) {
    await admin.setViewportSize({ width: size.width, height: size.height });
    await admin.goto("/admin/groupe");
    await expect(admin.getByRole("button", { name: "Enregistrer les dates" })).toBeVisible();
    await shoot(admin, size.name, "mois-07-admin-dates");
  }
});
