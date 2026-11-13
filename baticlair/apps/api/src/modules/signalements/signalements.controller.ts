import { Body, Controller, Get, Header, HttpCode, Inject, Param, Post, Put, Query, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { z } from "zod";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { forbidden } from "../../platform/errors/domain-error.js";
import { exigerDeuxFacteurs } from "../../platform/http/deux-facteurs.js";
import { HOURLY } from "../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../platform/http/zod.js";
import { CONFIG } from "../../platform/tokens.js";
import { Public } from "../identity/index.js";
import { Tenant, TenantGuard, type TenantContext } from "../tenancy/index.js";
import { GRAVITES_SIGNALEMENT, STATUTS_SIGNALEMENT, SignalementsService } from "./signalements.service.js";

const commun = {
  message: z.string().trim().min(3).max(3000),
  page: z.string().trim().min(1).max(2000),
  contexte: z.string().trim().max(300).nullish(),
  /** L'image en « data:image/…;base64,… » ; l'écran la réduit pour qu'elle tienne dans la requête. */
  capture: z.string().max(900_000).nullish(),
};
const corpsConnecte = z.object(commun);
const corpsPublic = z.object({ ...commun, email: z.email().max(200).nullish(), origine: z.enum(["negoce", "public"]).default("public") });
const corpsSuivi = z.object({
  statut: z.enum(STATUTS_SIGNALEMENT).optional(),
  resume: z.string().max(5000).optional(),
  gravite: z.enum(GRAVITES_SIGNALEMENT).optional(),
  validerLaCorrection: z.literal(true).optional(),
});

/** Le signalement d'un compte connecté : l'e-mail est celui du compte, jamais saisi. */
@Controller("v1/signalements")
@UseGuards(TenantGuard)
export class SignalementsController {
  constructor(
    @Inject(SignalementsService) private readonly signalements: SignalementsService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  @Throttle({ default: HOURLY(20) })
  @Post()
  @HttpCode(201)
  async signaler(@Tenant() tenant: TenantContext, @Body(new ZodPipe(corpsConnecte)) b: z.infer<typeof corpsConnecte>) {
    const user = await this.prisma.user.findUnique({ where: { id: tenant.userId }, select: { email: true } });
    return this.signalements.creer({ message: b.message, page: b.page, contexte: b.contexte ?? null, capture: b.capture ?? null, origine: "artisan", email: user?.email ?? null, companyId: tenant.companyId, userId: tenant.userId });
  }
}

/** Le signalement sans compte : l'espace négoce (lien reçu par e-mail) et les pages publiques. */
@Controller("v1/public/signalements")
export class SignalementsPublicsController {
  constructor(@Inject(SignalementsService) private readonly signalements: SignalementsService) {}

  @Public()
  @Throttle({ default: HOURLY(10) })
  @Post()
  @HttpCode(201)
  signaler(@Body(new ZodPipe(corpsPublic)) b: z.infer<typeof corpsPublic>) {
    return this.signalements.creer({ message: b.message, page: b.page, contexte: b.contexte ?? null, capture: b.capture ?? null, origine: b.origine, email: b.email ?? null });
  }
}

/** La liste et le suivi, réservés aux `GROUPE_ADMINS` (code à 6 chiffres), chaque geste au journal de l'admin. */
@Controller("v1/admin/signalements")
@UseGuards(TenantGuard)
export class SignalementsAdminController {
  constructor(
    @Inject(SignalementsService) private readonly signalements: SignalementsService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  private async garde(tenant: TenantContext): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: tenant.userId }, select: { email: true } });
    if (!user || !this.config.groupe.admins.includes(user.email.toLowerCase())) throw forbidden("Reserved to admins");
    await exigerDeuxFacteurs(this.prisma, tenant.userId);
    return user.email;
  }

  @Get()
  async lister(@Tenant() tenant: TenantContext, @Query("statut") statut?: string) {
    await this.garde(tenant);
    return this.signalements.lister(STATUTS_SIGNALEMENT.find((s) => s === statut));
  }

  @Get(":id/capture")
  @Header("Cache-Control", "private, no-store")
  async capture(@Tenant() tenant: TenantContext, @Param("id") id: string, @Res() res: Response) {
    await this.garde(tenant);
    const c = await this.signalements.capture(id);
    res.setHeader("Content-Type", c.type);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(c.octets);
  }

  @Put(":id")
  async suivre(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(corpsSuivi)) b: z.infer<typeof corpsSuivi>) {
    const email = await this.garde(tenant);
    const r = await this.signalements.suivre(id, { ...(b.statut ? { statut: b.statut } : {}), ...(b.resume !== undefined ? { resume: b.resume } : {}), ...(b.gravite ? { gravite: b.gravite } : {}), ...(b.validerLaCorrection ? { validerLaCorrection: true } : {}) });
    await this.prisma.journalAdmin.create({ data: { userId: tenant.userId, email, action: `signalement:${b.validerLaCorrection ? "correction validée" : (b.statut ?? "suivi")}`, cible: id } });
    return r;
  }
}
