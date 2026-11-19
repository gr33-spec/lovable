# 04 — Isolants, pare-vapeur et étanchéité à l'air (recherche du 19-20/11/2026)

Thème : isolation toutes familles (rouleaux, panneaux, vrac), pare-vapeur / frein-vapeur, étanchéité à l'air.
Méthode : consignes `_consignes.md`. Chaque ligne indique deux sources quand elles existent ; sinon statut « 1 source » ou « à confirmer ».
Le curl direct est bloqué : données lues par WebFetch (fiches PDF fabricant ou négoce) ou, à défaut, extraits de moteur de recherche (signalé « extrait »).
Date de consultation de toutes les URL : 19/11/2026 sauf mention contraire.

Convention : R donné par le fabricant (certificat ACERMI), jamais recalculé, sauf mention « R calculé = e/λ ».



## Constat de méthode (important pour le référentiel)

- isover.fr, placo.fr et `isover.fr/download-documents` renvoient 403 à WebFetch. Les fiches Isover ont été lues **sous forme de copie PDF hébergée par les négoces** (medias.groupe-samse.fr, chausson.fr, envain-materiaux.fr), puis converties en texte (`pdftotext`). Ce sont des documents fabricant (en-tête Isover, « Mise à jour le … »), donc comptés comme source fabricant ; la 2e source est une fiche négoce/GSB indépendante (Point.P, Brico Dépôt, Bricomarché, SFIC, Chausson fiche article…).
- **Les longueurs de rouleau changent d'une édition à l'autre** (ex. Isoconfort 35 kraft 200 mm : 2,20 m dans une fiche ancienne, 3,00 m en 2026 ; Isoconfort 35 nu 100 mm : 4,50 m puis 5,50 m). Le R par épaisseur, lui, est stable. **Conséquence produit : ne jamais coder un m²/rouleau sans date de fiche ; le négoce peut livrer un ancien stock.** Le calcul doit partir du m²/rouleau de la référence choisie, et l'arrondi au rouleau se faire sur ce chiffre.
- Le R est toujours celui du certificat ACERMI imprimé sur la fiche (arrondi à 0,05 inférieur). Un R recalculé (e/λ) est signalé « R calculé ».

## A. Rouleaux et panneaux

### A1. Laine de verre Isover (Saint-Gobain)

#### A1.1 GR 32 Roulé Revêtu Kraft — murs (doublage sur ossature Optima), λ 0,032, ACERMI 02/018/100

Largeur 1,20 m, 1 rouleau par colis. Usage : doublage de murs (Optima), cloisons de doublage.

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note |
|---|---|---|---|---|---|---|
| λ | 0,032 | W/(m·K) | [S1] fiche Isover MAJ 24/04/26 | [S2] fiche Isover MAJ 13/05/24 ; [S5] Batiproduits | confirmé (2 sources) | |
| 60 mm | R 1,85 ; 8,10 m ; 9,72 m²/rlx ; 12 rlx/pal | | [S1] | [S2] | confirmé (2 sources) | dispo « sur fabrication » (B) |
| 75 mm | R 2,35 ; 8,10 m ; 9,72 m² ; 12/pal | | [S1] | [S2] | confirmé (2 sources) | stock |
| 85 mm | R 2,65 ; 5,40 m ; 6,48 m² ; 12/pal | | [S1] | [S2] | confirmé (2 sources) | |
| 100 mm | R 3,15 ; 2,70 m ; 3,24 m² ; 30/pal | | [S1] | [S2] + [S3] Brico Dépôt « 100 mm R 3,15 2,7 × 1,2 m » | confirmé (2 sources) | réf. 83304 |
| 120 mm | R 3,75 ; 2,70 m ; 3,24 m² ; 30/pal | | [S1] | [S2] + [S4] Bricomarché « 2,70 × 1,20 m ép. 120 » | confirmé (2 sources) | réf. 83311 ; seule épaisseur ≥ R 3,7 « aides murs » en une couche avec 140/160 |
| 140 mm | R 4,35 ; 2,70 m ; 3,24 m² ; 24/pal | | [S1] | [S2] | confirmé (2 sources) | |
| 160 mm | R 5,00 ; 2,70 m ; 3,24 m² ; 24/pal | | [S1] | [S2] | confirmé (2 sources) | |

Les deux éditions (2024 et 2026) sont identiques : valeurs stables. Les R sont en outre ceux du certificat ACERMI **02/018/100/35** (16/05/2025 ; GR 32 Revêtu Kraft, Roulé Revêtu Kraft, Roulé Kraft Alu ; 45 à 180 mm ; 45 mm = R 1,40, 180 mm = R 5,60) [S64] — 3e source indépendante.

#### A1.2 GR 32 panneaux (nu / revêtu kraft) — 1,35 × 0,60 m, λ 0,032

Usage : cloisons et doublages ; le **GR 32 nu 45 mm** est l'isolant type de la cloison 72/48.

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|
| GR 32 Nu 45 mm | **R 1,40** ; 15 pan/paquet = 12,15 m² ; 20 paq/pal (243 m²) | | [S6] fiche Isover GR 32 Nu (copie Chausson, non datée) : imprime R 1,45 | [S63] ACERMI 02/018/098/27 (16/05/2025, GR 32 Nu / GR 32 Roulé Nu / Cladipan 32 Nu) : **45 mm = R 1,40** | contradiction (résolue) | La fiche (ancienne) dit 1,45, le certificat en vigueur et e/λ (1,41) disent 1,40 : **retenir 1,40**. Colisage : 1 source ; dispo B (sur fabrication). |
| GR 32 Nu 60 mm | R 1,85 ; 12 pan/paq = 9,72 m² ; 16 paq/pal | | [S6] | [S63] R 1,85 | confirmé (2 sources) pour R ; colisage 1 source | |
| GR 32 Nu 100 mm | R 3,15 ; 8 pan/paq = 6,48 m² | | [S6] | [S63] R 3,15 | confirmé (2 sources) pour R | |
| GR 32 Nu 120 / 140 / 160 mm | R 3,75 / 4,35 / 5,00 ; 5 pan/paq = 4,05 m² | | [S6] | [S63] | confirmé (2 sources) pour R | |
| GR 32 Revêtu Kraft panneau 60→160 mm | 60 : R 1,85, 12 pan (9,72 m²) ; 75 : R 2,35, 10 pan (8,1 m²) ; 85 : R 2,65, 9 pan (7,29) ; 100 : R 3,15, 8 pan (6,48) ; 120/140/160 : R 3,75/4,35/5,00, 5 pan (4,05) | | [S7] fiche Isover GR 32 Revêtu Kraft (copie Chausson, date non lisible) | [S8] Castorama « GR32 kraft 1,35 × 0,6 m ép. 75 » (format seul) | confirmé (2 sources) pour le format ; 1 source pour le colisage | pas de 45 mm en kraft |

#### A1.3 Isoconfort 35 Revêtu Kraft — combles aménagés / rampants, λ 0,035, ACERMI 05/018/408

Largeur 1,20 m (certaines épaisseurs en 0,60 m, 2 rouleaux/colis). Fiche Isover MAJ 24/03/26 [S9].

| Épaisseur | R | Longueur | m²/colis | Colis/pal | Source 1 | Source 2 | Statut |
|---|---|---|---|---|---|---|---|
| 160 | 4,55 | 3,70 m | 4,44 | 30 | [S9] 24/03/26 | [S10] fiche gamme Isoconfort ancienne (85092 : 4,55, 3,70 m) | confirmé (2 sources) |
| 180 | 5,10 | 3,30 m | 3,96 | 30 | [S9] | [S10] R 5,10 (longueur ancienne 2,30 m) | R confirmé ; longueur 1 source (2026) |
| 200 (1,20 m) | 5,70 | 3,00 m | 3,60 | 30 | [S9] | [S10] (85093 : 5,70, 3,00 m) | confirmé (2 sources) |
| 200 (0,60 m ×2) | 5,70 | 3,00 m | 3,60 | 30 | [S9] | — | 1 source |
| 220 (1,20 m) | 6,25 | 2,80 m | 3,36 | 24 | [S9] | [S10] (73922 : 220 mm R 6,25, longueur ancienne 2,10 m) | confirmé (2 sources) pour R ; longueur 1 source (2026) |
| 240 | 6,85 | 2,60 m | 3,12 | 24 | [S9] | [S10] R 6,85 | R confirmé ; longueur 1 source |
| 260 | 7,40 | 2,40 m | 2,88 | 24 | [S9] | — | 1 source |
| 280 | 8,00 | 2,00 m | 2,40 | 24 | [S9] | — | 1 source |
| 300 | 8,55 | 2,00 m | 2,40 | 24 | [S9] | [S12] Batiproduits « Isoconfort 35 Kraft 300 mm » (existence) | 1 source pour les chiffres |

R certifiés : ACERMI **05/018/408/35** (16/07/2025 ; Isoconfort 35 Revêtu Kraft ; 45 à 300 mm ; 160 = 4,55 ; 200 = 5,70 ; 220 = 6,25 ; 260 = 7,40 ; 300 = 8,55) [S68] → **tous les R du tableau : confirmé (2 sources)** ; les longueurs 2026 restent 1 source.

Usage : 2e couche sous chevrons sur suspentes Intégra 2, ou monocouche ; en rampants, R ≥ 6 pour les aides → **220 mm minimum** (R 6,25).

#### A1.4 Isoconfort 35 Nu — 1re couche entre chevrons, λ 0,035

| Épaisseur | R | Longueur (fiche ancienne [S10b]) | m²/colis | Colis/pal | Statut | Note |
|---|---|---|---|---|---|---|
| 60 | 1,70 | 10,0 m | 12,0 | 30 | confirmé (2 sources) : [S10b] + fiche nu 24/03/26 relevée dans `isolation.md` (non relue ici, placo.fr 403) | |
| 80 | 2,25 | 7,0 m | 8,4 | 30 | idem | |
| 100 | 2,85 | 5,5 m | 6,6 | 30 | idem | |
| 120 | 3,40 | 4,7 m | 5,64 | 30 | idem | |
| 140 | 4,00 | 4,0 m | 4,8 | 30 | idem | |

[S10b] = fiche Isover « Isoconfort 35, voile confort » (copie Chausson 211133, non datée) ; l'ancienne fiche gamme [S10] donnait 7,0 / 5,3 / 4,5 / 3,9 / 3,4 m pour 60→140 : **les longueurs ont changé, les R non**. Statut longueurs : « à confirmer (édition) » tant que la fiche nu 2026 n'est pas relue directement.

