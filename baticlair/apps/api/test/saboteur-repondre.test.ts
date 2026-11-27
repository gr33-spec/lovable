import { createHmac } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { EmailRecu, LecteurEmailRecu } from "../src/platform/email/contact-entrant.js";
import { miseEnPage } from "../src/platform/email/mise-en-page.js";
import type { Alerter } from "../src/platform/alerts/alerter.js";
import { ALERTER, EMAIL_RECU } from "../src/platform/tokens.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * AUDIT SABOTEUR DU BOUTON « RÉPONDRE » (`POST /v1/recus/:id/repondre`, Greg, 22-23 novembre 2026), EN LOCAL.
 * Chaque `it` affirme le comportement SÛR attendu : un test ROUGE = une attaque qui passe. Aucun appel réseau : le lecteur
 * Resend est simulé, les e-mails partent dans la boîte de capture, aucune IA réelle.
 */
let ctx: TestContext;
const SECRET = "whsec_" + Buffer.from("secret-du-webhook-saboteur-rep").toString("base64");
const CLES = ["GROUPE", "RESEND_WEBHOOK_SECRET", "EMAIL_DOMAINE", "GROUPE_ADMINS", "CONTACT_RENVOI_VERS", "RATE_LIMIT"] as const;
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
});

async function quantitatif(c: TestContext, agent: Agent, reference = "Dupont") {
  const q = (await agent.post("/v1/quantitatifs").send({ reference, adresse: "12 rue de Siam, 29200 Brest", lignes: [{ libelle: "Chatière de ventilation", quantite: "4", unite: "u" }] })).body;
  let current = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0];
    current = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await agent.post(`/v1/quantitatifs/${q.id}/validation`)).status).toBe(200);
  void c;
  return q.projetId as string;
}

async function demande(c: TestContext, agent: Agent, o: { supplierId?: string; negoce?: { name: string; email: string }; envoyer?: boolean; reference?: string } = {}) {
  const projectId = await quantitatif(c, agent, o.reference);
  const supplierId = o.supplierId ?? ((await agent.post("/v1/suppliers").send(o.negoce ?? { name: "Négoce Dupont", email: "ventes@dupont.example" })).body.id as string);
  const res = await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [supplierId] });
  const recipientId = res.body.recipients[0].id as string;
  if (o.envoyer !== false) await agent.post(`/v1/price-request-recipients/${recipientId}/send`).expect(200);
  const r = await c.prisma.priceRequestRecipient.findUniqueOrThrow({ where: { id: recipientId } });
  c.emails.clear();
  return { projectId, recipientId, supplierId, etiquette: r.etiquette, priceRequestId: r.priceRequestId };
}

const adresseDe = async (agent: Agent) => (await agent.get("/v1/company/adresse-mobiiz")).body.adresse as string;

/** Un artisan, sa demande envoyée à Négoce Dupont, et la vraie réponse (authentifiée) rangée dans la demande. */
async function messageDuNegoce(c: TestContext = ctx, nom = "Toitures Martin", email = "artisan@example.fr") {
  const { agent, companyId } = await signUpWithCompany(c.app, email, nom);
  const d = await demande(c, agent);
  const adresse = await adresseDe(agent);
  const recu = (await webhook(c, `${adresse}+r${d.etiquette}@mobiiz.fr`)).body;
  expect((await c.prisma.emailRecuArtisan.findUniqueOrThrow({ where: { id: recu.id } })).recipientId).toBe(d.recipientId);
  c.emails.clear();
  return { agent, companyId, adresse, recuId: recu.id as string, ...d };
}
const repondre = (agent: Agent, id: string, body: object = { texte: "Merci, livraison jeudi possible ?" }) => agent.post(`/v1/recus/${id}/repondre`).send(body);

