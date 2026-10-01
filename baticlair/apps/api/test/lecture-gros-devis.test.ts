import { PDFDocument, StandardFonts } from "pdf-lib";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { syntheticQuote, type SynthQuote } from "../../../packages/domain/test/support/devis-synthetique.js";
import { loadConfig } from "../src/platform/config/config.js";
import { CONFIG } from "../src/platform/tokens.js";
import { TAKEOFF_EXTRACTOR } from "../src/modules/takeoff/application/takeoff-extractor.js";
import { AnthropicTakeoffExtractor } from "../src/modules/takeoff/infrastructure/anthropic-takeoff-extractor.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * GROS DEVIS DE BOUT EN BOUT (PD-046), sans appel payant : un vrai PDF de
 * 100, 300 ou 500 lignes passe par la vraie chaîne (lecture locale, plan,
 * appels, réunion) ; seul le service d'IA est simulé, au niveau HTTP. Il
 * obéit aux consignes (pages à lister, contexte) et coupe sa réponse quand
 * elle dépasse la limite, comme le vrai.
 */
interface Call {
  scope: number[] | null;
  text: string;
  body: string;
}

/** Faux service Anthropic : lit le texte numéroté reçu et répond au format compact (prompt v7). */
function fakeAnthropic(options: { maxTokens?: number } = {}) {
  const calls: Call[] = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as { messages: { content: { type: string; text?: string }[] }[] };
    const text = body.messages[0]!.content.find((c) => c.type === "text")!.text!;
    const scopeMatch = /commencent sur les pages ([\d, ]+)\./.exec(text);
    const scope = scopeMatch ? scopeMatch[1]!.split(",").map((n) => Number(n.trim())) : null;
    calls.push({ scope, text, body: String(init.body) });

    const sections: string[][] = [];
    const lignes: { des: string; qte: string; unite: string; ref: null; src: string[]; sec: number | null; doute: null }[] = [];
    const path: string[] = [];
    for (const raw of text.split("\n")) {
      const m = /^\[(\d+):(\d+)\] (.*)$/.exec(raw);
      if (!m) continue;
      const [, page, , content] = m;
      const ref = `${m[1]}:${m[2]}`;
      if (/^BÂTIMENT /.test(content!)) path.splice(0, path.length, content!.trim());
      else if (/^LOGEMENT /.test(content!)) path.splice(1, path.length, content!.trim());
      else if (/^\(suite : pose comprise\)/.test(content!.trim())) {
        const last = lignes[lignes.length - 1];
        if (last && last.src.length === 1) {
          last.des += " (suite : pose comprise)";
          last.src.push(ref);
        }
      } else {
        const item = /^(R\d{4})\s{2,}(.+?)\s{2,}(\d+)\s{2,}(\S+)\s{2,}/.exec(content!);
        if (!item) continue;
        // Consigne : seulement les lignes qui commencent sur les pages du bloc.
        if (scope && !scope.includes(Number(page))) {
          lignes.push({ des: "__contexte__", qte: "", unite: "", ref: null, src: [ref], sec: null, doute: null });
          continue;
        }
        const key = JSON.stringify(path);
        let sec = sections.findIndex((s) => JSON.stringify(s) === key);
        if (sec === -1) sec = sections.push([...path]) - 1;
        lignes.push({ des: item[2]!.trim(), qte: item[3]!, unite: item[4]!, ref: null, src: [ref], sec, doute: null });
      }
    }
    const output = { sections, lignes: lignes.filter((l) => l.des !== "__contexte__"), notes: [] };
    const json = JSON.stringify(output);
    const outputTokens = Math.ceil(json.length / 3) + 3000;
    const truncated = outputTokens > (options.maxTokens ?? 16_000);
    const message = {
      id: `msg_${calls.length}`,
      type: "message",
      role: "assistant",
      model: "claude-sonnet-5-5",
      content: [{ type: "text", text: truncated ? json.slice(0, 2000) : json }],
      stop_reason: truncated ? "max_tokens" : "end_turn",
      stop_sequence: null,
      usage: { input_tokens: Math.ceil(text.length / 3) + 2000, output_tokens: truncated ? options.maxTokens ?? 16_000 : outputTokens, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    };
    return new Response(JSON.stringify(message), { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

/** Le devis synthétique imprimé en vrai PDF : colonnes réf, désignation, qté, unité, P.U., total. */
async function quotePdf(quote: SynthQuote): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const p of quote.pages) {
    const page = pdf.addPage([595.28, 841.89]);
    let y = 800;
    for (const row of p.rows) {
      y -= 20;
      const cols = row.text.split("  ");
      const xs = row.kind === "item" ? [30, 80, 400, 440, 480, 530] : [80];
      cols.forEach((c, i) => page.drawText(c.replace("–", "-"), { x: xs[i] ?? 80, y, size: 7, font }));
    }
  }
  return pdf.save();
}

async function importQuote(agent: Agent, quote: SynthQuote) {
  const project = await agent.post("/v1/projects").send({ name: "Résidence test" });
  const doc = await agent
    .post(`/v1/projects/${project.body.id}/documents`)
    .field("purpose", "client_quote")
    .attach("file", Buffer.from(await quotePdf(quote)), { filename: "devis.pdf", contentType: "application/pdf" });
  expect(doc.status).toBe(201);
  return { documentId: doc.body.id as string, reading: doc.body.reading };
}

const truthOf = (quote: SynthQuote) => quote.lines.map((l) => ({ designation: l.designation.replace("–", "-"), section: l.section.map((t) => t.replace("–", "-")) }));

describe("gros devis : plan automatique, blocs, aucune ligne perdue", () => {
  let ctx: TestContext;
  let api: ReturnType<typeof fakeAnthropic>;
  beforeAll(async () => {
    ctx = await createTestApp((b) =>
      b.overrideProvider(TAKEOFF_EXTRACTOR).useFactory({ factory: () => new AnthropicTakeoffExtractor("sk-test", "claude-sonnet-5-5", "high", ((u: string, i: RequestInit) => api.fetchImpl(u, i)) as typeof fetch) }),
    );
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    api = fakeAnthropic();
  });

  it("100 lignes : un seul appel, sans découpage", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Bâtiment Martin");
    const quote = syntheticQuote(100);
    const { documentId } = await importQuote(agent, quote);
    const res = await agent.post(`/v1/documents/${documentId}/takeoff`);
    expect(res.status).toBe(201);
    expect(api.calls).toHaveLength(1);
    expect(api.calls[0]!.scope).toBeNull();
    expect(res.body.lines).toHaveLength(100);
    expect(await ctx.prisma.aiExecution.count()).toBe(1);
  });

  it.each([300, 500])("%i lignes : lu en blocs, aucune réponse coupée, toutes les lignes avec leurs sections, une fois chacune", async (count) => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Bâtiment Martin");
    const quote = syntheticQuote(count);
    const { documentId, reading } = await importQuote(agent, quote);
    // Le coût est estimé dès le dépôt, avant tout appel.
    expect(Number(reading.estimatedAiCostEur)).toBeGreaterThan(0);
    expect(api.calls).toHaveLength(0);

    const res = await agent.post(`/v1/documents/${documentId}/takeoff`);
    expect(res.status).toBe(201);
    expect(api.calls.length).toBeGreaterThan(1);
    expect(api.calls.length).toBeLessThanOrEqual(12);
    // Chaque page est confiée à un seul bloc ; aucune demande n'est envoyée deux fois.
    const owned = api.calls.flatMap((c) => c.scope!);
    expect(owned).toEqual([...new Set(owned)].sort((a, b) => a - b));
    expect(new Set(api.calls.map((c) => c.body)).size).toBe(api.calls.length);
    const executions = await ctx.prisma.aiExecution.findMany();
    expect(executions).toHaveLength(api.calls.length);
    expect(executions.every((e) => e.status === "success")).toBe(true);

    const takeoff = await ctx.prisma.takeoffLine.findMany({ orderBy: { position: "asc" } });
    expect(takeoff.map((l) => ({ designation: l.designation, section: l.section }))).toEqual(truthOf(quote));
  });
});

