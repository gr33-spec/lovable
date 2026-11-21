---
code: menuiserie-interieure
metier: interior_joinery
nom: Menuiserie intérieure et agencement
etat: brouillon
version: 2026-10-19
moteur: fiche
document: docs/referentiels/menuiserie-interieure-agencement.md
---

# Fiche métier : menuiserie intérieure et agencement (format commun, §52)

Tirée du référentiel menuiserie intérieure du 3 octobre 2026 (`docs/referentiels/menuiserie-interieure-agencement.md`,
sections 2 à 5). Règle d'or du métier : presque tout se commande à la pièce, avec ses dimensions et son sens ; jamais au m²
ni au ml. Les blocs-portes, portes, façades de placard, plans de travail et meubles restent tels qu'écrits ; la fiche
convertit ce qui se compte en surface ou en longueur : parquet et stratifié en colis, sous-couche en rouleaux, plinthes en
barres, lambris en bottes et ses tasseaux en barres.

## 1. Unités et vocabulaire du devis

Unités du devis : u (blocs-portes, portes, façades, trappes, tablettes), m² (parquet, stratifié, lambris), ml (plinthes,
habillages), ens / forfait (agencement sur mesure, dépose).
Mots du métier : « BP », « bloc-porte », « porte isoplane », « porte 83 » (83 = largeur du vantail) ; « huisserie 72 »
(épaisseur de cloison) ; « poussant droit / gauche » ; « contrecollé », « stratifié », « clipsable », « flottant » = parquet
flottant (NF DTU 51.11) ; « point de Hongrie », « bâtons rompus », « diagonale » = pose avec plus de pertes ; « frisette »,
« lambris » = lambris ; « médium », « MDF » ; « champlat », « chambranle », « quart-de-rond » = habillages.
Blocs-portes, portes seules, façades de placard, kits de rails, plans de travail, meubles, trappes : tels qu'écrits, avec leurs
dimensions et leur sens (jamais une valeur par défaut). Hors commande : dépose, évacuation, ajustage, rabotage, protection.
La pose du parquet écrite (« pose droite », « point de Hongrie ») va dans « donnees » (`pose_parquet`), comme la pose du
lambris (`pose_lambris`) ; le colisage du parquet (`colis_parquet`, en m² par colis) se lit sur la référence écrite, sinon se
demande.

## 2. Ouvrages

| Ouvrage | Libellé | Unité | Ce que le devis écrit |
|---|---|---|---|
| parquet-flottant | Parquet ou stratifié posé flottant, avec sous-couche | m² | « Parquet contrecollé flottant », « sol stratifié clipsable », « parquet flottant pose droite » |
| plinthes | Plinthes en barres | ml | « Plinthes MDF », « plinthes bois », « plinthes médium prépeintes », « fourniture et pose de plinthes » |
| lambris | Lambris sur tasseaux | m² | « Lambris pin plafond », « lambris mural », « frisette », « habillage bois sur tasseaux » |

## 3. Ratios

