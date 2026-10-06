# Lot B, paquet 2 : électricité, plomberie, menuiserie, chauffage-ventilation

Écrit par `packages/domain/test/lot-b-paquet-2.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque métier : le devis de test, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Métier | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Électricité | 4 | 5 | 0 | 2 |
| Plomberie | 0 | 8 | 0 | 1 |
| Menuiserie | 3 | 5 | 0 | 0 |
| Chauffage, ventilation | 3 | 3 | 0 | 1 |

## Électricité

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Prise de courant 16A 2P+T | 18 u |
| 2 | Point lumineux simple allumage | 9 u |
| 3 | Point lumineux va-et-vient | 3 u |
| 4 | Tableau électrique 3 rangées | 1 u |

**À l'ouverture : 4 vertes · 5 orange · 0 grise.**

Questions du comptoir :
- Appareillage : quelle gamme (Céliane, Odace, Dooxie…) ? (Legrand Dooxie / Legrand Céliane / Schneider Odace)
- Interrupteurs différentiels : type AC ou type A ? (Type A / Type AC)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Gaine préfilée 3G2,5 Ø20, couronne 100 m | 2 couronnes de 100 m | Quantité à confirmer : 8 m de gaine par prise, couronne de 100 m |
| Gaine préfilée 3G1,5 Ø16, couronne 100 m | 2 couronnes de 100 m | Quantité à confirmer : 10 m de gaine par point lumineux |
| Prise 2P+T 16 A | — | attend une réponse à une question |
| Interrupteur va-et-vient | — | attend une réponse à une question |
| Interrupteur différentiel 40 A 30 mA | — | attend une réponse à une question |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Prise 2P+T 16 A Legrand Dooxie blanc | 18 pièces |  | chiffrable |
| Boîtes d'encastrement 1 poste | 30 boîtes |  | chiffrable |
| Gaine préfilée 3G2,5 Ø20, couronne 100 m | 2 couronnes de 100 m (144 m à couvrir) |  | chiffrable |
| Interrupteur va-et-vient 10 A Legrand Dooxie blanc | 12 pièces |  | chiffrable |
| Boîte + douille DCL | 12 pièces |  | chiffrable |
| Gaine préfilée 3G1,5 Ø16, couronne 100 m | 2 couronnes de 100 m (120 m à couvrir) |  | chiffrable |
| Tableau électrique 3 rangées de 13 modules, nu | 1 pièce |  | chiffrable |
| Interrupteur différentiel 40 A 30 mA type A, 2 modules | 3 pièces |  | chiffrable |
| Peigne phase + neutre 13 modules | 3 pièces |  | chiffrable |

## Plomberie

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Alimentation EF/EC en multicouche depuis nourrices, salle de bains et cuisine | 6 u |
| 2 | Évacuations PVC Ø40 des appareils | 5 u |
| 3 | Plancher chauffant hydraulique rez-de-chaussée | 85 m² |

**À l'ouverture : 0 verte · 8 orange · 0 grise.**

Questions du comptoir :
- Raccords : à sertir (quel profil : TH, U, B) ou à visser ? (À sertir, profil TH / À sertir, profil U / À sertir, profil B / À visser (compression))

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Multicouche 16×2, barre 4 m | 19 barres de 4 m | Quantité à confirmer : 2 tubes par appareil (EF + ECS), 1 m de remontées par tube, tube +5 %, barre de 4 m (sources en désaccord) |
| Tube PVC évacuation Ø40, barre 4 m | 5 barres de 4 m | Quantité à confirmer : 0,5 m de remontée sous l'appareil, tube +10 % |
| PER-BAO 16×2, couronne 240 m | 3 couronnes de 240 m | Quantité à confirmer : 6,7 m de tube par m² (entraxe 15 cm), couronne de 240 m |
| Raccords Ø16 | — | attend une réponse à une question |
| Coudes PVC 87°30 Ø40 | 10 pièces | Quantité à confirmer : 2 coudes par appareil |
| Plaques à plots 1 200 × 1 000 | 76 plaques | Quantité à confirmer : plaques +5 % |
| Bande périphérique, rouleau 25 m | 3 rouleaux de 25 m | Quantité à confirmer : 0,6 m de bande par m², rouleau de 25 m (sources en désaccord) |
| Colle PVC, pot 250 ml | 1 pot de 250 ml | Quantité à confirmer : colle ≈ 12,5 ml par appareil |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Multicouche 16×2, barre 4 m | 19 barres de 4 m (75,6 m à couvrir) |  | chiffrable |
| Raccords Ø16 à sertir profil TH | 24 pièces |  | chiffrable |
| Tube PVC évacuation Ø40, barre 4 m | 5 barres de 4 m (19,25 m à couvrir) |  | chiffrable |
| Coudes PVC 87°30 Ø40 | 10 pièces |  | chiffrable |
| Colle PVC, pot 250 ml | 1 pot de 250 ml (0,06 L) |  | chiffrable |
| Plaques à plots 1 200 × 1 000 | 76 plaques |  | chiffrable |
| PER-BAO 16×2, couronne 240 m | 3 couronnes de 240 m (569,5 m à couvrir) |  | chiffrable |
| Bande périphérique, rouleau 25 m | 3 rouleaux de 25 m (51 m à couvrir) |  | chiffrable |

## Menuiserie

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Fenêtre PVC 2 vantaux 120x125 blanc, pose en rénovation | 4 u |
| 2 | Porte-fenêtre PVC 2 vantaux 215x140 oscillo-battante | 1 u |
| 3 | Parquet flottant stratifié chêne naturel | 38 m² |
| 4 | Plinthes MDF blanches | 32 ml |

**À l'ouverture : 3 vertes · 5 orange · 0 grise.**

Questions du comptoir : aucune.

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Stratifié, paquet 1,914 m² | 22 paquets de 1,914 m² | Quantité à confirmer : parquet +7 % de chutes (pose droite) |
| Sous-couche 2,2 mm, rouleau 15 m² | 3 rouleaux de 15 m² | Quantité à confirmer : sous-couche +5 % |
| Plinthes MDF 10×70, barre 2,40 m | 15 barres | Quantité à confirmer : plinthes +10 % de coupe, barre de 2,4 m (sources en désaccord) |
| Mousse PU pistolable 750 ml | 1 aérosol de 750 ml | Quantité à confirmer : aérosol de 750 ml (sources en désaccord) |
| Cales de pose, sachet de 50 | 2 sachets de 50 | Quantité à confirmer : 12 cales par fenêtre |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Mousse PU pistolable 750 ml | 1 aérosol de 750 ml | calfeutrement sur le périmètre | chiffrable |
| Mastic MS polymère 290 ml | 5 cartouches de 290 ml | joint extérieur sur le périmètre | chiffrable |
| Cales de pose, sachet de 50 | 2 sachets de 50 |  | chiffrable |
| Stratifié, paquet 1,914 m² | 22 paquets de 1,914 m² | paquets entiers, même lot | chiffrable |
| Sous-couche 2,2 mm, rouleau 15 m² | 3 rouleaux de 15 m² (39,9 m²) |  | chiffrable |
| Plinthes MDF 10×70, barre 2,40 m | 15 barres |  | chiffrable |
| Fenêtre PVC 2 vantaux 120x125 blanc, pose en rénovation | 4 pièces |  | chiffrable |
| Porte-fenêtre PVC 2 vantaux 215x140 oscillo-battante | 1 pièce |  | chiffrable |

## Chauffage, ventilation

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | VMC simple flux hygroréglable, cuisine + 2 sanitaires | 1 u |
| 2 | Climatiseur mural monosplit 3,5 kW Daikin Perfera | 2 u |

**À l'ouverture : 3 vertes · 3 orange · 0 grise.**

Questions du comptoir :
- VMC : autoréglable, hygro A ou hygro B ? (Hygro B / Hygro A / Autoréglable)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Gaine VMC isolée Ø80, 6 m | 2 filets | Quantité à confirmer : 1 gaine de 6 m par bouche |
| Gaine VMC isolée Ø125, 6 m | 1 filet | Quantité à confirmer : 1 gaine Ø125 de 6 m pour la cuisine |
| Kit VMC simple flux | — | attend une réponse à une question |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Kit VMC simple flux hygroréglable B, cuisine + 2 sanitaires | 1 pièce |  | chiffrable |
| Gaine VMC isolée Ø80, 6 m | 2 filets |  | chiffrable |
| Gaine VMC isolée Ø125, 6 m | 1 filet |  | chiffrable |
| Adhésif alu VMC, rouleau 50 m | 1 rouleau de 50 m |  | chiffrable |
| Liaison frigorifique cuivre isolée 1/4-3/8, kit bitube de 5 m | 2 kits |  | chiffrable |
| Climatiseur mural monosplit 3,5 kW Daikin Perfera | 2 pièces |  | chiffrable |

## Le tableau de Brest (couverture), inchangé

**À l'ouverture : 1 verte · 2 orange · 0 grise.**

Questions du comptoir :
- Quelle ardoise : Espagne 1er choix, ou ardoise NF (type Cupa) ? (Espagne 1er choix / Ardoise NF (type Cupa))
- Descentes en Ø 80 ou en Ø 100 ? (Ø 80 / Ø 100 / Ø 120)
- Combien de descentes pour cette gouttière ? (1 / 2 / 3 / 4)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Ardoises 30×22 ou Crochets d'ardoise | — | attend une réponse à une question |
| Naissances | — | attend une réponse à une question |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Ardoises naturelles Espagne 1er choix 30×22 | 9 271 pièces |  | chiffrable |
| Crochets d'ardoise inox standard, longueur 11 cm | 9 457 pièces | un par ardoise commandée, + 2 % de casse (référentiel : crochets = ardoises × 1,02) | chiffrable |
| Gouttière zinc demi-ronde dév. 33 | 6 longueurs de 4 m (24 ml à couvrir) |  | chiffrable |
| Naissances zinc demi-ronde dév. 33 Ø80 | 1 pièce |  | chiffrable |

