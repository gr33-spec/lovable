import type { QuoteLineInput } from "../support/read-quote.js";

/**
 * Devis client réel D-2026-018 (couverture zinc à joint debout + zinguerie, 91 m²), testé par le fondateur le 2026-10-07.
 * ANONYMISÉ : seules les désignations, quantités et unités sont gardées (ni noms, ni adresses, ni prix). Titre et
 * description de chaque ligne réunis, comme la lecture les rend.
 */
export const D2026_018_LINES: QuoteLineInput[] = [
  { ref: "1", designation: "Couverture zinc joint debout - Gris quartz (Fourniture et pose) Réalisation complète d'une couverture en zinc prépatiné gris quartz (type Quartz-Zinc) posée à joint debout sur voligeage. Pente de la toiture à environ 10°, rampant de 7 m et largeur de 13 m. Comprend l'ensemble des fournitures (zinc, pattes en inox fixes et coulissantes, fixations) et la main d'œuvre d'exécution.", quantity: "91", unit: "m²" },
  { ref: "2", designation: "Gouttière demi-ronde à l'aval en zinc quartz (Fourniture et pose) Fourniture et pose complète de gouttière demi-ronde (développé 25) en zinc prépatiné gris quartz posée en bas de pente (à l'aval). Comprend les profilés de gouttière, crochets, moignons, naissances, façonnage des soudures et pose.", quantity: "13", unit: "m" },
  { ref: "3", designation: "Bande de ventilation en Z en zinc quartz (Fourniture et pose) Fourniture et pose de bandes de ventilation perforées pliées en Z en zinc prépatiné gris quartz pour assurer la ventilation en sous-face de la couverture en joint debout.", quantity: "13", unit: "m" },
  { ref: "4", designation: "Habillage de rive en zinc quartz - Dév. 200 (Fourniture et pose) Fourniture et pose de bandes d'habillage de rive sur mesure en zinc prépatiné gris quartz, développé de 20 cm, pour les finitions des rives latérales (7 m par côté). Comprend le pliage, l'alignement et les fixations.", quantity: "14", unit: "m" },
  { ref: "5", designation: "Voligeage en sapin traité 18x200 mm (Fourniture et pose) Fourniture et pose de voliges en sapin traité, de section 18 x 200 mm, posées jointives sur la charpente existante afin de réaliser le support requis pour la couverture en zinc à joint debout.", quantity: "91", unit: "m²" },
];
