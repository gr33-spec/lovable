import { createHash, randomBytes } from "node:crypto";
import {
  CONDITIONS_OUVERTURE,
  ETAPES_ACHAT_GROUPE,
  LIBELLES_CONDITIONS_OUVERTURE,
  LIBELLES_MOTIFS_SORTIE,
  LIBELLES_PAIEMENTS_DEPART,
  LIBELLES_REGLAGES_ALERTES,
  MOTIFS_SORTIE,
  NOM_APP,
  PAIEMENTS_DEPART,
  PHRASES_DOUTE,
  PHRASE_ACTIVITE_REFUSEE,
  PHRASE_DATE_TROP_PROCHE,
  PHRASE_ENGAGEMENT,
  PHRASE_NEGOCE_OBLIGATOIRE,
  REGLES_ENGAGEMENT,
  SANS_REPONSE_HEURES,
  SEUIL_SUGGESTION_DEFAUT,
  SEUIL_VOLUME_MIN_DEFAUT,
  commandeAvantLe,
  commissionAchatGroupe,
  communeDe,
  comparerPourArtisan,
  computeAiCost,
  cumulerPanier,
  datesAchatGroupePanier,
  deLaPartDe,
  decisionAlerte,
  demandeNegocePanier,
  droitAchatGroupe,
  ecranPrevenir,
  estActiviteBatiment,
  estCommerceDeGros,
  etapeCourante,
  etatCarte,
  exclu,
  exclusionJusquau,
  arbreCatalogue,
  famillesDuCatalogue,
  portableLisible,
  prenomDe,
  mailRelanceDemande,
  phraseRelanceArtisan,
  relancesDues,
  phraseEconomieGroupe,
  TON,
  famillesDuMetier,
  jaugeVolume,
  LIBELLES_FAMILLES,
  libelleMetier,
  lienSms,
  lienTel,
  lignesASuggerer,
  lignesPourNegoce,
  lireReglageAlertes,
  microUsdToEur,
  participantSuspect,
  phraseAlerteMetier,
  phraseDemandePartie,
  phraseExclusion,
  phraseManquantes,
  phraseOuvertureCompte,
  phrasePublication,
  phraseRappelVeille,
  phraseResumeAlertes,
  phraseSuggestion,
  priceTableAt,
  rattachementPropose,
  rechercherCatalogue,
  referenceStricte,
  reponseComplete,
  smsPrevenir,
  titreAchatGroupe,
  uniteRepere,
  volumeMinimum,
  zoneDuCodePostal,
  type ConditionOuverture,
  type LignePanier,
  type MotifSortie,
  type OffreNegocePanier,
  type PaiementDepart,
  type RaisonDoute,
  type ReglageAlertes,
  type ReponseLignes,
} from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import { mailEnHtml } from "../../../platform/email/mail-html.js";
import { DomainError, forbidden, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { NotificationsGroupeService } from "../../../platform/notifications/notifications-artisan.js";
import { bonDeCommandePdf } from "../../../platform/pdf/bon-de-commande.js";
import { demandeNegocePdf, offreNegocePdf } from "../../../platform/pdf/demande-negoce.js";
import { ecrireXlsx, lireXlsx, type Cellule } from "../../../platform/xlsx/xlsx.js";
import type { PdfReader } from "../../documents/index.js";
import type { NegoceExtractor, ReponseLue } from "../../groupe/index.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";

/**
 * L'ACHAT GROUPÉ PAR MÉTIER (Greg, 27 octobre 2026, 2e message : « ce message fait foi » sur le précédent).
 * - Un achat groupé = un métier + une zone + une période (« Couverture · secteur Paimpol · livraison avant le 30
 *   novembre ») ; il contient un PANIER : chaque artisan y met les lignes cochées de sa liste, chacune rattachée d'un tap à
 *   une référence du catalogue (sinon elle reste en demande perso).
 * - Rejoindre, c'est S'ENGAGER (case obligatoire, règles dites en clair) : seul le volume engagé est annoncé ; deux
 *   sorties seulement, avec le motif ; plus d'une par trimestre, ou une commande pas passée sans motif : exclusion.
 * - À la CLÔTURE, chaque négoce choisi reçoit UNE liste propre (quantités cumulées, ses familles s'il est spécialiste), de
 *   la part de ses seuls clients ; il répond LIGNE PAR LIGNE (un prix, ou « je ne fournis pas »), le PDF reste un repli
 *   lu par l'IA ; il coche une fois ses conditions d'ouverture de compte.
 * - À l'ÉCHÉANCE : l'analyse, puis la VALIDATION DE L'ADMIN (`VALIDATION_ADMIN_OFFRES`) : écarter, corriger un prix,
 *   publier. Chaque artisan est comparé sur SES lignes, livraison comprise ; les offres complètes d'abord.
 * - Après la publication : commander (bon au négoce, « Commande reçue »), ou ouvrir un compte (coordonnées transmises
 *   avec son accord), puis « Livré » / « Problème ». Mobiiz ne touche jamais l'argent.
 */

const JOUR = 86_400_000;
const HEURE = 3_600_000;
const CLE_VOLUME_MIN = "achat-groupe:volume-min";
const MODE_AUTO = "automatique";
const OUVERT = "en_collecte";
const ENGAGE = "declare";

/** Les colonnes de l'Excel : A Référence, B Désignation, C Quantité, D Unité, E Prix unitaire HT (libre), F Disponible (libre). */
const ENTETE_EXCEL: Cellule[] = ["Référence", "Désignation", "Quantité", "Unité", "Prix unitaire HT", "Disponible (oui/non)"];
const COL_PRIX = 4;
/** La référence lue par le négoce : « R1 », « R2 »… dans l'ordre de SA liste (la clé du catalogue reste interne). */
const refCourte = (i: number) => `R${i + 1}`;
/** Chez le négoce, « ml » s'écrit « m » (comme dans la demande de devis). */
const uniteNegoce = (u: string) => (u.trim().toLowerCase() === "ml" ? "m" : u);
const COL_DISPO = 5;
const hacher = (jeton: string) => createHash("sha256").update(jeton).digest("hex");
const qte = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 3 }).replace(/\u202f/g, "\u00a0");
const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u202f/g, "\u00a0")} €`;
const jourFr = (d: Date) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(d).replace(/^1 /, "1er ");
const jourIso = (d: Date) => d.toISOString().slice(0, 10);
const arrondi = (n: number) => Math.round(n * 100) / 100;
const nombre = (s: string | null | undefined): number | null => {
  if (!s) return null;
  const n = Number(s.replace(/[\s\u00a0\u202f€]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const objet = (v: unknown): Record<string, number | null> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, number | null>) : {});
const prixDe = (prix: ReponseLignes, cle: string): number | null => {
  const p = prix[cle];
  return typeof p === "number" ? p : null;
};
const lignesDe = (v: unknown): LignePanier[] => (Array.isArray(v) ? (v as LignePanier[]) : []);

export type NegoceAjoute = { supplierId: string } | { negoceId: string } | { nom: string; email: string; telephone?: string | null; prenom?: string | null };

export interface LigneEngagee {
  designation: string;
  quantite: number;
  unite: string;
  projectId?: string | null;
  articleKey?: string | null;
}

export interface Engagement {
  /** Rejoindre CET achat groupé ; sinon, celui du métier et du secteur qui convient, ou un nouveau. */
  achatId?: string | null;
  lignes: LigneEngagee[];
  livraison: string;
  /** La date de besoin (ignorée quand on rejoint un achat : c'est la sienne). */
  dateBesoin: Date | null;
  negoces: NegoceAjoute[];
  /** La case « Je commande ces quantités… », obligatoire. */
  engagement: boolean;
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
  validationAdmin: boolean;
  delaiValidationAdminHeures: number;
  delaiCommandeJours: number;
  exclusionMois: number;
  seuilSuggestion: Record<string, number> | null;
  admins: string[];
}

export interface ReponseNegoceAchat {
  accepteConditions: boolean;
  /** Ligne par ligne : un prix unitaire HT livré, ou null (« je ne fournis pas »). */
  prix: Record<string, number | null> | null;
  delaiJours: number | null;
  commentaire: string | null;
  pdf: { nom: string; contenuBase64: string } | null;
  conditionsOuverture: { pieces: ConditionOuverture[]; paiement: PaiementDepart | null; autre: string | null } | null;
}

/** Les briques des autres modules, branchées par le module (pas d'import d'un module voisin hors de son index). */
export interface PortsAchatGroupe {
  zoneDe(companyId: string): Promise<string | null>;
  exigerZone(companyId: string, zone: string): Promise<void>;
  /** Abonné payant (ou tout ouvert, sans abonnement artisan) : l'essai et la zone offerte ne comptent pas (point 25). */
  abonne(companyId: string): Promise<boolean>;
  dernierPrixPour(companyId: string): Promise<(cle: string, unite: string) => number | null>;
  /** L'adresse Mobiiz (sans étiquette) de l'entreprise : le Reply-To de la demande au négoce. */
  adresseMobiiz(companyId: string): Promise<string | null>;
  /** « Entreprise Dupont via Mobiiz <adresse> » : l'expéditeur du mail au négoce (lot final, point 3). */
  expediteurMobiiz?(companyId: string): Promise<string | null>;
  mode(): Promise<string>;
  /** Le plan B : une liste validée, puis la demande perso à ses négoces. */
  envoyerEnPerso(tenant: TenantContext, d: { nom: string; adresse: string; lignes: { designation: string; quantite: number; unite: string }[]; supplierIds: string[]; dateBesoin: Date }): Promise<{ projectId: string; demandeId: string }>;
  lignesDeListe(tenant: TenantContext, projectId: string): Promise<{ adresse: string | null; source: string | null; lignes: { key: string; designation: string; quantite: number; unite: string }[] }>;
  observatoire(e: { sourceId: string; departement: string; designation: string; unite: string; quantite: number; prixHt: number }): Promise<unknown>;
}

type Consultation = Awaited<ReturnType<PrismaService["consultationAchatGroupe"]["findMany"]>>[number];
type Regroupement = Awaited<ReturnType<PrismaService["regroupementNegocie"]["findMany"]>>[number];

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

  private get seuilsSuggestion(): Record<string, number> {
    return { ...SEUIL_SUGGESTION_DEFAUT, ...(this.cfg.seuilSuggestion ?? {}) };
  }

  private async exigerAutomatique(): Promise<void> {
    if ((await this.ports.mode()) !== MODE_AUTO) throw new DomainError("conflict", "Automatic group buying is off", { reason: "mode_humain" });
  }

  /** SIRET vérifié et activité du bâtiment (anti-fraude) ; pas d'exclusion en cours (règle des sorties). */
  private async exigerEntreprise(companyId: string): Promise<{ name: string; trades: string[] }> {
    const c = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true, siretVerifieLe: true, naf: true, trades: true, achatsGroupesExclusJusquau: true } });
    if (c.naf && (estCommerceDeGros(c.naf) || !estActiviteBatiment(c.naf))) throw new DomainError("forbidden", PHRASE_ACTIVITE_REFUSEE, { reason: "activite_refusee", message: PHRASE_ACTIVITE_REFUSEE });
    if (!c.siretVerifieLe) throw new DomainError("forbidden", "Verified SIRET required", { reason: "siret_requis", message: "Vérifie ton SIRET dans ton profil pour rejoindre un achat groupé." });
    if (exclu(c.achatsGroupesExclusJusquau, this.now())) {
      const message = phraseExclusion(c.achatsGroupesExclusJusquau!);
      throw new DomainError("forbidden", message, { reason: "exclu", message });
    }
    return c;
  }

  /** Le métier de l'achat : la première famille du métier de l'entreprise, sinon celle de la plupart des lignes. */
  private metierDe(trades: readonly string[], familles: readonly string[]): string {
    const duMetier = trades.flatMap((t) => famillesDuMetier(t)).find((f) => this.cfg.familles.includes(f));
    if (duMetier) return duMetier;
    const compte = new Map<string, number>();
    for (const f of familles) compte.set(f, (compte.get(f) ?? 0) + 1);
    return [...compte.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? familles[0] ?? "couverture";
  }

  /* ---------------------------------------------------------------------------------------------- le catalogue */

  /**
   * Le catalogue : la recherche par mots, et L'ARBRE DE CHOIX par métier (Greg, 27 octobre 2026 : « un seul bouton
   * ardoise, puis format, puis choix ; on est multimétier ») : les métiers de l'entreprise d'abord, puis les autres.
   */
  async catalogue(tenant: TenantContext, q: string) {
    const c = await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { trades: true } });
    const miennes = new Set((c?.trades ?? []).flatMap((t) => famillesDuMetier(t)));
    const toutes = famillesDuCatalogue().filter((f) => this.cfg.familles.includes(f));
    const familles = [...toutes.filter((f) => miennes.has(f)), ...toutes.filter((f) => !miennes.has(f))].map((f) => ({ famille: f, libelle: libelleMetier(f), mienne: miennes.has(f) }));
    // Le métier de l'entreprise, même sans catalogue (Greg, 27 octobre, électricien : « j'ai toujours des propositions
    // de couvreur ») : l'écran le dit au lieu de proposer les matériaux d'un autre métier.
    const premiere = [...miennes][0] ?? null;
    return {
      references: rechercherCatalogue(q).map((e) => ({ designation: e.designation, unite: e.unite })),
      familles,
      arbre: Object.fromEntries(familles.map((f) => [f.famille, arbreCatalogue(f.famille)])),
      monMetier: premiere ? { libelle: LIBELLES_FAMILLES[premiere] ?? libelleMetier(premiere), catalogue: familles.some((f) => f.mienne) } : null,
    };
  }

  /**
   * Les négoces proposés : ses habituels (carnet), puis les négoces inscrits du département ; la recherche se fait par
   * E-MAIL d'abord (Greg, 27 octobre, capture iPhone : « il faut pas un SIRET ou un nom, mais un mail »), nom ou SIRET.
   */
  async negoces(tenant: TenantContext, q: string) {
    const t = q.trim();
    const siret = t.replace(/\s/g, "");
    const habituels = await this.prisma.supplier.findMany({
      where: { companyId: tenant.companyId, archivedAt: null, ...(t ? { OR: [{ name: { contains: t, mode: "insensitive" as const } }, { email: { contains: t, mode: "insensitive" as const } }] } : {}) },
      select: { id: true, name: true, phone: true, email: true },
      orderBy: { name: "asc" },
      take: 20,
    });
    const zone = await this.ports.zoneDe(tenant.companyId);
    const inscrits = t
      ? await this.prisma.negoce.findMany({
          where: { stopLe: null, OR: [{ nom: { contains: t, mode: "insensitive" } }, { email: { contains: t, mode: "insensitive" } }, ...(/^\d{9,14}$/.test(siret) ? [{ siret: { startsWith: siret } }] : [])] },
          select: { id: true, nom: true, departement: true, email: true },
          orderBy: { nom: "asc" },
          take: 20,
        })
      : zone
        ? await this.prisma.negoce.findMany({ where: { stopLe: null, departement: zone }, select: { id: true, nom: true, departement: true, email: true }, orderBy: { nom: "asc" }, take: 20 })
        : [];
    return { habituels: habituels.map((h) => ({ supplierId: h.id, nom: h.name, telephone: h.phone, email: h.email })), inscrits: inscrits.map((n) => ({ negoceId: n.id, nom: n.nom, departement: n.departement, email: n.email })) };
  }

  /* ------------------------------------------------------------------------------- s'engager (A1 à A3, B6 à B9) */

  /** L'accès (point 25) : abonné, ou le tout premier achat groupé, offert. */
  private async droit(companyId: string) {
    const engagementsPasses = await this.prisma.besoinNegocie.count({ where: { companyId, engageLe: { not: null } } });
    return droitAchatGroupe({ abonne: await this.ports.abonne(companyId), engagementsPasses });
  }

  /**
   * Rejoindre (ou ouvrir) l'achat groupé de son métier et de son secteur avec des lignes rattachées au catalogue, en
   * s'engageant. Déjà dedans : les lignes s'ajoutent (même référence : la quantité s'additionne).
   */
  async engager(tenant: TenantContext, e: Engagement) {
    assertCanWrite(tenant);
    await this.exigerAutomatique();
    const company = await this.exigerEntreprise(tenant.companyId);
    if (!e.engagement) throw validationFailed("Commitment required", { reason: "engagement_requis", message: "Coche la case d'engagement pour rejoindre l'achat groupé." });
    if (e.negoces.length === 0) throw validationFailed(PHRASE_NEGOCE_OBLIGATOIRE, { reason: "negoce_obligatoire", message: PHRASE_NEGOCE_OBLIGATOIRE });
    if (e.lignes.length === 0) throw validationFailed("Nothing to add", { reason: "rien_a_lancer", message: "Coche au moins une ligne rattachée au catalogue." });
    const lignes = e.lignes.map((l) => {
      const r = referenceStricte(l.designation);
      if (!r.ok || !this.cfg.familles.includes(r.reference.famille))
        throw validationFailed("Reference not precise enough", { reason: "reference_imprecise", message: `« ${l.designation} » n'est pas une référence du catalogue : elle reste en demande perso.` });
      if (!(l.quantite > 0)) throw validationFailed("Quantity required", { reason: "quantite_requise" });
      return { ...l, ref: r.reference };
    });
    const maintenant = this.now();
    const departement = zoneDuCodePostal(e.livraison);
    if (!departement) throw validationFailed("A delivery town with a postcode is required", { reason: "livraison_requise", message: "Indique la commune de livraison avec son code postal." });
    await this.ports.exigerZone(tenant.companyId, departement);

    let achat = null as Awaited<ReturnType<PrismaService["regroupementNegocie"]["findFirst"]>>;
    let cree = false;
    if (e.achatId) {
      if (!isUuid(e.achatId)) throw notFound("AchatGroupe");
      achat = await this.prisma.regroupementNegocie.findFirst({ where: { id: e.achatId, mode: MODE_AUTO, statut: OUVERT, clotureLe: { gt: maintenant }, departement } });
      if (!achat) throw new DomainError("conflict", "This group purchase is closed", { reason: "achat_clos", message: "Cet achat groupé est clos ou hors de ton secteur." });
    } else {
      const famille = this.metierDe(company.trades, lignes.map((l) => l.ref.famille));
      if (!e.dateBesoin) throw validationFailed("Date required", { reason: "date_requise", message: "Indique ta date de livraison." });
      const dates = this.dates(e.dateBesoin);
      if (dates.clotureLe <= maintenant) throw validationFailed(PHRASE_DATE_TROP_PROCHE, { reason: "date_trop_proche", message: PHRASE_DATE_TROP_PROCHE });
      achat = await this.achatCompatible(famille, departement, e.dateBesoin, maintenant);
      if (!achat) {
        const secteur = communeDe(e.livraison) ?? departement;
        achat = await this.prisma.regroupementNegocie.create({
          data: { mode: MODE_AUTO, cle: `metier:${famille}`, libelle: titreAchatGroupe({ famille, secteur, dateBesoin: e.dateBesoin }), famille, departement, unite: null, dateBesoinMin: e.dateBesoin, clotureLe: dates.clotureLe, reponseAvantLe: dates.reponseAvantLe },
        });
        cree = true;
      }
    }
    const dateBesoin = achat.dateBesoinMin ?? e.dateBesoin ?? achat.clotureLe!;
    const negoces = await Promise.all(e.negoces.map((n) => this.negoceDe(tenant, n)));

    let besoin = await this.prisma.besoinNegocie.findFirst({ where: { companyId: tenant.companyId, regroupementId: achat.id, statut: ENGAGE } });
    const ajoute = !!besoin;
    let offert = false;
    let phraseDroit: string | null = null;
    if (!besoin) {
      const d = await this.droit(tenant.companyId);
      if (!d.ok) throw new DomainError("abonnement_requis", d.phrase!, { reason: "achat_groupe", refus: "achat_groupe", phrase: d.phrase });
      offert = d.offert;
      phraseDroit = d.phrase;
      besoin = await this.prisma.besoinNegocie.create({
        data: { companyId: tenant.companyId, designation: achat.libelle, cle: achat.cle, famille: achat.famille, quantite: 0, unite: "lignes", departement, livraison: e.livraison, dateBesoin, statut: ENGAGE, regroupementId: achat.id, engageLe: maintenant, offert },
      });
    }
    for (const l of lignes) {
      const deja = await this.prisma.ligneAchatGroupe.findUnique({ where: { besoinId_cle_unite: { besoinId: besoin.id, cle: l.ref.cle, unite: l.unite } } });
      if (deja) await this.prisma.ligneAchatGroupe.update({ where: { id: deja.id }, data: { quantite: Number(deja.quantite) + l.quantite } });
      else
        await this.prisma.ligneAchatGroupe.create({
          data: { besoinId: besoin.id, regroupementId: achat.id, companyId: tenant.companyId, cle: l.ref.cle, libelle: l.ref.libelle, famille: l.ref.famille, unite: l.unite, quantite: l.quantite, projectId: l.projectId ?? null, articleKey: l.articleKey ?? null, designationOrigine: l.designation },
        });
    }
    await this.prisma.besoinNegocie.update({ where: { id: besoin.id }, data: { quantite: await this.prisma.ligneAchatGroupe.count({ where: { besoinId: besoin.id } }) } });
    await this.ajouterNegoces(besoin.id, achat.id, tenant.companyId, negoces);
    if (cree) await this.alerter(achat.id, tenant.companyId).catch(() => undefined);
    return { besoinId: besoin.id, achatId: achat.id, titre: achat.libelle, ajoute, rejoint: !cree && !ajoute, offert, phrase: phraseDroit, ...(await this.ecranPrevenir(tenant, besoin.id)) };
  }

  private dates(dateBesoin: Date) {
    return datesAchatGroupePanier(dateBesoin, { delaiLivraisonJours: this.cfg.delaiLivraisonJours, delaiReponseJours: this.cfg.delaiReponseJours, validationAdminHeures: this.cfg.validationAdmin ? this.cfg.delaiValidationAdminHeures : 0 });
  }

  /** L'achat ouvert du même métier et du même secteur, livré à temps (au plus 30 jours avant sa date). */
  private async achatCompatible(famille: string, departement: string, dateBesoin: Date, maintenant: Date) {
    const ouverts = await this.prisma.regroupementNegocie.findMany({ where: { mode: MODE_AUTO, statut: OUVERT, famille, departement, clotureLe: { gt: maintenant } }, orderBy: { createdAt: "asc" } });
    return ouverts.find((a) => !!a.dateBesoinMin && a.dateBesoinMin.getTime() <= dateBesoin.getTime() && a.dateBesoinMin.getTime() >= dateBesoin.getTime() - 30 * JOUR) ?? null;
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
    // Lot final, point 2 : le prénom du commercial, pour que la demande lui soit adressée.
    const prenom = "prenom" in n ? (n.prenom?.trim() ?? null) || null : null;
    const existant = await this.prisma.supplier.findFirst({ where: { companyId: tenant.companyId, archivedAt: null, email: { equals: cible.email, mode: "insensitive" } }, select: { id: true, name: true, phone: true, contactName: true } });
    const s = existant ?? (await this.prisma.supplier.create({ data: { companyId: tenant.companyId, name: cible.nom, email: cible.email, phone: telephone, contactName: prenom, ...(cible.id ? { negoceId: cible.id } : {}) }, select: { id: true, name: true, phone: true, contactName: true } }));
    if (existant && ((telephone && !existant.phone) || (prenom && !existant.contactName))) await this.prisma.supplier.update({ where: { id: existant.id }, data: { ...(telephone && !existant.phone ? { phone: telephone } : {}), ...(prenom && !existant.contactName ? { contactName: prenom } : {}) } });
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

  /* ----------------------------------------------------------------- depuis une liste : cases, suggestion (A2, F22) */

  /**
   * Les lignes d'une liste pour l'achat groupé : la référence proposée et sa question (« C'est bien de l'ardoise 32×22 ? »),
   * la suggestion des grosses quantités (pré-cochées), le droit (premier offert), les règles et les achats ouverts.
   */
  async depuisListe(tenant: TenantContext, projectId: string) {
    const liste = await this.ports.lignesDeListe(tenant, projectId);
    const { source, lignes } = liste;
    // Une liste sans adresse (un devis sans chantier lu) : la livraison part de l'adresse de l'entreprise, modifiable.
    const adresse = liste.adresse ?? (await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { address: true } }))?.address ?? null;
    const vues = lignes.map((l) => {
      const r = rattachementPropose(l.designation);
      const groupable = !!r && this.cfg.familles.includes(r.famille);
      return { key: l.key, designation: l.designation, quantite: l.quantite, unite: l.unite, reference: groupable ? r!.libelle : null, famille: groupable ? r!.famille : null, question: groupable ? r!.question : null };
    });
    const suggerees = lignesASuggerer(vues, this.seuilsSuggestion).sort((a, b) => b.quantite - a.quantite);
    const premiere = suggerees[0];
    const zone = zoneDuCodePostal(adresse) ?? (await this.ports.zoneDe(tenant.companyId));
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { trades: true } });
    const familles = company.trades.flatMap((t) => famillesDuMetier(t)) as string[];
    const ouverts = zone && (await this.ports.mode()) === MODE_AUTO ? await this.prisma.regroupementNegocie.findMany({ where: { mode: MODE_AUTO, statut: OUVERT, departement: zone, clotureLe: { gt: this.now() }, ...(familles.length ? { famille: { in: familles } } : {}) }, orderBy: { clotureLe: "asc" }, take: 5 }) : [];
    const d = await this.droit(tenant.companyId);
    return {
      adresse,
      source,
      lignes: vues.map((l) => ({ ...l, suggeree: suggerees.includes(l) })),
      suggestion: premiere ? { phrase: phraseSuggestion({ quantite: `${qte(premiere.quantite)} ${premiere.unite}`, libelle: premiere.reference ?? premiere.designation }), keys: suggerees.map((l) => l.key) } : null,
      droit: { ok: d.ok, offert: d.offert, phrase: d.phrase },
      engagement: { phrase: PHRASE_ENGAGEMENT, regles: REGLES_ENGAGEMENT },
      achatsOuverts: ouverts.map((a) => ({ id: a.id, titre: a.libelle, clotureLe: a.clotureLe!.toISOString(), dateBesoin: a.dateBesoinMin ? jourIso(a.dateBesoinMin) : null })),
    };
  }

  /** Les lignes cochées et confirmées d'un tap partent dans l'achat groupé ; les autres restent en demande perso. */
  async lancerDepuisListe(tenant: TenantContext, projectId: string, d: { confirmees: string[]; dateBesoin: Date | null; livraison: string | null; negoces: NegoceAjoute[]; engagement: boolean; achatId: string | null }) {
    const { adresse, lignes } = await this.ports.lignesDeListe(tenant, projectId);
    const livraison = d.livraison ?? adresse ?? (await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { address: true } }))?.address ?? null;
    if (!livraison) throw validationFailed("A delivery town with a postcode is required", { reason: "livraison_requise", message: "Indique la commune de livraison avec son code postal." });
    const engagees: LigneEngagee[] = [];
    const perso: { key: string; designation: string }[] = [];
    for (const l of lignes) {
      const r = rattachementPropose(l.designation);
      if (d.confirmees.includes(l.key) && r && this.cfg.familles.includes(r.famille)) engagees.push({ designation: l.designation, quantite: l.quantite, unite: l.unite, projectId, articleKey: l.key });
      else perso.push({ key: l.key, designation: l.designation });
    }
    if (engagees.length === 0) throw validationFailed("Nothing confirmed", { reason: "rien_a_lancer", message: "Coche au moins une ligne rattachée au catalogue." });
    const r = await this.engager(tenant, { achatId: d.achatId, lignes: engagees, livraison, dateBesoin: d.dateBesoin, negoces: d.negoces, engagement: d.engagement });
    return { ...r, lancees: engagees.map((l) => ({ key: l.articleKey })), perso };
  }

  /* ---------------------------------------------------------------------------------- « Préviens ton négoce » */

  async ecranPrevenir(tenant: TenantContext, besoinId: string) {
    const b = await this.monBesoin(tenant, besoinId);
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: b.regroupementId! } });
    const user = await this.prisma.user.findUnique({ where: { id: tenant.userId }, select: { name: true } });
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { name: true } });
    const references = cumulerPanier(await this.lignesPanier(a.id)).length;
    const metier = libelleMetier(a.famille).toLowerCase();
    const sms = smsPrevenir({ libelle: `la ${metier}`, clotureLe: a.clotureLe!, prenom: (user?.name ?? "").trim().split(/\s+/)[0] ?? "", entreprise: company.name });
    const negoces = await this.prisma.negoceParticipant.findMany({ where: { besoinId: b.id }, orderBy: { createdAt: "asc" } });
    return {
      prevenir: {
        titre: "Préviens ton négoce",
        texte: ecranPrevenir({ volumeTotal: `${references} référence${references > 1 ? "s" : ""}`, libelle: metier, clotureLe: a.clotureLe! }),
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

  /* ------------------------------------------------------------------- modifier, retirer, sortir (B8) */

  private async monBesoin(tenant: TenantContext, besoinId: string) {
    if (!isUuid(besoinId)) throw notFound("Besoin");
    const b = await this.prisma.besoinNegocie.findFirst({ where: { id: besoinId, companyId: tenant.companyId, regroupement: { mode: MODE_AUTO } } });
    if (!b?.regroupementId) throw notFound("Besoin");
    return b;
  }

  private async avantCloture(regroupementId: string) {
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: regroupementId } });
    if (a.statut !== OUVERT || !a.clotureLe || a.clotureLe <= this.now()) throw new DomainError("conflict", "Registrations are closed", { reason: "cloture_passee", message: "Les inscriptions sont closes : tes quantités sont annoncées aux négoces." });
    return a;
  }

  /** Avant la clôture : changer une quantité (0 retire la ligne), ajouter un négoce. */
  async modifier(tenant: TenantContext, besoinId: string, d: { quantites?: Record<string, number>; negoces?: NegoceAjoute[] }) {
    assertCanWrite(tenant);
    const b = await this.monBesoin(tenant, besoinId);
    if (b.statut !== ENGAGE) throw new DomainError("conflict", "Not open", { reason: "besoin_ferme" });
    await this.avantCloture(b.regroupementId!);
    for (const [ligneId, quantite] of Object.entries(d.quantites ?? {})) {
      if (!isUuid(ligneId)) continue;
      if (quantite <= 0) await this.prisma.ligneAchatGroupe.deleteMany({ where: { id: ligneId, besoinId: b.id } });
      else await this.prisma.ligneAchatGroupe.updateMany({ where: { id: ligneId, besoinId: b.id }, data: { quantite } });
    }
    if ((await this.prisma.ligneAchatGroupe.count({ where: { besoinId: b.id } })) === 0) return this.retirer(tenant, b.id);
    if (d.negoces?.length) await this.ajouterNegoces(b.id, b.regroupementId!, tenant.companyId, await Promise.all(d.negoces.map((n) => this.negoceDe(tenant, n))));
    return this.detail(tenant, b.id);
  }

  /** Retirer un négoce de sa participation (au moins un doit rester). */
  async retirerNegoce(tenant: TenantContext, besoinId: string, participantId: string) {
    assertCanWrite(tenant);
    const b = await this.monBesoin(tenant, besoinId);
    await this.avantCloture(b.regroupementId!);
    const n = await this.prisma.negoceParticipant.count({ where: { besoinId: b.id } });
    if (n <= 1) throw validationFailed(PHRASE_NEGOCE_OBLIGATOIRE, { reason: "negoce_obligatoire", message: PHRASE_NEGOCE_OBLIGATOIRE });
    await this.prisma.negoceParticipant.deleteMany({ where: { id: participantId, besoinId: b.id } });
    return this.detail(tenant, b.id);
  }

  /** Avant la clôture, rien n'est encore annoncé aux négoces : « Retirer ma liste » ne compte pas comme une sortie. */
  async retirer(tenant: TenantContext, besoinId: string) {
    assertCanWrite(tenant);
    const b = await this.monBesoin(tenant, besoinId);
    if (b.statut !== ENGAGE) throw new DomainError("conflict", "Not open", { reason: "besoin_ferme" });
    await this.avantCloture(b.regroupementId!);
    await this.prisma.$transaction([
      this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { statut: "retire" } }),
      this.prisma.desistementAchatGroupe.create({ data: { besoinId: b.id, companyId: tenant.companyId, regroupementId: b.regroupementId!, quantite: b.quantite, apresCloture: false, raison: "retire_avant_cloture" } }),
    ]);
    return { fait: true };
  }

  /** Après la clôture : une des deux sorties, en un clic, avec son motif (point 8). Comptée pour la règle d'exclusion. */
  async sortir(tenant: TenantContext, besoinId: string, motif: MotifSortie) {
    assertCanWrite(tenant);
    const b = await this.monBesoin(tenant, besoinId);
    if (b.statut !== ENGAGE) throw new DomainError("conflict", "Not open", { reason: "besoin_ferme" });
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: b.regroupementId! } });
    if (a.statut === OUVERT && a.clotureLe && a.clotureLe > this.now()) throw new DomainError("conflict", "Still open: withdraw instead", { reason: "avant_cloture" });
    const maintenant = this.now();
    await this.prisma.$transaction([
      this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { statut: "sorti", sortieMotif: motif, sortieLe: maintenant, desisteLe: maintenant } }),
      this.prisma.desistementAchatGroupe.create({ data: { besoinId: b.id, companyId: tenant.companyId, regroupementId: a.id, quantite: b.quantite, apresCloture: true, raison: motif } }),
    ]);
    const fin = await this.recalculerExclusion(tenant.companyId);
    return { fait: true, exclusion: fin ? phraseExclusion(fin) : null };
  }

  /** La règle des sorties : plus d'une sortie par trimestre, ou une commande pas passée sans motif. */
  private async recalculerExclusion(companyId: string): Promise<Date | null> {
    const d = await this.prisma.desistementAchatGroupe.findMany({ where: { companyId, apresCloture: true }, select: { raison: true, le: true } });
    const fin = exclusionJusquau(
      { sorties: d.filter((x) => (MOTIFS_SORTIE as readonly string[]).includes(x.raison ?? "")).map((x) => x.le), nonCommandesSansMotif: d.filter((x) => x.raison === "non_commande").map((x) => x.le) },
      this.cfg.exclusionMois,
    );
    await this.prisma.company.update({ where: { id: companyId }, data: { achatsGroupesExclusJusquau: fin } });
    return fin && exclu(fin, this.now()) ? fin : null;
  }

  /* -------------------------------------------------------------------------------------------- les vues */

  private lignesPanier(regroupementId: string): Promise<LignePanier[]> {
    return this.prisma.ligneAchatGroupe
      .findMany({ where: { regroupementId, besoin: { statut: { in: [ENGAGE, "accepte"] } } }, select: { cle: true, libelle: true, famille: true, unite: true, quantite: true } })
      .then((ls) => ls.map((l) => ({ ...l, quantite: Number(l.quantite) })));
  }

  /** Le volume estimé (€ HT) : prix repère de chaque ligne, sinon le dernier prix de son artisan ; null sans prix. */
  private async volumeEstime(regroupementId: string): Promise<{ estimeHt: number | null; entreprises: number }> {
    const lignes = await this.prisma.ligneAchatGroupe.findMany({ where: { regroupementId, besoin: { statut: { in: [ENGAGE, "accepte"] } } }, select: { companyId: true, cle: true, unite: true, quantite: true } });
    const entreprises = new Set(lignes.map((l) => l.companyId)).size;
    let estime = 0;
    for (const l of lignes) {
      const unite = uniteRepere(l.unite);
      const repere = this.cfg.prixReperes[`${l.cle.split("|")[0]}:${unite}`] ?? null;
      const pu = repere ?? (await this.ports.dernierPrixPour(l.companyId))(l.cle, unite);
      if (pu === null) return { estimeHt: null, entreprises };
      estime += pu * Number(l.quantite);
    }
    return { estimeHt: arrondi(estime), entreprises };
  }

  private async carte(besoinId: string, volumes: Record<string, number>) {
    const b = await this.prisma.besoinNegocie.findUniqueOrThrow({ where: { id: besoinId }, include: { negoces: { orderBy: { createdAt: "asc" } }, lignes: { orderBy: { createdAt: "asc" } } } });
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: b.regroupementId! } });
    const v = await this.volumeEstime(a.id);
    const references = cumulerPanier(await this.lignesPanier(a.id)).length;
    const etat = etatCarte(
      { statut: a.statut, clotureLe: a.clotureLe, reponseAvantLe: a.reponseAvantLe, entreprises: v.entreprises, total: v.entreprises >= this.cfg.seuilAnonymat ? `${references} références` : null },
      { statut: b.statut },
      this.cfg.seuilAnonymat,
    );
    const maintenant = this.now();
    const ouvert = a.statut === OUVERT && !!a.clotureLe && a.clotureLe > maintenant;
    const publie = a.statut === "publie";
    const aTemps = !a.commandeAvantLe || a.commandeAvantLe > maintenant;
    return {
      id: b.id,
      achatId: a.id,
      titreAchat: a.libelle,
      metier: libelleMetier(a.famille),
      lignes: b.lignes.map((l) => ({ id: l.id, cle: l.cle, libelle: l.libelle, quantite: Number(l.quantite), unite: l.unite })),
      ...etat,
      jauge: a.statut === OUVERT ? jaugeVolume(v.estimeHt, volumeMinimum(a.famille, volumes), v.entreprises, this.cfg.seuilAnonymat) : null,
      commune: communeDe(b.livraison) ?? b.livraison,
      dateBesoin: jourIso(b.dateBesoin),
      clotureLe: a.clotureLe?.toISOString() ?? null,
      reponseAvantLe: a.reponseAvantLe?.toISOString() ?? null,
      commandeAvantLe: a.commandeAvantLe?.toISOString() ?? null,
      offert: b.offert,
      actions: {
        modifier: ouvert && b.statut === ENGAGE,
        retirer: ouvert && b.statut === ENGAGE,
        sortir: !ouvert && b.statut === ENGAGE && ["consultation", "validation", "publie", "pas_assez"].includes(a.statut),
        planB: a.statut === "pas_assez" && b.statut === ENGAGE,
        commander: publie && b.statut === ENGAGE && aTemps,
        livre: b.statut === "accepte" && !b.livreLe && !b.problemeLe,
      },
      motifsSortie: MOTIFS_SORTIE.map((m) => ({ valeur: m, libelle: LIBELLES_MOTIFS_SORTIE[m] })),
      negoces: b.negoces.map((n) => ({ id: n.id, nom: n.nom, telephone: n.telephone, prevenu: !!n.prevenuLe, parti: !!n.partiLe })),
      bonNumero: b.bonNumero,
      commandeRecue: !!b.commandeRecueLe,
      livre: !!b.livreLe,
      probleme: b.problemeTexte,
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
      const { _a, _b, ...c } = await this.carte(b.id, volumes);
      void _a;
      void _b;
      cartes.push(c);
    }
    const c = await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { alertesAchatsGroupes: true, achatsGroupesExclusJusquau: true } });
    const exclusion = c?.achatsGroupesExclusJusquau && exclu(c.achatsGroupesExclusJusquau, this.now()) ? phraseExclusion(c.achatsGroupesExclusJusquau) : null;
    const d = await this.droit(tenant.companyId);
    return { mode: await this.ports.mode(), achats: cartes, alertes: lireReglageAlertes(c?.alertesAchatsGroupes), exclusion, droit: { ok: d.ok, offert: d.offert, phrase: d.phrase }, engagement: { phrase: PHRASE_ENGAGEMENT, regles: REGLES_ENGAGEMENT } };
  }

  /** Le détail d'une participation : la frise, ses lignes, ses négoces ; après la publication, la comparaison sur SES lignes. */
  async detail(tenant: TenantContext, besoinId: string) {
    await this.monBesoin(tenant, besoinId);
    const { _a: a, _b: b, ...c } = await this.carte(besoinId, await this.volumesMin());
    const resultat = a.statut === "publie" || b.statut === "accepte" ? await this.resultatPour(a, b) : null;
    if (resultat && !b.offreVueLe) await this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { offreVueLe: this.now() } });
    return {
      ...c,
      frise: { etapes: ETAPES_ACHAT_GROUPE, courante: etapeCourante(a.statut, b.statut) },
      invite: "Un collègue du métier commande aussi ? Invite-le",
      resultat,
    };
  }

  /** Les prix effectifs d'une offre : sa réponse, corrigée par l'admin. */
  private prixEffectifs(c: Pick<Consultation, "prixLignes" | "prixCorriges">): ReponseLignes {
    return { ...objet(c.prixLignes), ...objet(c.prixCorriges) };
  }

  private offresDe(consultations: readonly Consultation[]): OffreNegocePanier[] {
    return consultations.filter((c) => c.reponduLe).map((c) => ({ id: c.id, nom: c.nom, prix: this.prixEffectifs(c), ecartee: !!c.ecarteeLe }));
  }

  /**
   * Points 13 et 17 : SES lignes chez chaque négoce (complètes d'abord, puis la moins chère), la meilleure, son négoce
   * habituel, la phrase, et ce qu'il faut pour commander (compte ouvert ou conditions d'ouverture).
   */
  private async resultatPour(a: { id: string }, b: { id: string; consultationCommandeId: string | null; coordonneesTransmisesLe: Date | null; coordonneesConsultationId: string | null }) {
    const consultations = await this.prisma.consultationAchatGroupe.findMany({ where: { regroupementId: a.id } });
    const mesLignes = await this.prisma.ligneAchatGroupe.findMany({ where: { besoinId: b.id }, orderBy: { createdAt: "asc" } });
    const comparees = comparerPourArtisan(mesLignes.map((l) => ({ cle: l.cle, quantite: Number(l.quantite) })), this.offresDe(consultations));
    const mesEmails = new Set((await this.prisma.negoceParticipant.findMany({ where: { besoinId: b.id }, select: { email: true } })).map((n) => n.email));
    const parId = new Map(consultations.map((c) => [c.id, c]));
    const conditions = new Map((await this.prisma.conditionsOuvertureNegoce.findMany({ where: { email: { in: consultations.map((c) => c.email) } } })).map((x) => [x.email, x]));
    const meilleure = comparees[0] ?? null;
    const habituelles = comparees.filter((o) => mesEmails.has(parId.get(o.id)!.email));
    const monNegoce = habituelles.find((o) => o.complete) ?? habituelles[0] ?? null;
    const offres = comparees.map((o) => {
      const c = parId.get(o.id)!;
      const prix = this.prixEffectifs(c);
      const cond = conditions.get(c.email);
      return {
        consultationId: o.id,
        nom: o.nom,
        totalHt: o.totalHt,
        complete: o.complete,
        manquantes: phraseManquantes(o.manquantes),
        habituel: mesEmails.has(c.email),
        lignes: mesLignes.map((l) => ({ libelle: l.libelle, quantite: Number(l.quantite), unite: l.unite, prixHt: prixDe(prix, l.cle) })),
        ouvertureCompte: mesEmails.has(c.email) ? null : phraseOuvertureCompte(cond ? { pieces: cond.pieces as ConditionOuverture[], paiement: cond.paiement as PaiementDepart | null, autre: cond.autre } : null),
        telephone: c.telephone,
      };
    });
    return {
      phrase: meilleure ? phrasePublication(meilleure.totalHt, monNegoce && monNegoce.id !== meilleure.id ? monNegoce.totalHt : null) : null,
      meilleure: offres[0] ?? null,
      monNegoce: monNegoce ? (offres.find((o) => o.consultationId === monNegoce.id) ?? null) : null,
      offres,
      commandeChez: b.consultationCommandeId ? (parId.get(b.consultationCommandeId)?.nom ?? null) : null,
      coordonneesTransmises: b.coordonneesTransmisesLe ? (parId.get(b.coordonneesConsultationId ?? "")?.nom ?? "") : null,
      // Lot final (ton) : après sa commande, seulement si l'économie du groupe est réelle et calculée.
      economie: b.consultationCommandeId ? phraseEconomieGroupe(await this.economieGroupe(a.id, consultations)) : null,
    };
  }

  /**
   * L'économie du groupe, calculée et jamais estimée : pour chaque artisan qui a commandé, le total de SES lignes chez
   * son négoce habituel moins le total chez le négoce commandé, quand les deux offres sont complètes ; null sinon.
   */
  private async economieGroupe(regroupementId: string, consultations: Consultation[]): Promise<number | null> {
    const commandes = await this.prisma.besoinNegocie.findMany({ where: { regroupementId, consultationCommandeId: { not: null } }, select: { id: true, consultationCommandeId: true } });
    const offres = this.offresDe(consultations);
    const emailDe = new Map(consultations.map((c) => [c.id, c.email]));
    let total = 0;
    let calcule = false;
    for (const b of commandes) {
      const lignes = await this.prisma.ligneAchatGroupe.findMany({ where: { besoinId: b.id }, select: { cle: true, quantite: true } });
      const comparees = comparerPourArtisan(lignes.map((l) => ({ cle: l.cle, quantite: Number(l.quantite) })), offres);
      const mesEmails = new Set((await this.prisma.negoceParticipant.findMany({ where: { besoinId: b.id }, select: { email: true } })).map((n) => n.email));
      const commandee = comparees.find((o) => o.id === b.consultationCommandeId);
      const habituel = comparees.find((o) => o.complete && mesEmails.has(emailDe.get(o.id) ?? ""));
      if (!commandee?.complete || !habituel || habituel.id === commandee.id) continue;
      total += habituel.totalHt - commandee.totalHt;
      calcule = true;
    }
    return calcule ? total : null;
  }

  /** « Achats groupés de ton métier dans ton secteur » : les achats ouverts qu'il n'a pas rejoints. */
  async presDeChezMoi(tenant: TenantContext) {
    const zone = await this.ports.zoneDe(tenant.companyId);
    if (!zone || (await this.ports.mode()) !== MODE_AUTO) return { zone, achats: [] };
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { trades: true } });
    const familles = new Set<string>(company.trades.flatMap((t) => famillesDuMetier(t)));
    const ouverts = await this.prisma.regroupementNegocie.findMany({ where: { mode: MODE_AUTO, statut: OUVERT, departement: zone, clotureLe: { gt: this.now() } }, orderBy: { clotureLe: "asc" }, take: 30 });
    const miens = new Set((await this.prisma.besoinNegocie.findMany({ where: { companyId: tenant.companyId, regroupementId: { in: ouverts.map((o) => o.id) }, statut: ENGAGE }, select: { regroupementId: true } })).map((b) => b.regroupementId));
    const volumes = await this.volumesMin();
    const achats = [];
    for (const a of ouverts.filter((o) => !miens.has(o.id) && (familles.size === 0 || familles.has(o.famille)))) {
      const v = await this.volumeEstime(a.id);
      if (v.entreprises === 0) continue;
      achats.push({
        id: a.id,
        titre: a.libelle,
        metier: libelleMetier(a.famille),
        zone,
        dateBesoin: a.dateBesoinMin ? jourIso(a.dateBesoinMin) : null,
        clotureLe: a.clotureLe!.toISOString(),
        phrase: phraseAlerteMetier({ famille: a.famille, dateBesoin: a.dateBesoinMin ?? a.clotureLe!, clotureLe: a.clotureLe! }),
        entreprises: v.entreprises >= this.cfg.seuilAnonymat ? v.entreprises : null,
        jauge: jaugeVolume(v.estimeHt, volumeMinimum(a.famille, volumes), v.entreprises, this.cfg.seuilAnonymat),
      });
    }
    return { zone, achats };
  }

  /* ------------------------------------------------------------------------------------------ les alertes (F21) */

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
   * Point 21 : un nouvel achat groupé prévient les artisans du même métier et du même secteur (notification + e-mail),
   * au plus N par jour ; au-delà, ou réglage « résumé », il attend le résumé du jour.
   */
  private async alerter(regroupementId: string, lanceur: string) {
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: regroupementId } });
    const maintenant = this.now();
    const jour = new Date(`${jourIso(maintenant)}T00:00:00Z`);
    const candidats = await this.prisma.company.findMany({ where: { id: { not: lanceur }, address: { contains: a.departement.slice(0, 2) } }, select: { id: true, address: true, trades: true, alertesAchatsGroupes: true } });
    const phrase = phraseAlerteMetier({ famille: a.famille, dateBesoin: a.dateBesoinMin ?? a.clotureLe!, clotureLe: a.clotureLe! });
    let n = 0;
    for (const c of candidats) {
      if (zoneDuCodePostal(c.address) !== a.departement) continue;
      const familles: string[] = c.trades.flatMap((t) => famillesDuMetier(t));
      if (familles.length && !familles.includes(a.famille)) continue;
      const envoyees = await this.prisma.alerteAchatGroupe.count({ where: { companyId: c.id, jour, envoyeeLe: { not: null }, resume: false } });
      const decision = decisionAlerte(lireReglageAlertes(c.alertesAchatsGroupes), envoyees, this.cfg.alertesJour);
      if (decision === "rien") continue;
      if (await this.prisma.alerteAchatGroupe.findUnique({ where: { companyId_regroupementId: { companyId: c.id, regroupementId } } })) continue;
      if (decision === "resume") {
        await this.prisma.alerteAchatGroupe.create({ data: { companyId: c.id, regroupementId, jour, resume: true } });
        continue;
      }
      await this.prisma.alerteAchatGroupe.create({ data: { companyId: c.id, regroupementId, jour, envoyeeLe: maintenant } });
      const url = `/achats-groupes/lancer?rejoindre=${a.id}`;
      await this.notifs.prevenir(c.id, { titre: "Achat groupé dans ton secteur", corps: phrase, url, etiquette: `achat-${a.id}` }, { objet: `Achat groupé ${libelleMetier(a.famille).toLowerCase()} ouvert dans ton secteur`, texte: `${phrase}\n\nAjouter ma liste : ${this.notifs.lienVers(url)}\n\n${NOM_APP}` }).catch(() => undefined);
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
      const phrase = ouvertes.length === 1 ? phraseAlerteMetier({ famille: ouvertes[0]!.regroupement.famille, dateBesoin: ouvertes[0]!.regroupement.dateBesoinMin ?? ouvertes[0]!.regroupement.clotureLe!, clotureLe: ouvertes[0]!.regroupement.clotureLe! }) : phraseResumeAlertes(ouvertes.map((x) => ({ libelle: x.regroupement.libelle, zone: x.regroupement.departement, clotureLe: x.regroupement.clotureLe! })));
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
      if ((await this.cloturer(a.id, maintenant)) === "consultation") consultes++;
      else pasAssez++;
    }
    const echues = await this.prisma.regroupementNegocie.findMany({ where: { mode: MODE_AUTO, statut: "consultation", reponseAvantLe: { lte: maintenant } }, select: { id: true } });
    let analyses = 0;
    for (const a of echues) {
      await this.analyser(a.id, maintenant);
      analyses++;
    }
    const relances = await this.relancesConsultations(maintenant);
    const rappelsValidation = await this.rappelerValidation(maintenant);
    const nonCommandes = await this.nonCommandes(maintenant);
    const resumes = await this.resumes(maintenant);
    const factures = maintenant.getUTCDate() === 1 ? await this.preparerFactures(maintenant) : 0;
    return { rappels, consultes, pasAssez, analyses, relances, rappelsValidation, nonCommandes, resumes, factures };
  }

  /**
   * LES RELANCES DE LA CONSULTATION (lot final, point 6) : à mi-délai, le négoce qui n'a pas répondu reçoit « Votre client
   * … attend votre offre » (une fois) ; chaque artisan est prévenu pour SES négoces seulement, à mi-délai puis la veille,
   * avec « Plus il y a de négoces qui répondent, meilleur est le prix pour tout le groupe. » Rien après une réponse.
   */
  private async relancesConsultations(maintenant: Date): Promise<{ negoces: number; artisans: number }> {
    const consultations = await this.prisma.consultationAchatGroupe.findMany({
      where: { envoyeLe: { not: null }, reponduLe: null, ecarteeLe: null, regroupement: { statut: "consultation", reponseAvantLe: { gt: maintenant } } },
      include: { regroupement: { select: { id: true, reponseAvantLe: true } } },
    });
    let negoces = 0;
    let artisans = 0;
    for (const c of consultations) {
      const dateLimite = c.regroupement.reponseAvantLe!;
      const etat = { envoyeLe: c.envoyeLe!, dateLimite, reponduLe: null, refuseLe: null };
      const participants = await this.prisma.negoceParticipant.findMany({ where: { regroupementId: c.regroupementId, email: c.email, besoin: { statut: ENGAGE } }, include: { besoin: { select: { id: true } } } });
      if (relancesDues({ ...etat, rappelMiLe: null, rappelVeilleLe: null, relanceNegoceLe: c.relanceLe }, maintenant).negoce) {
        // Le lien de la demande reste le seul valable (la page, le PDF et l'Excel déjà ouverts) : le rappel y renvoie.
        await this.prisma.consultationAchatGroupe.update({ where: { id: c.id }, data: { relanceLe: maintenant } });
        const premier = participants[0]?.companyId;
        const prenom = participants[0]?.supplierId ? ((await this.prisma.supplier.findUnique({ where: { id: participants[0].supplierId }, select: { contactName: true } }))?.contactName ?? null) : null;
        const m = mailRelanceDemande({ entreprise: c.clients[0] ?? NOM_APP, dateLimite, lien: null, prenomCommercial: prenom });
        const from = premier && this.ports.expediteurMobiiz ? await this.ports.expediteurMobiiz(premier).catch(() => null) : null;
        const replyTo = premier ? await this.ports.adresseMobiiz(premier).catch(() => null) : null;
        await this.mailer.send({ to: c.email, subject: m.objet, text: m.texte, html: mailEnHtml(m.texte, null), ...(from ? { from } : {}), ...(replyTo ? { replyTo } : {}) }).catch(() => undefined);
        negoces++;
      }
      for (const n of participants) {
        const dues = relancesDues({ ...etat, rappelMiLe: n.rappelMiLe, rappelVeilleLe: n.rappelVeilleLe, relanceNegoceLe: maintenant }, maintenant);
        if (!dues.artisan) continue;
        await this.prisma.negoceParticipant.update({ where: { id: n.id }, data: dues.artisan === "mi" ? { rappelMiLe: maintenant } : { rappelMiLe: n.rappelMiLe ?? maintenant, rappelVeilleLe: maintenant } });
        const corps = `${phraseRelanceArtisan(n.nom)} ${TON.relanceGroupe}`;
        const url = `/achats-groupes/${n.besoin.id}`;
        const appeler = n.telephone ? `\n\nAppeler ${n.nom} : ${n.telephone}` : "";
        await this.notifs.prevenir(n.companyId, { titre: `${n.nom} n'a pas encore répondu`, corps, url, etiquette: `relance-${n.id}` }, { objet: `${n.nom} n'a pas encore répondu`, texte: `${corps}${appeler}\n\n${this.notifs.lienVers(url)}\n\n${NOM_APP}` }).catch(() => undefined);
        artisans++;
      }
    }
    return { negoces, artisans };
  }

  /** La veille de la clôture, « Demain, [négoce] reçoit la demande groupée… Tu l'as prévenu ? ». */
  private async rappelsVeille(maintenant: Date): Promise<number> {
    const negoces = await this.prisma.negoceParticipant.findMany({
      where: { rappelLe: null, prevenuLe: null, besoin: { statut: ENGAGE }, regroupement: { mode: MODE_AUTO, statut: OUVERT, clotureLe: { gt: maintenant, lte: new Date(maintenant.getTime() + 2 * JOUR) } } },
      include: { regroupement: { select: { famille: true } } },
    });
    for (const n of negoces) {
      await this.prisma.negoceParticipant.update({ where: { id: n.id }, data: { rappelLe: maintenant } });
      const corps = phraseRappelVeille(n.nom, `la ${libelleMetier(n.regroupement.famille).toLowerCase()}`);
      await this.notifs.prevenir(n.companyId, { titre: "Préviens ton négoce", corps, url: `/achats-groupes/${n.besoinId}`, etiquette: `rappel-${n.besoinId}` }).catch(() => undefined);
    }
    return negoces.length;
  }

  /**
   * La clôture (A4, A5, B7) : seul le volume engagé est annoncé. Chaque négoce choisi reçoit UNE liste propre (les
   * quantités cumulées de tout le groupe, seulement ses familles s'il est spécialiste), de la part de ses seuls clients ;
   * un panier de plusieurs métiers est aussi envoyé aux généralistes inscrits du secteur.
   */
  async cloturer(regroupementId: string, maintenant = this.now()): Promise<"consultation" | "pas_assez"> {
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: regroupementId } });
    const besoins = await this.prisma.besoinNegocie.findMany({ where: { regroupementId, statut: ENGAGE }, include: { negoces: true, company: { select: { id: true, name: true, prenom: true, phone: true, memberships: { select: { user: { select: { name: true } } }, take: 1, orderBy: { createdAt: "asc" } } } } }, orderBy: { createdAt: "asc" } });
    const panier = cumulerPanier(await this.lignesPanier(a.id));
    const v = await this.volumeEstime(a.id);
    const minimum = volumeMinimum(a.famille, await this.volumesMin());
    const negoces = new Map<string, { nom: string; telephone: string | null; besoins: typeof besoins }>();
    for (const b of besoins) for (const n of b.negoces) negoces.set(n.email, { nom: n.nom, telephone: n.telephone, besoins: [...(negoces.get(n.email)?.besoins ?? []), b] });
    if (new Set(panier.map((l) => l.famille)).size > 1) {
      const generalistes = await this.prisma.negoce.findMany({ where: { stopLe: null, generaliste: true, departement: a.departement }, select: { nom: true, email: true } });
      for (const g of generalistes) if (!negoces.has(g.email.toLowerCase())) negoces.set(g.email.toLowerCase(), { nom: g.nom, telephone: null, besoins: [] });
    }
    // Sans estimation (aucun prix repère ni « Mes prix »), le volume ne bloque pas : la consultation part.
    if (besoins.length === 0 || panier.length === 0 || negoces.size === 0 || (v.estimeHt !== null && v.estimeHt < minimum)) {
      await this.prisma.regroupementNegocie.update({ where: { id: a.id }, data: { statut: "pas_assez", pasAssezLe: maintenant } });
      for (const b of besoins) await this.notifs.prevenir(b.companyId, { titre: "Pas assez de volume cette fois", corps: `${a.libelle} : envoie ta liste à tes négoces en un clic, rien n'est perdu.`, url: `/achats-groupes/${b.id}`, etiquette: `achat-${a.id}` }).catch(() => undefined);
      return "pas_assez";
    }
    const commission = commissionAchatGroupe(a.numero, { defaut: this.cfg.commissionDefaut, lancement: this.cfg.commissionLancement, premiers: this.cfg.commissionLancementPremiers });
    await this.prisma.regroupementNegocie.update({ where: { id: a.id }, data: { statut: "consultation", consulteLe: maintenant, commissionPct: commission } });
    const livraisons = besoins.map((b) => ({ commune: communeDe(b.livraison) ?? b.departement, date: b.dateBesoin }));
    const inscrits = new Map((await this.prisma.negoce.findMany({ where: { email: { in: [...negoces.keys()], mode: "insensitive" }, stopLe: null }, select: { email: true, familles: true, generaliste: true } })).map((n) => [n.email.toLowerCase(), n]));
    for (const [email, n] of negoces) {
      const inscrit = inscrits.get(email);
      const lignes = lignesPourNegoce(panier, { generaliste: inscrit?.generaliste ?? false, familles: inscrit && inscrit.familles.length ? inscrit.familles : null });
      if (lignes.length === 0) continue;
      const jeton = randomBytes(24).toString("base64url");
      const clients = [...new Set(n.besoins.map((b) => b.company.name))];
      const c = await this.prisma.consultationAchatGroupe.upsert({
        where: { regroupementId_email: { regroupementId: a.id, email } },
        create: { regroupementId: a.id, email, nom: n.nom, telephone: n.telephone, clients, quantite: lignes.reduce((s, l) => s + l.quantite, 0), lignes: lignes as never, tokenHash: hacher(jeton), commissionPct: commission },
        update: {},
      });
      if (c.envoyeLe) continue;
      // Le jeton n'est connu que de l'e-mail : un envoi repris (panne du prestataire) reçoit un lien neuf.
      if (c.tokenHash !== hacher(jeton)) await this.prisma.consultationAchatGroupe.update({ where: { id: c.id }, data: { tokenHash: hacher(jeton) } });
      const lien = `${this.cfg.webAppUrl}/achat-groupe/${jeton}`;
      // LOT FINAL, point 3 : au prénom du commercial, signé par ses clients (prénom, entreprise, portable), le nombre
      // d'artisans seulement au-delà du seuil d'anonymat ; expéditeur « Entreprise via Mobiiz », PDF et Excel joints.
      const prenomCommercial = (await this.prisma.supplier.findFirst({ where: { companyId: { in: n.besoins.map((b) => b.companyId) }, email: { equals: email, mode: "insensitive" }, contactName: { not: null } }, select: { contactName: true } }))?.contactName ?? null;
      const signataires = [...new Map(n.besoins.map((b) => [b.company.id, { prenom: b.company.prenom ?? prenomDe(b.company.memberships[0]?.user.name ?? null), entreprise: b.company.name, portable: b.company.phone ? portableLisible(b.company.phone) : null }])).values()];
      const demande = demandeNegocePanier({ clients: clients.length ? clients : besoins.map((b) => b.company.name), metier: a.famille, secteur: a.libelle.split(" · ")[1]?.replace(/^secteur /i, "") ?? communeDe(n.besoins[0]?.livraison ?? null) ?? undefined, prenomCommercial, signataires: signataires.length ? signataires : undefined, artisans: new Set(besoins.map((b) => b.companyId)).size, seuilAnonymat: this.cfg.seuilAnonymat, lignes, livraisons, reponseAvantLe: a.reponseAvantLe!, lien, commissionPct: commission });
      const premier = n.besoins[0]?.companyId;
      const replyTo = premier ? await this.ports.adresseMobiiz(premier).catch(() => null) : null;
      const from = premier && this.ports.expediteurMobiiz ? await this.ports.expediteurMobiiz(premier).catch(() => null) : null;
      // La demande en PDF et en Excel, jointes (Greg, 28 octobre 2026, point 3 ; lot final) : les mêmes que sur la page.
      const pieceJointe = await this.demandePdfDe({ ...c, lignes: lignes as never, clients, regroupement: a }, jeton).catch(() => null);
      const excel = await this.demandeXlsx(jeton, { pieceJointe: true }).catch(() => null);
      const attachments = [
        ...(pieceJointe ? [{ filename: "demande-mobiiz.pdf", contentType: "application/pdf", contentBase64: Buffer.from(pieceJointe).toString("base64") }] : []),
        ...(excel ? [{ filename: "demande-mobiiz.xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", contentBase64: excel.toString("base64") }] : []),
      ];
      try {
        await this.mailer.send({ to: email, subject: demande.objet, text: demande.texte, html: mailEnHtml(demande.texte, lien), ...(from ? { from } : {}), ...(replyTo ? { replyTo } : {}), ...(attachments.length ? { attachments } : {}) });
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

  /* --------------------------------------------------------------------------- la réponse du négoce (C11, C12) */

  private async consultationDuJeton(jeton: string) {
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(jeton)) throw notFound("Consultation");
    const c = await this.prisma.consultationAchatGroupe.findUnique({ where: { tokenHash: hacher(jeton) }, include: { regroupement: true } });
    if (!c) throw notFound("Consultation");
    return c;
  }

  /** La page du lien (vouvoiement) : SA liste, les livraisons, les règles, ses conditions d'ouverture. Jamais un autre négoce. */
  async page(jeton: string) {
    const c = await this.consultationDuJeton(jeton);
    const a = c.regroupement;
    if (!c.vuLe) await this.prisma.consultationAchatGroupe.update({ where: { id: c.id }, data: { vuLe: this.now() } }).catch(() => undefined);
    const besoins = await this.prisma.besoinNegocie.findMany({ where: { regroupementId: a.id, statut: { in: [ENGAGE, "accepte"] } }, select: { livraison: true, departement: true, dateBesoin: true } });
    const commission = Number(c.commissionPct);
    const cond = await this.prisma.conditionsOuvertureNegoce.findUnique({ where: { email: c.email } });
    const prix = objet(c.prixLignes);
    return {
      deLaPartDe: deLaPartDe(c.clients),
      negoce: c.nom,
      titre: `Achat groupé ${libelleMetier(a.famille).toLowerCase()}`,
      lignes: lignesDe(c.lignes).map((l) => ({ cle: l.cle, libelle: l.libelle, quantite: l.quantite, unite: l.unite })),
      livraisons: besoins.map((b) => ({ commune: communeDe(b.livraison) ?? b.departement, dateBesoin: jourIso(b.dateBesoin) })),
      reponseAvantLe: a.reponseAvantLe!.toISOString(),
      close: !!a.reponseAvantLe && a.reponseAvantLe <= this.now(),
      conditions: [
        "Vous n'êtes pas le seul négoce consulté.",
        "Une seule offre, sans deuxième tour : votre meilleur prix.",
        "Ligne par ligne : un prix unitaire HT livraison comprise, ou « je ne fournis pas ».",
        "Prix ferme sur le volume engagé jusqu'à la date de commande.",
        `Le bon de commande vous arrive directement ; le client vous paie sur son compte habituel. ${NOM_APP} ne touche jamais l'argent.`,
        ...(commission > 0 ? [`Commission ${NOM_APP} de ${String(commission).replace(".", ",")} % HT sur les commandes passées, facturée chaque mois.`] : []),
      ],
      choixOuverture: {
        pieces: CONDITIONS_OUVERTURE.map((p) => ({ valeur: p, libelle: LIBELLES_CONDITIONS_OUVERTURE[p] })),
        paiements: PAIEMENTS_DEPART.map((p) => ({ valeur: p, libelle: LIBELLES_PAIEMENTS_DEPART[p] })),
      },
      conditionsOuverture: cond ? { pieces: cond.pieces, paiement: cond.paiement, autre: cond.autre } : null,
      reponse: c.reponduLe ? { le: c.reponduLe.toISOString(), prix, pdf: c.pdfNom, recap: this.recapOffre(c) } : null,
    };
  }

  /** Le récapitulatif de SON offre : chaque ligne, le total HT livré, les lignes non fournies. */
  private recapOffre(c: Pick<Consultation, "lignes" | "prixLignes" | "prixCorriges" | "delaiJours" | "commentaire" | "pdfNom">) {
    const prix = objet(c.prixLignes);
    const lignes = lignesDe(c.lignes).map((l) => {
      const p = prixDe(prix, l.cle);
      return { cle: l.cle, libelle: l.libelle, quantite: l.quantite, unite: l.unite, prixHt: p, totalHt: p === null ? null : arrondi(p * l.quantite) };
    });
    return {
      lignes,
      totalHt: arrondi(lignes.reduce((s, l) => s + (l.totalHt ?? 0), 0)),
      manquantes: lignes.filter((l) => l.prixHt === null).map((l) => l.libelle),
      delaiJours: c.delaiJours,
      commentaire: c.commentaire,
      pdf: c.pdfNom,
    };
  }

  /* -------------------------------------------- la demande en PDF et en Excel (Greg, 28 octobre 2026, point 3) */

  /** « Couverture · secteur Paimpol » : le titre sans la date (elle est dite à part). */
  private titreDemande(a: { libelle: string; famille: string }) {
    const [metier, secteur] = a.libelle.split(" · ");
    return secteur ? `${metier} · ${secteur}` : libelleMetier(a.famille);
  }

  private async demandePdfDe(c: Pick<Consultation, "clients" | "lignes"> & { regroupement: Pick<Regroupement, "libelle" | "famille" | "dateBesoinMin" | "reponseAvantLe" | "commissionPct"> }, jeton: string) {
    const a = c.regroupement;
    const commission = Number(a.commissionPct ?? 0);
    return demandeNegocePdf({
      titre: this.titreDemande(a),
      livraisonAvantLe: a.dateBesoinMin ? jourFr(a.dateBesoinMin) : "la date convenue",
      reponseAvantLe: a.reponseAvantLe ? jourFr(a.reponseAvantLe) : "la date indiquée en ligne",
      dePart: deLaPartDe(c.clients),
      lignes: lignesDe(c.lignes).map((l, i) => ({ reference: refCourte(i), designation: l.libelle, quantite: qte(l.quantite), unite: uniteNegoce(l.unite) })),
      regles: `Une seule offre, sans deuxième tour : votre meilleur prix, ferme sur le volume engagé, livraison comprise, ligne par ligne (un prix unitaire HT ou « je ne fournis pas »).${commission > 0 ? ` Commission ${NOM_APP} de ${String(commission).replace(".", ",")} % HT sur les commandes passées.` : ""}`,
      lien: `${this.cfg.webAppUrl}/achat-groupe/${jeton}`,
    });
  }

  /** « Télécharger en PDF » : la demande, et l'admin voit qu'elle a été téléchargée. */
  async demandePdf(jeton: string): Promise<Uint8Array> {
    const c = await this.consultationDuJeton(jeton);
    const pdf = await this.demandePdfDe(c, jeton);
    if (!c.pdfTelechargeLe) await this.prisma.consultationAchatGroupe.update({ where: { id: c.id }, data: { pdfTelechargeLe: this.now() } }).catch(() => undefined);
    return pdf;
  }

  /**
   * « Exporter en Excel » : les mêmes lignes, « Prix unitaire HT » vide et « Disponible (oui/non) » à remplir, les autres
   * colonnes protégées, une feuille « Conditions », et une feuille cachée `_mobiiz` (l'identifiant de la consultation)
   * pour reconnaître le fichier au dépôt.
   */
  async demandeXlsx(jeton: string, { pieceJointe = false } = {}): Promise<Buffer> {
    const c = await this.consultationDuJeton(jeton);
    const a = c.regroupement;
    const lignes = lignesDe(c.lignes);
    const buf = ecrireXlsx([
      {
        nom: "Demande",
        enTete: true,
        protegee: true,
        colonnesLibres: [COL_PRIX, COL_DISPO],
        largeurs: [9, 36, 10, 8, 15, 17],
        lignes: [ENTETE_EXCEL, ...lignes.map((l, i): Cellule[] => [refCourte(i), l.libelle, l.quantite, uniteNegoce(l.unite), null, null])],
      },
      {
        nom: "Conditions",
        largeurs: [90],
        lignes: [
          [this.titreDemande(a)],
          [deLaPartDe(c.clients)],
          [`Livraison souhaitée avant le ${a.dateBesoinMin ? jourFr(a.dateBesoinMin) : "la date convenue"}`],
          [`Réponse attendue avant le ${a.reponseAvantLe ? jourFr(a.reponseAvantLe) : "la date indiquée en ligne"}`],
          ["Prix unitaire HT, livraison incluse."],
          ["Une seule offre, sans deuxième tour : votre meilleur prix."],
          ["Offre ferme sur le volume engagé jusqu'à la date de commande (validité)."],
          ["Ligne non fournie : laissez le prix vide et mettez « non » dans Disponible."],
          [`Déposez le fichier rempli sur votre page : ${this.cfg.webAppUrl}/achat-groupe/${jeton}`],
        ],
      },
      { nom: "_mobiiz", cachee: true, lignes: [[c.id]] },
    ]);
    // Jointe au mail, elle n'est pas « téléchargée » : l'admin ne voit que ce que le négoce a ouvert.
    if (!pieceJointe && !c.excelTelechargeLe) await this.prisma.consultationAchatGroupe.update({ where: { id: c.id }, data: { excelTelechargeLe: this.now() } }).catch(() => undefined);
    return buf;
  }

  /**
   * « Déposer l'Excel rempli » : lu par le code, sans IA. Le fichier est reconnu par sa feuille cachée ; les lignes
   * reconnues reviennent pour confirmation, avec leur état : prix lu, « non fourni », vide ou illisible.
   * Un fichier modifié (colonne retirée) ou qui n'est pas le sien est refusé avec une phrase claire.
   */
  async lireExcel(jeton: string, contenuBase64: string) {
    const c = await this.consultationDuJeton(jeton);
    const buf = Buffer.from(contenuBase64, "base64");
    if (buf.length > 4 * 1024 * 1024 || buf.readUInt32LE(0) !== 0x04034b50) throw validationFailed("xlsx only", { reason: "excel_invalide", message: "Déposez le fichier Excel (.xlsx) exporté depuis cette page." });
    let feuilles: ReturnType<typeof lireXlsx>;
    try {
      feuilles = lireXlsx(buf);
    } catch {
      throw validationFailed("xlsx unreadable", { reason: "excel_invalide", message: "Ce fichier n'est pas lisible. Déposez le fichier Excel exporté depuis cette page." });
    }
    const marque = feuilles.find((f) => f.nom === "_mobiiz")?.lignes[0]?.[0];
    if (marque !== c.id) throw validationFailed("not this consultation", { reason: "excel_inconnu", message: "Ce fichier n'est pas l'Excel de cette demande. Exportez-le depuis cette page, remplissez-le, puis déposez-le." });
    const demande = feuilles.find((f) => f.nom === "Demande");
    const entete = demande?.lignes[0]?.map((v) => String(v ?? "").trim().toLowerCase()) ?? [];
    const colonnes = { ref: entete.indexOf("référence"), prix: entete.indexOf("prix unitaire ht"), dispo: entete.indexOf("disponible (oui/non)") };
    if (!demande || colonnes.ref < 0 || colonnes.prix < 0) throw validationFailed("columns changed", { reason: "excel_modifie", message: "Le fichier a été modifié (une colonne manque). Exportez-le à nouveau et remplissez seulement « Prix unitaire HT » et « Disponible »." });
    const parRef = new Map(demande.lignes.slice(1).map((l) => [String(l[colonnes.ref] ?? "").trim().toUpperCase(), l]));
    const lignes = lignesDe(c.lignes).map((l, i) => {
      const ligne = parRef.get(refCourte(i));
      const brutPrix = ligne?.[colonnes.prix] ?? null;
      const brutDispo = colonnes.dispo >= 0 ? String(ligne?.[colonnes.dispo] ?? "").trim().toLowerCase() : "";
      const nonFourni = brutDispo === "non";
      const prix = typeof brutPrix === "number" ? brutPrix : nombre(typeof brutPrix === "string" ? brutPrix : null);
      const etat = !ligne ? "absente" : nonFourni ? "non_fourni" : prix !== null && prix > 0 ? "ok" : brutPrix === null || brutPrix === "" ? "vide" : "illisible";
      return { cle: l.cle, libelle: l.libelle, quantite: l.quantite, unite: l.unite, prixHt: etat === "ok" ? arrondi(prix!) : null, etat, lu: brutPrix === null ? null : String(brutPrix) };
    });
    return { lignes, aCorriger: lignes.filter((l) => l.etat !== "ok" && l.etat !== "non_fourni").length };
  }

  async repondre(jeton: string, r: ReponseNegoceAchat) {
    const c = await this.consultationDuJeton(jeton);
    if (c.reponduLe) throw new DomainError("conflict", "Already answered", { reason: "deja_repondu", message: "Votre offre est déjà enregistrée : une seule offre par achat groupé." });
    if (c.regroupement.reponseAvantLe && c.regroupement.reponseAvantLe <= this.now()) throw new DomainError("conflict", "Too late", { reason: "trop_tard", message: "La date de réponse est passée." });
    if (!r.accepteConditions) throw validationFailed("Conditions must be accepted", { reason: "conditions_requises", message: "Acceptez les conditions pour déposer votre offre." });
    const lignes = lignesDe(c.lignes);
    const prix = Object.fromEntries(lignes.filter((l) => r.prix && l.cle in r.prix).map((l) => [l.cle, r.prix![l.cle] ?? null]));
    const pdf = r.pdf ? Buffer.from(r.pdf.contenuBase64, "base64") : null;
    if (pdf && (pdf.length > 8 * 1024 * 1024 || pdf.subarray(0, 5).toString() !== "%PDF-")) throw validationFailed("PDF only, 8 MB max", { reason: "pdf_invalide", message: "Déposez un PDF de 8 Mo au plus." });
    if (!pdf) {
      if (!reponseComplete(lignes, prix)) throw validationFailed("Every line needs an answer", { reason: "lignes_incompletes", message: "Répondez à chaque ligne : un prix, ou « je ne fournis pas »." });
      if (Object.values(prix).every((p) => p === null)) throw validationFailed("At least one price", { reason: "aucun_prix", message: "Indiquez au moins un prix, ou déposez votre devis PDF." });
    }
    const maintenant = this.now();
    if (r.conditionsOuverture) {
      const data = { pieces: r.conditionsOuverture.pieces, paiement: r.conditionsOuverture.paiement, autre: r.conditionsOuverture.autre?.trim() || null };
      await this.prisma.conditionsOuvertureNegoce.upsert({ where: { email: c.email }, create: { email: c.email, ...data }, update: data });
    }
    await this.prisma.consultationAchatGroupe.update({
      where: { id: c.id },
      data: { conditionsAccepteesLe: maintenant, reponduLe: maintenant, statut: "repondue", prixLignes: Object.keys(prix).length ? prix : undefined, delaiJours: r.delaiJours, commentaire: r.commentaire, ...(pdf ? { pdf, pdfNom: r.pdf!.nom.slice(0, 120) } : {}) },
    });
    await this.confirmerOffre({ ...c, prixLignes: prix, reponduLe: maintenant, delaiJours: r.delaiJours, commentaire: r.commentaire, pdfNom: pdf ? r.pdf!.nom.slice(0, 120) : null }).catch(() => undefined);
    return this.page(jeton);
  }

  /** La confirmation par e-mail, avec le PDF de son offre (Greg, 28 octobre 2026, point 3). */
  private async confirmerOffre(c: Pick<Consultation, "email" | "nom" | "lignes" | "prixLignes" | "prixCorriges" | "delaiJours" | "commentaire" | "pdfNom"> & { reponduLe: Date; regroupement: Pick<Regroupement, "libelle" | "famille"> }) {
    const recap = this.recapOffre(c);
    const titre = this.titreDemande(c.regroupement);
    const pdf = await offreNegocePdf({
      titre,
      negoce: c.nom,
      envoyeeLe: jourFr(c.reponduLe),
      lignes: recap.lignes.map((l, i) => ({ reference: refCourte(i), designation: l.libelle, quantite: qte(l.quantite), unite: uniteNegoce(l.unite), prixHt: l.prixHt === null ? null : euros(l.prixHt), totalHt: l.totalHt === null ? null : euros(l.totalHt) })),
      totalHt: euros(recap.totalHt),
      manquantes: recap.manquantes,
      delai: c.delaiJours === null ? null : `${c.delaiJours} jour${c.delaiJours > 1 ? "s" : ""}`,
      commentaire: c.commentaire,
    });
    const texte = [
      "Bonjour,",
      "",
      `Votre offre pour « ${titre} » est bien enregistrée le ${jourFr(c.reponduLe)}.`,
      recap.pdf && !recap.lignes.some((l) => l.prixHt !== null) ? `Votre devis PDF (${recap.pdf}) sera lu et vérifié avant la comparaison.` : `Total HT livré : ${euros(recap.totalHt)}${recap.manquantes.length ? ` (non fourni : ${recap.manquantes.join(", ")})` : ""}.`,
      "Le récapitulatif est en pièce jointe. Une seule offre par achat groupé : elle est ferme jusqu'à la date de commande.",
      "",
      NOM_APP,
    ].join("\n");
    await this.mailer.send({ to: c.email, subject: `Offre enregistrée : ${titre}`, text: texte, attachments: [{ filename: "mon-offre-mobiiz.pdf", contentType: "application/pdf", contentBase64: Buffer.from(pdf).toString("base64") }] });
  }

  /* ------------------------------------------------------------------- l'analyse à l'échéance (C11, D14, D15) */

  /** Ce que l'IA a coûté aujourd'hui (€) : le budget du jour n'est jamais dépassé. */
  private async coutIaDuJour(maintenant: Date): Promise<number> {
    const debut = new Date(`${jourIso(maintenant)}T00:00:00Z`);
    const r = await this.prisma.consultationAchatGroupe.aggregate({ where: { luLe: { gte: debut } }, _sum: { coutIaEur: true } });
    return Number(r._sum.coutIaEur ?? 0);
  }

  private async lireDevis(c: { id: string; pdf: Uint8Array | null }, a: { numero: number; libelle: string }, quantite: number, maintenant: Date): Promise<ReponseLue | null> {
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
    const t = await this.extracteur.lire({ ...document, lot: { numero: a.numero, designation: a.libelle, unite: "", volumeFerme: String(quantite), volumeProbable: String(quantite) } }).catch(() => null);
    let cout = 0;
    try {
      if (t) cout = microUsdToEur(computeAiCost(t.model, t.usage, priceTableAt(maintenant)).totalMicroUsd, this.cfg.usdToEur).toNumber();
    } catch {
      cout = 0;
    }
    await this.prisma.consultationAchatGroupe.update({ where: { id: c.id }, data: { luLe: maintenant, coutIaEur: cout, lecture: (t?.output ?? null) as never } });
    return t?.status === "success" ? t.output : null;
  }

  /** Le devis PDF lu par l'IA : chaque prix rattaché à une ligne demandée par sa référence stricte ; le reste en alerte. */
  private prixDuDevis(lu: ReponseLue, lignes: readonly LignePanier[]): { prix: Record<string, number | null>; raisons: string[] } {
    const prix: Record<string, number | null> = {};
    const raisons: string[] = [];
    for (const p of lu.paliers) {
      const r = referenceStricte(p.designation);
      const ligne = r.ok ? lignes.find((l) => l.cle === r.reference.cle) : undefined;
      const pu = nombre(p.prixUnitaireHt) ?? (nombre(p.totalHt) && nombre(p.quantite) ? nombre(p.totalHt)! / nombre(p.quantite)! : null);
      if (!ligne) {
        raisons.push(`« ${p.designation} » ne correspond à aucune ligne demandée.`);
        continue;
      }
      if (pu === null) raisons.push(`Prix illisible pour « ${ligne.libelle} ».`);
      else if (!(ligne.cle in prix)) prix[ligne.cle] = arrondi(pu * 10_000) / 10_000;
    }
    if (Object.keys(prix).length === 0) raisons.push(PHRASES_DOUTE.prix_illisible);
    for (const d of lu.doutes) raisons.push(d);
    if (/livraison\s+(en\s+sus|non\s+comprise)/i.test(lu.doutes.join(" "))) raisons.push(PHRASES_DOUTE.livraison);
    return { prix, raisons: [...new Set(raisons)] };
  }

  /** La meilleure offre sur tout le panier (les complètes d'abord) : la proposition de l'IA à l'admin. */
  private async proposee(regroupementId: string): Promise<string | null> {
    const consultations = await this.prisma.consultationAchatGroupe.findMany({ where: { regroupementId } });
    const panier = cumulerPanier(await this.lignesPanier(regroupementId));
    return comparerPourArtisan(panier, this.offresDe(consultations))[0]?.id ?? null;
  }

  /** À l'échéance : lecture des devis PDF, prix rattachés aux lignes, proposition, puis validation de l'admin ou publication. */
  async analyser(regroupementId: string, maintenant = this.now()) {
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: regroupementId } });
    const consultations = await this.prisma.consultationAchatGroupe.findMany({ where: { regroupementId, reponduLe: { not: null } } });
    for (const c of consultations) {
      const lignes = lignesDe(c.lignes);
      if (c.prixLignes) {
        await this.prisma.consultationAchatGroupe.update({ where: { id: c.id }, data: { statut: "valide", raisons: [] } });
        continue;
      }
      const lu = await this.lireDevis(c, a, Number(c.quantite), maintenant);
      if (!lu) {
        await this.prisma.consultationAchatGroupe.update({ where: { id: c.id }, data: { statut: "douteuse", raisons: ["Devis non lu (lecteur absent ou budget du jour atteint) : à chiffrer à la main."] } });
        continue;
      }
      const { prix, raisons } = this.prixDuDevis(lu, lignes);
      await this.prisma.consultationAchatGroupe.update({ where: { id: c.id }, data: { prixLignes: prix, delaiJours: lu.delaiJours, statut: raisons.length ? "douteuse" : "valide", raisons } });
    }
    const meilleure = await this.proposee(regroupementId);
    await this.prisma.regroupementNegocie.update({ where: { id: a.id }, data: { analyseLe: maintenant, meilleureId: meilleure, iaMeilleureId: meilleure } });
    const avecPrix = consultations.length > 0 && (meilleure !== null || consultations.some((c) => !c.prixLignes));
    if (!avecPrix) {
      await this.prisma.regroupementNegocie.update({ where: { id: a.id }, data: { statut: "pas_assez", pasAssezLe: maintenant } });
      const besoins = await this.prisma.besoinNegocie.findMany({ where: { regroupementId, statut: ENGAGE }, select: { id: true, companyId: true } });
      for (const b of besoins) await this.notifs.prevenir(b.companyId, { titre: "Aucune offre cette fois", corps: `${a.libelle} : aucune offre reçue. Envoie ta liste à tes négoces en un clic.`, url: `/achats-groupes/${b.id}`, etiquette: `achat-${a.id}` }).catch(() => undefined);
      return { statut: "pas_assez", meilleure: null, douteuses: 0 };
    }
    const douteuses = (await this.prisma.consultationAchatGroupe.count({ where: { regroupementId, statut: "douteuse" } })) as number;
    if (!this.cfg.validationAdmin) {
      await this.publier(regroupementId, null, maintenant);
      return { statut: "publie", meilleure, douteuses };
    }
    await this.prisma.regroupementNegocie.update({ where: { id: a.id }, data: { statut: "validation", validationAlerteLe: maintenant } });
    await this.alerterAdmins(a.id, false);
    return { statut: "validation", meilleure, douteuses };
  }

  /** Point 15 : l'admin est prévenu (e-mail + notification) dès qu'un achat attend sa validation, puis toutes les 12 h. */
  private async alerterAdmins(regroupementId: string, rappel: boolean) {
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: regroupementId } });
    const recues = await this.prisma.consultationAchatGroupe.count({ where: { regroupementId, reponduLe: { not: null } } });
    const consultees = await this.prisma.consultationAchatGroupe.count({ where: { regroupementId } });
    const url = `/admin/achats-groupes/${a.id}`;
    const corps = `${rappel ? "Rappel : " : ""}achat groupé n° ${a.numero} à valider (${a.libelle}), ${recues} offre${recues > 1 ? "s" : ""} sur ${consultees}.`;
    for (const email of this.cfg.admins) {
      await this.mailer.send({ to: email, subject: `${rappel ? "Rappel : " : ""}achat groupé n° ${a.numero} à valider`, text: `${corps}\n\n${this.notifs.lienVers(url)}\n\n${NOM_APP}` }).catch(() => undefined);
      const m = await this.prisma.membership.findFirst({ where: { user: { email } }, select: { companyId: true } });
      if (m) await this.notifs.prevenir(m.companyId, { titre: "Offres à valider", corps, url, etiquette: `validation-${a.id}` }).catch(() => undefined);
    }
  }

  /** Le rappel des achats qui attendent la validation (au plus toutes les 12 h ; la tâche tourne une fois par jour sur Vercel Hobby). */
  private async rappelerValidation(maintenant: Date): Promise<number> {
    const attente = await this.prisma.regroupementNegocie.findMany({ where: { mode: MODE_AUTO, statut: "validation", validationAlerteLe: { lte: new Date(maintenant.getTime() - 12 * HEURE) } }, select: { id: true } });
    for (const a of attente) {
      await this.prisma.regroupementNegocie.update({ where: { id: a.id }, data: { validationAlerteLe: maintenant } });
      await this.alerterAdmins(a.id, true);
    }
    return attente.length;
  }

  /**
   * Recette en prévisualisation (jamais en production, vérifié par le contrôleur) : clôturer tout de suite, ou analyser
   * les offres tout de suite, ou dépasser la date de commande, sans attendre la tâche du jour.
   */
  async avancer(regroupementId: string, etape: "cloture" | "echeance" | "commande") {
    if (!isUuid(regroupementId)) throw notFound("AchatGroupe");
    const a = await this.prisma.regroupementNegocie.findFirst({ where: { id: regroupementId, mode: MODE_AUTO } });
    if (!a) throw notFound("AchatGroupe");
    const maintenant = this.now();
    if (etape === "cloture") {
      if (a.statut !== OUVERT) throw new DomainError("conflict", "Already closed", { reason: "deja_clos" });
      await this.prisma.regroupementNegocie.update({ where: { id: a.id }, data: { clotureLe: maintenant } });
      return { statut: await this.cloturer(a.id, maintenant) };
    }
    if (etape === "commande") {
      if (a.statut !== "publie") throw new DomainError("conflict", "Not published", { reason: "pas_publie" });
      await this.prisma.regroupementNegocie.update({ where: { id: a.id }, data: { commandeAvantLe: maintenant } });
      return { nonCommandes: await this.nonCommandes(maintenant) };
    }
    if (a.statut !== "consultation") throw new DomainError("conflict", "Not in consultation", { reason: "pas_en_consultation" });
    await this.prisma.regroupementNegocie.update({ where: { id: a.id }, data: { reponseAvantLe: maintenant } });
    return this.analyser(a.id, maintenant);
  }

  /* ---------------------------------------------------------------------- la validation de l'admin (D14, D16) */

  private async consultationAValider(consultationId: string) {
    if (!isUuid(consultationId)) throw notFound("Consultation");
    const c = await this.prisma.consultationAchatGroupe.findUnique({ where: { id: consultationId }, include: { regroupement: true } });
    if (!c || !c.reponduLe) throw notFound("Consultation");
    if (!["validation", "pas_assez"].includes(c.regroupement.statut)) throw new DomainError("conflict", "Already published", { reason: "deja_publie" });
    return c;
  }

  private async corrige(c: { id: string; regroupementId: string }, action: string, adminEmail: string, d: { cle?: string; avant?: number | null; apres?: number | null } = {}) {
    await this.prisma.$transaction([
      this.prisma.correctionOffreAchatGroupe.create({ data: { consultationId: c.id, regroupementId: c.regroupementId, action, cle: d.cle ?? null, avant: d.avant ?? null, apres: d.apres ?? null, adminEmail } }),
      this.prisma.regroupementNegocie.update({ where: { id: c.regroupementId }, data: { correctionsAdmin: { increment: 1 } } }),
    ]);
    await this.prisma.regroupementNegocie.update({ where: { id: c.regroupementId }, data: { meilleureId: await this.proposee(c.regroupementId) } });
  }

  /** Écarter une offre : elle n'est plus jamais comparée. */
  async ecarter(consultationId: string, adminEmail: string) {
    const c = await this.consultationAValider(consultationId);
    await this.prisma.consultationAchatGroupe.update({ where: { id: c.id }, data: { ecarteeLe: this.now() } });
    await this.corrige(c, "ecarter", adminEmail);
    return this.adminAchat(c.regroupementId);
  }

  /** Valider une offre (douteuse, ou écartée par erreur) : elle entre dans la comparaison. */
  async validerOffre(consultationId: string, adminEmail: string) {
    const c = await this.consultationAValider(consultationId);
    const changement = !!c.ecarteeLe || c.statut === "douteuse";
    await this.prisma.consultationAchatGroupe.update({ where: { id: c.id }, data: { ecarteeLe: null, statut: "valide" } });
    if (c.regroupement.statut === "pas_assez") await this.prisma.regroupementNegocie.update({ where: { id: c.regroupementId }, data: { statut: "validation", pasAssezLe: null } });
    if (changement) await this.corrige(c, "valider", adminEmail);
    return this.adminAchat(c.regroupementId);
  }

  /** Corriger le prix d'une ligne (null : « ne fournit pas ») ; la correction est gardée. */
  async corrigerPrix(consultationId: string, cle: string, prix: number | null, adminEmail: string) {
    const c = await this.consultationAValider(consultationId);
    if (!lignesDe(c.lignes).some((l) => l.cle === cle)) throw validationFailed("Unknown line", { reason: "ligne_inconnue" });
    const avant = this.prixEffectifs(c)[cle] ?? null;
    await this.prisma.consultationAchatGroupe.update({ where: { id: c.id }, data: { prixCorriges: { ...objet(c.prixCorriges), [cle]: prix } } });
    await this.corrige(c, "prix", adminEmail, { cle, avant, apres: prix });
    return this.adminAchat(c.regroupementId);
  }

  /** L'écran de validation d'un achat : les négoces consultés, les réponses, chaque offre, la proposition. */
  async adminAchat(regroupementId: string) {
    if (!isUuid(regroupementId)) throw notFound("AchatGroupe");
    const a = await this.prisma.regroupementNegocie.findFirst({ where: { id: regroupementId, mode: MODE_AUTO } });
    if (!a) throw notFound("AchatGroupe");
    const consultations = await this.prisma.consultationAchatGroupe.findMany({ where: { regroupementId }, orderBy: { nom: "asc" } });
    const panier = cumulerPanier(await this.lignesPanier(a.id));
    const comparees = new Map(comparerPourArtisan(panier, this.offresDe(consultations)).map((o) => [o.id, o]));
    const conditions = new Map((await this.prisma.conditionsOuvertureNegoce.findMany({ where: { email: { in: consultations.map((c) => c.email) } } })).map((x) => [x.email, x]));
    const repondu = consultations.filter((c) => c.reponduLe).length;
    return {
      id: a.id,
      numero: a.numero,
      titre: a.libelle,
      statut: a.statut,
      consultes: consultations.length,
      reponses: `${repondu} sur ${consultations.length}`,
      panier: panier.map((l) => ({ cle: l.cle, libelle: l.libelle, quantite: l.quantite, unite: l.unite })),
      proposeeId: a.meilleureId,
      iaId: a.iaMeilleureId,
      corrections: a.correctionsAdmin,
      offres: consultations.map((c) => {
        const prix = this.prixEffectifs(c);
        const corriges = objet(c.prixCorriges);
        const lignes = lignesDe(c.lignes);
        const o = comparees.get(c.id);
        const cond = conditions.get(c.email);
        return {
          consultationId: c.id,
          nom: c.nom,
          email: c.email,
          telephone: c.telephone,
          repondu: !!c.reponduLe,
          vu: !!c.vuLe,
          pdfTelecharge: !!c.pdfTelechargeLe,
          excelTelecharge: !!c.excelTelechargeLe,
          statut: c.statut,
          ecartee: !!c.ecarteeLe,
          alertes: c.raisons.map((r) => PHRASES_DOUTE[r as RaisonDoute] ?? r),
          pdf: c.pdfNom,
          totalHt: o?.totalHt ?? null,
          manquantes: lignes.filter((l) => typeof prix[l.cle] !== "number").map((l) => l.libelle),
          lignes: lignes.map((l) => ({ cle: l.cle, libelle: l.libelle, quantite: l.quantite, unite: l.unite, prixHt: prixDe(prix, l.cle), corrige: l.cle in corriges })),
          ouvertureCompte: cond ? phraseOuvertureCompte({ pieces: cond.pieces as ConditionOuverture[], paiement: cond.paiement as PaiementDepart | null, autre: cond.autre }) : null,
          commentaire: c.commentaire,
        };
      }),
    };
  }

  /* ------------------------------------------------------------------------------------ publier (E17) */

  /** « Publier » : chaque artisan reçoit SA comparaison (« Ta liste chez le meilleur négoce : … au lieu de … »). */
  async publier(regroupementId: string, adminEmail: string | null, maintenant = this.now()) {
    if (!isUuid(regroupementId)) throw notFound("AchatGroupe");
    const a = await this.prisma.regroupementNegocie.findFirst({ where: { id: regroupementId, mode: MODE_AUTO } });
    if (!a) throw notFound("AchatGroupe");
    if (!["validation", "consultation"].includes(a.statut)) throw new DomainError("conflict", "Not awaiting validation", { reason: "pas_en_validation" });
    const meilleure = await this.proposee(a.id);
    if (!meilleure) throw validationFailed("No offer to publish", { reason: "aucune_offre", message: "Aucune offre à publier : validez au moins une offre." });
    await this.prisma.regroupementNegocie.update({ where: { id: a.id }, data: { statut: "publie", publieLe: maintenant, meilleureId: meilleure, commandeAvantLe: commandeAvantLe(maintenant, this.cfg.delaiCommandeJours) } });
    void adminEmail;
    const besoins = await this.prisma.besoinNegocie.findMany({ where: { regroupementId, statut: ENGAGE }, select: { id: true, companyId: true, consultationCommandeId: true, coordonneesTransmisesLe: true, coordonneesConsultationId: true } });
    for (const b of besoins) {
      const r = await this.resultatPour(a, b);
      const corps = r.phrase ?? `${a.libelle} : aucune offre ne chiffre tes lignes. Envoie ta liste à tes négoces.`;
      const url = `/achats-groupes/${b.id}`;
      await this.notifs.prevenir(b.companyId, { titre: "Résultats de ton achat groupé", corps, url, etiquette: `achat-${a.id}` }, { objet: `Résultats de ton achat groupé : ${a.libelle}`, texte: `${corps}\n\nCommande avant le ${jourFr(commandeAvantLe(maintenant, this.cfg.delaiCommandeJours))} : ${this.notifs.lienVers(url)}\n\n${NOM_APP}` }).catch(() => undefined);
    }
    return { statut: "publie", participants: besoins.length };
  }

  /* ------------------------------------------------------------------------- après la publication (E18 à E20) */

  private async publieePour(tenant: TenantContext, besoinId: string, consultationId: string) {
    assertCanWrite(tenant);
    const b = await this.monBesoin(tenant, besoinId);
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: b.regroupementId! } });
    if (a.statut !== "publie") throw new DomainError("conflict", "Not published yet", { reason: "pas_publie" });
    if (!isUuid(consultationId)) throw notFound("Consultation");
    const r = await this.resultatPour(a, b);
    const offre = r.offres.find((o) => o.consultationId === consultationId);
    if (!offre) throw forbidden("This offer is not available to you");
    const c = await this.prisma.consultationAchatGroupe.findUniqueOrThrow({ where: { id: consultationId } });
    return { a, b, offre, c };
  }

  /** « Commander » (point 18) : le bon de SES lignes chiffrées part chez le négoce, qui confirme « Commande reçue ». */
  async commander(tenant: TenantContext, besoinId: string, consultationId: string) {
    const { a, b, offre, c } = await this.publieePour(tenant, besoinId, consultationId);
    if (b.statut !== ENGAGE) throw new DomainError("conflict", "Not open", { reason: "besoin_ferme" });
    const maintenant = this.now();
    if (a.commandeAvantLe && a.commandeAvantLe <= maintenant) throw new DomainError("conflict", "Too late", { reason: "commande_trop_tard", message: "La date de commande est passée." });
    const chiffrees = offre.lignes.filter((l) => l.prixHt !== null);
    const total = arrondi(chiffrees.reduce((s, l) => s + l.prixHt! * l.quantite, 0));
    const rang = (await this.prisma.besoinNegocie.count({ where: { regroupementId: a.id, bonNumero: { not: null } } })) + 1;
    const bonNumero = a.numero * 1000 + rang;
    const jeton = randomBytes(24).toString("base64url");
    await this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { statut: "accepte", accepteLe: maintenant, bonNumero, consultationCommandeId: c.id, prixCommandeHt: total, commandeTokenHash: hacher(jeton) } });
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { name: true, address: true, phone: true, contactEmail: true } });
    const pdf = await this.bon(bonNumero, maintenant, company, c, b.livraison, chiffrees, total, a.numero);
    const piece = { filename: `bon-de-commande-${bonNumero}.pdf`, contentType: "application/pdf", contentBase64: Buffer.from(pdf).toString("base64") };
    const replyTo = await this.ports.adresseMobiiz(tenant.companyId).catch(() => null);
    const lien = `${this.cfg.webAppUrl}/achat-groupe/commande/${jeton}`;
    await this.mailer.send({
      to: c.email,
      subject: `Bon de commande n° ${bonNumero} : ${chiffrees.length} référence${chiffrees.length > 1 ? "s" : ""} (achat groupé ${NOM_APP})`,
      text: ["Bonjour,", "", `${company.name} vous commande les lignes de votre offre (${euros(total)} HT, livraison comprise), à livrer : ${b.livraison}.`, "Le bon de commande est joint. Le paiement se fait directement entre vous.", "", `Confirmez la réception d'un clic : ${lien}`, "", NOM_APP].join("\n"),
      attachments: [piece],
      ...(replyTo ? { replyTo } : {}),
    });
    const corps = `${chiffrees.length} référence${chiffrees.length > 1 ? "s" : ""} chez ${c.nom}, ${euros(total)} HT livré.`;
    await this.notifs.prevenir(tenant.companyId, { titre: "C'est commandé", corps, url: `/achats-groupes/${b.id}`, etiquette: `commande-${b.id}` }, { objet: `Ta commande groupée n° ${bonNumero}`, texte: `C'est commandé : ${corps}\nTon bon de commande est joint.\n\n${this.notifs.lienVers("/achats-groupes")}\n\n${NOM_APP}`, piecesJointes: [piece] }).catch(() => undefined);
    for (const l of chiffrees) await this.ports.observatoire({ sourceId: a.id, departement: a.departement, designation: l.libelle, unite: l.unite, quantite: l.quantite, prixHt: l.prixHt! }).catch(() => undefined);
    return { bonNumero, negoce: c.nom, totalHt: total, nonChiffrees: offre.lignes.length - chiffrees.length };
  }

  private bon(numero: number, date: Date, company: { name: string; address: string | null; phone: string | null; contactEmail: string | null }, c: { nom: string; email: string }, livraison: string, lignes: readonly { libelle: string; quantite: number; unite: string; prixHt: number | null }[], total: number, achatNumero: number) {
    return bonDeCommandePdf({
      numero: String(numero),
      date: jourFr(date),
      acheteur: { nom: company.name, adresse: company.address, telephone: company.phone, email: company.contactEmail },
      vendeur: { nom: c.nom, email: c.email },
      livraison,
      lignes: lignes.map((l) => ({ designation: l.libelle, quantite: qte(l.quantite), unite: l.unite, prixHt: euros(l.prixHt ?? 0), totalHt: euros(arrondi((l.prixHt ?? 0) * l.quantite)) })),
      livraisonHt: "comprise",
      totalHt: euros(total),
      mentions: [`Achat groupé ${NOM_APP} n° ${achatNumero} : prix ferme livraison comprise.`, `Paiement directement au vendeur, sur le compte habituel de l'acheteur. ${NOM_APP} ne vend ni n'achète rien et ne touche jamais l'argent.`],
    });
  }

  async bonPdf(tenant: TenantContext, besoinId: string): Promise<Uint8Array> {
    const b = await this.monBesoin(tenant, besoinId);
    if (!b.bonNumero || !b.consultationCommandeId) throw notFound("Bon");
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: b.regroupementId! } });
    const c = await this.prisma.consultationAchatGroupe.findUniqueOrThrow({ where: { id: b.consultationCommandeId } });
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { name: true, address: true, phone: true, contactEmail: true } });
    const prix = this.prixEffectifs(c);
    const lignes = (await this.prisma.ligneAchatGroupe.findMany({ where: { besoinId: b.id }, orderBy: { createdAt: "asc" } })).map((l) => ({ libelle: l.libelle, quantite: Number(l.quantite), unite: l.unite, prixHt: prixDe(prix, l.cle) })).filter((l) => l.prixHt !== null);
    return this.bon(b.bonNumero, b.accepteLe ?? this.now(), company, c, b.livraison, lignes, Number(b.prixCommandeHt), a.numero);
  }

  /** Le négoce confirme « Commande reçue » d'un clic (lien du bon, sans inscription). */
  async pageCommande(jeton: string) {
    const b = await this.besoinDuJeton(jeton);
    return { numero: b.bonNumero, client: b.company.name, totalHt: Number(b.prixCommandeHt), recue: !!b.commandeRecueLe };
  }

  async commandeRecue(jeton: string) {
    const b = await this.besoinDuJeton(jeton);
    if (!b.commandeRecueLe) {
      await this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { commandeRecueLe: this.now() } });
      const c = b.consultationCommandeId ? await this.prisma.consultationAchatGroupe.findUnique({ where: { id: b.consultationCommandeId }, select: { nom: true } }) : null;
      await this.notifs.prevenir(b.companyId, { titre: "Commande reçue", corps: `${c?.nom ?? "Le négoce"} a bien reçu ta commande n° ${b.bonNumero}.`, url: `/achats-groupes/${b.id}`, etiquette: `recue-${b.id}` }).catch(() => undefined);
    }
    return this.pageCommande(jeton);
  }

  private async besoinDuJeton(jeton: string) {
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(jeton)) throw notFound("Commande");
    const b = await this.prisma.besoinNegocie.findUnique({ where: { commandeTokenHash: hacher(jeton) }, include: { company: { select: { name: true } } } });
    if (!b) throw notFound("Commande");
    return b;
  }

  /**
   * Point 19 : sans compte chez le négoce, « Je suis intéressé, transmettre mes coordonnées » (consentement explicite) :
   * il reçoit nom, entreprise, téléphone, e-mail et SIRET, et rappelle « de la part de Mobiiz ».
   */
  async transmettreCoordonnees(tenant: TenantContext, besoinId: string, consultationId: string, consentement: boolean) {
    if (!consentement) throw validationFailed("Consent required", { reason: "consentement_requis", message: "Coche la case pour accepter que tes coordonnées soient transmises." });
    const { b, c } = await this.publieePour(tenant, besoinId, consultationId);
    if (b.coordonneesTransmisesLe && b.coordonneesConsultationId === c.id) return { fait: true, deja: true };
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { name: true, phone: true, contactEmail: true, siret: true } });
    const user = await this.prisma.user.findUnique({ where: { id: tenant.userId }, select: { name: true, email: true } });
    const email = company.contactEmail ?? user?.email ?? "";
    await this.mailer.send({
      to: c.email,
      subject: `Ouverture de compte : ${company.name}, de la part de ${NOM_APP}`,
      text: [
        "Bonjour,",
        "",
        `Un artisan de l'achat groupé ${NOM_APP} souhaite ouvrir un compte chez vous pour commander au prix de votre offre. Il a accepté que ses coordonnées vous soient transmises :`,
        "",
        `- Nom : ${user?.name ?? ""}`,
        `- Entreprise : ${company.name}`,
        `- Téléphone : ${company.phone ?? "non renseigné"}`,
        `- E-mail : ${email}`,
        `- SIRET : ${company.siret ?? "non renseigné"}`,
        "",
        `Merci de le rappeler « de la part de ${NOM_APP} ».`,
        "",
        NOM_APP,
      ].join("\n"),
      ...(email ? { replyTo: email } : {}),
    });
    await this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { coordonneesTransmisesLe: this.now(), coordonneesConsultationId: c.id } });
    return { fait: true, deja: false };
  }

  /** Point 20 : « Livré » ou « Problème » (relation directe ensuite). */
  async livre(tenant: TenantContext, besoinId: string, probleme: string | null) {
    assertCanWrite(tenant);
    const b = await this.monBesoin(tenant, besoinId);
    if (b.statut !== "accepte") throw new DomainError("conflict", "Not ordered", { reason: "pas_commande" });
    await this.prisma.besoinNegocie.update({ where: { id: b.id }, data: probleme ? { problemeLe: this.now(), problemeTexte: probleme } : { livreLe: this.now() } });
    return { fait: true };
  }

  /** Après la date de commande : une participation sans commande ni sortie est une commande pas passée sans motif. */
  private async nonCommandes(maintenant: Date): Promise<number> {
    const besoins = await this.prisma.besoinNegocie.findMany({ where: { statut: ENGAGE, regroupement: { mode: MODE_AUTO, statut: "publie", commandeAvantLe: { lte: maintenant } } }, select: { id: true, companyId: true, regroupementId: true, quantite: true } });
    for (const b of besoins) {
      await this.prisma.$transaction([
        this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { statut: "non_commande", nonCommandeLe: maintenant } }),
        this.prisma.desistementAchatGroupe.create({ data: { besoinId: b.id, companyId: b.companyId, regroupementId: b.regroupementId!, quantite: b.quantite, apresCloture: true, raison: "non_commande" } }),
      ]);
      const fin = await this.recalculerExclusion(b.companyId);
      if (fin) await this.notifs.prevenir(b.companyId, { titre: "Commande pas passée", corps: phraseExclusion(fin), url: `/achats-groupes/${b.id}`, etiquette: `exclu-${b.id}` }).catch(() => undefined);
    }
    return besoins.length;
  }

  /** Le devis PDF déposé par un négoce (admin, l'original à un tap). */
  async devisPdf(consultationId: string): Promise<Uint8Array> {
    if (!isUuid(consultationId)) throw notFound("Consultation");
    const c = await this.prisma.consultationAchatGroupe.findUnique({ where: { id: consultationId }, select: { pdf: true } });
    if (!c?.pdf) throw notFound("Consultation");
    return new Uint8Array(c.pdf);
  }

  /* ------------------------------------------------------------------------------------------- plan B */

  /** « Envoyer à mes négoces » : ses lignes deviennent une demande perso, en un clic, chez ses négoces. */
  async planB(tenant: TenantContext, besoinId: string) {
    assertCanWrite(tenant);
    const b = await this.monBesoin(tenant, besoinId);
    const a = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: b.regroupementId! } });
    if (a.statut !== "pas_assez" || b.statut !== ENGAGE) throw new DomainError("conflict", "Plan B only when volume is short", { reason: "pas_de_plan_b" });
    const negoces = await this.prisma.negoceParticipant.findMany({ where: { besoinId: b.id, supplierId: { not: null } }, select: { supplierId: true } });
    const lignes = await this.prisma.ligneAchatGroupe.findMany({ where: { besoinId: b.id }, orderBy: { createdAt: "asc" } });
    const r = await this.ports.envoyerEnPerso(tenant, {
      nom: a.libelle,
      adresse: b.livraison,
      lignes: lignes.map((l) => ({ designation: l.designationOrigine, quantite: Number(l.quantite), unite: l.unite })),
      supplierIds: negoces.map((n) => n.supplierId!),
      dateBesoin: b.dateBesoin,
    });
    await this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { statut: "perso" } });
    return r;
  }

  /* -------------------------------------------------------------------------------- la facture de commission */

  /** Le 1er du mois : la facture de commission de chaque négoce (rien à 0 %, point 27 ; envoi réel coupé). */
  async preparerFactures(maintenant = this.now()): Promise<number> {
    const debut = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - 1, 1));
    const fin = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1));
    const mois = debut.toISOString().slice(0, 7);
    const bons = await this.prisma.besoinNegocie.findMany({ where: { statut: "accepte", accepteLe: { gte: debut, lt: fin }, consultationCommandeId: { not: null } }, select: { bonNumero: true, prixCommandeHt: true, consultationCommandeId: true } });
    const parNegoce = new Map<string, { nom: string; total: number; commission: number; bons: { numero: number | null; totalHt: number }[] }>();
    for (const b of bons) {
      const c = await this.prisma.consultationAchatGroupe.findUnique({ where: { id: b.consultationCommandeId! }, select: { email: true, nom: true, commissionPct: true } });
      if (!c || Number(c.commissionPct) <= 0) continue;
      const total = Number(b.prixCommandeHt);
      const f = parNegoce.get(c.email) ?? { nom: c.nom, total: 0, commission: 0, bons: [] };
      f.total += total;
      f.commission += (total * Number(c.commissionPct)) / 100;
      f.bons.push({ numero: b.bonNumero, totalHt: total });
      parNegoce.set(c.email, f);
    }
    for (const [email, f] of parNegoce) {
      const data = { negoceNom: f.nom, totalHt: arrondi(f.total), commissionHt: arrondi(f.commission), bons: f.bons };
      await this.prisma.factureCommissionMensuelle.upsert({ where: { mois_negoceEmail: { mois, negoceEmail: email } }, create: { mois, negoceEmail: email, ...data }, update: data });
    }
    return parNegoce.size;
  }

  /* ------------------------------------------------------------------------------------------------- l'admin */

  /**
   * Point 32 : le taux de lignes corrigées par l'artisan, par source de la liste préparée (devis lu, photo de liste).
   * Une ligne corrigée : modifiée ou retirée au moins une fois (journal des corrections).
   */
  async correctionsParSource() {
    const demos = (await this.prisma.project.findMany({ where: { demo: true }, select: { id: true } })).map((p) => p.id);
    const takeoffs = await this.prisma.takeoff.findMany({ where: { projectId: { notIn: demos } }, select: { id: true, source: true, lines: { select: { id: true, origin: true } } } });
    const events = await this.prisma.correctionEvent.findMany({ where: { action: { in: ["edit", "delete"] }, takeoffLineId: { not: null } }, select: { takeoffId: true, takeoffLineId: true, action: true } });
    const parTakeoff = new Map<string, { corrigees: Set<string>; retirees: Set<string> }>();
    for (const e of events) {
      if (!e.takeoffId) continue;
      const t = parTakeoff.get(e.takeoffId) ?? { corrigees: new Set(), retirees: new Set() };
      t.corrigees.add(e.takeoffLineId!);
      if (e.action === "delete") t.retirees.add(e.takeoffLineId!);
      parTakeoff.set(e.takeoffId, t);
    }
    const sources = { devis: { lignes: 0, corrigees: 0 }, photo: { lignes: 0, corrigees: 0 } };
    for (const t of takeoffs) {
      const source = t.lines.some((l) => l.origin === "liste") ? "photo" : t.source === "pdf" ? "devis" : null;
      if (!source) continue;
      const c = parTakeoff.get(t.id);
      const lues = t.lines.filter((l) => l.origin === (source === "photo" ? "liste" : "ai"));
      const ids = new Set(lues.map((l) => l.id));
      const retirees = c ? [...c.retirees].filter((id) => !ids.has(id)).length : 0;
      sources[source].lignes += lues.length + retirees;
      sources[source].corrigees += (c ? [...c.corrigees].filter((id) => ids.has(id)).length : 0) + retirees;
    }
    return (["devis", "photo"] as const).map((s) => ({ source: s, ...sources[s], taux: sources[s].lignes ? Math.round((sources[s].corrigees / sources[s].lignes) * 100) : null }));
  }

  async admin(maintenant = this.now()) {
    const achats = await this.prisma.regroupementNegocie.findMany({ where: { mode: MODE_AUTO }, orderBy: { createdAt: "desc" }, take: 200, include: { consultations: { select: { id: true, nom: true, email: true, telephone: true, reponduLe: true } } } });
    const vues = [];
    for (const a of achats) {
      const v = await this.volumeEstime(a.id);
      const besoins = await this.prisma.besoinNegocie.findMany({ where: { regroupementId: a.id, engageLe: { not: null } }, select: { companyId: true, statut: true, offreVueLe: true } });
      let abonnes = 0;
      for (const b of besoins) if (await this.ports.abonne(b.companyId)) abonnes++;
      vues.push({
        id: a.id,
        numero: a.numero,
        titre: a.libelle,
        departement: a.departement,
        statut: a.statut,
        clotureLe: a.clotureLe,
        reponseAvantLe: a.reponseAvantLe,
        commandeAvantLe: a.commandeAvantLe,
        entreprises: v.entreprises,
        references: cumulerPanier(await this.lignesPanier(a.id)).length,
        estimeHt: v.estimeHt,
        reponses: `${a.consultations.filter((c) => c.reponduLe).length} sur ${a.consultations.length}`,
        // Point 28 : vus, abonnés, commandé, sortis (achats publiés).
        suivi: a.publieLe ? { vus: besoins.filter((b) => b.offreVueLe).length, abonnes, commandes: besoins.filter((b) => b.statut === "accepte").length, sortis: besoins.filter((b) => b.statut === "sorti").length, participants: besoins.length } : null,
        _a: a,
      });
    }
    const limite = new Date(maintenant.getTime() - SANS_REPONSE_HEURES * HEURE);
    const sansReponse = vues
      .filter((v) => v.statut === "consultation" && v._a.consulteLe! <= limite && v._a.consultations.every((c) => !c.reponduLe))
      .map((v) => ({ id: v.id, numero: v.numero, titre: v.titre, departement: v.departement, negoces: v._a.consultations.map((c) => ({ nom: c.nom, email: c.email, telephone: c.telephone })) }));
    const desistements = (await this.prisma.desistementAchatGroupe.findMany({ orderBy: { le: "desc" }, take: 200, include: { company: { select: { name: true } }, regroupement: { select: { numero: true, libelle: true } } } })).map((d) => ({
      id: d.id,
      le: d.le,
      entreprise: d.company.name,
      achat: `n° ${d.regroupement.numero} ${d.regroupement.libelle}`,
      apresCloture: d.apresCloture,
      raison: d.raison,
      motif: d.raison === "non_commande" ? "Commande pas passée, sans motif" : d.raison === "retire_avant_cloture" ? "Retiré avant la clôture" : (LIBELLES_MOTIFS_SORTIE[d.raison as MotifSortie] ?? d.raison),
    }));
    const exclus = (await this.prisma.company.findMany({ where: { achatsGroupesExclusJusquau: { gt: maintenant } }, select: { id: true, name: true, achatsGroupesExclusJusquau: true } })).map((c) => ({ companyId: c.id, entreprise: c.name, jusquau: c.achatsGroupesExclusJusquau }));
    const parts = await this.prisma.besoinNegocie.groupBy({ by: ["companyId"], where: { regroupement: { mode: MODE_AUTO } }, _count: { _all: true } });
    const suspects = [];
    for (const p of parts) {
      const commandes = await this.prisma.besoinNegocie.count({ where: { companyId: p.companyId, statut: "accepte", regroupement: { mode: MODE_AUTO } } });
      if (participantSuspect(p._count._all, commandes)) {
        const c = await this.prisma.company.findUnique({ where: { id: p.companyId }, select: { name: true, siret: true, naf: true } });
        suspects.push({ companyId: p.companyId, entreprise: c?.name ?? "", siret: c?.siret ?? null, naf: c?.naf ?? null, participations: p._count._all, commandes });
      }
    }
    // Point 16 : la part des achats publiés où le choix de l'IA a été suivi sans correction.
    const publies = achats.filter((a) => a.publieLe);
    const suivis = publies.filter((a) => a.correctionsAdmin === 0 && a.meilleureId === a.iaMeilleureId).length;
    const factures = (await this.prisma.factureCommissionMensuelle.findMany({ orderBy: [{ mois: "desc" }, { negoceNom: "asc" }], take: 200 })).map((f) => ({ ...f, totalHt: Number(f.totalHt), commissionHt: Number(f.commissionHt) }));
    return {
      correctionsParSource: await this.correctionsParSource(),
      achats: vues.map(({ _a, ...v }) => (void _a, v)),
      aValider: vues.filter((v) => v.statut === "validation").map((v) => ({ id: v.id, numero: v.numero, titre: v.titre, reponses: v.reponses })),
      sansReponse,
      desistements,
      exclus,
      suspects,
      iaSuivie: { publies: publies.length, sansCorrection: suivis, part: publies.length ? Math.round((suivis / publies.length) * 100) : null },
      factures,
      volumesMin: await this.volumesMin(),
      envoiFacturesActif: false,
      commissionPct: this.cfg.commissionDefaut,
    };
  }
}
