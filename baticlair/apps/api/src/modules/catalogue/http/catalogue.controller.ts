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
const accepterBody = z.object({ cle: texte(200), metier: texte(40), famille: texte(80) });

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
    return user.email;
  }

  /** Chaque changement du catalogue va au journal de l'admin, comme les autres gestes de l'admin (relecture du 30 octobre 2026). */
  private journal(tenant: TenantContext, email: string, action: string, cible: string) {
    return this.prisma.journalAdmin.create({ data: { userId: tenant.userId, email, action: `catalogue:${action}`, cible: cible.slice(0, 200) } });
  }

  @Get()
  async lister(@Tenant() tenant: TenantContext, @Query("metier") metier?: string) {
    await this.garde(tenant);
    return this.catalogue.admin(metier);
  }

  @Post()
  async ajouter(@Tenant() tenant: TenantContext, @Body(new ZodPipe(ajoutBody)) body: z.infer<typeof ajoutBody>) {
    const email = await this.garde(tenant);
    const r = await this.catalogue.ajouter({ ...body, variante: body.variante ?? null, designation: body.designation ?? null });
    await this.journal(tenant, email, "ajout", `${body.metier} › ${body.famille} › ${body.produit}${body.variante ? ` › ${body.variante}` : ""}`);
    return r;
  }

  /** Les intitulés génériques écrits par plusieurs entreprises, à ajouter au catalogue ou non (Greg, 30 octobre 2026, nuit). */
  @Get("propositions")
  async propositions(@Tenant() tenant: TenantContext) {
    await this.garde(tenant);
    return { items: await this.catalogue.propositions() };
  }

  @Post("propositions/accepter")
  async accepter(@Tenant() tenant: TenantContext, @Body(new ZodPipe(accepterBody)) body: z.infer<typeof accepterBody>) {
    const email = await this.garde(tenant);
    const r = await this.catalogue.accepterProposition(body.cle, body.metier, body.famille);
    await this.journal(tenant, email, "proposition", `${body.metier} › ${body.famille} › ${body.cle}`);
    return r;
  }

  @Get("lignes-libres")
  async lignesLibres(@Tenant() tenant: TenantContext) {
    await this.garde(tenant);
    return { items: await this.catalogue.lignesLibres() };
  }

  @Post("lignes-libres/rattacher")
  async rattacher(@Tenant() tenant: TenantContext, @Body(new ZodPipe(rattacherBody)) body: z.infer<typeof rattacherBody>) {
    const email = await this.garde(tenant);
    const r = await this.catalogue.rattacherLigneLibre(body.ligneId, body.cle);
    await this.journal(tenant, email, "rattachement", `${body.ligneId} → ${body.cle}`);
    return r;
  }

  @Patch()
  async modifier(@Tenant() tenant: TenantContext, @Query("cle") cle: string | undefined, @Body(new ZodPipe(modifBody)) body: z.infer<typeof modifBody>) {
    const email = await this.garde(tenant);
    const r = await this.catalogue.modifier(cle ?? "", body);
    await this.journal(tenant, email, body.masque === true ? "masque" : body.masque === false ? "affiche" : "modification", cle ?? "");
    return r;
  }
}
