# Chantiers types plaquiste-isolation (jeu de test pour l'ouverture du métier)

Calculés par le moteur de Mobiiz (`packages/domain`, `computeWorkItem` puis `purchaseList`) avec `referentiel.json`
(version `plaquiste-isolation-2026.11.20-5`), règles « à confirmer » acceptées (mode validateur). **Tout est à relire par un plaquiste.**
Écrit par `outils/calculer_chantiers.mjs` : ne pas modifier à la main, relancer l'outil.

Lecture : « Lu au devis » = données que le modèle de lecture doit trouver dans la ligne ; « Questions » = ce que le moteur
demande quand le devis ne le dit pas, dans l'ordre où il les rencontre ; « Suggestions » = cases proposées (jamais ajoutées
d'office) ; « Hypothèses » = valeurs par défaut dites à l'artisan, modifiables d'un geste.

## PI-01 — Maison neuve : cloisons de distribution

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Cloison de distribution type Placostil 72/48, BA13 standard, hauteur 2,50 m, avec 3 blocs-portes | 45 | m² | cloison-distributive |

**Questions attendues** : `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : fixation_rail = 1 ; enduit_forme = 1 ; marque_cloueur = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Classement coupe-feu : sans exigence feu ; Longueur de cloison : 18 m ; Plaques par face : 1 plaque par face ; Type de plaque : standard ; Longueur des plaques : 2,5 m ; Montants : Montants M48 ; Largeur du montant : 48 mm ; Montage des montants : montants simples à 60 cm ; Longueur des montants : 2,49 m ; Rails : Rails R48 ; Vis TTPC 25 : Vis TTPC 25 ; Vis TRPF : Vis TRPF 13 ; Clous de fixation des rails : Clous + gaz béton ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre

### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)

| Article | Commande | Besoin calculé | Précision |
|---|---|---|---|
| Plaques BA13 standard 1,20 × 2,5 m | 32 plaques | 32 pièces | 1 plaque par face sur 18 m de cloison, hauteur 2,5 m |
| Montants M48 longueur 2,49 m | 39 montants | 39 pièces | montants simples à 60 cm |
| Rails R48 | 13 longueurs de 3 m | 37,8 ml | rails haut et bas |
| Vis TTPC 25 | 2 boîtes de 1000 | 1350 pièces |  |
| Vis TRPF 13 | 1 boîte de 500 | 90 pièces |  |
| Clous Spit pour cloueur à gaz, béton 20 mm, avec cartouches de gaz | 1 boîte de 500 avec gaz | 64 pièces | une fixation tous les 60 cm |
| Bande à joint | 1 rouleau de 150 m | 126 ml | joints jointoyés avec bande |
| Enduit poudre | 2 sacs de 25 kg | 29,7 kg |  |

## PI-02 — Rénovation : cloison isolée, hauteur 2,60 m

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Cloison 72/48 isolée laine de verre GR32 45 mm | 32 | m² | cloison-distributive |

**Questions attendues** : `param:hauteur` (« Hauteur sous plafond ? ») ; `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : hauteur = 2.6 m ; fixation_rail = 2 ; enduit_forme = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Classement coupe-feu : sans exigence feu ; Longueur de cloison : 12,31 m ; Plaques par face : 1 plaque par face ; Type de plaque : standard ; Longueur des plaques : 2,6 m ; Montants : Montants M48 ; Largeur du montant : 48 mm ; Montage des montants : montants simples à 40 cm ; Portes dans la cloison : 0 ; Longueur des montants : 2,59 m ; Rails : Rails R48 ; Vis TTPC 25 : Vis TTPC 25 ; Vis TRPF : Vis TRPF 13 ; Chevilles de fixation des rails : Chevilles 6 × 40 ; Isolant de cloison : Laine 45 mm (PRK 32) ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre

### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)

| Article | Commande | Besoin calculé | Précision |
|---|---|---|---|
| Plaques BA13 standard 1,20 × 2,6 m | 22 plaques | 22 pièces | 1 plaque par face sur 12,31 m de cloison, hauteur 2,6 m |
| Montants M48 longueur 2,59 m | 34 montants | 34 pièces | montants simples à 40 cm |
| Rails R48 | 9 longueurs de 3 m | 25,85 ml | rails haut et bas |
| Vis TTPC 25 | 2 boîtes de 1000 | 1184 pièces |  |
| Vis TRPF 13 | 1 boîte de 500 | 96 pièces |  |
| Chevilles 6 × 40 | 1 sachet de 50 | 44 pièces | une cheville tous les 60 cm |
| Laine 45 mm (PRK 32) | 4 colis de 10,53 m² | 33,6 m² |  |
| Bande à joint | 1 rouleau de 150 m | 89,6 ml | joints jointoyés avec bande |
| Enduit poudre | 1 sac de 25 kg | 21,12 kg |  |

