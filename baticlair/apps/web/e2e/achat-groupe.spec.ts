import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * L'ACHAT GROUPÉ AUTOMATIQUE (Greg, 27 octobre 2026 : « l'achat groupé devient le cœur de l'app, en automatique ») : les
 * cinq cas de la méthode, sur téléphone et sur ordinateur, avec une capture de chacun (test-results/achat-groupe) :
 * 1. le compte vide (les deux portes) ; 2. le lancement et « Préviens ton négoce » ; 3. un 2e artisan alerté qui rejoint ;
 * 4. deux offres de négoces, l'une douteuse, la meilleure offre et la commande ; 5. le plan B.
 * Chaque exécution prend un département au hasard : les achats d'une série ne se mélangent pas à ceux d'une autre.
 */

const SECRET = "Bearer e2e-secret-de-la-tache";
const ARDOISE = "Ardoise naturelle 32×22 Espagne 1er choix";
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const departement = () => String(1 + Math.floor(Math.random() * 19)).padStart(2, "0");

test.beforeEach(async ({ page, request }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  // Le mode par défaut : l'achat groupé automatique (une série interrompue a pu laisser un autre mode).
  expect((await request.post("/v1/internal/test/mode-regroupement", { headers: { authorization: SECRET }, data: { mode: "automatique" } })).status()).toBe(200);
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

const emailsVers = async (page: Page, to: string) => (await apiJson<{ emails: { subject: string; text: string }[] }>(page, "GET", `/v1/internal/test/emails?to=${encodeURIComponent(to)}`, undefined, SECRET)).body.emails;
const tache = async (page: Page, maintenant: Date) => {
  const r = await apiJson<Record<string, number>>(page, "GET", `/v1/internal/achats-groupes?maintenant=${encodeURIComponent(maintenant.toISOString())}`, undefined, SECRET);
  expect(r.status).toBe(200);
  return r.body;
};
const capture = (page: Page, projet: string, nom: string) => page.screenshot({ path: `test-results/achat-groupe/${projet}-${nom}.png`, fullPage: true });

/** Un couvreur inscrit (écran de l'adresse Mobiiz passé), SIRET vérifié, adresse dans le département. */
async function inscrire(page: Page, dep: string, prenom = "Jean"): Promise<{ entreprise: string; email: string }> {
  const entreprise = `Toitures ${unique()}`;
  const email = `artisan-${unique()}@example.fr`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill(`${prenom} Martin`);
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("heading", { name: "Voici ton adresse Mobiiz :" })).toBeVisible();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`^Bonjour ${prenom}`) }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  expect((await apiJson(page, "PATCH", "/v1/company/profile", { name: entreprise, address: `3 rue de la Gare, ${dep}100 Ville-${dep}`, siret: "73282932000074", phone: null, email: null })).status).toBe(200);
  expect((await apiJson(page, "POST", "/v1/groupe/siret")).status).toBe(200);
  return { entreprise, email };
}

async function nouvelArtisan(browser: Browser, dep: string, prenom: string) {
  const ctx = await browser.newContext({ ...(test.info().project.use as object) });
  const page = await ctx.newPage();
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  const qui = await inscrire(page, dep, prenom);
  return { ctx, page, ...qui };
}

