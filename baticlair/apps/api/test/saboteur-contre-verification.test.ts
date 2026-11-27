import { createHmac } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { etiquetteDansObjet } from "@baticlair/domain";
import { AnalysisMeter } from "../src/modules/ai-usage/application/analysis-meter.js";
import { objetPropre } from "../src/modules/adresse-mobiiz/application/reponses-recues.service.js";
import { routeOuverteAuxCles } from "../src/modules/identity/http/session.guard.js";
import type { EmailRecu, LecteurEmailRecu } from "../src/platform/email/contact-entrant.js";
import type { Alerter } from "../src/platform/alerts/alerter.js";
import { cheminJournalise } from "../src/platform/http/request-context.middleware.js";
import { lectureACompter } from "../src/platform/http/rate-limit.module.js";
import { ALERTER, EMAIL_RECU } from "../src/platform/tokens.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * CONTRE-VÉRIFICATION SABOTEUR (27 novembre 2026), EN LOCAL : on attaque les corrections de sécurité du jour.
 * Chaque `it` affirme le comportement SÛR : un test ROUGE = une attaque qui passe. Aucun appel réseau, aucune IA réelle,
 * e-mails capturés.
 */
let ctx: TestContext;
let port = 0;
const SECRET = "whsec_" + Buffer.from("secret-du-webhook-contre-verif").toString("base64");
const CLES = ["GROUPE", "RESEND_WEBHOOK_SECRET", "EMAIL_DOMAINE", "GROUPE_ADMINS", "CONTACT_RENVOI_VERS", "RATE_LIMIT", "LECTURES_IA_GRATUIT_TOTAL"] as const;
const avant = Object.fromEntries(CLES.map((k) => [k, process.env[k]]));
const OK = { spf: "pass", dkim: "pass", dmarc: "pass" };
let recuSimule: Partial<EmailRecu> = {};
const alerter: Alerter = { enabled: true, alert: () => undefined };
const lecteur: LecteurEmailRecu = {
  lire(): Promise<EmailRecu | null> {
    return Promise.resolve({ from: "Négoce Dupont <ventes@dupont.example>", to: [], subject: "Re: votre demande", date: new Date().toISOString(), text: "Bonjour, voici notre devis.", html: null, attachments: [], tropLourdes: [], authentification: OK, ...recuSimule });
  },
};
function signe(corps: string, id = `msg_${Math.random().toString(36).slice(2)}`, ts = Math.floor(Date.now() / 1000)) {
  const sig = createHmac("sha256", Buffer.from(SECRET.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${corps}`).digest("base64");
  return { "svix-id": id, "svix-timestamp": String(ts), "svix-signature": `v1,${sig}`, "content-type": "application/json" };
}
const corpsDe = (to: string, subject: string, from: string) => JSON.stringify({ type: "email.received", data: { email_id: `em_${Math.random().toString(36).slice(2)}`, from, to: [to], subject } });
const webhook = (c: TestContext, to: string, subject = "Re: votre demande", from = "ventes@dupont.example") => {
  const corps = corpsDe(to, subject, from);
  return request(c.app.getHttpServer()).post("/v1/webhooks/resend").set(signe(corps)).send(corps);
};

/** Une requête HTTP BRUTE : le chemin part tel quel (ni `..` résolu, ni encodage refait), comme un script pirate. */
function brut(methode: string, chemin: string, entetes: Record<string, string> = {}, corps?: string): Promise<{ status: number; body: string }> {
  return new Promise((ok, ko) => {
    const req = http.request({ host: "127.0.0.1", port, method: methode, path: chemin, headers: { ...(corps ? { "content-type": "application/json", "content-length": String(Buffer.byteLength(corps)) } : {}), ...entetes } }, (res) => {
      let b = "";
      res.on("data", (d: Buffer) => (b += d.toString()));
      res.on("end", () => ok({ status: res.statusCode ?? 0, body: b }));
    });
    req.on("error", ko);
    if (corps) req.write(corps);
    req.end();
  });
}

beforeAll(async () => {
  process.env.GROUPE = "off";
  process.env.RESEND_WEBHOOK_SECRET = SECRET;
  process.env.EMAIL_DOMAINE = "mobiiz.fr";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  delete process.env.CONTACT_RENVOI_VERS;
  delete process.env.LECTURES_IA_GRATUIT_TOTAL; // 3 offertes, comme en production.
  ctx = await createTestApp((b) => b.overrideProvider(EMAIL_RECU).useValue(lecteur).overrideProvider(ALERTER).useValue(alerter));
  const server = ctx.app.getHttpServer() as http.Server;
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  port = (server.address() as AddressInfo).port;
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

async function quantitatif(agent: Agent, reference = "Dupont") {
  const q = (await agent.post("/v1/quantitatifs").send({ reference, adresse: "12 rue de Siam, 29200 Brest", lignes: [{ libelle: "Chatière de ventilation", quantite: "4", unite: "u" }] })).body;
  let current = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0];
    current = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await agent.post(`/v1/quantitatifs/${q.id}/validation`)).status).toBe(200);
  return { projetId: q.projetId as string, quantitatifId: q.id as string };
}

async function demande(c: TestContext, agent: Agent, o: { supplierId?: string; negoce?: { name: string; email: string }; reference?: string } = {}) {
  const { projetId: projectId } = await quantitatif(agent, o.reference);
  const supplierId = o.supplierId ?? ((await agent.post("/v1/suppliers").send(o.negoce ?? { name: "Négoce Dupont", email: "ventes@dupont.example" })).body.id as string);
  const res = await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [supplierId] });
  const recipientId = res.body.recipients[0].id as string;
  await agent.post(`/v1/price-request-recipients/${recipientId}/send`).expect(200);
  const r = await c.prisma.priceRequestRecipient.findUniqueOrThrow({ where: { id: recipientId } });
  c.emails.clear();
  return { projectId, recipientId, supplierId, etiquette: r.etiquette!, priceRequestId: r.priceRequestId };
}
const adresseDe = async (agent: Agent) => (await agent.get("/v1/company/adresse-mobiiz")).body.adresse as string;

async function messageDuNegoce(c: TestContext = ctx) {
  const { agent, companyId } = await signUpWithCompany(c.app, "artisan@example.fr", "Toitures Martin");
  const d = await demande(c, agent);
  const adresse = await adresseDe(agent);
  const recu = (await webhook(c, `${adresse}+r${d.etiquette}@mobiiz.fr`)).body;
  expect((await c.prisma.emailRecuArtisan.findUniqueOrThrow({ where: { id: recu.id } })).recipientId).toBe(d.recipientId);
  c.emails.clear();
  return { agent, companyId, adresse, recuId: recu.id as string, ...d };
}

// ───────────────────────────────────────────────────────────────────────────── 1. Clé partenaire
describe("1. clé API partenaire : contournements du filtre des routes", () => {
  async function cle() {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const k = (await a.agent.post("/v1/partner-keys").send({ nom: "Rappidos", quotaMensuel: 50 })).body.cle as string;
    const q = await quantitatif(a.agent);
    return { ...a, cle: k, ...q };
  }
  const fuite = (b: string) => /Toitures Martin|a@example\.fr/.test(b);

  it("chemins trafiqués (.., %2F, //, majuscules, ;, #, query, slash final) vers le compte : jamais de 2xx ni de données", async () => {
    const { cle: k } = await cle();
    const chemins = [
      "/v1/quantitatifs/../me/export",
      "/v1/quantitatifs/../../v1/me/export",
      "/v1/quantitatifs/..%2F..%2Fme%2Fexport",
      "/v1/quantitatifs/%2e%2e/%2e%2e/me/export",
      "/v1/quantitatifs%2F..%2Fme%2Fexport",
      "//v1/me/export",
      "/v1//me/export",
      "/V1/ME/EXPORT",
      "/v1/Me/Export",
      "/v1/me/export/",
      "/v1/me/export?x=/v1/quantitatifs",
      "/v1/me/export?/v1/quantitatifs",
      "/v1/me/export#/v1/quantitatifs",
      "/v1/me/export;/v1/quantitatifs",
      "/v1/company/profile/../../quantitatifs",
      "/v1/quantitatifs/x/../../company/profile",
      "/v1/company/profile%3F/v1/quantitatifs",
      "/v1/quantitatifs/../company/profile",
    ];
    for (const c of chemins) {
      const r = await brut("GET", c, { "x-api-key": k });
      expect({ c, ok: r.status >= 200 && r.status < 300, fuite: fuite(r.body) }).toEqual({ c, ok: false, fuite: false });
    }
  });

  it("HEAD et OPTIONS sur des routes interdites : refusés, aucune donnée", async () => {
    const { cle: k } = await cle();
    for (const m of ["HEAD", "OPTIONS"]) {
      for (const c of ["/v1/me/export", "/v1/company/profile", "/v1/me"]) {
        const r = await brut(m, c, { "x-api-key": k });
        expect({ m, c, ok: r.status >= 200 && r.status < 300 && r.status !== 204, fuite: fuite(r.body) }).toEqual({ m, c, ok: false, fuite: false });
      }
    }
  });

  it("DELETE /v1/me déguisé (majuscules, slash final, ..) : refusé, le compte existe toujours", async () => {
    const { cle: k, companyId } = await cle();
    const corps = JSON.stringify({ confirm: "SUPPRIMER" });
    for (const c of ["/v1/me/", "/V1/ME", "/v1/quantitatifs/../me", "//v1/me", "/v1/me?/v1/quantitatifs"]) {
      const r = await brut("DELETE", c, { "x-api-key": k }, corps);
      expect({ c, ok: r.status < 300 }).toEqual({ c, ok: false });
    }
    expect(await ctx.prisma.company.findUnique({ where: { id: companyId } })).not.toBeNull();
  });

  it("routes d'un chantier qui ENVOIENT chez un négoce ou rouvrent : refusées à la clé", async () => {
    const { cle: k, projetId } = await cle();
    const ess: [string, string][] = [
      ["POST", `/v1/projects/${projetId}/price-requests`],
      ["POST", `/v1/projects/${projetId}/price-requests/`],
      ["POST", `/v1/projects/${projetId}/liste/../price-requests`],
      ["POST", `/v1/projects/${projetId}/demande-perso`],
      ["GET", `/v1/projects/${projetId}`],
      ["GET", `/v1/projects/${projetId}/takeoff`],
      ["DELETE", `/v1/projects/${projetId}`],
      ["POST", `/v1/projects/${projetId}/infos/../../price-requests`],
    ];
    for (const [m, c] of ess) {
      const r = await brut(m, c, { "x-api-key": k }, JSON.stringify({ supplierIds: [] }));
      expect({ m, c, refuse: r.status === 403 || r.status === 404 }).toEqual({ m, c, refuse: true });
    }
    expect(await ctx.prisma.priceRequest.count()).toBe(0);
  });

  it("x-company-id d'une autre entreprise dont l'auteur est aussi membre : la clé reste sur SON entreprise", async () => {
    const { cle: k, userId } = await (async () => {
      const c = await cle();
      const u = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "a@example.fr" } });
      return { ...c, userId: u.id };
    })();
    const b = await ctx.prisma.company.create({ data: { name: "Autre Société" } });
    await ctx.prisma.membership.create({ data: { userId, companyId: b.id, role: "owner" } });
    const pB = await ctx.prisma.project.create({ data: { companyId: b.id, name: "Chantier secret B" } });
    const r = await brut("GET", `/v1/quantitatifs?projetId=${pB.id}`, { "x-api-key": k, "x-company-id": b.id });
    expect(r.body).not.toContain("Chantier secret B");
    const w = await brut("PUT", `/v1/projects/${pB.id}/infos`, { "x-api-key": k, "x-company-id": b.id }, JSON.stringify({ texte: "piraté" }));
    expect(w.status).toBeGreaterThanOrEqual(400);
  });

  it("chantier d'une AUTRE entreprise par la clé (IDOR) : 404, rien n'est écrit", async () => {
    const { cle: k } = await cle();
    const autre = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures Bernard");
    const qB = await quantitatif(autre.agent, "Bernard");
    for (const [m, c] of [["PUT", `/v1/projects/${qB.projetId}/infos`], ["GET", `/v1/projects/${qB.projetId}/demande-de-devis.pdf`], ["GET", `/v1/quantitatifs/${qB.quantitatifId}`], ["POST", `/v1/quantitatifs/${qB.quantitatifId}/validation`]] as const) {
      const r = await brut(m, c, { "x-api-key": k }, JSON.stringify({ texte: "piraté" }));
      expect({ m, c, ok: r.status < 300 }).toEqual({ m, c, ok: false });
    }
  });

  it("filtre pur : rien hors des quantitatifs, même déguisé", () => {
    const faux: [string, string][] = [
      ["GET", "/v1/quantitatifs/x/y/z"],
      ["GET", "/v1/quantitatifsX"],
      ["GET", "/v1/quantitatifs.json"],
      ["POST", "/v1/quantitatifs/x/annuler"],
      ["DELETE", "/v1/quantitatifs/x"],
      ["HEAD", "/v1/quantitatifs"],
      ["GET", "/v1/projects/x/infos"],
      ["PUT", "/v1/projects/x/infos/croquis"],
      ["GET", "/v1/projects/x/demande-de-devis.zones"],
      ["GET", "http://evil/v1/me/export"],
      ["GET", "/v1/me/export\n/v1/quantitatifs"],
    ];
    for (const [m, u] of faux) expect({ m, u, ouvert: routeOuverteAuxCles(m, u) }).toEqual({ m, u, ouvert: false });
  });
});

// ───────────────────────────────────────────────────────────────────────────── 2. « Répondre »
describe("2. « Répondre » : nouvelles attaques", () => {
  it("objet : un repère imbriqué « [réf. [réf. xxxxxxxx]yyyyyyyy] » ne laisse AUCUN repère après nettoyage", () => {
    const sale = "Re: Demande [réf. [réf. aaaaaaaa]bcdefghj]";
    const propre = objetPropre(sale);
    expect({ propre, repere: etiquetteDansObjet(propre) }).toEqual({ propre, repere: null });
  });

  it("objet : variantes du repère (REF, ref, sans point, espaces multiples, tabulation) retirées", () => {
    for (const v of ["[REF. abcdefgh]", "[ref abcdefgh]", "[réf.abcdefgh]", "[RÉF.   abcdefgh]", "[réf.\tabcdefgh]", "[réf.\u00a0abcdefgh]"]) {
      const p = objetPropre(`Re: Devis ${v}`);
      expect({ v, repere: etiquetteDansObjet(p) }).toEqual({ v, repere: null });
    }
  });

  it("objet : aucun séparateur de ligne Unicode (U+0085, U+2028, U+2029) ni caractère de contrôle C1 ne survit", () => {
    for (const c of ["\u0085", "\u2028", "\u2029", "\u008d", "\u009b"]) {
      const p = objetPropre(`Re: votre demande${c}Bcc: pirate@x.example`);
      expect({ code: c.charCodeAt(0).toString(16), reste: /[\u0080-\u009f\u2028\u2029\r\n]/.test(p) }).toEqual({ code: c.charCodeAt(0).toString(16), reste: false });
    }
  });

  it("de bout en bout : le négoce glisse un repère imbriqué d'un AUTRE chantier ; sa réponse suivante ne doit pas y être rangée", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const d1 = await demande(ctx, agent, { reference: "Chantier Un" });
    const d2 = await demande(ctx, agent, { supplierId: d1.supplierId, reference: "Chantier Deux" });
    const adresse = await adresseDe(agent);
    recuSimule = { subject: `Re: Demande [réf. [réf. aaaaaaaa]${d2.etiquette}]` };
    const recu = (await webhook(ctx, `${adresse}+r${d1.etiquette}@mobiiz.fr`, recuSimule.subject!)).body;
    expect((await ctx.prisma.emailRecuArtisan.findUniqueOrThrow({ where: { id: recu.id } })).recipientId).toBe(d1.recipientId);
    expect((await agent.post(`/v1/recus/${recu.id}/repondre`).send({ texte: "Merci" })).status).toBe(200);
    const parti = ctx.emails.sent.find((x) => x.to === "ventes@dupont.example")!;
    recuSimule = { subject: `Re: ${parti.subject}` };
    const retour = (await webhook(ctx, `${adresse}@mobiiz.fr`, recuSimule.subject!)).body;
    const e = await ctx.prisma.emailRecuArtisan.findUniqueOrThrow({ where: { id: retour.id } });
    expect({ objet: parti.subject, range: e.recipientId === d1.recipientId ? "d1" : e.recipientId === d2.recipientId ? "d2" : e.recipientId }).toEqual({ objet: parti.subject, range: "d1" });
  });

  it("même domaine que le négoce, autre personne : la réponse ne part JAMAIS à cette personne, seulement à l'adresse de la demande", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const d = await demande(ctx, agent);
    const adresse = await adresseDe(agent);
    recuSimule = { from: "Jean Collègue <jean@dupont.example>" };
    const recu = (await webhook(ctx, `${adresse}+r${d.etiquette}@mobiiz.fr`, "Re: votre demande", "jean@dupont.example")).body;
    await agent.post(`/v1/recus/${recu.id}/repondre`).send({ texte: "Merci" });
    expect(ctx.emails.sent.filter((e) => e.to !== "ventes@dupont.example" && e.to !== "artisan@example.fr").map((e) => e.to)).toEqual([]);
  });

  it("adresse du négoce en majuscules, réponse en minuscules : aucun envoi ailleurs qu'à l'adresse de la demande", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const d = await demande(ctx, agent, { negoce: { name: "Négoce Dupont", email: "Ventes@Dupont.Example" } });
    const adresse = await adresseDe(agent);
    const recu = (await webhook(ctx, `${adresse}+r${d.etiquette}@mobiiz.fr`)).body;
    await agent.post(`/v1/recus/${recu.id}/repondre`).send({ texte: "Merci" });
    expect(ctx.emails.sent.filter((e) => e.to.toLowerCase() !== "ventes@dupont.example" && e.to !== "artisan@example.fr").map((e) => e.to)).toEqual([]);
  });

  it("instantané effacé + e-mail du carnet changé après l'envoi : rien ne part à la nouvelle adresse", async () => {
    const { agent, recipientId, supplierId, recuId } = await messageDuNegoce();
    await ctx.prisma.priceRequestRecipient.update({ where: { id: recipientId }, data: { instantane: { email: 42 } } });
    await agent.patch(`/v1/suppliers/${supplierId}`).send({ email: "cible@victime.example" });
    await agent.post(`/v1/recus/${recuId}/repondre`).send({ texte: "Promo !" });
    expect(ctx.emails.sent.filter((e) => e.to.includes("victime.example"))).toEqual([]);
  });

  it("demande RENVOYÉE (second envoi) : la réponse part toujours au seul négoce de la demande", async () => {
    const { agent, recipientId, recuId } = await messageDuNegoce();
    await agent.post(`/v1/price-request-recipients/${recipientId}/send`);
    ctx.emails.clear();
    await agent.post(`/v1/recus/${recuId}/repondre`).send({ texte: "Merci" });
    expect(ctx.emails.sent.filter((e) => e.to !== "ventes@dupont.example" && e.to !== "artisan@example.fr")).toEqual([]);
  });

  it("COURSE sur le plafond par entreprise : 45 réponses lancées ensemble (limite IP coupée) → au plus 30 partent", async () => {
    const { agent, recuId } = await messageDuNegoce();
    const rs = await Promise.all(Array.from({ length: 60 }, (_, i) => agent.post(`/v1/recus/${recuId}/repondre`).send({ texte: `r${i}` })));
    const partis = ctx.emails.sent.filter((e) => e.to === "ventes@dupont.example").length;
    const ok = rs.filter((r) => r.status === 200).length;
    console.log(`course plafond : ${ok} acceptées, ${partis} parties, statuts ${[...new Set(rs.map((r) => r.status))].join(",")}`);
    // Sûr : jamais plus de 30 ; et au moins une part (sinon le test ne prouverait rien).
    expect({ auPlusTrente: partis <= 30 && ok <= 30, auMoinsUne: partis >= 1, statuts: [...new Set(rs.map((r) => r.status))].sort() }).toMatchObject({ auPlusTrente: true, auMoinsUne: true });
    expect({ ok, partis }).toEqual({ ok: partis, partis });
  });
});

// ───────────────────────────────────────────────────────────────────────────── 3. Analyses offertes
describe("3. analyses offertes : nouvelles attaques", () => {
  async function docs(companyId: string, n: number) {
    const projet = await ctx.prisma.project.create({ data: { companyId, name: "Chantier test" } });
    const ids: string[] = [];
    for (let i = 0; i < n; i++) ids.push((await ctx.prisma.document.create({ data: { companyId, projectId: projet.id, purpose: "client_quote", originalName: `devis-${i}.pdf`, mimeType: "application/pdf", sizeBytes: 100, sha256: `s${companyId}${i}` } })).id);
    return { projectId: projet.id, ids };
  }
  async function gratuit(email = "gratuit@example.fr", nom = "Toitures Martin") {
    const r = await signUpWithCompany(ctx.app, email, nom);
    const userId = (await ctx.prisma.user.update({ where: { email }, data: { emailVerified: true } })).id;
    return { ...r, userId };
  }

  it("dix relances SIMULTANÉES d'un même document en échec : une seule lecture part (sinon dix appels IA pour une analyse comptée)", async () => {
    const { companyId, userId } = await gratuit();
    const { projectId, ids } = await docs(companyId, 1);
    const meter = ctx.app.get(AnalysisMeter);
    const a = await meter.begin({ companyId, userId, projectId, documentId: ids[0]!, kind: "client_quote" });
    if (a.status !== "go") throw new Error("go attendu");
    await meter.fail(a.analysis.id);
    const rs = await Promise.allSettled(Array.from({ length: 10 }, () => meter.begin({ companyId, userId, projectId, documentId: ids[0]!, kind: "client_quote" })));
    const go = rs.filter((r) => r.status === "fulfilled" && r.value.status === "go").length;
    expect(go).toBe(1);
  });

  it("dix lectures simultanées sur DIX documents dont deux déjà pris : une seule passe (quota 3)", async () => {
    const { companyId, userId } = await gratuit();
    const { projectId, ids } = await docs(companyId, 12);
    const meter = ctx.app.get(AnalysisMeter);
    for (const id of ids.slice(0, 2)) {
      const b = await meter.begin({ companyId, userId, projectId, documentId: id, kind: "client_quote" });
      if (b.status === "go") await meter.complete(b.analysis.id);
    }
    const rs = await Promise.allSettled(ids.slice(2).map((documentId) => meter.begin({ companyId, userId, projectId, documentId, kind: "client_quote" })));
    expect(rs.filter((r) => r.status === "fulfilled").length).toBe(1);
  });

  it("gros devis (poids 2) lancés ensemble avec une seule place : aucun ne passe", async () => {
    const { companyId, userId } = await gratuit();
    const { projectId, ids } = await docs(companyId, 6);
    const meter = ctx.app.get(AnalysisMeter);
    for (const id of ids.slice(0, 2)) {
      const b = await meter.begin({ companyId, userId, projectId, documentId: id, kind: "client_quote" });
      if (b.status === "go") await meter.complete(b.analysis.id);
    }
    const rs = await Promise.allSettled(ids.slice(2).map((documentId) => meter.begin({ companyId, userId, projectId, documentId, kind: "client_quote", poids: 2 })));
    expect(rs.filter((r) => r.status === "fulfilled").length).toBe(0);
  });

  it("document d'une AUTRE entreprise (lecture et quantitatif) : 404, aucune analyse créée", async () => {
    const a = await gratuit("a@example.fr", "Toitures Martin");
    const b = await gratuit("b@example.fr", "Toitures Bernard");
    const { ids } = await docs(a.companyId, 1);
    expect((await b.agent.post(`/v1/documents/${ids[0]}/takeoff`)).status).toBe(404);
    expect((await b.agent.post("/v1/quantitatifs").send({ documentId: ids[0] })).status).toBe(404);
    expect(await ctx.prisma.aiAnalysis.count()).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────── 4. Limites de débit des lectures
describe("4. limites de débit des lectures : contournements", () => {
  let rl: TestContext;
  beforeAll(async () => {
    process.env.RATE_LIMIT = "on";
    rl = await createTestApp((b) => b.overrideProvider(EMAIL_RECU).useValue(lecteur).overrideProvider(ALERTER).useValue(alerter));
  });
  afterAll(async () => {
    await rl.app.close();
    process.env.RATE_LIMIT = "off";
  });

  it("HEAD au lieu de GET sur l'export PDF (10 par heure) : la limite tient aussi (le PDF est fabriqué pour un HEAD)", async () => {
    await resetDatabase(rl.prisma);
    const { agent } = await signUpWithCompany(rl.app, "a@example.fr", "Toitures Martin");
    const statuts: number[] = [];
    let pdf = false;
    for (let i = 0; i < 12; i++) {
      const r = await agent.head("/v1/me/export.pdf");
      statuts.push(r.status);
      if (String(r.headers["content-type"] ?? "").includes("pdf")) pdf = true;
    }
    expect({ pdfFabrique: pdf, refuse: statuts.includes(429) }).toEqual({ pdfFabrique: pdf, refuse: true });
  });

  it("PDF de la liste avec un slash final : la route répond, elle doit donc être comptée", async () => {
    await resetDatabase(rl.prisma);
    const { agent } = await signUpWithCompany(rl.app, "a@example.fr", "Toitures Martin");
    const { projetId } = await quantitatif(agent);
    const chemin = `/v1/projects/${projetId}/demande-de-devis.pdf/`;
    const r = await agent.get(chemin);
    expect({ servi: r.status, compte: lectureACompter(chemin) }).toEqual({ servi: r.status, compte: r.status === 200 ? true : lectureACompter(chemin) });
  });

  it("double slash en tête : si Express sert la route, elle doit être comptée", async () => {
    await resetDatabase(rl.prisma);
    const { agent } = await signUpWithCompany(rl.app, "a@example.fr", "Toitures Martin");
    const { projetId } = await quantitatif(agent);
    const chemin = `//v1/projects/${projetId}/demande-de-devis.pdf`;
    const r = await agent.get(chemin);
    expect({ servi: r.status, compte: lectureACompter(chemin) }).toEqual({ servi: r.status, compte: r.status === 200 ? true : lectureACompter(chemin) });
  });

  it("routes PDF ou fichiers oubliées : la facture en PDF (`/pdf` sans point) est comptée", () => {
    for (const u of ["/v1/abonnement/factures/in_123/pdf"]) expect({ u, compte: lectureACompter(u) }).toEqual({ u, compte: true });
  });

  it("variantes qui restent comptées : majuscules, query, .PDF, jeton public", () => {
    for (const u of ["/V1/PROJECTS/x/DEMANDE-DE-DEVIS.PDF", "/v1/projects/x/demande-de-devis.pdf?a=1", "/v1/projects/x/commande.pdf", "/v1/public/chiffrer/abc?x=1", "/V1/REPONSE/abc", "/v1/negoce/export"]) expect({ u, compte: lectureACompter(u) }).toEqual({ u, compte: true });
  });
});

