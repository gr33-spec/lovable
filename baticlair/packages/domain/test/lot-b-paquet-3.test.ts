import { BARDAGE_REFERENTIAL, CHARPENTE_REFERENTIAL, ETANCHEITE_REFERENTIAL, FACADE_REFERENTIAL } from "../src/index.js";
import { describePaquet, type Metier } from "./support/paquet.js";

/**
 * LOT B, PAQUET 3 : charpente, étanchéité, bardage, façade. Un devis de test par métier, même moteur, mêmes règles (§47.1
 * « Quantité à confirmer », §47.8 questions du comptoir seulement, §40 test du fournisseur). Charpente : des pièces d'une
 * section dans une longueur, jamais des m³ (docs/referentiels/charpentier.md §4). Compte rendu : `docs/lot-b/paquet-3.md`,
 * tableau de Brest compris.
 */
const PAQUET: Metier[] = [
  {
    nom: "Charpente",
    ref: CHARPENTE_REFERENTIAL,
    metier: "charpente",
    bench: [
      { ref: "1", designation: "Remplacement des chevrons 63x75 sapin traité classe 2", quantity: "82", unit: "m²" },
      { ref: "2", designation: "Planches de rive sapin traité", quantity: "24", unit: "ml" },
    ],
    questions: ["Chevrons : en quelle longueur (rampant + débord) ?", "Consommables de pose (pointes, vis, pattes, étain, silicone) : je les ajoute à la liste ?"],
    couleurs: { vert: 0, orange: 2, gris: 0 },
  },
  {
    nom: "Étanchéité",
    ref: ETANCHEITE_REFERENTIAL,
    metier: "etancheite",
    bench: [{ ref: "1", designation: "Étanchéité toiture terrasse bicouche SBS autoprotégée sur isolant PIR", quantity: "48", unit: "m²" }],
    questions: [],
    couleurs: { vert: 0, orange: 1, gris: 0 },
  },
  {
    nom: "Bardage",
    ref: BARDAGE_REFERENTIAL,
    metier: "bardage",
    bench: [{ ref: "1", designation: "Bardage bois claire-voie horizontal sur tasseaux, pare-pluie", quantity: "64", unit: "m²" }],
    questions: ["Bardage : douglas ou mélèze ?", "Consommables de pose (pointes, vis, pattes, étain, silicone) : je les ajoute à la liste ?"],
    couleurs: { vert: 0, orange: 1, gris: 0 },
  },
  {
    nom: "Façade",
    ref: FACADE_REFERENTIAL,
    metier: "facade",
    bench: [
      { ref: "1", designation: "Enduit monocouche gratté, teinte ton pierre", quantity: "95", unit: "m²" },
      { ref: "2", designation: "Isolation thermique par l'extérieur sous enduit, laine de roche 140 mm", quantity: "120", unit: "m²" },
    ],
    questions: [],
    couleurs: { vert: 0, orange: 2, gris: 0 },
  },
];

describePaquet(3, "charpente, étanchéité, bardage, façade", PAQUET);