#### A1.5 Isoconfort 32 Revêtu Kraft / Nu, λ 0,032, ACERMI 13/018/808

| Donnée | Valeur | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|
| 200 mm kraft | R 6,25 (aides rampants en une couche) | [S13] extrait fiche Isover MAJ 24/03/26 | [S65] ACERMI 13/018/808/12 | confirmé (2 sources) | format : `isolation-des-combles.md` cite 1,20 × 2,20 m, 2,64 m², 24/pal (non relu ici → à confirmer) |
| Isoconfort 32 Nu | 60 : 1,85 ; 80 : 2,50 ; 100 : 3,10 ; 120 : 3,75 ; 140 : 4,35 ; 160 : 5,00 | [S66] ACERMI | — | 1 source officielle | longueurs non lues |
| 45 mm (cloison) | **n'existe pas** : le certificat Isoconfort 32 Revêtu Kraft ne couvre que 200 mm, celui de l'Isoconfort 32 Nu commence à 60 mm | [S65] ACERMI 13/018/808/12 (16/05/2025 : 200 mm R 6,25 seul) | [S66] ACERMI 08/018/540/19 (29/01/2026 : nu 60 → 160 mm) | confirmé (2 sources) | Un devis « Isoconfort 32 45 mm » est une erreur de désignation : proposer GR 32 Nu 45 (R 1,40) |
| Tableau longueurs | non lu | — | — | à confirmer | fiche isover.fr / placo.fr inaccessible |

#### A1.6 IBR Revêtu Kraft — combles perdus, plafonds, λ 0,040, ACERMI 02/018/052

Largeur 1,20 m. Fiche Isover « MAJ 23/04/26 » vue en extrait de moteur (« jusqu'à R = 10 pour une couche d'IBR 400 mm ») [S15].

| Épaisseur | R | Longueur | m²/rlx | Source 1 | Source 2 | Statut |
|---|---|---|---|---|---|---|
| 100 | 2,50 | 8,0 m | 9,60 | [S16] Point.P A1171215 « 8 × 1,2 m R 2,5 » | [S17] Tessella 9,60 m² | confirmé (2 sources) |
| 140 | 3,50 | 4,0 m | 4,80 | [S18] La Maison Naturelle « 140 mm 1,2 × 4 m R 3,5 » | — | 1 source |
| 160 | 4,00 | 5,5 m | 6,60 | [S18b] LMN « 160 mm 1,2 × 5,5 m R 4 » | brochure Isover 2013 citée par `isolation.md` (non relue) | 1 source (2e non relue) |
| 200 | 5,00 | 4,5 m | 5,40 | [S17] Tessella 5,40 m² | brochure 2013 (non relue) | 1 source + recoupement Tessella/recherche (longueur cohérente) — à confirmer sur fiche 2026 |
| 240 | 6,00 | 3,5 m | 4,20 | [S19] Bricomarché « 3,5 × 1,2 m 240 mm » | brochure 2013 (non relue) | 1 source + recoupement Tessella/recherche (longueur cohérente) — à confirmer sur fiche 2026 |
| 260 | 6,50 | 3,0 m | 3,60 | [S20] Bricomarché « 260 mm 3 × 1,2 m » | brochure 2013 (non relue) | 1 source + recoupement Tessella/recherche (longueur cohérente) — à confirmer sur fiche 2026 |
| 300 | 7,50 | 2,6 m | 3,12 | [S21] SFIC A3147602 « 2,6 × 1,2 m R 7,50 » | [S17] Tessella 3,12 m² ; fiche Isover 2017 [S22] | confirmé (2 sources) |
| 320 | 8,00 | 2,4 m | 2,88 | [S22] fiche Isover 08/12/2017 | Edibatec : fin de dispo 04/01/2018 | **contradiction** : référence peut-être arrêtée |
| 400 | 10,0 | 2,0 m | 2,40 | [S15] (R) | [S3b] Brico Dépôt « 400 mm R 10 2 × 1,2 m » | confirmé (2 sources) |
| Rouleaux/palette | 24 (300) d'après fiche 2017 ; autres non lus | | | [S22] | — | à confirmer |

**R certifiés** : tout le tableau R ci-dessus est confirmé par le certificat ACERMI **02/018/052/29** (16/05/2025 ; IBR Revêtu Kraft, IBR Contact, IBR Phonic ; λD 0,040 ; 45 à 400 mm, ex. 100 = 2,50, 140 = 3,50, 260 = 6,50, 300 = 7,50, 320 = 8,00, 400 = 10,00) [S67] → R : confirmé (2 sources) ; les longueurs restent celles des négoces.

R ≥ 7 en combles perdus pour les aides : **300 mm** (R 7,5) en une couche, ou deux couches croisées (ex. 100 + 200 = R 7,5).

#### A1.7 IBR Revêtu Alu / IBR Contact

| Produit | Données | Source | Statut |
|---|---|---|---|
| IBR Revêtu Alu (pare-vapeur alu) | 100 : R 2,5, 10,5 m, 12,6 m² ; 120 : R 3, 9 m ; 160 : R 4, 7 m ; 200 : R 5, 6 m, 7,2 m² ; 240 : R 6, 4 m, 4,8 m² ; 12 rlx/pal | [S23] fiche Isover (copie Chausson 211140, non datée) | 1 source |
| IBR Contact (nu) | 100 : R 2,5, 8 m ; 160 : R 4, 5,5 m ; 180 : R 4,5, 5 m ; 200 : R 5, 4,5 m ; 220 : R 5,5, 4 m ; 36 rlx/pal | [S24] brochure Isover IBR Contact (copie Chausson 203039, non datée) | 1 source |

#### A1.8 Autres repères Isover
- Isofaçade 32R (ossature bois / ITE bardage, hors plaquiste) : 0,55-0,60 m de large, 80 mm R 2,5 → 200 mm R 6,25 ; fiche MAJ 25/03/26 [S25]. 1 source.
- Isover « Alu » (GR 32 Roulé Revêtu Kraft Alu) : existe [S5b] ; tableau non lu → à confirmer.
- Isover laine de roche : non étudiée (Isover France vend surtout de la laine de verre ; à confirmer si une gamme « roche » est encore distribuée en FR).

### A2. Laine de roche Rockwool France

#### A2.1 Rockmur nu / Rockmur kraft — cloisons et doublages, λ 0,035, panneaux 1350 × 600 mm (0,81 m²)

Fiche Rockwool France **01/2026** [S26] (lue en PDF, `rockwool.com/siteassets/rw-f/.../rockwool_fp_rockmur_nu.pdf`).

| Épaisseur | R | Nu : pan/colis (m²) | Kraft : pan/colis (m²) | Colis/pal | Source 2 | Statut |
|---|---|---|---|---|---|---|
| 40 | 1,10 | 12 (9,72) | 14 (11,34) | 12 | [S27] Brico Dépôt « Rockmur 40 mm 1,35 × 0,6 m 14 panneaux » (kraft) | confirmé (2 sources) |
| 60 | 1,70 | 12 (9,72) | 12 (9,72) | 12 | tarif Rockwool 2022 (extrait) R 1,70 | confirmé (2 sources) pour R |
| 75 | 2,10 | 10 (8,10) | 10 (8,10) | 12 | [S28] Castorama « Rockmur kraft 75 mm lot de 10 » | confirmé (2 sources) |
| 100 | 2,85 | 8 (6,48) | 8 (6,48) | 12 | [S29] Brico Dépôt « 8 panneaux kraft 100 mm » | confirmé (2 sources) |
| 120 | 3,40 | 6 (4,86) | 6 (4,86) | 12 | tarif 2022 R 3,40 | confirmé (2 sources) pour R |
| 130 | 3,70 | 5 (4,05) | 5 (4,05) | 12 | tarif 2022 R 3,70 | confirmé (2 sources) pour R |
| 140 | 4,00 | 5 (4,05) | 5 (4,05) | 12 | tarif 2022 R 4,00 | confirmé (2 sources) pour R |
| **45** | 1,25 | — | — | — | tarif public 2022 (R 1,25) ; Castorama/Brico Dépôt « Rockmur kraft 45 mm lot de 14 » encore en ligne | **contradiction** : le 45 mm **n'apparaît plus** dans la fiche 01/2026 (remplacé par 40 mm R 1,10). Stock résiduel possible en GSB. Pour 72/48 : commander **Rockmur 40** (ou 45 si le négoce en a). |

Masse volumique 40 kg/m³ (40 mm), 32 kg/m³ (45-140) [S26]. Rw cloison 72/48 BA13 + Rockmur 40 : 42 (-4 ; -10) dB [S26].

#### A2.2 Rockcalm — cloisons acoustiques (panneau rigide), λ 0,035, 1350 × 600 mm, ACERMI 04/015/301

| Donnée | Valeur | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|
| Épaisseurs / R | 40 : 1,10 ; 50 : 1,40 ; 60 : 1,70 ; 80 : 2,25 | [S30] fiche Rockwool Rockcalm (copie Ciffreo Bona, éd. 2011) | [S31] fiche Rockcalm (copie Samse 7932, éd. 2015 : 40 mm R 1,10) | confirmé (2 sources) pour 40 mm ; 1 source au-delà | **documents anciens (2011-2015)** ; fiche 2026 non trouvée → statut produit « à confirmer (toujours au catalogue ?) » |
| Rockcalm 45 mm | **certifié** R 1,25 (certificat Rockcalm 20 → 150 mm, λD 0,035) | [S69] ACERMI 04/015/301/14 (16/05/2025) | — | 1 source officielle | les fiches anciennes ne listent que 40/50/60/80 ; disponibilité réelle du 45 au négoce : **à confirmer** |
| Rw 72/48 BA13 + Rockcalm 40 | 42 (-3 ; -9) dB | [S30] | [S31] | confirmé (2 sources) | |
| Colisage | non lu | — | — | à confirmer | |

#### A2.3 Rockplus Premium kraft — rampants / doublages, λ 0,032, 1350 × 600 mm

Fiche Rockwool **01/2026** [S32].

| Épaisseur | R | pan/colis | m²/colis | Colis/pal | Statut |
|---|---|---|---|---|---|
| 75 | 2,30 | 4 | 3,24 | 16 | 1 source |
| 101 | 3,15 | 3 | 2,43 | 16 | 1 source |
| 120 | 3,75 | 3 | 2,43 | 12 | confirmé (2 sources) : [S32] + [S33] Castorama « Rockplus premium 120 mm R 3,75 lot de 3 » |
| 140 | 4,35 | 4 | 3,24 | 8 | 1 source |
| 160 | 5,00 | 2 | 1,62 | 16 | 1 source |
| 180 | 5,60 | 2 | 1,62 | 12 | 1 source |
| 200 | 6,25 | 2 | 1,62 | 12 | 1 source |

