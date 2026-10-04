# Référentiel quantitatif TERRASSE BOIS / COMPOSITE (Rappidos)

Oct 3, 2026 · @Greg

Ce document est le tiroir `referentiels/terrasse/` du moteur générique BatiClair (gabarit section 27 du référentiel couverture). Il ne contient que des données : vocabulaire, matériaux, formules, défauts, questions et tests. Aucun mot de ce métier ne doit apparaître dans le code du moteur.

Statut : **beta, à faire relire par un poseur de terrasses**. Toute valeur non sourcée porte la mention *(à vérifier)*. Les ratios à confirmer sont listés au chapitre 11.

Périmètre : terrasses extérieures en lames de bois massif (résineux traités, bois exotiques, bois thermo-traités) et en lames composites (bois-polymère), posées sur lambourdes, avec support plots, dalle béton, sol stabilisé, ou structure sur pieux/poteaux. Hors périmètre : dalles béton/carrelage (tiroir carrelage), terrassement lourd (tiroir terrassier), garde-corps métal sur mesure, pergolas.

## 1. Métier et axes de variation

Le poseur de terrasse réalise un platelage extérieur : une ossature (lambourdes, parfois solives et poteaux) posée sur des appuis, recouverte de lames vissées ou clipsées. Le quantitatif dépend surtout de trois choses : la matière des lames (bois ou composite), la nature du support (dalle, plots, sol, pieux) et la gamme choisie. La géographie compte peu, sauf pour l'essence dominante et la visserie inox en bord de mer.

```json
{
  "code": "terrasse",
  "nom": "Terrasse bois / composite",
  "version": "0.1.0",
  "normes": ["NF DTU 51.4 (2018)", "FD P 20-651", "NF EN 335", "NF EN 350", "NF EN 15534-4 (composite)", "Guides de pose fabricants composite"],
  "axes_de_variation": {
    "geographie": "faible",
    "epoque_bati": "nul",
    "type_batiment": "faible",
    "neuf_renovation": "moyen",
    "gamme": "fort"
  },
  "metiers_lies": ["terrassement", "maconnerie", "menuiserie_exterieure", "serrurerie"],
  "unites_de_commande": ["u", "barre", "botte", "boite", "sachet", "rouleau", "sac", "cartouche", "pot"],
  "maturite": "beta"
}
```

| Axe | Poids | Ce qui change | Comment le moteur le résout |
| --- | --- | --- | --- |
| gamme | fort | matière et essence des lames (pin classe 4, douglas, thermo, ipé, composite creux ou plein), donc section, entraxe des lambourdes, type de fixation | lu dans le devis (essence, marque) ; sinon question Q1 |
| neuf\_renovation | moyen | dépose d'une ancienne terrasse, réemploi des lambourdes, évacuation | lu dans le devis (« dépose », « remplacement ») ; jamais demandé seul |
| geographie | faible | essence dominante par région (ch. 8), visserie inox A4 à moins de 3 km de la mer, classe d'emploi plus sévère en climat humide | département du chantier |
| type\_batiment | faible | terrasse surélevée > 1 m : garde-corps obligatoire et structure porteuse ; terrasse de piscine ou d'ERP : lames antidérapantes | lu dans le devis (hauteur, piscine) |
| epoque\_bati | nul | aucun effet : l'ouvrage est neuf à chaque fois | non posé |

Le vrai levier du métier n'est pas un axe régional mais le **support** : il décide si l'on commande des plots, des cales, des poteaux, du béton ou rien. C'est la question Q2 (ch. 7).

## 2. Règle d'or et unités de commande

**Une terrasse se vend au m², elle se commande en lames de longueur donnée.** Le moteur ne sort jamais « 25 m² de lames » : il sort un nombre de lames avec section et longueur, ou des mètres linéaires découpés en longueurs commerciales. Le gars du négoce doit pouvoir charger le camion sans rappeler.

