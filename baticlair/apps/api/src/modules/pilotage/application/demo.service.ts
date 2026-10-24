import { randomUUID } from "node:crypto";
import { CONDITIONS_NEGOCE_VERSION, PALIERS_DEFAUT } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { notFound } from "../../../platform/errors/domain-error.js";
import type { AbonnementService } from "../../abonnement/index.js";
import type { CommandeDuMoisService, JeuDemonstrationService } from "../../groupe/index.js";

/**
 * LA DÉMO ADMIN (Greg, 24 octobre 2026) : jouer un cycle complet sur iPhone sans attendre le calendrier. « Créer un jeu
 * de test » met 5 faux artisans dans le 22, chacun sa liste déposée dans la commande ouverte, et 3 faux négoces inscrits ;
 * les boutons font avancer le cycle (clôture, réponses, résultats) et l'abonnement de l'admin (fin d'essai, échec de
 * paiement). Tout ce qui est faux porte `@demo.baticlair.fr` : exclu des statistiques, effacé d'un bouton.
 */
export const ZONE_DEMO = "22";

const ARTISANS = [
  ["Yann Le Gall", "Toitures Le Gall (démo)", "3 rue des Ajoncs, 22300 Lannion"],
  ["Erwan Le Bihan", "Le Bihan Couverture (démo)", "8 rue du Port, 22500 Paimpol"],
  ["Gwenaël Guillou", "Guillou Toiture (démo)", "14 rue Saint-Guillaume, 22000 Saint-Brieuc"],
  ["Loïc Tanguy", "Tanguy Zinguerie (démo)", "6 place du Centre, 22200 Guingamp"],
  ["Ronan Morvan", "Morvan Ardoise (démo)", "11 rue du Général Leclerc, 22620 Ploubazlanec"],
] as const;
const NEGOCES = [
  ["Ardoisière du Trégor (démo)", "ZA de Kerverzot, 22300 Lannion", 48.7326, -3.4566],
  ["Matériaux de l'Argoat (démo)", "Rue de la Gare, 22200 Guingamp", 48.5615, -3.1497],
  ["Comptoir Breton du Bâtiment (démo)", "ZI des Châtelets, 22440 Ploufragan", 48.4893, -2.7942],
] as const;
/** Les mêmes articles chez chacun, à des quantités différentes : ils se regroupent dans la grille. */
const LIGNES = [
  { designation: "Ardoise naturelle 32×22 Espagne 1er choix", unite: "pièces", base: 1800 },
  { designation: "Crochet inox 100 mm", unite: "pièces", base: 1900 },
  { designation: "Liteau sapin traité 27×38", unite: "m", base: 420 },
  { designation: "Écran de sous-toiture HPV, rouleau de 75 m²", unite: "rouleaux", base: 2 },
] as const;

export class DemoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jeu: Pick<JeuDemonstrationService, "effacer">,
    private readonly commande: Pick<CommandeDuMoisService, "deposerPourLaDemo" | "avancerPourLaDemo" | "repondrePourLaDemo">,
    private readonly abonnement: Pick<AbonnementService, "finirEssai" | "simulerEchec">,
    private readonly domaine: string,
  ) {}

  /** Efface l'ancien jeu, puis crée 3 faux négoces inscrits et 5 faux artisans qui ont déposé leur liste. */
  async creer(maintenant = new Date()) {
    await this.effacer();
    const p = this.prisma;
    for (const [i, [enseigne, adresse, lat, lon]] of NEGOCES.entries()) {
      const email = `negoce-test-${i + 1}@${this.domaine}`;
      const compte = await p.compteNegoce.create({ data: { email, enseigne, telephone: "02 96 00 00 00", livraison: { ...PALIERS_DEFAUT } as object, departements: [ZONE_DEMO], inscritLe: maintenant, conditionsAccepteesLe: maintenant, conditionsVersion: CONDITIONS_NEGOCE_VERSION, depots: { create: [{ adresse, departement: ZONE_DEMO, lat, lon }] } } });
      await p.negoce.create({ data: { nom: enseigne, email, departement: ZONE_DEMO, familles: ["couverture"], compteId: compte.id, createdAt: new Date(maintenant.getTime() - 60_000) } });
    }
    let lignes = 0;
    for (const [i, [nom, entreprise, adresse]] of ARTISANS.entries()) {
      const user = await p.user.create({ data: { id: randomUUID(), name: nom, email: `artisan-test-${i + 1}@${this.domaine}`, emailVerified: true } });
      const company = await p.company.create({ data: { name: entreprise, trades: ["roofing"], address: adresse, siret: "73282932000074", siretVerifieLe: maintenant } });
      await p.membership.create({ data: { companyId: company.id, userId: user.id, role: "owner" } });
      const project = await p.project.create({ data: { companyId: company.id, name: `Chantier ${adresse.split(" ").at(-1)} (démo)`, address: adresse, demo: true, createdById: user.id } });
      const takeoff = await p.takeoff.create({ data: { companyId: company.id, projectId: project.id, source: "lignes", trade: "roofing", status: "validated", promptId: "demo", promptVersion: 1, model: "demo", calculatedAt: maintenant, validatedAt: maintenant } });
      const facteur = [1, 0.6, 1.4, 0.8, 1.2][i]!;
      lignes += await this.commande.deposerPourLaDemo({ companyId: company.id, projectId: project.id, takeoffId: takeoff.id, adresse, lignes: LIGNES.map((l) => ({ designation: l.designation, unite: l.unite, famille: "couverture", quantite: Math.max(1, Math.round(l.base * facteur)) })) }, maintenant);
    }
    return { artisans: ARTISANS.length, negoces: NEGOCES.length, lignes, zone: ZONE_DEMO };
  }

  cloturer(maintenant = new Date()) {
    return this.commande.avancerPourLaDemo("cloturer", ZONE_DEMO, maintenant);
  }

  async repondre(maintenant = new Date()) {
    return { reponses: await this.commande.repondrePourLaDemo(this.domaine, maintenant) };
  }

  publier(maintenant = new Date()) {
    return this.commande.avancerPourLaDemo("publier", ZONE_DEMO, maintenant);
  }

  /** « Finir l'essai » et « Simuler un échec de paiement » : sur l'entreprise de l'admin lui-même. */
  async finirEssai(userId: string, maintenant = new Date()) {
    await this.abonnement.finirEssai(await this.entrepriseDe(userId), maintenant);
    return { fait: true };
  }

  async simulerEchec(userId: string, maintenant = new Date()) {
    await this.abonnement.simulerEchec(await this.entrepriseDe(userId), maintenant);
    return { fait: true };
  }

  /** Tout ce qui est faux disparaît : comptes, entreprises, chantiers, besoins, négoces et leurs comptes. */
  async effacer() {
    const avant = await this.jeu.effacer();
    const comptes = await this.prisma.compteNegoce.deleteMany({ where: { email: { endsWith: `@${this.domaine}` } } });
    return { ...avant, comptesNegoce: comptes.count };
  }

  private async entrepriseDe(userId: string): Promise<string> {
    const m = await this.prisma.membership.findFirst({ where: { userId, role: "owner" }, select: { companyId: true } });
    if (!m) throw notFound("Company");
    return m.companyId;
  }
}
