import { expect, test, type Page } from "@playwright/test";

/**
 * « PROFIL ET PARAMÈTRES » (Greg, 1er novembre 2026, deux maquettes) : le sommaire (aucun formulaire), chaque rubrique,
 * l'écran Apparence (« Application » et « Demande de prix »), l'aperçu qui est le vrai PDF, « Enregistrer » (un seul
 * mécanisme), le logo, la confirmation avant de perdre un changement, rien sous le menu du téléphone. Les points 1 à 16
 * de la demande sont cités dans le nom de chaque test. Données de test seulement, aucun envoi.
 *
 * Captures (rapport) : `CAPTURES_PROFIL=<dossier>` les écrit ; sans la variable, aucune.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==", "base64");

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
});

async function capture(page: Page, nom: string, info: { project: { name: string } }) {
  const dossier = process.env.CAPTURES_PROFIL;
  if (!dossier) return;
  await page.waitForTimeout(400);
  const appareil = info.project.name === "ordinateur" ? "ordinateur" : page.viewportSize()?.width === 375 ? "iphone-se" : "android";
  await page.screenshot({ path: `${dossier}/${appareil}-${nom}.png`, fullPage: false });
}

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

async function inscrire(page: Page, entreprise = `Toitures ${unique()}`) {
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Greg Martin");
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(`artisan-${unique()}@example.fr`);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
  return entreprise;
}

const apercuRecu = (page: Page, test: (u: URL) => boolean = () => true) =>
  page.waitForResponse((r) => {
    const u = new URL(r.url());
    return u.pathname === "/v1/price-requests/settings/apercu.pdf" && r.ok() && test(u);
  });

test("1, 2, 12, 15 : le sommaire, ses quatre groupes, chaque rubrique s'ouvre et revient ; rien sous le menu du téléphone", async ({ page }, info) => {
  test.setTimeout(180_000);
  if (info.project.name === "telephone") await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
  await inscrire(page);
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  // Greg, 6 novembre 2026 : sur téléphone, le profil passe par l'avatar ; sur ordinateur, il reste dans la colonne.
  const telephone = info.project.name === "telephone";
  if (telephone) {
    await page.getByRole("button", { name: "Mon menu" }).click();
    await page.getByRole("menuitem", { name: "Profil et paramètres" }).click();
  } else await nav.getByRole("link", { name: "Profil" }).click();
  await expect(page).toHaveURL(/\/compte$/);
  await expect(page.getByRole("heading", { level: 1, name: "Profil et paramètres" })).toBeVisible();
  if (!telephone) await expect(nav.getByRole("link", { name: "Profil" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: /Greg Martin/ })).toBeVisible();
  // Aucun formulaire sur le sommaire, et « Économisé grâce au regroupement » n'y est plus.
  await expect(page.locator("main input, main textarea, main select")).toHaveCount(0);
  await expect(page.getByText(/Économisé grâce/)).toHaveCount(0);
  for (const groupe of ["Entreprise", "Préférences", "Compte et services", "Données et aide"]) await expect(page.getByRole("region", { name: groupe })).toBeVisible();
  await capture(page, "01-sommaire", info);

  // Chaque rubrique : la ligne s'ouvre, le titre, et ce qu'elle doit montrer (les réglages d'avant, gardés).
  const rubriques: [string, RegExp | string, (p: Page) => Promise<void>][] = [
    ["Compte et sécurité", /\/compte\/informations$/, async (p) => {
      await expect(p.getByRole("button", { name: "Se déconnecter" })).toBeVisible();
    }],
    ["Mon entreprise", /\/compte\/entreprise$/, async (p) => {
      await expect(p.getByLabel("Nom de l'entreprise", { exact: true })).toBeVisible();
      await expect(p.getByLabel("SIRET", { exact: true })).toBeVisible();
      await expect(p.getByText(/^Voir les \d+ métiers$/)).toBeVisible();
    }],
    ["Notifications", /\/compte\/notifications$/, async (p) => {
      await expect(p.getByRole("checkbox", { name: /Recevoir les e-mails/ })).toBeVisible();
    }],
    ["Abonnement, factures et reçus", /\/compte\/abonnement$/, async (p) => {
      await expect(p.getByRole("link", { name: "Mon abonnement et mes factures" })).toBeVisible();
    }],
    ["E-mails Mobiiz et réponses", /\/compte\/adresse$/, async (p) => {
      await expect(p.getByRole("button", { name: "Copier l'adresse" })).toBeVisible();
      await expect(p.getByRole("link", { name: "Mes prix" })).toBeVisible();
    }],
    ["Données et confidentialité", /\/compte\/donnees$/, async (p) => {
      await expect(p.getByRole("button", { name: "Télécharger mes données" })).toBeVisible();
      await expect(p.getByRole("button", { name: "Supprimer mon compte" })).toBeVisible();
      // Décision MVP (Greg, 12 novembre 2026) : la remise à zéro de ce que Mobiiz a retenu se fait ici.
      await expect(p.getByRole("button", { name: "Effacer ce que Mobiiz a appris" })).toBeVisible();
    }],
    ["Aide et contact", /\/compte\/aide$/, async (p) => {
      await expect(p.getByRole("link", { name: /Nous écrire/ })).toHaveAttribute("href", "mailto:contact@mobiiz.fr");
    }],
  ];
  for (const [titre, url, verifier] of rubriques) {
    await page.getByRole("region").getByRole("link", { name: new RegExp(`^${titre}`) }).click();
    await expect(page).toHaveURL(url);
    await expect(page.getByRole("heading", { level: 1, name: titre })).toBeVisible();
    if (!telephone) await expect(nav.getByRole("link", { name: "Profil" })).toHaveAttribute("aria-current", "page");
    await verifier(page);
    await page.getByRole("button", { name: "Retour à Profil et paramètres" }).click();
    await expect(page).toHaveURL(/\/compte$/);
  }
  // Apparence s'ouvre aussi (son écran a son propre test).
  await page.getByRole("link", { name: /^Apparence/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Apparence" })).toBeVisible();

  // 12 : téléphone, en bas du sommaire, la dernière ligne n'est pas sous le menu.
  if (info.project.name === "telephone") {
    await page.goto("/compte");
    await expect(page.getByRole("link", { name: /^Guide et chantier fictif/ })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    await capture(page, "01b-sommaire-bas", info);
    const derniere = (await page.getByRole("link", { name: /^Guide et chantier fictif/ }).boundingBox())!;
    const menu = (await nav.boundingBox())!;
    expect(derniere.y + derniere.height).toBeLessThanOrEqual(menu.y);
  }
});

test("4, 5, 6, 8, 10, 11, 12 : Apparence — Clair / Sombre ; le modèle et la couleur changent l'aperçu tout de suite ; gardés en changeant d'onglet ; confirmation avant de perdre ; Enregistrer", async ({ page }, info) => {
  test.setTimeout(180_000);
  if (info.project.name === "telephone") await page.setViewportSize({ width: 375, height: 667 });
  await inscrire(page);
  const premier = apercuRecu(page);
  await page.goto("/compte/apparence");
  await expect(page.getByRole("tab", { name: "Demande de prix" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Ta demande de prix" })).toBeVisible();
  await expect(page.getByText("Personnalise l'apparence du PDF que reçoivent tes négoces.")).toBeVisible();
  await premier;
  const apercu = page.getByRole("region", { name: "Aperçu de ta demande de prix" });
  // Aucune demande : l'exemple est dit.
  await expect(apercu.getByText("Exemple : aucune demande envoyée")).toBeVisible();
  await expect(apercu.getByRole("img", { name: "Page 1" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Les changements s'appliquent aux prochaines demandes. Les documents déjà envoyés ne changent pas.").filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enregistré", exact: true })).toBeDisabled();
  // Téléphone : un écran d'édition, sans le menu du bas ; « Enregistrer » est à l'écran, en bas, même en haut de page.
  if (info.project.name === "telephone") {
    await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Enregistré", exact: true })).toBeInViewport();
  }
  await capture(page, "03-apparence-demande", info);

  // 5 et 8 : Détaillé, l'aperçu se recharge avec ce modèle (sans rien enregistrer).
  const detaille = apercuRecu(page, (u) => u.searchParams.get("modele") === "detaille");
  await page.getByRole("radiogroup", { name: "Modèle du PDF" }).getByRole("radio", { name: "Détaillé" }).click();
  await detaille;
  // 6 et 8 : Vert, l'aperçu se recharge avec cette couleur.
  const vert = apercuRecu(page, (u) => u.searchParams.get("couleur") === "vert" && u.searchParams.get("modele") === "detaille");
  await page.getByRole("radiogroup", { name: "Couleur du PDF" }).getByRole("radio", { name: "Vert" }).click();
  await vert;
  await expect(page.getByRole("button", { name: "Enregistrer", exact: true })).toBeEnabled();
  expect((await apiJson<{ modelePdf: string; couleurPdf: string }>(page, "GET", "/v1/price-requests/settings")).body).toMatchObject({ modelePdf: "classique", couleurPdf: "mobiiz" });

  // 4 : l'onglet Application, Clair puis Sombre ; 10 : le brouillon de la demande de prix est gardé.
  await page.getByRole("tab", { name: "Application" }).click();
  const theme = page.getByRole("group", { name: "Apparence de Mobiiz" });
  await expect(theme.getByRole("button", { name: "Sombre" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Gardé sur cet appareil.")).toBeVisible();
  await theme.getByRole("button", { name: "Clair" }).click();
  await expect(page.locator(".app-clair")).toHaveCount(1);
  await capture(page, "02-apparence-application", info);
  await theme.getByRole("button", { name: "Sombre" }).click();
  await expect(page.locator(".app-nuit")).toHaveCount(1);
  await page.getByRole("tab", { name: "Demande de prix" }).click();
  await expect(page.getByRole("radiogroup", { name: "Modèle du PDF" }).getByRole("radio", { name: "Détaillé" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("radiogroup", { name: "Couleur du PDF" }).getByRole("radio", { name: "Vert" })).toHaveAttribute("aria-checked", "true");

  // 10 : rechargée, la page reprend le changement non enregistré (gardé sur l'appareil) et le dit.
  await page.reload();
  await expect(page.getByText("Tes changements non enregistrés sont repris.")).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Couleur du PDF" }).getByRole("radio", { name: "Vert" })).toHaveAttribute("aria-checked", "true");

  // 11 : la flèche retour demande confirmation ; « Rester » garde tout.
  await page.getByRole("button", { name: "Retour à Profil et paramètres" }).click();
  const quitter = page.getByRole("alertdialog", { name: "Quitter sans enregistrer ?" });
  await expect(quitter).toBeVisible();
  await capture(page, "05-confirmation-quitter", info);
  await quitter.getByRole("button", { name: "Rester" }).click();
  await expect(quitter).toHaveCount(0);
  await expect(page).toHaveURL(/\/compte\/apparence$/);
  await expect(page.getByRole("radiogroup", { name: "Couleur du PDF" }).getByRole("radio", { name: "Vert" })).toHaveAttribute("aria-checked", "true");
  // « Quitter sans enregistrer » : rien n'est enregistré, le brouillon est oublié.
  await page.getByRole("button", { name: "Retour à Profil et paramètres" }).click();
  await page.getByRole("alertdialog", { name: "Quitter sans enregistrer ?" }).getByRole("button", { name: "Quitter sans enregistrer" }).click();
  await expect(page).toHaveURL(/\/compte$/);
  await page.getByRole("link", { name: /^Apparence/ }).click();
  await expect(page.getByRole("radiogroup", { name: "Modèle du PDF" }).getByRole("radio", { name: "Classique (par défaut)" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Tes changements non enregistrés sont repris.")).toHaveCount(0);

  // 3 : Enregistrer, puis la valeur reste (rechargée, et côté serveur).
  await page.getByRole("radiogroup", { name: "Modèle du PDF" }).getByRole("radio", { name: "Essentiel" }).click();
  await page.getByRole("radiogroup", { name: "Couleur du PDF" }).getByRole("radio", { name: "Bleu" }).click();
  const patch = page.waitForResponse((r) => r.url().includes("/v1/price-requests/settings") && r.request().method() === "PATCH");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  expect((await patch).ok()).toBe(true);
  await expect(page.getByText("Réglages enregistrés.").filter({ visible: true })).toBeVisible();
  await page.getByRole("button", { name: "Retour à Profil et paramètres" }).click();
  await expect(page).toHaveURL(/\/compte$/);
  await page.goto("/compte/apparence");
  await expect(page.getByRole("radiogroup", { name: "Modèle du PDF" }).getByRole("radio", { name: "Essentiel" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("radiogroup", { name: "Couleur du PDF" }).getByRole("radio", { name: "Bleu" })).toHaveAttribute("aria-checked", "true");
  expect((await apiJson<{ modelePdf: string; couleurPdf: string }>(page, "GET", "/v1/price-requests/settings")).body).toMatchObject({ modelePdf: "essentiel", couleurPdf: "bleu" });
});

test("7, 8, 9, 14 : le logo s'ajoute, se remplace, se retire (avec confirmation) ; l'aperçu suit ; le plein écran ouvre le vrai document", async ({ page }, info) => {
  test.setTimeout(180_000);
  await inscrire(page);
  await page.goto("/compte/apparence");
  await expect(page.getByRole("region", { name: "Aperçu de ta demande de prix" }).getByRole("img", { name: "Page 1" })).toBeVisible({ timeout: 30_000 });
  const logo = page.getByText("PNG ou JPEG, 500 Ko au plus. Le logo s'enregistre dès qu'il est choisi.").locator("..");
  await expect(logo.getByText("Pas de logo")).toBeVisible();
  // Ajouter : l'aperçu se recharge.
  let recharge = apercuRecu(page, (u) => u.searchParams.get("v") === "1");
  await page.getByLabel("Ajouter un logo").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Logo enregistré.")).toBeVisible();
  await recharge;
  await expect(logo.getByRole("img", { name: "Logo de l'entreprise" })).toBeVisible();
  // Remplacer.
  recharge = apercuRecu(page, (u) => u.searchParams.get("v") === "2");
  await page.getByLabel("Remplacer").setInputFiles({ name: "logo-2.png", mimeType: "image/png", buffer: PNG });
  await recharge;
  // Retirer : la confirmation, Annuler ne retire rien, puis Retirer le logo.
  await logo.getByRole("button", { name: "Retirer" }).click();
  const confirmer = page.getByRole("alertdialog", { name: "Retirer le logo ?" });
  await expect(confirmer.getByText("Les documents déjà envoyés ne changent pas.")).toBeVisible();
  await confirmer.getByRole("button", { name: "Annuler" }).click();
  expect((await apiJson<{ hasLogo: boolean }>(page, "GET", "/v1/company/profile")).body.hasLogo).toBe(true);
  recharge = apercuRecu(page, (u) => u.searchParams.get("v") === "3");
  await logo.getByRole("button", { name: "Retirer" }).click();
  await page.getByRole("alertdialog", { name: "Retirer le logo ?" }).getByRole("button", { name: "Retirer le logo" }).click();
  await expect(page.getByText("Logo retiré.")).toBeVisible();
  await recharge;
  expect((await apiJson<{ hasLogo: boolean }>(page, "GET", "/v1/company/profile")).body.hasLogo).toBe(false);

  // 9 : le plein écran ouvre le document de l'aperçu (la même route, le même générateur que l'envoi : test API
  // `apparence-apercu-pdf.test.ts`, texte identique au PDF téléchargé et aux lignes du PDF envoyé).
  const plein = page.waitForResponse((r) => new URL(r.url()).pathname === "/v1/price-requests/settings/apercu.pdf" && !new URL(r.url()).searchParams.has("v"));
  await page.getByRole("button", { name: "Voir le PDF en plein écran" }).click();
  expect((await plein).ok()).toBe(true);
  const visionneuse = page.getByRole("dialog", { name: "Ta demande de prix" });
  await expect(visionneuse).toBeVisible();
  await expect(visionneuse.getByRole("img", { name: "Page 1" })).toBeVisible({ timeout: 30_000 });
  await capture(page, "04-pdf-plein-ecran", info);
  await visionneuse.getByRole("button", { name: "Fermer le document" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Apparence" })).toBeVisible();
});

test("9, 13, 16 : avec une demande envoyée, l'aperçu est « Ta dernière demande » ; une autre entreprise ne voit que son exemple ; la demande existante s'ouvre toujours", async ({ page, browser }, info) => {
  test.setTimeout(240_000);
  await inscrire(page, "BATI INVEST E2E");
  const q = await apiJson<{ id: string; projetId: string; questions: { id: string; boutons: { valeur: string }[] }[] }>(page, "POST", "/v1/quantitatifs", { reference: "Dupont", adresse: "12 rue de Siam, 29200 Brest", lignes: [{ libelle: "Chatière de ventilation", quantite: "4", unite: "u" }] });
  let current = q.body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0]!;
    current = (await apiJson<typeof current>(page, "POST", `/v1/quantitatifs/${q.body.id}/reponses`, { reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await apiJson(page, "POST", `/v1/quantitatifs/${q.body.id}/validation`)).status).toBe(200);
  const supplier = (await apiJson<{ id: string }>(page, "POST", "/v1/suppliers", { name: "Négoce Test", email: `ventes-${unique()}@negoce.example` })).body;
  const created = await apiJson<{ id: string; recipients: { id: string }[] }>(page, "POST", `/v1/projects/${q.body.projetId}/price-requests`, { supplierIds: [supplier.id] });
  expect(created.status).toBe(201);
  expect((await apiJson(page, "POST", `/v1/price-request-recipients/${created.body.recipients[0]!.id}/send`)).status).toBe(200);
  await page.goto("/compte/apparence");
  const apercu = page.getByRole("region", { name: "Aperçu de ta demande de prix" });
  await expect(apercu.getByText("Ta dernière demande")).toBeVisible({ timeout: 30_000 });
  await expect(apercu.getByRole("img", { name: "Page 1" })).toBeVisible({ timeout: 30_000 });
  if (info.project.name === "ordinateur") {
    // Ordinateur : les réglages à gauche, l'aperçu à droite, plus large.
    const reglages = (await page.getByRole("radiogroup", { name: "Modèle du PDF" }).boundingBox())!;
    const doc = (await apercu.boundingBox())!;
    expect(doc.x).toBeGreaterThan(reglages.x + reglages.width);
    expect(doc.width).toBeGreaterThan(reglages.width);
    await expect(page.getByRole("button", { name: "Enregistré", exact: true })).toBeInViewport();
    await capture(page, "06-ordinateur-cote-a-cote", info);
  }
  // 16 : la demande déjà envoyée garde son PDF (téléchargeable comme avant).
  const pdf = await page.evaluate(async (url) => {
    const companyId = localStorage.getItem("baticlair.companyId");
    const res = await fetch(url, { headers: companyId ? { "x-company-id": companyId } : {} });
    return { ok: res.ok, type: res.headers.get("content-type") ?? "" };
  }, `/v1/price-requests/${created.body.id}/demande-de-devis.pdf`);
  expect(pdf.ok).toBe(true);
  expect(pdf.type).toMatch(/application\/pdf/);

  // 13 : une autre entreprise, son propre exemple, jamais la demande ni le nom de la première.
  const autre = await browser.newContext({ ...(info.project.name === "telephone" ? { viewport: { width: 412, height: 915 } } : {}) });
  const p2 = await autre.newPage();
  await p2.addLocatorHandler(p2.getByRole("dialog", { name: "Guide" }), async () => {
    await p2.getByRole("button", { name: "Passer le guide" }).click();
  });
  await inscrire(p2, "Couverture Le Gall E2E");
  await p2.goto("/compte/apparence");
  await expect(p2.getByRole("region", { name: "Aperçu de ta demande de prix" }).getByText("Exemple : aucune demande envoyée")).toBeVisible({ timeout: 30_000 });
  await autre.close();
});

test("captures Android (Pixel 7) : le sommaire et Apparence", async ({ page }, info) => {
  test.skip(!process.env.CAPTURES_PROFIL || info.project.name !== "telephone", "captures du rapport seulement");
  await inscrire(page);
  await page.goto("/compte");
  await expect(page.getByRole("link", { name: /^Aide et contact/ })).toBeVisible();
  await capture(page, "01-sommaire", info);
  await page.goto("/compte/apparence");
  await expect(page.getByRole("region", { name: "Aperçu de ta demande de prix" }).getByRole("img", { name: "Page 1" })).toBeVisible({ timeout: 30_000 });
  await capture(page, "03-apparence-demande", info);
  await page.getByRole("tab", { name: "Application" }).click();
  await capture(page, "02-apparence-application", info);
});
