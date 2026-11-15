import { expect, test, type Page } from "@playwright/test";
import { confirmerEmail } from "../e2e/confirmer-email";

/**
 * REVUE, LOT D (Greg, 26 octobre puis 16 novembre 2026) : cinq tailles d'écran (petit téléphone, iPhone, grand téléphone,
 * tablette, ordinateur). Sur chaque écran principal, à chaque taille : aucun débordement horizontal ; au doigt (moins de
 * 1024 px), chaque bouton et chaque lien-bouton fait au moins 44 px de haut. Un lien dans une phrase n'est pas un bouton.
 */
const TAILLES = [
  { nom: "petit téléphone", width: 320, height: 568 },
  { nom: "iPhone", width: 375, height: 667 },
  { nom: "grand téléphone", width: 414, height: 896 },
  { nom: "tablette", width: 768, height: 1024 },
  { nom: "ordinateur", width: 1280, height: 800 },
] as const;

const ECRANS_PUBLICS = ["/connexion", "/inscription", "/mot-de-passe-oublie", "/tarifs", "/negoce/connexion"];
const ECRANS = ["/", "/chantiers", "/chantiers?vue=suivi", "/chantiers/nouveau", "/chantiers/nouveau?mode=saisie", "/achats-groupes", "/missions", "/fournisseurs", "/mes-prix", "/compte", "/abonnement", "/notifications"];

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function apiJson(page: Page, method: string, url: string, body?: unknown): Promise<number> {
  return page.evaluate(
    async ({ method, url, body }) => {
      const companyId = localStorage.getItem("baticlair.companyId");
      const res = await fetch(url, { method, headers: { "content-type": "application/json", accept: "application/json", ...(companyId ? { "x-company-id": companyId } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return res.status;
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
  expect(await apiJson(page, "POST", "/v1/me/guide/vu")).toBeLessThan(300);
  expect(await apiJson(page, "PATCH", "/v1/company/profile", { address: "3 rue des Ajoncs, 35000 Rennes", siret: "73282932000074", phone: null, email: null })).toBe(200);
  await confirmerEmail(page, email);
}

/** Les défauts d'un écran à une taille : débordement, et cibles trop petites au doigt. */
async function defauts(page: Page, tactile: boolean): Promise<string[]> {
  return page.evaluate((tactile) => {
    const vus: string[] = [];
    const trop = document.documentElement.scrollWidth - window.innerWidth;
    if (trop > 0) vus.push(`déborde de ${trop} px`);
    if (!tactile) return vus;
    for (const e of document.querySelectorAll<HTMLElement>("button, a[href], [role='button'], select, input:not([type='checkbox']):not([type='radio']):not([type='hidden']):not([type='file'])")) {
      const s = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || s.visibility === "hidden" || e.closest("[aria-hidden='true']") || e.closest(".sr-only")) continue;
      // Un lien dans une phrase se lit, il ne se vise pas comme un bouton.
      if (e.tagName === "A" && s.display === "inline") continue;
      // Hors de l'écran (panneau fermé, lien d'évitement) : pas une cible.
      if (r.right <= 0 || r.left >= window.innerWidth) continue;
      if (r.height < 43.5) vus.push(`« ${(e.getAttribute("aria-label") ?? e.textContent ?? e.getAttribute("name") ?? e.tagName).trim().replace(/\s+/g, " ").slice(0, 50)} » : ${Math.round(r.height)} px de haut`);
    }
    return [...new Set(vus)];
  }, tactile);
}

test("cinq tailles d'écran : rien ne déborde, les boutons font 44 px au doigt", async ({ page }) => {
  test.skip(test.info().project.name !== "ordinateur", "Ce parcours règle lui-même ses cinq tailles : une fois suffit.");
  test.setTimeout(600_000);
  const constat: string[] = [];
  const passer = async (ecrans: string[]) => {
    for (const ecran of ecrans) {
      for (const t of TAILLES) {
        await page.setViewportSize({ width: t.width, height: t.height });
        await page.goto(ecran);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(150);
        for (const d of await defauts(page, t.width < 1024)) constat.push(`${ecran} (${t.nom}, ${t.width} px) : ${d}`);
      }
    }
  };
  await passer(ECRANS_PUBLICS);
  await page.setViewportSize({ width: 1280, height: 800 });
  await inscrire(page);
  await passer(ECRANS);
  expect(constat, constat.join("\n")).toEqual([]);
});
