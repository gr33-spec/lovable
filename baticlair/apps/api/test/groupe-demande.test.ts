import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PHRASE_COMMISSION, VERSION_CONTRAT } from "@baticlair/domain";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";
import { makePdf } from "./support/pdf-fixtures.js";

/**
 * BATICLAIR GROUPÉ, ÉTAPE 5 : LA DEMANDE AUX NÉGOCES (document du fondateur, 2026-10-19, section 2 étape 5 ; décision du
 * 2026-10-20 : commission de 2 % acceptée avant de répondre). Dès que le lot est formé, un e-mail part au nom du
 * « Regroupement artisans » à chaque négoce du département qui vend la famille (le généraliste en un seul e-mail, le
 * plombier et le négoce de Brest jamais), avec la phrase de commission en gras, le PDF en deux parties, un lien de réponse
 * unique par négoce ; sans nom d'artisan. Sur la page du lien : la case d'accord est obligatoire, le contrat à côté, date +
 * e-mail + IP enregistrés, un ou deux devis lus (prix, délai). Le lot est parti : plus de retrait.
 */
let ctx: TestContext;
const avant = process.env.GROUPE;
const avantCron = process.env.CRON_SECRET;
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.CRON_SECRET = "secret-de-la-tache";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  if (avant === undefined) delete process.env.GROUPE;
  else process.env.GROUPE = avant;
  if (avantCron === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = avantCron;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
});

type Besoin = { id: string; statut: string; lotParti: boolean };
const FENETRE = { tot: "2026-11-02", tard: "2026-11-20" };

async function carreleur(email: string, adresse = "3 rue des Ajoncs, 22300 Lannion") {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, `Carrelages ${email}`, ["tiling"]);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: "73282932000074", siretVerifieLe: new Date() } });
  await agent.patch("/v1/company/profile").send({ name: `Carrelages ${email}`, address: adresse, siret: "73282932000074", phone: null, email: null }).expect(200);
  let q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Carrelage sol grès cérame 60x60 rectifié, pose droite", quantite: "30", unite: "m²" }] }).expect(201)).body as { id: string; projetId: string; questions: { id: string }[] };
  const ok = q.questions.filter((x) => x.id.startsWith("ratio:")).map((x) => ({ question: x.id, valeur: "ok" }));
  if (ok.length > 0) q = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: ok }).expect(201)).body;
  await agent.patch(`/v1/projects/${q.projetId}`).send({ address: adresse }).expect(200);
  const toBuy = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string; label: string }[];
  const carreaux = toBuy.find((b) => /^Carreau de sol 60×60/.test(b.label))!;
  return { agent, companyId, projectId: q.projetId, carreaux };
}
const proposer = async (c: Awaited<ReturnType<typeof carreleur>>, statut: "signe" | "en_attente") =>
  (await c.agent.post(`/v1/projects/${c.projectId}/groupe`).send({ articles: [c.carreaux.key], fenetre: FENETRE, statut, engagement: true }).expect(201)).body.besoins[0] as Besoin;
const negoce = (agent: Agent, nom: string, email: string, familles: string[]) => agent.post("/v1/groupe/negoces").send({ nom, email, familles }).expect(201);
const jetonDe = (texte: string) => /\/reponse\/([A-Za-z0-9_-]+)/.exec(texte)![1]!;
/** Les e-mails partis aux négoces (ceux d'inscription des artisans vont aux @example.fr). */
// Nouveau cap (22 octobre) : le mail d'information au négoce ajouté et les alertes de devis ont leurs propres tests
// (`cap-22-octobre.test.ts`) ; ici, on suit les messages du parcours d'origine.
const nouveauCap = (m: { subject: string }) => /^(Un regroupement d|Nouveau meilleur prix|Nouveau devis)/.test(m.subject);
const mailsNegoces = () => ctx.emails.sent.filter((m) => m.to.endsWith("@example.com") && !nouveauCap(m));

