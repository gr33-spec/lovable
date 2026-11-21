# Référentiel quantitatif PLAFONDS SUSPENDUS (Rappidos)

Oct 3, 2026 · @Greg

Tiroir métier `plafonds-suspendus` v1.0.0-beta pour le moteur générique BatiClair (gabarit section 27 du référentiel couverture). Il couvre les deux familles du métier : plafonds en plaques de plâtre vissées sur ossature suspendue (NF DTU 25.41) et plafonds modulaires démontables à dalles sur ossature T (NF DTU 58.1). Toute valeur sans source est marquée *(à vérifier)* ; les ratios doivent être relus par un plaquiste/plafiste avant mise en production.

Périmètre exclu (autres tiroirs) : cloisons et doublages (plâtrerie), isolant posé sur le plafond (isolation), luminaires et dalles LED (électricité), peinture du plafond (peinture), plafonds tendus, lames PVC et lambris (à créer plus tard).

## 1. Métier et axes de variation

Le plafond suspendu est un métier piloté par la norme et le type de bâtiment, presque pas par la région : la même ossature et les mêmes plaques se posent à Paimpol et à Nice. Ce qui change le quantitatif, c'est la famille de plafond (plaques ou dalles), le support au-dessus (béton, bois, fermettes) et la hauteur du plénum.

### 1.1 Fiche d'identité `metier.json`

```json
{
  "code": "plafonds-suspendus",
  "nom": "Plafonds suspendus (plaques et dalles)",
  "version": "1.0.0-beta",
  "normes": ["NF DTU 25.41", "NF DTU 58.1", "NF EN 13964", "NF EN 520"],
  "axes_de_variation": {
    "geographie": "faible",
    "epoque_bati": "moyen",
    "type_batiment": "fort",
    "neuf_renovation": "moyen",
    "gamme": "moyen"
  },
  "metiers_lies": ["platrerie", "isolation", "electricite", "peinture"],
  "unites_de_commande": ["plaque", "barre", "botte", "boite", "carton", "sac", "seau", "rouleau", "u"],
  "maturite": "beta"
}
```

### 1.2 Poids de chaque axe

| Axe | Poids | Ce qu'il change dans la commande |
| --- | --- | --- |
| type\_batiment | fort | Logement → plaques BA13 vissées ; bureau, commerce, école, ERP → dalles démontables, exigences feu (plaques Placoflam, PRF) et acoustique |
| epoque\_bati | moyen | Ce qu'il y a au-dessus : dalle béton (récent), solives bois ou fermettes (ancien, pavillon), hourdis → type de suspente et de fixation |
| neuf\_renovation | moyen | Rénovation : plénum souvent réduit (suspentes courtes), dépose de l'ancien plafond hors tiroir, pièces plus petites → pertes plus fortes |
| gamme | moyen | Plaque standard, hydro (pièce humide), feu, phonique ; dalle minérale basique ou acoustique haut de gamme → change l'article, pas la méthode |
| geographie | faible | Zone sismique (contreventement des plafonds à dalles) et ambiance humide ; aucun matériau régional |

## 2. Règle d'or et unités de commande

**Jamais un m² en sortie.** Le devis parle en m² de plafond ; le négoce livre des plaques, des barres, des boîtes et des sacs. Chaque ligne du quantitatif doit pouvoir être tapée telle quelle dans un bon de commande, avec la dimension de l'article.

