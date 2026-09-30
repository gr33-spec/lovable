import type { AppLogger } from "../logging/logger.js";
import type { EmailCapability, TransactionalEmail, TransactionalEmailSender } from "./email.port.js";

/**
 * Le strict nécessaire de `fetch`, typé ici : le compilateur de Vercel ne
 * voit pas toujours les types web de Node (`Response.ok` absent).
 */
type HttpPost = (
  url: string,
  init: { method: "POST"; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<{ ok: boolean; status: number }>;

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
    private readonly fetchImpl: HttpPost = fetch as unknown as HttpPost,
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
