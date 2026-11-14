import { Module } from "@nestjs/common";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { TenancyModule } from "../tenancy/index.js";
import { CatalogueService } from "./application/catalogue.service.js";
import { AdminCatalogueController, CatalogueController } from "./http/catalogue.controller.js";

/** Le catalogue complet, métier par métier (correction après test de Greg, 30 octobre 2026, point 3). */
@Module({
  imports: [TenancyModule],
  controllers: [CatalogueController, AdminCatalogueController],
  providers: [{ provide: CatalogueService, useFactory: (p: PrismaService) => new CatalogueService(p), inject: [PrismaService] }],
  exports: [CatalogueService],
})
export class CatalogueModule {}
