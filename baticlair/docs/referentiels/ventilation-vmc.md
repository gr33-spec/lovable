# Référentiel quantitatif VENTILATION / VMC (Rappidos)

Oct 3, 2026 · @Greg

Ce tiroir couvre la ventilation mécanique des logements (VMC simple flux autoréglable, hygro A, hygro B, double flux) et la ventilation des petits locaux tertiaires. Il est conforme au gabarit de la section 27 du référentiel couverture : aucun mot de métier dans le moteur, tout vit ici. Une VMC se commande presque entièrement **à la pièce** (caisson, bouches, entrées d'air, sortie de toit) ; seuls les conduits et l'isolant se commandent en **rouleaux, longueurs ou couronnes**.

## 1. Métier et axes de variation

La ventilation est pilotée d'abord par le **type de bâtiment** et par **neuf / rénovation**, puis par le nombre et le type de pièces. La géographie pèse peu, sauf pour le double flux (zone climatique) et le bord de mer (sortie de toit inox ou alu).

```json
{
  "code": "ventilation",
  "nom": "Ventilation - VMC",
  "version": "1.0.0",
  "normes": ["DTU 68.3 (NF DTU 68.3, 2017)", "Arrêté du 24 mars 1982 modifié 1983", "Avis Techniques / DTA VMC hygro (CSTB, CPT 3615)", "NF C 15-100 (alimentation caisson)", "RE2020 (neuf)", "Règlement sanitaire départemental (tertiaire)"],
  "axes_de_variation": {
    "geographie": "faible",
    "epoque_bati": "moyen",
    "type_batiment": "fort",
    "neuf_renovation": "fort",
    "gamme": "moyen"
  },
  "metiers_lies": ["electricite", "menuiserie", "couverture", "isolation", "platrerie"],
  "unites_de_commande": ["u", "rouleau", "longueur", "couronne", "boite", "lot", "carton", "kit"],
  "maturite": "alpha"
}
```

| Axe | Poids | Ce qu'il change dans le quantitatif |
| --- | --- | --- |
| type\_batiment | fort | Maison individuelle : 1 caisson par logement (kit). Collectif : caisson collectif en toiture + colonnes, hors périmètre MVP (l'app le dit). Tertiaire/ERP : débits par occupant (RSDT), hors MVP. |
| neuf\_renovation | fort | Rénovation : dépose de l'ancien caisson, réutilisation ou non des gaines, entrées d'air à percer dans les menuiseries existantes (mortaiseur), sortie de toit souvent existante. Neuf : tout est fourni, entrées d'air souvent fournies par le menuisier (à demander). |
| gamme | moyen | Autoréglable / hygro A / hygro B / double flux : change le caisson, les bouches et les entrées d'air (même nombre, références différentes). Double flux : 2 réseaux, gaines isolées, plus de bouches de soufflage. |
| epoque\_bati | moyen | Avant 1982 : souvent aucune ventilation, pas d'entrées d'air, conduits shunt ou ventilation naturelle à condamner. 1982-2000 : VMC autoréglable existante à remplacer, réseau souvent réutilisable. |
| geographie | faible | Zone H1 (froid) : double flux plus fréquent, gaine isolée obligatoire en comble froid partout. Bord de mer : sortie de toit alu ou inox, colliers inox. Montagne : sortie de toit renforcée neige *(à vérifier)*. |

Périmètre MVP : maison individuelle et logement individuel en collectif avec caisson propre. VMC collective, VMI (insufflation), puits canadien et tertiaire au-delà de 3 locaux : l'app sort un quantitatif partiel et l'écrit en clair.

## 2. Règle d'or et unités de commande

**Règle d'or : une VMC ne se calcule jamais en m² de logement.** Elle se calcule en **pièces** : 1 bouche par pièce de service, 1 entrée d'air par pièce principale (2 si séjour > 30 m² ou séjour + chambre ouverts), 1 conduit par bouche, 1 caisson, 1 sortie de toit. La surface ne sert qu'à vérifier, jamais à commander. Le nombre de pièces principales (séjour + chambres, « T3 », « F4 ») fixe les débits ([arrêté du 24 mars 1982, art. 3](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000862344/)).

Deuxième règle : **on commande d'abord un kit**. En maison individuelle, 90 % des chantiers se commandent en 1 kit fabricant (caisson + 3 ou 4 bouches + entrées d'air + parfois gaines) complété par des articles à l'unité pour ce que le kit ne couvre pas (2e salle d'eau, WC supplémentaire, cellier, gaines manquantes, sortie de toit). L'app doit d'abord chercher le kit qui correspond, puis compléter.

