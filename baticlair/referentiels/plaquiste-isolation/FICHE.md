# Fiche métier : plaquiste-isolation (plâtrerie sèche et isolation intérieure)

| | |
|---|---|
| État | **Recherche, NON BRANCHÉE.** Le métier reste fermé dans l'application ; aucun code ne lit ce dossier. |
| Version | `plaquiste-isolation-2026.11.20-7` (fichier machine `referentiel.json`), après les réponses de Greg, la cinquième vague et la recherche « montage et cornière » du 20 novembre 2026 : **90 % des chiffres confirmés** (87 % par deux sources, 3 % validés par Greg ; les nouvelles lignes « à vérifier » comptent dans le reste) |
| Rédaction | Mission de nuit du 19-20 novembre 2026 (Claude), sept chercheurs et deux contre-vérifications. |
| À faire avant ouverture | Relecture par un plaquiste (section 16), branchement (section 17). |

Cette fiche a la même forme que celle de la couverture. Elle a deux faces :

- **ce document**, que l'on lit : familles, systèmes et marques, avec la source à côté de chaque chiffre ;
- **`referentiel.json`**, que le moteur lira : même schéma que `referentiels/couverture/referentiel.json`. Il est vérifié par le vrai chargeur de Mobiiz (`loadReferential` : OK, 10 ouvrages, 39 produits) et produit par `outils/generer_referentiel.py`.

Les autres fichiers du dossier :

| Fichier | Rôle |
|---|---|
| `chantiers-types.json` / `chantiers-types.md` | 17 chantiers types, devis et liste attendue, calculés par le moteur de Mobiiz (`outils/calculer_chantiers.mjs`). |
| `vocabulaire.json` | Les mots des devis qui désignent chaque ouvrage (format des tiroirs). |
| `relecture-testeur-negoce.md` | Le comptoir essaie de commander chaque famille. |
| `recherche/01` à `recherche/07` | Les notes brutes des chercheurs : chaque chiffre avec ses deux sources, URL et dates. |
| `CHANGELOG.md` | Les versions de la fiche. |

## Légende des sources et des états

- **[R01-S1]** = fichier `recherche/01-plaques.md`, source S1 de sa liste (URL, éditeur, date du document, date de consultation 19/11/2026).
- Fichiers :
  - R01 plaques ; R01b contre-vérification plaques ;
  - R02 ossatures et fixations ; R02b contre-vérification fixations ;
  - R03 systèmes et hauteurs ;
  - R04 isolants ;
  - R05 finitions et accessoires ;
  - R06 négoce et régions ;
  - R07 troisième passe.
- **SNIP** = fiche conseil n° 18 du Syndicat national des industries du plâtre (Placo, Knauf, Siniat…), « Ouvrages en plaques de plâtre : quantitatifs estimés de produits », décembre 2024 (PDF du 13/02/2025) [R02-S1]. C'est le quantitatif de la profession, lu en entier.
- **DTU 25.41** = NF DTU 25.41 de février 2022, en vigueur depuis le 1er mai 2022. Aucune édition plus récente n'a été trouvée au 19/11/2026 [R03-S3, S28]. Le texte AFNOR n'est pas recopié : on cite les tableaux repris par Rockwool, la CAPEB, Siniat et Placo.
- États :
  - **✔✔** : deux sources indépendantes concordantes, dont un fabricant ou un DTU ;
  - **✔** : une source ;
  - **?** : à confirmer, la raison est dite ;
  - **≠** : sources en désaccord, la valeur retenue et la raison sont dites.
- Dans `referentiel.json`, **toutes** les valeurs restent `draft`. La règle Mobiiz veut qu'un chiffre hors référentiel du fondateur reste « à confirmer » tant qu'un professionnel ne l'a pas relu (§47.1). La ligne sort alors orange « Quantité à confirmer » jusqu'au « C'est bon ». L'état de recherche est écrit dans la note de chaque valeur.

---

## 1. Règle d'or et comportement attendu

1. **Le m² du devis n'est jamais une unité de commande.** Il devient des plaques d'une longueur donnée, des longueurs de profilé, des boîtes, des sacs, des seaux, des rouleaux et des colis, arrondis à l'unité de vente supérieure.
2. **Ne jamais redemander ce que le devis dit.** Le devis dit presque toujours le système : « 72/48 », « 98/48 », « 10+80 », « Optima + GR32 100 », « R 7 ». La hauteur, le type de plaque et le support s'y lisent souvent : ils sont lus (`textLabels`, `textValues`), jamais demandés.
3. **Valeurs par défaut quand c'est l'usage**, dites « par défaut » et modifiables d'un geste :
   - une plaque par face (72/48), BA13 standard, montant de 48 ;
   - montage des montants tiré de la hauteur (DTU) ;
   - entraxe des fourrures 60 cm, plafond en une plaque, plaques de plafond de 2,50 m ;
   - suspente longue (plénum de moins de 15 cm), une couche d'isolant.
4. **Une question seulement pour ce qui manque vraiment** (section 12), dans l'ordre du plus gros levier.
5. **Ce qui sort d'office : ce qui est forcément là, la constitution même du système.**
   - Une cloison donne ses plaques, rails haut et bas, montants, vis TTPC et TRPF, et les fixations de ses rails.
   - Un doublage collé donne ses complexes et son mortier adhésif.
   - Un plafond donne ses plaques, fourrures, suspentes et leur fixation, éclisses, cornière de rive et vis.
   - Un soufflage donne ses sacs.
6. **Suggestions strictes :** bande à joint et enduit, deux cases « si tu fais les joints ».
   - Les joints sont forcément faits, mais pas toujours par le plaquiste ni avec ses fournitures : un peintre les reprend parfois.
   - Ces deux cases sont les seules suggestions de la fiche ; la limite est de cinq cases par devis.
7. **Jamais ajouté d'office**, seulement s'il est écrit au devis :
   - l'isolant dans une cloison ou derrière un doublage ;
   - le pare-vapeur, la bande armée d'angle, les cornières d'angle ;
   - les trappes, la bande résiliente, les mastics, les renforts, les boîtiers électriques ;
   - les piges et déflecteurs de soufflage.
8. **« Bandes et enduit sur l'ensemble »** est déjà dans chaque ouvrage : jamais recompté. Une ligne « ens » ou « forfait » n'est pas une fourniture.
9. **Cloison = deux faces.** 45 m² de cloison 72/48 font 94,5 m² de plaques, donc 32 plaques en 2,50 m.
10. **« 10+80 » est un complexe d'un seul bloc :** ni ossature, ni laine à part.
11. **La hauteur décide de la plaque et du montant, pas le m².** 2,55 m sous plafond demande des plaques de 2,60 m et des montants de 2,59 m.

> **Décisions de Greg (20 novembre 2026)** :
> 1. **Vis et fixations : sorties d'office.** Une cloison ne tient pas sans elles, c'est un « obligatoire si ». Cela vaut pour les vis TTPC, les vis TRPF, les fixations de rail et la fixation des suspentes. Règle changée pour ce métier : la couverture met ses consommables en cases « Suggestions » (18 novembre).
> 2. **Bande et enduit : en cases à cocher**, parce que certains plaquistes sous-traitent les joints.
> 3. **Coupe-feu : tout le système d'une seule marque, avec son procès-verbal.** Mobiiz pose une seule question, « Quelle marque ? » (Placo, Knauf, Siniat), et toute la liste suit cette marque, sans « ou équivalent ». Les systèmes coupe-feu courants par marque sont en section 5.8.

---

## 2. Méthode générale de calcul

Le même ordre vaut pour tous les ouvrages ; c'est celui de `referentiel.json`.

1. **Métré du devis**, c'est-à-dire la surface d'une face.
2. **Géométrie :** longueur d'ouvrage = surface ÷ hauteur. SNIP et Pladur calculent les rails ainsi ✔✔ [R02-S1 ; R03-S20].
3. **Quantité technique**, par l'une de ces trois voies :
   - calepinage : plaques = longueur × faces × plaques par face × 1,05 ÷ 1,20, car une plaque couvre 1,20 m × la hauteur ;
   - ratio au m² : vis, bande, enduit, fourrures, suspentes ;
   - certificat du produit : sacs de soufflage.
4. **Pertes déjà comprises dans les ratios fabricant : 5 %**, jamais rajoutées une deuxième fois :
   - plaques : 2,10 m² par m² de cloison, 1,05 m² par m² de doublage ou de plafond ✔✔ [R03-S8, S20, S47] ;
   - ossature : rails 0,84 ml/m² à 2,50 m = 2 ÷ 2,50 × 1,05 ✔✔ [R02-S1 ; R03-S20] ;
   - isolant : 1,05 m²/m² ✔✔ [R03-S8, S41].
5. **Conversion en unité de vente, arrondie au-dessus.** Plaque entière, longueur de 3 m, boîte de 1000, sac de 25 kg, rouleau de 150 m, colis.
6. **Une seule ligne par article identique** sur tout le devis : c'est la liste d'achats de Mobiiz (§49.5).

Pertes non sourcées, donc **non ajoutées** (?) :
- la rénovation (« +3 à +5 points », non sourcé) ;
- les rampants biais (« 10 % », non sourcé) ;
- le soufflage : le tassement est déjà dans le certificat, et aucune majoration de perte n'est publiée [R04 B2].

---

## 3. Famille A : les plaques

Largeur **1,20 m** partout pour les cloisons, doublages et plafonds. Il existe aussi du 0,60 m (BA13 standard et hydro, rénovation, plafond) et du 0,90 m (BA18S, BA25, plaques « mono-parement ») ✔✔ [R01 §1.3 ; R01-S1, S2].

### 3.1 Standard (type A, locaux secs EA et EB)

| Plaque | Épaisseur | Longueurs vendues (m) | Poids | Plaques par palette | État | Sources |
|---|---|---|---|---|---|---|
| Placo Placoplatre BA 13 | 12,5 mm | 2,00 / 2,40 / 2,50 / 2,60 / 2,65 / 2,70 / 2,80 / 3,00 / 3,20 / 3,60 | 9,0 kg/m² (26,85 kg en 2,50) | 50 jusqu'à 3,00 m ; 40 en 3,20 / 3,60 | ✔✔ (poids : ≠ levée, 10,2 = Placodur / Placoflam) | [R01-S1], [R01b], batiproduits [R01-B1] |
| Siniat Prégyplac Std BA13 | 12,5 mm | 2,00 / 2,40 / 2,50 / 2,55 / 2,60 / 2,65 / 2,70 / 2,80 / 3,00 / 3,20 / 3,60 | 8,9 kg/m² | 50 jusqu'à 3,00 ; 46 en 3,20 / 3,60 (suffixe « X50 » / « X46 ») | ✔✔ | [R01-S2], [R01b] |
| Knauf Standard KS 13 | 12,5 mm | 2,50 / 2,60 / 2,70 / 2,80 / 3,00 en négoce (plage 2,00 à 3,60) | 9,3 à 10,3 kg/m² (≠, sans effet sur la commande) | 50 | ✔✔ (longueurs, palette) | [R01b] |
| Placo BA 10 | 9,5 mm | 2,50 / 2,60 | 7,9 kg/m² | 66 | ? (fiche de 2012) | [R01-S10] |
| BA 15 | 15 mm | Siniat 2,50 / 2,60 / 3,00 (11 kg/m²) ; Placo : seulement le Placoflam BA 15 | — | — | ✔✔ Siniat ; ? Placo standard (aucune fiche France) | [R01-S13], [R01b] |
| BA 18 (1,20 m) | 18 mm | Siniat 2,50 / 2,60 / 2,80 / 3,00 (16,7 kg/m², type I) ; Placo : Placodur BA 18, Placomarine BA 18 | — | Placo 34 (fiche 2016) | ✔✔ Siniat ; ? Placo | [R01-S18, S19], [R01b] |
| Placo BA 18S / BA 25 (0,90 m) | 18 / 25 mm | 2,50 / 2,60 / 2,80 / 3,00 | 17,5 / 17 kg/m² | 34 / 36 | ✔✔ | [R01-S15, S12, S11] |
| BA13 600 (0,60 m) | 12,5 mm | 2,50 / 2,60 (Placo, Siniat, Knauf en grande surface) | 9,3 kg/m² | 103 (Placo) | ✔✔ largeur ; ✔ palette | [R01-S20, S21] |

### 3.2 Hydrofuges H1 (EB+ privatifs, EB+ collectifs avec SPEC ; parement vert)

| Plaque | Longueurs (m) | Poids | Palette | État | Sources |
|---|---|---|---|---|---|
| Placo Placomarine BA 13 | 2,50 / 2,60 / 2,65 / 2,70 / 2,80 / 3,00 | 10,3 kg/m² | 50 | ✔✔ | [R01 §2] |
| Siniat Prégydro BA13 | 2,00 / 2,50 / 2,55 / 2,60 / 2,65 / 2,70 / 2,80 / 3,00 | 8,9 kg/m² (≠ levée : 9,5 sur la fiche de 2025) | 50 ; 96 en 0,60 m | ✔✔ | [R01 §2], [R01b] |
| Knauf Hydro KH 13 | 2,50 / 2,60 / 2,70 / 2,80 / 3,00 | ≈ 9,5 kg/m² | 50 | ✔✔ | [R01b] |
| Siniat Prégywab (locaux très humides EB+c et EC, sous Avis Technique) | 2,50 / 2,60 / 3,00 | 10,8 kg/m² | 40 | ✔✔ | [R01 §2] |

Règle : la plaque H1 est exigée en EB+ privatifs et collectifs ✔✔ [R03-S3 p. 18 ; R03-S6]. En EC (hors DTU 25.41), seuls les procédés sous Avis Technique sont admis, jamais un BA13 H1 : Prégywab, Glasroc H Ocean, Aquapanel, Powerpanel H2O. Cette règle est déduite des fiches ? (texte du DTU non lu) [R01 §6].

### 3.3 Feu (type F, parement rose)

| Plaque | Longueurs (m) | Poids | Palette | État | Sources |
|---|---|---|---|---|---|
| Placo Placoflam BA 13 | 2,40 / 2,50 / 2,60 / 3,00 | 10,2 kg/m² | 50 | ✔✔ | [R01 §3] |
| Placo Placoflam BA 15 | 2,40 / 2,50 / 2,60 / 3,00 | 12,6 kg/m² | — | ✔ | [R01b] |
| Siniat Prégyflam Std BA13 | 2,50 / 2,60 / 2,80 / 3,00 | 11,5 kg/m² | 50 | ✔✔ | [R01 §3], [R01b] |
| Knauf Feu KF 13 | 2,50 (✔✔, réf. 50608) ; 3,00 (✔, une source) ; 2,60 seulement en Belgique et 2,80 seulement en Tunisie : ne pas proposer (recherche/20 §5) | — | 50 ? | ✔✔ / ? | [R01b] |
| Plaque feu et H1 à la fois | Placo Habito Hydro (type DFRIH1), Knauf Hydro Diamant 13 (D, F, I, H1) ; pas de « Placoflam hydro » | — | — | ✔✔ | [R01b] |

