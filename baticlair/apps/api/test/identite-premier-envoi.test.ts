import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * L'IDENTITÉ AU PREMIER ENVOI (Greg, lot final, point 1) : SIRET, prénom, portable sur un seul écran ; le prénom vient
 * prérempli du compte ; un fixe ou un SIRET mal formé est refusé ; une fois enregistrée, l'identité est complète.
 */
let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

describe("l'identité de l'artisan", () => {
  it("préremplit, refuse ce qui ne va pas, puis enregistre une fois pour toutes", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "jean@toitures.fr", "Toitures Martin");
    const avant = (await agent.get("/v1/company/identite").expect(200)).body;
    expect(avant).toMatchObject({ complete: false, phrase: "Ton négoce reçoit la demande au nom de ton entreprise, il doit te reconnaître." });
    expect(typeof avant.prenom).toBe("string");
    await agent.put("/v1/company/identite").send({ siret: "73282932000074", prenom: "Jean", telephone: "02 96 00 00 00" }).expect(400);
    await agent.put("/v1/company/identite").send({ siret: "1234", prenom: "Jean", telephone: "06 12 34 56 78" }).expect(400);
    const apercu = (await agent.get("/v1/company/identite/annuaire?siret=73282932000074").expect(200)).body;
    expect(apercu).toMatchObject({ trouvee: true, active: true });
    const apres = (await agent.put("/v1/company/identite").send({ siret: "732 829 320 00074", prenom: "Jean", telephone: "+33612345678" }).expect(200)).body;
    expect(apres).toMatchObject({ complete: true, siret: "73282932000074", prenom: "Jean", telephone: "06 12 34 56 78" });
    expect((await agent.get("/v1/company/identite").expect(200)).body.complete).toBe(true);
  });
});
