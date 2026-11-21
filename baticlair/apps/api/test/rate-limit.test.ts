import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AppConfig } from "../src/platform/config/config.js";
import { loadConfig } from "../src/platform/config/config.js";
import { CONFIG } from "../src/platform/tokens.js";
import { createTestApp, resetDatabase, signUp, WEB_ORIGIN, type TestContext } from "./support/test-app.js";

/**
 * Limitation de débit (audit de lancement, B2). Les autres tests tournent avec
 * RATE_LIMIT=off ; ici la configuration réelle est rétablie.
 */
describe("limitation de débit", () => {
  let ctx: TestContext;
  let app: INestApplication;

  beforeAll(async () => {
    const config: AppConfig = { ...loadConfig(), rateLimit: { enabled: true } };
    ctx = await createTestApp((b) => b.overrideProvider(CONFIG).useValue(config));
    app = ctx.app;
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });

  it("connexion : cinq essais par minute et par adresse, le sixième est refusé (429) sans révéler si le compte existe", async () => {
    await signUp(app, "lea@example.fr");
    const attempt = () =>
      request(app.getHttpServer()).post("/v1/auth/sign-in/email").set("origin", WEB_ORIGIN).send({ email: "lea@example.fr", password: "mauvais-mot-de-passe" });
    for (let i = 0; i < 5; i++) expect((await attempt()).status).toBe(401);
    const sixth = await attempt();
    expect(sixth.status).toBe(429);
    expect(sixth.headers["x-retry-after"]).toBeDefined();
    // Les compteurs sont en base : une autre instance de l'API verrait le même refus.
    expect(await ctx.prisma.rateLimit.count()).toBeGreaterThan(0);
  });

  it("création d'entreprise : cinq par heure et par adresse, puis 429 au format d'erreur de l'API", async () => {
    const agent = await signUp(app, "marc@example.fr");
    for (let i = 0; i < 5; i++) {
      const res = await agent.post("/v1/companies").send({ name: `Toitures ${i}`, trades: ["roofing"] });
      expect(res.status).toBe(201);
    }
    const sixth = await agent.post("/v1/companies").send({ name: "Toitures 6", trades: ["roofing"] });
    expect(sixth.status).toBe(429);
    expect(sixth.body.error).toMatchObject({ code: "too_many_requests", retryable: true, details: { retryAfterSeconds: expect.any(Number) } });
    const row = await ctx.prisma.apiRateLimit.findFirst();
    expect(row?.hits).toBe(6);
  });

  it("les lectures ne sont jamais comptées", async () => {
    const agent = await signUp(app, "nour@example.fr");
    for (let i = 0; i < 130; i++) expect((await agent.get("/v1/me")).status).toBe(200);
    expect(await ctx.prisma.apiRateLimit.count()).toBe(0);
  });
});
