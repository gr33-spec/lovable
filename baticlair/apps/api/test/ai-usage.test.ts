import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { AiUsageRecorder, AnalysisMeter, type AiCallReport } from "../src/modules/ai-usage/index.js";
import { DomainError } from "../src/platform/errors/domain-error.js";
import { currentMonth } from "../src/modules/ai-usage/application/ai-usage.service.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUp, signUpWithCompany, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
let recorder: AiUsageRecorder;
let meter: AnalysisMeter;
beforeAll(async () => {
  ctx = await createTestApp();
  recorder = ctx.app.get(AiUsageRecorder);
  meter = ctx.app.get(AnalysisMeter);
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

async function setup() {
  const { agent, companyId } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
  const project = await agent.post("/v1/projects").send({ name: "Toiture Dupont" });
  const doc = await agent
    .post(`/v1/projects/${project.body.id}/documents`)
    .field("purpose", "supplier_quote")
    .attach("file", Buffer.from(await makePdf(["devis", "scan"])), { filename: "offre.pdf", contentType: "application/pdf" });
  const processing = await ctx.prisma.documentProcessing.findFirstOrThrow({ where: { documentId: doc.body.id } });
  const base: AiCallReport = {
    companyId,
    projectId: project.body.id,
    documentId: doc.body.id,
    processingId: processing.id,
    task: "offer_extraction",
    route: "text",
    provider: "anthropic",
    model: "claude-sonnet-5-5",
    promptId: "offer-extraction",
    promptVersion: 1,
    attempt: 1,
    pagesText: 1,
    usage: { inputTokens: 10_000, outputTokens: 3_000 },
    status: "success",
    durationMs: 4200,
  };
  return { agent, companyId, projectId: project.body.id as string, documentId: doc.body.id as string, base };
}

describe("enregistrement des appels IA", () => {
  it("calcule le coût à partir de la consommation réelle et l'ajoute au document", async () => {
    const { agent, documentId, base } = await setup();
    const { costMicroUsd } = await recorder.record(base);
    // Sonnet 5.5 : 10 000 × 2 $ + 3 000 × 10 $ par million = 0,05 $
    expect(costMicroUsd).toBe(50_000);

    const row = await ctx.prisma.aiExecution.findFirstOrThrow();
    expect(row).toMatchObject({ model: "claude-sonnet-5-5", inputTokens: 10_000, outputTokens: 3_000, priceTableVersion: "anthropic-2026-09-30" });
    expect(row.costMicroUsd).toBe(50_000n);

    const doc = await agent.get(`/v1/documents/${documentId}`);
    expect(doc.body.reading.actualAiCostEur).toBe("0.046"); // 0,05 $ × 0,92
  });

  it("refuse d'enregistrer un modèle sans tarif connu (jamais un coût à zéro par erreur)", async () => {
    const { base } = await setup();
    await expect(recorder.record({ ...base, model: "claude-inconnu" })).rejects.toThrow(/Aucun tarif/);
    expect(await ctx.prisma.aiExecution.count()).toBe(0);
  });
});

describe("rapport mensuel de consommation", () => {
  it("donne coût, relances, pages, par chantier et par modèle, et le volume lu", async () => {
    const { agent, projectId, base } = await setup();
    await recorder.record({ ...base, status: "invalid_output", errorCode: "schema_mismatch" });
    await recorder.record({ ...base, route: "fallback", attempt: 2 });
    await recorder.record({
      ...base,
      route: "vision",
      pagesText: 0,
      pagesVision: 1,
      model: "claude-haiku-4-5",
      usage: { inputTokens: 4000, outputTokens: 1000, cacheReadTokens: 2000 },
    });

    const res = await agent.get("/v1/ai-usage");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      month: currentMonth(new Date()),
      currency: "EUR",
      budgetEur: "10",
      actual: { calls: 3, retries: 1, failedCalls: 1, pagesText: 2, pagesVision: 1, inputTokens: 24_000, outputTokens: 7_000, cacheReadTokens: 2000 },
      byProject: [{ projectId, projectName: "Toiture Dupont", documents: 1, calls: 3 }],
      reading: { documents: 1, pagesTotal: 2, pagesText: 1, pagesVision: 1, pagesSkipped: 0 },
      priceTableVersions: ["anthropic-2026-09-30"],
    });
    // 2 × 50 000 + (4 000 + 5 000 + 200) = 109 200 µ$ → 0,100464 €
    expect(res.body.actual.costEur).toBe("0.1005");
    expect(res.body.actual.budgetUsedPercent).toBe(1);
    expect(res.body.byModel.map((m: { model: string; calls: number }) => [m.model, m.calls])).toEqual([
      ["claude-sonnet-5-5", 2],
      ["claude-haiku-4-5", 1],
    ]);
    expect(Number(res.body.reading.estimatedCostEur)).toBeGreaterThan(0);
  });

  it("compte les appels dans le mois civil de Paris", async () => {
    const { agent, base } = await setup();
    const { id } = await recorder.record(base);
    // 31 août 22 h 30 UTC = 1er septembre 0 h 30 à Paris.
    await ctx.prisma.aiExecution.update({ where: { id }, data: { createdAt: new Date("2026-08-31T22:30:00Z") } });
    expect((await agent.get("/v1/ai-usage?month=2026-09")).body.actual.calls).toBe(1);
    expect((await agent.get("/v1/ai-usage?month=2026-08")).body.actual.calls).toBe(0);
    expect((await agent.get("/v1/ai-usage?month=2026-13")).status).toBe(400);
  });

  it("est réservé au propriétaire et aux administrateurs, et isolé par entreprise", async () => {
    const { agent, companyId, base } = await setup();
    await recorder.record(base);

    const other = await signUpWithCompany(ctx.app, "b@example.fr", "Couverture Leroy");
    expect((await other.agent.get("/v1/ai-usage")).body.actual.calls).toBe(0);

    await ctx.prisma.membership.updateMany({ where: { companyId }, data: { role: "member" } });
    const res = await agent.get("/v1/ai-usage");
    expect(res.status).toBe(403);
  });
});