| Article | Unité de commande | Exemple de ligne prête à commander |
| --- | --- | --- |
| Plaque de plâtre | plaque (avec longueur × largeur) | 5 plaques BA13 2500 × 1200 |
| Fourrure, cornière, rail, porteur T24 | barre (avec longueur), ou botte si gros volume | 10 fourrures F530 3 m |
| Entretoise T24 | u (avec longueur 600 ou 1200) | 42 entretoises T24 1200 |
| Suspente, éclisse, attache | boîte (50 ou 100) | 1 boîte de 50 suspentes longues F530 |
| Vis | boîte (1000) | 1 boîte vis TTPC 25 × 1000 |
| Dalle de plafond | carton (avec nb de dalles par carton) | 6 cartons de 16 dalles 600 × 600 |
| Enduit à joint | sac (poudre) ou seau (prêt à l'emploi) | 1 sac 25 kg enduit poudre |
| Bande à joint | rouleau | 1 rouleau bande papier |
| Tige filetée, cheville | u ou boîte | 26 chevilles métal à frapper 6 × 30 |

Arrondis : toujours à l'unité supérieure, après pertes. Une boîte entamée se commande entière. Si un article existe en plusieurs longueurs (plaques 2,50 / 2,60 / 3,00 m ; fourrures 3 / 5,30 m), le moteur prend la longueur par défaut (section 6) et l'affiche en hypothèse.

## 3. Ouvrages du métier, vocabulaire des devis et pièges

Six ouvrages couvrent l'essentiel des devis. Chaque ligne de devis est rattachée à un ouvrage par `vocabulaire.json` ; un mot inconnu déclenche une question, jamais une supposition.

| Code ouvrage | Ce que c'est | Expressions courantes dans les devis | Pièges |
| --- | --- | --- | --- |
| `plafond_plaque_simple` | 1 plaque BA13 vissée sur fourrures F530/F47 suspendues | « faux plafond placo », « plafond BA13 sur ossature », « plafond suspendu plaque de plâtre », « Placostil », « faux plafond rail fourrure », « plafond sous fermettes » | « plafond placo » seul peut être un plafond collé ou sur tasseaux bois → demander si ossature métal |
| `plafond_plaque_double` | 2 plaques BA13 (feu, acoustique) | « 2 BA13 », « double peau », « REI 30/60 », « coupe-feu 1 h », « plafond phonique » | doubler les plaques et les vis, pas l'ossature ; entraxe souvent réduit *(à vérifier fiche système)* |
| `plafond_plaque_hydro` | variante pièce humide | « BA13 hydro », « plaque verte », « H1 », « Placomarine », « salle de bain », « SDE » | même ossature, autre plaque ; enduit adapté *(à vérifier)* |
| `plafond_dalles_600` | dalles 600 × 600 sur ossature T24 apparente | « faux plafond dalles », « plafond démontable », « dalles 60×60 », « T24 », « dalles minérales », « Rockfon », « Armstrong », « Ecophon », « Tropic », « Artic » | « dalle LED 60×60 » = luminaire (électricité), mais elle remplace une dalle : la déduire du nombre de dalles |
| `plafond_dalles_1200` | dalles 1200 × 600 sur ossature T24 | « dalles 120×60 », « 1200×600 » | pas d'entretoise 600 ; ratios différents |
| `plafond_ossature_seule` | réfection de dalles ou d'ossature seule | « remplacement dalles », « changement de dalles », « reprise ossature » | ne commander que la partie citée ; ne jamais ajouter d'ossature en remplacement de dalles |

Autres pièges fréquents : « plafond rampant » ou « sous rampants » = plafond incliné en combles, calcul identique mais surface du rampant et non surface au sol ; « isolation + plafond » = l'isolant est un autre tiroir ; « joue », « retombée », « caisson », « soffite » = parties verticales comptées en ml × hauteur, souvent en plaques et rails de cloison (tiroir plâtrerie) ; « corniche », « gorge lumineuse » = point singulier (section 9) ; « m² » d'un devis à dalles est la surface au sol de la pièce, la perte sert au calepinage, pas à une marge.

## 4. Matériaux et fiches fabricant

Placo (Saint-Gobain) sert de référence pour les plafonds plaques, Rockfon / Chicago Metallic pour les dalles et l'ossature T24. Knauf (fourrure F47) et Siniat (Prégy) sont des équivalents : même entraxe, même ratio, seul le nom d'article change *(équivalence à vérifier sur leurs fiches)*.

### 4.1 Plafonds en plaques (DTU 25.41)

| Article | Dimensions | Rendement / usage | Conditionnement | Poids | Source |
| --- | --- | --- | --- | --- | --- |
| Plaque BA13 standard (Placoplatre BA13) | 12,5 mm × 1200 × 2000 / 2500 / 2600 / 2800 / 3000 / 3600 ; existe en 600 de large | 3 m² par plaque 2500 × 1200 | pile de 40 ou 50 plaques | ≈ 8,1 à 10,2 kg/m² selon la fiche consultée *(à vérifier fiche FR à jour)* | [Batiproduits / Placo](https://www.batiproduits.com/fiche/produits/plaque-de-platre-cartonnee-m1-p68904883.html) |
| Plaque BA13 phonique (Placo Phonique) | 12,5 × 1200 × 2500 à 3000 | idem | pile de 50 (40 en 3000) | 11,8 kg/m² ; 35,5 kg la plaque de 2,50 m | [Fiche Placo Phonique](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_412644.pdf) |
| Plaque BA13 haute dureté (Placodur) | 12,5 × 1200 × 2500 à 3000 | idem | pile de 50 | 11,5 kg/m² ; 35,4 kg la plaque de 2,50 m | [Fiche Placodur](https://www.placo.fr/documents/fiche-technique/fichetechnique-placodur-ba-13.pdf) |
| Plaque BA13 A1 (Lisaplac) | 12,5 × 1200 × 2500 / 3000 | idem | pile de 50 | 9,3 kg/m² ; 27,9 kg la plaque de 2,50 m | [Fiche Lisaplac](https://www.placo.fr/documents/fiche-technique/fichetechnique-lisaplac-ba-13.pdf) |
| Plaque BA13 hydro (Placomarine, H1) | 12,5 × 1200 × 2500 | pièces humides | pile *(à vérifier)* | *(à vérifier)* | *(à sourcer)* |
| Fourrure Stil F530 | 45 × 18 mm, acier 0,59 mm ; 3,00 m ou 5,30 m | 2 ml/m² de plafond à entraxe 60 cm (Placo) ; 1,79 ml/m² dans une fiche système Placo | botte de 10 (3 m) ; 13/botte pour la fourrure PRF | — | [Placo tuto F530](https://www.placo.fr/comment-creer-un-plafond-suspendu-sur-ossature-suspentes-et-fourrures-stil-f530), [Matériaux Naturels](https://www.materiaux-naturels.fr/produit/1965-fourrure-placo-stil-f530-pour-plafond-doublage), [Batiproduits PRF](https://www.batiproduits.com/fiche/produits/fixation-pour-faux-plafonds-coupe-feu-jusqu-a-ei-p68905088.html) |
| Suspente longue Stil F530 (sous bois) | 171 mm | 1,8 u/m² (Placo) ; 1,56 u/m² dans une fiche système | boîte de 100 | — | [Placo tuto F530](https://www.placo.fr/comment-creer-un-plafond-suspendu-sur-ossature-suspentes-et-fourrures-stil-f530), [Placo système](https://www.placo.fr/Professionnels/Systemes/sy00008349/plafond-placostilr-sur-fourrures-stilr-f-530-sous-plancher-bois-1x-placoplatrer-ba-13-rei15-portee) |
| Suspente sécable Stil F530 | 600 mm, 6 modules de 10 cm, plénum 20 à 580 mm | charge admissible 55 kg ; 2 vis TTPC 35 par suspente | boîte de 50 | 9,7 kg la boîte | [Fiche Placo](https://www.placo.fr/documents/fiche-technique/fichetechnique-suspente-scable-stil-f-530.pdf) |
| Suspente courte, Maxi, cavalier dB, suspente + tige Ø 6 | selon plénum | même nombre que la suspente choisie | boîte de 50 ou 100 *(à vérifier par réf.)* | — | [Placo fiche plafonds A01](https://www.entrepot-du-bricolage.fr/mediaw/pdf/fiche_conseil_cavaliers-stil-pour-fourrure-f530-par-12-placo.pdf) |
| Cornière Stil CR2 | 34 × 23 mm, 3,00 m | périmètre de la pièce, fixée tous les 60 cm max | à la barre ; botte *(à vérifier)* | — | [Placo tuto F530](https://www.placo.fr/comment-creer-un-plafond-suspendu-sur-ossature-suspentes-et-fourrures-stil-f530), [Bricomarché](https://www.bricomarche.com/c/materiaux/cloison-et-plafond/ossature-metallique/130477?page=2) |
| Éclisse Stil F530 | 30 ou 50 cm | 1 par raccord de fourrure | botte de 10 | — | [Batiproduits PRF](https://www.batiproduits.com/fiche/produits/fixation-pour-faux-plafonds-coupe-feu-jusqu-a-ei-p68905088.html) |
| Vis TTPC 25 | 3,5 × 25 | 10 vis/m² en simple parement (Placo) | boîte de 1000 *(à vérifier ; existe en 500 et 1500)* | — | [Placo tuto F530](https://www.placo.fr/comment-creer-un-plafond-suspendu-sur-ossature-suspentes-et-fourrures-stil-f530) |
| Vis TTPC 35 | 3,5 × 35 | 2 par suspente sur bois | boîte *(à vérifier)* | — | [Fiche Placo suspente sécable](https://www.placo.fr/documents/fiche-technique/fichetechnique-suspente-scable-stil-f-530.pdf) |
| Bande à joint papier (Bande PP grand rouleau) | 52 mm *(à vérifier)* | 1,4 ml/m² | rouleau 150 m *(à vérifier)* | — | [Placo tuto F530](https://www.placo.fr/comment-creer-un-plafond-suspendu-sur-ossature-suspentes-et-fourrures-stil-f530) |
| Enduit à joint poudre (Placojoint PR4) | — | 0,33 kg/m² | sac 25 kg | 25 kg | [Placo tuto F530](https://www.placo.fr/comment-creer-un-plafond-suspendu-sur-ossature-suspentes-et-fourrures-stil-f530), [Placo système béton](https://www.placo.fr/professionnels/solution/sp00035378/plafonds-sur-fourrures-stil-f-530-plancher-beton-1x-placoplatre-ba-13-stil-f-530-et-r-f-530-06-m) |
| Enduit prêt à l'emploi | — | 0,47 kg/m² | seau 20 ou 25 kg *(à vérifier)* | — | [Placo tuto F530](https://www.placo.fr/comment-creer-un-plafond-suspendu-sur-ossature-suspentes-et-fourrures-stil-f530) |

### 4.2 Plafonds modulaires à dalles (DTU 58.1)

| Article | Dimensions | Rendement | Conditionnement | Poids | Source |
| --- | --- | --- | --- | --- | --- |
| Dalle minérale 600 × 600 (ex. Rockfon Tropic, Artic) | 600 × 600 × 15 ou 20 mm ; bord A (posé) ou E (feuilluré) | 2,78 dalles/m² | carton : 16 dalles = 5,76 m² (Tropic 15 mm, fiche UK) ; carton France *(à vérifier par négoce)* | Tropic 20 mm : 2,4 kg/m² (A) à 2,8 kg/m² (E) ; Artic 15 mm : 2,0 à 2,2 kg/m² | [Rockfon Tropic CH](https://prd-media.crb.ch/media/45343/Fiches_techniques_ROCKFON_Tropic_CH-FR.pdf), [Artic (Chausson)](https://cdn.chausson.fr/media/article-document/239623), [CCF UK](https://www.ccfltd.co.uk/Rockfon-Tropic-E15S8-600-x-600-x-15mm/p/564118) |
| Dalle minérale 1200 × 600 | 1200 × 600 × 15 ou 20 mm | 1,39 dalle/m² | carton *(à vérifier)* | idem | [Rockfon T24 A/E](https://www.rockfon.fr/siteassets/commerce/fr/grids/documents/documentation/guides-dinstallation-/fr-installation-guide-rockfon-system-t24-e-click-51_d_03_2021.pdf) |
| Porteur T24 (Chicago Metallic Click/Hook) | 24 × 38 mm ; 3600 mm (existe 2400 et 4050) | 0,83 ml/m² (entraxe 1200) | botte de 25 barres = 90 ml *(fiche Omnifix, à vérifier pour Chicago Metallic)* | — | [Rockfon T24 X](https://www.rockfon.com/syssiteassets/commerce/fr/grids/documents/documentation/guides-dinstallation-/fr-installation-guide-rockfon-system-t24-x-click-01_d_03_2023.pdf), [Omnifix (Samse)](https://private.samse.fr/catalogueWs/Fiche_technique/Fiche_technique_549027.pdf) |
| Entretoise T24 1200 | 24 × 38 mm, 1200 mm | 1,67 ml/m² = 1,39 u/m² | boîte de 50 *(Omnifix)* | — | idem |
| Entretoise T24 600 | 24 × 38 mm, 600 mm | 0,83 ml/m² = 1,39 u/m² (dalles 600 × 600 seulement) | boîte de 75 *(Omnifix)* | — | idem |
| Suspente pour ossature T (tige à œillet / suspente à ressort + tige) | selon plénum | 0,70 u/m² (suspentes tous les 1200 mm) | boîte *(à vérifier)* | — | [Rockfon T24 A/E](https://www.rockfon.fr/siteassets/commerce/fr/grids/documents/documentation/guides-dinstallation-/fr-installation-guide-rockfon-system-t24-e-click-51_d_03_2021.pdf) |
| Cornière de rive L (ou W à joint creux) | 24 × 24 mm *(à vérifier)*, 3000 mm | périmètre | à la barre ; botte *(à vérifier)* | — | idem (« dépend de la dimension de la pièce ») |
| Clip anti-soulèvement | — | 11,2 clips/m² en 600 × 600 ; 8,33 en 1200 × 600 (si exigé) | boîte *(à vérifier)* | — | [Rockfon CleanSpace](https://www.rockfon.fr/siteassets/commerce/fr/grids/documents/documentation/guides-dinstallation-/fr-installation-guide-rockfon-system-cleanspace-t24-a-e-ecr--new--67_d_11_2024.pdf) |

Règle : le conditionnement dans `materiaux.json` vient d'une fiche négoce (Point.P, Chausson, Samse, BigMat, Gedimat), pas du fabricant, car c'est le négoce qui livre. Les cartons de dalles sont le point le plus fragile du tiroir : ils varient par marque et par épaisseur.

## 5. Règles de calcul (DTU 25.41 et 58.1), formules et pertes

Deux modes. Mode **calepinage** quand le devis ou le chat donne les dimensions de la pièce (L × l) : plus juste, à privilégier. Mode **ratio** quand on n'a que la surface S : ratios fabricant au m². Notations : S surface (m²), L la plus grande dimension, l la plus petite, P périmètre (ml). Si P est inconnu : P ≈ 4,1 × √S (pièce rectangulaire 1,5 : 1), affiché en hypothèse *(à vérifier)*.

### 5.1 Règles de pose qui fixent les quantités

| Règle | Valeur | Source |
| --- | --- | --- |
| Entraxe des fourrures, plaques posées perpendiculairement | 60 cm max ; une fourrure obligatoire à chaque jonction de plaques | [Placo tuto F530](https://www.placo.fr/comment-creer-un-plafond-suspendu-sur-ossature-suspentes-et-fourrures-stil-f530) |
| Entraxe des fourrures, plaques parallèles | 40 cm *(source secondaire, à vérifier DTU 25.41)* | [MTS Construction](https://mts-construction.fr/fourrure-placo/) |
| Distance entre suspentes sur une même fourrure | 1,20 m max (portée F530) | [Placo système](https://www.placo.fr/Professionnels/Systemes/sy00008349/plafond-placostilr-sur-fourrures-stilr-f-530-sous-plancher-bois-1x-placoplatrer-ba-13-rei15-portee) |
| Suspentes de rive | aux 4 coins, à 60 cm max des cornières | Placo tuto F530 |
| Fixation des cornières / rails | tous les 60 cm max | Placo tuto F530 |
| Vissage des plaques | vis TTPC à 1 cm du bord min, 30 cm max entre vis ; longueur de vis = épaisseur plaque + 10 mm | Placo tuto F530 |
| Joint de fractionnement | tous les 25 ml ou 300 m², au droit des joints du gros œuvre, aux changements d'orientation (pièce en L) | Placo tuto F530 |
| Ossature T24 dalles | porteurs à 1200 mm, suspentes tous les 1200 mm ; charge max 9,9 kg/m² (600 × 600, flèche 2,5 mm) | [Rockfon T24 A/E](https://www.rockfon.fr/siteassets/commerce/fr/grids/documents/documentation/guides-dinstallation-/fr-installation-guide-rockfon-system-t24-e-click-51_d_03_2021.pdf) |
| Première suspente T24 depuis le mur | ≤ 450 mm *(source secondaire, à vérifier DTU 58.1)* | [CalculPro](https://calculpro.fr/outils/amenagement/plafond-suspendu-dalles-600x600) |
| Plénum > 2 m | ossature primaire obligatoire (profils longue portée) → l'app alerte et ne calcule pas l'ossature primaire | [Fiche PLP (Chausson)](https://cdn.chausson.fr/catalog-document/2a9f8a36-6780-4ec2-9a60-878b1f6cadbf/ficheproduitcaractristiquesgnrales-809962.pdf) |

### 5.2 Plafond en plaques sur fourrures (simple parement)

| Article | Mode calepinage (L, l connus) | Mode ratio (S seul) | Unité de commande |
| --- | --- | --- | --- |
| Plaques BA13 | arrondi\_sup(S × 1,05 ÷ surface plaque) | idem | plaque (2500 × 1200 = 3 m² par défaut) |
| Fourrures F530 | lignes = arrondi\_sup(l ÷ 0,60) + 1 ; barres = lignes × arrondi\_sup((L − 0,01) ÷ 3,00) | arrondi\_sup(S × 2,0 ÷ 3,00) | barre 3 m (5,30 m si L entre 3 et 5,30 m et dispo) |
| Éclisses | lignes × (barres par ligne − 1) | arrondi\_sup(barres × 0,3) *(à vérifier)* | boîte / botte de 10 |
| Suspentes | lignes × arrondi\_sup(L ÷ 1,20) | arrondi\_sup(S × 1,8) | boîte de 50 ou 100 |
| Fixation des suspentes | 2 par suspente : vis TTPC 35 sur bois ; cheville métal sur béton *(nombre à vérifier par support)* | idem | boîte |
| Cornière CR2 périphérique | arrondi\_sup(P × 1,05 ÷ 3,00) | P estimé | barre 3 m |
| Fixation des cornières | arrondi\_sup(P ÷ 0,60) + 4 (coins) | idem | boîte de chevilles ou vis |
| Vis TTPC 25 | arrondi\_sup(S × 10) | idem | boîte de 1000 |
| Bande à joint | S × 1,4 ml | idem | rouleau (150 m *à vérifier*) |
| Enduit poudre | S × 0,33 kg | idem | sac 25 kg |
| Enduit prêt à l'emploi (si devis le précise) | S × 0,47 kg | idem | seau |

Perte plaques : 5 % (ratio Placo 1,05 m²/m²). Pièce de moins de 10 m² ou très découpée (gaines, trémies) : 10 % *(à vérifier)*. Ratios Placo valables pour une ossature à entraxe 60 cm « jointoyée avec bande » ([Placo](https://www.placo.fr/comment-creer-un-plafond-suspendu-sur-ossature-suspentes-et-fourrures-stil-f530)).

**Double parement** : plaques × 2 ; vis de la 1re peau TTPC 25 et de la 2e peau TTPC 35 (longueur = épaisseur totale + 10 mm), S × 10 chacune *(à vérifier fiche système double BA13)* ; bande et enduit sur la 2e peau seulement ; ossature et suspentes selon la fiche système (entraxe ou portée parfois réduits) *(à vérifier)*.

### 5.3 Plafond modulaire à dalles sur ossature T24

| Article | Mode calepinage | Mode ratio | Unité de commande |
| --- | --- | --- | --- |
| Dalles 600 × 600 | arrondi\_sup(L ÷ 0,60) × arrondi\_sup(l ÷ 0,60) | arrondi\_sup(S × 2,78 × 1,05) | carton (diviser par dalles/carton, arrondi sup) |
| Dalles 1200 × 600 | arrondi\_sup(L ÷ 1,20) × arrondi\_sup(l ÷ 0,60) | arrondi\_sup(S × 1,39 × 1,05) | carton |
| Porteurs T24 3600 | lignes = arrondi\_sup(l ÷ 1,20) ; barres = arrondi\_sup(lignes × L ÷ 3,60) | arrondi\_sup(S × 0,83 ÷ 3,60) | barre 3,60 m (botte de 25) |
| Entretoises 1200 | S × 1,39 | idem | u (boîte de 50) |
| Entretoises 600 (600 × 600 seulement) | S × 1,39 | idem | u (boîte de 75) |
| Suspentes T | lignes × arrondi\_sup(L ÷ 1,20) | arrondi\_sup(S × 0,70) | u ou boîte |
| Fixation des suspentes | 1 par suspente *(à vérifier)* | idem | boîte de chevilles |
| Cornière de rive | arrondi\_sup(P × 1,05 ÷ 3,00) | P estimé | barre 3 m |

Ratios Rockfon : dalles 2,78 u/m² (600) ou 1,39 (1200), porteur 0,83 ml/m², entretoise 600 0,83 ml/m², entretoise 1200 1,67 ml/m², suspentes 0,70 u/m² ([Rockfon T24 X](https://www.rockfon.com/syssiteassets/commerce/fr/grids/documents/documentation/guides-dinstallation-/fr-installation-guide-rockfon-system-t24-x-click-01_d_03_2023.pdf)). En calepinage, les dalles coupées en rive comptent comme des dalles entières : c'est la perte réelle. Dalles LED, grilles de ventilation et trappes citées au devis se retranchent du nombre de dalles (1 pour 1).

## 6. Valeurs par défaut et hypothèses à afficher

Chaque défaut utilisé apparaît sous le quantitatif en une ligne courte (« Hypothèse : … »), modifiable d'un tap. Ordre de résolution : chantier → artisan → variation par axe → valeur nationale.

| Clé | Valeur nationale | Variations | Texte affiché |
| --- | --- | --- | --- |
| `famille` | déduite du devis | aucune | « Plafond en {plaques / dalles} » |
| `plaque_format` | 2500 × 1200 | 2600 ou 3000 si l est juste au-dessus de 2,50 m *(à vérifier)* | « Plaques {L} × 1200 » |
| `plaque_type` | BA13 standard | hydro si pièce humide ; feu/Placoflam si « coupe-feu », « REI » ; phonique si « acoustique » | « Plaque {type} » |
| `perte_plaque_pct` | 5 | 10 si S < 10 m² *(à vérifier)* | « Perte plaques {valeur} % » |
| `entraxe_fourrure_m` | 0,60 | 0,40 si pose parallèle *(à vérifier)* | « Fourrures tous les {valeur} m » |
| `longueur_fourrure_m` | 3,00 | 5,30 si 3 < L ≤ 5,30 et disponible au négoce | « Fourrures de {valeur} m » |
| `support` | béton si `type_batiment` ≠ maison ; bois sinon | réponse à la question support | « Plafond fixé sous {support} » |
| `suspente` | longue F530 | courte si plénum < 10 cm ; suspente + tige filetée Ø 6 si plénum > 50 cm *(seuils à vérifier)* | « Suspentes {type} » |
| `enduit` | poudre sac 25 kg | prêt à l'emploi si le devis le dit | « Enduit {type} » |
| `dalle_format` | 600 × 600 | 1200 × 600 si devis | « Dalles {format} » |
| `dalle_bord` | A (posé, 15 mm) | E si « feuilluré » ou « semi-apparent » | « Dalles bord {valeur} » |
| `dalles_par_carton` | lu dans `materiaux.json` par article | — | « Carton de {n} dalles » |
| `perimetre_estime` | 4,1 × √S | remplacé dès que L et l sont connus | « Périmètre estimé {P} ml » |

Extrait `defauts.json` :

```json
{
  "perte_plaque_pct": {
    "valeur": 5,
    "variations": [ { "si": { "chantier.surface_m2": "<10" }, "valeur": 10 } ],
    "afficher": "Perte plaques {valeur} %"
  },
  "support": {
    "valeur": "beton",
    "variations": [ { "si": { "type_batiment": "maison" }, "valeur": "bois" } ],
    "afficher": "Plafond fixé sous {valeur}"
  }
}
```

## 7. Questions à poser (boutons, 4 maximum, jamais une quantité)

Le moteur ne pose que les questions dont la réponse n'est pas déjà dans le devis, par sensibilité décroissante, 4 au plus. La sensibilité est l'écart sur le quantitatif si la valeur par défaut est fausse ; ici plusieurs questions changent l'**article** commandé plutôt que la quantité (100 % de la ligne fausse).

| Priorité | Question (texte à l'écran) | Boutons | Si pas de réponse | Sensibilité | Lignes touchées |
| --- | --- | --- | --- | --- | --- |
| 0 | « Plafond en plaques ou en dalles ? » | Plaques vissées · Dalles démontables | bloque : l'app ne peut pas calculer | 100 % | tout |
| 1 | « Au-dessus du plafond, il y a ? » | Béton · Bois (solives, fermettes) · Autre | défaut `support` | 100 % | suspentes, fixations |
| 2 | « Le plafond descend de combien ? » | Moins de 10 cm · 10 à 50 cm · Plus de 50 cm | suspente longue | 100 % | suspentes, tiges |
| 3 | « Pièce humide (salle de bain, cuisine pro) ? » | Oui · Non | non | 100 % | plaques (hydro), dalles (classe hygro) |
| 4 | « Format des dalles ? » | 60 × 60 · 120 × 60 | 60 × 60 | 50 % | dalles, entretoises 600 |
| 5 | « Une ou deux plaques ? » (seulement si devis cite feu/acoustique sans préciser) | Une · Deux | une | 100 % | plaques, vis |

Extrait `questions.json` :

```json
[
  {
    "id": "support",
    "ouvrages": ["plafond_*"],
    "priorite": 1,
    "si_inconnu": "support",
    "texte": "Au-dessus du plafond, il y a ?",
    "boutons": [ { "label": "Béton", "valeur": "beton" }, { "label": "Bois (solives, fermettes)", "valeur": "bois" }, { "label": "Autre", "valeur": null } ],
    "defaut": "@defauts.support",
    "sensibilite_pct": 100
  },
  {
    "id": "plenum",
    "ouvrages": ["plafond_plaque_*", "plafond_dalles_*"],
    "priorite": 2,
    "si_inconnu": "plenum_classe",
    "texte": "Le plafond descend de combien ?",
    "boutons": [ { "label": "Moins de 10 cm", "valeur": "court" }, { "label": "10 à 50 cm", "valeur": "moyen" }, { "label": "Plus de 50 cm", "valeur": "long" } ],
    "defaut": "moyen",
    "sensibilite_pct": 100
  }
]
```

Les dimensions de la pièce ne sont jamais demandées : si le devis ne les donne pas, le moteur passe en mode ratio et affiche l'hypothèse « Périmètre estimé ». L'artisan peut les ajouter dans « informations sur le chantier » (texte ou croquis).

## 8. Matériaux dominants par région

Il n'existe pas de matériau régional pour les plafonds suspendus : BA13 sur fourrure 45/47 et dalles 600 × 600 sur T24 partout en France. La région n'agit que par trois biais.

| Biais | Effet sur la commande | Départements concernés | Statut |
| --- | --- | --- | --- |
| Zone sismique 3 à 5 | plafonds à dalles en ERP : contreventement, fixation renforcée de la 1re suspente (DTU 58.1 et guide sismique) → l'app alerte, ne calcule pas les pièces de contreventement | Alpes, Pyrénées, Provence, Haut-Rhin, Antilles (zone 5) — lu dans `commun/departements.json` | *(règles à vérifier)* [FFB](https://www.ffbatiment.fr/techniques-batiment/amenagement-finitions/platrerie-plafonds-planchers-techniques/dossier-bam/meilleure-prescription-et-domaine-d-application-elargi) |
| Bâti ancien régional (solives bois, plancher pierre/voûtains) | change la suspente et sa fixation | toutes régions, surtout centres anciens | via question « support » |
| Marque du négoce | Placo, Knauf ou Siniat selon le négoce de l'artisan : seul le nom d'article change | — | appris au niveau artisan après la première commande |

Le moteur ne pose donc aucune question de région pour ce métier (`geographie: faible`).

## 9. Points singuliers et consommables

Ce qui se commande à la pièce ou au ml, en plus du plafond courant. Le moteur ne les ajoute que si le devis les cite (ou si une règle les déclenche), et les affiche sur une ligne à part.

| Point singulier | Déclencheur | Quantité commandée | Source / statut |
| --- | --- | --- | --- |
| Trappe de visite (ex. 600 × 600 ou 400 × 400) | « trappe », « trappe de visite », « accès comble » | 1 u par trappe citée, dimension du devis | quantité du devis |
| Joint de fractionnement (profilé de dilatation) | surface > 300 m², longueur > 25 ml, pièce en L, joint du gros œuvre | ml = largeur de la pièce au droit du joint, barres de 3 m | [Placo](https://www.placo.fr/comment-creer-un-plafond-suspendu-sur-ossature-suspentes-et-fourrures-stil-f530) |
| Trémie (gaine, conduit, escalier) | « trémie », « chevêtre » | 2 barres de fourrure + 4 suspentes par trémie *(à vérifier)* | *(ratio à valider)* |
| Joue, retombée, caisson, soffite | « joue », « retombée », « caisson » | plaques + rails/montants : tiroir plâtrerie | renvoi |
| Angle sortant (joue, caisson) | idem | cornière d'angle ou bande armée, ml de l'arête | *(à vérifier)* |
| Raccord plafond acoustique / mur | « acoustique », « phonique » | pas de cornière fixée au mur : suspentes à 10 cm max du mur ; mastic acrylique en périphérie (cartouche, ≈ 15 ml/cartouche *à vérifier*) | [Placo](https://www.placo.fr/comment-creer-un-plafond-suspendu-sur-ossature-suspentes-et-fourrures-stil-f530) |
| Luminaire, spot, bouche VMC | « spot », « encastré », « bouche » | aucun matériau plafond ; au-delà de 2 daN par carré de 1,20 × 1,20 m, l'objet se fixe au support, pas au plafond → alerte | [Placo fiche A01](https://www.entrepot-du-bricolage.fr/mediaw/pdf/fiche_conseil_cavaliers-stil-pour-fourrure-f530-par-12-placo.pdf) |
| Dalle LED, grille, diffuseur dans plafond à dalles | « dalle LED », « diffuseur 600 × 600 » | retrancher 1 dalle par appareil | règle moteur |
| Clips anti-soulèvement | locaux en surpression, porte extérieure, dalles légères | 11,2/m² (600 × 600) ; 8,33/m² (1200 × 600) | [Rockfon CleanSpace](https://www.rockfon.fr/siteassets/commerce/fr/grids/documents/documentation/guides-dinstallation-/fr-installation-guide-rockfon-system-cleanspace-t24-a-e-ecr--new--67_d_11_2024.pdf) |
| Plénum > 2 m | réponse « plus de 50 cm » + devis | ossature primaire : alerte, hors calcul | DTU 58.1 |

**Consommables** (toujours ajoutés, arrondis à la boîte) : vis TTPC 25 (plaques), vis TTPC 35 ou chevilles (suspentes), chevilles ou vis de cornière, tige filetée Ø 6 + écrous si plénum long (1 tige par suspente, longueur = plénum, barres de 1 m *à vérifier*), bande et enduit. Pas de disque ni de lame : l'outillage n'est jamais dans le quantitatif.

## 10. Cas de test (format JSON)

Les trois cas ci-dessous sont **synthétiques** : calculés avec les formules de la section 5, ils servent à tester le moteur, pas à valider les ratios. Ils seront remplacés par 10 devis réels anonymisés avec la commande réellement passée par l'artisan. Critères de validation inchangés : chaque ligne dans la tolérance, 4 questions maximum, zéro question sur une quantité.

```json
[
  {
    "id": "plaf-001",
    "source": "synthétique, exemple Placo 14 m², 2026-10",
    "devis_texte": "Faux plafond BA13 sur ossature métallique F530, chambre 4 x 3,50 m, sous solives bois",
    "contexte": { "famille": "plaques", "L_m": 4.0, "l_m": 3.5, "support": "bois", "plenum_classe": "moyen", "piece_humide": false },
    "attendu": [
      { "article": "plaque BA13 2500x1200", "quantite": 5, "unite": "plaque", "tolerance_pct": 0 },
      { "article": "fourrure F530 3 m", "quantite": 10, "unite": "barre", "tolerance_pct": 10 },
      { "article": "éclisse F530", "quantite": 5, "unite": "u", "tolerance_pct": 20 },
      { "article": "suspente longue F530", "quantite": 1, "unite": "boîte 50", "tolerance_pct": 0 },
      { "article": "vis TTPC 35 (suspentes)", "quantite": 1, "unite": "boîte", "tolerance_pct": 0 },
      { "article": "cornière CR2 3 m", "quantite": 6, "unite": "barre", "tolerance_pct": 0 },
      { "article": "vis TTPC 25", "quantite": 1, "unite": "boîte 1000", "tolerance_pct": 0 },
      { "article": "bande à joint", "quantite": 1, "unite": "rouleau", "tolerance_pct": 0 },
      { "article": "enduit poudre", "quantite": 1, "unite": "sac 25 kg", "tolerance_pct": 0 }
    ],
    "questions_max": 4
  },
  {
    "id": "plaf-002",
    "source": "synthétique, bureau 30 m², 2026-10",
    "devis_texte": "Faux plafond démontable dalles minérales 60x60 sur ossature T24 blanche, bureau 6 x 5 m, sous dalle béton",
    "contexte": { "famille": "dalles", "L_m": 6.0, "l_m": 5.0, "support": "beton", "dalle_format": "600x600" },
    "attendu": [
      { "article": "dalle 600x600", "quantite": 90, "unite": "u", "tolerance_pct": 0 },
      { "article": "dalle 600x600", "quantite": 6, "unite": "carton 16", "tolerance_pct": 0, "note": "carton à vérifier" },
      { "article": "porteur T24 3600", "quantite": 7, "unite": "barre", "tolerance_pct": 0 },
      { "article": "entretoise T24 1200", "quantite": 42, "unite": "u", "tolerance_pct": 5 },
      { "article": "entretoise T24 600", "quantite": 42, "unite": "u", "tolerance_pct": 5 },
      { "article": "suspente T24 + fixation béton", "quantite": 21, "unite": "u", "tolerance_pct": 10 },
      { "article": "cornière de rive 3 m", "quantite": 8, "unite": "barre", "tolerance_pct": 0 }
    ],
    "questions_max": 4
  },
  {
    "id": "plaf-003",
    "source": "synthétique, salle de bain 5 m², 2026-10",
    "devis_texte": "Plafond suspendu plaque hydro salle de bain 2,50 x 2,00 m",
    "contexte": { "famille": "plaques", "L_m": 2.5, "l_m": 2.0, "support": "bois", "piece_humide": true },
    "attendu": [
      { "article": "plaque BA13 hydro 2500x1200", "quantite": 2, "unite": "plaque", "tolerance_pct": 0 },
      { "article": "fourrure F530 3 m", "quantite": 3, "unite": "barre", "tolerance_pct": 0 },
      { "article": "suspente longue F530", "quantite": 1, "unite": "boîte 50", "tolerance_pct": 0 },
      { "article": "cornière CR2 3 m", "quantite": 4, "unite": "barre", "tolerance_pct": 0 },
      { "article": "vis TTPC 25", "quantite": 1, "unite": "boîte 1000", "tolerance_pct": 0 },
      { "article": "enduit poudre", "quantite": 1, "unite": "sac 25 kg", "tolerance_pct": 0 }
    ],
    "questions_max": 4
  }
]
```

Contrôle croisé plaf-001 : le ratio Placo donne 28 ml de fourrure et 26 suspentes pour 14 m² ; le calepinage donne 5 lignes de 4 m (10 barres de 3 m) et 20 suspentes. Les deux tombent sur 1 boîte de suspentes : l'écart ne change pas la commande, mais il reste à trancher par un plaquiste (section 11).
