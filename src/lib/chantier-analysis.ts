import "server-only";
import { prisma } from "@/lib/db";
import { extractDocument, compareDevis, type SupportedMediaType } from "@/lib/ai";
import { saveAnalysis } from "@/lib/analysis";
import { fetchAttachment } from "@/lib/storage";
import type { ComparisonResult, ExtractedDocument } from "@/lib/ai/types";

const ACCEPTED_TYPES: readonly string[] = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_DEVIS = 4;

/** Levée quand un chantier n'a pas assez de devis lisibles pour être comparé. */
export class ChantierAnalysisError extends Error {}

export interface AnalyserChantierResult {
  result: ComparisonResult;
  extracted: ExtractedDocument[];
}

/**
 * Lance la comparaison IA des devis reçus pour un chantier (pièces jointes
 * des réponses fournisseurs), enregistre le résultat sur sa fiche et met à
 * jour son statut (§4 et §6 — "Lancer l'analyse IA").
 */
export async function analyserChantier(userId: string, demandeId: string): Promise<AnalyserChantierResult> {
  const demande = await prisma.demandeDevis.findFirst({
    where: { id: demandeId, userId },
    include: { reponses: { orderBy: { receivedAt: "asc" } } },
  });

  if (!demande) {
    throw new ChantierAnalysisError("Chantier introuvable.");
  }

  const fichiers: { base64: string; mediaType: SupportedMediaType }[] = [];

  for (const reponse of demande.reponses) {
    for (const path of reponse.attachments) {
      if (fichiers.length >= MAX_DEVIS) break;
      const fetched = await fetchAttachment(path);
      if (!fetched || !ACCEPTED_TYPES.includes(fetched.contentType)) continue;
      fichiers.push({ base64: fetched.data.toString("base64"), mediaType: fetched.contentType as SupportedMediaType });
    }
    if (fichiers.length >= MAX_DEVIS) break;
  }

  if (fichiers.length < 2) {
    throw new ChantierAnalysisError(
      "Pas assez de devis lisibles pour lancer la comparaison. Vérifie que les fournisseurs ont répondu avec un devis en pièce jointe (PDF ou photo)."
    );
  }

  const extracted = await Promise.all(fichiers.map((fichier) => extractDocument(fichier, "devis")));
  const result = await compareDevis(extracted);

  await saveAnalysis({ userId, type: "devis", extracted, result, demandeId });

  await prisma.demandeDevis.update({
    where: { id: demandeId },
    data: { status: "comparee", lastAnalysisReponses: demande.reponses.length },
  });

  return { result, extracted };
}
