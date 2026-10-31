import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * BATICLAIR GROUPÉ, ÉTAPE 4 : LE REGROUPEMENT (document du fondateur, 2026-10-19, section 2 étape 4, section 5), par
 * l'API. Deux carreleurs de Lannion proposent le même carreau : un lot par (référence, zone, fenêtre compatible), un seul
 * ouvert à la fois ; dès que deux artisans sont SIGNÉS (seuil du fichier), le lot se forme sans attendre le lundi ; un
 * besoin en attente ne forme rien ; la tâche planifiée forme les lots ouverts un lundi sur deux ; la quantité d'un
 * besoin est plafonnée à 3 × la médiane sur 90 jours.
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
});

type Besoin = { id: string; articleKey: string; statut: string; lotParti: boolean };
const FENETRE = { tot: "2026-11-02", tard: "2026-11-20" };

async function carreleur(email: string, adresse = "3 rue des Ajoncs, 22300 Lannion") {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, `Carrelages ${email}`, ["tiling"]);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: "73282932000074", siretVerifieLe: new Date() } });
  let q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Carrelage sol grès cérame 60x60 rectifié, pose droite", quantite: "30", unite: "m²" }] }).expect(201)).body as { id: string; projetId: string; questions: { id: string }[] };
  const ok = q.questions.filter((x) => x.id.startsWith("ratio:")).map((x) => ({ question: x.id, valeur: "ok" }));
  if (ok.length > 0) q = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: ok }).expect(201)).body;
  await agent.patch(`/v1/projects/${q.projetId}`).send({ address: adresse }).expect(200);
  const toBuy = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string; label: string }[];
  const carreaux = toBuy.find((b) => /^Carreau de sol 60×60/.test(b.label))!;
  return { agent, companyId, projectId: q.projetId, carreaux };
}
const proposer = (agent: Agent, projectId: string, article: string, statut: "signe" | "en_attente", fenetre = FENETRE) =>
  agent.post(`/v1/projects/${projectId}/groupe`).send({ articles: [article], fenetre, statut, engagement: true });
const lots = () => ctx.prisma.lotGroupe.findMany({ orderBy: { createdAt: "asc" }, include: { besoins: { select: { id: true, statut: true } }, journal: { orderBy: { createdAt: "asc" } } } });

