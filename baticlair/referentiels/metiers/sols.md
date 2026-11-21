---
code: sols
metier: flooring
nom: Sols souples et parquet
etat: brouillon
version: 2026-10-19
moteur: fiche
---

# Fiche métier : sols souples et parquet (format commun, §52)

Nouveau métier (aucun tiroir avant le 19 octobre 2026). Recherche du 19 octobre : fiches de colles acryliques pour sols
souples (Bostik Polymang SM, Zolpan Acrysol+, Sika-Cégécol CEGE 100 PLASTIQUE), rouleaux de sol PVC (Brico Dépôt) ; parquet
et ragréage repris des fiches menuiserie intérieure et carrelage (même sources). Règle d'or : le m² du devis devient des
mètres de rouleau à la largeur du lé, des colis, des seaux de colle, des sacs de ragréage.

## 1. Unités et vocabulaire du devis

Unités du devis : m² (sols), ml (plinthes, seuils : tels qu'écrits), u (barres de seuil, nez de marche : tels qu'écrits).
Mots du métier : « sol PVC », « vinyle en rouleau », « lino », « sol souple collé » ; « LVT », « lames vinyle clipsables »,
« sol vinyle clipsable » ; « moquette », « textile » ; « parquet flottant », « stratifié », « contrecollé » ; « ragréage »,
« P3 ».
Le colisage (« colis de 2,2 m² ») et la pose (« pose droite ») écrits vont dans « donnees » (`colis_lvt`, `colis_parquet`,
`pose_parquet`), comme l'épaisseur de ragréage (`epaisseur_ragreage`). Le revêtement (référence, coloris) est celui du devis : la
fiche n'en compte que les quantités commandables. Hors commande : dépose, évacuation, main-d'œuvre.

## 2. Ouvrages

| Ouvrage | Libellé | Unité | Ce que le devis écrit |
|---|---|---|---|
| sol-pvc-rouleau | Sol PVC en rouleau collé | m² | « Sol PVC en rouleau collé », « sol vinyle en lés », « lino collé », « sol souple collé » |
| moquette | Moquette collée | m² | « Moquette collée », « moquette en lés », « revêtement textile » |
| lvt-clipsable | Lames vinyle clipsables | m² | « Lames vinyle clipsables », « LVT clipsable », « sol vinyle clipsable » |
| parquet-flottant | Parquet ou stratifié posé flottant | m² | « Parquet flottant », « stratifié », « contrecollé flottant » |
| ragreage | Ragréage autolissant | m² | « Ragréage autolissant », « ragréage P3 », « préparation du support » |

## 3. Ratios

Rouleaux (PVC, moquette) : surface × 1,10 (chutes de lé et raccords), commandés au mètre de lé de 4 m. Colle acrylique :
300 g/m² (PVC) ou 350 g/m² (moquette) à la spatule A2, + 5 %. Lames clipsables : × 1,07. Parquet : pertes de pose 5 à 12 %.
Ragréage : 1,5 kg/m² par mm.

