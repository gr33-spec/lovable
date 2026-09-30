import { DomainError } from "../../../platform/errors/domain-error.js";
import type { AnalysisKind, AnalysisRecord, AnalysisRepository } from "./analysis.repository.js";
import { currentMonth } from "./usage-month.js";

export interface BeginAnalysis {
  companyId: string;
  userId: string | null;
  projectId: string;
  documentId: string;
  kind: AnalysisKind;
}

export type BeginResult =
  /** L'analyse peut démarrer (ou reprendre après un échec) : appeler l'IA. */
  | { status: "go"; analysis: AnalysisRecord }
  /** Déjà réussie : le résultat est en base, AUCUN appel IA ni décompte. */
  | { status: "already_done"; analysis: AnalysisRecord };

/**
 * Compteur des paliers d'abonnement (analyses de documents par mois).
 *
 * Règles de décompte :
 * - 1 analyse = 1 document (devis client ou fournisseur) analysé avec succès ;
 * - les relances, modèles de secours et appels de comparaison ne comptent pas en plus ;
 * - un échec ne compte pas ;
 * - un document déjà analysé n'est jamais décompté une seconde fois.
 *
 * Le plafond est vérifié AVANT tout appel IA : au-delà du palier, rien
 * n'est dépensé.
 */
export class AnalysisMeter {
  constructor(
    private readonly analyses: AnalysisRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async begin(input: BeginAnalysis): Promise<BeginResult> {
    const existing = await this.analyses.findByDocument(input.companyId, input.documentId);
    if (existing?.status === "completed") return { status: "already_done", analysis: existing };

    const month = currentMonth(this.now());
    const limit = await this.analyses.monthlyLimit(input.companyId);
    if (limit !== null) {
      const used = await this.analyses.countBillable(input.companyId, month);
      if (used >= limit) {
        throw new DomainError("analysis_quota_reached", "Monthly analysis limit reached", { limit, used, month });
      }
    }
    const analysis = existing
      ? await this.analyses.restart(existing.id, input.userId)
      : await this.analyses.create(input);
    return { status: "go", analysis };
  }

  complete(analysisId: string): Promise<AnalysisRecord> {
    const at = this.now();
    return this.analyses.complete(analysisId, currentMonth(at), at);
  }

  fail(analysisId: string): Promise<AnalysisRecord> {
    return this.analyses.fail(analysisId, this.now());
  }
}
