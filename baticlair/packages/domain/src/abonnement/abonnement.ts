import { z } from "zod";

/**
 * L'ABONNEMENT ARTISAN (Greg, 24 octobre 2026) : les négoces sont gratuits ; l'artisan choisit entre DEUX FORMULES
 * (Greg, 24 octobre 2026, changement de prix) : le MENSUEL, 49 € HT par mois sans engagement, et l'ANNUEL, 348 € HT par
 * an payé en une fois (29 € par mois, -40 %), renouvelé chaque année avec un rappel 30 jours avant ; les deux se
 * résilient avec effet en fin de période payée, sans remboursement au prorata. Du mensuel, l'artisan passe à l'annuel à
 * tout moment, au prorata (`prorataVersAnnuel`). Essai gratuit de l'inscription jusqu'à 30 jours après les
 * résultats de son premier cycle ; s'il ne dépose rien, 60 jours au plus après l'inscription. Prix et durées se règlent
 * dans l'admin (`ReglagesAbonnement`, gardés en base). Ce fichier ne fait que des calculs : aucune date « maintenant »
 * cachée, aucun appel extérieur. Le paiement (simulé ou Stripe) envoie ses événements à l'API, qui tient l'`EtatPaiement`.
 */

export const reglagesAbonnementSchema = z.object({
  /** Le prix du MENSUEL HT, en centimes par mois (4 900 = 49 €). */
  prixHtCentimes: z.number().int().min(100).max(100_000),
  /** Le prix de l'ANNUEL HT, en centimes par an, payé en une fois (34 800 = 348 €). */
  prixAnnuelHtCentimes: z.number().int().min(100).max(1_000_000),
  /** Le taux de TVA en pour cent (20). */
  tauxTva: z.number().min(0).max(30),
  /** L'essai court jusqu'à N jours après les résultats du premier cycle de l'artisan (30). */
  joursEssaiApresResultats: z.number().int().min(0).max(365),
  /** Sans aucun dépôt, l'essai s'arrête N jours après l'inscription (60). */
  joursEssaiSansDepot: z.number().int().min(1).max(365),
  /** Après un paiement refusé, l'accès reste N jours avec un bandeau (7), puis le paywall. */
  joursGrace: z.number().int().min(0).max(60),
  /** Le rappel de renouvellement de l'annuel part N jours avant l'échéance (30). */
  joursRappelAnnuel: z.number().int().min(1).max(90),
});
export type ReglagesAbonnement = z.infer<typeof reglagesAbonnementSchema>;

export const REGLAGES_ABONNEMENT_DEFAUT: ReglagesAbonnement = { prixHtCentimes: 4900, prixAnnuelHtCentimes: 34800, tauxTva: 20, joursEssaiApresResultats: 30, joursEssaiSansDepot: 60, joursGrace: 7, joursRappelAnnuel: 30 };

const JOUR = 86_400_000;
const plusJours = (d: Date, n: number) => new Date(d.getTime() + n * JOUR);

/** Les deux formules. */
export const FORMULES = ["mensuel", "annuel"] as const;
export type Formule = (typeof FORMULES)[number];
export const estFormule = (v: unknown): v is Formule => v === "mensuel" || v === "annuel";

/** Le prix HT d'une période de la formule, en centimes (un mois, ou un an). */
export const prixDeFormule = (f: Formule, r: ReglagesAbonnement = REGLAGES_ABONNEMENT_DEFAUT) => (f === "annuel" ? r.prixAnnuelHtCentimes : r.prixHtCentimes);

/** La fin d'une période qui commence le `debut` : un mois, ou un an, plus tard. */
export function finDePeriode(debut: Date, f: Formule): Date {
  const n = new Date(debut);
  if (f === "annuel") n.setUTCFullYear(n.getUTCFullYear() + 1);
  else n.setUTCMonth(n.getUTCMonth() + 1);
  return n;
}

