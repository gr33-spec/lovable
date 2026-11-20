import { randomBytes, randomUUID } from "node:crypto";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { DomainError } from "../../../platform/errors/domain-error.js";
import { DOMAINE_DEMO, filtreVisiteurs, PREFIXE_VISITEUR } from "../../../platform/demo-domaine.js";
import { enrichRequestContext } from "../../../platform/logging/request-context.js";
import type { TenantContext } from "../../tenancy/index.js";

/**
 * L'ACCÈS DÉMO « DÉCOUVRIR L'APPLICATION » (Greg, 7 novembre 2026, option 1, test.mobiiz.fr seulement) :
 * - un visiteur reçoit SON espace : un compte éphémère `visiteur-<hasard>@demo.mobiiz.fr` (mot de passe tiré au hasard,
 *   jamais montré ni gardé), une entreprise fictive dont il est le seul membre ; l'isolation est celle de toute entreprise ;
 * - l'espace est rempli de données FICTIVES : un chantier avec son devis lu par la lecture simulée, trois négoces fictifs
 *   qui « répondent » seuls, et une demande de prix déjà chiffrée (prix fictifs) pour voir la comparaison ;
 * - rien ne part : e-mails simulés, aucun appel IA, aucun paiement, rien qui touche d'autres entreprises (`demo-domaine.ts`) ;
 * - effacé après 24 h, et à chaque nouvelle visite les espaces expirés partent ; coupé d'un réglage (`ACCES_DEMO`).
 */
export const DUREE_VISITE_MS = 24 * 3_600_000;
/** Au-delà, plus de nouvel espace tant que les anciens ne sont pas effacés (la base de test ne gonfle pas). */
export const MAX_VISITEURS = 300;
/** La version des CGU affichée dans l'app (`apps/web/src/lib/legal.ts`) : le visiteur n'a pas de bandeau à accepter. */
const VERSION_CGU = "2026-10-27";

const ADRESSE = "2 rue de Kerampont, 22300 Lannion";
const NEGOCES = ["Comptoir Breton du Bâtiment (démo)", "Ardoisière du Trégor (démo)", "Placo de l'Argoat (démo)"] as const;
const LIGNES = [
  { designation: "Ardoise naturelle 32×22 Espagne 1er choix", quantity: "1800", unit: "pièces", famille: "couverture", prix: 1.18 },
  { designation: "Crochet inox 100 mm", quantity: "1900", unit: "pièces", famille: "couverture", prix: 0.21 },
  { designation: "Liteau sapin traité 27×38", quantity: "420", unit: "m", famille: "couverture", prix: 0.62 },
  { designation: "Écran de sous-toiture HPV, rouleau de 75 m²", quantity: "2", unit: "rouleaux", famille: "couverture", prix: 96 },
  { designation: "Plaque de plâtre BA13 2,50 × 1,20 m", quantity: "40", unit: "plaques", famille: "second_oeuvre", prix: 7.9 },
  { designation: "Rail R48 3 m", quantity: "30", unit: "pièces", famille: "second_oeuvre", prix: 3.4 },
] as const;

export interface CreateurChantierDemo {
  createProject(tenant: TenantContext): Promise<{ projectId: string }>;
}

