# Référentiel quantitatif PLOMBIER CHAUFFAGISTE (Rappidos)

Oct 3, 2026 · @Greg

## 0. Mode d'emploi pour Claude Code

Ce document est le tiroir `referentiels/plomberie_chauffage/` du moteur générique défini en section 27 du référentiel couverture. Rien de ce qui suit ne doit finir dans le code du moteur : chaque tableau devient un fichier JSON du dossier métier (metier.json, ouvrages.json, materiaux.json, regles.json, defauts.json, questions.json, vocabulaire.json, ratios-a-valider.md, tests/, CHANGELOG.md).

Convention : toute valeur suivie de *(à vérifier)* n'a pas de source officielle ouverte ; elle se charge quand même, avec `"source": "a_verifier"`, et l'écran quantitatif l'affiche en hypothèse. Toute valeur sourcée porte son lien (section 12).

Particularité de ce métier : contrairement à la couverture, le devis de plombier liste presque toujours des **appareils à la pièce** (WC, lavabo, chaudière, radiateurs) et rarement des mètres de tuyau. Le moteur doit donc **déduire les longueurs de tuyau depuis la liste des appareils** (règle R-ALIM et R-EVAC, section 5) quand le devis ne les donne pas, et ne jamais demander « combien de mètres ? » à l'artisan.

```json
{
  "code": "plomberie_chauffage",
  "nom": "Plomberie - chauffage - sanitaire",
  "version": "0.1.0",
  "normes": ["NF DTU 60.1", "NF DTU 60.11", "NF DTU 60.5", "NF DTU 60.31", "NF DTU 60.32", "NF DTU 60.33", "NF DTU 65.10", "NF DTU 65.11", "NF DTU 65.14", "NF DTU 61.1", "NF DTU 24.1"],
  "axes_de_variation": {
    "geographie": "faible",
    "epoque_bati": "fort",
    "type_batiment": "moyen",
    "neuf_renovation": "fort",
    "gamme": "moyen"
  },
  "metiers_lies": ["electricite", "carrelage", "platrerie", "maconnerie", "couverture"],
  "unites_de_commande": ["u", "barre", "couronne", "sachet", "boite", "pot", "cartouche", "bobine", "carton", "kit"],
  "maturite": "alpha"
}
```

## 1. Métier et axes de variation

Le plombier-chauffagiste alimente les appareils en eau (froide, chaude), évacue les eaux usées et vannes, installe la production de chaleur et d'eau chaude, et la distribue (radiateurs, plancher chauffant). Les diamètres sont fixés par la norme ; ce qui fait varier le quantitatif, c'est surtout **l'époque du bâti** et **neuf ou rénovation**.

| Axe | Poids | Ce qu'il change sur le quantitatif | Résolu comment |
| --- | --- | --- | --- |
| neuf\_renovation | fort | rénovation = adaptateurs de raccordement sur l'existant, dépose, vannes d'isolement, désembouage ; neuf = réseau complet en encastré | lu dans le devis (« dépose », « remplacement ») sinon question Q3 |
| epoque\_bati | fort | ce qu'on trouve en déposant : plomb ou acier galva (avant 1950-1970), cuivre (1960-2000), PER/multicouche (après 2000) ; impose des raccords de transition | déduit de « rénovation » + mots du devis (« remplacement plomb », « galva ») ; sinon défaut cuivre |
| type\_batiment | moyen | longueurs de tuyau par appareil (plain-pied, étage, appartement), colonnes en immeuble | question Q2 si le devis ne le dit pas |
| gamme | moyen | change le produit (WC suspendu vs posé, mitigeur thermostatique), pas la méthode | lu dans le devis, jamais demandé |
| geographie | faible | gaz de réseau ou propane/fioul, dureté de l'eau (adoucisseur), matériau de tube habituel ; zone climatique pour le chauffage (dimensionnement, pas quantitatif) | département de l'adresse chantier, jamais demandé |

