// Analyse IA du patrimoine : forme de la réponse, partagée entre le serveur
// (appel à Claude) et l'application (affichage, historique, simulations).

export type AnalysisScope = { type: "global" } | { type: "company"; id: string } | { type: "building"; id: string };

export type TargetType = "global" | "societe" | "immeuble" | "credit";

export interface AnalysisTarget {
  type: TargetType;
  /** Identifiant exact tiré des faits (vide pour « global »). */
  id: string;
}

export type SimulationKind = "vente" | "refinancement" | "achat" | "travaux" | "remboursement" | "aucune";

/** Paramètres pour préremplir une simulation ; 0 ou vide = à saisir par l'utilisateur. */
export interface SimulationDraft {
  action: SimulationKind;
  annee: number;
  montant: number;
  tauxPct: number;
  dureeAns: number;
  creditIds: string[];
}

export interface AnalysisRisk {
  titre: string;
  detail: string;
  gravite: "haute" | "moyenne" | "faible";
  cible: AnalysisTarget;
}

export interface AnalysisIdea {
  titre: string;
  pourquoi: string;
  /** Effet attendu, chiffré à partir des faits (ou « à estimer »). */
  impact: string;
  horizon: "court" | "moyen" | "long";
  type: "vente" | "refinancement" | "achat" | "travaux" | "remboursement" | "loyers" | "structure" | "autre";
  cible: AnalysisTarget;
  simulation: SimulationDraft;
  /** Ce qu'il faut vérifier et avec qui (expert-comptable, notaire, banque…). */
  aValider: string;
}

export interface AnalysisResult {
  synthese: string;
  sante: { niveau: "solide" | "correct" | "fragile"; explication: string };
  forces: string[];
  risques: AnalysisRisk[];
  pistes: AnalysisIdea[];
  /** Informations qui amélioreraient l'analyse. */
  aCompleter: string[];
  /** Réponse à la question posée (vide sans question). */
  reponse: string;
}

/** Analyse conservée dans l'application (les 5 dernières). */
export interface SavedAnalysis {
  id: string;
  createdAt: string;
  scope: AnalysisScope;
  scopeLabel: string;
  question?: string;
  result: AnalysisResult;
}
