import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ARDOISE, LITEAU, couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * NÉGOCES PAR ENVOI (Greg, 11 novembre 2026 : « Jusqu'à 5 négoces par envoi pour toutes les formules, y compris la
 * formule Découverte gratuite »). Ce test établit ce que fait le code dans le mode en ligne (`automatique`) : un compte
 * sans abonnement envoie sa demande à cinq négoces, le sixième est refusé.
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
    expect(six.status).toBeGreaterThanOrEqual(400);
    expect(six.body.error.details).toMatchObject({ refus: "negoces" });
    expect(ctx.emails.sent.filter((m) => m.to.endsWith("@negoce.fr"))).toHaveLength(0);
    await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, negoces: negoces(5) }).expect(201);
    for (let i = 1; i <= 5; i++) expect(mailsVers(ctx, `n${i}@negoce.fr`).length).toBeGreaterThan(0);
  });
});