describe("A. IDOR et droits", () => {
  it("une AUTRE entreprise ne peut pas répondre au message reçu de la première (404, rien ne part)", async () => {
    const { recuId } = await messageDuNegoce();
    const b = (await signUpWithCompany(ctx.app, "b@example.fr", "Toitures Bernard")).agent;
    ctx.emails.sent.length = 0; // l'e-mail de vérification du compte B
    expect((await repondre(b, recuId)).status).toBe(404);
    // Même en forçant l'entreprise par l'en-tête de l'autre.
    const a = await ctx.prisma.emailRecuArtisan.findUniqueOrThrow({ where: { id: recuId } });
    expect((await b.post(`/v1/recus/${recuId}/repondre`).set("x-company-id", a.companyId).send({ texte: "x" })).status).toBeGreaterThanOrEqual(403);
    expect(ctx.emails.sent).toHaveLength(0);
  });

  it("identifiant trafiqué (pas un uuid, injection) : 404", async () => {
    const { agent } = await messageDuNegoce();
    expect((await repondre(agent, "../../admin")).status).toBe(404);
    expect((await repondre(agent, "' OR 1=1 --")).status).toBe(404);
    expect(ctx.emails.sent).toHaveLength(0);
  });

  it("un membre en lecture seule (viewer) ne peut pas répondre", async () => {
    const { agent, companyId, recuId } = await messageDuNegoce();
    await ctx.prisma.membership.updateMany({ where: { companyId }, data: { role: "viewer" } });
    expect((await repondre(agent, recuId)).status).toBe(403);
    expect(ctx.emails.sent).toHaveLength(0);
  });

  it("une entreprise du parcours « essai » dont l'identité n'est pas confirmée n'envoie RIEN à un négoce (comme /send)", async () => {
    const { agent, companyId, recuId } = await messageDuNegoce();
    await ctx.prisma.company.update({ where: { id: companyId }, data: { parcoursInscription: "essai", identiteConfirmeeLe: null } });
    const r = await repondre(agent, recuId);
    expect(r.status).toBe(403);
    expect(ctx.emails.sent).toHaveLength(0);
  });
});

