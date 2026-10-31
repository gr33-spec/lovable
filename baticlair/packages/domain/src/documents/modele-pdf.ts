/**
 * LES MODÈLES DU PDF « DEMANDE DE PRIX » (Greg, 31 octobre 2026, « Refonte de l'expérience de création des quantitatifs »,
 * points 8, 9, 10 et 12) : trois présentations d'UN MÊME document (mêmes données, un seul générateur), une couleur
 * principale choisie parmi quelques teintes, retenues dans le compte. Fichier sans dépendance : l'API et le site le lisent.
 */
export const MODELES_PDF = ["essentiel", "classique", "detaille"] as const;
export type ModelePdf = (typeof MODELES_PDF)[number];
export const MODELE_PDF_DEFAUT: ModelePdf = "classique";
export const estModelePdf = (v: unknown): v is ModelePdf => typeof v === "string" && (MODELES_PDF as readonly string[]).includes(v);

export const MODELES_PDF_INFO: Record<ModelePdf, { nom: string; texte: string }> = {
  essentiel: { nom: "Essentiel", texte: "Une page sobre : la liste et l'adresse de réponse." },
  classique: { nom: "Classique", texte: "La liste, le chantier en bref et tes coordonnées." },
  detaille: { nom: "Détaillé", texte: "Tout, numéroté : chantier, description, lignes et conditions." },
};

/** La couleur principale : quelques teintes sûres à l'impression ; la première est celle de Mobiiz. */
export const COULEURS_PDF = [
  { id: "mobiiz", nom: "Jaune Mobiiz", hex: "#FED206" },
  { id: "encre", nom: "Noir", hex: "#130901" },
  { id: "ardoise", nom: "Ardoise", hex: "#334155" },
  { id: "bleu", nom: "Bleu", hex: "#1D4ED8" },
  { id: "vert", nom: "Vert", hex: "#15803D" },
  { id: "brique", nom: "Brique", hex: "#B3360F" },
] as const;
export type CouleurPdf = (typeof COULEURS_PDF)[number]["id"];
export const COULEUR_PDF_DEFAUT: CouleurPdf = "mobiiz";
export const estCouleurPdf = (v: unknown): v is CouleurPdf => COULEURS_PDF.some((c) => c.id === v);
export const hexCouleurPdf = (id: string | null | undefined): string => (COULEURS_PDF.find((c) => c.id === id) ?? COULEURS_PDF[0]).hex;

/** Le titre du document (point 9 du brief). */
export const TITRE_PDF = "Demande de prix — Matériaux";
/** Le bloc de réponse (point 10, mot pour mot). */
export const PHRASE_REPONSE_PDF = "Merci d'envoyer votre proposition commerciale à l'adresse suivante :";
/**
 * Le texte facultatif (point 10, complété par Claude : la phrase du brief s'arrêtait sur « … » ; point 11 : les frais de
 * livraison à part).
 */
export const CONDITIONS_PDF =
  "Merci d'indiquer vos meilleurs prix, vos disponibilités et vos conditions de livraison, frais de livraison à part. Vous pouvez proposer des produits équivalents en le précisant sur la ligne.";

/**
 * « 400 pièces » → { quantite: "400", unite: "pièces" } ; « 4 longueurs de 4 m (13 m à couvrir) » → « 4 » et
 * « longueurs de 4 m (13 m à couvrir) ». Une quantité qui ne commence pas par un nombre reste entière, sans unité.
 */
export function quantiteEtUnite(texte: string): { quantite: string; unite: string } {
  const m = /^\s*(\d[\d\s  ]*(?:[.,]\d+)?)\s*(.*)$/.exec(texte);
  if (!m || !m[2]?.trim()) return { quantite: texte.trim(), unite: "" };
  return { quantite: m[1]!.trim(), unite: m[2].trim() };
}
