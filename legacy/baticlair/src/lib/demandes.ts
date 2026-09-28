import "server-only";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { storeAttachment } from "@/lib/storage";

const INBOUND_EMAIL_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN;
const RELANCE_INTERVAL_JOURS = Number(process.env.RELANCE_INTERVAL_JOURS ?? "3");
/** Nombre maximum de relances (automatiques ou manuelles) par fournisseur. */
export const MAX_RELANCES = 2;

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

function emailBody(expediteur: string, nom: string, objet: string, produitsText: string) {
  const produitsHtml = escapeHtml(produitsText).replace(/\n/g, "<br>");
  return {
    html: `<p>Bonjour,</p><p>${escapeHtml(expediteur)} souhaiterait recevoir un devis pour le chantier <strong>${escapeHtml(nom)}</strong> :</p><p><strong>${escapeHtml(objet)}</strong></p><p>${produitsHtml}</p><p>Merci de répondre directement à cet e-mail avec votre devis.</p>`,
    text: `Bonjour,\n\n${expediteur} souhaiterait recevoir un devis pour le chantier ${nom} : ${objet}\n\n${produitsText}\n\nMerci de répondre directement à cet e-mail avec votre devis.`,
  };
}

/** Message de relance poli mentionnant le chantier (cf. spécification §5). */
function relanceEmailBody(nom: string) {
  return {
    html: `<p>Bonjour,</p><p>Je reviens vers vous concernant ma demande de devis pour le chantier <strong>${escapeHtml(nom)}</strong>. Merci d'avance pour votre retour.</p>`,
    text: `Bonjour,\n\nJe reviens vers vous concernant ma demande de devis pour le chantier ${nom}. Merci d'avance pour votre retour.`,
  };
}

export interface DestinataireItem {
  id: string;
  email: string;
  repondu: boolean;
  reponduAt: Date | null;
  relances: number;
}

export interface ReponseItem {
  id: string;
  fromEmail: string;
  subject: string;
  bodyText: string;
  receivedAt: Date;
  attachments: string[];
}

export interface ChantierAnalyseItem {
  id: string;
  createdAt: Date;
  resultJson: unknown;
  extractedDocs: { fournisseur: string; date: string; lignesJson: unknown; totalHT: number; totalTTC: number }[];
}

export interface DemandeListItem {
  id: string;
  nom: string;
  objet: string;
  createdAt: Date;
  status: string;
  relances: number;
  destinataires: DestinataireItem[];
}

export interface DemandeDetail extends DemandeListItem {
  produitsText: string;
  lastAnalysisReponses: number;
  reponses: ReponseItem[];
  analyses: ChantierAnalyseItem[];
}

/** Liste des chantiers de l'artisan, les plus récents en premier (étape 7). */
export async function getDemandes(userId: string): Promise<DemandeListItem[]> {
  return prisma.demandeDevis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      destinataires: { select: { id: true, email: true, repondu: true, reponduAt: true, relances: true } },
    },
  });
}

/** Détail d'un chantier : destinataires, réponses reçues et analyses (étape 7). */
export async function getDemande(userId: string, id: string): Promise<DemandeDetail | null> {
  return prisma.demandeDevis.findFirst({
    where: { id, userId },
    include: {
      destinataires: { select: { id: true, email: true, repondu: true, reponduAt: true, relances: true } },
      reponses: { orderBy: { receivedAt: "desc" } },
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { extractedDocs: true },
      },
    },
  });
}

interface CreateDemandeInput {
  userId: string;
  nom: string;
  objet: string;
  produitsText: string;
  emails: string[];
}

/** Crée un chantier (demande de devis) et l'envoie par e-mail à chaque fournisseur (étape 7). */
export async function createDemande({ userId, nom, objet, produitsText, emails }: CreateDemandeInput): Promise<string> {
  const [user, demande] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, name: true } }),
    prisma.demandeDevis.create({
      data: { userId, nom, objet, produitsText, destinataires: { create: emails.map((email) => ({ email })) } },
    }),
  ]);

  const replyTo = inboundReplyAddress(demande.id) ?? user.email;
  const expediteur = user.name ?? user.email;
  const { html, text } = emailBody(expediteur, nom, objet, produitsText);

  await Promise.all(
    emails.map(async (email) => {
      const sent = await sendEmail({
        to: email,
        replyTo,
        subject: `Demande de devis : ${objet} (chantier ${nom})`,
        html,
        text,
      });

      if (!sent) {
        console.log(
          `[BatiClair] Demande de devis "${objet}" (chantier ${nom}) pour ${email} (réponses → ${replyTo}) :\n${produitsText}`
        );
      }
    })
  );

  return demande.id;
}

