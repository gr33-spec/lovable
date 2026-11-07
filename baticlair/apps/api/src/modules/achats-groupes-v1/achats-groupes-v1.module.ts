import { Inject, Module, type OnModuleInit } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../platform/email/email.port.js";
import { CONFIG, EMAIL_SENDER } from "../../platform/tokens.js";
import { AchatGroupeModule, RapprochementService } from "../achat-groupe/index.js";
import { CommandeDuMoisService, GroupeModule } from "../groupe/index.js";
import { PilotageModule } from "../pilotage/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { AchatsGroupesV1Service } from "./application/achats-groupes-v1.service.js";
import { AchatsGroupesV1AdminController, AchatsGroupesV1Controller, AchatsGroupesV1TacheController } from "./http/achats-groupes-v1.controller.js";

/**
 * ACHATS GROUPÉS V1 (Greg, 7 novembre 2026, V5.2 validée) : un produit précis par achat groupé, à côté de l'ancien achat
 * groupé (tables séparées, rien de l'existant n'est modifié). Coupé par défaut (ACHATS_GROUPES_V1=off) : routes en 404.
 */
@Module({
  imports: [TenancyModule, GroupeModule, PilotageModule, AchatGroupeModule],
  controllers: [AchatsGroupesV1Controller, AchatsGroupesV1AdminController, AchatsGroupesV1TacheController],
  providers: [
    {
      provide: AchatsGroupesV1Service,
      useFactory: (p: PrismaService, commande: CommandeDuMoisService, e: TransactionalEmailSender, c: AppConfig) =>
        new AchatsGroupesV1Service(
          p,
          {
            lignesDeListe: async (tenant, projectId) => {
              const lignes = await commande.toutesLesLignes(tenant, projectId);
              const projet = await p.project.findFirst({ where: { id: projectId, companyId: tenant.companyId }, select: { name: true } });
              return { nom: projet?.name ?? "Quantitatif", lignes };
            },
          },
          e,
          { actif: c.achatsGroupesV1, webAppUrl: c.webAppUrl, env: c.env },
        ),
      inject: [PrismaService, CommandeDuMoisService, EMAIL_SENDER, CONFIG],
    },
  ],
  exports: [AchatsGroupesV1Service],
})
export class AchatsGroupesV1Module implements OnModuleInit {
  constructor(
    @Inject(AchatsGroupesV1Service) private readonly ag: AchatsGroupesV1Service,
    @Inject(RapprochementService) private readonly rapprochement: RapprochementService,
  ) {}

  onModuleInit(): void {
    this.rapprochement.brancherActionsV1((tenant) => this.ag.actions(tenant));
  }
}
