import { Module } from "@nestjs/common";
import { signalerException } from "../../platform/supervision/exceptions.js";
import { gardeCommandeSeule, gardeDemandeIndividuelle } from "../../platform/cycle/lignes.js";
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
      useFactory: (r: PriceRequestRepository, s: SupplierRepository, d: DocumentsService, t: TakeoffService, mailer: TransactionalEmailSender & EmailCapability, prisma: PrismaService) => {
        const service = new PriceRequestsService(
          r,
          s,
          d,
          (tenant, takeoffId) => t.reviewed(tenant, takeoffId),
          mailer,
          undefined,
          (tenant, takeoffId, order) => t.recordSupplierOrder(tenant, takeoffId, order),
        );
        // Le cycle de vie (§19) : « Je retiens ce négoce » est une commande seule ; jamais en double avec un achat groupé.
        service.brancherGardeCircuit((tenant, projectId, keys) => gardeDemandeIndividuelle(prisma, tenant.companyId, projectId, keys));
        service.brancherGardeCommande((tenant, projectId, keys, retirerDesGroupes) => gardeCommandeSeule(prisma, tenant.companyId, projectId, keys, { retirerDesGroupes }).then(() => undefined));
        // Lot 6 : un e-mail au négoce qui ne part pas remonte dans la file d'exceptions de l'admin.
        service.brancherSupervision((e) => signalerException(prisma, e));
        return service;
      },
      inject: [PRICE_REQUEST_REPOSITORY, SUPPLIER_REPOSITORY, DocumentsService, TakeoffService, EMAIL_SENDER, PrismaService],
    },
  ],
  exports: [PRICE_REQUEST_REPOSITORY, PriceRequestsService],
})
export class PriceRequestsModule {}
