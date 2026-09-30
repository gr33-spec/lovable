import type { AiUsage } from "@baticlair/domain";
import { z } from "zod";

/** Réponse attendue de l'IA : des lignes qui citent le devis, jamais recopiées de mémoire. */
export const extractionOutputSchema = z.object({
  lines: z.array(
    z.object({
      designation: z.string(),
      quantity: z.string().nullable(),
      unit: z.string().nullable(),
      reference: z.string().nullable(),
      sourceRefs: z.array(z.string()),
      sourcePages: z.array(z.number().int()),
    }),
  ),
  notes: z.array(z.string()),
});

export type ExtractionOutput = z.infer<typeof extractionOutputSchema>;

export interface ExtractionRequest {
  tradeLabel: string;
  /** Lignes numérotées « [2:014] texte » des pages lues en texte (peut être vide). */
  numberedText: string;
  /** PDF réduit aux pages à lire en image (ou le document entier si la lecture locale a échoué). */
  imagePdf: Uint8Array | null;
  /** Numéro d'origine de chaque page de `imagePdf`, dans l'ordre. */
  imagePages: number[];
}

export type AttemptStatus = "success" | "invalid_output" | "refused" | "provider_error" | "timeout";

export interface ExtractionAttempt {
  provider: string;
  /** Modèle réellement appelé (celui renvoyé par le fournisseur). */
  model: string;
  usage: AiUsage;
  status: AttemptStatus;
  output: ExtractionOutput | null;
  errorCode: string | null;
  durationMs: number;
}

/** Port : lecture d'un devis client par une IA. Un appel = une tentative, toujours rapportée. */
export interface TakeoffExtractor {
  readonly provider: string;
  extract(request: ExtractionRequest): Promise<ExtractionAttempt>;
}

export const TAKEOFF_EXTRACTOR = Symbol("TAKEOFF_EXTRACTOR");