export interface DemandeARelancer {
  id: string;
  nom: string;
  objet: string;
  produitsText: string;
  relances: number;
  user: { email: string };
  destinataires: { id: string; email: string; repondu: boolean; relances: number }[];
}

/** Sélectionne les chantiers dus pour une relance (cron /api/relancer, étape 7). */
export async function getDemandesARelancer(): Promise<DemandeARelancer[]> {
  const candidates = await prisma.demandeDevis.findMany({
    where: { status: { in: ["envoyee", "relancee"] }, relances: { lt: MAX_RELANCES } },
    include: {
      user: { select: { email: true } },
      destinataires: { select: { id: true, email: true, repondu: true, relances: true } },
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
  const { html, text } = relanceEmailBody(demande.nom);

  const aRelancer = demande.destinataires.filter((d) => !d.repondu && d.relances < MAX_RELANCES);

  await Promise.all(
    aRelancer.map(async (destinataire) => {
      const sent = await sendEmail({
        to: destinataire.email,
        replyTo,
        subject: `Rappel : demande de devis pour le chantier ${demande.nom}`,
        html,
        text,
      });

      if (!sent) {
        console.log(`[BatiClair] Relance chantier "${demande.nom}" pour ${destinataire.email}`);
      }
    })
  );

  await prisma.$transaction([
    prisma.demandeDestinataire.updateMany({
      where: { id: { in: aRelancer.map((d) => d.id) } },
      data: { relances: { increment: 1 } },
    }),
    prisma.demandeDevis.update({
      where: { id: demande.id },
      data: { relances: { increment: 1 }, status: "relancee" },
    }),
  ]);
}

/**
 * Relance manuellement un fournisseur précis depuis la fiche chantier
 * (max MAX_RELANCES, §5). Ne fait rien s'il a déjà répondu ou atteint le plafond.
 */
export async function relancerFournisseur(userId: string, demandeId: string, destinataireId: string): Promise<void> {
  const demande = await prisma.demandeDevis.findFirst({
    where: { id: demandeId, userId },
    include: {
      user: { select: { email: true } },
      destinataires: { where: { id: destinataireId } },
    },
  });

  const destinataire = demande?.destinataires[0];
  if (!demande || !destinataire || destinataire.repondu || destinataire.relances >= MAX_RELANCES) {
    return;
  }

  const replyTo = inboundReplyAddress(demande.id) ?? demande.user.email;
  const { html, text } = relanceEmailBody(demande.nom);

  const sent = await sendEmail({
    to: destinataire.email,
    replyTo,
    subject: `Rappel : demande de devis pour le chantier ${demande.nom}`,
    html,
    text,
  });

  if (!sent) {
    console.log(`[BatiClair] Relance chantier "${demande.nom}" pour ${destinataire.email}`);
  }

  await prisma.$transaction([
    prisma.demandeDestinataire.update({
      where: { id: destinataire.id },
      data: { relances: { increment: 1 } },
    }),
    prisma.demandeDevis.update({
      where: { id: demande.id },
      data: { status: demande.status === "envoyee" ? "relancee" : demande.status },
    }),
  ]);
}

/** Relance tous les fournisseurs n'ayant pas répondu et n'ayant pas atteint le plafond (§5). */
export async function relancerTousFournisseurs(userId: string, demandeId: string): Promise<void> {
  const demande = await prisma.demandeDevis.findFirst({
    where: { id: demandeId, userId },
    include: { destinataires: true },
  });
  if (!demande) return;

  const aRelancer = demande.destinataires.filter((d) => !d.repondu && d.relances < MAX_RELANCES);
  await Promise.all(aRelancer.map((d) => relancerFournisseur(userId, demandeId, d.id)));
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
  /** Corps du mail (texte brut) : le prix y est parfois indiqué directement. */
  bodyText: string;
  attachments: InboundAttachment[];
}

/**
 * Traite la réponse d'un fournisseur reçue par e-mail entrant (webhook
 * /api/inbound-email, étape 7). Renvoie `false` si aucune demande ne
 * correspond.
 */
export async function recordSupplierReply({ to, from, subject, bodyText, attachments }: RecordSupplierReplyInput): Promise<boolean> {
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
      data: { demandeId: demande.id, fromEmail, subject, bodyText, attachments: storedAttachments },
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
