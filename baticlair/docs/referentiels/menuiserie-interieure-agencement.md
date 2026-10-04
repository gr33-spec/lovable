# Référentiel quantitatif MENUISERIE INTÉRIEURE / AGENCEMENT (Rappidos)

Oct 3, 2026 · @Greg

## 0. Statut et mode d'emploi

Ce document est le tiroir `referentiels/menuiserie-interieure/` du moteur générique (gabarit section 27 du référentiel couverture). Aucun mot de ce métier ne doit vivre dans le code : tout ce qui suit se transcrit en `metier.json`, `ouvrages.json`, `materiaux.json`, `regles.json`, `defauts.json`, `questions.json`, `vocabulaire.json`, `ratios-a-valider.md` et `tests/`.

- **Statut** : v0.1, rédigé sans artisan du métier. Toute valeur suivie de *(à vérifier)* n'est pas sourcée et ne doit pas partir en production sans relecture d'un menuisier agenceur.
- **Périmètre** : tout ce qui se pose à l'intérieur du logement et se commande au négoce bois-panneaux ou chez le fabricant : blocs-portes et portes seules, plinthes et habillages, parquets et sols stratifiés posés par le menuisier, lambris, placards et dressings, agencement en panneaux (meubles, bibliothèques, cuisines sur mesure, plans de travail), trappes, tablettes, petits habillages bois.
- **Hors périmètre** (autres tiroirs) : fenêtres, portes d'entrée, volets (menuiserie extérieure), escaliers et garde-corps fabriqués (commande atelier sur plan, l'app sort seulement une ligne « escalier sur mesure » sans quantitatif matière), cloisons plâtre (plâtrerie), carrelage, peinture et vitrification au-delà du consommable.
- **Questions** : la décision produit du 3 octobre remplace la limite stricte : 4 questions principales à boutons, et l'IA en pose d'autres (oui/non, boutons) dès qu'un doute change une commande, toujours classées par levier. Jamais une question de quantité.

## 1. Métier et axes de variation

La menuiserie intérieure est pilotée par la **gamme** et le **neuf/rénovation**, presque pas par la géographie : un bloc-porte 204 × 83 est le même à Lille et à Nice. L'axe qui fait le plus d'erreurs de commande est l'époque du bâti (hauteurs et largeurs de baies non standard, murs hors d'aplomb, sols irréguliers).

