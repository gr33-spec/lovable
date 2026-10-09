import { supplyLines } from "@baticlair/domain";
import { z } from "zod";
import type { DocumentInput, ReadAttempt, ReadStatus } from "../../../platform/ai/document-reader.js";

/** Un article écrit dans la ligne (§41.1 « articles ») : rien d'autre que ce qui est écrit. */
const articleSchema = z.object({
  nom: z.string(),
  materiau: z.string().nullable().default(null),
  quantite: z.string().nullable().default(null),
  unite: z.string().nullable().default(null),
  elements: z.string().nullable().default(null),
});

/**
 * Ce que le prompt A (§41.1) dit de plus sur une ligne : son rôle (fourniture, pose…), les articles écrits, le
 * façonnage écrit, et « manque » (ce que le comptoir demanderait encore, jamais une donnée écrite). Gardé avec la ligne.
 */
export const lineReadingSchema = z.object({
  role: z.enum(["fourniture", "pose", "fourniture_et_pose", "hors_quantitatif"]).nullable(),
  articles: z.array(articleSchema),
  faconnage: z.enum(["artisan", "fourni"]).nullable(),
  manque: z.array(z.string()),
});
export type LineReading = z.infer<typeof lineReadingSchema>;

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
      /** Prompt A v12 (§41.1 réécrit) : rôle de la ligne, articles écrits, façonnage, ce que le comptoir demanderait encore. */
      reading: lineReadingSchema.optional(),
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
      /** v12 (§41.1 réécrit) : absents dans une réponse à l'ancien format. */
      role: z.enum(["fourniture", "pose", "fourniture_et_pose", "hors_quantitatif"]).nullable().default(null),
      articles: z.array(articleSchema).nullable().default(null),
      faconnage: z.enum(["artisan", "fourni"]).nullable().default(null),
      manque: z.array(z.string()).nullable().default(null),
    }),
  ),
  notes: z.array(z.string()).default([]),
  contexte: z.record(z.string(), z.string()).nullable().default(null),
});

export type ExtractionWire = z.infer<typeof extractionWireSchema>;

/**
 * Le format ENVOYÉ à l'API (structured outputs) : la même réponse que `extractionWireSchema`, avec moins de champs
 * « valeur ou vide ». L'API refuse au-delà de 16 unions par demande (« Parameters with union types : 16 ») : la v12 en
 * comptait 18 et chaque lecture échouait d'emblée. Ici : -1 pour « aucune section », un objet vide pour « aucune
 * dimension », des listes vides pour « aucun article » et « rien ne manque ». La réponse est relue par
 * `extractionWireSchema`, qui accepte les deux formes.
 */
export const extractionFormatSchema = z.object({
  sections: z.array(z.array(z.string())),
  lignes: z.array(
    z.object({
      des: z.string(),
      qte: z.string().nullable(),
      unite: z.string().nullable(),
      ref: z.string().nullable(),
      src: z.array(z.string()),
      /** Numéro de la suite de titres dans `sections`, ou -1. */
      sec: z.number().int(),
      doute: z.string().nullable(),
      ouvrage: z.string().nullable(),
      materiau: z.string().nullable(),
      /** « donnée → valeur avec unité », objet vide si rien n'est écrit. */
      dimensions: z.record(z.string(), z.string()),
      confiance: z.enum(["sur", "doute"]).nullable(),
      role: z.enum(["fourniture", "pose", "fourniture_et_pose", "hors_quantitatif"]).nullable(),
      articles: z.array(articleSchema),
      faconnage: z.enum(["artisan", "fourni"]).nullable(),
      manque: z.array(z.string()),
    }),
  ),
  notes: z.array(z.string()),
  contexte: z.record(z.string(), z.string()).nullable(),
});

/** Remet la réponse compacte dans la forme complète, sans rien perdre ni inventer. */
export function decodeExtraction(wire: ExtractionWire): ExtractionOutput {
  return {
    lines: wire.lignes
      // Déplacement, nettoyage, échafaudage (rôle « hors_quantitatif » du §41.1) ne sont pas des ouvrages à quantifier : ils
      // sont gardés pour la liste repliée « N lignes sans fourniture » (§49.9), jamais calculés. TVA, remise, acompte ne
      // sont pas des lignes du devis. Une ligne de POSE est gardée : elle ne commande rien, mais ses données valent.
      .filter((l) => !/^(?:tva|remise|acompte|escompte|total|sous[- ]total)\b/i.test(l.des.trim()))
      .map((l) => (l.ouvrage === "hors_quantitatif" ? { ...l, role: "hors_quantitatif" as const } : l))
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
          // Un objet vide (format envoyé à l'API) veut dire « aucune dimension écrite ».
          dimensions: l.dimensions && Object.keys(l.dimensions).length > 0 ? l.dimensions : null,
          ...(l.role !== null || l.articles !== null || l.faconnage !== null || l.manque !== null
            ? {
                reading: {
                  role: l.role,
                  articles: l.articles ?? [],
                  faconnage: l.faconnage,
                  manque: (l.manque ?? []).map((m) => m.trim()).filter((m) => m.length > 0),
                },
              }
            : {}),
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

/**
 * §49.9 : « une ligne du quantitatif nomme une fourniture, jamais la phrase du devis ». Une prestation écrite en phrase
 * (« Remplacement unitaire d'une tuile cassée… ») est enregistrée comme la fourniture que la lecture en extrait (ses
 * sous-lignes, puis son texte) : une ligne par article, à la place de la phrase, avec sa source et ses titres.
 */
export function suppliedLines(lines: ExtractionOutput["lines"]): ExtractionOutput["lines"] {
  const refs = lines.map((l, i) => ({ ref: String(i), designation: l.designation, quantity: l.quantity, unit: l.unit }));
  const readings = new Map(
    lines.flatMap((l, i) =>
      l.reading
        ? [[String(i), { role: l.reading.role ?? null, articles: l.reading.articles.map((a) => ({ nom: a.nom, materiau: a.materiau ?? null, quantite: a.quantite ?? null, unite: a.unite ?? null, elements: a.elements ?? null })), faconnage: l.reading.faconnage ?? null, manque: l.reading.manque }] as const]
        : [],
    ),
  );
  const supplied = supplyLines(refs, readings);
  return supplied.lines.map((s) => {
    if (!("parent" in s)) return lines[Number(s.ref)]!;
    const parent = lines[Number(s.parent)]!;
    const reading = supplied.readings.get(s.ref)!;
    return {
      ...parent,
      designation: s.designation,
      quantity: s.quantity,
      unit: s.unit,
      reference: null,
      material: reading.articles[0]?.materiau ?? null,
      reading: { role: reading.role, articles: reading.articles, faconnage: reading.faconnage, manque: reading.manque },
    };
  });
}
