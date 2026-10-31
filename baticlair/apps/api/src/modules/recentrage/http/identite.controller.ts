import { Body, Controller, Get, Inject, Put, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodPipe } from "../../../platform/http/zod.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { IdentiteService } from "../application/identite.service.js";

const identiteBody = z.object({ siret: z.string().trim().min(14).max(20), prenom: z.string().trim().min(1).max(60), telephone: z.string().trim().min(10).max(20) });

/** L'identité de l'artisan, demandée au premier envoi à un négoce (Greg, lot final, point 1), modifiable dans Profil. */
@Controller("v1/company/identite")
@UseGuards(TenantGuard)
export class IdentiteController {
  constructor(@Inject(IdentiteService) private readonly identite: IdentiteService) {}

  @Get()
  lire(@Tenant() tenant: TenantContext) {
    return this.identite.lire(tenant);
  }

  /** Ce que l'annuaire dit d'un SIRET (`?siret=`), pour préremplir l'écran ; rien n'est enregistré. */
  @Get("annuaire")
  apercu(@Query("siret") siret: string | undefined) {
    return this.identite.apercu(siret ?? "");
  }

  @Put()
  enregistrer(@Tenant() tenant: TenantContext, @Body(new ZodPipe(identiteBody)) body: z.infer<typeof identiteBody>) {
    return this.identite.enregistrer(tenant, body);
  }
}
