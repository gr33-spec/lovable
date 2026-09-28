import type { TransactionalEmail, TransactionalEmailSender } from "./email.port.js";

/** TESTS UNIQUEMENT : conserve les e-mails en mémoire pour les inspecter. */
export class CapturingEmailSender implements TransactionalEmailSender {
  readonly sent: TransactionalEmail[] = [];
  async send(email: TransactionalEmail): Promise<void> {
    this.sent.push(email);
  }
  lastTo(to: string): TransactionalEmail | undefined {
    return [...this.sent].reverse().find((e) => e.to === to);
  }
  clear(): void {
    this.sent.length = 0;
  }
}
