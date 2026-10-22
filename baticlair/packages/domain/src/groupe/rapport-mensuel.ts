import { nomCommun } from "./nom.js";
/**
 * LE RAPPORT MENSUEL DE L'ARTISAN (plan 2 du 21 octobre 2026, bloc 4) : le 1er du mois, un e-mail court sur le mois
 * écoulé, « ce mois : X chantiers lus, Y € économisés grâce à la ${nomCommun()}, Z lots ». Tutoiement, aucun nom d'autre artisan, rien
 * à faire. Le texte est la référence ; le HTML le répète en gras.
 */
export interface BilanMensuel {
  /** Le mois écoulé, AAAA-MM. */
  mois: string;
  /** Devis lus par BatiClair pendant le mois (un chantier = un devis déposé). */
  chantiersLus: number;
  /** Somme des économies estimées des offres dont le bon de commande est parti pendant le mois, en euros HT. */
  economies: number;
  /** Lots du groupé dont le bon de commande de l'artisan est parti pendant le mois. */
  lots: number;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** « 2026-10 » → « octobre 2026 ». */
export function nomDuMois(mois: string): string {
  const [annee, m] = mois.split("-");
  return `${MOIS[Number(m) - 1] ?? mois} ${annee}`;
}

/** Le mois écoulé à une date donnée (le 1er novembre à 7 h, c'est octobre), AAAA-MM, en temps universel. */
export function moisEcoule(maintenant: Date): string {
  const d = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Les bornes d'un mois AAAA-MM : [début, fin[ en temps universel. */
export function bornesDuMois(mois: string): { debut: Date; fin: Date } {
  const [annee, m] = mois.split("-").map(Number) as [number, number];
  return { debut: new Date(Date.UTC(annee, m - 1, 1)), fin: new Date(Date.UTC(annee, m, 1)) };
}

/** Rien à dire : aucun devis lu, aucun lot. On n'écrit pas pour dire « rien ». */
export const bilanVide = (b: BilanMensuel): boolean => b.chantiersLus === 0 && b.lots === 0;

const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;
const pluriel = (n: number, un: string, des: string) => `${n} ${n > 1 ? des : un}`;

export function rapportMensuel(b: BilanMensuel, prenom: string | null = null): { objet: string; texte: string; html: string } {
  const mois = nomDuMois(b.mois);
  const chantiers = pluriel(b.chantiersLus, "chantier lu", "chantiers lus");
  const lots = pluriel(b.lots, "lot", "lots");
  const resume = `Ce mois : ${chantiers}, ${euros(b.economies)} économisés grâce à la ${nomCommun()}, ${lots}.`;
  const bonjour = prenom ? `Bonjour ${prenom},` : "Bonjour,";
  const suite =
    b.lots > 0
      ? `${b.lots === 1 ? "Ton lot" : `Tes ${lots}`} de la ${nomCommun()} : bon de commande parti chez le négoce retenu, livraison sur ton chantier, sur ton compte chez lui.`
      : b.chantiersLus > 0
        ? `Pas de lot ce mois-ci : ajoute une ligne de ta liste à la ${nomCommun()} dès que le chantier est signé, le prix se fait avec les autres artisans du département.`
        : "";
  const texte = [bonjour, "", `Ton mois ${deOuD(mois)}${mois} avec BatiClair.`, "", resume, ...(suite ? ["", suite] : []), "", "Rien à faire : c'est juste pour savoir où tu en es.", "", "BatiClair"].join("\n");
  const html = [
    `<p>${bonjour}</p>`,
    `<p>Ton mois ${deOuD(mois)}${mois} avec BatiClair.</p>`,
    `<p><strong>${resume}</strong></p>`,
    ...(suite ? [`<p>${suite}</p>`] : []),
    "<p>Rien à faire : c'est juste pour savoir où tu en es.</p>",
    "<p>BatiClair</p>",
  ].join("\n");
  return { objet: `Ton mois ${deOuD(mois)}${mois} avec BatiClair : ${chantiers}, ${euros(b.economies)} économisés, ${lots}`, texte, html };
}

/** « d'octobre », « de novembre ». */
const deOuD = (mois: string) => (/^[aeiouy]/i.test(mois) ? "d'" : "de ");
