import { z } from "zod";
import type { DocumentInput, ReadAttempt } from "../../../platform/ai/document-reader.js";

/**
 * « J'AI DÉJÀ MA LISTE » (demande du fondateur, 21 octobre 2026) : l'artisan a déjà compté. Une photo d'une liste écrite
 * à la main, un bon ou un devis de négoce, un tableau en PDF ou en capture : la lecture d'image sort les lignes (article,
 * quantité, unité) TELLES QU'ÉCRITES. Aucun calcul de quantitatif, aucune question : la règle numéro un du référentiel
 * (rien d'absent du document) vaut ici plus que partout. Même client que les devis (`AnthropicDocumentReader`).
 */
export const LISTE_PROMPT = { id: "lecture_liste", version: 1 } as const;

export interface ListeLigne {
  designation: string;
  quantite: string | null;
  unite: string | null;
}
export interface ListeLue {
  lignes: ListeLigne[];
}

export interface ListeRequest {
  document: DocumentInput;
  /** Nom du fichier déposé (information pour le suivi ; ne change jamais la lecture). */
  fileName: string;
  trade: string;
}

export interface ListeReader {
  readonly provider: string;
  lire(request: ListeRequest): Promise<ReadAttempt<ListeLue> | null>;
}

export const LISTE_READER = Symbol("LISTE_READER");

/** Au plus 300 lignes : une liste de chantier, pas un catalogue. */
export const LISTE_MAX_LIGNES = 300;

const texte = z.string().max(400);
/** Schéma envoyé à l'API et relu : aucun champ « valeur ou vide » (une chaîne vide dit « absent »). */
export const listeWireSchema = z.object({
  lignes: z.array(z.object({ designation: texte, quantite: z.string().max(60), unite: z.string().max(40) })).max(LISTE_MAX_LIGNES),
});

/** Relecture par le code : espaces nettoyés, lignes sans désignation retirées, vide = absent. Aucun calcul. */
export function decodeListe(raw: z.infer<typeof listeWireSchema>): ListeLue {
  const lignes: ListeLigne[] = [];
  for (const l of raw.lignes) {
    const designation = l.designation.replace(/\s+/g, " ").trim();
    if (!designation) continue;
    lignes.push({ designation, quantite: l.quantite.trim() || null, unite: l.unite.trim() || null });
  }
  return { lignes };
}

/** Les consignes de lecture : mot pour mot, testées (`liste-existante.test.ts`). */
export function listeSystemPrompt(): string {
  return `Tu lis une LISTE DE MATÉRIAUX que l'artisan a déjà comptée lui-même : une liste écrite à la main (photo), un bon de commande ou un devis de négoce (PDF, photo ou capture), ou un tableau. Tu renvoies ses lignes TELLES QU'ELLES SONT ÉCRITES.

RÈGLES, dans l'ordre :
1. Une ligne d'article = une ligne de sortie, dans l'ordre du document. Une ligne qui contient deux articles reste une seule ligne.
2. designation : l'article tel qu'il est écrit (nom, dimensions, teinte, référence si elle est écrite). Tu ne corriges pas, tu ne complètes pas, tu ne traduis pas, tu ne rajoutes aucun mot.
3. quantite : le nombre tel qu'il est écrit (« 1250 », « 12,5 »), sinon "" . Une quantité illisible ou absente reste "" : tu ne devines jamais.
4. unite : l'unité telle qu'elle est écrite (« m », « u », « rouleaux », « sacs », « palettes »), sinon "".
5. AUCUN CALCUL : tu n'additionnes pas, tu ne convertis pas, tu ne multiplies pas, tu ne déduis aucune quantité. Tu n'ajoutes aucun article que le document n'écrit pas, même s'il manquerait à l'ouvrage. Pas de question, pas de remarque.
6. Tu ignores ce qui n'est pas un article à commander : en-têtes, titres, nom ou adresse du client ou du négoce, dates, numéros de bon, prix, montants, totaux, conditions, signatures. Une ligne barrée est ignorée.
7. Un tableau : une ligne par ligne du tableau, les colonnes désignation, quantité, unité lues telles quelles ; les colonnes de prix sont ignorées.

CE QUE TU RENVOIES : un seul objet JSON {"lignes": [{"designation", "quantite", "unite"}]}, rien d'autre.`;
}
