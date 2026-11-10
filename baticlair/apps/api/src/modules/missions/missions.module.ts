import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../platform/email/email.port.js";
import { NotificationsGroupeService } from "../../platform/notifications/notifications-artisan.js";
import type { PushSender } from "../../platform/push/push.port.js";
import { CONFIG, EMAIL_SENDER, PUSH_SENDER } from "../../platform/tokens.js";
import { PilotageModule } from "../pilotage/index.js";
import { lienEmailsCoupes } from "../privacy/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { BoiteService } from "./application/boite.service.js";
import { MissionsService } from "./application/missions.service.js";
import { BoiteController, DossierProController, MissionsAdminController, MissionsController } from "./http/missions.controller.js";

/**
 * MISSIONS ENTRE ENTREPRISES, « MESSAGES ET RÉPONSES » ET LA CLOCHE (Greg, 10 novembre 2026). Tables nouvelles, rien de
 * l'existant n'est modifié. Les missions sont coupées par défaut (MISSIONS_V1=off : routes en 404) ; la boîte et la cloche
 * restent là, parce que les réponses des négoces y vivent.
 */
@Module({
  imports: [TenancyModule, PilotageModule],
  controllers: [BoiteController, DossierProController, MissionsController, MissionsAdminController],
  providers: [
    {
      provide: MissionsService,
      useFactory: (p: PrismaService, push: PushSender, e: TransactionalEmailSender, c: AppConfig) => {
        const notifications = new NotificationsGroupeService(p, push, e, (companyId) => lienEmailsCoupes(c.webAppUrl, c.authSecret, companyId), c.emailDomaine, c.webAppUrl);
        return new MissionsService(
          p,
          {
            // Le push et l'e-mail ne portent QUE l'alerte courte (jamais le texte d'un message) ; les réglages de l'entreprise
            // (catégorie Missions, e-mail, push) sont appliqués par `prevenir`.
            prevenir: async (companyId, a, o) => {
              await notifications.prevenir(companyId, { titre: a.titre, corps: a.detail, url: a.href, etiquette: a.cle }, { objet: `${a.titre} : ${a.detail}`, texte: `${a.titre}\n${a.detail}\n\n${a.action} : ${notifications.lienVers(a.href)}` }, { sansEmail: o.sansEmail });
            },
          },
          { actif: c.missionsV1, secret: c.authSecret },
        );
      },
      inject: [PrismaService, PUSH_SENDER, EMAIL_SENDER, CONFIG],
    },
    { provide: BoiteService, useFactory: (p: PrismaService, m: MissionsService, c: AppConfig) => new BoiteService(p, m, c.missionsV1), inject: [PrismaService, MissionsService, CONFIG] },
  ],
  exports: [MissionsService, BoiteService],
})
export class MissionsModule {}
