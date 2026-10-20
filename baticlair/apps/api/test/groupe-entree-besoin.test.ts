import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SIRET_VERIFIER, type SiretVerifier } from "../src/modules/groupe/index.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * BATICLAIR GROUPÉ, ÉTAPE 2 : L'ENTRÉE DU BESOIN (document du fondateur, 2026-10-19, section 2 étape 2, sections 4 et 5).
 * Depuis la liste d'achats d'un devis lu par l'app, une ligne PRÊTE part au groupé avec une fenêtre de livraison et un
 * seul choix : « Chantier signé » (avec la phrase d'engagement) ou « Devis en attente ». Un besoin en attente bascule
 * signé d'un tap ; un besoin se retire tant que son lot n'est pas parti. Fermé sans SIRET vérifié ni abonnement actif.
 */
let ctx: TestContext;
const siretsVerifies: string[] = [];
const faux: SiretVerifier = {
  async verifier(siret) {
    siretsVerifies.push(siret);
    return siret === "73282932000074" ? { statut: "actif" } : { statut: "inconnu" };
  },
};
const avant = process.env.GROUPE;
beforeAll(async () => {
  process.env.GROUPE = "on";
  ctx = await createTestApp((b) => b.overrideProvider(SIRET_VERIFIER).useValue(faux));
});
afterAll(async () => {
  await ctx.app.close();
  if (avant === undefined) delete process.env.GROUPE;
  else process.env.GROUPE = avant;
});
beforeEach(async () => {
  siretsVerifies.length = 0;
  await resetDatabase(ctx.prisma);
});

type Besoin = { id: string; articleKey: string; designation: string; quantite: string; unite: string; statut: string; fenetre: { tot: string; tard: string }; lotParti: boolean };
const FENETRE = { tot: "2026-11-02", tard: "2026-11-20" };

/** Un carreleur de Lannion, SIRET vérifié et abonnement actif, avec la liste d'un devis lu (toutes lignes vertes). */
async function carreleur(email: string, options: { ouvert?: boolean; confirmer?: boolean } = {}) {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, "Carrelages d'épreuve", ["tiling"]);
  if (options.ouvert !== false) await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: "73282932000074", siretVerifieLe: new Date(), plan: "solo", planActivatedAt: new Date() } });
  let q = (
    await agent
      .post("/v1/quantitatifs")
      .send({ lignes: [{ libelle: "Carrelage sol grès cérame 60x60 rectifié, pose droite", quantite: "30", unite: "m²" }, { libelle: "Faïence murale 30x60", quantite: "15", unite: "m²" }] })
      .expect(201)
  ).body as { id: string; projetId: string; questions: { id: string }[]; lignes: { id: string; a_confirmer: boolean }[] };
  if (options.confirmer !== false) {
    const ok = q.questions.filter((x) => x.id.startsWith("ratio:")).map((x) => ({ question: x.id, valeur: "ok" }));
    if (ok.length > 0) q = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: ok }).expect(201)).body;
  }
  await agent.patch(`/v1/projects/${q.projetId}`).send({ address: "3 rue des Ajoncs, 22300 Lannion" }).expect(200);
  const toBuy = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string; label: string; state: string }[];
  return { agent, companyId, projectId: q.projetId, toBuy, oranges: q.lignes.filter((l) => l.a_confirmer).map((l) => l.id) };
}

const proposer = (agent: Agent, projectId: string, body: object) => agent.post(`/v1/projects/${projectId}/groupe`).send(body);

