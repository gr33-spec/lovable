import { expect, type Locator, type Page } from "@playwright/test";

/**
 * LA DISCUSSION DES QUESTIONS (Greg, 16 novembre 2026) : un seul écran, une question à la fois, ses boutons sous la bulle.
 * `choisir` reçoit le texte de la question posée et rend le nom du bouton à toucher ; sans choix : « Je façonne » sur un
 * façonnage (obligatoire), sinon la valeur marquée « par défaut », sinon « Je ne sais pas ». S'arrête quand « Calculer ma
 * liste » est proposé dans le fil (sans le toucher).
 */
export const zoneDesQuestions = (page: Page) => page.getByRole("region", { name: "Les questions" });
/** Les boutons de la question posée (le groupe porte le texte de la question). */
export const boutonsDeLaQuestion = (page: Page) => zoneDesQuestions(page).locator('[role="group"]:not([aria-label$="MOBIIZ"])');
export const calculerMaListe = (page: Page) => page.getByRole("button", { name: "Calculer ma liste", exact: true });

/** Le nom du bouton à toucher ; `true` : la fonction a répondu elle-même (au clavier) ; rien : le choix par défaut. */
type Choix = string | RegExp | Locator | true | null | undefined;

/** L'étape « Suggestions » (Greg, 17 novembre 2026) : la carte à cases qui passe avant les questions. */
export const carteSuggestions = (page: Page) => page.getByRole("group", { name: "Suggestions", exact: true });

/**
 * Passe l'étape « Suggestions » quand elle est là : coche les cases voulues (par défaut les naissances de la gouttière, ce
 * que la liste ajoutait d'office avant l'étape), puis « Continuer ».
 */
export async function passerLesSuggestions(page: Page, cocher: readonly (string | RegExp)[] = [/^Naissances de gouttière/]) {
  const carte = carteSuggestions(page);
  if (!(await carte.isVisible())) return;
  for (const nom of cocher) {
    const c = carte.getByRole("checkbox", { name: nom });
    if ((await c.count()) > 0) await c.first().check({ force: true });
  }
  await carte.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(carte).toBeHidden({ timeout: 15_000 });
}

export async function repondreAuxQuestions(page: Page, choisir: (question: string, boutons: Locator) => Choix | Promise<Choix> = () => null): Promise<string[]> {
  const boutons = boutonsDeLaQuestion(page);
  const calculer = calculerMaListe(page);
  const posees: string[] = [];
  for (let i = 0; i < 60; i++) {
    await expect(calculer.or(boutons).or(carteSuggestions(page)).first()).toBeVisible({ timeout: 15_000 });
    if (await carteSuggestions(page).isVisible()) {
      await passerLesSuggestions(page);
      continue;
    }
    if (await calculer.isVisible()) return posees;
    const question = (await boutons.getAttribute("aria-label")) ?? "";
    posees.push(question);
    const reponses = zoneDesQuestions(page).getByRole("button", { name: /^Modifier ma réponse/ });
    const avant = await reponses.count();
    const voulu = await choisir(question, boutons);
    if (voulu === true) {
      // La question suivante arrive, ou « Calculer ma liste » quand c'était la dernière.
      await expect.poll(async () => ((await boutons.count()) === 0 ? null : await boutons.getAttribute("aria-label"))).not.toBe(question);
      continue;
    }
    const faconne = boutons.getByRole("button", { name: /^Je façonne/ });
    const defaut = boutons.getByRole("button", { name: /par défaut$/ });
    const bouton = voulu && typeof voulu === "object" && "click" in voulu ? voulu : voulu ? boutons.getByRole("button", { name: voulu as string | RegExp }).first() : (await faconne.count()) > 0 ? faconne.first() : (await defaut.count()) > 0 ? defaut.first() : boutons.getByRole("button", { name: "Je ne sais pas", exact: true });
    await bouton.click();
    // La réponse devient un message de l'artisan ; la question suivante (ou « Calculer ma liste ») arrive.
    await expect(reponses).toHaveCount(avant + 1);
  }
  throw new Error("La discussion ne finit pas : plus de 60 questions.");
}

/** Écrit une réponse dans la barre du bas et l'envoie. */
export async function ecrireDansLaDiscussion(page: Page, texte: string) {
  const barre = page.getByRole("dialog", { name: "Questions de Mobiiz" });
  await barre.getByRole("textbox").fill(texte);
  await barre.getByRole("button", { name: "Envoyer le message" }).click();
}

/**
 * « Calculer ma liste », puis le récapitulatif de la discussion et « Voir ma liste » (Greg, 16 novembre 2026). Si le calcul
 * rouvre une question (deuxième vague) ou est refusé, rien n'est touché : l'appelant continue la discussion.
 */
export async function calculerEtVoirMaListe(page: Page) {
  await calculerMaListe(page).click();
  await voirMaListe(page);
}

/** Le récapitulatif, quand il arrive : « Voir ma liste ». */
export async function voirMaListe(page: Page) {
  const voir = page.getByRole("button", { name: "Voir ma liste", exact: true });
  await expect(voir.or(boutonsDeLaQuestion(page)).or(page.getByRole("region", { name: "Page des fournitures" })).first()).toBeVisible({ timeout: 60_000 });
  if (await voir.isVisible()) await voir.click();
}
