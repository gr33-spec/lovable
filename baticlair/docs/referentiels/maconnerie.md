# Référentiel quantitatif MAÇONNERIE (Rappidos)

Oct 3, 2026 · @Greg

## 1. Métier et axes de variation

Le tiroir `maconnerie` couvre le gros œuvre de la maison individuelle et du petit collectif : fondations, murs en petits éléments, chaînages, linteaux, planchers poutrelles-hourdis, dallages, enduits, petite maçonnerie. La géographie et le neuf/rénovation pèsent fort : brique au Nord et dans le Sud-Ouest, parpaing ailleurs, pierre en rénovation, chaînages renforcés en zone sismique.

### 1.1 Fiche d'identité `metier.json`

```json
{
  "code": "maconnerie",
  "nom": "Maçonnerie - gros œuvre",
  "version": "1.0.0",
  "normes": ["NF DTU 20.1", "NF DTU 13.11", "NF DTU 13.3", "NF DTU 21", "NF DTU 23.1", "NF DTU 26.1", "NF DTU 26.2", "NF EN 1998-1 (Eurocode 8)", "Règles PS-MI 89 rév. 92"],
  "axes_de_variation": {
    "geographie": "fort",
    "epoque_bati": "moyen",
    "type_batiment": "moyen",
    "neuf_renovation": "fort",
    "gamme": "faible"
  },
  "metiers_lies": ["couverture", "charpente", "isolation", "platrerie", "vrd"],
  "unites_de_commande": ["u", "palette", "sac", "big-bag", "t", "m3", "barre", "panneau", "rouleau", "seau", "ml"],
  "maturite": "alpha"
}
```

### 1.2 Poids de chaque axe

| Axe | Poids | Ce qu'il change dans le quantitatif | Exemple |
| --- | --- | --- | --- |
| geographie | fort | le bloc par défaut (parpaing, brique, béton cellulaire, pierre), la zone sismique (chaînages, armatures), la zone de gel (profondeur des fondations), le granulat local | Nord : brique rouge ; Bretagne : parpaing ; zone sismique 3-4 : chaînages verticaux à chaque angle et tous les 5 m environ |
| neuf\_renovation | fort | dépose, reprises, ouvertures dans mur porteur (IPN, étais), petites quantités en sacs plutôt qu'en vrac ou toupie | réno : béton en sacs prêts à l'emploi ; neuf : toupie BPE en m³ |
| epoque\_bati | moyen | nature des murs existants en réno (pierre, brique pleine, mâchefer, parpaing), mortier de chaux obligatoire sur bâti ancien | avant 1948 : chaux hydraulique naturelle, jamais de ciment sur pierre |
| type\_batiment | moyen | épaisseur des murs, planchers, résistance au feu, R+1 ou plus | garage ou annexe : bloc de 15 ; habitation : bloc de 20 |
| gamme | faible | change le produit (bloc isolant, monomur, rectifié à coller), pas la méthode | brique rectifiée à joint mince : mortier-colle en sacs au lieu de mortier en vrac |

Axes déduits sans question : adresse → département → zone sismique, zone de gel, bloc dominant ; profil artisan → neuf ou réno par défaut. Le reste se demande (chapitre 7).

## 2. Règle d'or et unités de commande

La règle d'or est la même que pour la couverture : l'app ne sort jamais un m² ni un m³ « théorique » sans le traduire en ce que le négoce livre. Un mur de 40 m² devient des blocs à l'unité arrondis à la palette, des sacs de ciment, des tonnes ou big-bags de sable, des barres d'acier et des panneaux de treillis.

### 2.1 Chaîne de calcul

1. Métré du devis (m², ml, m³) → quantité théorique de matériau (u, kg, L).
2. Application de la perte (chapitre 5).
3. Conversion en unité de commande (tableau 2.2) et arrondi au conditionnement supérieur.
4. Affichage des trois quantités : théorique, avec perte, commandée.

### 2.2 Unités de commande

| Matériau | Calcul interne | Unité de commande | Arrondi |
| --- | --- | --- | --- |
| Blocs béton, briques, béton cellulaire | u | u, arrondi à la palette entière si > 1/2 palette | palette (60 à 120 u selon format) |
| Ciment, chaux | kg | sac 25 ou 35 kg | sac |
| Mortier, béton, enduit prêts à l'emploi | kg | sac 25, 30 ou 35 kg | sac |
| Sable, gravier | kg ou m³ | sac 35 kg (< 0,5 t), big-bag ≈ 1 t, ou vrac en tonnes | big-bag ou 0,5 t |
| Béton prêt à l'emploi (BPE, toupie) | m³ | m³, au 0,5 m³ | 0,5 m³, minimum 1 m³ (à vérifier selon centrale) |
| Acier HA (fers à béton) | kg ou ml | barre de 6 m, ou botte | barre |
| Armatures façonnées (chaînages) | ml | élément de 6 m (3 m pour linteaux) | élément |
| Treillis soudé | m² | panneau (2,40 × 4,00 m ou 2,40 × 6,00 m) | panneau |
| Poutrelles | ml | u à la longueur exacte (au 10 cm) | u |
| Entrevous (hourdis) | m² | u, arrondi à la palette | palette |
| Linteaux préfabriqués | ml | u à la longueur commerciale supérieure | u |
| Coffrages (planches, polystyrène) | ml ou m² | u, botte, plaque | u |
| Film polyane, géotextile | m² | rouleau | rouleau |
| Hydrofuge, adjuvants, primaire | L | bidon, seau | bidon |
| Accessoires (étais, chaises, cales, attaches) | u | u ou sachet | sachet |

Interdits en sortie : « 40 m² de parpaings », « 3 m³ de mortier », « 120 kg d'acier » sans nombre de barres.

## 3. Ouvrages du métier, vocabulaire des devis, pièges

Quatorze ouvrages couvrent l'essentiel des devis de maçon en maison individuelle. Chaque ouvrage devient une entrée de `ouvrages.json` et une entrée de `vocabulaire.json` ; une expression inconnue déclenche une question, jamais une supposition.

