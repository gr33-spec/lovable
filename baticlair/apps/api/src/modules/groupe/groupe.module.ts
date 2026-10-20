import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { CONFIG } from "../../platform/tokens.js";
import { TakeoffModule, TakeoffService } from "../takeoff/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { GroupeService } from "./application/groupe.service.js";
import { InseeSiretVerifier, SIRET_VERIFIER, siretBienForme, type SiretVerifier } from "./application/siret-verifier.js";
import { NegocesService } from "./application/negoces.service.js";
import { RegroupementService } from "./application/regroupement.service.js";
import { GroupeController } from "./http/groupe.controller.js";
import { NegocesController } from "./http/negoces.controller.js";
import { RegroupementController } from "./http/regroupement.controller.js";

@Module({
  imports: [TenancyModule, TakeoffModule],
  controllers: [GroupeController, NegocesController, RegroupementController],
  providers: [
    {
      provide: SIRET_VERIFIER,
      // Hors production et sans clé INSEE (tests, e2e) : un SIRET bien formé vaut actif, sans appel réseau. En production,
      // seule l'API Sirene vérifie.
      useFactory: (c: AppConfig): SiretVerifier =>
        c.env === "test" && !c.groupe.inseeApiKey ? { verifier: async (s) => (siretBienForme(s) ? { statut: "actif" } : { statut: "inconnu" }) } : new InseeSiretVerifier(c.groupe.inseeApiKey),
      inject: [CONFIG],
    },
    { provide: RegroupementService, useFactory: (p: PrismaService) => new RegroupementService(p), inject: [PrismaService] },
    {
      provide: GroupeService,
      useFactory: (p: PrismaService, t: TakeoffService, s: SiretVerifier, r: RegroupementService) => new GroupeService(p, (tenant, id) => t.reviewed(tenant, id), s, r),
      inject: [PrismaService, TakeoffService, SIRET_VERIFIER, RegroupementService],
    },
    { provide: NegocesService, useFactory: (p: PrismaService, c: AppConfig) => new NegocesService(p, c.authSecret), inject: [PrismaService, CONFIG] },
  ],
  exports: [GroupeService, NegocesService, RegroupementService],
})
export class GroupeModule {}
