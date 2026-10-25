import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * RECENTRAGE (Greg, 25 octobre 2026) : la demande perso, « Mes prix », les regroupements, gratuit et payant. Les quinze
 * cas de la spécification, dans un vrai navigateur, contre la vraie API.
 *
 * Chaque cas a sa zone (département), différente sur téléphone et sur ordinateur : les regroupements d'une zone ne se
 * mélangent jamais d'un cas à l'autre, ni d'un appareil à l'autre. Paris (75) n'est pas une zone active (`ZONES_ACTIVES`
 * des parcours) : il sert au cas « hors zone ». Les prix repères sont des valeurs de TEST (`PRIX_REPERES`).
 */

const SECRET = "Bearer e2e-secret-de-la-tache";
const ARDOISE = "Ardoise naturelle 32×22 Espagne 1er choix";
const ARDOISE_3020 = "Ardoise naturelle 30×20 Espagne 1er choix";
const LITEAU = "Liteau sapin traité 27×38";
const CROCHET = "Crochet inox 100 mm";

/** Une ville par département, deux par cas (téléphone, ordinateur). */
const VILLES: Record<string, string> = {
  "14": "14000 Caen",
  "16": "16000 Angoulême",
  "17": "17000 La Rochelle",
  "18": "18000 Bourges",
  "19": "19000 Tulle",
  "23": "23000 Guéret",
  "24": "24000 Périgueux",
  "27": "27000 Évreux",
  "28": "28000 Chartres",
  "33": "33000 Bordeaux",
  "36": "36000 Châteauroux",
  "37": "37000 Tours",
  "40": "40000 Mont-de-Marsan",
  "41": "41000 Blois",
  "45": "45000 Orléans",
  "49": "49000 Angers",
  "61": "61000 Alençon",
  "72": "72000 Le Mans",
  "76": "76000 Rouen",
  "79": "79000 Niort",
  "86": "86000 Poitiers",
  "87": "87000 Limoges",
};
const CAS: Record<string, [string, string]> = {
  gratuit: ["14", "61"],
  cinq: ["16", "17"],
  relance: ["18", "19"],
  mesPrix: ["23", "24"],
  nonGroupable: ["27", "28"],
  references: ["33", "36"],
  rejoindre: ["37", "40"],
  lancement: ["41", "45"],
  volume: ["49", "72"],
  consultation: ["76", "79"],
  validite: ["86", "87"],
  anonymat: ["27", "28"],
  preavis: ["16", "17"],
};

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function zoneDuCas(cas: keyof typeof CAS, projet: string): string {
  return CAS[cas]![projet === "telephone" ? 0 : 1]!;
}
const adresse = (zone: string, n = 3) => `${n} rue de la Gare, ${VILLES[zone] ?? "75011 Paris"}`;

async function passeGuide(page: Page): Promise<void> {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
}
test.beforeEach(async ({ page }) => {
  await passeGuide(page);
});

async function apiJson<T = unknown>(page: Page, method: string, url: string, body?: unknown, auth?: string): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ({ method, url, body, auth }) => {
      const companyId = localStorage.getItem("baticlair.companyId");
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json", accept: "application/json", ...(companyId ? { "x-company-id": companyId } : {}), ...(auth ? { authorization: auth } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: res.status, body: (await res.json().catch(() => null)) as T };
    },
    { method, url, body, auth },
  );
}

async function emailsVers(page: Page, to: string): Promise<{ subject: string; text: string }[]> {
  return (await apiJson<{ emails: { subject: string; text: string }[] }>(page, "GET", `/v1/internal/test/emails?to=${encodeURIComponent(to)}`, undefined, SECRET)).body.emails;
}
const jetonDe = (texte: string) => /\/chiffrer\/([A-Za-z0-9_-]+)/.exec(texte)![1]!;