/** Ce que l'annuel fait gagner sur un an de mensuel, en centimes (12 × 49 − 348 = 240 €) ; 0 s'il ne fait rien gagner. */
export const economieAnnuelle = (r: ReglagesAbonnement = REGLAGES_ABONNEMENT_DEFAUT) => Math.max(0, 12 * r.prixHtCentimes - r.prixAnnuelHtCentimes);

/** La remise de l'annuel sur le mensuel, en pour cent ARRONDIE AU-DESSOUS (240 sur 588 : 40,8 % → « -40 % »), jamais plus que la vraie. */
export const remiseAnnuelle = (r: ReglagesAbonnement = REGLAGES_ABONNEMENT_DEFAUT) => Math.max(0, Math.floor((economieAnnuelle(r) / (12 * r.prixHtCentimes)) * 100));

/** Le prix par mois de l'annuel, en centimes (348 € / 12 = 29 €). */
export const mensualiteAnnuelle = (r: ReglagesAbonnement = REGLAGES_ABONNEMENT_DEFAUT) => Math.round(r.prixAnnuelHtCentimes / 12);

/** Ce que l'API sait du paiement de l'entreprise (tenu par les événements, simulés ou Stripe). */
export type StatutPaiement = "aucun" | "actif" | "echec" | "resilie";
export interface EtatPaiement {
  statut: StatutPaiement;
  /** La fin de la période payée (le prochain renouvellement). */
  periodeFin: Date | null;
  /** Le premier paiement refusé de la série (la grâce court de là). */
  echecLe: Date | null;
  /** La résiliation demandée : l'accès reste jusqu'à `periodeFin`, rien n'est plus prélevé. */
  resiliationDemandeeLe: Date | null;
  /** La formule payée (mensuel par défaut). */
  formule?: Formule;
}
export const PAIEMENT_AUCUN: EtatPaiement = { statut: "aucun", periodeFin: null, echecLe: null, resiliationDemandeeLe: null, formule: "mensuel" };

/** Les dates qui font l'essai : l'inscription, le premier dépôt dans une commande commune, les résultats de ce cycle. */
export interface DatesEssai {
  inscritLe: Date;
  premierDepotLe: Date | null;
  /** Les résultats du cycle du premier dépôt ; null tant qu'ils ne sont pas publiés. */
  premiersResultatsLe: Date | null;
}

/**
 * La fin de l'essai. Sans dépôt : inscription + 60 jours. Avec un dépôt : résultats de ce cycle + 30 jours, même au-delà
 * des 60 jours (« prolongation de l'essai ») ; `null` tant que les résultats ne sont pas sortis (l'essai continue).
 */
export function finDEssai(d: DatesEssai, r: ReglagesAbonnement = REGLAGES_ABONNEMENT_DEFAUT): Date | null {
  if (!d.premierDepotLe) return plusJours(d.inscritLe, r.joursEssaiSansDepot);
  return d.premiersResultatsLe ? plusJours(d.premiersResultatsLe, r.joursEssaiApresResultats) : null;
}

export type Acces = "essai" | "abonne" | "grace" | "bloque";
export interface EtatAbonnement {
  acces: Acces;
  essaiFinLe: Date | null;
  /** Les jours d'essai qui restent (arrondis au-dessus), null hors essai ou avant les résultats. */
  joursEssai: number | null;
  graceFinLe: Date | null;
  joursGrace: number | null;
  /** La fin de la période payée. */
  periodeFin: Date | null;
  resiliationProgrammee: boolean;
  /** Jusqu'à quand l'artisan a eu accès : une liste déposée avant garde ses résultats visibles. Null : accès en cours. */
  accesJusquau: Date | null;
}

const joursAvant = (fin: Date, maintenant: Date) => Math.max(0, Math.ceil((fin.getTime() - maintenant.getTime()) / JOUR));

