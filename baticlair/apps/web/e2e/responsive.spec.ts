import { expect, test, type Page } from "@playwright/test";

/**
 * PASSE RESPONSIVE (lot B) : chaque écran du parcours tient sur un téléphone, une tablette (portrait et paysage) et un
 * ordinateur, sans défilement horizontal ni bouton coupé. Les captures (test-results/responsive) servent à relire la
 * mise en page ; le test casse si une page déborde en largeur.
 */
const WIDTHS = [
  { name: "telephone", width: 375, height: 812 },
  { name: "tablette", width: 768, height: 1024 },
  { name: "tablette-paysage", width: 1024, height: 768 },
  { name: "ordinateur", width: 1440, height: 900 },
] as const;

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Aucune page ne défile en largeur, et aucun bouton visible ne sort de l'écran. */
async function fits(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const wide = document.documentElement.scrollWidth > width + 1;
    const cut = [...document.querySelectorAll("button, a")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && style.visibility !== "hidden" && (r.right > width + 1 || r.left < -1);
      })
      .map((el) => (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40));
    return { wide, cut };
  });
  expect(overflow, label).toEqual({ wide: false, cut: [] });
}

async function shoot(page: Page, size: string, name: string) {
  await page.screenshot({ path: `test-results/responsive/${size}-${name}.png`, fullPage: true });
  await fits(page, `${size} · ${name}`);
}

for (const size of WIDTHS) {
  test(`responsive ${size.name} (${size.width} px) : du compte à la comparaison, rien ne déborde`, async ({ page }, info) => {
    test.skip(info.project.name !== "ordinateur", "Une passe par largeur suffit (les largeurs sont fixées ici).");
    await page.setViewportSize({ width: size.width, height: size.height });

    await page.goto("/connexion");
    await shoot(page, size.name, "01-connexion");
    await page.getByRole("link", { name: "Créer un compte" }).click();
    await shoot(page, size.name, "02-inscription");
    await page.getByLabel("Prénom et nom").fill("Jean Martin");
    await page.getByLabel("Nom de ton entreprise").fill("Toitures Martin");
    await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
    await page.getByLabel("E-mail professionnel").fill(`responsive-${unique()}@example.fr`);
    await page.getByLabel("Mot de passe").fill("motdepasse-solide");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByRole("heading", { name: /^Bonjour Jean/ })).toBeVisible();
    await shoot(page, size.name, "03-accueil");

    await page.goto("/chantiers/nouveau");
    await expect(page.getByLabel("Choisir le devis (PDF)")).toBeVisible();
    await shoot(page, size.name, "04-nouveau-chantier");

    await page.goto("/");
    await page.getByRole("button", { name: "Lancer la démonstration" }).click();
    await expect(page.getByRole("heading", { name: "Démo – Toiture Martin" })).toBeVisible();
    // §48 : la lecture part d'elle-même ; l'écran des questions (s'il y en a) passe par « Calculer ma liste ».
    const questions = page.getByRole("region", { name: /^J'ai quelques questions/ });
    const list = page.getByRole("region", { name: "Liste des fournitures" });
    await expect(list.or(questions).first()).toBeVisible({ timeout: 60_000 });
    if (await questions.isVisible()) {
      await shoot(page, size.name, "05a-questions");
      await page.getByRole("button", { name: /^Calculer ma liste/ }).click();
    }
    await expect(list.getByText(/^\d+ fournitures · tout est prêt$/)).toBeVisible();
    await shoot(page, size.name, "05-liste-des-fournitures");

    await page.getByRole("button", { name: "Envoyer au fournisseur" }).click();
    const apercu = page.getByRole("dialog", { name: "Aperçu de la demande de devis" });
    await expect(apercu).toBeVisible();
    await shoot(page, size.name, "06-apercu-envoi");
    for (const name of ["Tuilerie de l'Ouest (démo)", "Négoce Breizh (démo)", "Matériaux Atlantique (démo)"]) {
      await apercu.getByRole("checkbox", { name: new RegExp(name.replace(/[()]/g, "\\$&")) }).check();
    }
    await apercu.getByRole("button", { name: "Envoyer", exact: true }).click();
    const cards = page.getByRole("list", { name: "Tes fournisseurs" }).getByRole("listitem");
    await expect(cards.first()).toBeVisible();
    await shoot(page, size.name, "07-apres-envoi");

    for (const name of ["Tuilerie de l'Ouest", "Négoce Breizh", "Matériaux Atlantique"]) {
      const card = cards.filter({ hasText: name });
      await card.getByRole("button", { name: "Simuler sa réponse (démo)" }).click();
      await expect(card.getByText("Devis reçu")).toBeVisible();
    }
    await page.getByRole("button", { name: "Comparer les offres" }).click();
    await expect(page.locator("section#comparer").getByRole("button", { name: "Retenir cette offre" }).first()).toBeVisible();
    await shoot(page, size.name, "08-comparaison");

    await page.goto("/chantiers");
    await expect(page.getByText("Démo – Toiture Martin").first()).toBeVisible();
    await shoot(page, size.name, "09-chantiers");
    await page.goto("/fournisseurs");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await shoot(page, size.name, "10-fournisseurs");
    await page.goto("/compte");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await shoot(page, size.name, "11-compte");
  });
}
