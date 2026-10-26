/**
 * LA PREUVE PLUTÔT QUE LA PROMESSE (landing « niveau studio », Greg, 26 octobre 2026). Chaque chiffre de la page vient d'ici,
 * avec sa source ; aucun n'est inventé. Une donnée encore absente cache son bloc au lieu d'afficher un chiffre de remplissage.
 */

/**
 * L'extrait du vrai devis lu en haut de page : DE00000071, devis de couvreur anonymisé et relu par Greg
 * (`packages/domain/src/lecture/exemples/de00000071.ts`). Chaque ligne du devis dit ce qu'elle donne dans la liste ; la ligne
 * de main-d'œuvre ne donne rien (règle numéro un : jamais un article absent du devis).
 */
export const DEVIS_EXEMPLE = {
  reference: "DE00000071",
  sujet: "Couverture bac acier",
  lignes: [
    {
      n: "1",
      texte: "Fourniture et pose de gouttière demi-ronde en zinc naturel sur bac acier avec crochets galva Négrafix",
      quantite: "17,40",
      fournitures: [{ nom: "Gouttière demi-ronde zinc naturel", quantite: "17,40 m", aPreciser: false }],
    },
    { n: "2", texte: "Dépose et repose des tôles pour accès chéneau", quantite: "1,00", fournitures: [] },
    {
      n: "5",
      texte: "Fourniture velux SK06 114x118 GGL à rotation, vitrage confort, finition white finish avec raccord ZWC",
      quantite: "4,00",
      fournitures: [
        { nom: "Velux GGL SK06 114×118 white finish", quantite: "4 u", aPreciser: false },
        { nom: "Raccords SK06 pour bac acier", quantite: "4 u", aPreciser: true },
      ],
    },
  ],
} as const;

/**
 * L'écart entre un pot acheté seul et le même pot en palette négociée (Greg, 26 octobre 2026, mot pour mot : « Blanc mat
 * professionnel 15 L : seul, 6 à 7 € HT le litre ; en palette négociée, moins de 3 € HT le litre. Affiche « Le même pot, deux
 * fois moins cher ». Mention en petit : « Exemple ». Sans nommer de marque ni d'enseigne. ») Remplace l'ardoise du 26 au
 * matin, dont les prix n'avaient pas été donnés.
 */
export const ECART_PEINTURE = {
  titre: "Le même pot, deux fois moins cher.",
  article: "Blanc mat professionnel, pot de 15 L",
  seul: { prix: "6 à 7 €", unite: "HT le litre" },
  palette: { prix: "moins de 3 €", unite: "HT le litre" },
  mention: "Exemple",
} as const;

/**
 * Un regroupement, marqué « exemple » (Greg, 26 octobre 2026 : « celui de la recette, on le remplacera par le premier vrai ») :
 * la recette en ligne du 26 octobre (`docs/groupe/captures/revue-lot-a/recette-chasseur/`).
 */
export const REGROUPEMENT_EXEMPLE = {
  article: "Ardoise naturelle 32×22 Espagne 1er choix",
  departement: "Côtes-d'Armor (22)",
  entreprises: 2,
  quantite: "2 400 pièces",
  besoin: "au plus tôt le 16 novembre",
} as const;

/** Les vrais écrans de l'app (mode humain, iPhone 15, 26 octobre 2026), en AVIF et WebP à deux largeurs. */
export const ECRANS = {
  depot: { nom: "app-depot", alt: "L'écran « Nouvelle liste » de Mobiiz : donner sa liste ou déposer son devis" },
  liste: { nom: "app-liste", alt: "La liste de fournitures préparée par Mobiiz, prête à envoyer aux négoces" },
  prix: { nom: "app-prix", alt: "Les prix reçus de trois négoces, livraison comprise, la moins chère en tête" },
} as const;
