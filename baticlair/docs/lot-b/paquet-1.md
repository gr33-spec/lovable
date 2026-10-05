# Lot B, paquet 1 : plâtrerie, carrelage, peinture, maçonnerie

Écrit par `packages/domain/test/lot-b-paquet-1.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque métier : le devis de test, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Métier | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Plâtrerie, isolation | 7 | 4 | 0 | 0 |
| Carrelage | 1 | 7 | 0 | 0 |
| Peinture | 2 | 7 | 0 | 0 |
| Maçonnerie | 1 | 10 | 0 | 1 |

## Plâtrerie, isolation

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Cloison 72/48 BA13 sur ossature | 40 m² |
| 2 | Doublage collé Doublissimo 10+80 | 55 m² |
| 3 | Plafond suspendu BA13 sur fourrures F530 | 60 m² |
| 4 | Isolation combles perdus laine soufflée R7 | 80 m² |

**À l'ouverture : 7 vertes · 4 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Fourrures F530 3 m | 38 barres de 3 m | Quantité à confirmer : fourrures +5 % |
| Rails R48 3 m | 11 longueurs de 3 m | Quantité à confirmer : 2 rails par cloison (haut et bas), longueur de 3 m |
| Montants M48 | 28 pièces | Quantité à confirmer : 1 montant par entraxe + 1 de départ |
| Laine de verre à souffler (type Comblissimo), sac de 17,3 kg, R 7 | 19 sacs de 17,3 kg | Quantité à confirmer : laine +5 % |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Complexes de doublage BA13 + isolant | 20 complexes | longueur à la hauteur sous plafond | chiffrable |
| Mortier adhésif MAP, sac 25 kg | 4 sacs de 25 kg (99 kg) |  | chiffrable |
| Bande à joint | 332 ml |  | chiffrable |
| Enduit à joint | 74 kg |  | chiffrable |
| Plaques BA13 1,20 × 2,50 | 51 plaques |  | chiffrable |
| Fourrures F530 3 m | 38 barres de 3 m (112,77 ml à couvrir) |  | chiffrable |
| Suspentes F530 | 108 suspentes |  | chiffrable |
| Vis à plaque 25 mm | 2 100 vis |  | chiffrable |
| Laine de verre à souffler (type Comblissimo), sac de 17,3 kg, R 7 | 19 sacs de 17,3 kg |  | chiffrable |
| Rails R48 3 m | 11 longueurs de 3 m (32 ml à couvrir) |  | chiffrable |
| Montants M48 | 28 pièces |  | chiffrable |

## Carrelage

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Fourniture et pose carrelage sol grès cérame 60x60 rectifié, pose droite | 42 m² |
| 2 | Faïence murale salle de bains 25x40 | 18 m² |
| 3 | Plinthes assorties | 30 ml |
| 4 | Douche à l'italienne : SPEC sol et murs | 6 m² |
| 5 | Ragréage autolissant | 42 m² |

**À l'ouverture : 1 verte · 7 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Carrelage grès cérame 60×60 | 33 cartons de 1,44 m² | Quantité à confirmer : pertes de coupe 8 %, 1 carton de réserve dès 20 m² |
| Mortier-colle C2 S1, sac 25 kg | 15 sacs de 25 kg | Quantité à confirmer : colle +5 % de reste |
| Mortier de joint, sac 5 kg | 2 sacs de 5 kg | Quantité à confirmer : joint +10 % au lavage, carreau de 8 mm d'épaisseur |
| Faïence 25×40 | 13 cartons de 1,5 m² | Quantité à confirmer : pertes de coupe 5 %, 1 carton de réserve dès 20 m² |
| Plinthes carrelées 8×60 | 53 pièces | Quantité à confirmer : plinthes +5 % de coupe |
| SPEC liquide, seau 20 kg | 1 seau de 20 kg | Quantité à confirmer : SPEC +5 % |
| Primaire d'accrochage, bidon 5 kg | 3 bidons de 5 kg | Quantité à confirmer : primaire 0,15 kg/m², bidon de 5 kg |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Carrelage grès cérame 60×60 | 33 cartons de 1,44 m² | carton entier, un seul bain | chiffrable |
| Mortier-colle C2 S1, sac 25 kg | 15 sacs de 25 kg (346,5 kg) |  | chiffrable |
| Mortier de joint, sac 5 kg | 2 sacs de 5 kg (7,48 kg) |  | chiffrable |
| Faïence 25×40 | 13 cartons de 1,5 m² | carton entier, un seul bain | chiffrable |
| Plinthes carrelées 8×60 | 53 pièces | assorties au carrelage | chiffrable |
| SPEC liquide, seau 20 kg | 1 seau de 20 kg (5,04 kg) |  | chiffrable |
| Primaire d'accrochage, bidon 5 kg | 3 bidons de 5 kg (7,2 kg) |  | chiffrable |
| Ragréage autolissant P3, sac 25 kg | 8 sacs de 25 kg (189 kg) |  | chiffrable |

## Peinture

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Peinture murs séjour, 2 couches | 85 m² |
| 2 | Peinture plafonds mate, impression + 2 couches | 40 m² |
| 3 | Enduit de lissage, ratissage murs | 85 m² |
| 4 | Toile de verre à peindre, chambre | 30 m² |
| 5 | Papier peint intissé chambre | 25 m² |
| 6 | Ravalement façade peinture D2 Pliolite | 120 m² |

**À l'ouverture : 2 vertes · 7 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Peinture acrylique mate blanche, seau de 15 L | 2 seaux de 15 L | Quantité à confirmer : peinture +5 % au rouleau |
| Impression acrylique, seau 15 L | 1 seau de 15 L | Quantité à confirmer : peinture +5 % au rouleau |
| Peinture façade D2 blanc, seau 15 L | 3 seaux de 15 L | Quantité à confirmer : relief de l'enduit −15 % de rendement, peinture +5 % au rouleau |
| Anti-mousse façade, bidon 5 L | 6 bidons de 5 L | Quantité à confirmer : anti-mousse 4 m²/l (sources en désaccord) |
| Enduit de lissage poudre, sac 25 kg | 2 sacs de 25 kg | Quantité à confirmer : enduit +10 % |
| Toile de verre, rouleau 50 m² | 1 rouleau de 50 m² | Quantité à confirmer : toile +10 % de lés |
| Colle toile de verre, seau 20 kg | 1 seau de 20 kg | Quantité à confirmer : colle +10 % |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Peinture acrylique mate blanche, seau de 15 L | 2 seaux de 15 L | même teinte, même lot | chiffrable |
| Impression acrylique, seau 15 L | 1 seau de 15 L (14,58 L) |  | chiffrable |
| Enduit de lissage poudre, sac 25 kg | 2 sacs de 25 kg (37,4 kg) |  | chiffrable |
| Toile de verre, rouleau 50 m² | 1 rouleau de 50 m² (33 m²) |  | chiffrable |
| Colle toile de verre, seau 20 kg | 1 seau de 20 kg (7,26 kg) |  | chiffrable |
| Papier peint, rouleau 10,05 × 0,53 m | 7 rouleaux | uni, sans raccord | chiffrable |
| Colle papier peint intissé, seau 10 kg | 1 seau de 10 kg (5 kg) |  | chiffrable |
| Peinture façade D2 blanc, seau 15 L | 3 seaux de 15 L (42,35 L) |  | chiffrable |
| Anti-mousse façade, bidon 5 L | 6 bidons de 5 L (30 L) |  | chiffrable |

## Maçonnerie

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Mur porteur en parpaings, garage | 48 m² |
| 2 | Mur en brique Porotherm R20 | 30 m² |
| 3 | Dallage béton 12 cm sur hérisson, treillis ST25C | 40 m² |
| 4 | Chape ciment 5 cm | 35 m² |
| 5 | Enduit monocouche gratté | 60 m² |
| 6 | Semelle filante 50x25 | 28 ml |

**À l'ouverture : 1 verte · 10 orange · 0 grise.**

Questions du comptoir :
- Parpaings de 20, de 15 ou de 10 ? (Blocs béton creux de 20 (50×20) / Blocs béton creux de 15 (50×20) / Blocs béton creux de 10 (50×20))

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Mortier de montage, sac 35 kg | 53 sacs de 35 kg | Quantité à confirmer : mortier +10 % |
| Mortier joint mince, sac 25 kg | 3 sacs de 25 kg | Quantité à confirmer : mortier +10 % |
| Mortier de chape, sac 25 kg | 154 sacs de 25 kg | Quantité à confirmer : chape +10 % |
| Blocs béton | — | attend une réponse à une question |
| Briques rectifiées R20 | 252 briques | Quantité à confirmer : briques +5 % de casse |
| Hérisson 20/40, big-bag 1 t | 15 big-bags d'1 t | Quantité à confirmer : hérisson 1,6 t/m³ (sources en désaccord), hérisson +10 % |
| Film polyane 150 µm, rouleau 100 m² | 1 rouleau de 100 m² | Quantité à confirmer : film +15 % de recouvrements |
| Treillis soudé ST25C 6,00 × 2,40 | 4 panneaux | Quantité à confirmer : treillis 11,8 m² utiles par panneau |
| Béton C25/30 (toupie) | 10 m³ | Quantité à confirmer : béton +5 %, béton +10 % en fouille |
| Enduit monocouche OC2, sac 25 kg | 59 sacs de 25 kg | Quantité à confirmer : enduit +10 % |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Blocs béton creux de 20 (50×20) | 504 blocs (≈ 8 palettes de 70) | palettes avec blocs d'angle et de coupe | chiffrable |
| Mortier de montage, sac 35 kg | 53 sacs de 35 kg (1 848 kg) |  | chiffrable |
| Briques rectifiées R20 | 252 briques (≈ 5 palettes de 60) |  | chiffrable |
| Mortier joint mince, sac 25 kg | 3 sacs de 25 kg (59,4 kg) |  | chiffrable |
| Hérisson 20/40, big-bag 1 t | 15 big-bags d'1 t (14,08 t) |  | chiffrable |
| Film polyane 150 µm, rouleau 100 m² | 1 rouleau de 100 m² (46 m²) |  | chiffrable |
| Treillis soudé ST25C 6,00 × 2,40 | 4 panneaux |  | chiffrable |
| Béton C25/30 (toupie) | 10 m³ | livré toupie | chiffrable |
| Mortier de chape, sac 25 kg | 154 sacs de 25 kg (3 850 kg) |  | chiffrable |
| Enduit monocouche OC2, sac 25 kg | 59 sacs de 25 kg | teinte à préciser | chiffrable |
| Armatures de semelle, éléments 6 m | 6 éléments de 6 m |  | chiffrable |

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

