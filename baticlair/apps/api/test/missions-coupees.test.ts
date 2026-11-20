/**
 * RÉGLAGE COUPÉ (MISSIONS_V1=off, la valeur par défaut, donc la production) : chaque route des missions répond 404, rien
 * n'est écrit ; la boîte et la cloche restent là pour les réponses des négoces.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
const avant = process.env.MISSIONS_V1;
beforeAll(async () => {
  delete process.env.MISSIONS_V1;
  ctx = await createTestApp();
  await resetDatabase(ctx.prisma);
});
afterAll(async () => {
  await ctx.app.close();
  if (avant !== undefined) process.env.MISSIONS_V1 = avant;
});

describe("Missions coupées", () => {
  it("les routes répondent 404 ; la santé dit « missions : false » ; la boîte et la cloche répondent", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toitures Martin", ["roofing"]);
    expect((await agent.get("/v1/health").expect(200)).body.features.missions).toBe(false);
    for (const url of ["/v1/missions/etat", "/v1/missions/annonces", "/v1/missions/miennes", "/v1/missions/conversations", "/v1/dossier-pro", "/v1/profil-public"]) await agent.get(url).expect(404);
    await agent.post("/v1/missions/annonces").send({ type: "mission", metier: "Couverture", lieu: "Plouha", codePostal: "22580", debut: "2030-01-10", fin: "2030-01-12", types: ["renfort"], description: "Pose d'ardoises naturelles." }).expect(404);
    expect(await ctx.prisma.annonceMission.count()).toBe(0);
    expect((await agent.get("/v1/boite").expect(200)).body).toEqual({ items: [], missions: false });
    expect((await agent.get("/v1/alertes").expect(200)).body).toEqual({ nonLues: 0, items: [] });
  });
});
