/**
 * LES PRÉCISIONS LUES DANS UNE DÉSIGNATION, POUR L'ÉCRAN « J'AI COMPRIS » (Greg, 7 novembre 2026) : origine, qualité,
 * marque, référence de taille, gamme, matière, développé. Sans import (le site l'utilise tel quel). Purement d'affichage :
 * le rapprochement, lui, passe par la référence stricte (`reference-stricte.ts`).
 */
const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const ORIGINES: readonly [RegExp, string][] = [
  [/\bespagn(e|ol|ole|oles)\b/, "Espagne"],
  [/\b(france|francais|francaise|angers|trelaze)\b/, "France"],
  [/\b(pays de galles|galles|gallois)\b/, "Pays de Galles"],
  [/\bportug(al|ais|aise)\b/, "Portugal"],
  [/\bbresil(ien|ienne)?\b/, "Brésil"],
  [/\bchin(e|ois|oise)\b/, "Chine"],
];
const QUALITES: readonly [RegExp, string][] = [
  [/\b(1er|1ere|premier|premiere) choix\b/, "1er choix"],
  [/\b(2e|2eme|second|seconde|deuxieme) choix\b/, "2e choix"],
  [/\b(3e|3eme|troisieme) choix\b/, "3e choix"],
  [/\bextra\b/, "extra"],
];
const MARQUES = /\b(cupa|samaca|vmzinc|elzinc|rheinzink|nedzink|eternit|edilians|imerys|monier|terreal|isover|rockwool|ursa|knauf|siniat|fakro|roto|koramic|wienerberger)\b/;
const MATIERES: readonly [RegExp, string][] = [
  [/\bzinc\b/, "zinc"],
  [/\bpvc\b/, "PVC"],
  [/\b(alu|aluminium)\b/, "alu"],
  [/\bcuivre\b/, "cuivre"],
  [/\binox\b/, "inox"],
];

export function precisionsLisibles(designation: string): string[] {
  const t = ` ${sansAccent(designation)} `;
  const out: string[] = [];
  const origine = ORIGINES.find(([re]) => re.test(t));
  if (origine) out.push(origine[1]);
  const qualite = QUALITES.find(([re]) => re.test(t));
  if (qualite) out.push(qualite[1]);
  const marque = MARQUES.exec(t)?.[1];
  if (marque) out.push(marque.charAt(0).toUpperCase() + marque.slice(1));
  if (/\b(velux|fenetres? de toit)\b/.test(t)) {
    const ref = /\b([a-z]{1,2}\d{2})\b/.exec(t)?.[1];
    if (ref) out.push(ref.toUpperCase());
    const gamme = /\b(ggl|ggu|gpl|gpu|ghl|ghu|gtl|gtu)\b/.exec(t)?.[1];
    if (gamme) out.push(gamme.toUpperCase());
  }
  const matiere = MATIERES.find(([re]) => re.test(t));
  if (matiere) out.push(matiere[1]);
  const dev = /\b(?:dev|developpe)\.? ?(\d{2,3})\b/.exec(t)?.[1];
  if (dev) out.push(`dév. ${dev}`);
  return out;
}