describe("B. expéditeurs douteux", () => {
  it("expéditeur inconnu, non rattaché : refusé, rien ne lui part", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    await demande(ctx, agent);
    const adresse = await adresseDe(agent);
    recuSimule = { from: "Inconnu <qui@inconnu.example>" };
    const recu = (await webhook(ctx, `${adresse}@mobiiz.fr`, "Bonjour", "qui@inconnu.example")).body;
    ctx.emails.sent.length = 0;
    expect((await repondre(agent, recu.id)).status).toBe(400);
    expect(ctx.emails.sent).toHaveLength(0);
  });

  it("vraie adresse du négoce usurpée, NON authentifiée, avec l'étiquette : pas rattaché, Répondre refusé", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const d = await demande(ctx, agent);
    const adresse = await adresseDe(agent);
    recuSimule = { authentification: { spf: "pass", dkim: "gray", dmarc: "gray" } };
    const recu = (await webhook(ctx, `${adresse}+r${d.etiquette}@mobiiz.fr`)).body;
    ctx.emails.sent.length = 0;
    expect((await repondre(agent, recu.id)).status).toBe(400);
    expect(ctx.emails.sent).toHaveLength(0);
  });

  it("autre négoce (autre domaine) avec l'étiquette fuitée : pas rattaché, Répondre refusé", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const d = await demande(ctx, agent);
    const adresse = await adresseDe(agent);
    recuSimule = { from: "Négoce Dupont <devis@concurrent.example>" };
    const recu = (await webhook(ctx, `${adresse}+r${d.etiquette}@mobiiz.fr`, "Re: votre demande", "devis@concurrent.example")).body;
    expect((await ctx.prisma.emailRecuArtisan.findUniqueOrThrow({ where: { id: recu.id } })).recipientId).toBeNull();
    expect((await repondre(agent, recu.id)).status).toBe(400);
    expect(ctx.emails.sent.some((e) => e.to.includes("concurrent.example"))).toBe(false);
  });

  it("adresse cachée dans le nom affiché : rien ne part jamais à l'adresse du pirate", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const d = await demande(ctx, agent);
    const adresse = await adresseDe(agent);
    recuSimule = { from: '"ventes@dupont.example" <pirate@x.example>' };
    const recu = (await webhook(ctx, `${adresse}+r${d.etiquette}@mobiiz.fr`, "Re: votre demande", "pirate@x.example")).body;
    await repondre(agent, recu.id);
    expect(ctx.emails.sent.some((e) => e.to.includes("pirate@x.example"))).toBe(false);
  });

  it("message mis en Indésirables par Mobiiz (DMARC en échec) : Répondre refusé", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const d = await demande(ctx, agent);
    const adresse = await adresseDe(agent);
    recuSimule = { authentification: { spf: "pass", dkim: "pass", dmarc: "fail" } };
    const recu = (await webhook(ctx, `${adresse}+r${d.etiquette}@mobiiz.fr`)).body;
    ctx.emails.sent.length = 0;
    expect((await repondre(agent, recu.id)).status).toBe(400);
    expect(ctx.emails.sent).toHaveLength(0);
  });

  it("vraie réponse du négoce signalée en Indésirables par l'artisan : Répondre refusé", async () => {
    const { agent, recuId } = await messageDuNegoce();
    await agent.post(`/v1/recus/${recuId}/indesirable`).send({ indesirable: true }).expect(200);
    expect((await repondre(agent, recuId)).status).toBe(400);
    expect(ctx.emails.sent).toHaveLength(0);
  });

  it("message d'un inconnu rattaché à la main à la demande : la réponse ne CITE pas ce texte comme écrit par le négoce", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const d = await demande(ctx, agent);
    const adresse = await adresseDe(agent);
    recuSimule = { from: "Service compta <compta@pirate.example>", text: "Nouveau RIB pour vos paiements : FR76 9999 9999 9999. Merci de régler ici : https://pirate.example/payer" };
    const recu = (await webhook(ctx, `${adresse}@mobiiz.fr`, "Changement de RIB", "compta@pirate.example")).body;
    await agent.post(`/v1/recus/${recu.id}/rattacher`).send({ recipientId: d.recipientId }).expect(200);
    ctx.emails.sent.length = 0;
    const r = await repondre(agent, recu.id, { texte: "Bien reçu." });
    const parti = ctx.emails.sent.find((e) => e.to === "ventes@dupont.example");
    // Sûr : soit refusé (l'expéditeur n'est pas le négoce), soit le texte de l'inconnu n'est pas attribué à « Négoce Dupont ».
    if (r.status === 200) expect(parti?.text ?? "").not.toMatch(/Négoce Dupont a écrit/);
    // Et le fil n'affiche pas ce message comme venant de Négoce Dupont.
    const fil = (await agent.get(`/v1/messagerie/fil/${d.recipientId}`)).body;
    const item = fil.items.find((i: { id: string }) => i.id === recu.id);
    expect(item?.libelle).not.toBe("Négoce Dupont");
  });
});

