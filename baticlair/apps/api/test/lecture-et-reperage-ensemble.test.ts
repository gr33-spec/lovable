import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LECTURE_READER, type LectureReader, type LectureRequest } from "../src/modules/takeoff/application/lecture-reader.js";
import { FakeLectureReader } from "../src/modules/takeoff/infrastructure/fake-lecture-reader.js";
import type { ReadAttempt } from "../src/platform/ai/document-reader.js";
import type { LectureDevis } from "@baticlair/domain";
import { loadConfig, type AppConfig } from "../src/platform/config/config.js";
import { CONFIG } from "../src/platform/tokens.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * VITESSE (Greg, 17 novembre 2026 : « Lecture du devis : 24 secondes, c'est trop long »). Avec
 * `LECTURE_ET_REPERAGE_ENSEMBLE`, la lecture part avec le métier du compte en même temps que le repérage des métiers,
 * au lieu d'attendre sa réponse. Le repérage confirme ce seul métier : cette lecture est LA lecture, rien n'est lu deux
 * fois. Il en trouve un autre : la lecture écartée est comptée, et le devis est relu avec le bon référentiel.
 */
class Lecteur implements LectureReader {
  readonly provider = "fake";
  metiers: string[] = ["roofing"];
  /** L'ordre des événements : « lire:<métier> » au départ d'une lecture, « repere » à la réponse du repérage. */
  journal: string[] = [];
  private inner = new FakeLectureReader();
  async reperer(): Promise<ReadAttempt<string[]>> {
    await new Promise((r) => setTimeout(r, 150));
    this.journal.push("repere");
    return { provider: "fake", model: "fake", usage: { inputTokens: 0, outputTokens: 0 }, status: "success", output: this.metiers, errorCode: null, durationMs: 150 };
  }
  async lire(request: LectureRequest): Promise<ReadAttempt<LectureDevis> | null> {
    this.journal.push(`lire:${request.trade}`);
    return this.inner.lire(request);
  }
}

const lecteur = new Lecteur();
let ctx: TestContext;
const monter = async (ensemble: boolean) => {
  const config: AppConfig = { ...loadConfig(), ai: { ...loadConfig().ai, lectureEtReperageEnsemble: ensemble } };
  ctx = await createTestApp((b) => b.overrideProvider(CONFIG).useValue(config).overrideProvider(LECTURE_READER).useValue(lecteur));
};

async function lireUnDevis(agent: Agent) {
  const project = await agent.post("/v1/projects").send({ name: "Toiture Dupont" });
  const doc = await agent
    .post(`/v1/projects/${project.body.id}/documents`)
    .field("purpose", "client_quote")
    .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
  const res = await agent.post(`/v1/documents/${doc.body.id}/takeoff`);
  expect([200, 201]).toContain(res.status);
  return res;
}

describe("lecture et repérage lancés ensemble", () => {
  beforeAll(() => monter(true));
  afterAll(() => ctx.app.close());
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    lecteur.journal = [];
    lecteur.metiers = ["roofing"];
  });

  it("le repérage confirme le métier du compte : UNE seule lecture, partie avant la réponse du repérage", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    await lireUnDevis(agent);
    expect(lecteur.journal.filter((e) => e.startsWith("lire:"))).toHaveLength(1);
    expect(lecteur.journal.indexOf("lire:roofing")).toBeLessThan(lecteur.journal.indexOf("repere"));
    expect(await ctx.prisma.aiExecution.count({ where: { task: "lecture_devis" } })).toBe(1);
  });

  it("le repérage trouve un autre métier : la lecture écartée est comptée, le devis est relu avec le bon métier", async () => {
    lecteur.metiers = ["painting"];
    const { agent } = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures Durand");
    await lireUnDevis(agent);
    const lectures = lecteur.journal.filter((e) => e.startsWith("lire:"));
    expect(lectures[0]).toBe("lire:roofing");
    expect(lectures.at(-1)).toBe("lire:painting");
    // Rien de caché : chaque lecture faite est au relevé de consommation.
    expect(await ctx.prisma.aiExecution.count({ where: { task: "lecture_devis" } })).toBe(lectures.length);
  });
});

describe("sans le réglage : rien ne change, la lecture attend le repérage", () => {
  beforeAll(() => monter(false));
  afterAll(() => ctx.app.close());
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    lecteur.journal = [];
    lecteur.metiers = ["roofing"];
  });

  it("une seule lecture, après la réponse du repérage", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "c@example.fr", "Toitures Bernard");
    await lireUnDevis(agent);
    expect(lecteur.journal).toEqual(["repere", "lire:roofing"]);
  });
});
