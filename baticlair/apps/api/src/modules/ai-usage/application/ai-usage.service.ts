import { microUsdToEur } from "@baticlair/domain";
import { DomainError } from "../../../platform/errors/domain-error.js";
import type { TenantContext } from "../../tenancy/index.js";
import type { AiUsageRepository, MonthlyUsage } from "./ai-usage.repository.js";

export const USAGE_TIMEZONE = "Europe/Paris";

export interface CostDisplay {
  usdToEur: string;
  monthlyBudgetEur: string;
}

/** Mois civil courant à Paris, au format « 2026-09 ». */
export function currentMonth(now: Date, timeZone = USAGE_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}`;
}

/**
 * Rapport de consommation IA d'une entreprise sur un mois : coût réel
 * (appels enregistrés) et, en attendant les premiers appels, volume lu et
 * coût estimé des documents déposés. Réservé au propriétaire et aux
 * administrateurs.
 */
export class AiUsageService {
  constructor(
    private readonly repository: AiUsageRepository,
    private readonly display: CostDisplay,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async monthly(tenant: TenantContext, month?: string) {
    if (tenant.role !== "owner" && tenant.role !== "admin") {
      throw new DomainError("forbidden", "AI usage is visible to owners and admins only");
    }
    const m = month ?? currentMonth(this.now());
    const usage = await this.repository.monthly(tenant.companyId, { month: m, timezone: USAGE_TIMEZONE });
    return this.present(m, usage);
  }

  private eur(microUsd: bigint): string {
    return microUsdToEur(microUsd, this.display.usdToEur).toDecimalPlaces(4).toString();
  }

  private present(month: string, u: MonthlyUsage) {
    const costEur = microUsdToEur(u.totals.costMicroUsd, this.display.usdToEur);
    const budget = this.display.monthlyBudgetEur;
    return {
      month,
      timezone: USAGE_TIMEZONE,
      currency: "EUR",
      usdToEur: this.display.usdToEur,
      budgetEur: budget,
      actual: {
        calls: u.totals.calls,
        retries: u.totals.retries,
        failedCalls: u.totals.failedCalls,
        pagesText: u.totals.pagesText,
        pagesVision: u.totals.pagesVision,
        inputTokens: u.totals.inputTokens,
        outputTokens: u.totals.outputTokens,
        cacheReadTokens: u.totals.cacheReadTokens,
        cacheWriteTokens: u.totals.cacheWriteTokens,
        costEur: costEur.toDecimalPlaces(4).toString(),
        budgetUsedPercent: costEur.dividedBy(budget).times(100).toDecimalPlaces(1).toNumber(),
      },
      byProject: u.byProject.map((p) => ({
        projectId: p.projectId,
        projectName: p.projectName,
        documents: p.documents,
        calls: p.calls,
        costEur: this.eur(p.costMicroUsd),
      })),
      byModel: u.byModel.map((m) => ({
        model: m.model,
        calls: m.calls,
        inputTokens: m.inputTokens,
        outputTokens: m.outputTokens,
        costEur: this.eur(m.costMicroUsd),
      })),
      reading: {
        documents: u.reading.documents,
        pagesTotal: u.reading.pagesTotal,
        pagesText: u.reading.pagesText,
        pagesVision: u.reading.pagesVision,
        pagesSkipped: u.reading.pagesSkipped,
        /** Estimation haute du coût d'extraction de ces documents (aucun appel fait). */
        estimatedCostEur: this.eur(u.reading.estimatedMicroUsd),
      },
      priceTableVersions: u.priceTableVersions,
    };
  }
}
