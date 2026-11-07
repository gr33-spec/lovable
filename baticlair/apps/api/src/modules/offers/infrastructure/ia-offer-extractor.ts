import type { FabriqueIa, LecteurIa } from "../../../platform/ai/lecteur-ia.js";
import { offerOutputSchema, type OfferAttempt, type OfferExtractionRequest, type OfferExtractor } from "../application/offer-extractor.js";
import { OFFER_PROMPT, offerSystemPrompt, requestedListText } from "../application/prompt.js";

/** Lecture d'un devis fournisseur par l'IA (lecteur commun, platform/ai). */
export class IaOfferExtractor implements OfferExtractor {
  readonly provider: string;
  private readonly reader: LecteurIa;

  constructor(ia: FabriqueIa, model: string, effort: "low" | "medium" | "high" | "xhigh" | "max") {
    this.reader = ia({ model, effort });
    this.provider = this.reader.provider;
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
