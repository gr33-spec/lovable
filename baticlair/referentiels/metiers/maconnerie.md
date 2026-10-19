---
code: maconnerie
metier: masonry
nom: Maçonnerie - gros œuvre
etat: brouillon
version: 2026-10-19
moteur: fiche
document: docs/referentiels/maconnerie.md
---

# Fiche métier : maçonnerie - gros œuvre (format commun, §52)

Tirée du référentiel maçonnerie du 3 octobre 2026 (`docs/referentiels/maconnerie.md`, sections 2 à 12, fiches fabricant
ouvertes ce jour-là), vérifiée le 19 octobre 2026 pour le film sous dallage. Ce que le maçon commande au négoce : blocs et
briques à la palette, mortier, colle et ciment en sacs, béton prêt à l'emploi au demi-mètre cube, armatures en éléments de
6 m, treillis en panneaux, entrevous à la palette, film en rouleaux, granulats à la tonne.

## 1. Unités et vocabulaire du devis

Unités du devis : m² (murs, dallages, planchers, enduits, chapes), ml (semelles, chaînages), m³ (fouilles, béton au volume),
u (linteaux, poutrelles, regards), ens / forfait (échafaudage, installation de chantier).
Mots du métier : « parpaing », « agglo », « bloc creux B40 » = bloc béton ; « de 20 » = épaisseur 20 cm ; « brique R20 »,
« Porotherm », « brique rectifiée » = brique à joint mince (mortier-colle) ; « Ytong », « Siporex », « Cellumat » = béton
cellulaire (collé) ; « BP », « béton maigre » = béton de propreté ; « semelle 50×25 » = largeur × hauteur en cm ;
« ceinture », « chaînage », « raidisseur » = chaînage ; « hourdis », « entrevous », « poutrelles », « dalle de compression » =
plancher poutrelles-entrevous ; « hérisson », « cailloutis » = couche drainante sous dallage ; « crépi » = enduit monocouche.
Hors commande (la ligne reste au devis, aucune fourniture) : fouilles, terrassement, évacuation, benne, échafaudage,
étaiement, location de toupie ou de pompe, mini-pelle, nettoyage, main-d'œuvre.
Les poutrelles se commandent sur le plan de pose du fabricant : une ligne de poutrelles reste telle qu'écrite. Linteaux,
appuis, seuils et regards écrits à l'unité restent tels qu'écrits.
Une ligne qui écrit plusieurs ouvrages (« dallage 12 cm sur hérisson et film polyane ») donne une fourniture par ouvrage,
chacune avec la quantité de la ligne. L'épaisseur, la section ou le type d'entrevous écrits sur la ligne vont dans
« donnees » sous la clé de leur question (`epaisseur_dallage` = 12, `section_semelle` = 50x25…) : la question n'est pas posée.

## 2. Ouvrages

| Ouvrage | Libellé | Unité | Ce que le devis écrit |
|---|---|---|---|
| mur-parpaing-20 | Mur en blocs béton creux de 20 | m² | « Mur en parpaings de 20 », « agglo 20×20×50 », « bloc creux B40 de 20 », « murs en blocs béton de 20 » |
| mur-parpaing-15 | Mur en blocs béton creux de 15 | m² | « Parpaing de 15 », « bloc creux de 15 », « agglo de 15 » |
| mur-parpaing-10 | Cloison en blocs béton de 10 | m² | « Cloison en parpaing de 10 », « bloc de 10 », « agglo de 10 » |
| mur-brique-rectifiee-20 | Mur en brique rectifiée de 20 | m² | « Brique R20 », « Porotherm R20 », « brique rectifiée de 20 », « brique de 20 collée » |
| mur-beton-cellulaire-20 | Mur en béton cellulaire de 20 | m² | « Béton cellulaire de 20 », « Ytong 20 », « Siporex 20 », « Cellumat 20 » |
| beton-proprete | Béton de propreté sous semelles | m² | « Béton de propreté », « BP 5 cm », « béton maigre » |
| semelle-filante | Semelle filante en béton armé | ml | « Semelle filante 50×25 », « fondations BA », « rigole bétonnée armée » |
| dallage | Dallage béton armé sur terre-plein | m² | « Dallage béton armé 12 cm », « dalle béton ST25C », « dalle de garage », « dallage sur hérisson » |
| herisson | Hérisson en cailloux 20/40 sous dallage | m² | « Hérisson 20/40 », « hérisson », « cailloutis sous dallage » |
| film-sous-dallage | Film polyéthylène sous dallage | m² | « Film polyane », « film polyéthylène sous dallage », « polyane 150 µ » |
| plancher-poutrelles | Plancher poutrelles-entrevous et dalle de compression | m² | « Plancher poutrelles hourdis », « plancher hourdis », « poutrelles + entrevous », « plancher VS », « dalle de compression » |
| chainage | Chaînage horizontal en blocs U | ml | « Chaînage horizontal », « ceinture béton », « chaînage en blocs U », « chaînage BA » |
| enduit-monocouche | Enduit monocouche de façade | m² | « Enduit monocouche », « enduit gratté », « crépi », « enduit de façade projeté » |
| chape-ciment | Chape ciment | m² | « Chape ciment 5 cm », « chape traditionnelle », « chape mortier » |

