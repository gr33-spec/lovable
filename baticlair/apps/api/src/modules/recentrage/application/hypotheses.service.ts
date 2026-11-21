import { coutIaTropHaut, indicateursDuMois, referenceStricte, uniteRepere, zoneDuCodePostal, ALERTE_COUT_IA_GRATUIT_USD, type ComptesDuMois, type IndicateursDuMois } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { emailsDemo } from "../../../platform/demo-domaine.js";
import { CLE_INSCRIPTIONS_FERMEES } from "../../identity/index.js";
import type { DemandePersoService } from "./demande-perso.service.js";
import type { DroitsService } from "./droits.service.js";

/**
 * LES HYPOTHÈSES DE LANCEMENT (Greg, 25 octobre 2026) : par zone et par mois, les négoces répondent-ils (perso et groupe,
 * délai moyen) ; les demandes finissent-elles en commande ; le gratuit passe-t-il au payant, et reste-t-il ; les
 * regroupements formés, consultés, commandés ; l'écart entre le prix groupe et le dernier prix perso des participants.
 * Plus le coût IA des comptes gratuits (alerte au-delà de 3 $ par mois) et l'interrupteur des inscriptions gratuites.
 * Les comptes de démonstration et du jeu de test sont exclus de tout.
 */
const HEURE = 3_600_000;

const debutMois = (d: Date, decalage = 0) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + decalage, 1));
const cleMois = (d: Date) => d.toISOString().slice(0, 7);

