import { timingSafeEqual } from "node:crypto";
import type { AppConfig } from "../../../platform/config/config.js";
import { TRIAL_PLAN, type Plan } from "../../../platform/config/plans.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { DomainError, validationFailed } from "../../../platform/errors/domain-error.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";

export interface BillingStatus {
  plan: Plan;
  /** Chantiers comptés sur la période (les chantiers de démonstration ne comptent jamais). */
  usage: { projects: number; limit: number | null; remaining: number | null };
  limitReached: boolean;
  offers: Plan[];
  requestedPlan: string | null;
  activationEnabled: boolean;
}

/**
 * Formules : un nombre de chantiers par mois (ou pendant l'essai). La limite
 * ne bloque que la création d'un nouveau chantier : un chantier commencé se
 * termine toujours (liste, demandes, comparaison).
 */
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig["billing"],
    private readonly now: () => Date = () => new Date(),
  ) {}

  private plan(key: string): Plan {
    return this.config.plans.find((p) => p.key === key) ?? this.config.plans.find((p) => p.key === TRIAL_PLAN)!;
  }

  async status(tenant: TenantContext): Promise<BillingStatus> {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: tenant.companyId },
      select: { plan: true, requestedPlan: true },
    });
    const plan = this.plan(company.plan);
    const now = this.now();
    const since = plan.period === "month" ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) : undefined;
    const projects = await this.prisma.project.count({
      where: { companyId: tenant.companyId, demo: false, ...(since ? { createdAt: { gte: since } } : {}) },
    });
    const limit = plan.projectLimit;
    return {
      plan,
      usage: { projects, limit, remaining: limit === null ? null : Math.max(0, limit - projects) },
      limitReached: limit !== null && projects >= limit,
      offers: this.config.plans.filter((p) => p.offered && p.key !== TRIAL_PLAN),
      requestedPlan: company.requestedPlan,
      activationEnabled: Object.keys(this.config.activationCodes).length > 0,
    };
  }

  /** Avant de créer un chantier (jamais pour la démonstration). */
  async assertCanCreateProject(tenant: TenantContext): Promise<void> {
    const s = await this.status(tenant);
    if (s.limitReached) {
      throw new DomainError("plan_limit_reached", "Plan project limit reached", { plan: s.plan.key, limit: s.usage.limit, used: s.usage.projects });
    }
  }

  /** « Choisir cette formule » tant que le paiement en ligne n'existe pas : on note la demande. */
  async requestPlan(tenant: TenantContext, planKey: string): Promise<BillingStatus> {
    assertCanWrite(tenant);
    const plan = this.config.plans.find((p) => p.key === planKey && p.offered && p.key !== TRIAL_PLAN);
    if (!plan) throw validationFailed("Unknown plan", { reason: "unknown_plan" });
    await this.prisma.company.update({ where: { id: tenant.companyId }, data: { requestedPlan: plan.key, requestedPlanAt: this.now() } });
    return this.status(tenant);
  }

  /** Activation manuelle (tests, premiers clients) avec un code défini dans PLAN_ACTIVATION_CODES. */
  async activate(tenant: TenantContext, code: string): Promise<BillingStatus> {
    assertCanWrite(tenant);
    const planKey = this.matchCode(code.trim());
    if (!planKey || !this.config.plans.some((p) => p.key === planKey)) {
      throw validationFailed("Invalid activation code", { reason: "invalid_activation_code" });
    }
    await this.prisma.company.update({
      where: { id: tenant.companyId },
      data: { plan: planKey, planActivatedAt: this.now(), requestedPlan: null, requestedPlanAt: null },
    });
    return this.status(tenant);
  }

  private matchCode(code: string): string | null {
    const given = Buffer.from(code);
    let found: string | null = null;
    for (const [candidate, plan] of Object.entries(this.config.activationCodes)) {
      const expected = Buffer.from(candidate);
      if (expected.length === given.length && timingSafeEqual(expected, given)) found = plan;
    }
    return found;
  }
}
