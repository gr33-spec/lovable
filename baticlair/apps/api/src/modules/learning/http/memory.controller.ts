import { Controller, Delete, HttpCode, Inject, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../../platform/database/prisma.service.js";
import { assertCanWrite, Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";

/**
 * « Effacer ce que BatiClair a appris » (demande du fondateur, 2026-10-04 : des essais faits en cliquant au hasard ne
 * doivent pas devenir des habitudes) : les habitudes de l'entreprise (réponses et produits), les consommables refusés
 * ou ajoutés à la main, et le journal des corrections. Les chantiers, leurs listes et leurs réponses restent.
 */
@Controller("v1/memoire")
@UseGuards(TenantGuard)
export class MemoryController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Delete()
  @HttpCode(200)
  async forget(@Tenant() tenant: TenantContext): Promise<{ habitudes: number; consommables: number; corrections: number }> {
    assertCanWrite(tenant);
    const where = { companyId: tenant.companyId };
    const [habitudes, consommables, corrections] = await this.prisma.$transaction([
      this.prisma.companyPreference.deleteMany({ where }),
      this.prisma.consumableHabit.deleteMany({ where }),
      this.prisma.correctionEvent.deleteMany({ where }),
    ]);
    return { habitudes: habitudes.count, consommables: consommables.count, corrections: corrections.count };
  }
}
