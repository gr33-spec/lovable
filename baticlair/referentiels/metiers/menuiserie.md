---
code: menuiserie
metier: joinery
nom: Menuiseries extérieures
etat: brouillon
version: 2026-10-19
moteur: fiche
document: docs/referentiels/menuiserie.md
---

# Fiche métier : menuiseries extérieures (format commun, §52)

Tirée du référentiel menuiserie du 3 octobre 2026 (`docs/referentiels/menuiserie.md`, sections 2 à 5, fiches fabricant
ouvertes ce jour-là). Règle d'or du métier : une menuiserie = une ligne à l'unité, avec ses cotes, son ouverture et sa
finition, commandée au fabricant telle qu'écrite ; la fiche n'ajoute que les fournitures de pose, au négoce, en rouleaux,
aérosols, cartouches, boîtes et barres, calculées sur le périmètre de chaque menuiserie (NF DTU 36.5).

## 1. Unités et vocabulaire du devis

Unités du devis : u (fenêtres, portes-fenêtres, baies, portes, volets), ens / forfait (dépose, évacuation).
Mots du métier : « OF » = ouvrant à la française ; « OB » = oscillo-battant ; « PF » = porte-fenêtre ; « 2V » = 2 vantaux ;
« coulissant », « galandage alu » (extérieur) = baie coulissante ; « pose en rénovation », « pose sur dormant existant » =
pose en rénovation ; « dépose totale », « pose en tunnel », « pose en feuillure » = dépose totale ; « pose en applique »,
« pose neuf », « avec tapée » = neuf en applique intérieure ; « VR » = volet roulant ; « compriband » = mousse imprégnée.
La menuiserie elle-même (fenêtre, porte, baie, volet) reste TELLE QU'ÉCRITE, avec ses cotes (« cotes devis, à confirmer au
relevé ») : la ligne donne l'article tel qu'écrit ET l'ouvrage de pose (colonne « Article écrit » = oui).
Le format (`format_depose`, `format_reno`, `format_neuf`) se déduit des cotes L × H écrites : la classe la plus proche
(petite fenêtre ≈ 0,80 × 1,00 ; fenêtre ≈ 1,20 × 1,35 ; porte-fenêtre ≈ 1,20 × 2,15 ; baie ≈ 2,40 × 2,15) va dans « donnees » ;
la question n'est posée que si les cotes manquent. Volets, portes de garage, tapées, pattes, volets bloc-baie : fournis par le
fabricant, rien de plus au négoce. La mousse PU n'est jamais un calfeutrement (NF DTU 36.5) : elle s'ajoute côté intérieur.
Hors commande : dépose, évacuation, main-d'œuvre, relevé de cotes.

## 2. Ouvrages

| Ouvrage | Libellé | Unité | Article écrit | Ce que le devis écrit |
|---|---|---|---|---|
| pose-depose-totale | Pose en dépose totale (tunnel ou feuillure) | u | oui | « Fenêtre PVC 2 vantaux, pose en dépose totale », « pose en tunnel », « dépose complète et pose » |
| pose-renovation | Pose en rénovation sur dormant existant | u | oui | « Porte-fenêtre PVC, pose en rénovation sur dormant existant », « pose réno », « pose sur ancien dormant » |
| pose-neuf-applique | Pose neuf en applique intérieure | u | oui | « Baie coulissante alu, pose en applique », « pose neuf avec tapée », « pose en applique intérieure » |
| pose-porte-entree | Pose d'une porte d'entrée | u | oui | « Porte d'entrée alu », « porte d'entrée acier, pose en dépose totale », « porte de service » |

## 3. Ratios

Par menuiserie : périmètre P = 2 × (L + H) de sa classe ; mousse imprégnée P × 1,05 ; mousse PU P ; mastic extérieur
P × 1,10 ; mastic intérieur P ; bande d'étanchéité à l'air P × 1,10 ; fixations = 2 × n(H) + n(L) + n(L) si L > 0,90 m,
n(s) = max(2, ⌈(s − 0,30) ÷ e⌉ + 1), e = 0,80 m (0,60 m pour une baie coulissante), × 1,05 ; habillages L + 2H + 0,15 m × 1,10.

