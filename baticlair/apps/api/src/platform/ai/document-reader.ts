import type { AiUsage } from "@baticlair/domain";

export type ReadStatus = "success" | "invalid_output" | "refused" | "provider_error" | "timeout";

/** Une tentative de lecture par l'IA : toujours rapportée, réussie ou non (coût mesuré). */
export interface ReadAttempt<T> {
  provider: string;
  /** Modèle réellement appelé (celui renvoyé par le fournisseur). */
  model: string;
  usage: AiUsage;
  status: ReadStatus;
  output: T | null;
  errorCode: string | null;
  durationMs: number;
}

/** Ce que l'IA lit d'un document : le texte numéroté des pages propres, l'image des autres. */
export interface DocumentInput {
  /** Lignes numérotées « [2:014] texte » des pages lues en texte (peut être vide). */
  numberedText: string;
  /** PDF réduit aux pages à lire en image (ou le document entier si la lecture locale a échoué). */
  imagePdf: Uint8Array | null;
  /** Numéro d'origine de chaque page de `imagePdf`, dans l'ordre. */
  imagePages: number[];
}
