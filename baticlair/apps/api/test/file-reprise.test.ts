import { createHmac } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { LectureDevis } from "@baticlair/domain";
import { LECTURE_READER, type LectureRequest } from "../src/modules/takeoff/application/lecture-reader.js";
import { FakeLectureReader } from "../src/modules/takeoff/infrastructure/fake-lecture-reader.js";
import type { Alerter, AlertKind } from "../src/platform/alerts/alerter.js";
import type { ReadAttempt } from "../src/platform/ai/document-reader.js";
import { DELAIS_MS, type FileReprise } from "../src/platform/reprise/file-reprise.js";
import { FILE_REPRISE } from "../src/platform/reprise/reprise.module.js";
import { ALERTER } from "../src/platform/tokens.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * LA FILE DE REPRISE ET LES WEBHOOKS SANS DOUBLON (revue du 26 octobre 2026, lot 1, points 3 et 4) : une panne passagère
 * de l'IA repart seule (5 min, puis 30 min), l'artisan le voit, et au 3e échec Greg est alerté ; une réponse illisible
 * ne se retente pas seule ; un même événement de webhook n'est traité qu'une fois.
 */
class LecteurEnPanne extends FakeLectureReader {
  pannes = 0;
  appels = 0;
  status: "provider_error" | "invalid_output" = "provider_error";
  override async lire(r: LectureRequest): Promise<ReadAttempt<LectureDevis> | null> {
    this.appels++;
    if (this.pannes > 0) {
      this.pannes--;
      return { provider: "fake", model: "fake", usage: { inputTokens: 0, outputTokens: 0 }, status: this.status, output: null, errorCode: this.status === "provider_error" ? "http_529" : "schema", durationMs: 1 };
    }
    return super.lire(r);
  }
}
const lecteur = new LecteurEnPanne();
const alertes: { kind: AlertKind; message: string }[] = [];
const alerter: Alerter = { enabled: true, alert: (kind, message) => alertes.push({ kind, message }) };
const SECRET = "whsec_" + Buffer.from("secret-webhook-reprise-0000").toString("base64");
const avant = { RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET, EMAIL_DOMAINE: process.env.EMAIL_DOMAINE, GROUPE_ADMINS: process.env.GROUPE_ADMINS };
let ctx: TestContext;
let file: FileReprise;
beforeAll(async () => {
  process.env.RESEND_WEBHOOK_SECRET = SECRET;
  process.env.EMAIL_DOMAINE = "mobiiz.fr";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  ctx = await createTestApp((b) => b.overrideProvider(LECTURE_READER).useValue(lecteur).overrideProvider(ALERTER).useValue(alerter));
  file = ctx.app.get(FILE_REPRISE);
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) if (v === undefined) delete process.env[k];
  else process.env[k] = v;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  alertes.length = 0;
  lecteur.appels = 0;
  lecteur.pannes = 0;
  lecteur.status = "provider_error";
});

async function devisDepose(agent: Agent) {
  const projet = (await agent.post("/v1/projects").send({ name: "Toiture" }).expect(201)).body.id as string;
  const doc = await agent.post(`/v1/projects/${projet}/documents`).field("purpose", "client_quote").attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
  return { projet, documentId: doc.body.id as string };
}
/** Avance l'heure des reprises dues, comme si le délai était passé (après leur enregistrement, fait en tâche de fond). */
async function echeance() {
  // Sous charge (suite complète), l'échec de la lecture s'enregistre en tâche de fond bien après 2 s : on attend jusqu'à 15 s
  // qu'une reprise soit en attente, et on le vérifie, au lieu d'avancer une heure qui ne touche rien.
  for (let i = 0; i < 750 && (await ctx.prisma.reprise.count({ where: { etat: "en_attente" } })) === 0; i++) await new Promise((r) => setTimeout(r, 20));
  const { count } = await ctx.prisma.reprise.updateMany({ where: { etat: "en_attente" }, data: { prochaineLe: new Date(Date.now() - 1000) } });
  expect(count).toBeGreaterThan(0);
}

