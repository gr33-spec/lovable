import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AnalysisMeter } from "../src/modules/ai-usage/application/analysis-meter.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LES ANALYSES OFFERTES NE SE CONTOURNENT PAS EN LANÇANT TOUT D'UN COUP (audit du 27 novembre 2026, accord de Greg) : avant,
 * seules les lectures TERMINÉES comptaient ; dix lectures lancées au même instant sur un compte gratuit passaient toutes.
 * Maintenant le décompte compte aussi les lectures en cours, sous un verrou par entreprise.
 */
let ctx: TestContext;
const avant = process.env.LECTURES_IA_GRATUIT_TOTAL;
beforeAll(async () => {
  delete process.env.LECTURES_IA_GRATUIT_TOTAL; // 3 offertes, comme en production.
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  if (avant === undefined) delete process.env.LECTURES_IA_GRATUIT_TOTAL;
  else process.env.LECTURES_IA_GRATUIT_TOTAL = avant;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

async function documents(companyId: string, n: number) {
  const projet = await ctx.prisma.project.create({ data: { companyId, name: "Chantier test" } });
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = await ctx.prisma.document.create({ data: { companyId, projectId: projet.id, purpose: "client_quote", originalName: `devis-${i}.pdf`, mimeType: "application/pdf", sizeBytes: 100, sha256: `s${i}` } });
    ids.push(d.id);
  }
  return { projectId: projet.id, ids };
}

describe("analyses offertes d'un compte gratuit", () => {
  it("dix lectures lancées au même instant : trois passent, les sept autres sont refusées sans rien dépenser", async () => {
    const { companyId } = await signUpWithCompany(ctx.app, "gratuit@example.fr", "Toitures Martin");
    const userId = (await ctx.prisma.user.update({ where: { email: "gratuit@example.fr" }, data: { emailVerified: true } })).id;
    const { projectId, ids } = await documents(companyId, 10);
    const meter = ctx.app.get(AnalysisMeter);
    const resultats = await Promise.allSettled(ids.map((documentId) => meter.begin({ companyId, userId, projectId, documentId, kind: "client_quote" })));
    const passees = resultats.filter((r) => r.status === "fulfilled" && r.value.status === "go");
    const refusees = resultats.filter((r) => r.status === "rejected");
    expect(passees).toHaveLength(3);
    expect(refusees).toHaveLength(7);
    for (const r of refusees) expect((r as PromiseRejectedResult).reason).toMatchObject({ code: "abonnement_requis" });
    expect(await ctx.prisma.aiAnalysis.count({ where: { companyId } })).toBe(3);
  });

  it("une lecture en échec rend sa place ; une lecture terminée la garde", async () => {
    const { companyId } = await signUpWithCompany(ctx.app, "gratuit@example.fr", "Toitures Martin");
    const userId = (await ctx.prisma.user.update({ where: { email: "gratuit@example.fr" }, data: { emailVerified: true } })).id;
    const { projectId, ids } = await documents(companyId, 5);
    const meter = ctx.app.get(AnalysisMeter);
    const a = await meter.begin({ companyId, userId, projectId, documentId: ids[0]!, kind: "client_quote" });
    const b = await meter.begin({ companyId, userId, projectId, documentId: ids[1]!, kind: "client_quote" });
    const c = await meter.begin({ companyId, userId, projectId, documentId: ids[2]!, kind: "client_quote" });
    await expect(meter.begin({ companyId, userId, projectId, documentId: ids[3]!, kind: "client_quote" })).rejects.toMatchObject({ code: "abonnement_requis" });
    if (a.status !== "go" || b.status !== "go" || c.status !== "go") throw new Error("attendu : go");
    await meter.complete(a.analysis.id);
    await meter.fail(b.analysis.id);
    // b a échoué : sa place revient ; a (terminée) et c (en cours) comptent toujours.
    expect((await meter.begin({ companyId, userId, projectId, documentId: ids[3]!, kind: "client_quote" })).status).toBe("go");
    await expect(meter.begin({ companyId, userId, projectId, documentId: ids[4]!, kind: "client_quote" })).rejects.toMatchObject({ code: "abonnement_requis" });
  });
});
