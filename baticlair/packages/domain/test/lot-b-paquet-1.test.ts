import { CARRELAGE_REFERENTIAL, MACONNERIE_REFERENTIAL, PEINTURE_REFERENTIAL, PLATRERIE_REFERENTIAL } from "../src/index.js";
import { describePaquet, type Metier } from "./support/paquet.js";

/**
 * LOT B, PAQUET 1 (« tous les métiers calculent ») : plâtrerie-isolation, carrelage, peinture, maçonnerie. Un devis de
 * test par métier passe par le même moteur que le couvreur. À l'ouverture, une ligne calculée avec un ratio « à
 * vérifier » sort orange avec son chiffre et « Quantité à confirmer : … » (§47.1) ; les seules questions sont celles du
 * comptoir. Répondu, chaque ligne du PDF se charge au comptoir sans rappeler l'artisan (§40). Le compte rendu du paquet
 * (`docs/lot-b/paquet-1.md`) est écrit par ce test, tableau de Brest compris : il casse si l'un d'eux bouge.
 */
const PAQUET: Metier[] = [
  {
    nom: "Plâtrerie, isolation",
    ref: PLATRERIE_REFERENTIAL,
    metier: "platrerie",
    bench: [
      {
        ref: "1",
        designation: "Cloison 72/48 BA13 sur ossature",
        quantity: "40",
        unit: "m²",
      },
      {
        ref: "2",
        designation: "Doublage collé Doublissimo 10+80",
        quantity: "55",
        unit: "m²",
      },
      {
        ref: "3",
        designation: "Plafond suspendu BA13 sur fourrures F530",
        quantity: "60",
        unit: "m²",
      },
      {
        ref: "4",
        designation: "Isolation combles perdus laine soufflée R7",
        quantity: "80",
        unit: "m²",
      },
    ],
    questions: ["Consommables de pose (pointes, vis, pattes, étain, silicone) : je les ajoute à la liste ?"],
    couleurs: { vert: 2, orange: 2, gris: 0 },
  },
  {
    nom: "Carrelage",
    ref: CARRELAGE_REFERENTIAL,
    metier: "carrelage",
    bench: [
      {
        ref: "1",
        designation: "Fourniture et pose carrelage sol grès cérame 60x60 rectifié, pose droite",
        quantity: "42",
        unit: "m²",
      },
      {
        ref: "2",
        designation: "Faïence murale salle de bains 25x40",
        quantity: "18",
        unit: "m²",
      },
      {
        ref: "3",
        designation: "Plinthes assorties",
        quantity: "30",
        unit: "ml",
      },
      {
        ref: "4",
        designation: "Douche à l'italienne : SPEC sol et murs",
        quantity: "6",
        unit: "m²",
      },
      {
        ref: "5",
        designation: "Ragréage autolissant",
        quantity: "42",
        unit: "m²",
      },
    ],
    questions: [],
    couleurs: { vert: 0, orange: 5, gris: 0 },
  },
  {
    nom: "Peinture",
    ref: PEINTURE_REFERENTIAL,
    metier: "peinture",
    bench: [
      {
        ref: "1",
        designation: "Peinture murs séjour, 2 couches",
        quantity: "85",
        unit: "m²",
      },
      {
        ref: "2",
        designation: "Peinture plafonds mate, impression + 2 couches",
        quantity: "40",
        unit: "m²",
      },
      {
        ref: "3",
        designation: "Enduit de lissage, ratissage murs",
        quantity: "85",
        unit: "m²",
      },
      {
        ref: "4",
        designation: "Toile de verre à peindre, chambre",
        quantity: "30",
        unit: "m²",
      },
      {
        ref: "5",
        designation: "Papier peint intissé chambre",
        quantity: "25",
        unit: "m²",
      },
      {
        ref: "6",
        designation: "Ravalement façade peinture D2 Pliolite",
        quantity: "120",
        unit: "m²",
      },
    ],
    questions: [],
    couleurs: { vert: 0, orange: 5, gris: 0 },
  },
  {
    nom: "Maçonnerie",
    ref: MACONNERIE_REFERENTIAL,
    metier: "maconnerie",
    bench: [
      {
        ref: "1",
        designation: "Mur porteur en parpaings, garage",
        quantity: "48",
        unit: "m²",
      },
      {
        ref: "2",
        designation: "Mur en brique Porotherm R20",
        quantity: "30",
        unit: "m²",
      },
      {
        ref: "3",
        designation: "Dallage béton 12 cm sur hérisson, treillis ST25C",
        quantity: "40",
        unit: "m²",
      },
      {
        ref: "4",
        designation: "Chape ciment 5 cm",
        quantity: "35",
        unit: "m²",
      },
      {
        ref: "5",
        designation: "Enduit monocouche gratté",
        quantity: "60",
        unit: "m²",
      },
      {
        ref: "6",
        designation: "Semelle filante 50x25",
        quantity: "28",
        unit: "ml",
      },
    ],
    questions: ["Parpaings de 20, de 15 ou de 10 ?"],
    couleurs: { vert: 0, orange: 6, gris: 0 },
  },
];

describePaquet(1, "plâtrerie, carrelage, peinture, maçonnerie", PAQUET);
