# Chantiers types plaquiste-isolation (jeu de test pour l'ouverture du métier)

Calculés par le moteur de Mobiiz (`packages/domain`, `computeWorkItem` puis `purchaseList`) avec `referentiel.json`
(version `plaquiste-isolation-2026.11.20-1`), règles « à confirmer » acceptées (mode validateur). **Tout est à relire par un plaquiste.**
Écrit par `outils/calculer_chantiers.mjs` : ne pas modifier à la main, relancer l'outil.

Lecture : « Lu au devis » = données que le modèle de lecture doit trouver dans la ligne ; « Questions » = ce que le moteur
demande quand le devis ne le dit pas, dans l'ordre où il les rencontre ; « Suggestions » = cases proposées (jamais ajoutées
d'office) ; « Hypothèses » = valeurs par défaut dites à l'artisan, modifiables d'un geste.

## PI-01 — Maison neuve : cloisons de distribution

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Cloison de distribution type Placostil 72/48, BA13 standard, hauteur 2,50 m | 45 | m² | cloison-distributive |

**Questions attendues** : `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : fixation_rail = 1 ; enduit_forme = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Longueur de cloison : 18 m ; Plaques par face : 1 plaque par face ; Type de plaque : standard ; Longueur des plaques : 2,5 m ; Montants : Montants M48 ; Largeur du montant : 48 mm ; Montage des montants : montants simples à 60 cm ; Longueur des montants : 2,49 m ; Rails : Rails R48 ; Vis TTPC 25 : Vis TTPC 25 ; Vis TRPF : Vis TRPF 13 ; Clous de fixation des rails : Clous + gaz béton ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre

### Liste attendue

| Article | Commande | Précision |
|---|---|---|
| Plaques BA13 standard 1,20 × 2,5 m | 32 plaques | 1 plaque par face sur 18 m de cloison, hauteur 2,5 m ; 32 pièces |
| Montants M48 longueur 2,49 m | 33 montants | montants simples à 60 cm ; 33 pièces |
| Rails R48 | 13 longueurs de 3 m | rails haut et bas ; 37,8 ml |
| Vis TTPC 25 | 2 boîtes de 1000 | 1 350 pièces |
| Vis TRPF 13 | 1 boîte de 500 | 90 pièces |
| Clous + gaz béton | 1 boîte de 500 avec gaz | une fixation tous les 60 cm de rail ; 64 pièces |
| Bande à joint | 1 rouleau de 150 m | joints jointoyés avec bande ; 126 ml |
| Enduit poudre | 2 sacs de 25 kg | 29,7 kg |

## PI-02 — Rénovation : cloison isolée, hauteur 2,60 m

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Cloison 72/48 isolée laine de verre GR32 45 mm | 32 | m² | cloison-distributive |

**Questions attendues** : `param:hauteur` (« Hauteur sous plafond ? ») ; `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : hauteur = 2.6 m ; fixation_rail = 2 ; enduit_forme = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Longueur de cloison : 12,31 m ; Plaques par face : 1 plaque par face ; Type de plaque : standard ; Longueur des plaques : 2,6 m ; Montants : Montants M48 ; Largeur du montant : 48 mm ; Montage des montants : montants simples à 40 cm ; Longueur des montants : 2,59 m ; Rails : Rails R48 ; Vis TTPC 25 : Vis TTPC 25 ; Vis TRPF : Vis TRPF 13 ; Chevilles de fixation des rails : Chevilles 6 × 40 ; Isolant de cloison : GR 32 Nu 45 ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre

### Liste attendue

