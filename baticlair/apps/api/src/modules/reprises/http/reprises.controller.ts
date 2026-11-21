import { Controller, Get, Headers, Inject, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { AppConfig } from "../../../platform/config/config.js";
import { forbidden } from "../../../platform/errors/domain-error.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import type { FileReprise } from "../../../platform/reprise/file-reprise.js";
import { FILE_REPRISE } from "../../../platform/reprise/reprise.module.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Public } from "../../identity/index.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";

/** Ce que voit l'artisan : ses actions qui attendent un nouvel essai, ou qui ont échoué (revue du 26 octobre 2026). */
@Controller("v1")
export class RepriseController {
  constructor(@Inject(FILE_REPRISE) private readonly file: FileReprise) {}

  @UseGuards(TenantGuard)
  @Get("reprises")
  async miennes(@Tenant() tenant: TenantContext) {
    return { reprises: await this.file.pourEntreprise(tenant.companyId) };
  }
}

/** La tâche planifiée : rejoue ce qui est dû (secret de tâche). */
@Controller("v1/internal")
export class RepriseTacheController {
  constructor(
    @Inject(FILE_REPRISE) private readonly file: FileReprise,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Throttle({ default: HOURLY(120) })
  @Get("reprises")
  async traiter(@Headers("authorization") authorization: string | undefined) {
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Scheduled task only");
    return this.file.traiter();
  }
}
