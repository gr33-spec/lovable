# Lot couverture, point 2 : fenêtres de toit (§11)

Écrit par `packages/domain/test/lot-couverture-2.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Devis de test | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Tuiles et deux fenêtres Velux MK04 | 1 | 1 | 0 | 1 |
| Ardoises et une fenêtre de toit sans taille | 0 | 3 | 0 | 2 |
| Une fenêtre de toit seule, sur tuiles plates | 1 | 0 | 0 | 0 |

## Tuiles et deux fenêtres Velux MK04

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Couverture tuiles HP10 terre cuite | 120 m² |
| 2 | Fenêtre de toit Velux GGL MK04 tout confort | 2 u |

**À l'ouverture : 1 verte · 1 orange · 0 grise.**

Questions du comptoir :
- J'ai identifié : Tuiles HP10. C'est bien ce modèle ? (Oui / Modifier)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Couverture en tuiles à emboîtement HP10 | — | Info manquante : J'ai identifié : Tuiles HP10. C'est bien ce modèle |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Tuiles HP10 | 1 488 pièces (≈ 7 palettes) |  | chiffrable |
| Fenêtre de toit Velux GGL MK04 tout confort | 2 pièces |  | chiffrable |

## Ardoises et une fenêtre de toit sans taille

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Couverture en ardoises naturelles 30x22 posées au crochet | 150 m² |
| 2 | Fourniture et pose fenêtre de toit | 1 u |

**À l'ouverture : 0 verte · 3 orange · 0 grise.**

Questions du comptoir :
- Quelle ardoise : Espagne 1er choix, ou ardoise NF (type Cupa) ? (Espagne 1er choix / Ardoise NF (type Cupa))
- Fenêtre de toit : quelle taille ? (55 × 78 / 78 × 98 / 78 × 118 / 114 × 118)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Ardoises naturelles ? 30×22 | 6 953 pièces | Info manquante : qualité de l'ardoise. Valeur par défaut à confirmer : pente du toit 45° ; longueur du rampant 5,5 m ; diamètre du crochet standard |
| Crochets d'ardoise inox standard, longueur 11 cm | 7 093 pièces | Info manquante : qualité de l'ardoise. Valeur par défaut à confirmer : diamètre du crochet standard ; pente du toit 45° ; longueur du rampant 5,5 m |
| Fenêtre de toit | 1 pièce | attend une réponse à une question |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Ardoises naturelles Espagne 1er choix 30×22 | 6 953 pièces | 150 m² × 44,15 ardoises/m² (crochet 11 cm, pente 45°) + 5 % de marge | chiffrable |
| Crochets d'ardoise inox standard, longueur 11 cm | 7 093 pièces | un par ardoise commandée, + 2 % de casse (référentiel : crochets = ardoises × 1,02) | chiffrable |
| Fenêtre de toit | 1 pièce | 55 × 78 | chiffrable |

## Une fenêtre de toit seule, sur tuiles plates

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Fenêtre de toit 114x118 sur tuiles plates | 1 u |

**À l'ouverture : 1 verte · 0 orange · 0 grise.**

Questions du comptoir : aucune.

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Fenêtre de toit 114x118 sur tuiles plates | 1 pièce |  | chiffrable |

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

