import type { z } from "zod";
import type { DocumentInput, ReadAttempt } from "./document-reader.js";

/**
 * LA BRIQUE IA, DERRIÈRE UN SEUL CONTRAT (revue du 26 octobre 2026, lot 1) : le code métier (lecture d'un devis, d'une
 * liste, d'un devis de négoce, relecture d'une réponse « Autre ») ne connaît que `LecteurIa`. Le fournisseur, le modèle, le
 * délai et l'effort se choisissent par configuration (`AI_PROVIDER`, `AI_EXTRACTION_MODEL`, `AI_TIMEOUT_MS`…) ; le prix
 * vient de la grille versionnée du domaine (`ai-cost/pricing.ts`). Adaptateurs : Anthropic (en ligne), réponses
 * enregistrées (tests, démo), et un second fournisseur en squelette (`openai-document-reader.ts`).
 */
export interface ReadRequest<S extends z.ZodType> {
  /** Consignes (mises en cache côté fournisseur quand il le permet). */
  system: string;
  schema: S;
  /**
   * Schéma ENVOYÉ au fournisseur, quand il diffère de celui qui relit la réponse (plafonds d'unions et d'optionnels).
   * Absent : `schema`.
   */
  format?: z.ZodType;
  document: DocumentInput;
  /** Nom du document pour l'IA (« devis », « devis du fournisseur »). */
  documentName: string;
  /** Texte ajouté après le document (liste demandée, contexte…). */
  extra?: string;
  /** Étiquette « prompt-vN » (suivi, et clé des réponses enregistrées). */
  tag: string;
  /**
   * Greg, 17 novembre 2026 (« les lignes une par une pendant la lecture ») : reçoit le texte de la réponse au fur et à
   * mesure qu'il s'écrit (tout le texte déjà reçu, à chaque fois). Sans effet sur la réponse rendue ; un lecteur qui ne
   * sait pas écrire au fil de l'eau ne l'appelle jamais.
   */
  surTexte?: (texte: string) => void;
}

export type EffortIa = "low" | "medium" | "high" | "xhigh" | "max";

/** Un lecteur : un fournisseur et un modèle. Une réponse illisible reste une tentative mesurée, jamais une exception. */
export interface LecteurIa {
  readonly provider: string;
  readonly model: string;
  read<S extends z.ZodType>(request: ReadRequest<S>): Promise<ReadAttempt<z.infer<S>>>;
}

/** Ce que demande un usage : quel modèle, quel effort. */
export interface ChoixModele {
  model: string;
  effort: EffortIa;
  /** `minimale` : écrire sans réfléchir d'abord, quand le modèle le permet. Sans valeur : le modèle décide. */
  reflexion?: "auto" | "minimale";
}

/** Fabrique un lecteur pour un usage ; la seule chose que les modules reçoivent. */
export type FabriqueIa = (choix: ChoixModele) => LecteurIa;
