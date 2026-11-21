import { Module } from "@nestjs/common";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { signalerException } from "../../platform/supervision/exceptions.js";
import { COMPANY_REPOSITORY, type CompanyRepository } from "./application/company.repository.js";
import { TenancyService } from "./application/tenancy.service.js";
import { MeController } from "./http/me.controller.js";
import { TenantGuard } from "./http/tenant.guard.js";
import { PrismaCompanyRepository } from "./infrastructure/prisma-company.repository.js";

@Module({
  controllers: [MeController],
  providers: [
    { provide: COMPANY_REPOSITORY, useFactory: (p: PrismaService) => new PrismaCompanyRepository(p), inject: [PrismaService] },
    {
      provide: TenancyService,
      useFactory: (r: CompanyRepository, prisma: PrismaService) => {
        const s = new TenancyService(r);
        // Lot 6 (Greg, 7 novembre 2026) : une entreprise existante demandée par quelqu'un qui n'en est pas membre ; l'accès
        // reste refusé, l'admin voit une alerte minimale (ni nom, ni donnée de l'entreprise).
        s.brancherAccesCroise(async (userId, companyId) => {
          if (!(await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } }))) return;
          await signalerException(prisma, { type: "acces_croise", cle: `${userId}:${companyId}`, titre: "Un compte a demandé une entreprise dont il n'est pas membre", detail: `Utilisateur ${userId.slice(0, 8)}…, entreprise ${companyId.slice(0, 8)}… : accès refusé (404).`, companyId });
        });
        return s;
      },
      inject: [COMPANY_REPOSITORY, PrismaService],
    },
    { provide: TenantGuard, useFactory: (s: TenancyService) => new TenantGuard(s), inject: [TenancyService] },
  ],
  exports: [TenancyService, TenantGuard],
})
export class TenancyModule {}