## PI-03 — ERP : cloison coupe-feu EI 60 en parement double, hauteur 3,00 m

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Cloison 98/48 EI60, 2 BA13 feu par face, laine 45 mm, hauteur 3,00 m | 60 | m² | cloison-distributive |

**Questions attendues** : `param:marque_systeme` (« Ton système coupe-feu, c'est quelle marque ? ») ; `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : fixation_rail = 1 ; enduit_forme = 1 ; marque_cloueur = 1 ; marque_systeme = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Longueur de cloison : 20 m ; Longueur des plaques : 3 m ; Montants : Montants M48 ; Largeur du montant : 48 mm ; Montage des montants : montants simples à 60 cm ; Portes dans la cloison : 0 ; Longueur des montants : 2,99 m ; Rails : Rails R48 ; Vis TTPC 25 : Vis TTPC 25 ; Vis TTPC 35 : Vis TTPC 35 ; Vis TRPF : Vis TRPF 13 ; Clous de fixation des rails : Clous + gaz béton ; Isolant de cloison : Laine 45 mm (PRK 32) ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre

### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)

| Article | Commande | Besoin calculé | Précision |
|---|---|---|---|
| Plaques Placo feu BA13 1,20 × 3 m | 70 plaques | 70 pièces | 2 plaques par face sur 20 m de cloison, hauteur 3 m ; système coupe-feu Placo EI 60 : en entier dans cette marque ; à défaut, un système complet d'une autre marque avec son procès-verbal, signalé à l'artisan ; jamais de mélange de marques |
| Montants M48 longueur 2,99 m Placo | 37 montants | 37 pièces | montants simples à 60 cm ; système coupe-feu Placo EI 60 : en entier dans cette marque ; à défaut, un système complet d'une autre marque avec son procès-verbal, signalé à l'artisan ; jamais de mélange de marques |
| Rails R48, longueur 3 m Placo | 14 longueurs de 3 m | 42 ml | rails haut et bas ; système coupe-feu Placo EI 60 : en entier dans cette marque ; à défaut, un système complet d'une autre marque avec son procès-verbal, signalé à l'artisan ; jamais de mélange de marques |
| Vis TTPC 25 Placo | 1 boîte de 1000 | 600 pièces | système coupe-feu Placo EI 60 : en entier dans cette marque ; à défaut, un système complet d'une autre marque avec son procès-verbal, signalé à l'artisan ; jamais de mélange de marques |
| Vis TTPC 35 Placo | 2 boîtes de 1000 | 1620 pièces | 2e peau ; système coupe-feu Placo EI 60 : en entier dans cette marque ; à défaut, un système complet d'une autre marque avec son procès-verbal, signalé à l'artisan ; jamais de mélange de marques |
| Vis TRPF 13 Placo | 1 boîte de 500 | 120 pièces | système coupe-feu Placo EI 60 : en entier dans cette marque ; à défaut, un système complet d'une autre marque avec son procès-verbal, signalé à l'artisan ; jamais de mélange de marques |
| Clous Spit pour cloueur à gaz, béton 20 mm, avec cartouches de gaz | 1 boîte de 500 avec gaz | 71 pièces | une fixation tous les 60 cm |
| Laine minérale 45 mm Placo | 6 colis de 10,53 m² | 63 m² | système coupe-feu Placo EI 60 : en entier dans cette marque ; à défaut, un système complet d'une autre marque avec son procès-verbal, signalé à l'artisan ; jamais de mélange de marques |
| Bande à joint | 2 rouleaux de 150 m | 168 ml | joints jointoyés avec bande |
| Enduit poudre | 2 sacs de 25 kg | 39,6 kg |  |

## PI-04 — Salle de bain : cloison et plafond hydro

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Cloison 72/48 en plaques hydrofuges H1, montants à 40 cm sous faïence, HSP 2,50 m | 12 | m² | cloison-distributive |
| Plafond BA13 hydro sur ossature F530 sous solives | 6 | m² | plafond-fourrures |

**Questions attendues** : `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : fixation_rail = 1 ; enduit_forme = 1 ; entraxe_fourrures = 40 cm ; marque_cloueur = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Classement coupe-feu : sans exigence feu ; Longueur de cloison : 4,8 m ; Plaques par face : 1 plaque par face ; Longueur des plaques : 2,5 m ; Montants : Montants M48 ; Largeur du montant : 48 mm ; Portes dans la cloison : 0 ; Longueur des montants : 2,49 m ; Rails : Rails R48 ; Vis TTPC 25 : Vis TTPC 25 ; Vis TRPF : Vis TRPF 13 ; Clous de fixation des rails : Clous + gaz béton ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre ; Plaques : 1 ; Longueur des plaques de plafond : 2,5 m ; Fourrures : Fourrures F530 ; Suspentes longues : Suspentes longues 171 (plénum 20 à 150 mm) ; Hauteur de suspension : suspentes longues ; Vis de suspente (TTPC 35) : Vis TTPC 35 ; Éclisses : Éclisses ; Cornière de rive : Cornières de rive ; Périmètre du plafond : 12 m ; Clous de fixation : Clous + gaz béton

### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)

| Article | Commande | Besoin calculé | Précision |
|---|---|---|---|
| Plaques BA13 hydro H1 1,20 × 2,5 m | 12 plaques | 12 pièces | 1 plaque par face sur 4,8 m de cloison, hauteur 2,5 m |
| Montants M48 longueur 2,49 m | 14 montants | 14 pièces | montants simples à 40 cm |
| Rails R48 | 4 longueurs de 3 m | 10,08 ml | rails haut et bas |
| Vis TTPC 25 | 1 boîte de 1000 | 534 pièces |  |
| Vis TRPF 13 | 1 boîte de 500 | 36 pièces |  |
| Clous Spit pour cloueur à gaz, béton 20 mm, avec cartouches de gaz | 1 boîte de 500 avec gaz | 38 pièces | une fixation tous les 60 cm |
| Bande à joint | 1 rouleau de 150 m | 42 ml | joints jointoyés avec bande |
| Enduit poudre | 1 sac de 25 kg | 9,9 kg |  |
| Fourrures F530 | 6 longueurs de 3 m | 18 ml | entraxe 40 cm |
| Suspentes longues 171 (plénum 20 à 150 mm) | 1 boîte de 100 | 17 pièces |  |
| Vis TTPC 35 | 1 boîte de 1000 | 34 pièces |  |
| Éclisses | 1 boîte de 50 | 6 pièces |  |
| Cornières de rive | 5 longueurs de 3 m | 12,6 ml |  |

> Plaque hydro en plafond : entraxe des fourrures 0,40 m (Placo 2023). Sous faïence, montants à 40 cm (lu au devis ; la valeur imposée par le DTU 25.41 § 6.3.2.1 selon le format des carreaux est à confirmer).

## PI-05 — Doublage collé PSE 10+80 sur murs béton

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Doublage collé Placomur 10+80 PSE, hauteur 2,50 m | 30 | m² | doublage-colle |

**Questions attendues** : `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : enduit_forme = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Complexes de doublage : Complexes de doublage ; Longueur de mur : 12 m ; Longueur des complexes : 2,5 m ; Mortier adhésif : Mortier adhésif MAP ; Mur à doubler : mur plan ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre

### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)

| Article | Commande | Besoin calculé | Précision |
|---|---|---|---|
| Complexes de doublage Placomur 10+80 PSE 1,20 × 2,5 m | 11 panneaux | 11 pièces | pour 12 m de mur, hauteur 2,5 m |
| Mortier adhésif MAP | 3 sacs de 25 kg | 54 kg |  |
| Bande à joint | 1 rouleau de 150 m | 42 ml | joints jointoyés avec bande |
| Enduit poudre | 1 sac de 25 kg | 9,9 kg |  |

## PI-06 — Doublage collé Doublissimo 13+100, HSP 2,60 m

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Doublage Doublissimo 13+100 R 3,40 collé au MAP | 45 | m² | doublage-colle |

**Questions attendues** : `param:hauteur` (« Hauteur sous plafond ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : hauteur = 2.6 m ; enduit_forme = 2

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Complexes de doublage : Complexes de doublage ; Longueur de mur : 17,31 m ; Longueur des complexes : 2,6 m ; Mortier adhésif : Mortier adhésif MAP ; Mur à doubler : mur plan ; Bande à joint : Bande à joint ; Enduit à joint prêt à l'emploi : Enduit prêt à l'emploi

### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)

| Article | Commande | Besoin calculé | Précision |
|---|---|---|---|
| Complexes de doublage Doublissimo 13+100 R 3,40 1,20 × 2,6 m | 16 panneaux | 16 pièces | pour 17,31 m de mur, hauteur 2,6 m |
| Mortier adhésif MAP | 4 sacs de 25 kg | 81 kg |  |
| Bande à joint | 1 rouleau de 150 m | 63 ml | joints jointoyés avec bande |
| Enduit prêt à l'emploi | 1 seau de 25 kg | 21,15 kg |  |

## PI-07 — Doublage sur ossature Optima avec laine GR32 100 mm et pare-vapeur

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Doublage sur ossature métallique type Optima, BA13, laine de verre GR32 kraft 100 mm | 40 | m² | doublage-fourrures |
| Membrane pare-vapeur hygro-régulante Vario Xtra avec adhésifs | 40 | m² | pare-vapeur |

**Questions attendues** : `param:hauteur` (« Hauteur sous plafond ? ») ; `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : hauteur = 2.5 m ; fixation_rail = 2 ; enduit_forme = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Longueur de mur : 16 m ; Type de plaque : standard ; Longueur des plaques : 2,5 m ; Fourrures : Fourrures F530 ; Rails F 530 : Rails F530 ; Appuis intermédiaires : Appuis intermédiaires ; Vis TTPC 25 : Vis TTPC 25 ; Vis TRPF : Vis TRPF 13 ; Chevilles de fixation : Chevilles 6 × 40 ; Isolant : GR 32 kraft 100 ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre ; Membrane pare-vapeur : Membrane pare-vapeur ; Adhésif de membrane : Adhésif membrane

### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)

| Article | Commande | Besoin calculé | Précision |
|---|---|---|---|
| Plaques BA13 standard 1,20 × 2,5 m | 14 plaques | 14 pièces | pour 16 m de mur |
| Fourrures F530 | 36 longueurs de 3 m | 106,8 ml | fourrures verticales tous les 60 cm |
| Rails F530 | 15 longueurs de 2,35 m | 33,6 ml | haut et bas |
| Appuis intermédiaires pour isolant de 100 mm | 1 boîte de 50 | 30 pièces |  |
| Vis TTPC 25 | 1 boîte de 1000 | 440 pièces |  |
| Vis TRPF 13 | 1 boîte de 500 | 80 pièces |  |
| Chevilles 6 × 40 | 2 sachets de 50 | 87 pièces | une cheville tous les 60 cm |
| GR 32 kraft 100 | 13 colis de 3,24 m² | 42 m² |  |
| Bande à joint | 1 rouleau de 150 m | 56 ml | joints jointoyés avec bande |
| Enduit poudre | 1 sac de 25 kg | 13,2 kg |  |
| Membrane pare-vapeur | 1 rouleau de 60 m² | 44 m² |  |
| Adhésif membrane | 1 rouleau de 40 m | 32 ml |  |

## PI-08 — Contre-cloison M48 devant mur humide, HSP 2,40 m

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Contre-cloison sur montants M48 autoportante, BA13, hauteur 2,40 m | 20 | m² | contre-cloison-montants |

**Questions attendues** : `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : fixation_rail = 1 ; enduit_forme = 1 ; marque_cloueur = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Longueur de mur : 8,33 m ; Type de plaque : standard ; Longueur des plaques : 2,5 m ; Montants : Montants M48 ; Largeur du montant : 48 mm ; Montage des montants : montants doublés à 60 cm ; Longueur des montants : 2,49 m ; Rails : Rails R48 ; Vis TTPC 25 : Vis TTPC 25 ; Marque de l'ossature : marque non écrite ; Vis TRPF : Vis TRPF 13 ; Clous de fixation : Clous + gaz béton ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre

### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)

| Article | Commande | Besoin calculé | Précision |
|---|---|---|---|
| Plaques BA13 standard 1,20 × 2,5 m | 8 plaques | 8 pièces | pour 8,33 m de mur |
| Montants M48 longueur 2,49 m | 30 montants | 30 pièces | montants doublés à 60 cm |
| Rails R48 | 6 longueurs de 3 m | 17,5 ml | haut et bas |
| Vis TTPC 25 | 1 boîte de 1000 | 380 pièces |  |
| Vis TRPF 13 | 1 boîte de 500 | 100 pièces |  |
| Clous Spit pour cloueur à gaz, béton 20 mm, avec cartouches de gaz | 1 boîte de 500 avec gaz | 30 pièces | une fixation tous les 60 cm |
| Bande à joint | 1 rouleau de 150 m | 28 ml | joints jointoyés avec bande |
| Enduit poudre | 1 sac de 25 kg | 6,6 kg |  |

## PI-09 — Plafond sous solives avec isolant IBR 200 posé dessus

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Faux plafond BA13 sur fourrures F530 et suspentes, sous solivage bois | 25 | m² | plafond-fourrures |
| Isolation laine de verre IBR kraft 200 mm R 5 déroulée sur plafond | 25 | m² | isolation-rouleaux |

**Questions attendues** : `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : fixation_rail = 1 ; enduit_forme = 1 ; marque_cloueur = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Classement coupe-feu : sans exigence feu ; Plaques : 1 ; Longueur des plaques de plafond : 2,5 m ; Type de plaque : standard ; Fourrures : Fourrures F530 ; Entraxe des fourrures : 60 cm ; Suspentes longues : Suspentes longues 171 (plénum 20 à 150 mm) ; Hauteur de suspension : suspentes longues ; Vis de suspente (TTPC 35) : Vis TTPC 35 ; Éclisses : Éclisses ; Cornière de rive : Cornières de rive ; Périmètre du plafond : 22,25 m ; Vis TTPC 25 : Vis TTPC 25 ; Clous de fixation : Clous + gaz béton ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre ; Couches : 1

### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)

| Article | Commande | Besoin calculé | Précision |
|---|---|---|---|
| Plaques BA13 standard 1,20 × 2,5 m | 9 plaques | 9 pièces |  |
| Fourrures F530 | 15 longueurs de 3 m | 44,75 ml | entraxe 60 cm |
| Suspentes longues 171 (plénum 20 à 150 mm) | 1 boîte de 100 | 39 pièces |  |
| Vis TTPC 35 | 1 boîte de 1000 | 78 pièces |  |
| Éclisses | 1 boîte de 50 | 14,92 pièces |  |
| Cornières de rive | 8 longueurs de 3 m | 23,36 ml |  |
| Vis TTPC 25 | 1 boîte de 1000 | 300 pièces |  |
| Clous Spit pour cloueur à gaz, béton 20 mm, avec cartouches de gaz | 1 boîte de 500 avec gaz | 39 pièces | une fixation tous les 60 cm |
| Bande à joint | 1 rouleau de 150 m | 35 ml | joints jointoyés avec bande |
| Enduit poudre | 1 sac de 25 kg | 8,25 kg |  |
| IBR 200 | 5 colis de 5,4 m² | 26,25 m² |  |

## PI-10 — Plafond coupe-feu sous dalle béton, 2 BA13, plénum 30 cm

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Plafond suspendu coupe-feu REI 60, 2 BA13 feu (Placoflam) sous dalle béton, plénum 30 cm | 40 | m² | plafond-fourrures |

**Questions attendues** : `param:marque_systeme` (« Ton système coupe-feu, c'est quelle marque ? ») ; `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : fixation_rail = 1 ; enduit_forme = 1 ; marque_cloueur = 1 ; marque_systeme = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Longueur des plaques de plafond : 2,5 m ; Fourrures : Fourrures F530 ; Entraxe des fourrures : 60 cm ; Suspentes sécables : Suspentes sécables (plénum 80 à 580 mm) ; Chevilles de suspente : Chevilles métal 6 × 40 ; Éclisses : Éclisses ; Cornière de rive : Cornières de rive ; Périmètre du plafond : 25,2 m ; Vis TTPC 25 : Vis TTPC 25 ; Vis TTPC 35 (2e peau) : Vis TTPC 35 ; Clous de fixation : Clous + gaz béton ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre ; Entretoises PRF : Entretoises Stil Flam Placo

### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)

| Article | Commande | Besoin calculé | Précision |
|---|---|---|---|
| Plaques Placo feu BA13 1,20 × 2,5 m | 28 plaques | 28 pièces | système coupe-feu Placo REI 60 : en entier dans cette marque ; à défaut, un système complet d'une autre marque avec son procès-verbal, signalé à l'artisan ; jamais de mélange de marques |
| Fourrures, longueur 3 m Placo | 24 longueurs de 3 m | 71,6 ml | entraxe 60 cm ; système coupe-feu Placo REI 60 : en entier dans cette marque ; à défaut, un système complet d'une autre marque avec son procès-verbal, signalé à l'artisan ; jamais de mélange de marques |
| Suspentes sécables Placo | 2 boîtes de 50 | 63 pièces | système coupe-feu Placo REI 60 : en entier dans cette marque ; à défaut, un système complet d'une autre marque avec son procès-verbal, signalé à l'artisan ; jamais de mélange de marques |
| Chevilles métal 6 × 40 | 1 boîte de 100 | 63 pièces |  |
| Éclisses de fourrure Placo | 1 boîte de 50 | 23,87 pièces | système coupe-feu Placo REI 60 : en entier dans cette marque ; à défaut, un système complet d'une autre marque avec son procès-verbal, signalé à l'artisan ; jamais de mélange de marques |
| Cornières de rive, longueur 3 m Placo | 9 longueurs de 3 m | 26,46 ml | système coupe-feu Placo REI 60 : en entier dans cette marque ; à défaut, un système complet d'une autre marque avec son procès-verbal, signalé à l'artisan ; jamais de mélange de marques |
| Vis TTPC 25 Placo | 1 boîte de 1000 | 320 pièces | système coupe-feu Placo REI 60 : en entier dans cette marque ; à défaut, un système complet d'une autre marque avec son procès-verbal, signalé à l'artisan ; jamais de mélange de marques |
| Vis TTPC 35 Placo | 1 boîte de 1000 | 920 pièces | système coupe-feu Placo REI 60 : en entier dans cette marque ; à défaut, un système complet d'une autre marque avec son procès-verbal, signalé à l'artisan ; jamais de mélange de marques |
| Clous Spit pour cloueur à gaz, béton 20 mm, avec cartouches de gaz | 1 boîte de 500 avec gaz | 45 pièces | une fixation tous les 60 cm |
| Bande à joint | 1 rouleau de 150 m | 56 ml | joints jointoyés avec bande |
| Enduit poudre | 1 sac de 25 kg | 13,2 kg |  |
| Entretoises Stil Flam Placo | 52 entretoises | 52 pièces | montage feu Placo Stil Flam, une entretoise tous les 1,20 m |

## PI-11 — Combles perdus : soufflage laine de verre R 7

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Isolation des combles perdus par soufflage de laine de verre Comblissimo R = 7 | 80 | m² | isolation-soufflee |

**Questions attendues** : aucune

**Réponses du test** : aucune

**Suggestions proposées** : aucune — cochées dans le test : aucune

**Hypothèses dites** : Isolant à souffler : Isolant à souffler

### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)

| Article | Commande | Besoin calculé | Précision |
|---|---|---|---|
| Laine de verre à souffler Comblissimo, sac de 17,3 kg | 18 sacs | 18 pièces | pour 80 m² à R 7, épaisseur après tassement du certificat |

## PI-12 — Combles perdus : ouate de cellulose R 8

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Soufflage ouate de cellulose en combles perdus, R 8 | 60 | m² | isolation-soufflee |

**Questions attendues** : `param:produit_vrac` (« Quel isolant à souffler ? »)

**Réponses du test** : produit_vrac = 5

**Suggestions proposées** : aucune — cochées dans le test : aucune

**Hypothèses dites** : Isolant à souffler : Isolant à souffler

### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)

| Article | Commande | Besoin calculé | Précision |
|---|---|---|---|
| Ouate de cellulose Igloo, sac de 10 kg | 60 sacs | 60 pièces | pour 60 m² à R 8, épaisseur après tassement du certificat |

> Igloo compté en sacs de 10 kg (certificat ACERMI et fiche Ouattitude concordants) ; le sac de 11,3 kg vu chez un distributeur n'est dans aucun tableau certifié.

## PI-13 — Combles aménagés : rampants isolés, membrane, plafond

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Isolation des rampants Isoconfort 35 kraft 220 mm R 6,25 | 50 | m² | isolation-rouleaux |
| Membrane Vario Xtra et adhésifs | 50 | m² | pare-vapeur |
| Plafond rampant BA13 sur fourrures et suspentes sous chevrons | 50 | m² | plafond-fourrures |

**Questions attendues** : `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : plenum = 2 ; fixation_rail = 1 ; enduit_forme = 1 ; marque_cloueur = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Couches : 1 ; Membrane pare-vapeur : Membrane pare-vapeur ; Adhésif de membrane : Adhésif membrane ; Plaques : Plaques BA13 ; Classement coupe-feu : sans exigence feu ; Plaques : 1 ; Longueur des plaques de plafond : 2,5 m ; Type de plaque : standard ; Fourrures : Fourrures F530 ; Entraxe des fourrures : 60 cm ; Suspentes sécables : Suspentes sécables (plénum 80 à 580 mm) ; Vis de suspente (TTPC 35) : Vis TTPC 35 ; Éclisses : Éclisses ; Cornière de rive : Cornières de rive ; Périmètre du plafond : 31,5 m ; Vis TTPC 25 : Vis TTPC 25 ; Clous de fixation : Clous + gaz béton ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre

### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)

| Article | Commande | Besoin calculé | Précision |
|---|---|---|---|
| Isoconfort 35 220 | 16 colis de 3,36 m² | 52,5 m² |  |
| Membrane pare-vapeur | 1 rouleau de 60 m² | 55 m² |  |
| Adhésif membrane | 1 rouleau de 40 m | 40 ml |  |
| Plaques BA13 standard 1,20 × 2,5 m | 18 plaques | 18 pièces |  |
| Fourrures F530 | 30 longueurs de 3 m | 89,5 ml | entraxe 60 cm |
| Suspentes sécables (plénum 80 à 580 mm) | 2 boîtes de 50 | 78 pièces |  |
| Vis TTPC 35 | 1 boîte de 1000 | 156 pièces |  |
| Éclisses | 1 boîte de 50 | 29,83 pièces |  |
| Cornières de rive | 12 longueurs de 3 m | 33,08 ml |  |
| Vis TTPC 25 | 1 boîte de 1000 | 600 pièces |  |
| Clous Spit pour cloueur à gaz, béton 20 mm, avec cartouches de gaz | 1 boîte de 500 avec gaz | 56 pièces | une fixation tous les 60 cm |
| Bande à joint | 1 rouleau de 150 m | 70 ml | joints jointoyés avec bande |
| Enduit poudre | 1 sac de 25 kg | 16,5 kg |  |

> Sous rampants avec 220 mm de laine entre et sous chevrons : la suspente doit descendre plus bas que 15 cm (réponse « 15 à 58 cm »). Les suspentes Intégra (Isover) ne sont pas encore dans la fiche : à confirmer.

## PI-14 — Séparatif de logements SAD 160

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Cloison séparative SAD 160, 2 BA13 par face, double ossature M48, laine 45 mm, HSP 2,50 m | 22 | m² | cloison-separative |

**Questions attendues** : `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : fixation_rail = 1 ; enduit_forme = 1 ; marque_cloueur = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Longueur de cloison : 8,8 m ; Type de plaque : standard ; Longueur des plaques : 2,5 m ; Montants : Montants M48 ; Longueur des montants : 2,49 m ; Rails : Rails R48 ; Vis TTPC 25 : Vis TTPC 25 ; Vis TTPC 35 : Vis TTPC 35 ; Vis TRPF : Vis TRPF 13 ; Clous de fixation : Clous + gaz béton ; Isolant : Laine 45 mm (PRK 32) ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre

### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)

| Article | Commande | Besoin calculé | Précision |
|---|---|---|---|
| Plaques BA13 standard 1,20 × 2,5 m | 31 plaques | 31 pièces |  |
| Montants M48 longueur 2,49 m | 33 montants | 33 pièces | deux files (SAD) |
| Rails R48 | 13 longueurs de 3 m | 36,96 ml | SAA : un rail large (R70 ou R90) haut et bas ; SAD : deux rails R48 haut et bas |
| Vis TTPC 25 | 1 boîte de 1000 | 264 pièces |  |
| Vis TTPC 35 | 1 boîte de 1000 | 660 pièces |  |
| Vis TRPF 13 | 1 boîte de 500 | 88 pièces |  |
| Clous Spit pour cloueur à gaz, béton 20 mm, avec cartouches de gaz | 1 boîte de 500 avec gaz | 62 pièces | une fixation tous les 60 cm |
| Laine 45 mm (PRK 32) | 3 colis de 10,53 m² | 23,1 m² |  |
| Bande à joint | 1 rouleau de 150 m | 61,6 ml | joints jointoyés avec bande |
| Enduit poudre | 1 sac de 25 kg | 14,52 kg |  |

> Quantités de la séparative : déduites de la constitution, à confirmer (aucun quantitatif fabricant SAA / SAD lu). La 2e couche de laine se lit au devis (ligne à part).

## PI-15 — Rénovation d'appartement : cloisons, doublage collé, plafond béton

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Cloison 72/48 BA13 | 18 | m² | cloison-distributive |
| Doublage collé 10+80 | 26 | m² | doublage-colle |
| Faux plafond BA13 sous dalle béton | 15 | m² | plafond-fourrures |
| Bandes et enduit sur l'ensemble des ouvrages | 1 | ens | aucun (ligne sans fourniture) |

**Questions attendues** : `param:hauteur` (« Hauteur sous plafond ? ») ; `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : hauteur = 2.5 m ; fixation_rail = 1 ; enduit_forme = 1 ; marque_cloueur = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Classement coupe-feu : sans exigence feu ; Longueur de cloison : 7,2 m ; Plaques par face : 1 plaque par face ; Type de plaque : standard ; Longueur des plaques : 2,5 m ; Montants : Montants M48 ; Largeur du montant : 48 mm ; Montage des montants : montants simples à 60 cm ; Portes dans la cloison : 0 ; Longueur des montants : 2,49 m ; Rails : Rails R48 ; Vis TTPC 25 : Vis TTPC 25 ; Vis TRPF : Vis TRPF 13 ; Clous de fixation des rails : Clous + gaz béton ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre ; Complexes de doublage : Complexes de doublage ; Longueur de mur : 10,4 m ; Longueur des complexes : 2,5 m ; Mortier adhésif : Mortier adhésif MAP ; Mur à doubler : mur plan ; Plaques : 1 ; Longueur des plaques de plafond : 2,5 m ; Fourrures : Fourrures F530 ; Entraxe des fourrures : 60 cm ; Suspentes longues : Suspentes longues 171 (plénum 20 à 150 mm) ; Hauteur de suspension : suspentes longues ; Chevilles de suspente : Chevilles métal 6 × 40 ; Éclisses : Éclisses ; Cornière de rive : Cornières de rive ; Périmètre du plafond : 17,25 m ; Clous de fixation : Clous + gaz béton

### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)

| Article | Commande | Besoin calculé | Précision |
|---|---|---|---|
| Plaques BA13 standard 1,20 × 2,5 m | 19 plaques | 19 pièces | 1 plaque par face sur 7,2 m de cloison, hauteur 2,5 m |
| Montants M48 longueur 2,49 m | 14 montants | 14 pièces | montants simples à 60 cm |
| Rails R48 | 6 longueurs de 3 m | 15,12 ml | rails haut et bas |
| Vis TTPC 25 | 1 boîte de 1000 | 720 pièces |  |
| Vis TRPF 13 | 1 boîte de 500 | 36 pièces |  |
| Clous Spit pour cloueur à gaz, béton 20 mm, avec cartouches de gaz | 1 boîte de 500 avec gaz | 57 pièces | une fixation tous les 60 cm |
| Bande à joint | 1 rouleau de 150 m | 107,8 ml | joints jointoyés avec bande |
| Enduit poudre | 2 sacs de 25 kg | 25,41 kg |  |
| Complexes de doublage 10+80 1,20 × 2,5 m | 10 panneaux | 10 pièces | pour 10,4 m de mur, hauteur 2,5 m |
| Mortier adhésif MAP | 2 sacs de 25 kg | 46,8 kg |  |
| Fourrures F530 | 9 longueurs de 3 m | 26,85 ml | entraxe 60 cm |
| Suspentes longues 171 (plénum 20 à 150 mm) | 1 boîte de 100 | 24 pièces |  |
| Chevilles métal 6 × 40 | 1 boîte de 100 | 24 pièces |  |
| Éclisses | 1 boîte de 50 | 8,95 pièces |  |
| Cornières de rive | 7 longueurs de 3 m | 18,11 ml |  |

> « Bandes et enduit sur l'ensemble » : déjà compris dans chaque ouvrage, jamais recompté (piège n° 4 de l'ancien référentiel). La ligne « ens » n'est pas une fourniture.

## PI-16 — Finition seule : bandes et enduit prêt à l'emploi

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Traitement des joints bandes et enduit prêt à l'emploi | 120 | m² | joints-seuls |

**Questions attendues** : aucune

**Réponses du test** : aucune

**Suggestions proposées** : aucune — cochées dans le test : aucune

**Hypothèses dites** : Bande à joint : Bande à joint

### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)

| Article | Commande | Besoin calculé | Précision |
|---|---|---|---|
| Bande à joint | 2 rouleaux de 150 m | 168 ml | joints jointoyés avec bande |

## PI-17 — Maison ancienne : cloison 72/48 en 3,00 m de haut

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Cloison 72/48 BA13 hauteur 3,00 m | 24 | m² | cloison-distributive |

**Questions attendues** : `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : fixation_rail = 1 ; enduit_forme = 1 ; marque_cloueur = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Classement coupe-feu : sans exigence feu ; Longueur de cloison : 8 m ; Plaques par face : 1 plaque par face ; Type de plaque : standard ; Longueur des plaques : 3 m ; Montants : Montants M48 ; Largeur du montant : 48 mm ; Montage des montants : montants doublés à 60 cm ; Portes dans la cloison : 0 ; Longueur des montants : 2,99 m ; Rails : Rails R48 ; Vis TTPC 25 : Vis TTPC 25 ; Vis TRPF : Vis TRPF 13 ; Clous de fixation des rails : Clous + gaz béton ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre

### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)

| Article | Commande | Besoin calculé | Précision |
|---|---|---|---|
| Plaques BA13 standard 1,20 × 3 m | 14 plaques | 14 pièces | 1 plaque par face sur 8 m de cloison, hauteur 3 m |
| Montants M48 longueur 2,99 m | 28 montants | 28 pièces | montants doublés à 60 cm |
| Rails R48 | 6 longueurs de 3 m | 16,8 ml | rails haut et bas |
| Vis TTPC 25 | 1 boîte de 1000 | 840 pièces |  |
| Vis TRPF 13 | 1 boîte de 500 | 144 pièces |  |
| Clous Spit pour cloueur à gaz, béton 20 mm, avec cartouches de gaz | 1 boîte de 500 avec gaz | 29 pièces | une fixation tous les 60 cm |
| Bande à joint | 1 rouleau de 150 m | 67,2 ml | joints jointoyés avec bande |
| Enduit poudre | 1 sac de 25 kg | 15,84 kg |  |

> À 3,00 m, une 72/48 en M48 demande des montants doublés à 60 cm (DTU 25.41 : 3,05 m) : dit par défaut, modifiable.

## PI-18 — Caisson autour d'une poutre (coffrage en U), 5 m

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Coffrage en plaques de plâtre BA13 autour de poutre, caisson 3 faces, développé 1 m | 5 | ml | coffrage |

**Questions attendues** : `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : fixation_rail = 1 ; marque_cloueur = 1 ; enduit_forme = 2

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Surface de plaques : 5 m² ; Profilés de rive : Cornières de rive ; Clous de fixation : Clous + gaz béton ; Vis TTPC 25 : Vis TTPC 25 ; Bande armée d'angle : Bande armée ; Bande à joint : Bande à joint ; Enduit à joint prêt à l'emploi : Enduit prêt à l'emploi

### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)

| Article | Commande | Besoin calculé | Précision |
|---|---|---|---|
| Plaques BA13 1,20 × 2,50 m | 2 plaques | 2 pièces | à vérifier : 5 m × développé 1 m × 1,10 = 5 m² de plaques (règle acceptée par Greg le 20/11, à confirmer par un plaquiste) |
| Cornières de rive | 7 longueurs de 3 m | 21 ml | rives au mur et au plafond, profilé à chaque arête basse |
| Clous Spit pour cloueur à gaz, béton 20 mm, avec cartouches de gaz | 1 boîte de 500 avec gaz | 17 pièces | une fixation tous les 60 cm |
| Vis TTPC 25 | 1 boîte de 1000 | 75 pièces |  |
| Bande armée | 1 rouleau de 30 m | 10,5 ml | une par arête saillante |
| Bande à joint | 1 rouleau de 150 m | 7 ml | joints jointoyés avec bande |
| Enduit prêt à l'emploi | 1 seau de 25 kg | 2,35 kg |  |

> Règle des coffrages proposée (recherche/12), aucune source fabricant par mètre : toutes les lignes restent orange « à confirmer » jusqu'à la relecture d'un plaquiste.

