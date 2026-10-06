# Lot B, paquet 4 : plafonds suspendus, menuiserie intérieure, cuisine, photovoltaïque

Écrit par `packages/domain/test/lot-b-paquet-4.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque métier : le devis de test, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Métier | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Plafonds suspendus | 0 | 5 | 0 | 1 |
| Menuiserie intérieure | 1 | 6 | 0 | 0 |
| Cuisine | 2 | 2 | 0 | 0 |
| Photovoltaïque | 1 | 4 | 0 | 1 |

## Plafonds suspendus

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Faux plafond démontable dalles minérales 600x600 sur ossature T24 blanche | 70 m² |

**À l'ouverture : 0 verte · 5 orange · 0 grise.**

Questions du comptoir :
- Suspentes : quelle hauteur de plénum ? (20 cm / 50 cm / 1 m)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Dalles 600×600 bord A (type Tropic) | 13 cartons de 5,76 m² | Quantité à confirmer : dalles +5 %, carton de 5,76 m² (sources en désaccord) |
| Porteurs T24, L 3,60 m | 17 pièces | Quantité à confirmer : 0,83 m de porteur par m² |
| Entretoises T24 1,20 m | 98 pièces | Quantité à confirmer : 1,39 entretoises par m² |
| Cornières de rive 24×24, L 3 m | 12 pièces | Quantité à confirmer : 0,5 m de cornière par m² |
| Suspentes T24 | — | attend une réponse à une question |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Dalles 600×600 bord A (type Tropic) | 13 cartons de 5,76 m² (73,5 m²) |  | chiffrable |
| Porteurs T24, L 3,60 m | 17 pièces |  | chiffrable |
| Entretoises T24 1,20 m | 98 pièces |  | chiffrable |
| Cornières de rive 24×24, L 3 m | 12 pièces |  | chiffrable |
| Suspentes rapides T24 pour plénum de 20 cm | 49 pièces |  | chiffrable |

## Menuiserie intérieure

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Bloc-porte isoplane 83x204 huisserie 72, poussant droit | 5 u |
| 2 | Plinthes MDF blanches collées | 48 ml |
| 3 | Lambris sapin plafond chambre | 14 m² |

**À l'ouverture : 1 verte · 6 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Plinthes MDF 10×70, barre 2,40 m | 22 barres | Quantité à confirmer : plinthes +10 % de coupe |
| Lambris sapin, paquet 2,5 m² | 7 paquets de 2,5 m² | Quantité à confirmer : lambris +10 % de coupe, paquet de 2,5 m² |
| Tasseaux 27×40, L 2,40 m | 12 tasseaux | Quantité à confirmer : 2 m de tasseau par m² |
| Vis d'huisserie 6 × 100 + chevilles | 30 pièces | Quantité à confirmer : 6 vis par huisserie |
| Mastic-colle plinthes 310 ml | 4 cartouches de 310 ml | Quantité à confirmer : cartouche de 310 ml (sources en désaccord) |
| Clips lambris, boîte de 100 | 1 boîte de 100 | Quantité à confirmer : 3,2 clips par m² |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Vis d'huisserie 6 × 100 + chevilles | 30 pièces |  | chiffrable |
| Plinthes MDF 10×70, barre 2,40 m | 22 barres |  | chiffrable |
| Mastic-colle plinthes 310 ml | 4 cartouches de 310 ml (48 m à couvrir) |  | chiffrable |
| Lambris sapin, paquet 2,5 m² | 7 paquets de 2,5 m² (15,4 m²) |  | chiffrable |
| Clips lambris, boîte de 100 | 1 boîte de 100 |  | chiffrable |
| Tasseaux 27×40, L 2,40 m | 12 tasseaux |  | chiffrable |
| Bloc-porte isoplane 83x204 huisserie 72, poussant droit | 5 pièces |  | chiffrable |

## Cuisine

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Meubles bas Delinia ID façades Ruxe blanc mat | 6 u |
| 2 | Plan de travail stratifié 38 mm chêne | 3.6 ml |

**À l'ouverture : 2 vertes · 2 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Plinthes de cuisine H 15, L 2,40 m | 2 plinthes | Quantité à confirmer : 0,6 m de façade par meuble |
| Kit de finition de plan de travail | 1 kit | Quantité à confirmer : un kit par plan de 4,1 m |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Plinthes de cuisine H 15, L 2,40 m | 2 plinthes |  | chiffrable |
| Kit de finition de plan de travail | 1 kit |  | chiffrable |
| Meubles bas Delinia ID façades Ruxe blanc mat | 6 pièces |  | chiffrable |
| Plan de travail stratifié 38 mm chêne | 3,6 ml |  | chiffrable |

## Photovoltaïque

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Panneaux photovoltaïques 425 Wc full black en surimposition sur tuiles | 10 u |

**À l'ouverture : 1 verte · 4 orange · 0 grise.**

Questions du comptoir :
- Onduleur : micro-onduleurs ou onduleur string ? (Micro-onduleurs / Onduleur string)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Rails K2 SingleRail 36, L 4,40 m | 6 rails | Quantité à confirmer : 1,134 m de rail par module et par file, rails +5 % |
| Crochets de toit K2 inox pour tuile | 19 pièces | Quantité à confirmer : 1,134 m de rail par module et par file, un crochet tous les 1,2 m |
| Brides K2 milieu / extrémité | 40 pièces | Quantité à confirmer : 2 brides par module |
| Onduleur | — | attend une réponse à une question |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Rails K2 SingleRail 36, L 4,40 m | 6 rails |  | chiffrable |
| Crochets de toit K2 inox pour tuile | 19 pièces |  | chiffrable |
| Brides K2 milieu / extrémité | 40 pièces |  | chiffrable |
| Micro-onduleurs (un par module) | 10 pièces |  | chiffrable |
| Panneaux photovoltaïques 425 Wc full black en surimposition sur tuiles | 10 pièces |  | chiffrable |

## Le tableau de Brest (couverture), inchangé

**À l'ouverture : 1 verte · 2 orange · 0 grise.**

Questions du comptoir :
- Quelle ardoise : Espagne 1er choix, ou ardoise NF (type Cupa) ? (Espagne 1er choix / Ardoise NF (type Cupa))
- Descentes en Ø 80 ou en Ø 100 ? (Ø 80 / Ø 100 / Ø 120)
- Combien de descentes pour cette gouttière ? (1 / 2 / 3 / 4)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Ardoises 30×22 ou Crochets d'ardoise | — | attend une réponse à une question |
| Naissances | — | attend une réponse à une question |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Ardoises naturelles Espagne 1er choix 30×22 | 9 271 pièces |  | chiffrable |
| Crochets d'ardoise inox standard, longueur 11 cm | 9 457 pièces | un par ardoise commandée, + 2 % de casse (référentiel : crochets = ardoises × 1,02) | chiffrable |
| Gouttière zinc demi-ronde dév. 33 | 6 longueurs de 4 m (24 ml à couvrir) |  | chiffrable |
| Naissances zinc demi-ronde dév. 33 Ø80 | 1 pièce |  | chiffrable |

