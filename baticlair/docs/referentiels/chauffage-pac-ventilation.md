# Référentiel quantitatif CHAUFFAGE / PAC / VENTILATION (Rappidos)

Oct 3, 2026 · @Greg

Tiroir métier `chauffage` pour le moteur générique BatiClair, au format de la section 27 du référentiel couverture : 14 chapitres, mêmes fichiers (`metier.json`, `ouvrages.json`, `materiaux.json`, `regles.json`, `defauts.json`, `questions.json`, `vocabulaire.json`, `ratios-a-valider.md`, `tests/`, `CHANGELOG.md`). Version 0.1.0, maturité « alpha » : toute valeur sans source est marquée **(à vérifier)** et doit être relue par un chauffagiste-frigoriste avant la bêta.

Périmètre : pompes à chaleur air/eau et air/air (split, multisplit, gainable), plancher chauffant hydraulique, réseaux et émetteurs (radiateurs), chaudières gaz à condensation en remplacement, chauffe-eau thermodynamique, VMC simple flux et double flux, conduits de fumée pour poêles à granulés. Hors périmètre : sanitaire et évacuations (tiroir plomberie), électricité de puissance au-delà de la liaison PAC (tiroir électricité), gros conduits ERP/tertiaire.

## 1. Métier et axes de variation