describe("paliers : décompte des analyses par mois et par utilisateur", () => {
  async function companyWithTwoUsers() {
    const owner = await signUpWithCompany(ctx.app, "chef@example.fr", "Toitures Martin");
    const project = await owner.agent.post("/v1/projects").send({ name: "Toiture Dupont" });
    const ouvrier = await signUp(ctx.app, "ouvrier@example.fr", "Paul Ouvrier");
    const ouvrierUser = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "ouvrier@example.fr" } });
    await ctx.prisma.membership.create({ data: { companyId: owner.companyId, userId: ouvrierUser.id, role: "member" } });
    void ouvrier;
    const chefUser = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "chef@example.fr" } });
    return { ...owner, projectId: project.body.id as string, chefId: chefUser.id, ouvrierId: ouvrierUser.id };
  }
  const begin = (c: { companyId: string; projectId: string }, userId: string, documentId = randomUUID()) =>
    meter.begin({ companyId: c.companyId, userId, projectId: c.projectId, documentId, kind: "supplier_quote" });

  it("décompte une analyse réussie, une seule fois par document", async () => {
    const c = await companyWithTwoUsers();
    const documentId = randomUUID();
    const first = await begin(c, c.chefId, documentId);
    expect(first.status).toBe("go");
    await meter.complete(first.analysis.id);

    const again = await begin(c, c.ouvrierId, documentId);
    expect(again.status).toBe("already_done");
    expect((await c.agent.get("/v1/ai-usage")).body.analyses).toEqual({ used: 1, limit: null, remaining: null });
  });

  it("ne décompte pas un échec, et laisse reprendre", async () => {
    const c = await companyWithTwoUsers();
    const documentId = randomUUID();
    const first = await begin(c, c.chefId, documentId);
    await meter.fail(first.analysis.id);
    expect((await c.agent.get("/v1/ai-usage")).body.analyses.used).toBe(0);

    const retry = await begin(c, c.chefId, documentId);
    expect(retry).toMatchObject({ status: "go", analysis: { id: first.analysis.id, status: "started" } });
  });

  it("bloque avant tout appel IA quand le palier du mois est atteint", async () => {
    const c = await companyWithTwoUsers();
    await ctx.prisma.company.update({ where: { id: c.companyId }, data: { monthlyAnalysisLimit: 2 } });
    for (let i = 0; i < 2; i++) await meter.complete((await begin(c, c.chefId)).analysis.id);

    const blocked = begin(c, c.ouvrierId);
    await expect(blocked).rejects.toBeInstanceOf(DomainError);
    await expect(blocked).rejects.toMatchObject({ code: "analysis_quota_reached", details: { limit: 2, used: 2 } });
    // Un document déjà analysé reste consultable même palier atteint (aucun nouvel appel).
    expect((await c.agent.get("/v1/ai-usage")).body.analyses).toEqual({ used: 2, limit: 2, remaining: 0 });
  });

  it("donne analyses, appels et coût par utilisateur ; le coût s'ajoute à l'analyse", async () => {
    const c = await companyWithTwoUsers();
    const a1 = (await begin(c, c.chefId)).analysis;
    const call = {
      companyId: c.companyId,
      projectId: c.projectId,
      documentId: a1.documentId,
      analysisId: a1.id,
      userId: c.chefId,
      task: "offer_extraction",
      route: "text" as const,
      provider: "anthropic",
      model: "claude-sonnet-5-5",
      promptId: "offer-extraction",
      promptVersion: 1,
      attempt: 1,
      usage: { inputTokens: 10_000, outputTokens: 3_000 },
      status: "success" as const,
      durationMs: 3000,
    };
    await recorder.record({ ...call, status: "invalid_output" });
    await recorder.record({ ...call, attempt: 2, route: "fallback" });
    await meter.complete(a1.id);

    const a2 = (await begin(c, c.ouvrierId)).analysis;
    await recorder.record({ ...call, documentId: a2.documentId, analysisId: a2.id, userId: c.ouvrierId });
    await meter.complete(a2.id);

    expect((await ctx.prisma.aiAnalysis.findUniqueOrThrow({ where: { id: a1.id } })).costMicroUsd).toBe(100_000n);

    const report = (await c.agent.get("/v1/ai-usage")).body;
    expect(report.analyses.used).toBe(2);
    expect(report.byUser).toEqual([
      { userId: c.chefId, userName: "Artisan Test", analyses: 1, calls: 2, costEur: "0.092" },
      { userId: c.ouvrierId, userName: "Paul Ouvrier", analyses: 1, calls: 1, costEur: "0.046" },
    ]);
  });
});
