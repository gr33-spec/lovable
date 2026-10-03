import { Controller, Get, Headers, Inject } from "@nestjs/common";
import type { AppConfig } from "../../../platform/config/config.js";
import { forbidden } from "../../../platform/errors/domain-error.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Public } from "../../identity/index.js";
import { AccountData } from "../infrastructure/account-data.js";

/**
 * Purge quotidienne (tâche planifiée Vercel, `vercel.json` → crons) : comptes sans visite depuis
 * 3 ans. Appelée seulement avec le secret de la tâche (CRON_SECRET) ; sans secret configuré, fermée.
 */
@Controller("v1/internal")
export class RetentionController {
  constructor(
    @Inject(AccountData) private readonly data: AccountData,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Get("purge-inactive")
  async purge(@Headers("authorization") authorization: string | undefined) {
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Scheduled task only");
    return this.data.purgeInactive();
  }
}
