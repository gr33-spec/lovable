import { DomainError } from "../errors/domain-error.js";
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
    /** « Répondre » par défaut (contact@mobiiz.fr, renvoyée chez Greg) ; un e-mail qui en donne une autre la garde. */
    private readonly replyTo?: string,
    /** Revue du 26 octobre 2026 : un e-mail de compte qui ne part pas va dans la file de reprise (`platform/reprise`). */
    private readonly surEchec?: (email: TransactionalEmail, erreur: string) => void,
  ) {}

  async send(email: TransactionalEmail): Promise<void> {
    let res: { ok: boolean; status: number };
    try {
      res = await this.post(email);
    } catch (err) {
      this.logger.error({ err, subject: email.subject }, "resend: email not sent");
      if (email.mustDeliver) throw new DomainError("email_not_sent", "Email provider unreachable");
      this.surEchec?.(email, "prestataire injoignable");
      return;
    }
    if (!res.ok) {
      this.logger.error({ status: res.status, subject: email.subject }, "resend: email not sent");
      // Une demande au fournisseur qui ne part pas ne passe jamais « envoyée » (audit avant commercialisation).
      if (email.mustDeliver) throw new DomainError("email_not_sent", `Email provider refused (${res.status})`);
      this.surEchec?.(email, `refusé (${res.status})`);
    }
  }

  private post(email: TransactionalEmail) {
    return this.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: this.from,
        to: [email.to],
        subject: email.subject,
        text: email.text,
        ...(email.html ? { html: email.html } : {}),
        ...((email.replyTo ?? this.replyTo) ? { reply_to: email.replyTo ?? this.replyTo } : {}),
        ...(email.headers ? { headers: email.headers } : {}),
        ...(email.attachments?.length ? { attachments: email.attachments.map((a) => ({ filename: a.filename, content: a.contentBase64, content_type: a.contentType })) } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
  }
}
