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

  /** Les bilans de toutes les entreprises pour un mois, groupés : devis lus, puis bons du mois (économies, lots). */
  async bilans(mois: string): Promise<Map<string, BilanMensuel>> {
    const { debut, fin } = bornesDuMois(mois);
    const bilans = new Map<string, BilanMensuel>();
    const le = (companyId: string) => {
      let b = bilans.get(companyId);
      if (!b) bilans.set(companyId, (b = { mois, chantiersLus: 0, economies: 0, lots: 0 }));
      return b;
    };
    const lus = await this.prisma.takeoff.groupBy({ by: ["companyId"], where: { createdAt: { gte: debut, lt: fin } }, _count: { _all: true } });
    for (const t of lus) le(t.companyId).chantiersLus = t._count._all;
    const bons = await this.prisma.bonCommande.findMany({ where: { envoyeLe: { gte: debut, lt: fin } }, select: { offre: { select: { economie: true, lotId: true, besoin: { select: { companyId: true } } } } } });
    const lotsDe = new Map<string, Set<string>>();
    for (const b of bons) {
      const bilan = le(b.offre.besoin.companyId);
      bilan.economies = Math.round((bilan.economies + Number(b.offre.economie ?? 0)) * 100) / 100;
      const lots = lotsDe.get(b.offre.besoin.companyId) ?? new Set<string>();
      lots.add(b.offre.lotId);
      lotsDe.set(b.offre.besoin.companyId, lots);
      bilan.lots = lots.size;
    }
    return bilans;
  }

  /** Envoie le rapport du mois écoulé à chaque entreprise qui a quelque chose à lire ; rend ce qui a été fait. */
  async envoyer(maintenant = new Date()): Promise<{ mois: string; envoyes: number; sansRien: number; dejaFaits: number }> {
    const mois = moisEcoule(maintenant);
    const cle = `rapport:${mois}`;
    const deja = new Set<string>(((await this.prisma.parametreGroupe.findUnique({ where: { cle } }))?.valeur as { envoyes?: string[] } | null)?.envoyes ?? []);
    const entreprises = await this.prisma.company.findMany({ select: { id: true, contactEmail: true, emailsCoupesLe: true, memberships: { where: { role: "owner" }, select: { user: { select: { name: true, email: true } } }, take: 1 } } });
    // Tests de charge (21 octobre) : les bilans de toutes les entreprises en deux requêtes groupées, pas quatre par entreprise.
    const bilans = await this.bilans(mois);
    let envoyes = 0;
    let sansRien = 0;
    let dejaFaits = 0;
    for (const e of entreprises) {
      if (deja.has(e.id)) {
        dejaFaits++;
        continue;
      }
      const b = bilans.get(e.id) ?? { mois, chantiersLus: 0, economies: 0, lots: 0 };
      if (bilanVide(b)) {
        sansRien++;
        continue;
      }
      // Opposition en un clic (24 octobre 2026) : une entreprise qui a coupé ses e-mails ne reçoit pas le rapport.
      if (e.emailsCoupesLe) continue;
      const to = e.contactEmail ?? e.memberships[0]?.user.email ?? null;
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
