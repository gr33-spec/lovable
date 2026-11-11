import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ARDOISE, LITEAU, couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * NÉGOCES PAR DEMANDE (Greg, 11 novembre 2026 : « Jusqu'à 5 négoces par demande, pour toutes les formules, Découverte
 * comprise, et dans tous les parcours »). Mode en ligne (`automatique`), compte sans abonnement : cinq négoces partent ;
 * le sixième est refusé d'une phrase neutre, sans paywall, dans la demande à ses négoces comme dans l'envoi classique
 * (qui acceptait vingt négoces) ; un négoce ajouté ensuite compte dans les cinq de la demande.
 */
let ctx: TestContext;
const avant = { MODE_REGROUPEMENT: process.env.MODE_REGROUPEMENT, ZONES_ACTIVES: process.env.ZONES_ACTIVES };
beforeAll(async () => {
  process.env.ZONES_ACTIVES = "22";
  process.env.MODE_REGROUPEMENT = "automatique";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
});

const negoces = (n: number) => Array.from({ length: n }, (_, i) => ({ nom: `Négoce ${i + 1}`, email: `n${i + 1}@negoce.fr` }));

describe("négoces par envoi, mode en ligne", () => {
  it("Découverte (gratuit) : cinq négoces par envoi, chacun reçoit la demande ; le sixième est refusé, rien ne part", async () => {
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [
      { libelle: ARDOISE, quantite: "1000", unite: "pièces" },
      { libelle: LITEAU, quantite: "100", unite: "m" },
    ]);
    const droits = (await a.agent.get("/v1/droits").expect(200)).body;
    expect(droits).toMatchObject({ formule: "gratuit", negocesParDemande: 5 });
    const six = await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, negoces: negoces(6) });
    expect(six.status).toBe(400);
    expect(six.body.error.code).toBe("validation_failed");
    expect(six.body.error.details).toMatchObject({ refus: "negoces", phrase: "Jusqu'à 5 négoces par demande." });
    expect(ctx.emails.sent.filter((m) => m.to.endsWith("@negoce.fr"))).toHaveLength(0);
    await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, negoces: negoces(5) }).expect(201);
    for (let i = 1; i <= 5; i++) expect(mailsVers(ctx, `n${i}@negoce.fr`).length).toBeGreaterThan(0);
  });

  it("envoi classique : cinq négoces au plus à la création ; un ajout compte dans les cinq ; la phrase est la même", async () => {
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "1000", unite: "pièces" }]);
    const ids: string[] = [];
    for (let i = 1; i <= 7; i++) ids.push((await a.agent.post("/v1/suppliers").send({ name: `Négoce ${i}`, email: `c${i}@negoce.fr` }).expect(201)).body.id);
    const six = await a.agent.post(`/v1/projects/${a.projectId}/price-requests`).send({ supplierIds: ids.slice(0, 6), articles: a.articles }).expect(400);
    expect(six.body.error.details).toMatchObject({ reason: "negoces", phrase: "Jusqu'à 5 négoces par demande.", max: 5 });
    expect((await a.agent.get(`/v1/projects/${a.projectId}/price-requests`).expect(200)).body.items).toHaveLength(0);
    const quatre = (await a.agent.post(`/v1/projects/${a.projectId}/price-requests`).send({ supplierIds: ids.slice(0, 4), articles: a.articles }).expect(201)).body;
    expect(quatre.recipients).toHaveLength(4);
    // Quatre déjà : deux de plus feraient six.
    const trop = await a.agent.post(`/v1/price-requests/${quatre.id}/recipients`).send({ supplierIds: ids.slice(4, 6) }).expect(400);
    expect(trop.body.error.details).toMatchObject({ reason: "negoces", phrase: "Jusqu'à 5 négoces par demande." });
    const cinq = (await a.agent.post(`/v1/price-requests/${quatre.id}/recipients`).send({ supplierIds: [ids[4]] }).expect(200)).body;
    expect(cinq.recipients).toHaveLength(5);
    await a.agent.post(`/v1/price-requests/${quatre.id}/recipients`).send({ supplierIds: [ids[6]] }).expect(400);
    // Un négoce déjà dans la demande ne compte pas deux fois.
    expect((await a.agent.post(`/v1/price-requests/${quatre.id}/recipients`).send({ supplierIds: [ids[0]] }).expect(200)).body.recipients).toHaveLength(5);
  });
});