/** L'état de l'abonnement à un instant : abonné, en grâce, en essai, ou bloqué par le paywall. */
export function etatAbonnement(dates: DatesEssai, paiement: EtatPaiement, maintenant: Date, r: ReglagesAbonnement = REGLAGES_ABONNEMENT_DEFAUT): EtatAbonnement {
  const essaiFinLe = finDEssai(dates, r);
  const base = { essaiFinLe, joursEssai: null, graceFinLe: null, joursGrace: null, periodeFin: paiement.periodeFin, resiliationProgrammee: paiement.statut === "actif" && !!paiement.resiliationDemandeeLe, accesJusquau: null };
  const periodeEnCours = !!paiement.periodeFin && paiement.periodeFin > maintenant;
  if ((paiement.statut === "actif" || paiement.statut === "resilie") && periodeEnCours) return { ...base, acces: "abonne" };
  // Un paiement refusé, ou un renouvellement qui n'est pas arrivé : la grâce, puis le paywall.
  let graceFinLe: Date | null = null;
  if (paiement.statut === "echec") graceFinLe = plusJours(paiement.echecLe ?? paiement.periodeFin ?? maintenant, r.joursGrace);
  else if (paiement.statut === "actif" && paiement.periodeFin && !paiement.resiliationDemandeeLe) graceFinLe = plusJours(paiement.periodeFin, r.joursGrace);
  if (graceFinLe && graceFinLe > maintenant) return { ...base, acces: "grace", graceFinLe, joursGrace: joursAvant(graceFinLe, maintenant) };
  if (essaiFinLe === null || essaiFinLe > maintenant) return { ...base, acces: "essai", joursEssai: essaiFinLe ? joursAvant(essaiFinLe, maintenant) : null };
  const fins = [essaiFinLe, graceFinLe, paiement.periodeFin].filter((d): d is Date => !!d);
  return { ...base, acces: "bloque", graceFinLe, accesJusquau: new Date(Math.max(...fins.map((d) => d.getTime()))) };
}

/** Ce que le paywall bloque sans abonnement actif (Greg, point 3). Le reste (historique, bons, factures, données, compte, partage, négoces) reste ouvert. */
export const ACTIONS_PAYANTES = ["deposer", "voir_resultats", "commander", "recommander"] as const;
export type ActionPayante = (typeof ACTIONS_PAYANTES)[number];

/**
 * L'action est-elle permise ? Bloqué, seule reste la vue des résultats d'une liste déposée pendant l'accès (« elle reste
 * dans son cycle et ses résultats restent visibles ») : `deposeeLe` est la date du dépôt de la liste concernée.
 */
export function actionPermise(etat: EtatAbonnement, action: ActionPayante, deposeeLe?: Date | null): boolean {
  if (etat.acces !== "bloque") return true;
  return action === "voir_resultats" && !!deposeeLe && !!etat.accesJusquau && deposeeLe < etat.accesJusquau;
}

/** « 29 € », « 34,80 € » : un montant en centimes, sans décimales quand il est rond. */
export function eurosDeCentimes(c: number): string {
  const e = c / 100;
  return `${e.toLocaleString("fr-FR", { minimumFractionDigits: Number.isInteger(e) ? 0 : 2, maximumFractionDigits: 2 })} €`;
}

/** « 29 € » : le prix par mois de l'annuel, arrondi à l'euro (348 € / 12 = 29 € tout rond depuis le 24 octobre 2026). */
export const prixParMoisAnnuel = (r: ReglagesAbonnement = REGLAGES_ABONNEMENT_DEFAUT) => eurosDeCentimes(Math.round(mensualiteAnnuelle(r) / 100) * 100);

/** L'écran du paywall, mot pour mot. */
export const phrasePaywall = (r: ReglagesAbonnement = REGLAGES_ABONNEMENT_DEFAUT) => `Ton essai est terminé. Continue dès ${prixParMoisAnnuel(r)} HT par mois.`;

/** Une formule telle que le paywall et /tarifs la montrent. */
export interface OffreAbonnement {
  formule: Formule;
  titre: string;
  /** « -40 % » sur l'annuel ; null sur le mensuel. */
  badge: string | null;
  /** La ligne du prix, en gros. */
  prix: string;
  /** Ce qui suit, en petit. */
  details: string[];
  /** L'annuel est mis en avant. */
  enAvant: boolean;
}

