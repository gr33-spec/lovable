import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ChoixService, jetonDeLien } from "../src/modules/groupe/index.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";

/**
 * PLAN 2 DU 21 OCTOBRE 2026, BLOC 5 : MULTI-AGENCES. Un négoce peut répondre pour plusieurs agences (une par
 * département) avec le même e-mail : une ligne de la base par département, une demande par département (son lot, son
 * lien), un négoce retenu par lot, donc par département. « Stop » vaut pour l'e-mail (toutes les agences) ; « pas
 * concerné » reste par agence.
 */
let ctx: TestContext;
const SECRET = "test-secret-test-secret-test-secret-000";
const avant = process.env.GROUPE;
beforeAll(async () => {
  process.env.GROUPE = "on";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  if (avant === undefined) delete process.env.GROUPE;
  else process.env.GROUPE = avant;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
});

const FENETRE = { tot: "2026-11-02", tard: "2026-11-20" };
async function carreleur(email: string, nom: string, adresse: string) {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, nom, ["tiling"]);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: "73282932000074", siretVerifieLe: new Date() } });
  await agent.patch("/v1/company/profile").send({ name: nom, address: adresse, siret: "73282932000074", phone: null, email: null }).expect(200);
  let q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Carrelage sol grès cérame 60x60 rectifié, pose droite", quantite: "30", unite: "m²" }] }).expect(201)).body as { id: string; projetId: string; questions: { id: string }[] };
  const ok = q.questions.filter((x) => x.id.startsWith("ratio:")).map((x) => ({ question: x.id, valeur: "ok" }));
  if (ok.length > 0) q = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: ok }).expect(201)).body;
  await agent.patch(`/v1/projects/${q.projetId}`).send({ address: adresse }).expect(200);
  const toBuy = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string; label: string }[];
  const carreaux = toBuy.find((b) => /^Carreau de sol 60×60/.test(b.label))!;
  return { agent, companyId, projectId: q.projetId, carreaux, email };
}
const proposer = (c: Awaited<ReturnType<typeof carreleur>>) => c.agent.post(`/v1/projects/${c.projectId}/groupe`).send({ articles: [c.carreaux.key], fenetre: FENETRE, statut: "signe", engagement: true }).expect(201);
const negoce = (agent: Agent, nom: string, email: string, familles: string[]) => (agent.post("/v1/groupe/negoces").send({ nom, email, familles }).expect(201) as Promise<{ body: { negoces: { id: string; departement: string; agences: string[]; stop: boolean }[] } }>);
// Nouveau cap (22 octobre) : le mail d'information au négoce ajouté et les alertes de devis ont leurs propres tests
// (`cap-22-octobre.test.ts`) ; ici, on suit les messages du parcours d'origine.
const nouveauCap = (m: { subject: string }) => /^(Un regroupement d|Nouveau meilleur prix|Nouveau devis)/.test(m.subject);
const mailsVers = (email: string) => ctx.emails.sent.filter((m) => m.to === email && !nouveauCap(m));
const CARREAU = "Carreau de sol 60x60 grès cérame";
async function deposer(jeton: string, rows: FixtureRow[], titre: string) {
  const devis = Buffer.from(await makePdf(["devis"], rows, "Total HT 1 000,00   TVA 20 % 200,00   Total TTC 1 200,00", titre));
  // Décision de Greg (22 octobre) : la livraison est obligatoire (son dépôt, gratuite jusqu'à X km, Y € au-delà) ; ici
  // franco partout, pour suivre le parcours d'origine.
  return request(ctx.app.getHttpServer()).post(`/v1/reponse/${jeton}`).field("accord", "oui").field("depart", "ZA de Kerfolic, 22500 Paimpol").field("francoKm", "500").field("prixAuDela", "0").attach("file", devis, { filename: "devis.pdf", contentType: "application/pdf" });
}
const jetonDe = (texte: string) => /\/reponse\/([A-Za-z0-9_-]+)/.exec(texte)![1]!;

