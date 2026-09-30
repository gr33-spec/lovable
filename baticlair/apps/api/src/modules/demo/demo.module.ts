import { Module } from "@nestjs/common";
import { DocumentsModule, DocumentsService } from "../documents/index.js";
import { PRICE_REQUEST_REPOSITORY, PriceRequestsModule, PriceRequestsService, type PriceRequestRepository } from "../price-requests/index.js";
import { ProjectsModule, ProjectsService } from "../projects/index.js";
import { SUPPLIER_REPOSITORY, SuppliersModule, type SupplierRepository } from "../suppliers/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { DemoService } from "./application/demo.service.js";
import { DemoController } from "./http/demo.controller.js";

@Module({
  imports: [TenancyModule, ProjectsModule, SuppliersModule, DocumentsModule, PriceRequestsModule],
  controllers: [DemoController],
  providers: [
    {
      provide: DemoService,
      useFactory: (p: ProjectsService, s: SupplierRepository, d: DocumentsService, r: PriceRequestRepository, q: PriceRequestsService) =>
        new DemoService(p, s, d, r, q),
      inject: [ProjectsService, SUPPLIER_REPOSITORY, DocumentsService, PRICE_REQUEST_REPOSITORY, PriceRequestsService],
    },
  ],
})
export class DemoModule {}
