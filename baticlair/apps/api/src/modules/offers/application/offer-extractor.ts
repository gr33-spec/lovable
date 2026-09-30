import { z } from "zod";
import type { DocumentInput, ReadAttempt } from "../../../platform/ai/document-reader.js";

/**
 * Réponse attendue de l'IA pour un devis fournisseur : chaque ligne telle
 * qu'imprimée (montants recopiés, jamais calculés) et la ligne demandée à
 * laquelle elle correspond. Le code fait tous les calculs et contrôles.
 */
export const offerOutputSchema = z.object({
  lines: z.array(
    z.object({
      kind: z.enum(["main", "substitution", "variant", "option", "fee", "deposit", "info"]),
      designation: z.string(),
      reference: z.string().nullable(),
      quantity: z.string().nullable(),
      unit: z.string().nullable(),
      /** Prix unitaire HT tel qu'écrit. */
      unitPrice: z.string().nullable(),
      /** Remise de ligne en pourcentage, telle qu'écrite (« 10 »). */
      discountPercent: z.string().nullable(),
      /** Total HT de la ligne tel qu'écrit. */
      lineTotal: z.string().nullable(),
      /** Contenu d'un conditionnement (« rouleau de 75 m² » → 75, m²). */
      packagingContent: z.object({ quantity: z.string(), unit: z.string() }).nullable(),
      /** Numéro (à partir de 1) de la ligne demandée correspondante, ou null. */
      requestLine: z.number().int().nullable(),
      matchConfidence: z.enum(["sure", "probable", "unsure"]).nullable(),
      doubt: z.string().nullable(),
      sourceRefs: z.array(z.string()),
    }),
  ),
  totalHT: z.string().nullable(),
  totalVAT: z.string().nullable(),
  totalTTC: z.string().nullable(),
  globalDiscountPercent: z.string().nullable(),
  globalDiscountAmount: z.string().nullable(),
  deliveryIncluded: z.boolean().nullable(),
  notes: z.array(z.string()),
});

export type OfferOutput = z.infer<typeof offerOutputSchema>;

export interface RequestedLineForAi {
  designation: string;
  quantity: string | null;
  unit: string | null;
  reference: string | null;
}

export interface OfferExtractionRequest extends DocumentInput {
  tradeLabel: string;
  /** Liste envoyée au fournisseur (copie figée), dans l'ordre. */
  requested: RequestedLineForAi[];
}

export type OfferAttempt = ReadAttempt<OfferOutput>;

/** Port : lecture d'un devis fournisseur par une IA. Un appel = une tentative, toujours rapportée. */
export interface OfferExtractor {
  readonly provider: string;
  extract(request: OfferExtractionRequest): Promise<OfferAttempt>;
}

export const OFFER_EXTRACTOR = Symbol("OFFER_EXTRACTOR");
