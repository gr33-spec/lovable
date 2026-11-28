import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { doubleAuthentification } from "./support/admin.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * PLAN 2 DU 21 OCTOBRE 2026, BLOC 6 : LE JEU DE DONNÉES DE DÉMONSTRATION. 12 artisans du 22, 8 négoces, 3 lots (en cours,
 * décidé, livré), l'entreprise nommée dans chaque lot ; rejouable sans doublon ; jamais en production.
 */
let ctx: TestContext;
const avant = { GROUPE: process.env.GROUPE, CRON_SECRET: process.env.CRON_SECRET, GROUPE_ADMINS: process.env.GROUPE_ADMINS };
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.CRON_SECRET = "secret-de-la-tache";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) if (v === undefined) delete process.env[k];
  else process.env[k] = v;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});
const jeu = (entreprise?: string, secret = "secret-de-la-tache") => request(ctx.app.getHttpServer()).post(`/v1/internal/demo/jeu${entreprise ? `?entreprise=${encodeURIComponent(entreprise)}` : ""}`).set("authorization", `Bearer ${secret}`);

describe("le jeu de données de démonstration", { timeout: 60_000 }, () => {
  it("12 artisans, 8 négoces, 3 lots à trois étapes ; Greg dans chaque lot ; admin et « Mes lots » remplis ; rejouable", async () => {
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "BATI INVEST", ["roofing"]);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    expect((await jeu("greg@example.fr", "mauvais")).status).toBe(403);
    const r = await jeu("greg@example.fr").expect(201);
    expect(r.body).toMatchObject({ artisans: 12, negoces: 8, entreprise: "greg@example.fr" });
    expect(r.body.lots.map((l: { etape: string }) => l.etape)).toEqual(["en_cours", "decide", "livre"]);
    expect(await ctx.prisma.company.count()).toBe(13);
    expect(await ctx.prisma.besoin.count()).toBe(15);
    // L'admin voit les trois lots, à trois états.
    const admin = (await greg.agent.get("/v1/admin/groupe").expect(200)).body as { lots: { statut: string; numero: number }[]; negoces: unknown[]; factures: { statut: string }[] };
    expect(admin.lots.map((l) => l.statut).sort()).toEqual(["choisi", "choisi", "envoye"]);
    expect(admin.negoces).toHaveLength(8);
    expect(admin.factures.map((f) => f.statut).sort()).toEqual(["envoyee", "payee"]);
    // « Mes lots » chez Greg : un besoin par lot, avec l'offre et le bon où il y en a.
    const lots = (await greg.agent.get("/v1/groupe/lots").expect(200)).body.besoins as { lot: { statut: string }; offre: unknown; bon: { livraison: { statut: string } } | null }[];
    expect(lots).toHaveLength(3);
    expect(lots.map((b) => b.lot.statut).sort()).toEqual(["choisi", "choisi", "envoye"]);
    expect(lots.filter((b) => b.bon).map((b) => b.bon!.livraison.statut).sort()).toEqual(["livre", "prevue"]);
    expect((await greg.agent.get("/v1/groupe/economies").expect(200)).body.lots).toBe(2);
    // Rejoué : pas de doublon.
    await jeu("greg@example.fr").expect(201);
    expect(await ctx.prisma.company.count()).toBe(13);
    expect(await ctx.prisma.lotGroupe.count()).toBe(3);
    expect(await ctx.prisma.negoce.count()).toBe(8);
    // Effacé : il ne reste que Greg.
    await request(ctx.app.getHttpServer()).delete("/v1/internal/demo/jeu").set("authorization", "Bearer secret-de-la-tache").expect(200);
    expect(await ctx.prisma.company.count()).toBe(1);
    expect(await ctx.prisma.lotGroupe.count()).toBe(0);
    expect((await greg.agent.get("/v1/groupe/lots").expect(200)).body.besoins).toHaveLength(0);
  });
});
