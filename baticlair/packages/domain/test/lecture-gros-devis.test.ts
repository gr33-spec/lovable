import { describe, expect, it } from "vitest";
import {
  artisanView,
  DEFAULT_EXTRACTION_POLICY,
  mergeChunkLines,
  planReading,
  priceTableByVersion,
  scanBoundaryRisks,
  splitChunk,
  tradeProfile,
  validateTakeoff,
  type ExtractionPolicy,
  type ReadingChunk,
} from "../src/index.js";
import { MORELLEC_LINES } from "./devis-reels/electricite-plomberie-morellec.js";
import { benchAsScan, pagesForPlan, simulateReading, syntheticQuote, type SynthLine, type SynthQuote } from "./support/devis-synthetique.js";

/**
 * LECTURE DES GROS DEVIS (PD-046), sans aucun appel IA : une IA simulée,
 * fidèle aux consignes, lit les pages qu'on lui donne. On vérifie le plan
 * (un appel pour un devis normal, des blocs seulement si nécessaire), la
 * réunion des blocs (aucune ligne perdue, aucun doublon, sections gardées),
 * et qu'une réponse coupée n'est jamais redemandée à l'identique.
 */
const table = priceTableByVersion("anthropic-2026-09-30");
const policy = DEFAULT_EXTRACTION_POLICY;
/** Limite de réponse d'un appel (max_tokens) et réflexion supposée, généreuse. */
const MAX_TOKENS = 16_000;
const THINKING = 4_000;

interface Run {
  strategy: string;
  /** Pages envoyées à chaque appel, dans l'ordre. */
  calls: { pages: number[]; context: number[]; outputTokens: number; truncated: boolean }[];
  lines: SynthLine[];
  dropped: number;
}

/** Ce que fait le serveur : le plan, les blocs, une moitié de bloc si une réponse est coupée, la réunion. */
function read(quote: SynthQuote, options: { sloppy?: boolean; maxTokens?: number; policy?: ExtractionPolicy } = {}): Run {
  const p = options.policy ?? policy;
  const pages = pagesForPlan(quote);
  const plan = planReading(pages, p, table);
  const all = pages.map((x) => x.pageNumber!);
  const calls: Run["calls"] = [];
  const readChunk = (chunk: ReadingChunk): { chunk: ReadingChunk; lines: SynthLine[] }[] => {
    const whole = chunk.context.length === 0 && chunk.pages.length === all.length;
    const r = simulateReading(quote, whole ? all : [...chunk.pages, ...chunk.context].sort((a, b) => a - b), whole ? null : chunk.pages, options.sloppy);
    const truncated = r.outputTokens + THINKING > (options.maxTokens ?? MAX_TOKENS);
    calls.push({ pages: chunk.pages, context: chunk.context, outputTokens: r.outputTokens, truncated });
    if (!truncated) return [{ chunk, lines: r.lines }];
    const halves = splitChunk(chunk, pages, p);
    if (!halves) throw new Error("page_too_dense");
    return halves.flatMap(readChunk);
  };
  const parts = plan.chunks.flatMap(readChunk);
  const single = parts.length === 1 && parts[0]!.chunk.context.length === 0;
  const merged = single ? { lines: parts[0]!.lines, dropped: 0 } : mergeChunkLines(parts);
  return { strategy: plan.strategy, calls, lines: merged.lines, dropped: merged.dropped };
}

