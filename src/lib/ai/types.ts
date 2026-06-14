/** Une ligne d'article telle qu'extraite d'un devis ou d'une facture. */
export interface LigneArticle {
  designation: string;
  ref: string;
  qte: number;
  unite: string;
  pu: number;
  total: number;
}

/** Document extrait par l'IA à partir d'un devis ou d'une facture (PDF/photo). */
export interface ExtractedDocument {
  fournisseur: string;
  date: string;
  lignes: LigneArticle[];
  totalHT: number;
  totalTTC: number;
  fraisLivraison: number;
  validite: string;
  conditionsPaiement: string;
}

/** Prix proposé par un fournisseur pour un produit donné, dans une comparaison. */
export interface ComparisonOffer {
  fournisseur: string;
  pu: number;
}

/** Un produit rapproché entre plusieurs devis, avec les offres de chaque fournisseur. */
export interface ComparisonProduct {
  produit: string;
  offres: ComparisonOffer[];
  meilleurFournisseur: string;
}

/** Résultat de la comparaison de plusieurs devis (Pilier 1). */
export interface ComparisonResult {
  mieuxDisant: string;
  economie: number;
  comparaison: ComparisonProduct[];
  alertes: string[];
  resume: string;
}

/** Type d'anomalie détectée entre un devis et sa facture. */
export type AnomalieType = "ecart_prix" | "doublon" | "quantite" | "hors_devis";

export interface Anomalie {
  type: AnomalieType;
  produit: string;
  devis: number;
  facture: number;
  impact: number;
  detail: string;
}

/** Résultat de la vérification d'une facture par rapport à son devis (Pilier 2). */
export interface VerificationResult {
  conforme: boolean;
  surcout: number;
  anomalies: Anomalie[];
  resume: string;
}

/** Résultat de la détection de dérive de prix sur l'historique d'un produit. */
export interface PriceDriftResult {
  alerte: boolean;
  produit: string;
  ancien: number;
  nouveau: number;
  hausse: number;
  message: string;
}

/** Les deux types d'analyses proposées dans l'app. */
export type AnalysisType = "devis" | "facture";

/** Réponse de POST /api/analyze : un type discriminé selon l'analyse demandée. */
export type AnalyzeResponse =
  | { type: "devis"; extracted: ExtractedDocument[]; result: ComparisonResult }
  | { type: "facture"; extracted: ExtractedDocument[]; result: VerificationResult };
