/**
 * « IMPORTER UN DOCUMENT » (Greg, 31 octobre 2026) : un seul bouton pour un devis, une liste, une photo, un PDF ou une
 * capture ; le TYPE se détermine sans le demander à l'artisan, en code (aucun appel IA, rien de décompté) :
 * - une photo ou une capture (image) : la lecture de liste, qui sort les lignes telles qu'écrites (elle lit aussi un bon
 *   ou un devis de négoce photographié) ;
 * - un PDF avec du texte : un devis s'il en a le titre (« DEVIS », « Devis n° … ») ou les marques (montants, total HT/TTC,
 *   TVA, prix unitaire) ; sinon
 *   une liste ;
 * - un PDF sans texte (scanné) : le devis, comme avant (la lecture du devis lit les pages scannées).
 */
export type NatureDocument = "devis" | "liste";

const MARQUES_DEVIS = [
  /\bdevis\b/i,
  /\bfacture\b/i,
  /\btotal\s*(?:h\.?\s*t|t\.?\s*t\.?\s*c|ht|ttc)\b/i,
  /\b(?:montant|net à payer|acompte)\b/i,
  /\bt\.?\s*v\.?\s*a\b/i,
  /\bprix\s+unitaire\b|\bp\.?\s*u\.?\s*(?:h\.?\s*t)?\b/i,
  /\d[\d\s.]*,\d{2}\s*(?:€|eur\b)/i,
];

export function natureDuDocument(fichier: { type: string; nom: string }, texte: string | null): NatureDocument {
  const image = fichier.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(fichier.nom);
  if (image) return "liste";
  const t = (texte ?? "").replace(/\s+/g, " ").trim();
  if (t.length < 40) return "devis";
  // Un titre de devis (« DEVIS », « Devis n° 2026-018 », « Devis D-2026-018 ») suffit à lui seul.
  if (/\bDEVIS\b/.test(t) || /\bdevis\s*(?:n\s?[°o.]|num[ée]ro|#)\s*\S+/i.test(t) || /\bdevis\s+[A-Z]{1,4}[-.]?\d/.test(t)) return "devis";
  const marques = MARQUES_DEVIS.filter((m) => m.test(t)).length;
  return marques >= 2 ? "devis" : "liste";
}
