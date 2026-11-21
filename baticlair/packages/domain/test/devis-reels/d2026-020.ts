import type { QuoteLineInput } from "../support/read-quote.js";

/**
 * Devis client réel D-2026-020 (ardoises 32×22 + zinguerie, 48 m²), fourni par le fondateur le 2026-10-06. ANONYMISÉ :
 * seules les désignations, quantités et unités sont gardées (ni noms, ni adresses, ni prix). Titre et description de
 * chaque ligne réunis, comme la lecture les rend. Les lignes de pose seule (main-d'œuvre) sont gardées : elles ne doivent
 * rien commander de plus.
 */
export const D2026_020_LINES: QuoteLineInput[] = [
  { ref: "1", designation: "Fourniture d'ardoises naturelles 32x22 et crochets de 11 - Fourniture d'ardoises naturelles de format 32x22 et des crochets de fixation en inox de 11 pour la couverture de l'extension.", quantity: "48", unit: "m²" },
  { ref: "2", designation: "Pose de couverture en ardoises 32x22 - Mise en œuvre et pose de la couverture en ardoises naturelles de format 32x22 avec crochets de 11, y compris découpes et ajustements pour le rampant (pente 30°) et les demi-croupes (pente 45°).", quantity: "48", unit: "m²" },
  { ref: "3", designation: "Fourniture de gouttière Havraise en zinc - Fourniture de gouttières de type Havraise en zinc pour l'évacuation des eaux pluviales (y compris retour d'angle et gouttière au-dessus de la verrière).", quantity: "10", unit: "m" },
  { ref: "4", designation: "Fourniture de crochets de gouttière Havraise - Fourniture de crochets en acier galvanisé ou zinc pour la fixation de la gouttière havraise sur chevrons (espacement tous les 50 cm).", quantity: "20", unit: "unités" },
  { ref: "5", designation: "Pose de gouttière Havraise sur chevrons - Pose et fixation sur chevrons de la gouttière Havraise en zinc et de ses crochets de support, avec réalisation des soudures et raccordements nécessaires.", quantity: "10", unit: "m" },
  { ref: "6", designation: "Fourniture de bandes de rive en zinc (verrière) - Fourniture de bandes de rive en zinc pour la finition latérale de la verrière conservée.", quantity: "4", unit: "m" },
  { ref: "7", designation: "Pose de bandes de rive en zinc (verrière) - Façonnage et pose des bandes de rive en zinc sur les côtés de la verrière.", quantity: "4", unit: "m" },
  { ref: "8", designation: "Fourniture de bande de faîtage zinc dev 25cm - Fourniture de bandes de faîtage en zinc avec un développé de 25 cm pour couronnement de la toiture.", quantity: "8", unit: "m" },
  { ref: "9", designation: "Pose de bande de faîtage en zinc - Pose et fixation de la bande de faîtage en zinc au sommet de la toiture.", quantity: "8", unit: "m" },
  { ref: "10", designation: "Fourniture de bande porte-solin zinc et mortier ciment - Fourniture de la bande porte-solin en zinc et du mortier de ciment nécessaire à la réalisation du solin d'étanchéité contre le mur existant.", quantity: "4", unit: "m" },
  { ref: "11", designation: "Pose de bande porte-solin et réalisation du solin ciment - Pose de la bande porte-solin et réalisation du solin au mortier de ciment pour assurer la jonction étanche entre la toiture et le mur.", quantity: "4", unit: "m" },
  { ref: "12", designation: "Fourniture de tuyau de descente zinc diam. 80mm - Fourniture de tuyaux de descente d'eaux pluviales en zinc de diamètre 80 mm (2 descentes de 3 mètres).", quantity: "6", unit: "m" },
  { ref: "13", designation: "Fourniture de coude zinc diam. 80mm - Fourniture de coudes en zinc de diamètre 80 mm pour le dévoiement des descentes (2 jeux de 2 coudes).", quantity: "4", unit: "unités" },
  { ref: "14", designation: "Pose de tuyaux de descente et coudes zinc - Mise en œuvre, fixation et raccordement des tuyaux de descente et coudes en zinc sur la maçonnerie ou charpente.", quantity: "6", unit: "m" },
];
