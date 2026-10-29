import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";

/**
 * L'ACHAT GROUPÉ PAR MÉTIER (Greg, 27 octobre 2026, 2e message) : les six cas de la méthode, sur téléphone et sur
 * ordinateur, avec une capture de chacun (test-results/achat-groupe) : 1. le compte vide ; 2. la liste depuis un devis, la
 * suggestion « mets-les en achat groupé » puis « Tout cocher » ; 3. un 2e couvreur alerté qui ajoute sa liste avec la case
 * d'engagement ; 4. l'écran de validation de l'admin avec une offre incomplète et une offre PDF douteuse ; 5. la
 * publication, un artisan sans compte chez le gagnant (« transmettre mes coordonnées ») ; 6. la sortie pour chantier annulé.
 * Chaque exécution prend un département au hasard : les achats d'une série ne se mélangent pas à ceux d'une autre.
 */

const SECRET = "Bearer e2e-secret-de-la-tache";
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const departement = () => String(1 + Math.floor(Math.random() * 19)).padStart(2, "0");

test.beforeEach(async ({ page, request }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  // Le mode par défaut : l'achat groupé automatique (une série interrompue a pu laisser un autre mode).
  expect((await request.post("/v1/internal/test/mode-regroupement", { headers: { authorization: SECRET }, data: { mode: "automatique" } })).status()).toBe(200);
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

const emailsVers = async (page: Page, to: string) => (await apiJson<{ emails: { subject: string; text: string }[] }>(page, "GET", `/v1/internal/test/emails?to=${encodeURIComponent(to)}`, undefined, SECRET)).body.emails;
const tache = async (page: Page, maintenant: Date) => {
  const r = await apiJson<Record<string, number>>(page, "GET", `/v1/internal/achats-groupes?maintenant=${encodeURIComponent(maintenant.toISOString())}`, undefined, SECRET);
  expect(r.status).toBe(200);
  return r.body;
};
/** Le clavier simulé ouvert (iPhone SE, 375 × 330 ; Greg, 28 octobre 2026, point 1) : le champ reste visible en entier. */
async function clavierOuvert(page: Page, champ: Locator) {
  if (test.info().project.name !== "telephone") return;
  const taille = page.viewportSize();
  await page.setViewportSize({ width: 375, height: 330 });
  await champ.click();
  await expect(champ).toBeFocused();
  await expect(champ).toBeInViewport({ ratio: 1 });
  if (taille) await page.setViewportSize(taille);
}
/** Un téléchargement (PDF, Excel) déclenché par un lien de la page. */
async function telecharger(page: Page, lien: string) {
  const [d] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: lien }).click()]);
  return d;
}
/** L'Excel exporté, rempli dans un vrai tableur (openpyxl s'il est là ; sinon réécrit par le code, mêmes feuilles). */
async function remplirExcel(fichier: string | null, cellules: Record<string, number | string>) {
  if (!fichier) throw new Error("export Excel absent");
  const sortie = path.join(path.dirname(fichier), "rempli.xlsx");
  try {
    const lignes = Object.entries(cellules).map(([c, v]) => `ws[${JSON.stringify(c)}] = ${JSON.stringify(v)}`).join("\n");
    execFileSync("/usr/bin/python3", ["-I", "-c", `import openpyxl, sys\nwb = openpyxl.load_workbook(sys.argv[1])\nws = wb["Demande"]\n${lignes}\nwb.save(sys.argv[2])`, fichier, sortie], { stdio: "ignore" });
  } catch {
    const { ecrireXlsx, indexColonne, lireXlsx } = await import("../../api/src/platform/xlsx/xlsx.js");
    const feuilles = lireXlsx(readFileSync(fichier));
    for (const [ref, v] of Object.entries(cellules)) {
      const m = /^([A-Z]+)(\d+)$/.exec(ref)!;
      const ligne = feuilles[0]!.lignes[Number(m[2]) - 1]!;
      ligne[indexColonne(m[1]!)] = v;
    }
    writeFileSync(sortie, ecrireXlsx(feuilles.map((f) => ({ nom: f.nom, lignes: f.lignes, cachee: f.nom.startsWith("_") }))));
  }
  return sortie;
}
/** Capture de chaque étape ; `CAPTURE_SE=1` : au format iPhone SE (375 × 667) sur téléphone, pour le rapport. */
async function capture(page: Page, projet: string, nom: string) {
  const taille = page.viewportSize();
  const se = process.env.CAPTURE_SE === "1" && projet === "telephone";
  if (se) await page.setViewportSize({ width: 375, height: 667 });
  await page.screenshot({ path: `test-results/achat-groupe/${projet}-${nom}.png`, fullPage: !se });
  if (se && taille) await page.setViewportSize(taille);
}

