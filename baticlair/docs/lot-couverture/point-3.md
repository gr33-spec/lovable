# Lot couverture, point 3 : gouttières PVC et aluminium (§15)

Écrit par `packages/domain/test/lot-couverture-3.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Devis de test | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Gouttière PVC grise, deux descentes | 3 | 0 | 0 | 0 |
| Gouttière alu anthracite sans développé | 1 | 1 | 0 | 1 |

## Gouttière PVC grise, deux descentes

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Gouttière PVC demi-ronde 25 grise avec 2 descentes | 18 ml |
| 2 | Descente PVC Ø80 grise, hauteur 5 m | 2 u |

**À l'ouverture : 3 vertes · 0 orange · 0 grise.**

Questions du comptoir : aucune.

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Gouttière PVC demi-ronde grise de 25 | 5 longueurs de 4 m (18 ml à couvrir) |  | chiffrable |
| Naissances PVC demi-ronde grise de 25 Ø80 | 2 pièces |  | chiffrable |
| Tubes de descente PVC gris Ø80, longueur 4 m | 4 pièces | 2 descentes × 5 m | chiffrable |

## Gouttière alu anthracite sans développé

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Gouttière aluminium laqué anthracite, 2 angles | 11 ml |
| 2 | Descente alu Ø80, hauteur 5 m | 1 u |

**À l'ouverture : 1 verte · 1 orange · 0 grise.**

Questions du comptoir :
- Gouttière de 25, de 28, de 33 ou de 40 ? (De 25 / De 28 / De 33 / De 40)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Gouttière PVC / alu ou Naissances | — | attend une réponse à une question |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Gouttière alu anthracite de 25 | 3 longueurs de 4 m (11 ml à couvrir) |  | chiffrable |
| Naissances alu anthracite de 25 Ø80 | 1 pièce |  | chiffrable |
| Tubes de descente alu Ø80, longueur 4 m | 2 pièces | 1 descentes × 5 m | chiffrable |

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

