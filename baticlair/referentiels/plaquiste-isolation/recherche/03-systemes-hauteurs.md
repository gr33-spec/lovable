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
