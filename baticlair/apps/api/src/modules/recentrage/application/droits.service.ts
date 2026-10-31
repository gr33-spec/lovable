import { droitsDe, formuleDuCompte, payantOffertDansLaZone, phrasePaywallQuota, phrasePreavis, quotasDe, verifierDroit, zoneDuCodePostal, MESSAGE_HORS_ZONE, NEGOCES_PAR_DEMANDE_PAYANT, OFFRES, PHRASE_LECTURES_EPUISEES, type Droits, type FormuleOffre, type Quotas } from "@baticlair/domain";
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
  /** Achat groupé par métier (27 octobre 2026, point 24) : les lectures IA offertes en tout, sans abonnement. */
  lecturesIaGratuitTotal: number;
}

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
    // Gratuit, l'artisan envoie sa liste à ses négoces (point 23).
    if (auto && d.formule === "gratuit") d.negocesParDemande = NEGOCES_PAR_DEMANDE_PAYANT;
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
    // Au-delà de 5 négoces en payant, c'est une limite, pas un paywall.
    if (d.formule === "payant") throw new DomainError("validation_failed", phrase, { reason: refus, refus, phrase });
    throw new DomainError("abonnement_requis", phrase, { reason: refus, refus, phrase });
  }

  /**
   * LA FORMULE DU COMPTE (Greg, 30 octobre 2026, décision 2) : Découverte sans abonnement payé ; Essentiel ou Pro selon
   * l'abonnement en cours (en grâce compris). Null quand l'abonnement artisan est éteint (rien n'est limité).
   */
  async formule(companyId: string, maintenant = this.now()): Promise<FormuleOffre | null> {
    if (!this.abonnement.actif) return null;
    if (!(await this.abonnePayant(companyId, maintenant))) return "decouverte";
    const a = await this.prisma.abonnement.findUnique({ where: { companyId }, select: { formule: true } });
    return formuleDuCompte({ actif: true, formule: a?.formule ?? null });
  }

  /** Les crédits de la formule : la limite, et ce qui est déjà pris (le mois en cours pour Essentiel et Pro, tout pour Découverte). */
  private limites(formule: FormuleOffre): { analyses: number; scans: number } {
    return formule === "decouverte" ? { analyses: this.reglages.lecturesIaGratuitTotal, scans: OFFRES.decouverte.scans } : { analyses: OFFRES[formule].analyses, scans: OFFRES[formule].scans };
  }

  /** Les scans de liste réussis (journal des appels IA), depuis le début du mois ou depuis toujours. */
  private async scansFaits(companyId: string, parMois: boolean, maintenant: Date): Promise<number> {
    const debut = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1));
    return this.prisma.aiExecution.count({ where: { companyId, task: "lecture_liste", status: "success", ...(parMois ? { createdAt: { gte: debut } } : {}) } });
  }

  /** Les quotas d'IA du compte (mode automatique), pour la jauge ; null quand rien n'est limité. */
  async quotas(companyId: string, analysesFaites: (parMois: boolean) => Promise<number>, maintenant = this.now()): Promise<Quotas | null> {
    if (!(await this.modeAuto())) return null;
    const f = await this.formule(companyId, maintenant);
    if (!f) return null;
    const parMois = OFFRES[f].parMois;
    const q = quotasDe(f, { analyses: await analysesFaites(parMois), scans: await this.scansFaits(companyId, parMois, maintenant) });
    const l = this.limites(f);
    const recale = (c: Quotas["analyses"], limite: number) => ({ limite, utilisees: c.utilisees, restantes: Math.max(0, limite - c.utilisees) });
    return { ...q, analyses: recale(q.analyses, l.analyses), scans: recale(q.scans, l.scans) };
  }

  /** Le scan d'une liste est-il permis ? Refusé quand le quota de la formule est pris (rien n'est dépensé). */
  async verifierScan(companyId: string, maintenant = this.now()): Promise<void> {
    if (!(await this.modeAuto())) return;
    const f = await this.formule(companyId, maintenant);
    if (!f) return;
    const faits = await this.scansFaits(companyId, OFFRES[f].parMois, maintenant);
    if (faits >= this.limites(f).scans) throw new DomainError("abonnement_requis", "Scan quota reached", { action: "scan", refus: "scans", phrase: phrasePaywallQuota(f, "scans") });
  }

  /** Pour le compteur des analyses : la limite de la formule (Découverte en tout, Essentiel et Pro par mois), ou null. */
  async limiteGratuite(companyId: string): Promise<{ limite: number; phrase: (n: number) => string; total?: boolean } | null> {
    if (await this.modeAuto()) {
      const f = await this.formule(companyId);
      if (!f) return null;
      if (f === "decouverte") return { limite: this.limites(f).analyses, total: true, phrase: () => PHRASE_LECTURES_EPUISEES };
      return { limite: this.limites(f).analyses, total: false, phrase: () => phrasePaywallQuota(f, "analyses") };
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