/**
 * LES DEUX FORMULES (Greg, 24 octobre 2026) : l'annuel d'abord, mis en avant, son badge « -40 % », « 29 € par mois, payé
 * à l'année » et « 240 € économisés par an » ; le mensuel juste à côté.
 */
export function offresAbonnement(r: ReglagesAbonnement = REGLAGES_ABONNEMENT_DEFAUT): OffreAbonnement[] {
  const remise = remiseAnnuelle(r);
  const economie = economieAnnuelle(r);
  return [
    {
      formule: "annuel",
      titre: "Annuel",
      badge: remise > 0 ? `-${remise} %` : null,
      prix: `${prixParMoisAnnuel(r)} HT par mois, payé à l'année`,
      details: [`${eurosDeCentimes(r.prixAnnuelHtCentimes)} HT par an, en une fois`, ...(economie > 0 ? [`${eurosDeCentimes(economie)} économisés par an`] : []), "Renouvelé chaque année, rappel 30 jours avant"],
      enAvant: true,
    },
    { formule: "mensuel", titre: "Mensuel", badge: null, prix: `${eurosDeCentimes(r.prixHtCentimes)} HT par mois`, details: ["Sans engagement", "Résiliable quand tu veux"], enAvant: false },
  ];
}
export const BOUTON_CONTINUER = "Je continue";
export const LIEN_PAS_MAINTENANT = "Pas maintenant";

/**
 * L'économie réelle du premier cycle : l'écart entre le prix le plus cher reçu et celui que l'artisan a choisi (ou le moins
 * cher s'il n'a pas choisi), sur les négoces qui ont tout chiffré. Null sans deux prix comparables.
 */
export function ecartDuCycle(totauxHt: readonly number[], choisiHt: number | null): number | null {
  if (totauxHt.length === 0) return null;
  const haut = Math.max(...totauxHt);
  const bas = choisiHt ?? Math.min(...totauxHt);
  const ecart = Math.round(haut - bas);
  return ecart > 0 ? ecart : null;
}

const eurosRonds = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
/** « Sur ton premier cycle : 340 € d'écart avec le prix le plus cher reçu » ; null sans écart. */
export const phraseEconomiePremierCycle = (ecart: number | null) => (ecart ? `Sur ton premier cycle : ${eurosRonds(ecart)} d'écart avec le prix le plus cher reçu` : null);

/** Le bandeau de l'app pendant l'essai : « Essai gratuit : encore 12 jours » ; null hors essai ou avant les premiers résultats. */
export function bandeauEssai(etat: EtatAbonnement): string | null {
  if (etat.acces !== "essai" || etat.joursEssai === null) return null;
  if (etat.joursEssai <= 1) return "Essai gratuit : dernier jour";
  return `Essai gratuit : encore ${etat.joursEssai} jours`;
}

const dateCourte = (d: Date) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" }).format(d);

/** Le bandeau de la grâce (paiement refusé). */
export function bandeauGrace(etat: EtatAbonnement): string | null {
  if (etat.acces !== "grace" || !etat.graceFinLe) return null;
  return `Ton paiement n'est pas passé. Mets à jour ta carte avant le ${dateCourte(etat.graceFinLe)} pour garder l'accès.`;
}

/** Le bandeau du paiement simulé, mot pour mot. */
export const BANDEAU_MODE_TEST = "Mode test : aucun paiement réel";

/** Les montants d'une facture, en centimes : la TVA arrondie au centime, TTC = HT + TVA. */
export function montantsFacture(prixHtCentimes: number, tauxTva: number): { ht: number; tva: number; ttc: number } {
  const tva = Math.round((prixHtCentimes * tauxTva) / 100);
  return { ht: prixHtCentimes, tva, ttc: prixHtCentimes + tva };
}

