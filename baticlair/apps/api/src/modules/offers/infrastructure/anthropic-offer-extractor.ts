import { AnthropicDocumentReader } from "../../../platform/ai/anthropic-document-reader.js";
import { offerOutputSchema, type OfferAttempt, type OfferExtractionRequest, type OfferExtractor } from "../application/offer-extractor.js";
import { OFFER_PROMPT, offerSystemPrompt, requestedListText } from "../application/prompt.js";

/** Lecture d'un devis fournisseur par Claude (lecteur commun, platform/ai). */
export class AnthropicOfferExtractor implements OfferExtractor {
  readonly provider = "anthropic";
  private readonly reader: AnthropicDocumentReader;

  constructor(apiKey: string, model: string, effort: "low" | "medium" | "high" | "xhigh" | "max", fetchImpl?: typeof fetch) {
    this.reader = new AnthropicDocumentReader(apiKey, model, effort, fetchImpl);
  }

  extract(request: OfferExtractionRequest): Promise<OfferAttempt> {
    return this.reader.read({
      system: offerSystemPrompt(request.tradeLabel),
      schema: offerOutputSchema,
      document: request,
      documentName: "devis du fournisseur",
      extra: requestedListText(request.requested),
      tag: `${OFFER_PROMPT.id}-v${OFFER_PROMPT.version}`,
    });
  }
}
