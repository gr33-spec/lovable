import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AiUsageRecorder, type AiCallReport } from "../src/modules/ai-usage/index.js";
import { currentMonth } from "../src/modules/ai-usage/application/ai-usage.service.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
let recorder: AiUsageRecorder;
beforeAll(async () => {
  ctx = await createTestApp();
  recorder = ctx.app.get(AiUsageRecorder);
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
