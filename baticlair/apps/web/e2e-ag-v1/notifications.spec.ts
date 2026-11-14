import { expect, test, type Page } from "@playwright/test";
import { confirmerEmail } from "../e2e/confirmer-email";

/**
 * NOTIFICATIONS COHÉRENTES ET SUPPRIMABLES (Greg, 12 novembre 2026, dossier de corrections UX, point 2).
 * La pastille de la cloche ne signale que du nouveau pas encore vu : elle s'éteint après consultation et reste éteinte
 * après actualisation. Une notification se retire par son bouton (clavier, ordinateur) ou par glissement (téléphone),
 * avec « Annuler ». La retirer ne retire que l'alerte : le quantitatif reste là.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
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

async function inscrire(page: Page) {
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Greg Exemple");
  await page.getByLabel("Nom de ton entreprise").fill(`Couverture Exemple ${unique()}`);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  const email = `artisan-${unique()}@example.fr`;
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await confirmerEmail(page, email);
}

/** Un glissement du doigt vers la gauche sur la ligne (les événements tactiles réels du navigateur). */
async function glisserAGauche(page: Page, selecteur: string) {
  await page.evaluate(async (sel) => {
    const el = document.querySelector(sel) as HTMLElement;
    const r = el.getBoundingClientRect();
    const y = r.top + r.height / 2;
    const doigt = (x: number) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
    const envoyer = (type: string, x: number, fin = false) => el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: fin ? [] : [doigt(x)], changedTouches: [doigt(x)] }));
    const x0 = r.left + r.width * 0.7;
    envoyer("touchstart", x0);
    for (const d of [20, 60, 100, 140]) {
      envoyer("touchmove", x0 - d);
      await new Promise((ok) => requestAnimationFrame(() => ok(null)));
    }
    envoyer("touchend", x0 - 140, true);
  }, selecteur);
}

test("notifications : la pastille s'éteint une fois vue et le reste ; une notification se retire, s'annule, et ne touche pas au quantitatif", async ({ page }, info) => {
  test.setTimeout(180_000);
  const telephone = info.project.name !== "ordinateur";
  await inscrire(page);
  // Rien à signaler : pas de pastille.
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Notifications", exact: true })).toBeVisible();

  // Un quantitatif validé : il reste à envoyer les demandes. C'est nouveau : la pastille s'allume.
  const q = await apiJson<{ id: string; projetId: string }>(page, "POST", "/v1/quantitatifs", { saisie: "lignes", lignes: [{ libelle: "Ardoise naturelle 32x22 Espagne 1er choix 5 mm", quantite: "10", unite: "palettes" }] });
  expect(q.status).toBe(201);
  let courant = (await apiJson<{ questions: { id: string; boutons: { valeur: string }[] }[] }>(page, "GET", `/v1/quantitatifs/${q.body.id}`)).body;
  for (let i = 0; i < 15 && courant.questions.length > 0; i++) {
    const question = courant.questions[0]!;
    courant = (await apiJson<typeof courant>(page, "POST", `/v1/quantitatifs/${q.body.id}/reponses`, { reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await apiJson(page, "POST", `/v1/quantitatifs/${q.body.id}/validation`)).status).toBe(200);
  await page.goto("/");
  const cloche = page.getByRole("link", { name: /^Notifications/ });
  await expect(cloche).toHaveAccessibleName("Notifications : 1 nouvelle");
  await expect(page.locator("[data-pastille=cloche]")).toBeVisible();

  // Consultée : la ligne est là (la chose reste à faire), la pastille s'éteint sans recharger…
  await cloche.click();
  await expect(page.getByRole("heading", { name: "À ne pas manquer" })).toBeVisible();
  const liste = page.getByRole("list", { name: "Notifications" });
  await expect(liste.getByRole("link")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Notifications", exact: true })).toBeVisible();
  await expect(page.locator("[data-pastille=cloche]")).toHaveCount(0);
  // … et reste éteinte après actualisation, sur l'accueil comme ici.
  await page.reload();
  await expect(liste.getByRole("link")).toHaveCount(1);
  await expect(page.locator("[data-pastille=cloche]")).toHaveCount(0);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Notifications", exact: true })).toBeVisible();
  await expect(page.locator("[data-pastille=cloche]")).toHaveCount(0);

  // Retirer par le bouton (accessible au clavier), puis « Annuler » : la ligne revient.
  await page.goto("/notifications");
  const retirer = liste.getByRole("button", { name: /^Supprimer la notification : / });
  await retirer.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Notification supprimée.");
  await expect(page.getByText("Rien de nouveau")).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(liste.getByRole("link")).toHaveCount(1);

  if (telephone) {
    // Le glissement révèle « Supprimer » sans ouvrir la notification par erreur.
    await glisserAGauche(page, "ul[aria-label=Notifications] li > div");
    await expect(page).toHaveURL(/\/notifications$/);
    await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  } else {
    await retirer.click();
  }
  await expect(page.getByText("Rien de nouveau")).toBeVisible();
  // Aucun débordement horizontal, même ligne glissée.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  // Retirée pour de bon après actualisation ; la pastille ne se rallume pas ; le quantitatif n'a pas bougé.
  await page.reload();
  await expect(page.getByText("Rien de nouveau")).toBeVisible();
  await expect(page.locator("[data-pastille=cloche]")).toHaveCount(0);
  expect((await apiJson(page, "GET", `/v1/quantitatifs/${q.body.id}`)).status).toBe(200);
  await page.goto(`/chantiers/${q.body.projetId}`);
  await expect(page.getByRole("heading").first()).toBeVisible();
  expect((await apiJson<{ masquees: string[] }>(page, "GET", "/v1/alertes/a-faire")).body.masquees).toHaveLength(1);
});
