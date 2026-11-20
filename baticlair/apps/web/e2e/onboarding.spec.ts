import { expect, test, type Page } from "@playwright/test";
import { confirmerEmail } from "./confirmer-email";

/**
 * LE NOUVEL ONBOARDING « ESSAIE D'ABORD » (Greg, 19 novembre 2026) : « Commencer » → la carte de France (région, zoom,
 * département, retour possible) → le métier (« Couvreur » d'abord ; un autre métier entre avec le message « en rodage »)
 * → e-mail et portable, rien d'autre → l'e-mail à vérifier → le nouveau quantitatif. Le SIRET n'est demandé qu'au moment
 * d'envoyer, l'entreprise trouvée se confirme, et rien ne part chez un négoce avant.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// Les analyses offertes se comptent dans le mode par défaut, l'achat groupé automatique : une autre série a pu laisser
// un autre mode (alors la jauge vaut null) ; comme achat-groupe.spec.ts, on le repose avant chaque test.
test.beforeEach(async ({ request }) => {
  expect((await request.post("/v1/internal/test/mode-regroupement", { headers: { authorization: "Bearer e2e-secret-de-la-tache" }, data: { mode: "automatique" } })).status()).toBe(200);
});

async function appel(page: Page, method: string, url: string, body?: unknown): Promise<{ status: number; body: { error?: { details?: { reason?: string } } } & Record<string, unknown> }> {
  return page.evaluate(
    async ({ method, url, body }) => {
      const companyId = localStorage.getItem("baticlair.companyId");
      const r = await fetch(url, { method, headers: { "content-type": "application/json", ...(companyId ? { "x-company-id": companyId } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: r.status, body: await r.json().catch(() => ({})) };
    },
    { method, url, body },
  );
}

// Le mode par défaut, comme les autres séries : l'achat groupé automatique (une série interrompue a pu en laisser un autre) ;
// les analyses offertes se comptent dans ce mode.
test.beforeEach(async ({ request }) => {
  expect((await request.post("/v1/internal/test/mode-regroupement", { headers: { authorization: "Bearer e2e-secret-de-la-tache" }, data: { mode: "automatique" } })).status()).toBe(200);
});

/** La carte : région puis département, au toucher (tracés) ou par les boutons. */
async function choisirDepartement(page: Page, region: string, departement: string, { parLaCarte = true } = {}) {
  if (parLaCarte) await page.locator(`path[data-region="${region}"]`).click();
  else await page.locator(`button[data-pastille-region="${region}"]`).click();
  await page.locator(`button[data-pastille="${departement}"]`).waitFor();
  if (parLaCarte) {
    await page.locator(`g[data-departement="${departement}"]`).click();
    await expect(page.locator(`g[data-departement="${departement}"]`)).toHaveAttribute("aria-pressed", "true");
  } else await page.locator(`button[data-pastille="${departement}"]`).click();
  await expect(page.locator(`button[data-pastille="${departement}"]`)).toHaveAttribute("aria-pressed", "true");
}

/** Tout le parcours jusqu'à l'écran « Vérifie ton e-mail » ; rend l'e-mail et le corps envoyé pour l'entreprise. */
async function onboarding(page: Page, { metier = "Couvreur", region = "53", departement = "22" } = {}) {
  const email = `essai-${unique()}@example.fr`;
  await page.goto("/");
  await page.getByRole("link", { name: "Commencer gratuitement" }).first().click();
  await expect(page).toHaveURL(/\/commencer$/);
  await choisirDepartement(page, region, departement);
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { name: "Ton métier ?" })).toBeVisible();
  if (metier !== "Couvreur") await page.getByRole("button", { name: metier, exact: true }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { name: "Et on essaie." })).toBeVisible();
  // E-mail et portable, rien d'autre (les CGU à cocher restent).
  await expect(page.getByRole("textbox")).toHaveCount(2);
  await page.getByLabel("Ton e-mail").fill(email);
  await page.getByLabel("Ton portable").fill("06 12 34 56 78");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  const creation = page.waitForRequest((r) => r.url().endsWith("/v1/companies") && r.method() === "POST");
  await page.getByRole("button", { name: "Essayer Mobiiz" }).click();
  const corps = (await creation).postDataJSON() as Record<string, unknown>;
  await expect(page.getByRole("heading", { name: "Vérifie ton e-mail." })).toBeVisible();
  return { email, corps };
}

