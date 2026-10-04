# Référentiel quantitatif ÉTANCHEUR (Rappidos)

Oct 3, 2026 · @Greg

Ce document est le tiroir `referentiels/etancheite/` du moteur BatiClair : il suit le gabarit de la section 27 du référentiel couverture (mêmes fichiers `metier.json`, `ouvrages.json`, `materiaux.json`, `regles.json`, `defauts.json`, `questions.json`, `vocabulaire.json`, `tests/`). Le moteur ne contient aucun mot de ce métier : tout ce qui est propre à l'étanchéité est ici.

Périmètre : étanchéité des toitures-terrasses et toitures à faible pente (0 à 20 %) — bitume modifié bicouche, membranes synthétiques (PVC, TPO, EPDM), étanchéité liquide (SEL), isolant sous étanchéité, protections, évacuations EP et relevés. Hors périmètre : zinguerie de couverture (tiroir couverture), étanchéité sous carrelage de salle de bain (tiroir carrelage), cuvelage et fondations (tiroir maçonnerie).

Légende : **\[sourcé\]** = valeur lue sur une fiche fabricant ou un texte normatif ouvert, lien en section 12 ; **\[à vérifier\]** = valeur d'usage ou de mémoire, à faire confirmer par un étancheur (section 11) avant passage en `maturite: stable`.

## 1. Métier et axes de variation

L'étancheur rend étanche une toiture plate ou à faible pente : il pose un pare-vapeur, un isolant, un revêtement d'étanchéité (bitume, membrane synthétique ou résine) et ses relevés, puis une protection. Ce qui fait varier le quantitatif, c'est d'abord **le support** (béton, bac acier, bois) et **neuf ou réfection**, bien plus que la région.

```json
{
  "code": "etancheite",
  "nom": "Étanchéité toitures-terrasses",
  "version": "0.1.0",
  "normes": ["NF DTU 43.1", "NF DTU 43.3", "NF DTU 43.4", "NF DTU 43.5", "NF DTU 43.11", "Avis techniques / DTA (membranes, SEL)", "Règles NV65 (vent)"],
  "axes_de_variation": {
    "geographie": "moyen",
    "epoque_bati": "faible",
    "type_batiment": "fort",
    "neuf_renovation": "fort",
    "gamme": "moyen",
    "support": "fort",
    "accessibilite_toiture": "fort"
  },
  "metiers_lies": ["couverture", "zinguerie", "maconnerie", "isolation", "vegetalisation"],
  "unites_de_commande": ["rouleau", "panneau", "paquet", "bidon", "seau", "kit", "u", "boîte", "cartouche", "bouteille gaz", "barre", "sac", "big-bag", "t"],
  "maturite": "beta"
}
```

