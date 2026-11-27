import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { lectureACompter } from "../src/platform/http/rate-limit.module.js";
import { loadConfig, type AppConfig } from "../src/platform/config/config.js";
import { CONFIG } from "../src/platform/tokens.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LES LECTURES QUI COÛTENT SONT LIMITÉES (audit du 27 novembre 2026, accord de Greg) : avant, aucune requête GET n'était
 * comptée, même avec son `@Throttle` (export PDF annoncé « 10 par heure », passé 14 fois). Maintenant : une lecture avec son
 * propre plafond, un fichier fabriqué (PDF, Excel, CSV) ou une page par jeton est comptée ; les écrans restent libres.
 */
let ctx: TestContext;
beforeAll(async () => {
  const config: AppConfig = { ...loadConfig(), rateLimit: { enabled: true } };
  ctx = await createTestApp((b) => b.overrideProvider(CONFIG).useValue(config));
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

describe("limites de débit sur les lectures", () => {
  it("l'export PDF des données (10 par heure) : la 11e demande est refusée (429)", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const statuts: number[] = [];
    for (let i = 0; i < 11; i++) statuts.push((await agent.get("/v1/me/export.pdf")).status);
    expect(statuts.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuts[10]).toBe(429);
  });

  it("un écran ordinaire (liste des chantiers) n'est jamais compté, même lu 150 fois de suite", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    for (let i = 0; i < 150; i++) expect((await agent.get("/v1/projects")).status).toBe(200);
  });

  it("ce qui est compté : fichiers fabriqués et pages par jeton ; le reste non", () => {
    for (const u of ["/v1/projects/x/demande-de-devis.pdf", "/v1/public/achat-groupe/abc/demande.xlsx", "/v1/corrections/export.csv", "/v1/reponse/abc", "/v1/public/chiffrer/abc", "/v1/negoce/connexion/abc", "/v1/emails/stop/abc", "/v1/me/export"]) expect({ u, compte: lectureACompter(u) }).toEqual({ u, compte: true });
    for (const u of ["/v1/projects", "/v1/quantitatifs/abc", "/v1/messagerie/recus", "/v1/notifications?x=1.pdf"]) expect({ u, compte: lectureACompter(u) }).toEqual({ u, compte: false });
  });
});