Poids repris dans `metier.json` (section 0). Aucun axe ne déclenche à lui seul une question de région : le moteur ne pose jamais « quelle région ? » pour ce métier.

## 2. Règle d'or et unités de commande

**Règle d'or du métier : jamais un mètre linéaire nu sur la ligne envoyée au négoce.** Le moteur calcule en mètres, puis convertit en barres ou en couronnes entières, à la longueur réellement vendue. Les raccords se commandent à la pièce ou au sachet, les colliers au sachet, la colle au pot.

| Famille | Unité de commande | Exemple de ligne correcte | Ligne interdite |
| --- | --- | --- | --- |
| Tube cuivre écroui | barre (4 m courant, 5 m selon négoce) | 6 barres cuivre 14×1 écroui 4 m | 22 ml cuivre 14 |
| Tube cuivre recuit | couronne (25 ou 50 m) | 1 couronne cuivre recuit 12×1 de 25 m | 18 ml cuivre recuit |
| Tube multicouche | couronne (25, 50, 100, 200 m) ou barre 4 m | 1 couronne multicouche 16×2 de 100 m | 78 m multicouche |
| Tube PER (sanitaire, souvent pré-gainé) | couronne (25, 50, 100 m) | 2 couronnes PER gainé bleu 16 de 50 m | 60 m PER |
| Tube PER plancher chauffant | couronne (120, 200, 240, 600 m) | 2 couronnes PER 16×1,5 de 240 m | 420 ml de tube |
| Tube PVC évacuation | barre (2 ou 4 m) | 3 barres PVC Ø100 de 4 m | 11 m de PVC 100 |
| Raccords (coudes, tés, manchons, raccords à sertir) | u, ou sachet de 4/10 | 12 coudes PVC 87° Ø40 F/F | « raccords divers » |
| Colliers | sachet (10, 50) | 1 sachet de 50 colliers ×40 | 37 colliers |
| Calorifuge | manchon 2 m | 15 manchons isolants 15×9 mm de 2 m | 30 ml d'isolant |
| Colle PVC | pot (250 ml, 500 ml, 1 L) | 1 pot colle PVC 500 ml + 1 décapant 1 L | 0,4 L de colle |
| Appareils, émetteurs, chaudière | u (avec référence et dimensions) | 1 radiateur acier type 22 H600 L1000 | « 6 radiateurs » sans dimension |

Sources des longueurs commerciales : section 4. Une ligne est « commandable telle quelle » si un vendeur au comptoir peut la saisir sans rappeler l'artisan : famille, diamètre, matériau, longueur ou conditionnement, quantité entière.

## 3. Ouvrages, vocabulaire des devis et pièges

Onze ouvrages couvrent l'essentiel des devis de plombier-chauffagiste en maison et petit collectif. Chaque ouvrage devient une entrée de `ouvrages.json` et une entrée de `vocabulaire.json`.

