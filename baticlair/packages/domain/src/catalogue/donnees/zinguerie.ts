import { croiser, produit, type ArticleCatalogue } from "../catalogue.js";

/** ZINGUERIE : zinc (aspect, épaisseur), évacuation des eaux pluviales (développé, diamètre), pièces façonnées. */
const M = "zinguerie" as const;
const ASPECTS = ["naturel", "prépatiné quartz", "prépatiné anthracite", "prépatiné pigmenté"];

export const ZINGUERIE: readonly ArticleCatalogue[] = [
  ...produit(M, "Zinc", "Feuille de zinc 2 × 1 m", "pièces", croiser(ASPECTS, ["0,65 mm", "0,80 mm"]), { synonymes: ["zinc", "feuille zinc", "tole zinc"] }),
  ...produit(M, "Zinc", "Bobine de zinc", "m", croiser(croiser(ASPECTS, ["0,65 mm", "0,80 mm"]), ["largeur 500 mm", "largeur 650 mm", "largeur 1000 mm"]), { synonymes: ["bobine", "bobineau", "zinc joint debout"] }),
  ...produit(M, "Zinc", "Bobineau de zinc", "m", croiser(croiser(["naturel", "prépatiné quartz"], ["0,65 mm"]), ["largeur 250 mm", "largeur 330 mm", "largeur 400 mm"]), { synonymes: ["bobineau", "bande zinc"] }),
  ...produit(M, "Zinc", "Patte de joint debout", "boîtes de 100", ["fixe", "coulissante"], { synonymes: ["patte", "pattes joint debout", "patte coulissante"] }),
  // Gouttières
  ...produit(M, "Gouttières", "Gouttière demi-ronde zinc", "longueurs de 4 m", croiser(["dév. 25", "dév. 33", "dév. 40"], ["naturel", "prépatiné quartz"]), { synonymes: ["gouttiere", "chéneau", "gouttière pendante", "demi ronde"] }),
  ...produit(M, "Gouttières", "Gouttière havraise zinc", "longueurs de 4 m", croiser(["dév. 25", "dév. 33"], ["naturel", "prépatiné quartz"]), { synonymes: ["havraise", "gouttiere havraise"] }),
  ...produit(M, "Gouttières", "Gouttière nantaise zinc", "longueurs de 4 m", croiser(["dév. 33", "dév. 40"], ["naturel", "prépatiné quartz"]), { synonymes: ["nantaise", "gouttiere nantaise", "lyonnaise"] }),
  ...produit(M, "Gouttières", "Gouttière PVC demi-ronde", "longueurs de 4 m", croiser(["Ø 25", "Ø 33"], ["gris", "sable", "blanc", "anthracite"]), { synonymes: ["gouttiere pvc", "gouttière plastique"] }),
  ...produit(M, "Gouttières", "Gouttière aluminium", "m", croiser(["dév. 25", "dév. 33"], ["blanc", "anthracite", "marron"]), { synonymes: ["gouttiere alu", "gouttière continue"] }),
  ...produit(M, "Gouttières", "Crochet de gouttière", "pièces", croiser(["dév. 25", "dév. 33", "dév. 40"], ["galvanisé", "acier laqué"]), { synonymes: ["crochet gouttiere", "crochets", "crochet a sceller", "crochet sur chevron"] }),
  ...produit(M, "Gouttières", "Naissance de gouttière zinc", "pièces", croiser(["dév. 25", "dév. 33"], ["Ø 80", "Ø 100"]), { synonymes: ["naissance", "moignon", "descente gouttière"] }),
  ...produit(M, "Gouttières", "Talon de gouttière", "pièces", croiser(["dév. 25", "dév. 33"], ["gauche", "droit"]), { synonymes: ["talon", "fond de gouttière", "embout"] }),
  ...produit(M, "Gouttières", "Angle de gouttière", "pièces", croiser(["dév. 25", "dév. 33"], ["intérieur", "extérieur"]), { synonymes: ["angle", "équerre gouttière"] }),
  ...produit(M, "Gouttières", "Jonction de gouttière PVC", "pièces", ["Ø 25", "Ø 33"], { synonymes: ["jonction", "manchon gouttiere"] }),
  // Descentes
  ...produit(M, "Descentes", "Tuyau de descente zinc", "longueurs de 2 m", croiser(["Ø 80", "Ø 100"], ["naturel", "prépatiné quartz"]), { synonymes: ["descente", "tuyau", "dauphin", "evacuation"] }),
  ...produit(M, "Descentes", "Tuyau de descente PVC", "longueurs de 4 m", croiser(["Ø 80", "Ø 100"], ["gris", "sable", "blanc"]), { synonymes: ["descente pvc", "tube pvc"] }),
  ...produit(M, "Descentes", "Coude de descente zinc", "pièces", croiser(["Ø 80", "Ø 100"], ["40°", "67°", "72°"]), { synonymes: ["coude", "coudes"] }),
  ...produit(M, "Descentes", "Collier de descente", "pièces", croiser(["Ø 80", "Ø 100"], ["à bracelet", "à gond"]), { synonymes: ["collier", "colliers", "bracelet"] }),
  ...produit(M, "Descentes", "Dauphin fonte", "pièces", ["Ø 80", "Ø 100"], { synonymes: ["dauphin", "dauphine"] }),
  ...produit(M, "Descentes", "Cuvette de descente", "pièces", ["zinc"], { synonymes: ["cuvette", "boîte à eau"] }),
  // Pièces façonnées
  ...produit(M, "Bandes et pièces façonnées", "Bande de rive zinc", "longueurs de 2 m", croiser(["dév. 250", "dév. 330"], ["naturel", "prépatiné quartz"]), { synonymes: ["rive", "bande de rive", "planche de rive zinc"] }),
  ...produit(M, "Bandes et pièces façonnées", "Bande d'égout zinc", "longueurs de 2 m", croiser(["dév. 250", "dév. 330"], ["naturel", "prépatiné quartz"]), { synonymes: ["egout", "bande égout", "larmier"] }),
  ...produit(M, "Bandes et pièces façonnées", "Bande porte-solin zinc", "longueurs de 2 m", ["naturel", "prépatiné quartz"], { synonymes: ["porte solin", "solin", "bande solin"] }),
  ...produit(M, "Bandes et pièces façonnées", "Noue zinc", "longueurs de 2 m", croiser(["dév. 500", "dév. 650"], ["naturel", "prépatiné quartz"]), { synonymes: ["noue", "noues"] }),
  ...produit(M, "Bandes et pièces façonnées", "Faîtage zinc", "longueurs de 2 m", ["naturel", "prépatiné quartz"], { synonymes: ["faitage zinc", "faitiere zinc"] }),
  ...produit(M, "Bandes et pièces façonnées", "Couvertine", "longueurs de 2 m", croiser(["dév. 250", "dév. 330", "dév. 400"], ["zinc naturel", "alu laqué"]), { synonymes: ["couvertine", "chapeau de mur"] }),
  // Soudure
  ...produit(M, "Soudure", "Étain à souder", "barres", ["40/60"], { synonymes: ["etain", "soudure", "baguette etain"] }),
  ...produit(M, "Soudure", "Décapant pour zinc", "flacons", ["1 L"], { synonymes: ["decapant", "acide"] }),
];
