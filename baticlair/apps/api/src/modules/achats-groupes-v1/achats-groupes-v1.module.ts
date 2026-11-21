import { Inject, Module, type OnModuleInit } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../platform/email/email.port.js";
import { CONFIG, EMAIL_SENDER } from "../../platform/tokens.js";
import { AchatGroupeModule, RapprochementService } from "../achat-groupe/index.js";
import { CommandeDuMoisService, GroupeModule } from "../groupe/index.js";
import { DroitsService, ObservatoireService, RecentrageModule } from "../recentrage/index.js";
import { PilotageModule } from "../pilotage/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { AchatsGroupesV1Service } from "./application/achats-groupes-v1.service.js";
import { AchatsGroupesV1AdminController, AchatsGroupesV1Controller, AchatsGroupesV1TacheController } from "./http/achats-groupes-v1.controller.js";

/**
 * ACHATS GROUPÉS V1 (Greg, 7 novembre 2026, V5.2 validée) : un produit précis par achat groupé, à côté de l'ancien achat
 * groupé (tables séparées, rien de l'existant n'est modifié). Coupé par défaut (ACHATS_GROUPES_V1=off) : routes en 404.
 */
@Module({
  imports: [TenancyModule, GroupeModule, PilotageModule, AchatGroupeModule, RecentrageModule],
  controllers: [AchatsGroupesV1Controller, AchatsGroupesV1AdminController, AchatsGroupesV1TacheController],
  providers: [
    {
      provide: AchatsGroupesV1Service,
      useFactory: (p: PrismaService, commande: CommandeDuMoisService, e: TransactionalEmailSender, c: AppConfig, droits: DroitsService, observatoire: ObservatoireService) =>
        new AchatsGroupesV1Service(
          p,
          {
            // Greg, 15 novembre 2026 : voir le négoce retenu et commander demande Pro (la première commande est offerte).
            abonne: (companyId) => droits.abonnePayant(companyId),
            lignesDeListe: async (tenant, projectId) => {
              const lignes = await commande.toutesLesLignes(tenant, projectId);
              const projet = await p.project.findFirst({ where: { id: projectId, companyId: tenant.companyId }, select: { name: true } });
              return { nom: projet?.name ?? "Quantitatif", lignes };
            },
            // Greg, 21 novembre 2026 (prix) : l'offre d'un achat groupé et sa commande vont à l'observatoire, sans nom.
            observatoire,
          },
          e,
          // La prévisualisation (test.mobiiz.fr) tourne en NODE_ENV=production : la clôture anticipée de test y reste permise
          // (recette en ligne, Greg, 7 novembre 2026) ; la vraie production la refuse toujours.
          { actif: c.achatsGroupesV1, webAppUrl: c.webAppUrl, env: c.previewOriginPattern ? "preview" : c.env, metiersOuverts: c.metiersOuverts },
        ),
      inject: [PrismaService, CommandeDuMoisService, EMAIL_SENDER, CONFIG, DroitsService, ObservatoireService],
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
