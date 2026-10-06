# Lot B, paquet 2 : électricité, plomberie, menuiserie, chauffage-ventilation

Écrit par `packages/domain/test/lot-b-paquet-2.test.ts` : ce fichier change seulement si le calcul change.

Pour chaque métier : le devis de test, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),
puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.

| Métier | Vertes | Orange | Grises | Questions |
| --- | --- | --- | --- | --- |
| Électricité | 2 | 1 | 0 | 1 |
| Plomberie | 0 | 3 | 0 | 1 |
| Menuiserie | 2 | 2 | 0 | 1 |
| Chauffage, ventilation | 1 | 1 | 0 | 2 |

## Électricité

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Prise de courant 16A 2P+T | 18 u |
| 2 | Point lumineux simple allumage | 9 u |
| 3 | Point lumineux va-et-vient | 3 u |
| 4 | Tableau électrique 3 rangées | 1 u |

**À l'ouverture : 2 vertes · 1 orange · 0 grise.**

Questions du comptoir :
- Appareillage : quelle gamme (Céliane, Odace, Dooxie…) ? (Legrand Dooxie / Legrand Céliane / Schneider Odace)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Prise 2P+T 16 A ? | 18 pièces | Info manquante : gamme d'appareillage |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Prise 2P+T 16 A Legrand Dooxie blanc | 18 pièces |  | chiffrable |
| Boîte + douille DCL | 12 pièces |  | chiffrable |
| Tableau électrique 3 rangées de 13 modules, nu | 1 pièce |  | chiffrable |

## Plomberie

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Alimentation EF/EC en multicouche depuis nourrices, salle de bains et cuisine | 6 u |
| 2 | Évacuations PVC Ø40 des appareils | 5 u |
| 3 | Plancher chauffant hydraulique rez-de-chaussée | 85 m² |

**À l'ouverture : 0 verte · 3 orange · 0 grise.**

Questions du comptoir :
- Consommables de pose (pointes, vis, pattes, étain, silicone) : je les ajoute à la liste ? (Oui / Non)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Multicouche 16×2, barre 4 m | 19 barres de 4 m | Valeur par défaut à confirmer : distance moyenne nourrice → appareil 5 m. Quantité à confirmer : 2 tubes par appareil (EF + ECS), 1 m de remontées par tube, tube +5 %, barre de 4 m (sources en désaccord) |
| Tube PVC évacuation Ø40, barre 4 m | 5 barres de 4 m | Valeur par défaut à confirmer : distance moyenne appareil → collecteur 3 m. Quantité à confirmer : 0,5 m de remontée sous l'appareil, tube +10 % |
| PER-BAO 16×2, couronne 240 m | 3 couronnes de 240 m | Quantité à confirmer : 6,7 m de tube par m² (entraxe 15 cm), couronne de 240 m |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Multicouche 16×2, barre 4 m | 19 barres de 4 m (75,6 m à couvrir) |  | chiffrable |
| Tube PVC évacuation Ø40, barre 4 m | 5 barres de 4 m (19,25 m à couvrir) |  | chiffrable |
| PER-BAO 16×2, couronne 240 m | 3 couronnes de 240 m (569,5 m à couvrir) |  | chiffrable |
| Colle PVC, pot 250 ml | 1 pot de 250 ml (0,06 L) |  | chiffrable |

## Menuiserie

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | Fenêtre PVC 2 vantaux 120x125 blanc, pose en rénovation | 4 u |
| 2 | Porte-fenêtre PVC 2 vantaux 215x140 oscillo-battante | 1 u |
| 3 | Parquet flottant stratifié chêne naturel | 38 m² |
| 4 | Plinthes MDF blanches | 32 ml |

**À l'ouverture : 2 vertes · 2 orange · 0 grise.**

