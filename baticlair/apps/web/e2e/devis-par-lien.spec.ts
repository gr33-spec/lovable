import { expect, test, type Page } from "@playwright/test";

/**
 * UN SEUL BOUTON, ET LA COMPARAISON RESTE (Greg, 28 octobre 2026, points 7 et 8) : la liste part par « Demander les prix
 * à mes négoces » ; deux négoces répondent par le lien de chiffrage (sans PDF) ; le chantier propose « Comparer », les
 * devis se rangent du moins cher au plus cher, livraison comprise, et « Commander » (avec sa confirmation) passe à « Commandé ».
 */
const SECRET = "Bearer e2e-secret-de-la-tache";
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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
const jetonDe = async (page: Page, to: string) => {
  const mails = (await apiJson<{ emails: { text: string }[] }>(page, "GET", `/v1/internal/test/emails?to=${encodeURIComponent(to)}`, undefined, SECRET)).body.emails;
  return /\/chiffrer\/([A-Za-z0-9_-]+)/.exec(mails.at(-1)!.text)![1]!;
};

test("deux réponses par le lien : « Comparer », du moins cher au plus cher, puis « Commander »", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  const entreprise = `Toitures ${unique()}`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Jean Martin");
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(`artisan-${unique()}@example.fr`);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: /^Bonjour Jean/ }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  expect((await apiJson(page, "PATCH", "/v1/company/profile", { name: entreprise, address: "3 rue de la Gare, 22300 Lannion", siret: "73282932000074", phone: null, email: null })).status).toBe(200);

  // La liste, validée, part chez deux négoces (le chemin de « Demander les prix à mes négoces »).
  const q = await apiJson<{ projetId: string }>(page, "POST", "/v1/quantitatifs", { lignes: [{ libelle: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "1000", unite: "pièces" }, { libelle: "Liteau sapin traité 27×38", quantite: "100", unite: "m" }] });
  const projectId = q.body.projetId;
  const { takeoff } = (await apiJson<{ takeoff: { id: string } }>(page, "GET", `/v1/projects/${projectId}/takeoff`)).body;
  expect((await apiJson(page, "POST", `/v1/takeoffs/${takeoff.id}/validate`)).status).toBe(200);
  const tag = unique();
  const negoces = [`b-${tag}@negoce.example`, `c-${tag}@negoce.example`];
  const ids: string[] = [];
  for (const [i, email] of negoces.entries()) ids.push((await apiJson<{ id: string }>(page, "POST", "/v1/suppliers", { name: i === 0 ? "Négoce Bleu" : "Négoce Cyan", email })).body.id);
  const demande = await apiJson<{ recipients: { id: string }[] }>(page, "POST", `/v1/projects/${projectId}/price-requests`, { supplierIds: ids });
  expect(demande.status).toBe(201);
  for (const r of demande.body.recipients) expect((await apiJson(page, "POST", `/v1/price-request-recipients/${r.id}/send`)).status).toBe(200);

  // Les deux négoces chiffrent par le lien : Cyan est le moins cher, livraison comprise.
  for (const [email, pu, livraison] of [
    [negoces[0]!, 1.1, 80],
    [negoces[1]!, 1, 0],
  ] as const) {
    const jeton = await jetonDe(page, email);
    const cles = (await apiJson<{ lignes: { cle: string }[] }>(page, "GET", `/v1/public/chiffrer/${jeton}`)).body.lignes.map((l) => l.cle);
    expect((await apiJson(page, "POST", `/v1/public/chiffrer/${jeton}`, { prix: Object.fromEntries(cles.map((k) => [k, pu])), livraisonHt: livraison, delaiJours: 3, validiteJours: 14 })).status).toBe(200);
  }

  await page.goto(`/chantiers/${projectId}`);
  await page.getByRole("button", { name: "Comparer", exact: true }).click();
  const feuille = page.getByRole("dialog", { name: "Devis reçus" });
  await expect(feuille.getByLabel("Devis de Négoce Cyan")).toContainText("Le moins cher");
  await expect(feuille.getByLabel("Devis de Négoce Cyan")).toContainText("HT livré");
  await expect(feuille.getByLabel("Devis de Négoce Bleu")).toContainText(/dont livraison 80,00 €.* de plus/);
  const [premier, second] = await Promise.all([feuille.getByLabel("Devis de Négoce Cyan").boundingBox(), feuille.getByLabel("Devis de Négoce Bleu").boundingBox()]);
  expect(premier!.y).toBeLessThan(second!.y);
  await feuille.getByLabel("Devis de Négoce Cyan").getByRole("button", { name: "Commander" }).click();
  await expect(page.getByRole("dialog", { name: "Confirmer la commande" })).toContainText("HT livré");
  // Greg, 16 novembre 2026 : la date de livraison souhaitée se choisit avant de confirmer.
  await page.getByRole("dialog", { name: "Confirmer la commande" }).getByLabel("Date de livraison souhaitée").fill(new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10));
  await page.getByRole("dialog", { name: "Confirmer la commande" }).getByRole("button", { name: "Confirmer la commande" }).click();
  await expect(page.getByRole("status", { name: "Commandé" })).toContainText("Commandé chez Négoce Cyan.");
});