## 3. Ratios

Blocs et briques : unités au m² de la fiche fabricant × (1 + perte). Mortier et colle : kg au m² de la fiche × 1,10. Béton :
volume au m² ou au ml × (1 + perte). Armatures préfabriquées : 6 m d'élément pour 5,50 m posés (recouvrement 0,50 m).

| Ouvrage | Fourniture | Ratio | Unité | Condition | Confiance | Source |
|---|---|---|---|---|---|---|
| mur-parpaing-20 | Bloc béton creux 50 × 20 × 20 | 10,5 | u | — | usuel | S1 |
| mur-parpaing-20 | Mortier de montage prêt à gâcher | 38,5 | kg | mortier=pret | usuel | S2 |
| mur-parpaing-20 | Ciment CEM II 32,5 | 6,93 | kg | mortier=chantier | à vérifier | S14 |
| mur-parpaing-20 | Sable 0/4 | 0,0297 | t | mortier=chantier | à vérifier | S14 |
| mur-parpaing-15 | Bloc béton creux 50 × 15 × 20 | 10,5 | u | — | usuel | S1 |
| mur-parpaing-15 | Mortier de montage prêt à gâcher | 28,875 | kg | mortier=pret | à vérifier | S2 |
| mur-parpaing-15 | Ciment CEM II 32,5 | 5,1975 | kg | mortier=chantier | à vérifier | S14 |
| mur-parpaing-15 | Sable 0/4 | 0,022275 | t | mortier=chantier | à vérifier | S14 |
| mur-parpaing-10 | Bloc béton creux 50 × 10 × 20 | 10,5 | u | — | usuel | S1 |
| mur-parpaing-10 | Mortier de montage prêt à gâcher | 19,25 | kg | mortier=pret | à vérifier | S2 |
| mur-parpaing-10 | Ciment CEM II 32,5 | 3,465 | kg | mortier=chantier | à vérifier | S14 |
| mur-parpaing-10 | Sable 0/4 | 0,01485 | t | mortier=chantier | à vérifier | S14 |
| mur-brique-rectifiee-20 | Brique rectifiée de 20 (type R20) | 8,4 | u | — | usuel | S3 |
| mur-brique-rectifiee-20 | Mortier joint mince pour brique rectifiée | 1,98 | kg | — | usuel | S3 |
| mur-beton-cellulaire-20 | Bloc béton cellulaire de 20 (62,5 × 25) | 6,592 | u | — | usuel | S4 |
| mur-beton-cellulaire-20 | Mortier-colle pour béton cellulaire | 4,4 | kg | — | usuel | S4 |
| beton-proprete | Béton de propreté | 0,055 | m³ | — | usuel | S10 |
| semelle-filante | Béton C25/30 | 0,088 | m³ | section_semelle=40x20 | usuel | S10 |
| semelle-filante | Béton C25/30 | 0,1375 | m³ | section_semelle=50x25 | usuel | S10 |
| semelle-filante | Béton C25/30 | 0,198 | m³ | section_semelle=60x30 | usuel | S10 |
| semelle-filante | Armature de semelle filante préfabriquée | 1,0909 | m | — | à vérifier | S9 |
| dallage | Béton C25/30 | 0,126 | m³ | epaisseur_dallage=12 | sûr | S5 |
| dallage | Béton C25/30 | 0,1575 | m³ | epaisseur_dallage=15 | sûr | S5 |
| dallage | Treillis soudé ST25C | 1,2203 | m² | — | usuel | S6 |
| herisson | Cailloux 20/40 | 0,2475 | t | epaisseur_herisson=15 | à vérifier | S11 |
| herisson | Cailloux 20/40 | 0,33 | t | epaisseur_herisson=20 | à vérifier | S11 |
| herisson | Cailloux 20/40 | 0,4125 | t | epaisseur_herisson=25 | à vérifier | S11 |
| film-sous-dallage | Film polyéthylène 150 µm | 1,15 | m² | — | usuel | S13 |
| plancher-poutrelles | Entrevous béton 16 (53 × 20) | 8,715 | u | type_entrevous=beton | usuel | S7 |
| plancher-poutrelles | Entrevous polystyrène 16 (1,20 m) | 1,4317 | u | type_entrevous=pse | usuel | S7 |
| plancher-poutrelles | Béton C25/30 | 0,0608 | m³ | type_entrevous=beton | usuel | S7 |
| plancher-poutrelles | Béton C25/30 | 0,0714 | m³ | type_entrevous=pse | usuel | S7 |
| plancher-poutrelles | Treillis de dalle de compression (PAF) | 1,0 | m² | — | usuel | S6 |
| chainage | Bloc U de chaînage de 20 | 2,1 | u | — | usuel | S1 |
| chainage | Armature de chaînage préfabriquée 4 HA10 | 1,0909 | m | — | à vérifier | S9 |
| chainage | Béton C25/30 | 0,022 | m³ | — | à vérifier | S10 |
| enduit-monocouche | Enduit monocouche | 22 | kg | — | usuel | S8 |
| chape-ciment | Ciment CEM II 32,5 | 15,4 | kg | epaisseur_chape=4 | à vérifier | S12 |
| chape-ciment | Ciment CEM II 32,5 | 19,25 | kg | epaisseur_chape=5 | à vérifier | S12 |
| chape-ciment | Ciment CEM II 32,5 | 23,1 | kg | epaisseur_chape=6 | à vérifier | S12 |
| chape-ciment | Sable 0/4 | 0,0704 | t | epaisseur_chape=4 | à vérifier | S12 |
| chape-ciment | Sable 0/4 | 0,088 | t | epaisseur_chape=5 | à vérifier | S12 |
| chape-ciment | Sable 0/4 | 0,1056 | t | epaisseur_chape=6 | à vérifier | S12 |

