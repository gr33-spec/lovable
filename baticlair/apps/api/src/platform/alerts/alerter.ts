import type { TransactionalEmailSender } from "../email/email.port.js";
import type { AppLogger } from "../logging/logger.js";

/**
 * ALERTES (audit de lancement, B5) : quand la production casse, quelqu'un le sait sans attendre
 * qu'un artisan appelle. Deux canaux, au choix : un webhook (Slack, Discord, ntfy…) et un e-mail.
 * Au plus une alerte par sorte toutes les 10 minutes (une panne ne noie pas la messagerie) ;
 * jamais de donnée de client dans le message (pas de devis, pas de nom de chantier).
 */
export type AlertKind = "server_error" | "ai_reading_failed";

export interface Alerter {
  readonly enabled: boolean;
  alert(kind: AlertKind, message: string): void;
}

const TITLES: Record<AlertKind, string> = {
  server_error: "Erreur serveur",
  ai_reading_failed: "Lecture de devis échouée",
};

export const ALERT_QUIET_MS = 10 * 60 * 1000;

export class ChannelAlerter implements Alerter {
  private last = new Map<AlertKind, number>();
  private skipped = new Map<AlertKind, number>();

  constructor(
    private readonly channels: { webhookUrl?: string; email?: string; env: string },
    private readonly emailSender: TransactionalEmailSender,
    private readonly logger: AppLogger,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly now: () => number = () => Date.now(),
  ) {}

  get enabled(): boolean {
    return Boolean(this.channels.webhookUrl || this.channels.email);
  }

  alert(kind: AlertKind, message: string): void {
    if (!this.enabled) return;
    const at = this.now();
    const previous = this.last.get(kind);
    if (previous !== undefined && at - previous < ALERT_QUIET_MS) {
      this.skipped.set(kind, (this.skipped.get(kind) ?? 0) + 1);
      return;
    }
    const silenced = this.skipped.get(kind) ?? 0;
    this.last.set(kind, at);
    this.skipped.set(kind, 0);
    const text = `BatiClair (${this.channels.env}) — ${TITLES[kind]} : ${message}${silenced > 0 ? ` (+${silenced} autres depuis la dernière alerte)` : ""}`;
    // Une alerte qui échoue ne fait jamais tomber la requête : elle est seulement journalisée.
    void this.send(text).catch((err: unknown) => this.logger.warn({ err }, "alerte non envoyée"));
  }

  private async send(text: string): Promise<void> {
    const jobs: Promise<unknown>[] = [];
    if (this.channels.webhookUrl) {
      // « text » (Slack, ntfy) et « content » (Discord) : un même message pour les trois.
      jobs.push(
        this.fetchImpl(this.channels.webhookUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, content: text }) }),
      );
    }
    if (this.channels.email) jobs.push(this.emailSender.send({ to: this.channels.email, subject: text.slice(0, 120), text }));
    await Promise.all(jobs);
  }
}

export const NO_ALERTS: Alerter = { enabled: false, alert: () => {} };
