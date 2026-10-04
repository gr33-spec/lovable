import { Module } from "@nestjs/common";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { BillingModule, BillingService } from "../billing/index.js";
import { DocumentsModule, DocumentsService } from "../documents/index.js";
import { ProjectsModule, ProjectsService } from "../projects/index.js";
import { TakeoffModule, TakeoffService } from "../takeoff/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { QuantitatifsService } from "./application/quantitatifs.service.js";
import { InfosChantierController, QuantitatifsController } from "./http/quantitatifs.controller.js";

/** La porte d'entrée unique /v1/quantitatifs (§38), au-dessus des modules existants. */
@Module({
  imports: [TenancyModule, ProjectsModule, BillingModule, DocumentsModule, TakeoffModule],
  controllers: [QuantitatifsController, InfosChantierController],
  providers: [
    {
      provide: QuantitatifsService,
      useFactory: (prisma: PrismaService, projects: ProjectsService, billing: BillingService, documents: DocumentsService, takeoffs: TakeoffService) =>
        new QuantitatifsService(prisma, projects, billing, documents, takeoffs),
      inject: [PrismaService, ProjectsService, BillingService, DocumentsService, TakeoffService],
    },
  ],
})
export class QuantitatifsModule {}