export class HypothesesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly droits: Pick<DroitsService, "droits">,
    private readonly demandes: Pick<DemandePersoService, "dernierPrixPour">,
    private readonly serieFactures: () => "TEST" | "F",
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async factices(): Promise<Set<string>> {
    const m = await this.prisma.membership.findMany({ where: { user: { OR: emailsDemo() } }, select: { companyId: true } });
    return new Set(m.map((x) => x.companyId));
  }

  /** Les zones des entreprises (leur adresse), hors comptes fictifs. */
  private async zones(): Promise<Map<string, string>> {
    const factices = await this.factices();
    const companies = await this.prisma.company.findMany({ select: { id: true, address: true } });
    const m = new Map<string, string>();
    for (const c of companies) {
      const z = zoneDuCodePostal(c.address);
      if (z && !factices.has(c.id)) m.set(c.id, z);
    }
    return m;
  }

  /** Les indicateurs du mois en cours et des deux précédents, par zone. */
  async hypotheses(): Promise<{ mois: IndicateursDuMois[] }> {
    const maintenant = this.now();
    const zones = await this.zones();
    const sorties: IndicateursDuMois[] = [];
    for (const decalage of [0, -1, -2]) {
      const de = debutMois(maintenant, decalage);
      const a = debutMois(maintenant, decalage + 1);
      const parZone = new Map<string, ComptesDuMois>();
      const compte = (zone: string) => {
        if (!parZone.has(zone))
          parZone.set(zone, { zone, mois: cleMois(de), envoisPerso: 0, reponsesPerso: 0, delaisPersoHeures: [], consultationsGroupe: 0, reponsesGroupe: 0, delaisGroupeHeures: [], demandes: 0, demandesCommandees: 0, artisansGratuits: 0, passagesPayant: 0, resiliations: 0, abonnesDebutDeMois: 0, regroupementsFormes: 0, regroupementsConsultes: 0, regroupementsCommandes: 0, ecartsPrixGroupe: [] });
        return parZone.get(zone)!;
      };
      for (const z of new Set(zones.values())) compte(z);

      // 1. Les réponses des négoces : perso (lien de chiffrage) et groupe (grilles).
      const envois = await this.prisma.priceRequestRecipient.findMany({ where: { sentAt: { gte: de, lt: a }, priceRequest: { but: { not: null } } }, select: { sentAt: true, reponduLe: true, priceRequest: { select: { companyId: true } } } });
      for (const e of envois) {
        const z = zones.get(e.priceRequest.companyId);
        if (!z) continue;
        const c = compte(z);
        c.envoisPerso++;
        if (e.reponduLe) {
          c.reponsesPerso++;
          (c.delaisPersoHeures as number[]).push((e.reponduLe.getTime() - e.sentAt!.getTime()) / HEURE);
        }
      }
      const grilles = await this.prisma.grilleNegoce.findMany({ where: { createdAt: { gte: de, lt: a } }, select: { createdAt: true, deposeLe: true, cycle: { select: { zone: true } } } });
      for (const g of grilles) {
        const c = compte(g.cycle.zone);
        c.consultationsGroupe++;
        if (g.deposeLe) {
          c.reponsesGroupe++;
          (c.delaisGroupeHeures as number[]).push((g.deposeLe.getTime() - g.createdAt.getTime()) / HEURE);
        }
      }

      // 2. Les demandes qui finissent en commande.
      const demandes = await this.prisma.priceRequest.findMany({ where: { but: { not: null }, createdAt: { gte: de, lt: a } }, select: { companyId: true, recipients: { select: { commandeLe: true } } } });
      for (const d of demandes) {
        const z = zones.get(d.companyId);
        if (!z) continue;
        compte(z).demandes++;
        if (d.recipients.some((r) => r.commandeLe)) compte(z).demandesCommandees++;
      }

      // 3. Gratuit → payant, résiliations, abonnés au début du mois.
      const serie = this.serieFactures();
      const factures = await this.prisma.factureAbonnement.findMany({ where: { serie, companyId: { not: null } }, select: { companyId: true, emiseLe: true, periodeDebut: true, periodeFin: true }, orderBy: { emiseLe: "asc" } });
      const premiere = new Map<string, Date>();
      for (const f of factures) if (f.companyId && !premiere.has(f.companyId)) premiere.set(f.companyId, f.emiseLe);
      for (const [companyId, le] of premiere) if (le >= de && le < a && zones.has(companyId)) compte(zones.get(companyId)!).passagesPayant++;
      const abonnesAuDebut = new Set(factures.filter((f) => f.companyId && f.periodeDebut <= de && f.periodeFin > de).map((f) => f.companyId!));
      for (const id of abonnesAuDebut) if (zones.has(id)) compte(zones.get(id)!).abonnesDebutDeMois++;
      const resilies = await this.prisma.abonnement.findMany({ where: { resiliationDemandeeLe: { gte: de, lt: a } }, select: { companyId: true } });
      for (const r of resilies) if (zones.has(r.companyId)) compte(zones.get(r.companyId)!).resiliations++;
      if (decalage === 0) {
        for (const [companyId, z] of zones) if ((await this.droits.droits(companyId)).formule === "gratuit") compte(z).artisansGratuits++;
      }

      // 4. Les regroupements et l'écart prix groupe / dernier prix perso.
      const cycles = await this.prisma.cycleCommande.findMany({
        where: { famille: { not: "toutes" }, createdAt: { gte: de, lt: a } },
        select: { id: true, zone: true, statutVolume: true, closLe: true, retenuId: true, besoins: { select: { id: true }, take: 1 }, grilles: { select: { negoceId: true, prix: true } }, choix: { where: { commandeLe: { not: null } }, select: { companyId: true, negoceId: true } } },
      });
      for (const cy of cycles) {
        const c = compte(cy.zone);
        if (cy.besoins.length) c.regroupementsFormes++;
        if (cy.closLe && cy.statutVolume !== "non_consulte" && cy.grilles.length) c.regroupementsConsultes++;
        if (cy.choix.length) c.regroupementsCommandes++;
        for (const ch of cy.choix) {
          const grille = cy.grilles.find((g) => g.negoceId === ch.negoceId);
          const prix = (grille?.prix as Record<string, number> | null) ?? {};
          const dernier = await this.demandes.dernierPrixPour(ch.companyId);
          const besoins = await this.prisma.besoin.findMany({ where: { cycleId: cy.id, companyId: ch.companyId }, select: { designation: true, cle: true, unite: true } });
          for (const b of besoins) {
            const pu = Object.entries(prix).find(([k]) => k.startsWith(`${b.cle}#`))?.[1];
            const r = referenceStricte(b.designation);
            const perso = r.ok ? dernier(r.reference.cle, uniteRepere(b.unite)) : null;
            if (pu !== undefined && perso) (c.ecartsPrixGroupe as number[]).push((pu - perso) / perso);
          }
        }
      }
      sorties.push(...[...parZone.values()].map(indicateursDuMois));
    }
    return { mois: sorties };
  }

  /** Le coût IA du mois de chaque compte gratuit, du plus cher au moins cher, avec l'alerte au-delà de 3 $. */
  async coutIaGratuits() {
    const de = debutMois(this.now());
    const factices = await this.factices();
    const couts = await this.prisma.aiExecution.groupBy({ by: ["companyId"], where: { createdAt: { gte: de } }, _sum: { costMicroUsd: true } });
    const lignes = [];
    for (const c of couts) {
      if (factices.has(c.companyId)) continue;
      if ((await this.droits.droits(c.companyId)).formule !== "gratuit") continue;
      const usd = Number(c._sum.costMicroUsd ?? 0) / 1_000_000;
      const company = await this.prisma.company.findUnique({ where: { id: c.companyId }, select: { name: true } });
      lignes.push({ companyId: c.companyId, entreprise: company?.name ?? "", usd: Math.round(usd * 100) / 100, alerte: coutIaTropHaut(usd) });
    }
    return { seuilUsd: ALERTE_COUT_IA_GRATUIT_USD, comptes: lignes.sort((x, y) => y.usd - x.usd) };
  }

  async inscriptions(): Promise<{ gratuitesOuvertes: boolean }> {
    const p = await this.prisma.parametreGroupe.findUnique({ where: { cle: CLE_INSCRIPTIONS_FERMEES } });
    return { gratuitesOuvertes: p?.valeur !== true };
  }

  async changerInscriptions(ouvertes: boolean): Promise<{ gratuitesOuvertes: boolean }> {
    await this.prisma.parametreGroupe.upsert({ where: { cle: CLE_INSCRIPTIONS_FERMEES }, create: { cle: CLE_INSCRIPTIONS_FERMEES, valeur: !ouvertes }, update: { valeur: !ouvertes } });
    return { gratuitesOuvertes: ouvertes };
  }
}
