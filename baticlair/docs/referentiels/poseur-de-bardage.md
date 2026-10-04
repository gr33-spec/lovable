# Référentiel quantitatif POSEUR DE BARDAGE (Rappidos)

Oct 3, 2026 · @Greg

## 1. Métier et axes de variation

Le poseur de bardage habille une façade d'un parement rapporté sur ossature, avec lame d'air ventilée et souvent isolant derrière (ITE sous bardage). Le levier n°1 du quantitatif est **le produit choisi** (lame bois, clin fibres-ciment, panneau HPL, tôle acier) : il change l'unité de commande, l'ossature et les fixations. Ce tiroir couvre le bardage bois (NF DTU 41.2), les clins et panneaux fibres-ciment, HPL, PVC et composite (Avis Techniques / DTA fabricant), et le bardage métallique (NF DTU 40.35 + Recommandations RAGE 2014). Le bardage ardoise reste dans le tiroir couverture (section 17 du référentiel couverture).

Périmètre d'un chantier type : dépose éventuelle, pare-pluie, ossature (tasseaux, chevrons, équerres ou rails alu), isolant éventuel, parement, profils (départ, angles, jonctions, encadrements de baies, arrêt haut), grille anti-rongeurs, fixations, retouche des coupes.

### 1.1 Axes de variation

| Axe | Poids | Ce qu'il change dans le quantitatif |
| --- | --- | --- |
| gamme (produit choisi) | fort | lame / clin / panneau / tôle : unité de commande, rendement au m², ossature, nombre de fixations au m² (de 2,5 à 40) |
| neuf\_renovation | moyen | dépose de l'ancien bardage (benne, big-bag), ITE ajoutée en réno, rattrapage de planéité (équerres réglables au lieu de tasseaux directs) |
| geographie | moyen | zone de vent et rugosité : entraxe ossature réduit et pointes plus longues ; littoral : inox A4 au lieu de A2 ; essence de bois régionale |
| type\_batiment | moyen | maison ≤ 10 m vs immeuble 10 à 28 m (ancrage des pointes 25 → 35 mm, classement au feu, écran pare-flamme, ossature métallique) ; bâtiment agricole ou industriel → bardage acier sur lisses |
| epoque\_bati | faible | nature du mur support : béton ou parpaing (chevilles), brique creuse (chevilles spéciales), ossature bois (vis bois), pierre (calage) |

Le sens de pose (horizontal / vertical) et le mode (jointif / claire-voie) ne sont pas des axes : ce sont des réponses du devis ou des questions (section 7), car ils doublent ou non l'ossature.

### 1.2 Fiche `metier.json`

```json
{
  "code": "bardage",
  "nom": "Pose de bardage - façade ventilée",
  "version": "0.1.0",
  "normes": ["NF DTU 41.2 (P65-210)", "NF DTU 40.35", "NF DTU 31.2", "Recommandations RAGE bardages acier 2014", "CPT 3316 / 3194 bardages rapportés"],
  "axes_de_variation": {
    "geographie": "moyen",
    "epoque_bati": "faible",
    "type_batiment": "moyen",
    "neuf_renovation": "moyen",
    "gamme": "fort"
  },
  "metiers_lies": ["isolation", "couverture", "menuiserie", "charpente"],
  "unites_de_commande": ["lame", "botte", "palette", "panneau", "plaque", "rouleau", "barre", "boite", "kit", "ml", "u"],
  "maturite": "alpha"
}
```

## 2. Règle d'or et unités de commande

**Règle d'or : le devis parle en m² de façade, le négoce livre des lames, des panneaux, des barres et des rouleaux.** Le m² n'apparaît jamais comme unité de commande, sauf en info secondaire entre parenthèses (ex. « 112 lames 4 m (≈ 52 m² utiles) »). Chaque ligne porte la longueur de l'élément, car une lame de 4 m et une lame de 3 m ne sont pas le même article.

