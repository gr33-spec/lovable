import { AnthropicDocumentReader } from "../../../platform/ai/anthropic-document-reader.js";
import { decodeLecture, decodeLignes, decodeReperage, decodeSynthese, lignesWireSchema, syntheseWireSchema, LECTURE_PROMPT, lectureSystemPrompt, lectureWireSchema, REPERAGE_PROMPT, type Reperage, reperageSystemPrompt, reperageWireSchema, type LectureReader, type LectureRequest } from "../application/lecture-reader.js";
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
  private readonly rapide: AnthropicDocumentReader | null;
  /** Les tranches d'un gros devis (lignes seulement) : le modèle rapide, réflexion moyenne (décisions du 24 octobre 2026). */
  private readonly tranches: AnthropicDocumentReader | null;

  /** `fastModel` : le modèle rapide du repérage des métiers (texte seul, quelques secondes). */
  constructor(apiKey: string, model: string, effort: "low" | "medium" | "high" | "xhigh" | "max", fetchImpl?: typeof fetch, fastModel?: string) {
    this.reader = new AnthropicDocumentReader(apiKey, model, effort, fetchImpl);
    this.rapide = fastModel ? new AnthropicDocumentReader(apiKey, fastModel, "low", fetchImpl) : null;
    this.tranches = fastModel ? new AnthropicDocumentReader(apiKey, fastModel, "medium", fetchImpl) : null;
  }

  async reperer(numberedText: string): Promise<ReadAttempt<Reperage> | null> {
    if (!this.rapide) return null;
    const attempt = await this.rapide.read({
      system: reperageSystemPrompt(),
      schema: reperageWireSchema,
      // Le texte seul (les titres de lots peuvent être loin) : 60 000 caractères au plus, lus en quelques secondes.
      document: { numberedText: numberedText.slice(0, 60000), imagePdf: null, imagePages: [] },
      documentName: "devis",
      tag: `${REPERAGE_PROMPT.id}-v${REPERAGE_PROMPT.version}`,
    });
    return { ...attempt, output: attempt.output ? decodeReperage(attempt.output) : null };
  }

  async lire(request: LectureRequest): Promise<ReadAttempt<LectureDevis>> {
    const extra = [siteNotesInstruction(request.siteNotes), request.consigne ?? null].filter(Boolean).join("\n\n") || null;
    const base = {
      system: lectureSystemPrompt({ trade: request.trade, tradeLabel: request.tradeLabel, referentiel: request.referentiel }),
      document: request.document,
      documentName: "devis",
      ...(extra ? { extra } : {}),
      tag: `${LECTURE_PROMPT.id}-v${LECTURE_PROMPT.version}${request.etape ? `-${request.etape}` : ""}`,
    };
    const fin = <T>(attempt: ReadAttempt<T>, decode: (w: T) => LectureDevis | null): ReadAttempt<LectureDevis> => {
      const output = attempt.output ? decode(attempt.output) : null;
      if (attempt.status === "success" && !output) return { ...attempt, status: "invalid_output", output: null, errorCode: "schema" };
      return { ...attempt, output };
    };
    if (request.etape === "lignes") return fin(await (this.tranches ?? this.reader).read({ ...base, schema: lignesWireSchema }), decodeLignes);
    if (request.etape === "synthese") return fin(await this.reader.read({ ...base, schema: syntheseWireSchema }), decodeSynthese);
    return fin(await this.reader.read({ ...base, schema: lectureWireSchema }), decodeLecture);
  }
}