## 4. Conditionnements

Le béton prêt à l'emploi se commande au demi-mètre cube, les granulats à la demi-tonne : la contenance est le pas d'arrondi.

| Fourniture | Vendu en | Contenance | Unité | Confiance | Source |
|---|---|---|---|---|---|
| Bloc béton creux 50 × 20 × 20 | palette | 70 | u | usuel | S1 |
| Bloc béton creux 50 × 15 × 20 | palette | 80 | u | à vérifier | S1 |
| Bloc béton creux 50 × 10 × 20 | palette | 120 | u | usuel | S1 |
| Bloc U de chaînage de 20 | u | 1 | u | sûr | S1 |
| Brique rectifiée de 20 (type R20) | palette | 60 | u | sûr | S3 |
| Bloc béton cellulaire de 20 (62,5 × 25) | palette | 48 | u | sûr | S4 |
| Mortier de montage prêt à gâcher | sac | 35 | kg | sûr | S2 |
| Mortier joint mince pour brique rectifiée | sac | 25 | kg | à vérifier | S3 |
| Mortier-colle pour béton cellulaire | sac | 25 | kg | usuel | S4 |
| Ciment CEM II 32,5 | sac | 35 | kg | usuel | S12 |
| Sable 0/4 | t | 0,5 | t | usuel | S12 |
| Cailloux 20/40 | t | 0,5 | t | usuel | S11 |
| Béton de propreté | m³ | 0,5 | m³ | usuel | S10 |
| Béton C25/30 | m³ | 0,5 | m³ | usuel | S10 |
| Armature de semelle filante préfabriquée | élément | 6 | m | usuel | S9 |
| Armature de chaînage préfabriquée 4 HA10 | élément | 6 | m | usuel | S9 |
| Treillis soudé ST25C | panneau | 14,4 | m² | sûr | S6 |
| Treillis de dalle de compression (PAF) | panneau | 6,4 | m² | sûr | S6 |
| Film polyéthylène 150 µm | rouleau | 150 | m² | sûr | S13 |
| Entrevous béton 16 (53 × 20) | palette | 72 | u | usuel | S7 |
| Entrevous polystyrène 16 (1,20 m) | palette | 28 | u | sûr | S7 |
| Enduit monocouche | sac | 25 | kg | sûr | S8 |

## 5. Questions

