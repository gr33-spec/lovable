# 02b — Fixations et contre-vérification (2e passe, plaquiste-isolation)

Recherche du 19 novembre 2026. Consignes : `_consignes.md`. Complète et corrige `02-ossatures-fixations.md`
(1re passe, non modifiée). Pour une ligne reprise de 02 : colonne « Ancien (02) » = ancienne valeur / ancien statut.
Abréviations : [Tn] renvoient à la liste « Sources » en fin de ce fichier ; [Sn] à celle de 02. « c. » = consulté le.

Rédigé au fur et à mesure.

---

## Note d'accès (2e passe)

placo.fr répond toujours 403. En revanche, les **fiches produit Placo officielles** sont servies sans blocage par
Samse (`medias.groupe-samse.fr/Fiche_technique/Fiche_technique_<n>.pdf`, numéros 903606 à 903646 = accessoires
et vis Placostil ; 7972-7988 = rails, fourrure, cornières ; 36320-36323 = montant M 70) et par BigMat
(`medias.bigmat.fr/.../<EAN>-<code>.pdf`). Elles ont été téléchargées et leur texte extrait en entier
(pdftotext). Ce sont des documents du fabricant (en-tête « www.placo.fr », date « Mise à jour le … »), donc
« source fabricant » ; quand deux hébergeurs (Samse, BigMat) servent deux éditions de la même fiche, elles
comptent pour une seule source fabricant, et la 2e source exigée vient d'un autre document (Intégrale, SNIP,
négoce, autre marque).

---

## C. Vis et fixations

### C.1 Vis TTPC Placo : compatibilité (épaisseur de parement) et conditionnements réels

