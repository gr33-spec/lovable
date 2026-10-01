import type { BenchLine } from "./truth.js";

/**
 * Devis client réel D-2026-015 (couverture, 120 m²), fourni par le fondateur
 * le 2026-10-01. ANONYMISÉ : seules les désignations, quantités et unités
 * sont gardées (ni noms, ni adresses, ni prix, ni coordonnées).
 */
export const D2026_015_LINES: BenchLine[] = [
  {
    ref: "ligne 1",
    designation:
      "Écran de sous-toiture respirant (Fourniture & Pose) - Fourniture et pose d'un écran de sous-toiture HPV (Hautement Perméable à la Vapeur) respirant, posé sur fermettes d'entraxe 90 cm (Surface : 120 m²)",
    quantity: "120",
    unit: "m²",
    truth: "C",
    note: "Écran : m² couverts → rouleaux (recouvrements).",
  },
  {
    ref: "ligne 2",
    designation:
      "Contre-lattage en liteaux 27x40 (Fourniture & Pose) - Fourniture et pose de contre-lattes en liteaux de section 27x40 mm pour la création de la lame d'air (Surface : 120 m²)",
    quantity: "120",
    unit: "m²",
    truth: "C",
  },
  {
    ref: "ligne 3",
    designation:
      "Lattage en liteaux 27x40 pour tuiles HP10 (Fourniture & Pose) - Fourniture et pose de liteaux de section 27x40 mm avec pureau adapté pour tuiles de type HP10 (Surface : 120 m²)",
    quantity: "120",
    unit: "m²",
    truth: "C",
  },
  {
    ref: "ligne 4",
    designation:
      "Couverture en tuiles terre cuite HP10 rouge (Fourniture & Pose) - Fourniture et pose de tuiles en terre cuite grand moule type HP10 de coloris rouge (Surface : 120 m²)",
    quantity: "120",
    unit: "m²",
    truth: "C",
  },
  {
    ref: "ligne 5",
    designation: "Rives de toit (Fourniture & Pose) - Fourniture et pose de tuiles de rive pour la finition des rives latérales (4 rives de 6 m)",
    quantity: "24",
    unit: "m",
    truth: "C",
    note: "24 m de rives → tuiles de rive gauche/droite.",
  },
  {
    ref: "ligne 6",
    designation: "Faîtage (Fourniture & Pose) - Fourniture et pose de faîtières ventilées avec closoir ventilé et accessoires de fixation (Longueur : 10 m)",
    quantity: "10",
    unit: "m",
    truth: "C",
    note: "Faîtières + closoir + fixations.",
  },
  {
    ref: "ligne 7",
    designation:
      "Gouttière PVC de 25 sable (Fourniture & Pose) - Fourniture et pose de gouttières demi-ronde de 25 en PVC de coloris sable, crochets et naissances compris (Longueur : 2 x 10 m)",
    quantity: "20",
    unit: "m",
    truth: "C",
    note: "Profil + crochets + naissances.",
  },
  {
    ref: "ligne 8",
    designation:
      "Descente d'eau pluviale PVC Ø80 avec coudes (Fourniture & Pose) - Fourniture et pose d'un ensemble de descente d'eau pluviale en PVC Ø80 coloris sable, hauteur 4m, comprenant 2 jeux de coudes et les colliers de fixation par descente (2 ensembles au total)",
    quantity: "2",
    unit: "unités",
    truth: "C",
    note: "Tubes + coudes + colliers.",
  },
  {
    ref: "ligne 9",
    designation: "Chatières de ventilation (Fourniture & Pose) - Fourniture et pose de tuiles chatières de ventilation adaptées au modèle HP10 (5 de chaque côté)",
    quantity: "10",
    unit: "unités",
    truth: "D",
    note: "Modèle exact de chatière HP10 à confirmer.",
  },
  {
    ref: "ligne 10",
    designation:
      "Sortie de toit Poujoulat (Fourniture & Pose) - Fourniture et pose d'une sortie de toit complète de marque Poujoulat avec solin d'étanchéité adapté à la tuile HP10",
    quantity: "1",
    unit: "unité",
    truth: "D",
    note: "Modèle et diamètre Poujoulat non écrits.",
  },
];