/** Un couvreur inscrit (écran de l'adresse Mobiiz passé), SIRET vérifié, adresse dans le département. */
async function inscrire(page: Page, dep: string, prenom = "Jean"): Promise<{ entreprise: string; email: string }> {
  const entreprise = `Toitures ${unique()}`;
  const email = `artisan-${unique()}@example.fr`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill(`${prenom} Martin`);
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("heading", { name: "Voici ton adresse Mobiiz :" })).toBeVisible();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`^Bonjour ${prenom}`) }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  expect((await apiJson(page, "PATCH", "/v1/company/profile", { name: entreprise, address: `3 rue de la Gare, ${dep}100 Ville-${dep}`, siret: "73282932000074", phone: null, email: null })).status).toBe(200);
  expect((await apiJson(page, "POST", "/v1/groupe/siret")).status).toBe(200);
  return { entreprise, email };
}

async function nouvelArtisan(browser: Browser, dep: string, prenom: string) {
  const ctx = await browser.newContext({ ...(test.info().project.use as object) });
  const page = await ctx.newPage();
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  const qui = await inscrire(page, dep, prenom);
  return { ctx, page, ...qui };
}

const ADMIN = "admin-groupe@example.fr";

/** L'admin du groupé, dans son navigateur : connexion (ou inscription la première fois), puis le code reçu par e-mail. */
async function admin(browser: Browser, chemin: string) {
  const ctx = await browser.newContext({ ...(test.info().project.use as object) });
  const page = await ctx.newPage();
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  await page.goto("/connexion");
  await page.getByLabel("E-mail").fill(ADMIN);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("button", { name: "Se connecter" }).click();
  const refus = page.getByRole("alert").filter({ hasText: "incorrect" });
  await expect(page.getByRole("heading", { name: /^Bonjour/ }).or(page.getByRole("heading", { name: "Voici ton adresse Mobiiz :" })).or(page.getByRole("heading", { name: "Bienvenue" })).or(refus).first()).toBeVisible();
  if (await refus.count()) {
    await page.goto("/inscription");
    await page.getByLabel("Prénom et nom").fill("Greg Admin");
    await page.getByLabel("Nom de ton entreprise").fill(`Bati Invest ${unique()}`);
    await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
    await page.getByLabel("E-mail professionnel").fill(ADMIN);
    await page.getByLabel("Mot de passe").fill("motdepasse-solide");
    await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByRole("heading", { name: "Voici ton adresse Mobiiz :" })).toBeVisible();
  }
  // Un compte de l'admin resté sans entreprise (série interrompue) : l'écran « Bienvenue » d'abord.
  if (await page.getByRole("heading", { name: "Bienvenue" }).isVisible()) {
    await page.getByLabel("Nom de ton entreprise").fill(`Bati Invest ${unique()}`);
    await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
    await page.getByRole("button", { name: "Continuer" }).click();
  }
  if (await page.getByRole("heading", { name: "Voici ton adresse Mobiiz :" }).isVisible()) await page.getByRole("button", { name: "C'est compris" }).click();
  await page.goto(chemin);
  await page.getByRole("button", { name: "Recevoir mon code" }).click({ timeout: 30_000 });
  await expect(page.getByLabel("Code reçu par e-mail")).toBeVisible();
  await clavierOuvert(page, page.getByLabel("Code reçu par e-mail"));
  const mail = (await emailsVers(page, ADMIN)).filter((m) => /code d'accès au pilotage/.test(m.subject)).at(-1)!;
  await page.getByLabel("Code reçu par e-mail").fill(/(\d{6})/.exec(mail.text)![1]!);
  await page.getByRole("button", { name: "Ouvrir l'espace admin" }).click();
  return { ctx, page };
}

/** Ajouter un négoce tapé à la main (nom, e-mail, téléphone). */
async function ajouterNegoce(page: Page, n: { nom: string; email: string; tel: string }) {
  await page.getByLabel(/^(E-mail de ton commercial|Ou l'e-mail du commercial d'un autre négoce)$/).fill(n.email); await page.getByLabel("Nom du négoce").fill(n.nom);
  await page.getByLabel("Son téléphone (pour le prévenir)").fill(n.tel);
  await page.getByRole("button", { name: "Ajouter ce négoce" }).click();
}