| Ouvrage (code) | Ce que dit le devis | Ce que le moteur en tire | Piège |
| --- | --- | --- | --- |
| `alimentation_ef_ec` | « distribution EF/EC », « alimentation multicouche », « nourrice », « pieuvre », « collecteur sanitaire », « PER gainé » | tubes, raccords, collecteurs, vannes, colliers | souvent chiffré au forfait sans longueur : déduire de la liste d'appareils (R-ALIM) ; « EF/EC » = 2 réseaux, donc 2 tubes |
| `evacuation_eu_ev` | « évacuations PVC », « EU/EV », « chute », « collecteur », « raccordement tout-à-l'égout » | barres PVC par diamètre, coudes, culottes, manchons, colliers, colle | « chute » = vertical Ø100 ; WC = Ø100 même si le devis écrit « évacuation WC » sans diamètre |
| `appareil_sanitaire` | « fourniture et pose WC suspendu », « bâti-support », « vasque », « receveur 90×90 », « paroi », « mitigeur » | 1 appareil = 1 ligne u + son kit (section 9) | un « ensemble WC » inclut cuvette + réservoir ; un WC suspendu exige un bâti + plaque de commande, souvent absents du libellé |
| `production_ecs` | « chauffe-eau électrique 200 L », « ballon », « cumulus », « CET », « thermodynamique » | appareil + groupe de sécurité + siphon + raccords diélectriques + trépied ou console | un CET demande en plus 2 gaines d'air si gainé ; vertical mural ou sur socle change la fixation |
| `generateur_chauffage` | « chaudière gaz condensation », « PAC air/eau », « poêle », « chaudière fioul » | appareil + kit de raccordement + fumisterie ou liaisons frigorifiques + vase, pot à boues, neutraliseur | PAC : liaisons frigorifiques et support (silent-blocs, console ou plots) rarement écrits ; chaudière condensation = évacuation condensats Ø32 |
| `fumisterie` | « ventouse horizontale », « sortie toiture », « conduit 3CE », « tubage » | kit ventouse u + rallonges 0,5/1 m + coudes 87°/45° | le kit de base fait environ 1 m ; chaque mètre en plus = 1 rallonge *(à vérifier par marque)* |
| `emetteur_radiateur` | « radiateur acier type 22 600×1000 », « sèche-serviettes », « robinet thermostatique » | 1 radiateur u avec dimensions + 1 robinet thermostatique + 1 té de réglage | consoles, purgeur et bouchon plein sont livrés avec le radiateur (Radson, Finimetal) : ne pas les commander |
| `distribution_chauffage` | « réseau chauffage bitube », « monotube », « collecteur chauffage », « pieuvre chauffage » | tubes aller + retour, collecteur, vannes | aller ET retour : 2 tubes par radiateur ; « bitube » n'est pas « 2 tubes au total » |
| `plancher_chauffant` | « PCBT », « plancher chauffant hydraulique 85 m² », « plancher rafraîchissant » | couronnes PER/multicouche, isolant, bande périphérique, film, agrafes, collecteur + n boucles | l'unité du devis est en m² : le quantitatif sort en couronnes, panneaux, rouleaux |
| `gaz` | « alimentation gaz cuivre », « robinet de coupure gaz », « flexible gaz NF » | tube cuivre gaz ou multicouche gaz, robinets ROAI | multicouche gaz sous avis technique, ne pas substituer au multicouche eau |
| `depose_reprise` | « dépose ancienne installation », « remplacement plomb », « reprise sur existant » | raccords de transition (cuivre/PER, galva/multicouche), vannes d'isolement, bouchons | aucune longueur à commander pour la dépose ; ne pas confondre « dépose » et « pose » |

Lignes à ignorer pour le quantitatif mais à garder dans le détail fournisseur : main-d'œuvre, déplacement, mise en service, essais d'étanchéité, désembouage (sauf produit), Consuel, certificat Qualigaz, location de matériel.

Marques employées comme noms communs : « Geberit » (bâti-support), « Grohe » ou « Hansgrohe » (robinetterie), « Atlantic » (chauffe-eau), « Saunier Duval », « Frisquet », « De Dietrich » (chaudière), « Daikin » (PAC). Le moteur garde la marque dans la désignation et n'en tire que le type d'appareil.

## 4. Matériaux et fiches fabricant

Chaque ligne ci-dessous devient un objet `Materiau` de `materiaux.json` avec son champ `source`. Les longueurs de barre et de couronne sont celles des fiches fabricant ou négoce citées ; le négoce de l'artisan peut surcharger (niveau artisan).

### 4.1 Tubes d'alimentation

