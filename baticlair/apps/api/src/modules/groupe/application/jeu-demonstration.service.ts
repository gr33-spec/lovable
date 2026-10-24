import { randomUUID } from "node:crypto";
import { economieEstimee } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";

/**
 * LE JEU DE DONNÉES DE DÉMONSTRATION (plan 2 du 21 octobre 2026, bloc 6) : remplit une base de prévisualisation avec
 * 12 artisans des Côtes-d'Armor, 8 négoces et 3 lots à des étapes différentes (en cours, décidé, livré), pour voir
 * l'admin et « Mes lots » remplis. Tout est marqué : e-mails `@demo.baticlair.fr`, noms « (démo) », clés de lot `demo-…`
 * (elles ne se regroupent jamais avec un vrai besoin). Rejouable : l'ancien jeu est effacé d'abord. Jamais en production.
 * Si une entreprise est nommée (celle de Greg), elle entre dans les trois lots : « Mes lots » se remplit chez elle.
 */
export const DOMAINE_DEMO = "demo.baticlair.fr";

const VILLES = [
  ["3 rue des Ajoncs, 22300 Lannion", "Lannion"],
  ["12 rue de Kerampont, 22300 Lannion", "Lannion"],
  ["8 rue du Port, 22500 Paimpol", "Paimpol"],
  ["5 quai Morand, 22500 Paimpol", "Paimpol"],
  ["14 rue Saint-Guillaume, 22000 Saint-Brieuc", "Saint-Brieuc"],
  ["27 rue de Gouédic, 22000 Saint-Brieuc", "Saint-Brieuc"],
  ["6 place du Centre, 22200 Guingamp", "Guingamp"],
  ["9 rue Notre-Dame, 22200 Guingamp", "Guingamp"],
  ["2 rue du Château, 22100 Dinan", "Dinan"],
  ["18 rue de l'Horloge, 22100 Dinan", "Dinan"],
  ["4 rue de la Gare, 22400 Lamballe", "Lamballe"],
  ["11 rue du Général Leclerc, 22620 Ploubazlanec", "Ploubazlanec"],
] as const;
const NOMS = ["Le Gall", "Le Bihan", "Guillou", "Tanguy", "Morvan", "Le Roux", "Jaouen", "Riou", "Le Goff", "Péron", "Quéré", "Hamon"] as const;
const NEGOCES = [
  ["Ardoisière du Trégor", ["couverture"]],
  ["Matériaux de l'Argoat", ["couverture", "charpente", "maconnerie"]],
  ["Comptoir Breton du Bâtiment", ["couverture", "second_oeuvre", "plomberie", "electricite"]],
  ["Bois et Charpentes du Goëlo", ["charpente", "menuiseries_fermetures"]],
  ["Négoce Saint-Brieuc Couverture", ["couverture"]],
  ["Dinan Matériaux", ["couverture", "maconnerie", "amenagement_exterieur"]],
  ["Lamballe Toiture Négoce", ["couverture", "charpente"]],
  ["Point Zinc Guingamp", ["couverture", "serrurerie_metallerie"]],
] as const;

export interface JeuCree {
  artisans: number;
  negoces: number;
  lots: { numero: number; etape: "en_cours" | "decide" | "livre" }[];
  entreprise: string | null;
}

