import { randomBytes } from "node:crypto";
import {
  TARIFS,
  BANDEAU_MODE_TEST,
  EMETTEUR_FACTURES,
  MENTIONS_EDITEUR,
  NOM_APP,
  PAIEMENT_AUCUN,
  REGLAGES_ABONNEMENT_DEFAUT,
  actionPermise,
  bandeauEssai,
  bandeauGrace,
  emailRappelEssai,
  emailRenouvellementAnnuel,
  estFormule,
  etatAbonnement,
  eurosDeCentimes,
  finDePeriode,
  montantsFacture,
  numeroFacture,
  offresAbonnement,
  phraseEconomiePremierCycle,
  phrasePaywall,
  prixDeFormule,
  formuleDe as formuleEnregistree,
  prixDes,
  prorataVersPro,
  rappelEssaiDu,
  rappelRenouvellementDu,
  reglagesAbonnementSchema,
  type ActionPayante,
  type DatesEssai,
  type EtatAbonnement,
  type EtatPaiement,
  type Formule,
  type ReglagesAbonnement,
  type SerieFacture,
  type StatutPaiement,
} from "@baticlair/domain";
import type { AppConfig } from "../../../platform/config/config.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import { pdfDeTexte } from "../../../platform/pdf/pdf-texte.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import { lienEmailsCoupes } from "../../privacy/index.js";
import type { StripeClient } from "./stripe.port.js";

/** La transaction Prisma (le client de `$transaction`), sans dépendre du client généré. */
type Tx = Parameters<Extract<Parameters<PrismaService["$transaction"]>[0], (tx: never) => unknown>>[0];
/** Les champs de l'abonnement que change un événement. */
type MajAbonnement = { statut?: string; formule?: Formule; periodeDebut?: Date; periodeFin?: Date; echecLe?: Date | null; resiliationDemandeeLe?: Date | null; resilieLe?: Date | null; stripeCustomerId?: string; stripeSubscriptionId?: string };

const CLE_REGLAGES = "abonnement:reglages";
const JOUR = 86_400_000;

/** Un événement de paiement, le même pour le paiement simulé et pour Stripe (Greg, point 4). */
export interface EvenementPaiement {
  type: "actif" | "renouvele" | "passage_pro" | "echec" | "resiliation_demandee" | "resilie";
  source: "simule" | "stripe" | "tache" | "artisan" | "admin";
  /** La formule payée par cet événement ; absente : celle de l'abonnement (Essentiel par défaut). */
  formule?: Formule;
  /** L'identifiant de l'événement (Stripe, session simulée) : un même événement n'est appliqué qu'une fois. */
  ref: string | null;
  periodeDebut?: Date;
  periodeFin?: Date;
  /** Le paiement encaissé (actif, renouvelé, passage à Pro) : la facture à émettre. Absent : aucune facture. */
  facture?: { ref: string; htCentimes?: number; tvaCentimes?: number; ttcCentimes?: number } | null;
  stripe?: { customerId?: string | null; subscriptionId?: string | null };
}

const dateFr = (d: Date) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);

/**
 * L'ABONNEMENT ARTISAN (Greg, 24 octobre 2026). Tient l'état du paiement (table `abonnement`) à partir des événements, simulés
 * ou Stripe ; dit l'état de l'essai et du paywall (`etatAbonnement` du domaine) ; émet les factures (BATI INVEST, numéros
 * continus, série TEST en simulé) ; envoie les e-mails (échec, résiliation, rappels de fin d'essai avec l'économie réelle).
 * DEUX FORMULES (RÈGLE CHANGÉE, Greg, 30 octobre 2026) : Essentiel (19,90 € HT par mois) et Pro (39,90 € HT par mois),
 * sans engagement ; d'Essentiel à Pro à tout moment, au prorata ; une résiliation prend effet à la fin du mois payé. Les
 * anciens « mensuel » et « annuel » comptent comme Essentiel (`formuleDe`) ; un ancien annuel garde son rappel.
 */
