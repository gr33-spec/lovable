import {
  ASSISTANT_IA_PROMPT,
  PRICE_TABLES,
  computeAiCost,
  lireDescription,
  validerAssistantIa,
  type AssistantIaWire,
  type EchangeAssistant,
  type LigneAssistantIa,
  type NatureAssistant,
} from "@baticlair/domain";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import type { BudgetInterpretation } from "./interpretation.service.js";

export const TACHE_ASSISTANT = "assistant_description";
export const ETIQUETTE_ASSISTANT = `${ASSISTANT_IA_PROMPT.id}-v${ASSISTANT_IA_PROMPT.version}`;

/** Le port : découper ce que dit l'artisan en articles et poser les questions du comptoir (l'IA, ou son double de test). */
/** Une photo jointe par l'artisan (chantier, liste, devis) : déjà vérifiée par le contrôleur (type, taille). */
export interface PhotoAssistant {
  nom: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  bytes: Uint8Array;
}

export interface Decoupeur {
  readonly provider: string;
  decouper(echanges: readonly EchangeAssistant[], photos?: readonly PhotoAssistant[]): Promise<ReadAttempt<AssistantIaWire>>;
}

export interface ReponseAssistantIa {
  /** Le modèle a-t-il répondu ? (false : éteint, plafond atteint ou panne ; le code seul a lu la phrase.) */
  ia: boolean;
  /**
   * Ce que montre la photo jointe : « chantier » (matériaux proposés ici), « liste » ou « devis » (à lire comme un document),
   * « autre » ; « texte » sans photo ; null quand le modèle n'a pas répondu (l'écran fait comme avant).
   */
  nature: NatureAssistant | null;
  /** Les matériaux retenus d'une photo de chantier, à renvoyer tels quels dans la suite de la conversation (`de: "photo"`). */
  vu: string | null;
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
  private parLeCode(echanges: readonly EchangeAssistant[], photo = false): ReponseAssistantIa {
    // Une photo sans le modèle : rien n'est lu ici, l'écran la traite comme avant (lecture d'une liste ou d'un devis).
    if (photo) return { ia: false, nature: null, vu: null, lignes: [], questions: [], message: "" };
    const dernier = [...echanges].reverse().find((e) => e.de === "artisan")?.texte ?? "";
    const r = lireDescription(dernier);
    return { ia: false, nature: "texte", vu: null, lignes: [...r.lignes, ...r.aConfirmer], questions: [], message: "" };
  }

  async decrire(echanges: readonly EchangeAssistant[], qui: { companyId: string; userId: string | null }, photos: readonly PhotoAssistant[] = []): Promise<ReponseAssistantIa> {
    const photo = photos.length > 0;
    if (!this.decoupeur) return this.parLeCode(echanges, photo);
    // Le plafond d'abord : au-delà, aucun appel (le code seul répond).
    if (this.budget && !(await this.budget.autorise().catch(() => false))) return this.parLeCode(echanges, photo);
    const r = await this.decoupeur.decouper(echanges, photos).catch(() => null);
    let microUsd: number | null = null;
    try {
      if (r) microUsd = computeAiCost(r.model, r.usage, PRICE_TABLES[PRICE_TABLES.length - 1]!).totalMicroUsd;
    } catch {
      microUsd = null;
    }
    if (this.budget) await this.budget.enregistrer({ ...qui, attempt: r, provider: this.decoupeur.provider }).catch(() => undefined);
    if (!r || r.status !== "success" || !r.output) {
      this.journal({ provider: this.decoupeur.provider, model: r?.model ?? "?", status: r?.status ?? "error", microUsd, lignes: 0, ecartees: 0 });
      return this.parLeCode(echanges, photo);
    }
    const v = validerAssistantIa(echanges, r.output, { photo });
    this.journal({ provider: this.decoupeur.provider, model: r.model, status: r.status, microUsd, lignes: v.lignes.length, ecartees: v.ecartees });
    // Une photo de liste, de devis, ou sans rien d'utile : rien n'est recopié ici, l'écran sait quoi en faire.
    if (v.nature !== "texte" && v.nature !== "chantier") return { ia: true, nature: v.nature, vu: null, lignes: [], questions: [], message: v.message };
    // Ni ligne ni question : le modèle n'a rien rendu d'utilisable ; le code relit la phrase (jamais moins bien qu'avant).
    if (v.lignes.length === 0 && v.questions.length === 0) {
      if (photo) return { ia: true, nature: "autre", vu: null, lignes: [], questions: [], message: v.message };
      const code = this.parLeCode(echanges);
      return code.lignes.length > 0 ? code : { ...code, message: v.message };
    }
    const message = v.ecartees > 0 ? [v.message, "Je n'ai pas tout retenu : redis ce qui manque, avec ses mesures."].filter(Boolean).join(" ") : v.message;
    const vus = v.lignes.filter((l) => l.vuSurPhoto).map((l) => l.libelle);
    return { ia: true, nature: v.nature, vu: photo && vus.length ? vus.join(" ; ") : null, lignes: v.lignes, questions: v.questions, message };
  }
}
