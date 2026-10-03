import { Body, Controller, Delete, Get, HttpCode, Inject, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { z } from "zod";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CurrentUser, type AuthenticatedUser } from "../../identity/index.js";
import { AccountData } from "../infrastructure/account-data.js";

/** Suppression : l'artisan tape SUPPRIMER (pas d'effacement par un appui distrait). */
const deleteBody = z.object({ confirm: z.literal("SUPPRIMER") });

@Controller("v1/me")
export class PrivacyController {
  constructor(@Inject(AccountData) private readonly data: AccountData) {}

  /** Mes données (RGPD, article 20) : un fichier JSON à télécharger. */
  @Get("export")
  async export(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response) {
    const day = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Disposition", `attachment; filename="baticlair-mes-donnees-${day}.json"`);
    return this.data.export(user.userId);
  }

  /** Supprimer mon compte (RGPD, article 17) : définitif. */
  @Throttle({ default: HOURLY(5) })
  @Delete()
  @HttpCode(200)
  async remove(@CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(deleteBody)) body: z.infer<typeof deleteBody>) {
    // La validation a vérifié le mot tapé : sans « SUPPRIMER », rien n'est effacé.
    if (body.confirm !== "SUPPRIMER") return { companiesDeleted: 0, companiesLeft: 0 };
    return this.data.delete(user.userId);
  }
}
