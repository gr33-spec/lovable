# Lot couverture, point 8 : plomb et cuivre (§12)

Écrit par `packages/domain/test/lot-couverture-8.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Devis de test | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Bavette de plomb de 40 cm | 0 | 1 | 0 | 0 |
| Bande cuivre de 33 | 0 | 1 | 0 | 1 |

## Bavette de plomb de 40 cm

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Bavette plomb largeur 40 cm | 8 ml |

**À l'ouverture : 0 verte · 1 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Plomb laminé 1,5 mm, rouleau largeur 40 cm × 6 m | 2 rouleaux | Valeur par défaut à confirmer : épaisseur du plomb 1,5 mm. Quantité à confirmer : rouleau de plomb de 6 m |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Plomb laminé 1,5 mm, rouleau largeur 40 cm × 6 m | 2 rouleaux | 8 ml de bande | chiffrable |

## Bande cuivre de 33

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Bande cuivre dév. 33 | 12 ml |

**À l'ouverture : 0 verte · 1 orange · 0 grise.**

Questions du comptoir :
- Bandes cuivre : tu les façonnes toi-même ou tu les commandes façonnées ? (Je façonne (feuilles ou bobine) / Je commande façonné)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Bandes cuivre, dév. 330 mm | 12 ml | Info manquante : façonnage |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Cuivre en bobine largeur 500 mm, 0,6 mm | 14 ml | pour façonner 12 ml de bande | chiffrable |

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

