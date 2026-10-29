import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

// Lot final, point 1 : au premier envoi, « Avant d'envoyer » (SIRET, prénom, portable) se remplit tout seul dans ces parcours.
test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Avant d'envoyer" }), async () => {
    const d = page.getByRole("dialog", { name: "Avant d'envoyer" });
    await d.getByLabel("SIRET de ton entreprise").fill("73282932000074");
    if (!(await d.getByLabel("Ton prénom").inputValue())) await d.getByLabel("Ton prénom").fill("Jean");
    await d.getByLabel("Ton portable").fill("06 12 34 56 78");
    await d.getByRole("button", { name: "Continuer" }).click();
    await d.waitFor({ state: "detached" });
  });
});


/**
 * R7 (Greg, 26 et 27 octobre 2026) : L'ADRESSE MOBIIZ DE L'ARTISAN. « Voici ton adresse Mobiiz : … C'est elle qui envoie
 * tes demandes de prix. Les réponses des négoces arrivent ici, dans Mobiiz. » L'écran dédié après l'inscription, le bloc
 * « Mon adresse Mobiiz » dans Compte (copier, « Donne-la à tes négoces », la changer une fois), le rappel au premier
 * envoi, puis la réponse d'un négoce (webhook Resend signé) qui arrive sur le chantier avec son PDF, et la boîte
 * « Mes reçus » où un e-mail sans repère se rattache d'un tap. Sur téléphone et sur ordinateur.
 */
const SECRET = "Bearer e2e-secret-de-la-tache";
const WEBHOOK_SECRET = "whsec_ZTJlLXNlY3JldC1kdS13ZWJob29rLTAwMDA=";
const API = "http://localhost:4000";
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
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

