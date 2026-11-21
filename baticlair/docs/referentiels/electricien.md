# Référentiel quantitatif Électricien (Rappidos)

Oct 3, 2026 · @Greg

Tiroir métier « électricien » pour le moteur générique BatiClair : du devis aux quantités à commander au négoce, en unités de commande (couronnes, tourets, boîtes, pièces), jamais en mètres linéaires bruts ni en m².

## 1. Métier et axes de variation

L'électricité du bâtiment est pilotée par la norme NF C 15-100, pas par la région : le quantitatif dépend d'abord du type de bâtiment et de neuf/rénovation, presque jamais de la géographie.

Périmètre v1 : électricité courants forts et faibles en logement (maison et appartement), neuf et rénovation. Hors v1 : ERP, tertiaire, industriel, photovoltaïque, borne IRVE autre que le circuit d'alimentation, alarme et domotique (voir section 13).

```json
{
  "code": "electricite",
  "nom": "Électricité bâtiment (logement)",
  "version": "0.1.0",
  "normes": ["NF C 15-100 (version 2024)", "NF C 14-100", "Guide UTE C 15-520", "Guide UTE C 90-483"],
  "axes_de_variation": {
    "geographie": "nul",
    "epoque_bati": "moyen",
    "type_batiment": "fort",
    "neuf_renovation": "fort",
    "gamme": "moyen"
  },
  "metiers_lies": ["plaquiste", "plombier-chauffagiste", "maçon"],
  "unites_de_commande": ["u", "couronne", "touret", "boite", "sachet", "barre", "carton"],
  "maturite": "alpha"
}
```

| Axe | Poids | Ce qu'il change dans le quantitatif | Exemple |
| --- | --- | --- | --- |
| type\_batiment | fort | Maison : tableau + câble R2V vers dépendances, liaison équipotentielle, prise de terre à créer. Appartement : GTL déjà en place, gaines plus courtes, pas de piquet de terre | Maison neuve 100 m² ≈ 1,5 à 2 × plus de gaine qu'un T4 en immeuble |
| neuf\_renovation | fort | Neuf : gaine ICTA encastrée en dalle ou cloison, boîtes à cloison sèche ou à béton. Rénovation : moulure/goulotte ou saignées, boîtes rénovation, dépose, réemploi partiel du tableau | Rénovation en apparent = goulottes en barres de 2 m au lieu de couronnes de gaine |
| epoque\_bati | moyen | Avant 1975 : souvent pas de terre, fils tissu, tableau à fusibles → tout est à refaire. 1975-2002 : terre présente, tableau à remplacer. Après 2002 : extension seulement | Maison 1960 = mise aux normes complète + piquet de terre |
| gamme | moyen | Change la référence d'appareillage (blanc standard, design, connecté) et le prix, pas la quantité | Céliane vs Mosaic : même nombre de pièces |
| geographie | nul | Aucune règle de calcul ne dépend du département. Seule exception notée : longueur de câble entre coffret et maison en zone rurale (à demander, pas à déduire) | — |

Conséquence pour le moteur : jamais de question sur la région. Les questions de contexte portent sur type de bâtiment, neuf/rénovation et pose encastrée ou apparente (section 7).

## 2. Règle d'or et unités de commande

Règle d'or : un devis d'électricien parle en **points** (« 12 prises 2P+T », « 8 points lumineux »), le négoce vend en **couronnes, boîtes et pièces**. Le moteur ne sort jamais un « ml de câble » ni un « point » : il convertit chaque point en appareillage à la pièce, chaque circuit en mètres puis en couronnes entières, chaque tableau en modules puis en rangées.

Deuxième règle propre au métier : **la quantité de câble ne figure presque jamais sur le devis**. Elle se déduit du nombre de points, du nombre de circuits et de la distance au tableau (section 5). C'est le poste le plus incertain du quantitatif, donc le premier affiché en hypothèse.

| Famille | Unité de commande négoce | Arrondi | Source du conditionnement |
| --- | --- | --- | --- |
| Gaine ICTA préfilée (3G1,5 Ø16, 3G2,5 Ø20) | couronne de 100 m | entier supérieur | fiches négoce (section 4) |
| Fil H07V-U 1,5 / 2,5 mm² | couronne de 100 m par couleur | entier supérieur, par couleur | Nexans |
| Câble R2V 3G1,5 / 3G2,5 | couronne 50 ou 100 m, touret 500 m | couronne si < 100 m, touret au-delà de 400 m | Nexans, négoces |
| Câble R2V 3G6, 3G10, 16 mm² | mètre à la coupe | mètre entier supérieur | à vérifier par négoce |
| Gaine ICTA nue Ø16/20/25 | couronne de 100 m (25 et 50 m en dépannage) | entier supérieur | à vérifier |
| Boîtes d'encastrement | pièce (cartons de 25 à 50 côté négoce) | pièce ; carton si ≥ 80 % du carton | à vérifier |
| Appareillage (prise, interrupteur, plaque) | pièce | pièce | fabricant |
| Disjoncteurs, interrupteurs différentiels | pièce | pièce | fabricant |
| Coffret / tableau | pièce, choisi par nombre de rangées de 13 modules | rangée entière | fabricant |
| Bornes de connexion Wago 221 | boîte de 100 (2 fils), 50 (3 fils), 25 (5 fils) | boîte entière | Wago, négoces |
| Moulure, goulotte | barre de 2 m ou 2,1 m (à vérifier par gamme) | barre entière | à vérifier |
| Consommables (colliers, chevilles, plâtre) | sachet, boîte, sac | entier supérieur | section 9 |

Interdits d'affichage : « ml de gaine » pour une gaine vendue en couronne, « m² » sous quelque forme que ce soit, « point » comme unité d'un matériau.

## 3. Ouvrages du métier, vocabulaire des devis et pièges

Un ouvrage électricité = un **point** (prise, lumière, commande, circuit spécialisé) ou un **ensemble** (tableau, GTL, mise à la terre). Le moteur lit les lignes, les range dans un des ouvrages ci-dessous, puis applique les règles de la section 5.

