import { AnthropicDocumentReader } from "../../../platform/ai/anthropic-document-reader.js";
import { scopeInstruction, siteNotesInstruction, TAKEOFF_PROMPT, takeoffSystemPrompt } from "../application/prompt.js";
import {
  decodeExtraction,
  extractionWireSchema,
  type ExtractionAttempt,
  type ExtractionRequest,
  type TakeoffExtractor,
} from "../application/takeoff-extractor.js";

/**
 * Lecture d'un devis client par Claude : chaque ligne cite le devis ; le code
 * vérifie ensuite chaque ligne contre le texte (lecteur commun, platform/ai).
 */
export class AnthropicTakeoffExtractor implements TakeoffExtractor {
  readonly provider = "anthropic";
  private readonly reader: AnthropicDocumentReader;

  constructor(apiKey: string, model: string, effort: "low" | "medium" | "high" | "xhigh" | "max", fetchImpl?: typeof fetch) {
    this.reader = new AnthropicDocumentReader(apiKey, model, effort, fetchImpl);
  }

  async extract(request: ExtractionRequest): Promise<ExtractionAttempt> {
    const extra = [request.scope ? scopeInstruction(request.scope.pages) : null, siteNotesInstruction(request.siteNotes)].filter(Boolean).join("\n\n");
    const attempt = await this.reader.read({
      system: takeoffSystemPrompt(request.tradeLabel, request.materialFamilies, request.workItems ?? []),
      schema: extractionWireSchema,
      document: request,
      documentName: "devis",
      ...(extra ? { extra } : {}),
      tag: `${TAKEOFF_PROMPT.id}-v${TAKEOFF_PROMPT.version}`,
    });
    return { ...attempt, output: attempt.output ? decodeExtraction(attempt.output) : null };
  }
}