| Article | Commande | Précision |
|---|---|---|
| Plaques BA13 standard 1,20 × 2,6 m | 22 plaques | 1 plaque par face sur 12,31 m de cloison, hauteur 2,6 m ; 22 pièces |
| Montants M48 longueur 2,59 m | 34 montants | montants simples à 40 cm ; 34 pièces |
| Rails R48 | 9 longueurs de 3 m | rails haut et bas ; 25,85 ml |
| Vis TTPC 25 | 2 boîtes de 1000 | 1 184 pièces |
| Vis TRPF 13 | 1 boîte de 500 | 96 pièces |
| Chevilles 6 × 40 | 1 sachet de 50 | une cheville tous les 60 cm de rail ; 44 pièces |
| GR 32 Nu 45 | 3 colis de 12,15 m² | 33,6 m² |
| Bande à joint | 1 rouleau de 150 m | joints jointoyés avec bande ; 89,6 ml |
| Enduit poudre | 1 sac de 25 kg | 21,12 kg |

## PI-03 — ERP : cloison coupe-feu EI 60 en parement double, hauteur 3,00 m

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Cloison 98/48 EI60, 2 BA13 feu par face, laine 45 mm, hauteur 3,00 m | 60 | m² | cloison-distributive |

**Questions attendues** : `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : fixation_rail = 1 ; enduit_forme = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Longueur de cloison : 20 m ; Longueur des plaques : 3 m ; Montants : Montants M48 ; Largeur du montant : 48 mm ; Montage des montants : montants simples à 60 cm ; Longueur des montants : 2,99 m ; Rails : Rails R48 ; Vis TTPC 25 : Vis TTPC 25 ; Vis TTPC 35 : Vis TTPC 35 ; Vis TRPF : Vis TRPF 13 ; Clous de fixation des rails : Clous + gaz béton ; Isolant de cloison : GR 32 Nu 45 ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre

### Liste attendue

| Article | Commande | Précision |
|---|---|---|
| Plaques BA13 feu 1,20 × 3 m | 70 plaques | 2 plaques par face sur 20 m de cloison, hauteur 3 m ; 70 pièces |
| Montants M48 longueur 2,99 m | 37 montants | montants simples à 60 cm ; 37 pièces |
| Rails R48 | 14 longueurs de 3 m | rails haut et bas ; 42 ml |
| Vis TTPC 25 | 1 boîte de 1000 | 600 pièces |
| Vis TTPC 35 | 2 boîtes de 1000 | 2e peau ; 1 620 pièces |
| Vis TRPF 13 | 1 boîte de 500 | 120 pièces |
| Clous + gaz béton | 1 boîte de 500 avec gaz | une fixation tous les 60 cm de rail ; 71 pièces |
| GR 32 Nu 45 | 6 colis de 12,15 m² | 63 m² |
| Bande à joint | 2 rouleaux de 150 m | joints jointoyés avec bande ; 168 ml |
| Enduit poudre | 2 sacs de 25 kg | 39,6 kg |

## PI-04 — Salle de bain : cloison et plafond hydro

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Cloison 72/48 en plaques hydrofuges H1, HSP 2,50 m | 12 | m² | cloison-distributive |
| Plafond BA13 hydro sur ossature F530 sous solives | 6 | m² | plafond-fourrures |

**Questions attendues** : `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : fixation_rail = 1 ; enduit_forme = 1 ; entraxe_fourrures = 40 cm

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Longueur de cloison : 4,8 m ; Plaques par face : 1 plaque par face ; Longueur des plaques : 2,5 m ; Montants : Montants M48 ; Largeur du montant : 48 mm ; Montage des montants : montants simples à 60 cm ; Longueur des montants : 2,49 m ; Rails : Rails R48 ; Vis TTPC 25 : Vis TTPC 25 ; Vis TRPF : Vis TRPF 13 ; Clous de fixation des rails : Clous + gaz béton ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre ; Plaques : 1 ; Longueur des plaques de plafond : 2,5 m ; Fourrures : Fourrures F530 ; Suspentes longues : Suspentes longues ; Hauteur de suspension : suspentes longues ; Vis de suspente (TTPC 35) : Vis TTPC 35 (suspentes) ; Éclisses : Éclisses ; Cornière de rive : Cornières de rive ; Clous de fixation : Clous + gaz béton

### Liste attendue