/**
 * Le numéro d'une facture : une seule suite continue, sans trou ni remise à zéro (« F-000001 ») ; en paiement simulé, une
 * suite à part préfixée « TEST » (« TEST-000001 »), pour qu'aucune facture de test ne prenne un numéro réel.
 */
export type SerieFacture = "F" | "TEST";
export const numeroFacture = (serie: SerieFacture, rang: number) => `${serie}-${String(rang).padStart(6, "0")}`;

/** Les rappels de fin d'essai (7 jours avant, la veille, le jour même), chacun envoyé une fois. */
export type RappelEssai = "j7" | "j1" | "j0";
export function rappelEssaiDu(essaiFinLe: Date | null, maintenant: Date): RappelEssai | null {
  if (!essaiFinLe) return null;
  const reste = essaiFinLe.getTime() - maintenant.getTime();
  if (reste <= 0) return reste > -JOUR ? "j0" : null;
  if (reste <= JOUR) return "j1";
  if (reste <= 7 * JOUR) return "j7";
  return null;
}

/** L'e-mail de rappel, avec l'économie réelle du premier cycle quand il y en a une. */
export function emailRappelEssai(rappel: RappelEssai, c: { ecart: number | null; lien: string; reglages?: ReglagesAbonnement; nomApp: string }): { objet: string; texte: string } {
  const r = c.reglages ?? REGLAGES_ABONNEMENT_DEFAUT;
  const quand = rappel === "j7" ? "dans 7 jours" : rappel === "j1" ? "demain" : "aujourd'hui";
  const objet = rappel === "j0" ? `Ton essai ${c.nomApp} se termine aujourd'hui` : `Ton essai ${c.nomApp} se termine ${quand}`;
  const economie = phraseEconomiePremierCycle(c.ecart);
  const texte = [
    "Bonjour,",
    "",
    `Ton essai gratuit se termine ${quand}.`,
    ...(economie ? [`${economie}.`] : []),
    `Pour continuer à déposer tes listes et voir les prix : ${phraseDeuxFormules(r)}`,
    "",
    `Continuer : ${c.lien}`,
  ].join("\n");
  return { objet, texte };
}

/** « dès 29 € HT par mois avec l'annuel (348 € HT par an), ou 49 € HT par mois sans engagement. » */
export const phraseDeuxFormules = (r: ReglagesAbonnement = REGLAGES_ABONNEMENT_DEFAUT) =>
  `dès ${prixParMoisAnnuel(r)} HT par mois avec l'annuel (${eurosDeCentimes(r.prixAnnuelHtCentimes)} HT par an), ou ${eurosDeCentimes(r.prixHtCentimes)} HT par mois sans engagement.`;

/**
 * LE PASSAGE DU MENSUEL À L'ANNUEL, À TOUT MOMENT, AU PRORATA (Greg, 24 octobre 2026) : comme Stripe le fait, l'année
 * commence le jour du passage ; ce qui reste de la période mensuelle déjà payée est déduit (au jour près, arrondi au
 * centime), et l'artisan paie la différence tout de suite.
 */
export function prorataVersAnnuel(periode: { debut: Date; fin: Date }, maintenant: Date, r: ReglagesAbonnement = REGLAGES_ABONNEMENT_DEFAUT, mensuelPayeCentimes = r.prixHtCentimes): { creditCentimes: number; aPayerHtCentimes: number; debut: Date; fin: Date } {
  const total = periode.fin.getTime() - periode.debut.getTime();
  const reste = Math.min(total, Math.max(0, periode.fin.getTime() - maintenant.getTime()));
  const creditCentimes = total > 0 ? Math.round((mensuelPayeCentimes * reste) / total) : 0;
  return { creditCentimes, aPayerHtCentimes: Math.max(0, r.prixAnnuelHtCentimes - creditCentimes), debut: maintenant, fin: finDePeriode(maintenant, "annuel") };
}

