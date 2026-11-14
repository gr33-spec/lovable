import { croiser, produit, type ArticleCatalogue } from "../catalogue.js";

/**
 * COUVERTURE, COMPLÉMENTS (Greg, 12 novembre 2026 : « continue d'alimenter la base en couverture, zinguerie,
 * étanchéité »). Ce que le catalogue ne proposait pas : pièces de rive et de faîtage des tuiles, accessoires du bac acier
 * et des plaques, bardeaux bitumés, sorties de toit, compléments de fenêtres de toit, sous-toiture, fixations, entretien.
 * Génériques, sans marque. Les articles s'AJOUTENT : aucune clé existante ne change. Un produit sans format sûr n'a pas
 * de variante : l'artisan précise.
 */
const M = "couverture" as const;
const TEINTES_BAC = ["anthracite", "rouge tuile", "brun", "gris clair"];

export const COUVERTURE_COMPLEMENTS: readonly ArticleCatalogue[] = [
  // Accessoires de tuiles
  ...produit(M, "Accessoires de tuiles", "Tuile de rive", "pièces", ["gauche", "droite", "universelle"], { synonymes: ["rive", "tuile de rive", "rive individuelle"] }),
  ...produit(M, "Accessoires de tuiles", "Tuile d'about de rive", "pièces", ["gauche", "droite"], { synonymes: ["about", "about de rive"] }),
  ...produit(M, "Accessoires de tuiles", "About de faîtière", "pièces", ["début", "fin"], { synonymes: ["about", "about de faitage", "fronton"] }),
  ...produit(M, "Accessoires de tuiles", "Faîtière angulaire", "pièces", [null], { synonymes: ["faitiere", "faitage", "faitiere angulaire"] }),
  ...produit(M, "Accessoires de tuiles", "Faîtière ventilée", "pièces", [null], { synonymes: ["faitiere", "faitage ventile", "ventilation"] }),
  ...produit(M, "Accessoires de tuiles", "Rencontre de faîtage", "pièces", ["3 voies", "4 voies"], { synonymes: ["rencontre", "poincon", "croisement de faitage"] }),
  ...produit(M, "Accessoires de tuiles", "Poinçon de faîtage", "pièces", [null], { synonymes: ["poincon", "epi de faitage", "epi"] }),
  ...produit(M, "Accessoires de tuiles", "Tuile de sous-faîtage", "pièces", [null], { synonymes: ["sous faitiere", "sous faitage", "tuile de faitage"] }),
  ...produit(M, "Accessoires de tuiles", "Tuile d'égout", "pièces", [null], { synonymes: ["egout", "tuile d egout", "tuile de bas de pente"] }),
  ...produit(M, "Accessoires de tuiles", "Lanterne de ventilation", "pièces", ["Ø 100", "Ø 125", "Ø 150"], { synonymes: ["lanterne", "sortie de ventilation", "tuile a douille"] }),
  ...produit(M, "Accessoires de tuiles", "Tuile de ventilation", "pièces", [null], { synonymes: ["chatiere", "tuile chatiere", "ventilation"] }),
  ...produit(M, "Accessoires de tuiles", "Clip de faîtière", "boîtes", [null], { synonymes: ["clip", "clips", "crochet de faitiere", "fixation faitiere"] }),
  ...produit(M, "Accessoires de tuiles", "Mortier de scellement de faîtage", "sacs", ["25 kg"], { synonymes: ["mortier", "mortier batard", "scellement", "embarrure"] }),
  ...produit(M, "Accessoires de tuiles", "Crochet pare-tempête", "boîtes", [null], { synonymes: ["pare tempete", "crochet tempete", "fixation tuile"] }),
  // Bardeaux bitumés
  ...produit(M, "Bardeaux bitumés", "Bardeau bitumé", "paquets", croiser(["rectangulaire", "queue de castor", "hexagonal"], ["noir", "rouge", "vert", "brun"]), { synonymes: ["bardeau", "shingle", "bardeaux", "tuile bitumee", "bardeau d asphalte"] }),
  ...produit(M, "Bardeaux bitumés", "Faîtière pour bardeaux bitumés", "paquets", [null], { synonymes: ["faitiere bardeau", "faitage shingle"] }),
  ...produit(M, "Bardeaux bitumés", "Sous-couche bitumée pour bardeaux", "rouleaux", [null], { synonymes: ["sous couche", "feutre bitume", "ecran bardeau"] }),
  ...produit(M, "Bardeaux bitumés", "Colle bitume pour bardeaux", "cartouches", ["310 ml"], { synonymes: ["colle bardeau", "colle shingle", "mastic bitume"] }),
  ...produit(M, "Bardeaux bitumés", "Pointe à tête large galvanisée", "boîtes", [null], { synonymes: ["pointe bardeau", "clou shingle", "pointe tete large"] }),
  // Bacs et plaques : accessoires
  ...produit(M, "Bacs et plaques", "Faîtière bac acier", "longueurs de 2 m", croiser(["simple", "double", "contre mur"], TEINTES_BAC), { synonymes: ["faitiere bac", "faitage bac acier", "faitiere tole"] }),
  ...produit(M, "Bacs et plaques", "Rive bac acier", "longueurs de 2 m", TEINTES_BAC, { synonymes: ["rive bac", "bande de rive bac acier", "rive tole"] }),
  ...produit(M, "Bacs et plaques", "Solin bac acier", "longueurs de 2 m", TEINTES_BAC, { synonymes: ["solin bac", "bande de solin tole"] }),
  ...produit(M, "Bacs et plaques", "Bande d'égout bac acier", "longueurs de 2 m", TEINTES_BAC, { synonymes: ["egout bac", "larmier bac acier"] }),
  ...produit(M, "Bacs et plaques", "Plaque translucide pour bac acier", "plaques", ["polyester", "polycarbonate"], { synonymes: ["translucide", "plaque eclairante", "tole translucide"] }),
  ...produit(M, "Bacs et plaques", "Panneau tuile acier", "plaques", TEINTES_BAC, { synonymes: ["panneau tuile", "tole tuile", "tole imitation tuile", "tuile metallique"] }),
  ...produit(M, "Bacs et plaques", "Tôle ondulée galvanisée", "plaques", ["2 m", "2,5 m", "3 m"], { synonymes: ["tole ondulee", "tole galva", "tole"] }),
  ...produit(M, "Bacs et plaques", "Faîtière pour plaque fibres-ciment", "pièces", [null], { synonymes: ["faitiere fibro", "faitage plaque ondulee"] }),
  ...produit(M, "Bacs et plaques", "Faîtière pour plaque bitumée", "pièces", ["noir", "rouge", "vert", "brun"], { synonymes: ["faitiere plaque bitumee", "faitage plaque ondulee"] }),
  ...produit(M, "Bacs et plaques", "Tire-fond pour plaque ondulée", "boîtes de 100", [null], { synonymes: ["tire fond", "tirefond", "fixation plaque"] }),
  ...produit(M, "Bacs et plaques", "Pointe à tête plastique pour plaque bitumée", "boîtes de 100", ["noir", "rouge", "vert", "brun"], { synonymes: ["pointe plaque", "clou plaque bitumee"] }),
  ...produit(M, "Bacs et plaques", "Bande d'étanchéité mousse pour plaque ondulée", "m", [null], { synonymes: ["closoir mousse", "bande mousse", "closoir plaque"] }),
  // Écrans et sous-toiture
  ...produit(M, "Écrans et pare-vapeur", "Écran sous-toiture bitumé", "rouleaux", [null], { synonymes: ["ecran", "feutre bitume", "ecran bitume", "sous toiture"] }),
  ...produit(M, "Écrans et pare-vapeur", "Bande d'égout ventilée", "longueurs", [null], { synonymes: ["bande d egout", "egout ventile", "larmier"] }),
  ...produit(M, "Écrans et pare-vapeur", "Bande de raccord pour écran", "rouleaux", [null], { synonymes: ["bande de raccord", "bande butyle", "raccord ecran"] }),
  ...produit(M, "Écrans et pare-vapeur", "Manchon d'étanchéité pour écran", "pièces", [null], { synonymes: ["manchon", "oeillet", "traversee d ecran"] }),
  ...produit(M, "Écrans et pare-vapeur", "Pare-pluie", "rouleaux", [null], { synonymes: ["pare pluie", "parepluie"] }),
  // Sorties de toit
  ...produit(M, "Sorties de toit", "Sortie de toit pour conduit de fumée", "pièces", ["pente 30 à 45 %", "pente 45 à 100 %"], { synonymes: ["sortie de toit", "sortie de toiture", "souche", "cheminee"] }),
  ...produit(M, "Sorties de toit", "Solin de conduit de fumée", "pièces", ["Ø 80 à 130", "Ø 150 à 200", "Ø 230 à 280"], { synonymes: ["solin", "embase d etancheite", "solin poele", "collerette"] }),
  ...produit(M, "Sorties de toit", "Sortie de toit pour ventilation", "pièces", ["Ø 125", "Ø 150", "Ø 160"], { synonymes: ["sortie vmc", "chapeau de toiture", "sortie de toiture", "chapeau vmc"] }),
  ...produit(M, "Sorties de toit", "Abergement souple pour conduit", "pièces", [null], { synonymes: ["abergement", "embase souple", "manchon de toiture"] }),
  ...produit(M, "Sorties de toit", "Conduit de lumière", "pièces", ["Ø 250", "Ø 350"], { synonymes: ["conduit de lumiere", "puits de lumiere", "tube solaire"] }),
  // Fenêtres de toit : compléments
  ...produit(M, "Fenêtres de toit", "Fenêtre de toit à projection", "pièces", ["78×98", "78×118", "114×118"], { synonymes: ["fenetre de toit", "projection", "chassis de toit"] }),
  ...produit(M, "Fenêtres de toit", "Volet roulant pour fenêtre de toit", "pièces", ["78×98", "78×118", "114×118"], { synonymes: ["volet roulant", "volet fenetre de toit"] }),
  ...produit(M, "Fenêtres de toit", "Store d'occultation pour fenêtre de toit", "pièces", ["78×98", "78×118", "114×118"], { synonymes: ["store", "store occultant", "rideau"] }),
  ...produit(M, "Fenêtres de toit", "Collerette d'étanchéité pour fenêtre de toit", "pièces", [null], { synonymes: ["collerette", "sous toiture fenetre", "kit d isolation"] }),
  ...produit(M, "Fenêtres de toit", "Habillage intérieur pour fenêtre de toit", "pièces", [null], { synonymes: ["habillage", "embrasure", "kit d habillage"] }),
  // Fixations
  ...produit(M, "Fixations", "Crochet d'ardoise galvanisé", "boîtes de 500", ["70 mm", "80 mm", "90 mm", "100 mm"], { synonymes: ["crochet", "crochets ardoise", "crochet galva"] }),
  ...produit(M, "Fixations", "Crochet d'ardoise à agrafe", "boîtes de 500", [null], { synonymes: ["crochet agrafe", "crochet a agrafer", "crochet sur liteau"] }),
  ...produit(M, "Fixations", "Vis de fixation de tuile", "boîtes", [null], { synonymes: ["vis tuile", "fixation tuile"] }),
  ...produit(M, "Fixations", "Agrafe pour agrafeuse de couvreur", "boîtes", [null], { synonymes: ["agrafe", "agrafes", "agrafe ecran"] }),
  ...produit(M, "Fixations", "Vis inox pour liteaux", "boîtes", [null], { synonymes: ["vis liteau", "vis inox"] }),
  // Sécurité et accès
  ...produit(M, "Sécurité et accès", "Ligne de vie", "pièces", [null], { synonymes: ["ligne de vie", "ancrage", "point d ancrage"] }),
  ...produit(M, "Sécurité et accès", "Marche de couvreur", "pièces", [null], { synonymes: ["marche", "marchepied de toit", "passerelle"] }),
  ...produit(M, "Sécurité et accès", "Filet de sécurité sous toiture", "m²", [null], { synonymes: ["filet", "filet antichute"] }),
  ...produit(M, "Sécurité et accès", "Bâche de couvreur", "pièces", ["4 × 5 m", "6 × 10 m", "8 × 12 m"], { synonymes: ["bache", "bache de protection", "bachage"] }),
  // Entretien
  ...produit(M, "Entretien de toiture", "Anti-mousse pour toiture", "bidons", ["5 L", "20 L"], { synonymes: ["anti mousse", "antimousse", "demoussant", "demoussage"] }),
  ...produit(M, "Entretien de toiture", "Hydrofuge pour toiture", "bidons", ["5 L", "20 L"], { synonymes: ["hydrofuge", "impermeabilisant", "protection tuiles"] }),
  ...produit(M, "Entretien de toiture", "Peinture pour toiture", "bidons", [null], { synonymes: ["peinture toiture", "resine toiture", "renovation tuiles"] }),
  ...produit(M, "Entretien de toiture", "Fil de cuivre anti-mousse", "rouleaux", [null], { synonymes: ["fil de cuivre", "bande cuivre faitage", "anti mousse"] }),
];
