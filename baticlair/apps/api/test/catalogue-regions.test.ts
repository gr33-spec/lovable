import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * RÉGION PAR RÉGION (Greg, 31 octobre 2026, soir ; référentiel §26.2) : la recherche du catalogue propose d'abord, à score
 * égal, les matériaux de la région de l'entreprise (code postal de son adresse) ; sans adresse, l'ordre ne change pas.
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

const premier = async (agent: Awaited<ReturnType<typeof signUpWithCompany>>["agent"], q: string) =>
  ((await agent.get(`/v1/catalogue?q=${encodeURIComponent(q)}`).expect(200)).body.resultats as { produit: string }[])[0]?.produit;

describe("le catalogue, région par région", () => {
  it("à Strasbourg, « tuile plate » propose d'abord la tuile écaille ; à Lannion, non", async () => {
    const alsace = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures d'Alsace");
    await alsace.agent.patch("/v1/company/profile").send({ name: "Toitures d'Alsace", address: "1 place Kléber, 67000 Strasbourg", siret: null, phone: null, email: null }).expect(200);
    expect(await premier(alsace.agent, "tuile plate")).toBe("Tuile plate écaille (queue de castor)");
    const bretagne = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures du Trégor");
    await bretagne.agent.patch("/v1/company/profile").send({ name: "Toitures du Trégor", address: "3 rue de la Gare, 22300 Lannion", siret: null, phone: null, email: null }).expect(200);
    expect(await premier(bretagne.agent, "tuile plate")).not.toBe("Tuile plate écaille (queue de castor)");
  });
});
