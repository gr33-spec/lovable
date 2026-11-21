---
code: platrerie
metier: drywall
nom: Plâtrerie - isolation
etat: brouillon
version: 2026-10-19
moteur: fiche
document: docs/referentiels/platrerie-isolation.md
---

# Fiche métier : plâtrerie - isolation (format commun, §52)

Tirée du référentiel plâtrerie-isolation du 3 octobre 2026 (`docs/referentiels/platrerie-isolation.md`, sections 2 à 5 :
fiches Placo, Isover et négoce). Elle remplace le tiroir de plâtrerie minimal (plan v3 §4.4) et en garde les engagements :
plaques calculées, rails et montants « à vérifier » (orange, §47.1), vis, bande et enduit seulement sur le « oui » à la
question consommables (§49.1). Règle d'or du métier : le m² du devis n'est jamais une unité de commande ; il devient des
plaques d'une longueur choisie, des barres, des sacs, des boîtes, des rouleaux.

## 1. Unités et vocabulaire du devis

Unités du devis : m² (cloisons une face, doublages, plafonds, isolation), ml (coffrages, bandes), u (trappes, blocs-portes).
Mots du métier : « 72/48 » = cloison de 72 mm, montants de 48, une BA13 par face ; « BA13 », « placo », « plaque de plâtre » ;
« Placomur », « Doublissimo », « complexe de doublage », « doublage collé », « 10+80 », « 13+140 » = doublage collé au MAP ;
« F530 », « plafond suspendu », « faux plafond sur fourrures » = plafond sur fourrures et suspentes ; « soufflage », « laine
soufflée », « combles perdus » = isolation soufflée (NF DTU 45.11) ; « R = 7 » = résistance thermique.
La hauteur sous plafond (« hauteur 2,50 m », « HSP 2,70 ») choisit la longueur des plaques et des montants : elle va dans
« donnees » (`hauteur_cloison`, `hauteur_doublage`) ; la résistance visée (« R 7 ») va dans `resistance_soufflage`.
Le type de complexe de doublage (PSE 10+80, laine 13+140…) est celui du devis : la fiche n'en compte que les panneaux.
Hors commande : dépose, évacuation, protection, échafaudage, main-d'œuvre. Au-delà de 3,00 m de hauteur, la fiche ne calcule
pas (ossature M70 ou plus) : la ligne reste telle qu'écrite.

## 2. Ouvrages

| Ouvrage | Libellé | Unité | Ce que le devis écrit |
|---|---|---|---|
| cloison-72-48 | Cloison 72/48, une BA13 par face, sur rails et montants M48 | m² | « Cloison 72/48 BA13 sur ossature », « cloison placo 72/48 », « cloison distributive BA13 » |
| doublage-colle | Doublage collé au mortier adhésif | m² | « Doublage collé Placomur 10+80 », « doublage PSE collé », « Doublissimo 13+140 collé » |
| plafond-f530 | Plafond BA13 sur fourrures F530 et suspentes | m² | « Plafond suspendu BA13 sur fourrures F530 », « faux plafond placo », « plafond sur ossature F530 » |
| isolation-soufflee | Isolation des combles perdus par soufflage | m² | « Isolation des combles perdus par soufflage », « laine soufflée R 7 », « soufflage de laine de verre » |

## 3. Ratios