| Article | Unité de commande | Conditionnement courant | Ne jamais sortir en |
| --- | --- | --- | --- |
| Caisson / groupe VMC | u (souvent en kit) | 1 kit = caisson + bouches (+ entrées d'air, + gaines selon kit) | m² |
| Bouche d'extraction (cuisine Ø125, sanitaire Ø80) | u | livrée avec manchette | m² |
| Entrée d'air (menuiserie ou mur) | u | entrée + auvent (vendus ensemble ou séparés selon gamme) | ml |
| Gaine souple isolée Ø80 / Ø125 / Ø160 | filet ou rouleau | 6 m (Aldes Algaine), 3 m ou 6 m selon marques | m² ; ml brut sans arrondi au filet |
| Conduit semi-rigide Ø75 / Ø90 (Optiflex, Clip&Go) | couronne | 25 m, 30 m ou 50 m | ml brut |
| Conduit rigide PVC ou galva Ø125 / Ø160 | longueur | barres de 1 m, 2 m ou 3 m *(à vérifier selon négoce)* | ml brut |
| Sortie de toit / rejet | u | kit tuile ou ardoise + chapeau, Ø160 mini | ml |
| Raccords (manchon, té, coude, réduction, culotte) | u | à l'unité | ml |
| Colliers de serrage | u ou sachet | sachets de 10 à 50 *(à vérifier)* | ml |
| Adhésif aluminium | rouleau | 50 m × 50 mm courant *(à vérifier)* | m² |
| Suspente caisson | u | souvent fournie dans le kit | — |
| Câble d'alimentation | couronne ou ml coupé | négoce élec | — |

Un quantitatif VMC tient sur une demi-page : 8 à 15 lignes. Si l'app en sort 40, c'est qu'elle a détaillé ce que le kit contient déjà.

## 3. Ouvrages du métier, vocabulaire des devis, pièges

Sept ouvrages couvrent l'essentiel des devis d'artisan. Chacun devient une entrée de `ouvrages.json` et de `vocabulaire.json`.

| Code ouvrage | Ce que l'artisan réalise | Expressions trouvées dans les devis | Exclusions (autre ouvrage) |
| --- | --- | --- | --- |
| vmc\_sf\_auto | VMC simple flux autoréglable (débit fixe) | « VMC autoréglable », « VMC simple flux », « VMC SF », « kit VMC 3 bouches », « Easy Vec », « Autocosy », « débit constant » | hygro, double flux |
| vmc\_sf\_hygro\_a | VMC hygroréglable type A (bouches hygro, entrées d'air fixes) | « hygro A », « hygroréglable A », « Hygrocosy A », « Easyhome hygro » sans précision B | « hygro B » |
| vmc\_sf\_hygro\_b | VMC hygroréglable type B (bouches et entrées d'air hygro) | « hygro B », « hygroréglable B », « Hygrocosy BC », « BDH », « Bahia », « EHB », « entrées d'air hygro » | « hygro A » |
| vmc\_df | VMC double flux (insufflation + extraction, échangeur) | « double flux », « VMC DF », « Dee Fly », « InspirAIR », « Duolix », « récupérateur de chaleur », « échangeur », « Zehnder ComfoAir » | « simple flux », « VMI » |
| vmc\_remplacement | Remplacement du caisson seul sur réseau existant | « remplacement moteur VMC », « changement groupe », « remplacement caisson », « dépose ancienne VMC » | création réseau |
| ventil\_ponctuelle | Aérateur ou extracteur ponctuel (1 pièce) | « aérateur », « extracteur salle de bain », « ventilateur hélicoïde », « Silent », « Decor » | caisson centralisé |
| entrees\_air\_seules | Pose d'entrées d'air dans menuiseries existantes | « mortaisage », « grilles d'aération », « entrées d'air », « réglettes » | VMC complète |

Hors MVP, détectés pour dire « je ne sais pas encore faire » : VMC collective (« tourelle », « caisson de toiture collectif », « colonne shunt »), VMI (« insufflation », « VMI Ventilairsec »), puits canadien / provençal, ventilation tertiaire (« CTA », « centrale de traitement d'air », « débit par occupant »).

**Pièges des devis (l'app doit les repérer)**

1. **« Kit VMC » sans détail** : le kit contient déjà caisson et bouches. Ne jamais ajouter des bouches en plus pour les pièces déjà couvertes par le kit.
2. **« Fourniture et pose VMC » sans nombre de pièces** : il faut le nombre de salles d'eau et de WC (question n°1, chapitre 7). C'est le seul vrai levier.
3. **Gaine non mentionnée** : la plupart des devis écrivent « VMC + bouches » et oublient les gaines. Les gaines sont toujours à commander sauf kit « avec gaines ».
4. **Sortie de toit oubliée** : le rejet en comble est interdit ([NF DTU 68.3, Aldes](https://www.aldes.fr/reglementations/ventilation-et-qualite-d-air-interieur/nf-dtu-68.3)). Toute VMC neuve en comble = 1 sortie de toit ou 1 rejet façade, sauf si le devis dit « réutilisation sortie existante ».
5. **Entrées d'air fournies par le menuisier** : en neuf, les fenêtres arrivent souvent avec les entrées d'air. Question à poser, sinon double commande.
6. **Hygro A vs B** : en hygro A, entrées d'air **autoréglables** ; en hygro B, entrées d'air **hygroréglables**. Même nombre, référence différente.
7. **« T4 » ou « F4 »** = 4 pièces principales (séjour + 3 chambres), pas 4 chambres. La cuisine, la salle de bains et les WC ne comptent pas.
8. **Cuisine ouverte sur séjour** : la bouche cuisine reste obligatoire, au-dessus de la zone de cuisson (Ø125).
9. **Double flux** : 2 réseaux distincts (soufflage dans les pièces principales, extraction dans les pièces de service) + 2 conduits extérieurs (prise d'air neuf et rejet). Le nombre de bouches double presque.
10. **Hotte raccordée sur la VMC** : interdit sauf matériel prévu. Si le devis dit « hotte raccordée VMC », l'app le signale *(à vérifier selon Avis Technique)*.

## 4. Matériaux et fiches fabricant

Deux marques couvrent l'essentiel des négoces : **Aldes** et **Atlantic** (puis Unelvent, S&P, Anjos, Ubbink pour les accessoires). Toutes les données ci-dessous viennent des fiches fabricant ou distributeur ouvertes le 3 oct. 2026 ; le reste est marqué *(à vérifier)*.

### 4.1 Caissons simple flux (vendus en kit)

| Kit | Type | Piquages | Contenu du kit | Ce qui n'est PAS dans le kit | Poids groupe | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Aldes EasyHOME Hygro Premium MW BDH, réf. 11033434 | hygro B | jusqu'à 7 sanitaires | groupe + bouche cuisine C51 Ø125 + bain B51 Ø80 + WC W16 Ø80, manchettes | entrées d'air, gaines, sortie de toit | 2,7 kg | [batirmoinscher](https://www.batirmoinscher.com/pack-vmc-easyhome-11033434-aldes-gaines.html), [Aldes](https://storeonline.aldes.fr/ventilation-vmc/607-groupe-vmc-easyhome-hygroreglable-premium-mw-11033033.html) |
| Aldes EasyHOME Hygro Compact Premium MW BDH, réf. 11033451 | hygro | 1 cuisine Ø125 + 4 Ø80, rejet Ø160 | groupe + 3 bouches (C51, B51, W16) + EasyCLIP | entrées d'air, gaines, sortie de toit | *(à vérifier)* | [outilspiecesdepot](https://www.outilspiecesdepot.com/shop/pack-vmc-easyhome-hygro-compact-premium-mw-bdh-aldes-4-gaines-isolees/) |
| Aldes EasyHOME Hygro Combles Premium MW, réf. 11033042 | hygro B | 2 × Ø125, 5 × Ø80, rejet Ø160 | groupe + 3 bouches Bahia Curve + 4 entrées d'air EHB + 4 filets Algaine (2 × Ø80, 1 × Ø125, 1 × Ø160) | sortie de toit | *(à vérifier)* | [blanc-habitat](https://www.blanc-habitat.com/ventilation-simple-flux-hygroreglable-ab/343935-kit-vmc-easyhome-hygro-combles-mw-gaines-isolees-entrees-d-air-ehb-aldes-11033042) |
| Aldes EasyHOME Hygro Classic, réf. 11033030 | hygro | 4 sanitaires max | groupe + 2 bouchons Ø80 | bouches, entrées d'air, gaines, sortie | 2,7 kg | [Aldes](https://storeonline.aldes.fr/ventilation-vmc/602-groupe-vmc-easyhome-hygroreglable-classic-11033030.html) |
| Atlantic Hygrocosy, réf. 412292 | hygro A et B | 6 × Ø80 (2 piquages Twist&Go fournis), 1 × Ø125, rejet Ø160 | groupe + 3 bouches à piles (cuisine Ø125, WC présence Ø80, SdB Ø80) + 4 colliers | entrées d'air, gaines, sortie, **piles LR6**, **bouton poussoir cuisine (réf. 420931)**, piquages Ø80 au-delà de 2 | 2 kg | [elecdistrib](https://www.elecdistrib.fr/ventilation-accessoires/1058-vmc-simple-flux-hygroreglable-hygrocosy-atlantic-ref-412292-3416084122922.html), [domomat](https://www.domomat.com/30409-kit-vmc-hygrocosy-simple-flux-hygroreglable-231mh-22db-avec-3-bouches-a-piles-atlantic-412292.html), [econology](https://www.econology.fr/kit-hygrocosy-kit-vmc-simple-flux-hygroreglable-avec-bouches-atlantic-412292.html) |
| Atlantic Hygrocosy BC Flex+, réf. 412278 | hygro B extra-plat | 4 × Ø80 + 1 × Ø125, rejet Ø160 | groupe + 3 bouches à piles + 4 piquages Ø80 + adaptateurs 125/80 + 6 colliers | entrées d'air, gaines, sortie | 2,6 kg | [materiauxgrosoeuvre](https://www.materiauxgrosoeuvre.com/product/atlantic-kit-vmc-hygrocosy-bc-flex-simple-flux-hygroreglable-6-sanitaires-3-bouches-a-piles-247m%C2%B3-h-ref-412278/), [Atlantic PDF](https://www.domomat.com/hygrocosy-flex-atlantic-domomat.pdf) |

Autoréglable : Atlantic Autocosy, Aldes EasyHOME Auto *(fiches à saisir, même logique de kit)*.

### 4.2 Conduits

| Article | Diamètres | Conditionnement | Caractéristique | Source |
| --- | --- | --- | --- | --- |
| Algaine isolée Aldes (gaine souple) | Ø80, Ø125, Ø160 | **filet de 6 m** | laine de verre 25 mm, jaquette alu | [Aldes](https://storeonline.aldes.fr/ventilation-vmc/1267-kit-vmc-easyhome-hygro-premium-hp-plus-11033421.html) |
| Gaine souple isolée Atlantic / autres marques | Ø80, Ø125, Ø160 | rouleau 3 m ou 6 m *(à vérifier selon négoce)* | R ≥ 0,6 exigé hors volume chauffé | — |
| Optiflex Aldes (semi-rigide circulaire) | Ø90 (int. 78) | **couronne de 50 m** (aussi 30 m) | rayon de courbure 15 cm | [Aldes](https://storeonline.aldes.fr/accueil/674-conduit-antistatique-optiflex--11095922.html), [climmoinschere](https://www.climmoinschere.com/Aldes-conduit-circulaire-gris-O90-50m-semi-rigide-Optiflex-PVC-11091854_94__4124.html) |
| Atlantic Clip&Go semi-rigide circulaire, réf. 464032 | Ø90 | **couronne de 25 m**, 15 kg | joints XJ et clips XCF à prévoir en plus | [electrissime](https://www.electrissime.fr/conduit-semi-rigide-circulaire-o-90-25m-464032-a33243.html) |
| Isolant Optiflex (manchon isolant) | Ø90 | *(à vérifier)* | équivalent 25 mm laine de verre | [Aldes](https://storeonline.aldes.fr/221-semi-rigide-optiflex) |

### 4.3 Entrées d'air

Mortaise standard : **2 fentes de 172 × 12 mm** (entraxe 370 mm), ou fente simple 250 × 12/15 mm ; débit sous 20 Pa ([Aldes, guide entrées d'air](https://www.prospair.com/contents/fr/aldes_entree_air.pdf)). Le kit = entrée intérieure + auvent extérieur.

| Gamme | Modules | Pour | Conditionnement | Source |
| --- | --- | --- | --- | --- |
| Aldes EA 22 / 30 / 45 (kit EA = EA + auvent) | 22, 30, 45 m³/h | autoréglable, hygro A | unité ; EFB par 5 | [Aldes storeonline](https://storeonline.aldes.fr/167-entrees-d-air-) |
| Aldes EHB / EHL (hygroréglable) | 5 à 45 m³/h | hygro B | unité *(à vérifier)* | idem |
| Entrée d'air traversée de mur EM A Ø125 | 22, 30, 45 m³/h | mur sans menuiserie adaptée | kit | [econology](https://www.econology.fr/le-blog/guide-choisir-entrees-air-logement) |

### 4.4 Rejet et sortie de toit

Diamètre mini **160 mm** en toiture ; tuile à douille avec lanterne et chatière < 160 mm interdites ([Aldes, NF DTU 68.3](https://www.aldes.fr/reglementations/ventilation-et-qualite-d-air-interieur/nf-dtu-68.3)).

| Article | Ø | Couverture | Réf. | Source |
| --- | --- | --- | --- | --- |
| Aldes sortie de toit STR | 160 | tuile ou ardoise ; embase 600 × 500 | 11022093 (ardoise) | [Aldes](https://storeonline.aldes.fr/ventilation-vmc/1293-sortie-de-toit-str-tuile-d160-11022093.html) |
| Aldes sortie de toiture STS (plomb façonnable) | 160 | tuile (peinture brique) | 11030108 | [Aldes](https://storeonline.aldes.fr/rejet-d-air/688-sortie-toiture-sts-o-160mm-tuile-11030108.html) |
| Atlantic CPR 160 (plastique + plomb) | 160 | rouge (tuile) 422962, gris (ardoise) 422963 | 422962 / 422963 | [manomano](https://www.manomano.fr/p/sortie-de-toiture-vmc-atlantic-gris-ardoise-37779?model_id=324018) |
| Anjos CTP2 | 160 | tuile ou ardoise, pente ≥ 16° | 3010 / 3060 | [ventildirect](https://www.ventildirect.fr/171-sortie-de-toit-vmc-plastique-anjos-ctp2-chapeau-haute-performance-pour-toiture-incline.html) |

### 4.5 Double flux

| Article | Contenu | Source |
| --- | --- | --- |
| Aldes Dee Fly Cube 300 HE (remplacé par InspirAIR Top) | centrale ; jusqu'à T7 / 6 sanitaires ; 4 piquages Ø160 | [econology](https://www.econology.fr/dee-fly-cube-300-he-he-micro-watt-aldes-vmc-double-flux.html) |
| Kit Dee Fly Cube 300 HE IHM P06 | centrale + 2 caissons répartiteurs isolés 6 piquages (11023194) + kit bouches T3/T4 | [econology](https://www.econology.fr/dee-fly-cube-300-he-ihm-accessoires-aldes-kit-vmc-double-flux.html) |
| Caisson répartiteur isolé 1 × Ø160 + 6 × Ø80 | 1 par réseau (soufflage, extraction) | [econology](https://www.econology.fr/dee-fly-cube-370-he-he-micro-watt-aldes-vmc-double-flux.html) |
| Caisson de répartition Optiflex | 11, 16 ou 20 piquages Ø75/90 | [Aldes](https://www.aldes.fr/produits/reseaux/reseaux-plastiques/conduits-semi-rigides/caisson-de-repartition-optiflex) |

Règle `materiaux.json` (identique au tiroir couverture) : le conditionnement vient d'une fiche négoce, car c'est le négoce qui livre. Les conditionnements des petits consommables (colliers, adhésif) restent *(à vérifier)* chez Rexel, Sonepar, CEDEO, Point.P.

## 5. Règles de calcul (DTU 68.3, arrêté 1982, Avis Techniques), formules et pertes

Tout le calcul part de deux nombres lus dans le devis : **pièces principales (PP)** et **pièces de service** (cuisine, salles de bains, salles d'eau, WC, cellier). Une formule par article, en code pur, testable.

### 5.1 Débits réglementaires (vérification, pas commande)

Arrêté du 24 mars 1982, art. 3, débits extraits en m³/h ([Légifrance](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000862344/), [Aldes](https://www.aldes.fr/reglementations/ventilation-et-qualite-d-air-interieur/arrete-du-24-mars-82)) :

| PP | Cuisine | Salle de bains (avec ou sans WC) | Autre salle d'eau | WC unique | WC multiples (chacun) |
| --- | --- | --- | --- | --- | --- |
| 1 | 75 | 15 | 15 | 15 | 15 |
| 2 | 90 | 15 | 15 | 15 | 15 |
| 3 | 105 | 30 | 15 | 15 | 15 |
| 4 | 120 | 30 | 15 | 30 | 15 |
| 5 et + | 135 | 30 | 15 | 30 | 15 |

Débit total minimal en réglage réduit (art. 4) : 35, 60, 75, 90, 105, 120, 135 m³/h de 1 à 7 PP, dont cuisine 20, 30 puis 45 ; en modulation automatique (hygro) : 10, 10, 15, 20, 25, 30, 35 m³/h ([Légifrance art. 4](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006830558/2026-08-11)). Séjour ouvert sur une chambre sans cloison = 2 PP. *La colonne « WC multiples » est à vérifier sur le texte officiel.*

Usage dans l'app : le débit sert uniquement à **choisir le caisson** (vérifier que le nombre de bouches et le débit max du kit couvrent le logement), jamais à compter des matériaux.

### 5.2 Formules par article (simple flux)

```
n_bouches_cuisine = 1
n_bouches_sanitaires = n_sdb + n_salles_eau + n_wc + n_cellier
n_bouches = n_bouches_cuisine + n_bouches_sanitaires

kit : choisir le kit dont piquages_sanitaires_max >= n_bouches_sanitaires
      et type (auto / hygro A / hygro B) = type du devis
bouches_hors_kit = max(0, n_bouches_sanitaires - bouches_sanitaires_dans_kit)
piquages_hors_kit = max(0, n_bouches_sanitaires - piquages_fournis_kit)   # Atlantic : 2 fournis

entrees_air = sejour + chambres   (tableau 5.3)

gaines Ø125 = 1 filet (cuisine)
gaines Ø80  = n_bouches_sanitaires filets      # 1 filet de 6 m par bouche
gaine Ø160  = 1 filet (rejet)
sortie_toit = 1  (sauf « rejet façade » ou « sortie existante conservée »)

colliers = 2 × (nombre de gaines) + 2            # extrémités + réserve
adhesif_alu = 1 rouleau par chantier
piles_LR6 = 2 × bouches_a_piles  (Atlantic Hygrocosy)
```

Pourquoi 1 filet de 6 m par bouche : chaque piquage du groupe peut être raccordé à un conduit de **6 m maximum avec 3 coudes à 90° au maximum** ; au-delà il faut un second groupe ou un réseau rigide ([Progineer, résumé DTU 68.3](https://progineer.fr/workspace/regulation/dtu-68-3/)). Une gaine ne se raboute pas en pratique : on commande donc 1 filet par bouche, sans perte supplémentaire. Si le devis donne une distance > 6 m, l'app bloque et le dit.

Rejet : diamètre du rejet et de sa gaine au moins égal au piquage de rejet du groupe ; perte de charge rejet + conduit ≤ 25 Pa à 200 m³/h, ou rejet aéraulique + 2 m de gaine maxi ([Xpair](https://conseils.xpair.com/actualite_experts/dtu-683-ventilation.htm)). Conduits hors volume chauffé isolés R ≥ 0,6 ([Aldes](https://www.aldes.fr/reglementations/ventilation-et-qualite-d-air-interieur/nf-dtu-68.3)).

### 5.3 Entrées d'air (autoréglable et hygro A)

Guide fabricant ([econology / guide Aldes](https://www.econology.fr/le-blog/guide-choisir-entrees-air-logement)) :

| Logement | Séjour | Chaque chambre |
| --- | --- | --- |
| F1 | 2 × 45 | — |
| F2 | 2 × 30 | 1 × 30 |
| F3 | 2 × 30 | 1 × 30 |
| F4 | 1 × 45 | 1 × 30 |
| F5 | 1 × 45 | 1 × 30 |
| F6 | 1 × 45 | 1 × 22 |
| F7 | 1 × 45 | 1 × 22 |

Équivalences admises : 2 EA 22 = 1 EA 45 ; 3 EA 30 = 2 EA 45 ([Aldes catalogue](https://www.domomat.com/entree-air-et-grille-aeration-aldes-domomat.pdf)). Hygro B : 1 entrée hygroréglable par chambre, 1 ou 2 au séjour selon guide du fabricant du kit *(à vérifier par kit)*. Cuisine, salle de bains, WC : jamais d'entrée d'air.

### 5.4 Double flux

```
soufflage : 1 bouche par chambre, 1 ou 2 au séjour (2 si séjour > 30 m²)
extraction : 1 bouche par pièce de service (comme simple flux)
caissons_repartiteurs = 2 (1 soufflage, 1 extraction) si réseau en étoile
conduits extérieurs : prise d'air neuf + rejet = 2 gaines Ø160 isolées + 2 sorties (toit ou façade)

réseau semi-rigide Ø90 :
  L_total = Σ distance caisson→bouche × nb_conduits_par_bouche
  nb_conduits_par_bouche = ceil(débit_bouche / 30)    # 1 Ø90 ≈ 30 m³/h (à vérifier)
  couronnes = ceil(L_total × 1,10 / longueur_couronne)  # 10 % de chutes
```

Conduits souples limités à 3 m par bouche en individuel en double flux ; isolation : hors volume chauffé R ≥ 0,6 (air neuf, rejet) et R ≥ 1,2 (soufflage, extraction) ([Progineer](https://progineer.fr/workspace/regulation/dtu-68-3/), [Aldes](https://www.aldes.fr/reglementations/ventilation-et-qualite-d-air-interieur/nf-dtu-68.3)).

### 5.5 Pertes

| Article | Perte | Raison |
| --- | --- | --- |
| Gaine souple en filet | 0 % (arrondi au filet) | 1 filet par bouche |
| Couronne semi-rigide | +10 % puis arrondi à la couronne | chutes en extrémité de couronne *(à vérifier)* |
| Conduit rigide | +5 % puis arrondi à la barre | coupes *(à vérifier)* |
| Colliers | +2 u | perte chantier |
| Bouches, entrées d'air, caisson | 0 % | à la pièce |

## 6. Valeurs par défaut et hypothèses affichées

Quand le devis ne dit rien, l'app prend ces valeurs et les **affiche en tête du quantitatif**, modifiables d'un tap. Résolution : chantier → artisan → variation par axe → valeur nationale.

| Clé | Valeur nationale | Variations | Texte affiché |
| --- | --- | --- | --- |
| type\_vmc | hygro\_b | neuf RE2020 : hygro\_b ; « autoréglable » écrit : auto ; remplacement caisson : même type que l'existant | « VMC hygro B » |
| marque | celle du devis, sinon Atlantic | artisan : sa marque habituelle (apprise) | « Marque : Atlantic » |
| pieces\_principales | lu du devis (« T4 », « F4 », « 3 chambres » = 4) | absent : question 2 | « Logement T4 » |
| n\_sdb | 1 | — | « 1 salle de bains » |
| n\_wc | 1 (séparé) | T1/T2 : 1 commun à la SdB *(à vérifier)* | « 1 WC séparé » |
| n\_cellier | 0 | — | — |
| emplacement\_caisson | combles | maison de plain-pied : combles ; étage habitable sous rampant : placard/faux plafond (kit extra-plat) | « Caisson en combles » |
| reseau | gaine souple isolée | double flux : semi-rigide Ø90 | « Gaine souple isolée, 1 filet de 6 m par bouche » |
| rejet | sortie de toit Ø160 | « façade » écrit : grille façade Ø160 | « Sortie de toit Ø160 » |
| couverture\_sortie | lue depuis le département (ardoise / tuile) | Bretagne, Pays de la Loire, Anjou : ardoise ; ailleurs : tuile | « Sortie de toit ardoise » |
| entrees\_air\_fournies\_menuisier | non en rénovation ; **question** en neuf | — | « Entrées d'air incluses » |
| alimentation\_elec | non incluse | « fourniture et pose y compris électricité » : 1 disjoncteur 2 A + câble *(à vérifier)* | « Électricité non comprise » |
| littoral | lu du département | oui : sortie de toit alu/inox et colliers inox | « Bord de mer : visserie inox » |

```json
{
  "type_vmc": {
    "valeur": "hygro_b",
    "variations": [
      { "si": { "devis.mot": "autoréglable" }, "valeur": "auto" },
      { "si": { "devis.mot": "double flux" }, "valeur": "df" }
    ],
    "afficher": "VMC {valeur}"
  },
  "longueur_filet_m": {
    "valeur": 6,
    "variations": [ { "si": { "artisan.negoce_filet_m": 3 }, "valeur": 3 } ],
    "afficher": "Gaine en filets de {valeur} m"
  },
  "couverture_sortie": {
    "valeur": "tuile",
    "variations": [ { "si": { "geographie.materiaux_dominants": "ardoise_naturelle" }, "valeur": "ardoise" } ],
    "afficher": "Sortie de toit {valeur}"
  }
}
```

Règle d'affichage : au plus 5 hypothèses visibles, les autres repliées sous « voir toutes les hypothèses ». Chaque hypothèse dit d'où elle vient (devis, profil, valeur par défaut).

## 7. Questions à poser (boutons, sensibilité)

Quatre questions suffisent dans 9 cas sur 10, jamais sur une quantité. Le moteur ne pose une question que si le devis ne donne pas la réponse et si la sensibilité dépasse 5 %, par sensibilité décroissante. Deux questions conditionnelles existent pour les cas rares ; elles ne comptent que si elles se déclenchent.

| Prio | id | Texte (bouton) | Boutons | Défaut | Sensibilité | Quand |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | type\_vmc | « Quelle VMC ? » | Autoréglable · Hygro A · Hygro B · Double flux | hygro B | 100 % (change caisson, bouches, entrées d'air) | type absent du devis |
| 1 | pieces\_eau | « Combien de pièces d'eau ? » | 1 SdB + 1 WC · 1 SdB + 2 WC · 2 SdB + 1 WC · 2 SdB + 2 WC · Autre | 1 SdB + 1 WC | 25 à 40 % (1 bouche, 1 filet, 1 piquage, parfois le kit) | nombre de bouches absent |
| 2 | pieces\_principales | « Taille du logement ? » | T2 · T3 · T4 · T5 · T6+ | T4 | 10 à 30 % (entrées d'air) | T/F absent |
| 3 | entrees\_air | « Les entrées d'air sont fournies avec les fenêtres ? » | Oui · Non | non en réno, oui en neuf | 15 à 25 % | neuf, ou devis muet |
| 4 | rejet | « Sortie de l'air ? » | Par le toit · Par le mur · Sortie existante | toit | 8 à 12 % | devis muet |
| — | couverture | « Toit en ? » | Ardoise · Tuile · Autre | lu du département | 0 % sur les quantités, change la référence | seulement si département mixte |

```json
[
  {
    "id": "pieces_eau",
    "ouvrages": ["vmc_*"],
    "priorite": 1,
    "si_inconnu": "n_bouches_sanitaires",
    "texte": "Combien de pièces d'eau ?",
    "boutons": [
      { "label": "1 SdB + 1 WC", "valeur": { "n_sdb": 1, "n_wc": 1 } },
      { "label": "1 SdB + 2 WC", "valeur": { "n_sdb": 1, "n_wc": 2 } },
      { "label": "2 SdB + 1 WC", "valeur": { "n_sdb": 2, "n_wc": 1 } },
      { "label": "2 SdB + 2 WC", "valeur": { "n_sdb": 2, "n_wc": 2 } },
      { "label": "Autre", "valeur": null }
    ],
    "defaut": { "n_sdb": 1, "n_wc": 1 },
    "sensibilite_pct": 30
  }
]
```

Sensibilités estimées sur un kit hygro B T4 standard (≈ 12 lignes) : une pièce d'eau de plus ajoute 1 bouche, 1 filet Ø80 et souvent 1 piquage, soit 3 lignes sur 12 *(à valider sur cas réels, chapitre 10)*. Le bouton « Autre » ouvre un champ texte court, jamais un champ numérique de quantité.

## 8. Matériaux dominants par région

La VMC est quasi nationale : mêmes kits, mêmes bouches partout. La région ne change que **trois lignes** : la couleur/le modèle de la sortie de toit (suit la couverture, déjà dans `commun/departements.json`), la part de double flux (zone climatique) et la visserie en bord de mer.

| Zone | Départements (exemples) | Sortie de toit par défaut | Part double flux | Particularité |
| --- | --- | --- | --- | --- |
| Ouest ardoise | Bretagne, Pays de la Loire, Anjou, Normandie ouest | ardoise (gris) | faible *(à vérifier)* | littoral fréquent : inox |
| Nord, Est (H1) | Hauts-de-France, Grand Est, Bourgogne-FC | tuile (rouge/brun) | plus forte en neuf *(à vérifier)* | caisson en comble froid : gaine isolée stricte |
| Montagne (> 900 m) | Alpes, Pyrénées, Massif central | ardoise ou bac acier selon zone | plus forte | sortie de toit renforcée neige *(à vérifier fabricant)* |
| Sud (H3) | Occitanie, PACA, Nouvelle-Aquitaine sud | tuile canal (rouge) | faible | sortie compatible tuile canal galbée (embase large, ex. Aldes STR 600 × 500) |
| Île-de-France, Centre | — | tuile mécanique ou ardoise | moyenne | beaucoup de logements collectifs : périmètre MVP = individuel |
| DOM | — | hors périmètre (ventilation naturelle traversante) | — | l'app le dit |

Règle moteur : `couverture_sortie` reprend `materiaux_dominants` du département (déjà utilisé par le tiroir couverture). Si le département est mixte, la question « Toit en ? » se pose (chapitre 7). Les parts de double flux ne servent qu'à ordonner les boutons de la question 0, jamais à choisir à la place de l'artisan.

## 9. Points singuliers et consommables

Ce sont les lignes que l'artisan oublie et qui l'obligent à retourner au négoce. Chacune est déclenchée par une condition simple.

| Déclencheur | Article | Quantité | Unité | Source / statut |
| --- | --- | --- | --- | --- |
| Toujours (simple flux) | Sortie de toit Ø160 (ou grille façade Ø160) | 1 | u | DTU 68.3 via [Aldes](https://www.aldes.fr/reglementations/ventilation-et-qualite-d-air-interieur/nf-dtu-68.3) |
| Toujours | Gaine isolée Ø160 pour le rejet | 1 filet | filet | idem |
| Kit Atlantic Hygrocosy et sanitaires > 2 | Piquage Twist & Go Ø80 | n\_sanitaires − 2 | u | [econology](https://www.econology.fr/kit-hygrocosy-kit-vmc-simple-flux-hygroreglable-avec-bouches-atlantic-412292.html) |
| Bouches à piles | Piles LR6 | 2 par bouche | u (blister) | [maxoutil](https://www.maxoutil.com/kit-hygrocosy-vmc-hygroreglable-6-sanitaires-3-bouches-atlantic-412292.html) |
| Bouche cuisine à piles Atlantic | Bouton poussoir de commande | 1 | u | réf. 420931, [domomat](https://www.domomat.com/30409-kit-vmc-hygrocosy-simple-flux-hygroreglable-231mh-22db-avec-3-bouches-a-piles-atlantic-412292.html) |
| Bouche supplémentaire hors kit | Bouche (même gamme) + manchette | 1 par pièce | u | — |
| 2e salle de bains en F6+ (Atlantic) | Bouche BHB 15/45 pour SdB 2 | 1 | u | [Atlantic PDF](https://www.domomat.com/hygrocosy-flex-atlantic-domomat.pdf) |
| Toute gaine souple | Colliers de serrage | 2 par gaine + 2 | u | *(conditionnement à vérifier)* |
| Toute installation | Adhésif aluminium | 1 | rouleau | *(à vérifier)* |
| Réseau semi-rigide | Joints, clips, raccords caisson, manchettes | 1 joint + 1 clip par extrémité ; 1 raccord par piquage de caisson | u | Atlantic : joints XJ et clips XCF à prévoir ([electrissime](https://www.electrissime.fr/conduit-semi-rigide-circulaire-o-90-25m-464032-a33243.html)) |
| Entrées d'air en rénovation | Mortaisage menuiserie | 0 matériel (main d'œuvre) | — | à signaler, pas à commander |
| Entrée d'air en mur (pas de menuiserie adaptée) | Kit traversée de mur EM Ø125 | 1 par entrée | kit | [econology](https://www.econology.fr/le-blog/guide-choisir-entrees-air-logement) |
| Remplacement caisson | Dépose ancien caisson, évacuation | 0 matériel | — | à signaler |
| Remplacement sur réseau existant | Réductions / adaptateurs Ø125/80 | selon caisson | u | Atlantic Flex fournit 4 adaptateurs 125/80 |
| Littoral | Colliers inox, sortie alu/inox | remplace les standards | u | *(à vérifier)* |
| Caisson hors combles (placard) | Kit extra-plat + trappe de visite | 1 | u | *(à vérifier)* |
| Électricité incluse au devis | Disjoncteur dédié 2 A, câble 3G1,5 | 1 + longueur | u, couronne | arrêt du caisson par disjoncteur seul ([PagesJaunes / DTU 68.3](https://vmc.pagesjaunes.fr/astuce/voir/436681/dtu-68-3)) *(calibre à vérifier NF C 15-100)* |
| Double flux | Siphon / évacuation condensats | 1 | u | *(à vérifier fabricant)* |
| Double flux | Filtres de rechange | 1 jeu | u | *(optionnel)* |

Consigne d'implantation à rappeler dans le quantitatif (pas une ligne de commande) : axe de bouche à 20 cm minimum de l'angle de la paroi ; rejet à 40 cm de toute baie ouvrante et 60 cm de toute entrée d'air ; rejet interdit en combles, garage ou vide sanitaire ([Aldes](https://www.aldes.fr/reglementations/ventilation-et-qualite-d-air-interieur/nf-dtu-68.3)).

## 10. Cas de test (format JSON)

Trois cas **synthétiques** calculés avec les règles du chapitre 5, pour faire tourner le moteur dès maintenant. Ils devront être remplacés par 10 devis réels d'un installateur VMC (critère bêta du gabarit : chaque ligne dans la tolérance, zéro question sur une quantité).

```json
[
  {
    "id": "vmc-001",
    "source": "synthétique, à remplacer par un devis réel",
    "devis_texte": "Fourniture et pose VMC hygro B Atlantic Hygrocosy, maison T4, 1 SdB, 1 WC, rénovation, combles perdus",
    "contexte": { "departement": "22", "littoral": true, "neuf_renovation": "renovation", "pieces_principales": 4 },
    "attendu": [
      { "article": "kit Atlantic Hygrocosy 412292 (groupe + 3 bouches)", "quantite": 1, "unite": "kit", "tolerance_pct": 0 },
      { "article": "entrée d'air hygroréglable + auvent, séjour", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
      { "article": "entrée d'air hygroréglable + auvent, chambres", "quantite": 3, "unite": "u", "tolerance_pct": 0 },
      { "article": "gaine souple isolée Ø125 6 m", "quantite": 1, "unite": "filet", "tolerance_pct": 0 },
      { "article": "gaine souple isolée Ø80 6 m", "quantite": 2, "unite": "filet", "tolerance_pct": 0 },
      { "article": "gaine souple isolée Ø160 6 m", "quantite": 1, "unite": "filet", "tolerance_pct": 0 },
      { "article": "sortie de toit Ø160 ardoise", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
      { "article": "bouton poussoir bouche cuisine 420931", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
      { "article": "piles LR6", "quantite": 6, "unite": "u", "tolerance_pct": 0 },
      { "article": "collier de serrage inox", "quantite": 10, "unite": "u", "tolerance_pct": 20 },
      { "article": "adhésif aluminium", "quantite": 1, "unite": "rouleau", "tolerance_pct": 0 }
    ],
    "questions_max": 1
  },
  {
    "id": "vmc-002",
    "source": "synthétique",
    "devis_texte": "VMC hygroréglable Aldes EasyHOME Combles, T5, 2 salles de bains, 2 WC, neuf, fenêtres avec entrées d'air",
    "contexte": { "departement": "35", "neuf_renovation": "neuf", "pieces_principales": 5 },
    "attendu": [
      { "article": "kit Aldes EasyHOME Hygro Combles Premium MW 11033042", "quantite": 1, "unite": "kit", "tolerance_pct": 0 },
      { "article": "bouche bain hygro Ø80 + manchette", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
      { "article": "bouche WC hygro Ø80 + manchette", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
      { "article": "Algaine isolée Ø80 6 m", "quantite": 2, "unite": "filet", "tolerance_pct": 0 },
      { "article": "sortie de toit STR ardoise Ø160 11022093", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
      { "article": "collier de serrage", "quantite": 4, "unite": "u", "tolerance_pct": 50 }
    ],
    "commentaire": "le kit 11033042 contient déjà 3 bouches, 4 entrées d'air (non utilisées : menuisier) et 4 filets (2 Ø80, 1 Ø125, 1 Ø160) ; on ne complète que 2 bouches et 2 filets Ø80",
    "questions_max": 0
  },
  {
    "id": "vmc-003",
    "source": "synthétique",
    "devis_texte": "Remplacement moteur VMC autoréglable, réseau existant conservé, 3 bouches",
    "contexte": { "departement": "56", "neuf_renovation": "renovation" },
    "attendu": [
      { "article": "groupe VMC autoréglable 3 sanitaires (seul, sans bouches)", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
      { "article": "collier de serrage", "quantite": 8, "unite": "u", "tolerance_pct": 50 },
      { "article": "adhésif aluminium", "quantite": 1, "unite": "rouleau", "tolerance_pct": 0 }
    ],
    "questions_max": 1
  }
]
```

Cas à obtenir en priorité : un T3 autoréglable en rénovation, un T4 hygro B neuf avec entrées d'air menuisier, un T5 à 2 salles de bains, un double flux T4 en semi-rigide, un remplacement caisson seul.

## 11. Ratios à faire valider par un artisan

À faire relire par un installateur VMC (plombier-chauffagiste ou électricien qui pose des VMC). Chaque ligne validée sort de `ratios-a-valider.md` et passe en dur dans `regles.json`.

- [ ] 1 filet de gaine de 6 m par bouche, sans raboutage, est-ce la pratique ? Les négoces vendent-ils aussi des filets de 3 m pour le rejet ?
- [ ] Colliers : 2 par gaine + 2 de réserve, ou l'artisan utilise-t-il seulement l'adhésif alu ?
- [ ] Adhésif alu : 1 rouleau par chantier suffit-il ?
- [ ] Hygro B : combien d'entrées d'air au séjour (1 ou 2) selon la gamme Atlantic et Aldes ?
- [ ] Kit Atlantic 412292 : 3 bouches à piles ou 2 seulement ? (sources contradictoires) ; bouton poussoir 420931 systématique ?
- [ ] T1/T2 : bouche commune SdB + WC fréquente ?
- [ ] Double flux : 1 conduit Ø90 par 30 m³/h, 2 bouches au séjour au-delà de 30 m², 10 % de chutes sur couronne ?
- [ ] Électricité : l'installateur VMC fournit-il le disjoncteur et le câble, ou l'électricien ?
- [ ] Rénovation : part des chantiers où la sortie de toit existante est réutilisée ?
- [ ] Liste des 5 kits les plus commandés en Bretagne (marque, référence), pour mettre en premier dans `materiaux.json`.

## 12. Sources officielles

Pages ouvertes le 3 oct. 2026.

| Source | Ce qu'elle apporte |
| --- | --- |
| [Arrêté du 24 mars 1982 (Légifrance)](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000862344/) | débits extraits par pièce, art. 3 |
| [Arrêté du 24 mars 1982, art. 4 (Légifrance)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006830558/2026-08-11) | débits réduits et modulés |
| [Aldes, arrêté du 24 mars 82](https://www.aldes.fr/reglementations/ventilation-et-qualite-d-air-interieur/arrete-du-24-mars-82) | tableaux commentés |
| [Aldes, NF DTU 68.3](https://www.aldes.fr/reglementations/ventilation-et-qualite-d-air-interieur/nf-dtu-68.3) | rejet, isolation R 0,6, bouches à 20 cm, souple 3 m |
| [Xpair, DTU 68.3](https://conseils.xpair.com/actualite_experts/dtu-683-ventilation.htm) | rejet 25 Pa / 2 m de gaine |
| [Progineer, NF DTU 68.3](https://progineer.fr/workspace/regulation/dtu-68-3/) | 6 m et 3 coudes par piquage, isolation double flux |
| [France VMC, DTU 68.3](https://www.france-vmc.fr/installation-vmc-dtu-68-3/) | hygro relève des Avis Techniques (CPT 3615) |
| [Aldes storeonline, kits EasyHOME](https://storeonline.aldes.fr/ventilation-vmc/1267-kit-vmc-easyhome-hygro-premium-hp-plus-11033421.html) | contenu des kits, Algaine 6 m |
| [Aldes, guide entrées d'air](https://www.prospair.com/contents/fr/aldes_entree_air.pdf) | mortaise 2 × 172 × 12, modules |
| [Aldes, catalogue entrées d'air](https://www.domomat.com/entree-air-et-grille-aeration-aldes-domomat.pdf) | équivalences de modules |
| [Atlantic Hygrocosy Flex (PDF)](https://www.domomat.com/hygrocosy-flex-atlantic-domomat.pdf) | composition kit, schéma réseau |
| [Aldes Optiflex](https://storeonline.aldes.fr/accueil/674-conduit-antistatique-optiflex--11095922.html) | couronne 50 m Ø90 |
| [Aldes sortie de toit STR](https://storeonline.aldes.fr/ventilation-vmc/1293-sortie-de-toit-str-tuile-d160-11022093.html) | Ø160, embase 600 × 500 |

À obtenir (payant ou sur demande) : texte NF DTU 68.3 P1-1-1 à P1-1-4 (AFNOR, 2017), CPT 3615 et Avis Techniques hygro (CSTB), catalogues négoce Rexel / Sonepar / CEDEO pour les conditionnements.

## 13. Plan de complétion

| # | Manque | Source | Qui | Critère de fin |
| --- | --- | --- | --- | --- |
| 1 | 10 cas de test réels | devis + bons de commande d'un installateur | Greg (trouver l'artisan) | tests/ complet, tous verts |
| 2 | 10 ratios du chapitre 11 | relecture installateur | artisan VMC | ratios-a-valider.md vide |
| 3 | Fiches autoréglables (Atlantic Autocosy, Aldes EasyHOME Auto) et entrées d'air hygro par kit | sites Aldes, Atlantic | Claude (recherche web) | materiaux.json complet |
| 4 | Conditionnements colliers, adhésif, gaines 3 m | catalogues Rexel, CEDEO, Point.P | Claude + artisan | chaque article a un conditionnement |
| 5 | Texte DTU 68.3 (colonne WC multiples, rejet, isolation) | AFNOR ou manuel de formation | Greg fournit, Claude transcrit | zéro *(à vérifier)* dans regles.json |
| 6 | Double flux semi-rigide (débit par conduit, caissons) | Aldes, Atlantic, Zehnder | Claude | cas test double flux vert |
| 7 | Vocabulaire enrichi | 50 premiers devis bêta | automatique + validation | zéro mot inconnu |

Ordre : 1 puis 2 (sans cas réels, rien n'est validable), puis 3-4. Maturité : `alpha` tant que 1 et 2 ne sont pas faits.

## 14. CHANGELOG

| Date | Version | Changement |
| --- | --- | --- |
| 3 oct. 2026 | 1.0.0 | Création du tiroir ventilation au format section 27 : 14 chapitres, 7 ouvrages, débits arrêté 1982, règles DTU 68.3, kits Aldes et Atlantic sourcés, 3 cas synthétiques, 10 ratios à valider. |
