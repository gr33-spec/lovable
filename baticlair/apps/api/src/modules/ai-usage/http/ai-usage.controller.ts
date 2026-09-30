import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodPipe } from "../../../platform/http/zod.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
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
  constructor(@Inject(AiUsageService) private readonly usage: AiUsageService) {}

  @Get()
  monthly(@Tenant() tenant: TenantContext, @Query(new ZodPipe(query)) q: z.infer<typeof query>) {
    return this.usage.monthly(tenant, q.month);
  }
}
