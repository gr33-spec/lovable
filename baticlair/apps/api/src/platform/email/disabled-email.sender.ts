import type { AppLogger } from "../logging/logger.js";
import type { EmailCapability, TransactionalEmail, TransactionalEmailSender } from "./email.port.js";

/**
 * Mise en ligne sans service d'e-mail : rien n'est envoyé, et l'API le
 * signale (`GET /v1/health` → `features.email = false`) pour que
 * l'interface l'explique au lieu de laisser attendre un e-mail.
 */
export class DisabledEmailSender implements TransactionalEmailSender, EmailCapability {
  readonly deliversEmail = false;
  constructor(private readonly logger: AppLogger) {}
  async send(email: TransactionalEmail): Promise<void> {
    this.logger.warn({ subject: email.subject }, "email disabled: not sent");
  }
}
