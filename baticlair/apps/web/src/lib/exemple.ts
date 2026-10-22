/**
 * LA LISTE FICTIVE DE LA PAGE PUBLIQUE : la démo guidée et la landing lisent les mêmes articles et les mêmes chiffres
 * (Greg, 22 octobre : « rends les chiffres cohérents d'une image à l'autre »). Les captures de l'app servies par la landing
 * (`public/landing/capture-*.jpg`) montrent cette même liste.
 */
/** Le faux devis d'ardoise et ce que BatiClair en sort. Tous les chiffres sont inventés. */
export const EXEMPLE = {
  devis: { numero: "D-2026-042", client: "Maison Le Goff", adresse: "Ploubazlanec (22)", objet: "Couverture ardoise 32×22, 118 m²" },
  /** Le compteur du groupe (nouveau cap) : couvreurs du secteur sur la même ligne, demandes, devis, meilleur prix. */
  compteur: { couvreurs: 30, demandes: 15, devis: 3, meilleurPrix: "0,92 €" },
  liste: [
    { designation: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "2 760 pièces" },
    { designation: "Crochet inox ardoise 100 mm", quantite: "3 paquets" },
    { designation: "Liteau sapin traité 27×38", quantite: "480 m" },
    { designation: "Écran sous-toiture HPV 1,5×50 m", quantite: "4 rouleaux" },
    { designation: "Faîtage zinc naturel 0,65 mm dév. 33", quantite: "6 longueurs de 2 m" },
  ],
  lot: { numero: 12, departement: "Côtes-d'Armor", reference: "Ardoise naturelle 32×22 Espagne 1er choix", artisans: 3, volume: "8 200 pièces", negoces: 4 },
  offre: { quantite: "2 760 pièces", prix: "0,92 € HT l'unité", negoce: "Négoce Exemple, Guingamp", baisse: "−12 %", livraison: "3 novembre", economie: "286 €", livre: "2 584 € HT livré à Ploubazlanec", fraisLivraison: "45 €", habituel: "1,04 €" },
} as const;
