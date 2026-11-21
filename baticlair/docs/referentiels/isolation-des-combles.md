# Référentiel quantitatif ISOLATION DES COMBLES (Rappidos)

Oct 3, 2026 · @Greg

Tiroir métier « isolation des combles » pour le moteur générique BatiClair (gabarit section 27 du référentiel couverture). Version 1.0.0, maturité **beta** : les tables fabricant marquées « source » sont transcrites, tout le reste est marqué « à vérifier » et listé en section 11. Greg n'est pas du métier : relecture par un poseur RGE isolation obligatoire avant mise en production.

**Pour Claude Code** : créer `referentiels/isolation-combles/` avec les fichiers du gabarit 27.2 (`metier.json`, `ouvrages.json`, `materiaux.json`, `regles.json`, `defauts.json`, `questions.json`, `vocabulaire.json`, `ratios-a-valider.md`, `tests/`, `CHANGELOG.md`). Aucune ligne de moteur ne doit contenir un mot de ce métier. Les blocs JSON de ce doc sont la source de ces fichiers.

## 1. Métier et axes de variation

L'isolation des combles regroupe trois chantiers très différents : le **soufflage en vrac** sur plancher de combles perdus (environ 75 % du marché selon Picbleu), le **déroulé de rouleaux** sur ce même plancher, et l'**isolation des rampants** (combles aménagés : isolant entre et sous chevrons, ossature, membrane, souvent parement plâtre). Le quantitatif dépend d'abord du **type d'isolant** et de la **résistance thermique R visée**, presque jamais de la région.

