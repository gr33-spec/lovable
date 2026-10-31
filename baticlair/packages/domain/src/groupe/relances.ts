import { NOM_APP } from "./marque.js";

const jourFr = (d: Date) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(d).replace(/^1 /, "1er ");

/**
 * LES RELANCES (Greg, lot final, point 6). Une demande a une date limite ; à mi-délai, l'artisan est prévenu que son
 * négoce n'a pas répondu (« Appelle ton commercial »), et le négoce reçoit un rappel ; la veille de la date limite,
 * l'artisan est prévenu une seconde fois. Jamais après une réponse ou un refus, jamais après la date limite, et au plus
 * deux rappels par négoce et par demande (mi-délai, veille).
 */
export interface EtatRelance {
  envoyeLe: Date;
  dateLimite: Date;
  reponduLe: Date | null;
  refuseLe: Date | null;
  rappelMiLe: Date | null;
  rappelVeilleLe: Date | null;
  relanceNegoceLe: Date | null;
  /** Le rappel au négoce part au plus tard à cette date (48 h ouvrées après l'envoi), même si la date limite est loin. */
  relanceNegoceAuPlusTard?: Date;
}

export interface RelancesDues {
  /** Prévenir l'artisan (mi-délai ou veille ; un seul message même si les deux tombent le même jour). */
  artisan: "mi" | "veille" | null;
  /** Rappeler le négoce (une fois, à mi-délai). */
  negoce: boolean;
}

const JOUR = 86_400_000;

export function relancesDues(e: EtatRelance, maintenant: Date): RelancesDues {
  const rien: RelancesDues = { artisan: null, negoce: false };
  if (e.reponduLe || e.refuseLe || maintenant >= e.dateLimite) return rien;
  const mi = new Date(e.envoyeLe.getTime() + (e.dateLimite.getTime() - e.envoyeLe.getTime()) / 2);
  const veille = new Date(e.dateLimite.getTime() - JOUR);
  const artisan = maintenant >= veille && !e.rappelVeilleLe ? "veille" : maintenant >= mi && !e.rappelMiLe && !e.rappelVeilleLe ? "mi" : null;
  const negoce = !e.relanceNegoceLe && (maintenant >= mi || (!!e.relanceNegoceAuPlusTard && maintenant >= e.relanceNegoceAuPlusTard));
  return { artisan, negoce };
}

/** Le rappel au négoce (vouvoiement), au nom de son client ; le lien de réponse reste le même mécanisme qu'à l'envoi. */
export function mailRelanceDemande(m: { entreprise: string; dateLimite: Date; lien: string | null; prenomCommercial?: string | null }): { objet: string; texte: string } {
  return {
    objet: `${m.entreprise} attend votre offre`,
    texte: [
      `Bonjour${m.prenomCommercial?.trim() ? ` ${m.prenomCommercial.trim()}` : ""},`,
      "",
      `Votre client ${m.entreprise} attend votre offre. Les réponses sont closes le ${jourFr(m.dateLimite)}.`,
      "",
      m.lien ? `Répondre en ligne, sans inscription : ${m.lien}` : "Le bouton « Répondre en ligne » est dans le mail de la demande.",
      "Vous pouvez aussi répondre directement à ce mail, il lui arrive.",
      "",
      "--",
      `${NOM_APP}, des artisans qui achètent ensemble.`,
    ].join("\n"),
  };
}
