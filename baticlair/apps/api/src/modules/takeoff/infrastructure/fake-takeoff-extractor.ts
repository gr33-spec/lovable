import { parseUnit } from "@baticlair/domain";
import type { ExtractionAttempt, ExtractionRequest, TakeoffExtractor } from "../application/takeoff-extractor.js";

const NUMBER = /^\d[\d\s]*(,\d+)?$/;

/** Quantité + unité : dans deux colonnes (« 1 250 · u ») ou une seule (« 1 250 u »). */
function findQuantity(cols: string[]): { index: number; quantity: string; unit: string } | null {
  for (let i = 1; i < cols.length; i++) {
    const cell = cols[i]!;
    if (NUMBER.test(cell) && parseUnit(cols[i + 1] ?? "")) return { index: i, quantity: cell, unit: cols[i + 1]! };
    const joined = /^(\d[\d\s]*(?:,\d+)?)\s+(\S+)$/.exec(cell);
    if (joined && parseUnit(joined[2]!)) return { index: i, quantity: joined[1]!, unit: joined[2]! };
  }
  return null;
}

/**
 * Extraction SIMULÉE (développement et tests uniquement, refusée en ligne
 * par la configuration). Règle fixe : une ligne en colonnes « réf ·
 * désignation · quantité · unité · … » devient une ligne de matériau.
 * Elle permet de tester tout le parcours sans appel payant.
 */
export class FakeTakeoffExtractor implements TakeoffExtractor {
  readonly provider = "fake";

  async extract(request: ExtractionRequest): Promise<ExtractionAttempt> {
    const lines: NonNullable<ExtractionAttempt["output"]>["lines"] = [];
    for (const raw of request.numberedText.split("\n")) {
      const m = /^\[(\d+:\d+)\]\s(.*)$/.exec(raw);
      if (!m) continue;
      const cols = m[2]!.split(/\s{2,}/);
      const found = findQuantity(cols);
      if (!found || found.index < 1) continue;
      lines.push({
        designation: cols[found.index - 1]!,
        quantity: found.quantity,
        unit: found.unit,
        reference: found.index >= 2 ? cols[0]! : null,
        sourceRefs: [m[1]!],
        sourcePages: [],
      });
    }
    const notes = request.imagePages.length > 0 ? [`Pages ${request.imagePages.join(", ")} non lues (extraction simulée).`] : [];
    const inputTokens = Math.ceil(request.numberedText.length / 3) + 2000;
    return {
      provider: this.provider,
      model: "claude-sonnet-5-5",
      usage: { inputTokens, outputTokens: 60 * lines.length + 50 },
      status: "success",
      output: { lines, notes },
      errorCode: null,
      durationMs: 1,
    };
  }
}
