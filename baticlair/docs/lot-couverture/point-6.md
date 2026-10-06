# Lot couverture, point 6 : sécurité et accès (§14), désamiantage (§18)

Écrit par `packages/domain/test/lot-couverture-6.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Devis de test | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Sécurité et accès, désamiantage | 5 | 0 | 0 | 0 |

## Sécurité et accès, désamiantage

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Crochets de sécurité inox NF EN 517 type B | 4 u |
| 2 | Échelle de toit aluminium | 1 u |
| 3 | Ligne de vie câble inox | 12 ml |
| 4 | Désamiantage plaques fibres-ciment amiantées, évacuation en ISDD | 80 m² |
| 5 | Crochets de service pour échelle | 2 u |

**À l'ouverture : 5 vertes · 0 orange · 0 grise.**

> Avertissement : Amiante : le retrait se fait par une entreprise certifiée (SS3), après un repérage avant travaux et un plan de retrait déclaré un mois avant le chantier. BatiClair ne compte aucun matériau pour ce poste : il part tel qu'écrit (§18).

Questions du comptoir : aucune.

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Crochets de sécurité inox NF EN 517 type B | 4 pièces |  | chiffrable |
| Échelle de toit aluminium | 1 pièce |  | chiffrable |
| Ligne de vie câble inox | 12 ml |  | chiffrable |
| Désamiantage plaques fibres-ciment amiantées, évacuation en ISDD | 80 m² |  | chiffrable |
| Crochets de service pour échelle | 2 pièces |  | chiffrable |

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

