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
/** La question de l'égout (Greg, 21 novembre 2026), posée quand le devis d'ardoise n'écrit pas de gouttière : « Oui » / « Non ». */
export const QUESTION_EGOUT = "Tes m² d'ardoise comprennent déjà l'égout et les coupes ?";
export const calculerMaListe = (page: Page) => page.getByRole("button", { name: "Calculer ma liste", exact: true });

/** Le calcul est fini : le récapitulatif (« Voir ma liste ») ou la page des fournitures. */
const listePrete = (page: Page) => page.getByRole("button", { name: "Voir ma liste", exact: true }).or(page.getByRole("region", { name: "Page des fournitures" }));
/** Le nom du bouton à toucher ; `true` : la fonction a répondu elle-même (au clavier) ; rien : le choix par défaut. */
type Choix = string | RegExp | Locator | true | null | undefined;

/**
 * L'étape « Suggestions » (Greg, 17 novembre 2026) : la carte à cases. Règle changée le 18 novembre 2026 : elle arrive à la
 * fin, après la dernière question et avant « Calculer ma liste » (avant : après la lecture, avant les questions).
 */
export const carteSuggestions = (page: Page) => page.getByRole("group", { name: "Suggestions", exact: true });

/**
 * Passe l'étape « Suggestions » quand elle est là : coche les cases voulues (par défaut les naissances de la gouttière, ce
 * que la liste ajoutait d'office avant l'étape), puis « Continuer ».
 */
export async function passerLesSuggestions(page: Page, cocher: readonly (string | RegExp)[] = [/^Naissances de gouttière/]) {
  const carte = carteSuggestions(page);
  if (!(await carte.isVisible())) return;
  // Règle changée (Greg, 21 novembre 2026) : la sortie de ventilation, quand elle est proposée, porte ce nom exact, décochée.
  const ventilation = carte.getByRole("checkbox", { name: /^Sortie de ventilation/ });
  if ((await ventilation.count()) > 0) {
    await expect(ventilation).toHaveCount(1);
    await expect(carte.getByRole("checkbox", { name: SORTIE_DE_VENTILATION, exact: true })).not.toBeChecked();
  }
  for (const nom of cocher) {
    // Comme l'artisan : on touche la ligne (large), pas la case elle-même.
    const c = carte.getByRole("checkbox", { name: nom });
    if ((await c.count()) > 0 && !(await c.first().isChecked())) await carte.locator("label").filter({ hasText: nom }).first().click();
  }
  await carte.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(carte).toBeHidden({ timeout: 15_000 });
}

