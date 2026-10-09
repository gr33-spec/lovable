# Lot B, paquet 1 : plâtrerie, carrelage, peinture, maçonnerie

Écrit par `packages/domain/test/lot-b-paquet-1.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque métier : le devis de test, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Métier | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Plâtrerie, isolation | 2 | 2 | 0 | 1 |
| Carrelage | 0 | 5 | 0 | 0 |
| Peinture | 0 | 5 | 0 | 0 |
| Maçonnerie | 0 | 6 | 0 | 1 |

## Plâtrerie, isolation

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Cloison 72/48 BA13 sur ossature | 40 m² |
| 2 | Doublage collé Doublissimo 10+80 | 55 m² |
| 3 | Plafond suspendu BA13 sur fourrures F530 | 60 m² |
| 4 | Isolation combles perdus laine soufflée R7 | 80 m² |

**À l'ouverture : 2 vertes · 2 orange · 0 grise.**

Questions du comptoir :
- Consommables de pose (pointes, vis, pattes, étain, silicone) : je les ajoute à la liste ? (Oui / Non)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Complexes de doublage BA13 + isolant | 20 complexes | Valeur par défaut à confirmer : hauteur sous plafond 2,5 m |
| Laine de verre à souffler (type Comblissimo), sac de 17,3 kg, R 7 | 19 sacs de 17,3 kg | Quantité à confirmer : laine +5 % |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Plaques BA13 1,20 × 2,50 | 21 plaques |  | chiffrable |
| Plaques BA13 1,20 × 2,50 | 30 plaques |  | chiffrable |
| Complexes de doublage BA13 + isolant | 20 complexes | longueur à la hauteur sous plafond | chiffrable |
| Laine de verre à souffler (type Comblissimo), sac de 17,3 kg, R 7 | 19 sacs de 17,3 kg |  | chiffrable |
| Bande à joint | 77 ml |  | chiffrable |
| Bande à joint | 95 ml |  | chiffrable |
| Bande à joint | 160 ml |  | chiffrable |
| Enduit à joint | 19 kg |  | chiffrable |
| Enduit à joint | 23 kg |  | chiffrable |
| Enduit à joint | 32 kg |  | chiffrable |
| Vis à plaque 25 mm | 900 vis |  | chiffrable |
| Vis à plaque 25 mm | 1 200 vis |  | chiffrable |

## Carrelage

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Fourniture et pose carrelage sol grès cérame 60x60 rectifié, pose droite | 42 m² |
| 2 | Faïence murale salle de bains 25x40 | 18 m² |
| 3 | Plinthes assorties | 30 ml |
| 4 | Douche à l'italienne : SPEC sol et murs | 6 m² |
| 5 | Ragréage autolissant | 42 m² |

**À l'ouverture : 0 verte · 5 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Carrelage grès cérame 60×60 | 33 cartons de 1,44 m² | Quantité à confirmer : pertes de coupe 8 %, 1 carton de réserve dès 20 m² |
| Faïence 25×40 | 13 cartons de 1,5 m² | Quantité à confirmer : pertes de coupe 5 %, 1 carton de réserve dès 20 m² |
| Plinthes carrelées 8×60 | 53 pièces | Quantité à confirmer : plinthes +5 % de coupe |
| SPEC liquide, seau 20 kg | 1 seau de 20 kg | Quantité à confirmer : SPEC +5 % |
| Ragréage autolissant P3, sac 25 kg | 8 sacs de 25 kg | Valeur par défaut à confirmer : épaisseur de ragréage 3 mm |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Carrelage grès cérame 60×60 | 33 cartons de 1,44 m² | carton entier, un seul bain | chiffrable |
| Faïence 25×40 | 13 cartons de 1,5 m² | carton entier, un seul bain | chiffrable |
| Plinthes carrelées 8×60 | 53 pièces | assorties au carrelage | chiffrable |
| SPEC liquide, seau 20 kg | 1 seau de 20 kg (5,04 kg) |  | chiffrable |
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

**À l'ouverture : 0 verte · 5 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Peinture acrylique mate blanche, seau de 15 L | 2 seaux de 15 L | Quantité à confirmer : peinture +5 % au rouleau |
| Enduit de lissage poudre, sac 25 kg | 2 sacs de 25 kg | Valeur par défaut à confirmer : passes d'enduit 1. Quantité à confirmer : enduit +10 % |
| Toile de verre, rouleau 50 m² | 1 rouleau de 50 m² | Quantité à confirmer : toile +10 % de lés |
| Papier peint, rouleau 10,05 × 0,53 m | 7 rouleaux | Valeur par défaut à confirmer : hauteur des murs 2,5 m |
| Peinture façade D2 blanc, seau 15 L | 3 seaux de 15 L | Quantité à confirmer : relief de l'enduit −15 % de rendement, peinture +5 % au rouleau |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Peinture acrylique mate blanche, seau de 15 L | 2 seaux de 15 L | même teinte, même lot | chiffrable |
| Enduit de lissage poudre, sac 25 kg | 2 sacs de 25 kg (37,4 kg) |  | chiffrable |
| Toile de verre, rouleau 50 m² | 1 rouleau de 50 m² (33 m²) |  | chiffrable |
| Papier peint, rouleau 10,05 × 0,53 m | 7 rouleaux | uni, sans raccord | chiffrable |
| Peinture façade D2 blanc, seau 15 L | 3 seaux de 15 L (42,35 L) |  | chiffrable |

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

**À l'ouverture : 0 verte · 6 orange · 0 grise.**

Questions du comptoir :
- Parpaings de 20, de 15 ou de 10 ? (Blocs béton creux de 20 (50×20) / Blocs béton creux de 15 (50×20) / Blocs béton creux de 10 (50×20))

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Mur en blocs béton | — | Info manquante : Parpaings de 20, de 15 ou de 10 |
| Briques rectifiées R20 | 252 briques | Quantité à confirmer : briques +5 % de casse |
| Béton C25/30 (toupie) | 6 m³ | Valeur par défaut à confirmer : épaisseur du dallage 12 cm. Quantité à confirmer : béton +5 % |
| Béton C25/30 (toupie) | 4 m³ | Valeur par défaut à confirmer : largeur de semelle 50 cm ; hauteur de semelle 25 cm. Quantité à confirmer : béton +10 % en fouille |
| Mortier de chape, sac 25 kg | 154 sacs de 25 kg | Valeur par défaut à confirmer : épaisseur de chape 5 cm. Quantité à confirmer : chape +10 % |
| Enduit monocouche OC2, sac 25 kg | 59 sacs de 25 kg | Quantité à confirmer : enduit +10 % |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Blocs béton creux de 20 (50×20) | 504 blocs (≈ 8 palettes de 70) | palettes avec blocs d'angle et de coupe | chiffrable |
| Briques rectifiées R20 | 252 briques (≈ 5 palettes de 60) |  | chiffrable |
| Béton C25/30 (toupie) | 6 m³ | livré toupie | chiffrable |
| Béton C25/30 (toupie) | 4 m³ | livré toupie | chiffrable |
| Mortier de chape, sac 25 kg | 154 sacs de 25 kg (3 850 kg) |  | chiffrable |
| Enduit monocouche OC2, sac 25 kg | 59 sacs de 25 kg | teinte à préciser | chiffrable |

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

