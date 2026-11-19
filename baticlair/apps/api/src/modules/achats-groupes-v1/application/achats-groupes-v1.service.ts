import {
  actionsAFaireV1,
  apresCloture,
  BESOIN_ACTIF_V1,
  calculOffreV1,
  euros,
  CASE_PLUSIEURS_LIGNES,
  CASE_UNE_LIGNE,
  classerLigneV1,
  cleProduitV1,
  departement as departementConnu,
  differencesV1,
  estLotV1,
  lotsComprisV1,
  HABILITATIONS_V1,
  LIBELLES_STATUT_V1,
  manquantesV1,
  lotOuvertV1,
  libelleLot,
  METIER_DU_LOT_V1,
  LIBELLES_METIERS_CATALOGUE,
  ouvertsDAbord,
  type MetiersOuverts,
  completerV1,
  aPreciserPlusTardV1,
  besoinUrgentV1,
  PHRASE_BESOIN_URGENT,
  manquesOffreV1,
  MOTIFS_V1,
  nomProduitV1,
  ouvertureV1,
  peutBesoinV1,
  peutCircuit,
  phraseAPreciser,
  PHRASE_BESOIN_IDENTIQUE,
  PHRASE_MODIFICATION_TRANSMISE,
  PHRASE_RETRAIT_TRANSMIS,
  phrasesVolumesV1,
  preparationV1,
  produitV1,
  PRODUITS_V1,
  quantiteAvecConversion,
  quantiteLisible,
  quantiteReference,
  RAISONS_NE_CONVIENT_PAS,
  statutAfficheV1,
  suiviRetraitsTardifs,
  transitionV1,
  volumesV1,
  participantsVisiblesV1,
  SEUIL_ENTREPRISES_VOLUMES,
  zoneDuCodePostal,
  type AffichageV1,
  type EtatAchatV1,
  type EtatBesoinV1,
  type LotV1,
  type MotifV1,
  type OffreV1,
  type ProduitV1,
  droitCommandeGroupee,
} from "@baticlair/domain";
import { cleVerrouCircuit, faitsDesLignes } from "../../../platform/cycle/lignes.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { bonDeCommandePdf } from "../../../platform/pdf/bon-de-commande.js";
import { ecrireAlerte } from "../../../platform/notifications/alertes.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import { isUuid } from "../../../platform/validation/ids.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";

/** Ce dont le service a besoin hors de son module : les lignes d'une liste (clé, désignation, quantité, unité). */
export interface PortsAchatsV1 {
  /** L'entreprise a-t-elle un abonnement payé en cours (Pro ou Pro Max) ? Absent : tout est ouvert (abonnement éteint). */
  abonne?(companyId: string): Promise<boolean>;
  lignesDeListe(tenant: TenantContext, projectId: string): Promise<{ nom: string; lignes: { key: string; designation: string; quantite: number | null; unite: string; aRegler: boolean }[] }>;
}

export interface BesoinSaisi {
  type: string;
  attributs: Record<string, string>;
  quantite: number;
  unite: string;
  parUnite: number | null;
  conversionConfirmee: boolean;
  reception: "livraison" | "retrait";
  lieu: string;
  contraintes: string | null;
  dateBesoin: Date;
  /** Rejoindre cet achat (compatible) ; absent : en ouvrir un, seulement s'il n'y en a aucun de compatible. */
  achatId: string | null;
  projectId: string | null;
  articleKey: string | null;
  /** La ligne est déjà partie en demande de prix et l'artisan a répondu « oui » à la question (16 novembre 2026). */
  dejaEnvoyeConfirme?: boolean;
}

type Tx = Parameters<Extract<Parameters<PrismaService["$transaction"]>[0], (...a: never[]) => unknown>>[0];
type Db = Tx | PrismaService;
const violationUnique = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
type AchatRow = Awaited<ReturnType<PrismaService["achatGroupeV1"]["findFirstOrThrow"]>>;
type BesoinRow = Awaited<ReturnType<PrismaService["besoinGroupeV1"]["findFirstOrThrow"]>>;

const n = (d: { toString(): string } | number | null | undefined) => (d === null || d === undefined ? null : Number(d));
const jourIso = (d: Date) => d.toISOString().slice(0, 10);
const dateLisible = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const heureLisible = (d: Date) => `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" })}, ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).replace(":", " h ").replace(/ h 00$/, " h")}`;
const conflit = (reason: string, message: string, extra: Record<string, unknown> = {}) => new DomainError("conflict", message, { reason, message, ...extra });

/** Ce qui manque à une offre sans adresse où envoyer le bon de commande (Greg, 14 novembre 2026). */
const MANQUE_EMAIL_FOURNISSEUR = "adresse e-mail du fournisseur";

/**
 * ACHATS GROUPÉS V1 (Greg, 7 novembre 2026, V5.2 validée). Un achat = un produit précis (clé stricte), le département de
 * l'entreprise, un mode de réception, une période. Isolation : chaque lecture et chaque geste d'un besoin passent par
 * `companyId` ; les autres entreprises ne voient que des totaux (rien sous 5 entreprises), jamais un lieu, un nom ni une
 * quantité individuelle. RÈGLE CHANGÉE le 14 novembre 2026 (Greg, recette n° 2) : à l'offre, l'artisan décide, « Commander à
 * ce prix » (son bon de commande part au fournisseur) ou « Non merci ». Avant : aucune commande, aucune acceptation.
 */