describe("le plan de lecture se décide seul, avant tout appel", () => {
  it.each([
    [20, 1],
    [100, 1],
  ])("devis de %i lignes (texte) : un seul appel, comme avant", (count, calls) => {
    const run = read(syntheticQuote(count));
    expect(run.strategy).toBe("single");
    expect(run.calls).toHaveLength(calls);
    expect(run.calls[0]!.context).toEqual([]);
  });

  it.each([300, 500])("devis de %i lignes : lu en blocs, aucune réponse coupée, aucune relance", (count) => {
    for (const route of ["text", "vision"] as const) {
      const quote = syntheticQuote(count, route);
      const plan = planReading(pagesForPlan(quote), policy, table);
      const run = read(quote);
      expect(run.strategy).toBe("split");
      expect(run.calls.some((c) => c.truncated)).toBe(false);
      // Autant d'appels que de blocs prévus : pas un de plus.
      expect(run.calls).toHaveLength(plan.chunks.length);
      expect(plan.chunks.length).toBeLessThanOrEqual(policy.maxCallsPerAnalysis);
      // Chaque bloc reste loin de la limite de réponse.
      for (const c of run.calls) expect(c.outputTokens + THINKING).toBeLessThan(MAX_TOKENS);
    }
  });

  it("chaque page est lue par un seul bloc, chaque bloc voit tout ce qui le précède et la page suivante", () => {
    const plan = planReading(pagesForPlan(syntheticQuote(500)), policy, table);
    const owned = plan.chunks.flatMap((c) => c.pages);
    expect(owned).toEqual([...new Set(owned)].sort((a, b) => a - b));
    expect(owned).toHaveLength(pagesForPlan(syntheticQuote(500)).length);
    plan.chunks.forEach((c, i) => {
      const before = plan.chunks.slice(0, i).flatMap((x) => x.pages);
      const next = plan.chunks[i + 1]?.pages[0];
      expect(c.context).toEqual([...before, ...(next ? [next] : [])]);
    });
  });

  it("le coût est estimé avant l'appel, bloc par bloc", () => {
    const plan = planReading(pagesForPlan(syntheticQuote(500, "vision")), policy, table);
    expect(plan.estimate.calls).toHaveLength(plan.chunks.length);
    expect(plan.estimate.totalMicroUsd).toBe(plan.estimate.calls.reduce((s, c) => s + c.microUsd, 0));
    // Très gros devis scanné : bien en dessous du garde-fou par défaut (3 € ≈ 3,26 $).
    expect(plan.estimate.totalMicroUsd).toBeLessThan(3_000_000);
  });
});

describe("réunion des blocs : exactement les lignes du devis", () => {
  const strip = (l: SynthLine) => ({ designation: l.designation, quantity: l.quantity, unit: l.unit, section: l.section, sourceRefs: l.sourceRefs, sourcePages: l.sourcePages });

  it.each([300, 500])("%i lignes : aucune ligne perdue, aucun doublon, sections conservées (texte et scan)", (count) => {
    for (const route of ["text", "vision"] as const) {
      const quote = syntheticQuote(count, route);
      const run = read(quote);
      expect(run.lines.map(strip)).toEqual(quote.lines.map(strip));
    }
  });

  it("même si l'IA désobéit (reliquat de ligne coupée, ligne d'une page de contexte), le code l'écarte", () => {
    const quote = syntheticQuote(500);
    const run = read(quote, { sloppy: true });
    expect(run.dropped).toBeGreaterThan(0);
    expect(run.lines.map(strip)).toEqual(quote.lines.map(strip));
  });

  it("une ligne coupée en bas de page n'est comptée qu'une fois, avec ses deux références", () => {
    const quote = syntheticQuote(500);
    const cut = quote.lines.filter((l) => new Set(l.sourceRefs.map((r) => r.split(":")[0])).size > 1);
    expect(cut.length).toBeGreaterThan(0);
    const run = read(quote);
    for (const l of cut) expect(run.lines.filter((x) => x.designation === l.designation)).toEqual([l]);
  });

  it("même résultat métier qu'une lecture en un seul appel", () => {
    // 300 lignes en un appel (budget sans limite) contre 300 lignes en blocs.
    const quote = syntheticQuote(300);
    const once = read(quote, { policy: { ...policy, outputBudgetPerCall: 1e9 }, maxTokens: 1e9 });
    const split = read(quote);
    expect(once.calls).toHaveLength(1);
    expect(split.calls.length).toBeGreaterThan(1);
    expect(split.lines).toEqual(once.lines);
  });
});

describe("une réponse coupée n'est jamais redemandée à l'identique", () => {
  it("le bloc est relu en deux moitiés : jamais deux fois les mêmes pages", () => {
    // Limite volontairement basse : le plan prévoyait un appel, la réponse est coupée.
    const quote = syntheticQuote(100);
    const run = read(quote, { maxTokens: 8_000 });
    expect(run.calls[0]!.truncated).toBe(true);
    const asked = run.calls.map((c) => c.pages.join(","));
    expect(new Set(asked).size).toBe(asked.length);
    expect(run.lines).toEqual(quote.lines);
  });

  it("une page seule trop dense ne se recoupe pas : échec net, pas de relance", () => {
    const quote = syntheticQuote(30, "text", 200);
    const pages = pagesForPlan(quote);
    expect(pages).toHaveLength(1);
    expect(splitChunk({ pages: [1], context: [] }, pages, policy)).toBeNull();
    expect(() => read(quote, { maxTokens: 1_000 })).toThrow("page_too_dense");
  });
});