/** Un couvreur inscrit dans la zone, SIRET vérifié, avec une liste (un chantier) à cette adresse. Rend l'id du chantier. */
async function couvreur(page: Page, zone: string, lignes: { libelle: string; quantite: string; unite: string }[], entreprise = `Toitures ${unique()}`): Promise<{ email: string; projectId: string }> {
  const email = `artisan-${unique()}@example.fr`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Jean Martin");
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("heading", { name: /^Bonjour Jean/ }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  expect((await apiJson(page, "PATCH", "/v1/company/profile", { name: entreprise, address: adresse(zone), siret: "73282932000074", phone: null, email: null })).status).toBe(200);
  expect((await apiJson(page, "POST", "/v1/groupe/siret")).status).toBe(200);
  const q = await apiJson<{ projetId: string }>(page, "POST", "/v1/quantitatifs", { lignes });
  expect(q.status).toBe(201);
  expect((await apiJson(page, "PATCH", `/v1/projects/${q.body.projetId}`, { address: adresse(zone, 8) })).status).toBe(200);
  return { email, projectId: q.body.projetId };
}

/** Un deuxième artisan dans son propre navigateur. */
async function autreArtisan(browser: Browser, zone: string, lignes: { libelle: string; quantite: string; unite: string }[]) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await passeGuide(page);
  const a = await couvreur(page, zone, lignes);
  return { ...a, page, fermer: () => ctx.close() };
}

/** Le seuil de la zone franchi il y a longtemps (le gratuit s'applique) ou il y a peu (préavis de 30 jours). */
async function seuilFranchi(page: Page, zone: string, le: Date | null) {
  expect((await apiJson(page, "POST", "/v1/internal/test/zone", { zone, franchiLe: le?.toISOString() ?? null }, SECRET)).status).toBe(200);
}
async function finEssai(page: Page, email: string) {
  expect((await apiJson<{ fait: boolean }>(page, "POST", "/v1/internal/test/fin-essai", { email }, SECRET)).body).toEqual({ fait: true });
}
const ilYaLongtemps = () => new Date(Date.now() - 120 * 86_400_000);

type Lignes = { cycles: { cle: string; clotureLe: string }[]; lignes: { key: string; designation: string; groupable: boolean; raison: string | null }[] };
async function tenter(page: Page, projectId: string, designations: string[], cycle = 0) {
  const l = (await apiJson<Lignes>(page, "GET", `/v1/projects/${projectId}/regroupements/lignes`)).body;
  const articles = l.lignes.filter((x) => designations.some((d) => x.designation.startsWith(d))).map((x) => x.key);
  return apiJson<{ ajoutees: { key: string; regroupementId: string }[]; refusees: { designation: string; raison: string }[] }>(page, "POST", `/v1/projects/${projectId}/regroupements`, { articles, mois: l.cycles[cycle]!.cle });
}

