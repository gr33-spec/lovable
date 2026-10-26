import type { FabriqueIa, LecteurIa } from "../../../platform/ai/lecteur-ia.js";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import { decodeListe, LISTE_PROMPT, listeSystemPrompt, listeWireSchema, type ListeLue, type ListeReader, type ListeRequest } from "../application/liste-reader.js";

/** La lecture d'une liste déjà comptée par l'IA : même client que les devis, une image ou un PDF, aucune règle de calcul. */
export class IaListeReader implements ListeReader {
  readonly provider: string;
  private readonly reader: LecteurIa;

  constructor(ia: FabriqueIa, model: string, effort: "low" | "medium" | "high" | "xhigh" | "max") {
    this.reader = ia({ model, effort });
    this.provider = this.reader.provider;
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
