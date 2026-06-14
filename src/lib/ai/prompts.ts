import type { AnalysisType } from "./types";

/**
 * Prompt d'extraction d'un document (devis ou facture) envoyé avec le
 * fichier (PDF ou photo) en bloc `document`/`image` natif (cf. §9).
 */
export function extractionPrompt(type: AnalysisType): string {
  const mot = type === "devis" ? "devis" : "factures";
  return `Tu es un expert en lecture de ${mot} de matériaux du bâtiment. Lis ce document et extrais les lignes d'articles. Réponds UNIQUEMENT en JSON strict, sans texte autour. Format :
{"fournisseur":"","date":"","lignes":[{"designation":"","ref":"","qte":0,"unite":"","pu":0,"total":0}],"totalHT":0,"totalTTC":0,"fraisLivraison":0,"validite":"","conditionsPaiement":""}
Règles : 30 lignes max. Info manquante = "" ou 0. Nombres sans symbole, point décimal.`;
}

/** Prompt de comparaison de plusieurs devis déjà extraits (Pilier 1). */
export const COMPARISON_PROMPT = `Voici plusieurs devis pour un même besoin (JSON). Compare-les pour l'artisan. Rapproche les produits équivalents même nommés différemment. Tiens compte du COÛT TOTAL RÉEL (prix + frais de livraison + délais + conditions de paiement). Donne le moins-disant, l'économie possible (écart entre le total le plus cher et le moins cher), et les points à vérifier (livraison manquante, validité courte, paiement, quantité/prix anormal).
Réponds UNIQUEMENT en JSON strict :
{"mieuxDisant":"","economie":0,"comparaison":[{"produit":"","offres":[{"fournisseur":"","pu":0}],"meilleurFournisseur":""}],"alertes":[""],"resume":""}
resume = 2-3 phrases simples et concrètes pour l'artisan.`;

/** Prompt de vérification d'une facture par rapport à son devis (Pilier 2). */
export const VERIFICATION_PROMPT = `Voici un devis et sa facture (JSON). Vérifie que la facture respecte le devis. Repère : prix facturé > devis, quantités différentes, lignes en double, articles facturés absents du devis. Calcule le surcoût total.
Réponds UNIQUEMENT en JSON strict :
{"conforme":true,"surcout":0,"anomalies":[{"type":"ecart_prix|doublon|quantite|hors_devis","produit":"","devis":0,"facture":0,"impact":0,"detail":""}],"resume":""}`;

/** Prompt de détection de dérive de prix sur l'historique d'un produit (Bilan). */
export const PRICE_DRIFT_PROMPT = `Voici l'historique des prix payés par l'artisan pour un même produit (JSON, avec dates). Détecte les hausses anormales (≥ 15 % d'un coup) en distinguant une hausse annuelle normale. Réponds en JSON : {"alerte":true,"produit":"","ancien":0,"nouveau":0,"hausse":0,"message":""}`;
