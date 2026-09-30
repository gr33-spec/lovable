import { computeAiCost, priceTableAt, type AiUsage } from "@baticlair/domain";
import type { AiExecutionStatus, AiRoute, AiUsageRepository } from "./ai-usage.repository.js";

export interface AiCallReport {
  companyId: string;
  projectId?: string | null;
  documentId?: string | null;
  processingId?: string | null;
  /** takeoff_extraction, offer_extraction, matching… */
  task: string;
  route: AiRoute;
  provider: string;
  /** Identifiant exact du modèle appelé (celui renvoyé par le fournisseur). */
  model: string;
  promptId: string;
  promptVersion: number;
  /** 1 pour le premier essai. */
  attempt: number;
  pagesText?: number;
  pagesVision?: number;
  /** Consommation telle que renvoyée par le fournisseur (champ `usage`). */
  usage: AiUsage;
  status: AiExecutionStatus;
  errorCode?: string | null;
  durationMs: number;
}

/**
 * Point de passage OBLIGATOIRE de tout appel IA (étape A de l'audit des
 * coûts) : l'adapter du fournisseur appelle `record` après chaque requête,
 * réussie ou non. Le coût est calculé ici, à partir de la consommation
 * réelle et de la grille de prix en vigueur à la date de l'appel.
 */
export class AiUsageRecorder {
  constructor(
    private readonly repository: AiUsageRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async record(report: AiCallReport): Promise<{ id: string; costMicroUsd: number }> {
    const at = this.now();
    const table = priceTableAt(at);
    const cost = computeAiCost(report.model, report.usage, table);
    const { id } = await this.repository.insert({
      companyId: report.companyId,
      projectId: report.projectId ?? null,
      documentId: report.documentId ?? null,
      processingId: report.processingId ?? null,
      task: report.task,
      route: report.route,
      provider: report.provider,
      model: report.model,
      promptId: report.promptId,
      promptVersion: report.promptVersion,
      attempt: report.attempt,
      pagesText: report.pagesText ?? 0,
      pagesVision: report.pagesVision ?? 0,
      inputTokens: report.usage.inputTokens,
      outputTokens: report.usage.outputTokens,
      cacheReadTokens: report.usage.cacheReadTokens ?? 0,
      cacheWrite5mTokens: report.usage.cacheWrite5mTokens ?? 0,
      cacheWrite1hTokens: report.usage.cacheWrite1hTokens ?? 0,
      batch: report.usage.batch ?? false,
      costMicroUsd: cost.totalMicroUsd,
      priceTableVersion: cost.priceTableVersion,
      status: report.status,
      errorCode: report.errorCode ?? null,
      durationMs: Math.max(0, Math.round(report.durationMs)),
      createdAt: at,
    });
    return { id, costMicroUsd: cost.totalMicroUsd };
  }
}
