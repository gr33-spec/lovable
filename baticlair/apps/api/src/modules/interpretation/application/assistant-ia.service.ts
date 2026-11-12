import {
  ASSISTANT_IA_PROMPT,
  PRICE_TABLES,
  computeAiCost,
  lireDescription,
  validerAssistantIa,
  type AssistantIaWire,
  type EchangeAssistant,
  type LigneAssistantIa,
} from "@baticlair/domain";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import type { BudgetInterpretation } from "./interpretation.service.js";

export const TACHE_ASSISTANT = "assistant_description";
export const ETIQUETTE_ASSISTANT = `${ASSISTANT_IA_PROMPT.id}-v${ASSISTANT_IA_PROMPT.version}`;

/** Le port : découper ce que dit l'artisan en articles et poser les questions du comptoir (l'IA, ou son double de test). */
export interface Decoupeur {
  readonly provider: string;
  decouper(echanges: readonly EchangeAssistant[]): Promise<ReadAttempt<AssistantIaWire>>;
}

export interface ReponseAssistantIa {
  /** Le modèle a-t-il répondu ? (false : éteint, plafond atteint ou panne ; le code seul a lu la phrase.) */
  ia: boolean;
  lignes: LigneAssistantIa[];
  questions: { texte: string; choix: string[] }[];
  message: string;
}

/**
 * L'ASSISTANT CONNECTÉ À L'IA (Greg, 12 novembre 2026) : le modèle découpe la phrase dite et pose les questions du
 * comptoir ; ce qu'il rend est revalidé par le code (`validerAssistantIa` : aucune quantité, aucun format, aucun article
 * que l'artisan n'a pas dit). Éteint, au-delà du plafond ou en panne : le code seul lit le dernier message
 * (`lireDescription`), comme avant. Rien n'est enregistré ici : la liste naît quand l'artisan touche « Ajouter à ma liste ».
 */
export class AssistantIaService {
  constructor(
    private readonly decoupeur: Decoupeur | null,
    private readonly journal: (e: { provider: string; model: string; status: string; microUsd: number | null; lignes: number; ecartees: number }) => void = () => undefined,
    private readonly budget: BudgetInterpretation | null = null,
  ) {}

  get actif(): boolean {
    return !!this.decoupeur;
  }

  /** Le code seul : la dernière phrase de l'artisan, lue comme avant. */
  private parLeCode(echanges: readonly EchangeAssistant[]): ReponseAssistantIa {
    const dernier = [...echanges].reverse().find((e) => e.de === "artisan")?.texte ?? "";
    const r = lireDescription(dernier);
    return { ia: false, lignes: [...r.lignes, ...r.aConfirmer], questions: [], message: "" };
  }

  async decrire(echanges: readonly EchangeAssistant[], qui: { companyId: string; userId: string | null }): Promise<ReponseAssistantIa> {
    if (!this.decoupeur) return this.parLeCode(echanges);
    // Le plafond d'abord : au-delà, aucun appel (le code seul répond).
    if (this.budget && !(await this.budget.autorise().catch(() => false))) return this.parLeCode(echanges);
    const r = await this.decoupeur.decouper(echanges).catch(() => null);
    let microUsd: number | null = null;
    try {
      if (r) microUsd = computeAiCost(r.model, r.usage, PRICE_TABLES[PRICE_TABLES.length - 1]!).totalMicroUsd;
    } catch {
      microUsd = null;
    }
    if (this.budget) await this.budget.enregistrer({ ...qui, attempt: r, provider: this.decoupeur.provider }).catch(() => undefined);
    if (!r || r.status !== "success" || !r.output) {
      this.journal({ provider: this.decoupeur.provider, model: r?.model ?? "?", status: r?.status ?? "error", microUsd, lignes: 0, ecartees: 0 });
      return this.parLeCode(echanges);
    }
    const v = validerAssistantIa(echanges, r.output);
    this.journal({ provider: this.decoupeur.provider, model: r.model, status: r.status, microUsd, lignes: v.lignes.length, ecartees: v.ecartees });
    // Ni ligne ni question : le modèle n'a rien rendu d'utilisable ; le code relit la phrase (jamais moins bien qu'avant).
    if (v.lignes.length === 0 && v.questions.length === 0) {
      const code = this.parLeCode(echanges);
      return code.lignes.length > 0 ? code : { ...code, message: v.message };
    }
    const message = v.ecartees > 0 ? [v.message, "Je n'ai pas tout retenu : redis ce qui manque, avec ses mesures."].filter(Boolean).join(" ") : v.message;
    return { ia: true, lignes: v.lignes, questions: v.questions, message };
  }
}