| Axe | Poids | Ce qu'il change dans la commande |
| --- | --- | --- |
| gamme | fort | Âme de porte (alvéolaire / tubulaire / pleine), essence (sapin, chêne, MDF à peindre), finition (brut, prépeint, laqué, plaqué), parquet massif ou contrecollé ou stratifié, quincaillerie (bec-de-cane premier prix ou poignée sur rosace). Change le produit, jamais la méthode. |
| neuf\_renovation | fort | Rénovation = baies hors standard (portes sur mesure ou recoupées), dépose et évacuation, rénovation de porte en conservant l'huisserie existante (« bloc-porte de rénovation » ou porte seule), ragréage ou sous-couche plus épaisse sous parquet, plinthes plus hautes pour cacher les défauts. |
| epoque\_bati | moyen | Avant 1950 : hauteurs de baies 2,10 à 2,30 m, largeurs variables, plinthes 10 à 20 cm, parquet bois cloué sur lambourdes. 1950-1990 : huisseries métalliques ou bois en 204, cloisons 5 à 7 cm. Après 1990 : cloisons plâtre 72 mm, huisserie bois ou métal en 204, plinthes 7 cm. |
| type\_batiment | moyen | Logement neuf collectif et ERP : largeur de passage PMR (porte de 90 cm), portes coupe-feu ou acoustiques (dB) imposées sur palier, blocs-portes certifiés NF. Maison individuelle : libre. |
| geographie | faible | Essences et habitudes régionales (chêne en Ouest et Centre, pin des Landes en Sud-Ouest, sapin-épicéa dans l'Est et en montagne), humidité littorale (pas de MDF non hydrofuge en pièce humide). N'impose jamais un matériau. |

Traduction `metier.json` : `{"axes": {"gamme": "fort", "neuf_renovation": "fort", "epoque_bati": "moyen", "type_batiment": "moyen", "geographie": "faible"}}`. Le moteur ne pose une question de géographie que si un ouvrage déclenche un choix d'essence non précisé dans le devis.

## 2. Règle d'or et unités de commande

En menuiserie intérieure, presque tout se commande **à la pièce, avec ses dimensions et son sens**, jamais au m² ni au ml. Une ligne qui dit « 12 ml de plinthe » ou « 35 m² de parquet » n'est pas commandable : le négoce attend « 6 barres de 2,40 m » ou « 21 colis de 1,835 m² ».

Règle d'or propre au métier : **une porte sans sens d'ouverture, sans dimensions et sans épaisseur de cloison n'est pas une ligne de commande**. Le moteur bloque la ligne tant que ces trois données manquent (déduites du devis ou demandées à boutons).

| Famille | Unité de commande | Ce que la ligne doit contenir | Exemple de ligne commandable |
| --- | --- | --- | --- |
| Bloc-porte | u | hauteur × largeur de vantail, sens (poussant gauche / poussant droit), épaisseur de cloison (huisserie), âme, finition, serrure | 1 bloc-porte âme alvéolaire prépeint 204 × 83, huisserie 72 mm, poussant droit, serrure bec-de-cane |
| Porte seule (rénovation) | u | dimensions exactes, épaisseur 40 mm, sens, recoupable ou non | 1 porte isoplane âme pleine 204 × 73 × 40, gauche, à recouper |
| Quincaillerie de porte | u ou jeu | type, finition, entraxe | 3 ensembles béquille sur rosace inox, bec-de-cane |
| Plinthe, chambranle, champlat, baguette | barre (longueur réelle) ou lot | section, longueur de barre, matière, finition | 7 barres plinthe MDF prépeinte 10 × 70, longueur 2,44 m |
| Parquet, stratifié | colis (m²/colis du fabricant) | référence, épaisseur, m² par colis | 21 colis Impressive 8 mm, 1,835 m²/colis |
| Sous-couche | rouleau | épaisseur, m²/rouleau, pare-vapeur intégré ou non | 3 rouleaux sous-couche 2 mm pare-vapeur, 15 m² |
| Lambris | botte / paquet | essence, profil, longueur, m²/botte | 9 bottes pin maritime 10 × 100, 2 m, 2 m²/botte |
| Tasseaux, liteaux | barre | section, longueur | 14 tasseaux 27 × 40, longueur 2,40 m |
| Panneaux (mélaminé, MDF, contreplaqué) | panneau (format) | matière, décor, épaisseur, format | 4 panneaux mélaminé blanc 19 mm, 2800 × 2070 |
| Chant | rouleau | matière, décor, largeur, longueur rouleau | 1 rouleau chant ABS blanc 23 × 1 mm, 50 m *(longueur à vérifier selon négoce)* |
| Façade de placard | u (vantail) ou kit | hauteur, largeur de baie, nombre de vantaux, finition, rails | 1 façade coulissante 2 vantaux, baie 1,80 × 2,50, rails 1,80 m |
| Ferrures (charnières, coulisses, rails) | u, paire ou boîte | type, longueur, charge | 6 paires de coulisses 450 mm sortie totale |
| Colles, mastics, mousse | cartouche, bombe, pot | contenance, carton | 2 cartouches colle plinthe 310 ml |
| Vis, pointes, chevilles | boîte | diamètre × longueur, nombre par boîte | 1 boîte vis aggloméré 4 × 40, 500 u |

Le m² et le ml restent des **grandeurs de calcul internes**, affichées seulement dans l'annexe fournisseur (détail du devis sans prix), jamais comme quantité commandée.

## 3. Ouvrages du métier, vocabulaire des devis et pièges

Douze ouvrages couvrent l'essentiel des devis de menuiserie intérieure. Chaque ouvrage devient une entrée de `ouvrages.json` ; la colonne vocabulaire alimente `vocabulaire.json`.

| Code ouvrage | Ouvrage | Ce que disent les devis (synonymes) | Piège classique |
| --- | --- | --- | --- |
| MI-BP | Fourniture et pose de bloc-porte | bloc-porte, BP, porte de distribution, porte intérieure, porte isoplane, porte postformée, huisserie + porte, « porte 83 », « porte de 73 » | Le devis donne « 1 porte 83 » sans sens ni cloison. « 83 » = largeur du vantail, pas du passage. Une huisserie de 72 mm ne va pas dans une cloison de 98 mm. |
| MI-PS | Remplacement de porte seule (rénovation) | porte seule, vantail, rénovation de porte, changement de porte sur huisserie existante | Les portes anciennes ne font pas 204 : la porte se commande sur mesure ou recoupable. Les paumelles existantes doivent coïncider. |
| MI-BPR | Bloc-porte de rénovation | bloc-porte rénovation, huisserie de recouvrement, « sans dépose de l'huisserie » | Se pose sur l'ancienne huisserie : passage réduit d'environ 5 cm *(à vérifier fabricant)*. |
| MI-BPT | Bloc-porte technique | porte coupe-feu, CF 1/2 h, EI 30, porte palière, porte acoustique, porte isotherme, porte de garage intérieure | Ne jamais remplacer par une porte standard : la ligne garde la performance exacte (EI 30, dB, isotherme) et le PV fabricant. |
| MI-PC | Porte coulissante (galandage ou applique) | porte à galandage, châssis Eclisse, porte coulissante en applique, rail apparent | Galandage = châssis à commander avec la porte, cloison spécifique ; applique = rail + porte + habillage. |
| MI-PL | Plinthes | plinthes, plinthe bois, plinthe MDF, plinthe médium, socle, « finition plinthes », plinthe à recouvrement | Le devis donne des ml ou des m² de pièce : il faut le périmètre, moins les baies. |
| MI-HA | Habillages et moulures | chambranles, couvre-joints, champlats, baguettes d'angle, quart-de-rond, moulures, cimaise | Les chambranles sont souvent inclus dans le bloc-porte : vérifier avant d'en ajouter. |
| MI-PQ | Parquet et sol stratifié flottant ou collé | parquet flottant, contrecollé, stratifié, sol stratifié, massif, point de Hongrie, bâtons rompus, lames clipsables | Le devis donne des m² de pièce, pas des colis. Pose en diagonale ou en point de Hongrie = pertes multipliées. |
| MI-LA | Lambris et habillage bois mural ou plafond | lambris, frisette, lambris PVC, habillage bois, lames murales, tasseaux décoratifs | Les tasseaux d'ossature sont oubliés une fois sur deux. |
| MI-PD | Placard et dressing | façade de placard, portes coulissantes, portes pliantes, aménagement intérieur, dressing, penderie | Façade et aménagement intérieur sont deux commandes différentes (souvent deux fournisseurs). |
| MI-AG | Agencement sur mesure en panneaux | meuble sur mesure, bibliothèque, banquette, bureau intégré, cuisine sur mesure, caissons, niche, meuble TV | Le devis donne un meuble au ml ou au forfait : il faut une nomenclature panneaux (voir 5.7). |
| MI-DV | Divers : trappes, tablettes, plans de travail, habillages | trappe de visite, tablette de fenêtre, plan de travail, crédence bois, cache-radiateur, coffrage, habillage de gaine | Plan de travail : longueur commerciale (3 m, 4,10 m) et découpes évier/plaque à préciser. |

Lignes que le moteur **ignore** pour la matière (main-d'œuvre seule) : dépose, évacuation en déchetterie, ajustage, réglage, rabotage, protection de chantier. Il les garde dans l'annexe fournisseur pour le contexte.

Lignes que le moteur **renvoie à un autre tiroir** : peinture des huisseries (peintre), ragréage avant parquet (carreleur ou solier), cloisons plâtre (plâtrerie), escalier fabriqué (ligne « sur mesure atelier », sans quantitatif).

## 4. Matériaux et fiches fabricant

Toutes les valeurs ci-dessous viennent de fiches ouvertes le 3 octobre 2026, lien dans la colonne source. Règle reprise du référentiel couverture : le conditionnement de `materiaux.json` vient d'une fiche négoce quand elle existe, car c'est le négoce qui livre.

### 4.1 Blocs-portes standard (huisserie 72 mm)

Gamme normalisée : hauteur 204 cm, largeurs de vantail 63, 73, 83 et 93 cm, épaisseur 40 mm (vantaux selon NF P 23-300). Hauteurs non standard rencontrées en rénovation : 190 et 215 cm (catalogues).

| Bloc-porte | Réservation cloison 50 mm (H × L) | Réservation cloison 72 mm (H × L) | Source |
| --- | --- | --- | --- |
| 204 × 63 × 4 | 2077 × 687 mm | 2085 × 703 mm | [notice IMS Weldom](https://media.weldom.fr/v2/media/catalog/product/doc_qualite/ims/IMS_80135937.pdf) |
| 204 × 73 × 4 | 2077 × 787 mm | 2085 × 803 mm | idem |
| 204 × 83 × 4 | 2077 × 887 mm | 2085 × 903 mm | idem |
| 204 × 93 × 4 | 2077 × 987 mm | 2085 × 1003 mm | idem |

Les réservations varient selon le fabricant et la section d'huisserie : un modèle Ballay 204 × 73 à huisserie sapin 88 × 56 mm demande 208 × 81 cm et pèse 20,7 kg ([fiche](https://www.bricocash.fr/p/bloc-porte-alveolaire-modele-3-panneaux-ouverture-a-droite-204x73cm/3660568313447)) ; un bloc isotherme 204 × 73 à huisserie MDF 72 × 50 demande 209,9 × 83,3 cm ([fiche](https://www.leroymerlin.fr/produits/bloc-porte-isothermique-h-204-x-l-73-cm-poussant-droit-80129582.html)). Le moteur ne calcule donc **jamais** une réservation : il commande un bloc par baie et affiche la réservation de la fiche choisie.

Poids : 20 à 25 kg pour un bloc alvéolaire, 34 kg pour un bloc plaqué hêtre 204 × 83 ([fiche](https://www.bricomarche.com/p/bloc-porte-4-panneaux-poussant-droit-bois-de-hetre-204x83x72cm/3760171791912)). Huisseries ajustables 72 à 100 mm existantes ([fiche GD Menuiseries](https://www.mr-bricolage.fr/bloc-porte-atelier-blanc-h-204xl-83cm-poussant-droite-gd-menuiseries.html)). Les négoces pro référencent Jeld-Wen, Chauvat, Huet, Malerba (gammes huisserie H72, chant droit ou à recouvrement, serrure PDDT ou 3 points).

### 4.2 Parquets et sols stratifiés

| Produit | Lame (L × l × ép.) | Lames/colis | m²/colis | Poids colis | Source |
| --- | --- | --- | --- | --- | --- |
| Quick-Step Impressive (stratifié) | 1380 × 190 × 8 mm | 7 | 1,835 | 13,9 kg | [fiche technique 10.2022](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_952917.pdf), [poids](https://zelfbouwmarkt.be/fr/sol-stratifie-quick-step-impressive-8mm-chene-tendre-medium/a/87243) |
| Quick-Step Compact (contrecollé) | 1820 ou 2200 × 145 × 13 mm | 6 | 1,583 ou 1,914 | à vérifier | [fiche technique](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1545127.pdf) |
| Quick-Step Disegno (bâtons rompus) | 580 × 145 × 13,5 mm | 12 (6 A + 6 B) | 1,009 | à vérifier | [fiche technique](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1545135.pdf) |
| Panaget Diva 90 Clic (contrecollé chêne) | 385 à 1180 × 90 × 12 mm | — | 1,47 | 9,9 kg/m² ; 44 colis/palette | [fiche Panaget](https://panaget.com/content/uploads/quable/floor/1022760/medias/parquet_ch_ne_classic_bois_flott_diva90-type_of_doc=FT.pdf) |
| Alsapan Strong (stratifié 12 mm) | 1286 × 214 × 12 mm | 6 | 1,65 | 18,1 kg | [fiche](https://www.bricomarche.com/p/stratifie-strong-562-chene-colorado/3512485732002) |

Le m²/colis change à chaque référence : `materiaux.json` le stocke par référence, jamais en valeur générique. Sans référence dans le devis, le moteur prend 1,8 m²/colis pour un stratifié et 1,5 m²/colis pour un contrecollé *(valeurs moyennes, à vérifier)* et affiche l'hypothèse.

### 4.3 Sous-couches

Rouleau standard 15 m² (15 × 1 m), 2 à 2,2 mm, avec ou sans pare-vapeur intégré : Isorom Vapor Guard, 40 rouleaux par palette ([fiche](https://www.batiproduits.com/amp/fiche/produits/sous-couches-sols-stratifies-isorom-vapor-guard-p492455534.html)) ; Selit Basic+ Aquastop 2,2 mm avec feuille alu ([fiche](https://www.bricomarche.com/p/selitac-basic-2.2/4002245748187)). Existent aussi en 20 m² ([fiche](https://www.bricodepot.fr/p/5063022038418/sous-couche-2-mm-20-m-l-2000cm-x-l-100cm)).

### 4.4 Plinthes et moulures

| Produit | Section | Longueur de barre | Conditionnement | Source |
| --- | --- | --- | --- | --- |
| Plinthe MDF revêtu blanc bord vif | 10 × 70 mm | 2,40 m | lot de 10 longueurs | [Sotrinbois réf. 7185](https://www.cmesmat.fr/bois--menuiserie/amenagement-interieur/baguettes--moulures--tasseaux/moulures-plinthes/2496532-plinthe-bord-vif-revetu-papier-mdf-blanc-long-2400-mm-x-larg-70-mm-x-ep-10-mm.html) |
| Plinthe MDF prépeinte bord arrondi | 10 × 70 mm | 2,44 m | lot de 10 longueurs | [Sotrinbois réf. 9795](https://www.cmesmat.fr/bois--menuiserie/amenagement-interieur/baguettes--moulures--tasseaux/moulures-plinthes/2496563-plinthe-bord-arrondi-prepeinte-mdf-blanc-long-2440-mm-x-larg-70-mm-x-ep-10-mm.html) |
| Plinthe MDF prépeinte bord arrondi | 9 × 68 mm | 2,00 m | lot de 5 longueurs | [Sotrinbois réf. 9859](https://www.cmesmat.fr/bois--menuiserie/amenagement-interieur/baguettes--moulures--tasseaux/moulures-plinthes/2496567-plinthe-bord-arrondi-prepeinte-mdf-blanc-long-2000-mm-x-larg-68-mm-x-ep-9-mm.html) |
| Plinthe moulurée MDF brut | 14 × 120 mm | 2,40 m | à l'unité, 2,42 kg | [fiche](https://www.bricomarche.com/p/plinthe-mouluree-mdf-brut-14x120mm-l.2.40m/5412124944392) |
| Champlat pin des Landes | 5 × 38 mm | 2,40 m | à l'unité | [fiche](https://www.bricomarche.com/p/champlat-pin-des-landes-2-arrondis-5x38mm-l.2.40m/3461870012376) |

Longueurs de barre rencontrées : 2,00 / 2,20 / 2,40 / 2,44 m. Défaut moteur : 2,40 m ; la longueur réelle du produit référencé remplace toujours le défaut.

### 4.5 Lambris

| Produit | Lame | Conditionnement | Poids | Source |
| --- | --- | --- | --- | --- |
| Lambris pin maritime noueux (SIF) | — | paquet de 10 lames = 2 m² | 11 kg | [fiche Castorama](https://media.castorama.fr/is/content/Castorama/3297060013096_ran_fr_cfpdf) |
| Lambris pin maritime sans nœud GO (Decorland) | 2000 × 100 × 8,5 mm | 10 lames = 2 m² | 9,35 kg | [fiche](https://www.bricomarche.com/p/lambris-pin-maritime-sans-noeud-go-200x10x0.85cm/3297060001284) |
| Lambris revêtu blanc plafond | 2600 × 154 × 8 mm | botte de 2,40 m² | — | [fiche](https://www.bricodepot.fr/p/3601653607867/lambris-revetu-en-pin-blanc-pour-plafond-l-2600-l-154-mm-ep-8-mm) |
| Verniland Majestic (FP Bois) | 2500 × 120 mm | à vérifier | — | [fiche](https://www.batiproduits.com/fiche/produits/lambris-en-pin-rabote-ou-brosse-verniland-maje-p69113033.html) |

### 4.6 Panneaux d'agencement

Mélaminé Egger Eurodekor : format standard 2800 × 2070 mm, épaisseurs de 8 à 38 mm ([Egger](https://support.egger.com/hc/en-us/articles/360001082138-What-are-the-dimensions-of-EGGER-Eurodekor-Faced-Chipboard)) ; en 10, 16 et 19 mm les paquets usine sont de 24 panneaux, en 28 et 30 mm de 12 ([fiches distributeur](https://www.gabarro.com/en/wood-panels-and-other-products/melamine/roble-sorano-claro-h1334-st9-egger-melamine)). Le négoce vend au panneau. Poids d'un mélaminé 19 mm 2800 × 2070 : environ 70 kg *(densité 620-650 kg/m³, à vérifier)*.

Autres formats courants *(à vérifier sur fiche négoce)* : MDF 2440 × 1220 et 2800 × 2070 ; contreplaqué 2500 × 1220 ; panneau 3 plis massif 2500 × 1250 ; plan de travail stratifié 3000 ou 4100 × 650 × 38 mm.

### 4.7 Placards et ferrures

| Produit | Données | Source |
| --- | --- | --- |
| Kit ferrures coulissantes Palma (Legallais) | panneaux 19 mm, 80 kg/vantail max, hauteur max 2550 mm, vantail 500 à 1500 mm, kits 2 ou 3 m, 1 frein par vantail, 2 profils poignée par vantail | [fiche Legallais](https://cdn.legallais.com/pm_11812_503_503082-6ulwhaphcd.pdf) |
| Rail haut Palma | section 85 × 40 mm, barre de 3 m | [fiche](https://ws-maestro.legallais.com/product-page-pdf//49895.pdf) |
| Kit rails haut et bas Sogal Yngenio | rail 2 voies acier, 3,60 m, recoupable, 5,4 kg | [fiche](https://www.bricomarche.com/p/kit-rail-haut-et-bas-blanc-360cm-pour-porte-de-placard/3660623267791) |
| Porte coulissante Mekazed (Kazed) | jusqu'à 300 × 300 cm, rail haut alu | [fiche](https://www.batiproduits.com/fiche/produits/porte-de-cloison-ou-de-placard-coulissante-p68923563.html) |
| Porte pliante Kazed | dégagement intérieur 65 mm à prévoir ; si hauteur ou largeur de baie varie de plus de 5 mm, commande sur mesure | [notice Kazed](https://www.kazed.fr/fichier/A/538.pdf) |

### 4.8 Consommables

| Produit | Contenance | Rendement fabricant | Carton | Source |
| --- | --- | --- | --- | --- |
| Bostik colle fixation plinthes | cartouche 310 ml | 15 m de cordon de 5 mm | 12 | [fiche Bostik](https://diy.bostik.com/sites/default/files/2021-02/Bostik-diy-Fr-fiche-technique-colle-fixation-plinthes-30605355-tds.pdf) |
| Bostik Mastirex (néoprène agencement) | cartouche 310 ml | plots ou cordons espacés de 15 cm | 12 | [fiche Bostik](https://medias.descours-cabaud.com/d180001/medias/docus/112/8910333673502.pdf) |
| Bostik MSP 108 Turbo | cartouche 290 ml | 15 m de cordon Ø 4 mm | — | [fiche](https://www.quincaillerie-angles.fr/pdf-product/view/index/id/446206/) |
| Mousse PU Gebsomousse | bombe 750 ml | 42 L en expansion libre | — | [fiche](https://www.batiproduits.com/amp/fiche/produits/mousses-polyurethanes-expansives-en-bombe-p68881758.html) |
| Mousse PU Rubson Énergie | bombe 750 ml | jusqu'à 31 L | — | [fiche](https://www.bricomarche.com/p/rubson-mousse-expansive-energie-pistolable-750ml/3178041362504) |

## 5. Règles de calcul, formules et pertes

Une formule par ouvrage, en code pur dans `regles.json`. Arrondi toujours à l'unité de commande supérieure, **par pièce** quand les chutes ne passent pas d'une pièce à l'autre (plinthes, barres), **par chantier** pour ce qui se reprend dans un colis (parquet, lambris, sous-couche). Textes de référence : NF DTU 36.2 (menuiseries intérieures et agencement, édition révisée publiée en novembre 2025 selon la [FFB](https://www.ffbatiment.fr/actualites-batiment/actualite-bam/nf-dtu-36-2-nouvelle-reference-menuiserie-interieure-agencement)), NF DTU 51.11 (parquet flottant, révisé mai 2024, [Afnor](https://www.boutique.afnor.org/en-gb/standard/nf-dtu-5111-p11/building-works-parquet-flooring-installed-floating-part-11-contract-bill-of/fa200228/418687)), NF DTU 51.2 (parquet collé, révisé mai 2023), NF DTU 51.1 (parquet cloué). Les DTU sont payants : les seuils chiffrés ci-dessous qui ne viennent pas d'une fiche ouverte sont marqués *(à vérifier DTU)*.

### 5.1 Bloc-porte (MI-BP, MI-BPR, MI-BPT)

- **1 bloc-porte par baie.** Jamais de surface. Hauteur 204 par défaut, largeur lue dans le devis (63, 73, 83, 93).
- **Huisserie = épaisseur de cloison finie** (doublage et enduit compris). Correspondance : cloison 50 → huisserie 50 ; cloison 72 → H72 ; cloison 98 ou 100 → H98/H100 ou huisserie ajustable 72-100 ; mur maçonné > 100 mm → huisserie + ébrasement (fourrure) à commander en plus *(à vérifier)*.
- **Sens** : poussant gauche / poussant droit, tel que vu côté poussant (convention fabricants). Inconnu → question à boutons, jamais une valeur par défaut silencieuse.
- **Serrure par pièce** (défaut si le devis ne dit rien) : chambre et bureau = serrure à clé (L) ; WC et salle de bains = serrure à condamnation ; séjour, cuisine, cellier, dégagement = bec-de-cane. Une ligne de quincaillerie par porte si la béquille n'est pas livrée avec le bloc.
- **Chambranles** : seulement si le bloc est livré sans. 1 jeu par face visible, soit 2 jeux par porte (jeu = 2 montants + 1 traverse). Barres de 2,20 m pour montants *(à vérifier)*.
- **Fixation** : 1 bombe de mousse PU 750 ml pour 4 blocs *(ratio à vérifier ; rendement fabricant 31 à 42 L par bombe)*, 1 sachet de cales pour 5 blocs, et en pose vissée 6 vis + chevilles par huisserie (3 par montant) *(à vérifier calepin DTU 36.2)*.
- **Logement neuf ou ERP** (type\_batiment) : largeur de passage accessibilité, porte de 83 minimum pour les pièces de l'unité de vie et 93 pour l'entrée *(à vérifier arrêté accessibilité du 24 décembre 2015)* ; le moteur alerte si le devis prévoit une 73 dans ce contexte, il ne corrige pas.

### 5.2 Porte seule de rénovation (MI-PS)

1 porte par baie, commande sur mesure si hauteur ≠ 204 ou largeur hors gamme. Recoupe possible de quelques centimètres seulement sur les portes alvéolaires *(cote max à vérifier fabricant)*. Quincaillerie et paumelles : 1 jeu de 3 paumelles par porte si non réutilisées.

### 5.3 Plinthes (MI-PL)

```latex
ml_{net} = \sum_{pièces} \left( P_{pièce} - \sum largeur\_baies \right)
```

```latex
barres_{pièce} = \left\lceil \frac{ml_{net,pièce} \times 1{,}08}{L_{barre}} \right\rceil
```

- Calcul **pièce par pièce** (une chute de 60 cm ne fait pas le tour d'une autre pièce). Perte 8 % pour les coupes d'onglet *(à vérifier artisan)*.
- Largeur de baie retirée : largeur du bloc-porte (vantail + 6 cm environ) ; baie de placard ou d'escalier : largeur lue au devis.
- Si le devis donne seulement des m² de pièce : périmètre estimé = 4 × √S × 1,10 (pièce rectangulaire allongée) et hypothèse affichée.
- Colle : 1 cartouche 310 ml pour 10 ml de plinthe de 70 mm (fabricant : 15 m de cordon de 5 mm, on garde une marge pour plots et retours), 1 cartouche pour 6 ml si plinthe ≥ 100 mm (2 cordons) *(à vérifier)*. Alternative clouage : pointes tête homme 1,6 × 35, 3 par ml *(à vérifier)*.

### 5.4 Parquet et stratifié flottant (MI-PQ, DTU 51.11)

```latex
colis = \left\lceil \frac{S \times (1 + p)}{m^2_{colis}} \right\rceil
```

| Mode de pose | Perte p | Statut |
| --- | --- | --- |
| Pose droite, pièce rectangulaire | 5 % | à vérifier artisan |
| Pose droite, pièces en L, couloirs, nombreuses découpes | 8 % | à vérifier artisan |
| Pose en diagonale | 12 % | à vérifier artisan |
| Point de Hongrie, bâtons rompus | 10 % (lames A et B dans le même colis) | à vérifier artisan |

- **Sous-couche** : rouleaux = ⌈S × 1,05 / m²\_rouleau⌉ ; 15 m² par défaut.
- **Pare-vapeur** : obligatoire sur support minéral (dalle, chape) si la sous-couche ne l'intègre pas ; film polyane en rouleau, recouvrement 20 cm, surface × 1,15 *(à vérifier DTU 51.11)*.
- **Fractionnement** : surface d'un seul tenant au plus 8 m de large × 10 m de long, jeu périphérique au moins 8 mm et 1,5 mm par mètre ([notice fabricant citant le DTU 51.11 de 2009](https://medias.bigmat.fr/data_medias/medias_finaux/documents/3524830066557-1WskQCqOn2.pdf) ; valeurs de l'édition 2024 *à vérifier*). Au-delà : 1 profilé de fractionnement par coupure, en barre.
- **Seuils** : 1 barre de seuil par passage de porte où le sol change ou où le parquet est fractionné ; longueur commerciale ≥ largeur du passage (0,93 m ou 2,70 m à recouper) *(à vérifier)*.
- **Finition périphérique** : si les plinthes sont conservées, quart-de-rond ou baguette de finition = ml\_net, en barres (même formule que 5.3).
- **Sol chauffant** : pose flottante interdite sauf autorisation explicite du fabricant ([source](https://www.legalnest.fr/batiment/dtu/51-11-pose-de-parquet-flottant)) ; le moteur alerte.
- **Adhésif de jonction** de sous-couche : 1 rouleau de 50 m pour 50 m² *(à vérifier)*.

### 5.5 Parquet collé (DTU 51.2) et cloué (DTU 51.1)

Collé : colis comme 5.4 ; colle en seau, 1 kg/m² pour une spatule de parquet *(à vérifier fiche fabricant colle)* ; primaire selon support. Cloué sur lambourdes : lambourdes entraxe 40 cm *(à vérifier DTU 51.1)*, ml = S / 0,40 × 1,10, barres ; pointes à parquet 2 par lame par lambourde. Ces deux poses sont minoritaires dans les devis du menuisier ; le moteur les traite mais affiche « ratio non validé ».

### 5.6 Lambris (MI-LA)

```latex
bottes = \left\lceil \frac{S \times (1 + p)}{m^2_{botte}} \right\rceil \qquad p = 10\,\% \text{ (droit)},\ 15\,\% \text{ (rampant, diagonale)}
```

- **Tasseaux** perpendiculaires aux lames, écartement au plus 40 fois l'épaisseur de lame, 50 cm recommandés par le fabricant ([notice SCA Wood](https://media.weldom.fr/v2/media/catalog/product/doc_qualite/ims/IMS_5600852.pdf)) ; un tasseau de plus autour de chaque ouverture.
- ml tasseaux = (⌈D\_perp / 0,50⌉ + 1) × D\_parallèle + périmètre des ouvertures ; barres = ⌈ml × 1,10 / 2,40⌉.
- Fixation des tasseaux : 1 cheville + vis tous les 40 cm ([même notice](https://media.weldom.fr/v2/media/catalog/product/doc_qualite/ims/IMS_5600852.pdf)).
- Fixation des lames : clips = (1 / largeur de lame) × (1 / entraxe tasseaux) par m², soit 20 clips/m² pour une lame de 10 cm sur tasseaux à 50 cm ; boîtes de 100 ou 250 *(conditionnement à vérifier)*. Alternative : pointes tête perdue, même nombre.
- Finitions : baguettes d'angle et de rive = ml d'angles + périmètre, en barres de 2,40 m.

### 5.7 Placard (MI-PD)

- **Façade coulissante** : 1 façade par baie. Nombre de vantaux = 2 jusqu'à 1,80 m de baie, 3 jusqu'à 2,70 m, 4 au-delà *(à vérifier fabricant)* ; un vantail ne dépasse pas 1,50 m de large ni 2,55 m de haut sur ferrure standard ([fiche Palma](https://cdn.legallais.com/pm_11812_503_503082-6ulwhaphcd.pdf)).
- Rails haut et bas : longueur = largeur de baie, commandée en barre commerciale immédiatement supérieure (2 m, 3 m, 3,60 m), recoupable.
- Freins amortisseurs (option) : 1 par vantail ; profils poignée : 2 par vantail (même fiche).
- **Porte pliante** : si l'écart de cotes de baie dépasse 5 mm, commande sur mesure ([Kazed](https://www.kazed.fr/fichier/A/538.pdf)).
- **Aménagement intérieur** : kit fabricant (u) ou nomenclature panneaux de 5.8.

### 5.8 Agencement en panneaux (MI-AG)

Pour un caisson H × L × P en panneau d'épaisseur e :

- 2 côtés H × P ; 2 dessus/dessous (L − 2e) × P ; n étagères (L − 2e) × (P − 20 mm) ; 1 fond H × L en 3 à 8 mm.
- Panneaux = ⌈Σ surfaces / (surface du panneau × 0,75)⌉, rendement de débit 75 % *(à vérifier artisan ; un logiciel d'optimisation de débit fait mieux)*. Mélaminé 2800 × 2070 = 5,796 m² par panneau.
- Chant : ml = Σ chants visibles × 1,10, en rouleaux.
- Charnières : 2 par porte jusqu'à 90 cm de haut, 3 jusqu'à 160 cm, 4 jusqu'à 200 cm, 5 au-delà *(à vérifier fabricant de charnières)*.
- Coulisses : 1 paire par tiroir, longueur = profondeur intérieure arrondie au pas inférieur de 50 mm.
- Taquets : 4 par étagère mobile. Vis d'assemblage : 4 par jonction *(à vérifier)*, boîte de 200 ou 500.

### 5.9 Divers (MI-DV)

Plan de travail : longueur commerciale ≥ longueur utile + 20 mm, 1 kit de jonction par raccord, chant de finition par extrémité visible. Tablette : 1 pièce par fenêtre, longueur = tableau + 2 × 3 cm de débord *(à vérifier)*. Trappe de visite : 1 pièce, dimensions du devis.

## 6. Valeurs par défaut et hypothèses à afficher

Chaque défaut utilisé apparaît sur la carte quantitatif sous la forme « Hypothèse : … (modifiable) ». Un défaut ne remplace jamais une donnée du devis. Ordre de surcharge : référentiel → habitudes de l'artisan → chantier.

| Clé `defauts.json` | Valeur par défaut | Indexée par axe | Texte affiché à l'artisan |
| --- | --- | --- | --- |
| porte.hauteur | 204 cm | epoque\_bati (avant 1950 : demander) | Portes en hauteur standard 204 |
| porte.largeur | 83 cm si absente | type\_batiment (neuf : 83 mini) | Largeur 83 prise par défaut |
| porte.epaisseur\_vantail | 40 mm | — | Vantail 40 mm |
| porte.huisserie | 72 mm | epoque\_bati, neuf\_renovation | Cloisons de 72 mm |
| porte.ame | alvéolaire | gamme (premium : âme pleine) | Âme alvéolaire (âme pleine en gamme haute) |
| porte.finition | prépeinte | gamme | Portes prépeintes, à peindre |
| porte.serrure | selon pièce (5.1) | — | Clé pour chambres, condamnation pour WC et salle de bains, bec-de-cane ailleurs |
| porte.quincaillerie\_incluse | non | gamme | Poignées commandées à part |
| porte.chambranles\_inclus | oui | — | Chambranles livrés avec le bloc |
| plinthe.matiere | MDF prépeint | gamme (premium : bois massif) | Plinthes MDF prépeintes |
| plinthe.section | 10 × 70 mm | epoque\_bati (avant 1950 : 14 × 120) | Plinthes de 7 cm |
| plinthe.longueur\_barre | 2,40 m | — | Barres de 2,40 m |
| plinthe.fixation | collée | — | Plinthes collées |
| parquet.type | stratifié 8 mm | gamme (premium : contrecollé) | Sol stratifié 8 mm |
| parquet.m2\_colis | 1,8 (stratifié) / 1,5 (contrecollé) | — | Colis moyen, à remplacer par la référence |
| parquet.pose | flottante droite | — | Pose flottante droite, 5 % de perte |
| parquet.support | minéral (dalle) | neuf\_renovation | Sur dalle : sous-couche avec pare-vapeur |
| sous\_couche.m2\_rouleau | 15 | — | Rouleaux de 15 m² |
| lambris.essence | pin maritime 10 cm | geographie (Est, montagne : épicéa) | Lambris pin, lames de 10 cm |
| lambris.m2\_botte | 2,0 | — | Bottes de 2 m² |
| lambris.entraxe\_tasseaux | 50 cm | — | Tasseaux tous les 50 cm |
| tasseau.section | 27 × 40 mm | — | Tasseaux 27 × 40 *(à vérifier)* |
| panneau.format | 2800 × 2070 mm | — | Panneaux 2,80 × 2,07 |
| panneau.epaisseur | 19 mm | — | Panneaux 19 mm |
| panneau.rendement\_debit | 75 % | — | 25 % de chutes de découpe |
| placard.type | coulissant 2 vantaux | — | Façade coulissante |
| mousse.blocs\_par\_bombe | 4 | — | Une bombe de mousse pour 4 portes |

Affichage : au plus 4 hypothèses visibles par défaut (celles qui ont le plus gros levier sur la commande), les autres derrière « voir toutes les hypothèses ».

## 7. Questions à poser

Les quatre premières questions ont le plus gros levier ; les suivantes ne sortent que si le devis laisse le doute **et** que l'ouvrage est présent. Jamais une question de quantité. Une question déjà résolue par le devis, le profil artisan ou une réponse antérieure n'est pas posée. La sensibilité est l'écart de commande (en valeur ou en lignes erronées) si l'IA garde le défaut et qu'il est faux *(estimations, à vérifier sur cas réels)*.

| Rang | Clé `questions.json` | Question affichée | Boutons | Déclencheur | Sensibilité |
| --- | --- | --- | --- | --- | --- |
| 1 | porte.sens | « Porte de la chambre 1 : elle s'ouvre en poussant vers… » | Gauche · Droite · Je ne sais pas encore | sens absent du devis, une question par porte (regroupée en un écran si plusieurs) | 100 % de la ligne : un sens faux = bloc inutilisable |
| 2 | porte.cloison | « Épaisseur des cloisons où vont les portes ? » | 5 cm · 7 cm (standard) · 10 cm · Mur épais | bloc-porte sans huisserie précisée | 100 % de la ligne |
| 3 | parquet.reference | « Tu as déjà choisi la référence du sol ? » | Oui, je la tape · Non, prends un standard | parquet sans référence | ± 15 % sur le nombre de colis |
| 4 | portes.hauteur | « Les portes sont en hauteur standard (204) ? » | Oui · Non, maison ancienne | epoque\_bati avant 1950 ou rénovation | 100 % des lignes porte |
| 5 | parquet.pose | « Pose des lames ? » | Droite · Diagonale · Point de Hongrie | parquet sans mode de pose | 5 à 10 % des colis |
| 6 | parquet.support | « Le sol dessous, c'est… » | Dalle béton ou chape · Plancher bois · Carrelage existant · Sol chauffant | parquet en rénovation | ajoute ou retire le pare-vapeur ; sol chauffant bloque la pose flottante sans accord fabricant |
| 7 | plinthes.existantes | « On garde les plinthes existantes ? » | Oui (quart-de-rond) · Non, plinthes neuves | parquet en rénovation sans ligne plinthe | ajoute ou retire toute la famille plinthes |
| 8 | porte.quincaillerie | « Poignées fournies avec les portes ? » | Oui · Non, je les commande | gamme ou fournisseur inconnu | 1 ligne par porte |
| 9 | placard.type | « Façade de placard : » | Coulissante · Pliante · Battante | placard sans type | change toute la nomenclature |
| 10 | agencement.debit | « Les panneaux sont débités par le fournisseur ? » | Oui, découpe négoce · Non, je débite moi-même | agencement | ± 25 % de panneaux, ajoute la liste de débit |

Formulation : tutoiement si le profil artisan le prévoit, questions de 8 mots maximum, une seule idée. Le bouton « Je ne sais pas encore » est toujours accepté : la ligne part avec la mention « à confirmer » dans le quantitatif fournisseur, au lieu de bloquer tout l'envoi.

## 8. Matériaux dominants par région

La géographie pèse peu (axe « faible ») : elle ne change aucune formule, seulement l'essence ou la gamme proposée par défaut quand le devis n'en dit rien. Toutes ces tendances viennent de l'usage courant et sont *à vérifier auprès d'artisans locaux* ; elles ne déclenchent jamais une question à elles seules.

| Région | Tendance bois et produits | Effet sur les défauts |
| --- | --- | --- |
| Bretagne, Pays de la Loire, Normandie | chêne en parquet et escalier, MDF en plinthes, humidité littorale | pièces humides du littoral : MDF hydrofuge pour plinthes et habillages de salle de bains |
| Nouvelle-Aquitaine (Landes, Gironde) | pin maritime des Landes très présent (lambris, parquet massif, plinthes) | lambris et plinthes pin maritime par défaut |
| Grand Est, Alpes, Jura, Massif central | sapin et épicéa, lambris et frisette fréquents, portes bois massif en montagne | lambris épicéa, portes sapin massif proposées en gamme |
| Hauts-de-France, Île-de-France | logements collectifs, portes palières techniques, cloisons 72 mm très majoritaires | huisserie 72 et alerte porte palière (MI-BPT) |
| Occitanie, PACA, Corse | moins de lambris, parquet contrecollé ou carrelage, portes laquées | lambris rarement par défaut ; climat sec, pas de règle hydrofuge |
| DROM | climat tropical humide, essences locales et traitées | hors périmètre MVP : le moteur affiche « ratios non validés » |

Le département vient de l'adresse du chantier (référentiel commun `departements.json`) ; aucune question de région n'est posée pour ce métier.

## 9. Points singuliers et consommables

Tout ce qui se commande à la pièce en plus des ouvrages principaux, avec le déclencheur. Ces lignes sont celles que l'artisan oublie et qui font revenir au négoce.

| Point singulier | Déclencheur | Quantité | Unité de commande |
| --- | --- | --- | --- |
| Ébrasement ou fourrure de huisserie | mur fini > épaisseur d'huisserie | 1 jeu par porte (2 montants + 1 traverse) | jeu ou barres *(à vérifier)* |
| Butée de porte | chaque porte qui heurte un mur ou un meuble | 1 par porte | u |
| Joint ou barre de seuil | changement de sol au droit de la porte, fractionnement parquet | 1 par passage | barre (longueur ≥ passage) |
| Plinthe rainurée acoustique / joint bas de porte | porte acoustique ou isotherme | 1 par porte | u |
| Grille de transfert d'air | porte de pièce humide si détalonnage insuffisant | 1 par porte concernée *(à vérifier règle VMC)* | u |
| Châssis de galandage | porte coulissante à galandage | 1 par porte, épaisseur de cloison finie | u |
| Profil de fractionnement parquet | surface > 8 × 10 m ou pièces en enfilade | 1 par coupure | barre |
| Nez de marche, profil de finition | parquet sur marche ou palier | 1 par marche | barre |
| Trappe de visite | gaine, baignoire, comble | selon devis | u |
| Tablette de fenêtre | habillage d'appui | 1 par fenêtre | u (longueur commerciale) |
| Embouts et équerres de plan de travail | plan de travail | 1 par extrémité visible, 1 kit par jonction | u |

**Consommables** (petites fournitures, toujours en conditionnement fermé) :

| Consommable | Ratio | Conditionnement |
| --- | --- | --- |
| Colle plinthes (310 ml) | 1 cartouche / 10 ml (plinthe 70 mm), 1 / 6 ml (≥ 100 mm) | cartouche, carton de 12 |
| Mousse PU (750 ml) | 1 bombe / 4 blocs-portes | bombe ; 1 nettoyant pistolet par chantier |
| Mastic acrylique peignable | 1 cartouche / 4 portes (joints de chambranles) *(à vérifier)* | cartouche |
| Vis + chevilles huisserie | 6 par bloc vissé | boîte |
| Clips à lambris | 20 / m² (lame 10 cm, tasseaux 50 cm) | boîte |
| Pointes tête perdue | 3 / ml de plinthe ou 20 / m² de lambris | boîte (kg ou unités) |
| Adhésif sous-couche | 1 rouleau / 50 m² | rouleau |
| Cales de pose parquet | 1 sachet par chantier | sachet |
| Vis d'agencement | 4 / jonction de caisson | boîte |
| Chant thermocollant | ml × 1,10 | rouleau |

Règle : le moteur regroupe les consommables en fin de quantitatif, en une seule ligne par article, toutes pièces cumulées (une seule commande de cartouches, pas une par pièce).

## 10. Cas de test

Cinq cas synthétiques, calculés à la main avec les règles de la section 5, pour faire tourner le moteur avant d'avoir des devis réels. Ils seront remplacés par des devis anonymisés de menuisiers (plan section 13). Format identique au référentiel couverture (`tests/*.json`), avec un champ `reponses` pour simuler les boutons.

**menu-001 — quatre blocs-portes en rénovation d'appartement.** Le devis dit « fourniture et pose de 4 portes de distribution 204 × 83 et 204 × 73, prépeintes ». Les sens sont obtenus par question.

```json
{
  "id": "menu-001",
  "source": "synthétique v0.1, à remplacer par devis réel",
  "devis_pdf": "menu-001.pdf",
  "contexte": { "departement": "22", "neuf_renovation": "renovation", "type_batiment": "logement_collectif" },
  "pieces": [
    { "nom": "chambre 1", "porte": "204x83" },
    { "nom": "chambre 2", "porte": "204x83" },
    { "nom": "salle de bains", "porte": "204x73" },
    { "nom": "WC", "porte": "204x73" }
  ],
  "reponses": { "porte.cloison": "72", "porte.sens": ["droit", "gauche", "droit", "gauche"], "porte.quincaillerie": "commande" },
  "attendu": [
    { "article": "bloc-porte alvéolaire prépeint 204x83 H72 poussant droit serrure à clé", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "bloc-porte alvéolaire prépeint 204x83 H72 poussant gauche serrure à clé", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "bloc-porte alvéolaire prépeint 204x73 H72 poussant droit serrure à condamnation", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "bloc-porte alvéolaire prépeint 204x73 H72 poussant gauche serrure à condamnation", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "ensemble béquilles sur rosace, entrée de clé", "quantite": 2, "unite": "u", "tolerance_pct": 0 },
    { "article": "ensemble béquilles sur rosace, condamnation", "quantite": 2, "unite": "u", "tolerance_pct": 0 },
    { "article": "mousse PU pistolable 750 ml", "quantite": 1, "unite": "bombe", "tolerance_pct": 0 }
  ],
  "alertes_attendues": ["logement collectif : porte de 73 en pièce de l'unité de vie, vérifier accessibilité"],
  "questions_max": 4
}
```

**menu-002 — séjour en stratifié, plinthes neuves.** S = 52 m², périmètre 30 m, deux portes de 0,89 m retirées : ml net 28,2. Colis = ⌈52 × 1,05 / 1,835⌉ = ⌈29,75⌉ = 30 ; sous-couche ⌈54,6 / 15⌉ = 4 ; plinthes ⌈28,2 × 1,08 / 2,40⌉ = 13 ; colle ⌈28,2 / 10⌉ = 3.

```json
{
  "id": "menu-002",
  "source": "synthétique v0.1",
  "contexte": { "departement": "35", "neuf_renovation": "renovation" },
  "devis_lignes": ["Fourniture et pose sol stratifié Quick-Step Impressive 8 mm, séjour, 52 m²", "Plinthes MDF prépeintes 70 mm"],
  "reponses": { "parquet.pose": "droite", "parquet.support": "dalle" },
  "attendu": [
    { "article": "stratifié Quick-Step Impressive 8 mm 1380x190, 1,835 m²/colis", "quantite": 30, "unite": "colis", "tolerance_pct": 3 },
    { "article": "sous-couche 2 mm pare-vapeur intégré, rouleau 15 m²", "quantite": 4, "unite": "rouleau", "tolerance_pct": 0 },
    { "article": "plinthe MDF prépeinte 10x70, barre 2,40 m", "quantite": 13, "unite": "barre", "tolerance_pct": 8 },
    { "article": "colle fixation plinthes 310 ml", "quantite": 3, "unite": "cartouche", "tolerance_pct": 0 },
    { "article": "adhésif de jonction sous-couche", "quantite": 2, "unite": "rouleau", "tolerance_pct": 0 },
    { "article": "barre de seuil", "quantite": 2, "unite": "barre", "tolerance_pct": 0 }
  ],
  "questions_max": 4
}
```

**menu-003 — lambris de plafond.** Pièce 4,5 × 4 m = 18 m², lames dans le sens des 4,5 m. Bottes ⌈18 × 1,10 / 2⌉ = 10 ; tasseaux (⌈4,5 / 0,5⌉ + 1) × 4 m = 40 ml → ⌈44 / 2,40⌉ = 19 barres ; clips 18 × 20 = 360 → 4 boîtes de 100.

```json
{
  "id": "menu-003",
  "source": "synthétique v0.1",
  "contexte": { "departement": "40", "neuf_renovation": "renovation" },
  "devis_lignes": ["Habillage plafond lambris pin maritime 10 cm sur tasseaux, chambre 18 m²"],
  "attendu": [
    { "article": "lambris pin maritime 2000x100, botte 2 m²", "quantite": 10, "unite": "botte", "tolerance_pct": 5 },
    { "article": "tasseau 27x40, barre 2,40 m", "quantite": 19, "unite": "barre", "tolerance_pct": 10 },
    { "article": "clips à lambris, boîte de 100", "quantite": 4, "unite": "boîte", "tolerance_pct": 0 },
    { "article": "vis + chevilles tasseaux", "quantite": 1, "unite": "boîte", "tolerance_pct": 0 }
  ],
  "questions_max": 2
}
```

**menu-004 — façade de placard coulissante.** Baie 1,60 × 2,50 m : 2 vantaux, rails en barre de 2 m.

```json
{
  "id": "menu-004",
  "source": "synthétique v0.1",
  "devis_lignes": ["Façade de placard coulissante 2 portes miroir, baie 160 x 250"],
  "attendu": [
    { "article": "façade coulissante 2 vantaux miroir, baie 1600x2500", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "kit rails haut et bas 2 voies, 2 m", "quantite": 1, "unite": "kit", "tolerance_pct": 0 }
  ],
  "questions_max": 1
}
```

**menu-005 — maison de 1930, piège hauteur.** Le devis dit « remplacement de 3 portes de chambre ». Le moteur doit poser la question de hauteur (époque avant 1950) et, si « maison ancienne », sortir des portes sur mesure avec la mention « cotes à relever », sans inventer de dimension.

```json
{
  "id": "menu-005",
  "source": "synthétique v0.1",
  "contexte": { "epoque_bati": "avant_1950", "neuf_renovation": "renovation" },
  "devis_lignes": ["Remplacement de 3 portes de chambre, portes isoplanes à peindre"],
  "reponses": { "portes.hauteur": "non" },
  "attendu": [
    { "article": "porte isoplane sur mesure à peindre, cotes à relever", "quantite": 3, "unite": "u", "tolerance_pct": 0, "statut": "a_confirmer" }
  ],
  "interdit": ["bloc-porte 204"],
  "questions_max": 4
}
```

## 11. Ratios à faire valider par un menuisier agenceur

À relire avec un artisan du métier, par ordre d'impact sur la commande. Chaque case cochée passe le ratio de « à vérifier » à « validé » dans `ratios-a-valider.md`, avec le nom du valideur et la date.

- [ ] Correspondance épaisseur de cloison → huisserie (50, 72, 98-100, mur épais + ébrasement) (5.1)
- [ ] Serrure par défaut selon la pièce (clé, condamnation, bec-de-cane) (5.1)
- [ ] Pertes parquet : 5 % droite, 8 % pièces découpées, 12 % diagonale, 10 % point de Hongrie (5.4)
- [ ] Perte plinthes 8 % et calcul pièce par pièce (5.3)
- [ ] Colle plinthes : 1 cartouche 310 ml pour 10 ml (70 mm) et 6 ml (≥ 100 mm) (5.3)
- [ ] Mousse PU : 1 bombe 750 ml pour 4 blocs-portes (5.1)
- [ ] Fixation huisserie : 6 vis + chevilles par bloc (5.1)
- [ ] Lambris : perte 10 % / 15 %, tasseaux 27 × 40 à 50 cm, 20 clips/m² (5.6)
- [ ] Façade coulissante : seuils 2 / 3 / 4 vantaux selon largeur de baie (5.7)
- [ ] Agencement : rendement de débit 75 %, charnières par hauteur de porte (5.8)
- [ ] Barre de seuil par passage de porte et longueurs commerciales (5.4)
- [ ] Plinthes anciennes 14 × 120 par défaut avant 1950 (6)
- [ ] Bloc-porte de rénovation : perte de passage réelle (3)
- [ ] Accessibilité : largeurs minimales en logement neuf (5.1)

## 12. Sources officielles

Pages ouvertes le 3 octobre 2026.

| Source | Ce qu'elle apporte | Lien |
| --- | --- | --- |
| FFB, NF DTU 36.2 révisé (2025) | périmètre menuiserie intérieure et agencement, remplace l'édition 2016 | [ffbatiment.fr](https://www.ffbatiment.fr/actualites-batiment/actualite-bam/nf-dtu-36-2-nouvelle-reference-menuiserie-interieure-agencement) |
| FFB, calepin NF DTU 36.2 | huisseries, portes, trappes, placards, tolérances (adhérents) | [ffbatiment.fr](https://www.ffbatiment.fr/techniques-batiment/amenagement-finitions/menuiseries-interieures/calepin/menuiseries-interieures-bois-nf-dtu-36-2) |
| Afnor, NF DTU 36.2 P1-1 | texte normatif (payant) | [boutique.afnor.org](https://www.boutique.afnor.org/fr-fr/norme/nf-dtu-362-p11/travaux-de-batiment-menuiseries-interieures-en-bois-partie-11-cahier-des-cl/fa175743/1572) |
| Afnor, NF DTU 51.11 P1-1 (mai 2024) | parquet flottant (payant) | [boutique.afnor.org](https://www.boutique.afnor.org/en-gb/standard/nf-dtu-5111-p11/building-works-parquet-flooring-installed-floating-part-11-contract-bill-of/fa200228/418687) |
| FFB, publication du DTU 51.11 révisé | nouveautés 2024, sols chauffants | [ffbatiment.fr](https://www.ffbatiment.fr/actualites-batiment/actualite-bam/parquets-flottants-publication-du-nf-dtu-51-11-revise) |
| FFB, calepin parquets | DTU 51.1, 51.11, 51.2, 51.3 | [ffbatiment.fr](https://www.ffbatiment.fr/techniques-batiment/amenagement-finitions/parquet-bois/calepin/calepin-chantier-parquets-planchers-bois) |
| Notice bloc-porte H72 (Weldom) | cotes de réservation 63 à 93 | [PDF](https://media.weldom.fr/v2/media/catalog/product/doc_qualite/ims/IMS_80135937.pdf) |
| Quick-Step, fiches techniques | Impressive, Compact, Disegno | [Impressive](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_952917.pdf), [Compact](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1545127.pdf), [Disegno](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1545135.pdf) |
| Panaget, fiche Diva 90 | colisage, poids, DTU de pose | [PDF](https://panaget.com/content/uploads/quable/floor/1022760/medias/parquet_ch_ne_classic_bois_flott_diva90-type_of_doc=FT.pdf) |
| Notice parquet flottant (BigMat) | fractionnement 8 × 10 m, jeu 8 mm + 1,5 mm/m | [PDF](https://medias.bigmat.fr/data_medias/medias_finaux/documents/3524830066557-1WskQCqOn2.pdf) |
| Egger, Eurodekor | format 2800 × 2070, épaisseurs | [support.egger.com](https://support.egger.com/hc/en-us/articles/360001082138-What-are-the-dimensions-of-EGGER-Eurodekor-Faced-Chipboard) |
| Sotrinbois (via CMESMAT) | plinthes, longueurs et lots | [réf. 7185](https://www.cmesmat.fr/bois--menuiserie/amenagement-interieur/baguettes--moulures--tasseaux/moulures-plinthes/2496532-plinthe-bord-vif-revetu-papier-mdf-blanc-long-2400-mm-x-larg-70-mm-x-ep-10-mm.html) |
| SCA Wood, notice lambris | entraxe tasseaux, fixation | [PDF](https://media.weldom.fr/v2/media/catalog/product/doc_qualite/ims/IMS_5600852.pdf) |
| Lambris pin maritime (SIF) | paquet 10 lames = 2 m², 11 kg | [PDF](https://media.castorama.fr/is/content/Castorama/3297060013096_ran_fr_cfpdf) |
| Legallais, ferrures Palma | coulissant : charges, hauteurs, kits | [PDF](https://cdn.legallais.com/pm_11812_503_503082-6ulwhaphcd.pdf) |
| Kazed, notices | portes pliantes, prise de cotes | [PDF](https://www.kazed.fr/fichier/A/538.pdf) |
| Bostik, fiches | colle plinthes 310 ml, Mastirex | [colle plinthes](https://diy.bostik.com/sites/default/files/2021-02/Bostik-diy-Fr-fiche-technique-colle-fixation-plinthes-30605355-tds.pdf), [Mastirex](https://medias.descours-cabaud.com/d180001/medias/docus/112/8910333673502.pdf) |
| Gebsomousse (GEB) | rendement mousse PU | [fiche](https://www.batiproduits.com/amp/fiche/produits/mousses-polyurethanes-expansives-en-bombe-p68881758.html) |
| Isorom Vapor Guard | sous-couche 15 m², 40 rouleaux/palette | [fiche](https://www.batiproduits.com/amp/fiche/produits/sous-couches-sols-stratifies-isorom-vapor-guard-p492455534.html) |

## 13. Plan de complétion

Par ordre d'importance, ce qui manque pour passer de v0.1 à une version de production.

1. **Trois à cinq devis réels de menuisiers** (anonymisés) pour remplacer les cas synthétiques de la section 10, avec la commande réellement passée au négoce.
2. **Relecture des ratios** de la section 11 par un menuisier agenceur.
3. **Textes DTU** : acheter ou consulter NF DTU 36.2 (2025) et NF DTU 51.11 (2024) pour confirmer fixation des huisseries, jeux, fractionnement, pare-vapeur.
4. **Fiches négoce** : conditionnements réels chez Point.P, Gedimat, Panofrance, Dispano, Chrétien Matériaux (lots de plinthes, cartons de colle, boîtes de clips, longueurs de chant, barres de seuil).
5. **Catalogues blocs-portes pro** (Jeld-Wen, Chauvat, Huet, Malerba) : gammes, huisseries disponibles, références techniques coupe-feu et acoustique.
6. **Placards** : grilles Sogal et Kazed largeur de baie → nombre de vantaux, hauteurs max.
7. **Agencement** : brancher un calcul de débit simple, ou accepter une liste de débit en entrée (hors MVP).
8. **Escalier** : décider s'il reste une ligne « sur mesure atelier » ou s'il mérite son propre tiroir.

## 14. CHANGELOG

| Date | Version | Changement |
| --- | --- | --- |
| 3 octobre 2026 | v0.1 | Création au format section 27 : 14 chapitres, 12 ouvrages, fiches fabricant sourcées (portes, parquets, plinthes, lambris, panneaux, placards, consommables), 10 questions à boutons, 5 cas de test JSON synthétiques. Ratios non validés par un artisan. |
