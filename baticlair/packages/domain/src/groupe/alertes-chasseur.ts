import { de } from "../shared/elision.js";

/**
 * LES ALERTES DU CHASSEUR (business model final, point 4 bis, Greg, 25 octobre 2026) : l'alerte à la formation d'un
 * regroupement (dès le 2e besoin d'une même référence dans la zone), le nouveau total à chaque ajout (un e-mail tout de
 * suite, puis les ajouts suivants du jour en un digest à 18 h), la date butoir de la négociation (date de besoin la plus
 * proche moins le délai de livraison) avec ses rappels à J-5 et J-2 tant qu'aucune offre n'est saisie, la pastille du
 * tableau de bord, et l'ordre des négoces à appeler.
 */
export const DELAI_LIVRAISON_JOURS_DEFAUT = 10;
const JOUR = 86_400_000;
const jourUtc = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** La date butoir : la date de besoin la plus proche moins le délai de livraison. */
export function dateLimiteNegociation(dateBesoinMin: Date, delaiLivraisonJours = DELAI_LIVRAISON_JOURS_DEFAUT): Date {
  return new Date(jourUtc(dateBesoinMin) - delaiLivraisonJours * JOUR);
}

/** Les jours pleins qui restent avant la date butoir (0 le jour même, négatif une fois passée). */
export const joursAvant = (dateLimite: Date, maintenant: Date) => Math.round((jourUtc(dateLimite) - jourUtc(maintenant)) / JOUR);

export type Pastille = "verte" | "rouge" | "neutre";
/** Verte dès qu'une offre est saisie ; rouge sous J-5 sans offre ; sinon neutre. */
export function pastilleRegroupement(r: { offreSaisie: boolean; joursRestants: number | null }): Pastille {
  if (r.offreSaisie) return "verte";
  if (r.joursRestants !== null && r.joursRestants < 5) return "rouge";
  return "neutre";
}

/** Le rappel dû aujourd'hui (J-5, puis J-2), une seule fois chacun, tant qu'aucune offre n'est saisie. */
export function rappelDu(r: { offreSaisie: boolean; joursRestants: number | null; rappelJ5Le: Date | null; rappelJ2Le: Date | null }): "J-5" | "J-2" | null {
  if (r.offreSaisie || r.joursRestants === null) return null;
  if (r.joursRestants <= 2 && !r.rappelJ2Le) return "J-2";
  if (r.joursRestants <= 5 && r.joursRestants > 2 && !r.rappelJ5Le) return "J-5";
  return null;
}

const nombre = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 }).replace(/ /g, " ");
const jourCourt = (d: Date) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }).format(d);

/** « Nouveau regroupement : Ardoise 32×22, 2 entreprises, 18 palettes, besoin au plus tôt le 28 nov. » */
export function phraseFormation(r: { libelle: string; entreprises: number; volume: number; unite: string; dateBesoinMin: Date | null }): string {
  const date = r.dateBesoinMin ? `, besoin au plus tôt le ${jourCourt(r.dateBesoinMin)}` : "";
  return `Nouveau regroupement : ${r.libelle}, ${r.entreprises} entreprises, ${nombre(r.volume)} ${r.unite}${date}`;
}

/** « Ardoise 32×22 : nouveau total 2 600 pièces d'ardoise, 3 entreprises. » */
export function phraseNouveauTotal(r: { libelle: string; entreprises: number; volume: number; unite: string }): string {
  return `${r.libelle} : nouveau total ${nombre(r.volume)} ${r.unite} ${de(r.libelle)}, ${r.entreprises} entreprises.`;
}

/** Un ajout d'un jour déjà signalé tout de suite part au digest de 18 h (jour de Paris). */
export const memeJourParis = (a: Date, b: Date) => {
  const f = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });
  return f.format(a) === f.format(b);
};

/**
 * Les négoces à appeler, dans l'ordre : ceux qui ont déjà répondu sur Mobiiz, puis ceux que les artisans du regroupement
 * utilisent en demande perso, puis les autres négoces vérifiés de la zone ; un négoce bloqué n'est jamais proposé.
 */
export function negocesAAppeler<T extends { nom: string; aRepondu: boolean; utiliseEnPerso: boolean; verification: string | null }>(negoces: readonly T[]): T[] {
  const rang = (n: T) => (n.aRepondu ? 0 : n.utiliseEnPerso ? 1 : 2);
  return negoces.filter((n) => n.verification !== "bloque").slice().sort((a, b) => rang(a) - rang(b) || a.nom.localeCompare(b.nom, "fr"));
}

/** La commune d'une adresse de livraison (« 8 rue X, 22300 Lannion » → « Lannion »), jamais la rue. */
export function communeDe(adresse: string | null | undefined): string | null {
  const m = /\b\d{5}\s+(.+?)\s*$/.exec(adresse ?? "");
  return m ? m[1]! : null;
}