| Ouvrage | Fourniture | Ratio | Unité | Condition | Confiance | Source |
|---|---|---|---|---|---|---|
| pose-depose-totale | Mousse imprégnée précomprimée 15/3-7 | 7,035 | m | format_depose=porte_fenetre | usuel | S1 S7 |
| pose-depose-totale | Mousse PU basse expansion 750 ml | 6,7 | m | format_depose=porte_fenetre | à vérifier | S2 S7 |
| pose-depose-totale | Mastic MS polymère 290 ml | 7,37 | m | format_depose=porte_fenetre | usuel | S3 S7 |
| pose-depose-totale | Mastic acrylique 310 ml | 6,7 | m | format_depose=porte_fenetre | à vérifier | S3 S7 |
| pose-depose-totale | Vis de cadre FFS 7,5 × 152 | 14,7 | u | format_depose=porte_fenetre | usuel | S4 S8 |
| pose-depose-totale | Habillage intérieur PVC plat 100 mm | 6,215 | m | format_depose=porte_fenetre | à vérifier | S6 S7 |
| pose-depose-totale | Mousse imprégnée précomprimée 15/3-7 | 9,555 | m | format_depose=baie | usuel | S1 S7 |
| pose-depose-totale | Mousse PU basse expansion 750 ml | 9,1 | m | format_depose=baie | à vérifier | S2 S7 |
| pose-depose-totale | Mastic MS polymère 290 ml | 10,01 | m | format_depose=baie | usuel | S3 S7 |
| pose-depose-totale | Mastic acrylique 310 ml | 9,1 | m | format_depose=baie | à vérifier | S3 S7 |
| pose-depose-totale | Vis de cadre FFS 7,5 × 152 | 21 | u | format_depose=baie | usuel | S4 S8 |
| pose-depose-totale | Habillage intérieur PVC plat 100 mm | 7,535 | m | format_depose=baie | à vérifier | S6 S7 |
| pose-depose-totale | Mousse imprégnée précomprimée 15/3-7 | 3,78 | m | format_depose=petite | usuel | S1 S7 |
| pose-depose-totale | Mousse PU basse expansion 750 ml | 3,6 | m | format_depose=petite | à vérifier | S2 S7 |
| pose-depose-totale | Mastic MS polymère 290 ml | 3,96 | m | format_depose=petite | usuel | S3 S7 |
| pose-depose-totale | Mastic acrylique 310 ml | 3,6 | m | format_depose=petite | à vérifier | S3 S7 |
| pose-depose-totale | Vis de cadre FFS 7,5 × 152 | 6,3 | u | format_depose=petite | usuel | S4 S8 |
| pose-depose-totale | Habillage intérieur PVC plat 100 mm | 3,245 | m | format_depose=petite | à vérifier | S6 S7 |
| pose-depose-totale | Mousse imprégnée précomprimée 15/3-7 | 5,355 | m | format_depose=fenetre | usuel | S1 S7 |
| pose-depose-totale | Mousse PU basse expansion 750 ml | 5,1 | m | format_depose=fenetre | à vérifier | S2 S7 |
| pose-depose-totale | Mastic MS polymère 290 ml | 5,61 | m | format_depose=fenetre | usuel | S3 S7 |
| pose-depose-totale | Mastic acrylique 310 ml | 5,1 | m | format_depose=fenetre | à vérifier | S3 S7 |
| pose-depose-totale | Vis de cadre FFS 7,5 × 152 | 12,6 | u | format_depose=fenetre | usuel | S4 S8 |
| pose-depose-totale | Habillage intérieur PVC plat 100 mm | 4,455 | m | format_depose=fenetre | à vérifier | S6 S7 |
| pose-renovation | Mastic MS polymère 290 ml | 7,37 | m | format_reno=porte_fenetre | usuel | S3 S7 |
| pose-renovation | Mastic acrylique 310 ml | 6,7 | m | format_reno=porte_fenetre | à vérifier | S3 S7 |
| pose-renovation | Mousse PU basse expansion 750 ml | 6,7 | m | format_reno=porte_fenetre | à vérifier | S2 S7 |
| pose-renovation | Vis de cadre FFS 7,5 × 152 | 14,7 | u | format_reno=porte_fenetre | usuel | S4 S8 |
| pose-renovation | Habillage intérieur PVC plat 100 mm | 6,215 | m | format_reno=porte_fenetre | à vérifier | S6 S7 |
| pose-renovation | Cornière d'habillage extérieur PVC | 6,215 | m | format_reno=porte_fenetre | à vérifier | S6 S7 |
| pose-renovation | Mastic MS polymère 290 ml | 10,01 | m | format_reno=baie | usuel | S3 S7 |
| pose-renovation | Mastic acrylique 310 ml | 9,1 | m | format_reno=baie | à vérifier | S3 S7 |
| pose-renovation | Mousse PU basse expansion 750 ml | 9,1 | m | format_reno=baie | à vérifier | S2 S7 |
| pose-renovation | Vis de cadre FFS 7,5 × 152 | 21 | u | format_reno=baie | usuel | S4 S8 |
| pose-renovation | Habillage intérieur PVC plat 100 mm | 7,535 | m | format_reno=baie | à vérifier | S6 S7 |
| pose-renovation | Cornière d'habillage extérieur PVC | 7,535 | m | format_reno=baie | à vérifier | S6 S7 |
| pose-renovation | Mastic MS polymère 290 ml | 3,96 | m | format_reno=petite | usuel | S3 S7 |
| pose-renovation | Mastic acrylique 310 ml | 3,6 | m | format_reno=petite | à vérifier | S3 S7 |
| pose-renovation | Mousse PU basse expansion 750 ml | 3,6 | m | format_reno=petite | à vérifier | S2 S7 |
| pose-renovation | Vis de cadre FFS 7,5 × 152 | 6,3 | u | format_reno=petite | usuel | S4 S8 |
| pose-renovation | Habillage intérieur PVC plat 100 mm | 3,245 | m | format_reno=petite | à vérifier | S6 S7 |
| pose-renovation | Cornière d'habillage extérieur PVC | 3,245 | m | format_reno=petite | à vérifier | S6 S7 |
| pose-renovation | Mastic MS polymère 290 ml | 5,61 | m | format_reno=fenetre | usuel | S3 S7 |
| pose-renovation | Mastic acrylique 310 ml | 5,1 | m | format_reno=fenetre | à vérifier | S3 S7 |
| pose-renovation | Mousse PU basse expansion 750 ml | 5,1 | m | format_reno=fenetre | à vérifier | S2 S7 |
| pose-renovation | Vis de cadre FFS 7,5 × 152 | 12,6 | u | format_reno=fenetre | usuel | S4 S8 |
| pose-renovation | Habillage intérieur PVC plat 100 mm | 4,455 | m | format_reno=fenetre | à vérifier | S6 S7 |
| pose-renovation | Cornière d'habillage extérieur PVC | 4,455 | m | format_reno=fenetre | à vérifier | S6 S7 |
| pose-neuf-applique | Mousse imprégnée précomprimée 15/3-7 | 7,035 | m | format_neuf=porte_fenetre | usuel | S1 S7 |
| pose-neuf-applique | Bande d'étanchéité à l'air 100 mm | 7,37 | m | format_neuf=porte_fenetre | usuel | S5 S7 |
| pose-neuf-applique | Cheville de fixation de cadre 8 × 80 | 14,7 | u | format_neuf=porte_fenetre | à vérifier | S8 S9 |
| pose-neuf-applique | Mousse imprégnée précomprimée 15/3-7 | 9,555 | m | format_neuf=baie | usuel | S1 S7 |
| pose-neuf-applique | Bande d'étanchéité à l'air 100 mm | 10,01 | m | format_neuf=baie | usuel | S5 S7 |
| pose-neuf-applique | Cheville de fixation de cadre 8 × 80 | 21 | u | format_neuf=baie | à vérifier | S8 S9 |
| pose-neuf-applique | Mousse imprégnée précomprimée 15/3-7 | 3,78 | m | format_neuf=petite | usuel | S1 S7 |
| pose-neuf-applique | Bande d'étanchéité à l'air 100 mm | 3,96 | m | format_neuf=petite | usuel | S5 S7 |
| pose-neuf-applique | Cheville de fixation de cadre 8 × 80 | 6,3 | u | format_neuf=petite | à vérifier | S8 S9 |
| pose-neuf-applique | Mousse imprégnée précomprimée 15/3-7 | 5,355 | m | format_neuf=fenetre | usuel | S1 S7 |
| pose-neuf-applique | Bande d'étanchéité à l'air 100 mm | 5,61 | m | format_neuf=fenetre | usuel | S5 S7 |
| pose-neuf-applique | Cheville de fixation de cadre 8 × 80 | 12,6 | u | format_neuf=fenetre | à vérifier | S8 S9 |
| pose-porte-entree | Mousse imprégnée précomprimée 15/3-7 | 6,405 | m | — | usuel | S1 S7 |
| pose-porte-entree | Mousse PU basse expansion 750 ml | 6,1 | m | — | à vérifier | S2 S7 |
| pose-porte-entree | Mastic MS polymère 290 ml | 6,71 | m | — | usuel | S3 S7 |
| pose-porte-entree | Vis de cadre FFS 7,5 × 152 | 10,5 | u | — | usuel | S4 S8 |

