import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestApp, resetDatabase, WEB_ORIGIN, type TestContext } from "./support/test-app.js";

/**
 * TURNSTILE (Greg, 26 octobre 2026, feu vert sécurité) : clé secrète posée, l'inscription, le mot de passe oublié et les
 * pages négoce (inscription, lien de connexion) demandent le jeton du défi, vérifié chez Cloudflare. Sans clé : rien.
 */
let ctx: TestContext;
const verifies: string[] = [];
const avant = { TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY, GROUPE: process.env.GROUPE };
const fetchReel = globalThis.fetch;
beforeAll(async () => {
  process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAAsecret-de-test";
  process.env.GROUPE = "on";
  vi.stubGlobal("fetch", async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url instanceof Request ? url.url : url);
    if (!u.startsWith("https://challenges.cloudflare.com/turnstile/v0/siteverify")) return fetchReel(url, init);
    const corps = typeof init?.body === "string" ? init.body : init?.body instanceof URLSearchParams ? init.body.toString() : JSON.stringify(init?.body ?? "");
    verifies.push(corps);
    const bon = corps.includes("jeton-valide");
    return new Response(JSON.stringify({ success: bon, hostname: "test.mobiiz.fr", action: "", "error-codes": bon ? [] : ["invalid-input-response"] }), { status: 200, headers: { "content-type": "application/json" } });
  });
  ctx = await createTestApp();
  await resetDatabase(ctx.prisma);
});
afterAll(async () => {
  await ctx.app.close();
  vi.unstubAllGlobals();
  for (const [k, v] of Object.entries(avant)) if (v === undefined) delete process.env[k];
  else process.env[k] = v;
});

describe("le défi Turnstile", () => {
  it("inscription : refusée sans jeton ou avec un faux, acceptée avec un vrai", async () => {
    const http = request(ctx.app.getHttpServer());
    const corps = { email: "robot@example.fr", password: "Toit-ardoise-Paimpol-2026", name: "Artisan" };
    expect((await http.post("/v1/auth/sign-up/email").set("origin", WEB_ORIGIN).send(corps)).status).toBe(400);
    expect((await http.post("/v1/auth/sign-up/email").set("origin", WEB_ORIGIN).set("x-captcha-response", "jeton-faux").send(corps)).status).toBe(403);
    expect((await http.post("/v1/auth/sign-up/email").set("origin", WEB_ORIGIN).set("x-captcha-response", "jeton-valide").send(corps)).status).toBe(200);
    // La connexion n'a pas de défi (l'artisan qui revient n'est pas gêné ; la limite de débit la protège).
    expect((await http.post("/v1/auth/sign-in/email").set("origin", WEB_ORIGIN).send({ email: corps.email, password: corps.password })).status).toBe(200);
  });

  it("mot de passe oublié et lien de connexion négoce : jeton exigé", async () => {
    const http = request(ctx.app.getHttpServer());
    expect((await http.post("/v1/auth/request-password-reset").set("origin", WEB_ORIGIN).send({ email: "x@example.fr", redirectTo: "/" })).status).toBe(400);
    const sans = await http.post("/v1/negoce/connexion").send({ email: "negoce@example.fr" });
    expect(sans.status).toBe(400);
    expect(sans.body.error.details).toMatchObject({ reason: "captcha_requis" });
    expect((await http.post("/v1/negoce/connexion").set("x-captcha-response", "jeton-valide").send({ email: "negoce@example.fr" })).status).toBe(200);
    expect(verifies.some((v) => v.includes("0x4AAAAAAAsecret-de-test"))).toBe(true);
  });
});