| Code ouvrage | Ouvrage | Unité du devis | Expressions courantes | Pièges |
| --- | --- | --- | --- | --- |
| `fouille_terrassement` | Fouilles en rigole / en pleine masse | m³ | « fouilles en rigole », « terrassement », « décapage terre végétale », « évacuation des terres » | hors matériaux sauf évacuation (benne) ; ne rien commander |
| `beton_proprete` | Béton de propreté | m² ou m³ | « béton de propreté », « BP 5 cm », « béton maigre » | épaisseur 5 cm par défaut si non donnée |
| `semelle_filante` | Fondations, semelles filantes ou isolées | ml ou m³ | « semelle filante 50×25 », « fondations BA », « semelle isolée », « rigole bétonnée » | « 50×25 » = largeur × hauteur en cm ; une semelle en m³ sans section → question |
| `soubassement` | Soubassement, vide sanitaire | m² ou ml | « murs de soubassement », « VS », « vide sanitaire », « bloc à bancher » | souvent en blocs à bancher remplis de béton : 2 lignes (blocs + béton de remplissage) |
| `mur_blocs_beton` | Mur en blocs béton (parpaing) | m² | « parpaing de 20 », « agglo 20×20×50 », « bloc creux B40 », « mur porteur en parpaings » | « agglo » = bloc béton (Bretagne, Ouest) ; « de 20 » = épaisseur 20 cm |
| `mur_brique` | Mur en brique terre cuite | m² | « brique de 20 », « Monomur 30 », « brique rectifiée », « Porotherm », « Bio'bric », « brique R20 », « brique pleine » | rectifiée = joint mince (mortier-colle) ; « brique de parement » = autre ouvrage (parement) |
| `mur_beton_cellulaire` | Mur en béton cellulaire | m² | « Siporex », « Ytong », « Cellumat », « béton cellulaire 25 » | toujours collé au mortier-colle spécifique ; marques = même ouvrage |
| `mur_pierre` | Maçonnerie de pierre, moellons | m² ou m³ | « mur en moellons », « pierres de pays », « reprise de maçonnerie pierre », « rejointoiement » | volume de mortier très supérieur (chapitre 5) ; chaux obligatoire |
| `chainage` | Chaînages horizontaux et verticaux | ml | « chaînage », « ceinture béton », « raidisseur », « poteau BA », « chaînage d'angle » | souvent non chiffré à part : le moteur le déduit du mur (chapitre 5.6) et l'affiche en hypothèse |
| `linteau` | Linteaux | u ou ml | « linteau BA », « linteau préfabriqué », « IPN », « reprise en sous-œuvre », « création d'ouverture » | réno : IPN + étais + sommiers ; neuf : linteau préfa ou coulé |
| `plancher_poutrelles` | Plancher poutrelles-entrevous | m² | « plancher hourdis », « poutrelles + entrevous », « plancher VS », « dalle de compression », « PSE », « Rectolight », « KP1 » | hourdis béton, PSE ou bois : 3 produits différents ; dalle de compression = béton + treillis |
| `dalle_dallage` | Dalle ou dallage sur terre-plein | m² | « dalle béton 12 cm », « dallage sur hérisson », « dalle de garage », « dalle armée ST25 » | hérisson (cailloux) + film + isolant éventuel + treillis + béton : 5 lignes |
| `chape` | Chape | m² | « chape ciment », « chape 5 cm », « chape liquide », « ragréage » | chape liquide = livrée par camion pompe (m³), pas en sacs |
| `enduit_facade` | Enduit de façade | m² | « enduit monocouche », « enduit gratté », « crépi », « enduit à la chaux », « gobetis », « RPE » | « crépi » courant = monocouche ; RPE = peinture épaisse, autre métier |
| `muret_cloture` | Muret, clôture, piliers | ml | « muret de clôture », « pilier 40×40 », « mur de soutènement », « couvertine », « chaperon » | soutènement = calcul d'ingénieur ; l'app alerte et ne dimensionne pas |

Mots hors matériaux à garder pour le devis mais à ne pas commander : « échafaudage », « étaiement », « location toupie pompe », « mini-pelle », « benne », « nettoyage de chantier ».

## 4. Matériaux : fiches fabricant sourcées

Les rendements ci-dessous viennent des fiches fabricant ouvertes le 3 octobre 2026 ; le conditionnement réel reste celui du négoce qui livre et doit être recoupé (chapitre 13). Une valeur sans lien est marquée *(à vérifier)*.

### 4.1 Blocs béton (parpaings), NF EN 771-3

| Article | Dimensions L × ép. × H (cm) | u/m² | Poids (kg) | u/palette | Source |
| --- | --- | --- | --- | --- | --- |
| Bloc creux B40 « agglo 20 » | 50 × 20 × 20 | 10 | 17 | 70 (palette ≈ 1 220 kg) | [GGI MC20L](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_19568.pdf) |
| Bloc creux B40 de 20, autre usine | 50 × 20 × 20 | 10 | 16,9 à 17,2 | 60 ou 70 | [Fabemi, catalogue blocs](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1339.pdf) |
| Bloc creux B40 de 15 | 50 × 15 × 20 | 10 | ≈ 13,8 | 70 à 80 | [Fabemi](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1339.pdf), [Point.P BM7](https://www.batiproduits.com/amp/fiche/produits/bloc-creux-predecoupe-a-enduire-p69095923.html) |
| Bloc creux B40 de 10 (cloison) | 50 × 10 × 20 | 10 | ≈ 9,9 | 120 | [Fabemi](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1339.pdf) |
| Bloc creux de 7,5 (cloison) | 50 × 7,5 × 20 | 10 | 8,3 | 130 | [GGI MC7](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_705470.pdf) |
| Bloc creux de 20, hauteur 25 | 50 × 20 × 25 | 8 | 21 | 60 | [GGI Turbo 2](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_62561.pdf) |
| Bloc linteau / chaînage en U de 20 | 50 × 20 × 20 | 2 /ml | 17 | 70 | [GGI BL20](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_183745.pdf) |
| Bloc rectifié à coller (Planibloc) | 50 × 20 × 20 | 10 | 19 | 70 | [Planibloc](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_602999.pdf) |
| Bloc à bancher de 20 | 50 × 20 × 20 | 10 | ≈ 18 *(à vérifier)* | ≈ 60 *(à vérifier)* | fiche fabricant à saisir |

Les palettes de blocs courants contiennent déjà des blocs d'angle et des demi-blocs (GGI : 10 blocs d'angle et 10 blocs de coupe sur 70) : ne pas recommander ces pièces en plus, sauf chaînages verticaux nombreux.

### 4.2 Briques terre cuite, NF EN 771-1