/**
 * LE RAPPEL DE RENOUVELLEMENT DE L'ANNUEL (Greg, 24 octobre 2026) : 30 jours avant l'échéance, une fois par année ; jamais
 * pour un abonnement dont la résiliation est demandée.
 */
export function rappelRenouvellementDu(p: { formule: Formule; statut: StatutPaiement; periodeFin: Date | null; resiliationDemandeeLe: Date | null }, maintenant: Date, r: ReglagesAbonnement = REGLAGES_ABONNEMENT_DEFAUT): boolean {
  if (p.formule !== "annuel" || p.statut !== "actif" || !p.periodeFin || p.resiliationDemandeeLe) return false;
  const reste = p.periodeFin.getTime() - maintenant.getTime();
  return reste > 0 && reste <= r.joursRappelAnnuel * JOUR;
}

/** L'e-mail du rappel de renouvellement : la date, le montant, comment arrêter, sans remboursement au prorata. */
export function emailRenouvellementAnnuel(c: { echeance: Date; reglages?: ReglagesAbonnement; lien: string; nomApp: string }): { objet: string; texte: string } {
  const r = c.reglages ?? REGLAGES_ABONNEMENT_DEFAUT;
  const le = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" }).format(c.echeance);
  const m = montantsFacture(r.prixAnnuelHtCentimes, r.tauxTva);
  return {
    objet: `Ton abonnement annuel ${c.nomApp} se renouvelle le ${le}`,
    texte: [
      "Bonjour,",
      "",
      `Ton abonnement annuel ${c.nomApp} se renouvelle automatiquement le ${le} : ${eurosDeCentimes(m.ht)} HT (${eurosDeCentimes(m.ttc)} TTC) pour un an, prélevés sur ta carte.`,
      `Pour l'arrêter, résilie avant cette date dans « Mon abonnement » : tu gardes l'accès jusqu'au ${le}, rien ne sera plus prélevé. Une année commencée n'est pas remboursée au prorata.`,
      "",
      `Mon abonnement : ${c.lien}`,
    ].join("\n"),
  };
}

/**
 * L'ARGUMENT DES TARIFS (Greg, 24 octobre 2026) : une possibilité, jamais une moyenne garantie (A-FAIRE-RELIRE : publicité
 * trompeuse) ; dès 3 cycles publiés, il est remplacé par la vraie économie moyenne par artisan et par commande.
 */
export const SEUIL_CYCLES_ECONOMIE = 3;
export function argumentTarif(moyenne: { cycles: number; parCommande: number | null }, r: ReglagesAbonnement = REGLAGES_ABONNEMENT_DEFAUT): string {
  const prix = prixParMoisAnnuel(r);
  if (moyenne.cycles >= SEUIL_CYCLES_ECONOMIE && moyenne.parCommande && moyenne.parCommande > 0) {
    return `Dès ${prix} par mois : en moyenne, nos artisans ont économisé ${eurosRonds(moyenne.parCommande)} par commande commune.`;
  }
  return `Dès ${prix} par mois, économise des centaines, voire des milliers d'euros chaque année.`;
}


/**
 * LE REVENU MENSUEL RÉCURRENT (Greg, 24 octobre 2026, tableau de bord) : la somme, sur les abonnés en cours, du prix
 * mensuel du mensuel et du prix annuel DIVISÉ PAR 12 de l'annuel (en centimes, HT) ; et la part d'abonnés annuels.
 */
export function revenuMensuelRecurrent(abonnes: readonly { formule: Formule; htCentimes: number }[]): { centimes: number; mensuels: number; annuels: number; partAnnuels: number | null } {
  const centimes = Math.round(abonnes.reduce((t, a) => t + (a.formule === "annuel" ? a.htCentimes / 12 : a.htCentimes), 0));
  const annuels = abonnes.filter((a) => a.formule === "annuel").length;
  return { centimes, mensuels: abonnes.length - annuels, annuels, partAnnuels: abonnes.length ? Math.round((annuels / abonnes.length) * 100) : null };
}
