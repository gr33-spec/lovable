# Référentiel quantitatif CHARPENTIER (Rappidos)

Oct 3, 2026 · @Greg

Ce document est le tiroir `charpente` du moteur quantitatif BatiClair : il suit le gabarit de la section 27 du référentiel couverture, chapitre par chapitre, et se transcrit en fichiers `referentiels/charpente/*.json`. Statut : **beta, à faire relire par un charpentier** (chapitre 11). Toute valeur non sourcée porte la mention *(à vérifier)*.

**Périmètre.** Charpente bois de toiture traditionnelle (fermes, pannes, chevrons, sablières), charpente industrialisée (fermettes), lamellé-collé et bois massif abouté, auvents et carports, planchers de comble et solivage, traitement des bois, ancrages, connecteurs et quincaillerie. **Hors périmètre** : liteaux, contre-liteaux, écran sous-toiture et couverture (tiroir `couverture`), murs à ossature bois (futur tiroir `ossature-bois`, DTU 31.2), escaliers (DTU 31.1 partie escaliers, futur), charpente métallique.

**Frontière avec la couverture.** Si le devis du charpentier contient aussi la couverture, le moteur charge les deux tiroirs ; chaque ligne n'est comptée qu'une fois (règle de dédoublonnage par `ouvrage_id`).

## 1. Métier et axes de variation

Le charpentier commande des **pièces de bois d'une section et d'une longueur données**, plus de la quincaillerie à la pièce ou à la boîte. Le facteur qui pèse le plus sur la commande est **neuf ou rénovation** ; la géographie pèse surtout par la neige, le vent et les termites, pas par le matériau.

### 1.1 Fiche d'identité `metier.json`

```json
{
  "code": "charpente",
  "nom": "Charpente bois",
  "version": "1.0.0",
  "normes": ["NF DTU 31.1", "NF DTU 31.3", "NF EN 1995-1-1 (Eurocode 5)", "NF EN 1991-1-3 (neige)", "NF EN 1991-1-4 (vent)", "NF EN 338", "NF EN 14081", "NF EN 14080", "NF EN 14250", "NF EN 335"],
  "axes_de_variation": {
    "geographie": "moyen",
    "epoque_bati": "moyen",
    "type_batiment": "moyen",
    "neuf_renovation": "fort",
    "gamme": "faible"
  },
  "metiers_lies": ["couverture", "zinguerie", "isolation", "maconnerie", "ossature-bois"],
  "unites_de_commande": ["piece", "lot", "u", "boite", "carton", "bidon", "rouleau"],
  "maturite": "beta"
}
```

### 1.2 Poids de chaque axe

