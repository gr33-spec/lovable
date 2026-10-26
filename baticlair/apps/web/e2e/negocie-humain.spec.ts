import { expect, test, type Page } from "@playwright/test";

/**
 * BUSINESS MODEL FINAL (Greg, 25 octobre 2026) : le regroupement NÉGOCIÉ PAR UN HUMAIN, mode par défaut. L'artisan
 * déclare ses gros besoins depuis son chantier, un chasseur d'opportunités Mobiiz (rôle `CHASSEURS`, code par e-mail)
 * prend en charge, saisit l'offre (commission intégrée) et l'envoie ; l'artisan voit le négoce masqué, accepte (commande
 * ferme, bon de commande), et le chasseur transmet le lot. Puis « Préviens ton négoce » après une demande perso, et la page
 * /couvreurs. Chaque appareil a son département, pour que les regroupements ne se mélangent pas.
 */

const SECRET = "Bearer e2e-secret-de-la-tache";
const ARDOISE = "Ardoise naturelle 32×22 Espagne 1er choix";
const VILLES: Record<string, string> = { "56": "56000 Vannes", "29": "29000 Quimper" };
const zoneDe = (projet: string) => (projet === "telephone" ? "56" : "29");
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
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

/** Un couvreur inscrit, SIRET vérifié, adresse dans la zone ; avec une liste si des lignes sont données. */
async function inscrire(page: Page, email: string, zone: string, lignes?: { libelle: string; quantite: string; unite: string }[]): Promise<string | null> {
  const entreprise = `Toitures ${unique()}`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Jean Martin");
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("heading", { name: /^Bonjour Jean/ }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  expect((await apiJson(page, "PATCH", "/v1/company/profile", { name: entreprise, address: `3 rue de la Gare, ${VILLES[zone]}`, siret: "73282932000074", phone: null, email: null })).status).toBe(200);
  expect((await apiJson(page, "POST", "/v1/groupe/siret")).status).toBe(200);
  if (!lignes) return null;
  const q = await apiJson<{ projetId: string }>(page, "POST", "/v1/quantitatifs", { lignes });
  expect(q.status).toBe(201);
  expect((await apiJson(page, "PATCH", `/v1/projects/${q.body.projetId}`, { address: `8 rue de la Gare, ${VILLES[zone]}` })).status).toBe(200);
  return q.body.projetId;
}

const dansTroisSemaines = () => new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10);

