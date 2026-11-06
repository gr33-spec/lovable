import {
  INTERPRETATION_PROMPT,
  PRICE_TABLES,
  computeAiCost,
  fusionnerInterpretations,
  interpreterReponsesNumerotees,
  questionsPourIa,
  validerInterpretation,
  type InterpretationWire,
  type QuestionNumerotee,
  type ReponseInterpretee,
} from "@baticlair/domain";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";

/** Le port : rattacher une réponse libre aux questions (l'IA, ou son double de test). */
export interface Interpreteur {
  readonly provider: string;
  interpreter(questions: readonly QuestionNumerotee[], texte: string): Promise<ReadAttempt<InterpretationWire>>;
}

export interface ResultatInterpretation {
  /** L'IA a-t-elle été consultée ? (false : interrupteur éteint, rien à lui confier, ou panne : le code seul.) */
  ia: boolean;
  reponses: ReponseInterpretee[];
}

/**
 * LOT 7 : la réponse libre est lue par le CODE ; l'IA, seulement si elle est allumée (`INTERPRETE_IA=on`), reçoit les
 * questions que le code n'a pas comprises ; ce qu'elle rend est revalidé par le code ; le code l'emporte toujours.
 * Une panne de l'IA n'empêche rien : la réponse du code est rendue telle quelle.
 */
export class InterpretationService {
  constructor(
    private readonly interpreteur: Interpreteur | null,
    private readonly journal: (e: { provider: string; model: string; status: string; microUsd: number | null; questions: number }) => void = () => undefined,
  ) {}

  get actif(): boolean {
    return !!this.interpreteur;
  }

  async interpreter(questions: readonly QuestionNumerotee[], texte: string): Promise<ResultatInterpretation> {
    const code = interpreterReponsesNumerotees(questions, texte);
    const restantes = questionsPourIa(questions, code, texte);
    if (!this.interpreteur || restantes.length === 0) return { ia: false, reponses: code };
    const r = await this.interpreteur.interpreter(restantes, texte).catch(() => null);
    let microUsd: number | null = null;
    try {
      if (r) microUsd = computeAiCost(r.model, r.usage, PRICE_TABLES[PRICE_TABLES.length - 1]!).totalMicroUsd;
    } catch {
      microUsd = null;
    }
    this.journal({ provider: this.interpreteur.provider, model: r?.model ?? "?", status: r?.status ?? "error", microUsd, questions: restantes.length });
    if (!r || r.status !== "success" || !r.output) return { ia: false, reponses: code };
    return { ia: true, reponses: fusionnerInterpretations(code, validerInterpretation(restantes, texte, r.output)) };
  }
}

export const ETIQUETTE_INTERPRETATION = `${INTERPRETATION_PROMPT.id}-v${INTERPRETATION_PROMPT.version}`;
