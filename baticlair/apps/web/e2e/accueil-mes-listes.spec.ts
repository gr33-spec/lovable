import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { confirmerEmail } from "./confirmer-email";

/**
 * L'ACCUEIL ET « MES LISTES » (Greg, 1er novembre 2026, maquette « Bonjour Greg ») : 1) « À faire maintenant » (une action,
 * la règle de priorité, « Voir N autres brouillons », la reprise exacte)
 * (Greg, 6 novembre 2026 : « À faire » ne montre que des actions, sinon « Aucun besoin en cours ») ; 2) « Mes listes » : la carte et son « … », la suppression
 * définitive (annuler, confirmer, double clic, refus motivé, sélection multiple sans suppression partielle silencieuse).
 * Rien n'est envoyé à un négoce depuis l'accueil. Données de test seulement.
 */
const SECRET = "Bearer e2e-secret-de-la-tache";
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

test.beforeEach(async ({ page, request }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  expect((await request.post("/v1/internal/test/mode-regroupement", { headers: { authorization: SECRET }, data: { mode: "automatique" } })).status()).toBe(200);
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

async function inscrire(page: Page, prenom = "Jean") {
  const entreprise = `Toitures ${unique()}`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill(`${prenom} Martin`);
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  const email = `artisan-${unique()}@example.fr`;
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`^Bonjour ${prenom}`) }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  // Greg, 1er novembre 2026 : un e-mail confirmé pour ajouter des quantités à un achat groupé (boîte de test).
  await confirmerEmail(page, email);
  return entreprise;
}

/** Une liste saisie (aucune IA), renommée. */
async function liste(page: Page, nom: string) {
  const q = await apiJson<{ id: string; projetId: string }>(page, "POST", "/v1/quantitatifs", { lignes: [{ libelle: "Ardoise naturelle 32×22", quantite: "900", unite: "pièces" }] });
  expect(q.status).toBe(201);
  expect((await apiJson(page, "PATCH", `/v1/projects/${q.body.projetId}`, { name: nom })).status).toBe(200);
  return q.body;
}

/** Une liste validée et une demande partie chez un négoce (boîte de test, jamais un vrai e-mail). */
async function demandeEnvoyee(page: Page, nom: string) {
  const q = await liste(page, nom);
  let current = (await apiJson<{ questions: { id: string; boutons: { valeur: string }[] }[] }>(page, "GET", `/v1/quantitatifs/${q.id}`)).body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0]!;
    current = (await apiJson<typeof current>(page, "POST", `/v1/quantitatifs/${q.id}/reponses`, { reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await apiJson(page, "POST", `/v1/quantitatifs/${q.id}/validation`)).status).toBe(200);
  const supplier = (await apiJson<{ id: string }>(page, "POST", "/v1/suppliers", { name: `Négoce ${unique()}`, email: `ventes-${unique()}@negoce.example` })).body;
  const created = await apiJson<{ id: string; recipients: { id: string }[] }>(page, "POST", `/v1/projects/${q.projetId}/price-requests`, { supplierIds: [supplier.id] });
  expect(created.status).toBe(201);
  const recipientId = created.body.recipients[0]!.id;
  expect((await apiJson(page, "POST", `/v1/price-request-recipients/${recipientId}/send`)).status).toBe(200);
  return { projectId: q.projetId, recipientId };
}

/** Le négoce a répondu : son devis rangé à la main (PDF de test). */
async function reponseRecue(page: Page, recipientId: string) {
  const companyId = await page.evaluate(() => localStorage.getItem("baticlair.companyId"));
  const res = await page.request.post(`/v1/price-request-recipients/${recipientId}/quote`, {
    headers: companyId ? { "x-company-id": companyId } : {},
    multipart: { file: { name: "devis-negoce.pdf", mimeType: "application/pdf", buffer: fs.readFileSync(path.join(__dirname, "fixtures", "devis-fournisseur-2.pdf")) } },
  });
  expect(res.status(), await res.text()).toBeLessThan(300);
}

