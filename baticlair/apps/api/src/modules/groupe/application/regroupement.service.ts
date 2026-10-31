import { estUnLundiDeFormation, plafondDuBesoin, rangerLesBesoins, SEUILS, seuilAtteint, type BesoinACouper } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";

const JOUR = 24 * 3600 * 1000;

/**
 * LE REGROUPEMENT (parcours groupé, étape 4), côté base : les besoins libres (signés ou en attente, sans lot) rejoignent
 * le lot OUVERT de leur référence et de leur zone, ou en ouvrent un ; un lot se FORME dès qu'un seuil du fichier
 * `groupe/seuils.json` est atteint sur son volume ferme, et sinon un lundi sur deux à 7 h (tâche planifiée). Formé, il
 * attend de partir aux négoces (étape 5). Zéro gestion humaine : tout est journalisé pour Greg (section 5).
 */
export class RegroupementService {
  constructor(private readonly prisma: PrismaService) {}

  /** Section 5 : la quantité d'un besoin est plafonnée à 3 × la médiane des besoins de la même référence sur 90 jours. */
  async plafond(cle: string, quantite: number, sauf?: { companyId: string }): Promise<{ admis: boolean; plafond: number | null }> {
    const depuis = new Date(Date.now() - SEUILS.plafond.jours * JOUR);
    const autres = await this.prisma.besoin.findMany({
      where: { cle, createdAt: { gte: depuis }, statut: { not: "retire" }, ...(sauf ? { companyId: { not: sauf.companyId } } : {}) },
      select: { quantite: true },
    });
    return plafondDuBesoin(quantite, autres.map((b) => Number(b.quantite)));
  }

  /** Range les besoins libres dans les lots, puis forme ceux dont le seuil est atteint. Rend ce qui a bougé. */
  async ranger(): Promise<{ lotsCrees: number; besoinsRattaches: number; lotsFormes: number }> {
    const libres = await this.prisma.besoin.findMany({ where: { lotId: null, statut: { in: ["signe", "en_attente"] } } });
    const ouverts = await this.prisma.lotGroupe.findMany({ where: { statut: "ouvert" }, include: { besoins: true } });
    const r = rangerLesBesoins(
      libres.map(aCouper),
      ouverts.map((l) => ({ id: l.id, cle: l.cle, zone: l.zone, fenetre: { tot: l.fenetreTot, tard: l.fenetreTard }, besoins: l.besoins.map(aCouper) })),
    );
    const touches = new Set<string>();
    await this.prisma.$transaction(async (tx) => {
      for (const c of r.aCreer) {
        const lot = await tx.lotGroupe.create({ data: { cle: c.cle, famille: c.famille, zone: c.zone, fenetreTot: c.fenetre.tot, fenetreTard: c.fenetre.tard } });
        await tx.besoin.updateMany({ where: { id: { in: c.besoins.map((b) => b.id) } }, data: { lotId: lot.id } });
        await tx.journalGroupe.create({ data: { lotId: lot.id, evenement: "lot_ouvert", details: { besoins: c.besoins.map((b) => b.id) } } });
        touches.add(lot.id);
      }
      for (const a of r.aRattacher) {
        await tx.besoin.update({ where: { id: a.besoinId }, data: { lotId: a.lotId } });
        await tx.lotGroupe.update({ where: { id: a.lotId }, data: { fenetreTot: a.fenetre.tot, fenetreTard: a.fenetre.tard } });
        await tx.journalGroupe.create({ data: { lotId: a.lotId, evenement: "besoin_rattache", details: { besoin: a.besoinId } } });
        touches.add(a.lotId);
      }
    });
    // Un besoin passé « signé » dans un lot déjà ouvert peut aussi atteindre le seuil : chaque lot ouvert est revu.
    for (const l of await this.prisma.lotGroupe.findMany({ where: { statut: "ouvert" }, select: { id: true } })) touches.add(l.id);
    let lotsFormes = 0;
    for (const lotId of touches) if (await this.formerSiSeuil(lotId)) lotsFormes++;
    return { lotsCrees: r.aCreer.length, besoinsRattaches: r.aRattacher.length, lotsFormes };
  }

  /** Un lot ouvert se forme dès que son seuil est atteint (volume ferme). */
  async formerSiSeuil(lotId: string): Promise<boolean> {
    const lot = await this.prisma.lotGroupe.findUnique({ where: { id: lotId }, include: { besoins: true } });
    if (!lot || lot.statut !== "ouvert") return false;
    if (!seuilAtteint({ cle: lot.cle, famille: lot.famille, besoins: lot.besoins.map(aCouper) })) return false;
    await this.former(lotId, "seuil");
    return true;
  }

  /**
   * La tâche planifiée du lundi 7 h (section 2, étape 4) : range ce qui attend, puis, un lundi sur deux, forme tous les
   * lots ouverts qui ont au moins un besoin signé ; un lot sans volume ferme reste ouvert.
   */
  async tachePlanifiee(maintenant = new Date()): Promise<{ lundiDeFormation: boolean; lotsCrees: number; besoinsRattaches: number; lotsFormes: number }> {
    const range = await this.ranger();
    const lundiDeFormation = estUnLundiDeFormation(maintenant);
    let lotsFormes = range.lotsFormes;
    if (lundiDeFormation) {
      const ouverts = await this.prisma.lotGroupe.findMany({ where: { statut: "ouvert", besoins: { some: { statut: "signe" } } }, select: { id: true } });
      for (const l of ouverts) {
        await this.former(l.id, "lundi");
        lotsFormes++;
      }
    }
    return { lundiDeFormation, ...range, lotsFormes };
  }

  private async former(lotId: string, par: "seuil" | "lundi"): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.lotGroupe.update({ where: { id: lotId }, data: { statut: "forme" } }),
      this.prisma.journalGroupe.create({ data: { lotId, evenement: "lot_forme", details: { par } } }),
    ]);
  }
}

function aCouper(b: { id: string; companyId: string; cle: string; famille: string; zone: string; quantite: { toString(): string }; unite: string; statut: string; fenetreTot: Date; fenetreTard: Date }): BesoinACouper {
  return { id: b.id, companyId: b.companyId, cle: b.cle, famille: b.famille, zone: b.zone, quantite: Number(b.quantite), unite: b.unite, statut: b.statut === "signe" ? "signe" : "en_attente", fenetre: { tot: b.fenetreTot, tard: b.fenetreTard } };
}