describe("C. destinataire forcé", () => {
  it("champs to / cc / bcc / from / replyTo / subject ajoutés au corps : ignorés, un seul destinataire, le négoce", async () => {
    const { agent, adresse, etiquette, recuId } = await messageDuNegoce();
    const r = await repondre(agent, recuId, { texte: "ok", to: "pirate@x.example", cc: ["pirate@x.example"], bcc: "pirate@x.example", from: "ceo@mobiiz.fr", replyTo: "pirate@x.example", subject: "Facture urgente" });
    expect(r.status).toBe(200);
    expect(ctx.emails.sent).toHaveLength(1);
    const e = ctx.emails.sent[0]!;
    expect(e.to).toBe("ventes@dupont.example");
    expect(e.from).toContain(`<${adresse}@mobiiz.fr>`);
    expect(e.replyTo).toBe(`${adresse}+r${etiquette}@mobiiz.fr`);
    expect(e.subject).not.toContain("Facture urgente");
    expect(JSON.stringify(e)).not.toContain("pirate@x.example");
  });

  it("objet reçu avec retour à la ligne + « Bcc: » : l'objet envoyé ne garde aucun retour à la ligne (pas d'en-tête injecté)", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const d = await demande(ctx, agent);
    const adresse = await adresseDe(agent);
    recuSimule = { subject: "Re: votre demande\r\nBcc: pirate@x.example\r\nX-Pirate: 1" };
    const recu = (await webhook(ctx, `${adresse}+r${d.etiquette}@mobiiz.fr`, "Re: votre demande")).body;
    await repondre(agent, recu.id);
    for (const e of ctx.emails.sent) expect(e.subject).not.toMatch(/[\r\n]/);
  });

  it("nom d'entreprise piégé (« , adresse@… », « <…> ») : l'en-tête From ne contient qu'UNE adresse, celle de Mobiiz", async () => {
    const { agent, adresse, recuId } = await messageDuNegoce(ctx, "Martin, contact@negoce-dupont.example");
    expect((await repondre(agent, recuId)).status).toBe(200);
    const from = ctx.emails.sent[0]!.from!;
    const nom = from.slice(0, from.lastIndexOf("<"));
    expect(from.endsWith(`<${adresse}@mobiiz.fr>`)).toBe(true);
    // Un nom affiché non guillemeté avec « , » ou « @ » se lit comme une liste d'adresses (RFC 5322).
    expect(nom).not.toMatch(/[,@;:]/);
  });

  it("e-mail du négoce changé dans le carnet APRÈS l'envoi : la réponse part à l'adresse de la demande, pas à la nouvelle", async () => {
    const { agent, supplierId, recuId } = await messageDuNegoce();
    expect((await agent.patch(`/v1/suppliers/${supplierId}`).send({ email: "quelquun@ailleurs.example" })).status).toBe(200);
    await repondre(agent, recuId);
    expect(ctx.emails.sent.map((e) => e.to)).not.toContain("quelquun@ailleurs.example");
  });

  it("demande JAMAIS envoyée : un message rattaché à la main ne fait pas de « Répondre » un envoi libre vers n'importe quelle adresse du carnet", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    await demande(ctx, agent);
    const adresse = await adresseDe(agent);
    const v1 = await demande(ctx, agent, { negoce: { name: "Cible Un", email: "cible1@victime.example" }, envoyer: false, reference: "Cible1" });
    const v2 = await demande(ctx, agent, { negoce: { name: "Cible Deux", email: "cible2@victime.example" }, envoyer: false, reference: "Cible2" });
    // Un message quelconque (ici de l'artisan lui-même, depuis sa messagerie perso) arrive dans les Reçus.
    recuSimule = { from: "Moi <artisan.perso@example.fr>", subject: "Bonjour", text: "Texte libre" };
    const recu = (await webhook(ctx, `${adresse}@mobiiz.fr`, "Bonjour", "artisan.perso@example.fr")).body;
    for (const v of [v1, v2]) {
      await agent.post(`/v1/recus/${recu.id}/rattacher`).send({ recipientId: v.recipientId });
      await repondre(agent, recu.id, { texte: "Publicité : promo -50 % chez moi !" });
      await agent.post(`/v1/recus/${recu.id}/detacher`);
    }
    expect(ctx.emails.sent.filter((e) => e.to.endsWith("@victime.example")).map((e) => e.to)).toEqual([]);
  });

  it("négoce retiré du carnet (archivé) : on ne lui écrit plus", async () => {
    const { agent, supplierId, recuId } = await messageDuNegoce();
    await ctx.prisma.supplier.update({ where: { id: supplierId }, data: { archivedAt: new Date() } });
    const r = await repondre(agent, recuId);
    expect(r.status).toBe(400);
    expect(ctx.emails.sent).toHaveLength(0);
  });
});

