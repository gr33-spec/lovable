import { signalerException } from "../../platform/supervision/exceptions.js";
import { Module } from "@nestjs/common";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { TenancyModule } from "../tenancy/index.js";
import { SUPPLIER_REPOSITORY, type SupplierRepository } from "./application/supplier.repository.js";
import { SuppliersService } from "./application/suppliers.service.js";
import { SuppliersController } from "./http/suppliers.controller.js";
import { PrismaSupplierRepository } from "./infrastructure/prisma-supplier.repository.js";

@Module({
  imports: [TenancyModule],
  controllers: [SuppliersController],
  providers: [
    {
      provide: SUPPLIER_REPOSITORY,
      useFactory: (p: PrismaService) => new PrismaSupplierRepository(p),
      inject: [PrismaService],
    },
    {
      provide: SuppliersService,
      useFactory: (r: SupplierRepository, p: PrismaService) => new SuppliersService(r, (e) => signalerException(p, e)),
      inject: [SUPPLIER_REPOSITORY, PrismaService],
    },
  ],
  exports: [SUPPLIER_REPOSITORY],
})
export class SuppliersModule {}
