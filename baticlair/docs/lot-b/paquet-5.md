# Lot B, paquet 5 : terrasse bois, pavage, terrassement, arrosage, constructeur

Écrit par `packages/domain/test/lot-b-paquet-5.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque métier : le devis de test, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Métier | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Terrasse bois | 0 | 1 | 0 | 1 |
| Pavage | 0 | 2 | 0 | 0 |
| Terrassement | 1 | 2 | 0 | 0 |
| Arrosage | 0 | 1 | 0 | 0 |
| Constructeur, entreprise générale | 2 | 4 | 0 | 1 |

## Terrasse bois

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Terrasse bois pin classe 4 sur lambourdes et plots réglables | 32 m² |

**À l'ouverture : 0 verte · 1 orange · 0 grise.**

Questions du comptoir :
- Consommables de pose (pointes, vis, pattes, étain, silicone) : je les ajoute à la liste ? (Oui / Non)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Lames pin classe 4 27×145, L 4,20 m | 56 lames | Quantité à confirmer : lames +10 % |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Lames pin classe 4 27×145, L 4,20 m | 56 lames |  | chiffrable |
| Vis inox terrasse 5 × 50 | 960 pièces |  | chiffrable |

## Pavage

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Allée de garage en pavés béton gris sur lit de sable | 45 m² |
| 2 | Bordures béton T2 | 28 ml |

**À l'ouverture : 0 verte · 2 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Pavés béton ép. 8 cm, palette de 10 m² | 5 palettes de 10 m² | Quantité à confirmer : pavés +5 %, palette de 10 m² |
| Bordures béton T2 15 × 25 × 100 | 30 bordures | Quantité à confirmer : bordures +5 % |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Pavés béton ép. 8 cm, palette de 10 m² | 5 palettes de 10 m² | modèle et coloris du devis | chiffrable |
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

**À l'ouverture : 0 verte · 1 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Arroseurs tuyères escamotables | 25 pièces | Quantité à confirmer : un arroseur pour 12 m² |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Arroseurs tuyères escamotables | 25 pièces |  | chiffrable |

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

**À l'ouverture : 2 vertes · 4 orange · 0 grise.**

Questions du comptoir :
- Consommables de pose (pointes, vis, pattes, étain, silicone) : je les ajoute à la liste ? (Oui / Non)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Béton C25/30 (toupie) | 12 m³ | Valeur par défaut à confirmer : épaisseur du dallage 12 cm. Quantité à confirmer : béton +5 % |
| Blocs béton creux de 20 (50×20) | 1 155 blocs | Quantité à confirmer : blocs +5 % de casse |
| Carrelage grès cérame 60×60 | 58 cartons de 1,44 m² | Quantité à confirmer : pertes de coupe 8 %, 1 carton de réserve dès 20 m² |
| Peinture acrylique mate blanche, seau de 15 L | 4 seaux de 15 L | Quantité à confirmer : peinture +5 % au rouleau |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Béton C25/30 (toupie) | 12 m³ | livré toupie | chiffrable |
| Blocs béton creux de 20 (50×20) | 1 155 blocs (≈ 17 palettes de 70) | palettes avec blocs d'angle et de coupe | chiffrable |
| Plaques BA13 1,20 × 2,50 | 48 plaques |  | chiffrable |
| Prise 2P+T 16 A Legrand Dooxie blanc | 24 pièces |  | chiffrable |
| Carrelage grès cérame 60×60 | 58 cartons de 1,44 m² | carton entier, un seul bain | chiffrable |
| Peinture acrylique mate blanche, seau de 15 L | 4 seaux de 15 L | même teinte, même lot | chiffrable |
| Vis à plaque 25 mm | 1 950 vis |  | chiffrable |
| Bande à joint | 260 ml |  | chiffrable |
| Enduit à joint | 52 kg |  | chiffrable |

## Le tableau de Brest (couverture), inchangé

**À l'ouverture : 1 verte · 3 orange · 0 grise.**

Questions du comptoir :
- Quelle ardoise : Espagne 1er choix, ou ardoise NF (type Cupa) ? (Espagne 1er choix / Ardoise NF (type Cupa))
- Descentes en Ø 80, Ø 100 ou Ø 120 ? (Ø 80 / Ø 100 / Ø 120)
- Combien de descentes pour cette gouttière ? (1 / 2 / 3 / 4)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Ardoises naturelles ? 30×22 | 9 271 pièces | Info manquante : qualité de l'ardoise. Valeur par défaut à confirmer : pente du toit 45° ; longueur du rampant 5,5 m ; diamètre du crochet standard |
| Crochets d'ardoise inox standard, longueur 11 cm | 9 457 pièces | Info manquante : qualité de l'ardoise. Valeur par défaut à confirmer : diamètre du crochet standard ; pente du toit 45° ; longueur du rampant 5,5 m |
| Naissances zinc demi-ronde | — | Info manquante : nombre de descentes |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Ardoises naturelles Espagne 1er choix 30×22 | 9 271 pièces | 200 m² × 44,15 ardoises/m² (crochet 11 cm, pente 45°) + 5 % de marge | chiffrable |
| Crochets d'ardoise inox standard, longueur 11 cm | 9 457 pièces | un par ardoise commandée, + 2 % de casse (référentiel : crochets = ardoises × 1,02) | chiffrable |
| Gouttière zinc demi-ronde dév. 33 | 6 longueurs de 4 m (24 ml à couvrir) |  | chiffrable |
| Naissances zinc demi-ronde dév. 33 Ø80 | 1 pièce |  | chiffrable |

