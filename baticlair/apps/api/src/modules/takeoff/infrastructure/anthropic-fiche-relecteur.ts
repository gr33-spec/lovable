import { AnthropicDocumentReader } from "../../../platform/ai/anthropic-document-reader.js";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import { FICHE_RELECTURE_PROMPT, relectureDossier, relectureSystem, relectureWireSchema, type FicheRelecteur, type RelectureInput, type RelectureWire } from "../application/fiche-relecture.js";

/** §51.2 par Claude : la fiche, la question et la réponse « Autre » en texte, jamais le PDF. Le modèle de la lecture (le plus capable). */
export class AnthropicFicheRelecteur implements FicheRelecteur {
  readonly provider = "anthropic";
  private readonly reader: AnthropicDocumentReader;

  constructor(apiKey: string, model: string, fetchImpl?: typeof fetch) {
    this.reader = new AnthropicDocumentReader(apiKey, model, "medium", fetchImpl);
  }

  relire(input: RelectureInput): Promise<ReadAttempt<RelectureWire>> {
    return this.reader.read({
      system: relectureSystem(input),
      schema: relectureWireSchema,
      document: { numberedText: relectureDossier(input), imagePdf: null, imagePages: [] },
      documentName: "dossier",
      tag: `${FICHE_RELECTURE_PROMPT.id}-v${FICHE_RELECTURE_PROMPT.version}`,
    }) as Promise<ReadAttempt<RelectureWire>>;
  }
}
