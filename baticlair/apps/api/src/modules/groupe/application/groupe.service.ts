import { cleDeReference, economieEstimee, familleDuMetier, fenetreValide, lotParti, fraisDeLivraison, messageBesoinAccepte, phraseCompteur, precisionDeLigne, prixAuVolume, prixLivre, quantiteDuBesoin, transitionBesoin, zoneDeLivraison, zoneDuCodePostal, type CompteurDuGroupe, type MessageArtisan, type StatutBesoin } from "@baticlair/domain";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { isUuid } from "../../../platform/validation/ids.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import type { ReviewedTakeoff } from "../../takeoff/index.js";
import type { RegroupementService } from "./regroupement.service.js";
import { siretBienForme, type SiretVerifier } from "./siret-verifier.js";
import { livraisonDe } from "./demande.service.js";

/** Pourquoi le groupé reste fermé à une entreprise (section 5 du parcours groupé). Gratuit pour l'artisan (décision du fondateur, 2026-10-20) : aucune condition d'abonnement. */
export type RaisonFermeture = "siret_non_verifie" | "exclu_du_groupe" | "departement_ferme";

export interface BesoinVue {
  id: string;
  articleKey: string;
  designation: string;
  quantite: string;
  unite: string;
  statut: StatutBesoin;
  fenetre: { tot: string; tard: string };
  /** Le lot est parti aux négoces : le besoin ne se retire plus (section 4 b). */
  lotParti: boolean;
  /** Étape 6 : l'offre personnelle, une information, jamais une question. */
  offre: OffreVue | null;
}

/** Étape 7 : le bon de commande de l'artisan et sa livraison (« Livré » / « Problème »). */
export interface BonVue {
  id: string;
  envoyeLe: string | null;
  livraison: { statut: string; datePrevue: string | null } | null;
}

export interface OffreVue {
  id: string;
  lotNumero: number;
  prixUnitaire: string;
  negoce: string;
  dateLivraison: string | null;
  /** Le prix de référence déclaré par l'artisan (dernier prix payé seul), pour l'économie estimée (section 6). */
  prixReference: string | null;
  economie: string | null;
  probleme: string | null;
  /** Nouveau cap (22 octobre) : le prix livré chez l'artisan (livraison de sa zone comprise), comparé à son prix habituel. */
  livre?: ReturnType<typeof prixLivre> & { zone: string | null; distanceKm: number | null; francoKm: number | null };
}

export interface Proposition {
  articles: readonly string[];
  fenetre: { tot: Date; tard: Date };
  statut: "signe" | "en_attente";
  /** La phrase d'engagement acceptée : obligatoire pour « Chantier signé » (section 2, étape 2). */
  engagement: boolean;
}

