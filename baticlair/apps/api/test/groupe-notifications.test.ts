import { createHmac } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ChoixService, CommandeService } from "../src/modules/groupe/index.js";
import type { CapturingPushSender } from "../src/platform/push/web-push.sender.js";
import { PUSH_SENDER } from "../src/platform/tokens.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";

/**
 * BATICLAIR GROUPÉ, ÉTAPE 8 : LES NOTIFICATIONS (document du fondateur, 2026-10-19, section 3) : quatre messages par lot,
 * push + e-mail, mot pour mot, jamais le nom des autres artisans ; l'avertissement après un désistement (décision du
 * 2026-10-20) ; la réponse d'un négoce par e-mail (webhook Resend signé) qui renvoie son lien de dépôt sans rien prendre.
 */
let ctx: TestContext;
let push: CapturingPushSender;
const avant = { GROUPE: process.env.GROUPE, RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET, REPONSES_DOMAINE: process.env.REPONSES_DOMAINE, FACTURE_EMETTEUR_NOM: process.env.FACTURE_EMETTEUR_NOM };
const SECRET = "whsec_" + Buffer.from("secret-du-webhook-de-test-0000").toString("base64");
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.RESEND_WEBHOOK_SECRET = SECRET;
  process.env.REPONSES_DOMAINE = "reponses.example.com";
  process.env.FACTURE_EMETTEUR_NOM = "Société Émettrice";
  process.env.FACTURE_EMETTEUR_FORME = "SARL";
  process.env.FACTURE_EMETTEUR_SIRET = "000 000 000 00000";
  process.env.FACTURE_EMETTEUR_ADRESSE = "1 rue de l'Exemple, 22000 Ville";
  process.env.FACTURE_EMETTEUR_TVA = "FR00000000000";
  ctx = await createTestApp();
  push = ctx.app.get(PUSH_SENDER);
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) if (v === undefined) delete process.env[k];
  else process.env[k] = v;
  for (const k of ["FACTURE_EMETTEUR_FORME", "FACTURE_EMETTEUR_SIRET", "FACTURE_EMETTEUR_ADRESSE", "FACTURE_EMETTEUR_TVA"]) delete process.env[k];
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
  push.sent.length = 0;
});

const FENETRE = { tot: "2026-11-02", tard: "2026-11-20" };
async function carreleur(email: string, nom: string, adresse: string) {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, nom, ["tiling"]);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: "73282932000074", siretVerifieLe: new Date() } });
  await agent.patch("/v1/company/profile").send({ name: nom, address: adresse, siret: "73282932000074", phone: null, email: null }).expect(200);
  // Un appareil abonné aux notifications.
  await agent.post("/v1/me/notifications/push").send({ endpoint: `https://push.example/${email}`, keys: { p256dh: "p256dh-de-test-0000000000", auth: "auth-de-test-00" } }).expect(200);
  let q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Carrelage sol grès cérame 60x60 rectifié, pose droite", quantite: "30", unite: "m²" }] }).expect(201)).body as { id: string; projetId: string; questions: { id: string }[] };
  const ok = q.questions.filter((x) => x.id.startsWith("ratio:")).map((x) => ({ question: x.id, valeur: "ok" }));
  if (ok.length > 0) q = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: ok }).expect(201)).body;
  await agent.patch(`/v1/projects/${q.projetId}`).send({ address: adresse }).expect(200);
  const toBuy = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string; label: string }[];
  const carreaux = toBuy.find((b) => /^Carreau de sol 60×60/.test(b.label))!;
  return { agent, companyId, projectId: q.projetId, carreaux, email };
}
const proposer = (c: Awaited<ReturnType<typeof carreleur>>, statut: "signe" | "en_attente") =>
  c.agent.post(`/v1/projects/${c.projectId}/groupe`).send({ articles: [c.carreaux.key], fenetre: FENETRE, statut, engagement: true }).expect(201);
