import { croiser, produit, type ArticleCatalogue } from "../catalogue.js";

/**
 * PEINTURE : UNE BIBLIOTHÈQUE GÉNÉRIQUE PAR ATTRIBUTS (Greg, 31 octobre 2026, soir : « pour la peinture, tu peux peut-être
 * faire un peu plus générique »). Un peintre décrit sa peinture par ce qui compte au comptoir, jamais par une marque :
 * l'USAGE (murs et plafonds, pièces humides, boiseries, fer, façade, sol), le LIANT (acrylique, alkyde en phase aqueuse,
 * glycéro, pliolite, siloxane, silicate, époxy, polyuréthane), la FINITION (mat, velours, satin, brillant), la TEINTE
 * (blanc, à teinter…) et le CONDITIONNEMENT. Chaque combinaison est une désignation que tous les négoces comprennent ;
 * la marque, s'il y tient, l'artisan l'ajoute (« Marque, modèle ou référence »). Désignations génériques, sans source.
 */
const P = "peinture" as const;
const G = { statut: "generique" } as const;

function peinture(famille: string, nom: string, finitions: readonly string[], teintes: readonly string[], conditionnements: readonly string[], synonymes: readonly string[]): ArticleCatalogue[] {
  const aspects = finitions.length ? croiser(finitions, teintes, " ") : [...teintes];
  return produit(P, famille, nom, "pots", croiser(aspects, conditionnements), { synonymes, fiche: G });
}

const MURS = ["mat", "mat profond", "velours", "satin"];
const BLANC_OU_TEINTE = ["blanc", "à teinter"];

export const PEINTURE_ATTRIBUTS: readonly ArticleCatalogue[] = [
  // Intérieur : murs et plafonds
  ...peinture("Murs et plafonds", "Peinture murs et plafonds acrylique", MURS, BLANC_OU_TEINTE, ["3 L", "10 L", "15 L"], ["peinture", "peinture mur", "peinture plafond", "acrylique", "phase aqueuse", "a l'eau"]),
  ...peinture("Murs et plafonds", "Peinture murs et plafonds alkyde en phase aqueuse", ["mat", "velours", "satin"], BLANC_OU_TEINTE, ["3 L", "10 L", "15 L"], ["alkyde", "alkyde aqueuse", "glycero a l'eau", "peinture mur"]),
  ...peinture("Murs et plafonds", "Peinture plafond", ["mat profond"], ["blanc"], ["10 L", "15 L"], ["plafond", "peinture plafond", "anti traces"]),
  ...peinture("Murs et plafonds", "Peinture pièces humides acrylique", ["velours", "satin"], BLANC_OU_TEINTE, ["3 L", "10 L"], ["cuisine", "salle de bain", "salle d'eau", "pieces humides", "fongicide"]),
  // Boiseries, menuiseries et métaux
  ...peinture("Boiseries et métaux", "Laque boiseries acrylique", ["velours", "satin", "brillant"], BLANC_OU_TEINTE, ["0,5 L", "1 L", "2,5 L"], ["laque", "boiserie", "porte", "fenetre", "plinthe"]),
  ...peinture("Boiseries et métaux", "Laque boiseries alkyde en phase aqueuse", ["velours", "satin", "brillant"], BLANC_OU_TEINTE, ["0,5 L", "1 L", "2,5 L"], ["laque", "alkyde", "boiserie"]),
  ...peinture("Boiseries et métaux", "Laque boiseries glycéro", ["satin", "brillant"], BLANC_OU_TEINTE, ["0,5 L", "1 L", "2,5 L"], ["glycero", "glycerophtalique", "solvant", "laque"]),
  ...peinture("Boiseries et métaux", "Peinture fer antirouille", ["satin", "brillant"], ["blanc", "noir", "gris", "à teinter"], ["0,5 L", "2,5 L"], ["fer", "metal", "antirouille", "ferronnerie", "portail"]),
  // Extérieur
  ...peinture("Façades", "Peinture façade acrylique", ["mat"], ["blanc", "ton pierre", "à teinter"], ["10 L", "15 L"], ["facade", "ravalement", "exterieur"]),
  ...peinture("Façades", "Peinture façade pliolite", ["mat"], ["blanc", "ton pierre", "à teinter"], ["10 L", "15 L"], ["facade", "pliolite", "solvant"]),
  ...peinture("Façades", "Peinture façade siloxane", ["mat"], ["blanc", "ton pierre", "à teinter"], ["10 L", "15 L"], ["facade", "siloxane", "hydrophobe"]),
  ...peinture("Façades", "Peinture façade minérale silicate", ["mat"], ["blanc", "à teinter"], ["15 L"], ["facade", "silicate", "minerale"]),
  ...peinture("Façades", "Fixateur de fond façade", [], ["incolore"], ["10 L", "15 L"], ["fixateur", "impression facade", "durcisseur"]),
  ...peinture("Façades", "Hydrofuge façade et toiture", [], ["incolore"], ["5 L", "20 L"], ["hydrofuge", "impermeabilisant", "toiture", "tuile"]),
  ...peinture("Façades", "Peinture toiture", ["mat"], ["rouge tuile", "brun", "ardoise"], ["10 L"], ["toiture", "peinture tuile", "resine toiture"]),
  // Sols
  ...peinture("Sols", "Peinture sol époxy", ["satin"], ["gris", "à teinter"], ["2,5 L", "5 L"], ["sol", "epoxy", "garage", "beton"]),
  ...peinture("Sols", "Peinture sol polyuréthane", ["satin"], ["gris", "à teinter"], ["2,5 L", "5 L"], ["sol", "polyurethane", "pu"]),
  ...peinture("Sols", "Peinture sol acrylique", ["satin"], ["gris", "à teinter"], ["2,5 L", "5 L"], ["sol", "acrylique"]),
  // Impressions et sous-couches
  ...peinture("Impressions", "Sous-couche murs et plafonds acrylique", [], ["blanc"], ["3 L", "10 L", "15 L"], ["sous couche", "impression", "primaire"]),
  ...peinture("Impressions", "Sous-couche bois", [], ["blanc"], ["1 L", "2,5 L"], ["sous couche bois", "impression bois"]),
  ...peinture("Impressions", "Primaire d'accrochage multi-supports", [], ["blanc"], ["1 L", "2,5 L"], ["accroche", "primaire", "carrelage", "pvc"]),
  ...peinture("Impressions", "Primaire antirouille", [], ["gris", "rouge oxyde"], ["0,5 L", "2,5 L"], ["antirouille", "minium", "primaire metal"]),
  // Bois extérieur
  ...peinture("Bois extérieur", "Lasure bois phase aqueuse", [], ["incolore", "chêne clair", "chêne moyen", "chêne foncé", "à teinter"], ["1 L", "5 L"], ["lasure", "bois", "a l'eau"]),
  ...peinture("Bois extérieur", "Saturateur bois", [], ["incolore", "naturel", "teck", "à teinter"], ["1 L", "5 L"], ["saturateur", "terrasse", "bardage"]),
  ...peinture("Bois extérieur", "Vernis bois", ["mat", "satin", "brillant"], ["incolore"], ["0,5 L", "2,5 L"], ["vernis", "vitrificateur"]),
];
