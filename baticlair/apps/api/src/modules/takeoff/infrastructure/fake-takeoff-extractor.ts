import { parseUnit } from "@baticlair/domain";
import { fakeRows } from "../../../platform/ai/fake-table.js";
import type { ExtractionAttempt, ExtractionRequest, TakeoffExtractor } from "../application/takeoff-extractor.js";

/**
 * Extraction SIMULÉE (développement et tests uniquement, refusée en ligne
 * par la configuration). Règle fixe : une ligne en colonnes « réf ·
 * désignation · quantité · unité · … » devient une ligne de matériau.
 * Elle permet de tester tout le parcours sans appel payant.
 */
export class FakeTakeoffExtractor implements TakeoffExtractor {
  readonly provider = "fake";

  async extract(request: ExtractionRequest): Promise<ExtractionAttempt> {
    const lines: NonNullable<ExtractionAttempt["output"]>["lines"] = fakeRows(request.numberedText)
      .filter((row) => row.index >= 1)
      .map((row) => ({
        designation: row.cols[row.index - 1]!,
        quantity: row.quantity,
        unit: row.unit,
        reference: row.index >= 2 ? row.cols[0]! : null,
        sourceRefs: [row.ref],
        sourcePages: [],
        // Règle simulée : un conditionnement sans contenu indiqué est un doute.
        doubt: parseUnit(row.unit) === "PAQUET" ? "Combien de pièces par paquet ?" : null,
        section: [],
      }));
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
