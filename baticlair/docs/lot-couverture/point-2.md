# Lot couverture, point 2 : fenêtres de toit (§11)

Écrit par `packages/domain/test/lot-couverture-2.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Devis de test | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Tuiles et deux fenêtres Velux MK04 | 4 | 1 | 0 | 1 |
| Ardoises et une fenêtre de toit sans taille | 4 | 2 | 0 | 2 |
| Une fenêtre de toit seule, sur tuiles plates | 2 | 0 | 0 | 0 |

## Tuiles et deux fenêtres Velux MK04

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Couverture tuiles HP10 terre cuite | 120 m² |
| 2 | Fenêtre de toit Velux GGL MK04 tout confort | 2 u |

**À l'ouverture : 4 vertes · 1 orange · 0 grise.**

Questions du comptoir :
- J'ai identifié : Tuiles HP10. C'est bien ce modèle ? (Oui / Modifier)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Tuiles HP10 | — | attend une réponse à une question |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Tuiles HP10 | 1 488 pièces (≈ 7 palettes) |  | chiffrable |
| Liteaux 27×40 | 617 ml (≈ 14 bottes de 50 ml) | lattage 120 m², une file tous les 31 cm ; contre-lattage 120 m², une file tous les 60 cm | chiffrable |
| Écran HPV, rouleau 1,50 × 50 m | 2 rouleaux (128,57 m²) |  | chiffrable |
| Raccords d'étanchéité pour tuiles, fenêtre 78 × 98 | 2 pièces |  | chiffrable |
| Fenêtre de toit Velux GGL MK04 tout confort | 2 pièces |  | chiffrable |

## Ardoises et une fenêtre de toit sans taille

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Couverture en ardoises naturelles 30x22 posées au crochet | 150 m² |
| 2 | Fourniture et pose fenêtre de toit | 1 u |

**À l'ouverture : 4 vertes · 2 orange · 0 grise.**

Questions du comptoir :
- Quelle ardoise : Espagne 1er choix, ou ardoise NF (type Cupa) ? (Espagne 1er choix / Ardoise NF (type Cupa))
- Fenêtre de toit : quelle taille ? (55 × 78 / 78 × 98 / 78 × 118 / 114 × 118)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Ardoises 30×22 ou Crochets d'ardoise | — | attend une réponse à une question |
| Fenêtre de toit | 1 pièce | attend une réponse à une question |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Ardoises naturelles Espagne 1er choix 30×22 | 6 953 pièces |  | chiffrable |
| Crochets d'ardoise inox standard, longueur 11 cm | 7 093 pièces |  | chiffrable |
| Liteaux 18×40 | 1 537 ml (≈ 31 bottes de 50 ml) | lattage 150 m², une file tous les 10,25 cm | chiffrable |
| Liteaux 27×40 | 263 ml (≈ 6 bottes de 50 ml) | contre-lattage 150 m², une file tous les 60 cm | chiffrable |
| Écran HPV, rouleau 1,50 × 50 m | 3 rouleaux (160,71 m²) |  | chiffrable |
| Raccords d'étanchéité pour ardoises, à la taille de la fenêtre de toit | 1 pièce |  | chiffrable |
| Fenêtre de toit | 1 pièce | 55 × 78 | chiffrable |

## Une fenêtre de toit seule, sur tuiles plates

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Fenêtre de toit 114x118 sur tuiles plates | 1 u |

**À l'ouverture : 2 vertes · 0 orange · 0 grise.**

Questions du comptoir : aucune.

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Raccords d'étanchéité pour tuiles plates, fenêtre 114 × 118 | 1 pièce |  | chiffrable |
| Fenêtre de toit 114x118 sur tuiles plates | 1 pièce |  | chiffrable |

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

