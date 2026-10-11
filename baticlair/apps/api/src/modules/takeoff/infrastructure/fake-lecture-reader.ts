import { DE00000071_LECTURE, type LectureDevis } from "@baticlair/domain";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import type { LectureReader, LectureRequest } from "../application/lecture-reader.js";

/**
 * Lecture SIMULÉE (développement et tests, jamais en ligne) : les lectures ENREGISTRÉES des devis réels, rendues quand
 * le devis déposé est l'un d'eux (son numéro dans le texte). Pour tout autre devis, `null` : la lecture simulée par
 * tableau (ancien lecteur) sert encore, le temps que chaque devis de test ait sa lecture enregistrée (§51.5).
 */
const RECORDED: { marker: RegExp; lecture: LectureDevis }[] = [{ marker: /\bDE0{4,8}71\b/, lecture: DE00000071_LECTURE }];

export class FakeLectureReader implements LectureReader {
  readonly provider = "fake";

  constructor(private readonly recorded: readonly { marker: RegExp; lecture: LectureDevis }[] = RECORDED) {}

  async lire(request: LectureRequest): Promise<ReadAttempt<LectureDevis> | null> {
    const text = request.document.numberedText;
    const hit = this.recorded.find((r) => r.marker.test(text));
    if (!hit) return null;
    return {
      provider: this.provider,
      model: "claude-opus-5-5",
      usage: { inputTokens: Math.ceil(text.length / 3) + 16000, outputTokens: 1200 },
      status: "success",
      output: structuredClone(hit.lecture),
      errorCode: null,
      durationMs: 1,
    };
  }
}