| Article | Commande | Précision |
|---|---|---|
| Plaques BA13 hydro H1 1,20 × 2,5 m | 9 plaques | 1 plaque par face sur 4,8 m de cloison, hauteur 2,5 m ; 9 pièces |
| Montants M48 longueur 2,49 m | 10 montants | montants simples à 60 cm ; 10 pièces |
| Rails R48 | 4 longueurs de 3 m | rails haut et bas ; 10,08 ml |
| Vis TTPC 25 | 1 boîte de 1000 | 360 pièces |
| Vis TRPF 13 | 1 boîte de 500 | 24 pièces |
| Clous de fixation des rails (Clous + gaz béton) | 1 boîte de 500 avec gaz | une fixation tous les 60 cm de rail ; 17 pièces |
| Bande à joint | 1 rouleau de 150 m | joints jointoyés avec bande ; 33,6 ml |
| Enduit à joint (Enduit poudre) | 1 sac de 25 kg | 7,92 kg |
| Plaques BA13 hydro H1 1,20 × 2,5 m | 3 plaques | 3 pièces |
| Fourrures F530 | 6 longueurs de 3 m | entraxe 40 cm ; 18 ml |
| Suspentes longues | 1 boîte de 100 | 17 pièces |
| Vis TTPC 35 (suspentes) | 1 boîte de 1000 | 34 pièces |
| Éclisses | 1 boîte de 50 | 1,5 pièces |
| Cornières de rive | 5 longueurs de 3 m | 12,6 ml |
| Vis TTPC 25 | 1 boîte de 1000 | 90 pièces |
| Vis TRPF 13 | 1 boîte de 500 | 24 pièces |
| Clous de fixation (Clous + gaz béton) | 1 boîte de 500 avec gaz | une fixation tous les 60 cm, sous bois ; 21 pièces |
| Bande à joint | 1 rouleau de 150 m | joints jointoyés avec bande ; 8,4 ml |
| Enduit à joint (Enduit poudre) | 1 sac de 25 kg | 1,98 kg |

> Plaque hydro en plafond : entraxe des fourrures 0,40 m (Placo 2023) ; la question d'entraxe le corrige (défaut 0,60).

## PI-05 — Doublage collé PSE 10+80 sur murs béton

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Doublage collé Placomur 10+80 PSE, hauteur 2,50 m | 30 | m² | doublage-colle |

