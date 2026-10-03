import { Module } from "@nestjs/common";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { EmailCapability, TransactionalEmailSender } from "../../platform/email/email.port.js";
import { EMAIL_SENDER } from "../../platform/tokens.js";
import { DocumentsModule, DocumentsService } from "../documents/index.js";
import { SUPPLIER_REPOSITORY, SuppliersModule, type SupplierRepository } from "../suppliers/index.js";
import { TakeoffModule, TakeoffService } from "../takeoff/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { PRICE_REQUEST_REPOSITORY, type PriceRequestRepository } from "./application/price-request.repository.js";
import { PriceRequestsService } from "./application/price-requests.service.js";
import { PriceRequestsController } from "./http/price-requests.controller.js";
import { PrismaPriceRequestRepository } from "./infrastructure/prisma-price-request.repository.js";

@Module({
  imports: [TenancyModule, DocumentsModule, SuppliersModule, TakeoffModule],
  controllers: [PriceRequestsController],
  providers: [
    {
      provide: PRICE_REQUEST_REPOSITORY,
      useFactory: (p: PrismaService) => new PrismaPriceRequestRepository(p),
      inject: [PrismaService],
    },
    {
      provide: PriceRequestsService,
      useFactory: (r: PriceRequestRepository, s: SupplierRepository, d: DocumentsService, t: TakeoffService, mailer: TransactionalEmailSender & EmailCapability) =>
        new PriceRequestsService(r, s, d, (tenant, takeoffId) => t.reviewed(tenant, takeoffId), mailer),
      inject: [PRICE_REQUEST_REPOSITORY, SUPPLIER_REPOSITORY, DocumentsService, TakeoffService, EMAIL_SENDER],
    },
  ],
  exports: [PRICE_REQUEST_REPOSITORY, PriceRequestsService],
})
export class PriceRequestsModule {}
