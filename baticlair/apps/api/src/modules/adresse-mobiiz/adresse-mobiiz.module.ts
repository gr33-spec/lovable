import { AdminEmailsController } from "./http/admin-emails.controller.js";
import { Inject, Module, type OnModuleInit } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../platform/email/email.port.js";
import type { AppLogger } from "../../platform/logging/logger.js";
import type { PushSender } from "../../platform/push/push.port.js";
import { CONFIG, EMAIL_SENDER, LOGGER, PUSH_SENDER } from "../../platform/tokens.js";
import { NotificationsGroupeService } from "../../platform/notifications/notifications-artisan.js";
import { PriceRequestsModule, PriceRequestsService } from "../price-requests/index.js";
import { lienEmailsCoupes } from "../privacy/index.js";
import { TenancyModule, TenancyService } from "../tenancy/index.js";
import { AdresseMobiizService } from "./application/adresse-mobiiz.service.js";
import { ReponsesRecuesService } from "./application/reponses-recues.service.js";
import { AdresseMobiizController } from "./http/adresse-mobiiz.controller.js";

/** R7 (Greg, 26 et 27 octobre 2026) : l'adresse Mobiiz par artisan et les réponses des négoces reçues dans Mobiiz. */
@Module({
  imports: [TenancyModule, PriceRequestsModule],
  controllers: [AdresseMobiizController, AdminEmailsController],
  providers: [
    { provide: AdresseMobiizService, useFactory: (p: PrismaService, c: AppConfig) => new AdresseMobiizService(p, c.emailDomaine), inject: [PrismaService, CONFIG] },
    {
      provide: ReponsesRecuesService,
      useFactory: (p: PrismaService, a: AdresseMobiizService, pr: PriceRequestsService, push: PushSender, e: TransactionalEmailSender, c: AppConfig, l: AppLogger) =>
        new ReponsesRecuesService(p, a, pr, new NotificationsGroupeService(p, push, e, (companyId) => lienEmailsCoupes(c.webAppUrl, c.authSecret, companyId), c.emailDomaine, c.webAppUrl), c.emailDomaine, l, undefined, [...(c.contact?.adresses ?? []), ...(c.resend?.replyTo ? [c.resend.replyTo.toLowerCase()] : []), ...(c.emailDomaine ? [`contact@${c.emailDomaine}`] : [])]),
      inject: [PrismaService, AdresseMobiizService, PriceRequestsService, PUSH_SENDER, EMAIL_SENDER, CONFIG, LOGGER],
    },
  ],
  exports: [AdresseMobiizService, ReponsesRecuesService],
})
export class AdresseMobiizModule implements OnModuleInit {
  constructor(
    @Inject(PriceRequestsService) private readonly priceRequests: PriceRequestsService,
    @Inject(AdresseMobiizService) private readonly adresses: AdresseMobiizService,
    @Inject(TenancyService) private readonly tenancy: TenancyService,
  ) {}

  /** L'adresse naît avec l'entreprise ; la demande de prix part de cette adresse, avec son étiquette de réponse. */
  onModuleInit(): void {
    this.tenancy.brancherApresCreation(async (companyId) => {
      await this.adresses.adresseDe(companyId);
    });
    this.priceRequests.brancherExpediteur(async (companyId) => {
      const e = await this.adresses.expediteur(companyId);
      if (!e) return null;
      const etiquette = await this.adresses.etiquetteNeuve();
      return { from: e.from, replyTo: e.replyTo(etiquette), etiquette };
    });
  }
}
