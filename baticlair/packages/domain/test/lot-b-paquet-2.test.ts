import { CHAUFFAGE_VENTILATION_REFERENTIAL, ELECTRICITE_REFERENTIAL, MENUISERIE_REFERENTIAL, PLOMBERIE_REFERENTIAL } from "../src/index.js";
import { describePaquet, type Metier } from "./support/paquet.js";

/**
 * LOT B, PAQUET 2 : électricité, plomberie, menuiserie, chauffage-ventilation. Un devis de test par métier, même moteur,
 * mêmes règles que le paquet 1 (§47.1 « Quantité à confirmer », §47.8 questions du comptoir seulement, §40 test du
 * fournisseur). Les fenêtres et les climatiseurs partent tels qu'écrits au devis et comptent leurs fournitures de pose
 * (`Slot.orderedAsWritten`). Compte rendu : `docs/lot-b/paquet-2.md`, tableau de Brest compris.
 */
const PAQUET: Metier[] = [
  {
    nom: "Électricité",
    ref: ELECTRICITE_REFERENTIAL,
    metier: "electricite",
    bench: [
      { ref: "1", designation: "Prise de courant 16A 2P+T", quantity: "18", unit: "u" },
      { ref: "2", designation: "Point lumineux simple allumage", quantity: "9", unit: "u" },
      { ref: "3", designation: "Point lumineux va-et-vient", quantity: "3", unit: "u" },
      { ref: "4", designation: "Tableau électrique 3 rangées", quantity: "1", unit: "u" },
    ],
    questions: ["Appareillage : quelle gamme (Céliane, Odace, Dooxie…) ?", "Interrupteurs différentiels : type AC ou type A ?"],
    couleurs: { vert: 4, orange: 5, gris: 0 },
  },
  {
    nom: "Plomberie",
    ref: PLOMBERIE_REFERENTIAL,
    metier: "plomberie",
    bench: [
      { ref: "1", designation: "Alimentation EF/EC en multicouche depuis nourrices, salle de bains et cuisine", quantity: "6", unit: "u" },
      { ref: "2", designation: "Évacuations PVC Ø40 des appareils", quantity: "5", unit: "u" },
      { ref: "3", designation: "Plancher chauffant hydraulique rez-de-chaussée", quantity: "85", unit: "m²" },
    ],
    questions: ["Raccords : à sertir (quel profil : TH, U, B) ou à visser ?"],
    couleurs: { vert: 0, orange: 8, gris: 0 },
  },
  {
    nom: "Menuiserie",
    ref: MENUISERIE_REFERENTIAL,
    metier: "menuiserie",
    bench: [
      { ref: "1", designation: "Fenêtre PVC 2 vantaux 120x125 blanc, pose en rénovation", quantity: "4", unit: "u" },
      { ref: "2", designation: "Porte-fenêtre PVC 2 vantaux 215x140 oscillo-battante", quantity: "1", unit: "u" },
      { ref: "3", designation: "Parquet flottant stratifié chêne naturel", quantity: "38", unit: "m²" },
      { ref: "4", designation: "Plinthes MDF blanches", quantity: "32", unit: "ml" },
    ],
    questions: [],
    couleurs: { vert: 3, orange: 5, gris: 0 },
  },
  {
    nom: "Chauffage, ventilation",
    ref: CHAUFFAGE_VENTILATION_REFERENTIAL,
    metier: "chauffage-ventilation",
    bench: [
      { ref: "1", designation: "VMC simple flux hygroréglable, cuisine + 2 sanitaires", quantity: "1", unit: "u" },
      { ref: "2", designation: "Climatiseur mural monosplit 3,5 kW Daikin Perfera", quantity: "2", unit: "u" },
    ],
    questions: ["VMC : autoréglable, hygro A ou hygro B ?"],
    couleurs: { vert: 3, orange: 3, gris: 0 },
  },
];

describePaquet(2, "électricité, plomberie, menuiserie, chauffage-ventilation", PAQUET);