test("la carte : 13 régions et l'outre-mer ; une région se zoome en départements ; on revient à la France", async ({ page }) => {
  await page.goto("/commencer");
  await expect(page.getByRole("heading", { name: "Tu travailles où ?" })).toBeVisible();
  await expect(page.locator("path[data-region]")).toHaveCount(13);
  for (const om of ["971", "972", "973", "974", "976"]) await expect(page.locator(`button[data-pastille-region="${om}"]`)).toBeVisible();
  await page.locator('path[data-region="53"]').click();
  await expect(page.getByRole("heading", { name: "Bretagne" })).toBeVisible();
  await expect(page.locator("g[data-departement]")).toHaveCount(4);
  await page.getByRole("button", { name: "Toute la France" }).click();
  await expect(page.getByRole("heading", { name: "Tu travailles où ?" })).toBeVisible();
  await expect(page.locator("g[data-departement]")).toHaveCount(0);
  // Les petits départements d'Île-de-France : au pouce, par les boutons.
  await choisirDepartement(page, "11", "75", { parLaCarte: false });
  await expect(page.getByText("Paris (75)")).toBeVisible();
  // La Corse, sur la carte ; l'outre-mer, dans la liste.
  await page.getByRole("button", { name: "Toute la France" }).click();
  await choisirDepartement(page, "94", "2A");
  await page.getByRole("button", { name: "Toute la France" }).click();
  await page.locator('button[data-pastille-region="974"]').click();
  await page.locator('button[data-pastille="974"]').click();
  await expect(page.getByText("La Réunion (974)")).toBeVisible();
});

test("couvreur : carte, métier, e-mail et portable, l'e-mail vérifié ouvre le premier quantitatif ; aucun SIRET demandé", async ({ page }) => {
  const { email, corps } = await onboarding(page);
  expect(corps).toMatchObject({ trades: ["roofing"], departement: "22", telephone: "06 12 34 56 78", parcours: "essai" });
  // L'e-mail se vérifie comme avant ; l'écran suit tout seul et ouvre le nouveau quantitatif.
  await confirmerEmail(page, email);
  await expect(page).toHaveURL(/\/chantiers\/nouveau/, { timeout: 15_000 });
  await expect(page.getByRole("dialog", { name: "Guide" })).toHaveCount(0);
  await expect(page.getByLabel("SIRET de ton entreprise")).toHaveCount(0);
  // Les analyses offertes sont celles d'avant (3, jamais affichées en compteur ailleurs que dans la fenêtre d'analyse).
  const jauge = await appel(page, "GET", "/v1/ai-usage/jauge");
  expect(jauge.body.jauge).toMatchObject({ utilisees: 0, restantes: 3 });
});