Deux axes sont propres à ce métier et doivent être ajoutés à la liste générique du moteur : `support` (élément porteur) et `accessibilite_toiture` (classe d'usage de la terrasse). Ce sont eux qui choisissent la norme, le mode de fixation et la protection.

| Axe | Poids | Ce qu'il change dans le quantitatif | Comment le moteur le résout |
| --- | --- | --- | --- |
| Support (béton / bac acier / bois-panneaux / existant) | fort | Norme applicable (DTU 43.1 / 43.3 / 43.4 / 43.5), présence ou non d'un primaire (EIF), pare-vapeur, nombre de vis d'isolant | Lu dans le devis (« dalle béton », « bac acier », « OSB », « réfection ») ; sinon question 1 |
| Neuf / réfection | fort | Réfection : dépose ou recouvrement, primaire de réactivation, ajout de relevés, pertes plus fortes | Lu dans le devis (« réfection », « reprise », « remplacement ») |
| Accessibilité (inaccessible / technique / piétons / jardin / parking) | fort | Protection : rien (autoprotégé), gravillons, dalles sur plots, terre végétale | Lu dans le devis (« autoprotégée », « gravillons », « dalles sur plots ») ; sinon question 2 |
| Type de bâtiment (maison, collectif, ERP, industriel) | fort | Taille des chantiers, bac acier fréquent en industriel, contraintes feu (Broof t3) | Profil artisan + lignes du devis |
| Géographie (zone de vent, littoral, montagne) | moyen | Densité de fixation en système fixé mécaniquement, lestage, gravillons ; neige en montagne | Département du chantier → `commun/departements.json` (zone vent NV65) |
| Gamme (bitume / synthétique / liquide ; marque) | moyen | Change toute la nomenclature produit, pas la surface | Lu dans le devis (marque citée), sinon défaut régional ou habitude artisan |
| Époque du bâti | faible | Ancien : relevés en maçonnerie à reprendre, acrotères bas → bandes de rive | Ignoré par défaut |

Époque du bâti : seul cas utile, la réfection d'une terrasse des années 1960-1980 dont l'acrotère fait moins de 15 cm au-dessus de la protection ; le moteur ne pose pas la question, il affiche l'hypothèse « relevé 15 cm ».

## 2. Règle d'or et unités de commande

**Règle d'or : aucune ligne du quantitatif n'est en m² ni en ml.** Le devis d'étanchéité est rédigé en m² (surface courante) et en ml (relevés) ; le quantitatif les convertit en rouleaux, panneaux, bidons et pièces. Un m² de « bicouche » devient deux lignes de rouleaux différents, un primaire en bidons, des panneaux d'isolant, des paquets de vis.

Deuxième règle propre au métier : **un ml de relevé consomme de la membrane comme de la surface**. Le moteur ajoute toujours la surface développée des relevés (hauteur + retombée en partie courante) à la surface courante avant de compter les rouleaux.

| Famille | Unité de commande | Ce qui se convertit | Arrondi |
| --- | --- | --- | --- |
| Membrane bitume (sous-couche, autoprotégée, relevés) | rouleau (souvent 10 m² ou 7,5-8 m²) | m² utiles ÷ m² utiles par rouleau (après recouvrements) | rouleau entier supérieur |
| Membrane synthétique PVC / TPO / EPDM | rouleau (largeur × longueur fabricant) ou bâche sur mesure (EPDM) | m² + recouvrements + relevés | rouleau entier ; bâche EPDM : dimensions L × l |
| Isolant (PIR, PSE, laine de roche, verre cellulaire) | panneau, puis paquet | m² ÷ m² par panneau | paquet entier si > 1 paquet, sinon panneaux |
| Pare-vapeur | rouleau | m² + relevés de pare-vapeur | rouleau entier |
| Primaire (EIF), colle, résine SEL | bidon / seau (kg ou L) | m² × consommation | bidon entier |
| Fixations d'isolant / de membrane | boîte (vis + plaquettes, souvent par 100 ou 250) | m² × densité de la zone de vent | boîte entière |
| Protection gravillons | sac 25-35 kg, big-bag \~1 t, ou t en vrac | m² × épaisseur × densité | big-bag ou t |
| Dalles sur plots | u (dalles) + u (plots) | m² ÷ m² par dalle ; plots par dalle | u |
| Évacuations (EEP, trop-plein, crapaudine) | u | comptées dans le devis | u |
| Couvertine, bande solin, profil de rive | barre (2 à 3 m) + éclisses + embouts | ml ÷ longueur de barre | barre entière |
| Mastic, joint | cartouche | ml × consommation | cartouche |
| Gaz propane (soudure chalumeau) | bouteille 13 kg ou 35 kg | m² soudés × consommation | bouteille |

Unités interdites en sortie : m², ml, « forfait », « ensemble ». Une ligne du devis « relevés d'étanchéité : 42 ml » ne sort jamais telle quelle ; elle s'ajoute aux rouleaux et génère la bande de solin ou la couvertine en barres.

## 3. Ouvrages, vocabulaire des devis et pièges

Dix ouvrages couvrent l'essentiel des devis d'étanchéité. Chaque ouvrage est un « complexe » : une pile de couches posées dans un ordre fixe, du support vers le ciel.

| Code ouvrage (`ouvrages.json`) | Ce que c'est | Pile de couches (bas → haut) |
| --- | --- | --- |
| `etanch_bitume_bicouche_autoprotege` | Terrasse inaccessible, bitume SBS 2 couches, finition paillettes | EIF → (pare-vapeur → isolant) → 1re couche → 2e couche autoprotégée |
| `etanch_bitume_bicouche_gravillons` | Idem, protection lourde gravillons | EIF → (PV → isolant) → 1re → 2e couche → (non-tissé) → gravillons 4 cm |
| `etanch_bitume_bicouche_dalles_plots` | Terrasse accessible piétons | EIF → (PV → isolant) → 1re → 2e couche → plots → dalles |
| `etanch_bitume_monocouche` | Monocouche sous avis technique (petites surfaces, bac acier) | (PV → isolant) → membrane monocouche fixée ou soudée |
| `etanch_pvc_fixe_meca` | Membrane PVC-P fixée mécaniquement | PV → isolant → (voile) → membrane PVC fixée en lisière |
| `etanch_tpo_fpo` | Membrane TPO/FPO soudée air chaud | PV → isolant → membrane TPO fixée ou collée |
| `etanch_epdm` | Membrane EPDM collée (maison, garage, petites terrasses) | support bois/béton → colle → bâche EPDM → relevés collés |
| `etanch_sel_resine` | Système d'étanchéité liquide (balcon, terrasse, reprise) | primaire → résine + armature → résine → finition |
| `etanch_vegetalisee` | Toiture végétalisée extensive | complexe bitume anti-racine → drainage → filtre → substrat → plantes |
| `reprise_releves_points_singuliers` | Réfection partielle : relevés, EEP, acrotères | primaire → équerre de renfort → relevé → solin/couvertine |

**Vocabulaire des devis → ouvrage** (`vocabulaire.json`, synonymes à matcher sans casse ni accents) :

- « bicouche », « SBS », « bitume élastomère », « multicouche », « 2 couches soudées » → famille bitume.
- « autoprotégé(e) », « AP », « paillettes d'ardoise », « ardoisé », « finition minérale » → 2e couche autoprotégée, pas de protection rapportée.
- « EIF », « enduit d'imprégnation à froid », « primaire d'adhérence », « vernis bitumineux » → primaire.
- « PV », « pare-vapeur », « écran pare-vapeur », « BV » (barrière vapeur) → pare-vapeur.
- « PIR », « polyuréthane », « Efigreen », « TMS » (marque) → isolant PIR ; « PSE », « polystyrène » → PSE ; « laine de roche », « Rockacier », « LR » → laine de roche.
- « EEP », « entrée d'eau pluviale », « naissance », « moignon », « platine EP », « boîte à eau » → évacuation ; « crapaudine » ; « trop-plein », « gargouille », « barbacane » → trop-plein.
- « acrotère », « relevé », « remontée », « engravure », « solin », « bande de rive », « couvertine », « costière » → points singuliers (section 9).
- « fixé méca », « FM », « fixation mécanique » ; « collé à froid », « soudé », « semi-indépendant », « indépendant sous protection lourde » → mode de liaison.

**Pièges connus (à coder comme règles, pas comme prompts)** :

1. **Bicouche = deux rouleaux différents.** Ne jamais doubler la même référence : la 1re couche est lisse ou sablée, la 2e est autoprotégée (ou lisse sous gravillons).
2. **Relevés oubliés.** Le devis met souvent les relevés en ml séparés ; ils consomment de la membrane (≈ 0,35 à 0,50 m² par ml, voir section 5) et une équerre de renfort.
3. **« Isolation 120 mm R=5,5 »** : le devis donne une épaisseur ou un R ; le panneau commandé doit avoir cette épaisseur exacte. Ne jamais déduire l'épaisseur du prix.
4. **Bac acier** : pas d'EIF (support métal), pare-vapeur obligatoire en local chauffé, isolant en panneaux porteurs sur nervures, fixations longues (longueur vis = épaisseur isolant + 25 à 30 mm, à vérifier).
5. **Réfection par recouvrement** : l'ancien revêtement reste ; on ajoute un primaire de réactivation et on ne commande pas d'isolant si le devis n'en mentionne pas.
6. **Gravillons** : jamais en sacs pour > 20 m² ; en big-bag ou en tonnes livrées.
7. **Surface en projection vs développée** : sur toiture à pente ≤ 5 % l'écart est négligeable ; le moteur ne corrige pas la pente sous 15 %.

## 4. Matériaux et fiches fabricant

Les deux leaders bitume en France sont Soprema et Siplast ; leurs rouleaux font 1 m de large, de 5 à 10 m de long, avec une lisière de recouvrement de 6 cm. Toutes les valeurs ci-dessous sont **\[sourcé\]** sauf mention ; liens en section 12. Règle reprise du référentiel couverture : le conditionnement de `materiaux.json` vient d'une fiche négoce quand elle existe, car c'est le négoce qui livre.

### 4.1 Membranes bitume élastomère SBS

| Article (`materiaux.json`) | Rôle | Rouleau | m² brut | Poids rouleau | Palette | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Soprema Elastophène Flam 25 | 1re couche (ou 2e sous protection lourde) | 10 × 1 m ou 7 × 1 m (« Confort ») | 10 / 7 | ≈ 32 kg / ≈ 25 kg | à vérifier | Fiche Soprema DT-13/016 (Gedimat), Point.P 3272643 |
| Soprema Elastophène Flam S 25 | 1re couche sablée | 7 × 1 m | 7 | 25,95 kg | à vérifier | CBA Matériaux 6176368 |
| Soprema Elastophène Flam 25 AR | 2e couche autoprotégée (paillettes) | 6 × 1 m (fiche WPBFR206) ; 10 × 1 m sur fiche ancienne (AR FR, ≈ 41 kg) | 6 / 10 | ≈ 25-27,5 kg (6 m) | à vérifier | Fiche Soprema WPBFR206, SFIC 3272649 |
| Soprema Sopralène Flam 180 | 1re couche ou 2e couche, armature polyester 180 g/m², 2,9 mm | 6 × 1 m | 6 | ≈ 25 kg | à vérifier | Fiche Soprema WPBFR229 |
| Soprema Sopralène Flam 180 AR | 2e couche autoprotégée, relevés | 6 × 1 m ou 8 × 1 m | 6 / 8 | ≈ 25 kg (6 m), ≈ 38-40 kg (8 m) | 30 rouleaux (version 8 m sans galon) | Fiche Soprema WPBFR230, soprema.fr |
| Soprema Sopralène Flam S 180-35 | 1re couche de relevés, chéneaux | 6 × 1 m | 6 | à vérifier | à vérifier | Fiche Soprema WPBFR232 |
| Siplast Paradiène S VV / S R4 | 1re couche | 10 × 1 m | 10 | à vérifier | à vérifier | Notice gamme Paradiène (Ciffréo Bona) |
| Siplast Paradiène 35 S R4 | 1re couche renforcée | 8 × 1 m (5 × 1 m, 25 kg, sur notice ancienne) | 8 / 5 | à vérifier | à vérifier | Notice gamme Paradiène |
| Siplast Paradiène 30.1 GS | 2e couche autoprotégée | 10 × 1 m | 10 | 45 kg | 24 rouleaux | Notice gamme Paradiène (Denis Matériaux) |
| Siplast Paradiène 40.1 GS | 2e couche autoprotégée renforcée | 8 × 1 m | 8 | 45 kg | à vérifier | Notice gamme Paradiène |

Le moteur ne choisit jamais la longueur de rouleau : il prend la référence citée dans le devis, sinon le défaut de la section 6, et affiche la longueur retenue.

### 4.2 Primaires, colles et résines

| Article | Consommation | Conditionnement | Source |
| --- | --- | --- | --- |
| Soprema Aquadère (EIF sans solvant) | béton 0,25-0,35 L/m² ; bois 0,25-0,30 ; métal 0,15-0,20 | bidon 5 L (≈ 14-15 m² béton) ou 25 L (≈ 70 m² béton) | Fiche Aquadère (ManoMano/Soprema), Union Matériaux 673113 |
| Soprema Élastocol 600 (EIF solvanté) | 0,4 L/m² | bidon 5 ou 30 L | Guide Soprema autoadhésifs |
| Soprema Alsan Flashing (résine relevés / SEL) | 900 g/m² | bidon 2,5, 5 ou 15 kg | Guide Soprema autoadhésifs |
| Firestone / Holcim RubberCover Bonding Adhesive BA-2012 (colle EPDM, 2 faces) | 2,35 à 3 m² par litre | seau 10 L (23-30 m²) | Catalogue RubberCover (EPDM Solutions) |
| Primaire QuickPrime Plus (bandes QuickSeam) | ≈ 20 ml de bande par litre | à vérifier | Catalogue RubberCover |

### 4.3 Isolants support d'étanchéité

| Article | Format | Épaisseur → R | Colisage | Source |
| --- | --- | --- | --- | --- |
| Soprema Efigreen Duo + (PIR, sous protection lourde) | 600 × 600 mm (0,36 m²) | λ 0,022-0,023 ; 120 mm → R 5,20 | 60 mm : 16 pan./colis (5,76 m²) ; 70 : 14 (5,04) ; 80 : 12 (4,32) ; 90 : 10 (3,60) ; 100 : 10 (3,60) ; 120 : 8 (2,88) ; 140 : 6 (2,16) ; 160 : 6 (2,16) ; 10 colis/palette (12 en 140) | ID France Matériaux, soprema.fr, Chausson |
| Soprema Efigreen Alu + (PIR, sous étanchéité apparente) | 600 × 600 mm | 100 → R 4,55 ; 120 → 5,50 ; 140 → 6,40 ; 160 → 7,30 | idem Duo + (8 pan./colis en 120) ; 10 colis/palette (12 en 140) | Airisol, Batir SA |
| Soprema Efigreen Alu + XL | 1 200 × 1 000 mm ou 2 500 × 1 200 mm | 80 → R 3,60 ; 100 → 4,50 ; 120 → 5,45 ; 140 → 6,35 | 1 200 × 1 000 : 120 mm = 3 pan./colis, 140 mm = 2 pan./colis, 6 colis/palette ; 2 500 × 1 200 : 80 mm = 15 pan./palette, 100 mm = 10 | Négoce Matériaux Aquitain |
| Laine de roche (Rockacier), PSE, verre cellulaire | à saisir | à saisir | à saisir | à vérifier — fiches Rockwool, Knauf, Foamglas à transcrire |

### 4.4 Membranes synthétiques

| Article | Rouleau | m² brut | Poids | Recouvrement | Source |
| --- | --- | --- | --- | --- | --- |
| Soprema Flagon SV 15/10 (PVC, indépendance sous protection lourde) | 20 × 2,10 m (utile 2,05) ; 1,60 m (utile 1,55) | 42 | 75,6 kg ; palette 1 176 m² (28 rouleaux) | 5 cm long. et transv., soudure air chaud ≥ 3 cm | Fiche WPSIT0056, Quéguiner |
| Soprema Flagon SV 12/10 | 25 × 2,10 m | 52,5 | 76,2 kg | 5 cm | Fiche WPSIT0056 |
| Soprema Flagon SR 15/10 (PVC fixé mécaniquement) | 20 × 1,05 / 1,60 / 2,10 m | 21 / 32 / 42 | 37,8 / 57,6 / 75,6 kg | 10 cm long. (fixations dessous), 5 cm transv. | Fiche WPSIT0051, fiche Flagon SR (Samse) |
| EPDM RubberCover 1,14 mm | bâche sur mesure ou rouleaux standards | selon dimensions | 1,51 kg/m² | collé en plein ; 150 m² max d'un seul tenant | Catalogue RubberCover |
| TPO / FPO (Ultraply, Flagon TPO) | à saisir | à saisir | à saisir | à saisir | à vérifier |

### 4.5 Pare-vapeur, protections, accessoires

| Article | Conditionnement | Rendement | Source |
| --- | --- | --- | --- |
| Soprema Sopravap Stick Alu S16 (pare-vapeur autoadhésif) | rouleau 14 × 1,08 m | ≈ 14 m² utiles | Guide Soprema autoadhésifs |
| Firestone V-Gard (pare-vapeur EPDM/TPO) | rouleau 1,08 × 50 m | 54 m² | Catalogue RubberGard |
| Plots à vis pour dalles | à l'unité, hauteurs 25-40, 40-67, 60-90, 90-150, 150-260 mm ; plots fixes 8 ou 35 mm | 5 plots/m² en dalles 50 × 50 ; 7 plots/m² en dalles 40 × 40 | Guide Soprema autoadhésifs |
| Gravillons roulés 5/15 à 15/30 | sac 25-35 kg, big-bag, vrac | 4 cm mini → 0,04 m³/m² ≈ 65 kg/m² (densité 1,6 à vérifier) | DTU 43.1 / 43.3 (via Soprema, notech) |
| Couvertine aluminium, bande de solin, profil de rive | barre 2 ou 3 m + éclisses + embouts | ml ÷ longueur barre | à vérifier — fiches négoce à transcrire |
| EEP, crapaudine, trop-plein (bitume, PVC, plomb) | u | 1 cm² de descente par m² de toiture ; 2 EEP mini ou 1 + trop-plein | Fiche « Points singuliers des terrasses », DTU 43.1 |
| Gaz propane | bouteille 13 kg ou 35 kg | à vérifier (ordre de grandeur 0,1-0,2 kg par m² de couche soudée) | à vérifier |

## 5. Règles de calcul (DTU, formules, pertes)

Toutes les règles partent de trois mesures lues dans le devis : **S** = surface courante (m²), **P** = longueur de relevés (ml), **N\_EEP** = nombre d'évacuations. Le moteur calcule d'abord la surface à couvrir par couche, puis la divise par la surface **utile** du rouleau (après recouvrements), puis arrondit au rouleau supérieur.

### 5.1 Valeurs normatives retenues

| Règle | Valeur | Statut |
| --- | --- | --- |
| Recouvrement entre feuilles bitume d'une même couche | 6 cm minimum (lisière de 6 cm sur les rouleaux) | \[sourcé\] DTU 43.3 / 43.4, fiches Soprema |
| Recouvrement transversal (abouts) bitume | 6 cm mini normatif ; **10 cm retenus par défaut** | 6 cm sourcé ; 10 cm à vérifier (pratique chantier) |
| Recouvrement PVC Flagon SV (indépendance) | 5 cm long. et transv. | \[sourcé\] fiche WPSIT0056 |
| Recouvrement PVC Flagon SR (fixé méca) | 10 cm long., 5 cm transv. | \[sourcé\] fiche WPSIT0051 |
| Hauteur de relevé | 15 cm mini au-dessus de la protection (ou du revêtement si autoprotégé) ; 10 cm aux seuils | \[sourcé\] DTU 43.1, 43.3 |
| Équerre de renfort en pied de relevé | 0,25 m de développé | \[sourcé\] DTU 43.1 |
| Feuilles de relevé | posées par longueur maxi 1 m, recouvrement latéral 6 cm | \[sourcé\] DTU 43.3 |
| Hauteur maxi d'acrotère revêtu | 0,50 m au-dessus de la protection | \[sourcé\] DTU 43.1 |
| Gravillons | 4 cm mini, granulométrie 5 mm à 2/3 de l'épaisseur | \[sourcé\] DTU 43.1 / 43.3 |
| Évacuations | 1 cm² de section de descente par m² de toiture ; 2 EEP mini, ou 1 + trop-plein ; bac acier : 700 m² max par EEP en fond de noue, 350 m² en déversoir | \[sourcé\] DTU 43.1, 43.3 |
| Pente mini bac acier support d'étanchéité | 3 % | \[sourcé\] guide Bacacier (DTU 43.3) |
| Fixations d'isolant sous protection lourde | 1 fixation centrale par panneau | \[sourcé\] guide Bacacier |

**Densité de fixation des isolants sous étanchéité autoprotégée** (bâtiments h < 20 m, fixations/m², \[sourcé\] guide Bacacier d'après DTU 43.3 ; au-delà de 20 m ou en site exposé zones 3-4 : calcul obligatoire, l'app affiche « à faire valider ») :

| Zone | Zones vent 1-2, fermé, normal | 1-2 fermé, exposé | 1-2 ouvert, normal | 1-2 ouvert, exposé | 3-4 fermé, normal | 3-4 fermé, exposé | 3-4 ouvert, normal | 3-4 ouvert, exposé |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Partie courante | 5 | 6 | 5 | 8 | 6 | 8 | 8 | 10 |
| Périphérie (bande de 2 m) | 6 | 10 | 6 | 10 | 10 | 10 | 10 | 10 |
| Angles | 10 | 12 | 10 | 12 | 12 | 12 | 12 | 12 |

### 5.2 Formules (`regles.json`)

```text
# Surfaces de base
S_rel      = P × dev_releve                       # dev_releve = h_releve + e_protection + talon (défaut 0,15 + 0 + 0,15 = 0,30 m)
S_equerre  = P × 0,25

# Bitume bicouche — surface utile d'un rouleau
utile(L, l) = (l − 0,06) × (L − recouv_transv)    # 10×1 → 0,94 × 9,90 = 9,31 m² ; 8×1 → 7,43 ; 7×1 → 6,49 ; 6×1 → 5,55

rouleaux_couche1 = ceil( S × (1 + perte_courante) / utile(rouleau_1) )
rouleaux_couche2 = ceil( (S × (1 + perte_courante) + S_rel × 1,06 × (1 + perte_releve)) / utile(rouleau_2) )
rouleaux_equerre = ceil( S_equerre × 1,06 × (1 + perte_releve) / utile(rouleau_equerre) )   # coupé dans la 1re couche ou dans un S 180-35

# Primaire EIF (béton, bois, maçonnerie ; jamais sur isolant)
L_EIF   = (S_si_adherence_sur_support + S_rel + S_equerre) × conso_EIF   # conso béton 0,30 L/m²
bidons  = combinaison minimale de 25 L et 5 L couvrant L_EIF

# Pare-vapeur (si isolant sur béton ou bac acier en local chauffé)
S_PV        = S + P × (e_isolant + 0,10)
rouleaux_PV = ceil( S_PV × 1,05 / utile(rouleau_PV) )

# Isolant
panneaux = ceil( S × (1 + perte_isolant) / surface_panneau )
colis    = ceil( panneaux / panneaux_par_colis )            # sortie en colis, jamais en m²

# Fixations d'isolant (bac acier, ou béton si fixé méca)
si protection_lourde : fixations = panneaux
sinon :
  S_angles = 4 × (2 × 2)                                    # 4 angles de 2 m × 2 m
  S_periph = max(0, perimetre × 2 − 4 × 4) ; S_courante = S − S_periph − S_angles
  fixations = S_courante × d_courante + S_periph × d_periph + S_angles × d_angles   # densités du tableau 5.1
boites = ceil( fixations × 1,05 / vis_par_boite )            # vis longueur = e_isolant + ancrage (à vérifier)

# Gravillons
tonnes = S × e_gravillons × densite                         # 0,04 m × 1,6 t/m³ = 0,064 t/m²
sortie : big-bag si tonnes ≥ 0,8, sinon sacs

# Dalles sur plots
dalles = ceil( S × 1,03 / surface_dalle ) ; plots = ceil( S × plots_par_m2 )    # 5/m² en 50×50, 7/m² en 40×40

# PVC
utile_PVC  = (largeur_utile − (recouv_long − 0,05)) × (L − recouv_transv)   # SV 2,10 → 2,05 × 19,95 = 40,9 m² ; SR 2,10 → 2,00 × 19,95 = 39,9 m²
rouleaux_PVC = ceil( (S + S_rel) × 1,05 / utile_PVC )

# EPDM (bâche d'un seul tenant si ≤ 150 m²)
bache = (long + 2 × (h_releve + 0,10)) × (larg + 2 × (h_releve + 0,10))
L_colle = (S + S_rel) / 2,5 ; seaux = ceil(L_colle / 10)

# Couvertines, bandes de solin, profils
barres = ceil( P × 1,03 / longueur_barre ) ; eclisses = barres − nb_troncons ; angles = compte du devis ou 4 par défaut
```

### 5.3 Pertes par défaut

| Poste | Perte | Variation |
| --- | --- | --- |
| Bitume partie courante | 5 % | 8 % si S < 30 m² ; 10 % si plus de 4 émergences / 100 m² (à vérifier) |
| Bitume relevés | 10 % | 15 % si P > 0,5 × √S (beaucoup de petits relevés, à vérifier) |
| Isolant | 3 % | 5 % si forme non rectangulaire |
| PVC / TPO | 5 % | 8 % si S < 50 m² |
| EPDM bâche | 0 % (sur mesure) | rouleaux standards : 10 % |
| Primaires, colles, résines | inclus dans la consommation haute | — |
| Fixations | 5 % | — |

Toutes les pertes sont « à vérifier » auprès d'un étancheur (section 11) ; les recouvrements, eux, sont normatifs et ne sont pas des pertes.

## 6. Valeurs par défaut et hypothèses affichées

Quand le devis se tait, le moteur applique ces défauts et **les affiche tous** en tête du quantitatif, chacun modifiable d'un tap. Ordre de résolution inchangé : chantier → artisan → variation par axe → valeur nationale.

| Clé | Défaut national | Variations | Texte affiché |
| --- | --- | --- | --- |
| `support` | béton | « bac acier » dans le devis → bac\_acier ; « OSB », « volige », « CTBH » → bois | « Support béton » |
| `neuf_renovation` | neuf | « réfection », « reprise », « sur existant » → renovation | « Travaux neufs » |
| `systeme` | bitume bicouche soudé | marque PVC/EPDM/résine citée → système correspondant ; maison < 40 m² sans mention → à demander (Q3) | « Bicouche bitume SBS soudé » |
| `rouleau_couche1` | Elastophène Flam 25, 10 × 1 m | région où Siplast domine (section 8) → Paradiène S VV 10 × 1 | « 1re couche Elastophène Flam 25 (10 m²) » |
| `rouleau_couche2_AP` | Sopralène Flam 180 AR, 8 × 1 m | bâtiment ERP / exigence feu → version FE / T3 | « 2e couche Sopralène Flam 180 AR (8 m²) » |
| `protection` | autoprotégée | « gravillons » → gravillons 4 cm ; « dalles », « plots », « accessible » → dalles sur plots 50 × 50 | « Finition autoprotégée » |
| `isolant` | aucun si non mentionné | épaisseur ou R cité → Efigreen Alu + (autoprotégé) ou Duo + (protection lourde), même épaisseur | « Pas d'isolant (non prévu au devis) » |
| `pare_vapeur` | si isolant : oui | bac acier local non chauffé → non | « Pare-vapeur bitume » |
| `h_releve` | 0,15 m + épaisseur protection | gravillons : + 0,04 ; dalles sur plots : + hauteur plot (défaut 0,08, à vérifier) | « Relevés 15 cm au-dessus de la protection » |
| `talon_releve` | 0,15 m | — | « Talon 15 cm » |
| `recouv_transv_bitume` | 0,10 m | — | non affiché |
| `conso_EIF` | 0,30 L/m² | bois 0,28 ; métal 0,18 | « Primaire 0,30 L/m² » |
| `zone_vent` | depuis le département (`commun/departements.json`) | site exposé si littoral | « Zone vent 3, site exposé » |
| `hauteur_batiment` | < 20 m | type collectif R+6 et plus → ≥ 20 m, calcul de fixation à faire valider | non affiché sauf ≥ 20 m |
| `perimetre` | 4 × √S (forme carrée) | devis donne P → P | « Périmètre estimé 40 ml » |
| `longueur_barre_couvertine` | 3 m (à vérifier) | référence citée | « Couvertine en barres de 3 m » |
| `densite_gravillons` | 1,6 t/m³ (à vérifier) | — | non affiché |

```json
{
  "protection": {
    "valeur": "autoprotegee",
    "variations": [
      { "si": { "devis.contient": ["gravillon", "gravier"] }, "valeur": "gravillons" },
      { "si": { "devis.contient": ["dalle", "plot", "accessible"] }, "valeur": "dalles_plots" }
    ],
    "afficher": "Finition {valeur}"
  },
  "densite_fixation_courante": {
    "valeur": 5,
    "variations": [
      { "si": { "geographie.zone_vent": ">=3" }, "valeur": 6 },
      { "si": { "geographie.zone_vent": ">=3", "geographie.site": "expose" }, "valeur": 8 },
      { "si": { "protection": "gravillons" }, "valeur": "1_par_panneau" }
    ],
    "afficher": "{valeur} fixations/m² en partie courante"
  },
  "perte_bitume_courante_pct": {
    "valeur": 5,
    "variations": [ { "si": { "chantier.surface_m2": "<30" }, "valeur": 8 } ],
    "afficher": "Pertes membrane {valeur} %"
  }
}
```

Hypothèse jamais cachée : si le devis ne donne pas P (longueur de relevés), le moteur l'estime à 4 × √S et l'écrit en orange, car c'est le poste qui fait le plus varier le nombre de rouleaux de 2e couche.

## 7. Questions à poser

Quatre questions principales, toutes à boutons, posées seulement si le devis ne répond pas ; jamais une quantité. Deux questions conditionnelles s'ajoutent en cas de doute, conformément à la décision « dans le moindre doute l'IA pose la question, classée par levier ». La sensibilité = écart maximal sur le total commandé (en valeur) si la réponse par défaut est fausse, estimé sur le cas de test etanch-001 (à recalculer par Claude Code sur les tests réels).

| Priorité | Id | Question affichée | Boutons | Défaut | Sensibilité | Posée si |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | `systeme` | « Étanchéité en ? » | Bitume (soudé) · PVC · EPDM (caoutchouc) · Résine liquide | Bitume | 100 % | aucun matériau ni marque reconnu dans le devis |
| 1 | `support` | « Posée sur ? » | Béton · Bac acier · Bois / OSB · Ancienne étanchéité | Béton | 30 % | support non nommé |
| 2 | `protection` | « Le dessus, c'est ? » | Rien (finition ardoisée) · Gravillons · Dalles sur plots · Terrasse végétale | Rien | 40 % | protection non nommée |
| 3 | `releves` | « Il y a des murets autour ? » | Tout autour · 3 côtés · 1-2 côtés · Aucun | Tout autour | 20 % | ml de relevés absents du devis |
| 4 (cond.) | `isolant_ep` | « Épaisseur d'isolant ? » | 80 mm · 100 mm · 120 mm · 140 mm · Pas d'isolant | 120 mm | 25 % | « isolation » citée sans épaisseur ni R |
| 5 (cond.) | `ancienne` | « On garde l'ancienne étanchéité ? » | Oui, on recouvre · Non, on arrache | Oui | 15 % | « réfection » sans précision |

Le bouton « Tout autour » de la question 3 donne P = périmètre estimé (4 × √S) ; « 3 côtés » = 0,75 × ; « 1-2 côtés » = 0,4 × ; « Aucun » = 0 et déclenche à la place des profils de rive (même ml, en barres).

```json
[
  {
    "id": "systeme",
    "ouvrages": ["etanch_*"],
    "priorite": 0,
    "si_inconnu": "systeme",
    "texte": "Étanchéité en ?",
    "boutons": [
      { "label": "Bitume (soudé)", "valeur": "bitume_bicouche" },
      { "label": "PVC", "valeur": "pvc" },
      { "label": "EPDM (caoutchouc)", "valeur": "epdm" },
      { "label": "Résine liquide", "valeur": "sel" }
    ],
    "defaut": "bitume_bicouche",
    "sensibilite_pct": 100
  },
  {
    "id": "protection",
    "ouvrages": ["etanch_*"],
    "priorite": 2,
    "si_inconnu": "protection",
    "texte": "Le dessus, c'est ?",
    "boutons": [
      { "label": "Rien (finition ardoisée)", "valeur": "autoprotegee" },
      { "label": "Gravillons", "valeur": "gravillons" },
      { "label": "Dalles sur plots", "valeur": "dalles_plots" },
      { "label": "Terrasse végétale", "valeur": "vegetalisee" }
    ],
    "defaut": "autoprotegee",
    "sensibilite_pct": 40
  }
]
```

Questions interdites : « combien de m² ? », « combien de rouleaux ? », « quelle longueur d'acrotère ? ». Si S manque dans le devis, le moteur s'arrête et demande une photo du croquis ou du plan (entrée facultative « ajouter des informations sur le chantier »), jamais un chiffre.

## 8. Matériaux dominants par région

Contrairement à la couverture, l'étanchéité est quasi nationale : le bitume SBS bicouche domine partout. La région agit surtout sur le **vent** (fixations, lestage) et l'**altitude** (autre DTU) ; le choix de marque relève plus du négoce local que du climat.

| Zone (`commun/departements.json`) | Système dominant | Ce qui change dans le quantitatif | Statut |
| --- | --- | --- | --- |
| Toutes régions, plaine | Bitume SBS bicouche soudé (Soprema, Siplast), autoprotégé en maison, gravillons ou dalles en collectif | Défauts de la section 6 | Bitume dominant : à vérifier par 2-3 négoces |
| Littoral (Bretagne, Manche, Atlantique, Méditerranée) | Bitume bicouche ; PVC fixé méca sur grands bâtiments | Zone vent 3-4 site exposé → densités de fixation hautes (tableau 5.1) ; gravillons : dallettes en périphérie sur 2 m | \[sourcé\] densités ; dallettes : avis technique Ravago |
| Montagne (> 900 m) | Bitume bicouche sous protection lourde | Hors DTU 43.1 (plaine) : DTU 43.11 ; relevés 0,50 m sans porte-neige, 0,20 m avec ; l'app affiche « montagne : référentiel à compléter » et bloque l'export | Hauteurs \[sourcé\] DTU 43.1 ; reste à vérifier |
| Grandes agglomérations (collectif, tertiaire) | Bitume ou PVC sous protection ; toitures végétalisées en hausse | Plus de dalles sur plots et de végétalisé ; bâtiments ≥ 20 m → calcul de fixation | à vérifier |
| Zones d'activité (industriel, entrepôts) | Bac acier + PIR ou laine de roche + PVC/TPO fixé méca ou bitume monocouche | Pare-vapeur, fixations en boîtes, grands rouleaux PVC | à vérifier |
| Maison individuelle, extension, garage (partout) | EPDM collé ou bitume autoprotégé ; résine (SEL) sur balcons et loggias | Bâche EPDM sur mesure < 150 m² ; colle en seaux | \[sourcé\] limite 150 m² RubberCover |
| DOM | — | Hors périmètre (DTU métropole) ; l'app le dit | \[sourcé\] guide Bacacier |

Préférence de marque Soprema / Siplast par région : **\[à vérifier\]**, à apprendre artisan par artisan (niveau « artisan » de la surcharge) plutôt qu'à figer dans le référentiel.

## 9. Points singuliers et consommables

Tout ce qui se commande à la pièce. Le moteur compte les points singuliers dans le devis ; s'ils n'y sont pas, il applique le minimum réglementaire (2 évacuations) et le signale, sans poser de question.

| Point singulier | Ce qui se commande | Règle de quantité | Statut |
| --- | --- | --- | --- |
| Entrée d'eau pluviale (EEP) | 1 EEP (platine à souder bitume, PVC ou EPDM selon système) du Ø de la descente + 1 crapaudine | N\_EEP du devis ; sinon 2 ; contrôle : section totale ≥ 1 cm²/m² | \[sourcé\] DTU 43.1 |
| Trop-plein / gargouille | 1 trop-plein (platine latérale) | 1 si une seule EEP ; posé 0,10 m au-dessus des gravillons | \[sourcé\] fiche points singuliers, DTU 43.1 |
| Pied de relevé | Équerre de renfort 0,25 m dév. | P × 0,25 m² (déjà dans la formule 5.2) | \[sourcé\] DTU 43.1 |
| Tête de relevé (mur) | Bande de solin alu en barres + mastic + fixations | barres = P ÷ longueur barre ; fixations ≥ 3/ml ; recouvrement étanchéité / métal 0,10 m | 3/ml et 0,10 m \[sourcé\] DTU 43.1 ; barre à vérifier |
| Acrotère | Couvertine alu + éclisses + angles + embouts | barres = P ÷ 3 m ; 1 éclisse par jonction ; 1 angle par angle sortant | à vérifier (longueurs négoce) |
| Rive sans acrotère | Profil de rive (bande de rive) en barres | ml de rive ÷ longueur barre | à vérifier |
| Ventilation, tuyau traversant | 1 manchon / platine (bitume) ou pipe flashing (EPDM, boîte de 10) | 1 par traversée citée | boîte de 10 \[sourcé\] RubberCover |
| Lanterneau, exutoire, costière | Relevé sur costière (dans P) + équerre | ajouter le périmètre de chaque costière à P | à vérifier |
| Joint de dilatation | Costière + soufflet / bande de joint | ml du devis | à vérifier |
| Seuil de porte-fenêtre | Relevé 0,10 m mini au-dessus de la protection | dans P | \[sourcé\] DTU 43.1 |
| Fixation périphérique PVC | Rail Flagorail (barre 3 m) + Flagofil | barres = P ÷ 3 | rail 3 m \[sourcé\] DTA Flagon |

**Consommables** (`materiaux.json`, famille « consommable ») :

| Consommable | Unité de commande | Ratio | Statut |
| --- | --- | --- | --- |
| Gaz propane | bouteille 13 kg ou 35 kg | 0,15 kg par m² de couche soudée (S × nb\_couches + S\_rel) | à vérifier |
| Mastic PU (tête de solin, couvertines) | cartouche 300 ml | 1 cartouche pour 8 ml de joint | à vérifier |
| Chevilles / vis de solin | boîte de 100 | 3 par ml de solin | \[sourcé\] 3/ml |
| Clous à tête large (sous-couche clouée sur bois) | paquet 5 kg | 5 clous par m en quinconce le long des lés | \[sourcé\] guide Soprema |
| Vis + plaquettes d'isolant | boîte (100 ou 250, à vérifier) | formule 5.2 | densités \[sourcé\] |
| Non-tissé de séparation (gravillons fins < 10 mm) | rouleau | S × 1,10 (recouvrement 15 cm) | recouvrement \[sourcé\] Ravago ; rouleau à vérifier |
| Bande QuickSeam + primaire QuickPrime (EPDM) | rouleau / bidon | 20 ml de bande par litre de primaire | \[sourcé\] RubberCover |

Ligne toujours ajoutée en fin de quantitatif pour un chantier bitume : « Gaz propane — X bouteille(s) 35 kg », modifiable, car c'est l'oubli le plus fréquent (à vérifier avec un étancheur).

## 10. Cas de test (`tests/`)

Quatre cas synthétiques, calculés à la main avec les formules 5.2 et les défauts de la section 6. Ils servent de garde-fou au code ; ils seront remplacés par des devis réels anonymisés dès qu'un étancheur en fournit (section 13). Règle d'implémentation fixée par ces tests : **les relevés sont toujours comptés dans la référence autoprotégée**, même quand la 2e couche courante est lisse (sous gravillons).

**etanch-001 — maison, terrasse béton autoprotégée, sans isolant.** S = 48 m², P = 28 ml. Couche 1 : 48 × 1,05 / 9,31 = 5,4 → 6. Couche 2 + relevés : (50,4 + 28 × 0,30 × 1,166) / 7,43 = 8,1 → 9. Équerre : 28 × 0,25 × 1,166 / 9,31 → 1. EIF : (48 + 8,4 + 7) × 0,30 = 19 L.

```json
{
  "id": "etanch-001",
  "source": "synthétique, à remplacer par un devis réel",
  "devis_pdf": null,
  "contexte": { "departement": "22", "littoral": true, "support": "beton", "systeme": "bitume_bicouche", "protection": "autoprotegee", "surface_m2": 48, "releves_ml": 28, "isolant": null, "eep": 1, "trop_plein": 1 },
  "attendu": [
    { "article": "Elastophène Flam 25 10x1", "quantite": 7, "unite": "rouleau", "tolerance_pct": 0, "detail": "6 couche 1 + 1 équerres" },
    { "article": "Sopralène Flam 180 AR 8x1", "quantite": 9, "unite": "rouleau", "tolerance_pct": 0 },
    { "article": "Aquadère 25 L", "quantite": 1, "unite": "bidon", "tolerance_pct": 0 },
    { "article": "EEP à souder Ø100 + crapaudine", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "Trop-plein à souder", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "Bande de solin alu 3 m", "quantite": 10, "unite": "barre", "tolerance_pct": 0 },
    { "article": "Mastic PU 300 ml", "quantite": 4, "unite": "cartouche", "tolerance_pct": 25 },
    { "article": "Vis + chevilles solin", "quantite": 1, "unite": "boîte 100", "tolerance_pct": 0 },
    { "article": "Propane", "quantite": 1, "unite": "bouteille 35 kg", "tolerance_pct": 0 }
  ],
  "questions_max": 0
}
```

**etanch-002 — collectif, béton, PIR 120 mm, gravillons.** S = 320 m², P = 72 ml, 2 EEP Ø100 au devis. Relevés : 72 × (0,15 + 0,04 + 0,15) = 24,5 m². Isolant : 320 × 1,03 / 0,36 = 916 panneaux → 115 colis de 8. Pare-vapeur Sopravap Stick Alu S16 (utile 1,02 × 13,9 = 14,18 m²) : (320 + 72 × 0,22) × 1,05 / 14,18 → 25. Gravillons : 320 × 0,04 × 1,6 = 20,5 t. Le moteur doit **alerter** : 2 × 78,5 cm² = 157 cm² < 320 cm² requis, sans modifier le nombre d'EEP.

```json
{
  "id": "etanch-002",
  "source": "synthétique",
  "contexte": { "departement": "35", "support": "beton", "systeme": "bitume_bicouche", "protection": "gravillons", "surface_m2": 320, "releves_ml": 72, "isolant": { "produit": "Efigreen Duo+", "ep_mm": 120 }, "eep": 2, "eep_diametre_mm": 100 },
  "attendu": [
    { "article": "Elastophène Flam 25 10x1", "quantite": 77, "unite": "rouleau", "tolerance_pct": 2, "detail": "37 couche 1 + 37 couche 2 lisse + 3 équerres" },
    { "article": "Sopralène Flam 180 AR 8x1", "quantite": 4, "unite": "rouleau", "tolerance_pct": 0, "detail": "relevés" },
    { "article": "Sopravap Stick Alu S16 14x1,08", "quantite": 25, "unite": "rouleau", "tolerance_pct": 4 },
    { "article": "Efigreen Duo+ 120 mm 600x600", "quantite": 115, "unite": "colis de 8", "tolerance_pct": 1 },
    { "article": "EIF 25 L + 5 L", "quantite": 110, "unite": "L (4 x 25 L + 2 x 5 L)", "tolerance_pct": 5 },
    { "article": "Gravillons roulés 10/20", "quantite": 21, "unite": "big-bag 1 t", "tolerance_pct": 5 },
    { "article": "Couvertine alu 3 m", "quantite": 25, "unite": "barre", "tolerance_pct": 0 },
    { "article": "Propane", "quantite": 3, "unite": "bouteille 35 kg", "tolerance_pct": 0 }
  ],
  "alertes_attendues": ["section_eep_insuffisante"],
  "questions_max": 0
}
```

**etanch-003 — bâtiment d'activité, bac acier, PIR XL 120 mm, autoprotégé, zone vent 2, site normal, fermé, h < 20 m.** Rectangle 30 × 20 m (S = 600 m², périmètre 100 m), relevés 100 ml. Fixations : 400 m² × 5 + 184 m² × 6 + 16 m² × 10 = 3 264 → × 1,05 = 3 427 → 14 boîtes de 250. Isolant : 600 × 1,03 / 1,2 = 515 panneaux → 172 colis de 3. Pas d'EIF en partie courante (métal), EIF métal sur relevés : 55 m² × 0,18 = 10 L.

```json
{
  "id": "etanch-003",
  "source": "synthétique",
  "contexte": { "departement": "49", "support": "bac_acier", "systeme": "bitume_bicouche", "protection": "autoprotegee", "surface_m2": 600, "perimetre_ml": 100, "releves_ml": 100, "isolant": { "produit": "Efigreen Alu+ XL 1200x1000", "ep_mm": 120 }, "zone_vent": 2, "site": "normal", "batiment": "ferme", "hauteur_m": 9 },
  "attendu": [
    { "article": "Elastophène Flam 25 10x1", "quantite": 72, "unite": "rouleau", "tolerance_pct": 2 },
    { "article": "Sopralène Flam 180 AR 8x1", "quantite": 90, "unite": "rouleau", "tolerance_pct": 2 },
    { "article": "Sopravap Stick Alu S16 14x1,08", "quantite": 47, "unite": "rouleau", "tolerance_pct": 4 },
    { "article": "Efigreen Alu+ XL 120 mm 1200x1000", "quantite": 172, "unite": "colis de 3", "tolerance_pct": 1 },
    { "article": "Vis isolant + plaquette (longueur selon ép.)", "quantite": 14, "unite": "boîte 250", "tolerance_pct": 8 },
    { "article": "Aquadère 5 L", "quantite": 2, "unite": "bidon", "tolerance_pct": 0 },
    { "article": "Propane", "quantite": 6, "unite": "bouteille 35 kg", "tolerance_pct": 20 }
  ],
  "questions_max": 0
}
```

**etanch-004 — garage, EPDM collé.** 6 × 4 m (S = 24 m²), relevés 15 cm tout autour (P = 20 ml) ; le devis dit seulement « membrane EPDM ». Bâche : (6 + 0,50) × (4 + 0,50) = 6,50 × 4,50 m. Colle : (24 + 6) / 2,5 = 12 L → 2 seaux.

```json
{
  "id": "etanch-004",
  "source": "synthétique",
  "contexte": { "departement": "44", "support": "bois", "systeme": "epdm", "protection": "autoprotegee", "longueur_m": 6, "largeur_m": 4, "releves_ml": 20, "eep": 1, "trop_plein": 1 },
  "attendu": [
    { "article": "Bâche EPDM 1,14 mm 6,50 x 4,50 m", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "Colle Bonding Adhesive BA-2012 10 L", "quantite": 2, "unite": "seau", "tolerance_pct": 0 },
    { "article": "EEP EPDM + crapaudine", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "Trop-plein EPDM", "quantite": 1, "unite": "u", "tolerance_pct": 0 }
  ],
  "questions_max": 1,
  "question_attendue": "support"
}
```

Critère de réussite pour Claude Code : quantités dans la tolérance, aucune ligne en m² ni ml, alertes présentes, nombre de questions ≤ `questions_max`.

## 11. Ratios à faire valider par un étancheur

Quinze valeurs à faire relire, classées par impact sur le total commandé. Une case cochée = validée par un étancheur nommé dans le CHANGELOG ; tant qu'il reste une case de priorité haute, `maturite` reste `beta`.

- [ ] **Haute** — Recouvrement transversal (abouts) bitume : 10 cm retenus, 6 cm normatifs. Lequel pratiquez-vous ?
- [ ] **Haute** — Développé de relevé par défaut : 0,15 + protection + talon 0,15 m. Talon 10 ou 15 cm ?
- [ ] **Haute** — Relevés bicouche : équerre 0,25 m + une couche autoprotégée, ou deux couches complètes en relevé ?
- [ ] **Haute** — Pertes membrane : 5 % courant, 8 % sous 30 m², 10 % relevés.
- [ ] **Haute** — Longueur de rouleau la plus commandée : Elastophène 25 en 10 m ou 7 m ; Sopralène 180 AR en 6 m ou 8 m ; Elastophène 25 AR en 6 m ou 10 m.
- [ ] **Haute** — Isolant sur béton sous autoprotégé : collé (EAC, colle à froid) ou fixé ? Quel produit et quelle consommation ?
- [ ] **Moyenne** — Gaz : 0,15 kg de propane par m² soudé.
- [ ] **Moyenne** — Gravillons : densité 1,6 t/m³, livraison en big-bag d'1 t ou en vrac ?
- [ ] **Moyenne** — Vis d'isolant : conditionnement (boîtes de 100, 200, 250 ?) et longueur = épaisseur isolant + combien ?
- [ ] **Moyenne** — 1re couche sur PIR (Efigreen Alu +) : soudée directement, autoadhésive ou fixée ? Le quantitatif change (vis de membrane).
- [ ] **Moyenne** — Couvertines et bandes de solin : longueur de barre courante au négoce (2 m, 3 m ?) et accessoires vendus à part.
- [ ] **Moyenne** — Hauteur moyenne des plots pour dalles (défaut 8 cm).
- [ ] **Basse** — Mastic : 1 cartouche pour 8 ml.
- [ ] **Basse** — Périmètre estimé 4 × √S quand le devis ne donne pas les relevés.
- [ ] **Basse** — Consommation résine SEL en partie courante (balcons) : à transcrire d'un DTA Alsan, Sikalastic ou Kemper.

Format de la relecture : l'étancheur répond « oui / non + sa valeur » ligne par ligne ; Claude met à jour les sections 5 et 6 et ajoute une ligne au CHANGELOG.

## 12. Sources

Pages ouvertes ou lues le 3 octobre 2026. Les textes DTU complets sont payants (AFNOR / CSTB Reef) : les valeurs normatives ci-dessus viennent d'extraits publics et de guides fabricants qui les citent ; à recouper sur le texte officiel avant passage en `stable`.

**Normes et textes de référence**

| Texte | Utilisé pour | Lien |
| --- | --- | --- |
| NF DTU 43.3 (bac acier), extrait | Recouvrement 6 cm, relevés par 1 m, 15 cm au-dessus de la protection | [gipah.fr](https://gipah.fr/gallery/DTU%2043.3%20E%CC%81tanche%CC%81ite%CC%81.pdf) |
| NF DTU 43.3, extrait | 700 / 350 m² par EEP, gravillons 4 cm | [notech.franceserv.com](https://notech.franceserv.com/dtu43-3.pdf) |
| NF DTU 43.1, extrait | Équerre 0,25 m, 3 fixations/ml en tête, recouvrement métal 0,10 m, acrotère 0,50 m, montagne | [scribd (P 84-204-1)](https://fr.scribd.com/document/726249473/dtu-43-1-p84-204-1-norme-francaise-NF-P-84-204-1) |
| NF DTU 43.1, synthèse Batirama | Domaine (pente ≤ 5 %), 2 EEP ou 1 + trop-plein | [batirama.com](https://www.batirama.com/article/26679-dtu-43.1-etancheite-des-toitures-avec-elements-porteurs-en-climat-de-plaine.html) |
| NF DTU 43.4, synthèse Batirama | Recouvrements bois (6 cm / 10 cm) | [batirama.com](https://www.batirama.com/article/2272-nf-dtu-43.4-toitures-en-elements-porteurs-bois-et-derives-avec-revetements-d-etancheite.html) |
| Guide Bacacier « Les supports d'étanchéité » (2017) | Tableau des densités de fixation, 1 fixation/panneau sous protection lourde, pente 3 % | [btscm.fr](https://btscm.fr/dicocm/C/costieres/Bacacier-Support-Etancheite.pdf) |
| Fiche « Points singuliers des terrasses » | 1 cm²/m², trop-plein 0,10 m au-dessus des gravillons | [ctfassets (PDF)](https://assets.ctfassets.net/h1lj96ycs4pf/3ww8vqc9s9dmSTpGKhlUaI/8705468a9423a7b48ac42e806f5ad2c1/Points_singuliers_des_terrasses.pdf) |
| Prescription Soprema terrasse gravillons | Gravillons 4 cm, granularité 5 mm à 2/3 | [lotus.soprema.fr](<https://lotus.soprema.fr/www/reftechsop.nsf/($AllByUNID)/6DE2A28C160F4A89C1257EA50032F37D/$File/A13-Terrasse-non-circulable-gravillons-sur-beton-sans-isolant-avec-retenue-temporaire-des-eaux-pluviales.doc>) |

**Fiches fabricant et négoce**

| Produit | Lien |
| --- | --- |
| Elastophène Flam 25 (10 × 1 / 7 × 1) | [Gedimat (fiche Soprema)](https://uploads.gedimat.fr/DOCUMENT/TYPE1/2013125573329.pdf) · [Point.P 3272643](https://www.pointp.fr/p/couverture/etancheite-bitumeuse-elastophene-flam-25-confort-soprema-rouleau-A3272643) |
| Elastophène Flam S 25 | [CBA Matériaux](https://www.cba-materiaux.fr/p/toiture-charpente/elastophene-flam-s-25-rouleau-de-7x1-00m-A6176368) |
| Elastophène Flam 25 AR | [Samse (WPBFR206)](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1161548.pdf) · [SFIC](https://www.sfic.com/p/etancheite/elastophene-flam-25-ard-gris-rouleau-de-6x1m-98158-A3272649) · [Gedimat AR FR](https://uploads.gedimat.fr/DOCUMENT/TYPE1/2013125574500.pdf) |
| Sopralène Flam 180 / 180 AR / S 180-35 | [Samse 180 AR](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_908790.pdf) · [Gedimat 180 AR 8 m](https://uploads.gedimat.fr/DOCUMENT/TYPE1/2013125573381.pdf) · [soprema.fr sans galon](https://www.soprema.fr/produits-et-systemes/sopralene-flam-180-ar-sans-galon) · [Samse S 180-35](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1012379.pdf) |
| Siplast Paradiène (gamme) | [Ciffréo Bona](https://www.ciffreobona.fr/userfiles/file/PDF/5/139/448/8485/paradiene.pdf) · [Denis Matériaux](https://media.denismateriaux.com/media/890405_gamme-paradiene-notic.pdf) |
| Aquadère, Élastocol 600, Alsan Flashing, plots, Sopravap Stick | [Aquadère (ManoMano)](https://cdn.manomano.com/files/pdf/6096111.pdf) · [Union Matériaux](https://www.union-materiaux.fr/boutique/673113-aquadere-bidon-de-25-litres) · [Guide Soprema autoadhésifs (Samse)](https://medias.groupe-samse.fr/Notice_de_pose/Notice_de_pose_54982.pdf) |
| Efigreen Duo + / Alu + / Alu + XL | [soprema.fr](https://www.soprema.fr/produits-et-systemes/efigreen-duo-/-efigreen-duo-xl) · [ID France Matériaux 120 mm](https://www.idfmateriaux.paris/efigreen-duo-120mm-c2x33393329) · [Airisol](https://www.airisol.fr/produit/efigreen-alu) · [Négoce Matériaux Aquitain XL](https://www.negoce-materiaux-aquitain.com/fr/construction-materiaux/1357-efigreen-alu-xl-1200-x1000-x140-mm.html) |
| Flagon SV / SR (PVC) | [Tanguy (WPSIT0056)](https://www.tanguy.fr/media/870921/1/0/1/224744_tds-wpsit0056-1-fr-fr) · [Samse Flagon SR](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1409157.pdf) · [Quéguiner](https://www.queguiner.fr/toiture/couverture/etancheite/etancheite-synthetique/membranes-detancheite-synthetique-pvc-flagon-2) · [DTA CSTB 5.2/17-2583](https://www.cstb.fr/pdf/atec/GS05-F/AF2172583_V2.pdf) |
| EPDM RubberCover / RubberGard | [Catalogue RubberCover](https://www.epdmsolutions.fr/wp-content/uploads/2023/05/catalogue-rubbercover-epdmsolutions.pdf) · [Catalogue RubberGard](https://www.egide-systemes.com/wp-content/uploads/2021/11/catalogue-rg.pdf) |
| Gravillons et dallettes de périphérie | [Ravago](https://ravagobuildingsolutions.com/fr/fr/application/non-accessibles-avec-gravillons/) |

## 13. Plan de complétion

Le tiroir est utilisable en `beta` pour le bitume bicouche sur béton et sur bac acier, et pour l'EPDM collé. Reste à faire, par ordre d'impact :

1. **Faire relire la section 11 par un étancheur** (1 h au téléphone suffit) et récupérer 3 devis réels anonymisés avec la facture négoce correspondante → remplacer les tests synthétiques.
2. **Conditionnements négoce** : palettes, longueurs de couvertines et bandes de solin, boîtes de vis, contenance des big-bags ; à lire sur Point.P, Tanguy, Samse, Chausson pour les mêmes références.
3. **Pare-vapeur bitume soudable** (Elastovap, Paravap) et **colle d'isolant sur béton** : fiches à transcrire (aujourd'hui seul le pare-vapeur autoadhésif est sourcé).
4. **TPO/FPO, laine de roche, PSE, verre cellulaire** : une ligne par produit leader (Ultraply, Rockacier, Foamglas).
5. **Résine SEL** (balcons, loggias) : consommations partie courante d'un DTA (Alsan, Sikalastic, Kemper).
6. **Végétalisé** : drainage, filtre, substrat (Règles professionnelles toitures végétalisées).
7. **Montagne** (DTU 43.11) et bâtiments ≥ 20 m : laisser bloqués avec message « à faire valider » tant que non sourcés.
8. **Recouper chaque valeur \[sourcé\] DTU sur le texte officiel** (CSTB Reef ou AFNOR) avant `stable`.

## 14. CHANGELOG

| Date | Version | Changement | Par |
| --- | --- | --- | --- |
| 2026-10-03 | 0.1.0 | Création du tiroir étanchéité au format section 27 : 14 chapitres, 10 ouvrages, fiches Soprema / Siplast / Firestone sourcées, tableau des densités de fixation, 4 cas de test, 15 ratios à valider | Claude, pour Greg |
