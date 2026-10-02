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

/**
 * Ce que l'IA renvoie réellement (prompt v7) : la même information sous une
 * forme compacte. Chaque suite de titres n'est écrite qu'une fois (les lignes
 * y renvoient par son numéro), les références texte et pages image tiennent
 * dans un seul champ, les noms de champ sont courts.
 */
export const extractionWireSchema = z.object({
  sections: z.array(z.array(z.string())),
  lignes: z.array(
    z.object({
      des: z.string(),
      qte: z.string().nullable(),
      unite: z.string().nullable(),
      ref: z.string().nullable(),
      /** « page:ligne » pour une ligne du texte, « page » pour une ligne lue sur une page image. */
      src: z.array(z.string()),
      /** Numéro de la suite de titres dans `sections`, ou null. */
      sec: z.number().int().nullable(),
      doute: z.string().nullable(),
    }),
  ),
  notes: z.array(z.string()),
});

export type ExtractionWire = z.infer<typeof extractionWireSchema>;

/** Remet la réponse compacte dans la forme complète, sans rien perdre ni inventer. */
export function decodeExtraction(wire: ExtractionWire): ExtractionOutput {
  return {
    lines: wire.lignes.map((l) => {
      const refs = l.src.map((s) => s.trim()).filter((s) => s.length > 0);
      return {
        designation: l.des,
        quantity: l.qte,
        unit: l.unite,
        reference: l.ref,
        sourceRefs: refs.filter((s) => s.includes(":")),
        sourcePages: refs.filter((s) => /^\d+$/.test(s)).map(Number),
        doubt: l.doute,
        // Un numéro de section inconnu ne devient jamais un titre inventé.
        section: l.sec !== null && l.sec >= 0 ? [...(wire.sections[l.sec] ?? [])] : [],
      };
    }),
    notes: wire.notes,
  };
}

export interface ExtractionRequest extends DocumentInput {
  tradeLabel: string;
  /** Familles de matériaux habituelles du métier (vocabulaire pour l'IA), vide pour « autre métier ». */
  materialFamilies: string[];
  /**
   * Gros devis lu en blocs : pages dont ce bloc liste les lignes (les autres
   * pages fournies ne servent qu'au contexte). Absent : tout le document.
   */
  scope?: { pages: number[] };
}

export type AttemptStatus = ReadStatus;
export type ExtractionAttempt = ReadAttempt<ExtractionOutput>;

/** Port : lecture d'un devis client par une IA. Un appel = une tentative, toujours rapportée. */
export interface TakeoffExtractor {
  readonly provider: string;
  extract(request: ExtractionRequest): Promise<ExtractionAttempt>;
}

export const TAKEOFF_EXTRACTOR = Symbol("TAKEOFF_EXTRACTOR");
