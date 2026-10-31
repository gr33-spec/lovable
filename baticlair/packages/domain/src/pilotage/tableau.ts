/**
 * LE TABLEAU DE BORD ADMIN (Greg, 24 octobre 2026) : une page lisible sur iPhone, sans jargon. Ce fichier ne fait que les
 * petits calculs d'affichage (flèches, taux, euros) ; les chiffres viennent de l'API, agrégés.
 */

/** La flèche d'un chiffre par rapport au mois précédent : verte quand ça va dans le bon sens, rouge sinon. */
export interface Fleche {
  sens: "haut" | "bas" | "egal";
  couleur: "vert" | "rouge" | "gris";
  /** « +12 % », « −3 % », « = », ou « nouveau » quand il n'y avait rien le mois d'avant. */
  texte: string;
}

export function flecheDe(actuel: number, precedent: number, bonSens: "haut" | "bas" = "haut"): Fleche {
  if (actuel === precedent) return { sens: "egal", couleur: "gris", texte: "=" };
  const sens = actuel > precedent ? "haut" : "bas";
  const couleur = sens === bonSens ? "vert" : "rouge";
  if (precedent === 0) return { sens, couleur, texte: "nouveau" };
  const pct = Math.round(((actuel - precedent) / Math.abs(precedent)) * 100);
  return { sens, couleur, texte: `${pct > 0 ? "+" : "−"}${Math.abs(pct)} %` };
}

/** Un taux en pour cent, à une décimale ; null sans base. */
export const taux = (n: number, sur: number): number | null => (sur > 0 ? Math.round((n / sur) * 1000) / 10 : null);

/** « 1 234 € », sans centimes. */
export const eurosEntiers = (e: number): string => `${Math.round(e).toLocaleString("fr-FR")} €`;

/** Les réglages du pilotage, modifiables dans l'admin. */
export interface ReglagesPilotage {
  /** Au-delà de ce coût IA sur une journée, un e-mail part aux admins (une fois par jour). */
  seuilIaJourEur: number;
  /** Les services payés chaque mois (hébergement, base, e-mails), retirés du revenu pour la rentabilité. */
  coutServicesMensuelEur: number;
}
export const REGLAGES_PILOTAGE_DEFAUT: ReglagesPilotage = { seuilIaJourEur: 5, coutServicesMensuelEur: 0 };

/** La rentabilité du mois : revenu HT − coût IA − services. */
export const rentabilite = (revenuHtEur: number, coutIaEur: number, servicesEur: number): number => Math.round((revenuHtEur - coutIaEur - servicesEur) * 100) / 100;
