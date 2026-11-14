import { Body, Controller, HttpCode, Inject, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { ListesService } from "../application/listes.service.js";

const idsBody = z.object({ ids: z.array(z.string().uuid()).min(1).max(50) });

/**
 * « MES LISTES » (Greg, 1er novembre 2026) : la suppression définitive, toujours décidée ici (jamais par l'écran) :
 * `verifier` dit, liste par liste, si elle peut l'être et pourquoi pas ; `suppression` supprime tout ou rien.
 */
@Controller("v1/listes")
@UseGuards(TenantGuard)
export class ListesController {
  constructor(@Inject(ListesService) private readonly listes: ListesService) {}

  @Post("suppression/verifier")
  @HttpCode(200)
  async verifier(@Tenant() tenant: TenantContext, @Body(new ZodPipe(idsBody)) body: z.infer<typeof idsBody>) {
    return { listes: await this.listes.verifier(tenant, body.ids) };
  }

  @Throttle({ default: HOURLY(120) })
  @Post("suppression")
  @HttpCode(200)
  async supprimer(@Tenant() tenant: TenantContext, @Body(new ZodPipe(idsBody)) body: z.infer<typeof idsBody>) {
    return this.listes.supprimer(tenant, body.ids);
  }
}
