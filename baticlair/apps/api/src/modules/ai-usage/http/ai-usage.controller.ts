import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodPipe } from "../../../platform/http/zod.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { AnalysisMeter } from "../application/analysis-meter.js";
import { AiUsageService } from "../application/ai-usage.service.js";

const query = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
});

@Controller("v1/ai-usage")
@UseGuards(TenantGuard)
export class AiUsageController {
  constructor(
    @Inject(AiUsageService) private readonly usage: AiUsageService,
    @Inject(AnalysisMeter) private readonly meter: AnalysisMeter,
  ) {}

  @Get()
  monthly(@Tenant() tenant: TenantContext, @Query(new ZodPipe(query)) q: z.infer<typeof query>) {
    return this.usage.monthly(tenant, q.month);
  }

  /**
   * La jauge, avant le dépôt : `quotas` (formule, analyses de devis, scans de liste ; Greg, 30 octobre 2026), sinon
   * l'ancienne `jauge` des lectures (mode ancien) ; null quand rien n'est limité.
   */
  @Get("jauge")
  async jauge(@Tenant() tenant: TenantContext) {
    const quotas = await this.meter.quotas(tenant.companyId);
    return { jauge: quotas ? null : await this.meter.jauge(tenant.companyId), quotas };
  }
}