| Ouvrage (id) | Ce que l'artisan écrit dans le devis | Ce que le moteur en tire |
| --- | --- | --- |
| prise\_16a | « PC 16A », « prise 2P+T », « PC », « socle de prise », « prise de courant » | 1 mécanisme + 1 plaque + 1 boîte par poste ; mètres de gaine 3G2,5 |
| prise\_double | « prise double », « bloc 2 prises », « PC double » | 2 prises pour le comptage des circuits, 1 boîte 2 postes, 1 plaque 2 postes |
| prise\_cuisine\_pdt | « prise plan de travail », « PC cuisine » | comme prise\_16a, sur circuit cuisine (6 max) |
| point\_lumineux | « point lumineux », « PL », « point de centre », « DCL », « applique » | 1 boîte DCL + 1 douille DCL (si pas de luminaire fourni) ; mètres 3G1,5 |
| spot | « spot encastré », « spot LED », « downlight » | 1 spot à la pièce (ou kit), 1 capot ou cloche si isolant ; mètres 3G1,5 |
| commande\_sa | « interrupteur SA », « simple allumage », « inter » | 1 mécanisme + plaque + boîte ; descente 3G1,5 |
| commande\_vv | « va-et-vient », « VV », « 2 commandes » | 2 mécanismes + 2 plaques + 2 boîtes ; navette |
| commande\_tele | « télérupteur », « BP », « bouton poussoir » | 1 télérupteur modulaire au tableau + n poussoirs |
| circuit\_specialise | « circuit spécialisé », « CS », « ligne dédiée », « prise LL / LV / four / SL / congélateur » | 1 disjoncteur 20 A + 1 sortie (prise ou sortie de câble) + mètres 3G2,5 |
| circuit\_cuisson | « plaque de cuisson », « cuisinière », « 32A » | 1 disjoncteur 32 A + 1 sortie de câble 32 A + mètres 3G6 |
| circuit\_chauffage | « radiateur », « convecteur », « fil pilote » | disjoncteur selon puissance (section 5), sortie de câble, fil pilote |
| chauffe\_eau | « CE », « cumulus », « ballon » | disjoncteur 20 A + contacteur heures creuses + 3G2,5 |
| vmc | « VMC », « extraction » | disjoncteur 2 A + 3G1,5 |
| volet\_roulant | « VR », « volet électrique » | inter de volet + 3G1,5 (ou 4 conducteurs) |
| prise\_rj45 | « RJ45 », « prise réseau », « prise com », « VDI » | 1 prise RJ45 + boîte + mètres câble grade 2TV/Cat6 + gaine Ø20 vide |
| prise\_tv | « prise TV », « TV/SAT » | 1 prise coaxiale + boîte + câble coaxial |
| tableau | « tableau », « TGBT », « tableau de répartition », « coffret 3 rangées » | coffret + différentiels + disjoncteurs + peignes (section 5) |
| gtl | « GTL », « gaine technique logement », « ETEL » | 1 GTL complète (goulotte + couvercle + platine) |
| terre | « prise de terre », « piquet de terre », « barrette » | piquet, câble cuivre nu ou vert-jaune 16/25 mm², barrette de coupure |
| irve | « borne », « IRVE », « prise Green'Up » | disjoncteur + différentiel type A ou F + câble 3G2,5 (16 A) ou 3G10 (32 A) |
| exterieur | « prise extérieure », « éclairage jardin », « portail » | appareillage IP55, R2V enterré sous gaine TPC rouge + grillage avertisseur |

**Pièges fréquents dans les devis**

- « Pose seule », « fourniture client » ou « main d'œuvre » : la ligne ne génère aucun matériel. Le moteur la garde en mémoire pour ne pas la compter deux fois.
- « Forfait électricité » ou « rénovation complète » sans détail : impossible à quantifier ligne à ligne. Le moteur applique l'équipement minimum NF C 15-100 de la section 5 à partir de la surface et du nombre de pièces, et l'affiche en hypothèse.
- Prise double : compte 2 pour la règle des 8 ou 12 prises par circuit (règle Nexans : un socle à deux prises vaut 2), mais une seule boîte et une seule plaque.
- « Mise en sécurité » ou « mise aux normes » : en général tableau + terre + différentiels, pas de nouveaux points. Ne pas inventer de prises.
- « Câble » ou « gaine » en ml dans le devis : c'est la seule fois où le métré existe ; le moteur l'utilise à la place de son estimation, puis convertit en couronnes.
- Dépose, saignées, rebouchage, attestation Consuel, diagnostic : aucune ligne de commande, sauf plâtre de rebouchage (section 9).
- Luminaires, spots « fournis par le client » : aucun luminaire, mais la boîte DCL et le câble restent dus.
- Abréviations à ne pas confondre : « PC » = prise de courant (pas ordinateur), « PL » = point lumineux, « CE » = chauffe-eau, « LL/LV/SL » = lave-linge, lave-vaisselle, sèche-linge, « ID » = interrupteur différentiel, « DB » = disjoncteur de branchement (fourni par Enedis, jamais commandé).

## 4. Matériaux et fiches fabricant

Les conditionnements ci-dessous sont relevés sur des fiches fabricant ou négoce ouvertes le 3 octobre 2026. Tout ce qui n'a pas été trouvé est marqué *à vérifier* ; le moteur l'utilise mais l'affiche en orange.

**4.1 Conducteurs et conduits**

