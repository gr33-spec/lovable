import { createHmac } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { EmailRecu, LecteurEmailRecu } from "../src/platform/email/contact-entrant.js";
import { EMAIL_RECU } from "../src/platform/tokens.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { ReponsesRecuesService } from "../src/modules/adresse-mobiiz/index.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * R7 (Greg, 26 et 27 octobre 2026) : L'ADRESSE MOBIIZ DE L'ARTISAN. « Voici ton adresse Mobiiz : … C'est elle qui
 * envoie tes demandes de prix. Les réponses des négoces arrivent ici, dans Mobiiz. » Chaque entreprise a son adresse
 * (tirée de son nom, jamais deux fois la même, changeable une fois, l'ancienne reste) ; la demande part d'elle avec une
 * étiquette de réponse ; l'e-mail du négoce revient par le webhook, rattaché à sa demande (son PDF devient le devis
 * reçu), sinon dans « Reçus » ; l'artisan est prévenu ; jamais de boucle ; jamais l'e-mail d'une autre entreprise.
 */
let ctx: TestContext;
const SECRET = "whsec_" + Buffer.from("secret-du-webhook-adresse-000").toString("base64");
const CLES = ["GROUPE", "RESEND_WEBHOOK_SECRET", "EMAIL_DOMAINE", "GROUPE_ADMINS"] as const;
const avant = Object.fromEntries(CLES.map((k) => [k, process.env[k]]));
let recuSimule: Partial<EmailRecu> = {};
const lecteur: LecteurEmailRecu = {
  async lire(): Promise<EmailRecu | null> {
    return {
      from: "Négoce Dupont <ventes@dupont.example>",
      to: ["x@mobiiz.fr"],
      subject: "Re: votre demande",
      date: "2026-10-27T09:00:00.000Z",
      text: "Bonjour, voici notre devis. 1 200 € HT livré.",
      html: null,
      attachments: [],
      tropLourdes: [],
      ...recuSimule,
    };
  },
};

