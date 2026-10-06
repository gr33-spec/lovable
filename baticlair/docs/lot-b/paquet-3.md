# Lot B, paquet 3 : charpente, étanchéité, bardage, façade

Écrit par `packages/domain/test/lot-b-paquet-3.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque métier : le devis de test, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Métier | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Charpente | 0 | 2 | 0 | 1 |
| Étanchéité | 0 | 4 | 0 | 1 |
| Bardage | 0 | 4 | 0 | 1 |
| Façade | 2 | 3 | 0 | 0 |

## Charpente

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Remplacement des chevrons 63x75 sapin traité classe 2 | 82 m² |
| 2 | Planches de rive sapin traité | 24 ml |

**À l'ouverture : 0 verte · 2 orange · 0 grise.**

Questions du comptoir :
- Chevrons : en quelle longueur (rampant + débord) ? (4 m / 4,5 m / 5 m / 6 m)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Chevrons ou Pointes torsadées 3,4 × 90 | — | attend une réponse à une question |
| Planches de rive 22×200, L 4 m | 7 planches | Quantité à confirmer : planches +10 % de coupe |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Chevrons sapin-épicéa traité classe 2 63×75, L 4 m | 42 chevrons |  | chiffrable |
| Pointes torsadées 3,4 × 90 | 252 pièces |  | chiffrable |
| Planches de rive 22×200, L 4 m | 7 planches |  | chiffrable |

## Étanchéité

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Étanchéité toiture terrasse bicouche SBS autoprotégée sur isolant PIR | 48 m² |

**À l'ouverture : 0 verte · 4 orange · 0 grise.**

Questions du comptoir :
- Isolant PIR : quelle épaisseur ? (80 mm / 100 mm / 120 mm / 140 mm)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| EIF, bidon 25 kg | 1 bidon de 25 kg | Quantité à confirmer : EIF 0,3 kg/m², bidon de 25 kg |
| Membrane SBS sous-couche, rouleau 10 m² | 6 rouleaux de 10 m² | Quantité à confirmer : membranes +12 % de recouvrements et relevés, rouleau de 10 m² |
| Membrane SBS autoprotégée, rouleau 6 m² | 9 rouleaux de 6 m² | Quantité à confirmer : membranes +12 % de recouvrements et relevés, rouleau de 6 m² |
| Isolant PIR toiture-terrasse 1 200 × 1 000 | — | attend une réponse à une question |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| EIF, bidon 25 kg | 1 bidon de 25 kg (14,4 kg) |  | chiffrable |
| Isolant PIR toiture-terrasse 1 200 × 1 000, ép. 80 mm | 42 panneaux |  | chiffrable |
| Membrane SBS sous-couche, rouleau 10 m² | 6 rouleaux de 10 m² (53,76 m²) |  | chiffrable |
| Membrane SBS autoprotégée, rouleau 6 m² | 9 rouleaux de 6 m² (53,76 m²) |  | chiffrable |

## Bardage

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Bardage bois claire-voie horizontal sur tasseaux, pare-pluie | 64 m² |

**À l'ouverture : 0 verte · 4 orange · 0 grise.**

Questions du comptoir :
- Bardage : douglas ou mélèze ? (Bardage douglas 21×132, L 4 m / Bardage mélèze 21×132, L 4 m)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Pare-pluie bardage, rouleau 75 m² | 1 rouleau de 75 m² | Quantité à confirmer : pare-pluie +10 % de recouvrements |
| Tasseaux 27×40 traités, L 4 m | 30 tasseaux | Quantité à confirmer : tasseaux +10 % de chutes |
| Lames | — | attend une réponse à une question |
| Pointes inox bardage 2,5 × 50 | 1 600 pièces | Quantité à confirmer : 25 pointes par m² |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Bardage douglas 21×132, L 4 m | 27 bottes de 5 lames |  | chiffrable |
| Pare-pluie bardage, rouleau 75 m² | 1 rouleau de 75 m² (70,4 m²) |  | chiffrable |
| Tasseaux 27×40 traités, L 4 m | 30 tasseaux |  | chiffrable |
| Pointes inox bardage 2,5 × 50 | 1 600 pièces |  | chiffrable |

## Façade

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Enduit monocouche gratté, teinte ton pierre | 95 m² |
| 2 | Isolation thermique par l'extérieur sous enduit, laine de roche 140 mm | 120 m² |

**À l'ouverture : 2 vertes · 3 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Enduit monocouche OC2, finition grattée, sac 25 kg | 108 sacs de 25 kg | Quantité à confirmer : enduit 27 kg/m², enduit +5 % |
| Laine de roche ITE (type Rockwool Ecorock) 1 200 × 600, ép. 140 mm | 175 panneaux | Quantité à confirmer : isolant +5 % |
| Mortier ITE collage + sous-enduit, sac 25 kg | 53 sacs de 25 kg | Quantité à confirmer : collage 3,5 kg/m² |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Enduit monocouche OC2, finition grattée, sac 25 kg | 108 sacs de 25 kg | teinte du nuancier à préciser | chiffrable |
| Laine de roche ITE (type Rockwool Ecorock) 1 200 × 600, ép. 140 mm | 175 panneaux |  | chiffrable |
| Mortier ITE collage + sous-enduit, sac 25 kg | 53 sacs de 25 kg (1 320 kg) |  | chiffrable |
| Treillis ITE, rouleau 50 m² | 3 rouleaux de 50 m² (132 m²) |  | chiffrable |
| Rail de départ ITE aluminium 140 mm, barre 2,50 m | 9 barres |  | chiffrable |

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