describe("groupé, multi-agences : un e-mail, une agence par département", { timeout: 120_000 }, () => {
  it("deux agences, deux lots, deux demandes au même e-mail, un négoce retenu par département ; « stop » vaut pour toutes, « pas concerné » pour une", async () => {
    // Côtes-d'Armor : A et B ; Finistère : C et D. Le même négoce (même e-mail) ajouté dans les deux départements.
    const a = await carreleur("a@example.fr", "Carrelages A", "3 rue des Ajoncs, 22300 Lannion");
    const b = await carreleur("b@example.fr", "Carrelages B", "12 rue de Kerampont, 22300 Lannion");
    const c = await carreleur("c@example.fr", "Carrelages C", "5 rue de Siam, 29200 Brest");
    const d = await carreleur("d@example.fr", "Carrelages D", "8 rue Jean Jaurès, 29200 Brest");
    const liste22 = (await negoce(a.agent, "Point d'épreuve Lannion", "pointp@example.com", ["second_oeuvre"])).body.negoces;
    const liste29 = (await negoce(c.agent, "Point d'épreuve Brest", "pointp@example.com", ["second_oeuvre"])).body.negoces;
    expect(liste22[0]).toMatchObject({ departement: "22", agences: [] });
    expect(liste29[0]).toMatchObject({ departement: "29", agences: ["22"] });
    expect((await a.agent.get("/v1/groupe/negoces").expect(200)).body.negoces[0].agences).toEqual(["29"]);
    expect(await ctx.prisma.negoce.count({ where: { email: "pointp@example.com" } })).toBe(2);

    // Deux lots (un par département), chacun part à son agence : deux e-mails au même négoce, deux liens.
    await proposer(a);
    await proposer(b);
    await proposer(c);
    await proposer(d);
    const demandes = mailsVers("pointp@example.com");
    expect(demandes).toHaveLength(2);
    expect(demandes.map((m) => /\((\d\d)\)$/.exec(m.subject)![1]).sort()).toEqual(["22", "29"]);
    const [pour22, pour29] = [demandes.find((m) => m.subject.endsWith("(22)"))!, demandes.find((m) => m.subject.endsWith("(29)"))!];
    expect(jetonDe(pour22.text)).not.toBe(jetonDe(pour29.text));
    const lots = await ctx.prisma.lotGroupe.findMany({ orderBy: { zone: "asc" } });
    expect(lots.map((l) => [l.zone, l.statut])).toEqual([
      ["22", "envoye"],
      ["29", "envoye"],
    ]);

    // Chaque agence répond par son lien ; chaque lot retient son agence : un négoce retenu par lot, donc par département.
    expect((await deposer(jetonDe(pour22.text), [["CAR", CARREAU, "46 u", "18,50", "851,00"]], "DEVIS Lannion – Délai de livraison 8 jours")).status).toBe(201);
    expect((await deposer(jetonDe(pour29.text), [["CAR", CARREAU, "46 u", "17,90", "823,40"]], "DEVIS Brest – Délai de livraison 6 jours")).status).toBe(201);
    await ctx.app.get(ChoixService).choisirLesLotsEnvoyes();
    const choisis = await ctx.prisma.lotGroupe.findMany({ orderBy: { zone: "asc" }, include: { negoceRetenu: true } });
    expect(choisis.map((l) => [l.zone, l.statut, l.negoceRetenu!.departement, Number(l.prixRetenu)])).toEqual([
      ["22", "choisi", "22", 18.5],
      ["29", "choisi", "29", 17.9],
    ]);

    // « Pas concerné » sur l'agence de Brest : elle seule perd la famille.
    const anon = request(ctx.app.getHttpServer());
    await anon.post("/v1/negoces/lien").send({ jeton: jetonDeLien(SECRET, { action: "pas_concerne", negoceId: liste29[0]!.id, famille: "second_oeuvre" }) }).expect(200);
    expect((await ctx.prisma.negoce.findUniqueOrThrow({ where: { id: liste29[0]!.id } })).familles).toEqual([]);
    expect((await ctx.prisma.negoce.findUniqueOrThrow({ where: { id: liste22[0]!.id } })).familles).toEqual(["second_oeuvre"]);
    // « Stop » depuis le lien de Lannion : plus rien pour cet e-mail, dans aucun département.
    await anon.post("/v1/negoces/lien").send({ jeton: jetonDeLien(SECRET, { action: "stop", negoceId: liste22[0]!.id }) }).expect(200);
    expect((await ctx.prisma.negoce.findMany({ where: { email: "pointp@example.com" } })).every((n) => n.stopLe !== null)).toBe(true);
    expect((await c.agent.get("/v1/groupe/negoces").expect(200)).body.negoces[0].stop).toBe(true);
    // Une troisième agence ajoutée après le « stop » naît arrêtée.
    const liste56 = (await negoce((await carreleur("e@example.fr", "Carrelages E", "2 rue Thiers, 56000 Vannes")).agent, "Point d'épreuve Vannes", "pointp@example.com", ["second_oeuvre"])).body.negoces;
    expect(liste56[0]).toMatchObject({ departement: "56", agences: ["22", "29"], stop: true });
  });
});
