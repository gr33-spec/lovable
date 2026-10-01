import { Body, Controller, Get, HttpCode, Inject, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodPipe } from "../../../platform/http/zod.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { BillingService, type BillingStatus } from "../application/billing.service.js";

const requestBody = z.object({ plan: z.string().min(1).max(30) });
const activateBody = z.object({ code: z.string().min(1).max(100) });

function toDto(s: BillingStatus) {
  const plan = (p: BillingStatus["plan"]) => ({
    key: p.key,
    label: p.label,
    projectLimit: p.projectLimit,
    period: p.period,
    priceEurMonth: p.priceEurMonth,
  });
  return {
    plan: plan(s.plan),
    usage: s.usage,
    limitReached: s.limitReached,
    offers: s.offers.map(plan),
    requestedPlan: s.requestedPlan,
    activationEnabled: s.activationEnabled,
  };
}

@Controller("v1/billing")
@UseGuards(TenantGuard)
export class BillingController {
  constructor(@Inject(BillingService) private readonly billing: BillingService) {}

  @Get()
  async status(@Tenant() tenant: TenantContext) {
    return toDto(await this.billing.status(tenant));
  }

  /** « Choisir cette formule » (en attendant le paiement en ligne). */
  @Post("request")
  @HttpCode(200)
  async request(@Tenant() tenant: TenantContext, @Body(new ZodPipe(requestBody)) body: z.infer<typeof requestBody>) {
    return toDto(await this.billing.requestPlan(tenant, body.plan));
  }

  @Post("activate")
  @HttpCode(200)
  async activate(@Tenant() tenant: TenantContext, @Body(new ZodPipe(activateBody)) body: z.infer<typeof activateBody>) {
    return toDto(await this.billing.activate(tenant, body.code));
  }
}
