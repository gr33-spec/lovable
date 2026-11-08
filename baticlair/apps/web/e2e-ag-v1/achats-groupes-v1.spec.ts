import { expect, test, type Browser, type Page } from "@playwright/test";
import { confirmerEmail } from "../e2e/confirmer-email";

/**
 * ACHATS GROUPÉS V1 (Greg, 7 novembre 2026 : « La V5.2 est validée »). Les parcours réellement codés, sur iPhone SE,
 * Android et ordinateur, sans débordement horizontal : l'entrée directe par produit (ouvrir, puis une autre entreprise
 * rejoint), « Depuis un quantitatif » (classement par lot, correction d'une ligne, deux besoins confirmés), modifier et
 * retirer, la reconfirmation dans « À faire », l'offre complète jusqu'à « Offre à examiner » (bouton final désactivé).
 * Aucun e-mail réel : la boîte aux lettres de test.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const CAPTURES = process.env.AG_CAPTURES ?? "test-results/ag-v1";
/** Un département par appareil : les achats d'un appareil ne se mêlent jamais à ceux d'un autre (même base). */
const ZONES: Record<string, { cp: string; ville: string; nom: string }> = { "iphone-se": { cp: "22300", ville: "Lannion", nom: "Côtes-d'Armor (22)" }, android: { cp: "29200", ville: "Brest", nom: "Finistère (29)" }, ordinateur: { cp: "56000", ville: "Vannes", nom: "Morbihan (56)" } };
const zone = () => ZONES[test.info().project.name] ?? ZONES["iphone-se"]!;
const jourDans = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

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

/** Aucun débordement horizontal, puis la capture (pleine page) de l'écran. */
async function capture(page: Page, nom: string) {
  await page.waitForTimeout(150);
  const deborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(deborde, `débordement horizontal sur « ${nom} »`).toBeLessThanOrEqual(0);
  await page.screenshot({ path: `${CAPTURES}/${test.info().project.name}/${nom}.png`, fullPage: true });
}

async function inscrire(page: Page, prenom = "Jean"): Promise<{ email: string }> {
  const email = `artisan-${unique()}@example.fr`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill(`${prenom} Martin`);
  await page.getByLabel("Nom de ton entreprise").fill(`Toitures ${unique()}`);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`^Bonjour ${prenom}`) }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  expect((await apiJson(page, "PATCH", "/v1/company/profile", { address: `3 rue des Ajoncs, ${zone().cp} ${zone().ville}`, siret: "73282932000074", phone: null, email: null })).status).toBe(200);
  expect((await apiJson(page, "POST", "/v1/groupe/siret")).status).toBe(200);
  await confirmerEmail(page, email);
  return { email };
}

async function nouvelArtisan(browser: Browser, prenom: string) {
  const ctx = await browser.newContext({ ...(test.info().project.use as object) });
  const page = await ctx.newPage();
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  const qui = await inscrire(page, prenom);
  return { ctx, page, ...qui };
}

/** L'admin Mobiiz (double authentification par le code reçu dans la boîte de test). */
async function admin(browser: Browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/inscription");
  const email = "admin-groupe@example.fr";
  const r = await page.request.post("/v1/auth/sign-in/email", { data: { email, password: "motdepasse-admin-solide" }, headers: { origin: "http://localhost:3000" } });
  if (r.status() !== 200) {
    await page.request.post("/v1/auth/sign-up/email", { data: { email, password: "motdepasse-admin-solide", name: "Admin Groupe" }, headers: { origin: "http://localhost:3000" } });
  }
  await page.request.post("/v1/admin/pilotage/code");
  const mails = (await (await page.request.get(`/v1/internal/test/emails?to=${encodeURIComponent(email)}`, { headers: { authorization: "Bearer e2e-secret-de-la-tache" } })).json()) as { emails: { subject: string; text: string }[] };
  const code = /(\d{6})/.exec([...mails.emails].reverse().find((m) => /code d'accès au pilotage/.test(m.subject))!.text)![1]!;
  expect((await page.request.post("/v1/admin/pilotage/code/verifier", { data: { code } })).status()).toBe(200);
  return { ctx, page };
}

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
});

