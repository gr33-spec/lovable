import { Body, Controller, Get, Headers, HttpCode, Inject, Post, Query } from "@nestjs/common";
import type { AppConfig } from "../../../platform/config/config.js";
import { CapturingEmailSender } from "../../../platform/email/capturing-email.sender.js";
import { LecteurEmailRecuDeTest, type EmailRecu, type LecteurEmailRecu } from "../../../platform/email/contact-entrant.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import { forbidden, notFound } from "../../../platform/errors/domain-error.js";
import { CONFIG, EMAIL_RECU, EMAIL_SENDER } from "../../../platform/tokens.js";
import { Public } from "../../identity/index.js";

/**
 * LA BOÎTE AUX LETTRES DE TEST (décision du 2026-10-20, `docs/DECISIONS.md`) : les parcours e2e lisent les e-mails
 * capturés (liens de dépôt des négoces, réponses). N'existe qu'en `NODE_ENV=test` avec `EMAIL_PROVIDER=capture`, derrière
 * le secret de la tâche ; en ligne, la route n'existe pas (404).
 */
@Controller("v1/internal/test")
export class TestMailboxController {
  constructor(
    @Inject(EMAIL_SENDER) private readonly email: TransactionalEmailSender,
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(EMAIL_RECU) private readonly lecteur: LecteurEmailRecu,
  ) {}

  /** R7 (e2e) : le corps et les pièces jointes du prochain e-mail reçu par le webhook (le lecteur de test les rend). */
  @Public()
  @Post("email-recu")
  @HttpCode(200)
  emailRecu(@Headers("authorization") authorization: string | undefined, @Body() body: Partial<EmailRecu>) {
    if (this.config.env !== "test" || !(this.lecteur instanceof LecteurEmailRecuDeTest)) throw notFound("Route");
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Test mailbox");
    this.lecteur.deposer(body);
    return { depose: true };
  }

  @Public()
  @Get("emails")
  emails(@Headers("authorization") authorization: string | undefined, @Query("to") to: string | undefined) {
    if (this.config.env !== "test" || !(this.email instanceof CapturingEmailSender)) throw notFound("Route");
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Test mailbox");
    const sent = this.email.sent.filter((m) => !to || m.to.toLowerCase() === to.toLowerCase());
    return { emails: sent.map((m) => ({ to: m.to, subject: m.subject, text: m.text, replyTo: m.replyTo ?? null, from: m.from ?? null, html: m.html ?? null, attachments: (m.attachments ?? []).map((a) => a.filename) })) };
  }
}
