# Référentiel couverture — CHANGELOG

## roofing-2026.11.20-62 — Tasseaux sourcés, chéneau encaissé, questions décidées par le code (Greg, 2026-11-20, devis D-2026-024)

- **Zinc à tasseaux, tasseaux et couvre-joints** : la quantité est chiffrée. Rangs = bacs − 1 + rives sur tasseau ; chaque rang fait la longueur du rampant. Sources recoupées : RHEINZINK « Tasseau, pose et pliage » (§1.6.4, §1.6.5, §1.15), VMZINC « Toiture Delta » (rive à tasseau : couvre-joint, tasseau de rive, patte, bande de rive), NedZink « Conseils de zinc » (rive : le premier et le dernier bac relevés contre un tasseau). Une rive a son tasseau, coiffé d'un couvre-joint ; contre un mur, le bac se relève (90 mm) sans tasseau. Le texte du NF DTU 40.41 est payant et protégé : il n'est ni lu ni recopié. Avant : « à chiffrer », sans quantité, en attendant Greg (« bacs + 1 »).
- **Nouvelle question, une fois, à boutons** : « Ton pan finit comment, de chaque côté ? » (`nb_rives_tasseau` : « Une rive de chaque côté » = 2, « Une rive et un mur » = 1, « Un mur de chaque côté » = 0). Lue au devis quand il le dit (« 2 côtés », « deux rives »). Exemple : 8 m de pan, rampant 4 m, entraxe 620 → 13 bacs ; 2 rives → 14 rangs = 56 ml de tasseaux et de couvre-joints ; 1 rive → 52 ml ; 0 → 48 ml.
- **Nouvel ouvrage « Chéneau encaissé zinc »** (`cheneau-encaisse`, §7, §36) : du bobineau au mètre, longueur du chéneau + marge de la zinguerie, largeur = développé (« Jusqu'à 50 cm », « 65 cm », « 1 m »). Seulement « chéneau encaissé », « chéneau zinc » : un chéneau en membrane n'est pas cet ouvrage. Avant : la ligne restait « à chiffrer » sans question.
- « anthracite » se lit comme l'aspect Anthra-Zinc ; « VMC », « évent », « chute d'eaux usées », « ventilation primaire » comme une sortie de ventilation. La longueur d'une bande porte-solin ne s'emprunte plus à une autre pièce (`ownOnly`).
- **§51.5 Règle changée** (tous métiers) : les questions sont décidées par le code, d'après la fiche du métier (ce que le négoce exige pour chaque ligne), jamais par la lecture. Une question du modèle n'est gardée que pour une donnée que la fiche ne connaît pas, ou pour un doute écrit au devis (deux valeurs que le devis écrit) ; sinon elle prend le texte et les boutons de la fiche. Toujours le même ordre, celui du calcul. Les lignes « fourniture et pose » sont rattachées à leur ouvrage par les mots de la fiche, dans le code. Avant : les questions et l'ouvrage venaient du modèle ; trois lectures du même devis donnaient trois listes.
- **Règle changée (le même devis, la même liste)** : la désignation de chaque ligne est reprise du texte du devis (« titre : description »), jamais des mots du modèle, qui la recopiait à sa façon (titre seul, « : », « — », « . ») : D-2026-024 rejoué cinq fois en ligne donnait quatre listes différentes. Une question du modèle sur une donnée de la fiche n'est plus posée (c'est le calcul qui décide), sauf un doute dont les deux valeurs sont écrites au devis ; une question qui demande une quantité (« longueur totale du porte-solin ? ») n'est jamais posée. « Je ne sais pas » laisse la question ouverte sur sa ligne.
- Le développé se demande pièce par pièce, au nom de la pièce (« Habillages de rive : développé… », « Faîtage en bande zinc : développé… »). Avant : une seule question « Développé de la bande zinc ? ».
- Effets sur les comptes rendus : DE00000071 passe de 5 à 7 questions (pose des crochets, Ø des descentes, que le calcul demande) ; Brest et les lots ne changent que l'ordre des questions ; au banc des 179 lectures, la qualité d'ardoise et la longueur des bacs, que la lecture oubliait parfois, sont demandées (la ligne attend sa réponse, orange).
- Les chantiers déjà calculés gardent leur version figée : rien n'y change.

## roofing-2026.11.20-61 — Plomb en rouleaux de 10 m et de 5 m ; teintes de l'ardoise fibres-ciment

| Quantité ou question | Ancienne valeur | Nouvelle valeur | Source |
|---|---|---|---|
| §12 Rouleau de plomb, bande jusqu'à 30 cm | 6 m (à confirmer) | 10 m (`rouleau_plomb`) | Le Plomb Français, D'Huart Industrie (fiches bandes de plomb, 20/11/2026) |
| §12 Rouleau de plomb, bande de plus de 30 cm | 6 m (à confirmer) | 5 m (`rouleau_plomb_large`, seuil `largeur_bande_plomb_max` 30 cm) | mêmes fabricants |
| Exemple : 5 ml de solin plomb, 30 cm | 1 rouleau de 6 m | 1 rouleau de 10 m | |
| Exemple : 12 ml de bande 50 cm | 3 rouleaux de 6 m | 3 rouleaux de 5 m | |
| Question teinte ardoise fibres-ciment | bleu-noir / noir / brun | anthracite (noir) / brun ; « bleu-noir » écrit au devis reste lu tel quel | Cedral (manuel de pose), Cembrit (documentation technique) |

Recherche : `recherche/abergements-souches.json`, `recherche/fibres-ciment.json`.

## roofing-2026.11.20-60 — Ardoise en situation exposée : recouvrement majoré en région III

- **§3 Recouvrement, situation exposée** (NF DTU 40.11 2020 §5.1.1.2 : + 10 mm ; Cupa et Rathscheck : + 10 %) : en région
  III exposée, la plus forte des deux, au mm supérieur (`ardoise.supplement_expose`, `ardoise.coef_expose`). 45° : 89 → 99 mm ;
  30° : 119 → 131 mm. Régions I et II exposées : rien (une seule source, à confirmer).
- La situation (`param:situation`, normale / exposée) est lue à la commune du chantier dans la carte des régions
  (littoral à 5 km, îles, rives d'estuaire près de l'embouchure) : une hypothèse dite et modifiable, jamais une question.
  Sans commune connue : normale.

## roofing-2026.11.20-59 — Base couverture : la fiche, le DTU, la zone par commune (mission du fondateur, 19-20 novembre 2026)

Travail de la branche `claude/amazing-einstein-jhz8k4`, fusionné sur la branche de test. Chaque constante est lue dans
`referentiels/couverture/fiche-couverture.json` (constantes et tables prouvées par des chiffres confirmés). Les étapes,
de la plus récente à la plus ancienne :

### Étape — Tuile canal : 3 % de casse et de coupe (jamais 0 %)

- **§5 / §35.3 Tuile canal** : marge de 3 %, lue dans la fiche (`tuile.perte_canal`). Avant : aucune (0 %). La casse à la
  pose d'une tuile terre cuite n'est jamais nulle (1 %, fiches environnementales collectives CTMNC 2014, 2020, 2022), les
  coupes s'y ajoutent ; 3 % = la marge des tuiles du référentiel du fondateur. Modifiable par l'entreprise.
- Exemple : Canal Gironde 50, R 150, 100 m² → 2 617 tuiles (avant 2 540).
- Recherche des pertes (`recherche/pertes.md`) : aucun autre pourcentage n'est confirmé par deux sources ; les marges en
  place (ardoise 5 %, tuile 3 %, liteaux 5 %, volige 5 %, bande zinc 5 %) restent celles du référentiel du fondateur.

### Étape — Zone du chantier calculée par commune

- **§26 / §32.1 Zone climatique** : lue PAR COMMUNE dans la carte des régions (`carte-regions.json`, `zones_communes`,
  34 734 communes : distance à la côte au 1:10 M et trait de côte Histolitt, altitude IGN de la mairie, NF DTU 40.11 et
  40.21). La commune écrite après le code postal ; sinon la zone la plus forte des communes du code postal ; sinon
  l'ancienne table par département (`zone.ts`). Décision du fondateur (19/11/2026).
