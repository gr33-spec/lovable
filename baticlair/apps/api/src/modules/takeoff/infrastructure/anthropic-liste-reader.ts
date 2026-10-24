import { AnthropicDocumentReader } from "../../../platform/ai/anthropic-document-reader.js";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import { decodeListe, LISTE_PROMPT, listeSystemPrompt, listeWireSchema, type ListeLue, type ListeReader, type ListeRequest } from "../application/liste-reader.js";

/** La lecture d'une liste déjà comptée par Claude : même client que les devis, une image ou un PDF, aucune règle de calcul. */
export class AnthropicListeReader implements ListeReader {
  readonly provider = "anthropic";
  private readonly reader: AnthropicDocumentReader;

  constructor(apiKey: string, model: string, effort: "low" | "medium" | "high" | "xhigh" | "max", fetchImpl?: typeof fetch) {
    this.reader = new AnthropicDocumentReader(apiKey, model, effort, fetchImpl);
  }

  async lire(request: ListeRequest): Promise<ReadAttempt<ListeLue>> {
    const attempt = await this.reader.read({
      system: listeSystemPrompt(),
      schema: listeWireSchema,
      document: request.document,
      documentName: "liste",
      tag: `${LISTE_PROMPT.id}-v${LISTE_PROMPT.version}`,
    });
    const output = attempt.output ? decodeListe(attempt.output) : null;
    if (attempt.status === "success" && !output) return { ...attempt, status: "invalid_output", output: null, errorCode: "schema" };
    return { ...attempt, output };
  }
}