describe("Morellec (165 lignes, 9 pages scannées) : cas de non-régression", () => {
  // Le vrai devis fait 9 pages scannées.
  const quote = benchAsScan(MORELLEC_LINES, 9);
  const lines = (run: Run) => run.lines.map((l) => ({ designation: l.designation, quantity: l.quantity || null, unit: l.unit || null, section: l.section }));
  const truth = MORELLEC_LINES.map((l) => ({ designation: l.designation, quantity: l.quantity, unit: l.unit, section: l.section ?? [] }));

  it("lu en 2 blocs sans réponse coupée, toutes les lignes et toutes les sections retrouvées", () => {
    expect(quote.pages).toHaveLength(9);
    const run = read(quote);
    expect(run.strategy).toBe("split");
    expect(run.calls).toHaveLength(2);
    expect(run.calls.some((c) => c.truncated)).toBe(false);
    expect(lines(run)).toEqual(truth);
  });

  it("même écran artisan qu'avec les lignes du devis : compteurs et décisions identiques", () => {
    const profile = tradeProfile("electrical,plumbing");
    const screen = (ls: { designation: string; quantity: string | null; unit: string | null; section: readonly string[] }[]) => {
      const withIds = ls.map((l, i) => ({ ...l, id: `l${i}`, confirmed: false, enteredByArtisan: false }));
      const validation = validateTakeoff(
        withIds.map((l) => ({ id: l.id, designation: l.designation, quantityRaw: l.quantity, unitRaw: l.unit, section: l.section, source: "client_quote" as const })),
        profile,
      );
      const v = artisanView(withIds, validation, { needs: [], questions: [] });
      return { counts: v.counts, decisions: v.decisions.map((d) => [d.key, d.lineIds.length]) };
    };
    expect(screen(lines(read(quote)))).toEqual(screen(truth));
  });
});

describe("rapport : stratégie et coût par taille de devis", () => {
  it("génère docs/lecture-gros-devis.md", async () => {
    const eur = (microUsd: number) => (microUsd / 1_000_000) * 0.92;
    const fmt = (n: number) => n.toLocaleString("fr-FR");
    const money = (n: number) => `${eur(n).toFixed(2).replace(".", ",")} €`;
    const THINKING_PROBABLE = 2_000;
    const rows: string[] = [];
    const cases: [string, SynthQuote][] = [
      ["20 lignes, PDF texte", syntheticQuote(20)],
      ["100 lignes, PDF texte", syntheticQuote(100)],
      ["300 lignes, PDF texte", syntheticQuote(300)],
      ["300 lignes, scan", syntheticQuote(300, "vision")],
      ["500 lignes, PDF texte", syntheticQuote(500)],
      ["500 lignes, scan", syntheticQuote(500, "vision")],
      ["Morellec réel (165 lignes, 9 pages scannées)", benchAsScan(MORELLEC_LINES, 9)],
    ];
    for (const [label, quote] of cases) {
      const pages = pagesForPlan(quote);
      const plan = planReading(pages, policy, table);
      const run = read(quote);
      const input = plan.estimate.calls.reduce((s, c) => s + c.inputTokens + c.imageTokens, 0);
      const outHigh = plan.estimate.calls.reduce((s, c) => s + c.outputTokens, 0);
      const visible = run.calls.reduce((s, c) => s + c.outputTokens, 0);
      const probable = (input * 2 + (visible + THINKING_PROBABLE * run.calls.length) * 10);
      rows.push(
        `| ${label} | ${pages.length} | ${plan.strategy === "single" ? "1 appel" : `${plan.chunks.length} blocs (${plan.chunks.map((c) => c.pages.length).join(" + ")} pages)`} | ${run.calls.length} | ${fmt(input)} | ${fmt(visible)} (haut : ${fmt(outHigh)}) | ${fmt(Math.max(...run.calls.map((c) => c.outputTokens)))} | ${money(probable)} | ${money(plan.estimate.totalMicroUsd)} |`,
      );
    }
    const doc = `# Lecture des gros devis — stratégie et coût

Fichier GÉNÉRÉ par \`packages/domain/test/lecture-gros-devis.test.ts\` : ne pas modifier à la main.

Chaque devis est lu par une IA simulée fidèle aux consignes (aucun appel payant). Modèle et
réglage inchangés : \`claude-sonnet-5-5\`, effort « high », 2 $ / 10 $ par million de tokens en
entrée / sortie, 1 $ = 0,92 €. Tokens comptés à 3 caractères par token (convention prudente de
l'application). Limite de réponse d'un appel : 16 000 tokens.

| Devis | Pages | Stratégie choisie | Appels | Entrée (tokens) | Réponse visible (tokens) | Plus grosse réponse d'un appel | Coût probable¹ | Coût estimé haut² |
|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}

1. Entrée et réponse visible simulées, plus ${fmt(THINKING_PROBABLE)} tokens de réflexion du modèle par appel (non
   mesurable sans vrai appel : le coût réel de chaque appel est enregistré et visible dans « Mon compte »).
2. Estimation haute calculée avant tout appel par le plan de lecture : c'est elle qui décide du découpage
   et qui sert de garde-fou (3 € par document par défaut, \`AI_ANALYSIS_MAX_EUR\`).
`;
    await expect(doc).toMatchFileSnapshot("../../../docs/lecture-gros-devis.md");
  });
});

