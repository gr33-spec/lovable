/**
 * Ce que le prompt A (§41.1, réécrit le 2026-10-06) dit d'une ligne en plus de son texte : son rôle (une ligne de pose
 * ne commande rien), les articles réellement écrits, le façonnage écrit, et « manque » : ce qu'un vendeur de comptoir
 * demanderait encore pour servir la ligne, jamais une donnée écrite (§49.4 : les questions de comptoir en partent).
 */
export interface QuoteLineReading {
  role: "fourniture" | "pose" | "fourniture_et_pose" | "hors_quantitatif" | null;
  articles: { nom: string; materiau: string | null; quantite: string | null; unite: string | null; elements: string | null }[];
  faconnage: "artisan" | "fourni" | null;
  manque: string[];
}
