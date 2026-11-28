import type { BlocMetier } from "./socle.js";

/** PEINTURE : le vocabulaire du comptoir (catalogue générique par attributs) et des réponses réelles. */
export const BLOC_PEINTURE: BlocMetier = {
  metier: "peinture",
  nom: "Peinture",
  vocabulaire: [
    "« mat », « mat profond », « velours », « satin », « brillant » : la finition.",
    "« acrylique », « à l'eau », « alkyde », « glycéro », « pliolite », « siloxane » : le liant.",
    "« blanc », « à teinter », « ton pierre », un numéro RAL : la teinte.",
    "« pot », « seau », « bidon », « en 15 litres », « du 10 litres » : le conditionnement.",
    "« sous-couche », « impression », « primaire », « fixateur » : la couche de fond, un autre article que la peinture de finition.",
    "« murs et plafonds », « pièces humides », « boiseries », « façade », « sol » : l'usage.",
  ],
  exemples: [
    { questions: ["Quelle finition ? (mat, mat profond, velours, satin)", "Quelle teinte ? (blanc, à teinter)"], reponse: "satin blanc", compris: ["satin", "blanc"] },
    { questions: ["Quel liant ? (acrylique, pliolite, siloxane)"], reponse: "je sais pas, comme d'habitude", compris: ["(rien : il ne sait pas)"] },
  ],
};
