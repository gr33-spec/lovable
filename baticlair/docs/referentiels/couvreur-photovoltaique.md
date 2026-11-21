# Référentiel quantitatif COUVREUR PHOTOVOLTAÏQUE (Rappidos)

Oct 3, 2026 · @Greg

## 1. Métier et axes de variation

Le couvreur photovoltaïque pose des modules solaires sur une toiture existante ou neuve, avec leur système de fixation, leur électronique (onduleur ou micro-onduleurs) et le câblage jusqu'au tableau. Le quantitatif PV dépend d'abord du **type de toiture** (qui fixe le crochet et le rail) et du **type d'onduleur** (qui fixe toute la partie électrique), presque pas de la région.

**Périmètre v1** : résidentiel et petit tertiaire, 1 à 36 kWc raccordés en basse tension, en surimposition sur tuile, ardoise, bac acier, en intégration (IAB) sur toiture neuve ou refaite, et en toiture-terrasse lestée. Hors périmètre v1 : centrales au sol, ombrières de parking, grandes toitures > 100 kWc (bureau d'études obligatoire), batteries > 1 unité (ajoutées à la pièce si le devis les cite).

**Ce que dit un devis PV** : une puissance crête (ex. « 6 kWc »), un nombre et un modèle de panneaux, un type d'onduleur, parfois le système de fixation. Il ne dit presque jamais le nombre de crochets, de rails, de brides ni les mètres de câble : c'est exactement ce que l'app doit produire.

### Axes de variation (metier.json)

| Axe | Poids | Pourquoi | Effet sur le quantitatif |
| --- | --- | --- | --- |
| type\_batiment (type de toiture) | fort | tuile, ardoise, bac acier, toit plat : 4 systèmes de fixation différents | change toute la liste fixation (crochets, rails, lest) |
| gamme (électronique) | fort | micro-onduleurs ou onduleur central (string), optimiseurs | change toute la liste électrique (câbles AC/DC, coffrets, passerelle) |
| neuf\_renovation | moyen | intégration au bâti (IAB) sur toit neuf/refait, ou surimposition sur toit existant ; dépose éventuelle d'anciens panneaux | IAB : bacs d'intégration + abergements à la place des crochets ; réno : tuiles de remplacement |
| geographie | moyen | zones de vent et de neige (Eurocodes) → entraxe des crochets ; littoral → inox A4 ; matériau de couverture régional (ardoise Ouest, canal Sud) | +0 à +50 % de crochets, visserie inox en bord de mer |
| epoque\_bati | faible | charpente ancienne (entraxe chevrons irrégulier, bois dur), amiante sur fibres-ciment | ajoute des fixations ou bloque (amiante : refus de calcul, alerte) |

```json
{
  "code": "photovoltaique",
  "nom": "Couvreur photovoltaïque - installateur PV",
  "version": "1.0.0",
  "normes": ["NF C 15-100", "Guide UTE C 15-712-1", "NF EN 1991-1-3 (neige)", "NF EN 1991-1-4 (vent)", "NF DTU 40.xx (couverture support)", "Avis techniques / ETN des procédés"],
  "axes_de_variation": {
    "type_batiment": "fort",
    "gamme": "fort",
    "neuf_renovation": "moyen",
    "geographie": "moyen",
    "epoque_bati": "faible"
  },
  "metiers_lies": ["couverture", "electricite", "charpente"],
  "unites_de_commande": ["u", "barre", "boite", "sachet", "touret", "couronne", "paire", "palette", "kit"],
  "maturite": "beta"
}
```

**Particularité pour le moteur** : la puissance (kWc) n'est jamais une unité de commande. Elle sert seulement à retrouver le nombre de modules si le devis ne le donne pas : modules = arrondi supérieur (puissance Wc ÷ puissance d'un module).

## 2. Règle d'or et unités de commande

**Règle d'or PV** : jamais de m², jamais de kWc, jamais de « ml de rail » nu dans le quantitatif. Chaque ligne se commande telle quelle : des modules à l'unité (ou par palette complète), des rails en barres de longueur fabricant, des crochets et des brides à l'unité ou par boîte, du câble en touret ou en couronne de longueur réelle.

