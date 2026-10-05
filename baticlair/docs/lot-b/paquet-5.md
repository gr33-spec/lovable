# Lot B, paquet 5 : terrasse bois, pavage, terrassement, arrosage, constructeur

Écrit par `packages/domain/test/lot-b-paquet-5.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque métier : le devis de test, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Métier | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Terrasse bois | 0 | 5 | 0 | 1 |
| Pavage | 0 | 3 | 0 | 0 |
| Terrassement | 1 | 2 | 0 | 0 |
| Arrosage | 1 | 3 | 0 | 0 |
| Constructeur, entreprise générale | 6 | 14 | 0 | 1 |

## Terrasse bois

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Terrasse bois pin classe 4 sur lambourdes et plots réglables | 32 m² |

**À l'ouverture : 0 verte · 5 orange · 0 grise.**

Questions du comptoir :
- Plots réglables : quelle hauteur ? (40 à 60 mm / 60 à 90 mm / 90 à 150 mm)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Lames pin classe 4 27×145, L 4,20 m | 56 lames | Quantité à confirmer : lames +10 % |
| Lambourdes classe 4 45×70, L 4 m | 18 lambourdes | Quantité à confirmer : lambourdes tous les 0,5 m, lambourdes +10 % |
| Saturateur terrasse, pot 5 L | 2 pots de 5 L | Quantité à confirmer : saturateur 4 m² par litre en première couche, pot de 5 L (sources en désaccord) |
| Plots réglables | — | attend une réponse à une question |
| Vis inox terrasse 5 × 50 | 960 pièces | Quantité à confirmer : 30 vis par m² |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Lames pin classe 4 27×145, L 4,20 m | 56 lames |  | chiffrable |
| Lambourdes classe 4 45×70, L 4 m | 18 lambourdes |  | chiffrable |
| Plots réglables 40 à 60 mm | 112 plots |  | chiffrable |
| Vis inox terrasse 5 × 50 | 960 pièces |  | chiffrable |
| Saturateur terrasse, pot 5 L | 2 pots de 5 L (8 L) |  | chiffrable |

## Pavage

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Allée de garage en pavés béton gris sur lit de sable | 45 m² |
| 2 | Bordures béton T2 | 28 ml |

**À l'ouverture : 0 verte · 3 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Pavés béton ép. 8 cm, palette de 10 m² | 5 palettes de 10 m² | Quantité à confirmer : pavés +5 %, palette de 10 m² |
| Sable 0/4, big-bag 1 t | 3 big-bags d'1 t | Quantité à confirmer : lit de sable de 3 cm, sable 1,6 t/m³ |
| Bordures béton T2 15 × 25 × 100 | 30 bordures | Quantité à confirmer : bordures +5 % |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Pavés béton ép. 8 cm, palette de 10 m² | 5 palettes de 10 m² | modèle et coloris du devis | chiffrable |
| Sable 0/4, big-bag 1 t | 3 big-bags d'1 t (2 160 kg) |  | chiffrable |
| Bordures béton T2 15 × 25 × 100 | 30 bordures |  | chiffrable |

## Terrassement

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Couche de forme GNT 0/31,5 ép 20 cm sous dallage | 60 m² |
| 2 | Film polyane sous dallage | 60 m² |
| 3 | Fosse toutes eaux, maison 5 pièces | 1 u |

**À l'ouverture : 1 verte · 2 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| GNT 0/31,5 en vrac | 27 tonnes | Quantité à confirmer : GNT 2 t/m³ compactée, GNT +10 % |
| Film polyane 150 µm, rouleau 150 m² | 1 rouleau de 150 m² | Quantité à confirmer : film +20 % de recouvrements |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| GNT 0/31,5 en vrac | 27 tonnes (26 400 kg) |  | chiffrable |
| Film polyane 150 µm, rouleau 150 m² | 1 rouleau de 150 m² (72 m²) |  | chiffrable |
| Fosse toutes eaux polyéthylène 3 m³ | 1 fosse |  | chiffrable |

## Arrosage

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Arrosage automatique enterré de la pelouse, tuyères, 4 zones | 300 m² |

**À l'ouverture : 1 verte · 3 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Tube PE 25 PN6, couronne 50 m | 2 couronnes de 50 m | Quantité à confirmer : 0,25 m de tube par m², couronne de 50 m |
| Arroseurs tuyères escamotables | 25 pièces | Quantité à confirmer : un arroseur pour 12 m² |
| Électrovannes 24 V 1" | 4 pièces | Quantité à confirmer : une électrovanne pour 75 m² |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Tube PE 25 PN6, couronne 50 m | 2 couronnes de 50 m (75 m à couvrir) |  | chiffrable |
| Arroseurs tuyères escamotables | 25 pièces |  | chiffrable |
| Électrovannes 24 V 1" | 4 pièces |  | chiffrable |
| Programmateur d'arrosage 4 stations, sur secteur | 1 pièce |  | chiffrable |

## Constructeur, entreprise générale

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Dallage béton 12 cm sur hérisson, treillis ST25C | 90 m² |
| 2 | Mur en parpaings de 20 | 110 m² |
| 3 | Cloison 72/48 BA13 sur ossature | 65 m² |
| 4 | Prise de courant 16A 2P+T, gamme Dooxie | 24 u |
| 5 | Carrelage sol grès cérame 60x60 rectifié, pose droite | 75 m² |
| 6 | Peinture murs et plafonds mate, 2 couches | 260 m² |

**À l'ouverture : 6 vertes · 14 orange · 0 grise.**

Questions du comptoir :
- Une couche d'impression : oui ou non ? (Oui / Non)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Blocs béton creux de 20 (50×20) | 1 155 blocs | Quantité à confirmer : blocs +5 % de casse |
| Mortier de montage, sac 35 kg | 121 sacs de 35 kg | Quantité à confirmer : mortier +10 % |
| Hérisson 20/40, big-bag 1 t | 32 big-bags d'1 t | Quantité à confirmer : hérisson 1,6 t/m³ (sources en désaccord), hérisson +10 % |
| Film polyane 150 µm, rouleau 100 m² | 2 rouleaux de 100 m² | Quantité à confirmer : film +15 % de recouvrements |
| Treillis soudé ST25C 6,00 × 2,40 | 8 panneaux | Quantité à confirmer : treillis 11,8 m² utiles par panneau |
| Béton C25/30 (toupie) | 12 m³ | Quantité à confirmer : béton +5 % |
| Rails R48 3 m | 18 longueurs de 3 m | Quantité à confirmer : 2 rails par cloison (haut et bas), longueur de 3 m |
| Montants M48 | 45 pièces | Quantité à confirmer : 1 montant par entraxe + 1 de départ |
| Gaine préfilée 3G2,5 Ø20, couronne 100 m | 2 couronnes de 100 m | Quantité à confirmer : 8 m de gaine par prise, couronne de 100 m |
| Carrelage grès cérame 60×60 | 58 cartons de 1,44 m² | Quantité à confirmer : pertes de coupe 8 %, 1 carton de réserve dès 20 m² |
| Mortier-colle C2 S1, sac 25 kg | 18 sacs de 25 kg | Quantité à confirmer : colle +5 % de reste |
| Mortier de joint, sac 5 kg | 2 sacs de 5 kg | Quantité à confirmer : joint +10 % au lavage |
| Peinture acrylique mate blanche, seau de 15 L | 4 seaux de 15 L | Quantité à confirmer : peinture +5 % au rouleau |
| Impression acrylique, seau 15 L | — | attend une réponse à une question |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Blocs béton creux de 20 (50×20) | 1 155 blocs (≈ 17 palettes de 70) | palettes avec blocs d'angle et de coupe | chiffrable |
| Mortier de montage, sac 35 kg | 121 sacs de 35 kg (4 235 kg) |  | chiffrable |
| Hérisson 20/40, big-bag 1 t | 32 big-bags d'1 t (31,68 t) |  | chiffrable |
| Film polyane 150 µm, rouleau 100 m² | 2 rouleaux de 100 m² (103,5 m²) |  | chiffrable |
| Treillis soudé ST25C 6,00 × 2,40 | 8 panneaux |  | chiffrable |
| Béton C25/30 (toupie) | 12 m³ | livré toupie | chiffrable |
| Plaques BA13 1,20 × 2,50 | 48 plaques |  | chiffrable |
| Vis à plaque 25 mm | 1 950 vis |  | chiffrable |
| Bande à joint | 260 ml |  | chiffrable |
| Enduit à joint | 52 kg |  | chiffrable |
| Rails R48 3 m | 18 longueurs de 3 m (52 ml à couvrir) |  | chiffrable |
| Montants M48 | 45 pièces |  | chiffrable |
| Prise 2P+T 16 A Legrand Dooxie blanc | 24 pièces |  | chiffrable |
| Boîtes d'encastrement 1 poste | 24 boîtes |  | chiffrable |
| Gaine préfilée 3G2,5 Ø20, couronne 100 m | 2 couronnes de 100 m (192 m à couvrir) |  | chiffrable |
| Carrelage grès cérame 60×60 | 58 cartons de 1,44 m² | carton entier, un seul bain | chiffrable |
| Mortier-colle C2 S1, sac 25 kg | 18 sacs de 25 kg (433,13 kg) |  | chiffrable |
| Mortier de joint, sac 5 kg | 2 sacs de 5 kg (7,84 kg) |  | chiffrable |
| Peinture acrylique mate blanche, seau de 15 L | 4 seaux de 15 L | même teinte, même lot | chiffrable |
| Impression acrylique, seau 15 L | 3 seaux de 15 L (30,33 L) |  | chiffrable |

## Le tableau de Brest (couverture), inchangé

**À l'ouverture : 4 vertes · 3 orange · 0 grise.**

Questions du comptoir :
- Quelle ardoise : Espagne 1er choix, ou ardoise NF (type Cupa) ? (Espagne 1er choix / Ardoise NF (type Cupa))
- Crochets de gouttière : sur les chevrons ou en façade (bandeau) ? (Sur les chevrons / En façade (bandeau))
- Descentes en Ø 80 ou en Ø 100 ? (Ø 80 / Ø 100 / Ø 120)
- Combien de descentes pour cette gouttière ? (1 / 2 / 3 / 4)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Ardoises 30×22 ou Crochets d'ardoise | — | attend une réponse à une question |
| Crochets de gouttière | — | attend une réponse à une question |
| Naissances | — | attend une réponse à une question |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Ardoises naturelles Espagne 1er choix 30×22 | 9 271 pièces |  | chiffrable |
| Crochets d'ardoise inox standard, longueur 11 cm | 9 457 pièces |  | chiffrable |
| Liteaux 18×40 | 2 049 ml (≈ 41 bottes de 50 ml) | lattage 200 m², une file tous les 10,25 cm | chiffrable |
| Liteaux 27×40 | 350 ml (≈ 7 bottes de 50 ml) | contre-lattage 200 m², une file tous les 60 cm | chiffrable |
| Écran HPV, rouleau 1,50 × 50 m | 3 rouleaux (214,29 m²) |  | chiffrable |
| Gouttière zinc demi-ronde dév. 33 | 6 longueurs de 4 m (24 ml à couvrir) |  | chiffrable |
| Crochets de gouttière sur chevron dév. 33 | 60 pièces |  | chiffrable |
| Naissances zinc demi-ronde dév. 33 Ø80 | 1 pièce |  | chiffrable |

