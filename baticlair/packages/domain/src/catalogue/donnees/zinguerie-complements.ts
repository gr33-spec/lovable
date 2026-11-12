import { croiser, produit, type ArticleCatalogue } from "../catalogue.js";

/**
 * ZINGUERIE, COMPLÉMENTS (Greg, 12 novembre 2026 : « continue d'alimenter la base en couverture, zinguerie, étanchéité :
 * ce sera notre première cible sur le terrain »). Ce que `zinguerie.ts` ne proposait pas : cuivre, acier laqué, gouttières
 * carrées et de corniche, chéneaux, autres diamètres de descente, pièces de raccord, abergements, couverture en zinc à
 * tasseaux, fixations et soudure. Génériques, sans marque. Les articles s'AJOUTENT : aucune clé existante ne change.
 * Un produit sans format sûr n'a pas de variante : l'artisan précise.
 */
const M = "zinguerie" as const;
const ZINC = ["naturel", "prépatiné quartz", "prépatiné anthracite"];

export const ZINGUERIE_COMPLEMENTS: readonly ArticleCatalogue[] = [
  // Métaux en feuilles et bobines
  ...produit(M, "Zinc", "Feuille de cuivre 2 × 1 m", "pièces", ["0,5 mm", "0,6 mm"], { synonymes: ["cuivre", "feuille cuivre", "tole cuivre"] }),
  ...produit(M, "Zinc", "Bobine de cuivre", "m", [null], { synonymes: ["cuivre", "bobine cuivre", "bande cuivre"] }),
  ...produit(M, "Zinc", "Tôle acier galvanisé 2 × 1 m", "pièces", ["0,5 mm", "0,63 mm", "0,75 mm"], { synonymes: ["tole galva", "acier galvanise", "feuille galva"] }),
  ...produit(M, "Zinc", "Tôle aluminium laqué 2 × 1 m", "pièces", [null], { synonymes: ["tole alu", "aluminium laque", "feuille alu"] }),
  ...produit(M, "Zinc", "Tôle inox étamé 2 × 1 m", "pièces", [null], { synonymes: ["inox", "inox etame", "feuille inox"] }),
  ...produit(M, "Zinc", "Couvre-joint zinc pour tasseaux", "longueurs de 2 m", ZINC.slice(0, 2), { synonymes: ["couvre joint", "tasseau", "zinc a tasseaux"] }),
  ...produit(M, "Zinc", "Tasseau bois trapézoïdal", "m", [null], { synonymes: ["tasseau", "tasseaux", "zinc a tasseaux"] }),
  ...produit(M, "Zinc", "Patte à tasseau", "boîtes de 100", [null], { synonymes: ["patte", "pattes", "patte tasseau"] }),
  ...produit(M, "Zinc", "Natte de désolidarisation sous zinc", "rouleaux", [null], { synonymes: ["natte", "sous couche zinc", "membrane a excroissances", "nappe sous zinc", "delta"] }),
  ...produit(M, "Zinc", "Feutre bitumé sous zinc", "rouleaux", [null], { synonymes: ["feutre", "papier bitume", "sous couche zinc"] }),
  // Gouttières
  ...produit(M, "Gouttières", "Gouttière demi-ronde cuivre", "longueurs de 4 m", ["dév. 25", "dév. 33"], { synonymes: ["gouttiere cuivre", "cuivre", "demi ronde"] }),
  ...produit(M, "Gouttières", "Gouttière demi-ronde acier laqué", "longueurs de 4 m", croiser(["dév. 25", "dév. 33"], ["anthracite", "brun", "blanc"]), { synonymes: ["gouttiere acier", "gouttiere galva", "acier laque"] }),
  ...produit(M, "Gouttières", "Gouttière demi-ronde acier galvanisé", "longueurs de 4 m", ["dév. 25", "dév. 33"], { synonymes: ["gouttiere galva", "galvanise"] }),
  ...produit(M, "Gouttières", "Gouttière carrée zinc", "longueurs de 4 m", croiser(["dév. 25", "dév. 33", "dév. 40"], ZINC.slice(0, 2)), { synonymes: ["gouttiere carree", "gouttiere rectangulaire", "gouttiere moulure"] }),
  ...produit(M, "Gouttières", "Gouttière de corniche zinc", "longueurs de 4 m", [null], { synonymes: ["corniche", "gouttiere corniche", "moulure", "ardennaise"] }),
  ...produit(M, "Gouttières", "Gouttière de Laval zinc", "longueurs de 4 m", [null], { synonymes: ["laval", "gouttiere de laval", "gouttiere a l anglaise", "anglaise"] }),
  ...produit(M, "Gouttières", "Chéneau zinc", "longueurs de 2 m", ["dév. 500", "dév. 650", "dév. 800", "dév. 1000"], { synonymes: ["cheneau", "cheneaux", "cheneau encaisse", "cheneau a l anglaise"] }),
  ...produit(M, "Gouttières", "Gouttière PVC carrée", "longueurs de 4 m", ["gris", "sable", "blanc", "anthracite"], { synonymes: ["gouttiere pvc", "gouttiere carree pvc", "corniche pvc"] }),
  ...produit(M, "Gouttières", "Gouttière demi-ronde zinc", "longueurs de 4 m", croiser(["dév. 16", "dév. 25", "dév. 33", "dév. 40"], ["prépatiné anthracite"]), { synonymes: ["gouttiere", "gouttiere pendante", "demi ronde"] }),
  ...produit(M, "Gouttières", "Fond de gouttière à souder", "pièces", ["dév. 25", "dév. 33", "dév. 40"], { synonymes: ["fond", "talon", "about"] }),
  ...produit(M, "Gouttières", "Besace de dilatation", "pièces", ["dév. 25", "dév. 33"], { synonymes: ["besace", "joint de dilatation", "dilatation"] }),
  ...produit(M, "Gouttières", "Joint de dilatation à coller", "pièces", [null], { synonymes: ["dilatation", "joint neoprene", "bande de dilatation"] }),
  ...produit(M, "Gouttières", "Naissance de gouttière cuivre", "pièces", croiser(["dév. 25", "dév. 33"], ["Ø 80", "Ø 100"]), { synonymes: ["naissance", "moignon", "cuivre"] }),
  ...produit(M, "Gouttières", "Moignon à souder", "pièces", ["Ø 60", "Ø 80", "Ø 100"], { synonymes: ["moignon", "naissance", "tubulure"] }),
  ...produit(M, "Gouttières", "Crochet de gouttière", "pièces", croiser(["dév. 16", "dév. 25", "dév. 33", "dév. 40"], ["cuivre", "inox", "à bandeau", "sur chevron", "à ressort"]), { synonymes: ["crochet gouttiere", "crochets", "crochet bandeau", "crochet hampe"] }),
  ...produit(M, "Gouttières", "Pare-feuilles de gouttière", "m", [null], { synonymes: ["pare feuilles", "grille gouttiere", "protege gouttiere"] }),
  ...produit(M, "Gouttières", "Crapaudine de gouttière", "pièces", ["Ø 80", "Ø 100"], { synonymes: ["crapaudine", "grille de naissance"] }),
  ...produit(M, "Gouttières", "Naissance de gouttière PVC", "pièces", ["Ø 80", "Ø 100"], { synonymes: ["naissance pvc", "moignon pvc"] }),
  ...produit(M, "Gouttières", "Fond de gouttière PVC", "pièces", ["Ø 25", "Ø 33"], { synonymes: ["fond pvc", "talon pvc"] }),
  ...produit(M, "Gouttières", "Angle de gouttière PVC", "pièces", croiser(["Ø 25", "Ø 33"], ["intérieur", "extérieur"]), { synonymes: ["angle pvc", "equerre pvc"] }),
  ...produit(M, "Gouttières", "Crochet de gouttière PVC", "pièces", ["Ø 25", "Ø 33"], { synonymes: ["crochet pvc", "support gouttiere pvc"] }),
  // Descentes
  ...produit(M, "Descentes", "Tuyau de descente zinc", "longueurs de 2 m", croiser(["Ø 60", "Ø 120"], ["naturel"]), { synonymes: ["descente", "tuyau", "evacuation"] }),
  ...produit(M, "Descentes", "Tuyau de descente zinc", "longueurs de 2 m", croiser(["Ø 80", "Ø 100"], ["prépatiné anthracite"]), { synonymes: ["descente", "tuyau", "evacuation"] }),
  ...produit(M, "Descentes", "Tuyau de descente cuivre", "longueurs de 2 m", ["Ø 80", "Ø 100"], { synonymes: ["descente cuivre", "tuyau cuivre"] }),
  ...produit(M, "Descentes", "Tuyau de descente acier laqué", "longueurs de 2 m", ["Ø 80", "Ø 100"], { synonymes: ["descente acier", "descente galva"] }),
  ...produit(M, "Descentes", "Tuyau de descente carré zinc", "longueurs de 2 m", [null], { synonymes: ["descente carree", "tuyau carre"] }),
  ...produit(M, "Descentes", "Coude de descente cuivre", "pièces", croiser(["Ø 80", "Ø 100"], ["40°", "72°"]), { synonymes: ["coude cuivre", "coudes"] }),
  ...produit(M, "Descentes", "Coude de descente PVC", "pièces", croiser(["Ø 80", "Ø 100"], ["45°", "67°30", "87°30"]), { synonymes: ["coude pvc", "coudes"] }),
  ...produit(M, "Descentes", "Collier de descente PVC", "pièces", ["Ø 80", "Ø 100"], { synonymes: ["collier pvc", "bride"] }),
  ...produit(M, "Descentes", "Manchon de descente PVC", "pièces", ["Ø 80", "Ø 100"], { synonymes: ["manchon", "raccord pvc"] }),
  ...produit(M, "Descentes", "Culotte de descente", "pièces", ["Ø 80", "Ø 100"], { synonymes: ["culotte", "embranchement", "y de descente"] }),
  ...produit(M, "Descentes", "Jambonneau", "pièces", ["Ø 80", "Ø 100"], { synonymes: ["jambonneau", "moignon coude", "naissance coudee"] }),
  ...produit(M, "Descentes", "Bague de descente", "pièces", ["Ø 80", "Ø 100"], { synonymes: ["bague", "bague simple", "bague double", "nez de collier"] }),
  ...produit(M, "Descentes", "Boîte à eau zinc", "pièces", [null], { synonymes: ["boite a eau", "cuvette", "trop plein"] }),
  ...produit(M, "Descentes", "Dauphin fonte", "pièces", ["Ø 80 · coudé", "Ø 100 · coudé", "Ø 80 · longueur 2 m", "Ø 100 · longueur 2 m"], { synonymes: ["dauphin", "dauphine", "pied de chute"] }),
  ...produit(M, "Descentes", "Regard de pied de chute", "pièces", [null], { synonymes: ["regard", "pied de chute", "regard eaux pluviales"] }),
  ...produit(M, "Descentes", "Récupérateur d'eau de pluie pour descente", "pièces", ["Ø 80", "Ø 100"], { synonymes: ["recuperateur", "collecteur", "eau de pluie"] }),
  // Bandes et pièces façonnées
  ...produit(M, "Bandes et pièces façonnées", "Solin zinc", "longueurs de 2 m", ZINC.slice(0, 2), { synonymes: ["solin", "bande de solin", "solin a biseau"] }),
  ...produit(M, "Bandes et pièces façonnées", "Bande à ourlet zinc", "longueurs de 2 m", [null], { synonymes: ["ourlet", "bande a ourlet", "bande de batellement", "batellement"] }),
  ...produit(M, "Bandes et pièces façonnées", "Bande d'agrafe zinc", "longueurs de 2 m", [null], { synonymes: ["agrafe", "bande d agrafe", "patte d agrafe"] }),
  ...produit(M, "Bandes et pièces façonnées", "Noquet zinc", "pièces", [null], { synonymes: ["noquet", "noquets", "penetration"] }),
  ...produit(M, "Bandes et pièces façonnées", "Abergement de cheminée zinc", "pièces", [null], { synonymes: ["abergement", "entourage de cheminee", "souche"] }),
  ...produit(M, "Bandes et pièces façonnées", "Besace de cheminée zinc", "pièces", [null], { synonymes: ["besace", "derriere de cheminee"] }),
  ...produit(M, "Bandes et pièces façonnées", "Habillage de bandeau zinc", "longueurs de 2 m", [null], { synonymes: ["bandeau", "habillage planche de rive", "tete de bandeau"] }),
  ...produit(M, "Bandes et pièces façonnées", "Membron zinc", "longueurs de 2 m", [null], { synonymes: ["membron", "brisis", "mansarde"] }),
  ...produit(M, "Bandes et pièces façonnées", "Chapeau de cheminée", "pièces", ["zinc", "inox", "acier galvanisé"], { synonymes: ["chapeau", "mitre", "aspirateur statique", "couronnement"] }),
  ...produit(M, "Bandes et pièces façonnées", "Appui de fenêtre zinc", "longueurs de 2 m", [null], { synonymes: ["appui", "bavette", "appui de fenetre"] }),
  ...produit(M, "Bandes et pièces façonnées", "Couvertine", "longueurs de 2 m", croiser(["dév. 250", "dév. 330", "dév. 400"], ["zinc prépatiné quartz", "acier laqué"]), { synonymes: ["couvertine", "chapeau de mur", "couronnement d acrotere"] }),
  ...produit(M, "Bandes et pièces façonnées", "Noue zinc", "longueurs de 2 m", croiser(["dév. 400", "dév. 800"], ["naturel"]), { synonymes: ["noue", "noues"] }),
  ...produit(M, "Bandes et pièces façonnées", "Bande de rive zinc", "longueurs de 2 m", croiser(["dév. 200", "dév. 400"], ["naturel"]), { synonymes: ["rive", "bande de rive"] }),
  // Soudure et consommables
  ...produit(M, "Soudure", "Étain à souder", "barres", ["28 %", "33 %"], { synonymes: ["etain", "soudure", "baguette etain"] }),
  ...produit(M, "Soudure", "Fer à souder de zingueur", "pièces", [null], { synonymes: ["fer a souder", "panne cuivre", "fer zingueur"] }),
  ...produit(M, "Soudure", "Cartouche de gaz pour fer à souder", "pièces", [null], { synonymes: ["cartouche gaz", "gaz", "recharge"] }),
  ...produit(M, "Soudure", "Pierre ammoniacale", "pièces", [null], { synonymes: ["pierre ammoniac", "sel ammoniac", "nettoyage panne"] }),
  ...produit(M, "Soudure", "Mastic colle pour gouttière", "cartouches", ["310 ml"], { synonymes: ["mastic gouttiere", "colle gouttiere", "mastic zinc"] }),
  ...produit(M, "Soudure", "Colle PVC pour gouttière", "pots", [null], { synonymes: ["colle pvc", "colle gouttiere pvc"] }),
  ...produit(M, "Soudure", "Rivet pop", "boîtes", ["aluminium", "cuivre", "inox"], { synonymes: ["rivet", "rivets", "pop"] }),
];
