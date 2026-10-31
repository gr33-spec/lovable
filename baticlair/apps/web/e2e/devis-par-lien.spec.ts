import { expect, test, type Page } from "@playwright/test";

/**
 * UN SEUL BOUTON, ET LA COMPARAISON RESTE (Greg, 28 octobre 2026, points 7 et 8) : la liste part par « Demander les prix
 * à mes négoces » ; deux négoces répondent par le lien de chiffrage (sans PDF) ; le chantier propose « Comparer », les
 * devis se rangent du moins cher au plus cher, livraison comprise, et « Je retiens ce négoce » passe à « Commandé ».
 */
const SECRET = "Bearer e2e-secret-de-la-tache";
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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
const jetonDe = async (page: Page, to: string) => {
  const mails = (await apiJson<{ emails: { text: string }[] }>(page, "GET", `/v1/internal/test/emails?to=${encodeURIComponent(to)}`, undefined, SECRET)).body.emails;
  return /\/chiffrer\/([A-Za-z0-9_-]+)/.exec(mails.at(-1)!.text)![1]!;
};

test("deux réponses par le lien : « Comparer », du moins cher au plus cher, puis « Je retiens ce négoce »", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  const entreprise = `Toitures ${unique()}`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Jean Martin");
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(`artisan-${unique()}@example.fr`);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: /^Bonjour Jean/ }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  expect((await apiJson(page, "PATCH", "/v1/company/profile", { name: entreprise, address: "3 rue de la Gare, 22300 Lannion", siret: "73282932000074", phone: null, email: null })).status).toBe(200);

  // La liste, validée, part chez deux négoces (le chemin de « Demander les prix à mes négoces »).
  const q = await apiJson<{ projetId: string }>(page, "POST", "/v1/quantitatifs", { lignes: [{ libelle: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "1000", unite: "pièces" }, { libelle: "Liteau sapin traité 27×38", quantite: "100", unite: "m" }] });
  const projectId = q.body.projetId;
  const { takeoff } = (await apiJson<{ takeoff: { id: string } }>(page, "GET", `/v1/projects/${projectId}/takeoff`)).body;
  expect((await apiJson(page, "POST", `/v1/takeoffs/${takeoff.id}/validate`)).status).toBe(200);
  const tag = unique();
  const negoces = [`b-${tag}@negoce.example`, `c-${tag}@negoce.example`];
  const ids: string[] = [];
  for (const [i, email] of negoces.entries()) ids.push((await apiJson<{ id: string }>(page, "POST", "/v1/suppliers", { name: i === 0 ? "Négoce Bleu" : "Négoce Cyan", email })).body.id);
  const demande = await apiJson<{ recipients: { id: string }[] }>(page, "POST", `/v1/projects/${projectId}/price-requests`, { supplierIds: ids });
  expect(demande.status).toBe(201);
  for (const r of demande.body.recipients) expect((await apiJson(page, "POST", `/v1/price-request-recipients/${r.id}/send`)).status).toBe(200);

  // Les deux négoces chiffrent par le lien : Cyan est le moins cher, livraison comprise.
  for (const [email, pu, livraison] of [
    [negoces[0]!, 1.1, 80],
    [negoces[1]!, 1, 0],
  ] as const) {
    const jeton = await jetonDe(page, email);
    const cles = (await apiJson<{ lignes: { cle: string }[] }>(page, "GET", `/v1/public/chiffrer/${jeton}`)).body.lignes.map((l) => l.cle);
    expect((await apiJson(page, "POST", `/v1/public/chiffrer/${jeton}`, { prix: Object.fromEntries(cles.map((k) => [k, pu])), livraisonHt: livraison, delaiJours: 3, validiteJours: 14 })).status).toBe(200);
  }

  await page.goto(`/chantiers/${projectId}`);
  await page.getByRole("button", { name: "Comparer", exact: true }).click();
  const feuille = page.getByRole("dialog", { name: "Devis reçus" });
  await expect(feuille.getByLabel("Devis de Négoce Cyan")).toContainText("Le moins cher");
  await expect(feuille.getByLabel("Devis de Négoce Cyan")).toContainText("HT livré");
  await expect(feuille.getByLabel("Devis de Négoce Bleu")).toContainText(/dont livraison 80,00 €.* de plus/);
  const [premier, second] = await Promise.all([feuille.getByLabel("Devis de Négoce Cyan").boundingBox(), feuille.getByLabel("Devis de Négoce Bleu").boundingBox()]);
  expect(premier!.y).toBeLessThan(second!.y);
  await feuille.getByLabel("Devis de Négoce Cyan").getByRole("button", { name: "Je retiens ce négoce" }).click();
  await expect(page.getByRole("status", { name: "Commandé" })).toContainText("Commandé chez Négoce Cyan.");
});