/** Quatre artisans (trois signés, un en attente), trois négoces du 22 (un généraliste, un plombier « pas concerné ») et un de Brest. */
async function scenario() {
  const a = await carreleur("a@example.fr");
  await negoce(a.agent, "Négoce Carrelage", "carrelage@example.com", ["second_oeuvre"]);
  await negoce(a.agent, "Négoce Généraliste", "general@example.com", ["couverture", "second_oeuvre", "plomberie"]);
  await negoce(a.agent, "Négoce Plomberie", "plomberie@example.com", ["plomberie"]);
  const brest = await carreleur("brest@example.fr", "1 rue de Siam, 29200 Brest");
  await negoce(brest.agent, "Négoce Brest", "brest@example.com", ["second_oeuvre"]);
  const besoinA = await proposer(a, "signe");
  const d = await carreleur("d@example.fr", "8 rue du Port, 22500 Paimpol");
  await proposer(d, "en_attente");
  expect(mailsNegoces()).toHaveLength(0);
  const b = await carreleur("b@example.fr", "12 rue de Kerampont, 22300 Lannion");
  await proposer(b, "signe");
  return { a, b, d, besoinA };
}

describe("groupé, étape 5 : la demande aux négoces", { timeout: 60_000 }, () => {
  it("le lot formé part aux négoces concernés du département, un e-mail par négoce, phrase de commission en gras, PDF joint, sans nom d'artisan", async () => {
    const { a, besoinA } = await scenario();
    const mails = mailsNegoces();
    expect(mails.map((m) => m.to).sort()).toEqual(["carrelage@example.com", "general@example.com"]);
    const m = mails.find((x) => x.to === "carrelage@example.com")!;
    expect(m.subject).toMatch(/^Regroupement artisans : demande de prix, Carreau de sol 60×60/);
    expect(m.text).toContain(`** ${PHRASE_COMMISSION.toUpperCase()} **`);
    expect(m.html).toContain(`<strong>${PHRASE_COMMISSION}</strong>`);
    expect(m.text).toMatch(/Volume ferme : .* \(2 chantiers\) ; volume probable : /);
    expect(m.text).toContain("/reponse/");
    expect(m.text).toContain("/negoces/lien/");
    for (const interdit of ["Carrelages", "a@example.fr", "b@example.fr", "d@example.fr"]) expect(`${m.text}\n${m.html}`).not.toContain(interdit);
    expect(m.attachments).toHaveLength(1);
    expect(m.attachments![0]!.contentType).toBe("application/pdf");
    expect(Buffer.from(m.attachments![0]!.contentBase64, "base64").subarray(0, 4).toString()).toBe("%PDF");
    // Chaque négoce a son lien : jamais le même.
    expect(jetonDe(m.text)).not.toBe(jetonDe(mails.find((x) => x.to === "general@example.com")!.text));

    const lot = await ctx.prisma.lotGroupe.findFirstOrThrow({ include: { besoins: true, journal: { orderBy: { createdAt: "asc" } }, reponses: true } });
    expect(lot.statut).toBe("envoye");
    expect(lot.envoyeLe).not.toBeNull();
    expect(lot.besoins.map((b) => b.statut).sort()).toEqual(["en_attente", "engage", "engage"]);
    expect(lot.journal.at(-1)!.evenement).toBe("demande_envoyee");
    expect(lot.journal.at(-1)!.details).toMatchObject({ negoces: 2 });
    expect(lot.reponses).toHaveLength(2);
    // Section 4 b : parti, le besoin ne se retire plus.
    expect((await a.agent.delete(`/v1/groupe/besoins/${besoinA.id}`)).status).toBe(409);
    expect((await a.agent.get(`/v1/projects/${a.projectId}/groupe`).expect(200)).body.besoins[0]).toMatchObject({ statut: "engage", lotParti: true });

    // Un troisième signé après le départ ouvre le lot suivant, sans nouvel e-mail.
    const c = await carreleur("c@example.fr");
    await proposer(c, "signe");
    expect(await ctx.prisma.lotGroupe.count()).toBe(2);
    expect(mailsNegoces()).toHaveLength(2);

    // Le lien « pas concerné » du généraliste porte la famille du lot ; lu, il ne décoche rien.
    const general = mails.find((x) => x.to === "general@example.com")!;
    const pasConcerne = /\/negoces\/lien\/([A-Za-z0-9_.-]+)/.exec(general.text)![1]!;
    const anon = request(ctx.app.getHttpServer());
    expect((await anon.post("/v1/negoces/lien/apercu").send({ jeton: pasConcerne }).expect(200)).body).toMatchObject({ action: "pas_concerne", negoce: "Négoce Généraliste", famille: expect.stringContaining("Second œuvre"), fait: false });
  });

  it("la page du lien : le lot sans nom d'artisan, le contrat ; sans la case d'accord, rien n'est pris ; avec, accord + devis lus (prix, délai)", async () => {
    await scenario();
    const jeton = jetonDe(mailsNegoces().find((x) => x.to === "carrelage@example.com")!.text);
    const anon = request(ctx.app.getHttpServer());
    const page = (await anon.get(`/v1/reponse/${jeton}`).expect(200)).body;
    expect(page.lot).toMatchObject({ departement: "22", famille: expect.stringContaining("Second œuvre"), ouvert: true, fenetre: FENETRE });
    expect(page.lot.chantiers.map((c: { engagement: string }) => c.engagement).sort()).toEqual(["ferme", "ferme", "probable"]);
    expect(page.lot.chantiers.map((c: { adresse: string }) => c.adresse)).toContain("8 rue du Port, 22500 Paimpol");
    expect(JSON.stringify(page)).not.toContain("Carrelages");
    expect(page.negoce).toEqual({ nom: "Négoce Carrelage", email: "carrelage@example.com" });
    expect(page.commission).toMatchObject({ phrase: PHRASE_COMMISSION, tauxPourcent: 2, versionContrat: VERSION_CONTRAT });
    expect(page.commission.contrat.length).toBeGreaterThanOrEqual(6);
    expect(page.accord).toBeNull();
    expect(page.reponse).toBeNull();
    const contrat = await anon.get(`/v1/reponse/${jeton}/contrat.pdf`).expect(200);
    expect(contrat.headers["content-type"]).toContain("application/pdf");
    expect((await anon.get(`/v1/reponse/${jeton.slice(0, -2)}xx`)).status).toBe(404);
    expect((await anon.get("/v1/reponse/court")).status).toBe(404);

    const devis = Buffer.from(
      await makePdf(
        ["devis"],
        [
          ["CAR-60", "Carreau de sol 60x60 grès cérame", "46 u", "18,50", "851,00"],
          ["CAR-60", "Carreau de sol 60x60 grès cérame", "100 u", "17,20", "1 720,00"],
        ],
        "Total HT 851,00   TVA 20 % 170,20   Total TTC 1 021,20",
        "DEVIS N° 77 – Négoce Carrelage – Délai de livraison 10 jours",
      ),
    );
    // Sans la case : refusé, aucun accord, aucun dépôt.
    const sans = await anon.post(`/v1/reponse/${jeton}`).field("message", "Prix valables 30 jours").attach("file", devis, { filename: "devis-77.pdf", contentType: "application/pdf" });
    expect(sans.status).toBe(400);
    expect(sans.body.error.details).toMatchObject({ reason: "accord_requis" });
    expect(await ctx.prisma.accordNegoce.count()).toBe(0);
    expect((await ctx.prisma.reponseNegoce.findMany()).every((r) => r.deposeLe === null)).toBe(true);
    // La case sans devis : refusé aussi.
    expect((await anon.post(`/v1/reponse/${jeton}`).field("accord", "oui")).body.error.details).toMatchObject({ reason: "devis_requis" });

    // Décision de Greg (22 octobre) : sans la livraison (dépôt, gratuite jusqu'à X km, Y € au-delà), rien n'est pris.
    const sansLivraison = await anon.post(`/v1/reponse/${jeton}`).field("accord", "oui").attach("file", devis, { filename: "devis-77.pdf", contentType: "application/pdf" });
    expect(sansLivraison.body.error.details).toMatchObject({ reason: "livraison_requise" });
    const avec = await anon
      .post(`/v1/reponse/${jeton}`)
      .field("accord", "oui")
      .field("depart", "Zone de Kerampont, 22300 Lannion")
      .field("francoKm", "20")
      .field("prixAuDela", "45")
      .field("message", "Prix valables 30 jours")
      .attach("file", devis, { filename: "devis-77.pdf", contentType: "application/pdf" })
      .attach("file", devis, { filename: "devis-77-bis.pdf", contentType: "application/pdf" });
    expect(avec.status).toBe(201);
    expect(avec.body.accord).not.toBeNull();
    expect(avec.body.reponse).toMatchObject({ fichiers: ["devis-77.pdf", "devis-77-bis.pdf"], message: "Prix valables 30 jours", statutExtraction: "lue" });
    const accord = await ctx.prisma.accordNegoce.findFirstOrThrow();
    expect(accord).toMatchObject({ email: "carrelage@example.com", versionContrat: VERSION_CONTRAT });
    expect(Number(accord.tauxPourcent)).toBe(2);
    expect(accord.adresseIp.length).toBeGreaterThan(0);
    const reponse = await ctx.prisma.reponseNegoce.findFirstOrThrow({ where: { negoce: { email: "carrelage@example.com" } }, include: { fichiers: true } });
    // La distance du dépôt à chaque chantier est calculée au dépôt : Lannion 0 km, Paimpol 40 km (par la route).
    expect(Object.values((reponse.livraison as { distances: Record<string, number> }).distances).sort((a, b) => a - b)).toEqual([0, 0, 40]);
    expect(reponse.livraison).toMatchObject({ depart: "Zone de Kerampont, 22300 Lannion", francoKm: 20, prixAuDela: 45 });
    expect(reponse.deposeLe).not.toBeNull();
    expect(reponse.delaiJours).toBe(10);
    expect(reponse.prix).toMatchObject([{ palier: "46", prixUnitaire: "18,50" }, { palier: "100", prixUnitaire: "17,20" }, { palier: "46" }, { palier: "100" }]);
    expect(reponse.fichiers).toHaveLength(2);
    // Un lot qui n'attend plus (choisi) ne prend plus de dépôt.
    await ctx.prisma.lotGroupe.update({ where: { id: reponse.lotId }, data: { statut: "choisi" } });
    const ferme = await anon.post(`/v1/reponse/${jeton}`).field("accord", "oui").field("depart", "Zone de Kerampont, 22300 Lannion").field("francoKm", "20").field("prixAuDela", "45").attach("file", devis, { filename: "devis.pdf", contentType: "application/pdf" });
    expect(ferme.status).toBe(409);
    expect((await anon.get(`/v1/reponse/${jeton}`).expect(200)).body.lot.ouvert).toBe(false);
  });

  it("la tâche planifiée envoie aussi : un lot formé sans négoce reste formé, puis part dès qu'un négoce vend sa famille", async () => {
    const a = await carreleur("a@example.fr");
    await proposer(a, "signe");
    const b = await carreleur("b@example.fr");
    await proposer(b, "signe");
    expect((await ctx.prisma.lotGroupe.findFirstOrThrow()).statut).toBe("forme");
    expect(mailsNegoces()).toHaveLength(0);
    await negoce(a.agent, "Négoce Carrelage", "carrelage@example.com", ["second_oeuvre"]);
    const res = await request(ctx.app.getHttpServer()).get("/v1/internal/groupe/regrouper").set("authorization", "Bearer secret-de-la-tache");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ lotsEnvoyes: 1, negocesPrevenus: 1 });
    expect(mailsNegoces().map((m) => m.to)).toEqual(["carrelage@example.com"]);
    expect((await ctx.prisma.lotGroupe.findFirstOrThrow()).statut).toBe("envoye");
  });
});

describe("groupé, dette n° 12 : un lien de réponse expire", { timeout: 60_000 }, () => {
  it("30 jours après l'envoi du lot, le lien répond 404, même si le lot est encore « envoyé »", async () => {
    await scenario();
    const jeton = jetonDe(mailsNegoces().find((x) => x.to === "carrelage@example.com")!.text);
    const anon = request(ctx.app.getHttpServer());
    await anon.get(`/v1/reponse/${jeton}`).expect(200);
    const lot = await ctx.prisma.lotGroupe.findFirstOrThrow({ where: { statut: "envoye" } });
    await ctx.prisma.lotGroupe.update({ where: { id: lot.id }, data: { envoyeLe: new Date(Date.now() - 31 * 24 * 3600 * 1000) } });
    expect((await anon.get(`/v1/reponse/${jeton}`)).status).toBe(404);
    expect((await anon.post(`/v1/reponse/${jeton}`).field("accord", "oui")).status).toBe(404);
  });
});