function signe(corps: string) {
  const ts = Math.floor(Date.now() / 1000);
  const id = `msg_${Math.random().toString(36).slice(2)}`;
  const sig = createHmac("sha256", Buffer.from(SECRET.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${corps}`).digest("base64");
  return { "svix-id": id, "svix-timestamp": String(ts), "svix-signature": `v1,${sig}`, "content-type": "application/json" };
}
const webhook = (to: string, subject = "Re: votre demande", from = "Négoce Dupont <ventes@dupont.example>") =>
  request(ctx.app.getHttpServer())
    .post("/v1/webhooks/resend")
    .set(signe(JSON.stringify({ type: "email.received", data: { email_id: "em_1", from, to: [to], subject } })))
    .send(JSON.stringify({ type: "email.received", data: { email_id: "em_1", from, to: [to], subject } }));

beforeAll(async () => {
  process.env.GROUPE = "off";
  process.env.RESEND_WEBHOOK_SECRET = SECRET;
  process.env.EMAIL_DOMAINE = "mobiiz.fr";
  delete process.env.GROUPE_ADMINS;
  ctx = await createTestApp((b) => b.overrideProvider(EMAIL_RECU).useValue(lecteur));
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) if (v === undefined) delete process.env[k];
  else process.env[k] = v;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.clear();
  recuSimule = {};
});

/** Le texte d'un PDF, ligne à ligne (pdf.js). */
async function textePdf(bytes: Uint8Array): Promise<string> {
  const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker;
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) out.push(...(await (await doc.getPage(i)).getTextContent()).items.flatMap((x) => ("str" in x ? [x.str] : [])));
  return out.join("\n");
}

async function demande(agent: Agent, fournisseur = "Négoce Dupont", email = "ventes@dupont.example") {
  const q = (await agent.post("/v1/quantitatifs").send({ reference: "Dupont", adresse: "12 rue de Siam, 29200 Brest", lignes: [{ libelle: "Chatière de ventilation", quantite: "4", unite: "u" }] })).body;
  let current = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0];
    current = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await agent.post(`/v1/quantitatifs/${q.id}/validation`)).status).toBe(200);
  const supplier = (await agent.post("/v1/suppliers").send({ name: fournisseur, email })).body;
  const res = await agent.post(`/v1/projects/${q.projetId}/price-requests`).send({ supplierIds: [supplier.id] });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return { projectId: q.projetId as string, requestId: res.body.id as string, recipientId: res.body.recipients[0].id as string };
}

describe("l'adresse Mobiiz de l'artisan", () => {
  it("tirée du nom de l'entreprise, complète avec le domaine, à voir une fois ; deux entreprises du même nom ont deux adresses", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "BATI INVEST");
    const etat = (await agent.get("/v1/company/adresse-mobiiz")).body;
    expect(etat).toMatchObject({ adresse: "bati-invest", domaine: "mobiiz.fr", email: "bati-invest@mobiiz.fr", vueLe: null, anciennes: [], modifiable: true });
    expect((await agent.post("/v1/company/adresse-mobiiz/vue")).body.vueLe).not.toBeNull();
    const b = await signUpWithCompany(ctx.app, "autre@example.fr", "Bati Invest");
    expect((await b.agent.get("/v1/company/adresse-mobiiz")).body.adresse).toBe("bati-invest-2");
    const c = await signUpWithCompany(ctx.app, "trois@example.fr", "Bâti-Invest");
    expect((await c.agent.get("/v1/company/adresse-mobiiz")).body.adresse).toBe("bati-invest-3");
    // Une entreprise d'avant R7 (sans adresse) qui a une adresse postale : son nom et sa commune.
    await c.agent.patch("/v1/company/profile").send({ address: "3 rue de la Gare, 22300 Lannion" });
    await ctx.prisma.adresseMobiiz.deleteMany({ where: { companyId: c.companyId } });
    expect((await c.agent.get("/v1/company/adresse-mobiiz")).body.adresse).toBe("bati-invest-lannion");
  });

  it("changeable une fois ; un nom réservé, pris ou mal formé est refusé avec sa phrase ; l'ancienne reste à l'entreprise", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Martin");
    await signUpWithCompany(ctx.app, "autre@example.fr", "Couverture Lannion");
    expect((await agent.post("/v1/company/adresse-mobiiz/verifier").send({ adresse: "contact" })).body).toEqual({ adresse: "contact", libre: false, raison: "Cette adresse est réservée." });
    expect((await agent.post("/v1/company/adresse-mobiiz/verifier").send({ adresse: "couverture-lannion" })).body.raison).toBe("Déjà prise par une autre entreprise.");
    expect((await agent.post("/v1/company/adresse-mobiiz/verifier").send({ adresse: "Toitures Martin" })).body.raison).toBe("Lettres sans accent, chiffres et tirets seulement.");
    expect((await agent.post("/v1/company/adresse-mobiiz/verifier").send({ adresse: "martin-couverture" })).body).toEqual({ adresse: "martin-couverture", libre: true, raison: null });
    const refus = await agent.put("/v1/company/adresse-mobiiz").send({ adresse: "contact" });
    expect(refus.status).toBe(400);
    expect(refus.body.error.details.phrase).toBe("Cette adresse est réservée.");
    const ok = (await agent.put("/v1/company/adresse-mobiiz").send({ adresse: "martin-couverture" })).body;
    expect(ok).toMatchObject({ adresse: "martin-couverture", anciennes: ["toitures-martin"], modifiable: false });
    const deux = await agent.put("/v1/company/adresse-mobiiz").send({ adresse: "martin-3" });
    expect(deux.status).toBe(409);
    // L'ancienne n'est jamais reprise par une autre entreprise.
    const tiers = await signUpWithCompany(ctx.app, "tiers@example.fr", "Toitures Martin");
    expect((await tiers.agent.get("/v1/company/adresse-mobiiz")).body.adresse).toBe("toitures-martin-2");
  });

  it("la demande de prix part de l'adresse Mobiiz, « Répondre » vers l'adresse étiquetée, le repère dans l'objet", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Martin");
    const { recipientId } = await demande(agent);
    await agent.post(`/v1/price-request-recipients/${recipientId}/send`).expect(200);
    const m = ctx.emails.sent.at(-1)!;
    expect(m.from).toBe("Toitures Martin via Mobiiz <toitures-martin@mobiiz.fr>");
    const etiquette = (await ctx.prisma.priceRequestRecipient.findUniqueOrThrow({ where: { id: recipientId } })).etiquette;
    expect(etiquette).toMatch(/^[a-z2-9]{8}$/);
    expect(m.replyTo).toBe(`toitures-martin+r${etiquette}@mobiiz.fr`);
    expect(m.subject).toMatch(new RegExp(`\\[réf\\. ${etiquette}\\]$`));
    expect(m.to).toBe("ventes@dupont.example");
  });

  it("assistant (31 octobre 2026, point 10) : le PDF joint imprime l'adresse de réponse, la même que « Répondre à » ; l'aperçu, l'adresse Mobiiz", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Martin");
    const { projectId, recipientId } = await demande(agent);
    await agent.post(`/v1/price-request-recipients/${recipientId}/send`).expect(200);
    const m = ctx.emails.sent.at(-1)!;
    const pdf = m.attachments!.find((a) => a.contentType === "application/pdf")!;
    const texte = await textePdf(Buffer.from(pdf.contentBase64, "base64"));
    expect(texte).toContain("Merci d'envoyer votre proposition commerciale à l'adresse suivante :");
    expect(texte).toContain(m.replyTo!);
    // L'aperçu avant envoi : l'adresse Mobiiz de l'entreprise, jamais une adresse inventée.
    const apercu = await agent.post(`/v1/projects/${projectId}/price-requests/preview`).send({});
    expect(apercu.body.document.reponse.adresse).toBe("toitures-martin@mobiiz.fr");
  });

  it("le SMS « Préviens ton négoce » nomme l'adresse Mobiiz qui envoie la demande", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Martin");
    const { requestId } = await demande(agent);
    const res = await agent.get(`/v1/demandes-perso/${requestId}/prevenir`);
    expect(res.status).toBe(200);
    expect(res.body.sms).toBe("Salut, je t'envoie ma demande de prix par Mobiiz, tu vas recevoir un mail de toitures-martin@mobiiz.fr, c'est bien moi.");
  });

  it("la réponse du négoce revient par l'adresse étiquetée : rattachée à sa demande, son PDF devient le devis reçu, l'artisan prévenu", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Martin");
    const { projectId, recipientId } = await demande(agent);
    await agent.post(`/v1/price-request-recipients/${recipientId}/send`).expect(200);
    const etiquette = (await ctx.prisma.priceRequestRecipient.findUniqueOrThrow({ where: { id: recipientId } })).etiquette!;
    ctx.emails.clear();
    const pdf = Buffer.from(await makePdf(["devis"], [], "Total HT 1 200,00", "DEVIS Négoce Dupont"));
    recuSimule = { attachments: [{ filename: "devis-dupont.pdf", contentType: "application/pdf", contentBase64: pdf.toString("base64") }] };
    const res = await webhook(`toitures-martin+r${etiquette}@mobiiz.fr`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ traite: true, rattache: true });
    // La demande est « reçue » avec son devis, comme déposé à la main.
    const req = (await agent.get(`/v1/projects/${projectId}/price-requests`)).body.items[0];
    expect(req.recipients[0].status).toBe("received");
    expect(req.recipients[0].document.name).toBe("devis-dupont.pdf");
    // L'e-mail est gardé, rattaché, avec son fichier.
    const recus = (await agent.get(`/v1/recus?projectId=${projectId}`)).body.items;
    expect(recus).toHaveLength(1);
    expect(recus[0]).toMatchObject({ expediteur: "Négoce Dupont", objet: "Re: votre demande", texte: "Bonjour, voici notre devis. 1 200 € HT livré.", demande: { recipientId, projectId, negoce: "Négoce Dupont" } });
    expect(recus[0].fichiers[0]).toMatchObject({ nom: "devis-dupont.pdf", type: "application/pdf", devisRecu: true });
    const fichier = await agent.get(`/v1/recus/${recus[0].id}/fichiers/${recus[0].fichiers[0].id}`);
    expect(fichier.status).toBe(200);
    expect(fichier.headers["content-type"]).toContain("application/pdf");
    // Prévenu par e-mail à son adresse personnelle (jamais à l'adresse Mobiiz).
    const avis = ctx.emails.sent.find((e) => e.subject.includes("t'a répondu"))!;
    expect(avis.to).toBe("greg@example.fr");
    expect(avis.subject).toBe("Négoce Dupont t'a répondu par e-mail");
    expect(avis.text).toContain(`/chantiers/${projectId}`);
  });

  it("sans étiquette, le repère de l'objet suffit ; sans rien, l'e-mail va dans « Reçus » et se rattache d'un tap", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Martin");
    const { projectId, recipientId } = await demande(agent);
    await agent.post(`/v1/price-request-recipients/${recipientId}/send`).expect(200);
    const etiquette = (await ctx.prisma.priceRequestRecipient.findUniqueOrThrow({ where: { id: recipientId } })).etiquette!;
    expect((await webhook("toitures-martin@mobiiz.fr", `RE: Demande de devis [réf. ${etiquette}]`)).body).toMatchObject({ traite: true, rattache: false });
    expect((await agent.get(`/v1/recus?projectId=${projectId}`)).body.items[0].demande.recipientId).toBe(recipientId);
    // Sans repère : « Reçus », puis rattaché à la demande ; le PDF devient alors le devis reçu.
    const pdf = Buffer.from(await makePdf(["devis"], [], "Total HT 1 300,00", "DEVIS Négoce Dupont"));
    recuSimule = { subject: "Notre offre", attachments: [{ filename: "offre.pdf", contentType: "application/pdf", contentBase64: pdf.toString("base64") }] };
    expect((await webhook("toitures-martin@mobiiz.fr", "Notre offre")).body).toMatchObject({ traite: true, rattache: false });
    const libre = (await agent.get("/v1/recus")).body.items.find((e: { demande: unknown }) => !e.demande);
    expect(libre).toMatchObject({ objet: "Notre offre", demande: null });
    const rattache = await agent.post(`/v1/recus/${libre.id}/rattacher`).send({ recipientId });
    expect(rattache.status).toBe(200);
    expect(rattache.body.demande.recipientId).toBe(recipientId);
    expect(rattache.body.fichiers[0].devisRecu).toBe(true);
    expect((await agent.get(`/v1/projects/${projectId}/price-requests`)).body.items[0].recipients[0].status).toBe("received");
  });

  it("jamais de boucle, jamais l'adresse d'un autre, jamais sans signature ; l'ancienne adresse reçoit encore", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Martin");
    const b = await signUpWithCompany(ctx.app, "autre@example.fr", "Couverture Lannion");
    expect((await webhook("toitures-martin@mobiiz.fr", "Spam", "Mobiiz <contact@mobiiz.fr>")).body).toEqual({ traite: false, raison: "boucle" });
    expect((await webhook("inconnue@mobiiz.fr")).body).toMatchObject({ traite: false, raison: "adresse_inconnue", misDeCote: true });
    expect((await webhook("toitures-martin@mobiiz.fr")).body).toMatchObject({ traite: true });
    expect((await b.agent.get("/v1/recus")).body.items).toEqual([]);
    const mien = (await agent.get("/v1/recus")).body.items[0];
    expect((await b.agent.get(`/v1/recus/${mien.id}`)).status).toBe(404);
    expect((await request(ctx.app.getHttpServer()).post("/v1/webhooks/resend").send({ type: "email.received", data: { from: "x@y.z", to: ["toitures-martin@mobiiz.fr"] } })).status).toBe(403);
    await agent.put("/v1/company/adresse-mobiiz").send({ adresse: "martin-couverture" }).expect(200);
    recuSimule = { subject: "Encore là" };
    expect((await webhook("toitures-martin@mobiiz.fr", "Encore là")).body).toMatchObject({ traite: true });
    expect((await agent.get("/v1/recus")).body.items.map((e: { objet: string }) => e.objet)).toEqual(["Encore là", "Re: votre demande"]);
  });
});

/**
 * CORRECTION APRÈS TEST DE GREG (30 octobre 2026) : « l'adresse Mobiiz de BATI INVEST ne fonctionne pas correctement ».
 * Les variantes d'une même adresse (bati-invest@, batiinvest@, majuscules, point) arrivent au même compte ; une variante
 * déjà prise par une autre entreprise est refusée ; un e-mail à une adresse que personne n'a est mis de côté pour l'admin,
 * qui le rattache à une entreprise (il rejoint alors ses reçus), jamais perdu.
 */
describe("correction après test de Greg : variantes et e-mails mis de côté", () => {
  it("bati-invest@, batiinvest@, BATI-INVEST@ et bati.invest@ arrivent au même compte", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "BATI INVEST");
    expect((await agent.get("/v1/company/adresse-mobiiz")).body.adresse).toBe("bati-invest");
    for (const to of ["bati-invest@mobiiz.fr", "batiinvest@mobiiz.fr", "BATI-INVEST@MOBIIZ.FR", "Bati.Invest@mobiiz.fr", "Greg <BatiInvest@mobiiz.fr>"]) {
      const r = await webhook(to, `Essai ${to}`);
      expect(r.status).toBe(200);
      expect(r.body, to).toMatchObject({ traite: true });
    }
    expect((await agent.get("/v1/recus")).body.items).toHaveLength(5);
  });

  it("une variante d'une adresse prise est refusée à une autre entreprise", async () => {
    await signUpWithCompany(ctx.app, "greg@example.fr", "BATI INVEST");
    const b = await signUpWithCompany(ctx.app, "autre@example.fr", "Toitures Martin");
    const v = (await b.agent.post("/v1/company/adresse-mobiiz/verifier").send({ adresse: "batiinvest" })).body;
    expect(v).toMatchObject({ libre: false, raison: "Déjà prise par une autre entreprise." });
  });

  it("une adresse inconnue : l'e-mail est mis de côté, puis l'admin le rattache et il rejoint les reçus", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "BATI INVEST");
    const r = await webhook("batinvest@mobiiz.fr", "Devis ardoises");
    expect(r.body).toMatchObject({ traite: false, raison: "adresse_inconnue", misDeCote: true });
    const recus = ctx.app.get(ReponsesRecuesService);
    const liste = await recus.misDeCote();
    expect(liste).toHaveLength(1);
    expect(liste[0]).toMatchObject({ adresse: "batinvest@mobiiz.fr", objet: "Re: votre demande", de: "Négoce Dupont <ventes@dupont.example>" });
    expect(liste[0]!.texte).toContain("voici notre devis");
    expect((await agent.get("/v1/recus")).body.items).toHaveLength(0);
    await recus.rattacherMisDeCote(liste[0]!.id, "bati-invest@mobiiz.fr", lecteur);
    expect(await recus.misDeCote()).toHaveLength(0);
    expect((await agent.get("/v1/recus")).body.items).toHaveLength(1);
  });

  it("l'admin des e-mails mis de côté est fermé à un artisan", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "BATI INVEST");
    expect((await agent.get("/v1/admin/emails-mis-de-cote")).status).toBe(403);
  });
});

describe("relecture du 30 octobre 2026 : date illisible", () => {
  it("une date d'e-mail illisible prend l'heure d'arrivée", async () => {
    const { dateLisible } = await import("../src/modules/adresse-mobiiz/application/reponses-recues.service.js");
    const maintenant = new Date("2026-10-30T10:00:00Z");
    expect(dateLisible("pas une date", maintenant)).toEqual(maintenant);
    expect(dateLisible(undefined, maintenant)).toEqual(maintenant);
    expect(dateLisible("2026-10-29T08:31:00Z", maintenant).toISOString()).toBe("2026-10-29T08:31:00.000Z");
  });
});