| Article | Dimensions L × ép. × H (mm) | u/m² | Poids (kg) | u/palette | Mortier | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Porotherm R20 (rectifiée) | 500 × 200 × 249 | 8 | 17,8 | 60 | joint mince 1 mm, ≈ 1,8 kg/m² (≈ 0,6 sac/palette) | [Wienerberger R20](https://documentacion.generadordeprecios.info/documentaciontecnica/wienerberger/wienerb_poro_r20.pdf) |
| Porotherm GF R20 (grand format) | 500 × 200 × 299 | 6,6 | 18 | 50 | joint mince ≈ 1,6 kg/m² (≈ 0,5 sac/palette) | [Wienerberger GF R20](https://documentacion.generadordeprecios.info/documentaciontecnica/wienerberger/wienerb_poro_gfr20.pdf) |
| Porotherm R30 | 300 d'ép. | 10,7 | 20 | 45 | joint mince ≈ 3 kg/m² | [Wienerberger R30](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_87418.pdf) |
| Linteau-chaînage R20 | — | 2 /ml | — | 60 | — | [R20](https://documentacion.generadordeprecios.info/documentaciontecnica/wienerberger/wienerb_poro_r20.pdf) |
| Poteau / tableau R20 | — | 4 /ml | — | 50 à 60 | — | [R20](https://documentacion.generadordeprecios.info/documentaciontecnica/wienerberger/wienerb_poro_r20.pdf) |
| Brique creuse traditionnelle de 20 à maçonner | 500 × 200 × 200 *(à vérifier)* | 10 *(à vérifier)* | ≈ 15 *(à vérifier)* | — | mortier traditionnel | fiche Bouyer Leroux / Terreal à saisir |
| Brique pleine de parement (Nord) | 220 × 105 × 65 *(à vérifier)* | ≈ 60 par paroi de 10,5 *(à vérifier)* | ≈ 2,5 | — | mortier traditionnel | fiche Wienerberger Terca à saisir |

Collage au pistolet (Dryfix) : ≈ 0,3 cartouche/m², environ 2 cartouches par palette de R20 ([fiche R20](https://cdn.chausson.fr/catalog-document/3a39f569-89c4-45e4-b488-3bd340853b3b/fiche-produit-porotherm-r20.pdf)).

### 4.3 Béton cellulaire, NF EN 771-4 (Xella Ytong)

| Article | L × H × ép. (cm) | u/m² | Poids sec (kg) | u/palette | Colle (kg/m²) | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Ytong Verti 20 | 62,5 × 25 × 20 | 6,40 | 17,2 | 48 | 4,0 | [Ytong Verti 20](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1760687.pdf) |
| Ytong Compact 22.5 | 62,5 × 25 × 22,5 | 6,40 | 15,8 | 40 | 4,5 | [Ytong Compact 22.5](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1392609.pdf) |
| Ytong Energie 25 | 62,5 × 25 × 25 | 6,40 | 13,7 | 40 | 5,0 | [Ytong Energie 25](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1152884.pdf) |
| Ytong Thermo 36.5 | 62,5 × 25 × 36,5 | 6,40 | 20,0 | 24 | 7,3 | [Ytong Thermo 36.5](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1760753.pdf) |
| Bloc U (linteau-chaînage) | 62,5 de long | 1,60 /ml | 8,8 à 14,4 | 12 à 24 | 1,0 à 1,5 /ml | mêmes fiches |
| Mortier-colle Ytong | sac 25 kg | — | 25 | *(à vérifier)* | — | [Ytong Thermo](https://cdn.chausson.fr/catalog-document/88548943-1a1e-4c89-9cb2-6fb527b5586c/ficheproduitcaractristiquesgnrales-793191.pdf) |

### 4.4 Liants, mortiers, granulats

| Article | Conditionnement | Rendement | Source |
| --- | --- | --- | --- |
| Ciment CEM II/B 32,5 | sac 35 kg (aussi 25 kg), palette 40 sacs *(à vérifier)* | voir dosages chapitre 5 | fiche Vicat / Heidelberg à saisir |
| Chaux hydraulique NHL 3,5 | sac 35 kg *(à vérifier)* | mortier bâtard ou chaux | fiche Saint-Astier à saisir |
| Mortier prêt à gâcher Vicat Pro 300 | sac 35 kg (palette 42) ou 25 kg (palette 56) | 35 kg/m² de mur en blocs creux 20 × 20 × 50 (joints horizontaux) ; + 23 kg/m² de joints verticaux en zone sismique ; 20 à 22 kg/m²/cm en enduit ou chape | [Vicat Mortier Pro 300](https://www.vpi.vicat.fr/content/download/11500/96933/version/8/file/FT+MORTIER+PRO+300+_+06.2023.pdf) |
| weber mortier (350 kg/m³) | sac 25 kg, palette 48 (1 200 kg) | 20 kg/m² par cm d'épaisseur | [weber mortier](https://www.cmesmat.fr/media/catalog/product/attributes/7/s/7sAl7oLpmh8ON14Ve8pHXzBAXDnYR8ACKrzYZx8ga2g4_AbrwKdFXcAKtWjzdjRWIt_YuFhG7Q3b7qSYEA8xuQ==.pdf) |
| Sable 0/4 | sac 35 kg, big-bag ≈ 1 t *(à vérifier)*, vrac à la tonne | masse volumique sèche ≈ 1,6 t/m³ *(à vérifier)* | négoce |
| Gravier 4/20 ou 5/15 | big-bag ≈ 1 t, vrac | ≈ 1,5 t/m³ *(à vérifier)* | négoce |
| Béton prêt à l'emploi C25/30 | m³ par toupie | — | centrale BPE locale |

### 4.5 Enduits de façade (NF DTU 26.1)

| Article | Conditionnement | Consommation | Source |
| --- | --- | --- | --- |
| weberpral TE (monocouche OC3) | sac 25 kg, palette 48 | 18 à 20 kg/m² pour 12 à 15 mm | [weberpral TE](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1800673.pdf) |
| weberlite F (monocouche allégé OC2) | sac 25 kg, palette 48 | 18 à 20 ou 21 à 23 kg/m² selon finition, sur maçonnerie | [weberlite F](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1111341.pdf) |
| weberpral F (monocouche lourd) | sac 25 kg | 22 à 28 kg/m² | [Saint-Gobain](https://www.lamaisonsaintgobain.fr/innovation-produit/enduit-de-facade-monocouche-traditionnel-weberpral-f) |
| PRB monocouche semi-allégé | sac 25 kg, palette 64 | 1,4 kg/m²/mm | [PRB](https://pim.prb.fr/PRB/Fiches%20Techniques/fr/ft_prb_monocouche_semi_allege_rd_fr_08_03_2024.pdf) |
| weber enduit épais grain fin (chaux, rénovation) | sac 25 kg, palette 48 | 13,5 kg/m²/cm | [weber épais](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1246979.pdf) |

### 4.6 Acier et treillis

| Article | Format | Poids | Source |
| --- | --- | --- | --- |
| Treillis soudé ST25C (maille 150, fil 7) | panneau 6,00 × 2,40 m = 14,40 m², paquet de 30 | 4,026 kg/m², 57,98 kg/panneau | [ADETS](https://cdn.chausson.fr/catalog-document/a4d6953b-a95d-4465-b3f3-fdec9e12773f/ft-2-20171130-100049-1.pdf) |
| Treillis ST10 / ST15C / ST20 | panneaux 6,00 × 2,40 ou 4,00 × 2,40 | 1,9 à 3,2 kg/m² | [ADETS](https://bnseep.eduscol.education.fr/ressources/examens/sujets/11/400/2310200/E2/u21_dr01.pdf) |
| Treillis de surface dalle de compression (type AF) | 3,26 × 2,06 m, surface utile 5,40 m² | 6,49 kg | [Atout Pro TS AF](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1772771.pdf) |
| Treillis PAF (dalle de compression) | 3,60 × 2,40 m, utile 6,40 m² | 10,80 kg | [même fiche](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1772771.pdf) |
| Barre HA8 / HA10 / HA12 | barre de 6 m | 0,395 / 0,617 / 0,888 kg/m (masse normalisée) | NF A 35-080-1 |
| Chaînage préfabriqué 4 HA10, cadres e = 15 cm | élément 6 m *(à vérifier)* | — | [armatures NF AFCAB](https://media.weldom.fr/v2/media/catalog/product/doc_qualite/wab/WAB_5622285.pdf) |
| Semelle filante préfabriquée (type 3 HA10 + étriers) | élément 6 m *(à vérifier)* | — | fiche fabricant à saisir |

### 4.7 Planchers poutrelles-entrevous

| Article | Dimensions | Poids | u/palette | Béton de la dalle | Source |
| --- | --- | --- | --- | --- | --- |
| Entrevous béton Rector EVB 16-20-53 | 53 × 20 × 16 cm | 13 kg | 72 ou 84 selon usine | 57,9 L/m² en 16 + 4 hors chaînage | [Rector entrevous béton](https://rector.fr/documents/ft-entrevous-beton-pdf) |
| Entrevous PSE Rectosten coffrant 16 | 119,8 × 54,2 cm, entraxe ≈ 60 cm | 1,58 kg | 28 | 65 à 71 L/m² en 16 + 4 | [Rector Rectosten 16](https://rector.fr/documents/ft-rectosten-coffrant-16-m4-pdf) |
| Entrevous bois Rectolight 16 | 150 × 49,5 × 16 cm | 5,74 kg | 120 | — | [Rectolight](https://handyhomeottevaere.be/assets/images/moxie/shop/Docs/TF_FR_PRTERLT1254150M3.pdf) |
| Poutrelle précontrainte | à la longueur, entraxe 60 à 70 cm | — | — | — | [Fimurex R/UR](https://www.batiproduits.com/amp/fiche/produits/poutrelles-en-beton-avec-ou-sans-etai-p68924913.html) |

Le plancher est toujours calculé par le fabricant (plan de pose) : l'app ne choisit pas la poutrelle, elle compte les entrevous, le béton, le treillis et les étais à partir de la surface et de l'entraxe.

## 5. Règles de calcul DTU, formules et pertes

Une formule par ouvrage, en code pur dans `regles.json`. Notations : S = surface (m²), L = longueur (ml), H = hauteur (m), e = épaisseur (m), V = volume (m³), p = perte. Arrondi toujours au conditionnement supérieur, après la perte.

### 5.1 Valeurs normatives extraites

| Règle | Valeur | Source |
| --- | --- | --- |
| Dallage sur terre-plein, maison individuelle | épaisseur ≥ 12 cm | NF DTU 13.3 partie 3, cité par [Knauf/Chausson](https://chausson.fr/media/article-document/273534) et [Eyrolles](https://izibook.eyrolles.com/extract/show/650) |
| Armature du dallage MI | 0,2 % de la section, une nappe de treillis ST, soit ≈ 2,4 cm²/ml pour 12 cm → ST25C (2,57 cm²/ml) | [Eyrolles](https://izibook.eyrolles.com/extract/show/650), [Atout Pro TS25](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1772770.pdf) |
| Dalle de compression sur entrevous | ≥ 4 cm, treillis de surface | [KP1](https://medias.bigmat.fr/data_medias/medias_finaux/documents/3660073271447-nBLAOKqnPL.pdf) |
| Chaînage vertical hors zone sismique | angles rentrants et saillants ; section d'acier ≥ 1,5 cm² (2 HA10) | NF DTU 20.1 *(à vérifier sur le texte)* |
| Chaînages en zone sismique 3-4 (maison) | 4 armatures HA10 ou HA12 minimum ; chaînage vertical aux angles, aux intersections et tous les 5 m au plus ; chaînage horizontal à chaque plancher et en couronnement | [CPMI-EC8 zones 3-4](https://www.ecologie.gouv.fr/sites/default/files/documents/ex%207%20pedagogique%20-%20RDC%20-%20maconnerie%20-%20dalle%20beton%20-%20zone%204.pdf), [CAPEB](https://www.capeb.fr/www/capeb/media/dp114-brochure-sismique.pdf) |
| Diamètre mini des chaînages par zone | zone 2 : Ø 8 ; zone 3 : Ø 10 ; zone 4 : Ø 12 | [CEREMA / DREAL ARA](https://www.auvergne-rhone-alpes.developpement-durable.gouv.fr/IMG/pdf/5-non_conformite_crc_aura.pdf) |
| Joints verticaux en zone sismique | remplis de mortier | [CAPEB](https://www.capeb.fr/www/capeb/media/dp114-brochure-sismique.pdf), [Vicat Pro 300](https://www.vpi.vicat.fr/content/download/11500/96933/version/8/file/FT+MORTIER+PRO+300+_+06.2023.pdf) |
| Vide sanitaire accessible | hauteur ≥ 60 cm ou 3 rangs de blocs | [Eyrolles](https://izibook.eyrolles.com/extract/show/650) |
| Fondation hors gel | 50 cm minimum, jusqu'à 90 cm et plus selon altitude et département | NF DTU 13.11 *(à vérifier, carte par département à saisir dans `departements.json`)* |
| Appui des linteaux | ≥ 20 cm de chaque côté | NF DTU 20.1 *(à vérifier)* |
| Enduit monocouche | épaisseur finie 10 à 15 mm mini selon produit | [weberpral F](https://www.lamaisonsaintgobain.fr/innovation-produit/enduit-de-facade-monocouche-traditionnel-weberpral-f), [PRB](https://pim.prb.fr/PRB/Fiches%20Techniques/fr/ft_prb_monocouche_semi_allege_rd_fr_08_03_2024.pdf) |

### 5.2 Murs en petits éléments

| Calcul | Formule | Perte p |
| --- | --- | --- |
| Surface nette | S = L × H − Σ ouvertures (si le devis donne une surface brute) | — |
| Nombre d'éléments | N = S × (u/m² de la fiche) × (1 + p) | blocs 5 %, briques 5 %, béton cellulaire 3 %, réno 8 % *(à valider)* |
| Palettes | si N > 0,5 × u/palette → palettes = ⌈N ÷ u/palette⌉ ; sinon N à l'unité | — |
| Blocs U de chaînage / linteau | N\_U = ml de chaînage en blocs U × 2 (bloc 50 cm) ou × 1,6 (Ytong 62,5 cm) | 5 % |
| Mortier prêt à gâcher, blocs creux | kg = S × 35 (+ 23 en zone sismique 3-4) → sacs de 35 kg | 10 % |
| Mortier fait sur chantier, blocs creux | V\_mortier = S × 0,018 m³ *(à valider)* ; ciment = V × 350 kg ; sable = V × 1 m³ de sable sec ≈ V × 1,5 t | 10 % |
| Mortier joint mince (brique rectifiée) | kg = S × conso fiche (1,6 à 3,1) → sacs de 25 kg *(sac à vérifier)* | 10 % |
| Colle béton cellulaire | kg = S × conso fiche (4,0 à 7,3) → sacs de 25 kg | 10 % |
| Mortier de 1er rang (arase hydrofugée) | ml de mur × épaisseur × 0,03 m *(à valider)* + hydrofuge 1 L par sac de ciment *(à vérifier)* | 10 % |
| Maçonnerie de pierre | V\_mortier = V\_mur × 0,30 *(à valider)* ; liant chaux NHL 3,5, 350 kg/m³ de sable | 15 % |

Ce que l'app ne fait jamais : compter des blocs au m² brut quand le devis donne les ouvertures, ou commander des demi-blocs alors que la palette les contient.

### 5.3 Fondations et béton

| Calcul | Formule | Perte |
| --- | --- | --- |
| Béton de semelle | V = L × largeur × hauteur | 10 % en fouille en terre, 5 % en coffrage |
| Béton de propreté | V = L × (largeur + 0,10) × 0,05 | 10 % |
| Armature de semelle filante | éléments 6 m = ⌈L ÷ (6 − 0,50 de recouvrement)⌉ *(recouvrement à vérifier)* | 0 (arrondi) |
| Béton toupie | V arrondi au 0,5 m³ supérieur | inclus |
| Béton fait au sac de ciment | ciment = V × 350 kg ; sable = V × 0,40 m³ ; gravier = V × 0,80 m³ *(proportions usuelles à valider)* | 10 % |
| Béton prêt en sac | sacs = V × 1 000 L ÷ litrage du sac (fiche fabricant) | 10 % |

### 5.4 Chaînages et linteaux

| Calcul | Formule |
| --- | --- |
| Chaînage horizontal (ml) | périmètre des murs porteurs + refends, à chaque niveau de plancher, plus couronnement des pignons |
| Chaînage vertical (nombre) | angles saillants et rentrants + intersections de murs + 1 tous les 5 m en zone 3-4 + 2 par baie > 1,80 m en zone 3-4 *(à vérifier CPMI)* |
| Armatures préfabriquées | éléments = ⌈ml ÷ (longueur élément − recouvrement)⌉ ; armature 4 HA10 en zone 3, 4 HA12 en zone 4 |
| Béton de chaînage horizontal | ≈ 0,02 m³/ml dans un bloc U de 20 *(à valider)* |
| Béton de chaînage vertical | ≈ 0,019 m³/ml dans un alvéole Ø 15,5 cm (π × 0,0775²) |
| Linteau | longueur = largeur de baie + 2 × 0,20 m, arrondie à la longueur commerciale supérieure |

### 5.5 Planchers et dallages

| Calcul | Formule | Perte |
| --- | --- | --- |
| Poutrelles | nombre = ⌈largeur ÷ entraxe⌉ + 1 ; longueur = portée libre + 2 appuis ; plan du fabricant prioritaire | 0 |
| Entrevous béton | N = S ÷ (entraxe × longueur d'entrevous) ≈ S × 8,3 pour 0,60 × 0,20 m | 5 % |
| Entrevous PSE (1,20 m) | N = S ÷ (0,60 × 1,20) ≈ S × 1,39 | 3 % |
| Béton dalle de compression | V = S × litrage fiche (57,9 L/m² béton en 16 + 4 ; 65 à 71 L/m² PSE) + chaînages | 5 % |
| Treillis dalle de compression | panneaux = ⌈S ÷ surface utile⌉ (PAF 6,40 m² ; TS AF 5,40 m²) | 0 |
| Hérisson | t = S × 0,20 × 1,6 *(épaisseur et densité à valider)* | 10 % |
| Film polyane | m² = S × 1,15 (recouvrements et relevés) → rouleaux | 0 |
| Treillis du dallage (ST25C) | panneaux = ⌈S ÷ 11,8⌉ (6,00 × 2,40 moins 1 maille + abouts de recouvrement) *(à valider)* | 0 |
| Béton du dallage | V = S × e (e ≥ 0,12 en MI) | 5 % |
| Chape ciment | kg sec = S × 20 × e\_cm → sacs ; ou ciment = S × e × 350 kg, sable = S × e × 1 m³ | 10 % |

### 5.6 Enduits

| Calcul | Formule | Perte |
| --- | --- | --- |
| Monocouche | sacs 25 kg = ⌈S × conso fiche (18 à 28 kg/m²) × (1 + p) ÷ 25⌉ | 10 % |
| Enduit chaux sur pierre | kg = S × 13,5 × e\_cm | 15 % |
| Baguettes d'angle | ml = Σ hauteurs des angles + tableaux de baies → barres de 2,50 ou 3 m *(à vérifier)* | 5 % |

Règle d'affichage : l'app montre toujours la formule utilisée et la valeur de fiche, par exemple « 42 m² × 35 kg = 1 470 kg + 10 % → 47 sacs de 35 kg ».

## 6. Valeurs par défaut et hypothèses à afficher

Quand le devis ne dit rien, le moteur prend la valeur ci-dessous et l'affiche en hypothèse sur la carte quantitatif ; l'artisan la corrige d'un tap ou à la voix. Résolution : chantier → artisan → variation par axe → valeur nationale.

| Clé | Valeur nationale | Variations par axe | Texte affiché |
| --- | --- | --- | --- |
| `bloc_mur_porteur` | bloc creux béton 20 × 20 × 50 B40 | Nord, Pas-de-Calais, Sud-Ouest : brique R20 ; réno avant 1948 : pierre | « Mur en {valeur} » |
| `epaisseur_mur_porteur_cm` | 20 | annexe, garage : 15 | « Mur de {valeur} cm » |
| `hauteur_etage_m` | 2,50 sous plafond + 0,20 plancher | — | « Hauteur {valeur} m » |
| `mortier_montage` | mortier prêt à gâcher en sac de 35 kg | neuf > 60 m² : ciment + sable en vrac | « Mortier {valeur} » |
| `perte_blocs_pct` | 5 | réno : 8 | « Perte blocs {valeur} % » |
| `section_semelle_cm` | 50 × 25 | zone sismique 3-4 ou sol argileux : 60 × 30 *(à valider)* | « Semelle {valeur} cm » |
| `profondeur_hors_gel_m` | 0,50 | lue dans `departements.json` (altitude, zone) | « Hors gel {valeur} m » |
| `beton_livraison` | toupie si V ≥ 1 m³, sacs sinon | réno ou accès difficile : sacs | « Béton {valeur} » |
| `dosage_beton_kg_m3` | 350 | — | « Béton dosé {valeur} kg/m³ » |
| `armature_chainage` | 4 HA10 cadres e = 15 | zone 1-2 hors sismique : 2 HA10 mini (DTU 20.1) ; zone 4 : 4 HA12 | « Chaînage {valeur} » |
| `espacement_chainage_vertical_m` | angles seulement | zone 3-4 : 5 | « Chaînages verticaux : {valeur} » |
| `entraxe_poutrelles_m` | 0,60 | — | « Entraxe {valeur} m » |
| `entrevous` | béton 16 cm | plancher bas sur vide sanitaire : PSE 16 | « Entrevous {valeur} » |
| `epaisseur_dalle_compression_cm` | 4 | zone sismique : 5 *(à vérifier)* | « Dalle de compression {valeur} cm » |
| `epaisseur_dallage_cm` | 12 | garage : 13 *(à valider)* | « Dallage {valeur} cm » |
| `herisson_cm` | 20 *(à valider)* | — | « Hérisson {valeur} cm » |
| `treillis_dallage` | ST25C | — | « Treillis {valeur} » |
| `enduit` | monocouche OC2, 22 kg/m² | bâti ancien : enduit chaux 13,5 kg/m²/cm × 2 cm | « Enduit {valeur} » |
| `perte_enduit_pct` | 10 | — | « Perte enduit {valeur} % » |
| `sacs_ciment_kg` | 35 | réno ou petit chantier : 25 | « Ciment en sacs de {valeur} kg » |

Exemple de `defauts.json` :

```json
{
  "bloc_mur_porteur": {
    "valeur": "bloc_beton_creux_20x20x50_B40",
    "variations": [
      { "si": { "geographie.departement": ["59", "62", "31", "32", "82", "47"] }, "valeur": "brique_R20" },
      { "si": { "neuf_renovation": "renovation", "epoque_bati": "avant_1948" }, "valeur": "pierre" }
    ],
    "afficher": "Mur en {valeur}"
  },
  "armature_chainage": {
    "valeur": "4HA10_e15",
    "variations": [ { "si": { "geographie.zone_sismique": ">=4" }, "valeur": "4HA12_e15" } ],
    "afficher": "Chaînage {valeur}"
  }
}
```

## 7. Questions à poser, avec sensibilité

Six questions sont autorisées ; le moteur n'en pose jamais plus de 4, seulement si l'information manque au devis et si la sensibilité dépasse 5 %. Aucune ne demande une quantité. La zone sismique, le hors gel et le bloc régional viennent du département et ne sont jamais demandés.

| Priorité | Id | Question (bouton) | Boutons | Défaut | Sensibilité | Pourquoi |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | `materiau_mur` | « Murs en ? » | `@materiaux_dominants` du département + Autre | bloc régional | 100 % | change tous les articles du mur |
| 1 | `ouvertures_deduites` | « Portes et fenêtres déjà enlevées du métré ? » | Oui · Non · Je ne sais pas | Oui | 15 % *(à valider sur cas réels)* | une façade courante compte 12 à 20 % d'ouvertures |
| 2 | `mortier_fourni` | « Mortier en ? » | Sacs prêts · Ciment + sable | Sacs prêts | 100 % sur les lignes mortier | change l'article et l'unité (sacs de 35 kg ou tonnes de sable) |
| 3 | `beton_livraison` | « Béton en ? » | Toupie · Sacs | selon volume (6) | 100 % sur les lignes béton | m³ toupie ou sacs + sable + gravier |
| 4 | `epaisseur_mur` | « Épaisseur des murs ? » | 15 cm · 20 cm · 25 cm | 20 cm | 25 % *(poids et mortier)* | même nombre de blocs/m², article et mortier différents |
| 5 | `type_entrevous` | « Plancher en hourdis ? » | Béton · Polystyrène · Bois | béton 16 | 100 % sur les entrevous, 15 % sur le béton | entrevous ×6 en nombre entre béton et PSE |

Exemple de `questions.json` :

```json
[
  {
    "id": "materiau_mur",
    "ouvrages": ["mur_*"],
    "priorite": 0,
    "si_inconnu": "materiau_mur",
    "texte": "Murs en ?",
    "boutons": "@materiaux_dominants",
    "sensibilite_pct": 100
  },
  {
    "id": "ouvertures_deduites",
    "ouvrages": ["mur_*", "enduit_facade"],
    "priorite": 1,
    "si_inconnu": "ouvertures_deduites",
    "texte": "Portes et fenêtres déjà enlevées du métré ?",
    "boutons": [ { "label": "Oui", "valeur": true }, { "label": "Non", "valeur": false }, { "label": "Je ne sais pas", "valeur": null } ],
    "defaut": true,
    "sensibilite_pct": 15
  },
  {
    "id": "mortier_fourni",
    "ouvrages": ["mur_blocs_beton", "mur_brique", "mur_pierre", "chape"],
    "priorite": 2,
    "si_inconnu": "mortier_fourni",
    "texte": "Mortier en ?",
    "boutons": [ { "label": "Sacs prêts", "valeur": "sac" }, { "label": "Ciment + sable", "valeur": "vrac" } ],
    "defaut": "sac",
    "sensibilite_pct": 100
  }
]
```

Si l'artisan répond « Non » à `ouvertures_deduites`, le moteur ne demande pas les dimensions : il lit les menuiseries du devis (lignes de linteaux, appuis, baies) et, à défaut, retient 15 % de la surface brute, affiché en hypothèse.

## 8. Matériaux dominants par région

Le parpaing domine la maison neuve en France : 45 % des maisons au niveau national et 64 % en Île-de-France, contre 2 % pour le béton cellulaire, selon l'enquête Domexpo rapportée par [Batiweb (2017)](https://www.batiweb.com/actualites/vie-des-societes/habitat-individuel-neuf-quels-sont-les-materiaux-les-plus-utilises-enquete-31663). La brique domine près des grandes briqueteries. Le tableau ci-dessous sert à remplir `materiaux_dominants` de `departements.json` ; les rangs régionaux sont *(à vérifier)* et seront recalculés sur les chantiers réels (chapitre 13).

| Région | Neuf : 1er choix | Neuf : 2e choix | Rénovation : ce qu'on trouve | Zone sismique (maison) |
| --- | --- | --- | --- | --- |
| Bretagne | bloc béton 20 (« agglo ») | brique R20 | granit et schiste en moellons, mortier chaux | 2 |
| Pays de la Loire, Normandie | bloc béton 20 | brique R20 | pierre calcaire, tuffeau (Val de Loire), torchis | 1 à 2 |
| Île-de-France | bloc béton 20 | béton cellulaire, brique | meulière, pierre de taille, plâtre et moellons | 1 |
| Hauts-de-France | brique (rectifiée ou creuse) | bloc béton | brique pleine rouge, mortier chaux | 1 à 2 |
| Grand Est, Alsace | brique et bloc béton | béton cellulaire | grès des Vosges, colombages | 2 à 3 (Haut-Rhin) |
| Bourgogne-Franche-Comté | bloc béton | brique | pierre calcaire | 1 à 2 |
| Centre-Val de Loire | bloc béton | brique | tuffeau, silex | 1 à 2 |
| Nouvelle-Aquitaine | brique (Sud-Ouest), bloc béton (Poitou, Limousin) | bloc béton | pierre calcaire, granit (Limousin), brique foraine | 2 à 4 (Pyrénées-Atlantiques) |
| Occitanie | brique (Toulouse, Gers, Tarn-et-Garonne) | bloc béton | brique foraine toulousaine, galets, pierre | 2 à 4 (Pyrénées) |
| Auvergne-Rhône-Alpes | bloc béton | brique, béton banché | pisé (Rhône, Isère), pierre volcanique | 2 à 4 (Alpes) |
| Provence-Alpes-Côte d'Azur | bloc béton | béton banché | pierre calcaire, moellons | 2 à 4 |
| Corse | bloc béton | — | granit et schiste | 1 |

Zones sismiques : décret 2010-1255 et carte officielle ([Géorisques](https://www.georisques.gouv.fr/)), à saisir commune par commune dans `departements.json` ; le moteur prend la zone la plus forte du département tant que la commune n'est pas connue. Les DOM (zone 5) sont hors périmètre v1.

Règles régionales qui changent la commande :

- Zone sismique 3-4 : joints verticaux remplis (+ 23 kg/m² de mortier), chaînages 4 HA10 ou HA12, chaînages verticaux tous les 5 m.
- Rénovation sur pierre, pisé, torchis ou brique ancienne : mortier et enduit à la chaux, jamais de ciment pur ; le moteur remplace ciment par NHL et l'affiche.
- Altitude : profondeur hors gel plus forte, donc plus de béton de semelle ou de soubassement.

## 9. Points singuliers et consommables

Ces articles se commandent à la pièce ou au ml et sont oubliés une fois sur deux dans un devis ; le moteur les déduit de l'ouvrage et les affiche en hypothèse. Les ratios marqués *(à valider)* passent par la relecture du chapitre 11.

### 9.1 Points singuliers

| Point singulier | Déclencheur | Quantité | Unité de commande |
| --- | --- | --- | --- |
| Bloc ou brique d'angle | chaque angle de mur | inclus dans la palette de blocs ; en brique : poteau d'angle 4/ml × hauteur | u |
| Tableau de baie | chaque baie | 2 × hauteur de baie × 4/ml (brique R20) ; blocs : inclus | u |
| Linteau préfabriqué | chaque baie sans bloc U | 1 par baie, longueur = largeur + 0,40 m | u à la longueur commerciale |
| Appui de fenêtre | chaque fenêtre | 1 par fenêtre, longueur = largeur + 0,10 m *(à valider)* | u |
| Seuil de porte | chaque porte extérieure | 1 par porte | u |
| Rupteur de pont thermique | plancher intermédiaire en isolation intérieure | ml = périmètre de façade | ml, éléments de 1 m *(à vérifier)* |
| Planelle de rive | rive de plancher | ml = périmètre du plancher → u par longueur fiche | u |
| Arase étanche (1er rang) | tout mur sur fondation | ml = longueur de mur | sacs de mortier hydrofugé ou rouleau de bande bitume |
| Couvertine, chaperon | muret | ml = longueur de muret + 2 abouts | u (éléments de 0,50 à 1 m) |
| Pilier de portail | clôture | 2 par portail | blocs pilier 20 × 20 ou 40 × 40 + 2 HA10 par pilier |
| Joint de dilatation | dallage > 40 m² ou longueur > 8 m *(à vérifier DTU 13.3)* | ml de joint | bande de désolidarisation en rouleau |
| Bande de désolidarisation périphérique | dallage, chape | ml = périmètre | rouleau 25 ou 50 m *(à vérifier)* |
| Isolant sous dallage | dallage isolé | S × 1,03 | plaques, paquet |
| Trappe de vide sanitaire | plancher sur VS | 1 par VS | u |
| Grilles de ventilation du VS | vide sanitaire | 1 tous les 4 m de périmètre *(à valider)* | u |

### 9.2 Consommables et petites fournitures

| Consommable | Ratio | Conditionnement |
| --- | --- | --- |
| Hydrofuge de masse pour arase | 1 L par sac de 35 kg de ciment *(à vérifier fiche)* | bidon 1 ou 5 L |
| Cales à béton (distanciers) pour treillis | 4 par m² *(à valider)* | sachet de 100 *(à vérifier)* |
| Chaises pour 2e nappe | 1 par m² *(à valider)* | sachet |
| Fil à ligaturer | 1 kg pour 100 m² de dallage *(à valider)* | bobine |
| Polyane 150 µm | S × 1,15 | rouleau 4 × 25 m = 100 m² *(à vérifier)* |
| Géotextile sous hérisson | S × 1,10 | rouleau |
| Huile de décoffrage | 1 L pour 10 à 15 m² de coffrage *(à vérifier)* | bidon 5 ou 20 L |
| Planches de coffrage | 2 × ml de semelle ou de chaînage coulé sur place | planches 4 m |
| Étais de plancher | 1 tous les 1,20 m par file, files selon plan fabricant *(à valider)* | location, à afficher sans commander |
| Disques diamant | 1 par chantier de 50 m² de blocs *(à valider)* | u |
| Baguettes d'angle d'enduit | Σ arêtes de façade et tableaux | barre |
| Treillis d'armature d'enduit (fibre de verre) | jonctions de matériaux, angles de baies : 0,30 m² par baie *(à valider)* | rouleau 50 m² |
| Primaire d'accrochage (béton lisse) | 0,2 à 0,3 L/m² *(à vérifier fiche)* | bidon |

## 10. Cas de test (format JSON)

Les cinq cas ci-dessous sont calculés à la main avec les formules du chapitre 5 : ce sont des cas théoriques qui vérifient le moteur, pas des devis réels. Ils seront remplacés par 10 devis réels anonymisés avec la commande réellement passée (critère de bêta, chapitre 13).

```json
[
  {
    "id": "macon-T01",
    "source": "cas théorique, référentiel v1.0.0",
    "devis_texte": "Élévation murs en agglos de 20, 85 m², hourdés au mortier",
    "contexte": { "departement": "22", "zone_sismique": 2, "neuf_renovation": "neuf", "mortier_fourni": "sac" },
    "attendu": [
      { "article": "bloc creux béton 20x20x50 B40", "quantite": 13, "unite": "palette 70", "tolerance_pct": 5, "calcul": "85 × 10 × 1,05 = 893 u → 13 palettes" },
      { "article": "mortier prêt à gâcher", "quantite": 94, "unite": "sac 35 kg", "tolerance_pct": 10, "calcul": "85 × 35 × 1,10 = 3 273 kg" }
    ],
    "questions_max": 4
  },
  {
    "id": "macon-T02",
    "source": "cas théorique, référentiel v1.0.0",
    "devis_texte": "Dallage béton armé sur hérisson 60 m², ép. 12 cm, film polyane, treillis ST25C",
    "contexte": { "departement": "35", "beton_livraison": "toupie" },
    "attendu": [
      { "article": "béton C25/30", "quantite": 8.0, "unite": "m3", "tolerance_pct": 7, "calcul": "60 × 0,12 × 1,05 = 7,56 → 8,0" },
      { "article": "treillis soudé ST25C 6,00x2,40", "quantite": 6, "unite": "panneau", "tolerance_pct": 0, "calcul": "60 ÷ 11,8 = 5,1 → 6" },
      { "article": "film polyane 150 µm", "quantite": 1, "unite": "rouleau 100 m²", "tolerance_pct": 0, "calcul": "60 × 1,15 = 69 m²" },
      { "article": "cailloux 20/40 hérisson", "quantite": 22, "unite": "t", "tolerance_pct": 10, "calcul": "60 × 0,20 × 1,6 × 1,10 = 21,1 t" }
    ],
    "questions_max": 4
  },
  {
    "id": "macon-T03",
    "source": "cas théorique, référentiel v1.0.0",
    "devis_texte": "Murs en brique Porotherm R20 joint mince, 120 m²",
    "contexte": { "departement": "31", "zone_sismique": 1 },
    "attendu": [
      { "article": "brique Porotherm R20 500x200x249", "quantite": 17, "unite": "palette 60", "tolerance_pct": 5, "calcul": "120 × 8 × 1,05 = 1 008 u → 17 palettes" },
      { "article": "mortier joint mince", "quantite": 10, "unite": "sac 25 kg", "tolerance_pct": 10, "calcul": "120 × 1,8 × 1,10 = 238 kg" }
    ],
    "questions_max": 4
  },
  {
    "id": "macon-T04",
    "source": "cas théorique, référentiel v1.0.0",
    "devis_texte": "Enduit monocouche gratté sur façades, 140 m²",
    "contexte": { "departement": "44" },
    "attendu": [
      { "article": "enduit monocouche OC2", "quantite": 136, "unite": "sac 25 kg", "tolerance_pct": 10, "calcul": "140 × 22 × 1,10 = 3 388 kg" }
    ],
    "questions_max": 4
  },
  {
    "id": "macon-T05",
    "source": "cas théorique, référentiel v1.0.0",
    "devis_texte": "Fondations : semelles filantes BA 50x25, 40 ml, sur béton de propreté",
    "contexte": { "departement": "29", "beton_livraison": "toupie" },
    "attendu": [
      { "article": "béton C25/30", "quantite": 5.5, "unite": "m3", "tolerance_pct": 10, "calcul": "40 × 0,50 × 0,25 × 1,10 = 5,5" },
      { "article": "béton de propreté", "quantite": 1.5, "unite": "m3", "tolerance_pct": 15, "calcul": "40 × 0,60 × 0,05 × 1,10 = 1,32 → 1,5" },
      { "article": "armature semelle filante préfabriquée 6 m", "quantite": 8, "unite": "u", "tolerance_pct": 0, "calcul": "40 ÷ 5,5 = 7,3 → 8" }
    ],
    "questions_max": 4
  }
]
```

Critère de validation identique à la couverture : 10 cas réels, chaque ligne dans la tolérance, 4 questions maximum, zéro question sur une quantité. Un cas qui échoue bloque la livraison.

## 11. Ratios à faire valider par un maçon

Quinze ratios ne sont pas sourcés sur une fiche ou un DTU ; ils deviennent `ratios-a-valider.md`. Un maçon en activité coche « juste », « trop haut » ou « trop bas » et donne son chiffre ; le ratio sort du fichier quand deux maçons de régions différentes sont d'accord.

| # | Ratio | Valeur proposée | Impact si faux | Validé |
| --- | --- | --- | --- | --- |
| 1 | Perte blocs béton en neuf / réno | 5 % / 8 % | ± 3 % sur les palettes | à faire |
| 2 | Mortier fait sur chantier, mur en blocs creux de 20 | 18 L/m² | ± 20 % sur ciment et sable | à faire |
| 3 | Mortier de maçonnerie de pierre | 30 % du volume du mur | ± 30 % sur la chaux | à faire |
| 4 | Béton fait au sac : sable / gravier par m³ | 0,40 m³ / 0,80 m³ pour 350 kg de ciment | ± 10 % sur granulats | à faire |
| 5 | Perte béton en fouille en terre | 10 % | ± 5 % sur la toupie | à faire |
| 6 | Recouvrement des armatures préfabriquées | 0,50 m | ± 1 élément sur 40 ml | à faire |
| 7 | Béton de chaînage horizontal en bloc U de 20 | 0,02 m³/ml | ± 20 % sur le béton de chaînage | à faire |
| 8 | Hérisson : épaisseur et densité | 20 cm, 1,6 t/m³ | ± 25 % sur les cailloux | à faire |
| 9 | Surface utile d'un ST25C 6,00 × 2,40 | 11,8 m² | ± 1 panneau sur 60 m² | à faire |
| 10 | Part d'ouvertures quand le métré est brut | 15 % de la façade | ± 15 % sur blocs et enduit | à faire |
| 11 | Consommation d'enduit monocouche par défaut | 22 kg/m² | ± 15 % sur les sacs | à faire |
| 12 | Section de semelle par défaut | 50 × 25 cm | ± 40 % sur le béton de fondation | à faire |
| 13 | Cales à béton par m² de dallage | 4 | négligeable en coût, oubli fréquent | à faire |
| 14 | Grilles de ventilation du vide sanitaire | 1 tous les 4 m | quelques unités | à faire |
| 15 | Seuil toupie plutôt que sacs | 1 m³ | change tout le mode de livraison | à faire |

Questions ouvertes pour le maçon relecteur : achète-t-il encore le ciment et le sable séparément sur les chantiers neufs, ou tout en sacs prêts ? Commande-t-il les chaînages préfabriqués ou fait-il les cadres lui-même avec des barres ?

## 12. Sources officielles

Chaque ligne de `materiaux.json` et `regles.json` porte un champ `source` avec le lien ci-dessous. Pages ouvertes le 3 octobre 2026.

| Domaine | Document | Lien | Contenu utilisé |
| --- | --- | --- | --- |
| Blocs béton | GGI, bloc creux 20 × 20 × 50 MC20L | [fiche](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_19568.pdf) | poids, u/palette, contenu de palette |
| Blocs béton | Fabemi, catalogue blocs creux | [fiche](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1339.pdf) | gamme 7,5 à 27,5, poids, palettes |
| Blocs béton | Planibloc rectifié | [fiche](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_602999.pdf) | blocs à coller, linteaux |
| Blocs béton | GGI Turbo 2, BL20, MC7 | [Turbo 2](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_62561.pdf) · [BL20](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_183745.pdf) · [MC7](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_705470.pdf) | hauteur 25, bloc U, cloison |
| Brique | Wienerberger Porotherm R20, GF R20, R30 | [R20](https://documentacion.generadordeprecios.info/documentaciontecnica/wienerberger/wienerb_poro_r20.pdf) · [GF R20](https://documentacion.generadordeprecios.info/documentaciontecnica/wienerberger/wienerb_poro_gfr20.pdf) · [R30](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_87418.pdf) | u/m², palettes, joint mince |
| Béton cellulaire | Xella Ytong Verti 20, Compact 22.5, Energie 25, Thermo 36.5 | [Verti 20](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1760687.pdf) · [Compact](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1392609.pdf) · [Energie](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1152884.pdf) · [Thermo](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1760753.pdf) | u/m², palettes, colle, zones sismiques |
| Mortier | Vicat Mortier Pro 300 | [fiche](https://www.vpi.vicat.fr/content/download/11500/96933/version/8/file/FT+MORTIER+PRO+300+_+06.2023.pdf) | kg/m² de mur, zone sismique |
| Mortier | weber mortier | [fiche](https://www.cmesmat.fr/media/catalog/product/attributes/7/s/7sAl7oLpmh8ON14Ve8pHXzBAXDnYR8ACKrzYZx8ga2g4_AbrwKdFXcAKtWjzdjRWIt_YuFhG7Q3b7qSYEA8xuQ==.pdf) | 20 kg/m²/cm, palette 48 |
| Enduits | weberpral TE, weberlite F, enduit épais, PRB monocouche | [TE](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1800673.pdf) · [lite F](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1111341.pdf) · [épais](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1246979.pdf) · [PRB](https://pim.prb.fr/PRB/Fiches%20Techniques/fr/ft_prb_monocouche_semi_allege_rd_fr_08_03_2024.pdf) | kg/m², sacs, palettes |
| Treillis | ADETS, fiche treillis soudés | [fiche](https://cdn.chausson.fr/catalog-document/a4d6953b-a95d-4465-b3f3-fdec9e12773f/ft-2-20171130-100049-1.pdf) | formats, kg/m², paquets |
| Treillis | Atout Pro TS25 et TS AF | [TS25](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1772770.pdf) · [TS AF](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1772771.pdf) | surfaces utiles, recouvrements |
| Planchers | Rector entrevous béton, Rectosten, Rectolight ; KP1 | [béton](https://rector.fr/documents/ft-entrevous-beton-pdf) · [Rectosten](https://rector.fr/documents/ft-rectosten-coffrant-16-m4-pdf) · [KP1](https://medias.bigmat.fr/data_medias/medias_finaux/documents/3660073271447-nBLAOKqnPL.pdf) | entrevous, palettes, litrage béton |
| Sismique | Guide CPMI-EC8 zones 3-4, exemple ministère | [exemple](https://www.ecologie.gouv.fr/sites/default/files/documents/ex%207%20pedagogique%20-%20RDC%20-%20maconnerie%20-%20dalle%20beton%20-%20zone%204.pdf) | 4 HA10/HA12 |
| Sismique | CAPEB, carnet de chantier sismique | [brochure](https://www.capeb.fr/www/capeb/media/dp114-brochure-sismique.pdf) | chaînages tous les 5 m, joints |
| Sismique | CEREMA, non-conformités fréquentes | [diaporama](https://www.auvergne-rhone-alpes.developpement-durable.gouv.fr/IMG/pdf/5-non_conformite_crc_aura.pdf) | diamètres par zone |
| Dallage | Eyrolles, *Maisons sur vide sanitaire* | [extrait](https://izibook.eyrolles.com/extract/show/650) | 12 cm, 0,2 % d'acier, VS 60 cm |
| Marché | Batiweb, enquête Domexpo | [article](https://www.batiweb.com/actualites/vie-des-societes/habitat-individuel-neuf-quels-sont-les-materiaux-les-plus-utilises-enquete-31663) | parts de marché |
| Normes (payantes) | NF DTU 20.1, 13.11, 13.3, 21, 23.1, 26.1, 26.2 | boutique CSTB / AFNOR | texte de référence, à acheter |
| Zonage | Géorisques, zones sismiques par commune | [georisques.gouv.fr](https://www.georisques.gouv.fr/) | `departements.json` |

## 13. Plan de complétion

Le tiroir est en maturité « alpha » : les rendements fabricant sont sourcés, mais aucun cas réel ne le valide encore. Ordre : 1 d'abord, sans cas réels rien n'est validable.

| # | Manque | Source | Qui | Critère de fin |
| --- | --- | --- | --- | --- |
| 1 | 10 devis de maçon réels + commandes passées | maçons clients Rappidos, via l'équipe terrain (Dorothée, Omar) | Greg | `tests/` complet, tous verts |
| 2 | Textes NF DTU 20.1, 13.11, 13.3 (valeurs exactes : hors gel, linteaux, joints de dallage, chaînages hors zone sismique) | CSTB / AFNOR, payant | Greg achète, Claude transcrit | aucun *(à vérifier)* au chapitre 5 |
| 3 | Conditionnements négoce : ciment, chaux, sable big-bag, polyane, armatures préfabriquées, cales | catalogues Point.P, Gedimat, BigMat, Tout Faire | Claude (recherche web) | chaque article a une unité de commande sourcée |
| 4 | Zone sismique et profondeur hors gel par département | Géorisques, DTU 13.11 | Claude | `departements.json` rempli pour 96 départements |
| 5 | Fiches brique creuse traditionnelle, brique de parement, bloc à bancher, monomur 37,5 | Bouyer Leroux, Terreal, Wienerberger, Fabemi | Claude | `materiaux.json` sans trou |
| 6 | 15 ratios du chapitre 11 | relecture par 2 maçons | maçons | `ratios-a-valider.md` vide |
| 7 | Rang régional réel des matériaux | 300 chantiers bêta | automatique | table du chapitre 8 recalculée |
| 8 | Vocabulaire enrichi | 50 premiers devis bêta | automatique + validation | zéro mot inconnu sur un devis courant |

## 14. CHANGELOG

| Date | Version | Changement |
| --- | --- | --- |
| 2026-10-03 | 1.0.0-alpha | Création du tiroir maçonnerie au format de la section 27 : 14 ouvrages, fiches blocs, briques, béton cellulaire, mortiers, enduits, treillis, planchers, règles de calcul, 6 questions, 5 cas théoriques, 15 ratios à valider. |