Note : il existe deux codes par épaisseur (kraft « combles aménagés » et kraft « murs »), mêmes valeurs. « Rockplus kraft » en rouleau λ 0,035 : **non trouvé** (le rouleau Rockwool est le Roulrock).

#### A2.4 Roulrock kraft — combles perdus / planchers, λ 0,040 (60-160) / 0,039 (200), largeur 1,20 m

Fiche Rockwool **03/2026** [S34].

| Épaisseur | R | Longueur | m²/rlx | Rlx/pal | Source 2 | Statut |
|---|---|---|---|---|---|---|
| 60 | 1,50 | 8,0 m | 9,60 | 18 | — | 1 source |
| 80 | 2,00 | 6,0 m | 7,20 | 18 | — | 1 source |
| 100 | 2,50 | 5,0 m | 6,00 | 18 | [S35] Brico Dépôt « Rockwool kraft 100 mm 5 × 1,2 m » ; Bricomarché 5000 × 1200 × 100 | confirmé (2 sources) |
| 140 | 3,50 | 3,5 m | 4,20 | 18 | — | 1 source |
| 160 | 4,00 | 3,0 m | 3,60 | 18 | — | 1 source |
| 200 | 5,10 | 2,4 m | 2,88 | 18 | — | 1 source |

« Rockroll » : nom **non trouvé** en France (le rouleau Rockwool FR s'appelle Roulrock kraft / kraft perforé / alu). À confirmer si le devis le cite.

#### A2.5 Laine de roche Knauf Insulation / Isover roche
- Knauf Insulation France : pas de gamme laine de roche grand public trouvée (Knauf Insulation FR = laine de verre « ECOSE » + PSE/XPS). À confirmer.
- Isover : gamme laine de roche (« Isover roche ») non trouvée dans les sources consultées ; à confirmer.

### A3. Laine de verre URSA France (groupe Etex)

#### A3.1 URSA PRK 32 (panneau) — 1350 × 600 mm, λ 0,032, kraft quadrillé, « Mupan » = nom espagnol, non utilisé en France

Fiche URSA (copie Chausson 248384, non datée ; mentions « NOUVEAU » 180/200) [S36].

| Épaisseur | R | pan/colis | m²/colis | Colis/pal | Source 2 | Statut |
|---|---|---|---|---|---|---|
| **45** | **1,40** | 13 | 10,53 | 12 | [S37] fiche distributeur (Anjou Connectique) « 45 mm R 1,40 1350 × 600 » (extrait) | confirmé (2 sources) pour R/format ; colisage 1 source ; dispo « D » (sur demande) |
| 60 | 1,85 | 10 | 8,10 | 12 | — | 1 source |
| 75 | 2,30 | 8 | 6,48 | 12 | — | 1 source |
| 85 | 2,65 | 7 | 5,67 | 12 | — | 1 source |
| 101 | 3,15 | 6 | 4,86 | 12 | — | 1 source |
| 120 | 3,75 | 5 | 4,05 | 12 | — | 1 source |
| 140 / 160 / 180 / 200 | 4,35 / 5,00 / 5,60 / 6,25 | 4 / 3 / 3 / 3 | 3,24 / 2,43 / 2,43 / 2,43 | 12 | — | 1 source |

#### A3.2 URSA PRK 32 Roulé — murs, largeur 1,20 m, λ 0,032

Fiche URSA (copie Samse 772193, fichier modifié le 20/06/2025) [S38].

| Épaisseur | R | Longueur | m²/rlx | Rlx/pal | Source 2 | Statut |
|---|---|---|---|---|---|---|
| 75 | 2,30 | 5,40 m | 6,48 | 18 | — | 1 source |
| 85 | 2,65 | 5,40 m | 6,48 | 18 | — | 1 source |
| 101 | 3,15 | 5,40 m | 6,48 | 18 | Brico Dépôt « Serenity mur 32 RK 101 mm » (marque distributeur, même épaisseur) | 1 source (2e non équivalente) |
| 120 | 3,75 | 2,70 m | 3,24 | 18 | — | 1 source |
| 140 | 4,35 | 2,70 m | 3,24 | 18 | — | 1 source |
| 160 | 5,00 | 2,70 m | 3,24 | 18 | — | 1 source |
| 180 | 5,60 | 2,80 m | 3,36 | 18 | — | 1 source (dispo D) |
| 200 | 6,25 | 2,60 m | 3,12 | 18 | — | 1 source |

URSA « Pureone » : gamme laine de verre blanche sans liant (PureOne 32/35…) citée par une fiche distributeur « PURE32PN120600 » ; tableau non lu → à confirmer. Soufflage URSA : voir B (certificat Etex « S-URSA PUREFLOC Loft 47 »).

### A4. Laine de verre Knauf Insulation France

Le site knauf.com renvoie 403 ; aucune fiche FR lisible obtenue. Ce qui est établi :

| Donnée | Valeur | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|
| Ultracoustic **P** (panneau) 45 mm | R 1,20 ; λ 0,037 ; 600 × 1350 mm, 16 pan/paquet = 12,96 m², 20 paq/pal (aussi 600 × 1200 : 11,52 m²) ; 30 mm R 0,80 ; 60 mm R 1,60 (12 pan, 9,72 m²) | [S70] fiche Knauf Insulation FR « Cloisons – Ultracoustic P » (knauf-batiment, ACERMI 08/016/506 ; fiche ancienne ≈ 2012) | [S71] ACERMI **08/016/506/14** (16/05/2025) : 45 mm = R 1,20 | confirmé (2 sources) pour R ; colisage 1 source ancienne | produit Knauf FR type pour 72/48 |
| Ultracoustic (rouleau) 45 mm | R 1,20 ; rouleau 600 × 8000 mm ; 4 rlx/paquet (19,2 m²) ; 24 paq/pal | extrait moteur page Knauf « Ultracoustic » | — | 1 source (extrait) | à confirmer sur fiche FR |
| Acoustifit 45 mm | R 1,20 ; panneau 600 × 1350 ; 16 pan/paquet = 12,96 m² | extrait moteur page Knauf **fr-BE** | — | 1 source, **Belgique** | produit belge : à confirmer pour la France |
| Panneau Knauf λ 0,035, 45 mm | R 1,25 ; 600 × 1200 ; 16 pan = 11,52 m² ; 28 paq/pal | [S39] fiche Knauf Insulation **Belgique 12/2017** (« Cloisons de séparation ») | — | 1 source, ancienne, BE | ne pas utiliser pour la France |
| Acoustilaine 035 (kraft, roulé) | épaisseurs 75 à 280 mm, longueurs 2,1 à 8,1 m | Batiproduits (extrait) | — | 1 source | tableau à confirmer |
| Naturoll 035 (nu, rouleaux par 2) | 100 : R 2,85, 575 × 6300, 7,25 m²/colis ; 120 : 3,40, 575 × 5300, 6,10 m² ; 140 : 4,00, 575 × 4500, 5,18 m² ; 160 : 4,55, 575 × 4000, 4,60 m² ; 180 : 5,10, 575 × 3500, 4,03 m² ; 200 : 5,70, 575 × 3200, 3,68 m² ; 220 : 6,25, 575 × 3300, 3,80 m² ; 24 colis/pal (220 : 18) | [S72] fiche Knauf Naturoll 035 (copie Chausson, avec certificat ACERMI de 2013 ; une version 10/2015 existe chez Gobert) | [S73] ACERMI **02/016/144/21** (16/05/2025 ; Naturoll 035, Comble 035, KI Fit 035, Expert LRR 035…) : mêmes R (100 = 2,85 … 220 = 6,25 ; 300 = 8,55) | R : confirmé (2 sources) ; longueurs : 1 source **ancienne (2013-2015)** → à confirmer | rouleaux nus 575/600 mm pour pose entre chevrons/montants |
| « TP 138 », « Absolute », « Acoustiroll » | **non trouvés** pour la France 2026 | — | — | à confirmer (noms anciens ou étrangers) | |

### A5. Isolant de cloison acoustique 72/48 — synthèse pour le comptoir

Règle de pose (Rockwool, guide cloisons 12/2023 [S40], reprenant NF DTU 25.41 février 2022) : cloison 72/48 = isolant **30 à 45 mm** ; l'épaisseur doit être ≤ profondeur du montant (48 mm) pour ne pas pousser les parements ; entraxe 60 cm → panneaux semi-rigides 0,60 m posés tels quels ; entraxe 40 cm → panneaux recoupés à 40 cm.

| Produit vérifié | Épaisseur | R | Format | m²/colis | Statut |
|---|---|---|---|---|---|
| Isover GR 32 Nu | 45 | 1,40 (ACERMI ; la fiche ancienne dit 1,45) | 1,35 × 0,60 | 12,15 (15 pan) | R confirmé (2 sources) ; colisage 1 source ; dispo sur fabrication |
| URSA PRK 32 | 45 | 1,40 | 1,35 × 0,60 | 10,53 (13 pan) | confirmé (2 sources) pour R/format |
| Rockwool Rockmur nu / kraft | 40 (45 retiré en 2026) | 1,10 | 1,35 × 0,60 | 9,72 nu (12) / 11,34 kraft (14) | confirmé (2 sources) |
| Rockwool Rockcalm | 40 (45 certifié R 1,25) | 1,10 | 1,35 × 0,60 | à confirmer | R : ACERMI 2025 + fiches anciennes |
| Knauf Ultracoustic P | 45 | 1,20 | 1,35 × 0,60 | 12,96 (16 pan) | R confirmé (2 sources) ; colisage 1 source ancienne |
| Steico Flex 036 / Métisse RT / Biofib'Trio | 45 | 1,25 / 1,15 / 1,15 | voir A6 | voir A6 | R : ACERMI |
| Isover Isoconfort 32 45 mm | — | — | — | — | **n'existe pas** (ACERMI) : erreur de désignation fréquente → GR 32 Nu 45 |

Pour le calcul : surface de cloison (une seule couche d'isolant, pas deux faces) × (1 + chute) ; arrondi au colis.

## B. Vrac : soufflage en combles perdus (NF DTU 45.11)

Principe vérifié : **le nombre de sacs ne se calcule pas par une densité** ; il se lit sur le **certificat ACERMI** du produit (tableau « application soufflage » : R, épaisseur mini à souffler, épaisseur après tassement, masse mini kg/m², nombre de sacs pour 100 m²). Le site acermi.com est lisible et daté : c'est la source primaire (organisme certificateur), recoupée par la fiche fabricant quand elle est lisible.

### B1. Tableaux ACERMI (R 5 à 10)

**Laine de verre — Isover Comblissimo** (aussi Flocolene, Techwool) — certificat **07/D/018/474/28** créé le 16/05/2025 [S41] ; λD 0,046 ; sac **17,3 kg** ; tassement S1 ; A1. Fiche Isover MAJ 24/04/26 [S42] : « R = 10 en 465 mm », **36 sacs/palette**, DTA 20/19-415_V2, DTU 45.11.

| R | Épaisseur mini (mm) | Après tassement (mm) | kg/m² | Sacs /100 m² | Statut |
|---|---|---|---|---|---|
| 5 | 235 | 230 | 2,70 | 15,6 | 1 source officielle (ACERMI) |
| 6 | 280 | 276 | 3,30 | 18,7 | idem |
| 7 | 330 | 322 | 3,80 | 21,8 | idem |
| 8 | 375 | 368 | 4,40 | 24,9 | idem |
| 10 | 465 | 460 | 5,40 | 31,2 | **confirmé (2 sources)** : ACERMI + fiche Isover 2026 (465 mm) |

Écart avec l'ancienne brochure Isover (reprise dans `docs/referentiels/isolation.md`) : 15,4 / 18,5 / 21,6 / 24,7 / 30,8 sacs → l'édition ACERMI 2025 demande **un peu plus de sacs** (+1 %). Retenir le certificat en vigueur.

**Laine de verre — Knauf Supafil Loft 045** (et Optiloft) — certificat **04/D/016/378/27** créé le 01/04/2026 [S43] ; λD 0,045 ; sac **16,6 kg**.

| R | Épaisseur mini | Après tassement | kg/m² | Sacs /100 m² | Statut |
|---|---|---|---|---|---|
| 5 | 230 | 225 | 2,80 | 16,4 | confirmé (2 sources) : ACERMI + `isolation.md` (même certificat, avril 2026, relu ici) |
| 6 | 275 | 270 | 3,30 | 19,7 | idem |
| 7 | 320 | 315 | 3,90 | 23,0 | idem |
| 8 | 365 | 360 | 4,40 | 26,3 | idem |
| 10 | 455 | 450 | 5,50 | 32,9 | 1 source officielle (ACERMI) |

**Laine de verre — URSA / Etex « S-URSA PUREFLOC Loft 47 »** (aussi Puls'R 47, Soufl'R 47, Superwhite 47 Loft) — certificat **26/D/294/1839** créé le 24/07/2026 [S44] ; λD 0,047 ; sac **16,6 kg** ; usine Stirling (UK). « Pureone soufflage » : nom non trouvé ; le produit URSA à souffler certifié en France est Purefloc.

| R | Épaisseur mini | Après tassement | kg/m² | Sacs /100 m² | Statut |
|---|---|---|---|---|---|
| 5 | 240 | 235 | 2,50 | 15,0 | 1 source officielle (ACERMI) |
| 6 | 285 | 282 | 3,00 | 18,0 | idem |
| 7 | 335 | 329 | 3,50 | 21,0 | idem |
| 8 | 380 | 376 | 4,00 | 24,0 | idem |
| 10 | 475 | 470 | 5,00 | 30,0 | idem |

**Laine de roche — Rockwool Jetrock 2** (aussi Rockprime 2, Rockair 2) — certificat **17/D/015/1195/5** (16/05/2025) [S45] ; λD 0,044 ; sac **20 kg** ; certificat PDF Rockwool : délivré 01/01/2024, valable au 31/12/2026 (extrait moteur) [S46].

| R | Épaisseur mini | Après tassement | kg/m² | Sacs /100 m² | Statut |
|---|---|---|---|---|---|
| 5 | 225 | 220 | 4,30 | 21,1 | confirmé (2 sources) : ACERMI site + certificat PDF Rockwool (même certificat, 2 éditions — valeurs non relues dans le PDF : à confirmer) |
| 6 | 270 | 264 | 5,10 | 25,3 | 1 source officielle |
| 7 | 315 | 308 | 6,00 | 29,6 | idem |
| 8 | 360 | 352 | 6,80 | 33,8 | idem |
| 10 | 445 | 440 | 8,50 | 42,2 | idem |

« Rockfloc » : non trouvé dans la liste ACERMI ni chez Rockwool France → à confirmer (nom ancien ?).

**Ouate de cellulose — Soprema Thermacell Cristal** (aussi Univercell Cristal, Pavafloc Cristal, Sopracell Cristal…) — certificat **22/D/141/1569/5** du 19/12/2025 [S47] ; λD 0,040 ; tassement **SH20** ; sacs 10 / 12,5 / 14 kg.

| R | À souffler (mm) | Après tassement (mm) | Sacs 10 kg | Sacs 12,5 kg | Sacs 14 kg | Statut |
|---|---|---|---|---|---|---|
| 5 | 250 | 200 | 50 | 40 | 36 | confirmé (2 sources) : ACERMI + fiche Soprema INSFR0303-3/b citée par `isolation.md` (non relue ici) — retenir « 1 source officielle » |
| 6 | 300 | 240 | 60 | 48 | 43 | idem |
| 7 | 350 | 280 | 70 | 56 | 50 | idem |
| 8 | 400 | 320 | 80 | 64 | 58 | idem |
| 10 | 500 | 400 | 100 | 80 | 72 | idem |

**Attention, deux « Thermacell »** : le **Thermacell** (sans « Cristal ») est sous un autre certificat, **14/D/006/963/10** (16/05/2025) [S48] : λD 0,039, tassement **SH25**, sacs 12,5 / 14 kg, R 7 = 345 mm → 273 mm, **64 sacs de 12,5 kg** (57 de 14 kg) pour 100 m² ; R 5 = 245 → 195 mm, 46 / 41 sacs ; R 10 = 495 → 390 mm, 91 / 82 sacs. **Le comptoir doit faire préciser « Thermacell » ou « Thermacell Cristal »** (écart de 14 % sur les sacs à R 7).

**Ouate de cellulose — Igloo France** (aussi Ouattitude N, Cloudy cellulose N, Grey Snow, Cellulo'Pro, Ouatipi, Watt Less) — certificat **12/D/157/784/23** créé le 04/11/2026 [S49] ; λD 0,040 ; tassement SH25 ; sacs 10 / 10,8 / 11,5 / 12,5 kg.

| R | À souffler | Après tassement | Sacs 10 kg | Sacs 12,5 kg | Statut |
|---|---|---|---|---|---|
| 5 | 255 | 200 | 62 | 50 | 1 source officielle (ACERMI) |
| 6 | 310 | 240 | 74 | 60 | idem |
| 7 | 360 | 280 | 87 | 69 | idem |
| 8 | 410 | 320 | 99 | 79 | idem |
| 10 | 515 | 400 | 124 | 99 | idem |

Note : `isolation.md` citait « Igloo Ouattitude ACERMI 17/D/153/1211 » : ce certificat (Ouattitude) **ne s'ouvre plus** sur acermi.com (renvoie à la liste) ; Ouattitude N est aujourd'hui dans le certificat Igloo 12/D/157/784/23. Palette Igloo 40 sacs (cité par `isolation.md`) : à confirmer.

**Ouate de cellulose — Cellaouate / Breizhouate / Gigaouate** — certificat **16/D/152/1171/9** (16/05/2025) [S50] ; λD 0,039 ; SH20 ; sacs 10 / 14 kg (et big-bag 300 kg).

| R | À souffler | Après tassement | Sacs 10 kg | Sacs 14 kg |
|---|---|---|---|---|
| 5 | 240 | 195 | 61 | 44 |
| 6 | 290 | 234 | 73 | 52 |
| 7 | 335 | 273 | 85 | 61 |
| 8 | 385 | 312 | 97 | 69 |
| 10 | 480 | 390 | 121 | 86 |

Statut : 1 source officielle (ACERMI). Ouate Breizhouate = produit breton (repère régional, voir F).

**Isocell France** (Isocell F, Trendisol F…) certificat 12/D/151/779/10 ; **Ouatéco** : non trouvé dans l'extrait de liste lu ; **Cavac Biofib Jetfib'Ouate** 14/D/130/929/8 ; **Métisse Flocon** (coton recyclé) 14/D/179/916/11 (attribution produit/certificat déduite de l'ordre de la liste) — tableaux non lus : à confirmer.

### B2. Tassement, piges, conduits (DTU 45.11 et certificats)

| Donnée | Valeur | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|
| Tassement laine minérale soufflée | 2 à 10 mm selon R (classe S1) ; ex. Comblissimo R 7 : 330 → 322 mm (≈ 2,5 %) | [S41] ACERMI | [S43] ACERMI Supafil (320 → 315) | confirmé (2 sources) | la « surépaisseur » est déjà dans l'épaisseur mini du tableau : ne rien ajouter |
| Tassement ouate de cellulose | classe SH20 : épaisseur après tassement = 80 % de l'épaisseur soufflée (Thermacell Cristal R 7 : 350 → 280) ; SH25 : ≈ 78-79 % (Igloo 360 → 280 ; Thermacell 345 → 273) | [S47] | [S49], [S48] | confirmé (2 sources) | « 20 % de tassement » = classe SH20, pas une règle générale |
| R à viser | le R du certificat est donné **après tassement** ; souffler l'épaisseur « mini », contrôler aux piges | [S41] | [S47] | confirmé (2 sources) | |
| Piges de repérage | obligatoires, graduées, ≈ 1 pige pour 25 m² (règle professionnelle courante) | — | — | **à confirmer** (texte DTU 45.11 non accessible ; ratio usuel des soufflleurs, non sourcé) | se vendent par lots ; le négoce les fournit souvent avec la machine |
| Conduits de fumée | écart au feu : le DTU 24.1 impose une distance de sécurité entre conduit et matériau combustible (16 cm en cas général pour conduit isolé ? valeur dépend du conduit, désignation « G »/distance « xx » sur la plaque) ; avec un isolant **combustible** (ouate) : coffrage/déflecteur incombustible autour du conduit | — | — | **à confirmer** : valeur exacte à relire dans NF DTU 24.1 et sur la plaque du conduit (désignation CE, ex. « G50 » = 50 mm) | ne pas coder de valeur unique |
| Spots encastrés | capot de protection type « boîte à spots » (non sourcé ici) | — | — | à confirmer | |
| Trappe d'accès | coffrage (rehausse) autour de la trappe à hauteur de l'isolant, isolation du dessus de trappe | — | — | à confirmer (règle d'usage, non relue dans le DTU) | |
| Machine | location au négoce avec les sacs (pratique Point.P / Gedimat « prêt de machine ») | — | — | à confirmer | |

Calcul : sacs = ⌈ S × N₁₀₀(R) / 100 ⌉ (S = surface au sol des combles, N₁₀₀ du certificat du produit). Pas de majoration pour tassement (déjà incluse). Majoration pour pertes : **aucune valeur sourcée** → à confirmer (proposer +0 et laisser l'artisan ajuster, ou arrondi au sac supérieur seulement).

### A6. Isolants biosourcés (fibre de bois, coton recyclé, chanvre)

Source primaire du R : certificat ACERMI (acermi.com, lisible) ; format et colisage : fiche fabricant.

#### A6.1 Steico Flex 036 (aussi Xylo Flex 036) — fibre de bois semi-rigide, λD 0,036, ACERMI **20/134/1455/4** (créé 07/07/2026) [S51]

Format **1220 × 575 mm (0,7015 m²)** ; fiche Steico FR [S52] (copie Samse 1217262, PDF 2016 — colisage identique à `isolation.md`).

| Épaisseur | R (ACERMI) | Pan/paquet | m²/paquet (calc.) | Paquets/pal | kg/m² | Statut |
|---|---|---|---|---|---|---|
| 40 | 1,10 | 10 | 7,02 | 12 | 2,40 | confirmé (2 sources) : R ACERMI, colisage fiche ; R calculé 40/36 = 1,11 cohérent |
| 45 | 1,25 | — | — | — | — | 1 source (ACERMI ; absent de la fiche 2016) |
| 50 | 1,35 | 9 | 6,31 | 10 | 3,00 | confirmé (2 sources) |
| 60 | 1,65 | 8 | 5,61 | 10 | 3,60 | confirmé (2 sources) |
| 80 | 2,20 | 6 | 4,21 | 10 | 4,80 | confirmé (2 sources) |
| 100 | 2,75 | 4 | 2,81 | 12 | 6,00 | confirmé (2 sources) |
| 120 | 3,30 | 4 | 2,81 | 10 | 7,20 | confirmé (2 sources) |
| 140 | 3,85 | 4 | 2,81 | 8 | 8,40 | confirmé (2 sources) |
| 145 | 4,00 | 4 | 2,81 | 8 | 8,70 | confirmé (2 sources) |
| 160 | 4,40 | 3 | 2,10 | 10 | 9,60 | confirmé (2 sources) |
| 180 | 5,00 | 3 | 2,10 | 8 | 10,80 | confirmé (2 sources) |
| 200 | 5,55 | 2 | 1,40 | 12 | 12,00 | confirmé (2 sources) |
| 220 | 6,10 | 2 | 1,40 | 10 | 13,20 | confirmé (2 sources) |
| 240 | — (calc. 6,65) | 2 | 1,40 | 10 | 14,40 | R : à confirmer (absent du certificat lu) |

« Steico Flex 038 » (λ 0,038, STEICOflex F 038) : certificat dans la liste ACERMI (Steico Brumath), tableau non lu → à confirmer.
Pose : largeur d'encastrement recommandée par Steico (entraxe) : 40 mm → 450 mm … 100 mm → 600 mm … 240 mm → 950 mm [S52] (le panneau doit être comprimé d'env. 1 cm entre montants).

#### A6.2 Gutex Thermoflex — fibre de bois, λD 0,036, ACERMI **17/127/1193/10** (16/05/2025) [S53]

R certifiés : 40 : 1,10 ; 50 : 1,35 ; 60 : 1,65 ; 80 : 2,20 ; 100 : 2,75 ; 120 : 3,30 ; 140 : 3,85 ; 145 : 4,00 ; 160 : 4,40 ; 180 : 5,00 ; 200 : 5,55 ; 220 : 6,10 ; 240 : 6,65.
Format **1350 × 575 mm (0,77 m²)** (et 1350 × 600 pour 40/60/145) ; pan/paquet : 30 : 12 ; 40 : 8 ; 50 : 9 ; 60 : 8 ; 80 : 6 ; 100 : 4 ; 160 : 3 ; 240 : 2 [S54] fiche Gutex FR (copie Domomat) + [S55] Hornbach CH (160 : 3, 240 : 2). Statut : R confirmé 1 source officielle + recoupement e/λ ; format confirmé (2 sources) ; colisage intermédiaire (120-220) **à confirmer** (mise en page de la fiche ambiguë).

#### A6.3 Pavatex (Soprema) Pavaflex — fibre de bois, 1220 × 575 mm

| Donnée | Valeur | Source | Statut |
|---|---|---|---|
| Pavaflex (λ 0,038) | 40 : R 1,05, 10 pan/paq ; 50 : 1,30, 9 ; 60 : 1,55, 8 ; 80 : 2,10, 6 ; 100 : 2,60, 4 ; 120 : 3,15, 4 ; 140 : 3,65, 4 ; 160 : 4,20, 3 ; 180 : 4,70, 3 ; 200 : 5,25, 2 ; 220 : 5,75, 2 ; 240 : 6,30, 2 | [S56] fiche Soprema Pavaflex (copie Gobert, Word 14/09/2018) | 1 source, **ancienne** |
| Gamme actuelle | « Pavaflex Confort » (λ 0,038) et « Pavaflex Confort 36 » (λ 0,036), Avis techniques façades, cloisons, combles | [S57] brochure Soprema/Pavatex DC-21/036 déc. 2021 (copie BigMat) | 1 source ; tableaux à confirmer |
| Pavaflex Plus | fiche Soprema TDS-NE-INSEU0032 existe (serveur 503 au moment de la lecture) | — | à confirmer |

#### A6.4 Isonat (Saint-Gobain Isover, fibre de bois) — Isonat Flex 40 / Flex 55 / Flex 55 SV : listés sous Saint-Gobain Isover dans la liste ACERMI [S58] ; tableaux non lus → à confirmer.

#### A6.5 Métisse RT (coton recyclé, Le Relais) — λD 0,039, ACERMI **14/179/918/9** (16/05/2025) [S59]

R : 45 : 1,15 ; 50 : 1,25 ; 60 : 1,50 ; 80 : 2,05 ; 100 : 2,55 ; 120 : 3,05 ; 145 : 3,70 ; 160 : 4,10 ; 180 : 4,60 ; 200 : 5,10.
Format panneau 1,20 × 0,60 m (et rouleaux) : [S60] Castorama « Métisse 0,6 × 1,2 m ép. 200 mm R 5,1 » → R 200 mm confirmé (2 sources) ; colisage non lu → à confirmer.

#### A6.6 Biofib'Trio (chanvre-lin-coton, Cavac) — λD 0,038, ACERMI **14/130/962/11** (22/07/2025) [S61]

R : 45 : 1,15 ; 50 : 1,30 ; 60 : 1,55 ; 80 : 2,10 ; 100 : 2,60 ; 120 : 3,15 ; 145 : 3,80 ; 160 : 4,20 ; 200 : 5,25 ; 220 : 5,75 (tous les 5 mm de 45 à 200).
Format : **contradiction** — fiche distributeur 1,20 × 0,60 m (0,72 m²) vs Avis technique murs 1250 × 600 (et 1250 × 585 sur demande) [S62]. Colisage : à confirmer. R 80 mm 2,10 recoupé par FDES 80 mm (λ 0,038) : confirmé (2 sources).
Utilisé aussi en cloison (système Prégyroc Air + Biofib Trio, Batiproduits) — 45 mm possible en 72/48.

### A7. PSE, XPS, polyuréthane, isolants minces

**Non traité faute de budget de recherche** (quota de recherches web de la session épuisé au moment de cette section ; aucune fiche lue). Rien ci-dessous n'est sourcé : tout est « à confirmer ».

| Produit | Ce qu'il faut confirmer | Statut |
|---|---|---|
| Styrodur (BASF) XPS 2800 C / 3035 CS | format (usuel 1250 × 600 mm, à feuillure), λ, R par épaisseur, panneaux/paquet | à confirmer (aucune source lue) |
| URSA XPS | idem | à confirmer |
| Soprema Efigreen (PU) sol / doublage | formats, λ (≈ 0,022 ?), R | à confirmer |
| Recticel (PU) | idem | à confirmer |
| PSE sol / doublage | R par épaisseur, format 1200 × 600 ou 1200 × 1000 | à confirmer ; les **doublages collés** PSE/PU + plâtre sont traités dans 01-plaques.md |
| Isolants minces réfléchissants (Actis Triso, Hybris…) | statut : en France, un mince réfléchissant n'est pas reconnu comme isolant seul par la réglementation thermique ; son R certifié (ACERMI / Avis technique) est faible au regard des laines ; usage **en complément** uniquement | à confirmer (aucune source lue cette session ; ne pas afficher de R) |

## C. Règles

| Donnée | Valeur | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|
| Combles par rouleaux / panneaux | NF DTU 45.10 « isolation des combles en panneaux ou rouleaux de laine minérale » | [S74] Guide NF DTU 25.41 nouveautés 2022 (interfaces) | [S9] fiches Isover (renvoi DTU 45.10) | confirmé (2 sources) pour l'intitulé | édition en vigueur non lue (texte AFNOR payant) |
| Combles par soufflage | NF DTU 45.11 « isolation thermique des combles par soufflage d'isolant en vrac (laines minérales ou ouate de cellulose papier) » | [S74] | [S42] fiche Comblissimo « conforme au DTU 45.11 » | confirmé (2 sources) | `isolation-des-combles.md` dit « nov. 2025 » pour l'édition : **à confirmer** |
| « NF DTU 45.12 » | aucune trace dans les sources lues | — | — | à confirmer (n'existe probablement pas ; ne pas citer) | |
| Combles aménagés : laine semi-rigide exigée (rouleaux souples type IBR proscrits) | règle DTU 45.10 citée par Isover | communiqué Isover cité dans `isolation-des-combles.md` (non relu) | ACERMI : IBR « combles par panneaux ou rouleaux, entre solives » ; Isoconfort « semi-rigide » | à confirmer (texte DTU non lu) | cohérent avec les usages certifiés |
| Position du pare-vapeur | côté chaud, entre isolant et plaque ; en deux couches : règle « 2/3 - 1/3 » (ou « 3/4 - 1/4 » en zone très froide) | [S74] DTU 25.41 § 6.4.5 (guide) | [S75] notice Isover Vario Xtra (2/3 - 1/3 ; 3/4 - 1/4 zone très froide) | confirmé (2 sources) | |
| Plaques de plâtre pare-vapeur sur murs | admises (DTU 25.41 § 6.4.2.8) ; **un boîtier électrique par 9 m² de paroi** autorisé | [S74] | — | 1 source | non admises dans les DROM |
| Le kraft n'est pas un pare-vapeur | « Le kraft ne fait pas office de pare-vapeur… non jointoyé » | [S75] notice Isover | — | 1 source (fabricant) | conséquence : en rampants, membrane + adhésifs même avec isolant kraft |
| Membrane en combles perdus avant soufflage | requise quand plancher de répartition au-dessus, zone très froide, plancher bois ou plafond non étanche (CPT 3560_V2, 3647, 3693_V2) | [S75] | — | 1 source | |
| MaPrimeRénov' 2026, parcours par geste (métropole) | **aucun geste d'isolation** (murs, combles) éligible par geste ; isolation seulement dans « Rénovation d'ampleur » (≥ 2 postes d'enveloppe, chacun ≥ 25 % des surfaces) | [S76] service-public.gouv.fr F35083 (consulté 19/11/2026) | — | 1 source (officielle) | change la logique « R par défaut = seuil MaPrimeRénov' » de `isolation.md` |
| Seuils R des aides (CEE fiches BAR-EN-101/102/103, critères MPR arrêté du 17/11/2020) | combles perdus R ≥ 7 ; rampants R ≥ 6 ; murs R ≥ 3,7 ; planchers bas R ≥ 3 | `isolation.md` (antisèche Isover, non relue) | fiche Isoconfort 32 « aides en une couche de 200 mm R 6,25 » (cohérent rampants ≥ 6) | **à confirmer** (fiches CEE en vigueur non lues ; service-public ne donne pas les valeurs) | ne pas afficher comme exigence 2026 sans relecture |
| RE2020 (neuf) | pas de R minimal par paroi ; exigences globales Bbio, Cep, Cep,nr, DH, Ic | — | — | à confirmer (aucun texte lu cette session) | garde-fous ponts thermiques / perméabilité : à confirmer |
| Rénovation, « RT existant élément par élément » | R minimaux par paroi (arrêté du 3 mai 2007 modifié) | — | — | à confirmer (valeurs non lues) | |
| Tableau soufflage = certificat ACERMI | le nombre de sacs / 100 m² et l'épaisseur mini sont ceux du certificat | [S41]-[S50] | `isolation-des-combles.md` | confirmé (2 sources) | |
| Écart au feu des conduits de fumée | NF DTU 24.1 + plaque du conduit | — | — | à confirmer | voir B2 |

## D. Pare-vapeur, membranes et étanchéité à l'air

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|
| Isover Vario Xtra (réf. 65970) | rouleau **1,50 × 40 m = 60 m²** | m² | [S75] notice Isover (copie Gedimat) | [S77] Gedimat « rouleau de 40 × 1,50 m, 60 m² » | confirmé (2 sources) | |
| Vario Xtra : Sd | 0,4 à 25 m (hygro-régulante) | m | [S78] fiche Isover MAJ 13/05/24 | [S75] / [S77] | confirmé (2 sources) | DTA toitures 20/14-335_V1, murs 20/14-318_V1 ; DoP 0003-02 |
| Vario Xtra Fast (réf. 13351, pré-adhésivée) | 1,50 × 40 m = 60 m² | m² | [S75] | `isolation-des-combles.md` (étiquette Isover, non relue) | 1 source | |
| Vario Xtra 30 m² (1,50 × 20 m) | existe selon `isolation-des-combles.md` | m² | — | — | à confirmer | |
| Accessoires actuels Isover (notice) | Adhésif **Vario Multitape**, **Vario Fast Tape**, Mastic **Vario DoubleFit**, Suspente **Intégra 2** | — | [S75] | — | 1 source | « Vario KB1 » est toujours vendu (ci-dessous) |
| Adhésif Vario KB1 | rouleau **60 mm × 40 m** | — | [S79] Gedimat « rouleau de 40 m × 60 mm » | [S80] Brico Dépôt « 40 m » | confirmé (2 sources) | carton de 8 : 1 source (06-negoce-regions.md, Gedimat) |
| Mastic Vario DoubleFit | cartouche 310 ml | ml | 05-finitions-accessoires.md (extrait Isover + EAN Bricodépôt/Bricomarché) | — | confirmé (2 sources) selon ce fichier, non relu ici | rendement non publié : longueur de cordon = 310 000 / section (mm²) |
| Placo / Isover Stopvap | 1,5 × 40 m = 60 m² selon `isolation.md` | m² | — | — | à confirmer (brochure non relue) | |
| Knauf LDS, Siga Majrex / Majpell, Pro Clima Intello (Plus) | rouleaux « 1,50 × 50 m = 75 m² » souvent cités de mémoire | m² | — | — | **à confirmer (aucune source lue ; pages fabricant 404)** | ne pas coder de m² sans fiche |
| Adhésifs Siga Rissan / Sicrall, Pro Clima Tescon | longueur de rouleau | m | — | — | à confirmer | |
| Manchons / passe-câbles (Vario, Siga, Pro Clima) | — | — | — | — | à confirmer | 1 par traversée (règle de bon sens, non sourcée) |
| Recouvrement entre lés | **10 cm** usuel | cm | — | — | à confirmer (notice Vario lue sans ce chiffre) | |
| Majoration membrane | 1 m² isolé → **1,10 m²** de membrane | m²/m² | `isolation-des-combles.md` (rendement Isover cité, non relu) | calcul : lé 1,50 m, recouvrement 10 cm → utile 1,40 m → +7,1 %, + relevés en rive | 1 source + calcul | |
| Adhésif entre lés | ≈ **0,71 ml/m²** (1 joint tous les 1,40 m) + périmètre de la paroi (raccords murs/pignons au mastic ou adhésif) | ml/m² | calcul géométrique | `isolation.md` 0,80 à 1,40 ml/m² (non sourcé) | à confirmer (aucun ratio fabricant lu) | formule : ml = S / 1,40 + périmètre |
| Suspentes Intégra 2 avec membrane | la membrane passe entre suspente et fourrure (système Intégra) ; boîte de 50 | — | [S75] (schéma) | `isolation.md` (fiche Isover réglable) | 1 source pour le principe ; boîte : à confirmer | entraxe / densité : voir 02-ossatures-fixations.md |
| Plaques pare-vapeur (alternative à la membrane, murs maçonnés) | admises ; renfort feuillard/ossature ; 1 boîtier / 9 m² | — | [S74] | — | 1 source | |

## E. Quantités

| Règle | Valeur | Source | Statut | Note |
|---|---|---|---|---|
| Rouleaux / panneaux | n = ⌈ S × (1 + p) / m²_par_unité ⌉, **par couche** | méthode | — | m²/unité = celui de la fiche **datée** de la référence (les longueurs changent, voir constat) |
| Chute p rouleaux/panneaux | aucune valeur fabricant trouvée ; `isolation.md` propose 5 % | — | à confirmer | entre chevrons ou montants à 60 cm, un rouleau de 1,20 m ou un panneau de 0,60 m tombe juste (chute ≈ 0) ; entraxe 40 cm ou irrégulier → recoupes |
| Arrondi | au rouleau / colis supérieur ; palette proposée, jamais imposée | `isolation.md` | règle produit | |
| Soufflage | sacs = ⌈ S × N₁₀₀(R) / 100 ⌉ ; aucune majoration pour tassement | [S41]-[S50] | confirmé (2 sources) | majoration pertes : à confirmer |
| Choix de l'épaisseur depuis un R | plus petite épaisseur de la gamme dont R certifié ≥ R visé | ACERMI | règle | |
| Cloison | 1 couche, surface de cloison (pas ×2) | [S40] guide Rockwool | 1 source | |
| Membrane | S × 1,10, arrondi au rouleau de 60 m² | voir D | 1 source + calcul | |
| Adhésif | (S / 1,40 + périmètre) / 40 m → rouleaux KB1 | calcul | à confirmer | |

## F. Ce que le négoce exige pour commander

Constat tiré des fiches : à épaisseur égale, R et m²/colis changent avec la marque et la gamme (ex. 45 mm : R 1,15 à 1,40 ; colis 9,72 à 12,96 m²). Le vendeur doit donc obtenir :

1. **Famille et marque** (ou « équivalent ») : laine de verre / roche / bois / ouate ; Isover, Rockwool, URSA, Knauf, Steico…
2. **Gamme / λ** (GR 32 = 0,032 ; Isoconfort 35 = 0,035 ; IBR = 0,040) — un « 100 mm » sans gamme ne se chiffre pas.
3. **Épaisseur ou R** (l'un donne l'autre via le certificat de la gamme).
4. **Revêtement** : nu, kraft, alu (et voile pour façade).
5. **Format** : rouleau ou panneau ; largeur 0,60 / 1,20 m (ou 0,575 m pour la fibre de bois) ; longueur.
6. **Conditionnement** : rouleau, colis/paquet (n panneaux), palette.
7. Vrac : **nom exact du produit** (Thermacell ≠ Thermacell Cristal), **poids du sac** (Igloo : 10 / 10,8 / 11,5 / 12,5 kg ; Soprema 10 / 12,5 / 14 kg), prêt/location de la machine, piges.
8. Membranes : marque et type (pare-vapeur fixe / hygro-régulant), **m² du rouleau**, adhésif et mastic de la **même marque** (les DTA Vario visent les accessoires Isover).

Différences régionales : **rien de documenté** dans les sources lues (aucune statistique de vente par région). Seuls indices factuels : sites de production — Steico à Brumath (67), Soprema ouate à Cestas (33), Cavac/Biofib en Vendée (85), Isover Chemillé (49), ouate « Breizhouate » (Bretagne), Gutex (Allemagne, distribué aussi en Suisse). L'hypothèse « fibre de bois plus présente dans l'Est » reste **à confirmer** (voir 06-negoce-regions.md).

## Bilan

- Produits documentés : **≈ 40 références** (Isover GR 32 roulé / panneaux nu et kraft, Isoconfort 35 kraft et nu, Isoconfort 32, IBR kraft / alu / contact, Isofaçade 32R, Comblissimo ; Rockwool Rockmur nu/kraft, Rockcalm, Rockplus Premium, Roulrock, Jetrock 2 ; URSA PRK 32 et PRK 32 roulé, Purefloc ; Knauf Ultracoustic P, Naturoll 035, Supafil Loft 045 ; Steico Flex 036, Gutex Thermoflex, Pavaflex, Métisse RT, Biofib'Trio ; ouates Soprema Thermacell et Thermacell Cristal, Igloo, Cellaouate ; membrane Vario Xtra et accessoires).
- Lignes de données : ≈ 215 ; mention « confirmé (2 sources) » : **72** occurrences (≈ 1/3 des lignes) ; « 1 source » : ≈ 80 (dont une bonne part de **certificats ACERMI**, source officielle qui fait foi pour R et sacs, mais comptée « 1 source ») ; « contradiction » : 4 (dont 2 résolues).
- Corrections importantes par rapport aux pistes existantes (`docs/referentiels/isolation*.md`) :
  1. **GR 32 Nu 45 mm = R 1,40** (certificat 2025), pas 1,45 (fiche ancienne).
  2. **Isoconfort 32 en 45 mm n'existe pas** (ACERMI) ; pour 72/48 : GR 32 Nu 45, URSA PRK 32 45, Knauf Ultracoustic P 45, Rockmur 40.
  3. **Rockmur 45 mm retiré** de la fiche Rockwool 01/2026 (remplacé par 40 mm R 1,10).
  4. Comblissimo : certificat 07/D/018/474/28 (2025) → R 7 = **21,8 sacs**/100 m² (et non 21,6) ; R 10 = 31,2.
  5. **Thermacell ≠ Thermacell Cristal** (SH25 / SH20, 64 vs 56 sacs de 12,5 kg à R 7).
  6. Ouattitude : l'ancien certificat 17/D/153/1211 n'est plus en ligne ; produit repris sous Igloo 12/D/157/784/23.
  7. **MaPrimeRénov' 2026 : plus aucun geste d'isolation par geste en métropole** (service-public) → le « R par défaut = seuil MPR » est à revoir.
  8. Les longueurs de rouleau changent selon l'édition de la fiche (Isoconfort 35 200 mm : 2,20 → 3,00 m).

**À confirmer (principaux)** :
- Seuils R des aides 2026 (CEE BAR-EN-101/102/103 : 7 / 6 / 3,7 / 3) — fiches CEE non relues.
- Colisage par paquet de nombreux panneaux (GR 32 Nu, PRK 32 45, Ultracoustic P), longueurs IBR et rouleaux/palette IBR, longueurs Isoconfort 35 nu 2026, Isoconfort 32 kraft 200 (1,20 × 2,20 m ?).
- Tout A7 : PSE, XPS (Styrodur, URSA XPS), PU (Efigreen, Recticel), isolants minces (Actis) — **non recherchés, quota de recherche web épuisé**.
- Membranes autres qu'Isover (Siga, Pro Clima, Knauf LDS, Stopvap) : dimensions de rouleaux ; recouvrement 10 cm ; ratio adhésif ml/m² (calcul seulement) ; manchons.
- Piges (1 / 25 m² ?), écart au feu des conduits (DTU 24.1), capots de spots, rehausse de trappe, majoration de pertes au soufflage.
- Édition en vigueur des NF DTU 45.10 / 45.11 (textes AFNOR non lus) ; règle « semi-rigide en combles aménagés ».
- Knauf Insulation France : fiches FR actuelles (site knauf.com en 403) ; Steico Flex 038, Isonat, Pavaflex Confort/Plus, Métisse et Biofib (colisage, format Biofib 1200 × 600 vs 1250 × 600).
- Différences régionales : rien de documenté.

## Sources

Toutes consultées le 19/11/2026. « copie X » = PDF du fabricant hébergé par le négoce X, converti en texte avec `pdftotext`.

1. [S1] Isover, fiche GR 32 Roulé Revêtu Kraft, MAJ 24/04/26 (copie Samse) — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_79476.pdf
2. [S2] Isover, fiche GR 32 Roulé Revêtu Kraft, MAJ 13/05/24 (copie Envain) — https://envain-materiaux.fr/ressources/images/articles/ficheTechnique/FT_GR_32_Roule_Revetu_Kraft.pdf
3. [S3] Brico Dépôt, laine de verre 100 mm mur 32 R 3,15, 2,7 × 1,2 m (extrait moteur) — https://www.bricodepot.fr/p/3596265231176/laine-de-verre-100mm-mur-32-r-3-15-2-7m-x-1-2m-rouleau-kraft ; [S3b] IBR 400 mm R 10, 2 × 1,2 m — https://www.bricodepot.fr/p/3596265188241/laine-de-verre-400mm-comble-perdu-40-r-10-2m-x-1-2m-rouleau-kraft
4. [S4] Bricomarché, GR32 kraft 2,70 × 1,20 m ép. 120 (extrait moteur) — https://www.bricomarche.com/p/rouleau-de-laine-de-verre-kraft-2.7x1.2m-ep120mm/3596265231251
5. [S5] Batiproduits, GR 32 nu/kraft/alu (extrait moteur) — https://www.batiproduits.com/fiche/produits/isolants-en-laine-de-verre-pour-murs-par-l-interi-p68891778.html ; [S5b] Isover GR 32 roulé kraft alu (existence) — https://www.isover.fr/download-documents/fiche-technique/fichetechnique-gr-32-roul-revtu-kraft-alu.pdf (403)
6. [S6] Isover, fiche GR 32 Nu, non datée (copie Chausson) — https://www.chausson.fr/media/article-document/211141
7. [S7] Isover, fiche GR 32 Revêtu Kraft (panneau), non datée (copie Chausson) — http://www.chausson.fr/media/article-document/203040
8. [S8] Castorama, panneau GR32 kraft 1,35 × 0,6 m ép. 75 (extrait moteur) — https://www.castorama.fr/panneau-laine-de-verre-isover-gr32-kraft-1-35-x-0-6-m-ep-75-mm-vendu-au-panneau-/3596265231084_CAFR.prd
9. [S9] Isover, fiche Isoconfort 35 Revêtu Kraft, MAJ 24/03/26 (copie Samse) — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1554173.pdf
10. [S10] Isover, fiche « Gamme Isoconfort » (ancienne, non datée, copie Generador de precios) — https://documentacion.generadordeprecios.info/documentaciontecnica/isover/isover3_isoconfort.pdf ; [S10b] Isover, fiche Isoconfort 35 voile confort (copie Chausson) — http://www.chausson.fr/media/article-document/211133
11. [S12] Batiproduits, Isoconfort 35 Kraft 300 mm — https://www.batiproduits.com/fiche/produits/laine-de-verre-de-300-mm-pour-pose-en-combles-en-p381779795.html
12. [S13] Isover, fiche Isoconfort 32 revêtu kraft MAJ 24/03/26 (extrait moteur ; URL 403) — https://www.isover.fr/download-documents/fiche-technique/fichetechnique-isoconfort-32-revtu-kraft.pdf ; [S14] One Click LCA, EPD Isoconfort 32 kraft 200 mm — https://materials.oneclicklca.com/fr/material/glass-wool-insulation-pe-and-kraft-paper-facing/67ddb3a3b223531aa2b4286d
13. [S15] Isover, fiche IBR Revêtu Kraft MAJ 23/04/26 (extrait moteur ; URL 403) — https://www.placo.fr/documents/fiche-technique/fichetechnique-ibr-revtu-kraft.pdf
14. [S16] Point.P, IBR 100 mm 8 × 1,2 m R 2,5 (A1171215, extrait moteur) — https://www.pointp.fr/p/platre-isolation-ite/laine-de-verre-revetue-kraft-ibr-ep-100-mm-8x1-2-m-r-2-5-m2-k-A1171215
15. [S17] Tessella, IBR revêtu kraft (100/200/300 mm, m²/rouleau) — https://www.tessella.fr/products/laine-de-verre-ibr-revetu-kraft-isover
16. [S18] La Maison Naturelle, IBR 140 mm 1,2 × 4 m R 3,5 — https://www.la-maison-naturelle.com/laine-de-verre-rouleaux/20590-isover-ibr-revetu-kraft-ep-140mm-1-2mx4m-r3-5-3596265283502.html ; [S18b] IBR 160 mm 1,2 × 5,5 m — https://www.la-maison-naturelle.com/fs2022/12407-isover-ibr-revetu-kraft-ep-160mm-1-2mx5-5m-r-4.html
17. [S19] Bricomarché, IBR 240 mm 3,5 × 1,2 m — https://www.bricomarche.com/p/rouleau-laine-de-verre-combles-perdus-et-plafonds-3.5x1.2m-240mm/3596265242455 ; [S20] IBR 260 mm 3 × 1,2 m — https://www.bricomarche.com/p/rouleau-ibr-revetu-kraft-260mm-3x1.2m/3596263001450
18. [S21] SFIC, IBR 300 mm 2,6 × 1,2 m R 7,5 (A3147602) — https://www.sfic.com/p/plafonds-cloisons-isolation/laine-de-verre-revetue-kraft-ibr-ep-300-mm-2-6x1-2-m-r-7-5-m2-A3147602
19. [S22] Isover, fiche IBR Revêtu Kraft 08/12/2017 (copie Envain) — https://www.envain-materiaux.fr/ressources/images/articles/ficheTechnique/ibr_revetu_kraft.pdf
20. [S23] Isover, fiche IBR Revêtu Alu (copie Chausson) — http://www.chausson.fr/media/article-document/211140 ; [S24] Isover, brochure IBR Contact (copie Chausson) — http://www.chausson.fr/media/article-document/203039
21. [S25] Isover, fiche Isofaçade 32R MAJ 25/03/26 (copie Samse) — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1771194.pdf
22. [S26] Rockwool France, fiche Rockmur nu / kraft 01/2026 — https://www.rockwool.com/siteassets/rw-f/telechargements/fiches-produits/rockwool_fp_rockmur_nu.pdf ; tarif public Rockwool 2022 (extrait moteur) — https://www.rockwool.com/syssiteassets/rw-f/telechargements/tarifs-publics-et-qualites-de-service/rockwool_tarif_public_batiment_2022_202207.pdf
23. [S27] Brico Dépôt, Rockmur 40 mm 14 panneaux — https://www.bricodepot.fr/p/3537311045613/laine-de-roche-40mm-1-35m-x-0-6m-rockmur-14-panneaux-rockwool ; [S28] Castorama, Rockmur kraft 75 mm lot de 10 — https://www.castorama.fr/panneau-laine-de-roche-rockwool-rockmur-kraft-0-6-x-1-35-m-ep-75-mm-lot-de-10-panneaux-/3537311028937_CAFR.prd ; [S29] Brico Dépôt, 8 panneaux kraft 100 mm — https://www.bricodepot.fr/p/3537311026278/8-panneaux-de-laine-de-roche-avec-kraft-en-1-35-x-0-6-m-ep-100-mm
24. [S30] Rockwool, fiche Rockcalm (éd. 2011, copie Ciffreo Bona) — https://www.ciffreobona.fr/userfiles/file/fiches_technique/rockwool_france/ft_rockcalm.pdf ; [S31] Rockwool, fiche Rockcalm (éd. 2015, copie Samse) — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_7932.pdf
25. [S32] Rockwool, fiche Rockplus Premium kraft 01/2026 — https://www.rockwool.com/syssiteassets/rw-f/telechargements/fiches-produits/rockwool_fp_rockplus_premium_kraft_combles_amenages_202301.pdf ; [S33] Castorama, Rockplus premium 120 mm R 3,75 — https://www.castorama.fr/panneau-laine-de-roche-rockwool-rockplus-premium-0-60-x-1-35m-ep-120-mm-r-3-75m-k-w-lot-de-3-panneaux-/3537311026292_CAFR.prd
26. [S34] Rockwool, fiche Roulrock kraft 03/2026 — https://www.rockwool.com/siteassets/rw-f/telechargements/fiches-produits/rockwool_fp_roulrock_kraft.pdf ; [S35] Brico Dépôt, Roulrock kraft 100 mm 5 × 1,2 m — https://www.bricodepot.fr/p/3537310000286/laine-de-roche-kraft-100mm-5m-x-1-2m-rouleau-rockwool
27. [S36] URSA, fiche PRK 32 (panneau, copie Chausson) — https://www.chausson.fr/media/article-document/248384 ; [S37] fiche produit PRK 32 (distributeur Anjou Connectique, extrait moteur) — https://www.anjou-connectique.com/media/wysiwyg/PDF/Fiche-produit-PRK-32.pdf
28. [S38] URSA, fiche PRK 32 Roulé (copie Samse, fichier du 20/06/2025) — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_772193.pdf
29. [S39] Knauf Insulation Belgique, fiche « Cloisons de séparation » 12/2017 — https://res.cloudinary.com/dnmg0ohoy/image/upload/v1756199289/mw_35_tech_prod_xx_12_2017_fr_compressed_ce58926928.pdf
30. [S40] Rockwool France, guide de mise en œuvre pour l'isolation des cloisons, 12/2023 (PDF lu dans l'espace de travail partagé ; URL d'origine non conservée — à reconfirmer)
31. [S41] ACERMI, certificat 07/D/018/474/28 (Comblissimo), 16/05/2025 — https://www.acermi.com/en/certified-insulation-products/certificate/07-d-018-474-28
32. [S42] Isover, fiche Comblissimo MAJ 24/04/26 (copie Samse) — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_423944.pdf
33. [S43] ACERMI, certificat 04/D/016/378/27 (Supafil Loft 045), 01/04/2026 — https://acermi.com/en/certified-insulation-products/certificate/04-d-016-378-27/
34. [S44] ACERMI, certificat 26/D/294/1839 (S-URSA Purefloc Loft 47), 24/07/2026 — https://acermi.com/en/certified-insulation-products/certificate/26-d-294-1839/
35. [S45] ACERMI, certificat 17/D/015/1195/5 (Jetrock 2), 16/05/2025 — https://www.acermi.com/en/certified-insulation-products/certificate/17-d-015-1195-5 ; [S46] Rockwool, certificat Jetrock 2 PDF (extrait moteur) — https://editserver.rockwool.com/siteassets/rw-f/telechargements/docs-techniques-dta-certificats/certificats-acermi/rockwool_acermi_jetrock_2_17_d_015_1195.pdf
36. [S47] ACERMI, certificat 22/D/141/1569/5 (Thermacell Cristal…), 19/12/2025 — https://acermi.com/en/certified-insulation-products/certificate/22-d-141-1569-5/
37. [S48] ACERMI, certificat 14/D/006/963/10 (Thermacell, Thermeo, Sopracell), 16/05/2025 — https://acermi.com/en/certified-insulation-products/certificate/14-d-006-963-10/
38. [S49] ACERMI, certificat 12/D/157/784/23 (Igloo France, Ouattitude N…), 04/11/2026 — https://acermi.com/en/certified-insulation-products/certificate/12-d-157-784-23/
39. [S50] ACERMI, certificat 16/D/152/1171/9 (Cellaouate, Breizhouate), 16/05/2025 — https://acermi.com/en/certified-insulation-products/certificate/16-d-152-1171-9/
40. [S51] ACERMI, certificat 20/134/1455/4 (Steico Flex F 036), 07/07/2026 — https://acermi.com/en/certified-insulation-products/certificate/20-134-1455-4/
41. [S52] Steico, fiche STEICOflex 036 FR (copie Samse, PDF 2016) — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1217262.pdf
42. [S53] ACERMI, certificat 17/127/1193/10 (Gutex Thermoflex FR), 16/05/2025 — https://acermi.com/en/certified-insulation-products/certificate/17-127-1193-10/
43. [S54] Gutex, fiche Thermoflex FR (copie Domomat) — https://domomat.com/fiche-technique-thermoflex-gutex-domomat.pdf ; [S55] Hornbach CH, Thermoflex 1350 × 575 (160 et 240 mm) — https://www.hornbach.ch/fr/p/panneau-isolant-en-fibres-de-bois-flexible-pour-isolation-entre-chevrons-gutex-thermoflex-1350-x-575-x-160-mm/12553643/
44. [S56] Soprema, fiche Pavaflex (Word 14/09/2018, copie Gobert) — https://gobert.groupegobert.com/ressources/images/articles/Fiches_techniques/SOPREMA FT PAVAFLEX.pdf ; [S57] Soprema/Pavatex, brochure DC-21/036 déc. 2021 (copie BigMat) — https://medias.bigmat.fr/data_medias/medias_finaux/documents/7640109021358-llTUXVkWaC.pdf
45. [S58] ACERMI, liste des produits certifiés (valide au 19/11/2026) — https://acermi.com/en/certified-insulation-products/certificate/17-d-153-1211-11/ (redirige vers la liste)
46. [S59] ACERMI, certificat 14/179/918/9 (Métisse RT), 16/05/2025 — https://acermi.com/en/certified-insulation-products/certificate/14-179-918-9/ ; [S60] Castorama, Métisse 0,6 × 1,2 m 200 mm R 5,1 — https://www.castorama.fr/panneau-laine-de-coton-metisse-0-6-x-1-2-m-ep-200-mm-r-5-1-m-k-w/3700807100091_CAFR.prd
47. [S61] ACERMI, certificat 14/130/962/11 (Biofib'Trio), 22/07/2025 — https://acermi.com/en/certified-insulation-products/certificate/14-130-962-11/ ; [S62] Biofib, Avis technique murs 20/14-329_V4 (extrait moteur) — https://www.biofib.com/wp-content/uploads/atec-20-14-329-v4-biofib-trio-application-murs.pdf
48. [S63] ACERMI, certificat 02/018/098/27 (GR 32 Nu…), 16/05/2025 — https://acermi.com/en/certified-insulation-products/certificate/02-018-098-27/
49. [S64] ACERMI, certificat 02/018/100/35 (GR 32 Revêtu Kraft…), 16/05/2025 — https://acermi.com/en/certified-insulation-products/certificate/02-018-100-35/
50. [S65] ACERMI, certificat 13/018/808/12 (Isoconfort 32 Revêtu Kraft), 16/05/2025 — https://acermi.com/en/certified-insulation-products/certificate/13-018-808-12/ ; [S66] certificat 08/018/540/19 (Isoconfort 32 Nu), 29/01/2026 — https://acermi.com/en/certified-insulation-products/certificate/08-018-540-19/
51. [S67] ACERMI, certificat 02/018/052/29 (IBR), 16/05/2025 — https://acermi.com/en/certified-insulation-products/certificate/02-018-052-29/ ; [S68] certificat 05/018/408/35 (Isoconfort 35 Revêtu Kraft), 16/07/2025 — https://acermi.com/en/certified-insulation-products/certificate/05-018-408-35/
52. [S69] ACERMI, certificat 04/015/301/14 (Rockcalm), 16/05/2025 — https://acermi.com/en/certified-insulation-products/certificate/04-015-301-14/
53. [S70] Knauf Insulation FR, fiche « Cloisons – Ultracoustic P » (≈ 2012, copie Chausson) — https://www.chausson.fr/media/article-document/203090 ; [S71] ACERMI, certificat 08/016/506/14 (Ultracoustic P), 16/05/2025 — https://acermi.com/en/certified-insulation-products/certificate/08-016-506-14/
54. [S72] Knauf Insulation, fiche Naturoll 035 (copie Chausson, certificat joint de 2013) — https://www.chausson.fr/media/article-document/211079 ; version 10/2015 (copie Gobert) — https://gobert.groupegobert.com/ressources/images/articles/Fiches_techniques/KNAUF FT NATUROLL 035.pdf ; [S73] ACERMI, certificat 02/016/144/21 (Naturoll 035…), 16/05/2025 — https://acermi.com/en/certified-insulation-products/certificate/02-016-144-21/
55. [S74] Profession plâtre, « Guide NF DTU 25.41 — Les principales nouveautés 2022 » (PDF lu dans l'espace de travail partagé ; URL d'origine non conservée — à reconfirmer)
56. [S75] Isover, notice Membrane Vario Xtra (copie Gedimat) — https://uploads.gedimat.fr/DOCUMENT/TYPE2/0000225966312.pdf
57. [S76] Service-public.gouv.fr, fiche F35083 MaPrimeRénov' — https://www.service-public.gouv.fr/particuliers/vosdroits/F35083
58. [S77] Gedimat, Membrane Vario Xtra rouleau 40 × 1,50 m — https://www.gedimat.fr/membrane-d-etancheite-a-l-air-vario-xtra-rouleau-de-40x1-50m-isover,1401834,2,12,1721.htm
59. [S78] Isover, fiche Membrane Vario Xtra MAJ 13/05/24 (copie Gedimat) — https://uploads.gedimat.fr/DOCUMENT/TYPE1/0000125966312.pdf
60. [S79] Gedimat, Adhésif Vario KB1 40 m × 60 mm — https://www.gedimat.fr/adhesif-vario-kb1-rouleau-de-40mx60mm-isover,1867391,3,21,961.htm ; [S80] Brico Dépôt, Adhésif Vario KB1 — https://www.bricodepot.fr/p/3596265257350/adhesif-d-etancheite-pour-membrane-vario-kb1

Pistes internes relues (non comptées comme sources) : `baticlair/docs/referentiels/isolation.md`, `isolation-des-combles.md` ; fichiers voisins `05-finitions-accessoires.md`, `06-negoce-regions.md` (pour DoubleFit et KB1 en carton).