export class AbonnementService {
  /** L'écart du premier cycle de l'entreprise (prix le plus cher reçu − prix choisi), branché par le regroupement. */
  private ecart: (companyId: string) => Promise<number | null> = async () => null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: Pick<AppConfig, "abonnement" | "webAppUrl" | "env" | "authSecret"> & { groupe?: Pick<AppConfig["groupe"], "facture"> },
    private readonly email: TransactionalEmailSender,
    private readonly stripe: StripeClient | null,
    private readonly now: () => Date = () => new Date(),
  ) {}

  brancherEcart(f: (companyId: string) => Promise<number | null>): void {
    this.ecart = f;
  }

  /** Recentrage (25 octobre 2026) : le payant offert dans la zone de l'entreprise (moins de 10 artisans actifs, ou préavis). */
  private offert: (companyId: string) => Promise<boolean> = async () => false;
  /**
   * Achat groupé par métier (Greg, 27 octobre 2026, 2e message, point 26) : plus d'essai de 35 jours. En mode automatique,
   * le compte est GRATUIT sans limite de temps (ni pastille ni bandeau d'essai) ; l'abonnement sert aux achats groupés.
   * Le reste (essai, paywall) ne vaut plus que pour l'ancien mode « commande du mois ».
   */
  private sansEssai: () => Promise<boolean> = async () => false;
  brancherSansEssai(f: () => Promise<boolean>): void {
    this.sansEssai = f;
  }
  brancherOffert(f: (companyId: string) => Promise<boolean>): void {
    this.offert = f;
  }

  get actif(): boolean {
    return this.config.abonnement.actif;
  }

  get serie(): SerieFacture {
    return this.config.abonnement.paiement === "stripe" ? "F" : "TEST";
  }

  async reglages(): Promise<ReglagesAbonnement> {
    const p = await this.prisma.parametreGroupe.findUnique({ where: { cle: CLE_REGLAGES } });
    const lu = reglagesAbonnementSchema.safeParse(p?.valeur ?? null);
    return lu.success ? lu.data : REGLAGES_ABONNEMENT_DEFAUT;
  }

  /** L'admin règle le prix et les durées (le prix d'un abonnement Stripe en cours se change aussi chez Stripe : STRIPE.md). */
  async majReglages(r: unknown): Promise<ReglagesAbonnement> {
    const lu = reglagesAbonnementSchema.safeParse(r);
    if (!lu.success) throw validationFailed("Invalid settings", { reason: "reglages_invalides" });
    await this.prisma.parametreGroupe.upsert({ where: { cle: CLE_REGLAGES }, create: { cle: CLE_REGLAGES, valeur: lu.data }, update: { valeur: lu.data } });
    return lu.data;
  }

  /** Les dates de l'essai : l'inscription, le premier dépôt dans un regroupement et les résultats de ce cycle. */
  async datesEssai(companyId: string): Promise<DatesEssai> {
    const c = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { createdAt: true } });
    const premier = await this.prisma.besoin.findFirst({ where: { companyId, cycleId: { not: null } }, orderBy: { createdAt: "asc" }, select: { createdAt: true, cycle: { select: { resultatsLe: true } } } });
    const force = await this.prisma.parametreGroupe.findUnique({ where: { cle: `abonnement:essai-fini:${companyId}` } });
    // « Finir l'essai » du mode démo (admin) : l'essai se termine comme le calendrier l'aurait fait, à cet instant.
    if (force) {
      const le = new Date(String((force.valeur as { le?: string }).le));
      return { inscritLe: new Date(le.getTime() - 60 * JOUR), premierDepotLe: null, premiersResultatsLe: null };
    }
    return { inscritLe: c.createdAt, premierDepotLe: premier?.createdAt ?? null, premiersResultatsLe: premier?.cycle?.resultatsLe ?? null };
  }

  private async paiement(companyId: string): Promise<EtatPaiement & { ligne: Awaited<ReturnType<PrismaService["abonnement"]["findUnique"]>> }> {
    const a = await this.prisma.abonnement.findUnique({ where: { companyId } });
    if (!a) return { ...PAIEMENT_AUCUN, ligne: null };
    return { statut: a.statut as StatutPaiement, periodeFin: a.periodeFin, echecLe: a.echecLe, resiliationDemandeeLe: a.resiliationDemandeeLe, formule: formuleEnregistree(a.formule), ligne: a };
  }

  async etat(companyId: string, maintenant = this.now()): Promise<EtatAbonnement> {
    const [dates, paiement, reglages] = await Promise.all([this.datesEssai(companyId), this.paiement(companyId), this.reglages()]);
    return etatAbonnement(dates, paiement, maintenant, reglages);
  }

  /**
   * Avant une action payante (déposer, voir les résultats, commander, recommander) : 402 `abonnement_requis` quand l'essai
   * est fini sans abonnement. `deposeeLe` : la date du dépôt de la liste concernée (ses résultats restent visibles).
   */
  async exiger(companyId: string, action: ActionPayante, maintenant = this.now(), deposeeLe?: Date | null): Promise<void> {
    if (!(await this.permis(companyId, action, maintenant, deposeeLe))) throw new DomainError("abonnement_requis", "Subscription required", { action });
  }

  async permis(companyId: string, action: ActionPayante, maintenant = this.now(), deposeeLe?: Date | null): Promise<boolean> {
    if (!this.actif) return true;
    if (await this.sansEssai()) return true;
    if (await this.offert(companyId)) return true;
    return actionPermise(await this.etat(companyId, maintenant), action, deposeeLe);
  }

  /** Ce que l'écran « Mon abonnement », le bandeau et le paywall montrent. */
  async vue(tenant: TenantContext, maintenant = this.now()) {
    const [etat, reglages, p] = await Promise.all([this.etat(tenant.companyId, maintenant), this.reglages(), this.paiement(tenant.companyId)]);
    const ecart = this.actif ? await this.ecart(tenant.companyId).catch(() => null) : null;
    const gratuit = this.actif && (etat.acces === "essai" || etat.acces === "bloque") && (await this.sansEssai());
    const formule: Formule = p.formule ?? "essentiel";
    const abonne = p.statut === "actif" || p.statut === "echec" || (p.statut === "resilie" && !!p.periodeFin && p.periodeFin > maintenant);
    const prix = eurosDeCentimes(prixDeFormule(formule, reglages));
    const bascule = this.actif && abonne && formule === "essentiel" && p.statut === "actif" && !p.resiliationDemandeeLe && p.ligne?.periodeDebut && p.ligne.periodeFin ? prorataVersPro({ debut: p.ligne.periodeDebut, fin: p.ligne.periodeFin }, maintenant, reglages) : null;
    return {
      actif: this.actif,
      paiement: this.config.abonnement.paiement,
      modeTest: this.config.abonnement.paiement === "simule" ? BANDEAU_MODE_TEST : null,
      acces: !this.actif ? "abonne" : gratuit ? "gratuit" : etat.acces,
      /** La formule de l'abonnement (Essentiel tant qu'il n'y en a pas). */
      formule,
      /** Le prix HT de la formule, et sa période (« par mois », « par an »). */
      prixHt: prix,
      prixTtc: eurosDeCentimes(montantsFacture(prixDeFormule(formule, reglages), reglages.tauxTva).ttc),
      periode: "par mois",
      /** Les deux formules, Essentiel d'abord (paywall, « Mon abonnement »). */
      offres: offresAbonnement(reglages).map((o) => ({ ...o, ttc: eurosDeCentimes(montantsFacture(prixDeFormule(o.formule, reglages), reglages.tauxTva).ttc) })),
      prixDes: prixDes(reglages),
      /** Le passage à Pro, au prorata : ce qui est déduit du mois en cours et ce qui sera payé tout de suite. */
      bascule: bascule ? { credit: eurosDeCentimes(bascule.creditCentimes), aPayerHt: eurosDeCentimes(bascule.aPayerHtCentimes), aPayerTtc: eurosDeCentimes(montantsFacture(bascule.aPayerHtCentimes, reglages.tauxTva).ttc), jusquau: bascule.fin.toISOString() } : null,
      essaiFinLe: etat.essaiFinLe?.toISOString() ?? null,
      joursEssai: gratuit ? null : etat.joursEssai,
      graceFinLe: etat.graceFinLe?.toISOString() ?? null,
      periodeFin: etat.periodeFin?.toISOString() ?? null,
      resiliationProgrammee: etat.resiliationProgrammee,
      statut: p.statut,
      tvaIntra: p.ligne?.tvaIntra ?? null,
      bandeau: this.actif ? (bandeauGrace(etat) ?? (gratuit ? null : bandeauEssai(etat))) : null,
      bandeauRouge: this.actif && etat.acces === "grace",
      paywall: { phrase: gratuit ? TARIFS.paywallAchatGroupe : phrasePaywall(reglages), economie: gratuit ? null : phraseEconomiePremierCycle(ecart) },
    };
  }

  // ---------------------------------------------------------------- le paiement

  /** « Je continue » : la page de paiement (simulée, ou Stripe Checkout) de la formule choisie. */
  async commencerPaiement(tenant: TenantContext, formule: Formule = "essentiel"): Promise<{ url: string }> {
    assertCanWrite(tenant);
    if (!this.actif) throw notFound("Route");
    const web = this.config.webAppUrl.replace(/\/$/, "");
    if (this.config.abonnement.paiement === "stripe") {
      if (!this.stripe) throw new DomainError("internal_error", "Stripe not configured");
      const a = await this.prisma.abonnement.findUnique({ where: { companyId: tenant.companyId } });
      const s = await this.stripe.checkout({ companyId: tenant.companyId, customerId: a?.stripeCustomerId ?? null, email: await this.emailDe(tenant.companyId), formule, succes: `${web}/abonnement?paiement=ok`, annulation: `${web}/abonnement` });
      return { url: s.url };
    }
    const session = `sim_${randomBytes(12).toString("hex")}`;
    await this.prisma.evenementAbonnement.create({ data: { companyId: tenant.companyId, type: "session", source: "simule", refExterne: session, donnees: { formule } } });
    return { url: `${web}/paiement-simule?session=${session}` };
  }

  /** La page « Paiement (simulation) » : « Payer » ou « Échec du paiement ». Les mêmes événements que Stripe. */
  async simuler(tenant: TenantContext, session: string, issue: "payer" | "echec", maintenant = this.now()) {
    assertCanWrite(tenant);
    if (!this.actif || this.config.abonnement.paiement !== "simule") throw notFound("Route");
    const s = await this.prisma.evenementAbonnement.findUnique({ where: { refExterne: session } });
    if (!s || s.type !== "session" || s.companyId !== tenant.companyId) throw notFound("Session");
    if (issue === "payer") {
      const f = (s.donnees as { formule?: unknown } | null)?.formule;
      const formule: Formule = formuleEnregistree(f);
      await this.appliquer(tenant.companyId, { type: "actif", source: "simule", formule, ref: `${session}:paye`, periodeDebut: maintenant, periodeFin: finDePeriode(maintenant, formule), facture: { ref: `${session}:paye` } }, maintenant);
    } else {
      await this.appliquer(tenant.companyId, { type: "echec", source: "simule", ref: `${session}:echec` }, maintenant);
    }
    return this.vue(tenant, maintenant);
  }

  /** La formule d'une session de paiement simulée (la page « Paiement (simulation) » dit le bon prix). */
  async formuleDeSession(tenant: TenantContext, session: string): Promise<Formule> {
    const s = await this.prisma.evenementAbonnement.findUnique({ where: { refExterne: session } });
    if (!s || s.type !== "session" || s.companyId !== tenant.companyId) throw notFound("Session");
    const f = (s.donnees as { formule?: unknown } | null)?.formule;
    return formuleEnregistree(f);
  }

  /**
   * PASSER À PRO, À TOUT MOMENT, AU PRORATA (30 octobre 2026, sur le modèle du passage à l'annuel du 24 octobre) : le mois
   * de Pro commence aujourd'hui ; ce qui reste du mois d'Essentiel payé est déduit de la première facture de Pro. Stripe fait
   * le même calcul (`proration_behavior`), et sa facture arrive par le webhook ; en simulé, le passage est payé tout de suite.
   */
  async passerPro(tenant: TenantContext, maintenant = this.now()) {
    assertCanWrite(tenant);
    if (!this.actif) throw notFound("Route");
    const a = await this.prisma.abonnement.findUnique({ where: { companyId: tenant.companyId } });
    if (!a || a.statut !== "actif") throw validationFailed("No active subscription", { reason: "pas_d_abonnement" });
    if (formuleEnregistree(a.formule) === "pro") throw validationFailed("Already Pro", { reason: "deja_pro" });
    if (a.resiliationDemandeeLe) throw validationFailed("Cancellation pending", { reason: "resiliation_programmee" });
    if (a.fournisseur === "stripe") {
      if (!this.stripe || !a.stripeSubscriptionId) throw new DomainError("internal_error", "Stripe not configured");
      await this.stripe.passerPro(a.stripeSubscriptionId);
      // L'accès et la facture suivent les webhooks (customer.subscription.updated, invoice.paid) ; la formule, tout de suite.
      await this.prisma.abonnement.update({ where: { companyId: tenant.companyId }, data: { formule: "pro" } });
      await this.prisma.evenementAbonnement.create({ data: { companyId: tenant.companyId, type: "passage_pro_demande", source: "artisan" } });
      return this.vue(tenant, maintenant);
    }
    const reglages = await this.reglages();
    const dernier = await this.prisma.factureAbonnement.findFirst({ where: { companyId: tenant.companyId, periodeFin: a.periodeFin ?? undefined }, orderBy: { rang: "desc" } });
    const p = prorataVersPro({ debut: a.periodeDebut ?? maintenant, fin: a.periodeFin ?? maintenant }, maintenant, reglages, dernier?.montantHtCentimes ?? reglages.prixEssentielHtCentimes);
    const ref = `passage-pro:${tenant.companyId}:${maintenant.toISOString()}`;
    await this.appliquer(tenant.companyId, { type: "passage_pro", source: "simule", formule: "pro", ref, periodeDebut: p.debut, periodeFin: p.fin, facture: { ref, htCentimes: p.aPayerHtCentimes } }, maintenant);
    return this.vue(tenant, maintenant);
  }

  /** Résilier (deux clics à l'écran) : effet en fin de période payée, confirmation par e-mail. */
  async resilier(tenant: TenantContext, maintenant = this.now()) {
    assertCanWrite(tenant);
    const a = await this.prisma.abonnement.findUnique({ where: { companyId: tenant.companyId } });
    if (!a || (a.statut !== "actif" && a.statut !== "echec")) throw validationFailed("No active subscription", { reason: "pas_d_abonnement" });
    if (a.fournisseur === "stripe" && a.stripeSubscriptionId && this.stripe) await this.stripe.resilierEnFinDePeriode(a.stripeSubscriptionId);
    await this.appliquer(tenant.companyId, { type: "resiliation_demandee", source: "artisan", ref: null }, maintenant);
    return this.vue(tenant, maintenant);
  }

  /** Le portail client Stripe (changer de carte, voir les paiements) ; en simulé, l'écran « Mon abonnement » suffit. */
  async portail(tenant: TenantContext): Promise<{ url: string }> {
    const web = this.config.webAppUrl.replace(/\/$/, "");
    const a = await this.prisma.abonnement.findUnique({ where: { companyId: tenant.companyId } });
    if (this.config.abonnement.paiement !== "stripe" || !this.stripe || !a?.stripeCustomerId) return { url: `${web}/abonnement` };
    return this.stripe.portail(a.stripeCustomerId, `${web}/abonnement`);
  }

  /** Le n° de TVA intracommunautaire de l'artisan (facultatif), écrit sur ses prochaines factures. */
  async majTva(tenant: TenantContext, tva: string | null) {
    assertCanWrite(tenant);
    const propre = tva ? tva.replace(/\s+/g, "").toUpperCase() : null;
    if (propre && !/^[A-Z]{2}[A-Z0-9]{8,12}$/.test(propre)) throw validationFailed("Invalid VAT number", { reason: "tva_invalide" });
    await this.prisma.abonnement.upsert({
      where: { companyId: tenant.companyId },
      create: { companyId: tenant.companyId, fournisseur: this.config.abonnement.paiement, tvaIntra: propre },
      update: { tvaIntra: propre },
    });
    return this.vue(tenant);
  }

  /**
   * Applique un événement de paiement : une seule fois par `ref` ; met à jour l'abonnement, émet la facture d'un paiement
   * encaissé, prévient l'artisan (échec, résiliation). Le cœur commun du paiement simulé et de Stripe.
   */
  async appliquer(companyId: string, e: EvenementPaiement, maintenant = this.now()): Promise<boolean> {
    if (e.ref && (await this.prisma.evenementAbonnement.findUnique({ where: { refExterne: e.ref } }))) return false;
    const fournisseur = e.source === "stripe" ? "stripe" : this.config.abonnement.paiement;
    const avant = await this.prisma.abonnement.findUnique({ where: { companyId } });
    const formule: Formule = e.formule ?? formuleEnregistree(avant?.formule);
    let data: MajAbonnement = {};
    switch (e.type) {
      case "actif":
      case "renouvele":
      case "passage_pro":
        data = { statut: "actif", formule, periodeDebut: e.periodeDebut ?? maintenant, periodeFin: e.periodeFin ?? finDePeriode(e.periodeDebut ?? maintenant, formule), echecLe: null, ...(e.type === "actif" ? { resiliationDemandeeLe: null, resilieLe: null } : {}) };
        break;
      case "echec":
        data = { statut: "echec", echecLe: avant?.echecLe ?? maintenant };
        break;
      case "resiliation_demandee":
        data = { resiliationDemandeeLe: avant?.resiliationDemandeeLe ?? maintenant };
        break;
      case "resilie":
        data = { statut: "resilie", resilieLe: maintenant };
        break;
    }
    if (e.stripe?.customerId) data.stripeCustomerId = e.stripe.customerId;
    if (e.stripe?.subscriptionId) data.stripeSubscriptionId = e.stripe.subscriptionId;
    await this.prisma.$transaction(async (tx) => {
      await tx.evenementAbonnement.create({ data: { companyId, type: e.type, source: e.source, refExterne: e.ref, donnees: { periodeFin: e.periodeFin?.toISOString() ?? null, formule } } });
      await tx.abonnement.upsert({ where: { companyId }, create: { ...data, companyId, fournisseur }, update: { ...data, fournisseur } });
      if (e.facture && (e.type === "actif" || e.type === "renouvele" || e.type === "passage_pro")) await this.emettreFacture(tx, companyId, { ...e, formule }, maintenant, fournisseur === "stripe" ? "F" : "TEST");
    });
    await this.prevenir(companyId, e, maintenant).catch(() => undefined);
    return true;
  }

  /** La facture d'un paiement : numéro suivant de la série dans la même transaction (aucun trou), HT, TVA, TTC, client. */
  private async emettreFacture(tx: Tx, companyId: string, e: EvenementPaiement, maintenant: Date, serie: SerieFacture) {
    if (e.facture?.ref && (await tx.factureAbonnement.findUnique({ where: { refExterne: e.facture.ref } }))) return;
    const reglages = await this.reglages();
    const formule: Formule = e.formule ?? "essentiel";
    const calcul = montantsFacture(prixDeFormule(formule, reglages), reglages.tauxTva);
    const ht = e.facture?.htCentimes ?? calcul.ht;
    const tva = e.facture?.tvaCentimes ?? (e.facture?.htCentimes !== undefined ? Math.round((ht * reglages.tauxTva) / 100) : calcul.tva);
    const ttc = e.facture?.ttcCentimes ?? ht + tva;
    const c = await tx.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true, siret: true, address: true, abonnement: { select: { tvaIntra: true } } } });
    const compteur = await tx.compteurFacture.upsert({ where: { serie }, create: { serie, dernier: 1 }, update: { dernier: { increment: 1 } } });
    const debut = e.periodeDebut ?? maintenant;
    await tx.factureAbonnement.create({
      data: {
        numero: numeroFacture(serie, compteur.dernier),
        serie,
        rang: compteur.dernier,
        companyId,
        raisonSociale: c.name,
        siret: c.siret,
        adresse: c.address,
        tvaIntra: c.abonnement?.tvaIntra ?? null,
        periodeDebut: debut,
        periodeFin: e.periodeFin ?? finDePeriode(debut, formule),
        formule: e.type === "passage_pro" ? "passage_pro" : formule,
        montantHtCentimes: ht,
        tvaCentimes: tva,
        ttcCentimes: ttc,
        tauxTva: reglages.tauxTva,
        emiseLe: maintenant,
        refExterne: e.facture?.ref ?? null,
      },
    });
  }

  // ---------------------------------------------------------------- les factures

  async factures(tenant: TenantContext) {
    const f = await this.prisma.factureAbonnement.findMany({ where: { companyId: tenant.companyId }, orderBy: { rang: "desc" } });
    return f.map((x) => ({ id: x.id, numero: x.numero, test: x.serie === "TEST", formule: x.formule, emiseLe: x.emiseLe.toISOString(), periode: `du ${dateFr(x.periodeDebut)} au ${dateFr(x.periodeFin)}`, ttc: eurosDeCentimes(x.ttcCentimes), ht: eurosDeCentimes(x.montantHtCentimes) }));
  }

  async facturePdf(tenant: TenantContext, id: string): Promise<{ nom: string; pdf: Uint8Array }> {
    const f = await this.prisma.factureAbonnement.findUnique({ where: { id } });
    if (!f || f.companyId !== tenant.companyId) throw notFound("Invoice");
    const em = this.config.groupe?.facture.emetteur ?? EMETTEUR_FACTURES;
    const test = f.serie === "TEST";
    const pdf = await pdfDeTexte(`${test ? "FACTURE DE TEST (aucun paiement réel) " : "Facture "}n° ${f.numero}`, [
      { titre: "Émise par", lignes: [`${em.nom}${"forme" in em && em.forme ? `, ${em.forme}` : ""}${em.siret === MENTIONS_EDITEUR.siret ? ` au capital de ${MENTIONS_EDITEUR.capital}, ${MENTIONS_EDITEUR.rcs}` : ""}`, em.adresse, `SIRET ${em.siret}`, `TVA intracommunautaire ${em.tvaIntracom}`, ...(em.siret === MENTIONS_EDITEUR.siret ? [`Contact : ${MENTIONS_EDITEUR.contact}`] : [])] },
      { titre: "Client", lignes: [f.raisonSociale, ...(f.siret ? [`SIRET ${f.siret}`] : []), ...(f.adresse ? [f.adresse] : []), ...(f.tvaIntra ? [`TVA intracommunautaire ${f.tvaIntra}`] : [])] },
      { titre: "Détail", lignes: [`Date d'émission : ${dateFr(f.emiseLe)}`, ["Désignation", "Montant HT"], [designationFacture(f), eurosDeCentimes(f.montantHtCentimes)]] },
      { titre: "Total", lignes: [["Total HT", eurosDeCentimes(f.montantHtCentimes)], [`TVA ${Number(f.tauxTva).toLocaleString("fr-FR")} %`, eurosDeCentimes(f.tvaCentimes)], ["Total TTC", eurosDeCentimes(f.ttcCentimes)]] },
      { lignes: [test ? "Facture de test émise en mode simulation : aucun paiement n'a eu lieu, elle n'a aucune valeur comptable." : "Facture acquittée : payée par carte à l'émission.", mentionFormule(f.formule)] },
    ]);
    return { nom: `${f.numero}.pdf`, pdf };
  }

  // ---------------------------------------------------------------- Stripe

  /** Un webhook Stripe déjà vérifié (signature) : traduit en événement commun. Inconnu ou sans entreprise : ignoré. */
  async webhookStripe(evt: { id: string; type: string; data: { object: Record<string, unknown> } }): Promise<{ traite: boolean }> {
    const o = evt.data.object;
    const str = (v: unknown) => (typeof v === "string" ? v : null);
    const date = (v: unknown) => (typeof v === "number" ? new Date(v * 1000) : undefined);
    const meta = (x: unknown) => str((x as { metadata?: Record<string, unknown> } | null)?.metadata?.companyId);
    const parClient = async (customer: string | null) => (customer ? (await this.prisma.abonnement.findUnique({ where: { stripeCustomerId: customer }, select: { companyId: true } }))?.companyId ?? null : null);
    const stripe = { customerId: str(o.customer), subscriptionId: str(o.subscription) ?? (evt.type.startsWith("customer.subscription") ? str(o.id) : null) };
    // La formule : le prix de la ligne (facture, abonnement), sinon la métadonnée posée au Checkout.
    const prixDe = (x: unknown) => {
      const l = x as { price?: { id?: unknown }; pricing?: { price_details?: { price?: unknown } } } | undefined;
      return str(l?.price?.id) ?? str(l?.pricing?.price_details?.price);
    };
    const formuleDe = (priceId: string | null): Formule | undefined => {
      const f = this.stripe?.formuleDuPrix(priceId) ?? (o.metadata as { formule?: unknown } | undefined)?.formule;
      return estFormule(f) ? f : undefined;
    };
    switch (evt.type) {
      case "checkout.session.completed": {
        const companyId = str(o.client_reference_id) ?? meta(o);
        if (!companyId) return { traite: false };
        // Le paiement lui-même arrive par invoice.paid (la facture) ; ici le lien client / abonnement et l'accès.
        const f = (o.metadata as { formule?: unknown } | undefined)?.formule;
        await this.appliquer(companyId, { type: "actif", source: "stripe", ref: evt.id, stripe, ...(estFormule(f) ? { formule: f } : {}) });
        return { traite: true };
      }
      case "invoice.paid": {
        const companyId = (await parClient(stripe.customerId)) ?? meta((o.parent as { subscription_details?: unknown } | undefined)?.subscription_details) ?? meta(o.subscription_details);
        if (!companyId) return { traite: false };
        const lignes = (o.lines as { data?: { period?: { start?: number; end?: number }; amount?: number }[] } | undefined)?.data ?? [];
        // Un passage à Pro : une ligne de crédit (négative) pour le mois d'Essentiel non utilisé, puis le mois de Pro.
        const ligne = lignes.find((l) => (l.amount ?? 0) > 0) ?? lignes[0];
        const formule = formuleDe(prixDe(ligne));
        const ht = typeof o.subtotal === "number" ? o.subtotal : undefined;
        const ttc = typeof o.total === "number" ? o.total : undefined;
        await this.appliquer(companyId, {
          type: o.billing_reason === "subscription_create" ? "actif" : o.billing_reason === "subscription_update" ? "passage_pro" : "renouvele",
          source: "stripe",
          ref: evt.id,
          ...(formule ? { formule } : {}),
          periodeDebut: date(ligne?.period?.start),
          periodeFin: date(ligne?.period?.end),
          facture: { ref: str(o.id) ?? evt.id, ...(ht !== undefined ? { htCentimes: ht } : {}), ...(ttc !== undefined ? { ttcCentimes: ttc, ...(ht !== undefined ? { tvaCentimes: ttc - ht } : {}) } : {}) },
          stripe,
        });
        return { traite: true };
      }
      case "invoice.payment_failed": {
        const companyId = await parClient(stripe.customerId);
        if (!companyId) return { traite: false };
        await this.appliquer(companyId, { type: "echec", source: "stripe", ref: evt.id, stripe });
        return { traite: true };
      }
      case "customer.subscription.updated": {
        const companyId = (await parClient(stripe.customerId)) ?? meta(o);
        if (!companyId) return { traite: false };
        const item = ((o.items as { data?: { current_period_end?: number }[] } | undefined)?.data ?? [])[0];
        const fin = date(o.current_period_end) ?? date(item?.current_period_end);
        const formule = formuleDe(prixDe(item));
        if (o.cancel_at_period_end === true) await this.appliquer(companyId, { type: "resiliation_demandee", source: "stripe", ref: evt.id, stripe });
        else if (o.status === "past_due" || o.status === "unpaid") await this.appliquer(companyId, { type: "echec", source: "stripe", ref: evt.id, stripe });
        else if (o.status === "active" && fin) {
          // Réactivée (résiliation annulée dans le portail) ou période prolongée : l'accès suit Stripe, sans facture.
          await this.prisma.abonnement.update({ where: { companyId }, data: { statut: "actif", periodeFin: fin, resiliationDemandeeLe: null, echecLe: null, ...(formule ? { formule } : {}) } }).catch(() => undefined);
          await this.prisma.evenementAbonnement.create({ data: { companyId, type: "mise_a_jour", source: "stripe", refExterne: evt.id } }).catch(() => undefined);
        }
        return { traite: true };
      }
      case "customer.subscription.deleted": {
        const companyId = (await parClient(stripe.customerId)) ?? meta(o);
        if (!companyId) return { traite: false };
        await this.appliquer(companyId, { type: "resilie", source: "stripe", ref: evt.id, stripe });
        return { traite: true };
      }
      default:
        return { traite: false };
    }
  }

  // ---------------------------------------------------------------- la tâche planifiée

  /**
   * Chaque heure : en paiement simulé, le renouvellement (d'un mois ou d'un an, le même événement que Stripe), et la fin
   * des abonnements résiliés ; partout, les rappels de fin d'essai (7 jours avant, la veille, le jour même) et le rappel
   * de renouvellement de l'annuel (30 jours avant), une fois chacun.
   */
  async tache(maintenant = this.now()): Promise<{ renouveles: number; resilies: number; rappels: number; rappelsAnnuels: number }> {
    if (!this.actif) return { renouveles: 0, resilies: 0, rappels: 0, rappelsAnnuels: 0 };
    let renouveles = 0;
    let resilies = 0;
    const echus = await this.prisma.abonnement.findMany({ where: { fournisseur: "simule", statut: "actif", periodeFin: { lte: maintenant } } });
    for (const a of echus) {
      if (a.resiliationDemandeeLe) {
        if (await this.appliquer(a.companyId, { type: "resilie", source: "tache", ref: `resilie:${a.companyId}:${a.periodeFin!.toISOString()}` }, maintenant)) resilies++;
        continue;
      }
      const echec = await this.prisma.parametreGroupe.findUnique({ where: { cle: `abonnement:prochain-echec:${a.companyId}` } });
      if (echec) {
        await this.prisma.parametreGroupe.delete({ where: { cle: echec.cle } });
        await this.appliquer(a.companyId, { type: "echec", source: "simule", ref: `echec:${a.companyId}:${a.periodeFin!.toISOString()}` }, maintenant);
        continue;
      }
      const debut = a.periodeFin!;
      const formule: Formule = formuleEnregistree(a.formule);
      const ref = `renouvele:${a.companyId}:${debut.toISOString()}`;
      if (await this.appliquer(a.companyId, { type: "renouvele", source: "simule", formule, ref, periodeDebut: debut, periodeFin: finDePeriode(debut, formule), facture: { ref } }, maintenant)) renouveles++;
    }
    return { renouveles, resilies, rappels: await this.rappels(maintenant), rappelsAnnuels: await this.rappelsAnnuels(maintenant) };
  }

  /**
   * LE RAPPEL DE RENOUVELLEMENT DE L'ANNUEL (Greg, 24 octobre 2026) : 30 jours avant l'échéance, une fois par année,
   * simulé ou Stripe. Il touche au paiement : il part même quand les relances sont coupées.
   */
  async rappelsAnnuels(maintenant = this.now()): Promise<number> {
    const reglages = await this.reglages();
    const jusqua = new Date(maintenant.getTime() + reglages.joursRappelAnnuel * JOUR);
    const annuels = await this.prisma.abonnement.findMany({ where: { formule: "annuel", statut: "actif", resiliationDemandeeLe: null, periodeFin: { gt: maintenant, lte: jusqua } } });
    let n = 0;
    for (const a of annuels) {
      if (!rappelRenouvellementDu({ formule: "annuel", statut: "actif", periodeFin: a.periodeFin, resiliationDemandeeLe: a.resiliationDemandeeLe }, maintenant, reglages)) continue;
      const ref = `rappel-annuel:${a.companyId}:${a.periodeFin!.toISOString().slice(0, 10)}`;
      if (await this.prisma.evenementAbonnement.findUnique({ where: { refExterne: ref } })) continue;
      await this.prisma.evenementAbonnement.create({ data: { companyId: a.companyId, type: "rappel_renouvellement", source: "tache", refExterne: ref } });
      const to = await this.emailDe(a.companyId);
      if (!to) continue;
      const m = emailRenouvellementAnnuel({ echeance: a.periodeFin!, reglages, lien: `${this.config.webAppUrl.replace(/\/$/, "")}/abonnement`, nomApp: NOM_APP });
      await this.email.send({ to, subject: m.objet, text: m.texte }).catch(() => undefined);
      n++;
    }
    return n;
  }

  /** Les rappels de fin d'essai des entreprises sans abonnement actif. */
  async rappels(maintenant = this.now()): Promise<number> {
    let n = 0;
    if (await this.sansEssai()) return 0;
    const depuis = new Date(maintenant.getTime() - 400 * JOUR);
    // Un rappel de fin d'essai est une relance : « Ne plus recevoir ces e-mails » l'arrête (RGPD, opposition en un clic).
    const entreprises = await this.prisma.company.findMany({ where: { createdAt: { gte: depuis }, emailsCoupesLe: null, OR: [{ abonnement: null }, { abonnement: { statut: { in: ["aucun", "resilie"] } } }] }, select: { id: true } });
    for (const { id } of entreprises) {
      const etat = await this.etat(id, maintenant);
      if (etat.acces !== "essai" && etat.acces !== "bloque") continue;
      const rappel = rappelEssaiDu(etat.essaiFinLe, maintenant);
      if (!rappel) continue;
      const ref = `rappel:${rappel}:${id}:${etat.essaiFinLe!.toISOString().slice(0, 10)}`;
      if (await this.prisma.evenementAbonnement.findUnique({ where: { refExterne: ref } })) continue;
      const to = await this.emailDe(id);
      await this.prisma.evenementAbonnement.create({ data: { companyId: id, type: `rappel_${rappel}`, source: "tache", refExterne: ref } });
      if (!to) continue;
      const m = emailRappelEssai(rappel, { ecart: await this.ecart(id).catch(() => null), lien: `${this.config.webAppUrl.replace(/\/$/, "")}/abonnement`, reglages: await this.reglages(), nomApp: NOM_APP });
      const stop = lienEmailsCoupes(this.config.webAppUrl.replace(/\/$/, ""), this.config.authSecret, id);
      await this.email.send({ to, subject: m.objet, text: `${m.texte}\n\nNe plus recevoir ces e-mails : ${stop}` }).catch(() => undefined);
      n++;
    }
    return n;
  }

  /** Mode démo (admin) : le prochain renouvellement simulé échoue ; ou, sans abonnement, l'échec tout de suite. */
  async simulerEchec(companyId: string, maintenant = this.now()) {
    const a = await this.prisma.abonnement.findUnique({ where: { companyId } });
    // Stripe de test (prévisualisation) : le renouvellement est chez Stripe ; la démo applique le refus tout de suite.
    if (a?.statut === "actif" && a.fournisseur === "stripe") {
      await this.appliquer(companyId, { type: "echec", source: "admin", ref: null }, maintenant);
      return;
    }
    if (a?.statut === "actif") {
      // Le calendrier : la période se termine maintenant et son renouvellement échoue (comme une carte refusée).
      await this.prisma.abonnement.update({ where: { companyId }, data: { periodeFin: maintenant } });
      await this.prisma.parametreGroupe.upsert({ where: { cle: `abonnement:prochain-echec:${companyId}` }, create: { cle: `abonnement:prochain-echec:${companyId}`, valeur: true }, update: { valeur: true } });
      await this.tache(maintenant);
    } else {
      await this.appliquer(companyId, { type: "echec", source: "admin", ref: null }, maintenant);
    }
  }

  /** Mode démo (admin) : l'essai de l'entreprise se termine à cet instant, comme le calendrier l'aurait fait. */
  async finirEssai(companyId: string, maintenant = this.now()) {
    const cle = `abonnement:essai-fini:${companyId}`;
    await this.prisma.parametreGroupe.upsert({ where: { cle }, create: { cle, valeur: { le: maintenant.toISOString() } }, update: { valeur: { le: maintenant.toISOString() } } });
  }

  // ---------------------------------------------------------------- e-mails

  private async emailDe(companyId: string): Promise<string | null> {
    const c = await this.prisma.company.findUnique({ where: { id: companyId }, select: { contactEmail: true, memberships: { where: { role: "owner" }, select: { user: { select: { email: true } } }, take: 1 } } });
    return c?.contactEmail ?? c?.memberships[0]?.user.email ?? null;
  }

  /** Les e-mails de l'abonnement : activé, échec (grâce), résiliation programmée. Toujours envoyés (ils touchent au paiement). */
  private async prevenir(companyId: string, e: EvenementPaiement, maintenant: Date) {
    const to = await this.emailDe(companyId);
    if (!to) return;
    const lien = `${this.config.webAppUrl.replace(/\/$/, "")}/abonnement`;
    const a = await this.prisma.abonnement.findUnique({ where: { companyId } });
    const reglages = await this.reglages();
    const test = a?.fournisseur !== "stripe" ? " (mode test : aucun paiement réel)" : "";
    const annuel = a?.formule === "annuel";
    const nom = formuleEnregistree(a?.formule) === "pro" ? "Pro" : "Essentiel";
    const offre = annuel ? `${eurosDeCentimes(reglages.prixAnnuelHtCentimes)} HT par an, payé en une fois, renouvelé chaque année (rappel 30 jours avant)` : `${nom}, ${eurosDeCentimes(prixDeFormule(formuleEnregistree(a?.formule), reglages))} HT par mois, sans engagement`;
    if (e.type === "actif") {
      await this.email.send({ to, subject: `Ton abonnement ${NOM_APP} est actif`, text: ["Bonjour,", "", `Ton abonnement ${NOM_APP} est actif${test} : ${offre}.`, a?.periodeFin ? `Prochain renouvellement le ${dateFr(a.periodeFin)}.` : "", "Ta facture est dans « Mes factures ».", "", lien].filter((l) => l !== "").join("\n") });
    } else if (e.type === "passage_pro") {
      await this.email.send({ to, subject: `Tu es passé à ${NOM_APP} Pro`, text: ["Bonjour,", "", `Tu es passé à l'abonnement Pro${test} : ${offre}.`, "Ce qui restait de ton mois d'Essentiel est déduit de ta première facture Pro.", a?.periodeFin ? `Prochain renouvellement le ${dateFr(a.periodeFin)}.` : "", "Ta facture est dans « Mes factures ».", "", lien].filter((l) => l !== "").join("\n") });
    } else if (e.type === "echec") {
      const fin = new Date((a?.echecLe ?? maintenant).getTime() + reglages.joursGrace * JOUR);
      await this.email.send({ to, subject: `Ton paiement ${NOM_APP} n'est pas passé`, text: ["Bonjour,", "", `Ton paiement n'est pas passé${test}.`, `Tu gardes l'accès jusqu'au ${dateFr(fin)}. Mets à jour ta carte avant cette date pour continuer.`, "", lien].join("\n") });
    } else if (e.type === "resiliation_demandee") {
      await this.email.send({ to, subject: `Ta résiliation ${NOM_APP} est enregistrée`, text: ["Bonjour,", "", "Ta résiliation est enregistrée : rien ne sera plus prélevé.", a?.periodeFin ? `Tu gardes l'accès jusqu'au ${dateFr(a.periodeFin)}, ${annuel ? "l'échéance de ton année (une année commencée n'est pas remboursée au prorata)" : "la fin de la période payée"}.` : "", "Tes listes, tes bons et tes factures restent consultables.", "", lien].filter((l) => l !== "").join("\n") });
    }
  }

}

