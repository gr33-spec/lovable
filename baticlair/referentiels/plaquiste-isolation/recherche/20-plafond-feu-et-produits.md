# 20 — Plafond coupe-feu (Stil Flam, Siniat, Knauf) et produits nommés

Mission du 20 novembre 2026 (sixième vague). Consignes : `_consignes.md`. Contexte : FICHE §5.8 et §15 (points 7 et 11),
recherche/11 §1.2 et §2.2, recherche/17 (3a, 3b, 4b, 4c, 4d, 5b, 6b, 7, 8).
Méthode : copies locales déjà téléchargées (lues avec `python3 -I`), puis recherches web (≈ 30 au plus).
Rédaction au fur et à mesure.

## 1. Plafond coupe-feu Placo avec Stil Flam (REI 30 / 60)

**Découverte de cette vague.** La base INIES publie les FDES des plafonds **Stil Flam** eux-mêmes (pas seulement du PRF).
Le PDF de chaque FDES se télécharge par `GET https://www.base-inies.fr/api/Document/<idDocument>/download`
(l'identifiant vient de `tDocuments` dans `api/Produit/<id>`). Ces PDF donnent, pour 1 m² de plafond, **le nombre de pièces**
de chaque composant (entretoises, suspentes, vis), chutes comprises, et la ventilation des vis (vis de plaque de 1,25 g,
vis de suspente de 10 g). Lus le 20/11/2026.

### 1.1 Ce que disent les FDES Placo des plafonds Stil Flam (1 m², fourrures F 530 à 0,60 m, portée 1,20 m, plancher bois)

| FDES (n° INIES, date du document) | Plaques | PV | Fourrure ml/m² | Entretoises Stil Flam /m² | Suspentes /m² | Vis de plaque (1,25 g) /m² | Vis de suspente (10 g) /m² | Rail F 530 ml/m² |
|---|---|---|---|---|---|---|---|---|
| [A1] 40020, REI 30, Isoconfort 35 100 mm (réalisée 03/09/2024) | 1 Placoflam BA 15 | RS 16-038 | 1,75 | **1,46** | 1,46 | **12,56** | 2,78 | 1,13 |
| [A2] 40023, REI 60, Isoconfort 35 100 mm (03/09/2024) | 2 Placoflam BA 13 | RS 16-039 | 1,75 | **1,46** | 1,46 | **20,56** (2 peaux) | 2,78 | 1,13 |
| [A3] 52506, REI 60, fibre de bois Flex 55 100 mm (réalisée 16/03/2026) | 2 Placoflam BA 13 | RS 16-039 | 1,79 | **1,68** | 1,56 | **20,64** (2 peaux) | 3,12 | 0,47 |
| [A4] 47905, REI 60, Glasroc H Ocean, IBR 200 mm (17/12/2025) | 2 Glasroc H Ocean 13 | RS 16-039 + ext. 21/2 | 1,79 | **1,68** | 1,56 | **17,60** (2 peaux) | — | 0,47 |
| Pour comparer : [A5] 39762, plafond **standard** REI 15 (09/09/2024) | 1 Placoplatre BA 13 | estimation | 1,75 | — | 1,46 | **12,56** | 2,78 | 1,13 |
| Pour comparer : [A6] 39558, plafond **standard** REI 30 (09/09/2024) | 2 Placoplatre BA 13 | estimation | 1,75 | — | 1,46 | **20,56** (2 peaux) | 2,78 | 1,13 |

Contrôles : l'entretoise Stil Flam pèse 0,25 kg (FDES produit [A7] 38885, 08/07/2024 : « Masse du produit 0.25 kg/UD »,
longueur 555 mm) ; 0,36 kg ÷ 0,25 = 1,44 et 0,42 ÷ 0,25 = 1,68 : les masses des fiches système retombent sur les nombres.
Fiche produit [A8] (Placo, mise à jour 18/12/2023, copie Chausson relue) : 555 mm, bleue, boîte de 25 (5,741 kg), palette de 40 boîtes,
réf. H08120025, « Deux fois moins d'entretoises à poser (par rapport à l'ancien PV feu) ». Batiweb [A9] (publi-rédactionnel Placo,
26/10/2023) : « un entraxe de 1,20 m et non plus de 0,60 m ».

