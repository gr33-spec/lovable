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
/**
 * Le BUDGET de l'interprète (Greg, 7 novembre 2026 : « plafond total de test de 1 $ ou 500 interprétations maximum ») :
 * chaque appel est enregistré (journal des appels IA : nombre, coût, erreurs) ; au-delà du plafond, plus aucun appel, le
 * code seul répond. Un crédit épuisé chez le fournisseur coupe aussi l'IA (signalé à l'admin), sans jamais rien acheter.
 */
export interface BudgetInterpretation {
  /** Peut-on encore appeler ? (appels et coût cumulés sous les plafonds, crédit non signalé épuisé.) */
  autorise(): Promise<boolean>;
  /** Enregistre l'appel (réussi ou non) avec sa consommation réelle. */
  enregistrer(e: { companyId: string; userId: string | null; attempt: ReadAttempt<unknown> | null; provider: string }): Promise<void>;
}

export class InterpretationService {
  constructor(
    private readonly interpreteur: Interpreteur | null,
    private readonly journal: (e: { provider: string; model: string; status: string; microUsd: number | null; questions: number }) => void = () => undefined,
    private readonly budget: BudgetInterpretation | null = null,
    /** Lot 6 : une réponse du modèle que la validation du serveur refuse (incohérente) remonte à l'admin. */
    private readonly incoherent: (e: { companyId: string; questions: number; refusees: number }) => Promise<void> = async () => undefined,
  ) {}

  get actif(): boolean {
    return !!this.interpreteur;
  }

  async interpreter(questions: readonly QuestionNumerotee[], texte: string, qui: { companyId: string; userId: string | null } | null = null): Promise<ResultatInterpretation> {
    const code = interpreterReponsesNumerotees(questions, texte);
    const restantes = questionsPourIa(questions, code, texte);
    if (!this.interpreteur || restantes.length === 0) return { ia: false, reponses: code };
    // Le plafond d'abord : au-delà, aucun appel (le code seul répond).
    if (this.budget && !(await this.budget.autorise().catch(() => false))) return { ia: false, reponses: code };
    const r = await this.interpreteur.interpreter(restantes, texte).catch(() => null);
    let microUsd: number | null = null;
    try {
      if (r) microUsd = computeAiCost(r.model, r.usage, PRICE_TABLES[PRICE_TABLES.length - 1]!).totalMicroUsd;
    } catch {
      microUsd = null;
    }
    this.journal({ provider: this.interpreteur.provider, model: r?.model ?? "?", status: r?.status ?? "error", microUsd, questions: restantes.length });
    if (this.budget && qui) await this.budget.enregistrer({ ...qui, attempt: r, provider: this.interpreteur.provider }).catch(() => undefined);
    if (!r || r.status !== "success" || !r.output) {
      if (r?.status === "invalid_output" && qui) await this.incoherent({ companyId: qui.companyId, questions: restantes.length, refusees: restantes.length }).catch(() => undefined);
      return { ia: false, reponses: code };
    }
    const validees = validerInterpretation(restantes, texte, r.output);
    // Le modèle dit « compris » mais le code refuse la valeur (hors boutons, nombre non dit, mots ajoutés) : incohérent.
    const refusees = r.output.reponses.filter((x) => x.statut === "compris" && validees.find((v) => v.numero === x.numero)?.statut !== "compris").length;
    if (refusees > 0 && qui) await this.incoherent({ companyId: qui.companyId, questions: restantes.length, refusees }).catch(() => undefined);
    return { ia: true, reponses: fusionnerInterpretations(code, validees) };
  }
}

export const ETIQUETTE_INTERPRETATION = `${INTERPRETATION_PROMPT.id}-v${INTERPRETATION_PROMPT.version}`;
