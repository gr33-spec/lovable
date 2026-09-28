import { Module } from "@nestjs/common";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { COMPANY_REPOSITORY, type CompanyRepository } from "./application/company.repository.js";
import { TenancyService } from "./application/tenancy.service.js";
import { MeController } from "./http/me.controller.js";
import { TenantGuard } from "./http/tenant.guard.js";
import { PrismaCompanyRepository } from "./infrastructure/prisma-company.repository.js";

@Module({
  controllers: [MeController],
  providers: [
    { provide: COMPANY_REPOSITORY, useFactory: (p: PrismaService) => new PrismaCompanyRepository(p), inject: [PrismaService] },
    { provide: TenancyService, useFactory: (r: CompanyRepository) => new TenancyService(r), inject: [COMPANY_REPOSITORY] },
    { provide: TenantGuard, useFactory: (s: TenancyService) => new TenantGuard(s), inject: [TenancyService] },
  ],
  exports: [TenancyService, TenantGuard],
})
export class TenancyModule {}
