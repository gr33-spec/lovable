import { droitsDe, formuleDuCompte, moisDAbonnement, payantOffertDansLaZone, phrasePlafondAtteint, phrasePreavis, verifierDroit, zoneDuCodePostal, MESSAGE_HORS_ZONE, PHRASE_ANALYSES_OFFERTES_UTILISEES, PLAFOND_IA_EUR_DEFAUT, type Droits, type FormuleOffre, type FormulePayante } from "@baticlair/domain";
import { CLE_PLAFONDS_IA } from "../../../platform/reglages/reglage-plafonds-ia.js";
import { signalerException } from "../../../platform/supervision/exceptions.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { DomainError } from "../../../platform/errors/domain-error.js";
import type { AbonnementService } from "../../abonnement/index.js";

/**
 * LES DROITS DE L'ARTISAN (Greg, 25 octobre 2026, recentrage) : gratuit ou payant, d'après l'abonnement (payé, en essai,
 * en grâce), la zone (le payant est offert tant qu'elle compte moins de `SEUIL_ZONE_ACTIVE` artisans actifs, puis 30 jours
 * de préavis) et les zones actives (les regroupements n'existent qu'à l'intérieur). Les règles sont dans le domaine
 * (`droitsDe`, `verifierDroit`) ; ici, la base : la zone de l'entreprise, ses artisans actifs, la date du seuil franchi.
 */
export interface ReglagesDroits {
  /** `null` : toutes les zones sont actives. */
  zonesActives: string[] | null;
  seuilZoneActive: number;
  lecturesGratuites: number;
  /** Les analyses offertes en tout à un compte gratuit (devis, photo et liste confondus ; 3, Greg, 15 novembre 2026). */
  lecturesIaGratuitTotal: number;
  /** Le taux de conversion des coûts (les appels sont comptés en dollars, le plafond se règle en euros). */
  usdToEur?: number;
  /** Au-delà de ce coût en un jour (euros), le compte est signalé à l'admin comme consommant anormalement. */
  alerteCompteJourEur?: number;
  /** Une analyse demande une adresse e-mail vérifiée (allumé quand un vrai fournisseur d'IA est branché : chaque appel coûte). */
  emailVerifieExige?: boolean;
}

export const PHRASE_EMAIL_A_VERIFIER = "Confirme d'abord ton adresse e-mail : on t'a envoyé un lien à l'inscription. Ensuite, tu pourras faire analyser tes documents.";



/** Un artisan actif : une entreprise de la zone qui a ouvert un chantier (hors démonstration) dans les 30 derniers jours. */
const FENETRE_ACTIF_MS = 30 * 86_400_000;