Cloison : plaques = 2 faces × 1,05 ÷ (1,20 × longueur de plaque) au m² ; montants = k ÷ hauteur au m² (k = 2,1 ml/m² jusqu'à
2,50 m, 3,0 entraxe 40 cm jusqu'à 2,80 m, 3,7 doublés au-delà) ; rails = 2 × 1,10 ÷ hauteur ; vis, bande, enduit : ratios Placo
au m² d'ouvrage. Doublage : panneaux = 1,05 ÷ (1,20 × longueur). Plafond : plaques de 2,50 m, fourrures 1,79 ml/m² + 5 %.
Soufflage : kg/m² de la fiche Isover × 1,05.

| Ouvrage | Fourniture | Ratio | Unité | Condition | Confiance | Source |
|---|---|---|---|---|---|---|
| cloison-72-48 | Plaque BA13 1,20 × 2,50 m | 0,7 | u | hauteur_cloison=2.5 | sûr | S1 S2 |
| cloison-72-48 | Montant M48 L 2,50 m | 0,84 | u | hauteur_cloison=2.5 | à vérifier | S3 S4 |
| cloison-72-48 | Rail R48 3 m | 0,88 | m | hauteur_cloison=2.5 | à vérifier | S3 S4 |
| cloison-72-48 | Vis TTPC 25 | 22 | u | hauteur_cloison=2.5 | sûr | S2 |
| cloison-72-48 | Plaque BA13 1,20 × 2,60 m | 0,6731 | u | hauteur_cloison=2.6 | sûr | S1 S2 |
| cloison-72-48 | Montant M48 L 2,60 m | 1,1538 | u | hauteur_cloison=2.6 | à vérifier | S3 S4 |
| cloison-72-48 | Rail R48 3 m | 0,8462 | m | hauteur_cloison=2.6 | à vérifier | S3 S4 |
| cloison-72-48 | Vis TTPC 25 | 30 | u | hauteur_cloison=2.6 | sûr | S2 |
| cloison-72-48 | Plaque BA13 1,20 × 2,70 m | 0,6481 | u | hauteur_cloison=2.7 | sûr | S1 S2 |
| cloison-72-48 | Montant M48 L 2,70 m | 1,1111 | u | hauteur_cloison=2.7 | à vérifier | S3 S4 |
| cloison-72-48 | Rail R48 3 m | 0,8148 | m | hauteur_cloison=2.7 | à vérifier | S3 S4 |
| cloison-72-48 | Vis TTPC 25 | 30 | u | hauteur_cloison=2.7 | sûr | S2 |
| cloison-72-48 | Plaque BA13 1,20 × 2,80 m | 0,625 | u | hauteur_cloison=2.8 | sûr | S1 S2 |
| cloison-72-48 | Montant M48 L 2,80 m | 1,0714 | u | hauteur_cloison=2.8 | à vérifier | S3 S4 |
| cloison-72-48 | Rail R48 3 m | 0,7857 | m | hauteur_cloison=2.8 | à vérifier | S3 S4 |
| cloison-72-48 | Vis TTPC 25 | 30 | u | hauteur_cloison=2.8 | sûr | S2 |
| cloison-72-48 | Plaque BA13 1,20 × 3,00 m | 0,5833 | u | hauteur_cloison=3 | sûr | S1 S2 |
| cloison-72-48 | Montant M48 L 3,00 m | 1,2333 | u | hauteur_cloison=3 | à vérifier | S3 S4 |
| cloison-72-48 | Rail R48 3 m | 0,7333 | m | hauteur_cloison=3 | à vérifier | S3 S4 |
| cloison-72-48 | Vis TTPC 25 | 22 | u | hauteur_cloison=3 | sûr | S2 |
| cloison-72-48 | Bande à joint papier | 2,8 | m | — | sûr | S2 |
| cloison-72-48 | Enduit à joint poudre | 0,66 | kg | — | sûr | S2 |
| doublage-colle | Panneau de doublage collé 1,20 × 2,50 m | 0,35 | u | hauteur_doublage=2.5 | sûr | S6 |
| doublage-colle | Panneau de doublage collé 1,20 × 2,60 m | 0,3365 | u | hauteur_doublage=2.6 | sûr | S6 |
| doublage-colle | Panneau de doublage collé 1,20 × 2,70 m | 0,3241 | u | hauteur_doublage=2.7 | sûr | S6 |
| doublage-colle | Panneau de doublage collé 1,20 × 2,80 m | 0,3125 | u | hauteur_doublage=2.8 | sûr | S6 |
| doublage-colle | Panneau de doublage collé 1,20 × 3,00 m | 0,2917 | u | hauteur_doublage=3 | sûr | S6 |
| doublage-colle | Mortier adhésif MAP | 1,8 | kg | — | sûr | S6 |
| doublage-colle | Bande à joint papier | 1,4 | m | — | sûr | S6 |
| doublage-colle | Enduit à joint poudre | 0,33 | kg | — | sûr | S6 |
| plafond-f530 | Plaque BA13 1,20 × 2,50 m | 0,35 | u | — | sûr | S7 |
| plafond-f530 | Fourrure F530 3 m | 1,8795 | m | — | sûr | S7 |
| plafond-f530 | Suspente F530 | 1,8 | u | — | usuel | S7 |
| plafond-f530 | Cornière de rive F530 3 m | 0,47 | m | — | usuel | S7 |
| plafond-f530 | Vis TTPC 25 | 15 | u | — | sûr | S7 |
| plafond-f530 | Bande à joint papier | 1,58 | m | — | sûr | S7 |
| plafond-f530 | Enduit à joint poudre | 0,37 | kg | — | sûr | S7 |
| isolation-soufflee | Laine de verre à souffler | 2,31 | kg | resistance_soufflage=4 | usuel | S9 |
| isolation-soufflee | Laine de verre à souffler | 2,625 | kg | resistance_soufflage=4.5 | usuel | S9 |
| isolation-soufflee | Laine de verre à souffler | 3,99 | kg | resistance_soufflage=7 | usuel | S9 |
| isolation-soufflee | Laine de verre à souffler | 6,825 | kg | resistance_soufflage=12 | usuel | S9 |
| isolation-soufflee | Laine de verre à souffler | 7,875 | kg | resistance_soufflage=14 | usuel | S9 |

## 4. Conditionnements

| Fourniture | Vendu en | Contenance | Unité | Confiance | Source | Consommable |
|---|---|---|---|---|---|---|
| Plaque BA13 1,20 × 2,50 m | plaque | 1 | u | sûr | S1 | non |
| Montant M48 L 2,50 m | montant | 1 | u | sûr | S3 | non |
| Rail R48 3 m | barre | 3 | m | sûr | S3 | non |
| Vis TTPC 25 | boîte | 1000 | u | sûr | S5 | oui |
| Plaque BA13 1,20 × 2,60 m | plaque | 1 | u | sûr | S1 | non |
| Montant M48 L 2,60 m | montant | 1 | u | sûr | S3 | non |
| Plaque BA13 1,20 × 2,70 m | plaque | 1 | u | sûr | S1 | non |
| Montant M48 L 2,70 m | montant | 1 | u | sûr | S3 | non |
| Plaque BA13 1,20 × 2,80 m | plaque | 1 | u | sûr | S1 | non |
| Montant M48 L 2,80 m | montant | 1 | u | sûr | S3 | non |
| Plaque BA13 1,20 × 3,00 m | plaque | 1 | u | sûr | S1 | non |
| Montant M48 L 3,00 m | montant | 1 | u | sûr | S3 | non |
| Bande à joint papier | rouleau | 150 | m | sûr | S5 | oui |
| Enduit à joint poudre | sac | 25 | kg | sûr | S5 | oui |
| Panneau de doublage collé 1,20 × 2,50 m | panneau | 1 | u | sûr | S6 | non |
| Panneau de doublage collé 1,20 × 2,60 m | panneau | 1 | u | sûr | S6 | non |
| Panneau de doublage collé 1,20 × 2,70 m | panneau | 1 | u | sûr | S6 | non |
| Panneau de doublage collé 1,20 × 2,80 m | panneau | 1 | u | sûr | S6 | non |
| Panneau de doublage collé 1,20 × 3,00 m | panneau | 1 | u | sûr | S6 | non |
| Mortier adhésif MAP | sac | 25 | kg | sûr | S6 | non |
| Fourrure F530 3 m | barre | 3 | m | sûr | S8 | non |
| Suspente F530 | boîte | 100 | u | sûr | S8 | non |
| Cornière de rive F530 3 m | barre | 3 | m | usuel | S8 | non |
| Laine de verre à souffler | sac | 17,3 | kg | sûr | S9 | non |

## 5. Questions

| Clé | Question | Boutons | Ouvrages |
|---|---|---|---|
| hauteur_cloison | Tes cloisons font quelle hauteur ? | 2,50 m=2.5 / 2,60 m=2.6 / 2,70 m=2.7 / 2,80 m=2.8 / 3,00 m=3 | cloison-72-48 |
| hauteur_doublage | Tes murs à doubler font quelle hauteur ? | 2,50 m=2.5 / 2,60 m=2.6 / 2,70 m=2.7 / 2,80 m=2.8 / 3,00 m=3 | doublage-colle |
| resistance_soufflage | Tu souffles pour quelle résistance ? | R 4=4 / R 4,5=4.5 / R 7=7 / R 12=12 / R 14=14 | isolation-soufflee |

## 6. Test permanent

Devis d'épreuve écrit à la main (synthétique, anonyme) : plâtrerie et isolation d'une maison de plain-pied.

### Devis

| Ligne | Désignation | Quantité | Unité | Ouvrage |
|---|---|---|---|---|
| 1 | Cloison 72/48 BA13 sur ossature | 40 | m² | cloison-72-48 |
| 2 | Doublage collé Placomur 10+80 | 30 | m² | doublage-colle |
| 3 | Plafond suspendu BA13 sur fourrures F530 | 25 | m² | plafond-f530 |
| 4 | Isolation des combles perdus par soufflage | 60 | m² | isolation-soufflee |
| 5 | Protection des sols et nettoyage | 1 | ens | — |

### Bref

- Plâtrerie d'une maison de plain-pied : 40 m² de cloisons 72/48, 30 m² de doublage collé Placomur 10+80.
- Plafond suspendu BA13 sur fourrures F530 de 25 m², combles perdus isolés par soufflage sur 60 m².

### Questions attendues

- `consommables`
- `hauteur_cloison`
- `hauteur_doublage`
- `resistance_soufflage`

### Réponses

- `consommables` = 1
- `hauteur_cloison` = 2.5
- `hauteur_doublage` = 2.5
- `resistance_soufflage` = 7

### Comptes attendus

Calculs : plaques 40 × 0,7 + 25 × 0,35 = 36,75 ; montants 40 × 0,84 = 33,6 ; rails 40 × 0,88 = 35,2 m ÷ 3 ; panneaux 30 × 0,35 =
10,5 ; MAP 54 kg ÷ 25 ; fourrures 25 × 1,8795 = 47 m ÷ 3 ; suspentes 45 ; cornière 11,75 m ÷ 3 ; vis 40 × 22 + 25 × 15 = 1 255 ;
bande 112 + 42 + 39,5 = 193,5 m ÷ 150 ; enduit 26,4 + 9,9 + 9,25 = 45,55 kg ÷ 25 ; laine 60 × 3,99 = 239,4 kg ÷ 17,3.

| Fourniture | Commande |
|---|---|
| Plaque BA13 1,20 × 2,50 m | 37 plaques |
| Montant M48 L 2,50 m | 34 montants |
| Rail R48 3 m | 12 barres de 3 m |
| Panneau de doublage collé 1,20 × 2,50 m | 11 panneaux |
| Mortier adhésif MAP | 3 sacs de 25 kg |
| Fourrure F530 3 m | 16 barres de 3 m |
| Suspente F530 | 1 boîte de 100 u |
| Cornière de rive F530 3 m | 4 barres de 3 m |
| Vis TTPC 25 | 2 boîtes de 1 000 u |
| Bande à joint papier | 2 rouleaux de 150 m |
| Enduit à joint poudre | 2 sacs de 25 kg |
| Laine de verre à souffler | 14 sacs de 17,3 kg |

## 7. À relire par un plaquiste

- Montants : 2,1 ml/m² jusqu'à 2,50 m (entraxe 60), 3,0 jusqu'à 2,80 m (entraxe 40), doublés au-delà (3,7) ; pièce carrelée :
  entraxe 40 imposé, non distingué ici : ±40 % sur les montants.
- Rails : 2 × longueur × 1,10 ÷ hauteur (haut et bas, 10 % de chutes) : ±10 %.
- Plaques à 5 % de chutes (ratio Placo) : la rénovation (murs hors d'équerre) en demande 10 %.
- Plafond : plaques de 2,50 m posées perpendiculairement aux fourrures ; suspentes 1,8 au m² (sous bois) ; sous béton, chevilles
  métal non comptées.
- Soufflage : 5 % de marge au-dessus de la fiche Isover : à valider.

## 8. Sources

- S1 : Fiche Placo BA13 (Saint-Gobain) : 1,20 × 2,00 à 3,60 m, ép. 12,5 mm, pile de 50 plaques ; longueur ≥ hauteur − 1 cm (NF DTU 25.41).
- S2 : L'Intégrale Placo 2021-2022, cloisons distributives Placostil : vis TTPC 25 22/m² (entraxe 60) ou 30/m² (entraxe 40), bande 2,8 ml/m², enduit 0,66 kg/m² ; plaques avec ≈ 5 % de chutes.
- S3 : Rail Stil R48 en barres de 3,00 m (botte de 10) ; montant Stil M48, longueurs 2,50 à 3,99 m (Point.P, SFIC, Chausson).
- S4 : Carnet de pose Siniat et fiche système Placo 72/48 : montants simples 0,60 m jusqu'à 2,50 m, 0,40 m jusqu'à 2,80 m, doublés au-delà ; coefficients 2,1 / 3,0 / 3,7 ml/m² et rails × 1,10 : référentiel du 3 octobre, à vérifier.
- S5 : Vis TTPC 25 en boîte de 1 000 (Bretagne Matériaux, Dispano) ; bande papier en rouleau de 150 m ; enduit Placojoint PR4 en sac de 25 kg (Point.P).
- S6 : Placo, doublage collé Placomur et solution Doublissimo : MAP 1,8 kg/m² en sac de 25 kg, bande 1,4 ml/m², enduit 0,33 kg/m² ; panneaux 1,20 × 2,50 à 2,80 m ; 5 % de chutes.
- S7 : Solution Placo plafond sur fourrures Stil F530 (plancher bois) : fourrures 1,79 ml/m², suspentes 1,8/m², rive 0,47 ml/m², vis 15/m², bande 1,58 ml/m², enduit 0,37 kg/m².
- S8 : Fourrure Stil F530 en 3,00 m (et 5,30 m), suspente longue 171 en boîte de 100 (Placo, Chausson).
- S9 : Isover Comblissimo : sac de 17,3 kg ; R 4 = 2,20 kg/m², R 4,5 = 2,50, R 7 = 3,80, R 12 = 6,50, R 14 = 7,50 ; marge de soufflage 5 % à valider.