describe("groupé, étape 4 : le regroupement", { timeout: 30_000 }, () => {
  it("un besoin ouvre son lot ; le deuxième artisan signé rejoint le même lot, la fenêtre se resserre, et le seuil le forme", async () => {
    const a = await carreleur("a@example.fr");
    await proposer(a.agent, a.projectId, a.carreaux.key, "signe").expect(201);
    let l = await lots();
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ statut: "ouvert", zone: "22", famille: "second_oeuvre" });
    expect(l[0]!.journal.map((j) => j.evenement)).toEqual(["lot_ouvert"]);

    const b = await carreleur("b@example.fr", "8 rue du Port, 22500 Paimpol");
    const [besoinB] = (await proposer(b.agent, b.projectId, b.carreaux.key, "signe", { tot: "2026-11-10", tard: "2026-11-30" }).expect(201)).body.besoins as Besoin[];
    l = await lots();
    expect(l).toHaveLength(1);
    expect(l[0]!.besoins).toHaveLength(2);
    expect(l[0]!.fenetreTot.toISOString().slice(0, 10)).toBe("2026-11-10");
    expect(l[0]!.fenetreTard.toISOString().slice(0, 10)).toBe("2026-11-20");
    // Deux artisans signés : le seuil est atteint, le lot est formé (journal : rattaché, puis formé par le seuil).
    expect(l[0]!.statut).toBe("forme");
    expect(l[0]!.journal.map((j) => [j.evenement, (j.details as { par?: string }).par ?? null])).toEqual([
      ["lot_ouvert", null],
      ["besoin_rattache", null],
      ["lot_forme", "seuil"],
    ]);
    // Section 4 a : formé mais pas parti, le besoin se retire encore ; le lot reste formé avec un seul besoin.
    expect(besoinB!.lotParti).toBe(false);
    await b.agent.delete(`/v1/groupe/besoins/${besoinB!.id}`).expect(200);
    expect((await lots())[0]!.besoins).toHaveLength(1);
  });

  it("un besoin en attente rejoint le lot comme volume probable mais ne le forme pas ; passé signé, il le forme", async () => {
    const a = await carreleur("a@example.fr");
    await proposer(a.agent, a.projectId, a.carreaux.key, "signe").expect(201);
    const b = await carreleur("b@example.fr");
    const [besoinB] = (await proposer(b.agent, b.projectId, b.carreaux.key, "en_attente").expect(201)).body.besoins as Besoin[];
    let l = await lots();
    expect(l[0]!.besoins.map((x) => x.statut).sort()).toEqual(["en_attente", "signe"]);
    expect(l[0]!.statut).toBe("ouvert");
    await b.agent.post(`/v1/groupe/besoins/${besoinB!.id}/signer`).send({ engagement: true }).expect(200);
    l = await lots();
    expect(l[0]!.statut).toBe("forme");
  });

  it("une autre zone ou une fenêtre incompatible : un autre lot, ou l'attente du lot suivant (un seul ouvert par référence et zone)", async () => {
    const a = await carreleur("a@example.fr");
    await proposer(a.agent, a.projectId, a.carreaux.key, "signe").expect(201);
    const brest = await carreleur("c@example.fr", "1 rue de Siam, 29200 Brest");
    await proposer(brest.agent, brest.projectId, brest.carreaux.key, "signe").expect(201);
    const tard = await carreleur("d@example.fr");
    const [besoinTard] = (await proposer(tard.agent, tard.projectId, tard.carreaux.key, "signe", { tot: "2026-12-01", tard: "2026-12-20" }).expect(201)).body.besoins as Besoin[];
    const l = await lots();
    expect(l.map((x) => [x.zone, x.besoins.length])).toEqual([
      ["22", 1],
      ["29", 1],
    ]);
    expect((await ctx.prisma.besoin.findUniqueOrThrow({ where: { id: besoinTard!.id } })).lotId).toBeNull();
  });

  it("la tâche planifiée : secret obligatoire ; un lundi de formation forme les lots ouverts qui ont un besoin signé", async () => {
    const a = await carreleur("a@example.fr");
    await proposer(a.agent, a.projectId, a.carreaux.key, "signe").expect(201);
    const e = await carreleur("e@example.fr", "1 rue de Siam, 29200 Brest");
    await proposer(e.agent, e.projectId, e.carreaux.key, "en_attente").expect(201);
    const anon = request(ctx.app.getHttpServer());
    expect((await anon.get("/v1/internal/groupe/regrouper")).status).toBe(403);
    expect((await anon.get("/v1/internal/groupe/regrouper").set("authorization", "Bearer faux")).status).toBe(403);
    const res = await anon.get("/v1/internal/groupe/regrouper").set("authorization", "Bearer secret-de-la-tache").expect(200);
    expect(res.body).toMatchObject({ lotsCrees: 0, besoinsRattaches: 0 });
    const l = await lots();
    if (res.body.lundiDeFormation) {
      // Le lot de Lannion (un besoin signé) est formé par le lundi ; celui de Brest (en attente seul) reste ouvert.
      expect(l.map((x) => [x.zone, x.statut])).toEqual([
        ["22", "forme"],
        ["29", "ouvert"],
      ]);
      expect(l[0]!.journal.at(-1)!.details).toEqual({ par: "lundi" });
    } else {
      expect(l.map((x) => x.statut)).toEqual(["ouvert", "ouvert"]);
    }
  });

  it("section 5 : au-delà de 3 × la médiane des autres besoins de la même référence (90 jours), le besoin est refusé", async () => {
    const a = await carreleur("a@example.fr");
    const b = await carreleur("b@example.fr");
    const c = await carreleur("c@example.fr");
    for (const x of [a, b, c]) await proposer(x.agent, x.projectId, x.carreaux.key, "en_attente").expect(201);
    // Trois besoins de 23 cartons : la médiane est 23, le plafond 69. Un besoin de 30 m² en fait 23 : il passe ; une liste
    // dix fois plus grande (230 cartons) ne passe pas.
    const gros = await signUpWithCompany(ctx.app, "gros@example.fr", "Gros carreleur", ["tiling"]);
    await ctx.prisma.company.update({ where: { id: gros.companyId }, data: { siret: "73282932000074", siretVerifieLe: new Date() } });
    let q = (await gros.agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Carrelage sol grès cérame 60x60 rectifié, pose droite", quantite: "300", unite: "m²" }] }).expect(201)).body as { id: string; projetId: string; questions: { id: string }[] };
    const ok = q.questions.filter((x) => x.id.startsWith("ratio:")).map((x) => ({ question: x.id, valeur: "ok" }));
    if (ok.length > 0) q = (await gros.agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: ok }).expect(201)).body;
    await gros.agent.patch(`/v1/projects/${q.projetId}`).send({ address: "3 rue des Ajoncs, 22300 Lannion" }).expect(200);
    const toBuy = (await gros.agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string; label: string }[];
    const carreaux = toBuy.find((x) => /^Carreau de sol 60×60/.test(x.label))!;
    const res = await proposer(gros.agent, q.projetId, carreaux.key, "signe");
    expect(res.status).toBe(400);
    expect(res.body.error.details).toMatchObject({ reason: "quantite_plafonnee", plafond: 69 });
  });
});