test("À faire (Greg, 6 novembre 2026 ; UX simplifiée du 8 novembre) : un seul bouton principal, « Rien à faire pour le moment » ; « Créer un quantitatif » mène au même départ partout ; rien sous la barre du menu", async ({ page }, info) => {
  await inscrire(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bonjour Jean", level: 1 })).toBeVisible();
  // Seulement des actions : ni « Commencer » ni « Suivi en cours » (le suivi vit dans Demandes et Groupes).
  await expect(page.getByText(/Achète en groupe, paie moins cher|Par où commencer \?|Mes listes et chantiers|Achats groupés près de chez toi/)).toHaveCount(0);
  await expect(page.getByRole("region", { name: "À faire maintenant" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: /^(Commencer|Suivi en cours)$/ })).toHaveCount(0);
  // RÈGLE CHANGÉE (Greg, 7 novembre 2026) : « Aucun besoin en cours », puis des actions écrites en toutes lettres.
  // UX simplifiée (Greg, 8 novembre 2026) : UN bouton principal, « Créer un quantitatif » ; rien d'autre que ce qui attend.
  await expect(page.getByText("Rien à faire pour le moment.")).toBeVisible();
  for (const t of ["Achat individuel", "Achats groupés"]) await expect(page.getByRole("main").getByRole("heading", { name: t, exact: true })).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("link", { name: /^Ajouter un matériau|^Depuis un quantitatif|^Mes besoins groupés/ })).toHaveCount(0);
  const vide = page.getByRole("main");
  await expect(vide.getByRole("link", { name: /^Créer un quantitatif/ })).toHaveAttribute("href", "/chantiers/nouveau");
  // Un seul départ, un seul nom (revue UX, 8 novembre 2026) : la carte de l'écran vide, le bouton de Demandes et, sur
  // ordinateur, celui de la colonne. Sur téléphone, la barre du bas ne porte plus de bouton de création.
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  if (info.project.name === "telephone") await expect(nav.getByRole("link", { name: "Créer un quantitatif" })).toHaveCount(0);
  else await expect(nav.getByRole("link", { name: "Créer un quantitatif" })).toHaveAttribute("href", "/chantiers/nouveau");
  await vide.getByRole("link", { name: /^Créer un quantitatif/ }).click();
  await expect(page).toHaveURL(/\/chantiers\/nouveau$/);
  await expect(page.getByRole("dialog", { name: "Nouveau quantitatif" })).toBeVisible();
  await page.goto("/chantiers");
  await expect(page.getByRole("link", { name: "Créer un quantitatif" }).first()).toHaveAttribute("href", "/chantiers/nouveau");
  // Téléphone : l'écran vide se lit au-dessus de la barre du menu.
  if (info.project.name === "telephone") {
    await page.goto("/");
    const fin = page.getByText("Rien à faire pour le moment.");
    await fin.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const [b, n] = [await fin.boundingBox(), await nav.boundingBox()];
    expect(b!.y + b!.height).toBeLessThanOrEqual(n!.y + 1);
  }
});