Parquet : surface × (1 + perte de pose : droite 5 %, pièces en L 8 %, diagonale 12 %, point de Hongrie 10 %), au colis.
Sous-couche : surface × 1,05. Plinthes : longueur × 1,08 (coupes d'onglet). Lambris : surface × 1,10 (pose droite) ou × 1,15
(rampant, diagonale) ; tasseaux à 50 cm, ≈ 2,2 m par m² + 10 %.

| Ouvrage | Fourniture | Ratio | Unité | Condition | Confiance | Source |
|---|---|---|---|---|---|---|
| parquet-flottant | Parquet ou stratifié, colis de 1,5 m² | 1,05 | m² | pose_parquet=droite et colis_parquet=1.5 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 1,5 m² | 1,08 | m² | pose_parquet=l et colis_parquet=1.5 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 1,5 m² | 1,12 | m² | pose_parquet=diagonale et colis_parquet=1.5 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 1,5 m² | 1,1 | m² | pose_parquet=hongrie et colis_parquet=1.5 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 1,8 m² | 1,05 | m² | pose_parquet=droite et colis_parquet=1.8 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 1,8 m² | 1,08 | m² | pose_parquet=l et colis_parquet=1.8 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 1,8 m² | 1,12 | m² | pose_parquet=diagonale et colis_parquet=1.8 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 1,8 m² | 1,1 | m² | pose_parquet=hongrie et colis_parquet=1.8 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 2 m² | 1,05 | m² | pose_parquet=droite et colis_parquet=2.0 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 2 m² | 1,08 | m² | pose_parquet=l et colis_parquet=2.0 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 2 m² | 1,12 | m² | pose_parquet=diagonale et colis_parquet=2.0 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 2 m² | 1,1 | m² | pose_parquet=hongrie et colis_parquet=2.0 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 2,2 m² | 1,05 | m² | pose_parquet=droite et colis_parquet=2.2 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 2,2 m² | 1,08 | m² | pose_parquet=l et colis_parquet=2.2 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 2,2 m² | 1,12 | m² | pose_parquet=diagonale et colis_parquet=2.2 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 2,2 m² | 1,1 | m² | pose_parquet=hongrie et colis_parquet=2.2 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 2,5 m² | 1,05 | m² | pose_parquet=droite et colis_parquet=2.5 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 2,5 m² | 1,08 | m² | pose_parquet=l et colis_parquet=2.5 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 2,5 m² | 1,12 | m² | pose_parquet=diagonale et colis_parquet=2.5 | à vérifier | S1 S2 |
| parquet-flottant | Parquet ou stratifié, colis de 2,5 m² | 1,1 | m² | pose_parquet=hongrie et colis_parquet=2.5 | à vérifier | S1 S2 |
| parquet-flottant | Sous-couche parquet | 1,05 | m² | — | usuel | S2 |
| plinthes | Plinthe en barre de 2,40 m | 1,08 | m | — | à vérifier | S3 |
| lambris | Lambris en botte de 2 m² | 1,1 | m² | pose_lambris=droit | usuel | S4 S5 |
| lambris | Lambris en botte de 2 m² | 1,15 | m² | pose_lambris=rampant | usuel | S4 S5 |
| lambris | Tasseau 27 × 40 | 2,42 | m | — | usuel | S4 |

## 4. Conditionnements

| Fourniture | Vendu en | Contenance | Unité | Confiance | Source |
|---|---|---|---|---|---|
| Parquet ou stratifié, colis de 1,5 m² | colis | 1,5 | m² | sûr | S1 |
| Parquet ou stratifié, colis de 1,8 m² | colis | 1,8 | m² | sûr | S1 |
| Parquet ou stratifié, colis de 2 m² | colis | 2 | m² | sûr | S1 |
| Parquet ou stratifié, colis de 2,2 m² | colis | 2,2 | m² | sûr | S1 |
| Parquet ou stratifié, colis de 2,5 m² | colis | 2,5 | m² | sûr | S1 |
| Sous-couche parquet | rouleau | 15 | m² | à vérifier | S2 |
| Plinthe en barre de 2,40 m | barre | 2,4 | m | usuel | S3 |
| Lambris en botte de 2 m² | botte | 2 | m² | à vérifier | S5 |
| Tasseau 27 × 40 | barre | 2,4 | m | usuel | S4 |

## 5. Questions

| Clé | Question | Boutons | Ouvrages |
|---|---|---|---|
| pose_parquet | Ton parquet, tu le poses comment ? | Pose droite=droite / Pièces en L, couloirs=l / Diagonale=diagonale / Point de Hongrie, bâtons rompus=hongrie | parquet-flottant |
| colis_parquet | Ton parquet fait combien de m² par colis (c'est écrit sur le colis) ? | 1,5 m²=1.5 / 1,8 m²=1.8 / 2 m²=2.0 / 2,2 m²=2.2 / 2,5 m²=2.5 | parquet-flottant |
| pose_lambris | Ton lambris est posé comment ? | Droit=droit / Rampant ou diagonale=rampant | lambris |

## 6. Test permanent

Devis d'épreuve écrit à la main (synthétique, anonyme) : rénovation intérieure d'un appartement.

### Devis

| Ligne | Désignation | Quantité | Unité | Ouvrage |
|---|---|---|---|---|
| 1 | Dépose des anciens revêtements et évacuation | 1 | ens | — |
| 2 | Bloc-porte isoplane 204 × 83, huisserie 72, poussant droit | 4 | u | — |
| 3 | Parquet contrecollé chêne posé flottant | 45 | m² | parquet-flottant |
| 4 | Plinthes MDF prépeintes 10 × 70 | 52 | ml | plinthes |
| 5 | Lambris pin au plafond de la chambre | 20 | m² | lambris |

### Bref

- Rénovation intérieure : 4 blocs-portes isoplanes 204 × 83 poussant droit, à commander tels qu'écrits.
- Parquet contrecollé chêne flottant sur 45 m², 52 ml de plinthes MDF prépeintes, 20 m² de lambris pin au plafond.

### Questions attendues

- `pose_parquet`
- `colis_parquet`
- `pose_lambris`

### Réponses

- `pose_parquet` = droite
- `colis_parquet` = 1.8
- `pose_lambris` = droit

### Comptes attendus

Calculs : parquet 45 × 1,05 = 47,25 m² ÷ 1,8 = 26,25 ; sous-couche 47,25 m² ÷ 15 ; plinthes 52 × 1,08 = 56,16 m ÷ 2,4 ;
lambris 20 × 1,10 = 22 m² ÷ 2 ; tasseaux 20 × 2,42 = 48,4 m ÷ 2,4.

| Fourniture | Commande |
|---|---|
| Parquet ou stratifié, colis de 1,8 m² | 27 colis de 1,8 m² |
| Sous-couche parquet | 4 rouleaux de 15 m² |
| Plinthe en barre de 2,40 m | 24 barres de 2,4 m |
| Lambris en botte de 2 m² | 11 bottes de 2 m² |
| Tasseau 27 × 40 | 21 barres de 2,4 m |

## 7. À relire par un menuisier

- Pertes de pose du parquet (5 % droite, 8 % pièces en L, 12 % diagonale, 10 % point de Hongrie) : ±5 % sur les colis.
- Plinthes : 8 % de coupes, sans retirer les passages de porte (le devis donne la longueur nette) ; calcul global et non pièce
  par pièce : ±1 barre par pièce.
- Sous-couche en rouleaux de 15 m² et lambris en bottes de 2 m² : à confirmer selon la référence (le colisage réel varie).
- Tasseaux de lambris à 50 cm (≈ 2,2 m par m² + 10 %) : un tasseau en plus autour des ouvertures n'est pas compté.
- Pare-vapeur sous parquet sur support minéral : non compté (souvent intégré à la sous-couche) ; à écrire au devis s'il est à part.

## 8. Sources

- S1 : Fiches Quick-Step (groupe Samse) : Compact 1,583 et 1,914 m² par paquet, Impressive 1,835 m², vinyle 2,837 m² ; le colisage vient toujours de la référence choisie ; pertes de pose : référentiel du 3 octobre §5.4, à vérifier par un artisan.
- S2 : NF DTU 51.11 (pose flottante, révisé mai 2024) : sous-couche sur toute la surface ; rouleau de 15 m² et 5 % de recouvrement : référentiel du 3 octobre, à vérifier.
- S3 : Plinthes MDF ou bois en barres de 2,40 m (ou 2,44 m) ; 8 % de coupes d'onglet : référentiel du 3 octobre §5.3, à vérifier.
- S4 : Notice SCA Wood (Weldom) : tasseaux perpendiculaires aux lames, écartement 50 cm recommandé ; tasseaux 27 × 40 en 2,40 m ; perte lambris 10 % droit, 15 % rampant.
- S5 : Lambris pin 10 × 100 en bottes de 2 m² (exemple de ligne commandable, référentiel du 3 octobre §2) : colisage à vérifier selon la référence.
