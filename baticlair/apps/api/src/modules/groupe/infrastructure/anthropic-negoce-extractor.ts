import { AnthropicDocumentReader } from "../../../platform/ai/anthropic-document-reader.js";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import { reponseNegoceSchema, type LectureReponseNegoce, type NegoceExtractor, type ReponseLue } from "../application/negoce-extractor.js";
import { consigneDevisNegoce, contexteDuLot, PROMPT_DEVIS_NEGOCE } from "../application/prompt-negoce.js";

/** Lecture du devis d'un négoce par le modèle rapide (Sonnet, `AI_QUANTITATIF_MODEL`) : prix et délai, rien d'autre. */
export class AnthropicNegoceExtractor implements NegoceExtractor {
  readonly provider = "anthropic";
  private readonly reader: AnthropicDocumentReader;

  constructor(apiKey: string, model: string, fetchImpl?: typeof fetch) {
    this.reader = new AnthropicDocumentReader(apiKey, model, "low", fetchImpl);
  }

  lire(demande: LectureReponseNegoce): Promise<ReadAttempt<ReponseLue>> {
    return this.reader.read({
      system: consigneDevisNegoce(),
      schema: reponseNegoceSchema,
      document: demande,
      documentName: "devis du négoce",
      extra: contexteDuLot(demande.lot),
      tag: `${PROMPT_DEVIS_NEGOCE.id}-v${PROMPT_DEVIS_NEGOCE.version}`,
    });
  }
}