export class JeuDemonstrationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Efface l'ancien jeu (entreprises, négoces et lots marqués), puis en crée un neuf. */
  async creer(entrepriseEmail: string | null, maintenant = new Date()): Promise<JeuCree> {
    await this.effacer();
    const p = this.prisma;
    const jour = (n: number) => new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate() + n));

    // 8 négoces du département, dans la base commune.
    const negoces = [];
    for (const [i, [nom, familles]] of NEGOCES.entries()) {
      negoces.push(await p.negoce.create({ data: { nom: `${nom} (démo)`, email: `negoce-demo-${i + 1}@${DOMAINE_DEMO}`, departement: "22", familles: [...familles] } }));
    }

    // 12 artisans : un utilisateur, une entreprise au SIRET vérifié, un chantier avec son quantitatif.
    const artisans: { company: { id: string }; user: { id: string }; adresse: string; ville: string; chantier: { projectId: string; takeoffId: string } }[] = [];
    for (const [i, nom] of NOMS.entries()) {
      const [adresse, ville] = VILLES[i]!;
      const user = await p.user.create({ data: { id: randomUUID(), name: `${["Yann", "Erwan", "Gwenaël", "Loïc", "Ronan", "Tugdual", "Maël", "Gurvan", "Nolwenn", "Soazig", "Katell", "Morgane"][i]} ${nom}`, email: `artisan-demo-${i + 1}@${DOMAINE_DEMO}`, emailVerified: true } });
      const company = await p.company.create({ data: { name: `Toitures ${nom} (démo)`, trades: ["roofing"], address: adresse, siret: "73282932000074", siretVerifieLe: maintenant, plan: "solo", planActivatedAt: maintenant } });
      await p.membership.create({ data: { companyId: company.id, userId: user.id, role: "owner" } });
      for (const [k, n] of [negoces[i % 8]!, negoces[(i + 3) % 8]!].entries()) await p.negoceArtisan.create({ data: { companyId: company.id, negoceId: n.id, rang: k + 1, numeroCompte: k === 0 ? `C-${100 + i}` : null } });
      artisans.push({ company, user, adresse, ville, chantier: await this.chantier(company.id, user.id, `Toiture ${ville} (démo)`, adresse) });
    }
    // L'entreprise nommée (Greg) entre dans chaque lot avec un chantier de démonstration.
    const entreprise = entrepriseEmail ? await this.entreprise(entrepriseEmail, maintenant) : null;

    const lots: JeuCree["lots"] = [];
    const ref = { cle: "demo-ardoise-32x22-espagne-1er-choix", famille: "couverture", designation: "Ardoise 32 × 22 Espagne 1er choix (démo)", unite: "pièces" };
    const avec = (a: typeof artisans, extra: typeof entreprise) => [...a.map((x) => ({ companyId: x.company.id, projectId: x.chantier.projectId, takeoffId: x.chantier.takeoffId, adresse: x.adresse })), ...(extra ? [{ companyId: extra.companyId, projectId: extra.projectId, takeoffId: extra.takeoffId, adresse: extra.adresse }] : [])];

    // Lot 1, en cours : demande partie chez 3 négoces, une réponse déjà déposée, deux attendues.
    {
      const lot = await p.lotGroupe.create({ data: { cle: ref.cle, famille: ref.famille, zone: "22", fenetreTot: jour(10), fenetreTard: jour(24), statut: "envoye", envoyeLe: jour(-2) } });
      for (const [i, a] of avec(artisans.slice(0, 4), entreprise).entries()) {
        await p.besoin.create({ data: { ...ref, companyId: a.companyId, projectId: a.projectId, takeoffId: a.takeoffId, articleKey: `demo:ardoise:${lot.id}`, quantite: 1800 + i * 240, zone: "22", adresseLivraison: a.adresse, fenetreTot: jour(10), fenetreTard: jour(24), statut: "engage", signeLe: jour(-5), engageLe: jour(-2), lotId: lot.id } });
      }
      for (const [i, n] of negoces.slice(0, 3).entries()) {
        await p.reponseNegoce.create({ data: { lotId: lot.id, negoceId: n.id, tokenHash: `demo-${lot.id}-${n.id}`, ...(i === 0 ? { deposeLe: jour(-1), statutExtraction: "lue", prix: [{ cle: ref.cle, palier: null, prixUnitaire: 0.94 }], delaiJours: 8, message: "Franco de port à partir de 2 000 pièces." } : {}) } });
      }
      await p.accordNegoce.create({ data: { lotId: lot.id, negoceId: negoces[0]!.id, versionContrat: "2026-10-20", tauxPourcent: 2, email: negoces[0]!.email, adresseIp: "203.0.113.10", accepteLe: jour(-1) } });
      await p.journalGroupe.createMany({ data: [{ lotId: lot.id, evenement: "lot_forme", details: { artisans: 4 }, createdAt: jour(-2) }, { lotId: lot.id, evenement: "demande_envoyee", details: { negoces: 3 }, createdAt: jour(-2) }, { lotId: lot.id, evenement: "reponse_deposee", details: { negoce: negoces[0]!.id }, createdAt: jour(-1) }] });
      lots.push({ numero: lot.numero, etape: "en_cours" });
    }
    // Lot 2, décidé : négoce retenu, bons de commande partis, livraisons prévues, facture envoyée.
    {
      const retenu = negoces[1]!;
      const prix = 0.91;
      const lot = await p.lotGroupe.create({ data: { cle: `${ref.cle}-b`, famille: ref.famille, zone: "22", fenetreTot: jour(5), fenetreTard: jour(19), statut: "choisi", envoyeLe: jour(-9), clotureLe: jour(-2), negoceRetenuId: retenu.id, prixRetenu: prix } });
      let totalHt = 0;
      for (const [i, a] of avec(artisans.slice(4, 8), entreprise).entries()) {
        const quantite = 2200 + i * 180;
        totalHt += quantite * prix;
        const besoin = await p.besoin.create({ data: { ...ref, cle: `${ref.cle}-b`, companyId: a.companyId, projectId: a.projectId, takeoffId: a.takeoffId, articleKey: `demo:ardoise:${lot.id}`, quantite, zone: "22", adresseLivraison: a.adresse, fenetreTot: jour(5), fenetreTard: jour(19), statut: "commande", signeLe: jour(-12), engageLe: jour(-9), lotId: lot.id } });
        const prixReference = i % 2 === 0 ? 1.04 : null;
        const offre = await p.offreArtisan.create({ data: { lotId: lot.id, besoinId: besoin.id, prixUnitaire: prix, prixReference, economie: prixReference ? economieEstimee(prixReference, prix, quantite) : null, dateLivraison: jour(5), envoyeeLe: jour(-2) } });
        const bon = await p.bonCommande.create({ data: { offreId: offre.id, negoceId: retenu.id, envoyeLe: jour(-2) } });
        await p.livraison.create({ data: { bonId: bon.id, datePrevue: jour(5), statut: "prevue" } });
      }
      for (const [i, n] of [negoces[1]!, negoces[2]!, negoces[4]!].entries()) {
        await p.reponseNegoce.create({ data: { lotId: lot.id, negoceId: n.id, tokenHash: `demo-${lot.id}-${n.id}`, deposeLe: jour(-4 - i), statutExtraction: "lue", prix: [{ cle: `${ref.cle}-b`, palier: null, prixUnitaire: [prix, 0.97, 1.02][i] }], delaiJours: [6, 9, 7][i] } });
        await p.accordNegoce.create({ data: { lotId: lot.id, negoceId: n.id, versionContrat: "2026-10-20", tauxPourcent: 2, email: n.email, adresseIp: `203.0.113.${20 + i}`, accepteLe: jour(-4 - i) } });
      }
      const accord = await p.accordNegoce.findUniqueOrThrow({ where: { lotId_negoceId: { lotId: lot.id, negoceId: retenu.id } } });
      const total = Math.round(totalHt * 100) / 100;
      await p.factureNegoce.create({ data: { lotId: lot.id, negoceId: retenu.id, accordId: accord.id, totalLotHt: total, montantHt: Math.round(total * 2) / 100, emiseLe: jour(-2), echeanceLe: jour(28), envoyeeLe: jour(-2), statut: "envoyee" } });
      await p.journalGroupe.createMany({ data: [{ lotId: lot.id, evenement: "lot_forme", details: { artisans: 4 }, createdAt: jour(-9) }, { lotId: lot.id, evenement: "demande_envoyee", details: { negoces: 3 }, createdAt: jour(-9) }, { lotId: lot.id, evenement: "negoce_retenu", details: { negoce: retenu.id, prixUnitaire: prix }, createdAt: jour(-2) }, { lotId: lot.id, evenement: "bons_envoyes", details: { negoce: retenu.id, bons: 4 }, createdAt: jour(-2) }, { lotId: lot.id, evenement: "facture_envoyee", details: { montantHt: Math.round(total * 2) / 100 }, createdAt: jour(-2) }] });
      lots.push({ numero: lot.numero, etape: "decide" });
    }
    // Lot 3, livré : tout est arrivé, facture payée.
    {
      const retenu = negoces[4]!;
      const prix = 0.89;
      const lot = await p.lotGroupe.create({ data: { cle: `${ref.cle}-c`, famille: ref.famille, zone: "22", fenetreTot: jour(-20), fenetreTard: jour(-6), statut: "choisi", envoyeLe: jour(-34), clotureLe: jour(-27), negoceRetenuId: retenu.id, prixRetenu: prix } });
      let totalHt = 0;
      for (const [i, a] of avec(artisans.slice(8, 12), entreprise).entries()) {
        const quantite = 1500 + i * 300;
        totalHt += quantite * prix;
        const besoin = await p.besoin.create({ data: { ...ref, cle: `${ref.cle}-c`, companyId: a.companyId, projectId: a.projectId, takeoffId: a.takeoffId, articleKey: `demo:ardoise:${lot.id}`, quantite, zone: "22", adresseLivraison: a.adresse, fenetreTot: jour(-20), fenetreTard: jour(-6), statut: "livre", signeLe: jour(-40), engageLe: jour(-34), lotId: lot.id } });
        const offre = await p.offreArtisan.create({ data: { lotId: lot.id, besoinId: besoin.id, prixUnitaire: prix, prixReference: 1.05, economie: economieEstimee(1.05, prix, quantite), dateLivraison: jour(-15), envoyeeLe: jour(-27) } });
        const bon = await p.bonCommande.create({ data: { offreId: offre.id, negoceId: retenu.id, envoyeLe: jour(-27) } });
        await p.livraison.create({ data: { bonId: bon.id, datePrevue: jour(-15), statut: "livre", confirmeLe: jour(-15), prevenuLe: jour(-15) } });
      }
      await p.reponseNegoce.create({ data: { lotId: lot.id, negoceId: retenu.id, tokenHash: `demo-${lot.id}-${retenu.id}`, deposeLe: jour(-30), statutExtraction: "lue", prix: [{ cle: `${ref.cle}-c`, palier: null, prixUnitaire: prix }], delaiJours: 7 } });
      const accord = await p.accordNegoce.create({ data: { lotId: lot.id, negoceId: retenu.id, versionContrat: "2026-10-20", tauxPourcent: 2, email: retenu.email, adresseIp: "203.0.113.40", accepteLe: jour(-30) } });
      const total = Math.round(totalHt * 100) / 100;
      await p.factureNegoce.create({ data: { lotId: lot.id, negoceId: retenu.id, accordId: accord.id, totalLotHt: total, montantHt: Math.round(total * 2) / 100, emiseLe: jour(-27), echeanceLe: jour(3), envoyeeLe: jour(-27), payeeLe: jour(-8), statut: "payee" } });
      await p.journalGroupe.createMany({ data: [{ lotId: lot.id, evenement: "lot_forme", details: { artisans: 4 }, createdAt: jour(-34) }, { lotId: lot.id, evenement: "negoce_retenu", details: { negoce: retenu.id, prixUnitaire: prix }, createdAt: jour(-27) }, { lotId: lot.id, evenement: "bons_envoyes", details: { negoce: retenu.id, bons: 4 }, createdAt: jour(-27) }, { lotId: lot.id, evenement: "livraison_confirmee", details: { bons: 4 }, createdAt: jour(-15) }, { lotId: lot.id, evenement: "facture_payee", details: {}, createdAt: jour(-8) }] });
      lots.push({ numero: lot.numero, etape: "livre" });
    }
    return { artisans: artisans.length, negoces: negoces.length, lots, entreprise: entreprise?.email ?? null };
  }

  /** Efface tout ce qui est marqué « démo » : lots `demo-…` (offres, bons, factures, journal en cascade), négoces et comptes. */
  async effacer(): Promise<{ lots: number; negoces: number; artisans: number }> {
    const p = this.prisma;
    const lots = await p.lotGroupe.deleteMany({ where: { cle: { startsWith: "demo-" } } });
    const negoces = await p.negoce.deleteMany({ where: { email: { endsWith: `@${DOMAINE_DEMO}` } } });
    const users = await p.user.findMany({ where: { email: { endsWith: `@${DOMAINE_DEMO}` } }, select: { id: true } });
    const entreprises = await p.membership.findMany({ where: { userId: { in: users.map((u) => u.id) } }, select: { companyId: true } });
    await p.company.deleteMany({ where: { id: { in: entreprises.map((e) => e.companyId) } } });
    const artisans = await p.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    // Les chantiers de démonstration créés chez l'entreprise nommée (Greg) disparaissent aussi, avec leurs besoins.
    await p.project.deleteMany({ where: { OR: [{ name: { startsWith: "Démo groupé" } }, { name: { startsWith: "Démo commande commune" } }] } });
    return { lots: lots.count, negoces: negoces.count, artisans: artisans.count };
  }

  /** Un chantier avec un quantitatif minimal, juste de quoi porter des besoins. */
  private async chantier(companyId: string, userId: string | null, nom: string, adresse: string): Promise<{ projectId: string; takeoffId: string }> {
    const project = await this.prisma.project.create({ data: { companyId, name: nom, clientName: "Client (démo)", address: adresse, demo: true, createdById: userId } });
    const takeoff = await this.prisma.takeoff.create({ data: { companyId, projectId: project.id, source: "lignes", trade: "roofing", status: "validated", promptId: "demo", promptVersion: 1, model: "demo", calculatedAt: new Date(), validatedAt: new Date() } });
    return { projectId: project.id, takeoffId: takeoff.id };
  }

  /** L'entreprise nommée : son SIRET passe vérifié (sinon le groupé lui est fermé) et un chantier de démonstration l'attend. */
  private async entreprise(email: string, maintenant: Date) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, include: { memberships: { where: { role: "owner" }, take: 1 } } });
    const membership = user?.memberships[0];
    if (!user || !membership) return null;
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: membership.companyId } });
    if (!company.siretVerifieLe) await this.prisma.company.update({ where: { id: company.id }, data: { siret: company.siret ?? "73282932000074", siretVerifieLe: maintenant } });
    const adresse = company.address && /\b22\d{3}\b/.test(company.address) ? company.address : "6 impasse du Ouipoure, 22620 Ploubazlanec";
    const chantier = await this.chantier(company.id, user.id, "Démo commande commune – Toiture Ploubazlanec", adresse);
    return { companyId: company.id, email: user.email, adresse, ...chantier };
  }
}
