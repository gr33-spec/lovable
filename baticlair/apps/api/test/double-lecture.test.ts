import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/platform/config/config.js";
import { CONFIG } from "../src/platform/tokens.js";
import { TAKEOFF_EXTRACTOR, type ExtractionAttempt, type TakeoffExtractor } from "../src/modules/takeoff/application/takeoff-extractor.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LA DOUBLE LECTURE en vrai (décision du fondateur, 2026-10-05) : avec l'IA réelle, le devis est lu deux fois en même
 * temps ; le code compare. Ligne d'accord : verte même si une lecture hésitait ; désaccord : orange avec les deux
 * valeurs ; ligne vue une seule fois : gardée, orange. Les deux lectures sont enregistrées (coût), la mesure aussi.
 */
type Line = NonNullable<ExtractionAttempt["output"]>["lines"][number];
const line = (ref: string, designation: string, quantity: string, unit: string, doubt: string | null = null): Line => ({
  designation,
  quantity,
  unit,
  reference: null,
  sourceRefs: [ref],
  sourcePages: [1],
  doubt,
  section: [],
  dimensions: null,
});

/** Deux lectures qui ne disent pas tout à fait la même chose. */
class TwoReadings implements TakeoffExtractor {
  readonly provider = "anthropic";
  calls = 0;
  async extract(): Promise<ExtractionAttempt> {
    const first = this.calls++ === 0;
    const lines = first
      ? [line("1:3", "Tuile romane canal rouge", "1250", "u", "Chiffre peu lisible"), line("1:4", "Liteau sapin 27x38", "480", "ml")]
      : [line("1:3", "Tuile romane canal rouge", "1250", "u"), line("1:4", "Liteau sapin 27x38", "430", "ml"), line("1:5", "Faîtière ronde", "42", "u")];
    return {
      provider: this.provider,
      model: "claude-opus-5-5",
      usage: { inputTokens: 5000, outputTokens: 800 },
      status: "success",
      output: { lines, notes: [], context: null },
      errorCode: null,
      durationMs: 1,
    };
  }
}

let ctx: TestContext;
const extractor = new TwoReadings();
beforeAll(async () => {
  const config = loadConfig({ ...process.env, AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-test", AI_DOUBLE_READING: "on", AI_REVIEW_PANEL: "off" });
  ctx = await createTestApp((b) => b.overrideProvider(CONFIG).useValue(config).overrideProvider(TAKEOFF_EXTRACTOR).useValue(extractor));
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  extractor.calls = 0;
});

describe("double lecture d'un devis", () => {
  it("d'accord : sûr ; désaccord et ligne vue une fois : orange avec les deux valeurs ; deux lectures payées et mesurées", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "d@example.fr", "Toitures Le Floch");
    const project = await agent.post("/v1/projects").send({ name: "Chantier double lecture" });
    const doc = await agent
      .post(`/v1/projects/${project.body.id}/documents`)
      .field("purpose", "client_quote")
      .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
    const res = await agent.post(`/v1/documents/${doc.body.id}/takeoff`);
    expect(res.status).toBe(201);
    expect(extractor.calls).toBe(2);
    const lines = res.body.lines as { designation: string; quantity: string; aiDoubt: string | null }[];
    expect(lines.map((l) => l.designation)).toEqual(["Tuile romane canal rouge", "Liteau sapin 27x38", "Faîtière ronde"]);
    expect(lines[0]!.aiDoubt).toBeNull();
    expect(lines[1]).toMatchObject({ quantity: "480", aiDoubt: "Chiffre peu lisible : les deux lectures donnent « 480 ml » et « 430 ml ». Lequel est le bon ?" });
    expect(lines[2]!.aiDoubt).toMatch(/lue par une seule des deux lectures/);
    expect(await ctx.prisma.aiExecution.count()).toBe(2);
    const { readingStats } = await ctx.prisma.aiAnalysis.findFirstOrThrow();
    expect(readingStats).toMatchObject({ outcome: "completed", calls: 2, doubleReading: { agreed: 1, disagreed: 1, single: 1 } });
  });
});
