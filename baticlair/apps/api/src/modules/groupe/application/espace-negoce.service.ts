import { estExclu } from "../../privacy/index.js";
import { supprimerCompteNegoce } from "../../privacy/index.js";
import {
  chrono,
  clesDeCommande,
  CONDITIONS_NEGOCE_VERSION,
  datesDuCycle,
  deMois,
  lirePaliers,
  mailInvitationNegoce,
  mailLienDeConnexion,
  PALIERS_DEFAUT,
  phraseApresInscription,
  zoneDuCodePostal,
  type ConfigCycle,
  type PaliersLivraison, compteurAdmin, consultationPourLeNegoce, FAMILLES_GROUPE } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import { isUuid } from "../../../platform/validation/ids.js";
import type { Geocodeur } from "./geocodeur.js";
import { lireJetonNegoce, signerJetonNegoce } from "./jetons-negoce.js";
import { siretBienForme, type SiretVerifier } from "./siret-verifier.js";

export interface InscriptionNegoce {
  jeton: string;
  email: string;
  siret?: string | null;
  enseigne: string;
  telephone?: string | null;
  depots: { adresse: string }[];
  livraison: unknown;
  departements?: string[] | null;
  conditions: boolean;
  offre?: OffreNegoce;
  familles?: readonly string[];
}

/** Multimétier (Greg, 25 octobre 2026) : ce que le négoce chiffre. */
export type OffreNegoce = "generaliste" | "specialiste";

export interface ModificationCompte {
  enseigne?: string;
  telephone?: string | null;
  depots?: { adresse: string }[];
  livraison?: unknown;
  departements?: string[];
  offre?: OffreNegoce;
  familles?: readonly string[];
}

const JOUR_MS = 86_400_000;

/**
 * Le profil choisi par le négoce : généraliste (toute la liste), ou spécialiste de ses familles cochées (au moins une).
 * Sans choix (ancien formulaire), rien ne change : il garde les familles que les artisans lui ont données.
 */
function profilChoisi(offre: OffreNegoce | undefined, familles: readonly string[] | undefined): { generaliste: boolean; familles: string[] } | null {
  if (!offre) return null;
  if (offre === "generaliste") return { generaliste: true, familles: [] };
  const f = FAMILLES_GROUPE.filter((x) => (familles ?? []).includes(x));
  if (f.length === 0) throw validationFailed("At least one family", { reason: "familles_requises" });
  return { generaliste: false, familles: f };
}
/** L'e-mail d'invitation ne repart pas à chaque ajout par un artisan : au plus un par semaine tant que l'accès n'est pas créé. */
const INVITATION_RELANCE_MS = 7 * JOUR_MS;

/**
 * L'ESPACE NÉGOCE AUTONOME (Greg, 23 octobre 2026) : « que Greg n'intervienne jamais entre un artisan et un négoce ». Un
 * compte par négoce (SIRET, sinon e-mail), créé par le négoce depuis son lien d'invitation unique (un artisan l'a ajouté,
 * sans le nommer), sans mot de passe (lien magique, session de 30 jours). Ses dépôts (géocodés), ses paliers de livraison
 * communs, ses départements desservis : chacun est une ligne `negoce` (son abonnement), d'où la grille part à la clôture.
 */