describe("groupé, étape 2 : l'entrée du besoin", () => {
  it("fermé sans SIRET vérifié ni abonnement actif : l'état dit pourquoi, et rien ne se propose", async () => {
    const { agent, projectId, toBuy } = await carreleur("ferme@example.fr", { ouvert: false });
    expect((await agent.get("/v1/groupe").expect(200)).body).toMatchObject({ eligible: false, raisons: ["siret_non_verifie", "abonnement_inactif"] });
    const res = await proposer(agent, projectId, { articles: [toBuy[0]!.key], fenetre: FENETRE, statut: "en_attente" });
    expect(res.status).toBe(403);
    expect(res.body.error.details).toMatchObject({ reason: "groupe_ferme" });
  });

  it("le SIRET se vérifie auprès de l'INSEE : mal formé, refusé sans appel ; actif, il ouvre (avec l'abonnement)", async () => {
    const { agent, companyId } = await carreleur("siret@example.fr", { ouvert: false });
    await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: "12345678901234", plan: "solo", planActivatedAt: new Date() } });
    expect((await agent.post("/v1/groupe/siret").expect(400)).body.error.details).toMatchObject({ reason: "siret_invalide" });
    expect(siretsVerifies).toEqual([]);
    await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: "732 829 320 00074" } });
    expect((await agent.post("/v1/groupe/siret").expect(200)).body).toEqual({ verifie: true, statut: "actif" });
    expect((await agent.get("/v1/groupe").expect(200)).body).toMatchObject({ eligible: true, raisons: [] });
  });

  it("« Chantier signé » demande la phrase d'engagement ; signé, le besoin garde la quantité de la ligne, sans nom d'artisan", async () => {
    const { agent, projectId, toBuy } = await carreleur("signe@example.fr");
    const carreaux = toBuy.find((b) => /^Carreau de sol 60×60/.test(b.label))!;
    expect(carreaux.state).toBe("ready");
    const sans = await proposer(agent, projectId, { articles: [carreaux.key], fenetre: FENETRE, statut: "signe" });
    expect(sans.status).toBe(400);
    expect(sans.body.error.details).toMatchObject({ reason: "engagement_requis" });
    const besoins = (await proposer(agent, projectId, { articles: [carreaux.key], fenetre: FENETRE, statut: "signe", engagement: true }).expect(201)).body.besoins as Besoin[];
    expect(besoins).toEqual([{ id: expect.any(String), articleKey: carreaux.key, designation: carreaux.label, quantite: "23", unite: "cartons de 1,44 m²", statut: "signe", fenetre: FENETRE, lotParti: false }]);
    const row = await ctx.prisma.besoin.findFirstOrThrow();
    expect(row).toMatchObject({ famille: "second_oeuvre", zone: "22", adresseLivraison: "3 rue des Ajoncs, 22300 Lannion", cle: "lib:carreau de sol 60x60|" + "|" });
    // Une même ligne ne part pas deux fois.
    expect((await proposer(agent, projectId, { articles: [carreaux.key], fenetre: FENETRE, statut: "en_attente" })).status).toBe(409);
  });

  it("« Devis en attente » : il bascule signé d'un tap (avec l'engagement), se retire, et se repropose ensuite", async () => {
    const { agent, projectId, toBuy } = await carreleur("attente@example.fr");
    const [b] = (await proposer(agent, projectId, { articles: [toBuy[0]!.key], fenetre: FENETRE, statut: "en_attente" }).expect(201)).body.besoins as Besoin[];
    expect(b!.statut).toBe("en_attente");
    expect((await agent.post(`/v1/groupe/besoins/${b!.id}/signer`).send({ engagement: false })).status).toBe(400);
    expect((await agent.post(`/v1/groupe/besoins/${b!.id}/signer`).send({ engagement: true }).expect(200)).body.statut).toBe("signe");
    expect((await agent.delete(`/v1/groupe/besoins/${b!.id}`).expect(200)).body.statut).toBe("retire");
    expect((await agent.get(`/v1/projects/${projectId}/groupe`).expect(200)).body.besoins).toEqual([]);
    const again = (await proposer(agent, projectId, { articles: [toBuy[0]!.key], fenetre: FENETRE, statut: "en_attente" }).expect(201)).body.besoins as Besoin[];
    expect(again.map((x) => x.id)).toEqual([b!.id]);
  });

  it("section 4 b : le lot parti, un besoin signé ne se retire plus", async () => {
    const { agent, projectId, toBuy } = await carreleur("parti@example.fr");
    const [b] = (await proposer(agent, projectId, { articles: [toBuy[0]!.key], fenetre: FENETRE, statut: "signe", engagement: true }).expect(201)).body.besoins as Besoin[];
    const row = await ctx.prisma.besoin.findUniqueOrThrow({ where: { id: b!.id } });
    const lot = await ctx.prisma.lotGroupe.create({ data: { cle: row.cle, famille: row.famille, zone: row.zone, fenetreTot: row.fenetreTot, fenetreTard: row.fenetreTard, statut: "envoye", envoyeLe: new Date() } });
    await ctx.prisma.besoin.update({ where: { id: b!.id }, data: { lotId: lot.id, statut: "engage" } });
    const res = await agent.delete(`/v1/groupe/besoins/${b!.id}`);
    expect(res.status).toBe(409);
    expect((await agent.get(`/v1/projects/${projectId}/groupe`).expect(200)).body.besoins[0]).toMatchObject({ statut: "engage", lotParti: true });
  });

  it("section 5 : une ligne orange, une ligne inconnue, un chantier sans code postal ou une fenêtre à l'envers ne partent pas", async () => {
    const orange = await carreleur("orange@example.fr", { confirmer: false });
    expect(orange.oranges.length).toBeGreaterThan(0);
    expect((await proposer(orange.agent, orange.projectId, { articles: [orange.oranges[0]!], fenetre: FENETRE, statut: "en_attente" })).body.error.details).toMatchObject({ reason: "ligne_a_regler" });
    expect((await proposer(orange.agent, orange.projectId, { articles: ["saisie-libre"], fenetre: FENETRE, statut: "en_attente" })).body.error.details).toMatchObject({ reason: "ligne_inconnue" });
    expect((await proposer(orange.agent, orange.projectId, { articles: [orange.toBuy[0]!.key], fenetre: { tot: "2026-11-20", tard: "2026-11-02" }, statut: "en_attente" })).body.error.details).toMatchObject({ reason: "fenetre_invalide" });
    await orange.agent.patch(`/v1/projects/${orange.projectId}`).send({ address: "Lannion" }).expect(200);
    expect((await proposer(orange.agent, orange.projectId, { articles: [orange.toBuy[0]!.key], fenetre: FENETRE, statut: "en_attente" })).body.error.details).toMatchObject({ reason: "adresse_requise" });
  });

  it("isolation : une autre entreprise ne voit, ne signe ni ne retire les besoins d'une autre", async () => {
    const a = await carreleur("a@example.fr");
    const [b] = (await proposer(a.agent, a.projectId, { articles: [a.toBuy[0]!.key], fenetre: FENETRE, statut: "en_attente" }).expect(201)).body.besoins as Besoin[];
    const autre = await carreleur("b@example.fr");
    expect((await autre.agent.get(`/v1/projects/${a.projectId}/groupe`)).status).toBe(404);
    expect((await autre.agent.post(`/v1/groupe/besoins/${b!.id}/signer`).send({ engagement: true })).status).toBe(404);
    expect((await autre.agent.delete(`/v1/groupe/besoins/${b!.id}`)).status).toBe(404);
    expect((await proposer(autre.agent, a.projectId, { articles: [a.toBuy[0]!.key], fenetre: FENETRE, statut: "en_attente" })).status).toBe(404);
    expect((await ctx.prisma.besoin.findUniqueOrThrow({ where: { id: b!.id } })).statut).toBe("en_attente");
  });
});
