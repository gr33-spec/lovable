export type AiExecutionStatus = "success" | "invalid_output" | "refused" | "provider_error" | "timeout";
/** Voie de traitement : texte, image, secours (modèle plus puissant), dernier recours. */
export type AiRoute = "text" | "vision" | "fallback" | "escalation";

export interface AiExecutionRecord {
  companyId: string;
  projectId: string | null;
  documentId: string | null;
  processingId: string | null;
  analysisId: string | null;
  userId: string | null;
  task: string;
  route: AiRoute;
  provider: string;
  model: string;
  promptId: string;
  promptVersion: number;
  attempt: number;
  pagesText: number;
  pagesVision: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWrite5mTokens: number;
  cacheWrite1hTokens: number;
  batch: boolean;
  costMicroUsd: number;
  priceTableVersion: string;
  status: AiExecutionStatus;
  errorCode: string | null;
  durationMs: number;
  createdAt: Date;
}

export interface MonthWindow {
  /** « 2026-09 », mois civil à l'heure de Paris. */
  month: string;
  timezone: string;
}

export interface UsageTotals {
  calls: number;
  retries: number;
  failedCalls: number;
  pagesText: number;
  pagesVision: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costMicroUsd: bigint;
}

export interface ProjectUsage {
  projectId: string | null;
  projectName: string | null;
  documents: number;
  calls: number;
  costMicroUsd: bigint;
}

export interface ModelUsage {
  model: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costMicroUsd: bigint;
}

export interface ReadingTotals {
  documents: number;
  pagesTotal: number;
  pagesText: number;
  pagesVision: number;
  pagesSkipped: number;
  estimatedMicroUsd: bigint;
}

export interface UserUsage {
  userId: string | null;
  userName: string | null;
  /** Analyses décomptées (réussies) ce mois-ci. */
  analyses: number;
  /** Appels IA (toutes tentatives confondues). */
  calls: number;
  costMicroUsd: bigint;
}

export interface MonthlyUsage {
  /** Analyses décomptées pour le palier (réussies, une par document). */
  analyses: number;
  analysisLimit: number | null;
  byUser: UserUsage[];
  totals: UsageTotals;
  byProject: ProjectUsage[];
  byModel: ModelUsage[];
  reading: ReadingTotals;
  priceTableVersions: string[];
}

export interface AiUsageRepository {
  /** Enregistre l'appel et l'ajoute au coût réel du traitement et de l'analyse concernés (même transaction). */
  insert(record: AiExecutionRecord): Promise<{ id: string }>;
  monthly(companyId: string, window: MonthWindow): Promise<MonthlyUsage>;
}

export const AI_USAGE_REPOSITORY = Symbol("AI_USAGE_REPOSITORY");
