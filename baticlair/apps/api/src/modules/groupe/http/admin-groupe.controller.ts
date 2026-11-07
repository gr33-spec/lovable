import { Body, Controller, Get, HttpCode, Inject, Param, Post, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import type { AppConfig } from "../../../platform/config/config.js";
import { PrismaService } from "../../../platform/database/prisma.service.js";
import { forbidden, notFound } from "../../../platform/errors/domain-error.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { AdminGroupeService } from "../application/admin-groupe.service.js";
import { exigerDeuxFacteurs } from "../../../platform/http/deux-facteurs.js";

const negoceBody = z.object({ negoceId: z.string().uuid() });

/** BatiClair Groupé, étape 9 : l'admin de Greg. Réservé aux e-mails de `GROUPE_ADMINS` (sinon les validateurs du référentiel) ; 404 drapeau éteint. */
@Controller("v1/admin/groupe")
@UseGuards(TenantGuard)
export class AdminGroupeController {
  constructor(
    @Inject(AdminGroupeService) private readonly admin: AdminGroupeService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  private async garde(tenant: TenantContext): Promise<string> {
    if (!this.config.groupe.enabled) throw notFound("Route");
    const user = await this.prisma.user.findUnique({ where: { id: tenant.userId }, select: { email: true } });
    if (!user || !this.config.groupe.admins.includes(user.email.toLowerCase())) throw forbidden("Reserved to groupé admins");
    // Le code à 6 chiffres de la session, comme le pilotage (Greg, 26 octobre 2026).
    await exigerDeuxFacteurs(this.prisma, tenant.userId);
    return user.email;
  }

  @Get()
  async tableau(@Tenant() tenant: TenantContext) {
    await this.garde(tenant);
    return this.admin.tableau();
  }

  @Get("lots/:lotId")
  async lot(@Tenant() tenant: TenantContext, @Param("lotId") lotId: string) {
    await this.garde(tenant);
    return this.admin.lot(lotId);
  }

  @Post("lots/:lotId/clore")
  @HttpCode(200)
  async clore(@Tenant() tenant: TenantContext, @Param("lotId") lotId: string) {
    return this.admin.clore(lotId, await this.garde(tenant));
  }

  @Post("lots/:lotId/annuler")
  @HttpCode(200)
  async annuler(@Tenant() tenant: TenantContext, @Param("lotId") lotId: string) {
    return this.admin.annuler(lotId, await this.garde(tenant));
  }

  @Post("lots/:lotId/forcer")
  @HttpCode(200)
  async forcer(@Tenant() tenant: TenantContext, @Param("lotId") lotId: string) {
    return this.admin.forcer(lotId, await this.garde(tenant));
  }

  @Post("lots/:lotId/negoce")
  @HttpCode(200)
  async changerNegoce(@Tenant() tenant: TenantContext, @Param("lotId") lotId: string, @Body(new ZodPipe(negoceBody)) body: z.infer<typeof negoceBody>) {
    return this.admin.changerNegoce(lotId, body.negoceId, await this.garde(tenant));
  }

  @Post("factures/:factureId/payee")
  @HttpCode(200)
  async payee(@Tenant() tenant: TenantContext, @Param("factureId") factureId: string) {
    return this.admin.marquerPayee(factureId, await this.garde(tenant));
  }

  @Get("factures.csv")
  async facturesCsv(@Tenant() tenant: TenantContext, @Res({ passthrough: true }) res: Response): Promise<string> {
    await this.garde(tenant);
    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.setHeader("content-disposition", 'attachment; filename="factures-commission.csv"');
    return this.admin.facturesCsv(this.config.groupe.facture.tvaPourcent);
  }
}
