# Lot couverture, point 1 : noues et arêtiers (§3, §5, §7, §25.2)

Écrit par `packages/domain/test/lot-couverture-1.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Devis de test | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Tuiles, quatre arêtiers et une noue | 1 | 2 | 0 | 2 |
| Ardoises, arêtier zinc et noue de 66 | 0 | 2 | 1 | 2 |

## Tuiles, quatre arêtiers et une noue

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Couverture tuiles HP10 terre cuite | 120 m² |
| 2 | Arêtiers, toit à 4 pans | 24 ml |
| 3 | Noue zinc | 8 ml |

**À l'ouverture : 1 verte · 2 orange · 0 grise.**

Questions du comptoir :
- Noue zinc : tu la façonnes toi-même ou tu la commandes façonnée ? (Je façonne (feuilles ou bobineau) / Je commande façonné)
- J'ai identifié : Tuiles HP10. C'est bien ce modèle ? (Oui / Modifier)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Tuiles HP10 | — | attend une réponse à une question |
| Noues zinc façonnées ou Feuilles zinc 2 × 1 m | — | attend une réponse à une question |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Tuiles HP10 | 1 488 pièces (≈ 7 palettes) |  | chiffrable |
| Feuilles zinc naturel 2 × 1 m, 0,65 mm | 2 pièces | pour 8 ml de noue : estimation d'après un développé de 50 cm, ajuste selon ton façonnage | chiffrable |
| Arêtiers | 70 pièces |  | chiffrable |

## Ardoises, arêtier zinc et noue de 66

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Couverture en ardoises naturelles 30x22 posées au crochet | 150 m² |
| 2 | Arêtier zinc dév. 33 | 10 ml |
| 3 | Noue encaissée zinc | 4 ml |

**À l'ouverture : 0 verte · 2 orange · 1 grise.**

Questions du comptoir :
- Quelle ardoise : Espagne 1er choix, ou ardoise NF (type Cupa) ? (Espagne 1er choix / Ardoise NF (type Cupa))
- Noue zinc : tu la façonnes toi-même ou tu la commandes façonnée ? (Je façonne (feuilles ou bobineau) / Je commande façonné)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Ardoises 30×22 ou Crochets d'ardoise | — | attend une réponse à une question |
| Noues zinc façonnées ou Feuilles zinc 2 × 1 m | — | attend une réponse à une question |

Lignes grises (le fournisseur chiffre) :
- Arêtiers (Arêtier zinc dév. 33) · 10 ml — Pas encore calculé : le fournisseur proposera pour la mesure du devis.

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Ardoises naturelles Espagne 1er choix 30×22 | 6 953 pièces |  | chiffrable |
| Crochets d'ardoise inox standard, longueur 11 cm | 7 093 pièces | un par ardoise commandée, + 2 % de casse (référentiel : crochets = ardoises × 1,02) | chiffrable |
| Feuilles zinc naturel 2 × 1 m, 0,65 mm | 2 pièces | pour 4 ml de noue : estimation d'après un développé de 66 cm, ajuste selon ton façonnage | chiffrable |

À préciser avec vous :
- Arêtiers (Arêtier zinc dév. 33) · 10 ml

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

