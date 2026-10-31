import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import type { AppConfig } from "../../../platform/config/config.js";
import { PrismaService } from "../../../platform/database/prisma.service.js";
import { notFound } from "../../../platform/errors/domain-error.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Public } from "../../identity/index.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { lireJetonEmailsCoupes } from "../application/emails-coupes.js";

const preference = z.object({ actifs: z.boolean() });

/**
 * « NE PLUS RECEVOIR CES E-MAILS » (RGPD, 24 octobre 2026) : le lien de chaque e-mail de notification coupe ces e-mails
 * pour l'entreprise, sans se connecter (la page le confirme d'un bouton : jamais au simple chargement). Depuis Compte,
 * l'artisan les coupe ou les remet.
 */
@Controller("v1")
export class EmailsController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  private entreprise(jeton: string): string {
    const companyId = lireJetonEmailsCoupes(this.config.authSecret, jeton);
    if (!companyId) throw notFound("Lien");
    return companyId;
  }

  @Public()
  @Throttle({ default: HOURLY(60) })
  @Get("emails/stop/:jeton")
  async page(@Param("jeton") jeton: string) {
    const c = await this.prisma.company.findUnique({ where: { id: this.entreprise(jeton) }, select: { name: true, emailsCoupesLe: true } });
    if (!c) throw notFound("Lien");
    return { entreprise: c.name, coupes: !!c.emailsCoupesLe };
  }

  @Public()
  @Throttle({ default: HOURLY(30) })
  @Post("emails/stop/:jeton")
  @HttpCode(200)
  async couper(@Param("jeton") jeton: string) {
    const id = this.entreprise(jeton);
    await this.prisma.company.updateMany({ where: { id, emailsCoupesLe: null }, data: { emailsCoupesLe: new Date() } });
    return { coupes: true };
  }

  @UseGuards(TenantGuard)
  @Get("me/emails")
  async etat(@Tenant() tenant: TenantContext) {
    const c = await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { emailsCoupesLe: true } });
    return { actifs: !c?.emailsCoupesLe };
  }

  @UseGuards(TenantGuard)
  @Put("me/emails")
  async changer(@Tenant() tenant: TenantContext, @Body(new ZodPipe(preference)) body: z.infer<typeof preference>) {
    await this.prisma.company.update({ where: { id: tenant.companyId }, data: { emailsCoupesLe: body.actifs ? null : new Date() } });
    return { actifs: body.actifs };
  }
}