| Axe | Poids | Pourquoi | Comment le moteur le résout |
| --- | --- | --- | --- |
| geographie | faible | R visé quasi national (aides CEE/MaPrimeRénov' : R ≥ 7 combles perdus, R ≥ 6 rampants). La zone climatique ne joue qu'en neuf (RE2020). Altitude > 900 m : neige, charge plafond à surveiller. | Code postal du devis, jamais demandé |
| epoque\_bati | moyen | Bâti ancien : plafond lattis plâtré, solives irrégulières, conduits maçonnés, vieille laine tassée à garder ou retirer. | Déduit des mots du devis (« dépose », « rehausse », « existant ») |
| type\_batiment | moyen | Maison individuelle = cas nominal. Pièce humide sous comble, local à forte hygrométrie : soufflage interdit (hygrométrie > 5 g/m³). | Défaut maison ; question si devis tertiaire |
| neuf\_renovation | **fort** | Rénovation = déflecteurs, rehausse trappe, coffrage conduits, recouvrement d'un existant ; neuf = pare-vapeur posé avant plafond. | Mots du devis ; question si absent |
| gamme | **fort** | Laine de verre, laine de roche et ouate de cellulose n'ont ni la même masse au m², ni le même sac, ni le même tassement (écart × 2 en kg/m²). | Lu dans le devis (marque, « ouate », « roche ») ; sinon question n°1 |

```json
{
  "code": "isolation-combles",
  "nom": "Isolation des combles",
  "version": "1.0.0",
  "normes": ["NF DTU 45.11 (nov. 2025)", "NF DTU 45.10", "NF DTU 25.41", "NF DTU 31.2"],
  "axes_de_variation": {
    "geographie": "faible",
    "epoque_bati": "moyen",
    "type_batiment": "moyen",
    "neuf_renovation": "fort",
    "gamme": "fort"
  },
  "metiers_lies": ["couverture", "platrerie", "electricite", "charpente"],
  "unites_de_commande": ["sac", "rouleau", "panneau", "palette", "u", "boite", "barre", "plaque", "cartouche", "rouleau_adhesif", "rouleau_membrane"],
  "maturite": "beta"
}
```

## 2. Règle d'or et unités de commande

**Règle d'or** : jamais de m², de m³ ni de kg sur une ligne envoyée au négoce. Le devis parle en m² et en R ; le quantitatif parle en sacs, rouleaux, boîtes, barres et plaques. Le m² et l'épaisseur restent dans le résumé chantier (annexe fournisseur), jamais dans la colonne quantité.

| Famille | Unité de commande | Arrondi | Exemple de ligne prête à envoyer |
| --- | --- | --- | --- |
| Isolant en vrac (laine de verre, de roche, ouate) | sac (+ palette si ≥ 1 palette) | sup. à l'unité | « 22 sacs Comblissimo 17,3 kg » |
| Isolant en rouleau | rouleau | sup. à l'unité | « 18 rouleaux IBR Revêtu Kraft 200 mm 1,20 × 4,50 m » |
| Isolant en panneau | paquet | sup. au paquet | « 6 paquets GR32 Revêtu Kraft 100 mm » |
| Membrane pare-vapeur | rouleau (60 m² ou 30 m²) | sup. | « 2 rouleaux Vario Xtra 1,50 × 40 m » |
| Adhésif de membrane | rouleau (40 m) | sup. | « 3 rouleaux adhésif Vario KB1 60 mm × 40 m » |
| Mastic de membrane | cartouche (310 ml) | sup. | « 4 cartouches Vario DoubleFit 310 ml » |
| Suspentes | boîte (50 pièces) | sup. à la boîte | « 4 boîtes suspentes Intégra 2 200-240 mm » |
| Fourrures, cornières | barre (longueur négoce) | sup. | « 30 fourrures F530 3,00 m » |
| Plaque de plâtre | plaque | sup. | « 26 plaques BA13 1,20 × 2,50 » |
| Accessoires (piges, déflecteurs, capots, étiquettes, trappe) | u ou lot | sup. | « 1 lot de 10 piges » |

Une ligne contient toujours : quantité, unité de commande, désignation, dimension ou épaisseur, conditionnement. Si le négoce vend une autre taille de sac, le moteur recalcule avec le poids du sac du négoce, jamais avec un m² « équivalent ».

## 3. Ouvrages du métier, vocabulaire des devis, pièges

Sept ouvrages couvrent 95 % des devis « isolation des combles » (estimation, à vérifier sur devis réels). Le moteur détecte l'ouvrage par les mots du devis, puis charge uniquement ses règles.

| id ouvrage | Ce que fait l'artisan | Mots du devis qui le déclenchent | Mesures lues dans le devis |
| --- | --- | --- | --- |
| `soufflage_combles_perdus` | Souffle de l'isolant en vrac sur le plancher d'un comble non aménageable | soufflage, laine soufflée, flocons, vrac, combles perdus, ouate, cellulose, Comblissimo, Jetrock, Supafil, R = 7, « 32 cm », « 100 m² isolés » | surface plancher m², R visé ou épaisseur, nature isolant |
| `deroule_combles_perdus` | Déroule des rouleaux sur le plancher, 1 ou 2 couches croisées | laine à dérouler, rouleaux, IBR, déroulé, 2 couches croisées, kraft | surface m², R ou épaisseur par couche |
| `rampants_combles_amenages` | Isolant entre et/ou sous chevrons, ossature sur suspentes, membrane, parement | rampants, combles aménagés, sous toiture, entre chevrons, suspentes, Intégra, Optima, pare-vapeur, hygrorégulant, BA13, placo | surface rampants m², R ou épaisseur(s), parement oui/non |
| `pare_vapeur_plancher` | Membrane sur plafond avant soufflage ou déroulé (neuf ou plafond déposé) | pare-vapeur, membrane, frein-vapeur, étanchéité à l'air, Vario | surface m² (= surface isolée) |
| `depose_isolant_existant` | Retire une vieille laine tassée ou souillée | dépose, retrait, évacuation ancienne isolation, aspiration | surface m² |
| `trappe_acces` | Isole et rend étanche la trappe, pose un coffrage de rehausse | trappe, rehausse trappe, coffrage trappe, trappe isolée | nombre |
| `points_singuliers_securite` | Conduits, spots, boîtiers, ventilation, chemin de circulation | écart au feu, conduit, cheminée, spots, déflecteurs, VMC, piges, étiquettes, chemin de circulation | nombre de conduits, de spots, longueur d'égout |

**Hors périmètre** (renvoyés aux autres tiroirs) : isolation par l'extérieur type sarking (couverture), bandes et peinture du plafond (plâtrerie, peinture), déplacement de câbles (électricité), plancher porteur OSB sur solives (charpente/menuiserie).

**Pièges des devis, à coder dans `vocabulaire.json`** :

1. **« m² » sur un devis de combles perdus = surface au sol du plancher**, pas la surface de toiture. Sur un devis de rampants, c'est la surface en pente. Ne jamais confondre les deux.
2. **L'épaisseur annoncée n'est pas toujours celle qu'on souffle.** La ouate se tasse de 20 % : pour R = 7, 273 mm après tassement mais 350 mm à souffler (fiche Ouattitude). Le moteur part du **R**, pas de l'épaisseur.
3. **« R = 7 » sur un devis de rénovation** = R de la nouvelle couche ajoutée, sauf mention « R total ». En cas de doute, la nouvelle couche porte tout le R du devis (hypothèse affichée).
4. **« 2 couches croisées »** : deux lignes de rouleaux d'épaisseurs souvent différentes (ex. 200 + 100 mm), surface comptée deux fois.
5. **La marque du devis fait foi** : « Comblissimo » = sac 17,3 kg ; « Jetrock » = sac 20 kg ; « ouate » sans marque = sac 12,5 kg par défaut (à vérifier selon négoce : 10, 12,5 ou 14 kg existent).
6. **Un nombre de sacs écrit dans le devis** (cas fréquent, c'est le contrôle exigé par le DTU 45.11) est **repris tel quel** s'il est ≥ au calcul ; s'il est inférieur, l'app garde le calcul et le signale.
7. **« Isolation sous rampants R = 6 »** peut cacher deux couches (entre chevrons + sous chevrons) : la somme des R fait foi.
8. **« Placo » dans un devis d'isolation** : ne compter les plaques que si le devis les facture ; sinon c'est le plaquiste qui commande.

## 4. Matériaux et fiches fabricant

Le quantitatif de soufflage se lit directement dans la table certifiée ACERMI du produit : **R visé → nombre minimal de sacs pour 100 m²**. C'est la valeur imprimée sur chaque sac et contrôlée par le DTU 45.11 ; le moteur ne recalcule jamais une densité lui-même.

### 4.1 Isolants en vrac à souffler (combles perdus)

| Produit | Fabricant | λ W/(m.K) | Sac | Sacs / palette | Tassement | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Comblissimo (laine de verre) | Isover | 0,046 | 17,3 kg | 36 | classe 1 (aucun) | [fiche Isover 24/04/26](https://www.isover.fr/documents/fiche-produit/ficheproduit-comblissimo.pdf) |
| Jetrock 2 (laine de roche) | Rockwool | 0,044 | 20 kg | 35 (700 kg) | S1 | [fiche Rockwool 01/2026](https://www.rockwool.com/siteassets/rw-f/telechargements/fiches-produits/rockwool_fp_jetrock_2.pdf) |
| Ouattitude (ouate de cellulose) | Igloo France Cellulose | 0,039 | 10 kg | 40 | SH25, 20 % | [fiche Igloo sept. 2024](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1855055.pdf) |

**Table de soufflage, sacs minimum pour 100 m² (transcrite des fiches)** :

| R (m².K/W) | Comblissimo : ép. mini mm / kg/m² / sacs | Jetrock 2 : ép. installée mm / kg/m² / sacs | Ouattitude : ép. à souffler mm / sacs 10 kg |
| --- | --- | --- | --- |
| 5 | 235 / 2,70 / 15,4 | 225 / 4,30 / 21,1 | 250 / 63 |
| 5,5 | 260 / 3,00 / 17,0 | 245 / 4,70 / 23,2 | 275 / 69 |
| 6 | 280 / 3,30 / 18,5 | 270 / 5,10 / 25,3 | 300 / 75 |
| 6,5 | 305 / 3,50 / 20,0 | 290 / 5,50 / 27,4 | 325 / 82 |
| **7** | **330 / 3,80 / 21,6** | **315 / 6,00 / 29,6** | **350 / 88** |
| 7,5 | 350 / 4,10 / 23,1 | 335 / 6,40 / 31,7 | 375 / 94 |
| 8 | 375 / 4,30 / 24,7 | 360 / 6,80 / 33,8 | 400 / 100 |
| 8,5 | 395 / 4,60 / 26,2 | 380 / 7,20 / 35,9 | 425 / 107 |
| 9 | 420 / 4,90 / 27,8 | 400 / 7,60 / 38,0 | 450 / 113 |
| 9,5 | 445 / 5,10 / 29,3 | 425 / 8,10 / 40,1 | 475 / 119 |
| 10 | 465 / 5,40 / 30,8 | 445 / 8,50 / 42,2 | 500 / 125 |

Comblissimo va jusqu'à R 14 (655 mm, 43,2 sacs) et Jetrock 2 jusqu'à R 15 (670 mm, 63,3 sacs) : tables complètes dans les fiches liées. Comblissimo : table transcrite par le revendeur [La Maison Naturelle](https://www.la-maison-naturelle.com/isolants-en-vrac/10450-laine-de-verre-blanche-comblissimo-sac-de-17-3kg-3-80kg-m-pour-r-7.html) depuis l'ACERMI 07/D/18/474, recoupée avec [Samse](https://www.samse.fr/423944-laine-de-verre-comblissimo-sac-17-3kg.html) (24,9 sacs à R 8, ancienne table) : **à vérifier** sur l'étiquette du sac du négoce. Ouate : épaisseur après tassement 20 % = 273 mm à R 7.

**Autres vrac à ajouter** (à vérifier) : Knauf Supafil (sac annoncé 16,6 kg), Isocell, Soprema UniverCell (12,5 kg, 30 sacs/palette selon Batiproduits), Thermacell Cristal (10 / 12,5 / 14 kg).

### 4.2 Rouleaux à dérouler sur plancher (combles perdus)

IBR Revêtu Kraft, Isover, λ 0,040, kraft = pare-vapeur intégré ([fiche technique 23/04/26](https://www.placo.fr/documents/fiche-technique/fichetechnique-ibr-revtu-kraft.pdf)) :

| Code | Épaisseur mm | R | Largeur × longueur m | m² / rouleau | Rouleaux / palette | Dispo |
| --- | --- | --- | --- | --- | --- | --- |
| 91514 | 80 | 2,0 | 1,20 × 9,00 | 10,80 | 30 | stock |
| 71908 | 100 | 2,5 | 1,20 × 8,00 | 9,60 | 36 | stock |
| 72191 | 160 | 4,0 | 1,20 × 5,50 | 6,60 | 36 | stock |
| 72018 | 200 | 5,0 | 1,20 × 4,50 | 5,40 | 36 | stock |
| 85496 | 240 | 6,0 | 1,20 × 3,50 | 4,20 | 30 | stock |
| 92889 | 260 | 6,5 | 1,20 × 3,00 | 3,60 | 24 | stock |
| 84913 | 300 | 7,5 | 1,20 × 2,60 | 3,12 | 24 | stock |
| 64732 | 320 | 8,0 | 1,20 × 2,40 | 2,88 | 24 | stock |
| 66826 | 400 | 10,0 | 1,20 × 2,00 | 2,40 | 24 | stock |

En 2 couches croisées, seule la 1re couche porte un kraft ; la 2e est en rouleau **nu** (IBR nu, A1). Références IBR nu **à vérifier**.

### 4.3 Rampants (combles aménagés)

Le NF DTU 45.10 impose une laine **semi-rigide** en combles aménagés ; les rouleaux souples type IBR y sont proscrits ([communiqué Isover sur le DTU 45.10](https://www.isover.fr/sites/isover.fr/files/assets/documents/cp_isover_dtu_45.10_vdef.pdf)).

| Produit | Épaisseur / R | Format | m² / u | u / palette | Source |
| --- | --- | --- | --- | --- | --- |
| Isoconfort 32 revêtu kraft | 200 mm / R 6,25 | rouleau 1,20 × 2,20 m | 2,64 | 24 | [fiche Isover 24/03/26](https://www.isover.fr/download-documents/fiche-technique/fichetechnique-isoconfort-32-revtu-kraft.pdf) |
| GR 32 Roulé revêtu kraft | 100 mm / R 3,15 | rouleau 1,20 × 2,70 m | 3,24 | 30 | [fiche Samse](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_79476.pdf) (ancienne, à vérifier) |
| GR 32 Roulé revêtu kraft | 160 mm / R 5,00 | rouleau 1,20 × 2,70 m | 3,24 | 12 | idem |
| Isoconfort 35 (2e couche) | 60 à 240 mm | rouleau 1,20 m de large | selon ép. | 30 | [Batiproduits](https://www.batiproduits.com/amp/fiche/produits/laine-de-verre-jusqu-a-220-mm-d-epaisseur-isoc-p68891773.html), à vérifier |

### 4.4 Membrane, adhésifs, mastic

| Produit | Format | Rendement fabricant | Source |
| --- | --- | --- | --- |
| Membrane Vario Xtra (hygrorégulante, Sd 0,4 à 25 m) | rouleau 1,50 × 40 m = 60 m², 5,2 kg ; existe en 1,50 × 20 m = 30 m² | **1,1 m² de membrane par m² isolé** | [étiquette Isover 60 m²](https://www.isover.fr/download-documents/packaging-bat/65970-membrane-varior-xtra-60m2-etiquette.pdf), [30 m²](https://www.isover.fr/download-documents/packaging-bat/16790-membrane-varior-xtra-30m2-etiquette.pdf) |
| Vario Xtra Fast (pré-adhésivée) | 1,50 × 40 m = 60 m², 6,2 kg | idem | [étiquette Isover](https://www.isover.fr/download-documents/packaging-bat/13351-membrane-varior-xtra-fast-15x40m-etiquette.pdf) |
| Adhésif Vario KB1 / Multitape | rouleau 60 mm × 40 m | voir 5.4 | [Brico Dépôt](https://www.bricodepot.fr/p/3596265257350/adhesif-d-etancheite-pour-membrane-vario-kb1) |
| Mastic Vario DoubleFit | cartouche 310 ml | voir 5.4 | [Brico Dépôt](https://www.bricodepot.fr/marque/isover/2) |

### 4.5 Ossature rampants

| Produit | Format | Conditionnement | Source |
| --- | --- | --- | --- |
| Suspente Intégra 2 (Isover) | longueurs 120-160, 160-200, 200-240, 240-280 mm ; fourrures de 45 mm | boîte de 50 (à vérifier, la Fermette est en boîte de 50 sur le site Isover) | [Setin](https://www.setin.fr/suspente-integra-2-isover-a27508.html), [Isover Fermette](https://www.isover.fr/produits/suspentes/suspente-integra-2-fermette) |
| Fourrure Stil F 530 (Placo) | 45 × 18 mm, 0,43 kg/ml ; **3,00 m** ou 5,30 m | botte de 10 | [fiche Placo](https://particuliers.placo.fr/documents/fiche-produit/ficheproduit-fourrure-stil-f-530.pdf) |
| Éclisse 50 Stil F 530 | 500 mm | botte de 10 | [fiche Placo](https://medias.bigmat.fr/data_medias/medias_finaux/documents/3496250148949-NVVVOIIiGT.pdf) |
| Plaque BA13 standard | 1,20 × 2,50 m (aussi 2,60 / 2,80 / 3,00) | plaque | à vérifier (renvoi tiroir plâtrerie) |

### 4.6 Sécurité et contrôle (obligatoires DTU 45.11)

| Produit | Format | Source |
| --- | --- | --- |
| Capot de spot encastré A1 (ex. Knauf KI Spot Protector 248 × 248 × 150 mm) | paquet de 4 | [Knauf](https://knauf.com/fr-FR/p/produit/ki-spot-protector-24416_4210) |
| Piges de hauteur | u ; **4 pour 100 m²** | [Mémo chantier AQC](https://proreno.fr/storage/media/shares/pdf/00684/MEMO%20CHANTIER-%20Isolation%20des%20combles%20perdus%20par%20soufflage.pdf) |
| Écran / rehausse de trappe (ex. Rockwool 810 × 360 × 100 mm) | u, 4 par kit Jetrock | [mise en œuvre Jetrock 2](https://www.cmesmat.fr/media/projets/r/o/rockwool_mise_en_oeuvre_jetrock_2_combles_perdus_202001.pdf) |
| Étiquettes « isolation en vrac » (tableau électrique, boîtiers) + fiche fin de chantier | liasse | DTU 45.11 ; kit Jetrock (5 étiquettes boîtier) |
| Déflecteur de pied de versant | u (1 par entre-fermette) | à vérifier |
| Coffrage incombustible de conduit | u par conduit | à vérifier (voir 9) |

```json
{
  "materiaux": [
    {"id": "vrac_lv_comblissimo", "libelle": "Laine de verre à souffler Comblissimo 17,3 kg", "famille": "vrac", "unite_commande": "sac",
     "conditionnements": [{"libelle": "palette", "quantite": 36}], "params": {"poids_sac_kg": 17.3, "lambda": 0.046, "tassement_pct": 0},
     "table_sacs_100m2": {"5": 15.4, "5.5": 17.0, "6": 18.5, "6.5": 20.0, "7": 21.6, "7.5": 23.1, "8": 24.7, "8.5": 26.2, "9": 27.8, "9.5": 29.3, "10": 30.8, "11": 33.9, "12": 37.0, "13": 40.1, "14": 43.2},
     "table_ep_mini_mm": {"5": 235, "6": 280, "7": 330, "8": 375, "9": 420, "10": 465}, "dtu": "45.11", "statut": "a_verifier_etiquette"},
    {"id": "vrac_lr_jetrock2", "libelle": "Laine de roche à souffler Jetrock 2 20 kg", "famille": "vrac", "unite_commande": "sac",
     "conditionnements": [{"libelle": "palette", "quantite": 35}], "params": {"poids_sac_kg": 20, "lambda": 0.044, "tassement_pct": 0},
     "table_sacs_100m2": {"5": 21.1, "5.5": 23.2, "6": 25.3, "6.5": 27.4, "7": 29.6, "7.5": 31.7, "8": 33.8, "8.5": 35.9, "9": 38.0, "9.5": 40.1, "10": 42.2, "11": 46.4, "12": 50.7, "13": 54.9, "14": 59.1, "15": 63.3},
     "table_ep_mini_mm": {"5": 225, "6": 270, "7": 315, "8": 360, "9": 400, "10": 445}, "dtu": "45.11", "statut": "source"},
    {"id": "vrac_ouate_ouattitude", "libelle": "Ouate de cellulose Ouattitude 10 kg", "famille": "vrac", "unite_commande": "sac",
     "conditionnements": [{"libelle": "palette", "quantite": 40}], "params": {"poids_sac_kg": 10, "lambda": 0.039, "tassement_pct": 20},
     "table_sacs_100m2": {"5": 63, "5.5": 69, "6": 75, "6.5": 82, "7": 88, "7.5": 94, "8": 100, "8.5": 107, "9": 113, "9.5": 119, "10": 125},
     "table_ep_mini_mm": {"5": 250, "6": 300, "7": 350, "8": 400, "9": 450, "10": 500}, "dtu": "45.11", "statut": "source"},
    {"id": "rlx_ibr_kraft_200", "libelle": "Rouleau IBR Revêtu Kraft 200 mm R5 1,20x4,50", "famille": "rouleau_plancher", "unite_commande": "rouleau",
     "conditionnements": [{"libelle": "palette", "quantite": 36}], "params": {"epaisseur_mm": 200, "R": 5.0, "m2_par_u": 5.40}, "dtu": "45.10", "statut": "source"},
    {"id": "rlx_isoconfort32_200", "libelle": "Rouleau Isoconfort 32 revêtu kraft 200 mm R6,25 1,20x2,20", "famille": "rouleau_rampant", "unite_commande": "rouleau",
     "conditionnements": [{"libelle": "palette", "quantite": 24}], "params": {"epaisseur_mm": 200, "R": 6.25, "m2_par_u": 2.64}, "dtu": "45.10", "statut": "source"},
    {"id": "membrane_vario_xtra_60", "libelle": "Membrane Vario Xtra 1,50x40 m (60 m²)", "famille": "membrane", "unite_commande": "rouleau",
     "params": {"m2_par_u": 60, "ratio_m2_par_m2": 1.1, "poids_kg": 5.2}, "statut": "source"},
    {"id": "adhesif_vario_kb1", "libelle": "Adhésif Vario KB1 60 mm x 40 m", "famille": "adhesif", "unite_commande": "rouleau", "params": {"ml_par_u": 40}, "statut": "source"},
    {"id": "mastic_vario_doublefit", "libelle": "Mastic Vario DoubleFit 310 ml", "famille": "mastic", "unite_commande": "cartouche", "params": {"ml_cordon_par_u": 10}, "statut": "a_verifier"},
    {"id": "suspente_integra2", "libelle": "Suspente Intégra 2", "famille": "ossature", "unite_commande": "boite", "conditionnements": [{"libelle": "boite", "quantite": 50}],
     "params": {"longueurs_mm": ["120-160", "160-200", "200-240", "240-280"]}, "statut": "a_verifier_boite"},
    {"id": "fourrure_f530_300", "libelle": "Fourrure Stil F 530 3,00 m", "famille": "ossature", "unite_commande": "barre", "conditionnements": [{"libelle": "botte", "quantite": 10}],
     "params": {"longueur_m": 3.0, "poids_kg_ml": 0.43}, "statut": "source"},
    {"id": "capot_spot_a1", "libelle": "Capot de protection spot encastré A1", "famille": "securite", "unite_commande": "paquet", "conditionnements": [{"libelle": "paquet", "quantite": 4}], "statut": "source"},
    {"id": "pige_hauteur", "libelle": "Pige de repérage de hauteur", "famille": "securite", "unite_commande": "u", "statut": "source"},
    {"id": "rehausse_trappe", "libelle": "Rehausse / écran de trappe", "famille": "securite", "unite_commande": "u", "statut": "a_verifier"}
  ]
}
```

## 5. Règles de calcul, formules et pertes

Le moteur part toujours du **R visé** et de la **surface lue dans le devis**, puis applique la table du produit. Arrondis : au sac, au rouleau, à la boîte, à la barre supérieurs ; jamais d'arrondi intermédiaire.

### 5.1 Soufflage combles perdus (NF DTU 45.11)

```latex
N_{sacs} = \left\lceil S \times \frac{T(R)}{100} \times (1 + p) \right\rceil
```

S = surface de plancher (m²), T(R) = sacs minimum pour 100 m² lus dans `table_sacs_100m2`, p = marge de chantier.

- **R absent de la table** : prendre la ligne de R immédiatement supérieure (jamais d'interpolation vers le bas).
- **Devis qui donne une épaisseur et pas de R** : prendre le plus grand R dont l'épaisseur mini ≤ épaisseur du devis ; afficher « R déduit ».
- **Marge p** = 5 % par défaut (rives, reprises autour des trémies, sacs mal vidés), 0 % si l'artisan choisit « au plus juste » (à vérifier avec un poseur).
- **Plancher du DTU** : N ≥ nombre minimal de la table, toujours. Si le devis indique un nombre de sacs supérieur, on garde celui du devis.
- **Palette** : si N ≥ 80 % d'une palette, proposer « 1 palette » en ligne principale et le reste en sacs.
- **Charge plafond** : si kg/m² × S dépasse 10 kg/m² sur plafond en plaques (cas Jetrock R ≥ 12, ouate R ≥ 10), alerte « vérifier ossature » sans bloquer (seuil du mémo AQC, à vérifier).

Exemple : 85 m², Comblissimo R 7 → 85 × 21,6 / 100 × 1,05 = 19,28 → **20 sacs Comblissimo 17,3 kg** (épaisseur mini 330 mm, affichée en hypothèse).

### 5.2 Déroulé combles perdus (NF DTU 45.10)

```latex
N_{rouleaux} = \left\lceil \frac{S \times (1 + p)}{m^2_{rouleau}} \right\rceil \quad \text{par couche}
```

- p = 5 % (découpes entre solives et autour des trémies, à vérifier).
- **1 couche** si un rouleau atteint R : prendre le plus petit R ≥ R visé dans la table 4.2.
- **2 couches croisées** si le devis le dit ou si R visé > 10 : 1re couche kraft entre solives, 2e couche nue croisée ; somme des R ≥ R visé. Couple par défaut pour R 7 : 160 mm kraft (R 4) + 120 mm nu (R 3), **à vérifier** (références IBR nu non sourcées).

Exemple : 60 m², IBR kraft 300 mm R 7,5 → 60 × 1,05 / 3,12 = 20,19 → **21 rouleaux**.

### 5.3 Rampants de combles aménagés (NF DTU 45.10 + DTU 25.41 pour l'ossature)

S = surface **en pente** des rampants. Toutes les lignes ci-dessous découlent de S et de l'épaisseur.

| Ligne | Formule | Pertes / hypothèses | Statut |
| --- | --- | --- | --- |
| Isolant couche entre chevrons | ⌈S × 1,08 / m²\_par\_u⌉ | 8 % de chutes (largeurs entre chevrons) | à vérifier |
| Isolant couche sous chevrons | ⌈S × 1,05 / m²\_par\_u⌉ | 5 % | à vérifier |
| Membrane | ⌈S × 1,1 / 60⌉ rouleaux | 1,1 m²/m² (étiquette Isover) | source |
| Adhésif jonction des lés | ⌈S × 0,8 / 40⌉ rouleaux | 0,8 ml/m² (lés de 1,50 m, recouvrement 10 cm, + traversées) | à vérifier |
| Mastic périphérique | ⌈P / 10⌉ cartouches | P = périmètre membrane/murs (défaut 2 × (longueur + rampant) par pan) ; 10 ml par cartouche | à vérifier |
| Suspentes | ⌈S × 2,5 / 50⌉ boîtes | 2 à 3 par m² (Isover, montage standard) | source |
| Longueur de suspente | épaisseur sous chevrons + 20 à 40 mm → gamme 120-160 / 160-200 / 200-240 / 240-280 | — | à vérifier |
| Fourrures 3,00 m | ⌈S / 0,60 × 1,10 / 3,00⌉ barres | entraxe 0,60 m maxi (40 à 60 cm), 10 % de chutes | source (entraxe) |
| Éclisses | ⌈barres / 2⌉ | 1 jonction pour 2 barres | à vérifier |
| Plaques BA13 1,20 × 2,50 (si facturées) | ⌈S × 1,10 / 3,00⌉ | 10 % de chutes | à vérifier (tiroir plâtrerie) |

Entraxe de fourrures abaissé à 0,50 m si l'isolant pèse plus de 6 kg/m² (laine de bois, ouate en caissons), à vérifier DTU 25.41.

Exemple : 70 m² de rampants, Isoconfort 32 200 mm sous chevrons → 70 × 1,05 / 2,64 = 27,8 → **28 rouleaux** ; membrane 70 × 1,1 / 60 = 1,28 → **2 rouleaux** ; suspentes 70 × 2,5 / 50 = 3,5 → **4 boîtes** ; fourrures 70 / 0,6 × 1,1 / 3 = 42,8 → **43 barres de 3 m** (5 bottes de 10, dont 7 en trop : afficher « 43 barres »).

### 5.4 Pare-vapeur sous combles perdus

Même formule que la membrane rampants (⌈S × 1,1 / 60⌉) + adhésif + mastic. Obligatoire selon le tableau du DTU 45.10 / 45.11 (zone très froide, plafond non étanche) : le moteur ne l'ajoute que si le devis le facture ou si la question 4 le déclenche.

### 5.5 Points singuliers (toujours calculés, même absents du devis)

| Ligne | Formule | Source |
| --- | --- | --- |
| Piges | max(4, ⌈S / 25⌉) | AQC : 4 pour 100 m² |
| Capots de spots | ⌈nb\_spots / 4⌉ paquets | Knauf, 4 par paquet |
| Rehausse de trappe | nb\_trappes (défaut 1) | DTU 45.11 |
| Coffrage de conduit | nb\_conduits | DTU 24.1 / 45.11 |
| Déflecteurs pied de versant | ⌈ml\_égout / 0,60⌉ par égout ventilé ; 0 si Jetrock avec grille | à vérifier |
| Étiquettes + fiche fin de chantier | 1 kit par chantier | DTU 45.11 |

```json
{
  "regles": [
    {"id": "soufflage_table_fabricant",
     "declencheur": {"ouvrage": "soufflage_combles_perdus", "mesure": "surface_plancher_m2"},
     "entrees": ["R_vise", "materiau_vrac", "marge_pct"],
     "etapes": [
       "R = R_vise or R_depuis_epaisseur(epaisseur_devis_mm)",
       "R_table = plus_petit_R_table_superieur_ou_egal(R)",
       "sacs_min = surface_plancher_m2 * table_sacs_100m2[R_table] / 100",
       "sacs = ceil(sacs_min * (1 + marge_pct / 100))",
       "sacs = max(sacs, sacs_devis or 0)"
     ],
     "sorties": [{"materiau": "vrac_*", "quantite": "sacs", "unite": "sac"}],
     "hypotheses_a_afficher": ["R_table", "table_ep_mini_mm[R_table]", "marge_pct"]},
    {"id": "deroule_rouleaux",
     "declencheur": {"ouvrage": "deroule_combles_perdus", "mesure": "surface_plancher_m2"},
     "entrees": ["R_vise", "nb_couches"],
     "etapes": ["couches = choisir_rouleaux(R_vise, nb_couches)", "pour chaque couche: n = ceil(surface_plancher_m2 * 1.05 / m2_par_u)"],
     "sorties": [{"materiau": "rlx_*", "quantite": "n", "unite": "rouleau"}],
     "hypotheses_a_afficher": ["couches", "perte 5 %"]},
    {"id": "rampants_systeme",
     "declencheur": {"ouvrage": "rampants_combles_amenages", "mesure": "surface_rampants_m2"},
     "entrees": ["R_vise", "couches", "parement_facture", "perimetre_ml"],
     "etapes": [
       "isolant_n = ceil(S * 1.05 / m2_par_u) par couche (1.08 si entre chevrons)",
       "membrane = ceil(S * 1.1 / 60)",
       "adhesif = ceil(S * 0.8 / 40)",
       "mastic = ceil(perimetre_ml / 10)",
       "suspentes_boites = ceil(S * 2.5 / 50)",
       "fourrures = ceil(S / 0.6 * 1.1 / 3.0)",
       "eclisses = ceil(fourrures / 2)",
       "plaques = parement_facture ? ceil(S * 1.1 / 3.0) : 0"
     ],
     "hypotheses_a_afficher": ["entraxe fourrures 0,60 m", "2,5 suspentes/m²", "longueur suspente"]},
    {"id": "points_singuliers_combles",
     "declencheur": {"ouvrage": "*", "toujours": true},
     "etapes": ["piges = max(4, ceil(S / 25))", "capots = ceil(nb_spots / 4)", "trappes = nb_trappes or 1", "coffrages = nb_conduits", "kit_etiquettes = 1"]}
  ]
}
```

## 6. Valeurs par défaut et hypothèses affichées

Chaque défaut utilisé s'affiche en une ligne au-dessus du quantitatif et se corrige d'un tap. Un défaut n'est jamais utilisé si le devis donne la valeur.

| Paramètre | Défaut | Variation | Texte affiché |
| --- | --- | --- | --- |
| R visé combles perdus | 7 | neuf : 8 (à vérifier RE2020) | « R 7 (seuil des aides) » |
| R visé rampants | 6 | neuf : 6,25 | « R 6 sous rampants » |
| Isolant vrac sans marque | laine de verre, sac 17,3 kg | « ouate » → 10 kg ; « roche » → 20 kg | « Laine de verre soufflée, sac 17,3 kg » |
| Marge soufflage | 5 % | 0 % si l'artisan répond « au plus juste » | « +5 % de marge » |
| Perte rouleaux | 5 % plancher, 8 % entre chevrons | — | « +5 % de chutes » |
| Couches rampants | 1 couche sous chevrons 200 mm | 2 couches si R > 6,25 | « 1 couche Isoconfort 32 200 mm » |
| Pare-vapeur | oui en rampants ; non en combles perdus rénovation | oui si devis « neuf » + plafond neuf | « Membrane Vario Xtra » |
| Spots encastrés | 0 | si « oui » : 1 spot pour 8 m² (à vérifier) | « 10 spots estimés » |
| Conduits | 0 | si « oui » : 1 | « 1 coffrage de conduit » |
| Trappes | 1 | — | « 1 rehausse de trappe » |
| Entraxe fourrures | 0,60 m | 0,50 m si isolant > 6 kg/m² | « Fourrures tous les 60 cm » |
| Égout ventilé (déflecteurs) | 2 × √(S × 1,6) ml | ml lu dans le devis | « 25 ml d'égout estimés » |
| Périmètre membrane rampants | 2 × (longueur + rampant) par pan | ml lu dans le devis | « 34 ml de périmètre estimés » |

```json
{
  "R_vise": {"valeur": 7, "variations": [{"si": {"ouvrage": "rampants_combles_amenages"}, "valeur": 6}, {"si": {"neuf_renovation": "neuf", "ouvrage": "soufflage_combles_perdus"}, "valeur": 8}], "afficher": "R {valeur}"},
  "materiau_vrac": {"valeur": "vrac_lv_comblissimo", "variations": [{"si": {"gamme": "ouate"}, "valeur": "vrac_ouate_ouattitude"}, {"si": {"gamme": "roche"}, "valeur": "vrac_lr_jetrock2"}], "afficher": "{libelle}"},
  "marge_pct": {"valeur": 5, "afficher": "+{valeur} % de marge"},
  "nb_trappes": {"valeur": 1, "afficher": "{valeur} rehausse de trappe"},
  "nb_spots": {"valeur": 0, "variations": [{"si": {"reponse_spots": "oui"}, "valeur": "ceil(surface_plancher_m2 / 8)"}], "afficher": "{valeur} spots estimés"},
  "nb_conduits": {"valeur": 0, "variations": [{"si": {"reponse_conduit": "oui"}, "valeur": 1}], "afficher": "{valeur} coffrage de conduit"},
  "entraxe_fourrures_m": {"valeur": 0.6, "afficher": "Fourrures tous les {valeur} m"},
  "pare_vapeur": {"valeur": false, "variations": [{"si": {"ouvrage": "rampants_combles_amenages"}, "valeur": true}], "afficher": "Pare-vapeur : {valeur}"}
}
```

## 7. Questions à poser (4 maximum, à boutons)

Le moteur pose **au plus 4 questions**, seulement celles dont la réponse manque dans le devis, dans l'ordre du tableau (levier décroissant sur le quantitatif). Aucune ne demande une quantité : les nombres sont déduits et affichés en hypothèse.

| # | Question affichée | Boutons | Posée si | Sensibilité sur le quantitatif |
| --- | --- | --- | --- | --- |
| 1 | « Tu souffles quoi ? » | Laine de verre · Laine de roche · Ouate | ouvrage soufflage et isolant absent du devis | **jusqu'à +300 %** de sacs (R 7, 100 m² : 22 sacs de verre, 30 de roche, 88 de ouate) |
| 2 | « Tu vises quel R ? » | R 7 · R 8 · R 10 | ni R ni épaisseur dans le devis | **+43 %** de R 7 à R 10 (21,6 → 30,8 sacs/100 m² en Comblissimo) |
| 3 | « Tu poses aussi les plaques de plâtre ? » | Oui · Non | ouvrage rampants et parement non clair | **+100 % de lignes** (plaques, vis, bandes) ; 0 % sur l'isolant |
| 4 | « Pare-vapeur sous le soufflage ? » | Oui · Non | combles perdus, devis muet | **+2 à 4 lignes** (membrane, adhésif, mastic) |
| 5 | « Des spots encastrés au plafond ? » | Oui · Non | si une place reste | **+1 ligne** (capots) ; sécurité incendie |
| 6 | « Un conduit de cheminée traverse les combles ? » | Oui · Non | si une place reste | **+1 ligne** (coffrage) ; sécurité incendie |

Si les 4 places sont prises, les questions 5 et 6 ne sont pas posées : le quantitatif ajoute alors une ligne rouge « Spots ou conduit dans les combles ? Pense aux capots et au coffrage » que l'artisan valide d'un tap.

```json
{
  "questions": [
    {"id": "q_isolant", "texte": "Tu souffles quoi ?", "boutons": ["Laine de verre", "Laine de roche", "Ouate"], "resout": "gamme", "si_absent": ["materiau_vrac"], "ouvrages": ["soufflage_combles_perdus"], "sensibilite_pct": 300},
    {"id": "q_R", "texte": "Tu vises quel R ?", "boutons": ["R 7", "R 8", "R 10"], "resout": "R_vise", "si_absent": ["R_vise", "epaisseur_devis_mm"], "sensibilite_pct": 43},
    {"id": "q_parement", "texte": "Tu poses aussi les plaques de plâtre ?", "boutons": ["Oui", "Non"], "resout": "parement_facture", "ouvrages": ["rampants_combles_amenages"], "sensibilite_pct": 100},
    {"id": "q_pare_vapeur", "texte": "Pare-vapeur sous le soufflage ?", "boutons": ["Oui", "Non"], "resout": "pare_vapeur", "ouvrages": ["soufflage_combles_perdus", "deroule_combles_perdus"], "sensibilite_pct": 30},
    {"id": "q_spots", "texte": "Des spots encastrés au plafond ?", "boutons": ["Oui", "Non"], "resout": "reponse_spots", "sensibilite_pct": 5, "securite": true},
    {"id": "q_conduit", "texte": "Un conduit de cheminée traverse les combles ?", "boutons": ["Oui", "Non"], "resout": "reponse_conduit", "sensibilite_pct": 2, "securite": true}
  ],
  "max_questions": 4
}
```

## 8. Matériaux dominants par région

L'axe géographie est **faible** : la laine de verre soufflée domine partout et le R visé est national. Trois effets régionaux seulement modifient un défaut, tous **à vérifier** auprès des négoces.

| Zone | Effet | Défaut modifié |
| --- | --- | --- |
| Ouest (Bretagne, Pays de la Loire) | Usines de ouate proches (Isocell à Guipavas 29, Igloo aux Achards 85) : ouate plus fréquente dans les devis | aucun ; « ouate » lue dans le devis suffit |
| Montagne, altitude > 900 m (zone très froide) | Pare-vapeur exigé plus souvent par le DTU 45.10 ; charge de neige sur charpente | `pare_vapeur` = true |
| Zone climatique H1 en neuf | R plus élevé recherché | `R_vise` = 8 en neuf (à vérifier RE2020) |
| Littoral, climats humides | Vigilance hygrométrie des combles (> 5 g/m³ : soufflage interdit) | aucun ; alerte texte |

Le moteur résout la zone depuis le code postal du devis (`referentiels/commun/departements.json`) : aucune question n'est posée sur la région.

## 9. Points singuliers et consommables

En isolation de combles, les points singuliers sont d'abord des **obligations de sécurité incendie** : le moteur les ajoute même si le devis les oublie, en ligne marquée « obligatoire DTU », que l'artisan peut retirer d'un tap. Les piges, la fiche de contrôle et les étiquettes de sacs ne concernent que le **soufflage**.

| Point singulier | Règle | Ligne de commande | Source |
| --- | --- | --- | --- |
| Conduit de fumée maçonné | Distance de sécurité 10 cm, isolant tenu à l'écart par un arrêtoir | 1 coffrage incombustible par conduit | [Mémo AQC](https://proreno.fr/storage/media/shares/pdf/00684/MEMO%20CHANTIER-%20Isolation%20des%20combles%20perdus%20par%20soufflage.pdf), [alerte CAPEB 2025](https://www.capeb.fr/actualites/alerte-c2p-isolation-par-soufflage-en-combles) |
| Conduit métallique | 8 cm (ou selon Cahier CSTB 3816) ; raccordement : 3 × diamètre, 37,5 cm mini | 1 coffrage par conduit | idem |
| Hauteur du coffrage | Dépasse l'isolant de 10 cm | hauteur coffrage = épaisseur mini + 100 mm | CAPEB |
| Spot encastré | Capot incombustible obligatoire (A1, ou A2-s2,d0 mini) ; pots de fleurs et cloches plastique interdits | ⌈nb\_spots / 4⌉ paquets | CAPEB, [Knauf](https://knauf.com/fr-FR/p/produit/ki-spot-protector-24416_4210) |
| Trappe d'accès | Rehausse en isolant rigide de même hauteur que le vrac, étanchéité en pied | 1 rehausse par trappe | Mémo AQC |
| Ventilation de la toiture | Ne jamais boucher l'entrée d'air en égout : déflecteur ou grille | déflecteurs ⌈ml\_égout / 0,60⌉, ou rien si système à grille (Jetrock) | AQC ; [Rockwool](https://www.rockwool.com/siteassets/rw-f/telechargements/fiches-produits/rockwool_fp_jetrock_2.pdf) |
| Repérage de hauteur | Piges visibles | max(4, ⌈S / 25⌉) piges | AQC : 4 pour 100 m² |
| Platelage d'accès | 60 cm de large maxi, 4 cm d'espace libre au-dessus de l'isolant tassé | hors périmètre (charpente) | AQC |
| Électricité | Étiquette « isolation en vrac » sur le tableau et repérage des boîtiers ; fiche de fin de chantier avec 3 étiquettes de sacs | 1 kit étiquettes | [Batirama DTU 45.11](https://www.batirama.com/article/62879-nf-dtu-45.11-isolation-thermique-de-combles-par-soufflage-d-isolant-en-vrac.html), Picbleu |
| Hygrométrie | Soufflage interdit si humidité absolue > 5 g/m³ | aucune ; alerte bloquante si le devis cite une pièce humide sous comble | [FFB calepin](https://www.ffbatiment.fr/techniques-batiment/amenagement-finitions/isolation-interieure/calepin/calepin-isolation-par-soufflage) |

**Consommables** (ratios **à vérifier**) : agrafes inox pour membrane, 1 boîte par 100 m² de membrane ; vis TTPC 25 pour plaques (si parement), 1 boîte de 1 000 par 60 m² ; masques P2/P3 obligatoires au soufflage (port P2 obligatoire selon la notice Comblissimo), 1 boîte par chantier ; sacs à déchets ou big bags en dépose, 1 big bag de 1 m³ par 5 m² de laine déposée de 20 cm.

## 10. Cas de test au format JSON

Six cas calculés à la main avec les règles de la section 5 ; ils deviennent `referentiels/isolation-combles/tests/`. Ils seront remplacés par des devis réels anonymisés dès que des poseurs en fournissent (section 13).

```json
[
  {"id": "comb-001", "source": "cas synthétique",
   "devis": "Isolation combles perdus par soufflage laine de verre Comblissimo R=7, 100 m²",
   "contexte": {"departement": "22", "neuf_renovation": "renovation"},
   "attendu": [
     {"article": "Comblissimo sac 17,3 kg", "quantite": 23, "unite": "sac", "tolerance_pct": 0},
     {"article": "pige de hauteur", "quantite": 4, "unite": "u", "tolerance_pct": 0},
     {"article": "rehausse de trappe", "quantite": 1, "unite": "u", "tolerance_pct": 0},
     {"article": "kit étiquettes et fiche fin de chantier", "quantite": 1, "unite": "u", "tolerance_pct": 0}],
   "questions_attendues": ["q_pare_vapeur", "q_spots", "q_conduit"], "questions_max": 4},
  {"id": "comb-002", "source": "cas synthétique",
   "devis": "Soufflage ouate de cellulose 40 cm R=8 sur 75 m² de plancher",
   "attendu": [
     {"article": "ouate de cellulose sac 10 kg", "quantite": 79, "unite": "sac", "affichage": "1 palette de 40 + 39 sacs", "tolerance_pct": 0},
     {"article": "pige de hauteur", "quantite": 4, "unite": "u", "tolerance_pct": 0}],
   "pieges": ["40 cm = épaisseur soufflée, pas tassée"]},
  {"id": "comb-003", "source": "cas synthétique",
   "devis": "Laine de roche soufflée Jetrock R=10, 120 m², avec coffrage conduit cheminée",
   "attendu": [
     {"article": "Jetrock 2 sac 20 kg", "quantite": 54, "unite": "sac", "affichage": "1 palette de 35 + 19 sacs", "tolerance_pct": 0},
     {"article": "pige de hauteur", "quantite": 5, "unite": "u", "tolerance_pct": 0},
     {"article": "coffrage conduit incombustible", "quantite": 1, "unite": "u", "tolerance_pct": 0},
     {"article": "déflecteur", "quantite": 0, "unite": "u", "commentaire": "système à grille"}]},
  {"id": "comb-004", "source": "cas synthétique",
   "devis": "Isolation combles perdus laine à dérouler IBR kraft 300 mm R 7,5 - 60 m²",
   "attendu": [
     {"article": "IBR Revêtu Kraft 300 mm 1,20x2,60", "quantite": 21, "unite": "rouleau", "tolerance_pct": 0},
     {"article": "pige de hauteur", "quantite": 0, "unite": "u", "commentaire": "pas de piges en déroulé"}]},
  {"id": "comb-005", "source": "cas synthétique",
   "devis": "Isolation rampants 70 m² Isoconfort 32 200 mm sous chevrons, suspentes Intégra, membrane Vario Xtra, hors plâtrerie",
   "attendu": [
     {"article": "Isoconfort 32 revêtu kraft 200 mm 1,20x2,20", "quantite": 28, "unite": "rouleau", "tolerance_pct": 0},
     {"article": "membrane Vario Xtra 1,50x40", "quantite": 2, "unite": "rouleau", "tolerance_pct": 0},
     {"article": "adhésif Vario KB1 40 m", "quantite": 2, "unite": "rouleau", "tolerance_pct": 50},
     {"article": "suspente Intégra 2 200-240", "quantite": 4, "unite": "boite 50", "tolerance_pct": 25},
     {"article": "fourrure F530 3,00 m", "quantite": 43, "unite": "barre", "tolerance_pct": 10},
     {"article": "éclisse", "quantite": 22, "unite": "u", "tolerance_pct": 30},
     {"article": "plaque BA13", "quantite": 0, "unite": "plaque", "commentaire": "hors plâtrerie"}],
   "questions_attendues": []},
  {"id": "comb-006", "source": "cas synthétique",
   "devis": "Soufflage laine de verre R7 64 m², plafond avec spots",
   "reponses_chat": {"q_spots": "Oui"},
   "attendu": [
     {"article": "Comblissimo sac 17,3 kg", "quantite": 15, "unite": "sac", "tolerance_pct": 0},
     {"article": "capot de spot A1", "quantite": 2, "unite": "paquet 4", "commentaire": "8 spots estimés", "tolerance_pct": 50},
     {"article": "pige de hauteur", "quantite": 4, "unite": "u", "tolerance_pct": 0}]}
]
```

Contrôles : comb-001 100 × 21,6 / 100 × 1,05 = 22,7 → 23 ; comb-002 75 × 100 / 100 × 1,05 = 78,8 → 79 ; comb-003 120 × 42,2 / 100 × 1,05 = 53,2 → 54 ; comb-005 adhésif 70 × 0,8 / 40 = 1,4 → 2 ; comb-006 64 × 21,6 / 100 × 1,05 = 14,5 → 15, spots ⌈64 / 8⌉ = 8.