### 3.4 Phoniques (parement bleu)

| Plaque | Longueurs (m) | Poids | Palette | État | Sources |
|---|---|---|---|---|---|
| Placo Phonique BA 13 | 2,50 / 2,60 / 2,70 / 2,80 / 3,00 | 11,8 kg/m² | 50 ; 40 en 3,00 m | ✔✔ (fiche du 18/12/2023) | [R01b] |
| Siniat Prégyplac dB BA13 | 2,50 / 2,60 / 2,70 / 3,00 | 12 kg/m² | — | ✔✔ | [R01 §4] |
| Knauf Acoustique KA 13 Phonik | 2,80 / 3,00 | — | 50 | ✔ | [R01 §4] |

### 3.5 Haute et très haute dureté (charges lourdes : cuisines, radiateurs, TV)

| Plaque | Longueurs (m) | Poids | Palette | Charge par point | État | Sources |
|---|---|---|---|---|---|---|
| Placo Habito 13 (DFIR) | 2,50 / 2,60 / 2,70 / 3,00 | 12 kg/m² | **36** | 20 kg avec une vis à bois VBA Ø 5 sans cheville ; 60 kg avec une cheville métallique à expansion ; 40 cm au moins entre deux points | ✔✔ format ; charge ✔✔ (deux documents Placo) | [R01 §5], [R05 E] |
| Knauf Diamant 13 Cleaneo C (D, F, I) | 2,50 / 2,60 / 2,70 / 2,80 / 3,00 | ≈ 12,6 kg/m² | **40** | « jusqu'à 55 kg » ? (source de 2020, sans vis ni cheville) | ✔✔ format | [R01b] |
| Placo Placodur BA 13 (type I) | 2,50 / 2,60 / 2,80 / 3,00 | 10,2 kg/m² | 50 | — | ✔✔ | [R01 §5] |
| Siniat Prégydur BA13 | 2,50 / 2,60 / 2,80 / 3,00 | 11,7 kg/m² | — | — | ✔ | [R01 §5] |
| Fermacell 12,5 mm (fibres-gypse) | voir 3.6 | 15 kg/m² | — | 50 kg par vis avec cheville ; 30 kg par vis seule | ✔✔ | [R01 §6] |

Vis Habito : Habito 25 en boîte de 250, Habito 41 en boîte de 800 ✔ [R02b].

### 3.6 Fibres-gypse et plaques ciment

| Plaque | Formats | Poids | État | Sources |
|---|---|---|---|---|
| Fermacell bords droits | 10 / 12,5 / 15 / 18 mm ; 2,40 / 2,50 / 2,60 / 3,00 × 1,20 ; 1,50 × 1,00 ; 2,80 × 1,20 et 2,50 × 0,60 (10 et 12,5 mm) | 11,5 / 15 / 18 / 21 kg/m² | ✔✔ | [R01 §6], [R01b] |
| Fermacell bords amincis 12,5 mm | 2,50 / 2,60 / 2,80 / 3,00 × 1,20 (2BA ou 4BA) | — | ✔✔ | [R01b] |
| Fermacell : palettes | 48 (2,00 à 2,60 m), 40 (2,80 / 3,00) en 12,5 mm | — | ? (seule source : tarif 2010) | [R01 §6] |
| Fermacell 1,249 × 2,54 et 1,20 × 2,75 | introuvables en France | — | ? (ne pas proposer) | [R01b] |
| Vis Fermacell | 3,9 × 30 (simple peau), 3,9 × 45 (double peau), tous les 25 cm, 20 par m² et par face | — | ✔ (guide ancien) | [R02b] |
| Fermacell Powerpanel H2O (ciment) | 12,5 mm ; 1,20 m de large en France ; 1,00 / 2,00 / 2,60 / 3,01 m | 12,5 kg/m² | ✔✔ (≠ 1,25 m levée : format allemand) | [R01b] |
| Knauf Aquapanel Indoor (EB+c, EC) | 1,20 × 2,60 et 1,20 × 3,00 en France | 15 ? | ✔✔ formats | [R01b] |
| Placo Aquaroc 13 | 2,50 / 2,60 / 3,00 × 1,20 | 13,5 kg/m² | ✔✔ largeur | [R01 §6] |
| Placo Glasroc H Ocean 13 (EB+c, EC) | 1,20 × 2,60 ; 40 plaques par palette (Offre Placo 2024 et FDES de mai 2026 : 125 m² ; le 43 est écarté) | — | ✔✔ (recherche/20 §9) | [R01b] |

### 3.7 Cintrables, 4 bords amincis, techniques

| Plaque | Caractéristiques | État | Sources |
|---|---|---|---|
| Placo BA 6 | 6 mm × 1,20 × 3,00 m ; palette de 60 ; cintrage à sec au-delà d'un rayon de 900 mm | ✔✔ | [R01 §7] |
| Knauf Techniform 6,5 | rayon 1,00 m à sec, 0,25 m humidifiée | ✔✔ rayons ; ? format France | [R01 §7] |
| Siniat Synia Déco 4BA13 (plafond) | 2,40 / 2,50 / 2,60 / 2,80 / 3,00 ; 50 par palette | ✔✔ | [R01 §7] |
| Placo « 4BA » | 2,40 / 2,50 / 3,00 | ? | [R01 §7] |
| Placo BA 13 Activ'Air (dépolluante) | 2,50 / 2,60 / 3,00 ; pile de 50 | ✔✔ | [R01 §7] |
| Placoflex, Glasroc F Riviera, Siniat Weather Defence, Knauf Th38 | introuvables sous ces noms | ? | [R01] |

### 3.8 Complexes de doublage (plaque + isolant collé, vendus au panneau, 1,20 m)

| Complexe | Gamme, R, longueurs | Panneaux par palette | État | Sources |
|---|---|---|---|---|
| Placo Doublissimo (PSE graphité) | 2.75 13+80 ; 3.40 13+100 ; 3.80 13+120 ; 4.80 13+140 ; 5.45 13+160 ; 2,50 / 2,60 / 2,70 / 2,80 / 3,00 m ; seul le 2,60 m est livré en J+2 | 13 (13+80) ; 10 (13+100) | ✔✔ (13+80, 13+100) ; ✔ autres | [R01 §8], [R01b] |
| Placo Placomur (PSE) | 10+20 à 13+120 ; Placomur 2.75 13+80 en J+5/6 ; Essentiel 10+80 R 2,15 | 40 (10+20) ; 13 (13+80) | ✔✔ existence et R ; ✔ palette | [R01 §8], [R01b] |
| Isover Calibel SPV (laine de verre) | gamme 2021 : 10+40 (R 1,15) et 10+60 (R 1,75) en 2,50 m sur fabrication ; 10+80 (**R 2,35**) et 10+100 (R 2,9) en 2,60 m en stock | 23 / 16 / 13 / 10 | ✔✔ (≠ levée : R 2,40) | [R01b] |
| Siniat Prégytherm (PSE graphité) | BA10 ou BA13 + 20 à 160 mm, R 0,60 à 5,35 ; version Hydro | 40 (10+20) | ✔✔ gamme | [R01 §8] |
| Siniat Prégymax (thermo-acoustique) | 13+80 R 2,75 (Gedimat) ou 2,55 (Chausson) ; 13+120 R 3,80 | 12 ; 8 | ≠ (R du 13+80) | [R01 §8], [R06] |
| Knauf Polyplac | « 13+80 » = R 2,55 ou R 2,75 selon l'isolant (**la R se demande**) ; 13+100 R 3,15 / 3,40 ; 13+120 R 3,80 | 14 / 12 / 10 / 8 | ✔✔ | [R01b] |

Le comptoir vend le complexe au panneau ; la palette n'est qu'une information. Plus l'isolant est épais, moins il y a de panneaux par palette ✔✔ [R01 §8].

### 3.9 Au comptoir, pour une plaque

- **Désignation :** marque ou « équivalent », famille (standard, hydro, feu, phonique, haute dureté), épaisseur, largeur × longueur exacte, bords (BA par défaut, 4BA en plafond sans joint de bout, BD pour Fermacell), quantité en plaques ✔✔ [R01 §9 ; R06 B.1].
- **Unité de vente :** la plaque. La pile ou palette (50, 40, 36, 34…) est un conditionnement, jamais une obligation ✔✔ [R01-S1 ; R06]. Quéguiner et Chausson acceptent une saisie en m², convertie en plaques ✔✔ [R06 B.2].
- **Délais Placo :** J+2 pour les longueurs courantes ; J+5/6 pour 2,65 m, 3,60 m et Habito 3,00 m ✔✔ [R01 §9].
  - Une longueur rare peut ne pas être en stock : la fiche écrit la longueur exacte, et le négoce dira.

---

## 4. Famille B : les ossatures

### 4.1 Profilés