/**
 * RECETTE N° 2 DU 14 NOVEMBRE 2026 (bloquants N1 et N2). Depuis le tri par métier du négoce, une liste de plusieurs métiers
 * part en plusieurs demandes. Avant : l'écran ne les reconnaissait plus, « Aucune offre reçue », aucun bouton. Et « Je
 * retiens ce négoce » disait « C'est commandé » sans rien envoyer. Maintenant : chaque demande a son suivi, « Comparer »
 * marche, « Commander » demande confirmation et le bon de commande part réellement au négoce.
 */
test("envoi trié par métier : les offres de chaque demande se comparent, « Commander » envoie le bon de commande au négoce", async ({ page }) => {
  test.setTimeout(150_000);
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  const entreprise = `Toitures ${unique()}`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Jean Martin");
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(`artisan-${unique()}@example.fr`);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: /^Bonjour Jean/ }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  expect((await apiJson(page, "PATCH", "/v1/company/profile", { name: entreprise, address: "3 rue de la Gare, 22300 Lannion", siret: "73282932000074", phone: null, email: null })).status).toBe(200);

  const q = await apiJson<{ projetId: string }>(page, "POST", "/v1/quantitatifs", {
    lignes: [
      { libelle: "Ardoise naturelle 32×22", quantite: "1000", unite: "pièces" },
      { libelle: "Gouttière zinc demi-ronde de 25", quantite: "24", unite: "m" },
    ],
  });
  const projectId = q.body.projetId;
  const tag = unique();
  const fiches = [
    { name: "Ardoisier Vert", email: `v-${tag}@negoce.example`, specialites: ["couverture"] },
    { name: "Zingueur Bleu", email: `b-${tag}@negoce.example`, specialites: ["zinguerie"] },
    { name: "Zingueur Cyan", email: `c-${tag}@negoce.example`, specialites: ["zinguerie"] },
  ];
  const ids: string[] = [];
  for (const f of fiches) ids.push((await apiJson<{ id: string }>(page, "POST", "/v1/suppliers", f)).body.id);
  // Comme l'écran « À qui j'envoie ? » : le serveur trie, une demande par groupe, toutes dans le même lot.
  const tri = (await apiJson<{ toutPourTous: boolean; groupes: { supplierIds: string[]; articles?: string[] }[] }>(page, "POST", `/v1/projects/${projectId}/price-requests/repartition`, { supplierIds: ids })).body;
  expect(tri.toutPourTous).toBe(false);
  expect(tri.groupes).toHaveLength(2);
  const lot = crypto.randomUUID();
  for (const g of tri.groupes) {
    const d = await apiJson<{ recipients: { id: string }[] }>(page, "POST", `/v1/projects/${projectId}/price-requests`, { supplierIds: g.supplierIds, articles: g.articles, lot });
    expect(d.status).toBe(201);
    for (const r of d.body.recipients) expect((await apiJson(page, "POST", `/v1/price-request-recipients/${r.id}/send`)).status).toBe(200);
  }
  // Les deux zingueurs chiffrent par le lien : Cyan est le moins cher.
  for (const [email, pu] of [
    [fiches[1]!.email, 12],
    [fiches[2]!.email, 10],
  ] as const) {
    const jeton = await jetonDe(page, email);
    const cles = (await apiJson<{ lignes: { cle: string }[] }>(page, "GET", `/v1/public/chiffrer/${jeton}`)).body.lignes.map((l) => l.cle);
    // La gouttière et sa naissance (indissociable) : le zingueur ne reçoit que ses lignes, jamais l'ardoise.
    expect(cles).toHaveLength(2);
    expect((await apiJson(page, "POST", `/v1/public/chiffrer/${jeton}`, { prix: Object.fromEntries(cles.map((k) => [k, pu])), livraisonHt: 0, delaiJours: 3, validiteJours: 14 })).status).toBe(200);
  }

  await page.goto(`/chantiers/${projectId}`);
  // Chaque demande a son bloc ; plus de « À qui j'envoie la liste ? » alors que tout est parti.
  const zinc = page.getByRole("region", { name: /^Demande \d sur 2 · 2 lignes · Zingueur Bleu, Zingueur Cyan$/ });
  await expect(zinc).toBeVisible();
  await expect(page.getByRole("region", { name: /^Demande \d sur 2 · 1 ligne · Ardoisier Vert$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "À qui j'envoie la liste ?" })).toHaveCount(0);
  await zinc.getByRole("button", { name: "Comparer", exact: true }).click();
  const feuille = page.getByRole("dialog", { name: "Devis reçus" });
  await expect(feuille.getByLabel("Devis de Zingueur Cyan")).toContainText("Le moins cher");
  await expect(feuille.getByLabel("Devis de Zingueur Cyan")).toContainText("60,00 € HT livré");
  await feuille.getByLabel("Devis de Zingueur Cyan").getByRole("button", { name: "Commander" }).click();
  const confirmation = page.getByRole("dialog", { name: "Confirmer la commande" });
  await expect(confirmation).toContainText("Tu commandes chez Zingueur Cyan.");
  await expect(confirmation).toContainText(fiches[2]!.email);
  // Rien n'est commandé avant la confirmation.
  await expect(page.getByRole("status", { name: "Commandé" })).toHaveCount(0);
  await expect(confirmation.getByRole("button", { name: "Confirmer la commande" })).toBeDisabled();
  await confirmation.getByLabel("Date de livraison souhaitée").fill(new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10));
  await confirmation.getByRole("button", { name: "Confirmer la commande" }).click();
  await expect(zinc.getByRole("status", { name: "Commandé" })).toContainText("Commandé chez Zingueur Cyan.");
  await expect(zinc.getByRole("status", { name: "Commandé" })).toContainText("bon de commande envoyé le");
  // Le bon de commande est réellement parti au négoce, en pièce jointe.
  const mails = (await apiJson<{ emails: { subject: string; text: string; attachments?: { filename: string }[] }[] }>(page, "GET", `/v1/internal/test/emails?to=${encodeURIComponent(fiches[2]!.email)}`, undefined, SECRET)).body.emails;
  const bon = mails.find((m) => m.subject.startsWith("Bon de commande de"));
  expect(bon).toBeTruthy();
  expect(bon!.subject).toContain("60,00 € HT livré");
  // Greg, 16 novembre 2026 : le négoce retenu lit la date de livraison souhaitée, mot pour mot.
  expect(bon!.text).toMatch(/C'est OK pour moi, livraison souhaitée le \d{1,2}(er)? \S+ \d{4}, on s'appelle pour caler les détails\./);
  await expect(zinc.getByRole("status", { name: "Commandé" })).toContainText("Livraison souhaitée le");
  // Juste après : « Prévenir les autres négoces consultés ? ». Rien n'est parti avant la réponse.
  const autres = async () => (await apiJson<{ emails: { subject: string; text: string }[] }>(page, "GET", `/v1/internal/test/emails?to=${encodeURIComponent(fiches[1]!.email)}`, undefined, SECRET)).body.emails.filter((m) => /suite à ma demande de prix/.test(m.subject));
  const question = zinc.getByRole("group", { name: "Prévenir les autres négoces consultés ?" });
  await expect(question).toBeVisible();
  expect(await autres()).toHaveLength(0);
  await question.getByRole("button", { name: "Oui", exact: true }).click();
  await expect(zinc.getByText("Les autres négoces consultés sont prévenus.")).toBeVisible();
  await expect(question).toHaveCount(0);
  const poli = await autres();
  expect(poli).toHaveLength(1);
  expect(poli[0]!.text).toContain("Merci pour votre offre, elle n'a pas été retenue cette fois. Je vous recontacte pour mes prochains chantiers.");
  // Jamais le prix ni le nom du négoce retenu ; le retenu, lui, ne reçoit pas ce message, ni l'ardoisier d'une autre demande.
  expect(poli[0]!.text + poli[0]!.subject).not.toMatch(/Cyan|60,00|10,00|€/);
  for (const f of [fiches[0]!, fiches[2]!]) expect((await apiJson<{ emails: { subject: string }[] }>(page, "GET", `/v1/internal/test/emails?to=${encodeURIComponent(f.email)}`, undefined, SECRET)).body.emails.filter((m) => /suite à ma demande de prix/.test(m.subject))).toHaveLength(0);
  // L'onglet « Offres » montre les offres (avant : « Aucune offre reçue »).
  await page.goto(`/chantiers/${projectId}?onglet=offres`);
  await expect(page.getByLabel("Offre de Zingueur Cyan")).toBeVisible();
  await expect(page.getByText("Aucune offre reçue")).toHaveCount(0);
});

