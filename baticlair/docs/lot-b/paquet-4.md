# Lot B, paquet 4 : plafonds suspendus, menuiserie intérieure, cuisine, photovoltaïque

Écrit par `packages/domain/test/lot-b-paquet-4.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque métier : le devis de test, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Métier | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Plafonds suspendus | 0 | 1 | 0 | 0 |
| Menuiserie intérieure | 1 | 2 | 0 | 1 |
| Cuisine | 2 | 0 | 0 | 1 |
| Photovoltaïque | 1 | 0 | 0 | 0 |

## Plafonds suspendus

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Faux plafond démontable dalles minérales 600x600 sur ossature T24 blanche | 70 m² |

**À l'ouverture : 0 verte · 1 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Dalles 600×600 bord A (type Tropic) | 13 cartons de 5,76 m² | Quantité à confirmer : dalles +5 %, carton de 5,76 m² (sources en désaccord) |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Dalles 600×600 bord A (type Tropic) | 13 cartons de 5,76 m² (73,5 m²) |  | chiffrable |

## Menuiserie intérieure

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Bloc-porte isoplane 83x204 huisserie 72, poussant droit | 5 u |
| 2 | Plinthes MDF blanches collées | 48 ml |
| 3 | Lambris sapin plafond chambre | 14 m² |

**À l'ouverture : 1 verte · 2 orange · 0 grise.**

Questions du comptoir :
- Consommables de pose (pointes, vis, pattes, étain, silicone) : je les ajoute à la liste ? (Oui / Non)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Plinthes MDF 10×70, barre 2,40 m | 22 barres | Quantité à confirmer : plinthes +10 % de coupe |
| Lambris sapin, paquet 2,5 m² | 7 paquets de 2,5 m² | Quantité à confirmer : lambris +10 % de coupe, paquet de 2,5 m² |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Bloc-porte isoplane 83x204 huisserie 72, poussant droit | 5 pièces |  | chiffrable |
| Plinthes MDF 10×70, barre 2,40 m | 22 barres |  | chiffrable |
| Lambris sapin, paquet 2,5 m² | 7 paquets de 2,5 m² (15,4 m²) |  | chiffrable |
| Vis d'huisserie 6 × 100 + chevilles | 30 pièces |  | chiffrable |
| Mastic-colle plinthes 310 ml | 4 cartouches de 310 ml (48 m à couvrir) |  | chiffrable |
| Clips lambris, boîte de 100 | 1 boîte de 100 |  | chiffrable |

## Cuisine

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Meubles bas Delinia ID façades Ruxe blanc mat | 6 u |
| 2 | Plan de travail stratifié 38 mm chêne | 3.6 ml |

**À l'ouverture : 2 vertes · 0 orange · 0 grise.**

Questions du comptoir :
- Consommables de pose (pointes, vis, pattes, étain, silicone) : je les ajoute à la liste ? (Oui / Non)

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Meubles bas Delinia ID façades Ruxe blanc mat | 6 pièces |  | chiffrable |
| Plan de travail stratifié 38 mm chêne | 3,6 ml |  | chiffrable |
| Kit de finition de plan de travail | 1 kit |  | chiffrable |

## Photovoltaïque

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Panneaux photovoltaïques 425 Wc full black en surimposition sur tuiles | 10 u |

**À l'ouverture : 1 verte · 0 orange · 0 grise.**

Questions du comptoir : aucune.

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Panneaux photovoltaïques 425 Wc full black en surimposition sur tuiles | 10 pièces |  | chiffrable |

## Le tableau de Brest (couverture), inchangé

**À l'ouverture : 1 verte · 3 orange · 0 grise.**

Questions du comptoir :
- Quelle ardoise : Espagne 1er choix, ou ardoise NF (type Cupa) ? (Espagne 1er choix / Ardoise NF (type Cupa))
- Descentes en Ø 80 ou en Ø 100 ? (Ø 80 / Ø 100 / Ø 120)
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

