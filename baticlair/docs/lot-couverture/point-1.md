# Lot couverture, point 1 : noues et arêtiers (§3, §5, §7, §25.2)

Écrit par `packages/domain/test/lot-couverture-1.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Devis de test | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Tuiles, quatre arêtiers et une noue | 1 | 2 | 0 | 2 |
| Ardoises, arêtier zinc et noue de 66 | 0 | 3 | 1 | 2 |

## Tuiles, quatre arêtiers et une noue

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Couverture tuiles HP10 terre cuite | 120 m² |
| 2 | Arêtiers, toit à 4 pans | 24 ml |
| 3 | Noue zinc | 8 ml |

**À l'ouverture : 1 verte · 2 orange · 0 grise.**

Questions du comptoir :
- Tes pièces pliées (rive, bandes, noue, faîtage…) : tu les plies toi-même, ou tu les achètes toutes faites ? (Je façonne (feuilles ou bobineau) / Je commande façonné)
- J'ai identifié : Tuiles HP10. C'est bien ce modèle ? (Oui / Modifier)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Tuiles HP10 | 1 258 pièces | Valeur par défaut à confirmer |
| Noue zinc | 8 ml | Façonnage à préciser |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Tuiles HP10 | 1 258 pièces (≈ 6 palettes) |  | chiffrable |
| Arêtiers | 72 pièces |  | chiffrable |
| Feuilles zinc naturel 2 × 1 m, 0,65 mm | 2 pièces | pour 8 ml de noue, développé 50 cm | chiffrable |

## Ardoises, arêtier zinc et noue de 66

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Couverture en ardoises naturelles 30x22 posées au crochet | 150 m² |
| 2 | Arêtier zinc dév. 33 | 10 ml |
| 3 | Noue encaissée zinc | 4 ml |

**À l'ouverture : 0 verte · 3 orange · 1 grise.**

Questions du comptoir :
- Tes pièces pliées (rive, bandes, noue, faîtage…) : tu les plies toi-même, ou tu les achètes toutes faites ? (Je façonne (feuilles ou bobineau) / Je commande façonné)
- Quelle ardoise : Espagne 1er choix, ou ardoise NF (type Cupa) ? (Espagne 1er choix / Ardoise NF (type Cupa))

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Ardoises naturelles 30×22 | 6 694 pièces | Qualité à préciser |
| Crochets d'ardoise inox standard, longueur 10 cm | 6 694 pièces | Qualité à préciser |
| Noue zinc | 4 ml | Façonnage à préciser |

Lignes grises (le fournisseur chiffre) :
- Arêtiers (Arêtier zinc dév. 33) · 10 ml — Pas encore calculé : le fournisseur proposera pour la mesure du devis.

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Ardoises naturelles Espagne 1er choix 30×22 | 6 694 pièces | 150 m² × 42,5 ardoises/m² (crochet 10 cm, pente 45°) + 5 % de marge | chiffrable |
| Crochets d'ardoise inox standard, longueur 10 cm | 6 694 pièces | un par ardoise commandée | chiffrable |
| Feuilles zinc naturel 2 × 1 m, 0,65 mm | 2 pièces | pour 4 ml de noue, développé 66 cm | chiffrable |

À préciser avec vous :
- Arêtiers (Arêtier zinc dév. 33) · 10 ml

## Le tableau de Brest (couverture), inchangé

**À l'ouverture : 1 verte · 3 orange · 0 grise.**

Questions du comptoir :
- Combien de descentes pour cette gouttière ? (1 / 2 / 3 / 4)
- Quelle ardoise : Espagne 1er choix, ou ardoise NF (type Cupa) ? (Espagne 1er choix / Ardoise NF (type Cupa))
- Descentes en Ø 80, Ø 100 ou Ø 120 ? (Ø 80 / Ø 100 / Ø 120)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Ardoises naturelles 30×22 | 8 925 pièces | Qualité à préciser |
| Crochets d'ardoise inox standard, longueur 10 cm | 8 925 pièces | Qualité à préciser |
| Naissances | — | Descentes à préciser |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Ardoises naturelles Espagne 1er choix 30×22 | 8 925 pièces | 200 m² × 42,5 ardoises/m² (crochet 10 cm, pente 45°) + 5 % de marge | chiffrable |
| Crochets d'ardoise inox standard, longueur 10 cm | 8 925 pièces | un par ardoise commandée | chiffrable |
| Gouttière zinc demi-ronde dév. 33 | 6 longueurs de 4 m (24 ml à couvrir) |  | chiffrable |
| Naissances dév. 33 Ø80 | 1 pièce |  | chiffrable |

