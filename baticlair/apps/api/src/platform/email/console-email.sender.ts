import type { AppLogger } from "../logging/logger.js";
import type { EmailCapability, TransactionalEmail, TransactionalEmailSender } from "./email.port.js";

/** DÉVELOPPEMENT UNIQUEMENT : affiche l'e-mail dans les logs au lieu de l'envoyer. */
export class ConsoleEmailSender implements TransactionalEmailSender, EmailCapability {
  readonly deliversEmail = true;
  constructor(private readonly logger: AppLogger) {}
  async send(email: TransactionalEmail): Promise<void> {
    this.logger.info({ emailTo: email.to, subject: email.subject }, `[e-mail non envoyé — dev]\n${email.text}`);
  }
}
