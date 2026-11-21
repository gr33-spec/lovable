# Référentiel quantitatif ISOLATION (Rappidos)

Oct 3, 2026 · @Greg

Ce tiroir couvre l'isolation thermique des combles, des murs (intérieur et extérieur) et des planchers bas ; il suit le gabarit de la section 27 du référentiel couverture et ne contient que des données, aucune logique. Tout chiffre sans source est marqué *à vérifier*.

## 1. Métier et axes de variation

L'isolateur pose un isolant (laine de verre, laine de roche, ouate de cellulose, fibre de bois, polystyrène) et, selon le devis, sa membrane d'étanchéité à l'air, son ossature et son parement. Le quantitatif dépend d'abord du **produit** et de la **résistance thermique R visée**, beaucoup moins de la région.

| Axe | Poids | Ce qu'il change dans le quantitatif |
| --- | --- | --- |
| neuf\_renovation | fort | dépose d'ancien isolant, murs anciens (pierre, pisé) où le PSE collé et le pare-vapeur fermé sont exclus, rehausses de trappe, capots de spots |
| epoque\_bati | fort | mur ancien perspirant → isolant biosourcé et frein-vapeur ; plancher bois de combles → membrane ; hauteur sous plafond variable |
| gamme | moyen | λ 30, 32, 35, 40 ou 46 : même R, épaisseur et nombre de sacs ou rouleaux différents |
| geographie | moyen | zone climatique H1/H2/H3 (R visé en neuf), zone de vent (chevilles d'ITE), bord de mer, isolant dominant local |
| type\_batiment | moyen | collectif et ERP : réaction au feu A1/A2 exigée, ITE laine de roche, sous-face de parking |

### metier.json

```json
{
  "code": "isolation",
  "nom": "Isolation thermique (intérieur / extérieur)",
  "version": "1.0.0",
  "normes": ["NF DTU 45.10", "NF DTU 45.11", "NF DTU 25.41", "NF DTU 25.42", "NF DTU 45.4", "CPT 3035", "e-Cahier CSTB 3815", "NF DTU 24.1"],
  "axes_de_variation": {
    "geographie": "moyen",
    "epoque_bati": "fort",
    "type_batiment": "moyen",
    "neuf_renovation": "fort",
    "gamme": "moyen"
  },
  "metiers_lies": ["platrerie", "couverture", "facade", "charpente"],
  "unites_de_commande": ["sac", "rouleau", "colis", "paquet", "plaque", "panneau", "barre", "boite", "cartouche", "palette"],
  "maturite": "alpha"
}
```

Frontière avec les autres tiroirs : les plaques de plâtre, l'ossature et les joints sont sortis ici **seulement** si le devis d'isolation les chiffre (doublage, rampants finis). Sinon ils appartiennent au tiroir plâtrerie. Le bardage d'ITE ventilée et l'isolation sarking renvoient aux tiroirs façade et couverture.

## 2. Règle d'or et unités de commande

Un isolant ne se commande jamais en m² : il se commande en **sacs** (vrac soufflé), **rouleaux** ou **colis/paquets** (laines, fibre de bois), **plaques** (doublages collés) ou **panneaux** (ITE, sous-face). Le m² et le kg/m² sont des grandeurs de calcul, jamais de sortie.

Chaque ligne de sortie porte : produit, épaisseur (mm), R (m²·K/W), dimensions de l'unité, quantité en unités de commande, et le nombre de colis ou palettes quand le fabricant vend par colis.

| Famille | Unité de commande | Contenu d'une unité (exemple sourcé) | Arrondi |
| --- | --- | --- | --- |
| Laine soufflée verre | sac | 17,3 kg Comblissimo, 36 sacs/palette | sac entier |
| Laine soufflée verre (Knauf) | sac | 16,6 kg Supafil Loft 045 | sac entier |
| Ouate de cellulose | sac | 10 / 12,5 / 14 kg Thermacell Cristal | sac entier |
| Laine en rouleau | rouleau | 1,20 m × longueur variable selon épaisseur | rouleau entier |
| Fibre de bois souple | paquet | panneaux 1220 × 575 mm, 2 à 10 par paquet selon épaisseur | paquet entier |
| Doublage collé | plaque | 1,20 × 2,50 à 3,00 m, piles de 9 ou 10 | plaque entière |
| Mortier adhésif / colle ITE | sac | 5, 10 ou 25 kg | sac entier |
| Membrane pare-vapeur | rouleau | 1,5 × 40 m = 60 m² (Stopvap) | rouleau entier |
| Adhésif membrane | rouleau | 40 m × 60 mm (Vario KB1), carton de 8 | rouleau entier |
| Mastic membrane | cartouche | 310 ml, carton de 12 | cartouche entière |
| Suspentes, appuis, pastilles | boîte | 50 pièces | boîte entière |
| Fourrures, lisses, rails, profilés | barre | longueur à vérifier (souvent 3 m) | barre entière |
| Chevilles d'ITE | boîte | 250 (PRB RPE isolant) | boîte entière |
| Treillis d'armature | rouleau | *à vérifier* (souvent 1 × 50 m) | rouleau entier |

Règle de conversion unique, appliquée à chaque ligne : quantité = arrondi\_sup( besoin × (1 + perte) / contenu\_unité ). Le passage à la palette est une **proposition** affichée, jamais imposée : l'artisan commande souvent au sac ou au rouleau.

Deux interdits propres au métier :

1. Ne jamais sortir « laine de verre 300 mm » sans produit ni R : la même épaisseur donne R 6,5 (λ 46) ou R 8,55 (λ 35).
2. Ne jamais convertir un R en sacs par une densité théorique : seul le tableau ACERMI du produit fait foi (masse minimale par m², épaisseur minimale à souffler, tassement inclus).

## 3. Ouvrages du métier, vocabulaire des devis et pièges

Neuf ouvrages couvrent l'essentiel des devis d'isolation ; chacun a sa mesure d'entrée et ses lignes de sortie.

| id | Ouvrage | Mesure d'entrée | Ce que l'app sort | Norme |
| --- | --- | --- | --- | --- |
| combles\_perdus\_souffle | Soufflage sur plancher de combles perdus | m² de plancher (au sol) + R | sacs + accessoires de soufflage | NF DTU 45.11 |
| combles\_perdus\_rouleau | Laine déroulée sur plancher, 1 ou 2 couches croisées | m² de plancher + R | rouleaux (par couche) | NF DTU 45.10 |
| rampants | Combles aménagés : isolant entre et/ou sous chevrons + membrane + ossature | m² rampant + R | rouleaux, membrane, adhésif, suspentes, fourrures, (plaques) | NF DTU 45.10, 25.41 |
| plafond\_sous\_plancher | Faux plafond isolé sous solives ou dalle | m² plafond + R | rouleaux, suspentes, fourrures, membrane, (plaques) | NF DTU 25.41 |
| iti\_ossature | Murs par l'intérieur sur ossature métallique (type Optima) | m² mur + R + hauteur | rouleaux, appuis, fourrures, lisses, membrane, (plaques) | NF DTU 25.41 |
| iti\_colle | Doublage collé (complexe isolant + plâtre) | m² mur + R + hauteur | plaques de doublage, sacs de mortier adhésif, joints | NF DTU 25.42 |
| ite\_enduit | ITE sous enduit (PSE, laine de roche, fibre de bois) | m² façade + épaisseur + baies | panneaux, sacs de colle et sous-enduit, treillis, chevilles, profilés, finition | CPT 3035 + DTA |
| ite\_bardage | ITE sous bardage ventilé (isolant + pare-pluie) | m² façade + épaisseur | panneaux ou rouleaux, pare-pluie, chevilles étoile | NF DTU 45.4 |
| sous\_face\_plancher\_bas | Panneaux chevillés sous dalle de cave, garage, vide sanitaire | m² + R | panneaux, chevilles | Avis techniques |

Ouvrages repérés mais renvoyés : sarking (tiroir couverture), insufflation de murs et caissons (ouate, sous Avis technique : *à compléter*), isolation de toiture-terrasse (tiroir étanchéité).

### vocabulaire.json (extrait)

```json
{
  "combles_perdus_souffle": {
    "expressions": ["soufflage", "laine soufflée", "laine à souffler", "combles perdus", "isolation grenier", "ouate soufflée", "vrac", "Comblissimo", "Supafil", "Jetrock", "OC"],
    "exclusions": ["insufflation", "rampant", "sous chevrons"],
    "extrait": { "R": "R\\s?[=≥]?\\s?(\\d+[,.]?\\d*)", "epaisseur_mm": "(\\d{2,3})\\s?(mm|cm)" }
  },
  "rampants": {
    "expressions": ["rampants", "combles aménagés", "sous chevrons", "entre chevrons", "sous toiture", "suspentes", "Intégra", "Isoconfort", "2 couches"],
    "exclusions": ["sarking", "par l'extérieur"]
  },
  "iti_colle": {
    "expressions": ["doublage collé", "complexe de doublage", "Doublissimo", "Placomur", "Calibel", "10+80", "13+100", "13+120", "PSE + BA13"],
    "extrait": { "composition": "(10|13)\\s?\\+\\s?(\\d{2,3})" }
  },
  "iti_ossature": {
    "expressions": ["Optima", "GR32", "GR 32", "doublage sur ossature", "contre-cloison", "laine + rail", "Placostil", "appuis"]
  },
  "ite_enduit": {
    "expressions": ["ITE", "isolation extérieure", "isolation par l'extérieur", "sous enduit", "ETICS", "PSE graphité", "calé-chevillé", "collé", "weber.therm", "Parex", "Sto"],
    "exclusions": ["bardage", "clin", "vêture"]
  },
  "sous_face_plancher_bas": {
    "expressions": ["plafond de cave", "sous-sol", "vide sanitaire", "plancher bas", "sous dalle", "garage", "Fibraroc", "Fibrastyroc"]
  }
}
```

### Pièges de lecture des devis

- **R sans produit** (« R = 7 ») : retrouver le produit par le vocabulaire ou poser la question isolant (section 7) ; ne jamais choisir un produit au hasard.
- **Épaisseur sans R** (« 300 mm laine de verre ») : prendre le λ du produit nommé ; sans produit, R inconnu → question.
- **Notation « 13+100 »** : plaque 13 mm + isolant 100 mm. « 10+80 » = ancienne plaque de 10 mm.
- **Deux couches** (« 100 + 200 », « croisées ») : deux lignes de rouleaux distinctes, jamais une épaisseur cumulée.
- **Surface des combles perdus** : c'est la surface du plancher, pas celle du toit. Si le devis donne une surface de toiture, l'app le signale et demande confirmation.
- **Surface déduite ou brute** : l'app prend la surface du devis telle quelle (le métré est l'affaire de l'artisan) ; elle affiche l'hypothèse « baies non déduites » si le devis compte des fenêtres à part.
- **Dépose de l'ancien isolant**, échafaudage, nettoyage, évacuation : aucune matière à commander, conservés pour l'annexe fournisseur sans prix.
- **« Pare-vapeur » ou « frein-vapeur » ou « membrane hygrovariable » ou « Vario »** : même ligne membrane ; le produit exact vient du devis, sinon défaut section 6.
- **PSE « gris » ou « graphité »** en ITE : toujours au moins 2 chevilles par panneau, même collé.
- **Marques citées** (Isover, Knauf, Rockwool, Placo, Weber, Soprema, Steico) : garder la marque du devis ; si l'artisan dit « équivalent », le moteur garde les quantités du produit de référence et le note.

## 4. Matériaux : fiches fabricant sourcées

Les tableaux ci-dessous sont transcrits des fiches fabricant ou des certificats ACERMI ; les colonnes « m²/unité » sont calculées (longueur × largeur) et vérifiables. Une valeur non sourcée porte la mention *à vérifier*.

### 4.1 Laine de verre à souffler Isover Comblissimo (combles perdus)

Sac de 17,3 kg, 36 sacs par palette, λ 0,046, réf. 84679, DTU 45.11 ([fiche 2026](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_423944.pdf)). Tableau de consommation issu du tableau ACERMI ([brochure Isover](https://www.isover.fr/sites/isover.fr/files/assets/documents/les_solutions_isover_en_combles_perdus_pour_la_rt2012_et_rt2020.pdf)).

| R (m²·K/W) | Épaisseur mini (mm) | kg/m² | Sacs mini pour 100 m² |
| --- | --- | --- | --- |
| 5 | 235 | 2,7 | 15,4 |
| 6 | 280 | 3,3 | 18,5 |
| 7 | 330 | 3,8 | 21,6 |
| 7,5 | 350 | 4,1 | 23,1 |
| 8 | 375 | 4,3 | 24,7 |
| 8,5 | 395 | 4,6 | 26,2 |
| 9 | 420 | 4,9 | 27,8 |
| 9,5 | 445 | 5,1 | 29,3 |
| 10 | 465 | 5,4 | 30,8 |
| 11 | 515 | 5,9 | 33,9 |
| 12 | 560 | 6,5 | 37,0 |
| 13 | 605 | 7,0 | 40,1 |
| 14 | 655 | 7,5 | 43,2 |

*À vérifier* : le tableau date de l'ancien Avis technique 20/10-195 ; la fiche 2026 cite le DTA 20/19-415\_V2 et R 10 en 465 mm (identique). Consulter le certificat ACERMI 07/D/18/474 en vigueur.

### 4.2 Laine de verre à souffler Knauf Supafil Loft 045

Sac de 16,6 kg, λ 0,045, certificat [ACERMI 04/D/016/378/27](https://acermi.com/en/certified-insulation-products/certificate/04-d-016-378-27/) (avril 2026).

| R | Épaisseur mini (mm) | Après tassement (mm) | kg/m² | Sacs pour 100 m² |
| --- | --- | --- | --- | --- |
| 5 | 230 | 225 | 2,8 | 16,4 |
| 6 | 275 | 270 | 3,3 | 19,7 |
| 6,5 | 300 | 293 | 3,6 | 21,4 |
| 7 | 320 | 315 | 3,9 | 23,0 |
| 7,5 | 345 | 338 | 4,1 | 24,6 |
| 8 | 365 | 360 | 4,4 | 26,3 |
| 8,5 | 390 | 383 | 4,7 | 27,9 |

R 9 et au-delà : lignes tronquées dans la source consultée, *à compléter* depuis le certificat.

### 4.3 Ouate de cellulose Soprema Thermacell Cristal

Sacs de 10, 12,5 (stock) ou 14 kg ; λ 0,040 ; masse volumique 20 à 30 kg/m³ ; tassement SH 20 ; ACERMI 22/D/141/1569 ([fiche INSFR0303-3/b](https://media.castorama.fr/is/content/Castorama/3434551887778_FPD_FR_CFpdf)).

| R | Épaisseur à souffler (mm) | Après tassement (mm) | Sacs 10 kg /100 m² | Sacs 12,5 kg /100 m² | Sacs 14 kg /100 m² |
| --- | --- | --- | --- | --- | --- |
| 5 | 250 | 200 | 50 | 40 | 36 |
| 6 | 300 | 240 | 60 | 48 | 43 |
| 6,5 | 325 | 260 | 65 | 52 | 47 |
| 7 | 350 | 280 | 70 | 56 | 50 |
| 7,5 | 375 | 300 | 75 | 60 | 54 |
| 8 | 400 | 320 | 80 | 64 | 58 |
| 9 | 450 | 360 | 90 | 72 | 65 |
| 10 | 500 | 400 | 100 | 80 | 72 |
| 12 | 600 | 480 | 120 | 96 | 86 |

La ouate consomme environ deux fois plus de kilos que la laine de verre pour le même R (7 kg/m² contre 3,8 kg/m² à R 7) : se tromper d'isolant fausse le nombre de sacs du simple au double. Autres ouates (Igloo Ouattitude, sac 10 kg, 40 sacs/palette, ACERMI 17/D/153/1211 ; Soprema UniverCell, 12,5 kg, 30 sacs/palette) : tableaux propres *à saisir*.

### 4.4 Rouleaux pour combles perdus : Isover IBR revêtu kraft

Largeur 1,20 m ; source brochure Isover 2013, *à vérifier* sur la fiche en vigueur.

| R | Épaisseur (mm) | Longueur (m) | m²/rouleau | Rouleaux/palette |
| --- | --- | --- | --- | --- |
| 10 | 400 | 2,00 | 2,40 | 24 |
| 8 | 320 | 2,40 | 2,88 | 24 |
| 7,5 | 300 | 2,60 | 3,12 | 24 |
| 6,5 | 260 | 3,00 | 3,60 | 24 |
| 6 | 240 | 3,50 | 4,20 | 30 |
| 5 | 200 | 4,50 | 5,40 | 36 |
| 4 | 160 | 5,50 | 6,60 | 36 |
| 3 | 120 | 7,00 | 8,40 | 36 |
| 2,5 | 100 | 8,00 | 9,60 | 36 |

### 4.5 Rouleaux pour rampants : Isover Isoconfort 35

λ 0,035, largeur 1,20 m. Revêtu kraft ([fiche 05/01/26](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1554173.pdf)) et nu pour la couche entre chevrons ([fiche 24/03/26](https://www.placo.fr/documents/fiche-technique/fichetechnique-isoconfort-35-nu.pdf)).

| Version | Épaisseur (mm) | R | Longueur (m) | m²/rouleau | Rouleaux/palette |
| --- | --- | --- | --- | --- | --- |
| Nu | 60 | 1,70 | 10,0 | 12,00 | 30 |
| Nu | 80 | 2,25 | 7,0 | 8,40 | 30 |
| Nu | 100 | 2,85 | 5,5 | 6,60 | 30 |
| Nu | 120 | 3,40 | 4,7 | 5,64 | 30 |
| Nu | 140 | 4,00 | 4,0 | 4,80 | 30 |
| Kraft | 160 | 4,55 | 3,7 | 4,44 | 30 |
| Kraft | 180 | 5,10 | 3,3 | 3,96 | 30 |
| Kraft | 200 | 5,70 | 3,0 | 3,60 | 30 |
| Kraft | 220 | 6,25 | 2,8 | 3,36 | 24 |
| Kraft | 240 | 6,85 | 2,6 | 3,12 | 24 |
| Kraft | 260 | 7,40 | 2,4 | 2,88 | 24 |
| Kraft | 280 | 8,00 | 2,0 | 2,40 | 24 |
| Kraft | 300 | 8,55 | 2,0 | 2,40 | 24 |

Isoconfort 35 Xtra (membrane intégrée) : 200 mm R 5,7 (3,60 m²), 220 mm R 6,25 (3,36 m²), 240 mm R 6,85 (3,12 m²) ([fiche](https://www.isover.fr/download-documents/fiche-technique/fichetechnique-isoconfort-35-xtra.pdf)).

### 4.6 Rouleaux pour murs : Isover GR 32 roulé revêtu kraft

λ 0,032, largeur 1,20 m, 1 rouleau par colis ([fiche 24/04/26](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_79476.pdf)).

| Épaisseur (mm) | R | Longueur (m) | m²/rouleau | Rouleaux/palette |
| --- | --- | --- | --- | --- |
| 60 | 1,85 | 8,1 | 9,72 | 12 |
| 75 | 2,35 | 8,1 | 9,72 | 12 |
| 85 | 2,65 | 5,4 | 6,48 | 12 |
| 100 | 3,15 | 2,7 | 3,24 | 30 |
| 120 | 3,75 | 2,7 | 3,24 | 30 |
| 140 | 4,35 | 2,7 | 3,24 | 24 |
| 160 | 5,00 | 2,7 | 3,24 | 24 |

### 4.7 Fibre de bois souple : STEICOflex 036

Panneaux 1220 × 575 mm (0,7015 m²), λ 0,036 ([fiche Steico](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1217262.pdf)). R calculé = épaisseur / λ arrondi à 0,05 inférieur, *à vérifier* sur le certificat.

| Épaisseur (mm) | R calculé | Panneaux/paquet | m²/paquet | Paquets/palette | kg/m² |
| --- | --- | --- | --- | --- | --- |
| 40 | 1,10 | 10 | 7,02 | 12 | 2,40 |
| 60 | 1,65 | 8 | 5,61 | 10 | 3,60 |
| 80 | 2,20 | 6 | 4,21 | 10 | 4,80 |
| 100 | 2,75 | 4 | 2,81 | 12 | 6,00 |
| 120 | 3,30 | 4 | 2,81 | 10 | 7,20 |
| 140 | 3,85 | 4 | 2,81 | 8 | 8,40 |
| 160 | 4,40 | 3 | 2,10 | 10 | 9,60 |
| 200 | 5,55 | 2 | 1,40 | 12 | 12,00 |
| 240 | 6,65 | 2 | 1,40 | 10 | 14,40 |

### 4.8 Doublages collés Placo Doublissimo

Largeur 1,20 m ; longueurs 2,50 / 2,60 / 2,70 / 2,80 / 3,00 m ; vendus à la plaque, piles de 10 (13+100) ou 9 (13+120). Fiches Placo 2025 ([3.15](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_428062.pdf), [3.40](https://medias.bigmat.fr/data_medias/medias_finaux/documents/3496250171862-sNIW9OoXd8.pdf), [3.80](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_903980.pdf)).

| Produit | λ | R | Plaques/pile | Poids plaque 2,50 m (kg) | m²/plaque 2,50 / 2,60 / 2,70 |
| --- | --- | --- | --- | --- | --- |
| Doublissimo 3.15 13+100 | 0,032 | 3,15 | 10 | 30,84 | 3,00 / 3,12 / 3,24 |
| Doublissimo 3.40 13+100 | 0,030 | 3,40 | 10 | 31,89 | 3,00 / 3,12 / 3,24 |
| Doublissimo 3.80 13+120 | 0,032 | 3,80 | 9 | 31,59 | 3,00 / 3,12 / 3,24 |
| Doublissimo Performance 4.10 13+120 | 0,030 | 4,10 | 9 | *à vérifier* | 3,00 / 3,12 / 3,24 |

Versions PV (pare-vapeur alu) : mêmes formats. Aides en rénovation : R ≥ 3,7 exigé pour les murs, donc 13+100 ne suffit pas (voir section 6).

### 4.9 Mortiers et colles

| Produit | Usage | Conditionnement | Consommation (fabricant) | Source |
| --- | --- | --- | --- | --- |
| Placo MAP Formule+ | collage des doublages | sacs 5 kg (36 ou 168/pal), 10 kg (40/pal), 25 kg (35 ou 63/pal) | 2 à 3 kg/m² (FDES Doublissimo : 1,8 kg/m²) | [fiche 25 kg](https://medias.bigmat.fr/data_medias/medias_finaux/documents/3496250198821-XFYvn3ucwY.pdf) |
| weber.therm collage | collage/calage ITE | sac 25 kg, 48 sacs/palette | 2,5 à 3,5 kg/m² | [fiche Weber](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_573228.pdf) |
| weber.therm XM | collage, calage et sous-enduit ITE | sac 25 kg, 48 sacs/palette | collage 2,5 à 4,5 kg/m² ; sous-enduit 7,5 kg/m² (5 mm) | [fiche Weber](https://medias.bigmat.fr/data_medias/medias_finaux/documents/3388751454929-Dh29Mik8p3.pdf) |

### 4.10 Membranes, adhésifs et pièces d'ossature Isover

| Article | Conditionnement | Source |
| --- | --- | --- |
| Membrane Stopvap (réf. 85671) | rouleau 1,5 × 40 m = 60 m² | [brochure Isover](https://www.isover.fr/sites/isover.fr/files/assets/documents/les_solutions_isover_en_combles_perdus_pour_la_rt2012_et_rt2020.pdf) |
| Membrane Vario Xtra | *à vérifier* (60 m² supposés) | — |
| Adhésif Vario KB1 (réf. 72432) | rouleau 40 m × 60 mm, carton de 8 | idem |
| Joint ruban Vario Protape | rouleau 10 m × 40 mm, lot de 5 | idem |
| Mastic Vario DS | cartouche 310 ml, carton de 12 | idem |
| Suspente Intégra 2 (12-16, 16-20, réglable 200-300) | boîte de 50 ; 2 à 3 par m² ; fourrures de 45 mm à 40-60 cm | [fiche réglable](https://www.isover.fr/documents/fiche-technique/fichetechnique-suspente-intgra-2-rglable.pdf) |
| Appui Optima2 75 / 100 / 120 / 140 | boîte de 50 | [fiche Optima2](https://documentacion.generadordeprecios.info/documentaciontecnica/isover-fr/isover4_optima2.pdf) |
| Fourrure Optima 240, fourrure télescopique, lisse Clip'Optima | longueur de barre *à vérifier* | — |

### 4.11 ITE : panneaux et chevilles

- Panneaux PSE d'ITE : format courant 1200 × 600 mm (0,72 m²), cohérent avec le plan de chevillage Knauf (5 chevilles par panneau = 6,9 par m²). Colisage par épaisseur *à vérifier* par fabricant.
- Weber.therm XM ultra 22 (mousse résolique) : panneaux 1200 × 400 mm, 4 à 6 chevilles par panneau ([Batiproduits](https://www.batiproduits.com/fiche/produits/systeme-d-ite-cale-cheville-weber-therm-xm-ul-p68901973.html)).
- Chevilles à frapper PRB RPE Isolant : longueurs 60 à 180 mm de 20 en 20, boîte de 250, foret 10 mm ([fiche PRB](https://pim.prb.fr/PRB/Fiches%20Techniques/fr/ft_prb_cheville_rpe_isolant_fr_03_2017.pdf)).
- Treillis de verre : maille 4,5 × 4,5 mm (courant), treillis renforcé en partie basse ; rouleau *à vérifier*.

### 4.12 Sous-face de plancher bas

Knauf Fibraroc 35 FM/Typ2 (laine de roche + parement laine de bois) : panneaux 2000 × 600 mm = 1,20 m², épaisseurs 50 à 325 mm, R jusqu'à 10 ([Knauf](https://knauf.com/fr-FR/p/produit/fibraroc-35-fm-typ2-23334_4091)). Nombre de chevilles par panneau et R par épaisseur : *à saisir* depuis la fiche technique juin 2026.

### materiaux.json (extrait)

```json
{
  "materiaux": [
    {
      "id": "comblissimo_17_3",
      "libelle": "Laine de verre à souffler Isover Comblissimo",
      "famille": "vrac_laine_verre",
      "unite_commande": "sac",
      "conditionnements": [{"libelle": "sac", "quantite": 1, "kg": 17.3}, {"libelle": "palette", "quantite": 36}],
      "params": {"lambda": 0.046, "table_acermi": "comblissimo_r_sacs"},
      "dtu": "45.11"
    },
    {
      "id": "isoconfort35_kraft_220",
      "libelle": "Isover Isoconfort 35 revêtu kraft 220 mm R 6,25",
      "famille": "rouleau_laine_verre",
      "unite_commande": "rouleau",
      "conditionnements": [{"libelle": "rouleau", "quantite": 1, "m2": 3.36}, {"libelle": "palette", "quantite": 24}],
      "params": {"epaisseur_mm": 220, "R": 6.25, "largeur_m": 1.2, "longueur_m": 2.8},
      "dtu": "45.10"
    },
    {
      "id": "doublissimo_380_13_120_250",
      "libelle": "Placo Doublissimo 3.80 13+120 1,20 x 2,50",
      "famille": "doublage_colle",
      "unite_commande": "plaque",
      "conditionnements": [{"libelle": "plaque", "quantite": 1, "m2": 3.0}, {"libelle": "pile", "quantite": 9}],
      "params": {"R": 3.8, "longueur_m": 2.5, "poids_kg": 31.59},
      "dtu": "25.42"
    }
  ]
}
```

Règle héritée de la couverture : le conditionnement de `materiaux.json` vient d'une fiche négoce quand elle existe, car c'est le négoce qui livre.

## 5. Règles de calcul DTU, formules et pertes

Toutes les règles sont des fonctions pures : surface du devis + R (ou épaisseur) + défauts → lignes en unités de commande. Les tables viennent de `materiaux.json`, jamais du code.

### 5.1 Vrac soufflé (combles perdus, NF DTU 45.11)

```latex
\text{sacs} = \left\lceil S \times \frac{N_{100}(R)}{100} \times (1 + p) \right\rceil
```

N₁₀₀(R) = « sacs minimum pour 100 m² » du tableau ACERMI du produit (section 4), interpolé linéairement entre deux lignes, jamais extrapolé hors table. p = perte de soufflage, défaut 5 % *à vérifier*. Le tableau intègre déjà le tassement : ne rien ajouter pour lui.

Contrôle affiché : épaisseur minimale à souffler et kg/m² de la même ligne (« 330 mm, 3,8 kg/m² »), car c'est ce que l'artisan vérifie aux piges.

Si le devis donne une épaisseur et pas de R : prendre la plus grande ligne dont l'épaisseur minimale est inférieure ou égale à celle du devis, et afficher le R obtenu.

### 5.2 Rouleaux et panneaux (combles, rampants, murs)

```latex
\text{unit\'es} = \left\lceil \frac{S \times n_{couches} \times (1 + p)}{m^2_{unit\'e}} \right\rceil
```

p = 5 % (Isover : 1,05 m² d'isolant par m² d'ouvrage et par couche, éphémérides combles aménagés et murs). Une ligne par couche quand les épaisseurs diffèrent.

Choix de l'épaisseur si seul R est donné : la plus petite référence de la gamme dont R ≥ R visé. Deux couches seulement si le devis le dit, ou si aucune référence d'une couche n'atteint le R (combles perdus en rouleaux : 2 couches croisées).

### 5.3 Ratios au m² des systèmes Isover (rampants et murs)

Ratios fabricant pour 1 m² d'ouvrage, à appliquer seulement aux lignes que le devis inclut (isolant seul, ou isolant + étanchéité à l'air, ou système complet avec plâtre).

| Article | Rampants / combles aménagés | Murs (Optima) | Unité de commande |
| --- | --- | --- | --- |
| Isolant | 1,05 m² par couche | 1,05 m² par couche | rouleau |
| Membrane (Vario Xtra) | 1,10 m² | 1,10 m² | rouleau |
| Adhésif Vario | 0,80 à 1,40 ml (défaut 1,10) | *à vérifier* (défaut 1,10) | rouleau 40 m |
| Mastic Vario DoubleFit | *à vérifier* | 17 ml | cartouche 310 ml |
| Suspentes Intégra 2 | 2 à 3 (défaut 2,5) | — | boîte 50 |
| Appuis Optima2 + pastilles | — | 1 + 1 | boîte 50 |
| Fourrure Optima 240 | 2 ml | 1 unité | barre |
| Fourrure télescopique | — | 1 unité | barre |
| Lisse Clip'Optima | au sol en pied-droit | 0,9 ml | barre |
| Connector Optima2 | aux fenêtres | 4 à 6 par huisserie | boîte |
| Vis et chevilles (fourrures horizontales) | 3 | 3 | boîte |
| Plaque de plâtre BA13 | 1,05 m² | 1,05 m² | plaque |
| Vis TTPC 25 | 15 | 12 | boîte |
| Bande à joint | 1,4 ml | 1,4 ml | rouleau |
| Enduit à joint | 0,35 kg | 0,35 kg | sac |

Sources : [éphéméride combles aménagés](https://www.isover.fr/documents/brochure-produit/ephemeride-isover-isolant-combles-amenages.pdf), [éphéméride murs Optima](https://media.castorama.fr/is/content/Castorama/3596265231251_int_frpdf). Suspentes en quinconce tous les 120 cm sur un même chevron, chevrons à 60 cm maximum ; appuis Optima2 tous les 60 cm sur une fourrure horizontale à 1,35 m du sol maximum.

L'« unité » de fourrure par m² de mur Isover est généreuse (un mur de 2,50 m avec montants à 60 cm demande 0,67 montant par m²) : garder le ratio fabricant tant qu'un plaquiste ne l'a pas validé (section 11).

### 5.4 Doublage collé (NF DTU 25.42)

- Longueur de plaque = plus petite longueur du catalogue ≥ hauteur sous plafond − 1 cm (2,50 / 2,60 / 2,70 / 2,80 / 3,00 m).
- Plaques = arrondi\_sup( S × 1,05 / (1,20 × longueur) ).
- Mortier adhésif = S × 2,5 kg/m² (fabricant 2 à 3) → sacs de 25 kg par défaut ; collage par plots de 10 cm, environ 10 plots par m².
- Joints : bande 1,4 ml/m² et enduit 0,35 kg/m² (ratios Isover reportés, *à vérifier* pour Placo).

### 5.5 ITE sous enduit (CPT 3035 + DTA du système)

- Panneaux = arrondi\_sup( S × (1 + p) / m²\_panneau ), panneau 1200 × 600 = 0,72 m², p = 7 % *à vérifier* (coupes en tableau de baies et angles harpés).
- Colle : collage ou calage 3 kg/m² (weber.therm collage 2,5 à 3,5) → sacs 25 kg.
- Sous-enduit armé : 7,5 kg/m² (weber.therm XM, 5 mm) → sacs 25 kg.
- Treillis courant : S × 1,10 (recouvrement 10 cm) ; treillis renforcé sur 2 m de haut en pied de façade accessible ; mouchoirs 30 × 30 cm aux angles de baies (4 par baie, *à vérifier*).
- Chevilles par m² selon la zone de chevillage (plan Knauf, base CPT 1998, *à vérifier* avec le CPT 3035 V4 et les Eurocodes) : zone 1 → 5 par panneau (6,9/m²) ; zone 2 → 6 (8,3/m²) ; zone 3 → 7 (9,7/m²) ; zone 4 → 8 (11,1/m²) ([plan Knauf ITEx](https://www.cmesmat.fr/media/catalog/product/attributes/1/q/1qPrbnnE38AFqFJdT3fPxzT3hC+PdwdBXlWeWVQepyohuOhW8MzYCIKuhIIlP0LBT7aX4RoelFWmVx9OEEZpCvHiHgvT+iy_NQ6YcpNj9Kw=.pdf)).
- Pose collée : PSE gris → 2 chevilles par panneau obligatoires (2,8/m²) ; CPT 3035 V4 (prévu juin 2026) : 12 plots de colle par m² minimum et fin du collage par plots sans chevilles pour le PSE blanc ([FFB](https://www.ffbatiment.fr/actualites-batiment/actualite-bam/isolation-thermique-exterieure-enduit-isolant-regles-art-evoluent)).
- Longueur de cheville ≥ épaisseur d'isolant + colle (10 mm) + ancrage, *à vérifier* selon l'ATE de la cheville et le support.
- Rail de départ = ml de pied de façade × 1,05 ; profilés d'angle = ml d'angles saillants + tableaux de baies ; bande de désolidarisation = périmètre des baies et points durs.

### 5.6 Sous-face de plancher bas

Panneaux = arrondi\_sup( S × 1,05 / m²\_panneau ) ; chevilles = 5 par panneau de 1200 × 600 (essai feu cité par la [préfecture de l'Eure](https://www.eure.gouv.fr/contenu/telechargement/47700/351686/file/Annexe%208%20-%20R%C3%A9sistance%20au%20feu%20des%20locaux.pdf)), nombre pour les panneaux 2000 × 600 *à vérifier* sur la notice Knauf.

### regles.json (extrait)

```json
{
  "regles": [
    {
      "id": "vrac_souffle",
      "declencheur": {"ouvrage": "combles_perdus_souffle", "mesure": "surface_plancher_m2"},
      "entrees": ["R_vise", "produit_vrac"],
      "etapes": [
        "ligne = table_acermi(produit_vrac).interpoler(R_vise)",
        "q_theorique = surface_plancher_m2 * ligne.sacs_100m2 / 100",
        "q_commande = ceil(q_theorique * (1 + perte_souffle))"
      ],
      "sorties": [{"materiau": "@produit_vrac", "quantite": "q_commande", "unite": "sac"}],
      "hypotheses_a_afficher": ["R_vise", "ligne.epaisseur_mini_mm", "ligne.kg_m2", "perte_souffle"]
    },
    {
      "id": "rouleaux",
      "declencheur": {"ouvrage": ["combles_perdus_rouleau", "rampants", "iti_ossature", "plafond_sous_plancher"], "mesure": "surface_m2"},
      "entrees": ["couches"],
      "etapes": [
        "for c in couches: ref = gamme(c.produit).plus_petit_R_superieur_ou_egal(c.R) ; q = ceil(surface_m2 * (1 + perte_rouleau) / ref.m2_unite)"
      ],
      "sorties": [{"materiau": "@ref", "quantite": "q", "unite": "rouleau"}],
      "hypotheses_a_afficher": ["ref.epaisseur_mm", "ref.R", "perte_rouleau"]
    },
    {
      "id": "ite_chevilles",
      "declencheur": {"ouvrage": "ite_enduit", "mesure": "surface_facade_m2"},
      "entrees": ["mode_pose", "zone_chevillage", "isolant"],
      "etapes": [
        "par_m2 = {1: 6.9, 2: 8.3, 3: 9.7, 4: 11.1}[zone_chevillage] if mode_pose == 'cale_cheville' else 2 / m2_panneau",
        "q_commande = ceil_conditionnement(surface_facade_m2 * par_m2 * 1.05, boite)"
      ],
      "sorties": [{"materiau": "cheville_ite_@longueur", "quantite": "q_commande", "unite": "boite"}],
      "hypotheses_a_afficher": ["mode_pose", "zone_chevillage", "par_m2"]
    }
  ]
}
```

## 6. Valeurs par défaut et hypothèses à afficher

En rénovation, le R par défaut est le seuil exigé pour les aides (CEE et MaPrimeRénov'), car l'artisan RGE chiffre presque toujours à ce niveau : R ≥ 7 combles perdus, R ≥ 6 rampants, R ≥ 3,7 murs, R ≥ 3 planchers bas ([Isover, antisèche aides](https://www.isover.fr/documents/renovation-et-aide-financiere/isover-antiseches-renovation-energetique-2.pdf)). Chaque défaut utilisé s'affiche sur la carte quantitatif et se corrige d'un tap.

| Clé | Défaut | Varie selon | Affichage |
| --- | --- | --- | --- |
| R\_combles\_perdus | 7 | neuf → 8 (zone H1 : 10, *à vérifier*) | « R 7 visé (seuil aides) » |
| R\_rampants | 6 | neuf → 8 | « R 6 visé » |
| R\_murs\_iti | 3,7 | neuf → 4 | « R 3,7 visé » |
| R\_murs\_ite | 3,7 | neuf → 4,5 *à vérifier* | « R 3,7 visé » |
| R\_plancher\_bas | 3 | — | « R 3 visé » |
| produit\_vrac | laine de verre (Comblissimo) | département → isolant dominant (section 8) | « Laine de verre soufflée » |
| perte\_souffle | 5 % | — | « +5 % de soufflage » |
| perte\_rouleau | 5 % | rénovation charpente irrégulière → 8 % *à vérifier* | « +5 % de coupes » |
| perte\_ite\_panneau | 7 % | > 1 baie / 10 m² → 10 % *à vérifier* | « +7 % de coupes » |
| hauteur\_sous\_plafond\_m | 2,50 | époque ancienne → question | « Plaques de 2,50 m » |
| membrane\_rampants | oui (Vario Xtra) | devis sans membrane et écran HPV → question | « Membrane comptée » |
| membrane\_combles\_perdus\_souffle | non | plancher bois ou lambris → *à vérifier* e-Cahier 3815 | « Pas de pare-vapeur » |
| parement\_inclus | selon devis | — | « Plaques comptées » ou « Isolant seul » |
| mode\_pose\_ite | calé-chevillé | support neuf béton/parpaing → collé | « Calé-chevillé » |
| zone\_chevillage | depuis commun/departements.json (zone\_vent) | hauteur > 10 m → +1 zone *à vérifier* | « Zone de chevillage 2 » |
| mortier\_doublage\_kg\_m2 | 2,5 | support irrégulier → 3 | « 2,5 kg/m² de MAP » |
| sac\_colle\_kg | 25 | petit chantier < 10 m² → 10 kg | « Sacs de 25 kg » |
| suspentes\_m2 | 2,5 | — | « 2,5 suspentes/m² » |

### defauts.json (extrait)

```json
{
  "R_combles_perdus": {
    "valeur": 7,
    "variations": [
      { "si": { "neuf_renovation": "neuf" }, "valeur": 8 },
      { "si": { "neuf_renovation": "neuf", "geographie.zone_re2020": "H1*" }, "valeur": 10 }
    ],
    "afficher": "R {valeur} visé"
  },
  "produit_vrac": {
    "valeur": "comblissimo_17_3",
    "variations": [ { "si": { "artisan.habitude_vrac": "*" }, "valeur": "@artisan.habitude_vrac" } ],
    "afficher": "{libelle}"
  },
  "perte_souffle": { "valeur": 0.05, "afficher": "+{valeur_pct} % de soufflage" },
  "hauteur_sous_plafond_m": { "valeur": 2.5, "afficher": "Plaques de {valeur} m" }
}
```

Apprentissage par artisan (section 23 du référentiel couverture) : l'isolant soufflé, la marque de membrane et la longueur de plaque habituelles d'un artisan deviennent ses défauts après deux chantiers identiques.

## 7. Questions à poser et sensibilité

Quatre questions suffisent pour ce métier, toutes à boutons, aucune sur une quantité ; le moteur ne pose que celles dont la réponse manque au devis et dont la sensibilité dépasse 5 %, par priorité. La sensibilité est l'écart sur les lignes concernées si le défaut est faux.

| Priorité | id | Question affichée | Boutons | Posée si | Sensibilité |
| --- | --- | --- | --- | --- | --- |
| 0 | isolant | « Quel isolant ? » | Laine de verre · Laine de roche · Ouate · Fibre de bois · Polystyrène | produit non identifiable dans le devis | 100 % et plus (ouate R 7 = 56 sacs/100 m², laine de verre = 21,6) |
| 1 | R | « Quelle performance ? » | R 6 · R 7 · R 8 · R 10 (combles) / R 3,7 · R 4 · R 5 (murs) | ni R ni épaisseur dans le devis | ±14 % par cran (Comblissimo R 6 / 7 / 8 = 18,5 / 21,6 / 24,7 sacs) |
| 2 | parement | « Tu poses aussi les plaques de plâtre ? » | Oui · Non | rampants ou murs sur ossature sans mention claire du parement | 100 % sur plaques, vis, bandes, enduit |
| 3 | hauteur | « Hauteur sous plafond ? » | 2,50 · 2,60 · 2,70 · 2,80 · Plus | doublage collé ou murs sur ossature, hauteur absente | bloquant : une plaque trop courte est inutilisable |
| 4 | pose\_ite | « Panneaux collés ou chevillés ? » | Collés · Calés-chevillés | ITE, mode de pose absent | ×3 sur les chevilles (2,8 contre 8,3/m²) |
| 5 | membrane | « Membrane pare-vapeur à prévoir ? » | Oui · Non | rampants ou murs, devis muet | 100 % sur membrane, adhésif, mastic |
| 6 | baies | « Combien de fenêtres sur ces murs ? » | 0-2 · 3-5 · 6-10 · Plus de 10 | ITE ou ITI, baies absentes du devis | environ 10 % (profilés, mouchoirs, connectors) |

Une question tient sur une ligne, se répond d'un pouce, et propose toujours le défaut pré-sélectionné. Les questions 4 à 6 ne passent devant les autres que si l'ouvrage correspondant est le seul du devis.

### questions.json (extrait)

```json
[
  {
    "id": "isolant",
    "ouvrages": ["combles_perdus_*", "rampants", "iti_*", "ite_*"],
    "priorite": 0,
    "si_inconnu": "famille_isolant",
    "texte": "Quel isolant ?",
    "boutons": "@isolants_dominants",
    "sensibilite_pct": 100
  },
  {
    "id": "R",
    "ouvrages": ["combles_perdus_*"],
    "priorite": 1,
    "si_inconnu": "R_vise",
    "texte": "Quelle performance ?",
    "boutons": [ { "label": "R 6", "valeur": 6 }, { "label": "R 7", "valeur": 7 }, { "label": "R 8", "valeur": 8 }, { "label": "R 10", "valeur": 10 } ],
    "defaut": 7,
    "sensibilite_pct": 14
  },
  {
    "id": "hauteur",
    "ouvrages": ["iti_colle", "iti_ossature"],
    "priorite": 3,
    "si_inconnu": "hauteur_sous_plafond_m",
    "texte": "Hauteur sous plafond ?",
    "boutons": [ { "label": "2,50", "valeur": 2.5 }, { "label": "2,60", "valeur": 2.6 }, { "label": "2,70", "valeur": 2.7 }, { "label": "2,80", "valeur": 2.8 }, { "label": "Plus", "valeur": null } ],
    "defaut": 2.5,
    "sensibilite_pct": 100
  }
]
```

`@isolants_dominants` lit la liste du département (section 8) et met en premier l'isolant habituel de l'artisan s'il est connu.
