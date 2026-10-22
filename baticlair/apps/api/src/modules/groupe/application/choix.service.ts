import { choisirLeNegoce, lotADecider, totalLivraison, zonesDuLot, type ReponseAChoisir } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";

/**
 * LE CHOIX DU NÉGOCE (parcours groupé, étape 6), côté base : chaque lot envoyé se décide dès que tous les négoces ont
 * répondu, ou passé le délai de réponse ; le code retient le moins cher au volume ferme dans la fenêtre (domaine
 * `choisirLeNegoce`), note le lot « choisi » avec son prix, crée l'offre de chaque artisan engagé (information, pas
 * question) et journalise les écartés avec leur raison. Sans négoce applicable, le lot est « clos » et les besoins
 * restent engagés dedans : Greg décide (étape 9), rien ne repart tout seul.
 */
export class ChoixService {
  constructor(
    private readonly prisma: PrismaService,
    /** Étape 7 : dès le négoce retenu, les bons de commande partent. */
    private readonly commande: { passerLesCommandes(maintenant?: Date, jusqua?: number): Promise<unknown> } = { passerLesCommandes: async () => undefined },
  ) {}

  async choisirLesLotsEnvoyes(maintenant = new Date(), jusqua?: number): Promise<{ lotsChoisis: number; lotsClos: number }> {
    const envoyes = await this.prisma.lotGroupe.findMany({
      where: { statut: "envoye" },
      include: { besoins: true, reponses: true },
      orderBy: { numero: "asc" },
    });
    let lotsChoisis = 0;
    let lotsClos = 0;
    for (const lot of envoyes) {
      if (jusqua && Date.now() > jusqua) break;
      if (!lotADecider(lot, lot.reponses, maintenant)) continue;
      const engages = lot.besoins.filter((b) => b.statut === "engage");
      const volumeFerme = engages.reduce((s, b) => s + Number(b.quantite), 0);
      // Nouveau cap (22 octobre) : le moins cher se juge livraison comprise, sur les zones des chantiers engagés.
      const zones = zonesDuLot(engages.map((b) => b.adresseLivraison));
      const reponses: ReponseAChoisir[] = lot.reponses.map((r) => ({
        livraisonHt: totalLivraison((r.livraison as { zone: string; prixHt: number }[]) ?? [], zones),
        negoceId: r.negoceId,
        statutExtraction: r.statutExtraction,
        prix: (r.prix as { palier: string | null; prixUnitaire: string | null; totalHt: string | null }[]) ?? [],
        delaiJours: r.delaiJours,
        deposeLe: r.deposeLe,
        pasConcerneLe: r.pasConcerneLe,
      }));
      const choix = choisirLeNegoce({ volumeFerme, fenetre: { tot: lot.fenetreTot, tard: lot.fenetreTard } }, reponses);
      const aVerifier = reponses.filter((r) => r.deposeLe && r.statutExtraction !== "lue").map((r) => r.negoceId);
      if (!choix.retenu) {
        await this.prisma.$transaction([
          this.prisma.lotGroupe.update({ where: { id: lot.id }, data: { statut: "clos", clotureLe: maintenant } }),
          this.prisma.journalGroupe.create({ data: { lotId: lot.id, evenement: "sans_offre", details: { ecartes: choix.ecartes, aVerifier } } }),
        ]);
        lotsClos++;
        continue;
      }
      const { negoceId, prixUnitaire, dateLivraison } = choix.retenu;
      await this.prisma.$transaction([
        this.prisma.lotGroupe.update({ where: { id: lot.id }, data: { statut: "choisi", negoceRetenuId: negoceId, prixRetenu: prixUnitaire, clotureLe: maintenant } }),
        ...engages.map((b) =>
          this.prisma.offreArtisan.upsert({
            where: { besoinId: b.id },
            create: { lotId: lot.id, besoinId: b.id, prixUnitaire, dateLivraison },
            update: { prixUnitaire, dateLivraison },
          }),
        ),
        // Un besoin en attente n'était que du volume probable : il redevient libre pour le lot suivant, s'il est signé un jour.
        this.prisma.besoin.updateMany({ where: { lotId: lot.id, statut: "en_attente" }, data: { lotId: null } }),
        this.prisma.journalGroupe.create({ data: { lotId: lot.id, evenement: "negoce_retenu", details: { negoce: negoceId, prixUnitaire, dateLivraison: dateLivraison.toISOString().slice(0, 10), ecartes: choix.ecartes, aVerifier } } }),
      ]);
      lotsChoisis++;
    }
    if (lotsChoisis > 0) await this.commande.passerLesCommandes(maintenant, jusqua);
    return { lotsChoisis, lotsClos };
  }
}