| Profilé | Section, épaisseur | Longueurs vendues | Conditionnement | État | Sources |
|---|---|---|---|---|---|
| Rail Placo Stil R 48 | 48 × 28 mm ; 0,53 mm ; 1,31 kg la barre | **3,00 m** (2,60 et 0,96 sur demande) ; pas de 4 m chez Placo | botte de 10 ; palette de 480 | ✔✔ | [R02-S10, S12, S13] |
| Rail R 62 / R 70 / R 90 / R 100 | 0,53 mm (R 70, R 90) | 3,00 m | botte de 10 | ✔✔ (R 70 / 90) ; ? (R 100) | [R02 A.1], [R02b] |
| Montant Placo Stil M 48 (aile 35 mm) | 0,59 mm ; 0,57 kg/ml | **2,49 / 2,59 / 2,69 / 2,79 / 2,99 / 3,19 / 3,59 / 3,99 m** (hauteur − 1 cm) ; 3,39 m en J+5/6 ; 4,99 m sur demande | botte de 10 ; palette de 480 | ✔✔ | [R02-S17, S18, S19] |
| Montant ML 48-50 (aile 50 mm, « renforcé ») | — | 2,99 / 3,59 / 3,99 | botte de 10 | ✔ | [R02-S22] |
| Montant Placo Stil M 70 (aile 40 mm) | 0,59 mm ; 0,73 kg/ml | 2,40 à 4,99 m ; plus de 2,69 m au tarif | botte de 10 ; palette de 250 | ✔✔ | [R02-S20, S21], [R02b] |
| M 90 / M 100 | — | 3,99 (M 90) ; 2,59 / 3,99 (M 100) relevées | — | ? | [R02 A.1] |
| Montants des marques de négoce (NF) | — | longueurs rondes 2,50 / 3,00 m (Samse, Brico Dépôt, Isolpro) | lots de 10 | ✔✔ | [R02-S14, S35], [R06] |
| Knauf (montants M48/35 à M150/50, fourrure F47) | 0,6 mm partout | F47 : 2,70 / 3,00 / 5,30 m | paquet de 10 | ✔✔ (F47) ; ? (longueurs des montants) | [R02 A.2], [R02b] |
| Fourrure Placo Stil F 530 | 45 × 18 mm ; 0,59 mm | **3,00 et 5,30 m** (pas de 4 m) | botte de 10 ; palette de 480 | ✔✔ | [R02-S23, S24, S25] |
| Rail Placo Stil F 530 (lisse de doublage) | 0,53 mm | **2,35 m** (l'ancienne piste disait 3 m : faux) | botte de 20 | ✔ | [R02-S26] |
| Cornière de rive Stil CR2 | 0,53 mm | 3,00 m | botte de 30 | ✔✔ (3 m, botte 30) | [R02-S27], [R02b], [R06] |
| Cornière Megastil 50 × 50 (grandes portées) | — | — | 0,085 ml/m² | ✔ | [R05 D] |
| Éclisse F 530 | 90 mm | — | boîte de 50 | ✔ | [R02-S28] |
| Suspentes Stil F 530 | courte 81 (plénum 20-60 mm), longue 171 (20-150), longue 240 (20-220), Maxi 300 (20-280), sécable (80-580), pivot (tige filetée), H / HL (hourdis) | — | 100 (courte, longue, Maxi, H, HL, SA) ; 50 (sécable, pivot) | ✔✔ | [R02 A.1], [R02b], [R06 B.1] |
| Suspente longue 240 | — | — | 50 (Placo 2024) ou 100 (Gedimat) | ≠ | [R06] |
| Appuis intermédiaires Optima2 (Isover) | 75 (laine 75-85), 100 (85-100), 120 (100-120), 140 (120-140), 75-160 réglable | — | boîte de 50 ; 40 pour le 75-160 | ✔✔ | [R02-S31, S32], [R03 §4.3] |
| Appui Rénovation Placo | — | — | boîte de 50 | ✔ | [R02b] |

### 4.2 Entraxes et fixation de l'ossature

| Règle | Valeur | État | Sources |
|---|---|---|---|
| Entraxe des montants (cloison, contre-cloison) | 0,60 ou 0,40 m ; plaques de 0,90 m : 0,45 / 0,90 | ✔✔ | [R02-S5b ; R02-S1] |
| Montants et plaques coupés | hauteur − 1 cm (jeu en pied) | ✔✔ | [R02-S5b, S17] |
| Fixation des rails au sol et au plafond | tous les 0,60 m au plus ; à plus de 5 cm du bord de la dalle | ✔✔ (60 cm) ; ✔ (5 cm) | [R02-S5b ; R02-S2 p. 103] |
| Fixation à moins de 10 cm du bout de chaque rail | aucune source ne le chiffre | ? (deux passes de recherche) | [R02 B], [R02b] |
| Plafond : entraxe des fourrures | 0,60 si l'isolant posé dessus pèse moins de 6 kg/m² ; 0,50 de 6 à 10 ; 0,40 de 10 à 15 | ✔✔ | [R02-S2 p. 101 ; R03-S48] |
| Plafond : plaques parallèles aux fourrures, ou plaques hydro (Placo) | 0,40 | ✔✔ (Siniat : 0,50 au-delà de 80 % d'humidité) | [R03 §5.1] |
| Distance entre suspentes le long d'une fourrure | 1,20 m | ✔✔ | [R02-S2 ; R02-S1] |
| Poids d'isolant admis sur un plafond | 15 kg/m² au plus | ✔✔ | [R03 §5.1] |
| Fixation d'une suspente sous bois | 2 vis TTPC 35 | ✔✔ | [R02-S2 ; R03 §5.1] |
| Sous dalle béton | cheville métallique Ø 6 (tige filetée + suspente HL ou cavalier), ou clou-cheville 6 × 40 (Knauf) | ✔✔ | [R02-S2 p. 102 ; R02-S39] |
| Sous hourdis | suspente H / HL enfoncée en force entre poutrelle et hourdis, sans cheville | ✔ | [R02-S2] |
| Doublage sur appuis | une ligne d'appuis à 1,35 m au plus jusqu'à 2,70 m de haut ; deux lignes (1,30 / 2,60 m) jusqu'à 4,50 m ; DTU 2022 : jusqu'à 5,30 m | ✔✔ | [R03 §4.3] |
| Joints de fractionnement | au droit des joints du gros œuvre ; tous les 300 m² ou 25 ml | ✔ | [R05 D] |

---

## 5. Famille C : les systèmes

Quantités pour 1 m² d'ouvrage (une face mesurée, vides non déduits), pertes de 5 % comprises.

### 5.1 Cloisons distributives : constitution, feu, acoustique, hauteurs maximales

| Cloison | Constitution | Feu | Rw+C | Hauteur max (m) : simples 0,60 / doublés 0,60 / simples 0,40 / doublés 0,40 | État | Sources |
|---|---|---|---|---|---|---|
| **72/48** (M48-35) | 1 BA13 + M48 + laine 45 + 1 BA13 | EI 30 | 37 à 39 dB (31 sans laine) | **2,50 / 3,05 / 2,75 / 3,40** | ✔✔ | [R03-S5 (DTU 2022), S6, S20] |
| 72/48 (M48-50) | idem | EI 30 | — | 2,55 / 3,20 / 2,95 / 3,60 | ✔✔ | [R03-S5, S4, S20] |
| 72/48 Placo « 2,60 m » | **ML 48-50** obligatoire | EI 30 | 39 dB | 2,60 en simples 0,60 | ✔✔ | [R03-S8, S9, S10] |
| **98/48** (M48-35) | 2 BA13 par face | EI 60 | 45 à 47 dB | **3,00 / 3,75 / 3,40 / 4,15** | ✔✔ ; règle changée le 20/11 : avant 3,70 (guide Rockwool seul), 3,75 chez Placo (sp00020105), Siniat et Pladur [R09 n° 30] | [R03-S5, S4, S20, S17 ; R09] |
| 98/48 (M48-50) | idem | EI 60 | — | 3,10 / 3,85 / 3,55 / 4,30 | ✔✔ | [R03 §1.1] |
| 100/70 | **1 BA15** par face, M70-50 | — | 39-41 dB | 3,55 / 4,45 / 4,05 / 5,05 | ✔✔ | [R03-S12, S20] |
| 120/70 (M70-40) | 2 BA13 par face | EI 60 | 47 dB | 3,90 / 4,90 / 4,45 / 5,40 | ✔✔ | [R03-S5, S20, S4] |
| 140/90 (M90-40) | 2 BA13 par face | EI 60 | 48 dB | 4,65 / 5,70 / 5,30 / 6,30 | ✔✔ | [R03 §1.1] |
| 150/100 | 2 BA13 par face | — | — | 5,10 / 6,20 / 5,75 / 6,85 | ✔✔ | [R03 §1.1] |
| 72/36, 120/90 | rares, absents des négoces | — | — | — | ≠ / ? (ne pas proposer par défaut) | [R03 §1.1] |
| Alvéolaire 50 / 60 mm, carreaux de plâtre | hors fiche (DTU 25.31 pour les carreaux) | — | — | — | ? (non traité) | [R03 §1.4] |

**Règles DTU 25.41 (2022) qui choisissent le système** [R03 §1.0] :
- La **72/48 n'est admise qu'en cas A** (logements, bureaux) ✔✔.
- En **cas B** (ERP, parties communes), il faut au moins 1 BA18 ou 2 BA13 par face, donc une 98/48 au minimum ✔✔.
- Épaisseur d'isolant admise en M48 : 30 à 45 mm ✔✔ [R03-S5, S6, S8].

**Montage tiré de la hauteur** : c'est la valeur par défaut de la fiche, dite et modifiable. On prend le montage le moins cher qui tient la hauteur ; les simples à 0,40 font environ 2,5 ml/m², contre 3,3 en doublés à 0,60 [R03 §1.1].

| Cloison | Simples 0,60 | Simples 0,40 | Doublés 0,60 | Doublés 0,40 | Au-delà |
|---|---|---|---|---|---|
| 72/48 | H ≤ 2,50 | ≤ 2,75 | ≤ 3,05 | ≤ 3,40 | passer en 98/48 ou 120/70 |
| 98/48 | H ≤ 3,00 | ≤ 3,40 | ≤ 3,70 | ≤ 4,15 | — |

**Quantités par m² de cloison 72/48** (SNIP 2024, sauf mention) :

| Article | Simples 0,60 | Simples 0,40 | Doublés 0,60 | Doublés 0,40 | État | Sources |
|---|---|---|---|---|---|---|
| Plaques | 2,10 m² | 2,10 | 2,10 | 2,10 | ✔✔ | [R02-S1 ; R03-S8, S20] |
| Montants | 2,10 ml | 2,89 | 3,68 | 5,25 | ✔✔ SNIP et Placo Intégrale 2021-22. Formule : n = L ÷ entraxe + 1 montants, et en doublés les deux montants de bout ne se doublent pas : (n + (n − 2)) × 1,05 [R09 n° 35] ; montants d'huisserie non compris | [R02 D.1 ; R09] |
| Rails | 0,84 ml à H 2,50 (= 2 ÷ H × 1,05) | idem | idem | idem | ✔✔ | [R02-S1 ; R03-S20] |
| Vis TTPC 25 | 30 | 37 | 35 | 47 | ✔✔ : SNIP et fiches solutions Placo actuelles (29,19 et 36,75 vis/m², vis des rails comprises) ; doublés : SNIP et guide Chausson ; le « 22 » venait d'une ancienne fiche Placo [R09 n° 6, 31 ; R13 A1-A2] | [R02 D.1 ; R09 ; R13] |
| Vis TRPF 13 | 2 | 3 | **6** | 7 | ✔✔ pour 2 et 6 (Placo + Chausson ; avant 5, SNIP) ; ≠ à 0,40 doublés (7 SNIP, 8 Chausson, 10 Placo) [R13 A4] | [R02 D.1 ; R13] |
| Isolant | 1,05 m² | — | — | — | ✔✔ | [R02-S1 ; R03-S8] |
| Bande | 2,80 ml | — | — | — | ✔✔ (Placo) ; ≠ Siniat 2,2 (joints seuls), Pladur 3,5 (angles compris) | [R05 A.2] |
| Enduit | 0,66 kg en poudre ; 0,94 kg prêt à l'emploi | — | — | — | ✔✔ | [R05 B.4] |

**98/48 (parement double), par m²** : plaques 4,20 m² ✔✔. Vis : 1re peau TTPC 25 10 / 14 / 13 / 18, 2e peau **TTPC 35** 27 / 34 / 32 / 42 (simples 0,60 / 0,40, doublés 0,60 / 0,40) ✔ [R02 D.2]. TRPF 2 / 4 / 6 ✔. Seule la 2e peau reçoit bande et enduit, aux mêmes ratios ✔✔ [R05 A.2]. Le 1er parement a des joints décalés et n'est pas jointoyé ? (règle d'usage, lue pour les plafonds) [R03 §3].

### 5.2 Cloisons séparatives (SAA, SAD)

| Système | Constitution | Hauteur max | Feu | Rw+C | État | Sources |
|---|---|---|---|---|---|---|
| Placo SAA 120 | 2 BA13 par face ; M48 alternés sur rail R70 ; laine 70 | 2,75 (M48 0,60) ; 3,00 (doublés 0,40) | EI 60 | 56 dB | ✔ (extraits) | [R03 §2.2] |
| Placo SAA 160 | 2 BA13 par face, M70 ou M90 alternés | 4,05 (M90 doublés) | EI 60 | 61 dB | ✔ | [R03 §2.2] |
| Placo SAD 160 | 2 BA13 par face, deux ossatures M48 indépendantes | 2,55 (M48 0,40) ; 2,75 (doublés 0,60) | EI 60 | ? | ✔ | [R03 §2.2] |
| Siniat S180 / S195 / S205 / S140 Twin / S180 Twin | 2+2 à 3+3 BA13, ou BA18 / BA25 en 0,90 m | 2,80 à 4,70 selon le système | EI 60 à EI 120 | 60 à 67 dB | ✔ (fiches Siniat 2026) | [R03-S33 à S38] |

Exigence entre logements neufs : DnT,A ≥ 53 dB (50 dB vers une cuisine ou une salle d'eau) ✔✔ [R03-S30, S31, S32].

- L'application **ne choisit jamais** le système acoustique ni feu : elle lit celui du devis (PV, étude acoustique) ✔✔ [R03 §7].
- **Quantités : aucun quantitatif fabricant SAA / SAD n'a été lu ?** La fiche les déduit de la constitution :
  - plaques 4,20 m²/m² ;
  - deux files de montants M48 ;
  - SAA : un rail large, R70 ou R90, haut et bas ;
  - SAD : deux rails R48 haut et bas ;
  - vis du parement double.

#### 5.2 bis Séparatives : quantités corrigées (septième vague, `recherche/21-separatives-saa-sad.md`, version `-7`)

Sources : DTA Siniat 9/11-922_V5 (valide du 02/09/2026, lu en entier), FDES Placo SAA 120, SAA 140, SAD 180, SAD 220, SAD 160 Duo'Tech (INIES 2024-2025), SNIP fiche 18, Knauf 2020, Pladur 2017.

| Point | Règle | État |
|---|---|---|
| Montants M48 en 2 + 2 BA13 | **toujours doublés** : 0,60 jusqu'à 2,75 m, 0,40 jusqu'à 3,00 m ; simples à 0,60 jamais admis ; au-delà de 3,00 m : M70 / M90 selon la fiche du système, ligne « à vérifier ». **Règle changée** : avant, deux files de montants simples à 0,60 | ✔✔ |
| Rails SAA | rail large (R70 pour M48, R90 pour M70) sur **tout le pourtour**, départs verticaux compris : (2L + 2H) × 1,05. **Règle changée** : avant 2L | ✔✔ |
| Rails SAD | deux rails haut et bas, 4L × 1,05 (inchangé) | ✔✔ |
| Ruban résilient | **d'office**, sous les rails **bas** seulement ; Placo Ruban Résilient 45, rouleau de 15 m (réf. H94960015) | ✔✔ (3 fabricants) |
| Mastic acrylique | joint en pied des deux faces (règle chez 3 marques) ; 100 cm³/m², ≈ 1 cartouche de 310 ml pour 3 m² (Placo seul) | règle ✔✔, quantité ✔ |
| Vis TRPF | doublés 0,60 : **10/m²** ; doublés 0,40 : **14/m²**. **Règle changée** : avant 4 | ✔✔ |
| Vis des plaques | doublés 0,60 : 15 (1re peau) / 35 (2e peau) ; doublés 0,40 : 21 / 47 (SNIP). Placo compte moins (32 au total) : écart de méthode sur le vissage des montants doublés, valeur haute gardée | contradiction expliquée |
| Plaques | 4,20 / 5,25 / 6,30 m² par m² en 2 + 2 / 2 + 3 / 3 + 3 ; « 2 + 3 » (SAD 180, KMA 23) et « 3 + 3 » (SAD 220, S195) se lisent au devis, vis TTPC 45 pour la 3e peau (une source) | ✔✔ (TTPC 45 : ✔) |
| Isolant | 1,05 m² par couche ; une couche en SAA, une ou deux en SAD selon le devis | ✔✔ |
| Entretoises en SAD | **aucune** : « aucune liaison entre les ossatures » | ✔✔ |
| Bande et enduit | 2,80 ml et 0,66 kg par m² (inchangé) | ✔✔ |
| Type SAA / SAD | lu dans le nom du système : SAA, SAD ; Knauf KMA 22-120/48 sur rail 70 = alternée, KMA 22-160/48 sur 2 rails = double ; Siniat S « rail commun » = alternée ; Pladur SA / SD | ✔✔ |
| Acoustique | le système se lit au devis, jamais choisi d'après les 53 dB (exigence en œuvre) ; RA de 56 dB (SAA 120) à 67 dB (SAD 220) | ✔✔ |

Reste à brancher (décrit, pas encore dans le moteur) : 2 + 3 et 3 + 3, montants M70 / M90 lus au système (SAA 140 = M70 simples sur R90 ; SAD 220 = M70 doublés). Incertain : Knauf en vigueur (catalogue 2020 seul), Fermacell (guide 2012), hauteurs Placo hors M48, largeur du ruban sous R70 / R90.

### 5.3 Doublages

**Doublage collé au mortier adhésif** (complexe ; NF DTU 25.42) [R03 §4.1] :

| Donnée | Valeur | État | Sources |
|---|---|---|---|
| Complexes | 1,05 m²/m², vendus au panneau de 1,20 m, longueur = hauteur − 1 cm | ✔✔ | [R03-S41, Placotherm] |
| Mortier adhésif (MAP) | **1,8 kg/m²** sur mur plan avec complexe PSE (10 plots de 10 cm, ≥ 15 mm d'épaisseur) ; **2,5 kg/m²** sur mur irrégulier ou complexe en laine minérale | ✔✔ : 1,8 = Siniat Prégycolle 120 (2026) et Placo (doublage 2017, Placotherm+) ; 2,5 = Placo DuoPass, Pladur, Knauf Mak 3. Le « 2 à 3 kg/m² » de la fiche produit MAP vaut pour tous les usages du mortier. Question « Ton mur est plan, ou irrégulier ? » (par défaut : plan ; « Calibel », « laine », « rénovation » lus au devis donnent 2,5) [R12] | [R05 C ; R03 §4.1 ; R12] |
| Planéité du support | 0-5 mm sans serrage ; 5-10 mm avec serrage ; plus de 10 mm : isolant entaillé ; collage plaque sur plaque supprimé (DTU 2022) | ✔✔ | [R03 §4.1] |
| Hauteur | complexes superposés au-delà de 2,50-3,00 m ; tasseau bois au-delà de 3,60 m (habitation) | ✔✔ | [R03 §4.1] |
| Bande et enduit | 1,40 ml/m² ; 0,33 kg/m² (poudre) ou 0,47 kg/m² (prêt à l'emploi) | ✔✔ | [R05 A.2, B.4] |

**Doublage sur fourrures et appuis** (type Optima, Siniat Clipstar, Pladur) [R03 §4.3 ; R02 D.3] :

| Donnée | Valeur | État |
|---|---|---|
| Fourrures | verticales à 0,60, une fourrure de 3 m par file jusqu'à 3,00 m ; **plus la fourrure horizontale chevillée au mur qui porte les appuis** (une par ligne d'appuis) | ✔✔ SNIP p. 11 et notice Isover Optima2 [R09 n° 40-41] ; règle changée le 20/11 (avant : verticales seules) |
| Appuis | une ligne jusqu'à 2,70 m, deux jusqu'à 4,50 m ; un appui par fourrure et par ligne (≈ 0,8/m² à 2,50 m, SNIP 0,80) | ≠ : Placo (ancien) 2/m², Pladur 1 |
| Appui choisi | selon l'épaisseur de l'isolant (Optima2 75 à 140) | ✔✔ |
| Rails F 530 haut et bas | 2 × longueur × 1,05, en longueurs de 2,35 m | ✔✔ |
| Vis TTPC 25 | 15/m² (SNIP) | ≠ : Placo 11, Pladur 26 |

**Contre-cloison sur montants** (autoportante) : hauteurs DTU 2022 en 1 BA13, entraxe 0,60 [R03 §4.2]. Quantités : SNIP D.4, rails 0,84 ml/m², vis 15 / 19, TRPF 2 / 5 ✔ [R02 D.4].

| Montant | Simples 0,60 | Doublés 0,60 | État |
|---|---|---|---|
| M48-35 | 2,00 | 2,40 (simples 0,40 : 2,25 ; doublés 0,40 : 2,65, Pladur ✔) | ✔✔ |
| M48-50 | 2,15 | 2,55 | ✔✔ |
| M70 | 2,50 | 3,00 | ✔✔ |
| M90 | 2,90 | 3,45 | ✔✔ |

### 5.4 Plafonds

**Sur fourrures F 530 et suspentes** (Placostil F530, Siniat S47, Pladur T-45), par m² :

| Article | Entraxe 0,60 | 0,50 | 0,40 | État | Sources |
|---|---|---|---|---|---|
| Plaques | 1,05 m² par peau | idem | idem | ✔✔ | [R03-S47, S41] |
| Fourrures | **1,79 ml** | 2,10 | 3,0 (Placo seul ✔) | ✔✔ à 0,60 : SNIP et fiche Placo sp00012110 (le « 2 » de l'Intégrale 2023 est un arrondi) ; ✔✔ à 0,50 | [R09 n° 46 ; R13 E1] |
| Suspentes | **1,56** | 1,84 | 2,7 | ✔✔ à 0,60 : SNIP et fiche Placo sp00012110 (règle changée le 20/11 : avant 1,8). L'écart 1,56 / 1,8 vient de la taille de la pièce : une petite pièce (4 × 4 m) demande environ 1,75 ; la boîte de 100 couvre l'écart. ✔ à 0,50 (Pladur 1,75 à 5 % près) ; ✔✔ à 0,40 (Placo + calcul à la pièce 2,63) | [R09 n° 47-48 ; R13 E1-E2] |
| Éclisses | une par aboutage : fourrures (ml) ÷ 3 m (fourrures commandées en 3 m) | idem | idem | ✔✔ (calcul ; le 0,21/m² du SNIP suppose des fourrures de 5,30 m) ; règle changée le 20/11 | [R13 E3] |
| Vis TTPC 25 (1 BA13) | **12** (SNIP) ; 10 (Placo 2023) ; 15 (Placo sp00012110) ; 8 (Pladur) | **14** ✔✔ (SNIP + Chausson) | 15 (Placo seul) | ≠ à 0,60 : chaque marque compte ses vis de rive à sa façon ; SNIP retenu | [R02 D.5 ; R13 E4-E6] |
| Vis, 2 BA13 | 1re peau 8 à 0,60 (SNIP, gardé pour la marge ; Placo 3) ; **4 à 0,50** ✔✔ (Placo + Pladur) ; 2e peau 12 (TTPC 35) | — | — | ✔✔ / ≠ | [R02 D.5 ; R13 E7] |
| Vis TRPF | **0** : suspentes et éclisses Stil F 530 clipsées, sans vis (règle changée le 20/11 : avant 4/m², SNIP, qui suppose des suspentes vissées) | idem | idem | ✔✔ Placo Intégrale 2023 p. 103-105 et Pladur 2019 | [R09 n° 61] |
| Cornière ou rail de rive | au périmètre réel (SNIP 0,47 ml/m² pour une pièce de 8 × 10 m) | — | — | ? (la fiche **estime** le périmètre d'une pièce carrée et le dit) | [R02 D.5 ; R05 D] |
| Bande / enduit | 1,40 ml ; 0,33 / 0,47 kg | idem | idem | ✔✔ | [R05] |

- **Choix de la suspente selon le plénum :**
  - courte 81 : 20 à 60 mm ;
  - longue 171 : 20 à 150 mm ;
  - longue 240 : jusqu'à 220 mm ;
  - Maxi 300 : jusqu'à 280 mm ;
  - sécable : 80 à 580 mm.
  - Sources ✔✔ [R06 B.1 ; R02b].
- **Charge par suspente :** 38 kg ; poids admissible du plafond 55 kg/m² ✔ [R03 §5.1].
- **Plafond fixé directement sous solives :** le DTU 2022 supprime le dimensionnement des ossatures bois ?. La fiche passe par fourrures et suspentes ; la BA13 vissée directement n'est pas traitée [R03 §5.3].
- **Sous rampants :** mêmes ossatures. Les suspentes Intégra 2 (Isover), qui laissent passer la membrane, ne sont pas encore chiffrées ? (piste : 1,8/m²) [R03 §5.4 ; R04 D].
- **Ossature primaire et secondaire** (Placo Stil Prim 100) ✔, par m² :
  - profilé primaire 1 ml ;
  - suspente ¼ de tour 0,3 ;
  - F530 2 ml ;
  - TRPF 1.
  - Pas d'ouvrage dans `referentiel.json` (rare en maison individuelle). Équivalent Knauf D112 ? [R03 §5.2].
- **Feu des plafonds sous plancher bois** ✔ par fabricant : REI 15 = 1 BA13 ; REI 30 = 1 Placoflam BA15, 1 BA18 ou 2 BA13 ; REI 60 = 2 BA18 [R03 §5.5]. Toujours lire le PV exigé au devis.

### 5.5 Gaines techniques, coffrages, habillages

| Ouvrage | Quantités | État | Sources |
|---|---|---|---|
| Gaine technique verticale Pladur 200 × 200, deux faces, H 2,60 (par ml de gaine) | plaques 2,18 m² ; rails 0,84 ml ; montants 10,92 ml ; vis 20 + 58 ; TRPF 17 ; bande 9 ml ; enduit 2,01 kg | ✔ (Pladur seul) | [R03 §6] |
| Joints à l'intérieur des gaines | non réalisés (DTU 2022 § 6.1.4.2.6) | ✔ | [R03-S3] |
| Coffrage, soffite, habillage d'IPN | aucun quantitatif fabricant lu ; la piste « développé de 0,60 m » n'est pas sourcée | ? | [R03 §6] |

Pas d'ouvrage « coffrage » dans `referentiel.json` : la ligne part telle qu'écrite au devis, et le fournisseur la chiffre. C'est le dernier recours de Mobiiz : un ratio inventé vaut moins.

### 5.6 Coupe-feu et acoustique : ce que les ouvrages imposent

- Le DTU ne traite ni le feu ni l'acoustique : il faut un **PV d'essai ou de classement**. Mobiiz lit le système du devis, il n'en déduit jamais un EI ✔✔ [R03-S3 ; S6, S7].
- 72/48 = EI 30 ; 98/48 = EI 60 ; 3+3 BA13 = EI 120 ✔✔ [R03 §7].
- Montage feu : vis tous les 15 cm (au lieu de 30), donc deux fois plus de vis ✔ [R02 C.2 ; R03 §5.1]. La fiche ne le calcule pas encore ? (à ajouter quand le devis dit « EI » : prévu en section 17).
- Cloison EI 60 avec boîtiers électriques standards : hauteur limitée à 4 m ✔ [R03 §7].
- Bande résiliente sous rail : 1 ml par ml de rail posé contre le gros œuvre ✔✔. Tramiband SR : 45 ou 65 mm × 3 mm × 30 m ✔✔ [R05 E].
- Mastics :
  - coupe-feu Hilti CFS-S ACR, cartouche de 310 ml, environ 1 cartouche par ml pour un joint de 30 × 10 mm ✔ ;
  - rendement de n'importe quelle cartouche de 310 ml : 310 000 ÷ section en mm² (Ø 8 mm ≈ 6,2 m) ✔✔ [R05 E] ;
  - mastic acoustique Placo, mousse coupe-feu : ? (non trouvés).

### 5.8 Coupe-feu : systèmes courants par marque (décision de Greg, 20 novembre 2026)

**Règle.** Le classement se lit au devis, il ne se déduit jamais : EI, REI, « CF », « coupe-feu », PV. Dès qu'il est écrit, Mobiiz pose **une seule question** : « Ton système coupe-feu, c'est quelle marque ? » (Placo / Knauf / Siniat). Ensuite :
- chaque ligne du système porte cette marque (plaques, montants, rails, fourrures, suspentes, éclisses, cornières, vis, laine), **jamais « ou équivalent »** ;
- la précision dit « système coupe-feu EI xx, marque unique selon son procès-verbal ».

Chaque marque dit que ses performances ne valent qu'avec ses propres composants ✔✔ [R11 §4.1].

**Souvent, la plaque ne change pas.** En 72/48 EI 30 et en 98/48 EI 60, les trois marques utilisent des plaques **standard**. Le moteur ne passe donc pas en plaque feu par réflexe [R11 §4.2]. ✔✔ (3 marques)

| Classement | Placo | Siniat | Knauf | État |
|---|---|---|---|---|
| EI 30, 72/48 | 1 BA13 standard par face, M48, laine minérale 45 (PV RS 15-019) | 1 Prégyplac BA13 par face, M48-35, laine de verre 45 (EFR-24-005466), 2,50 à 3,40 m | 1 KS 13 par face, M48/35, laine minérale obligatoire, H ≤ 3,00 m (06-V-263) | ✔✔ |
| EI 60, 72/48 | 1 **Placoflam** BA13 par face, M48 **doublés à 0,40**, laine minérale 45, 3,45 m (RS 15-020) | **n'existe pas** : passer en D106/70 (BA18) ou D100/70 Flam (Prégyflam BA15) | 1 **KF 13** par face, M48 doublés à 0,40, laine de verre 45 mm 12 kg/m³ obligatoire, feuillard aux joints horizontaux, 3,40 m (EFR-19-V-002073) | ✔✔ (Placo, Knauf) |
| EI 60, 98/48 | 2 BA13 standard par face, M48 simples à 0,60, 3 m (sp00018909) | 2 Prégyplac BA13 par face, M48-50 (06-V-052) | 2 KS 13 par face (07-A-234) | ✔✔ |
| EI 90 | non trouvé | non trouvé | 98/48 KS 13 + KF 13 par face | ✔ |
| EI 120, 98/48 | 2 Placoflam par face, M48-50 à 0,60, sans isolant, 3,10 m (RS 15-022) | D102/48 EI 120 : 2 + 1 Prégyplac BA18 sur M48-35 (48 + 3 × 18 = 102 mm ; extrait de la fiche Siniat, isolant à confirmer), ou séparatives S195 / S205 en 3 + 3 BA13 | 2 KF 13 par face, jusqu'à 4,35 m | ✔✔ (Placo, Knauf) ; ? Siniat |
| Plafond REI 60 sous plancher | montage Stil Flam (remplace le PRF) : 2 Placoflam BA13, fourrures à 0,60, entretoises Stil Flam 1,7/m², vissage comme un plafond standard (13 vis/m² en peau visible, à confirmer) (FDES Placo INIES 2024-2026, recherche/20 §1-2) | 2 Prégyflam BA13 ou BA15, fourrures S47 à 0,50, suspentes à 1,10 m (✔✔) ; REI 30 sous bois : 2 BA13 standard, fourrures à 0,50, suspentes à 1,15 m (PV EFR-16-002661, ✔) ; vissage non publié | Métal Chrono : 1 KF BA15 (principe seulement) | ✔✔ plaques ; ✔ montage |
| Gaines | trappes coupe-feu 30, 60, 120 min (gaine non trouvée) | D72/48 sur montants accolés (EI 30), D84/48 BA18 S (EI 60) | KM 72/48 KS 13 + laine ; trappes Star GT 18 / GT 25 | ✔ |

**Négoce sans la marque (Greg, 20/11)** : il peut proposer un système complet d'une autre marque avec son procès-verbal, signalé clairement à l'artisan ; jamais de mélange de marques.

**Ce que fait `referentiel.json`** (ouvrages `cloison-distributive` et `plafond-fourrures`) :
- donnée `ei`, lue au devis (« EI 60 », « REI 60 », « CF 1h ») ; par défaut 0, « pas d'exigence feu écrite » ;
- question `marque_systeme` ; elle n'est posée que si `ei` est écrit ;
- toutes les lignes du système en version « marque » ;
- plaque par défaut selon le classement : standard en 72/48 EI 30 et en 98/48 EI 60 ; feu en 72/48 EI 60 et en 98/48 EI 120 ;
- 72/48 EI 60 : montants doublés à 0,40 par défaut ;
- 72/48 coupe-feu : **laine minérale 45 mm de la marque obligatoire** (sortie d'office, « obligatoire si ») ;
- plafond coupe-feu : deux plaques par défaut à partir de REI 60, peau visible vissée comme un plafond standard avec Stil Flam (13 vis/m², FDES Placo, à confirmer) ; les 23 vis/m² ne valaient que pour l'ancien PRF.

**Pas encore généré, à préciser au comptoir** (jamais inventé) [R11 §4.4] :
- le mastic ou la bande intumescente en pied et en tête de cloison ;
- la protection des boîtiers électriques ;
- les entretoises PRF Placo ;
- le feuillard Knauf aux joints horizontaux ;
- le système Siniat qui remplace la 72/48 EI 60 ;
- les hauteurs Knauf (catalogue 2020, antérieur au DTU 2022) ;
- la gaine Placo ; les plafonds rampants des trois marques.

#### 5.8 bis Compléments coupe-feu (septième vague, `recherche/22-coupe-feu-systemes.md`)

Seul Placo publie des FDES de systèmes coupe-feu (base INIES) ; Siniat et Knauf n'y ont que des plaques. Les quantités au m² d'un système feu viennent donc de Placo ; les autres marques se chiffrent avec les ratios du même montage standard.

| Point | Règle | Source | État |
|---|---|---|---|
| 98/48 EI 120 Placo (2 Placoflam BA13 par face) | **3,00 m avec laine** (avant 3,10 m, valeur de la fiche système sans isolant) | FDES INIES 38678 (25/07/2024), PV RS 15-022 + ext. 21/1 | ✔✔ (écart expliqué par l'isolant) |
| 98/48 EI 120 Placo au-delà de 3,00 m | 1 Placoplatre **BA 25** standard par face, M48, **3,80 m**, PV RS 11-044, isolant de la fiche (Isonat Flex 40) ; par m² : BA 25 2,1 m², M48 2,63 ml, R48 0,55 ml, 18 vis, bande 3,44 ml, enduit 0,92 kg | FDES INIES 48876 (19/02/2026) et 47773 (02/12/2025) | ✔ (un éditeur, deux fiches) |
| EI 60 en montants simples | Placo 100/70, 1 Placoflam BA 15 par face, M70 à 0,60, 3,40 m ; Siniat D100/70 Flam. La 72/48 Placoflam doublée à 0,40 reste le défaut quand le devis écrit « 72/48 » | fiche système Placo (extrait de moteur), brochure Isonat ERP, fiche Siniat | ✔ / à confirmer |
| EI 90 | Aucun système Placo ni Siniat ; Knauf seul (catalogue 2020). Quand le devis dit EI 90 et que la marque n'en a pas : **le système EI 120 de la marque**, dit à l'artisan (une classe supérieure couvre la classe demandée) | Offre Placo 2024, fiches Siniat, catalogue Knauf 2020 | ✔✔ (absence constatée chez deux marques) |
| Isolant d'un système feu | **l'isolant de la fiche du système choisi** (laine minérale 45 en 72/48 ; fibre de bois Isonat Flex 40 pour le 98/48 BA 25) ; jamais un isolant hors PV | FDES 48876, PV Placo et Siniat | ✔✔ |
| Vissage, bande, enduit d'une cloison feu | Identiques au standard : aucune ligne « vis feu » ni « enduit feu » | FDES Placo 38678, fiches Siniat | ✔✔ |
| Boîtiers électriques | Décalés d'une face à l'autre, ou protégés selon le PV : ligne « à préciser », jamais un capot sorti d'office | fiches système Placo, PV Pladur | ✔✔ |
| Gaine technique (logement collectif) | Paroi coupe-feu ½ h : une BA 13 de chaque côté suffit ; trappe ¼ h sous 0,25 m², ½ h au-delà ; Placo Easy Stil EI 30, 3,00 m, PV sur demande : ligne « système de gaine selon PV, à chiffrer » | FFB 2016, Knauf, Siniat ; Easy Stil : une source | ✔✔ / ✔ |
| Plafond autoportant REI 120 | 2 BA 25 standard sur montants (Placo PV RS 21-008 ; Siniat M125-50 accolés à 0,50, portée 3,70 m, EFR-17-000920). REI 30 / 60 autoportants Placo : estimation sans PV, à dire comme telle | Placo, Siniat | ✔✔ |
| Protection de poteaux et poutres acier | Système dédié de la marque (Siniat R 120 ; Knauf CC) : ligne « à préciser », pas d'ouvrage dans le moteur | fiches Siniat, catalogue Knauf | ✔ |
| Mastic intumescent de périphérie | Aucune fiche lue ne l'exige : rien d'office | FDES et fiches Placo, Siniat | ✔✔ |
| Trappe coupe-feu en « tout Siniat » | Siniat France n'en vend pas : trappe d'un autre fabricant avec son propre PV, ligne « à préciser » | catalogue Siniat | ✔ |

Reste incertain : Knauf entier (catalogue 2020, site illisible), fiche Siniat D102/48 (erreur serveur), vis des plafonds feu Siniat et Knauf, Fermacell et Pladur (aucun document français en vigueur lisible). Règle d'ouverture : le moteur ne chiffre aujourd'hui que la 72/48 et la 98/48 feu ; le 98/48 BA 25, le 100/70 et le plafond autoportant sont décrits ici et seront à ajouter comme ouvrages au branchement.

### 5.7 Locaux humides

| Règle | Valeur | État | Sources |
|---|---|---|---|
| Classement | EA ; EB ; EB+ privatifs ; EB+ collectifs ; EC (hors DTU 25.41) — Cahier CSTB 3567_V2 | ✔ | [R03-S3 p. 18] |
| Plaque H1 | exigée en EB+ privatifs et collectifs | ✔✔ | [R03-S3 ; S6, S7] |
| SPEC sous carrelage | EB+ collectifs : sur 2 m de haut au moins, plus des bandes de renfort sol / mur ; EB+ privatifs : dispensable si enduits et mortier de rebouchage sont hydrofugés | ✔ | [R03-S3 p. 17] |
| Entraxe des montants sous carrelage | en parement simple (BA13, BA15), carreaux de **plus de 1 600 cm²** en pièce humide privative : montants à **0,40 m** | ✔✔ (AQC, FAQ Knauf, guide DTU 2022) | [R07] |
| Plafond en plaques hydro | entraxe des fourrures 0,40 (Placo) | ≠ (Siniat : 0,50 au-delà de 80 % d'humidité) | [R03 §8] |
| Rampants en EB+ | plaques H1 jusqu'à 1,80 m du sol fini | ✔ | [R03-S3] |

---

## 6. Famille D : fixations et quincaillerie

| Article | Règle de choix | Conditionnement | État | Sources |
|---|---|---|---|---|
| Vis TTPC (plaque sur ossature métallique, profilés de 6/10) | longueur ≥ épaisseur des plaques + 10 mm : TTPC 25 = 13 mm ; **TTPC 35 = 25 mm** (2 BA13, et aussi une BA15 ou une BA18 seule) ; TTPC 45 = 35 mm ; TTPC 55 = 45 mm ; TTPC 70 = 60 mm. Sur bois : + 20 mm | 25 et 35 : boîtes de 500 / 1000 / 1500 (Placo), 1000 (marques de négoce) ; 45 : 500 / 1500 ; 55, 70, 80 : 300 (Placo) ou 500 ; 90 : 250 ; seau de 10 000 ; vis en bande pour visseuse automatique, boîte de 1000 | ✔✔ (fiches Placo 2023-2026 via Samse et BigMat) | [R02 C.1, C.3 ; R02b] |
| Correction de la 1re passe | la 2e peau de 2 BA13 se visse en **TTPC 35, pas 45** ; une BA15 en TTPC 35, pas 25 | — | ✔✔ | [R02b] |
| Entraxe de vissage | 30 cm sur montants (plaques de 1,20) ; 25 cm (plaques de 0,90) ; 1re peau d'un parement double : 60 cm ; plafond : 30 cm (15 cm en montage feu) ; à 1 cm au moins des bords ; pas de vissage en quinconce | — | ✔✔ | [R02 C.2 ; R03 §1.0] |
| Vis TRPF 13 (métal-métal) | montant sur rail haut et bas (0 vis si serti) ; montants doublés ; TRPF 25 pour M 100 / M 150 | boîte de 500 (Placo) ; 1000 (TEX Klimas 3,5 × 9,5) | ✔✔ usage ; ≠ boîte selon la marque | [R02 C.1, C.3 ; R02b] |
| Clous de cloueur à gaz (rails, cornières, suspentes) | le clou va avec SON cloueur : Spit Pulsa, clous C6 (béton) 20 à 40 mm, HC6 (béton dur), CW6 (bois) ; Hilti GX 3, clou X-C 20 G3 MX pour rail sur béton | Spit : 500 clous + 1 cartouche, ou 1500 + 3 ; Hilti : boîte de 1200, gaz GC 40/41/42 | ✔✔ (Spit) ; ✔ (Hilti) ; ? tirs par cartouche | [R02 C.4 ; R02b ; R06 B.1] |
| Chevilles à frapper (rails) | 6 × 40 (5 × 25 citée pour les rails dans un catalogue de 2008) | sachet de 50, boîte de 100 ou 200, seau de 800 | ✔✔ format ; ? usage « rail » non écrit par un fabricant | [R02 C.4 ; R02b ; R06] |
| Fixation d'une suspente | bois : 2 TTPC 35 ; béton : cheville métallique Ø 6 ou clou-cheville 6 × 40 ; hourdis : suspente H / HL | — | ✔✔ | [R02-S2] |
| Charges sur BA13 standard | cheville métallique à expansion (type Molly) : 15 à 30 kg selon des sources grand public | — | ? (aucune source fabricant) | [R05 E] |
| Renforts de charges lourdes (traverse métallique, platine bois entre montants) | aucune référence ni conditionnement trouvés | — | ? | [R05 E] |

**Quantité de fixations de rail retenue :** une tous les 60 cm de rail, arrondie au-dessus (≈ 1,67 par ml). Le pas de 60 cm est ✔✔ ; la fixation de bout de barre n'est pas comptée ? [R02 C.4].

---

## 7. Famille E : finitions

| Article | Valeur | Conditionnement | État | Sources |
|---|---|---|---|---|
| Bande à joint papier micro-perforée | **1,40 ml par m² de parement** (plafond, doublage) ; 2,80 par m² de cloison | rouleau de **150 m** × 50 mm (Placo, Knauf) ou 51 mm (Siniat) ; petit rouleau de 23 m ; carton de 10 | ✔✔ ; ≠ Siniat 1,1 (joints entre plaques seuls), Placo retenu | [R05 A] |
| Rouleau de 75 m, largeur 52 mm Placo | introuvables chez les fabricants (52 mm : PSI Groupe seulement) | — | ? | [R05 A.1] |
| Bande armée d'angle saillant | **obligatoire sur chaque angle saillant** (NF DTU 25.41 § 6.1.4.2.3, cité par Knauf) ; 1 ml par ml d'angle | rouleau de 30 m × 50 / 51 mm | ✔✔ | [R05 A.1, A.2] |
| Bande fibre de verre autocollante | pas une bande de joint du DTU (sauf Placo Hydro Tape en plafond hydro) | — | ? | [R05 A.1] |
| Enduit à joint en poudre (Placojoint PR4, PR2, SN, Siniat Prégylys, Semin CE 78) | **0,33 kg/m² de parement** (Siniat 0,30-0,35) | sac de 25 kg (5 kg existe) ; palette de 50 sacs (Siniat) | ✔✔ | [R05 B.1 ; R05-S5, S1, S3] |
| Enduit prêt à l'emploi (Placomix, Siniat Prégy S, Semin Perfect'Joint) | **0,47 kg/m²** (Placomix Pro : 0,525 ; Prégy S : 0,45 ; versions allégées 0,30-0,40) | seau de 25 kg (Placomix, Prégy S ; Gedimat) ; Placomix Pro 22 kg, Pro Allégé 17 kg ; Prégy S aussi 7 kg | ✔✔ ; ≠ selon le produit | [R05 B.2 ; R06 B.3] |
| Enduits hydrofuges (pièces humides) | Placojoint PR Hydro 0,33 kg/m², Placomix Hydro 0,47 kg/m², Siniat Prégydro | sac de 25 kg ; seau de 10 kg (Prégydro PE) | ✔✔ | [R05 B.3] |
| Enduit de lissage / ratissage | hors ratios « jointoyé avec bande » : seulement s'il est écrit (Siniat Prégy L : 0,8 kg/m² par mm) | seau de 20 kg | ✔ | [R05 B.3] |
| Mortier adhésif (MAP Formule +, Siniat Prégycolle 120, Knauf Mak 3) | voir 5.3 (1,8 kg/m², ≠) | sac de 25 kg (10 kg et 5 kg existent) ; palette de 35 ou 63 (Placo), 50 (Siniat) | ✔✔ formats | [R05 C] |
| Knauf Perlfix | pas trouvé dans l'offre Knauf France (Mak 3 à la place) | — | ? | [R05 C] |
| Cornière d'angle métal perforée | barre de 2,50 m (Placo) ou 3,00 m (générique, Knauf 31/31) ; prendre la barre ≥ hauteur de l'angle | barre | ✔✔ | [R05 D] |
| Pertes sur bande et enduit | aucune valeur publiée (les ratios sont « jointoyé avec bande ») | — | ? (0 % proposé) | [R05 G] |

Fiche environnementale Placo 2026 du BA13, pour 1 m² posé : 12 vis, 1,23 m de bande et 0,333 kg d'enduit. C'est un recoupement de l'enduit en poudre ✔ [R01b].

---

## 8. Famille F : isolation

### 8.1 Rouleaux et panneaux

| Produit | λ | Épaisseurs → R | Format, m² par colis | État | Sources |
|---|---|---|---|---|---|
| Isover GR 32 Roulé Revêtu Kraft (doublages, Optima) | 0,032 | 60 → 1,85 ; 75 → 2,35 ; 85 → 2,65 ; **100 → 3,15** ; 120 → 3,75 ; 140 → 4,35 ; 160 → 5,00 | 1,20 m de large ; 100 à 160 mm : 2,70 m = **3,24 m²** ; 60 / 75 mm : 9,72 m² ; 85 mm : 6,48 m² | ✔✔ (fiches de 2026 et 2024, ACERMI 02/018/100) | [R04 A1.1] |
| Isover GR 32 Nu (panneaux, cloisons) | 0,032 | **45 → R 1,40** (≠ levée : 1,45 sur l'ancienne fiche) ; 60 → 1,85 ; 100 → 3,15 | 1,35 × 0,60 ; 45 mm : paquet de 15 = **12,15 m²** | ✔✔ R ; ✔ colisage | [R04 A1.2, A5] |
| Isover Isoconfort 32 en 45 mm | **n'existe pas** (erreur de désignation fréquente : proposer GR 32 Nu 45) | — | — | ✔✔ (deux certificats ACERMI) | [R04 A1.5] |
| Isover Isoconfort 35 Revêtu Kraft (rampants) | 0,035 | 160 → 4,55 ; 200 → 5,70 ; **220 → 6,25** ; 240 → 6,85 ; 260 → 7,40 ; 300 → 8,55 | 200 mm : 3,60 m² ; 220 mm : 3,36 m² ; 240 mm : 3,12 m² (longueurs de la fiche de 2026) | ✔✔ R ; ✔ longueurs 2026 | [R04 A1.3] |
| Isover IBR Revêtu Kraft (combles perdus) | 0,040 | 100 → 2,50 ; 200 → 5,00 ; 260 → 6,50 ; **300 → 7,50** ; 400 → 10 | 100 : 9,60 m² ; 200 : 5,40 m² ? ; 300 : 3,12 m² ; 400 : 2,40 m² | ✔✔ R (ACERMI 02/018/052) ; colis selon la ligne | [R04 A1.6] |
| URSA PRK 32 | 0,032 | 45 → 1,40 | 1,35 × 0,60 ; 10,53 m² (13 panneaux) | ✔✔ | [R04 A3, A5] |
| Rockwool Rockmur nu / kraft | 0,035 | **40 → 1,10** (le 45 mm a disparu de la fiche de janvier 2026) | 1,35 × 0,60 ; 9,72 m² (nu) / 11,34 m² (kraft) | ✔✔ | [R04 A2.1, A5] |
| Rockwool Rockcalm, Rockplus Premium, Roulrock | voir R04 A2 | — | — | ✔ à ✔✔ | [R04 A2] |
| Knauf Ultracoustic P 45 | — | 45 → 1,20 | 12,96 m² (16 panneaux) | ✔✔ R ; ✔ colis | [R04 A5] |
| Laine de bois Steico Flex 036, Gutex Thermoflex, Pavaflex ; coton Métisse RT ; Biofib'Trio | 0,036 à 0,039 | tableaux ACERMI 2025-2026 | — | ✔ (ACERMI) | [R04 A6] |
| PSE sous chape Knauf Therm Chape Th38 | — | 20 mm → R 0,50 … 200 mm → R 5,25 | 2,50 × 1,20 m ; 1,05 m² par m² traité | ✔✔ | [R07] |
| XPS Styrodur 3035 CS (diffusé par Placo) ; Ravatherm XPS 300 ST | 0,029 (Ravatherm) | 30 à 120 mm ; R du Styrodur 3035 CS : 0,90 / 1,45 / 1,75 / 2,85 à 30 / 50 / 60 / 100 mm (✔✔, déclaré par BASF) ; aucun certificat ACERMI en cours dans la liste officielle au 20/11/2026 : ne jamais écrire « certifié ACERMI » | 1,25 × 0,60 à feuillure, 7 à 14 panneaux par colis | ✔ / ? | [R07] |
| Efigreen (polyuréthane) | — | — | toiture-terrasse en 0,60 × 0,60 : hors métier plaquiste | ✔✔ | [R07] |
| Isolants minces | — | « en observation » à la commission prévention produits de l'AQC (C2P) ; R mesuré selon NF EN ISO 22097. Afficher le R de l'isolant seul, jamais « avec lame d'air ». Hybris 31 n'est pas un mince (λ 0,031, 1,20 × 2,70 / 2,80) | — | ✔✔ | [R07] |
| URSA XPS, polyuréthane nu, Actis Triso | — | — | — | ? (quota de recherche) | [R07] |

**Au comptoir, pour un isolant**, il faut [R04 F ; R06 B.1] :
- la famille et la marque (ou « équivalent ») ;
- la gamme et son λ : un « 100 mm » sans gamme ne se chiffre pas ;
- l'épaisseur ou le R ;
- nu, kraft ou alu ;
- rouleau ou panneau, et le format.

**Les longueurs de rouleau changent d'une édition de fiche à l'autre** (le R reste stable). Un m² par colis n'est écrit qu'avec la date de sa fiche ✔✔ [R04 constat].

### 8.2 Vrac à souffler (NF DTU 45.11)

Le nombre de sacs se lit sur le **certificat ACERMI** du produit, jamais par une densité. Le certificat donne le R **après tassement** et l'épaisseur minimale à souffler ; rien n'est à ajouter pour le tassement ✔✔ [R04 B1, B2].

| Produit | Sac | Sacs pour 100 m² : R 5 / 6 / 7 / 8 / 10 | Épaisseur à souffler à R 7 | État | Sources |
|---|---|---|---|---|---|
| Isover Comblissimo (laine de verre) | 17,3 kg | 15,6 / 18,7 / **21,8** / 24,9 / 31,2 | 330 mm | ✔✔ (ACERMI 07/D/018/474/28, 2025, et fiche Isover 2026 à 1 % près) [R10 n° 25 ; R13 F3] | [R04-S41, S42] |
| Knauf Supafil Loft 045 | 16,6 kg | 16,4 / 19,7 / 23,0 / 26,3 / 32,9 | 320 mm | ✔ (certificat ACERMI seul ; fiche Knauf illisible) | [R04-S43 ; R13 F4] |
| URSA Purefloc Loft 47 | 16,6 kg | 15,0 / 18,0 / 21,0 / 24,0 / 30,0 | 335 mm | ✔ | [R04-S44] |
| Rockwool Jetrock 2 (laine de roche) | 20 kg | 21,1 / 25,3 / 29,6 / 33,8 / 42,2 | 315 mm | ✔✔ (ACERMI et fiche Rockwool 01/2026, identiques) | [R04-S45 ; R10 ; R13 F1] |
| Soprema Thermacell **Cristal** (ouate, SH20) | 12,5 kg | 40 / 48 / **56** / 64 / 80 (sacs de 10 kg : 50 à 100) | 350 → 280 mm | ✔✔ (ACERMI et fiche Soprema INSFR0303-3/b, brochure 06/2025) | [R04-S47 ; R10 ; R13 F2] |
| Soprema Thermacell (sans « Cristal », SH25) | 12,5 kg | R 7 : **64** sacs | 345 → 273 mm | ✔ (un autre certificat : ne pas confondre) | [R04-S48] |
| Igloo, Ouattitude N (ouate) | 12,5 kg (10 / 10,8 / 11,5 existent) | 50 / 60 / 69 / 79 / 99 | 360 → 280 mm | ✔ | [R04-S49] |
| Cellaouate / Breizhouate (ouate **bretonne**, près de Morlaix) | 14 kg (10 kg) | 44 / 52 / 61 / 69 / 86 | 335 → 273 mm | ✔ | [R04-S50] |

Accessoires du soufflage, **seulement s'ils sont écrits** :
- piges de repérage, environ 1 pour 25 m² ? (non sourcé) ;
- coffrage ou déflecteur autour des conduits de fumée (écart au feu NF DTU 24.1) ? ;
- capots de spots ? ;
- rehausse de trappe ?.
- La machine se prête ou se loue au négoce ? [R04 B2].

`referentiel.json` reprend les cinq premiers produits. Pour un autre, la question « Quel isolant à souffler ? » a une case « Autre » ; la ligne reste alors orange « Quantité à préciser » (§50), jamais un ratio inventé.

### 8.3 Pare-vapeur et étanchéité à l'air

| Article | Valeur | Conditionnement | État | Sources |
|---|---|---|---|---|
| Isover Vario Xtra (hygro-régulante, Sd 0,4 à 25 m) | 1 m² isolé → **1,10 m²** de membrane (lé de 1,50 m, recouvrement de **10 cm minimum**, relevés) | rouleau 1,50 × 40 m = **60 m²** | ✔✔ (rouleau, majoration, recouvrement : Knauf, Rockwool 11/2024, Soprema, Isover) | [R04 D ; R07] |
| Adhésif Vario KB1 (Vario Multitape, Fast Tape) | ml = surface ÷ 1,40 (un joint tous les 1,40 m) + rives ; la fiche prend +30 % pour les rives ? | rouleau 60 mm × 40 m ; carton de 8 | ✔✔ rouleau ; ? ratio (aucun ratio fabricant) | [R04 D] |
| Mastic Vario DoubleFit | 310 000 ÷ section du cordon | cartouche de 310 ml | ✔✔ | [R04 D ; R05 E] |
| Pro Clima Intello / Intello Plus ; Siga Majrex | — | 1,50 × 50 m = **75 m²** (fiche 01/2026) | ✔✔ (Intello) ; ✔ (Majrex) | [R07] |
| Knauf LDS 100 | — | **2 × 50 m = 100 m²** (et non 1,5 × 50) | ✔ | [R07] |
| Adhésifs Pro Clima Tescon Vana, Siga Rissan | — | 60 mm × 30 m ; 60 mm × 25 m | ✔ | [R07] |
| Placo / Isover Stopvap | — | dimensions ? (isover.fr 403) | ? | [R07] |
| Suspentes Isover Intégra 2 (rampants, la membrane passe entre suspente et fourrure) | une tous les 0,60 × 1,20 m, soit 1,5 à 3 par m² | boîte de 50 ; 160 / 200 / 240 / 280 mm | ✔ | [R07] |
| Position | côté chaud, entre isolant et plaque ; en deux couches, règle 2/3-1/3 (3/4-1/4 en zone très froide) | — | ✔✔ | [R04 C] |
| Le kraft n'est pas un pare-vapeur | membrane et adhésifs en rampants même avec un isolant kraft | — | ✔ (Isover) | [R04 C] |
| Boîtiers électriques étanches à l'air | Legrand Eco Batibox étanche, 1 poste, profondeur 40 mm (090508L) ou 50 mm ; perçage Ø 67 | lot de 100 | ✔✔ | [R05 E] |

### 8.4 Réglementation

| Règle | Valeur | État | Sources |
|---|---|---|---|
| DTU | NF DTU 45.10 (rouleaux et panneaux en combles), NF DTU 45.11 (soufflage) ; pas de « 45.12 » | ✔✔ intitulés ; ? éditions en vigueur (textes AFNOR non lus) | [R04 C] |
| MaPrimeRénov' 2026 | **plus aucun geste d'isolation seul éligible en métropole** ; l'isolation n'est aidée que dans la « Rénovation d'ampleur » | ✔ (service-public.gouv.fr F35083, officiel) | [R04-S76] |
| Seuils R des aides (CEE) | BAR-EN-101 : combles perdus R ≥ 7, rampants R ≥ 6 ; BAR-EN-102 : murs R ≥ 3,7 ; en vigueur en 2026, abrogées au 1er mai 2027 | ✔✔ | [R07] |
| Rénovation « élément par élément » (valeurs depuis 2023) | murs R 3,2 ; combles perdus R 5,2 ; rampants R 5,2 / 4,5 / 4 ; plancher bas R 3 | ✔ (une source officielle ; Légifrance répond 403) | [R07] |
| RE2020 (neuf) | pas de R minimal par paroi : exigences globales (Bbio, Cep, Ic, DH) | ? (texte non relu) | [R04 C] |

La fiche **ne déduit jamais un R** des aides : le R se lit au devis, ou se demande.

---

## 9. Famille G : accessoires

| Article | Formats | Unité | État | Sources |
|---|---|---|---|---|
| Trappe de visite Placo (cadre alu + plaque, pousser-lâcher) | 200 × 200, 300 × 300, 400 × 400, 500 × 500, 500 × 600, 600 × 600 mm ; version étanche à l'air 400 × 400 | pièce | ✔✔ | [R05 E] |
| Trappe coupe-feu plafond Placo | 600 × 600, EI 30 / EI 60 | pièce (palette de 25) | ✔✔ | [R05 E] |
| Trappe coupe-feu de cloison Semin | 300 × 300 à 1 000 × 1 000, EI 30 | pièce | ✔ | [R05 E] |
| Bande résiliente (Tramiband SR) | 45 × 3 mm × 30 m ; 65 × 3 × 30 ; 25 × 5 × 20 | rouleau | ✔✔ | [R05 E] |
| Boîtiers d'encastrement pour cloison sèche | Legrand Batibox, profondeur 40 / 50 mm | pièce, lot | ✔✔ | [R05 E] |
| Renforts, Molly, mastic acoustique Placo, mousse coupe-feu | — | — | ? | [R05 E] |

Au comptoir, une trappe se demande par sa dimension, son usage (cloison ou plafond) et son classement (hydro, coupe-feu) ✔✔ [R06 B.1]. Elle part telle qu'écrite au devis, une par trappe.

---

## 10. Le comptoir : désignations et unités de vente

Ce que la liste écrit pour chaque article (le test du fournisseur, §40) :

| Article | Désignation dans la liste | Unité de vente | État |
|---|---|---|---|
| Plaque | « Plaques BA13 [type] 1,20 × [longueur] » | plaque | ✔✔ |
| Complexe | « Complexes de doublage [isolant et épaisseurs du devis] 1,20 × [longueur] » | panneau | ✔✔ |
| Rail | « Rails R48 » | **longueur de 3 m** (pas de botte imposée) | ✔✔ |
| Montant | « Montants M48 longueur 2,49 m » (longueur Placo ; 2,50 m en marque de négoce) | montant (botte de 10 en information) | ✔✔ |
| Fourrure | « Fourrures F530 » | longueur de 3 m | ✔✔ |
| Rail F 530 | « Rails F530 » | longueur de 2,35 m | ✔ |
| Cornière de rive | « Cornières de rive » (CR2) | longueur de 3 m | ✔✔ |
| Suspentes | « Suspentes longues » / « sécables » | boîte de 100 / 50 | ✔✔ |
| Éclisses, appuis | — | boîte de 50 | ✔ / ✔✔ |
| Vis TTPC 25 / 35 | — | boîte de 1000 | ✔✔ |
| Vis TRPF 13 | — | boîte de 500 | ≠ (500 ou 1000 selon la marque) |
| Clous + gaz | « marque du cloueur à préciser » | boîte de 500 avec gaz | ✔ |
| Chevilles 6 × 40 | — | sachet de 50 | ✔✔ |
| Bande | — | rouleau de 150 m | ✔✔ |
| Enduit | poudre / prêt à l'emploi | sac de 25 kg / seau de 25 kg | ✔✔ / ≠ |
| MAP | — | sac de 25 kg | ✔✔ |
| Isolant | gamme, épaisseur, R, format | colis de N m² | ✔✔ |
| Vrac | produit, poids du sac | sac | ✔ |
| Membrane, adhésif | — | rouleau de 60 m² / de 40 m | ✔✔ |

Les négoces pro vendent les profilés **à la pièce**, pas à la botte ✔✔ [R06]. Quéguiner affiche plaques au m² et profilés au ml, mais sert des pièces entières ✔✔ [R06 B.2].

Le vendeur ne demande **jamais** l'entraxe, le nombre de vis par m² ni le ratio d'enduit : « c'est le métier du plaquiste » ? (pratique non écrite) [R06 B.2]. Ce sont des hypothèses dites, jamais des questions.

---

## 11. Règles de calcul par ouvrage (telles qu'écrites dans `referentiel.json`)

Notations : S = surface du devis ; H = hauteur sous plafond ; L = S ÷ H. Arrondi au-dessus, à l'unité de vente, après le calcul.

| Ouvrage (`id`) | Article | Formule |
|---|---|---|
| `cloison-distributive` | plaques | ⌈ L × 2 × plaques par face × 1,05 ÷ 1,20 ⌉ ; longueur = plus petite de 2,50 / 2,60 / 2,70 / 2,80 / 3,00 / 3,20 / 3,60 ≥ H − 1 cm |
| | montants | ⌈ (n + (doublés − 1) × (n − 2)) × 1,05 ⌉ avec n = L ÷ entraxe + 1 ; longueur Placo ≥ H − 1 cm ; montage par défaut selon la hauteur (5.1) |
| | rails | 2 × L × 1,05 → longueurs de 3 m |
| | vis TTPC 25 / 35, TRPF | S × ratio SNIP du montage (5.1) |
| | fixations de rail | ⌈ 2 × L × 1,05 ÷ 0,60 ⌉, clous ou chevilles selon l'habitude |
| | isolant (si écrit) | S × 1,05 → colis |
| | bande / enduit (si cochés) | S × 2,80 ml ; S × 0,66 kg (poudre) ou 0,94 kg (prêt à l'emploi) |
| `cloison-separative` | plaques | ⌈ L × 2 × 2 × 1,05 ÷ 1,20 ⌉ |
| | montants | ⌈ (L ÷ 0,60 + 1) × 2 files × 1,05 ⌉ |
| | rails | 2 × L × (1 file SAA, 2 files SAD) × 1,05 |
| `doublage-colle` | complexes | ⌈ L × 1,05 ÷ 1,20 ⌉ |
| | MAP | S × 1,8 kg (mur plan) ou 2,5 kg (mur irrégulier, laine) → sacs de 25 kg |
| | bande / enduit | S × 1,40 ; S × 0,33 / 0,47 |
| `doublage-fourrures` | plaques | ⌈ L × 1,05 ÷ 1,20 ⌉ |
| | fourrures | N = ⌈ (L ÷ 0,60 + 1) × 1,05 ⌉ files verticales, une longueur de 3 m par file (H ≤ 3 m), + L × lignes d'appuis × 1,05 (fourrure horizontale) |
| | appuis | N × lignes (1 jusqu'à 2,70 m, 2 jusqu'à 4,50 m) ; modèle selon l'épaisseur d'isolant |
| | rails F 530 | 2 × L × 1,05 → longueurs de 2,35 m |
| | vis | S × 15 TTPC, S × 2 TRPF |
| | fixations | rails ÷ 0,60 + une par appui |
| `contre-cloison-montants` | comme la cloison, une face | montage par défaut selon les hauteurs de contre-cloison (5.3) ; vis 15 / 19 |
| `plafond-fourrures` | plaques | ⌈ S × plaques × 1,05 ÷ (1,20 × 2,50) ⌉ |
| | fourrures | S × 1,79 / 2,10 / 3,0 (entraxe 60 / 50 / 40) |
| | suspentes | ⌈ S × 1,56 / 1,84 / 2,7 ⌉ ; longues (plénum < 15 cm) ou sécables ; plus de vis TRPF (clipsées) |
| | fixation des suspentes | bois : 2 TTPC 35 par suspente ; béton : 1 cheville métallique |
| | éclisses | fourrures (ml) ÷ 3 m |
| | cornière | S × périmètre par m² d'une pièce carrée × 1,05 (estimation dite) |
| | vis | 12 / 14 / 15 par m² ; 2 BA13 : 8 + 12 TTPC 35 |
| `joints-seuls` | bande / enduit | S × 1,40 ; S × 0,33 / 0,47 |
| `isolation-rouleaux` | isolant | S × couches × 1,05 → colis du produit écrit |
| `isolation-soufflee` | sacs | ⌈ S × sacs pour 100 m² (certificat du produit, R) ÷ 100 ⌉ |
| `pare-vapeur` | membrane, adhésif | S × 1,10 → rouleaux de 60 m² ; S ÷ 1,40 × 1,3 → rouleaux de 40 m |

Arrondi : le calcul garde ses décimales, et seul le besoin final est arrondi. Le moteur élargit légèrement les intervalles en division : un arrondi intermédiaire (⌈ 30 ⌉) peut donner 31. Pour cette raison, les formules n'arrondissent qu'une fois, à la fin.

---

## 12. Questions à l'artisan, valeurs par défaut, suggestions

Les questions sont dans l'ordre du plus gros levier, et posées **seulement si le devis ne les dit pas** (lu par `textLabels` / `textValues` et par le modèle). Chacune a « Autre » et « Je ne sais pas ».

| # | Clé | Question | Boutons | Ouvrages | Pourquoi |
|---|---|---|---|---|---|
| 1 | `hauteur` | « Hauteur sous plafond ? » | 2,50 m / 2,60 m / 2,70 m / 2,80 m / 3,00 m | cloisons, doublages, contre-cloisons, séparatives | change la longueur des plaques et des montants, et le montage |
| 2 | `support` | « Ton plafond est fixé sous quoi ? » | Solives ou charpente bois / Dalle béton | plafond | change la fixation des suspentes |
| 2 bis | `marque_systeme` | « Ton système coupe-feu, c'est quelle marque ? » | Placo / Knauf / Siniat / Autre | ouvrage coupe-feu (`ei` écrit : EI, REI, CF, PV) | décision de Greg du 20/11 : toute la liste suit la marque, jamais « ou équivalent » |
| 2 ter | `ei` | « Quel classement coupe-feu ? » | Pas de coupe-feu / EI 30 / EI 60 / EI 90 / EI 120 | cloison, plafond | **jamais posée en pratique** : lue au devis, par défaut « pas d'exigence feu écrite » |
| 2 quater | `support_mur` | « Ton mur est plan, ou irrégulier (mur ancien) ? » | Plan / Irrégulier | doublage collé | **par défaut : plan** ; change le mortier adhésif (1,8 ou 2,5 kg/m²) |
| 3 | `produit_vrac` | « Quel isolant à souffler ? » | Comblissimo (17,3 kg) / Supafil (16,6 kg) / Jetrock (20 kg) / Thermacell Cristal (12,5 kg) / Igloo (12,5 kg) | soufflage | le nombre de sacs dépend du certificat |
| 4 | `r_vise` | « Quel R visé ? » | R 5 / R 6 / R 7 / R 8 / R 10 | soufflage | nombre de sacs |
| 5 | (comptoir) complexe | « Quel complexe : isolant et épaisseur (ex. PSE 10+80, laine de verre 10+100) ? » | réponse écrite | doublage collé | l'article |
| 6 | (comptoir) isolant | « Quel isolant : marque ou équivalent, épaisseur, kraft ou nu ? » | réponse écrite | isolant écrit sans gamme ni épaisseur | l'article et son colis |
| 7 | `epaisseur_isolant` | « Épaisseur de l'isolant derrière le doublage ? » | 75 / 100 / 120 / 140 / 160 mm | doublage sur appuis | la longueur des appuis |
| 8 | `type_separative` | « Séparative à ossature alternée (SAA) ou double (SAD) ? » | SAA / SAD | séparative | rails et montants |
| 9 | `plenum` | « Ton plafond descend de combien sous le support ? » | Moins de 15 cm / 15 à 58 cm | plafond | le modèle de suspente ; **par défaut** : moins de 15 cm |
| 10 | `montage` | « Tes montants : simples à 60 cm, simples à 40 cm, ou doublés ? » | quatre boutons | cloisons, contre-cloisons | **par défaut** : tiré de la hauteur (DTU) ; demandé seulement si l'artisan le change |
| 11 | `entraxe_fourrures` | « Entraxe des fourrures ? » | 60 / 50 / 40 cm | plafond | **par défaut** : 60 cm (isolant léger) |
| 12 | `couches` | « Une ou deux plaques par face ? » | Une (72/48) / Deux (98/48) | cloison, plafond | **par défaut** : une |
| 13 | `fixation_rail` | « Tes rails au sol et au plafond, tu les fixes comment ? » | Cloueur à gaz / Chevilles à frapper | tout ouvrage à rails | **habitude de l'entreprise** : demandée une fois, puis retenue |
| 13 bis | `marque_cloueur` | « Ton cloueur à gaz, c'est quelle marque ? » | Spit / Hilti / Paslode / Autre | quand les rails sont cloués | **habitude** : clous et gaz vont avec leur cloueur (relecture du comptoir) |
| 14 | `enduit_forme` | « Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ? » | En poudre / Prêt à l'emploi | quand l'enduit est écrit ou coché | **habitude** |
| 15 | `type_plaque` | « Quelles plaques : standard, hydro, feu, phonique ou haute dureté ? » | cinq boutons | plaques | **par défaut** : standard ; lu au devis (« hydro », « EI 60 », « Habito ») |
| 16 | `longueur_plaque` (plafond) | « Tes plaques de plafond, en quelle longueur ? » | 2,50 m / 3,00 m | plafond | **habitude**, par défaut 2,50 m |
| 17 | `couches_isolant` | « Combien de couches de cet isolant ? » | Une / Deux | isolant en rouleaux | **par défaut** : une (une 2e couche s'écrit à part) |

**Suggestions** (cases, jamais d'office) : « Bande à joint (si tu fais les joints) », « Enduit à joint (si tu fais les joints) ». Ce sont les seules, conformément à la consigne « uniquement ce qui est forcément là ».

**Mots dits par l'artisan** (`dit`), lus quand il répond au clavier ou à la voix :
- « cloueur », « gaz », « pistolet » ;
- « cheville », « frapper » ;
- « poudre », « sac » ;
- « prêt à l'emploi », « pâte », « seau » ;
- « bois », « solives », « charpente » ;
- « béton », « dalle ».

---

## 13. Différences régionales

**Ce qui est documenté :**
- **Les formats sont nationaux.** Plaques de 1,20 m, mêmes longueurs, rails de 3 m : les fiches Placo, Knauf et Siniat valent pour toute la France. La fiche Knauf F47 dit « France métropolitaine » ✔✔ [R01 §10 ; R02 F].
- **Usines de plaques** : aucune en Bretagne ✔✔ [R01 §10 ; R06].

  | Marque | Usines |
  |---|---|
  | Placo | Vaujours, Chambéry, Cognac |
  | Siniat | Auneuil, Saint-Loubès, Carpentras, Ottmarsheim (pas seulement le Sud-Est) |
  | Knauf | Saint-Soupplets, Fos-sur-Mer (« sert surtout le Sud ») |

- **Ce qui varie, c'est la marque tenue par chaque négoce.** Donc les longueurs de montant : 2,49 / 2,99 chez Placo, contre 2,50 / 3,00 en marque de négoce (Samse, Isolpro, Ega Perfil) ✔✔ [R02 F ; R06]. La fiche écrit « ou équivalent ».
- **Pladur** ne se vend en grande surface de bricolage qu'au sud du Mans ✔ [R06].
- **Placo affiche des délais de doublage différents selon la zone** : « Est et Méd. » contre « Ouest et Paris Nord et Sud », par exemple J+5 / J+10 ✔ [R06].
- **Bretagne** (étude Prospérences 2021, donc ancienne) ✔ [R06] :
  - part des artisans couverts : Point.P 80 %, Tout Faire 69 %, Starmat 67 %, Quéguiner 64 %, Réseau Pro 63 %, Tanguy 60 % ;
  - Samse est absent, Bretagne Matériaux est l'enseigne sœur de Point.P ;
  - Quéguiner vend Placo et Knauf, pas de Siniat vu.
  - Sofrapa : introuvable sous ce nom ?.
- **Ouate de cellulose bretonne** : Cellaouate / Breizhouate, près de Morlaix, en sacs de 10 et 14 kg (12,5 kg ailleurs). Utile pour la Bretagne, cible du lancement ✔ [R04 B1 ; R06].
- **Usines de laine de bois** : Vosges (Pavatex), Lot-et-Garonne et Brumath (Steico) ✔ [R04 F ; R06].
- **Région ventée** : butées résilientes sur les suspentes sous rampants ✔ [R02 F].

**Rien n'est documenté sur ces points (?) :**
- une habitude régionale « doublage collé ou sur ossature » ;
- les carreaux de plâtre dans le Sud-Est ;
- une part de marché régionale de la laine de bois ou de la ouate ;
- la présence de Dispano en Bretagne.

---

## 14. Chantiers types

**18 chantiers** (au-delà des 15 demandés ; PI-18 coffrage ajouté le 20/11) dans `chantiers-types.md`, calculés par le moteur de Mobiiz :

- **PI-01** maison neuve, 45 m² de 72/48 ;
- **PI-02** cloison isolée en 2,60 m ;
- **PI-03** ERP, 98/48 EI 60 en 3,00 m ;
- **PI-04** salle de bain hydro (cloison + plafond) ;
- **PI-05** doublage collé 10+80 ;
- **PI-06** Doublissimo 13+100 en 2,60 m ;
- **PI-07** Optima + GR 32 100 + Vario ;
- **PI-08** contre-cloison M48 ;
- **PI-09** plafond sous solives + IBR 200 ;
- **PI-10** plafond coupe-feu 2 BA13 sous dalle ;
- **PI-11** soufflage R 7 ;
- **PI-12** ouate R 8 ;
- **PI-13** combles aménagés (rampants, membrane, plafond) ;
- **PI-14** séparatif SAD ;
- **PI-15** rénovation d'appartement mixte ;
- **PI-16** bandes et enduit seuls ;
- **PI-17** cloison de 3,00 m en maison ancienne.

Pour le jour de l'ouverture, chaque chantier devient un test permanent : comptes attendus, questions attendues, aucune question sur une donnée écrite.

Exemple PI-01 : 45 m² de 72/48, hauteur 2,50 m.

| Article | Commande |
|---|---|
| Plaques BA13 1,20 × 2,50 m | 32 plaques |
| Montants M48 de 2,49 m | 33 montants |
| Rails R48 | 13 longueurs de 3 m |
| Vis TTPC 25 | 2 boîtes de 1000 (1 350 vis) |
| Vis TRPF | 1 boîte de 500 (90 vis) |
| Clous + gaz | 1 boîte de 500 avec gaz (64 fixations) |
| Bande | 1 rouleau de 150 m (126 ml) |
| Enduit en poudre | 2 sacs de 25 kg (29,7 kg) |

---

### 14 bis. Relecture du comptoir (testeur-négoce, `relecture-testeur-negoce.md`)

Trois vendeurs ont « commandé » 9 chantiers et toutes les familles :
- un généraliste breton ;
- un spécialiste plâtrerie ;
- un négoce qui ne tient que Knauf et des marques négoce.

Résultat : 4 bloquants, 13 gênants, 7 détails.

**Corrigé dans cette version :**
- **Même article sur plusieurs lignes** (bloquant). Le jeu de test additionne maintenant les besoins de tout le chantier avant d'arrondir, comme l'application (§49.5 : « une seule ligne par article identique »). Exemple PI-15 : 1 rouleau de bande, 2 sacs d'enduit, 1 boîte de vis.
- **Complexe sans son isolant** (bloquant) : la désignation garde ce que le devis écrit (« Complexes de doublage 10+80 1,20 × 2,50 m »).
- **Clous sans marque de cloueur** (bloquant) : nouvelle question d'habitude « Ton cloueur à gaz, c'est quelle marque ? » (Spit / Hilti / Paslode / Autre). Elle est posée une fois, et la ligne dit « Clous Spit pour cloueur à gaz, béton 20 mm, avec cartouches de gaz ».
- **« Sous bois » écrit sur un clou béton** : retiré.
- **Suspente « longue » ambiguë** : la ligne dit « Suspentes longues 171 (plénum 20 à 150 mm) ».
- **Salle de bain sous faïence** : « sous faïence » ou « sous carrelage » lu au devis donne des montants à 40 cm.
- **PI-10** en plaques feu.

**Restent ouverts** (section 16 ou 17) :
- **Coupe-feu (bloquant) :** un EI ne vaut que dans le système d'un fabricant, avec son PV. « Ou équivalent » ligne par ligne n'est pas recevable. À faire avant l'ouverture : quand le devis dit EI ou PV, la marque du système devient une question, toutes les lignes portent cette marque et partent chez un seul négoce.
- **Ossature d'un plafond :** fourrures, suspentes et éclisses doivent partir chez un seul négoce, car F530 (Placo) et F47 (Knauf) ne s'emboîtent pas. À faire : grouper ces lignes (envoi par lot).
- **Laine kraft avec membrane Vario** (Isover associe la Vario à une laine nue) : la fiche suit le devis (règle numéro un). Une question du comptoir est à ajouter quand les deux sont écrits.
- **Mastic périphérique et manchettes de la membrane, piges et location de souffleuse, bande armée, joint sous rail, renfort de porte :** proposés par le vendeur, mais pas « forcément là ». Ils restent hors des suggestions (consigne stricte) ; Greg décide.
- **Enduit de la 1re peau en parement double** (≈ 0,15 à 0,2 kg/m², vendeur, non sourcé), **mortier adhésif en rénovation** (2,5 à 3 kg/m²) et **rail haut vissé dans des fourrures** : à trancher par un plaquiste.
- **Colis d'isolant et sacs de vrac propres à une marque :** la ligne montre aussi le besoin en m² (ou le produit du certificat), pour qu'un négoce d'une autre marque convertisse.

### 14 ter. Deuxième relecture du comptoir (`relecture-testeur-negoce-2.md`, PI-03, PI-10, PI-07)

Résultat : 2 bloquants, 12 gênants, 9 détails.

**Corrigé :**
- Chaque ligne coupe-feu dit « système coupe-feu Placo EI 60 : à chiffrer en entier dans cette marque, ou pas du tout (pièces non remplaçables, procès-verbal) ».
- Entretoises PRF ajoutées au plafond feu Placo (104 pour PI-10).
- La laine écrite d'une cloison coupe-feu porte la marque.
- Le plafond dit REI, plus EI.
- Vis TTPC 35 des suspentes et vis TTPC 35 ne font plus qu'une ligne.

**Reste ouvert :**
- un négoce qui ne tient pas la marque du système (section 16) ;
- un bloc « À préciser » pour les pièces du PV que la fiche ne sort pas : jonctions intumescentes, boîtiers électriques, trappes (à faire au branchement) ;
- la boîte de vis Placo, vendue par 500 ou 1 500 et non 1 000 ;
- l'appui à nommer « Optima2 100 » ;
- la membrane à nommer « Vario Xtra » quand le devis le dit ;
- l'enduit de la 1re peau.

## 15. Liste des « à confirmer » (après la troisième passe)

Le détail est dans `recherche/09` à `17`.

1. **Coffrages** : règle acceptée par Greg, lignes « à vérifier » avec le calcul visible ; à confirmer par un plaquiste.
2. **Périmètre d'un plafond** non écrit au devis : estimé, pièce supposée carrée, dit comme hypothèse, ligne orange. Le périmètre écrit au devis est lu (recherche/18 §2).
3. **Vis de plafond** :
   - à 0,60 : 12 retenu (SNIP, vis de rive comprises) ; Placo 10 et Pladur 8 sans les vis de rive : écart expliqué, une source chiffrée (recherche/18 §3) ;
   - à 0,40 : Placo seul (15) ;
   - 1re peau d'un plafond en 2 BA13 : 8 (SNIP), le 3 de Placo contredit par sa propre FDES 2026 ;
   - fourrures à 0,40 : Placo seul.
4. **TRPF des montants doublés à 0,40** : 10 (Placo, retrouvé par le calcul) ; SNIP 7, Chausson 8 et Pladur 7 assemblent les montants plus espacés : écart expliqué (recherche/18 §3).
12. **Montage au-delà du tableau** (72/48 plus haute que 3,40 m, contre-cloison M48 plus haute que 2,65 m sans appui) : montants en « à vérifier ». Ordre « simples à 40 cm avant doublés à 60 cm » : déduit de la matière, aucun fabricant ne le publie (recherche/18 §1).
5. **Séparative, 1re peau** : 12 (SNIP seul).
6. **Vis de doublage Knauf** : aucune valeur trouvée, on applique 15 (règle de Greg).
7. **Plafond feu Placo** :
   - Stil Flam : 1,7 entretoise/m² (quatre FDES Placo, un seul éditeur) ;
   - vis de la peau visible : 13/m², même vissage qu'un plafond standard d'après les FDES ; à confirmer sur la fiche système (placo.fr refuse la lecture) ;
   - Siniat et Knauf : vissage feu non publié ; le plafond Knauf Métal Chrono n'est pas chiffré ligne à ligne.
8. **Plénum et longueur de plaque de plafond par défaut** : habitudes, gardées en questions.
9. **Adhésif de membrane** : 0,8 ml/m² (Isover seul, cohérent avec le calcul des joints).
10. **Fixation en bout de rail** (non comptée).
11. **Hors fichier machine** :
    - Knauf : KF 13 en 3,00 m (une source) ; Diamant jusqu'à 55 kg par point (une source, fixation non publiée) ; Métal Chrono (entraxe des entretoises, vissage, PV) ;
    - Siniat D102/48 EI 120 : composition lue (2 + 1 BA18), isolant à confirmer ;
    - palette Fermacell : 48 plaques (tarif 2010 seul) ;
    - Styrodur 3035 CS : aucun certificat ACERMI en cours trouvé.

**Réglés pendant la sixième vague (recherche/19 et 20)** :
- Glasroc H Ocean : 40 plaques par palette ;
- R du Styrodur 3035 CS ;
- plafond REI 60 Siniat (suspentes à 1,10 m) ;
- formats KF 13 et Fermacell 12,5 ;
- fixation en bout de rail : aucune de plus (aucun fabricant ne la demande).

**Réglés pendant la troisième passe** :
- FDES Placo sur la base INIES (montants, rails, TRPF, fourrures, appuis, plaques confirmés) ;
- vis de doublage par marque (Placo 11, Siniat 12) ;
- soufflage Supafil (produit jumeau certifié) ;
- Igloo en sacs de 10 kg ;
- Styrodur.

**Réglés pendant la deuxième passe** :
- mortier adhésif : 1,8 kg/m² sur mur plan, 2,5 kg/m² sur mur irrégulier ;
- montants au m² : nouvelle formule des montants doublés ;
- vis au m² des cloisons ;
- quantités SAA et SAD ;
- cornière de rive (méthode périmètre × 1,05) ;
- pas de fixation des rails ;
- produits Knauf et Siniat : en partie (section 3) ;
- cheville Molly : environ 20 kg sur BA13 standard (Fischer, coefficient de sécurité 3), renfort au-delà de 30 kg (Placo) ;
- suspentes, éclisses, TRPF en plafond, 98/48 en 3,75 m ;
- soufflage Comblissimo, Jetrock et Thermacell ;
- membrane, enduit, colis d'isolant, seau d'enduit, clous, boîtes.


## 16. Décisions de Greg (20 novembre 2026) et points tranchés par la recherche

**Tranché :**
1. **Vis et fixations :** sorties d'office.
2. **Bande et enduit :** cases à cocher.
3. **Coupe-feu :** système complet d'une seule marque avec son procès-verbal, une question « Quelle marque ? ». **Un négoce qui n'a pas la marque peut proposer un système complet d'une autre marque avec son procès-verbal, signalé clairement à l'artisan ; jamais de mélange de marques dans un système coupe-feu.** C'est écrit sur chaque ligne du système.
4. **Mortier adhésif :** la question « Ton mur est plan ? » est gardée (1,8 ou 2,5 kg/m²).
5. **Montants de porte :** 2 par porte écrite au devis. Lu au devis (« 3 blocs-portes »), jamais demandé ; sans porte écrite, aucun.
6. **Vis de doublage et de contre-cloison :** celles de la marque si elle est écrite au devis (Placo 11/m², Siniat 12/m²), sinon 15/m² (syndicat), par prudence. Knauf : 15 tant que sa valeur n'est pas sourcée.
7. **Suspentes à 1,56/m² et 98/48 doublés à 0,60 en 3,75 m :** validés.
8. **Coffrages :** règle acceptée. Les lignes restent « à vérifier », avec le calcul visible : « 5 m × développé 1 m × 1,10 = 5,5 m² de plaques ».

**Tranché par la recherche (Greg, 20 novembre 2026 : « c'est à toi de chercher tes réponses, n'invente rien ») :** aucune question technique ne reste pour Greg. Détail et sources : `recherche/18-trancher-montage-corniere.md`.
- **Montage par défaut tiré de la hauteur.** Cloison 72/48 : jusqu'à 2,50 m, simples à 60 cm ; jusqu'à 2,75 m, simples à 40 cm ; jusqu'à 3,05 m, doublés à 60 cm ; jusqu'à 3,40 m, doublés à 40 cm. Au-delà, ligne « à vérifier » (aucune 72/48 ne tient). Contre-cloison M48 sans appui : 2,00 / 2,25 / 2,40 / 2,65 m, puis « à vérifier » (appuis au mur ou montants de 70). Chaque hauteur a deux sources (NF DTU 25.41 2022, Siniat, Placo, Pladur). Aucun fabricant ne publie d'ordre de préférence. Simples à 40 cm passe avant doublés à 60 cm parce qu'il demande 21 % de montant en moins (SNIP, Chausson) ; c'est **à confirmer par un plaquiste**. Jamais d'office : le montant renforcé (5 à 10 cm de gagnés, délai J+5 chez Placo) ni le M70 (il change l'épaisseur écrite).
- **Cornière de rive.** Obligatoire sur tout le pourtour (NF DTU 25.41 2022, guide CAPEB / FFB / SNIP §6.2.2.7, Placo 2023). Sans cornière seulement si on ne peut pas la fixer, et seul le devis peut le dire. Le périmètre écrit au devis est lu. Sinon il est estimé, pièce supposée carrée (4 × √surface), dit à l'artisan comme hypothèse, et la ligne est orange. Les ratios fixes publiés (0,47 ml/m²) ne valent que pour 80 à 96 m² : sur 12 m², ils feraient manquer plus de la moitié de la cornière.
- **Vis de plafond à 0,60 :** 12/m², vis de rive comprises (SNIP). L'écart avec Placo (10) et Pladur (8) vient des vis de rive : c'est expliqué, ce n'est plus une contradiction.
- **TRPF des montants doublés à 0,40 :** 10/m² (Placo, retrouvé par le calcul). SNIP, Chausson et Pladur (7 à 8) assemblent les deux montants plus espacés.

## 17. Ce qu'il reste à faire pour ouvrir le métier plaquiste dans Mobiiz

1. **Relecture par un plaquiste** (au moins les sections 5, 11, 12 et 16), puis passage des valeurs relues de `draft` à `verified` (`verifiedBy` = son nom) dans `outils/generer_referentiel.py`. Tant que ce n'est pas fait, la mention « Ratios en cours de validation » reste (§52).
2. **Branchement** (développeur, avec les tests) :
   - le registre `REFERENTIALS` pointe `drywall` vers ce référentiel ; il remplace `PLATRERIE_REFERENTIAL` (cloison 72/48 seule) ;
   - ou bien la fiche passe au format `referentiels/metiers/platrerie.md` (moteur « fiche ») : les ouvrages, ratios et questions s'y recopient.
   - Le JSON passe déjà `loadReferential` ; un test de schéma est à ajouter, comme pour la couverture.
3. **Prompt de lecture du métier** (bloc « plaquiste » du socle versionné) : le vocabulaire de `vocabulaire.json` et les pièges de la section 1. Ensuite, la vraie lecture en CI sur deux ou trois devis réels anonymisés de plaquiste.
4. **Tests permanents** : les 17 chantiers types deviennent des tests du domaine (comptes à 3 % près, questions attendues, aucune question sur une donnée écrite).
5. **Catalogue « Plâtrerie-isolation »** du cœur métier (familles, articles, caractéristiques) aligné sur les familles et produits de la fiche ; négoces « plâtrerie-isolation » dans le routage par métier.
6. **Compléments de la fiche** (déjà repérés) :
   - montage feu (vis à 15 cm) quand le devis dit « EI » ;
   - suspentes Intégra en rampants ;
   - ossature primaire / secondaire ;
   - coffrages ;
   - PSE, XPS et polyuréthane (troisième passe) ;
   - plaques Knauf et Siniat comme produits nommés.
7. **Réglage `METIERS_OUVERTS`** : ouvrir le métier sur le site de test seulement, puis recette avec un plaquiste breton.

---

## 18. Sources

Toutes les sources, avec URL, éditeur, date du document et date de consultation (19/11/2026), sont listées en fin de chaque fichier `recherche/0x-*.md`. Les principales :

**Profession et normes**
- **SNIP**, fiche conseil n° 18, décembre 2024 : https://www.lesindustriesduplatre.org/wp-content/uploads/2025/03/SNIP-FICHE-CONSEIL-18-VERSIONS-2025_V6-13fevrier.pdf
- **NF DTU 25.41**, février 2022, via le guide Rockwool cloisons 12/2023 (https://www.rockwool.com/siteassets/rw-f/telechargements/guides-de-pose-et-mise-en-oeuvre/cloisons/rockwool_mise_en_oeuvre_isolation_des_cloisons.pdf), le guide Rockwool murs 07/2024 et le guide CAPEB des nouveautés 2022 (https://www.capeb.fr/www/capeb/media//morbihan/document/2022_Guide%20DTU%2025-41_DEF_HD_WEB.pdf).
- **ACERMI** : certificats des isolants (acermi.com), datés 2025-2026.
- **Service-public.gouv.fr** F35083 (MaPrimeRénov' 2026).

**Placo**
- L'Intégrale Second Œuvre 04/2023, Plafonds : https://dam.pim-cps.saint-gobain.com/MAM/assets/1/C1A269993195482DA567890D5C26E716/doc/CEDB5A77BEAE4BDA8E2753C0A9B3A813/SO03-Intgrale_Placo_Second_Oeuvre_04.2023_-_Plafonds.pdf
- Fiches produits 2023-2026 (BA13, M 48, R 48, F 530, rail F 530, éclisses, suspentes, PR4, MAP Formule +, TTPC), hébergées par Samse, BigMat, Chausson et Matériaux Naturels.
- Fiche solution 72/48 (Proeco), Offre Placo 2024 (CAPEB).

**Autres fabricants**
- **Siniat** : carnets de pose DTU, fiches systèmes 2026 (print2pdf), catalogue Finition 2021/2022.
- **Isover** : fiches GR 32, Isoconfort 35, IBR, Comblissimo, notice Vario Xtra (copies Samse, Gedimat, Chausson).
- **Pladur** : fiches systèmes 2019 et Mémento 2017 (seconde source pour les quantités, jamais seule pour une hauteur).
- **Knauf** : fiches France 2016-2020, knauf.com en extraits (le site répond 403).

**Négoces et méthode**
- Négoces : Point.P, Gedimat, BigMat, Chausson, Samse, Tout Faire, Quéguiner, SFIC, Dispano, La Plateforme ; Brico Dépôt, Castorama et Bricomarché en appoint.
- **Limites de la méthode** : placo.fr, knauf.com et isover.fr refusent la lecture automatique. Les fiches ont été lues dans leurs copies officielles hébergées par les négoces, ou en extraits de moteur, ce qui est dit à chaque ligne. Le quota de recherche web de la session a été atteint pendant la nuit : certains « à confirmer » viennent de là, et non d'une absence d'information.
