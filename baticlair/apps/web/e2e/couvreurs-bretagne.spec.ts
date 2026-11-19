import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { TRACES_DEPARTEMENTS } from "../src/lib/regions/carte-france";
import { PAGES_LOCALES } from "../src/lib/regions/pages";

/**
 * LA PAGE « COUVREURS DE BRETAGNE » ET L'INSCRIPTION PAR MÉTIER (Greg, 19 novembre 2026) :
 * - la carte : chaque département se touche, se retient, et dit les regroupements en cours (jamais « 0 ») ;
 * - le département touché arrive rempli à l'inscription et part avec l'entreprise ;
 * - à l'inscription, « Couvreur » est ouvert, tout autre métier est « Bientôt disponible » et mène à la liste d'attente ;
 * - la liste d'attente se lit dans l'espace admin, par métier et par département.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const DEPARTEMENTS = [
  { code: "22", nom: "Côtes-d'Armor", dans: "dans les Côtes-d'Armor" },
  { code: "29", nom: "Finistère", dans: "dans le Finistère" },
  { code: "35", nom: "Ille-et-Vilaine", dans: "en Ille-et-Vilaine" },
  { code: "56", nom: "Morbihan", dans: "dans le Morbihan" },
] as const;

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
});


test("chaque fiche : chaque phrase de l'histoire a au moins deux sources connues, chaque photo existe avec son crédit, chaque département a son tracé", () => {
  for (const fiche of PAGES_LOCALES) {
    const ids = new Set(fiche.sources.map((s) => s.id));
    for (const c of fiche.histoire.chapitres)
      for (const p of c.paragraphes) {
        expect(new Set(p.sources).size, p.texte).toBeGreaterThanOrEqual(2);
        for (const s of p.sources) expect(ids.has(s), `${s} : ${p.texte}`).toBe(true);
      }
    for (const photo of [fiche.emblematique.photo, ...fiche.ambiance.photos]) {
      expect(existsSync(path.join(__dirname, "..", "public", photo.src)), photo.src).toBe(true);
      expect(photo.credit).toMatch(/^Photo : .+, CC/);
      expect(photo.source).toMatch(/^https:\/\//);
    }
    for (const d of fiche.region.departements) expect(TRACES_DEPARTEMENTS[d.code]?.d.length ?? 0, d.code).toBeGreaterThan(100);
    // Jamais de montant ni de promesse chiffrée sur une page locale.
    const texte = JSON.stringify({ ...fiche, sources: [] });
    expect(texte).not.toMatch(/\d\s?€|deux fois moins cher|\bIA\b|automatique/i);
  }
});

test("la page : son titre, sa description et ses données structurées propres ; une autre adresse reste introuvable", async ({ page }) => {
  await page.goto("/couvreurs-bretagne");
  await expect(page).toHaveTitle("Couvreurs de Bretagne : quantitatif et achats groupés · Mobiiz");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/couvreurs.*de Bretagne/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Couvreur en Bretagne/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/couvreurs-bretagne$/);
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  const donnees = JSON.parse(ld!) as { "@type": string }[];
  expect(donnees.map((d) => d["@type"])).toEqual(["WebPage", "BreadcrumbList", "FAQPage"]);
  await expect(page.getByRole("img", { name: "Gwenn-ha-du, le drapeau breton" })).toBeVisible();
  // Pas d'autre région ni de menu des régions tant que la Bretagne n'est pas validée.
  expect((await page.request.get("/plombiers-normandie")).status()).toBe(404);
  await page.goto("/");
  await expect(page.locator('a[href="/couvreurs-bretagne"]')).toHaveCount(0);
});

test("la carte : chaque département se touche, se retient, et dit ses regroupements sans jamais afficher « 0 »", async ({ page }) => {
  await page.goto("/couvreurs-bretagne");
  await expect(page.getByText("Tu travailles où ? Touche ton département.")).toBeVisible();
  for (const d of DEPARTEMENTS) {
    // Le tracé de la carte, au doigt.
    await page.locator(`g[data-departement="${d.code}"]`).click();
    await expect(page.locator(`g[data-departement="${d.code}"]`)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(`button[data-pastille="${d.code}"]`)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(`Je suis ${d.dans}`)).toBeVisible();
    const bloc = page.locator("#regroupements");
    await expect(bloc.getByRole("heading", { name: `Regroupements en cours ${d.dans}` })).toBeVisible();
    await expect(bloc).toHaveAttribute("data-etat", /^(aucun|en-cours)$/);
    if ((await bloc.getAttribute("data-etat")) === "aucun") await expect(bloc.getByText("Sois le premier à lancer un regroupement dans ton département.")).toBeVisible();
    await expect(bloc).not.toContainText(/\b0\b/);
    // Le bouton d'inscription suit le département.
    await expect(page.locator("#heroPrimaryCTA")).toHaveAttribute("href", `/inscription?metier=roofing&departement=${d.code}&depuis=couvreurs-bretagne`);
  }
  // Les pastilles, au pouce ou au clavier, font la même chose.
  await page.locator('button[data-pastille="22"]').click();
  await expect(page.locator('g[data-departement="22"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('g[data-departement="29"]')).toHaveAttribute("aria-pressed", "false");
  // Retenu : la page rouverte garde le département.
  await page.reload();
  await expect(page.getByText("Je suis dans les Côtes-d'Armor")).toBeVisible();
});

test("le département touché arrive rempli à l'inscription et part avec l'entreprise", async ({ page }) => {
  await page.goto("/couvreurs-bretagne");
  await page.locator('g[data-departement="29"]').click();
  await page.locator("#heroPrimaryCTA").click();
  await expect(page).toHaveURL(/\/inscription\?metier=roofing&departement=29/);
  await expect(page.getByRole("button", { name: /^Couvreur/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Ton département")).toHaveValue("29");
  const email = `couvreur-${unique()}@example.fr`;
  await page.getByLabel("Prénom et nom").fill("Yann Le Goff");
  await page.getByLabel("Nom de ton entreprise").fill(`Toitures ${unique()}`);
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  const creation = page.waitForRequest((r) => r.url().endsWith("/v1/companies") && r.method() === "POST");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  expect((await creation).postDataJSON()).toMatchObject({ trades: ["roofing"], departement: "29" });
  await expect(page.getByRole("heading", { name: "Voici ton adresse Mobiiz :" })).toBeVisible();
});

test("sans passer par la carte, l'inscription générale propose « Couvreur » d'office et reprend le département retenu", async ({ page }) => {
  await page.goto("/couvreurs-bretagne");
  await page.locator('button[data-pastille="56"]').click();
  await page.goto("/inscription");
  await expect(page.getByRole("button", { name: /^Couvreur/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Ton département")).toHaveValue("56");
});

test("à l'inscription complète, un autre métier entre aussi, avec le message « en rodage » (RÈGLE CHANGÉE le 19 novembre 2026)", async ({ page }) => {
  await page.goto("/inscription?departement=22");
  const elec = page.getByRole("button", { name: "Électricien", exact: true });
  await elec.click();
  await expect(elec).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status")).toContainText("Mobiiz est réglé d'abord pour les couvreurs.");
  // Le formulaire de compte reste : il entre dans l'appli.
  await expect(page.getByLabel("Mot de passe")).toBeVisible();
  await expect(page.getByText("Bientôt disponible")).toHaveCount(0);
});

test("la page Bretagne n'est pas indexée et n'est liée nulle part", async ({ page }) => {
  await page.goto("/couvreurs-bretagne");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  for (const chemin of ["/", "/commencer", "/tarifs"]) {
    await page.goto(chemin);
    await expect(page.locator('a[href*="couvreurs-bretagne"]')).toHaveCount(0);
  }
});