test("un autre métier entre quand même, avec le message « en rodage »", async ({ page }) => {
  await page.goto("/commencer");
  await choisirDepartement(page, "53", "29");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Électricien", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Mobiiz est réglé d'abord pour les couvreurs. Tu peux déjà tout utiliser, mais la lecture de devis pour ton métier est encore en rodage. On te prévient dès qu'elle est prête.",
  );
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { name: "Et on essaie." })).toBeVisible();
  // Retour : le métier et le département restent.
  await page.getByRole("button", { name: "Retour" }).click();
  await expect(page.getByRole("button", { name: "Électricien", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("e-mail et portable : un portable fixe est refusé, sur sa ligne", async ({ page }) => {
  await page.goto("/commencer");
  await choisirDepartement(page, "53", "56");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByLabel("Ton e-mail").fill(`fixe-${unique()}@example.fr`);
  await page.getByLabel("Ton portable").fill("02 96 00 00 00");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Essayer Mobiiz" }).click();
  await expect(page.getByText("Il me faut un portable (06 ou 07).")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Vérifie ton e-mail." })).toHaveCount(0);
});

test("le SIRET : rien ne part avant ; l'entreprise trouvée se confirme ; le département se choisit s'il diffère", async ({ page }) => {
  test.setTimeout(90_000);
  const { email } = await onboarding(page, { metier: "Électricien", region: "53", departement: "22" });
  await confirmerEmail(page, email);
  await expect(page).toHaveURL(/\/chantiers\/nouveau/, { timeout: 15_000 });
  // Rien ne part chez un négoce tant que l'entreprise n'est pas confirmée (le serveur le refuse, avec sa phrase).
  const refus = await appel(page, "POST", "/v1/projects/00000000-0000-7000-8000-000000000000/demandes-perso", {});
  expect(refus.status).toBe(403);
  expect(refus.body.error?.details?.reason).toBe("identite_a_confirmer");
  // L'adresse de l'entreprise est dans le Finistère : le département de la carte (22) diffère.
  expect((await appel(page, "PATCH", "/v1/company/profile", { name: "Mon entreprise", address: "1 rue de Siam, 29200 Brest", siret: null, phone: "06 12 34 56 78", email: null })).status).toBe(200);
  await page.goto("/compte/entreprise");
  const carte = page.getByRole("region", { name: "Ton identité auprès des négoces" }).or(page.locator('[aria-label="Ton identité auprès des négoces"]'));
  await carte.getByRole("button", { name: "Modifier" }).click();
  await expect(carte.getByText("Pour que les négoces sachent à qui ils répondent")).toBeVisible();
  await carte.getByLabel("SIRET de ton entreprise").fill("73282932000074");
  const fiche = carte.locator('[aria-label="L\'entreprise trouvée"]');
  await expect(fiche).toBeVisible();
  // « Ce n'est pas la mienne » vide le numéro.
  await fiche.getByRole("button", { name: "Ce n'est pas la mienne" }).click();
  await expect(carte.getByLabel("SIRET de ton entreprise")).toHaveValue("");
  await carte.getByLabel("SIRET de ton entreprise").fill("73282932000074");
  await carte.getByLabel("Ton prénom").fill("Yann");
  // « Enregistrer » sans confirmer : refusé, on dit quoi faire.
  await carte.getByRole("button", { name: "Enregistrer" }).click();
  await expect(carte.getByText(/Dis-nous si c'est bien ton entreprise/)).toBeVisible();
  await carte.locator('[aria-label="L\'entreprise trouvée"]').getByRole("button", { name: /^C'est bien mon (entreprise|numéro)$/ }).click();
  // Le département : celui de la carte ou celui de l'entreprise.
  await expect(carte.getByText(/Lequel on garde pour tes achats groupés/)).toBeVisible();
  await carte.getByLabel(/Finistère \(29\)/).check();
  await carte.getByRole("button", { name: "Enregistrer" }).click();
  await expect(carte.getByText(/^Yann, /)).toBeVisible();
  const identite = await appel(page, "GET", "/v1/company/identite");
  expect(identite.body).toMatchObject({ aConfirmer: false, complete: true, departement: { code: "29" } });
  // Confirmée : la même route ne parle plus d'identité.
  const apres = await appel(page, "POST", "/v1/projects/00000000-0000-7000-8000-000000000000/demandes-perso", {});
  expect(apres.status).not.toBe(403);
});

test("un compte d'avant (inscription complète) n'est pas touché : ni confirmation exigée, ni carte", async ({ page }) => {
  const email = `ancien-${unique()}@example.fr`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Jean Martin");
  await page.getByLabel("Nom de ton entreprise").fill(`Toitures ${unique()}`);
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("heading", { name: "Voici ton adresse Mobiiz :" })).toBeVisible();
  const r = await appel(page, "POST", "/v1/projects/00000000-0000-7000-8000-000000000000/demandes-perso", {});
  expect(r.body.error?.details?.reason).not.toBe("identite_a_confirmer");
  const identite = await appel(page, "GET", "/v1/company/identite");
  expect(identite.body.aConfirmer).toBe(false);
});

const SECRET = "Bearer e2e-secret-de-la-tache";
async function dernierMail(page: Page, email: string, sujet: RegExp): Promise<string> {
  const r = await page.request.get(`/v1/internal/test/emails?to=${encodeURIComponent(email)}`, { headers: { authorization: SECRET } });
  const mails = ((await r.json()) as { emails: { subject: string; text: string }[] }).emails.filter((m) => sujet.test(m.subject));
  const m = mails.at(-1);
  if (!m) throw new Error(`aucun e-mail « ${sujet} » pour ${email}`);
  return /https?:\/\/\S+/.exec(m.text)![0];
}

test("connexion par lien : en premier sur l'écran, un toucher connecte, le lien ne sert qu'une fois ; le mot de passe reste possible", async ({ page, browser }) => {
  const { email } = await onboarding(page);
  await confirmerEmail(page, email);
  await expect(page).toHaveURL(/\/chantiers\/nouveau/, { timeout: 15_000 });
  // Un autre appareil, sans session.
  const ctx = await browser.newContext({ ...(test.info().project.use as object) });
  const autre = await ctx.newPage();
  await autre.goto("/connexion");
  const lienBouton = autre.getByRole("button", { name: "Recevoir un lien de connexion" });
  const motDePasse = autre.getByRole("button", { name: "Se connecter" });
  expect((await lienBouton.boundingBox())!.y).toBeLessThan((await motDePasse.boundingBox())!.y);
  await autre.getByLabel("E-mail").fill(email);
  await lienBouton.click();
  await expect(autre.getByRole("status")).toContainText("valable 15 minutes");
  const lien = await dernierMail(autre, email, /lien de connexion/);
  await autre.goto(lien);
  await expect(autre).not.toHaveURL(/\/connexion/);
  expect((await autre.request.get("/v1/me")).status()).toBe(200);
  await ctx.close();
  // Le même lien, une seconde fois : refusé, on le dit.
  const ctx2 = await browser.newContext({ ...(test.info().project.use as object) });
  const troisieme = await ctx2.newPage();
  await troisieme.goto(lien);
  await expect(troisieme).toHaveURL(/\/connexion\?lien=/);
  await expect(troisieme.getByRole("alert").filter({ hasText: "a expiré ou a déjà servi" })).toBeVisible();
  expect((await troisieme.request.get("/v1/me")).status()).toBe(401);
  await ctx2.close();
});

test("aucun nom d'entreprise avant le SIRET ; « Voici ton adresse Mobiiz » au premier envoi, une seule fois", async ({ page }) => {
  test.setTimeout(120_000);
  const { email } = await onboarding(page);
  await confirmerEmail(page, email);
  await expect(page).toHaveURL(/\/chantiers\/nouveau/, { timeout: 15_000 });
  await expect(page.getByText("Mon entreprise", { exact: true })).toHaveCount(0);
  // Une liste saisie (aucune IA), validée, et un négoce au carnet.
  const q = await appel(page, "POST", "/v1/quantitatifs", { lignes: [{ libelle: "Ardoise naturelle 32×22", quantite: "900", unite: "pièces" }] });
  expect(q.status).toBe(201);
  const { id, projetId } = q.body as unknown as { id: string; projetId: string };
  let courant = (await appel(page, "GET", `/v1/quantitatifs/${id}`)).body as unknown as { questions: { id: string; boutons: { valeur: string }[] }[] };
  for (let i = 0; i < 10 && courant.questions.length > 0; i++)
    courant = (await appel(page, "POST", `/v1/quantitatifs/${id}/reponses`, { reponses: [{ question: courant.questions[0]!.id, valeur: courant.questions[0]!.boutons[0]?.valeur ?? "ok" }] })).body as unknown as typeof courant;
  expect((await appel(page, "POST", `/v1/quantitatifs/${id}/validation`)).status).toBe(200);
  expect((await appel(page, "POST", "/v1/suppliers", { name: "Négoce du Trieux", email: `trieux-${unique()}@negoce.example` })).status).toBe(201);
  await page.goto(`/chantiers/${projetId}`);
  await expect(page.getByText("Mon entreprise", { exact: true })).toHaveCount(0);
  // Avant aucune adresse : elle se fabrique au premier envoi.
  expect((await appel(page, "GET", "/v1/company/identite")).body.entreprise).toBe("");
  await page.getByRole("button", { name: "Demander les prix à mes négoces" }).click();
  const avant = page.getByRole("dialog", { name: "Avant d'envoyer" });
  await expect(avant.getByText("Pour que les négoces sachent à qui ils répondent")).toBeVisible();
  await expect(avant.getByLabel("Ton portable")).toHaveValue("06 12 34 56 78");
  await avant.getByLabel("SIRET de ton entreprise").fill("73282932000074");
  await avant.getByLabel("Ton prénom").fill("Yann");
  await avant.locator('[aria-label="L\'entreprise trouvée"]').getByRole("button", { name: /^C'est bien mon/ }).click();
  const adresse = page.getByRole("dialog", { name: "Voici ton adresse Mobiiz :" });
  await expect(adresse).toBeVisible();
  await expect(adresse.getByText("Les réponses des négoces arrivent ici", { exact: false })).toBeVisible();
  await adresse.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("dialog", { name: "À qui j'envoie ?" })).toBeVisible();
  // Rouvert : plus jamais l'écran de l'adresse.
  await page.reload();
  const feuille = page.getByRole("dialog", { name: "À qui j'envoie ?" });
  const ouvrir = page.getByRole("button", { name: /^(Demander les prix à mes négoces|Envoyer la demande de devis)$/ }).first();
  await expect(feuille.or(ouvrir).first()).toBeVisible();
  if (!(await feuille.isVisible())) await ouvrir.click();
  await expect(feuille).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Voici ton adresse Mobiiz :" })).toHaveCount(0);
});