const jour = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Les lignes d'une liste qui peuvent entrer dans la commande commune : prêtes (aucune question, aucun ratio à vérifier),
 * PRÉCISES (une ligne vague part seulement chez le négoce de l'artisan, décision de Greg du 22 octobre), avec une
 * quantité et un métier de la commande commune. Partagée par le lot (ancien) et la commande du mois.
 */
export function lignesProposables(r: ReviewedTakeoff, articles: readonly string[]) {
  // Le métier de chaque ligne : celui de son lot (« lot:<n>:<métier> »), sinon celui du quantitatif.
  const metierDe = new Map<string, string>();
  for (const g of r.purchase.screen.groups) {
    const m = /^lot:\d+:(.+)$/.exec(g.key);
    if (m) for (const row of g.rows) if (row.itemKey) metierDe.set(row.itemKey, m[1]!);
  }
  return [...new Set(articles)].map((key) => {
    const item = r.purchase.toBuy.find((b) => b.key === key);
    if (!item) throw validationFailed("Unknown list line", { reason: "ligne_inconnue", article: key });
    // Une quantité sûre : une ligne orange (question, ratio « à vérifier ») se règle d'abord.
    if (item.state !== "ready" || (item.waitsOn?.length ?? 0) > 0 || (item.toConfirm?.length ?? 0) > 0) throw validationFailed("Line not ready", { reason: "ligne_a_regler", article: key });
    if (!precisionDeLigne(item.label).precise) throw validationFailed("Vague line", { reason: "ligne_vague", article: key });
    const q = quantiteDuBesoin(item.order, item.quantity);
    if (!q) throw validationFailed("Line without quantity", { reason: "sans_quantite", article: key });
    const famille = familleDuMetier(metierDe.get(key) ?? r.takeoff.trade);
    if (!famille) throw validationFailed("Trade outside the groupé", { reason: "sans_famille", article: key });
    return { item, q, famille };
  });
}

/**
 * L'ENTRÉE DU BESOIN AU GROUPÉ (parcours groupé, étape 2) : depuis l'écran 3, une ou plusieurs lignes de la liste d'achats
 * d'un devis lu par l'app (jamais une saisie libre, section 5) deviennent des besoins, avec une fenêtre de livraison et un
 * seul choix « Chantier signé » / « Devis en attente » ; un besoin en attente bascule signé d'un tap ; un besoin se retire
 * tant que son lot n'est pas parti. Ouvert seulement avec le SIRET vérifié ; gratuit pour l'artisan, aucune condition d'abonnement (décision du fondateur, 2026-10-20).
 */
export class GroupeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewed: (tenant: TenantContext, takeoffId: string) => Promise<ReviewedTakeoff>,
    private readonly siret: SiretVerifier,
    private readonly regroupement: RegroupementService,
    /** Étape 5 : un lot formé part aux négoces aussitôt. */
    private readonly demande: { envoyerLesLotsFormes(): Promise<unknown> },
    /** Étape 7 : l'exclusion après deux désistements (section 4 c). */
    private readonly commande: { exclue(companyId: string): Promise<boolean> },
    /** Étape 8 : « Vos 31 bacs sont dans le groupé Côtes-d'Armor. Prochaine commande groupée lundi. » */
    private readonly notifications: { prevenir(companyId: string, message: MessageArtisan): Promise<unknown> },
    /** Étape 9 : les départements ouverts (`GROUPE_DEPARTEMENTS`, `null` = tous) et les admins. */
    private readonly reglages: { departements: string[] | null; admins: string[] } = { departements: null, admins: [] },
  ) {}

  /**
   * L'état du groupé pour l'entreprise : ouvert ou pourquoi pas, et les trois étapes de l'onglet « Groupé » (demande du
   * fondateur, 2026-10-20) : SIRET vérifié, un devis déposé, des négoces ajoutés ; chacune se coche quand elle est faite.
   */
  async etat(tenant: TenantContext): Promise<{ eligible: boolean; raisons: RaisonFermeture[]; siret: { renseigne: boolean; verifie: boolean }; etapes: { siret: boolean; devis: boolean; negoces: boolean }; departement: string | null; admin: boolean; excluJusquau: string | null }> {
    const [c, devis, negoces, user, exclusion] = await Promise.all([
      this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { siret: true, siretVerifieLe: true, address: true } }),
      this.prisma.takeoff.count({ where: { companyId: tenant.companyId } }),
      this.prisma.negoceArtisan.count({ where: { companyId: tenant.companyId } }),
      this.prisma.user.findUnique({ where: { id: tenant.userId }, select: { email: true } }),
      this.prisma.desistement.findFirst({ where: { companyId: tenant.companyId, excluJusquau: { gt: new Date() } }, orderBy: { excluJusquau: "desc" }, select: { excluJusquau: true } }),
    ]);
    const raisons: RaisonFermeture[] = [];
    if (!c.siretVerifieLe) raisons.push("siret_non_verifie");
    if (await this.commande.exclue(tenant.companyId)) raisons.push("exclu_du_groupe");
    const excluJusquau = exclusion?.excluJusquau ? jour(exclusion.excluJusquau) : null;
    const departement = zoneDuCodePostal(c.address ?? "");
    // Étape 9 : ouverture par département (le 22 d'abord). Sans adresse, on ne ferme pas ici : l'adresse se demande à la proposition.
    if (this.reglages.departements && departement && !this.reglages.departements.includes(departement)) raisons.push("departement_ferme");
    const admin = !!user && this.reglages.admins.includes(user.email.toLowerCase());
    return { eligible: raisons.length === 0, raisons, siret: { renseigne: !!c.siret, verifie: !!c.siretVerifieLe }, etapes: { siret: !!c.siretVerifieLe, devis: devis > 0, negoces: negoces > 0 }, departement, admin, excluJusquau };
  }

  /**
   * « Mes lots » (onglet Groupé) : chaque besoin de l'entreprise avec son chantier et son lot. Nouveau cap (22 octobre) :
   * avec le COMPTEUR de son groupe (« 30 couvreurs, 15 demandes envoyées, 3 devis reçus, meilleur prix 1,12 € ») ; jamais le
   * nom ni les chantiers des autres artisans.
   */
  async mesLots(tenant: TenantContext): Promise<(BesoinVue & { projectId: string; chantier: string; lot: { numero: number; statut: string } | null; bon: BonVue | null; compteur: CompteurDuGroupe & { phrase: string } })[]> {
    // Un besoin retiré avant le départ disparaît ; retiré par désistement (un bon existe), il reste visible : « Tu ne commandes pas ce lot ».
    const rows = await this.prisma.besoin.findMany({
      where: { companyId: tenant.companyId, OR: [{ statut: { not: "retire" } }, { offre: { bon: { isNot: null } } }] },
      include: { lot: { select: { statut: true, numero: true, negoceRetenu: { select: { nom: true } } } }, offre: { include: { bon: { select: { id: true, envoyeLe: true, livraison: true } } } }, project: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    const compteurs = new Map<string, CompteurDuGroupe>();
    for (const b of rows) {
      const cle = b.lotId ?? `${b.cle}|${b.zone}`;
      if (!compteurs.has(cle)) compteurs.set(cle, await this.compteur(b));
    }
    return rows.map((b) => ({
      ...vue(b),
      compteur: (() => {
        const c = compteurs.get(b.lotId ?? `${b.cle}|${b.zone}`)!;
        return { ...c, phrase: phraseCompteur(c, b.famille) };
      })(),
      projectId: b.projectId,
      chantier: b.project.name,
      lot: b.lot ? { numero: b.lot.numero, statut: b.lot.statut } : null,
      bon: b.offre?.bon
        ? { id: b.offre.bon.id, envoyeLe: b.offre.bon.envoyeLe ? jour(b.offre.bon.envoyeLe) : null, livraison: b.offre.bon.livraison ? { statut: b.offre.bon.livraison.statut, datePrevue: b.offre.bon.livraison.datePrevue ? jour(b.offre.bon.livraison.datePrevue) : null } : null }
        : null,
    }));
  }

  /**
   * Le compteur d'un groupe : dans un lot, ses artisans, les négoces à qui la demande est partie, leurs devis et le
   * meilleur prix lu au volume ferme ; avant le lot, les artisans qui ont la même ligne (même clé, même secteur).
   */
  private async compteur(b: { lotId: string | null; cle: string; zone: string }): Promise<CompteurDuGroupe> {
    if (!b.lotId) {
      const memes = await this.prisma.besoin.findMany({ where: { cle: b.cle, zone: b.zone, lotId: null, statut: { in: ["signe", "en_attente"] } }, select: { companyId: true }, distinct: ["companyId"] });
      return { artisans: memes.length, demandes: 0, devis: 0, meilleurPrix: null };
    }
    const [besoins, reponses] = await Promise.all([
      this.prisma.besoin.findMany({ where: { lotId: b.lotId, statut: { not: "retire" } }, select: { companyId: true, quantite: true, statut: true } }),
      this.prisma.reponseNegoce.findMany({ where: { lotId: b.lotId }, select: { deposeLe: true, statutExtraction: true, prix: true } }),
    ]);
    const volume = besoins.filter((x) => x.statut !== "en_attente").reduce((s, x) => s + Number(x.quantite), 0);
    const prix = reponses
      .filter((r) => r.deposeLe && r.statutExtraction === "lue")
      .map((r) => prixAuVolume(Array.isArray(r.prix) ? (r.prix as { palier: string | null; prixUnitaire: string | null; totalHt: string | null }[]) : [], volume))
      .filter((p): p is number => p !== null);
    return { artisans: new Set(besoins.map((x) => x.companyId)).size, demandes: reponses.length, devis: reponses.filter((r) => r.deposeLe).length, meilleurPrix: prix.length ? Math.min(...prix) : null };
  }

  /** Vérifie le SIRET de l'entreprise auprès de l'INSEE ; actif, il ouvre l'accès au groupé. */
  async verifierSiret(tenant: TenantContext): Promise<{ verifie: boolean; statut: string }> {
    assertCanWrite(tenant);
    const c = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { siret: true } });
    const siret = (c.siret ?? "").replace(/\s/g, "");
    if (!siretBienForme(siret)) throw validationFailed("Invalid SIRET", { reason: "siret_invalide" });
    const r = await this.siret.verifier(siret);
    if (r.statut === "actif") await this.prisma.company.update({ where: { id: tenant.companyId }, data: { siretVerifieLe: new Date() } });
    return { verifie: r.statut === "actif", statut: r.statut };
  }

  /** Étape 6 : toutes mes offres (une par besoin engagé d'un lot choisi), les plus récentes d'abord. */
  async mesOffres(tenant: TenantContext): Promise<(OffreVue & { designation: string; quantite: string; unite: string; projectId: string; livre: ReturnType<typeof prixLivre> & { zone: string | null; distanceKm: number | null; francoKm: number | null } })[]> {
    const offres = await this.prisma.offreArtisan.findMany({
      where: { besoin: { companyId: tenant.companyId } },
      include: { besoin: true, lot: { include: { negoceRetenu: { select: { nom: true } }, reponses: { select: { negoceId: true, livraison: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    // Nouveau cap (22 octobre) : le prix livré chez l'artisan (sa quantité au prix du lot + la livraison de SA zone),
    // comparé à son prix habituel s'il l'a saisi.
    return offres.map((o) => ({
      ...offreVue(o, o.besoin),
      designation: o.besoin.designation,
      quantite: o.besoin.quantite.toString(),
      unite: o.besoin.unite,
      projectId: o.besoin.projectId,
      livre: livreDe(o.besoin.id, o.besoin.adresseLivraison, Number(o.besoin.quantite), Number(o.prixUnitaire), o.prixReference, o.lot),
    }));
  }

  /** « Problème » : l'artisan signale une erreur sur son offre ; journalisé pour Greg, rien d'autre ne bouge. */
  async signalerProbleme(tenant: TenantContext, offreId: string, probleme: string): Promise<OffreVue> {
    assertCanWrite(tenant);
    const o = await this.offreDe(tenant, offreId);
    const now = new Date();
    const maj = await this.prisma.offreArtisan.update({ where: { id: o.id }, data: { probleme, problemeLe: now } });
    await this.prisma.journalGroupe.create({ data: { lotId: o.lotId, evenement: "probleme_signale", details: { offre: o.id, probleme } } });
    return offreVue({ ...maj, lot: o.lot }, o.besoin);
  }

  /** Le prix de référence de l'artisan (dernier prix payé seul) : il sert au compteur d'économie, jamais à la facture. */
  async declarerReference(tenant: TenantContext, offreId: string, prixReference: number | null): Promise<OffreVue> {
    assertCanWrite(tenant);
    const o = await this.offreDe(tenant, offreId);
    // L'économie se compte livraison comprise, comme le prix livré montré sur la même carte (plan « finition », 22 octobre).
    const livraisonHt = livreDe(o.besoin.id, o.besoin.adresseLivraison, Number(o.besoin.quantite), Number(o.prixUnitaire), null, o.lot)?.livraisonHt ?? 0;
    const economie = prixReference === null ? null : economieEstimee(prixReference, Number(o.prixUnitaire), Number(o.besoin.quantite), livraisonHt);
    const maj = await this.prisma.offreArtisan.update({ where: { id: o.id }, data: { prixReference, economie } });
    return offreVue({ ...maj, lot: o.lot }, o.besoin);
  }

  private async offreDe(tenant: TenantContext, offreId: string) {
    if (!isUuid(offreId)) throw notFound("Offre");
    const o = await this.prisma.offreArtisan.findFirst({ where: { id: offreId, besoin: { companyId: tenant.companyId } }, include: { besoin: true, lot: { include: { negoceRetenu: { select: { nom: true } }, reponses: { select: { negoceId: true, livraison: true } } } } } });
    if (!o) throw notFound("Offre");
    return o;
  }

  async besoinsDuChantier(tenant: TenantContext, projectId: string): Promise<BesoinVue[]> {
    if (!isUuid(projectId)) throw notFound("Project");
    const project = await this.prisma.project.findFirst({ where: { id: projectId, companyId: tenant.companyId }, select: { id: true } });
    if (!project) throw notFound("Project");
    const rows = await this.prisma.besoin.findMany({
      where: { projectId, companyId: tenant.companyId, statut: { not: "retire" } },
      include: { lot: { select: { statut: true, numero: true, negoceRetenuId: true, negoceRetenu: { select: { nom: true } }, reponses: { select: { negoceId: true, livraison: true } } } }, offre: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((b) => {
      const v = vue(b);
      return v.offre && b.offre && b.lot ? { ...v, offre: { ...v.offre, livre: livreDe(b.id, b.adresseLivraison, Number(b.quantite), Number(b.offre.prixUnitaire), b.offre.prixReference, b.lot) } } : v;
    });
  }

  async proposer(tenant: TenantContext, projectId: string, p: Proposition): Promise<BesoinVue[]> {
    assertCanWrite(tenant);
    await this.ouvert(tenant);
    if (!fenetreValide(p.fenetre)) throw validationFailed("Invalid delivery window", { reason: "fenetre_invalide" });
    if (p.statut === "signe" && !p.engagement) throw validationFailed("Commitment required", { reason: "engagement_requis" });
    if (!isUuid(projectId)) throw notFound("Project");
    const project = await this.prisma.project.findFirst({ where: { id: projectId, companyId: tenant.companyId }, select: { id: true, address: true } });
    if (!project) throw notFound("Project");
    const zone = zoneDuCodePostal(project.address);
    if (!zone || !project.address) throw validationFailed("The site needs an address with a postcode", { reason: "adresse_requise" });
    const takeoff = await this.prisma.takeoff.findFirst({ where: { projectId, companyId: tenant.companyId }, orderBy: { createdAt: "desc" }, select: { id: true } });
    if (!takeoff) throw validationFailed("No materials list", { reason: "pas_de_liste" });
    const lignes = lignesProposables(await this.reviewed(tenant, takeoff.id), p.articles);
    // Section 5 : une quantité au-delà de 3 × la médiane des besoins de la même référence sur 90 jours n'entre pas.
    for (const { item, q } of lignes) {
      const p = await this.regroupement.plafond(cleDeReference({ libelle: item.label }), Number(q.quantite), { companyId: tenant.companyId });
      if (!p.admis) throw validationFailed("Quantity above the cap", { reason: "quantite_plafonnee", article: item.key, plafond: p.plafond });
    }
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      for (const { item, q, famille } of lignes) {
        const data = {
          designation: item.label,
          cle: cleDeReference({ libelle: item.label }),
          famille,
          quantite: q.quantite,
          unite: q.unite,
          zone,
          adresseLivraison: project.address!,
          fenetreTot: p.fenetre.tot,
          fenetreTard: p.fenetre.tard,
          statut: p.statut,
          signeLe: p.statut === "signe" ? now : null,
          retireLe: null,
          lotId: null,
        };
        const deja = await tx.besoin.findUnique({ where: { takeoffId_articleKey: { takeoffId: takeoff.id, articleKey: item.key } }, select: { id: true, statut: true } });
        if (deja && deja.statut !== "retire") throw new DomainError("conflict", "Already proposed", { reason: "deja_propose", article: item.key });
        if (deja) await tx.besoin.update({ where: { id: deja.id }, data });
        else await tx.besoin.create({ data: { ...data, companyId: tenant.companyId, projectId, takeoffId: takeoff.id, articleKey: item.key } });
      }
    });
    // Étape 4 : le besoin rejoint tout de suite son lot ouvert (ou en ouvre un) ; un seuil atteint forme le lot, qui part
    // aux négoces (étape 5).
    await this.regroupement.ranger();
    // Étape 8, message 1 : une notification par proposition (les quantités de la première ligne).
    const premier = await this.prisma.besoin.findFirst({ where: { takeoffId: takeoff.id, articleKey: p.articles[0]! } });
    if (premier) await this.notifications.prevenir(tenant.companyId, messageBesoinAccepte({ quantite: premier.quantite.toString(), unite: premier.unite, designation: premier.designation, zone: premier.zone, projectId }));
    await this.demande.envoyerLesLotsFormes();
    return this.besoinsDuChantier(tenant, projectId);
  }

  /** « Devis en attente » → « Chantier signé », d'un tap, avec la phrase d'engagement (section 4 d). */
  async signer(tenant: TenantContext, besoinId: string, engagement: boolean): Promise<BesoinVue> {
    assertCanWrite(tenant);
    await this.ouvert(tenant);
    if (!engagement) throw validationFailed("Commitment required", { reason: "engagement_requis" });
    const vue = await this.passer(tenant, besoinId, "signe");
    await this.regroupement.ranger();
    await this.demande.envoyerLesLotsFormes();
    return vue;
  }

  /** Retrait libre tant que la demande n'est pas partie aux négoces (section 4 a) ; ensuite, plus jamais (b). */
  async retirer(tenant: TenantContext, besoinId: string): Promise<BesoinVue> {
    assertCanWrite(tenant);
    return this.passer(tenant, besoinId, "retire");
  }

  private async passer(tenant: TenantContext, besoinId: string, vers: StatutBesoin): Promise<BesoinVue> {
    if (!isUuid(besoinId)) throw notFound("Besoin");
    const b = await this.prisma.besoin.findFirst({ where: { id: besoinId, companyId: tenant.companyId }, include: { lot: { select: { statut: true, numero: true, negoceRetenu: { select: { nom: true } } } }, offre: true } });
    if (!b) throw notFound("Besoin");
    const t = transitionBesoin(b.statut as StatutBesoin, vers, { lotParti: lotParti(b.lot?.statut) });
    if (t.ok === false) throw new DomainError("conflict", "Transition refused", { reason: t.raison });
    const now = new Date();
    const updated = await this.prisma.besoin.update({
      where: { id: b.id },
      data: { statut: vers, ...(vers === "signe" ? { signeLe: now } : {}), ...(vers === "retire" ? { retireLe: now, lotId: null } : {}) },
      include: { lot: { select: { statut: true, numero: true, negoceRetenu: { select: { nom: true } } } }, offre: true },
    });
    return vue(updated);
  }

  async ouvert(tenant: TenantContext): Promise<void> {
    const e = await this.etat(tenant);
    if (!e.eligible) throw new DomainError("forbidden", "Groupé not available for this company", { reason: "groupe_ferme", raisons: e.raisons });
  }
}

/**
 * Le prix livré d'un artisan (décision de Greg, 22 octobre) : sa quantité au prix du lot, plus sa livraison chez le
 * négoce retenu (gratuite jusqu'à X km de son dépôt, Y € au-delà) ; comparé à son prix habituel s'il l'a saisi.
 */
function livreDe(besoinId: string, adresse: string, quantite: number, prixUnitaire: number, prixReference: { toString(): string } | null, lot: { negoceRetenuId: string | null; reponses: { negoceId: string; livraison: unknown }[] }) {
  const zone = zoneDeLivraison(adresse);
  const l = livraisonDe(lot.reponses.find((r) => r.negoceId === lot.negoceRetenuId)?.livraison);
  const distanceKm = l ? (l.distances[besoinId] ?? null) : null;
  const livraison = l ? fraisDeLivraison(distanceKm, l) : null;
  return { ...prixLivre({ quantite, prixUnitaire, livraisonZone: livraison, prixHabituel: prixReference === null ? null : Number(prixReference.toString()) }), zone, distanceKm, francoKm: l?.francoKm ?? null };
}

type OffreRow = { id: string; prixUnitaire: { toString(): string }; prixReference: { toString(): string } | null; economie: { toString(): string } | null; dateLivraison: Date | null; probleme: string | null; lot: { numero: number; negoceRetenu: { nom: string } | null } };

function offreVue(o: OffreRow, besoin: { quantite: { toString(): string } }): OffreVue {
  void besoin;
  return {
    id: o.id,
    lotNumero: o.lot.numero,
    prixUnitaire: o.prixUnitaire.toString(),
    negoce: o.lot.negoceRetenu?.nom ?? "",
    dateLivraison: o.dateLivraison ? jour(o.dateLivraison) : null,
    prixReference: o.prixReference?.toString() ?? null,
    economie: o.economie?.toString() ?? null,
    probleme: o.probleme,
  };
}

type BesoinRow = { id: string; articleKey: string; designation: string; quantite: { toString(): string }; unite: string; statut: string; fenetreTot: Date; fenetreTard: Date; lot: { statut: string; numero: number; negoceRetenu: { nom: string } | null } | null; offre: Omit<OffreRow, "lot"> | null };

function vue(b: BesoinRow): BesoinVue {
  return {
    id: b.id,
    articleKey: b.articleKey,
    designation: b.designation,
    quantite: b.quantite.toString(),
    unite: b.unite,
    statut: b.statut as StatutBesoin,
    fenetre: { tot: jour(b.fenetreTot), tard: jour(b.fenetreTard) },
    lotParti: lotParti(b.lot?.statut),
    offre: b.offre && b.lot ? offreVue({ ...b.offre, lot: b.lot }, b) : null,
  };
}