// ───────────────────────────────────────────────────────────────────────────── 5. Journaux
describe("5. jetons dans les journaux : autres formats", () => {
  it("jeton signé (base64url.signature), encodé en %, suivi de .PDF, ou d'un autre suffixe : jamais écrit", () => {
    const jetonSigne = `${Buffer.from("0190f5e2-1b2c-7d3e-8f4a-5b6c7d8e9f01").toString("base64url")}.${createHmac("sha256", "s").update("x").digest("base64url")}`;
    const b64 = "Zx9_kL2mQp7rTt4vWw1yAa3bCc5dEe6f";
    const cas = [
      `/v1/emails/stop/${jetonSigne}`,
      `/v1/reponse/${encodeURIComponent(b64).replace(/./g, (c) => "%" + c.charCodeAt(0).toString(16))}`,
      `/v1/reponse/${b64}/contrat.PDF`,
      `/v1/reponse/${b64}.json`,
      `/v1/public/chiffrer/${b64};x`,
    ];
    for (const p of cas) expect({ p, fuite: cheminJournalise(p).includes(b64) || cheminJournalise(p).includes(jetonSigne) }).toEqual({ p, fuite: false });
  });

  it("jeton de 24 caractères façon better-auth (lettres et chiffres mêlés) : masqué", () => {
    for (const j of ["aB3dE5gH7jK9mN1pQ3sT5vW7", "Xk2Lm9Pq4Rs7Tu1Vw3Yz5Ab8"]) expect(cheminJournalise(`/api/auth/reset-password/${j}`)).not.toContain(j);
  });
});