test("entrée directe : produit précis, quantité, aucun achat compatible, entreprise, confirmer ; une autre entreprise rejoint ; modifier, reconfirmer, offre à examiner, retirer", async ({ page, browser }) => {
  test.setTimeout(240_000);
  await inscrire(page);
  // Accueil des achats groupés.
  await page.goto("/achats-groupes");
  await expect(page.getByRole("heading", { name: "Achats groupés" })).toBeVisible();
  await expect(page.getByText("Regroupe tes besoins avec d'autres entreprises")).toBeVisible();
  await expect(page.getByText(zone().nom)).toBeVisible();
  // Greg, 8 novembre 2026 : un seul filtre (« Métier »), aucune rangée de boutons.
  await expect(page.getByRole("combobox", { name: "Filtrer par métier" })).toBeVisible();
  for (const f of ["Couverture", "Zinguerie", "Isolation", "Bois", "Électricité"]) await expect(page.getByRole("button", { name: f, exact: true })).toHaveCount(0);
  await expect(page.getByText("Mobiiz. Plus on est, moins on paie.")).toBeVisible();
  // Greg, 8 novembre 2026 : un bouton flottant « Ajouter un matériau » : Mobiiz ou ta liste ; plus de catalogue.
  await page.getByRole("button", { name: "Ajouter un matériau" }).click();
  const ajout = page.getByRole("dialog", { name: "Ajouter un matériau" });
  for (const nom of [/^Parler à Mobiiz/, /^Depuis un quantitatif/]) await expect(ajout.getByRole("link", { name: nom })).toBeVisible();
  await expect(ajout.getByRole("link")).toHaveCount(2);
  await capture(page, "01b-ajouter-un-materiau");
  await ajout.getByRole("button", { name: "Fermer" }).click();
  const menu = page.getByRole("navigation", { name: "Navigation principale" });
  await expect(menu.getByRole("link", { name: "Achats groupés" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Créer un quantitatif" })).toBeVisible();
  for (const lien of await page.getByRole("link").all()) expect((await lien.innerText()).trim()).not.toBe("+");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await capture(page, "01-accueil");
  // 1. Choisir précisément le produit (le produit arrive choisi, comme depuis Mobiiz ou la carte d'un achat).
  await page.goto("/achats-groupes/nouveau?type=ardoise");
  await expect(page.getByRole("heading", { name: "Choisis précisément le produit" })).toBeVisible();
  await page.getByLabel("Format").selectOption("32x22");
  await page.getByLabel("Origine").selectOption("espagne");
  await page.getByLabel("Choix").selectOption("1");
  await expect(page.getByText("Précise l'épaisseur pour rejoindre un achat groupé.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuer" })).toBeDisabled();
  await capture(page, "02-produit-a-preciser");
  await page.getByLabel("Épaisseur").selectOption("5");
  await expect(page.getByText("1 palette = 480 pièces · non garanti par une référence")).toBeVisible();
  await page.getByRole("button", { name: "Confirmer 480 pièces par palette" }).click();
  await capture(page, "03-produit-precis");
  await page.getByRole("button", { name: "Continuer" }).click();
  // 2. Quantité, livraison ou retrait, date.
  await expect(page.getByRole("heading", { name: "Combien, où et pour quand ?" })).toBeVisible();
  await expect(page.getByText("Ardoise naturelle 32 × 22 · Espagne · 1er choix · 5 mm").or(page.getByText("Ardoise naturelle", { exact: true })).first()).toBeVisible();
  await page.getByLabel("Quantité (palettes)").fill("10");
  await expect(page.getByText("10 palettes = 4 800 pièces")).toBeVisible();
  await page.getByText("Livraison sur chantier").click();
  await page.getByLabel("Lieu de livraison (privé)").fill(`12 rue du Port, ${zone().cp} ${zone().ville}`);
  await page.getByLabel("J'ai besoin de ces matériaux avant le").fill(jourDans(45));
  await expect(page.getByText("Ton adresse exacte n'est jamais montrée aux autres entreprises.")).toBeVisible();
  await capture(page, "04-quantite-date");
  await page.getByRole("button", { name: "Continuer" }).click();
  // 3. Aucun achat compatible : l'ouvrir.
  await expect(page.getByRole("heading", { name: "Aucun achat groupé compatible pour le moment" })).toBeVisible();
  await expect(page.getByText(/Ce n'est pas une commande : tu décideras après réception d'une offre complète/)).toBeVisible();
  await capture(page, "05-aucun-compatible");
  await page.getByRole("button", { name: "Ouvrir cet achat groupé" }).click();
  // La vérification de l'entreprise, la première fois seulement.
  await expect(page.getByRole("heading", { name: "Ton entreprise" })).toBeVisible();
  await page.getByText("Dirigeant", { exact: true }).click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Tu as déclaré être : Dirigeant.")).toBeVisible();
  await capture(page, "06-entreprise");
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByText("Ouvrira un nouvel achat groupé après confirmation")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmer mon besoin" })).toBeDisabled();
  await page.getByRole("checkbox", { name: /Je confirme que cette quantité correspond à un besoin réel de mon entreprise/ }).check();
  await capture(page, "07-confirmer");
  await page.getByRole("button", { name: "Confirmer mon besoin" }).click();
  await expect(page).toHaveURL(/\/achats-groupes\/besoins\/[0-9a-f-]{36}/);
  await expect(page.getByText("Besoin confirmé", { exact: true })).toBeVisible();
  await expect(page.getByText("D'autres entreprises se positionnent. Les volumes seront visibles à partir de 5 entreprises.")).toBeVisible();
  await capture(page, "08-besoin-confirme");
  const besoinUrl = page.url().split("?")[0]!;

  // Une autre entreprise : l'achat correspond ; « ne me convient pas » ne propose pas la zone ; elle rejoint.
  const b = await nouvelArtisan(browser, "Paul");
  await b.page.goto("/achats-groupes");
  // Greg, 8 novembre 2026 : une ligne par achat, le nom du produit et le temps qui reste, rien d'autre.
  await expect(b.page.getByRole("list", { name: "Achats groupés ouverts" }).getByText(/^Se termine dans \d+ jours$/).first()).toBeVisible();
  await capture(b.page, "08b-liste-compacte");
  await b.page.getByRole("link", { name: /Ardoise naturelle 32 × 22 · Espagne · 1er choix · 5 mm/ }).click();
  await b.page.getByRole("button", { name: "Confirmer 480 pièces par palette" }).click();
  await b.page.getByRole("button", { name: "Continuer" }).click();
  await b.page.getByLabel("Quantité (palettes)").fill("4");
  await b.page.getByText("Retrait au dépôt").click();
  await b.page.getByText("Livraison sur chantier").click();
  await b.page.getByLabel("Lieu de livraison (privé)").fill("Perros-Guirec");
  await b.page.getByLabel("J'ai besoin de ces matériaux avant le").fill(jourDans(50));
  await b.page.getByRole("button", { name: "Continuer" }).click();
  await expect(b.page.getByRole("heading", { name: "Un achat groupé correspond" })).toBeVisible();
  await expect(b.page.getByText(zone().ville)).toHaveCount(0);
  await b.page.getByRole("button", { name: "Cet achat groupé ne me convient pas" }).click();
  await expect(b.page.getByText("Ma zone est différente")).toHaveCount(0);
  for (const r of ["Ma date de besoin est différente", "Livraison ou retrait différent", "Une caractéristique du produit est différente"]) await expect(b.page.getByText(r)).toBeVisible();
  await capture(b.page, "09-ne-convient-pas");
  await b.page.getByText("Ma date de besoin est différente").click();
  await b.page.getByRole("button", { name: "Changer ma date" }).click();
  // Même période : toujours le même achat, et la phrase « identique ».
  await b.page.getByRole("button", { name: "Continuer" }).click();
  await expect(b.page.getByText("Ce besoin est identique : rejoins cet achat groupé pour ne pas diviser les volumes.")).toBeVisible();
  await capture(b.page, "10-un-achat-correspond");
  await b.page.getByRole("button", { name: "Rejoindre cet achat groupé" }).click();
  await b.page.getByText("Dirigeant", { exact: true }).click();
  await b.page.getByRole("button", { name: "Enregistrer" }).click();
  await b.page.getByRole("button", { name: "Continuer" }).click();
  await expect(b.page.getByText("Rejoindra cet achat groupé après confirmation")).toBeVisible();
  await b.page.getByRole("checkbox", { name: /Je confirme que cette quantité/ }).check();
  await b.page.getByRole("button", { name: "Confirmer mon besoin" }).click();
  await expect(b.page.getByText("Besoin confirmé", { exact: true })).toBeVisible();

  // Modifier : la quantité, puis la date ; le besoin reste confirmé.
  await page.goto(besoinUrl);
  await page.getByRole("button", { name: "Retirer ou modifier" }).click();
  await page.getByText("Quantité modifiée").click();
  await page.getByLabel(/Nouvelle quantité/).fill("12");
  await expect(page.getByText("= 5 760 pièces")).toBeVisible();
  await capture(page, "11-modifier-quantite");
  await page.getByRole("button", { name: "Mettre à jour ma quantité" }).click();
  await expect(page.getByText("Quantité mise à jour. Ton besoin reste dans l'achat groupé.")).toBeVisible();
  await expect(page.getByText("12 palettes = 5 760 pièces").first()).toBeVisible();
  await page.getByRole("button", { name: "Retirer ou modifier" }).click();
  await page.getByText("Chantier reporté").click();
  await page.getByLabel("Nouvelle date de besoin").fill(jourDans(48));
  await page.getByRole("button", { name: "Mettre à jour la date" }).click();
  await expect(page.getByText("Date mise à jour. Ton besoin reste dans l'achat groupé.")).toBeVisible();
  await expect(page.getByText("Besoin confirmé", { exact: true })).toBeVisible();

  // Préparation de la consultation : l'action est dans « À faire » (accueil), puis reconfirmée.
  const g = await admin(browser);
  const achats = (await g.page.request.get("/v1/admin/ag/achats")).json() as Promise<{ achats: { id: string }[] }>;
  const achatId = (await achats).achats[0]!.id;
  expect((await g.page.request.post(`/v1/admin/ag/achats/${achatId}/preparation`, { data: { heures: 72 } })).status()).toBe(200);
  await page.goto("/");
  await expect(page.getByText(/Reconfirme ta quantité : Ardoise naturelle 32 × 22/).first()).toBeVisible();
  await capture(page, "12-a-faire-accueil");
  await page.goto("/achats-groupes/mes-besoins");
  await expect(page.getByRole("region", { name: "À faire" }).getByText("Préparation de la consultation")).toBeVisible();
  await capture(page, "13-mes-besoins");
  await page.getByRole("link", { name: "Reconfirmer ma quantité" }).click();
  await capture(page, "14-preparation");
  await page.getByRole("button", { name: "Reconfirmer ma quantité" }).click();
  await expect(page.getByText("Quantité reconfirmée.", { exact: true })).toBeVisible();

  // Clôture (test local), offre complète : « Offre à examiner », calcul détaillé, bouton final désactivé.
  expect((await g.page.request.post(`/v1/admin/ag/achats/${achatId}/cloture`, { data: { avantLHeure: true } })).status()).toBe(200);
  expect((await g.page.request.put(`/v1/admin/ag/achats/${achatId}/offre`, { data: { fournisseur: "Négoce de l'Armor", prixUnitaireHt: 0.98, livraisonHt: 45, delai: "10 jours ouvrés", lieu: "Livraison sur chantier, Lannion", paiement: "30 jours fin de mois", validite: "72 heures", annulation: "Sans frais jusqu'à 48 h avant la livraison" } })).status()).toBe(200);
  await page.goto(besoinUrl);
  await expect(page.getByRole("heading", { name: "Offre à examiner" })).toBeVisible();
  await expect(page.getByText("5 760 × 0,98 € = 5 644,80 €")).toBeVisible();
  await expect(page.getByText("5 644,80 € + 45,00 € = 5 689,80 € HT")).toBeVisible();
  await expect(page.getByRole("button", { name: "[bouton final : texte à fixer]" })).toBeDisabled();
  await capture(page, "15-offre-a-examiner");
  // L'autre entreprise, non reconfirmée : indicatif, jamais transmis.
  await b.page.goto("/achats-groupes/mes-besoins");
  await expect(b.page.getByText("Besoin indicatif").first()).toBeVisible();
  await b.ctx.close();
  await g.ctx.close();
});

test("« Ajouter un matériau » avec Mobiiz (Greg, 8 novembre) : une phrase de comptoir, une question à la fois, réponses rapides, puis le besoin prérempli", async ({ page }) => {
  test.setTimeout(120_000);
  await inscrire(page);
  await page.goto("/achats-groupes");
  await page.getByRole("button", { name: "Ajouter un matériau" }).click();
  await page.getByRole("dialog", { name: "Ajouter un matériau" }).getByRole("link", { name: /^Parler à Mobiiz/ }).click();
  const chat = page.getByRole("dialog", { name: "Ajouter un matériau en achat groupé" });
  await expect(chat.getByText(/Quel matériau veux-tu acheter en groupe \?/).first()).toBeVisible();
  // Une réponse rapide, puis une phrase : Mobiiz garde ce qui est dit et demande ce qui manque, une chose à la fois.
  await chat.getByRole("group", { name: "Réponses rapides" }).getByRole("button", { name: "Ardoise naturelle" }).click();
  await expect(chat.getByText("Ardoise naturelle : c'est noté. Format ?")).toBeVisible();
  await capture(page, "22-conversation-question");
  await chat.getByRole("textbox", { name: "Ton message" }).fill("32 22 Espagne 1er choix 5 mm, 10 palettes livrées sur chantier pour le 15/03");
  await chat.getByRole("button", { name: "Envoyer le message" }).click();
  await expect(chat.getByText(/^C'est complet : Ardoise naturelle · 32 × 22 · Espagne · 1er choix · 5 mm, 10 palettes, livraison sur chantier, avant le 15 mars/)).toBeVisible();
  await capture(page, "23-conversation-complete");
  await chat.getByRole("button", { name: "Continuer : vérifier et confirmer" }).click();
  // Le parcours habituel, prérempli : il ne reste que le conditionnement et le lieu privé.
  await expect(page.getByRole("heading", { name: "Choisis précisément le produit" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmer 480 pièces par palette" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByLabel("Quantité (palettes)")).toHaveValue("10");
  await expect(page.getByLabel("J'ai besoin de ces matériaux avant le")).toHaveValue(/-03-15$/);
  await expect(page.getByText("10 palettes = 4 800 pièces")).toBeVisible();
  await page.getByLabel("Lieu de livraison (privé)").fill(`12 rue du Port, ${zone().cp} ${zone().ville}`);
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { name: /Aucun achat groupé compatible|Un achat groupé correspond/ })).toBeVisible();
});

test("retirer un besoin : « Garder mon besoin » d'abord, puis « Confirmer le retrait »", async ({ page }) => {
  test.setTimeout(120_000);
  await inscrire(page);
  expect((await apiJson(page, "POST", "/v1/ag/habilitation", { role: "autorise" })).status).toBe(200);
  const r = await apiJson<{ besoins: { id: string }[] }>(page, "POST", "/v1/ag/besoins", { confirmation: true, cleIdempotence: `e2e-${unique()}`, besoins: [{ type: "gouttiere", attributs: { matiere: "zinc", developpe: "33" }, quantite: 40, unite: "m", reception: "livraison", lieu: zone().ville, dateBesoin: jourDans(40) }] });
  expect(r.status).toBe(201);
  await page.goto(`/achats-groupes/besoins/${r.body.besoins[0]!.id}`);
  await page.getByRole("button", { name: "Retirer ou modifier" }).click();
  await page.getByText("Besoin annulé").click();
  await expect(page.getByRole("button", { name: "Garder mon besoin" })).toBeVisible();
  await capture(page, "16-retirer");
  await page.getByRole("button", { name: "Confirmer le retrait" }).click();
  await expect(page.getByText("Besoin retiré. Ton historique est conservé.")).toBeVisible();
  await expect(page.getByText("Besoin retiré", { exact: true }).first()).toBeVisible();
  await capture(page, "17-besoin-retire");
});

test("depuis un quantitatif tapé : lots, mentions, correction d'une ligne, deux besoins confirmés", async ({ page }) => {
  test.setTimeout(180_000);
  await inscrire(page);
  const q = await apiJson<{ id: string; projetId: string }>(page, "POST", "/v1/quantitatifs", {
    lignes: [
      { libelle: "Ardoise naturelle 32x22 Espagne 1er choix 5 mm", quantite: "10", unite: "palettes" },
      { libelle: "Crochets inox 100 mm", quantite: "950", unite: "u" },
      { libelle: "Liteaux", quantite: "300", unite: "m" },
      { libelle: "Ardoise naturelle 35x25 Espagne", quantite: "3000", unite: "pièces" },
      { libelle: "Gouttière zinc dév. 33", quantite: "40", unite: "m" },
      { libelle: "Câble R2V 3G2,5", quantite: "6", unite: "couronnes" },
      { libelle: "Parpaing creux 20x20x50", quantite: "200", unite: "u" },
    ],
  });
  expect(q.status).toBe(201);
  let courant = (await apiJson<{ questions: { id: string; boutons: { valeur: string }[] }[] }>(page, "GET", `/v1/quantitatifs/${q.body.id}`)).body;
  for (let i = 0; i < 15 && courant.questions.length > 0; i++) {
    const question = courant.questions[0]!;
    courant = (await apiJson<typeof courant>(page, "POST", `/v1/quantitatifs/${q.body.id}/reponses`, { reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await apiJson(page, "POST", `/v1/quantitatifs/${q.body.id}/validation`)).status).toBe(200);
  await page.goto("/achats-groupes");
  await page.getByRole("button", { name: "Ajouter un matériau" }).click();
  await page.getByRole("dialog", { name: "Ajouter un matériau" }).getByRole("link", { name: /^Depuis un quantitatif/ }).click();
  await expect(page.getByRole("heading", { name: "Depuis un quantitatif" })).toBeVisible();
  await page.goto(`/achats-groupes/quantitatif/${q.body.projetId}`);
  for (const lot of ["Couverture", "Zinguerie", "Électricité", "Maçonnerie"]) await expect(page.getByRole("heading", { name: lot, exact: true })).toBeVisible();
  await expect(page.getByText("Recommandé pour un achat groupé").first()).toBeVisible();
  await expect(page.getByText("Compatible avec un achat groupé").first()).toBeVisible();
  await expect(page.getByText("À préciser : choix et épaisseur manquants")).toBeVisible();
  // Les liteaux tapés seuls ne disparaissent jamais : désactivés, avec la raison exacte.
  const liteaux = page.getByRole("listitem").filter({ has: page.getByText("Liteaux", { exact: true }) });
  await expect(liteaux.getByText("À préciser : section et essence manquantes")).toBeVisible();
  await expect(liteaux.getByRole("checkbox")).toBeDisabled();
  await expect(page.getByText("Pas encore ouvert aux achats groupés").first()).toBeVisible();
  // Rien n'est coché d'office.
  await expect(page.getByRole("button", { name: "Sélectionne des lignes" })).toBeDisabled();
  await capture(page, "18-selection-par-lot");
  // Correction du lot d'UNE ligne (les crochets en zinguerie), sans déplacer les autres.
  await page.getByLabel("Lot de la ligne Crochets inox 100 mm").selectOption("zinguerie");
  await expect(page.getByRole("region", { name: "Zinguerie" }).getByText("Crochets inox 100 mm", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Couverture" }).getByText("Ardoise naturelle 32 × 22 · Espagne · 1er choix · 5 mm", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sélectionner les recommandations" }).click();
  await expect(page.getByRole("button", { name: "Continuer avec 2 lignes" })).toBeVisible();
  await capture(page, "19-selection-2-lignes");
  await page.getByRole("button", { name: "Continuer avec 2 lignes" }).click();
  await expect(page.getByRole("heading", { name: "Confirmer mes 2 besoins" })).toBeVisible();
  await page.getByText("Livraison sur chantier").click();
  await page.getByLabel("Lieu de livraison (privé)").fill(`3 rue des Ajoncs, ${zone().cp} ${zone().ville}`);
  await page.getByLabel("J'ai besoin de ces matériaux avant le").fill(jourDans(40));
  // Chaque ligne rejoint l'achat compatible (la gouttière du parcours précédent) ou ouvre le sien.
  await expect(page.getByText(/^(Rejoindra cet achat groupé|Ouvrira un nouvel achat groupé) après confirmation$/)).toHaveCount(2);
  const conversions = page.getByRole("button", { name: /^Confirmer \d+ (pièces|m) par (palette|longueur)$/ });
  await expect(conversions).toHaveCount(2);
  await conversions.first().click();
  await expect(conversions).toHaveCount(1);
  await conversions.first().click();
  await expect(page.getByText("Conditionnement confirmé.")).toHaveCount(2);
  await page.getByText("Ton entreprise").waitFor();
  await page.getByText("Dirigeant", { exact: true }).click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("checkbox", { name: /Je confirme qu'il s'agit de besoins réels de mon entreprise/ }).check();
  await capture(page, "20-confirmer-2-besoins");
  await page.getByRole("button", { name: "Confirmer mes 2 besoins" }).click();
  await expect(page).toHaveURL(/\/achats-groupes\/mes-besoins/);
  await expect(page.getByText("Besoin confirmé")).toHaveCount(2);
  await capture(page, "21-mes-besoins-2");
  // Les deux lignes ne partent plus en demande individuelle.
  const lignes = await apiJson<{ lignes: { texte: string }[] }>(page, "GET", `/v1/ag/projects/${q.body.projetId}/lignes`);
  expect(lignes.body.lignes.filter((l) => l.texte === "Déjà dans un achat groupé")).toHaveLength(2);
});