**Questions attendues** : `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : enduit_forme = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Complexes de doublage : Complexes de doublage ; Longueur de mur : 12 m ; Longueur des complexes : 2,5 m ; Mortier adhésif : Mortier adhésif MAP ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre

### Liste attendue

| Article | Commande | Précision |
|---|---|---|
| Complexes de doublage 1,20 × 2,5 m | 11 panneaux | pour 12 m de mur, hauteur 2,5 m ; 11 pièces |
| Mortier adhésif MAP | 3 sacs de 25 kg | 54 kg |
| Bande à joint | 1 rouleau de 150 m | joints jointoyés avec bande ; 42 ml |
| Enduit poudre | 1 sac de 25 kg | 9,9 kg |

## PI-06 — Doublage collé Doublissimo 13+100, HSP 2,60 m

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Doublage Doublissimo 13+100 R 3,40 collé au MAP | 45 | m² | doublage-colle |

**Questions attendues** : `param:hauteur` (« Hauteur sous plafond ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : hauteur = 2.6 m ; enduit_forme = 2

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Complexes de doublage : Complexes de doublage ; Longueur de mur : 17,31 m ; Longueur des complexes : 2,6 m ; Mortier adhésif : Mortier adhésif MAP ; Bande à joint : Bande à joint ; Enduit à joint prêt à l'emploi : Enduit prêt à l'emploi

### Liste attendue

| Article | Commande | Précision |
|---|---|---|
| Complexes de doublage 1,20 × 2,6 m | 16 panneaux | pour 17,31 m de mur, hauteur 2,6 m ; 16 pièces |
| Mortier adhésif MAP | 4 sacs de 25 kg | 81 kg |
| Bande à joint | 1 rouleau de 150 m | joints jointoyés avec bande ; 63 ml |
| Enduit prêt à l'emploi | 1 seau de 25 kg | 21,15 kg |

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

### Liste attendue

| Article | Commande | Précision |
|---|---|---|
| Plaques BA13 standard 1,20 × 2,5 m | 14 plaques | pour 16 m de mur ; 14 pièces |
| Fourrures F530 | 30 longueurs de 3 m | fourrures verticales tous les 60 cm ; 90 ml |
| Rails F530 | 15 longueurs de 2,35 m | haut et bas ; 33,6 ml |
| Appuis intermédiaires pour isolant de 100 mm | 1 boîte de 50 | 30 pièces |
| Vis TTPC 25 | 1 boîte de 1000 | 600 pièces |
| Vis TRPF 13 | 1 boîte de 500 | 80 pièces |
| Chevilles 6 × 40 | 2 sachets de 50 | une cheville tous les 60 cm ; 87 pièces |
| GR 32 kraft 100 | 13 colis de 3,24 m² | 42 m² |
| Bande à joint | 1 rouleau de 150 m | joints jointoyés avec bande ; 56 ml |
| Enduit poudre | 1 sac de 25 kg | 13,2 kg |
| Membrane pare-vapeur | 1 rouleau de 60 m² | 44 m² |
| Adhésif membrane | 1 rouleau de 40 m | 37,14 ml |

## PI-08 — Contre-cloison M48 devant mur humide, HSP 2,40 m

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Contre-cloison sur montants M48 autoportante, BA13, hauteur 2,40 m | 20 | m² | contre-cloison-montants |

**Questions attendues** : `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : fixation_rail = 1 ; enduit_forme = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Longueur de mur : 8,33 m ; Type de plaque : standard ; Longueur des plaques : 2,5 m ; Montants : Montants M48 ; Largeur du montant : 48 mm ; Montage des montants : montants doublés à 60 cm ; Longueur des montants : 2,49 m ; Rails : Rails R48 ; Vis TTPC 25 : Vis TTPC 25 ; Vis TRPF : Vis TRPF 13 ; Clous de fixation : Clous + gaz béton ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre

### Liste attendue

| Article | Commande | Précision |
|---|---|---|
| Plaques BA13 standard 1,20 × 2,5 m | 8 plaques | pour 8,33 m de mur ; 8 pièces |
| Montants M48 longueur 2,49 m | 32 montants | montants doublés à 60 cm ; 32 pièces |
| Rails R48 | 6 longueurs de 3 m | haut et bas ; 17,5 ml |
| Vis TTPC 25 | 1 boîte de 1000 | 380 pièces |
| Vis TRPF 13 | 1 boîte de 500 | 100 pièces |
| Clous + gaz béton | 1 boîte de 500 avec gaz | une fixation tous les 60 cm ; 30 pièces |
| Bande à joint | 1 rouleau de 150 m | joints jointoyés avec bande ; 28 ml |
| Enduit poudre | 1 sac de 25 kg | 6,6 kg |

## PI-09 — Plafond sous solives avec isolant IBR 200 posé dessus

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Faux plafond BA13 sur fourrures F530 et suspentes, sous solivage bois | 25 | m² | plafond-fourrures |
| Isolation laine de verre IBR kraft 200 mm R 5 déroulée sur plafond | 25 | m² | isolation-rouleaux |

