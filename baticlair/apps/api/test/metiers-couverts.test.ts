import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * §52 (mission du fondateur, 2026-10-19) : « un écran Métiers couverts dans Compte avec l'état de chaque métier
 * (brouillon / en validation / relu) ». La couverture et l'étanchéité sont relues, l'électricité en validation.
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

describe("GET /v1/metiers", () => {
  it("chaque métier avec son état (sans session : refusé, test isolation-toutes-routes)", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures A", ["roofing"]);
    const body = (await agent.get("/v1/metiers").expect(200)).body as { metiers: { metier: string; etat: string; source: string }[] };
    const etat = (m: string) => body.metiers.find((x) => x.metier === m)?.etat;
    expect(etat("roofing")).toBe("relu");
    expect(etat("waterproofing")).toBe("relu");
    expect(etat("electrical")).toBe("en validation");
    expect(body.metiers.some((m) => m.metier === "general")).toBe(false);
  });
});