| Famille | Unité de commande | Exemple de ligne prête pour le négoce | Jamais |
| --- | --- | --- | --- |
| Modules | u (+ mention palette si ≥ 1 palette) | 14 modules 425 Wc 1722×1134 mm cadre noir | « 6 kWc de panneaux », « 27 m² » |
| Rails | barre de longueur fabricant | 8 barres de 4,40 m + 4 éclisses | « 31 ml de rail » |
| Crochets / pattes | u ou boîte | 28 crochets tuile réglables inox + 56 vis bois 8×100 | « crochets selon besoin » |
| Brides | u ou sachet | 24 brides intermédiaires 30-40 mm + 8 brides d'extrémité | « brides » sans hauteur de cadre |
| Câble solaire DC | touret ou couronne (50 / 100 m) | 1 couronne 100 m rouge 6 mm² + 1 couronne 100 m noir 6 mm² | « 37 m de câble » |
| Câble AC | couronne (25 / 50 / 100 m) | 1 couronne 50 m R2V 3G6 | — |
| Connecteurs | paire (mâle + femelle) | 6 paires MC4 4-6 mm² | — |
| Micro-onduleurs | u | 14 micro-onduleurs + 14 connecteurs de câble bus | — |
| Câble bus micro-onduleur | u de connecteurs (câble pré-connectorisé au pas) | câble bus 14 connecteurs, pas portrait + 2 bouchons | « câble Enphase 25 m » |
| Coffrets, passerelle, parafoudre | u / kit | 1 coffret AC 1 string 30 mA + 1 passerelle de communication | — |
| Intégration (IAB) | kit pour N modules + ml d'abergement → u | 1 kit 2 rangées × 7 modules + abergements gauche/droite | « m² d'intégration » |
| Lest toit plat | u (bloc béton ou plot) | 56 blocs béton 12,5 kg | « 700 kg de lest » |

**Arrondis** : barres, couronnes et boîtes toujours arrondies au conditionnement supérieur ; modules jamais arrondis (le nombre du devis fait foi) ; si le devis donne une puissance sans nombre de modules, afficher le calcul et le nombre retenu. Une palette entamée se commande à l'unité, l'app propose « palette complète » seulement si l'écart est ≤ 3 modules et le signale.

## 3. Ouvrages, vocabulaire des devis et pièges

Neuf ouvrages couvrent l'essentiel des devis PV résidentiels. Chaque ligne de devis est rattachée à un ouvrage via vocabulaire.json ; un devis PV complet en active en général 3 à 5 (champ + fixation + électronique + câblage + mise en service).

| Code ouvrage | Ce que l'artisan réalise | Ce que disent les devis (synonymes) | Piège |
| --- | --- | --- | --- |
| PV-CHAMP | pose des modules | « centrale PV 6 kWc », « 14 panneaux 425 Wc », « kit solaire », « modules monocristallins full black », « générateur photovoltaïque » | la puissance est donnée, le nombre de modules non : le déduire ; « 6 kWc » avec 410 Wc = 15 modules, pas 14 |
| PV-SURIMP-TUILE | fixation sur tuiles (rails + crochets) | « surimposition », « fixation K2 / Renusol / Esdec », « crochets de toit », « système de montage sur tuiles » | tuile canal ou plate : crochet différent du mécanique ; tuile cassée au remplacement → prévoir tuiles de rechange |
| PV-SURIMP-ARDOISE | fixation sur ardoises | « crochets ardoise », « plaque d'étanchéité », « fixation sur ardoise » | chaque crochet demande une plaque d'étanchéité (plomb/alu) sous les ardoises : ne pas l'oublier |
| PV-SURIMP-BAC | fixation sur bac acier / fibres-ciment | « mini-rail », « fixation bac acier », « vis autoperceuses », « tôle ondulée » | fibres-ciment ancien (avant 1997) = amiante possible → alerte, pas de calcul |
| PV-IAB | intégration au bâti (les modules remplacent la couverture) | « intégré au bâti », « IAB », « GSE In-Roof », « EasyRoof », « bac d'intégration », « intégration simplifiée » | les tuiles déposées ne sont pas reposées : abergements, closoirs, écran et liteaux en plus ; bien compter rangées × colonnes |
| PV-TOIT-PLAT | toiture-terrasse lestée ou fixée | « toit plat », « châssis lesté », « bacs lestés », « structure inclinée 10-15° » | le lest dépend du vent et de la hauteur du bâtiment : jamais deviné sans note de calcul fabricant |
| PV-ELEC-MICRO | électronique micro-onduleurs | « micro-onduleurs Enphase IQ8 », « APsystems », « Hoymiles », « 1 micro par panneau » | APsystems DS3 et Hoymiles HMS-800 gèrent 2 modules : 1 micro pour 2 panneaux |
| PV-ELEC-STRING | onduleur central (+ optimiseurs éventuels) | « onduleur Huawei / SolarEdge / Fronius 6 kW », « onduleur hybride », « optimiseurs » | SolarEdge = 1 optimiseur par module obligatoire ; onduleur hybride = batterie possible, ne pas l'ajouter si le devis ne la cite pas |
| PV-RACCO | protections, câblage, terre, mise en service | « coffret AC/DC », « parafoudre », « câblage jusqu'au TGBT », « mise à la terre », « Consuel », « passerelle de monitoring » | le Consuel et les démarches ne se commandent pas : les ignorer dans le quantitatif |