| Article | Unité de commande en sortie | Exemple de ligne qui passe le test fournisseur | Interdit |
| --- | --- | --- | --- |
| Lame bois résineux | u (lames) par longueur | « 64 lames pin du Nord classe 4 marron 27×145, longueur 4,20 m » | m², « lot » |
| Lame bois exotique en longueurs panachées | ml + nombre de lames estimé, longueurs « panachées » assumées | « 175 ml lames ipé 21×145 lisses, longueurs panachées 1,85 à 4,90 m (≈ 25 m² couverts) » | m² seul |
| Lame composite | u (lames) par longueur | « 46 lames Silvadec Atmosphère 138×23 brun, longueur 4,00 m » | m² |
| Lambourde bois | u par longueur | « 30 lambourdes pin classe 4 45×70, longueur 4,00 m » | ml sans longueur |
| Lambourde alu ou composite | u (barres) par longueur | « 18 lambourdes aluminium 40×60, longueur 4,00 m » | ml seul |
| Solive | u par longueur et section | « 6 solives douglas classe 4 75×175, longueur 4,00 m » | ml seul |
| Vis lames | boîte (200 ou 500) + quantité de vis | « 4 boîtes de 500 vis inox A2 5×50 Torx tête réduite (≈ 1 830 vis) » | « vis » sans dimensions ni matière |
| Clips cachés | sachet / boîte + nombre | « 5 boîtes de 100 clips + 1 sachet de 50 clips de départ » | nombre de clips sans conditionnement |
| Plots réglables | carton (souvent 60) + nombre, plage de hauteur | « 2 cartons de 60 plots Jouplast Essentiel 40-60 mm (102 plots) » | plots sans plage de hauteur |
| Bande de protection lambourde | rouleau (10 ou 20 m) + largeur | « 9 rouleaux bande bitume 75 mm × 20 m » | ml |
| Géotextile | rouleau (largeur × longueur) | « 1 rouleau géotextile 100 g/m², 2 × 25 m » | m² seul |
| Cales de désolidarisation | sachet / seau + épaisseur | « 2 sachets de 50 cales 10 mm » | — |
| Gravier / sable stabilisé | sac (25-35 kg) ou big bag (≈ 1 t) | « 2 big bags gravillon 6/10 » | m³ seul si le négoce vend en big bag |
| Béton pour plots | sac 35 kg ou m³ toupie | « 18 sacs béton prêt à l'emploi 35 kg » | — |
| Lasure / saturateur | pot (1, 2,5, 5 L) | « 2 pots saturateur 5 L » | litres seuls |

Règle de découpe en longueurs : le moteur choisit la longueur commerciale qui minimise la chute pour la dimension du chantier (ch. 5.2). Si la terrasse fait 4,80 m dans le sens des lames, il commande des lames de 4,80 m ; si elle fait 5,50 m, il combine 2 longueurs avec joints décalés sur double lambourde. Une ligne de lames indique toujours la longueur.

## 3. Ouvrages du métier, vocabulaire des devis et pièges

Un devis de terrasse se décompose presque toujours en 4 à 8 ouvrages. Le moteur rattache chaque ligne à un code `ouvrage` via `vocabulaire.json`, puis ne charge que les règles de ces ouvrages.

