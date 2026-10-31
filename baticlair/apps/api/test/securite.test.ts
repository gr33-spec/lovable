import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { jetonDeLien, lienDuJeton } from "../src/modules/groupe/index.js";
import { createTestApp, type TestContext } from "./support/test-app.js";

/**
 * AUDIT SÉCURITÉ (plan du 20 octobre 2026, bloc 8) : une origine inconnue n'obtient rien (ni en prévisualisation, où
 * seules les adresses `*-gr33-spec.vercel.app` passent), les tâches internes ferment sans secret, un lien d'e-mail expire.
 */
const SECRET = "test-secret-test-secret-test-secret-0000";

describe("sécurité : origines, tâches internes, liens", { timeout: 30_000 }, () => {
  describe("hors prévisualisation", () => {
    let ctx: TestContext;
    beforeAll(async () => {
      ctx = await createTestApp();
    });
    afterAll(async () => {
      await ctx.app.close();
    });

    it("une origine inconnue n'a pas d'autorisation CORS, l'origine du site en a une", async () => {
      const anon = request(ctx.app.getHttpServer());
      const inconnue = await anon.get("/v1/health").set("Origin", "https://pirate.example");
      expect(inconnue.status).toBe(200);
      expect(inconnue.headers["access-control-allow-origin"]).toBeUndefined();
      expect(inconnue.body.origine).toMatchObject({ demande: "https://pirate.example", acceptee: false });
      const connue = await anon.get("/v1/health").set("Origin", "http://localhost:3000");
      expect(connue.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
      expect(connue.body.origine.acceptee).toBe(true);
    });

    it("les tâches internes ferment sans le secret, et avec un mauvais secret", async () => {
      const anon = request(ctx.app.getHttpServer());
      for (const route of ["/v1/internal/purge-inactive", "/v1/internal/groupe/regrouper", "/v1/internal/groupe/sirene"]) {
        const sans = await anon.get(route);
        expect([403, 404], route).toContain(sans.status);
        const faux = await anon.get(route).set("authorization", "Bearer pas-le-bon");
        expect([403, 404], route).toContain(faux.status);
      }
    });

    it("les en-têtes de sécurité (helmet) sont posés", async () => {
      const res = await request(ctx.app.getHttpServer()).get("/v1/health");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBeDefined();
      expect(res.headers["x-powered-by"]).toBeUndefined();
    });
  });

  describe("en prévisualisation Vercel", () => {
    const avant = { VERCEL_ENV: process.env.VERCEL_ENV };
    let ctx: TestContext;
    beforeAll(async () => {
      process.env.VERCEL_ENV = "preview";
      ctx = await createTestApp();
    });
    afterAll(async () => {
      await ctx.app.close();
      if (avant.VERCEL_ENV === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = avant.VERCEL_ENV;
    });

    it("seules les adresses de prévisualisation du compte passent", async () => {
      const anon = request(ctx.app.getHttpServer());
      const ok = await anon.get("/v1/health").set("Origin", "https://baticlair-git-claude-xyz-gr33-spec.vercel.app");
      expect(ok.headers["access-control-allow-origin"]).toBe("https://baticlair-git-claude-xyz-gr33-spec.vercel.app");
      const autreCompte = await anon.get("/v1/health").set("Origin", "https://baticlair-git-claude-xyz-autre.vercel.app");
      expect(autreCompte.headers["access-control-allow-origin"]).toBeUndefined();
      expect(autreCompte.body.origine.acceptee).toBe(false);
      const pirate = await anon.get("/v1/health").set("Origin", "https://gr33-spec.vercel.app.pirate.example");
      expect(pirate.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });

  it("un lien d'e-mail signé expire au bout de six mois, et un lien sans date ne vaut rien", () => {
    const n = "01a15a72-4cc8-70b8-946d-9cd06bbc298d";
    const jeton = jetonDeLien(SECRET, { action: "stop", negoceId: n }, new Date("2026-10-20T10:00:00Z"));
    expect(lienDuJeton(SECRET, jeton, new Date("2026-10-20T10:00:00Z"))).toEqual({ action: "stop", negoceId: n });
    expect(lienDuJeton(SECRET, jeton, new Date("2027-04-17T10:00:00Z"))).toEqual({ action: "stop", negoceId: n });
    expect(lienDuJeton(SECRET, jeton, new Date("2027-04-19T10:00:00Z"))).toBeNull();
    // Un corps sans « e », signé avec le bon secret : refusé quand même.
    const corps = Buffer.from(JSON.stringify({ a: "stop", n })).toString("base64url");
    const ancien = `${corps}.${createHmac("sha256", SECRET).update(`lien-negoce:${corps}`).digest("base64url")}`;
    expect(lienDuJeton(SECRET, ancien)).toBeNull();
    // Falsifié : refusé.
    expect(lienDuJeton("autre-secret", jeton)).toBeNull();
  });
});
