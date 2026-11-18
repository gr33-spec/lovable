import type { LectureDevis } from "../lecture.js";

/**
 * LA LECTURE RÉELLE DU CHANTIER DE GREG (17 novembre 2026, site de test, Sonnet 5.5, prompt `lecture_devis` version 7) :
 * le devis D-2026-020, une extension en ardoises 32×22 au crochet avec sa zinguerie. Telle que le modèle l'a rendue, sans
 * nom ni adresse. Elle sert au jeu de test (« ajoute mon chantier ardoise et zinguerie au jeu de test ») : le lecteur
 * simulé la rend pour ce devis, et les tests du moteur, du PDF et de l'e-mail la rejouent sans appel payant.
 */
export const D2026_020_LECTURE: LectureDevis = {
  "bref": [
    "Extension : couverture neuve en ardoises naturelles 32×22, 48 m², crochets de 11.",
    "Pente 30° au rampant, 45° aux demi-croupes.",
    "Gouttière havraise zinc 10 m, avec 20 crochets sur chevrons, retour d'angle et gouttière au-dessus de la verrière.",
    "Bandes de rive zinc 4 m pour la verrière conservée.",
    "Bande de faîtage zinc 8 m, développé 25 cm.",
    "Bande porte-solin zinc 4 m et mortier de ciment pour le solin contre le mur.",
    "Descentes zinc Ø 80, 6 m (2 descentes de 3 m), et 4 coudes zinc Ø 80."
  ],
  "lots": [],
  "fiche": {
    "donnees": [
      {
        "cle": "ouvrage",
        "regle": null,
        "preuve": "ligne 1 : « Fourniture d'ardoises naturelles 32x22 et crochets de 11 »",
        "valeur": "Couverture en ardoises au crochet de l'extension, gouttière havraise zinc, descentes zinc",
        "libelle": "Ouvrage",
        "origine": "devis"
      },
      {
        "cle": "surface",
        "regle": null,
        "preuve": "ligne 1 : « 48 m² »",
        "valeur": "48 m²",
        "libelle": "Surface",
        "origine": "devis"
      },
      {
        "cle": "format_d_ardoise",
        "regle": null,
        "preuve": "ligne 1 : « ardoises naturelles 32x22 »",
        "valeur": "32×22",
        "libelle": "Format d'ardoise",
        "origine": "devis"
      },
      {
        "cle": "longueur_de_crochet",
        "regle": null,
        "preuve": "ligne 1 : « crochets de 11 »",
        "valeur": "11 cm",
        "libelle": "Longueur de crochet",
        "origine": "devis"
      },
      {
        "cle": "pente",
        "regle": null,
        "preuve": "ligne 2 : « rampant (pente 30°) et les demi-croupes (pente 45°) »",
        "valeur": "30° (rampant) et 45° (demi-croupes)",
        "libelle": "Pente",
        "origine": "devis"
      },
      {
        "cle": "pureau",
        "regle": null,
        "preuve": "",
        "valeur": null,
        "libelle": "Pureau",
        "origine": "manquante"
      },
      {
        "cle": "longueur_de_gouttiere",
        "regle": null,
        "preuve": "ligne 3 : « 10 m »",
        "valeur": "10 m",
        "libelle": "Longueur de gouttière",
        "origine": "devis"
      },
      {
        "cle": "developpe_de_gouttiere",
        "regle": null,
        "preuve": "",
        "valeur": null,
        "libelle": "Développé de gouttière",
        "origine": "manquante"
      },
      {
        "cle": "nombre_de_descentes",
        "regle": null,
        "preuve": "ligne 11 : « 2 descentes de 3 mètres »",
        "valeur": "2",
        "libelle": "Nombre de descentes",
        "origine": "devis"
      },
      {
        "cle": "diametre_des_descentes",
        "regle": null,
        "preuve": "ligne 11 : « diam. 80mm »",
        "valeur": "80 mm",
        "libelle": "Diamètre des descentes",
        "origine": "devis"
      },
      {
        "cle": "hauteur_d_une_descente",
        "regle": null,
        "preuve": "ligne 11 : « 2 descentes de 3 mètres »",
        "valeur": "3 m",
        "libelle": "Hauteur d'une descente",
        "origine": "devis"
      },
      {
        "cle": "coudes_par_descente",
        "regle": null,
        "preuve": "ligne 12 : « 2 jeux de 2 coudes »",
        "valeur": "2",
        "libelle": "Coudes par descente",
        "origine": "devis"
      },
      {
        "cle": "pose_des_crochets_de_gouttiere",
        "regle": null,
        "preuve": "ligne 4 : « sur chevrons »",
        "valeur": "sur chevrons",
        "libelle": "Pose des crochets de gouttière",
        "origine": "devis"
      },
      {
        "cle": "longueur_de_faitage_zinc",
        "regle": null,
        "preuve": "ligne 8 : « 8 m »",
        "valeur": "8 m",
        "libelle": "Longueur de faîtage zinc",
        "origine": "devis"
      },
      {
        "cle": "developpe_du_faitage",
        "regle": null,
        "preuve": "ligne 8 : « dev 25cm »",
        "valeur": "250 mm",
        "libelle": "Développé du faîtage",
        "origine": "devis"
      },
      {
        "cle": "longueur_de_bande_porte_solin",
        "regle": null,
        "preuve": "ligne 10 : « 4 m »",
        "valeur": "4 m",
        "libelle": "Longueur de bande porte-solin",
        "origine": "devis"
      },
      {
        "cle": "bandes_de_rive_zinc",
        "regle": null,
        "preuve": "ligne 6 : « 4 m »",
        "valeur": "4 m",
        "libelle": "Bandes de rive zinc",
        "origine": "devis"
      },
      {
        "cle": "faconnage_zinc",
        "regle": null,
        "preuve": "",
        "valeur": null,
        "libelle": "Façonnage zinc",
        "origine": "manquante"
      }
    ]
  },
  "notes": [
    "Page 3 : seulement la mention « Bon pour accord » et la signature, rien à acheter."
  ],
  "lignes": [
    {
      "ref": "1",
      "role": "fourniture",
      "unite": "m²",
      "quantite": "48",
      "designation": "Fourniture d'ardoises naturelles 32x22 et crochets de 11",
      "fournitures": [
        {
          "nom": "Ardoises naturelles 32×22",
          "unite": null,
          "attend": [
            "pureau"
          ],
          "donnees": {
            "pente": "30",
            "surface": "48"
          },
          "ouvrage": "couverture-ardoises-crochet",
          "quantite": null,
          "aPreciser": [
            "qualité",
            "teinte"
          ],
          "precision": "pour la couverture de l'extension",
          "emplacement": "ardoise"
        },
        {
          "nom": "Crochets d'ardoise inox de 11",
          "unite": null,
          "attend": [],
          "donnees": {
            "surface": "48",
            "longueur_crochet": "11"
          },
          "ouvrage": "couverture-ardoises-crochet",
          "quantite": null,
          "aPreciser": [],
          "precision": "crochets de fixation en inox de 11",
          "emplacement": "crochet"
        }
      ]
    },
    {
      "ref": "2",
      "role": "pose",
      "unite": "m²",
      "quantite": "48",
      "designation": "Pose de couverture en ardoises 32x22",
      "fournitures": []
    },
    {
      "ref": "3",
      "role": "fourniture",
      "unite": "m",
      "quantite": "10",
      "designation": "Fourniture de gouttière Havraise en zinc",
      "fournitures": [
        {
          "nom": "Gouttière havraise zinc",
          "unite": "ml",
          "attend": [
            "developpe_gouttiere"
          ],
          "donnees": {
            "nb_descentes": "2",
            "fixation_crochet": "1",
            "diametre_descente": "80",
            "longueur_gouttiere": "10"
          },
          "ouvrage": "gouttiere",
          "quantite": "10",
          "aPreciser": [],
          "precision": "y compris retour d'angle et gouttière au-dessus de la verrière",
          "emplacement": "profil"
        }
      ]
    },
    {
      "ref": "4",
      "role": "fourniture",
      "unite": "unités",
      "quantite": "20",
      "designation": "Fourniture de crochets de gouttière Havraise",
      "fournitures": [
        {
          "nom": "Crochets de gouttière havraise, acier galvanisé ou zinc",
          "unite": "u",
          "attend": [
            "developpe_gouttiere"
          ],
          "donnees": {
            "fixation_crochet": "1"
          },
          "ouvrage": "gouttiere",
          "quantite": "20",
          "aPreciser": [
            "matière : acier galvanisé ou zinc"
          ],
          "precision": "fixation sur chevrons, espacement tous les 50 cm",
          "emplacement": "crochet"
        }
      ]
    },
    {
      "ref": "5",
      "role": "pose",
      "unite": "m",
      "quantite": "10",
      "designation": "Pose de gouttière Havraise sur chevrons",
      "fournitures": []
    },
    {
      "ref": "6",
      "role": "fourniture",
      "unite": "m",
      "quantite": "4",
      "designation": "Fourniture de bandes de rive en zinc (verrière)",
      "fournitures": [
        {
          "nom": "Bandes de rive zinc pour verrière",
          "unite": "ml",
          "attend": [
            "faconnage"
          ],
          "donnees": {
            "longueur_bande": "4"
          },
          "ouvrage": "bandes-zinc",
          "quantite": "4",
          "aPreciser": [
            "développé"
          ],
          "precision": "finition latérale de la verrière conservée",
          "emplacement": "bande"
        }
      ]
    },
    {
      "ref": "7",
      "role": "pose",
      "unite": "m",
      "quantite": "4",
      "designation": "Pose de bandes de rive en zinc (verrière)",
      "fournitures": []
    },
    {
      "ref": "8",
      "role": "fourniture",
      "unite": "m",
      "quantite": "8",
      "designation": "Fourniture de bande de faîtage zinc dev 25cm",
      "fournitures": [
        {
          "nom": "Bande de faîtage zinc dév. 25 cm",
          "unite": "ml",
          "attend": [
            "faconnage"
          ],
          "donnees": {
            "developpe": "250",
            "longueur_faitage": "8"
          },
          "ouvrage": "faitage-zinc",
          "quantite": "8",
          "aPreciser": [],
          "precision": "couronnement de la toiture",
          "emplacement": "bande"
        }
      ]
    },
    {
      "ref": "9",
      "role": "pose",
      "unite": "m",
      "quantite": "8",
      "designation": "Pose de bande de faîtage en zinc",
      "fournitures": []
    },
    {
      "ref": "10",
      "role": "fourniture",
      "unite": "m",
      "quantite": "4",
      "designation": "Fourniture de bande porte-solin zinc et mortier ciment",
      "fournitures": [
        {
          "nom": "Bande porte-solin zinc",
          "unite": "ml",
          "attend": [
            "faconnage"
          ],
          "donnees": {
            "longueur_bande": "4"
          },
          "ouvrage": "bande-porte-solin",
          "quantite": "4",
          "aPreciser": [],
          "precision": "solin d'étanchéité contre le mur existant",
          "emplacement": "porte_solin"
        },
        {
          "nom": "Mortier de ciment pour solin",
          "unite": null,
          "attend": [],
          "donnees": {
            "longueur_bande": "4"
          },
          "ouvrage": "bande-porte-solin",
          "quantite": null,
          "aPreciser": [],
          "precision": "solin d'étanchéité contre le mur existant",
          "emplacement": "mortier"
        }
      ]
    },
    {
      "ref": "11",
      "role": "pose",
      "unite": "m",
      "quantite": "4",
      "designation": "Pose de bande porte-solin et réalisation du solin ciment",
      "fournitures": []
    },
    {
      "ref": "12",
      "role": "fourniture",
      "unite": "m",
      "quantite": "6",
      "designation": "Fourniture de tuyau de descente zinc diam. 80mm",
      "fournitures": [
        {
          "nom": "Tuyaux de descente zinc Ø 80",
          "unite": "ml",
          "attend": [],
          "donnees": {
            "nb_descentes": "2",
            "hauteur_descente": "3",
            "diametre_descente": "80"
          },
          "ouvrage": "descente",
          "quantite": "6",
          "aPreciser": [],
          "precision": "2 descentes de 3 m",
          "emplacement": "tube"
        }
      ]
    },
    {
      "ref": "13",
      "role": "fourniture",
      "unite": "unités",
      "quantite": "4",
      "designation": "Fourniture de coude zinc diam. 80mm",
      "fournitures": [
        {
          "nom": "Coudes zinc Ø 80",
          "unite": "u",
          "attend": [],
          "donnees": {
            "nb_descentes": "2",
            "diametre_descente": "80",
            "coudes_par_descente": "2"
          },
          "ouvrage": "descente",
          "quantite": "4",
          "aPreciser": [],
          "precision": "dévoiement des descentes, 2 jeux de 2 coudes",
          "emplacement": "coude"
        }
      ]
    },
    {
      "ref": "14",
      "role": "pose",
      "unite": "m",
      "quantite": "6",
      "designation": "Pose de tuyaux de descente et coudes zinc",
      "fournitures": []
    }
  ],
  "metier": "roofing",
  "contexte": {
    "date": "06/10/2026",
    "numéro du devis": "D-2026-020",
    "neuf ou rénovation": "extension neuve avec verrière conservée et mur existant"
  },
  "questions": [
    {
      "cle": "pureau",
      "ligne": "1",
      "texte": "À quel pureau poses-tu ces ardoises (en cm) ?",
      "unite": "cm",
      "donnee": "pureau",
      "boutons": []
    },
    {
      "cle": "developpe_gouttiere",
      "ligne": "3",
      "texte": "Gouttière havraise de 25, de 28, de 33 ou de 40 ?",
      "unite": null,
      "donnee": "développé de gouttière",
      "boutons": [
        {
          "label": "De 25",
          "valeur": "25"
        },
        {
          "label": "De 28",
          "valeur": "28"
        },
        {
          "label": "De 33",
          "valeur": "33"
        },
        {
          "label": "De 40",
          "valeur": "40"
        }
      ]
    },
    {
      "cle": "faconnage",
      "ligne": null,
      "texte": "Tes pièces pliées (rive, bandes, noue, faîtage…) : tu les plies toi-même, ou tu les achètes toutes faites ?",
      "unite": null,
      "donnee": "façonnage",
      "boutons": [
        {
          "label": "Je façonne",
          "valeur": "1"
        },
        {
          "label": "Je commande façonné",
          "valeur": "2"
        }
      ]
    }
  ]
};