export async function repondreAuxQuestions(
  page: Page,
  choisir: (question: string, boutons: Locator) => Choix | Promise<Choix> = () => null,
  // `true` : s'arrête dès que la carte « Suggestions » est là, sans y toucher (pour la regarder).
  arretAuxSuggestions = false,
): Promise<string[]> {
  const boutons = boutonsDeLaQuestion(page);
  const calculer = calculerMaListe(page);
  const posees: string[] = [];
  for (let i = 0; i < 60; i++) {
    await expect(calculer.or(boutons).or(carteSuggestions(page)).or(listePrete(page)).first()).toBeVisible({ timeout: 15_000 });
    if (await carteSuggestions(page).isVisible()) {
      if (arretAuxSuggestions) return posees;
      await passerLesSuggestions(page);
      continue;
    }
    if (await calculer.isVisible()) return posees;
    // Règle changée (Greg, 21 novembre 2026) : un devis sans question peut avoir l'étape « Suggestions » seule (la sortie de
    // ventilation) ; après « Continuer », le calcul part tout seul et le récapitulatif arrive, sans « Calculer ma liste ».
    if (posees.length === 0 && (await listePrete(page).first().isVisible())) return posees;
    // Entre deux états (la dernière réponse part, « Calculer ma liste » arrive) il n'y a plus de question à lire : on
    // regarde à nouveau l'écran au lieu d'attendre une question qui ne viendra pas (cause trouvée le 18 novembre 2026).
    const lue = await boutons.getAttribute("aria-label", { timeout: 2_000 }).catch(() => null);
    if (lue === null) continue;
    const question = lue;
    posees.push(question);
    const reponses = zoneDesQuestions(page).getByRole("button", { name: /^Modifier ma réponse/ });
    const avant = await reponses.count();
    const voulu = await choisir(question, boutons);
    if (voulu === true) {
      // La question suivante arrive, ou « Calculer ma liste » quand c'était la dernière.
      await expect.poll(async () => ((await boutons.count()) === 0 ? null : await boutons.getAttribute("aria-label"))).not.toBe(question);
      continue;
    }
    // Règle changée (Greg, 21 novembre 2026) : sans gouttière écrite, l'égout se demande (avant : aucune question).
    // Sans choix du parcours, l'artisan répond « Oui » (ses m² comprennent déjà l'égout et les coupes) : rien n'est ajouté.
    if (!voulu && question === QUESTION_EGOUT) {
      await boutons.getByRole("button", { name: "Oui", exact: true }).click();
      await expect(reponses).toHaveCount(avant + 1);
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
  // Sans aucune question posée, le calcul est parti tout seul après l'étape « Suggestions » : il n'y a rien à toucher.
  await expect(calculerMaListe(page).or(listePrete(page)).first()).toBeVisible({ timeout: 60_000 });
  if (await calculerMaListe(page).isVisible()) await calculerMaListe(page).click();
  await voirMaListe(page);
}

/** Le récapitulatif, quand il arrive : « Voir ma liste ». */
export async function voirMaListe(page: Page) {
  const voir = page.getByRole("button", { name: "Voir ma liste", exact: true });
  await expect(voir.or(boutonsDeLaQuestion(page)).or(page.getByRole("region", { name: "Page des fournitures" })).first()).toBeVisible({ timeout: 60_000 });
  if (await voir.isVisible()) await voir.click();
}

/**
 * Règle changée (Greg, 21 novembre 2026) : toute couverture dont le devis n'écrit pas de sortie de toit propose la case
 * « Sortie de ventilation (VMC, extraction d'air) ». Avant : une liste sans gouttière n'avait pas d'étape « Suggestions ».
 */
export const SORTIE_DE_VENTILATION = "Sortie de ventilation (VMC, extraction d'air)";

/**
 * L'étape « Suggestions » avec la seule sortie de ventilation, passée comme le ferait l'artisan : rien de coché, « Continuer ».
 * Vérifie que la carte ne propose que cette case, sous son nom exact.
 */
export async function continuerSansSortieDeVentilation(page: Page) {
  const carte = carteSuggestions(page);
  await expect(carte).toBeVisible({ timeout: 15_000 });
  await expect(carte.getByRole("checkbox")).toHaveCount(1);
  await expect(carte.getByRole("checkbox", { name: SORTIE_DE_VENTILATION, exact: true })).not.toBeChecked();
  await carte.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(carte).toBeHidden({ timeout: 15_000 });
}

/**
 * La même étape pour un parcours qui prépare sa liste par l'API (sans passer par l'écran) : les cases proposées sont lues
 * (`?ecran=1`), comparées à celles attendues, puis « rien de coché » est répondu (`suggestions:choisies` = « aucune »).
 */
export async function continuerSansSuggestionParApi(page: Page, quantitatifId: string, attendues: readonly string[] = [SORTIE_DE_VENTILATION]) {
  const r = await page.evaluate(
    async ({ id }) => {
      const companyId = localStorage.getItem("baticlair.companyId");
      const headers = { "content-type": "application/json", accept: "application/json", ...(companyId ? { "x-company-id": companyId } : {}) };
      const lu = (await (await fetch(`/v1/quantitatifs/${id}?ecran=1`, { headers })).json()) as { ecran?: { suggestions?: { label: string }[] } };
      const res = await fetch(`/v1/quantitatifs/${id}/reponses`, { method: "POST", headers, body: JSON.stringify({ reponses: [{ question: "suggestions:choisies", valeur: "aucune" }] }) });
      const apres = (await (await fetch(`/v1/quantitatifs/${id}?ecran=1`, { headers })).json()) as { ecran?: { suggestions?: { label: string }[] } };
      return { proposees: (lu.ecran?.suggestions ?? []).map((s) => s.label), status: res.status, restantes: (apres.ecran?.suggestions ?? []).length };
    },
    { id: quantitatifId },
  );
  expect(r.proposees).toEqual([...attendues]);
  expect(r.status).toBeLessThan(300);
  expect(r.restantes).toBe(0);
}
