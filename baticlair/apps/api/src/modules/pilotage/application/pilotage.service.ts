import { DOMAINE_DEMO, emailsDemo } from "../../../platform/demo-domaine.js";
import { createHash, randomInt } from "node:crypto";
import { NOM_APP, REGLAGES_PILOTAGE_DEFAUT, eurosEntiers, flecheDe, rentabilite, revenuMensuelRecurrent, taux, type Formule, type ReglagesPilotage } from "@baticlair/domain";
import type { AppConfig } from "../../../platform/config/config.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import { DomainError, forbidden, validationFailed } from "../../../platform/errors/domain-error.js";
import type { AuthenticatedUser } from "../../identity/index.js";

const JOUR = 86_400_000;
const CLE_REGLAGES = "pilotage:reglages";
/** Le domaine des comptes de démonstration et des faux comptes du jeu de test : jamais comptés. */
export const DOMAINE_FACTICE = `@${DOMAINE_DEMO}`;
const VALIDITE_CODE_MS = 10 * 60_000;
const VALIDITE_SESSION_MS = 12 * 3_600_000;

/** Ce que le pilotage demande aux autres modules (abonnement, apprentissage, regroupement), sans en dépendre. */
export interface SourcesPilotage {
  etatAbonnement(companyId: string, maintenant: Date): Promise<{ acces: string; essaiFinLe: Date | null }>;
  apprentissage(): Promise<{ aValider: unknown[]; tauxParMois: { mois: string; taux: number | null }[] }>;
  economies(): Promise<{ total: number; parCommande: number | null; cycles: number }>;
  /** Les prix réglés des deux formules, HT en centimes (repli quand un abonné n'a pas encore de facture de sa formule). */
  prixFormules(): Promise<Record<Formule, number>>;
  paiementSimule: boolean;
  /** Stripe en clé de TEST (prévisualisation) : aucune carte réellement débitée. */
  stripeDeTest?: boolean;
  /** La démo admin est permise (jamais en production : prévisualisation ou développement). */
  demoPermise?: boolean;
}

const debutDuMois = (d: Date, decalage = 0) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + decalage, 1));
const jourIso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * LE PILOTAGE ADMIN (Greg, 24 octobre 2026) : le tableau de bord (une page, sur iPhone), réservé aux e-mails de
 * GROUPE_ADMINS avec double authentification (un code envoyé par e-mail, lié à la session, 12 h) ; chaque accès et chaque
 * détail nominatif est journalisé ; les chiffres sont agrégés ; aucun export nominatif.
 */
