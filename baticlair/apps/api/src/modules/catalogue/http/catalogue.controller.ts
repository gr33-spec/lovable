import { Body, Controller, Get, Inject, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import type { AppConfig } from "../../../platform/config/config.js";
import { PrismaService } from "../../../platform/database/prisma.service.js";
import { forbidden } from "../../../platform/errors/domain-error.js";
import { exigerDeuxFacteurs } from "../../../platform/http/deux-facteurs.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { CatalogueService } from "../application/catalogue.service.js";

/** Le catalogue de l'artisan : « Métier : Couverture ▾ », les listes (un toucher par niveau), la recherche. */
@Controller("v1/catalogue")
@UseGuards(TenantGuard)
export class CatalogueController {
  constructor(@Inject(CatalogueService) private readonly catalogue: CatalogueService) {}

  @Get()
  lire(@Tenant() tenant: TenantContext, @Query("metier") metier?: string, @Query("q") q?: string) {
    return this.catalogue.lire(tenant, metier, (q ?? "").slice(0, 120));
  }
}

const texte = (max: number) => z.string().trim().min(1).max(max);
const ajoutBody = z.object({ metier: texte(40), famille: texte(80), produit: texte(120), variante: z.string().trim().max(120).nullable(), designation: z.string().trim().max(200).nullable(), unite: texte(40), synonymes: z.array(texte(60)).max(30).default([]) });
const modifBody = z.object({ famille: texte(80), produit: texte(120), variante: z.string().trim().max(120).nullable(), designation: texte(200), unite: texte(40), synonymes: z.array(texte(60)).max(30), masque: z.boolean() }).partial();

const rattacherBody = z.object({ ligneId: z.uuid(), cle: texte(200) });

/** L'admin du catalogue : ajouter, renommer, masquer (réservé aux `GROUPE_ADMINS`, code à 6 chiffres). */
@Controller("v1/admin/catalogue")
@UseGuards(TenantGuard)
export class AdminCatalogueController {
  constructor(
    @Inject(CatalogueService) private readonly catalogue: CatalogueService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  private async garde(tenant: TenantContext) {
    const user = await this.prisma.user.findUnique({ where: { id: tenant.userId }, select: { email: true } });
    if (!user || !this.config.groupe.admins.includes(user.email.toLowerCase())) throw forbidden("Reserved to admins");
    await exigerDeuxFacteurs(this.prisma, tenant.userId);
  }

  @Get()
  async lister(@Tenant() tenant: TenantContext, @Query("metier") metier?: string) {
    await this.garde(tenant);
    return this.catalogue.admin(metier);
  }

  @Post()
  async ajouter(@Tenant() tenant: TenantContext, @Body(new ZodPipe(ajoutBody)) body: z.infer<typeof ajoutBody>) {
    await this.garde(tenant);
    return this.catalogue.ajouter(body);
  }

  @Get("lignes-libres")
  async lignesLibres(@Tenant() tenant: TenantContext) {
    await this.garde(tenant);
    return { items: await this.catalogue.lignesLibres() };
  }

  @Post("lignes-libres/rattacher")
  async rattacher(@Tenant() tenant: TenantContext, @Body(new ZodPipe(rattacherBody)) body: z.infer<typeof rattacherBody>) {
    await this.garde(tenant);
    return this.catalogue.rattacherLigneLibre(body.ligneId, body.cle);
  }

  @Patch()
  async modifier(@Tenant() tenant: TenantContext, @Query("cle") cle: string | undefined, @Body(new ZodPipe(modifBody)) body: z.infer<typeof modifBody>) {
    await this.garde(tenant);
    return this.catalogue.modifier(cle ?? "", body);
  }
}
