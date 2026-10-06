# Lot couverture, point 5 : ardoise fibres-ciment (§4)

Écrit par `packages/domain/test/lot-couverture-5.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Devis de test | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Ardoises fibres-ciment 40 × 24 bleu-noir | 1 | 0 | 0 | 0 |
| Ardoises fibro-ciment sans format ni teinte | 0 | 1 | 0 | 2 |

## Ardoises fibres-ciment 40 × 24 bleu-noir

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Couverture en ardoises fibres-ciment 40x24 bleu-noir | 100 m² |

**À l'ouverture : 1 verte · 0 orange · 0 grise.**

Questions du comptoir : aucune.

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Ardoises fibres-ciment bleu-noir 40×24 | 2 919 pièces |  | chiffrable |

## Ardoises fibro-ciment sans format ni teinte

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Couverture ardoises fibro-ciment | 80 m² |

**À l'ouverture : 0 verte · 1 orange · 0 grise.**

Questions du comptoir :
- Ardoises fibres-ciment : bleu-noir, noir ou brun ? (Bleu-noir / Noir / Brun)
- Ardoises fibres-ciment : 40 × 24, 40 × 27, 60 × 30 ou 60 × 40 ? (Ardoises fibres-ciment 40×24 / Ardoises fibres-ciment 40×27 / Ardoises fibres-ciment 60×30 / Ardoises fibres-ciment 60×40)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Ardoises fibres-ciment | — | attend une réponse à une question |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Ardoises fibres-ciment bleu-noir 40×24 | 2 336 pièces |  | chiffrable |

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

