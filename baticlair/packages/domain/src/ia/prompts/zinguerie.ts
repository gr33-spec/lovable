import type { BlocMetier } from "./socle.js";

/** ZINGUERIE : le vocabulaire du comptoir et des réponses réelles, dont le cas de Greg (zinc à joint debout). */
export const BLOC_ZINGUERIE: BlocMetier = {
  metier: "zinguerie",
  nom: "Zinguerie",
  vocabulaire: [
    "« j'achète tout fait », « tout prêt », « déjà plié », « je commande façonné » : la pièce est commandée façonnée.",
    "« je plie », « je pli », « je le fais », « moi-même », « à la plieuse » : l'artisan façonne lui-même.",
    "« dév. 33 », « de 33 », « en 33 » pour une gouttière ou une bande : le développé, en centimètres.",
    "« de 80 », « Ø 80 », « en 100 » pour une descente : le diamètre, en millimètres.",
    "« 0,65 », « 0,70 », « 0,80 » pour du zinc : l'épaisseur, en millimètres.",
    "« chevron », « sur chevrons » : crochets de gouttière posés sur les chevrons ; « bandeau », « planche de rive », « en façade » : posés en façade.",
    "« joint debout », « bac », « bobine », « bobineau », « feuille » : la couverture en zinc et ses formes d'achat.",
    "« havraise », « nantaise », « demi-ronde » : le profil d'une gouttière. « naissance », « dauphin », « coude » : ses accessoires.",
    "« quartz », « anthra », « naturel » : l'aspect du zinc.",
  ],
  exemples: [
    {
      questions: [
        "Tu façonnes tes bacs toi-même, ou tu les commandes façonnés ? (Je façonne (bobines), Je commande façonné (bacs))",
        "Épaisseur du zinc ? (0,65 mm, 0,70 mm, 0,80 mm)",
        "Combien de descentes pour cette gouttière ?",
        "Crochets de gouttière : sur les chevrons ou en façade (bandeau) ?",
        "Bande de rive zinc : tu façonnes toi-même ou tu commandes façonné ?",
        "Ton chantier est où ? (Bord de mer, Intérieur des terres, Montagne, Entre les deux)",
      ],
      reponse: "J'achète tout fait, 0,65, 1, chevron, ou je pli, bord de mer",
      compris: ["Je commande façonné (bacs)", "0,65 mm", "1", "Sur les chevrons", "Je façonne", "Bord de mer"],
    },
    {
      questions: ["Ta descente, en PVC, en zinc ou en alu ?", "Quel diamètre ?"],
      reponse: "zinc 80",
      compris: ["Zinc", "80"],
    },
    {
      questions: ["Bande de rive zinc : tu façonnes toi-même ou tu commandes façonné ?", "Gouttière de 25, de 28, de 33 ou de 40 ?"],
      reponse: "33",
      compris: ["(rien : il n'a pas parlé de la rive)", "33"],
    },
  ],
};
