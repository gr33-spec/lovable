import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { CONFIG } from "../../platform/tokens.js";
import { TakeoffModule, TakeoffService } from "../takeoff/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { GroupeService } from "./application/groupe.service.js";
import { InseeSiretVerifier, SIRET_VERIFIER, siretBienForme, type SiretVerifier } from "./application/siret-verifier.js";
import { GroupeController } from "./http/groupe.controller.js";

@Module({
  imports: [TenancyModule, TakeoffModule],
  controllers: [GroupeController],
  providers: [
    {
      provide: SIRET_VERIFIER,
      // Hors production et sans clé INSEE (tests, e2e) : un SIRET bien formé vaut actif, sans appel réseau. En production,
      // seule l'API Sirene vérifie.
      useFactory: (c: AppConfig): SiretVerifier =>
        c.env === "test" && !c.groupe.inseeApiKey ? { verifier: async (s) => (siretBienForme(s) ? { statut: "actif" } : { statut: "inconnu" }) } : new InseeSiretVerifier(c.groupe.inseeApiKey),
      inject: [CONFIG],
    },
    {
      provide: GroupeService,
      useFactory: (p: PrismaService, t: TakeoffService, s: SiretVerifier) => new GroupeService(p, (tenant, id) => t.reviewed(tenant, id), s),
      inject: [PrismaService, TakeoffService, SIRET_VERIFIER],
    },
  ],
  exports: [GroupeService],
})
export class GroupeModule {}
