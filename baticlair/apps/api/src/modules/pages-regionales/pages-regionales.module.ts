import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { CONFIG } from "../../platform/tokens.js";
import { PilotageModule } from "../pilotage/index.js";
import { PagesRegionalesService } from "./application/pages-regionales.service.js";
import { PagesRegionalesAdminController, PagesRegionalesPublicController } from "./http/pages-regionales.controller.js";

/** Les pages régionales (Greg, 19 novembre 2026) : regroupements d'un département, liste d'attente par métier. */
@Module({
  imports: [PilotageModule],
  controllers: [PagesRegionalesPublicController, PagesRegionalesAdminController],
  providers: [{ provide: PagesRegionalesService, useFactory: (p: PrismaService, c: AppConfig) => new PagesRegionalesService(p, { achatsGroupesV1: c.achatsGroupesV1 }), inject: [PrismaService, CONFIG] }],
})
export class PagesRegionalesModule {}
