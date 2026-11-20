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

### 3.4 Fermacell, plaque fibres-gypse 12,5 mm

| Donnée | Valeur | Source 1 (URL, date) | Source 2 (URL, date) | Statut |
|---|---|---|---|---|
| Format 1,20 × 2,50 m, 12,5 mm | existe (EAN 4007548002103) | [E1] BigMat, fiche Fermacell 2,50 × 1,20 BD (PDF déjà lu en 10) https://medias.bigmat.fr/data_medias/medias_finaux/documents/4007548002103-5NbNph4BNv.pdf | Bricomarché, page produit même EAN (titre, 20/11/2026) | confirmé (2 sources négoce, fiche fabricant) |
| Format 1,20 × 2,60 m, 12,5 mm | existe (EAN 4007548000352), **45,9 kg la plaque** (≈ 14,7 kg/m²) | [E2] Toutfaire, page produit https://www.toutfaire.fr/plaque-fibres-gypse-bords-droits-2600-x-1200-x-12-5-mm.html (lue 20/11/2026) | tarif Fermacell 2010 (réf. 71025 / 71315) | confirmé (2 sources) |
| Plaques par palette (2,50 et 2,60 m) | **48** (144,0 et 149,8 m²) | tarif Fermacell « gamme complète » (copie Ciffréo Bona ; **2010**) | — : FDES Fermacell / James Hardie « plaques fibres-gypse 10 et 12,5 mm » (INIES 50569, **11/05/2026**, PDF lu) ne donne que la masse de palette (0,259 kg par m²), pas le nombre ; Toutfaire, BigMat, Chausson, Samse : jamais le nombre | à confirmer (raison : aucune édition postérieure à 2010 ne l'écrit) |

**Valeur retenue :** 1,20 × 2,50 m et 1,20 × 2,60 m en 12,5 mm ; **vente à la plaque** ; pas de palette codée (48 reste une
indication de 2010, cohérente avec le poids : 48 × 45,9 ≈ 2 200 kg). **État :** formats confirmés (2 sources) ; palette à confirmer.
**Ce qui reste incertain :** la palette actuelle ; inutile pour la commande (le négoce vend à la plaque).

### 3.5 Glasroc H Ocean 13 : plaques par palette (40 ou 43)

| Donnée | Valeur | Source 1 (URL, date) | Source 2 (URL, date) | Statut |
|---|---|---|---|---|
| Plaques par palette, 1,20 × 2,50 / 2,60 / 3,00 m | **40** | [E3] Offre Placo 2024 p. 44 (« Palette de 40 plaques », H97622500 / 600 / 3000) et son tableau de stockage (« 34 ou 40 », 34 = la 18S) | [E4] FDES Placo « Glasroc H Ocean 13 » (INIES 50585, réalisée **13/05/2026**, PDF lu) : « pour une plaque de 1,2 m × 2,6 m : **125 m² par pile** » → 125 / 3,12 = **40,06 plaques** ; contrôle : la FDES Placoplatre BA 13 (27/07/2026) écrit 150 m² par pile de 2,5 m = 50 plaques, la pile de 50 connue : la règle de calcul tient | **confirmé (2 documents fabricant de dates et d'objets différents)** |
| 43 par palette | batiproduits (fiche non datée) | — | — | contradiction écartée (ancienne édition probable, aucun document daté ne le dit) |

**Valeur retenue : 40 plaques par palette** (pile de 125 m² en 2,60 m). Vente à la plaque au comptoir : la palette ne sert qu'à
une commande en gros. **État :** 2 sources (fabricant, Offre 2024 + FDES 2026). **Ce qui reste incertain :** rien d'utile pour la commande.

### 3.6 Styrodur 3035 CS (BASF) : certificat ACERMI et R par épaisseur

| Donnée | Valeur | Source 1 (URL, date) | Source 2 (URL, date) | Statut |
|---|---|---|---|---|
| R, en m²·K/W | 30 mm **0,90** ; 50 mm **1,45** ; 60 mm **1,75** ; 100 mm **2,85** (40 mm 1,20 ; 80 mm 2,25 ; 120 mm 3,40 en édition 2026) | BASF, « Technische Daten Styrodur 3035 CS », **Stand Februar 2026** (déjà lue en 17) | distributeur italien, fiche BASF **09/2022** (déjà lue en 17) : mêmes valeurs à 30, 50, 60, 100 | confirmé (2 sources) à 30 / 50 / 60 / 100 mm |
| Numéro ACERMI | **03/004/274** | batiproduits, fiche « Styrodur 3035 CS » (extrait moteur, 20/11/2026) | brochure Styrodur 2013 (clubprescrire, extrait moteur) : 03/004/274 pour la 3035 CS | 2 sources (dont une ancienne) pour le numéro |
| Certificat en vigueur | **absent de la liste ACERMI des certificats valides au 20/11/2026** | [E5] acermi.com, « Certificates list — Valid at 2026-11-20 » (page lue en entier : 946 numéros ; Jackon, Ravatherm, URSA XPS y figurent ; aucun « BASF », « Styrodur » ni numéro « 03/004/… ») https://acermi.com/en/certified-insulation-products/ | aucun lien de certificat 03-004-274-* ne répond (essais de version 10 à 40, 404) | 1 source (officielle) ; **à confirmer** (raison : la liste a peut-être une pagination non vue ; mais la recherche directe échoue aussi) |

**Valeur retenue :** R = 0,90 / 1,45 / 1,75 / 2,85 m²·K/W pour 30 / 50 / 60 / 100 mm (valeurs BASF, déclarées CE), **sans
certificat ACERMI en cours trouvé**. Pour une commande, l'épaisseur suffit ; Mobiiz ne doit pas écrire « certifié ACERMI »
pour le Styrodur, et pour une aide (MaPrimeRénov', CEE) le R d'un certificat ACERMI valide fait foi : signaler à l'artisan
« R déclaré par le fabricant, certificat ACERMI non trouvé ». **État :** R confirmé (2 sources fabricant) ; ACERMI : à confirmer
(raison : absent de la liste officielle du 20/11/2026). **Ce qui reste incertain :** un certificat sous un autre nom de titulaire
(distributeur) que la liste ne montrerait pas sous « BASF ».

## Bilan

Recherches : 14 recherches web, 6 lectures de pages, plus 11 PDF téléchargés et lus (8 FDES INIES, 2 fiches Siniat / Knauf, 1 fiche Placo)
et la liste ACERMI. Environ 45 chiffres relevés.

**Confirmés (2 sources)** : composition Siniat REI 60 (recoupée par Placo) ; KF 13 en 2,50 m ; Fermacell 12,5 en 2,50 et 2,60 m ;
Glasroc H Ocean 13, 40 par palette (Offre 2024 + FDES 2026) ; Styrodur R à 30 / 50 / 60 / 100 mm ; Knauf Métal Chrono, composition
et un point de fixation par 1,2 × 1,2 m (deux documents Knauf).

**1 source (fabricant, plusieurs documents)** :
- entretoises Stil Flam : **1,7/m²** (FDES Placo 2024 : 1,46 ; 2025-2026 : 1,68). Remplace le 1,3 calculé ;
- vis de plaque Stil Flam : **13/m² en peau visible, 8/m² en 1re peau** (FDES Placo = même vissage qu'en standard) ; le 23/m² était celui du PRF ;
- Siniat REI 30 (2 BA13 standard, S47 à 0,50, suspentes 1,15) ; KF 13 en 3,00 m ; Diamant 55 kg par point ;
- D102/48 EI 120 = 2 + 1 Prégyplac BA18 Std, M48-35 (extrait de la fiche + contrôle d'épaisseur 48 + 3 × 18 = 102).

**À confirmer** :
- vissage Stil Flam (FDES, pas notice de pose ; fiche système et PV RS 16-039 en 403) ;
- vis Siniat en plafond (non publiées) ;
- Knauf Métal Chrono : entraxe des entretoises sous plaques, vissage, PV (knauf.com 403) ;
- Diamant : fixation qui donne 55 kg ;
- D102/48 : isolant, côté des deux plaques (PDF Siniat en erreur 500) ;
- palette Fermacell (2010 seulement) ;
- certificat ACERMI du Styrodur 3035 CS (absent de la liste officielle du 20/11/2026) ;
- KF 13 en 2,60 m (Belgique seulement), 2,80 m (Tunisie seulement : à retirer).

**Règles changées à proposer à Greg :**
1. Plafond feu Placo, entretoises : avant 1,3/m² (calcul) → après 1,7/m² (FDES Placo 16/03/2026).
2. Plafond feu Placo, vis de la peau visible : avant 23/m² (vissage 15 cm du PRF) → après 13/m² (vissage courant, FDES Stil Flam), ligne « à vérifier » tant que la fiche système n'est pas lue.
3. Siniat D102/48 EI 120 : avant « composition non lue » → après 3 Prégyplac BA18 Std par m² (2 + 1), montants M48-35 accolés.
4. Styrodur 3035 CS : ne plus dire « certificat ACERMI » ; R déclaré par BASF.

## Sources

1. [A1] FDES Placo « Plafond Feu STIL FLAM – Plancher bois – 1x Placoflam BA 15 … REI30 », INIES 20240840020, réalisée 03/09/2024 — https://www.base-inies.fr/api/Produit/40020 ; PDF https://www.base-inies.fr/api/Document/97298/download — consulté 20/11/2026.
2. [A2] FDES Placo « … 2x Placoflam BA 13 … REI60 – Isoconfort 35 », INIES 20240840023, 03/09/2024 — https://www.base-inies.fr/api/Produit/40023 ; PDF https://www.base-inies.fr/api/Document/97453/download — 20/11/2026.
3. [A3] FDES Placo « Plafonds Stil Flam – 2x Placoflam BA 13 … REI60 – Flex 55 », INIES 20260249013 (produit 52506), réalisée 16/03/2026 — https://www.base-inies.fr/api/Document/138178/download — 20/11/2026.
4. [A4] FDES Placo « Plafonds locaux très humides – 2x Glasroc H Ocean 13 – Entretoise Stil Flam … REI60 », INIES 20251247905, 17/12/2025 — https://www.base-inies.fr/api/Document/122491/download — 20/11/2026.
5. [A5] FDES Placo « Plafond Placostil F 530 – 1x Placoplatre BA 13 – REI15 », INIES 20240739762, 09/09/2024 — https://www.base-inies.fr/api/Document/97652/download — 20/11/2026.
6. [A6] FDES Placo « Plafond Placostil F 530 – 2x Placoplatre BA 13 – REI30 », INIES 20240739558, 09/09/2024 — https://www.base-inies.fr/api/Document/97658/download — 20/11/2026.
7. [A7] FDES Placo « Entretoise Stil Flam (pose par emboîtement) », INIES 20240638885, 08/07/2024 — https://www.base-inies.fr/api/Document/94559/download — 20/11/2026.
8. [A8] Placo, fiche produit « Entretoise Stil Flam », mise à jour 18/12/2023, copie Chausson — https://cdn.chausson.fr/catalog-document/866d87fc-7937-4016-a3ff-5f5c53d939a0/ficheproduit-entretoise-stil-flam.pdf — 20/11/2026.
9. [A9] Batiweb, « Découvrez Stil Flam… » (publi-rédactionnel Placo), 26/10/2023 — https://www.batiweb.com/actualites/publi-redactionnels/decouvrez-stil-flam-le-nouveau-systeme-pour-les-plafonds-coupe-feu-le-plus-performant-du-marche-43108 — 20/11/2026.
10. Placo, L'Intégrale Second Œuvre 04/2023, Plafonds (PRF, vissage 15 cm, 2,6 entretoises/m²) — https://dam.pim-cps.saint-gobain.com/MAM/assets/1/C1A269993195482DA567890D5C26E716/doc/CEDB5A77BEAE4BDA8E2753C0A9B3A813/SO03-Intgrale_Placo_Second_Oeuvre_04.2023_-_Plafonds.pdf — copie locale relue.
11. [B1] Siniat, fiche système « Plafond Prégymétal sur fourrures S47 – 2 BA13 – REI30 – Isolant », 02/09/2026 — https://www.siniat.fr/-/print2pdf/system/pi80739/siniat-fiche-technique/fr-fr/plafond-pregymetal-sur-fourrures-s47-2-ba13-rei30-laine-de-verre.pdf — 20/11/2026.
12. [B2] Siniat, « … S47 – 2 BA13 Flam – REI60 – avec isolant », 21/09/2025 — https://www.siniat.fr/-/print2pdf/system/pi477485/siniat-fiche-technique/fr-fr/plafond-pregymetal-sur-fourrures-s47-2-ba13-flam-rei60-avec-isolant.pdf.
13. [B3] Siniat, « … S47 – 2 BA15 Flam – REI60 », 02/09/2026 — https://www.siniat.fr/-/print2pdf/system/pi80159/siniat-fiche-technique/fr-fr/plafond-pregymetal-sur-fourrures-s47-2-ba15-flam-rei60-avec-sans-isolant.pdf.
14. [B4] Siniat, « Plafond Prégymétal Téclip – 2 BA13 Flam – REI60 », 12/11/2025 — https://www.siniat.fr/-/print2pdf/system/pi477495/siniat-fiche-technique/fr-fr/plafond-pregymetal-teclip-2-ba13-flam-rei60-sans-isolant.pdf.
15. [C1] Batiweb, fiche produit « Plafond feu 60' Knauf Métal Chrono » (non datée) — https://www.batiweb.com/produit-btp/plafond-feu-60-knauf-metal-chrono-349470 — 20/11/2026.
16. [C2] Batiweb, « Knauf Métal Chrono, le plafond feu monoparement à montage rapide », 06/12/2021 — https://www.batiweb.com/actualites/publi-redactionnels/knauf-metal-chrono-le-plafond-feu-monoparement-a-montage-rapide-39095.
17. [C3] Knauf, actualité « Nouveau plafond feu 60' Knauf Métal Chrono » (2021) — https://knauf.com/fr-FR/actualites/knauf/nouveau-plafond-feu-plaque-platre-60-knauf-metal-chrono (403, extrait moteur).
18. [D1] Fiche produit Knauf Feu KF BA 13 2,5 × 1,2 m (Point.P, 2018), copie préfecture du Pas-de-Calais — https://www.pas-de-calais.gouv.fr/contenu/telechargement/36250/232142/file/1 fiche produit placo local poly.pdf (extrait moteur).
19. Knauf Belgique, fiche technique « DF 13 / Plaque résistante au feu 13 AK », 05/2017, copie Gobert — https://gobert.groupegobert.com/ressources/images/articles/Fiches_techniques/KNAUF FT PLAQUE RF13.pdf — lue 20/11/2026.
20. Knauf fr-FR, « Knauf Feu KF 13 » — https://knauf.com/fr-FR/p/produit/knauf-feu-kf-13-18608_4091 (403, extrait) ; Knauf Tunisie « Plaque coupe feu FR BA 13 » — https://knauf.com/fr-TN/p/produit/plaque-de-platre-coupe-feu-fr-ba-13-18608_4070 (extrait).
21. [D2] Knauf, documentation Knauf Diamant, nov. 2019, copie Chausson — https://cdn.chausson.fr/catalog-document/693fe0b8-aac2-494d-8d78-9ea3744556c3/documentation-knauf-diamant.pdf ; Knauf Maroc « Vis spéciale LG35 » — https://knauf.com/fr-MA/p/produit/vis-speciale-lg35-11134_0096 (extrait).
22. [D3] Siniat, « Cloison Prégymétal D102/48 EI120 47 dB M48-35 isolant » — https://www.siniat.fr/-/print2pdf/system/pi79225/siniat-fiche-technique/fr-fr/cloison-pregymetal-d102-48-ei120-47db-m48-35-isolant.pdf (erreur 500, extrait moteur 20/11/2026).
23. [E1] BigMat, fiche Fermacell BD 2,50 × 1,20 — https://medias.bigmat.fr/data_medias/medias_finaux/documents/4007548002103-5NbNph4BNv.pdf.
24. [E2] Toutfaire, plaque fibres-gypse 2600 × 1200 × 12,5 — https://www.toutfaire.fr/plaque-fibres-gypse-bords-droits-2600-x-1200-x-12-5-mm.html — 20/11/2026.
25. FDES Fermacell / James Hardie « Plaque fibres-gypse 10 mm et 12,5 mm », INIES produit 50569, 11/05/2026 — https://www.base-inies.fr/api/Document/133410/download.
26. Tarif Fermacell « gamme complète » (2010), copie Ciffréo Bona — https://www.ciffreobona.fr/userfiles/file/PDF/15/41/165/8857/fermacell_gamme_complete.pdf.
27. [E3] Placo, Offre Placo 2024 (PDF du 21/02/2024, copie CAPEB, lue en 10 et 17).
28. [E4] FDES Placo « Glasroc H Ocean 13 », INIES produit 50585, réalisée 13/05/2026 — https://www.base-inies.fr/api/Document/133324/download ; contrôle : FDES Placoplatre BA 13, INIES 20260651971, 27/07/2026 (copie locale).
29. [E5] ACERMI, liste des certificats valides au 20/11/2026 — https://acermi.com/en/certified-insulation-products/ — lue 20/11/2026.
30. BASF, « Technische Daten Styrodur 3035 CS », Februar 2026, et fiche distributeur 09/2022 (lues en 17) ; batiproduits « Styrodur 3035 CS » (ACERMI 03/004/274) — https://www.batiproduits.com/fiche/produits/panneau-isolant-xps-polyvalent-a-surface-lisse-et-p68905333.html (extrait).
