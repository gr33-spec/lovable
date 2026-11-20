import { formuleDe } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";

/**
 * L'ESPACE ADMIN, VUE GLOBALE (Greg, 14 novembre 2026 : « ultra simple et intuitive, pas une usine à gaz […] un écran
 * d'accueil, tout accessible en 3 clics maximum »). LECTURE SEULE : ce service ne modifie rien. RGPD : seulement ce qui sert
 * au service (entreprise, formule, activité en NOMBRES, connexions) ; jamais le détail d'un chantier (ni ligne, ni client, ni
 * prix) ; chaque consultation d'une liste ou d'une fiche est journalisée par le contrôleur.
 */
const JOUR = 86_400_000;
const debutDuMois = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const moisAvant = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
const PAYANT = ["actif", "echec"];

/** Le département lu dans l'adresse (code postal), sinon rien : jamais deviné. */
export function departementDe(adresse: string | null | undefined): string | null {
  const m = /\b(\d{2})\d{3}\b/.exec(adresse ?? "");
  return m ? m[1]! : null;
}

export interface CarteAccueil {
  cle: "inscrits" | "payants" | "gratuit" | "revenus" | "inscriptions_semaine" | "negoces";
  valeur: number;
  /** La valeur de comparaison (début du mois, mois dernier ou semaine dernière) et ce qu'elle est. */
  avant: number;
  reference: string;
  lien: string;
}
export interface Probleme {
  type: "signalement" | "paiement_refuse" | "erreur_serveur" | "negoce_a_verifier";
  nombre: number;
  lien: string;
}

export interface FiltresArtisans {
  q?: string | undefined;
  metier?: string | undefined;
  departement?: string | undefined;
  formule?: string | undefined;
  promo?: string | undefined;
}

/** Une forme de correction : le geste, la ligne proposée et la ligne corrigée les plus vues, combien de fois, chez combien d'entreprises. */
export interface CorrectionFrequente {
  geste: string;
  cause: string | null;
  metier: string | null;
  fois: number;
  entreprises: number;
  proposee: string | null;
  corrigee: string | null;
  dernierLe: string;
}

