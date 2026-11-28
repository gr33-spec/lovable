import { Module } from "@nestjs/common";
import type { Alerter } from "../../platform/alerts/alerter.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { ALERTER } from "../../platform/tokens.js";
import { PilotageModule } from "../pilotage/index.js";
import { clesGithub } from "./application/jeton-github.js";
import { SauvegardeService } from "./application/sauvegarde.service.js";
import { LECTEUR_CLES_GITHUB, SauvegardeAdminController, SauvegardeInterneController } from "./http/sauvegarde.controller.js";

/** La sauvegarde nocturne prévient elle-même (Greg, 28 novembre 2026) : une table, deux portes internes, une porte admin. */
@Module({
  imports: [PilotageModule],
  controllers: [SauvegardeInterneController, SauvegardeAdminController],
  providers: [
    { provide: LECTEUR_CLES_GITHUB, useFactory: () => clesGithub() },
    { provide: SauvegardeService, useFactory: (p: PrismaService, a: Alerter) => new SauvegardeService(p, a), inject: [PrismaService, ALERTER] },
  ],
})
export class SauvegardeModule {}
