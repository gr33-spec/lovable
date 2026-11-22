import { createHmac } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { EmailRecu, LecteurEmailRecu } from "../src/platform/email/contact-entrant.js";
import type { Alerter, AlertKind } from "../src/platform/alerts/alerter.js";
import { ALERTER, EMAIL_RECU } from "../src/platform/tokens.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * LA MESSAGERIE, COMME GMAIL (Greg, 22 novembre 2026) : Reçus regroupés par chantier (« 1 réponse sur 2 », un négoce une
 * seule fois, « En attente »), « Répondre » qui part de l'adresse Mobiiz de l'artisan au négoce de la demande et dont la
 * réponse revient rangée dans le bon chantier, « Envoyés » (tout ce qui part au nom de l'artisan), « Indésirables »
 * (« Signaler » / « Ce n'est pas un indésirable »). Aucun appel réseau : le lecteur Resend est simulé.
 */
let ctx: TestContext;
const SECRET = "whsec_" + Buffer.from("secret-du-webhook-messagerie-00").toString("base64");
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
function signe(corps: string, id = `msg_${Math.random().toString(36).slice(2)}`, ts = Math.floor(Date.now() / 1000)) {
  const sig = createHmac("sha256", Buffer.from(SECRET.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${corps}`).digest("base64");
  return { "svix-id": id, "svix-timestamp": String(ts), "svix-signature": `v1,${sig}`, "content-type": "application/json" };
}
const corpsDe = (to: string, subject: string, from: string) => JSON.stringify({ type: "email.received", data: { email_id: `em_${Math.random().toString(36).slice(2)}`, from, to: [to], subject } });
const webhook = (to: string, subject = "Re: votre demande", from = "ventes@dupont.example") => {
  const corps = corpsDe(to, subject, from);
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

async function demandeEnvoyee(agent: Agent, negoce = { name: "Négoce Dupont", email: "ventes@dupont.example" }) {
  const q = (await agent.post("/v1/quantitatifs").send({ reference: "Dupont", adresse: "12 rue de Siam, 29200 Brest", lignes: [{ libelle: "Chatière de ventilation", quantite: "4", unite: "u" }] })).body;
  let current = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0];
    current = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await agent.post(`/v1/quantitatifs/${q.id}/validation`)).status).toBe(200);
  const supplier = (await agent.post("/v1/suppliers").send(negoce)).body;
  const res = await agent.post(`/v1/projects/${q.projetId}/price-requests`).send({ supplierIds: [supplier.id] });
  const recipientId = res.body.recipients[0].id as string;
  await agent.post(`/v1/price-request-recipients/${recipientId}/send`).expect(200);
  const etiquette = (await ctx.prisma.priceRequestRecipient.findUniqueOrThrow({ where: { id: recipientId } })).etiquette!;
  ctx.emails.clear();
  return { projectId: q.projetId as string, recipientId, etiquette };
}

describe("la messagerie", () => {
  it("Reçus : les réponses regroupées par chantier, un négoce une seule fois, « 1 sur 2 », l'autre « En attente »", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const q = (await agent.post("/v1/quantitatifs").send({ reference: "Toiture Dupont", adresse: "12 rue de Siam, 29200 Brest", lignes: [{ libelle: "Chatière de ventilation", quantite: "4", unite: "u" }] })).body;
    let current = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
    for (let i = 0; i < 10 && current.questions.length > 0; i++) current = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: current.questions[0].id, valeur: current.questions[0].boutons[0]?.valeur ?? "ok" }] })).body;
    expect((await agent.post(`/v1/quantitatifs/${q.id}/validation`)).status).toBe(200);
    const dupont = (await agent.post("/v1/suppliers").send({ name: "Négoce Dupont", email: "ventes@dupont.example" })).body;
    const autre = (await agent.post("/v1/suppliers").send({ name: "Bois et Matériaux", email: "devis@bois.example" })).body;
    const res = await agent.post(`/v1/projects/${q.projetId}/price-requests`).send({ supplierIds: [dupont.id, autre.id] });
    for (const r of res.body.recipients) await agent.post(`/v1/price-request-recipients/${r.id}/send`).expect(200);
    const etiquette = (await ctx.prisma.priceRequestRecipient.findFirstOrThrow({ where: { supplierId: dupont.id } })).etiquette!;
    await webhook(`toitures-martin+r${etiquette}@mobiiz.fr`);
    await webhook(`toitures-martin+r${etiquette}@mobiiz.fr`, "Re: votre demande (bis)");
    const m = (await agent.get("/v1/messagerie")).body;
    expect(m.chantiers).toHaveLength(1);
    const c = m.chantiers[0];
    expect(c).toMatchObject({ projectId: q.projetId, consultes: 2, repondus: 1, nonLu: true });
    expect(c.sujet).toMatch(/^Négoce · /);
    expect(c.negoces.map((n: { negoce: string; etat: string }) => [n.negoce, n.etat])).toEqual([["Négoce Dupont", "repondu"], ["Bois et Matériaux", "attente"]]);
    // Les réponses rangées sous leur chantier ne sont pas répétées dans « Autres messages ».
    expect(m.autres.filter((i: { sorte: string }) => i.sorte === "negoce")).toHaveLength(0);
    // Les demandes de prix sont dans « Envoyés », au nom de l'artisan.
    const env = (await agent.get("/v1/messagerie/envoyes")).body.items;
    expect(env.filter((e: { sorte: string }) => e.sorte === "demande")).toHaveLength(2);
    expect(env[0]).toMatchObject({ libelle: "Demande de prix", chantier: expect.stringContaining("Dupont") });
  });

  it("Répondre : part de l'adresse Mobiiz, au négoce de la demande, avec son étiquette ; noté dans Envoyés ; la réponse du négoce revient dans le même fil", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const { recipientId, etiquette } = await demandeEnvoyee(agent);
    const recu = (await webhook(`toitures-martin+r${etiquette}@mobiiz.fr`)).body;
    ctx.emails.clear();
    expect((await agent.post(`/v1/recus/${recu.id}/repondre`).send({ texte: "Merci, c'est possible livré jeudi ?" })).status).toBe(200);
    const parti = ctx.emails.sent.find((e) => e.to === "ventes@dupont.example")!;
    expect(parti).toBeTruthy();
    expect(parti.from).toContain("toitures-martin@mobiiz.fr");
    expect(parti.replyTo).toBe(`toitures-martin+r${etiquette}@mobiiz.fr`);
    expect(parti.subject).toMatch(/^Re: /);
    expect(parti.text).toContain("Merci, c'est possible livré jeudi ?");
    expect(parti.text).toContain("Négoce Dupont a écrit :");
    const env = (await agent.get("/v1/messagerie/envoyes")).body.items;
    expect(env[0]).toMatchObject({ sorte: "reponse", libelle: "Ta réponse" });
    // Le négoce répond à la réponse : rangée dans la même demande, le fil montre les trois messages dans l'ordre.
    await webhook(`toitures-martin+r${etiquette}@mobiiz.fr`, "Re: Re: votre demande");
    const fil = (await agent.get(`/v1/messagerie/fil/${recipientId}`)).body;
    expect(fil.items.map((i: { sens: string }) => i.sens)).toEqual(["envoye", "recu", "envoye", "recu"]);
  });

  it("Répondre est refusé sur un message rattaché à aucune demande (jamais à un expéditeur inconnu)", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    await demandeEnvoyee(agent);
    recuSimule = { from: "Inconnu <qui@inconnu.example>" };
    const recu = (await webhook("toitures-martin@mobiiz.fr", "Bonjour", "qui@inconnu.example")).body;
    const r = await agent.post(`/v1/recus/${recu.id}/repondre`).send({ texte: "Bonjour" });
    expect(r.status).toBe(400);
    expect(ctx.emails.sent.some((e) => e.to === "qui@inconnu.example")).toBe(false);
  });

  it("Indésirables : Mobiiz range un message suspect lui-même ; « Signaler » et « Ce n'est pas un indésirable » le déplacent, rien n'est supprimé", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    await demandeEnvoyee(agent);
    recuSimule = { from: "Banque <x@banque.example>", authentification: { spf: "pass", dkim: "pass", dmarc: "fail" } };
    const spam = (await webhook("toitures-martin@mobiiz.fr", "Votre compte", "x@banque.example")).body;
    let ind = (await agent.get("/v1/recus/indesirables")).body.items;
    expect(ind).toHaveLength(1);
    expect(ind[0].raison).toMatch(/DMARC/);
    recuSimule = { from: "Pub <promo@pub.example>" };
    const pub = (await webhook("toitures-martin@mobiiz.fr", "Promo", "promo@pub.example")).body;
    expect((await agent.post(`/v1/recus/${pub.id}/indesirable`).send({ indesirable: true })).status).toBe(200);
    ind = (await agent.get("/v1/recus/indesirables")).body.items;
    expect(ind.map((i: { raison: string }) => i.raison)).toContain("Signalé par toi");
    expect((await agent.get("/v1/messagerie")).body.autres.some((i: { cle: string }) => i.cle === `negoce:${pub.id}`)).toBe(false);
    expect((await agent.post(`/v1/recus/${spam.id}/indesirable`).send({ indesirable: false })).status).toBe(200);
    expect((await agent.get("/v1/messagerie")).body.autres.some((i: { cle: string }) => i.cle === `negoce:${spam.id}`)).toBe(true);
    expect(await ctx.prisma.emailRecuArtisan.count()).toBe(2);
  });

  it("une autre entreprise ne voit ni le fil, ni un envoi, ni ne répond à un message de la première", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const { recipientId, etiquette } = await demandeEnvoyee(agent);
    const recu = (await webhook(`toitures-martin+r${etiquette}@mobiiz.fr`)).body;
    await agent.post(`/v1/recus/${recu.id}/repondre`).send({ texte: "Merci" }).expect(200);
    const envoi = (await agent.get("/v1/messagerie/envoyes")).body.items[0].id;
    const b = (await signUpWithCompany(ctx.app, "b@example.fr", "Toitures Bernard")).agent;
    expect((await b.get(`/v1/messagerie/fil/${recipientId}`)).status).toBe(404);
    expect((await b.get(`/v1/messagerie/envoyes/${envoi}`)).status).toBe(404);
    expect((await b.post(`/v1/recus/${recu.id}/repondre`).send({ texte: "x" })).status).toBe(404);
    expect((await b.get("/v1/messagerie")).body.chantiers).toHaveLength(0);
  });
});
