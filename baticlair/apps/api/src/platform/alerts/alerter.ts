import type { TransactionalEmailSender } from "../email/email.port.js";
import type { AppLogger } from "../logging/logger.js";
import { NOM_APP } from "@baticlair/domain";

/**
 * ALERTES (audit de lancement, B5) : quand la production casse, quelqu'un le sait sans attendre
 * qu'un artisan appelle. Deux canaux, au choix : un webhook (Slack, Discord, ntfy…) et un e-mail.
 * Au plus une alerte par sorte toutes les 10 minutes (une panne ne noie pas la messagerie) ;
 * jamais de donnée de client dans le message (pas de devis, pas de nom de chantier).
 */
export type AlertKind = "server_error" | "ai_reading_failed" | "client_error" | "commande_commune" | "reprise_echouee" | "stockage" | "paiement_refuse" | "negoce_a_verifier" | "conso_ia" | "email_entrant" | "sauvegarde_echec" | "sauvegarde_info";

export interface Alerter {
  readonly enabled: boolean;
  alert(kind: AlertKind, message: string): void;
}

const TITLES: Record<AlertKind, string> = {
  server_error: "Erreur serveur",
  ai_reading_failed: "Lecture de devis échouée",
  client_error: "Écran en erreur chez un artisan",
  /** Espace négoce (23 octobre 2026) : aucun négoce inscrit, aucune réponse à 48 h, grille retenue trop « non garantie ». */
  commande_commune: "Regroupement à surveiller",
  /** Revue du 26 octobre 2026 : une action rejouée trois fois sans succès (e-mail, lecture IA). */
  reprise_echouee: "Action abandonnée après 3 essais",
  /** Revue du 26 octobre 2026 : la base approche de la limite du plan Neon. */
  stockage: "Espace de la base",
  /** Greg, 15 novembre 2026 : un compte consomme anormalement des analyses, ou un abonné a atteint son plafond du mois. */
  conso_ia: "Consommation d'analyses à surveiller",
  /** Greg, 14 novembre 2026 : un paiement d'abonnement refusé, un négoce inscrit qui attend sa vérification. */
  paiement_refuse: "Paiement refusé",
  negoce_a_verifier: "Négoce en attente de vérification",
  /** Greg, 22 novembre 2026 : une adresse (contact@ ou une adresse Mobiiz) reçoit un volume anormal d'e-mails. */
  email_entrant: "E-mails entrants à surveiller",
  /** Greg, 28 novembre 2026 : la sauvegarde nocturne a échoué (export, test de restauration, chiffrement), ou ne dit plus rien. */
  sauvegarde_echec: "Sauvegarde échouée",
  /** Un essai de l'alerte, ou la sauvegarde rétablie après un échec : une sorte à part, pour ne jamais retarder un vrai échec. */
  sauvegarde_info: "Sauvegarde de la base",
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
    /** L'adresse réglée dans l'admin (Greg, 14 novembre 2026) ; absente : l'adresse fixe de la configuration. */
    private readonly adresse: (() => Promise<string | null>) | null = null,
    /** Une adresse d'alerte est-elle connue (réglée dans l'admin, ou de repli) ? Dit par la route de santé. */
    private readonly adresseConnue: () => boolean = () => false,
  ) {}

  get enabled(): boolean {
    return Boolean(this.channels.webhookUrl || this.channels.email || this.adresseConnue());
  }

  alert(kind: AlertKind, message: string): void {
    // Avec l'adresse réglée dans l'admin, on essaie toujours : elle se lit en base au moment de l'envoi.
    if (!this.enabled && !this.adresse) return;
    const at = this.now();
    const previous = this.last.get(kind);
    if (previous !== undefined && at - previous < ALERT_QUIET_MS) {
      this.skipped.set(kind, (this.skipped.get(kind) ?? 0) + 1);
      return;
    }
    const silenced = this.skipped.get(kind) ?? 0;
    this.last.set(kind, at);
    this.skipped.set(kind, 0);
    const text = `${NOM_APP} (${this.channels.env}) — ${TITLES[kind]} : ${message}${silenced > 0 ? ` (+${silenced} autres depuis la dernière alerte)` : ""}`;
    // L'objet de l'e-mail (Greg, 28 novembre 2026 : l'essai de l'alerte arrivé dans les indésirables Hotmail) : court,
    // la sorte d'alerte seule, jamais le message coupé en plein mot.
    const objet = `${NOM_APP} (${this.channels.env}) · ${TITLES[kind]}`;
    // Une alerte qui échoue ne fait jamais tomber la requête : elle est seulement journalisée.
    void this.send(text, objet).catch((err: unknown) => this.logger.warn({ err }, "alerte non envoyée"));
  }

  private async send(text: string, objet: string): Promise<void> {
    const jobs: Promise<unknown>[] = [];
    if (this.channels.webhookUrl) {
      // « text » (Slack, ntfy) et « content » (Discord) : un même message pour les trois.
      jobs.push(
        this.fetchImpl(this.channels.webhookUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, content: text }) }),
      );
    }
    const email = this.adresse ? await this.adresse().catch(() => this.channels.email ?? null) : (this.channels.email ?? null);
    if (email) jobs.push(this.emailSender.send({ to: email, subject: objet, text }));
    await Promise.all(jobs);
  }
}

export const NO_ALERTS: Alerter = { enabled: false, alert: () => {} };
