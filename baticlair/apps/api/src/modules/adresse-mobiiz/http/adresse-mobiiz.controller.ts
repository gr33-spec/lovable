import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Query, Res, StreamableFile, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { ZodPipe } from "../../../platform/http/zod.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { AdresseMobiizService } from "../application/adresse-mobiiz.service.js";
import { ReponsesRecuesService } from "../application/reponses-recues.service.js";

const adresseBody = z.object({ adresse: z.string().min(1).max(80) });
const rattacherBody = z.object({ recipientId: z.string().uuid() });

/** R7 : l'adresse Mobiiz de l'entreprise, et les e-mails reçus dessus. */
@Controller("v1")
@UseGuards(TenantGuard)
export class AdresseMobiizController {
  constructor(
    @Inject(AdresseMobiizService) private readonly adresses: AdresseMobiizService,
    @Inject(ReponsesRecuesService) private readonly recus: ReponsesRecuesService,
  ) {}

  @Get("company/adresse-mobiiz")
  etat(@Tenant() tenant: TenantContext) {
    return this.adresses.etat(tenant);
  }

  /** L'écran « Voici ton adresse Mobiiz » a été vu. */
  @Post("company/adresse-mobiiz/vue")
  @HttpCode(200)
  vue(@Tenant() tenant: TenantContext) {
    return this.adresses.marquerVue(tenant);
  }

  @Post("company/adresse-mobiiz/verifier")
  @HttpCode(200)
  verifier(@Tenant() tenant: TenantContext, @Body(new ZodPipe(adresseBody)) body: z.infer<typeof adresseBody>) {
    return this.adresses.verifier(tenant, body.adresse);
  }

  @Put("company/adresse-mobiiz")
  changer(@Tenant() tenant: TenantContext, @Body(new ZodPipe(adresseBody)) body: z.infer<typeof adresseBody>) {
    return this.adresses.changer(tenant, body.adresse);
  }

  @Get("recus")
  async lister(@Tenant() tenant: TenantContext, @Query("projectId") projectId?: string) {
    return { items: await this.recus.lister(tenant, projectId || undefined) };
  }

  /** Les demandes parties, pour « Rattacher à une demande » (déclarée avant `recus/:id`). */
  @Get("recus/demandes")
  async demandes(@Tenant() tenant: TenantContext) {
    return { items: await this.recus.demandesParties(tenant) };
  }

  @Get("recus/:id")
  un(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return this.recus.un(tenant, id);
  }

  @Get("recus/:id/fichiers/:fichierId")
  async fichier(@Tenant() tenant: TenantContext, @Param("id") id: string, @Param("fichierId") fichierId: string, @Res({ passthrough: true }) res: Response) {
    const f = await this.recus.fichier(tenant, id, fichierId);
    res.setHeader("Content-Type", f.type);
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(f.nom)}`);
    res.setHeader("Cache-Control", "private, no-store");
    return new StreamableFile(f.contenu);
  }

  @Post("recus/:id/rattacher")
  @HttpCode(200)
  rattacher(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(rattacherBody)) body: z.infer<typeof rattacherBody>) {
    return this.recus.rattacher(tenant, id, body.recipientId);
  }
}
