# Référentiel quantitatif MENUISERIE (Rappidos)

Oct 3, 2026 · @Greg

## 1. Métier et axes de variation

La menuiserie se commande à l'unité et sur mesure : le quantitatif sort une fiche de commande par menuiserie (cotes, ouverture, matériau) plus les fournitures de pose, jamais des m². Le type de pose (neuf, rénovation sur dormant, dépose totale) pèse plus que la région.

**Périmètre v1 du métier « menuiserie »** (poseur-menuisier, la cible Rappidos) :

| Famille | Ouvrages | Ce que l'artisan commande |
| --- | --- | --- |
| Menuiseries extérieures | fenêtres, portes-fenêtres, baies coulissantes, portes d'entrée, portes de service | la menuiserie à l'unité (fabricant) + calfeutrement, fixations, habillages, appuis |
| Fermetures | volets roulants (bloc-baie ou rénovation), volets battants, portes de garage, persiennes | unité + coffre/coulisses (inclus ou non) + fixations |
| Menuiseries intérieures | blocs-portes, portes à galandage, portes coulissantes en applique | bloc-porte à l'unité + chambranles, quincaillerie, mousse |
| Agencement | placards (portes coulissantes, aménagement), dressing, habillages | kits, panneaux, rails en barres |
| Sols et parois bois | parquet (flottant, collé, cloué), plinthes, lambris | colis/paquets, sous-couche en rouleaux, plinthes en barres, colle en seaux |
| Extérieur bois | terrasse bois (lames + lambourdes), garde-corps bois | lames et lambourdes en barres, vis en boîtes, plots en unités |

Hors périmètre v1 : fenêtres de toit (tiroir couverture), bardage et ossature (tiroir charpente), escaliers sur mesure (commandés au fabricant sur relevé, 1 ligne « unité », rien à calculer).

### Axes de variation (fiche `metier.json`)

| Axe | Poids | Ce qu'il change pour le quantitatif |
| --- | --- | --- |
| `neuf_renovation` | **fort** | Type de pose : neuf en applique intérieure (avec tapée/doublage), rénovation sur dormant existant (habillages, pas de maçonnerie), dépose totale (calfeutrement complet, reprise tableaux). Change la liste des fournitures, leurs longueurs et la présence d'habillages. |
| `gamme` | **moyen** | PVC, alu, bois, mixte ; simple/double/triple vitrage ; motorisé ou non. Change la désignation et le prix, très peu les quantités de fournitures (sauf bois : lasure/peinture, alu : vis inox). |
| `epoque_bati` | **moyen** | Bâti ancien : maçonnerie pierre ou brique pleine (chevilles différentes), tableaux hors d'équerre (mousse en plus), portes intérieures hors standard (hauteur < 2,04 m), parquet sur plancher bois (pas de chape). |
| `geographie` | **faible** | Littoral : visserie inox A4 et finitions alu « bord de mer ». Zone vent forte : classement AEV plus élevé (designation, pas quantité). Volets battants bois plus fréquents en Bretagne, Sud et zones patrimoniales. Montagne : triple vitrage fréquent. |
| `type_batiment` | **faible** | ERP et collectif : portes coupe-feu (EI30), accessibilité PMR (seuil ≤ 2 cm, passage 0,83 m utile), quincaillerie anti-panique. |

```json
{
  "code": "menuiserie",
  "nom": "Menuiserie extérieure et intérieure - agencement - parquet - terrasse bois",
  "version": "1.0.0",
  "normes": ["NF DTU 36.5", "NF DTU 36.2", "NF DTU 36.3", "NF DTU 34.4", "NF DTU 51.1", "NF DTU 51.2", "NF DTU 51.11", "NF DTU 51.4", "NF DTU 44.1"],
  "axes_de_variation": {
    "geographie": "faible",
    "epoque_bati": "moyen",
    "type_batiment": "faible",
    "neuf_renovation": "fort",
    "gamme": "moyen"
  },
  "metiers_lies": ["maconnerie", "platrerie", "peinture", "isolation", "couverture"],
  "unites_de_commande": ["u", "barre", "rouleau", "cartouche", "aerosol", "boite", "colis", "seau", "kit", "paire"],
  "maturite": "alpha"
}
```