test.describe("Recentrage du 25 octobre 2026", () => {
  test.setTimeout(180_000);

  test("1. gratuit : la demande part chez un seul négoce ; au deuxième, le paywall", async ({ page }, info) => {
    const zone = zoneDuCas("gratuit", info.project.name);
    const a = await couvreur(page, zone, [
      { libelle: ARDOISE, quantite: "1000", unite: "pièces" },
      { libelle: LITEAU, quantite: "100", unite: "m" },
    ]);
    await seuilFranchi(page, zone, ilYaLongtemps());
    await finEssai(page, a.email);
    expect((await apiJson<{ formule: string }>(page, "GET", "/v1/droits")).body).toMatchObject({ formule: "gratuit", negocesParDemande: 1, regroupements: false });

    await page.goto(`/chantiers/${a.projectId}`);
    await page.getByRole("button", { name: "Envoyer à mes négoces" }).click();
    const form = page.getByRole("region", { name: "Envoyer à mes négoces" }).or(page.getByLabel("Envoyer à mes négoces")).first();
    await expect(form.getByText("Ton négoce (un seul en gratuit)")).toBeVisible();
    await form.getByLabel("Nom du négoce").fill("Négoce Gratuit");
    await form.getByLabel("E-mail").fill(`gratuit-${unique()}@negoce.example.com`);
    await form.getByRole("button", { name: "Ajouter ce négoce" }).click();
    await form.getByRole("checkbox", { name: /J'accepte que mon nom/ }).check();
    await form.getByRole("button", { name: "Envoyer", exact: true }).click();
    await expect(page.getByRole("list", { name: "Négoces sollicités" }).getByText("Négoce Gratuit · Envoyée")).toBeVisible();

    // Le deuxième négoce dans la même demande : refusé, avec la phrase de l'abonnement.
    const deux = await apiJson<{ error: { code: string; details: { refus: string; phrase: string } } }>(page, "POST", `/v1/projects/${a.projectId}/demandes-perso`, {
      but: "chiffrer",
      accord: true,
      negoces: [
        { nom: "N1", email: `n1-${unique()}@negoce.example.com` },
        { nom: "N2", email: `n2-${unique()}@negoce.example.com` },
      ],
    });
    expect(deux.status).toBe(402);
    expect(deux.body.error.details.refus).toBe("negoces");
    expect(deux.body.error.details.phrase).toMatch(/abonne/i);
  });

  test("2. payant : cinq négoces, chiffrage en ligne sans compte, comparaison livraison comprise, commande, confirmation, livrée", async ({ page, browser }, info) => {
    const zone = zoneDuCas("cinq", info.project.name);
    const a = await couvreur(page, zone, [
      { libelle: ARDOISE, quantite: "1000", unite: "pièces" },
      { libelle: LITEAU, quantite: "100", unite: "m" },
    ]);
    const tag = unique();
    const negoces = ["A", "B", "C", "D", "E"].map((x) => ({ nom: `Négoce ${x}`, email: `${x.toLowerCase()}-${tag}@negoce.example.com` }));
    await page.goto(`/chantiers/${a.projectId}`);
    await page.getByRole("button", { name: "Envoyer à mes négoces" }).click();
    const form = page.getByLabel("Envoyer à mes négoces");
    await expect(form.getByText("Tes négoces (jusqu'à 5)")).toBeVisible();
    for (const n of negoces) {
      await form.getByLabel("Nom du négoce").fill(n.nom);
      await form.getByLabel("E-mail").fill(n.email);
      await form.getByRole("button", { name: "Ajouter ce négoce" }).click();
    }
    await form.getByRole("radio", { name: "Commander" }).click();
    await form.getByRole("checkbox", { name: /J'accepte que mon nom/ }).check();
    await form.getByRole("button", { name: "Envoyer à 5 négoces" }).click();
    await expect(page.getByRole("list", { name: "Négoces sollicités" }).getByRole("listitem")).toHaveCount(5);

    // Le négoce A chiffre en ligne, sans compte, dans son navigateur : vouvoiement, nom de l'artisan, total livré.
    const mailA = (await emailsVers(page, negoces[0]!.email)).at(-1)!;
    expect(mailA.text).toContain("sans compte");
    const nctx = await browser.newContext();
    const npage = await nctx.newPage();
    await npage.goto(`/chiffrer/${jetonDe(mailA.text)}`);
    await expect(npage.getByRole("heading", { name: "Demande de prix avant commande" })).toBeVisible();
    await npage.getByLabel(`Prix unitaire HT de ${ARDOISE}`).fill("1,10");
    await npage.getByLabel(/^Prix unitaire HT de Liteau/).fill("0,50");
    await npage.getByLabel("Livraison HT (€)").fill("80");
    await npage.getByLabel("Délai (jours)").fill("3");
    await npage.getByRole("button", { name: "Envoyer mon offre" }).click();
    await expect(npage.getByText(/^Votre offre est envoyée, valable jusqu'au/)).toBeVisible();
    // Première réponse sans compte : l'invitation à créer son compte négoce.
    await expect(npage.getByRole("link", { name: "Créer mon compte négoce" })).toBeVisible();

    // B, C, D répondent, E ne chiffre pas.
    const jetons = await Promise.all(negoces.slice(1).map(async (n) => jetonDe((await emailsVers(page, n.email)).at(-1)!.text)));
    const page0 = (await apiJson<{ lignes: { cle: string }[] }>(npage, "GET", `/v1/public/chiffrer/${jetons[0]}`)).body;
    const [c0, c1] = page0.lignes.map((l) => l.cle);
    expect((await apiJson(npage, "POST", `/v1/public/chiffrer/${jetons[0]}`, { prix: { [c0!]: 1.05, [c1!]: 0.5 }, livraisonHt: 0, delaiJours: 2, validiteJours: 14 })).status).toBe(200);
    expect((await apiJson(npage, "POST", `/v1/public/chiffrer/${jetons[1]}`, { prix: { [c0!]: 1.2, [c1!]: 0.55 }, livraisonHt: 40, delaiJours: 5, validiteJours: 7 })).status).toBe(200);
    expect((await apiJson(npage, "POST", `/v1/public/chiffrer/${jetons[2]}`, { prix: { [c0!]: 0.8 }, livraisonHt: 0, delaiJours: null, validiteJours: 7 })).status).toBe(200);
    expect((await apiJson(npage, "POST", `/v1/public/chiffrer/${jetons[3]}/refuser`)).status).toBe(200);

    // L'artisan compare, livraison comprise : la moins chère d'abord, l'incomplète le dit.
    await page.reload();
    const offres = page.getByRole("list", { name: "Les offres, livraison comprise" });
    await expect(offres.getByRole("listitem")).toHaveCount(4);
    await expect(offres.getByRole("listitem").first()).toContainText("Négoce B");
    await expect(offres.getByRole("listitem").first()).toContainText("La moins chère");
    await expect(offres.getByText("1 ligne non chiffrée")).toBeVisible();
    await expect(page.getByRole("list", { name: "Négoces sollicités" }).getByText("Négoce E · Ne chiffre pas")).toBeVisible();
    await offres.getByRole("button", { name: "Commander chez Négoce B" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Commandé chez Négoce B · Commande reçue" })).toBeVisible();

    // Le bon part chez B, qui confirme sur sa page ; puis « C'est livré ».
    const bon = (await emailsVers(page, negoces[1]!.email)).find((m) => m.subject.startsWith("Bon de commande de"))!;
    await npage.goto(`/chiffrer/${jetonDe(bon.text)}`);
    await npage.getByRole("button", { name: "Confirmer la commande" }).click();
    await expect(npage.getByText("Confirmée. Merci.")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("status").filter({ hasText: "Commande confirmée" })).toBeVisible();
    await page.getByRole("button", { name: "C'est livré" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Livrée" })).toBeVisible();
    await nctx.close();
  });

  test("3. relance à 48 h ouvrées, une seule fois", async ({ page }, info) => {
    const zone = zoneDuCas("relance", info.project.name);
    const a = await couvreur(page, zone, [{ libelle: ARDOISE, quantite: "1000", unite: "pièces" }]);
    const email = `relance-${unique()}@negoce.example.com`;
    const envoi = await apiJson<{ id: string }>(page, "POST", `/v1/projects/${a.projectId}/demandes-perso`, { but: "chiffrer", accord: true, negoces: [{ nom: "Négoce Lent", email }] });
    expect(envoi.status).toBe(201);
    const tache = async (dans: number) => (await apiJson<{ relances: number }>(page, "GET", `/v1/internal/demandes-perso?maintenant=${encodeURIComponent(new Date(Date.now() + dans).toISOString())}`, undefined, SECRET)).body.relances;
    expect(await tache(3_600_000)).toBe(0);
    expect(await tache(5 * 86_400_000)).toBeGreaterThanOrEqual(1);
    expect((await emailsVers(page, email)).some((m) => /^Rappel : la demande de prix de /.test(m.subject))).toBe(true);
    const avant = (await emailsVers(page, email)).length;
    await tache(6 * 86_400_000);
    expect((await emailsVers(page, email)).length).toBe(avant);
  });

  test("4. « Mes prix » ne montre que ses propres prix", async ({ page, browser }, info) => {
    const zone = zoneDuCas("mesPrix", info.project.name);
    const a = await couvreur(page, zone, [{ libelle: ARDOISE, quantite: "1000", unite: "pièces" }]);
    const email = `prix-${unique()}@negoce.example.com`;
    expect((await apiJson(page, "POST", `/v1/projects/${a.projectId}/demandes-perso`, { but: "chiffrer", accord: true, negoces: [{ nom: "Négoce Prix", email }] })).status).toBe(201);
    const jeton = jetonDe((await emailsVers(page, email)).at(-1)!.text);
    const cle = (await apiJson<{ lignes: { cle: string }[] }>(page, "GET", `/v1/public/chiffrer/${jeton}`)).body.lignes[0]!.cle;
    expect((await apiJson(page, "POST", `/v1/public/chiffrer/${jeton}`, { prix: { [cle]: 1.07 }, livraisonHt: 0, delaiJours: 2, validiteJours: 10 })).status).toBe(200);

    await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Mes prix" }).click();
    const liste = page.getByRole("list", { name: "Mes prix par article" });
    await expect(liste.getByText(ARDOISE)).toBeVisible();
    await expect(liste.getByText(/1,07/).first()).toBeVisible();

    // Un autre artisan de la même zone ne voit rien de ces prix.
    const b = await autreArtisan(browser, zone, [{ libelle: ARDOISE, quantite: "500", unite: "pièces" }]);
    await b.page.goto("/mes-prix");
    await expect(b.page.getByText("Pas encore de prix")).toBeVisible();
    await expect(b.page.getByText(/1,07/)).toHaveCount(0);
    await b.fermer();
  });

  test("5. une ligne non groupable est refusée, avec sa raison ; seuls les gros articles identiques se regroupent", async ({ page }, info) => {
    const zone = zoneDuCas("nonGroupable", info.project.name);
    const a = await couvreur(page, zone, [
      { libelle: ARDOISE, quantite: "1800", unite: "pièces" },
      { libelle: CROCHET, quantite: "5000", unite: "pièces" },
    ]);
    await page.goto(`/chantiers/${a.projectId}`);
    await page.getByRole("button", { name: /^Tenter un prix de groupe \(1 gros article\)$/ }).click();
    const carte = page.getByRole("region", { name: "Tenter un prix de groupe" });
    const crochet = carte.getByRole("checkbox").nth(1);
    await expect(crochet).toBeDisabled();
    await expect(carte.getByText("Les petits accessoires ne se regroupent pas : garde-les dans ta demande perso.")).toBeVisible();
    const refus = await tenter(page, a.projectId, [CROCHET]);
    expect(refus.status).toBe(400);
    await carte.getByRole("button", { name: "Rejoindre le regroupement" }).click();
    await expect(page.getByRole("status").filter({ hasText: "1 ligne dans le regroupement." })).toBeVisible();
  });

  test("6. 30×20 et 32×22 ne se mélangent jamais", async ({ page, browser }, info) => {
    const zone = zoneDuCas("references", info.project.name);
    const a = await couvreur(page, zone, [{ libelle: ARDOISE, quantite: "1800", unite: "pièces" }]);
    const ra = await tenter(page, a.projectId, [ARDOISE]);
    expect(ra.status).toBe(200);
    const b = await autreArtisan(browser, zone, [{ libelle: ARDOISE_3020, quantite: "1800", unite: "pièces" }]);
    expect((await tenter(b.page, b.projectId, [ARDOISE_3020])).status).toBe(200);
    await page.goto(`/regroupements/${ra.body.ajoutees[0]!.regroupementId}`);
    const materiaux = page.getByRole("region", { name: "Matériaux concernés" });
    await expect(materiaux.getByText(/32×22/)).toBeVisible();
    await expect(materiaux.getByText(/30×20/)).toBeVisible();
    // Deux matériaux distincts, jamais additionnés : mes lignes ne portent que le 32×22.
    await expect(page.getByRole("region", { name: "Mes lignes" }).getByText(/30×20/)).toHaveCount(0);
    await b.fermer();
  });

  test("7. rejoindre depuis une ligne de chantier, ou en tapant sa quantité", async ({ page, browser }, info) => {
    const zone = zoneDuCas("rejoindre", info.project.name);
    const a = await couvreur(page, zone, [{ libelle: ARDOISE, quantite: "1800", unite: "pièces" }]);
    const ra = await tenter(page, a.projectId, [ARDOISE]);
    const id = ra.body.ajoutees[0]!.regroupementId;
    // B rejoint depuis sa ligne de chantier : le même regroupement.
    const b = await autreArtisan(browser, zone, [{ libelle: ARDOISE, quantite: "900", unite: "pièces" }]);
    const rb = await tenter(b.page, b.projectId, [ARDOISE]);
    expect(rb.body.ajoutees[0]!.regroupementId).toBe(id);
    // C rejoint en tapant sa quantité, un seul bouton « Rejoindre ce regroupement ».
    const c = await autreArtisan(browser, zone, [{ libelle: LITEAU, quantite: "10", unite: "m" }]);
    await c.page.goto(`/regroupements/${id}`);
    await expect(c.page.getByRole("button", { name: /Rejoindre ce regroupement/ })).toHaveCount(1);
    await c.page.getByRole("button", { name: /Rejoindre ce regroupement/ }).click();
    await c.page.getByLabel(/^Quantité/).fill("600");
    await c.page.getByRole("button", { name: "Ajouter ma quantité" }).click();
    await expect(c.page.getByRole("status").filter({ hasText: "ta quantité est dans le regroupement" })).toBeVisible();
    await expect(c.page.getByRole("region", { name: "Mes lignes" }).getByText(/600/)).toBeVisible();
    await b.fermer();
    await c.fermer();
  });

  test("8. une entreprise lance le regroupement ; il apparaît dans l'onglet et sur l'accueil", async ({ page }, info) => {
    const zone = zoneDuCas("lancement", info.project.name);
    const a = await couvreur(page, zone, [{ libelle: ARDOISE, quantite: "1800", unite: "pièces" }]);
    await page.goto(`/chantiers/${a.projectId}`);
    await page.getByRole("button", { name: /^Tenter un prix de groupe/ }).click();
    const carte = page.getByRole("region", { name: "Tenter un prix de groupe" });
    await carte.getByRole("radio", { name: /^Ce cycle/ }).click();
    await carte.getByRole("button", { name: "Rejoindre le regroupement" }).click();
    await expect(page.getByRole("status").filter({ hasText: "1 ligne dans le regroupement." })).toBeVisible();
    await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Regroupements" }).click();
    const carteR = page.getByRole("article", { name: /, Regroupement en cours$/ });
    await expect(carteR).toBeVisible();
    await expect(carteR.getByText("Tu es dedans")).toBeVisible();
    await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Accueil" }).click();
    await expect(page.getByRole("link", { name: /^Regroupements en cours : 1$/ })).toBeVisible();
  });

  test("9. volume minimum non atteint : pas de consultation, bascule en un clic", async ({ page }, info) => {
    const zone = zoneDuCas("volume", info.project.name);
    // 1 000 ardoises à 1,20 € HT (repère de test) : 1 200 € HT, groupable, sous les 3 000 € du volume minimum.
    const a = await couvreur(page, zone, [{ libelle: ARDOISE, quantite: "1000", unite: "pièces" }]);
    const r = await tenter(page, a.projectId, [ARDOISE]);
    expect(r.status).toBe(200);
    const l = (await apiJson<Lignes>(page, "GET", `/v1/projects/${a.projectId}/regroupements/lignes`)).body;
    const apres = new Date(Date.parse(l.cycles[0]!.clotureLe) + 60_000).toISOString();
    expect((await apiJson(page, "GET", `/v1/internal/commande-du-mois?maintenant=${encodeURIComponent(apres)}`, undefined, SECRET)).status).toBe(200);
    const id = r.body.ajoutees[0]!.regroupementId;
    await page.goto(`/regroupements/${id}`);
    await expect(page.getByText("Pas assez de volume ce cycle : les négoces n'ont pas été consultés. Choisis la suite, en un clic.")).toBeVisible();
    await page.getByRole("button", { name: "Passer au cycle suivant" }).click();
    await expect(page).not.toHaveURL(new RegExp(`/regroupements/${id}$`));
    await expect(page.getByRole("region", { name: "Mes lignes" })).toBeVisible();
  });

  test("10. une seule consultation par famille et par cycle", async ({ page, browser }, info) => {
    const zone = zoneDuCas("consultation", info.project.name);
    const a = await couvreur(page, zone, [
      { libelle: ARDOISE, quantite: "1800", unite: "pièces" },
      { libelle: LITEAU, quantite: "3000", unite: "m" },
    ]);
    const ra = await tenter(page, a.projectId, [ARDOISE, LITEAU]);
    // Deux articles de la couverture : un seul regroupement.
    expect(new Set(ra.body.ajoutees.map((x) => x.regroupementId)).size).toBe(1);
    const b = await autreArtisan(browser, zone, [{ libelle: ARDOISE, quantite: "900", unite: "pièces" }]);
    const rb = await tenter(b.page, b.projectId, [ARDOISE]);
    expect(rb.body.ajoutees[0]!.regroupementId).toBe(ra.body.ajoutees[0]!.regroupementId);
    const liste = (await apiJson<{ regroupements: { famille: string; cycle: string }[] }>(page, "GET", "/v1/regroupements")).body.regroupements;
    const couverture = liste.filter((r) => r.famille === "couverture");
    expect(new Set(couverture.map((r) => r.cycle)).size).toBe(couverture.length);
    await b.fermer();
  });

  test("11. la validité fixée par le négoce : 7 jours au moins", async ({ page, browser }, info) => {
    const zone = zoneDuCas("validite", info.project.name);
    const a = await couvreur(page, zone, [{ libelle: ARDOISE, quantite: "1000", unite: "pièces" }]);
    const email = `validite-${unique()}@negoce.example.com`;
    expect((await apiJson(page, "POST", `/v1/projects/${a.projectId}/demandes-perso`, { but: "chiffrer", accord: true, negoces: [{ nom: "Négoce Validité", email }] })).status).toBe(201);
    const nctx = await browser.newContext();
    const npage = await nctx.newPage();
    await npage.goto(`/chiffrer/${jetonDe((await emailsVers(page, email)).at(-1)!.text)}`);
    await npage.getByLabel(`Prix unitaire HT de ${ARDOISE}`).fill("1,10");
    await npage.getByLabel(/^Validité/).fill("5");
    await npage.getByRole("button", { name: "Envoyer mon offre" }).click();
    await expect(npage.getByRole("alert").filter({ hasText: "Validité de 7 jours au moins." })).toBeVisible();
    await npage.getByLabel(/^Validité/).fill("7");
    await npage.getByRole("button", { name: "Envoyer mon offre" }).click();
    await expect(npage.getByText(/^Votre offre est envoyée, valable jusqu'au/)).toBeVisible();
    await nctx.close();
  });

  test("12. anonymat : sous 5 entreprises, « Regroupement en cours » ; au-dessus, « 5+ entreprises » et le département, jamais une commune", async ({ page, browser }, info) => {
    // Les mêmes départements que le cas 5, mais le cycle suivant : un autre regroupement.
    const zoneAnonymat = zoneDuCas("anonymat", info.project.name);
    const a = await couvreur(page, zoneAnonymat, [{ libelle: ARDOISE, quantite: "1800", unite: "pièces" }]);
    const id = (await tenter(page, a.projectId, [ARDOISE], 1)).body.ajoutees[0]!.regroupementId;
    await page.goto(`/regroupements/${id}`);
    await expect(page.getByText("Regroupement en cours", { exact: true })).toBeVisible();
    await expect(page.getByText(/\d+ entreprises/)).toHaveCount(0);
    const autres = [];
    for (let i = 0; i < 4; i++) {
      const b = await autreArtisan(browser, zoneAnonymat, [{ libelle: ARDOISE, quantite: "900", unite: "pièces" }]);
      expect((await tenter(b.page, b.projectId, [ARDOISE], 1)).body.ajoutees[0]!.regroupementId).toBe(id);
      autres.push(b);
    }
    await page.reload();
    await expect(page.getByText("5+ entreprises", { exact: true })).toBeVisible();
    await expect(page.getByText(`Département ${zoneAnonymat}`).first()).toBeVisible();
    const ville = VILLES[zoneAnonymat]!.replace(/^\d+ /, "");
    await expect(page.getByText(ville)).toHaveCount(0);
    for (const b of autres) await b.fermer();
  });

  test("13. accueil : pas d'encart regroupements quand il n'y a rien", async ({ page }) => {
    await couvreur(page, "75", [{ libelle: ARDOISE, quantite: "100", unite: "pièces" }]);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Bonjour Jean" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Regroupements en cours/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Nouveau chantier" })).toBeVisible();
  });

  test("14. hors zone active : tout sauf les regroupements", async ({ page }) => {
    const a = await couvreur(page, "75", [{ libelle: ARDOISE, quantite: "1800", unite: "pièces" }]);
    await page.goto("/regroupements");
    await expect(page.getByText("Les regroupements arrivent bientôt dans ton département, invite tes négoces pour accélérer.")).toBeVisible();
    const r = await tenter(page, a.projectId, [ARDOISE]);
    expect(r.status).toBe(403);
    // La demande perso, elle, marche partout.
    expect((await apiJson(page, "POST", `/v1/projects/${a.projectId}/demandes-perso`, { but: "chiffrer", accord: true, negoces: [{ nom: "Négoce Paris", email: `paris-${unique()}@negoce.example.com` }] })).status).toBe(201);
  });

  test("15. le payant offert dans une zone qui démarre, puis 30 jours de préavis", async ({ page }, info) => {
    const zone = zoneDuCas("preavis", info.project.name);
    const a = await couvreur(page, zone, [{ libelle: ARDOISE, quantite: "100", unite: "pièces" }]);
    await finEssai(page, a.email);
    await seuilFranchi(page, zone, new Date(Date.now() - 3 * 86_400_000));
    expect((await apiJson<{ formule: string; raison: string }>(page, "GET", "/v1/droits")).body).toMatchObject({ formule: "payant", raison: "zone_offerte" });
    await page.goto("/");
    await expect(page.getByRole("status").filter({ hasText: /compte maintenant assez d'artisans : l'abonnement t'est offert jusqu'au/ })).toBeVisible();
    // Le préavis passé : le gratuit.
    await seuilFranchi(page, zone, ilYaLongtemps());
    expect((await apiJson<{ formule: string }>(page, "GET", "/v1/droits")).body.formule).toBe("gratuit");
  });
});
