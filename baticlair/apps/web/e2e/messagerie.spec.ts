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
 * LA MESSAGERIE, COMME GMAIL (Greg, 22 novembre 2026) : la réponse du négoce rangée sous son chantier (« 1 réponse sur 1 »),
 * qui se déplie sur place ; le message ouvert en plein écran sur téléphone, à droite sur ordinateur ; « Répondre » qui part
 * de l'adresse Mobiiz et se retrouve dans « Envoyés » ; Retour ramène au même endroit, le chantier toujours déplié ;
 * « Signaler comme indésirable » et « Ce n'est pas un indésirable ».
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

test("messagerie : Reçus par chantier, Répondre depuis Mobiiz, Envoyés, Retour au même endroit, Indésirables", async ({ page }, info) => {
  const { adresse } = await inscrire(page);
  const { etiquette } = await demandeEnvoyee(page);
  const nom = adresse.split("@")[0]!;
  // Relu comme chez Resend, avec son authentification (sans elle, il irait « à classer »).
  await emailRecu(page, `${nom}+r${etiquette}@mobiiz.test`, "Re: votre demande", { attachmentsBase64: [] });
  await page.goto("/messages");
  await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Dossiers" }).getByRole("button")).toHaveText(["Reçus", "Envoyés", "Indésirables"]);
  const chantier = page.getByRole("button", { name: /Négoce · .*1 réponse sur 1/ });
  await expect(chantier).toBeVisible();
  await expect(chantier).toHaveAttribute("aria-expanded", "false");
  await chantier.click();
  await expect(chantier).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("link", { name: /^Négoce Dupont/ }).click();
  const ordi = info.project.name === "ordinateur";
  // Ordinateur : le message s'ouvre à droite de la liste ; téléphone : en plein écran.
  const zone = ordi ? page.getByRole("region", { name: "Message ouvert" }) : page;
  if (!ordi) await expect(page).toHaveURL(/\/messages\/negoce\//);
  await expect(zone.getByRole("list", { name: "Fil des messages" })).toBeVisible();
  // Jamais de bouton « Appeler » dans un échange avec un négoce.
  await expect(zone.getByRole("link", { name: /^Appeler/ })).toHaveCount(0);
  await zone.getByLabel("Répondre à Négoce Dupont").fill("Merci, c'est possible livré jeudi ?");
  await zone.getByRole("button", { name: "Envoyer ma réponse" }).click();
  await expect(zone.getByRole("status").filter({ hasText: "Réponse envoyée." })).toBeVisible();
  await expect(zone.getByText("Toi · Ta réponse")).toBeVisible();
  if (!ordi) {
    // Retour ramène exactement où l'on était : la boîte, le chantier toujours déplié.
    await page.getByRole("button", { name: "Retour" }).click();
    await expect(page).toHaveURL(/\/messages$/);
    await expect(page.getByRole("button", { name: /Négoce · .*1 réponse sur 1/ })).toHaveAttribute("aria-expanded", "true");
  }
  // Envoyés : la demande de prix et la réponse, au nom de l'artisan.
  await page.getByRole("group", { name: "Dossiers" }).getByRole("button", { name: "Envoyés" }).click();
  const envoyes = page.getByRole("list", { name: "Messages envoyés" });
  await expect(envoyes.getByText("Ta réponse")).toBeVisible();
  await expect(envoyes.getByText("Demande de prix")).toBeVisible();
  // Un message sans demande, signalé indésirable, puis remis.
  await emailRecu(page, adresse, "Promo du mois", { from: "Pub <promo@pub.example>", attachmentsBase64: [] });
  await page.getByRole("group", { name: "Dossiers" }).getByRole("button", { name: "Reçus" }).click();
  await page.getByRole("link", { name: /E-mail à classer, Pub/ }).click();
  const zone2 = ordi ? page.getByRole("region", { name: "Message ouvert" }) : page;
  await zone2.getByRole("button", { name: "Signaler comme indésirable" }).click();
  await expect(zone2.getByText("Ce message est dans les indésirables")).toBeVisible();
  await zone2.getByRole("button", { name: "Ce n'est pas un indésirable" }).click();
  await expect(zone2.getByRole("button", { name: "Signaler comme indésirable" })).toBeVisible();
});
