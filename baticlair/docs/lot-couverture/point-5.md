# Lot couverture, point 5 : ardoise fibres-ciment (§4)

Écrit par `packages/domain/test/lot-couverture-5.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Devis de test | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Ardoises fibres-ciment 40 × 24 bleu-noir | 6 | 0 | 0 | 0 |
| Ardoises fibro-ciment sans format ni teinte | 2 | 1 | 1 | 2 |

## Ardoises fibres-ciment 40 × 24 bleu-noir

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Couverture en ardoises fibres-ciment 40x24 bleu-noir | 100 m² |

**À l'ouverture : 6 vertes · 0 orange · 0 grise.**

Questions du comptoir : aucune.

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Ardoises fibres-ciment bleu-noir 40×24 | 2 919 pièces |  | chiffrable |
| Clous inox d'ardoise | 6 130 pièces |  | chiffrable |
| Crochets d'antivent | 3 065 pièces |  | chiffrable |
| Liteaux 18×40 | 701 ml (≈ 15 bottes de 50 ml) | lattage 100 m² | chiffrable |
| Liteaux 27×40 | 175 ml (≈ 4 bottes de 50 ml) | contre-lattage 100 m², une file tous les 60 cm | chiffrable |
| Écran HPV, rouleau 1,50 × 50 m | 2 rouleaux (107,14 m²) |  | chiffrable |

## Ardoises fibro-ciment sans format ni teinte

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Couverture ardoises fibro-ciment | 80 m² |

**À l'ouverture : 2 vertes · 1 orange · 1 grise.**

Questions du comptoir :
- Ardoises fibres-ciment : bleu-noir, noir ou brun ? (Bleu-noir / Noir / Brun)
- Ardoises fibres-ciment : 40 × 24, 40 × 27, 60 × 30 ou 60 × 40 ? (Ardoises fibres-ciment 40×24 / Ardoises fibres-ciment 40×27 / Ardoises fibres-ciment 60×30 / Ardoises fibres-ciment 60×40)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Ardoises fibres-ciment, Clous inox d'ardoise… | — | attend une réponse à une question |

Lignes grises (le fournisseur chiffre) :
- Liteaux 18×40 (Couverture ardoises fibro-ciment) · 80 m² — Calcul impossible sans « Liteaux au m² » de ardoise.

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Ardoises fibres-ciment bleu-noir 40×24 | 2 336 pièces |  | chiffrable |
| Clous inox d'ardoise | 4 906 pièces |  | chiffrable |
| Crochets d'antivent | 2 453 pièces |  | chiffrable |
| Liteaux 18×40 | 561 ml (≈ 12 bottes de 50 ml) | lattage 80 m² | chiffrable |
| Liteaux 27×40 | 140 ml (≈ 3 bottes de 50 ml) | contre-lattage 80 m², une file tous les 60 cm | chiffrable |
| Écran HPV, rouleau 1,50 × 50 m | 2 rouleaux (85,71 m²) |  | chiffrable |

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