export class AchatsGroupesV1Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ports: PortsAchatsV1,
    private readonly email: TransactionalEmailSender,
    private readonly options: { actif: boolean; webAppUrl: string; env: string; /** Lot C : les métiers utilisables. */ metiersOuverts?: MetiersOuverts },
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Le nouveau parcours est coupé tant que le réglage ACHATS_GROUPES_V1 n'est pas allumé : les routes répondent 404. */
  exigerActif(): void {
    if (!this.options.actif) throw notFound("Route");
  }

  /* --------------------------------------------------------------------------------- l'entreprise */

  private async zone(companyId: string): Promise<{ code: string; nom: string } | null> {
    const c = await this.prisma.company.findUnique({ where: { id: companyId }, select: { address: true, departement: true } });
    // Le code postal de l'adresse d'abord ; sinon le département choisi à l'inscription (pages régionales, 19 novembre 2026).
    const code = zoneDuCodePostal(c?.address) ?? (departementConnu(c?.departement)?.code ?? null);
    if (!code) return null;
    return { code, nom: departementConnu(code)?.nom ?? code };
  }

  private async verification(tenant: TenantContext) {
    const [c, u] = await Promise.all([
      this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { name: true, siret: true, siretVerifieLe: true, habilitationAg: true, habilitationAgLe: true } }),
      this.prisma.user.findUnique({ where: { id: tenant.userId }, select: { email: true, emailVerified: true } }),
    ]);
    const siretVerifie = !!c.siretVerifieLe;
    const emailVerifie = !!u?.emailVerified;
    // « Après un changement important » : un SIRET vérifié après la déclaration redemande la déclaration.
    const habilitation = c.habilitationAg && c.habilitationAgLe && (!c.siretVerifieLe || c.habilitationAgLe >= c.siretVerifieLe) ? c.habilitationAg : null;
    return {
      entreprise: c.name,
      siret: c.siret,
      siretVerifie,
      siretVerifieLe: c.siretVerifieLe?.toISOString() ?? null,
      email: u?.email ?? null,
      emailVerifie,
      habilitation,
      complete: siretVerifie && emailVerifie && !!habilitation,
    };
  }

  async etat(tenant: TenantContext) {
    this.exigerActif();
    const zone = await this.zone(tenant.companyId);
    return {
      actif: true,
      zone,
      verification: await this.verification(tenant),
      habilitations: HABILITATIONS_V1,
      raisons: RAISONS_NE_CONVIENT_PAS,
      motifs: MOTIFS_V1,
      // Lot C : seuls les produits d'un métier ouvert se publient ; les filtres disent « Bientôt » pour les autres.
      produits: PRODUITS_V1.filter((p) => this.lotOuvert(p.lot)).map((p) => ({ type: p.type, libelle: p.libelle, lot: p.lot, unite: p.unite, conditionnements: p.conditionnements, caracteristiques: p.caracteristiques.map((c) => ({ attribut: c.attribut, libelle: c.libelle, options: c.options, importance: c.importance ?? "obligatoire" })) })),
      filtres: ouvertsDAbord([...new Set(PRODUITS_V1.map((p) => p.lot))].map((lot) => ({ id: lot, libelle: this.libelleDuLot(lot), ouvert: this.lotOuvert(lot) }))),
    };
  }

  private lotOuvert(lot: string): boolean {
    return lotOuvertV1(lot, this.options.metiersOuverts ?? "tous");
  }
  /** Le nom du métier derrière un lot (« Plâtrerie et isolation », « Charpente ») : jamais « Isolation » ni « Bois » seuls. */
  private libelleDuLot(lot: string): string {
    const m = METIER_DU_LOT_V1[lot];
    return m ? LIBELLES_METIERS_CATALOGUE[m] : estLotV1(lot) ? libelleLot(lot) : lot;
  }

  async declarerHabilitation(tenant: TenantContext, role: string) {
    this.exigerActif();
    assertCanWrite(tenant);
    if (!HABILITATIONS_V1.some((h) => h.id === role)) throw validationFailed("Unknown role", { reason: "habilitation_inconnue" });
    await this.prisma.company.update({ where: { id: tenant.companyId }, data: { habilitationAg: role, habilitationAgLe: this.now() } });
    return this.verification(tenant);
  }

  /* --------------------------------------------------------------------- la vue publique d'un achat */

  private affichage(a: Pick<AchatRow, "type" | "conditionnementUnite" | "conditionnementParUnite">): AffichageV1 {
    const p = produitV1(a.type)!;
    const c = a.conditionnementUnite ? p.conditionnements.find((x) => x.unite.code === a.conditionnementUnite) : null;
    const par = n(a.conditionnementParUnite);
    return c && par ? { unite: c.unite, parUnite: par } : { unite: p.unite, parUnite: 1 };
  }

  /**
   * Ce que TOUTE entreprise voit d'un achat : le produit, la zone, la période et des totaux. Greg, 15 novembre 2026 (lots F
   * et H) : le volume total et le nombre d'entreprises (créateur compris) dès la première publication, la date de la
   * dernière évolution réelle, le badge « entreprises vérifiées » ; JAMAIS un nom d'entreprise, ni avant ni après avoir
   * participé (seul l'admin voit l'identité et l'historique).
   */
  private async vuePublique(db: Db, a: AchatRow) {
    const besoins = await db.besoinGroupeV1.findMany({ where: { achatId: a.id }, select: { companyId: true, statut: true, quantite: true, createdAt: true, updatedAt: true, anonyme: true, company: { select: { name: true } } } });
    // Qui participe : les entreprises dont un besoin est confirmé ; le nom, jamais la quantité de chacune.
    const qui = participantsVisiblesV1(besoins.filter((b) => b.statut === "confirme" || b.statut === "reconfirme").map((b) => ({ companyId: b.companyId, nom: b.company.name, anonyme: b.anonyme })));
    const v = volumesV1(besoins.map((b) => ({ companyId: b.companyId, statut: b.statut as EtatBesoinV1, quantite: Number(b.quantite) })), { statut: a.statut as EtatAchatV1 });
    const p = produitV1(a.type)!;
    return {
      id: a.id,
      numero: a.numero,
      nom: a.nom,
      type: a.type,
      // Les caractéristiques du PRODUIT (lues dans sa clé), jamais une donnée d'entreprise : pour préremplir « Rejoindre ».
      attributs: Object.fromEntries(a.cle.split("|").slice(1).map((kv) => kv.split("=") as [string, string])),
      lot: a.lot,
      zone: { code: a.departement, nom: departementConnu(a.departement)?.nom ?? a.departement },
      reception: a.reception,
      dateBesoin: jourIso(a.dateBesoin),
      ouvertJusquau: a.ouvertJusquau.toISOString(),
      statut: a.statut,
      conditionnement: a.conditionnementUnite && a.conditionnementParUnite ? { unite: a.conditionnementUnite, parUnite: Number(a.conditionnementParUnite), libelle: `1 ${p.conditionnements.find((c) => c.unite.code === a.conditionnementUnite)?.unite.singulier ?? a.conditionnementUnite} = ${quantiteLisible(Number(a.conditionnementParUnite), p.unite)}` } : null,
      volumes: phrasesVolumesV1(v, { statut: a.statut as EtatAchatV1 }, this.affichage(a)),
      resume: {
        entreprises: v.entreprises,
        // Sous 3 entreprises : aucun volume (« En cours de regroupement »).
        volume: v.visibles && v.confirmes > 0 ? quantiteLisible(v.confirmes, p.unite) : null,
        regroupement: v.entreprises > 0 && !v.visibles,
        noms: qui.noms,
        anonymes: qui.anonymes,
        // La dernière évolution RÉELLE : le dernier besoin ajouté, modifié ou retiré ; jamais une date fabriquée.
        derniereEvolution: besoins.length ? new Date(Math.max(...besoins.map((b) => b.updatedAt.getTime()))).toISOString() : null,
        // Un besoin n'entre dans un achat qu'après la vérification de l'entreprise (SIRET, e-mail, qualité).
        verifiees: true,
      },
      urgent: a.statut === "ouvert" && besoinUrgentV1(a.dateBesoin, this.now()) ? PHRASE_BESOIN_URGENT : null,
      aPreciser: aPreciserPlusTardV1(a.type, Object.fromEntries(a.cle.split("|").slice(1).map((kv) => kv.split("=") as [string, string]))).map((x) => x.libelle),
    };
  }

  /** « +750 pièces depuis ta publication » : ce que les AUTRES entreprises ont confirmé après ce besoin. Des totaux seulement. */
  private async depuisMaPublication(b: { id: string; achatId: string; companyId: string; createdAt: Date }, p: ProduitV1) {
    const autres = await this.prisma.besoinGroupeV1.findMany({ where: { achatId: b.achatId, companyId: { not: b.companyId }, createdAt: { gt: b.createdAt }, statut: { in: ["confirme", "reconfirme"] } }, select: { companyId: true, quantite: true } });
    const total = Math.round(autres.reduce((t, x) => t + Number(x.quantite), 0) * 1000) / 1000;
    const entreprises = new Set(autres.map((x) => x.companyId)).size;
    // Jamais la quantité d'UNE entreprise : le total ajouté ne se dit qu'à partir de deux nouvelles entreprises, dans un
    // achat qui en compte au moins trois.
    const total3 = await this.prisma.besoinGroupeV1.findMany({ where: { achatId: b.achatId, statut: { in: ["confirme", "reconfirme"] } }, select: { companyId: true }, distinct: ["companyId"] });
    return { entreprises, quantite: total > 0 && entreprises >= 2 && total3.length >= SEUIL_ENTREPRISES_VOLUMES ? `+${quantiteLisible(total, p.unite)}` : null };
  }

  /** Les achats ouverts du département de l'entreprise (accueil, filtres par lot). */
  async achatsOuverts(tenant: TenantContext, lot: string | null) {
    this.exigerActif();
    const zone = await this.zone(tenant.companyId);
    if (!zone) return { zone: null, achats: [] };
    const achats = await this.prisma.achatGroupeV1.findMany({ where: { departement: zone.code, statut: "ouvert", ouvertJusquau: { gt: this.now() }, ...(lot && estLotV1(lot) ? { lot: { in: lotsComprisV1(lot) } } : {}) }, orderBy: { ouvertJusquau: "asc" }, take: 50 });
    // « Tous » ne montre que les achats des métiers ouverts ; un métier « Bientôt » n'a pas de contenu à l'écran.
    const visibles = achats.filter((a) => this.lotOuvert(a.lot));
    // Onglet « Groupés » (Greg, 18 novembre 2026) : un seul bouton par carte, « Rejoindre » ou « Voir » ; « Voir » mène à
    // MON besoin dans cet achat. Seulement l'identifiant de mon propre besoin, jamais celui d'une autre entreprise.
    const miens = visibles.length
      ? await this.prisma.besoinGroupeV1.findMany({ where: { companyId: tenant.companyId, achatId: { in: visibles.map((a) => a.id) } }, select: { id: true, achatId: true }, orderBy: { createdAt: "desc" } })
      : [];
    const monBesoin = new Map<string, string>();
    for (const m of miens) if (m.achatId && !monBesoin.has(m.achatId)) monBesoin.set(m.achatId, m.id);
    return { zone, achats: await Promise.all(visibles.map(async (a) => ({ ...(await this.vuePublique(this.prisma, a)), monBesoinId: monBesoin.get(a.id) ?? null }))) };
  }

  /* ------------------------------------------------------------------------- la compatibilité */

  private produitValide(type: string, attributs: Record<string, string>): { p: ProduitV1; cle: string; nom: string } {
    const p = produitV1(type);
    if (!p) throw validationFailed("Product not open to group purchases", { reason: "non_ouvert", message: "Ce produit n'est pas encore ouvert aux achats groupés : il reste dans ton quantitatif." });
    if (!this.lotOuvert(p.lot)) throw validationFailed("Trade not open yet", { reason: "metier_bientot", message: `${this.libelleDuLot(p.lot)} : bientôt en achat groupé. Ce produit reste dans ton quantitatif.` });
    // Lot D (15 novembre 2026) : une caractéristique recommandée non dite vaut « à préciser », elle ne bloque jamais.
    const propres = completerV1(type, Object.fromEntries(p.caracteristiques.map((c) => [c.attribut, (attributs[c.attribut] ?? "").trim()]).filter(([, v]) => v)));
    const manquantes = manquantesV1(type, propres);
    if (manquantes.length) throw validationFailed("Missing characteristics", { reason: "a_preciser", manquantes: manquantes.map((m) => m.attribut), message: `${phraseAPreciser(manquantes)}. Précise-les pour rejoindre un achat groupé.` });
    return { p, cle: cleProduitV1(type, propres)!, nom: nomProduitV1(type, propres) };
  }

  private async compatibles(db: Db, cle: string, departement: string, reception: string, dateBesoin: Date) {
    const maintenant = this.now();
    const candidats = await db.achatGroupeV1.findMany({ where: { cle, departement, reception, statut: "ouvert", ouvertJusquau: { gt: maintenant } }, orderBy: { createdAt: "asc" } });
    return candidats.filter((a) => differencesV1({ ...a, statut: a.statut as EtatAchatV1 }, { cle, departement, reception, dateBesoin }, maintenant).length === 0);
  }

  /** « Un achat groupé correspond » ou « Aucun achat groupé compatible pour le moment » : rien n'est créé ici. */
  async compatibilite(tenant: TenantContext, b: { type: string; attributs: Record<string, string>; reception: "livraison" | "retrait"; dateBesoin: Date }) {
    this.exigerActif();
    const zone = await this.zone(tenant.companyId);
    if (!zone) throw validationFailed("Company address required", { reason: "zone_inconnue", message: "Indique l'adresse de ton entreprise avec son code postal (Profil) : la zone de regroupement est ton département." });
    const { cle, nom } = this.produitValide(b.type, b.attributs);
    const [compatible] = await this.compatibles(this.prisma, cle, zone.code, b.reception, b.dateBesoin);
    const ouverture = ouvertureV1(b.dateBesoin, this.now());
    return {
      produit: { cle, nom },
      zone,
      compatible: compatible ? await this.vuePublique(this.prisma, compatible) : null,
      // Lot E : une date proche s'ouvre quand même ; elle est dite urgente, sans promesse.
      urgent: besoinUrgentV1(b.dateBesoin, this.now()) ? PHRASE_BESOIN_URGENT : null,
      ouverture: ouverture.ok ? { possible: true, ouvertJusquau: ouverture.ouvertJusquau.toISOString() } : { possible: false, message: (ouverture as { message: string }).message },
      phraseIdentique: PHRASE_BESOIN_IDENTIQUE,
    };
  }

  /* -------------------------------------------------------------------- la confirmation des besoins */

  /**
   * « Confirmer mon besoin » / « Confirmer mes 2 besoins » : tout ou rien, dans une transaction. Chaque ligne rejoint
   * l'achat compatible (jamais un second achat identique) ou en ouvre un ; une ligne de quantitatif n'entre que si elle
   * est libre (une ligne, un seul circuit) ; la conversion de conditionnement est confirmée ; rien n'est dupliqué.
   */
  async confirmer(tenant: TenantContext, input: { besoins: BesoinSaisi[]; confirmation: boolean; cleIdempotence: string; anonyme?: boolean }) {
    this.exigerActif();
    assertCanWrite(tenant);
    if (!input.confirmation) throw validationFailed("Confirmation required", { reason: "case_non_cochee", message: input.besoins.length > 1 ? CASE_PLUSIEURS_LIGNES : CASE_UNE_LIGNE("…") });
    const verif = await this.verification(tenant);
    if (!verif.complete) throw new DomainError("forbidden", "Company verification required", { reason: "verification_requise", verification: verif });
    const zone = await this.zone(tenant.companyId);
    if (!zone) throw validationFailed("Company address required", { reason: "zone_inconnue" });
    // Idempotence : la même confirmation renvoyée (double appui, réseau) rend les besoins déjà créés, sans doublon.
    const deja = await this.prisma.besoinGroupeV1.findMany({ where: { companyId: tenant.companyId, cleIdempotence: { startsWith: `${input.cleIdempotence}:` } } });
    if (deja.length) return { besoins: await Promise.all(deja.map((b) => this.vueBesoin(tenant, b.id))) };
    const maintenant = this.now();
    const prepares = input.besoins.map((b) => {
      const { p, cle, nom } = this.produitValide(b.type, b.attributs);
      const code = b.unite;
      const enReference = code === p.unite.code;
      const cond = p.conditionnements.find((c) => c.unite.code === code);
      if (!enReference && !cond) throw validationFailed("Unit not allowed", { reason: "unite", message: `La quantité de « ${nom} » doit être en ${p.unite.pluriel}${p.conditionnements.length ? ` ou en ${p.conditionnements.map((c) => c.unite.pluriel).join(", ")}` : ""}.` });
      if (cond && (!b.parUnite || b.parUnite <= 0)) throw validationFailed("Packaging required", { reason: "conditionnement", message: `Indique combien de ${p.unite.pluriel} contient 1 ${cond.unite.singulier}.` });
      if (cond && !b.conversionConfirmee) throw validationFailed("Packaging must be confirmed", { reason: "conversion_non_confirmee", message: `Confirme ${b.parUnite} ${p.unite.pluriel} par ${cond.unite.singulier} (ou corrige-le) : une conversion n'est jamais supposée.` });
      if (!b.lieu.trim()) throw validationFailed("Delivery place required", { reason: "lieu_requis", message: "Indique le lieu de livraison ou de retrait." });
      return { b, p, cle, nom, parUnite: cond ? b.parUnite : null, quantiteRef: quantiteReference(b.quantite, cond ? b.parUnite : null) };
    });
    // Deux lignes identiques dans la même confirmation ne divisent pas les volumes : refus, la quantité se met sur une seule.
    const vues = new Set<string>();
    for (const x of prepares) {
      const k = `${x.b.projectId}:${x.b.articleKey}`;
      if (x.b.articleKey && vues.has(k)) throw validationFailed("Same line twice", { reason: "ligne_en_double" });
      vues.add(k);
    }
    const ids: string[] = [];
    try {
      await this.prisma.$transaction(async (tx) => {
        // Le verrou commun « une ligne, un seul circuit » de chaque chantier concerné, pris d'abord et dans un ordre fixe
        // (jamais d'interblocage) : un envoi de demande individuelle en cours sur ce chantier se termine avant.
        for (const projectId of [...new Set(prepares.map((x) => x.b.projectId).filter((p): p is string => !!p && isUuid(p)))].sort())
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleVerrouCircuit(projectId)}))`;
        for (const [i, x] of prepares.entries()) {
          const { b, p, cle, nom } = x;
          // Une ligne de quantitatif : elle doit appartenir à l'entreprise et être libre.
          let arreterSurveillance = false;
          if (b.projectId || b.articleKey) {
            if (!b.projectId || !b.articleKey || !isUuid(b.projectId)) throw validationFailed("Line reference incomplete", { reason: "ligne_invalide" });
            const projet = await tx.project.findFirst({ where: { id: b.projectId, companyId: tenant.companyId }, select: { id: true } });
            if (!projet) throw notFound("Project");
            // Le verrou de la ligne : deux confirmations simultanées ne la font jamais entrer deux fois.
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ag-ligne:${b.projectId}:${b.articleKey}`}))`;
            const f = (await faitsDesLignes(tx as unknown as PrismaService, tenant.companyId, b.projectId, maintenant))(b.articleKey);
            const v = peutCircuit({ demandeEnvoyee: f.demandeEnvoyee, commandee: f.commandeeSeule || f.groupe?.statut === "accepte", enRecherche: f.enRecherche, dansUnAchatGroupe: !!f.groupe }, "rejoindre_achat_groupe", nom, { dejaEnvoyeConfirme: b.dejaEnvoyeConfirme === true });
            if (!v.permis) {
              const r = v as { raison: string; message: string; aConfirmer?: boolean };
              throw conflit(`circuit_${r.raison}`, r.message, { articleKey: b.articleKey, ...(r.aConfirmer ? { aConfirmer: true } : {}) });
            }
            arreterSurveillance = !!v.arreterSurveillance;
          }
          // Le verrou du produit dans la zone : deux ouvertures simultanées n'ouvrent jamais deux achats identiques.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ag-achat:${cle}:${zone.code}:${b.reception}`}))`;
          const compatibles = await this.compatibles(tx, cle, zone.code, b.reception, b.dateBesoin);
          let achat: AchatRow;
          if (b.achatId) {
            const cible = compatibles.find((a) => a.id === b.achatId);
            if (!cible) throw conflit("achat_incompatible", `Cet achat groupé ne correspond plus à « ${nom} » (produit, zone, réception, date ou clôture) : vérifie ton besoin.`);
            achat = cible;
            if (achat.conditionnementUnite && x.parUnite && (achat.conditionnementUnite !== b.unite || Number(achat.conditionnementParUnite) !== x.parUnite))
              throw conflit("conditionnement_different", `Cet achat groupé compte ${Number(achat.conditionnementParUnite)} ${p.unite.pluriel} par ${achat.conditionnementUnite} : confirme ce conditionnement, ou choisis « Une caractéristique du produit est différente ».`);
          } else {
            if (compatibles[0]) throw conflit("besoin_identique", PHRASE_BESOIN_IDENTIQUE, { achatId: compatibles[0].id });
            const o = ouvertureV1(b.dateBesoin, maintenant);
            if (!o.ok) throw validationFailed("Need date too close", { reason: "date_trop_proche", message: (o as { message: string }).message });
            achat = await tx.achatGroupeV1.create({
              data: { type: p.type, cle, nom, lot: p.lot, departement: zone.code, reception: b.reception, dateBesoin: b.dateBesoin, ouvertJusquau: o.ouvertJusquau, conditionnementUnite: x.parUnite ? b.unite : null, conditionnementParUnite: x.parUnite ?? null },
            });
          }
          const besoin = await tx.besoinGroupeV1.create({
            data: {
              achatId: achat.id,
              companyId: tenant.companyId,
              userId: tenant.userId,
              projectId: b.projectId,
              articleKey: b.articleKey,
              designation: nom,
              attributs: b.attributs,
              quantite: x.quantiteRef,
              quantiteSaisie: b.quantite,
              uniteSaisie: b.unite,
              parUnite: x.parUnite,
              conversionConfirmeeLe: x.parUnite ? maintenant : null,
              reception: b.reception,
              lieu: b.lieu.trim(),
              contraintes: b.contraintes?.trim() || null,
              anonyme: input.anonyme === true,
              dateBesoin: b.dateBesoin,
              statut: "confirme",
              confirmeLe: maintenant,
              cleIdempotence: `${input.cleIdempotence}:${i}`,
            },
          });
          await tx.historiqueBesoinGroupeV1.create({ data: { besoinId: besoin.id, companyId: tenant.companyId, type: b.achatId ? "rejoint" : "ouvert", detail: { achat: achat.numero, quantite: x.quantiteRef } } });
          if (arreterSurveillance) {
            await tx.ligneRapprochement.updateMany({ where: { companyId: tenant.companyId, projectId: b.projectId!, articleKey: b.articleKey!, statut: { in: ["disponible", "proposee"] } }, data: { statut: "retiree", retraitMotif: "achat_groupe", retireLe: maintenant } });
            await tx.historiqueBesoinGroupeV1.create({ data: { besoinId: besoin.id, companyId: tenant.companyId, type: "surveillance_arretee" } });
          }
          ids.push(besoin.id);
        }
      });
    } catch (e) {
      // L'index unique partiel (une ligne, un besoin actif) ou la clé d'idempotence : la course perdue se dit, sans doublon.
      if (violationUnique(e)) {
        const deja2 = await this.prisma.besoinGroupeV1.findMany({ where: { companyId: tenant.companyId, cleIdempotence: { startsWith: `${input.cleIdempotence}:` } } });
        if (deja2.length) return { besoins: await Promise.all(deja2.map((b) => this.vueBesoin(tenant, b.id))) };
        throw conflit("circuit_achat_groupe", "Cette ligne est déjà dans un achat groupé : une ligne ne rejoint qu'un seul achat groupé.");
      }
      throw e;
    }
    // Le récapitulatif par e-mail (complémentaire : un échec ne change rien au besoin, ni à « À faire »).
    await this.envoyer(tenant.companyId, `Ton besoin est confirmé dans un achat groupé`, [`${ids.length > 1 ? `${ids.length} besoins confirmés` : "Besoin confirmé"}.`, "Ce n'est pas encore une commande : tu décideras après réception d'une offre complète.", "", `Suivi : ${this.options.webAppUrl}/achats-groupes/mes-besoins`]).catch(() => undefined);
    await this.prevenirLesParticipants(tenant.companyId, ids).catch(() => undefined);
    return { besoins: await Promise.all(ids.map((id) => this.vueBesoin(tenant, id))) };
  }

  /* ---------------------------------------------------------------------------------- mes besoins */

  private async besoinDe(db: Db, tenant: TenantContext, id: string): Promise<BesoinRow & { achat: AchatRow }> {
    if (!isUuid(id)) throw notFound("Besoin");
    // Isolation stricte : un besoin d'une autre entreprise n'existe pas pour celle-ci (404, jamais 403).
    const b = await db.besoinGroupeV1.findFirst({ where: { id, companyId: tenant.companyId }, include: { achat: true } });
    if (!b) throw notFound("Besoin");
    return b;
  }

  async vueBesoin(tenant: TenantContext, id: string) {
    const b = await this.besoinDe(this.prisma, tenant, id);
    const a = b.achat;
    const p = produitV1(a.type)!;
    const maintenant = this.now();
    const etatA = a.statut as EtatAchatV1;
    const etatB = b.statut as EtatBesoinV1;
    const code = statutAfficheV1({ statut: etatA }, { statut: etatB });
    const peut = (action: Parameters<typeof peutBesoinV1>[2]) => peutBesoinV1({ statut: etatA, reconfirmerAvant: a.reconfirmerAvant }, { statut: etatB }, action, maintenant).permis;
    const quantite = n(b.quantite)!;
    const historique = await this.prisma.historiqueBesoinGroupeV1.findMany({ where: { besoinId: b.id, companyId: tenant.companyId }, orderBy: { le: "asc" } });
    const offreRow = ["offre_verification", "offre_a_examiner", "renegociation"].includes(a.statut) ? await this.prisma.offreAchatGroupeV1.findUnique({ where: { achatId: a.id } }) : null;
    const offreComplete = offreRow ? this.vueOffre(offreRow, quantite, etatA) : null;
    // Une offre déjà commandée reste visible en entier ; sinon, sans droit, le nom du négoce est masqué et rien ne se commande.
    const droit = offreComplete && b.offreDecision !== "commandee" ? await this.droitCommande(tenant.companyId) : null;
    const offre = offreComplete ? (droit && !droit.ok ? { ...offreComplete, fournisseur: null, lieu: null, acceptable: false, paywall: droit.phrase, premiereOfferte: false } : { ...offreComplete, paywall: null, premiereOfferte: !!droit?.offerte }) : null;
    const transmis = ["consultation", "offre_verification", "offre_a_examiner", "renegociation"].includes(a.statut) && etatB === "reconfirme";
    return {
      id: b.id,
      nom: b.designation,
      lot: a.lot,
      statut: { code, libelle: LIBELLES_STATUT_V1[code] },
      etat: etatB,
      quantite: { valeur: quantite, saisie: n(b.quantiteSaisie), unite: b.uniteSaisie, parUnite: n(b.parUnite), lisible: quantiteAvecConversion(p, n(b.quantiteSaisie)!, b.parUnite ? { unite: b.uniteSaisie, parUnite: n(b.parUnite)! } : null), reference: p.unite },
      reception: b.reception,
      lieu: b.lieu,
      contraintes: b.contraintes,
      anonyme: b.anonyme,
      dateBesoin: jourIso(b.dateBesoin),
      projectId: b.projectId,
      articleKey: b.articleKey,
      achat: await this.vuePublique(this.prisma, a),
      depuisPublication: await this.depuisMaPublication(b, p),
      reconfirmerAvant: a.reconfirmerAvant?.toISOString() ?? null,
      offreAvant: a.offreAvant?.toISOString() ?? null,
      actions: {
        modifier: peut("modifier_quantite"),
        retirer: peut("retirer"),
        reconfirmer: etatB !== "reconfirme" && peut("reconfirmer"),
        confirmer: peut("confirmer"),
        // Greg, 14 novembre 2026 : « Commander à ce prix » et « Non merci », tant que l'artisan n'a pas décidé.
        commander: !b.offreDecision && etatB === "reconfirme" && !!offre?.acceptable && !(a.offreAvant && a.offreAvant <= maintenant),
        refuser: !b.offreDecision && etatB === "reconfirme" && etatA === "offre_a_examiner" && !!offre?.complete && !(a.offreAvant && a.offreAvant <= maintenant),
      },
      decision: b.offreDecision ? { choix: b.offreDecision as "commandee" | "refusee", le: b.offreDecideeLe?.toISOString() ?? null } : null,
      avertissements: transmis ? { modification: PHRASE_MODIFICATION_TRANSMISE, retrait: PHRASE_RETRAIT_TRANSMIS } : null,
      offre,
      retrait: b.retireLe ? { le: b.retireLe.toISOString(), motif: MOTIFS_V1.find((m) => m.id === b.motifRetrait)?.libelle ?? b.motifRetrait, precision: b.precisionRetrait } : null,
      historique: historique.map((h) => ({ type: h.type, le: h.le.toISOString(), transmis: h.transmis, detail: h.detail })),
    };
  }

  /**
   * VOIR LE NÉGOCE RETENU ET COMMANDER (Greg, 15 novembre 2026) : inclus dans Pro et Pro Max ; pour un compte gratuit, la
   * PREMIÈRE commande groupée est offerte. Ensuite, le prix reste visible, mais le nom du négoce est masqué et « Commander
   * à ce prix » demande Pro. Publier et rejoindre un achat groupé restent gratuits. Avant : tout était gratuit.
   */
  private async droitCommande(companyId: string) {
    const abonne = this.ports.abonne ? await this.ports.abonne(companyId) : true;
    const commandesPassees = abonne ? 0 : await this.prisma.besoinGroupeV1.count({ where: { companyId, offreDecision: "commandee" } });
    return droitCommandeGroupee({ abonne, commandesPassees });
  }

  private vueOffre(o: NonNullable<Awaited<ReturnType<PrismaService["offreAchatGroupeV1"]["findUnique"]>>>, quantite: number, etat: EtatAchatV1) {
    const offre: OffreV1 = { fournisseur: o.fournisseur, prixUnitaireHt: n(o.prixUnitaireHt), livraisonHt: n(o.livraisonHt), tvaPct: Number(o.tvaPct), delai: o.delai, lieu: o.lieu, paiement: o.paiement, validite: o.validite, annulation: o.annulation };
    const manquesDuPrix = manquesOffreV1(offre);
    // Greg, 14 novembre 2026 : l'adresse e-mail du fournisseur est OBLIGATOIRE au dépôt de l'offre, pour que « Commander à
    // ce prix » marche toujours. Sans elle, l'offre reste « en vérification ». (Avant : facultative.)
    const manques = o.fournisseurEmail ? manquesDuPrix : [...manquesDuPrix, MANQUE_EMAIL_FOURNISSEUR];
    return {
      ...offre,
      complete: manques.length === 0,
      manques,
      calcul: manquesDuPrix.length === 0 ? calculOffreV1(quantite, offre) : null,
      // Greg, 14 novembre 2026 : l'artisan décide à la réception de l'offre. « Commander à ce prix » s'ouvre sur une offre
      // complète, à examiner, dont on sait où envoyer le bon de commande. (Avant : jamais ouvert en V1.)
      acceptable: manques.length === 0 && etat === "offre_a_examiner" && !!o.fournisseurEmail,
      etat,
    };
  }

  /* --------------------------------------------------------------------- la décision sur l'offre */

  /** Le besoin dont l'offre attend la décision de l'artisan, avec son offre ; sinon un refus clair. */
  private async offreADecider(tenant: TenantContext, id: string) {
    const b = await this.besoinDe(this.prisma, tenant, id);
    if (b.offreDecision) throw conflit("offre_deja_decidee", b.offreDecision === "commandee" ? "Tu as déjà commandé sur cette offre." : "Tu as déjà refusé cette offre.");
    if (b.achat.statut !== "offre_a_examiner" || b.statut !== "reconfirme") throw conflit("sans_offre", "Il n'y a pas d'offre à examiner sur ce besoin.");
    const maintenant = this.now();
    if (b.achat.offreAvant && b.achat.offreAvant <= maintenant) throw conflit("offre_expiree", "Le délai pour répondre à cette offre est passé.");
    const o = await this.prisma.offreAchatGroupeV1.findUnique({ where: { achatId: b.achatId } });
    if (!o) throw conflit("sans_offre", "Il n'y a pas d'offre à examiner sur ce besoin.");
    return { b, o, maintenant };
  }

  /**
   * « Commander à ce prix » (Greg, 14 novembre 2026) : le bon de commande part au fournisseur, et la commande n'est notée
   * qu'une fois le mail parti (jamais « commandé » sans envoi réel). Mobiiz ne vend ni n'achète rien : la vente se fait
   * entre l'entreprise et le fournisseur.
   */
  async commanderOffre(tenant: TenantContext, id: string) {
    this.exigerActif();
    assertCanWrite(tenant);
    const { b, o, maintenant } = await this.offreADecider(tenant, id);
    const droit = await this.droitCommande(tenant.companyId);
    if (!droit.ok) throw new DomainError("abonnement_requis", "Group order needs a paid plan", { action: "commande_groupee", refus: "commande_groupee", phrase: droit.phrase });
    const vue = this.vueOffre(o, n(b.quantite)!, b.achat.statut as EtatAchatV1);
    if (!vue.complete || !vue.calcul) throw conflit("offre_incomplete", "L'offre n'est pas complète : elle ne peut pas être acceptée en l'état.");
    if (!o.fournisseurEmail) throw conflit("fournisseur_sans_email", "Mobiiz complète l'offre : l'adresse du fournisseur manque encore. Tu pourras commander dès qu'elle est là.");
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { name: true, address: true, phone: true, contactEmail: true, memberships: { take: 1, orderBy: { createdAt: "asc" }, select: { user: { select: { email: true } } } } } });
    const emailArtisan = company.contactEmail ?? company.memberships[0]?.user.email ?? null;
    const p = produitV1(b.achat.type)!;
    const quantite = n(b.quantite)!;
    const unite = Math.abs(quantite) >= 2 ? p.unite.pluriel : p.unite.singulier;
    // Dans un e-mail en texte, les espaces fines des nombres deviennent des espaces simples (lisibles partout).
    const nombre = quantite.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ");
    const numero = `AG${b.achat.numero}-${b.id.slice(-6).toUpperCase()}`;
    const prix = n(o.prixUnitaireHt)!;
    const prixUnitaire = `${prix.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).replace(/\u202f|\u00a0/g, " ")} €`;
    const pdf = await bonDeCommandePdf({
      numero,
      date: maintenant.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }),
      acheteur: { nom: company.name, adresse: company.address, telephone: company.phone, email: emailArtisan },
      vendeur: { nom: o.fournisseur ?? "", email: o.fournisseurEmail },
      livraison: b.lieu ?? o.lieu ?? null,
      lignes: [{ designation: b.designation, quantite: nombre, unite, prixHt: prixUnitaire, totalHt: euros(vue.calcul.produits) }],
      livraisonHt: (n(o.livraisonHt) ?? 0) > 0 ? euros(n(o.livraisonHt)!) : "offerte",
      totalHt: euros(vue.calcul.ht),
      mentions: [`Achat groupé Mobiiz n° ${b.achat.numero}. Délai : ${o.delai}. Paiement : ${o.paiement}.`, "Vente conclue directement entre l'acheteur et le vendeur. Mobiiz met en relation, ne vend ni n'achète rien et n'encaisse aucun paiement."],
    });
    const piece = { filename: `bon-de-commande-${numero}.pdf`, contentType: "application/pdf", contentBase64: Buffer.from(pdf).toString("base64") };
    await this.email.send({
      to: o.fournisseurEmail,
      subject: `Bon de commande de ${company.name} (achat groupé Mobiiz n° ${b.achat.numero}, ${euros(vue.calcul.ht)} HT)`,
      text: [
        "Bonjour,",
        "",
        `${company.name} commande sur votre offre de l'achat groupé Mobiiz n° ${b.achat.numero} :`,
        "",
        `- ${b.designation} : ${nombre} ${unite} × ${prixUnitaire} HT`,
        `- Livraison : ${(n(o.livraisonHt) ?? 0) > 0 ? `${euros(n(o.livraisonHt)!)} HT` : "offerte"}`,
        "",
        `Total : ${euros(vue.calcul.ht)} HT.`,
        b.lieu ? `Livraison ou retrait : ${b.lieu}.` : "",
        company.phone ? `Contact : ${company.phone}${emailArtisan ? `, ${emailArtisan}` : ""}.` : emailArtisan ? `Contact : ${emailArtisan}.` : "",
        "",
        "Le bon de commande est joint. La facturation et le paiement se font directement entre vous.",
        "",
        "Mobiiz",
      ]
        .filter((l, i, t) => !(l === "" && (i === 0 || t[i - 1] === "")))
        .join("\n"),
      attachments: [piece],
      ...(emailArtisan ? { replyTo: emailArtisan } : {}),
      mustDeliver: true,
    });
    // Le mail est parti : la commande est notée (une seule fois, même sur deux appuis).
    const fait = await this.prisma.besoinGroupeV1.updateMany({ where: { id: b.id, companyId: tenant.companyId, offreDecision: null }, data: { offreDecision: "commandee", offreDecideeLe: maintenant } });
    if (fait.count > 0) await this.prisma.historiqueBesoinGroupeV1.create({ data: { besoinId: b.id, companyId: tenant.companyId, type: "offre_commandee", detail: { fournisseur: o.fournisseur, totalHt: vue.calcul.ht } } });
    // La copie pour l'artisan : complémentaire, jamais bloquante.
    await this.alerter(tenant.companyId, { titre: "Commande envoyée au négoce", detail: `${b.designation} · ${o.fournisseur}`, action: "Voir ma commande", href: `/achats-groupes/besoins/${b.id}`, cle: `ag-commande:${b.id}` });
    await this.envoyer(tenant.companyId, `Ta commande groupée : ${b.designation}`, [`C'est commandé chez ${o.fournisseur} : ${nombre} ${unite}, ${euros(vue.calcul.ht)} HT.`, `Le bon de commande est parti à ${o.fournisseurEmail}.`, "La facturation et le paiement se font directement entre vous."]);
    return this.vueBesoin(tenant, id);
  }

  /** « Non merci » : l'artisan refuse l'offre ; rien ne part chez le fournisseur, et ne pas commander n'a aucune conséquence. */
  async refuserOffre(tenant: TenantContext, id: string) {
    this.exigerActif();
    assertCanWrite(tenant);
    const { b, maintenant } = await this.offreADecider(tenant, id);
    const fait = await this.prisma.besoinGroupeV1.updateMany({ where: { id: b.id, companyId: tenant.companyId, offreDecision: null }, data: { offreDecision: "refusee", offreDecideeLe: maintenant } });
    if (fait.count > 0) await this.prisma.historiqueBesoinGroupeV1.create({ data: { besoinId: b.id, companyId: tenant.companyId, type: "offre_refusee" } });
    return this.vueBesoin(tenant, id);
  }

  async mesBesoins(tenant: TenantContext) {
    this.exigerActif();
    const rows = await this.prisma.besoinGroupeV1.findMany({ where: { companyId: tenant.companyId }, orderBy: { createdAt: "desc" }, select: { id: true }, take: 200 });
    const besoins = await Promise.all(rows.map((r) => this.vueBesoin(tenant, r.id)));
    const aFaire = besoins.filter((b) => b.actions.reconfirmer || b.statut.code === "offre_a_examiner" || b.actions.confirmer);
    const enCours = besoins.filter((b) => !aFaire.includes(b) && b.etat !== "retire" && b.statut.code !== "achat_annule");
    const termines = besoins.filter((b) => !aFaire.includes(b) && !enCours.includes(b));
    return { aFaire, enCours, termines };
  }

  /** « À faire » : la source de référence des actions (l'e-mail ne fait que rappeler). */
  async actions(tenant: TenantContext) {
    if (!this.options.actif) return [];
    const rows = await this.prisma.besoinGroupeV1.findMany({ where: { companyId: tenant.companyId, statut: { in: [...BESOIN_ACTIF_V1] } }, include: { achat: true } });
    return actionsAFaireV1(
      rows.map((b) => ({ id: b.id, nom: b.designation, quantite: quantiteAvecConversion(produitV1(b.achat.type)!, Number(b.quantiteSaisie), b.parUnite ? { unite: b.uniteSaisie, parUnite: Number(b.parUnite) } : null), statut: b.statut as EtatBesoinV1, achat: { statut: b.achat.statut as EtatAchatV1, reconfirmerAvant: b.achat.reconfirmerAvant, offreAvant: b.achat.offreAvant } })),
      this.now(),
    ).map((a) => ({ cle: a.cle, genre: "achat_groupe" as const, texte: a.avant ? `${a.texte} — avant le ${heureLisible(a.avant)}` : a.texte, href: a.href }));
  }

  /* ------------------------------------------------------------------------- modifier, retirer */

  private async geste(tenant: TenantContext, id: string, action: Parameters<typeof peutBesoinV1>[2], faire: (tx: Tx, b: BesoinRow & { achat: AchatRow }, transmis: boolean) => Promise<void>) {
    this.exigerActif();
    assertCanWrite(tenant);
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ag-besoin:${id}`}))`;
      const b = await this.besoinDe(tx, tenant, id);
      const v = peutBesoinV1({ statut: b.achat.statut as EtatAchatV1, reconfirmerAvant: b.achat.reconfirmerAvant }, { statut: b.statut as EtatBesoinV1 }, action, this.now());
      if (!v.permis) {
        const r = v as { raison: string; message: string };
        throw conflit(r.raison, r.message);
      }
      if (v.vers && v.vers !== b.statut && !transitionV1("besoin", b.statut, v.vers)) throw conflit("transition_refusee", "Ce changement n'est pas possible dans cet état.");
      await faire(tx, b, v.transmis);
    });
    return this.vueBesoin(tenant, id);
  }

  /** « Mettre à jour ma quantité » : ne retire jamais le besoin ; après la consultation, transmis aux négoces concernés. */
  modifierQuantite(tenant: TenantContext, id: string, q: { quantite: number; parUnite: number | null; conversionConfirmee: boolean }) {
    return this.geste(tenant, id, "modifier_quantite", async (tx, b, transmis) => {
      const conditionne = !!b.parUnite;
      const parUnite = conditionne ? (q.parUnite ?? Number(b.parUnite)) : null;
      if (conditionne && parUnite !== Number(b.parUnite) && !q.conversionConfirmee) throw validationFailed("Packaging must be confirmed", { reason: "conversion_non_confirmee", message: "Confirme le nouveau conditionnement : une conversion n'est jamais supposée." });
      const quantite = quantiteReference(q.quantite, parUnite);
      const avant = { quantite: Number(b.quantite), saisie: Number(b.quantiteSaisie) };
      await tx.besoinGroupeV1.update({ where: { id: b.id }, data: { quantite, quantiteSaisie: q.quantite, parUnite, ...(conditionne && parUnite !== Number(b.parUnite) ? { conversionConfirmeeLe: this.now() } : {}) } });
      if (transmis && b.achat.volumeTransmis !== null) await tx.achatGroupeV1.update({ where: { id: b.achatId }, data: { volumeTransmis: { increment: quantite - avant.quantite } } });
      await tx.historiqueBesoinGroupeV1.create({ data: { besoinId: b.id, companyId: b.companyId, type: "quantite_modifiee", transmis, detail: { avant: avant.saisie, apres: q.quantite, motif: "quantite" } } });
    });
  }

  /** « Rester anonyme » (Greg, 16 novembre 2026) : se coche et se décoche à tout moment ; vaut pour tous les besoins de l'entreprise dans cet achat. */
  async choisirAnonymat(tenant: TenantContext, id: string, anonyme: boolean) {
    this.exigerActif();
    assertCanWrite(tenant);
    if (!isUuid(id)) throw notFound("Besoin");
    const b = await this.prisma.besoinGroupeV1.findFirst({ where: { id, companyId: tenant.companyId }, select: { id: true, achatId: true, anonyme: true } });
    if (!b) throw notFound("Besoin");
    if (b.anonyme !== anonyme) {
      await this.prisma.$transaction(async (tx) => {
        await tx.besoinGroupeV1.updateMany({ where: { achatId: b.achatId, companyId: tenant.companyId }, data: { anonyme } });
        await tx.historiqueBesoinGroupeV1.create({ data: { besoinId: b.id, companyId: tenant.companyId, type: anonyme ? "anonymat_choisi" : "anonymat_leve", transmis: false, detail: {} } });
      });
    }
    return this.vueBesoin(tenant, id);
  }

  /** « Mettre à jour la date » (chantier reporté) : le besoin reste dans son achat tant que la date reste dans sa période. */
  modifierDate(tenant: TenantContext, id: string, dateBesoin: Date) {
    return this.geste(tenant, id, "modifier_date", async (tx, b, transmis) => {
      const d = differencesV1({ ...b.achat, statut: "ouvert", ouvertJusquau: new Date(8.64e15) }, { cle: b.achat.cle, departement: b.achat.departement, reception: b.achat.reception, dateBesoin }, this.now());
      if (d.includes("date"))
        throw conflit("date_hors_achat", `Cette date sort de la période de cet achat groupé (besoin autour du ${dateLisible(b.achat.dateBesoin)}). Garde ton besoin à cette période, ou retire-le pour en ouvrir un autre à la nouvelle date.`);
      await tx.besoinGroupeV1.update({ where: { id: b.id }, data: { dateBesoin } });
      await tx.historiqueBesoinGroupeV1.create({ data: { besoinId: b.id, companyId: b.companyId, type: "date_modifiee", transmis, detail: { avant: jourIso(b.dateBesoin), apres: jourIso(dateBesoin), motif: "report" } } });
    });
  }

  /** « Confirmer le retrait » : le besoin sort des totaux ; après la consultation, retrait tardif (volumes transmis modifiés). */
  retirer(tenant: TenantContext, id: string, motif: MotifV1, precision: string | null) {
    if (!MOTIFS_V1.some((m) => m.id === motif && m.geste === "retirer")) throw validationFailed("Unknown withdrawal reason", { reason: "motif_inconnu" });
    return this.geste(tenant, id, "retirer", async (tx, b, transmis) => {
      await tx.besoinGroupeV1.update({ where: { id: b.id }, data: { statut: "retire", retireLe: this.now(), motifRetrait: motif, precisionRetrait: precision?.trim() || null, retraitTardif: transmis } });
      if (transmis && b.achat.volumeTransmis !== null) await tx.achatGroupeV1.update({ where: { id: b.achatId }, data: { volumeTransmis: { decrement: Number(b.quantite) } } });
      await tx.historiqueBesoinGroupeV1.create({ data: { besoinId: b.id, companyId: b.companyId, type: "retire", transmis, detail: { motif, precision: precision?.trim() || null, quantite: Number(b.quantite) } } });
    });
  }

  /** « Reconfirmer ma quantité » pendant la préparation de la consultation. */
  reconfirmer(tenant: TenantContext, id: string) {
    return this.geste(tenant, id, "reconfirmer", async (tx, b) => {
      if (b.statut === "reconfirme") return;
      await tx.besoinGroupeV1.update({ where: { id: b.id }, data: { statut: "reconfirme", reconfirmeLe: this.now() } });
      await tx.historiqueBesoinGroupeV1.create({ data: { besoinId: b.id, companyId: b.companyId, type: "reconfirme", detail: { quantite: Number(b.quantite) } } });
    });
  }

  /** « Confirmer » un besoin indicatif (pendant l'ouverture ; pendant la préparation, cela vaut reconfirmation). */
  confirmerIndicatif(tenant: TenantContext, id: string) {
    return this.geste(tenant, id, "confirmer", async (tx, b) => {
      const vers = b.achat.statut === "preparation" ? "reconfirme" : "confirme";
      await tx.besoinGroupeV1.update({ where: { id: b.id }, data: { statut: vers, ...(vers === "reconfirme" ? { reconfirmeLe: this.now() } : { confirmeLe: this.now() }) } });
      await tx.historiqueBesoinGroupeV1.create({ data: { besoinId: b.id, companyId: b.companyId, type: vers } });
    });
  }

  /* --------------------------------------------------------------------- depuis un quantitatif */

  /** Les lignes d'un quantitatif classées par lot, avec leur mention et sa raison ; rien n'est coché d'office. */
  async lignesDuQuantitatif(tenant: TenantContext, projectId: string) {
    this.exigerActif();
    if (!isUuid(projectId)) throw notFound("Project");
    const { nom, lignes } = await this.ports.lignesDeListe(tenant, projectId);
    const faits = await faitsDesLignes(this.prisma, tenant.companyId, projectId, this.now());
    const lots = await this.prisma.lotLigneV1.findMany({ where: { projectId, companyId: tenant.companyId } });
    const lotDe = new Map(lots.map((l) => [l.articleKey, l.lot as LotV1]));
    return {
      projectId,
      nom,
      lignes: lignes.map((l) => {
        const f = faits(l.key);
        const c = classerLigneV1({ designation: l.designation, quantite: l.quantite ?? 0, unite: l.unite, lotChoisi: lotDe.get(l.key) ?? null, faits: { demandeEnvoyee: f.demandeEnvoyee, commandee: f.commandeeSeule || f.groupe?.statut === "accepte", enRecherche: f.enRecherche, dansUnAchatGroupe: !!f.groupe } });
        // Une ligne encore à régler dans la liste (question, quantité à vérifier) : à préciser d'abord, jamais cachée.
        const aRegler = l.aRegler && c.selectionnable ? { mention: "a_preciser" as const, texte: "À préciser : ligne à régler dans ta liste", pourquoi: "Réponds d'abord à la question de cette ligne dans ta liste.", selectionnable: false } : {};
        // Lot C : le produit d'un métier « Bientôt » reste dans le quantitatif, avec sa raison.
        const bientot = c.produit && !this.lotOuvert(produitV1(c.produit.type)?.lot ?? "divers") ? { mention: "non_ouvert" as const, texte: "Bientôt en achat groupé", pourquoi: `${this.libelleDuLot(produitV1(c.produit.type)?.lot ?? "divers")} n'est pas encore ouvert aux achats groupés : la ligne reste dans ton quantitatif.`, selectionnable: false } : {};
        return { key: l.key, designation: l.designation, quantiteListe: l.quantite, unite: l.unite, ...c, ...aRegler, ...bientot };
      }),
    };
  }

  /** « Lot : Couverture ▾ » : la correction d'UNE ligne, sans déplacer les autres. */
  async corrigerLot(tenant: TenantContext, projectId: string, key: string, lot: string) {
    this.exigerActif();
    assertCanWrite(tenant);
    if (!estLotV1(lot)) throw validationFailed("Unknown lot", { reason: "lot_inconnu" });
    if (!isUuid(projectId) || !(await this.prisma.project.findFirst({ where: { id: projectId, companyId: tenant.companyId }, select: { id: true } }))) throw notFound("Project");
    await this.prisma.lotLigneV1.upsert({ where: { projectId_articleKey: { projectId, articleKey: key } }, create: { projectId, articleKey: key, companyId: tenant.companyId, lot }, update: { lot } });
    return { key, lot };
  }

  /* ---------------------------------------------------------------------------------- l'admin */

  async adminListe() {
    this.exigerActif();
    const achats = await this.prisma.achatGroupeV1.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { besoins: { select: { companyId: true, statut: true, quantite: true, retraitTardif: true } }, offre: true } });
    const tardifs = await this.prisma.besoinGroupeV1.groupBy({ by: ["companyId"], where: { retraitTardif: true }, _count: { _all: true } });
    return {
      achats: achats.map((a) => ({
        id: a.id,
        numero: a.numero,
        nom: a.nom,
        zone: a.departement,
        reception: a.reception,
        statut: a.statut,
        dateBesoin: jourIso(a.dateBesoin),
        ouvertJusquau: a.ouvertJusquau.toISOString(),
        reconfirmerAvant: a.reconfirmerAvant?.toISOString() ?? null,
        volumes: volumesV1(a.besoins.map((b) => ({ companyId: b.companyId, statut: b.statut as EtatBesoinV1, quantite: Number(b.quantite) })), { statut: a.statut as EtatAchatV1 }),
        volumeTransmis: n(a.volumeTransmis),
        offre: a.offre ? { complete: manquesOffreV1({ fournisseur: a.offre.fournisseur, prixUnitaireHt: n(a.offre.prixUnitaireHt), livraisonHt: n(a.offre.livraisonHt), tvaPct: Number(a.offre.tvaPct), delai: a.offre.delai, lieu: a.offre.lieu, paiement: a.offre.paiement, validite: a.offre.validite, annulation: a.offre.annulation }).length === 0 && !!a.offre.fournisseurEmail } : null,
      })),
      // Bêta : 3 retraits tardifs → rappel ; au-delà → vérification manuelle ; jamais de suspension.
      retraitsTardifs: tardifs.map((t) => ({ companyId: t.companyId, nombre: t._count._all, suivi: suiviRetraitsTardifs(t._count._all) })).filter((t) => t.suivi !== "aucun"),
    };
  }

  private async transition(db: Db, id: string, vers: EtatAchatV1): Promise<AchatRow> {
    if (!isUuid(id)) throw notFound("AchatGroupeV1");
    const a = await db.achatGroupeV1.findUnique({ where: { id } });
    if (!a) throw notFound("AchatGroupeV1");
    if (!transitionV1("achat", a.statut, vers)) throw conflit("transition_refusee", `Impossible de passer de « ${a.statut} » à « ${vers} ».`);
    return a;
  }

  /** « Préparation de la consultation » : 72 h par défaut (24 h à 5 jours), rappel 24 h avant ; l'action entre dans « À faire ». */
  async preparer(id: string, heures?: number) {
    this.exigerActif();
    const a = await this.transition(this.prisma, id, "preparation");
    const p = preparationV1(this.now(), heures);
    if (!p.ok) throw validationFailed("Invalid preparation duration", { reason: "duree", message: (p as { message: string }).message });
    await this.prisma.achatGroupeV1.update({ where: { id: a.id }, data: { statut: "preparation", reconfirmerAvant: p.reconfirmerAvant, rappelLe: p.rappelLe } });
    // Prévenir chaque entreprise (e-mail complémentaire ; l'action est déjà dans « À faire »).
    const besoins = await this.prisma.besoinGroupeV1.findMany({ where: { achatId: a.id, statut: { in: ["confirme", "indicatif"] } }, select: { companyId: true } });
    for (const companyId of new Set(besoins.map((b) => b.companyId))) {
      await this.alerter(companyId, { genre: "action", titre: "Reconfirme ta quantité", detail: `${a.nom} · avant le ${heureLisible(p.reconfirmerAvant)}`, action: "Reconfirmer", href: "/achats-groupes/mes-besoins", cle: `ag-preparer:${a.id}` });
      await this.envoyer(companyId, `Reconfirme ta quantité : ${a.nom}`, [`Mobiiz est prêt à consulter les négoces pour « ${a.nom} ».`, `Reconfirme ta quantité avant le ${heureLisible(p.reconfirmerAvant)}. Sans reconfirmation, ton besoin reste indicatif et n'est pas transmis.`, "", `${this.options.webAppUrl}/achats-groupes/mes-besoins`]).catch(() => undefined);
    }
    return { id: a.id, statut: "preparation", reconfirmerAvant: p.reconfirmerAvant.toISOString() };
  }

  /**
   * La clôture des reconfirmations, seulement après l'heure : les confirmés non reconfirmés deviennent indicatifs ; le
   * volume RECONFIRMÉ seul est figé comme transmis. V1 locale : aucun envoi réel aux négoces.
   */
  async cloturer(id: string, options: { avantLHeure?: boolean } = {}) {
    this.exigerActif();
    const maintenant = this.now();
    const prevenir: { companyId: string; besoinId: string; transmis: boolean; nom: string }[] = [];
    const r = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ag-achat-id:${id}`}))`;
      const a = await this.transition(tx, id, "consultation");
      const avant = options.avantLHeure === true && this.options.env !== "production";
      if (!avant && a.reconfirmerAvant && a.reconfirmerAvant > maintenant) throw conflit("trop_tot", `La consultation ne part qu'après la clôture des reconfirmations (${heureLisible(a.reconfirmerAvant)}).`);
      const besoins = await tx.besoinGroupeV1.findMany({ where: { achatId: a.id } });
      for (const b of besoins) {
        const vers = apresCloture(b.statut as EtatBesoinV1);
        if (vers !== b.statut) {
          await tx.besoinGroupeV1.update({ where: { id: b.id }, data: { statut: vers } });
          await tx.historiqueBesoinGroupeV1.create({ data: { besoinId: b.id, companyId: b.companyId, type: "indicatif", detail: { raison: "non_reconfirme" } } });
        }
      }
      const transmis = besoins.filter((b) => b.statut === "reconfirme").reduce((t, b) => t + Number(b.quantite), 0);
      await tx.achatGroupeV1.update({ where: { id: a.id }, data: { statut: "consultation", consultationLe: maintenant, volumeTransmis: transmis } });
      for (const b of besoins.filter((x) => x.statut === "reconfirme")) await tx.historiqueBesoinGroupeV1.create({ data: { besoinId: b.id, companyId: b.companyId, type: "transmis", transmis: true, detail: { quantite: Number(b.quantite) } } });
      for (const b of besoins) if (b.statut === "reconfirme" || apresCloture(b.statut as EtatBesoinV1) === "indicatif") prevenir.push({ companyId: b.companyId, besoinId: b.id, transmis: b.statut === "reconfirme", nom: a.nom });
      return { id: a.id, statut: "consultation", volumeTransmis: transmis };
    });
    // Après la transaction : la clôture est faite, chaque participant le lit dans sa cloche.
    for (const x of prevenir)
      await this.alerter(x.companyId, x.transmis ? { titre: "Regroupement clos : Mobiiz consulte les négoces", detail: x.nom, action: "Voir mon besoin", href: `/achats-groupes/besoins/${x.besoinId}`, cle: `ag-clos:${x.besoinId}` } : { titre: "Regroupement clos sans ta reconfirmation", detail: `${x.nom} · ton besoin reste indicatif`, action: "Voir mon besoin", href: `/achats-groupes/besoins/${x.besoinId}`, cle: `ag-clos:${x.besoinId}` });
    return r;
  }

  /** L'offre saisie par Mobiiz : complète → « Offre à examiner » (72 h) ; incomplète → « Offre reçue — vérification en cours ». */
  async saisirOffre(id: string, o: Omit<OffreV1, "tvaPct"> & { tvaPct?: number; fournisseurEmail?: string | null }) {
    this.exigerActif();
    if (!isUuid(id)) throw notFound("AchatGroupeV1");
    const a = await this.prisma.achatGroupeV1.findUnique({ where: { id } });
    if (!a) throw notFound("AchatGroupeV1");
    const offre: OffreV1 = { fournisseur: o.fournisseur, prixUnitaireHt: o.prixUnitaireHt, livraisonHt: o.livraisonHt, delai: o.delai, lieu: o.lieu, paiement: o.paiement, validite: o.validite, annulation: o.annulation, tvaPct: o.tvaPct ?? 20 };
    const complete = manquesOffreV1(offre).length === 0 && !!o.fournisseurEmail;
    const vers: EtatAchatV1 = complete ? "offre_a_examiner" : "offre_verification";
    // consultation → vérification → à examiner ; une offre complète saisie d'un coup passe par la vérification.
    const chemin: EtatAchatV1[] = a.statut === "offre_verification" ? [vers] : [ "offre_verification", ...(complete ? (["offre_a_examiner"] as EtatAchatV1[]) : []) ];
    let de = a.statut;
    for (const etape of chemin) {
      if (etape === de) continue;
      if (!transitionV1("achat", de, etape)) throw conflit("transition_refusee", `Impossible de saisir une offre dans l'état « ${a.statut} ».`);
      de = etape;
    }
    const data = { fournisseurEmail: o.fournisseurEmail ?? null, fournisseur: offre.fournisseur, prixUnitaireHt: offre.prixUnitaireHt, livraisonHt: offre.livraisonHt, tvaPct: offre.tvaPct, delai: offre.delai, lieu: offre.lieu, paiement: offre.paiement, validite: offre.validite, annulation: offre.annulation };
    await this.prisma.$transaction([
      this.prisma.offreAchatGroupeV1.upsert({ where: { achatId: a.id }, create: { achatId: a.id, ...data }, update: data }),
      this.prisma.achatGroupeV1.update({ where: { id: a.id }, data: { statut: de, offreAvant: complete ? new Date(this.now().getTime() + 72 * 3_600_000) : null } }),
    ]);
    // Greg, 14 novembre 2026 : l'e-mail d'offre part à l'artisan DÈS qu'elle arrive (avant : au passage de la tâche horaire).
    if (complete) await this.signalerLesOffres().catch(() => undefined);
    return { id: a.id, statut: de, complete };
  }

  async renegocier(id: string) {
    this.exigerActif();
    const a = await this.transition(this.prisma, id, "renegociation");
    await this.prisma.achatGroupeV1.update({ where: { id: a.id }, data: { statut: "renegociation", offreAvant: null } });
    return { id: a.id, statut: "renegociation" };
  }

  async annuler(id: string) {
    this.exigerActif();
    const a = await this.transition(this.prisma, id, "annule");
    await this.prisma.achatGroupeV1.update({ where: { id: a.id }, data: { statut: "annule", annuleLe: this.now() } });
    // Greg, 18 novembre 2026 : un regroupement annulé se dit à chaque participant (avant : personne n'était prévenu).
    const besoins = await this.prisma.besoinGroupeV1.findMany({ where: { achatId: a.id }, select: { id: true, companyId: true } });
    const vus = new Set<string>();
    for (const b of besoins) {
      if (vus.has(b.companyId)) continue;
      vus.add(b.companyId);
      await this.alerter(b.companyId, { titre: "Regroupement annulé", detail: a.nom, action: "Voir mon besoin", href: `/achats-groupes/besoins/${b.id}`, cle: `ag-annule:${a.id}` });
      await this.envoyer(b.companyId, `Regroupement annulé : ${a.nom}`, [`Le regroupement « ${a.nom} » est annulé. Rien n'est commandé.`, "Ton article reste dans ton quantitatif : tu peux le demander à tes négoces.", "", `${this.options.webAppUrl}/achats-groupes/besoins/${b.id}`]).catch(() => undefined);
    }
    return { id: a.id, statut: "annule" };
  }

  /* ------------------------------------------------------------------- les alertes des participants */

  /**
   * LOT H (Greg, 15 novembre 2026) : quand une entreprise rejoint un achat, les AUTRES participants le lisent dans la
   * cloche : « Une entreprise vient de rejoindre ton besoin », avec le volume atteint. Un fait réel, jamais un nom. Pas
   * d'e-mail ni de notification poussée (pas de harcèlement) ; une alerte au plus par achat et par tranche de six heures :
   * le volume à jour se lit de toute façon sur le besoin.
   */
  private async prevenirLesParticipants(auteur: string, besoinIds: string[]) {
    const nouveaux = await this.prisma.besoinGroupeV1.findMany({ where: { id: { in: besoinIds } }, include: { achat: true } });
    const maintenant = this.now();
    for (const nv of nouveaux) {
      const tous = await this.prisma.besoinGroupeV1.findMany({ where: { achatId: nv.achatId, statut: { in: ["confirme", "reconfirme"] } }, select: { id: true, companyId: true, statut: true, quantite: true } });
      const v = volumesV1(tous.map((b) => ({ companyId: b.companyId, statut: b.statut as EtatBesoinV1, quantite: Number(b.quantite) })), { statut: nv.achat.statut as EtatAchatV1 });
      const p = produitV1(nv.achat.type)!;
      const tranche = Math.floor(maintenant.getTime() / (6 * 3_600_000));
      const vus = new Set<string>([auteur]);
      for (const b of tous) {
        if (vus.has(b.companyId)) continue;
        vus.add(b.companyId);
        await ecrireAlerte(this.prisma, b.companyId, {
          categorie: "groupe",
          genre: "information",
          titre: "Une entreprise vient de rejoindre ton besoin",
          // Sous 3 entreprises, jamais de volume (sinon chacun déduit la quantité de l'autre) : « en cours de regroupement »
          // (recette du 18 novembre 2026, bloquant).
          detail: `${nv.achat.nom} · ${v.entreprises} entreprises · ${v.visibles ? quantiteLisible(v.confirmes, p.unite) : "en cours de regroupement"}`.slice(0, 120),
          action: "Voir mon besoin",
          href: `/achats-groupes/besoins/${b.id}`,
          cle: `ag-rejoint:${nv.achatId}:${tranche}`,
        });
      }
    }
  }

  /** « Plus que 3 jours avant la clôture » : une fois par besoin, seulement quand c'est vrai. */
  private async alertesDeCloture(maintenant: Date) {
    const bientot = await this.prisma.besoinGroupeV1.findMany({ where: { statut: { in: ["confirme", "reconfirme"] }, achat: { statut: "ouvert", ouvertJusquau: { gt: maintenant, lte: new Date(maintenant.getTime() + 3 * 86_400_000) } } }, include: { achat: true } });
    let n = 0;
    for (const b of bientot) {
      const jours = Math.max(1, Math.ceil((b.achat.ouvertJusquau.getTime() - maintenant.getTime()) / 86_400_000));
      const ecrite = await ecrireAlerte(this.prisma, b.companyId, {
        categorie: "groupe",
        genre: "information",
        titre: jours > 1 ? `Plus que ${jours} jours avant la clôture` : "Dernier jour avant la clôture",
        detail: b.achat.nom.slice(0, 120),
        action: "Voir mon besoin",
        href: `/achats-groupes/besoins/${b.id}`,
        cle: `ag-cloture:${b.achatId}`,
      });
      if (ecrite) n++;
    }
    return n;
  }

  /* ------------------------------------------------------------------------ les rappels (tâche) */

  /**
   * Les e-mails de rappel : 24 h avant la fin de la reconfirmation, et une offre à examiner. Complémentaires : un e-mail
   * qui échoue n'est pas marqué envoyé (il repartira) et l'action reste dans « À faire ».
   */
  async rappels() {
    if (!this.options.actif) return { rappels: 0, offres: 0, echecs: 0 };
    const maintenant = this.now();
    let rappels = 0;
    let offres = 0;
    let echecs = 0;
    const aRappeler = await this.prisma.besoinGroupeV1.findMany({ where: { statut: { in: ["confirme", "indicatif"] }, rappelEnvoyeLe: null, achat: { statut: "preparation", rappelLe: { lte: maintenant }, reconfirmerAvant: { gt: maintenant } } }, include: { achat: true } });
    for (const b of aRappeler) {
      const ok = await this.envoyer(b.companyId, `Rappel : reconfirme ta quantité avant le ${heureLisible(b.achat.reconfirmerAvant!)}`, [`« ${b.designation} » : reconfirme ta quantité avant le ${heureLisible(b.achat.reconfirmerAvant!)}.`, "Sans reconfirmation, ton besoin reste indicatif et n'est pas transmis aux négoces.", "", `${this.options.webAppUrl}/achats-groupes/besoins/${b.id}`]);
      if (ok) {
        await this.prisma.besoinGroupeV1.update({ where: { id: b.id }, data: { rappelEnvoyeLe: maintenant } });
        rappels++;
      } else echecs++;
    }
    await this.alertesDeCloture(maintenant).catch(() => 0);
    const signalees = await this.signalerLesOffres();
    offres += signalees.offres;
    echecs += signalees.echecs;
    return { rappels, offres, echecs };
  }

  /**
   * L'e-mail « Offre à examiner » à chaque entreprise concernée, une seule fois : à l'arrivée de l'offre (Greg,
   * 14 novembre 2026), et repris par la tâche pour un e-mail qui n'était pas parti.
   */
  private async signalerLesOffres(): Promise<{ offres: number; echecs: number }> {
    const maintenant = this.now();
    let offres = 0;
    let echecs = 0;
    const aSignaler = await this.prisma.besoinGroupeV1.findMany({ where: { statut: "reconfirme", offreSignaleeLe: null, achat: { statut: "offre_a_examiner" } }, include: { achat: true } });
    for (const b of aSignaler) {
      await this.alerter(b.companyId, { genre: "action", titre: "Offre reçue : commander ?", detail: b.designation, action: "Voir l'offre", href: `/achats-groupes/besoins/${b.id}`, cle: `ag-offre:${b.id}` });
      const ok = await this.envoyer(b.companyId, `Offre à examiner : ${b.designation}`, [
        `Une offre complète est arrivée pour « ${b.designation} ».`,
        b.achat.offreAvant ? `Tu as jusqu'au ${heureLisible(b.achat.offreAvant)} pour commander à ce prix, ou dire non merci. Tu n'es jamais obligé de commander.` : "",
        "",
        `${this.options.webAppUrl}/achats-groupes/besoins/${b.id}`,
      ]);
      if (ok) {
        await this.prisma.besoinGroupeV1.update({ where: { id: b.id }, data: { offreSignaleeLe: maintenant } });
        offres++;
      } else echecs++;
    }
    return { offres, echecs };
  }

  /** Un e-mail à l'entreprise ; false s'il n'est pas parti (jamais une exception qui casserait le parcours). */
  /**
   * LA CLOCHE À CHAQUE ÉTAPE (Greg, 18 novembre 2026 : « alerté à chaque étape d'un regroupement que j'ai rejoint ») :
   * reconfirmation, clôture, offre reçue, commande, annulation. Une alerte par fait (`cle`), jamais un nom d'entreprise.
   */
  private async alerter(companyId: string, a: { titre: string; detail: string; action: string; href: string; cle: string; genre?: "action" | "information" }) {
    await ecrireAlerte(this.prisma, companyId, { categorie: "groupe", genre: a.genre ?? "information", titre: a.titre, detail: a.detail.slice(0, 120), action: a.action, href: a.href, cle: a.cle }).catch(() => false);
  }

  private async envoyer(companyId: string, objet: string, lignes: string[]): Promise<boolean> {
    // Réglages de notification (Greg, 18 novembre 2026) : « Achats groupés » ou les e-mails coupés, rien ne part (et rien
    // n'est à réessayer : vrai). Avant : seule l'opposition en un clic était lue.
    const reglage = await this.prisma.reglageAlertes.findUnique({ where: { companyId } }).catch(() => null);
    if (reglage && (!reglage.groupe || !reglage.email)) return true;
    const c = await this.prisma.company.findUnique({ where: { id: companyId }, select: { emailsCoupesLe: true, contactEmail: true, memberships: { take: 1, orderBy: { createdAt: "asc" }, select: { user: { select: { email: true } } } } } });
    if (!c || c.emailsCoupesLe) return false;
    const to = c.contactEmail ?? c.memberships[0]?.user.email;
    if (!to) return false;
    try {
      await this.email.send({ to, subject: objet, text: [...lignes.filter((l, i, t) => l || t[i - 1]), "", "Mobiiz"].join("\n") });
      return true;
    } catch {
      return false;
    }
  }
}