## 4. Conditionnements

| Fourniture | Vendu en | Contenance | Unité | Confiance | Source |
|---|---|---|---|---|---|
| Mousse imprégnée précomprimée 15/3-7 | rouleau | 8 | m | sûr | S1 |
| Mousse PU basse expansion 750 ml | aérosol | 15 | m | à vérifier | S2 |
| Mastic MS polymère 290 ml | cartouche | 5,2 | m | usuel | S3 |
| Mastic acrylique 310 ml | cartouche | 14 | m | à vérifier | S3 |
| Vis de cadre FFS 7,5 × 152 | boîte | 100 | u | sûr | S4 |
| Bande d'étanchéité à l'air 100 mm | rouleau | 25 | m | sûr | S5 |
| Habillage intérieur PVC plat 100 mm | barre | 3 | m | sûr | S6 |
| Cornière d'habillage extérieur PVC | barre | 3 | m | sûr | S6 |
| Cheville de fixation de cadre 8 × 80 | boîte | 100 | u | à vérifier | S9 |

## 5. Questions

| Clé | Question | Boutons | Ouvrages |
|---|---|---|---|
| format_depose | Tes menuiseries en dépose totale, c'est quel format (cotes non écrites) ? | Porte-fenêtre=porte_fenetre / Baie=baie / Petite fenêtre=petite / Fenêtre=fenetre | pose-depose-totale |
| format_reno | Tes menuiseries posées sur l'ancien dormant, c'est quel format (cotes non écrites) ? | Porte-fenêtre=porte_fenetre / Baie=baie / Petite fenêtre=petite / Fenêtre=fenetre | pose-renovation |
| format_neuf | Tes menuiseries posées en applique, c'est quel format (cotes non écrites) ? | Porte-fenêtre=porte_fenetre / Baie=baie / Petite fenêtre=petite / Fenêtre=fenetre | pose-neuf-applique |

