import type { AppLogger } from "../logging/logger.js";
import type { EmailCapability, TransactionalEmail, TransactionalEmailSender } from "./email.port.js";
import { garder, miseEnPage, type GardeEnvoi } from "./mise-en-page.js";

/**
 * L'e-mail qui part vraiment (Greg, 24 octobre 2026) : la garde de la prévisualisation (liste blanche, redirection vers
 * l'adresse de test), puis la mise en page (logo, pied légal, désabonnement), puis le prestataire.
 */
export class EmailSortantSender implements TransactionalEmailSender, EmailCapability {
  readonly deliversEmail: boolean;

  constructor(
    private readonly inner: TransactionalEmailSender & Partial<EmailCapability>,
    private readonly webAppUrl: string,
    private readonly garde: GardeEnvoi | null,
    private readonly logger: AppLogger,
  ) {
    this.deliversEmail = inner.deliversEmail ?? true;
  }

  async send(email: TransactionalEmail): Promise<void> {
    const garde = garder(this.garde, email);
    if (!garde) {
      this.logger.warn({ subject: email.subject }, "email: destinataire hors liste blanche, rien n'est parti");
      return;
    }
    await this.inner.send(miseEnPage(garde, this.webAppUrl));
  }
}