/** Lancer (ou rejoindre) depuis le formulaire : quantité, commune, un négoce tapé. */
async function remplirEtEnvoyer(page: Page, o: { quantite: string; commune: string; negoce: { nom: string; email: string; tel: string } }, bouton: string) {
  await page.getByLabel("Quantité").fill(o.quantite);
  await page.getByLabel("Commune de livraison").fill(o.commune);
  // Précision 1 : sans négoce, la demande ne part pas.
  await page.getByRole("button", { name: bouton }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Ajoute au moins un négoce" })).toHaveText("Ajoute au moins un négoce à qui envoyer la demande.");
  await page.getByRole("button", { name: "Ajouter un autre négoce" }).click();
  await page.getByLabel("Nom du négoce").fill(o.negoce.nom);
  await page.getByLabel("Son e-mail").fill(o.negoce.email);
  await page.getByLabel("Son téléphone (pour le prévenir)").fill(o.negoce.tel);
  await page.getByRole("button", { name: "Ajouter ce négoce" }).click();
  await page.getByRole("button", { name: bouton }).click();
}

test.describe("Achat groupé automatique (27 octobre 2026)", () => {
  test.setTimeout(240_000);

  test("les cinq cas : compte vide, lancement et « Préviens ton négoce », 2e artisan alerté qui rejoint, deux offres dont une douteuse puis commande, plan B", async ({ page, browser }, info) => {
    const projet = info.project.name;
    const dep = departement();
    const negoceX = { nom: `Négoce X ${unique()}`, email: `x-${unique()}@negoce.example`, tel: "02 96 00 00 01" };
    const negoceY = { nom: `Négoce Y ${unique()}`, email: `y-${unique()}@negoce.example`, tel: "02 96 00 00 02" };

    // 1. Le compte vide : les deux portes, rien d'autre à faire.
    await inscrire(page, dep);
    await page.goto("/");
    await expect(page.getByText("Par où commencer ?")).toBeVisible();
    await expect(page.getByRole("link", { name: /Lancer un achat groupé/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ma liste de matériaux/ })).toBeVisible();
    // Le « + » jaune de la barre ouvre les deux mêmes portes.
    await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("button", { name: /Nouveau/ }).click();
    await expect(page.getByRole("dialog", { name: "Que veux-tu faire ?" })).toBeVisible();
    await page.keyboard.press("Escape");
    await capture(page, projet, "1-compte-vide");

    // 2. Le lancement : le catalogue, la quantité, la commune, un négoce ; puis « Préviens ton négoce ».
    await page.getByRole("link", { name: /Lancer un achat groupé/ }).first().click();
    await page.getByLabel("Quel matériau ?").fill("ardoise 32");
    await page.getByRole("button", { name: ARDOISE }).first().click();
    await remplirEtEnvoyer(page, { quantite: "1800", commune: `${dep}100 Ville-${dep}`, negoce: negoceX }, "Lancer l'achat groupé");
    const prevenir = page.getByRole("region", { name: "Préviens ton négoce" });
    await expect(prevenir.getByRole("heading", { name: "Préviens ton négoce" })).toBeVisible();
    await expect(prevenir.getByText(/^Ton négoce va recevoir une grosse demande : 1 800 pièces d'ardoise 32×22 Espagne 1er choix, le \d+ \S+, de la part de Mobiiz\. C'est une belle opportunité pour lui\. Préviens-le pour qu'il ne passe pas à côté, et dis-lui qu'il n'aura qu'une seule offre à faire : son meilleur prix\.$/)).toBeVisible();
    await expect(prevenir.getByRole("link", { name: "Appeler" })).toHaveAttribute("href", "tel:0296000001");
    await expect(prevenir.getByRole("link", { name: "SMS" })).toHaveAttribute("href", /^sms:0296000001\?&body=Bonjour%2C%20je%20participe%20%C3%A0%20un%20achat%20group%C3%A9%20Mobiiz/);
    await capture(page, projet, "2-previens-ton-negoce");
    await prevenir.getByRole("button", { name: "Je l'ai prévenu" }).click();
    await expect(prevenir.getByText("Prévenu", { exact: true })).toBeVisible();
    await prevenir.getByRole("link", { name: "Voir mon achat groupé" }).click();
    await page.waitForURL(/\/achats-groupes\/[0-9a-f-]{36}$/);
    await expect(page.getByText(/^Seul jusqu'au \d+ \S+$/)).toBeVisible();
    const besoinA = page.url().split("/").pop()!;

    // 3. Un 2e artisan du même secteur et du même métier est alerté, et rejoint depuis l'alerte (matériau déjà rempli).
    const b = await nouvelArtisan(browser, dep, "Paul");
    // L'alerte part au lancement : B s'est inscrit après, il voit l'achat dans « près de chez toi ».
    await b.page.goto("/");
    // Compte vide : « Achats groupés ouverts dans ton secteur » (le libellé de « près de chez toi » à vide).
    const pres = b.page.getByRole("region", { name: "Achats groupés ouverts dans ton secteur" });
    await expect(pres.getByText("Ardoise 32×22 Espagne 1er choix").first()).toBeVisible();
    await capture(b.page, projet, "3a-pres-de-chez-toi");
    await pres.getByRole("link", { name: "Rejoindre" }).first().click();
    await expect(b.page.getByRole("heading", { name: "Rejoindre l'achat groupé" })).toBeVisible();
    await expect(b.page.getByText("Ardoise 32×22 Espagne 1er choix")).toBeVisible();
    await remplirEtEnvoyer(b.page, { quantite: "900", commune: `${dep}200 Autre-${dep}`, negoce: negoceY }, "Rejoindre l'achat groupé");
    await expect(b.page.getByText("Tu as rejoint l'achat groupé.")).toBeVisible();
    await b.page.getByRole("link", { name: "Voir mon achat groupé" }).click();
    await b.page.waitForURL(/\/achats-groupes\/[0-9a-f-]{36}$/);
    const besoinB = b.page.url().split("/").pop()!;
    await page.goto(`/achats-groupes/${besoinA}`);
    await expect(page.getByText("Regroupé avec d'autres entreprises")).toBeVisible();
    // Jamais le nom ni la commune de l'autre.
    await expect(page.getByText(b.entreprise)).toHaveCount(0);
    await expect(page.getByText(`Autre-${dep}`)).toHaveCount(0);
    await capture(page, projet, "3b-regroupe");

    // 4. La clôture : une demande par négoce ; X répond 1,10 € ; Y répond avec un délai trop long (douteuse).
    const detail = (await apiJson<{ clotureLe: string; reponseAvantLe: string }>(page, "GET", `/v1/achats-groupes/${besoinA}`)).body;
    await tache(page, new Date(new Date(detail.clotureLe).getTime() + 3_600_000));
    const jeton = async (email: string) => /\/achat-groupe\/([A-Za-z0-9_-]+)/.exec((await emailsVers(page, email)).at(-1)!.text)![1]!;
    const mailX = (await emailsVers(page, negoceX.email)).at(-1)!;
    expect(mailX.text).toContain("Vous n'êtes pas le seul négoce consulté.");
    expect(mailX.text).not.toContain(b.entreprise);
    const negoce = await browser.newPage();
    await negoce.goto(`/achat-groupe/${await jeton(negoceX.email)}`);
    await expect(negoce.getByRole("heading", { name: "Demande de prix groupée" })).toBeVisible();
    await expect(negoce.getByText("2 700 pièces · Ardoise 32×22 Espagne 1er choix")).toBeVisible();
    await negoce.getByLabel(/Prix unitaire HT livré/).fill("1,10");
    await negoce.getByRole("checkbox").check();
    await capture(negoce, projet, "4a-page-negoce");
    await negoce.getByRole("button", { name: "Déposer mon offre" }).click();
    await expect(negoce.getByText(/Votre offre est enregistrée : 1,10 € HT par pièces, livré/)).toBeVisible();
    await negoce.goto(`/achat-groupe/${await jeton(negoceY.email)}`);
    await negoce.getByLabel(/Prix unitaire HT livré/).fill("0,95");
    await negoce.getByLabel(/Délai de livraison/).fill("40");
    await negoce.getByRole("checkbox").check();
    await negoce.getByRole("button", { name: "Déposer mon offre" }).click();
    await expect(negoce.getByText(/Votre offre est enregistrée/)).toBeVisible();
    await negoce.close();

    await tache(page, new Date(new Date(detail.reponseAvantLe).getTime() + 3_600_000));
    await page.goto(`/achats-groupes/${besoinA}`);
    await expect(page.getByText("Offre reçue", { exact: true })).toBeVisible();
    // La douteuse (0,95 € mais livrée trop tard) n'est jamais mise en avant : la meilleure est celle de X.
    await expect(page.getByText("La meilleure offre du groupe")).toBeVisible();
    await expect(page.getByText("1 980,00 € HT livré").first()).toBeVisible();
    await capture(page, projet, "4b-offres");
    await page.getByRole("button", { name: `Commander chez ${negoceX.nom}` }).click();
    await expect(page.getByText(`C'est commandé chez ${negoceX.nom}. Ton bon de commande est parti chez le négoce.`)).toBeVisible();
    expect((await emailsVers(page, negoceX.email)).some((m) => /^Bon de commande n° \d+/.test(m.subject))).toBe(true);
    await capture(page, projet, "4c-commande");
    // B (essai, pas abonné) : la meilleure offre sans le nom du négoce.
    await b.page.goto(`/achats-groupes/${besoinB}`);
    await expect(b.page.getByText("un négoce du secteur")).toBeVisible();
    await expect(b.page.getByText(negoceX.nom)).toHaveCount(0);
    await b.ctx.close();

    // 5. Le plan B : pas assez de volume (100 pièces × 1,20 € < 3 000 €) → « Envoyer à mes négoces » en un clic.
    const c = await nouvelArtisan(browser, departement() === dep ? String((Number(dep) % 19) + 1).padStart(2, "0") : departement(), "Luc");
    await c.page.goto("/achats-groupes/lancer");
    await c.page.getByLabel("Quel matériau ?").fill("ardoise 40");
    await c.page.getByRole("button", { name: "Ardoise naturelle 40×25 Espagne 1er choix" }).click();
    const profil = (await apiJson<{ address: string }>(c.page, "GET", "/v1/company/profile")).body;
    await remplirEtEnvoyer(c.page, { quantite: "100", commune: profil.address, negoce: { nom: `Négoce Z ${unique()}`, email: `z-${unique()}@negoce.example`, tel: "02 96 00 00 03" } }, "Lancer l'achat groupé");
    await c.page.getByRole("link", { name: "Voir mon achat groupé" }).click();
    await c.page.waitForURL(/\/achats-groupes\/[0-9a-f-]{36}$/);
    const besoinC = c.page.url().split("/").pop()!;
    const dc = (await apiJson<{ clotureLe: string }>(c.page, "GET", `/v1/achats-groupes/${besoinC}`)).body;
    await tache(c.page, new Date(new Date(dc.clotureLe).getTime() + 3_600_000));
    await c.page.reload();
    await expect(c.page.getByText("Pas assez de volume cette fois")).toBeVisible();
    await capture(c.page, projet, "5a-pas-assez");
    await c.page.getByRole("button", { name: "Envoyer à mes négoces" }).click();
    await expect(c.page.getByText("Ta demande est partie chez tes négoces.", { exact: false })).toBeVisible();
    await capture(c.page, projet, "5b-plan-b");
    await c.ctx.close();
  });
});
