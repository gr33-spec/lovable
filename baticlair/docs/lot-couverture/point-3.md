# Lot couverture, point 3 : gouttières PVC et aluminium (§15)

Écrit par `packages/domain/test/lot-couverture-3.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Devis de test | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Gouttière PVC grise, deux descentes | 2 | 1 | 0 | 0 |
| Gouttière alu anthracite sans développé | 0 | 3 | 0 | 1 |

## Gouttière PVC grise, deux descentes

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Gouttière PVC demi-ronde 25 grise avec 2 descentes | 18 ml |
| 2 | Descente PVC Ø80 grise, hauteur 5 m | 2 u |

**À l'ouverture : 2 vertes · 1 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Tubes de descente PVC gris Ø80, longueur 2 m | 6 pièces | Valeur par défaut à confirmer |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Gouttière PVC demi-ronde grise de 25 | 5 longueurs de 4 m (18 ml à couvrir) |  | chiffrable |
| Naissances PVC grise de 25 Ø80 | 2 pièces |  | chiffrable |
| Tubes de descente PVC gris Ø80, longueur 2 m | 6 pièces | 2 descentes × 5 m | chiffrable |

## Gouttière alu anthracite sans développé

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Gouttière aluminium laqué anthracite, 2 angles | 11 ml |
| 2 | Descente alu Ø80, hauteur 5 m | 1 u |

**À l'ouverture : 0 verte · 3 orange · 0 grise.**

Questions du comptoir :
- Gouttière de 25, de 28, de 33 ou de 40 ? (De 25 / De 28 / De 33 / De 40)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Gouttière alu anthracite de | 3 longueurs de 4 m | Développé à préciser |
| Naissances alu anthracite de Ø80 | 1 pièce | Développé à préciser |
| Tubes de descente alu Ø80, longueur 2 m | 3 pièces | Valeur par défaut à confirmer |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Gouttière alu anthracite de 25 | 3 longueurs de 4 m (11 ml à couvrir) |  | chiffrable |
| Naissances alu anthracite de 25 Ø80 | 1 pièce |  | chiffrable |
| Tubes de descente alu Ø80, longueur 2 m | 3 pièces | 1 descente × 5 m | chiffrable |

## Le tableau de Brest (couverture), inchangé

**À l'ouverture : 1 verte · 3 orange · 0 grise.**

Questions du comptoir :
- Combien de descentes pour cette gouttière ? (1 / 2 / 3 / 4)
- Quelle ardoise : Espagne 1er choix, ou ardoise NF (type Cupa) ? (Espagne 1er choix / Ardoise NF (type Cupa))
- Descentes en Ø 80, Ø 100 ou Ø 120 ? (Ø 80 / Ø 100 / Ø 120)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Ardoises naturelles 30×22 | 9 040 pièces | Qualité à préciser |
| Crochets d'ardoise inox standard, longueur 10 cm | 19 boîtes de 500 | Qualité à préciser |
| Naissances | — | Descentes à préciser |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Ardoises naturelles Espagne 1er choix 30×22 | 9 040 pièces | 200 m² × 42,5 ardoises/m² (crochet 10 cm, pente 45°), arêtiers, noues, faîtage et égout du devis compris, + 5 % de marge | chiffrable |
| Crochets d'ardoise inox standard, longueur 10 cm | 19 boîtes de 500 (9 040 pièces) | un par ardoise commandée | chiffrable |
| Gouttière zinc demi-ronde dév. 33 | 7 longueurs de 4 m (24 ml à couvrir) |  | chiffrable |
| Naissances dév. 33 Ø80 | 1 pièce |  | chiffrable |

