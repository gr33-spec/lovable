import type { AnalysisType } from "./types";

/**
 * Prompt d'extraction d'un document (devis ou facture) envoyé avec le fichier
 * en bloc natif. Placé dans le message système pour mieux séparer les
 * instructions du document à analyser.
 */
export function extractionPrompt(type: AnalysisType): string {
  const mot = type === "devis" ? "devis" : "facture";
  return `Tu es un expert comptable spécialisé dans les chantiers BTP en France. Lis attentivement ce ${mot} (photo ou PDF de matériaux ou de main-d'œuvre) et extrais toutes les informations structurées.

IMPORTANT : Réponds UNIQUEMENT en JSON strict, sans aucun texte avant ni après.

Format attendu :
{"fournisseur":"Nom de la société émettrice (vendeur, pas le client)","date":"YYYY-MM-DD ou '' si absente","lignes":[{"designation":"Libellé complet de l'article ou prestation","ref":"Référence article ou ''","qte":1,"unite":"u|m²|ml|m³|kg|l|h|forfait","pu":0.00,"total":0.00}],"totalHT":0.00,"totalTTC":0.00,"fraisLivraison":0.00,"validite":"ex: '30 jours' ou 'jusqu'au 15/07/2026' ou ''","conditionsPaiement":"ex: 'Comptant', '30 jours net', '30% acompte' ou ''"}

RÈGLES STRICTES :
- Extrais jusqu'à 50 lignes. Si le document en contient plus, extrait les 50 premières.
- Tous les prix en HT (hors taxes). Si seul le TTC est visible, divise par 1.20 (TVA 20%) ou par le bon diviseur si la TVA est précisée (5.5% → 1.055, 10% → 1.10).
- Remises globales : ajoute une ligne séparée avec pu négatif et designation "Remise globale X%".
- Frais de livraison : cherche "port", "livraison", "transport", "franco". Franco de port = 0. Montant livraison indiqué → extrait ce montant HT dans fraisLivraison.
- Article sans quantité explicite : mets qte = 1.
- Nombres : point décimal, sans symbole (€, %, etc.), sans espace de séparation.
- Info manquante : "" pour texte, 0 pour nombre.
- Si le document est illisible, flou, non reconnaissable ou vide : réponds uniquement {"erreur":"Document illisible ou format non reconnu"}.`;
}

/** Prompt de comparaison de plusieurs devis déjà extraits (Pilier 1). */
export const COMPARISON_PROMPT = `Tu es un expert en achats pour le bâtiment en France. Voici plusieurs devis en JSON pour un même chantier.

MISSION : compare-les rigoureusement pour aider l'artisan à choisir le moins-disant.

MÉTHODE :
1. Rapproche les produits équivalents entre devis, même nommés différemment (ex. "BA13" = "Plaque plâtre 13mm", "OSB18" = "OSB 3 18mm"). Utilise désignations, références et unités.
2. Compare les prix unitaires (pu) pour les produits communs.
3. Coût total réel = somme des lignes + fraisLivraison de chaque devis.
4. "economie" = coût total réel du devis le plus cher − coût total réel du moins cher. Si les devis ne couvrent pas les mêmes produits ou quantités, mets economie = 0 et explique dans alertes.
5. Si un devis a tous ses prix à 0, note "Extraction incomplète pour [fournisseur]" dans alertes.
6. Alertes à signaler : livraison non précisée, validité < 15 jours, paiement comptant exigé, quantité très différente entre devis, produit absent d'un ou plusieurs devis.

Réponds UNIQUEMENT en JSON strict :
{"mieuxDisant":"Nom du fournisseur le moins cher (livraison incluse)","economie":0,"comparaison":[{"produit":"Désignation normalisée courte","offres":[{"fournisseur":"","pu":0}],"meilleurFournisseur":""}],"alertes":[],"resume":"2-3 phrases concrètes pour l'artisan : nomme le fournisseur choisi, l'économie réalisée, et un point de vigilance si important."}`;

/** Prompt de vérification d'une facture par rapport à son devis (Pilier 2). */
export const VERIFICATION_PROMPT = `Tu es un expert en contrôle de facturation pour artisans du bâtiment en France. Voici un devis et sa facture en JSON. Compare-les scrupuleusement.

ANOMALIES À DÉTECTER :
1. "ecart_prix" : prix unitaire (pu) facturé > prix unitaire du devis pour un même article.
2. "quantite" : quantité facturée > quantité du devis pour un même article.
3. "doublon" : même article facturé plusieurs fois.
4. "hors_devis" : article facturé absent du devis.

RÈGLES :
- Compare les prix HT. Si la facture n'affiche que le TTC, divise par 1.20 (ou le bon taux si précisé).
- Rapproche les articles même si les désignations diffèrent légèrement ("OSB 3 - 18mm" ≈ "OSB18").
- Écart ≤ 0,50 € sur le pu = tolérance d'arrondi, ne compte pas.
- "impact" = (pu_facturé − pu_devis) × qte_facturée, arrondi à 2 décimales.
- "surcout" = somme des impacts positifs uniquement. Ne pas additionner les articles hors_devis sauf si impact chiffrable.
- "resume" : si conforme → "La facture est conforme au devis.". Sinon → commence par "Tu as payé X € de trop : " suivi du motif principal.

Réponds UNIQUEMENT en JSON strict :
{"conforme":true,"surcout":0,"anomalies":[{"type":"ecart_prix|doublon|quantite|hors_devis","produit":"","devis":0,"facture":0,"impact":0,"detail":""}],"resume":""}`;

/** Prompt de détection de dérive de prix sur l'historique d'un produit (Bilan — non encore utilisé). */
export const PRICE_DRIFT_PROMPT = `Voici l'historique des prix payés par l'artisan pour un même produit (JSON, avec dates). Détecte les hausses anormales (≥ 15 % d'un coup) en distinguant une hausse annuelle normale. Réponds en JSON : {"alerte":true,"produit":"","ancien":0,"nouveau":0,"hausse":0,"message":""}`;
