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
  await expect(page.getByText("Achète avec d'autres artisans de ton secteur")).toBeVisible();
  // UX simplifiée (Greg, 8 novembre 2026) : l'onglet montre « Mes besoins » puis « Achats ouverts ».
  await expect(page.getByRole("heading", { name: "Mes besoins", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Achats ouverts", exact: true })).toBeVisible();
  await expect(page.getByText(zone().nom)).toBeVisible();
  // Greg, 8 novembre 2026 : un seul filtre (« Métier »), aucune rangée de boutons.
  await expect(page.getByRole("combobox", { name: "Filtrer par métier" })).toBeVisible();
  for (const f of ["Couverture", "Zinguerie", "Isolation", "Bois", "Électricité"]) await expect(page.getByRole("button", { name: f, exact: true })).toHaveCount(0);
  await expect(page.getByText("Mobiiz. Plus on est, moins on paie.")).toBeVisible();
  // PUBLIER UN BESOIN (Greg, 15 novembre 2026 ; RÈGLE CHANGÉE : avant, un lien discret « Ajouter un matériau sans
  // quantitatif ») : UN bouton visible (flottant au-dessus de la barre du bas sur téléphone, dans l'en-tête sur ordinateur),
  // qui ne recouvre ni la barre ni la dernière ligne ; deux chemins.
  const publier = page.getByRole("button", { name: "Publier un besoin" });
  await expect(publier).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Ajouter un matériau sans quantitatif" })).toHaveCount(0);
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  if ((page.viewportSize()?.width ?? 0) < 1024) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const [b, n, fin] = [await publier.boundingBox(), await nav.boundingBox(), await page.getByText("Mobiiz. Plus on est, moins on paie.").boundingBox()];
    // Juste au-dessus de la barre du bas, dans l'écran, sans masquer la fin de la page.
    expect(b!.y + b!.height).toBeLessThanOrEqual(n!.y);
    expect(b!.x + b!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(fin!.y + fin!.height).toBeLessThanOrEqual(b!.y);
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  const brouillonsAvant = await page.evaluate(async () => (await (await fetch("/v1/brouillons", { headers: { "x-company-id": localStorage.getItem("baticlair.companyId") ?? "" } })).text()));
  await publier.click();
  const ajout = page.getByRole("dialog", { name: "Publier un besoin" });
  for (const nom of [/^Choisir une liste/, /^Créer mon besoin/]) await expect(ajout.getByRole("link", { name: nom })).toBeVisible();
  await expect(ajout.getByRole("link")).toHaveCount(2);
  // Ouvrir la saisie puis revenir sans rien confirmer : aucun brouillon fantôme, aucun besoin créé.
  await ajout.getByRole("link", { name: /^Créer mon besoin/ }).click();
  // UN SEUL OUTIL (Greg, 16 novembre 2026) : le même écran que « Nouveau quantitatif », ses deux mêmes choix. Lot E (15
  // novembre 2026) : il vit sous « Achats groupés » : son adresse, son titre et l'onglet allumé le disent.
  await expect(page).toHaveURL(/\/achats-groupes\/publier$/);
  await expect(page.getByRole("heading", { name: "Publier un besoin groupé", level: 1 })).toBeVisible();
  await expect(page.getByText("Prépare les matériaux que tu souhaites acheter avec d'autres artisans. Tu vérifieras tout avant la publication.")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Achats groupés", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Quantitatifs", exact: true })).not.toHaveAttribute("aria-current", "page");
  for (const nom of [/^Je saisis ma liste/, /^Mobiiz m'aide/]) await expect(page.getByRole("main").getByRole("link", { name: nom })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Achats groupés", level: 1 })).toBeVisible();
  expect(await page.evaluate(async () => (await (await fetch("/v1/brouillons", { headers: { "x-company-id": localStorage.getItem("baticlair.companyId") ?? "" } })).text()))).toBe(brouillonsAvant);
  await publier.click();
  await capture(page, "01b-ajouter-un-materiau");
  await ajout.getByRole("button", { name: "Fermer" }).click();
  const menu = page.getByRole("navigation", { name: "Navigation principale" });
  await expect(menu.getByRole("link", { name: "Achats groupés" })).toBeVisible();
  // Revue UX (8 novembre 2026) : sur téléphone, plus aucun bouton de création dans la barre (un seul jaune à l'écran).
  if (test.info().project.name === "ordinateur") await expect(menu.getByRole("link", { name: "Créer un quantitatif" })).toBeVisible();
  else await expect(menu.getByRole("link", { name: "Créer un quantitatif" })).toHaveCount(0);
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
  // RÈGLE CHANGÉE (Greg, 15 novembre 2026, lot H) : le volume et le nombre d'entreprises se voient dès la première.
  await expect(page.getByText(/de besoins confirmés par 1 entreprise$/)).toBeVisible();
  await expect(page.getByText("Entreprises vérifiées")).toBeVisible();
  await expect(page.getByText(/à partir de 5 entreprises/)).toHaveCount(0);
  await capture(page, "08-besoin-confirme");
  const besoinUrl = page.url().split("?")[0]!;

  // Une autre entreprise : l'achat correspond ; « ne me convient pas » ne propose pas la zone ; elle rejoint.
  const b = await nouvelArtisan(browser, "Paul");
  // L'accueil de B (lot UX mobile, 15 novembre 2026) : l'achat ouvert dans son département lui est proposé, par son produit
  // et le temps qui reste ; aucune entreprise n'est nommée. Celui qui y est déjà (A) ne se le voit pas proposer.
  await b.page.goto("/");
  // (La base des parcours est partagée : d'autres achats du département peuvent occuper les trois places.)
  const idees = b.page.getByRole("region", { name: "Achats groupés qui peuvent t'intéresser" });
  await expect(idees.getByRole("listitem").first()).toBeVisible();
  expect(await idees.getByRole("listitem").count()).toBeLessThanOrEqual(3);
  for (const lien of await idees.getByRole("listitem").getByRole("link").all()) await expect(lien).toHaveAccessibleName(/ : .+, Se termine (dans \d+ jours|demain|aujourd'hui)$/);
  await expect(idees.getByRole("link", { name: "Voir tous les achats groupés" })).toHaveAttribute("href", "/achats-groupes");
  expect(await b.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await b.page.goto("/achats-groupes");
  // Greg, 8 novembre 2026 : une ligne par achat, le nom du produit et le temps qui reste, rien d'autre.
  await expect(b.page.getByRole("list", { name: "Achats groupés ouverts" }).getByText(/^Se termine dans \d+ jours$/).first()).toBeVisible();
  await capture(b.page, "08b-liste-compacte");
  await b.page.getByRole("link", { name: /Ardoise naturelle 32 × 22 · Espagne · 1er choix · 5 mm/ }).click();
  // Greg, 8 novembre 2026 : le produit d'un achat ouvert par d'autres ne se modifie pas ; on ajoute sa quantité.
  await expect(b.page.getByRole("heading", { name: "Ajoute ta quantité" })).toBeVisible();
  await expect(b.page.getByText("Achat groupé ouvert par d'autres entreprises : tu ajoutes ta quantité, le produit ne se modifie pas.")).toBeVisible();
  await expect(b.page.getByRole("combobox")).toHaveCount(0);
  await expect(b.page.getByRole("definition").filter({ hasText: "32 × 22" })).toBeVisible();
  await capture(b.page, "08c-produit-verrouille");
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
  await expect(page.getByRole("region", { name: "À faire", exact: true }).getByText("Préparation de la consultation")).toBeVisible();
  await capture(page, "13-mes-besoins");
  await page.getByRole("link", { name: "Reconfirmer ma quantité" }).click();
  await capture(page, "14-preparation");
  await page.getByRole("button", { name: "Reconfirmer ma quantité" }).click();
  await expect(page.getByText("Quantité reconfirmée.", { exact: true })).toBeVisible();

  // Clôture (test local), offre complète : « Offre à examiner », calcul détaillé, puis « Commander à ce prix » ou « Non merci »
  // (Greg, 14 novembre 2026 : l'artisan décide à la réception de l'offre ; avant, un bouton grisé).
  expect((await g.page.request.post(`/v1/admin/ag/achats/${achatId}/cloture`, { data: { avantLHeure: true } })).status()).toBe(200);
  expect((await g.page.request.put(`/v1/admin/ag/achats/${achatId}/offre`, { data: { fournisseur: "Négoce de l'Armor", fournisseurEmail: "ventes-armor@negoce.example", prixUnitaireHt: 0.98, livraisonHt: 45, delai: "10 jours ouvrés", lieu: "Livraison sur chantier, Lannion", paiement: "30 jours fin de mois", validite: "72 heures", annulation: "Sans frais jusqu'à 48 h avant la livraison" } })).status()).toBe(200);
  await page.goto(besoinUrl);
  await expect(page.getByRole("heading", { name: "Offre à examiner" })).toBeVisible();
  await expect(page.getByText("5 760 × 0,98 € = 5 644,80 €")).toBeVisible();
  await expect(page.getByText("5 644,80 € + 45,00 € = 5 689,80 € HT")).toBeVisible();
  await expect(page.getByRole("button", { name: "Non merci" })).toBeEnabled();
  await capture(page, "15-offre-a-examiner");
  // Rien ne part sur un seul appui : la confirmation dit ce qui est commandé et où part le bon.
  await page.getByRole("button", { name: "Commander à ce prix" }).click();
  const confirmation = page.getByRole("group", { name: "Confirmer la commande" });
  await expect(confirmation).toContainText("5 689,80 € HT livré");
  await expect(page.getByRole("status", { name: "Commandé" })).toHaveCount(0);
  await confirmation.getByRole("button", { name: "Confirmer la commande" }).click();
  await expect(page.getByRole("status", { name: "Commandé" })).toContainText("Commandé chez Négoce de l'Armor");
  await expect(page.getByRole("button", { name: "Commander à ce prix" })).toHaveCount(0);
  // Le bon de commande est réellement parti au fournisseur.
  const bons = (await (await g.page.request.get("/v1/internal/test/emails?to=ventes-armor%40negoce.example", { headers: { authorization: "Bearer e2e-secret-de-la-tache" } })).json()) as { emails: { subject: string }[] };
  expect(bons.emails.some((m) => m.subject.startsWith("Bon de commande de"))).toBe(true);
  await capture(page, "16-offre-commandee");
  // L'autre entreprise, non reconfirmée : indicatif, jamais transmis.
  await b.page.goto("/achats-groupes/mes-besoins");
  await expect(b.page.getByText("Besoin indicatif").first()).toBeVisible();
  await b.ctx.close();
  await g.ctx.close();
});

test("« Saisir un nouveau besoin » (Greg, 16 novembre 2026) : le même outil que « Nouveau quantitatif », puis les lignes à cocher ; l'ancienne adresse y mène aussi", async ({ page }) => {
  test.setTimeout(120_000);
  await inscrire(page);
  await apiJson(page, "POST", "/v1/me/guide/vu");
  await page.goto("/achats-groupes");
  await page.getByRole("button", { name: "Publier un besoin" }).click();
  await page.getByRole("dialog", { name: "Publier un besoin" }).getByRole("link", { name: /^Créer mon besoin/ }).click();
  await expect(page.getByRole("heading", { name: "Publier un besoin groupé", level: 1 })).toBeVisible();
  await capture(page, "22-meme-outil");
  // « Je saisis ma liste » : l'écran de saisie habituel, rien de propre aux achats groupés.
  await page.getByRole("main").getByRole("link", { name: /^Je saisis ma liste/ }).click();
  await expect(page).toHaveURL(/\/achats-groupes\/publier\?mode=manuel$/);
  const ecran = page.getByRole("dialog", { name: "Saisir ma liste" });
  await ecran.getByLabel("Rechercher un matériau").fill("Ardoise naturelle 32x22 Espagne 1er choix 5 mm");
  await ecran.getByRole("button", { name: /^Ajouter « Ardoise naturelle 32x22 Espagne 1er choix 5 mm » tel que je l'écris/ }).click();
  await ecran.getByRole("button", { name: "Ajouter à la sélection" }).click();
  const maListe = ecran.getByRole("region", { name: "Ma liste en cours" });
  await maListe.getByLabel("Quantité de Ardoise naturelle 32x22 Espagne 1er choix 5 mm").fill("10");
  await maListe.getByLabel("Unité de Ardoise naturelle 32x22 Espagne 1er choix 5 mm").selectOption("palettes");
  await page.getByRole("button", { name: /^Créer le quantitatif · 1 matériau$/ }).filter({ visible: true }).click();
  // La liste créée mène à l'écran où l'on coche ce que l'on groupe (et elle existe comme un quantitatif normal).
  await expect(page).toHaveURL(/\/achats-groupes\/quantitatif\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Quels articles grouper ?" })).toBeVisible();
  await expect(page.getByText(/Ardoise naturelle/).first()).toBeVisible();
  await capture(page, "23-lignes-a-cocher");
  // Les anciennes adresses du parcours à part ouvrent le même outil ; « Mobiiz m'aide » garde la destination.
  for (const ancienne of ["/achats-groupes/nouveau", "/chantiers/nouveau?pour=achat-groupe"]) {
    await page.goto(ancienne);
    await expect(page).toHaveURL(/\/achats-groupes\/publier$/);
  }
  await expect(page.getByRole("main").getByRole("link", { name: /^Mobiiz m'aide/ })).toHaveAttribute("href", "/achats-groupes/publier?mode=assistant");
  // Le bouton précédent du navigateur garde le contexte : on revient aux achats groupés, jamais aux quantitatifs.
  await page.getByRole("button", { name: /Retour/ }).first().click();
  await expect(page).toHaveURL(/\/achats-groupes(\/|$|\?)/);
  await expect(page.getByRole("dialog", { name: "Ajouter un matériau en achat groupé" })).toHaveCount(0);
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
  // UX simplifiée (Greg, 8 novembre 2026) : depuis la fiche du quantitatif, « Ajouter aux achats groupés ».
  await page.goto(`/chantiers/${q.body.projetId}`);
  const carteAg = page.getByRole("region", { name: "Achats groupés" });
  await carteAg.getByRole("link", { name: "Ajouter aux achats groupés" }).click();
  await expect(page.getByRole("heading", { name: "Quels articles grouper ?" })).toBeVisible();
  for (const lot of ["Couverture", "Zinguerie", "Électricité"]) await expect(page.getByRole("heading", { name: lot, exact: true })).toBeVisible();
  // RÈGLE CHANGÉE (Greg, 13 novembre 2026) : la zinguerie est un lot à part, plus une sous-partie du lot Couverture.
  await expect(page.getByRole("region", { name: "Couverture" }).getByRole("region", { name: "Zinguerie" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Zinguerie", exact: true })).toBeVisible();
  await expect(page.getByText("Recommandé pour un achat groupé").first()).toBeVisible();
  await expect(page.getByText("Compatible avec un achat groupé").first()).toBeVisible();
  await expect(page.getByText("À préciser : choix et épaisseur manquants")).toBeVisible();
  // Les liteaux tapés seuls ne disparaissent jamais : désactivés, avec la raison exacte.
  const liteaux = page.getByRole("listitem").filter({ has: page.getByText("Liteaux", { exact: true }) });
  await expect(liteaux.getByText("À préciser : section et essence manquantes")).toBeVisible();
  // Greg, 12 novembre 2026 : « la case ne réagit pas ». Aucun appui n'est ignoré : la case d'un article à préciser
  // dit ce qui manque, ouvre la précision, et l'article se coche tout seul dès qu'elle est donnée.
  const ardoise35 = page.getByRole("listitem").filter({ has: page.getByText("À préciser : choix et épaisseur manquants") });
  await ardoise35.getByRole("checkbox").click();
  await expect(ardoise35.getByRole("status")).toContainText("Il manque : choix, épaisseur.");
  await expect(ardoise35.getByRole("checkbox")).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Choisis des articles" })).toBeDisabled();
  const precisee = page.getByRole("listitem").filter({ has: page.getByLabel("Épaisseur") });
  await precisee.getByLabel("Choix").selectOption({ index: 1 });
  await precisee.getByLabel("Épaisseur").selectOption({ index: 1 });
  await expect(precisee.getByRole("checkbox")).toBeChecked();
  await expect(page.getByRole("button", { name: "Continuer avec 1 article" })).toBeEnabled();
  // Au clavier aussi : Espace décoche, et le bouton redevient inactif.
  await precisee.getByRole("checkbox").focus();
  await page.keyboard.press("Space");
  await expect(precisee.getByRole("checkbox")).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Choisis des articles" })).toBeDisabled();
  // Ce qui ne se groupe pas est replié en bas, avec sa raison en une phrase (rien n'est caché).
  await page.getByText(/ne peu(t|vent) pas être groupés?$/).click();
  await expect(page.getByRole("list", { name: "Articles qui ne peuvent pas être groupés" })).toContainText("Parpaing creux 20x20x50");
  await expect(page.getByRole("list", { name: "Articles qui ne peuvent pas être groupés" })).toContainText("Pas encore proposé en achat groupé");
  // Rien n'est coché d'office.
  await expect(page.getByRole("button", { name: "Choisis des articles" })).toBeDisabled();
  await capture(page, "18-selection-par-lot");
  // Correction du lot d'UNE ligne (le câble rangé en électricité passe en zinguerie, puis revient), sous « Pourquoi ? ».
  const cable = () => page.getByRole("listitem").filter({ has: page.getByText(/^Câble R2V/) });
  await cable().getByRole("button", { name: "Pourquoi ?" }).click();
  await expect(page.getByLabel(/^Lot de la ligne Câble R2V/).getByRole("option", { name: "Lot : Zinguerie" })).toBeAttached();
  await page.getByLabel(/^Lot de la ligne Câble R2V/).selectOption("zinguerie");
  await expect(page.getByRole("region", { name: "Zinguerie" }).getByText(/^Câble R2V/)).toBeVisible();
  await page.getByLabel(/^Lot de la ligne Câble R2V/).selectOption("electricite");
  await expect(page.getByRole("region", { name: "Électricité" }).getByText(/^Câble R2V/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Couverture" }).getByText("Ardoise naturelle 32 × 22 · Espagne · 1er choix · 5 mm", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cocher les articles conseillés" }).click();
  await expect(page.getByRole("button", { name: "Continuer avec 2 articles" })).toBeVisible();
  await capture(page, "19-selection-2-lignes");
  await page.getByRole("button", { name: "Continuer avec 2 articles" }).click();
  await expect(page.getByRole("heading", { name: "Vérifie et valide" })).toBeVisible();
  await page.getByText("Livraison sur chantier").click();
  await page.getByLabel("Lieu de livraison (privé)").fill(`3 rue des Ajoncs, ${zone().cp} ${zone().ville}`);
  await page.getByLabel("J'ai besoin de ces matériaux avant le").fill(jourDans(40));
  // Mobiiz dit pour chaque article s'il rejoint un achat ouvert ou en ouvre un.
  await expect(page.getByText(/^(Rejoint un achat groupé ouvert|Ouvre un nouvel achat groupé)$/)).toHaveCount(2);
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
  await page.getByRole("button", { name: "Publier mes 2 articles" }).click();
  // Retour à l'onglet : « C'est fait », puis « Mes besoins ».
  await expect(page).toHaveURL(/\/achats-groupes\?ajoutes=2/);
  await expect(page.getByRole("status").filter({ hasText: "2 besoins publiés" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Mes besoins" }).getByText(/Besoin confirmé/)).toHaveCount(2);
  await capture(page, "21-mes-besoins-2");
  // La fiche le dit : ces articles ne partent pas chez les négoces.
  await page.goto(`/chantiers/${q.body.projetId}`);
  await expect(page.getByRole("list", { name: "Articles déjà engagés" })).toContainText("2 articles dans les achats groupés : ils ne partent pas chez tes négoces.");
  // Les deux lignes ne partent plus en demande individuelle.
  const lignes = await apiJson<{ lignes: { texte: string }[] }>(page, "GET", `/v1/ag/projects/${q.body.projetId}/lignes`);
  expect(lignes.body.lignes.filter((l) => l.texte === "Déjà dans un achat groupé")).toHaveLength(2);
});

test("article déjà envoyé aux négoces (Greg, 16 novembre 2026) : il reste cochable, la question est posée, « Non » ne change rien, « Oui » l'ajoute au besoin groupé", async ({ page }) => {
  test.setTimeout(180_000);
  await inscrire(page);
  const q = await apiJson<{ id: string; projetId: string }>(page, "POST", "/v1/quantitatifs", { lignes: [{ libelle: "Ardoise naturelle 32x22 Espagne 1er choix 5 mm", quantite: "10", unite: "palettes" }] });
  expect(q.status).toBe(201);
  let courant = (await apiJson<{ questions: { id: string; boutons: { valeur: string }[] }[] }>(page, "GET", `/v1/quantitatifs/${q.body.id}`)).body;
  for (let i = 0; i < 15 && courant.questions.length > 0; i++) {
    const question = courant.questions[0]!;
    courant = (await apiJson<typeof courant>(page, "POST", `/v1/quantitatifs/${q.body.id}/reponses`, { reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await apiJson(page, "POST", `/v1/quantitatifs/${q.body.id}/validation`)).status).toBe(200);
  const negoceNom = `Négoce ${unique()}`;
  const negoce = (await apiJson<{ id: string }>(page, "POST", "/v1/suppliers", { name: negoceNom, email: `ventes-${unique()}@negoce.example` })).body;
  const demande = await apiJson<{ recipients: { id: string }[] }>(page, "POST", `/v1/projects/${q.body.projetId}/price-requests`, { supplierIds: [negoce.id] });
  expect(demande.status).toBe(201);
  expect((await apiJson(page, "POST", `/v1/price-request-recipients/${demande.body.recipients[0]!.id}/send`)).status).toBe(200);
  // RÈGLE CHANGÉE : avant, un article déjà envoyé à un négoce ne se groupait jamais ; maintenant, après un « oui ».
  await page.goto(`/chantiers/${q.body.projetId}`);
  await expect(page.getByRole("list", { name: "Articles déjà engagés" })).toContainText("1 article déjà envoyé à tes négoces : tu peux quand même le mettre en achat groupé.");
  await page.getByRole("region", { name: "Achats groupés" }).getByRole("link", { name: "Ajouter aux achats groupés" }).click();
  await expect(page.getByRole("heading", { name: "Quels articles grouper ?" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Articles qui ne peuvent pas être groupés" })).toHaveCount(0);
  await expect(page.getByText("Déjà envoyé à tes négoces", { exact: true })).toBeVisible();
  const caseArticle = page.getByRole("checkbox");
  await expect(caseArticle).toHaveCount(1);
  // La question, mot pour mot ; « Non » : rien n'est coché.
  await caseArticle.click();
  const question = page.getByRole("alertdialog", { name: "Déjà envoyé à tes négoces" });
  await expect(question).toContainText("Déjà envoyé à tes négoces. Tu veux quand même le mettre en achat groupé ?");
  await capture(page, "22-deja-envoye-question");
  await question.getByRole("button", { name: "Non", exact: true }).click();
  await expect(question).toHaveCount(0);
  await expect(caseArticle).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Choisis des articles" })).toBeDisabled();
  // Sans le « oui », le serveur refuse et pose la même question, quoi qu'envoie l'écran.
  const corps = { type: "ardoise", attributs: { format: "32x22", origine: "espagne", choix: "1", epaisseur: "5" }, quantite: 10, unite: "palette", parUnite: 480, conversionConfirmee: true, reception: "livraison", lieu: `3 rue des Ajoncs, ${zone().cp} ${zone().ville}`, dateBesoin: jourDans(40), projectId: q.body.projetId, articleKey: (await apiJson<{ lignes: { key: string }[] }>(page, "GET", `/v1/ag/projects/${q.body.projetId}/lignes`)).body.lignes[0]!.key };
  const refus = await apiJson<{ error: { details?: { reason?: string; message?: string; aConfirmer?: boolean; verification?: unknown } } }>(page, "POST", "/v1/ag/besoins", { confirmation: true, cleIdempotence: unique(), besoins: [corps] });
  expect(refus.status).toBeGreaterThanOrEqual(400);
  // « Oui » : l'article est coché, puis le parcours habituel jusqu'à la validation.
  await caseArticle.click();
  await question.getByRole("button", { name: "Oui", exact: true }).click();
  await expect(caseArticle).toBeChecked();
  await page.getByRole("button", { name: "Continuer avec 1 article" }).click();
  await expect(page.getByRole("heading", { name: "Vérifie et valide" })).toBeVisible();
  await page.getByText("Livraison sur chantier").click();
  await page.getByLabel("Lieu de livraison (privé)").fill(`3 rue des Ajoncs, ${zone().cp} ${zone().ville}`);
  await page.getByLabel("J'ai besoin de ces matériaux avant le").fill(jourDans(40));
  await page.getByRole("button", { name: /^Confirmer \d+ pièces par palette$/ }).click();
  await page.getByText("Ton entreprise").waitFor();
  await page.getByText("Dirigeant", { exact: true }).click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("checkbox", { name: /Je confirme/ }).check();
  await page.getByRole("button", { name: "Publier mon besoin", exact: true }).click();
  await expect(page).toHaveURL(/\/achats-groupes\?ajoutes=1$/);
  // La ligne reste dans sa demande individuelle (toujours envoyée), et elle est dans le besoin groupé.
  const apres = (await apiJson<{ lignes: { texte: string }[] }>(page, "GET", `/v1/ag/projects/${q.body.projetId}/lignes`)).body.lignes;
  expect(apres[0]!.texte).toBe("Déjà dans un achat groupé");
  await page.goto(`/chantiers/${q.body.projetId}`);
  await expect(page.getByText(negoceNom).first()).toBeVisible();
});
