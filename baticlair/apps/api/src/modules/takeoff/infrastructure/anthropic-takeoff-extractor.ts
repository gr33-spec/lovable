import { AnthropicDocumentReader } from "../../../platform/ai/anthropic-document-reader.js";
import { TAKEOFF_PROMPT, takeoffSystemPrompt } from "../application/prompt.js";
import {
  extractionOutputSchema,
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

  extract(request: ExtractionRequest): Promise<ExtractionAttempt> {
    return this.reader.read({
      system: takeoffSystemPrompt(request.tradeLabel, request.materialFamilies),
      schema: extractionOutputSchema,
      document: request,
      documentName: "devis",
      tag: `${TAKEOFF_PROMPT.id}-v${TAKEOFF_PROMPT.version}`,
    });
  }
}
