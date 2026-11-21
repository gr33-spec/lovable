import type { BlocMetier } from "./socle.js";

/** COUVERTURE : le vocabulaire du comptoir (référentiel couverture de Greg) et des réponses réelles. */
export const BLOC_COUVERTURE: BlocMetier = {
  metier: "couverture",
  nom: "Couverture",
  vocabulaire: [
    "« 32 22 », « 32×22 », « 35 25 » : le format d'une ardoise, en centimètres.",
    "« 1er choix », « premier choix », « Espagne », « Angers » : la qualité et l'origine d'une ardoise.",
    "« crochet de 100 », « inox de 11 » : la longueur du crochet d'ardoise (100 mm, 11 cm).",
    "« lito », « litteau » : le liteau ; « 27 40 » : sa section 27 × 40 mm.",
    "« volige », « écran », « HPV », « pare-pluie » : le support et l'écran sous toiture.",
    "« bord de mer », « sur le port », « face à la mer » : chantier en bord de mer ; « dans les terres », « à la campagne » : intérieur des terres.",
    "Une pente se dit en degrés ; un pourcentage n'est pas une pente en degrés et ne se convertit pas.",
  ],
  exemples: [
    { questions: ["Quelle ardoise : origine et choix ? (Espagne 1er choix, Ardoise NF)", "Pente du toit ? (30°, 35°, 45°)"], reponse: "espagne, 38", compris: ["Espagne 1er choix", "38 (valeur écrite, en degrés)"] },
    { questions: ["Quelle ardoise : origine et choix ? (Espagne 1er choix, Ardoise NF)"], reponse: "ardoise d'angers", compris: ["Ardoise d'Angers (réponse écrite, aucun bouton)"] },
  ],
};