- Exemples : Rennes, Vitré, Nantes, Grenoble passaient en zone 3 (département) : Rennes, Vitré, Nantes en zone 1,
  Grenoble en zone 2. Brest, Lorient, Saint-Malo restent en zone 3 ; Étel et Belz en zone 2 (côte « de Lorient à
  l'Espagne »). Grenoble, 200 m² de 30×22 : 8 547 ardoises, crochets de 9 cm (avant 8 925, 10 cm).
- Le crochet inox 2,7 mm reste d'office par département littoral (NF DTU 40.11 : Ø 2,4 interdit dans le 22, le 29 et le 56).

### Étape — Écran sous toiture : surface + 10 % au-dessus de 30 %, + 20 % en dessous

- **§6 / §28.4 Écran** : m² d'écran = surface × 1,10 au-dessus de 30 % de pente (règle du fondateur, confirmée),
  × 1,20 à 30 % et moins (lés recouverts de 20 cm, abouts et faîtage : NF DTU 40.29 via Edilians, Siplast, Dörken).
  Lu dans la fiche (`ecran.coef_pente_forte`, `ecran.coef_pente_faible`). Avant : recouvrement des lés seul,
  × 1,071 / × 1,154 (abouts et faîtage oubliés).
- L'écran reste commandé en ROULEAUX de 75 m² (ce que sert le comptoir, §40 test du fournisseur), les m² à couvrir
  dits sur la ligne. La règle du fondateur « en m², point » est signalée, pas appliquée : en m², la quantité bouge de
  9 % avec la pente et ferait poser une question de plus (règle des 3 %, §41), et une ligne en m² ne passe pas le
  test du fournisseur.
- Exemples : 120 m² à 45 % → 132 m², 2 rouleaux (avant 128,57 m², 2 rouleaux) ; à 30 % → 144 m², 2 rouleaux.

### Étape — Tubes de descente en longueurs de 2 m par défaut

- **§7 / §15 Tubes de descente** : longueurs de 2 m par défaut, lues dans la fiche (`evacuation.longueur_tube_descente`).
  Règle du fondateur, et la recherche confirme que le 2 m existe en zinc (VMZinc, Rheinzink, NedZink ; standard en
  Bretagne) comme en PVC (Nicoll, First Plast : 4, 3, 2, 1 m). « En longueurs de 4 m » écrit au devis donne du 4 m.
  Avant : 4 m. Exemple : 2 descentes de 5 m → 6 tubes de 2 m (avant 4 tubes de 4 m).
- Aide de la question du diamètre : Ø 100 jusqu'à 113 m² de toit (avant 130), Ø 120 jusqu'à 160 m² (NF DTU 40.5 via
  VMZinc, fiche couverture).

### Étape — Faîtières et arêtiers sans modèle : 3 au ml

- **§5 Faîtière et arêtier courants (40 à 42 cm), modèle non écrit au devis** : 3 au ml, lu dans la fiche
  (`faitage.faitieres_par_ml_sans_modele`). Recherche : 3 au ml pour une faîtière 1/2 ronde ou angulaire sans emboîtement
  (Edilians, Terreal, Monier), 2,5 seulement pour une faîtière à emboîtement grand modèle. Sans modèle, 3 : jamais trop
  court. Avant : 2,9 au ml (« ml ÷ 0,35 »).
- Exemples : D-2026-015, faîtières refusées → 30 (avant 29) ; arêtier de 12 m → 36 arêtières et 36 crochets (avant 35).

### Étape — Tuile à pureau variable : le rampant en rangs entiers

- **§5 Pureau par défaut d'une tuile à pureau variable** (le devis ne le dit pas) : le rampant est partagé en un nombre
  ENTIER de rangs au pureau le plus long admis par le fabricant : pureau = max(pureau mini, rampant ÷ arrondi au-dessus
  (rampant ÷ pureau maxi)). C'est la pose réelle (fiche couverture : Edilians, Koramic, Terreal). La fiche HP 10 de
  février 2026 donne des pentes minimales par zone et par site, sans lien avec le pureau. Avant : pureau mini en
  zone 3 ou sous 19,3°, sinon maxi. Le rampant (5,5 m par défaut) devient une hypothèse dite de l'ouvrage.
- Exemple : HP 10, rampant 5,5 m → 15 rangs, pureau 36,7 cm (avant 31 cm en zone 3). 120 m² : 1 258 tuiles (avant
  1 488) ; 24 m de rives : 66 tuiles de rive (avant 78).

### Étape — Ardoise : recouvrement du NF DTU 40.11, lu dans la fiche couverture

- **§3 Recouvrement de l'ardoise au crochet** : le tableau du NF DTU 40.11 (2020, annexe B), relu chez Cupa et Rathscheck
  (132 valeurs identiques), par pente et région, une table par bande de rampant (≤ 5,50 m, 5,50 à 11 m, 11 à 16,50 m ;
  le rampant tient lieu de projection horizontale, ce qui est prudent). Les trois tables sont construites par
  `construire_fiche.py` à partir des chiffres confirmés de la fiche (`tables` de `fiche-couverture.json`).
  Avant : tableau du référentiel (25° à 50°), + 10 mm au-delà de 5,5 m de rampant, arrondi aux 5 mm supérieurs.
- Exemples :
  - 45°, région III, rampant ≤ 5,50 m : 89 mm (avant 95). Brest, 200 m² de 30×22 : 8 925 ardoises (avant 9 271), ligne de
    la table Cupa 42,5/m².
  - 45°, région I : 73 mm (avant 80) ; crochet 8 cm (avant 9).
  - 45°, région III, rampant 6 m : 94 mm (avant 105).
  - 30°, région III : 119 mm (avant 120).
- Pente minimale de la table : 24,23° (45 %, la plus forte des pentes admises dans les trois régions et les trois
  bandes ; avant : 25°). En dessous, l'ouvrage n'est pas calculé et la raison est dite.
- Rampant : un choix « Plus de 11 m » est ajouté.

### Étape — Faîtage et arêtier zinc façonnés en longueurs de 2 m (fiche couverture)

- **§3 / §7 Faîtage et arêtier zinc commandés façonnés** : longueurs de 2 m, lues dans la fiche
  (`zinguerie.longueur_faitage_aretier_faconne`). Règle du fondateur (« zinc façonné en 2 m »), confirmée par
  VMZinc, Rheinzink et trois négoces bretons (Quéguiner, Tanguy, Bretagne Matériaux) : aucune pièce de 3 m vue.
  Avant : longueurs de 3 m. Exemple : 9 ml d'arêtier zinc → 5 longueurs de 2 m (avant 4 longueurs de 3 m).
- La marge × 1,05 du zinc linéaire ne change pas ici (sans source : à trancher par le fondateur).

### Étape — Ardoise : trois constantes lues dans la fiche couverture (mission du fondateur, 2026-11-19)

Première étape de la bascule « le code lit la fiche et rien d'autre » : ces constantes viennent de
`referentiels/couverture/constantes.json`, chacune prouvée par des chiffres confirmés de `fiche-couverture.json`.

- **Pureau quand le devis donne le crochet** : recouvrement = crochet − 5 mm (jeu de tête), soit pureau =
  (longueur − crochet) ÷ 2 + 2,5 mm. Règle du fondateur (18/11), confirmée par le manuel CAP, le guide du
  ministère de la Culture et Cupa. Avant : crochet − 1 cm (+ 5 mm). D-2026-020 (32×22, crochet 11) : pureau
  10,75 cm (avant 11), 42,09 ardoises/m² (avant 40,7), 2 122 ardoises (avant 2 052).
- **Crochet par défaut** (devis sans longueur) : recouvrement + 3 mm, arrondi au cm supérieur (Cupa, Frénéhard,
  NF DTU 40.11 2020). Avant : recouvrement + 1 cm. Brest (30×22, 45°, zone 3, R 95 mm) : crochet 10 cm (avant 11).
- **Crochets** : un par ardoise commandée, sans perte en plus. Règle du fondateur, confirmée par Cupa,
  Rathscheck et le DTU 40.11 via guides. Avant : ardoises × 1,02. Brest : 9 271 crochets (avant 9 457).
- Aucune autre quantité ne change : seules les lignes de crochets et le pureau au crochet écrit bougent dans
  les comptes rendus (`docs/lot-*`, tableau de Brest).

## roofing-2026.11.19-58 — Zinc à tasseaux : la largeur de bobine ne se demande jamais (recette en ligne, 2026-11-19)

- **Zinc à tasseaux** : la largeur de la bobine (`largeur_bobine_tasseaux`) est `neverAsk`. Sur le site de test, deux lectures sur trois du devis D-2026-024 posaient « bobine de 650 ou de 500 ? » ; la couverture restait en attente. La valeur courante de Greg (650 mm) est dite et se change dans la liste ; écrite au devis, elle est prise.
- Une question que le modèle pose avec ses mots sur la donnée d'un ouvrage (« largeur de bobine », sur la ligne de la couverture) est cette donnée : écartée comme elle quand elle ne se demande jamais.
- Une ligne dont un article a été lu et attend seulement une réponse n'est plus dite « je n'ai pas su en tirer les articles ».

## roofing-2026.11.18-57 — Zinc à tasseaux ; une information écrite n'est jamais demandée (Greg, 2026-11-18, devis D-2026-024)

- **Nouvel ouvrage « Couverture zinc à tasseaux »** (`couverture-zinc-tasseaux`). Avant : absent de la fiche ; « couverture zinc à tasseaux, 32 m² » sortait sans aucune fourniture, ou était prise pour du joint debout. Maintenant : de la bobine au mètre linéaire, nombre de bacs = largeur du pan ÷ entraxe des tasseaux, longueur d'un bac = rampant + 15 cm (comme le joint debout, réponse du 2026-10-04).
- Chiffres de Greg (2026-11-18), retrouvés dans le descriptif type VMZINC « Couverture à tasseaux » : bobine de 650 mm par défaut (500 mm « parfois », au choix), tasseaux de 50 mm, entraxe 620 mm (470 mm pour une bobine de 500). Les pattes à tasseaux se font dans les chutes de zinc : aucune ligne à commander.
- Tasseaux de bois et couvre-joints : seulement quand le devis les écrit (règle numéro un). Leur quantité (rangs = bacs + 1, sur la longueur du rampant) n'est PAS encore validée : la ligne reste « à chiffrer », sans quantité. À confirmer par Greg.
- **§7, §36 Règle changée** : le rampant d'une couverture en bacs (joint debout, tasseaux) n'est plus supposé à 5,5 m quand le devis ne le dit pas. Il est pris au devis (« bacs de 4 m », « rampant de 7 m »), sinon demandé, en mètres : « Longueur des bacs (le rampant, de l'égout au faîtage) ? ». Avant : 5,5 m par défaut, avec des boutons « Jusqu'à 5,5 m », « 5,5 à 8 m », « Plus de 8 m ». L'ardoise garde son défaut (il ne règle que le recouvrement).
- **§49.4 Règle renforcée** : une donnée du toit écrite au devis avec un autre mot (« longueur des bacs » pour le rampant) est cette donnée : jamais demandée. Une question que le modèle pose sous son propre mot (« rampant ») est LA question de la donnée : une seule question, fermée par la réponse. Les mots sont dans la fiche (`textLabels`) et sont donnés au modèle.
- Les chantiers déjà calculés gardent leur version figée : rien n'y change.

## roofing-2026.11.18-56 — Consommables en cases, unité de vente des tubes, plus de « développé ? » (Greg, 2026-11-18)

- **§49.1 point 4, Règle changée** : les consommables de pose (silicone, vis, pattes, étain, décapant…) ne sont plus jamais ajoutés d'office et la question « Consommables de pose : je les ajoute à la liste ? » n'est plus posée. Ils sont proposés en cases à l'étape « Suggestions », une case par article (le silicone de deux pièces : une seule case) ; cochés, ils valent des articles écrits. L'habitude de l'entreprise ne les ajoute plus. Un « oui » déjà donné sur un ancien chantier garde ses consommables. Vaut pour tous les métiers calculés par un tiroir. Avant : question oui / non, ou habitude.
- La limite de cinq suggestions vaut pour l'ensemble : d'abord les articles de la fiche (naissances, talons, angles, crochets), puis les consommables. Au-delà de cinq, les derniers ne sont pas proposés (sur le D-2026-020 : les pattes de fixation).
- **§15 Descentes** : les tubes se disent dans leur unité de vente (« 2 tubes de 4 m », jamais « 2 pièces ») ; la précision s'accorde (« 1 descente × 6 m »). Le calcul ne change pas.
- **§48.6 Feuilles de zinc** : « développé ? » ne s'écrit plus dans la précision d'une ligne ; seul ce qui est connu est dit (« pour 4 ml de bande »). Le développé n'est toujours pas demandé pour des feuilles (fondateur, 2026-10-10) ; il se demande, avec ses boutons, pour une pièce commandée toute faite (inchangé).

## roofing-2026.11.18-55 — L'étape « Suggestions » (Greg, 2026-11-17, points 13 à 17)

- **§49.1 point 5, Règle changée** : après la lecture et avant les questions de précision, une étape « Suggestions. Coche ce qu'il te faut, on l'ajoute à ta liste. » : des cases à cocher et « Continuer ». Les propositions viennent de la fiche (`suggested` sur un emplacement), jamais de l'IA ; cinq au plus ; aucune : pas d'étape. Un article coché vaut un article écrit (ses questions se posent ensuite) ; non coché, il n'existe pas. Avant : aucun bloc « Suggestions ».
- **§49.1 point 3, Règle changée** : la naissance d'une gouttière n'est plus ajoutée d'office (`indissociable`) : elle est proposée dans les suggestions. Avant : ajoutée dès qu'une gouttière était écrite. Cela vaut pour la lecture d'un devis (la discussion) ; l'ancien calcul sans étape « Suggestions » garde la naissance d'office.
- **§15 Gouttière zinc** : talons (2 pour une ligne droite) et angles (un par angle, « Combien d'angles sur cette gouttière ? ») deviennent des lignes à part, proposées seulement dans les suggestions (« si tu ne les fabriques pas »). Avant : absents de la gouttière zinc. Les crochets non écrits sont proposés aussi.
- **§15 Gouttière PVC ou alu** : talons, angles et naissances non écrits sont proposés dans les suggestions (mêmes ratios).
- Les chantiers déjà calculés gardent leur version figée : rien n'y change.

## roofing-2026.11.17-54 — Droit au but : une commande claire (Greg, 2026-11-17, après son test du D-2026-020)

- **§49.5 Règle changée** : une seule ligne par article identique, avec le total (toutes les feuilles de zinc réunies, comptées pièce par pièce puis additionnées). Avant : le même article sorti par deux ouvrages écrits restait une ligne par ouvrage. Le nom des feuilles ne dit plus leur usage (« Feuilles zinc naturel 2 × 1 m, 0,65 mm », sans « pour bandes de rive… ») ; l'usage reste dans le détail de l'app.
- **§49.6 Règle changée** : la précision des feuilles dit la longueur et le développé (« pour 8 ml de faîtage, développé 25 cm »), plus « estimation… ajuste selon ton façonnage ». La ligne reste une estimation, que l'artisan ajuste.
- **§49.7 Règle changée** : le mortier du solin garde le nom que le devis lui donne (« mortier de ciment ») ; le code ne compte que les sacs de 25 kg (2 kg par mètre, inchangé). Avant : renommé « Mortier d'étanchéité pour solin ».
- **§34 Règle changée** : le pureau ne se demande JAMAIS (`neverAsk`). Il se calcule : (hauteur de l'ardoise − recouvrement) ÷ 2 ; le recouvrement est celui des crochets écrits (crochet − 1 cm), sinon celui de la table pente × région (§3). Une question du modèle sur le pureau est écartée et ne suspend plus le calcul. Avant : « 48 m² d'ardoises 32×22 et crochets de 11 » restaient « À préciser » quand le modèle demandait le pureau.
- Le format écrit dans le nom de la fourniture (« Ardoises naturelles 32×22 ») désigne l'ardoise quand la lecture ne l'a pas nommée à part (un seul format possible, jamais un nom de modèle).

## roofing-2026.11.17-53 — Le pliage : une seule réponse pour tout le devis (Greg, 2026-11-17)

- **§48.6 Règle changée** : « Tes pièces pliées (rive, bandes, noue, faîtage…) : tu les plies toi-même, ou tu les achètes toutes faites ? » se pose UNE fois pour tout le devis (`groupe` « pieces-pliees » : bandes zinc, abergement, porte-solin, noue, faîtage zinc, bandes cuivre). Avant : une question par pièce de zinguerie écrite au devis (retour du 2026-10-07).
- S'il plie : des feuilles 2 × 1 m, comptées d'après les développés et les longueurs (§48.6, inchangé). S'il achète tout fait : des longueurs de pièces façonnées (§1, inchangé). Gouttières, descentes, naissances, crochets : articles normaux dans les deux cas (§48.7, inchangé).
- L'artisan peut changer ce choix pour une pièce : la réponse de la pièce (« param:faconnage@bandes-zinc__3 ») passe devant celle du devis.
- Ce qui ne change pas : une pièce dont le devis dit le façonnage (« pliée en Z », « comprend le pliage ») n'a pas de question et garde ce que sa ligne écrit ; les bacs d'une couverture à joint debout gardent leur propre question. Aucun ratio ne change.

## roofing-2026.11.17-52 — Les mots de l'artisan sont sur le bouton (Greg, 2026-11-17 : « le cœur doit s'adapter à n'importe quel métier »)

- **Façonnage** (bacs, bandes zinc, noue, faîtage, cuivre) : chaque bouton porte les mots que l'artisan dit au clavier ou à la voix (`dit`) : « je plie », « moi-même », « je façonne » pour « Je façonne » ; « tout fait », « tout prêt », « j'achète », « commandé » pour « Je commande façonné ». Avant : ces mots étaient écrits dans le lecteur des réponses, commun à tous les métiers.
- Aucune question, aucun bouton, aucun ratio ne change : s'il plie, des feuilles de zinc 2 × 1 m (§48.6) ; sinon des longueurs toutes prêtes (§1).
- Deux boutons dits dans la même réponse (« je commande… et je plie ») : la question est reposée avec ses boutons. Avant : « je plie » l'emportait.

## roofing-2026.10.11-51 — Deux fenêtres de toit, deux tailles (retour du fondateur, 2026-10-11)

- **§11 Fenêtres de toit** : l'ouvrage se prend ligne par ligne (`perLine`), comme les pièces de zinc (§48.6). Deux fenêtres écrites sur deux lignes (« Fenêtre de toit 114x118 », « Fenêtre de toit Velux MK04 ») gardent chacune leur taille, leur nombre et leur raccord. Avant : une seule fenêtre pour tout le devis, et une fausse question « Taille de la fenêtre de toit : 114118 u (…), ou 7898 u (…) ? ». Aucun ratio ne change.

## roofing-2026.10.10-50 — Audit : aucune règle de calcul en double (fondateur, 2026-10-10)

- **Longueurs de 2 m** : une seule règle, §1 « bande de 2 m = ml / 2 arrondi sup. » (`longueur_bande_2m`), pour toutes les bandes commandées façonnées : zinc, cuivre, abergement, porte-solin d'abergement, égout du joint debout. Avant : ml ÷ 1,9 (« recouvrement 10 cm », §36.4) pour le cuivre, l'abergement, son porte-solin et l'égout du joint debout (`longueur_utile`, `longueur_utile_bande`), ml ÷ 2 pour les bandes zinc. Exemple : 2 cheminées de 3 m, 7,8 m de zinc → 4 longueurs (avant 5) ; porte-solin 6 m → 3 (avant 4). La noue garde sa règle propre, écrite au §25.2 (1,85 m utile pour 2 m, recouvrement 150 mm).
- **Feuilles 2 × 1 m** : une seule règle, §48.6 (bandes découpées dans le mètre de largeur), aussi pour le cuivre. Avant, cuivre : ml × développé ÷ 2 m² (`surface_feuille`, §25.2). Exemple : 4 ml de couvertine cuivre dév. 40 → 2 feuilles (avant 1 : deux bandes de 40 cm par feuille, 4,4 m à couvrir).
- **Mêmes règles, un seul nom** : bobine de cuivre au-delà de 6 ml → `seuil_bobineau` (avant `seuil_bobine`) ; marge ml × 1,05 de la noue, de l'égout et du faîtage → `marge_zinc_lineaire` (avant `marge_noue`, `coef_egout_faitage`) ; marge ml × 1,1 du plomb → `marge_bandes` (avant `marge_plomb`). Aucune valeur ne change.
- Les constantes partagées (zone littorale, pattes 3/ml, mortier de solin 2 kg/ml, crochets de gouttière, seuils d'épaisseur) s'écrivent une fois. Aucune valeur ne change.
- Tableau règle / section / test : docs/audit-referentiel-regles.md, réécrit par le test `audit-regles-uniques.test.ts`. Les dix règles qu'aucun test ne citait (sortie de toit, étain, décapant, vis des bandes, mastic du porte-solin) ont leur test (`regles-sans-test-audit.test.ts`).

## roofing-2026.10.10-49 — §50.7 : le document dit les longueurs et le nom des pièces (retour du fondateur, 2026-10-10, D-2026-018)

- **Bacs commandés façonnés** : vendus au bac (« 31 bacs »), la longueur dans le nom (« Bacs joint debout Quartz-Zinc 0,65 mm, longueur 7,15 m » : rampant + 15 cm, ou rampant partagé en longueurs de 10 m au plus). Avant : « 31 pièces », sans longueur. Le nombre reste celui du §36.6 (largeur ÷ entraxe 0,43 ou 0,58) : 31 bacs en bobine 500, 23 en bobine 650 (choix du fondateur, 2026-10-10).
- **Pièces de zinc façonnées** : la ligne porte le nom de la pièce écrite au devis (« Bande de ventilation en Z en zinc quartz, Quartz-Zinc 0,65 mm » ; « Feuilles … 2 × 1 m, 0,65 mm, pour habillage de rive… ») ; abergement : « Bandes d'abergement ». Avant : « Bandes façonnées ».
- **Bandes et porte-solin commandés façonnés** : longueurs de 2 m = ml ÷ 2 arrondi sup. (§1 ; 13 ml → 7). Avant : ml × 1,1 ÷ 1,9 (13 ml → 8).
- **Pattes** : aucune règle ne change ; un seul calcul, le tableau VMZINC §36.2 par m² selon le rampant et la largeur de bobine (91 m², rampant 7 m : 519 + 173 en 500, 383 + 128 en 650).

## roofing-2026.10.10-48 — « Autre » aussi pour une qualité qui se nomme (ardoise, aspect du zinc, teinte)

- **§50.2 Questions** : « Quelle ardoise : Espagne 1er choix, ou NF ? », l'aspect du zinc (naturel, Quartz, Anthra), la teinte de gouttière et celle de l'ardoise fibres-ciment ont aussi « Autre » (`named`). Ce que l'artisan écrit (« Ardoise d'Angers ») passe tel quel dans la désignation (« Ardoises naturelles Ardoise d'Angers 32×22 »), sans rien changer aux quantités. Avant : seulement les boutons.
- Un modèle ou une qualité écrits sous « Autre » ne deviennent jamais une habitude de l'entreprise (ils ne sont pas au référentiel). Aucun ratio ne change.

## roofing-2026.10.10-47 — « Autre » : quand l'app ne sait pas, elle demande et laisse écrire (retour du fondateur, 2026-10-10)

- **§50.2 Questions** : une question de valeur à boutons (pente, entraxe, rampant, développé…) ou de modèle (tuile, ardoise) a aussi « Autre », qui ouvre une case pour écrire (valeur dans son unité, ou le modèle). Avant : seulement les boutons (« Tuiles HP10 » seul, 30° / 35° / 45°). Les choix fermés (façonnage, oui / non, à fournir / déjà sur place) n'ont pas d'« Autre ».
- **Modèle écrit hors référentiel** : la question se ferme, la ligne porte le nom écrit, orange « Quantité à préciser » (le nombre de pièces dépend du modèle) ; « C'est bon » la laisse au fournisseur, qui compte pour la mesure du devis. Aucun ratio inventé.
- **Une ligne jamais deux fois** : une mesure dont les articles sont calculés (« Couverture ardoises 48 m² ») ne ressort plus en m² à côté d'eux, et une surface sans modèle ne sort plus deux fois.

## roofing-2026.10.09-46 — §50 « Ce que voit l'artisan » (fondateur, 2026-10-09)

- **§50 Trois écrans**, qui priment sur toute règle d'écran antérieure : 1) je dépose mon devis (« Je lis ton devis », en cas d'échec la raison et « Réessayer ») ; 2) les questions, une par carte, en boutons, groupées par ouvrage, puis « Calculer ma liste » ; 3) ma liste, une carte par fourniture (point, nom du comptoir, quantité au moins / plus, unité ; si orange : raison en cinq mots au plus, boutons, « C'est bon »), oranges en premier, barre « N lignes à régler », un seul bouton « Envoyer au fournisseur » et trois liens en petit.
- **§50.4 Retirés** : le bandeau « L'IA peut se tromper… », le bouton « Corriger », le préfixe « Info manquante : », le compteur « N fournitures · N à vérifier », les sections « C'est bon / À vérifier », la carte du PDF (Ouvrir / Retirer) et « Corriger le devis lu » (le PDF se rouvre depuis le titre du chantier), tout message flottant.
- Le texte du référentiel (docs/referentiel-couverture.md) reprend la version du fondateur avec le §49.9 rédigé et le §50. Aucun ratio ne change.

## roofing-2026.10.09-45 — §49.9 une ligne nomme une fourniture (retour du fondateur, 2026-10-09, devis de réparation D.2026.105)

- **§49.9 Fourniture, jamais phrase** : une prestation écrite en phrase (« Remplacement unitaire d'une tuile cassée, comprenant accès toit… ») est remplacée dans la liste par la fourniture que la lecture en extrait, d'abord ses sous-lignes (« – Tuile terre cuite mécanique »), puis son texte (« y compris les petites fournitures de fixation ») : une ligne par article, nommée par l'article, avec sa quantité. Avant : la phrase entière sortait comme désignation.
- **§49.9 Lignes sans fourniture** : une unité h, heure, jour, fft ou forfait n'est jamais une fourniture (`withoutSupplyUnits`). Une durée sort toujours de la liste. Un forfait qui nomme un matériau reste la mesure de son ouvrage, et le calcul en tire les articles. Ces lignes et celles « hors quantitatif » (accès, évacuation) sont repliées sous « N lignes sans fourniture ». Avant : « Repositionnement des tuiles · 1,5 h » pouvait sortir comme article.
- **§49.9 Donnée sans choix** : une donnée du comptoir sans choix à proposer (« modèle et teinte de tuile ») n'est plus une question. La ligne sort orange « à préciser » : l'artisan complète à la voix, ou touche « C'est bon » et le fournisseur propose (ligne grise, précision « au choix du fournisseur »). Avant : une question sans bouton à l'écran des questions.
- Unité « jeu » (et « kit ») reconnue comme un conditionnement. Aucun ratio ne change.

## roofing-2026.10.09-44 — pattes du joint debout (retour du fondateur, 2026-10-09, D-2026-018)

- **§49.1 Pattes fixes** : « pattes en inox fixes et coulissantes » écrit au devis donne deux lignes, pattes fixes ET pattes coulissantes, chacune sa quantité (VMZINC 36.2). Avant : seules les coulissantes sortaient (le mot « fixes » n'était pas reconnu après « inox »).
- **§49.2 Façonnage pas choisi** : les pattes du joint debout attendent le façonnage (bobines ou bacs) ; tant qu'il manque, elles sortent orange « Info manquante : façonnage », avec leur quantité, jamais vertes « pour bobine 500 mm ». Aucune quantité ne change.

## roofing-2026.10.07-43 — audit avant bêta (2026-10-07)

- **Ø des descentes** : la question disait « Descentes en Ø 80 ou en Ø 100 ? » et proposait trois boutons (Ø 80, Ø 100, Ø 120). Elle dit maintenant « Descentes en Ø 80, Ø 100 ou Ø 120 ? », avec « Ø 120 au-delà » dans l'aide. Aucune quantité ne change.

## roofing-2026.10.07-42 — zinguerie pièce par pièce, une info demandée une fois (retour du fondateur, 2026-10-07)

- **§48.6 Une question par pièce de zinguerie écrite au devis** : l'ouvrage « Bandes zinc (solin, rive, égout, ventilation, couvre-joint) » ne pose plus une question globale. Écrit sur plusieurs lignes, il devient une pièce par ligne (`perLine`, instance `bandes-zinc__<ligne>`), chacune avec SES données (développé, aspect), sa question à son nom (« Bande de ventilation en Z en zinc quartz : tu façonnes toi-même ou tu commandes façonné ? », deux boutons) et sa réponse ; jamais une donnée prêtée d'une pièce sœur. Une pièce dont le devis dit le façonnage n'a pas de question : « comprend le pliage » = je façonne, « pliée(s) en Z », « préfaçonné(e)s » = commandé façonné. « Habillage de rive en zinc » est une bande zinc. Développé « 200 mm » ajouté aux choix (§36.4 : 200 à 330 mm) : « Dév. 200 » écrit est lu, jamais redemandé. Le nom d'un lot ne garde plus sa parenthèse (« Abergement de cheminée »).
- **Une info manquante se demande une fois** : une question du comptoir (« manque » de la lecture) sur une donnée que l'ouvrage de la ligne connaît (le Ø des naissances pour la gouttière, la qualité d'ardoise, l'épaisseur du zinc) n'est jamais posée, ni avant ni après le calcul ; c'est la question du tiroir, posée à l'écran des questions, qui règle toutes les lignes. Une dimension lue par l'IA sur une ligne vaut pour l'ouvrage (la pièce) de cette ligne.

## roofing-2026.10.06-41 — §49.7 mortier de solin, §49.8 lignes orange réglées dans leur carte (fondateur, 2026-10-06)

- **§49.7 Mortier de solin** : « Ciment 35 kg + sable » est remplacé par « Mortier d'étanchéité pour solin, sac 25 kg » (produit `mortier-solin-25`, famille `solin_mortar` comptée en kg). Règle du fondateur : sacs = arrondi supérieur de (ml de porte-solin × 2 kg) / 25 (`regle.mortier_solin_par_ml` = 2 kg/ml, sourcée §49.7). Sur D-2026-020 : 4 ml ⇒ 1 sac, **en vert**, hypothèse « 4 ml × 2 kg/ml ». Ancienne valeur : « Ciment 35 kg + sable : 1 sac », orange (estimation `todo`).
- **§49.8 Écran « À vérifier »** : chaque article porte ce qui le règle sur place (`asks` : la donnée qui manque ou le défaut à confirmer, avec ses boutons ; `gap` : « le devis dit 20, le calcul donne 21 »). Rien ne change dans les quantités.

## roofing-2026.10.06-40 — §49, la charte du quantitatif (fondateur, 2026-10-06)

Les prompts 41.1 (lecture, v12) et 41.2 (relecture, v4) sont branchés mot pour mot ; le §49 remplace tout ce qui le contredit.

- **§49.1 D'où vient chaque ligne** : la règle numéro un vaut pour **tous les tiroirs, tous les métiers** (lot B compris : une cloison écrite, ce sont ses plaques ; rails, vis, bande, enduit seulement s'ils sont écrits). Une ligne par article écrit, **dans l'ordre du devis**, jamais fusionnée avec une autre ligne (les feuilles du faîtage, des rives et du porte-solin restent trois lignes). Accessoire indissociable : la **naissance seule** (le raccord de fenêtre de toit n'est plus ajouté d'office). Une ligne de pose qui cite un article sans le chiffrer (« fixation » des descentes) le fait sortir, calculé, orange (`citedBy`). Plus aucun bloc « Suggestions », plus aucun interdit « X sans Y ».
- **§49.1 point 4 Consommables** : UNE question, « Consommables de pose : je les ajoute à la liste ? » (oui / non, mémorisable comme habitude). Oui : seulement ceux liés à une ligne écrite (vis et silicone des bandes, pattes du faîtage, silicone du porte-solin, **étain et décapant** quand la pose écrit des soudures), en orange, en fin de liste. Non : rien.
- **§49.2 D'où vient chaque quantité** : la quantité écrite reste la base ; l'écart avec le calcul se dit « Le devis dit 20, le calcul donne 21 (…) ». Tuyau en **tubes** (« 2 tubes de 3 m »). Marge écrite dans la phrase d'hypothèse des ardoises (« 48 m² × 40,7 ardoises/m² (crochet 11 cm, pente 30°) + 5 % de marge »). Feuilles d'un zinc façonné : orange « ajuste selon ton façonnage ». Une valeur par défaut du tiroir non confirmée garde sa ligne orange.
- **§49.2.5 Info manquante** : une ligne écrite qui attend une réponse ne disparaît plus : calculée sans la donnée, avec un « ? » à sa place (« Gouttière zinc Havraise dév. ? », 3 longueurs de 4 m), ou telle qu'écrite avec la quantité du devis (faîtage, porte-solin en attente du façonnage), orange « Info manquante : … ».
- **§49.4 Questions** : celles du tiroir, plus le « manque » de la lecture (§41.1) quand le tiroir ne pose pas déjà la même ; jamais une question sur une donnée écrite.
- Les tiroirs du lot B passent en `-2026.10.06-2` (article principal de chaque ouvrage mesuré). Test permanent : `packages/domain/test/devis-d2026-020.test.ts` (§49.6).

## roofing-2026.10.06-39 — RÈGLE NUMÉRO UN : rien d'absent du devis (fondateur, 2026-10-06)

- **Règle numéro un** (`writtenOnly`) : BatiClair retranscrit ce que le devis écrit, avec ses quantités ; il n'ajoute jamais un article absent du devis, ni en vert, ni en orange, ni en suggestion. Un article sort seulement s'il est écrit dans une ligne, ou s'il en est la forme d'achat (`formOf` : feuilles 2 × 1 m d'une bande façonnée, bobines ou bacs d'un joint debout, plaques d'un bac acier, pièces d'une sortie de toit ou d'un abergement), ou s'il en est l'accessoire indissociable (`indissociable` : la naissance d'une gouttière, §48.7 ; le raccord d'une fenêtre de toit). Plus de liteaux, contre-liteaux, écran, pattes, pointes, colliers, dauphins, abouts, jonctions, talons, angles, vis, silicone… s'ils ne sont pas écrits ; plus de question à leur sujet. Les « On ajoute ? » et les interdits « X sans Y » sont coupés pour la couverture.
- **§48.6 zinc façonné** : une question « tu façonnes ? » par ouvrage (faîtage zinc, bande porte-solin, bandes, noue, abergement), jamais prêtée d'une pièce à l'autre (`ownOnly`) ; aucune question quand le devis dit déjà le façonnage. Façonné sur place : **feuilles 2 × 1 m**, estimées d'après le développé (« 1 feuille de 1 m de large en bandes de développé, 2 m de long » : dév. 25 cm → 8 m par feuille), raisonnement dit en clair ; le bobineau est réservé au joint debout, terrasses et chéneaux (fin de la règle « bobineau au-delà de 6 ml »).
- **Bande porte-solin** : ouvrage à part (`bande-porte-solin`), avec sa question de façonnage et son mortier écrit (orange, estimé).
- **Tuyau de descente** écrit en mètres avec « N descentes de H m » : commandé en longueurs (« 2 longueurs de 3 m »).
- **Crochets d'ardoise** : l'écart avec les ardoises (2 094 pour 2 052) est dit sur la ligne : un par ardoise + 2 % de casse (référentiel : crochets = ardoises × 1,02).
- La gouttière garde son profil écrit (« Havraise ») dans sa désignation.
- Le tableau de Brest et les comptes rendus des lots bougent en conséquence (articles non écrits retirés). Test : `packages/domain/test/devis-d2026-020.test.ts`.

## roofing-2026.10.06-38 — le mortier reste, l'écart devis / calcul se dit (D-2026-020)

- **Mortier de solin** (nouvelle famille `solin_mortar`, mot « mortier », emplacement `mortier` des bandes zinc) : cité au devis (« bande porte-solin zinc et mortier ciment »), il n'est plus jamais supprimé. Estimation du fondateur, à confirmer : « Ciment 35 kg + sable (mortier de solin) : 1 sac », ligne orange « Quantité à confirmer : estimation 1 sac de ciment 35 kg + sable ». Non cité, il n'apparaît pas.
- **Quantité écrite comparée au calcul** : le devis reste la base (« 20 crochets de gouttière »), mais BatiClair calcule aussi l'article. Un écart réel (plus de 3 % et au moins une pièce) met la ligne en orange avec la note : « 20 au devis, 21 calculés pour 10 ml de gouttière, un tous les 50 cm + 1 en bout ». « C'est bon » garde la quantité du devis. L'écart est propre au chantier : il ne valide jamais une règle (§47.4).
- **Crochets de gouttière zinc** : un tous les 50 cm (40 en zone 3) **plus un en bout de ligne** (avant : sans le crochet de bout), comme la gouttière PVC (§15).

## roofing-2026.10.06-37 — le vrai devis D-2026-020 lu jusqu'au bout

- **Lignes de pose** (« Pose de couverture … pente 30° », « Façonnage et pose des bandes de rive ») : elles ne commandent toujours rien, mais ce qu'elles écrivent vaut pour l'ouvrage qu'elles nomment (pente, crochets, façonnage).
- **Façonnage** lu au devis (« façonnage et pose », « façonnées sur place ») : l'artisan façonne, plus de question « tu façonnes ou tu commandes façonné ? ».
- **Un mot complément ne nomme pas un article** : « crochets de gouttière », « fixation de la gouttière », « dévoiement des descentes » ne citent ni la gouttière ni les tubes. Les 20 crochets de gouttière et les 4 coudes du devis partent tels qu'écrits ; plus de ligne « Tubes de descente (Coude…) » à faire chiffrer. « et crochets », « avec coudes », « accessoires de fixation » nomment toujours.
- **« inox » des crochets** (« des crochets de fixation en inox ») ne se colle plus sur les ardoises.
- **Deux lignes du même article** (bandes de rive 4 m + bande porte-solin 4 m) : leurs longueurs s'additionnent (8 m), la seconde ne part plus « à faire chiffrer ». Deux articles différents (ardoises et écran) gardent une seule mesure.
- **Développé** : celui du faîtage (dév. 25 cm) n'est plus prêté aux bandes de rive ; une donnée écrite sur une ligne vaut d'abord pour son ouvrage.
- **« 1 lot » de crochets** : un lot ne dit pas combien d'articles, le calcul les compte (comme un forfait).
- Gouttière **Havraise** et zinc **mouluré** gardés dans la désignation. Test : `packages/domain/test/devis-d2026-020.test.ts`.

## roofing-2026.10.06-36 — plus de crochet « 1 mm » à l'écran

- Le choix du crochet se dit « Standard » ou « Inox Ø 2,7 mm (bord de mer) » ; « Courant (1 mm) » n'apparaît plus (retour du fondateur : un crochet de 1 mm n'existe pas). Le 1 mm reste le jeu de la formule Cupa (§34) dans le calcul : aucune quantité ne bouge.

## roofing-2026.10.06-35 — ce que le devis règle n'est plus demandé (D-2026-020, suite)

- **Ø des descentes** lu après « diam. » ou « diamètre » (« diam. 80mm », « diamètre 100 ») : plus de question « Ø 80 ou Ø 100 ? » quand le devis l'écrit.
- **Hauteur des descentes** lue dans « 2 descentes de 3 m » (comme « hauteur 4 m ») ; « descente 100 mm » n'est jamais une hauteur (1 à 30 m).
- Un ouvrage dont le devis donne les articles (tubes, coudes) ET la mesure écrite (« 2 descentes de 3 m ») calcule encore ce qu'il ne cite pas (colliers, dauphins). Une ligne commandée telle quelle sans mesure écrite (« 42 faîtières ») ne calcule toujours rien de plus.
- D-2026-020 reconstitué : 4 coudes (avant 8), 6 colliers (avant 12), 2 naissances (avant 4), dauphins = question du comptoir. Tableau de Brest inchangé.

## roofing-2026.10.06-34 — le devis fait foi : coudes et crochets (D-2026-020)

- **Coudes** : « Tubes de descente (Coude zinc Ø80) — 4 unités » sont 4 coudes commandés tels quels (la parenthèse qui suit le titre nomme l'article). Le nombre de descentes ne vient plus que d'une ligne de tubes (`forSlots: ["tube"]`) ou de « 2 descentes » écrit (`textCount`) ; avant : 4 descentes, 8 coudes, 4 naissances, 4 dauphins.
- **Longueur de crochet** : devenue une donnée de l'ouvrage, lue au devis (« crochet inox de 11 cm », « crochets d'ardoise … 110 mm » ; « Ø 2,7 mm » n'en est pas une), commandée telle quelle. Écrite, elle fixe le recouvrement (crochet − 1 cm, Cupa §34), donc le pureau et le nombre d'ardoises, crochets et liteaux. Non écrite : recouvrement + 1 cm, comme avant ; dite dans les hypothèses, modifiable.
- Tableau de Brest inchangé. Test : `packages/domain/test/devis-d2026-020.test.ts`.

## roofing-2026.10.05-33 — plomb et cuivre (§12, réponse du fondateur)

- **Plomb** (nouvel ouvrage `bandes-plomb`, famille `lead_strip` : « plomb », « bavette plomb », « solin plomb ») : bande commandée **en rouleaux**, largeur lue au devis (« largeur 40 cm »), sinon **30 cm** ; épaisseur **1,5 mm** par défaut (« 2 mm », « 2,5 mm » lus) ; ml × 1,1 (§12). La longueur du rouleau (§12 : 3 à 6 m) est prise à 6 m et reste **à confirmer** : la ligne sort orange, « Quantité à confirmer : rouleau de plomb de 6 m ».
- **Cuivre** (nouvel ouvrage `bandes-cuivre`, famille `copper_strip`) : comme le zinc, avec ses largeurs. Commandé façonné : bandes en longueurs de 2 m ; façonné sur place : feuilles 2 × 1 m jusqu'à 6 ml, **bobine au mètre** au-delà, à la plus petite largeur qui contient le développé (500, 600, 670 mm, **à confirmer**) ; 0,6 mm par défaut (§12). Son développé a sa propre clé : une bande zinc du même devis garde le sien.
- Les épaisseurs du plomb et du cuivre ne se lisent que sur leurs propres valeurs (« ép. 0,65 mm » reste celle du zinc).
- Pas encore : abergement de cheminée en plomb (calculé en zinc), noquets, plomb au kg, cuivre à joint debout.
- Compte rendu : `docs/lot-couverture/point-8.md`. Tableau de Brest inchangé.

## roofing-2026.10.05-32 — descentes en longueurs (réponse du fondateur)

- **Tubes de descente** PVC et zinc en **longueurs de 4 m** (2 m si le devis le dit : « en longueurs de 2 m »), par descente la hauteur en longueurs entières : « Tubes de descente zinc Ø100, longueur 4 m : 4 pièces » pour 2 descentes de 5 m (avant : 10 ml).
- **Coudes** : 2 par descente par défaut (inchangé). **Colliers** : un tous les 2 m plus un (avant : 1,8 m).
- **Dauphin** : question du comptoir, « Un dauphin en pied de chaque descente ? » ; lu au devis (« avec dauphin », « dauphin fonte », « sans dauphin »). Oui : un dauphin d'1 m par descente (§15).
- D-2026-015 (2 descentes PVC de 4 m) : 2 longueurs de 4 m (avant 8 ml), 6 colliers (avant 8), une question de plus (le dauphin). Devis de démonstration : « sans dauphin » écrit, toujours aucune question.
- Compte rendu : `docs/lot-couverture/point-7.md`. Tableau de Brest inchangé.

## roofing-2026.10.05-31 — sécurité et accès (§14), désamiantage (§18)

- **Sécurité et accès** (famille `roof_safety`) : crochets de sécurité, crochets de service, crochets d'échelle, échelle de toit, ligne de vie, points d'ancrage, garde-corps, passerelle. Reconnus, ils partent **tels que le devis les écrit** (modèle, norme, longueur), sans calcul ni question. Une ligne de vie à sa longueur passe le test du fournisseur (un système vendu à la longueur).
- **Désamiantage** (famille `asbestos_removal`, `dominant` : elle l'emporte sur tout autre mot de la ligne ; « plaques fibres-ciment amiantées » n'est jamais une ardoise) : la ligne part telle qu'écrite (poste chiffré par une entreprise certifiée), et un **avertissement** est dit à l'artisan en haut de la liste, même pour une ligne de dépose : « Amiante : le retrait se fait par une entreprise certifiée (SS3), après un repérage avant travaux… ». L'avertissement ne part jamais au fournisseur.
- Moteur (générique) : une famille peut être `dominant` et porter un `warning` (lu par le plan sur toutes les lignes, `PurchaseView.warnings`) ; le profil couvreur reconnaît ces lignes avant « crochet » et « ciment ».
- Compte rendu : `docs/lot-couverture/point-6.md`. Tableau de Brest inchangé.

## roofing-2026.10.05-30 — ardoise fibres-ciment (§4)

- **Ardoises fibres-ciment** (nouvel ouvrage `couverture-ardoises-fibres-ciment`, famille `roof_slate_fc` qui précise `roof_slate` : « fibres-ciment », « fibro-ciment », « artificielles », « Eternit ») : le calcul de l'ardoise naturelle avec les formats du §4, recouvrement courant 100 mm : 40 × 24 (27,8/m², liteaux 6,67 ml/m²), 40 × 27 (24,7/m², 6,67), 60 × 30 (13,3/m², 4,0), 60 × 40 (10/m², 4,0), + 5 % de perte. Ses fixations : **clous inox** = 2,1 × ardoises commandées, **crochets d'antivent** = 1,05 × ardoises (jamais de crochets d'ardoise naturelle) ; liteaux, contre-liteaux et écran comme l'ardoise naturelle.
- Questions du comptoir, lues au devis quand il les écrit : le **format** et la **teinte** (bleu-noir, noir, brun).
- L'ardoise naturelle ne change pas (Brest inchangé). Compte rendu : `docs/lot-couverture/point-5.md`.
- Correctif du point 3 : une famille qui en précise une autre (« PVC », « alu », « fibres-ciment ») ne se lit plus seule. « Bande de rive alu » ou « Échelle de toit aluminium » ne deviennent plus des gouttières, « Plaques fibres-ciment » n'est plus une ardoise.

## roofing-2026.10.05-29 — bac acier (§8)

- **Couverture bac acier** (nouvel ouvrage `couverture-bac-acier`, famille `steel_tray` : « bac acier », « tôle nervurée », « panneau sandwich ») : jamais de m² en sortie. **Plaques à la longueur du rampant + 5 cm de débord**, une par rampant, autant par pan que la largeur du pan (surface ÷ pans ÷ rampant) compte de largeurs utiles de 1,00 m ; **vis** autoperceuses avec rondelle EPDM, 7 par m² + 3 par mètre de rive, en boîtes de 100 ; **closoirs** mousse en bas et en haut de chaque plaque ; **faîtières** en longueurs de 2 m (largeur d'un pan ÷ 2, + 1), pas de faîtière en monopente.
- Questions du comptoir, chacune lue au devis quand il l'écrit : la **longueur des plaques** (« rampant 6 m » ; même clé que le rampant de l'ardoise, où elle reste une hypothèse), la **teinte** (RAL 7016, 7022, 8012, 9005), le **feutre anti-condensation** (simple peau seulement). Panneau sandwich lu (« sandwich »), deux pans par défaut (« monopente » lu).
- Compte rendu : `docs/lot-couverture/point-4.md`. Tableau de Brest inchangé.

## roofing-2026.10.05-28 — gouttières PVC et aluminium (§15)

- **Gouttière PVC ou alu** (nouvel ouvrage `gouttiere-pvc-alu`, famille `gutter_plastic` qui précise `gutter` : le mot « PVC » ou « alu » n'importe où dans la ligne) : mêmes règles que le zinc, avec les pièces du §15. **Longueurs de 4 m** ; **crochets** tous les 50 cm (40 en bord de mer) plus un en bout de chaque ligne ; **jonctions** entre longueurs ; **2 talons par ligne** ; **un angle par angle** (« Combien d'angles sur cette gouttière ? » si le devis ne le dit pas) ; **une naissance par descente** ; **joint de dilatation** PVC tous les 12 m de ligne. « Longueur : 2 x 10 m » = deux lignes (deux fois les talons, jonctions par ligne).
- La matière et la **teinte** se lisent dans la ligne (grise, blanche, sable, brune, anthracite), sinon le comptoir demande la teinte ; désignations comme au comptoir : « Gouttière PVC demi-ronde sable de 25 », « Talons de gouttière PVC sable de 25 ».
- D-2026-015 (gouttière PVC sable 2 × 10 m) : + 4 jonctions, + 4 talons, une question de plus (les angles).
- La gouttière **zinc ne change pas** (Brest inchangé).
- Test du fournisseur : un tube « Ø80 » au mètre (alu, zinc) n'est plus pris pour du métal sans dimension.
- Compte rendu : `docs/lot-couverture/point-3.md`.

## roofing-2026.10.05-27 — fenêtres de toit (§11)

- **Fenêtre de toit** (nouvel ouvrage `fenetre-de-toit`, famille `roof_window`) : la fenêtre part **telle que le devis l'écrit** (marque, modèle, taille) et compte l'ouvrage. Sans taille dans la ligne (ni « 78x98 », ni référence « MK04 »), la question du comptoir se pose sur la ligne : « Fenêtre de toit : quelle taille ? » (55 × 78, 78 × 98, 78 × 118, 114 × 118 ou saisie) ; la réponse part en précision.
- **Raccord d'étanchéité** : un par fenêtre, **pour tuiles**, **pour ardoises** ou **pour tuiles plates**, à la taille lue (« Raccords d'étanchéité pour tuiles, fenêtre 78 × 98 »), sinon « à la taille de la fenêtre de toit ». La couverture se lit dans la ligne, puis sur la couverture du devis ; sinon « Raccord de fenêtre de toit : pour tuiles, pour ardoises ou pour tuiles plates ? ». Codes de taille Velux lus (CK02 à UK08).
- Pas encore : kit d'isolation, collerette pare-vapeur, chevêtre, raccords combinés de fenêtres jumelées (un raccord par fenêtre, à corriger d'un tap).
- Compte rendu : `docs/lot-couverture/point-2.md`. Tableau de Brest inchangé.

## roofing-2026.10.05-26 — noues et arêtiers (§3, §5, §7, §25.2)

- **Noue zinc** (nouvel ouvrage `noue`, famille `valley`) : même règle que les bandes. Commandée façonnée : noues en **longueurs de 2 m**, longueur utile 1,85 m (recouvrement 15 cm, §25.2). Façonnée sur place : feuilles 2 × 1 m jusqu'à 6 ml, bobineau au-delà (zinc = ml × 1,05, §7). Développé lu au devis (« dév. 50 / 60 / 66 », « encaissée » → 66), sinon la noue préformée de 50, dite et modifiable. Question du comptoir : « Noue zinc : tu la façonnes toi-même ou tu la commandes façonnée ? » (même clé `faconnage` que tout le métal façonné).
- **Arêtier** (nouvel ouvrage `aretier`, famille `hip`) : en tuiles, **arêtiers** à 2,9 pièces/ml (§5), **closoir d'arêtier** de 23 cm en rouleaux de 5 m, un **crochet** par arêtier posé à sec, un **about** par arêtier ; en zinc, **bande d'arêtier** dév. 25 ou 33 en longueurs de 3 m (ml × 1,05) et **3 pattes par mètre** (§3). La matière se lit dans la ligne (« zinc », « arêtières »), sinon sur la couverture du devis (tuiles → arêtières ; ardoises ou zinc → bande zinc), sinon le comptoir demande « Arêtier en tuiles (arêtières) ou en bande zinc ? ». Le nombre d'arêtiers se lit (« 4 pans », « 2 arêtiers »), sinon « Combien d'arêtiers sur ce toit ? » (les abouts).
- **Développé écrit en centimètres** (« Faîtage zinc dév. 33 », « Bande zinc dév. 25 ») : lu pour les bandes et le faîtage zinc ; la question « Développé de la bande zinc ? » n'est plus posée quand le devis le dit.
- Compte rendu : `docs/lot-couverture/point-1.md`. Tableau de Brest inchangé.

## roofing-2026.10.04-25 — la règle du comptoir (§47.8)

- **Questions** : seulement celles que le vendeur du négoce poserait pour chiffrer. Nouvelles : développé de gouttière (25 / 28 / 33 / 40), crochets sur chevrons ou bandeau, descentes Ø 80 / 100, qualité d'ardoise (habitude d'entreprise), teinte du zinc quand le devis dit « prépatiné » sans la dire. Chacune est lue au devis quand il l'écrit. Supprimée : « égout et faîtage, on les ajoute ? » (les deux bandes passent dans « On ajoute ? », sauf si le devis les cite).
- **Désignations** comme au comptoir : aspect et épaisseur du zinc (« Bobine Quartz-Zinc 0,65 mm, largeur 500 mm »), développé et Ø (« Naissances zinc demi-ronde dév. 33 Ø80 »), pose des crochets, qualité d'ardoise, longueur des crochets d'ardoise (recouvrement + 1 cm, Cupa §34), section et traitement des voliges.
- Compte rendu : `docs/lot-comptoir.md`.

## roofing-2026.10.04-24 — bobineau au-delà de 6 ml

- **Bobineau** (réponse du fondateur) : pour les bandes façonnées sur place (égout, rive, faîtage, noue, solin, abergement), au-delà de **6 ml** un bobineau remplace les feuilles 2 × 1 m. Largeurs 500, 650, 1 000 mm ; longueurs 17, 21, 31 m (40 m en 500) ; épaisseur du chantier (0,65 par défaut, 0,70, 0,80). Vendu à la pièce, désignation « Bobineau 500 × 17 m, 0,65 ». Choix : la plus petite largeur qui contient le développé, la plus courte longueur qui couvre le zinc à façonner (marge 10 % comprise) ; au-delà, plusieurs bobineaux de la plus grande longueur. Chantier Test : 13 ml de bande d'égout → **1 bobineau 500 × 17 m, 0,65** (avant : 3 feuilles 2 × 1 m).
- Le développé n'est plus demandé quand il ne change pas l'article (un bobineau de 500 mm contient tous les développés proposés) ; il l'est toujours pour les feuilles et pour une bande **commandée façonnée** (elle se fabrique à son développé).
- Moteur (générique) : désignation calculée d'un article (`designation`, même écriture que la précision) ; une donnée à boutons peut être bornée à ses réponses tant qu'elle n'est pas répondue (`withinChoices`) ; la règle des 3 % ne remplace jamais par une hypothèse une donnée exigée par une précision (`precisionRequires`) ; une précision s'écrit dès que ses propres valeurs sont sûres.

## roofing-2026.10.04-23 — sortie de toit décomposée, longueurs expliquées

- **Sortie de toit** (nouvel ouvrage `sortie-de-toit`, réponse du fondateur) : une sortie = une **embase plomb** (ardoise, tuile) ou une **platine zinc soudée** (zinc), au diamètre du conduit, plus un **chapeau** ; une **collerette d'étanchéité** (solin) seulement pour un conduit de fumée. Questions à boutons : diamètre Ø 80 / 100 / 125 / 150 / 180 ou VMC, puis conduit de fumée ou ventilation. La couverture se lit sur les autres ouvrages du devis (zinc à joint debout → platine ; ardoises ou tuiles → embase), sinon sur la ligne (« tuile HP10 »), sinon on demande. « VMC », « poêle », « fumée », « ventilation », « Ø 150 » écrits dans la ligne sont lus. Le diamètre part en précision (« Ø 150 », « VMC »). La ligne du devis n'est plus un article tel quel : D-2026-015 « Sortie de toit Poujoulat » devient embase + chapeau (+ collerette si fumée), après deux questions.
- **Précisions des longueurs** (même esprit que « 4 longueurs de 4 m (13 ml à couvrir) ») : bobine « 31 bacs × 7,15 m », liteaux « lattage 120 m², une file tous les 31 cm », contre-liteaux « contre-lattage 120 m², une file tous les 90 cm », tubes de descente « 2 descentes × 4 m ».
- Moteur (générique, sans changement de règle) : une donnée peut se lire par un mot de la ligne (`textValues`) ou sur les autres ouvrages du devis (`fromWorks`) ; une donnée qui change l'ARTICLE sans changer la quantité est demandée (`precisionRequires`) ; une précision écrit une donnée comme elle se dit (`display`, « Ø 150 »).

## roofing-2026.10.04-22 — surlongueur de bobine, bâche fournie

- **Surlongueur de bobine** (réponse du fondateur) : **15 cm par bac** (10 en égout, 5 en faîtage), ajoutés au rampant avant de multiplier par le nombre de bacs. Chantier Test, 91 m², rampant 7 m, bobine 500 : 31 × 7,15 = **222 ml** (avant : 217 ml). 91 m², rampant 5,5 m : 39 × 5,65 = **221 ml** (avant : 215 ml).
- **Bâche de protection** : une fourniture (famille `tarpaulin` du métier), elle part au fournisseur telle qu'écrite ; « bâche » n'est plus un mot de main d'œuvre.

## roofing-2026.10.04-21 — sortie de toit : le diamètre à boutons

- **Sortie de toit** (famille `roof_outlet`, réponse du fondateur : « boutons Ø 80 / 100 / 125 / 150 / 180 ou VMC ») : la ligne reste telle qu'écrite (marque, modèle) ; quand elle ne dit pas le diamètre (ni « Ø », ni « diamètre », ni « VMC », ni « 80/100/125/150/180 mm »), elle est orange avec une question à six boutons. La réponse part dans la colonne « précision » (« Ø 150 ») ; « Je ne sais pas » : la ligne part telle quelle, à préciser avec le fournisseur (gris). Nouveau champ de famille `ask` (question, boutons, expression « déjà dit »).
- Collerette, bobineau, surlongueur de bobine : en attente des valeurs du fondateur, rien d'inventé.

## roofing-2026.10.04-20 — chantier Test (§45.5) : ce que le comptoir sert

- **Pattes du joint debout** : deux lignes, **pattes coulissantes** et **pattes fixes**, au lieu d'une somme (VMZINC 36.2, tableaux séparés par largeur de bobine). Chantier Test, 91 m², rampant 7 m, bobine 500 : 91 × 5,70 = **519 coulissantes**, 91 × 1,90 = **173 fixes**. Plus une troisième ligne, les **pointes annelées 2,5 × 28 mm** (volige 18 mm), 2 par patte (§36.2) : **1 384 pièces**. Familles `seam_clip_sliding`, `seam_clip_fixed`, `clip_fixing`.
- **Égout et faîtage du joint debout** : question à boutons « Égout et faîtage / Faîtage seulement / Égout seulement / Déjà au devis » (`egout_faitage`, sans défaut : le devis les cite souvent sur une autre ligne). Égout : largeur du pan × 1,05 ÷ 1,9 m utile → bandes d'égout à ourlet développé 33 cm en **longueurs de 2 m** (§7) ; faîtage : largeur du pan × 1,05 en longueurs de 3 m.
- **Bandes zinc façonnées** : dites en **longueurs de 2 m** (« 8 longueurs de 2 m »), plus en « pièces ».
- **Précision par ligne** (champ `precision` d'un besoin, §45.3) : ce qui sert au comptoir, avec les valeurs du chantier (« pour façonner 13 ml de bande, développé 33 cm », « pour bobine 500 mm, zone fixe de chaque bac », « 2 par patte, sur volige 18 mm »). Une feuille 2 × 1 m porte toujours son usage (§45.5).
- **Longueurs** : quand la longueur achetée diffère de la longueur à couvrir, les deux sont écrites : « 4 longueurs de 4 m (13 ml à couvrir) » ; jamais « soit 13 ml » (§45.5).
- Un composant dont la règle existe mais que la réponse écarte (bandes façonnées quand l'artisan façonne) ne part plus « à chiffrer » avec « pas encore de règle ».

## roofing-2026.10.04-19 — bobine de zinc au mètre linéaire, jamais au kg

- **Joint debout, « je façonne »** (retour du fondateur) : la bobine se commande au **mètre linéaire**, plus en kg. Une bande par bac, à la longueur du rampant : nombre de bacs (largeur du pan ÷ largeur utile 430 ou 580 mm) × rampant. 91 m², rampant 5,5 m, bord de mer : 39 × 5,5 = **215 ml de bobine 500 mm** (avant : 501 kg). Rampant 12 m profilé sur place : 18 × 12 = 216 ml. La largeur est écrite sur la ligne (deux articles : bobine 500 mm en bord de mer, 650 mm ailleurs) ; l'épaisseur reste dite et part dans « Le chantier en bref ». Les poids VMZINC (5,5 / 6 / 7 kg/m²) ne servent plus au calcul.

## roofing-2026.10.04-18 — voligeage seul

- **Voligeage** (nouvel ouvrage `voligeage`, famille `sheathing`) : une ligne « Voligeage en sapin traité 18×200 mm, 91 m² » ne reste plus « article inconnu » : 91 m² × 1,05 = 96 m² de voliges sapin 18 mm (§7 « Support voligeage : m² rampant × 1,05 »). Sous un zinc à joint debout, la volige reste à l'ouvrage zinc (un seul article). « voligeage » ajouté au vocabulaire du couvreur.

## roofing-2026.10.04-17 — retour du fondateur : tuiles canal, zinc en feuilles, toutes les questions d'un coup

- **Tuiles canal** (famille `roof_tile_canal`, source Edilians « canal-tuiles-edilians.pdf ») : une ligne « tuiles canal » n'est plus lue comme une tuile à emboîtement (avant : HP 10 proposée). Une famille peut en affiner une autre (`refines`) : le mot le plus précis de la ligne l'emporte. Modèle à préciser → question à boutons (Canal 50, Gironde 50, Lyonnaise 40, Charentaise…) ; recouvrement R140 à R170 demandé d'emblée (sauf tuiles à blocage, recouvrement fixe). Tuiles = surface × nombre au m² du fabricant (couvert + courant), liteaux au m², bardelis 2,7 au ml de rive. Exemple : Gironde 50, R150, 100 m² → 2 540 tuiles, 307 ml de liteaux.
- **Zinc façonné sur place** (bandes, solins, abergements) : en **feuilles de 2 × 1 m** (2 m², §25.2), plus en kg. Bandes : arrondi sup (ml × développé ÷ 2 m²) ; abergement : périmètre × 0,33 ÷ 2 m². Le joint debout reste en bobine au kg (VMZINC). Le bobineau n'est pas modélisé (pas de donnée).
- **Gouttières et descentes** : jamais de question de façonnage (pièces commandées toutes faites).
- **Questions** : le moteur découvre d'avance les questions qui suivent une réponse (il essaie chaque réponse possible) ; l'écran les pose toutes d'un coup, une seule validation.

## roofing-2026.10.03-16 — le fournisseur chiffre en dernier recours

- **Modèle refusé** (« aucun de ces modèles ») : le moteur calcule quand même avec le produit générique de la famille, étiqueté « modèle à préciser » ; le fournisseur met sa marque. Avant : la ligne partait « à chiffrer ». Exemple D-2026-015 : 29 faîtières (modèle à préciser) + 29 crochets, plus rien à chiffrer.
- **Bandes zinc au ml** (nouvel ouvrage `bandes-zinc`, famille `zinc_strip` : bande de ventilation, de solin, de rive, d'égout, couvre-joint, bavette) : question « développé ? » (100 / 250 / 330 / 400 mm, §36.4) et « tu façonnes ? ». Façonné : ml × 1,1 ÷ 1,9 → bandes de 2 m (§7, §36.4). Je façonne : ml × 1,1 × développé × 4,7 kg/m² (0,65 ; 5,04 en 0,70 ; 5,76 en 0,80 : 7,2 kg/m² par mm) en bobine, réunis avec le zinc du joint debout. Avant : « du métal au mètre sans largeur ni épaisseur », à chiffrer.
- **Abergement de cheminée** (nouvel ouvrage `abergement-cheminee`, famille `chimney_flashing` : entourage, abergement, solin de cheminée) : question « périmètre d'une cheminée ? » (2 / 3 / 4 / 5 m), puis périmètre × 1,3 en zinc développé 33 cm (§7) en bandes de 2 m ou en kg, et bande porte-solin au périmètre (longueurs de 2 m). Avant : « pas encore de règle », à chiffrer.
- Une ligne dont l'emplacement est « mesure seulement » (joint debout, abergement) a son rôle « mesure » d'office : plus de question « 2 : entourages à commander ou cheminées ? ».
- **Joint debout, rampant de plus de 10 m** (`bacs_longs`, §7 « bacs profilés à longueur (max 10 à 15 m) ») : si l'artisan commande façonné et que le rampant dépasse 10 m, question « bobine profilée sur place, ou bacs en plusieurs longueurs ? ». Profilée sur place : zinc en bobine au kg ; plusieurs longueurs : nombre de travées × arrondi sup (rampant / 10 m) bacs. Une condition de besoin (`when`) peut désormais citer une constante de l'ouvrage (`regle.rampant_max_bac`).
- **Panneaux OSB** (produit générique `panneau-osb-standard`, famille volige, §7 « 2,50 × 1,25 = 3,125 m² ») : commandé au m² (admis pour un panneau, §40.3) avec le nombre de panneaux à côté (« 96 m², ≈ 31 panneaux de 2,50 × 1,25 m »).
- Les dimensions lues par le prompt A (pente, rampant, épaisseur, développé, périmètre… dans la ligne ou l'en-tête) entrent dans le calcul comme faits du chantier, après le texte lu par le code et avant les hypothèses par défaut ; une pente en % est convertie en degrés.

## Version roofing-2026.10.03-15 (appliquée dans le moteur) — référentiel 41 sections

- **Joint debout (§7, §36)** : nouvel ouvrage `couverture-zinc-joint-debout`. Question d'ouverture (§40.2) : « Tu façonnes tes bacs toi-même, ou tu les commandes façonnés ? » ; « je façonne » → zinc en bobine en **kg** (5,5 / 6 / 7 kg/m² selon 0,65 / 0,70 / 0,80 mm, VMZINC 36.1), largeur 500 mm en bord de mer, 650 ailleurs ; « commandé façonné » → **bacs** = largeur du pan (surface ÷ rampant) ÷ entraxe (430 / 580 mm), à la longueur du rampant. Pattes par m² selon le rampant (tableau 36.2, fixes + coulissantes). Voliges sapin 18 mm = m² × 1,05 (§7). La question est posée par chantier : la mémoire des habitudes ne couvre pas encore les réponses, seulement les produits.
- **Test du fournisseur (§40, verrou §41.3)** : une ligne du devis en m², en ml de métal sans largeur ni épaisseur, en « lot », « forfait » ou « ensemble » ne part plus en commande : elle va chez « Le fournisseur chiffrera » avec sa mesure et la raison. Les panneaux et rouleaux (volige, OSB, écran, isolant) restent admis au m².
- **Questions (§41)** : plus de maximum ; la règle devient « une question si la réponse change une quantité de plus de 3 %, une unité ou un matériau ». Le tri par sensibilité reste à faire : aujourd'hui, toute donnée manquante est demandée.
- **Moteur** : condition d'existence d'un besoin (`when`), emplacement de mesure seule (`measureOnly`), surcharges de libellé et de quantité par l'artisan (§41.4).

## Version roofing-2026.10.03-14 (appliquée dans le moteur)

**Recouvrement hors des bornes Cupa d'un format (§34)** — 32×22 : 69 à 103 mm ; 30×22 : 69 à 100 mm… Règle du fondateur :

- **Le devis nomme le format (ou l'artisan l'a choisi) : on le garde toujours.** La formule Cupa calcule, la ligne est marquée « estimation, recouvrement hors table Cupa », et le format voisin (plage la plus proche qui admet ce recouvrement) est proposé en conseil : une hypothèse à boutons, jamais une question bloquante.
- **Le format ne vient pas du devis** (habitude de l'entreprise, défaut) : UNE question à boutons, le voisin « conseillé » en premier.

| Cas | Résultat |
|---|---|
| 32×22, 45°, région III, rampant 6 m (R 105) — exemple du §3, format du devis | 8 840 ardoises, « estimation » ; conseil : 33×23, puis 35×22, 35×25, 40×22 |
| 30×22, 30°, région III (R 120), format du devis | calculé par la formule, « estimation » ; conseil : 40×22 |
| même cas, format venu d'une habitude | question : « Ardoises 30×22 non admis ici : … Quel format ? », 40×22 (conseillé) en premier |

## Version roofing-2026.10.03-12

Décision du fondateur : **la table Cupa (§34) fait foi** pour tous les formats et recouvrements qu'elle couvre ; la formule Cupa ne sert qu'hors table.

| Élément | -11 | -12 |
|---|---|---|
| Ardoises au m² | formule Cupa partout | **table Cupa (194 lignes du §34)**, lue sur le recouvrement posé (hauteur − 2 × pureau) ; formule Cupa seulement hors table, dite « hors table » |
| Diamètre du crochet | change toujours le nombre | toujours affiché et modifiable ; ne change le nombre que hors table |
| 200 m², 30×22, 40°, région III (R 100) | 9 050 + 5 % | **44,8/m² → 9 408** |
| 200 m², 30×22, 45°, région I (R 80) | 8 639 | **40,7/m² → 8 547** |
| 200 m², 30×22, 45°, région III (R 95, hors table) | 9 271 / 9 200 à Brest | inchangé (formule) |
| Région ardoise | — | marquée **« estimation »** dans l'explication (zone climatique du département, en attendant la liste du DTU 40.11) |

## Version roofing-2026.10.03-11

Demandé par le fondateur avant la fusion de la porte `/v1/quantitatifs` :

| Élément | Avant (-10) | Maintenant (-11) |
|---|---|---|
| Ardoises au crochet | surface / (largeur × pureau) | formule Cupa §34 : surface / [pureau × (largeur + Ø crochet)] |
| Ø du crochet | non compté | 1 mm ; **inox 2,7 mm d'office si le chantier est dans un département littoral** (code postal) ; modifiable |
| 200 m², 30×22, 45°, région III | 9 313 ardoises | 9 271 (crochet 1 mm) ; **9 200 à Brest** (2,7 mm) |
| Crochets d'ardoise | même calcul que les ardoises, + 2 % (9 047 : moins que les ardoises) | **ardoises commandées (après marge) × 1,02** : 9 457 (1 mm), 9 384 à Brest ; jamais moins que les ardoises (test permanent) |
| Nom dans l'explication | « zone climatique 3 » | « région ardoise III » (DTU 40.11 ; la zone climatique reste pour les tuiles) |

Reste à faire (étape 3 du plan v3) : la table Cupa elle-même (§34) avant la formule, et la table des régions ardoise par département (§26, « à saisir depuis le DTU »). En attendant, la région ardoise prend la valeur de la zone climatique du département.

## Référentiel du 3 octobre 2026, 39 sections

Consigne du §37 : quand les sections 34, 35 et 36 (sources fabricant) contredisent les sections 3, 5 et 7, ce sont 34-36 qui font foi. Les anciennes valeurs sont notées ici avec la mention « remplacé par source fabricant ». Les sections 3, 5 et 7 restent utilisées pour les matériaux que 34-36 ne couvrent pas encore (fibres-ciment, tuiles béton, modèles non listés), chargées avec `confiance: "estimation"`.

### §3 Ardoise naturelle → §34 Table officielle Cupa — remplacé par source fabricant

| Élément | Ancienne valeur (§3) | Nouvelle valeur (§34) |
|---|---|---|
| Formule ardoises/m² | 1 000 000 / (L × pureau), L et pureau en mm | 1 / [P × (L + Ø crochet)], Ø 1 mm (0,0027 m inox en zone littorale) |
| Longueur de crochet | pureau + 10 à 20 mm | R + 1 cm environ (R 100 → 11 cm, R 90 → 10, R 80 → 9, R 70 → 8) |
| 40×22, R 100 | 30,3 ardoises/m² | 29,9 |
| 35×25, R 100 | 32,0 | 31,6 |
| 35×22, R 100 | 36,4 | 35,9 |
| 33×23, R 100 | 37,8 | 37,3 |
| 32×22, R 100 | 41,3 | 40,7 |
| 30×22, R 100 | 45,5 | 44,8 |
| 30×20, R 100 | 50,0 | 49,2 |
| 30×18, R 100 | 55,6 | 54,6 |
| Recouvrement hors table | ligne voisine du tableau | interpolation par les formules Cupa ; R hors bornes du format = format non admissible, proposer le voisin |

### §5 Tuiles → §35 Fiches Edilians — remplacé par source fabricant

| Élément | Ancienne valeur (§5) | Nouvelle valeur (§35) |
|---|---|---|
| Grand moule (HP10, Alpha 10, Double Romane…) | pureau 34 à 37 cm, 10 à 11 tuiles/m², liteaux 2,8 à 3,0 ml/m² | par modèle : HP10 pureau 310-376 mm, 9,9-12/m², liteaux 3,22 / 2,66 ; Alpha 10 330-370 mm, 10-11,2/m² ; etc. (tableau 35.1) |
| Petit moule (Marseille, Losangée, Beauvoise) | pureau 24 à 26 cm, 13 à 15/m², liteaux 4,0 à 4,2 | Marseille Poudenx 317-370 mm, 12,3-14,3/m² ; Beauvoise 242-248 mm, 20,2-20,7/m², liteaux 4,08 |
| Canal | 22 à 28 tuiles/m² au total | nombre donné pour le couvert seul, × 2 pour couvert + courant, selon le modèle et R 140-170 (tableau 35.3) |
| Pentes minimales | 28.1 : 14-16° grand moule, 17-20° petit moule *(à vérifier)* | tableaux DTU 40.21/40.22 par famille A/B/C, zone, site et rampant (35.4) |
| Pureau par défaut | pureau mini en zone 3 et pente < 35 % | pureau maxi par défaut, pureau mini en zone 3, site exposé ou rampant long |

### §7 Zinc joint debout → §36 Données VMZINC — remplacé par source fabricant

| Élément | Ancienne valeur (§7) | Nouvelle valeur (§36) |
|---|---|---|
| Poids | kg ≈ m² développé × 4,7 (0,65 mm) | 5,5 kg/m² posé (0,65), 6 (0,70), 7 (0,80) |
| Pattes | 3 pattes/ml de joint, 3 à 4 fixes par bac | pattes coulissantes et fixes par m², selon le rampant et la bobine (tableau 36.2) |
| Fixation des pattes | 2 vis ou pointes par patte | selon l'épaisseur du support : vis 4×30 ou pointe annelée 2,8×25 / 2,5×28 ; 2 par patte (à vérifier sur le modèle) |
| Joint de dilatation / ressaut | 1 tous les 10 à 15 m | longueur maxi des feuilles selon pente et zone (tableau 36.3) ; au-delà, jonction transversale |
| Épaisseur 0,70 mm | au-delà de 900 m d'altitude ou bacs > 10 m | 0,70 minimum pour une pente > 173 % (bardage) |
| Largeur 500 mm | zone 3 exposé et zone 4 | idem, et pente > 173 % ; zones de vent NV65 (36.1) |