| Clé | Question | Boutons | Ouvrages |
|---|---|---|---|
| mortier | Tu montes tes blocs avec quoi ? | Mortier prêt en sac=pret / Ciment et sable=chantier | mur-parpaing-20, mur-parpaing-15, mur-parpaing-10 |
| section_semelle | Tes semelles font quelle section ? | 40 × 20=40x20 / 50 × 25=50x25 / 60 × 30=60x30 | semelle-filante |
| epaisseur_dallage | Ton dallage fait quelle épaisseur ? | 12 cm=12 / 15 cm=15 | dallage |
| epaisseur_herisson | Ton hérisson fait quelle épaisseur ? | 15 cm=15 / 20 cm=20 / 25 cm=25 | herisson |
| type_entrevous | Tes entrevous sont en quoi ? | Béton=beton / Polystyrène=pse | plancher-poutrelles |
| epaisseur_chape | Ta chape fait quelle épaisseur ? | 4 cm=4 / 5 cm=5 / 6 cm=6 | chape-ciment |

## 6. Test permanent

Devis d'épreuve écrit à la main (synthétique, anonyme) : gros œuvre d'une maison de plain-pied de 10 × 12 m.

### Devis

| Ligne | Désignation | Quantité | Unité | Ouvrage |
|---|---|---|---|---|
| 1.1 | Fouilles en rigole et évacuation des terres | 12 | m³ | — |
| 1.2 | Béton de propreté sous semelles | 22 | m² | beton-proprete |
| 1.3 | Semelle filante en béton armé | 44 | ml | semelle-filante |
| 2.1 | Murs en blocs béton creux de 20 | 100 | m² | mur-parpaing-20 |
| 2.2 | Cloison en parpaing de 10 | 15 | m² | mur-parpaing-10 |
| 2.3 | Chaînage horizontal en blocs U | 44 | ml | chainage |
| 3.1 | Hérisson sous dallage | 96 | m² | herisson |
| 3.2 | Film polyane sous dallage | 96 | m² | film-sous-dallage |
| 3.3 | Dallage béton armé ST25C | 96 | m² | dallage |
| 4.1 | Enduit monocouche gratté | 110 | m² | enduit-monocouche |
| 4.2 | Chape ciment | 80 | m² | chape-ciment |
| 5.1 | Échafaudage et installation de chantier | 1 | ens | — |

### Bref

- Gros œuvre d'une maison de plain-pied : fondations en semelles filantes sur 44 ml avec béton de propreté.
- Murs en blocs béton de 20 sur 100 m², cloison en parpaing de 10 sur 15 m², chaînage en blocs U sur 44 ml.
- Dallage armé de 96 m² sur hérisson et film, enduit monocouche de 110 m², chape ciment de 80 m² ; fouilles et échafaudage hors commande.

### Questions attendues

- `mortier`
- `section_semelle`
- `epaisseur_herisson`
- `epaisseur_dallage`
- `epaisseur_chape`

### Réponses

- `mortier` = pret
- `section_semelle` = 50x25
- `epaisseur_herisson` = 20
- `epaisseur_dallage` = 12
- `epaisseur_chape` = 5

### Comptes attendus

Calculs : blocs de 20 100 × 10,5 = 1 050 u ÷ 70 ; blocs de 10 15 × 10,5 = 157,5 u ÷ 120 ; mortier 100 × 38,5 + 15 × 19,25 =
4 138,75 kg ÷ 35 ; béton C25/30 44 × 0,1375 + 44 × 0,022 + 96 × 0,126 = 19,11 m³ ; propreté 22 × 0,055 = 1,21 m³ ; armatures
44 × 1,0909 = 48 m ÷ 6 ; treillis 96 × 1,2203 = 117,1 m² ÷ 14,4 ; cailloux 96 × 0,33 = 31,68 t ; film 96 × 1,15 = 110,4 m² ;
enduit 110 × 22 = 2 420 kg ÷ 25 ; chape : ciment 80 × 19,25 = 1 540 kg ÷ 35, sable 80 × 0,088 = 7,04 t.

| Fourniture | Commande |
|---|---|
| Béton de propreté | 1,5 m³ |
| Béton C25/30 | 19,5 m³ |
| Armature de semelle filante préfabriquée | 8 éléments de 6 m |
| Bloc béton creux 50 × 20 × 20 | 15 palettes de 70 u |
| Bloc béton creux 50 × 10 × 20 | 2 palettes de 120 u |
| Mortier de montage prêt à gâcher | 119 sacs de 35 kg |
| Bloc U de chaînage de 20 | 93 u |
| Armature de chaînage préfabriquée 4 HA10 | 8 éléments de 6 m |
| Cailloux 20/40 | 32 t |
| Film polyéthylène 150 µm | 1 rouleau de 150 m² |
| Treillis soudé ST25C | 9 panneaux de 14,4 m² |
| Enduit monocouche | 97 sacs de 25 kg |
| Ciment CEM II 32,5 | 44 sacs de 35 kg |
| Sable 0/4 | 7,5 t |