| Code ouvrage | Ce que l'artisan réalise | Ce que disent les devis (synonymes) | Matériaux déclenchés |
| --- | --- | --- | --- |
| `platelage_bois` | lames bois vissées sur lambourdes | « fourniture et pose lames pin classe 4 », « platelage ipé », « deck bois », « lames 27×145 », « terrasse douglas », « terrasse exotique » | lames, vis, bande lambourde, cales |
| `platelage_composite` | lames composites clipsées | « lames composite », « bois composite », « Silvadec », « Fiberon », « Trex », « UPM ProFi », « lame alvéolaire/pleine », « WPC » | lames, clips, clips départ/fin, vis composite |
| `ossature_lambourdes` | lambourdes sur appuis | « structure », « lambourdage », « lambourdes 45×70 », « ossature », « solivage léger », « double lambourdage » | lambourdes, fixations lambourdes, cales |
| `ossature_solives` | solives > 70 cm de portée, terrasse haute | « solivage », « poutres », « structure porteuse », « terrasse surélevée », « sur pilotis » | solives, sabots, équerres, poteaux, boulons |
| `appuis_plots_reglables` | plots polymères | « plots réglables », « plots PVC », « plots Jouplast/Buzon », « sur plots » | plots, rehausses, têtes |
| `appuis_plots_beton` | plots maçonnés ou parpaings | « plots béton », « dés béton », « parpaings », « massifs » | béton sac, coffrages, cales 10 mm |
| `appuis_vis_fondation` | vis de fondation | « pieux vissés », « vis de fondation », « Krinner » | vis de fondation, platines |
| `appuis_dalle` | lambourdes fixées sur dalle existante | « sur dalle existante », « sur chape », « sur béton » | chevilles, équerres, cales 10/20 mm |
| `preparation_sol` | décapage, géotextile, gravier | « préparation du sol », « décaissement », « feutre », « géotextile », « anti-racines », « lit de gravier » | géotextile, gravier, agrafes |
| `finitions` | bandeaux, nez de marche, jupes, plinthes | « habillage », « bandeau périphérique », « contremarche », « jupe », « planche de rive », « nez de marche » | planches de finition, vis, équerres |
| `marches` | escalier ou marches de terrasse | « marches », « emmarchement », « escalier bois » | limons, lames de marche |
| `garde_corps` | garde-corps bois/alu/inox | « garde-corps », « rambarde », « balustrade » | poteaux, lisses, platines (souvent sous-traité : ligne recopiée telle quelle) |
| `trappe` | trappe de visite | « trappe d'accès », « trappe regard » | cadre, charnières |
| `depose` | dépose ancienne terrasse | « dépose », « démontage », « évacuation » | big bag déchets, location benne |
| `entretien` | saturateur, huile, dégriseur | « saturateur », « huile de protection », « lasure », « traitement » | pots (rendement ch. 4.9) |

### Pièges du vocabulaire

1. **« m² de terrasse » n'est pas « m² de lames ».** Le devis donne la surface au sol ; les lames se calculent avec le joint de dilatation et la chute (ch. 5).
2. **« Lambourde » vs « solive ».** Au-delà de 70 cm entre appuis (60 cm sur 2 appuis), ce que le devis appelle « lambourde » est en fait une solive au sens du DTU : changer de section et de fixation.
3. **« Classe 4 » ne dit pas l'essence.** Classe 4 = pin traité autoclave dans 95 % des devis *(à vérifier)* ; « classe 4 marron » ou « brun » = même pin, coloré.
4. **« Composite » sans marque.** Les entraxes de lambourdes diffèrent selon la marque (30 à 50 cm) : la question Q1 n'est posée que si l'entraxe ne peut pas être déduit.
5. **« Lames de 4 m » dans le devis.** Prendre la longueur du devis comme contrainte, pas comme hypothèse : l'artisan a souvent déjà son fournisseur.
6. **« Fixations invisibles ».** Composite = clips ; bois = clips spécifiques (lame rainurée) ou vissage par le dessous. Ne jamais sortir des vis traversantes si le devis dit « invisible ».
7. **« Sur plots » seul.** Peut désigner des plots réglables polymère ou des plots béton coulés : Q2 lève le doute.
8. **Bord de piscine.** Impose lames classe 4 ou exotique et vis inox A4 à proximité d'eau chlorée ou salée *(à vérifier)*.

## 4. Matériaux et fiches fabricant

Chaque ligne ci-dessous devient une entrée de `materiaux.json`. Les poids marqués « calculé » viennent de la masse volumique sourcée × section ; ils servent au chargement du camion, pas à la commande.