Piège propre au métier : le bois est vendu au m² calculé tantôt sur la **largeur utile**, tantôt sur la **largeur totale** (languette comprise). Le moteur calcule toujours sur la largeur utile, puis convertit en lames ; il n'utilise jamais le « m² de la botte » du négoce.

| Matériau | Unité de commande | Conditionnement négoce courant | Info secondaire |
| --- | --- | --- | --- |
| Lame bois (douglas, mélèze, pin, red cedar, thermo) | lame de longueur L | botte de 4 à 6 lames, ou à l'unité | ml, m² utiles |
| Clin fibres-ciment (Cedral Lap, Click) | lame 3,60 m | palette 144 lames, vente à la lame | m² |
| Panneau HPL, fibres-ciment grand format | panneau (format exact) | à l'unité, souvent sur calepinage | m² |
| Lame PVC / composite | lame de longueur L | carton ou à la lame | m² |
| Tôle acier nervurée | plaque à la longueur (coupe sur mesure) | à la plaque, largeur utile 1 m | m² |
| Tasseau, chevron | barre de longueur L | botte | ml |
| Rail / profilé alu d'ossature | barre 3 m ou 6 m | à la barre | ml |
| Équerre / patte de fixation | u | boîte (50 ou 100) | — |
| Pare-pluie | rouleau 1,50 × 50 m | rouleau (75 m²) | m² |
| Profils de finition (départ, angle, jonction, arrêt) | barre 2,50 / 3 / 3,60 m | à la barre | ml |
| Grille anti-rongeurs | barre 2,50 m | à la barre, paquet de 20 | ml |
| Pointes, vis, rivets, clips | boîte ou kit | boîte 250 / 500 / 1000, kit fabricant | u |
| Chevilles de fixation ossature | boîte | 50 ou 100 | u |
| Isolant ITE (si vendu) | paquet ou panneau | paquet de n panneaux | m² |
| Peinture de retouche des coupes | pot | pot 0,5 / 1 L | — |

## 3. Ouvrages du métier, vocabulaire des devis et pièges

Huit ouvrages couvrent l'essentiel des devis. Chaque ligne de devis est rattachée à un ouvrage par `vocabulaire.json` ; une ligne non reconnue déclenche la question « C'est quoi, \[expression\] ? ».

| Ouvrage (id) | Ce que l'artisan réalise | Expressions de devis (→ vocabulaire.json) | Exclusions |
| --- | --- | --- | --- |
| bardage\_bois\_jointif | lames bois rainure-languette, à clin ou à recouvrement, horizontales ou verticales | bardage bois, clin bois, lames douglas, mélèze, red cedar, pin autoclave, thermo-pin, élégie, faux claire-voie, Saint-Louis, profil Castille | claire-voie, ajouré |
| bardage\_bois\_claire\_voie | lames ajourées (joint ouvert), presque toujours verticales | claire-voie, ajouré, tasseaux décoratifs, lames trapèze, joint ouvert | faux claire-voie |
| bardage\_fibres\_ciment\_clin | clins fibres-ciment à recouvrement ou à emboîtement | Cedral, Cedral Lap, Cedral Click, Eternit, fibres-ciment, fibrociment, clin ciment, HardiePlank | amiante, dépose fibro (→ désamiantage) |
| bardage\_panneau | panneaux grand format rivés, vissés ou collés | HPL, stratifié compact, Trespa, Fundermax, Equitone, Swisspearl, panneau composite, Alucobond, cassette alu | — |
| bardage\_pvc\_composite | lames PVC cellulaire ou bois-polymère | PVC cellulaire, clin PVC, Durasid, Deceuninck, Twinson, composite, Silvadec | lambris PVC sous-face (→ habillage\_sous\_face) |
| bardage\_metallique | tôle nervurée simple peau ou double peau sur plateaux | bac acier façade, bardage acier, tôle nervurée, simple peau, double peau, plateaux, cassettes, bardage hangar | couverture bac acier (→ tiroir couverture) |
| ite\_sous\_bardage | isolant entre montants ou équerres derrière le bardage | ITE, isolation extérieure sous bardage, laine de bois, laine de roche façade, double réseau, équerres | ITE sous enduit (→ tiroir isolation / façadier) |
| depose\_bardage | dépose et évacuation de l'existant | dépose bardage, démontage clins, évacuation | dépose amiante |