export class AdminVueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Les comptes de visite de la démonstration ne comptent jamais. */
  private readonly vrais = { NOT: { memberships: { some: { user: { email: { endsWith: "@demo.mobiiz.fr" } } } } } };

  /**
   * LES CORRECTIONS LES PLUS FRÉQUENTES (Greg, 16 novembre 2026 : « enregistre les corrections que les artisans font sur
   * les listes (ligne proposée, ligne corrigée), pour améliorer les règles et le prompt. Montre-moi les corrections les
   * plus fréquentes dans l'admin »). Le journal existe déjà (`correction_event`, jamais réécrit) ; ici, ses gestes des 90
   * derniers jours sont rangés par forme (`patternKey` : le geste, sa cause, la famille, les premiers mots), avec la ligne
   * proposée et la ligne corrigée les plus souvent vues. Des matériaux seulement : jamais le nom d'une entreprise, d'un
   * chantier ni d'un client (les lignes sont anonymisées à la lecture). Les confirmations (« C'est bon ») ne comptent pas.
   */
  async correctionsFrequentes(maintenant = new Date()): Promise<{ depuis: string; total: number; corrections: CorrectionFrequente[] }> {
    const depuis = new Date(maintenant.getTime() - 90 * 86_400_000);
    const gestes = await this.prisma.correctionEvent.findMany({
      where: { createdAt: { gte: depuis }, action: { in: ["edit", "delete", "add"] } },
      select: { companyId: true, action: true, cause: true, before: true, after: true, context: true, patternKey: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    const ligne = (x: unknown): string | null => {
      const l = x as { designation?: string; quantity?: string | null; unit?: string | null } | null;
      if (!l?.designation) return null;
      return [l.designation.slice(0, 120), [l.quantity, l.unit].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
    };
    const formes = new Map<string, { action: string; cause: string | null; metier: string | null; fois: number; entreprises: Set<string>; paires: Map<string, { proposee: string | null; corrigee: string | null; fois: number }>; dernierLe: Date }>();
    for (const g of gestes) {
      const f = formes.get(g.patternKey) ?? { action: g.action, cause: g.cause, metier: ((g.context as { metier?: string } | null)?.metier ?? null) as string | null, fois: 0, entreprises: new Set<string>(), paires: new Map(), dernierLe: g.createdAt };
      f.fois++;
      f.entreprises.add(g.companyId);
      const [proposee, corrigee] = [ligne(g.before), ligne(g.after)];
      const cle = `${proposee ?? ""}→${corrigee ?? ""}`;
      const paire = f.paires.get(cle) ?? { proposee, corrigee, fois: 0 };
      paire.fois++;
      f.paires.set(cle, paire);
      formes.set(g.patternKey, f);
    }
    const corrections = [...formes.values()]
      .sort((a, b) => b.fois - a.fois || b.entreprises.size - a.entreprises.size)
      .slice(0, 40)
      .map((f) => {
        const exemple = [...f.paires.values()].sort((a, b) => b.fois - a.fois)[0]!;
        return { geste: f.action, cause: f.cause, metier: f.metier, fois: f.fois, entreprises: f.entreprises.size, proposee: exemple.proposee, corrigee: exemple.corrigee, dernierLe: f.dernierLe.toISOString() };
      });
    return { depuis: depuis.toISOString(), total: gestes.length, corrections };
  }

  async accueil(): Promise<{ cartes: CarteAccueil[]; problemes: Probleme[] }> {
    const maintenant = this.now();
    const mois = debutDuMois(maintenant);
    const moisDernier = moisAvant(maintenant);
    const semaine = new Date(maintenant.getTime() - 7 * JOUR);
    const semaineAvant = new Date(maintenant.getTime() - 14 * JOUR);
    const p = this.prisma;
    const [inscrits, inscritsAvant, payants, payantsAvant, revenus, revenusAvant, inscSemaine, inscSemaineAvant, negoces, negocesAvant, signalements, echecs, erreurs, aVerifier] = await Promise.all([
      p.company.count({ where: this.vrais }),
      p.company.count({ where: { ...this.vrais, createdAt: { lt: mois } } }),
      p.abonnement.count({ where: { statut: { in: PAYANT } } }),
      // Les abonnés d'avant ce mois : ceux qui ont payé une facture le mois dernier.
      p.factureAbonnement.findMany({ where: { emiseLe: { gte: moisDernier, lt: mois }, companyId: { not: null } }, distinct: ["companyId"], select: { companyId: true } }).then((x) => x.length),
      p.factureAbonnement.aggregate({ where: { emiseLe: { gte: mois } }, _sum: { montantHtCentimes: true } }).then((x) => (x._sum.montantHtCentimes ?? 0) / 100),
      p.factureAbonnement.aggregate({ where: { emiseLe: { gte: moisDernier, lt: mois } }, _sum: { montantHtCentimes: true } }).then((x) => (x._sum.montantHtCentimes ?? 0) / 100),
      p.company.count({ where: { ...this.vrais, createdAt: { gte: semaine } } }),
      p.company.count({ where: { ...this.vrais, createdAt: { gte: semaineAvant, lt: semaine } } }),
      p.compteNegoce.count({ where: { inscritLe: { not: null } } }),
      p.compteNegoce.count({ where: { inscritLe: { not: null, lt: mois } } }),
      p.signalement.count({ where: { statut: "nouveau" } }),
      p.abonnement.count({ where: { statut: "echec" } }),
      p.exceptionSupervision.count({ where: { statut: "ouverte", dernierLe: { gte: new Date(maintenant.getTime() - JOUR) } } }),
      p.compteNegoce.count({ where: { inscritLe: { not: null }, verification: "a_verifier" } }),
    ]);
    const cartes: CarteAccueil[] = [
      { cle: "inscrits", valeur: inscrits, avant: inscritsAvant, reference: "depuis le début du mois", lien: "/admin/artisans" },
      { cle: "payants", valeur: payants, avant: payantsAvant, reference: "par rapport au mois dernier", lien: "/admin/artisans?formule=payant" },
      { cle: "gratuit", valeur: Math.max(0, inscrits - payants), avant: Math.max(0, inscritsAvant - payantsAvant), reference: "depuis le début du mois", lien: "/admin/artisans?formule=gratuit" },
      { cle: "revenus", valeur: revenus, avant: revenusAvant, reference: "par rapport au mois dernier", lien: "/admin/artisans?formule=payant" },
      { cle: "inscriptions_semaine", valeur: inscSemaine, avant: inscSemaineAvant, reference: "par rapport à la semaine d'avant", lien: "/admin/artisans?recents=1" },
      { cle: "negoces", valeur: negoces, avant: negocesAvant, reference: "depuis le début du mois", lien: "/admin/negoces" },
    ];
    const problemes: Probleme[] = (
      [
        { type: "signalement", nombre: signalements, lien: "/admin/signalements" },
        { type: "paiement_refuse", nombre: echecs, lien: "/admin/artisans?formule=echec" },
        { type: "erreur_serveur", nombre: erreurs, lien: "/admin/supervision" },
        { type: "negoce_a_verifier", nombre: aVerifier, lien: "/admin/negoces?verifie=non" },
      ] as Probleme[]
    ).filter((x) => x.nombre > 0);
    return { cartes, problemes };
  }

  private async dernieresConnexions(companyIds: string[]): Promise<Map<string, Date>> {
    if (companyIds.length === 0) return new Map();
    const membres = await this.prisma.membership.findMany({ where: { companyId: { in: companyIds } }, select: { companyId: true, userId: true } });
    const sessions = await this.prisma.session.groupBy({ by: ["userId"], where: { userId: { in: membres.map((m) => m.userId) } }, _max: { updatedAt: true } });
    const parUser = new Map(sessions.map((s) => [s.userId, s._max.updatedAt]));
    const sortie = new Map<string, Date>();
    for (const m of membres) {
      const d = parUser.get(m.userId);
      if (d && (!sortie.has(m.companyId) || sortie.get(m.companyId)! < d)) sortie.set(m.companyId, d);
    }
    return sortie;
  }

  async artisans(f: FiltresArtisans & { recents?: boolean } = {}) {
    const lignes = await this.prisma.company.findMany({
      where: { ...this.vrais, ...(f.recents ? { createdAt: { gte: new Date(this.now().getTime() - 7 * JOUR) } } : {}) },
      orderBy: { createdAt: "desc" },
      take: 2000,
      select: { id: true, name: true, trades: true, address: true, createdAt: true, siretVerifieLe: true, abonnement: { select: { statut: true, formule: true, periodicite: true, codePromo: true } } },
    });
    const connexions = await this.dernieresConnexions(lignes.map((l) => l.id));
    const q = (f.q ?? "").trim().toLowerCase();
    const items = lignes
      .map((c) => {
        const payant = !!c.abonnement && PAYANT.includes(c.abonnement.statut);
        return {
          id: c.id,
          entreprise: c.name,
          metiers: c.trades,
          departement: departementDe(c.address),
          formule: payant ? formuleDe(c.abonnement!.formule) : "gratuit",
          paiementRefuse: c.abonnement?.statut === "echec",
          codePromo: c.abonnement?.codePromo ?? null,
          inscritLe: c.createdAt.toISOString(),
          derniereConnexion: connexions.get(c.id)?.toISOString() ?? null,
          verifie: c.siretVerifieLe !== null,
        };
      })
      .filter((c) => !q || c.entreprise.toLowerCase().includes(q) || (c.codePromo ?? "").toLowerCase().includes(q) || (c.departement ?? "") === q)
      .filter((c) => !f.metier || c.metiers.includes(f.metier))
      .filter((c) => !f.departement || c.departement === f.departement)
      .filter((c) => !f.promo || (c.codePromo ?? "").toLowerCase() === f.promo.toLowerCase())
      .filter((c) => !f.formule || (f.formule === "payant" ? c.formule !== "gratuit" : f.formule === "echec" ? c.paiementRefuse : c.formule === f.formule));
    return { total: items.length, items: items.slice(0, 500) };
  }

  /** Les demandes de prix reçues par un négoce (par son e-mail, dans les carnets des artisans) et celles où il a répondu. */
  private async reponsesParEmail(emails: string[]): Promise<Map<string, { recues: number; repondues: number }>> {
    const sortie = new Map<string, { recues: number; repondues: number }>();
    if (emails.length === 0) return sortie;
    const fiches = await this.prisma.supplier.findMany({ where: { email: { in: emails, mode: "insensitive" } }, select: { id: true, email: true } });
    const parFiche = new Map(fiches.map((s) => [s.id, s.email.toLowerCase()]));
    const envois = await this.prisma.priceRequestRecipient.findMany({ where: { supplierId: { in: fiches.map((s) => s.id) }, sentAt: { not: null } }, select: { supplierId: true, status: true, reponduLe: true } });
    for (const e of envois) {
      const email = parFiche.get(e.supplierId)!;
      const x = sortie.get(email) ?? { recues: 0, repondues: 0 };
      x.recues++;
      if (e.reponduLe || e.status === "received") x.repondues++;
      sortie.set(email, x);
    }
    return sortie;
  }

  async negoces(f: { q?: string | undefined; verifie?: string | undefined; famille?: string | undefined } = {}) {
    const comptes = await this.prisma.compteNegoce.findMany({ where: { inscritLe: { not: null } }, orderBy: { inscritLe: "desc" }, take: 2000, select: { id: true, enseigne: true, email: true, familles: true, generaliste: true, departements: true, verification: true, derniereConnexionLe: true, inscritLe: true } });
    const reponses = await this.reponsesParEmail(comptes.map((c) => c.email));
    const q = (f.q ?? "").trim().toLowerCase();
    const items = comptes
      .map((c) => {
        const r = reponses.get(c.email.toLowerCase()) ?? { recues: 0, repondues: 0 };
        return {
          id: c.id,
          nom: c.enseigne,
          familles: c.generaliste ? ["generaliste", ...c.familles] : c.familles,
          zone: c.departements,
          verifie: (c.verification ?? "valide") === "valide",
          demandesRecues: r.recues,
          tauxReponse: r.recues > 0 ? Math.round((r.repondues / r.recues) * 100) : null,
          derniereConnexion: c.derniereConnexionLe?.toISOString() ?? null,
          inscritLe: c.inscritLe?.toISOString() ?? null,
        };
      })
      .filter((c) => !q || c.nom.toLowerCase().includes(q) || c.zone.includes(q))
      .filter((c) => !f.verifie || (f.verifie === "oui") === c.verifie)
      .filter((c) => !f.famille || c.familles.includes(f.famille));
    return { total: items.length, items: items.slice(0, 500) };
  }

  /** La fiche d'un artisan : infos, abonnement, activité en NOMBRES, connexions. Jamais le contenu d'un chantier. */
  async ficheArtisan(id: string) {
    const c = await this.prisma.company.findUnique({
      where: { id },
      select: { id: true, name: true, trades: true, address: true, siret: true, siretVerifieLe: true, phone: true, contactEmail: true, prenom: true, createdAt: true, abonnement: { select: { statut: true, formule: true, periodicite: true, periodeFin: true, echecLe: true, resiliationDemandeeLe: true, codePromo: true, createdAt: true } }, memberships: { select: { role: true, user: { select: { id: true, name: true, email: true, createdAt: true } } } } },
    });
    if (!c) return null;
    const userIds = c.memberships.map((m) => m.user.id);
    const [listes, demandes, demandesEnvoyees, besoinsGroupes, negoces, factures, sessions] = await Promise.all([
      this.prisma.project.count({ where: { companyId: id } }),
      this.prisma.priceRequest.count({ where: { companyId: id } }),
      this.prisma.priceRequestRecipient.count({ where: { priceRequest: { companyId: id }, sentAt: { not: null } } }),
      this.prisma.besoinGroupeV1.count({ where: { companyId: id } }),
      this.prisma.supplier.count({ where: { companyId: id, archivedAt: null } }),
      this.prisma.factureAbonnement.findMany({ where: { companyId: id }, orderBy: { emiseLe: "desc" }, take: 12, select: { numero: true, emiseLe: true, montantHtCentimes: true, formule: true } }),
      this.prisma.session.findMany({ where: { userId: { in: userIds } }, orderBy: { updatedAt: "desc" }, take: 15, select: { createdAt: true, updatedAt: true } }),
    ]);
    const payant = !!c.abonnement && PAYANT.includes(c.abonnement.statut);
    return {
      id: c.id,
      infos: { entreprise: c.name, metiers: c.trades, departement: departementDe(c.address), adresse: c.address, siret: c.siret, verifie: c.siretVerifieLe !== null, telephone: c.phone, email: c.contactEmail ?? c.memberships[0]?.user.email ?? null, prenom: c.prenom, inscritLe: c.createdAt.toISOString(), comptes: c.memberships.map((m) => ({ nom: m.user.name, email: m.user.email, role: m.role })) },
      abonnement: {
        formule: payant ? formuleDe(c.abonnement!.formule) : "gratuit",
        periodicite: payant ? c.abonnement!.periodicite : null,
        statut: c.abonnement?.statut ?? "aucun",
        periodeFin: c.abonnement?.periodeFin?.toISOString() ?? null,
        paiementRefuseLe: c.abonnement?.statut === "echec" ? (c.abonnement.echecLe?.toISOString() ?? null) : null,
        resiliationDemandeeLe: c.abonnement?.resiliationDemandeeLe?.toISOString() ?? null,
        codePromo: c.abonnement?.codePromo ?? null,
        factures: factures.map((x) => ({ numero: x.numero, emiseLe: x.emiseLe.toISOString(), ht: x.montantHtCentimes / 100, formule: x.formule })),
      },
      activite: { listes, demandes, demandesEnvoyees, besoinsGroupes, negoces },
      connexions: sessions.map((s) => ({ debut: s.createdAt.toISOString(), derniereActivite: s.updatedAt.toISOString() })),
    };
  }

  async ficheNegoce(id: string) {
    const c = await this.prisma.compteNegoce.findUnique({ where: { id }, select: { id: true, enseigne: true, email: true, siret: true, telephone: true, raisonSociale: true, familles: true, generaliste: true, departements: true, verification: true, inscritLe: true, invitationLe: true, conditionsAccepteesLe: true, conditionsVersion: true, derniereConnexionLe: true, desabonneLe: true, valideParAdminLe: true } });
    if (!c) return null;
    const r = (await this.reponsesParEmail([c.email])).get(c.email.toLowerCase()) ?? { recues: 0, repondues: 0 };
    const carnets = await this.prisma.supplier.count({ where: { email: { equals: c.email, mode: "insensitive" }, archivedAt: null } });
    return {
      id: c.id,
      infos: { nom: c.enseigne, raisonSociale: c.raisonSociale, email: c.email, telephone: c.telephone, siret: c.siret, familles: c.generaliste ? ["generaliste", ...c.familles] : c.familles, zone: c.departements, verifie: (c.verification ?? "valide") === "valide", verification: c.verification ?? "valide", inscritLe: c.inscritLe?.toISOString() ?? null, inviteLe: c.invitationLe?.toISOString() ?? null, conditions: c.conditionsAccepteesLe ? { le: c.conditionsAccepteesLe.toISOString(), version: c.conditionsVersion } : null, desabonneLe: c.desabonneLe?.toISOString() ?? null },
      abonnement: { formule: "gratuit" },
      activite: { demandesRecues: r.recues, reponses: r.repondues, tauxReponse: r.recues > 0 ? Math.round((r.repondues / r.recues) * 100) : null, artisansQuiLOnt: carnets },
      connexions: c.derniereConnexionLe ? [{ debut: c.derniereConnexionLe.toISOString(), derniereActivite: c.derniereConnexionLe.toISOString() }] : [],
    };
  }

  /** Qui utilise un code promo (Greg, 14 novembre 2026 : « FONDATEUR […] affiche qui l'utilise »). */
  async codesPromo() {
    const lignes = await this.prisma.abonnement.findMany({ where: { codePromo: { not: null } }, orderBy: { createdAt: "desc" }, select: { codePromo: true, statut: true, formule: true, createdAt: true, company: { select: { id: true, name: true } } } });
    const parCode = new Map<string, { code: string; utilisateurs: { id: string; entreprise: string; formule: string; statut: string; depuis: string }[] }>();
    for (const l of lignes) {
      const code = l.codePromo!;
      const x = parCode.get(code) ?? { code, utilisateurs: [] };
      x.utilisateurs.push({ id: l.company.id, entreprise: l.company.name, formule: l.formule, statut: l.statut, depuis: l.createdAt.toISOString() });
      parCode.set(code, x);
    }
    return { codes: [...parCode.values()] };
  }

  /**
   * LES CHIFFRES DE L'ASSISTANT « POSE TA QUESTION » : des agrégats seulement (jamais un nom d'artisan, jamais un chantier).
   * Les négoces qui ne répondent jamais sont nommés : ce sont des entreprises, et c'est la question posée.
   */
  async chiffres() {
    const maintenant = this.now();
    const { cartes, problemes } = await this.accueil();
    const v = (cle: CarteAccueil["cle"]) => cartes.find((c) => c.cle === cle)!;
    const mois: { mois: string; inscriptions: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const de = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - i, 1));
      const a = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - i + 1, 1));
      mois.push({ mois: de.toISOString().slice(0, 7), inscriptions: await this.prisma.company.count({ where: { ...this.vrais, createdAt: { gte: de, lt: a } } }) });
    }
    const negoces = (await this.negoces()).items;
    const muets = negoces.filter((n) => n.demandesRecues >= 2 && n.tauxReponse === 0).map((n) => ({ nom: n.nom, demandesRecues: n.demandesRecues }));
    const [listes, demandes, besoinsGroupes, parFormule] = await Promise.all([
      this.prisma.project.count({ where: { createdAt: { gte: debutDuMois(maintenant) } } }),
      this.prisma.priceRequest.count({ where: { createdAt: { gte: debutDuMois(maintenant) } } }),
      this.prisma.besoinGroupeV1.count({ where: { createdAt: { gte: debutDuMois(maintenant) } } }),
      this.prisma.abonnement.groupBy({ by: ["formule"], where: { statut: { in: PAYANT } }, _count: { _all: true } }),
    ]);
    const recues = negoces.reduce((s, n) => s + n.demandesRecues, 0);
    const repondues = negoces.reduce((s, n) => s + (n.tauxReponse === null ? 0 : Math.round((n.tauxReponse * n.demandesRecues) / 100)), 0);
    const croissance = v("inscrits").avant > 0 ? Math.round(((v("inscrits").valeur - v("inscrits").avant) / v("inscrits").avant) * 1000) / 10 : null;
    return {
      date: maintenant.toISOString().slice(0, 10),
      artisans: { inscrits: v("inscrits").valeur, inscritsAuDebutDuMois: v("inscrits").avant, inscritsCeMois: v("inscrits").valeur - v("inscrits").avant, croissanceDuMoisPct: croissance, inscriptions7Jours: v("inscriptions_semaine").valeur, inscriptions7JoursDAvant: v("inscriptions_semaine").avant, inscriptionsParMois: mois },
      abonnements: { payants: v("payants").valeur, payantsLeMoisDernier: v("payants").avant, enGratuit: v("gratuit").valeur, parFormule: parFormule.reduce<Record<string, number>>((t, x) => ({ ...t, [formuleDe(x.formule)]: (t[formuleDe(x.formule)] ?? 0) + x._count._all }), {}), revenusDuMoisHt: v("revenus").valeur, revenusDuMoisDernierHt: v("revenus").avant, paiementsRefuses: problemes.find((x) => x.type === "paiement_refuse")?.nombre ?? 0 },
      negoces: { inscrits: v("negoces").valeur, aVerifier: problemes.find((x) => x.type === "negoce_a_verifier")?.nombre ?? 0, demandesRecues: recues, tauxDeReponsePct: recues > 0 ? Math.round((repondues / recues) * 100) : null, quiNeRepondentJamais: muets },
      activiteDuMois: { listesCreees: listes, demandesDePrix: demandes, besoinsEnAchatGroupe: besoinsGroupes },
      aTraiter: { bugsSignales: problemes.find((x) => x.type === "signalement")?.nombre ?? 0, erreursServeur24h: problemes.find((x) => x.type === "erreur_serveur")?.nombre ?? 0 },
    };
  }
}