export class AccesDemoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hacher: (motDePasse: string) => Promise<string>,
    private readonly chantierDemo: CreateurChantierDemo,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Crée l'espace d'un visiteur et rend ses identifiants (pour ouvrir la session, jamais affichés). */
  async ouvrir(): Promise<{ email: string; motDePasse: string; companyId: string }> {
    const maintenant = this.now();
    await this.purger(maintenant);
    if ((await this.prisma.user.count({ where: filtreVisiteurs() })) >= MAX_VISITEURS) {
      throw new DomainError("too_many_requests", "Trop de visites en cours : réessaie dans un moment.");
    }
    const userId = randomUUID();
    const email = `${PREFIXE_VISITEUR}${randomBytes(8).toString("hex")}@${DOMAINE_DEMO}`;
    const motDePasse = randomBytes(24).toString("base64url");
    const p = this.prisma;
    await p.user.create({ data: { id: userId, name: "Camille Démo", email, emailVerified: true, cguAccepteLe: maintenant, cguVersion: VERSION_CGU } });
    await p.account.create({ data: { id: randomUUID(), accountId: userId, providerId: "credential", userId, password: await this.hacher(motDePasse) } });
    const company = await p.company.create({
      data: { name: "Couverture Démo (fictive)", trades: ["roofing"], address: ADRESSE, siret: "73282932000074", siretVerifieLe: maintenant, prenom: "Camille", phone: "06 00 00 00 00", contactEmail: email },
    });
    await p.membership.create({ data: { companyId: company.id, userId, role: "owner" } });
    const tenant: TenantContext = { companyId: company.id, userId, role: "owner", trades: ["roofing"] };
    // Tout ce qui suit se fait « en démo » : la lecture du devis est simulée, aucun e-mail ne part.
    enrichRequestContext({ userId, companyId: company.id, demo: true });
    await this.chantierDemo.createProject(tenant);
    await this.demandeChiffree(company.id, userId, maintenant);
    return { email, motDePasse, companyId: company.id };
  }

  /** Efface les espaces des visiteurs plus vieux que 24 h (ou tous, `avant` absent : test et remise à zéro). */
  async purger(maintenant: Date | null = this.now()): Promise<{ visiteurs: number }> {
    const p = this.prisma;
    const users = await p.user.findMany({ where: { ...filtreVisiteurs(), ...(maintenant ? { createdAt: { lt: new Date(maintenant.getTime() - DUREE_VISITE_MS) } } : {}) }, select: { id: true } });
    if (users.length === 0) return { visiteurs: 0 };
    const ids = users.map((u) => u.id);
    const companyIds = (await p.membership.findMany({ where: { userId: { in: ids } }, select: { companyId: true } })).map((m) => m.companyId);
    // Une entreprise de visiteur n'a que lui pour membre ; les demandes partent d'abord (elles retiennent leurs négoces).
    await p.priceRequest.deleteMany({ where: { companyId: { in: companyIds } } });
    await p.company.deleteMany({ where: { id: { in: companyIds } } });
    await p.user.deleteMany({ where: { id: { in: ids } } });
    return { visiteurs: ids.length };
  }

  /** Une liste validée déjà chiffrée par trois négoces fictifs (prix fictifs) : la comparaison et « Commander » se voient. */
  private async demandeChiffree(companyId: string, userId: string, maintenant: Date): Promise<void> {
    const p = this.prisma;
    const project = await p.project.create({ data: { companyId, name: "Chantier Lannion (démo)", address: ADRESSE, demo: true, createdById: userId } });
    const takeoff = await p.takeoff.create({ data: { companyId, projectId: project.id, source: "lignes", trade: "roofing", status: "validated", promptId: "demo", promptVersion: 1, model: "demo", calculatedAt: maintenant, validatedAt: maintenant } });
    // La liste elle-même, reprise telle qu'écrite (comme celle d'un partenaire) : « Ma liste » n'est jamais vide.
    await p.takeoffLine.createMany({ data: LIGNES.map((l, i) => ({ takeoffId: takeoff.id, position: i + 1, designation: l.designation, quantityRaw: l.quantity, unitRaw: l.unit, origin: "partner", role: "purchase", confirmedAt: maintenant })) });
    const envoyeLe = new Date(maintenant.getTime() - 26 * 3_600_000);
    const recipients = [];
    for (const [i, nom] of NEGOCES.entries()) {
      const supplier = await p.supplier.create({ data: { companyId, name: nom, email: `negoce-${i + 1}-${companyId.slice(0, 8)}@${DOMAINE_DEMO}`, notes: "Négoce fictif (accès démo)." } });
      const ecart = [1, 0.93, 0.96][i]!;
      const prix: Record<string, number> = {};
      LIGNES.forEach((l, k) => {
        const chiffre = i === 0 || (i === 1 && l.famille === "couverture") || (i === 2 && l.famille === "second_oeuvre");
        if (chiffre) prix[String(k)] = Math.round(l.prix * ecart * 100) / 100;
      });
      recipients.push({ supplierId: supplier.id, status: "received" as const, sentAt: envoyeLe, prix, livraisonHt: [0, 45, 35][i]!, delaiJours: [3, 2, 4][i]!, validiteJours: [14, 7, 10][i]!, reponduLe: new Date(envoyeLe.getTime() + (i + 2) * 3_600_000) });
    }
    await p.priceRequest.create({
      data: {
        companyId,
        projectId: project.id,
        takeoffId: takeoff.id,
        lines: LIGNES.map((l) => ({ designation: l.designation, quantity: l.quantity, unit: l.unit, reference: null })),
        but: "chiffrer",
        accordIdentiteLe: envoyeLe,
        closLe: new Date(maintenant.getTime() + 21 * 86_400_000),
        createdAt: envoyeLe,
        recipients: { create: recipients },
      },
    });
  }
}