test("Accueil : plusieurs brouillons, le plus récent d'abord ; « Voir 1 autre brouillon » ; « Continuer » reprend exactement la saisie", async ({ page }) => {
  await inscrire(page);
  // Un brouillon d'achat groupé, plus ancien.
  expect((await apiJson(page, "PUT", "/v1/brouillons", { cle: "achat-groupe:test", type: "achat-groupe", titre: "Achat groupé couverture · 1 ligne", url: "/achats-groupes/lancer", etape: 1, donnees: { lignes: [] } })).status).toBe(200);
  await page.waitForTimeout(50);
  // Puis une liste commencée dans « Saisir ma liste » et quittée.
  await page.goto("/chantiers/nouveau");
  await page.getByRole("button", { name: "Ajouter : photo, document ou catalogue" }).click(); await page.getByRole("button", { name: "Parcourir le catalogue" }).click();
  const ecran = page.getByRole("dialog", { name: "Saisir ma liste" });
  await ecran.getByLabel("Rechercher un matériau").fill("Liteaux 27×38 maison");
  await ecran.getByRole("button", { name: /Ajouter « Liteaux 27×38 maison » tel que je l'écris/ }).click();
  await ecran.getByRole("button", { name: "Ajouter à la sélection" }).click();
  await page.waitForTimeout(800);
  await page.goto("/");
  const afaire = page.getByRole("region", { name: "À faire maintenant" });
  await expect(afaire).toBeVisible();
  const premiere = afaire.getByRole("link").first();
  await expect(premiere).toContainText("Brouillon");
  await expect(premiere).toContainText("Terminer ta liste");
  await expect(premiere).toContainText("Ta liste · 1 matériau");
  await expect(premiere).toContainText("Continuer");
  await expect(afaire.getByRole("link")).toHaveCount(1);
  await afaire.getByRole("button", { name: "Voir 1 autre brouillon" }).click();
  await expect(afaire.getByRole("link", { name: /^Terminer ton achat groupé/ })).toBeVisible();
  await premiere.click();
  await expect(page).toHaveURL(/\/chantiers\/nouveau\?liste=1$/);
  await expect(page.getByRole("dialog", { name: "Saisir ma liste" }).getByRole("region", { name: "Ma liste en cours" }).getByLabel("Désignation")).toHaveValue("Liteaux 27×38 maison");
});

test("À faire : une demande envoyée sans réponse n'y est pas ; la réponse reçue passe « À faire maintenant » ; rien ne part depuis l'accueil", async ({ page }) => {
  await inscrire(page);
  const { projectId, recipientId } = await demandeEnvoyee(page, "Maison Dupont");
  const demandes = async () => (await apiJson<{ items: { recipients: unknown[] }[] }>(page, "GET", `/v1/projects/${projectId}/price-requests`)).body.items;
  const avant = JSON.stringify(await demandes());
  await page.goto("/");
  await expect(page.getByText("Rien à faire pour le moment.")).toBeVisible();
  await expect(page.getByRole("region", { name: "À faire maintenant" })).toHaveCount(0);

  await reponseRecue(page, recipientId);
  await page.goto("/");
  const afaire = page.getByRole("region", { name: "À faire maintenant" });
  await expect(afaire.getByRole("link").first()).toContainText("Voir les réponses de tes négoces");
  await expect(afaire.getByRole("link").first()).toContainText("Maison Dupont");
  await expect(page.getByText("Rien à faire pour le moment.")).toHaveCount(0);
  // Ouvrir l'accueil ne déclenche aucun envoi : la demande est la même qu'avant.
  expect(JSON.stringify((await demandes()).map((d) => ({ ...d, recipients: d.recipients.length })))).toBe(JSON.stringify(JSON.parse(avant).map((d: { recipients: unknown[] }) => ({ ...d, recipients: d.recipients.length }))));
  await afaire.getByRole("link").first().click();
  await expect(page).toHaveURL(new RegExp(`/chantiers/${projectId}`));
});

test("Groupes : un achat groupé actif se suit dans « Mes groupes » (« Inscriptions ouvertes ») ; jamais « Seul jusqu'au… »", async ({ page }) => {
  await inscrire(page);
  const dep = String(1 + Math.floor(Math.random() * 19)).padStart(2, "0");
  expect((await apiJson(page, "PATCH", "/v1/company/profile", { name: `Toitures ${unique()}`, address: `3 rue de la Gare, ${dep}100 Ville-${dep}`, siret: "73282932000074", phone: null, email: null })).status).toBe(200);
  expect((await apiJson(page, "POST", "/v1/groupe/siret")).status).toBe(200);
  const cat = (await apiJson<{ articles?: { cle: string; libelle: string; unite: string }[] }>(page, "GET", "/v1/achats-groupes/catalogue")).body;
  const art = cat.articles?.[0];
  const ligne = art ? { designation: art.libelle, quantite: 120, unite: art.unite, cle: art.cle } : { designation: "Ardoise naturelle 32x22", quantite: 900, unite: "pièces", libre: true };
  const dans = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10);
  const r = await apiJson(page, "POST", "/v1/achats-groupes", { achatId: null, lignes: [ligne], livraison: `${dep}100 Ville-${dep}`, dateBesoin: dans, negoces: [{ nom: "Négoce test", email: `test-${unique()}@negoce.example` }], engagement: true });
  expect(r.status, JSON.stringify(r.body)).toBeLessThan(300);
  await page.goto("/achats-groupes");
  await expect(page.getByRole("tab", { name: "Mes groupes" })).toHaveAttribute("aria-selected", "true");
  const carte = page.getByRole("tabpanel", { name: "Mes groupes" }).getByRole("region", { name: /^Mes (participations|propositions)$/ }).getByRole("link").filter({ hasText: "Inscriptions ouvertes" }).first();
  await expect(carte).toBeVisible();
  await expect(page.getByText(/Seul jusqu/)).toHaveCount(0);
  await carte.click();
  await expect(page).toHaveURL(/\/achats-groupes\/[0-9a-f-]{36}$/);
  await expect(page.getByText(/Seul jusqu/)).toHaveCount(0);
});

test("Mes listes : le nom, la recherche, les filtres, la carte ; supprimer un brouillon (annuler, puis confirmer ; un double clic ne part qu'une fois) ; la carte disparaît tout de suite", async ({ page }) => {
  await inscrire(page);
  const garde = await liste(page, "Liste gardée");
  const brouillon = await liste(page, "Liste de test à jeter");
  await page.goto("/chantiers");
  await expect(page.getByRole("heading", { name: "Mes demandes", level: 1 })).toBeVisible();
  await expect(page.getByRole("searchbox")).toHaveAttribute("placeholder", "Rechercher une demande…");
  await expect(page.getByRole("group", { name: "Filtrer" }).getByRole("button")).toHaveText(["Toutes", "À préparer", "Envoyées", "Réponses reçues", "Terminées"]);
  await expect(page.getByRole("button", { name: "Toutes" })).toHaveAttribute("aria-pressed", "true");
  const carte = page.getByRole("link", { name: /^Liste de test à jeter/ });
  await expect(carte).toContainText("1 ligne");
  await expect(carte).toContainText("Saisie");
  await expect(carte).toContainText(/Modifiée le/);
  // Recherche.
  await page.getByRole("searchbox").fill("jeter");
  await expect(carte).toBeVisible();
  await expect(page.getByRole("link", { name: /^Liste gardée/ })).toHaveCount(0);
  await page.getByRole("searchbox").fill("");
  await expect(page.getByRole("link", { name: /^Liste gardée/ })).toBeVisible();

  // Annuler : rien ne part.
  await page.getByRole("button", { name: "Actions : Liste de test à jeter" }).click();
  await page.getByRole("menuitem", { name: "Supprimer définitivement" }).click();
  const fenetre = page.getByRole("alertdialog", { name: "Supprimer définitivement cette liste ?" });
  await expect(fenetre).toContainText("« Liste de test à jeter » et ses données associées seront supprimées. Cette action est irréversible.");
  await expect(fenetre).toContainText("Les crédits d'analyse déjà utilisés ne seront pas recrédités.");
  await fenetre.getByRole("button", { name: "Annuler" }).click();
  await expect(carte).toBeVisible();
  expect((await apiJson(page, "GET", `/v1/projects/${brouillon.projetId}`)).status).toBe(200);

  // Confirmer, d'un double clic : une seule requête.
  const appels: string[] = [];
  page.on("request", (r) => r.url().endsWith("/v1/listes/suppression") && r.method() === "POST" && appels.push(r.url()));
  await page.getByRole("button", { name: "Actions : Liste de test à jeter" }).click();
  await page.getByRole("menuitem", { name: "Supprimer définitivement" }).click();
  await fenetre.getByRole("button", { name: "Supprimer définitivement" }).dblclick();
  await expect(page.getByRole("status").filter({ hasText: "Liste supprimée définitivement" })).toBeVisible();
  await expect(carte).toHaveCount(0);
  expect(appels).toHaveLength(1);
  expect((await apiJson(page, "GET", `/v1/projects/${brouillon.projetId}`)).status).toBe(404);
  expect((await apiJson(page, "GET", `/v1/projects/${garde.projetId}`)).status).toBe(200);
  await page.reload();
  await expect(page.getByRole("link", { name: /^Liste de test à jeter/ })).toHaveCount(0);
});

test("Mes listes : une liste envoyée ne se supprime pas (raison dite) ; « Sélectionner » plusieurs : la non supprimable est expliquée avant toute action, les autres partent sur un geste explicite", async ({ page }) => {
  await inscrire(page);
  await demandeEnvoyee(page, "Liste envoyée");
  const a = await liste(page, "Brouillon A");
  const b = await liste(page, "Brouillon B");
  await page.goto("/chantiers");
  // Seule : la raison précise, et « Marquer terminée » (l'action qui existe vraiment).
  await page.getByRole("button", { name: "Actions : Liste envoyée" }).click();
  await page.getByRole("menuitem", { name: "Supprimer définitivement" }).click();
  const refus = page.getByRole("alertdialog", { name: "Cette liste ne peut pas être supprimée" });
  await expect(refus).toContainText("Cette liste est liée à une demande déjà envoyée. Elle ne peut pas être supprimée.");
  await expect(refus.getByRole("button", { name: "Marquer terminée" })).toBeVisible();
  await refus.getByRole("button", { name: "Fermer" }).click();

  // Sélection multiple.
  await page.getByRole("button", { name: "Sélectionner" }).click();
  const barre = page.getByRole("region", { name: "Sélection" });
  await expect(barre.getByRole("button", { name: "Supprimer (0)" })).toBeDisabled();
  for (const nom of ["Liste envoyée", "Brouillon A", "Brouillon B"]) await page.getByRole("checkbox", { name: `Choisir : ${nom}` }).check();
  await barre.getByRole("button", { name: "Supprimer (3)" }).click();
  const explication = page.getByRole("alertdialog", { name: "1 listes ne peuvent pas être supprimées" }).or(page.getByRole("alertdialog", { name: /ne peuvent pas être supprimées|ne peut pas être supprimée/ }));
  await expect(explication).toContainText("Liste envoyée");
  await expect(explication).toContainText("Cette liste est liée à une demande déjà envoyée.");
  // Rien n'est parti tant que l'artisan n'a pas choisi.
  expect((await apiJson(page, "GET", `/v1/projects/${a.projetId}`)).status).toBe(200);
  await explication.getByRole("button", { name: "Supprimer les 2 autres listes" }).click();
  const confirmer = page.getByRole("alertdialog", { name: "Supprimer définitivement 2 listes ?" });
  await expect(confirmer).toContainText("Brouillon A");
  await expect(confirmer).toContainText("Brouillon B");
  await confirmer.getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect(page.getByRole("status").filter({ hasText: "2 listes supprimées définitivement" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Brouillon [AB]/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Liste envoyée/ })).toBeVisible();
  for (const id of [a.projetId, b.projetId]) expect((await apiJson(page, "GET", `/v1/projects/${id}`)).status).toBe(404);
});

test("Accueil et Mes listes, thèmes clair et sombre : le titre et le texte des cartes se lisent (contraste AA)", async ({ page }) => {
  await inscrire(page);
  // « À faire » vide d'abord (« Créer un quantitatif »), puis la liste créée pour « Mes demandes ».
  for (const [url, texte, theme] of [["/", "Créer un quantitatif", "sombre"], ["/", "Créer un quantitatif", "clair"], ["/chantiers", "Liste du thème", "sombre"], ["/chantiers", "Liste du thème", "clair"]] as const) {
    if (url === "/chantiers" && theme === "sombre") await liste(page, "Liste du thème");
    await page.evaluate((t) => localStorage.setItem("mobiiz-theme", t), theme);
    {
      await page.goto(url);
      await expect(page.locator("main").getByText(texte, { exact: true }).first()).toBeVisible();
      const ratios = await page.evaluate((cible) => {
        const toile = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
        const rgb = (c: string) => {
          toile.clearRect(0, 0, 1, 1);
          toile.fillStyle = c;
          toile.fillRect(0, 0, 1, 1);
          const [r, g, b, a] = toile.getImageData(0, 0, 1, 1).data;
          return [r!, g!, b!, a! / 255];
        };
        const lum = (c: number[]) => [0, 1, 2].reduce((s, i) => { const x = c[i]! / 255; return s + [0.2126, 0.7152, 0.0722][i]! * (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); }, 0);
        const fond = (el: Element | null): number[] => {
          for (let e = el; e; e = e.parentElement) {
            const c = rgb(getComputedStyle(e).backgroundColor);
            if (c[3]! > 0.9) return c;
          }
          return rgb(getComputedStyle(document.body).backgroundColor);
        };
        const ratio = (el: Element) => {
          const t = rgb(getComputedStyle(el).color);
          const f = fond(el);
          const m = [0, 1, 2].map((i) => t[i]! * t[3]! + f[i]! * (1 - t[3]!));
          const [a, b] = [lum(m), lum(f)].sort((x, y) => y - x);
          return (a! + 0.05) / (b! + 0.05);
        };
        const h1 = document.querySelector("main h1")!;
        const carte = [...document.querySelectorAll("main a span")].find((s) => s.textContent === cible)!;
        return { titre: ratio(h1), carte: ratio(carte) };
      }, texte);
      expect(ratios.titre, `${theme} ${url} titre`).toBeGreaterThanOrEqual(4.5);
      expect(ratios.carte, `${theme} ${url} carte`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test("Audit UX (1er novembre 2026) : sur un iPhone SE, « Sélectionner » ne chevauche plus les filtres ; « Télécharger » du PDF est lisible ; le menu du bas en 12 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await inscrire(page);
  // Deux listes : l'offre gratuite des e2e (paywall allumé) en permet trois.
  const { projetId } = await liste(page, "Liste A");
  await liste(page, "Liste B");
  await page.goto("/chantiers");
  const selectionner = page.getByRole("button", { name: "Sélectionner" });
  await expect(selectionner).toBeVisible();
  const s = (await selectionner.boundingBox())!;
  // Cinq filtres : la rangée défile au doigt ; seuls ceux visibles dans la rangée peuvent chevaucher « Sélectionner ».
  const rangee = (await page.getByRole("group", { name: "Filtrer" }).boundingBox())!;
  for (const nom of ["Toutes", "À préparer", "Envoyées", "Réponses reçues", "Terminées"]) {
    const brut = (await page.getByRole("group", { name: "Filtrer" }).getByRole("button", { name: nom }).boundingBox())!;
    const gauche = Math.max(brut.x, rangee.x);
    const droite = Math.min(brut.x + brut.width, rangee.x + rangee.width);
    if (droite <= gauche) continue;
    const f = { x: gauche, y: brut.y, width: droite - gauche, height: brut.height };
    const chevauche = f.x < s.x + s.width && s.x < f.x + f.width && f.y < s.y + s.height && s.y < f.y + f.height;
    expect(chevauche, `« ${nom} » chevauche « Sélectionner »`).toBe(false);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  // Le menu du bas : libellés à 12 px, sans déborder.
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  for (const nom of ["À faire", "Demandes", "Achats groupés"]) {
    const lien = nav.getByRole("link", { name: nom });
    expect(await lien.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(12);
    const b = (await lien.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(375);
  }
  // L'afficheur PDF : « Télécharger » en encre sur le jaune (plus de blanc sur jaune), « Fermer » lisible en sombre.
  for (const theme of ["sombre", "clair"] as const) {
    await page.evaluate((t) => localStorage.setItem("mobiiz-theme", t), theme);
    await page.goto("/chantiers");
    await page.getByRole("heading", { name: "Mes demandes", level: 1 }).waitFor();
    await page.evaluate((id) => window.dispatchEvent(new CustomEvent("baticlair:open-file", { detail: { url: `/v1/projects/${id}/demande-de-devis.pdf?apercu=1`, title: "Le PDF joint", fileName: "demande.pdf" } })), projetId);
    const telecharger = page.getByRole("link", { name: "Télécharger" });
    await expect(telecharger).toBeVisible({ timeout: 30_000 });
    expect(await telecharger.evaluate((el) => getComputedStyle(el).color), theme).toBe("rgb(19, 9, 1)");
    expect(await page.getByRole("button", { name: "Fermer le document" }).evaluate((el) => getComputedStyle(el).color), theme).toBe("rgb(255, 255, 255)");
    await page.getByRole("button", { name: "Fermer le document" }).click();
  }
});

test("Dossier d'une demande (Greg, 6 novembre 2026) : Suivi, Offres, Documents ; le négoce va répondre, demande une précision, l'artisan répond d'ici ; l'onglet se garde dans l'adresse", async ({ page }, info) => {
  test.setTimeout(120_000);
  await inscrire(page);
  const { projectId, recipientId } = await demandeEnvoyee(page, "Toiture Le Goff");
  // Le négoce, par son lien sécurisé (boîte de test) : « Je vais répondre », puis une question.
  const demande = (await apiJson<{ items: { recipients: { id: string; supplier: { email: string } }[] }[] }>(page, "GET", `/v1/projects/${projectId}/price-requests`)).body.items[0]!;
  const emailNegoce = demande.recipients[0]!.supplier.email;
  const mails = await page.evaluate(async (to) => (await (await fetch(`/v1/internal/test/emails?to=${encodeURIComponent(to)}`, { headers: { authorization: "Bearer e2e-secret-de-la-tache" } })).json()).emails as { text: string }[], emailNegoce);
  const jeton = /\/chiffrer\/([A-Za-z0-9_-]+)/.exec(mails.at(-1)!.text)![1]!;
  const negoce = await page.context().newPage();
  await negoce.goto(`/chiffrer/${jeton}`);
  const reponse = negoce.getByRole("region", { name: "Votre réponse" });
  await reponse.getByRole("button", { name: "Je vais répondre" }).click();
  await expect(reponse.getByText(/sait que vous allez répondre/)).toBeVisible();
  await reponse.getByRole("button", { name: "J'ai besoin d'une précision" }).click();
  await reponse.getByLabel("Votre question").fill("Les liteaux : traités classe 2 ou classe 4 ?");
  await reponse.getByRole("button", { name: "Envoyer ma question" }).click();
  await expect(negoce.getByRole("region", { name: "Votre question" })).toContainText("sa réponse s'affichera ici");
  await negoce.screenshot({ path: `test-results/negoce/${info.project.name}-question.png`, fullPage: true });

  await page.goto(`/chantiers/${projectId}`);
  const onglets = page.getByRole("tablist", { name: "Dossier de la demande" });
  await expect(onglets.getByRole("tab")).toHaveText(["Suivi", "Offres", "Documents"]);
  await expect(onglets.getByRole("tab", { name: "Suivi" })).toHaveAttribute("aria-selected", "true");
  // Suivi : le négoce, son intention, sa question ; l'artisan répond d'ici.
  const suivi = page.getByRole("region", { name: "Suivi de la demande" });
  await expect(suivi.getByText("Va répondre")).toBeVisible();
  await expect(suivi).toContainText("Les liteaux : traités classe 2 ou classe 4 ?");
  await expect(suivi.getByRole("link", { name: /^Écrire à Négoce/ })).toHaveAttribute("href", /^mailto:ventes-/);
  await suivi.getByLabel("Ta réponse").fill("Classe 4, autoclave vert.");
  await suivi.getByRole("button", { name: /^Envoyer ma réponse à / }).click();
  await expect(suivi.getByText("Ta réponse : « Classe 4, autoclave vert. »")).toBeVisible();
  await suivi.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/negoce/${info.project.name}-suivi.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  // La réponse s'affiche sur la page du négoce.
  await negoce.reload();
  await expect(negoce.getByRole("region", { name: "Votre question" })).toContainText("Classe 4, autoclave vert.");
  await negoce.close();
  // Offres : rien encore, puis le devis rangé.
  await onglets.getByRole("tab", { name: "Offres" }).click();
  await expect(page).toHaveURL(/onglet=offres/);
  await expect(page.getByRole("tabpanel", { name: "Offres" }).getByText("Aucune offre reçue pour l'instant. Tu seras prévenu à chaque réponse.")).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Suivi", includeHidden: true })).toBeHidden();
  await reponseRecue(page, recipientId);
  await page.reload();
  const offres = page.getByRole("tabpanel", { name: "Offres" });
  await expect(offres.getByRole("button", { name: "Ouvrir le devis (PDF)" })).toBeVisible();
  // Documents : la demande envoyée et le devis du négoce.
  await onglets.getByRole("tab", { name: "Documents" }).click();
  const documents = page.getByRole("tabpanel", { name: "Documents" });
  await expect(documents.getByRole("button", { name: /^Demande envoyée à Négoce/ })).toBeVisible();
  await expect(documents.getByRole("button", { name: /^Devis d'un négoce/ })).toBeVisible();
  // Retour au Suivi : l'écran du chantier, tel qu'avant ; une ancienne adresse (« reponses ») mène au Suivi.
  await onglets.getByRole("tab", { name: "Suivi" }).click();
  await expect(page).not.toHaveURL(/onglet=/);
  await expect(page.getByRole("tabpanel", { name: "Suivi" })).toBeVisible();
  await page.goto(`/chantiers/${projectId}?onglet=reponses`);
  await expect(onglets.getByRole("tab", { name: "Suivi" })).toHaveAttribute("aria-selected", "true");
  // Grand écran (1536 px et plus, revue UX du 8 novembre 2026) : la liste des demandes reste à gauche.
  if (page.viewportSize()!.width >= 1280) {
    await page.setViewportSize({ width: 1600, height: 900 });
    await expect(page.getByRole("navigation", { name: "Mes demandes" }).getByRole("link", { name: /Toiture Le Goff/ })).toHaveAttribute("aria-current", "page");
  }
});
