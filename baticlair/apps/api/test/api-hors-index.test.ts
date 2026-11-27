import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./support/test-app.js";

// Référencement (Greg, 27 novembre 2026) : api-test.mobiiz.fr et toute API restent hors de Google et des moteurs IA.
describe("l'API n'est jamais indexée", () => {
  let ctx: TestContext;
  beforeAll(async () => { ctx = await createTestApp(); });
  afterAll(async () => { await ctx.app.close(); });

  it("chaque réponse dit noindex, connue ou non, avec ou sans session", async () => {
    for (const chemin of ["/v1/health", "/version", "/", "/robots.txt", "/v1/projects"]) {
      const r = await request(ctx.app.getHttpServer()).get(chemin);
      expect(r.headers["x-robots-tag"], chemin).toBe("noindex, nofollow");
    }
  });
});