## 6. Test permanent

Devis d'épreuve écrit à la main (synthétique, anonyme) : remplacement des menuiseries d'une maison, sans cotes écrites.

### Devis

| Ligne | Désignation | Quantité | Unité | Ouvrage |
|---|---|---|---|---|
| 1 | Dépose des anciennes menuiseries et évacuation | 1 | ens | — |
| 2 | Fenêtre PVC 2 vantaux oscillo-battante, pose en dépose totale | 4 | u | pose-depose-totale |
| 3 | Porte-fenêtre PVC 2 vantaux, pose en rénovation sur dormant existant | 2 | u | pose-renovation |
| 4 | Baie coulissante alu 2 vantaux, pose en applique | 1 | u | pose-neuf-applique |
| 5 | Porte d'entrée alu vitrée | 1 | u | pose-porte-entree |

### Bref

- Remplacement des menuiseries d'une maison : 4 fenêtres PVC en dépose totale, 2 portes-fenêtres en rénovation sur dormant.
- Une baie coulissante alu posée en applique et une porte d'entrée alu ; menuiseries commandées au fabricant, cotes à relever.

### Questions attendues

- `format_depose`
- `format_reno`
- `format_neuf`

### Réponses

- `format_depose` = fenetre
- `format_reno` = porte_fenetre
- `format_neuf` = baie

### Comptes attendus