describe("réponse coupée : jamais la même demande deux fois", () => {
  let ctx: TestContext;
  let api: ReturnType<typeof fakeAnthropic>;
  beforeAll(async () => {
    ctx = await createTestApp((b) =>
      b.overrideProvider(TAKEOFF_EXTRACTOR).useFactory({ factory: () => new AnthropicTakeoffExtractor("sk-test", "claude-sonnet-5-5", "high", ((u: string, i: RequestInit) => api.fetchImpl(u, i)) as typeof fetch) }),
    );
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });

  it("le plan prévoyait un appel, la réponse est coupée : le devis est relu en deux moitiés, rien de perdu", async () => {
    api = fakeAnthropic({ maxTokens: 7_000 });
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Bâtiment Martin");
    const quote = syntheticQuote(100);
    const { documentId } = await importQuote(agent, quote);
    const res = await agent.post(`/v1/documents/${documentId}/takeoff`);
    expect(res.status).toBe(201);
    expect(api.calls[0]!.scope).toBeNull();
    expect(api.calls.length).toBe(3);
    expect(new Set(api.calls.map((c) => c.body)).size).toBe(3);
    expect(api.calls.slice(1).flatMap((c) => c.scope!)).toEqual(quote.pages.map((p) => p.pageNumber));
    const executions = await ctx.prisma.aiExecution.findMany({ orderBy: { attempt: "asc" } });
    expect(executions.map((e) => [e.attempt, e.status, e.errorCode])).toEqual([
      [1, "invalid_output", "max_tokens"],
      [2, "success", null],
      [3, "success", null],
    ]);
    const lines = await ctx.prisma.takeoffLine.findMany({ orderBy: { position: "asc" } });
    expect(lines.map((l) => ({ designation: l.designation, section: l.section }))).toEqual(truthOf(quote));
  });

  it("une seule page trop dense : un seul appel payé, un échec net, l'analyse n'est pas décomptée", async () => {
    api = fakeAnthropic({ maxTokens: 3_500 });
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Bâtiment Martin");
    const quote = syntheticQuote(25);
    expect(quote.pages).toHaveLength(1);
    const { documentId } = await importQuote(agent, quote);
    const res = await agent.post(`/v1/documents/${documentId}/takeoff`);
    expect(res.status).toBe(502);
    expect(res.body.error).toMatchObject({ code: "analysis_failed", details: { reason: "page_too_dense" } });
    expect(api.calls).toHaveLength(1);
    expect(await ctx.prisma.aiAnalysis.findFirstOrThrow()).toMatchObject({ status: "failed" });
  });
});