Le chauffagiste vend des **appareils déjà nommés dans le devis** (PAC, radiateurs, VMC) : le quantitatif porte surtout sur ce qui les relie (tubes, liaisons frigorifiques, gaines, raccords, supports, consommables). C'est là que l'artisan perd du temps et de l'argent, et c'est là que l'app doit être précise. L'axe dominant n'est pas la région mais **neuf ou rénovation** et **l'époque du bâti** (ce qu'on trouve en place).

### 1.1 Fiche d'identité `metier.json`

```json
{
  "code": "chauffage",
  "nom": "Chauffage - PAC - ventilation",
  "version": "0.1.0",
  "normes": ["NF DTU 65.16", "NF DTU 65.14", "NF DTU 65.11", "NF DTU 65.10", "NF DTU 60.5", "NF DTU 68.3", "NF DTU 24.1", "NF DTU 61.1", "Arrêté du 24 mars 1982 (aération)", "Règlement UE 517/2014 (F-gaz)"],
  "axes_de_variation": {
    "geographie": "faible",
    "epoque_bati": "fort",
    "type_batiment": "moyen",
    "neuf_renovation": "fort",
    "gamme": "faible"
  },
  "metiers_lies": ["plomberie", "electricite", "isolation", "platrerie", "maconnerie"],
  "unites_de_commande": ["u", "couronne", "barre", "rouleau", "carton", "sachet", "kit", "bouteille", "palette", "botte"],
  "maturite": "alpha"
}
```

### 1.2 Poids de chaque axe

| Axe | Poids | Ce qu'il change dans le quantitatif | Comment le moteur le résout |
| --- | --- | --- | --- |
| neuf\_renovation | fort | Réno : dépose, raccords de transition (acier/cuivre → multicouche), désembouage, pot à boues, rebouchage de saignées, gaines VMC à passer en combles existants. Neuf : réseau complet, fourreaux, plancher chauffant | lu dans le devis (« dépose », « remplacement ») ; sinon question Q1 |
| epoque\_bati | fort | Avant 1975 : radiateurs fonte, tubes acier, pas de VMC, conduits maçonnés à tuber. 1975-2000 : cuivre, VMC autoréglable à remplacer. Après 2012 : PER/multicouche, VMC hygro existante | question Q2 seulement si réno et non déductible |
| type\_batiment | moyen | Maison = unité extérieure au sol ou en façade ; appartement = support balcon, VMC collective (pas de caisson), gaz collectif | adresse (n° d'appartement) ou devis ; sinon défaut maison |
| geographie | faible | Zone climatique H1/H2/H3 (déjà intégrée dans la puissance du devis) ; littoral → visserie et supports inox ; altitude > 900 m ou zone neige → châssis surélevé de l'unité extérieure | département de l'adresse (`commun/departements.json`) ; jamais une question |
| gamme | faible | Change la référence (marque, modèle), pas la méthode | lue dans le devis |

Conséquence pour le moteur : la question de région n'est **jamais** posée. Les questions portent sur ce qu'aucun devis n'écrit : distances (unité extérieure ↔ intérieure), emplacement de l'unité extérieure, réseau existant conservé ou non.

## 2. Règle d'or et unités de commande

**Règle d'or : aucune ligne du quantitatif en m², en m³/h ou en kW.** Un chauffagiste ne commande pas « 80 m² de plancher chauffant » ni « 25 m de liaison » : il commande des couronnes, des cartons, des sachets, des kits, des barres. Les m² et les mètres ne servent qu'au calcul ; la sortie est toujours arrondie au conditionnement supérieur réellement vendu par le négoce.

### 2.1 Unités de commande par famille

| Famille | Unité de commande | Conditionnements négoce courants | Arrondi |
| --- | --- | --- | --- |
| Appareils (PAC, chaudière, VMC, ballon, radiateur) | u | à l'unité, référence exacte du devis | aucun, recopié du devis |
| Liaison frigorifique bi-tube isolée | couronne | 3, 5, 10, 20, 50 m ([Cedeo](https://www.cedeo.fr/c/couronnes-de-cuivre-pre-isolees/x5snv5_dig_2008715R6), [Comptoir des Pros](https://www.comptoirdespros.com/chauffage/climatiseur-et-ventilateur/liaison-frigorifiques/bi-tube-frigorifique.html)) | plus petite combinaison de couronnes ≥ besoin |
| Liaison frigorifique mono-tube isolée | couronne | 25 m ([Reynolds via Comptoir des Pros](https://www.comptoirdespros.com/tube-cuivre-frigorifique-isole-m1-3-8-12x17mm.html)) | couronne entière |
| Tube PER BAO plancher chauffant | couronne | 120 m, 240 m ([Roth via Cedeo](https://www.cedeo.fr/p/chauffage-et-climatisation/tube-maxipro-16x1-5-120m-ref-1409020129-A6909720), [PER BAO 240 m](https://planchez-moi.fr/tube-plancher-chauffant/32-tube-per-avec-bao-16x15-.html)) | une boucle = une seule longueur sans raccord |
| Tube multicouche nu ou gainé | couronne ou barre | couronnes 50, 100, 200 m ; barres 4 ou 5 m ([Cedeo multicouches](https://www.cedeo.fr/c/tubes-multicouche-nus/x4snv4_dig_2028098R7)) | couronne entière |
| Gaine VMC souple | carton ou filet | 6 m (10 m sur certaines références) ([Aldes Algaine](https://www.aldes.fr/produits/reseaux/reseaux-maison-individuelle/reseau-flexible/algaine-standard-armee-fibre)) | carton entier |
| Goulotte de liaison PAC/clim | barre | 2 m ([Artiplastic via Cedeo](https://www.cedeo.fr/p/chauffage-et-climatisation/goulotte-80x60mm-longueur-2ml-couleur-ivoire-ref-0812bcf-A1540387)) | barre entière |
| Panneau isolant plancher chauffant | panneau puis paquet | plaque à plots utile 1,12 × 0,84 m ([PUM](https://www.mypum.fr/alimentation-ecfs-chauffage/plancher-chauffant/plaques-isolantes-plancher-chauffant/plaque-plane-et-a-plots/produits/P0350?articleId=71050)) ; panneau lisse 1,2 × 1 m ([Point.P Maxisol](https://www.pointp.fr/p/platre-isolation-ite/panneau-isolant-pour-sol-pse-maxisol-50-mm-1-2x1-0-m-r-1-45-m2-A1684786)) | panneau entier, puis paquet si connu |
| Bande périphérique plancher chauffant | rouleau | 50 m ([Velta / Afriso](https://www.groupeafriso.fr/catalogue/accessoires-velta/isolant-de-bordure.html)) | rouleau entier |
| Tuyau de condensats | rouleau | 30 m, 50 m ([Cedeo](https://www.cedeo.fr/p/chauffage-et-climatisation/passage-de-mur-pour-goulotte-80x60-0810pm-A1540401)) | rouleau entier |
| Conduit de fumée concentrique (granulés) | u (élément) | éléments droits 1 m, 0,45 m, 0,25 m, réglables ([Poujoulat PGI](https://www.poujoulat.fr/fr/uploads/media/fiches-interactives/fiche_PGI_80_130_interactive-1.pdf)) | combinaison d'éléments ≥ hauteur |
| Raccords, colliers, chevilles | sachet ou boîte | sachet 2, 5, 10 ; boîte 50, 100 (à vérifier par négoce) | sachet entier |
| Fluide frigorigène complémentaire | bouteille | selon fluide et négoce (à vérifier) | une bouteille si charge > 0 |
| Isolant de tube (manchon) | barre | 2 m (à vérifier) | barre entière |

### 2.2 Ce qui n'est jamais une ligne de commande

Main-d'œuvre, mise en service, attestation de capacité fluide, Consuel, certificat de ramonage, déplacement, location de nacelle, évacuation en déchetterie. L'app les garde dans le résumé du chantier, jamais dans le quantitatif.

## 3. Ouvrages, vocabulaire des devis et pièges

Dix ouvrages couvrent l'essentiel des devis de chauffagiste en maison individuelle. Chacun devient une clé de `ouvrages.json` et une entrée de `vocabulaire.json`. Un mot inconnu déclenche une question, jamais une supposition.

| Code ouvrage | Ce que l'artisan réalise | Expressions courantes dans les devis | Pièges |
| --- | --- | --- | --- |
| `pac_air_eau` | PAC air/eau bibloc ou monobloc raccordée au circuit de chauffage | « PAC air/eau », « Alfea », « Altherma », « Ecodan », « Aroténa », « bibloc », « monobloc », « module hydraulique », « 8 kW », « 11 kW » | **monobloc** = liaison hydraulique eau (pas de cuivre frigo) ; **bibloc** = liaison frigorifique. Lire le mot exact. « Hybride » = PAC + chaudière, deux ouvrages |
| `pac_air_air_split` | Climatisation réversible mono ou multisplit | « clim réversible », « split », « monosplit », « bisplit », « tri-split », « 2,5 kW », « unité murale », « console » | « bisplit » = 1 groupe + 2 unités intérieures = 2 liaisons ; le nombre d'unités intérieures pilote tout |
| `pac_air_air_gainable` | Gainable en combles ou faux plafond | « gainable », « plénum », « bouches de soufflage », « grille de reprise » | réseau de gaines isolées + plénums ; proche de la VMC dans le calcul |
| `plancher_chauffant_hydraulique` | Plancher chauffant basse température sous chape | « PCBT », « plancher chauffant », « plancher rafraîchissant », « PCRBT », « collecteur 6 départs », « pas de 15 » | la chape est souvent faite par le maçon : ne pas la compter sauf si écrite |
| `reseau_radiateurs` | Création ou reprise du réseau de radiateurs | « radiateur acier », « panneaux type 22 », « 600 × 1000 », « robinet thermostatique », « réseau multicouche », « nourrice », « pieuvre » | « remplacement à l'identique » = pas de réseau neuf ; « déplacement » = un piquage par radiateur |
| `chaudiere_gaz_condensation` | Remplacement de chaudière gaz | « chaudière condensation », « Naia », « Thema », « micro-accumulée », « ventouse », « VMC gaz » | **ventouse** horizontale ou verticale = kit différent ; « conduit existant à tuber » = tubage flexible |
| `chauffe_eau_thermo` | Chauffe-eau thermodynamique (CET) | « CET », « ballon thermodynamique », « Calypso », « Aquacosy », « 200 L », « 270 L », « sur air extérieur » | « sur air extérieur » = 2 gaines Ø160 vers l'extérieur ; « air ambiant » = aucune gaine |
| `vmc_simple_flux` | VMC autoréglable ou hygroréglable | « VMC simple flux », « hygro A », « hygro B », « Easyhome », « Hygrocosy », « bouche cuisine », « entrée d'air » | « hygro B » = entrées d'air hygroréglables (pas autoréglables) ; « VMC gaz » = autre matériel |
| `vmc_double_flux` | VMC double flux avec échangeur | « double flux », « DF », « Dee Fly », « échangeur », « insufflation », « bouches de soufflage » | deux réseaux (soufflage + extraction) + 2 gaines Ø160 extérieures isolées |
| `poele_granules_fumisterie` | Pose d'un poêle à granulés et de son conduit | « poêle à granulés », « poêle à pellets », « conduit concentrique », « PGI », « tubage », « ventouse 80/130 », « sortie de toit » | « tubage » = conduit maçonné existant (flexible) ; « création de conduit » = éléments rigides + sortie de toit |

### 3.1 Pièges transverses

- **La puissance n'est pas une quantité.** « PAC 11 kW » désigne un appareil ; ne jamais en déduire des mètres de tube.
- **« Fourniture et pose » vs « pose seule ».** Si l'appareil est fourni par le client, il sort du quantitatif mais ses accessoires de pose restent.
- **Kits fabricant.** Beaucoup de PAC et CET se vendent avec un kit (support, flexibles, filtre). Si le devis nomme le kit, ne pas recommander ses composants séparément.
- **Marques citées comme noms communs.** « Velta » (plancher), « Algaine » (gaine VMC), « Artiplastic » (goulotte) : lire comme une famille de produit, garder la marque en désignation modifiable.
- **Réseau existant conservé.** « Raccordement sur réseau existant » = 2 raccords de transition et un désembouage, pas un réseau neuf.

## 4. Matériaux et fiches fabricant

Chaque ligne ci-dessous devient une entrée de `materiaux.json` avec son champ `source`. Le conditionnement vient de la fiche négoce (c'est le négoce qui livre), la donnée technique de la fiche fabricant. Les appareils eux-mêmes (PAC, VMC, chaudière) ne sont pas listés : ils sont recopiés du devis.

### 4.1 Liaisons frigorifiques (PAC bibloc, splits)

| Article | Dimensions | Conditionnement | Poids | Source |
| --- | --- | --- | --- | --- |
| Liaison bi-tube isolée M1 1/4 – 3/8 | cuivre 6,35 / 9,52 mm, ép. 0,8 mm, isolant 8 mm | couronnes 3, 4, 5, 10, 20, 50 m | à vérifier | [Cedeo Talos 20 m](https://www.cedeo.fr/p/chauffage-et-climatisation/liaison-frigorifique-isolee-double-m1-1-4-3-8-epaisseur-cuivre-A1540495), [Cedeo pré-dudgeonnée 4 m](https://www.cedeo.fr/p/chauffage-et-climatisation/liaison-frigorifique-predudgeonnee-db-1-4-3-8-epaisseur-cuivre-A1544757), [Climshop 3/5/10 m](https://www.climshop.com/859-liaison-frigorifique-4m-7m.html) |
| Liaison bi-tube isolée M1 1/4 – 1/2 | 6,35 / 12,7 mm | couronnes 10, 20, 50 m | à vérifier | [Comptoir des Pros](https://www.comptoirdespros.com/tube-cuivre-frigorifique-isole-m1-3-8-12x17mm.html) |
| Liaison bi-tube isolée M1 3/8 – 5/8 | 9,52 / 15,88 mm | couronnes 10, 20 m | à vérifier | [Comptoir des Pros](https://www.comptoirdespros.com/tube-cuivre-frigorifique-isole-m1-3-8-12x17mm.html) |
| Tube mono isolé M1 1/4, 3/8, 1/2, 5/8, 3/4, 7/8 | isolant 9 mm, cuivre 0,8 mm | couronne 25 m | à vérifier | [Reynolds via Comptoir des Pros](https://www.comptoirdespros.com/tube-cuivre-frigorifique-isole-m1-3-8-12x17mm.html), [Climaffaires](https://www.climaffaires.com/428-liaisons-frigorifiques) |

Le diamètre ne se choisit pas : il est imposé par la notice de l'unité extérieure. L'app le lit dans le devis ou, à défaut, applique la table par défaut de la section 6 et l'affiche comme hypothèse.

### 4.2 Goulotte, condensats, supports (PAC et splits)

| Article | Dimensions | Conditionnement | Poids | Source |
| --- | --- | --- | --- | --- |
| Goulotte PVC 80 × 60 | 2 m | barre | 1,5 kg | [Artiplastic 0812BCF via Cedeo](https://www.cedeo.fr/p/chauffage-et-climatisation/goulotte-80x60mm-longueur-2ml-couleur-ivoire-ref-0812bcf-A1540387) |
| Goulotte PVC 110 × 75 (multisplit, bibloc gros diamètre) | 2 m | barre | à vérifier | [Cedeo Artiplastic](https://www.cedeo.fr/les-marques/artiplastic) |
| Accessoires goulotte : sortie de mur, passage de mur, angle intérieur, angle extérieur, angle plat, joint, bouchon | 80 × 60 ou 110 × 75 | u | — | [Cedeo goulottes et accessoires](https://www.cedeo.fr/c/goulottes-et-accessoires/x4snv4_dig_2008722R6) |
| Tuyau de condensats Ø16 | — | rouleau 30 m ou 50 m | — | [Cedeo 0016TU 30 m](https://www.cedeo.fr/p/chauffage-et-climatisation/passage-de-mur-pour-goulotte-80x60-0810pm-A1540401), [Cedeo 16/18 50 m](https://www.cedeo.fr/p/chauffage-et-climatisation/liaison-frigorifique-predudgeonnee-db-1-4-3-8-epaisseur-cuivre-A1544757) |
| Support mural unité extérieure (équerres) | selon poids du groupe | kit | à vérifier | fiche fabricant du groupe |
| Plots antivibratiles / silent-blocs | 4 par groupe | jeu de 4 | à vérifier | exigence [NF DTU 65.16 résumée par Cedeo](https://www.cedeo.fr/dtu-6516-installation-de-pompe-chaleur) |

### 4.3 Tubes hydrauliques

| Article | Dimensions | Conditionnement | Poids | Source |
| --- | --- | --- | --- | --- |
| Tube PER BAO plancher chauffant 16 × 1,5 | Ø16 | couronne 240 m | à vérifier | [Planchez-moi](https://planchez-moi.fr/tube-plancher-chauffant/32-tube-per-avec-bao-16x15-.html) |
| Tube PE-RT BAO Maxipro 16 × 1,5 (Roth) | Ø16, rayon de courbure 5 × Ø, 6 bar, 70 °C | couronne 120 m | à vérifier | [Cedeo réf. 1409020129](https://www.cedeo.fr/p/chauffage-et-climatisation/tube-maxipro-16x1-5-120m-ref-1409020129-A6909720) |
| Tube multicouche nu 16 × 2 | Ø16 | couronnes 50, 100, 200 m ; barres 4 ou 5 m | 10,5 kg (100 m) ; 21,13 kg (200 m) ; 0,103 kg/m (Rehau) | [Cedeo Altech 100 m](https://www.cedeo.fr/p/plomberie/tube-multicouche-altech-16x2-couronne-100m-A4434763), [Cedeo Wavin 200 m](https://www.cedeo.fr/p/plomberie/tube-multicouche-16x2-200m-A6259109), [Cedeo Rehau 50 m](https://www.cedeo.fr/p/plomberie/tube-rautherm-multi-diametre-16x2-couronne-50-m-ref-368012-050-A3549898) |
| Tube multicouche gainé ou isolé 16 × 2 / 20 × 2 | gaine rouge ou bleue | couronne 50 m (isolé), 100 m (gainé) | à vérifier | [Cedeo multicouches](https://www.cedeo.fr/c/tubes-multicouches/x3snv3_dig_2029331R7) |
| Raccords à sertir multicouche (coude, té, manchon, raccord à visser) | 16, 20, 26 | sachet ou boîte, selon marque | — | à vérifier par négoce |

### 4.4 Plancher chauffant

| Article | Dimensions | Conditionnement | Source |
| --- | --- | --- | --- |
| Plaque isolante à plots PSE | 1,183 × 0,845 m hors tout, utile 1,12 × 0,84 m = 0,94 m² ; pas multiple de 8,45 cm ; Ø16 et 20 | panneau (paquet à vérifier) | [PUM 71050](https://www.mypum.fr/alimentation-ecfs-chauffage/plancher-chauffant/plaques-isolantes-plancher-chauffant/plaque-plane-et-a-plots/produits/P0350?articleId=71050), [RBM 1150 × 870](https://plancherchauffantshop.com/dalles-plaques-plancher-chauffant/37-isolant-a-plot-rbm.html) |
| Panneau isolant lisse PSE Maxisol 50 mm | 1,2 × 1 m = 1,2 m², R = 1,45 | panneau | [Point.P 1684786](https://www.pointp.fr/p/platre-isolation-ite/panneau-isolant-pour-sol-pse-maxisol-50-mm-1-2x1-0-m-r-1-45-m2-A1684786) |
| Panneau polyuréthane TMS 100 mm | 1,2 × 1 m, R = 4,65 | panneau | [Point.P 3668766](https://www.pointp.fr/p/platre-isolation-ite/panneau-polyurethane-raine-bouvete-4-cotes-tms-mf-si-ep-100-mm-A3668766) |
| Bande périphérique PE 8 mm | hauteur 150 ou 200 mm | rouleau 50 m | [Velta / Afriso](https://www.groupeafriso.fr/catalogue/accessoires-velta/isolant-de-bordure.html) |
| Adhésif de jonction des plaques | 5 cm | rouleau 50 m | [Plancherchauffantshop Unitape](https://plancherchauffantshop.com/dalles-plaques-plancher-chauffant/37-isolant-a-plot-rbm.html) |
| Collecteur plancher chauffant N départs | 2 à 12 départs | u (avec coffret à vérifier) | fiche fabricant |
| Agrafes ou cavaliers de fixation (sur panneau lisse) | — | boîte (à vérifier) | à vérifier |

### 4.5 Ventilation

| Article | Dimensions | Conditionnement | Source |
| --- | --- | --- | --- |
| Gaine souple Algaine FV (volume chauffé) | Ø80, 100, 125, 160 ; oblongues 100 × 40, 135 × 65, 160 × 80 | filet de 6 m | [Aldes Algaine standard](https://www.aldes.fr/produits/reseaux/reseaux-maison-individuelle/reseau-flexible/algaine-standard-armee-fibre) |
| Gaine alu renforcée isolée 25 mm (volume non chauffé) | Ø80, Ø125 | carton 6 m ou 10 m | [Aldes Algaine alu isolée](https://www.aldes.fr/produits/reseaux/reseaux-maison-individuelle/reseau-flexible/algaine-alu-renforcee-isolee-epaisseur-25-mm) |
| Bouche d'extraction (cuisine, SdB, WC) | Ø125 cuisine, Ø80 autres (à vérifier selon caisson) | u | fiche fabricant du caisson |
| Entrée d'air autoréglable ou hygro | une par pièce principale | u (+ auvent extérieur) | à vérifier |
| Manchette, collier de serrage, adhésif alu | Ø80 à Ø160 | sachet, rouleau | à vérifier |
| Sortie de toit ou chapeau de rejet | Ø125 ou Ø160 | u | à vérifier |

### 4.6 Fumisterie granulés

| Article | Dimensions | Conditionnement | Source |
| --- | --- | --- | --- |
| Élément droit concentrique PGI 80/130 | 1 000, 450, 250 mm ; réglables 390–560 et 730–1 170 mm | u | [Poujoulat fiche PGI](https://www.poujoulat.fr/fr/uploads/media/fiches-interactives/fiche_PGI_80_130_interactive-1.pdf), [Solution-poêle](https://www.solution-poele.fr/fumisterie/29741-kit-conduit-concentrique-poujoulat-pgi-80-130-pour-poeles-a-granules.html) |
| Coude 45° / 90°, té, collier de soutien, coquille isolante plafond, support toit, terminal vertical ou horizontal | Ø80/130 | u | idem |
| Kits ventouse et rénovation conduit maçonné | — | kit | [Sauveconduit kit ventouse](https://www.sauveconduit.fr/fumisterie/27440-kit-sortie-horizontale-noir-80-pgi-ventouse.html), [Leroy Merlin kit maçonné](https://www.leroymerlin.fr/produits/kit-conduit-poele-a-granules-concentrique-pgi-80-130-vers-conduit-maconne-poujoulat-longueur-1-metre-94133308.html) |

## 5. Règles de calcul (DTU, formules, pertes)

Une règle par ouvrage, en code pur dans `regles.json`. Les distances viennent du devis, du chat ou des défauts de la section 6. Tout résultat est arrondi au conditionnement supérieur (section 2). Les DTU 65.x sont payants (AFNOR/CSTB) : les seuils ci-dessous viennent des notices fabricant et de synthèses publiques citées ; la transcription des tableaux DTU est au plan de complétion.

### 5.1 Liaison frigorifique (PAC bibloc, split, gainable)

```text
Pour chaque unité intérieure i :
  L_i = (d_UE_UI + h_denivele + 1,0 m de lyres/raccordement) × 1,10        # perte 10 % (à vérifier)
  Contrôle : L_min ≤ L_i ≤ L_max de la notice, h ≤ h_max
             ex. Daikin RXM20-35R : L_max 20 m, L_min 1,5 m, h_max 15 m
  Diamètres = ceux de la notice / du devis (table défaut section 6)
Couronnes = plus petite combinaison de longueurs vendues ≥ Σ L_i par diamètre
Charge complémentaire (kg) = max(0, L_liquide − L_préchargée) × g_par_m
             ex. Daikin split R32 : L_préchargée 10 m, 0,020 kg/m
             → si > 0 : 1 bouteille du fluide de la plaque signalétique
```

Source des seuils et de la formule de charge : [Daikin, guide de référence installateur split R32 RXM-R](https://www.daikin.eu/content/dam/document-library/Installer-reference-guide/ac/split/RXM-R,ARXM-R_Installer%20reference%20guide_4PFR519439-8L_French.pdf). En multisplit, la longueur préchargée est souvent plus grande (30 m sur 2MXM-5MXM, [notice Daikin](https://www.daikin.eu/content/dam/document-library/installation-manuals/ac/split/2mxm-a9/2MXM68A9.3MXM-A9.4MXM-A9.5MXM-A9_Installation%20manual_3PFR600450-9V_French.pdf)) : la valeur se lit par modèle.

### 5.2 Goulotte, condensats, support

```text
Goulotte (barres de 2 m) = ceil(L_apparente × 1,05 / 2)      # L_apparente défaut = d_UE_UI
Accessoires par liaison : 1 sortie de mur + 1 passage de mur + 2 angles   (à vérifier)
Condensats (rouleau 30 m) = ceil((d_évacuation + 1 m) / 30)
  pente ≥ 3 %, siphon obligatoire avant les eaux usées (NF DTU 65.16)
Support UE : 1 kit (mural ou sol) + 1 jeu de 4 plots antivibratiles par unité extérieure
  garde au sol ≥ 10 cm, ou 20 cm au-dessus du manteau neigeux
```

Sources : [synthèse NF DTU 65.16 par Batirama](https://www.batirama.com/article/51533-nf-dtu-65.16-installations-de-pompes-a-chaleur.html) (pente 3 %, siphon), [Cedeo](https://www.cedeo.fr/dtu-6516-installation-de-pompe-chaleur) (garde au sol, plots).

### 5.3 PAC air/eau : module hydraulique

```text
Monobloc : liaison hydraulique UE ↔ intérieur en multicouche isolé
  L = 2 × (d_UE_UI + 1 m) × 1,05 → couronnes isolées
Bibloc : liaison frigorifique (5.1), diamètres plus gros (souvent 3/8 – 5/8, à lire)
Toujours, par PAC : 2 flexibles de raccordement, 2 vannes d'isolement,
  1 filtre (magnétique en réno), 1 kit support + plots, 1 rouleau condensats
  Si le devis cite un « kit hydraulique » fabricant : ne rien redétailler
Réno : + 1 produit de désembouage + 1 inhibiteur (dose selon volume, à vérifier)
```

### 5.4 Plancher chauffant hydraulique (NF DTU 65.14)

```text
S_chauffée = S_pièce − emprises fixes (placards, meubles de cuisine, baignoire)
             défaut : S_chauffée = 0,90 × S_pièce                       (à vérifier)
Tube (ml) = S_chauffée / pas + 2 × d_collecteur × nb_boucles
            pas défaut 0,15 m (6,7 ml/m²) ; 0,10 m en salle de bains (10 ml/m²)
nb_boucles par pièce = ceil(tube_pièce / 120)    # 120 m max par boucle en Ø16
Couronnes = rangement des boucles (aucune boucle coupée) dans des couronnes de 120 ou 240 m
Collecteur = 1 collecteur de nb_départs = Σ nb_boucles (arrondi à la taille vendue)
Isolant à plots (0,94 m² utiles) = ceil(S_pièce × 1,05 / 0,94)
Bande périphérique (rouleau 50 m) = ceil(Σ périmètres × 1,05 / 50)
  périmètre inconnu : 4 × √S × 1,25 par pièce                           (à vérifier)
Adhésif de jonction (rouleau 50 m) : 1 par tranche de 50 m² (sur panneau lisse)
Chape, treillis anti-retrait : NON compté sauf si écrit au devis (souvent le maçon)
```

Sources : 120 m par boucle et 5 cm des murs ([guide de pose PCBT Anjou Connectique](https://www.anjou-connectique.com/media/wysiwyg/PDF/guide-poser-son-plancher-chauffant.pdf)) ; 5 cm des parois et 20 cm des conduits de fumée, NF DTU 65.14 § 6.3.5 sur l'interdiction des réseaux électriques dans la dalle ([guide Thermacome](https://thermacome.fr/wp-content/uploads/2018/03/guide_de_mise_en_oeuvre_plancher_chauffant_v4.pdf)) ; remplissage boucle par boucle ([NF DTU 65.14 P1, extrait](https://plombiers-reunis.com/misc.php?action=pun_attachment&item=1061&download=1)).

### 5.5 Réseau de radiateurs

```text
Par radiateur neuf ou déplacé :
  Tube multicouche (aller + retour) = 2 × d_moyenne × 1,10      d_moyenne défaut 8 m (à vérifier)
  1 robinet thermostatique + 1 té de réglage + 1 kit de fixation (si non fourni)
  2 raccords à visser + 4 coudes à sertir (à vérifier)
Par installation en pieuvre : 1 nourrice/collecteur (départs = nb radiateurs)
Remplacement à l'identique : 0 tube, 2 raccords de transition par radiateur
```

### 5.6 VMC simple flux (arrêté du 24 mars 1982, NF DTU 68.3)

```text
Bouches : 1 par pièce de service (cuisine, chaque SdB/salle d'eau, chaque WC)
  Ø125 en cuisine, Ø80 ailleurs (à confirmer sur la notice du caisson)
Gaine par bouche = (d_caisson_bouche défaut 5 m) × 1,10       (à vérifier)
  Cartons de 6 m = ceil(Σ L par diamètre / 6) ; isolée si combles non chauffés
Rejet : gaine Ø125 ou Ø160 isolée + 1 sortie de toit ou chapeau
Entrées d'air : 1 par pièce principale (séjour, chaque chambre) + 1 auvent chacune
Colliers : 2 par tronçon ; adhésif alu : 1 rouleau par installation
```

Les débits réglementaires ne changent pas les quantités (le caisson est dans le devis) mais servent de contrôle : cuisine 75 à 135 m³/h selon le nombre de pièces principales ([Légifrance, arrêté du 24 mars 1982](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000862344/)).

### 5.7 VMC double flux, gainable, CET sur air extérieur

```text
Double flux : bouches d'insufflation = nb pièces principales ; extraction = 5.6
  Gaines intérieures comme 5.6 ; 2 gaines Ø160 isolées vers l'extérieur (défaut 3 m chacune)
  Pas d'entrées d'air en façade
Gainable : 1 plénum de soufflage, 1 bouche par pièce desservie, 1 grille de reprise
  Gaines comme 5.6 (diamètres de la notice)
CET sur air extérieur : 2 gaines Ø160 isolées (défaut 2 m chacune) + 2 traversées murales
```

### 5.8 Fumisterie poêle à granulés (NF DTU 24.1)

```text
H_conduit = hauteur sous plafond − hauteur buse + épaisseurs traversées
            + débord au-dessus du toit (règle de sortie à lire, à vérifier)
Éléments droits = combinaison de 1 000 / 450 / 250 mm + 1 réglable ≥ H_conduit
Toujours : 1 té ou élément de raccordement, 1 coquille par plafond traversé,
  1 collier de soutien, 1 terminal (vertical ou ventouse)
Conduit maçonné existant : kit rénovation + flexible à la hauteur du conduit
```

## 6. Valeurs par défaut et hypothèses à afficher

Quand ni le devis ni le chat ne donnent une valeur, le moteur prend le défaut ci-dessous et **l'affiche sur la carte quantitatif** avec le texte de la colonne « Affichage ». Un tap sur l'hypothèse la corrige. Résolution : chantier → artisan → variation par axe → valeur nationale.

| Clé `defauts.json` | Valeur nationale | Variations par axe | Affichage | Statut |
| --- | --- | --- | --- | --- |
| `distance_ue_ui_m` | 5 | appartement : 3 | « Unité extérieure à {v} m de l'intérieur » | à vérifier |
| `denivele_ue_ui_m` | 1 | — | « Dénivelé {v} m » | à vérifier |
| `perte_liaison_pct` | 10 | — | « Marge liaison {v} % » | à vérifier |
| `diametres_liaison` | ≤ 3,5 kW : 1/4 – 3/8 ; 5 à 7 kW : 1/4 – 1/2 ; PAC air/eau bibloc : 3/8 – 5/8 | lu sur la notice si modèle reconnu | « Liaison {v} (notice à confirmer) » | à vérifier |
| `emplacement_ue` | sol (maison) | appartement : mural ou balcon ; zone neige ou altitude > 900 m : sol sur châssis surélevé | « Groupe extérieur posé {v} » | — |
| `visserie_ue` | acier zingué | département littoral : inox | « Supports {v} » | à vérifier |
| `distance_evacuation_condensats_m` | 3 | — | « Condensats sur {v} m » | à vérifier |
| `pas_plancher_m` | 0,15 | salle de bains : 0,10 | « Pas de pose {v} cm » | à vérifier |
| `ratio_surface_chauffee` | 0,90 | — | « {v} % de la surface chauffée » | à vérifier |
| `distance_collecteur_m` | 6 | — | « Collecteur à {v} m des pièces en moyenne » | à vérifier |
| `distance_radiateur_m` | 8 | réseau existant conservé : 0 | « {v} m de tube par radiateur (aller) » | à vérifier |
| `distance_caisson_bouche_m` | 5 | — | « {v} m de gaine par bouche » | à vérifier |
| `gaine_vmc_isolee` | oui (combles non chauffés) | caisson en volume chauffé : non | « Gaine {v} » | — |
| `perte_gaine_pct` | 10 | — | « Marge gaine {v} % » | à vérifier |
| `filtre_magnetique` | non | rénovation : oui | « Filtre à boues ajouté (rénovation) » | à vérifier |
| `desembouage` | non | rénovation sur réseau existant : oui | « Désembouage ajouté » | à vérifier |

### 6.1 Format `defauts.json` (extrait)

```json
{
  "distance_ue_ui_m": {
    "valeur": 5,
    "variations": [ { "si": { "type_batiment": "appartement" }, "valeur": 3 } ],
    "afficher": "Unité extérieure à {valeur} m de l'intérieur"
  },
  "visserie_ue": {
    "valeur": "acier zingué",
    "variations": [ { "si": { "geographie.littoral": "oui" }, "valeur": "inox" } ],
    "afficher": "Supports {valeur}"
  },
  "pas_plancher_m": {
    "valeur": 0.15,
    "variations": [ { "si": { "piece": "salle_de_bains" }, "valeur": 0.10 } ],
    "afficher": "Pas de pose {valeur} cm"
  },
  "desembouage": {
    "valeur": false,
    "variations": [ { "si": { "neuf_renovation": "renovation", "reseau_existant": true }, "valeur": true } ],
    "afficher": "Désembouage ajouté"
  }
}
```

## 7. Questions à poser

Quatre questions au plus par chantier, à boutons, triées par sensibilité décroissante, et seulement pour les ouvrages détectés. Aucune ne demande une quantité : la question de distance propose des **tranches à boutons**, comme la pente en couverture. Le moteur ne pose une question que si sa sensibilité dépasse 5 % et que la réponse n'est ni dans le devis ni dans les infos chantier.

| Priorité | id | Ouvrages | Texte affiché | Boutons | Défaut | Sensibilité |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | `neuf_reno` | tous | « Maison neuve ou existante ? » | Neuve · Existante | lu dans le devis | 40 % (désembouage, transitions, réseau neuf ou non) |
| 1 | `distance_ue` | pac\_\*, gainable | « Le groupe extérieur est à combien de l'appareil intérieur ? » | Collé au mur (< 3 m) · 3 à 8 m · 8 à 15 m · Plus de 15 m | 3 à 8 m | 60 % sur liaison, goulotte, fluide |
| 2 | `reseau_existant` | reseau\_radiateurs, pac\_air\_eau, chaudiere | « On garde les tuyaux existants ? » | Oui · Non, réseau neuf | oui en réno | 50 % sur tubes et raccords |
| 3 | `caisson_combles` | vmc\_\*, gainable | « Le caisson VMC est dans des combles non chauffés ? » | Oui · Non | oui | 30 % (gaine isolée ou non, change la référence) |
| 4 | `liaison_apparente` | pac\_\*, split | « Les tuyaux passent dehors le long du mur ? » | Oui, sous goulotte · Non, cachés | oui | 20 % sur goulotte et accessoires |
| 5 | `pose_ue` | pac\_\*, split | « Groupe extérieur posé où ? » | Au sol · Au mur · Sur un toit-terrasse | au sol | 15 % (kit support) |
| 6 | `conduit_existant` | poele\_granules | « Il y a déjà un conduit de cheminée ? » | Oui · Non | non | 70 % sur la fumisterie |
| 7 | `evacuation_proche` | pac\_\*, split, chaudiere | « Une évacuation d'eau est proche du groupe ? » | Oui · Non, il faut une pompe | oui | 10 % (pompe de relevage) |

Les questions 5 à 7 ne passent que si une des quatre premières est déjà résolue par le devis. Questions supplémentaires en cas de doute réel : autorisées par la décision produit (mieux vaut répondre que corriger après), toujours à boutons, jamais plus de deux.

### 7.1 Format `questions.json` (extrait)

```json
[
  {
    "id": "distance_ue",
    "ouvrages": ["pac_air_eau", "pac_air_air_split", "pac_air_air_gainable"],
    "priorite": 1,
    "si_inconnu": "distance_ue_ui_m",
    "texte": "Le groupe extérieur est à combien de l'appareil intérieur ?",
    "boutons": [
      { "label": "Collé au mur (< 3 m)", "valeur": 2 },
      { "label": "3 à 8 m", "valeur": 5 },
      { "label": "8 à 15 m", "valeur": 12 },
      { "label": "Plus de 15 m", "valeur": 18 }
    ],
    "defaut": 5,
    "sensibilite_pct": 60
  },
  {
    "id": "caisson_combles",
    "ouvrages": ["vmc_simple_flux", "vmc_double_flux", "pac_air_air_gainable"],
    "priorite": 3,
    "si_inconnu": "gaine_vmc_isolee",
    "texte": "Le caisson VMC est dans des combles non chauffés ?",
    "boutons": [ { "label": "Oui", "valeur": true }, { "label": "Non", "valeur": false } ],
    "defaut": true,
    "sensibilite_pct": 30
  }
]
```

La réponse « Plus de 15 m » déclenche un contrôle : si 18 m dépasse la longueur maxi de la notice (ex. 20 m avec dénivelé), l'app l'écrit en alerte au lieu de sortir un quantitatif faux.

## 8. Matériaux dominants par région

En chauffage, la région change **le type d'appareil** que l'on trouve dans les devis, pas la façon de le poser. Le moteur s'en sert seulement pour ordonner les boutons et pré-remplir des hypothèses (inox au bord de mer, châssis surélevé en montagne). Toute la table est une tendance de terrain **(à vérifier)** : elle sera recalculée à partir des 300 premiers chantiers réels, comme en couverture.

| Territoire | Zone climatique RE2020 | Ce qu'on remplace le plus | Ce qu'on pose le plus | Effet sur le quantitatif |
| --- | --- | --- | --- | --- |
| Bretagne, Normandie, Pays de la Loire | H2a / H2b | chaudière fioul, convecteurs électriques | PAC air/eau sur radiateurs existants, CET, VMC hygro | littoral : supports et visserie inox ; réno : désembouage, filtre |
| Nord, Hauts-de-France, Grand Est | H1a / H1b | chaudière gaz ancienne, fioul rural | chaudière gaz condensation, PAC hybride, PAC air/eau | conduits ventouse ; radiateurs fonte conservés |
| Île-de-France | H1a | chaudière gaz, VMC autoréglable | chaudière condensation, PAC en maison, VMC hygro B | appartement : groupe en balcon ou mural, liaisons courtes |
| Centre, Bourgogne, Auvergne hors montagne | H1 / H2 | fioul, propane en citerne | PAC air/eau, poêle à granulés | réseau radiateurs souvent en acier ou cuivre ancien |
| Massifs (Alpes, Pyrénées, Massif central, Jura, Vosges) > 900 m | H1c / H2d | fioul, bois bûche | poêle à granulés, PAC haute température | châssis surélevé (neige), fumisterie, isolant de liaison renforcé |
| Sud-Ouest | H2c | fioul, gaz | PAC air/eau, climatisation réversible | multisplits fréquents |
| Méditerranée, Corse | H3 | convecteurs électriques | climatisation réversible air/air, CET | multisplit, goulotte en façade, peu de plancher chauffant |
| Outre-mer | hors RE2020 métropole | — | climatisation, CET solaire | hors périmètre v0.1 |

### 8.1 Champs à ajouter dans `commun/departements.json`

```json
{
  "22": {
    "zone_re2020": "H2a",
    "littoral": "partiel",
    "altitude_max_m": 340,
    "chauffage_dominant": ["pac_air_eau", "chauffe_eau_thermo", "vmc_simple_flux"],
    "gaz_reseau": "partiel"
  }
}
```

`chauffage_dominant` sert uniquement à l'ordre des boutons « C'est quoi, \[expression\] ? » quand le vocabulaire ne reconnaît pas une ligne. `gaz_reseau` « partiel » ou « non » rend la chaudière gaz moins probable et fait apparaître propane en citerne en bouton.

## 9. Points singuliers et consommables

Ce sont les lignes que l'artisan oublie et qui l'obligent à repasser au comptoir. Chacune se déclenche par une condition, se commande à la pièce ou au conditionnement, et apparaît sur la carte avec sa raison.

### 9.1 Points singuliers (déclenchés par condition)

| Condition détectée | Ligne ajoutée | Unité | Règle | Statut |
| --- | --- | --- | --- | --- |
| Traversée de mur pour liaison ou condensats | carottage : fourreau PVC Ø selon liaison + mastic | u | 1 par traversée | à vérifier |
| Évacuation non gravitaire (sous-sol, pente < 3 %) | pompe de relevage de condensats | u | 1 par unité concernée | à vérifier |
| Unité intérieure plus haute que l'évacuation impossible | — | — | alerte « pompe nécessaire ? » | — |
| Département littoral | supports et visserie inox, traitement anticorrosion si proposé au devis | kit | remplace le support standard | à vérifier |
| Altitude > 900 m ou zone neige | châssis surélevé, garde ≥ 20 cm au-dessus de la neige | kit | remplace le support au sol | source DTU 65.16 (synthèse Cedeo) |
| Raccordement sur ancien réseau acier ou cuivre | raccords de transition | u | 2 par point de raccordement | à vérifier |
| Rénovation sur réseau existant | filtre magnétique, produit de désembouage, inhibiteur | u, bidon | 1 de chaque par installation | à vérifier |
| Plancher chauffant près d'un conduit de fumée | — | — | rappel : 20 cm entre tubes et conduits ([Thermacome](https://thermacome.fr/wp-content/uploads/2018/03/guide_de_mise_en_oeuvre_plancher_chauffant_v4.pdf)) | sourcé |
| Plafond traversé par un conduit de fumée | coquille isolante, plaque de finition | u | 1 par plafond traversé | à vérifier |
| VMC en combles non chauffés | gaine isolée 25 mm au lieu de gaine nue | carton 6 m | remplace la gaine standard | sourcé Aldes |
| CET sur air extérieur | 2 traversées murales Ø160 + grilles | u | 1 jeu par CET | à vérifier |
| Multisplit | 1 liaison par unité intérieure, réductions selon notice | couronne, u | lecture notice | sourcé Daikin |

### 9.2 Consommables (ratios par installation)

| Consommable | Ouvrages | Ratio par défaut | Conditionnement | Statut |
| --- | --- | --- | --- | --- |
| Ruban PTFE ou pâte d'étanchéité | réseaux hydrauliques | 1 par chantier | rouleau / pot | à vérifier |
| Fil à souder, flux, oxygène/MAPP | cuivre brasé (réno) | 1 kit si brasure | kit | à vérifier |
| Azote de tirage au vide | liaisons frigorifiques | fourni par l'artisan, pas commandé | — | — |
| Isolant manchon de tube (2 m) | tubes hors volume chauffé | ceil(L\_hors\_volume / 2) | barre 2 m | à vérifier |
| Colliers de fixation tube (simple ou double) | tous tubes | 1 tous les 0,8 m (à vérifier selon diamètre) | sachet | à vérifier |
| Chevilles et vis pour supports | supports UE, goulotte, radiateurs | 4 par support, 3 par barre de goulotte | boîte | à vérifier |
| Colliers à serrage rapide pour gaine | VMC, gainable | 2 par tronçon | sachet | à vérifier |
| Adhésif aluminium | VMC, gainable, CET | 1 rouleau par installation | rouleau 50 m | à vérifier |
| Mousse expansive et mastic | traversées | 1 bombe + 1 cartouche par chantier | u | à vérifier |
| Câble de liaison UE ↔ UI | splits, PAC bibloc | L\_liaison + 1 m, section de la notice | couronne ou au mètre (fiche électricité) | à vérifier |

Le câble de liaison et l'alimentation électrique restent dans ce tiroir uniquement pour la liaison UE ↔ UI ; l'alimentation depuis le tableau relève du tiroir électricité.

## 10. Cas de test

Cinq cas **synthétiques**, calculés à la main avec les règles du chapitre 5 et les défauts du chapitre 6. Ils prouvent que le moteur applique le tiroir sans erreur ; ils ne valident pas les ratios. Il faudra 10 devis réels anonymisés de chauffagiste, avec ce qui a été réellement commandé, pour passer en bêta (critère section 30 du référentiel couverture).

### 10.1 Monosplit 2,5 kW, Côtes-d'Armor littoral

```json
{
  "id": "chauf-001",
  "source": "synthétique, règles v0.1.0",
  "devis_lignes": ["Climatisation réversible Daikin monosplit 2,5 kW RXM25 + FTXM25, pose murale"],
  "contexte": { "departement": "22", "littoral": true, "neuf_renovation": "renovation", "distance_ue_ui_m": 5, "denivele_ue_ui_m": 1, "liaison_apparente": true, "pose_ue": "mur" },
  "calcul": "L = (5 + 1 + 1) × 1,10 = 7,7 m ; charge = 0 (≤ 10 m préchargés) ; goulotte = ceil(5 × 1,05 / 2) = 3",
  "attendu": [
    { "article": "liaison frigorifique bi-tube isolée M1 1/4-3/8", "quantite": 1, "unite": "couronne 10 m", "tolerance_pct": 0 },
    { "article": "goulotte 80x60 2 m", "quantite": 3, "unite": "barre", "tolerance_pct": 0 },
    { "article": "sortie de mur goulotte 80x60", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "passage de mur goulotte 80x60", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "angle goulotte 80x60", "quantite": 2, "unite": "u", "tolerance_pct": 50 },
    { "article": "tuyau de condensats Ø16", "quantite": 1, "unite": "rouleau 30 m", "tolerance_pct": 0 },
    { "article": "support mural unité extérieure inox", "quantite": 1, "unite": "kit", "tolerance_pct": 0 },
    { "article": "plots antivibratiles", "quantite": 1, "unite": "jeu de 4", "tolerance_pct": 0 }
  ],
  "absent": ["bouteille R32"],
  "questions_max": 4
}
```

### 10.2 Bisplit, deux distances différentes

```json
{
  "id": "chauf-002",
  "source": "synthétique, règles v0.1.0",
  "devis_lignes": ["Bisplit réversible 2 unités murales, séjour (liaison 5 m) et chambre (liaison 9 m)"],
  "contexte": { "departement": "35", "littoral": false, "distances_m": [5, 9], "denivele_ue_ui_m": 1 },
  "calcul": "L1 = 7,7 m ; L2 = (9 + 1 + 1) × 1,10 = 12,1 m ; total 19,8 m → 1 couronne 20 m",
  "attendu": [
    { "article": "liaison frigorifique bi-tube isolée M1 1/4-3/8", "quantite": 1, "unite": "couronne 20 m", "tolerance_pct": 0 },
    { "article": "tuyau de condensats Ø16", "quantite": 1, "unite": "rouleau 30 m", "tolerance_pct": 0 }
  ],
  "alerte_attendue": "charge complémentaire : lire la longueur préchargée du groupe multisplit sur la notice",
  "questions_max": 4
}
```

### 10.3 Plancher chauffant neuf 100 m², 7 pièces

```json
{
  "id": "chauf-003",
  "source": "synthétique, règles v0.1.0",
  "devis_lignes": ["Plancher chauffant hydraulique basse température 100 m², isolant à plots, collecteur"],
  "contexte": { "neuf_renovation": "neuf", "pieces_m2": { "sejour": 40, "chambre1": 12, "chambre2": 12, "chambre3": 11, "sdb": 6, "cuisine": 12, "couloir": 7 }, "distance_collecteur_m": 6 },
  "calcul": "séjour 36/0,15 = 240 m → 3 boucles de 92 m ; ch1, ch2, cuisine 84 m ; ch3 78 m ; sdb 5,4/0,10 + 12 = 66 m ; couloir 54 m ; total 726 m, 9 boucles. Rangement : [92+92+54] [92+78+66] [84+84] dans 240 m, [84] dans 120 m",
  "attendu": [
    { "article": "tube PER BAO 16x1,5", "quantite": 3, "unite": "couronne 240 m", "tolerance_pct": 0 },
    { "article": "tube PER BAO 16x1,5", "quantite": 1, "unite": "couronne 120 m", "tolerance_pct": 0 },
    { "article": "collecteur plancher chauffant 9 départs", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "plaque isolante à plots 1,12x0,84", "quantite": 112, "unite": "panneau", "tolerance_pct": 3 },
    { "article": "bande périphérique 150 mm", "quantite": 3, "unite": "rouleau 50 m", "tolerance_pct": 0 }
  ],
  "absent": ["chape", "treillis"],
  "questions_max": 4
}
```

### 10.4 VMC hygro B, maison 4 pièces principales

```json
{
  "id": "chauf-004",
  "source": "synthétique, règles v0.1.0",
  "devis_lignes": ["VMC simple flux hygroréglable type B, 1 cuisine, 1 salle de bains, 1 WC, séjour + 3 chambres"],
  "contexte": { "caisson_combles": true, "pieces_principales": 4, "distance_caisson_bouche_m": 5 },
  "calcul": "gaine par bouche 5 × 1,10 = 5,5 m ; Ø125 : 5,5 m → 1 carton ; Ø80 : 11 m → 2 cartons ; rejet Ø125 isolé 1 carton",
  "attendu": [
    { "article": "bouche d'extraction cuisine Ø125", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "bouche d'extraction Ø80", "quantite": 2, "unite": "u", "tolerance_pct": 0 },
    { "article": "gaine alu isolée 25 mm Ø125", "quantite": 2, "unite": "carton 6 m", "tolerance_pct": 0 },
    { "article": "gaine alu isolée 25 mm Ø80", "quantite": 2, "unite": "carton 6 m", "tolerance_pct": 0 },
    { "article": "sortie de toit Ø125", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "entrée d'air hygroréglable", "quantite": 4, "unite": "u", "tolerance_pct": 0 },
    { "article": "auvent d'entrée d'air", "quantite": 4, "unite": "u", "tolerance_pct": 0 },
    { "article": "adhésif aluminium", "quantite": 1, "unite": "rouleau", "tolerance_pct": 0 }
  ],
  "questions_max": 4
}
```

### 10.5 PAC air/eau monobloc en remplacement de fioul, radiateurs conservés

```json
{
  "id": "chauf-005",
  "source": "synthétique, règles v0.1.0",
  "devis_lignes": ["Dépose chaudière fioul, PAC air/eau monobloc 8 kW, raccordement sur réseau radiateurs existant"],
  "contexte": { "departement": "22", "littoral": false, "neuf_renovation": "renovation", "reseau_existant": true, "distance_ue_ui_m": 5, "pose_ue": "sol" },
  "calcul": "liaison hydraulique = 2 × (5 + 1) × 1,05 = 12,6 m → 1 couronne isolée",
  "attendu": [
    { "article": "tube multicouche isolé (diamètre selon notice)", "quantite": 1, "unite": "couronne 25 m", "tolerance_pct": 0 },
    { "article": "flexible de raccordement PAC", "quantite": 2, "unite": "u", "tolerance_pct": 0 },
    { "article": "vanne d'isolement", "quantite": 2, "unite": "u", "tolerance_pct": 0 },
    { "article": "filtre magnétique", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "produit de désembouage", "quantite": 1, "unite": "bidon", "tolerance_pct": 0 },
    { "article": "inhibiteur", "quantite": 1, "unite": "bidon", "tolerance_pct": 0 },
    { "article": "raccord de transition", "quantite": 2, "unite": "u", "tolerance_pct": 0 },
    { "article": "support sol unité extérieure", "quantite": 1, "unite": "kit", "tolerance_pct": 0 },
    { "article": "plots antivibratiles", "quantite": 1, "unite": "jeu de 4", "tolerance_pct": 0 },
    { "article": "tuyau de condensats Ø16", "quantite": 1, "unite": "rouleau 30 m", "tolerance_pct": 0 }
  ],
  "absent": ["liaison frigorifique", "radiateur"],
  "questions_max": 4
}
```

## 11. Ratios à faire valider par un chauffagiste

Quatorze valeurs à faire relire par un chauffagiste-frigoriste (attestation de capacité fluide). Une réponse « oui » ou un chiffre corrigé suffit par ligne ; ce tableau devient `ratios-a-valider.md` et doit être vide avant la bêta.

| # | Ratio | Valeur actuelle | Question au pro | Impact si faux |
| --- | --- | --- | --- | --- |
| 1 | Marge sur liaison frigorifique | +10 % et +1 m de raccordement | Tu ajoutes combien en plus de la distance mesurée ? | couronne trop courte = retour au négoce |
| 2 | Diamètres de liaison par puissance | 1/4-3/8 ≤ 3,5 kW ; 1/4-1/2 à 5-7 kW ; 3/8-5/8 PAC air/eau bibloc | Juste pour les marques que tu poses ? | mauvaise couronne |
| 3 | Distance par défaut groupe ↔ intérieur | 5 m (3 m en appartement) | Ta distance la plus courante ? | ± 1 couronne |
| 4 | Accessoires de goulotte par liaison | 1 sortie de mur, 1 passage de mur, 2 angles | C'est ce que tu prends d'habitude ? | petits manques |
| 5 | Plancher : part de la surface chauffée | 90 % | Tu retires combien pour placards et meubles ? | ± 10 % de tube |
| 6 | Plancher : pas par défaut | 15 cm, 10 cm en salle de bains | Tes pas habituels ? | ± 30 % de tube |
| 7 | Plancher : distance moyenne au collecteur | 6 m | Juste en maison de 100 m² ? | nombre de boucles |
| 8 | Plancher : bande périphérique sans plan | 4 × √S × 1,25 par pièce | Ça te paraît juste ? | ± 1 rouleau |
| 9 | Radiateurs : tube par radiateur | 2 × 8 m × 1,10 | Ta longueur moyenne en pieuvre ? | ± 1 couronne |
| 10 | Radiateurs : raccords par radiateur | 2 raccords à visser, 4 coudes, 1 robinet thermo, 1 té de réglage | C'est ta liste ? | petits manques |
| 11 | VMC : gaine par bouche | 5 m + 10 % | Ta longueur moyenne en combles ? | ± 1 carton |
| 12 | Réno : désembouage et filtre systématiques | oui dès que le réseau est conservé | Tu les mets toujours ? | oubli fréquent |
| 13 | Colliers de tube | 1 tous les 0,8 m | Ton écartement ? | sachets |
| 14 | Fumisterie : débord en sortie de toit | règle NF DTU 24.1 non transcrite | Quelle hauteur au-dessus du faîtage tu comptes ? | 1 élément de conduit |

Personne pour relire n'a été identifié à ce jour : à désigner (chauffagiste partenaire ou Fab s'il a un contact).

## 12. Sources officielles

Pages ouvertes le 3 octobre 2026. Les textes DTU complets sont payants (AFNOR / CSTB) ; seules des synthèses publiques ou extraits ont été consultés.

| Domaine | Source | Ce qu'on en tire |
| --- | --- | --- |
| Réglementation | [Arrêté du 24 mars 1982, aération des logements (Légifrance)](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000862344/) | débits extraits par pièce de service |
| Réglementation | [Article 4, débits réduits (Légifrance)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006830558/2026-08-11) | débits mini en hygroréglable |
| Réglementation | [Aldes, commentaire de l'arrêté de 1982](https://www.aldes.fr/reglementations/ventilation-et-qualite-d-air-interieur/arrete-du-24-mars-82) | tableau des débits |
| DTU PAC | [NF DTU 65.16, sommaire (Eyrolles)](https://www.eyrolles.com/BTP/Livre/nf-dtu-65-16-juin-2017-installations-de-pompes-a-chaleur-3260050851541/) | périmètre, édition juin 2017 |
| DTU PAC | [CAPEB, nouveau NF DTU 65.16](https://www.capeb.fr/service/nouveau-nf-dtu-65.16-pour-les-installations-de-pompes-a-chaleur) | PAC ≤ 70 kW, circuit primaire seulement |
| DTU PAC | [Batirama, NF DTU 65.16](https://www.batirama.com/article/51533-nf-dtu-65.16-installations-de-pompes-a-chaleur.html) | condensats : pente 3 %, siphon |
| DTU PAC | [Cedeo, synthèse DTU 65.16](https://www.cedeo.fr/dtu-6516-installation-de-pompe-chaleur) | garde au sol, plots antivibratiles |
| DTU PAC | [BNTEC, proposition de révision 2022](https://www.bntec.fr/Portals/0/Ressources/Documents/Argumentaire_r%C3%A9vision%20NF%20DTU%2065_16%20PAC.pdf?ver=2022-03-09-105727-370) | révision en cours : à surveiller |
| DTU plancher | [NF DTU 65.14 P1, extrait](https://plombiers-reunis.com/misc.php?action=pun_attachment&item=1061&download=1) | remplissage boucle par boucle, coupes |
| DTU plancher | [Thermacome, guide de mise en œuvre](https://thermacome.fr/wp-content/uploads/2018/03/guide_de_mise_en_oeuvre_plancher_chauffant_v4.pdf) | distances aux parois et conduits |
| DTU plancher | [Anjou Connectique, guide de pose](https://www.anjou-connectique.com/media/wysiwyg/PDF/guide-poser-son-plancher-chauffant.pdf) | 120 m par boucle |
| DTU plancher | [Nicoll, guide de pose Fluxol](https://www.nicoll.fr/sites/default/files/products/GPOSEFLUXOL.pdf) | couronnes 100 et 200 m |
| Fabricant clim | [Daikin, guide installateur split R32 RXM-R](https://www.daikin.eu/content/dam/document-library/Installer-reference-guide/ac/split/RXM-R,ARXM-R_Installer%20reference%20guide_4PFR519439-8L_French.pdf) | 20 m maxi, 15 m de dénivelé, 10 m préchargés, 20 g/m |
| Fabricant clim | [Daikin, multisplit 2MXM-5MXM](https://www.daikin.eu/content/dam/document-library/installation-manuals/ac/split/2mxm-a9/2MXM68A9.3MXM-A9.4MXM-A9.5MXM-A9_Installation%20manual_3PFR600450-9V_French.pdf) | 30 m préchargés |
| Fabricant VMC | [Aldes Algaine standard](https://www.aldes.fr/produits/reseaux/reseaux-maison-individuelle/reseau-flexible/algaine-standard-armee-fibre) | diamètres, filet 6 m |
| Fabricant VMC | [Aldes Algaine alu isolée](https://www.aldes.fr/produits/reseaux/reseaux-maison-individuelle/reseau-flexible/algaine-alu-renforcee-isolee-epaisseur-25-mm) | isolée 25 mm, carton 6 ou 10 m |
| Fabricant fumisterie | [Poujoulat, fiche PGI 80/130](https://www.poujoulat.fr/fr/uploads/media/fiches-interactives/fiche_PGI_80_130_interactive-1.pdf) | éléments et références |
| Négoce | [Cedeo, couronnes cuivre pré-isolées](https://www.cedeo.fr/c/couronnes-de-cuivre-pre-isolees/x5snv5_dig_2008715R6) | longueurs de couronnes |
| Négoce | [Cedeo, goulottes Artiplastic](https://www.cedeo.fr/c/goulottes-et-accessoires/x4snv4_dig_2008722R6) | barres 2 m, accessoires |
| Négoce | [Cedeo, multicouches nus](https://www.cedeo.fr/c/tubes-multicouche-nus/x4snv4_dig_2028098R7) | couronnes, barres, poids |
| Négoce | [Cedeo, Roth Maxipro 120 m](https://www.cedeo.fr/p/chauffage-et-climatisation/tube-maxipro-16x1-5-120m-ref-1409020129-A6909720) | caractéristiques PE-RT |
| Négoce | [Point.P, Maxisol 1,2 × 1 m](https://www.pointp.fr/p/platre-isolation-ite/panneau-isolant-pour-sol-pse-maxisol-50-mm-1-2x1-0-m-r-1-45-m2-A1684786) | panneau isolant plancher |
| Négoce | [PUM, plaque à plots](https://www.mypum.fr/alimentation-ecfs-chauffage/plancher-chauffant/plaques-isolantes-plancher-chauffant/plaque-plane-et-a-plots/produits/P0350?articleId=71050) | surface utile, pas |
| Négoce | [Velta / Afriso, bande périphérique](https://www.groupeafriso.fr/catalogue/accessoires-velta/isolant-de-bordure.html) | rouleau 50 m |
| Négoce | [Comptoir des Pros, bi-tube frigorifique](https://www.comptoirdespros.com/chauffage/climatiseur-et-ventilateur/liaison-frigorifiques/bi-tube-frigorifique.html) | couronnes 20 et 50 m |

## 13. Plan de complétion

Ordre : le n° 1 d'abord, car sans devis réels rien n'est validable ; ensuite 2 et 3 ; le reste suit la bêta.

| # | Manque | Source | Qui | Critère de fin |
| --- | --- | --- | --- | --- |
| 1 | 10 devis réels de chauffagiste + commandes réelles | chauffagiste partenaire | Greg | `tests/` complet, tous verts |
| 2 | Relecture des 14 ratios du chapitre 11 | chauffagiste-frigoriste | à désigner | `ratios-a-valider.md` vide |
| 3 | Textes NF DTU 65.14, 65.16, 68.3, 24.1 (tableaux chiffrés) | AFNOR / CSTB (payant) ou manuel CAP/BP | Greg fournit, Claude transcrit | `regles.json` sans « à vérifier » sur les seuils DTU |
| 4 | Notices des 10 PAC et splits les plus posées (Atlantic, Daikin, Mitsubishi, Panasonic, Hitachi) : diamètres, longueurs préchargées, g/m | sites fabricants | Claude (recherche web) | table `diametres_liaison` par modèle |
| 5 | Conditionnements négoce manquants : raccords à sertir, colliers, manchons isolants, bouteilles de fluide, paquets d'isolant | Cedeo, Point.P, Richardson, Brossette | Claude + négoce local | chaque article a un conditionnement |
| 6 | Kits fabricant (support, hydraulique, ventouse) : composition exacte | fiches Atlantic, Saunier Duval, De Dietrich, Aldes | Claude | règle « kit cité = composants retirés » testée |
| 7 | Vocabulaire enrichi | 50 premiers devis bêta | automatique + validation | zéro mot inconnu sur un devis courant |
| 8 | Table régionale du chapitre 8 recalculée | chantiers réels | automatique | à partir de 300 chantiers |

## 14. CHANGELOG

| Date | Version | Changement |
| --- | --- | --- |
| 2026-10-03 | 0.1.0 | Création du tiroir chauffage / PAC / ventilation au format section 27 : 10 ouvrages, fiches sourcées (Daikin, Aldes, Poujoulat, Cedeo, Point.P), 8 règles de calcul, 16 défauts, 8 questions à boutons, 5 cas de test synthétiques, 14 ratios à valider. Maturité alpha. |
