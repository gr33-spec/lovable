# 04 — Isolants, pare-vapeur et étanchéité à l'air (recherche du 19-20/11/2026)

Thème : isolation toutes familles (rouleaux, panneaux, vrac), pare-vapeur / frein-vapeur, étanchéité à l'air.
Méthode : consignes `_consignes.md`. Chaque ligne indique deux sources quand elles existent ; sinon statut « 1 source » ou « à confirmer ».
Le curl direct est bloqué : données lues par WebFetch (fiches PDF fabricant ou négoce) ou, à défaut, extraits de moteur de recherche (signalé « extrait »).
Date de consultation de toutes les URL : 19/11/2026 sauf mention contraire.

Convention : R donné par le fabricant (certificat ACERMI), jamais recalculé, sauf mention « R calculé = e/λ ».

(en cours de rédaction)

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

Les deux éditions (2024 et 2026) sont identiques : valeurs stables.

#### A1.2 GR 32 panneaux (nu / revêtu kraft) — 1,35 × 0,60 m, λ 0,032

Usage : cloisons et doublages ; le **GR 32 nu 45 mm** est l'isolant type de la cloison 72/48.

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|
| GR 32 Nu 45 mm | R 1,45 ; 15 pan/paquet = 12,15 m² ; 20 paq/pal (243 m²) | | [S6] fiche Isover GR 32 Nu (copie Chausson, date non lisible) | — | 1 source | dispo B (sur fabrication). R calculé 0,045/0,032 = 1,41 → ACERMI arrondit 1,45 ? incohérent : **à confirmer** (R imprimé 1,45 > e/λ ; possible λ certifié plus bas sur 45 mm) |
| GR 32 Nu 60 mm | R 1,85 ; 12 pan/paq = 9,72 m² ; 16 paq/pal | | [S6] | — | 1 source | |
| GR 32 Nu 100 mm | R 3,15 ; 8 pan/paq = 6,48 m² | | [S6] | — | 1 source | |
| GR 32 Nu 120 / 140 / 160 mm | R 3,75 / 4,35 / 5,00 ; 5 pan/paq = 4,05 m² | | [S6] | — | 1 source | |
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
| 200 mm kraft | R 6,25 (aides rampants en une couche) | [S13] extrait fiche Isover MAJ 24/03/26 | [S14] EPD One Click LCA « Isoconfort 32 Revêtu Kraft 200 mm » (existence) | confirmé (2 sources) pour R | |
| 45 mm (cloison) | **non trouvé** dans les extraits | — | — | à confirmer (fiche isover.fr 403 ; aucun négoce n'affiche 45 mm) | L'existence d'un Isoconfort 32 en 45 mm n'est pas démontrée : pour 72/48, le produit vérifié est le **GR 32 Nu 45 mm** (A1.2) |
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
| Rockcalm 45 mm | **n'existe pas** dans les sources | [S30] | recherche moteur | confirmé (2 sources) | pour 72/48 en Rockcalm : 40 mm |
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
| Ultracoustic 45 mm (cloison) | R 1,20 ; λ 0,037 ; rouleau 600 × 8000 mm ; 4 rlx/paquet (19,2 m²) ; 24 paq/pal | extrait moteur page Knauf fr-FR/fr-MA « Ultracoustic » | — | 1 source (extrait) | à confirmer sur fiche FR |
| Acoustifit 45 mm | R 1,20 ; panneau 600 × 1350 ; 16 pan/paquet = 12,96 m² | extrait moteur page Knauf **fr-BE** | — | 1 source, **Belgique** | produit belge : à confirmer pour la France |
| Panneau Knauf λ 0,035, 45 mm | R 1,25 ; 600 × 1200 ; 16 pan = 11,52 m² ; 28 paq/pal | [S39] fiche Knauf Insulation **Belgique 12/2017** (« Cloisons de séparation ») | — | 1 source, ancienne, BE | ne pas utiliser pour la France |
| Acoustilaine 035 (kraft, roulé) | épaisseurs 75 à 280 mm, longueurs 2,1 à 8,1 m | Batiproduits (extrait) | — | 1 source | tableau à confirmer |
| Naturoll 035 (nu) | 120 à 220 mm, largeur 575-600, longueur 2,7-5,3 m | Batiproduits (extrait) | — | 1 source | tableau à confirmer |
| « TP 138 », « Absolute », « Acoustiroll » | **non trouvés** pour la France 2026 | — | — | à confirmer (noms anciens ou étrangers) | |

### A5. Isolant de cloison acoustique 72/48 — synthèse pour le comptoir

Règle de pose (Rockwool, guide cloisons 12/2023 [S40], reprenant NF DTU 25.41 février 2022) : cloison 72/48 = isolant **30 à 45 mm** ; l'épaisseur doit être ≤ profondeur du montant (48 mm) pour ne pas pousser les parements ; entraxe 60 cm → panneaux semi-rigides 0,60 m posés tels quels ; entraxe 40 cm → panneaux recoupés à 40 cm.

| Produit vérifié | Épaisseur | R | Format | m²/colis | Statut |
|---|---|---|---|---|---|
| Isover GR 32 Nu | 45 | 1,45 | 1,35 × 0,60 | 12,15 (15 pan) | 1 source ; dispo sur fabrication |
| URSA PRK 32 | 45 | 1,40 | 1,35 × 0,60 | 10,53 (13 pan) | confirmé (2 sources) pour R/format |
| Rockwool Rockmur nu / kraft | 40 (45 retiré en 2026) | 1,10 | 1,35 × 0,60 | 9,72 nu (12) / 11,34 kraft (14) | confirmé (2 sources) |
| Rockwool Rockcalm | 40 | 1,10 | 1,35 × 0,60 | à confirmer | 2 sources anciennes |
| Knauf Ultracoustic | 45 | 1,20 | rouleau 0,60 × 8 m | 19,2 (4 rlx) | 1 source (extrait) |
| Isover Isoconfort 32 45 mm | — | — | — | — | **non trouvé** : ne pas proposer sans fiche |

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