const negoce = (agent: Agent, nom: string, email: string, familles: string[]) => agent.post("/v1/groupe/negoces").send({ nom, email, familles }).expect(201);
const mailsVers = (email: string) => ctx.emails.sent.filter((m) => m.to === email);
const pushVers = (email: string) => push.sent.filter((p) => p.target.endpoint.endsWith(`/${email}`)).map((p) => p.message);
const jetonPour = (email: string) => /\/reponse\/([A-Za-z0-9_-]+)/.exec(mailsVers(email)[0]!.text)![1]!;
const CARREAU = "Carreau de sol 60x60 grès cérame";
async function deposer(jeton: string, rows: FixtureRow[], titre: string) {
  const devis = Buffer.from(await makePdf(["devis"], rows, "Total HT 1 000,00   TVA 20 % 200,00   Total TTC 1 200,00", titre));
  return request(ctx.app.getHttpServer()).post(`/v1/reponse/${jeton}`).field("accord", "oui").attach("file", devis, { filename: "devis.pdf", contentType: "application/pdf" });
}
function enTetesSvix(corps: string, secret = SECRET, timestamp = Math.floor(Date.now() / 1000)) {
  const id = "msg_test";
  const signature = createHmac("sha256", Buffer.from(secret.replace(/^whsec_/, ""), "base64")).update(`${id}.${timestamp}.${corps}`).digest("base64");
  return { "svix-id": id, "svix-timestamp": String(timestamp), "svix-signature": `v1,${signature}` };
}