### 4.1 Lames bois

| Article | Section (mm) | Longueurs commerciales (m) | Conditionnement négoce | Poids | Source |
| --- | --- | --- | --- | --- | --- |
| Pin du Nord classe 4 vert ou marron, lisse ou strié | 27 × 145 | 2,40 / 2,70 / 3,00 / 3,60 / 3,90 / 4,20 / 4,80 / 5,10 / 5,40 / 5,70 | à la lame ; botte de 5 chez certains négoces | ≈ 2,1 kg/ml (calculé, 530 kg/m³ *à vérifier*) | [Chausson](https://www.chausson.fr/materiaux/lame-terrasse-pin-nord-traite-classe-marron-classeo-lisse-480cmx145cm-ep27mm-p-502831-10), [Idéa Bois](https://www.idea-bois.com/art-lame-terrasse-3-60-m-145-x-27-mm-pin-du-nord-us-classe-4-marron-2939.htm), [L'Espace 2B](https://lespace-2b.com/shop/exterieur/terrasses-bois/terrasse-bois-pin-classe-4-27-145-mm/) |
| Pin thermo-traité (THT) | 26 × 142 | 4,20 | à la lame | *à vérifier* | [Nature Bois Concept](https://www.nature-bois-concept.com/boutique/terrasse-bois/lames/lames-bois-resineux/3627-pin-vert-ab-lisse-l420-m-ep27-l145-mm/) |
| Douglas AB lisse | 27 × 145 | 3,00 (autres *à vérifier*) | à la lame | ≈ 2,0 kg/ml (calculé *à vérifier*) | [Nature Bois Concept](https://www.nature-bois-concept.com/boutique/terrasse-bois/lames/lames-bois-resineux/3627-pin-vert-ab-lisse-l420-m-ep27-l145-mm/) |
| Ipé lisse | 21 × 145 | courtes : 0,63 / 0,95 / 1,25 / 1,55 / 1,85 ; grandes : 2,15 à 5,15, panachées selon arrivage | au m² ou à la lame, longueurs panachées | ≈ 3,2 kg/ml (calculé, 1 040 kg/m³ sourcé) | [Sud Bois](https://sud-bois.fr/623-terrasse-ipe-21x145), [Sundeck](https://sundeck.fr/product/lames-de-terrasse-ipe-21mm-x-145mm-2-faces-lisses-1m85), [Nature Bois Concept](https://www.nature-bois-concept.com/boutique/terrasse-bois/lames/lames-bois-exotique/2463-lame-ipe-lisse-ep21-mm-l145-mm-grandes-longueurs-a-partir-de-185-m/) |
| Cumaru, itauba, padouk, garapa | 21 × 145 | idem ipé | idem ipé | cumaru ≈ 3,3 kg/ml (1 070 kg/m³) ; itauba ≈ 2,6 kg/ml (860 kg/m³) | [Nature Bois Concept itauba](https://www.nature-bois-concept.com/boutique/terrasse-bois/lames/lames-bois-exotique/2892-lame-itauba-185m-lisse-21x145/), [cumaru](https://www.nature-bois-concept.com/boutique/terrasse-bois/kit/exotique/1752-kit-terrasse-cumaru-5-a-60-m2-lames-l125m-ep21mm-l145mm/) |

Propriétés DTU par essence (élancement maxi = largeur/épaisseur, épaisseur mini, classe mécanique simplifiée), d'après le [guide FCBA conforme NF DTU 51.4 de 2018](https://franceboisforet.fr/wp-content/uploads/2020/06/Guide_Terrasse-FNB-LCB-ATB-ARBUST-FCBA_avec_liens_BD.pdf) :

| Essence | Classe mécanique | Élancement maxi | Épaisseur mini (mm) | Stabilité |
| --- | --- | --- | --- | --- |
| Pin sylvestre / maritime traité, douglas, mélèze | C18 | 6 | 21 | MS |
| Châtaignier | D18 | 5 | 22 | MS |
| Chêne | D18 | 5 | 22 | MS |
| Ipé | D50 | 7 | 21 | S |
| Cumaru | D50 | 7 | 21 | MS |
| Itauba | D40 | 5 | 21 | MS |
| Padouk | D40 | 7 | 21 | S |
| Teck | D30 | 7 | 21 | S |

Conséquence pour le moteur : un pin 27 × 145 (élancement 5,4) est conforme ; un pin 21 × 145 (6,9) ne l'est pas et doit déclencher un avertissement.

### 4.2 Lames composites

| Article | Section (mm) | Longueur (m) | Palette | Poids | Entraxe lambourdes | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Silvadec Atmosphère / Elegance / Emotion 138 | 138 × 23 | 4,00 (1 à 6 m sur commande) | 104 lames = 59 m² utiles | 3,2 à 3,6 kg/ml selon finition | 400 mm | [Silvadec FT0002](https://de.silvadec.com/wp-content/pdf/fr-FT0002.pdf), [FT0003](https://fr.silvadec.com/wp-content/pdf/fr-FT0003.pdf) |
| Silvadec 180 | 180 × 23 | 4,00 | 78 lames = 57 m² utiles | 4,25 à 4,6 kg/ml | 400 mm | [Silvadec FT0001](https://de-at.silvadec.com/wp-content/pdf/fr-FT0001.pdf) |
| Autres marques (Fiberon, Trex, UPM ProFi, TimberTech, marques négoce) | 140-146 × 21-25 | 2,40 à 4,88 *à vérifier* | *à vérifier* | *à vérifier* | 300 à 500 mm selon marque *à vérifier* | — |

Ratios fabricant Silvadec par m² : lame 138 → 7 ml de lames, 3 ml de lambourdes, 18 clips ; lame 180 → 5,4 ml, 3 ml, 14 clips ([FT0001](https://de-at.silvadec.com/wp-content/pdf/fr-FT0001.pdf)). Jeu entre lames 5 mm, jeu périphérique 15 mm, porte-à-faux maxi 25 mm ([notice PU7](https://fr.silvadec.com/wp-content/pdf/fr-PU7.pdf)).

### 4.3 Lambourdes et solives

| Article | Section (mm) | Longueurs (m) | Conditionnement | Source |
| --- | --- | --- | --- | --- |
| Lambourde pin classe 4 | sections standard DTU : 60×40, 60×45, 70×40, 75×45, 60×60 ; courant négoce 45×70 | 2,40 / 3,00 / 4,00 / 4,80 *à vérifier* | à l'unité ; palette | [Guide FCBA §4.3.7](https://franceboisforet.fr/wp-content/uploads/2020/06/Guide_Terrasse-FNB-LCB-ATB-ARBUST-FCBA_avec_liens_BD.pdf), [Sud Bois](https://sud-bois.fr/623-terrasse-ipe-21x145) |
| Lambourde exotique | 40 × 60 ; 42 × 65 lamellé-collé | 1,85 / 2,15 / 4,00 | au ml ou à l'unité | [Nature Bois Concept](https://www.nature-bois-concept.com/boutique/terrasse-bois/kit/exotique/3561-kit-terrasse-ipe-5-a-60-m2-lames-l125m-ep21mm-l145mm/), [Central Bois](https://centralbois.fr/terrasse-bois-exotique/292-lambourde-40x60-en-4m-cumaru-exotique-lamelle-colle-naturel-premium.html) |
| Lambourde composite Silvadec | 50 × 50 | 3,00 / 4,00 | à l'unité | [FT0001](https://de.silvadec.com/wp-content/pdf/fr-FT0001.pdf) |
| Lambourde aluminium Silvadec | 63 × 40 (Reversil, 3,60 m) ; 47 × 76 (4,00 m) | 3,60 / 4,00 | à l'unité | [FT0001](https://de-at.silvadec.com/wp-content/pdf/fr-FT0001.pdf), [Menuiserie Terrasses Création](https://www.menuiserie-terrasses-creation.com/achat-accessoires-de-montage-terrasse-silvadec-a994.html) |
| Solive | 50, 65 ou 75 de large × 100 à 225 de haut | 3,00 à 6,00 *à vérifier* | à l'unité, marquée CE | [Guide FCBA §4.4.6](https://franceboisforet.fr/wp-content/uploads/2020/06/Guide_Terrasse-FNB-LCB-ATB-ARBUST-FCBA_avec_liens_BD.pdf) |

Section minimale DTU des lambourdes : largeur 45 mm (1 vis dans la largeur, ≤ C30), 60 mm (2 vis Ø 5), 68 mm (2 vis Ø 6) ; hauteur ≥ 1,5 × e + 8 mm (lame résineuse ou feuillue sur résineux), ≥ 2,2 × e (lame feuillue sur résineux), e = épaisseur de lame. Lambourde composite Silvadec : largeur ≥ 42 mm, hauteur sous lame ≥ 50 mm ; elle n'est pas structurelle et doit être soutenue tous les 30 cm ([PU7](https://fr.silvadec.com/wp-content/pdf/fr-PU7.pdf)).

### 4.4 Fixations des lames

| Article | Dimensions | Conditionnement | Usage | Source |
| --- | --- | --- | --- | --- |
| Vis terrasse inox A2, tête fraisée réduite, Torx T20/T25, double filet | 5 × 50 | boîte 200 ou 500 ; seau 400 | lames 21 mm | [Chausson](https://www.chausson.fr/materiaux/vis-inox-a2-terrasse-bois-tete-fraisee-torx-diametre-5mm-longueur-50mm-500pieces-p-347438-1), [Quéguiner](https://www.queguiner.fr/outillage-quincaillerie/clouterie-visserie/visserie-inox/vis-terrasse-inox-et-accessoires/vis-12) |
| Idem | 5 × 60 | boîte 200 ou 500 | lames 24-27 mm (résineux sur résineux : 1,5 × 27 + 27 = 67 mm → 5 × 70 si strict, voir ch. 5.4) | [Chausson 5×60](https://www.chausson.fr/materiaux/vis-inox-a2-terrasse-bois-tete-fraisee-torx-diametre-5mm-longueur-60mm-500pieces-p-347441-1) |
| Idem | 5 × 70 | boîte 200 | lames 27-28 mm | [Chausson](https://www.chausson.fr/materiaux/vis-inox-a2-terrasse-bois-tete-fraisee-torx-diametre-5mm-longueur-60mm-500pieces-p-347441-1) |
| Vis inox A4 (bord de mer, chêne, exotiques à tanins) | 5 × 50 / 5 × 60 | boîte 200 | ambiance agressive | [Sud Bois](https://sud-bois.fr/134-visserie-inox) |
| Clip simple Silvadec + vis inox 4 × 35 | — | sachet 30 (≈ 1,5 m²) ou 360 | composite | [Idéa Bois](https://www.idea-bois.com/art-clips-de-fixation-vis-inox-silvadec-sachet-de-30-pcs-3413.htm), [FT0001](https://de.silvadec.com/wp-content/pdf/fr-FT0001.pdf) |
| Clip début/fin Silvadec | — | sachet 10 | lames de rive | [FT0001](https://de.silvadec.com/wp-content/pdf/fr-FT0001.pdf) |
| Clip d'aboutage Silvadec | — | sachet 10 | jonction en bout sur 1 lambourde (pas sur alu) | [FT0001](https://de.silvadec.com/wp-content/pdf/fr-FT0001.pdf) |
| Clip simple pour lambourde alu + vis | — | sachet 36 | composite sur alu | [FT0001](https://de-at.silvadec.com/wp-content/pdf/fr-FT0001.pdf) |

### 4.5 Appuis

| Article | Caractéristiques | Conditionnement | Source |
| --- | --- | --- | --- |
| Plot réglable Jouplast Essentiel pour lambourde | plages 20-30, 40-60, 50-80, 80-140, 140-230 mm ; embase Ø 208 mm ; tête Ø 120 mm ; 0,23 kg ; > 1 t | carton 60, palette 720 | [Chausson](https://www.chausson.fr/materiaux/plot-reglable-terrasse-lambourdes-jouplast-hauteur-reglable-p-655408-1), [Paysaliste](https://paysaliste.com/products/plot-terrasse-bois-reglable-40-60mm-gamme-essentiel-jouplast) |
| Rehausse Jouplast 10 mm | 4 maxi par plot | carton 60 | [Ain Carrelages](https://www.ain-carrelages.com/p/3-sac-de-60-plots-reglables-essentiel-jouplast-hd-40-60mm.html) |
| Plot béton coulé | surface mini 150 cm² (résidentiel), coffrage PVC ou carton, béton sac 35 kg | sac | [Guide FCBA §3.3.6](https://franceboisforet.fr/wp-content/uploads/2020/06/Guide_Terrasse-FNB-LCB-ATB-ARBUST-FCBA_avec_liens_BD.pdf) |
| Cales de désolidarisation polymère | 3 mm (lame/lambourde), 5 mm (support linéaire béton), 10 mm (dalle, lambourde dans la pente), 20 mm (dalle, lambourde perpendiculaire à la pente) | sachet *à vérifier* | [Guide FCBA §3.2.3](https://franceboisforet.fr/wp-content/uploads/2020/06/Guide_Terrasse-FNB-LCB-ATB-ARBUST-FCBA_avec_liens_BD.pdf) |

Plots polymères DTU : surface d'embase ≥ 150 cm² et 3 kN sur demi-tête en résidentiel ; hauteur sous lames ≤ 30 cm ; jonction de lambourdes centrée sur la tête (≥ 25 cm² d'appui par lambourde).

### 4.6 Protection et sol

| Article | Dimensions | Couverture annoncée | Source |
| --- | --- | --- | --- |
| Bande de protection lambourde Jouplast EPDM adhésive | 77 mm × 20 m, ép. 1 mm | ≈ 8 m² de terrasse à entraxe 50 cm | [Leroy Merlin](https://www.leroymerlin.fr/produits/bande-de-protection-lambourde-l-20m-x-l-7-7-cm-70634354.html), [Sud Bois](https://sud-bois.fr/rouleau-bande-bitumeuse-etancheite/1366-rouleau-bande-bitumeuse-sous-lambourde-pour-terrasse-8-cm-x-20-m.html) |
| Bande bitumineuse Soprema | 75 mm × 20 m | — | [Plots Discount](https://www.plots-discount.com/fr/accessoires-terrasse-bois/1788-bande-de-protection-lambourde-bitumineuse-75mmx20m-9508838748565.html) |
| Bande bitumineuse Bitudeck | 75 mm × 10 m, ép. 1,5 mm | ≈ 3,5 à 4 m² | [Fiberdeck](https://www.fiberdeck.fr/structures-terrasses/bande-bitumeuse-pour-lambourde-bois-bitudeck/) |
| Bande Növlek | 100 mm × 20 m, ép. 1,9 mm | — | [Sud Bois](https://sud-bois.fr/501-rouleau-bande-bitumeuse-etancheite) |
| Géotextile 100-150 g/m² | rouleaux 1 × 25, 2 × 25, 4 × 25 m *à vérifier* | — | — |

### 4.7 Entretien (option)

Saturateur ou huile : rendement 8 à 12 m²/L par couche, 2 couches sur bois neuf, pots de 1 / 2,5 / 5 L *(à vérifier : fiches Blanchon, Sikkens, Osmo)*.
