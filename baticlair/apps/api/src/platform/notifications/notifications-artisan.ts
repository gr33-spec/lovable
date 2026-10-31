import type { MessageArtisan } from "@baticlair/domain";
import type { PrismaService } from "../database/prisma.service.js";
import type { TransactionalEmailSender } from "../email/email.port.js";
import type { PushSender } from "../push/push.port.js";
import { NOM_APP } from "@baticlair/domain";

/**
 * LES NOTIFICATIONS DE L'ARTISAN (déplacées dans la plateforme le 27 octobre 2026 : le groupé et l'adresse Mobiiz, R7,
 * préviennent de la même façon) (parcours groupé, étape 8 ; section 3) : push sur chaque appareil abonné de chaque
 * membre de l'entreprise (application fermée comprise) et un e-mail à l'adresse de l'entreprise (sinon celle du
 * propriétaire). Courtes, jamais le nom des autres artisans, aucun rappel. Un envoi qui échoue n'arrête rien.
 */
export class NotificationsGroupeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushSender,
    private readonly email: TransactionalEmailSender,
    /** Le lien « Ne plus recevoir ces e-mails » (RGPD, 24 octobre 2026) ; absent en test unitaire. */
    private readonly lienStop: ((companyId: string) => string) | null = null,
    /** R7 : le domaine des adresses Mobiiz : jamais un e-mail de notification vers une adresse de ce domaine (boucle). */
    private readonly domaineInterne: string | null = null,
    private readonly webAppUrl: string = "",
  ) {}

  /** Un lien absolu vers un écran de l'application (dans un e-mail). */
  lienVers(url: string): string {
    return `${this.webAppUrl}${url}`;
  }

  /** L'e-mail de l'entreprise, sinon celui de son propriétaire. */
  async emailDe(companyId: string): Promise<string | null> {
    const c = await this.prisma.company.findUnique({ where: { id: companyId }, select: { contactEmail: true } });
    if (c?.contactEmail && !(this.domaineInterne && c.contactEmail.toLowerCase().endsWith(`@${this.domaineInterne}`))) return c.contactEmail;
    const proprietaire = await this.prisma.membership.findFirst({ where: { companyId, role: "owner" }, include: { user: { select: { email: true } } } });
    return proprietaire?.user.email ?? null;
  }

  async prevenir(companyId: string, message: MessageArtisan, courriel?: { objet: string; texte: string; piecesJointes?: { filename: string; contentType: string; contentBase64: string }[] }): Promise<{ push: number; email: boolean }> {
    const membres = await this.prisma.membership.findMany({ where: { companyId }, select: { userId: true } });
    const appareils = await this.prisma.pushSubscription.findMany({ where: { userId: { in: membres.map((m) => m.userId) } } });
    let envoyes = 0;
    for (const a of appareils) {
      const r = await this.push.send(a, { title: message.titre, body: message.corps, url: message.url, tag: message.etiquette });
      if (r === "gone") await this.prisma.pushSubscription.deleteMany({ where: { endpoint: a.endpoint } });
      if (r === "sent") envoyes++;
    }
    let email = false;
    // Opposition en un clic (24 octobre 2026) : une entreprise qui a coupé ces e-mails ne reçoit plus que le push ; un
    // e-mail qui porte un bon de commande part quand même (il est indispensable à la commande).
    const coupe = (await this.prisma.company.findUnique({ where: { id: companyId }, select: { emailsCoupesLe: true } }))?.emailsCoupesLe;
    const to = coupe && !courriel?.piecesJointes?.length ? null : await this.emailDe(companyId);
    if (to) {
      const pied = this.lienStop ? `\n\nNe plus recevoir ces e-mails : ${this.lienStop(companyId)}` : "";
      try {
        await this.email.send({ to, subject: courriel?.objet ?? `${message.titre} : ${message.corps}`, text: `${courriel?.texte ?? `${message.corps}\n\n${NOM_APP}`}${pied}`, ...(courriel?.piecesJointes?.length ? { attachments: courriel.piecesJointes } : {}) });
        email = true;
      } catch {
        email = false;
      }
    }
    return { push: envoyes, email };
  }
}
