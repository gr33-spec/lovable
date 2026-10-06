import type { CompletionWire } from "@baticlair/domain";
import { AnthropicDocumentReader } from "../../../platform/ai/anthropic-document-reader.js";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import { completionWireSchema, QUANTITATIF_PROMPT, quantitatifSystem, type QuantitatifInput, type QuantitatifPass } from "../application/quantitatif-pass.js";

/** Appel IA n° 2 par Claude : le dossier en texte (devis lu + liste du moteur), jamais le PDF. */
export class AnthropicQuantitatifPass implements QuantitatifPass {
  readonly provider = "anthropic";
  private readonly reader: AnthropicDocumentReader;

  constructor(apiKey: string, model: string, fetchImpl?: typeof fetch) {
    this.reader = new AnthropicDocumentReader(apiKey, model, "high", fetchImpl);
  }

  complete(input: QuantitatifInput): Promise<ReadAttempt<CompletionWire>> {
    return this.reader.read({
      system: quantitatifSystem(input),
      schema: completionWireSchema,
      document: { numberedText: input.dossier, imagePdf: null, imagePages: [] },
      documentName: "dossier",
      tag: `${QUANTITATIF_PROMPT.id}-v${QUANTITATIF_PROMPT.version}`,
    }) as Promise<ReadAttempt<CompletionWire>>;
  }
}