/**
 * LE RAPPEL DE SUIVI (Greg, 16 novembre 2026) : « 7 jours après réception des réponses à une demande directe, si rien n'a
 * été commandé dans Mobiiz, rappel à l'artisan : "Où en es-tu avec cette demande ?" Un seul bouton "C'est réglé". Sans
 * clic, la demande reste en rappel. » Aucun fil de discussion avec le négoce : ils s'appellent.
 */
test("rappel de suivi à 7 jours : « Où en es-tu avec cette demande ? » sur l'accueil et le chantier, un seul bouton « C'est réglé »", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  const entreprise = `Toitures ${unique()}`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Jean Martin");
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(`artisan-${unique()}@example.fr`);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: /^Bonjour Jean/ }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  expect((await apiJson(page, "PATCH", "/v1/company/profile", { name: entreprise, address: "3 rue de la Gare, 22300 Lannion", siret: "73282932000074", phone: null, email: null })).status).toBe(200);
  const q = await apiJson<{ projetId: string }>(page, "POST", "/v1/quantitatifs", { lignes: [{ libelle: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "1000", unite: "pièces" }] });
  const projectId = q.body.projetId;
  const { takeoff } = (await apiJson<{ takeoff: { id: string } }>(page, "GET", `/v1/projects/${projectId}/takeoff`)).body;
  expect((await apiJson(page, "POST", `/v1/takeoffs/${takeoff.id}/validate`)).status).toBe(200);
  const email = `s-${unique()}@negoce.example`;
  const negoce = (await apiJson<{ id: string }>(page, "POST", "/v1/suppliers", { name: "Négoce Suivi", email })).body.id;
  const demande = await apiJson<{ recipients: { id: string }[] }>(page, "POST", `/v1/projects/${projectId}/price-requests`, { supplierIds: [negoce] });
  expect((await apiJson(page, "POST", `/v1/price-request-recipients/${demande.body.recipients[0]!.id}/send`)).status).toBe(200);
  const jeton = await jetonDe(page, email);
  const cles = (await apiJson<{ lignes: { cle: string }[] }>(page, "GET", `/v1/public/chiffrer/${jeton}`)).body.lignes.map((l) => l.cle);
  expect((await apiJson(page, "POST", `/v1/public/chiffrer/${jeton}`, { prix: Object.fromEntries(cles.map((k) => [k, 1])), livraisonHt: 0, delaiJours: 3, validiteJours: 30 })).status).toBe(200);

  // Avant 7 jours : la réponse attend comme d'habitude, sans question de suivi.
  const question = page.getByRole("group", { name: "Où en es-tu avec cette demande ?" });
  await page.goto(`/chantiers/${projectId}`);
  await expect(page.getByRole("button", { name: "Voir le devis reçu" })).toBeVisible();
  await expect(question).toHaveCount(0);
  // Huit jours plus tard, la tâche passe : la question est sur l'accueil (« À faire maintenant ») et sur le chantier.
  const tache = await apiJson<{ suivis: number }>(page, "GET", `/v1/internal/demandes-perso?maintenant=${encodeURIComponent(new Date(Date.now() + 8 * 86_400_000).toISOString())}`, undefined, SECRET);
  expect(tache.body.suivis).toBeGreaterThanOrEqual(1);
  await page.goto("/");
  const afaire = page.getByRole("region", { name: "À faire maintenant", exact: true });
  await expect(afaire).toContainText("Où en es-tu avec cette demande ?");
  await afaire.getByRole("link").filter({ hasText: "Où en es-tu avec cette demande ?" }).first().click();
  await expect(question).toBeVisible();
  // Un seul bouton ; pas de fil de discussion avec le négoce.
  await expect(question.getByRole("button")).toHaveCount(1);
  await expect(question.getByRole("button", { name: "C'est réglé" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /message|Écrire/i })).toHaveCount(0);
  // Sans clic, elle reste : rechargé, toujours là.
  await page.reload();
  await expect(question).toBeVisible();
  await question.getByRole("button", { name: "C'est réglé" }).click();
  await expect(question).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Demande réglée" })).toBeVisible();
  // Le devis reste consultable ; l'accueil ne la réclame plus.
  await expect(page.getByRole("button", { name: "Voir le devis reçu" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Bonjour Jean/ })).toBeVisible();
  await expect(page.getByText("Où en es-tu avec cette demande ?")).toHaveCount(0);
});