**Questions attendues** : `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : fixation_rail = 1 ; enduit_forme = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Plaques : 1 ; Longueur des plaques de plafond : 2,5 m ; Type de plaque : standard ; Fourrures : Fourrures F530 ; Entraxe des fourrures : 60 cm ; Suspentes longues : Suspentes longues ; Hauteur de suspension : suspentes longues ; Vis de suspente (TTPC 35) : Vis TTPC 35 (suspentes) ; Éclisses : Éclisses ; Cornière de rive : Cornières de rive ; Vis TTPC 25 : Vis TTPC 25 ; Vis TRPF : Vis TRPF 13 ; Clous de fixation : Clous + gaz béton ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre ; Couches : 1

### Liste attendue

| Article | Commande | Précision |
|---|---|---|
| Plaques BA13 standard 1,20 × 2,5 m | 9 plaques | 9 pièces |
| Fourrures F530 | 15 longueurs de 3 m | entraxe 60 cm ; 44,75 ml |
| Suspentes longues | 1 boîte de 100 | 45 pièces |
| Vis TTPC 35 (suspentes) | 1 boîte de 1000 | 90 pièces |
| Éclisses | 1 boîte de 50 | 5,25 pièces |
| Cornières de rive | 8 longueurs de 3 m | 23,36 ml |
| Vis TTPC 25 | 1 boîte de 1000 | 300 pièces |
| Vis TRPF 13 | 1 boîte de 500 | 100 pièces |
| Clous + gaz béton | 1 boîte de 500 avec gaz | une fixation tous les 60 cm, sous bois ; 39 pièces |
| Bande à joint | 1 rouleau de 150 m | joints jointoyés avec bande ; 35 ml |
| Enduit poudre | 1 sac de 25 kg | 8,25 kg |
| IBR 200 | 5 colis de 5,4 m² | 26,25 m² |

## PI-10 — Plafond coupe-feu sous dalle béton, 2 BA13, plénum 30 cm

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Plafond suspendu 2 BA13 sous dalle béton, plénum 30 cm | 40 | m² | plafond-fourrures |

**Questions attendues** : `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : fixation_rail = 1 ; enduit_forme = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Longueur des plaques de plafond : 2,5 m ; Type de plaque : standard ; Fourrures : Fourrures F530 ; Entraxe des fourrures : 60 cm ; Suspentes sécables : Suspentes sécables ; Chevilles de suspente : Chevilles métal 6 × 40 ; Éclisses : Éclisses ; Cornière de rive : Cornières de rive ; Vis TTPC 25 : Vis TTPC 25 ; Vis TTPC 35 (2e peau) : Vis TTPC 35 ; Vis TRPF : Vis TRPF 13 ; Clous de fixation : Clous + gaz béton ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre

### Liste attendue

| Article | Commande | Précision |
|---|---|---|
| Plaques BA13 standard 1,20 × 2,5 m | 28 plaques | 28 pièces |
| Fourrures F530 | 24 longueurs de 3 m | entraxe 60 cm ; 71,6 ml |
| Suspentes sécables | 2 boîtes de 50 | 72 pièces |
| Chevilles métal 6 × 40 | 1 boîte de 100 | 72 pièces |
| Éclisses | 1 boîte de 50 | 8,4 pièces |
| Cornières de rive | 9 longueurs de 3 m | 26,46 ml |
| Vis TTPC 25 | 1 boîte de 1000 | 320 pièces |
| Vis TTPC 35 | 1 boîte de 1000 | 480 pièces |
| Vis TRPF 13 | 1 boîte de 500 | 160 pièces |
| Clous + gaz béton | 1 boîte de 500 avec gaz | une fixation tous les 60 cm, sous dalle béton ; 45 pièces |
| Bande à joint | 1 rouleau de 150 m | joints jointoyés avec bande ; 56 ml |
| Enduit poudre | 1 sac de 25 kg | 13,2 kg |

## PI-11 — Combles perdus : soufflage laine de verre R 7

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Isolation des combles perdus par soufflage de laine de verre Comblissimo R = 7 | 80 | m² | isolation-soufflee |

**Questions attendues** : aucune

**Réponses du test** : aucune

**Suggestions proposées** : aucune — cochées dans le test : aucune

**Hypothèses dites** : Isolant à souffler : Isolant à souffler

### Liste attendue

