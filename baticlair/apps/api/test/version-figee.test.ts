import { ROOFING_REFERENTIAL } from "@baticlair/domain";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Prisma } from "../src/generated/prisma/client.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * VERSION FIGÉE PAR CHANTIER (plan v3 §3) : un quantitatif se recalcule avec le référentiel de SA version, jamais
 * avec les règles du jour. L'instantané est écrit à la première rencontre d'une version, relu et revalidé ensuite.
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
  await ctx.prisma.referentialSnapshot.deleteMany();
});

const BREST = { adresse: "29200 Brest", lignes: [{ libelle: "Couverture en ardoises naturelles d'Espagne 1er choix 30x22 posées au crochet", quantite: "200", unite: "m²" }] };
type Q = { id: string; version_referentiel: string; lignes: { libelle: string; quantite: number | null }[] };
const ardoises = (q: Q) => q.lignes.find((l) => l.libelle === "Ardoises naturelles Espagne 1er choix 30×22")!.quantite;

describe("le quantitatif garde sa version de référentiel", () => {
  it("à la création, la version du jour est enregistrée avec son instantané", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const q = (await agent.post("/v1/quantitatifs").send(BREST)).body as Q;
    expect(q.version_referentiel).toBe(ROOFING_REFERENTIAL.version);
    const snap = await ctx.prisma.referentialSnapshot.findUnique({ where: { version: ROOFING_REFERENTIAL.version } });
    expect(snap?.trade).toBe("roofing");
    expect((snap?.data as { id: string }).id).toBe(ROOFING_REFERENTIAL.id);
  });

  it("un quantitatif né sous une version ANCIENNE se recalcule avec elle (ici : 10 % de perte sur l'ardoise au lieu de 5)", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const q = (await agent.post("/v1/quantitatifs").send(BREST)).body as Q;
    expect(ardoises(q)).toBe(9200);
    // Une ancienne version, telle qu'elle aurait été enregistrée à l'époque : même référentiel, perte ardoise 10 %.
    const old = JSON.parse(JSON.stringify(ROOFING_REFERENTIAL)) as typeof ROOFING_REFERENTIAL;
    const ancienne = { ...old, version: "roofing-2026.09.01-0", wasteRules: old.wasteRules.map((w) => (w.family === "roof_slate" ? { ...w, rate: "10" } : w)) };
    await ctx.prisma.referentialSnapshot.create({ data: { trade: "roofing", version: ancienne.version, data: ancienne as unknown as Prisma.InputJsonValue } });
    await ctx.prisma.takeoff.updateMany({ data: { referentialVersion: ancienne.version } });
    const again = (await agent.get(`/v1/quantitatifs/${q.id}`)).body as Q;
    expect(again.version_referentiel).toBe("roofing-2026.09.01-0");
    // 8 761,65 × 1,10 = 9 637,8 → 9 638 ardoises : les règles de l'époque, pas celles du jour.
    expect(ardoises(again)).toBe(9638);
  });

  it("un instantané abîmé ne sert jamais : le référentiel du jour prend le relais", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const q = (await agent.post("/v1/quantitatifs").send(BREST)).body as Q;
    await ctx.prisma.referentialSnapshot.create({ data: { trade: "roofing", version: "roofing-casse", data: { id: "x" } } });
    await ctx.prisma.takeoff.updateMany({ data: { referentialVersion: "roofing-casse" } });
    expect(ardoises((await agent.get(`/v1/quantitatifs/${q.id}`)).body as Q)).toBe(9200);
  });
});
