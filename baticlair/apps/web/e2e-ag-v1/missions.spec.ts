import { expect, test, type Browser, type Page } from "@playwright/test";
import { confirmerEmail } from "../e2e/confirmer-email";

/**
 * MISSIONS ENTRE ENTREPRISES, « MESSAGES ET RÉPONSES », CLOCHE, COMPTE (Greg, 10 novembre 2026, prompt maître et captures
 * MOBIIZ-PREMIUM). Le parcours complet à TROIS entreprises, sur iPhone SE, Android et ordinateur, sans débordement
 * horizontal : A publie une mission ; B y répond en partageant un document de son dossier ; A reçoit l'alerte, lit le
 * profil, ouvre la conversation ; messages, non-lus, pièce jointe, échange des coordonnées après l'accord des deux ; C, une
 * troisième entreprise, ne voit rien de leur conversation ; C propose ses services, A le contacte. Puis le menu du compte,
 * « Profil et paramètres », les notifications et l'apparence.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const CAPTURES = process.env.AG_CAPTURES ?? "test-results/ag-v1";
const jourDans = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const PDF = Buffer.concat([Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n"), Buffer.alloc(300, 0x20), Buffer.from("\n%%EOF")]);

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
  await page.waitForTimeout(200);
  const deborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(deborde, `débordement horizontal sur « ${nom} »`).toBeLessThanOrEqual(0);
  await page.screenshot({ path: `${CAPTURES}/${test.info().project.name}/m-${nom}.png`, fullPage: true });
}

async function inscrire(page: Page, prenom: string, entreprise: string): Promise<{ email: string; nom: string }> {
  const email = `artisan-${unique()}@example.fr`;
  const nom = `${entreprise} ${unique().slice(-5)}`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill(`${prenom} Martin`);
  await page.getByLabel("Nom de ton entreprise").fill(nom);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`^Bonjour ${prenom}`) }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  expect((await apiJson(page, "PATCH", "/v1/company/profile", { address: "3 rue des Ajoncs, 22300 Lannion", siret: "73282932000074", phone: "06 12 34 56 78", email: null })).status).toBe(200);
  expect((await apiJson(page, "POST", "/v1/groupe/siret")).status).toBe(200);
  await confirmerEmail(page, email);
  return { email, nom };
}

async function nouvelArtisan(browser: Browser, prenom: string, entreprise: string) {
  const ctx = await browser.newContext({ ...(test.info().project.use as object) });
  const page = await ctx.newPage();
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  return { ctx, page, ...(await inscrire(page, prenom, entreprise)) };
}

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
});

test("missions : publier, répondre avec un document, alerte, conversation, non-lus, pièce jointe, coordonnées après accord mutuel ; une troisième entreprise ne voit rien", async ({ page, browser }) => {
  test.setTimeout(300_000);
  const a = await inscrire(page, "Greg", "Toitures Martin");
  const ville = `Plouha${unique().slice(-4)}`;

  // ACCUEIL (capture 01) : trois activités, « À faire » ; le menu a quatre entrées.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bonjour Greg" })).toBeVisible();
  await expect(page.getByText("Que veux-tu faire ?")).toBeVisible();
  for (const carte of [/^Créer un quantitatif/, /^Voir les achats groupés/, /^Missions entre entreprises/]) await expect(page.getByRole("main").getByRole("link", { name: carte })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  for (const onglet of ["Accueil", "Quantitatifs", "Achats groupés", "Missions"]) await expect(nav.getByRole("link", { name: onglet, exact: true })).toBeVisible();
  await capture(page, "01-accueil");

  // MISSIONS (capture 06), puis « Je propose une mission » (captures 07, 13, 49, aperçu).
  await nav.getByRole("link", { name: "Missions", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Missions", exact: true })).toBeVisible();
  await expect(page.getByText("Mise en relation entre entreprises du bâtiment.")).toBeVisible();
  await capture(page, "06-missions");
  await page.getByRole("link", { name: /^Je propose une mission/ }).click();
  await expect(page.getByRole("heading", { name: "De quelle aide as-tu besoin ?" })).toBeVisible();
  // Rien de rempli : chaque manque est dit sous son champ, rien n'est publié.
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByText("Choisis le métier recherché.")).toBeVisible();
  await expect(page.getByText("Choisis le type de mission.")).toBeVisible();
  await page.getByLabel("Métier recherché").fill("Couverture - Toiture");
  await page.getByLabel("Lieu de la mission (commune)").fill(ville);
  await page.getByLabel("Code postal").fill("22580");
  await page.getByLabel("Du", { exact: true }).fill(jourDans(10));
  await page.getByLabel("Au", { exact: true }).fill(jourDans(12));
  await page.getByRole("button", { name: "Sous-traitance" }).click();
  await page.getByRole("button", { name: "Renfort ponctuel" }).click();
  await page.getByLabel("Description").fill("Pose d'ardoises naturelles sur une maison individuelle. Équipe autonome recherchée pendant trois jours.");
  await capture(page, "07-proposer-mission");
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { name: "Précise le profil attendu" })).toBeVisible();
  await page.getByLabel("Niveau souhaité").selectOption("autonome");
  await page.getByLabel("Expérience souhaitée").selectOption("3");
  await page.getByRole("button", { name: "Travail en hauteur" }).click();
  await page.getByLabel("Équipe recherchée").selectOption("1-2");
  await page.getByLabel("Contexte donné par ton entreprise").fill("Matériaux déjà sur place. Échafaudage fourni.");
  await page.getByLabel("+ Ajouter plans ou photos du chantier").setInputFiles({ name: "plans-plouha.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(page.getByRole("list", { name: "Fichiers choisis" })).toContainText("plans-plouha.pdf");
  await capture(page, "13-profil-recherche");
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { name: "Informations proposées" })).toBeVisible();
  await page.getByLabel("Mode de chiffrage proposé").selectOption("jour");
  await page.getByLabel(/^Budget indicatif, de/).fill("400");
  await page.getByLabel("à (€ HT)").fill("500");
  await page.getByLabel("Frais de déplacement").selectOption("a-convenir");
  await expect(page.getByText("Mobiiz ne contractualise pas la mission.")).toBeVisible();
  await capture(page, "49-conditions-mission");
  await page.getByRole("button", { name: "Continuer vers l'aperçu" }).click();
  await expect(page.getByRole("heading", { name: "Aperçu de ta mission" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Aperçu" })).toContainText("400 à 500 € HT / jour");
  await page.getByRole("button", { name: "Publier ma mission" }).click();
  await expect(page).toHaveURL(/\/missions\/[0-9a-f-]{36}$/);
  const missionId = page.url().split("/").pop()!;
  await expect(page.getByRole("heading", { name: `Couverture - Toiture à ${ville}` })).toBeVisible();
  await expect(page.getByRole("region", { name: "Plans et photos" })).toContainText("plans-plouha.pdf");
  await expect(page.getByText("0 consultation")).toBeVisible();
  await capture(page, "09-ma-mission");

  // B : son dossier professionnel (capture 24), puis la mission (09), sa réponse (14, 51) et « Réponse envoyée » (45).
  const b = await nouvelArtisan(browser, "Bruno", "Armor Littoral");
  await b.page.goto("/compte/documents");
  await expect(b.page.getByRole("heading", { name: "Ton dossier professionnel" })).toBeVisible();
  await b.page.getByLabel("Ajouter : cv ou dossier professionnel").setInputFiles({ name: "CV-couvreur.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(b.page.getByRole("list", { name: "Documents" }).first()).toContainText("CV-couvreur.pdf");
  // Un fichier dont le contenu n'est pas celui de son format est refusé, et dit pourquoi.
  await b.page.getByLabel("Ajouter : assurances").setInputFiles({ name: "faux.pdf", mimeType: "application/pdf", buffer: Buffer.from("ceci n'est pas un PDF") });
  await expect(b.page.getByRole("alert").filter({ hasText: "Format refusé" })).toBeVisible();
  await capture(b.page, "24-documents-qualifications");
  await b.page.goto("/missions");
  await b.page.getByPlaceholder("Rechercher un métier ou une ville").fill(ville);
  await b.page.getByRole("list", { name: "Annonces près de toi" }).getByRole("link", { name: new RegExp(ville) }).click();
  await expect(b.page.getByRole("heading", { name: `Couverture - Toiture à ${ville}` })).toBeVisible();
  // Ce que B voit de A : son nom, « vérifiée », son secteur. Jamais ses coordonnées.
  await expect(b.page.getByText(a.nom)).toBeVisible();
  await expect(b.page.getByText("06 12 34 56 78")).toHaveCount(0);
  await expect(b.page.getByText("Elles restent indicatives jusqu'à votre accord.")).toBeVisible();
  await capture(b.page, "09-detail-mission");
  await b.page.getByRole("link", { name: "Contacter cette entreprise" }).click();
  await expect(b.page.getByRole("heading", { name: "Ton profil pour cette mission" })).toBeVisible();
  await b.page.getByRole("button", { name: "Continuer" }).click();
  await expect(b.page.getByText("Indique ton niveau sur cette mission.")).toBeVisible();
  await b.page.getByLabel(/^Ton niveau sur cette mission/).selectOption("confirme");
  await b.page.getByLabel("Expérience correspondante (années)").fill("8");
  await b.page.getByLabel("Équipe disponible (personnes)").fill("2");
  await b.page.getByRole("checkbox", { name: /CV-couvreur\.pdf/ }).check();
  await capture(b.page, "14-repondre-mission");
  await b.page.getByRole("button", { name: "Continuer" }).click();
  await expect(b.page.getByRole("heading", { name: "Conditions pour cette mission" })).toBeVisible();
  await b.page.getByLabel("Tarif proposé (€ HT / jour)").fill("420");
  await b.page.getByLabel("Jours disponibles").fill("Les trois jours");
  await b.page.getByLabel("Déplacement").selectOption("inclus");
  await b.page.getByLabel("Message à l'entreprise").fill("Équipe autonome, disponible les trois jours.");
  await expect(b.page.getByText("Aucun contrat n'est créé par Mobiiz.")).toBeVisible();
  await capture(b.page, "51-proposition-mission");
  await b.page.getByRole("button", { name: "Envoyer ma proposition" }).click();
  await expect(b.page.getByRole("heading", { name: "Réponse envoyée" })).toBeVisible();
  await expect(b.page.getByText("Tes coordonnées restent privées.")).toBeVisible();
  await capture(b.page, "45-reponse-envoyee");

  // A : la cloche (26) porte une alerte courte ; elle mène aux réponses (15), au profil (16), à la conversation (12).
  await page.goto("/");
  await page.getByRole("link", { name: /^Notifications : \d+/ }).click();
  await expect(page.getByRole("heading", { name: "À ne pas manquer" })).toBeVisible();
  const alerte = page.getByRole("list", { name: "Notifications" }).getByRole("link", { name: /Nouvelle réponse à ta mission/ });
  await expect(alerte).toContainText(b.nom);
  await expect(alerte).not.toContainText("Équipe autonome"); // jamais le texte de la réponse dans la cloche
  await capture(page, "26-centre-notifications");
  await alerte.click();
  await expect(page.getByRole("heading", { name: "1 entreprise a répondu" })).toBeVisible();
  await capture(page, "15-reponses-recues");
  await page.getByRole("list", { name: "Réponses reçues" }).getByRole("link").first().click();
  await expect(page.getByRole("heading", { name: "Profil pour la mission" })).toBeVisible();
  await expect(page.getByText("Informations déclarées par l'entreprise.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Documents partagés" })).toContainText("CV-couvreur.pdf");
  await expect(page.getByRole("region", { name: "Proposition indicative" })).toContainText("420 € HT / jour / personne");
  await capture(page, "16-profil-entreprise");
  // Le document partagé s'ouvre dans l'afficheur de l'application (lien privé et temporaire).
  await page.getByRole("region", { name: "Documents partagés" }).getByRole("button", { name: /CV-couvreur\.pdf/ }).click();
  await expect(page.getByRole("button", { name: "Fermer" })).toBeVisible();
  await page.getByRole("button", { name: "Fermer" }).click();
  await page.getByRole("button", { name: "Démarrer une conversation" }).click();
  await expect(page).toHaveURL(/\/messages\/[0-9a-f-]{36}$/);
  const convId = page.url().split("/").pop()!;
  await expect(page.getByText("Coordonnées privées", { exact: true })).toBeVisible();
  await page.getByLabel("Écrire un message").fill("Bonjour, la mission est toujours disponible. Appelez-moi au 06 12 34 56 78.");
  await page.getByRole("button", { name: "Envoyer le message" }).click();
  await expect(page.getByRole("list", { name: "Messages" }).getByRole("listitem")).toHaveCount(1);
  await expect(page.getByLabel("Écrire un message")).toHaveValue("");

  // B : la boîte « Messages et réponses » (22), non lu, filtres ; la conversation (12) ; le numéro est masqué.
  await b.page.goto("/messages");
  await expect(b.page.getByRole("heading", { name: "Tout retrouver au même endroit" })).toBeVisible();
  const filtres = b.page.getByRole("group", { name: "Filtrer la boîte" });
  for (const f of ["Tous", "Missions", "Négoces", "Non lus"]) await expect(filtres.getByRole("button", { name: f, exact: true })).toBeVisible();
  const element = b.page.getByRole("link", { name: new RegExp(`^Mission, ${a.nom}, non lu`) });
  await expect(element).toBeVisible();
  await capture(b.page, "22-messages-et-reponses");
  await filtres.getByRole("button", { name: "Négoces", exact: true }).click();
  await expect(b.page.getByText("Aucune réponse de négoce")).toBeVisible();
  await filtres.getByRole("button", { name: "Non lus", exact: true }).click();
  await element.click();
  await expect(b.page.getByRole("list", { name: "Messages" })).toContainText("coordonnées masquées");
  await expect(b.page.getByRole("list", { name: "Messages" })).not.toContainText("06 12 34 56 78");
  await b.page.getByLabel("Écrire un message").fill("Bonjour. Nous sommes disponibles. Peut-on échanger sur le chantier ?");
  await b.page.getByRole("button", { name: "Envoyer le message" }).click();
  await expect(b.page.getByRole("list", { name: "Messages" }).getByRole("listitem")).toHaveCount(2);
  // Pièce jointe : refusée si le format ne convient pas, envoyée sinon.
  await b.page.getByLabel(/^Joindre un fichier/).setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("notes") });
  await expect(b.page.getByRole("alert").filter({ hasText: "Format refusé" })).toBeVisible();
  await b.page.getByLabel(/^Joindre un fichier/).setInputFiles({ name: "references.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(b.page.getByRole("list", { name: "Messages" }).getByRole("button", { name: /references\.pdf/ })).toBeVisible();
  await capture(b.page, "12-conversation");
  // Lue : plus de pastille « non lu » dans la boîte de B.
  await b.page.goto("/messages");
  await expect(b.page.getByRole("link", { name: new RegExp(`^Mission, ${a.nom}$`) })).toBeVisible();

  // ÉCHANGE DES COORDONNÉES (46) : B propose, rien n'est montré ; A accepte, les deux les voient.
  await b.page.goto(`/messages/${convId}`);
  await b.page.getByRole("button", { name: "Proposer l'échange des coordonnées" }).click();
  await expect(b.page.getByRole("heading", { name: "Partager vos coordonnées ?" })).toBeVisible();
  await expect(b.page.getByRole("button", { name: "Proposer le partage" })).toBeDisabled();
  await b.page.getByRole("checkbox", { name: /J'accepte de partager mes coordonnées/ }).check();
  await capture(b.page, "46-partage-coordonnees");
  await b.page.getByRole("button", { name: "Proposer le partage" }).click();
  await expect(b.page.getByText("En attente de l'accord de l'autre entreprise.")).toBeVisible();
  await expect(b.page.getByRole("region", { name: "Coordonnées partagées" })).toHaveCount(0);
  await page.goto(`/messages/${convId}`);
  await expect(page.getByText(`${b.nom} propose d'échanger vos coordonnées`)).toBeVisible();
  await expect(page.getByRole("list", { name: "Messages" }).getByRole("button", { name: /references\.pdf/ })).toBeVisible();
  await page.getByRole("button", { name: "Répondre à la proposition d'échange" }).click();
  await page.getByRole("checkbox", { name: /J'accepte de partager mes coordonnées/ }).check();
  await page.getByRole("button", { name: "Accepter le partage" }).click();
  await expect(page.getByRole("region", { name: "Coordonnées partagées" })).toContainText("06 12 34 56 78");
  await capture(page, "12-coordonnees-partagees");
  await b.page.reload();
  await expect(b.page.getByRole("region", { name: "Coordonnées partagées" })).toContainText(a.nom);
  await expect(b.page.getByRole("list", { name: "Messages" })).toContainText("06 12 34 56 78");

  // C, UNE TROISIÈME ENTREPRISE : rien de la conversation, ni de la réponse, ni des réponses reçues.
  const c = await nouvelArtisan(browser, "Chloé", "Couverture Bretagne");
  await c.page.goto(`/messages/${convId}`);
  await expect(c.page.getByRole("main").getByRole("alert").filter({ hasText: "Introuvable" })).toBeVisible();
  await c.page.goto(`/missions/${missionId}/reponses`);
  await expect(c.page.getByRole("main").getByRole("alert").filter({ hasText: "Introuvable" })).toBeVisible();
  expect((await apiJson(c.page, "GET", `/v1/missions/conversations/${convId}`)).status).toBe(404);
  expect((await apiJson(c.page, "POST", `/v1/missions/conversations/${convId}/messages`, { texte: "Je m'invite", cle: "cle-e2e-intrus-0001" })).status).toBe(404);
  await c.page.goto("/messages");
  await expect(c.page.getByRole("heading", { name: "Aucun message pour le moment" })).toBeVisible();
  await capture(c.page, "47-boite-vide");

  // C PROPOSE SES SERVICES (08, 50) ; A le contacte depuis « Entreprises dispo » (10).
  await c.page.goto("/missions/services");
  await expect(c.page.getByRole("heading", { name: "Quand peux-tu intervenir ?" })).toBeVisible();
  await c.page.getByLabel("Métier principal").fill("Zinguerie");
  await c.page.getByLabel("Zone d'intervention, autour de").fill(ville);
  await c.page.getByLabel("Code postal").fill("22300");
  await c.page.getByLabel("Disponible à partir du").fill(jourDans(5));
  await c.page.getByRole("button", { name: "Renfort ponctuel" }).click();
  await c.page.getByLabel("Présentation").fill("Équipe de 2 personnes disponible pour zinguerie et travaux de couverture.");
  await capture(c.page, "08-proposer-services");
  await c.page.getByRole("button", { name: "Continuer" }).click();
  await expect(c.page.getByRole("heading", { name: "Donne un repère clair" })).toBeVisible();
  await c.page.getByLabel("Tarif journalier indicatif (€ HT / jour)").fill("420");
  await expect(c.page.getByText("420 € HT / jour / personne")).toBeVisible();
  await expect(c.page.getByText("Il ne constitue ni un devis ni un engagement.")).toBeVisible();
  await capture(c.page, "50-disponibilite-tarif");
  await c.page.getByRole("button", { name: "Publier ma disponibilité" }).click();
  await expect(c.page).toHaveURL(/\/missions\/[0-9a-f-]{36}$/);
  await page.goto("/missions");
  await page.getByRole("group", { name: "Type d'annonces" }).getByRole("button", { name: "Entreprises dispo" }).click();
  await page.getByPlaceholder("Rechercher un métier ou une ville").fill(ville);
  await page.getByRole("list", { name: "Annonces près de toi" }).getByRole("link", { name: new RegExp(`Zinguerie disponible.*${ville}`) }).click();
  await expect(page.getByRole("region", { name: "Tarif indicatif" })).toContainText("420 € HT / jour / personne");
  await expect(page.getByText("Coordonnées privées avant accord mutuel.")).toBeVisible();
  await capture(page, "10-entreprise-disponible");
  await page.getByRole("button", { name: "Contacter cette entreprise" }).click();
  await expect(page).toHaveURL(/\/messages\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Aucun message pour l'instant. Écris le premier.")).toBeVisible();

  // « MES MISSIONS » (43) : A voit sa mission et sa réponse reçue ; il suspend puis ferme l'annonce.
  await page.goto("/missions/mes-missions");
  await expect(page.getByRole("heading", { name: "Tes annonces et réponses" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Mes missions" }).getByRole("link", { name: new RegExp(ville) })).toContainText("1 réponse");
  await capture(page, "43-mes-missions");
  await page.getByRole("list", { name: "Mes missions" }).getByRole("link", { name: new RegExp(ville) }).click();
  await page.getByRole("button", { name: "Suspendre l'annonce" }).click();
  await expect(page.getByRole("button", { name: "Republier l'annonce" })).toBeVisible();
  await page.getByRole("button", { name: "Fermer l'annonce" }).click();
  await page.getByRole("button", { name: "Garder ouverte" }).click();
  await expect(page.getByRole("button", { name: "Republier l'annonce" })).toBeVisible();
  await b.ctx.close();
  await c.ctx.close();
});

test("compte : le menu, « Profil et paramètres », notifications par catégorie, apparence automatique, réception des réponses ; l'administration n'apparaît pas pour un artisan", async ({ page }) => {
  test.setTimeout(180_000);
  await inscrire(page, "Greg", "Batiinvest");
  await page.goto("/");
  // LE MENU (capture 17).
  await page.getByRole("button", { name: "Mon menu" }).click();
  const menu = page.getByRole("menu", { name: "Mon menu" });
  for (const ligne of ["Profil et paramètres", "Mon entreprise", "Documents et qualifications", "Mes négoces", "Messages et réponses", "Abonnement, factures et reçus", "Aide, guide et démonstration", "Se déconnecter"]) await expect(menu.getByRole("menuitem", { name: ligne, exact: true })).toBeVisible();
  // Réservé : ni l'administration ni les opportunités commerciales pour un compte qui n'y a pas droit.
  await expect(menu.getByRole("menuitem", { name: /Espace administration/ })).toHaveCount(0);
  await expect(menu.getByRole("menuitem", { name: /Opportunités commerciales/ })).toHaveCount(0);
  for (const url of ["/v1/admin/ag/achats", "/v1/admin/missions/signalements"]) expect((await apiJson(page, "GET", url)).status).toBe(403);
  await capture(page, "17-menu-compte");
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await page.getByRole("button", { name: "Mon menu" }).click();
  await menu.getByRole("menuitem", { name: "Profil et paramètres", exact: true }).click();

  // « PROFIL ET PARAMÈTRES » (captures 18 et 19).
  await expect(page.getByRole("heading", { name: "Profil et paramètres" })).toBeVisible();
  for (const groupe of ["Entreprise", "Préférences", "Compte et services", "Données et aide"]) await expect(page.getByRole("region", { name: groupe, exact: true })).toBeVisible();
  for (const rubrique of ["Mon entreprise", "Profil public et missions", "Documents et qualifications", "Apparence", "Notifications", "Mémoire de Mobiiz", "Compte et sécurité", "Abonnement, factures et reçus", "E-mails Mobiiz et réponses", "Connexions", "Données et confidentialité", "Aide et contact", "Guide et chantier fictif"]) await expect(page.getByRole("region").getByRole("link", { name: new RegExp(`^${rubrique}`) })).toBeVisible();
  await expect(page.getByText("Mobiiz. Plus on est, moins on paie.")).toBeVisible();
  await capture(page, "18-profil-parametres");

  // NOTIFICATIONS (capture 21) : chaque catégorie se règle seule, et le choix est gardé.
  await page.getByRole("region", { name: "Préférences", exact: true }).getByRole("link", { name: /^Notifications/ }).click();
  await expect(page.getByRole("heading", { name: "Reste informé sans être dérangé" })).toBeVisible();
  const missions = page.getByRole("switch", { name: "Missions" });
  await expect(missions).toBeChecked();
  await expect(page.getByRole("switch", { name: "Conseils Mobiiz" })).not.toBeChecked();
  await missions.click();
  await expect(missions).not.toBeChecked();
  await capture(page, "21-notifications");
  await page.reload();
  await expect(page.getByRole("switch", { name: "Missions" })).not.toBeChecked();
  await expect(page.getByRole("switch", { name: "Demandes de prix" })).toBeChecked();

  // RÉCEPTION DES RÉPONSES (capture 25) et PROFIL PUBLIC (44).
  await page.goto("/compte/adresse");
  await expect(page.getByText("Où lire les réponses ?")).toBeVisible();
  await expect(page.getByRole("link", { name: /^Ouvrir « Messages et réponses »/ })).toBeVisible();
  await capture(page, "25-reception-reponses-negoces");
  await page.goto("/compte/profil-public");
  await expect(page.getByText("Non visible", { exact: true })).toBeVisible();
  await page.getByLabel("Présentation publique").fill("Couvreur-zingueur, équipe de 3.");
  await page.getByRole("checkbox", { name: /Rendre mon profil visible/ }).check();
  await page.getByRole("button", { name: "Enregistrer mon profil" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Profil enregistré." })).toBeVisible();
  await expect(page.getByText("Public", { exact: true })).toBeVisible();
  await capture(page, "44-profil-public");

  // APPARENCE (capture 20) : Automatique, Clair, Sombre.
  await page.goto("/compte/apparence");
  await page.getByRole("tab", { name: "Application" }).click();
  const theme = page.getByRole("group", { name: "Apparence de Mobiiz" });
  for (const t of ["Automatique", "Clair", "Sombre"]) await expect(theme.getByRole("button", { name: t, exact: true })).toBeVisible();
  await theme.getByRole("button", { name: "Clair", exact: true }).click();
  await expect(page.locator(".app-clair")).toHaveCount(1);
  await capture(page, "20-apparence-clair");
  await theme.getByRole("button", { name: "Sombre", exact: true }).click();
  await expect(page.locator(".app-nuit")).toHaveCount(1);

  // « GUIDE ET CHANTIER FICTIF » : l'ancien geste du menu est toujours là.
  await page.goto("/compte/guide");
  await expect(page.getByRole("button", { name: "Essayer avec un chantier fictif" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Revoir le guide" })).toBeVisible();
});

test("page publique, missions ouvertes : la section « Missions » à part entière, son entrée de menu, deux parcours, la ligne de confiance, deux vrais écrans ; le bloc compact des offres", async ({ page }, info) => {
  await page.goto("/decouvrir");
  const section = page.getByRole("region", { name: /^Besoin d’une entreprise sur un chantier \? Disponible pour une mission \?/ });
  await expect(section).toBeVisible();
  await expect(section.getByText("Mobiiz met en relation des entreprises du bâtiment. Publie une mission ou indique tes disponibilités, ton secteur et ton tarif journalier indicatif.")).toBeVisible();
  await expect(section.getByRole("heading", { level: 3 })).toHaveText(["Je recherche une entreprise", "Je suis disponible"]);
  await expect(section.getByText("Métier, lieu, dates et conditions indicatives.")).toBeVisible();
  await expect(section.getByText("Secteur, disponibilités, profil professionnel et tarif HT/jour indicatif.")).toBeVisible();
  await expect(section.getByText("Les échanges restent liés à une mission. Les coordonnées ne sont partagées qu’après l’accord des deux entreprises.")).toBeVisible();
  await expect(section.getByRole("link", { name: "Découvrir les missions" })).toHaveAttribute("href", "/inscription");
  // Deux vrais écrans de l'app, chargés, dans le cadre sans marque ; l'exemple est dit.
  const ecrans = section.locator(".mz2-tel img");
  await expect(ecrans).toHaveCount(2);
  for (const [i, nom] of ["ecran-disponible", "ecran-missions"].entries()) {
    const img = ecrans.nth(i);
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveAttribute("src", `/landing/v3/${nom}.webp`);
    await expect.poll(() => img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth >= e.getBoundingClientRect().width)).toBe(true);
  }
  await expect(section.getByText("Exemple", { exact: true })).toHaveCount(1);
  // Jamais de l'intérim, du recrutement ni une garantie ; plus les tournures familières de la première version.
  expect(await section.innerText()).not.toMatch(/intérim|recrut|salari|garanti|déborde|propose le tien|arrangez/i);
  // Séparée des achats groupés, à sa place dans la page et dans le menu.
  const ordre = await Promise.all(["Comment ça marche ?", /^Achète en collectif/, /^Besoin d’une entreprise/, /^Un même matériau/, "Commence gratuitement", /^Le prochain bon prix/].map(async (t) => (await page.getByRole("heading", { name: t }).boundingBox())!.y));
  expect([...ordre].sort((x, y) => x - y)).toEqual(ordre);
  await expect(page.locator("#collectif").getByText(/mission/i)).toHaveCount(0);
  await expect(page.locator(".nav-links a")).toHaveText(["Comment ça marche", "Achats groupés", "Missions", "Tarifs", "Questions", "Se connecter"]);
  await expect(page.locator(".nav-links a", { hasText: "Missions" })).toHaveAttribute("href", "#missions");
  // Le bloc compact : sans prix, un seul bouton, la ligne « Missions » puisqu'elles sont ouvertes.
  const offre = page.getByRole("region", { name: "Commence gratuitement" });
  await expect(offre.getByText("Missions entre entreprises", { exact: true })).toBeVisible();
  await expect(offre.getByRole("link")).toHaveCount(1);
  await expect(offre.getByRole("link", { name: "Voir les offres et les tarifs" })).toHaveAttribute("href", "/tarifs");
  await expect(page.getByRole("region", { name: "Tu te poses des questions ?" }).locator("summary", { hasText: "Les missions entre entreprises, c’est quoi ?" })).toHaveCount(1);
  await expect(page.getByText(/€ HT (par|\/) (mois|an)/)).toHaveCount(0);
  expect(await page.locator("main").innerText()).not.toMatch(/\b(IA|automatiques?|automatisée?s?|précise?s?|exacte?s?)\b/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await section.scrollIntoViewIfNeeded();
  // Captures de section : l'en-tête collant et la barre du bas passeraient devant le bloc photographié.
  const sansBarres = await page.addStyleTag({ content: ".mzp .site-header{position:static!important}.mzp .sticky-cta{display:none!important}" });
  await page.locator(".mz2-hero").screenshot({ path: `${CAPTURES}/${info.project.name}/landing-ouverture.png` });
  await page.locator("#pourquoi").screenshot({ path: `${CAPTURES}/${info.project.name}/landing-pourquoi.png` });
  await page.locator("#missions").screenshot({ path: `${CAPTURES}/${info.project.name}/landing-section-missions.png` });
  await page.locator("#offres").screenshot({ path: `${CAPTURES}/${info.project.name}/landing-bloc-offres.png` });
  await page.evaluate(() => window.scrollTo(0, 0));
  await sansBarres.evaluate((e) => (e as HTMLElement).remove());
  await page.screenshot({ path: `${CAPTURES}/${info.project.name}/landing-entier.png`, fullPage: true });
});

test("guide d'accueil, missions ouvertes : trois écrans, un par usage (négoces, collectif, missions), « Accéder à Mobiiz »", async ({ page }, info) => {
  // Ici, le guide se regarde : les autres parcours le passent d'office.
  await page.removeLocatorHandler(page.getByRole("dialog", { name: "Guide" }));
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Greg Martin");
  await page.getByLabel("Nom de ton entreprise").fill(`Toitures ${unique()}`);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(`guide-${unique()}@example.fr`);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  const guide = page.getByRole("dialog", { name: "Guide" });
  const ecrans: [string, RegExp][] = [
    ["Compare tes négoces", /Prépare ton quantitatif, consulte jusqu'à 5 négoces et retrouve leurs réponses dans Mobiiz\./],
    ["Achète en collectif", /Ajoute les matériaux concernés aux achats groupés de ton métier et de ton secteur\./],
    ["Publie ou trouve une mission", /Recherche une entreprise ou indique tes disponibilités et ton tarif indicatif\./],
  ];
  for (const [i, [titre, texte]] of ecrans.entries()) {
    await expect(guide.getByRole("heading", { name: titre, exact: true })).toBeVisible();
    await expect(guide.getByText(texte)).toBeVisible();
    await expect(guide.getByText(`${i + 1} sur 3`)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `${CAPTURES}/${info.project.name}/guide-${i + 1}.png` });
    if (i < 2) await guide.getByRole("button", { name: "Suivant" }).click();
  }
  await guide.getByRole("link", { name: "Accéder à Mobiiz" }).click();
  await expect(guide).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Missions" })).toBeVisible();
});
