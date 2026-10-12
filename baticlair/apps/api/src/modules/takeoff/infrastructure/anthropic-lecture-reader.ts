import { AnthropicDocumentReader } from "../../../platform/ai/anthropic-document-reader.js";
import { decodeLecture, LECTURE_PROMPT, lectureSystemPrompt, lectureWireSchema, type LectureReader, type LectureRequest } from "../application/lecture-reader.js";
import { siteNotesInstruction } from "../application/prompt.js";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import type { LectureDevis } from "@baticlair/domain";

/**
 * §51.5 : la lecture du devis par Claude (le modèle de lecture, le plus capable), en un appel : le devis complet en PDF,
 * son texte, le référentiel exporté ; la réponse structurée est relue par le code (`decodeLecture`).
 */
export class AnthropicLectureReader implements LectureReader {
  readonly provider = "anthropic";
  private readonly reader: AnthropicDocumentReader;

  constructor(apiKey: string, model: string, effort: "low" | "medium" | "high" | "xhigh" | "max", fetchImpl?: typeof fetch) {
    this.reader = new AnthropicDocumentReader(apiKey, model, effort, fetchImpl);
  }

  async lire(request: LectureRequest): Promise<ReadAttempt<LectureDevis>> {
    const extra = siteNotesInstruction(request.siteNotes);
    const attempt = await this.reader.read({
      system: lectureSystemPrompt({ trade: request.trade, tradeLabel: request.tradeLabel, referentiel: request.referentiel }),
      schema: lectureWireSchema,
      document: request.document,
      documentName: "devis",
      ...(extra ? { extra } : {}),
      tag: `${LECTURE_PROMPT.id}-v${LECTURE_PROMPT.version}`,
    });
    const output = attempt.output ? decodeLecture(attempt.output) : null;
    if (attempt.status === "success" && !output) return { ...attempt, status: "invalid_output", output: null, errorCode: "schema" };
    return { ...attempt, output };
  }
}
