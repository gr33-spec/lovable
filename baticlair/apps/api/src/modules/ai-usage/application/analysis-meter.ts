import type { Quotas } from "@baticlair/domain";
import { DomainError } from "../../../platform/errors/domain-error.js";
import type { AnalysisKind, AnalysisRecord, AnalysisRepository } from "./analysis.repository.js";
import { currentMonth } from "./usage-month.js";

export const PHRASE_GROS_DEVIS_SANS_CREDIT = "Ce devis fait plus de 150 lignes : il compte pour 2 analyses, et il ne t'en reste qu'une. Note ta liste à la main, c'est gratuit, ou passe à la formule au-dessus.";

export interface BeginAnalysis {
  companyId: string;
  userId: string | null;
  projectId: string;
  documentId: string;
  kind: AnalysisKind;
  /** Combien d'analyses ce document compte (Greg, 30 octobre 2026, décision 3) : 2 au-delà de 150 lignes ; 1 par défaut. */
  poids?: 1 | 2;
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
 * - un document déjà analysé n'est jamais décompté une seconde fois ;
 * - des devis fournisseurs lus ensemble (« Lire et comparer ») comptent pour
 *   une seule analyse, quel que soit leur nombre.
 *
 * Le plafond est vérifié AVANT tout appel IA : au-delà du palier, rien
 * n'est dépensé.
 */
export class AnalysisMeter {
  constructor(
    private readonly analyses: AnalysisRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Recentrage (25 octobre 2026) : en GRATUIT, 2 lectures par mois (`LECTURES_GRATUITES_MOIS`) ; branché par le module des
   * droits. Rend la limite et la phrase du paywall, ou null (payant, essai, zone offerte : illimité).
   */
  // Achat groupé par métier (27 octobre 2026, point 24) : `total` compte toutes les lectures, pas celles du mois.
  private limiteGratuite: (companyId: string) => Promise<{ limite: number; phrase: (n: number) => string; total?: boolean } | null> = async () => null;
  brancherLimiteGratuite(f: (companyId: string) => Promise<{ limite: number; phrase: (n: number) => string; total?: boolean } | null>): void {
    this.limiteGratuite = f;
  }

  /** Les quotas d'IA du compte (formule, analyses, scans), branchés par le module des droits ; null : rien de limité. */
  private quotasDuCompte: (companyId: string) => Promise<Quotas | null> = async () => null;
  brancherQuotas(f: (companyId: string) => Promise<Quotas | null>): void {
    this.quotasDuCompte = f;
  }
  /** Le scan d'une liste : refusé (rien n'est dépensé) quand le quota de la formule est pris. */
  private scanPermis: (companyId: string) => Promise<void> = async () => undefined;
  brancherScan(f: (companyId: string) => Promise<void>): void {
    this.scanPermis = f;
  }
  verifierScan(companyId: string): Promise<void> {
    return this.scanPermis(companyId);
  }
  quotas(companyId: string): Promise<Quotas | null> {
    return this.quotasDuCompte(companyId);
  }
  /** Les analyses déjà décomptées (poids compris) : le mois en cours, ou toutes. */
  compter(companyId: string, parMois: boolean): Promise<number> {
    return this.analyses.countBillable(companyId, parMois ? currentMonth(this.now()) : null);
  }

  async begin(input: BeginAnalysis): Promise<BeginResult> {
    const existing = await this.analyses.findByDocument(input.companyId, input.documentId);
    if (existing?.status === "completed") return { status: "already_done", analysis: existing };

    const month = currentMonth(this.now());
    const gratuit = await this.limiteGratuite(input.companyId);
    const poids = input.poids ?? 1;
    if (gratuit) {
      const used = gratuit.total ? await this.analyses.countBillable(input.companyId, null) : await this.analyses.countBillable(input.companyId, month);
      if (used >= gratuit.limite) throw new DomainError("abonnement_requis", "Free plan reading limit reached", { action: "lecture", refus: "lectures", phrase: gratuit.phrase(gratuit.limite) });
      // Un gros devis (2 analyses) quand il n'en reste qu'une : rien n'est dépensé, la phrase le dit.
      if (used + poids > gratuit.limite) throw new DomainError("abonnement_requis", "Not enough readings left for a large quote", { action: "lecture", refus: "lectures", phrase: PHRASE_GROS_DEVIS_SANS_CREDIT });
    }
    const limit = await this.analyses.monthlyLimit(input.companyId);
    if (limit !== null) {
      const used = await this.analyses.countBillable(input.companyId, month);
      if (used >= limit) {
        throw new DomainError("analysis_quota_reached", "Monthly analysis limit reached", { limit, used, month });
      }
    }
    const analysis = existing
      ? await this.analyses.restart(existing.id, input.userId, poids)
      : await this.analyses.create({ ...input, poids });
    return { status: "go", analysis };
  }

  /**
   * La jauge (Greg, 30 octobre 2026, « évolution stratégique », point 8 : « des jauges d'utilisation ») : ce qui reste des
   * lectures offertes, dit AVANT le dépôt, avec les règles en vigueur et le même décompte que `begin` ; null quand rien
   * n'est limité (abonné, essai, zone offerte). Ne change aucun droit.
   */
  async jauge(companyId: string): Promise<{ limite: number; utilisees: number; restantes: number; parMois: boolean } | null> {
    const gratuit = await this.limiteGratuite(companyId);
    if (!gratuit) return null;
    const utilisees = await this.analyses.countBillable(companyId, gratuit.total ? null : currentMonth(this.now()));
    return { limite: gratuit.limite, utilisees, restantes: Math.max(0, gratuit.limite - utilisees), parMois: !gratuit.total };
  }

  complete(analysisId: string, options: { billable?: boolean } = {}): Promise<AnalysisRecord> {
    const at = this.now();
    return this.analyses.complete(analysisId, currentMonth(at), at, options.billable ?? true);
  }

  /** Le lot de devis lus ensemble compte pour une analyse : on la porte sur l'une d'elles. */
  markBillable(analysisId: string): Promise<void> {
    return this.analyses.markBillable(analysisId);
  }

  /** Mesures de la lecture d'un document (blocs, lignes, écarts, tokens, coût, durée). */
  recordReading(analysisId: string, stats: object): Promise<void> {
    return this.analyses.saveReadingStats(analysisId, stats);
  }

  /** L'analyse d'un document, telle qu'elle est (en cours, réussie, échouée), ou null. */
  current(companyId: string, documentId: string): Promise<AnalysisRecord | null> {
    return this.analyses.findByDocument(companyId, documentId);
  }

  fail(analysisId: string): Promise<AnalysisRecord> {
    return this.analyses.fail(analysisId, this.now());
  }
}