**Lignes à ignorer** (prestations, pas de matériel) : démarches administratives, déclaration préalable, demande de raccordement Enedis, attestation Consuel, contrat d'obligation d'achat, échafaudage/nacelle en location, main d'œuvre, frais de déplacement, garantie, monitoring par abonnement.

**Pièges transverses** : la « hauteur de cadre » du module (30, 35, 40 mm) choisit la bride ; « full black » impose des brides et rails noirs ; un devis « autoconsommation avec revente du surplus » ne change pas le matériel ; « 2 pans » ou « est-ouest » = deux champs à calculer séparément (et un onduleur à 2 MPPT ou des micro-onduleurs).

## 4. Matériaux et fiches fabricant

Le format de module dominant en résidentiel 2025-2026 est le **1722 × 1134 × 30 mm, 425 Wc, ≈ 21-25 kg, palette de 36** : c'est le défaut de l'app quand le devis ne donne pas les dimensions. Le conditionnement de materiaux.json vient d'une fiche négoce quand elle existe, sinon du fabricant (marqué).

### 4.1 Modules

| Produit | Dimensions (mm) | Puissance | Poids | Câbles / connecteurs | Conditionnement | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Norwatt BIFAC-BVM 425 TC (réf. AR04362) | 1722 × 1134 × 30 | 425 Wc | 22 kg | MC4 d'origine | palette de 36 (négoce Cedeo / Asturienne) | [Cedeo](https://www.cedeo.fr/p/electricite-et-domotique/module-pv-norwatt-425wc-topcon-black-mesh-biverre-bifacial-dimension-1722x1134x30mm-garantie-30-ans-verre-2-x-1-6mm-original-mc4-connecteur-palette-de-36pcs-ref-norwatt-bifac-bvm-425-tc-ar04362-A4734663) |
| Longi LR5-54HTB-425M | 1722 × 1134 × 30 | 425 Wc | 20,8 kg | MC4 compatible | palette de 36 | [UpWatt](https://www.upwatt.com/longi-solar-panneau-solaire-monocristallin-425-wc-technologie-cellules-ibc.html) |
| DualSun FLASH 425 bi-verre | 1722 × 1134 × 30 | 425 Wc | 23,6 à 25,1 kg | Stäubli MC4 EVO2A, câbles 1200 mm | palette de 36 | [Qualiwatt](https://qualiwatt.pro/en/products/module-monocristallin-demi-cellules-dualsun-flash-425-wc-full-black-copie), [FCS](https://france-chauffage-solaire.fr/panneau-solaire-425wc-dualsun-top-con-fcs-3416.html) |
| Jinko 425 full black | 1762 × 1134 × 30 | 425 Wc | 22 kg | 4 mm² | à vérifier | [Leroy Merlin](https://www.leroymerlin.fr/produits/panneau-photovoltaique-425-wc-full-black-jinko-l-176-3-x-l-113-4-x-ep-3-cm-96039721.html) |

Règle : la **hauteur de cadre** (30, 35, 40 mm) et la **couleur** (alu / noir) du module choisissent les brides ; la **largeur** et la **longueur** du module fixent les longueurs de rail et l'entraxe du câble bus.

### 4.2 Fixation surimposition (rails, crochets, brides) — K2 Systems, référence de marché

| Article | Caractéristiques | Unité de commande | Poids | Source |
| --- | --- | --- | --- | --- |
| Rail SingleRail 36 | alu EN AW-6063 T66, h 36 mm, l 39,4 mm ; longueurs 2,40 / 3,65 / 4,80 / 5,95 m ; noir anodisé en 4,80 m | barre | 1,85 kg (2,40 m), 2,81 kg (3,65 m) | [K2 catalogue](https://catalogue.k2-systems.com/en/singlerail-36/2003458) |
| Raccord de rail SingleRail 36/50 RailConnector | s'emboîte, assure la continuité de terre | u (1 par jonction) | à vérifier | [K2 système](https://catalogue.k2-systems.com/en/mounting-systems/pitched-roof-systems/k2-singlerail-system/) |
| Crochet SingleHook 3S | réglable 40/47/54 mm, chevron ≥ 48 mm, Climber 36/50 prémonté, alu + inox A2 | u | à vérifier | idem |
| Crochet SingleHook 3S Long | bras long pour tuiles à fort recouvrement | u | à vérifier | idem |
| Crochet SingleHook 4S | réglage total 120,5-165,1 mm, pour tuiles hautes | u | à vérifier | idem |
| Crochet SingleHook FlatTile (tuile plate) | Magnelis, h ≈ 144 mm, **2 tôles d'étanchéité 300 × 260 mm par crochet** | u + 2 tôles | à vérifier | idem |
| Crochet SingleHook Slate (ardoise) | bras réglable, Climber 36/50 + vis M8×25 | u (annoncé « bientôt ») | à vérifier | idem |
| Tire-fond SingleRail M10 / M12 (fibres-ciment ondulé) | longueurs 180-300 mm, joint fibres-ciment | u | à vérifier | idem |
| Bride intermédiaire K2 Clamp MC 25-40 | cadres 25 à 40 mm ; existe en noir anodisé | u | à vérifier | idem |
| Bride d'extrémité K2 Clamp EC 25-40 | cadres 25 à 40 mm ; existe en noir anodisé | u | à vérifier | idem |
| Bride XS (intermédiaire / extrémité) | cadre 30 ou 33-35 mm, alu ou noir | u | à vérifier | idem |
| Tuile de remplacement métal K2 4Tile | 408 × 327,6 × 40,3 mm, pour tuiles béton | u | à vérifier | idem |

Alternatives fréquentes en France (même logique de calcul, références à saisir) : Esdec ClickFit Evo (crochet universel, réglage 32-65 mm, zones de vent 1 à 4 — [notice](https://www.esdec.com/wp-content/uploads/2023/03/Manual_ClickFitEvo_TiledRoof_306_FR.pdf)), Renusol, Schletter. **À vérifier** : vis bois de crochet (diamètre et longueur, 2 par crochet en général) selon la notice K2 « Screw manual roof hooks ».

### 4.3 Intégration au bâti (IAB) — GSE In-Roof System

| Caractéristique | Valeur | Source |
| --- | --- | --- |
| Composition | plaques support (1 par module, portrait ou paysage), fixations, abergements (latéraux, faîtage, angles), bandes d'étanchéité | [Civisol](https://www.civisol.fr/967--systeme-d-integration-gse.html) |
| Pente | 12° à 50° (fiche 2022 : 12 à 60°) | [Sonepar](https://www.sonew.fr/la-selection-produits-sonepar/genie-climatique/625-gse-in-roof-system), [fiche GSE](https://www.gseintegration.com/wp-content/uploads/2022/01/Fiche-Produit-Gamme-GSE-IN-ROOF-SYSTEM-FR.pdf) |
| Poids | 2 à 3 kg/m² | Sonepar |
| Conditionnement plaques | 50 plaques par palette | fiche GSE |
| Modules compatibles (portrait 2022) | longueur 1610-1990 mm, largeur 990-1160 mm, jusqu'à 450 Wc | fiche GSE |
| Abergements | 2 crochets de fixation minimum par pièce ; recouvrement latéral ≥ 150 mm ; jonction de faîtage ≥ 100 mm | [manuel GSE](https://www.fichier-pdf.fr/2018/01/04/ir-fr-gu/ir-fr-gu.pdf) |
| Visserie | vis bois autoperceuse 6,5 × 60 + joint EPDM | [manuel GSE V12.5](https://www.gseintegration.com/wp-content/uploads/2022/12/GSE-IN-ROOF-SYSTEM-Manuel-dinstallation-FR-V12.5.pdf) |

### 4.4 Électronique et câblage

| Article | Caractéristiques | Unité de commande | Source |
| --- | --- | --- | --- |
| Câble bus Enphase Q-25-10-240 (portrait) | 2 × 2,5 mm², 250 VAC 25 A, **1 connecteur tous les 1,3 m**, 0,27 kg par connecteur | u de connecteur (1 par micro-onduleur) | [fiche Enphase FR](https://139708663.fs1.hubspotusercontent-eu1.net/hubfs/139708663/Fiches%20techniques/ENPHASE/FICHE%20TECHNIQUE%20ENPHASE%20Q%20CABLE%20-FR.pdf) |
| Câble bus Enphase Q-25-17-240 (paysage) | **1 connecteur tous les 2,0 m**, 0,37 kg par connecteur | u de connecteur | idem |
| Embout de terminaison Q-TERM-R-10 | 1 par circuit AC (fin de câble bus) | sachet de 10 | [fiche Enphase EMEA](https://groupe-mb.scene7.com/is/content/groupemb/ft_NED_Q_TERM_R_10) |
| Bouchon d'étanchéité Q-SEAL-10 | 1 par connecteur inutilisé | sachet de 10 | idem |
| Outil de déconnexion Q-DISC-10 | 1 par installation | u | idem |
| Passerelle IQ Gateway | jusqu'à 300 micro-onduleurs, Wi-Fi / Ethernet, 1 production + 2 consommation CT | u (1 par installation) | [Enphase](https://enphase.com/en-lac/download/iq-gateway-data-sheet) |
| Câble solaire H1Z2Z2-K 6 mm² (EN 50618) | rouge ou noir, 1500 V DC, ≈ 80 kg/km | couronne 100 m (≈ 8 à 8,9 kg) ou touret 500 m | [UpWatt rouge](https://www.upwatt.com/cable-solaire-rouge-6mm2-h1z2z2-k-dca-bobine-de-100m.html), [UpWatt noir](https://www.upwatt.com/cable-solaire-noir-6mm2-h1z2z2-k-dca-bobine-de-100m.html), [Comptoir du câble](https://www.comptoir-du-cable.com/cables-electriques-souples/137-cable-solaire-photovoltaique-h1z2z2k.html) |
| Connecteurs MC4 (Stäubli type 4, 4-6 mm²) | mâle + femelle de même marque obligatoire (UTE C 15-712-1) | paire | [photovoltaique.info](https://www.photovoltaique.info/fr/realiser-une-installation/regles-conception-mise-en-oeuvre/normes-electriques-applicables-aux-systemes-pv/guide-ute-c-15-712-1/) |
| Câble AC U1000 R2V | section selon puissance et longueur (2,5 mm² mini en sortie de câble bus Enphase) | couronne 25 / 50 / 100 m | [123elec](https://www.123elec.com/enphase-cable-micro-onduleur-iq7-iq7-iq7x-monophase-portrait-q-25-10-240.html) |
| Micro-onduleurs (Enphase IQ8, APsystems, Hoymiles), onduleurs string (Huawei, SolarEdge, Fronius…), coffrets AC/DC, parafoudres | repris du devis, modèle exact | u | modèle du devis ; à vérifier : tableau des puissances par module |

## 5. Règles de calcul, formules et pertes

Il n'existe **pas de DTU photovoltaïque** : les règles viennent du guide UTE C 15-712-1 (électricité), des Eurocodes neige et vent (dimensionnement des fixations), des notices et avis techniques des fabricants (pose), et des DTU de couverture pour le support. L'app calcule en code pur à partir du **calepinage** (rangées × colonnes) ; la note de calcul du fabricant (K2 Base, Esdec, GSE) fait foi et remplace le résultat si l'artisan la joint.

### 5.1 Calepinage (entrée de tout le reste)

Notations : N modules, L longueur et l largeur du module (m), R rangées, C colonnes par rangée, j = 0,02 m de jeu entre modules (largeur de bride intermédiaire, *à vérifier selon bride*), d = 0,035 m de débord du rail au-delà du dernier module de chaque côté ([Esdec : 20 à 35 mm](https://www.esdec.com/wp-content/uploads/2023/03/Manual_ClickFitEvo_TiledRoof_306_FR.pdf)).

- Si le devis donne N mais pas R × C : R = 1 si N ≤ 10, sinon R = 2 si N ≤ 24, sinon R = 3 ; C = arrondi sup. (N ÷ R). L'hypothèse est affichée et modifiable d'un tap.
- Si N n'est pas un multiple de R, la dernière rangée est plus courte : chaque rangée est calculée avec son propre C.
- Deux pans (est-ouest, sud + ouest) = deux champs calculés séparément, puis additionnés.

Longueur d'une rangée de rail, en portrait (défaut) :

```latex
L_{rail} = C \cdot l + (C - 1) \cdot j + 2d
```

En paysage, remplacer l par L ; l'app affiche « vérifier que le fabricant autorise le bridage sur le petit côté ».

### 5.2 Surimposition sur tuile, ardoise, bac acier

| Élément | Formule | Arrondi / perte |
| --- | --- | --- |
| Rails | 2 rails par rangée, chacun de longueur L\_rail | découpe optimisée dans les barres du catalogue (algorithme 5.4), chutes réutilisées entre rails |
| Raccords de rail | par rail : (nombre de morceaux − 1) | aucune perte |
| Crochets (tuile, ardoise) | par rail : arrondi sup. (L\_rail ÷ e) + 1, avec e = entraxe retenu (5.3) | +5 %, minimum +2 |
| Vis de crochet | 2 par crochet *(à vérifier notice K2)* | boîte de 50 ou 100 |
| Brides d'extrémité | 4 par rangée | +2 au total |
| Brides intermédiaires | 2 × (C − 1) par rangée | +2 au total |
| Embouts de rail (option full black) | 2 par rail | aucune |
| Tuiles de rechange | arrondi sup. (crochets × 0,10), minimum 5 *(à vérifier)* | — |
| Plaques d'étanchéité ardoise | 1 par crochet *(à vérifier selon système)* | +5 % |
| Tôles d'étanchéité tuile plate (K2 FlatTile) | 2 par crochet ([K2](https://catalogue.k2-systems.com/en/mounting-systems/pitched-roof-systems/k2-singlerail-system/)) | +5 % |
| Bac acier (mini-rails) | 2 mini-rails par jonction verticale de modules : 2 × (C + 1) par rangée, 4 vis autoperceuses par mini-rail *(à vérifier K2 MiniRail)* | vis +10 % |
| Fibres-ciment ondulé | 1 tire-fond M10/M12 à la place de chaque crochet | +5 % ; **si bâtiment avant 1997 : alerte amiante, pas de calcul** |

### 5.3 Entraxe des crochets (dépend de la zone)

Le crochet se visse dans un chevron : l'entraxe retenu est un multiple de l'entraxe des chevrons a (défaut 0,60 m), sans dépasser e\_max.

```latex
e = \lfloor e_{max} / a \rfloor \cdot a
```

| Situation (département → zones Eurocode) | e\_max par défaut | e avec chevrons à 0,60 m |
| --- | --- | --- |
| Vent zones 1-2, neige A-B, altitude < 500 m | 1,20 m | 1,20 m |
| Vent zone 3, littoral, neige C, altitude 500-900 m | 0,90 m | 0,60 m |
| Vent zone 4 (Corse, Outre-mer), neige D-E, altitude > 900 m | 0,60 m | 0,60 m |

Ces e\_max sont des **valeurs prudentes de pré-chiffrage, à vérifier** contre K2 Base / la note de calcul fabricant (la notice Esdec rappelle que la distance entre crochets dépend du vent, de la hauteur du bâtiment, de l'emplacement et de l'état du toit). Contrôle de cohérence : en portrait avec e ≈ 1,20 m, on retrouve ≈ « nombre de modules + 1 » crochets par rail, la règle de terrain la plus citée.

### 5.4 Découpe des rails en barres (algorithme)

1. Liste des morceaux à couper : pour chaque rail, si L\_rail ≤ plus grande barre du catalogue, un seul morceau ; sinon découper en morceaux ≤ barre maxi, jonctions placées entre deux crochets.
2. Rangement « premier ajustement décroissant » dans les barres du catalogue négoce (défaut K2 : 2,40 / 3,65 / 4,80 / 5,95 m ; si le négoce n'a que 2 longueurs, n'utiliser que celles-ci).
3. Choisir la combinaison qui minimise d'abord la chute totale, puis le nombre de raccords.
4. Afficher « 8 barres de 4,80 m + 2 barres de 2,40 m, chute totale 1,3 m ». Ne jamais afficher de ml.

### 5.5 Intégration au bâti (GSE In-Roof, référence)

| Élément | Formule | Source / statut |
| --- | --- | --- |
| Plaques support | 1 par module, format du module | [fiche GSE](https://www.gseintegration.com/wp-content/uploads/2022/01/Fiche-Produit-Gamme-GSE-IN-ROOF-SYSTEM-FR.pdf) |
| Abergements latéraux | R à gauche + R à droite | *à vérifier manuel GSE* |
| Abergements de faîtage | C | *à vérifier* |
| Jonctions de faîtage | C − 1 | *à vérifier* |
| Abergements d'angle | 1 gauche + 1 droit | [manuel GSE](https://www.fichier-pdf.fr/2018/01/04/ir-fr-gu/ir-fr-gu.pdf) |
| Crochets d'abergement | 2 par pièce d'abergement minimum | manuel GSE |
| Bande d'étanchéité basse | longueur = C × l + 0,30 m → rouleau | *à vérifier* |
| Écran de sous-toiture, liteaux | surface du champ + 0,5 m tout autour → rouleaux ; liteaux selon plan de lattage GSE | *à vérifier* |

Règle app : si le fabricant vend un **kit complet par configuration** (R × C), sortir la ligne kit plutôt que le détail.

### 5.6 Électrique — micro-onduleurs (Enphase et équivalents)

| Élément | Formule | Arrondi |
| --- | --- | --- |
| Micro-onduleurs | N (1 module par micro) ; N ÷ 2 arrondi sup. (micros 2 entrées type APsystems DS3, Hoymiles HMS-800) ; N ÷ 4 (micros 4 entrées) | aucun |
| Circuits AC (branches) | B = arrondi sup. (micros ÷ maxi par branche du modèle) *(maxi à saisir par modèle)* | — |
| Connecteurs de câble bus | micros + (R − 1) changements de rangée | aucun ; 1,3 m de pas en portrait, 2,0 m en paysage ([Enphase](https://139708663.fs1.hubspotusercontent-eu1.net/hubfs/139708663/Fiches%20techniques/ENPHASE/FICHE%20TECHNIQUE%20ENPHASE%20Q%20CABLE%20-FR.pdf)) |
| Embouts de terminaison | B | sachet de 10 |
| Bouchons d'étanchéité | connecteurs inutilisés (= R − 1) | sachet de 10 |
| Passerelle de communication | 1 | — |
| Outil de déconnexion | 1 | — |
| Boîte de jonction toiture | B | — |
| Câble AC toiture → tableau | (D + 3 m) × B, D = distance selon question 7.3 | couronne 25 / 50 / 100 m supérieure, +10 % |

### 5.7 Électrique — onduleur central (string)

| Élément | Formule | Arrondi |
| --- | --- | --- |
| Chaînes (strings) | repris du devis ; sinon S = arrondi sup. (N ÷ n\_max), n\_max = arrondi inf. (U\_dc max onduleur ÷ (Voc module × 1,15)) *(coefficient froid à vérifier)* | — |
| Optimiseurs | N si le devis cite SolarEdge ou « optimiseurs » | aucun |
| Câble solaire DC | par chaîne : 2 × (D + L\_rail max + 2 m) ; +2 m par changement de rangée | **une couronne rouge + une couronne noire**, 50 ou 100 m, +10 % |
| Connecteurs MC4 | 2 paires par chaîne + 2 paires de réserve | paire |
| Coffret DC (sectionneur + parafoudre) | 1 par onduleur si non intégré *(à vérifier UTE C 15-712-1)* | — |
| Coffret AC (disjoncteur + différentiel + parafoudre) | 1 par onduleur | — |
| Câble AC onduleur → tableau | D\_ond + 2 m | couronne supérieure |

### 5.8 Communs (toujours ajoutés)

| Élément | Formule | Arrondi / perte |
| --- | --- | --- |
| Liaison équipotentielle (terre) | câble vert-jaune, longueur = D + 2 × L\_rail max ; section 6 mm² mini *(à vérifier UTE C 15-712-1 : 6 ou 16 mm² selon paratonnerre)* | couronne 25 / 50 m |
| Bornes / griffes de terre sur rail | 1 par rail + 1 par raccord *(à vérifier : le raccord K2 assure déjà la continuité)* | sachet |
| Colliers de câble anti-UV | 4 par module | sachet de 100, +20 % |
| Gaine ICTA Ø 25 (descente intérieure) | D | couronne 25 / 50 / 100 m |
| Étiquettes de signalisation PV (obligatoires) | 1 jeu par installation | kit |
