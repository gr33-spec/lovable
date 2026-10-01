import { z } from "zod";
import type { DocumentInput, ReadAttempt, ReadStatus } from "../../../platform/ai/document-reader.js";

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
      /** Doute sur cette ligne en une phrase courte, ou null si la ligne est claire. */
      doubt: z.string().nullable(),
      /** Titres du devis au-dessus de la ligne, du plus général au plus précis ([] si aucun). */
      section: z.array(z.string()).default([]),
    }),
  ),
  notes: z.array(z.string()),
});

export type ExtractionOutput = z.infer<typeof extractionOutputSchema>;

export interface ExtractionRequest extends DocumentInput {
  tradeLabel: string;
  /** Familles de matériaux habituelles du métier (vocabulaire pour l'IA), vide pour « autre métier ». */
  materialFamilies: string[];
}

export type AttemptStatus = ReadStatus;
export type ExtractionAttempt = ReadAttempt<ExtractionOutput>;

/** Port : lecture d'un devis client par une IA. Un appel = une tentative, toujours rapportée. */
export interface TakeoffExtractor {
  readonly provider: string;
  extract(request: ExtractionRequest): Promise<ExtractionAttempt>;
}

export const TAKEOFF_EXTRACTOR = Symbol("TAKEOFF_EXTRACTOR");
