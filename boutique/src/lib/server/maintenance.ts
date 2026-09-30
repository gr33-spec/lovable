import "server-only";
import { purgeOldAddresses } from "./admin-orders";
import { cleanupOrphanImages } from "./admin-catalog";
import { storeNightlyBackup } from "./backup";
import { query, queryOne } from "./db";
import { processOutbox, queueAdminAlert, queueWeeklyReport } from "./email/outbox";
import { paymentConfig } from "./env";
import { errorMessage, reportEvent } from "./monitoring";
import { sweepExpiredReservations } from "./orders";
import { purgeRateLimits } from "./rate-limit";
import { expireReservations } from "./reservations";
import { RESERVATION_MODE } from "../sales-mode";
import { loadSettings } from "./settings";

// Tâches de fond. Lancées chaque nuit par Vercel Cron, et aussi « à la
// volée » (réception d'un webhook, ouverture du tableau de bord) : la
// boutique reste saine même si une exécution planifiée est manquée.

export async function runQuickMaintenance(): Promise<void> {
  await sweepExpiredReservations(10).catch((err) => reportEvent("warning", "maintenance", "Libération des réservations", { error: errorMessage(err) }));
  await expireReservations(20).catch((err) => reportEvent("warning", "maintenance", "Expiration des réservations", { error: errorMessage(err) }));
  await processOutbox(20).catch((err) => reportEvent("error", "maintenance", "Envoi des e-mails", { error: errorMessage(err) }));
}

export async function runNightly(): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      result[name] = await fn();
    } catch (err) {
      result[name] = `erreur : ${errorMessage(err)}`;
      await reportEvent("error", "cron", `Tâche nocturne en échec : ${name}`, { error: errorMessage(err) });
    }
  };
  await step("reservations", () => sweepExpiredReservations(100));
  await step("reservationRequests", () => expireReservations(200));
  await step("emails", () => processOutbox(100));
  await step("backup", () => storeNightlyBackup());
  await step("images", () => cleanupOrphanImages());
  await step("rateLimits", () => purgeRateLimits());
  await step("sessions", () => query("DELETE FROM admin_session WHERE expires_at < now() - interval '7 days' OR revoked_at < now() - interval '7 days'"));
  await step("resets", () => query("DELETE FROM password_reset WHERE expires_at < now() - interval '1 day'"));
  await step("events", () => query("DELETE FROM system_event WHERE created_at < now() - interval '180 days'"));
  await step("addresses", async () => purgeOldAddresses((await loadSettings()).addressRetentionMonths));
  await step("health", async () => {
    const h = await healthCheck();
    if (h.status !== "ok") await queueAdminAlert("La boutique signale un problème", h.problems.join(" • "));
    return h.status;
  });
  await step("weeklyReport", () => queueWeeklyReport());
  await step("alerts", () => processOutbox(5));
  return result;
}

export interface Health {
  status: "ok" | "degraded" | "down";
  problems: string[];
}

/** État de santé (public : sans aucun détail sensible). */
export async function healthCheck(): Promise<Health> {
  const problems: string[] = [];
  try {
    await queryOne("SELECT 1");
  } catch {
    return { status: "down", problems: ["Base de données injoignable"] };
  }
  const payment = paymentConfig();
  if (RESERVATION_MODE) {
    // Pas de paiement en ligne pour l'instant : rien à vérifier côté Stripe.
  } else if (!payment.ok) problems.push(`Paiement : ${payment.reason}`);
  else if (payment.provider === "stripe" && !payment.webhookSecret) problems.push("Webhook Stripe non configuré (conseillé même en test)");
  const failedEmails = await queryOne<{ n: string }>("SELECT count(*) AS n FROM email_outbox WHERE status = 'failed' AND created_at > now() - interval '7 days'");
  if (Number(failedEmails?.n) > 0) problems.push(`${failedEmails?.n} e-mail(s) non envoyé(s)`);
  const stuckEmails = await queryOne<{ n: string }>("SELECT count(*) AS n FROM email_outbox WHERE status = 'pending' AND created_at < now() - interval '2 hours'");
  if (Number(stuckEmails?.n) > 0) problems.push("E-mails en attente depuis plus de 2 heures");
  // Commandes restées « en attente » alors que leur réservation est dépassée depuis longtemps : les webhooks n'arrivent plus ?
  const stuckOrders = await queryOne<{ n: string }>("SELECT count(*) AS n FROM customer_order WHERE status = 'pending' AND reserved_until < now() - interval '3 hours'");
  if (Number(stuckOrders?.n) > 0) problems.push("Des paiements ne sont pas confirmés : vérifier le webhook Stripe");
  const errors = await queryOne<{ n: string }>("SELECT count(*) AS n FROM system_event WHERE level = 'error' AND resolved_at IS NULL AND created_at > now() - interval '24 hours'");
  if (Number(errors?.n) > 0) problems.push(`${errors?.n} erreur(s) dans les dernières 24 h`);
  return { status: problems.length ? "degraded" : "ok", problems };
}
