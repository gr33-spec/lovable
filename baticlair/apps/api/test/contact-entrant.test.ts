import { createHmac } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ResendLecteurEmailRecu, type EmailRecu, type LecteurEmailRecu } from "../src/platform/email/contact-entrant.js";
import { EMAIL_RECU } from "../src/platform/tokens.js";
import { createTestApp, type TestContext } from "./support/test-app.js";

/**
 * LA BOÎTE DE CONTACT (Greg, 26 octobre 2026 : « MX sur mobiiz.fr directement, chez Resend […] confirme-moi quand
 * contact@mobiiz.fr arrive sur mon adresse admin ») : un e-mail reçu sur contact@ (ou l'ancienne bonjour@) part chez
 * l'admin, corps et pièces jointes compris, « Répondre » écrit à l'expéditeur ; jamais de boucle ; signature obligatoire ;
 * le groupé éteint n'y change rien.
 */
let ctx: TestContext;
const SECRET = "whsec_" + Buffer.from("secret-du-webhook-contact-000").toString("base64");
const CLES = ["GROUPE", "RESEND_WEBHOOK_SECRET", "EMAIL_DOMAINE", "GROUPE_ADMINS", "CONTACT_RENVOI_VERS"] as const;
const avant = Object.fromEntries(CLES.map((k) => [k, process.env[k]]));
const lus: string[] = [];
const lecteur: LecteurEmailRecu = {
  lire(id: string): Promise<EmailRecu | null> {
    lus.push(id);
    return Promise.resolve({
      from: "Jean Client <jean@example.org>",
      to: ["contact@mobiiz.fr"],
      subject: "Une question sur l'abonnement",
      date: "2026-10-26T09:00:00.000Z",
      text: "Bonjour, combien coûte l'abonnement annuel ?",
      html: "<p>Bonjour, combien coûte l'abonnement annuel ?</p>",
      attachments: [{ filename: "devis.pdf", contentType: "application/pdf", contentBase64: Buffer.from("%PDF-1.4").toString("base64") }],
      tropLourdes: [],
    });
  },
};

