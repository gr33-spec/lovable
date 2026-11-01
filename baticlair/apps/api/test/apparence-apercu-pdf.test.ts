import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * APPARENCE, « TA DEMANDE DE PRIX » (Greg, 1er novembre 2026) : l'aperçu en direct des réglages est LE MÊME document que
 * le PDF téléchargé et que le PDF envoyé (même générateur, mêmes données, même logo, même adresse de réponse) ; sans
 * demande, un exemple marqué « Exemple » ; le modèle et la couleur essayés à l'écran ne changent rien tant qu'ils ne
 * sont pas enregistrés ; jamais le logo, les coordonnées ou les réglages d'une autre entreprise.
 */
let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
});

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==", "base64");

const binaire = (agent: Agent, url: string) =>
  agent
    .get(url)
    .buffer(true)
    .parse((res, cb) => {
      const c: Buffer[] = [];
      res.on("data", (d: Buffer) => c.push(d));
      res.on("end", () => cb(null, Buffer.concat(c)));
    });

async function texte(bytes: Uint8Array): Promise<string[]> {
  const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker;
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) out.push(...(await (await doc.getPage(i)).getTextContent()).items.flatMap((x) => ("str" in x && x.str.trim() ? [x.str] : [])));
  return out;
}

async function demandeEnvoyee(agent: Agent) {
  const q = (await agent.post("/v1/quantitatifs").send({ reference: "Dupont", adresse: "12 rue de Siam, 29200 Brest", lignes: [{ libelle: "Chatière de ventilation", quantite: "4", unite: "u" }] })).body;
  let current = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0];
    current = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await agent.post(`/v1/quantitatifs/${q.id}/validation`)).status).toBe(200);
  const supplier = (await agent.post("/v1/suppliers").send({ name: "Négoce Dupont", email: "ventes@dupont.example" })).body;
  const res = await agent.post(`/v1/projects/${q.projetId}/price-requests`).send({ supplierIds: [supplier.id] });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return { requestId: res.body.id as string, recipientId: res.body.recipients[0].id as string };
}

describe("Apparence : l'aperçu du PDF de la demande de prix", () => {
  it("sans demande : un exemple marqué « Exemple », aux vraies coordonnées de l'entreprise ; le modèle essayé change l'aperçu, pas le réglage", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    await agent.patch("/v1/company/profile").send({ name: "BATI INVEST", address: "12 rue des Artisans, 44000 Nantes", siret: "73282932000074", phone: "06 47 10 04 99", email: null }).expect(200);
    const res = await binaire(agent, "/v1/price-requests/settings/apercu.pdf").expect(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["x-apercu-exemple"]).toBe("1");
    const t = await texte(res.body as Buffer);
    expect(t.join(" ")).toMatch(/Exemple/);
    expect(t.join(" ")).toMatch(/BATI INVEST/);
    expect(t).toContain("Demande de prix — Matériaux");
    // Essayer « Détaillé » : l'aperçu change (la description numérotée) ; le réglage enregistré reste « classique ».
    const detaille = await texte((await binaire(agent, "/v1/price-requests/settings/apercu.pdf?modele=detaille&couleur=bleu").expect(200)).body as Buffer);
    expect(detaille).toContain("N°");
    expect((await agent.get("/v1/price-requests/settings")).body).toMatchObject({ modelePdf: "classique", couleurPdf: "mobiiz" });
    expect((await agent.get("/v1/price-requests/settings/apercu.pdf?modele=inconnu")).status).toBe(400);
  });

  it("avec une demande : l'aperçu est le PDF téléchargé, mot pour mot, et ses lignes sont celles du PDF envoyé ; il suit le modèle enregistré", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    await agent.put("/v1/company/logo").attach("file", PNG, { filename: "logo.png", contentType: "image/png" });
    const { requestId, recipientId } = await demandeEnvoyee(agent);
    await agent.post(`/v1/price-request-recipients/${recipientId}/send`).expect(200);
    const apercuRes = await binaire(agent, "/v1/price-requests/settings/apercu.pdf").expect(200);
    expect(apercuRes.headers["x-apercu-exemple"]).toBe("0");
    const apercu = await texte(apercuRes.body as Buffer);
    const telecharge = await texte((await binaire(agent, `/v1/price-requests/${requestId}/demande-de-devis.pdf`).expect(200)).body as Buffer);
    expect(apercu).toEqual(telecharge);
    const mail = ctx.emails.sent.find((m) => m.attachments?.some((a) => a.contentType === "application/pdf"));
    const envoye = await texte(Buffer.from(mail!.attachments!.find((a) => a.contentType === "application/pdf")!.contentBase64, "base64"));
    for (const l of ["Demande de prix — Matériaux", "Chatière de ventilation", "BATI INVEST"]) {
      expect(apercu.join(" ")).toContain(l);
      expect(envoye.join(" ")).toContain(l);
    }
    // Enregistrer « Essentiel » : l'aperçu le suit (plus de bref).
    await agent.patch("/v1/price-requests/settings").send({ modelePdf: "essentiel" }).expect(200);
    const essentiel = await texte((await binaire(agent, "/v1/price-requests/settings/apercu.pdf").expect(200)).body as Buffer);
    expect(essentiel).not.toContain("Le chantier en bref");
    expect(apercu).toContain("Le chantier en bref");
  });

  it("deux entreprises : chacune voit son propre document, jamais le nom, les coordonnées ou la demande de l'autre", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    await a.agent.patch("/v1/company/profile").send({ name: "BATI INVEST", address: "12 rue des Artisans, 44000 Nantes", siret: "73282932000074", phone: "06 47 10 04 99", email: null }).expect(200);
    await demandeEnvoyee(a.agent);
    await a.agent.patch("/v1/price-requests/settings").send({ couleurPdf: "vert" }).expect(200);
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Couverture Le Gall");
    const res = await binaire(b.agent, "/v1/price-requests/settings/apercu.pdf").expect(200);
    expect(res.headers["x-apercu-exemple"]).toBe("1");
    const t = (await texte(res.body as Buffer)).join(" ");
    expect(t).toMatch(/Couverture Le Gall/);
    expect(t).not.toMatch(/BATI INVEST|06 47 10 04 99|Chatière|Nantes/);
    expect((await b.agent.get("/v1/price-requests/settings")).body.couleurPdf).toBe("mobiiz");
  });
});
