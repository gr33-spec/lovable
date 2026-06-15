import "server-only";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { storeAttachment } from "@/lib/storage";

const INBOUND_EMAIL_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN;
const RELANCE_INTERVAL_JOURS = Number(process.env.RELANCE_INTERVAL_JOURS ?? "3");
const MAX_RELANCES = 2;

/**
 * Adresse de réponse dédiée à une demande (plus-addressing), pour router les
 * réponses des fournisseurs vers /api/inbound-email. `undefined` si la
 * réception d'e-mails entrants n'est pas configurée (étape 7).
 */
export function inboundReplyAddress(demandeId: string): string | undefined {
  if (!INBOUND_EMAIL_DOMAIN) return undefined;
  return `demande+${demandeId}@${INBOUND_EMAIL_DOMAIN}`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function emailBody(expediteur: string, objet: string, produitsText: string) {
  const produitsHtml = escapeHtml(produitsText).replace(/\n/g, "<br>");
  return {
    html: `<p>Bonjour,</p><p>${escapeHtml(expediteur)} souhaiterait recevoir un devis pour :</p><p><strong>${escapeHtml(objet)}</strong></p><p>${produitsHtml}</p><p>Merci de répondre directement à cet e-mail avec votre devis.</p>`,
    text: `Bonjour,\n\n${expediteur} souhaiterait recevoir un devis pour : ${objet}\n\n${produitsText}\n\nMerci de répondre directement à cet e-mail avec votre devis.`,
  };
}

export interface DestinataireItem {
  id: string;
  email: string;
  repondu: boolean;
  reponduAt: Date | null;
}

export interface ReponseItem {
  id: string;
  fromEmail: string;
  subject: string;
  receivedAt: Date;
  attachments: string[];
}

export interface DemandeListItem {
  id: string;
  objet: string;
  createdAt: Date;
  status: string;
  relances: number;
  destinataires: DestinataireItem[];
}

export interface DemandeDetail extends DemandeListItem {
  produitsText: string;
  reponses: ReponseItem[];
}

/** Liste des demandes de devis de l'artisan, les plus récentes en premier (étape 7). */
export async function getDemandes(userId: string): Promise<DemandeListItem[]> {
  return prisma.demandeDevis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      destinataires: { select: { id: true, email: true, repondu: true, reponduAt: true } },
    },
  });
}

/** Détail d'une demande, avec destinataires et réponses reçues (étape 7). */
export async function getDemande(userId: string, id: string): Promise<DemandeDetail | null> {
  return prisma.demandeDevis.findFirst({
    where: { id, userId },
    include: {
      destinataires: { select: { id: true, email: true, repondu: true, reponduAt: true } },
      reponses: { orderBy: { receivedAt: "desc" } },
    },
  });
}

interface CreateDemandeInput {
  userId: string;
  objet: string;
  produitsText: string;
  emails: string[];
}

/** Crée une demande de devis et l'envoie par e-mail à chaque fournisseur (étape 7). */
export async function createDemande({ userId, objet, produitsText, emails }: CreateDemandeInput): Promise<string> {
  const [user, demande] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, name: true } }),
    prisma.demandeDevis.create({
      data: { userId, objet, produitsText, destinataires: { create: emails.map((email) => ({ email })) } },
    }),
  ]);

  const replyTo = inboundReplyAddress(demande.id) ?? user.email;
  const expediteur = user.name ?? user.email;
  const { html, text } = emailBody(expediteur, objet, produitsText);

  await Promise.all(
    emails.map(async (email) => {
      const sent = await sendEmail({
        to: email,
        replyTo,
        subject: `Demande de devis : ${objet}`,
        html,
        text,
      });

      if (!sent) {
        console.log(
          `[BatiClair] Demande de devis "${objet}" pour ${email} (réponses → ${replyTo}) :\n${produitsText}`
        );
      }
    })
  );

  return demande.id;
}

/** Marque une demande comme comparée, une fois que l'artisan a choisi un fournisseur (étape 7). */
export async function markComparee(userId: string, id: string): Promise<void> {
  await prisma.demandeDevis.updateMany({ where: { id, userId }, data: { status: "comparee" } });
}

