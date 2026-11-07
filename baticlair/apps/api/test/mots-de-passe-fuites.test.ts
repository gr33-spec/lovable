import { createHash } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * LES MOTS DE PASSE FUITÉS (Greg, 26 octobre 2026, feu vert sécurité) : un mot de passe présent dans Have I Been Pwned
 * est refusé à l'inscription ; seuls les 5 premiers caractères de son empreinte SHA-1 partent (k-anonymat).
 */
const FUITE = "azertyuiop123";
const empreinte = (m: string) => createHash("sha1").update(m).digest("hex").toUpperCase();
let ctx: TestContext;
const demandes: string[] = [];
const avant = process.env.MOTS_DE_PASSE_FUITES;
const fetchReel = globalThis.fetch;
beforeAll(async () => {
  process.env.MOTS_DE_PASSE_FUITES = "on";
  vi.stubGlobal("fetch", (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url instanceof Request ? url.url : url);
    if (!u.startsWith("https://api.pwnedpasswords.com/range/")) return fetchReel(url, init);
    demandes.push(u);
    const h = empreinte(FUITE);
    const corps = u.endsWith(h.slice(0, 5)) ? `0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${h.slice(5)}:4521\r\n` : "0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n";
    return Promise.resolve(new Response(corps, { status: 200, headers: { "content-type": "text/plain" } }));
  });
  ctx = await createTestApp();
  await resetDatabase(ctx.prisma);
});
afterAll(async () => {
  await ctx.app.close();
  vi.unstubAllGlobals();
  if (avant === undefined) delete process.env.MOTS_DE_PASSE_FUITES;
  else process.env.MOTS_DE_PASSE_FUITES = avant;
});

describe("un mot de passe fuité est refusé", () => {
  it("refusé avec une phrase claire ; un mot de passe sain passe ; le mot de passe ne part jamais", async () => {
    const http = request(ctx.app.getHttpServer());
    const refus = await http.post("/v1/auth/sign-up/email").set("origin", "http://localhost:3000").send({ email: "fuite@example.fr", password: FUITE, name: "Artisan" });
    expect(refus.status).toBe(400);
    expect(refus.body.code).toBe("PASSWORD_COMPROMISED");
    expect(refus.body.message).toBe("Ce mot de passe a déjà fuité sur Internet. Choisis-en un autre.");
    const ok = await http.post("/v1/auth/sign-up/email").set("origin", "http://localhost:3000").send({ email: "sain@example.fr", password: "Toit-ardoise-Paimpol-2026", name: "Artisan" });
    expect(ok.status).toBe(200);
    expect(demandes).toHaveLength(2);
    for (const d of demandes) {
      expect(d).toMatch(/\/range\/[0-9A-F]{5}$/);
      expect(d).not.toContain(empreinte(FUITE).slice(5));
    }
  });
});
