import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LE GUIDE DU PREMIER LANCEMENT (Greg, 24 octobre 2026) : à montrer une fois par compte ; vu ou passé, il ne revient plus,
 * sur aucun appareil. Chaque entreprise a le sien.
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

describe("guide du premier lancement", () => {
  it("à montrer au nouveau compte, puis plus jamais une fois vu ; propre à chaque compte", async () => {
    const { agent: a } = await signUpWithCompany(ctx.app, "guide-a@example.fr", "Toitures A");
    const { agent: b } = await signUpWithCompany(ctx.app, "guide-b@example.fr", "Toitures B");
    expect((await a.get("/v1/me/guide").expect(200)).body).toEqual({ aMontrer: true });
    expect((await a.post("/v1/me/guide/vu").expect(200)).body).toEqual({ aMontrer: false });
    expect((await a.get("/v1/me/guide").expect(200)).body).toEqual({ aMontrer: false });
    // Vu deux fois : la première date reste.
    const premiere = (await ctx.prisma.user.findUniqueOrThrow({ where: { email: "guide-a@example.fr" } })).guideVuLe;
    await a.post("/v1/me/guide/vu").expect(200);
    expect((await ctx.prisma.user.findUniqueOrThrow({ where: { email: "guide-a@example.fr" } })).guideVuLe).toEqual(premiere);
    expect((await b.get("/v1/me/guide").expect(200)).body).toEqual({ aMontrer: true });
  });
});
