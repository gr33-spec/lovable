import { createHmac } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { EmailRecu, LecteurEmailRecu } from "../src/platform/email/contact-entrant.js";
import { htmlExterne, miseEnPage } from "../src/platform/email/mise-en-page.js";
import type { Alerter, AlertKind } from "../src/platform/alerts/alerter.js";
import { ALERTER, EMAIL_RECU } from "../src/platform/tokens.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * LES E-MAILS ENTRANTS, BLINDÉS (Greg, 22 novembre 2026 : « un spam d'arnaque arrivé sur contact@mobiiz.fr et transféré
 * chez moi habillé du logo Mobiiz ; ça ne doit plus jamais arriver, ni pour moi ni pour un artisan »). Les attaques du
 * saboteur, une par une : faux négoce, usurpation de mobiiz.fr, lien piégé, pièce jointe piégée, réponse à une demande
 * qui n'existe pas ; et la vraie réponse d'un négoce, avec son devis PDF, qui arrive toujours normalement.
 */
let ctx: TestContext;
const SECRET = "whsec_" + Buffer.from("secret-du-webhook-blinde-0000").toString("base64");
const CLES = ["GROUPE", "RESEND_WEBHOOK_SECRET", "EMAIL_DOMAINE", "GROUPE_ADMINS", "CONTACT_RENVOI_VERS"] as const;
const avant = Object.fromEntries(CLES.map((k) => [k, process.env[k]]));
const OK = { spf: "pass", dkim: "pass", dmarc: "pass" };
let recuSimule: Partial<EmailRecu> = {};
const alertes: { kind: AlertKind; message: string }[] = [];
const alerter: Alerter = { enabled: true, alert: (kind, message) => void alertes.push({ kind, message }) };
const lecteur: LecteurEmailRecu = {
  lire(): Promise<EmailRecu | null> {
    return Promise.resolve({ from: "Négoce Dupont <ventes@dupont.example>", to: [], subject: "Re: votre demande", date: "2026-11-22T09:00:00.000Z", text: "Bonjour, voici notre devis.", html: null, attachments: [], tropLourdes: [], authentification: OK, ...recuSimule });
  },
};
function signe(corps: string) {
  const ts = Math.floor(Date.now() / 1000);
  const id = `msg_${Math.random().toString(36).slice(2)}`;
  const sig = createHmac("sha256", Buffer.from(SECRET.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${corps}`).digest("base64");
  return { "svix-id": id, "svix-timestamp": String(ts), "svix-signature": `v1,${sig}`, "content-type": "application/json" };
}
const webhook = (to: string, subject = "Re: votre demande", from = "ventes@dupont.example") => {
  const corps = JSON.stringify({ type: "email.received", data: { email_id: `em_${Math.random().toString(36).slice(2)}`, from, to: [to], subject } });
  return request(ctx.app.getHttpServer()).post("/v1/webhooks/resend").set(signe(corps)).send(corps);
};

beforeAll(async () => {
  process.env.GROUPE = "off";
  process.env.RESEND_WEBHOOK_SECRET = SECRET;
  process.env.EMAIL_DOMAINE = "mobiiz.fr";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  delete process.env.CONTACT_RENVOI_VERS;
  ctx = await createTestApp((b) => b.overrideProvider(EMAIL_RECU).useValue(lecteur).overrideProvider(ALERTER).useValue(alerter));
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
  alertes.length = 0;
});

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
  const recipientId = res.body.recipients[0].id as string;
  await agent.post(`/v1/price-request-recipients/${recipientId}/send`).expect(200);
  const etiquette = (await ctx.prisma.priceRequestRecipient.findUniqueOrThrow({ where: { id: recipientId } })).etiquette!;
  ctx.emails.clear();
  return { projectId: q.projetId as string, recipientId, etiquette };
}

describe("contact@mobiiz.fr : rien de suspect n'est renvoyé, rien n'est habillé en Mobiiz", () => {
  it("le spam d'arnaque (DMARC refusé) n'est pas renvoyé : il est dans la liste de l'admin, avec sa raison", async () => {
    recuSimule = { from: "Service Client <support@banque-arnaque.example>", subject: "Votre compte est suspendu", text: "Payez ici : https://banque-arnaque.example/pay", authentification: { spf: "fail", dkim: "fail", dmarc: "fail" } };
    const res = await webhook("contact@mobiiz.fr", "Votre compte est suspendu", "support@banque-arnaque.example");
    expect(res.body).toEqual({ traite: true, raison: "indesirable" });
    expect(ctx.emails.sent).toHaveLength(0);
    const journal = await ctx.prisma.emailEntrant.findMany();
    expect(journal).toHaveLength(1);
    expect(journal[0]).toMatchObject({ adresse: "contact@mobiiz.fr", suspect: true, dmarc: "fail" });
    expect(journal[0]!.raisons.join(" ")).toContain("DMARC refusé");
  });

  it("usurpation de mobiiz.fr (« De : contact@mobiiz.fr » sans DMARC) : jamais renvoyée", async () => {
    recuSimule = { from: "Mobiiz <facturation@mobiiz.fr>", subject: "Facture impayée", authentification: { spf: "gray", dkim: "gray", dmarc: "gray" } };
    expect((await webhook("contact@mobiiz.fr", "Facture impayée", "facturation@mobiiz.fr")).body).toEqual({ traite: true, raison: "indesirable" });
    expect(ctx.emails.sent).toHaveLength(0);
    expect((await ctx.prisma.emailEntrant.findFirstOrThrow()).raisons).toContain("Se fait passer pour mobiiz.fr sans le prouver");
  });

  it("un message propre est renvoyé en message externe : bandeau, expéditeur réel, objet [Externe], lien non cliquable, aucun logo, pièce piégée retenue", async () => {
    recuSimule = {
      from: "Client Martin <martin@client.example>",
      subject: "Question",
      text: "Bonjour, mon site : https://client.example/chantier",
      html: '<p>Bonjour <a href="https://piege.example">cliquez</a></p><img src="https://mobiiz.fr/logo.png">',
      attachments: [{ filename: "plan.pdf", contentType: "application/pdf", contentBase64: Buffer.from("%PDF-1.4").toString("base64") }],
      piecesRetenues: [],
    };
    expect((await webhook("contact@mobiiz.fr", "Question", "martin@client.example")).body).toEqual({ traite: true });
    const m = ctx.emails.sent.at(-1)!;
    expect(m.subject).toBe("[Externe] Question");
    expect(m.externe).toBe(true);
    expect(m.text.split("\n")[0]).toBe("Message externe, non vérifié par Mobiiz.");
    expect(m.text).toContain("De : Client Martin <martin@client.example>");
    expect(m.text).toContain("hxxps[:]//client[.]example/chantier");
    expect(m.text).not.toContain("https://client.example");
    // Jamais la page HTML de l'expéditeur.
    expect(m.html).toBeUndefined();
    // Tel qu'il part : ni logo, ni lien, ni pied Mobiiz.
    const parti = miseEnPage(m, "https://test.mobiiz.fr");
    expect(parti.html).not.toContain("logo");
    expect(parti.html).not.toContain("<a ");
    expect(parti.html).not.toContain("<img");
    expect(parti.text).not.toContain("BATI INVEST");
    expect(m.attachments?.map((a) => a.filename)).toEqual(["plan.pdf"]);
    expect((await ctx.prisma.emailEntrant.findFirstOrThrow()).suspect).toBe(false);
  });

  it("le HTML d'un message externe échappe tout : une balise reste du texte", () => {
    expect(htmlExterne('Message externe.\n<a href="x">clic</a>')).toContain("&lt;a href=&quot;x&quot;&gt;clic&lt;/a&gt;");
  });

  it("une pièce jointe dangereuse : le message entier est mis de côté, rien n'est renvoyé", async () => {
    recuSimule = { from: "x@fournisseur.example", subject: "Facture", attachments: [], piecesRetenues: ["Facture.pdf.exe"] };
    expect((await webhook("contact@mobiiz.fr", "Facture", "x@fournisseur.example")).body).toEqual({ traite: true, raison: "indesirable" });
    expect(ctx.emails.sent).toHaveLength(0);
    expect((await ctx.prisma.emailEntrant.findFirstOrThrow()).piecesBloquees).toEqual(["Facture.pdf.exe"]);
  });
});

describe("l'adresse Mobiiz d'un artisan", () => {
  it("la vraie réponse du négoce, authentifiée, avec son devis PDF : rattachée, devis reçu, artisan prévenu (en message externe)", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const { projectId, etiquette } = await demandeEnvoyee(agent);
    const pdf = Buffer.from(await makePdf(["devis"], [], "Total HT 1 200,00", "DEVIS Négoce Dupont"));
    recuSimule = { attachments: [{ filename: "devis-dupont.pdf", contentType: "application/pdf", contentBase64: pdf.toString("base64") }] };
    expect((await webhook(`toitures-martin+r${etiquette}@mobiiz.fr`)).body).toMatchObject({ traite: true, rattache: true });
    const req = (await agent.get(`/v1/projects/${projectId}/price-requests`)).body.items[0];
    expect(req.recipients[0].status).toBe("received");
    const avis = ctx.emails.sent.find((e) => e.to === "artisan@example.fr")!;
    expect(avis.subject).toBe("[Externe] Négoce Dupont t'a répondu par e-mail");
    expect(avis.externe).toBe(true);
    expect((await agent.get("/v1/boite")).body.items.some((i: { cle: string }) => i.cle.startsWith("negoce:"))).toBe(true);
  });

  it("faux négoce (DMARC refusé) qui vise une vraie demande : en Indésirables, jamais rattaché, aucun devis, aucune alerte", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const { projectId, etiquette } = await demandeEnvoyee(agent);
    const pdf = Buffer.from(await makePdf(["devis"], [], "Total HT 1,00", "FAUX DEVIS"));
    recuSimule = { from: "Négoce Dupont <ventes@dupont.example>", authentification: { spf: "fail", dkim: "fail", dmarc: "fail" }, attachments: [{ filename: "devis.pdf", contentType: "application/pdf", contentBase64: pdf.toString("base64") }] };
    expect((await webhook(`toitures-martin+r${etiquette}@mobiiz.fr`)).body).toMatchObject({ traite: true, indesirable: true, rattache: false });
    expect((await agent.get(`/v1/projects/${projectId}/price-requests`)).body.items[0].recipients[0].status).toBe("sent");
    expect((await agent.get("/v1/recus")).body.items).toHaveLength(0);
    expect((await agent.get("/v1/boite")).body.items).toHaveLength(0);
    expect(ctx.emails.sent).toHaveLength(0);
    expect(await ctx.prisma.alerteCourte.count()).toBe(0);
    const e = await ctx.prisma.emailRecuArtisan.findFirstOrThrow();
    expect(e).toMatchObject({ indesirable: true, indesirablePar: "mobiiz", recipientId: null });
  });

  it("pièce jointe piégée à côté d'un vrai PDF : message en Indésirables, la pièce piégée jamais gardée", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const { etiquette } = await demandeEnvoyee(agent);
    recuSimule = { attachments: [{ filename: "devis.pdf", contentType: "application/pdf", contentBase64: Buffer.from("%PDF-1.4").toString("base64") }, { filename: "devis.zip", contentType: "application/zip", contentBase64: Buffer.from("PK").toString("base64") }] };
    expect((await webhook(`toitures-martin+r${etiquette}@mobiiz.fr`)).body).toMatchObject({ indesirable: true });
    const e = await ctx.prisma.emailRecuArtisan.findFirstOrThrow({ include: { fichiers: true } });
    expect(e.piecesBloquees).toEqual(["devis.zip"]);
    expect(e.fichiers.map((f) => f.nom)).toEqual(["devis.pdf"]);
  });

  it("réponse à une demande qui n'existe pas (étiquette inventée) : jamais présentée comme réponse de négoce, message externe", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    await demandeEnvoyee(agent);
    recuSimule = { from: "Faux Négoce <contact@faux-negoce.example>", subject: "Votre commande", text: "Réglez sur https://faux-negoce.example/paiement" };
    expect((await webhook("toitures-martin+rzzzzzzzz@mobiiz.fr", "Votre commande", "contact@faux-negoce.example")).body).toMatchObject({ traite: true, rattache: false });
    const avis = ctx.emails.sent.find((e) => e.to === "artisan@example.fr")!;
    expect(avis.subject).toBe("[Externe] Votre commande");
    expect(avis.text).not.toContain("t'a répondu");
    expect(avis.text).toContain("hxxps[:]//faux-negoce[.]example/paiement");
    expect(await ctx.prisma.alerteCourte.count()).toBe(0);
    const recus = (await agent.get("/v1/recus")).body.items;
    expect(recus[0].demande).toBeNull();
  });

  it("volume anormal : au 30e message dans l'heure sur la même adresse, une alerte part à l'admin", async () => {
    await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    recuSimule = { authentification: { spf: "fail", dkim: "fail", dmarc: "fail" } };
    for (let i = 0; i < 30; i++) await webhook("toitures-martin@mobiiz.fr");
    expect(await ctx.prisma.emailEntrant.count({ where: { adresse: "toitures-martin@mobiiz.fr" } })).toBe(30);
    expect(alertes.some((a) => a.kind === "email_entrant" && a.message.includes("30 e-mails reçus en une heure"))).toBe(true);
  });

  it("la liste de l'admin : les messages bloqués, avec leur raison, réservée aux admins", async () => {
    const { agent: artisan } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    recuSimule = { authentification: { spf: "fail", dkim: "fail", dmarc: "fail" } };
    await webhook("toitures-martin@mobiiz.fr");
    expect((await artisan.get("/v1/admin/emails-mis-de-cote/bloques")).status).toBe(403);
  });
});
