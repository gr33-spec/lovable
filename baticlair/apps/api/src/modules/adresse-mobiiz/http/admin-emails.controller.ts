import { Body, Controller, Get, HttpCode, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import type { AppConfig } from "../../../platform/config/config.js";
import { PrismaService } from "../../../platform/database/prisma.service.js";
import type { LecteurEmailRecu } from "../../../platform/email/contact-entrant.js";
import { forbidden } from "../../../platform/errors/domain-error.js";
import { exigerDeuxFacteurs } from "../../../platform/http/deux-facteurs.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CONFIG, EMAIL_RECU } from "../../../platform/tokens.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { ReponsesRecuesService } from "../application/reponses-recues.service.js";

const rattacherBody = z.object({ adresse: z.string().trim().min(3).max(120) });

/**
 * Correction après test de Greg (30 octobre 2026) : les e-mails reçus sur une adresse Mobiiz que personne n'a, mis de
 * côté ; l'admin les lit et les rattache à l'entreprise d'une adresse. Réservé aux `GROUPE_ADMINS`, code à 6 chiffres.
 */
@Controller("v1/admin/emails-mis-de-cote")
@UseGuards(TenantGuard)
export class AdminEmailsController {
  constructor(
    @Inject(ReponsesRecuesService) private readonly recus: ReponsesRecuesService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(EMAIL_RECU) private readonly lecteur: LecteurEmailRecu,
  ) {}

  private async garde(tenant: TenantContext): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: tenant.userId }, select: { email: true } });
    if (!user || !this.config.groupe.admins.includes(user.email.toLowerCase())) throw forbidden("Reserved to admins");
    await exigerDeuxFacteurs(this.prisma, tenant.userId);
    return user.email;
  }

  @Get()
  async lister(@Tenant() tenant: TenantContext) {
    await this.garde(tenant);
    return { items: await this.recus.misDeCote() };
  }

  @Post(":id/rattacher")
  @HttpCode(200)
  async rattacher(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(rattacherBody)) body: z.infer<typeof rattacherBody>) {
    const email = await this.garde(tenant);
    const r = await this.recus.rattacherMisDeCote(id, body.adresse, this.lecteur);
    // Au journal de l'admin, comme ses autres gestes (relecture du 30 octobre 2026).
    await this.prisma.journalAdmin.create({ data: { userId: tenant.userId, email, action: "email:rattache", cible: `${id} → ${body.adresse}`.slice(0, 200) } });
    return r;
  }
}
