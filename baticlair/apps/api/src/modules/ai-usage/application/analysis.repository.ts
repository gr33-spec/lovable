export type AnalysisStatus = "started" | "completed" | "failed";
export type AnalysisKind = "client_quote" | "supplier_quote";

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
}

export interface AnalysisRepository {
  findByDocument(companyId: string, documentId: string): Promise<AnalysisRecord | null>;
  /** Palier de l'entreprise (nul = pas de plafond). */
  monthlyLimit(companyId: string): Promise<number | null>;
  countBillable(companyId: string, billingMonth: string): Promise<number>;
  create(data: { companyId: string; userId: string | null; projectId: string; documentId: string; kind: AnalysisKind }): Promise<AnalysisRecord>;
  restart(id: string, userId: string | null): Promise<AnalysisRecord>;
  /** Réussite : décomptée dans le mois donné (sauf si elle l'était déjà). */
  /** `billable: false` : lecture faite dans un lot déjà décompté (devis fournisseurs lus ensemble). */
  complete(id: string, billingMonth: string, at: Date, billable?: boolean): Promise<AnalysisRecord>;
  markBillable(id: string): Promise<void>;
  fail(id: string, at: Date): Promise<AnalysisRecord>;
}

export const ANALYSIS_REPOSITORY = Symbol("ANALYSIS_REPOSITORY");
