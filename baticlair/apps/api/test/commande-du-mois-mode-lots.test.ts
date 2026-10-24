import { afterAll, beforeAll, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * Revue à froid (23 octobre 2026) : en mode « lots » (`COMMANDE_COMMUNE=lots`, l'ancien regroupement), la commande du
 * mois n'existe pas : ses routes d'écriture répondent 404, comme un drapeau éteint, jamais un dépôt à moitié branché.
 */
let ctx: TestContext;
const avant = { groupe: process.env.GROUPE, mode: process.env.COMMANDE_COMMUNE };
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.COMMANDE_COMMUNE = "lots";
  ctx = await createTestApp();
  await resetDatabase(ctx.prisma);
});
afterAll(async () => {
  await ctx.app.close();
  for (const [cle, v] of [["GROUPE", avant.groupe], ["COMMANDE_COMMUNE", avant.mode]] as const) {
    if (v === undefined) delete process.env[cle];
    else process.env[cle] = v;
  }
});

it("en mode lots, déposer ou commander dans la commande du mois répond 404", async () => {
  const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures A", ["roofing"]);
  const id = "00000000-0000-4000-8000-000000000000";
  await agent.post(`/v1/projects/${id}/commande-du-mois`).send({ articles: ["x"], nature: "stock" }).expect(404);
  await agent.post(`/v1/commande-du-mois/${id}/commander`).send({ negoceId: id }).expect(404);
  await agent.delete(`/v1/commande-du-mois/lignes/${id}`).expect(404);
  // La lecture dit le mode, pour que l'écran sache quoi montrer.
  expect((await agent.get("/v1/commande-du-mois").expect(200)).body.mode).toBe("lots");
});