Calculs : mousse imprégnée 4 × 5,355 + 9,555 + 6,405 = 37,38 m ÷ 8 ; mousse PU 4 × 5,1 + 2 × 6,7 + 6,1 = 39,9 m ÷ 15 ; mastic MS
4 × 5,61 + 2 × 7,37 + 6,71 = 43,89 m ÷ 5,2 ; acrylique 4 × 5,1 + 2 × 6,7 = 33,8 m ÷ 14 ; vis 4 × 12,6 + 2 × 14,7 + 10,5 = 90,3 ;
habillage intérieur 4 × 4,455 + 2 × 6,215 = 30,25 m ÷ 3 ; cornière 2 × 6,215 = 12,43 m ÷ 3 ; bande 10,01 m ; chevilles 21.

| Fourniture | Commande |
|---|---|
| Mousse imprégnée précomprimée 15/3-7 | 5 rouleaux de 8 m |
| Mousse PU basse expansion 750 ml | 3 aérosols de 15 m |
| Mastic MS polymère 290 ml | 9 cartouches de 5,2 m |
| Mastic acrylique 310 ml | 3 cartouches de 14 m |
| Vis de cadre FFS 7,5 × 152 | 1 boîte de 100 u |
| Habillage intérieur PVC plat 100 mm | 11 barres de 3 m |
| Cornière d'habillage extérieur PVC | 5 barres de 3 m |
| Bande d'étanchéité à l'air 100 mm | 1 rouleau de 25 m |
| Cheville de fixation de cadre 8 × 80 | 1 boîte de 100 u |

## 7. À relire par un menuisier

- Format par classe (4 tailles types) au lieu des cotes exactes : sur une menuiserie hors classe, ±20 % sur les fournitures de pose
  (les cotes écrites au devis donnent la classe ligne par ligne ; sans cotes, une seule réponse vaut pour tout l'ouvrage).
- Rendement de la mousse PU (15 m de joint par aérosol de 750 ml, fiche Soudal : 31 m en essai) et du mastic acrylique intérieur
  (14 m par cartouche) : ±50 % sur aérosols et cartouches.
- Fixations : entraxe 0,80 m (0,60 m en coulissant, à valider), 0,15 m des angles, appui immobilisé au-delà de 0,90 m.
- Habillages : longueur de pièces + 10 % au lieu du rangement des pièces dans les barres (§5.3 du référentiel) : ±1 barre par chantier.
- Chevilles en pose neuf : les pattes viennent avec la menuiserie ; cheville 8 × 80 à confirmer selon le support.

## 8. Sources

- S1 : illbruck TP600 illmod 600 (Tremco CPG), fiche technique éd. 2022-09 (diffusée par Gedimat) : section 15/3-7 en rouleaux de 8 m, classe 1, conforme NF DTU 36.5 ; consultée le 3 octobre 2026.
- S2 : Soudal Soudafoam Gun Low Expansion, fiche 15/04/2022 : aérosol 750 ml, ≈ 31 m de joint en essai EN 17333-1 ; rendement chantier 15 m retenu, à vérifier.
- S3 : Soudal Soudaseal 240 FC (MS polymère), cartouche 290 ml : rendement = 290 ÷ (10 × 5 mm) × 0,9 = 5,2 m de joint ; acrylique intérieur en joint d'angle ≈ 14 m (à vérifier).
- S4 : fischer FFS 7,5, vis de cadre traversante, boîte de 100, longueurs 42 à 212 mm (catalogue fischer, Trenois ; fiche Descours & Cabaud).
- S5 : SIGA Fentrim IS 20 (fiche 29.10.2024) : rouleau de 25 m, largeur 100 mm par défaut en neuf applique.
- S6 : Habillages, plats et cornières PVC blancs en barres de 3 m (Quadroform plat 100 mm × 3 m ; colis de cornières 10 × 3 m).
- S7 : Périmètre et règles de calcul par menuiserie : référentiel du 3 octobre, §5.2 (P = 2 × (L + H), pertes 5 à 10 %), classes de format : règle BatiClair, à vérifier.
- S8 : NF DTU 36.5 : entraxe maximal des fixations 0,80 m, fixation à 0,25 m au plus des angles, immobilisation de l'appui au-delà de 0,90 m (Louineau, normesdtuposemenuiserie, Norba) ; coulissants 0,60 m à valider.
- S9 : Cheville de fixation de cadre 8 × 80 en boîte de 100 : de mémoire, à vérifier (pattes fournies par le fabricant de la menuiserie, référentiel §3.3 piège 6).
