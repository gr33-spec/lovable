import { Global, Module } from "@nestjs/common";
import type { AppConfig } from "../config/config.js";
import type { AppLogger } from "../logging/logger.js";
import { ChannelAlerter } from "../alerts/alerter.js";
import { ALERTER, CONFIG, EMAIL_RECU, EMAIL_SENDER, LOGGER } from "../tokens.js";
import { EnveloppeSeule, LecteurEmailRecuDeTest, ResendLecteurEmailRecu } from "./contact-entrant.js";
import type { TransactionalEmailSender } from "./email.port.js";
import { CapturingEmailSender } from "./capturing-email.sender.js";
import { ConsoleEmailSender } from "./console-email.sender.js";
import { DisabledEmailSender } from "./disabled-email.sender.js";
import { EmailSortantSender } from "./email-sortant.sender.js";
import { ResendEmailSender } from "./resend-email.sender.js";
import type { TransactionalEmail } from "./email.port.js";

/**
 * LE RELAIS VERS LA FILE DE REPRISE (revue du 26 octobre 2026) : l'e-mail tel qu'il est parti (après la garde et la mise en
 * page) et le moyen de le renvoyer tel quel. La file (`platform/reprise`) se branche dessus au démarrage.
 */
export class RelaisEchecsEmail {
  surEchec: ((email: TransactionalEmail, erreur: string) => void) | null = null;
  renvoyer: ((email: TransactionalEmail) => Promise<void>) | null = null;
}
export const RELAIS_EMAIL = Symbol("RELAIS_EMAIL");

@Global()
@Module({
  providers: [
    { provide: RELAIS_EMAIL, useFactory: () => new RelaisEchecsEmail() },
    {
      provide: EMAIL_SENDER,
      useFactory: (config: AppConfig, logger: AppLogger, relais: RelaisEchecsEmail) => {
        switch (config.emailProvider) {
          case "resend": {
            const resend = new ResendEmailSender(config.resend!.apiKey, config.resend!.from, logger, undefined, config.resend!.replyTo, (email, erreur) => relais.surEchec?.(email, erreur));
            relais.renvoyer = (email) => resend.send({ ...email, mustDeliver: true });
            return new EmailSortantSender(resend, config.webAppUrl, config.emailGarde, logger);
          }
          case "disabled":
            return new DisabledEmailSender(logger);
          case "capture":
            return new CapturingEmailSender();
          case "console":
            return new EmailSortantSender(new ConsoleEmailSender(logger), config.webAppUrl, config.emailGarde, logger);
        }
      },
      inject: [CONFIG, LOGGER, RELAIS_EMAIL],
    },
    {
      // La boîte de contact (contact@mobiiz.fr) : le corps et les pièces jointes relus chez Resend.
      provide: EMAIL_RECU,
      useFactory: (config: AppConfig, logger: AppLogger) => (config.resend ? new ResendLecteurEmailRecu(config.resend.apiKey, logger) : config.env === "test" ? new LecteurEmailRecuDeTest() : new EnveloppeSeule()),
      inject: [CONFIG, LOGGER],
    },
    {
      // Alertes de production (B5) : à côté des e-mails, qu'elles peuvent emprunter.
      provide: ALERTER,
      useFactory: (config: AppConfig, email: TransactionalEmailSender, logger: AppLogger) => new ChannelAlerter({ ...config.alerts, env: config.env }, email, logger),
      inject: [CONFIG, EMAIL_SENDER, LOGGER],
    },
  ],
  exports: [EMAIL_SENDER, ALERTER, EMAIL_RECU, RELAIS_EMAIL],
})
export class EmailModule {}
