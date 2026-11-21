import { line, resetLines, type BenchLine } from "./truth.js";

/**
 * Devis réel d'un pisciniste (piscine intérieure 6 × 3 m, 2021). Fourni par
 * le fondateur le 2026-10-01. ANONYMISÉ : code article, désignation,
 * quantité, unité.
 *
 * BRUT : désignations telles que sorties du lecteur PDF de l'application,
 * avec ses défauts (« BÉT ON », « POLYST YRÈNE » : lettres séparées par la
 * police du document). Le devis n'a PAS de colonne d'unité : l'unité est
 * parfois dans le texte (« Au m2 », « Barre de 3 ML »).
 */
resetLines();
export const PISCINE_LINES: BenchLine[] = [
  line(
    "COMMENTAIRES -DEVIS DE PISCINE INTERIEURE 6x 3 ( y compris volet immergé ) fond plat en pente 1.5 x 2.1 M escalier angle HORS TERRASSEMENT ET REMBLAIEMENT",
    "1,00",
    null,
    "I",
    "Dimensions du bassin (6 × 3) : information utile aux autres lignes.",
  ),
  line("11086 DALLE BÉT ON. Fond de piscine Ep 15 cm.", "1,00", null, "C", "Béton : 6 × 3 × 0,15 = 2,7 m³ d'après l'en-tête (information ailleurs)."),
  line("POSE77 POSE BLOCS POLYST YRÈNE. Y compris ferraillage et béton. Le m².", "1,00", null, "LI", "Ferraillage et béton de remplissage à acheter, non quantifiés."),
  line("12062 BLOC POLYST YRÈNE A COFFRER- 1M25. 1.25m x 0.25 m x 0.30 m.", "145,00", null, "D"),
  line("10701 ESCALIER BET ON ANGLE 3 MARCHES.", "1,00", null, "D"),
  line("12066 BOUCHON D'ANGLE. Ensemble haut et bas.", "28,00", null, "D"),
  line("10681BLOC FRAIS DE PORT SPÉCIAL BLOCS . Pour une livraison au magasin..", "1,00", null, "I"),
  line("10008 SKIMMER POUR PISCINE LINER.", "1,00", null, "D"),
  line("10003 BUSE DE REFOULEMENT PISCINE LINER", "2,00", null, "D"),
  line("10014 PRISE BALAI POUR PISCINE LINER.", "1,00", null, "D"),
  line("10395 T RAVERSEE PAROI PISCINE LINER 30 CM.", "3,00", null, "D"),
  line("10005 PROJECT EUR PISCINE LINER 300 W 12 V.", "1,00", null, "D"),
  line(
    "12018 AMPOULE PAR56 315 LED COULEUR avec TELECOMMANDE Puissance : 31 w Couleur : rouge / vert / bleu Luminosité : jusqu'à 675 Lm Eco-participation 0.16 € HT",
    "1,00",
    null,
    "D",
  ),
  line("10001 BOIT E DE CONNEXION ABS SECURIT E.", "1,00", null, "D"),
  line("10013 PASSE CABLE FLEXIBLE AST RAL.", "1,00", null, "D"),
  line("10459 POOL T ERRE/ AQUAT ERRE. Pour la mise à la terre du circuit hydraulique..", "1,00", null, "D"),
  line(
    "10243 T UYAU SOUPLE PVC D 50- EST IMAT IF.",
    "80,00",
    null,
    "D",
    "Désignation en bas de page 1, quantité en haut de page 2. « ESTIMATIF » : quantité à confirmer. Unité implicite (mètres).",
  ),
  line(
    "10381 COFFRET ÉLECT RIQUE 100VA Mono. FILT RAT ION + 1 PROJECT EUR + 2 MACHINES . - Protection par interrupteur différentiel 30 mA. - Gestion de la filtration par horloge journalière (disjoncteur magnéto-thermique pour calibre maxi. 10 A ). - 2 départs sur disjoncteur, asservis au fonctionnement de la filtration (traitement, sel, PH, UV, etc ...). - 1 Prise de courant 230 V~ positionnée en latéral du coffret et protégée par un disjoncteur.",
    "1,00",
    null,
    "D",
  ),
  line("10146 POMPE FLOPRO 50M ZODIAC. 0.50 CV - 0,37 Kw. 10.3 M3/ H à 16.8M3/ H", "1,00", null, "D"),
  line("10433 FILT RE A SABLE ZODIAC MS470. maxi 8m3/ h. 85 Kg de sable.", "1,00", null, "D", "85 kg de média filtrant : à rapprocher du gravier + sable commandés."),
  line("12001 GRAVIER granulométrie : 1 à 2.5 mic rons. pour filtre à sable, sac de 25 kgs.", "1,00", null, "D"),
  line("11988 SABLE SAC 25KG ECOBAT I.", "3,00", null, "D"),
  line("POSE00 POSE PLOMBERIE ET FILT RAT ION.", "1,00", null, "L"),
  line(
    "POSE58 ACCESSOIRES DE RACCORDEMENT FILT RAT ION. COMPRENANT : - raccords - coudes - vannes - tés, - unions - tuyaux - etc...",
    "1,00",
    null,
    "X",
    "Forfait sans liste ni quantités : impossible à commander tel quel.",
  ),
  line("10452 RAIL POUR SOLIDBRIC. Barre de 3 ML.", "8,00", null, "D", "8 barres de 3 ml."),
  line(
    "10284 ALKOR BIOCIDE 1 Litre. T RAIT EMENT DU SUPPORT . Sanitized est un agent antifongique puissant pour lutter contre la prolifération des micro organismes présents dans les maçonneries. Il permet de diminuer sérieusement le risque d'apparition de tâches sur le liner..",
    "1,00",
    null,
    "D",
  ),
  line("10101 COLLE SPÉCIALE POUR FEUT RE. Pot de 5 KG.", "1,00", null, "D"),
  line("12224 COLLE EN SPRAY SUPERPRO 500ML.", "4,00", null, "D"),
  line("10103 FEUT RE POUR PISCINE 350 G/ M2. Au m2. Feutre anti-bactérie. Largeur du rouleau : 2 mètres .", "43,00", null, "D", "Vendu au m² (« Au m2 ») : unité écrite dans le texte, pas dans une colonne."),
  line("POSE19 POSE FEUT RE PISCINE. AU M/ 2", "43,00", null, "L"),
  line("POSE36 POSE FEUT RE ESCALIER.", "1,00", null, "L"),
  line(
    "10702 LINER ARME UNI 150/ 100è. Coloris : Bleu azur, Blanc, Gris, Sable. Pour rénovation et neuf. Pour toutes les formes et tailles de piscine. Trés grande longévité. Excellent rapport qualité-prix. Garantie fabricant décanale non dégressive. Normes ISO 9001. Assurance fabricant SMABTP N°206766 L. PRIX LINER POSE.",
    "43,00",
    null,
    "D",
    "Coloris à choisir parmi 4 : question réelle. Liner fabriqué sur mesure (prix posé).",
  ),
  line(
    "10880 BIO UV PACKAGE PLUS OXY 30 COMBI Pour les bassins jusqu'a 80m3 Concept de traitement automatique sans chlore comprenant : 1 réacteur UV 1 combipool : régul remanent+regul ph 1 sonde de température pour injection Oxygène rémanent 1 bio-uv choc 10 l 1 bio-uv remanent 10 kg 1 algicide super concentré 1 l 1 ph minus 10 l",
    "1,00",
    null,
    "D",
  ),
  line("POSE57 POSE BIO-UV PACKAGE.", "1,00", null, "L"),
  line(
    "11604 VOLET IMMERGE ROLLINSIDE . motorisation en coffre sec pour une maintenance facilitée ou tubulaire, parfaitement adaptée pour la rénovation. . Concept très fonctionnel se décline en 2 versions :. - Habillage 1 face à l'horizontale pour une intégration dans un escalier.. - Habillage 2 faces en verticale et à l'horizontale.. Adapté aux piscines avec une étanchéité carrelage, membrane armée ou liner. . Commande à distance par Wi-Key, le boî tier déporté sans fil ou à bouton à clé. . Tablier composé de lames PVC opaques. Lames opaque beige, gris ou blanc . Caillebotis de finition du coffre volet en PVC . CONFORME A LA NORME NF-P-90-308 . Garantie moteur et lames: 3 ans.",
    "1,00",
    null,
    "D",
    "Version (1 ou 2 faces), commande et couleur des lames à choisir : questions réelles.",
  ),
  line("POSE21 POSE VOLET IMMERGE.", "1,00", null, "L"),
  line(
    "10851 N AGE A CON TR E COU R AN T N AD OR SEF 3 0 0 M o n o . Pompe Nadorself Facade Pièces à sceller Coffret pneumatique.",
    "1,00",
    null,
    "D",
    "Désignation illisible telle quelle (« N AGE A CON TR E COU R AN T ») : le lecteur PDF sépare les lettres.",
  ),
  line("POSE15 POSE NAGE A CONT RE COURANT .", "1,00", null, "L"),
  line(
    "11854 CASCADE BALI MINI avec pompe raccordement coffret et telecommande Hauteur : 48 cm largeur de la lame : 35 cm Matériau : inox AISI 304",
    "1,00",
    null,
    "D",
  ),
  line(
    "10524 DESHUMIDIFICATEUR 3 EN 1 PAC DH 30 DF HR Appareil permettant d'assurer sans appoint, la totalité des besoins d'une piscine couverte, à savoir : - Déshumidification de l'air ambiant - Chauffage de l'air - Chauffage de l'eau Caractéristiques: L 600 , H 100 , l 600 , 145 Kgs Pouvoir de déshumidification : 7 L/h COP : 3.8 à 5.9 Débit d'air traité : 1500 m3/h Intensité maxi 7.5Amp",
    "1,00",
    null,
    "D",
  ),
  line("10134 ECHANGEUR TITANE. .", "1,00", null, "D"),
  line(
    "POSE58 ACCESSOIRES DE RACCORDEMENT FILT RAT ION. COMPRENANT : - raccords - coudes - vannes - tés, - unions - tuyaux - etc...",
    "1,00",
    null,
    "X",
    "Même libellé que plus haut, pour le déshumidificateur : forfait indéterminé.",
  ),
  line("POSE48 POSE ET RACCORDEMENT DESHUMIDIFICATEUR. mise en route et essais.", "1,00", null, "L"),
  line(
    "10045 KIT D'ENT RET IEN NET T OYAGE. . 1 tête de balai triangulaire . 1 épuisette . 1 thermomètre non flottant . 1 trousse d'analyse chlore / PH . 1 brosse de paroi PVC ET ligne d'eau . 1 tuyau flottant 8 ml . 1 manche télescopique.",
    "1,00",
    null,
    "D",
    "Désignation en bas de page 3, quantité en haut de page 4.",
  ),
  line(
    "10856 NET T OYAGE PISCINE ET MISE EN ROUT E. COMPRENANT :. Nettoyage de finition intérieur piscine . Passage du robot . Mise en route, essais filtration et réglage. . HORS PRODUIT S.",
    "1,00",
    null,
    "L",
  ),
  line(
    "SECURIT E : INFORMAT IONS. LOI DU 03/ 01/ 2004. ARTICLE L 128/ 1. Toutes piscines achevées après le 1 janvier 2004 doivent recevoir l'un des 4 dispositifs de sécurité.",
    "1,00",
    null,
    "I",
  ),
];