| Axe | Poids | Ce qu'il change dans la commande | Comment le moteur le résout |
| --- | --- | --- | --- |
| neuf\_renovation | fort | Neuf : charpente complète (souvent fermettes en lot). Réno : quelques pièces de remplacement, renforts moisés, traitement curatif, dépose | Mots du devis (« dépose », « remplacement », « reprise », « traitement curatif ») ; sinon question Q1 |
| geographie | moyen | Zone de neige et altitude → sections et entraxes plus forts ; zone de vent → ancrages renforcés ; départements à termites → bois traité anti-termites ; essence locale (douglas, chêne, châtaignier) | Adresse du chantier → département → `commun/departements.json` (neige, vent, termites) ; aucune question |
| epoque\_bati | moyen | Bâti ancien : chêne ou résineux de forte section, assemblages tenon-mortaise, sections non standard → recoupe dans plus gros, chêne sur commande | Mots du devis (« chêne », « à l'identique », « ancien ») ; sinon défaut résineux |
| type\_batiment | moyen | Maison (portée 6-10 m) ; agricole ou hangar (grandes portées, lamellé-collé) ; carport et auvent (bois visible, classe 3 à 4) | Mots du devis ; défaut maison |
| gamme | faible | Sapin-épicéa standard ou douglas, raboté ou brut, lamellé-collé apparent ; change le produit, pas les quantités | Mots du devis ; défaut sapin-épicéa C24 |

### 1.3 Ce que le moteur ne fait jamais

Le moteur **ne dimensionne pas** une charpente : la section d'une pièce relève d'un calcul Eurocode 5 (bureau d'études ou fabricant de fermettes). Il **lit** les sections et longueurs écrites dans le devis ; si une section manque, il applique le défaut du chapitre 6, l'affiche en hypothèse et la marque « à confirmer par l'artisan ».

## 2. Règle d'or et unités de commande

**Règle d'or charpente : on ne commande jamais un m², ni un m³, ni des « ml » en vrac. On commande un nombre de pièces d'une section donnée dans une longueur commerciale donnée.** Exemple de ligne correcte : « 14 chevrons sapin-épicéa traité classe 2, 63×75, L 4,50 m ». Le négoce affiche un prix au mètre ou au m³, mais il livre des pièces : c'est la pièce qui se commande.

### 2.1 Unités par famille

| Famille | Unité de commande | Exemple de ligne | Interdit |
| --- | --- | --- | --- |
| Bois massif (chevron, bastaing, madrier, poutre, panne) | pièce, par section × longueur commerciale | 6 madriers 75×225 L 6,00 m | m³, ml, m² |
| Bois massif abouté (BMA/KVH), duo/trio, lamellé-collé | pièce, longueur à la coupe ou commerciale | 2 poutres lamellé-collé GL24h 100×300 L 8,40 m | m³ |
| Fermettes industrielles | lot sur plan (1 ligne + fiche de données) | 1 lot fermettes sur plan, 18 fermes en W, portée 8,60 m, pente 40°, entraxe 60 cm | fermettes au m² |
| Planches, voliges, frises, panneaux (OSB, CTBX) | pièce ou panneau | 12 panneaux OSB3 18 mm 2500×675 rainés-bouvetés | m² |
| Connecteurs (sabots, équerres, étriers, pieds de poteau) | unité, arrondie à la boîte si la quantité dépasse la moitié d'une boîte | 1 boîte de 50 équerres ABR105 | — |
| Pointes et vis de connecteur | boîte (250, 1 500) | 2 boîtes de 250 pointes annelées CNA 4,0×40 | kg sans boîte |
| Vis de charpente, tiges filetées, boulons | boîte ou unité | 1 boîte de 50 vis 8×240 | — |
| Feuillard, bande perforée | rouleau | 1 rouleau feuillard perforé 40×1,5 mm, 25 m *(à vérifier)* | ml en vrac |
| Traitement du bois | bidon (5 L, 20 L) | 1 bidon de 20 L traitement insecticide-fongicide | litres en vrac, m² |
| Ancrages béton (chevilles, scellement chimique) | boîte ou cartouche | 1 boîte de 50 goujons M10×95 + 2 cartouches de résine | — |

### 2.2 Longueurs commerciales : un paramètre du négoce, pas une constante

Les longueurs disponibles changent d'un négoce à l'autre, et c'est le pas qui décide du nombre de pièces. Exemples relevés :

| Négoce | Gamme | Longueurs relevées | Pas |
| --- | --- | --- | --- |
| [Point.P](https://www.pointp.fr/p/bois-et-panneaux/bastaing-sapin-epicea-bois-traite-classe-2-l-5-m-63x175-mm-A1788580) | bastaing sapin-épicéa traité classe 2, 63×175 | 3,50 · 4,00 · 4,50 · 5,00 · 5,10 · 5,50 · 6,50 · 7,00 m | 0,50 m (+ quelques longueurs hors pas) |
| [Point.P](https://www.pointp.fr/p/bois-et-panneaux/madrier-sapin-epicea-classe-2-l-7-00-m-75x225-mm-A1797910) | madrier 75×225 traité classe 2 | 3,50 à 7,50 m, dont 5,70 m | 0,50 m |
| [Tanguy (Bretagne)](https://www.tanguy.fr/bois/bois-massif/bois-de-charpente/sapin-epicea-c24-75x225-en-4m50) | sapin-épicéa C24 75×225 | 3,00 · 3,30 · 3,60 · 3,90 · 4,20 · 4,50 · 4,80 · 5,70 m | 0,30 m |
| [Rullier](https://www.rullier.fr/bois-massif-aboute-bma-sapin-epicea-c24-80x200mm-de-6500-mm-a-13000-mm.html) | BMA sapin-épicéa C24 80×200 | 6,50 à 13,00 m | sur liste |

Règle moteur : `materiaux.json` porte la liste `longueurs_commerciales` par négoce (champ `fournisseur_id`) ; à défaut, la liste générique `commun/conditionnements.json` « bois de charpente » = 3,00 à 7,50 m au pas de 0,50 m *(à vérifier : générique choisi pour couvrir Point.P, Gedimat, Big Mat)*. On prend toujours **la plus petite longueur commerciale ≥ longueur utile + surlongueur de coupe** (chapitre 5).

### 2.3 Les quatre interdits du quantitatif charpente

1. Une surface de toiture convertie en m³ de bois.
2. Une longueur cumulée (« 180 ml de chevrons ») sans nombre de pièces ni longueur unitaire.
3. Des fermettes chiffrées au m² ou détaillées pièce par pièce : elles se commandent en **lot au fabricant**, qui fournit aussi les pièces de contreventement et d'antiflambement avec le plan de pose ([guide CODIFAB/UICB](https://www.codifab.fr/actions-collectives/la-charpente-industrialisee-en-bois-guide-technique)).
4. Une quincaillerie « au kg » : pointes et vis se commandent à la boîte.

## 3. Ouvrages, vocabulaire des devis et pièges

Un devis de charpentier se ramène à **12 ouvrages** ; chacun a un identifiant stable (`ouvrages.json`), des mots qui le déclenchent (`vocabulaire.json`) et les pièges qui faussent la commande.

### 3.1 Ouvrages

| ID | Ouvrage | Ce qui se commande | Mots du devis qui le déclenchent |
| --- | --- | --- | --- |
| CH-01 | Charpente traditionnelle à pannes (sur pignons et refends) | sablières, pannes, faîtage, chevrons, chantignoles, ancrages, connecteurs | « charpente traditionnelle », « pannes et chevrons », « charpente bois massif » |
| CH-02 | Charpente à fermes traditionnelles | fermes (arbalétriers, entrait, poinçon, contrefiches), pannes, chevrons, boulonnerie | « fermes », « entrait », « poinçon », « ferme latine », « ferme à entrait retroussé » |
| CH-03 | Charpente industrialisée (fermettes) | **1 lot fabricant sur plan** + ancrages et pointes de pose si non fournis | « fermettes », « charpente industrielle », « fermes en W », « fermettes industrialisées » |
| CH-04 | Croupe, arêtier, noue | arêtiers, noues, empannons (chevrons de longueur décroissante) | « croupe », « arêtier », « noue », « empannons », « toiture 4 pans » |
| CH-05 | Chevêtre et trémie (fenêtre de toit, cheminée, escalier) | chevêtres, chevrons doublés, sabots | « chevêtre », « trémie », « Velux », « sortie de cheminée » |
| CH-06 | Lucarne, chien assis | poteaux, sablières, chevrons de lucarne, noulets | « lucarne », « chien assis », « jacobine », « outeau » |
| CH-07 | Plancher de comble, solivage | solives, chevêtres, sabots, panneaux de plancher | « solivage », « plancher bois », « aménagement de combles », « solives » |
| CH-08 | Auvent, carport, pergola, préau | poteaux, pieds de poteau, poutres, chevrons, contreventement | « carport », « auvent », « abri voiture », « pergola », « préau » |
| CH-09 | Rive et débord (planches de rive, bandeaux, chevrons de rive) | planches de rive, bandeaux, chevrons de rive | « planches de rive », « bandeau », « débord de toit » |
| CH-10 | Reprise et renfort en rénovation | pièces de remplacement, moises, boulons, tiges filetées | « remplacement », « renfort », « moisage », « doublage », « reprise de charpente », « à l'identique » |
| CH-11 | Traitement des bois (préventif ou curatif) | bidons de produit, chevilles d'injection | « traitement », « insecticide », « fongicide », « capricornes », « termites », « injection » |
| CH-12 | Dépose de charpente | rien à commander au négoce ; signaler la benne | « dépose », « démolition charpente », « évacuation » |

### 3.2 Vocabulaire : synonymes et sections nommées

| Le devis écrit | Le moteur comprend | Section négoce par défaut |
| --- | --- | --- |
| bastaing, basting | bois de 63×175 | 63×175 |
| madrier | bois de 75×225 | 75×225 |
| chevron, « chevrons 6/8 », « 6×8 » | chevron | 63×75 *(« 6/8 » = notation en cm, à rapprocher de 63×75 ou 60×80 selon négoce, à vérifier)* |
| « 8/23 », « 7,5×22,5 » | 75×225 | notation en cm → convertir en mm |
| panne, filière (Sud-Ouest), ventrière | panne | section lue au devis |
| faîtage, faîtière, panne faîtière | panne de faîtage | section lue au devis |
| sablière, panne sablière, plate-forme | sablière | section lue au devis |
| chantignole, échantignole | cale de panne sur arbalétrier | 1 par panne et par ferme |
| KVH, BMA, bois massif abouté, « contrecollé duo/trio » | bois reconstitué grande longueur | longueur à la coupe |
| lamellé-collé, LC, BLC, GL24h, GL28h | lamellé-collé | longueur à la coupe, délai fabrication |
| fermette, ferme industrielle, ferme en W | lot fabricant | — |
| classe 2, CL2, traité autoclave classe 2 | bois traité pour l'intérieur à humidification occasionnelle | — |
| classe 3, classe 4, autoclave vert | bois extérieur (carport, poteau, pied en contact) | — |
| sapin du Nord, pin du Nord, « rouge du Nord » | pin sylvestre nordique | — |
| douglas purgé d'aubier | douglas classe 3 naturelle | — |

### 3.3 Pièges qui faussent la commande

1. **La surface du devis est rarement la longueur des pièces.** Un chevron mesure le rampant **plus** le débord d'égout ; une panne doit **se raccorder sur un appui** (ferme ou mur), donc sa longueur unitaire est limitée par la distance entre appuis, pas par la longueur du bâtiment.
2. **Les sections en centimètres.** « Chevrons 6/8 » ou « 8/23 » : le moteur convertit en millimètres et prend la section négoce la plus proche **sans jamais la réduire** ; s'il hésite, il affiche l'hypothèse.
3. **« Fourniture et pose de fermettes »** ne donne jamais une liste de bois : c'est un lot fabricant. Le quantitatif sort une ligne lot + les données à transmettre au fabricant (chapitre 6.3).
4. **« Traitement de charpente »** peut vouloir dire bois déjà traité à la commande (rien à acheter en plus) ou traitement curatif sur charpente existante (bidons + chevilles d'injection). Le moteur regarde « existante », « curatif », « injection » ; sinon il pose Q3.
5. **Les assemblages traditionnels** (tenon-mortaise, mi-bois) ne consomment aucune quincaillerie, mais une charpente moderne en consomme beaucoup : un devis sans ligne quincaillerie n'est pas une charpente sans quincaillerie.
6. **Le lamellé-collé et le BMA se commandent à la longueur exacte** et ont un délai : le moteur ne les arrondit pas à une longueur commerciale ; il ajoute la surlongueur de coupe (chapitre 5).
7. **Bois extérieur** (carport, poteau, débord exposé) : classe d'emploi 3 ou 4, jamais classe 2. Un pied de poteau scellé dans le sol est interdit sans pied métallique.
8. **La dépose** ne génère pas de matériaux mais un tonnage de déchets : signalé en note, jamais en ligne de commande négoce.

## 4. Matériaux et fiches produits

Les fiches ci-dessous alimentent `materiaux.json`. Le conditionnement vient de la **fiche négoce** quand elle existe (c'est le négoce qui livre), sinon de la fiche fabricant. Poids indiqués pour le camion et la manutention.

### 4.1 Bois massif sapin-épicéa (résineux)

| Article | Section (mm) | Longueurs relevées (m) | Classe | Poids | Source |
| --- | --- | --- | --- | --- | --- |
| Chevron | 63×75 | 4,00 (gamme 3,00 à 6,00 *à vérifier*) | traité classe 2 | ≈ 3,1 kg/ml *(calcul 650 kg/m³, à vérifier)* | [Point.P catégorie](https://www.pointp.fr/c/bois-de-charpente-brut/x3snv3_dig_2002914) |
| Chevron raboté sec séchoir | 80×100 | 3,00 | C24 KD traité classe 2 | ≈ 3,6 kg/ml *(à vérifier)* | [Point.P catégorie](https://www.pointp.fr/c/bois-de-charpente-brut/x3snv3_dig_2002914) |
| Bastaing | 63×175 | 3,50 · 4,00 · 4,50 · 5,00 · 5,10 · 5,50 · 6,50 · 7,00 | traité classe 2 | ≈ 7,2 kg/ml *(calcul)* | [Point.P 1788550](https://www.pointp.fr/p/bois-et-panneaux/bastaing-sapin-epicea-bois-traite-classe-2-l-4-m-63x175-mm-A1788550) |
| Madrier | 75×225 | 3,50 · 4,00 · 4,50 · 5,70 · 6,00 · 6,50 · 7,00 · 7,50 | traité classe 2 | **77 kg la pièce de 7,00 m** (0,118 m³), soit 11 kg/ml | [Point.P 1797910](https://www.pointp.fr/p/bois-et-panneaux/madrier-sapin-epicea-classe-2-l-7-00-m-75x225-mm-A1797910) |
| Madrier C24 (Bretagne) | 75×225 | 3,00 · 3,30 · 3,60 · 3,90 · 4,20 · 4,50 · 4,80 · 5,70 | C24 | — | [Tanguy](https://www.tanguy.fr/bois/bois-massif/bois-de-charpente/sapin-epicea-c24-75x225-en-4m50) |
| Pièce carrée | 100×100 | 4,00 | traité classe 2 | ≈ 6,5 kg/ml *(calcul)* | [Point.P catégorie](https://www.pointp.fr/c/bois-de-charpente-brut/x3snv3_dig_2002914) |
| Madrier pin rouge du Nord raboté | 70×220 | 4,80 | C24 traité classe 4 | — | [Point.P catégorie](https://www.pointp.fr/c/bois-de-charpente-brut/x3snv3_dig_2002914) |
| Madrier anti-termites | 75×225 | 3,00 à 6,50 au pas de 0,50 | C24 traité CL2 + anti-termites | — | [Dispano](https://www.dispano.fr/p/bois/madrier-sapin-epicea-c24-traite-classe-2-anti-termites-75x225mm-A6573332) |

Poids moyen à retenir pour le résineux livré : **650 kg/m³** (déduit de la fiche Point.P 75×225 × 7,00 m). Valeur de calcul de l'Eurocode pour du C24 sec : ≈ 420 kg/m³ *(à vérifier NF EN 338)* ; on garde 650 pour le camion, car le bois livré n'est pas sec.

### 4.2 Bois reconstitués

| Article | Sections relevées (mm) | Longueurs | Poids | Source |
| --- | --- | --- | --- | --- |
| BMA / KVH sapin-épicéa C24 | 60×100 · 80×200 | jusqu'à 13 m ; 80×200 de 6,50 à 13,00 m | 80×200 L 6 m = 42,24 kg (≈ 440 kg/m³) | [Chausson](https://www.chausson.fr/materiaux/bois-massif-aboute-sapin-epicea-c24-200x80mm-p-541976-5), [Rullier](https://www.rullier.fr/bois-massif-aboute-bma-sapin-epicea-c24-80x200mm-de-6500-mm-a-13000-mm.html) |
| Lamellé-collé GL24h épicéa | 100×280 · 100×320 · 100×360 · 120×360 · 120×400 | 6 · 8 · 12 m en stock (Ratheau) ; 4 à 14 m au pas de 1 m (Barillet) | 90×360 L 10 m = 146 kg (≈ 450 kg/m³) | [Groupe Ratheau](https://www.groupe-ratheau.com/produit/poutres-lamelle-colle), [Barillet](https://www.barillet-distribution.fr/poutre-lamelle-colle-sapinepicea-120x360mm-10m-gl24h-non-traite), [SM Bois](https://www.smbois.com/p/lamelle-colle) |
| Lamellé-collé GL24h douglas visible | 80×280 · 100×320 · 120×360 · 140×480 | 10 à 13,5 m | — | [Kenzai](https://www.kenzai.fr/bois-lamelle-colle/5367-lamelle-colle-douglas-gl-24h-120x360-mm.html) |

### 4.3 Fermettes industrielles

Produit sur plan, marqué CE selon NF EN 14250, livré en **lot complet avec plan de pose** ; épaisseur des pièces 36 mm jusqu'à 15 m de portée, 47 mm au-delà ; entraxe en général inférieur à 1,10 m ([guide CODIFAB/UICB 2024](https://www.codifab.fr/actions-collectives/la-charpente-industrialisee-en-bois-guide-technique)). Le fabricant doit fournir toutes les pièces, y compris celles du dispositif d'antiflambement. Le moteur ne calcule donc ni le bois ni les connecteurs des fermes : il produit la **fiche de demande de prix** (chapitre 6.3).

### 4.4 Connecteurs et fixations

| Article | Dimensions | Conditionnement | Poids | Source |
| --- | --- | --- | --- | --- |
| Équerre renforcée Simpson ABR105 | 90×105×105, ép. 3 mm, acier galvanisé | boîte de 50 | 0,39 kg/u ; 19,5 kg la boîte | [Eurabo](https://www.eurabo.be/fr/produits/simpson-strong-tie-equerre-abr), [MisterMatériaux](https://mistermateriaux.com/produit/equerre-de-charpente/5u0reo) |
| Sabot à ailes extérieures Simpson SAE | ex. SAE200/60/2 (60×70), SAE250/40/2, SAE380/100/2, ép. 2 mm | à l'unité ou boîte *(à vérifier)* | — | [Brico.fr Simpson](https://www.brico.fr/simpson-strong-tie) |
| Pointe annelée Simpson CNA 4,0×40 | Ø 4 × 40 mm, électrozinguée | boîte de 250 ; boîte de 1 500 (réf. FR) | — | [Simpson France](https://www.simpson.fr/fr-FR/produits/pointe-annelee-electrozinguee-cna) |
| Pointe annelée CNA 4,0×35 et 4,0×50 | Ø 4 | boîtes de 250 et 1 500 | — | [Bricozor](https://www.bricozor.com/pointes-annelees-electrozinguees-cna-simpson.html) |
| Vis de charpente tête disque Torx 8×240 | filet partiel 100 mm | boîte de 50 | 2,8 à 3,2 kg la boîte | [Point.P SPAX](https://www.pointp.fr/p/outillage-quincaillerie/vis-charpente-spax-empreinte-torx-tete-disque-8x240-mm-boite-50-A1606543), [Chausson Rocket](https://www.chausson.fr/quincaillerie/vis-bois-rocket-charpente-tete-fraisee-torx-acier-zingue-filetage-partiel-8x240mm-boite-50-p-807091-1) |
| Vis de charpente 8×120 à 8×320 | gamme au pas de 20 mm | boîte de 50 | — | [Würth](https://eshop.wurth.fr/v/vis-pour-fixer-chevron-sur-panne) |
| Feuillard perforé galvanisé | 40×1,5 mm *(à vérifier)* | rouleau 25 m *(à vérifier)* | — | à sourcer |
| Pied de poteau réglable ou à platine | selon section du poteau | unité | — | à sourcer |
| Tige filetée, écrous, rondelles (moisage) | M12 à M16, L 1 m | unité + boîte de 50 écrous *(à vérifier)* | — | à sourcer |
| Goujon d'ancrage béton | M10×95 *(à vérifier)* | boîte de 50 *(à vérifier)* | — | à sourcer |

### 4.5 Produits de traitement

| Produit | Rendement | Conditionnements | Source |
| --- | --- | --- | --- |
| Insecticide-fongicide charpente (générique, phase solvant ou aqueuse) | **préventif 200 ml/m²**, **curatif 300 ml/m²**, en 2 couches | 5 L, 20 L | [fiche Pro Tech Bois](https://matieresetbeton.com/products/traitement-insecticide-preventif-et-curatif-pour-bois-et-charpente) |
| Xilix (insecticide, fongicide, anti-termites) | badigeon 150 à 200 ml/m² ; injection curative **20 ml par puits** | seau de 20 L | [Lasure Prod](https://www.lasure-prod.com/produits-exterieurs/86-traitement-bois-xilix-.html), [TPLN](https://toutpourlesnuisibles.com/tpln/article/insecticide-fongicide-insecte-bois-traitement-termite-merule-vrilette-xilix-20-litres.htm) |
| Xylophène Poutres et charpentes (insecticide, intérieur) | *(à vérifier fiche technique)* | 1 L, 5 L, 20 L ; 20 L = 20 kg | [Agrialpro](https://www.agrialpro.fr/0330970.html) |
| Chevilles d'injection (curatif) | 1 par puits | sachet ou boîte de 100 *(à vérifier)* | à sourcer |

## 5. Règles de calcul, formules et pertes

Le quantitatif charpente est d'abord **géométrique** : à partir de la portée, de la longueur, de la pente et des débords, chaque règle donne un nombre de pièces et une longueur unitaire, puis le moteur choisit la longueur commerciale. Toutes les formules sont pures et testables (`regles.json`) ; les sections viennent du devis, jamais d'un calcul de résistance.

### 5.1 Notations

| Symbole | Sens | Unité | Source |
| --- | --- | --- | --- |
| P | portée du bâtiment (largeur hors tout entre murs gouttereaux) | m | devis ou question |
| L | longueur du bâtiment entre pignons | m | devis ou question |
| α | pente du toit | degrés (convertir si % : α = arctan(p/100)) | devis ou défaut |
| d | projection horizontale d'un versant = P/2 (2 pans), P (1 pan) | m | calcul |
| De, Dp | débord à l'égout (horizontal), débord en pignon | m | devis ou défaut |
| e | entraxe des chevrons (ou des fermettes) | m | devis ou défaut |
| E | entraxe des fermes ou des murs porteurs sous les pannes | m | devis ou défaut |
| s | surlongueur de coupe | m | défaut 0,10 |

### 5.2 Formules par ouvrage

```latex
R = \frac{d}{\cos\alpha} \qquad L_{chevron} = \frac{d + D_e}{\cos\alpha} + s \qquad N_{chevrons/versant} = \left\lceil \frac{L + 2D_p}{e} \right\rceil + 1
```

1. **Chevrons (CH-01, CH-02)**. Longueur unitaire L\_chevron ci-dessus ; nombre par versant N ; total = N × nombre de versants. Si L\_chevron dépasse la plus grande longueur commerciale, le chevron est coupé en deux pièces **raccordées sur une panne** : on prend pour chaque morceau la longueur commerciale ≥ (distance faîtage → panne de raccord + s) et (reste + s). Si le devis dit « BMA » ou « KVH », on garde une pièce unique à la longueur exacte.
2. **Pannes, faîtage, sablières (CH-01, CH-02)**. Longueur d'une ligne = L + 2 Dp (pannes et faîtage dépassent en pignon), L pour les sablières. Sablière posée sur mur continu : pièces = ⌈L / (Lcomm\_max − s)⌉, chacune de L / pièces + s, ramenée à la longueur commerciale supérieure. Nombre de lignes = 1 faîtage + n pannes intermédiaires par versant + 1 sablière par versant ; n vient du devis, sinon n = ⌈R / portée maxi chevron⌉ − 1 (portée maxi chevron : défaut chapitre 6). Découpe d'une ligne : les raccords tombent **sur un appui** (ferme ou mur), donc chaque pièce couvre k travées entières de longueur E : k = ⌊(Lcomm\_max − s) / E⌋ ; pièces par ligne = ⌈(nombre de travées) / k⌉ ; longueur de chaque pièce = k × E + s, ramenée à la longueur commerciale supérieure ; les pièces de rive ajoutent Dp.
3. **Chantignoles (CH-02)** : 1 par panne et par ferme = n\_pannes\_par\_versant × 2 × nombre de fermes. Débitées dans une chute de bastaing : 0 pièce à commander si chutes suffisantes, sinon 1 bastaing 63×175 L 3,00 m pour 12 chantignoles *(à vérifier)*.
4. **Fixation chevron sur appui** : 1 vis de charpente par croisement chevron × appui (sablière, chaque panne, faîtage). Nombre = N\_total × (2 + n\_pannes\_par\_versant) ÷ 2 par versant, arrondi à la boîte de 50. Longueur de vis = plus petite longueur de la gamme ≥ hauteur du chevron + 80 mm (ancrage ≈ 10 diamètres pour une vis de 8 mm, *à vérifier ETA du fabricant*). Exemple : chevron 63×75 posé sur chant → vis 8×160.
5. **Croupe, arêtier, empannons (CH-04)**. Arêtier : h = d × tan α ; longueur = √(2d² + h²) + De/cos α × √2 + s. Empannons : de part et d'autre de chaque arêtier, longueurs décroissantes au pas de e/cos α ; liste exacte des longueurs, puis **regroupement par paires dans une longueur commerciale** (algorithme first-fit decreasing : deux empannons dont la somme + 2s tient dans une pièce sortent d'une seule pièce). Noue : même formule que l'arêtier.
6. **Chevêtre (CH-05)** pour une trémie de largeur W et hauteur H dans le rampant : chevrons coupés = ⌈W / e⌉ ; 2 chevêtres de longueur W + 2 × largeur chevron + s, même section que les chevrons ; chevrons de rive de trémie **doublés** = +2 chevrons pleine longueur ; 4 sabots dimensionnés à la section.
7. **Solivage (CH-07)** : N\_solives = ⌈L\_pièce / e⌉ + 1 ; longueur = portée libre + 2 × appui (appui mini 5 cm en C24, *à vérifier*) + s ; 2 sabots par solive si appui sur poutre bois, 0 si encastrée dans la maçonnerie. Panneaux de plancher = ⌈S / surface utile d'un panneau × 1,05⌉ (rainés-bouvetés : surface utile = surface nominale moins la languette, *à vérifier fiche*).
8. **Carport, auvent (CH-08)** : poteaux selon devis ; 1 pied de poteau par poteau (jamais de poteau enterré) ; 4 chevilles ou tiges par pied ; sablières et chevrons comme CH-01 avec bois classe 3 ou 4 ; 2 contrefiches par poteau si le devis ne dit rien *(à vérifier)*.
9. **Ancrages des fermettes (CH-03)** : chaque appui de ferme sur mur porteur est ancré ([guide CODIFAB/UICB §5.2](https://www.codifab.fr/actions-collectives/la-charpente-industrialisee-en-bois-guide-technique)) : 2 équerres par ferme si le lot ne les fournit pas ; ferme contre un pignon : 1 fixation près de chaque nœud, 1,20 m maxi entre fixations. Pièces de contreventement et d'antiflambement : **2 pointes non lisses au moins à chaque croisement** (même guide, §5.5), à commander seulement si le lot n'inclut pas la visserie.
10. **Traitement (CH-11)** : surface développée S\_dev = Σ (périmètre de section × longueur) de toutes les pièces traitées ; litres = S\_dev × 0,20 (préventif) ou × 0,30 (curatif) ; injection curative : 20 ml par puits, 1 puits tous les 30 cm sur les pièces de plus de 10 cm *(espacement à vérifier)* ; bidons = combinaison 20 L + 5 L qui minimise le reste. Charpente existante non décrite pièce par pièce : S\_dev = 1,3 × surface de toiture du devis (ratio à valider, chapitre 11).
11. **Sablières sur maçonnerie** : ancrage par goujon ou tige scellée tous les 1,00 à 1,50 m *(à vérifier)* → nombre = ⌈L / 1,20⌉ + 1 par sablière.

### 5.3 Pertes et marges

| Famille | Marge | Pourquoi |
| --- | --- | --- |
| Bois massif à longueur commerciale | aucun % ; la perte est déjà dans le choix de longueur + s = 0,10 m | on commande des pièces entières |
| Bois massif : casse et défaut | +⌈n/20⌉ pièces pour les chevrons et sections ≤ 75×100 ; 0 pour pannes, madriers et bastaings *(à vérifier)* | flache, gerce, fente à la livraison |
| Lamellé-collé, BMA | 0 pièce, s = 0,05 m par extrémité | longueur à la coupe, pièce chère |
| Connecteurs | +5 %, puis arrondi à la boîte si > 50 % de la boîte | perte chantier |
| Pointes et vis | +10 %, puis arrondi à la boîte | perte et casse |
| Traitement | +10 % | absorption variable selon l'essence |
| Panneaux de plancher | +5 % | coupes en rive |

## 6. Valeurs par défaut et hypothèses à afficher

Quand le devis ne dit rien, le moteur applique ces défauts, **les affiche tous** sous le quantitatif (« Hypothèses ») et chacun se corrige d'un tap. Ordre de surcharge : référentiel → artisan → chantier.

### 6.1 Défauts nationaux (`defauts.json`)

| Paramètre | Défaut | Variante par axe | Statut |
| --- | --- | --- | --- |
| Essence et classe, intérieur | sapin-épicéa C24 traité classe 2 | département à termites → « CL2 + anti-termites » | sourcé (offre Point.P, Dispano) |
| Essence et classe, extérieur (carport, débord, poteau) | sapin-épicéa traité classe 4 ou douglas classe 3 | gamme premium → douglas | à vérifier |
| Pente | reprise du tiroir couverture si le devis porte la couverture ; sinon 40° | ardoise 45°, tuile mécanique 35°, tuile canal 30 % ≈ 17° | à vérifier |
| Entraxe chevrons e | 0,60 m | couverture lourde (tuile béton) ou neige zone C et plus → 0,50 m | à vérifier |
| Entraxe fermettes | 0,60 m | — | sourcé : 0,60 à 0,90 m en général ([CTB](https://ctb-composants-systemes.fr/charpentes-industrielles/)) |
| Entraxe fermes ou refends sous pannes E | 4,00 m | — | à vérifier |
| Débord d'égout De (horizontal) | 0,40 m | — | à vérifier |
| Débord en pignon Dp | 0,20 m | Bretagne, Normandie : pignons maçonnés sans débord → 0 m | à vérifier |
| Surlongueur de coupe s | 0,10 m (bois massif), 0,05 m (lamellé-collé, BMA) | — | à vérifier |
| Section chevron | 63×75 | portée entre pannes > 2,50 m → 75×100 | indicatif, à vérifier |
| Section panne et faîtage | 75×225 | E > 4,50 m → lamellé-collé 100×280 | indicatif, à vérifier |
| Section sablière | 63×175 | — | à vérifier |
| Portée maxi chevron entre appuis (pour déduire le nombre de pannes) | 2,50 m (63×75), 3,00 m (75×100) | neige zone C et plus → −15 % | indicatif, à vérifier |
| Négoce et longueurs commerciales | négoce du profil artisan ; sinon 3,00 à 7,50 m au pas de 0,50 m | Bretagne (Tanguy) : pas de 0,30 m | sourcé (chapitre 2.2) |
| Traitement | aucun si le bois est commandé traité ; curatif si « existante », « curatif » ou « injection » | — | règle |

### 6.2 Hypothèses affichées : format

Chaque hypothèse est une ligne courte, lisible par un enfant, avec la valeur en gras et un bouton « changer » :

- « Pente du toit : **40°** (non écrite sur le devis) »
- « Chevrons tous les **60 cm** »
- « Débord de toit : **40 cm** à l'égout, **0 cm** en pignon (Bretagne) »
- « Bois : **sapin traité classe 2** »
- « Longueurs du négoce : **Tanguy, pas de 30 cm** »

Une hypothèse qui change le résultat de plus de 10 % est remontée en question (chapitre 7) au lieu d'être affichée en silence.

### 6.3 Fermettes : fiche de demande au fabricant

Pour CH-03, le quantitatif ne liste pas de bois ; il sort **une ligne « lot fermettes sur plan »** et une fiche pré-remplie jointe à l'envoi fournisseur (même principe que l'annexe sans prix du référentiel couverture). Champs, tous déduits sans saisie :

| Champ | Où le moteur le trouve |
| --- | --- |
| Portée entre appuis, longueur du bâtiment | devis ; sinon surface ÷ longueur |
| Pente, nombre de versants, croupes | devis ; sinon défaut |
| Type de comble (perdu, aménageable, sur dalle) | mots du devis (« combles aménageables », « entrait porteur ») |
| Couverture prévue et son poids | tiroir couverture ou mots du devis |
| Plafond (plaque de plâtre sur fourrures, lambris) | mots du devis ; sinon « plaque de plâtre » |
| Débords égout et pignon | devis ; sinon défaut |
| Zone de neige, altitude, zone de vent, département | adresse → `commun/departements.json` |
| Trémies (fenêtres de toit, cheminée) et leur position | lignes du devis |
| Type d'appui (sur maçonnerie, sur sablière) | défaut « sur maçonnerie avec ancrage » |
| Entraxe | défaut 0,60 m |

## 7. Questions à poser, avec leur sensibilité

Le moteur pose **au plus 4 questions par défaut, à boutons, jamais sur une quantité**, choisies dans cet ordre parmi celles que le devis n'a pas déjà tranchées. Les questions 5 à 8 ne sortent qu'en cas de doute réel (décision produit : mieux vaut une question rapide de plus qu'un quantitatif à refaire). Sensibilité = écart sur le quantitatif total de bois entre les deux réponses extrêmes, sur le cas type « maison 10 × 8 m, 2 pans, 40° ».

| Ordre | Question (texte affiché) | Boutons | Sensibilité | Posée seulement si |
| --- | --- | --- | --- | --- |
| Q1 | « C'est une charpente neuve ou une réparation ? » | Neuve · Je remplace quelques pièces · Je renforce et je traite | 100 % (change la liste entière) | aucun mot « dépose », « remplacement », « renfort », « neuve » au devis |
| Q2 | « Ton toit a combien de pans ? » | 1 pan · 2 pans · 4 pans (avec croupes) · Plus compliqué | 15 à 25 % (arêtiers + empannons) | forme non écrite au devis |
| Q3 | « Tes chevrons sont espacés de combien ? » | 40 cm · 50 cm · 60 cm | **+50 %** de chevrons entre 60 et 40 cm | entraxe absent du devis et couverture lourde ou neige zone C et plus |
| Q4 | « La pente du toit ressemble à quoi ? » | Faible (moins de 30°) · Normale (35-40°) · Forte (45° et plus) | +16 % sur la longueur des chevrons entre 35° et 45° | pente absente du devis et du tiroir couverture |
| Q5 | « Le toit dépasse sur les pignons ? » | Oui · Non | ±4 % sur pannes et chevrons (pour 2 × 20 cm sur 10 m) | région sans habitude dominante (chapitre 8) |
| Q6 | « Le bois que tu commandes doit être traité ? » | Déjà traité au négoce · Je traite moi-même · Charpente existante à traiter | 0 ou 100 % de la ligne traitement | devis ambigu sur « traitement » |
| Q7 | « Les combles seront habités ? » | Non, combles perdus · Oui, aménageables | 0 % sur le quantitatif ; change la fiche fermettes | ouvrage CH-03 et type de comble absent |
| Q8 | « Tu commandes chez quel négoce ? » | 2 à 3 négoces du profil · Autre | 3 à 8 % (pas des longueurs commerciales) | profil artisan sans négoce |

### 7.1 Règles d'écriture (`questions.json`)

- Une question tient sur une ligne, tutoie l'artisan, n'emploie aucun chiffre que l'artisan devrait calculer.
- Jamais « combien de chevrons ? », « quelle longueur de panne ? » : ce sont des quantités, le moteur les calcule.
- Chaque réponse est mémorisée comme habitude de l'artisan (niveau artisan) : la même question n'est plus posée si l'artisan a répondu la même chose 3 fois *(seuil à valider)*.
- Toute réponse reste modifiable d'un tap après le quantitatif.

## 8. Matériaux dominants et contraintes par région

En charpente, la région change **la classe de traitement, l'entraxe et les sections par défaut** bien plus que le matériau : le sapin-épicéa domine partout. Trois données par département pilotent le tiroir : zone de neige, zone de vent, présence de termites. Elles vivent dans `commun/departements.json` (partagé avec la couverture) et ne génèrent aucune question.

### 8.1 Neige : valeurs de la norme

Charge caractéristique de neige au sol sous 200 m d'altitude, NF EN 1991-1-3/NA ([tableau AN.2](https://www.calculs-eurocodes.com/eurocode_1/partie_1-3/neige_toiture_versant_unique)) :

| Zone | A1 | A2 | B1 | B2 | C1 | C2 | D | E |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sk (kN/m²) | 0,45 | 0,45 | 0,55 | 0,55 | 0,65 | 0,65 | 0,90 | 1,40 |
| Neige accidentelle sAd (kN/m²) | — | 1,00 | 1,00 | 1,35 | — | 1,35 | 1,80 | — |

Au-dessus de 200 m, la charge augmente avec l'altitude (formules du même tableau). Depuis l'amendement [NF EN 1991-1-3/NA/A2 de juillet 2022](https://www.boutique.afnor.org/en-gb/standard/nf-en-199113-na-a2/eurocode-1-actions-on-structures-part-13-general-actions-snow-loads-nationa/fa202281/326763), les départements à cheval sur deux zones sont découpés **par commune** : `departements.json` doit donc porter la zone par code INSEE, pas par département *(table à saisir depuis la norme)*.

Effet sur le quantitatif (règle moteur, *à vérifier par un charpentier*) : zone C1 et plus ou altitude > 500 m → entraxe chevrons par défaut 0,50 m et portée maxi chevron −15 % ; zone D, E ou altitude > 900 m → le moteur affiche « charpente à faire calculer » et ne propose pas de section par défaut.

### 8.2 Termites

Environ 54 départements sont couverts par un arrêté préfectoral termites, en totalité ou en partie ; la liste officielle de la DGALN code chaque département N (non concerné), P (partiel) ou O (entier) ([liste DGALN](https://www.ecologie.gouv.fr/sites/default/files/documents/dgaln_dpts_termites_2016_0.pdf)). Exemples : Côtes-d'Armor N, Morbihan P, Pas-de-Calais P, Charente-Maritime O, Dordogne O, Bouches-du-Rhône O, Paris O. Toute l'Occitanie sauf la Lozère est couverte ([DREAL Occitanie](https://www.occitanie.developpement-durable.gouv.fr/termites-les-departements-de-la-region-occitanie-a18413.html)).

Règle moteur : département O, ou P avec commune listée → bois de structure commandé **« traité classe 2 + anti-termites »** (référence existante au négoce, ex. [Dispano](https://www.dispano.fr/p/bois/madrier-sapin-epicea-c24-traite-classe-2-anti-termites-75x225mm-A6573332)) ; département P sans liste de communes → hypothèse affichée « bois anti-termites » modifiable. La liste DGALN date de 2016 : *à remplacer par la cartographie Cerema à jour*.

### 8.3 Habitudes régionales qui changent la commande

| Région | Essences et produits courants | Habitudes qui changent le quantitatif | Statut |
| --- | --- | --- | --- |
| Bretagne | sapin-épicéa C24 ; chêne et châtaignier en rénovation | pignons maçonnés sans débord (Dp = 0) ; pente forte sous ardoise (≈ 45°) ; négoces régionaux au pas de 0,30 m ; vent fort sur le littoral → ancrages renforcés | à vérifier |
| Normandie, Pays de la Loire | sapin-épicéa ; chêne en pan de bois et longères | rénovations « à l'identique » en chêne : section non standard → commande sur liste | à vérifier |
| Nord, Picardie | sapin-épicéa, BMA | — | à vérifier |
| Île-de-France | sapin-épicéa, fermettes en neuf | Paris entier sous arrêté termites | sourcé (DGALN) |
| Grand Est, Vosges, Jura | sapin et épicéa locaux | neige plus forte en altitude → entraxes serrés | à vérifier |
| Alpes, Savoie, Pyrénées | épicéa, mélèze, douglas | zones D et E, altitude → charpente calculée, pas de défaut | à vérifier |
| Massif central, Limousin, Morvan | douglas (classe 3 naturelle purgé d'aubier), châtaignier | douglas proposé par défaut en extérieur | à vérifier |
| Sud-Ouest (Gironde, Landes) | pin maritime, sapin-épicéa | termites très présents → anti-termites par défaut | à vérifier |
| Méditerranée, vallée du Rhône | sapin-épicéa | tuile canal, pente faible (≈ 30 %) → chevrons courts ; termites → anti-termites | à vérifier |

## 9. Points singuliers et consommables

Les points singuliers se commandent **à la pièce** et sont ceux que l'artisan oublie le plus ; chaque ligne du devis qui en déclenche un ajoute ses pièces et sa quincaillerie. Les accidents de toiture (cheminée, lucarne, fenêtre de toit) imposent toujours des chevêtres et un renfort des pièces voisines ([guide CODIFAB/UICB §9](https://www.codifab.fr/actions-collectives/la-charpente-industrialisee-en-bois-guide-technique)).

### 9.1 Points singuliers

| Point singulier | Déclencheur au devis | Ce qui s'ajoute | Statut |
| --- | --- | --- | --- |
| Trémie de fenêtre de toit | « Velux », « fenêtre de toit », « châssis » | 2 chevêtres + 2 chevrons doublés + 4 sabots + 24 pointes CNA (6 par sabot, *à vérifier fiche Simpson*) par fenêtre | règle 5.2-6 |
| Sortie de cheminée ou conduit | « cheminée », « conduit », « poêle » | 2 chevêtres + 2 chevrons doublés + 4 sabots ; distance de sécurité entre conduit et bois selon NF DTU 24.1 et le fabricant du conduit | sourcé (CODIFAB §9) ; distance à vérifier |
| Trémie d'escalier dans un plancher | « trémie escalier » | 2 chevêtres + 2 solives doublées + 4 sabots | règle 5.2-7 |
| Lucarne, chien assis | « lucarne », « chien assis » | 2 poteaux + 1 sablière + chevrons de lucarne (≈ 2 × profondeur / e) + 2 noulets + chevêtre | à vérifier |
| Croupe | « croupe », « 4 pans » | arêtiers + empannons (règle 5.2-5) ; en fermettes : solution du fabricant (fermes tronquées ou empannons porteurs) | sourcé (CODIFAB §2.5) |
| Noue | « noue » | 1 pièce de noue + empannons | règle 5.2-5 |
| Débord en pignon | Dp > 0 | pannes et faîtage rallongés de Dp + 2 chevrons de rive (1 par versant et par pignon) | règle |
| Planche de rive et bandeau | « planche de rive », « bandeau » | planches de longueur commerciale le long des rives et de l'égout, 1 vis inox tous les 50 cm *(à vérifier)* | à vérifier |
| Ferme contre un pignon (fermettes) | CH-03 | 1 fixation près de chaque nœud, 1,20 m maxi entre fixations | sourcé (CODIFAB §5.4) |
| Appui glissant (ferme ciseau, Polonceau) | « ferme ciseau » | équerre à trou oblong spécifique : les équerres du commerce ne conviennent pas au-delà de 6 mm de jeu | sourcé (CODIFAB §2.4, §5.3) |
| Contreventement de charpente traditionnelle | CH-01, CH-02 | écharpes ou croix de Saint-André en planches, ou feuillard en croix ; 2 pointes annelées par croisement | à vérifier |
| About de panne encastré dans la maçonnerie | CH-01 en réno | traitement des abouts + sabot ou étrier si l'appui est repris | à vérifier |
| Zone sismique | département en zone 3 et plus | antiflambements renforcés par équerres sur l'entretoise inclinée | sourcé (CODIFAB §8.4) |

### 9.2 Consommables par ouvrage

| Consommable | Ratio | Unité de commande | Statut |
| --- | --- | --- | --- |
| Vis de charpente 8 × (h chevron + 80) | 1 par croisement chevron × appui | boîte de 50 | règle 5.2-4 |
| Pointes annelées CNA 4,0×40 (sabots, équerres) | nombre de trous du connecteur (fiche fabricant) ; défaut 10 par équerre, 12 par sabot *(à vérifier)* | boîte de 250 ou 1 500 | à vérifier |
| Pointes annelées 3,1×90 ou 3,4×90 (contreventement, lisses) | 2 par croisement | boîte de 2 500 ou bande pour cloueur *(à vérifier)* | sourcé pour le ratio (CODIFAB §5.5) |
| Goujons ou tiges scellées (sablière sur maçonnerie) | 1 tous les 1,20 m + 1 par extrémité | boîte de 50 | à vérifier |
| Chevilles béton (équerres d'ancrage de fermettes) | 2 par équerre *(à vérifier fiche)* | boîte de 50 ou 100 | à vérifier |
| Résine de scellement | 1 cartouche pour 10 à 15 scellements M12 *(à vérifier)* | cartouche | à vérifier |
| Tiges filetées, écrous, rondelles (moisage) | 1 tige tous les 40 à 60 cm de moise, 2 écrous + 2 rondelles par tige *(à vérifier)* | tige de 1 m ; boîte d'écrous et de rondelles | à vérifier |
| Produit de traitement | règle 5.2-10 | bidon 5 L ou 20 L | sourcé |
| Chevilles d'injection | 1 par puits | boîte | à vérifier |
| Mousse, colle, joint | aucun en charpente courante | — | — |

## 10. Cas de test

Trois cas calculés à la main avec les règles des chapitres 5 et 6 servent de premiers tests unitaires (`tests/`) ; ils seront remplacés par des devis réels anonymisés dès qu'un charpentier en fournit (chapitre 13). Longueurs commerciales du test : 3,00 à 7,50 m au pas de 0,50 m.

### 10.1 charp-001 : maison neuve, charpente à pannes, Côtes-d'Armor

Données : 10 × 8 m, 2 pans, 45°, pannes sur pignons et 2 refends (3 travées de 3,33 m), débord d'égout 0,40 m, pas de débord en pignon (Bretagne), chevrons 63×75 tous les 60 cm, pannes et faîtage 75×225, sablières 63×175. Calcul : d = 4 m ; R = 5,66 m ; chevron = 4,40 / cos 45° + 0,10 = 6,32 m → 6,50 m ; 18 chevrons par versant, 36 + 2 de casse ; 2 pannes intermédiaires par versant (⌈5,66 / 2,50⌉ − 1) ; chaque ligne de panne = 1 pièce sur 2 travées (6,77 → 7,00 m) + 1 pièce sur 1 travée (3,43 → 3,50 m) ; vis : 36 × 4 croisements × 1,10 = 159 → 4 boîtes de 50.

```json
{
  "id": "charp-001",
  "source": "cas calculé, référentiel v1.0.0",
  "devis_pdf": null,
  "contexte": { "departement": "22", "neuf": true, "pans": 2, "pente_deg": 45, "portee_m": 8, "longueur_m": 10, "debord_egout_m": 0.40, "debord_pignon_m": 0, "entraxe_chevrons_m": 0.60, "travees_pannes_m": [3.33, 3.33, 3.34] },
  "attendu": [
    { "article": "chevron sapin-épicéa traité CL2 63x75 L 6,50 m", "quantite": 38, "unite": "piece", "tolerance_pct": 3 },
    { "article": "madrier sapin-épicéa traité CL2 75x225 L 7,00 m", "quantite": 5, "unite": "piece", "tolerance_pct": 0 },
    { "article": "madrier sapin-épicéa traité CL2 75x225 L 3,50 m", "quantite": 5, "unite": "piece", "tolerance_pct": 0 },
    { "article": "bastaing sapin-épicéa traité CL2 63x175 L 5,50 m (sablières)", "quantite": 4, "unite": "piece", "tolerance_pct": 0 },
    { "article": "vis de charpente tête disque 8x160", "quantite": 4, "unite": "boite 50", "tolerance_pct": 0 },
    { "article": "goujon d'ancrage sablière (20 + 10 %)", "quantite": 1, "unite": "boite 50", "tolerance_pct": 0 }
  ],
  "hypotheses_affichees": ["pente 45° (couverture ardoise)", "chevrons tous les 60 cm", "pas de débord en pignon (Bretagne)", "bois traité classe 2, pas de termites dans le 22"],
  "questions_max": 4
}
```

### 10.2 charp-002 : maison neuve en fermettes, Gironde

Données : 12 × 9 m, 2 pans, 35°, combles perdus, fermettes à 60 cm, département sous arrêté termites (code O). Le moteur sort un lot et la quincaillerie d'ancrage, pas de bois : 21 fermes (⌈12 / 0,60⌉ + 1), 2 équerres par ferme = 42 × 1,05 = 45 → 1 boîte de 50 ; pointes : 10 par équerre × 42 × 1,10 = 462 → 2 boîtes de 250 ; chevilles : 2 par équerre × 42 × 1,10 = 93 → 1 boîte de 100.

```json
{
  "id": "charp-002",
  "source": "cas calculé, référentiel v1.0.0",
  "devis_pdf": null,
  "contexte": { "departement": "33", "termites": "O", "neuf": true, "ouvrage": "CH-03", "pans": 2, "pente_deg": 35, "portee_m": 9, "longueur_m": 12, "combles": "perdus" },
  "attendu": [
    { "article": "lot fermettes sur plan (21 fermes en W, portée 9,00 m, 35°, entraxe 60 cm, bois traité anti-termites) + fiche fabricant", "quantite": 1, "unite": "lot", "tolerance_pct": 0 },
    { "article": "équerre renforcée ABR105", "quantite": 1, "unite": "boite 50", "tolerance_pct": 0 },
    { "article": "pointe annelée CNA 4,0x40", "quantite": 2, "unite": "boite 250", "tolerance_pct": 0 },
    { "article": "cheville béton pour équerre d'ancrage", "quantite": 1, "unite": "boite 100", "tolerance_pct": 0 }
  ],
  "interdit": ["m² de fermettes", "liste de bois des fermes", "lisses de contreventement si fournies au lot"],
  "questions_max": 4
}
```

### 10.3 charp-003 : rénovation, remplacement de chevrons et traitement curatif

Données : remplacement de 6 chevrons 63×75 de 4,20 m, traitement curatif de la charpente d'un toit de 100 m², pas d'injection mentionnée. Chevrons : 4,30 m → 4,50 m, 6 + 1 de casse. Traitement : surface de bois = 100 × 1,3 (ratio à valider, chapitre 11) = 130 m² × 0,30 L × 1,10 = 42,9 L → 2 bidons de 20 L + 1 bidon de 5 L.

```json
{
  "id": "charp-003",
  "source": "cas calculé, référentiel v1.0.0",
  "devis_pdf": null,
  "contexte": { "departement": "56", "neuf": false, "ouvrages": ["CH-10", "CH-11"], "surface_toiture_m2": 100, "traitement": "curatif" },
  "attendu": [
    { "article": "chevron sapin-épicéa traité CL2 63x75 L 4,50 m", "quantite": 7, "unite": "piece", "tolerance_pct": 0 },
    { "article": "traitement insecticide-fongicide charpente", "quantite": 2, "unite": "bidon 20 L", "tolerance_pct": 0 },
    { "article": "traitement insecticide-fongicide charpente", "quantite": 1, "unite": "bidon 5 L", "tolerance_pct": 0 },
    { "article": "vis de charpente tête disque 8x160", "quantite": 1, "unite": "boite 50", "tolerance_pct": 0 }
  ],
  "questions_attendues": ["Q6 si « traitement » seul"],
  "questions_max": 4
}
```

## 11. Ratios à faire valider par un charpentier

Ces valeurs font tourner le moteur mais **ne sont pas sourcées** : un charpentier doit les confirmer ou les corriger avant la sortie de beta. Ordre = impact sur le quantitatif. Le relecteur coche, corrige la valeur ou écrit sa pratique.

| # | Ratio ou règle | Valeur actuelle | Chapitre | Impact | Validé |
| --- | --- | --- | --- | --- | --- |
| 1 | Entraxe chevrons par défaut | 0,60 m (0,50 m en neige C et plus) | 6.1 | très fort (±50 % de chevrons) | - \[ \] |
| 2 | Portée maxi chevron entre appuis, pour déduire le nombre de pannes | 2,50 m (63×75), 3,00 m (75×100) | 6.1 | fort | - \[ \] |
| 3 | Surface de bois développée d'une charpente existante | 1,3 × surface de toiture | 5.2-10 | fort sur le traitement | - \[ \] |
| 4 | Débord d'égout par défaut ; débord en pignon nul en Bretagne et Normandie | 0,40 m ; 0 m | 6.1, 8.3 | moyen | - \[ \] |
| 5 | Sections par défaut : chevron 63×75, panne et faîtage 75×225, sablière 63×175 | — | 6.1 | moyen (prix) | - \[ \] |
| 6 | Seuil pour passer la panne en lamellé-collé | entraxe des appuis > 4,50 m | 6.1 | moyen | - \[ \] |
| 7 | Surlongueur de coupe | 0,10 m bois massif, 0,05 m lamellé-collé | 5.1 | faible à moyen (change la longueur commerciale) | - \[ \] |
| 8 | Casse et défaut | +⌈n/20⌉ pour chevrons, 0 pour pannes | 5.3 | faible | - \[ \] |
| 9 | Fixation chevron sur appui : 1 vis 8 × (h + 80) par croisement ; ou pointes ? | vis | 5.2-4 | faible | - \[ \] |
| 10 | Pointes par connecteur | 10 par équerre, 12 par sabot | 9.2 | faible | - \[ \] |
| 11 | Ancrage des sablières | 1 tous les 1,20 m | 5.2-11 | faible | - \[ \] |
| 12 | Injection curative | 1 puits tous les 30 cm sur pièces > 10 cm | 5.2-10 | moyen sur le curatif | - \[ \] |
| 13 | Chantignoles débitées dans les chutes | 1 bastaing 3,00 m pour 12 | 5.2-3 | faible | - \[ \] |
| 14 | Contrefiches de carport | 2 par poteau | 5.2-8 | faible | - \[ \] |
| 15 | Correspondance des sections en cm (« 6/8 ») | 63×75 | 3.2 | moyen | - \[ \] |
| 16 | Neige zone C et plus : −15 % de portée ; zone D, E ou > 900 m : charpente à faire calculer | — | 8.1 | fort en montagne | - \[ \] |

Questions ouvertes pour le relecteur : quelle longueur de chevron maxi avant de raccorder sur panne ? Le bois de charpente se commande-t-il chez vous traité d'office ? Combien de devis sur 10 sont en fermettes ?

## 12. Sources officielles et fiches consultées

Les textes des DTU et des Eurocodes sont payants (AFNOR) et **n'ont pas été lus en intégralité** : les valeurs normatives reprises ici viennent du guide CODIFAB/UICB, qui s'appuie sur le NF DTU 31.3, et de tableaux publics de l'annexe nationale neige. Les achats prioritaires sont listés au chapitre 13.

### 12.1 Normes et guides

| Document | Ce qu'on y a pris | Lien |
| --- | --- | --- |
| Guide technique « La charpente industrialisée en bois », CODIFAB/UICB, 3e édition 2024 (fondé sur le NF DTU 31.3) | lot fabricant, épaisseurs 36/47 mm, entraxe < 1,10 m, ancrages, 2 pointes par croisement, tolérances, trémies | [page](https://www.codifab.fr/actions-collectives/la-charpente-industrialisee-en-bois-guide-technique) · [PDF](https://www.codifab.fr/uploads/media/664f55a1c0b0b/guide-technique-charpente-web-202407.pdf) |
| CTB Composants et Systèmes Bois, charpentes industrielles | entraxe fermettes 0,60 à 0,90 m, NF EN 14250 | [page](https://ctb-composants-systemes.fr/charpentes-industrielles/) |
| NF EN 1991-1-3/NA (neige), tableau AN.2 | sk par zone, neige accidentelle, formules d'altitude | [calculs-eurocodes.com](https://www.calculs-eurocodes.com/eurocode_1/partie_1-3/neige_toiture_versant_unique) |
| NF EN 1991-1-3/NA/A2, juillet 2022 | découpage des zones par commune | [AFNOR](https://www.boutique.afnor.org/en-gb/standard/nf-en-199113-na-a2/eurocode-1-actions-on-structures-part-13-general-actions-snow-loads-nationa/fa202281/326763) |
| Départements couverts par un arrêté termites (DGALN, 2016) | codes N / P / O par département | [PDF ministère](https://www.ecologie.gouv.fr/sites/default/files/documents/dgaln_dpts_termites_2016_0.pdf) |
| Arrêtés termites Occitanie (DREAL) | toute l'Occitanie sauf la Lozère | [page](https://www.occitanie.developpement-durable.gouv.fr/termites-les-departements-de-la-region-occitanie-a18413.html) |
| NF DTU 31.1, NF DTU 31.3, NF EN 1995-1-1, NF EN 338, NF EN 14080, NF EN 14081, NF EN 335 | **non consultés** (payants) | boutique AFNOR |

### 12.2 Fiches négoce et fabricant

| Produit | Lien |
| --- | --- |
| Bastaing 63×175 traité classe 2, longueurs | [Point.P 1788550](https://www.pointp.fr/p/bois-et-panneaux/bastaing-sapin-epicea-bois-traite-classe-2-l-4-m-63x175-mm-A1788550) · [Point.P 1788580](https://www.pointp.fr/p/bois-et-panneaux/bastaing-sapin-epicea-bois-traite-classe-2-l-5-m-63x175-mm-A1788580) |
| Madrier 75×225 traité classe 2, poids | [Point.P 1797862](https://www.pointp.fr/p/bois-et-panneaux/madrier-sapin-epicea-classe-2-l-4-00-m-75x225-mm-A1797862) · [Point.P 1797910](https://www.pointp.fr/p/bois-et-panneaux/madrier-sapin-epicea-classe-2-l-7-00-m-75x225-mm-A1797910) |
| Gamme bois de charpente Point.P (chevrons 63×75, 80×100, pièce 100×100) | [Point.P catégorie](https://www.pointp.fr/c/bois-de-charpente-brut/x3snv3_dig_2002914) |
| Madrier C24 75×225, longueurs au pas de 0,30 m | [Tanguy](https://www.tanguy.fr/bois/bois-massif/bois-de-charpente/sapin-epicea-c24-75x225-en-4m50) |
| Madrier C24 CL2 + anti-termites | [Dispano](https://www.dispano.fr/p/bois/madrier-sapin-epicea-c24-traite-classe-2-anti-termites-75x225mm-A6573332) |
| BMA / KVH C24 | [Chausson 60×100](https://www.chausson.fr/materiaux/bois-massif-aboute-sapin-epicea-c24-100x60mm-p-541970-3) · [Chausson 80×200](https://www.chausson.fr/materiaux/bois-massif-aboute-sapin-epicea-c24-200x80mm-p-541976-5) · [Rullier](https://www.rullier.fr/bois-massif-aboute-bma-sapin-epicea-c24-80x200mm-de-6500-mm-a-13000-mm.html) |
| Lamellé-collé GL24h | [Groupe Ratheau](https://www.groupe-ratheau.com/produit/poutres-lamelle-colle) · [Barillet](https://www.barillet-distribution.fr/poutre-lamelle-colle-sapinepicea-120x360mm-10m-gl24h-non-traite) · [Rullier](https://www.rullier.fr/lamelle-colle-sapin-epicea-gl24h-rabote-4-faces-100x360mm-de-6000-mm-a-14000-mm.html) · [SM Bois](https://www.smbois.com/p/lamelle-colle) · [Kenzai](https://www.kenzai.fr/bois-lamelle-colle/5367-lamelle-colle-douglas-gl-24h-120x360-mm.html) |
| Équerre Simpson ABR105 | [Eurabo](https://www.eurabo.be/fr/produits/simpson-strong-tie-equerre-abr) · [MisterMatériaux](https://mistermateriaux.com/produit/equerre-de-charpente/5u0reo) · [Dispano](https://www.dispano.fr/p/outillage-quincaillerie/equerre-mixte-renforcee-105x105x90-epaisseur-3mm-A1919178) |
| Pointes annelées Simpson CNA | [Simpson France](https://www.simpson.fr/fr-FR/produits/pointe-annelee-electrozinguee-cna) · [Bricozor](https://www.bricozor.com/pointes-annelees-electrozinguees-cna-simpson.html) |
| Vis de charpente 8×240 boîte de 50 | [Point.P SPAX](https://www.pointp.fr/p/outillage-quincaillerie/vis-charpente-spax-empreinte-torx-tete-disque-8x240-mm-boite-50-A1606543) · [Chausson Rocket](https://www.chausson.fr/quincaillerie/vis-bois-rocket-charpente-tete-fraisee-torx-acier-zingue-filetage-partiel-8x240mm-boite-50-p-807091-1) · [Würth gamme](https://eshop.wurth.fr/v/vis-pour-fixer-chevron-sur-panne) |
| Traitement insecticide-fongicide | [Pro Tech Bois](https://matieresetbeton.com/products/traitement-insecticide-preventif-et-curatif-pour-bois-et-charpente) · [Xilix](https://www.lasure-prod.com/produits-exterieurs/86-traitement-bois-xilix-.html) · [Xylophène 20 L](https://www.agrialpro.fr/0330970.html) |

## 13. Plan de complétion

Le tiroir est utilisable en beta pour les charpentes simples à 2 pans et les fermettes ; il reste 9 tâches, par ordre d'impact sur la justesse des quantitatifs.

- [ ] Faire relire le chapitre 11 par un charpentier (16 ratios) et récupérer 5 devis réels anonymisés avec la commande passée au négoce → remplacer les cas de test calculés.
- [ ] Saisir la table neige par commune (NF EN 1991-1-3/NA/A2 2022) et la zone de vent par département dans `commun/departements.json`.
- [ ] Remplacer la liste termites DGALN 2016 par la cartographie Cerema à jour (communes des départements « P »).
- [ ] Acheter et transcrire le NF DTU 31.1 (sections, appuis mini, fixations) et le NF DTU 31.3 partie 1 (tableau des sections mini de contreventement, art. 4.5).
- [ ] Relever chez 3 négoces du réseau Rappidos (Point.P, Gedimat, un négoce breton) la liste complète des sections et longueurs commerciales de chevrons, bastaings, madriers → `longueurs_commerciales` par `fournisseur_id`.
- [ ] Fiches Simpson : nombre de trous et pointes par modèle (ABR105, SAE, étriers, pieds de poteau), conditionnement des sabots, feuillard en rouleau.
- [ ] Fiche technique officielle d'un traitement professionnel (rendement préventif, curatif, injection) pour remplacer les fiches revendeurs.
- [ ] Algorithme de regroupement des empannons et des chutes (first-fit decreasing) : test unitaire sur une croupe 8 × 8 m.
- [ ] Ouvrir les futurs tiroirs liés : `ossature-bois` (DTU 31.2) et escaliers bois.

Ce qui ne sera jamais dans ce tiroir : le dimensionnement des sections (bureau d'études ou fabricant) et le calcul des fermettes.

## 14. CHANGELOG

| Date | Version | Changement |
| --- | --- | --- |
| 2026-10-03 | 1.0.0-beta | Création du tiroir charpente au format section 27 : 12 ouvrages, règle d'or « pièces section × longueur », fiches Point.P, Tanguy, Dispano, Chausson, Rullier, Simpson, traitements ; formules géométriques ; fermettes en lot fabricant avec fiche de demande ; neige et termites par département ; 8 questions dont 4 par défaut ; 3 cas de test calculés ; 16 ratios à valider. |