export interface DemandeARelancer {
  id: string;
  objet: string;
  produitsText: string;
  relances: number;
  user: { email: string };
  destinataires: { id: string; email: string; repondu: boolean }[];
}

/** Sélectionne les demandes dues pour une relance (cron /api/relancer, étape 7). */
export async function getDemandesARelancer(): Promise<DemandeARelancer[]> {
  const candidates = await prisma.demandeDevis.findMany({
    where: { status: { in: ["envoyee", "relancee"] }, relances: { lt: MAX_RELANCES } },
    include: {
      user: { select: { email: true } },
      destinataires: { select: { id: true, email: true, repondu: true } },
    },
  });

  const now = Date.now();
  return candidates.filter((demande) => {
    const seuilJours = RELANCE_INTERVAL_JOURS * (demande.relances + 1);
    const ecouleJours = (now - demande.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return ecouleJours >= seuilJours;
  });
}

/** Envoie une relance aux fournisseurs n'ayant pas encore répondu (étape 7). */
export async function relancerDemande(demande: DemandeARelancer): Promise<void> {
  const replyTo = inboundReplyAddress(demande.id) ?? demande.user.email;
  const { html, text } = emailBody("Relance", demande.objet, demande.produitsText);

  await Promise.all(
    demande.destinataires
      .filter((destinataire) => !destinataire.repondu)
      .map(async (destinataire) => {
        const sent = await sendEmail({
          to: destinataire.email,
          replyTo,
          subject: `Rappel : demande de devis "${demande.objet}"`,
          html,
          text,
        });

        if (!sent) {
          console.log(`[BatiClair] Relance "${demande.objet}" pour ${destinataire.email}`);
        }
      })
  );

  await prisma.demandeDevis.update({
    where: { id: demande.id },
    data: { relances: { increment: 1 }, status: "relancee" },
  });
}

function extractEmail(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match ? match[1] : value).trim().toLowerCase();
}

function extractDemandeId(to: string): string | undefined {
  const match = extractEmail(to).match(/^demande\+([a-z0-9]+)@/);
  return match?.[1];
}

interface InboundAttachment {
  filename: string;
  contentType: string;
  content: string;
}

interface RecordSupplierReplyInput {
  to: string;
  from: string;
  subject: string;
  attachments: InboundAttachment[];
}

/**
 * Traite la réponse d'un fournisseur reçue par e-mail entrant (webhook
 * /api/inbound-email, étape 7). Renvoie `false` si aucune demande ne
 * correspond.
 */
export async function recordSupplierReply({ to, from, subject, attachments }: RecordSupplierReplyInput): Promise<boolean> {
  const fromEmail = extractEmail(from);
  const demandeId = extractDemandeId(to);

  const demande = demandeId
    ? await prisma.demandeDevis.findUnique({ where: { id: demandeId }, include: { destinataires: true } })
    : await prisma.demandeDevis.findFirst({
        where: { destinataires: { some: { email: fromEmail } } },
        orderBy: { createdAt: "desc" },
        include: { destinataires: true },
      });

  if (!demande) return false;

  const storedAttachments = await Promise.all(
    attachments.map((attachment) =>
      storeAttachment(demande.id, {
        filename: attachment.filename,
        contentType: attachment.contentType,
        data: Buffer.from(attachment.content, "base64"),
      })
    )
  );

  const destinataire = demande.destinataires.find((d) => d.email.toLowerCase() === fromEmail);

  await prisma.$transaction([
    prisma.supplierReply.create({
      data: { demandeId: demande.id, fromEmail, subject, attachments: storedAttachments },
    }),
    ...(destinataire
      ? [
          prisma.demandeDestinataire.update({
            where: { id: destinataire.id },
            data: { repondu: true, reponduAt: new Date() },
          }),
        ]
      : []),
    prisma.demandeDevis.update({ where: { id: demande.id }, data: { status: "recue" } }),
  ]);

  return true;
}
