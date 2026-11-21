import { parseFiche } from "../../referential/fiche.js";
import type { LectureDevis } from "../lecture.js";

/**
 * §51.5 : la LECTURE du devis DE00000071 telle que le modèle le plus capable la rend (devis complet + référentiel, un
 * appel), relue par le fondateur : la fiche, le bref, les cinq questions, et pour chaque ligne la fourniture nommée ou
 * « sans fourniture ». C'est l'entrée du test permanent (`test/lecture-de00000071.test.ts`) et la lecture que le lecteur
 * simulé rend pour ce devis en développement ; le calcul (ratios, conversions) reste au code. Données anonymisées.
 */
export const DE00000071_LECTURE: LectureDevis = {
  metier: "roofing",
  lots: [],
  fiche: parseFiche([
    { donnee: "ouvrage", valeur: "toiture existante en bac acier isolé, pas de couverture neuve", origine: "lue", preuve: "lignes 1, 6, 9 : « sur bac acier isolé »" },
    { donnee: "gouttière", valeur: "demi-ronde zinc naturel, 17,40 m, sur crochets Négrafix", origine: "lue", preuve: "ligne 1" },
    { donnee: "développé de la gouttière", valeur: "", origine: "manquante" },
    { donnee: "nombre de descentes", valeur: "", origine: "manquante" },
    { donnee: "chéneau", valeur: "11,70 m, refait en membrane EPDM ou PVC", origine: "lue", preuve: "ligne 3" },
    { donnee: "fenêtres de toit", valeur: "4 Velux SK06 114×118 GGL white finish et 1 Velux MK04 78×98 GGU ever finish", origine: "lue", preuve: "lignes 5 et 8" },
    { donnee: "raccords des fenêtres", valeur: "pour bac acier : ZWC (lignes 5 et 8) ou Pratikal (lignes 6 et 9), le devis dit les deux", origine: "lue", preuve: "lignes 5, 6, 8, 9" },
    { donnee: "tôles bac acier", valeur: "10, en étanchéité au-dessus des Velux", origine: "lue", preuve: "ligne 10" },
  ])!,
  bref: [
    "Toiture existante en bac acier isolé, pas de couverture neuve",
    "Gouttière demi-ronde zinc naturel 17,40 m sur crochets Négrafix",
    "Chéneau 11,70 m refait en membrane",
    "4 Velux SK06 114×118 GGL white finish et 1 MK04 78×98 GGU ever finish avec raccords pour bac acier",
    "Tôles bac acier en étanchéité au-dessus des Velux",
  ],
  questions: [
    { cle: "developpe_gouttiere", texte: "Développé de la gouttière demi-ronde : de 25 ou de 33 ?", boutons: [{ label: "De 25", valeur: "25" }, { label: "De 33", valeur: "33" }], unite: "cm", donnee: "développé de gouttière", ligne: null },
    { cle: "nb_descentes", texte: "Combien de descentes pour cette gouttière ?", boutons: [{ label: "1", valeur: "1" }, { label: "2", valeur: "2" }, { label: "3", valeur: "3" }, { label: "4", valeur: "4" }], unite: "u", donnee: "nombre de descentes", ligne: null },
    { cle: "cheneau_membrane", texte: "Chéneau : membrane EPDM ou PVC, et quelle largeur développée ?", boutons: [{ label: "EPDM", valeur: "EPDM" }, { label: "PVC", valeur: "PVC" }], unite: null, donnee: "membrane du chéneau et largeur développée", ligne: "3" },
    { cle: "raccord_velux", texte: "Raccord des Velux : ZWC (ligne fourniture) ou Pratikal (ligne pose) ? Le devis dit les deux.", boutons: [{ label: "ZWC", valeur: "ZWC" }, { label: "Pratikal", valeur: "Pratikal" }], unite: null, donnee: "raccord ZWC ou Pratikal", ligne: null },
    { cle: "toles_bac_acier", texte: "Tôles bac acier : 10 tôles ou 10 m², et de quelle longueur ?", boutons: [{ label: "10 tôles", valeur: "10 tôles" }, { label: "10 m²", valeur: "10 m²" }], unite: null, donnee: "unité des tôles et longueur", ligne: "10" },
  ],
  lignes: [
    {
      ref: "1",
      designation: "Fourniture et pose de gouttière demi-ronde en zinc naturel sur bac acier avec crochets galva Négrafix",
      quantite: "17,40",
      unite: null,
      role: "fourniture_et_pose",
      fournitures: [
        { nom: "Gouttière demi-ronde zinc naturel", quantite: "17,40", unite: "ml", ouvrage: "gouttiere", emplacement: "profil", donnees: {}, attend: ["developpe_gouttiere"], aPreciser: [], precision: null },
        { nom: "Crochets de gouttière Négrafix galva", quantite: null, unite: null, ouvrage: "gouttiere", emplacement: "crochet", donnees: {}, attend: [], aPreciser: [], precision: null },
      ],
    },
    { ref: "2", designation: "Dépose et repose des tôles pour accès chéneau", quantite: "1,00", unite: null, role: "pose", fournitures: [] },
    {
      ref: "3",
      designation: "Réfection de chéneau en membrane EPDM ou PVC",
      quantite: "11,70",
      unite: null,
      role: "fourniture_et_pose",
      fournitures: [{ nom: "Membrane de chéneau EPDM ou PVC", quantite: "11,70", unite: "ml", ouvrage: null, emplacement: null, donnees: {}, attend: ["cheneau_membrane"], aPreciser: [], precision: null }],
    },
    { ref: "4", designation: "Réalisation des trémies de charpente pour velux SK06", quantite: "4,00", unite: null, role: "pose", fournitures: [] },
    {
      ref: "5",
      designation: "Fourniture velux SK06 114x118 GGL à rotation, vitrage confort, finition white finish avec raccord ZWC",
      quantite: "4,00",
      unite: null,
      role: "fourniture",
      fournitures: [
        { nom: "Velux GGL SK06 114×118 white finish, à rotation, vitrage confort", quantite: "4", unite: "u", ouvrage: "fenetre-de-toit", emplacement: "fenetre", donnees: { taille_fenetre: "114x118" }, attend: [], aPreciser: [], precision: null },
        { nom: "Raccords SK06 pour bac acier", quantite: "4", unite: "u", ouvrage: "fenetre-de-toit", emplacement: "raccord", donnees: {}, attend: ["raccord_velux"], aPreciser: [], precision: null },
      ],
    },
    { ref: "6", designation: "Pose de velux sk06 114x118 sur bac acier isolé avec raccord pratikal", quantite: "4,00", unite: null, role: "pose", fournitures: [] },
    { ref: "7", designation: "Réalisation des trémies de charpente pour velux MK04", quantite: "1,00", unite: null, role: "pose", fournitures: [] },
    {
      ref: "8",
      designation: "Fourniture velux MK04 78,98 GGU à rotation, vitrage confort, finition ever finish avec raccord ZWC",
      quantite: "1,00",
      unite: null,
      role: "fourniture",
      fournitures: [
        { nom: "Velux GGU MK04 78×98 ever finish, à rotation, vitrage confort", quantite: "1", unite: "u", ouvrage: "fenetre-de-toit", emplacement: "fenetre", donnees: { taille_fenetre: "mk04" }, attend: [], aPreciser: [], precision: null },
        { nom: "Raccord MK04 pour bac acier", quantite: "1", unite: "u", ouvrage: "fenetre-de-toit", emplacement: "raccord", donnees: {}, attend: ["raccord_velux"], aPreciser: [], precision: null },
      ],
    },
    { ref: "9", designation: "Pose de velx MK04 7898 sur bac acier isolé avec raccord pratikal", quantite: "1,00", unite: null, role: "pose", fournitures: [] },
    {
      ref: "10",
      designation: "Fourniture et pose de tôles bacs acier pour étanchéité du dessus de velux",
      quantite: "10,00",
      unite: null,
      role: "fourniture_et_pose",
      fournitures: [{ nom: "Tôles bac acier pour étanchéité au-dessus des Velux", quantite: "10", unite: null, ouvrage: null, emplacement: null, donnees: {}, attend: ["toles_bac_acier"], aPreciser: ["profil", "teinte"], precision: null }],
    },
  ],
  contexte: { "numéro du devis": "DE00000071", date: "13/03/2022" },
  notes: [],
};
