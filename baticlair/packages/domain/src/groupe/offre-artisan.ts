/**
 * GRATUIT ET PAYANT (Greg, 25 octobre 2026, recentrage) : « gratuit, tu gagnes du temps ; payant, tu gagnes de l'argent ».
 * - Gratuit : `LECTURES_GRATUITES_MOIS` lectures de devis par mois (2), envoi à UN seul négoce par demande, « Mes prix »
 *   limité aux 3 derniers mois, pas de regroupement.
 * - Payant (49 € HT par mois ou 348 € HT par an) : lectures illimitées (usage raisonnable), jusqu'à 5 négoces par
 *   demande, regroupements, « Mes prix » complet.
 * - L'essai existant donne le payant. Dans une zone sous `SEUIL_ZONE_ACTIVE` artisans actifs (10), le payant est OFFERT ;
 *   quand le seuil est franchi, chaque artisan de la zone garde le payant 30 jours (préavis) avant le paywall.
 * - Les regroupements n'existent que dans les `ZONES_ACTIVES` (22 au départ) ; ailleurs, tout le reste marche.
 * Du calcul pur : l'API donne l'état (abonnement, essai, zone), ce fichier dit les droits.
 *
 * ATTENTION (relecture du 30 octobre 2026) : ces règles sont celles du MODE ANCIEN. En mode achat groupé (`automatique`,
 * celui en ligne), ce qui est gratuit et payant est dit par `tarifs.ts` (`TARIFS`) et appliqué par `DroitsService` :
 * 3 listes préparées offertes en tout, plusieurs négoces par demande, achats groupés sur abonnement (le premier offert).
 */

export const LECTURES_GRATUITES_MOIS_DEFAUT = 2;
export const NEGOCES_PAR_DEMANDE_GRATUIT = 1;
export const NEGOCES_PAR_DEMANDE_PAYANT = 5;
export const MOIS_PRIX_GRATUIT = 3;
export const SEUIL_ZONE_ACTIVE_DEFAUT = 10;
export const PREAVIS_ZONE_JOURS = 30;
/** L'usage raisonnable des lectures payantes, par mois (au-delà, l'admin est alerté ; rien n'est bloqué). */
export const LECTURES_USAGE_RAISONNABLE = 60;
export const ZONES_ACTIVES_DEFAUT: readonly string[] = ["22"];

/** Lit `ZONES_ACTIVES` (« 22,29,35 ») ; vide ou absente : le 22. */
export function lireZonesActives(texte: string | null | undefined): string[] {
  const zones = (texte ?? "")
    .split(/[,\s]+/)
    .map((z) => z.trim().toUpperCase())
    .filter((z) => /^(\d{2,3}|2A|2B)$/.test(z));
  return zones.length ? [...new Set(zones)] : [...ZONES_ACTIVES_DEFAUT];
}

export const zoneActive = (zone: string | null | undefined, zones: readonly string[]) => !!zone && zones.includes(zone);

/** Le message hors zone active (tutoiement). */
export const MESSAGE_HORS_ZONE = "Les regroupements arrivent bientôt dans ton département, invite tes négoces pour accélérer.";

/**
 * Le payant offert d'une zone : tant qu'elle compte moins de `seuil` artisans actifs ; une fois le seuil franchi (date
 * gardée par l'API), encore `PREAVIS_ZONE_JOURS` jours. Rend aussi la fin du préavis pour le dire à l'artisan.
 */
export function payantOffertDansLaZone(z: { artisansActifs: number; seuilFranchiLe: Date | null }, maintenant: Date, seuil = SEUIL_ZONE_ACTIVE_DEFAUT): { offert: boolean; preavisJusquau: Date | null } {
  if (!z.seuilFranchiLe) return { offert: z.artisansActifs < seuil, preavisJusquau: null };
  const fin = new Date(z.seuilFranchiLe.getTime() + PREAVIS_ZONE_JOURS * 86_400_000);
  return { offert: maintenant < fin, preavisJusquau: maintenant < fin ? fin : null };
}

