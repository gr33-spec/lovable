/**
 * LE MINUTEUR DE LA COMMANDE DU MOIS, CÔTÉ ÉCRAN (Greg, 23 octobre 2026 : « je ne vois pas de minuteur, n'importe qui
 * doit comprendre en 10 secondes »). Les dates font foi côté API (`GET /v1/commande-du-mois`, réglages de l'admin) ;
 * quand l'API ne répond pas (ancienne API, panne, prévisualisation reliée à la production), l'écran montre quand même la
 * prochaine clôture d'après la règle par défaut du domaine (`CONFIG_CYCLE_DEFAUT` : le 25 à 12 h, heure de Paris ; le 18
 * en décembre), et le chrono se recalcule chaque minute dans le navigateur.
 */
const JOUR_CLOTURE = 25;
const JOUR_CLOTURE_DECEMBRE = 18;
const HEURE_CLOTURE = 12;

const MOIS_NOMS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"] as const;

/** « d'octobre », « de novembre » : l'élision devant une voyelle (même règle que le domaine). */
export function deMois(mois: string): string {
  const nom = MOIS_NOMS[Number(mois.slice(5, 7)) - 1] ?? mois;
  return /^[aeiouyéèêàâî]/i.test(nom) ? `d'${nom}` : `de ${nom}`;
}

function decalageParis(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(instant);
  const v = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const local = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"));
  return Math.round((local - instant.getTime()) / 60_000);
}

function heureDeParis(mois: string, jour: number, heure: number): Date {
  const [a, m] = [Number(mois.slice(0, 4)), Number(mois.slice(5, 7))];
  const naif = Date.UTC(a, m - 1, jour, heure, 0);
  return new Date(naif - decalageParis(new Date(naif)) * 60_000);
}

function moisDe(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" }).formatToParts(instant);
  return `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}`;
}

function moisSuivant(mois: string): string {
  const [a, m] = [Number(mois.slice(0, 4)), Number(mois.slice(5, 7))];
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
}

/** « 9 j 4 h », « 3 h 12 min », « moins d'une minute » : le temps qui reste, comme le domaine l'écrit. */
export function chrono(maintenant: Date, echeance: Date): string {
  const minutes = Math.max(0, Math.floor((echeance.getTime() - maintenant.getTime()) / 60_000));
  if (minutes < 1) return "moins d'une minute";
  const j = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const min = minutes % 60;
  if (j > 0) return h > 0 ? `${j} j ${h} h` : `${j} j`;
  if (h > 0) return min > 0 ? `${h} h ${min} min` : `${h} h`;
  return `${min} min`;
}

/** La prochaine clôture d'après la règle par défaut : le mois en cours si sa clôture n'est pas passée, sinon le suivant. */
export function prochaineClotureParDefaut(maintenant = new Date()): { mois: string; de: string; clotureLe: string } {
  let mois = moisDe(maintenant);
  for (let i = 0; i < 24; i++) {
    const clotureLe = heureDeParis(mois, mois.endsWith("-12") ? JOUR_CLOTURE_DECEMBRE : JOUR_CLOTURE, HEURE_CLOTURE);
    if (maintenant < clotureLe) return { mois, de: deMois(mois), clotureLe: clotureLe.toISOString() };
    mois = moisSuivant(mois);
  }
  return { mois, de: deMois(mois), clotureLe: new Date(maintenant.getTime() + 86_400_000).toISOString() };
}

/** « 25/10 » : le jour de la clôture, heure de Paris. */
export const jourMois = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" }).format(new Date(iso));