export class PilotageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: Pick<AppConfig, "groupe" | "aiCost" | "authSecret">,
    private readonly email: TransactionalEmailSender,
    private readonly sources: SourcesPilotage,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // ---------------------------------------------------------------- accès

  private estAdmin(user: AuthenticatedUser): boolean {
    return !!user.email && this.config.groupe.admins.includes(user.email.toLowerCase());
  }

  /** Business model final (25 octobre 2026) : le chasseur d'opportunités, un rôle à part (CHASSEURS), ou un admin. */
  estChasseur(user: AuthenticatedUser): boolean {
    return this.estAdmin(user) || (!!user.email && this.config.groupe.negocie.chasseurs.includes(user.email.toLowerCase()));
  }

  /** Les routes du chasseur : chasseur ou admin, et double authentification faite (même code que le pilotage). */
  async exigerChasseur(user: AuthenticatedUser): Promise<string> {
    if (!this.estChasseur(user)) throw forbidden("Reserved to opportunity hunters");
    if (!(await this.deuxFacteurs(user))) throw new DomainError("forbidden", "Two-factor authentication required", { reason: "deux_facteurs_requis" });
    return user.email.toLowerCase();
  }

  private empreinte(code: string, sessionId: string): string {
    return createHash("sha256").update(`${code}:${sessionId}:${this.config.authSecret}`).digest("hex");
  }

  journal(user: AuthenticatedUser, action: string, cible: string | null = null) {
    return this.prisma.journalAdmin.create({ data: { userId: user.userId, email: user.email, action, cible } });
  }

  /** L'admin est-il passé par la double authentification sur cette session ? */
  async deuxFacteurs(user: AuthenticatedUser): Promise<boolean> {
    if (!user.sessionId) return false;
    const c = await this.prisma.codeAdmin.findUnique({ where: { sessionId: user.sessionId } });
    return !!c?.valideLe && c.userId === user.userId && this.now().getTime() - c.valideLe.getTime() < VALIDITE_SESSION_MS;
  }

  /** Toute route du pilotage : admin, et double authentification faite. */
  async exiger(user: AuthenticatedUser): Promise<void> {
    if (!this.estAdmin(user)) throw forbidden("Reserved to admins");
    if (!(await this.deuxFacteurs(user))) throw new DomainError("forbidden", "Two-factor authentication required", { reason: "deux_facteurs_requis" });
  }

  /** Le code à 6 chiffres, par e-mail, pour cette session. */
  async envoyerCode(user: AuthenticatedUser): Promise<{ envoye: true }> {
    if (!this.estChasseur(user) || !user.sessionId) throw forbidden("Reserved to admins");
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const data = { userId: user.userId, codeHash: this.empreinte(code, user.sessionId), expireLe: new Date(this.now().getTime() + VALIDITE_CODE_MS), tentatives: 0, valideLe: null };
    await this.prisma.codeAdmin.upsert({ where: { sessionId: user.sessionId }, create: { sessionId: user.sessionId, ...data }, update: data });
    await this.email.send({ to: user.email, subject: `Ton code d'accès au pilotage ${NOM_APP}`, text: [`Ton code : ${code}`, "", "Il est valable 10 minutes, pour cette connexion seulement.", "Si tu n'as rien demandé, ne le donne à personne."].join("\n"), mustDeliver: true });
    await this.journal(user, "code_envoye");
    return { envoye: true };
  }

  async verifierCode(user: AuthenticatedUser, code: string): Promise<{ ok: true }> {
    if (!this.estChasseur(user) || !user.sessionId) throw forbidden("Reserved to admins");
    const c = await this.prisma.codeAdmin.findUnique({ where: { sessionId: user.sessionId } });
    const bon = !!c && c.userId === user.userId && c.tentatives < 5 && c.expireLe > this.now() && c.codeHash === this.empreinte(code.trim(), user.sessionId);
    if (!bon) {
      if (c) await this.prisma.codeAdmin.update({ where: { sessionId: user.sessionId }, data: { tentatives: { increment: 1 } } });
      await this.journal(user, "code_refuse");
      throw validationFailed("Wrong or expired code", { reason: "code_invalide" });
    }
    await this.prisma.codeAdmin.update({ where: { sessionId: user.sessionId }, data: { valideLe: this.now() } });
    await this.journal(user, "code_valide");
    return { ok: true };
  }

  // ---------------------------------------------------------------- réglages et compteurs

  async reglages(): Promise<ReglagesPilotage> {
    const p = await this.prisma.parametreGroupe.findUnique({ where: { cle: CLE_REGLAGES } });
    return { ...REGLAGES_PILOTAGE_DEFAUT, ...((p?.valeur as Partial<ReglagesPilotage> | null) ?? {}) };
  }

  async majReglages(user: AuthenticatedUser, r: ReglagesPilotage): Promise<ReglagesPilotage> {
    await this.exiger(user);
    await this.prisma.parametreGroupe.upsert({ where: { cle: CLE_REGLAGES }, create: { cle: CLE_REGLAGES, valeur: { ...r } }, update: { valeur: { ...r } } });
    await this.journal(user, "reglages", JSON.stringify(r));
    return r;
  }

  /** Un compteur du jour (visite de la page publique, installation sur l'écran d'accueil) : rien sur la personne. */
  async compter(cle: "visite" | "installation"): Promise<void> {
    const jour = jourIso(this.now());
    await this.prisma.compteurJour.upsert({ where: { jour_cle: { jour, cle } }, create: { jour, cle, n: 1 }, update: { n: { increment: 1 } } });
  }

  private async compteur(cle: string, de: Date, a: Date): Promise<number> {
    const r = await this.prisma.compteurJour.aggregate({ where: { cle, jour: { gte: jourIso(de), lt: jourIso(a) } }, _sum: { n: true } });
    return r._sum.n ?? 0;
  }

  /** Les entreprises des comptes de démonstration et du jeu de test : exclues de tous les chiffres. */
  private async factices(): Promise<string[]> {
    const m = await this.prisma.membership.findMany({ where: { user: { OR: emailsDemo() } }, select: { companyId: true } });
    return [...new Set(m.map((x) => x.companyId))];
  }

  private eurDeMicroUsd(micro: bigint | number | null): number {
    return (Number(micro ?? 0) / 1_000_000) * Number(this.config.aiCost.usdToEur);
  }

  // ---------------------------------------------------------------- le tableau

  async tableau(user: AuthenticatedUser) {
    await this.exiger(user);
    await this.journal(user, "acces");
    const maintenant = this.now();
    const mois = debutDuMois(maintenant);
    const moisPrec = debutDuMois(maintenant, -1);
    const exclus = await this.factices();
    const pasFactice = { notIn: exclus };
    const reglages = await this.reglages();
    const serie = this.sources.paiementSimule ? "TEST" : "F";

    // Les 4 gros chiffres.
    const actifs = async (de: Date, a: Date) => (await this.prisma.session.findMany({ where: { updatedAt: { gte: de, lt: a }, user: { memberships: { some: { companyId: pasFactice } } } }, distinct: ["userId"], select: { userId: true } })).length;
    const payants = async (de: Date, a: Date) => (await this.prisma.factureAbonnement.findMany({ where: { serie, emiseLe: { gte: de, lt: a }, companyId: pasFactice }, distinct: ["companyId"], select: { companyId: true } })).length;
    const revenu = async (de: Date, a: Date) => ((await this.prisma.factureAbonnement.aggregate({ where: { serie, emiseLe: { gte: de, lt: a }, companyId: pasFactice }, _sum: { montantHtCentimes: true } }))._sum.montantHtCentimes ?? 0) / 100;
    const coutIa = async (de: Date, a: Date) => this.eurDeMicroUsd((await this.prisma.aiExecution.aggregate({ where: { createdAt: { gte: de, lt: a } }, _sum: { costMicroUsd: true } }))._sum.costMicroUsd);
    const trenteJours = new Date(maintenant.getTime() - 30 * JOUR);
    const soixanteJours = new Date(maintenant.getTime() - 60 * JOUR);
    const [act, actP, pay, payP, rev, ia, iaP] = await Promise.all([
      actifs(trenteJours, maintenant),
      actifs(soixanteJours, trenteJours),
      payants(trenteJours, maintenant),
      payants(soixanteJours, trenteJours),
      revenu(mois, maintenant),
      coutIa(mois, maintenant),
      coutIa(moisPrec, mois),
    ]);

    // Le revenu mensuel récurrent (annuel ÷ 12) et la part d'abonnés annuels, à une date : les factures dont la période la
    // couvre, une par entreprise (la dernière), chacune à son prix ; un passage au prorata compte au prix de l'annuel.
    const prix = await this.sources.prixFormules();
    const mrrAu = async (d: Date) => {
      const f = await this.prisma.factureAbonnement.findMany({ where: { serie, companyId: pasFactice, periodeDebut: { lte: d }, periodeFin: { gt: d } }, orderBy: { rang: "desc" }, select: { companyId: true, formule: true, montantHtCentimes: true } });
      const vues = new Set<string>();
      const abonnes = f.flatMap((x) => {
        if (!x.companyId || vues.has(x.companyId)) return [];
        vues.add(x.companyId);
        const formule: Formule = x.formule === "mensuel" ? "mensuel" : "annuel";
        return [{ formule, htCentimes: x.formule === "bascule" ? prix.annuel : x.montantHtCentimes }];
      });
      return revenuMensuelRecurrent(abonnes);
    };
    const [mrr, mrrAvant] = await Promise.all([mrrAu(maintenant), mrrAu(new Date(mois.getTime() - 1))]);

    // Croissance.
    const inscriptions = async (de: Date, a: Date) => this.prisma.company.count({ where: { createdAt: { gte: de, lt: a }, id: pasFactice } });
    const entreprises = await this.prisma.company.findMany({ where: { id: pasFactice }, select: { id: true, name: true, abonnement: { select: { statut: true } }, memberships: { select: { user: { select: { lastSeenAt: true } } } } } });
    const etats = await Promise.all(entreprises.map(async (e) => ({ e, etat: await this.sources.etatAbonnement(e.id, maintenant).catch(() => ({ acces: "essai", essaiFinLe: null })) })));
    const enEssai = etats.filter((x) => x.etat.acces === "essai").length;
    const dejaPaye = new Set((await this.prisma.factureAbonnement.findMany({ where: { serie, companyId: pasFactice }, distinct: ["companyId"], select: { companyId: true } })).map((f) => f.companyId));
    const essaiFini = etats.filter((x) => x.etat.acces !== "essai" || dejaPaye.has(x.e.id)).length;

    // Fidélité.
    const resilies = await this.prisma.evenementAbonnement.count({ where: { type: "resilie", createdAt: { gte: mois }, companyId: pasFactice } });
    const derniereVisite = (e: (typeof entreprises)[number]) => Math.max(0, ...e.memberships.map((m) => m.user.lastSeenAt?.getTime() ?? 0));
    const aRisque = etats.filter((x) => (x.etat.acces === "essai" || x.etat.acces === "abonne") && derniereVisite(x.e) < trenteJours.getTime());
    const semaine = new Date(maintenant.getTime() + 7 * JOUR);
    const essaisSemaine = etats.filter((x) => x.etat.acces === "essai" && x.etat.essaiFinLe && x.etat.essaiFinLe <= semaine);
    const echecs = entreprises.filter((e) => e.abonnement?.statut === "echec").length;

    // Activité.
    const listes = await this.prisma.takeoff.count({ where: { createdAt: { gte: mois }, companyId: pasFactice } });
    const negoces = await this.prisma.compteNegoce.count();
    const grilles = await this.prisma.grilleNegoce.findMany({ where: { createdAt: { gte: soixanteJours } }, select: { deposeLe: true } });
    const commandes = (await this.prisma.choixArtisan.count({ where: { commandeLe: { gte: mois }, companyId: pasFactice } })) + (await this.prisma.commandeGarantie.count({ where: { createdAt: { gte: mois }, companyId: pasFactice } }));
    const economies = await this.sources.economies().catch(() => ({ total: 0, parCommande: null, cycles: 0 }));

    // IA, jour par jour (14 jours).
    const debut14 = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate() - 13));
    const execs = await this.prisma.aiExecution.findMany({ where: { createdAt: { gte: debut14 } }, select: { createdAt: true, inputTokens: true, outputTokens: true, cacheReadTokens: true, costMicroUsd: true, documentId: true, task: true } });
    const parJour = Array.from({ length: 14 }, (_, i) => {
      const j = jourIso(new Date(debut14.getTime() + i * JOUR));
      const du = execs.filter((x) => jourIso(x.createdAt) === j);
      return { jour: j, jetons: du.reduce((s, x) => s + x.inputTokens + x.outputTokens + x.cacheReadTokens, 0), euros: Math.round(du.reduce((s, x) => s + this.eurDeMicroUsd(x.costMicroUsd), 0) * 100) / 100 };
    });
    const devisDuMois = (await this.prisma.aiExecution.findMany({ where: { createdAt: { gte: mois }, task: "lecture_devis", documentId: { not: null } }, distinct: ["documentId"], select: { documentId: true } })).length;

    const apprentissage = await this.sources.apprentissage().catch(() => ({ aValider: [], tauxParMois: [] }));
    const acces = await this.prisma.journalAdmin.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { email: true, action: true, createdAt: true } });

    return {
      mode: this.sources.paiementSimule || this.sources.stripeDeTest ? "test" : "reel",
      /** La phrase du bandeau rouge du mode test, selon le paiement. */
      modeTexte: this.sources.paiementSimule ? "Mode test : les paiements sont simulés" : this.sources.stripeDeTest ? "Mode test : Stripe en mode test, aucune carte n'est débitée" : null,
      /** La carte « Démo » : en prévisualisation, même avec Stripe de test ; jamais en production. */
      demo: !!this.sources.demoPermise && (this.sources.paiementSimule || !!this.sources.stripeDeTest),
      chiffres: [
        { cle: "actifs", titre: "Utilisateurs actifs", valeur: String(act), detail: "sur 30 jours", fleche: flecheDe(act, actP) },
        { cle: "payants", titre: "Abonnés payants", valeur: String(pay), detail: this.sources.paiementSimule ? "paiements de test" : "sur 30 jours", fleche: flecheDe(pay, payP) },
        { cle: "revenu", titre: "Revenu mensuel récurrent", valeur: eurosEntiers(mrr.centimes / 100), detail: mrr.partAnnuels === null ? "HT, annuel ÷ 12" : `HT, annuel ÷ 12 · ${mrr.partAnnuels} % en annuel`, fleche: flecheDe(mrr.centimes, mrrAvant.centimes) },
        { cle: "ia", titre: "Coût IA du mois", valeur: eurosEntiers(ia), detail: "", fleche: flecheDe(Math.round(ia), Math.round(iaP), "bas") },
      ],
      croissance: { visites: await this.compteur("visite", mois, new Date(maintenant.getTime() + JOUR)), inscriptions: await inscriptions(mois, maintenant), inscriptionsAvant: await inscriptions(moisPrec, mois), installations: await this.compteur("installation", mois, new Date(maintenant.getTime() + JOUR)), essais: enEssai, conversion: taux(dejaPaye.size, essaiFini) },
      abonnes: { mensuels: mrr.mensuels, annuels: mrr.annuels, partAnnuels: mrr.partAnnuels, revenuMensuelRecurrent: mrr.centimes / 100, encaisseCeMois: rev },
      fidelite: { desabonnements: resilies, tauxDesabonnement: taux(resilies, payP || pay), aRisque: aRisque.length, essaisCetteSemaine: essaisSemaine.length, paiementsEchoues: echecs },
      activite: { listes, negoces, tauxReponse: taux(grilles.filter((g) => g.deposeLe).length, grilles.length), commandes, economiesTotales: eurosEntiers(economies.total) },
      ia: { parJour, coutMoyenParDevis: devisDuMois ? Math.round((ia / devisDuMois) * 100) / 100 : null, seuilJour: reglages.seuilIaJourEur },
      // La rentabilité du mois sur le revenu récurrent : un annuel encaissé d'un coup ne gonfle pas un seul mois.
      rentabilite: { revenu: mrr.centimes / 100, coutIa: Math.round(ia * 100) / 100, services: reglages.coutServicesMensuelEur, resultat: rentabilite(mrr.centimes / 100, ia, reglages.coutServicesMensuelEur) },
      apprentissage: { aValider: apprentissage.aValider.length, tauxDeCorrection: apprentissage.tauxParMois.at(-1)?.taux ?? null },
      reglages,
      acces: acces.map((a) => ({ qui: a.email, quoi: a.action, le: a.createdAt.toISOString() })),
    };
  }

  /** Le détail nominatif d'un chiffre, sur un clic volontaire : journalisé ; à l'écran seulement, jamais exporté. */
  async detail(user: AuthenticatedUser, quoi: "a_risque" | "essais_semaine" | "paiements_echoues") {
    await this.exiger(user);
    await this.journal(user, `detail:${quoi}`);
    const maintenant = this.now();
    const exclus = await this.factices();
    const entreprises = await this.prisma.company.findMany({ where: { id: { notIn: exclus } }, select: { id: true, name: true, abonnement: { select: { statut: true } }, memberships: { select: { user: { select: { lastSeenAt: true } } } } } });
    const lignes: { entreprise: string; info: string }[] = [];
    for (const e of entreprises) {
      if (quoi === "paiements_echoues") {
        if (e.abonnement?.statut === "echec") lignes.push({ entreprise: e.name, info: "paiement refusé" });
        continue;
      }
      const etat = await this.sources.etatAbonnement(e.id, maintenant);
      if (quoi === "essais_semaine" && etat.acces === "essai" && etat.essaiFinLe && etat.essaiFinLe.getTime() <= maintenant.getTime() + 7 * JOUR) {
        lignes.push({ entreprise: e.name, info: `essai fini le ${etat.essaiFinLe.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}` });
      }
      if (quoi === "a_risque" && (etat.acces === "essai" || etat.acces === "abonne")) {
        const vu = Math.max(0, ...e.memberships.map((m) => m.user.lastSeenAt?.getTime() ?? 0));
        if (vu < maintenant.getTime() - 30 * JOUR) lignes.push({ entreprise: e.name, info: vu ? `vu le ${new Date(vu).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}` : "jamais revenu" });
      }
    }
    return { quoi, lignes };
  }

  /** Chaque heure : le coût IA du jour au-dessus du seuil réglé → un e-mail aux admins, une fois par jour. */
  async alerteIa(): Promise<boolean> {
    const maintenant = this.now();
    const jour = jourIso(maintenant);
    const { seuilIaJourEur } = await this.reglages();
    const cout = this.eurDeMicroUsd((await this.prisma.aiExecution.aggregate({ where: { createdAt: { gte: new Date(`${jour}T00:00:00.000Z`) } }, _sum: { costMicroUsd: true } }))._sum.costMicroUsd);
    if (cout <= seuilIaJourEur) return false;
    const cle = `pilotage:alerte-ia:${jour}`;
    if (await this.prisma.parametreGroupe.findUnique({ where: { cle } })) return false;
    await this.prisma.parametreGroupe.create({ data: { cle, valeur: { cout } } });
    for (const to of this.config.groupe.admins) {
      await this.email.send({ to, subject: `${NOM_APP} : coût IA du jour au-dessus de ${eurosEntiers(seuilIaJourEur)}`, text: [`Le coût de l'IA aujourd'hui atteint ${cout.toFixed(2).replace(".", ",")} €, au-dessus du seuil de ${eurosEntiers(seuilIaJourEur)}.`, "", "Le détail jour par jour est dans le tableau de bord."].join("\n") }).catch(() => undefined);
    }
    return true;
  }
}
