# Lot B, paquet 3 : charpente, étanchéité, bardage, façade

Écrit par `packages/domain/test/lot-b-paquet-3.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque métier : le devis de test, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Métier | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Charpente | 0 | 2 | 0 | 2 |
| Étanchéité | 0 | 1 | 0 | 0 |
| Bardage | 0 | 1 | 0 | 2 |
| Façade | 0 | 2 | 0 | 0 |

## Charpente

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Remplacement des chevrons 63x75 sapin traité classe 2 | 82 m² |
| 2 | Planches de rive sapin traité | 24 ml |

**À l'ouverture : 0 verte · 2 orange · 0 grise.**

Questions du comptoir :
- Chevrons : en quelle longueur (rampant + débord) ? (4 m / 4,5 m / 5 m / 6 m)
- Consommables de pose (pointes, vis, pattes, étain, silicone) : je les ajoute à la liste ? (Oui / Non)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Chevronnage | — | Info manquante : longueur des chevrons |
| Planches de rive 22×200, L 4 m | 7 planches | Quantité à confirmer : planches +10 % de coupe |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Chevrons sapin-épicéa traité classe 2 63×75, L 4 m | 42 chevrons |  | chiffrable |
| Planches de rive 22×200, L 4 m | 7 planches |  | chiffrable |
| Pointes torsadées 3,4 × 90 | 252 pièces |  | chiffrable |

## Étanchéité

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Étanchéité toiture terrasse bicouche SBS autoprotégée sur isolant PIR | 48 m² |

**À l'ouverture : 0 verte · 1 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Membrane SBS autoprotégée, rouleau 6 m² | 9 rouleaux de 6 m² | Quantité à confirmer : membranes +12 % de recouvrements et relevés, rouleau de 6 m² |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Membrane SBS autoprotégée, rouleau 6 m² | 9 rouleaux de 6 m² (53,76 m²) |  | chiffrable |

## Bardage

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Bardage bois claire-voie horizontal sur tasseaux, pare-pluie | 64 m² |

**À l'ouverture : 0 verte · 1 orange · 0 grise.**

Questions du comptoir :
- Bardage : douglas ou mélèze ? (Bardage douglas 21×132, L 4 m / Bardage mélèze 21×132, L 4 m)
- Consommables de pose (pointes, vis, pattes, étain, silicone) : je les ajoute à la liste ? (Oui / Non)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Bardage bois sur tasseaux | — | Info manquante : Bardage : douglas ou mélèze |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Bardage douglas 21×132, L 4 m | 27 bottes de 5 lames |  | chiffrable |
| Pointes inox bardage 2,5 × 50 | 1 600 pièces |  | chiffrable |

## Façade

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Enduit monocouche gratté, teinte ton pierre | 95 m² |
| 2 | Isolation thermique par l'extérieur sous enduit, laine de roche 140 mm | 120 m² |

**À l'ouverture : 0 verte · 2 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Enduit monocouche OC2, finition grattée, sac 25 kg | 108 sacs de 25 kg | Quantité à confirmer : enduit 27 kg/m², enduit +5 % |
| Laine de roche ITE (type Rockwool Ecorock) 1 200 × 600, ép. 140 mm | 175 panneaux | Quantité à confirmer : isolant +5 % |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Enduit monocouche OC2, finition grattée, sac 25 kg | 108 sacs de 25 kg | teinte du nuancier à préciser | chiffrable |
| Laine de roche ITE (type Rockwool Ecorock) 1 200 × 600, ép. 140 mm | 175 panneaux |  | chiffrable |

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