| Article | Commande | Précision |
|---|---|---|
| Laine de verre à souffler Comblissimo, sac de 17,3 kg | 18 sacs | pour 80 m² à R 7, épaisseur après tassement du certificat ; 18 pièces |

## PI-12 — Combles perdus : ouate de cellulose R 8

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Soufflage ouate de cellulose en combles perdus, R 8 | 60 | m² | isolation-soufflee |

**Questions attendues** : `param:produit_vrac` (« Quel isolant à souffler ? »)

**Réponses du test** : produit_vrac = 5

**Suggestions proposées** : aucune — cochées dans le test : aucune

**Hypothèses dites** : Isolant à souffler : Isolant à souffler

### Liste attendue

| Article | Commande | Précision |
|---|---|---|
| Ouate de cellulose Igloo, sac de 12,5 kg | 48 sacs | pour 60 m² à R 8, épaisseur après tassement du certificat ; 48 pièces |

## PI-13 — Combles aménagés : rampants isolés, membrane, plafond

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Isolation des rampants Isoconfort 35 kraft 220 mm R 6,25 | 50 | m² | isolation-rouleaux |
| Membrane Vario Xtra et adhésifs | 50 | m² | pare-vapeur |
| Plafond rampant BA13 sur fourrures et suspentes sous chevrons | 50 | m² | plafond-fourrures |

**Questions attendues** : `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : plenum = 2 ; fixation_rail = 1 ; enduit_forme = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Couches : 1 ; Membrane pare-vapeur : Membrane pare-vapeur ; Adhésif de membrane : Adhésif membrane ; Plaques : Plaques BA13 ; Plaques : 1 ; Longueur des plaques de plafond : 2,5 m ; Type de plaque : standard ; Fourrures : Fourrures F530 ; Entraxe des fourrures : 60 cm ; Suspentes sécables : Suspentes sécables ; Vis de suspente (TTPC 35) : Vis TTPC 35 (suspentes) ; Éclisses : Éclisses ; Cornière de rive : Cornières de rive ; Vis TTPC 25 : Vis TTPC 25 ; Vis TRPF : Vis TRPF 13 ; Clous de fixation : Clous + gaz béton ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre

### Liste attendue

| Article | Commande | Précision |
|---|---|---|
| Isoconfort 35 220 | 16 colis de 3,36 m² | 52,5 m² |
| Membrane pare-vapeur | 1 rouleau de 60 m² | 55 m² |
| Adhésif membrane | 2 rouleaux de 40 m | 46,43 ml |
| Plaques BA13 standard 1,20 × 2,5 m | 18 plaques | 18 pièces |
| Fourrures F530 | 30 longueurs de 3 m | entraxe 60 cm ; 89,5 ml |
| Suspentes sécables | 2 boîtes de 50 | 90 pièces |
| Vis TTPC 35 (suspentes) | 1 boîte de 1000 | 180 pièces |
| Éclisses | 1 boîte de 50 | 10,5 pièces |
| Cornières de rive | 12 longueurs de 3 m | 33,08 ml |
| Vis TTPC 25 | 1 boîte de 1000 | 600 pièces |
| Vis TRPF 13 | 1 boîte de 500 | 200 pièces |
| Clous + gaz béton | 1 boîte de 500 avec gaz | une fixation tous les 60 cm, sous bois ; 56 pièces |
| Bande à joint | 1 rouleau de 150 m | joints jointoyés avec bande ; 70 ml |
| Enduit poudre | 1 sac de 25 kg | 16,5 kg |

> Sous rampants avec 220 mm de laine entre et sous chevrons : la suspente doit descendre plus bas que 15 cm (réponse « 15 à 58 cm »). Les suspentes Intégra (Isover) ne sont pas encore dans la fiche : à confirmer.

## PI-14 — Séparatif de logements SAD 160

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Cloison séparative SAD 160, 2 BA13 par face, double ossature M48, laine 45 mm, HSP 2,50 m | 22 | m² | cloison-separative |

**Questions attendues** : `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : fixation_rail = 1 ; enduit_forme = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Longueur de cloison : 8,8 m ; Type de plaque : standard ; Longueur des plaques : 2,5 m ; Montants : Montants M48 ; Longueur des montants : 2,49 m ; Rails : Rails R48 ; Vis TTPC 25 : Vis TTPC 25 ; Vis TTPC 35 : Vis TTPC 35 ; Vis TRPF : Vis TRPF 13 ; Clous de fixation : Clous + gaz béton ; Isolant : GR 32 Nu 45 ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre

