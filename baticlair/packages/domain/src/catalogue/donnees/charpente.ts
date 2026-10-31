import { croiser, produit, type ArticleCatalogue } from "../catalogue.js";

/**
 * CHARPENTE (relecture de Greg en premier). Bois de charpente : produit › « section · longueur · classe » ; la classe
 * d'emploi est celle du traitement (2 : sous abri, 3 : extérieur). Sapin-épicéa (résineux) sauf mention.
 */
const M = "charpente" as const;
const classes = ["classe 2", "classe 3"];
const bois = (sections: string[], longueurs: string[]) => croiser(croiser(sections, longueurs), classes);

export const CHARPENTE: readonly ArticleCatalogue[] = [
  // Bois de charpente (résineux)
  ...produit(M, "Bois de charpente", "Panne", "pièces", bois(["75×175", "75×200", "75×225", "75×250", "100×200", "100×225"], ["4 m", "5 m", "6 m", "7 m", "8 m"]), { synonymes: ["panne", "pannes", "panne faîtière", "panne sablière", "panne intermédiaire", "ventrière"] }),
  ...produit(M, "Bois de charpente", "Chevron", "pièces", bois(["63×75", "75×75", "75×100", "50×75"], ["3 m", "4 m", "5 m", "6 m"]), { synonymes: ["chevron", "chevrons", "chevronnage"] }),
  ...produit(M, "Bois de charpente", "Bastaing", "pièces", bois(["63×175", "63×150", "50×150"], ["4 m", "5 m", "6 m"]), { synonymes: ["bastaing", "basting", "bastaings"] }),
  ...produit(M, "Bois de charpente", "Madrier", "pièces", bois(["75×225", "75×200", "100×225"], ["4 m", "5 m", "6 m"]), { synonymes: ["madrier", "madriers"] }),
  ...produit(M, "Bois de charpente", "Solive", "pièces", bois(["63×175", "75×200", "75×225"], ["4 m", "5 m", "6 m"]), { synonymes: ["solive", "solivage", "plancher"] }),
  ...produit(M, "Bois de charpente", "Poutre", "pièces", bois(["150×150", "200×200", "150×300", "200×300"], ["4 m", "5 m", "6 m", "8 m"]), { synonymes: ["poutre", "entrait", "arbalétrier", "poinçon"] }),
  ...produit(M, "Bois de charpente", "Lambourde", "pièces", croiser(["45×70", "50×75", "63×75"], ["4 m", "5 m"]), { synonymes: ["lambourde", "lambourdes"] }),
  ...produit(M, "Bois de charpente", "Poteau", "pièces", bois(["100×100", "120×120", "150×150"], ["2,50 m", "3 m"]), { synonymes: ["poteau", "pilier bois"] }),
  // Lamellé-collé et bois massif reconstitué
  ...produit(M, "Lamellé-collé", "Poutre lamellé-collé GL24h", "pièces", croiser(["90×200", "90×240", "115×280", "140×320", "160×400"], ["6 m", "8 m", "10 m", "12 m"]), { synonymes: ["lamelle colle", "lamellé", "gl24", "bois collé"] }),
  ...produit(M, "Lamellé-collé", "Bois massif reconstitué (BMR) raboté", "pièces", croiser(["60×160", "80×200", "100×200"], ["6 m", "8 m"]), { synonymes: ["bmr", "duo", "trio", "kvh"] }),
  // Panneaux
  ...produit(M, "Panneaux", "Panneau OSB 3", "pièces", croiser(["9 mm", "12 mm", "15 mm", "18 mm", "22 mm"], ["2500×1250", "2500×675 rainuré-bouveté"]), { synonymes: ["osb", "osb3", "panneau osb", "contreventement"] }),
  ...produit(M, "Panneaux", "Contreplaqué CTBX", "pièces", croiser(["10 mm", "15 mm", "18 mm", "22 mm"], ["2500×1220"]), { synonymes: ["contreplaque", "ctbx", "cp", "contre plaqué"] }),
  ...produit(M, "Panneaux", "Panneau de particules CTB-H plancher", "pièces", croiser(["19 mm", "22 mm"], ["2050×600 rainuré-bouveté"]), { synonymes: ["agglo", "aggloméré", "ctbh", "plancher"] }),
  ...produit(M, "Panneaux", "Panneau pare-pluie fibre de bois", "pièces", croiser(["22 mm", "35 mm"], ["2500×600"]), { synonymes: ["fibre de bois", "panneau pare pluie"] }),
  // Connecteurs
  ...produit(M, "Connecteurs et ferrures", "Sabot de charpente", "pièces", ["63×175", "75×200", "75×225", "100×200"], { synonymes: ["sabot", "sabots", "étrier"] }),
  ...produit(M, "Connecteurs et ferrures", "Équerre renforcée", "pièces", ["70×70", "90×90", "105×105"], { synonymes: ["equerre", "equerres", "cornière"] }),
  ...produit(M, "Connecteurs et ferrures", "Étrier à visser", "pièces", ["75", "100"], { synonymes: ["etrier"] }),
  ...produit(M, "Connecteurs et ferrures", "Platine de pied de poteau", "pièces", ["réglable", "à sceller"], { synonymes: ["pied de poteau", "platine"] }),
  ...produit(M, "Connecteurs et ferrures", "Tige filetée galvanisée", "pièces", croiser(["M10", "M12", "M16"], ["1 m"]), { synonymes: ["tige filetée", "tige", "boulonnage"] }),
  ...produit(M, "Connecteurs et ferrures", "Boulon tête hexagonale galvanisé", "boîtes de 25", croiser(["M12", "M16"], ["160 mm", "200 mm", "260 mm"]), { synonymes: ["boulon", "boulons"] }),
  ...produit(M, "Connecteurs et ferrures", "Feuillard perforé", "rouleaux", ["rouleau 10 m largeur 40 mm"], { synonymes: ["feuillard", "contreventement"] }),
  // Fixations
  ...produit(M, "Fixations", "Vis charpente tête fraisée", "boîtes de 100", ["6 × 120", "6 × 160", "8 × 200", "8 × 240"], { synonymes: ["vis", "vis bois", "tirefond"] }),
  ...produit(M, "Fixations", "Tire-fond", "boîtes de 50", ["8 × 80", "10 × 120", "10 × 160"], { synonymes: ["tirefond", "tire fond"] }),
  ...produit(M, "Fixations", "Pointe torsadée galvanisée", "kg", ["3,1 × 80", "3,4 × 90", "4,0 × 100"], { synonymes: ["pointe", "clou", "pointes crantées"] }),
  ...produit(M, "Fixations", "Pointe annelée pour cloueur", "boîtes de 2000", ["2,8 × 50", "3,1 × 90"], { synonymes: ["clou cloueur", "pointes en bande"] }),
  // Traitement
  ...produit(M, "Traitement du bois", "Traitement insecticide fongicide", "bidons", ["5 L", "20 L"], { synonymes: ["xylophene", "traitement charpente", "anti termite", "capricorne"] }),
  ...produit(M, "Traitement du bois", "Produit de traitement des coupes", "pots", ["1 L"], { synonymes: ["traitement coupe", "badigeon"] }),
  // Écrans (côté charpentier)
  ...produit(M, "Écrans et membranes", "Pare-pluie de mur", "rouleaux", ["rouleau 1,50 × 50 m"], { synonymes: ["pare pluie", "membrane", "ecran"] }),
];