export type RaisonPayant = "abonne" | "essai" | "zone_offerte";

export interface EtatArtisan {
  /** Abonnement payé et en cours (ou en grâce). */
  abonne: boolean;
  /** Essai en cours. */
  essai: boolean;
  /** Le payant est offert dans sa zone (`payantOffertDansLaZone`). */
  zoneOfferte: boolean;
  /** Sa zone fait partie des `ZONES_ACTIVES`. */
  zoneActive: boolean;
}

export interface Droits {
  formule: "payant" | "gratuit";
  raison: RaisonPayant | null;
  /** Lectures de devis par mois ; null = illimitées (usage raisonnable). */
  lecturesParMois: number | null;
  negocesParDemande: number;
  regroupements: boolean;
  /** Profondeur de « Mes prix » en mois ; null = tout l'historique. */
  historiqueMois: number | null;
}

export function droitsDe(e: EtatArtisan, o: { lecturesGratuites?: number } = {}): Droits {
  const raison: RaisonPayant | null = e.abonne ? "abonne" : e.essai ? "essai" : e.zoneOfferte ? "zone_offerte" : null;
  if (raison) return { formule: "payant", raison, lecturesParMois: null, negocesParDemande: NEGOCES_PAR_DEMANDE_PAYANT, regroupements: e.zoneActive, historiqueMois: null };
  return { formule: "gratuit", raison: null, lecturesParMois: o.lecturesGratuites ?? LECTURES_GRATUITES_MOIS_DEFAUT, negocesParDemande: NEGOCES_PAR_DEMANDE_GRATUIT, regroupements: false, historiqueMois: MOIS_PRIX_GRATUIT };
}

export type RefusDroit = "lectures" | "negoces" | "regroupements" | "zone";

/** Ce qu'on refuse, et la phrase du paywall (tutoiement), au geste qui dépasse. */
export function verifierDroit(d: Droits, geste: { type: "lecture"; dejaCeMois: number } | { type: "envoi"; negoces: number } | { type: "regroupement"; zoneActive: boolean }): { ok: true } | { ok: false; refus: RefusDroit; phrase: string } {
  if (geste.type === "lecture") {
    if (d.lecturesParMois === null || geste.dejaCeMois < d.lecturesParMois) return { ok: true };
    return { ok: false, refus: "lectures", phrase: `Tu as utilisé tes ${d.lecturesParMois} lectures gratuites du mois. Passe à l'abonnement pour lire tous tes devis.` };
  }
  if (geste.type === "envoi") {
    if (geste.negoces <= d.negocesParDemande) return { ok: true };
    return d.formule === "gratuit"
      ? { ok: false, refus: "negoces", phrase: "En gratuit, ta demande part chez un seul négoce. Abonne-toi pour comparer jusqu'à 5 négoces." }
      : { ok: false, refus: "negoces", phrase: `Jusqu'à ${d.negocesParDemande} négoces par demande.` };
  }
  if (!geste.zoneActive) return { ok: false, refus: "zone", phrase: MESSAGE_HORS_ZONE };
  if (d.regroupements) return { ok: true };
  return { ok: false, refus: "regroupements", phrase: "Les regroupements font partie de l'abonnement. Abonne-toi pour tenter un prix de groupe." };
}

/** Le début de la fenêtre de « Mes prix » (null = tout). */
export function debutHistorique(d: Droits, maintenant: Date): Date | null {
  if (d.historiqueMois === null) return null;
  const debut = new Date(maintenant);
  debut.setUTCMonth(debut.getUTCMonth() - d.historiqueMois);
  return debut;
}

/** « Ton abonnement est offert dans le 22 jusqu'au 25 novembre » (préavis), ou null. */
export function phrasePreavis(zone: string, preavisJusquau: Date | null): string | null {
  if (!preavisJusquau) return null;
  const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(preavisJusquau);
  return `Le ${zone} compte maintenant assez d'artisans : l'abonnement t'est offert jusqu'au ${date}, ensuite tu choisis gratuit ou payant.`;
}