### Liste attendue

| Article | Commande | Précision |
|---|---|---|
| Plaques BA13 standard 1,20 × 2,5 m | 31 plaques | 31 pièces |
| Montants M48 longueur 2,49 m | 33 montants | deux files (SAD) ; 33 pièces |
| Rails R48 | 13 longueurs de 3 m | SAA : un rail large (R70 ou R90) haut et bas ; SAD : deux rails R48 haut et bas ; 36,96 ml |
| Vis TTPC 25 | 1 boîte de 1000 | 220 pièces |
| Vis TTPC 35 | 1 boîte de 1000 | 594 pièces |
| Vis TRPF 13 | 1 boîte de 500 | 88 pièces |
| Clous + gaz béton | 1 boîte de 500 avec gaz | une fixation tous les 60 cm ; 62 pièces |
| GR 32 Nu 45 | 2 colis de 12,15 m² | 23,1 m² |
| Bande à joint | 1 rouleau de 150 m | joints jointoyés avec bande ; 61,6 ml |
| Enduit poudre | 1 sac de 25 kg | 14,52 kg |

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

**Réponses du test** : hauteur = 2.5 m ; fixation_rail = 1 ; enduit_forme = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Longueur de cloison : 7,2 m ; Plaques par face : 1 plaque par face ; Type de plaque : standard ; Longueur des plaques : 2,5 m ; Montants : Montants M48 ; Largeur du montant : 48 mm ; Montage des montants : montants simples à 60 cm ; Longueur des montants : 2,49 m ; Rails : Rails R48 ; Vis TTPC 25 : Vis TTPC 25 ; Vis TRPF : Vis TRPF 13 ; Clous de fixation des rails : Clous + gaz béton ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre ; Complexes de doublage : Complexes de doublage ; Longueur de mur : 10,4 m ; Longueur des complexes : 2,5 m ; Mortier adhésif : Mortier adhésif MAP ; Plaques : 1 ; Longueur des plaques de plafond : 2,5 m ; Fourrures : Fourrures F530 ; Entraxe des fourrures : 60 cm ; Suspentes longues : Suspentes longues ; Hauteur de suspension : suspentes longues ; Chevilles de suspente : Chevilles métal 6 × 40 ; Éclisses : Éclisses ; Cornière de rive : Cornières de rive ; Clous de fixation : Clous + gaz béton

### Liste attendue

