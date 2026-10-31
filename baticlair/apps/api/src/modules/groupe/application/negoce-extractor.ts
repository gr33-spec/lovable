import { z } from "zod";
import type { DocumentInput, ReadAttempt } from "../../../platform/ai/document-reader.js";

/**
 * LA LECTURE DU DEVIS D'UN NÉGOCE (parcours groupé, étape 5) : « BatiClair lit le prix et le délai ». Le modèle recopie ce
 * qui est écrit, un palier par ligne de prix (un négoce peut déposer deux devis, par palier de quantité), le délai en
 * jours s'il est écrit ; le code ne calcule rien et garde chaque doute. Jamais appelée sans le devis déposé.
 */
export const reponseNegoceSchema = z.object({
  paliers: z.array(
    z.object({
      designation: z.string(),
      /** La quantité du palier telle qu'écrite (« 46 »), ou vide. */
      quantite: z.string().nullable(),
      unite: z.string().nullable(),
      /** Prix unitaire HT tel qu'écrit. */
      prixUnitaireHt: z.string().nullable(),
      /** Total HT de la ligne tel qu'écrit. */
      totalHt: z.string().nullable(),
    }),
  ),
  /** Le délai de livraison en jours, s'il est écrit. */
  delaiJours: z.number().int().nullable(),
  totalHt: z.string().nullable(),
  doutes: z.array(z.string()),
});
export type ReponseLue = z.infer<typeof reponseNegoceSchema>;

export interface LotPourLecture {
  numero: number;
  designation: string;
  unite: string;
  volumeFerme: string;
  volumeProbable: string;
}

export interface LectureReponseNegoce extends DocumentInput {
  lot: LotPourLecture;
}

export interface NegoceExtractor {
  readonly provider: string;
  lire(demande: LectureReponseNegoce): Promise<ReadAttempt<ReponseLue>>;
}

export const NEGOCE_EXTRACTOR = Symbol("NEGOCE_EXTRACTOR");

/** Un prix par palier, tel qu'enregistré dans la réponse (`reponse_negoce.prix`). */
export interface PrixLu {
  cle: string;
  palier: string | null;
  unite: string | null;
  prixUnitaire: string | null;
  totalHt: string | null;
}

export function prixDesPaliers(lue: ReponseLue, cle: string): PrixLu[] {
  return lue.paliers.map((p) => ({ cle, palier: p.quantite, unite: p.unite, prixUnitaire: p.prixUnitaireHt, totalHt: p.totalHt }));
}

/** lue : au moins un prix ; a_verifier : rien lu de sûr (Greg relit) ; echec : le lecteur n'a pas répondu. */
export function statutDeLecture(tentative: ReadAttempt<ReponseLue> | null): "lue" | "a_verifier" | "echec" {
  if (!tentative) return "a_verifier";
  if (tentative.status !== "success" || !tentative.output) return tentative.status === "invalid_output" ? "a_verifier" : "echec";
  const prix = tentative.output.paliers.some((p) => p.prixUnitaireHt || p.totalHt);
  return prix && tentative.output.doutes.length === 0 ? "lue" : "a_verifier";
}