## 7. À relire par un maçon

- Mortier fait sur chantier (18 L par m² de mur en blocs de 20, ciment 350 kg/m³, sable 1,5 t/m³) et mortier prêt au prorata de
  l'épaisseur pour les blocs de 15 et de 10 : ±20 % sur ciment, sable et sacs ; achètes-tu encore ciment et sable séparément ?
- Palettes entières : la fiche arrondit toujours à la palette (70 blocs de 20) ; un maçon qui prend le reliquat à l'unité sous
  une demi-palette commande moins.
- Recouvrement des armatures préfabriquées (0,50 m par élément de 6 m) et béton de chaînage en bloc U de 20 (0,02 m³/ml, + 10 %) :
  ±1 élément sur 40 ml, ±20 % sur le béton de chaînage.
- Surface utile d'un ST25C 6,00 × 2,40 (11,8 m² une fois les recouvrements faits) : ±1 panneau sur 60 m².
- Enduit monocouche à 20 kg/m² + 10 % : un enduit lourd (weberpral F, 22 à 28 kg/m²) en demande jusqu'à 30 % de plus.

## 8. Sources

- S1 : Fiches GGI (MC20L, BL20) et Fabemi, blocs béton creux NF EN 771-3 : 10 blocs au m² (50 × 20), palettes de 70 (de 20), 70 à 80 (de 15), 120 (de 10) ; bloc U 2 au ml ; perte 5 % : règle BatiClair du 3 octobre ; consultées le 3 octobre 2026.
- S2 : Vicat Mortier Pro 300 (fiche 06/2023) : 35 kg/m² de mur en blocs creux 20 × 20 × 50, sac de 35 kg ; perte 10 % ; prorata de l'épaisseur pour les blocs de 15 et de 10 : règle BatiClair, à vérifier.
- S3 : Wienerberger Porotherm R20 : 8 briques au m², palette de 60, joint mince ≈ 1,8 kg/m² ; perte 5 % ; consultée le 3 octobre 2026.
- S4 : Xella Ytong Verti 20 : 6,40 blocs au m², palette de 48, colle 4,0 kg/m² ; perte 3 % (blocs), 10 % (colle).
- S5 : NF DTU 13.3 partie 3 (dallage de maison individuelle ≥ 12 cm, armature 0,2 % → ST25C), cité par Knauf / Chausson et Eyrolles ; béton = surface × épaisseur + 5 %.
- S6 : ADETS, treillis ST25C 6,00 × 2,40 m = 14,40 m² ; Atout Pro, treillis PAF 3,60 × 2,40 m, surface utile 6,40 m² ; surface utile du ST25C 11,8 m² : règle BatiClair, à vérifier.
- S7 : Rector, entrevous béton EVB 16-20-53 (8,3 au m², 57,9 L de béton au m² en 16 + 4, palette 72 ou 84) et Rectosten coffrant 16 (1,39 au m², 65 à 71 L/m², palette 28) ; pertes 5 % et 3 %.
- S8 : weberpral TE et weberlite F : 18 à 20 kg/m² pour 12 à 15 mm, sac de 25 kg ; perte 10 %.
- S9 : Armatures préfabriquées NF AFCAB (fiche Weldom WAB) en éléments de 6 m ; recouvrement 0,50 m : règle BatiClair du 3 octobre, à vérifier.
- S10 : Béton prêt à l'emploi au 0,5 m³ (centrale BPE) ; béton de semelle = section × longueur + 10 % (fouille en terre) ; béton de propreté 5 cm + 10 % ; béton de chaînage 0,02 m³/ml de bloc U de 20 : à valider.
- S11 : Sorelest, densité des cailloux 20/40 ≈ 1,5 t/m³ en vrac ; tassement 10 % : règle BatiClair, à vérifier (même règle que la fiche terrassement).
- S12 : weber mortier (20 kg/m² par cm), dosage courant de chape 350 kg de ciment par m³ de sable, sable sec ≈ 1,6 t/m³, ciment en sac de 35 kg ; perte 10 % ; à vérifier.
- S13 : Film polyéthylène 150 µm sous dallage (NF DTU 13.3), rouleau 6 × 25 m = 150 m² : flyer CAPEB maçons (Frans Bonhomme) et Bricomarché, consultés le 19 octobre 2026 ; recouvrements et relevés 15 % : règle BatiClair.
- S14 : Mortier fait sur chantier : 18 L par m² de mur en blocs creux de 20, ciment 350 kg/m³, sable sec 1,5 t/m³, perte 10 % (référentiel du 3 octobre, ratio n° 2 à valider par un maçon).
