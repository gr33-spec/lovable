// Formatage partagé (serveur et navigateur). Montants toujours en centimes.

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const euroRound = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** 2400 → « 24 € » ; 2450 → « 24,50 € ». */
export function formatPrice(cents: number): string {
  return (cents % 100 === 0 ? euroRound : euro).format(cents / 100).replace(/ /g, " ");
}

/** Montant exact avec centimes (factures, récapitulatifs). */
export function formatMoney(cents: number): string {
  return euro.format(cents / 100).replace(/ /g, " ");
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});
const shortDateFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" });

export function formatDate(value: string | Date): string {
  return dateFmt.format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFmt.format(new Date(value));
}

export function formatShortDate(value: string | Date): string {
  return shortDateFmt.format(new Date(value));
}

/** « il y a 5 min », « hier »… pour le tableau de bord. */
export function formatRelative(value: string | Date, now = Date.now()): string {
  const diff = Math.round((now - new Date(value).getTime()) / 60_000);
  if (diff < 1) return "à l'instant";
  if (diff < 60) return `il y a ${diff} min`;
  const hours = Math.round(diff / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} jours`;
  return formatDate(value);
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`;
}

/** Texte sans accents ni majuscules (identique à la fonction SQL norm()). */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** « Boucles d'oreilles Été ! » → « boucles-d-oreilles-ete ». */
export function slugify(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
}

export const COUNTRY_NAMES: Record<string, string> = {
  FR: "France",
  BE: "Belgique",
  CH: "Suisse",
  LU: "Luxembourg",
  MC: "Monaco",
  DE: "Allemagne",
  ES: "Espagne",
  IT: "Italie",
  NL: "Pays-Bas",
  PT: "Portugal",
  AT: "Autriche",
  IE: "Irlande",
  GB: "Royaume-Uni",
  CA: "Canada",
  US: "États-Unis",
};

export function countryName(code: string | null | undefined): string {
  if (!code) return "";
  return COUNTRY_NAMES[code] ?? code;
}