describe("garde-fou : un coût estimé anormal n'est pas envoyé", () => {
  let ctx: TestContext;
  const api = fakeAnthropic();
  beforeAll(async () => {
    const config = loadConfig();
    ctx = await createTestApp((b) =>
      b
        .overrideProvider(CONFIG)
        // Plafond minuscule pour le test ; en ligne : 3 € par document, bien au-delà d'un devis de 500 lignes.
        .useValue({ ...config, aiCost: { ...config.aiCost, analysisMaxEur: "0.0001" } })
        .overrideProvider(TAKEOFF_EXTRACTOR)
        .useValue(new AnthropicTakeoffExtractor("sk-test", "claude-sonnet-5-5", "high", api.fetchImpl)),
    );
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });

  it("refusé avant tout appel, sans rien dépenser ni décompter, avec un message clair", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Bâtiment Martin");
    const { documentId } = await importQuote(agent, syntheticQuote(20));
    const res = await agent.post(`/v1/documents/${documentId}/takeoff`);
    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({ code: "unreadable_document", details: { reason: "abnormal_size" } });
    expect(api.calls).toHaveLength(0);
    expect(await ctx.prisma.aiExecution.count()).toBe(0);
    expect(await ctx.prisma.aiAnalysis.count()).toBe(0);
  });
});
