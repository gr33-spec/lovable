import { Body, Controller, Delete, Get, HttpCode, Inject, Module, Put, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { DomainError } from "../../platform/errors/domain-error.js";
import { ZodPipe } from "../../platform/http/zod.js";
import { Tenant, TenantGuard, TenancyModule, type TenantContext } from "../tenancy/index.js";

/**
 * LES BROUILLONS (correction après test de Greg, 30 octobre 2026, point 2) : « tout parcours commencé est enregistré
 * automatiquement comme brouillon, sur le serveur ». L'écran l'écrit à chaque geste (clé du parcours, étape, saisie) ;
 * en revenant il le relit et reprend à l'étape quittée ; l'accueil montre « Reprendre ». Fini (envoyé), il est effacé.
 */
const CLE = z.string().trim().min(3).max(160).regex(/^[a-z-]+:[A-Za-z0-9:_-]+$/);
const brouillonBody = z.object({
  cle: CLE,
  type: z.enum(["achat-groupe", "liste", "envoi"]),
  titre: z.string().trim().min(1).max(160),
  url: z.string().trim().min(1).max(300).regex(/^\/[^\s]*$/),
  etape: z.number().int().min(1).max(20),
  donnees: z.record(z.string(), z.unknown()).refine((d) => JSON.stringify(d).length <= 200_000, "Brouillon trop lourd"),
});

const vue = (b: { cle: string; type: string; titre: string; url: string; etape: number; donnees: unknown; updatedAt: Date }) => ({ cle: b.cle, type: b.type, titre: b.titre, url: b.url, etape: b.etape, donnees: b.donnees, modifieLe: b.updatedAt.toISOString() });

@Controller("v1/brouillons")
@UseGuards(TenantGuard)
export class BrouillonsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Les parcours à reprendre, du plus récent au plus ancien (l'accueil). */
  @Get()
  async lister(@Tenant() tenant: TenantContext) {
    const items = await this.prisma.brouillon.findMany({ where: { companyId: tenant.companyId }, orderBy: { updatedAt: "desc" }, take: 20 });
    return { items: items.map(vue) };
  }

  /** Un parcours, par sa clé (null s'il n'y en a pas). */
  @Get("un")
  async un(@Tenant() tenant: TenantContext, @Query("cle") cle: string | undefined) {
    const c = CLE.safeParse(cle ?? "");
    if (!c.success) return { brouillon: null };
    const b = await this.prisma.brouillon.findUnique({ where: { companyId_cle: { companyId: tenant.companyId, cle: c.data } } });
    return { brouillon: b ? vue(b) : null };
  }

  @Put()
  async ecrire(@Tenant() tenant: TenantContext, @Body(new ZodPipe(brouillonBody)) body: z.infer<typeof brouillonBody>) {
    if (tenant.role === "viewer") throw new DomainError("forbidden", "Read-only membership");
    const data = { type: body.type, titre: body.titre, url: body.url, etape: body.etape, donnees: body.donnees as never, userId: tenant.userId };
    const b = await this.prisma.brouillon.upsert({ where: { companyId_cle: { companyId: tenant.companyId, cle: body.cle } }, create: { ...data, companyId: tenant.companyId, cle: body.cle }, update: data });
    return vue(b);
  }

  @Delete()
  @HttpCode(200)
  async effacer(@Tenant() tenant: TenantContext, @Query("cle") cle: string | undefined) {
    const c = CLE.safeParse(cle ?? "");
    if (c.success) await this.prisma.brouillon.deleteMany({ where: { companyId: tenant.companyId, cle: c.data } });
    return { efface: true };
  }
}

@Module({ imports: [TenancyModule], controllers: [BrouillonsController] })
export class BrouillonsModule {}
