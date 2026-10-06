# Lot couverture, point 4 : bac acier (§8)

Écrit par `packages/domain/test/lot-couverture-4.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Devis de test | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Bac acier deux pans, tout est écrit | 0 | 1 | 0 | 0 |
| Bac acier monopente, rien d'écrit | 0 | 1 | 0 | 3 |

## Bac acier deux pans, tout est écrit

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Couverture bac acier anti-condensation RAL 7016, rampant 6 m | 120 m² |

**À l'ouverture : 0 verte · 1 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Plaques bac acier simple peau RAL 7016 avec feutre anti-condensation, longueur 6,05 m | 20 pièces | Valeur par défaut à confirmer : bac acier simple peau ; pans 2 |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Plaques bac acier simple peau RAL 7016 avec feutre anti-condensation, longueur 6,05 m | 20 pièces | 120 m² de toiture, largeur utile 1,00 m | chiffrable |

## Bac acier monopente, rien d'écrit

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Bac acier monopente sur hangar | 80 m² |

**À l'ouverture : 0 verte · 1 orange · 0 grise.**

Questions du comptoir :
- Bac acier : longueur du rampant (longueur des plaques) ? (4 m / 5 m / 6 m / 7 m)
- Bac acier : quelle teinte ? (Gris anthracite (RAL 7016) / Gris ardoise (RAL 7022) / Rouge tuile (RAL 8012) / Noir (RAL 9005))
- Bac acier : avec ou sans feutre anti-condensation ? (Avec feutre / Sans feutre)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Couverture bac acier | — | Info manquante : longueur du rampant |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Plaques bac acier simple peau RAL 7016 avec feutre anti-condensation, longueur 4,05 m | 20 pièces | 80 m² de toiture, largeur utile 1,00 m | chiffrable |

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