test.describe("Achat groupé par métier (27 octobre 2026, 2e message)", () => {
  test.setTimeout(600_000);

  test("les six cas : compte vide, liste depuis un devis et suggestion, 2e couvreur engagé, validation admin, publication et coordonnées, sortie", async ({ page, browser }, info) => {
    const projet = info.project.name;
    const dep = departement();
    const negoceX = { nom: `Négoce X ${unique()}`, email: `x-${unique()}@negoce.example`, tel: "02 96 00 00 01" };
    const negoceY = { nom: `Négoce Y ${unique()}`, email: `y-${unique()}@negoce.example`, tel: "02 96 00 00 02" };

    // 1. Le compte vide : gratuit, sans essai ni pastille ; les deux portes.
    await inscrire(page, dep);
    await page.goto("/");
    await expect(page.getByText("Par où commencer ?")).toBeVisible();
    await expect(page.getByRole("link", { name: /Achat groupé de ton métier/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ma liste de matériaux/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Essai gratuit/ })).toHaveCount(0);
    await capture(page, projet, "1-compte-vide");

    // 2. La liste depuis un devis : trois choix, le bandeau, « à vérifier », la suggestion, « Tout cocher ».
    await page.getByRole("link", { name: /Ma liste de matériaux/ }).first().click();
    await expect(page.getByText("Depuis mon devis — on t'avance")).toBeVisible();
    await expect(page.getByText("Photo de ma liste")).toBeVisible();
    await expect(page.getByText("Je la note moi-même")).toBeVisible();
    await page.getByLabel("Déposer mon devis").setInputFiles(path.join(__dirname, "fixtures", "devis-achat-groupe.pdf"));
    await page.waitForURL(/\/chantiers\/[0-9a-f-]{36}/);
    const liste = page.getByRole("region", { name: "Liste des fournitures" });
    const questions = page.getByRole("region", { name: "Les questions" });
    await expect(liste.or(questions).first()).toBeVisible({ timeout: 60_000 });
    if (await questions.isVisible()) await page.getByRole("button", { name: /^Calculer ma liste/ }).click();
    await expect(liste).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Liste préparée à partir de ton devis. Vérifie les quantités avant d'envoyer.")).toBeVisible();
    await expect(liste.getByText("à vérifier").first()).toBeVisible();
    const suggestion = page.getByText(/^Tu as 1\u00a0800 pièces de ardoise 32×22 Espagne 1er choix, mets-les en achat groupé pour payer moins cher\.$/);
    await expect(suggestion).toBeVisible({ timeout: 30_000 });
    await suggestion.scrollIntoViewIfNeeded();
    await capture(page, projet, "2a-liste-depuis-devis");
    await page.getByRole("button", { name: "Mettre en achat groupé" }).click();
    const groupe = page.getByLabel("Acheter en groupe");
    await expect(groupe.getByRole("checkbox", { name: /Ardoise naturelle 32×22/ })).toBeChecked();
    await expect(groupe.getByRole("checkbox", { name: /Liteaux 27×38/ })).not.toBeChecked();
    await groupe.getByRole("button", { name: "Tout cocher" }).click();
    await expect(groupe.getByRole("checkbox", { name: /Liteaux 27×38/ })).toBeChecked();
    await expect(groupe.getByText("C'est bien de l'ardoise 32×22 Espagne 1er choix ?")).toBeVisible();
    // Ultra intuitif (27 octobre) : une question par écran, « Continuer » entre chaque.
    await groupe.getByRole("button", { name: "Continuer" }).click();
    await groupe.getByLabel("Livraison avant le").fill(new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
    await groupe.getByRole("button", { name: "Continuer" }).click();
    await ajouterNegoce(page, negoceX);
    await groupe.getByRole("button", { name: "Continuer" }).click();
    await expect(groupe.getByText("Ton premier achat groupé est offert.")).toBeVisible();
    await groupe.getByRole("checkbox", { name: /^Je commande ces quantités/ }).check();
    await capture(page, projet, "2b-tout-cocher-engagement");
    await groupe.getByRole("button", { name: /^Je m'engage et j'ajoute ces 2 lignes$/ }).click();
    await expect(page.getByText(/^2 lignes dans l'achat groupé : Couverture · secteur /)).toBeVisible();
    await page.getByRole("link", { name: "Préviens ton négoce" }).click();
    await page.waitForURL(/\/achats-groupes\/[0-9a-f-]{36}$/);
    const besoinA = page.url().split("/").pop()!;
    const achatA = (await apiJson<{ achatId: string; clotureLe: string; reponseAvantLe: string }>(page, "GET", `/v1/achats-groupes/${besoinA}`)).body;

    // 3. Un 2e couvreur du secteur voit l'achat ouvert et y ajoute sa liste, avec la case d'engagement.
    const b = await nouvelArtisan(browser, dep, "Paul");
    await b.page.goto("/");
    const ouverts = b.page.getByRole("region", { name: "Achats groupés ouverts dans ton secteur" });
    await expect(ouverts.getByText(/^Ajoute ta liste avant le \d+ \S+\. Livraison avant le \d+ \S+\.$/)).toBeVisible();
    await ouverts.getByRole("link", { name: "Ajouter ma liste" }).first().click();
    await expect(b.page.getByRole("heading", { name: "Ajouter ma liste" })).toBeVisible();
    // Le choix guidé (Greg, 27 octobre, capture iPhone) : un bouton par matériau, format, choix, puis la quantité.
    await b.page.getByRole("button", { name: "Ardoise", exact: true }).click();
    await b.page.getByRole("button", { name: "32×22", exact: true }).click();
    await b.page.getByRole("button", { name: "Espagne 1er choix" }).click();
    await b.page.getByLabel("Quantité de Ardoise naturelle 32×22 Espagne 1er choix").fill("900");
    await b.page.getByRole("button", { name: "Ajouter à ma liste" }).click();
    await b.page.getByRole("button", { name: "Continuer" }).click();
    await b.page.getByLabel("Commune de livraison").fill(`${dep}200 Autre-${dep}`);
    await b.page.getByRole("button", { name: "Continuer" }).click();
    await ajouterNegoce(b.page, negoceY);
    await b.page.getByRole("button", { name: "Continuer" }).click();
    const engagement = b.page.getByRole("region", { name: "Mon engagement" });
    await expect(engagement.getByText("Deux sorties seulement, en un clic avec le motif", { exact: false })).toBeVisible();
    await engagement.getByRole("checkbox", { name: /^Je commande ces quantités, chez le moins cher entre la meilleure offre du groupe et mon négoce habituel\.$/ }).check();
    await capture(b.page, projet, "3-engagement-2e-couvreur");
    await b.page.getByRole("button", { name: "Je m'engage et j'ajoute ma liste" }).click();
    await expect(b.page.getByText(/^Ta liste est dans l'achat groupé : Couverture · secteur .+ Ton premier achat groupé est offert\.$/)).toBeVisible();
    await b.page.getByRole("link", { name: "Voir mon achat groupé" }).click();
    await b.page.waitForURL(/\/achats-groupes\/[0-9a-f-]{36}$/);
    const besoinB = b.page.url().split("/").pop()!;

    // 4. La clôture : une liste propre par négoce ; X ne chiffre pas les liteaux (offre incomplète) ; Y dépose un PDF douteux.
    await tache(page, new Date(new Date(achatA.clotureLe).getTime() + 3_600_000));
    const jeton = async (email: string) => /\/achat-groupe\/([A-Za-z0-9_-]+)/.exec((await emailsVers(page, email)).filter((m) => / : achat groupé /.test(m.subject)).at(-1)!.text)![1]!;
    expect((await emailsVers(page, negoceX.email)).at(-1)!.text).not.toMatch(/commission/i);
    const negoce = await browser.newPage();
    await negoce.goto(`/achat-groupe/${await jeton(negoceX.email)}`);
    // Point 3 (Greg, 28 octobre) : le titre, la date limite et « Déposer mon offre » visibles sans défiler ; PDF et Excel sous le titre.
    await expect(negoce.getByRole("heading", { name: "Demande de prix groupée" })).toBeVisible();
    await expect(negoce.getByText(/^Réponse avant le /)).toBeInViewport();
    await expect(negoce.getByRole("button", { name: "Déposer mon offre" })).toBeInViewport();
    await expect(negoce.getByRole("link", { name: "Télécharger en PDF" })).toBeVisible();
    const excelExporte = await telecharger(negoce, "Exporter en Excel");
    expect(excelExporte.suggestedFilename()).toBe("demande-mobiiz.xlsx");
    const pdfDemande = await telecharger(negoce, "Télécharger en PDF");
    expect(pdfDemande.suggestedFilename()).toBe("demande-mobiiz.pdf");
    if (process.env.CAPTURE_SE === "1") {
      await pdfDemande.saveAs(`test-results/achat-groupe/${projet}-demande-mobiiz.pdf`);
      await excelExporte.saveAs(`test-results/achat-groupe/${projet}-demande-mobiiz.xlsx`);
    }
    await capture(negoce, projet, "4a-page-negoce-accueil");
    // X répond par l'Excel rempli : un prix sur l'ardoise, les liteaux laissés vides, la ligne vide est en rouge et se règle sur place.
    const rempli = await remplirExcel(await excelExporte.path(), { E2: 1.1 });
    await negoce.getByRole("button", { name: "Déposer mon offre" }).click();
    await expect(negoce.getByRole("heading", { name: "Comment voulez-vous répondre ?" })).toBeVisible();
    await capture(negoce, projet, "4b-trois-facons-de-repondre");
    await negoce.getByRole("button", { name: /^Déposer l'Excel rempli/ }).click();
    await negoce.getByLabel("Votre fichier Excel").setInputFiles(rempli);
    await expect(negoce.getByText("1 ligne à compléter, en rouge.")).toBeVisible();
    await expect(negoce.getByLabel("Prix de Ardoise 32×22 Espagne 1er choix")).toHaveValue("1,1");
    await expect(negoce.getByText("Prix vide dans le fichier")).toBeVisible();
    await capture(negoce, projet, "4c-excel-lu-ligne-vide");
    // Le clavier ouvert (point 1) : le prix à corriger reste visible au-dessus du clavier, sur téléphone.
    await clavierOuvert(negoce, negoce.getByLabel("Prix de Liteaux 27×38"));
    await negoce.getByRole("listitem").filter({ hasText: "Liteaux 27×38" }).getByRole("checkbox", { name: "Je ne fournis pas" }).check();
    await negoce.getByRole("button", { name: "Continuer" }).click();
    await expect(negoce.getByRole("heading", { name: "Votre offre" })).toBeVisible();
    await expect(negoce.getByText("Total HT livré")).toBeVisible();
    await expect(negoce.getByText("1 ligne non fournie", { exact: false })).toBeVisible();
    await negoce.getByText("Pour ouvrir un compte chez vous").click();
    await negoce.getByRole("checkbox", { name: "Kbis de moins de 3 mois" }).check();
    await negoce.getByRole("checkbox", { name: "RIB" }).check();
    await negoce.getByRole("radio", { name: "Paiement comptant au départ" }).check();
    await negoce.getByRole("checkbox", { name: /J'accepte les conditions/ }).check();
    await capture(negoce, projet, "4d-recapitulatif");
    await negoce.getByRole("button", { name: "Envoyer mon offre" }).click();
    await expect(negoce.getByText(/^Offre envoyée le /)).toBeVisible();
    await expect(negoce.getByRole("button", { name: "Déposer mon offre" })).toHaveCount(0);
    await capture(negoce, projet, "4e-offre-envoyee");
    // La confirmation par e-mail, avec le PDF de l'offre.
    const confirmation = (await emailsVers(page, negoceX.email)).find((m) => m.subject.startsWith("Offre enregistrée"))!;
    expect(confirmation.text).toContain("Total HT livré");
    // Y dépose son devis PDF.
    await negoce.goto(`/achat-groupe/${await jeton(negoceY.email)}`);
    await negoce.getByRole("button", { name: "Déposer mon offre" }).click();
    await negoce.getByRole("button", { name: /^Déposer mon devis PDF/ }).click();
    await negoce.getByLabel("Votre devis PDF").setInputFiles(path.join(__dirname, "fixtures", "devis-fournisseur-couvreur.pdf"));
    await negoce.getByRole("button", { name: "Continuer" }).click();
    await negoce.getByRole("checkbox", { name: /J'accepte les conditions/ }).check();
    await negoce.getByRole("button", { name: "Envoyer mon offre" }).click();
    await expect(negoce.getByText(/^Offre envoyée le /)).toBeVisible();
    await negoce.close();
    expect((await tache(page, new Date(new Date(achatA.reponseAvantLe).getTime() + 3_600_000))).analyses).toBe(1);
    await page.goto(`/achats-groupes/${besoinA}`);
    await expect(page.getByText("Offres reçues, vérification en cours")).toBeVisible();

    const adm = await admin(browser, `/admin/achats-groupes/${achatA.achatId}`);
    await expect(adm.page.getByText(/^2 sur 2 négoces ont répondu/)).toBeVisible();
    const offreX = adm.page.getByLabel(`Offre ${negoceX.nom}`);
    // Le suivi par négoce : X a vu, téléchargé le PDF et l'Excel, répondu ; Y a vu et répondu.
    await expect(offreX.getByLabel(`Suivi ${negoceX.nom}`)).toHaveText(/✓ Vu.*✓ PDF téléchargé.*✓ Excel téléchargé.*✓ Répondu/);
    await expect(adm.page.getByLabel(`Suivi ${negoceY.nom}`)).toHaveText(/✓ Vu.*PDF téléchargé.*Excel téléchargé.*✓ Répondu/);
    await expect(adm.page.getByLabel(`Suivi ${negoceY.nom}`)).not.toHaveText(/✓ PDF/);
    const offreY = adm.page.getByLabel(`Offre ${negoceY.nom}`);
    await expect(offreX.getByText("Non chiffrées : Liteaux 27×38")).toBeVisible();
    await expect(offreX.getByText("Pour commander, ouvre un compte : Kbis de moins de 3 mois, RIB, Paiement comptant au départ.")).toBeVisible();
    await expect(offreY.getByRole("list", { name: "Alertes" })).toBeVisible();
    await expect(offreY.getByRole("link", { name: /Ouvrir le devis d'origine/ })).toBeVisible();
    await capture(adm.page, projet, "4b-validation-admin");
    await offreY.getByRole("button", { name: "Écarter" }).click();
    await expect(offreY.getByText("Écartée")).toBeVisible();
    await adm.page.getByRole("button", { name: "Publier" }).click();
    await expect(adm.page.getByText("Publié : chaque artisan a reçu sa comparaison.")).toBeVisible();
    await adm.ctx.close();

    // 5. La publication : B n'a pas de compte chez X (le gagnant) : ses conditions, puis ses coordonnées avec son accord.
    await b.page.goto(`/achats-groupes/${besoinB}`);
    await expect(b.page.getByText(/^Ta liste chez le meilleur négoce : 990,00 € HT, livraison comprise\.$/)).toBeVisible();
    const offre = b.page.getByRole("region", { name: "Les offres" });
    await expect(offre.getByText("Pour commander, ouvre un compte : Kbis de moins de 3 mois, RIB, Paiement comptant au départ.")).toBeVisible();
    await offre.getByRole("checkbox", { name: /J'accepte que Mobiiz transmette/ }).check();
    await capture(b.page, projet, "5a-publication-sans-compte");
    await offre.getByRole("button", { name: "Je suis intéressé, transmettre mes coordonnées" }).click();
    await expect(offre.getByText(`Tes coordonnées sont parties : ${negoceX.nom} te rappelle de la part de Mobiiz.`)).toBeVisible();
    expect((await emailsVers(page, negoceX.email)).some((m) => m.subject.startsWith("Ouverture de compte"))).toBe(true);
    await capture(b.page, projet, "5b-coordonnees-transmises");
    await b.ctx.close();

    // 6. A sort de l'achat groupé : chantier annulé, en un clic avec le motif.
    await page.goto(`/achats-groupes/${besoinA}`);
    await expect(page.getByText("1 ligne non chiffrée chez ce négoce")).toBeVisible();
    // Point 8 (28 octobre 2026) : les sorties sont dans le menu « ··· » en haut à droite.
    await page.getByRole("button", { name: "Plus d'actions sur l'achat groupé" }).click();
    await page.getByRole("menuitem", { name: "Sortir de l'achat groupé" }).click();
    await page.getByRole("button", { name: "Mon client a annulé le chantier" }).click();
    await expect(page.getByRole("alertdialog", { name: "Sortir de l'achat groupé" })).toBeVisible();
    await capture(page, projet, "6a-sortie-confirmer");
    await page.getByRole("button", { name: "Oui, sortir" }).click();
    await expect(page.getByText("Tu es sorti de cet achat groupé", { exact: true })).toBeVisible();
    await capture(page, projet, "6b-sortie");
  });
});