function signe(corps: string) {
  const ts = Math.floor(Date.now() / 1000);
  const id = `msg_${Math.random().toString(36).slice(2)}`;
  const sig = createHmac("sha256", Buffer.from(SECRET.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${corps}`).digest("base64");
  return { "svix-id": id, "svix-timestamp": String(ts), "svix-signature": `v1,${sig}`, "content-type": "application/json" };
}
const recu = (to: string, from = "Jean Client <jean@example.org>") => JSON.stringify({ type: "email.received", data: { email_id: "em_1", from, to: [to], subject: "Une question sur l'abonnement" } });

beforeAll(async () => {
  process.env.GROUPE = "off";
  process.env.RESEND_WEBHOOK_SECRET = SECRET;
  process.env.EMAIL_DOMAINE = "mobiiz.fr";
  process.env.GROUPE_ADMINS = "greg@example.fr,autre@example.fr";
  delete process.env.CONTACT_RENVOI_VERS;
  ctx = await createTestApp((b) => b.overrideProvider(EMAIL_RECU).useValue(lecteur));
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) if (v === undefined) delete process.env[k];
  else process.env[k] = v;
});
beforeEach(() => {
  ctx.emails.sent.length = 0;
  lus.length = 0;
});

describe("contact@mobiiz.fr arrive chez l'admin", () => {
  it("renvoyé à la première adresse admin, corps et pièce jointe compris, « Répondre » vers l'expéditeur", async () => {
    const corps = recu("Mobiiz <contact@mobiiz.fr>");
    const res = await request(ctx.app.getHttpServer()).post("/v1/webhooks/resend").set(signe(corps)).send(corps);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ traite: true });
    expect(lus).toEqual(["em_1"]);
    const m = ctx.emails.sent.at(-1)!;
    expect(m.to).toBe("greg@example.fr");
    expect(m.subject).toBe("[contact@mobiiz.fr] Une question sur l'abonnement");
    expect(m.text).toContain("De : Jean Client <jean@example.org>");
    expect(m.text).toContain("combien coûte l'abonnement annuel ?");
    expect(m.replyTo).toBe("jean@example.org");
    expect(m.attachments?.map((a) => a.filename)).toEqual(["devis.pdf"]);
  });

  it("l'ancienne adresse bonjour@ aussi ; une autre adresse du domaine, non", async () => {
    const bonjour = recu("bonjour@mobiiz.fr");
    expect((await request(ctx.app.getHttpServer()).post("/v1/webhooks/resend").set(signe(bonjour)).send(bonjour)).body).toEqual({ traite: true });
    expect(ctx.emails.sent.at(-1)!.subject).toContain("[bonjour@mobiiz.fr]");
    // Relecture du 30 octobre 2026 : une adresse de réponse de lot n'est jamais prise pour celle d'un artisan (ni mise de
    // côté) ; une autre adresse inconnue du domaine est mise de côté pour l'admin.
    const lot = recu("lot-12@mobiiz.fr");
    expect((await request(ctx.app.getHttpServer()).post("/v1/webhooks/resend").set(signe(lot)).send(lot)).body).toEqual({ traite: false, raison: "adresse_inconnue" });
    const autre = recu("personne-inconnue@mobiiz.fr");
    expect((await request(ctx.app.getHttpServer()).post("/v1/webhooks/resend").set(signe(autre)).send(autre)).body).toMatchObject({ traite: false, raison: "adresse_inconnue", misDeCote: true });
    expect(ctx.emails.sent).toHaveLength(1);
  });

  it("jamais de boucle, jamais sans signature", async () => {
    const boucle = recu("contact@mobiiz.fr", "greg@example.fr");
    expect((await request(ctx.app.getHttpServer()).post("/v1/webhooks/resend").set(signe(boucle)).send(boucle)).body).toEqual({ traite: false, raison: "boucle" });
    const corps = recu("contact@mobiiz.fr");
    expect((await request(ctx.app.getHttpServer()).post("/v1/webhooks/resend").set("content-type", "application/json").send(corps)).status).toBe(403);
    expect(ctx.emails.sent).toHaveLength(0);
  });
});

describe("la lecture chez Resend", () => {
  it("relit le corps et télécharge les pièces jointes ; une pièce trop lourde est nommée, pas jointe", async () => {
    const appels: string[] = [];
    const reponse = (corps: unknown, octets = "") => ({ ok: true, status: 200, json: () => Promise.resolve(corps), arrayBuffer: () => Promise.resolve(new TextEncoder().encode(octets).buffer) });
    const fetchFaux = (url: string) => {
      appels.push(url.replace(/\?.*/, ""));
      if (url.endsWith("/attachments")) return Promise.resolve(reponse({ data: [{ filename: "a.pdf", content_type: "application/pdf", size: 4, download_url: "https://cdn.example/a?sig=1" }, { filename: "video.mov", content_type: "video/quicktime", size: 50 * 1024 * 1024, download_url: "https://cdn.example/b" }] }));
      if (url.startsWith("https://cdn.example/a")) return Promise.resolve(reponse(null, "%PDF"));
      return Promise.resolve(reponse({ from: "x@example.org", to: ["contact@mobiiz.fr"], subject: "S", created_at: "2026-10-26T09:00:00Z", text: "T", html: null }));
    };
    const logger = { error: () => undefined } as unknown as ConstructorParameters<typeof ResendLecteurEmailRecu>[1];
    const lu = await new ResendLecteurEmailRecu("cle", logger, fetchFaux as unknown as ConstructorParameters<typeof ResendLecteurEmailRecu>[2]).lire("em_9");
    expect(appels).toEqual(["https://api.resend.com/emails/receiving/em_9", "https://api.resend.com/emails/receiving/em_9/attachments", "https://cdn.example/a"]);
    expect(lu?.attachments).toEqual([{ filename: "a.pdf", contentType: "application/pdf", contentBase64: Buffer.from("%PDF").toString("base64") }]);
    expect(lu?.tropLourdes).toEqual(["video.mov"]);
  });
});