Repères marché (étude Prospection & Prospection pour UFME, SNFA, UMB-FFB, ventes 2023) : [PVC environ 60 %, alu environ 30 %, bois 10,1 % en volume](https://www.lechodelabaie.fr/tendances/le-marche-de-la-fenetre-en-france/) ; la dépose totale atteint 60,1 % des poses en rénovation. Conséquence : défaut de l'app = fenêtre PVC blanc, dépose totale si rénovation.

## 2. Règle d'or et unités de commande

**Règle d'or menuiserie : une menuiserie = une ligne à l'unité, avec ses cotes de fabrication, son ouverture et sa finition ; tout le reste se commande en barres, rouleaux, cartouches, aérosols ou boîtes. Jamais de m² sauf le parquet, et même lui se convertit en colis.**

Trois règles dérivées, propres au métier :

1. **L'app n'invente jamais une cote de fabrication.** Si le devis donne L × H, la ligne sort avec ces cotes et la mention « cotes devis, à confirmer au relevé ». Sans cotes, la ligne sort « 1 u, cotes à relever » et rien n'est déduit. Une fenêtre fausse de 2 cm est perdue.
2. **Les fournitures de pose se calculent sur le périmètre de chaque menuiserie** (2 × (L + H) pour le calfeutrement, L pour l'appui, L + 2 × H pour les habillages) puis s'arrondissent à la barre, au rouleau ou à la cartouche entière.
3. **Le fournisseur de la menuiserie n'est souvent pas le négoce des fournitures.** Le quantitatif sépare deux blocs : « à commander au fabricant » (menuiseries, volets, portes) et « à commander au négoce » (fournitures). Le PDF fournisseur garde ce découpage.

| Article | Unité de commande | Format négoce courant | Arrondi |
| --- | --- | --- | --- |
| Fenêtre, porte, baie, volet, porte de garage | u | sur mesure, cotes L × H en mm | à l'unité, jamais regroupé |
| Bloc-porte intérieur | u | hauteur 2,04 m, largeurs 63 / 73 / 83 / 93 cm (à vérifier gamme) | à l'unité, sens G/D obligatoire |
| Mousse PU expansive | aérosol | 750 ml (pistolet ou canule) | aérosol entier supérieur |
| Mastic (MS polymère, silicone, acrylique) | cartouche | 290 à 310 ml ; poche 600 ml | cartouche entière supérieure |
| Mousse imprégnée précomprimée (compribande) | rouleau | longueur selon largeur et plage de dilatation (fiche fabricant) | rouleau entier supérieur |
| Bande ou membrane d'étanchéité à l'air | rouleau | 25 m ou 50 m selon largeur (à vérifier) | rouleau entier |
| Vis de fixation de cadre, chevilles | boîte | 50 ou 100 pièces | boîte entière |
| Cales de pose | sachet ou boîte | assortiment par épaisseurs | sachet entier |
| Habillages, cornières, couvre-joints, tapées, bavettes | barre | 3 m, 4 m, 5,80 m ou 6,5 m selon matière | barre entière, chutes réutilisables sur le chantier |
| Chambranles, plinthes, baguettes, moulures | barre | 2,20 m (chambranle), 2,40 à 2,50 m (plinthe) | barre entière par côté |
| Parquet, lambris | colis | m² par colis = donnée fabricant | colis entier supérieur |
| Sous-couche parquet | rouleau | m² par rouleau = donnée fabricant | rouleau entier |
| Colle parquet | seau | 5, 7, 15 ou 21 kg (à vérifier marque) | seau entier |
| Lames et lambourdes de terrasse | barre | longueurs commerciales (2,40 à 6 m selon essence) | barre entière, calepinage par travée |
| Vis terrasse | boîte | 100, 200 ou 500 pièces | boîte entière |
| Plots terrasse | u | par hauteur réglable | à l'unité |

Ce que voit le fournisseur sur chaque ligne : désignation complète, quantité dans l'unité ci-dessus, et pour les menuiseries le tableau L × H × ouverture × couleur × vitrage × pose. Jamais « 12 m² de fenêtres ».

## 3. Ouvrages, vocabulaire des devis et pièges

Chaque ligne de devis se rattache à un ouvrage ci-dessous via `vocabulaire.json` ; l'ouvrage décide des fournitures à générer. Le type de pose est la clé : sans lui, les fournitures sont fausses.

### 3.1 Ouvrages (`ouvrages.json`)

| Code ouvrage | Ce que c'est | Fournitures générées automatiquement |
| --- | --- | --- |
| `fen_neuf_applique_int` | fenêtre ou porte-fenêtre en neuf, posée contre la face intérieure du mur, avant doublage | menuiserie + pattes de fixation + chevilles + calfeutrement (compribande ou mastic) + bande d'étanchéité à l'air + cales + appui/bavette si demandé |
| `fen_reno_dormant` | rénovation : nouvelle fenêtre posée sur l'ancien dormant bois conservé | menuiserie (avec aile de recouvrement) + vis traversantes + mousse imprégnée ou mastic + habillages intérieurs et extérieurs (cornières, plats, couvre-joints) |
| `fen_depose_totale` | dépose complète de l'ancienne fenêtre, pose en tunnel ou en feuillure | menuiserie + vis de cadre traversantes + compribande + mousse PU (isolation intérieure) + mastic + cales + habillages intérieurs + reprise d'appui éventuelle |
| `baie_coulissante` | baie ou porte-fenêtre coulissante (seuil, poids élevé) | idem selon pose, fixations rapprochées (voir 5.2), cales porteuses renforcées |
| `porte_entree` | porte d'entrée ou de service | bloc-porte + vis de cadre + calfeutrement + seuil + habillages |
| `volet_roulant_reno` | volet roulant rénovation (coffre extérieur ou sous linteau) | volet à l'unité + vis + chevilles + mastic de finition coffre/coulisses |
| `volet_roulant_bloc_baie` | coffre intégré à la menuiserie (neuf) | inclus dans la menuiserie : aucune ligne en plus, sauf motorisation/commande si séparée |
| `volet_battant` | volet battant bois, PVC ou alu | volet à l'unité (paire) + gonds à sceller ou à visser + arrêts de volet + espagnolette ou pentures si non fournis |
| `porte_garage` | sectionnelle, enroulable, basculante | porte à l'unité (kit fabricant complet) + chevilles si non fournies |
| `bloc_porte_int` | bloc-porte intérieur huisserie + vantail | bloc-porte + chambranles (jeu) + mousse PU ou pattes + pointes/colle chambranle |
| `porte_galandage` | porte coulissante dans la cloison (châssis) | châssis à galandage + vantail + kit habillage ; souvent coordonné avec le plaquiste |
| `porte_coulissante_applique` | porte coulissante devant le mur | rail (barre) + kit chariots + vantail + butées |
| `placard_coulissant` | façade de placard coulissante | kit portes (unité par vantail) + rail haut et bas en barres + profils |
| `parquet_flottant` | parquet contrecollé ou stratifié posé flottant (DTU 51.11) | colis + sous-couche (rouleaux) + film PE si support à risque d'humidité + plinthes + barres de seuil + profilés de fractionnement |
| `parquet_colle` | parquet collé en plein (DTU 51.2) | colis + colle (seaux) + plinthes + seuils |
| `parquet_cloue` | parquet massif cloué sur lambourdes ou solivage (DTU 51.1) | colis + lambourdes (barres) + pointes ou agrafes (boîtes) + plinthes |
| `plinthes` | plinthes seules | barres + colle (cartouche) ou pointes |
| `lambris` | lambris mural ou plafond | colis + tasseaux (barres) + clips ou pointes (boîtes) |
| `terrasse_bois` | platelage bois sur lambourdes (DTU 51.4) | lames + lambourdes (barres) + vis inox (boîtes) + plots ou cales + bande bitumineuse de protection des lambourdes |

### 3.2 Vocabulaire des devis (`vocabulaire.json`, extrait)

| Le devis écrit | L'app comprend |
| --- | --- |
| « fenêtre PVC 2 vantaux OF », « fenêtre 2V ouvrant à la française », « châssis » | fenêtre à frappe, 2 vantaux |
| « OB », « oscillo-battant », « oscillo-battante » | fenêtre à frappe avec ouverture oscillo-battante (même fournitures) |
| « PF », « porte-fenêtre », « PF 2V avec soubassement » | porte-fenêtre |
| « baie coulissante », « galandage alu », « coulissant 2 rails » | `baie_coulissante` (attention : « galandage » seul en intérieur = `porte_galandage`) |
| « pose en rénovation », « pose sur dormant existant », « pose réno » | `fen_reno_dormant` |
| « dépose totale », « dépose complète », « pose en tunnel », « pose en feuillure » | `fen_depose_totale` |
| « pose en applique », « pose neuf », « avec tapée de 140 », « doublage 100+40 » | `fen_neuf_applique_int` ; la tapée = épaisseur d'isolant + plaque |
| « VR », « volet roulant », « VR réno coffre 4 pans », « VR monobloc » | `volet_roulant_reno` ; « VR intégré », « bloc-baie », « coffre tunnel » = `volet_roulant_bloc_baie` |
| « volets battants », « persiennes », « volets à barres et écharpes », « volets niçois » | `volet_battant` |
| « bloc-porte », « BP », « porte isoplane », « porte alvéolaire », « huisserie 72 », « recouvrement » | `bloc_porte_int` |
| « chambranle », « couvre-joint », « habillage » | intérieur : chambranle de porte ; extérieur fenêtre : habillage PVC/alu |
| « tapée », « fourrure », « élargisseur » | profilé d'élargissement du dormant (souvent fourni par le fabricant de la fenêtre) |
| « appui », « pièce d'appui », « bavette », « rejingot » | appui de fenêtre ; « bavette alu » = tôle pliée sur l'appui maçonné |
| « compriband », « compribande », « joint mousse imprégnée », « illmod » | mousse imprégnée précomprimée |
| « parquet flottant », « contrecollé clipsable », « stratifié » | `parquet_flottant` |
| « point de Hongrie », « bâtons rompus », « pose en diagonale » | parquet, perte majorée (voir 5.6) |
| « platelage », « deck », « terrasse en pin classe 4 », « ipé », « lames striées » | `terrasse_bois` |

### 3.3 Pièges à connaître (le moteur doit les gérer)

1. **Cotes tableau, cotes fabrication, cotes hors tout** : un devis donne souvent la cote de tableau (le trou) ; le fabricant veut la cote de fabrication (tableau moins jeux, ou plus ailes en rénovation). L'app ne convertit jamais : elle recopie et marque « à confirmer au relevé ».
2. **« L × H » ou « H × L »** : convention métier = largeur × hauteur. Si L > 2,5 m et H < 1,5 m sur une porte-fenêtre, l'inversion est probable : poser la question.
3. **Sens d'ouverture** : « poussant droit / gauche » (portes intérieures), « tirant droit / gauche » (fenêtres, vu de l'intérieur). Si absent du devis, la ligne sort « sens à préciser » ; ce n'est pas une question bloquante.
4. **La mousse PU n'est pas un calfeutrement** : [le NF DTU 36.5 l'interdit comme étanchéité à l'eau et à l'air](https://infos.wurth.fr/menuiserie-les-details-de-la-norme-dtu-36-5-pour-les-poses-de-fenetres/) ; elle n'est qu'un complément d'isolation côté intérieur. L'app ne remplace jamais la compribande par de la mousse.
5. **Vis sans cheville en applique intérieure : proscrit** par le [NF DTU 36.5](https://www.normesdtuposemenuiserie.com/les-fixations/). En neuf applique : pattes + chevilles. En tunnel/rénovation : vis de cadre traversantes.
6. **Les tapées, pattes et volets bloc-baie sont souvent livrés avec la fenêtre** : ne pas les commander deux fois au négoce. Défaut = fournis par le fabricant de la menuiserie, sauf mention contraire.
7. **Volet roulant motorisé** : commande filaire (interrupteur) ou radio. La radio ne demande pas de câble ; le filaire implique l'électricien. L'app signale, ne commande pas de câble.
8. **Parquet : surface du devis = surface posée, pas surface à commander**. Les pertes et l'arrondi au colis viennent ensuite.
9. **Plinthes : déduire les portes** (largeur de passage), sinon surcommande de 5 à 10 %.

## 4. Matériaux et fiches fabricant (`materiaux.json`)

Les menuiseries elles-mêmes sont sur mesure : aucune fiche générique, la ligne porte les cotes du devis. Les fiches ci-dessous couvrent tout ce qui se commande au négoce ; les valeurs sont transcrites des documents fabricant cités, le reste est marqué « à vérifier ».

### 4.1 Mousse imprégnée précomprimée — illbruck TP600 illmod 600 (Tremco CPG)

Classe 1 NF P 85-570, conforme NF DTU 36.5, étanchéité pluie battante 600 Pa. Pose : surlongueur 1 cm par jonction, bandes aboutées aux angles (jamais enroulées autour). Section = largeur / plage de joint en mm. Source : [fiche technique TP600, éd. 2022-09, diffusée par Gedimat](https://uploads.gedimat.fr/DOCUMENT/TYPE1/0000126407074.pdf).

| Section (largeur/plage joint mm) | Longueur rouleau | Carton chantier | Usage type |
| --- | --- | --- | --- |
| 10/3-7 | 8 m | 30 rouleaux = 240 m | dormant fin, joint serré |
| 12/3-7 | 8 m | 25 rouleaux = 200 m |  |
| 12/5-11 | 5,6 m | 25 rouleaux = 140 m |  |
| 13/4-9 | 6,6 m | 23 rouleaux = 151,8 m |  |
| **15/3-7** | **8 m** | **20 rouleaux = 160 m** | **défaut app : dormant PVC 60-70 mm, joint 3 à 7 mm** |
| 15/5-11 | 5,6 m | 20 rouleaux = 112 m | maçonnerie irrégulière |
| 15/7-14 | 4,3 m | 20 rouleaux = 86 m | bâti ancien |
| 20/3-7 | 8 m | 15 rouleaux = 120 m | dormant large (bois, alu 70+) |
| 20/5-11 | 5,6 m | 15 rouleaux = 84 m |  |
| 20/7-14 | 4,3 m | 15 rouleaux = 64,5 m |  |
| 20/8-18 | 3,3 m | 24 rouleaux = 79,2 m |  |
| 20/10-20 | 4,5 m | 12 rouleaux = 54 m |  |

Règle de choix : largeur de bande ≤ profondeur d'appui du dormant moins 5 mm ; plage choisie pour contenir le jeu mesuré. Équivalents acceptés : Soudal Soudaband Acryl 600, Würth VKP Plus, Compriband (à vérifier : longueurs par section propres à chaque marque).

### 4.2 Mousse polyuréthane — Soudal Soudafoam Gun Low Expansion

Aérosol 750 ml net, pistolet. Rendement en boîte env. 42 L de mousse ; rendement en joint env. 31 m (essai EN 17333-1) ; expansion pendant durcissement env. 15 %, retrait < 3 %. Remplir aux 3/4. Source : [fiche technique Soudal 15/04/2022](https://www.soudal.com/sites/default/files/soudal_api/document/F0032942_0001.pdf). Rendement chantier retenu par l'app : **15 m de joint par aérosol** (à vérifier par un menuisier : joints irréguliers, purges, fin d'aérosol).

### 4.3 Mastic de calfeutrement — Soudal Soudaseal 240 FC (MS polymère)

Cartouche 290 ml ou poche 600 ml ; densité 1,67 g/ml ; déformation admissible ±20 % ; règle de joint : largeur = 2 × profondeur ; poids cartouche 356,8 g. Sources : [fiche technique Soudal](https://devtec.co.il/wp-content/uploads/2020/01/devtec_tds_SOUDASEAL_240FC.pdf), [fiche article Fabory](https://www.fabory.com/en/soudal-ms-polimero-nero-290ml/p/S0935104925). Rendement calculé en 5.4 (géométrie pure). Le calfeutrement mastic suit le NF DTU 44.1 et demande un fond de joint (cordon mousse PE, à vérifier : diamètre 1,25 × largeur du joint).

### 4.4 Vis de fixation de cadre — fischer FFS 7,5

Vis traversante sans cheville, foret Ø 6 mm, tête Ø 11,5 mm, empreinte T30, **boîte de 100**. Longueurs : 42, 52, 62, 72, 82, 92, 102, 112, 122, 132, 152, 182, 202, 212 mm. Ancrage effectif minimal : 30 mm béton, 40 mm brique pleine, 50 mm béton léger, 60 mm brique alvéolaire. Capuchons ADT blanc ou brun par 100. Sources : [catalogue fischer (Trenois)](https://media.trenois.com/static/vis-traversante-tete-fraisee-torx-acier-zingue-blanc_fis250_fiche-technique.pdf), [fiche fischer FFS (Descours & Cabaud)](https://medias.descours-cabaud.com/d180001/medias/docus/274/2016-FFS_fiche%20technique.pdf).

Longueur de vis = épaisseur du dormant traversé + jeu de calfeutrement + ancrage minimal du support, arrondie à la longueur catalogue supérieure. Exemple : dormant PVC 70 mm + jeu 10 mm + brique creuse 60 mm = 140 → **FFS 7,5 × 152**.

### 4.5 Bande d'étanchéité à l'air intérieure — SIGA Fentrim IS 20

Rouleau **25 m** ; largeurs 75, 100, 150, 200, 250, 300 mm ; carton de 8 (75 mm), 6 (100), 4 (150) ou 2 rouleaux (200 à 300 mm) ; pose dès -10 °C. Fentrim 20 (enduisable) : 100, 150, 200 mm, 25 m. Sources : [fiche SIGA Fentrim IS 20, 29.10.2024](https://media.hornbach.ch/hb/technicaldatasheet/as.133013559.pdf), [SIGA Fentrim 20](https://www.siga.swiss/global_en/products/fentrim/fentrim-20). Défaut app : **100 mm** en neuf applique intérieure avec doublage.

### 4.6 Habillages et cornières PVC

Cornières, plats et couvre-joints PVC blanc vendus en **barres de 3 m** (ex. Quadroform plat 100 mm × 3 m, 0,35 kg ; Morey cornière 30 × 30 × 3 m ; colis professionnels de 10 longueurs de 3 m en 30 × 30 à 100 × 160 mm). Sources : [Quadroform plat 100](https://www.bricocash.fr/p/profil-plat-pvc-100mm-blanc-3m/8681612500182), [fiche cornières PVC 10 × 3 m](https://www.hellopro.fr//documentation/pdf_prod/3/7/2/244610_c8c253a82272679ac1dcc80fd24e685b.pdf). Habillages alu laqués : barres de 3 m ou 6 m selon gamme (à vérifier par fournisseur).

### 4.7 Blocs-portes intérieurs

Hauteur standard **204 cm**, largeurs **63 / 73 / 83 / 93 cm** (vantail) ; passage utile environ largeur moins 3 cm ; l'huisserie ajoute 10 à 15 cm au hors tout ; réservation brute = hors tout + 1 à 2 cm. Doubles : 126 (93 + 33) et 146 (73 + 73). Épaisseur de cloison à préciser (huisserie 72, 88, 100 mm…). Sources : [Pascobois](https://pascobois.fr/dimensions-portes-interieures/), [la-lourde.fr](https://www.la-lourde.fr/en/post/quel-est-la-difference-entre-la-dimension-hors-tout-la-reservation-et-le-jeu-necessaire-pour-une-pose-parfaite), [Chausson bloc-porte huisserie 88/56](https://www.chausson.fr/materiaux/bloc-porte-bois-isoplane-ame-pleine-204cm-73cm-poussant-droit-p-229317-1). Chambranles : jeu de 2 montants + 1 traverse, longueur montant 2,15 à 2,20 m (à vérifier).

### 4.8 Parquets (exemples de conditionnement réel, Quick-Step)

| Produit | Lame (mm) | Lames / paquet | m² / paquet | Poids paquet |
| --- | --- | --- | --- | --- |
| [Quick-Step Compact (contrecollé chêne 13 mm)](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1545127.pdf) | 1820 ou 2200 × 145 | 6 | 1,583 ou 1,914 | à vérifier |
| [Quick-Step Disegno (contrecollé 13,5 mm, bâtons rompus)](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1545135.pdf) | 580 × 145 | 12 (6 A + 6 B) | 1,009 | à vérifier |
| [Quick-Step Impressive (stratifié 8 mm)](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_952917.pdf) | 1380 × 190 | 7 | 1,835 | à vérifier |
| [Quick-Step vinyle clipsable 4 mm](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1545298.pdf) | 1251 × 189 | 12 | 2,837 | 18,6 kg |

Règle : le m²/colis vient toujours de la fiche du produit choisi ; à défaut, l'app suppose **2,0 m²/colis** et l'affiche (à vérifier).

### 4.9 Autres fournitures (valeurs à vérifier, non sourcées à ce jour)

| Article | Conditionnement supposé | Statut |
| --- | --- | --- |
| Sous-couche parquet mousse/fibre | rouleau 10 à 15 m² ou panneaux en paquet de 5 à 7 m² | à vérifier |
| Film polyéthylène 150 à 200 µm | rouleau 2 × 25 m (50 m²) | à vérifier |
| Plinthe MDF ou bois | barre 2,40 m (ou 2,50 m) | à vérifier |
| Barre de seuil / profil de transition | barre 0,93 m ou 2,70 m | à vérifier |
| Colle parquet MS ou PU | seau 15 ou 18 kg, 1 kg/m² environ | à vérifier |
| Lame terrasse pin autoclave classe 4 | 27 × 145 mm, barres 2,40 / 3,00 / 4,20 / 4,80 m | à vérifier |
| Lambourde pin classe 4 | 45 × 70 mm, barres 2,40 à 4,80 m | à vérifier |
| Vis terrasse inox A2 | 5 × 50 ou 5 × 60 mm, boîte de 200 ou 500 | à vérifier |
| Cales de pose menuiserie | sachet assortiment 1 à 10 mm | à vérifier |
| Pattes de fixation (équerres) | sachet de 10 ou boîte de 50 | à vérifier |

## 5. Règles de calcul (`regles.json`)

Toutes les fournitures de pose se calculent menuiserie par menuiserie à partir de L et H (en m), se somment sur le chantier, puis s'arrondissent une seule fois à l'unité de commande. Formules pures, sans IA.

### 5.1 Valeurs DTU retenues

| Règle | Valeur | Source |
| --- | --- | --- |
| Entraxe maximal entre fixations du dormant | 0,80 m | [NF DTU 36.5 (Louineau)](https://www.louineau.com/les-normes/dtu/) |
| Fixation près des axes de rotation, points de condamnation, meneaux | ≤ 100 mm | [NF DTU 36.5 (normesdtuposemenuiserie)](https://www.normesdtuposemenuiserie.com/les-fixations/) |
| Distance fixation / angle du dormant sur montant | ≤ 0,25 m (PVC : 50 à 100 mm selon fabricant) | [Louineau](https://www.louineau.com/les-normes/dtu/), [Norba](https://www.norba-menuiserie.com/norba/reglementations/dtu-36-5/dtu-36-5-la-fixation-des-menuiseries/) |
| Coulissants | la note DTU citée limite à 0,30 m ; portée (entraxe ou extrémités) **à vérifier** | [Louineau](https://www.louineau.com/les-normes/dtu/) |
| Immobilisation de la pièce d'appui | obligatoire si largeur > 0,90 m | [normesdtuposemenuiserie](https://www.normesdtuposemenuiserie.com/les-fixations/) |
| Cales en partie basse | ≥ 5 mm, au droit des montants, dormants et meneaux | [Würth, NF DTU 36.5](https://infos.wurth.fr/menuiserie-les-details-de-la-norme-dtu-36-5-pour-les-poses-de-fenetres/) |
| Calfeutrement | mousse imprégnée classe 1 ou mastic (NF DTU 44.1) ; mousse PU interdite comme étanchéité | [normesdtuposemenuiserie (calfeutrement)](https://www.normesdtuposemenuiserie.com/le-calfeutrement/) |
| Jeu périphérique parquet flottant | 0,15 % de la plus grande dimension, minimum 8 mm | [legalnest, NF DTU 51.11](https://www.legalnest.fr/batiment/dtu/51-11-pose-de-parquet-flottant) |
| Fractionnement parquet flottant | si une dimension > 8 m (sauf fabricant) | [Batirama, NF DTU 51.11](https://www.batirama.com/article/2277-nf-dtu-51.11-parquets-flottants.html) |
| Film PE anti-humidité sous flottant | ≥ 150 µm (100 à 200 selon rugosité), lés recouverts 20 cm | [Le Moniteur, NF DTU 51.11](https://www.lemoniteur.fr/article/nf-dtu-51-11-pose-flottante-des-parquets.1133354), [NF Parquet](https://www.nf-parquet.fr/wp-content/uploads/2019/05/pose-flottante-ChD.pdf) |
| Lambourde terrasse : portée entre appuis | ≤ 0,60 m sur 2 appuis, ≤ 0,70 m sur 3 appuis et plus | [Guide FCBA terrasses bois](https://franceboisforet.fr/wp-content/uploads/2020/06/Guide_Terrasse-FNB-LCB-ATB-ARBUST-FCBA_avec_liens_BD.pdf) |
| Hauteur de lambourde | ≥ 1,5 × épaisseur de lame | [NF DTU 51.4 P1-1](https://l-idee-bois.com/wp-content/uploads/2020/06/NFDTU51-4P1-1PlatelageBoisext.pdf) |
| Vis de terrasse | inox A2 minimum, A4 en ambiance corrosive (littoral, piscine) | [NF DTU 51.4 P1-1](https://l-idee-bois.com/wp-content/uploads/2020/06/NFDTU51-4P1-1PlatelageBoisext.pdf) |
| Fixations de lame | 2 par croisement lame/lambourde si lame > 90 mm, ≥ 15 mm des rives | [Novi-clous, NF DTU 51.4](https://blog.novi-clous.fr/dtu-51-4-pour-terrasse-bois/) |
| Entraxe des lambourdes | selon tableaux 7, 12, 15 du DTU (épaisseur × largeur × classe de la lame) ; ordre de grandeur 40 à 50 cm pour une lame de 27 mm | [Novi-clous](https://blog.novi-clous.fr/dtu-51-4-pour-terrasse-bois/), [calculpro](https://calculpro.fr/outils/menuiserie/dimensionnement-terrasse-bois-dtu-51-4) |

### 5.2 Menuiseries extérieures (par menuiserie de largeur L et hauteur H)

Périmètre :

```latex
P = 2 \, (L + H)
```

Nombre de fixations sur un côté de longueur s, avec a = 0,15 m (distance à l'angle, défaut) et e = 0,80 m (entraxe max ; 0,60 m pour un coulissant en attendant validation) :

```latex
n(s) = \max\left(2,\; \left\lceil \frac{s - 2a}{e} \right\rceil + 1\right)
```

Fixations par menuiserie = 2 × n(H) + n(L) \[traverse haute\] + n(L) si L > 0,90 m \[immobilisation de l'appui\]. Une vis de cadre (ou une patte + une cheville en neuf applique) par fixation. Boîtes = ⌈total chantier × 1,05 / 100⌉.

| Fourniture | Quantité par menuiserie | Arrondi chantier | Ouvrages concernés |
| --- | --- | --- | --- |
| Mousse imprégnée (compribande) | P × 1,05 (surlongueur 1 cm par jonction + chutes) | ⌈Σ / longueur rouleau⌉ rouleaux | dépose totale, neuf applique, porte d'entrée |
| Bande d'étanchéité à l'air | P × 1,10 | ⌈Σ / 25⌉ rouleaux | neuf applique avec doublage, dépose totale si pare-vapeur |
| Mousse PU (isolation intérieure) | P | ⌈Σ / 15⌉ aérosols | dépose totale, rénovation, bloc-porte |
| Mastic extérieur (si calfeutrement ou finition mastic) | P × 1,10 | ⌈Σ / R⌉ cartouches, R en 5.4 | rénovation sur dormant, dépose totale (finition), volet rénovation |
| Mastic acrylique intérieur (joint habillage/doublage) | P | ⌈Σ / R⌉ cartouches | rénovation sur dormant, dépose totale |
| Habillage intérieur (plat ou cornière) | 3 pièces : L, H, H (+ 0,05 m par coupe d'onglet) | barres 3 m par rangement (5.3) | rénovation sur dormant, dépose totale |
| Habillage extérieur (cornière) | 3 pièces : L, H, H (+ 0,05 m) | barres 3 m par rangement (5.3) | rénovation sur dormant |
| Cales de pose | 1 sachet pour 8 menuiseries (à vérifier) | ⌈N / 8⌉ sachets | toutes |

### 5.3 Rangement des pièces dans les barres (habillages, plinthes, chambranles, lambourdes)

Algorithme « premier rangement décroissant » (FFD) : trier les pièces de la plus longue à la plus courte, placer chaque pièce dans la première barre où elle tient (trait de scie 5 mm), ouvrir une nouvelle barre sinon. Toute pièce plus longue que la barre est découpée en tronçons de longueur barre + reste, avec un raccord signalé. Cette règle remplace tout coefficient de perte pour les produits en barres et explique chaque barre commandée.

### 5.4 Mastic : rendement par cartouche

Joint de largeur w et profondeur d en mm (règle fabricant : w = 2 × d ; défaut w = 10, d = 5), volume V = 290 ml, 10 % de perte (embout, purge, fin de cartouche) :

```latex
R\,[\text{m/cartouche}] = \frac{V}{w \times d} \times 0{,}9
```

Défaut : 290 / (10 × 5) × 0,9 = **5,2 m par cartouche**. Joint 15 × 8 : 2,2 m. Joint d'angle intérieur acrylique 6 × 6 en triangle (section 18 mm², à vérifier) : environ 14 m.

### 5.5 Menuiseries intérieures

| Fourniture | Quantité | Arrondi |
| --- | --- | --- |
| Bloc-porte | 1 u par porte, largeur et sens recopiés du devis | u |
| Chambranles | 1 jeu par face visible (2 jeux si chambranle des deux côtés, défaut) | jeux |
| Mousse PU de calage | P porte = 2 × 2,04 + largeur, soit environ 4,9 m pour une 83 | ⌈Σ / 15⌉ aérosols |
| Colle ou pointes pour chambranles | 1 cartouche colle de fixation pour 3 portes (à vérifier) | cartouches |
| Placard coulissant | 1 kit par façade ; rails haut et bas = largeur de la façade | barres (longueur du rail fourni, à vérifier) |

### 5.6 Parquet

Surface à commander S\_cmd à partir de la surface posée S du devis, perte p selon la pose :

```latex
S_{cmd} = S \times (1 + p) \qquad N_{colis} = \left\lceil \frac{S_{cmd}}{m^2_{colis}} \right\rceil
```

| Pose | p | Statut |
| --- | --- | --- |
| Droite, pièce rectangulaire | 7 % | à vérifier |
| Droite, pièce avec nombreux décrochés | 10 % | à vérifier |
| Diagonale | 12 % | à vérifier |
| Bâtons rompus, point de Hongrie | 15 % | à vérifier |

| Fourniture | Quantité | Arrondi |
| --- | --- | --- |
| Sous-couche | S × 1,05 | ⌈ / m² par rouleau⌉ |
| Film PE 150-200 µm (support minéral ou sur terre-plein) | S × 1,20 (recouvrement 20 cm + remontées) | ⌈ / m² par rouleau⌉ |
| Plinthes | périmètre des pièces − largeurs des portes ; pièces par mur | barres par rangement (5.3) |
| Barres de seuil | 1 par passage de porte entre deux sols ou deux pièces + 1 par fractionnement (> 8 m) | u |
| Colle (parquet collé) | S × consommation fabricant (défaut 1 kg/m², à vérifier) | ⌈ / poids seau⌉ |

### 5.7 Terrasse bois (rectangle A × B, lames posées dans le sens A)

| Élément | Formule | Arrondi |
| --- | --- | --- |
| Nombre de rangs de lames | ⌈B / (largeur lame + jeu 5 mm)⌉ | rangs |
| Lames | rangs × ⌈A / longueur barre⌉ × 1,05 | barres |
| Nombre de lambourdes | ⌈A / entraxe⌉ + 1, entraxe défaut 0,45 m pour une lame 27 × 145 (à vérifier au tableau DTU) | u |
| Longueur de lambourdes | nombre × B, + 1 lambourde doublée par ligne de joint de lames | barres par rangement (5.3) |
| Vis inox | rangs × nombre de lambourdes × 2 × 1,05 | ⌈ / vis par boîte⌉ |
| Plots ou appuis | par lambourde : ⌈B / 0,60⌉ + 1 | u |
| Bande bitume de protection lambourde | longueur totale des lambourdes | ⌈ / longueur rouleau⌉ (à vérifier) |

## 6. Valeurs par défaut et hypothèses affichées (`defauts.json`)

Quand le devis ne dit rien et que la question n'a pas été posée, l'app applique ces défauts et les affiche en clair sous le quantitatif, chacun modifiable d'un tap. Ordre de surcharge : référentiel → habitudes de l'artisan → chantier.

| Paramètre | Défaut national | Variante par axe | Texte affiché à l'artisan |
| --- | --- | --- | --- |
| Type de pose (rénovation) | dépose totale | neuf\_renovation = neuf → neuf applique intérieure | « Pose en dépose totale » |
| Matériau menuiserie | PVC blanc | gamme premium → alu ; zone patrimoniale → bois | « Fenêtres PVC blanc (selon devis) » |
| Fournisseur des tapées, pattes, volets bloc-baie | fabricant de la menuiserie | — | « Tapées et pattes livrées avec les fenêtres » |
| Calfeutrement | mousse imprégnée TP600 15/3-7, rouleau 8 m | epoque\_bati = ancien → 15/7-14 (rouleau 4,3 m) | « Compribande 15/3-7 (joint 3 à 7 mm) » |
| Support (maçonnerie) | brique creuse | epoque\_bati = ancien → pierre ou brique pleine ; géographie Nord → brique pleine | « Mur en brique creuse : vis 7,5 × 152 » |
| Épaisseur de dormant | 70 mm (PVC) | alu → 60 mm ; bois → 58 mm (à vérifier) | « Dormant 70 mm » |
| Jeu de calfeutrement | 10 mm | ancien → 15 mm | — |
| Distance fixation / angle | 0,15 m | — | — |
| Entraxe fixations | 0,80 m | coulissant → 0,60 m (à valider) | — |
| Habillage intérieur | plat PVC blanc 100 mm, barre 3 m | dépose totale avec reprise plâtre → aucun | « Habillage intérieur plat PVC 100 » |
| Habillage extérieur | cornière PVC 40 × 40 (rénovation seulement) | littoral → alu laqué | « Cornière extérieure PVC » |
| Mastic extérieur | MS polymère, joint 10 × 5 mm, 5,2 m/cartouche | — | « Mastic MS, 1 cartouche ≈ 5 m » |
| Visserie extérieure | acier zingué (vis de cadre) | geographie = littoral → inox A4 pour toute visserie apparente et terrasse | « Bord de mer : visserie inox A4 » |
| Bande étanchéité à l'air | SIGA Fentrim IS 20 100 mm, rouleau 25 m | seulement si neuf applique ou devis cite « étanchéité à l'air » / RE2020 | « Bande d'étanchéité à l'air 100 mm » |
| Bloc-porte | 204 × 83 cm, huisserie 72 mm, chambranles 2 faces | largeur et cloison du devis | « Porte 83 cm, cloison 72 mm » |
| Parquet, m² par colis | 2,0 m² | fiche produit si connue | « Colis de 2 m² supposé » |
| Perte parquet | 7 % pose droite | diagonale 12 %, bâtons rompus 15 % | « 7 % de chutes compris » |
| Sous-couche | rouleau 15 m² (à vérifier) | plancher chauffant → sous-couche compatible, R totale ≤ 0,15 m².K/W | « Sous-couche en rouleaux de 15 m² » |
| Film PE | oui si support béton ou chape | plancher bois → non | « Film PE 200 µm (sol béton) » |
| Plinthes | MDF blanc 70 mm, barre 2,40 m | devis | « Plinthes 2,40 m » |
| Lame terrasse | pin classe 4, 27 × 145 mm, barres 4,20 m (à vérifier) | devis (ipé, composite) | « Lames 27 × 145 en 4,20 m » |
| Entraxe lambourdes | 0,45 m | essence dense (ipé) → 0,50 m ; lame 21 mm → 0,40 m (à vérifier au tableau DTU) | « Lambourdes tous les 45 cm » |
| Vis terrasse | inox A2 5 × 60, boîte 200 | littoral, piscine → A4 | « Vis inox A2 5 × 60 » |

Règle d'affichage : au plus 5 hypothèses visibles, classées par impact sur la commande ; les autres sont dans « voir toutes les hypothèses ».

## 7. Questions à poser (`questions.json`)

Le moteur ne pose une question que si le devis ne contient pas déjà la réponse, et seulement pour les ouvrages détectés. Quatre questions de base suffisent pour un chantier de fenêtres ; les questions conditionnelles s'ajoutent seulement si le devis contient du parquet, des portes ou une terrasse, conformément à la décision « mieux vaut une question intelligente que tout corriger après ». Jamais de question sur une quantité, une longueur ou une surface.

Sensibilité = variation estimée de la partie « négoce » de la commande (fournitures) selon la réponse, hors menuiseries elles-mêmes. Valeurs à vérifier sur les 10 cas de test.

| Ordre | Question (texte affiché) | Boutons | Déclenchée si | Sensibilité |
| --- | --- | --- | --- | --- |
| 1 | « Comment tu poses les fenêtres ? » | Sur l'ancien cadre · Dépose totale · Neuf (mur nu) | fenêtres détectées et type de pose absent du devis | **40 à 60 %** : habillages, longueur des vis, bande d'air, compribande présents ou non |
| 2 | « Le mur, c'est quoi ? » | Brique ou parpaing creux · Béton · Pierre ou brique pleine | pose dépose totale ou neuf | **10 à 20 %** : longueur de vis (FFS 7,5 × 112 à 182), section de compribande |
| 3 | « Tu poses des habillages autour ? » | Dedans et dehors · Dedans seulement · Aucun | pose sur ancien cadre ou dépose totale | **20 à 30 %** : barres d'habillage, mastic acrylique |
| 4 | « Les volets roulants sont-ils dans le coffre de la fenêtre ? » | Oui, intégrés · Non, posés à part · Pas de volet | devis cite des volets sans préciser | **5 à 15 %** : visserie et mastic du volet ; évite une double commande |
| C1 | « Le parquet, posé comment ? » | Droit · En diagonale · Bâtons rompus ou point de Hongrie | parquet détecté, pose absente | **7 à 15 %** sur le nombre de colis |
| C2 | « Le sol dessous ? » | Béton ou chape · Plancher bois · Plancher chauffant | parquet flottant détecté | film PE oui/non (≈ 1 rouleau pour 40 m²) ; sous-couche spéciale si chauffant |
| C3 | « Les chambranles, des deux côtés de la porte ? » | Deux côtés · Un seul côté | blocs-portes détectés | **50 %** sur les jeux de chambranles |
| C4 | « Les lames de terrasse, en quoi ? » | Pin ou bois traité · Bois exotique · Composite | terrasse détectée, essence absente | **20 à 30 %** sur lambourdes et plots (entraxe), vis inox spécifiques |

Résolues sans question : littoral (adresse du chantier → département → visserie inox), matériau des fenêtres (devis), cotes (devis ou « à relever »), sens d'ouverture (ligne « à préciser »).

```json
[
  {
    "id": "type_pose",
    "ordre": 1,
    "texte": "Comment tu poses les fenêtres ?",
    "boutons": [
      { "label": "Sur l'ancien cadre", "valeur": "fen_reno_dormant" },
      { "label": "Dépose totale", "valeur": "fen_depose_totale" },
      { "label": "Neuf (mur nu)", "valeur": "fen_neuf_applique_int" }
    ],
    "si": "ouvrage_famille == 'menuiserie_ext' && !devis.type_pose",
    "defaut": "fen_depose_totale",
    "sensibilite_pct": [40, 60]
  },
  {
    "id": "support_mur",
    "ordre": 2,
    "texte": "Le mur, c'est quoi ?",
    "boutons": [
      { "label": "Brique ou parpaing creux", "valeur": "creux" },
      { "label": "Béton", "valeur": "beton" },
      { "label": "Pierre ou brique pleine", "valeur": "plein" }
    ],
    "si": "type_pose in ['fen_depose_totale','fen_neuf_applique_int']",
    "defaut": "creux",
    "sensibilite_pct": [10, 20]
  }
]
```

## 8. Matériaux dominants par région

La menuiserie dépend peu de la région (axe `geographie` = faible) : la région change surtout la désignation (finition marine, vitrage) et la visserie, pas les quantités. Seul le bord de mer déclenche une règle automatique sur la commande.

| Zone | Ce qui change | Effet dans l'app | Statut |
| --- | --- | --- | --- |
| **Littoral** (communes côtières des départements 06, 11, 13, 14, 17, 22, 29, 30, 33, 34, 35, 40, 44, 50, 56, 59, 62, 64, 66, 76, 80, 83, 85, 2A, 2B, DROM) | Aluminium : laquage qualité marine (Qualicoat Seaside ou Qualimarine) ; visserie et quincaillerie inox ; terrasse en inox A4 | Ajoute « laquage qualité marine » à la désignation de toute menuiserie ou volet alu ; vis apparentes et vis de terrasse en inox A4 | règle sourcée : [CA Rennes, 2 nov. 2023, n° 22/01973](https://www.inc-conso.fr/node/16505) retient la faute d'un poseur de volets alu en bord de mer sans laquage marine ; [Technal, prescription Qualicoat seaside](https://technal.com/link/efa2f66198124982bc25d01bee703d70.aspx) ; périmètre exact « littoral » (distance à la mer) à vérifier |
| Bretagne, Normandie, Pays basque, Provence, zones patrimoniales (ABF) | Volets battants bois fréquents, petits bois, menuiseries bois imposées en secteur protégé | Défaut volet battant bois si « volets » sans précision dans ces régions ; bois → ajouter lasure ou peinture si devis le cite | à vérifier par un menuisier de chaque région |
| Nord, Pas-de-Calais, Picardie | Murs en brique pleine fréquents en ancien | Défaut support « brique pleine » si époque < 1950 : vis FFS ancrage 40 mm | à vérifier |
| Montagne (zones H1, altitude > 800 m) | Triple vitrage fréquent ; neige sur appuis et seuils | Désignation seulement ; aucune quantité ne change | à vérifier |
| Zones de vent fortes (couloir rhodanien, littoral Manche et Atlantique, Corse) | Classement AEV de la menuiserie plus élevé (choix fabricant) | Désignation « classement AEV selon site » sur la ligne fabricant | à vérifier |
| Sud-Est, Corse | Volets battants et persiennes (« niçois ») ; terrasses bois et composite très fréquentes | Défaut volet battant si non précisé | à vérifier |
| National | PVC blanc dominant en volume (environ 60 %), alu 30 %, bois 10 % ; 71,5 % des fenêtres PVC vendues en blanc en 2023 | Défaut PVC blanc | [étude P&P 2023 (L'Écho de la baie)](https://www.lechodelabaie.fr/tendances/le-marche-de-la-fenetre-en-france/) |

Ce que la région ne change jamais : la règle de fixation (0,80 m), le calfeutrement en mousse imprégnée ou mastic, les blocs-portes 204 cm, le parquet.

## 9. Points singuliers et consommables

Les points singuliers se commandent à la pièce ou au ml, jamais noyés dans un ratio ; les consommables sortent en fin de liste, groupés, avec un arrondi par chantier.

### 9.1 Points singuliers (à la pièce ou au ml)

| Point singulier | Déclencheur | Quantité | Unité | Note |
| --- | --- | --- | --- | --- |
| Bavette ou appui alu rapporté | devis cite « bavette », « appui alu » ou dépose totale sur appui abîmé | 1 par menuiserie, longueur L + 2 × 0,05 m (retours) | u, sur mesure | sinon barre alu pliée à couper : rangement 5.3 |
| Embouts de bavette | bavette posée | 2 par bavette (1 paire) | paire | à vérifier selon gamme |
| Seuil de porte d'entrée / PMR | porte d'entrée, porte-fenêtre accessible | 1 par porte, longueur = L | u | seuil ≤ 2 cm en accessibilité (à vérifier texte en vigueur) |
| Tapée d'isolation | neuf applique, épaisseur doublage connue | 1 jeu par menuiserie (3 ou 4 côtés) | jeu | **défaut : fournie par le fabricant**, ne sort au négoce que si le devis le précise |
| Coffre et coulisses volet rénovation | volet roulant rénovation | inclus dans le volet | — | vis + chevilles : 4 par coulisse + 2 par coffre (à vérifier) |
| Gonds de volet battant | volet battant | 2 par vantail jusqu'à 1,60 m de haut, 3 au-delà (à vérifier) | u | à sceller (chimique) ou à visser selon mur |
| Arrêts de volet | volet battant | 1 par vantail | u | type « tête de bergère » ou automatique |
| Meneau, traverse, châssis fixe | menuiserie composée | +2 fixations par meneau (une en haut, une en bas) | vis | règle DTU : fixation ≤ 100 mm des meneaux |
| Raccord de compribande en appui | toute pose | aucun : le raccord se fait sur les montants | — | règle [NF DTU 36.5](https://www.normesdtuposemenuiserie.com/le-calfeutrement/) : jamais de raccord de bandes en appui |
| Barre de seuil parquet | changement de sol, passage de porte, fractionnement > 8 m | 1 par passage | u | longueur standard 0,93 m couvre une porte de 83 (à vérifier) |
| Remontée de sous-couche acoustique | parquet flottant avec sous-couche acoustique | périmètre × épaisseur du parquet, déjà couvert par +5 % | — | règle DTU 51.11 |
| Double lambourde aux joints de lames | terrasse, lames aboutées | +1 lambourde par ligne de joint | u | retrait 20 mm min des abouts |
| Contremarche, nez de marche, rive de terrasse | devis cite marches ou rive habillée | ml de rive | barres | rangement 5.3 |

### 9.2 Consommables (par chantier)

| Consommable | Règle | Unité | Statut |
| --- | --- | --- | --- |
| Capuchons cache-vis de cadre | = nombre de vis de cadre | boîte de 100 | sourcé (fischer ADT, 100 par unité de vente) |
| Fond de joint (cordon mousse PE) | = ml de mastic extérieur, diamètre ≈ 1,25 × largeur du joint | rouleau (longueur à vérifier) | à vérifier |
| Nettoyant mousse PU | 1 pour 6 aérosols de mousse | aérosol 500 ml | à vérifier |
| Cales de pose | 1 sachet pour 8 menuiseries | sachet | à vérifier |
| Forets béton Ø 6 mm (vis FFS) | 1 pour 40 trous dans le béton, 1 pour 100 en brique | u | à vérifier |
| Embouts T30 | 1 pour 200 vis | u | à vérifier |
| Ruban de masquage | 1 rouleau pour 10 menuiseries (protection mastic) | rouleau | à vérifier |
| Lingettes ou dégraissant | 1 par chantier | u | à vérifier |
| Colle de fixation (chambranles, plinthes) | 1 cartouche pour 3 portes, 1 cartouche pour 12 ml de plinthes | cartouche | à vérifier |
| Pointes tête homme (plinthes clouées) | 1 boîte pour 50 ml | boîte | à vérifier |
| Kit de pose parquet (cales, tire-lame, cale de frappe) | 1 par chantier si l'artisan n'en a pas | kit | facultatif, désactivé par défaut |
| Bande bitumineuse de lambourde | = ml de lambourdes | rouleau | à vérifier |
| Lames de scie, disques | jamais générés automatiquement | — | outillage de l'artisan, hors quantitatif |

Règle : les consommables à « à vérifier » sont proposés **décochés** tant que l'artisan ne les a pas validés une fois ; ses choix deviennent ses habitudes (niveau artisan).

## 10. Cas de test (`tests/`)

Cinq cas synthétiques calculés avec les formules de la section 5 (script de vérification exécuté le 3 oct. 2026) ; ils testent le moteur, pas la réalité du chantier. Ils seront remplacés par 10 devis réels anonymisés et les commandes réellement passées par un menuisier, avec écart toléré.

Critères de validation avant bêta : 10 cas réels, chaque ligne dans la tolérance, aucune question sur une quantité, aucune menuiserie commandée sans cotes ni mention « à relever ».

```json
[
  {
    "id": "menu-001",
    "source": "synthétique, à remplacer par un devis réel",
    "contexte": { "departement": "22", "littoral": true, "type_pose": "fen_depose_totale", "support": "creux", "habillages": "dedans" },
    "devis": [
      { "ouvrage": "fenetre PVC 2V OF", "L": 1.20, "H": 1.35, "qte": 3 },
      { "ouvrage": "fenetre PVC 1V OB", "L": 0.60, "H": 0.75, "qte": 1 },
      { "ouvrage": "porte-fenetre PVC 2V", "L": 1.40, "H": 2.15, "qte": 1 }
    ],
    "attendu": [
      { "article": "fenêtre PVC 2V 1200 × 1350, cotes devis à confirmer", "quantite": 3, "unite": "u", "bloc": "fabricant" },
      { "article": "fenêtre PVC 1V OB 600 × 750", "quantite": 1, "unite": "u", "bloc": "fabricant" },
      { "article": "porte-fenêtre PVC 2V 1400 × 2150", "quantite": 1, "unite": "u", "bloc": "fabricant" },
      { "article": "vis de cadre fischer FFS 7,5 × 152 (56 fixations)", "quantite": 1, "unite": "boîte 100", "tolerance_pct": 0 },
      { "article": "capuchons cache-vis blancs", "quantite": 1, "unite": "boîte 100", "tolerance_pct": 0 },
      { "article": "mousse imprégnée TP600 15/3-7", "quantite": 4, "unite": "rouleau 8 m", "tolerance_pct": 0 },
      { "article": "mousse PU pistolet 750 ml", "quantite": 2, "unite": "aérosol", "tolerance_pct": 0 },
      { "article": "mastic acrylique intérieur blanc 310 ml", "quantite": 2, "unite": "cartouche", "tolerance_pct": 0 },
      { "article": "plat PVC blanc 100 mm", "quantite": 8, "unite": "barre 3 m", "tolerance_pct": 0 },
      { "article": "cales de pose assorties", "quantite": 1, "unite": "sachet", "tolerance_pct": 0 }
    ],
    "questions_max": 3
  },
  {
    "id": "menu-002",
    "source": "synthétique",
    "contexte": { "departement": "35", "littoral": false, "type_pose": "fen_neuf_applique_int", "support": "beton" },
    "devis": [
      { "ouvrage": "fenetre alu 2V", "L": 1.20, "H": 1.25, "qte": 4 },
      { "ouvrage": "fenetre alu 1V", "L": 0.80, "H": 0.95, "qte": 1 },
      { "ouvrage": "baie coulissante alu 2V", "L": 2.40, "H": 2.15, "qte": 1 }
    ],
    "attendu": [
      { "article": "menuiseries alu (6 lignes fabricant, tapées et pattes fournies)", "quantite": 6, "unite": "u", "bloc": "fabricant" },
      { "article": "chevilles pour pattes de fixation (70 fixations)", "quantite": 1, "unite": "boîte 100", "tolerance_pct": 0, "statut": "type de cheville à vérifier" },
      { "article": "mousse imprégnée TP600 15/3-7", "quantite": 5, "unite": "rouleau 8 m", "tolerance_pct": 0 },
      { "article": "bande étanchéité à l'air SIGA Fentrim IS 20 100 mm", "quantite": 2, "unite": "rouleau 25 m", "tolerance_pct": 0 },
      { "article": "cales de pose assorties", "quantite": 1, "unite": "sachet", "tolerance_pct": 0 }
    ],
    "note": "la baie coulissante garde l'entraxe 0,80 m tant que la règle coulissant (0,30 m) n'est pas validée : à recalculer ensuite",
    "questions_max": 2
  },
  {
    "id": "menu-003",
    "source": "synthétique",
    "contexte": { "departement": "69", "type_pose": "fen_reno_dormant", "habillages": "dedans_dehors" },
    "devis": [ { "ouvrage": "fenetre PVC 2V renovation", "L": 1.00, "H": 1.25, "qte": 4 } ],
    "attendu": [
      { "article": "fenêtre PVC 2V rénovation 1000 × 1250, aile de recouvrement", "quantite": 4, "unite": "u", "bloc": "fabricant" },
      { "article": "vis de fixation dans dormant bois existant (40 fixations)", "quantite": 1, "unite": "boîte 100", "tolerance_pct": 0, "statut": "référence à vérifier" },
      { "article": "mastic MS polymère blanc 290 ml (extérieur)", "quantite": 4, "unite": "cartouche", "tolerance_pct": 0 },
      { "article": "mastic acrylique intérieur blanc 310 ml", "quantite": 2, "unite": "cartouche", "tolerance_pct": 0 },
      { "article": "mousse PU pistolet 750 ml", "quantite": 2, "unite": "aérosol", "tolerance_pct": 0 },
      { "article": "plat PVC blanc 100 mm (intérieur)", "quantite": 6, "unite": "barre 3 m", "tolerance_pct": 0 },
      { "article": "cornière PVC blanc 40 × 40 (extérieur)", "quantite": 6, "unite": "barre 3 m", "tolerance_pct": 0 },
      { "article": "cales de pose assorties", "quantite": 1, "unite": "sachet", "tolerance_pct": 0 }
    ],
    "questions_max": 1
  },
  {
    "id": "menu-004",
    "source": "synthétique",
    "contexte": { "departement": "44", "sol": "chape", "pose_parquet": "droite", "chambranles": "deux_faces" },
    "devis": [
      { "ouvrage": "bloc-porte isoplane 204 × 83", "qte": 5 },
      { "ouvrage": "parquet contrecollé flottant Quick-Step Compact 2200", "surface_m2": 45 },
      { "ouvrage": "plinthes", "pieces": ["séjour 6 × 5, 2 portes", "chambre 3 × 3,5, 1 porte", "bureau 3 × 1,5, 1 porte"] }
    ],
    "attendu": [
      { "article": "bloc-porte 204 × 83, sens à préciser", "quantite": 5, "unite": "u" },
      { "article": "jeu de chambranles", "quantite": 10, "unite": "jeu", "tolerance_pct": 0 },
      { "article": "mousse PU 750 ml", "quantite": 2, "unite": "aérosol", "tolerance_pct": 0 },
      { "article": "colle de fixation 290 ml", "quantite": 2, "unite": "cartouche", "tolerance_pct": 0 },
      { "article": "Quick-Step Compact 2200 × 145 (1,914 m²/paquet), 7 % de chutes", "quantite": 26, "unite": "paquet", "tolerance_pct": 4 },
      { "article": "sous-couche parquet (rouleau 15 m² supposé)", "quantite": 4, "unite": "rouleau", "tolerance_pct": 0 },
      { "article": "film PE 200 µm (rouleau 50 m² supposé)", "quantite": 2, "unite": "rouleau", "tolerance_pct": 0 },
      { "article": "plinthe MDF blanc 70 mm (40,7 ml)", "quantite": 18, "unite": "barre 2,40 m", "tolerance_pct": 6 },
      { "article": "barre de seuil", "quantite": 3, "unite": "u", "tolerance_pct": 0 }
    ],
    "questions_max": 2
  },
  {
    "id": "menu-005",
    "source": "synthétique",
    "contexte": { "departement": "29", "littoral": true, "essence": "pin classe 4" },
    "devis": [ { "ouvrage": "terrasse bois pin autoclave 27 × 145", "A_m": 6.0, "B_m": 4.0 } ],
    "attendu": [
      { "article": "lame pin classe 4 27 × 145", "quantite": 57, "unite": "barre 4,20 m", "tolerance_pct": 5 },
      { "article": "lambourde pin classe 4 45 × 70 (15 + 2 doublées)", "quantite": 17, "unite": "barre 4,80 m", "tolerance_pct": 6 },
      { "article": "vis terrasse inox A4 5 × 60 (littoral)", "quantite": 5, "unite": "boîte 200", "tolerance_pct": 0 },
      { "article": "plots réglables", "quantite": 136, "unite": "u", "tolerance_pct": 5 }
    ],
    "questions_max": 1
  }
]
```

## 11. Ratios à faire valider par un menuisier (`ratios-a-valider.md`)

Quinze valeurs à faire relire en une heure par un menuisier-poseur ; les cinq premières pèsent le plus sur la commande. Chaque case cochée passe la valeur de « à vérifier » à « validé ».

| # | Ratio ou règle | Valeur actuelle | Question à poser au menuisier | Validé |
| --- | --- | --- | --- | --- |
| 1 | Rendement chantier mousse PU | 15 m de joint par aérosol 750 ml | « Combien de fenêtres tu fais avec une bombe de mousse ? » (attendu : environ 3) | - \[ \] |
| 2 | Fixations par fenêtre | 2 × n(H) + n(L) + n(L) si L > 0,90 m, a = 0,15 m, e = 0,80 m | « Pour une 120 × 135, tu mets combien de vis ? » (formule : 12) | - \[ \] |
| 3 | Règle coulissant | entraxe 0,60 m provisoire ; note DTU « 0,30 m » à interpréter | « Sur une baie coulissante, tu espaces tes fixations de combien ? » | - \[ \] |
| 4 | Section de compribande par défaut | TP600 15/3-7 en rouleau de 8 m ; 15/7-14 en ancien | « Quelle bande tu prends le plus souvent ? » | - \[ \] |
| 5 | Habillages | 3 côtés (haut + 2 montants), barres 3 m, +5 cm par coupe d'onglet | « Tu habilles 3 ou 4 côtés ? Tes barres font quelle longueur ? » | - \[ \] |
| 6 | Mastic extérieur | joint 10 × 5 mm, 5,2 m par cartouche, P × 1,10 | « Une cartouche de MS, ça te fait combien de fenêtres ? » | - \[ \] |
| 7 | Mastic acrylique intérieur | 14 m par cartouche, sur tout le périmètre | « Tu joints l'habillage intérieur partout ? » | - \[ \] |
| 8 | Cales | 1 sachet pour 8 menuiseries | « Un sachet de cales te dure combien de fenêtres ? » | - \[ \] |
| 9 | Tapées et pattes livrées par le fabricant | oui par défaut | « Tu les commandes à part ou elles viennent avec la fenêtre ? » | - \[ \] |
| 10 | Pertes parquet | droite 7 %, décrochés 10 %, diagonale 12 %, bâtons rompus 15 % | « Quel pourcentage de chutes tu prévois ? » | - \[ \] |
| 11 | Conditionnements parquet par défaut | colis 2,0 m², sous-couche 15 m², film PE 50 m² | « Quels formats ton négoce te livre ? » | - \[ \] |
| 12 | Chambranles | jeu = 2 montants + 1 traverse, 2 faces par défaut | « Tu poses des chambranles des deux côtés ? Quelle longueur ? » | - \[ \] |
| 13 | Terrasse : entraxe lambourdes | 0,45 m pour lame 27 × 145 pin | « Tu mets tes lambourdes tous les combien ? » | - \[ \] |
| 14 | Terrasse : plots | 1 tous les 0,60 m par lambourde + 1 | « Combien de plots sous une lambourde de 4 m ? » (formule : 8) | - \[ \] |
| 15 | Longueur des vis de cadre | dormant 70 + jeu 10 + ancrage support, arrondi catalogue | « En brique creuse, tu prends quelle longueur de vis ? » (formule : 152) | - \[ \] |

En plus, faire valider les longueurs et conditionnements marqués « à vérifier » en section 4.9 auprès d'un négoce de la région du premier artisan testeur (Bretagne).

## 12. Sources officielles

Les textes des NF DTU sont payants (Boutique CSTB) : les valeurs reprises ici viennent de pages qui les citent ; à recouper sur le texte officiel avant la bêta. Pages consultées le 3 oct. 2026.

| Domaine | Source | Ce qu'on en tire |
| --- | --- | --- |
| NF DTU 36.5 fixations | [Louineau, normes pattes de fixation](https://www.louineau.com/les-normes/dtu/) | entraxe 0,80 m, 0,25 m des angles, note coulissants |
| NF DTU 36.5 fixations | [normesdtuposemenuiserie.com, les fixations](https://www.normesdtuposemenuiserie.com/les-fixations/) | 100 mm des axes de rotation, appui immobilisé > 0,90 m, vis sans cheville proscrite en applique intérieure |
| NF DTU 36.5 calfeutrement | [normesdtuposemenuiserie.com, le calfeutrement](https://www.normesdtuposemenuiserie.com/le-calfeutrement/) | calfeutrement sec, mousse imprégnée, pas de raccord en appui, mastic selon DTU 44.1 |
| NF DTU 36.5 | [Würth, détails du DTU 36.5](https://infos.wurth.fr/menuiserie-les-details-de-la-norme-dtu-36-5-pour-les-poses-de-fenetres/) | mousse PU interdite en calfeutrement, cales ≥ 5 mm |
| NF DTU 36.5 | [Norba, fixation des menuiseries](https://www.norba-menuiserie.com/norba/reglementations/dtu-36-5/dtu-36-5-la-fixation-des-menuiseries/) | PVC : 50 à 100 mm des angles |
| Mousse imprégnée | [illbruck TP600, fiche technique 2022-09 (Gedimat)](https://uploads.gedimat.fr/DOCUMENT/TYPE1/0000126407074.pdf) | sections, longueurs de rouleaux, cartons |
| Mousse PU | [Soudal Soudafoam Gun Low Expansion, fiche 15/04/2022](https://www.soudal.com/sites/default/files/soudal_api/document/F0032942_0001.pdf) | 750 ml, 42 L, 31 m de joint |
| Mastic | [Soudal Soudaseal 240 FC, fiche technique](https://devtec.co.il/wp-content/uploads/2020/01/devtec_tds_SOUDASEAL_240FC.pdf) | 290 ml / 600 ml, largeur = 2 × profondeur |
| Vis de cadre | [fischer FFS, catalogue](https://media.trenois.com/static/vis-traversante-tete-fraisee-torx-acier-zingue-blanc_fis250_fiche-technique.pdf) ; [fischer FFS, fiche technique](https://medias.descours-cabaud.com/d180001/medias/docus/274/2016-FFS_fiche%20technique.pdf) | longueurs 42 à 212 mm, boîte de 100, ancrages par support |
| Étanchéité à l'air | [SIGA Fentrim IS 20, fiche 29.10.2024](https://media.hornbach.ch/hb/technicaldatasheet/as.133013559.pdf) ; [SIGA Fentrim 20](https://www.siga.swiss/global_en/products/fentrim/fentrim-20) | rouleaux 25 m, largeurs, cartons |
| Habillages PVC | [Quadroform plat 100 × 3 m](https://www.bricocash.fr/p/profil-plat-pvc-100mm-blanc-3m/8681612500182) ; [cornières PVC 10 × 3 m](https://www.hellopro.fr//documentation/pdf_prod/3/7/2/244610_c8c253a82272679ac1dcc80fd24e685b.pdf) | barres 3 m |
| Blocs-portes | [Pascobois](https://pascobois.fr/dimensions-portes-interieures/) ; [la-lourde.fr](https://www.la-lourde.fr/en/post/quel-est-la-difference-entre-la-dimension-hors-tout-la-reservation-et-le-jeu-necessaire-pour-une-pose-parfaite) ; [Chausson](https://www.chausson.fr/materiaux/bloc-porte-bois-isoplane-ame-pleine-204cm-73cm-poussant-droit-p-229317-1) | 204 × 63/73/83/93, hors tout, réservation |
| NF DTU 51.11 parquet flottant | [Le Moniteur](https://www.lemoniteur.fr/article/nf-dtu-51-11-pose-flottante-des-parquets.1133354) ; [legalnest](https://www.legalnest.fr/batiment/dtu/51-11-pose-de-parquet-flottant) ; [Batirama](https://www.batirama.com/article/2277-nf-dtu-51.11-parquets-flottants.html) ; \[CSTB, version mai 2024\](https://boutique.cstb.fr/detail/documents-techniques-unifies/dtu-nf-dtu/51-parquets/dtu-51-11-pose-flottante-parquets-ed-05-2024-(udt5) | jeu 0,15 % min 8 mm, fractionnement 8 m, film PE ≥ 150 µm |
| Parquet NF | [NF Parquet, mise en œuvre flottante](https://www.nf-parquet.fr/wp-content/uploads/2019/05/pose-flottante-ChD.pdf) | film 200 µm, recouvrement 20 cm |
| Parquet produits | [Quick-Step Compact](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1545127.pdf) ; [Disegno](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1545135.pdf) ; [Impressive](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_952917.pdf) ; [vinyle 4 mm](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1545298.pdf) | m² par paquet, lames par paquet |
| NF DTU 51.4 terrasse | [NF DTU 51.4 P1-1 (extrait diffusé)](https://l-idee-bois.com/wp-content/uploads/2020/06/NFDTU51-4P1-1PlatelageBoisext.pdf) ; [Guide FCBA terrasses bois](https://franceboisforet.fr/wp-content/uploads/2020/06/Guide_Terrasse-FNB-LCB-ATB-ARBUST-FCBA_avec_liens_BD.pdf) ; [Novi-clous](https://blog.novi-clous.fr/dtu-51-4-pour-terrasse-bois/) | inox A2/A4, portée lambourde 0,60/0,70 m, 2 vis par croisement, hauteur lambourde ≥ 1,5 × lame |
| Marché | [étude P&P 2023 (L'Écho de la baie)](https://www.lechodelabaie.fr/tendances/le-marche-de-la-fenetre-en-france/) ; [Le Moniteur 2024](https://www.lemoniteur.fr/article/le-marche-de-la-fenetre-tangue-toujours.2335020) | PVC 60 %, alu 30 %, bois 10,1 %, dépose totale 60,1 % |
| Bord de mer | [INC, CA Rennes 2 nov. 2023](https://www.inc-conso.fr/node/16505) ; [Technal, prescription](https://technal.com/link/efa2f66198124982bc25d01bee703d70.aspx) | laquage qualité marine en littoral |

À acheter ou consulter pour la bêta : NF DTU 36.5 P1-1 et P1-2 (texte intégral), NF DTU 36.2 (menuiseries intérieures bois), NF DTU 44.1 (mastics), NF DTU 51.4 (tableaux 7, 12, 15 d'entraxes), NF DTU 51.11 de mai 2024.
