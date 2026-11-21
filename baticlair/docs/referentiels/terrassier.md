# Référentiel quantitatif TERRASSIER (Rappidos)

Oct 3, 2026 · @Greg

## 1. Métier et axes de variation

Le terrassier creuse, remblaie, nivelle et pose les réseaux enterrés ; ce qu'il commande au négoce est surtout du **granulat en tonnes** et du **réseau en barres ou couronnes**, jamais de la terre au m³. Ce tiroir couvre le terrassement de chantier de maison individuelle et la petite VRD : décapage, fouilles, plateformes, empierrement, tranchées de réseaux, drainage, assainissement non collectif, accès et cour. Les gros travaux routiers (TP, enrobé à chaud en centrale) sont hors périmètre.

Ce qui distingue le terrassier des autres tiroirs : la plus grosse part de son devis (mouvement de terre, évacuation, location d'engins) **ne se commande pas au négoce**. Le moteur doit la reconnaître pour la mettre de côté (section « hors commande ») sans jamais en faire une ligne de commande.

### 1.1 Fiche d'identité metier.json

```json
{
  "code": "terrassement",
  "nom": "Terrassement - VRD",
  "version": "0.1.0",
  "normes": ["NF P 11-300 (GTR)", "NF P 98-331", "NF DTU 64.1", "NF DTU 13.11", "NF DTU 20.1", "Fascicule 70 CCTG", "NF EN 13242", "NF EN 12613", "NF C 15-100"],
  "axes_de_variation": {
    "geographie": "moyen",
    "epoque_bati": "faible",
    "type_batiment": "moyen",
    "neuf_renovation": "moyen",
    "gamme": "faible",
    "nature_sol": "fort"
  },
  "metiers_lies": ["maconnerie", "assainissement", "plomberie", "electricite", "amenagement_exterieur"],
  "unites_de_commande": ["t", "big_bag", "camion", "barre", "couronne", "rouleau", "u", "sac", "palette"],
  "maturite": "alpha"
}
```

**Axe ajouté : nature\_sol.** Le gabarit section 27.3 ne le prévoit pas ; il est indispensable ici (foisonnement, besoin de géotextile, de drainage, filière ANC). Claude Code doit l'ajouter comme axe facultatif au schéma commun, déclaré seulement par les métiers qui en dépendent (terrassement, maçonnerie fondations, assainissement).

### 1.2 Poids de chaque axe

| Axe | Poids | Ce qu'il change dans le quantitatif | Comment le moteur le résout |
| --- | --- | --- | --- |
| nature\_sol | fort | foisonnement des déblais (±30 %), géotextile oui/non, drain oui/non, type d'épandage ANC | question à boutons si absent du devis (section 7) |
| geographie | moyen | granulat disponible (calcaire, granit, silex, roulé), donc densité et nom commercial ; gel (épaisseur de forme) | département de l'adresse chantier (section 8) |
| type\_batiment | moyen | épaisseur de forme (piéton, voiture, poids lourd), diamètres réseaux | devis ; sinon défaut « maison individuelle » |
| neuf\_renovation | moyen | neuf : décapage + fouilles complètes ; réno : tranchées ponctuelles, reprise de réseaux, découpe d'enrobé | devis (« création » vs « reprise ») |
| epoque\_bati | faible | réseaux existants en fonte, grès ou amiante-ciment à raccorder (manchons de transition) | seulement si « raccordement sur existant » |
| gamme | faible | regard béton vs PVC, dalle gazon vs gravier stabilisé | devis |

Règle pour le moteur : seul nature\_sol peut déclencher une question de contexte sans lien direct avec un matériau ; la géographie ne se demande jamais (elle vient de l'adresse).

## 2. Règle d'or et unités de commande

**Règle d'or terrassier : jamais un m² ni un m³ « en place » sur le bon de commande.** Le devis parle en m² (décapage, empierrement) et en m³ (fouilles, remblai) ; le négoce ou la carrière vend des **tonnes livrées** (vrac ou big bag), des **barres**, des **couronnes**, des **rouleaux** et des **pièces**. Le moteur convertit toujours : volume compacté × densité compactée × perte = tonnes, puis arrondi à l'unité de livraison.

### 2.1 Unités de commande du métier

| Famille | Unité sur le bon | Arrondi | Exemple de ligne commandable |
| --- | --- | --- | --- |
| Granulats en vrac (GNT, gravier, sable, cailloux) | t | à la tonne supérieure ; au-delà de 8 t, au camion (voir 2.2) | « GNT 0/31,5 calcaire — 38 t vrac livré » |
| Granulats petit chantier | big bag 1 m³ | au big bag entier | « Sable 0/4 — 2 big bags 1 m³ » |
| Tubes rigides (PVC assainissement, PVC compact) | barre (3 m ou 4 m) | à la barre entière | « Tube PVC CR8 Ø125 — 14 barres de 3 m » |
| Drains, gaines TPC, fourreaux PE | couronne (25, 50 ou 100 m) | à la couronne entière | « Drain agricole Ø100 enrobé — 2 couronnes de 50 m » |
| Géotextile, polyane | rouleau (largeur × longueur) | au rouleau entier | « Géotextile 150 g/m² — 2 rouleaux 2 × 25 m » |
| Grillage avertisseur | rouleau 100 m (largeur 30 cm) | au rouleau | « Grillage avertisseur rouge — 1 rouleau 100 m » |
| Regards, tampons, raccords, coudes, tés, bouchons | u | à la pièce | « Regard béton 40 × 40 — 3 u » |
| Enrobé à froid, ciment, mortier | sac (25 kg en général) | au sac | « Enrobé à froid 0/6 — 12 sacs 25 kg » |
| Bordures, caniveaux | u (pièce de 1 m en général) | à la pièce | « Bordure T2 — 46 u » |

### 2.2 Les tonnes : vrac, big bag ou camion

Le moteur choisit la livraison selon le tonnage d'un même matériau. Seuil vrac « à vérifier » chez le négoce de l'artisan : une page fournisseur annonce [une livraison en vrac dès 8 tonnes, complétée par le big bag 1 m³ pour les petits chantiers](https://www.koncrete.fr/produits/grave-0-31-5).

| Tonnage d'un matériau | Livraison proposée | Ligne affichée |
| --- | --- | --- |
| ≤ 4 t | big bag 1 m³ (≈ 1,5 t de GNT, 1,6 t de sable) | « n big bags 1 m³ » |
| 4 à 8 t | big bags ou vrac selon le négoce (question artisan apprise une fois) | « n big bags » par défaut |
| > 8 t | vrac en tonnes, arrondi à la tonne | « n t vrac livré » ; info camion : 8×4 ≈ 19 t utiles (à vérifier) |

### 2.3 Ce qui ne se commande pas au négoce (bloc « hors commande »)

Le moteur reconnaît ces lignes, les garde dans le résumé chantier, mais **ne les met jamais dans le quantitatif fournisseur** : mouvement de terre (déblai, remblai avec les terres du site), évacuation des déblais et mise en décharge, location d'engins (pelle, mini-pelle, plaque vibrante, rouleau), bennes, main d'œuvre, implantation, piquetage, sondages, DICT. Seule exception : si le devis dit « évacuation en benne fournie par le négoce », la benne devient une ligne « benne n m³ — u ».

## 3. Ouvrages du métier, vocabulaire des devis et pièges

Le tiroir déclare 12 ouvrages. Chacun est soit **commandable** (il génère des lignes négoce), soit **hors commande** (main d'œuvre, engins, évacuation). Les mots inconnus déclenchent une question, jamais une supposition.

### 3.1 Liste des ouvrages (ouvrages.json)

| Code ouvrage | Ce que fait l'artisan | Commandable ? | Matériaux générés |
| --- | --- | --- | --- |
| decapage | retire la terre végétale (20 à 30 cm) | non (hors commande) | aucun, sauf géotextile si « décapage + géotextile » |
| fouille\_fondation | fouilles en rigole ou en puits pour semelles | non | aucun (béton = tiroir maçonnerie) |
| fouille\_pleine\_masse | sous-sol, vide sanitaire, piscine | non | aucun |
| plateforme\_empierrement | forme sous dallage, accès, cour, parking | oui | géotextile, GNT ou tout-venant, éventuellement couche de finition 0/20 |
| hérisson | couche drainante sous dallage | oui | cailloux 20/40 ou 40/80, polyane si demandé |
| tranchee\_reseau\_humide | eaux usées, eaux pluviales, eau potable | oui | tubes, raccords, sable de lit de pose et d'enrobage, grillage avertisseur |
| tranchee\_reseau\_sec | électricité, télécom, gaz | oui | gaines TPC, sable, grillage avertisseur |
| drainage\_peripherique | drain au pied des fondations | oui | drain, géotextile, gravier 20/40, regards de visite |
| anc\_epandage | assainissement non collectif : fosse + épandage | oui | fosse toutes eaux, regards, tuyaux d'épandage, gravier 10/40 lavé, géotextile |
| puisard\_infiltration | puits perdu pour eaux pluviales | oui | cailloux 40/80, géotextile, buse ou casier |
| remblai\_apport | remblai avec matériau acheté (sable, GNT, terre) | oui | matériau en tonnes |
| evacuation | évacuation des déblais, décharge | non | aucun (bloc hors commande) |

### 3.2 Vocabulaire des devis (vocabulaire.json)

| Ouvrage | Expressions courantes | Pièges |
| --- | --- | --- |
| decapage | « décapage terre végétale », « décapage sur 30 cm », « mise en dépôt de la TV », « TV » | « TV » = terre végétale, pas télévision |
| plateforme\_empierrement | « empierrement », « fond de forme », « couche de forme », « tout-venant », « TV 0/80 », « GNT », « grave », « concassé », « 0/31,5 », « 0/20 », « macadam » | « tout-venant » peut être 0/80 (forme) ou 0/31,5 : lire la granulométrie ; « macadam » ici = empierrement, pas enrobé |
| hérisson | « hérisson », « cailloutis », « pierres cassées 40/80 », « 20/40 », « lit de cailloux » | « hérisson » sous dallage = tiroir maçonnerie pour le béton, terrassier pour les cailloux |
| tranchee\_reseau\_humide | « EU », « EP », « EV », « AEP », « branchement tout-à-l'égout », « PVC 100 », « Ø125 », « CR8 », « regard de branchement », « boîte de branchement » | « PVC 100 » = Ø extérieur 110 en assainissement CR8 (100 en PVC compact) : trancher par la classe CR |
| tranchee\_reseau\_sec | « fourreau », « gaine TPC », « gaine rouge », « tranchée EDF / Enedis », « fourreau télécom / Orange », « gaine verte » | « fourreau » seul : couleur inconnue → demander l'usage |
| drainage\_peripherique | « drain », « drainage périphérique », « drain agricole », « drain routier », « drain Ø100 », « regard de drainage » | « drain routier » = rigide en barres, pas en couronne |
| anc\_epandage | « fosse toutes eaux », « FTE », « épandage », « tranchées d'épandage », « filtre à sable », « microstation », « SPANC », « ANC » | « filtre à sable » et « microstation » ont d'autres règles : V0 = épandage seulement, le reste en question |
| puisard\_infiltration | « puisard », « puits perdu », « puits d'infiltration », « tranchée drainante » | « puits » seul peut être un puits d'eau : demander |
| remblai\_apport | « remblai en sable », « remblai GNT », « apport de terre », « terre végétale d'apport » | « remblai » sans « apport » = terres du site = hors commande |
| evacuation | « évacuation », « mise en décharge », « ISDI », « camion », « rotation », « benne » | ne jamais convertir en matériau |

### 3.3 Pièges généraux du métier

- **m³ en place ≠ m³ livré** : le devis donne souvent le volume du trou ou de la couche finie ; la carrière livre du foisonné en tonnes. Toujours passer par la densité compactée (section 5).
- **Épaisseur finie** : « empierrement 20 cm » = 20 cm après compactage. Le moteur ne rajoute jamais d'épaisseur ; il applique la densité compactée et une perte.
- **Mélange de tiroirs** : semelles, dallage, regard maçonné relèvent de la maçonnerie ; le terrassier ne commande que les matériaux de fouille, de forme et de réseaux.
- **Lignes forfaitaires** (« branchement EU forfait ») : sans longueur, le moteur pose la question du linéaire en boutons de tranches (section 7), jamais un champ libre.

## 4. Matériaux : fiches fabricant sourcées

Les granulats se commandent en tonnes, les réseaux en barres et couronnes. Chaque fiche ci-dessous donne ce que le moteur doit connaître : format, conditionnement négoce, poids ou densité, source. Tout chiffre sans lien est marqué « à vérifier ».

### 4.1 Granulats (densités pour convertir m³ → t)

La densité qui compte est la **densité compactée** quand le devis donne une épaisseur finie, et la **densité en vrac** quand il donne un volume à remplir sans compactage (hérisson, gravier d'épandage).

| Matériau (materiaux.json) | Usage | Densité vrac (t/m³) | Densité compactée (t/m³) | Conditionnement | Source |
| --- | --- | --- | --- | --- | --- |
| GNT 0/31,5 calcaire | forme, plateforme, accès | 1,6 | 2,20 | vrac en t ; big bag 1 m³ ≈ 1,5 t | [fiche carrière SAS Pellet (2,20 compacté, EN 13242, couches ≤ 30 cm)](https://sas-pellet.fr/grave.concassee.calcaire.0.31.5-59-51.php) ; [big bag 1 m³ = 1,5 t, Garandeau](https://www.garandeaumateriaux.com/accueil/produit/calcaire_0_20_ou_0_31_5_calcaire_en_bigbag_1_m3_depart-3629.html) |
| GNT 0/31,5 granit ou silex | idem, régions sans calcaire | 1,65 | 2,15 | idem | [tableau Koncrete](https://www.koncrete.fr/blog/densite-des-materiaux-du-btp-le-tableau-complet) — à vérifier par carrière locale |
| GNT 0/31,5 recyclée (béton concassé) | plateforme temporaire, accès | 1,40 | 1,85 | vrac | [tableau Koncrete](https://www.koncrete.fr/blog/densite-des-materiaux-du-btp-le-tableau-complet) |
| GNT 0/20 | finition de cour, couche de réglage | 1,6 | 2,15 | vrac ou big bag | à vérifier |
| Tout-venant 0/80 ou 0/100 | couche de forme sur sol faible | 1,7 | 2,0 | vrac | à vérifier |
| Cailloux 20/40 concassés | hérisson, drainage | 1,5 | — (non compacté) | vrac ou big bag | [Sorelest : concassé 10/20-20/40 de 1,5 à 1,7](https://www.sorelest.fr/densite-gravier/) |
| Cailloux 40/80 | hérisson épais, puisard | 1,5 | — | vrac | à vérifier |
| Gravier roulé lavé 10/40 | épandage ANC, drainage | 1,45 | — | vrac ou big bag | [Sorelest : roulé lavé 10/40 ou 20/40, 1,4 à 1,5](https://www.sorelest.fr/densite-gravier/) |
| Sable 0/4 (ou sablon, sable de carrière) | lit de pose, enrobage de réseaux | 1,6 | 1,8 | vrac ou big bag | à vérifier (valeur courante 1,5 à 1,6 en vrac) |
| Terre végétale d'apport | régalage, jardin | 1,3 | — | vrac ou big bag | [Calcul-BTP : 1,3 t/m³](https://calcul-btp.fr/deblai-remblai) |

### 4.2 Tubes et tuyaux rigides

| Article | Diamètres | Longueur de barre | Palette | Norme | Source |
| --- | --- | --- | --- | --- | --- |
| Tube PVC assainissement CR8 (SN8), paroi structurée, à joint | 110, 125, 160, 200 | 3 m | Ø110 : 51 barres ; Ø125 : 60 ; Ø160 : 44 ; Ø200 : 32 | NF EN 13476-2, Fascicule 70 | [fiche Bipeau CR8](https://static.mypum.fr/media/FT/AG-FT_BIPEAU_CR8.pdf) ; Sotralys aussi en 3 m ([fiche Dyka](<https://static.mypum.fr/media/FT/AK-FT-DYKA-Sotralys_Tube_PVC_assainissement_(E102017).pdf>)) |
| Tube PVC assainissement CR8 compact, sans joint (à coller) | 100, 125 | 4 m | — | NF | [Thomas Sograma, Ø100 × 4 m](https://www.thomas-sograma.com/accueil/produit/tube_pvc_cr8_pour_evacuation_assainissement-450/diametre_100_mm_x_4m_sans_joint_-4461) |
| Tube PVC CR8 grandes longueurs | 125 à 500 | 6 m | — | NF EN 13476-2 | [fiche Wavin ECO-TP (3 ou 6 m)](https://www.sopsa-plomberie.fr/assets/fiche/wavin-ECO-TP_CR4-CR8-ft.pdf) |
| Tube d'épandage PVC CR4 (SN4), fentes 5 mm | 100 | 4 m | 63 barres | NF DTU 64.1 | [Fitt Terra Vert](https://shop.fitt.mc/p/tube-pvc-epandage-cr4-o100-fitt-terra-vert-longueur-4m/) ; [ATE BatiPand, palette 420 ml](https://www.ate-drainage.com/produits/tube-epandage-batiment-pvc-sn4/) |

Défaut moteur : **assainissement à joint = barre de 3 m**, épandage = barre de 4 m. Si le négoce de l'artisan vend autrement, la surcharge artisan corrige une fois pour toutes.

### 4.3 Couronnes (drains, gaines, fourreaux)

| Article | Diamètres | Couronne | Poids | Source |
| --- | --- | --- | --- | --- |
| Drain agricole PVC annelé perforé, enrobé géotextile | 50, 65, 80, 100 ; 125-160 sur commande | 50 m (100 m existe en Ø100), manchon fourni | Ø100 × 50 m : 36,5 kg | [VM Matériaux réf. 5028](https://www.vm-materiaux.fr/5028-drain-pvc-agricole-perfore-enrobe-de-geotextile-100-50m.html) ; [fiche Pipeflex](https://static.mypum.fr/media/FT/AG-FT_DRAIN.pdf) |
| Drain agricole nu (non enrobé) | 50 à 160 | 50 m | — | [Formatub](https://formatub-budget.com/drain-agricole/2067-drain-agricole-nu-d100-couronne-de-50ml.html) |
| Gaine TPC rouge (électricité) | 40, 50, 63, 75, 90, 110, 160 | 25 m ou 50 m (100 m en 40) | Ø50 × 50 m : 10,45 kg | [Chausson, NF EN 61386-24](https://www.chausson.fr/materiaux/gaine-tpc-annelee-rouge-d50-couronne-metres-p-229695-1) ; [Sorodist (Ø90 en 25 ou 50 m)](https://sorodist.com/produit/gaine-tpc-rouge/) |
| Gaine TPC verte (télécom) | 40 à 90 | 25 m ou 50 m | — | [MyElec](https://www.myelec.fr/conduits/7074-gaine-tpc-d63-rouge-50m.html) |
| Fourreau PE bleu (eau potable, protection) | 63 à 110 | 50 m | — | [Samse (bleu Ø63 × 50 m)](https://www.samse.fr/5028-drain-pvc-agricole-perfore-enrobe-de-geotextile-100-50m.html) — à vérifier |

### 4.4 Rouleaux

| Article | Formats courants (largeur × longueur) | Poids / grammage | Source |
| --- | --- | --- | --- |
| Géotextile non tissé PP, séparation (classe 3-4) | 2 × 25 m ; 4 × 25 m ; 4 × 50 m ; grands rouleaux 4, 5 ou 6 × 100-120 m | 100 à 150 g/m² ; 4 × 25 m ≈ 9 kg | [Chausson Edia 4 × 25 / 4 × 50](https://www.chausson.fr/materiaux/geotextile-non-tisse-edia-p-42998-1) ; [Materiauxnet 150 g, 2 × 25](https://www.materiauxnet.com/geotextile-non-tisse-classe-4-150g-m2-rouleau-largeur-2m-x-25m.html) ; [Bonna GSP 3 à 6 m × 120 m](https://www.ciffreobona.fr/userfiles/file/PDF/8/94/235/4969/ft_commnune_ft_gsp_et_gpr.pdf) |
| Géotextile en bande pour tranchée | 0,5 × 100 m ; 1 × 50 m ; 2 × 25 m | — | [PUM Géopum](https://www.mypum.fr/amenagement-exterieur/amenagement-paysager/geotextile/produits/P2323) |
| Grillage avertisseur NF EN 12613 | 0,30 × 100 m (aussi 25, 200, 300, 600 m) | — | [catalogue Ciffréo Bona](https://www.ciffreobona.fr/userfiles/file/PDF/8/91/906/12496/48_1329756620.pdf) |
| Film polyane sous dallage | 6 × 25 m (150 m²) ou 4 × 30 m (120 m²) | 150 µm | à vérifier |

Couleurs normalisées du grillage avertisseur : rouge électricité, bleu eau potable, vert télécom, jaune gaz, marron assainissement ([guide ACSO](https://www.creilsudoise.fr/wp-content/uploads/2023/09/ACSO-Guide-Technique.pdf) pour bleu et marron ; rouge, vert, jaune à vérifier sur NF EN 12613).

### 4.5 Pièces (u)

| Article | Formats | Remarque | Source |
| --- | --- | --- | --- |
| Regard de branchement / de visite béton | 30 × 30, 40 × 40, 50 × 50, 60 × 60 (fond + rehausses + tampon) | se commande en éléments : fond, rehausse(s), cadre + tampon | à vérifier |
| Regard PVC (boîte de branchement, de répartition, de bouclage) | Ø ou 30 × 30, 40 × 40 | épandage : 1 boîte de répartition + 1 de bouclage | NF DTU 64.1 (principe) |
| Fosse toutes eaux | 3 000, 4 000, 5 000 L | 3 000 L jusqu'à 5 pièces principales, +1 000 L par pièce en plus | NF DTU 64.1 — à vérifier |
| Coudes 15°, 30°, 45°, 87°30, tés, culottes, manchons, bouchons PVC | même Ø que le tube | comptés par point singulier (section 9) | — |
| Bordures béton T1, T2, P1, A2 ; caniveaux CC1 | pièce de 1 m | à la pièce | à vérifier |
| Enrobé à froid 0/6 ou 0/4 | sac 25 kg | rebouchage, petite reprise | à vérifier |

## 5. Règles de calcul (normes, formules, pertes)

Une formule par ouvrage, en code pur, testable. Le principe commun : **tonnes = volume × densité × (1 + perte)**, arrondi à l'unité de livraison ; **barres ou couronnes = longueur × (1 + perte) ÷ longueur unitaire**, arrondi au supérieur.

### 5.1 Conversion de base

```latex
T = S \times e \times d_{compact} \times (1 + p)
```

S = surface (m²), e = épaisseur finie compactée (m), d = densité compactée (t/m³, section 4.1), p = perte. Une fiche négoce recommande [une marge de 3 à 5 % sur le tonnage compacté](https://www.koncrete.fr/blog/densite-de-la-gnt-foisonnee-vs-compactee) ; le moteur prend **5 %**. Les carrières préconisent de [compacter par couches de 30 cm maximum](https://sas-pellet.fr/grave.concassee.calcaire.0.31.5-59-51.php) : au-delà, le moteur n'ajoute rien mais affiche « mise en œuvre en n couches ».

Le foisonnement (×1,15 terre végétale, ×1,25 terre ordinaire, ×1,35 argile, ×1,5 roche, [tableau Calcul-BTP](https://calcul-btp.fr/deblai-remblai)) ne sert **qu'au bloc hors commande** (volume à évacuer, nombre de camions). Il n'entre jamais dans une ligne négoce.

### 5.2 Formules par ouvrage

| Ouvrage | Formule | Perte | Norme / source |
| --- | --- | --- | --- |
| plateforme\_empierrement | GNT t = S × e × 2,20 × 1,05 (calcaire) | 5 % | fiche carrière ; NF EN 13242 |
| plateforme (géotextile dessous) | rouleaux = ⌈S × 1,15 ÷ surface rouleau⌉ ; largeur de rouleau = la plus grande ≤ largeur de la zone | 15 % (recouvrements 30 cm + rives) — à vérifier | — |
| hérisson | cailloux t = S × e × 1,5 × 1,10 | 10 % (tassement, irrégularités) — à vérifier | — |
| tranchee\_reseau\_humide : tubes | barres = ⌈L × 1,03 ÷ 3⌉ (joint, 3 m) | 3 % + arrondi | Fascicule 70 |
| tranchee\_reseau\_humide : sable | V = L × B × (0,10 + De + h\_sup) − L × π × De² ÷ 4 ; t = V × 1,8 × 1,05 | 5 % | lit 10 cm et enrobage 20 cm au-dessus de la génératrice ([prescriptions Mauges](https://www.maugescommunaute.fr/wp-content/uploads/Prescriptions-Techniques-reseaux-AEP-MC-1.pdf), [Montpellier 3M](https://regiedeseaux.montpellier3m.fr/medias/pdf/Guide_technique_travaux_ouvrages_assainissement.pdf)) ; lit ≥ 10 cm, 15 cm sur sol rocheux ([Fascicule 70](https://www.agrialpro.fr/media/wysiwyg/CCTG_FASCICULE_70-2003.pdf)) |
| tranchee\_reseau (grillage) | rouleaux = ⌈L × 1,05 ÷ 100⌉ par couleur | 5 % | NF EN 12613 ; posé à 20-30 cm au-dessus du réseau |
| tranchee\_reseau\_sec : gaines | couronnes = ⌈L × 1,05 ÷ 50⌉ ; si L × 1,05 ≤ 25, une couronne de 25 m | 5 % + arrondi | NF EN 61386-24 |
| tranchee\_reseau\_sec : sable | même formule que réseau humide, h\_sup = 0,10 | 5 % | [NF P 98-332, exemple tranchée commune](https://www.etudedeterrassement.com/dimensionnement-tranchee-commune/) |
| remblai sous voirie (si demandé) | GNT t = L × B × (H − zone sable) × 2,20 × 1,05 | 5 % | NF P 98-331 |
| drainage\_peripherique : drain | couronnes = ⌈(périmètre + 1 m) × 1,05 ÷ 50⌉ | 5 % + arrondi | — |
| drainage\_peripherique : gravier | t = L × 0,40 × 0,40 × 1,5 × 1,05 (section de massif drainant 40 × 40 cm) | 5 % | à vérifier (NF DTU 20.1) |
| drainage\_peripherique : géotextile | longueur = L × (2 × 0,40 + 2 × 0,40 + 0,30) × 1,05 ; rouleau 2 × 25 m | 5 % | à vérifier |
| anc\_epandage : tranchées | n = ⌈L\_totale ÷ 30⌉ ; L\_totale lue dans le devis (étude de sol) | — | [NF DTU 64.1 : 30 m max, largeur 0,50 m](https://ccsvp.fr/wp-content/uploads/2020/01/DTU_2014.pdf) |
| anc\_epandage : tuyaux | barres 4 m = ⌈(L\_totale + bouclage) × 1,05 ÷ 4⌉ ; tuyau plein de répartition en barres PVC Ø100 | 5 % | NF DTU 64.1 |
| anc\_epandage : gravier 10/40 lavé | t = L\_totale × 0,50 × 0,40 × 1,45 × 1,05 | 5 % | 0,30 m sous tuyau, largeur 0,50 ([fiche SPANC eau47](https://www.eau47.fr/fichier_article/file/fiches-spanc/Tranchees-epandage-1.pdf)) ; 0,40 total à vérifier |
| anc\_epandage : géotextile | bande de 0,70 m par tranchée (débord 0,10 de chaque côté) → rouleau 1 × 50 m : ⌈L\_totale × 1,05 ÷ 50⌉ | 5 % | [eau47 : 0,70 pour 0,50](https://www.eau47.fr/fichier_article/file/fiches-spanc/Tranchees-epandage-1.pdf) |
| anc\_epandage : boîtes | 1 boîte de répartition + 1 de bouclage (+ 1 de visite si demandé) | — | NF DTU 64.1 |
| puisard\_infiltration | V = l × l × h ; cailloux 40/80 t = V × 1,5 × 1,05 ; géotextile = (4 × l × h + 2 × l²) × 1,15 | 5 % / 15 % | à vérifier |
| remblai\_apport | t = V × d\_compact × 1,05 ; terre végétale : t = V × 1,3 × 1,10 | 5-10 % | — |

B (largeur de tranchée) et h\_sup (hauteur de sable au-dessus du tube) sont des défauts (section 6). Le Fascicule 70 fixe pour les marchés publics une largeur de [diamètre extérieur + 0,30 m de chaque côté](https://www.over-view.fr/wp-content/uploads/2019/08/g21-extrait-editions-ginger.pdf) ; un branchement privé se fait souvent au godet de 40-50 cm (à faire valider).

### 5.3 Extrait regles.json

```json
{
  "plateforme_empierrement.gnt": {
    "formule": "surface_m2 * epaisseur_m * densite_compactee * (1 + perte)",
    "unite_sortie": "t",
    "materiau": "@defaut.granulat_forme",
    "perte": 0.05,
    "arrondi": "livraison",
    "norme": "NF EN 13242"
  },
  "tranchee_reseau_humide.tube": {
    "formule": "ceil(longueur_ml * (1 + perte) / longueur_barre)",
    "unite_sortie": "barre",
    "perte": 0.03,
    "longueur_barre": "@materiau.longueur_m",
    "norme": "Fascicule 70"
  },
  "tranchee_reseau.sable": {
    "formule": "(longueur_ml * largeur_tranchee * (lit + de + h_sup) - longueur_ml * PI * de^2 / 4) * densite_compactee * (1 + perte)",
    "unite_sortie": "t",
    "perte": 0.05,
    "norme": "NF P 98-331 ; Fascicule 70"
  }
}
```

## 6. Valeurs par défaut et hypothèses à afficher

Quand le devis ne dit rien, le moteur applique ces défauts et **affiche chaque hypothèse** sous le quantitatif (une ligne courte, modifiable d'un tap). Résolution : chantier → artisan → variation par axe → valeur nationale.

### 6.1 Table des défauts (defauts.json)

| Clé | Valeur nationale | Variations par axe | Texte affiché |
| --- | --- | --- | --- |
| granulat\_forme | GNT 0/31,5 | geographie : calcaire, granit ou silex selon département (section 8) | « Grave 0/31,5 {nature} » |
| densite\_gnt\_compactee | 2,20 t/m³ | granit/silex 2,15 ; recyclé 1,85 | « Densité {valeur} t/m³ compactée » |
| epaisseur\_forme\_m | 0,20 | type d'usage : piéton 0,10 ; voiture 0,20 ; poids lourd 0,35 ; nature\_sol argile +0,10 | « Empierrement {valeur} cm fini » |
| geotextile\_sous\_forme | oui | nature\_sol sableux/rocheux : non | « Géotextile sous empierrement » |
| grammage\_geotextile | 150 g/m² | poids lourd : 200 g/m² | « Géotextile {valeur} g/m² » |
| epaisseur\_herisson\_m | 0,20 | — | « Hérisson {valeur} cm » |
| granulat\_herisson | cailloux 20/40 | e ≥ 0,25 m : 40/80 | « Cailloux {valeur} » |
| largeur\_tranchee\_m | 0,40 (Ø ≤ 160) ; 0,60 (tranchée commune ou Ø 200) | — | « Tranchée {valeur} m de large » |
| lit\_pose\_m | 0,10 | nature\_sol rocheux : 0,15 | « Lit de pose {valeur} cm » |
| h\_sup\_sable\_m | 0,20 (réseau humide) ; 0,10 (réseau sec) | — | « Sable {valeur} cm au-dessus du tuyau » |
| materiau\_enrobage | sable 0/4 | — | « Enrobage sable 0/4 » |
| remblai\_superieur | terres du site (hors commande) | sous voirie : GNT 0/31,5 | « Remblai avec les terres du site » |
| tube\_eu | PVC CR8 Ø125, barre 3 m | branchement maison : Ø125 ; EP : Ø110 | « Tube PVC CR8 Ø{valeur} » |
| gaine\_elec | TPC rouge Ø63, couronne 50 m | branchement Enedis : Ø63 (à vérifier selon gestionnaire) ; éclairage, portail : Ø40 | « Gaine TPC rouge Ø{valeur} » |
| gaine\_telecom | TPC verte Ø40, couronne 50 m (à vérifier : opérateur peut imposer 2 × Ø42/45) | — | « Gaine TPC verte Ø{valeur} » |
| drain | drain agricole Ø100 enrobé, couronne 50 m | — | « Drain Ø100 enrobé géotextile » |
| regards\_drainage | 1 par angle du bâtiment | — | « {n} regards de visite drainage » |
| perte\_granulat | 5 % | — | « Perte granulats 5 % » |
| livraison\_granulat | vrac au-delà de 8 t, big bag sinon | artisan : appris une fois | « Livraison {mode} » |

### 6.2 Exemple defauts.json

```json
{
  "epaisseur_forme_m": {
    "valeur": 0.20,
    "variations": [
      { "si": { "usage": "pieton" }, "valeur": 0.10 },
      { "si": { "usage": "poids_lourd" }, "valeur": 0.35 },
      { "si": { "nature_sol": "argile" }, "ajouter": 0.10 }
    ],
    "afficher": "Empierrement {valeur_cm} cm fini"
  },
  "densite_gnt_compactee": {
    "valeur": 2.20,
    "variations": [
      { "si": { "geographie.granulat": "granit" }, "valeur": 2.15 },
      { "si": { "geographie.granulat": "silex" }, "valeur": 2.15 },
      { "si": { "materiau": "recycle" }, "valeur": 1.85 }
    ],
    "afficher": "Densité {valeur} t/m³ compactée"
  }
}
```

Règle d'affichage : au plus **5 hypothèses visibles** sur la carte quantitatif, triées par impact (sensibilité de la section 7) ; les autres derrière « voir toutes les hypothèses ».

## 7. Questions à poser (boutons) et sensibilité

Le moteur ne pose que les questions dont la réponse n'est pas dans le devis et dont la **sensibilité dépasse 5 %**, par priorité, **4 au maximum** sur un chantier courant. Aucune question ne demande un chiffre libre : les longueurs et épaisseurs se choisissent en boutons de tranches. Note de cohérence : la décision produit la plus récente (mémoire projet) autorise d'aller au-delà de 4 si un doute réel subsiste ; le moteur garde 4 comme cible et ne dépasse qu'avec une question à fort levier.

### 7.1 Questions autorisées (questions.json), par priorité

| Priorité | id | Texte affiché | Boutons | Défaut si pas de réponse | Sensibilité | Pourquoi ce chiffre |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | lineaire | « Longueur de la tranchée ? » (seulement si ligne forfaitaire) | < 10 m · 10-20 m · 20-40 m · > 40 m | 15 m | 100 % | sans longueur, tout le réseau est faux |
| 1 | usage\_forme | « Ça sert à quoi ? » | Allée piétonne · Voitures · Camions / engins | Voitures | 75 % | épaisseur 10 → 20 → 35 cm |
| 2 | nature\_sol | « Le terrain est plutôt ? » | Terre normale · Argile / glaise · Sable · Rocher | Terre normale | 50 % | argile : +10 cm de forme et géotextile ; sable/rocher : pas de géotextile |
| 3 | epaisseur\_forme | « Épaisseur d'empierrement ? » (seulement si absente du devis) | 10 cm · 20 cm · 30 cm · 40 cm | selon usage | 50 % | proportionnel direct sur les tonnes |
| 4 | remblai\_voirie | « La tranchée passe sous une allée ou une route ? » | Oui · Non | Non | 40 % | oui : remblai en GNT acheté au lieu des terres du site |
| 5 | profondeur\_reseau | « Profondeur du tuyau ? » (si absente) | 50 cm · 80 cm · 1 m · Plus | 80 cm | 10 % | ne change que le remblai sous voirie et le grillage |
| 6 | livraison | « Livraison des cailloux ? » (une fois par artisan) | Big bags · Camion vrac | selon tonnage | 0 % sur quantité | change seulement l'unité de commande |
| 7 | reseaux\_ensemble | « Les gaines passent dans la même tranchée ? » | Oui · Non | Oui | 20 % | largeur 0,60 et sable commun au lieu de 2 tranchées |

### 7.2 Exemple questions.json

```json
[
  {
    "id": "usage_forme",
    "ouvrages": ["plateforme_empierrement"],
    "priorite": 1,
    "si_inconnu": "usage",
    "texte": "Ça sert à quoi ?",
    "boutons": [
      { "label": "Allée piétonne", "valeur": "pieton" },
      { "label": "Voitures", "valeur": "voiture" },
      { "label": "Camions / engins", "valeur": "poids_lourd" }
    ],
    "defaut": "voiture",
    "sensibilite_pct": 75
  },
  {
    "id": "nature_sol",
    "ouvrages": ["plateforme_empierrement", "drainage_peripherique", "tranchee_*"],
    "priorite": 2,
    "si_inconnu": "nature_sol",
    "texte": "Le terrain est plutôt ?",
    "boutons": [
      { "label": "Terre normale", "valeur": "terre" },
      { "label": "Argile / glaise", "valeur": "argile" },
      { "label": "Sable", "valeur": "sable" },
      { "label": "Rocher", "valeur": "rocher" }
    ],
    "defaut": "terre",
    "sensibilite_pct": 50
  }
]
```

### 7.3 Questions interdites

« Combien de tonnes ? », « Combien de barres ? », « Quelle surface ? » quand elle est dans le devis, « Quel département ? » (vient de l'adresse), « Quelle densité ? » (vient de la carrière par défaut, corrigible par l'artisan dans ses habitudes).

## 8. Matériaux dominants par région

Pour le terrassier, la région change **la roche du granulat** (donc son nom commercial et sa densité), pas la méthode. En France, la production se partage à peu près en trois tiers : [roches calcaires 31 %, roches éruptives 30 %, alluvionnaires 31 % (UNPG, chiffres 2020)](https://admin.unicem.fr/app/uploads/sites/3/2023/09/depliant-stat-unpg-2020.pdf). Le moteur affiche le granulat du département par défaut et apprend celui de l'artisan à sa première correction.

### 8.1 Table par région (à reporter dans commun/departements.json, clé granulat)

| Région | Roche dominante de la GNT | Nom courant sur les devis | Densité compactée par défaut | Sol courant (nature\_sol par défaut) | Fiabilité |
| --- | --- | --- | --- | --- | --- |
| Bretagne | granit, schiste, grès (roches massives) | « 0/31,5 granit », « schiste », « tout-venant » | 2,15 | limon sur socle, rocher proche | sourcé : Bretagne ne tire que [8 % de ses granulats des roches meubles](https://www.donnees.statistiques.developpement-durable.gouv.fr/lesessentiels/essentiels/sol-extraction-granulat.html) |
| Pays de la Loire | granit, diorite | « 0/31,5 », « concassé » | 2,15 | limon, argile | à vérifier |
| Normandie | silex, calcaire, alluvions de Seine | « silex », « 0/31,5 calcaire » | 2,15 | limon à silex, argile | partiellement sourcé ([BRGM, plateau à silex et alluvions de Seine](http://infoterre.brgm.fr/rapports/RP-58077-FR.pdf)) |
| Hauts-de-France | calcaire (Nord), alluvions (Picardie), craie | « calcaire 0/31,5 », « craie » à éviter en forme | 2,20 | limon, craie | partiellement sourcé ([BRGM, calcaires du Nord](http://infoterre.brgm.fr/rapports/RR-37826-FR.pdf)) |
| Île-de-France | alluvions, matériaux recyclés (forte importation) | « GNT », « recyclé », « béton concassé » | 2,15 (recyclé 1,85) | argile, gypse localement | à vérifier |
| Grand Est | calcaire, alluvions du Rhin | « calcaire », « gravier du Rhin » | 2,20 | argile, limon | à vérifier |
| Bourgogne-Franche-Comté | calcaire (Doubs : [88 % roches calcaires](https://www.bourgogne-franche-comte.developpement-durable.gouv.fr/structure-de-l-activite-extractive-des-granulats-a392.html?lang=fr)) | « calcaire 0/31,5 » | 2,20 | argile, rocher calcaire | sourcé pour le Doubs |
| Centre-Val de Loire | calcaire, alluvions de Loire | « calcaire », « sable de Loire » | 2,20 | argile à silex, sable | à vérifier |
| Nouvelle-Aquitaine | calcaire (Charentes), alluvions (Gironde), granit (Limousin) | « calcaire », « grave de Garonne » | 2,20 / 2,15 | sable (Landes), argile | à vérifier |
| Occitanie | calcaire, alluvions roulées | « grave », « tout-venant de rivière » | 2,20 | argile, rocher | à vérifier |
| Auvergne-Rhône-Alpes | granit, basalte, calcaire, alluvions du Rhône | « basalte », « pouzzolane » (attention : très léger) | 2,20 ; basalte 2,4 à vérifier | rocher, argile | partiellement sourcé ([Koncrete](https://www.koncrete.fr/blog/production-granulats-france-types-enjeux-repartition)) |
| Provence-Alpes-Côte d'Azur | calcaire | « calcaire concassé », « 0/31,5 » | 2,20 | rocher calcaire, argile | sourcé ([BRGM : calcaires PACA](http://infoterre.brgm.fr/rapports/RR-37826-FR.pdf)) |
| Corse | granit, alluvions | « 0/31,5 » | 2,15 | rocher | à vérifier |

### 8.2 Pièges régionaux

- **Pouzzolane** (Auvergne) : densité [0,7 à 0,9 t/m³](https://www.sorelest.fr/densite-gravier/), trois fois moins qu'une GNT. Si le devis dit « pouzzolane », le moteur change de matériau, jamais de densité seule.
- **Craie** et **schiste altéré** : vendus localement comme tout-venant ; densité et tenue à l'eau différentes, ratio à faire valider.
- **Gel** : en montagne (altitude > 900 m, champ altitude\_max\_m de departements.json), la forme sous accès voiture passe de 0,20 à 0,30 m (à vérifier, ratio artisan).

## 9. Points singuliers et consommables

Ce sont les pièces que le terrassier oublie et qui bloquent le chantier le jour J. Le moteur les ajoute **automatiquement** à partir des ouvrages détectés, chacune avec sa règle de déclenchement, et les affiche dans un bloc « pièces et accessoires » modifiable d'un tap.

### 9.1 Réseaux humides (assainissement, eaux pluviales)

| Pièce | Règle de déclenchement | Quantité par défaut | Source |
| --- | --- | --- | --- |
| Regard de branchement (boîte en limite de propriété) | tout branchement « tout-à-l'égout » | 1 u | règlement du service d'assainissement — à vérifier |
| Regard de visite intermédiaire | changement de direction > 45° ou tous les 30 m environ | 1 u par changement + ⌈L ÷ 30⌉ − 1 | à vérifier (règle courante des services d'eau) |
| Coude 45° (paire) | chaque changement de direction sans regard | 2 u par changement | à vérifier |
| Culotte ou té de raccordement | chaque arrivée secondaire (EP sur EU interdit en séparatif) | 1 u par arrivée | — |
| Manchon de réparation / de jonction | 1 par 2 barres coupées + 1 réserve | ⌈barres ÷ 10⌉ | ratio à valider |
| Raccord de transition (fonte, grès, amiante-ciment → PVC) | epoque\_bati ancien + « raccordement sur existant » | 1 u par raccordement | — |
| Lubrifiant pour joints | réseaux à joint | 1 pot par chantier (≈ 1 pot / 50 emboîtements, à vérifier) | à vérifier |
| Colle PVC + décapant | tubes à coller (épandage, CR8 compact) | 1 pot colle + 1 décapant par 20 barres (à vérifier) | à vérifier |
| Grillage avertisseur marron | tout réseau EU/EP | voir 5.2 | [ACSO](https://www.creilsudoise.fr/wp-content/uploads/2023/09/ACSO-Guide-Technique.pdf) |

### 9.2 Réseaux secs (électricité, télécom)

| Pièce | Règle | Quantité par défaut |
| --- | --- | --- |
| Manchon TPC | fourni avec la couronne ; 1 en plus par raccord de deux couronnes | couronnes − 1 |
| Bouchon TPC | chaque extrémité en attente | 2 u par gaine |
| Tire-fil / aiguille | fourni dans la couronne | 0 |
| Grillage avertisseur rouge (élec) ou vert (télécom) | toute gaine enterrée, posé à environ 20 cm au-dessus ([fiche gaine TPC Ø90](https://www.materielelectrique.com/gaine-tpc-diametre-90-rouge-ou-noire-lisere-rouge-conduit-isolant-souple-couronne-50m-p-571728.html)) | voir 5.2, un rouleau par couleur |
| Chambre de tirage télécom (L1T, L2T) | « chambre France Télécom / Orange » dans le devis | 1 u |

### 9.3 Drainage, épandage, infiltration

| Pièce | Règle | Quantité par défaut |
| --- | --- | --- |
| Regard de visite drainage (Ø ou 30 × 30) | 1 par angle du bâtiment + 1 au point bas (exutoire) | angles + 1 |
| Té ou coude de drain | raccord de deux couronnes, angles | manchon fourni ; coudes : 1 par angle |
| Bouchon de drain | point haut en attente | 1 u |
| Boîte de répartition ANC | épandage | 1 u |
| Boîte de bouclage ANC | épandage | 1 u |
| Tuyau plein de répartition (PVC Ø100) | 1 m pour le premier tuyau d'épandage, 0,50 m pour les suivants, plus la largeur de répartition ([fiche SPANC eau47](http://www.eau47.fr/fichier_article/file/fiches-spanc/Tranchees-epandage-pente-2.pdf)) | ajouté au linéaire, en barres |
| Ventilation fosse (PVC Ø100 + extracteur) | fosse toutes eaux | 1 extracteur + barres selon hauteur — à vérifier |

### 9.4 Consommables de chantier

| Consommable | Règle | Quantité | Commandable ? |
| --- | --- | --- | --- |
| Piquets / fiches de géotextile | géotextile en plateforme | 1 fiche par 2 m² de recouvrement, à vérifier | oui (carton de 100) |
| Bombe de traçage chantier | tout chantier avec implantation | 1 à 2 bombes | oui |
| Cordeau, piquets bois | implantation | forfait | oui, à proposer en option décochée |
| Gasoil engins, location | — | — | non (hors commande) |

## 10. Cas de test (tests/)

Six cas **synthétiques**, calculés à la main avec les règles des sections 5 et 6 : ils servent de tests de non-régression du moteur, pas de preuve terrain. Ils seront remplacés par 10 devis réels de terrassier avec ce qui a vraiment été commandé (section 13). Format identique au tiroir couverture.

```json
[
  {
    "id": "terr-001",
    "source": "synthétique — accès voiture, Côtes-d'Armor",
    "devis_texte": "Création accès véhicules 80 m², décapage 30 cm, géotextile, empierrement GNT 0/31,5 ép. 20 cm compactée",
    "contexte": { "departement": "22", "granulat": "granit", "usage": "voiture", "largeur_zone_m": 4 },
    "calcul": "80 × 0,20 × 2,15 × 1,05 = 36,1 t ; géotextile 80 × 1,15 = 92 m²",
    "attendu": [
      { "article": "GNT 0/31,5 granit", "quantite": 37, "unite": "t vrac", "tolerance_pct": 5 },
      { "article": "géotextile 150 g/m² 4 × 25 m", "quantite": 1, "unite": "rouleau", "tolerance_pct": 0 }
    ],
    "hors_commande": ["décapage 24 m³ en place, ~28 m³ foisonnés à évacuer"],
    "questions_max": 1
  },
  {
    "id": "terr-002",
    "source": "synthétique — branchement EU tout-à-l'égout",
    "devis_texte": "Branchement eaux usées PVC CR8 Ø125, 18 ml, regard de branchement en limite, tranchée prof. 0,80 m",
    "contexte": { "departement": "35", "sous_voirie": false },
    "calcul": "tubes 18 × 1,03 ÷ 3 = 6,2 → 7 ; sable (18 × 0,40 × 0,425 − 0,22) × 1,8 × 1,05 = 5,4 t → 4 big bags",
    "attendu": [
      { "article": "tube PVC CR8 Ø125 à joint 3 m", "quantite": 7, "unite": "barre", "tolerance_pct": 0 },
      { "article": "sable 0/4", "quantite": 4, "unite": "big bag 1 m³", "tolerance_pct": 25 },
      { "article": "grillage avertisseur marron 30 cm", "quantite": 1, "unite": "rouleau 100 m", "tolerance_pct": 0 },
      { "article": "regard de branchement", "quantite": 1, "unite": "u", "tolerance_pct": 0 }
    ],
    "questions_max": 1
  },
  {
    "id": "terr-003",
    "source": "synthétique — tranchée commune élec + télécom",
    "devis_texte": "Tranchée 30 ml pour fourreau Enedis TPC Ø63 et fourreau télécom Ø40, lit et enrobage sable",
    "contexte": { "departement": "29", "reseaux_ensemble": true },
    "calcul": "sable (30 × 0,60 × 0,263 − 0,13) × 1,8 × 1,05 = 8,7 t → 9 t vrac",
    "attendu": [
      { "article": "gaine TPC rouge Ø63", "quantite": 1, "unite": "couronne 50 m", "tolerance_pct": 0 },
      { "article": "gaine TPC verte Ø40", "quantite": 1, "unite": "couronne 50 m", "tolerance_pct": 0 },
      { "article": "sable 0/4", "quantite": 9, "unite": "t vrac", "tolerance_pct": 10 },
      { "article": "grillage avertisseur rouge 30 cm", "quantite": 1, "unite": "rouleau 100 m", "tolerance_pct": 0 },
      { "article": "grillage avertisseur vert 30 cm", "quantite": 1, "unite": "rouleau 100 m", "tolerance_pct": 0 },
      { "article": "bouchon TPC", "quantite": 4, "unite": "u", "tolerance_pct": 0 }
    ],
    "questions_max": 1
  },
  {
    "id": "terr-004",
    "source": "synthétique — ANC fosse + épandage",
    "devis_texte": "Fosse toutes eaux 3000 L, épandage 3 tranchées de 15 ml, largeur 0,50, gravier 10/40, géotextile, boîtes de répartition et bouclage",
    "contexte": { "departement": "56", "pieces_principales": 5 },
    "calcul": "tuyaux (45 + 3) × 1,05 ÷ 4 = 12,6 → 13 ; gravier 45 × 0,50 × 0,40 × 1,45 × 1,05 = 13,7 t → 14 t ; tuyau plein 1 + 0,5 + 0,5 + 3 = 5 m → 2 barres",
    "attendu": [
      { "article": "fosse toutes eaux 3000 L", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
      { "article": "tube d'épandage PVC CR4 Ø100 4 m", "quantite": 13, "unite": "barre", "tolerance_pct": 0 },
      { "article": "tube PVC Ø100 plein 4 m", "quantite": 2, "unite": "barre", "tolerance_pct": 0 },
      { "article": "gravier roulé lavé 10/40", "quantite": 14, "unite": "t vrac", "tolerance_pct": 10 },
      { "article": "géotextile bande 1 × 50 m", "quantite": 1, "unite": "rouleau", "tolerance_pct": 0 },
      { "article": "boîte de répartition", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
      { "article": "boîte de bouclage", "quantite": 1, "unite": "u", "tolerance_pct": 0 }
    ],
    "questions_max": 0
  },
  {
    "id": "terr-005",
    "source": "synthétique — drainage périphérique maison 10 × 12 m",
    "devis_texte": "Drainage périphérique 44 ml, drain Ø100 enrobé, gravier 20/40, géotextile, regards de visite aux angles",
    "contexte": { "departement": "44", "angles": 4 },
    "calcul": "drain 45 × 1,05 = 47,3 → 1 couronne ; gravier 44 × 0,16 × 1,5 × 1,05 = 11,1 t → 12 t ; géotextile 44 × 1,90 × 1,05 = 87,8 m² → 2 rouleaux 2 × 25",
    "attendu": [
      { "article": "drain agricole Ø100 enrobé géotextile", "quantite": 1, "unite": "couronne 50 m", "tolerance_pct": 0 },
      { "article": "cailloux 20/40", "quantite": 12, "unite": "t vrac", "tolerance_pct": 10 },
      { "article": "géotextile 2 × 25 m", "quantite": 2, "unite": "rouleau", "tolerance_pct": 0 },
      { "article": "regard de visite drainage", "quantite": 5, "unite": "u", "tolerance_pct": 0 }
    ],
    "questions_max": 0
  },
  {
    "id": "terr-006",
    "source": "synthétique — hérisson sous dallage",
    "devis_texte": "Hérisson en pierres cassées 20/40 ép. 20 cm sous dallage, 60 m²",
    "contexte": { "departement": "22" },
    "calcul": "60 × 0,20 × 1,5 × 1,10 = 19,8 t → 20 t",
    "attendu": [
      { "article": "cailloux concassés 20/40", "quantite": 20, "unite": "t vrac", "tolerance_pct": 5 }
    ],
    "questions_max": 0
  }
]
```

Critères avant bêta (identiques à la couverture) : 10 cas réels, chaque ligne dans sa tolérance, 4 questions maximum, zéro question sur une quantité, zéro m² ou m³ sur le bon fournisseur.

## 11. Ratios à faire valider par un terrassier

Ces 14 points sont les hypothèses du moteur qui ne viennent pas d'une norme ou d'une fiche fabricant. Un terrassier en activité doit cocher, corriger ou rayer chaque ligne ; c'est la condition pour passer le tiroir de « alpha » à « bêta ». Une réponse orale suffit : « oui », « non, moi je mets X ».

| # | Question à poser au terrassier | Valeur actuelle du moteur | Impact si faux |
| --- | --- | --- | --- |
| 1 | Tu comptes quelle densité pour ta GNT 0/31,5 compactée ? | 2,20 calcaire, 2,15 granit | ±5 % sur toutes les tonnes de forme |
| 2 | Tu ajoutes combien de perte sur les granulats ? | 5 % | ±5 % |
| 3 | Pour un hérisson 20/40, tu commandes combien de tonnes par m³ ? | 1,5 × 1,10 = 1,65 t/m³ | ±10 % |
| 4 | Largeur de ta tranchée pour un branchement Ø125 ? | 0,40 m | ±30 % sur le sable |
| 5 | Sable au-dessus du tuyau : 10 ou 20 cm ? | 20 cm (EU/EP), 10 cm (gaines) | ±25 % sur le sable |
| 6 | Le sable de lit de pose, tu le commandes en big bags ou en vrac ? Combien de tonnes par big bag ? | big bag ≈ 1,6 t | unité de commande |
| 7 | Recouvrement du géotextile ? | 15 % de surface en plus | ±10 % sur les rouleaux |
| 8 | Massif drainant autour du drain : quelle section ? | 40 × 40 cm | ±50 % sur le gravier de drainage |
| 9 | Combien de regards de visite sur un drainage de maison ? | 1 par angle + 1 exutoire | ±2 pièces |
| 10 | Épaisseur totale de gravier dans une tranchée d'épandage ? | 0,40 m | ±25 % sur le gravier ANC |
| 11 | Épaisseur d'empierrement par défaut : allée / voiture / camion ? | 10 / 20 / 35 cm | ±50 % |
| 12 | Sur terrain argileux, tu rajoutes combien d'épaisseur ? | +10 cm | ±50 % |
| 13 | Ton négoce livre en vrac à partir de combien de tonnes ? | 8 t | unité de commande |
| 14 | Tu prends des barres de 3 m ou de 4 m en assainissement ? | 3 m à joint | ±1 barre |

Chaque réponse devient une valeur nationale (si 3 terrassiers concordent) ou une surcharge artisan (sinon), selon la règle d'amélioration continue du référentiel couverture.

## 12. Sources officielles

Pages effectivement consultées le 3 octobre 2026. Les normes AFNOR complètes sont payantes : seuls leurs extraits publics (SPANC, guides de collectivités) ont été lus.

### 12.1 Normes et textes de référence

| Texte | Ce qu'on en tire | Lien consulté |
| --- | --- | --- |
| NF DTU 64.1 (assainissement non collectif) | tranchée 0,50 m, 30 m max, gravier 10/40, 0,30 m sous tuyau, géotextile débordant 0,10 m | [extrait DTU 64.1 (CCSVP)](https://ccsvp.fr/wp-content/uploads/2020/01/DTU_2014.pdf) ; [fiche SPANC eau47](https://www.eau47.fr/fichier_article/file/fiches-spanc/Tranchees-epandage-1.pdf) ; [fiche SYDEC 40](https://www.sydec40.fr/wp-content/uploads/2023/07/FICHE-SPANC-ANC-TEFP_16-02-2017.pdf) ; [fiche 2CCAM](https://www.2ccam.fr/wp-content/uploads/2016/03/2009_01_21_fiche2_tranchees_epandage-1.pdf) |
| Fascicule 70 CCTG (canalisations d'assainissement) | lit de pose ≥ 10 cm (15 cm sur rocher), largeur de tranchée | [Fascicule 70 (2003)](https://www.agrialpro.fr/media/wysiwyg/CCTG_FASCICULE_70-2003.pdf) ; [extrait Ginger](https://www.over-view.fr/wp-content/uploads/2019/08/g21-extrait-editions-ginger.pdf) |
| NF P 98-331 / NF P 98-332 (tranchées, réseaux) | couverture 80 cm, compactage, grillage à 20 cm | [guide ACSO](https://www.creilsudoise.fr/wp-content/uploads/2023/09/ACSO-Guide-Technique.pdf) ; [Montpellier 3M](https://regiedeseaux.montpellier3m.fr/medias/pdf/Guide_technique_travaux_ouvrages_assainissement.pdf) ; [Mauges Communauté](https://www.maugescommunaute.fr/wp-content/uploads/Prescriptions-Techniques-reseaux-AEP-MC-1.pdf) |
| NF EN 13242 (granulats non traités) | GNT 0/31,5 | [fiche SAS Pellet](https://sas-pellet.fr/grave.concassee.calcaire.0.31.5-59-51.php) |
| NF EN 13476-2 / NF EN 1401 (tubes PVC assainissement) | CR8, barres 3 m | [Bipeau CR8](https://static.mypum.fr/media/FT/AG-FT_BIPEAU_CR8.pdf) ; [Dyka Sotralys](<https://static.mypum.fr/media/FT/AK-FT-DYKA-Sotralys_Tube_PVC_assainissement_(E102017).pdf>) ; [Wavin ECO-TP](https://www.sopsa-plomberie.fr/assets/fiche/wavin-ECO-TP_CR4-CR8-ft.pdf) ; [catalogue MTP](https://www.mtp-sa.com/catalogue_mtp/8/) |
| NF EN 61386-24 (gaines enterrées) | TPC Ø40 à 160, couronnes 25/50/100 m | [Chausson TPC](https://www.chausson.fr/materiaux/gaine-tpc-annelee-rouge-d40-couronne-metres-p-114835-3) |
| NF EN 12613 (dispositifs avertisseurs) | grillage 30 cm × 100 m, couleurs | [catalogue Ciffréo Bona](https://www.ciffreobona.fr/userfiles/file/PDF/8/91/906/12496/48_1329756620.pdf) |
| NF U 51-101 (drains agricoles) | drain PVC annelé, couronnes | [fiche Pipeflex](https://static.mypum.fr/media/FT/AG-FT_DRAIN.pdf) ; [Formatub](https://formatub-budget.com/drain-agricole/2073-drain-agricole-d100-enrobe-geotextile-couronne-de-50ml.html) |

### 12.2 Fiches produits et négoces

| Produit | Lien |
| --- | --- |
| Drain Ø100 enrobé 50 m, 36,5 kg | [VM Matériaux](https://www.vm-materiaux.fr/5028-drain-pvc-agricole-perfore-enrobe-de-geotextile-100-50m.html) |
| Tube d'épandage CR4 Ø100 × 4 m, palette 63 | [Fitt](https://shop.fitt.mc/p/tube-pvc-epandage-cr4-o100-fitt-terra-vert-longueur-4m/) ; [ATE BatiPand](https://www.ate-drainage.com/produits/tube-epandage-batiment-pvc-sn4/) ; [Gedimat Sotrapand](https://www.gedimat.fr/tube-epandage-sotrapand-d100mm-4m-,1871130,1,6,25.htm) |
| Géotextile Edia 4 × 25 / 4 × 50 | [Chausson](https://www.chausson.fr/materiaux/geotextile-non-tisse-edia-p-42998-1) |
| Géotextile en bandes 0,5 × 100 / 1 × 50 / 2 × 25 | [PUM](https://www.mypum.fr/amenagement-exterieur/amenagement-paysager/geotextile/produits/P2323) |
| Big bag calcaire 1 m³ = 1,5 t | [Garandeau](https://www.garandeaumateriaux.com/accueil/produit/calcaire_0_20_ou_0_31_5_calcaire_en_bigbag_1_m3_depart-3629.html) |
| Gaine TPC Ø40 à Ø90, 25 ou 50 m | [Sorodist](https://sorodist.com/produit/gaine-tpc-rouge/) |

### 12.3 Données générales

| Sujet | Lien |
| --- | --- |
| Foisonnement et densité des terres | [Calcul-BTP](https://calcul-btp.fr/deblai-remblai) ; [TP Demain](https://tpdemain.com/module/le-foisonnement/) ; [BatiCalc](https://baticalc.fr/blog/terrassement-volume-foisonnement) |
| Densités GNT vrac / compactée | [Koncrete](https://www.koncrete.fr/blog/densite-des-materiaux-du-btp-le-tableau-complet) ; [Koncrete GNT](https://www.koncrete.fr/blog/densite-de-la-gnt-foisonnee-vs-compactee) |
| Densités graviers | [Sorelest](https://www.sorelest.fr/densite-gravier/) |
| Production de granulats par roche et département | [UNPG 2020](https://admin.unicem.fr/app/uploads/sites/3/2023/09/depliant-stat-unpg-2020.pdf) ; [SDES](https://www.donnees.statistiques.developpement-durable.gouv.fr/lesessentiels/essentiels/sol-extraction-granulat.html) |

Non lus, à obtenir : texte intégral NF DTU 64.1 (tableaux de longueur d'épandage par perméabilité), NF DTU 20.1 (drainage), guide GTR NF P 11-300, cahier des charges Enedis pour les branchements (diamètres et profondeurs imposés).

## 13. Plan de complétion

Le tiroir est en **alpha** : formules et formats sourcés, ratios de mise en œuvre non validés, aucun cas réel. Ordre : 1 d'abord (sans cas réels, rien n'est validable), puis 2, puis le reste.

| # | Manque | Source | Qui | Critère de fin |
| --- | --- | --- | --- | --- |
| 1 | 10 devis réels de terrassier + ce qui a été commandé | terrassiers du réseau (Dorothée, Omar, négoces partenaires) | Greg | tests/ complet, tous verts |
| 2 | Relecture des 14 ratios (section 11) | un terrassier en activité, 30 minutes | Greg organise | ratios-a-valider.md vide |
| 3 | Densités réelles des carrières par région (fiches techniques) | sites carrières (Lafarge, Eiffage, Colas, carrières locales) | Claude (recherche web) | 13 régions avec densité sourcée |
| 4 | Tableau DTU 64.1 longueur d'épandage par perméabilité et nombre de pièces | texte DTU (AFNOR, payant) ou SPANC départementaux | Greg fournit, Claude transcrit | anc\_epandage sans « à vérifier » ; question de secours si le devis ne donne pas la longueur |
| 5 | Regards béton : éléments, poids, conditionnements | fiches fabricants (Stradal, Bonna Sabla, Saint-Léger) | Claude | materiaux.json regards complets |
| 6 | Cahiers des charges Enedis / Orange / GRDF pour les branchements | sites gestionnaires | Claude | défauts gaine\_elec et gaine\_telecom sourcés |
| 7 | Vocabulaire enrichi | 50 premiers devis bêta | automatique + validation | zéro mot inconnu sur un devis courant |
| 8 | Axe nature\_sol ajouté au schéma commun | Claude Code | Claude Code | departements.json et schéma validés, test vert |
| 9 | Ouvrages hors V0 : filtre à sable, microstation, bordures et pavés, enrobé | fiches agréments ANC, DTU | Claude | ouvrages ajoutés en version mineure |

## 14. CHANGELOG

| Date | Version | Changement |
| --- | --- | --- |
| 3 oct. 2026 | 0.1.0 | Création du tiroir terrassement-VRD au format section 27 : 12 ouvrages, axe nature\_sol, fiches granulats, tubes, couronnes, rouleaux ; règles de calcul sourcées DTU 64.1, Fascicule 70, NF P 98-331 ; 8 questions classées ; 6 cas de test synthétiques ; 14 ratios à valider. |
