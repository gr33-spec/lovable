import { estRequeteDemo } from "../logging/request-context.js";
import { DomainError } from "../errors/domain-error.js";
import type { EmailCapability, TransactionalEmail, TransactionalEmailSender } from "./email.port.js";

/** TESTS UNIQUEMENT : conserve les e-mails en mémoire pour les inspecter. */
export class CapturingEmailSender implements TransactionalEmailSender, EmailCapability {
  readonly deliversEmail = true;
  readonly sent: TransactionalEmail[] = [];
  /** Accès démo : les e-mails d'un visiteur fictif, simulés (jamais dans `sent`, jamais partis). */
  readonly simules: TransactionalEmail[] = [];
  /** Nombre d'envois « qui doivent partir » à refuser, comme un prestataire en panne. */
  failNext = 0;
  async send(email: TransactionalEmail): Promise<void> {
    if (estRequeteDemo()) {
      this.simules.push(email);
      return;
    }
    if (email.mustDeliver && this.failNext > 0) {
      this.failNext--;
      throw new DomainError("email_not_sent", "Simulated provider refusal");
    }
    this.sent.push(email);
  }
  lastTo(to: string): TransactionalEmail | undefined {
    return [...this.sent].reverse().find((e) => e.to === to);
  }
  clear(): void {
    this.sent.length = 0;
    this.simules.length = 0;
  }
}