test.describe("Business model final : le regroupement négocié par un humain", () => {
  test.setTimeout(180_000);
  // Le mode par défaut ; remis ici au cas où une série interrompue l'aurait laissé en « automatique ».
  test.beforeAll(async ({ request }) => {
    expect((await request.post("/v1/internal/test/mode-regroupement", { headers: { authorization: SECRET }, data: { mode: "humain" } })).status()).toBe(200);
  });

  test("l'artisan déclare, le chasseur négocie et envoie l'offre, l'artisan accepte, le lot part au négoce", async ({ page, browser }, info) => {
    const zone = zoneDe(info.project.name);
    const projectId = await inscrire(page, `artisan-${unique()}@example.fr`, zone, [
      { libelle: ARDOISE, quantite: "1800", unite: "pièces" },
      { libelle: "Crochet inox 100 mm", quantite: "1900", unite: "pièces" },
    ]);
    expect((await apiJson<{ mode: string }>(page, "GET", "/v1/regroupement/mode")).body.mode).toBe("humain");

    // Sur le chantier : seuls les gros articles se déclarent ; le crochet garde sa raison.
    await page.goto(`/chantiers/${projectId}`);
    await page.getByRole("button", { name: /Tenter un prix de groupe \(1 gros article\)/ }).click();
    const carte = page.getByRole("region", { name: "Tenter un prix de groupe" });
    await expect(carte.getByRole("checkbox", { name: /Crochet inox 100 mm/ })).toBeDisabled();
    await carte.getByLabel("Pour quand ?").fill(dansTroisSemaines());
    await carte.getByRole("button", { name: "Déclarer mes besoins" }).click();
    await expect(page.getByRole("status").filter({ hasText: "1 besoin déclaré" })).toBeVisible();

    await page.goto("/regroupements");
    await expect(page.getByRole("heading", { name: "Regroupements", exact: true })).toBeVisible();
    const besoin = page.getByRole("region", { name: "Tes besoins" }).getByLabel(ARDOISE);
    await expect(besoin.getByText("1 800 pièces")).toBeVisible();
    await expect(besoin.getByText("Regroupement en cours")).toBeVisible();

    // Le chasseur, dans son navigateur : code par e-mail, prise en charge, offre, envoi.
    const ctx = await browser.newContext();
    const ch = await ctx.newPage();
    await ch.addLocatorHandler(ch.getByRole("dialog", { name: "Guide" }), async () => {
      await ch.getByRole("button", { name: "Passer le guide" }).click();
    });
    const chasseur = `chasseur-${info.project.name}@example.fr`;
    await inscrire(ch, chasseur, zone);
    await ch.goto("/admin/chasseur");
    await ch.getByRole("button", { name: "Recevoir mon code" }).click();
    await expect(ch.getByLabel("Code reçu par e-mail")).toBeVisible();
    const code = /Ton code : (\d{6})/.exec((await emailsVers(ch, chasseur)).at(-1)!.text)![1]!;
    await ch.getByLabel("Code reçu par e-mail").fill(code);
    await ch.getByRole("button", { name: "Ouvrir tes regroupements" }).click();
    const lot = ch.getByRole("listitem").filter({ hasText: `dans le ${zone}` }).filter({ hasText: "Ardoise 32×22" });
    await expect(lot.getByText("1 800 pièces · 1 entreprise")).toBeVisible();
    // Point 4 bis : la date butoir (besoin dans 3 semaines moins 10 jours), le compte à rebours et les négoces à appeler.
    await expect(lot.getByText(/^Date butoir : .+ · J-11$/)).toBeVisible();
    await expect(lot.getByRole("heading", { name: "Négoces à appeler" })).toBeVisible();
    await lot.getByRole("button", { name: "Je prends en charge" }).click();
    await expect(lot.getByText("En négociation")).toBeVisible();
    await lot.getByLabel("Négoce", { exact: true }).fill("Ardoisière de l'Ouest");
    await lot.getByLabel("E-mail du négoce").fill(`ardoisiere-${unique()}@negoce.example.com`);
    await lot.getByLabel(/Prix négocié HT/).fill("1,10");
    await expect(lot.getByText("Prix affiché aux artisans : 1,12 € HT (commission incluse).")).toBeVisible();
    await lot.getByLabel("Valable jusqu'au").fill(dansTroisSemaines());
    await lot.getByRole("button", { name: "Enregistrer l'offre" }).click();
    await lot.getByRole("button", { name: "Envoyer l'offre à tous" }).click();
    await expect(lot.getByText("0 acceptation sur 1")).toBeVisible();

    // L'artisan : le négoce masqué, les mentions, « J'accepte » vaut commande ferme ; le bon de commande.
    await page.reload();
    const offre = page.getByLabel("Offre négociée");
    await expect(offre.getByText(`Négoce vérifié dans le ${zone}`)).toBeVisible();
    await expect(offre.getByText("Négocié pour vous par Mobiiz")).toBeVisible();
    await expect(offre.getByText("Commission Mobiiz incluse dans le prix")).toBeVisible();
    await expect(offre.getByText("Ardoisière de l'Ouest")).toHaveCount(0);
    await offre.getByRole("button", { name: "J'accepte" }).click();
    await expect(besoin.getByText("Commandé")).toBeVisible();
    await expect(besoin.getByText(/Chez Ardoisière de l'Ouest/)).toBeVisible();
    await expect(besoin.getByRole("button", { name: "Mon bon de commande" })).toBeVisible();

    // Le chasseur voit l'acceptation et transmet le lot total.
    await ch.reload();
    await expect(lot.getByText("1 acceptation sur 1")).toBeVisible();
    await lot.getByRole("button", { name: "Transmettre la commande au négoce" }).click();
    await expect(lot).toHaveCount(0);
    await ctx.close();
  });

  test("« Préviens ton négoce » après le premier envoi à un négoce qui n'a jamais répondu", async ({ page }, info) => {
    const zone = zoneDe(info.project.name);
    const projectId = await inscrire(page, `artisan-${unique()}@example.fr`, zone, [{ libelle: ARDOISE, quantite: "500", unite: "pièces" }]);
    await page.goto(`/chantiers/${projectId}`);
    await page.getByRole("button", { name: "Envoyer à mes négoces" }).click();
    const form = page.getByLabel("Envoyer à mes négoces").first();
    await form.getByLabel("Nom du négoce").fill("Négoce Nouveau");
    await form.getByLabel("E-mail").fill(`nouveau-${unique()}@negoce.example.com`);
    await form.getByRole("button", { name: "Ajouter ce négoce" }).click();
    // L'accord d'identité est coché d'office.
    await expect(form.getByRole("checkbox", { name: /J'accepte que mon nom/ })).toBeChecked();
    await form.getByRole("button", { name: /^Envoyer/ }).last().click();
    const previens = page.getByLabel("Préviens ton négoce");
    await expect(previens.getByText(/Ton négoce ne connaît pas encore Mobiiz/)).toBeVisible();
    await expect(previens.getByRole("link", { name: "SMS" })).toHaveAttribute("href", /^sms:.*body=Salut%2C%20je%20t'envoie%20ma%20demande%20de%20prix%20par%20Mobiiz/);
    await previens.getByRole("button", { name: "Je l'ai déjà prévenu" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Ta demande est partie" })).toBeVisible();
  });

  test("/couvreurs : la même page, la couverture d'abord, et les chasseurs d'opportunités", async ({ page }) => {
    await page.goto("/couvreurs");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ton devis.");
    await expect(page.getByText("Pour les couvreurs")).toBeVisible();
    await expect(page.getByText(/ardoise, zinc, bois de charpente/i).first()).toBeVisible();
    await expect(page.getByText("Des chasseurs d'opportunités négocient pour toi.")).toBeVisible();
    await expect(page.getByText(/paient le juste prix/)).toBeVisible();
  });
});