export class DroitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abonnement: Pick<AbonnementService, "etat" | "actif">,
    private readonly reglages: ReglagesDroits,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Achat groupé par métier (Greg, 27 octobre 2026, 2e message) : en mode automatique, plus d'essai ni de zone offerte ;
   * gratuit sans limite de temps (listes, envoi à ses négoces, achats du secteur), 3 lectures IA en tout ; l'abonnement
   * pour les achats groupés (le premier offert, vérifié par l'achat groupé).
   */
  private modeAuto: () => Promise<boolean> = async () => false;
  brancherModeAuto(f: () => Promise<boolean>): void {
    this.modeAuto = f;
  }

  /** Abonné payant (ou tout ouvert sans abonnement artisan) : ni l'essai ni la zone offerte. */
  async abonnePayant(companyId: string, maintenant = this.now()): Promise<boolean> {
    if (!this.abonnement.actif) return true;
    const etat = await this.abonnement.etat(companyId, maintenant);
    return etat.acces === "abonne" || etat.acces === "grace";
  }

  /** Le département de l'entreprise (son adresse), ou null. */
  async zoneDe(companyId: string): Promise<string | null> {
    const c = await this.prisma.company.findUnique({ where: { id: companyId }, select: { address: true } });
    return zoneDuCodePostal(c?.address ?? null);
  }

  zoneActive(zone: string | null): boolean {
    return !!zone && (this.reglages.zonesActives === null || this.reglages.zonesActives.includes(zone));
  }

  /** Les artisans actifs d'une zone (chantiers des 30 derniers jours, sans les comptes de démonstration). */
  async artisansActifs(zone: string, maintenant = this.now()): Promise<number> {
    const depuis = new Date(maintenant.getTime() - FENETRE_ACTIF_MS);
    const projets = await this.prisma.project.findMany({ where: { demo: false, createdAt: { gte: depuis } }, select: { companyId: true, company: { select: { address: true } } } });
    return new Set(projets.filter((p) => zoneDuCodePostal(p.company.address) === zone).map((p) => p.companyId)).size;
  }

  /** Le payant offert dans une zone ; la première fois que le seuil est atteint, la date est gardée (préavis de 30 jours). */
  async offreDeZone(zone: string | null, maintenant = this.now()): Promise<{ offert: boolean; preavisJusquau: Date | null }> {
    if (!zone) return { offert: false, preavisJusquau: null };
    const cle = `zone:${zone}:seuil_franchi`;
    const garde = await this.prisma.parametreGroupe.findUnique({ where: { cle } });
    let franchiLe = garde ? new Date(String(garde.valeur)) : null;
    if (!franchiLe) {
      const actifs = await this.artisansActifs(zone, maintenant);
      if (actifs >= this.reglages.seuilZoneActive) {
        franchiLe = maintenant;
        await this.prisma.parametreGroupe.upsert({ where: { cle }, create: { cle, valeur: maintenant.toISOString() }, update: {} });
      } else return payantOffertDansLaZone({ artisansActifs: actifs, seuilFranchiLe: null }, maintenant, this.reglages.seuilZoneActive);
    }
    return payantOffertDansLaZone({ artisansActifs: this.reglages.seuilZoneActive, seuilFranchiLe: franchiLe }, maintenant, this.reglages.seuilZoneActive);
  }

  /** Parcours e2e seulement (route de test) : l'essai du compte de cet e-mail s'arrête maintenant (comme « Finir l'essai » de la démo). */
  async finirEssaiDe(email: string, maintenant = this.now()): Promise<boolean> {
    const m = await this.prisma.membership.findFirst({ where: { role: "owner", user: { email: email.toLowerCase() } }, select: { companyId: true } });
    if (!m) return false;
    const cle = `abonnement:essai-fini:${m.companyId}`;
    await this.prisma.parametreGroupe.upsert({ where: { cle }, create: { cle, valeur: { le: maintenant.toISOString() } }, update: { valeur: { le: maintenant.toISOString() } } });
    return true;
  }

  /** Parcours e2e seulement (route de test) : la date à laquelle la zone a franchi le seuil, ou rien. */
  async fixerSeuilFranchi(zone: string, le: Date | null): Promise<void> {
    const cle = `zone:${zone}:seuil_franchi`;
    if (le === null) await this.prisma.parametreGroupe.deleteMany({ where: { cle } });
    else await this.prisma.parametreGroupe.upsert({ where: { cle }, create: { cle, valeur: le.toISOString() }, update: { valeur: le.toISOString() } });
  }

  /** Les droits de l'entreprise, avec ce qu'il faut pour l'écran (zone, préavis, lectures du mois). */
  async droits(companyId: string, maintenant = this.now(), zoneDuGeste?: string | null): Promise<Droits & { zone: string | null; zoneActive: boolean; preavis: string | null; lecturesCeMois: number }> {
    // `zoneDuGeste` : le département de la livraison d'un besoin, qui l'emporte sur celui de l'entreprise.
    const zone = zoneDuGeste ?? (await this.zoneDe(companyId));
    const [etat, offre, lectures] = await Promise.all([
      this.abonnement.actif ? this.abonnement.etat(companyId, maintenant) : Promise.resolve(null),
      this.offreDeZone(zone, maintenant),
      this.lecturesDuMois(companyId, maintenant),
    ]);
    // Sans abonnement artisan (`ABONNEMENT=off`), tout est ouvert : payant pour tous.
    const abonne = etat === null || etat.acces === "abonne" || etat.acces === "grace";
    const auto = await this.modeAuto();
    const d = droitsDe({ abonne, essai: !auto && etat?.acces === "essai", zoneOfferte: !auto && offre.offert, zoneActive: this.zoneActive(zone) }, { lecturesGratuites: this.reglages.lecturesGratuites });
    return { ...d, zone, zoneActive: this.zoneActive(zone), preavis: zone ? phrasePreavis(zone, offre.preavisJusquau) : null, lecturesCeMois: lectures };
  }

  /** Les lectures réussies du mois civil (heure de Paris), comptées comme le compteur des analyses. */
  async lecturesDuMois(companyId: string, maintenant = this.now()): Promise<number> {
    const mois = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" }).format(maintenant).slice(0, 7);
    return this.prisma.aiAnalysis.count({ where: { companyId, billable: true, billingMonth: mois } });
  }

  /** Le paywall du geste : 402 `abonnement_requis` avec la phrase, ou rien. */
  async exiger(companyId: string, geste: { type: "envoi"; negoces: number } | { type: "regroupement"; zone?: string | null }, maintenant = this.now()): Promise<void> {
    // Un besoin se regroupe dans le département de sa livraison (Greg, 27 octobre 2026 : refus « zone_inactive » pour une
    // entreprise sans adresse alors que la ville de livraison était tapée) ; sans livraison donnée, celui de l'entreprise.
    const d = await this.droits(companyId, maintenant, geste.type === "regroupement" ? geste.zone : undefined);
    const v = verifierDroit(d, geste.type === "envoi" ? geste : { type: "regroupement", zoneActive: d.zoneActive });
    if (v.ok) return;
    const { refus, phrase } = v as Extract<typeof v, { ok: false }>;
    if (refus === "zone") throw new DomainError("forbidden", phrase, { reason: "zone_inactive", refus, phrase, message: MESSAGE_HORS_ZONE });
    // Au-delà de 5 négoces, c'est une limite pour tous, jamais un paywall (Greg, 11 novembre 2026).
    if (refus === "negoces" || d.formule === "payant") throw new DomainError("validation_failed", phrase, { reason: refus, refus, phrase });
    throw new DomainError("abonnement_requis", phrase, { reason: refus, refus, phrase });
  }

  /**
   * LA FORMULE DU COMPTE (Greg, 15 novembre 2026) : Gratuit sans abonnement payé ; Pro ou Pro Max selon l'abonnement en
   * cours (en grâce compris). Null quand l'abonnement artisan est éteint (rien n'est limité).
   */
  async formule(companyId: string, maintenant = this.now()): Promise<FormuleOffre | null> {
    if (!this.abonnement.actif) return null;
    if (!(await this.abonnePayant(companyId, maintenant))) return "gratuit";
    const a = await this.prisma.abonnement.findUnique({ where: { companyId }, select: { formule: true } });
    return formuleDuCompte({ actif: true, formule: a?.formule ?? null });
  }

  /** Les scans de liste réussis (journal des appels IA), depuis toujours : ils comptent dans les analyses offertes. */
  private scansFaits(companyId: string): Promise<number> {
    return this.prisma.aiExecution.count({ where: { companyId, task: "lecture_liste", status: "success" } });
  }

  /** Les plafonds cachés (euros par mois d'abonnement) : ceux réglés dans l'admin, sinon 5 € et 20 €. */
  async plafonds(): Promise<Record<FormulePayante, number>> {
    const garde = await this.prisma.parametreGroupe.findUnique({ where: { cle: CLE_PLAFONDS_IA } });
    const v = (garde?.valeur ?? {}) as Partial<Record<FormulePayante, unknown>>;
    const ok = (x: unknown, defaut: number) => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : defaut);
    return { pro: ok(v.pro, PLAFOND_IA_EUR_DEFAUT.pro), promax: ok(v.promax, PLAFOND_IA_EUR_DEFAUT.promax) };
  }

  /** L'alerte par e-mail à l'admin (branchée par le module) ; sans branchement, seule la file d'exceptions est écrite. */
  private alerte: (message: string) => void = () => undefined;
  brancherAlerte(f: (message: string) => void): void {
    this.alerte = f;
  }

  /** Un cas remonte à l'admin UNE fois : la file d'exceptions, et un e-mail d'alerte la première fois seulement. Jamais bloquant. */
  private async signaler(cle: string, titre: string, detail: string, companyId: string): Promise<void> {
    try {
      const deja = await this.prisma.exceptionSupervision.findUnique({ where: { cle: `autre:${cle}` }, select: { cle: true } });
      await signalerException(this.prisma, { type: "autre", cle, titre, detail, companyId, lien: `/admin/artisans/${companyId}` });
      // Jamais le nom d'une personne ni d'une entreprise dans l'e-mail : la fiche se retrouve dans l'admin.
      if (!deja) this.alerte(`${titre}. ${detail} Fiche : admin › Artisans.`);
    } catch {
      // La supervision ne bloque jamais le parcours.
    }
  }

  /** Ce que les appels IA du compte ont coûté depuis `depuis`, en euros. */
  private async coutEur(companyId: string, depuis: Date): Promise<number> {
    const agg = await this.prisma.aiExecution.aggregate({ where: { companyId, createdAt: { gte: depuis } }, _sum: { costMicroUsd: true } });
    return (Number(agg._sum.costMicroUsd ?? 0) / 1_000_000) * (this.reglages.usdToEur ?? 0.92);
  }

  /**
   * LE PLAFOND CACHÉ D'UN ABONNÉ (Greg, 15 novembre 2026) : en euros, par mois d'abonnement. Rien n'est dit avant ;
   * atteint, l'analyse est refusée AVANT tout appel (rien n'est dépensé) avec le seul message prévu, et l'admin est
   * prévenu une fois par mois et par compte. Rend null quand rien n'est plafonné (compte gratuit, abonnement éteint).
   */
  async etatPlafond(companyId: string, maintenant = this.now()): Promise<{ atteint: boolean; phrase: string; renouvellement: Date } | null> {
    if (!(await this.modeAuto())) return null;
    const f = await this.formule(companyId, maintenant);
    if (!f || f === "gratuit") return null;
    const a = await this.prisma.abonnement.findUnique({ where: { companyId }, select: { periodeDebut: true } });
    const mois = moisDAbonnement(a?.periodeDebut ?? null, maintenant);
    const [cout, plafonds] = await Promise.all([this.coutEur(companyId, mois.debut), this.plafonds()]);
    return { atteint: cout >= plafonds[f], phrase: phrasePlafondAtteint(f, mois.fin), renouvellement: mois.fin };
  }

  /** Refuse l'analyse d'un abonné dont le plafond du mois est atteint ; signale aussi un compte qui consomme anormalement. */
  async verifierPlafond(companyId: string, maintenant = this.now()): Promise<void> {
    await this.surveiller(companyId, maintenant);
    const e = await this.etatPlafond(companyId, maintenant);
    if (!e?.atteint) return;
    await this.signaler(`plafond-ia:${companyId}:${e.renouvellement.toISOString().slice(0, 10)}`, "Un abonné a atteint son plafond d'analyses du mois", `Ses analyses sont refusées jusqu'au ${e.renouvellement.toISOString().slice(0, 10)} ; rien n'est dépensé au-delà. Le plafond se règle dans Réglages.`, companyId);
    throw new DomainError("abonnement_requis", "Monthly AI cap reached", { action: "lecture", refus: "plafond", phrase: e.phrase });
  }

  /** Un compte qui dépense en un jour plus que le seuil (1 € par défaut) remonte à l'admin, une fois par jour. Ne bloque jamais. */
  private async surveiller(companyId: string, maintenant: Date): Promise<void> {
    const seuil = this.reglages.alerteCompteJourEur ?? 1;
    const jour = maintenant.toISOString().slice(0, 10);
    const cout = await this.coutEur(companyId, new Date(`${jour}T00:00:00Z`)).catch(() => 0);
    if (cout < seuil) return;
    await this.signaler(`conso-ia:${companyId}:${jour}`, "Un compte consomme anormalement des analyses", `${cout.toFixed(2).replace(".", ",")} € d'analyses le ${jour} (seuil : ${String(seuil).replace(".", ",")} € par jour et par compte).`, companyId);
  }

  /** Garde-fou : pas d'analyse payante pour une adresse e-mail jamais vérifiée (comptes créés à la chaîne). */
  async verifierEmail(userId: string | null): Promise<void> {
    if (!this.reglages.emailVerifieExige || !userId) return;
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
    if (u && !u.emailVerified) throw new DomainError("validation_failed", "Email not verified", { reason: "email_non_verifie", phrase: PHRASE_EMAIL_A_VERIFIER });
  }

  /** L'assistant connecté appelle-t-il le modèle pour ce compte ? Sinon le code seul répond (rien n'est refusé à l'écran). */
  async assistantPermis(companyId: string, userId: string | null, maintenant = this.now()): Promise<boolean> {
    try {
      await this.verifierEmail(userId);
    } catch {
      return false;
    }
    if (!(await this.modeAuto())) return true;
    const f = await this.formule(companyId, maintenant);
    if (!f) return true;
    if (f !== "gratuit") return !(await this.etatPlafond(companyId, maintenant))?.atteint;
    const l = await this.limiteGratuite(companyId);
    return !l || (await this.analysesFaites(companyId)) < l.limite;
  }

  /** Le scan d'une liste est-il permis ? Compte gratuit : il compte dans les analyses offertes ; abonné : le plafond caché. */
  async verifierScan(companyId: string, maintenant = this.now()): Promise<void> {
    if (!(await this.modeAuto())) return;
    const f = await this.formule(companyId, maintenant);
    if (!f) return;
    if (f !== "gratuit") return this.verifierPlafond(companyId, maintenant);
    const l = await this.limiteGratuite(companyId);
    if (l && (await this.analysesFaites(companyId)) >= l.limite) throw new DomainError("abonnement_requis", "Free analyses used", { action: "scan", refus: "scans", phrase: PHRASE_ANALYSES_OFFERTES_UTILISEES });
  }

  /** Branché par le compteur : les analyses de documents déjà décomptées, depuis toujours. */
  private analysesFaites: (companyId: string) => Promise<number> = async () => 0;
  brancherAnalysesFaites(f: (companyId: string) => Promise<number>): void {
    this.analysesFaites = f;
  }

  /**
   * Pour le compteur des analyses : un compte gratuit a `lecturesIaGratuitTotal` analyses EN TOUT, scans de liste compris
   * (la limite rendue est ce qui reste aux analyses de documents) ; un abonné n'a pas de nombre (plafond caché) : null.
   */
  async limiteGratuite(companyId: string): Promise<{ limite: number; phrase: (n: number) => string; total?: boolean } | null> {
    if (await this.modeAuto()) {
      const f = await this.formule(companyId);
      if (f !== "gratuit") return null;
      return { limite: Math.max(0, this.reglages.lecturesIaGratuitTotal - (await this.scansFaits(companyId))), total: true, phrase: () => PHRASE_ANALYSES_OFFERTES_UTILISEES };
    }
    const d = await this.droits(companyId);
    if (d.lecturesParMois === null) return null;
    return { limite: d.lecturesParMois, phrase: (n) => `Tu as utilisé tes ${n} lectures gratuites du mois. Passe à l'abonnement pour lire tous tes devis.` };
  }

  /** Pour l'abonnement : le payant offert dans la zone de l'entreprise. */
  async offertPour(companyId: string): Promise<boolean> {
    return (await this.offreDeZone(await this.zoneDe(companyId))).offert;
  }
}
