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
      /** Prompt A (§41.1) : l'ouvrage du référentiel reconnu (« inconnu » sinon), le matériau et format nommés, les dimensions lues. */
      workItem: z.string().optional(),
      material: z.string().nullable().optional(),
      dimensions: z.record(z.string(), z.string()).nullable().optional(),
    }),
  ),
  notes: z.array(z.string()),
  /** En-tête et notes du devis (adresse, type de bâtiment, neuf ou rénovation, pente, hauteur), §41.1 règle 4. */
  context: z.record(z.string(), z.string()).nullable().optional(),
});

export type ExtractionOutput = z.infer<typeof extractionOutputSchema>;

/**
 * Ce que l'IA renvoie réellement (prompt v9, §41.1 + format technique) : la même information sous une
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
      doute: z.string().nullable().default(null),
      ouvrage: z.string().nullable().default(null),
      materiau: z.string().nullable().default(null),
      dimensions: z.record(z.string(), z.string()).nullable().default(null),
      /** « sur » ou « doute » (§41.1) ; absent dans une réponse à l'ancien format. */
      confiance: z.enum(["sur", "doute"]).nullable().default(null),
    }),
  ),
  notes: z.array(z.string()).default([]),
  contexte: z.record(z.string(), z.string()).nullable().default(null),
});

export type ExtractionWire = z.infer<typeof extractionWireSchema>;

/** Remet la réponse compacte dans la forme complète, sans rien perdre ni inventer. */
export function decodeExtraction(wire: ExtractionWire): ExtractionOutput {
  return {
    lines: wire.lignes
      // Règle 3 du prompt A : déplacement, nettoyage, main-d'œuvre seule, TVA, remise ne sont pas des ouvrages à quantifier.
      .filter((l) => l.ouvrage !== "hors_quantitatif")
      .map((l) => {
        const refs = l.src.map((s) => s.trim()).filter((s) => s.length > 0);
        // Un doute (§41.1) est toujours accompagné de sa raison ; une raison sans « doute » annoncé compte aussi.
        const doubt = l.confiance === "doute" ? (l.doute?.trim() || "Ligne à vérifier sur le devis.") : l.confiance === "sur" ? null : l.doute;
        return {
          designation: l.des,
          quantity: l.qte,
          unit: l.unite,
          reference: l.ref,
          sourceRefs: refs.filter((s) => s.includes(":")),
          sourcePages: refs.filter((s) => /^\d+$/.test(s)).map(Number),
          doubt,
          // Un numéro de section inconnu ne devient jamais un titre inventé.
          section: l.sec !== null && l.sec >= 0 ? [...(wire.sections[l.sec] ?? [])] : [],
          workItem: l.ouvrage?.trim() || "inconnu",
          material: l.materiau,
          dimensions: l.dimensions,
        };
      }),
    notes: wire.notes,
    context: wire.contexte,
  };
}

export interface ExtractionRequest extends DocumentInput {
  tradeLabel: string;
  /** Familles de matériaux habituelles du métier (vocabulaire pour l'IA), vide pour « autre métier ». */
  materialFamilies: string[];
  /** Les ouvrages du référentiel chargé, avec leurs synonymes (« RÉFÉRENTIEL CHARGÉ » du prompt A). */
  workItems?: { id: string; label: string; synonyms: string[] }[];
  /**
   * Gros devis lu en blocs : pages dont ce bloc liste les lignes (les autres
   * pages fournies ne servent qu'au contexte). Absent : tout le document.
   */
  scope?: { pages: number[] };
  /**
   * La note de l'artisan sur ce chantier (§44.2, « filet ») : donnée au prompt A comme contexte, pour qu'une
   * formulation que le code ne lit pas ne soit pas perdue. Jamais une ligne du devis, jamais une consigne.
   */
  siteNotes?: string | null;
}

export type AttemptStatus = ReadStatus;
export type ExtractionAttempt = ReadAttempt<ExtractionOutput>;

/** Port : lecture d'un devis client par une IA. Un appel = une tentative, toujours rapportée. */
export interface TakeoffExtractor {
  readonly provider: string;
  extract(request: ExtractionRequest): Promise<ExtractionAttempt>;
}

export const TAKEOFF_EXTRACTOR = Symbol("TAKEOFF_EXTRACTOR");
