import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { confirmerEmail } from "./confirmer-email";
import { departementReserve } from "./departement";

/**
 * LE CYCLE DE VIE, À L'ÉCRAN (Greg, 6 novembre 2026, §19) — en-tête repris de `rapprochement.spec.ts` :
 * LE RAPPROCHEMENT CONTINU, À L'ÉCRAN (Greg, 6 novembre 2026, points 7 à 11) : sur une liste validée, « Rechercher des
 * besoins compatibles » ligne par ligne jusqu'à une date ; la demande individuelle reste libre ; un besoin compatible
 * d'une autre entreprise apparaît dans « Groupes › Mes groupes » (« Mes rapprochements »), sans son nom ni sa quantité ;
 * « Pas intéressé » arrête ; « Découvrir » filtre sans métier imposé. Données de test seulement, aucun vrai e-mail.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const jour = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const SECRET = "Bearer e2e-secret-de-la-tache";

/** Le guide d'accueil se referme de lui-même ; le regroupement en mode automatique (celui des collectes). */
async function passerLeGuide(page: Page) {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
}

test.beforeEach(async ({ page, request }) => {
  await passerLeGuide(page);
  expect((await request.post("/v1/internal/test/mode-regroupement", { headers: { authorization: SECRET }, data: { mode: "automatique" } })).status()).toBe(200);
});

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

async function inscrire(page: Page, prenom: string, entreprise: string) {
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill(`${prenom} Martin`);
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  const email = `artisan-${unique()}@example.fr`;
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`^Bonjour ${prenom}`) }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  await confirmerEmail(page, email);
}

/** Une liste saisie (aucune IA), à l'adresse du chantier, validée (questions au premier bouton). */
async function listeValidee(page: Page, dep: string, designation: string, quantite: string) {
  const q = await apiJson<{ id: string; projetId: string }>(page, "POST", "/v1/quantitatifs", { lignes: [{ libelle: designation, quantite, unite: "pièces" }] });
  expect(q.status).toBe(201);
  expect((await apiJson(page, "PATCH", `/v1/projects/${q.body.projetId}`, { name: `Chantier ${unique()}`, address: `3 rue de la Gare, ${dep}100 Ville-${dep}` })).status).toBe(200);
  let courant = (await apiJson<{ questions: { id: string; boutons: { valeur: string }[] }[] }>(page, "GET", `/v1/quantitatifs/${q.body.id}`)).body;
  for (let i = 0; i < 10 && courant.questions.length > 0; i++) {
    const question = courant.questions[0]!;
    courant = (await apiJson<typeof courant>(page, "POST", `/v1/quantitatifs/${q.body.id}/reponses`, { reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await apiJson(page, "POST", `/v1/quantitatifs/${q.body.id}/validation`)).status).toBe(200);
  return q.body.projetId;
}



test("Cycle de vie : retenir un négoce pour une ligne tenue par un achat groupé demande le geste explicite ; « Garder l'achat groupé » ne change rien", async ({ page }, info) => {
  test.setTimeout(180_000);
  const dep = departementReserve([40, 44], [45, 49]);
  await inscrire(page, "Jean", `Toitures ${unique()}`);
  expect((await apiJson(page, "PATCH", "/v1/company/profile", { name: `Toitures ${unique()}`, address: `3 rue de la Gare, ${dep}100 Ville-${dep}`, siret: "73282932000074", phone: null, email: null })).status).toBe(200);
  expect((await apiJson(page, "POST", "/v1/groupe/siret")).status).toBe(200);
  const projet = await listeValidee(page, dep, "Ardoise naturelle 32×22 Espagne 1er choix", "900");
  const cle = (await apiJson<{ lignes: { key: string; designation: string }[] }>(page, "GET", `/v1/projects/${projet}/rapprochement`)).body.lignes.find((l) => /Ardoise/.test(l.designation))!.key;
  // La ligne entre dans un achat groupé (données de test).
  const engage = await apiJson(page, "POST", `/v1/projects/${projet}/achat-groupe`, { confirmees: [cle], dateBesoin: jour(30), negoces: [{ nom: "Négoce test", email: `test-${unique()}@negoce.example` }], engagement: true });
  expect(engage.status, JSON.stringify(engage.body)).toBe(201);
  // Une demande de prix part, et le négoce répond (devis de test rangé à la main).
  const supplier = (await apiJson<{ id: string }>(page, "POST", "/v1/suppliers", { name: `Négoce ${unique()}`, email: `ventes-${unique()}@negoce.example` })).body;
  const demande = await apiJson<{ id: string; recipients: { id: string }[] }>(page, "POST", `/v1/projects/${projet}/price-requests`, { supplierIds: [supplier.id] });
  expect(demande.status).toBe(201);
  expect((await apiJson(page, "POST", `/v1/price-request-recipients/${demande.body.recipients[0]!.id}/send`)).status).toBe(200);
  const companyId = await page.evaluate(() => localStorage.getItem("baticlair.companyId"));
  const res = await page.request.post(`/v1/price-request-recipients/${demande.body.recipients[0]!.id}/quote`, {
    headers: companyId ? { "x-company-id": companyId } : {},
    multipart: { file: { name: "devis-negoce.pdf", mimeType: "application/pdf", buffer: fs.readFileSync(path.join(__dirname, "fixtures", "devis-fournisseur-2.pdf")) } },
  });
  expect(res.status()).toBeLessThan(300);

  await page.goto(`/chantiers/${projet}`);
  const retenir = async () => {
    await page.getByRole("button", { name: /^Voir (le|les) devis reçus?$/ }).click();
    await page.getByRole("button", { name: "Je retiens ce négoce" }).first().click();
  };
  await retenir();
  const conflit = page.getByRole("alertdialog", { name: "Ligne dans un achat groupé" });
  await expect(conflit).toBeVisible();
  await expect(conflit).toContainText("est dans l'achat groupé");
  await expect(conflit).toContainText("retire-la d'abord de l'achat groupé");
  await conflit.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/cycle/${info.project.name}-conflit.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  // « Garder l'achat groupé » : rien ne change.
  await conflit.getByRole("button", { name: "Garder l'achat groupé" }).click();
  await expect(conflit).toHaveCount(0);
  let cycle = (await apiJson<{ lignes: { etat: string; actions: string[] }[] }>(page, "GET", `/v1/projects/${projet}/cycle`)).body.lignes;
  expect(cycle[0]!.etat).toBe("dans_un_groupe");
  // Le geste explicite : retirée de l'achat groupé, puis retenue chez le négoce.
  await retenir();
  await page.getByRole("alertdialog", { name: "Ligne dans un achat groupé" }).getByRole("button", { name: "Retirer de l'achat groupé et commander ici" }).click();
  await expect(page.getByRole("alertdialog", { name: "Ligne dans un achat groupé" })).toHaveCount(0);
  await expect.poll(async () => (await apiJson<{ lignes: { etat: string }[] }>(page, "GET", `/v1/projects/${projet}/cycle`)).body.lignes[0]!.etat).toBe("commandee_seule");
  cycle = (await apiJson<{ lignes: { etat: string; actions: string[] }[] }>(page, "GET", `/v1/projects/${projet}/cycle`)).body.lignes;
  expect(cycle[0]!.actions).toEqual([]);
});