export type ChiffresAdmin = Awaited<ReturnType<AdminVueService["chiffres"]>>;

const n = (x: number) => x.toLocaleString("fr-FR");
/**
 * LA RÉPONSE SANS MODÈLE (éteint, plafond atteint ou panne) : le code reconnaît le sujet de la question et donne les chiffres
 * correspondants. Jamais une réponse inventée : hors sujet connu, il le dit et liste ce qu'il sait.
 */
export function repondreParLeCode(question: string, c: ChiffresAdmin): string {
  const q = question.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const morceaux: string[] = [];
  if (/repond|muet|silenc/.test(q) && /negoc/.test(q)) {
    const m = c.negoces.quiNeRepondentJamais;
    morceaux.push(m.length ? `${m.length} négoce${m.length > 1 ? "s" : ""} n'${m.length > 1 ? "ont" : "a"} jamais répondu (au moins 2 demandes reçues) : ${m.map((x) => `${x.nom} (${x.demandesRecues} demandes)`).join(", ")}.` : "Aucun négoce avec au moins 2 demandes reçues n'est resté sans réponse.");
    if (c.negoces.tauxDeReponsePct !== null) morceaux.push(`Taux de réponse de l'ensemble des négoces inscrits : ${c.negoces.tauxDeReponsePct} %.`);
  } else if (/negoc/.test(q)) morceaux.push(`${n(c.negoces.inscrits)} négoce${c.negoces.inscrits > 1 ? "s" : ""} inscrit${c.negoces.inscrits > 1 ? "s" : ""}, dont ${n(c.negoces.aVerifier)} à vérifier. ${n(c.negoces.demandesRecues)} demandes reçues${c.negoces.tauxDeReponsePct !== null ? `, ${c.negoces.tauxDeReponsePct} % de réponses` : ""}.`);
  if (/croissan|evolu|progress/.test(q)) morceaux.push(c.artisans.croissanceDuMoisPct === null ? `Pas de croissance calculable : aucun inscrit au début du mois. ${n(c.artisans.inscritsCeMois)} inscription${c.artisans.inscritsCeMois > 1 ? "s" : ""} ce mois.` : `Croissance des inscrits ce mois : ${c.artisans.croissanceDuMoisPct.toLocaleString("fr-FR")} % (${n(c.artisans.inscritsAuDebutDuMois)} au début du mois, ${n(c.artisans.inscrits)} aujourd'hui).`);
  if (/inscri|artisan|compte/.test(q) && !/negoc/.test(q)) morceaux.push(`${n(c.artisans.inscritsCeMois)} inscription${c.artisans.inscritsCeMois > 1 ? "s" : ""} ce mois, ${n(c.artisans.inscriptions7Jours)} sur 7 jours. ${n(c.artisans.inscrits)} artisans inscrits en tout.`);
  if (/payant|abonn|formule|gratuit|\bpro\b|pro max/.test(q)) morceaux.push(`${n(c.abonnements.payants)} abonné${c.abonnements.payants > 1 ? "s" : ""} payant${c.abonnements.payants > 1 ? "s" : ""} (${Object.entries(c.abonnements.parFormule).map(([f, x]) => `${f} : ${x}`).join(", ") || "aucun"}), ${n(c.abonnements.enGratuit)} en Gratuit.`);
  if (/revenu|argent|chiffre d'affaires|\bca\b|gagn|euro/.test(q)) morceaux.push(`Revenus du mois : ${n(c.abonnements.revenusDuMoisHt)} € HT (mois dernier : ${n(c.abonnements.revenusDuMoisDernierHt)} € HT).`);
  if (/paiement|refus|impay/.test(q)) morceaux.push(`${n(c.abonnements.paiementsRefuses)} paiement${c.abonnements.paiementsRefuses > 1 ? "s" : ""} refusé${c.abonnements.paiementsRefuses > 1 ? "s" : ""} en cours.`);
  if (/bug|signal|erreur|probleme/.test(q)) morceaux.push(`${n(c.aTraiter.bugsSignales)} bug${c.aTraiter.bugsSignales > 1 ? "s" : ""} signalé${c.aTraiter.bugsSignales > 1 ? "s" : ""} à traiter, ${n(c.aTraiter.erreursServeur24h)} erreur${c.aTraiter.erreursServeur24h > 1 ? "s" : ""} serveur sur 24 heures.`);
  if (/liste|demande|activit|groupe/.test(q) && morceaux.length === 0) morceaux.push(`Ce mois : ${n(c.activiteDuMois.listesCreees)} listes créées, ${n(c.activiteDuMois.demandesDePrix)} demandes de prix, ${n(c.activiteDuMois.besoinsEnAchatGroupe)} besoins en achat groupé.`);
  if (morceaux.length === 0) return "Je n'ai pas de chiffre pour cette question. Je sais répondre sur : les inscrits et leur croissance, les abonnés et les revenus, les paiements refusés, les négoces et leur taux de réponse, l'activité du mois, les bugs signalés.";
  return morceaux.join(" ");
}