| Ouvrage | Fourniture | Ratio | Unité | Condition | Confiance | Source |
|---|---|---|---|---|---|---|
| sol-pvc-rouleau | Sol PVC en rouleau, largeur 4 m | 1,1 | m² | — | à vérifier | S2 S6 |
| sol-pvc-rouleau | Colle acrylique sols souples | 0,315 | kg | — | usuel | S1 |
| moquette | Moquette en rouleau, largeur 4 m | 1,1 | m² | — | à vérifier | S6 |
| moquette | Colle acrylique sols souples | 0,3675 | kg | — | usuel | S1 |
| lvt-clipsable | Lames vinyle clipsables, colis de 1,5 m² | 1,07 | m² | colis_lvt=1.5 | à vérifier | S3 S6 |
| lvt-clipsable | Lames vinyle clipsables, colis de 2 m² | 1,07 | m² | colis_lvt=2.0 | à vérifier | S3 S6 |
| lvt-clipsable | Lames vinyle clipsables, colis de 2,2 m² | 1,07 | m² | colis_lvt=2.2 | à vérifier | S3 S6 |
| lvt-clipsable | Lames vinyle clipsables, colis de 2,8 m² | 1,07 | m² | colis_lvt=2.8 | à vérifier | S3 S6 |
| lvt-clipsable | Sous-couche pour sol clipsable | 1,05 | m² | — | usuel | S4 |
| parquet-flottant | Parquet ou stratifié, colis de 1,5 m² | 1,05 | m² | pose_parquet=droite et colis_parquet=1.5 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 1,5 m² | 1,08 | m² | pose_parquet=l et colis_parquet=1.5 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 1,5 m² | 1,12 | m² | pose_parquet=diagonale et colis_parquet=1.5 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 1,5 m² | 1,1 | m² | pose_parquet=hongrie et colis_parquet=1.5 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 1,8 m² | 1,05 | m² | pose_parquet=droite et colis_parquet=1.8 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 1,8 m² | 1,08 | m² | pose_parquet=l et colis_parquet=1.8 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 1,8 m² | 1,12 | m² | pose_parquet=diagonale et colis_parquet=1.8 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 1,8 m² | 1,1 | m² | pose_parquet=hongrie et colis_parquet=1.8 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 2 m² | 1,05 | m² | pose_parquet=droite et colis_parquet=2.0 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 2 m² | 1,08 | m² | pose_parquet=l et colis_parquet=2.0 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 2 m² | 1,12 | m² | pose_parquet=diagonale et colis_parquet=2.0 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 2 m² | 1,1 | m² | pose_parquet=hongrie et colis_parquet=2.0 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 2,2 m² | 1,05 | m² | pose_parquet=droite et colis_parquet=2.2 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 2,2 m² | 1,08 | m² | pose_parquet=l et colis_parquet=2.2 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 2,2 m² | 1,12 | m² | pose_parquet=diagonale et colis_parquet=2.2 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 2,2 m² | 1,1 | m² | pose_parquet=hongrie et colis_parquet=2.2 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 2,5 m² | 1,05 | m² | pose_parquet=droite et colis_parquet=2.5 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 2,5 m² | 1,08 | m² | pose_parquet=l et colis_parquet=2.5 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 2,5 m² | 1,12 | m² | pose_parquet=diagonale et colis_parquet=2.5 | à vérifier | S3 S5 |
| parquet-flottant | Parquet ou stratifié, colis de 2,5 m² | 1,1 | m² | pose_parquet=hongrie et colis_parquet=2.5 | à vérifier | S3 S5 |
| parquet-flottant | Sous-couche parquet | 1,05 | m² | — | usuel | S5 |
| ragreage | Ragréage autolissant P3 | 4,5 | kg | epaisseur_ragreage=3 | sûr | S7 |
| ragreage | Ragréage autolissant P3 | 7,5 | kg | epaisseur_ragreage=5 | sûr | S7 |
| ragreage | Primaire d'accrochage | 0,15 | kg | — | usuel | S7 |

## 4. Conditionnements

| Fourniture | Vendu en | Contenance | Unité | Confiance | Source | Consommable |
|---|---|---|---|---|---|---|
| Sol PVC en rouleau, largeur 4 m | mètre | 4 | m² | usuel | S2 | non |
| Colle acrylique sols souples | seau | 20 | kg | sûr | S1 | non |
| Moquette en rouleau, largeur 4 m | mètre | 4 | m² | usuel | S6 | non |
| Lames vinyle clipsables, colis de 1,5 m² | colis | 1,5 | m² | sûr | S3 | non |
| Lames vinyle clipsables, colis de 2 m² | colis | 2 | m² | sûr | S3 | non |
| Lames vinyle clipsables, colis de 2,2 m² | colis | 2,2 | m² | sûr | S3 | non |
| Lames vinyle clipsables, colis de 2,8 m² | colis | 2,8 | m² | sûr | S3 | non |
| Sous-couche pour sol clipsable | rouleau | 10 | m² | à vérifier | S4 | non |
| Parquet ou stratifié, colis de 1,5 m² | colis | 1,5 | m² | sûr | S3 | non |
| Parquet ou stratifié, colis de 1,8 m² | colis | 1,8 | m² | sûr | S3 | non |
| Parquet ou stratifié, colis de 2 m² | colis | 2 | m² | sûr | S3 | non |
| Parquet ou stratifié, colis de 2,2 m² | colis | 2,2 | m² | sûr | S3 | non |
| Parquet ou stratifié, colis de 2,5 m² | colis | 2,5 | m² | sûr | S3 | non |
| Sous-couche parquet | rouleau | 15 | m² | à vérifier | S5 | non |
| Ragréage autolissant P3 | sac | 25 | kg | sûr | S7 | non |
| Primaire d'accrochage | bidon | 5 | kg | à vérifier | S7 | non |

## 5. Questions

| Clé | Question | Boutons | Ouvrages |
|---|---|---|---|
| colis_lvt | Tes lames clipsables font combien de m² par colis ? | 1,5 m²=1.5 / 2 m²=2.0 / 2,2 m²=2.2 / 2,8 m²=2.8 | lvt-clipsable |
| colis_parquet | Ton parquet fait combien de m² par colis ? | 1,5 m²=1.5 / 1,8 m²=1.8 / 2 m²=2.0 / 2,2 m²=2.2 / 2,5 m²=2.5 | parquet-flottant |
| pose_parquet | Ton parquet, tu le poses comment ? | Pose droite=droite / Pièces en L, couloirs=l / Diagonale=diagonale / Point de Hongrie, bâtons rompus=hongrie | parquet-flottant |
| epaisseur_ragreage | Ton ragréage fait quelle épaisseur ? | 3 mm=3 / 5 mm=5 | ragreage |