| Article | Commande | Précision |
|---|---|---|
| Plaques BA13 standard 1,20 × 2,5 m | 13 plaques | 1 plaque par face sur 7,2 m de cloison, hauteur 2,5 m ; 13 pièces |
| Montants M48 longueur 2,49 m | 14 montants | montants simples à 60 cm ; 14 pièces |
| Rails R48 | 6 longueurs de 3 m | rails haut et bas ; 15,12 ml |
| Vis TTPC 25 | 1 boîte de 1000 | 540 pièces |
| Vis TRPF 13 | 1 boîte de 500 | 36 pièces |
| Clous de fixation des rails (Clous + gaz béton) | 1 boîte de 500 avec gaz | une fixation tous les 60 cm de rail ; 26 pièces |
| Bande à joint | 1 rouleau de 150 m | joints jointoyés avec bande ; 50,4 ml |
| Enduit à joint (Enduit poudre) | 1 sac de 25 kg | 11,88 kg |
| Complexes de doublage 1,20 × 2,5 m | 10 panneaux | pour 10,4 m de mur, hauteur 2,5 m ; 10 pièces |
| Mortier adhésif MAP | 2 sacs de 25 kg | 46,8 kg |
| Bande à joint | 1 rouleau de 150 m | joints jointoyés avec bande ; 36,4 ml |
| Enduit à joint (Enduit poudre) | 1 sac de 25 kg | 8,58 kg |
| Plaques BA13 standard 1,20 × 2,5 m | 6 plaques | 6 pièces |
| Fourrures F530 | 9 longueurs de 3 m | entraxe 60 cm ; 26,85 ml |
| Suspentes longues | 1 boîte de 100 | 27 pièces |
| Chevilles métal 6 × 40 | 1 boîte de 100 | 27 pièces |
| Éclisses | 1 boîte de 50 | 3,15 pièces |
| Cornières de rive | 7 longueurs de 3 m | 18,11 ml |
| Vis TTPC 25 | 1 boîte de 1000 | 180 pièces |
| Vis TRPF 13 | 1 boîte de 500 | 60 pièces |
| Clous de fixation (Clous + gaz béton) | 1 boîte de 500 avec gaz | une fixation tous les 60 cm, sous dalle béton ; 31 pièces |
| Bande à joint | 1 rouleau de 150 m | joints jointoyés avec bande ; 21 ml |
| Enduit à joint (Enduit poudre) | 1 sac de 25 kg | 4,95 kg |

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

### Liste attendue

| Article | Commande | Précision |
|---|---|---|
| Bande à joint | 2 rouleaux de 150 m | joints jointoyés avec bande ; 168 ml |

## PI-17 — Maison ancienne : cloison 72/48 en 3,00 m de haut

### Devis

| Désignation | Quantité | Unité | Ouvrage de la fiche |
|---|---|---|---|
| Cloison 72/48 BA13 hauteur 3,00 m | 24 | m² | cloison-distributive |

**Questions attendues** : `param:fixation_rail` (« Tes rails au sol et au plafond, tu les fixes comment ? ») ; `param:enduit_forme` (« Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? »)

**Réponses du test** : fixation_rail = 1 ; enduit_forme = 1

**Suggestions proposées** : Bande à joint (si tu fais les joints) ; Enduit à joint (si tu fais les joints) — cochées dans le test : bande, enduit

**Hypothèses dites** : Plaques : Plaques BA13 ; Longueur de cloison : 8 m ; Plaques par face : 1 plaque par face ; Type de plaque : standard ; Longueur des plaques : 3 m ; Montants : Montants M48 ; Largeur du montant : 48 mm ; Montage des montants : montants doublés à 60 cm ; Longueur des montants : 2,99 m ; Rails : Rails R48 ; Vis TTPC 25 : Vis TTPC 25 ; Vis TRPF : Vis TRPF 13 ; Clous de fixation des rails : Clous + gaz béton ; Bande à joint : Bande à joint ; Enduit à joint : Enduit poudre

### Liste attendue

| Article | Commande | Précision |
|---|---|---|
| Plaques BA13 standard 1,20 × 3 m | 14 plaques | 1 plaque par face sur 8 m de cloison, hauteur 3 m ; 14 pièces |
| Montants M48 longueur 2,99 m | 31 montants | montants doublés à 60 cm ; 31 pièces |
| Rails R48 | 6 longueurs de 3 m | rails haut et bas ; 16,8 ml |
| Vis TTPC 25 | 1 boîte de 1000 | 840 pièces |
| Vis TRPF 13 | 1 boîte de 500 | 120 pièces |
| Clous + gaz béton | 1 boîte de 500 avec gaz | une fixation tous les 60 cm de rail ; 29 pièces |
| Bande à joint | 1 rouleau de 150 m | joints jointoyés avec bande ; 67,2 ml |
| Enduit poudre | 1 sac de 25 kg | 15,84 kg |

> À 3,00 m, une 72/48 en M48 demande des montants doublés à 60 cm (DTU 25.41 : 3,05 m) : dit par défaut, modifiable.

