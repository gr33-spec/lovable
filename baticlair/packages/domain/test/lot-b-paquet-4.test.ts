import { CUISINE_REFERENTIAL, MENUISERIE_INTERIEURE_REFERENTIAL, PHOTOVOLTAIQUE_REFERENTIAL, PLAFONDS_SUSPENDUS_REFERENTIAL } from "../src/index.js";
import { describePaquet, type Metier } from "./support/paquet.js";

/**
 * LOT B, PAQUET 4 : plafonds suspendus, menuiserie intérieure, cuisine, photovoltaïque. Un devis de test par métier,
 * même moteur, mêmes règles (§47.1, §47.8, §40). Portes, meubles, plans de travail et modules partent tels que le devis
 * les décrit et comptent leurs fournitures (`Slot.orderedAsWritten`). Compte rendu : `docs/lot-b/paquet-4.md`, tableau
 * de Brest compris.
 */
const PAQUET: Metier[] = [
  {
    nom: "Plafonds suspendus",
    ref: PLAFONDS_SUSPENDUS_REFERENTIAL,
    metier: "plafonds-suspendus",
    bench: [{ ref: "1", designation: "Faux plafond démontable dalles minérales 600x600 sur ossature T24 blanche", quantity: "70", unit: "m²" }],
    questions: [],
    couleurs: { vert: 0, orange: 1, gris: 0 },
  },
  {
    nom: "Menuiserie intérieure",
    ref: MENUISERIE_INTERIEURE_REFERENTIAL,
    metier: "menuiserie-interieure",
    bench: [
      { ref: "1", designation: "Bloc-porte isoplane 83x204 huisserie 72, poussant droit", quantity: "5", unit: "u" },
      { ref: "2", designation: "Plinthes MDF blanches collées", quantity: "48", unit: "ml" },
      { ref: "3", designation: "Lambris sapin plafond chambre", quantity: "14", unit: "m²" },
    ],
    questions: ["Consommables de pose (pointes, vis, pattes, étain, silicone) : je les ajoute à la liste ?"],
    couleurs: { vert: 1, orange: 2, gris: 0 },
  },
  {
    nom: "Cuisine",
    ref: CUISINE_REFERENTIAL,
    metier: "cuisine",
    bench: [
      { ref: "1", designation: "Meubles bas Delinia ID façades Ruxe blanc mat", quantity: "6", unit: "u" },
      { ref: "2", designation: "Plan de travail stratifié 38 mm chêne", quantity: "3.6", unit: "ml" },
    ],
    questions: ["Consommables de pose (pointes, vis, pattes, étain, silicone) : je les ajoute à la liste ?"],
    couleurs: { vert: 2, orange: 0, gris: 0 },
  },
  {
    nom: "Photovoltaïque",
    ref: PHOTOVOLTAIQUE_REFERENTIAL,
    metier: "photovoltaique",
    bench: [{ ref: "1", designation: "Panneaux photovoltaïques 425 Wc full black en surimposition sur tuiles", quantity: "10", unit: "u" }],
    questions: [],
    couleurs: { vert: 1, orange: 0, gris: 0 },
  },
];

describePaquet(4, "plafonds suspendus, menuiserie intérieure, cuisine, photovoltaïque", PAQUET);
