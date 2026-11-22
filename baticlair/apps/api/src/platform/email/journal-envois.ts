import type { PrismaService } from "../database/prisma.service.js";
import type { AppLogger } from "../logging/logger.js";
import type { TransactionalEmail, TransactionalEmailSender } from "./email.port.js";

/**
 * « ENVOYÉS », COMME GMAIL (Greg, 22 novembre 2026) : tout ce qui part au nom de l'artisan est noté, une fois parti pour de
 * vrai (jamais avant : un envoi refusé n'est pas « envoyé »). Le texte tel qu'écrit (pas la mise en page), le nom des
 * pièces jointes (jamais leur contenu). Une panne du journal ne bloque jamais l'envoi.
 */
export function avecJournalDesEnvois<T extends TransactionalEmailSender>(sender: T, prisma: PrismaService, logger: AppLogger): T {
  const envoyer = sender.send.bind(sender);
  sender.send = async (email: TransactionalEmail) => {
    await envoyer(email);
    const e = email.envoi;
    if (!e) return;
    await prisma.messageEnvoye
      .create({
        data: {
          companyId: e.companyId,
          projectId: e.projectId ?? null,
          recipientId: e.recipientId ?? null,
          repondA: e.repondA ?? null,
          sorte: e.sorte,
          destinataire: e.destinataire ? `${e.destinataire} <${email.to}>` : email.to,
          objet: email.subject.slice(0, 500),
          texte: email.text.slice(0, 50_000),
          pieces: (email.attachments ?? []).map((a) => a.filename).slice(0, 20),
        },
      })
      .catch((err: unknown) => logger.warn(`Envoi non noté dans « Envoyés » : ${err instanceof Error ? err.message : String(err)}`, "JournalEnvois"));
  };
  return sender;
}