## 6. Test permanent

Devis d'épreuve écrit à la main (synthétique, anonyme) : sols d'une maison de location.

### Devis

| Ligne | Désignation | Quantité | Unité | Ouvrage |
|---|---|---|---|---|
| 1 | Dépose des anciens revêtements | 1 | ens | — |
| 2 | Ragréage autolissant | 30 | m² | ragreage |
| 3 | Sol PVC en rouleau collé, cuisine et salle d'eau | 30 | m² | sol-pvc-rouleau |
| 4 | Lames vinyle clipsables, séjour | 40 | m² | lvt-clipsable |
| 5 | Moquette collée, chambres | 25 | m² | moquette |

### Bref

- Sols d'une maison de location : ragréage puis sol PVC en rouleau collé sur 30 m² (cuisine et salle d'eau).
- Lames vinyle clipsables sur 40 m² au séjour, moquette collée sur 25 m² dans les chambres ; dépose hors commande.

### Questions attendues

- `epaisseur_ragreage`
- `colis_lvt`

### Réponses

- `epaisseur_ragreage` = 3
- `colis_lvt` = 2.2

### Comptes attendus

Calculs : ragréage 30 × 4,5 = 135 kg ÷ 25 ; primaire 4,5 kg ; PVC 33 m² ÷ 4 ; colle 30 × 0,315 + 25 × 0,3675 = 18,64 kg ÷ 20 ;
lames 42,8 m² ÷ 2,2 ; sous-couche 42 m² ÷ 10 ; moquette 27,5 m² ÷ 4.

| Fourniture | Commande |
|---|---|
| Ragréage autolissant P3 | 6 sacs de 25 kg |
| Primaire d'accrochage | 1 bidon de 5 kg |
| Sol PVC en rouleau, largeur 4 m | 9 mètres de 4 m² |
| Colle acrylique sols souples | 1 seau de 20 kg |
| Lames vinyle clipsables, colis de 2,2 m² | 20 colis de 2,2 m² |
| Sous-couche pour sol clipsable | 5 rouleaux de 10 m² |
| Moquette en rouleau, largeur 4 m | 7 mètres de 4 m² |

## 7. À relire par un solier

- Chutes de lé à 10 % : une pièce plus large que le lé de 4 m demande un raccord ; à calepiner pièce par pièce (non fait ici).
- Colle acrylique 300 g/m² (PVC) et 350 g/m² (moquette) à la spatule A2 : les fiches donnent 200 à 400 g/m² selon l'envers du revêtement.
- Lames clipsables : 7 % de coupes ; sous-couche en rouleaux de 10 m² à confirmer selon la marque (souvent intégrée à la lame).
- Largeur de lé : 4 m par défaut ; les lés de 2 et 3 m existent (une question à ajouter si un solier les commande souvent).
- Parquet : mêmes pertes que la fiche menuiserie intérieure.

## 8. Sources

- S1 : Fiches colles acryliques pour sols souples : Bostik Polymang SM (spatule A2 : 200 à 250 g/m², 200 à 400 g/m² selon support, seau de 20 kg), Zolpan / Tollens Artis Acrysol+ (A2 : 250 à 300 g/m²), Sika-Cégécol CEGE 100 PLASTIQUE (250 à 400 g/m², seaux de 7 et 20 kg) ; consultées le 19 octobre 2026.
- S2 : Rouleaux de sol PVC en largeur 4 m (Brico Dépôt « Farm Pecan », « Broadway », « Provence »), 2 m existe ; consultés le 19 octobre 2026.
- S3 : Colisages de lames et de parquet (Quick-Step : vinyle 2,837 m², Impressive 1,835 m², Compact 1,583 et 1,914 m²) : le colis réel vient de la référence choisie.
- S4 : Sous-couche pour sol clipsable en rouleau de 10 m² : de mémoire, à vérifier.
- S5 : NF DTU 51.11 (pose flottante) ; pertes de pose du parquet : référentiel menuiserie intérieure du 3 octobre §5.4, à vérifier.
- S6 : Chutes de lé et de coupe (10 % en rouleau, 7 % en lames) : pratique courante relevée le 19 octobre 2026 (forum Construire), non sourcée par un fabricant : à vérifier par un solier.
- S7 : weber.niv pro / elit : 1,5 kg/m² par mm, sac de 25 kg ; primaire 0,15 kg/m² (référentiel carrelage du 3 octobre §4.5).
