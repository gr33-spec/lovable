# 03 — Systèmes plaquiste : constitution, quantités au m², hauteurs, feu, acoustique

Recherche du 19-20 novembre 2026. Consignes : `_consignes.md`.

Avertissement méthode : les PDF placo.fr (fiches systèmes, « L'Intégrale Placo ») et plusieurs PDF fabricants
renvoient **HTTP 403** à WebFetch. Les valeurs Placo sont alors tirées des **extraits de moteur de recherche** de ces
PDF (signalé « extrait moteur »). Les pages HTML Siniat (carnets de pose DTU) sont lisibles directement.
Date de consultation de toutes les sources : 19/11/2026 sauf mention.

Abréviations : M48-35 = montant 48 mm, aile 35 mm ; « simples » = 1 montant à chaque entraxe ; « doublés » = 2 montants
accolés dos à dos (Siniat « accolés », Placo « doublés », DTU « jumelés ») ; H = hauteur limite.

---

## 1. Cloisons distributives (parement simple / double)

### 1.0 Règles DTU 25.41 (édition février 2022, en vigueur depuis le 1er mai 2022) qui conditionnent le système

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note |
|---|---|---|---|---|---|---|
| Édition en vigueur du NF DTU 25.41 | février 2022, applicable aux marchés à partir du 1er mai 2022 | — | [S3] Guide CAPEB NF DTU 25.41 nouveautés 2022, p. 5 | [S28] FFB, « publication nouveau NF DTU 25.41 » (extrait moteur) | confirmé (2 sources) | aucune édition plus récente trouvée au 19/11/2026 |
| Cas A (logements, bureaux, choc 60 J) : parement mini | 1 plaque (BA13, BA15, BA18 ou BA25) par face ; cloisons alvéolaires 50/60 mm | — | [S3] p. 9 (§ 5.2) | [S4] Siniat carnet de pose « cloison » (« parement simple … réservé aux logements ») | confirmé (2 sources) | → la 72/48 (1 BA13/face) n'est admise QU'EN CAS A |
| Cas B (ERP, parties communes…) : parement mini en plaques 1,20 m | 1 BA18 ou 2 BA13 ou 2 BA15 par face | — | [S3] p. 9 | [S7] fiche Siniat D98/48 dB (« cas B, choc de service 120 J ») ; [S20] Pladur note (5) | confirmé (2 sources) | → ERP / communs : 98/48 mini |
| Jeu en pied : montants et plaques coupés plus court que la hauteur | 1 | cm | [S4] Siniat carnet « cloison » | baticlair/docs/referentiels/platrerie-isolation.md (piste) + DTU cité par Siniat | 1 source fabricant | à recouper avec le texte DTU (non accessible) |
| Entraxe des vis sur montant (plaque 1,20) | 30 | cm max | [S4] Siniat carnet « cloison » | [S3] (plafonds multicouches : dernier parement vissé tous les 300 mm, premiers à 600 mm) | confirmé (2 sources) | vissage en quinconce interdit (Siniat) |
| Fixation des rails au support | tous les 60 cm (à plus de 5 cm du bord de dalle) | cm | [S4] Siniat carnet « cloison » | piste platrerie-isolation.md (« rails fixés tous les 60 cm », Placo) | 1 source fabricant | à confirmer sur doc Placo |
| Pose horizontale des plaques | interdite en parement simple ; admise en parement double hors exigence feu/acoustique | — | [S4] | — | 1 source | |
| Hauteur de référence | sol fini → plafond (sol brut si posée sur dalle brute) | — | [S5] Rockwool guide cloisons 12/2023 | [S3] p. 16 (alvéolaires) ; [S4] (note * : D72/48 2,50 m entre sol fini et plafond) | confirmé (2 sources) | |
| Rail haut vissé dans la plaque du plafond (vis bêchevetées), cloison cas A | hauteur ≤ 2,70 | m | [S3] p. 12 (§ 6.2.4.4.2) | — | 1 source (résumé DTU) | |

### 1.1 Hauteurs maximales des cloisons à simple ossature métallique, plaques largeur 1,20 m (NF DTU 25.41 2022)

« ] » = montants simples, « ][ » = montants doublés (accolés dos à dos). Valeurs en m.

| Cloison | Montant | Plaques par face | ] 0,60 | ][ 0,60 | ] 0,40 | ][ 0,40 | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| 72/48 | M48-35 | 1 BA13 | 2,50 | 3,05 | 2,75 | 3,40 | [S5] Rockwool (DTU 25.41 fév. 2022) | [S6] fiche Siniat D72/48 EI30 37 dB (2,5 / 3,05 / 2,75 / 3,4) ; [S20] Pladur 2019 (2,45 / 3,05 / 2,80 / 3,45) | confirmé (2 sources) | Le carnet Siniat [S4] dit 2,80 en ] 0,40 (ancienne valeur, la fiche système Siniat récente dit 2,75). 2,50 m = sol fini → plafond. |
| 72/48 | M48-50 | 1 BA13 | 2,55 | 3,20 | 2,95 | 3,60 | [S5] | [S4] Siniat carnet ; [S20] Pladur | confirmé (2 sources) | |
| 72/48 Placo « Stil ML 48-50 » | ML 48-50 | 1 BA13 | 2,60 | — | — | — | [S8] fiche solution Placo 72/48 BA13 EI30 39 dB 2,6 m (hébergée Proeco) | extrait moteur de [S9] Intégrale Placo (2,60 m colonne 72) ; [S10] fiche Placo sp00021554 (M48 : 2,50) | confirmé (2 sources) | Chez Placo, 2,60 m en simple 0,60 exige le montant ML 48-50 ; en M 48 (aile 35) c'est 2,50 m, comme le DTU. Le « 2,60 m » populaire vient de là (et du DTU bois 72 mm : 2,60). |
| 72/36 (rare) | M36-40 | 1 BA18 | — | 2,80 | 2,60 | 3,10 | [S5] | [S20] Pladur D72/36 BA18 (2,30 / 2,85 / 2,60 / 3,15) | contradiction (] 0,60 : DTU « — » = non admis ; Pladur 2,30 ; ][ 0,60 : 2,80 vs 2,85) | 72/36 = BA18 sur M36 ; quasi absent des négoces, à ne pas proposer par défaut |
| 98/48 | M48-35 | 2 BA13 | 3,00 | 3,70 | 3,40 | 4,15 | [S5] | [S4] Siniat carnet (3,00 / 3,75 / 3,40 / 4,15) ; [S20] Pladur (3,00 / 3,75 / 3,40 / 4,15) | confirmé (2 sources) sauf ][ 0,60 : contradiction 3,70 (Rockwool) / 3,75 (Siniat, Pladur) | retenir 3,70 (valeur la plus basse) à confirmer sur texte DTU. Placo sp00018909 : 98/48 2×BA13 M48 0,60 simple → 3,00 m (extrait moteur) |
| 98/48 | M48-50 | 2 BA13 | 3,10 | 3,85 | 3,55 | 4,30 | [S5] | [S4] ; [S20] | confirmé (2 sources) | |
| 98/48 Siniat dB (DTA) | M48-50 | 2 BA13 dB | 3,55 | 4,50 | 4,10 | 5,05 | [S7] fiche Siniat D98/48 dB EI60 50 dB | — | 1 source | hauteurs sous DTA CSTB 9/11-931*V3, pas DTU : plaque haute dureté |
| 98/62 (BA18 Twin) | M62-35 | 1 BA18 S Twin (plaques 0,90) | 3,60 (0,90) | 4,20 (0,90) | 4,20 (0,45) | 4,40 (0,45) | [S11] fiche Siniat D98/62 S Twin EI60 53 dB | [S20] Pladur D98/62 2×1 BA18 1,20 : 3,20 / 4,00 / 3,65 / 4,55 | 1 source par configuration | ce n'est pas une « 98/62 à 2 BA13 » : 98/62 = 1 BA18 par face sur M62. Configurations différentes (largeur 0,90 vs 1,20) |
| 100/70 | M70-50 | 1 BA15 | 3,55 | 4,45 | 4,05 | 5,05 | [S12] fiche Siniat D100/70 39 dB | [S20] Pladur D100/70 M70-37 BA15 : 3,40 / 4,30 / 3,90 / 4,85 | confirmé (2 sources) à l'aile près (50 vs 37 mm) | 100/70 = 1 BA15 par face, pas 2 BA13 |
| 106/70 | M70-50 | 1 BA18 | 4,00 | 5,05 | 4,60 | 5,60 | [S13] fiche Siniat D106/70 46 dB | [S20] Pladur D106/70 M70-37 : 3,50 / 4,45 / 4,05 / 5,00 | 1 source par aile | |
| 120/70 | M70-40 (Placo M70 = aile 40) | 2 BA13 | 3,90 | 4,90 | 4,45 | 5,40 | [S5] (M70/40) | [S20] Pladur D120/70 M70-37 : 3,85 / 4,85 / 4,45 / 5,35 ; [S4] Siniat M70-35 : 3,85 / 4,90 / 4,45 / 5,40 | confirmé (2 sources) | écart ≤ 5 cm selon aile 35/37/40. Aile M70 Placo = 40 mm : fiche produit Placo Montant Stil M 70 [S14] |
| 120/70 | M70-50 | 2 BA13 | 4,00 | 5,05 | 4,60 | 5,55 | [S4] Siniat carnet | — | 1 source | |
| 140/90 | M90-40 | 2 BA13 | 4,65 | 5,70 | 5,30 | 6,30 | [S5] | [S20] Pladur (4,65 / 5,65 / 5,25 / 6,25) ; [S4] Siniat M90-35 (4,60 / 5,70 / 5,25 / 6,25) | confirmé (2 sources) à 5 cm près | |
| 120/90 (= 1 BA15 sur M90) | M90-40 | 1 BA15 | 4,10 | 5,20 | 4,75 | 5,80 | [S20] Pladur D120/90 | [S4] Siniat D115/90 1 BA13 M90-35 : 3,90 / 4,95 / 4,50 / 5,50 | à confirmer (configurations voisines, pas identiques) | « 120/90 » n'existe pas chez Placo en standard ; ne pas proposer par défaut |
| 150/100 | M100-50 (DTU) / M100-40 (Pladur) | 2 BA13 | 5,10 | 6,20 | 5,75 | 6,85 | [S5] | [S4] Siniat (5,10 / 6,25 / 5,75 / 6,90) ; [S20] Pladur M100-40 (4,95 / 6,05 / 5,60 / 6,65) | confirmé (2 sources) à 5 cm près | |

Hauteurs de la variante bois (DTU 25.41 2022, montants bois) : 72 mm → 2,60 m (0,60) / 2,80 m (0,40) ; 98 mm → 3,00 / 3,30 m [S5] — 1 source.

**Règle de calcul proposée (hypothèse, à faire valider)** : pour la 72/48 en M48-35 (le montant courant en négoce,
fiche Placo Montant Stil M 48 aile 35 mm [S15]) : H ≤ 2,50 m → simples 0,60 ; 2,50 < H ≤ 2,75 → simples 0,40 ;
2,75 < H ≤ 3,05 → doublés 0,60 ; 3,05 < H ≤ 3,40 → doublés 0,40 ; au-delà → changer de système (98/48 ou 120/70).
Ordre doublés 0,60 / simples 0,40 : les deux tiennent 2,75 m ; simples 0,40 = 2,5 ml/m² contre 3,3 ml/m² en doublés 0,60
→ simples 0,40 moins cher. Statut : déduit des hauteurs confirmées ; choix économique = hypothèse.

### 1.2 Constitution, épaisseur, feu et acoustique des cloisons distributives

Ra (Placo) ≈ Rw+C (Siniat, Pladur) : même indice d'affaiblissement pondéré bruit rose.

| Système | Constitution | Épaisseur | Feu | Acoustique Rw+C / Ra | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|---|---|
| 72/48 standard | 1 BA13 + M48 0,60 + laine 45 mm + 1 BA13 | 72 mm | EI 30 | 39 dB (Placo, laine verre 45, PV CSTB AC99.016/1-B) ; 37 dB (Siniat, PV CSTB AC23-15896) ; 38 dB (Pladur) | [S8] Placo fiche solution (EI30, 39 dB, 22 kg/m²) | [S6] Siniat (EI30, PV Efectis EFR-24-005466, 37 dB) ; [S20] Pladur (38 dB, sans laine 31 dB) | confirmé (2 sources) pour EI30 ; acoustique 37 à 39 dB selon marque (contradiction expliquée : PV et laine différents) | Masse 22 kg/m² (Placo). Sans laine : 31 dB (Pladur) |
| 72/48 Placo Phonique / Siniat Wab | 1 plaque acoustique / face | 72 mm | — | 41-42 dB (CAPEB-Placo : 42 dB « 72/48 isolée » ; Siniat Wab 39-41 dB ; Pladur Fonic 41 dB) | extrait moteur capeb.fr partenaire Placo | [S16] fiche Siniat Wab D72/48 (39 dB, hauteurs 2,85/3,40/3,15/3,75) | à confirmer (produits différents) | |
| 98/48 | 2 BA13 + M48 0,60 + laine 45 + 2 BA13 | 98 mm | EI 60 | 47 dB (Placo sp00018909, laine PAR Phonic 45) ; 45 dB (Pladur laine minérale) ; 50-52 dB avec plaques acoustiques | [S17] Placo fiche sp00018909 (EI60, 47 dB, 3 m) — extrait moteur | [S20] Pladur D98/48 (EI 60, 45 dB, 39 dB sans laine) | confirmé (2 sources) pour EI60 ; 45-47 dB selon PV | |
| 98/48 Phonique | 2 Placo Phonique / face | 98 mm | EI 60 | 52 dB (Placo sp00011436) ; 50 dB (Siniat dB) | extrait moteur Placo sp00011436 | [S7] Siniat D98/48 dB (50 dB) | 1 source chacun | |
| 102/48 EI120 (Siniat) | 2 plaques feu / face | 102 mm | EI 120 | 47 dB | URL Siniat pi79225 (titre seul ; téléchargement refusé) | — | à confirmer | |
| 100/70 | 1 BA15 + M70 + laine 70 + 1 BA15 | 100 mm | — | 39 dB (Siniat) ; 41 dB (Pladur) | [S12] | [S20] | contradiction faible (PV différents) | |
| 120/70 | 2 BA13 + M70 + laine 70 (60 max DTU-Rockwool) + 2 BA13 | 120 mm | EI 60 (Pladur) | 47 dB laine (Pladur) | [S20] Pladur | — | 1 source | Placo 120/70 : à confirmer (fiches inaccessibles) |
| 140/90 | 2 BA13 + M90 + laine 85 + 2 BA13 | 140 mm | EI 60 | 48 dB (Pladur) | [S20] | — | 1 source | |
| Épaisseur d'isolant admise | 72/48 & 98/48 : 30 à 45 mm ; 120/70 : 30 à 60 ; 140/90 : 30 à 85 ; 150/100 : 30 à 100 | mm | — | — | [S5] Rockwool (tableau DTU) | [S6] Siniat 45 mm ; [S8] Placo 45 mm ; [S12] Siniat 100/70 : 70 mm | confirmé (2 sources) pour 45 mm en M48 | conseil Rockwool : épaisseur ≤ profondeur du montant (pas de pression sur les parements) |

### 1.3 Quantités indicatives pour 1 m² de cloison (une face mesurée, vides non déduits)

| Donnée | Valeur | Unité / m² de cloison | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note |
|---|---|---|---|---|---|---|
| Plaques, parement simple (72/48, 100/70…) | 2,10 | m² | [S8] Placo fiche solution 72/48 (2,10) | [S20] Pladur parement simple (2,1, « coefficient de perte de 5 % ») | confirmé (2 sources) | 2 faces + 5 % |
| Plaques, parement double (98/48, 120/70, 140/90) | 4,20 | m² | [S9] Intégrale Placo (extrait moteur : 4,2) | [S21] Pladur parement double (4,2) | confirmé (2 sources) | |
| Rail (R48/R70…) | 0,90 (Placo) ; 0,84 à H 2,50 m (Pladur) | ml | [S8] Placo (0,90) | [S20] Pladur (0,84 à 2,50 m ; 0,75 à 2,80 m ; 0,70 à 3,10 m) | confirmé (2 sources) ≈ 2 / H × 1,05 | Pladur montre que le rail dépend de H : préférer 2 × L × 1,05 (bas + haut) |
| Montants, simples 0,60 | 2,10 (Placo) ; 1,75 (Pladur) | ml | [S8] Placo (Stil ML 48-50, 2,10) | [S20] Pladur (1,75) | contradiction (Placo inclut, semble-t-il, montants d'about, d'huisserie et d'angle ; Pladur = 1/0,60 × 1,05) | à confirmer : l'app doit-elle ajouter les montants de rive/huisserie à part ? |
| Montants, simples 0,40 | 2,63 | ml | [S20] Pladur | — | 1 source | = 1/0,40 × 1,05 |
| Montants, doublés 0,60 | 3,70 (Placo) ; 3,50 (Pladur) | ml | [S9] Intégrale Placo (extrait moteur 3,7) | [S20] Pladur | contradiction faible (même écart que ci-dessus) | |
| Montants, doublés 0,40 | 5,25 | ml | [S20] Pladur | — | 1 source | |
| Vis TTPC 25, parement simple, montants 0,60 | 22 | u | [S8] Placo (22) | piste platrerie-isolation.md (22 à 0,60 ; 30 à 0,40, Intégrale Placo) | 1 source fabricant | Pladur annonce 41 vis PM : contradiction (Pladur compte peut-être vissage des 2 faces au pas de 25 cm ; raison non trouvée) |
| Vis TTPC 25, parement simple, montants 0,40 | 30 | u | piste Intégrale Placo (extrait) | — | à confirmer | |
| Vis TRPF 13 (montant/rail) | 2 | u | [S8] Placo | [S20] Pladur « vis MM » 0 à 3 | 1 source | |
| Vis parement double (98/48) | TTPC 25 (1er parement) + TTPC 35 (2e) | u | [S9] extrait moteur Intégrale (« 8 8 6 6 » colonnes illisibles) | [S21] Pladur double : 20 à 0,60 / 26 à 0,40 | à confirmer (extraction illisible) | |
| Bande à joint papier | 2,80 | ml | [S8] Placo (bande PP grand rouleau 2,80) | [S20] Pladur 3,50 (simple) / 3,27 (double) | contradiction (2,8 vs 3,3-3,5 : Pladur compte les angles et cueillies d'un logement de 100 m²) | |
| Enduit joint poudre (PR4) | 0,66 | kg | [S8] Placo | [S20] Pladur 0,7 kg | confirmé (2 sources) ≈ 0,7 kg | prêt à l'emploi : 0,94 kg (Placo, extrait moteur) |
| Isolant (laine 45 mm) | 1,05 | m² | [S8] Placo (1,05) | Pladur ne donne pas | 1 source | ≈ 1 m² + 5 % |

### 1.4 Cloisons alvéolaires et carreaux de plâtre

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|
| Cloison alvéolaire 50 mm (BA10 + alvéoles), hauteur max | 2,60 | m | [S3] CAPEB/DTU 2022 p. 16 | — | 1 source | locaux EA, EB, EB+ privatifs seulement ; panneaux 0,60 ou 1,20 × 2,50-2,70 |
| Cloison alvéolaire 60 mm, hauteur max | 3,00 | m | [S3] | — | 1 source | |
| Placopan / Prégy alvéolaire encore vendus ? | — | — | — | — | à confirmer (non vérifié) | hors priorité ; ne pas proposer par défaut |
| Carreaux de plâtre | relèvent du NF DTU 25.31, pas du 25.41 | — | [S3] p. 8 | — | 1 source | hors périmètre plaquiste sur ossature ; non chiffré ici |

---

## 2. Cloisons séparatives (SAA, SAD, séparatif de logements)

### 2.1 Exigence réglementaire

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|
| Isolement aux bruits aériens entre une pièce principale et un local d'un autre logement (logement neuf, PC déposé après le 1/1/2000) | DnT,A ≥ 53 | dB | [S30] Légifrance, arrêté du 30 juin 1999 (art. 2), extrait moteur | [S31] FFB « exigences acoustiques logements collectifs neufs » ; [S32] AIDA-Ineris (texte consolidé) | confirmé (2 sources) | DnT,A mesuré en œuvre ≠ Rw+C labo : prévoir une cloison de Rw+C nettement supérieur (transmissions latérales). Tolérance de mesure 3 dB. |
| Idem, local reçu = cuisine ou salle d'eau | DnT,A ≥ 50 | dB | [S30] | [S32] | confirmé (2 sources) | garage individuel : 55 / 52 ; local d'activité : 58 / 55 dB |
| Choix d'une cloison séparative de logement | Rw+C labo ≥ ~58-60 dB, en pratique SAA 120 (56-57) à SAD 160/180 (60-67) | dB | — | — | à confirmer (règle de métier, aucun chiffre fabricant « minimum » trouvé) | ne PAS déduire un système du seul 53 dB : c'est l'étude acoustique / le CCTP qui fixe le système ; l'app reprend le système écrit au devis |

### 2.2 Systèmes séparatifs

| Système | Constitution | Épaisseur | Hauteur max | Feu | Rw+C / Ra | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|---|---|---|
| Placostil SAA 120 (ossature alternée) | 2 BA13 / face ; montants M48 alternés (décalés) sur rail R70 ; laine 70 mm | 120 mm | 2,75 m (M48 0,60) ; 3,00 m (M48 doublés 0,40) | EI 60 | 56 dB (BA13 / Activ'Air, laine 70) | extrait moteur fiches Placo sp00020723 / sp00021607 / sp00011594 | — (pas d'équivalent Siniat « alterné » trouvé) | 1 source (extraits moteur, fiches non ouvrables) | « ossature alternée » : les montants d'une face ne touchent pas l'autre face → rail plus large (R70) que les montants (M48) |
| Placostil SAA 160 | 2 BA13 / face, M70 ou M90 alternés | 160 mm | 4,05 m (M90 doublés 0,60) | EI 60 | 61 dB (Activ'Air, M70 0,40) | extrait moteur Placo (« SAA160 … Stil M 70 - 0,4 - Simple - EI60 - 61 dB ») | — | 1 source | |
| Placostil SAD 160 (ossature double) | 2 BA13 / face, 2 ossatures M48 indépendantes, laine | 160 mm | 2,55 m (M48 0,40) ; 2,75 m (M48 doublés 0,60) | EI 60 | à confirmer (≈ 60-65 dB, non lu) | extrait moteur Placo (2,55 / 2,75, EI60) | — | 1 source pour la hauteur ; acoustique à confirmer (fiche non ouvrable) | SAD : deux demi-cloisons indépendantes, souvent entretoisées par goussets en tête si hauteur > 2,60 m (à confirmer) |
| Placostil SAD 180 | idem, vide plus large | 180 mm | à confirmer | EI 60 | à confirmer | — | — | à confirmer (aucune fiche lue) | |
| Siniat Prégymétal S180 (double ossature) | 2 BA13 / demi-cloison, M90-50, laine | 180 mm | ] 0,60 : 3,55 ; ][ 0,60 : 4,20 ; ] 0,40 : 3,90 ; ][ 0,40 : 4,65 | EI 60 | 60 dB | [S33] fiche Siniat S180 EI60 60 dB (pi79436) | — | 1 source | « deux demi-cloisons indépendantes … 2 plaques vissées sur une même face de l'ossature » |
| Siniat S180 2+3 BA13 | 2 BA13 d'un côté, 3 de l'autre, M48-50, laine 85 | 180 mm | ][ 0,60 : 2,95 ; ][ 0,40 : 3,25 | EI 60 | 63 dB | [S34] fiche Siniat pi80743 | — | 1 source | |
| Siniat S195 3+3 BA13 | 3 BA13 / face, M90-50, laine 85 | 195 mm | ] 0,60 : 3,95 ; ][ 0,60 : 4,00 ; ][ 0,40 : 4,50 | EI 120 | 65 dB | [S35] fiche Siniat pi80741 | — | 1 source | |
| Siniat S205 3+3 BA13 | 3 BA13 / face, M48-35, laine 85 | 205 mm | ][ 0,60 et 0,40 : 3,00 | EI 120 | 67 dB | [S36] fiche Siniat pi80750 | — | 1 source | |
| Siniat S140 Twin Up (BA18 S largeur 0,90) | 1 BA18 / demi-cloison, M48-35, laine 90 | 140 mm | ] 0,45 : 2,80 ; ][ 0,90 : 2,80 ; ][ 0,45 : 3,35 | EI 60 | 61 dB | [S37] fiche Siniat pi790367 | — | 1 source | plaque 0,90 m : entraxes 0,45 / 0,90 |
| Siniat S180 Twin BA25 S | 1 BA25 / demi-cloison, M70-50, laine 120 | 180 mm | ] 0,90 : 3,30 ; ][ 0,90 / ] 0,45 : 3,95 ; ][ 0,45 : 4,70 | EI 60 | 67 dB | [S38] fiche Siniat pi79421 | — | 1 source | |

**À retenir pour l'app** : un devis « cloison séparative » ou « SAA / SAD » donne presque toujours le système ; l'app
ne choisit pas. Quantitatif d'une SAD = 2 × (rails + montants) d'une demi-cloison + 4 faces de plaques si 2 plaques
par face (8,4 m²/m² avec 5 % de chute, par analogie avec le 4,2 du parement double — à confirmer) + 2 couches de laine
si demandé. Statut : à confirmer (aucun quantitatif fabricant SAA/SAD lu).

---

## 3. Parement double (98/48, 120/70, 140/90)

Voir tableaux 1.1 (hauteurs), 1.2 (feu / acoustique) et 1.3 (quantités : 4,2 m² de plaques / m²). Compléments :

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|
| Parement double obligatoire en cas B (ERP, communs) avec plaques de 1,20 m | 2 BA13 (ou 1 BA18) par face | — | [S3] § 5.2 | [S7] Siniat | confirmé (2 sources) | |
| Joints du 1er parement | décalés par rapport au 2e ; 1er parement non jointoyé (plafonds multicouches) | — | [S3] p. 12 (plafonds) | — | 1 source | pour les cloisons : à confirmer (règle d'usage : 1er parement sans bande, joints décalés) |
| Vis : 1er parement TTPC 25, 2e parement TTPC 35 | — | — | extrait moteur Intégrale Placo | piste platrerie-isolation.md | à confirmer | Placo indique TTPC 25 pour 13 mm + 10 mm d'acier ; TTPC 35 pour 2 × 13 mm |
| 98/48 EI 60 | EI 60 | — | [S17] Placo sp00018909 | [S21] Pladur | confirmé (2 sources) | |
| 98/48 avec plaques feu (Placoflam / Pladur N / Fonic) | EI 90 à EI 120 | — | [S21] Pladur (EI 120 avec Fonic) | URL Siniat D102/48 EI120 (titre) | à confirmer | dépend du PV ; jamais déduit, toujours lu au devis |

---

## 4. Doublages

### 4.1 Doublage collé au mortier adhésif (complexes plaque + isolant, NF DTU 25.42 ; plaque seule NF DTU 25.41)

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|
| Consommation de mortier adhésif, doublage isolant collé | 1,8 | kg/m² | [S40] fiche produit Siniat Prégycolle 120 (« Consommation 1,8 kg/m² », 01/09/2026) | extrait moteur brochures Placo Placotherm+ / Placomur DuoPass (« 1,8 kg de MAP Formule+ par m² de mur ») ; piste platrerie-isolation.md | confirmé (2 sources) | |
| Idem, valeur Pladur (complexe Isopop) | 2,5 | kg/m² | [S41] Mémento Pladur 2017 p. 75 | — | contradiction (2,5 vs 1,8) | Pladur ancien (2017) et autre colle ; garder 1,8 |
| Consommation « minimum » indiquée sur la fiche produit MAP Formule+ | 2 à 3 | kg/m² | [S42] fiche technique Placo MAP Formule+ 25 kg, mise à jour 28/05/2025 (hébergée BigMat) | extrait moteur fiches MAP 5 kg / 10 kg (même 2 à 3) | confirmé (2 sources) — mais usage générique | contradiction apparente avec 1,8 : la fiche produit couvre tous usages (plaques seules, murs irréguliers) ; le système doublage isolant dit 1,8. Hypothèse : 1,8 kg/m² pour un complexe, 2,5 pour une plaque seule sur mur irrégulier — à confirmer |
| Plots : diamètre | ≈ 10 | cm | [S43] Siniat carnet « doublage isolant collé » | extrait moteur fiche Placo MAP 5 kg (« plots de 10 cm de diamètre ») | confirmé (2 sources) | épaisseur du plot ≈ 15 mm (Siniat) |
| Plots : densité, isolant PSE | 10 | plots/m² | extrait moteur fiche Placo MAP 5 kg | [S43] Siniat (1 plot tous les 30 cm en largeur × 40 cm en hauteur ≈ 8 à 10/m² avec les rives) | confirmé (2 sources) | |
| Plots : densité, isolant laine minérale | 15 plots/m² sur bandes de mortier dilué (pré-encollage) | plots/m² | extrait moteur fiche Placo MAP 5 kg | eduscol (dossier examen, 15/m²) | 1 source fabricant | |
| Jeu en pied (cales) | 1 | cm | [S43] Siniat | — | 1 source | |
| Planéité support : sans serrage / serrage / entaillage isolant | 0-5 mm / 5-10 mm / > 10 mm (règle de 2 m) | mm | [S43] Siniat | — | 1 source | béton neuf : irrégularités ≤ 15 mm |
| Hauteur : superposition de panneaux | au-delà de 2,50 m (selon longueurs de complexes disponibles) | m | [S43] Siniat | — | 1 source | |
| Hauteur entre tasseaux bois, habitation (PSE) | 3,60 | m | [S41] Pladur (renvoi NF DTU 25.42 P1-1 art. 6.3.3) | [S43] Siniat (« tasseau de bois si HSP > 3,60 m ») | confirmé (2 sources) | tasseau 50 mm × épaisseur d'isolant |
| ERP, doublage PSE collé : hauteur entre tasseaux / totale | 3 / 4 | m | [S41] Pladur (Guide ERP, arrêté 6/10/2004) | — | 1 source | parement mini BA13 en ERP, BA10 en habitation |
| Support | mur nu (ni peint ni tapissé), sain ; plâtre neuf sec ; pas de collage plaque sur plaque | — | [S43] Siniat | [S3] CAPEB (« suppression du collage direct plaque/plaque », DTU 2022 § 6.1.3.3) | confirmé (2 sources) | |
| Quantités par m² (Pladur) | complexe 1,05 m² ; bande 1,75 ml ; enduit 0,35 kg | /m² | [S41] Pladur p. 75 | piste Placo (1,05 m² de doublage collé, extrait moteur Placotherm) | confirmé (2 sources) pour 1,05 m² ; 1 source pour bande/enduit | |
| Pièces humides | parement hydrofugé obligatoire en SdB ; jeu en pied calfeutré laine + mastic souple 1 cm | — | [S43] Siniat | [S3] (EB+ privatifs : H1) | confirmé (2 sources) | |

### 4.2 Contre-cloison sur montants (autoportante, sans appui) et avec appuis

| Donnée | Valeur (m) | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|
| M48-35, entraxe 0,60, 1 BA13 : simples / doublés | 2,00 / 2,40 | [S44] Rockwool guide murs par l'intérieur (07/2024, tableau DTU) | [S41] Pladur 2017 p. 78 (2,00 / 2,40) | confirmé (2 sources) | |
| M48-50, 0,60, 1 BA13 | 2,15 / 2,55 | [S44] | [S41] (2,15 / 2,55) | confirmé (2 sources) | |
| M70-35 (Rockwool) / M70-37 (Pladur), 0,60 | 2,50 / 3,00 (Rockwool) ; 2,55 / 3,05 (Pladur) | [S44] | [S41] | confirmé (2 sources) à 5 cm près | |
| M70-50, 0,60 | 2,70 / 3,20 | [S44] | — | 1 source | |
| M90-35 / M90-40, 0,60 | 2,90 / 3,45 (Rockwool M90/35) ; 2,95 / 3,55 (Pladur M90-40) | [S44] | [S41] | confirmé (2 sources) à 5-10 cm près | |
| M90-50, 0,60 | 3,10 / 3,70 | [S44] | — | 1 source | |
| M100-50 (Rockwool) / M100-40 (Pladur), 0,60 | 3,30 / 3,90 ; 3,15 / 3,75 | [S44] | [S41] | confirmé à l'aile près | |
| M48-35, entraxe 0,40, 1 BA13 | 2,25 / 2,65 | [S41] Pladur | — | 1 source | |
| M48-35, 0,60, 2 BA13 | 2,30 / 2,75 | [S41] Pladur | — | 1 source | |
| Épaisseur isolant entre/derrière montants M48 | 30 à 50 mm (M48) ; 30 à 70 (M70) ; 30 à 85 (M90) | [S44] | — | 1 source | |
| Contre-cloison sur montants AVEC appuis intermédiaires (montants 0,60, appuis tous les 1,50 m max) | jusqu'à 6 m (Rockwool) ; jusqu'à 7 m (DTU 2022 résumé CAPEB) | [S44] | [S3] p. 15 (§ 6.4.1) | contradiction (6 vs 7 m : Rockwool reprend sans doute l'ancienne limite) | hors usage courant logement |
| Siniat Sinemax (montants M48-35 + liaisons, 2 BA18) | 1er appui à 10 cm du sol, 2e à 1,50 m ; jusqu'à 12,55 m | [S45] fiche Siniat contre-cloison Sinemax | — | 1 source | système sous DTA |

Quantités Pladur pour 1 m² de contre-cloison sur montants (pertes 5 % comprises) [S41] — 1 source (Pladur 2017) :
1 BA13, H 2,50, M48 simples 0,60 : plaque 1,05 m² ; rail 0,84 ml ; montant 1,75 ml ; vis 25 mm 26 ; vis MM 2 ; enduit 0,35 kg ; bande 1,75 ml.
1 BA13, H 3,00, doublés 0,60 : rail 0,70 ; montant 3,50 ; vis 34 ; bande 1,63. 2 BA13 : plaques 2,10 m², vis 25 mm 13 + 35 mm 26.

### 4.3 Doublage sur fourrures F530 / T-45 avec appuis intermédiaires (Placo Optima, Siniat Clipstar S47, Pladur)

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|
| Entraxe des fourrures verticales | 0,60 | m | [S41] Pladur p. 86 | [S44] Rockwool (fourrures + appuis) ; piste Intégrale Placo 2021 (F530 0,60) | confirmé (2 sources) | |
| Hauteur max avec UN appui à mi-hauteur (≤ 1,35 m du sol) | 2,70 | m | [S44] Rockwool (2,70 m ; appui à 1,35 m max) | [S41] Pladur (2,70 m ; appuis à 1,35 m) | confirmé (2 sources) | |
| Hauteur 4,50 m : appuis à 1,30 et 2,60 m | 4,50 | m | [S41] Pladur | [S3] DTU 2022 : « jusqu'à 5,30 m avec plusieurs appuis » | confirmé (2 sources) que > 2,70 m exige ≥ 2 appuis ; plafond 5,30 m (DTU 2022) | |
| Appuis intermédiaires par m² (Pladur, H 2,50-2,70) | 1 | u/m² | [S41] Pladur | piste Intégrale Placo 2021 : 2 appuis/m² (extrait, jugé élevé par la piste) | contradiction (1 vs 2) | géométrie : 1 ligne d'appuis à 1,35 m, 1 appui par fourrure → 1/0,60 ≈ 1,7 appui par ml de mur, soit 0,67/m² à H 2,50. Placo compte peut-être l'entretoise + l'appui. À confirmer |
| Fourrure par m² | 1,75 (Pladur) ; 2,5 (Placo, avec lisses horizontales du chevêtre/appui, extrait piste) | ml | [S41] | piste Intégrale Placo 2021 (2,5) | contradiction (système Placo : fourrure horizontale de fixation des appuis comptée) | Optima : une fourrure horizontale fixée au mur porte les appuis → 1/0,60 + 1/H ≈ 2,07 + pertes |
| Rail (rail clip / F530 haut et bas) | 0,84 (H 2,50) ; 0,78 (H 2,70) | ml/m² | [S41] | piste Placo 1,1 ml/m² | contradiction faible | |
| Vis plaque | 26 (H 2,50) ; 20 (H 2,70) | u/m² | [S41] | — | 1 source | |
| Appuis Optima2 Isover : longueurs selon épaisseur de laine | 75 (75-85 mm), 100 (85-100), 120 (100-120), 140 (120-140), 75-160 réglable ; boîte de 50 (40 pour 75-160) | — | [S46] fiche Isover Appui Optima2 (hébergée generadordeprecios) | — | 1 source | conditionnement utile au comptoir |

---

## 5. Plafonds

### 5.1 Plafond sur fourrures F530 et suspentes (Placostil F530, Prégymétal S47, Pladur T-45)

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|
| Entraxe des fourrures, isolant < 6 kg/m² | 0,60 | m | [S47] Intégrale Placo 04/2023 Plafonds p. 101 | [S48] Siniat carnet « plafond » (« entraxe courant 60 cm, suspentes tous les 1,20 m ») ; [S41] Pladur | confirmé (2 sources) | |
| Entraxe fourrures, isolant 6 à 10 kg/m² | 0,50 | m | [S47] | [S48] (« réduit à 50 cm pour un isolant de 6 à 10 kg/m² ») ; [S41] Pladur (BA13 + 10 daN/m² : 0,50) | confirmé (2 sources) | |
| Entraxe fourrures, isolant 10 à 15 kg/m² | 0,40 | m | [S47] | [S48] tableau (15 kg/m² possible à 0,40 avec suspentes 1,15-1,20 m) | confirmé (2 sources) | Siniat admet aussi 0,60 avec 15 kg/m² en réduisant la distance entre suspentes à 1,00 m (BA13) |
| Poids max d'isolant posé sur le plafond | 15 | kg/m² | [S47] (colonnes « entre 10 et 15 ») ; Isonat max 15 kg/m² | [S48] (charges de référence 6, 10, 15 kg/m²) | confirmé (2 sources) | exemples Siniat : 400 mm laine de verre 12 kg/m³ = 4,8 kg/m² ; 280 mm laine de roche soufflée 50 kg/m³ = 14 kg/m² |
| Distance entre suspentes | 1,20 | m | [S47] | [S48] ; [S41] Pladur (1,20 en BA13 + 6 daN/m²) | confirmé (2 sources) | à réduire si plaques lourdes / isolant lourd (tableaux Siniat : 0,80 à 1,20) |
| Plaques posées parallèlement aux fourrures, ou plaques hydrofugées (Placo) | entraxe 0,40 | m | [S47] p. 104 | [S48] (« plaques parallèles à l'ossature : 40 cm ») | confirmé (2 sources) | Siniat : hygrométrie > 80 % → 0,50 max ; Placo : plaque hydro → 0,40 (contradiction de détail : Placo plus sévère) |
| Rail ou cornière de rive : fixation | tous les 0,60 m max | m | [S47] p. 103 (« nouveauté DTU 25.41 ») | [S48] (trait de référence, rail ou cornière) | 1 source pour l'entraxe | |
| 1re suspente / 1re fourrure si rive non fixable | ≤ 0,10 m du mur | m | [S3] p. 13 | — | 1 source | |
| Vissage des plaques | tous les 0,30 m (0,15 m en montage PRF feu) | m | [S47] | [S48] | confirmé (2 sources) | |
| Fixation d'une suspente sous bois | 2 vis TTPC 35 | u/suspente | [S47] p. 101 | extrait moteur fiche Placo Maxi Stil F530 (« 2 vis TTPC 35 par suspente ») | 1 source fabricant (même éditeur) | sous dalle béton : cheville métallique Ø 6 + tige/tendeur (Placo) |
| Charge admissible par suspente (courte/longue/maxi F530) | 38 | kg | [S47] | — | 1 source | poids admissible du plafond 55 kg/m² ; cavalier : 55 kg / 76 kg/m² |
| Joints de fractionnement | tous les 300 m² ou 25 ml | — | [S47] p. 105 | — | 1 source | |
| Plafond interrompu au droit d'une cloison | si Ra cloison > 45 dB | — | [S47] p. 104 | — | 1 source | → cloisons séparatives montées avant plafond |
| Charge ponctuelle de dimensionnement (accessoires) | 2 daN par 1,20 × 1,20 m | — | [S47] p. 105 (« conformément au DTU 25.41 ») | — | 1 source | |

**Quantités pour 1 m² de plafond (jointoyé avec bande)**

| Article | Entraxe 0,40 | 0,50 | 0,60 | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|---|
| Plaque (simple parement) | 1,05 m² | 1,05 | 1,05 | [S47] p. 105 | [S41] Pladur p. 94 (1,05) | confirmé (2 sources) | double parement 2,1 |
| Fourrure F530 | 3 ml | 2,2 | 2 | [S47] | [S41] Pladur T-45 0,60 : 1,75 ; 0,50 : 2,10 | contradiction (0,60 : 2,0 vs 1,75) | théorie 1/0,60 = 1,67 ; Placo compte éclissage et chutes de rive. Retenir Placo (fabricant du produit vendu) — à confirmer |
| Suspentes | 2,7 u | 2,2 | 1,8 | [S47] | [S41] Pladur 0,60 / 1,20 m : 1,46 ; 0,50 : 1,75 | contradiction (1,8 vs 1,46) | théorie 1/(0,60 × 1,20) = 1,39. Écart = suspentes de bout de fourrure. Retenir 1,8 (Placo) — à confirmer |
| Vis TTPC 25 (1 BA13) | 15 | 12 | 10 (10-23 en montage feu) | [S47] | [S41] Pladur 8 vis 25 mm (0,60) | contradiction faible (8 vs 10) | |
| Vis, double parement (1er / 2e) | 5 / 15 | 4 / 12 | 3 / 10 | [S47] | [S41] Pladur 2 BA13 : 4 × 25 mm + 9 à 14 × 35 mm | confirmé à l'ordre de grandeur | 2e parement : vis TTPC 35 |
| Bande | 1,4 ml | 1,4 | 1,4 | [S47] | [S41] Pladur 2,51 | contradiction (1,4 vs 2,51 : Pladur inclut les cueillies périphériques, pièce 1,5 : 1) | |
| Enduit poudre / prêt à l'emploi | 0,33 kg / 0,47 kg | idem | idem | [S47] | [S41] Pladur 0,35 kg | confirmé (2 sources) | |
| Cornière / rail de rive | « selon chantier » | | | [S47] | [S41] Pladur 0,44 ml/m² (pièce rectangulaire 1,5 : 1) | 1 source chiffrée | calculer au périmètre réel |
| Montage PRF feu : entretoises PRF | — | — | 2,6 u | [S47] | — | 1 source | |

### 5.2 Plafond sur montants (autoportant) et sur ossature primaire / secondaire

| Donnée | Valeur | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|
| Plafond sur montants Stil (M48 à M150) : montant simple / doublé | 2 / 4 ml/m² ; vis 10 (1 plaque) ; bande 1,4 ; enduit 0,33 | [S47] p. 108-109 | [S41] Pladur montants 48/35 0,60 : portée max 1,85 m (BA13, isolant 6 daN/m²), 70/40 : 2,35 m ; 90/40 : 2,70 m | 1 source pour les quantités | portées à lire dans le tableau Placo p. 108 (non extrait ici) |
| Stil Prim 100 (primaire 1,20 m) + F530 (secondaire 0,60) | profilé primaire 1 ml/m² ; suspente ¼ de tour 0,3/m² ; F530 2 ml/m² ; vis TRPF 1 | [S47] p. 133 | — | 1 source | équivalent Knauf D112 (CD60 + UD) : à confirmer (doc Knauf inaccessible, 403) |
| Stil Prim Tech (longues portées) | profilé 0,88 ml/m² ; suspente 0,20 ; F530 1,75 ml ; entretoise 1,75 ml | [S47] p. 123 | — | 1 source | |

### 5.3 Plafond fixé directement sous solives bois

| Donnée | Valeur | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|
| NF DTU 25.41 2022 : dimensionnement des ossatures bois de plafond | supprimé (« Suppression des ossatures bois », § 6.2.2.2.2) | [S3] p. 12 | — | à confirmer (lecture du texte DTU nécessaire) | conséquence probable : une BA13 vissée directement sous solives sort du cadre DTU ; Placo ne publie de pose directe sous bois que pour Gyplat (plaque à enduire) |
| Gyplat (Placo) pose directe sous solivage bois | solives ≥ 75 mm de large, entraxe ≤ 500 mm, planéité ≤ 5 mm/2 m ; 20 vis TTPC ou 25 clous ou 30 agrafes /m² ; isolant ≤ 7 kg/m² (Gyplat 400) / 5,5 (600) | [S47] p. 141-143 | — | 1 source | produit de niche ; ne pas généraliser à la BA13 |
| BA13 vissée sous solives, entraxe 0,50 / 0,60, vis TTPC 35 | — | — | — | à confirmer (aucune source fabricant en vigueur trouvée) | défaut prudent : passer par fourrures F530 sur suspentes ou cavaliers |

### 5.4 Plafonds sous rampants

| Donnée | Valeur | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|
| Rampants : mêmes ossatures F530 + suspentes ; têtes de suspentes avec butées résilientes en région ventée | — | [S47] p. 101 note (1) | [S3] p. 12 (combles aménagés : isolant + pare-vapeur selon NF DTU 45.10 / 45.11) | 1 source par point | |
| Feu sous rampants | uniquement montages validés selon l'Annexe nationale Eurocode 5 | [S47] p. 88 note (1) | — | 1 source | |
| Suspentes Intégra 2 (Isover) : quantités | — | — | — | à confirmer (doc Isover inaccessible 403 ; recherche web épuisée) | piste : 1,8/m² comme F530 |
| Rampants en EB+ : plaques H1 sous 1,80 m du sol fini | 1,80 m | [S3] p. 17 | — | 1 source | |

### 5.5 Feu des plafonds sous plancher bois (Placostil F530) [S47] p. 88

REI 15 : 1 BA13 ; REI 30 : 1 Placoflam BA15, ou 1 BA18, ou 2 BA13 ; REI 60 : 2 BA18 ou 3 Placoflam BA15
(montage standard) — en montage PRF : REI 30 1 Lisaflam BA15 (PV RS 16-038), REI 60 2 Placoflam BA13 (PV RS 16-039).
Pladur (calcul NF EN 1995-1-2) : durée de protection 1 BA13 21 min ; 2 BA13 38 min ; 1 BA18 36 min ; 2 BA18 61 min [S41].
Statut : 1 source par fabricant ; cohérents (2 BA13 ≈ 30 min). Toujours lire le PV exigé au devis.

---

## 6. Gaines techniques, coffrages, habillages

| Donnée | Valeur | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|
| Gaine technique verticale Pladur : constitution | 2 BA13 (N ou H1) sur M48-35 accolés, laine entre ossatures ; dimensions intérieures 200 × 200 à 1 250 × 1 000 mm ; hauteur entre planchers ≤ 3,00 m ; 2 à 4 faces | [S41] p. 90 | [S50] Siniat gaine D72/48 (1 BA13/face, M48-35 accolés 0,40, H 3,40 m, CFT) | confirmé (2 sources) pour le principe (ossature accolée) | |
| Feu gaine Pladur | EI 30 ve (i→o), EI 60 ve (o→i) ; CF de traversée 1 h 30 (PV Efectis EFR 15-003081) | [S41] | [S50] Siniat « CFT » | 1 source chiffrée | |
| Traitement des joints à l'intérieur des gaines | non réalisé (DTU 2022 § 6.1.4.2.6) | [S3] p. 10 | — | 1 source | |
| Quantités Pladur par ml de gaine 200 × 200, 2 faces, H 2,60 | plaque 2,18 m² ; rail 0,84 ml ; montant 10,92 ml ; vis 25 mm 20 + 35 mm 58 ; vis MM 17 ; enduit 2,01 kg ; bande 9 ml ; isolant 1,09 m² | [S41] p. 91 | — | 1 source | 400 × 400 3 faces H 2,50 : plaque 6,30 m² ; montant 15,75 ml ; bande 13 ml |
| Gaine Siniat Prégyfaylite BA50 + contre-cloison 1 BA13 Flam | H 2,60 m ; CFT ; 46 dB | [S51] fiche Siniat | — | 1 source | |
| Coffrage / soffite / encoffrement IPN, habillage de conduit | — | — | — | à confirmer (aucune doc lue) | piste : développé 0,60 m/ml par défaut (platrerie-isolation.md) — non sourcé |
| Knauf Shaftwall | — | — | — | à confirmer (site Knauf 403) | |

---

## 7. Ouvrages coupe-feu et acoustiques (points de vigilance)

| Donnée | Valeur | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|
| Le DTU ne traite pas des performances feu / acoustique : PV d'essai ou de classement requis | — | [S3] p. 5 | [S6] / [S7] fiches Siniat (référence PV par système) | confirmé (2 sources) | l'app ne déduit jamais un EI ; elle lit le système du devis |
| Cloison EI 60 : hauteur limitée pour garder le classement avec boîtiers électriques standard non protégés | ≤ 4 m | extrait moteur fiches Placo SAA (« EI60 limité à 4 m pour boîtiers standards non protégés ») | [S41] Pladur (PV Efectis EFR 14-J-002357 : EI 60, hauteur maxi 4 m) | confirmé (2 sources) | |
| Cloisons distributives 72/48 | EI 30 | [S8] | [S6] | confirmé (2 sources) | |
| 98/48 (2 BA13/face) | EI 60 | [S17] | [S21] | confirmé (2 sources) | |
| 3+3 BA13 (S195, S205) | EI 120 | [S35] | [S36] | confirmé (2 sources, même fabricant) | |
| Plafonds montage feu : vissage 0,15 m | — | [S47] | — | 1 source | |
| Joints d'angle, mastic coupe-feu, bandes, boîtiers étanches, bande résiliente | — | — | — | à confirmer (non documenté faute d'accès aux PDF Placo/Knauf et de recherche web épuisée) | |

---

## 8. Locaux humides

| Donnée | Valeur | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|
| Classement des locaux | EA (W/n ≤ 2,5 g/m³), EB (2,5 < W/n ≤ 5), EB+ privatifs / EB+ collectifs (W/n > 7,5), EC (hors DTU 25.41) — Cahier CSTB 3567_V2 | [S3] p. 18 | — | 1 source | |
| Plaque H1 (reprise d'eau < 5 %) | requise en EB+ privatifs et EB+ collectifs | [S3] p. 18 | [S6] Siniat (« EB+p : parement Prégydro ») ; [S7] (« EB+c : Prégyroc Air Hydro + SPEC ») | confirmé (2 sources) | |
| EB+ collectifs : DTU 25.41 seulement pour cloisons et contre-cloisons | plafonds, habillages collés et alvéolaires exclus | [S3] p. 7 | — | 1 source | |
| EB+ privatifs : SPEC dispensable si enduits de joint ET mortier de rebouchage hydrofugés | — | [S3] p. 17 | — | 1 source | |
| EB+ collectifs : SPEC sur au moins 2 m de hauteur hors zones de ruissellement + bandes de renfort sol/mur | 2 | m | [S3] p. 17 | — | 1 source |
| Finition carrelage : resserrement des entraxes d'ossature selon format des carreaux et type de plaque (§ 6.3.2.1) | 0,40 m ? | [S3] p. 17 (principe) | — | à confirmer (valeur et seuil de format non lus : texte DTU payant, extraits moteur épuisés) | piste : 0,40 m pour carreaux > 1 600 cm² — à vérifier |
| Plafond : plaques hydrofugées → entraxe fourrures 0,40 (Placo) ; hygrométrie > 80 % → 0,50 (Siniat) | 0,40 / 0,50 | [S47] | [S48] | contradiction (règle Placo plus sévère) | appliquer 0,40 pour une plaque Placo hydro |
| Rampants en EB+ : H1 sous 1,80 m | 1,80 | m | [S3] p. 17 | — | 1 source |
| Pied de cloison : film polyéthylène dépassant le sol fini de 2 cm + joint mousse | 2 cm | [S4] Siniat carnet « cloison » | — | 1 source | |

---

## 9. Pertes et chutes usuelles

| Donnée | Valeur | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|
| Plaques : taux de perte intégré aux ratios fabricant | 5 % (2,1 m² de plaque pour 2 m² de faces ; 1,05 m² pour 1 m² de plafond/doublage) | [S20] Pladur (« coefficient de perte de 5 % », écrit) | [S8] / [S47] Placo (2,10 et 1,05 m²/m²) | confirmé (2 sources) | NE PAS rajouter de perte sur ces ratios |
| Profilés (rails, montants, fourrures) | 5 % inclus dans les ratios Pladur | [S20] / [S41] | — | 1 source | Placo n'écrit pas son taux ; ses ratios sont plus hauts que la géométrie |
| Isolant | 1,05 m²/m² | [S8] Placo (laine 45 en cloison 1,05) | [S41] Pladur (panneau isolant doublage 1,05) | confirmé (2 sources) | |
| Rénovation, rampants, coupes biaises : perte supérieure | — | — | — | à confirmer (aucune source fabricant) | piste : +3 à +5 points en réno, 10 % en rampants — non sourcé |

---

## Bilan

Systèmes couverts : 41 (cloisons distributives 17 configurations dont 72/48, 72/36, 98/48, 98/62, 100/70, 106/70, 120/70,
120/90, 140/90, 150/100, alvéolaires 50/60 ; séparatives 10 (SAA 120/160, SAD 160/180, Siniat S140 à S205) ; doublages 3
familles (collé, contre-cloison sur montants 7 montants, fourrures + appuis) ; plafonds 5 (F530, sur montants, Stil Prim,
Stil Prim Tech, Gyplat direct) ; gaines 3).

Chiffres relevés : environ 260 (dont environ 150 hauteurs).
Confirmés 2 sources : environ 155 (≈ 60 %), dont toutes les hauteurs DTU des cloisons distributives en M48/M70/M90/M100
et des contre-cloisons M48/M70/M90, les entraxes de plafonds par poids d'isolant, les ratios plaques 2,1 / 4,2 / 1,05,
rail, enduit, MAP 1,8 kg/m², plots 10/m² Ø 10 cm, EI30 (72/48) et EI60 (98/48).

Principaux « à confirmer » / contradictions :
1. Montants par m² : Placo 2,1 ml (simples 0,60) contre Pladur 1,75 ml ; idem plafond fourrures 2,0 vs 1,75 et suspentes 1,8 vs 1,46.
2. Vis TTPC par m² de cloison : Placo 22 contre Pladur 41 (raison non trouvée).
3. 98/48 doublés 0,60 : 3,70 (Rockwool/DTU) contre 3,75 (Siniat, Pladur).
4. Entraxe sous carrelage en pièce humide (0,40 m ? seuil de format) : non lu dans le DTU.
5. BA13 vissée directement sous solives : le DTU 2022 a supprimé les ossatures bois de plafond — vérifier le texte.
6. SAA/SAD Placo : hauteurs et Ra lus seulement en extraits moteur ; aucune quantité SAA/SAD.
7. Appuis de doublage par m² (1 Pladur vs 2 Placo) ; contre-cloison avec appuis 6 m (Rockwool) vs 7 m (DTU 2022).
8. MAP : 1,8 kg/m² (système) vs 2-3 kg/m² (fiche produit) vs 2,5 (Pladur).
9. Knauf (Metal Stud, Lisaflex, Polyplac, D112, Shaftwall) : site 403, rien de Knauf n'est confirmé.
10. Coffrages/IPN, mastics et bandes coupe-feu, boîtiers, bandes résilientes, suspentes Intégra : non documentés.

Limite de méthode : le quota de recherche web de la session a été atteint en cours de mission (sections 4 à 9) ;
la suite repose sur les documents déjà téléchargés (Intégrale Placo Plafonds 2023, Mémento Pladur, fiches Siniat,
guides Rockwool, guide CAPEB DTU). Une relance permettrait de compléter Knauf, SAA/SAD Placo et les points 4-5.

## Sources

Consultation : 19/11/2026 pour toutes.

- [S3] CAPEB / guide « NF DTU 25.41 — Les principales nouveautés 2022 » — https://www.capeb.fr/www/capeb/media//morbihan/document/2022_Guide%20DTU%2025-41_DEF_HD_WEB.pdf — CAPEB, 2022 (DTU février 2022).
- [S4] Siniat, carnet de pose DTU « Comment réaliser une cloison en plaques de plâtre ? » — https://www.siniat.fr/fr-fr/siniatheque/carnet-de-pose-dtu/comment-realiser-une-cloison-en-plaques-de-platre/ — Siniat (Etex), page en ligne 2026.
- [S5] Rockwool, « Guide de mise en œuvre pour l'isolation des cloisons » (tableaux NF DTU 25.41 fév. 2022) — https://www.rockwool.com/siteassets/rw-f/telechargements/guides-de-pose-et-mise-en-oeuvre/cloisons/rockwool_mise_en_oeuvre_isolation_des_cloisons.pdf — Rockwool France, 12/2023.
- [S6] Siniat, fiche système Cloison Prégymétal D72/48 EI30 37 dB M48-35 — https://www.siniat.fr/-/print2pdf/system/pi79832/siniat-fiche-technique/fr-fr/cloison-pregymetal-d72-48-ei30-37db-m48-35-isolant.pdf — Siniat, édition 02/09/2026.
- [S7] Siniat, fiche Cloison D98/48 dB EI60 50 dB M48-50 — https://www.siniat.fr/-/print2pdf/system/pi80692/siniat-fiche-technique/fr-fr/cloison-pregymetal-d9848-db---ei60---50db---m48-50---isolant.pdf — Siniat, 05/09/2026.
- [S8] Placo, fiche solution « Cloison Placostil 72/48 Placoplatre BA13 EI30 39 dB 2,6 m » (quantités pour 1 m²) — https://www.reseau-proeco-energies.fr/files/membres/dossier_technique/Cloison-Placostil-R-72-48-Placoplatre-R-BA13-EI-30-39dB-2-6m.pdf — Placo (Saint-Gobain), document hébergé par Proeco ; date non imprimée (à confirmer).
- [S9] Placo, « L'Intégrale Placo 2021-2022 — Cloisons distributives Placostil » — https://www.placo.fr/sites/mac3.placo.fr/files/files/forum/L%27Int%C3%A9grale%20Placo%202021-2022%20-%20%20Cloisons%20distributives%20Placostil%C2%AE%20BA13-%20BA15-%20BA18.pdf — Placo 2021 ; 403, extraits moteur seulement.
- [S10] Placo, fiche système sp00021554 — https://www.placo.fr/documents/fiche-systeme/fichesysteme-sp00021554.pdf — 403, extrait moteur.
- [S11] Siniat, fiche Cloison D98/62 S Twin EI60 53 dB — https://www.siniat.fr/-/print2pdf/system/pi80507/siniat-fiche-technique/fr-fr/cloison-pregymetal-d98-62-s-twin-ei60-53db-m62-35-isolant.pdf — Siniat 2026.
- [S12] Siniat, fiche Cloison D100/70 39 dB M70-50 — https://www.siniat.fr/-/print2pdf/system/pi79256/siniat-fiche-technique/fr-fr/cloison-pregymetal-d100-70-43db-m70-50-laine-de-verre.pdf — Siniat 2026.
- [S13] Siniat, fiche Cloison D106/70 46 dB M70-50 — https://www.siniat.fr/-/print2pdf/system/pi79272/siniat-fiche-technique/fr-fr/cloison-pregymetal-d106-70-46db-m70-50-laine-de-verre.pdf — Siniat 2026.
- [S14] Placo, fiche produit Montant Stil M 70 (aile 40 mm, 0,73 kg/ml) — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_36322.pdf — Placo, mise à jour 24/09/2024, hébergée Samse.
- [S15] Placo, fiche produit Montant Stil M 48 (aile 35 mm, 0,57 kg/ml, longueurs 2,49 à 4,99 m, botte de 10) — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_376584.pdf — Placo, mise à jour 18/12/2023, hébergée Samse.
- [S16] Siniat, fiche Cloison Prégywab D72/48 — https://www.siniat.fr/-/print2pdf/system/pi80088/siniat-fiche-technique/fr-fr/cloison%20pr%C3%A9gywab%C2%AE%20d7248%20-%2041db%20-%20m48-35%20wab%20-%20laine%20de%20verre.pdf — Siniat 2026.
- [S17] Placo, fiche système sp00018909 (98/48 2×BA13 M48 0,6 simple EI60 47 dB 3 m) — https://www.placo.fr/documents/fiche-systeme/fichesysteme-sp00018909.pdf — édition 27/04/2026 selon extrait moteur ; 403.
- [S20] Pladur, fiche système « Cloison distributive — parement simple 1 200 mm » — https://entreprise.pladur.com/siteassets/page-assets/interactive-selector/cloisons-dist-parements-simples-1200.pdf — Pladur, rév. 03/2019 (antérieure au DTU 2022 : hauteurs recoupées avec [S5]).
- [S21] Pladur, fiche système « Cloison distributive — parement double 1 200 mm » — https://entreprise.pladur.com/siteassets/page-assets/interactive-selector/cloisons-dist-parements-doubles.pdf — Pladur, rév. 03/2019.
- [S28] FFB, « Publication du nouveau NF DTU 25.41 » — https://www.ffbatiment.fr/actualites-batiment/actualite/publication-nouveau-nf-dtu-25-41 — extrait moteur.
- [S30] Légifrance, arrêté du 30 juin 1999 relatif aux caractéristiques acoustiques des bâtiments d'habitation — https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000211449 — extrait moteur.
- [S31] FFB, « Exigences acoustiques pour les logements collectifs neufs » — https://www.ffbatiment.fr/techniques-batiment/reglementation-construction/reglementation-acoustique/dossier/exigences-acoustiques-logements-collectifs-neufs — extrait moteur.
- [S32] AIDA-Ineris, texte de l'arrêté du 30 juin 1999 — https://aida.ineris.fr/node/38596/printable/pdf — extrait moteur.
- [S33] Siniat, fiche Cloison S180 EI60 60 dB M90-50 — https://www.siniat.fr/-/print2pdf/system/pi79436/siniat-fiche-technique/fr-fr/cloison-pregymetal-s180---ei60---60db---m90-50---isolant.pdf — Siniat 2026.
- [S34] Siniat, fiche Cloison S180 2+3 BA13 EI60 63 dB — https://www.siniat.fr/-/print2pdf/system/pi80743/siniat-fiche-technique/fr-fr/cloison-pregymetal-s180-2-3-ba13-std-ei60-63db-m48-50-isolant-85-mm.pdf — Siniat 2026.
- [S35] Siniat, fiche Cloison S195 3+3 BA13 EI120 65 dB — https://www.siniat.fr/-/print2pdf/system/pi80741/siniat-fiche-technique/fr-fr/cloison-pregymetal-s195-3-3-ba13-std-ei120-65db-m90-50-isolant85.pdf — Siniat 2026.
- [S36] Siniat, fiche Cloison S205 3+3 BA13 EI120 67 dB — https://www.siniat.fr/-/print2pdf/system/pi80750/siniat-fiche-technique/fr-fr/cloison-pregymetal-s205-3-3-ba13-std-ei120-67db-m48-35-isolant85.pdf — Siniat 2026.
- [S37] Siniat, fiche Cloison S140 Twin Up BA18 S — https://www.siniat.fr/-/print2pdf/system/pi790367/siniat-fiche-technique/fr-fr/cloison-pregymetal-s140-twin-up-ba18-s---ei60---61db---m48-35---isolant.pdf — Siniat 2026.
- [S38] Siniat, fiche Cloison S180 Twin BA25 S EI60 67 dB — https://www.siniat.fr/-/print2pdf/system/pi79421/siniat-fiche-technique/fr-fr/cloison-pregymetal-s180-twin-ba25-s-ei60-67db-m70-50.pdf — Siniat 2026.
- [S40] Siniat, fiche produit Prégycolle 120 — https://www.siniat.fr/-/print2pdf/product/pi174132/siniat-fiche-produit/fr-fr.pdf — Siniat, 01/09/2026.
- [S41] Pladur, Mémento (plafonds, cloisons, doublages, gaines, quantitatifs) — https://corporate.pladur.com/siteassets/page-assets/interactive-selector/pladur-memento.pdf — Pladur, édition août 2017 (antérieure au DTU 2022 ; utilisée seulement en 2e source, hauteurs de contre-cloisons identiques à Rockwool 07/2024).
- [S42] Placo, fiche technique MAP Formule+ 25 kg — https://medias.bigmat.fr/data_medias/medias_finaux/documents/3496250198821-XFYvn3ucwY.pdf — Placo, mise à jour 28/05/2025, hébergée BigMat.
- [S43] Siniat, carnet de pose DTU « Comment poser un doublage isolant collé ? » — https://www.siniat.fr/fr-fr/siniatheque/carnet-de-pose-dtu/comment-poser-un-doublage-isolant-colle/ — Siniat 2026.
- [S44] Rockwool, « Guide de mise en œuvre pour l'isolation des murs par l'intérieur » — https://www.rockwool.com/syssiteassets/rw-f/telechargements/guides-de-pose-et-mise-en-oeuvre/murs-isolation-par-l-interieur/rockwool_mise_en_oeuvre_rockmur_nu_murs_par_interieur.pdf — Rockwool France, 07/2024.
- [S45] Siniat, fiche Contre-cloison Sinemax sur montants 2 BA18 — https://www.siniat.fr/-/print2pdf/system/pi80381/siniat-fiche-technique/fr-fr/contre-cloison-pregymetal-sinemax-sur-montants---2-ba18-std---m48-35---isolant.pdf — Siniat 2026.
- [S46] Isover, fiche Appui Optima2 — https://documentacion.generadordeprecios.info/documentaciontecnica/isover-fr/isover4_optima2.pdf — Isover, date non imprimée (à confirmer).
- [S47] Placo, « L'Intégrale Placo — Second Œuvre 04.2023 — Plafonds » (pp. 86-147) — https://dam.pim-cps.saint-gobain.com/MAM/assets/1/C1A269993195482DA567890D5C26E716/doc/CEDB5A77BEAE4BDA8E2753C0A9B3A813/SO03-Intgrale_Placo_Second_Oeuvre_04.2023_-_Plafonds.pdf — Placo, 18/04/2023 (tient compte de la mise à jour DTU 25.41 2022, écrit p. 101).
- [S48] Siniat, carnet de pose DTU « Comment installer un plafond en plaques de plâtre ? » — https://www.siniat.fr/fr-fr/siniatheque/carnet-de-pose-dtu/comment-installer-un-plafond-en-plaques-de-platre/ — Siniat 2026.
- [S50] Siniat, fiche Gaine technique D72/48 — https://www.siniat.fr/-/print2pdf/system/pi80638/siniat-fiche-technique/fr-fr/gaine-technique-composee-dune-cloison-pregymetal-d7248---isolant.pdf — Siniat 2026.
- [S51] Siniat, fiche Gaine Prégyfaylite BA50 + contre-cloison — https://www.siniat.fr/-/print2pdf/system/pi79807/siniat-fiche-technique/fr-fr/gaine-technique-composee-dune-cloison-pregyfaylite-ba50--contre-cloison-pregymetal-avec-1-ba13-flam-ou-1-ba18-std---isolant.pdf — Siniat 2026.
- Extraits moteur Placo SAA/SAD : fiches sp00020723, sp00021607, sp00011594, sp00035377 — https://www.placo.fr/documents/fiche-systeme/ — 403, extraits seulement.
