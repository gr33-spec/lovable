import { Throttle } from "@nestjs/throttler";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { Body, Controller, Delete, Get, HttpCode, Inject, Patch, Post, Put, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Response } from "express";
import { TRADES } from "@baticlair/domain";
import { z } from "zod";
import { Idempotent } from "../../../platform/http/idempotency.interceptor.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CurrentUser, type AuthenticatedUser } from "../../identity/index.js";
import { MAX_LOGO_BYTES, TenancyService } from "../application/tenancy.service.js";
import type { TenantContext } from "../domain/tenant-context.js";
import { Tenant } from "./tenant.decorator.js";
import { TenantGuard } from "./tenant.guard.js";

const trades = z.array(z.string().max(40)).max(TRADES.length);
const createCompanyBody = z.object({ name: z.string(), trades: trades.optional() });
const tradesBody = z.object({ trades });
const field = z.string().max(400).nullable().optional();
const profileBody = z.object({ name: field, address: field, siret: field, phone: field, email: field });

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

  /** Coordonnées de l'entreprise : en-tête de la demande de devis (§45.3), signature du mail (§45.2). */
  @Get("company/profile")
  @UseGuards(TenantGuard)
  profile(@Tenant() tenant: TenantContext) {
    return this.tenancy.profile(tenant);
  }

  @Patch("company/profile")
  @UseGuards(TenantGuard)
  setProfile(@Tenant() tenant: TenantContext, @Body(new ZodPipe(profileBody)) body: z.infer<typeof profileBody>) {
    return this.tenancy.setProfile(tenant, body);
  }

  @Get("company/logo")
  @UseGuards(TenantGuard)
  async logo(@Tenant() tenant: TenantContext, @Res({ passthrough: true }) res: Response) {
    const logo = await this.tenancy.logo(tenant);
    if (!logo) {
      res.status(404);
      return { error: { code: "not_found", message: "No logo" } };
    }
    res.setHeader("Content-Type", logo.type);
    res.setHeader("Cache-Control", "private, no-store");
    return new StreamableFile(logo.bytes);
  }

  /** Le logo (multipart, champ `file`) : PNG ou JPEG, 500 Ko au plus. */
  @Put("company/logo")
  @UseGuards(TenantGuard)
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: MAX_LOGO_BYTES + 1, files: 1 } }))
  async setLogo(@Tenant() tenant: TenantContext, @UploadedFile() file: { buffer: Buffer } | undefined) {
    await this.tenancy.setLogo(tenant, file ? new Uint8Array(file.buffer) : new Uint8Array());
    return this.tenancy.profile(tenant);
  }

  @Delete("company/logo")
  @UseGuards(TenantGuard)
  async removeLogo(@Tenant() tenant: TenantContext) {
    await this.tenancy.setLogo(tenant, null);
    return this.tenancy.profile(tenant);
  }

  /** Change les métiers de l'entreprise active. */
  @Patch("company/trades")
  @UseGuards(TenantGuard)
  async setTrades(@Tenant() tenant: TenantContext, @Body(new ZodPipe(tradesBody)) body: z.infer<typeof tradesBody>) {
    return { trades: await this.tenancy.setTrades(tenant, body.trades) };
  }
}