### 1.2 Entretoises Stil Flam par m²

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note |
|---|---|---|---|---|---|---|
| Entretoises Stil Flam, plafond 0,60 / portée 1,20 | 1,46 (FDES 2024) ; 1,68 (FDES 2025-2026) | u/m² | [A1] [A2] FDES Placo 40020 / 40023 (03/09/2024) | [A3] FDES Placo 52506 (16/03/2026) ; [A4] 47905 (17/12/2025) ; calcul 1 / (1,20 × 0,60) = 1,39 sans rives | 1 source fabricant (4 FDES concordantes à l'arrondi, plus la fiche produit « deux fois moins » et le calcul) | L'écart 1,46 / 1,68 vient de la pièce type de la FDES (2024 : 1,13 ml de rail/m², petite pièce ; 2025-2026 : 0,47 ml de rail/m², autre géométrie, plus de suspentes 1,56). Les deux sont la moitié environ de l'ancien PRF (2,6/m², Intégrale 04/2023 p. 104) : « deux fois moins » se vérifie. |

**Valeur retenue : 1,7 entretoise Stil Flam par m²** (la FDES la plus récente, 16/03/2026, arrondie au dixième au-dessus), puis la boîte de 25.
Remplace le 1,3/m² calculé (recherche/17, 3a), qui oubliait les rives et les coupes.
**État : 1 source (fabricant, 4 FDES vérifiées + fiche produit + presse) ; pas de 2e source indépendante** (aucun négoce ni
guide tiers ne publie un ratio). Le nombre n'est plus un calcul : c'est celui que Placo déclare dans ses FDES vérifiées.
**Ce qui reste incertain :** la fiche système Stil Flam (placo.fr, 403) n'a pas été lue ; pour une grande pièce l'écart 1,46 / 1,68
fait au plus une boîte de 25 sur 100 m². Sous dalle béton (PV RS 14-045, 1 Placoflam BA 15), aucune FDES Stil Flam trouvée :
même ossature supposée, à confirmer.

### 1.3 Vis de la peau visible (et de la 1re peau) avec Stil Flam

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note |
|---|---|---|---|---|---|---|
| Vis de plaque, simple peau Stil Flam (1 Placoflam BA 15, REI 30) | 12,56 | u/m² | [A1] FDES 40020 (03/09/2024) : « 12,56 vis de 1,25 g chacune et 2,78 vis de 10 g » | [A5] FDES 39762, plafond **standard** 1 BA 13 : exactement le même 12,56 | 1 source (fabricant, 2 fiches) | Placo compte le **même vissage** en feu Stil Flam qu'en standard. |
| Vis de plaque, double peau Stil Flam (2 Placoflam BA 13, REI 60) | 20,56 (2024) ; 20,64 (2026) | u/m² (deux peaux ensemble) | [A2] FDES 40023 (03/09/2024) | [A3] FDES 52506 (16/03/2026) ; [A6] standard 2 BA 13 : 20,56 | 1 source (fabricant, 3 fiches) | Répartition non écrite ; avec 12,56 pour une peau seule, il reste ≈ 8 pour la 1re peau, soit le chiffre SNIP déjà retenu (FICHE §15 point 3). |
| Vissage « tous les 15 cm » (23 vis/m²) | 23 (simple peau PRF) | u/m² | Intégrale Placo 04/2023 Plafonds p. 104 : « vissées tous les 30 cm (15 cm en cas de montage PRF) » ; tableau, note (1) « uniquement en montage feu » | — | contradiction (détail : vaut pour le montage **PRF**, que Placo ne vend plus ; les FDES Stil Flam 2024-2026 comptent le vissage standard) | Le PRF avait des entretoises à 0,60 et un vissage à 15 cm ; Stil Flam a des entretoises à 1,20 et, d'après les FDES, le vissage courant. Aucun document lisible ne dit « 15 cm » pour Stil Flam. |

**Valeur retenue :** peau visible d'un plafond Stil Flam = **13 vis/m²** (12,56 arrondi), 1re peau d'un double parement = **8 vis/m²** ;
le 23/m² n'est plus sorti pour un plafond feu Placo (il ne valait que pour le PRF). Règle changée à proposer : avant, « peau visible
vissée à 15 cm, 23 vis/m² » → après, « vissage courant, 13 vis/m² en peau visible ».
**État : 1 source (fabricant : 4 FDES Placo vérifiées, dont la plus récente du 16/03/2026) ; à confirmer** (raison : une FDES compte
des masses pour l'analyse de cycle de vie, elle n'est pas une notice de pose ; la fiche système Stil Flam et le PV RS 16-039
ne sont pas lisibles, placo.fr 403).
**Ce qui reste incertain :** si le PV Stil Flam impose un pas réduit sur les bords ou les abouts, la FDES ne le montrerait pas.
Écart en commande : sur 50 m², 650 vis contre 1 150, soit une boîte de 1 000 de plus ; le moteur peut garder la ligne
« à vérifier » avec la phrase « vissage selon le PV, à confirmer au comptoir » tant que la fiche système n'est pas lue.

## 2. Plafond REI 30 / 60 chez Siniat et Knauf

### 2.1 Siniat (fiches système siniat.fr/-/print2pdf, lues en PDF le 20/11/2026)

| Système | Plaques | Ossature et entraxes | PV | Source (URL, date du document) | Statut |
|---|---|---|---|---|---|
| Plafond S47, **REI 30**, plancher bois, laine de verre 60 à 260 mm ou Biofib'Trio 100 | **2 Prégyplac BA13 Std** (pas de plaque feu) | fourrures S47 **e 0,50** ; suspentes Pivot ou P41 **e 1,15 m** ; portée 1,15 m ; plénum 220 mm ; charge 38 kg | Efectis EFR-16-002661 B rév. 1 | [B1] https://www.siniat.fr/-/print2pdf/system/pi80739/siniat-fiche-technique/fr-fr/plafond-pregymetal-sur-fourrures-s47-2-ba13-rei30-laine-de-verre.pdf (02/09/2026) | 1 source (fabricant) ; nouveau dans la fiche |
| Plafond S47, **REI 60**, avec isolant | 2 Prégyflam BA13 Std ou A1 | S47 **e 0,50** ; suspentes e 1,10 (LV 200-400), 0,90 (fibre de bois 200), 1,15 (Biofib'Trio 100) ; plénum 160 mm | EFR-21-004119 | [B2] pi477485 (21/09/2025, déjà lue en 11 [N9]) | confirmé (2 sources : Siniat + Placo 2 Placoflam BA13 REI 60) |
| Plafond S47, **REI 60**, avec ou sans isolant ≤ 400 mm | 2 Prégyflam BA15 Std ou A1 | S47 e 0,50 ; suspentes e 1,10 ; sous bois sans isolant plénum ≥ 19 cm dont 4 sous solive | EFR-16-002902 rév. 1 + ext. 18/1, 21/2 rév. 1 | [B3] pi80159 (02/09/2026) | 1 source |
| Plafond **Téclip**, REI 60, sans isolant | 2 Prégyflam BA13 | fourrures et **entretoises S47 croisées e 0,60 × 0,60** ; suspentes e 1,20 ; raccords Téclip | EFR-21-004119 | [B4] pi477495 (12/11/2025) | 1 source |

Vissage Siniat : **aucune fiche système ne donne un pas de vissage ou un nombre de vis** ; elles renvoient au « DTU 25-41 et aux
recommandations Siniat » ; Siniat n'a **aucune FDES de système** sur INIES (recherche/16). 1 recherche web de plus (20/11/2026) : rien.

**Valeur retenue (Siniat) :** REI 30 sous bois = 2 Prégyplac BA13 **standard** sur S47 à **0,50 m**, suspentes à **1,15 m** ;
REI 60 = 2 Prégyflam BA13 (ou BA15) sur S47 à **0,50 m**, suspentes **1,10 m**. Pas d'entretoise dans le montage S47 simple
(seulement en Téclip, à 0,60). Fourrures : 1 / 0,50 = 2,0 ml/m² (+ chutes) au lieu de 1,67 à 0,60.
Vis : pas de chiffre Siniat ; appliquer le vissage DTU déjà retenu pour les plafonds (12 en peau visible à 0,60, à recalculer à 0,50).
**État :** composition et entraxes = 1 source fabricant chacun, datée 2025-2026 (REI 60 recoupé par Placo) ; vis = à confirmer
(raison : non publié par Siniat).
**Ce qui reste incertain :** le nombre de vis à 0,50 m (non publié) ; le classement REI 30 avec une seule plaque Prégyflam
(aucune fiche trouvée : Siniat ne publie le REI 30 qu'en 2 BA13 standard).

### 2.2 Knauf (Knauf Métal Chrono, R/REI 60)

| Donnée | Valeur | Source 1 (URL, date) | Source 2 (URL, date) | Statut |
|---|---|---|---|---|
| Composition | **1 Knauf Feu KF 15** ; fourrure F47 ; **entretoise F47 1 150 mm** ; connecteur multifonctions F47 ; cornière 25/30 ou rail F47 ; suspente (pivot, bois ou U pour F47) ; laine de verre « selon la performance feu » | [C1] batiweb, fiche produit « Plafond feu 60' Knauf Métal Chrono » (non datée) https://www.batiweb.com/produit-btp/plafond-feu-60-knauf-metal-chrono-349470 (lue 20/11/2026) | [C2] batiweb, publi-rédactionnel Knauf, 06/12/2021 (déjà lu en 17, 4d) ; [C3] knauf.com fr-FR, actualité « Nouveau plafond feu 60' » (extrait moteur, page 403) | confirmé (2 documents, mais tous deux écrits par Knauf) |
| Points de fixation | « un point de fixation tous les **1,2 m × 1,2 m** », « entraxe de fourrure de 1,2 m » (fourrures porteuses) → **0,69 suspente/m²** | [C1] | [C3] extrait moteur | confirmé (2 documents Knauf) |
| Entraxe des pièces sous plaques (entretoises F47) | **non publié** dans un document lisible | — | — | à confirmer (raison : fiche système knauf.com 403 ; catalogue « Plafonds 2020 » de Deltour téléchargé en HTML, pas en PDF) |
| Vissage, PV | **non publiés** dans un document lisible | — | — | à confirmer (même raison) |

**Valeur retenue (Knauf) :** composition seulement (1 KF 15, F47 croisées, entretoises 1 150 mm, 0,69 suspente/m²). Pas de
quantitatif chiffré des entretoises ni des vis : le moteur ne doit pas générer un plafond feu Knauf ligne à ligne ; il laisse
« entretoises F47 et vis : à préciser au comptoir, système Knauf Métal Chrono selon PV ». **État :** à confirmer (raison : entraxe
secondaire, vissage et PV non publiés hors knauf.com).
**Ce qui reste incertain :** l'entraxe des entretoises sous plaques (0,40 ? 0,50 ? 0,60 ?) ; aucune FDES Knauf de système sur INIES.

## 3. Produits nommés

### 3.1 Knauf Feu KF 13 : longueurs vendues en France

| Donnée | Valeur | Source 1 (URL, date) | Source 2 (URL, date) | Statut |
|---|---|---|---|---|
| KF 13 en 2,50 × 1,20 m | existe : réf. Knauf **50608**, EAN 3551660000154, réf. Point.P 1831583 | [D1] fiche produit « Knauf Feu KF BA 13 2,5 × 1,2 m » (Point.P, 2018), copie publiée par la préfecture du Pas-de-Calais https://www.pas-de-calais.gouv.fr/contenu/telechargement/36250/232142/file/1 fiche produit placo local poly.pdf (extrait moteur, 20/11/2026) | Knauf fr-FR « Knauf Feu KF 13 » : « L 2 500 à 3 000 » (extrait moteur, déjà en 17) ; catalogue Knauf 2020 Cloisons [K1] « 2,50 à 3 m » | confirmé (2 sources) |
| KF 13 en 3,00 m | borne haute de gamme | Knauf fr-FR (extrait) ; [K1] 2020 | Knauf Belgique, fiche « DF 13 / Plaque résistante au feu 13 AK », **05/2017** (copie Gobert lue) : 1 200 × **2 600** (n° 00056108) et 1 200 × **3 000** (n° 00011157) — autre marché, même plaque (code 18608 sur les deux sites) | 1 source France (fabricant) + 1 source Belgique |
| KF 13 en 2,60 m | vendue en Belgique (13 AK) ; aucune page française ne la cite | — | Knauf Belgique 05/2017 | à confirmer (raison : marché belge seulement) |
| KF 13 en 2,80 m | seulement sur la page Knauf Tunisie (« FR BA 13 », 50 à 56 plaques par palette) | — | — | à retirer pour la France (aucun document français) |

**Valeur retenue :** KF 13, **1,20 × 2,50 m par défaut** ; **3,00 m** proposé seulement sur demande, « à confirmer avec le négoce » ;
jamais 2,60 ni 2,80 m d'office. **État :** 2,50 m confirmé (2 sources) ; 3,00 m 1 source France ; 2,60 / 2,80 non vendus en France d'après les documents lus.
**Ce qui reste incertain :** la page knauf.com fr-FR (403) peut lister d'autres longueurs ; la palette française de la KF 13 n'est pas lue.

### 3.2 Knauf Diamant : charge par point

| Donnée | Valeur | Source 1 | Source 2 | Statut |
|---|---|---|---|---|
| Charge maximale | « jusqu'à **55 kg par point de fixation** (se reporter aux données techniques) » | [D2] Knauf, documentation Knauf Diamant, nov. 2019 (copie Chausson, lue) ; plaquette Knauf Diamant « 55KG PAR POINT » (copie locale) | Knauf fr-FR « Knauf Diamant 13 Cleaneo C » (extrait moteur, 20/11/2026) : même phrase | 1 source (fabricant, 3 documents) |
| Charge d'une vis seule (Knauf LG35, sans cheville) | **24 kg** en 2 × 12,5 mm Diamant ; 10 kg en double plaque feu | Knauf Maroc, « Vis spéciale LG35 » (extrait moteur, 20/11/2026) | — | 1 source (autre marché) |
| Cheville ou vis qui donne 55 kg | **non publiée** | — | — | à confirmer (raison : le tableau « données techniques » n'est lisible dans aucune copie ; media.knauf.com 403) |

**Valeur retenue :** aucune quantité n'est tirée de ce chiffre ; c'est un argument de choix de plaque. Mobiiz peut écrire
« Knauf Diamant : jusqu'à 55 kg par point selon Knauf (fixation selon la documentation Knauf) ». **État :** 1 source (fabricant) ;
conditions à confirmer. **Ce qui reste incertain :** la fixation qui donne 55 kg (cheville métallique à expansion ? une ou deux peaux ?).

### 3.3 Siniat D102/48 EI 120 : composition

| Donnée | Valeur | Source 1 | Source 2 | Statut |
|---|---|---|---|---|
| Composition | **2 + 1 Prégyplac BA18 Std** (deux BA18 d'un côté, une de l'autre), montants **M48-35** | [D3] Siniat, fiche système « Cloison Prégymétal D102/48 EI120 47 dB M48-35 isolant » pi79225, **extrait moteur** (20/11/2026 ; le PDF répond toujours erreur 500) | contrôle d'épaisseur : 48 + 3 × 18 = **102 mm**, le nom du système (aucune autre composition ne tombe sur 102) | 1 source (fabricant, extrait) + calcul |
| Classement, PV | EI 120 ; Efectis 09-V-238 + ext. 10/2 ; Rw + C 47 dB ; épaisseur 102 mm ; hauteur maxi 4,20 m (accolés 0,40) | [D3] | recherche/11 [N6] (même fiche, autre extrait : 3,75 m accolés 0,60 / 4,20 m accolés 0,40) | 1 source |
| Isolant | présent (type coupé dans l'extrait) | [D3] | — | à confirmer |

**Valeur retenue :** D102/48 EI 120 = **3 Prégyplac BA18 standard par m² de cloison** (2 + 1), M48-35, montants **accolés**
(0,60 jusqu'à 3,75 m, 0,40 jusqu'à 4,20 m), isolant de la fiche. Pas de plaque Prégyflam. **État :** 1 source (extrait de la
fiche fabricant) + contrôle d'épaisseur ; à confirmer sur le PDF (raison : serveur Siniat en erreur 500, 3 essais).
**Ce qui reste incertain :** le type et l'épaisseur d'isolant ; le côté qui reçoit les deux plaques ; le vissage.