/** La ligne de la facture : la formule et sa période. */
function designationFacture(f: { formule: string; periodeDebut: Date; periodeFin: Date }): string {
  const periode = `du ${dateFr(f.periodeDebut)} au ${dateFr(f.periodeFin)}`;
  if (f.formule === "passage_pro") return `Passage à l'abonnement ${NOM_APP} Pro, ${periode}, moins la part non utilisée du mois d'Essentiel`;
  // Les factures d'avant le 30 octobre 2026 gardent leur libellé (mensuel, annuel, passage à l'annuel).
  if (f.formule === "bascule") return `Passage à l'abonnement annuel ${NOM_APP}, ${periode}, moins la part non utilisée du mois en cours`;
  if (f.formule === "annuel" || f.formule === "mensuel") return `Abonnement ${f.formule} ${NOM_APP}, ${periode}`;
  return `Abonnement ${NOM_APP} ${f.formule === "pro" ? "Pro" : "Essentiel"}, ${periode}`;
}

/** La mention de bas de facture, selon la formule (CGU, partie Abonnement). */
function mentionFormule(formule: string): string {
  return formule === "annuel" || formule === "bascule"
    ? "Abonnement annuel payé d'avance, renouvelé automatiquement chaque année (rappel 30 jours avant l'échéance) ; résiliable à tout moment avec effet à l'échéance, sans remboursement au prorata."
    : "Abonnement mensuel sans engagement, résiliable à tout moment avec effet en fin de période payée.";
}
