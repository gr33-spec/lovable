import { Throttle } from "@nestjs/throttler";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { Body, Controller, Get, HttpCode, Inject, Patch, Post, UseGuards } from "@nestjs/common";
import { TRADES } from "@baticlair/domain";
import { z } from "zod";
import { Idempotent } from "../../../platform/http/idempotency.interceptor.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CurrentUser, type AuthenticatedUser } from "../../identity/index.js";
import { TenancyService } from "../application/tenancy.service.js";
import type { TenantContext } from "../domain/tenant-context.js";
import { Tenant } from "./tenant.decorator.js";
import { TenantGuard } from "./tenant.guard.js";

const trades = z.array(z.string().max(40)).max(TRADES.length);
const createCompanyBody = z.object({ name: z.string(), trades: trades.optional() });
const tradesBody = z.object({ trades });

@Controller("v1")
export class MeController {
  constructor(@Inject(TenancyService) private readonly tenancy: TenancyService) {}

  /** Qui suis-je, et à quelles entreprises ai-je accès ? (sert à l'onboarding) */
  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser) {
    const companies = await this.tenancy.listMemberships(user.userId);
    return {
      user: { id: user.userId, email: user.email, name: user.name, emailVerified: user.emailVerified },
      companies: companies.map((c) => ({ id: c.companyId, name: c.companyName, role: c.role, trades: c.trades })),
    };
  }

  @Throttle({ default: HOURLY(5) })
  @Post("companies")
  @HttpCode(201)
  @Idempotent()
  async createCompany(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodPipe(createCompanyBody)) body: z.infer<typeof createCompanyBody>,
  ) {
    const c = await this.tenancy.createCompany(user.userId, body.name, body.trades ?? []);
    return { id: c.companyId, name: c.companyName, role: c.role, trades: c.trades };
  }

  /** Change les métiers de l'entreprise active. */
  @Patch("company/trades")
  @UseGuards(TenantGuard)
  async setTrades(@Tenant() tenant: TenantContext, @Body(new ZodPipe(tradesBody)) body: z.infer<typeof tradesBody>) {
    return { trades: await this.tenancy.setTrades(tenant, body.trades) };
  }
}
