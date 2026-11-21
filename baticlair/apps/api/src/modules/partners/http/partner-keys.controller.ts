import { randomBytes } from "node:crypto";
import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../../../platform/database/prisma.service.js";
import { forbidden, notFound } from "../../../platform/errors/domain-error.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { isUuid } from "../../../platform/validation/ids.js";
import { hashApiKey, type RequestWithUser } from "../../identity/index.js";
import { assertCanWrite, Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";

const createBody = z.object({ nom: z.string().trim().min(1).max(80), quotaMensuel: z.number().int().min(1).max(100_000) });

/** Premier jour du mois civil en cours (UTC) : le quota se compte par mois. */
export const monthStart = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

/**
 * CLÉS API PARTENAIRE (plan v3 §1) : une clé par intégration (Rappidos…), rattachée à l'entreprise, avec un quota
 * mensuel de quantitatifs. La clé n'est montrée qu'à sa création et n'est gardée que hachée. Ces routes exigent
 * une session : une clé ne gère jamais les clés.
 */
@Controller("v1/partner-keys")
@UseGuards(TenantGuard)
export class PartnerKeysController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private sessionOnly(req: RequestWithUser) {
    if (req.apiKey) throw forbidden("API keys are managed from a signed-in session only");
  }

  @Get()
  async list(@Tenant() tenant: TenantContext, @Req() req: RequestWithUser) {
    this.sessionOnly(req);
    const keys = await this.prisma.partnerApiKey.findMany({ where: { companyId: tenant.companyId }, orderBy: { createdAt: "asc" } });
    const used = await this.prisma.quantitatif.groupBy({ by: ["apiKeyId"], where: { companyId: tenant.companyId, apiKeyId: { not: null }, createdAt: { gte: monthStart() } }, _count: { _all: true } });
    const usedBy = new Map(used.map((u) => [u.apiKeyId, u._count._all]));
    return {
      items: keys.map((k) => ({
        id: k.id,
        nom: k.name,
        prefixe: k.prefix,
        quotaMensuel: k.monthlyQuota,
        utilisesCeMois: usedBy.get(k.id) ?? 0,
        creeLe: k.createdAt.toISOString(),
        derniereUtilisation: k.lastUsedAt?.toISOString() ?? null,
        revoqueeLe: k.revokedAt?.toISOString() ?? null,
      })),
    };
  }

  /** Crée la clé et la renvoie EN CLAIR, une seule fois. */
  @Post()
  @HttpCode(201)
  async create(@Tenant() tenant: TenantContext, @Req() req: RequestWithUser, @Body(new ZodPipe(createBody)) body: z.infer<typeof createBody>) {
    this.sessionOnly(req);
    assertCanWrite(tenant);
    const cle = `bc_${randomBytes(24).toString("hex")}`;
    const key = await this.prisma.partnerApiKey.create({
      data: { companyId: tenant.companyId, createdById: tenant.userId, name: body.nom, prefix: cle.slice(0, 11), hash: hashApiKey(cle), monthlyQuota: body.quotaMensuel },
    });
    return { id: key.id, nom: key.name, prefixe: key.prefix, quotaMensuel: key.monthlyQuota, cle };
  }

  /** Révoque : la clé reste listée (barrée), plus jamais acceptée. */
  @Delete(":id")
  @HttpCode(204)
  async revoke(@Tenant() tenant: TenantContext, @Req() req: RequestWithUser, @Param("id") id: string): Promise<void> {
    this.sessionOnly(req);
    assertCanWrite(tenant);
    if (!isUuid(id)) throw notFound("API key");
    const { count } = await this.prisma.partnerApiKey.updateMany({ where: { id, companyId: tenant.companyId, revokedAt: null }, data: { revokedAt: new Date() } });
    if (count === 0) throw notFound("API key");
  }
}
