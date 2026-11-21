import { Controller, Get, Headers, Inject, Query } from "@nestjs/common";
import { PrismaService } from "../../../platform/database/prisma.service.js";
import { purgerSelonLeRegistre } from "../application/purges.js";
import type { AppConfig } from "../../../platform/config/config.js";
import { forbidden } from "../../../platform/errors/domain-error.js";
import { CONFIG } from "../../../platform/tokens.js";
import { UploadParts } from "../../documents/index.js";
import { Throttle } from "@nestjs/throttler";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { Public } from "../../identity/index.js";
import { AccountData } from "../infrastructure/account-data.js";

/**
 * Purge quotidienne (tâche planifiée Vercel, `vercel.json` → crons) : comptes sans visite depuis
 * 3 ans, et morceaux d'envois abandonnés depuis plus de 24 h. Appelée seulement avec le secret de la tâche (CRON_SECRET) ; sans secret configuré, fermée.
 */
@Controller("v1/internal")
export class RetentionController {
  constructor(
    @Inject(AccountData) private readonly data: AccountData,
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(UploadParts) private readonly uploads: UploadParts,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Throttle({ default: HOURLY(60) })
  @Get("purge-inactive")
  async purge(@Headers("authorization") authorization: string | undefined, @Query("maintenant") maintenantDemande?: string) {
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Scheduled task only");
    const maintenant = this.config.env === "test" && maintenantDemande && !Number.isNaN(Date.parse(maintenantDemande)) ? new Date(maintenantDemande) : new Date();
    const purged = await this.data.purgeInactive(maintenant);
    // RGPD (24 octobre 2026) : chaque durée du registre, appliquée chaque nuit.
    return { ...purged, uploadPartsDeleted: await this.uploads.purgeStale(), registre: await purgerSelonLeRegistre(this.prisma, maintenant) };
  }
}
