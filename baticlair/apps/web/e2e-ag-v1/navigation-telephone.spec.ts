import { expect, test, type Page } from "@playwright/test";
import { confirmerEmail } from "../e2e/confirmer-email";

/**
 * NAVIGATION DÉFINITIVE DU TÉLÉPHONE (Greg, 18 novembre 2026, « on fige après ») : Accueil · Demandes · ＋ · Groupés ·
 * Messages. Le ＋ ouvre « Créer » (Nouveau quantitatif, Besoin groupé, Mission), fermée par la croix, le voile, Échap ou
 * le retour. Demandes : Négoces / Groupées. Groupés : les regroupements ouverts près de moi, sans bouton flottant.
 * Messages : la pastille des non-lus. L'ordinateur garde sa colonne. Les anciens liens marchent.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const telephone = () => test.info().project.name !== "ordinateur";

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

async function inscrire(page: Page) {
  const email = `artisan-${unique()}@example.fr`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Lise Martin");
  await page.getByLabel("Nom de ton entreprise").fill(`Toitures ${unique()}`);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: /^Bonjour Lise/ }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  expect((await apiJson(page, "POST", "/v1/me/guide/vu")).status).toBeLessThan(300);
  expect((await apiJson(page, "PATCH", "/v1/company/profile", { address: "3 rue des Ajoncs, 35000 Rennes", siret: "73282932000074", phone: "0299000000", email: null })).status).toBe(200);
  await confirmerEmail(page, email);
  await page.goto("/");
}

test("téléphone : Accueil · Demandes · ＋ · Groupés · Messages ; la carte du ＋ et ses trois tuiles", async ({ page }) => {
  test.skip(!telephone(), "la barre du bas est celle du téléphone");
  test.setTimeout(120_000);
  await inscrire(page);
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  await expect(nav.getByRole("link")).toHaveText(["Accueil", "Demandes", "Groupés", "Messages"]);
  const plus = nav.getByRole("button", { name: "Créer" });
  await expect(plus).toBeVisible();
  // Le ＋ est au centre, plus haut que la barre ; chaque libellé tient sur une ligne, dans l'écran.
  const [b, barre] = [(await plus.boundingBox())!, (await nav.locator(":scope > div").boundingBox())!];
  expect(b.y).toBeLessThan(barre.y);
  expect(Math.abs(b.x + b.width / 2 - (barre.x + barre.width / 2))).toBeLessThanOrEqual(4);
  for (const l of await nav.getByRole("link").all()) {
    const lignes = await l.evaluate((a) => {
      const t = a.querySelector(":scope > span.text-center")!;
      const r = document.createRange();
      r.selectNodeContents(t);
      return { lignes: r.getClientRects().length, fin: a.getBoundingClientRect().right };
    });
    expect(lignes.lignes).toBe(1);
    expect(lignes.fin).toBeLessThanOrEqual(page.viewportSize()!.width);
  }

  // La carte : trois tuiles ; la croix, Échap, le voile et le retour la ferment, sans quitter l'écran.
  const carte = page.getByRole("dialog", { name: "Créer" });
  await plus.click();
  await expect(carte.getByRole("button", { name: "Fermer" })).toBeVisible();
  await expect(carte.getByRole("button").filter({ hasText: /\S/ })).toHaveText([/^Nouveau quantitatif/, /^Besoin groupé/, /^Mission/]);
  await expect(nav.getByRole("button", { name: "Fermer" })).toHaveAttribute("aria-expanded", "true");
  await carte.getByRole("button", { name: "Fermer" }).click();
  await expect(carte).toHaveCount(0);
  await plus.click();
  await page.keyboard.press("Escape");
  await expect(carte).toHaveCount(0);
  await plus.click();
  await page.mouse.click(20, 40);
  await expect(carte).toHaveCount(0);
  await plus.click();
  await page.goBack();
  await expect(carte).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
  // Chaque tuile ouvre son écran.
  for (const [tuile, url] of [
    [/^Nouveau quantitatif/, /\/chantiers\/nouveau$/],
    [/^Besoin groupé/, /\/achats-groupes\/publier$/],
    [/^Mission/, /\/missions$/],
  ] as const) {
    await page.goto("/");
    await plus.click();
    await carte.getByRole("button", { name: tuile }).click();
    await expect(page).toHaveURL(url);
    await expect(carte).toHaveCount(0);
  }
});

test("Demandes (Négoces / Groupées), Groupés sans bouton flottant, Messages et sa pastille ; les anciens liens marchent", async ({ page }) => {
  test.setTimeout(150_000);
  await inscrire(page);
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  if (telephone()) {
    await nav.getByRole("link", { name: "Demandes" }).click();
    await expect(page).toHaveURL(/\/demandes$/);
    await expect(nav.getByRole("link", { name: "Demandes" })).toHaveAttribute("aria-current", "page");
  } else {
    // Ordinateur : la colonne ne change pas.
    await expect(nav.getByRole("link")).toHaveText(["Créer un quantitatif", "Accueil", "Quantitatifs", "Achats groupés", /Missions/, "Mon site", "Mes négoces", "Profil"]);
    await page.goto("/demandes");
  }
  const sortes = page.getByRole("tablist", { name: "Sorte de demandes" });
  await expect(sortes.getByRole("tab")).toHaveText(["Négoces", "Groupées"]);
  await expect(sortes.getByRole("tab", { name: "Négoces" })).toHaveAttribute("aria-selected", "true");
  // Les états des demandes de prix restent, en filtres secondaires.
  await expect(page.getByRole("button", { name: "Réponses reçues" }).or(page.getByRole("link", { name: "Réponses reçues" })).first()).toBeVisible();
  await sortes.getByRole("tab", { name: "Groupées" }).click();
  await expect(page).toHaveURL(/\/demandes\?type=groupees$/);
  await expect(page.getByText("Aucun besoin groupé pour le moment")).toBeVisible();

  // Groupés : ce qui se passe autour de moi, sans « Mes besoins » ni bouton flottant sur téléphone.
  await page.goto("/achats-groupes");
  await expect(page.getByRole("heading", { name: "Regroupements ouverts" })).toBeVisible();
  await expect(page.getByRole("searchbox")).toBeVisible();
  if (telephone()) {
    await expect(nav.getByRole("link", { name: "Groupés" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("button", { name: /Publier un besoin/ }).filter({ visible: true })).toHaveCount(0);
  }

  // Messages : une demande reçue sur mon site allume la pastille ; l'ouvrir l'éteint.
  expect((await apiJson(page, "PATCH", "/v1/ma-page", { visible: true })).status).toBe(200);
  const adresse = (await apiJson<{ reglages: { adresse: string } }>(page, "GET", "/v1/ma-page")).body.reglages.adresse;
  expect((await apiJson(page, "POST", `/v1/public/pages/${adresse}/contact`, { nom: "Paul Client", telephone: "0600000000", message: "Une fuite sur mon toit" })).status).toBe(200);
  await page.goto("/");
  if (telephone()) {
    await expect(nav.getByRole("link", { name: "Messages" }).getByLabel("1 non lu")).toBeVisible();
    await nav.getByRole("link", { name: "Messages" }).click();
  } else await page.goto("/messages");
  await page.getByRole("link", { name: /^Mon site, Paul Client, non lu/ }).click();
  await expect(page.getByText("Une fuite sur mon toit")).toBeVisible();
  // Et la cloche l'a dit aussi.
  const alertes = (await apiJson<{ items: { titre: string }[] }>(page, "GET", "/v1/alertes")).body.items.map((a) => a.titre);
  expect(alertes).toContain("Nouvelle demande depuis ton site");
  if (telephone()) {
    await page.goto("/");
    await expect(nav.getByRole("link", { name: "Messages" }).getByLabel(/non lu/)).toHaveCount(0);
  }

  // Les anciens liens marchent toujours.
  await page.goto("/chantiers?vue=suivi");
  await expect(page.getByRole("heading", { name: "Mes demandes", level: 1 })).toBeVisible();
  await page.goto("/achats-groupes/mes-besoins");
  await expect(page.getByRole("heading", { name: "Mes besoins groupés", level: 1 })).toBeVisible();
  await page.goto("/chantiers");
  await expect(page.getByRole("heading", { name: "Quantitatifs", level: 1 })).toBeVisible();
});
