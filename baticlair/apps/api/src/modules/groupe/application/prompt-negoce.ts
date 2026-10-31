import type { LotPourLecture } from "./negoce-extractor.js";

/** La consigne de lecture d'un devis de négoce (étape 5). Le texte est testé : il ne se réécrit pas sans son test. */
export const PROMPT_DEVIS_NEGOCE = { id: "lecture_devis_negoce", version: 1 } as const;

export function consigneDevisNegoce(): string {
  return [
    "Tu lis le devis d'un négoce de matériaux qui répond à une demande de prix groupée d'artisans.",
    "Recopie ce qui est écrit, sans jamais calculer ni arrondir : un palier par ligne qui porte un prix (quantité, unité, prix unitaire HT, total HT, tels qu'imprimés).",
    "Un négoce peut proposer deux paliers de quantité pour la même référence : rends-les tous les deux, dans l'ordre du devis.",
    "Le délai de livraison en jours, seulement s'il est écrit (« sous 10 jours », « 2 semaines » = 14) ; sinon vide.",
    "Le total HT du devis tel qu'écrit, sinon vide. Les frais (livraison, éco-participation) ne sont pas des paliers : note-les dans les doutes.",
    "Chaque chose que tu ne lis pas avec certitude va dans « doutes », en une phrase ; une liste vide veut dire « tout est lu ».",
  ].join("\n");
}

export function contexteDuLot(lot: LotPourLecture): string {
  return `La demande portait sur le lot n° ${lot.numero} : ${lot.designation}, volume ferme ${lot.volumeFerme}, volume probable ${lot.volumeProbable} (unité attendue : ${lot.unite}).`;
}
