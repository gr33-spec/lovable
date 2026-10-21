import { bilanVide, bornesDuMois, moisEcoule, rapportMensuel, type BilanMensuel } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";

/**
 * LE RAPPORT MENSUEL DE L'ARTISAN (plan 2 du 21 octobre 2026, bloc 4) : le 1er du mois à 7 h (tâche Vercel
 * `/v1/internal/rapport-mensuel`), un e-mail par entreprise sur le mois écoulé : devis lus, économies du groupé, lots.
 * Pas d'e-mail quand il n'y a rien à dire. Une entreprise déjà servie pour ce mois ne l'est pas deux fois (clé
 * `rapport:<AAAA-MM>` dans `parametre_groupe`) : la tâche peut être relancée sans doublon.
 */
export class RapportMensuelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: TransactionalEmailSender,
    private readonly destinataire: { emailDe(companyId: string): Promise<string | null> },
  ) {}

  /** Le bilan d'une entreprise pour un mois AAAA-MM. */
  async bilan(companyId: string, mois: string): Promise<BilanMensuel> {
    const { debut, fin } = bornesDuMois(mois);
    const chantiersLus = await this.prisma.takeoff.count({ where: { companyId, createdAt: { gte: debut, lt: fin } } });
    const bons = await this.prisma.bonCommande.findMany({
      where: { envoyeLe: { gte: debut, lt: fin }, offre: { besoin: { companyId } } },
      select: { offre: { select: { economie: true, lotId: true } } },
    });
    const economies = bons.reduce((s, b) => s + Number(b.offre.economie ?? 0), 0);
    const lots = new Set(bons.map((b) => b.offre.lotId)).size;
    return { mois, chantiersLus, economies: Math.round(economies * 100) / 100, lots };
  }

  /** Envoie le rapport du mois écoulé à chaque entreprise qui a quelque chose à lire ; rend ce qui a été fait. */
  async envoyer(maintenant = new Date()): Promise<{ mois: string; envoyes: number; sansRien: number; dejaFaits: number }> {
    const mois = moisEcoule(maintenant);
    const cle = `rapport:${mois}`;
    const deja = new Set<string>(((await this.prisma.parametreGroupe.findUnique({ where: { cle } }))?.valeur as { envoyes?: string[] } | null)?.envoyes ?? []);
    const entreprises = await this.prisma.company.findMany({ select: { id: true, memberships: { where: { role: "owner" }, select: { user: { select: { name: true } } }, take: 1 } } });
    let envoyes = 0;
    let sansRien = 0;
    let dejaFaits = 0;
    for (const e of entreprises) {
      if (deja.has(e.id)) {
        dejaFaits++;
        continue;
      }
      const b = await this.bilan(e.id, mois);
      if (bilanVide(b)) {
        sansRien++;
        continue;
      }
      const to = await this.destinataire.emailDe(e.id);
      if (!to) continue;
      const prenom = e.memberships[0]?.user.name?.split(/\s+/)[0] ?? null;
      const r = rapportMensuel(b, prenom);
      try {
        await this.email.send({ to, subject: r.objet, text: r.texte, html: r.html });
        envoyes++;
        deja.add(e.id);
      } catch {
        // Un envoi qui échoue n'arrête pas les autres ; l'entreprise sera reprise à la prochaine relance de la tâche.
      }
    }
    await this.prisma.parametreGroupe.upsert({ where: { cle }, create: { cle, valeur: { envoyes: [...deja] } }, update: { valeur: { envoyes: [...deja] } } });
    return { mois, envoyes, sansRien, dejaFaits };
  }
}
