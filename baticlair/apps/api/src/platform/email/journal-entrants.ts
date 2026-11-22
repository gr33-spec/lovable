import { adresseNueEntrante, SEUIL_VOLUME_HEURE, volumeAnormal, type VerdictEntrant } from "@baticlair/domain";
import type { Alerter } from "../alerts/alerter.js";
import type { PrismaService } from "../database/prisma.service.js";
import type { AppLogger } from "../logging/logger.js";
import type { EmailRecu } from "./contact-entrant.js";

/**
 * LE JOURNAL DES E-MAILS ENTRANTS (Greg, 22 novembre 2026 : « rien n'est supprimé en silence ; tout ce qui est bloqué va
 * dans Indésirables et dans une liste admin, avec la raison ; alerte admin si une adresse reçoit un volume anormal »).
 * Chaque message reçu sur contact@ ou sur une adresse Mobiiz est noté avec son verdict ; au-delà de 30 messages dans
 * l'heure sur la même adresse, une alerte part à l'admin (une par sorte et par dix minutes, comme les autres).
 */
export class JournalEntrants {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerter: Alerter | null,
    private readonly logger: AppLogger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async noter(e: { adresse: string; companyId?: string | null; recu: Pick<EmailRecu, "from" | "subject" | "authentification">; verdict: VerdictEntrant; emailId: string | null }): Promise<void> {
    const adresse = adresseNueEntrante(e.adresse);
    const a = e.recu.authentification ?? null;
    await this.prisma.emailEntrant.create({
      data: {
        adresse,
        companyId: e.companyId ?? null,
        de: e.recu.from.slice(0, 300),
        objet: (e.recu.subject || "").slice(0, 300),
        suspect: e.verdict.suspect,
        raisons: e.verdict.raisons,
        piecesBloquees: e.verdict.piecesBloquees,
        spf: a?.spf ?? null,
        dkim: a?.dkim ?? null,
        dmarc: a?.dmarc ?? null,
        emailId: e.emailId,
        recuLe: this.now(),
      },
    });
    const depuis = new Date(this.now().getTime() - 3_600_000);
    const n = await this.prisma.emailEntrant.count({ where: { adresse, recuLe: { gte: depuis } } });
    if (volumeAnormal(n)) {
      this.logger.warn({ adresse, n }, "e-mails entrants : volume anormal");
      this.alerter?.alert("email_entrant", `Volume anormal : ${n} e-mails reçus en une heure sur ${adresse} (seuil : ${SEUIL_VOLUME_HEURE}). Voir Admin › E-mails bloqués.`);
    }
  }

  /** La liste de l'admin : les messages suspects, du plus récent au plus ancien, avec leur raison. */
  async suspects(take = 200) {
    const liste = await this.prisma.emailEntrant.findMany({ where: { suspect: true }, orderBy: { recuLe: "desc" }, take });
    return liste.map((m) => ({ id: m.id, adresse: m.adresse, de: m.de, objet: m.objet, raisons: m.raisons, piecesBloquees: m.piecesBloquees, spf: m.spf, dkim: m.dkim, dmarc: m.dmarc, recuLe: m.recuLe.toISOString() }));
  }
}
