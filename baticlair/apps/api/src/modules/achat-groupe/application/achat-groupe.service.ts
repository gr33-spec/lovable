import { createHash, randomBytes } from "node:crypto";
import {
  NOM_APP,
  PHRASES_DOUTE,
  PHRASE_ACTIVITE_REFUSEE,
  PHRASE_DATE_TROP_PROCHE,
  PHRASE_NEGOCE_OBLIGATOIRE,
  SEUIL_VOLUME_MIN_DEFAUT,
  ETAPES_ACHAT_GROUPE,
  LIBELLES_REGLAGES_ALERTES,
  SANS_REPONSE_HEURES,
  commissionAchatGroupe,
  communeDe,
  computeAiCost,
  dateBesoinPossible,
  datesAchatGroupe,
  de,
  deLaPartDe,
  decisionAlerte,
  demandeNegoce,
  ecranPrevenir,
  estActiviteBatiment,
  estCommerceDeGros,
  etapeCourante,
  etatCarte,
  jaugeVolume,
  jugerOffres,
  lienSms,
  lienTel,
  lireReglageAlertes,
  microUsdToEur,
  participantSuspect,
  phraseAlerte,
  phraseDemandePartie,
  phraseRappelVeille,
  phraseResumeAlertes,
  priceTableAt,
  rattachementPropose,
  rechercherCatalogue,
  referenceStricte,
  smsPrevenir,
  uniteRepere,
  vueOffresArtisan,
  volumeMinimum,
  zoneDuCodePostal,
  famillesDuMetier,
  type OffreACompare,
  type RaisonDoute,
  type ReglageAlertes,
} from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import { DomainError, forbidden, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { NotificationsGroupeService } from "../../../platform/notifications/notifications-artisan.js";
import { bonDeCommandePdf } from "../../../platform/pdf/bon-de-commande.js";
import type { PdfReader } from "../../documents/index.js";
import type { NegoceExtractor, ReponseLue } from "../../groupe/index.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";

/**
 * L'ACHAT GROUPÉ AUTOMATIQUE (Greg, 27 octobre 2026 : « l'achat groupé devient le cœur de l'app, en automatique »).
 * - L'artisan LANCE un achat groupé (une référence stricte, sa quantité, sa commune, sa date de besoin, au moins un
 *   négoce) ou REJOINT celui de son secteur ; le même artisan qui relance la même référence ajoute sa quantité.
 * - À la CLÔTURE (date de besoin − délai de livraison − délai de réponse), chaque négoce reçoit UNE demande, de la part
 *   de SES clients seulement, avec le volume total, la référence exacte, les lieux et les dates ; il répond par un lien
 *   sans inscription (prix ou devis PDF), une seule fois.
 * - À l'ÉCHÉANCE, le code compare sur une base identique (le devis PDF est lu par l'IA, dans le budget du jour) ; une
 *   offre douteuse va à l'admin, jamais mise en avant. L'artisan voit l'offre de son négoce, la meilleure du groupe et
 *   l'économie ; il commande (bon de commande au négoce, paiement direct) ou passe au plan B (sa demande perso).
 * Jamais un nom d'artisan, jamais une commune d'un autre ; le total seulement à partir du seuil d'anonymat.
 */

const JOUR = 86_400_000;
const CLE_VOLUME_MIN = "achat-groupe:volume-min";
const MODE_AUTO = "automatique";
/** Les participations actives (comptées dans le volume). */
const ACTIFS = ["declare", "accepte"];
const OUVERT = "en_collecte";

const hacher = (jeton: string) => createHash("sha256").update(jeton).digest("hex");
const qte = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 3 }).replace(/\u202f/g, "\u00a0");
const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u202f/g, "\u00a0")} €`;
const jourFr = (d: Date) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(d);
const jourIso = (d: Date) => d.toISOString().slice(0, 10);
const nombre = (s: string | null | undefined): number | null => {
  if (!s) return null;
  const n = Number(s.replace(/[\s\u00a0\u202f€]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export type NegoceAjoute = { supplierId: string } | { negoceId: string } | { nom: string; email: string; telephone?: string | null };

export interface Lancement {
  designation: string;
  quantite: number;
  unite: string;
  livraison: string;
  dateBesoin: Date;
  negoces: NegoceAjoute[];
  projectId?: string | null;
  articleKey?: string | null;
}

export interface ReglagesAchatGroupe {
  webAppUrl: string;
  emailDomaine: string | null;
  delaiLivraisonJours: number;
  delaiReponseJours: number;
  alertesJour: number;
  commissionDefaut: number;
  commissionLancement: number | null;
  commissionLancementPremiers: number;
  budgetIaJourEur: number;
  usdToEur: string;
  seuilAnonymat: number;
  seuilVolumeMin: Record<string, number> | null;
  prixReperes: Record<string, number>;
  familles: string[];
}

export interface ReponseNegoceAchat {
  accepteConditions: boolean;
  prixUnitaireHt: number | null;
  delaiJours: number | null;
  commentaire: string | null;
  pdf: { nom: string; contenuBase64: string } | null;
}

/** Les briques des autres modules, branchées par le module (pas d'import d'un module voisin hors de son index). */
export interface PortsAchatGroupe {
  zoneDe(companyId: string): Promise<string | null>;
  exigerZone(companyId: string, zone: string): Promise<void>;
  abonne(companyId: string): Promise<boolean>;
  dernierPrixPour(companyId: string): Promise<(cle: string, unite: string) => number | null>;
  /** L'adresse Mobiiz (sans étiquette) de l'entreprise : le Reply-To de la demande au négoce. */
  adresseMobiiz(companyId: string): Promise<string | null>;
  mode(): Promise<string>;
  /** Le plan B : une liste d'une ligne, validée, puis la demande perso à ses négoces. */
  envoyerEnPerso(tenant: TenantContext, d: { nom: string; adresse: string; ligne: { designation: string; quantite: number; unite: string }; supplierIds: string[]; dateBesoin: Date }): Promise<{ projectId: string; demandeId: string }>;
  lignesDeListe(tenant: TenantContext, projectId: string): Promise<{ adresse: string | null; lignes: { key: string; designation: string; quantite: number; unite: string }[] }>;
  observatoire(e: { sourceId: string; departement: string; designation: string; unite: string; quantite: number; prixHt: number }): Promise<unknown>;
}

export class AchatGroupeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ports: PortsAchatGroupe,
    private readonly notifs: Pick<NotificationsGroupeService, "prevenir" | "lienVers">,
    private readonly mailer: TransactionalEmailSender,
    private readonly extracteur: NegoceExtractor | null,
    private readonly pdf: PdfReader | null,
    private readonly cfg: ReglagesAchatGroupe,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /* ------------------------------------------------------------------------------------------------- réglages */

  /** Le volume minimum de chaque famille (€ HT estimés) : réglage de l'admin, sinon `SEUIL_VOLUME_MIN`, sinon défaut. */
  async volumesMin(): Promise<Record<string, number>> {
    const p = await this.prisma.parametreGroupe.findUnique({ where: { cle: CLE_VOLUME_MIN } });
    const admin = p && typeof p.valeur === "object" && p.valeur ? (p.valeur as Record<string, number>) : {};
    return { ...(SEUIL_VOLUME_MIN_DEFAUT as Record<string, number>), ...(this.cfg.seuilVolumeMin ?? {}), ...admin };
  }

  async changerVolumeMin(famille: string, montantHt: number): Promise<Record<string, number>> {
    const p = await this.prisma.parametreGroupe.findUnique({ where: { cle: CLE_VOLUME_MIN } });
    const valeur = { ...((p?.valeur as Record<string, number> | null) ?? {}), [famille]: montantHt };
    await this.prisma.parametreGroupe.upsert({ where: { cle: CLE_VOLUME_MIN }, create: { cle: CLE_VOLUME_MIN, valeur }, update: { valeur } });
    return this.volumesMin();
  }

  private async exigerAutomatique(): Promise<void> {
    if ((await this.ports.mode()) !== MODE_AUTO) throw new DomainError("conflict", "Automatic group buying is off", { reason: "mode_humain" });
  }

  /** SIRET vérifié et activité du bâtiment (anti-fraude, point 9). */
  private async exigerEntreprise(companyId: string): Promise<{ name: string; trades: string[] }> {
    const c = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true, siretVerifieLe: true, naf: true, trades: true } });
    if (c.naf && (estCommerceDeGros(c.naf) || !estActiviteBatiment(c.naf))) throw new DomainError("forbidden", PHRASE_ACTIVITE_REFUSEE, { reason: "activite_refusee", message: PHRASE_ACTIVITE_REFUSEE });
    if (!c.siretVerifieLe) throw new DomainError("forbidden", "Verified SIRET required", { reason: "siret_requis", message: "Vérifie ton SIRET dans ton profil pour lancer ou rejoindre un achat groupé." });
    return c;
  }

  /* ---------------------------------------------------------------------------------------------- le catalogue */

  catalogue(q: string) {
    return { references: rechercherCatalogue(q).map((e) => ({ designation: e.designation, unite: e.unite })) };
  }

  /** Les négoces proposés : ses habituels (carnet), puis les négoces inscrits du département (recherche nom ou SIRET). */
  async negoces(tenant: TenantContext, q: string) {
    const t = q.trim();
    const siret = t.replace(/\s/g, "");
    const habituels = await this.prisma.supplier.findMany({
      where: { companyId: tenant.companyId, archivedAt: null, ...(t ? { name: { contains: t, mode: "insensitive" as const } } : {}) },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
      take: 20,
    });
    const zone = await this.ports.zoneDe(tenant.companyId);
    const inscrits = t
      ? await this.prisma.negoce.findMany({
          where: { stopLe: null, OR: [{ nom: { contains: t, mode: "insensitive" } }, ...(/^\d{9,14}$/.test(siret) ? [{ siret: { startsWith: siret } }] : [])] },
          select: { id: true, nom: true, departement: true },
          orderBy: { nom: "asc" },
          take: 20,
        })
      : zone
        ? await this.prisma.negoce.findMany({ where: { stopLe: null, departement: zone }, select: { id: true, nom: true, departement: true }, orderBy: { nom: "asc" }, take: 20 })
        : [];
    return { habituels: habituels.map((h) => ({ supplierId: h.id, nom: h.name, telephone: h.phone })), inscrits: inscrits.map((n) => ({ negoceId: n.id, nom: n.nom, departement: n.departement })) };
  }

  /* -------------------------------------------------------------------------------------- lancer et rejoindre */

  /** Lancer un achat groupé, ou rejoindre celui qui existe déjà pour la même référence dans le secteur. */
  async lancer(tenant: TenantContext, l: Lancement, achatVise: string | null = null) {
    assertCanWrite(tenant);
    await this.exigerAutomatique();
    await this.exigerEntreprise(tenant.companyId);
    if (l.negoces.length === 0) throw validationFailed(PHRASE_NEGOCE_OBLIGATOIRE, { reason: "negoce_obligatoire", message: PHRASE_NEGOCE_OBLIGATOIRE });
    const ref = referenceStricte(l.designation);
    if (!ref.ok || !this.cfg.familles.includes(ref.reference.famille))
      throw validationFailed("Reference not precise enough", { reason: "reference_imprecise", message: "Référence pas assez précise pour un achat groupé (format, épaisseur, origine…) : choisis-la dans le catalogue ou envoie-la à tes négoces." });
    if (!(l.quantite > 0)) throw validationFailed("Quantity required", { reason: "quantite_requise" });
    const maintenant = this.now();
    if (!dateBesoinPossible(l.dateBesoin, maintenant, this.cfg.delaiLivraisonJours, this.cfg.delaiReponseJours)) throw validationFailed(PHRASE_DATE_TROP_PROCHE, { reason: "date_trop_proche", message: PHRASE_DATE_TROP_PROCHE });
    const departement = zoneDuCodePostal(l.livraison);
    if (!departement) throw validationFailed("A delivery town with a postcode is required", { reason: "livraison_requise", message: "Indique la commune de livraison avec son code postal." });
    await this.ports.exigerZone(tenant.companyId, departement);
    const negoces = await Promise.all(l.negoces.map((n) => this.negoceDe(tenant, n)));
    const cle = ref.reference.cle;

    // Précision 4 : le même artisan qui relance la même référence dans le même achat groupé ajoute sa quantité.
    const mien = await this.prisma.besoinNegocie.findFirst({
      where: { companyId: tenant.companyId, cle, departement, statut: "declare", regroupement: { mode: MODE_AUTO, statut: OUVERT, clotureLe: { gt: maintenant } } },
      orderBy: { createdAt: "asc" },
    });
    if (mien && (!achatVise || mien.regroupementId === achatVise)) {
      await this.prisma.besoinNegocie.update({ where: { id: mien.id }, data: { quantite: Number(mien.quantite) + l.quantite } });
      await this.ajouterNegoces(mien.id, mien.regroupementId!, tenant.companyId, negoces);
      return { besoinId: mien.id, achatId: mien.regroupementId!, ajoute: true, rejoint: false, ...(await this.ecranPrevenir(tenant, mien.id)) };
    }

    const dates = datesAchatGroupe(l.dateBesoin, this.cfg.delaiLivraisonJours, this.cfg.delaiReponseJours);
    let achat = achatVise
      ? await this.prisma.regroupementNegocie.findFirst({ where: { id: achatVise, mode: MODE_AUTO, statut: OUVERT, clotureLe: { gt: maintenant }, cle, departement } })
      : await this.achatCompatible(cle, departement, l.dateBesoin, dates.clotureLe, maintenant);
    if (achatVise && !achat) throw new DomainError("conflict", "This group purchase is closed", { reason: "achat_clos", message: "Cet achat groupé est clos : lance le tien." });
    let cree = false;
    if (!achat) {
      achat = await this.prisma.regroupementNegocie.create({
        data: { mode: MODE_AUTO, cle, libelle: ref.reference.libelle, famille: ref.reference.famille, departement, unite: l.unite, dateBesoinMin: l.dateBesoin, clotureLe: dates.clotureLe, reponseAvantLe: dates.reponseAvantLe },
      });
      cree = true;
    } else if (achat.dateBesoinMin && l.dateBesoin < achat.dateBesoinMin) {
      achat = await this.prisma.regroupementNegocie.update({ where: { id: achat.id }, data: { dateBesoinMin: l.dateBesoin } });
    }
    const besoin = await this.prisma.besoinNegocie.create({
      data: {
        companyId: tenant.companyId,
        projectId: l.projectId ?? null,
        articleKey: l.articleKey ?? null,
        designation: l.designation,
        cle,
        famille: ref.reference.famille,
        quantite: l.quantite,
        unite: l.unite,
        departement,
        livraison: l.livraison,
        dateBesoin: l.dateBesoin,
        statut: "declare",
        regroupementId: achat.id,
      },
    });
    await this.ajouterNegoces(besoin.id, achat.id, tenant.companyId, negoces);
    if (cree) await this.alerter(achat.id, tenant.companyId).catch(() => undefined);
    return { besoinId: besoin.id, achatId: achat.id, ajoute: false, rejoint: !cree, ...(await this.ecranPrevenir(tenant, besoin.id)) };
  }

  /**
   * L'achat ouvert compatible : même référence stricte, même département, clôture pas avant la sienne (personne ne voit
   * sa date avancer), date de besoin au plus 30 jours après la plus proche du groupe.
   */
  private async achatCompatible(cle: string, departement: string, dateBesoin: Date, cloture: Date, maintenant: Date) {
    const ouverts = await this.prisma.regroupementNegocie.findMany({ where: { mode: MODE_AUTO, statut: OUVERT, cle, departement, clotureLe: { gt: maintenant } }, orderBy: { createdAt: "asc" } });
    return ouverts.find((a) => a.clotureLe! <= cloture && (!a.dateBesoinMin || dateBesoin.getTime() <= a.dateBesoinMin.getTime() + 30 * JOUR)) ?? null;
  }

  /** « Rejoindre » depuis une carte ou une alerte : la référence de l'achat, sa quantité, sa commune, ses négoces. */
  async rejoindre(tenant: TenantContext, achatId: string, d: Omit<Lancement, "designation" | "unite">) {
    if (!isUuid(achatId)) throw notFound("AchatGroupe");
    const a = await this.prisma.regroupementNegocie.findFirst({ where: { id: achatId, mode: MODE_AUTO }, include: { besoins: { select: { designation: true, unite: true }, orderBy: { createdAt: "asc" }, take: 1 } } });
    if (!a) throw notFound("AchatGroupe");
    const modele = a.besoins[0];
    return this.lancer(tenant, { ...d, designation: modele?.designation ?? a.libelle, unite: modele?.unite ?? a.unite ?? "" }, a.id);
  }

  /** Un négoce choisi : dans le carnet de l'artisan (créé une fois par e-mail). */
  private async negoceDe(tenant: TenantContext, n: NegoceAjoute): Promise<{ supplierId: string; nom: string; email: string; telephone: string | null; siret: string | null }> {
    if ("supplierId" in n) {
      const s = await this.prisma.supplier.findFirst({ where: { id: n.supplierId, companyId: tenant.companyId, archivedAt: null }, select: { id: true, name: true, email: true, phone: true, negoceId: true } });
      if (!s) throw notFound("Supplier");
      const siret = s.negoceId ? ((await this.prisma.negoce.findUnique({ where: { id: s.negoceId }, select: { siret: true } }))?.siret ?? null) : null;
      return { supplierId: s.id, nom: s.name, email: s.email.toLowerCase(), telephone: s.phone, siret };
    }
    const cible =
      "negoceId" in n
        ? await this.prisma.negoce.findFirst({ where: { id: n.negoceId, stopLe: null }, select: { id: true, nom: true, email: true, siret: true } })
        : { id: null, nom: n.nom.trim(), email: n.email.trim().toLowerCase(), siret: null };
    if (!cible) throw notFound("Negoce");
    const telephone = "telephone" in n ? (n.telephone?.trim() ?? null) || null : null;
    const existant = await this.prisma.supplier.findFirst({ where: { companyId: tenant.companyId, archivedAt: null, email: { equals: cible.email, mode: "insensitive" } }, select: { id: true, name: true, phone: true } });
    const s = existant ?? (await this.prisma.supplier.create({ data: { companyId: tenant.companyId, name: cible.nom, email: cible.email, phone: telephone, ...(cible.id ? { negoceId: cible.id } : {}) }, select: { id: true, name: true, phone: true } }));
    if (existant && telephone && !existant.phone) await this.prisma.supplier.update({ where: { id: existant.id }, data: { phone: telephone } });
    return { supplierId: s.id, nom: s.name, email: cible.email.toLowerCase(), telephone: s.phone ?? telephone, siret: cible.siret };
  }

  private async ajouterNegoces(besoinId: string, regroupementId: string, companyId: string, negoces: readonly { supplierId: string; nom: string; email: string; telephone: string | null; siret: string | null }[]) {
    for (const n of negoces) {
      await this.prisma.negoceParticipant.upsert({
        where: { besoinId_email: { besoinId, email: n.email } },
        create: { besoinId, regroupementId, companyId, supplierId: n.supplierId, nom: n.nom, email: n.email, telephone: n.telephone, siret: n.siret },
        update: { nom: n.nom, telephone: n.telephone ?? undefined },
      });
    }
  }

  /* ---------------------------------------------------------------------------------- « Préviens ton négoce » */

  async ecranPrevenir(tenant: TenantContext, besoinId: string) {
    const b = await this.monBesoin(tenant, besoinId);
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: b.regroupementId! } });
    const user = await this.prisma.user.findUnique({ where: { id: tenant.userId }, select: { name: true } });
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { name: true } });
    const total = await this.quantiteTotale(a.id);
    const volume = `${qte(total)} ${a.unite ?? b.unite}`;
    const sms = smsPrevenir({ libelle: a.libelle, clotureLe: a.clotureLe!, prenom: (user?.name ?? "").trim().split(/\s+/)[0] ?? "", entreprise: company.name });
    const negoces = await this.prisma.negoceParticipant.findMany({ where: { besoinId: b.id }, orderBy: { createdAt: "asc" } });
    return {
      prevenir: {
        titre: "Préviens ton négoce",
        texte: ecranPrevenir({ volumeTotal: volume, libelle: a.libelle, clotureLe: a.clotureLe! }),
        sms,
        negoces: negoces.map((n) => ({ id: n.id, nom: n.nom, telephone: n.telephone, tel: n.telephone ? lienTel(n.telephone) : null, smsLien: lienSms(n.telephone, sms), prevenu: !!n.prevenuLe })),
      },
    };
  }

  /** « Je l'ai prévenu » : plus de rappel la veille pour ce négoce. */
  async prevenu(tenant: TenantContext, participantId: string) {
    assertCanWrite(tenant);
    if (!isUuid(participantId)) throw notFound("Negoce");
    const n = await this.prisma.negoceParticipant.findFirst({ where: { id: participantId, companyId: tenant.companyId } });
    if (!n) throw notFound("Negoce");
    await this.prisma.negoceParticipant.update({ where: { id: n.id }, data: { prevenuLe: this.now() } });
    if (n.supplierId) await this.prisma.supplier.updateMany({ where: { id: n.supplierId, companyId: tenant.companyId }, data: { prevenuLe: this.now() } });
    return { fait: true };
  }

  /* ------------------------------------------------------------------------------- modifier, retirer, se désister */

  private async monBesoin(tenant: TenantContext, besoinId: string) {
    if (!isUuid(besoinId)) throw notFound("Besoin");
    const b = await this.prisma.besoinNegocie.findFirst({ where: { id: besoinId, companyId: tenant.companyId, regroupement: { mode: MODE_AUTO } } });
    if (!b?.regroupementId) throw notFound("Besoin");
    return b;
  }

  private async avantCloture(regroupementId: string) {
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: regroupementId } });
    if (a.statut !== OUVERT || !a.clotureLe || a.clotureLe <= this.now()) throw new DomainError("conflict", "Registrations are closed", { reason: "cloture_passee", message: "Les inscriptions sont closes : tu peux te désister." });
    return a;
  }

  async modifier(tenant: TenantContext, besoinId: string, d: { quantite?: number; livraison?: string; negoces?: NegoceAjoute[] }) {
    assertCanWrite(tenant);
    const b = await this.monBesoin(tenant, besoinId);
    if (b.statut !== "declare") throw new DomainError("conflict", "Not open", { reason: "besoin_ferme" });
    await this.avantCloture(b.regroupementId!);
    const data: { quantite?: number; livraison?: string } = {};
    if (d.quantite !== undefined) data.quantite = d.quantite;
    if (d.livraison !== undefined) {
      if (zoneDuCodePostal(d.livraison) !== b.departement) throw validationFailed("Same department only", { reason: "autre_departement", message: "La livraison doit rester dans le même département." });
      data.livraison = d.livraison;
    }
    await this.prisma.besoinNegocie.update({ where: { id: b.id }, data });
    if (d.negoces?.length) await this.ajouterNegoces(b.id, b.regroupementId!, tenant.companyId, await Promise.all(d.negoces.map((n) => this.negoceDe(tenant, n))));
    return this.detail(tenant, b.id);
  }

  /** Retirer un négoce de sa participation (au moins un doit rester, précision 1). */
  async retirerNegoce(tenant: TenantContext, besoinId: string, participantId: string) {
    assertCanWrite(tenant);
    const b = await this.monBesoin(tenant, besoinId);
    await this.avantCloture(b.regroupementId!);
    const n = await this.prisma.negoceParticipant.count({ where: { besoinId: b.id } });
    if (n <= 1) throw validationFailed(PHRASE_NEGOCE_OBLIGATOIRE, { reason: "negoce_obligatoire", message: PHRASE_NEGOCE_OBLIGATOIRE });
    await this.prisma.negoceParticipant.deleteMany({ where: { id: participantId, besoinId: b.id } });
    return this.detail(tenant, b.id);
  }

  /** Avant la clôture : « Retirer » (avec confirmation à l'écran). */
  async retirer(tenant: TenantContext, besoinId: string) {
    assertCanWrite(tenant);
    const b = await this.monBesoin(tenant, besoinId);
    if (b.statut !== "declare") throw new DomainError("conflict", "Not open", { reason: "besoin_ferme" });
    await this.avantCloture(b.regroupementId!);
    await this.prisma.$transaction([
      this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { statut: "retire" } }),
      this.prisma.desistementAchatGroupe.create({ data: { besoinId: b.id, companyId: tenant.companyId, regroupementId: b.regroupementId!, quantite: b.quantite, apresCloture: false } }),
    ]);
    return { fait: true };
  }

  /** Après la clôture : « Me désister » (noté pour l'admin ; l'offre du négoce reste ferme, précision 4). */
  async desister(tenant: TenantContext, besoinId: string, raison: string | null) {
    assertCanWrite(tenant);
    const b = await this.monBesoin(tenant, besoinId);
    if (b.statut !== "declare") throw new DomainError("conflict", "Not open", { reason: "besoin_ferme" });
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: b.regroupementId! } });
    if (a.statut === OUVERT && a.clotureLe && a.clotureLe > this.now()) throw new DomainError("conflict", "Still open: withdraw instead", { reason: "avant_cloture" });
    await this.prisma.$transaction([
      this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { statut: "desiste", desisteLe: this.now() } }),
      this.prisma.desistementAchatGroupe.create({ data: { besoinId: b.id, companyId: tenant.companyId, regroupementId: a.id, quantite: b.quantite, apresCloture: true, raison } }),
    ]);
    return { fait: true };
  }

  /* -------------------------------------------------------------------------------------------- les vues */

  private async quantiteTotale(regroupementId: string): Promise<number> {
    const r = await this.prisma.besoinNegocie.aggregate({ where: { regroupementId, statut: { in: ACTIFS } }, _sum: { quantite: true } });
    return Number(r._sum.quantite ?? 0);
  }

  /** Le volume estimé (€ HT) : prix repère de la référence, sinon le dernier prix de chaque participant ; null sans prix. */
  private async volumeEstime(a: { id: string; cle: string; libelle: string }): Promise<{ estimeHt: number | null; entreprises: number; total: number }> {
    const besoins = await this.prisma.besoinNegocie.findMany({ where: { regroupementId: a.id, statut: { in: ACTIFS } }, select: { companyId: true, quantite: true, unite: true, designation: true } });
    const entreprises = new Set(besoins.map((b) => b.companyId)).size;
    const total = besoins.reduce((s, b) => s + Number(b.quantite), 0);
    let estime = 0;
    for (const b of besoins) {
      const r = referenceStricte(b.designation);
      const unite = uniteRepere(b.unite);
      const repere = r.ok ? (this.cfg.prixReperes[`${r.reference.type}:${unite}`] ?? null) : null;
      const pu = repere ?? (await this.ports.dernierPrixPour(b.companyId))(a.cle, unite);
      if (pu === null) return { estimeHt: null, entreprises, total };
      estime += pu * Number(b.quantite);
    }
    return { estimeHt: Math.round(estime * 100) / 100, entreprises, total };
  }

  private async carte(tenant: TenantContext, besoinId: string, volumes: Record<string, number>) {
    const b = await this.prisma.besoinNegocie.findUniqueOrThrow({ where: { id: besoinId }, include: { negoces: { orderBy: { createdAt: "asc" } } } });
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: b.regroupementId! } });
    const v = await this.volumeEstime(a);
    const unite = a.unite ?? b.unite;
    const etat = etatCarte(
      { statut: a.statut, clotureLe: a.clotureLe, reponseAvantLe: a.reponseAvantLe, entreprises: v.entreprises, total: v.entreprises >= this.cfg.seuilAnonymat ? `${qte(v.total)} ${unite}` : null },
      { statut: b.statut },
      this.cfg.seuilAnonymat,
    );
    const ouvert = a.statut === OUVERT && !!a.clotureLe && a.clotureLe > this.now();
    const jauge = a.statut === OUVERT ? jaugeVolume(v.estimeHt, volumeMinimum(a.famille, volumes), v.entreprises, this.cfg.seuilAnonymat) : null;
    return {
      id: b.id,
      achatId: a.id,
      libelle: a.libelle,
      quantite: Number(b.quantite),
      unite: b.unite,
      ...etat,
      jauge,
      commune: communeDe(b.livraison) ?? b.livraison,
      dateBesoin: jourIso(b.dateBesoin),
      clotureLe: a.clotureLe?.toISOString() ?? null,
      reponseAvantLe: a.reponseAvantLe?.toISOString() ?? null,
      actions: {
        modifier: ouvert && b.statut === "declare",
        retirer: ouvert && b.statut === "declare",
        desister: !ouvert && b.statut === "declare" && ["consultation", "offre_recue", OUVERT].includes(a.statut),
        planB: a.statut === "pas_assez" && b.statut === "declare",
        commander: a.statut === "offre_recue" && b.statut === "declare",
      },
      negoces: b.negoces.map((n) => ({ id: n.id, nom: n.nom, telephone: n.telephone, prevenu: !!n.prevenuLe, parti: !!n.partiLe })),
      bonNumero: b.bonNumero,
      _a: a,
      _b: b,
    };
  }

  /** « Mes achats groupés » : une carte par participation, la plus récente d'abord. */
  async mesAchats(tenant: TenantContext) {
    const besoins = await this.prisma.besoinNegocie.findMany({ where: { companyId: tenant.companyId, regroupement: { mode: MODE_AUTO }, statut: { not: "perso" } }, select: { id: true }, orderBy: { createdAt: "desc" }, take: 100 });
    const volumes = await this.volumesMin();
    const cartes = [];
    for (const b of besoins) {
      const { _a, _b, ...c } = await this.carte(tenant, b.id, volumes);
      void _a;
      void _b;
      cartes.push(c);
    }
    const reglage = (await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { alertesAchatsGroupes: true } }))?.alertesAchatsGroupes;
    return { mode: await this.ports.mode(), achats: cartes, alertes: lireReglageAlertes(reglage) };
  }

  /** Le détail d'une participation : la frise, la commune, le dernier prix, les négoces, les offres. */
  async detail(tenant: TenantContext, besoinId: string) {
    await this.monBesoin(tenant, besoinId);
    const { _a: a, _b: b, ...c } = await this.carte(tenant, besoinId, await this.volumesMin());
    const dernier = (await this.ports.dernierPrixPour(tenant.companyId))(a.cle, uniteRepere(b.unite));
    return {
      ...c,
      frise: { etapes: ETAPES_ACHAT_GROUPE, courante: etapeCourante(a.statut, b.statut) },
      dernierPrix: dernier !== null ? `Ton dernier prix : ${euros(dernier)} HT / ${b.unite}` : null,
      invite: `Un collègue commande aussi ${de(a.libelle).replace(/^d(e |')/, (m) => (m === "de " ? "des " : "de l'"))} ? Invite-le`,
      offres: a.statut === "offre_recue" || b.statut === "accepte" ? await this.offresPour(tenant, a, b) : null,
    };
  }

  /** Point 5 : l'offre de ses négoces, la meilleure du groupe (nom selon les droits), l'économie en euros. */
  private async offresPour(tenant: TenantContext, a: { id: string; meilleureId: string | null }, b: { id: string; quantite: unknown }) {
    const consultations = await this.prisma.consultationAchatGroupe.findMany({ where: { regroupementId: a.id }, select: { id: true, nom: true, email: true, prixUnitaireHt: true, statut: true } });
    const mesEmails = new Set((await this.prisma.negoceParticipant.findMany({ where: { besoinId: b.id }, select: { email: true } })).map((n) => n.email));
    const miennes = consultations.filter((c) => mesEmails.has(c.email));
    const m = a.meilleureId ? consultations.find((c) => c.id === a.meilleureId && c.statut === "valide") : null;
    const quantite = Number(b.quantite);
    const abonne = await this.ports.abonne(tenant.companyId);
    const vue = vueOffresArtisan({
      quantite,
      mesNegoces: miennes.map((c) => ({ nom: c.nom, prixUnitaireHt: c.prixUnitaireHt === null ? null : Number(c.prixUnitaireHt), valide: c.statut === "valide" })),
      meilleure: m ? { nom: m.nom, prixUnitaireHt: Number(m.prixUnitaireHt), estUnDesMiens: mesEmails.has(m.email) } : null,
      abonne,
    });
    const mienne = miennes.filter((c) => c.statut === "valide" && c.prixUnitaireHt !== null).sort((x, y) => Number(x.prixUnitaireHt) - Number(y.prixUnitaireHt))[0];
    return {
      mien: vue.mien ? { ...vue.mien, consultationId: mienne?.id ?? null, prixUnitaireHt: mienne ? Number(mienne.prixUnitaireHt) : null } : null,
      meilleure: vue.meilleure ? { nom: vue.meilleure.nom ?? "un négoce du secteur", nomVisible: vue.meilleure.nom !== null, totalHt: vue.meilleure.totalHt, prixUnitaireHt: vue.meilleure.prixUnitaireHt, consultationId: vue.meilleure.nom !== null ? (m?.id ?? null) : null } : null,
      economieHt: vue.economieHt,
      enAttente: miennes.filter((c) => c.statut !== "valide").map((c) => ({ nom: c.nom, raison: c.statut === "envoyee" ? "Pas de réponse" : "Offre en vérification" })),
    };
  }

  /** « Achats groupés près de chez toi » : les achats ouverts de son département, de son métier, qu'il n'a pas rejoints. */
  async presDeChezMoi(tenant: TenantContext) {
    const zone = await this.ports.zoneDe(tenant.companyId);
    if (!zone || (await this.ports.mode()) !== MODE_AUTO) return { zone, achats: [] };
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { trades: true } });
    const familles = new Set(company.trades.flatMap((t) => famillesDuMetier(t)));
    const ouverts = await this.prisma.regroupementNegocie.findMany({ where: { mode: MODE_AUTO, statut: OUVERT, departement: zone, clotureLe: { gt: this.now() } }, orderBy: { clotureLe: "asc" }, take: 30 });
    const miens = new Set((await this.prisma.besoinNegocie.findMany({ where: { companyId: tenant.companyId, regroupementId: { in: ouverts.map((o) => o.id) }, statut: { in: ACTIFS } }, select: { regroupementId: true } })).map((b) => b.regroupementId));
    const volumes = await this.volumesMin();
    const achats = [];
    for (const a of ouverts.filter((o) => !miens.has(o.id) && (familles.size === 0 || familles.has(o.famille as never)))) {
      const v = await this.volumeEstime(a);
      if (v.entreprises === 0) continue;
      achats.push({
        id: a.id,
        libelle: a.libelle,
        unite: a.unite,
        zone,
        dateBesoin: a.dateBesoinMin ? jourIso(a.dateBesoinMin) : null,
        clotureLe: a.clotureLe!.toISOString(),
        phrase: phraseAlerte({ libelle: a.libelle, dateBesoin: a.dateBesoinMin ?? a.clotureLe!, zone, clotureLe: a.clotureLe! }),
        entreprises: v.entreprises >= this.cfg.seuilAnonymat ? v.entreprises : null,
        jauge: jaugeVolume(v.estimeHt, volumeMinimum(a.famille, volumes), v.entreprises, this.cfg.seuilAnonymat),
      });
    }
    return { zone, achats };
  }

  /* ----------------------------------------------------------------- « Acheter en groupe » depuis une liste */

  /** Précision 2 : chaque ligne d'une liste reçoit sa question de rattachement, ou reste en demande perso. */
  async depuisListe(tenant: TenantContext, projectId: string) {
    const { adresse, lignes } = await this.ports.lignesDeListe(tenant, projectId);
    return {
      adresse,
      lignes: lignes.map((l) => {
        const r = rattachementPropose(l.designation);
        const groupable = !!r && this.cfg.familles.includes(r.famille);
        return { key: l.key, designation: l.designation, quantite: l.quantite, unite: l.unite, reference: groupable ? r!.libelle : null, question: groupable ? r!.question : null };
      }),
    };
  }

  /** Les lignes confirmées d'un tap rejoignent (ou lancent) leur achat groupé ; les autres restent en demande perso. */
  async lancerDepuisListe(tenant: TenantContext, projectId: string, d: { confirmees: string[]; dateBesoin: Date; livraison: string | null; negoces: NegoceAjoute[] }) {
    if (d.negoces.length === 0) throw validationFailed(PHRASE_NEGOCE_OBLIGATOIRE, { reason: "negoce_obligatoire", message: PHRASE_NEGOCE_OBLIGATOIRE });
    const { adresse, lignes } = await this.ports.lignesDeListe(tenant, projectId);
    const livraison = d.livraison ?? adresse;
    if (!livraison) throw validationFailed("A delivery town with a postcode is required", { reason: "livraison_requise", message: "Indique la commune de livraison avec son code postal." });
    const lancees = [];
    const perso = [];
    for (const l of lignes) {
      const r = rattachementPropose(l.designation);
      if (!d.confirmees.includes(l.key) || !r || !this.cfg.familles.includes(r.famille)) {
        perso.push({ key: l.key, designation: l.designation });
        continue;
      }
      const res = await this.lancer(tenant, { designation: l.designation, quantite: l.quantite, unite: l.unite, livraison, dateBesoin: d.dateBesoin, negoces: d.negoces, projectId, articleKey: l.key });
      lancees.push({ key: l.key, besoinId: res.besoinId, achatId: res.achatId, rejoint: res.rejoint });
    }
    if (lancees.length === 0) throw validationFailed("Nothing confirmed", { reason: "rien_a_lancer", message: "Confirme au moins une ligne pour l'acheter en groupe." });
    return { lancees, perso };
  }

  /* ------------------------------------------------------------------------------------------ les alertes */

  async reglageAlertes(tenant: TenantContext) {
    const c = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { alertesAchatsGroupes: true } });
    return { reglage: lireReglageAlertes(c.alertesAchatsGroupes), choix: Object.entries(LIBELLES_REGLAGES_ALERTES).map(([valeur, libelle]) => ({ valeur, libelle })) };
  }

  async changerAlertes(tenant: TenantContext, reglage: ReglageAlertes) {
    assertCanWrite(tenant);
    await this.prisma.company.update({ where: { id: tenant.companyId }, data: { alertesAchatsGroupes: reglage } });
    return this.reglageAlertes(tenant);
  }

  /**
   * Point 2 : un nouvel achat groupé prévient les artisans du même métier et du même secteur (notification + e-mail),
   * au plus N par jour ; au-delà, ou réglage « résumé », il attend le résumé du jour.
   */
  private async alerter(regroupementId: string, lanceur: string) {
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: regroupementId } });
    const maintenant = this.now();
    const jour = new Date(`${jourIso(maintenant)}T00:00:00Z`);
    const candidats = await this.prisma.company.findMany({ where: { id: { not: lanceur }, address: { contains: a.departement.slice(0, 2) } }, select: { id: true, address: true, trades: true, alertesAchatsGroupes: true } });
    let n = 0;
    for (const c of candidats) {
      if (zoneDuCodePostal(c.address) !== a.departement) continue;
      const familles = c.trades.flatMap((t) => famillesDuMetier(t));
      if (familles.length && !familles.includes(a.famille as never)) continue;
      const envoyees = await this.prisma.alerteAchatGroupe.count({ where: { companyId: c.id, jour, envoyeeLe: { not: null }, resume: false } });
      const decision = decisionAlerte(lireReglageAlertes(c.alertesAchatsGroupes), envoyees, this.cfg.alertesJour);
      if (decision === "rien") continue;
      const deja = await this.prisma.alerteAchatGroupe.findUnique({ where: { companyId_regroupementId: { companyId: c.id, regroupementId } } });
      if (deja) continue;
      if (decision === "resume") {
        await this.prisma.alerteAchatGroupe.create({ data: { companyId: c.id, regroupementId, jour, resume: true } });
        continue;
      }
      await this.prisma.alerteAchatGroupe.create({ data: { companyId: c.id, regroupementId, jour, envoyeeLe: maintenant } });
      const phrase = phraseAlerte({ libelle: a.libelle, dateBesoin: a.dateBesoinMin ?? a.clotureLe!, zone: a.departement, clotureLe: a.clotureLe! });
      const url = `/achats-groupes/lancer?rejoindre=${a.id}`;
      await this.notifs.prevenir(c.id, { titre: "Nouvel achat groupé", corps: phrase, url, etiquette: `achat-${a.id}` }, { objet: `Nouvel achat groupé : ${a.libelle}`, texte: `${phrase}\n\nRejoindre : ${this.notifs.lienVers(url)}\n\n${NOM_APP}` }).catch(() => undefined);
      n++;
    }
    return n;
  }

  /** Le résumé du jour : les alertes en attente, en une seule notification par entreprise. */
  private async resumes(maintenant: Date): Promise<number> {
    const attente = await this.prisma.alerteAchatGroupe.findMany({ where: { resume: true, envoyeeLe: null }, include: { regroupement: true } });
    const parEntreprise = new Map<string, typeof attente>();
    for (const x of attente) parEntreprise.set(x.companyId, [...(parEntreprise.get(x.companyId) ?? []), x]);
    let n = 0;
    for (const [companyId, alertes] of parEntreprise) {
      const ouvertes = alertes.filter((x) => x.regroupement.statut === OUVERT && x.regroupement.clotureLe && x.regroupement.clotureLe > maintenant);
      await this.prisma.alerteAchatGroupe.updateMany({ where: { id: { in: alertes.map((x) => x.id) } }, data: { envoyeeLe: maintenant } });
      if (!ouvertes.length) continue;
      const phrase = phraseResumeAlertes(ouvertes.map((x) => ({ libelle: x.regroupement.libelle, zone: x.regroupement.departement, clotureLe: x.regroupement.clotureLe! })));
      await this.notifs.prevenir(companyId, { titre: "Achats groupés près de chez toi", corps: phrase, url: "/achats-groupes", etiquette: "achats-resume" }, { objet: "Achats groupés près de chez toi", texte: `${phrase}\n\n${this.notifs.lienVers("/achats-groupes")}\n\n${NOM_APP}` }).catch(() => undefined);
      n++;
    }
    return n;
  }

  /* -------------------------------------------------------------------------------- la tâche du jour (cron) */

  async tache(maintenant = this.now()) {
    const rappels = await this.rappelsVeille(maintenant);
    const closes = await this.prisma.regroupementNegocie.findMany({ where: { mode: MODE_AUTO, statut: OUVERT, clotureLe: { lte: maintenant } }, select: { id: true } });
    let consultes = 0;
    let pasAssez = 0;
    for (const a of closes) {
      const r = await this.cloturer(a.id, maintenant);
      if (r === "consultation") consultes++;
      else pasAssez++;
    }
    const echues = await this.prisma.regroupementNegocie.findMany({ where: { mode: MODE_AUTO, statut: "consultation", reponseAvantLe: { lte: maintenant } }, select: { id: true } });
    let analyses = 0;
    for (const a of echues) {
      await this.analyser(a.id, maintenant);
      analyses++;
    }
    const resumes = await this.resumes(maintenant);
    const factures = maintenant.getUTCDate() === 1 ? await this.preparerFactures(maintenant) : 0;
    return { rappels, consultes, pasAssez, analyses, resumes, factures };
  }

  /** Point 12 : la veille de la clôture, « Demain, [négoce] reçoit la demande groupée… Tu l'as prévenu ? ». */
  private async rappelsVeille(maintenant: Date): Promise<number> {
    const negoces = await this.prisma.negoceParticipant.findMany({
      where: { rappelLe: null, prevenuLe: null, besoin: { statut: "declare" }, regroupement: { mode: MODE_AUTO, statut: OUVERT, clotureLe: { gt: maintenant, lte: new Date(maintenant.getTime() + 2 * JOUR) } } },
      include: { regroupement: { select: { libelle: true } } },
    });
    for (const n of negoces) {
      await this.prisma.negoceParticipant.update({ where: { id: n.id }, data: { rappelLe: maintenant } });
      const corps = phraseRappelVeille(n.nom, n.regroupement.libelle);
      await this.notifs.prevenir(n.companyId, { titre: "Préviens ton négoce", corps, url: `/achats-groupes/${n.besoinId}`, etiquette: `rappel-${n.besoinId}` }).catch(() => undefined);
    }
    return negoces.length;
  }

  /** La clôture : pas assez de volume (plan B), ou UNE demande par négoce, de la part de ses seuls clients. */
  async cloturer(regroupementId: string, maintenant = this.now()): Promise<"consultation" | "pas_assez"> {
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: regroupementId } });
    const besoins = await this.prisma.besoinNegocie.findMany({ where: { regroupementId, statut: "declare" }, include: { negoces: true, company: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } });
    const v = await this.volumeEstime(a);
    const minimum = volumeMinimum(a.famille, await this.volumesMin());
    const negoces = new Map<string, { nom: string; telephone: string | null; besoins: typeof besoins }>();
    for (const b of besoins) for (const n of b.negoces) negoces.set(n.email, { nom: n.nom, telephone: n.telephone, besoins: [...(negoces.get(n.email)?.besoins ?? []), b] });
    // Sans estimation (aucun prix repère ni « Mes prix »), le volume ne bloque pas : la consultation part.
    if (besoins.length === 0 || negoces.size === 0 || (v.estimeHt !== null && v.estimeHt < minimum)) {
      await this.prisma.regroupementNegocie.update({ where: { id: a.id }, data: { statut: "pas_assez", pasAssezLe: maintenant } });
      for (const b of besoins) await this.notifs.prevenir(b.companyId, { titre: "Pas assez de volume cette fois", corps: `${a.libelle} : envoie ta demande à tes négoces en un clic, rien n'est perdu.`, url: `/achats-groupes/${b.id}`, etiquette: `achat-${a.id}` }).catch(() => undefined);
      return "pas_assez";
    }
    const commission = commissionAchatGroupe(a.numero, { defaut: this.cfg.commissionDefaut, lancement: this.cfg.commissionLancement, premiers: this.cfg.commissionLancementPremiers });
    await this.prisma.regroupementNegocie.update({ where: { id: a.id }, data: { statut: "consultation", consulteLe: maintenant, commissionPct: commission } });
    const unite = a.unite ?? besoins[0]!.unite;
    const total = besoins.reduce((s, b) => s + Number(b.quantite), 0);
    const livraisons = besoins.map((b) => ({ commune: communeDe(b.livraison) ?? b.departement, date: b.dateBesoin, quantite: qte(Number(b.quantite)) }));
    for (const [email, n] of negoces) {
      const jeton = randomBytes(24).toString("base64url");
      const clients = [...new Set(n.besoins.map((b) => b.company.name))];
      const c = await this.prisma.consultationAchatGroupe.upsert({
        where: { regroupementId_email: { regroupementId: a.id, email } },
        create: { regroupementId: a.id, email, nom: n.nom, telephone: n.telephone, clients, quantite: total, tokenHash: hacher(jeton), commissionPct: commission },
        update: {},
      });
      if (c.envoyeLe) continue;
      // Le jeton n'est connu que de l'e-mail : un envoi repris (panne du prestataire) reçoit un lien neuf.
      if (c.tokenHash !== hacher(jeton)) await this.prisma.consultationAchatGroupe.update({ where: { id: c.id }, data: { tokenHash: hacher(jeton) } });
      const lien = `${this.cfg.webAppUrl}/achat-groupe/${jeton}`;
      const { objet, texte } = demandeNegoce({ clients, libelle: a.libelle, quantiteTotale: qte(total), unite, livraisons, reponseAvantLe: a.reponseAvantLe!, commandeAvantLe: new Date(a.reponseAvantLe!.getTime() + 2 * JOUR), lien, commissionPct: commission });
      const replyTo = await this.ports.adresseMobiiz(n.besoins[0]!.companyId).catch(() => null);
      try {
        await this.mailer.send({ to: email, subject: objet, text: texte, ...(replyTo ? { replyTo } : {}) });
        await this.prisma.consultationAchatGroupe.update({ where: { id: c.id }, data: { envoyeLe: maintenant } });
      } catch {
        continue;
      }
      for (const b of n.besoins) {
        await this.prisma.negoceParticipant.updateMany({ where: { besoinId: b.id, email }, data: { partiLe: maintenant } });
        await this.notifs.prevenir(b.companyId, { titre: "Ta demande est partie", corps: phraseDemandePartie(n.nom), url: `/achats-groupes/${b.id}`, etiquette: `parti-${b.id}-${c.id}` }).catch(() => undefined);
      }
    }
    return "consultation";
  }

  /* ------------------------------------------------------------------------------- la réponse du négoce (public) */

  private async consultationDuJeton(jeton: string) {
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(jeton)) throw notFound("Consultation");
    const c = await this.prisma.consultationAchatGroupe.findUnique({ where: { tokenHash: hacher(jeton) }, include: { regroupement: true } });
    if (!c) throw notFound("Consultation");
    return c;
  }

  /** La page du lien (vouvoiement) : la demande, les conditions, l'offre déjà déposée. Jamais un autre négoce. */
  async page(jeton: string) {
    const c = await this.consultationDuJeton(jeton);
    const a = c.regroupement;
    const besoins = await this.prisma.besoinNegocie.findMany({ where: { regroupementId: a.id, statut: { in: [...ACTIFS, "desiste"] }, desisteLe: null }, select: { livraison: true, departement: true, dateBesoin: true, quantite: true } });
    const commission = Number(c.commissionPct);
    return {
      deLaPartDe: deLaPartDe(c.clients),
      negoce: c.nom,
      libelle: a.libelle,
      quantiteTotale: Number(c.quantite),
      unite: a.unite,
      livraisons: besoins.map((b) => ({ commune: communeDe(b.livraison) ?? b.departement, dateBesoin: jourIso(b.dateBesoin), quantite: Number(b.quantite) })),
      reponseAvantLe: a.reponseAvantLe!.toISOString(),
      commandeAvantLe: new Date(a.reponseAvantLe!.getTime() + 2 * JOUR).toISOString(),
      close: !!a.reponseAvantLe && a.reponseAvantLe <= this.now(),
      commissionPct: commission,
      conditions: [
        "Vous n'êtes pas le seul négoce consulté.",
        "Une seule offre, sans deuxième tour : votre meilleur prix.",
        "Prix HT livraison comprise, ferme jusqu'à la date de commande, même si le volume final est un peu inférieur (désistements).",
        "Le bon de commande vous arrive directement ; le client vous paie sur son compte habituel. Mobiiz ne touche jamais l'argent.",
        commission > 0 ? `Commission Mobiiz de ${String(commission).replace(".", ",")} % HT sur les commandes passées, facturée chaque mois.` : "Aucune commission Mobiiz sur cet achat groupé (lancement).",
      ],
      reponse: c.reponduLe ? { le: c.reponduLe.toISOString(), prixUnitaireHt: c.prixUnitaireHt === null ? null : Number(c.prixUnitaireHt), pdf: c.pdfNom } : null,
    };
  }

  async repondre(jeton: string, r: ReponseNegoceAchat) {
    const c = await this.consultationDuJeton(jeton);
    if (c.reponduLe) throw new DomainError("conflict", "Already answered", { reason: "deja_repondu", message: "Votre offre est déjà enregistrée : une seule offre par achat groupé." });
    if (c.regroupement.reponseAvantLe && c.regroupement.reponseAvantLe <= this.now()) throw new DomainError("conflict", "Too late", { reason: "trop_tard", message: "La date de réponse est passée." });
    if (!r.accepteConditions) throw validationFailed("Conditions must be accepted", { reason: "conditions_requises", message: "Acceptez les conditions pour déposer votre offre." });
    if (r.prixUnitaireHt === null && !r.pdf) throw validationFailed("Price or PDF required", { reason: "prix_ou_pdf", message: "Saisissez un prix ou déposez votre devis PDF." });
    const pdf = r.pdf ? Buffer.from(r.pdf.contenuBase64, "base64") : null;
    if (pdf && (pdf.length > 8 * 1024 * 1024 || pdf.subarray(0, 5).toString() !== "%PDF-")) throw validationFailed("PDF only, 8 MB max", { reason: "pdf_invalide", message: "Déposez un PDF de 8 Mo au plus." });
    const maintenant = this.now();
    await this.prisma.consultationAchatGroupe.update({
      where: { id: c.id },
      data: { conditionsAccepteesLe: maintenant, reponduLe: maintenant, statut: "repondue", prixUnitaireHt: r.prixUnitaireHt, delaiJours: r.delaiJours, commentaire: r.commentaire, ...(pdf ? { pdf, pdfNom: r.pdf!.nom.slice(0, 120) } : {}) },
    });
    return this.page(jeton);
  }

  /* --------------------------------------------------------------------------- l'analyse à l'échéance (point 4) */

  /** Ce que l'IA a coûté aujourd'hui (€) : le budget du jour n'est jamais dépassé. */
  private async coutIaDuJour(maintenant: Date): Promise<number> {
    const debut = new Date(`${jourIso(maintenant)}T00:00:00Z`);
    const r = await this.prisma.consultationAchatGroupe.aggregate({ where: { luLe: { gte: debut } }, _sum: { coutIaEur: true } });
    return Number(r._sum.coutIaEur ?? 0);
  }

  private async lireDevis(c: { id: string; pdf: Uint8Array | null }, a: { numero: number; libelle: string; unite: string | null }, quantite: number, maintenant: Date): Promise<ReponseLue | null> {
    if (!c.pdf || !this.extracteur) return null;
    if ((await this.coutIaDuJour(maintenant)) >= this.cfg.budgetIaJourEur) return null;
    let texte = "";
    try {
      const contenu = await this.pdf!.read(new Uint8Array(c.pdf), { maxPages: 10 });
      texte = contenu.pages.map((p) => p.lines.map((l, i) => `[${p.pageNumber}:${String(i + 1).padStart(3, "0")}] ${l}`).join("\n")).join("\n");
    } catch {
      texte = "";
    }
    const document = texte.trim() ? { numberedText: texte, imagePdf: null, imagePages: [] } : { numberedText: "", imagePdf: new Uint8Array(c.pdf), imagePages: [1] };
    const t = await this.extracteur.lire({ ...document, lot: { numero: a.numero, designation: a.libelle, unite: a.unite ?? "", volumeFerme: String(quantite), volumeProbable: String(quantite) } }).catch(() => null);
    let cout = 0;
    try {
      if (t) cout = microUsdToEur(computeAiCost(t.model, t.usage, priceTableAt(maintenant)).totalMicroUsd, this.cfg.usdToEur).toNumber();
    } catch {
      cout = 0;
    }
    await this.prisma.consultationAchatGroupe.update({ where: { id: c.id }, data: { luLe: maintenant, coutIaEur: cout, lecture: (t?.output ?? null) as never } });
    return t?.status === "success" ? t.output : null;
  }

  /** À l'échéance : lecture des devis, jugement sur une base identique, meilleure offre ou plan B, notifications. */
  async analyser(regroupementId: string, maintenant = this.now()) {
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: regroupementId } });
    const consultations = await this.prisma.consultationAchatGroupe.findMany({ where: { regroupementId, reponduLe: { not: null } } });
    const quantite = Number(consultations[0]?.quantite ?? (await this.quantiteTotale(regroupementId)));
    const offres: OffreACompare[] = [];
    for (const c of consultations) {
      if (c.prixUnitaireHt !== null) {
        offres.push({ id: c.id, prixUnitaireHt: Number(c.prixUnitaireHt), designationLue: null, quantiteCouverte: null, delaiJours: c.delaiJours, doutes: [], livraisonEnSus: false });
        continue;
      }
      const lu = await this.lireDevis(c, a, quantite, maintenant);
      if (!lu) {
        offres.push({ id: c.id, prixUnitaireHt: null, designationLue: null, quantiteCouverte: null, delaiJours: null, doutes: ["Devis non lu (lecteur absent ou budget du jour atteint)."], livraisonEnSus: false });
        continue;
      }
      const palier = lu.paliers.find((p) => {
        const r = referenceStricte(p.designation);
        return r.ok && r.reference.cle === a.cle;
      }) ?? lu.paliers[0];
      const pu = nombre(palier?.prixUnitaireHt) ?? (nombre(palier?.totalHt) && nombre(palier?.quantite) ? nombre(palier!.totalHt)! / nombre(palier!.quantite)! : null);
      offres.push({ id: c.id, prixUnitaireHt: pu, designationLue: palier?.designation ?? null, quantiteCouverte: nombre(palier?.quantite), delaiJours: lu.delaiJours, doutes: lu.doutes, livraisonEnSus: /livraison\s+(en\s+sus|non\s+comprise)/i.test(lu.doutes.join(" ")) });
      if (pu !== null) await this.prisma.consultationAchatGroupe.update({ where: { id: c.id }, data: { prixUnitaireHt: pu, delaiJours: lu.delaiJours } });
    }
    const { jugees, meilleure } = jugerOffres(offres, { cle: a.cle, quantiteTotale: quantite, delaiMaxJours: this.cfg.delaiLivraisonJours });
    for (const j of jugees) await this.prisma.consultationAchatGroupe.update({ where: { id: j.id }, data: { statut: j.valide ? "valide" : "douteuse", raisons: j.raisons } });
    await this.prisma.regroupementNegocie.update({ where: { id: a.id }, data: { analyseLe: maintenant, meilleureId: meilleure?.id ?? null, statut: meilleure ? "offre_recue" : "pas_assez", ...(meilleure ? {} : { pasAssezLe: maintenant }) } });
    const besoins = await this.prisma.besoinNegocie.findMany({ where: { regroupementId, statut: "declare" }, select: { id: true, companyId: true } });
    for (const b of besoins)
      await this.notifs
        .prevenir(
          b.companyId,
          meilleure
            ? { titre: "Offre reçue", corps: `${a.libelle} : compare et commande si ça te va.`, url: `/achats-groupes/${b.id}`, etiquette: `achat-${a.id}` }
            : { titre: "Pas assez de volume cette fois", corps: `${a.libelle} : aucune offre comparable. Envoie ta demande à tes négoces en un clic.`, url: `/achats-groupes/${b.id}`, etiquette: `achat-${a.id}` },
        )
        .catch(() => undefined);
    return { meilleure: meilleure?.id ?? null, douteuses: jugees.filter((j) => !j.valide).length };
  }

  /**
   * Recette en prévisualisation (jamais en production, vérifié par le contrôleur) : clôturer tout de suite, ou analyser
   * les offres tout de suite, sans attendre la tâche du jour.
   */
  async avancer(regroupementId: string, etape: "cloture" | "echeance") {
    if (!isUuid(regroupementId)) throw notFound("AchatGroupe");
    const a = await this.prisma.regroupementNegocie.findFirst({ where: { id: regroupementId, mode: MODE_AUTO } });
    if (!a) throw notFound("AchatGroupe");
    const maintenant = this.now();
    if (etape === "cloture") {
      if (a.statut !== OUVERT) throw new DomainError("conflict", "Already closed", { reason: "deja_clos" });
      await this.prisma.regroupementNegocie.update({ where: { id: a.id }, data: { clotureLe: maintenant } });
      return { statut: await this.cloturer(a.id, maintenant) };
    }
    if (a.statut !== "consultation") throw new DomainError("conflict", "Not in consultation", { reason: "pas_en_consultation" });
    await this.prisma.regroupementNegocie.update({ where: { id: a.id }, data: { reponseAvantLe: maintenant } });
    return this.analyser(a.id, maintenant);
  }

  /** L'admin valide une offre douteuse après vérification : elle entre dans la comparaison. */
  async validerOffre(consultationId: string) {
    if (!isUuid(consultationId)) throw notFound("Consultation");
    const c = await this.prisma.consultationAchatGroupe.findUnique({ where: { id: consultationId }, include: { regroupement: true } });
    if (!c || c.statut !== "douteuse" || c.prixUnitaireHt === null) throw notFound("Consultation");
    await this.prisma.consultationAchatGroupe.update({ where: { id: c.id }, data: { statut: "valide", raisons: [] } });
    const valides = await this.prisma.consultationAchatGroupe.findMany({ where: { regroupementId: c.regroupementId, statut: "valide", prixUnitaireHt: { not: null } }, orderBy: { prixUnitaireHt: "asc" } });
    const etaitSansOffre = c.regroupement.statut === "pas_assez";
    await this.prisma.regroupementNegocie.update({ where: { id: c.regroupementId }, data: { meilleureId: valides[0]!.id, statut: "offre_recue", pasAssezLe: null } });
    if (etaitSansOffre) {
      const besoins = await this.prisma.besoinNegocie.findMany({ where: { regroupementId: c.regroupementId, statut: "declare" }, select: { id: true, companyId: true } });
      for (const b of besoins) await this.notifs.prevenir(b.companyId, { titre: "Offre reçue", corps: `${c.regroupement.libelle} : compare et commande si ça te va.`, url: `/achats-groupes/${b.id}`, etiquette: `achat-${c.regroupementId}` }).catch(() => undefined);
    }
    return { fait: true };
  }

  /* ---------------------------------------------------------------------------------------- commander (point 6) */

  async commander(tenant: TenantContext, besoinId: string, consultationId: string) {
    assertCanWrite(tenant);
    const b = await this.monBesoin(tenant, besoinId);
    if (b.statut !== "declare") throw new DomainError("conflict", "Not open", { reason: "besoin_ferme" });
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: b.regroupementId! } });
    if (a.statut !== "offre_recue") throw new DomainError("conflict", "No offer yet", { reason: "sans_offre" });
    const vue = await this.offresPour(tenant, a, b);
    const permises = [vue.mien?.consultationId, vue.meilleure?.consultationId].filter((x): x is string => !!x);
    if (!permises.includes(consultationId)) throw forbidden("This offer is not available to you");
    const c = await this.prisma.consultationAchatGroupe.findUniqueOrThrow({ where: { id: consultationId } });
    const maintenant = this.now();
    const rang = (await this.prisma.besoinNegocie.count({ where: { regroupementId: a.id, bonNumero: { not: null } } })) + 1;
    const bonNumero = a.numero * 1000 + rang;
    const prix = Number(c.prixUnitaireHt);
    const quantite = Number(b.quantite);
    const total = Math.round(prix * quantite * 100) / 100;
    await this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { statut: "accepte", accepteLe: maintenant, bonNumero, consultationCommandeId: c.id, prixCommandeHt: prix } });
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { name: true, address: true, phone: true, contactEmail: true } });
    const pdf = await bonDeCommandePdf({
      numero: String(bonNumero),
      date: jourFr(maintenant),
      acheteur: { nom: company.name, adresse: company.address, telephone: company.phone, email: company.contactEmail },
      vendeur: { nom: c.nom, email: c.email },
      livraison: b.livraison,
      lignes: [{ designation: a.libelle, quantite: qte(quantite), unite: b.unite, prixHt: euros(prix), totalHt: euros(total) }],
      livraisonHt: "comprise",
      totalHt: euros(total),
      mentions: [
        `Achat groupé ${NOM_APP} n° ${a.numero} : prix ferme livraison comprise, offre du ${c.reponduLe ? jourFr(c.reponduLe) : jourFr(maintenant)}.`,
        `Paiement directement au vendeur, à 30 jours, sur le compte habituel de l'acheteur. ${NOM_APP} ne vend ni n'achète rien et ne touche jamais l'argent.`,
      ],
    });
    const piece = { filename: `bon-de-commande-${bonNumero}.pdf`, contentType: "application/pdf", contentBase64: Buffer.from(pdf).toString("base64") };
    const replyTo = await this.ports.adresseMobiiz(tenant.companyId).catch(() => null);
    await this.mailer.send({
      to: c.email,
      subject: `Bon de commande n° ${bonNumero} : ${qte(quantite)} ${b.unite} ${de(a.libelle)} (achat groupé ${NOM_APP})`,
      text: ["Bonjour,", "", `${company.name} vous commande ${qte(quantite)} ${b.unite} ${de(a.libelle)} au prix de votre offre (${euros(prix)} HT / ${b.unite}, livraison comprise), à livrer : ${b.livraison}.`, "Le bon de commande est joint. Le paiement se fait directement entre vous.", "", NOM_APP].join("\n"),
      attachments: [piece],
      ...(replyTo ? { replyTo } : {}),
    });
    await this.notifs.prevenir(tenant.companyId, { titre: "C'est commandé", corps: `${qte(quantite)} ${b.unite} ${de(a.libelle)} chez ${c.nom}, ${euros(total)} HT livré.`, url: `/achats-groupes/${b.id}`, etiquette: `commande-${b.id}` }, { objet: `Ta commande groupée n° ${bonNumero} : ${a.libelle}`, texte: `C'est commandé : ${qte(quantite)} ${b.unite} ${de(a.libelle)} chez ${c.nom}, ${euros(total)} HT livré.\nTon bon de commande est joint.\n\n${this.notifs.lienVers("/achats-groupes")}\n\n${NOM_APP}`, piecesJointes: [piece] }).catch(() => undefined);
    await this.ports.observatoire({ sourceId: a.id, departement: a.departement, designation: a.libelle, unite: b.unite, quantite, prixHt: prix }).catch(() => undefined);
    return { bonNumero, negoce: c.nom, totalHt: total };
  }

  async bonPdf(tenant: TenantContext, besoinId: string): Promise<Uint8Array> {
    const b = await this.monBesoin(tenant, besoinId);
    if (!b.bonNumero || !b.consultationCommandeId) throw notFound("Bon");
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: b.regroupementId! } });
    const c = await this.prisma.consultationAchatGroupe.findUniqueOrThrow({ where: { id: b.consultationCommandeId } });
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { name: true, address: true, phone: true, contactEmail: true } });
    const prix = Number(b.prixCommandeHt);
    const total = Math.round(prix * Number(b.quantite) * 100) / 100;
    return bonDeCommandePdf({
      numero: String(b.bonNumero),
      date: jourFr(b.accepteLe ?? this.now()),
      acheteur: { nom: company.name, adresse: company.address, telephone: company.phone, email: company.contactEmail },
      vendeur: { nom: c.nom, email: c.email },
      livraison: b.livraison,
      lignes: [{ designation: a.libelle, quantite: qte(Number(b.quantite)), unite: b.unite, prixHt: euros(prix), totalHt: euros(total) }],
      livraisonHt: "comprise",
      totalHt: euros(total),
      mentions: [`Achat groupé ${NOM_APP} n° ${a.numero}.`, `Paiement directement au vendeur. ${NOM_APP} ne touche jamais l'argent.`],
    });
  }

  /** Le devis PDF déposé par un négoce (admin, pour vérifier une offre douteuse). */
  async devisPdf(consultationId: string): Promise<Uint8Array> {
    if (!isUuid(consultationId)) throw notFound("Consultation");
    const c = await this.prisma.consultationAchatGroupe.findUnique({ where: { id: consultationId }, select: { pdf: true } });
    if (!c?.pdf) throw notFound("Consultation");
    return new Uint8Array(c.pdf);
  }

  /* ------------------------------------------------------------------------------------------- plan B (point 7) */

  /** « Envoyer à mes négoces » : la participation devient une demande perso, en un clic, chez ses négoces. */
  async planB(tenant: TenantContext, besoinId: string) {
    assertCanWrite(tenant);
    const b = await this.monBesoin(tenant, besoinId);
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: b.regroupementId! } });
    if (a.statut !== "pas_assez" || b.statut !== "declare") throw new DomainError("conflict", "Plan B only when volume is short", { reason: "pas_de_plan_b" });
    const negoces = await this.prisma.negoceParticipant.findMany({ where: { besoinId: b.id, supplierId: { not: null } }, select: { supplierId: true } });
    const r = await this.ports.envoyerEnPerso(tenant, {
      nom: `Achat groupé : ${a.libelle}`,
      adresse: b.livraison,
      ligne: { designation: b.designation, quantite: Number(b.quantite), unite: b.unite },
      supplierIds: negoces.map((n) => n.supplierId!),
      dateBesoin: b.dateBesoin,
    });
    await this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { statut: "perso" } });
    return r;
  }

  /* -------------------------------------------------------------------------------- la facture de commission */

  /** Le 1er du mois : la facture de commission de chaque négoce, d'après les bons du mois passé (envoi réel coupé). */
  async preparerFactures(maintenant = this.now()): Promise<number> {
    const debut = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - 1, 1));
    const fin = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1));
    const mois = debut.toISOString().slice(0, 7);
    const bons = await this.prisma.besoinNegocie.findMany({ where: { statut: "accepte", accepteLe: { gte: debut, lt: fin }, consultationCommandeId: { not: null } }, select: { bonNumero: true, quantite: true, prixCommandeHt: true, consultationCommandeId: true } });
    const parNegoce = new Map<string, { nom: string; total: number; commission: number; bons: { numero: number | null; totalHt: number }[] }>();
    for (const b of bons) {
      const c = await this.prisma.consultationAchatGroupe.findUnique({ where: { id: b.consultationCommandeId! }, select: { email: true, nom: true, commissionPct: true } });
      if (!c) continue;
      const total = Math.round(Number(b.prixCommandeHt) * Number(b.quantite) * 100) / 100;
      const f = parNegoce.get(c.email) ?? { nom: c.nom, total: 0, commission: 0, bons: [] };
      f.total += total;
      f.commission += (total * Number(c.commissionPct)) / 100;
      f.bons.push({ numero: b.bonNumero, totalHt: total });
      parNegoce.set(c.email, f);
    }
    for (const [email, f] of parNegoce) {
      const data = { negoceNom: f.nom, totalHt: Math.round(f.total * 100) / 100, commissionHt: Math.round(f.commission * 100) / 100, bons: f.bons };
      await this.prisma.factureCommissionMensuelle.upsert({ where: { mois_negoceEmail: { mois, negoceEmail: email } }, create: { mois, negoceEmail: email, ...data }, update: data });
    }
    return parNegoce.size;
  }

  /* ------------------------------------------------------------------------------------------------- l'admin */

  async admin(maintenant = this.now()) {
    const achats = await this.prisma.regroupementNegocie.findMany({ where: { mode: MODE_AUTO }, orderBy: { createdAt: "desc" }, take: 200, include: { consultations: { select: { id: true, nom: true, email: true, telephone: true, statut: true, raisons: true, prixUnitaireHt: true, reponduLe: true, envoyeLe: true, pdfNom: true } } } });
    const vues = [];
    for (const a of achats) {
      const v = await this.volumeEstime(a);
      vues.push({ id: a.id, numero: a.numero, libelle: a.libelle, departement: a.departement, statut: a.statut, clotureLe: a.clotureLe, reponseAvantLe: a.reponseAvantLe, entreprises: v.entreprises, quantite: v.total, unite: a.unite, estimeHt: v.estimeHt, consultations: a.consultations.map((c) => ({ ...c, prixUnitaireHt: c.prixUnitaireHt === null ? null : Number(c.prixUnitaireHt), raisons: c.raisons.map((r) => PHRASES_DOUTE[r as RaisonDoute] ?? r) })) });
    }
    const limite = new Date(maintenant.getTime() - SANS_REPONSE_HEURES * 3_600_000);
    const sansReponse = vues.filter((a) => a.statut === "consultation" && achats.find((x) => x.id === a.id)!.consulteLe! <= limite && a.consultations.every((c) => !c.reponduLe)).map((a) => ({ id: a.id, numero: a.numero, libelle: a.libelle, departement: a.departement, negoces: a.consultations.map((c) => ({ nom: c.nom, email: c.email, telephone: c.telephone })) }));
    const douteuses = vues.flatMap((a) => a.consultations.filter((c) => c.statut === "douteuse").map((c) => ({ achatId: a.id, numero: a.numero, libelle: a.libelle, consultationId: c.id, nom: c.nom, prixUnitaireHt: c.prixUnitaireHt, raisons: c.raisons, pdf: c.pdfNom })));
    const desistements = (await this.prisma.desistementAchatGroupe.findMany({ orderBy: { le: "desc" }, take: 200, include: { company: { select: { name: true } }, regroupement: { select: { numero: true, libelle: true } } } })).map((d) => ({ id: d.id, le: d.le, entreprise: d.company.name, achat: `n° ${d.regroupement.numero} ${d.regroupement.libelle}`, quantite: Number(d.quantite), apresCloture: d.apresCloture, raison: d.raison }));
    const parts = await this.prisma.besoinNegocie.groupBy({ by: ["companyId"], where: { regroupement: { mode: MODE_AUTO } }, _count: { _all: true } });
    const suspects = [];
    for (const p of parts) {
      const commandes = await this.prisma.besoinNegocie.count({ where: { companyId: p.companyId, statut: "accepte", regroupement: { mode: MODE_AUTO } } });
      if (participantSuspect(p._count._all, commandes)) {
        const c = await this.prisma.company.findUnique({ where: { id: p.companyId }, select: { name: true, siret: true, naf: true } });
        suspects.push({ companyId: p.companyId, entreprise: c?.name ?? "", siret: c?.siret ?? null, naf: c?.naf ?? null, participations: p._count._all, commandes });
      }
    }
    const factures = (await this.prisma.factureCommissionMensuelle.findMany({ orderBy: [{ mois: "desc" }, { negoceNom: "asc" }], take: 200 })).map((f) => ({ ...f, totalHt: Number(f.totalHt), commissionHt: Number(f.commissionHt) }));
    return { achats: vues, sansReponse, douteuses, desistements, suspects, factures, volumesMin: await this.volumesMin(), envoiFacturesActif: false };
  }
}
