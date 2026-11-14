import type { InterpretationWire, QuestionNumerotee } from "@baticlair/domain";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import type { Interpreteur } from "../application/interpretation.service.js";

/**
 * DOUBLE DE TEST (jamais en ligne, `AI_PROVIDER=fake`) : il joue le rôle du modèle sans rien coûter. Il rattache les
 * synonymes courants (« métal gris » → zinc, « plastique » → PVC) et, pour le prouver, propose aussi une valeur
 * inventée sur une réponse écrite (« … Edilians ») : le code doit la refuser.
 */
const SYNONYMES: Record<string, RegExp> = { zinc: /m[ée]tal gris|zingu/i, pvc: /plastique/i, alu: /aluminium/i };

export class FakeInterpreteur implements Interpreteur {
  readonly provider = "fake";
  async interpreter(questions: readonly QuestionNumerotee[], texte: string): Promise<ReadAttempt<InterpretationWire>> {
    const reponses = questions.map((q) => {
      const bouton = q.options.find((o) => SYNONYMES[o.value]?.test(texte) && !(o.value === "pvc" && /pas (?:le |du )?plastique/i.test(texte)));
      if (bouton) return { numero: q.numero, statut: "compris" as const, valeur: bouton.value };
      if (q.numerique) {
        const n = /(\d+(?:[.,]\d+)?)/.exec(texte)?.[1];
        return n ? { numero: q.numero, statut: "compris" as const, valeur: n.replace(",", ".") } : { numero: q.numero, statut: "sans_reponse" as const, valeur: "" };
      }
      if (q.libre) {
        const m = /(?:tuiles?|teinte)\s+([a-zà-ü ]{3,40}?)(?:[,.]|$)/i.exec(texte)?.[1]?.trim();
        return m ? { numero: q.numero, statut: "compris" as const, valeur: /invente/i.test(texte) ? `${m} Edilians` : m } : { numero: q.numero, statut: "sans_reponse" as const, valeur: "" };
      }
      return { numero: q.numero, statut: "ambigu" as const, valeur: "" };
    });
    return { provider: "fake", model: "claude-haiku-4-5", usage: { inputTokens: 900, outputTokens: 120 }, status: "success", output: { reponses }, errorCode: null, durationMs: 1 };
  }
}
