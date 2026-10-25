/**
 * LA LISTE FICTIVE DE LA PAGE PUBLIQUE : la démo guidée et la landing lisent les mêmes articles et les mêmes chiffres
 * (Greg, 22 octobre : « rends les chiffres cohérents d'une image à l'autre »). Les captures de l'app servies par la landing
 * (`public/landing/capture-*.jpg`) montrent cette même liste.
 */
const LISTE_COUVERTURE = [
  { designation: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "2 760 pièces" },
  { designation: "Crochet inox ardoise 100 mm", quantite: "3 paquets" },
  { designation: "Liteau sapin traité 27×38", quantite: "480 m" },
  { designation: "Écran sous-toiture HPV 1,5×50 m", quantite: "4 rouleaux" },
  { designation: "Faîtage zinc naturel 0,65 mm dév. 33", quantite: "6 longueurs de 2 m" },
] as const;

/** Le faux devis d'ardoise et ce que BatiClair en sort. Tous les chiffres sont inventés. */
export const EXEMPLE = {
  devis: { numero: "D-2026-042", client: "Maison Le Goff", adresse: "Ploubazlanec (22)", objet: "Couverture ardoise 32×22, 118 m²" },
  /**
   * Le regroupement du mois (Greg, 22 octobre 2026, au soir) : en QUANTITÉS, jamais en nombre d'entreprises ; remplace
   * le compteur « 30 couvreurs, 15 demandes… ».
   */
  commande: {
    de: "du 1er novembre",
    toi: "Toi seul : 3 palettes d'ardoises 32×22, 400 m de liteaux",
    tout: "Toute la commande du 1er novembre : 52 palettes d'ardoises 32×22, 6 000 m de liteaux",
    cloture: "Clôture dans 9 j",
  },
  liste: LISTE_COUVERTURE,
  /**
   * LA DÉMO EST MULTIMÉTIER (Greg, 24 octobre 2026) : la même remise au propre sur une liste de couverture, de plomberie
   * et de placo. La couverture reste la liste de la landing (`liste` ci-dessus) ; les deux autres sont inventées aussi.
   */
  metiers: [
    { metier: "Couverture", photo: "Ploubazlanec (22) · Couverture ardoise 32×22, 118 m²", liste: LISTE_COUVERTURE },
    {
      metier: "Plomberie",
      photo: "Paimpol (22) · Salle de bain et chauffe-eau",
      liste: [
        { designation: "Tube multicouche 16×2 en couronne de 50 m", quantite: "2 couronnes" },
        { designation: "Coude à sertir multicouche 16", quantite: "24 pièces" },
        { designation: "Tube PVC évacuation Ø100", quantite: "4 longueurs de 4 m" },
        { designation: "Chauffe-eau électrique 200 L vertical", quantite: "1 pièce" },
        { designation: "Collier Atlas Ø16", quantite: "1 boîte de 100" },
      ],
    },
    {
      metier: "Placo",
      photo: "Lannion (22) · Cloisons 72/48, 96 m²",
      liste: [
        { designation: "Plaque BA13 standard 2,50×1,20 m", quantite: "48 plaques" },
        { designation: "Rail R48 de 3 m", quantite: "30 longueurs" },
        { designation: "Montant M48 de 3 m", quantite: "70 longueurs" },
        { designation: "Laine de verre 45 mm en rouleau", quantite: "6 rouleaux" },
        { designation: "Vis TTPC 25 mm", quantite: "2 boîtes de 1 000" },
      ],
    },
  ],
  lot: { numero: 12, departement: "Côtes-d'Armor", reference: "Ardoise naturelle 32×22 Espagne 1er choix", artisans: 3, volume: "8 200 pièces", negoces: 4 },
  offre: { quantite: "2 760 pièces", prix: "0,92 € HT l'unité", negoce: "Négoce Exemple, Guingamp", baisse: "−12 %", livraison: "3 novembre", economie: "286 €", livre: "2 584 € HT livré à Ploubazlanec", fraisLivraison: "45 €", habituel: "1,04 €" },
} as const;