describe("mesures de la lecture (télémétrie) : frontières de scan", () => {
  it("compte séparément les lignes hors bloc et les doublons de frontière", () => {
    const quote = syntheticQuote(500);
    const pages = pagesForPlan(quote);
    const plan = planReading(pages, policy, table);
    const parts = plan.chunks.map((c) => ({ chunk: c, lines: simulateReading(quote, [...c.pages, ...c.context].sort((a, b) => a - b), c.pages, true).lines }));
    const merged = mergeChunkLines(parts);
    expect(merged.droppedOutsideBlock).toBeGreaterThan(0);
    expect(merged.dropped).toBe(merged.droppedOutsideBlock + merged.droppedDuplicates);
    expect(parts.reduce((n, p) => n + p.lines.length, 0)).toBe(merged.lines.length + merged.dropped);

    // Doublon de frontière : le reste d'une ligne coupée, relu par le bloc suivant.
    const a: ReadingChunk = { pages: [1], context: [2] };
    const b: ReadingChunk = { pages: [2], context: [1] };
    const boundary = mergeChunkLines([
      { chunk: a, lines: [{ sourceRefs: ["1:036", "2:001"], sourcePages: [] }] },
      { chunk: b, lines: [{ sourceRefs: ["2:001"], sourcePages: [] }, { sourceRefs: ["2:002"], sourcePages: [] }] },
    ]);
    expect(boundary).toMatchObject({ droppedOutsideBlock: 0, droppedDuplicates: 1 });
    expect(boundary.lines).toHaveLength(2);
  });

  it("scan : une ligne à cheval entre deux blocs, ou un bloc qui commence sans quantité, est signalée — rien n'est modifié", () => {
    const a: ReadingChunk = { pages: [1, 2], context: [3] };
    const b: ReadingChunk = { pages: [3, 4], context: [1, 2, 5] };
    const line = (pagesOf: number[], quantity: string | null) => ({ sourceRefs: [], sourcePages: pagesOf, quantity });
    const parts = [
      { chunk: a, lines: [line([1], "3"), line([2, 3], "12")] },
      { chunk: b, lines: [line([3], null), line([4], "5")] },
    ];
    expect(scanBoundaryRisks(parts, new Set([1, 2, 3, 4]))).toEqual([{ pages: [2, 3], signals: ["ligne_a_cheval", "debut_sans_quantite"] }]);
    // Frontière nette : rien à signaler.
    const clean = [
      { chunk: a, lines: [line([2], "3")] },
      { chunk: b, lines: [line([3], "4")] },
    ];
    expect(scanBoundaryRisks(clean, new Set([1, 2, 3, 4]))).toEqual([]);
    // Pages en texte : les doublons s'écartent par référence de ligne, pas de risque à signaler.
    expect(scanBoundaryRisks(parts, new Set())).toEqual([]);
  });
});
