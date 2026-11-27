export type AnalysisStatus = "started" | "completed" | "failed";
export type AnalysisKind = "client_quote" | "supplier_quote" | "sketch";

export interface AnalysisRecord {
  id: string;
  companyId: string;
  userId: string | null;
  projectId: string;
  documentId: string;
  kind: AnalysisKind;
  status: AnalysisStatus;
  billable: boolean;
  billingMonth: string | null;
  costMicroUsd: bigint;
  /** Début de la dernière tentative : une lecture « en cours » depuis trop longtemps a été interrompue. */
  startedAt: Date;
  /** Les mesures de la dernière lecture (dont le motif d'un échec, `failure`), telles qu'enregistrées. */
  readingStats?: unknown;
}

export interface AnalysisRepository {
  findByDocument(companyId: string, documentId: string): Promise<AnalysisRecord | null>;
  /** Palier de l'entreprise (nul = pas de plafond). */
  monthlyLimit(companyId: string): Promise<number | null>;
  /** `billingMonth` null : toutes les lectures décomptées. Chacune compte pour son poids (2 au-delà de 150 lignes). */
  countBillable(companyId: string, billingMonth: string | null): Promise<number>;
  create(data: { companyId: string; userId: string | null; projectId: string; documentId: string; kind: AnalysisKind; poids?: number }): Promise<AnalysisRecord>;
  restart(id: string, userId: string | null, poids?: number): Promise<AnalysisRecord>;
  /**
   * RÉSERVER UNE ANALYSE (audit du 27 novembre 2026) : sous un verrou par entreprise, compte les analyses décomptées ET celles
   * EN COURS (lancées depuis moins de `EN_COURS_COMPTEES_MS`, hors ce document), laisse `verifier` refuser, puis crée ou relance
   * l'analyse. Dix lectures lancées au même instant ne passent donc plus toutes sous le quota.
   */
  reserver(
    data: { companyId: string; userId: string | null; projectId: string; documentId: string; kind: AnalysisKind; poids: number },
    existante: AnalysisRecord | null,
    mois: string,
    verifier: (prises: { total: number; mois: number }) => void,
  ): Promise<AnalysisRecord>;
  /** Réussite : décomptée dans le mois donné (sauf si elle l'était déjà). */
  /** `billable: false` : lecture faite dans un lot déjà décompté (devis fournisseurs lus ensemble). */
  complete(id: string, billingMonth: string, at: Date, billable?: boolean): Promise<AnalysisRecord>;
  markBillable(id: string): Promise<void>;
  fail(id: string, at: Date): Promise<AnalysisRecord>;
  /** Mesures de la lecture (télémétrie), sans effet sur l'analyse. */
  saveReadingStats(id: string, stats: object): Promise<void>;
}

export const ANALYSIS_REPOSITORY = Symbol("ANALYSIS_REPOSITORY");

/**
 * Une analyse « en cours » compte dans le quota pendant 5 minutes, comme la lecture la tient pour interrompue
 * (`STALE_READING_MS` du module takeoff, même valeur) : une lecture coupée par l'hébergeur rend vite sa place.
 */
export const EN_COURS_COMPTEES_MS = 5 * 60 * 1000;
