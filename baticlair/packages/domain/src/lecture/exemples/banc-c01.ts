import type { LectureDevis } from "../lecture.js";

/**
 * LE CAS C01 DU BANC D'ESSAI (ardoise au crochet, faîtage zinc sans développé), tel que lu pour le banc
 * (`test/banc-couverture/C01.json`). Le lecteur simulé le rend pour le repère « JEU-BANC-C01 » : les parcours de l'écran
 * rejouent « Je ne sais pas » au développé, puis « Combien de feuilles ? » (Greg, 23 novembre 2026), sans appel payant.
 */
export const BANC_C01_LECTURE: LectureDevis = {
  "metier": "roofing",
  "lots": [],
  "fiche": {
    "donnees": [
      {
        "cle": "ouvrage",
        "libelle": "Ouvrage",
        "valeur": "Couverture en ardoises naturelles au crochet, rénovation",
        "origine": "devis",
        "regle": null,
        "preuve": "ligne 5 : « Couverture en ardoise naturelle d'Espagne 1er choix 32×22 : pose au crochet inox » ; objet : « Réfection de la couverture »"
      },
      {
        "cle": "materiau",
        "libelle": "Matériau",
        "valeur": "Ardoise naturelle d'Espagne 1er choix",
        "origine": "devis",
        "regle": null,
        "preuve": "ligne 5 : « ardoise naturelle d'Espagne 1er choix »"
      },
      {
        "cle": "format_d_ardoise",
        "libelle": "Format d'ardoise",
        "valeur": "32×22",
        "origine": "devis",
        "regle": null,
        "preuve": "ligne 5 : « 32×22 »"
      },
      {
        "cle": "crochet",
        "libelle": "Crochet",
        "valeur": "inox",
        "origine": "devis",
        "regle": null,
        "preuve": "ligne 5 : « pose au crochet inox »"
      },
      {
        "cle": "surface",
        "libelle": "Surface",
        "valeur": "96 m²",
        "origine": "devis",
        "regle": null,
        "preuve": "ligne 5 : « 96 m² »"
      },
      {
        "cle": "pente",
        "libelle": "Pente",
        "valeur": "45°",
        "origine": "devis",
        "regle": null,
        "preuve": "ligne 5 : « pente 45° »"
      },
      {
        "cle": "rampant",
        "libelle": "Rampant",
        "valeur": "6 m",
        "origine": "devis",
        "regle": null,
        "preuve": "ligne 5 : « rampant 6 m »"
      },
      {
        "cle": "nombre_de_pans",
        "libelle": "Nombre de pans",
        "valeur": "2",
        "origine": "devis",
        "regle": null,
        "preuve": "objet : « maison 2 pans »"
      },
      {
        "cle": "ecran_sous_toiture",
        "libelle": "Écran sous-toiture",
        "valeur": "HPV, 96 m²",
        "origine": "devis",
        "regle": null,
        "preuve": "ligne 3 : « écran sous-toiture HPV » « 96 m² »"
      },
      {
        "cle": "liteaux",
        "libelle": "Liteaux",
        "valeur": "sapin traité, 96 m²",
        "origine": "devis",
        "regle": null,
        "preuve": "ligne 4 : « liteaux sapin traité » « 96 m² »"
      },
      {
        "cle": "longueur_du_faitage",
        "libelle": "Longueur du faîtage",
        "valeur": "8 ml",
        "origine": "devis",
        "regle": null,
        "preuve": "ligne 6 : « 8 ml »"
      },
      {
        "cle": "developpe_du_faitage_zinc",
        "libelle": "Développé du faîtage zinc",
        "valeur": null,
        "origine": "manquante",
        "regle": null,
        "preuve": ""
      },
      {
        "cle": "faconnage",
        "libelle": "Façonnage",
        "valeur": null,
        "origine": "manquante",
        "regle": null,
        "preuve": ""
      },
      {
        "cle": "gouttiere",
        "libelle": "Gouttière",
        "valeur": "demi-ronde zinc de 25",
        "origine": "devis",
        "regle": null,
        "preuve": "ligne 7 : « Gouttière demi-ronde zinc de 25 »"
      },
      {
        "cle": "longueur_de_gouttiere",
        "libelle": "Longueur de gouttière",
        "valeur": "16 ml",
        "origine": "devis",
        "regle": null,
        "preuve": "ligne 7 : « 16 ml » « 2 longueurs de 8 m »"
      },
      {
        "cle": "nombre_de_descentes",
        "libelle": "Nombre de descentes",
        "valeur": "2",
        "origine": "devis",
        "regle": null,
        "preuve": "ligne 8 : « 2 u »"
      },
      {
        "cle": "diametre_des_descentes",
        "libelle": "Diamètre des descentes",
        "valeur": "Ø80",
        "origine": "devis",
        "regle": null,
        "preuve": "ligne 8 : « Ø80 »"
      },
      {
        "cle": "hauteur_d_une_descente",
        "libelle": "Hauteur d'une descente",
        "valeur": "5,50 m",
        "origine": "devis",
        "regle": null,
        "preuve": "ligne 8 : « hauteur 5,50 m »"
      },
      {
        "cle": "dauphins",
        "libelle": "Dauphins",
        "valeur": "2 dauphins fonte Ø80",
        "origine": "devis",
        "regle": null,
        "preuve": "ligne 9 : « Dauphin fonte Ø80 » « 2 u »"
      }
    ]
  },
  "bref": [
    "Réfection d'une couverture en ardoise sur une maison 2 pans, en rénovation : l'ancienne couverture est déposée.",
    "96 m² d'écran sous-toiture HPV.",
    "96 m² de liteaux sapin traité.",
    "96 m² d'ardoise naturelle d'Espagne 1er choix 32×22 posée au crochet inox, pente 45°, rampant 6 m.",
    "8 ml de faîtage zinc.",
    "16 ml de gouttière demi-ronde zinc de 25, en 2 longueurs de 8 m.",
    "2 descentes d'eau pluviale zinc Ø80, hauteur 5,50 m.",
    "2 dauphins fonte Ø80 en pied de descente."
  ],
  "questions": [],
  "lignes": [
    {
      "ref": "1",
      "designation": "Installation de chantier, échafaudage de pied sur les deux façades, protections",
      "quantite": "1",
      "unite": "u",
      "role": "hors_quantitatif",
      "fournitures": []
    },
    {
      "ref": "2",
      "designation": "Dépose de la couverture ardoise existante, liteaux compris, descente et évacuation des gravats en déchetterie",
      "quantite": "96",
      "unite": "m²",
      "role": "pose",
      "fournitures": []
    },
    {
      "ref": "3",
      "designation": "Fourniture et pose d'un écran sous-toiture HPV",
      "quantite": "96",
      "unite": "m²",
      "role": "fourniture_et_pose",
      "fournitures": [
        {
          "nom": "Écran sous-toiture HPV",
          "quantite": "96",
          "unite": "m²",
          "ouvrage": "couverture-ardoises-crochet",
          "emplacement": "ecran",
          "donnees": {
            "surface": "96",
            "pente": "45",
            "longueur_rampant": "6"
          },
          "attend": [],
          "aPreciser": [],
          "precision": null
        }
      ]
    },
    {
      "ref": "4",
      "designation": "Fourniture et pose de liteaux sapin traité",
      "quantite": "96",
      "unite": "m²",
      "role": "fourniture_et_pose",
      "fournitures": [
        {
          "nom": "Liteaux sapin traité",
          "quantite": "96",
          "unite": "m²",
          "ouvrage": "couverture-ardoises-crochet",
          "emplacement": "liteau",
          "donnees": {
            "surface": "96",
            "pente": "45",
            "longueur_rampant": "6"
          },
          "attend": [],
          "aPreciser": [],
          "precision": null
        }
      ]
    },
    {
      "ref": "5",
      "designation": "Couverture en ardoise naturelle d'Espagne 1er choix 32×22 : pose au crochet inox, pente 45°, rampant 6 m",
      "quantite": "96",
      "unite": "m²",
      "role": "fourniture_et_pose",
      "fournitures": [
        {
          "nom": "Ardoise naturelle d'Espagne 1er choix 32×22",
          "quantite": "96",
          "unite": "m²",
          "ouvrage": "couverture-ardoises-crochet",
          "emplacement": "ardoise",
          "donnees": {
            "produit": "ardoise-32x22",
            "qualite_ardoise": "1",
            "surface": "96",
            "pente": "45",
            "longueur_rampant": "6"
          },
          "attend": [],
          "aPreciser": [],
          "precision": null
        },
        {
          "nom": "Crochets d'ardoise inox",
          "quantite": null,
          "unite": null,
          "ouvrage": "couverture-ardoises-crochet",
          "emplacement": "crochet",
          "donnees": {},
          "attend": [],
          "aPreciser": [],
          "precision": null
        }
      ]
    },
    {
      "ref": "6",
      "designation": "Faîtage zinc",
      "quantite": "8",
      "unite": "ml",
      "role": "fourniture_et_pose",
      "fournitures": [
        {
          "nom": "Faîtage zinc",
          "quantite": "8",
          "unite": "ml",
          "ouvrage": "faitage-zinc",
          "emplacement": "bande",
          "donnees": {
            "longueur_faitage": "8"
          },
          "attend": [],
          "aPreciser": [],
          "precision": null
        }
      ]
    },
    {
      "ref": "7",
      "designation": "Gouttière demi-ronde zinc de 25 (2 longueurs de 8 m)",
      "quantite": "16",
      "unite": "ml",
      "role": "fourniture_et_pose",
      "fournitures": [
        {
          "nom": "Gouttière demi-ronde zinc de 25",
          "quantite": "16",
          "unite": "ml",
          "ouvrage": "gouttiere",
          "emplacement": "profil",
          "donnees": {
            "longueur_gouttiere": "16",
            "developpe_gouttiere": "25",
            "nb_descentes": "2",
            "diametre_descente": "80"
          },
          "attend": [],
          "aPreciser": [],
          "precision": null
        }
      ]
    },
    {
      "ref": "8",
      "designation": "Descente d'eau pluviale zinc Ø80, hauteur 5,50 m",
      "quantite": "2",
      "unite": "u",
      "role": "fourniture_et_pose",
      "fournitures": [
        {
          "nom": "Descente d'eau pluviale zinc Ø80",
          "quantite": "2",
          "unite": "u",
          "ouvrage": "descente",
          "emplacement": "tube",
          "donnees": {
            "nb_descentes": "2",
            "diametre_descente": "80",
            "hauteur_descente": "5,50 m",
            "dauphin": "1"
          },
          "attend": [],
          "aPreciser": [],
          "precision": null
        }
      ]
    },
    {
      "ref": "9",
      "designation": "Dauphin fonte Ø80 en pied de descente",
      "quantite": "2",
      "unite": "u",
      "role": "fourniture_et_pose",
      "fournitures": [
        {
          "nom": "Dauphin fonte Ø80",
          "quantite": "2",
          "unite": "u",
          "ouvrage": "descente",
          "emplacement": "dauphin",
          "donnees": {
            "nb_descentes": "2",
            "diametre_descente": "80",
            "hauteur_descente": "5,50 m",
            "dauphin": "1"
          },
          "attend": [],
          "aPreciser": [],
          "precision": null
        }
      ]
    },
    {
      "ref": "10",
      "designation": "Nettoyage du chantier et repli de l'échafaudage",
      "quantite": "1",
      "unite": "u",
      "role": "hors_quantitatif",
      "fournitures": []
    }
  ],
  "contexte": {
    "client": "M. et Mme Le Goff",
    "adresse": "14 rue de Kerjean",
    "ville": "Plouha",
    "code postal": "22580",
    "numéro du devis": "D-2026-0412",
    "date": "12 octobre 2026",
    "neuf ou rénovation": "rénovation",
    "objet": "Réfection de la couverture en ardoise, maison 2 pans"
  },
  "notes": []
};
