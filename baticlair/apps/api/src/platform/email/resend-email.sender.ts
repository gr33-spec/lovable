import type { AppLogger } from "../logging/logger.js";
import type { EmailCapability, TransactionalEmail, TransactionalEmailSender } from "./email.port.js";

/**
 * Envoi réel via l'API HTTP de Resend (pas de SDK : un seul appel).
 * Une panne de Resend n'interrompt pas l'inscription : l'échec est
 * journalisé (sans le contenu) et l'artisan peut redemander l'e-mail.
 */
export class ResendEmailSender implements TransactionalEmailSender, EmailCapability {
  readonly deliversEmail = true;

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly logger: AppLogger,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(email: TransactionalEmail): Promise<void> {
    const res = await this.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: this.from, to: [email.to], subject: email.subject, text: email.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      this.logger.error({ status: res.status, subject: email.subject }, "resend: email not sent");
    }
  }
}