describe("une panne passagère de l'IA repart seule", () => {
  it("1er échec : l'artisan voit « nouvel essai » ; le 2e essai réussit, la liste est là, sans alerte", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures A");
    const { projet, documentId } = await devisDepose(agent);
    lecteur.pannes = 1;
    expect((await agent.post(`/v1/documents/${documentId}/takeoff`)).status).toBeGreaterThanOrEqual(400);
    for (let i = 0; i < 750 && (await ctx.prisma.reprise.count()) === 0; i++) await new Promise((r) => setTimeout(r, 20));
    const enAttente = (await agent.get("/v1/reprises").expect(200)).body.reprises as { sorte: string; etat: string; prochaineLe: string }[];
    expect(enAttente).toHaveLength(1);
    expect(enAttente[0]).toMatchObject({ sorte: "lecture_ia", etat: "en_attente" });
    expect(Date.parse(enAttente[0]!.prochaineLe) - Date.now()).toBeGreaterThan(DELAIS_MS[0] - 10_000);
    // Rien n'est dû avant l'heure.
    expect(await file.traiter()).toEqual({ reussies: 0, enAttente: 0, abandonnees: 0 });
    await echeance();
    expect(await file.traiter()).toEqual({ reussies: 1, enAttente: 0, abandonnees: 0 });
    expect((await agent.get(`/v1/projects/${projet}/takeoff`)).body.takeoff).not.toBeNull();
    expect((await agent.get("/v1/reprises").expect(200)).body.reprises).toEqual([]);
    expect(alertes.filter((a) => a.kind === "reprise_echouee")).toEqual([]);
  });

  it("trois échecs : abandonnée, alerte à Greg, l'artisan le voit ; une réponse illisible ne repart pas seule", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures B");
    const { documentId } = await devisDepose(agent);
    lecteur.pannes = 3;
    await agent.post(`/v1/documents/${documentId}/takeoff`);
    // Attendre SA reprise (la ligne du test précédent reste en base : compter toutes les reprises ne suffit pas).
    for (let i = 0; i < 750 && (await ctx.prisma.reprise.count({ where: { cle: `lecture_ia:${documentId}` } })) === 0; i++) await new Promise((r) => setTimeout(r, 20));
    await echeance();
    expect(await file.traiter()).toMatchObject({ enAttente: 1 });
    await echeance();
    expect(await file.traiter()).toMatchObject({ abandonnees: 1 });
    expect(alertes.filter((a) => a.kind === "reprise_echouee")).toHaveLength(1);
    expect((await agent.get("/v1/reprises").expect(200)).body.reprises).toEqual([{ sorte: "lecture_ia", etat: "abandonnee", prochaineLe: null }]);

    const autre = await devisDepose(agent);
    lecteur.status = "invalid_output";
    lecteur.pannes = 1;
    await agent.post(`/v1/documents/${autre.documentId}/takeoff`);
    expect(await ctx.prisma.reprise.count({ where: { cle: `lecture_ia:${autre.documentId}` } })).toBe(0);
  });

  it("un autre artisan ne voit jamais les reprises d'un autre", async () => {
    const a = await signUpWithCompany(ctx.app, "c@example.fr", "Toitures C");
    const { documentId } = await devisDepose(a.agent);
    lecteur.pannes = 1;
    await a.agent.post(`/v1/documents/${documentId}/takeoff`);
    const b = await signUpWithCompany(ctx.app, "d@example.fr", "Toitures D");
    expect((await b.agent.get("/v1/reprises").expect(200)).body.reprises).toEqual([]);
  });
});

describe("un webhook n'est traité qu'une fois", () => {
  it("Resend renvoie le même événement (même svix-id) : un seul renvoi à l'admin", async () => {
    const corps = JSON.stringify({ type: "email.received", data: { email_id: "em_x", from: "x@example.org", to: ["contact@mobiiz.fr"], subject: "Bonjour" } });
    const ts = Math.floor(Date.now() / 1000);
    const sig = createHmac("sha256", Buffer.from(SECRET.replace(/^whsec_/, ""), "base64")).update(`msg_unique.${ts}.${corps}`).digest("base64");
    const envoyer = () => request(ctx.app.getHttpServer()).post("/v1/webhooks/resend").set({ "svix-id": "msg_unique", "svix-timestamp": String(ts), "svix-signature": `v1,${sig}`, "content-type": "application/json" }).send(corps);
    ctx.emails.sent.length = 0;
    expect((await envoyer()).body).toEqual({ traite: true });
    expect((await envoyer()).body).toEqual({ dejaTraite: true });
    expect(ctx.emails.sent.filter((m) => m.to === "greg@example.fr")).toHaveLength(1);
  });
});
