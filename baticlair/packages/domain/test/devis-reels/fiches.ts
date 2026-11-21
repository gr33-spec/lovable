import { parseFiche, type FicheChantier } from "../../src/index.js";

/**
 * §51.1 : la fiche de chantier telle que l'IA la rend pour chacun des trois devis du test permanent (format technique du
 * prompt de lecture, « fiche »). Chaque donnée porte son origine : lue au devis (avec la phrase), déduite (avec la règle)
 * ou manquante. Rien qui ne vienne du devis (règle numéro un).
 */
export const FICHE_D2026_018: FicheChantier = parseFiche([
  { donnee: "ouvrage", valeur: "couverture zinc à joint debout", origine: "lue", preuve: "Ligne 1 : « Couverture zinc joint debout »" },
  { donnee: "matériau", valeur: "zinc prépatiné Quartz-Zinc 0,65 mm", origine: "lue", preuve: "Ligne 1 : « zinc prépatiné gris quartz (type Quartz-Zinc) »" },
  { donnee: "surface", valeur: "91 m²", origine: "lue", preuve: "Ligne 1 : 91 m²" },
  { donnee: "rampant", valeur: "7 m", origine: "lue", preuve: "Ligne 1 : « rampant de 7 m »" },
  { donnee: "largeur", valeur: "13 m", origine: "lue", preuve: "Ligne 1 : « largeur de 13 m »" },
  { donnee: "pente", valeur: "10°", origine: "lue", preuve: "Ligne 1 : « Pente de la toiture à environ 10° »" },
  { donnee: "nombre de descentes", valeur: "2", origine: "deduite", regle: "une descente par naissance ; « moignons, naissances » au pluriel sur 13 m de gouttière : 2" },
  { donnee: "rives", valeur: "2 rives de 7 m", origine: "lue", preuve: "Ligne 4 : « 7 m par côté »" },
  { donnee: "façonnage", valeur: null, origine: "manquante" },
])!;

export const FICHE_D2026_020: FicheChantier = parseFiche([
  { donnee: "ouvrage", valeur: "couverture en ardoises naturelles", origine: "lue", preuve: "Ligne 1" },
  { donnee: "matériau", valeur: "ardoises naturelles 32×22, crochets inox de 11", origine: "lue", preuve: "Ligne 1" },
  { donnee: "surface", valeur: "48 m²", origine: "lue", preuve: "Ligne 1 : 48 m²" },
  { donnee: "pente", valeur: "30°", origine: "lue", preuve: "Ligne 2 : « rampant (pente 30°) »" },
  { donnee: "nombre de descentes", valeur: "2", origine: "lue", preuve: "Ligne 12 : « 2 descentes de 3 mètres »" },
  { donnee: "diamètre des descentes", valeur: "80 mm", origine: "lue", preuve: "Ligne 12 : « diamètre 80 mm »" },
  { donnee: "gouttière", valeur: "Havraise zinc, 10 m", origine: "lue", preuve: "Ligne 3" },
  { donnee: "développé de la gouttière", valeur: null, origine: "manquante" },
])!;

export const FICHE_D2026_105: FicheChantier = parseFiche([
  { donnee: "ouvrage", valeur: "réparation de couverture en tuiles", origine: "lue", preuve: "Ligne 1" },
  { donnee: "matériau", valeur: "tuile terre cuite mécanique", origine: "lue", preuve: "Ligne 1 : « Tuile terre cuite mécanique »" },
  { donnee: "tuiles à remplacer", valeur: "20", origine: "lue", preuve: "Ligne 1 : 20 u" },
  { donnee: "modèle et teinte de tuile", valeur: null, origine: "manquante" },
  { donnee: "élément de rive", valeur: null, origine: "manquante" },
])!;