Lecture clé : chaque fiche Placo donne l'épaisseur totale de plaques que la vis peut fixer, sur métal et sur bois.
Cela vérifie la règle « longueur = épaisseur + 10 mm (métal) / + 20 mm (bois) » et tranche la 2e peau de 2 BA13.

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Ancien (02) | Note |
|---|---|---|---|---|---|---|---|
| TTPC 25 : parement admissible | 1 plaque de 13 mm sur profilé métallique (rien d'écrit pour le bois) | mm | fiche Placo Vis TTPC 25, MAJ 23/07/26, via Samse [T1], c. 19/11/2026 | Gypso/Chausson [S40] (BA13 sur métal → TTPC 25) | confirmé (2 sources) | confirmé | la TTPC 25 n'est PAS donnée pour une BA15 ni une BA18 |
| TTPC 35 : parement admissible | 25 mm total sur métal ; 13 mm sur bois | mm | fiche Placo Vis TTPC 35, MAJ 23/07/26, via Samse [T2] | Gypso [S40] (bois : 13 + 20 = 35) ; règle +10 mm Intégrale [S2] | confirmé (2 sources) | — | |
| TTPC 45 : parement admissible | 35 mm total sur métal ; 25 mm sur bois | mm | fiche Placo TTPC 45, MAJ 23/07/26 via Samse [T3] et MAJ 21/10/24 via BigMat [T4] | règle +10 mm [S2][S5b] | confirmé (2 sources) | — | |
| TTPC 55 : parement admissible | 45 mm sur métal ; 35 mm sur bois | mm | fiche Placo TTPC 55, MAJ 31/03/26 via Samse [T5] (et 18/12/23 via BigMat [T6]) | règle +10 mm [S2] | confirmé (2 sources) | — | |
| TTPC 70 : parement admissible | 60 mm sur métal ; 50 mm sur bois | mm | fiche Placo TTPC 70, MAJ 31/03/26 via Samse [T7] | règle +10 mm [S2] | confirmé (2 sources) | — | aussi TTPC 80 : 70 / 60 mm [T8] |
| 1 BA13 (12,5) sur métal | **TTPC 25** | — | [T1] | [S40] | confirmé (2 sources) | confirmé | |
| 1 BA15 (15) sur métal | **TTPC 35** (pas 25) | — | [T1] (TTPC 25 = 13 mm seulement) + [T2] (TTPC 35 jusqu'à 25 mm) | règle +10 mm : 15 + 10 = 25 = juste à la limite, Placo ne la retient pas | confirmé (2 sources) | à confirmer (02 disait TTPC 25) | **correction** de 02 |
| 1 BA18 (18) sur métal | TTPC 35 | — | [T2] | règle +10 mm (28 → 35) | confirmé (2 sources) | à confirmer (calcul) | |
| 1 BA25 (25) sur métal | TTPC 35 | — | [T2] (25 mm total) | règle +10 mm (35) | confirmé (2 sources) | — | à la limite : beaucoup de poseurs prennent 45 ; la fiche dit 35 |
| 2 BA13 : 1re peau / 2e peau | TTPC 25 / **TTPC 35** | — | [T1] + [T2] (« une ou plusieurs plaques d'épaisseur totale 25 mm ») | Intégrale [S2] règle +10 mm : 25 + 10 = 35 | confirmé (2 sources) | à confirmer (02 hésitait 35/45) | 45 n'est pas faux (plus long) mais pas nécessaire ; le SNIP [S1] dit « TTPC 35/45 » |
| 2 BA15 (30 mm) : 1re / 2e peau | TTPC 35 / TTPC 45 | — | [T2] + [T3] (35 mm) | règle +10 mm | confirmé (2 sources) | — | |
| 2 BA18 (36) / 3 BA13 (37,5) | TTPC 55 | — | [T5] (45 mm) ; [T3] limité à 35 | règle +10 mm | confirmé (2 sources) | 3 BA13 à confirmer | |
| Plaques sur ossature bois : 1 BA13 / 2 BA13 | TTPC 35 / TTPC 45 | — | [T2] / [T3] | Gypso [S40] (+20 mm) ; Siniat [S5b] | confirmé (2 sources) | confirmé | |
| TTPC 25 Placo : boîtes | 500 (E60260500), 1000 (E60261000), 1500 (E60261500) | u | [T1] (MAJ 23/07/26) | Brico Dépôt « TTPC 25 – 500 pièces » [T9] ; Castorama 1500 [T9] | confirmé (2 sources) | 02 : « boîte 1000 Placo non relevée » | la boîte de 1000 Placo est récente (EAN 3496250471917) |
| TTPC 35 Placo : boîtes | 500, 1000 (E60361000), 1500 ; palette 576 boîtes (500) / 160 (1500) | u | [T2] | Brico Dépôt « boîte de 500 TTPC 8 × 35 » [T9] ; Bricomarché/Castorama 1500 | confirmé (2 sources) | — | |
| TTPC 45 Placo : boîtes | 500 et 1500 (fiches 2024 et 2026) ; 1000 (E60461000) cité par un extrait moteur seulement | u | [T3][T4] | Bricomarché « TTPC 45 boîte de 500 » et « 1500 » [T9] | confirmé (2 sources) pour 500 et 1500 ; 1000 Placo : à confirmer (absente des deux fiches lues) | contradiction 1000 (Gypso) / 500 (Klimas) | la contradiction de 02 s'explique par la marque : Gypso 1000, Klimas 500, Placo 500/1500 |
| TTPC 55 Placo : boîte | 300 (E60560300) | u | [T5][T6] | Castorama « 300 TTPC 55 Placo » [T9] | confirmé (2 sources) | contradiction 500/300 | Gypso : 500 [S40] ; donc « dépend de la marque » |
| TTPC 70 Placo : boîte | 300 (E60710300), palette 320 | u | [T7] | Bricomarché « TTPC 70 boîte de 300 » | confirmé (2 sources) | 1 source | |
| TTPC 80 Placo : boîte | 300 | u | [T8] | — | 1 source | — | |
| TTPC en seau / en bande | seau 10 000 (Gypso), bande boîte 1000 (Gypso) | u | [S40] | — | 1 source (inchangé) | 1 source | aucune fiche Placo « bande » ni « seau » trouvée en TTPC (Placo vend THB 45 en « sea1000 » [T10]) |

### C.2 Vis métal-métal, vis spéciales, pointes

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Ancien (02) | Note |
|---|---|---|---|---|---|---|---|
| TRPF 13 Placo : usage | assemblage de 2 éléments métalliques, épaisseur cumulée 2 mm ; tête ronde Ø 6, pointe foret, longueur 13 mm | — | fiche Placo Vis TRPF 13, MAJ 05/11/24, via Samse [T11] | Intégrale [S2] p.109 | confirmé (2 sources) | confirmé usage ; dimension à confirmer | longueur 13 mm confirmée (pas 9,5 : c'est la TEX Klimas) |
| TRPF 13 Placo : boîte | 500 (« Vis TRPF 13/bte500P »), palette 768 boîtes | u | [T11] | extrait Bricomarché (boîte 500) [T35] | confirmé (2 sources) | 1 source | la boîte de 1000 est Klimas (TEX 3,5 × 9,5) |
| TTPF 35 (vis pour acier épais) | parement 25 mm sur profilé métallique épais (pointe foret) | — | fiche Placo TTPF 35, MAJ 31/03/26 [T12] | — | 1 source | — | pour M 100, High-stil, ossatures > 0,8 mm ; les TTPC sont pour acier < 0,8 mm [T3][T7] |
| Vis HB 25 / HB 41 (Placocem) | boîte 500 | u | fiches Placo HB 25 / HB 41 [T13] | — | 1 source | — | plaques ciment (pièces humides extérieures), hors cloison courante |
| Vis THB 25 / THB 45 (Placo Impact) | boîte 1000 (THB 25) ; seau 1000 (THB 45) | u | fiches Placo THB [T10] | — | 1 source | — | vis à tête large pour plaques haute dureté Placo Impact |
| Pointes sur bois (plaques 10 à 12 mm) | Pointe TC 35 (tête creuse) ou TF 35 (tête fraisée) ; carton de 5 kg | — | fiches Placo pointes [T14] | — | 1 source | — | alternative au vissage sur bois (anciens usages) |

### C.3 Vis Habito (Placo haute dureté) et vis Fermacell

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Ancien (02) | Note |
|---|---|---|---|---|---|---|---|
| Vis Habito 25 (1 plaque Habito sur Placostil) | double filet, tête large Ø 7 mm, 25 mm ; boîte de **250** (H66310250) ; palette 900 boîtes ; MAJ 31/03/26 | — | fiche Placo Vis Habito 25 (extrait moteur placo.fr, 403 en direct) [T15] | Bricomarché « Vis Habito 25 mm, boîte de 250 » (EAN 3496250341470) [T15] | confirmé (2 sources) | à confirmer (non vérifié) | une TTPC ordinaire ne convient pas à Habito (plaque très dure) |
| Vis Habito 41 (2 plaques Habito) | 41 mm ; boîte de **800** (H66330800) ; palette 240 | — | fiche Placo Vis Habito 41 (extrait moteur) [T15] | — | 1 source | à confirmer | 2e peau Habito |
| Vis Fermacell : longueurs | 3,9 × 30 (simple parement) ; 3,9 × 45 (double parement) ; 3,9 × 19 / 22 (plaques de sol) ; 3,5 × 25 pointe foret (profil de renfort) | mm | Fermacell, Guide de pose (édition ancienne, date non imprimée ; classement « M0 »), via BigMat [T16] | Bricomarché « Fermacell vis 3,9 × 22 », Leroy Merlin « vis Fermacell 3,9 mm, 40 mm » [T17] | confirmé (2 sources) pour 3,9 × 30 / 45 | à confirmer | la vis Fermacell (fibres-gypse) n'est PAS une TTPC |
| Vis Fermacell : conditionnement | boîte de 250 (embout fourni) et boîte de 1000 ; 1000 = 20 bandes de 50 (version en bande) | u | Leroy Merlin (Fermacell, 1000) [T17] | Hornbach CH (Fermacell 3,9 × 30, 250 et 1000) ; Makita bande 3,9 × 30 « 1000 = 20 × 50 » [T17] | confirmé (2 sources) | à confirmer | |
| Fermacell cloison sur métal, 1 plaque 12,5 mm | vis 3,9 × 30 au pas de 25 cm ; **20 vis par m² de cloison** (par parement, d'après le tableau) | — | [T16] tableau 3 | Leroy Merlin « 15 vis/m² en cloison, 30 en plafond » [T17] | contradiction (détail) | — | 20 (fabricant, pas 25 cm) vs 15 (négoce, sans pas) ; garder 20 par face ; plaque 10 mm : 26/m² |
| Fermacell double parement métal | 1re peau 3,9 × 30 au pas de 40 cm (12/m²) + 2e peau 3,9 × 45 au pas de 25 cm (20/m²) | — | [T16] | — | 1 source | — | variante : 2e peau vissée dans la 1re (agrafes) |
| Fermacell plafond 12,5 mm sur métal | 3,9 × 30 au pas de 20 cm, 22 vis/m² | — | [T16] tableau 4 | Leroy Merlin « 30 vis/m² en plafond » [T17] | contradiction (détail) | — | 30/m² correspond à la plaque 10 mm (pas 15 cm) du même tableau |

### C.4 Fixation des rails, cornières et suspentes au support (chevilles, clous, cloueurs)

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Ancien (02) | Note |
|---|---|---|---|---|---|---|---|
| Fixation des rails au sol / plafond : principe | **fixation mécanique** (cheville, clou de cloueur, vis) ; collage des rails non admis dans les DROM ; rail haut fixable directement dans un plafond en plaques (vis « bêchevetées », cas A, H ≤ 2,70 m) ou par collage | — | Guide CAPEB / UMPI-FFB / SNIP « NF DTU 25.41, les nouveautés 2022 » [T18] | Siniat [S5b] (« fixation tous les 60 cm ») | confirmé (2 sources) | — | |
| Cheville à frapper pour rail plaque de plâtre (béton plein, brique pleine) | **5 × 25** cité pour « rails pour plaque de plâtre » ; 6 × 35 / 6 × 40 aussi courants | mm | catalogue FLASHfix (distributeur, pied de page daté 2008) [T19] | Fischer N 6 × 40 « rails et profilés métalliques » (Brico.be / Brico Dépôt) [T20] ; Brico Dépôt [S42] | confirmé (2 sources) pour le type ; la dimension varie (5 × 25 à 6 × 40) | confirmé 6 × 40 | épaisseur fixée par un rail 0,53 mm : 5 × 25 suffit ; 6 × 40 plus tolérant sur sol irrégulier |
| Cheville à frapper : conditionnement pro | boîte de **200** (5 × 25 à 8 × 60) ; 100 au-delà de 8 × 80 | u | [T19] | Brico Dépôt seau de 800 (Fischer) ; sachets 20 / 50 en GSB [S42][T20] | confirmé (2 sources) pour « boîte de 100 à 200 » en pro | sachet 50 / seau 800 | la boîte de 200 est le format négoce courant ; à confirmer pour la marque tenue par le négoce |
| Charge d'une cheville à frapper Ø 6 | 25 daN en traction, 60 daN en cisaillement (béton C20) | daN | [T19] (cahier des charges Socotec) | — | 1 source | — | sert seulement à justifier qu'un rail ne demande pas plus |
| Cloueur Hilti GX 3 : clou pour rail sur béton | **X-C 20 G3 MX** (tige 20 mm, Ø 2,6 mm) ; rail métallique ≤ 2 mm | — | Hilti UK / IN, page X-C G3 MX [T21] | guide de choix Hilti (extrait moteur : « X-C 20 G3 MX, clou + rail plaque de plâtre, béton standard et dur ») [T21] | confirmé (2 sources, même fabricant) | à confirmer (non vérifié) | X-GN 20 = cloueur GX 120 (autre outil), boîte 750 + 1 GC 22 |
| Hilti X-C G3 MX : boîte | **1200** clous (réf. 3553527 pour la 20 mm) | u | [T21] | Industrybuying « X-C for GX 3, pack of 1200 » [T21] | confirmé (2 sources) | — | gaz vendu à part |
| Hilti GX 3 : gaz | cartouche GC 40, GC 41 ou GC 42 ; ≈ 900 clous par GC 41, ≈ 1200 par GC 42, 1000 pour 2 GC 40 | clous | extrait moteur fiche Hilti (FAQ / fiche outil) [T22] | fiche Hilti GC 41 « pour GX 3 et GX 3-ME » [T22] | 1 source pour les nombres de tirs | — | ≈ 1 GC 42 par boîte de 1200 : à confirmer en négoce |
| Spit Pulsa (P40/P800) : clous béton C6 20 / 25 / 30 | boîte 500 + 1 gaz ; 1500 + 3 gaz | u | [S43] (02) | — | 1 source (inchangé) | 1 source | pas de 2e source trouvée sans dépasser le budget |
| Longueur de clou pour rail sur béton | **20 mm** (béton courant, rail 0,53 mm) ; 25-30 mm sur chape ou béton jeune | mm | Hilti X-C 20 pour rail plaque de plâtre [T21] | Spit C6 20 pour rails métalliques [S43] | confirmé (2 sources) pour 20 mm | — | 25-30 mm : pratique, à confirmer |
| Suspente sécable sur bois | 2 vis TTPC 35 par suspente | u | fiche Placo Suspente sécable, MAJ 31/03/26 [T23] | Intégrale [S2] p.101 | confirmé (2 sources) | confirmé | |
| Suspente articulée SA | sous plancher bois **ou béton** (béton : cheville métallique + tige filetée) | — | fiche Placo SA, MAJ 31/03/26 [T23] | Intégrale [S2] p.102 | confirmé (2 sources) | — | |
| Suspente H / HL sur hourdis béton ou céramique | enfoncée entre poutrelle et hourdis, sans cheville ; H : plénum 40 mm à 1 m (avec tige filetée) ; HL : 60 à 580 mm (avec suspente longue) | — | fiches Placo H et HL, MAJ 31/03/26 [T23] | Intégrale [S2] p.102 | confirmé (2 sources) | 1 source | |
| Fixation sur dalle béton (plafond) | cheville métallique à expansion pour tige filetée Ø 6 (ou clou-cheville 6 × 40 Knauf) + suspente pivot SP / cavalier / HL | — | [S2] p.102 | Knauf clou cheville 6 × 40 [S39] ; fiche Placo Suspente pivot SP « liaison articulée de tiges filetées » [T23] | confirmé (2 sources) | confirmé | |
| Premier rang de suspentes ou de fourrures contre un mur sans cornière fixable | à 100 mm maxi du mur | mm | guide CAPEB NF DTU 25.41 2022 (§ 6.2.2.7) [T18] | — | 1 source | — | |

---

## B. Distance et entraxe des fixations de rail (sol, plafond)

Édition du DTU : la version en vigueur est le **NF DTU 25.41 de février 2022** (la version de décembre 2012 est
annulée) [T18][T24]. C'est donc elle que Placo applique dans l'Intégrale 2023 [S2] (« nouveauté DTU » des rails de
rive) : le point 9 des « à confirmer » de 02 est réglé. Le texte AFNOR lui-même n'est pas en accès libre ; les valeurs
ci-dessous viennent du guide de la profession (CAPEB, UMPI-FFB, SNIP) et des fabricants qui l'appliquent.

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Ancien (02) | Note |
|---|---|---|---|---|---|---|---|
| Édition du NF DTU 25.41 en vigueur | février 2022 (P1-1 révisée), déc. 2012 annulée | — | guide CAPEB/UMPI-FFB/SNIP « NF DTU 25.41 – nouveautés 2022 » [T18] | boutique AFNOR (« NF DTU 25.41 février 2022 – en vigueur ») [T24] | confirmé (2 sources) | à confirmer | |
| Entraxe des fixations de rail (sol et plafond) | **0,60 m maxi** (fixation mécanique) | m | Siniat [S5b] | Placo Intégrale 2023 [S2] ; extrait du DTU § 6.3.4.1 cité sur forum (« fixés mécaniquement au maximum tous les 0,60 m selon la nature du sol ») [T25] | confirmé (2 sources) | confirmé | inchangé |
| Distance d'une fixation au bord de la dalle | > 5 cm | cm | Siniat [S5b] | — | 1 source (inchangé) | 1 source | |
| Fixation à une distance maxi de l'extrémité de chaque barre de rail | **non chiffrée** par les documents lus (Siniat, Placo Intégrale 2023, guide CAPEB DTU 2022, Pladur 2019, Rockwool, Knauf) | — | — | — | à confirmer (aucune source après 2 passes) | à confirmer | la règle de chantier « une fixation à ≤ 10 cm de chaque bout » reste une pratique ; ne pas l'afficher comme DTU |
| Nombre de fixations par barre de rail de 3 m | **6** si l'on fixe chaque bout (5 intervalles de 0,60) ; ⌈L / 0,60⌉ + 1 par tronçon | u | calcul à partir de 0,60 m [S5b][S2] | — | à confirmer (calcul ; règle d'extrémité non sourcée) | à confirmer | en pratique 2 fixations/ml de rail, arrondi à la boîte |
| Rail haut sous plafond en plaques (sans ossature au droit) | vis « bêchevetées » dans la plaque, cloison cas A ≤ 2,70 m ; ou collage | — | guide DTU 2022 § 6.2.4.4.2 [T18] | — | 1 source | — | à dire si le devis indique « cloison sous plafond placo » |
| Cornière / rail de rive plafond | tous les 0,60 m maxi ; sinon 1re fourrure à ≤ 100 mm du mur (ossature parallèle) ou 1re suspente à ≤ 100 mm (perpendiculaire) | — | Placo Intégrale 2023 [S2] p.103 | guide DTU 2022 § 6.2.2.7 [T18] | confirmé (2 sources) | confirmé (0,60) | |
| Plafond à parements multiples | 1ers parements vissés tous les 600 mm ; dernier tous les 300 mm ; 3 BA13 / BA15 ou 2 BA18 au plus ; BA25 non admis | mm | guide DTU 2022 § 6.2.5 [T18] | Placo Intégrale 2023 [S2] p.109 (1re peau 60 cm) | confirmé (2 sources) | confirmé | |
| Aboutage de montants | recouvrement ≥ 20 cm, vissé sur les deux ailes ; éclisse = tronçon de rail | cm | guide DTU 2022 (définitions) [T18] | SNIP [S1] (aboutage tous les 4 m en plafond) | confirmé (2 sources) | — | |

---

## D. Contradictions de 02 : explication et règle retenue

### D.1 Vis TTPC par m² de cloison 72/48 (simples, entraxe 0,60) : 22 / 25 / 30 (et 41)

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Ancien (02) | Note |
|---|---|---|---|---|---|---|---|
| Placo (ancienne fiche via Batiland) | 22 | u/m² | [S3] | — | 1 source | contradiction | vis dans les montants seulement (2 faces), pas de vis dans les rails |
| Gypso (fiche vis 2020) | 25 « en moyenne » | u/m² | [S40] | — | 1 source | contradiction | moyenne de négoce, sans hypothèse dite |
| SNIP Fiche conseil n° 18 (déc. 2024) | 30 | u/m² | [S1] | — | 1 source | contradiction | montants au pas de 30 cm + **5 vis/ml dans les rails haut et bas** (6 vis par plaque) + 5 % |
| Pladur, cloison parement simple 1200 (Rev. 03/2019) | 41 vis PM (h 2,50, 0,60, simples) | u/m² | fiche Pladur [T26] | — | 1 source | — | marque espagnole (Uralita/Etex) ; hypothèse non dite (pas plus serré ?) : non retenue |
| **Explication** (calcul, plaque 1,20 × 2,50, une face) | 3 lignes de montant × ≈ 9 vis (pas 30 cm sur 2,50 m) = 27, soit 9 vis/m² par face = **18 à 22 vis/m² de cloison** sans les rails ; + 2 rails × 1,20 m × 5 vis/ml = 12 vis par plaque, soit + 4 /m² par face → **26 à 28**, + 5 % = **≈ 30** | u/m² | calcul à partir de [S1] et [S5b] | — | à confirmer (calcul) | — | l'écart 22 → 30 vient des vis dans les rails et des chutes, pas d'une règle de pose différente |
| **Règle retenue pour le moteur** | **30 vis/m² de cloison** (SNIP 2024, document le plus récent, signé par toute la profession), affiché orange « à confirmer » comme ratio | u/m² | [S1] | [S3] (22, base sans rails) | contradiction (détail) expliquée | contradiction | la boîte de 1000 couvre ≈ 33 m² de cloison ; l'écart 22/30 ne change la commande que d'une boîte au-delà de 100 m² |

### D.2 Suspentes par m² de plafond (fourrures à 0,60, suspentes à 1,20) : 1,56 (SNIP) / 1,8 (Placo)

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Ancien (02) | Note |
|---|---|---|---|---|---|---|---|
| Géométrie pure | 1 / (0,60 × 1,20) = **1,39** | u/m² | règle 0,60 × 1,20 [S2][S1] | — | confirmé (calcul sur 2 sources) | — | sans les rangées de rive |
| SNIP, plafond 8 × 10 m | 17 lignes × 7 suspentes ≈ 119 pour 80 m² = 1,49 ; × 1,05 = **1,56** | u/m² | [S1] | — | à confirmer (reconstitution par calcul) | contradiction | grande pièce : peu de rives |
| Placo Intégrale 2023 | **1,8** (quantité « indicative ») | u/m² | [S2] p.105 | — | 1 source | contradiction | |
| Petite pièce 4 × 4 m (calcul) | 7 lignes × 4 suspentes = 28 pour 16 m² = **1,75** | u/m² | calcul (0,60 / 1,20 ; 1re et dernière à ≤ 10 cm du mur [T18]) | — | à confirmer (calcul) | — | une pièce de maison retombe sur le 1,8 de Placo |
| **Règle retenue** | calculer au plan : (⌈largeur / 0,60⌉ + 1) lignes × (⌈longueur / 1,20⌉ + 1) suspentes ; à défaut de plan, **1,8/m²** (pièces de maison) et 1,56 au-delà de ≈ 60 m² | u/m² | [S1][S2] | — | contradiction (détail) expliquée par la taille de la pièce | contradiction | boîte de 100 (longue, courte) ; 50 (sécable) |

### D.3 Doublage sur appuis : 1re ligne à 1,25 m (SNIP) ou 1,35 m (Isover)

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Ancien (02) | Note |
|---|---|---|---|---|---|---|---|
| Isover Optima2 | une ligne d'appuis à 1,35 m du sol pour un doublage jusqu'à 2,70 m | m | [S31b] | — | 1 source | contradiction | 1,35 = 2,70 / 2 |
| SNIP n° 18 | une ligne d'appuis tous les 1,25 m (hauteur de calcul 2,50 m) | m | [S1] | — | 1 source | contradiction | 1,25 = 2,50 / 2 |
| Placo Intégrale 2021-22 (doublage F 530) | distance maxi entre appuis **selon le système** : 1,00 (Plume 13, fourrures 0,40) ; 1,15 à 1,40 (BA 18S, 0,90) ; 1,30 (BA13 sur brique) ; 1,60 (Phonique BA13) ; jusqu'à 1,80 ; à 2 lignes ou plus, 1re ligne à 0,60 m du sol (ou 0,83 m selon système) | m | extraits moteur Intégrale Placo 2021-22 « Doublage Placostil avec appui sur fourrures F 530 » [T27] | — | 1 source (extrait ; PDF non lu, accès refusé) | — | |
| **Explication** | ce n'est pas une contradiction : les deux disent « **une seule ligne d'appuis à mi-hauteur** » pour un doublage courant ; 1,25 et 1,35 sont la mi-hauteur de 2,50 et 2,70 m. La portée maxi entre appuis dépend de la plaque et de l'entraxe (1,00 à 1,80 m chez Placo) | — | [S1] + [S31b] + [T27] | — | confirmé (2 sources) pour « 1 ligne ≤ 2,70 m » | contradiction | |
| **Règle retenue** | H ≤ 2,70 m : 1 ligne (1 appui par fourrure) ; H > 2,70 m : ⌈H / 1,30⌉ − 1 lignes (portée 1,30 m = BA13 standard Placo), à confirmer selon la plaque | — | [T27][S31b] | — | à confirmer (portée 1,30 m sur 1 source) | — | appuis/m² = lignes / (entraxe × H) : 1 ligne, 0,60, H 2,50 → 0,67/m² (SNIP : 0,60 à 0,80) |

---

## E. Conditionnements incertains de 02

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Ancien (02) | Note |
|---|---|---|---|---|---|---|---|
| Suspente sécable Stil F 530 | **boîte de 50** (« bte50P », E01210050), palette 100 boîtes ; 600 mm ; plénum 20 à 580 mm ; charge admissible 55 kg ; 2 TTPC 35 par suspente | — | fiche Placo, MAJ 31/03/26, via Samse [T23] | piste interne (boîte de 50) ; Intégrale [S2] (55 kg) | confirmé (2 sources) | à confirmer | |
| Suspente pivot Stil SP | boîte de **50** (« SP/bte50P ») ; liaison articulée de tiges filetées | — | fiche Placo SP, MAJ 31/03/26 [T23] | — | 1 source | — | |
| Suspente courte 81 / longue 171 / Maxi 300 | boîte de 100 ; plénum 20–60 / 20–150 / ≤ 280 mm | — | fiches Placo, MAJ 31/03/26 [T23] | ManoMano « set of 100 long 171 » [S29] | confirmé (2 sources) pour la longue ; 1 source courte et Maxi 300 | Maxi : à confirmer (12 en GSB) | la boîte de 12 en GSB est un format bricolage ; en négoce : 100 |
| Suspentes H / HL (hourdis) ; articulée SA | boîte de 100 | — | fiches Placo [T23] | — | 1 source | — | |
| Cavalier Stil F 530 | palette 120 (boîte : non lisible sur la fiche) | — | fiche Placo [T23] | — | à confirmer (boîte non lue) | — | |
| Attache Stil F 530 / SM 8 | boîte de 100 | — | fiches Placo, MAJ 31/03/26 [T23] | Bricomarché (boîte de 100) [S30] | confirmé (2 sources) | 1 source | |
| Vis TRPF 13 Placo | boîte de **500**, palette 768 | — | [T11] | Bricomarché [T35] | confirmé (2 sources) | 1 source | 1000 = autres marques (Klimas TEX) |
| Vis TTPC 45 Placo | 500 et 1500 | — | [T3][T4] | Bricomarché [T9] | confirmé (2 sources) | contradiction | voir C.1 |
| Cornière Stil CR2 | **botte de 30** (« bot30L »), 3,00 m, 0,53 mm, 0,32 kg/ml, palette 1350 | — | fiche Placo CR2, MAJ 18/12/23, via Samse [T28] | extrait moteur fiche Placo CR2 [S27] ; Bricomarché « CR2 3 m » | confirmé (2 sources) | 1 source pour la botte | |
| Cornière d'angle métal (renfort d'angle saillant) | 2,50 m ; botte de 30 (« bot30P »), palette 3000 | — | fiche Placo, MAJ 18/12/23 [T28] | — | 1 source | — | ne pas confondre avec la CR2 |
| Appui Rénovation Stil F 530 | boîte de **50** ; doublage 80 à 200 mm ; palette 84 boîtes | — | fiche Placo, MAJ 31/03/26, via Samse [T23] | — | 1 source | 1 source (≤ 5,30 m) | |
| Appuis Optima2 (Isover) | boîtes de 50 (15-45, 75, 140) ; 40 (75-160) | — | [S31] | Easyfix [S32] | confirmé (2 sources) (inchangé) | confirmé | |
| Éclisse Stil F 530 | 90 mm ; fiche 2023 : boîte de 50 (« bte50P ») ; fiche 31/03/26 : article H87710000, carton de 1,434 kg, nombre par carton non imprimé | — | fiche Placo 18/12/23 [S28] ; fiche 31/03/26 [T23] | — | 1 source pour 50 (cohérent avec le poids : ≈ 25-30 g pièce) | 1 source | à confirmer en négoce que le carton 2026 est toujours de 50 |
| Rail Stil F 530 | 2,35 m, botte de 20 | — | [S26] | — | 1 source (inchangé) | 1 source | |

---

## F. Profilés M 70 / M 90 / M 100 et rails R 70 / R 90 / R 100 (Placo, Knauf, Siniat)

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Ancien (02) | Note |
|---|---|---|---|---|---|---|---|
| Rail Stil R 70 | 0,53 mm ; 0,52 kg/ml ; **3,00 m** (R 70/300 bot10L) ; palette 400 | — | fiche Placo R 70, MAJ 18/12/23, via Samse [T28] | Mr Bricolage / Knauf « rail R70 3 m » [T29] | confirmé (2 sources) | épaisseur à confirmer | |
| Rail Stil R 90 | 0,53 mm ; 0,61 kg/ml ; 3,00 m (R 90/300 bot10L, H84203000) ; palette 320 | — | fiche Placo R 90, MAJ 18/12/23, via BigMat [T30] | Point.P « R 90 – L. 3 m » [S16] | confirmé (2 sources) | épaisseur à confirmer | |
| Rail Stil R 100 | 3,00 m ; bot10L ; palette 320 ; épaisseur non lue | — | [S16] (02) | — | à confirmer (épaisseur : 0,53 très probable, toute la gamme R Placo l'est) | à confirmer | |
| Montant Stil M 70 | 0,59 mm ; 0,73 kg/ml ; ailes 40 ; longueurs 2,40 – 2,49 – 2,59 – 2,79 – 2,99 – 3,59 – 3,99 – 4,99 (bot10L) ; palette 250 | m | fiche Placo M 70, MAJ 24/09/24, via Samse [T31] | fiche 14/02/2017 via Samse (mêmes cotes ; 2,69 m présente en 2017, absente en 2024) [T31] ; SFIC 2,99 m [S21] | confirmé (2 sources) | 1 source pour palette | la 2,69 m a disparu du tarif M 70 |
| Montant Stil M 90 | France : 3,99 m relevée en négoce ; Placo Espagne « Montante 90 » : 0,6 mm, 0,82 kg/ml, 2,99 et 3,99 m | — | SFIC [S21] (02) | extrait moteur fiche Placo España [T32] | à confirmer (fiche française non lue ; Espagne ≠ France) | à confirmer | |
| Montant Stil M 100 | 2,59 et 3,99 m relevées en négoce ; épaisseur non lue | — | [S21] (02) | — | à confirmer | à confirmer | réservé aux plafonds autoportants et grandes hauteurs ; incompatible suspentes MS/MD (extrait) |
| Knauf montants M48/35 à M150/50 | **0,6 mm** pour toute la gamme (M36/40, M48/35, M48/50, M62/35, M70/35, M90/35, M100/35, M125/50, M150/50) | mm | Knauf Bâtiment, « Accessoires pour cloisons – montants », 18/04/2017, via Samse [T33] | knauf.com MA/DZ « Montant 90/40/0,6 » [T34] | confirmé (2 sources) | 1 source (48/35) | doc France de 2017 : seule l'épaisseur est reprise, pas les longueurs |
| Knauf Montant 90/40 : longueur | 3,00 m (page Maghreb) | m | [T34] | — | à confirmer (page hors France) | — | |
| Knauf Rail 70 : longueur, paquet | 3,00 m ; paquet de 10 ; palette 420 | — | knauf.com fr-FR « Rail 70 » (extrait moteur) [T34] | Mr Bricolage « rail R70 3 m Knauf » [T29] | confirmé (2 sources) pour 3 m | — | épaisseur 0,5 mm (page DZ « rail 70/40/0,5 ») : à confirmer en France |
| Siniat Prégymétal M70 / M90 / M100, R70 / R90 / R100 | non trouvés (fiches print2pdf non lues) | — | — | — | à confirmer | à confirmer | |

---

## Bilan

Recherches : 17 recherches web et ≈ 15 lectures de PDF (dont ≈ 60 fiches Placo/Knauf téléchargées en série chez
Samse et BigMat, une quarantaine lues), dans le budget de ~40.

Décompte des lignes de tableau de ce fichier (script sur la colonne Statut ; une ligne peut porter plusieurs chiffres) :

| Statut | Nombre |
|---|---|
| Lignes au total | 96 |
| confirmé (2 sources) (y compris lignes confirmées en partie) | 52 |
| 1 source | 29 |
| contradiction (détail), expliquée | 4 |
| à confirmer | 11 |

Taux de confirmation ≈ 54 % (02 : 46 %). Corrections et décisions par rapport à 02 :
1. **2e peau de 2 BA13 : TTPC 35** (fiche Placo TTPC 35 : 25 mm de plaques sur métal). La TTPC 45 est pour 35 mm.
2. **1 BA15 : TTPC 35, pas TTPC 25** (fiche Placo TTPC 25 : une plaque de 13 mm seulement). Correction de 02.
3. Conditionnements Placo réels : TTPC 25 et 35 en boîtes de 500, 1000 et 1500 ; TTPC 45 en 500 et 1500 ;
   TTPC 55, 70, 80 en 300 ; TRPF 13 en 500 ; suspente sécable et pivot en 50 ; suspentes courte, longue, Maxi 300,
   H, HL, SA en 100 ; attaches en 100 ; appui Rénovation en 50 ; cornière CR2 en botte de 30.
4. NF DTU 25.41 en vigueur : **février 2022**.
5. Les trois contradictions de 02 sont expliquées : vis 22/30 (vis dans les rails + chutes, retenir 30 SNIP) ;
   suspentes 1,56/1,8 (taille de la pièce, calculer au plan, 1,8 par défaut) ; appuis 1,25/1,35 (même règle :
   une ligne à mi-hauteur jusqu'à 2,70 m).
6. Vis Habito (25 : boîte 250 ; 41 : boîte 800), vis Fermacell (3,9 × 30 simple, 3,9 × 45 double, pas 25 cm,
   20 vis/m² par face), Hilti GX 3 (X-C 20 G3 MX, boîte 1200, gaz GC 40/41/42) : trouvés.

Reste « à confirmer » :
1. Distance maxi entre l'extrémité d'une barre de rail et sa 1re fixation : aucune source après deux passes
   (Siniat, Placo, guide DTU 2022, Pladur, Rockwool, Knauf) ; le nombre de fixations par barre reste un calcul.
2. TTPC 45 Placo en boîte de 1000 (citée par un extrait, absente des fiches 2024 et 2026).
3. Éclisse F 530 : carton de 50 sur la fiche 2023, nombre non imprimé sur la fiche 2026.
4. Cavalier F 530 : contenance de la boîte.
5. Montants Stil M 90 et M 100, rail R 100 : épaisseur et longueurs françaises (fiches non trouvées hors placo.fr).
6. Knauf : longueurs France des montants 90/40 et épaisseur du rail 70 (pages hors France).
7. Siniat Prégymétal M/R 70-90-100 : rien de lisible.
8. Nombre de tirs par cartouche Hilti (1 source) ; clous Spit (1 source, inchangé).
9. Clou de 25-30 mm sur chape ou béton jeune : pratique non sourcée.
10. Portée entre lignes d'appuis au-delà de 2,70 m (1,30 m BA13 Placo sur un seul extrait).
11. Pladur 41 vis/m² : hypothèse non dite, non retenue.

---

## Sources

Consultées le 19 novembre 2026. « via Samse » = fiche Placo officielle (en-tête www.placo.fr) servie par
medias.groupe-samse.fr ; texte extrait du PDF en entier.

1. [T1] Placo, fiche produit Vis TTPC 25, MAJ 23/07/2026, via Samse — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_903610.pdf (lue).
2. [T2] Placo, fiche produit Vis TTPC 35, MAJ 23/07/2026, via Samse — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_903612.pdf (et 903611, même fiche) (lue).
3. [T3] Placo, fiche produit Vis TTPC 45, MAJ 23/07/2026, via Samse — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_903613.pdf (lue).
4. [T4] Placo, fiche Vis TTPC 45, MAJ 21/10/2024, via BigMat — https://medias.bigmat.fr/data_medias/medias_finaux/documents/3496250214811-ZVyGExxQb0.pdf (lue).
5. [T5] Placo, fiche Vis TTPC 55, MAJ 31/03/2026, via Samse — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_903614.pdf (lue).
6. [T6] Placo, fiche Vis TTPC 55, MAJ 18/12/2023, via BigMat — https://medias.bigmat.fr/data_medias/medias_finaux/documents/3496250214873-A66YEpmONX.pdf (lue).
7. [T7] Placo, fiche Vis TTPC 70, MAJ 31/03/2026, via Samse — https://private.samse.fr/catalogueWs/Fiche_technique/Fiche_technique_903615.pdf (lue).
8. [T8] Placo, fiche Vis TTPC 80 (date non imprimée), via Samse — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_903616.pdf (lue).
9. [T9] Négoces / GSB, boîtes Placo : Brico Dépôt TTPC 25 « 500 pièces » https://www.bricodepot.fr/catalogue/vis-plaque-de-platre-ttpc-25-8-x-25-mm-500-pieces/prod76800/ ; TTPC 35 « boîte de 500 » https://www.bricodepot.fr/p/3496250214750/boite-de-500-vis-plaque-de-platre-ttpc-8-x-35-mm ; Bricomarché TTPC 45 boîte 500 https://www.bricomarche.com/p/vis-ttpc-45mm-boite-de-500-pieces/3496250214811 et 1500 https://www.bricomarche.com/p/vis-autoperceuse-placor-ttpc-45-boite-de-1500-pieces/3496250214842 ; Castorama TTPC 35 1500 https://www.castorama.fr/1500-vis-autoperceuse-ttpc-35-placo-d-8-mm-long-35-mm/3496250214781_CAFR.prd ; Castorama TTPC 55 300 https://www.castorama.fr/lot-de-300-vis-autoperceuses-ttpc-55-placo-/3496250214873_CAFR.prd ; Bricomarché TTPC 70 300 https://www.bricomarche.com/p/vis-autoperceuse-placor-ttpc-70-boite-de-300-pieces/3496250214903 (extraits moteur).
10. [T10] Placo, fiches Vis THB 25 (boîte 1000) et THB 45 (seau 1000), via Samse — Fiche_technique_903625.pdf, 903627.pdf (lues).
11. [T11] Placo, fiche Vis TRPF 13, MAJ 05/11/2024, via Samse — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_903621.pdf (lue).
12. [T12] Placo, fiche Vis TTPF 35, MAJ 31/03/2026, via Samse — Fiche_technique_903617.pdf (lue).
13. [T13] Placo, fiches Vis HB 25 / HB 41 (Placocem), via Samse — Fiche_technique_903623.pdf, 903624.pdf (lues).
14. [T14] Placo, fiches Pointe TC 35 et TF 35, via Samse — Fiche_technique_903628.pdf, 903629.pdf (lues).
15. [T15] Placo, fiches Vis Habito 25 (MAJ 31/03/2026) et Habito 41 — https://www.placo.fr/documents/fiche-technique/fichetechnique-vis-habito-25.pdf ; https://www.placo.fr/documents/fiche-technique/fichetechnique-vis-habito-41.pdf (extraits moteur, 403 en direct) ; Bricomarché Habito 25 boîte 250 https://www.bricomarche.com/p/vis-pour-plaque-de-platre-habito-25/3496250341470 (extrait).
16. [T16] Fermacell, Guide de pose (édition non datée, ancienne : classement M0), via BigMat — https://medias.bigmat.fr/data_medias/medias_finaux/documents/4007548000314-R4PFgZyjzA.pdf (lu, tableaux 3 et 4). Utilisé car les vis et les pas Fermacell n'ont pas changé de désignation (3,9 × 30 / 45 toujours vendues, cf. [T17]) ; pas à revérifier sur le guide Fermacell actuel.
17. [T17] Vis Fermacell en négoce : Leroy Merlin https://www.leroymerlin.fr/produits/vis-autoperceuses-fermacell-pour-plaques-rigides-3-9-mm-conditionnement-par-1000-longueur-mm-40-94053112.html ; Bricomarché 3,9 × 22 https://www.bricomarche.com/p/fermacell-vis-3.9-x-22-mm/4007548001694 ; Hornbach CH https://www.hornbach.ch/fr/p/vis-pour-plaque-de-platre-renforcee-de-fibres-vis-pour-construction-rapide-tete-fraisee-avec-empreinte-cruciforme-3-9-x-30-mm-phosphatee-1000-pieces/3831001/ ; Makita en bande https://www.kaufland.fr/product/379499338/ (extraits moteur).
18. [T18] CAPEB UNA MTPI, UMPI-FFB, SNIP, « Guide NF DTU 25.41 – les principales nouveautés 2022 » — https://www.capeb.fr/www/capeb/media//morbihan/document/2022_Guide%20DTU%2025-41_DEF_HD_WEB.pdf (lu en entier).
19. [T19] Catalogue « Chevilles à frapper FLASHfix » (distributeur, pied de page daté 28/03/2008), via Hellopro — https://hellopro.fr/documentation/pdf_prod/2/6/7/902606_1a08de9df0efa23ecf7751e4bc7b0d8d_1173762.pdf (lu). Ancien : utilisé seulement pour le format 5 × 25 « rails plaque de plâtre » et la boîte de 200 ; produit de même type toujours vendu.
20. [T20] Fischer N 6 × 40 (« rails et profilés métalliques ») : Brico.be https://www.brico.be/fr/quincaillerie/fixations-techniques/chevilles-ancrage/chevilles-a-frapper/cheville-a-frapper-fischer-n-en-nylon-diam-6x40-mm-50-pieces/5362939 ; Brico Dépôt https://www.bricodepot.fr/p/4006209434598/chevilles-a-frapper-n-6x40-en-nylon-fixation-sure-pour-beton-et-briques-50-pieces (extraits).
21. [T21] Hilti, X-C G3 MX (clous béton pour GX 3) — https://www.hilti.co.uk/r4421639 ; https://www.hilti.in/c/CLS_FASTENER_7135/CLS_NAILS_7135/r4421639 ; guide de choix Hilti France https://hilti.fr/media-canonical/ASSET_DOC_LOC_5879343_APC_RAW (extrait moteur, 404 en direct) ; Industrybuying https://www.industrybuying.com/hilti-FAM180715/ (extraits).
22. [T22] Hilti, cartouches GC 41 / GC 42 — https://www.hilti.ca/c/CLS_DIRECT_FASTENING/CLS_DX_PROPELLANTS2/CLS_DX_PROP2_GASCAN/r7528982 ; FAQ GX https://www.hilti.fr/content/dam/documents/pdf/e2/fr/Questions_frequentes_GX2%20.pdf (extraits moteur).
23. [T23] Placo, fiches accessoires Stil F 530, MAJ 31/03/2026, via Samse — Fiche_technique_903606 (suspente longue), 903607 (courte), 903608 (sécable), 903609 (cavalier), 903630 (appui Rénovation), 903633 (Maxi 300), 903634 (HL), 903635 (H), 903636 (éclisse), 903640 (attache F 530), 903643 (attache SM 8), 903644 (articulée SA), 903646 (pivot SP) — préfixe https://medias.groupe-samse.fr/Fiche_technique/ (lues).
24. [T24] AFNOR, NF DTU 25.41 (février 2022, en vigueur) — https://www.boutique.afnor.org/fr-fr/norme/nf-dtu-2541/travaux-de-batiment-ouvrages-en-plaques-de-platre-partie-11-cahier-des-clauses-te/fa204809/321490 (extrait moteur).
25. [T25] Extrait d'un forum (forumconstruire.com) citant le NF DTU 25.41 § 6.3.4.1 (« rails fixés mécaniquement au maximum tous les 0,60 m ») — URL exacte non retenue par le moteur ; compté comme indice seulement, la confirmation vient de [S5b] et [S2].
26. [T26] Pladur, « Cloison distributive Pladur – parement simple 1 200 mm », Rev. 03/2019 — https://entreprise.pladur.com/siteassets/page-assets/interactive-selector/cloisons-dist-parements-simples-1200.pdf (lu).
27. [T27] Placo, L'Intégrale 2021-2022 « Doublage Placostil avec appui sur fourrures Stil F 530 » — https://www.placo.fr/sites/mac3.placo.fr/files/files/forum/L%27Int%C3%A9grale%20Placo%202021-2022-%20Doublage%20Placostil%C2%AE%20avec%20appui%20sur%20fourrures%20Stil%C2%AE%20F%20530.pdf (extraits moteur ; PDF non lu).
28. [T28] Placo, fiches Rail Stil R 48 (7972), Rail R 70 (7973), Cornière CR2 (7986), Cornière d'angle métal (7988), MAJ 18/12/2023, via Samse — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_7973.pdf etc. (lues).
29. [T29] Mr Bricolage, « profilé métallique rail R70 3 m Knauf » — https://www.mr-bricolage.fr/profile-metallique-rail-r70-3m-knauf.html (extrait moteur).
30. [T30] Placo, fiche Rail Stil R 90, MAJ 18/12/2023, via BigMat — https://medias.bigmat.fr/data_medias/medias_finaux/documents/3496250050013-JWVglwZegY.pdf (lue).
31. [T31] Placo, fiches Montant Stil M 70 : MAJ 24/09/2024 (Fiche_technique_36322 et 36323) et 14/02/2017 (36320), via Samse (lues).
32. [T32] Placo España, « ft placo montante 90 fr » — https://www.placo.es/documents/fichas-tecnicas/ft-placo-montante-90-fr.pdf (extrait moteur ; produit espagnol).
33. [T33] Knauf Bâtiment, « Accessoires pour cloisons – montants », dernière modification 18/04/2017, via Samse — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_87644.pdf (lue).
34. [T34] Knauf, pages produit Montant 90/40 (MA/DZ) et Rail 70 (fr-FR, fr-DZ) — https://knauf.com/fr-MA/p/produit/montant-c-90-40-0.6-22814_0096 ; https://knauf.com/fr-FR/p/produit/rail-70-22835_4091 ; https://knauf.com/fr-DZ/p/produit/rail-70-40-0-5-10101_4068 (extraits moteur).
35. [T35] Bricomarché, Vis TRPF 13 Placo boîte de 500 (extrait moteur relevé en 02).
36. Sources [S1] à [S44] : voir `02-ossatures-fixations.md`.
