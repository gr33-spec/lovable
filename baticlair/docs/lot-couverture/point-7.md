# Lot couverture, point 7 : descentes PVC et zinc

Écrit par `packages/domain/test/lot-couverture-7.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Devis de test | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Deux descentes zinc de 5 m, dauphin à demander | 3 | 1 | 0 | 1 |
| Une descente PVC en longueurs de 2 m, avec dauphin | 4 | 0 | 0 | 0 |

## Deux descentes zinc de 5 m, dauphin à demander

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Descente zinc Ø100, hauteur 5 m | 2 u |

**À l'ouverture : 3 vertes · 1 orange · 0 grise.**

Questions du comptoir :
- Un dauphin en pied de chaque descente ? (Oui / Non)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Dauphins | — | attend une réponse à une question |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Tubes de descente zinc Ø100, longueur 4 m | 4 pièces | 2 descentes × 5 m | chiffrable |
| Coudes de descente zinc Ø100 | 4 pièces |  | chiffrable |
| Colliers de descente Ø100 | 8 pièces |  | chiffrable |
| Dauphins Ø100, 1 m | 2 pièces |  | chiffrable |

## Une descente PVC en longueurs de 2 m, avec dauphin

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Descente PVC Ø80 grise en longueurs de 2 m, hauteur 4,5 m, avec dauphin | 1 u |

**À l'ouverture : 4 vertes · 0 orange · 0 grise.**

Questions du comptoir : aucune.

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Tubes de descente PVC gris Ø80, longueur 2 m | 3 pièces | 1 descentes × 4,5 m | chiffrable |
| Coudes de descente PVC gris Ø80 | 2 pièces |  | chiffrable |
| Colliers de descente Ø80 | 4 pièces |  | chiffrable |
| Dauphins Ø80, 1 m | 1 pièce |  | chiffrable |

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