Ouvrages annexes, chiffrés à part dans les devis : habillage\_sous\_face (débord de toit, voir aussi couverture section 17), encadrement\_baie (tableaux, linteaux, bavettes), couvertine\_acrotere.

### 3.1 Pièges de lecture des devis

1. **Surface brute ou nette.** Les devis donnent souvent la surface de façade baies comprises. Si le devis liste aussi les menuiseries ou les « tableaux », déduire les baies > 1 m² ; sinon prendre la surface telle quelle et l'afficher en hypothèse (« baies non déduites »), car les chutes autour des baies compensent en partie.
2. **Pignon.** Une surface « pignon » est un triangle ou un trapèze : perte de coupe plus forte (+5 points).
3. **« Fourni-posé m² » sans produit.** Si le devis n'indique ni essence ni marque, c'est la question n°1 (section 7) : sans produit, aucune quantité n'est possible.
4. **Largeur utile vs totale.** « Lame 21×145 » peut être la largeur totale (utile 130) : toujours lire la largeur utile dans `materiaux.json`, jamais dans le devis.
5. **Vertical = double réseau.** Une lame verticale impose un réseau de tasseaux horizontaux sur un réseau vertical (DTU 41.2) : l'ossature double. Un devis qui dit « lames verticales » sans « double tasseautage » l'a souvent oublié ; le quantitatif l'ajoute et le signale.
6. **Claire-voie = pare-pluie spécial.** Derrière une claire-voie, un pare-pluie standard ne tient pas aux UV : il faut un pare-pluie façade noir résistant aux UV (type Delta-Fassade), et vérifier la largeur des joints (≤ 20 mm ou ≤ 50 mm selon le produit).
7. **ITE.** « Bardage sur ITE 120 mm » implique une ossature déportée (équerres + montants, ou double réseau croisé) : l'ossature n'est plus un simple tasseau 27×40.
8. **Fibro ancien.** « Dépose bardage fibrociment » sur bâti d'avant 1997 = suspicion d'amiante : l'app ne quantifie pas, elle signale (renvoi tiroir couverture section 18).
9. **Hauteur.** « R+3 », « immeuble » ou hauteur > 10 m changent les fixations (ancrage 35 mm) et souvent le classement feu : ne pas appliquer les défauts maison individuelle.

## 4. Matériaux : fiches fabricant sourcées

Les valeurs ci-dessous sont transcrites des fiches fabricant et négoce ouvertes le 3 oct. 2026 ; tout ce qui n'est pas sourcé porte *à vérifier*. Règle héritée du tiroir couverture : le conditionnement de `materiaux.json` vient d'une fiche **négoce**, car c'est le négoce qui livre.

### 4.1 Lames et clins (parement)

