# Lot couverture, point 3 : gouttières PVC et aluminium (§15)

Écrit par `packages/domain/test/lot-couverture-3.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Devis de test | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Gouttière PVC grise, deux descentes | 8 | 3 | 0 | 3 |
| Gouttière alu anthracite sans développé | 3 | 3 | 0 | 3 |

## Gouttière PVC grise, deux descentes

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Gouttière PVC demi-ronde 25 grise avec 2 descentes | 18 ml |
| 2 | Descente PVC Ø80 grise, hauteur 5 m | 2 u |

**À l'ouverture : 8 vertes · 3 orange · 0 grise.**

Questions du comptoir :
- Crochets de gouttière : sur les chevrons ou en façade (bandeau) ? (Sur les chevrons / En façade (bandeau))
- Combien d'angles sur cette gouttière ? (Aucun / 1 / 2 / 3)
- Un dauphin en pied de chaque descente ? (Oui / Non)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Crochets de gouttière | — | attend une réponse à une question |
| Angles de gouttière | — | attend une réponse à une question |
| Dauphins | — | attend une réponse à une question |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Gouttière PVC demi-ronde grise de 25 | 5 longueurs de 4 m (18 ml à couvrir) |  | chiffrable |
| Crochets de gouttière PVC sur chevron de 25 | 46 pièces |  | chiffrable |
| Jonctions de gouttière PVC grise de 25 | 4 pièces |  | chiffrable |
| Talons de gouttière PVC grise de 25 | 2 pièces |  | chiffrable |
| Naissances PVC demi-ronde grise de 25 Ø80 | 2 pièces |  | chiffrable |
| Joints de dilatation de gouttière PVC grise de 25 | 1 pièce |  | chiffrable |
| Tubes de descente PVC gris Ø80, longueur 4 m | 4 pièces | 2 descentes × 5 m | chiffrable |
| Coudes de descente PVC gris Ø80 | 4 pièces |  | chiffrable |
| Colliers de descente Ø80 | 8 pièces |  | chiffrable |
| Dauphins Ø80, 1 m | 2 pièces |  | chiffrable |

## Gouttière alu anthracite sans développé

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Gouttière aluminium laqué anthracite, 2 angles | 11 ml |
| 2 | Descente alu Ø80, hauteur 5 m | 1 u |

**À l'ouverture : 3 vertes · 3 orange · 0 grise.**

Questions du comptoir :
- Gouttière de 25, de 28, de 33 ou de 40 ? (De 25 / De 28 / De 33 / De 40)
- Crochets de gouttière : sur les chevrons ou en façade (bandeau) ? (Sur les chevrons / En façade (bandeau))
- Un dauphin en pied de chaque descente ? (Oui / Non)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Dauphins | — | attend une réponse à une question |
| Gouttière PVC / alu, Jonctions de gouttière… | — | attend une réponse à une question |
| Crochets de gouttière | — | attend une réponse à une question |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Gouttière alu anthracite de 25 | 3 longueurs de 4 m (11 ml à couvrir) |  | chiffrable |
| Crochets de gouttière alu sur chevron de 25 | 29 pièces |  | chiffrable |
| Jonctions de gouttière alu anthracite de 25 | 2 pièces |  | chiffrable |
| Talons de gouttière alu anthracite de 25 | 2 pièces |  | chiffrable |
| Angles extérieurs 90° alu anthracite de 25 | 2 pièces |  | chiffrable |
| Naissances alu anthracite de 25 Ø80 | 1 pièce |  | chiffrable |
| Tubes de descente alu Ø80, longueur 4 m | 2 pièces | 1 descentes × 5 m | chiffrable |
| Coudes de descente alu Ø80 | 2 pièces |  | chiffrable |
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
| Crochets de gouttière sur chevron dév. 33 | 61 pièces |  | chiffrable |
| Naissances zinc demi-ronde dév. 33 Ø80 | 1 pièce |  | chiffrable |