describe("D. contenu", () => {
  it("corps au-delà de 10 000 caractères : 400 ; vide ou blancs : 400", async () => {
    const { agent, recuId } = await messageDuNegoce();
    expect((await repondre(agent, recuId, { texte: "a".repeat(10_001) })).status).toBe(400);
    expect((await repondre(agent, recuId, { texte: "   \r\n  " })).status).toBe(400);
    expect((await repondre(agent, recuId, { texte: 42 })).status).toBe(400);
    expect(ctx.emails.sent).toHaveLength(0);
  });

  it("HTML et script dans la réponse : échappés dans la version HTML mise en page, aucun lien javascript:", async () => {
    const { agent, recuId } = await messageDuNegoce();
    expect((await repondre(agent, recuId, { texte: '<script>alert(1)</script><img src=x onerror=alert(2)> javascript:alert(3) <a href="javascript:alert(4)">x</a>' })).status).toBe(200);
    const html = miseEnPage(ctx.emails.sent[0]!, "http://localhost:3000").html ?? "";
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toMatch(/href="javascript:/i);
  });

  it("pièces jointes ajoutées au corps : ignorées, aucune pièce ne part", async () => {
    const { agent, recuId } = await messageDuNegoce();
    const r = await repondre(agent, recuId, { texte: "voir pièce", attachments: [{ filename: "virus.exe", contentBase64: "TVqQAAMAAAAEAAAA", contentType: "application/octet-stream" }], pieces: ["x"], fichiers: ["y"] });
    expect(r.status).toBe(200);
    expect(ctx.emails.sent[0]!.attachments ?? []).toHaveLength(0);
  });
});

describe("E. demande supprimée ou changée, fil et rangement", () => {
  it("demande supprimée : Répondre refusé (plus de négoce connu)", async () => {
    const { agent, priceRequestId, recuId } = await messageDuNegoce();
    expect((await agent.delete(`/v1/price-requests/${priceRequestId}`)).status).toBe(204);
    expect((await repondre(agent, recuId)).status).toBe(400);
    expect(ctx.emails.sent).toHaveLength(0);
  });

  it("deux « Répondre » en même temps sur une demande sans étiquette : la réponse du négoce revient quand même dans la demande", async () => {
    const { agent, adresse, recipientId, recuId } = await messageDuNegoce();
    await ctx.prisma.priceRequestRecipient.update({ where: { id: recipientId }, data: { etiquette: null } });
    const rs = await Promise.all([1, 2, 3, 4, 5].map((i) => repondre(agent, recuId, { texte: `Réponse ${i}` })));
    expect(rs.every((r) => r.status === 200)).toBe(true);
    const finale = (await ctx.prisma.priceRequestRecipient.findUniqueOrThrow({ where: { id: recipientId } })).etiquette;
    const tags = ctx.emails.sent.map((e) => e.replyTo);
    // Chaque e-mail parti donne une adresse de réponse qui mène encore à la demande.
    expect(tags.filter((t) => t !== `${adresse}+r${finale}@mobiiz.fr`)).toEqual([]);
    // Preuve de bout en bout : le négoce répond au premier e-mail (adresse de réponse et objet de celui-ci).
    const premier = ctx.emails.sent[0]!;
    const retour = (await webhook(ctx, premier.replyTo!, `Re: ${premier.subject}`)).body;
    expect((await ctx.prisma.emailRecuArtisan.findUniqueOrThrow({ where: { id: retour.id } })).recipientId).toBe(recipientId);
  });

  it("le négoce répond SANS l'étiquette de l'adresse (au From) : l'objet envoyé désigne d'abord la bonne demande", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const d1 = await demande(ctx, agent, { reference: "Chantier Un" });
    const d2 = await demande(ctx, agent, { supplierId: d1.supplierId, reference: "Chantier Deux" });
    const adresse = await adresseDe(agent);
    // Le négoce répond pour le chantier 1 (bonne étiquette d'adresse) en reprenant l'objet d'un e-mail du chantier 2.
    recuSimule = { subject: `Re: Demande de prix [réf. ${d2.etiquette}]` };
    const recu = (await webhook(ctx, `${adresse}+r${d1.etiquette}@mobiiz.fr`, recuSimule.subject!)).body;
    expect((await ctx.prisma.emailRecuArtisan.findUniqueOrThrow({ where: { id: recu.id } })).recipientId).toBe(d1.recipientId);
    expect((await repondre(agent, recu.id)).status).toBe(200);
    const parti = ctx.emails.sent.find((x) => x.to === "ventes@dupont.example")!;
    // Sa messagerie répond à l'adresse sans étiquette ; seul l'objet repère la demande.
    recuSimule = { subject: `Re: ${parti.subject}` };
    const retour = (await webhook(ctx, `${adresse}@mobiiz.fr`, recuSimule.subject!)).body;
    const e = await ctx.prisma.emailRecuArtisan.findUniqueOrThrow({ where: { id: retour.id } });
    expect(e.recipientId).not.toBe(d2.recipientId);
    expect(e.recipientId).toBe(d1.recipientId);
  });

  it("le fil d'une demande ne montre que ce négoce : la réponse envoyée y est, celle d'une autre entreprise jamais", async () => {
    const a = await messageDuNegoce();
    await repondre(a.agent, a.recuId).expect(200);
    const b = await messageDuNegoce(ctx, "Toitures Bernard", "b@example.fr");
    await repondre(b.agent, b.recuId).expect(200);
    const fil = (await a.agent.get(`/v1/messagerie/fil/${a.recipientId}`)).body;
    expect(fil.items.filter((i: { sens: string }) => i.sens === "envoye")).toHaveLength(2); // la demande + la réponse
    expect(JSON.stringify(fil)).not.toContain(b.recuId);
  });
});