export class EspaceNegoceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: TransactionalEmailSender | null,
    private readonly geocodeur: Geocodeur | null,
    private readonly siretVerifier: SiretVerifier | null,
    private readonly reglages: { authSecret: string; webAppUrl: string },
    private readonly config: () => Promise<ConfigCycle>,
  ) {}

  // ---------------------------------------------------------------------------------------------------------------
  // L'invitation (point 1)
  // ---------------------------------------------------------------------------------------------------------------

  /** Le lien d'invitation d'un compte (90 jours à compter de maintenant) ; le même compte pour tous les artisans. */
  lienInvitation(compteId: string, maintenant = new Date()): string {
    return `${this.reglages.webAppUrl}/negoce/rejoindre/${signerJetonNegoce(this.reglages.authSecret, { sorte: "invitation", compteId }, maintenant)}`;
  }

  lienConditions(): string {
    return `${this.reglages.webAppUrl}/negoce/conditions`;
  }

  /** « Ne plus jamais être contacté » (RGPD, 24 octobre 2026) : dans chaque e-mail d'invitation et de clôture. */
  lienOpposition(compteId: string, maintenant = new Date()): string {
    return `${this.reglages.webAppUrl}/negoce/opposition/${signerJetonNegoce(this.reglages.authSecret, { sorte: "opposition", compteId }, maintenant)}`;
  }

  lienDesabonnement(compteId: string, departement: string | null, maintenant = new Date()): string {
    return `${this.reglages.webAppUrl}/negoce/desabonner/${signerJetonNegoce(this.reglages.authSecret, { sorte: "desabonnement", compteId, departement }, maintenant)}`;
  }

  /**
   * Un artisan vient d'ajouter ce négoce : son compte existe (SIRET, sinon e-mail), la ligne `negoce` lui est reliée, le
   * lien d'invitation est régénéré et envoyé (au plus une fois par semaine tant que l'accès n'est pas créé). Rend le lien.
   */
  async inviter(negoce: { id: string; email: string; siret: string | null; nom: string; compteId: string | null }, maintenant = new Date()): Promise<string> {
    // DROIT D'OPPOSITION (24 octobre 2026) : un négoce qui a demandé à ne plus jamais être contacté n'est jamais réinvité,
    // même quand un artisan le rajoute ; la ligne reste dans la liste de l'artisan, arrêtée.
    if (await estExclu(this.prisma, { email: negoce.email, siret: negoce.siret })) {
      await this.prisma.negoce.update({ where: { id: negoce.id }, data: { stopLe: maintenant } });
      return "";
    }
    const compte = negoce.compteId
      ? await this.prisma.compteNegoce.findUnique({ where: { id: negoce.compteId } })
      : ((negoce.siret ? await this.prisma.compteNegoce.findUnique({ where: { siret: negoce.siret } }) : null) ?? (await this.prisma.compteNegoce.findUnique({ where: { email: negoce.email } })));
    const c =
      compte ??
      (await this.prisma.compteNegoce.create({ data: { email: negoce.email, siret: negoce.siret, enseigne: negoce.nom } }).catch(async (e: unknown) => {
        // Deux artisans ajoutent le même négoce au même instant : le compte existe déjà.
        if ((e as { code?: string }).code !== "P2002") throw e;
        return this.prisma.compteNegoce.findUniqueOrThrow({ where: { email: negoce.email } });
      }));
    if (negoce.compteId !== c.id) await this.prisma.negoce.update({ where: { id: negoce.id }, data: { compteId: c.id } });
    const lien = this.lienInvitation(c.id, maintenant);
    if (c.inscritLe) return lien;
    const deja = c.invitationLe && maintenant.getTime() - c.invitationLe.getTime() < INVITATION_RELANCE_MS;
    await this.prisma.compteNegoce.update({ where: { id: c.id }, data: { invitationLe: maintenant } });
    if (!deja && this.email) {
      const departement = (await this.prisma.negoce.findUnique({ where: { id: negoce.id }, select: { departement: true } }))?.departement ?? null;
      const mail = mailInvitationNegoce({ lien, departement, conditions: this.lienConditions(), opposition: this.lienOpposition(c.id, maintenant) });
      await this.email.send({ to: c.email, subject: mail.objet, text: mail.texte }).catch(() => undefined);
    }
    return lien;
  }

  /** Ce que la page d'inscription montre : les champs préremplis, jamais le nom d'un artisan. */
  async invitation(jeton: string, maintenant = new Date()) {
    const j = lireJetonNegoce(this.reglages.authSecret, "invitation", jeton, maintenant);
    if (!j || !isUuid(j.compteId)) throw notFound("Lien");
    const c = await this.prisma.compteNegoce.findUnique({ where: { id: j.compteId }, include: { abonnements: { select: { departement: true } } } });
    if (!c) throw notFound("Lien");
    return {
      email: c.email,
      siret: c.siret,
      enseigne: c.enseigne,
      inscrit: !!c.inscritLe,
      departements: [...new Set(c.abonnements.map((a) => a.departement))].sort(),
      paliersDefaut: PALIERS_DEFAUT,
      conditionsVersion: CONDITIONS_NEGOCE_VERSION,
    };
  }

  // ---------------------------------------------------------------------------------------------------------------
  // L'inscription (point 2)
  // ---------------------------------------------------------------------------------------------------------------

  async inscrire(i: InscriptionNegoce, maintenant = new Date()): Promise<{ compteId: string; phrase: string; departements: string[] }> {
    const j = lireJetonNegoce(this.reglages.authSecret, "invitation", i.jeton, maintenant);
    if (!j || !isUuid(j.compteId)) throw notFound("Lien");
    const compte = await this.prisma.compteNegoce.findUnique({ where: { id: j.compteId }, include: { abonnements: true } });
    if (!compte) throw notFound("Lien");
    if (compte.inscritLe) throw new DomainError("conflict", "Already registered", { reason: "deja_inscrit" });
    if (!i.conditions) throw validationFailed("Conditions required", { reason: "conditions_requises" });
    const email = i.email.trim().toLowerCase();
    const enseigne = i.enseigne.trim();
    if (!enseigne) throw validationFailed("Name required", { reason: "enseigne_requise" });
    const siret = await this.siretVerifie(i.siret);
    const livraison = lirePaliers(i.livraison);
    if (!livraison) throw validationFailed("Delivery tiers", { reason: "paliers_invalides" });
    const depots = await this.depotsGeocodes(i.depots);
    if (depots.length === 0) throw validationFailed("Depot required", { reason: "depot_requis" });
    const departements = this.departementsChoisis(i.departements, depots, compte.abonnements.map((a) => a.departement));
    if (departements.length === 0) throw validationFailed("Department required", { reason: "departement_requis" });
    const profil = profilChoisi(i.offre, i.familles);
    const autre = await this.prisma.compteNegoce.findFirst({ where: { OR: [{ email }, ...(siret ? [{ siret }] : [])], NOT: { id: compte.id } }, select: { id: true } });
    if (autre) throw new DomainError("conflict", "Email or SIRET already used", { reason: "compte_existant" });
    await this.prisma.$transaction(async (tx) => {
      await tx.compteNegoce.update({
        where: { id: compte.id },
        data: { email, siret, enseigne, telephone: i.telephone?.trim() || null, livraison: livraison as unknown as object, departements, ...(profil ?? {}), inscritLe: maintenant, conditionsAccepteesLe: maintenant, conditionsVersion: CONDITIONS_NEGOCE_VERSION, derniereConnexionLe: maintenant, desabonneLe: null },
      });
      await tx.depotNegoce.deleteMany({ where: { compteId: compte.id } });
      await tx.depotNegoce.createMany({ data: depots.map((d) => ({ compteId: compte.id, ...d })) });
      await this.alignerAbonnements(tx, compte.id, { email, siret, enseigne }, departements, maintenant, profil);
    });
    const prochaine = await this.prochaineCloture(departements, maintenant);
    return { compteId: compte.id, phrase: phraseApresInscription(prochaine.clotureLe), departements };
  }

  private async siretVerifie(saisi: string | null | undefined): Promise<string | null> {
    const siret = saisi?.replace(/\s+/g, "") || null;
    if (!siret) return null;
    if (!siretBienForme(siret)) throw validationFailed("SIRET", { reason: "siret_invalide" });
    // Connu de la base Sirene importée : vérifié ; sinon l'INSEE quand le vérificateur est branché.
    if (await this.prisma.negoceSirene.findUnique({ where: { siret }, select: { siret: true } })) return siret;
    if (this.siretVerifier) {
      const r = await this.siretVerifier.verifier(siret).catch(() => null);
      if (r && (r.statut === "inconnu" || r.statut === "ferme")) throw validationFailed("SIRET", { reason: "siret_invalide" });
    }
    return siret;
  }

  private async depotsGeocodes(depots: readonly { adresse: string }[]) {
    const out: { adresse: string; codePostal: string | null; commune: string | null; departement: string | null; lat: number | null; lon: number | null }[] = [];
    for (const d of depots.slice(0, 10)) {
      const adresse = d.adresse.trim();
      if (adresse.length < 5) continue;
      const cp = /\b(\d{5})\b/.exec(adresse)?.[1] ?? null;
      const commune = cp ? (/\b\d{5}\s+([^,]+)/.exec(adresse)?.[1]?.trim() ?? null) : null;
      const point = this.geocodeur ? await this.geocodeur.point(adresse).catch(() => null) : null;
      out.push({ adresse, codePostal: cp, commune, departement: zoneDuCodePostal(adresse), lat: point?.lat ?? null, lon: point?.lon ?? null });
    }
    return out;
  }

  /** Cochés d'office : les départements des dépôts et ceux où un artisan l'a déjà ajouté ; le négoce les modifie. */
  private departementsChoisis(choisis: readonly string[] | null | undefined, depots: readonly { departement: string | null }[], abonnes: readonly string[]): string[] {
    const valides = (l: readonly string[]) => [...new Set(l.filter((d) => /^(\d{2}|2A|2B|97\d|98\d)$/.test(d)))].sort();
    if (choisis && choisis.length > 0) return valides(choisis);
    return valides([...depots.map((d) => d.departement).filter((d): d is string => !!d), ...abonnes]);
  }

  /** Une ligne `negoce` par département desservi, reliée au compte (familles : celles des lignes déjà connues, sinon couverture) ; les autres départements sont arrêtés. */
  private async alignerAbonnements(tx: Parameters<Parameters<PrismaService["$transaction"]>[0]>[0], compteId: string, c: { email: string; siret: string | null; enseigne: string }, departements: readonly string[], maintenant: Date, profil: { generaliste: boolean; familles: string[] } | null = null): Promise<void> {
    const existants = await tx.negoce.findMany({ where: { OR: [{ compteId }, { email: c.email }, ...(c.siret ? [{ siret: c.siret }] : [])] } });
    // Le choix du négoce (généraliste ou ses familles) vaut pour chacun de ses départements ; sans choix, ses familles connues.
    for (const n of existants) {
      const garde = departements.includes(n.departement);
      await tx.negoce.update({ where: { id: n.id }, data: { compteId, nom: c.enseigne, email: c.email, siret: c.siret ?? n.siret, familles: profil?.familles ?? n.familles, generaliste: profil?.generaliste ?? n.generaliste, stopLe: garde ? null : (n.stopLe ?? maintenant) } });
    }
    const familles = profil ? profil.familles : [...new Set(existants.flatMap((n) => n.familles))];
    const generaliste = profil?.generaliste ?? existants.some((n) => n.generaliste);
    for (const d of departements) {
      if (existants.some((n) => n.departement === d)) continue;
      await tx.negoce.create({ data: { nom: c.enseigne, email: c.email, siret: c.siret, departement: d, familles: familles.length || generaliste ? familles : ["couverture"], generaliste, compteId, createdAt: maintenant } });
    }
  }

  /** La prochaine clôture d'un négoce : la plus proche parmi ses départements (un cycle ouvert en base, sinon la règle). */
  async prochaineCloture(departements: readonly string[], maintenant = new Date()): Promise<{ mois: string; de: string; clotureLe: Date; clotureDans: string }> {
    const config = await this.config();
    const ouvert = await this.prisma.cycleCommande.findFirst({ where: { zone: { in: [...departements] }, phase: "inscriptions", clotureLe: { gt: maintenant } }, orderBy: { clotureLe: "asc" } });
    if (ouvert) return { mois: ouvert.mois, de: deMois(ouvert.mois), clotureLe: ouvert.clotureLe, clotureDans: chrono(maintenant, ouvert.clotureLe) };
    const mois = clesDeCommande(maintenant, config).find((m) => maintenant < datesDuCycle(m, config).clotureLe)!;
    const d = datesDuCycle(mois, config);
    return { mois, de: deMois(mois), clotureLe: d.clotureLe, clotureDans: chrono(maintenant, d.clotureLe) };
  }

  // ---------------------------------------------------------------------------------------------------------------
  // La connexion (lien magique) et la session
  // ---------------------------------------------------------------------------------------------------------------

  /** Toujours « c'est envoyé » : on ne dit pas si l'adresse est connue. */
  async demanderConnexion(email: string, maintenant = new Date()): Promise<void> {
    const c = await this.prisma.compteNegoce.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!c || !c.inscritLe || !this.email) return;
    const lien = `${this.reglages.webAppUrl}/negoce/connexion/${signerJetonNegoce(this.reglages.authSecret, { sorte: "connexion", compteId: c.id }, maintenant)}`;
    const mail = mailLienDeConnexion({ lien });
    await this.email.send({ to: c.email, subject: mail.objet, text: mail.texte }).catch(() => undefined);
  }

  async connecter(jeton: string, maintenant = new Date()): Promise<{ compteId: string }> {
    const j = lireJetonNegoce(this.reglages.authSecret, "connexion", jeton, maintenant);
    if (!j || !isUuid(j.compteId)) throw notFound("Lien");
    const c = await this.prisma.compteNegoce.findUnique({ where: { id: j.compteId }, select: { id: true, inscritLe: true } });
    if (!c?.inscritLe) throw notFound("Lien");
    await this.prisma.compteNegoce.update({ where: { id: c.id }, data: { derniereConnexionLe: maintenant } });
    return { compteId: c.id };
  }

  jetonDeSession(compteId: string, maintenant = new Date()): string {
    return signerJetonNegoce(this.reglages.authSecret, { sorte: "session", compteId }, maintenant);
  }

  /** La session du cookie : un compte inscrit, ou rien. */
  async session(jeton: string | null, maintenant = new Date()): Promise<{ compteId: string } | null> {
    if (!jeton) return null;
    const j = lireJetonNegoce(this.reglages.authSecret, "session", jeton, maintenant);
    if (!j || !isUuid(j.compteId)) return null;
    const c = await this.prisma.compteNegoce.findUnique({ where: { id: j.compteId }, select: { id: true, inscritLe: true } });
    return c?.inscritLe ? { compteId: c.id } : null;
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Le compte (point 3) : ce que le négoce voit, et rien d'autre (point 4)
  // ---------------------------------------------------------------------------------------------------------------

  async compte(compteId: string, maintenant = new Date(), jetonDeGrille: (grilleId: string) => string) {
    const c = await this.prisma.compteNegoce.findUnique({ where: { id: compteId }, include: { depots: { orderBy: { createdAt: "asc" } }, abonnements: { where: { stopLe: null }, select: { id: true, departement: true } } } });
    if (!c) throw notFound("Compte");
    const departements = [...new Set(c.abonnements.map((a) => a.departement))].sort();
    const negoceIds = c.abonnements.map((a) => a.id);
    const prochaine = departements.length ? await this.prochaineCloture(departements, maintenant) : null;
    // Les grilles en cours : phase « négoces », avant la limite ; pendant les inscriptions, rien que le chrono.
    const grilles = await this.prisma.grilleNegoce.findMany({ where: { negoceId: { in: negoceIds }, cycle: { phase: "negoces", reponseAvant: { gt: maintenant } } }, include: { cycle: { select: { mois: true, zone: true, reponseAvant: true, _count: { select: { grilles: true } } } } }, orderBy: { createdAt: "desc" } });
    // Les commandes passées chez lui : là, et seulement là, il voit l'artisan (point 4).
    // Multimétier (25 octobre 2026) : une commande en plusieurs parts compte chez chaque négoce retenu, pour SA part seulement.
    type Part = { negoceId: string; totalHt: number };
    const choix = (await this.prisma.choixArtisan.findMany({ where: { commandeLe: { not: null }, OR: [{ negoceId: { in: negoceIds } }, { cycle: { zone: { in: departements } } }] }, include: { company: { select: { name: true } }, cycle: { select: { mois: true } } }, orderBy: { commandeLe: "desc" } }))
      .map((x) => {
        const parts = (x.parts as Part[] | null) ?? null;
        const sienne = parts ? parts.find((p) => negoceIds.includes(p.negoceId)) : negoceIds.includes(x.negoceId) ? { negoceId: x.negoceId, totalHt: Number(x.totalHt) } : null;
        return sienne ? { ...x, totalHt: sienne.totalHt } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
    const garanties = await this.prisma.commandeGarantie.findMany({ where: { negoceId: { in: negoceIds } }, include: { company: { select: { name: true } }, cycle: { select: { mois: true } } }, orderBy: { commandeLe: "desc" } });
    return {
      email: c.email,
      siret: c.siret,
      enseigne: c.enseigne,
      telephone: c.telephone,
      depots: c.depots.map((d) => ({ id: d.id, adresse: d.adresse, geocode: d.lat !== null })),
      livraison: (c.livraison as unknown as PaliersLivraison | null) ?? PALIERS_DEFAUT,
      departements,
      offre: c.generaliste ? ("generaliste" as const) : c.familles.length ? ("specialiste" as const) : null,
      familles: c.familles,
      prochaine: prochaine ? { mois: prochaine.mois, de: prochaine.de, clotureLe: prochaine.clotureLe.toISOString(), clotureDans: prochaine.clotureDans } : null,
      grilles: grilles.map((g) => ({ mois: g.cycle.mois, de: deMois(g.cycle.mois), departement: g.cycle.zone, reponseAvant: g.cycle.reponseAvant.toISOString(), reponseDans: chrono(maintenant, g.cycle.reponseAvant), deposee: !!g.deposeLe, lien: `/grille/${jetonDeGrille(g.id)}`, consultation: consultationPourLeNegoce(g.cycle._count.grilles, g.cycle.reponseAvant) })),
      commandes: [
        ...choix.map((x) => ({ type: "cycle" as const, mois: x.cycle.mois, de: deMois(x.cycle.mois), artisan: x.company.name, totalHt: Number(x.totalHt), le: x.commandeLe!.toISOString() })),
        ...garanties.map((x) => ({ type: "garantie" as const, mois: x.cycle.mois, de: deMois(x.cycle.mois), artisan: x.company.name, totalHt: Number(x.totalHt), le: x.commandeLe.toISOString() })),
      ].sort((a, b) => b.le.localeCompare(a.le)),
      conditionsVersion: c.conditionsVersion,
    };
  }

  async modifier(compteId: string, m: ModificationCompte, maintenant = new Date()): Promise<void> {
    const c = await this.prisma.compteNegoce.findUnique({ where: { id: compteId }, include: { abonnements: true } });
    if (!c?.inscritLe) throw notFound("Compte");
    const livraison = m.livraison === undefined ? null : lirePaliers(m.livraison);
    if (m.livraison !== undefined && !livraison) throw validationFailed("Delivery tiers", { reason: "paliers_invalides" });
    const depots = m.depots ? await this.depotsGeocodes(m.depots) : null;
    if (depots && depots.length === 0) throw validationFailed("Depot required", { reason: "depot_requis" });
    const enseigne = m.enseigne?.trim() || c.enseigne;
    const departements = m.departements ? this.departementsChoisis(m.departements, [], []) : null;
    if (departements && departements.length === 0) throw validationFailed("Department required", { reason: "departement_requis" });
    const profil = profilChoisi(m.offre, m.familles);
    await this.prisma.$transaction(async (tx) => {
      await tx.compteNegoce.update({ where: { id: compteId }, data: { enseigne, ...(m.telephone !== undefined ? { telephone: m.telephone?.trim() || null } : {}), ...(livraison ? { livraison: livraison as unknown as object } : {}), ...(departements ? { departements } : {}), ...(profil ?? {}) } });
      if (depots) {
        await tx.depotNegoce.deleteMany({ where: { compteId } });
        await tx.depotNegoce.createMany({ data: depots.map((d) => ({ compteId, ...d })) });
      }
      if (departements) await this.alignerAbonnements(tx, compteId, { email: c.email, siret: c.siret, enseigne }, departements, maintenant, profil);
      else {
        if (m.enseigne) await tx.negoce.updateMany({ where: { compteId }, data: { nom: enseigne } });
        if (profil) await tx.negoce.updateMany({ where: { compteId }, data: profil });
      }
    });
  }

  /** Se désabonner d'un département, ou de tout : plus aucune grille ; le compte reste (ses commandes passées aussi). */
  async desabonner(compteId: string, departement: string | null, maintenant = new Date()): Promise<{ departements: string[] }> {
    const c = await this.prisma.compteNegoce.findUnique({ where: { id: compteId } });
    if (!c) throw notFound("Compte");
    await this.prisma.negoce.updateMany({ where: { compteId, stopLe: null, ...(departement ? { departement } : {}) }, data: { stopLe: maintenant } });
    const restants = departement ? c.departements.filter((d) => d !== departement) : [];
    await this.prisma.compteNegoce.update({ where: { id: compteId }, data: { departements: restants, ...(restants.length === 0 ? { desabonneLe: maintenant } : {}) } });
    return { departements: restants };
  }

  async desabonnerParJeton(jeton: string, maintenant = new Date()): Promise<{ departements: string[]; departement: string | null }> {
    const j = lireJetonNegoce(this.reglages.authSecret, "desabonnement", jeton, maintenant);
    if (!j || !isUuid(j.compteId)) throw notFound("Lien");
    return { ...(await this.desabonner(j.compteId, j.departement ?? null, maintenant)), departement: j.departement ?? null };
  }

  /**
   * Supprimer son compte (RGPD, 24 octobre 2026) : dépôts et paliers effacés, abonnements arrêtés, e-mail des lignes
   * effacé, le négoce mis sur la liste d'exclusion (plus jamais réinvité) ; la preuve d'acceptation des conditions est
   * gardée 5 ans (version, date, e-mail haché). Les grilles déposées et les commandes passées restent, sous l'enseigne.
   */
  async supprimer(compteId: string, maintenant = new Date(), source: "suppression_compte" | "opposition" = "suppression_compte"): Promise<void> {
    if (!(await supprimerCompteNegoce(this.prisma, compteId, maintenant, source))) throw notFound("Compte");
  }

  /**
   * « Ne plus jamais être contacté » (RGPD, 24 octobre 2026) : depuis le lien de chaque e-mail d'invitation ou de clôture.
   * Même effet qu'une suppression de compte, la source en plus : l'opposition.
   */
  async opposer(jeton: string, maintenant = new Date()): Promise<{ fait: true }> {
    const j = lireJetonNegoce(this.reglages.authSecret, "opposition", jeton, maintenant);
    if (!j || !isUuid(j.compteId)) throw notFound("Lien");
    const c = await this.prisma.compteNegoce.findUnique({ where: { id: j.compteId }, select: { id: true } });
    // Déjà fait (lien rouvert) : rien à refaire, la liste d'exclusion est là.
    if (c) await this.supprimer(c.id, maintenant, "opposition");
    return { fait: true };
  }

  /** Ce que la page d'opposition montre avant de confirmer : l'enseigne, jamais un nom d'artisan. */
  async pageOpposition(jeton: string, maintenant = new Date()): Promise<{ enseigne: string | null; deja: boolean }> {
    const j = lireJetonNegoce(this.reglages.authSecret, "opposition", jeton, maintenant);
    if (!j || !isUuid(j.compteId)) throw notFound("Lien");
    const c = await this.prisma.compteNegoce.findUnique({ where: { id: j.compteId }, select: { enseigne: true } });
    return { enseigne: c?.enseigne ?? null, deja: !c };
  }

  /**
   * MES DONNÉES (RGPD, accès et portabilité, 24 octobre 2026) : tout ce que BatiClair garde du négoce, lisible. Ses propres
   * grilles et ses propres prix ; les commandes reçues (le nom de l'artisan qui lui a commandé) ; jamais une donnée d'un
   * autre négoce.
   */
  async export(compteId: string) {
    const c = await this.prisma.compteNegoce.findUnique({ where: { id: compteId }, include: { depots: true, abonnements: true } });
    if (!c) throw notFound("Compte");
    const ids = c.abonnements.map((a) => a.id);
    const grilles = await this.prisma.grilleNegoce.findMany({ where: { negoceId: { in: ids } }, include: { cycle: { select: { mois: true, zone: true, lignes: true } } }, orderBy: { createdAt: "asc" } });
    const choix = await this.prisma.choixArtisan.findMany({ where: { negoceId: { in: ids }, commandeLe: { not: null } }, include: { company: { select: { name: true } }, cycle: { select: { mois: true } } } });
    const garanties = await this.prisma.commandeGarantie.findMany({ where: { negoceId: { in: ids } }, include: { company: { select: { name: true } }, cycle: { select: { mois: true } } } });
    return {
      exporteLe: new Date().toISOString(),
      compte: { email: c.email, siret: c.siret, enseigne: c.enseigne, telephone: c.telephone, livraison: c.livraison, departements: c.departements, inscritLe: c.inscritLe, conditionsAccepteesLe: c.conditionsAccepteesLe, conditionsVersion: c.conditionsVersion, derniereConnexionLe: c.derniereConnexionLe, desabonneLe: c.desabonneLe, createdAt: c.createdAt },
      depots: c.depots.map((d) => ({ adresse: d.adresse, codePostal: d.codePostal, commune: d.commune, departement: d.departement })),
      abonnements: c.abonnements.map((a) => ({ departement: a.departement, familles: a.familles, stopLe: a.stopLe, createdAt: a.createdAt })),
      grilles: grilles.map((g) => {
        const designations = new Map(((g.cycle.lignes as { cle: string; designation: string }[] | null) ?? []).map((l) => [l.cle, l.designation]));
        return { commande: g.cycle.mois, departement: g.cycle.zone, deposeLe: g.deposeLe, prix: Object.entries((g.prix as Record<string, number> | null) ?? {}).map(([cle, prixUnitaireHt]) => ({ article: designations.get(cle) ?? cle, prixUnitaireHt })), nonGarantis: g.nonGarantis };
      }),
      commandesRecues: [
        ...choix.map((x) => ({ commande: x.cycle.mois, artisan: x.company.name, totalHt: Number(x.totalHt), le: x.commandeLe })),
        ...garanties.map((x) => ({ commande: x.cycle.mois, artisan: x.company.name, totalHt: Number(x.totalHt), le: x.commandeLe, grilleGarantie: true })),
      ],
    };
  }

  // ---------------------------------------------------------------------------------------------------------------
  // L'admin (point 8)
  // ---------------------------------------------------------------------------------------------------------------

  async tableau() {
    const comptes = await this.prisma.compteNegoce.findMany({ include: { abonnements: { select: { id: true, departement: true, stopLe: true } } }, orderBy: { createdAt: "desc" } });
    const cycles = await this.prisma.cycleCommande.findMany({ where: { phase: { in: ["negoces", "resultats"] } }, include: { grilles: { select: { negoceId: true, deposeLe: true } }, choix: { select: { negoceId: true, commandeLe: true } }, commandesGaranties: { select: { negoceId: true } } }, orderBy: { clotureLe: "desc" }, take: 24 });
    const parCycle = cycles.map((c) => ({ mois: c.mois, de: deMois(c.mois), zone: c.zone, phase: c.phase, attendues: c.grilles.length, deposees: c.grilles.filter((g) => g.deposeLe).length, tauxReponse: c.grilles.length ? Math.round((100 * c.grilles.filter((g) => g.deposeLe).length) / c.grilles.length) : null, retenuId: c.retenuId, compteur: compteurAdmin({ zone: c.zone, mois: c.mois, consultes: c.grilles.length, repondus: c.grilles.filter((g) => g.deposeLe).length }) }));
    const parRetenu = new Map<string, { retenu: number; commandes: number }>();
    for (const c of cycles) {
      if (!c.retenuId) continue;
      const v = parRetenu.get(c.retenuId) ?? { retenu: 0, commandes: 0 };
      v.retenu++;
      v.commandes += c.choix.filter((x) => x.negoceId === c.retenuId && x.commandeLe).length + c.commandesGaranties.filter((x) => x.negoceId === c.retenuId).length;
      parRetenu.set(c.retenuId, v);
    }
    return {
      negoces: comptes.map((c) => {
        const ids = c.abonnements.map((a) => a.id);
        const stats = ids.map((id) => parRetenu.get(id)).filter((v): v is { retenu: number; commandes: number } => !!v);
        const retenu = stats.reduce((s, v) => s + v.retenu, 0);
        const commandes = stats.reduce((s, v) => s + v.commandes, 0);
        return {
          id: c.id,
          enseigne: c.enseigne,
          email: c.email,
          siret: c.siret,
          etat: c.desabonneLe ? "desabonne" : c.inscritLe ? "inscrit" : "invite",
          inviteLe: c.invitationLe?.toISOString() ?? null,
          inscritLe: c.inscritLe?.toISOString() ?? null,
          rappels: c.rappels,
          departements: c.abonnements.filter((a) => !a.stopLe).map((a) => a.departement).sort(),
          grillesRetenues: retenu,
          commandesRecues: commandes,
        };
      }),
      cycles: parCycle,
    };
  }
}
