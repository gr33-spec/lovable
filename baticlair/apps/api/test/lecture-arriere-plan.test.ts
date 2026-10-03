import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ExtractionAttempt, ExtractionRequest, TakeoffExtractor } from "../src/modules/takeoff/application/takeoff-extractor.js";
import { TAKEOFF_EXTRACTOR } from "../src/modules/takeoff/application/takeoff-extractor.js";
import { FakeTakeoffExtractor } from "../src/modules/takeoff/infrastructure/fake-takeoff-extractor.js";
import { loadConfig, type AppConfig } from "../src/platform/config/config.js";
import { CONFIG } from "../src/platform/tokens.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * AUDIT DE LANCEMENT, B3 : la lecture d'un gros devis (scanné, 30 pages) ne tient pas dans une
 * requête. Au-delà du délai de réponse, BatiClair répond « lecture en cours » (202) et continue ;
 * l'écran suit l'état. Une lecture en cours n'est jamais relancée (rien n'est payé deux fois).
 */
class GatedExtractor implements TakeoffExtractor {
  readonly provider = "fake";
  calls = 0;
  fail = false;
  private inner = new FakeTakeoffExtractor();
  private release!: () => void;
  private gate = new Promise<void>((r) => (this.release = r));
  open() {
    this.release();
  }
  reset() {
    this.calls = 0;
    this.fail = false;
    this.gate = new Promise<void>((r) => (this.release = r));
  }
  async extract(request: ExtractionRequest): Promise<ExtractionAttempt> {
    this.calls++;
    await this.gate;
    if (this.fail) throw new Error("panne du service d'IA");
    return this.inner.extract(request);
  }
}

const extractor = new GatedExtractor();
let ctx: TestContext;
beforeAll(async () => {
  const config: AppConfig = { ...loadConfig(), ai: { ...loadConfig().ai, answerWithinMs: 50 } };
  ctx = await createTestApp((b) => b.overrideProvider(CONFIG).useValue(config).overrideProvider(TAKEOFF_EXTRACTOR).useValue(extractor));
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  extractor.reset();
});

async function clientQuote(agent: Agent) {
  const project = await agent.post("/v1/projects").send({ name: "Toiture Dupont" });
  const doc = await agent
    .post(`/v1/projects/${project.body.id}/documents`)
    .field("purpose", "client_quote")
    .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
  return { projectId: project.body.id as string, documentId: doc.body.id as string };
}

async function until<T>(read: () => Promise<T>, done: (v: T) => boolean): Promise<T> {
  for (let i = 0; i < 100; i++) {
    const v = await read();
    if (done(v)) return v;
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error("délai dépassé");
}

describe("lecture longue : elle continue après la réponse", () => {
  it("répond « lecture en cours » (202), ne relance rien, puis la liste apparaît", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { projectId, documentId } = await clientQuote(agent);

    const first = await agent.post(`/v1/documents/${documentId}/takeoff`);
    expect(first.status).toBe(202);
    expect(first.body).toEqual({ reading: { status: "reading", reason: null } });

    // Double appui, rechargement : la lecture en cours n'est pas relancée.
    expect((await agent.post(`/v1/documents/${documentId}/takeoff`)).status).toBe(202);
    expect(extractor.calls).toBe(1);
    const during = await agent.get(`/v1/projects/${projectId}/takeoff`);
    expect(during.body).toMatchObject({ takeoff: null, reading: { status: "reading" } });

    extractor.open();
    const after = await until(
      () => agent.get(`/v1/projects/${projectId}/takeoff`),
      (r) => r.body.takeoff !== null,
    );
    expect(after.body.reading).toBeNull();
    expect(after.body.takeoff.lines).toHaveLength(6);
    expect(extractor.calls).toBe(1);
  });

  it("une panne pendant la lecture : l'écran le sait, et peut relancer", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures Martin");
    const { projectId, documentId } = await clientQuote(agent);
    extractor.fail = true;
    expect((await agent.post(`/v1/documents/${documentId}/takeoff`)).status).toBe(202);
    extractor.open();
    const failed = await until(
      () => agent.get(`/v1/projects/${projectId}/takeoff`),
      (r) => r.body.reading?.status === "failed",
    );
    expect(failed.body.takeoff).toBeNull();

    // Relance : nouvelle tentative, cette fois réussie (en un temps court : réponse directe).
    extractor.reset();
    extractor.open();
    const retry = await agent.post(`/v1/documents/${documentId}/takeoff`);
    expect([201, 202]).toContain(retry.status);
    const ok = await until(
      () => agent.get(`/v1/projects/${projectId}/takeoff`),
      (r) => r.body.takeoff !== null,
    );
    expect(ok.body.takeoff.lines).toHaveLength(6);
  });

  it("une lecture « en cours » depuis plus de 6 minutes a été interrompue : elle compte comme échouée", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "c@example.fr", "Toitures Martin");
    const { projectId, documentId } = await clientQuote(agent);
    expect((await agent.post(`/v1/documents/${documentId}/takeoff`)).status).toBe(202);
    await ctx.prisma.aiAnalysis.updateMany({ where: { documentId }, data: { startedAt: new Date(Date.now() - 7 * 60 * 1000) } });
    const res = await agent.get(`/v1/projects/${projectId}/takeoff`);
    expect(res.body.reading).toEqual({ status: "failed", reason: "interrupted" });
    extractor.open();
  });
});