describe("F. rafale (limite de débit réelle, RATE_LIMIT=on)", () => {
  let rl: TestContext;
  beforeAll(async () => {
    process.env.RATE_LIMIT = "on";
    rl = await createTestApp((b) => b.overrideProvider(EMAIL_RECU).useValue(lecteur).overrideProvider(ALERTER).useValue(alerter));
  });
  afterAll(async () => {
    await rl.app.close();
    process.env.RATE_LIMIT = "off";
  });

  it("depuis une même adresse IP : au plus 30 réponses par heure, la 31e est refusée (429)", async () => {
    const { agent, recuId } = await messageDuNegoce(rl);
    const statuts: number[] = [];
    for (let i = 0; i < 31; i++) statuts.push((await agent.post(`/v1/recus/${recuId}/repondre`).set("x-forwarded-for", "203.0.113.7").send({ texte: `r${i}` })).status);
    expect(statuts.slice(0, 30).every((s) => s === 200)).toBe(true);
    expect(statuts[30]).toBe(429);
    expect(rl.emails.sent).toHaveLength(30);
  });

  it("un même compte depuis plusieurs adresses IP : le plafond tient par entreprise (coût Resend, réputation du domaine)", async () => {
    const { agent, recuId } = await messageDuNegoce(rl);
    let partis = 0;
    for (let i = 0; i < 45; i++) if ((await agent.post(`/v1/recus/${recuId}/repondre`).set("x-forwarded-for", `198.51.100.${i + 1}`).send({ texte: `r${i}` })).status === 200) partis++;
    expect(partis).toBeLessThanOrEqual(30);
  });
});

describe("G. contre-vérification (relecture du 27 novembre 2026)", () => {
  it("un vrai négoce sans DMARC, rattaché à la main : on lui répond, sans le citer sous son nom", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const d = await demande(ctx, agent);
    const adresse = await adresseDe(agent);
    recuSimule = { authentification: { spf: "none", dkim: "none", dmarc: "none" } };
    const recu = (await webhook(ctx, `${adresse}@mobiiz.fr`, "Notre devis")).body;
    await agent.post(`/v1/recus/${recu.id}/rattacher`).send({ recipientId: d.recipientId }).expect(200);
    ctx.emails.sent.length = 0;
    expect((await repondre(agent, recu.id)).status).toBe(200);
    const parti = ctx.emails.sent.find((e) => e.to === "ventes@dupont.example");
    expect(parti).toBeDefined();
    expect(parti!.text).not.toMatch(/Négoce Dupont a écrit/);
    expect(parti!.text).toMatch(/ventes@dupont\.example a écrit/);
  });

  it("40 réponses lancées au même instant depuis 40 adresses IP : 30 au plus partent (compteur atomique)", async () => {
    const { agent, recuId } = await messageDuNegoce();
    const r = await Promise.all(Array.from({ length: 40 }, (_, i) => agent.post(`/v1/recus/${recuId}/repondre`).set("x-forwarded-for", `203.0.113.${i + 1}`).send({ texte: `r${i}` })));
    expect(r.filter((x) => x.status === 200).length).toBeLessThanOrEqual(30);
  });
});