| Article (id) | Caractéristiques | Conditionnement négoce | Poids | Source |
| --- | --- | --- | --- | --- |
| gaine\_prefilee\_3g25\_d20 | ICTA Ø20, 3 fils H07V-U 2,5 mm² bleu/rouge/vert-jaune, 750 N | couronne 100 m | 15,1 à 15,3 kg la couronne | [Toutfaire](https://www.toutfaire.fr/gaine-icta-prefilee-courants-forts-janofil-3422-20g-3g2-5-brj-100ml.html), [La Plateforme](https://www.laplateforme.com/catalogue/produit/96551/gaine-prefilee-icta-gris-o-20-mm-3-x-2-5-rouleau-de-100-m), [Elec44 Preflex](https://elec44.fr/4055-gaines-electriques-icta-prefilees) |
| gaine\_prefilee\_3g15\_d16 | ICTA Ø16, 3 fils 1,5 mm² (N/B/VJ ou R/B/VJ) | couronne 100 m | *à vérifier* (≈ 10 kg) | [Elec44 Preflex PFG16E31501](https://elec44.fr/4055-gaines-electriques-icta-prefilees) |
| gaine\_prefilee\_3x15\_navette | ICTA Ø16, 3 fils 1,5 mm² orange/orange/rouge, sans terre (navettes de va-et-vient) | couronne 100 m | *à vérifier* | [Elec44 Preflex PFG16E31541](https://elec44.fr/4055-gaines-electriques-icta-prefilees) |
| gaine\_prefilee\_3g25\_1x15\_d20 | ICTA Ø20, 3 × 2,5 + 1 × 1,5 noir (chauffage avec fil pilote) | couronne 100 m | *à vérifier* | [123elec Qofil](https://www.123elec.com/gaine-electrique-icta-prefilee-3-x-2-5-1-x-1-5-d20-couronne-de-100m.html) |
| fil\_h07vu\_15 | âme massive 1,5 mm², Ø ext. 3,2 mm, PVC | couronne 100 m par couleur (existe en 5, 10, 25, 500 m) | 18 kg/km → 1,8 kg la couronne | [Nexans 10269980](https://www.nexans.fr/en/products/Building/Residential/Rigides-Wires/H07V-U-536932466/product~10269980~.html), [Nexans Home](https://home.nexans.fr/produits/h07v-u) |
| fil\_h07vu\_25 | âme massive 2,5 mm², Ø ext. 3,9 mm | couronne 100 m par couleur | *à vérifier* (≈ 29 kg/km) | [Clim+ Nexans 10269983](https://www.climplus.com/p/accessoires/cable-electrique-h07v-u-passeo-1x2-5-bleu-le-rouleau-100m-ref-A3660329) |
| cable\_r2v\_3g25 | U-1000 R2V, Ø ext. 10 à 12,5 mm, extérieur et enterré sous gaine | couronne 50 ou 100 m, touret 500 m | 140 à 170 kg/km ; couronne 100 m ≈ 13 à 14 kg | [Materiauxnet Nexans](https://www.materiauxnet.com/cable-industriel-rigide-cuivre-nexans-u1000-r2v-3g2-5-500-m.html), [Nexans R2V pdf](https://www.nexans.ma/.rest/eservice/dam/v1/file/223875/U_1000_R2V.pdf), [Bricoman](https://www.bricoman.fr/produits/cable-electrique-u-1000-r2v-3g-2-5-mm2-100-m-nexans-234171.html) |
| cable\_r2v\_3g15 | U-1000 R2V 3G1,5 | couronne 50 ou 100 m, touret 500 m | *à vérifier* | Nexans (gamme) |
| cable\_r2v\_3g6 | U-1000 R2V 3G6 (plaque de cuisson si pas de préfilée) | mètre à la coupe | *à vérifier* | — |
| cable\_r2v\_3g10 | U-1000 R2V 3G10 (borne IRVE 32 A) | mètre à la coupe | *à vérifier* | — |
| gaine\_icta\_nue\_d16 / d20 / d25 | ICTA vide, avec tire-fil | couronne 100 m (Ø25 souvent 50 m) | *à vérifier* | — |
| gaine\_tpc\_d40\_rouge | TPC rouge Ø40 pour réseau enterré | couronne 25 ou 50 m | *à vérifier* | — |
| grillage\_avertisseur\_rouge | largeur 20 cm | rouleau 25 ou 100 m | *à vérifier* | — |
| cable\_vdi\_grade2tv | 4 paires, grade 2TV / Cat6 | couronne 100 m ou carton 305 m | *à vérifier* | — |

**4.2 Boîtes, appareillage, connexion**

| Article (id) | Caractéristiques | Conditionnement négoce | Source |
| --- | --- | --- | --- |
| boite\_cloison\_seche\_1p\_p40 | Legrand Batibox 080041 : Ø perçage 67 mm, profondeur 40 mm, encombrement 71 × 71 × 43 mm, appareillage à vis ou griffes | pièce ; carton de *à vérifier* (le carton Legrand pèse 1 268 g) | [Electrissime 080041](https://www.electrissime.fr/boite-monoposte-batibox-cloison-seche-vis/griffe-1-poste-prof-40-080041-a2459.html), [Maison Energy](https://www.maison-energy.com/boite-monoposte-batibox-pour-cloisons-seches-1-poste-2-modules-profondeur-40mm-080041.html) |
| boite\_cloison\_seche\_1p\_eco | Legrand Eco Batibox 080021L, 1 poste, profondeur 40 mm | lot de 50 | [Elec44](https://elec44.fr/boites-d-encastrement-legrand/7002-legrand-boite-monoposte-batibox-cloison-seche-visgriffe-1-poste-prof-40-ref-080041-3245060800413.html) |
| boite\_cloison\_seche\_2p / 3p / 4p | multiposte, entraxe 71 mm | pièce | *à vérifier* |
| boite\_maconnerie\_1p | Batibox maçonnerie Ø67, profondeur 40 ou 50 mm | pièce | *à vérifier* |
| boite\_dcl\_plafond | boîte point de centre DCL cloison sèche ou béton, avec couvercle | pièce | *à vérifier* |
| douille\_dcl | douille DCL E27 + fiche | pièce | *à vérifier* |
| prise\_2pt\_complete | prise 2P+T 16 A à vis ou griffes, avec plaque (gamme d'entrée type Dooxie, Odace, Essensya) | pièce | fabricant |
| interrupteur\_va\_et\_vient\_complet | interrupteur va-et-vient 10 A avec plaque (sert aussi en simple allumage) | pièce | fabricant |
| prise\_rj45 / prise\_tv | prise RJ45 grade 2TV ou Cat6, prise TV coaxiale | pièce | fabricant |
| wago\_221\_412 | borne 2 conducteurs 0,2 à 4 mm², 32 A, 450 V | boîte de 100 | [Wago via Mabeo](https://www.mabeo-industries.com/A-559450-wago-borne-de-connexion-rapide-serie-221), [Domomat](https://www.domomat.com/16014-boite-de-100-mini-bornes-d-installation-universelles-2-conducteurs-wago-221-412-x100.html) |
| wago\_221\_413 | borne 3 conducteurs 0,2 à 4 mm² | boîte de 50 | idem |
| wago\_221\_415 | borne 5 conducteurs 0,2 à 4 mm² | boîte de 25 | idem |

**4.3 Tableau et protection**

| Article (id) | Caractéristiques | Conditionnement | Source |
| --- | --- | --- | --- |
| coffret\_13m\_1r / 2r / 3r / 4r | Legrand Drivia 13 modules par rangée : 401211 (1 rangée), 401212 (2), 401213 (3), 401214 (4) ; porte séparée 401331 à 401334 | pièce | [123elec Drivia](https://www.123elec.com/gamme-materiel-electrique/tableaux-electriques/tableaux-electriques-legrand.html) |
| gtl\_13m | goulotte GTL Drivia 13 modules 2 compartiments, couvercle complet (030037) ; 3 compartiments hauteur réglable (030039) | pièce | [123elec](https://www.123elec.com/marques/legrand/tableaux-electriques.html) |
| platine\_db | platine disjoncteur de branchement Drivia 401191 | pièce | [123elec](https://www.123elec.com/legrand-drivia-tableau-electrique-13-modules-nu-3-rangees.html) |
| id\_40a\_30ma\_ac / id\_40a\_30ma\_a | interrupteur différentiel 40 A 30 mA type AC ou A, 2 modules | pièce | *à vérifier* (largeur en modules par référence) |
| disj\_2a / 10a / 16a / 20a / 32a | disjoncteur phase + neutre 1 module | pièce | *à vérifier* |
| contacteur\_hc | contacteur jour/nuit 25 A (ex. Legrand CX3 412544), 1 module | pièce | [123elec](https://123elec.com/legrand-drivia-rehausse-pour-coffret-4-rangees-13-modules.html) |
| peigne\_13m | peigne d'alimentation phase + neutre 13 modules | 1 par rangée | *à vérifier* |
| obturateur\_5m / 13m | obturateur blanc 5 modules (001660) ou 13 modules (001662) | pièce | [123elec](https://www.123elec.com/marques/legrand/tableaux-electriques.html?p=2) |
| tableau\_preequipe\_nr | coffret livré avec ID et disjoncteurs (1 à 4 rangées) | pièce | gamme fabricant, *à vérifier* |

**4.4 Extrait de `materiaux.json`**

```json
{
  "materiaux": [
    {
      "id": "gaine_prefilee_3g25_d20",
      "libelle": "Gaine ICTA préfilée Ø20 3G2,5",
      "famille": "conduit_prefile",
      "unite_commande": "couronne",
      "conditionnements": [{"libelle": "couronne", "quantite": 100, "unite": "m"}],
      "params": {"section_mm2": 2.5, "diametre_mm": 20, "conducteurs": 3, "poids_kg_couronne": 15.3},
      "norme": "NF C 15-100"
    },
    {
      "id": "wago_221_413",
      "libelle": "Borne Wago 221-413 3 conducteurs",
      "famille": "connexion",
      "unite_commande": "boite",
      "conditionnements": [{"libelle": "boite", "quantite": 50, "unite": "u"}]
    },
    {
      "id": "coffret_13m_2r",
      "libelle": "Coffret 2 rangées 13 modules (type Drivia 401212)",
      "famille": "tableau",
      "unite_commande": "u",
      "params": {"rangees": 2, "modules_par_rangee": 13}
    }
  ]
}
```

## 5. Règles de calcul NF C 15-100 : formules et pertes

Pas de DTU en électricité : la référence est la série NF C 15-100 publiée le 23 août 2024, seule applicable depuis le 1er septembre 2025 ([Batirama](https://www.batirama.com/article/106616-norme-tableau-electrique-ce-qu-impose-la-serie-nf-c-15-100.html), [Kasq](https://kasq.fr/norme-nf-c-15-100/)). La norme fixe les sections, calibres et nombres de points ; elle ne fixe aucune longueur de câble, d'où les ratios des sections 6 et 11.

**5.1 Sections et calibres (NF C 15-100, tableau 10-1F, transcrit de [Nexans](https://home.nexans.fr/section-des-conducteurs-et-calibres-de-protection))**

| Circuit | Section cuivre mini | Disjoncteur maxi | Produit par défaut |
| --- | --- | --- | --- |
| Éclairage (8 points maxi par circuit) | 1,5 mm² | 16 A | préfilée 3G1,5 Ø16 |
| Prises 16 A, 8 socles maxi | 1,5 mm² | 16 A | préfilée 3G1,5 Ø16 |
| Prises 16 A, 12 socles maxi | 2,5 mm² | 20 A | préfilée 3G2,5 Ø20 |
| Prises cuisine plan de travail, 6 socles maxi | 2,5 mm² | 20 A | préfilée 3G2,5 Ø20 |
| Lave-vaisselle, four, lave-linge, sèche-linge | 2,5 mm² | 20 A | préfilée 3G2,5 Ø20 |
| Réfrigérateur / congélateur | 2,5 mm² | 20 A, différentiel 30 mA immunité renforcée | préfilée 3G2,5 Ø20 |
| Plaque, cuisinière monophasé | 6 mm² | 32 A | R2V 3G6 à la coupe |
| Plaque, cuisinière triphasé | 2,5 mm² | 20 A | R2V 5G2,5 |
| Volets roulants | 1,5 mm² | 16 A | préfilée 3G1,5 Ø16 |
| VMC | 1,5 mm² | 2 A | préfilée 3G1,5 Ø16 |
| Fil pilote, asservissement tarifaire | 1,5 mm² | 2 A | fil 1,5 mm² noir |
| Convecteurs 3 500 / 4 500 / 5 750 / 7 250 W | 1,5 / 2,5 / 4 / 6 mm² | 16 / 20 / 25 / 32 A | préfilée 3G2,5 + 1×1,5 si ≤ 4 500 W |
| Plancher chauffant 1 700 / 3 400 / 4 200 / 5 400 / 7 500 W | 1,5 / 2,5 / 4 / 6 / 10 mm² | 16 / 25 / 32 / 40 / 50 A | R2V à la coupe |
| Chauffe-eau non instantané | 2,5 mm² | 20 A | préfilée 3G2,5 Ø20 |
| IRVE prise 16 A ou borne 16 A | 2,5 mm² | 20 A | préfilée 3G2,5 Ø20 |
| IRVE borne 32 A mono ou tri | 10 mm² | 40 A | R2V 3G10 ou 5G10 à la coupe |

Comptage des prises : un socle double vaut 2 ([Nexans](https://home.nexans.fr/prises-de-courant)).

**5.2 Équipement minimum (pour les lignes « forfait » sans détail)**

| Pièce | Prises 16 A minimum | Autres |
| --- | --- | --- |
| Séjour ≤ 28 m² | 1 par tranche de 4 m², minimum 5 | 1 point lumineux, 2 prises multimédia près des RJ45 |
| Séjour > 28 m² | 7 | idem |
| Chambre | 3 | 1 point lumineux, 1 RJ45 |
| Cuisine > 4 m² | 6 dont 4 au-dessus du plan de travail, circuit dédié | 1 point lumineux, circuits spécialisés |
| Cuisine ≤ 4 m² | 3 | idem |
| Autre pièce > 4 m² | 1 | 1 point lumineux |
| Logement | — | au moins 2 circuits d'éclairage (1 en studio), circuits spécialisés : 32 A cuisson + au moins 3 × 20 A |

Sources : [Schneider Electric](https://www.se.com/fr/fr/work/support/local/reglementation/norme-nfc15-100/prise-electrique/), [Promotelec](https://www.promotelec.com/particuliers/fiche/quel-equipement-minimal-prevoir-pour-votre-installation-electrique/), [Kasq](https://kasq.fr/norme-nf-c-15-100/), [Circuia](https://www.circuia.com/norme-nf-c-15-100). Le nombre exact de circuits spécialisés minimum (3 ou 4 selon les guides) est *à vérifier* sur le texte 2024.

**5.3 Nombre de circuits**

```latex
n_{circ\,PC} = \lceil S_{PC} / 8 \rceil \quad n_{circ\,cuisine} = \lceil S_{cuisine} / 6 \rceil \quad n_{circ\,ecl} = \max(2, \lceil P_{ecl} / 8 \rceil)
```

S = socles (un double compte 2), P = points d'éclairage. Hypothèse affichée : circuits prises en 2,5 mm² / 20 A plafonnés à 8 socles (pratique courante, la norme autorise 12). Chaque circuit spécialisé du devis = 1 circuit.

**5.4 Longueurs de câble puis couronnes**

Variables : D = distance moyenne tableau → première boîte du circuit ; d = distance entre deux postes du même circuit ; k = coefficient de chute et de remontée. Valeurs par défaut en section 6.

```latex
L_{PC} = n_{circ\,PC} \cdot D + (N_{postes\,PC} - n_{circ\,PC}) \cdot d_{PC}
```

```latex
L_{cuisine} = n_{circ\,cuisine} \cdot D + (N_{postes\,cuisine} - n_{circ\,cuisine}) \cdot 2
```

```latex
L_{ecl} = n_{circ\,ecl} \cdot D + (P_{ecl} - n_{circ\,ecl}) \cdot d_{PL} + 3 \cdot N_{commandes}
```

```latex
L_{spe} = N_{spe} \cdot (D + 2) \qquad L_{navette} = 6 \cdot N_{va\text{-}et\text{-}vient}
```

Couronnes de préfilée 3G2,5 Ø20 = ⌈ k × (L\_PC + L\_cuisine + L\_spe 20 A) / 100 ⌉. Couronnes de préfilée 3G1,5 Ø16 = ⌈ k × L\_ecl / 100 ⌉. Navettes : ⌈ k × L\_navette / 100 ⌉. Câbles à la coupe (6 et 10 mm²) : k × (D + 2) arrondi au mètre supérieur.

Note : la longueur se calcule en **postes** (une prise double = 1 poste, une boîte), le nombre de circuits en **socles** (une prise double = 2).

**5.5 Pose apparente (rénovation sous moulure)**

La préfilée est remplacée par du fil H07V-U sous moulure : par section, 3 couronnes de 100 m (bleu, rouge ou marron, vert-jaune) × ⌈ k × L / 100 ⌉. Moulure : barres = ⌈ 0,6 × k × L\_total / 2,1 ⌉, le coefficient 0,6 traduisant le partage des moulures entre circuits (*à valider*, section 11).

**5.6 Appareillage et boîtes**

| Ouvrage | Article | Quantité | Perte |
| --- | --- | --- | --- |
| Prise simple | prise\_2pt\_complete + boîte 1 poste | 1 + 1 par poste | boîtes +5 % (casse), arrondi sup. |
| Prise double | prise double complète + boîte 2 postes | 1 + 1 | idem |
| Commande SA | interrupteur + boîte 1 poste | 1 + 1 | idem |
| Commande VV | 2 interrupteurs + 2 boîtes | 2 + 2 | idem |
| Point lumineux plafond | boîte DCL + douille DCL | 1 + 1 (douille 0 si luminaire fourni) | 0 |
| Spot encastré | spot + capot si isolant au-dessus | 1 + 1 | 0 |
| RJ45, TV | prise + boîte 1 poste | 1 + 1 | idem |

Type de boîte selon la pose : cloison sèche (Batibox cloison sèche), maçonnerie (boîte à sceller + plâtre, section 9), apparent (boîte saillie). Bornes Wago 221-413 : 3 par point lumineux, boîtes de 50 ; les prises se repiquent sur leurs bornes, 0 Wago (*à valider*).

**5.7 Tableau**

```latex
n_{ID} = \max(2, \lceil n_{circ} / 8 \rceil) \qquad M = n_{circ} + 2\,n_{ID} + n_{contacteurs} + n_{telerupteurs} + 2\,n_{parafoudre}
```

```latex
M_{coffret} = \lceil 1{,}2 \cdot M \rceil \text{ (maison)} \quad \text{ou} \quad M + 6 \text{ (appartement)} \qquad rangees = \lceil M_{coffret} / 13 \rceil
```

Au moins un ID 30 mA de type A, qui reçoit lave-linge, plaque de cuisson et IRVE ; les autres en type AC ([Batirama](https://www.batirama.com/article/106616-norme-tableau-electrique-ce-qu-impose-la-serie-nf-c-15-100.html), [Legrand](https://www.legrand.fr/questions-frequentes/quelle-est-la-norme-pour-un-tableau-electrique-dans-une-maison-individuelle)). 8 circuits maxi par ID ([Legrand](https://www.legrand.fr/questions-frequentes/combien-de-prises-de-courant-par-disjoncteur)). Réserve 20 % en maison, 6 modules en collectif. Sortie : 1 coffret de n rangées, n peignes, 1 porte, n\_ID interrupteurs différentiels, 1 disjoncteur par circuit au calibre de 5.1, obturateurs pour les modules libres. Disjoncteurs, ID, contacteur : 1 module par disjoncteur, 2 par ID (*à vérifier par fabricant*).

**5.8 Terre, VDI**

- Terre (maison neuve, ou rénovation d'avant 1975 sans terre) : 1 piquet + 1 barrette de coupure + câble cuivre vert-jaune 16 mm² à la coupe, 5 m par défaut (*à valider*).
- VDI : par prise RJ45, gaine ICTA Ø20 nue et câble grade 2TV de longueur k × (D + 2) ; 1 coffret de communication par logement neuf.

**5.9 Extrait de `regles.json`**

```json
{
  "id": "circuits_prises",
  "declencheur": {"ouvrage": ["prise_16a", "prise_double"]},
  "entrees": ["socles", "postes", "D", "d_PC", "k"],
  "etapes": [
    "n_circ = ceil(socles / 8)",
    "L = n_circ * D + (postes - n_circ) * d_PC",
    "L_cmd = L * k"
  ],
  "sorties": [
    {"materiau": "gaine_prefilee_3g25_d20", "quantite": "L_cmd", "unite": "m", "agrege_par": "materiau", "arrondi": "couronne_100"},
    {"materiau": "disj_20a", "quantite": "n_circ", "unite": "u"}
  ],
  "hypotheses_a_afficher": ["D", "d_PC", "k", "8 socles par circuit"],
  "source": "NF C 15-100 tableau 10-1F"
}
```

Règle d'agrégation : les mètres de même article s'additionnent sur tout le devis **avant** l'arrondi en couronnes, jamais circuit par circuit.

## 6. Valeurs par défaut et hypothèses à afficher

Toutes les valeurs ci-dessous sont des hypothèses de travail, à faire valider (section 11). Le moteur les résout dans l'ordre chantier → artisan → axe → valeur nationale, et affiche chacune sous la ligne qu'elle influence.

| Clé | Valeur nationale | Variation par axe | Libellé affiché |
| --- | --- | --- | --- |
| D\_m (distance tableau → 1re boîte) | 12 m | appartement 8 ; maison à étage 15 | « Distance moyenne au tableau : {valeur} m » |
| d\_PC\_m (entre deux prises) | 4 m | appartement 3 | « {valeur} m entre deux prises » |
| d\_PL\_m (entre deux points lumineux) | 5 m | appartement 4 | « {valeur} m entre deux points lumineux » |
| descente\_commande\_m | 3 m | — | « 3 m par interrupteur » |
| navette\_vv\_m | 6 m | — | « 6 m de navette par va-et-vient » |
| k\_chute | 1,10 | rénovation 1,15 | « Chutes et remontées +{valeur} » |
| socles\_par\_circuit\_PC | 8 | — | « 8 prises max par circuit (2,5 mm² / 20 A) » |
| calibre\_eclairage | 16 A | — | « Éclairage en 16 A » |
| perte\_boites\_pct | 5 | — | « Boîtes +5 % (casse) » |
| reserve\_tableau | 20 % | appartement : 6 modules | « Réserve tableau {valeur} » |
| pose | encastrée cloison sèche | rénovation : question Q3 | « Pose {valeur} » |
| tableau | à fournir | rénovation légère sans ligne tableau : aucun | « Tableau neuf {oui/non} » |
| douille\_dcl | 1 par point lumineux | luminaire fourni : 0 | « Douille DCL fournie » |
| terre | oui en maison neuve | appartement : non ; maison d'avant 1975 : oui | « Prise de terre à créer » |

```json
{
  "D_m": {
    "valeur": 12,
    "variations": [
      { "si": { "type_batiment": "appartement" }, "valeur": 8 },
      { "si": { "type_batiment": "maison_etage" }, "valeur": 15 }
    ],
    "afficher": "Distance moyenne au tableau : {valeur} m"
  },
  "k_chute": {
    "valeur": 1.10,
    "variations": [ { "si": { "neuf_renovation": "renovation" }, "valeur": 1.15 } ],
    "afficher": "Chutes et remontées +{valeur}"
  }
}
```

Affichage obligatoire en tête du quantitatif : « Longueurs de câble estimées à partir du nombre de points ; modifiez la distance au tableau si votre chantier est atypique. » Une correction de D par l'artisan recalcule toutes les couronnes.

## 7. Questions à poser (4 maximum, à boutons)

Le moteur ne pose une question que si le devis ne donne pas déjà la réponse (adresse « appartement », « bât. B », « rénovation », ligne « tableau »…). Jamais de question sur une quantité, une distance ou une région.

| Ordre | Question affichée | Boutons | Défaut | Ce qu'elle change | Sensibilité |
| --- | --- | --- | --- | --- | --- |
| 0 | « C'est où ? » | Maison plain-pied · Maison à étage · Appartement | Maison plain-pied | D, d, terre, réserve tableau | ≈ 20 % sur les couronnes de câble (calcul sur le cas test elec-001, *à valider*) |
| 1 | « Neuf ou rénovation ? » | Neuf · Rénovation | Neuf | k, type de boîtes, terre | 5 % sur le câble, 100 % sur la référence des boîtes |
| 2 | « Les fils passent comment ? » | Dans les cloisons (placo) · Dans les murs (saignées) · Sous moulure (apparent) | Placo | préfilée ou fils + moulure ; boîte cloison sèche, à sceller ou saillie | 100 % sur la famille d'articles |
| 3 | « On change le tableau ? » | Oui, tableau neuf · Non, on garde l'existant | Oui si le devis a plus de 3 nouveaux circuits | coffret, ID, disjoncteurs, peignes | 100 % sur les lignes tableau |

```json
[
  {
    "id": "type_batiment",
    "ouvrages": ["*"],
    "priorite": 0,
    "si_inconnu": "type_batiment",
    "texte": "C'est où ?",
    "boutons": [
      { "label": "Maison plain-pied", "valeur": "maison_plain_pied" },
      { "label": "Maison à étage", "valeur": "maison_etage" },
      { "label": "Appartement", "valeur": "appartement" }
    ],
    "defaut": "maison_plain_pied",
    "sensibilite_pct": 20
  },
  {
    "id": "pose",
    "ouvrages": ["prise_*", "point_lumineux", "commande_*"],
    "priorite": 2,
    "si_inconnu": "pose",
    "texte": "Les fils passent comment ?",
    "boutons": [
      { "label": "Dans les cloisons (placo)", "valeur": "cloison_seche" },
      { "label": "Dans les murs (saignées)", "valeur": "maconnerie" },
      { "label": "Sous moulure", "valeur": "apparent" }
    ],
    "defaut": "cloison_seche",
    "sensibilite_pct": 100
  }
]
```

Question de secours (5e, seulement si les 4 précédentes sont déjà résolues par le devis) : « Luminaires fournis ? » Oui · Non, qui supprime ou ajoute les douilles DCL.

## 8. Matériaux dominants par région

Aucun matériau électrique ne change selon la région en métropole : la NF C 15-100 est nationale et les produits sont les mêmes de Lille à Marseille. L'axe `geographie` est déclaré `nul` et le moteur ne pose jamais de question de région.

Ce qui varie réellement, et que le moteur doit gérer autrement que par la région :

| Ce qui varie | Exemple | Comment le moteur le gère |
| --- | --- | --- |
| Marque tenue par le négoce | un négoce stocke Legrand, l'autre Schneider ou Hager | le fichier fournisseur de l'artisan fixe la marque ; la quantité ne change pas |
| Marque de préfilée | Preflex, Qofil, Janofil, PM Flex | article générique « préfilée 3G2,5 Ø20 », marque choisie par le négoce |
| Gamme d'appareillage | entrée de gamme, design, connecté | axe `gamme`, change la référence, jamais la quantité |
| Bord de mer, exposition saline | prises et boîtes extérieures | ajouter IP55 minimum à l'extérieur (déjà la règle partout) ; matériel renforcé en front de mer *à vérifier* |
| Outre-mer | normes et produits proches mais circuits climatisation fréquents | hors périmètre v1 |
| Raccordement rural | coffret en limite de propriété loin de la maison | longueur du câble de liaison demandée seulement si la ligne existe au devis |

```json
{ "materiaux_dominants": { "national": ["gaine_prefilee_3g25_d20", "gaine_prefilee_3g15_d16", "boite_cloison_seche_1p_p40", "coffret_13m_*"] }, "par_region": {} }
```

## 9. Points singuliers et consommables

Ce sont les lignes que l'artisan oublie de commander et qui bloquent le chantier ou le Consuel. Le moteur les ajoute automatiquement dès que l'ouvrage déclencheur est présent.

**9.1 Points singuliers**

| Déclencheur | Ajout automatique | Règle |
| --- | --- | --- |
| Salle de bain (pièce citée au devis) | prises hors volumes 0 à 2, luminaire IP adapté au volume, circuit protégé par ID 30 mA | nombre de prises inchangé ; référence IP *à vérifier* par volume |
| Prise ou éclairage extérieur | appareillage IP55, boîte étanche | +1 référence étanche par point extérieur |
| Liaison enterrée (abri, portail, éclairage jardin) | R2V à la coupe + gaine TPC rouge Ø40 + grillage avertisseur rouge | longueur = distance du devis × 1,10 ; profondeur de pose *à vérifier* (≈ 0,50 m) |
| Chauffe-eau | contacteur jour/nuit au tableau + fil de commande 1,5 mm² | 1 contacteur par chauffe-eau |
| Radiateurs électriques | fil pilote : préfilée 3G2,5 + 1×1,5 au lieu de 3G2,5 | 1 sortie de câble par radiateur |
| Plaque de cuisson | sortie de câble 32 A ou boîte de connexion | 1 par plaque |
| Lave-linge, plaque, IRVE | branchés derrière un ID type A | contrôle au tableau, aucun article en plus |
| Va-et-vient ou télérupteur | navettes ou poussoirs | section 5.4 |
| Spots sous isolant | capot de protection par spot | 1 par spot si combles isolés |
| Tableau neuf | GTL si logement neuf ou si le devis la cite | 1 GTL 13 modules |
| Maison sans terre ou neuve | piquet, barrette, câble vert-jaune 16 mm² | section 5.8 |

**9.2 Consommables**

| Consommable | Déclencheur | Ratio | Unité de commande |
| --- | --- | --- | --- |
| Plâtre à sceller | boîtes en maçonnerie, saignées | 0,3 kg par boîte + 0,5 kg par mètre de saignée (*à valider*) | sac 5 kg |
| Vis et chevilles de moulure | pose apparente | 5 fixations par barre de 2,1 m (*à valider*) | boîte de 100 |
| Colliers de serrage | câbles en combles ou vide sanitaire | 1 collier par 0,5 m de câble posé hors gaine (*à valider*) | sachet de 100 |
| Bornes Wago 221-413 | points lumineux | 3 par point (*à valider*) | boîte de 50 |
| Bornes Wago 221-415 | boîtes de dérivation | 3 par boîte de dérivation (*à valider*) | boîte de 25 |
| Embouts de câblage | fil souple au tableau | 0 avec fil rigide | — |
| Étiquettes de repérage | tableau | fournies avec le coffret Drivia | — |

Règle d'affichage : chaque consommable apparaît en bas de liste sous « Petites fournitures », jamais mélangé aux matériaux principaux.

## 10. Cas de test au format JSON

Trois cas synthétiques calculés à la main avec les règles des sections 5 et 6. Ils servent de tests unitaires du moteur en attendant des devis réels d'électriciens (à placer dans `tests/` dès réception, section 13).

**elec-001 : maison plain-pied neuve, placo, tableau neuf.** Devis : 20 prises simples + 2 prises doubles (séjour, chambres), 6 prises cuisine, 12 points lumineux, 10 simples allumages, 2 va-et-vient, circuits LL, LV, four, chauffe-eau, plaque 32 A, VMC, 4 RJ45. Calcul : 3 circuits prises (24 socles ÷ 8), 1 cuisine, 2 éclairage ; 3G2,5 = (112 + 22 + 56) × 1,10 = 209 m ; 3G1,5 = (116 + 14) × 1,10 = 143 m ; 12 circuits → 2 ID → 17 modules × 1,2 = 21 → 2 rangées.

```json
{
  "id": "elec-001",
  "source": "cas synthétique, à remplacer par un devis réel",
  "contexte": { "type_batiment": "maison_plain_pied", "neuf_renovation": "neuf", "pose": "cloison_seche", "tableau": "neuf" },
  "attendu": [
    { "article": "gaine_prefilee_3g25_d20", "quantite": 3, "unite": "couronne 100 m", "tolerance_pct": 0 },
    { "article": "gaine_prefilee_3g15_d16", "quantite": 2, "unite": "couronne 100 m", "tolerance_pct": 0 },
    { "article": "gaine_prefilee_3x15_navette", "quantite": 1, "unite": "couronne 100 m", "tolerance_pct": 0 },
    { "article": "cable_r2v_3g6", "quantite": 16, "unite": "m", "tolerance_pct": 5 },
    { "article": "gaine_icta_nue_d20", "quantite": 1, "unite": "couronne 100 m", "tolerance_pct": 0 },
    { "article": "cable_vdi_grade2tv", "quantite": 1, "unite": "couronne 100 m", "tolerance_pct": 0 },
    { "article": "prise_2pt_complete", "quantite": 26, "unite": "u", "tolerance_pct": 0 },
    { "article": "prise_double_complete", "quantite": 2, "unite": "u", "tolerance_pct": 0 },
    { "article": "interrupteur_va_et_vient_complet", "quantite": 14, "unite": "u", "tolerance_pct": 0 },
    { "article": "prise_rj45", "quantite": 4, "unite": "u", "tolerance_pct": 0 },
    { "article": "boite_cloison_seche_1p_p40", "quantite": 47, "unite": "u", "tolerance_pct": 0 },
    { "article": "boite_cloison_seche_2p", "quantite": 3, "unite": "u", "tolerance_pct": 0 },
    { "article": "boite_dcl_plafond", "quantite": 12, "unite": "u", "tolerance_pct": 0 },
    { "article": "douille_dcl", "quantite": 12, "unite": "u", "tolerance_pct": 0 },
    { "article": "wago_221_413", "quantite": 1, "unite": "boite 50", "tolerance_pct": 0 },
    { "article": "coffret_13m_2r", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "peigne_13m", "quantite": 2, "unite": "u", "tolerance_pct": 0 },
    { "article": "id_40a_30ma_a", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "id_40a_30ma_ac", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "disj_20a", "quantite": 8, "unite": "u", "tolerance_pct": 0 },
    { "article": "disj_16a", "quantite": 2, "unite": "u", "tolerance_pct": 0 },
    { "article": "disj_32a", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "disj_2a", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "contacteur_hc", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "piquet_terre", "quantite": 1, "unite": "u", "tolerance_pct": 0 }
  ],
  "questions_max": 4
}
```

**elec-002 : appartement en rénovation, sous moulure, tableau conservé.** Devis : 8 prises, 4 points lumineux, 4 simples allumages. D = 8, d\_PC = 3, d\_PL = 4, k = 1,15. Calcul : prises 29 m × 1,15 = 33 m ; éclairage 36 m × 1,15 = 41 m ; moulure 0,6 × 1,15 × 65 ÷ 2,1 = 21,4 → 22 barres ; tableau conservé = disjoncteurs des 3 nouveaux circuits seulement.

```json
{
  "id": "elec-002",
  "source": "cas synthétique, à remplacer par un devis réel",
  "contexte": { "type_batiment": "appartement", "neuf_renovation": "renovation", "pose": "apparent", "tableau": "conserve" },
  "attendu": [
    { "article": "fil_h07vu_25", "quantite": 3, "unite": "couronne 100 m (bleu, rouge, vert-jaune)", "tolerance_pct": 0 },
    { "article": "fil_h07vu_15", "quantite": 3, "unite": "couronne 100 m (bleu, rouge, vert-jaune)", "tolerance_pct": 0 },
    { "article": "moulure_2_1m", "quantite": 22, "unite": "barre", "tolerance_pct": 10 },
    { "article": "prise_2pt_saillie", "quantite": 8, "unite": "u", "tolerance_pct": 0 },
    { "article": "interrupteur_saillie", "quantite": 4, "unite": "u", "tolerance_pct": 0 },
    { "article": "boite_dcl_plafond", "quantite": 4, "unite": "u", "tolerance_pct": 0 },
    { "article": "douille_dcl", "quantite": 4, "unite": "u", "tolerance_pct": 0 },
    { "article": "wago_221_413", "quantite": 1, "unite": "boite 50", "tolerance_pct": 0 },
    { "article": "disj_20a", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "disj_16a", "quantite": 2, "unite": "u", "tolerance_pct": 0 },
    { "article": "vis_cheville_moulure", "quantite": 2, "unite": "boite 100", "tolerance_pct": 0 }
  ],
  "questions_max": 4
}
```

**elec-003 : ligne « forfait rénovation électrique complète » d'un T3.** Pièces citées : séjour 25 m², 2 chambres, cuisine 8 m², salle de bain, entrée. Test de l'expansion par l'équipement minimum (5.2), avant tout calcul de câble.

```json
{
  "id": "elec-003",
  "source": "cas synthétique, test de l'expansion forfait",
  "contexte": { "type_batiment": "appartement", "neuf_renovation": "renovation", "pose": "cloison_seche", "tableau": "neuf" },
  "attendu_points": [
    { "piece": "sejour_25m2", "prises": 7, "points_lumineux": 1, "rj45": 1 },
    { "piece": "chambre", "nombre": 2, "prises": 3, "points_lumineux": 1, "rj45": 1 },
    { "piece": "cuisine_8m2", "prises": 6, "points_lumineux": 1 },
    { "piece": "salle_de_bain", "prises": 1, "points_lumineux": 1 },
    { "piece": "entree", "prises": 1, "points_lumineux": 1 }
  ],
  "hypothese_affichee": "Forfait sans détail : équipement minimum NF C 15-100 appliqué",
  "questions_max": 4
}
```
