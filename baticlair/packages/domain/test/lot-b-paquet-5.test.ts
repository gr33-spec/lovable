import { ARROSAGE_REFERENTIAL, CONSTRUCTEUR_REFERENTIAL, PAVAGE_REFERENTIAL, TERRASSE_BOIS_REFERENTIAL, TERRASSEMENT_REFERENTIAL } from "../src/index.js";
import { describePaquet, type Metier } from "./support/paquet.js";

/**
 * LOT B, PAQUET 5 : terrasse bois, pavage, terrassement, arrosage, et le constructeur de maisons (entreprise générale),
 * dont le devis passe par tous les lots : chaque ligne est calculée par le tiroir de son lot (`composeReferentials`).
 * Un devis de test par métier, même moteur, mêmes règles (§47.1, §47.8, §40). Compte rendu : `docs/lot-b/paquet-5.md`,
 * tableau de Brest compris.
 */
const PAQUET: Metier[] = [
  {
    nom: "Terrasse bois",
    ref: TERRASSE_BOIS_REFERENTIAL,
    metier: "terrasse-bois",
    bench: [{ ref: "1", designation: "Terrasse bois pin classe 4 sur lambourdes et plots réglables", quantity: "32", unit: "m²" }],
    questions: ["Consommables de pose (pointes, vis, pattes, étain, silicone) : je les ajoute à la liste ?"],
    couleurs: { vert: 0, orange: 1, gris: 0 },
  },
  {
    nom: "Pavage",
    ref: PAVAGE_REFERENTIAL,
    metier: "pavage",
    bench: [
      { ref: "1", designation: "Allée de garage en pavés béton gris sur lit de sable", quantity: "45", unit: "m²" },
      { ref: "2", designation: "Bordures béton T2", quantity: "28", unit: "ml" },
    ],
    questions: [],
    couleurs: { vert: 0, orange: 2, gris: 0 },
  },
  {
    nom: "Terrassement",
    ref: TERRASSEMENT_REFERENTIAL,
    metier: "terrassement",
    bench: [
      { ref: "1", designation: "Couche de forme GNT 0/31,5 ép 20 cm sous dallage", quantity: "60", unit: "m²" },
      { ref: "2", designation: "Film polyane sous dallage", quantity: "60", unit: "m²" },
      { ref: "3", designation: "Fosse toutes eaux, maison 5 pièces", quantity: "1", unit: "u" },
    ],
    questions: [],
    couleurs: { vert: 1, orange: 2, gris: 0 },
  },
  {
    nom: "Arrosage",
    ref: ARROSAGE_REFERENTIAL,
    metier: "arrosage",
    bench: [{ ref: "1", designation: "Arrosage automatique enterré de la pelouse, tuyères, 4 zones", quantity: "300", unit: "m²" }],
    questions: [],
    couleurs: { vert: 0, orange: 1, gris: 0 },
  },
  {
    nom: "Constructeur, entreprise générale",
    ref: CONSTRUCTEUR_REFERENTIAL,
    metier: "constructeur",
    bench: [
      { ref: "1", designation: "Dallage béton 12 cm sur hérisson, treillis ST25C", quantity: "90", unit: "m²" },
      { ref: "2", designation: "Mur en parpaings de 20", quantity: "110", unit: "m²" },
      { ref: "3", designation: "Cloison 72/48 BA13 sur ossature", quantity: "65", unit: "m²" },
      { ref: "4", designation: "Prise de courant 16A 2P+T, gamme Dooxie", quantity: "24", unit: "u" },
      { ref: "5", designation: "Carrelage sol grès cérame 60x60 rectifié, pose droite", quantity: "75", unit: "m²" },
      { ref: "6", designation: "Peinture murs et plafonds mate, 2 couches", quantity: "260", unit: "m²" },
    ],
    questions: ["Consommables de pose (pointes, vis, pattes, étain, silicone) : je les ajoute à la liste ?"],
    couleurs: { vert: 2, orange: 4, gris: 0 },
  },
];

describePaquet(5, "terrasse bois, pavage, terrassement, arrosage, constructeur", PAQUET);