describe("groupé, étape 8 : les notifications", { timeout: 90_000 }, () => {
  it("les quatre messages de la section 3, push + e-mail, dans l'ordre du lot ; le désistement avertit l'artisan ; la facture porte l'émetteur et la TVA", async () => {
    const a = await carreleur("a@example.fr", "Carrelages A", "3 rue des Ajoncs, 22300 Lannion");
    await negoce(a.agent, "Négoce Carrelage", "carrelage@example.com", ["second_oeuvre"]);
    await negoce(a.agent, "Négoce Généraliste", "general@example.com", ["couverture", "second_oeuvre"]);
    // 1. Besoin accepté.
    await proposer(a, "signe");
    expect(pushVers("a@example.fr").map((m) => m.body)).toEqual(["Vos 23 cartons de 1,44 m² sont dans le groupé Côtes-d'Armor. Prochain lot lundi."]);
    expect(mailsVers("a@example.fr").at(-1)!.subject).toContain("Prochain lot lundi");
    const b = await carreleur("b@example.fr", "Carrelages B", "12 rue de Kerampont, 22300 Lannion");
    await proposer(b, "signe");
    // 2. Lot formé, demande partie chez 2 négoces : chacun des deux artisans, sans l'autre.
    for (const e of ["a@example.fr", "b@example.fr"]) {
      const m = pushVers(e).find((x) => /parti chez/.test(x.body))!;
      expect(m.body).toBe("Le groupé est parti chez 2 négoces. Réponses attendues sous 7 jours.");
    }
    expect(JSON.stringify(push.sent)).not.toContain("Carrelages");
    // L'e-mail au négoce répond à l'adresse du lot.
    const lot = await ctx.prisma.lotGroupe.findFirstOrThrow();
    expect(mailsVers("carrelage@example.com")[0]!.replyTo).toBe(`lot-${lot.numero}@reponses.example.com`);
    // 3. Négoce retenu : A avait déclaré un prix de référence (21 → −12 %).
    await deposer(jetonPour("general@example.com"), [["CAR", CARREAU, "46 u", "19,90", "915,40"]], "DEVIS G – Délai de livraison 5 jours");
    await deposer(jetonPour("carrelage@example.com"), [["CAR", CARREAU, "46 u", "18,50", "851,00"]], "DEVIS C – Délai de livraison 8 jours");
    await ctx.app.get(ChoixService).choisirLesLotsEnvoyes();
    const retenuB = pushVers("b@example.fr").find((x) => /chez Négoce Carrelage/.test(x.body))!;
    expect(retenuB.body).toMatch(/^Vos 23 cartons de 1,44 m² : 18,50 € chez Négoce Carrelage\. Bon de commande transmis, livraison le \d+ nov\.$/);
    expect(mailsVers("b@example.fr").find((m) => /bon de commande/.test(m.subject))!.attachments).toHaveLength(1);
    // La facture porte l'émetteur configuré et la TVA.
    const factureMail = mailsVers("carrelage@example.com").find((m) => /^Facture n°/.test(m.subject))!;
    expect(factureMail.text).toContain("17,02 € HT, soit 20,42 € TTC");
    expect(Buffer.from(factureMail.attachments![0]!.contentBase64, "base64").subarray(0, 4).toString()).toBe("%PDF");
    expect((await ctx.prisma.journalGroupe.count({ where: { evenement: "facture_emetteur_manquant" } }))).toBe(0);
    // 4. Livraison du jour : rien la veille, une fois le jour prévu.
    const commande = ctx.app.get(CommandeService);
    const livraison = await ctx.prisma.livraison.findFirstOrThrow();
    const veille = new Date(livraison.datePrevue!.getTime() - 86_400_000);
    expect(await commande.prevenirLesLivraisonsDuJour(veille)).toEqual({ prevenues: 0 });
    expect(await commande.prevenirLesLivraisonsDuJour(livraison.datePrevue!)).toEqual({ prevenues: 2 });
    expect(pushVers("a@example.fr").some((x) => x.body === "Livraison aujourd'hui. Tout est arrivé ?")).toBe(true);
    expect(await commande.prevenirLesLivraisonsDuJour(livraison.datePrevue!)).toEqual({ prevenues: 0 });
    // Quatre messages par lot, pas un de plus pour A.
    expect(pushVers("a@example.fr")).toHaveLength(4);
    // Le désistement : avertissement par e-mail.
    const lotsB = (await b.agent.get("/v1/groupe/lots").expect(200)).body.besoins;
    await b.agent.post(`/v1/groupe/bons/${lotsB[0].bon.id}/desistement`).send({}).expect(200);
    expect(mailsVers("b@example.fr").at(-1)!.subject).toBe("Groupé : désistement enregistré, avertissement");
  });

  it("le webhook Resend : signature obligatoire ; une réponse par e-mail renvoie au négoce son lien de dépôt, sans rien prendre en compte", async () => {
    const a = await carreleur("a@example.fr", "Carrelages A", "3 rue des Ajoncs, 22300 Lannion");
    await negoce(a.agent, "Négoce Carrelage", "carrelage@example.com", ["second_oeuvre"]);
    await proposer(a, "signe");
    const b = await carreleur("b@example.fr", "Carrelages B", "12 rue de Kerampont, 22300 Lannion");
    await proposer(b, "signe");
    const lot = await ctx.prisma.lotGroupe.findFirstOrThrow();
    const avantJeton = jetonPour("carrelage@example.com");
    const anon = request(ctx.app.getHttpServer());
    const corps = JSON.stringify({ type: "email.received", data: { from: "Négoce Carrelage <carrelage@example.com>", to: [`lot-${lot.numero}@reponses.example.com`], subject: "Re: demande de prix" } });
    // Sans signature, ou signée avec un autre secret : refusé.
    expect((await anon.post("/v1/webhooks/resend").set("content-type", "application/json").send(corps)).status).toBe(403);
    expect((await anon.post("/v1/webhooks/resend").set(enTetesSvix(corps, "whsec_" + Buffer.from("autre-secret-autre-secret").toString("base64"))).set("content-type", "application/json").send(corps)).status).toBe(403);
    // Signée : le négoce reçoit un e-mail avec un lien de dépôt neuf ; l'ancien lien ne vaut plus ; rien n'est déposé.
    const res = await anon.post("/v1/webhooks/resend").set(enTetesSvix(corps)).set("content-type", "application/json").send(corps);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ traite: true });
    const reponse = mailsVers("carrelage@example.com").at(-1)!;
    expect(reponse.subject).toContain("n'est pas encore prise en compte");
    const nouveau = /\/reponse\/([A-Za-z0-9_-]+)/.exec(reponse.text)![1]!;
    expect(nouveau).not.toBe(avantJeton);
    expect((await anon.get(`/v1/reponse/${avantJeton}`)).status).toBe(404);
    expect((await anon.get(`/v1/reponse/${nouveau}`)).status).toBe(200);
    expect((await ctx.prisma.reponseNegoce.findFirstOrThrow()).deposeLe).toBeNull();
    expect(await ctx.prisma.journalGroupe.count({ where: { evenement: "reponse_par_email" } })).toBe(1);
    // Un expéditeur inconnu du lot : rien.
    const inconnu = JSON.stringify({ type: "email.received", data: { from: "quelquun@example.org", to: [`lot-${lot.numero}@reponses.example.com`] } });
    expect((await anon.post("/v1/webhooks/resend").set(enTetesSvix(inconnu)).set("content-type", "application/json").send(inconnu)).body).toEqual({ traite: false, raison: "negoce_inconnu" });
  });
});