/** Le webhook Resend, signé façon Svix, posté directement à l'API (le corps brut compte pour la signature). */
async function emailRecu(page: Page, to: string, subject: string, options: { from?: string; attachmentsBase64?: { filename: string; contentType: string; contentBase64: string }[] } = {}) {
  const corps = JSON.stringify({ type: "email.received", data: { email_id: `e2e-${unique()}`, from: options.from ?? "Négoce Dupont <ventes@dupont.example>", to: [to], subject, created_at: new Date().toISOString() } });
  const ts = Math.floor(Date.now() / 1000);
  const id = `msg_${unique()}`;
  const sig = createHmac("sha256", Buffer.from(WEBHOOK_SECRET.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${corps}`).digest("base64");
  // Le corps relu par le lecteur de test : l'enveloppe suffit (texte et pièces jointes passés par la boîte de test).
  if (options.attachmentsBase64) {
    await page.request.post(`${API}/v1/internal/test/email-recu`, { headers: { authorization: SECRET }, data: { subject, text: "Bonjour, voici notre devis. 1 200 € HT livré.", attachments: options.attachmentsBase64 } });
  }
  const res = await page.request.post(`${API}/v1/webhooks/resend`, { headers: { "svix-id": id, "svix-timestamp": String(ts), "svix-signature": `v1,${sig}`, "content-type": "application/json" }, data: corps });
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()) as { traite: boolean; rattache?: boolean; raison?: string };
}

/** Un artisan inscrit par l'écran, l'écran de l'adresse vu ; rend l'entreprise et l'adresse affichée. */
async function inscrire(page: Page): Promise<{ entreprise: string; adresse: string }> {
  const entreprise = `Toitures ${unique()}`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Jean Martin");
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(`artisan-${unique()}@example.fr`);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  // L'écran dédié, mot pour mot.
  await expect(page.getByRole("heading", { name: "Voici ton adresse Mobiiz :" })).toBeVisible();
  const adresse = (await page.getByLabel("Ton adresse Mobiiz").textContent())!.trim();
  expect(adresse).toMatch(/^toitures-[a-z0-9-]+@mobiiz\.test$/);
  await expect(page.getByText("C'est elle qui envoie tes demandes de prix. Les réponses des négoces arrivent ici, dans Mobiiz.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copier l'adresse" })).toBeVisible();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await expect(page.getByRole("heading", { name: /^(Bonjour Jean|Paie tes matériaux moins cher)/ }).or(page.getByRole("dialog", { name: "Guide" })).first()).toBeVisible();
  return { entreprise, adresse };
}

/** Une liste validée, un négoce, une demande envoyée (par l'API) ; rend le chantier et la demande. */
async function demandeEnvoyee(page: Page): Promise<{ projectId: string; recipientId: string; etiquette: string }> {
  const q = await apiJson<{ id: string; projetId: string; questions: { id: string; boutons: { valeur: string }[] }[] }>(page, "POST", "/v1/quantitatifs", { reference: "Dupont", adresse: "12 rue de Siam, 29200 Brest", lignes: [{ libelle: "Chatière de ventilation", quantite: "4", unite: "u" }] });
  expect(q.status).toBe(201);
  let current = (await apiJson<{ questions: { id: string; boutons: { valeur: string }[] }[] }>(page, "GET", `/v1/quantitatifs/${q.body.id}`)).body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0]!;
    current = (await apiJson<typeof current>(page, "POST", `/v1/quantitatifs/${q.body.id}/reponses`, { reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await apiJson(page, "POST", `/v1/quantitatifs/${q.body.id}/validation`)).status).toBe(200);
  const supplier = (await apiJson<{ id: string }>(page, "POST", "/v1/suppliers", { name: "Négoce Dupont", email: "ventes@dupont.example" })).body;
  const created = await apiJson<{ id: string; recipients: { id: string }[] }>(page, "POST", `/v1/projects/${q.body.projetId}/price-requests`, { supplierIds: [supplier.id] });
  expect(created.status).toBe(201);
  const recipientId = created.body.recipients[0]!.id;
  const sent = await apiJson<{ recipients: { id: string; status: string; etiquette: string | null }[] }>(page, "POST", `/v1/price-request-recipients/${recipientId}/send`);
  expect(sent.status).toBe(200);
  const etiquette = sent.body.recipients.find((r) => r.id === recipientId)!.etiquette!;
  expect(etiquette).toMatch(/^[a-z2-9]{8}$/);
  return { projectId: q.body.projetId, recipientId, etiquette };
}

test("R7 : l'écran dédié, le bloc Compte (copier, modifier une fois), le rappel au premier envoi, la demande qui part de l'adresse", async ({ page }) => {
  const { adresse } = await inscrire(page);
  // Compte : le bloc « Mon adresse Mobiiz », avec « Donne-la à tes négoces ».
  await page.goto("/compte");
  const bloc = page.getByRole("region", { name: "Mon adresse Mobiiz" }).or(page.locator("#adresse"));
  await expect(bloc.getByLabel("Ton adresse Mobiiz")).toHaveText(adresse);
  await expect(bloc.getByText("Donne-la à tes négoces : tout ce qu'ils y envoient arrive ici.")).toBeVisible();
  await bloc.getByRole("button", { name: "Copier l'adresse" }).click();
  await expect(bloc.getByRole("button", { name: "Copiée" })).toBeVisible();
  // La changer une fois : un nom réservé refusé avec sa phrase, puis un nom libre.
  await bloc.getByRole("button", { name: "La modifier" }).click();
  await bloc.getByLabel("Nouvelle adresse (une seule fois)").fill("contact");
  await bloc.getByRole("button", { name: "Vérifier" }).click();
  await expect(bloc.getByText("Cette adresse est réservée.")).toBeVisible();
  const nouvelle = `martin-${unique()}`;
  await bloc.getByLabel("Nouvelle adresse (une seule fois)").fill(nouvelle);
  await bloc.getByRole("button", { name: "Vérifier" }).click();
  await expect(bloc.getByText("Libre.")).toBeVisible();
  await bloc.getByRole("button", { name: "Changer mon adresse" }).click();
  await expect(bloc.getByLabel("Ton adresse Mobiiz")).toHaveText(`${nouvelle}@mobiiz.test`);
  await expect(bloc.getByText(`Ancienne adresse, toujours valable : ${adresse}.`)).toBeVisible();
  await expect(bloc.getByRole("button", { name: "La modifier" })).toHaveCount(0);
  // Le rappel en une ligne au premier envoi, dans « À qui j'envoie ? ».
  const q = await apiJson<{ id: string; projetId: string; questions: { id: string; boutons: { valeur: string }[] }[] }>(page, "POST", "/v1/quantitatifs", { reference: "Dupont", adresse: "12 rue de Siam, 29200 Brest", lignes: [{ libelle: "Chatière de ventilation", quantite: "4", unite: "u" }] });
  let current = (await apiJson<{ questions: { id: string; boutons: { valeur: string }[] }[] }>(page, "GET", `/v1/quantitatifs/${q.body.id}`)).body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0]!;
    current = (await apiJson<typeof current>(page, "POST", `/v1/quantitatifs/${q.body.id}/reponses`, { reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await apiJson(page, "POST", `/v1/quantitatifs/${q.body.id}/validation`)).status).toBe(200);
  expect((await apiJson(page, "POST", "/v1/suppliers", { name: "Négoce Dupont", email: "ventes@dupont.example" })).status).toBe(201);
  await page.goto(`/chantiers/${q.body.projetId}`);
  await page.getByRole("button", { name: /Envoyer au(x)? (fournisseur|négoce)|Demander les prix à mes négoces/ }).first().click();
  const feuille = page.getByRole("dialog", { name: "À qui j'envoie ?" });
  await expect(feuille.getByRole("note")).toHaveText(`Les réponses arrivent dans Mobiiz, on te prévient. ${nouvelle}@mobiiz.test`);
  await feuille.getByRole("button", { name: "Continuer" }).click();
  // Lot final, point 4 : « Voici ce que ton négoce va recevoir », puis « Envoyer ».
  await page.getByRole("dialog", { name: "Voici ce que ton négoce va recevoir" }).getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(page.getByRole("region", { name: "Fournisseurs" })).toBeVisible();
  // La demande est partie de l'adresse Mobiiz, « Répondre » vers l'adresse étiquetée, le repère dans l'objet.
  const mails = (await apiJson<{ emails: { to: string; subject: string; from: string | null; replyTo: string | null }[] }>(page, "GET", "/v1/internal/test/emails?to=ventes%40dupont.example", undefined, SECRET)).body.emails;
  expect(mails.length).toBeGreaterThan(0);
  const m = mails.at(-1)!;
  expect(m.from).toMatch(new RegExp(`^Toitures .* via Mobiiz <${nouvelle}@mobiiz\\.test>$`));
  expect(m.replyTo).toMatch(new RegExp(`^${nouvelle}\\+r[a-z2-9]{8}@mobiiz\\.test$`));
  expect(m.subject).toMatch(/\[réf\. [a-z2-9]{8}\]$/);
  // Au deuxième envoi, plus de rappel.
  await page.reload();
  await expect(page.getByRole("note")).toHaveCount(0);
});

test("lot final, points 1 à 4 : « Avant d'envoyer » une seule fois, l'aperçu fidèle au prénom du commercial, le message modifié, le mail parti à son nom", async ({ page }) => {
  // Ici on remplit l'identité à la main : le remplissage automatique des autres parcours est retiré.
  await page.removeLocatorHandler(page.getByRole("dialog", { name: "Avant d'envoyer" }));
  const { entreprise } = await inscrire(page);
  const q = await apiJson<{ id: string; projetId: string; questions: { id: string; boutons: { valeur: string }[] }[] }>(page, "POST", "/v1/quantitatifs", { reference: "Dupont", adresse: "12 rue de Siam, 29200 Brest", lignes: [{ libelle: "Chatière de ventilation", quantite: "4", unite: "u" }] });
  let current = (await apiJson<{ questions: { id: string; boutons: { valeur: string }[] }[] }>(page, "GET", `/v1/quantitatifs/${q.body.id}`)).body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0]!;
    current = (await apiJson<typeof current>(page, "POST", `/v1/quantitatifs/${q.body.id}/reponses`, { reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await apiJson(page, "POST", `/v1/quantitatifs/${q.body.id}/validation`)).status).toBe(200);
  expect((await apiJson(page, "POST", "/v1/suppliers", { name: "Négoce Dupont", email: "paul@dupont.example", contactName: "Paul" })).status).toBe(201);
  await page.goto(`/chantiers/${q.body.projetId}`);
  await page.getByRole("button", { name: "Demander les prix à mes négoces" }).first().click();
  // Point 1 : la première fois, SIRET, prénom (prérempli du compte ou de l'annuaire), portable ; la phrase de Greg.
  const identite = page.getByRole("dialog", { name: "Avant d'envoyer" });
  await expect(identite.getByText("Ton négoce reçoit la demande au nom de ton entreprise, il doit te reconnaître.")).toBeVisible();
  await identite.getByLabel("SIRET de ton entreprise").fill("73282932000074");
  if (!(await identite.getByLabel("Ton prénom").inputValue())) await identite.getByLabel("Ton prénom").fill("Jean");
  await identite.getByLabel("Ton portable").fill("06 12 34 56 78");
  await identite.getByRole("button", { name: "Continuer" }).click();
  // « À qui j'envoie ? » avec la phrase du ton, puis l'aperçu.
  const qui = page.getByRole("dialog", { name: "À qui j'envoie ?" });
  await expect(qui.getByText("Mets tes négoces en concurrence. Un négoce sérieux répond, et tu sauras vite qui tient la route.")).toBeVisible();
  await qui.getByRole("button", { name: "Continuer" }).click();
  const recoit = page.getByRole("dialog", { name: "Voici ce que ton négoce va recevoir" });
  const mail = recoit.getByLabel("Le mail à ton négoce");
  await expect(mail).toContainText(`Objet : ${entreprise} : demande de prix`);
  await expect(mail).toContainText("Bonjour Paul,");
  await expect(mail).toContainText("Je consulte plusieurs fournisseurs, réponse souhaitée avant le");
  await expect(mail).toContainText("Vous pouvez aussi répondre directement à ce mail, il m'arrive.");
  await expect(mail).toContainText("Un doute ? Appelez-moi au 06 12 34 56 78.");
  await expect(mail).toContainText("Mobiiz, des artisans qui achètent ensemble.");
  // Point 4 : seul le texte libre se modifie ; « Le tutoyer » ; un seul bouton principal.
  await recoit.getByRole("button", { name: "Modifier le message" }).click();
  await recoit.getByLabel("Ton message").fill("Pouvez-vous me chiffrer ces chatières pour vendredi ?");
  await recoit.getByRole("button", { name: "Garder ce message" }).click();
  await expect(mail).toContainText("Pouvez-vous me chiffrer ces chatières pour vendredi ?");
  await recoit.getByRole("button", { name: "Le tutoyer" }).click();
  await expect(mail).toContainText("Salut Paul,");
  await recoit.getByRole("button", { name: "Le vouvoyer" }).click();
  await expect(mail).toContainText("Bonjour Paul,");
  await recoit.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(page.getByRole("region", { name: "Fournisseurs" })).toBeVisible();
  // Point 3 et 5 : expéditeur « Entreprise via Mobiiz », le texte et le HTML, le message gardé.
  const mails = (await apiJson<{ emails: { subject: string; from: string | null; text: string; html?: string | null }[] }>(page, "GET", "/v1/internal/test/emails?to=paul%40dupont.example", undefined, SECRET)).body.emails;
  const m = mails.at(-1)!;
  expect(m.from).toMatch(new RegExp(`^${entreprise} via Mobiiz <`));
  expect(m.subject).toContain(`${entreprise} : demande de prix`);
  expect(m.text).toContain("Pouvez-vous me chiffrer ces chatières pour vendredi ?");
  // Asked once : la deuxième fois, plus d'« Avant d'envoyer » ; l'identité se change dans Profil.
  await page.goto("/compte");
  await expect(page.getByLabel("Ton identité auprès des négoces")).toContainText("SIRET 73282932000074");
});

test("R7 : la réponse du négoce arrive sur le chantier avec son PDF ; un e-mail sans repère va dans « Mes reçus » et se rattache d'un tap", async ({ page }) => {
  const { adresse } = await inscrire(page);
  const nom = adresse.replace(/@.*$/, "");
  const { projectId, recipientId, etiquette } = await demandeEnvoyee(page);
  // « Répondre » du négoce : l'adresse étiquetée.
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>").toString("base64");
  const r1 = await emailRecu(page, `${nom}+r${etiquette}@mobiiz.test`, "Re: votre demande", { attachmentsBase64: [{ filename: "devis-dupont.pdf", contentType: "application/pdf", contentBase64: pdf }] });
  expect(r1).toMatchObject({ traite: true, rattache: true });
  await page.goto(`/chantiers/${projectId}#fournisseurs`);
  // Points 7 et 8 (Greg, 28 octobre 2026) : plus de lecture IA ; un seul bouton principal, « Voir le devis reçu ».
  const fournisseurs = page.getByRole("region", { name: "Fournisseurs" });
  await expect(page.getByRole("region", { name: "Suivi du chantier" })).toContainText("1 devis reçu sur 1 demande.");
  await expect(page.getByText(/n'a pas pu être lu/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^(Réessayer|Comparer les offres|Voir l'offre reçue)$/ })).toHaveCount(0);
  await expect(fournisseurs.getByText("Devis reçu").first()).toBeVisible();
  await fournisseurs.getByRole("button", { name: "Voir le devis reçu" }).click();
  const feuille = page.getByRole("dialog", { name: "Devis reçu" });
  const carte = feuille.getByLabel("Devis de Négoce Dupont");
  // « Négoce Dupont t'a répondu · 28 oct. à 8 h 31 », la première ligne du message, sans l'objet ni de nom de fichier.
  await expect(carte.getByText(/^Négoce Dupont t'a répondu · \d+ \S+ à \d+ h \d{2}$/)).toBeVisible();
  await expect(carte.getByText("Bonjour, voici notre devis. 1 200 € HT livré.")).toBeVisible();
  await expect(carte.getByText(/Re: votre demande|devis-dupont\.pdf/)).toHaveCount(0);
  await carte.getByRole("button", { name: "Ouvrir le devis (PDF)" }).click();
  await expect(page.getByRole("dialog", { name: /^Devis Négoce Dupont/ })).toBeVisible();
  await page.getByRole("button", { name: "Fermer le document" }).click();
  // « Je retiens ce négoce » : la demande passe à « Commandé », sans bouton principal.
  await carte.getByRole("button", { name: "Je retiens ce négoce" }).click();
  await expect(fournisseurs.getByRole("status", { name: "Commandé" })).toContainText("Commandé chez Négoce Dupont.");
  await expect(fournisseurs.getByRole("button", { name: /^Voir les? devis reçus?$/ })).toHaveCount(0);
  // Un e-mail sans étiquette ni repère : « Mes reçus », à rattacher.
  const r2 = await emailRecu(page, `${nom}@mobiiz.test`, "Notre offre spéciale", { from: "Négoce Dupont <ventes@dupont.example>" });
  expect(r2).toMatchObject({ traite: true, rattache: false });
  await page.goto("/recus");
  await expect(page.getByRole("heading", { name: "Mes reçus" })).toBeVisible();
  const aRattacher = page.getByRole("region", { name: "À rattacher" });
  await expect(aRattacher.getByText("Notre offre spéciale")).toBeVisible();
  await aRattacher.getByRole("button", { name: "Rattacher à une demande" }).click();
  await aRattacher.getByRole("group", { name: "Rattacher à une demande" }).getByRole("button", { name: /Négoce Dupont/ }).click();
  await expect(page.getByRole("region", { name: "À rattacher" })).toHaveCount(0);
  const rattaches = page.getByRole("region", { name: "Rattachés" });
  await expect(rattaches.getByText("Notre offre spéciale")).toBeVisible();
  await expect(rattaches.getByText("Re: votre demande")).toBeVisible();
  await expect(rattaches.getByRole("link", { name: "Voir le chantier" }).first()).toHaveAttribute("href", new RegExp(`/chantiers/${projectId}`));
  // L'artisan a été prévenu par e-mail, à son adresse personnelle.
  const avis = (await apiJson<{ emails: { to: string; subject: string }[] }>(page, "GET", `/v1/internal/test/emails?to=${encodeURIComponent("")}`, undefined, SECRET)).body.emails.filter((e) => e.subject === "Négoce Dupont t'a répondu par e-mail");
  expect(avis.length).toBeGreaterThanOrEqual(1);
  expect(avis[0]!.to).toMatch(/^artisan-.*@example\.fr$/);
  expect(recipientId).toBeTruthy();
});