| Article | Dimensions (Ø ext × ép.) | Conditionnement | Poids | Source |
| --- | --- | --- | --- | --- |
| Cuivre recuit (souple) | 10×1, 12×1, 14×1, 16×1 | couronne 50 m | 0,239 / 0,286 / 0,335 / 0,389 kg/ml | [Silmet Esencor, fiche Samse 1047206](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1047206.pdf) |
| Cuivre recuit (souple) | 22×1 | couronne 35 m | 0,643 kg/ml (brut) | idem |
| Cuivre recuit gainé PVC | 12×14, 14×16 | couronne 25 m | — | [Bricozor, KME Wicu](https://www.bricozor.com/tube-cuivre-recuit-wicu-gaine-couronne.html) |
| Cuivre demi-dur / écroui (rigide) | 12×1, 14×1, 16×1, 22×1 | barre 5 m chez Silmet ; barres 1 à 5 m vendues ; **défaut moteur 4 m** *(à vérifier selon négoce)* | 0,281 / 0,321 / 0,378 / 0,528 kg/ml | Silmet (idem) ; [Gedimat, réseau cuivre](https://mamaisondeaaz.gedimat.fr/article/787/125-distribution-de-l-eau-dans-la-maison-un-reseau-en-cuivre.htm) |
| Multicouche PE-RT/Al/PE-RT | 16×2 | couronne 20, 100, 200 m | — | [Legallais réf. 783135 / 782734 / 782735](https://www.legallais.com/product-page-pdf//16595.pdf) |
| Multicouche | 20×2,25 | couronne 20, 100 m | — | Legallais (idem) |
| Multicouche | 25×2,5 / 32×3 | couronne 50 m / 25 m | — | Legallais (idem) |
| Multicouche Henco RIXC | 16×2 / 20×2 / 26×3 | couronnes 25, 50, 100 m (16 et 20) ; 50 m (26) ; existe gainé rouge/bleu | — | [Henco, fiche Angles](https://www.quincaillerie-angles.fr/pdf-product/view/index/id/301362) |
| Multicouche en barre | 16×2 | barre 4 m (vendu par 100 m) | — | [RBM série 1545](https://rbm.eu/fr/produit/serie-1545) |
| PER nu | 12×1,1 (Ø 10/12), 16×1,5 (Ø 13/16), 20×1,9 (Ø 16/20) | couronne 120 ou 240 m | — | [TRA 605, fiche Angles](https://www.quincaillerie-angles.fr/pdf-product/view/index/id/246378) |
| PER pré-gainé (rouge EC / bleu EF) | 16×1,5 | couronne 100 m (25 et 50 m courants *(à vérifier)*) | — | [Anjou Connectique P0216R100S](https://www.anjou-connectique.com/media/files/16527/p0216r100s-fiche-technique.pdf) |

### 4.2 Tubes de plancher chauffant

| Article | Dimensions | Couronnes | Source |
| --- | --- | --- | --- |
| PER Giacomini R996 | 16×1,5 | 120, 200, 240, 600 m | [Giacomini R996](https://static.giacomini.com/fr.giacomini.com/catalog/technical_documentation/R996-BLEU.pdf) |
| PER Giacomini R996 | 12×1,1 | 240 m | idem |
| PER BAO Finimetal Cosytube | 16×1,5 | 240 m, 600 m | [Domomat TUBBAO16240](https://www.domomat.com/55624-tube-per-cosytube-bao-pexcellent5-couronne-16x15-240-m-bleu-finimetal-tubbao16240.html) |
| PER Thermacome Ecotube | 16×1,5 | 80, 120, 240 m | [Bricozor](https://www.bricozor.com/f4253tube-per-ecotube.html) |

Isolant plancher chauffant (plaques à plots ou planes), bande périphérique, film, agrafes : formats non encore sourcés, voir section 13 *(à vérifier)*. Défaut provisoire : plaque à plots 1,2 m² (1 200 × 1 000 mm), bande périphérique rouleau 50 m, film rouleau 50 m² *(à vérifier)*.

### 4.3 Évacuation PVC

| Article | Ø ext / ép. | Conditionnement | Source |
| --- | --- | --- | --- |
| Tube PVC blanc NF Nicoll | 32 / 40 / 50 / 100, ép. 3 mm | barre 4 m (EU4FW/HW/JW/TW) ou 2 m ; fardeau de 10 | [Nicoll gamme blanche](https://www.richardson.fr/files/richardson/technical_document/1c7/93956_t187s8.pdf) ; [Batiproduits Nicoll](https://www.batiproduits.com/fiche/produits/raccords-et-tubes-d-evacuation-des-eaux-p68910703.html) |
| Raccords PVC Nicoll (coudes, manchons, culottes, tés) | 32 / 40 / 50 / 100 | sachet de 4 ou 10 pièces | Batiproduits Nicoll (idem) |
| Colliers PVC Nicoll | 32 à 100 | sachet de 50 | idem |
| Tube PVC extérieur à joint SN4/SN8 (raccordement égout) | 100 | barre 2 m (80 u/palette) ou 4 m | [ATE fiche SN4/SN8](https://cmesmat.fr/media/catalog/product/attributes/q/P/qPhC8aiK9nArlZ9QSRHnV0ot1k7VD5E49XzCflv9b1qwWR92xyY1mTAWc40dERBp.pdf) |

### 4.4 Consommables sourcés

| Article | Conditionnement | Rendement | Source |
| --- | --- | --- | --- |
| Colle PVC (Xhander gel) | pot 250 ml, 500 ml, 1 L ; tube 125 ml | collages par litre : Ø32 = 650 ; Ø40 = 290 ; Ø63 = 100 ; Ø110 = 40 | [Xhander P5537C1](https://medias.descours-cabaud.com/d180001/medias/docus/279/P5537C1_COLLE_PVC_FT_FR.pdf) |
| Colle PVC (Unecol PVC Gel) | — | pour 100 collages : Ø32 = 0,8 L colle + 0,5 L décapant ; Ø40 = 1,1 L + 0,7 L ; Ø110 = 8,0 L + 1,7 L | [Unecol, fiche Samse 1591006](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1591006.pdf) |
| Manchon isolant Armaflex SH | longueur 2 m ; carton 150 m (Ø15×10), 130 m (Ø18×10), 100 m (Ø22×10), 70 m (Ø32 et Ø35×10) | — | [Weinmann-Schanz Armaflex SH](https://weinmann-schanz.de/de/fr/Actions/Tube-isolant-SH-Armaflex/pid.1143.1159/agid.119328/atid.177454/ecm.at/flexible-isolant-Armaflex-SH-15x10mm-2m-long-sachet-150m.html) |

Les deux fiches colle divergent d'un facteur 2 à 5 : le moteur prend Xhander (fiche négoce) et marque le ratio *(à vérifier)* en section 11.

### 4.5 Émetteurs

Radiateur acier à panneaux : 2 ou 3 consoles, bouchon purgeur et bouchon plein, vis et chevilles livrés dans l'emballage ([Radson Compact](<https://www.radson.com/docs/CLD_FR(1).doc>) ; idem Finimetal Pach, consoles et purgeur fournis). Le moteur ne commande donc que : radiateur (type, hauteur, longueur), robinet thermostatique, té de réglage, et raccords à tube. Longueurs commerciales courantes : 400 à 3 000 mm, hauteurs 300 à 900 mm au pas de 100 mm (Finimetal Pach 4, Kermi Therm-X2).

## 5. Règles de calcul (DTU), formules et pertes

Toutes les règles sont des fonctions pures de `regles.json`, une par ouvrage. Entrée = liste d'appareils extraite du devis + défauts (section 6) + réponses (section 7). Sortie = mètres et pièces, convertis ensuite en barres, couronnes, sachets (règle R-CONV).

### 5.1 Diamètres imposés par le NF DTU 60.11

Alimentation, diamètre intérieur minimal par appareil : 10 mm (lavabo, lave-mains, WC, bidet, lave-linge, lave-vaisselle), 12 mm (évier, douche), 13 mm (baignoire, bac à laver) ([Anjou Connectique, d'après DTU 60.11](https://www.anjou-connectique.com/media/wysiwyg/PDF/fiche-conseil-per.pdf)). Correspondance tube retenue par le moteur :

| Diam. int. mini | Cuivre | PER | Multicouche |
| --- | --- | --- | --- |
| 10 mm | 12×1 | 12×1,1 (Ø 10/12) | 16×2 |
| 12 mm | 14×1 | 16×1,5 (Ø 13/16) | 16×2 |
| 13 mm | 16×1 | 16×1,5 | 20×2 |
| Alimentation générale (compteur → collecteur) | 18×1 ou 22×1 *(à vérifier)* | 20×1,9 | 20×2 ou 26×3 *(à vérifier)* |

Évacuation : pente 1 à 3 cm/m, pente recommandée 1 cm/m pour les raccordements d'appareils ([DTU 60.11, extrait CAP Installateur sanitaire](https://bnseep.eduscol.education.fr/ressources/examens/sujets/15/500/2331700/EP1/UP1_DR.pdf) ; [Thermexcel, DTU 60.11 P2 2013](https://www.thermexcel.com/french/divers/Thermexcel%20-%20Programme%20SanitEvac%20-Calcul%20evacuation%202014.pdf)). Diamètres PVC retenus : lavabo, bidet, lave-mains Ø32 ; évier, douche, baignoire, lave-linge, lave-vaisselle, condensats chaudière Ø40 ; WC, chute, collecteur Ø100. La correspondance diamètre intérieur DTU ↔ Ø extérieur PVC est *(à vérifier)* sur le texte du DTU 60.11 P2.

### 5.2 Espacement des colliers (pose apparente uniquement)

| Tube | Horizontal | Vertical | Source |
| --- | --- | --- | --- |
| Cuivre Ø < 22 | 1,25 m maxi | 1,25 m *(à vérifier)* | [Gedimat, DTU 60.5](https://mamaisondeaaz.gedimat.fr/article/787/125-distribution-de-l-eau-dans-la-maison-un-reseau-en-cuivre.htm) |
| Cuivre Ø ≥ 22 | 1,80 m | 2,50 m | idem ; 2,5 m maxi en gaine ([Batirama DTU 60.5](https://www.batirama.com/article/27140-nf-dtu-60.5-canalisations-en-cuivre.html)) |
| Multicouche 16×2 / 20×2,25 / 25×2,5 | 1,20 / 1,30 / 1,50 m | 2,00 / 2,30 / 2,60 m | [Uponor Uni Pipe Plus](https://media.hornbach.nl/hb/safetywarning/as.120563811.pdf) |
| PVC évacuation Ø32 à 63 | 0,50 m | 2,70 m maxi | [Nicoll, d'après DTU 60.31/60.33](https://static.mypum.fr/media/FT/BS-FTCO_Collier_a_bride.pdf) |
| PVC évacuation Ø75 à 110 | 0,80 m | 2,70 m maxi | idem |
| PER | pose sous gaine ou fourreau, pas de collier linéaire *(à vérifier)* | — | — |

Colliers par tronçon = arrondi supérieur (L / espacement) + 1, plus 1 collier par changement de direction. Pose encastrée ou en dalle : 0 collier.

### 5.3 Formules par ouvrage

| Code règle | Ouvrage | Formule | Perte |
| --- | --- | --- | --- |
| R-ALIM | alimentation\_ef\_ec | pour chaque appareil a : L\_a = longueur\_type(type\_batiment) ; L\_EF = Σ L\_a ; L\_EC = Σ L\_a des appareils avec eau chaude ; + 1 liaison compteur → collecteur EF et 1 liaison production ECS → collecteur EC | +10 % |
| R-ALIM-TE | distribution en té (série) | L = 0,6 × R-ALIM *(à vérifier)*, en 2 diamètres : 60 % en diamètre général, 40 % en diamètre d'appareil | +10 % |
| R-COLL | collecteur sanitaire | sorties = nb d'appareils par eau ; collecteur = combinaison de modules 2 à 6 sorties *(à vérifier gamme)* ; 1 vanne d'arrêt par collecteur | 0 |
| R-RACC-ALIM | raccords d'alimentation | pieuvre : 2 raccords par appareil et par eau (sortie collecteur + applique murale) ; en té : 1 té + 1 applique + 2 coudes par appareil et par eau *(à vérifier)* | +1 de chaque diamètre |
| R-EVAC | evacuation\_eu\_ev | pour chaque appareil : L = longueur\_evac(type) dans son diamètre (5.1) ; + chute Ø100 = hauteur d'étage × nb niveaux au-dessus du rez-de-chaussée ; + collecteur Ø100 jusqu'à la sortie | +10 % |
| R-RACC-EVAC | raccords PVC | par appareil : 2 coudes (87° + 45°) + 1 piquage (culotte ou té) ; manchons = barres − 1 par diamètre ; 1 tampon de visite par chute et par changement de direction du collecteur | 0 |
| R-COLLE | colle PVC | collages = 2 par raccord ; litres = Σ (collages\_Ø / collages\_par\_litre\_Ø) ; pots = combinaison 250 / 500 ml / 1 L couvrant le volume ; décapant = même nombre de pots | arrondi au pot |
| R-RAD | emetteur\_radiateur | par radiateur : 1 radiateur (type, H, L du devis) + 1 robinet thermostatique + 1 té de réglage + 2 raccords tube | 0 |
| R-DIST-CH | distribution\_chauffage | bitube en pieuvre : 2 × longueur\_type(type\_batiment) par radiateur ; diamètre 16 (multicouche) ou 12×1,1 PER ; + 1 collecteur aller/retour à n sorties | +10 % |
| R-PC | plancher\_chauffant | L\_tube = S × 100 / pas\_cm + 2 × amenée × nb\_boucles ; nb\_boucles = max(nb pièces, arrondi sup. (L\_tube / 120)) ; boucle maxi 120 m ([Giacomini GiacoConfort](https://fr.giacomini.com/dam/jcr:f0e9e28a-93d0-4478-8c34-44d3fd1915ac/Guide%20de%20pose%20GiacoConfort%202020.pdf)) | +3 % |
| R-PC-COUR | couronnes plancher | une boucle ne se raccorde jamais en cours de route : chaque couronne contient un nombre entier de boucles (bin packing des boucles dans les couronnes 120 / 240 / 600 m) | chute réelle |
| R-PC-ISO | isolant, bande, film | plaques = arrondi sup. (S × 1,05 / surface\_plaque) ; bande périphérique = périmètre des pièces (défaut 1,2 ml/m² *(à vérifier)*) / longueur rouleau ; collecteur plancher à nb\_boucles sorties | +5 % |
| R-ECS | production\_ecs | 1 appareil + 1 groupe de sécurité + 1 siphon + 2 raccords diélectriques + 1 réducteur de pression si pression > 4 bar (non connu : ajouté en hypothèse décochable) | 0 |
| R-GEN | generateur\_chauffage | 1 appareil + kit de raccordement fabricant + 1 pot à boues magnétique + 1 disconnecteur de remplissage ; condensation : + 1 neutraliseur + évacuation Ø32 ; PAC : + liaisons frigorifiques (couronne cuivre frigo) + support | 0 |
| R-ISO | calorifuge | manchons = arrondi sup. (L\_EC hors dalle + L\_chauffage hors volume chauffé) / 2 m | +5 % |
| R-CONV | toutes | couronnes : plus petite couronne ≥ L ; au-delà, couronnes les plus grandes + reste dans la plus petite couronne qui le couvre ; barres = arrondi sup. (L / longueur\_barre) ; sachets = arrondi sup. (pièces / contenance) | — |

La somme des pertes n'est jamais appliquée deux fois : la perte s'applique au mètre, puis l'arrondi à l'unité de commande se fait sans marge supplémentaire.
