import { Module } from "@nestjs/common";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { DocumentsModule, DocumentsService } from "../documents/index.js";
import { SUPPLIER_REPOSITORY, SuppliersModule, type SupplierRepository } from "../suppliers/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { PRICE_REQUEST_REPOSITORY, type PriceRequestRepository } from "./application/price-request.repository.js";
import { PriceRequestsService } from "./application/price-requests.service.js";
import { PriceRequestsController } from "./http/price-requests.controller.js";
import { PrismaPriceRequestRepository } from "./infrastructure/prisma-price-request.repository.js";

@Module({
  imports: [TenancyModule, DocumentsModule, SuppliersModule],
  controllers: [PriceRequestsController],
  providers: [
    {
      provide: PRICE_REQUEST_REPOSITORY,
      useFactory: (p: PrismaService) => new PrismaPriceRequestRepository(p),
      inject: [PrismaService],
    },
    {
      provide: PriceRequestsService,
      useFactory: (r: PriceRequestRepository, s: SupplierRepository, d: DocumentsService) => new PriceRequestsService(r, s, d),
      inject: [PRICE_REQUEST_REPOSITORY, SUPPLIER_REPOSITORY, DocumentsService],
    },
  ],
  exports: [PRICE_REQUEST_REPOSITORY],
})
export class PriceRequestsModule {}