| Produit | Dimensions (mm) | Largeur utile | Rendement | Conditionnement | Poids | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Douglas élégie / rainure-languette 21×130 | 21 × 130 × 3000 (aussi 2450, 4000) | ≈ 120 *(à vérifier par profil)* | 1 / (L × 0,120) lames/m² | botte de 4 lames (3 m = 1,56 m² calculé sur 130 mm) | ≈ 11 kg/m² *(à vérifier)* | [Clicobois](https://clicobois.com/article/287), [MS Bois](https://www.entrepot-du-bricolage.fr/p/pr-lame-bardage-douglas-21-x-130-x-2450-mm-ms-bois-285235) |
| Douglas faux claire-voie 22×120 utile | 22 × 135 × 4000 | 120 | 2,08 lames de 4 m/m² | à l'unité | — | [Central Bois](https://centralbois.fr/accueil/600-bardage-folin-faux-claire-voie-22x120mm-en-4m-douglas-rabote-choix-2.html) |
| Mélèze élégie 21×132 | 21 × 132 × 4000 | *à vérifier* | — | botte de 5 lames | — | [Evolution Bois](https://www.evolution-bois.com/bardage/bardage-douglas-22-mm-elegie.html) |
| Cedral Lap (clin à recouvrement) | 10 × 190 × 3600 | 160 (recouvrement 30) | **1,8 lame/m²**, 12,6 fixations/m² | palette 144 lames (1 612,8 kg), vente à la lame | 11,2 kg/lame | [Guide de pose Cedral Lap](https://www.mauris.fr/pieces-jointes/fiches-fournisseurs/2021/CEDRAL-Guide-de-pose-lap.pdf), [Distriartisan](https://www.distriartisan.fr/lames-bardage-facade-cedral-lap-palette-537606.html) |
| Cedral Click (emboîtement) | 12 × 186 × 3600 | 173 à 175 | **1,60 lame/m²** | palette 144 lames ; kit fixation 250 clips + 260 vis | 12,2 kg/lame | [Cedral](https://www.cedral.world/fr-fr/facade/lames-de-bardage/cedral-click-bardage-rainure-languette/), [Point.P](https://www.pointp.fr/p/platre-isolation-ite/bardage-clin-cedral-click-relief-fibre-ciment-ng-c01-blanc-everest-A6113166), [Quéguiner](https://www.queguiner.fr/bois-panneaux-mob-bardages/bardages/bardages-composites/bardage-cedral-click-12-x-173-x-3600-mm-2) |
| PVC cellulaire Deceuninck Solid Pure P2730 | h 200 × 4000 | 200 | 5 ml/m² = 1,25 lame/m² | à la lame | — | [Deceuninck](https://www.deceuninck.fr/fr-fr/produits/bardages/bardage-pvc-cellulaire) |
| PVC cellulaire clin 4 m | 166 utile × 4000 | 166 | 0,664 m²/lame → 1,51 lame/m² | à la lame | — | [Formatub](https://formatub-budget.com/veine-blanc/2080-lame-bardage-blanc-pvc-cellulaire-veine-longueur-5ml.html) |

### 4.2 Panneaux et tôles

| Produit | Formats (mm) | Épaisseurs | Ossature | Fixation | Source |
| --- | --- | --- | --- | --- | --- |
| Trespa Meteon (HPL) | 2550×1860, 3050×1530, 3650×1860 (+ 4270×2130) | 6, 8, 10, 13 | bois : chevrons ≤ 900 mm (645 sur COB) ; alu : montants ≤ 1 m | rivets alu Ø 5 (AP16 5×16) ou vis A2 5,5×32, entraxe ≤ 750 mm | [ATec 2.2/10-1396](https://www.cstb.fr/pdf/atec/GS02-C/AC2101396_V1.pdf), [Notice TS700](https://atelierdesfacadiers.com/wp-content/uploads/2020/11/NOTICE-TECHNIQUE-TRESPA-METEON-TS700_QB54_005-006_V2-3.pdf) |
| Tôle acier nervurée de bardage | largeur utile 1000, longueur 1 à 6 m (sur mesure) | 0,63 mini (0,75 courant) | lisses (portée ≤ 2 m en simple peau existant) ou plateaux ≤ 500 mm | vis autoperceuses ; couture Ø 4,8 mini, 1 par mètre | [Caddenz](https://www.caddenz.com/produits/bardage-nervure-acier), [Joris Ide MR071](https://assets-eu-01.kc-usercontent.com/baf0acaa-3f19-0136-7243-0d1613b12d33/717bf2db-a92f-4999-af03-5ccffc64bc58/JRI_MR071_profils_et_plateaux_de_bardage_FR.pdf) |

Equitone, Fundermax, Swisspearl, cassettes alu : formats à saisir (section 13).

### 4.3 Ossature, pare-pluie, accessoires

| Produit | Données | Conditionnement | Source |
| --- | --- | --- | --- |
| Tasseau 27×40 (ou 27×45) classe 2 mini, classe 3 recommandée | entraxe ≤ 65 cm ; 22×40 admis si entraxe ≤ 40 cm | barre 2,4 / 3 / 4 m, botte *(à vérifier)* | [Batiactu DTU 41.2](https://produits.batiactu.com/publi/le-dtu-41.2-explique-pour-vos-travaux-de-batiment--452-194961.php), [notice E-wood](https://www.e-wood.fr/wp-content/uploads/2026/02/notice_bardage_bois.pdf) |
| Tasseaux en claire-voie | largeur ≥ 60 mm, épaisseur ≥ 1,5 × épaisseur de la lame, même classe que la lame | idem | [notice E-wood](https://www.e-wood.fr/wp-content/uploads/2026/02/notice_bardage_bois.pdf) |
| Chevron Cedral | entraxe 600 mm, toujours vertical, 3 appuis mini par clin ; équerres à 1 350 mm maxi | — | [Guide Cedral Lap](https://www.mauris.fr/pieces-jointes/fiches-fournisseurs/2021/CEDRAL-Guide-de-pose-lap.pdf) |
| Pare-pluie façade Delta-Fassade 20 (claire-voie joints ≤ 20 mm / 20 %) | HPV, Sd 0,02 m, UV 5 000 h | rouleau 1,50 × 50 m = 75 m², ≈ 16 kg, 32 rouleaux/palette | [Fiche Doerken](https://www.doerken.com/be/fr/content/preview/23400/file/BE_Fiche-technique_DELTA-FASSADE-20-PLUS.pdf), [Quéguiner](https://www.queguiner.fr/bois-panneaux-mob-bardages/bardages/ecrans-et-accessoires-bardage/pare-pluie-deltar-fassade-20-plus) |
| Pare-pluie Delta-Fassade 50 (joints ≤ 50 mm / 50 %) | idem | rouleau 1,50 × 50 m, 28 rouleaux/palette | [Fiche Doerken](<https://www.doerken.com/ch/fr/content/preview/43575/file/Fiche%20technique%20DELTA-FASSADE%2050%20(PLUS).pdf>) |
| Pare-pluie standard (bardage jointif) | HPV | rouleau 1,50 × 50 m *(à vérifier par marque)* | — |
| Grille anti-rongeurs alu 30×50 | perforée, en L | barre 2,50 m, paquet de 20 (Tecnomur) | [Mr.Bricolage](https://www.mr-bricolage.fr/grille-anti-rongeur-25m.html), [Chausson](https://www.chausson.fr/materiaux/grille-anti-rongeurs-bardage-mep-300x500mm-longueur-2500mm-p-735519-1) |
| Grille d'aération Cedral | alu 50×30×2500, 0,35 kg | à la barre | [Bretagne Matériaux](https://www.bretagne-materiaux.fr/p/platre-isolation/grille-d-aeration-perforee-aluminium-pour-bardage-cedral-l-2-50-m-50x30-mm-A3722659) |
| Profils Cedral (raccordement, angles) | alu laqué | barre 3 m | [Point.P](https://www.pointp.fr/p/platre-isolation-ite/bardage-clin-cedral-click-relief-fibre-ciment-ng-c01-blanc-everest-A6113166) |

### 4.4 Fixations

| Usage | Fixation | Densité sourcée | Source |
| --- | --- | --- | --- |
| Lame bois → tasseau | pointe annelée ou cranter inox A2 (A4 en bord de mer), Ø 2,5 mini, tête Ø 5 mini ; ancrage 25 mm (≤ 10 m), 30 à 35 mm selon vent/hauteur ; pointes lisses interdites | 40 cm : 21 (1 pointe) / 40 (2 pointes) par m² ; 65 cm : 13 / 25 par m² | [notice E-wood](https://www.e-wood.fr/wp-content/uploads/2026/02/notice_bardage_bois.pdf), [guide Metsä](https://l-idee-bois.com/wp-content/uploads/2020/06/Guide_de_Pose_Bardage.pdf) |
| Tasseau → mur bois | vis à bois 5×60 ou pointe annelée 4×60 inox ou galva à chaud | 1 tous les 50 à 60 cm *(à vérifier)* | [notice FP Bois](https://uploads.gedimat.fr/DOCUMENT/TYPE2/0000226863702.pdf) |
| Tasseau → maçonnerie | cheville + vis inox ou frappe *(à vérifier par support)* | 1 tous les 50 à 60 cm *(à vérifier)* | — |
| Cedral Lap | pointes annelées inox tête plate ou vis A2 autoforeuse | 12,6 /m² | [Guide Cedral Lap](https://www.mauris.fr/pieces-jointes/fiches-fournisseurs/2021/CEDRAL-Guide-de-pose-lap.pdf) |
| Cedral Click | clips + vis inox (kit fabricant) | kit 250 clips + 260 vis ; densité/m² *à vérifier* | [Point.P](https://www.pointp.fr/p/platre-isolation-ite/bardage-clin-cedral-click-relief-fibre-ciment-ng-c01-blanc-everest-A6113166) |
| Tôle acier | vis autoperceuse + couture Ø 4,8 | 2,5 fixations/m² mini ; sur lisses : 3 par ml de lisse en extrémité, 2 par ml sur appuis intermédiaires ; couture 1/m | [MR071](https://assets-eu-01.kc-usercontent.com/baf0acaa-3f19-0136-7243-0d1613b12d33/717bf2db-a92f-4999-af03-5ccffc64bc58/JRI_MR071_profils_et_plateaux_de_bardage_FR.pdf), [CCTP type](https://chpbtsmendes.wordpress.com/wp-content/uploads/2018/03/lot-4-8-bardage-mc3a9tallique.pdf) |

## 5. Règles de calcul DTU, formules et pertes

Toutes les règles partent de la surface de bardage S (m²) et de quelques longueurs (ml de pied, d'angles, de baies). Elles sont du code pur, sans IA. Arrondi final : toujours au conditionnement supérieur. Notation : e = entraxe ossature (m), lu = largeur utile (m), L = longueur de l'élément (m), p = perte.

### 5.1 Valeurs DTU 41.2 qui pilotent le calcul (bardage bois)

| Paramètre | Valeur | Source |
| --- | --- | --- |
| Lame d'air | ≥ 20 mm | DTU 41.2 via [Batiactu](https://produits.batiactu.com/publi/le-dtu-41.2-explique-pour-vos-travaux-de-batiment--452-194961.php) |
| Tasseau, entraxe ≤ 40 cm | 22 × 40 mini | idem |
| Tasseau, entraxe ≤ 65 cm | 27 × 40 mini | idem |
| Lame verticale | double tasseautage obligatoire, réseau horizontal ≤ 65 cm | [Le Moniteur](https://www.lemoniteur.fr/article/dtu-41-2-les-bardages-a-claire-voie-concernes.1374349), [E-wood](https://www.e-wood.fr/wp-content/uploads/2026/02/notice_bardage_bois.pdf) |
| Fixations par appui | 1 si largeur utile ≤ 125 mm, 2 au-delà | idem |
| Claire-voie | 1 pointe/appui et e ≤ 40 cm si largeur 40-60 mm ; 2 pointes et e ≤ 65 cm si ≥ 60 mm ; lame ≥ 21 mm | [E-wood](https://www.e-wood.fr/wp-content/uploads/2026/02/notice_bardage_bois.pdf) |
| Ventilation | entrée basse et sortie haute, 50 cm²/ml mini | idem |
| Garde au sol | 20 cm | idem |
| Pointes | annelées ou torsadées, lisses interdites ; ancrage 25 mm (H ≤ 10 m), jusqu'à 35 mm (H ≤ 28 m, zones 3-4) | idem |

### 5.2 Formules par ouvrage

```
# Commun
S = surface_devis - surface_baies_deduites          # baies > 1 m² seulement, si connues
barres(ml, L) = ceil(ml / L)
boites(n, contenance) = ceil(n / contenance)

# bardage_bois_jointif, horizontal
lames = ceil(S * (1 + p) / (L * lu))
ossature_ml = S * (1 / e) * 1.04                    # E-wood : 2,60 ml/m² à 40 cm, 1,60 à 65 cm
             + perimetre_baies_ml                    # renfort d'encadrement (à vérifier)
pointes = S * nb_par_appui / (lu * e) * 1.10         # 0,12/0,40 → 21/m² ; 0,12/0,65 → 13/m²
nb_par_appui = 1 if lu <= 0.125 else 2

# bardage_bois_jointif, vertical (double réseau)
lames = idem
ossature_ml = S * (1/0.60) * 1.04                    # réseau vertical côté mur
             + S * (1/e) * 1.04                      # réseau horizontal porteur des lames, e ≤ 0,65

# bardage_bois_claire_voie (vertical)
lames = ceil(S * (1 + p) / (L * (largeur_lame + jour)))
nb_par_appui = 1 if largeur_lame < 0.060 else 2
e = 0.40 if largeur_lame < 0.060 else min(e, 0.65)
tasseau_section = (max(1.5 * ep_lame, 27), 60)       # largeur ≥ 60 mm
pare_pluie = Delta-Fassade 20 si jour ≤ 20 mm, 50 si ≤ 50 mm, sinon bloquer

# bardage_fibres_ciment_clin
Cedral Lap   : lames = ceil(S * 1.8 * (1 + p_complexite)) ; fixations = S * 12.6 * 1.05
Cedral Click : lames = ceil(S * 1.60 * (1 + p)) ; kits = ceil(S * clips_m2 / 250)   # clips_m2 à vérifier
chevrons_ml = S * (1/0.60) * 1.04                    # entraxe Cedral 600 mm

# bardage_pvc_composite
lames = ceil(S * (1 + p) / (L * lu))                 # e = 0,40 (0,30 teintes foncées Durasid)

# bardage_panneau (HPL, fibres-ciment grand format)
panneaux = ceil(S * (1 + p_panneau) / (format_l * format_h))
montants_ml = S / entraxe_montants * 1.05            # ≤ 0,60 à 1,00 m selon ATec
rivets_ou_vis = S * fix_m2 * 1.05                    # fix_m2 à vérifier (≈ 8 à 12)

# bardage_metallique simple peau sur lisses
plaques = ceil(longueur_facade / 1.00) par hauteur, longueur = H + 0.07 si aboutage
lisses_rangs = ceil(H / portee_lisse) + 1 ; lisses_ml = rangs * longueur_facade * 1.05
vis = max(2.5 * S, 3 * ml_lisses_extremite + 2 * ml_lisses_intermediaires)
couture = ceil(H) * nb_recouvrements_lateraux

# Commun à tous les bardages ventilés
pare_pluie_rouleaux = ceil(S * 1.15 / 75)            # rouleau 1,50 × 50 m
grille_anti_rongeurs = barres(ml_pied + ml_appuis_baies, 2.5) * 1.05
profil_depart = barres(ml_pied, L_profil)            # fibres-ciment, PVC
angles = barres(h_angle * nb_angles, L_profil)
```

### 5.3 Pertes par défaut

| Cas | p | Statut |
| --- | --- | --- |
| Lames bois horizontales, façade rectangulaire | 10 % | *à vérifier* |
| Lames bois verticales ou claire-voie | 12 % | *à vérifier* |
| Pignon, nombreuses baies (> 1 baie / 8 m²) | + 5 points | *à vérifier* |
| Cedral Lap | inclus dans 1,8 lame/m² (théorique 1,74), + 5 % si complexe | fabricant |
| Cedral Click | 8 % (1,60 = théorique) | *à vérifier* |
| PVC / composite | 8 % | *à vérifier* |
| Panneaux grand format | 15 % hors calepinage, 5 % si calepinage fourni | *à vérifier* |
| Tôle acier | 0 % (coupe sur mesure), + 2 % pour les coupes en pignon | *à vérifier* |
| Ossature | 4 % (intégré au 1,04) | E-wood |
| Pointes, vis | 10 % | *à vérifier* |
| Pare-pluie | 15 % (recouvrements 10 cm) | *à vérifier* |