Questions du comptoir :
- Consommables de pose (pointes, vis, pattes, étain, silicone) : je les ajoute à la liste ? (Oui / Non)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Stratifié, paquet 1,914 m² | 22 paquets de 1,914 m² | Quantité à confirmer : parquet +7 % de chutes (pose droite) |
| Plinthes MDF 10×70, barre 2,40 m | 15 barres | Quantité à confirmer : plinthes +10 % de coupe, barre de 2,4 m (sources en désaccord) |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Fenêtre PVC 2 vantaux 120x125 blanc, pose en rénovation | 4 pièces |  | chiffrable |
| Porte-fenêtre PVC 2 vantaux 215x140 oscillo-battante | 1 pièce |  | chiffrable |
| Stratifié, paquet 1,914 m² | 22 paquets de 1,914 m² | paquets entiers, même lot | chiffrable |
| Plinthes MDF 10×70, barre 2,40 m | 15 barres |  | chiffrable |
| Mousse PU pistolable 750 ml | 1 aérosol de 750 ml | calfeutrement sur le périmètre | chiffrable |
| Mastic MS polymère 290 ml | 5 cartouches de 290 ml | joint extérieur sur le périmètre | chiffrable |
| Cales de pose, sachet de 50 | 2 sachets de 50 |  | chiffrable |

## Chauffage, ventilation

Devis de test :

| Ligne | Désignation | Quantité |
| --- | --- | --- |
| 1 | VMC simple flux hygroréglable, cuisine + 2 sanitaires | 1 u |
| 2 | Climatiseur mural monosplit 3,5 kW Daikin Perfera | 2 u |

**À l'ouverture : 1 verte · 1 orange · 0 grise.**

Questions du comptoir :
- VMC : autoréglable, hygro A ou hygro B ? (Hygro B / Hygro A / Autoréglable)
- Consommables de pose (pointes, vis, pattes, étain, silicone) : je les ajoute à la liste ? (Oui / Non)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Kit VMC simple flux ?, cuisine + 2 sanitaires | 1 pièce | Info manquante : type de vmc |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Kit VMC simple flux hygroréglable B, cuisine + 2 sanitaires | 1 pièce |  | chiffrable |
| Climatiseur mural monosplit 3,5 kW Daikin Perfera | 2 pièces |  | chiffrable |
| Adhésif alu VMC, rouleau 50 m | 1 rouleau de 50 m |  | chiffrable |

## Le tableau de Brest (couverture), inchangé

**À l'ouverture : 1 verte · 3 orange · 0 grise.**

Questions du comptoir :
- Quelle ardoise : Espagne 1er choix, ou ardoise NF (type Cupa) ? (Espagne 1er choix / Ardoise NF (type Cupa))
- Descentes en Ø 80 ou en Ø 100 ? (Ø 80 / Ø 100 / Ø 120)
- Combien de descentes pour cette gouttière ? (1 / 2 / 3 / 4)

| Ligne orange | Chiffre | Sous-ligne |
| --- | --- | --- |
| Ardoises naturelles ? 30×22 | 9 271 pièces | Info manquante : qualité de l'ardoise. Valeur par défaut à confirmer : pente du toit 45° ; longueur du rampant 5,5 m ; diamètre du crochet standard |
| Crochets d'ardoise inox standard, longueur 11 cm | 9 457 pièces | Info manquante : qualité de l'ardoise. Valeur par défaut à confirmer : diamètre du crochet standard ; pente du toit 45° ; longueur du rampant 5,5 m |
| Naissances zinc demi-ronde | — | Info manquante : nombre de descentes |

Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :

| Désignation | Quantité | Précision | Le vendeur |
| --- | --- | --- | --- |
| Ardoises naturelles Espagne 1er choix 30×22 | 9 271 pièces | 200 m² × 44,15 ardoises/m² (crochet 11 cm, pente 45°) + 5 % de marge | chiffrable |
| Crochets d'ardoise inox standard, longueur 11 cm | 9 457 pièces | un par ardoise commandée, + 2 % de casse (référentiel : crochets = ardoises × 1,02) | chiffrable |
| Gouttière zinc demi-ronde dév. 33 | 6 longueurs de 4 m (24 ml à couvrir) |  | chiffrable |
| Naissances zinc demi-ronde dév. 33 Ø80 | 1 pièce |  | chiffrable |

