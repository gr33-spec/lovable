import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { confirmerAnalyseDoffice } from "./confirmer-analyse";

test.beforeEach(async ({ page }) => {
  await confirmerAnalyseDoffice(page);
});

/**
 * L'ASSISTANT MOBIIZ (Greg, 31 octobre 2026, « Refonte de l'expérience de création des quantitatifs, assistant IA et PDF
 * interactif ») : les questions qui manquent dans un seul message, plusieurs réponses d'un coup, une consigne dictée ou
 * écrite (retirer, ajouter), « Annuler », une ligne modifiée depuis le PDF, « Passer », le PDF en plein écran sur
 * téléphone, et la conversation, la liste et le PDF toujours d'accord. Aucun appel IA (l'interprète est du code).
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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

type Ecran = { purchase: { toBuy: { key: string; label: string; quantity: string | null }[] }; chantier?: { adresse: string | null; livraison: string | null } };

async function compteEtListe(page: Page) {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Alex Martin");
  await page.getByLabel("Nom de ton entreprise").fill(`Toitures ${unique()}`);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(`assistant-${unique()}@example.fr`);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: /^Bonjour Alex/ }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  const q = await apiJson<{ id: string; projetId: string }>(page, "POST", "/v1/quantitatifs", {
    lignes: [
      { libelle: "Ardoise naturelle 32×22", quantite: "1200", unite: "pièces" },
      { libelle: "Crochet ardoise inox 90 mm", quantite: "1250", unite: "pièces" },
      { libelle: "Vis inox 4×40", quantite: "2", unite: "boîtes" },
    ],
  });
  expect(q.status).toBe(201);
  return q.body;
}

const ecran = async (page: Page, id: string) => (await apiJson<{ ecran: Ecran }>(page, "GET", `/v1/quantitatifs/${id}?ecran=1`)).body.ecran;

test("Assistant Mobiiz : questions d'un coup, réponses multiples, consignes, annuler, ligne du PDF, passer", async ({ page }, info) => {
  test.setTimeout(180_000);
  const tel = info.project.name === "telephone";
  const { id, projetId } = await compteEtListe(page);
  await page.goto(`/chantiers/${projetId}`);
  await page.getByRole("button", { name: "Ouvrir l'assistant" }).click();
  const assistant = page.getByRole("dialog", { name: "Assistant Mobiiz" });
  await expect(assistant).toBeVisible();
  // L'aide d'une fois.
  await expect(assistant.getByRole("note")).toHaveText(/Réponds par écrit, utilise le micro ou passe directement à ta liste\./);
  await assistant.getByRole("button", { name: "Compris" }).click();
  await expect(assistant.getByRole("note")).toHaveCount(0);
  // Toutes les questions dans un seul message, jamais une quantité.
  // Les questions DU DOCUMENT d'abord (l'ardoise ne dit ni son origine ni son choix ; les crochets disent inox et 90 mm, rien
  // à demander), puis le chantier.
  await expect(assistant.getByText("J'ai préparé ta liste : 3 lignes. Il me manque 4 précisions. Tu peux répondre à plusieurs d'un coup, ou passer.")).toBeVisible();
  // La question active, dans sa bulle, avec ses réponses d'un tap et « Passer » ; une seule à la fois.
  const active = assistant.getByRole("group", { name: "Ardoise naturelle 32×22 : origine ?" });
  await expect(active).toBeVisible();
  await expect(active.getByRole("button", { name: "Passer" })).toBeVisible();
  await expect(assistant.getByRole("group", { name: /^Crochet ardoise/ })).toHaveCount(0);
  await expect(assistant.getByRole("group", { name: "Où se trouve le chantier ?" })).toHaveCount(0);
  await expect(assistant.getByText(/combien/i)).toHaveCount(0);
  // Le micro est là (la dictée remplit la case, n'envoie rien) ; ici, on écrit.
  await expect(assistant.getByRole("button", { name: "Dicter" })).toBeVisible();
  const champ = assistant.getByLabel("Ton message");
  // Quatre réponses d'un coup, en une phrase.
  await champ.fill("Espagne, 1er choix. 3 rue du Port 22300 Lannion. Livraison sur chantier demain");
  await assistant.getByRole("button", { name: "Envoyer le message" }).click();
  await expect(assistant.getByText("C'est noté : Espagne et 1er choix pour « Ardoise naturelle 32×22 ». C'est fait : adresse notée : 3 rue du Port 22300 Lannion, noté : livraison sur le chantier, demain. C'est tout bon de mon côté : relis le PDF, puis envoie-le à tes négoces.")).toBeVisible();
  await expect(assistant.getByRole("group", { name: "Ardoise naturelle 32×22 : origine ?" })).toHaveCount(0);
  await expect(assistant.getByRole("group", { name: "Où se trouve le chantier ?" })).toHaveCount(0);
  expect((await ecran(page, id)).chantier).toEqual({ adresse: "3 rue du Port 22300 Lannion", livraison: "Livraison sur le chantier, demain" });
  // La réponse s'écrit dans la ligne (ce que reçoit le négoce).
  expect((await ecran(page, id)).purchase.toBuy.map((b) => b.label)).toContain("Ardoise naturelle 32×22 Espagne 1er choix");
  // Deux consignes dans une phrase : retirer, ajouter (quantité dite seulement).
  await champ.fill("retire les vis et ajoute 10 sacs de colle C2");
  await champ.press("Enter");
  await expect(assistant.getByText(/C'est fait : retiré « Vis inox 4×40 », ajouté « Colle C2 », 10 sacs\./)).toBeVisible();
  let lignes = (await ecran(page, id)).purchase.toBuy.map((b) => b.label);
  expect(lignes.some((l) => /Colle C2/.test(l))).toBe(true);
  expect(lignes.some((l) => /Vis inox/.test(l))).toBe(false);
  // Annuler : la dernière modification (l'ajout de la colle, puis le retrait des vis).
  await assistant.getByRole("button", { name: "Annuler la dernière modification" }).click();
  await expect(assistant.getByText("J'ai annulé l'ajout de « Colle C2 ».")).toBeVisible();
  await assistant.getByRole("button", { name: "Annuler la dernière modification" }).click();
  await expect(assistant.getByText("J'ai annulé le retrait de « Vis inox 4×40 ».")).toBeVisible();
  lignes = (await ecran(page, id)).purchase.toBuy.map((b) => b.label);
  expect(lignes.some((l) => /Colle C2/.test(l))).toBe(false);
  expect(lignes.some((l) => /Vis inox/.test(l))).toBe(true);

  // Une ligne touchée dans le PDF : « Modifier la ligne ».
  if (tel) {
    await assistant.getByRole("button", { name: "Voir PDF" }).click();
    await expect(page.getByRole("dialog", { name: "Le PDF de ta demande" })).toBeVisible();
  }
  const zone = page.locator("button[data-cle]").first();
  await expect(zone).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("button[data-cle]")).toHaveCount(3);
  // Le PDF vu est celui du négoce : la livraison y est (même document que l'envoi).
  const cle = await zone.getAttribute("data-cle");
  await zone.click();
  const feuille = page.getByRole("dialog", { name: "Modifier la ligne" });
  await expect(feuille).toBeVisible();
  const avant = (await ecran(page, id)).purchase.toBuy.find((b) => b.key === cle)!;
  await feuille.getByLabel("Quantité").fill("1300");
  await feuille.getByRole("button", { name: "Enregistrer" }).click();
  await expect(feuille).toHaveCount(0);
  if (tel) await page.getByRole("button", { name: "Retour à l'assistant" }).click();
  await expect(assistant.getByText(/est à jour\./)).toBeVisible();
  const apres = (await ecran(page, id)).purchase.toBuy.find((b) => b.label === avant.label)!;
  expect(apres.quantity).toMatch(/1\s?300/);

  // Fermer : la liste est là, à jour ; on rouvre, rien n'est reposé.
  await assistant.getByRole("button", { name: "Fermer l'assistant" }).click();
  await expect(assistant).toHaveCount(0);
  await page.getByRole("button", { name: "Ouvrir l'assistant" }).click();
  await expect(page.getByRole("dialog", { name: "Assistant Mobiiz" }).getByText(/Je n'ai rien à te demander/)).toBeVisible();
});

test("Assistant Mobiiz : « Passer » ferme une question pour de bon ; « Je ne sais pas » aussi", async ({ page }) => {
  test.setTimeout(120_000);
  const { projetId } = await compteEtListe(page);
  await page.goto(`/chantiers/${projetId}`);
  await page.getByRole("button", { name: "Ouvrir l'assistant" }).click();
  const assistant = page.getByRole("dialog", { name: "Assistant Mobiiz" });
  // « Passer », petit, sur la question active.
  await assistant.getByRole("group", { name: "Ardoise naturelle 32×22 : origine ?" }).getByRole("button", { name: "Passer" }).click();
  await expect(assistant.getByRole("group", { name: "Ardoise naturelle 32×22 : origine ?" })).toHaveCount(0);
  await expect(assistant.getByRole("group", { name: "Ardoise naturelle 32×22 : choix ?" })).toBeVisible();
  // « Je ne sais pas » passe la question en cours.
  await assistant.getByLabel("Ton message").fill("je ne sais pas");
  await assistant.getByRole("button", { name: "Envoyer le message" }).click();
  await expect(assistant.getByText("Pas de souci, on passe.")).toBeVisible();
  await expect(assistant.getByRole("group", { name: "Où se trouve le chantier ?" })).toBeVisible();
  await assistant.getByRole("button", { name: "Fermer l'assistant" }).click();
  // Reprendre plus tard : le fil est gardé, les questions passées ne reviennent pas.
  await page.reload();
  await page.getByRole("button", { name: "Ouvrir l'assistant" }).click();
  const rouvert = page.getByRole("dialog", { name: "Assistant Mobiiz" });
  await expect(rouvert.getByText("je ne sais pas")).toBeVisible();
  await expect(rouvert.getByRole("group", { name: "Où se trouve le chantier ?" })).toBeVisible();
  await expect(rouvert.getByRole("group", { name: /^Ardoise naturelle 32×22 : (origine|choix) \?$/ })).toHaveCount(0);
});

test("Décris ton chantier : une vraie conversation ; les quantités dites font la liste, le reste se propose ; « Voir PDF » garde le brouillon", async ({ page }, info) => {
  test.setTimeout(150_000);
  const tel = info.project.name === "telephone";
  await compteEtListe(page);
  await page.goto("/chantiers/nouveau");
  await page.getByRole("button", { name: /Décrire mon chantier/ }).click();
  const d = page.getByRole("dialog", { name: "Décris ton chantier" });
  await expect(d.getByText("Décris-moi ton chantier ou indique directement les matériaux et quantités dont tu as besoin. Tu peux écrire ou utiliser le micro.")).toBeVisible();
  // Plus de formulaire : une barre en bas, le micro dedans, l'envoi rond ; aucun bouton « Lire ma description ».
  await expect(d.getByRole("button", { name: "Lire ma description" })).toHaveCount(0);
  await expect(d.getByLabel("Ton message")).toHaveAttribute("placeholder", "Réponds ici…");
  await expect(d.getByRole("button", { name: "Dicter" })).toBeVisible();
  await expect(d.getByRole("button", { name: "Envoyer le message" })).toBeDisabled();
  await d.getByLabel("Ton message").fill("Il me faut 40 m² de placo BA13, 3 rouleaux de laine de verre 100 mm et un WC suspendu, plus de la colle carrelage");
  await d.getByRole("button", { name: "Envoyer le message" }).click();
  // La liste est créée et LA MÊME conversation continue avec l'assistant.
  const a = page.getByRole("dialog", { name: "Assistant Mobiiz" });
  await expect(a.getByText(/^Il me faut 40 m² de placo BA13/)).toBeVisible({ timeout: 30_000 });
  await expect(a.getByText("C'est noté : Placo BA13 (40 m²), Laine de verre 100 mm (3 rouleaux).")).toBeVisible();
  const propositions = a.getByRole("group", { name: "Sans quantité en chiffres" });
  await propositions.getByRole("button", { name: "Ajouter « WC suspendu »" }).click();
  await expect(a.getByText("C'est fait : ajouté « WC suspendu », 1.")).toBeVisible();
  // Dit sans unité : la question vient du document (§51.6), une réponse d'un tap.
  await a.getByRole("group", { name: "WC suspendu : quelle unité ?" }).getByRole("button", { name: "Pièces" }).click();
  await expect(a.getByRole("group", { name: "Où se trouve le chantier ?" })).toBeVisible();
  await a.getByLabel("Ton message").fill("75011 Paris");
  await a.getByRole("button", { name: "Envoyer le message" }).click();
  await expect(a.getByText(/adresse notée : 75011 Paris/)).toBeVisible();
  await expect(a.getByRole("group", { name: "Livraison sur chantier ou retrait en agence ?" })).toBeVisible();
  // « Voir PDF » (téléphone) puis retour : messages et brouillon intacts.
  await a.getByLabel("Ton message").fill("brouillon en cours");
  if (tel) {
    await a.getByRole("button", { name: "Voir PDF" }).click();
    await expect(page.getByRole("dialog", { name: "Le PDF de ta demande" })).toBeVisible();
    await expect(page.locator("button[data-cle]").first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Retour à l'assistant" }).click();
  } else await expect(page.locator("button[data-cle]").first()).toBeVisible({ timeout: 20_000 });
  await expect(a.getByLabel("Ton message")).toHaveValue("brouillon en cours");
  await expect(a.getByText("C'est fait : ajouté « WC suspendu », 1.")).toBeVisible();
  await a.getByRole("group", { name: "Livraison sur chantier ou retrait en agence ?" }).getByRole("button", { name: "Retrait" }).click();
  await expect(a.getByText(/retrait en agence noté/)).toBeVisible();
  await a.getByRole("button", { name: "Fermer l'assistant" }).click();
  await expect(page).toHaveURL(/\/chantiers\/[0-9a-f-]{36}/);
  await expect(page.getByText("Placo BA13").first()).toBeVisible();
  await expect(page.getByText("WC suspendu").first()).toBeVisible();
  await expect(page.getByText(/Colle carrelage/)).toHaveCount(0);
});

test("Le clavier ouvert (iPhone SE) : la barre de saisie reste visible au-dessus, le dernier message aussi", async ({ page }, info) => {
  test.skip(info.project.name !== "telephone", "le clavier simulé est celui du téléphone");
  test.setTimeout(120_000);
  const { projetId } = await compteEtListe(page);
  await page.goto(`/chantiers/${projetId}`);
  await page.getByRole("button", { name: "Ouvrir l'assistant" }).click();
  const a = page.getByRole("dialog", { name: "Assistant Mobiiz" });
  await a.getByLabel("Ton message").click();
  // Le clavier natif rétrécit la zone visible : 375 × 330 (comme `clavier.spec.ts`).
  await page.setViewportSize({ width: 375, height: 330 });
  await expect(a.getByLabel("Ton message")).toBeInViewport({ ratio: 1 });
  await expect(a.getByRole("button", { name: "Envoyer le message" })).toBeInViewport({ ratio: 1 });
  await expect(a.getByRole("button", { name: "Dicter" })).toBeInViewport({ ratio: 1 });
  // Le champ grandit avec le texte, jusqu'à cinq lignes environ, puis défile.
  const h1 = (await a.getByLabel("Ton message").boundingBox())!.height;
  await a.getByLabel("Ton message").fill("ligne 1\nligne 2\nligne 3\nligne 4\nligne 5\nligne 6\nligne 7");
  const h2 = (await a.getByLabel("Ton message").boundingBox())!.height;
  expect(h2).toBeGreaterThan(h1 * 3);
  expect(h2).toBeLessThan(h1 * 6);
  await a.getByLabel("Ton message").fill("75011 Paris");
  await a.getByRole("button", { name: "Envoyer le message" }).click();
  // Le fil descend tout seul : le dernier élément (la question suivante) est visible, la barre aussi.
  await expect(a.getByRole("group", { name: "Ardoise naturelle 32×22 : origine ?" })).toBeInViewport();
  await expect(a.getByLabel("Ton message")).toBeInViewport({ ratio: 1 });
});

test("Contrôle de conformité : après la photo d'une liste, l'assistant s'ouvre seul et pose les questions DU DOCUMENT ; réponses libres groupées ; une seule ouverture", async ({ page }) => {
  test.setTimeout(180_000);
  // Les tests gardent l'écran de liste ; celui-ci active l'ouverture automatique de l'assistant (comme pour un artisan).
  await page.addInitScript(() => localStorage.setItem("mobiiz-assistant-auto", "oui"));
  await compteEtListe(page);
  await page.goto("/chantiers/nouveau");
  await page.getByLabel("Choisir un PDF ou un fichier").setInputFiles(path.join(__dirname, "fixtures", "liste-manuscrite.png"));
  await expect(page).toHaveURL(/\/chantiers\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  const assistant = page.getByRole("dialog", { name: "Assistant Mobiiz" });
  await expect(assistant).toBeVisible({ timeout: 60_000 });
  const projetId = /\/chantiers\/([0-9a-f-]{36})/.exec(page.url())![1]!;
  // Des questions tirées des lignes lues (pas une liste générique) : la première, la marque de la tuile, est active.
  await expect(assistant.getByText("J'ai préparé ta liste : 5 lignes. Il me manque 6 précisions. Tu peux répondre à plusieurs d'un coup, ou passer.")).toBeVisible();
  await expect(assistant.getByRole("group", { name: "Tuile romane canal rouge : marque ?" })).toBeVisible();
  // Une ligne déjà précise n'a pas de question (le liteau dit sa section).
  await expect(assistant.getByRole("group", { name: /^Liteau sapin 27x38/ })).toHaveCount(0);
  // Deux réponses d'un coup, en texte libre.
  await assistant.getByLabel("Ton message").fill("HPV et pointes 2,8×40");
  await assistant.getByRole("button", { name: "Envoyer le message" }).click();
  await expect(assistant.getByText(/C'est noté : HPV pour « Écran sous-toiture », 2,8×40 pour « Pointes inox »\./)).toBeVisible();
  const q = await apiJson<{ items: { ecran: Ecran }[] }>(page, "GET", `/v1/quantitatifs?projetId=${projetId}&ecran=1`);
  const labels = q.body.items[0]!.ecran.purchase.toBuy.map((b) => b.label);
  expect(labels).toContain("Écran sous-toiture HPV");
  expect(labels.some((l) => /^Pointes inox 2,8×40/.test(l))).toBe(true);
  // Revenir sur un choix : « Annuler » rend l'ancienne désignation.
  await assistant.getByRole("button", { name: "Annuler la dernière modification" }).click();
  await expect(assistant.getByText(/J'ai annulé « 2,8×40 » sur Pointes inox\./)).toBeVisible();
  // Passer tout de suite : la liste ; l'assistant ne se rouvre pas seul.
  await assistant.getByRole("button", { name: "Fermer l'assistant" }).click();
  await expect(assistant).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("region", { name: "Liste des fournitures" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("dialog", { name: "Assistant Mobiiz" })).toHaveCount(0);
});

test("La dictée : remplit la case sans envoyer ; navigateur sans dictée ou micro refusé : une phrase et le clavier", async ({ page }) => {
  test.setTimeout(120_000);
  // Une reconnaissance vocale simulée (comme Chrome Android ou Safari iOS, `webkitSpeechRecognition`).
  await page.addInitScript(() => {
    class FausseDictee {
      lang = "";
      interimResults = false;
      continuous = false;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        const mode = localStorage.getItem("fausse-dictee");
        setTimeout(() => {
          if (mode === "refus") this.onerror?.({ error: "not-allowed" });
          else this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: "ajoute 6 sacs de mortier" }], { isFinal: true })] });
          this.onend?.();
        }, 50);
      }
      stop() {}
      abort() {}
    }
    // Chrome expose aussi `SpeechRecognition` sans préfixe : les deux sont remplacés.
    (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = FausseDictee;
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FausseDictee;
  });
  const { projetId, id } = await compteEtListe(page);
  await page.goto(`/chantiers/${projetId}`);
  await page.getByRole("button", { name: "Ouvrir l'assistant" }).click();
  const assistant = page.getByRole("dialog", { name: "Assistant Mobiiz" });
  await assistant.getByRole("button", { name: "Dicter" }).click();
  await expect(assistant.getByLabel("Ton message")).toHaveValue("ajoute 6 sacs de mortier");
  // Rien n'est parti tout seul.
  expect((await ecran(page, id)).purchase.toBuy.some((b) => /Mortier/.test(b.label))).toBe(false);
  await assistant.getByLabel("Ton message").fill("ajoute 6 sacs de mortier");
  await assistant.getByRole("button", { name: "Envoyer le message" }).click();
  await expect(assistant.getByText(/ajouté « Mortier », 6 sacs/)).toBeVisible();
  // Micro refusé : la phrase, le clavier reste.
  await page.evaluate(() => localStorage.setItem("fausse-dictee", "refus"));
  await assistant.getByRole("button", { name: "Dicter" }).click();
  await expect(assistant.getByRole("alert")).toHaveText("Le micro est bloqué. Autorise-le dans les réglages du navigateur, ou écris ta réponse.");
  await expect(assistant.getByLabel("Ton message")).toBeEditable();
});

test("Navigateur sans dictée : le micro le dit, rien ne casse", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  });
  const { projetId } = await compteEtListe(page);
  await page.goto(`/chantiers/${projetId}`);
  await page.getByRole("button", { name: "Ouvrir l'assistant" }).click();
  const assistant = page.getByRole("dialog", { name: "Assistant Mobiiz" });
  await assistant.getByRole("button", { name: "Dicter" }).click();
  await expect(assistant.getByRole("alert")).toHaveText("La dictée n'est pas disponible sur ce navigateur. Utilise le micro de ton clavier, ou écris ta réponse.");
});

test("Audit UX (1er novembre 2026) : rouvert trois fois, l'assistant ne répète pas son message d'ouverture ; le fil reste", async ({ page }) => {
  test.setTimeout(120_000);
  const { projetId } = await compteEtListe(page);
  await page.goto(`/chantiers/${projetId}`);
  await page.getByRole("button", { name: "Ouvrir l'assistant" }).click();
  let assistant = page.getByRole("dialog", { name: "Assistant Mobiiz" });
  await expect(assistant.getByText(/^J'ai préparé ta liste/)).toHaveCount(1);
  // Une réponse écrite, puis trois réouvertures (rechargement compris) : le fil est gardé, l'ouverture n'est pas répétée.
  await assistant.getByLabel("Ton message").fill("je ne sais pas");
  await assistant.getByRole("button", { name: "Envoyer le message" }).click();
  await expect(assistant.getByText("Pas de souci, on passe.")).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await assistant.getByRole("button", { name: "Fermer l'assistant" }).click();
    if (i === 1) await page.reload();
    await page.getByRole("button", { name: "Ouvrir l'assistant" }).click();
    assistant = page.getByRole("dialog", { name: "Assistant Mobiiz" });
    await expect(assistant.getByText("je ne sais pas")).toBeVisible();
  }
  // L'état a changé une fois (une question passée) : au plus deux messages d'ouverture, jamais un par réouverture.
  expect(await assistant.getByText(/^J'ai préparé ta liste/).count()).toBeLessThanOrEqual(2);
  const avant = await assistant.getByText(/^J'ai préparé ta liste/).count();
  await assistant.getByRole("button", { name: "Fermer l'assistant" }).click();
  await page.getByRole("button", { name: "Ouvrir l'assistant" }).click();
  await expect(page.getByRole("dialog", { name: "Assistant Mobiiz" }).getByText(/^J'ai préparé ta liste/)).toHaveCount(avant);
  // Le bouton de fermeture fait 44 px au doigt.
  const fermer = (await page.getByRole("button", { name: "Fermer l'assistant" }).boundingBox())!;
  expect(fermer.width).toBeGreaterThanOrEqual(44);
  expect(fermer.height).toBeGreaterThanOrEqual(44);
});
