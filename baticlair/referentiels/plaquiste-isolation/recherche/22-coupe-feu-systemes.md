# 22 — Systèmes coupe-feu courants par marque (cloisons, gaines, doublages, plafonds, accessoires)

Mission du 20 novembre 2026. Consignes : `_consignes.md`. Contexte : FICHE §5.8 et §15, recherche/11 et 20 (déjà su,
non refait ici : on renvoie à leurs numéros). Méthode : base INIES (liste complète déjà téléchargée, puis API
`api/Produit/<id>` et PDF `api/Document/<id>/download`), copies locales, recherches web. Rédaction au fur et à mesure.

Abréviations : M48 = montant 48 mm ; e = entraxe ; LM = laine minérale ; FDES = fiche INIES (quantités pour 1 m²,
chutes comprises) ; « même fabricant » = deux documents d'un même éditeur (ce n'est pas deux sources indépendantes).

---

## 0. Inventaire INIES des systèmes feu (20/11/2026)

Recherche dans la liste complète INIES (9 836 fiches, téléchargée le 20/11/2026) sur « EI », « REI », « Flam », « Feu »,
« gaine », « Siniat », « Knauf », « Fermacell », « Pladur » :
- **Placo** publie des FDES de SYSTÈMES (cloisons, plafonds) avec leur classement EI et leur PV ;
- **Siniat** et **Knauf** ne publient que des FDES de PLAQUES (« hors ossatures ») : aucune FDES de système feu ;
  Siniat : Prégyflam BA15 (46575), Prégy Flam-Dur-dB BA13 (51843), Prégyfaylite BA50 (47977) ; Knauf : KF 15 (46801), KS 13 A1 (47767) ;
- **Fermacell** : plaques 10 / 12,5 (50569) et 15 / 18 mm (50577), hors ossature ; **Pladur** : rien ;
- **aucune FDES de gaine technique, de caisson de poteau ou de doublage coupe-feu** d'une des trois marques.

Conséquence : les quantités au m² d'un système feu ne sont déclarées (FDES) que par Placo ; pour Siniat et Knauf, on reste
sur la fiche système (composition, entraxe, hauteur) et le quantitatif standard de la marque.

## 1. Placo — cloisons EI (FDES système lues)

### 1.1 98/48, 2 Placoflam BA 13 par face, EI 120 (FDES INIES 20240638678, réalisée 25/07/2024)

PDF : https://www.base-inies.fr/api/Document/96944/download (lu le 20/11/2026).
Titre : « Cloison distributive Placostil 98/48 – 2x Placoflam BA 13 avec M 48 – EI120 – 47 dB – max 3,00 m – avec isolant PAR Phonic 45 mm ».
Classement : **EI 120, PV RS 15-022 + ext. 21/1**.

| Donnée (pour 1 m² de cloison) | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note |
|---|---|---|---|---|---|---|
| Hauteur maxi (montants simples e 0,60) | 3,00 | m | FDES 38678 (titre et tableau, 25/07/2024) | fiche système sp00020115 : 3,10 m (recherche/11 [P5], extrait moteur) | contradiction (détail : 3,00 m avec isolant PAR Phonic 45 dans la FDES ; 3,10 m « sans isolant » dans l'extrait de la fiche système ; même PV) | Retenir **3,00 m** (la plus basse, et le cas avec laine, le plus courant). |
| Montant M48, e 0,60 simple | 2,100 | ml/m² | FDES 38678 | — (titre INIES 48877 : 98/48 2 BA 13 EI 60 « 0,60 m », même entraxe ; quantités non relues) | 1 source | Même ossature que le 98/48 standard. |
| Rail R48 | 0,900 | ml/m² | FDES 38678 | — | 1 source | Pièce type de la FDES. |
| Plaques Placoflam BA 13 | 4,200 | m²/m² | FDES 38678 | calcul 4 peaux × 1,05 | confirmé (fabricant + calcul) | 2 par face. |
| Isolant PAR Phonic 45 mm | 1,020 | m²/m² | FDES 38678 | — | 1 source | Laine de verre ; la fiche sp00020115 dit aussi « sans isolant » possible. |
| Vis TTPC 25/35 (plaques) | 32 | u/m² | FDES 38678 (« surestimé : chaque peau comptée comme peau simple ») | — | 1 source | Soit 8 par peau : vissage courant, aucun pas réduit pour le feu. |
| Vis + chevilles de profilés | 1,457 + 1,457 | u/m² | FDES 38678 | — | 1 source | Fixation des rails. |
| Bande à joint | 2,583 | ml/m² | FDES 38678 | — | 1 source | |
| Enduit Placojoint PR4 | 0,693 | kg/m² | FDES 38678 | — | 1 source | Enduit courant : pas d'enduit « feu » spécial. |

### 1.2 98/48, 1 Placoplatre BA 25 par face, EI 120 (FDES INIES 20260148876, réalisée 19/02/2026)

PDF : https://www.base-inies.fr/api/Document/126957/download (lu le 20/11/2026). Classement : **EI 120, PV CSTB RS 11-044** ;
hauteur **3,80 m** ; montants M48 (titre « 0,90 m » : entraxe des montants avec BA 25) ; RA 45 dB.

| Donnée (pour 1 m²) | Valeur | Unité | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|
| Plaques Placoplatre BA 25 (STANDARD) | 2,1 | m²/m² | FDES 48876 (19/02/2026) | FDES 47773 (même système, PAR Phonic Tech 45, 02/12/2025, titre) | confirmé (même fabricant, 2 fiches) | **EI 120 sans plaque feu** : une BA 25 standard par face. |
| Montant M48 | 2,63 | ml/m² | FDES 48876 | — | 1 source | |
| Rail R48 | 0,55 | ml/m² | FDES 48876 | — | 1 source | |
| Isolant | Isonat Flex 40, 40 mm (fibre de bois, classe E) | — | FDES 48876 | FDES 48876 bis : FLEX 40 ; 47773 : PAR Phonic Tech 45 | 1 source | Ici la fibre de bois garde l'EI 120 (PV RS 11-044) — à l'inverse du 72/48 Placoflam (EI 60 → EI 45, recherche/11). Toujours la fiche du système. |
| Vis TTPC 35 / TRPF | 18,01 | u/m² | FDES 48876 | — | 1 source | |
| Bande / enduit | 3,44 ml ; 0,92 kg | /m² | FDES 48876 | — | 1 source | |

### 1.3 Placo — autres cloisons feu relevées (extraits moteur, placo.fr 403 ; 20/11/2026)

| Système | Classement, hauteur | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|
| 100/70, 1 Placoflam BA 15 par face, Stil M 70 e 0,60 simples, laine minérale | EI 60 ; 43 dB ; 3,40 m | fiche système Placo (bibliothèque placo.fr/documents/fiche-systeme, extrait moteur 20/11/2026, numéro sp non affiché) | brochure Isonat ERP : « RS15-020 21/1 : 1 x Placoflam BA13 ou 1 x Placoflam BA15 EI 60 » (extrait moteur) | confirmé (même fabricant, 2 documents) | Seule EI 60 Placo en montants SIMPLES à 0,60 trouvée : elle passe par la BA 15 et le M70. |
| 120/70, 2 Placoflam BA 13 par face, Stil M 70 e 0,60, sans isolant | EI 120 ; 42 dB ; 3,90 m | fiche système Placo (extrait moteur 20/11/2026) | — | 1 source | Pour EI 120 au-delà de 3,00 m. |
| 72/48 Lisaflam (A1) BA 13, M48 e 0,60 SIMPLES | EI 60 ; 33 dB ; 2,60 m | fiche système Placo (extrait moteur 20/11/2026) | recherche/11 [P4b] (autres variantes Lisaflam HD) | 1 source | Variante A1. Aucune 72/48 **Placoflam** en montants simples n'a été trouvée : le moteur garde « doublés à 0,40 » (FICHE §5.8). |
| 72/48 Habito Hydro 13 | EI 60 ; 3,15 m | fiche système Placo (extrait moteur 20/11/2026) | — | 1 source | Habito (haute dureté) est EI 60 en 72/48 : à ne pas proposer d'office. |
| 98/48, 1 Habito 13 + 1 BA 13 par face, M48 e 0,40 | EI 60 ; 47 dB ; 5,15 m | FDES INIES 47775 (titre, 02/12/2025) | — | 1 source | |

## 2. Siniat — compléments (fiches print2pdf lues en PDF via WebFetch, 20/11/2026)

Déjà su (recherche/11 et 20) : D72/48 EI 30, D98/48 EI 60, D106/70 EI 60, D100/70 Flam EI 60, S195 / S205 EI 120, plafonds
S47 REI 30 / REI 60, gaines D72/48, D84/48 S, Prégyfaylite. **D102/48 EI 120 : le PDF répond toujours « erreur 500 »** (4e essai,
20/11/2026) ; l'extrait moteur redit « 2+1 BA18 Std, M48-35, 4,2 m » : rien de neuf.

| Système | Composition | Classement, PV | Hauteur / portée | Source (URL, date de la fiche) | Statut |
|---|---|---|---|---|---|
| Protection de poteaux, contre-cloison sur montants | **3 Prégyflam BA 15** Std ou A1 sur montants M100-50 ; laine de verre ou Biofib'Trio 100 mm derrière les montants ; joints bande + enduit Prégylys | **R 120** ; Efectis 05-U-305 rév. 2 + ext. 06/1 ; épaisseur 255 mm | 5,05 m | https://siniat.fr/-/print2pdf/system/pi80023/siniat-fiche-technique/fr-fr/protection-de-poteaux-par-une-contre-cloison-pregymetal-sur-montants---3-ba15-flam---r120---m100-50---isolant.pdf (02/09/2026) | 1 source |
| Habillage de structure acier (poteaux et poutres H / I) | **1 Prégyflam BA 15** vissée sur rails Prégymétal R36-30/5,4 + clips ; angles par bande ou cornière, enduit Prégylys ; 1 à 3 plaques selon R visé | **R 120** pour massiveté < 46 m⁻¹, température critique 500 °C ; Efectis EFR-15-U-001085 | — | https://siniat.fr/-/print2pdf/system/pi80155/siniat-fiche-technique/fr-fr/protection-des-structures-acier---1-pregyflam-ba15---r120---massivete--46-m.pdf (02/09/2026) | 1 source |
| Plafond autoportant sur montants, 2 Prégyplac **BA 25 S** (standard) | montants Prégymétal Industrie **M125-50 accolés à 0,50** ; laine de verre ≤ 400 mm (13 kg/m³) ou Biofib'Trio 100 mm ; charge 10 daN/m² | **REI 120** sous tous planchers ; Efectis EFR-17-000920 + ext. 17/1 | portée 3,70 m ; plénum 360 mm sans isolant | https://www.siniat.fr/-/print2pdf/system/pi186868/siniat-fiche-technique/fr-fr/plafond-pregymetal-autoportant-2-ba25-s-rei120-m125-50-10dan-lv.pdf (16/11/2025) | 1 source |
| Plafond autoportant 2 BA 25 S, M150-50, 16 daN/m² | variante grande portée | REI 120 | (non lu) | https://www.siniat.fr/-/print2pdf/system/pi186853/... (titre seulement) | à confirmer (fiche non ouverte) |
| Cloisons Prégymétal Industrie BA18 S / BA25 S | simple parement | EI 60 / EI 120 ; EI 180 en parements dissymétriques | grandes hauteurs | batiproduits « Prégymétal Indus » (extrait moteur 20/11/2026) ; fiche Siniat « Industrie D200/150 S EI120 M150-50 » (titre) | 1 source |

Lecture : chez Siniat, la protection de structure (poteau, poutre) est un **système à part** (rails + clips, ou contre-cloison
sur M100), toujours en Prégyflam BA 15 ; le plafond autoportant feu passe par des BA 25 S standard sur montants accolés.

## 3. Knauf — rien de plus récent que 2020

Trois recherches (20/11/2026) : knauf.com fr-FR (page « coupe-feu plafonds cloisons ») et media.knauf.com répondent **403** ;
aucune fiche système Knauf France 2025-2026 hébergée par un négoce n'a été trouvée. Ce qui s'ajoute :
- **Knauf Oversize** (cloison > 12 m) : EI 60 en 2 × 2 KS 13, **EI 120 en 2 × 2 KF 13** (batiproduits, extrait moteur 20/11/2026),
  cohérent avec le catalogue 2020 (KM 98/48 2 KF 13 = EI 120) : 2 documents Knauf, même principe ;
- Knauf GH Futur : EI 30 à EI 120, PV 11-A-642 / 11-A-643 rec. 17/1 (batiweb, extrait moteur) : sans hauteur par classement.
Les tableaux Knauf de recherche/11 §3 (catalogue 2020) restent la seule base chiffrée, **à revalider sur une fiche 2026**.


## 4. Gaines techniques et encloisonnements

| Donnée | Valeur | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note |
|---|---|---|---|---|---|
| Exigence d'une paroi de gaine en logement collectif (2e famille collectif, 3e, 4e) | « coupe-feu de degré ½ h », feu intérieur OU extérieur ; plaques de plâtre sur ossature (NF DTU 25.41) : **simple BA 13 de chaque côté** suffit | FFB, fiche « Sécurité incendie : gaines techniques des logements collectifs » (17/03/2016 ; arrêté du 31/01/1986 art. 48 modifié le 19/06/2015) https://www.ffbatiment.fr/techniques-batiment/reglementation-construction/reglementation-securite-incendie/dossier-bam/securite-incendie-gaines-techniques-des-logements-collectifs (lue 20/11/2026) | Knauf catalogue 2020 p. 146 (EI 30 i→o et o→i) ; Siniat gaine D72/48 EI 30 (recherche/11 [N2]) | confirmé (2 sources) | La fiche FFB date de 2016 ; l'article 48 n'a pas changé depuis 2015 d'après la FFB (non relu sur Légifrance : à confirmer). |
| Trappe / porte de visite de gaine (logement) | ¼ h si < 0,25 m² ; ½ h au-delà ; ¼ h (EI2 15) partout si recoupements A1 à chaque niveau | FFB 2016 (même page) | Knauf 2020 p. 149 (GT 25 : CF paroi ½ h) | confirmé (2 sources) pour le principe ; seuils 1 source | Le classement de la trappe se demande (question « EI 30 ou EI 60 ? » seulement si le devis ne le dit pas). |
| Recoupements | plancher haut du sous-sol, plancher haut des locaux techniques, au moins tous les 2 niveaux en 4e famille ; matériaux incombustibles | FFB 2016 | Knauf 2020 p. 146 | confirmé (2 sources) | Pas une fourniture du plaquiste en général (bouchon béton, laine de roche) : « à préciser ». |
| **Placo, gaine Easy Stil** | gaine de logement montée depuis l'extérieur (pas de vissage ni de joints à l'intérieur) ; Stil M48 tenu par une cornière Stil CR2, rail R48 ou tronçon de M48 en pied et en tête ; variante 75/62/48 en Placo Phonique BA 13 « 1+1 » sur M48 dans R62 ; **EI 30** ; hauteur validée au feu **3,00 m** ; PV « disponible auprès de l'assistance technique » | brochure Placo « Easy Stil » https://www.placo.fr/documents/brochures/easy-stil-web.pdf (403 ; extrait moteur 20/11/2026) | FFB 2016 (BA 13 simple de chaque côté = CF ½ h) | 1 source fabricant (+ principe confirmé FFB) | Numéro de PV non publié. Seule gaine Placo nommée trouvée. |
| Siniat | gaines D72/48 (EI 30, M48 accolés à 0,40, 3,40 m), D84/48 S (EI 60, BA18 S), Prégyfaylite + contre-cloison | recherche/11 §2.3 | — | voir recherche/11 | Rien de neuf. |
| Knauf | KM 72/48 KS 13 + LM 45 (EI 30 / EI 60 traversée), Polycloison + KF 13, Polygaine BA10 ; trappes Star GT 18 / GT 25 | recherche/11 §3.3 (catalogue 2020) | — | 1 source (2020) | « Knauf Shaftwall » / « Kfire gaine » : **aucun document français** trouvé sous ce nom. |
| Trappes Knauf (Benelux) | trappe EI 30 « 2 × DF 12,5 » (cloison, attestation ISIB 2020-A-015) ; EI 60 « 2 × DF 15 » (plafond, 500 et 600 mm) | knauf.com fr-BE / fr-LU (extraits moteur 20/11/2026) | — | 1 source (marché belge) | Hors France : ne pas proposer d'office. |
| Trappes Siniat | aucune trappe Siniat France trouvée ; Siniat Belgique « FireProtect » EI 60 (500 × 500, 600 × 600) | media.siniat.fr si-pm-pds-fireprotection-be-fr.pdf (titre et extrait, 20/11/2026) | — | à confirmer (raison : marché belge seulement) | Pour un système « tout Siniat », la trappe reste « à préciser » (Semin, CFD… avec PV propre). |

## 5. Doublages, contre-cloisons et protection de structures acier

| Système | Composition | Classement, PV | Source 1 | Source 2 | Statut |
|---|---|---|---|---|---|
| Siniat, protection de poteaux en contre-cloison | 3 Prégyflam BA 15 sur M100-50, isolant 100 mm derrière les montants | R 120, Efectis 05-U-305 rév. 2 + ext. 06/1 ; 5,05 m | Siniat pi80023 (02/09/2026) | — | 1 source |
| Siniat, habillage poteaux / poutres acier (caisson) | 1 à 3 Prégyflam BA 15 sur rails R36-30/5,4 + clips | R 30 à R 120 (1 BA 15 = R 120 si massiveté < 46 m⁻¹, θcr 500 °C) ; EFR-15-U-001085 | Siniat pi80155 (02/09/2026) | Placo Clipfeu (accessoire d'habillage de structure, boîte de 60 ; recherche/11 [P9]) | 1 source par marque (principe : 2 marques) |
| Knauf, contre-cloison CC Oversize, feu côté plaques | KS 13 / KF 13 / BA 25 selon classement (CC 213, CC 25+13, CC 225…) ; vis TTPC 25-45 (BA13), TTPC 35-55-70 (BA25) ; **fixation des rails ramenée à 300 mm en cas de performance feu** | EI 30 / EI 60 / EI 120, Efectis 07-A-425 ext. 15/9 | fiche système Knauf V2 du 23/09/2015 (copie locale, recherche/11 [K4]) | — | 1 source (2015, à revalider) |
| Placo, contre-cloison / doublage feu | aucune fiche « doublage EI » Placo lue ; Placo traite la protection de structure par Clipfeu et ses plaques feu | — | — | — | à confirmer (raison : placo.fr 403) |

Conclusion pour la fiche : un doublage coupe-feu ou un caisson de poteau est **rare chez le plaquiste de logement** et chaque
marque le fait avec un système dédié (rails + clips, M100, massiveté de l'acier). Le moteur ne doit **pas** le calculer : ligne
« à préciser » avec la phrase « système de protection de structure selon PV de la marque (massiveté, R visé) ».

## 6. Plafonds REI : compléments (autoportants feu, Siniat, Knauf)

| Système | Composition | Classement, PV | Portée | Source 1 | Source 2 | Statut |
|---|---|---|---|---|---|---|
| Placo, plafond sur montants Stil (autoportant), sous bois | REI 15 : 1 BA 13 ; REI 30 : 1 Placoflam BA 15, ou 1 BA 18/18S, ou 2 BA 13 ; REI 60 : 2 BA 18/18S ou 3 Placoflam BA 15 — **toutes « estimation »** (Eurocode 5, sans PV) ; REI 120 : **2 Placoplatre BA 25, PV RS 21-008** | — | tableau p. 108 | Intégrale Placo 04/2023 Plafonds p. 87 (copie locale, lue 20/11/2026) | Siniat autoportant 2 BA 25 S REI 120 (ci-dessous) pour le REI 120 | REI 120 : confirmé (2 fabricants, même principe 2 BA 25) ; REI 30 / 60 : 1 source |
| Siniat, plafond autoportant sur montants | 2 Prégyplac **BA 25 S** ; M125-50 Industrie **accolés à 0,50** ; LV ≤ 400 mm 13 kg/m³ ou Biofib'Trio 100 ; 10 daN/m² | REI 120 sous tous planchers ; Efectis EFR-17-000920 + ext. 17/1 | 3,70 m ; plénum 360 mm sans isolant | Siniat pi186868 (16/11/2025) | Placo 2 BA 25 PV RS 21-008 | confirmé (2 fabricants) pour 2 BA 25 = REI 120 |
| Placo, Stil Prim 100 (longue portée) | 2 Placoflam BA 15 sur Stil Prim 100 à 1,20 m | **R 90** ; portée 3,30 m | — | fiche système Placo SP00012384, éd. 09/06/2026 (extrait moteur) | — | 1 source |
| Siniat, vissage des plafonds feu | aucun pas ni nombre publié (rappel recherche/20) | — | — | — | — | à confirmer |
| Knauf | rien de neuf (Métal Chrono : composition seulement, recherche/20 §2.2) | — | — | — | — | à confirmer |

## 7. Accessoires d'un système feu

| Accessoire | Ce que disent les documents | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Conséquence pour le moteur |
|---|---|---|---|---|---|
| Bande et enduit | **les mêmes qu'en standard** : Placo compte Placojoint PR4 et bande papier dans ses FDES feu (98/48 2 Placoflam EI 120 : 2,58 ml et 0,69 kg/m²) ; Siniat : « bande pour joints et enduit Prégylys » sur ses fiches feu | FDES Placo 38678 (25/07/2024) ; FDES 48876 (19/02/2026) | Siniat pi80023, pi80155, pi186868 (2025-2026) | confirmé (2 fabricants) | **Aucun enduit « feu » à ajouter.** Bande et enduit restent les cases à cocher déjà prévues (décision Greg 20/11). |
| Vissage des cloisons feu | **vissage courant** : la FDES Placo 98/48 2 Placoflam EI 120 compte 32 vis TTPC 25/35 par m² de cloison (4 peaux comptées « comme peau simple » : 8 par peau) ; aucune fiche Placo ou Siniat ne cite un pas réduit en cloison | FDES 38678 | recherche/11 §1.1 et §2.1 (aucun pas réduit dans les fiches lues) | 1 source chiffrée (fabricant) ; absence de pas réduit : 2 marques | Garder le vissage du 98/48 standard de la fiche (§5.x, 1re peau TTPC 25, 2e peau TTPC 35). **Exception Knauf** : contre-cloison feu, fixation des rails à 300 mm (fiche 2015) ; KM 72/48 KF : feuillard aux joints horizontaux (catalogue 2020). |
| Fixation des rails (feu) | Knauf : « entraxe des fixations des rails ramené à 300 mm en cas de performance feu » (contre-cloisons CC) | Knauf fiche CC Oversize, 23/09/2015 | — | 1 source (2015) | Ne pas l'étendre aux autres marques ni aux cloisons sans document. |
| Tête de cloison | fixée dans un support de performance au feu au moins égale à celle de la cloison ; jeu de 1 cm en tête (Placo), plaques butées en tête et 1 cm en pied | Knauf GH (knauf.com fr-DZ, extrait moteur 20/11/2026) | Placo Intégrale 2021-2022 cloisons distributives (extrait moteur) | 1 source chacune | Pas de fourniture en plus ; à dire en hypothèse. |
| Boîtiers électriques | Placo : EI 60 « avec joints horizontaux en vis-à-vis non protégés et **boîtiers électriques non protégés décalés**, ou **en vis-à-vis protégés par BA 13** » (hauteur 3 m dans ces fiches) ; renvoi au PV (RS 15-019 à RS 15-022) ; EI 60 avec boîtiers standards non protégés : 4 m maxi (déjà su, recherche/03 §7) | fiches système Placo (extraits moteur 20/11/2026) | Pladur PV EFR 14-J-002357 (recherche/11) ; Hilti CP 617 et Bostik : solutions intumescentes du commerce pour boîtiers de cloisons sèches (extraits moteur) | confirmé (2 sources) pour « boîtiers décalés ou protégés » | Aucune pièce de la marque du plaquiste : ligne « à préciser » « boîtiers électriques : décalés d'une face à l'autre, ou protégés selon le PV ». Jamais un capot inventé. |
| Mastic / joint intumescent en périphérie | **aucune fiche Placo, Siniat ou Knauf lue ne l'exige** pour une cloison courante ; le joint intumescent existe sur le pourtour des **trappes** (Placo) ; les mastics coupe-feu (Hilti, Bostik, Sika) servent aux **traversées** et joints linéaires selon NF EN 1366-3 / -4, avec leur propre PV | Offre Placo 2024 p. 100-101 (trappes) | Bostik, livre blanc « étanchéité résistante au feu » 2023 ; Hilti manuel coupe-feu (extraits moteur) | à confirmer (raison : les PV de cloisons ne sont pas publiés) | Ne rien sortir d'office ; une traversée (gaine, tuyau) est le lot de l'électricien / plombier ou un « à préciser » au devis. |
| Trappes de visite EI | Placo : CF TRAP EI 30 / EI 60 / EI 120, verticale ou horizontale, 200 à 800 mm, joint intumescent (Offre 2024) ; Knauf : Star GT 18 / GT 25 (2020) ; Siniat France : non trouvée ; tiers (Semin EI 30 / EI 60, cloison et plafond) | recherche/11 [P1], [K1] | batiproduits Semin (extraits moteur 20/11/2026) | confirmé (2 sources) pour l'existence | Une trappe part **telle qu'écrite** (dimension, cloison / plafond, EI) ; règle « marque unique » : chez Siniat, signaler qu'il n'y a pas de trappe de la marque. |

## 8. Pladur et Fermacell

- **Pladur** : rien de publié en France après le Mémento 2017 déjà utilisé (recherche/03 [S41]) ; aucune FDES INIES. Reste une
  2e source de principe, jamais une marque proposée.
- **Fermacell** : le guide de prescription lisible (copie Chausson, « état au 01/2012 ») ne contient aucun tableau de cloison EI ;
  la brochure « Constructions parois plafonds » 2017 (eurabo.be, Belgique) cite des cloisons EI 60 / EI 90 en 12,5 mm sur
  ossature 75 / 100 avec laine minérale, mais le texte extrait est illisible et sans numéro de PV français. **À confirmer**
  (raison : aucun document français en vigueur). Fermacell reste hors de la question « Quelle marque ? ».

## 9. Tableau de synthèse : cloisons, par marque et par EI (état au 20/11/2026)

« 2 s. » = deux sources (dont un fabricant) ; « 1 s. » = une ; « à c. » = à confirmer. Ce qui vient de recherche/11 est rappelé, pas refait.

| EI | Placo | Siniat | Knauf | État |
|---|---|---|---|---|
| EI 30, 72/48 | 1 BA 13 std/face, M48 0,60, LM 45 ; RS 15-019 ; 2,50 m (FDES 54013, 2026, titre) | D72/48 1+1 Prégyplac BA13, M48-35, LV 45 ; EFR-24-005466 ; 2,50 à 3,40 m | KM 72/48 KS 13, LM obligatoire, 3,00 m (2020) | 2 s. (3 marques) |
| EI 60, 72/48 | 1 Placoflam BA 13/face, M48 **doublés 0,40**, LM 45 ; RS 15-020 ; 3,45 m | **aucune** : D106/70 (1 BA18 std/face, M70-50 ou M70-35) ou D100/70 Flam (1 Prégyflam BA15/face) | KM 72/48 1 KF 13/face, doublés 0,40, LV 45 12 kg/m³, feuillard ; 3,40 m (2020) | 2 s. (Placo, Knauf) |
| EI 60, montants simples 0,60 | **100/70, 1 Placoflam BA 15/face, M70 0,60, LM ; 3,40 m** (nouveau) | D100/70 Flam, simples 0,60 : 3,90 m | — | 1 s. par marque, même principe (BA 15 feu sur M70) : 2 s. |
| EI 60, 98/48 | 2 BA 13 std/face, M48 0,60 ; 3,00 m (FDES 48877, 2026) | D98/48 2+2 BA13 (dB), M48-50 ; 3,55 à 5,05 m | KM 98/48 2 KS 13/face ; 3,00 à 4,15 m (2020) | 2 s. |
| EI 90 | aucun système trouvé | aucun (recherche ciblée « EI90 » sur siniat.fr : rien) | KM 98/48 KS 13 + KF 13 /face (2020) | 1 s. ; en pratique, monter en EI 120 |
| EI 120, 98/48 | 2 Placoflam BA 13/face, M48 0,60, LV 45 ; RS 15-022 + ext. 21/1 ; **3,00 m** (FDES 38678) ; ou **1 Placoplatre BA 25 std/face**, M48, RS 11-044 ; **3,80 m** (FDES 48876 / 47773) | D102/48 2+1 BA18 std, M48-35 accolés ; 3,75 / 4,20 m (composition : extrait seul) ; S195 / S205 3+3 BA13 | KM 98/48 2 KF 13/face ; jusqu'à 4,35 m (2020) | 2 s. (Placo 2 fiches, Knauf) ; Siniat 1 s. |
| EI 120, plus haut | 120/70 2 Placoflam BA 13/face, M70 0,60, sans isolant ; 3,90 m | Industrie D200/150 S (titre) | KM 120/70, 140/90, 150/100 KF (2020) | 1 s. |

## Ce qu'il faut changer dans la fiche

1. **98/48 EI 120 Placo, hauteur** : avant 3,10 m (fiche sp00020115, sans isolant) → **3,00 m avec laine** (FDES INIES 38678 du
   25/07/2024, RS 15-022 + ext. 21/1). Prendre 3,00 m par défaut (cas courant avec laine). Contradiction expliquée (isolant).
2. **98/48 EI 120 Placo, deuxième montage** : ajouter « 1 Placoplatre **BA 25** standard par face, M48, RS 11-044, **3,80 m** »
   (FDES 48876 du 19/02/2026 et 47773 du 02/12/2025). C'est la seule EI 120 Placo au-delà de 3,00 m en 98 mm : le moteur la
   propose quand la hauteur dépasse 3,00 m. Quantités FDES par m² : BA 25 2,1 m² ; M48 2,63 ml ; R48 0,55 ml ; 18 vis ; bande 3,44 ml ; enduit 0,92 kg.
3. **EI 60 en montants simples (Placo)** : ajouter « 100/70, 1 Placoflam BA 15/face, M70 à 0,60, 3,40 m » comme alternative à la
   72/48 doublée à 0,40 (fiche système Placo, extrait ; même PV RS 15-020 que la 72/48, brochure Isonat ERP). La 72/48 Placoflam
   « doublés 0,40 » reste le défaut quand le devis écrit « 72/48 ».
4. **Laine et fibre de bois** : la règle « laine minérale obligatoire, jamais biosourcé sans fiche » reste ; préciser qu'elle
   dépend du PV : Placo 98/48 BA 25 EI 120 est classée **avec Isonat Flex 40** (FDES 48876) ; donc « isolant de la fiche du système
   choisi », pas « laine minérale » en dur pour tous les systèmes.
5. **Vissage des cloisons feu** : aucune règle à part ; garder le vissage du 98/48 standard (FDES 38678 : vis TTPC 25/35, aucun pas
   réduit). Rien de « feu » à ajouter en vis.
6. **Bande et enduit** : les mêmes qu'en standard (Placo FDES, Siniat fiches) : aucune ligne « enduit feu ».
7. **Boîtiers électriques** : ajouter au bloc « À préciser » la phrase « boîtiers électriques décalés d'une face à l'autre, ou
   protégés selon le PV » (Placo fiches système + Pladur PV, 2 sources). Jamais un capot sorti d'office.
8. **Gaine Placo** : remplacer « gaine non trouvée » par « Easy Stil, EI 30, 3,00 m, PV sur demande » (1 source) ; ne pas la
   calculer ligne à ligne (composition partielle) : ligne « système de gaine Easy Stil selon PV, à chiffrer ».
9. **Gaines (toutes marques), exigence** : une paroi de gaine de logement collectif = CF ½ h ; une simple BA 13 de chaque côté suffit
   (FFB 2016 + Knauf + Siniat) ; trappe ¼ h sous 0,25 m², ½ h au-delà (FFB) : la question « classement de la trappe » ne se pose
   que si le devis ne le dit pas.
10. **Plafond autoportant REI 120** : ajouter « 2 BA 25 standard sur montants » (Placo RS 21-008 ; Siniat 2 BA 25 S sur M125-50
    accolés à 0,50, 3,70 m, EFR-17-000920). REI 30 / 60 autoportant Placo = « estimation » sans PV : à dire comme tel.
11. **Protection de poteaux / poutres acier et doublages EI** : pas d'ouvrage dans le moteur ; ligne « à préciser » (système dédié
    de la marque : rails + clips Siniat R 120 en 1 Prégyflam BA 15 si massiveté < 46 m⁻¹ ; contre-cloison 3 BA 15 Flam sur M100 ;
    Knauf CC rails fixés tous les 30 cm).
12. **Trappes** : Siniat France n'a pas de trappe coupe-feu trouvée : pour un système « tout Siniat », la trappe sort « à préciser »
    avec une phrase pour l'artisan (trappe d'un fabricant tiers avec son propre PV).

## Ce qui reste incertain

- **Knauf 2026** : toutes les cloisons et gaines Knauf viennent du catalogue 2020 (avant DTU 2022) ; knauf.com et media.knauf.com
  en 403 ; aucune fiche 2025-2026 trouvée chez un négoce. Hauteurs à revalider.
- **Siniat D102/48 EI 120** : PDF en erreur 500 (4e essai) ; isolant et côté des deux BA 18 non lus.
- **EI 90** : seul Knauf (2020) publie une cloison EI 90 courante ; Placo et Siniat : rien. Le moteur prend le système EI 120 de la
  marque quand le devis dit EI 90 ? **Proposition** (à valider par Greg) : oui, en le disant (« pas de système EI 90 publié par
  cette marque, je pars sur son EI 120 »).
- **Mastic / joint intumescent de périphérie et traversées** : non exigés dans les fiches lues ; les PV (non publiés) peuvent le
  demander. Reste « à préciser ».
- **Vissage des plafonds feu Siniat et Knauf** : non publiés (rappel recherche/20).
- **Placo 72/48 Placoflam en montants simples** : aucune fiche trouvée (seulement Lisaflam 2,60 m) ; on garde « doublés 0,40 ».
- **Fermacell, Pladur** : aucun document français en vigueur lisible : hors de la question « Quelle marque ? ».
- **Article 48 de l'arrêté du 31/01/1986** : lu à travers la fiche FFB de 2016, pas sur Légifrance.
- **Extraits de moteur** (placo.fr, knauf.com en 403) : les chiffres cités ainsi (100/70 BA 15 3,40 m ; 120/70 3,90 m ; Easy Stil ;
  Stil Prim R 90) sont à relire sur la fiche quand un accès sera possible.

## Bilan

- Recherches : 14 recherches web, 7 lectures de pages ou de PDF (4 fiches Siniat via WebFetch, dont 1 en erreur 500 ; FFB ;
  2 refus 403 Knauf), 2 FDES INIES lues en PDF, inventaire complet de la liste INIES (9 836 fiches), relecture des copies locales
  (Intégrale Placo 2023 plafonds, fiche Knauf CC 2015, guide Fermacell 2012).
- Chiffres relevés : environ 70.
- Confirmés (2 sources) : EI 30 72/48 (3 marques) ; EI 60 72/48 doublés 0,40 (Placo, Knauf) ; EI 60 98/48 (3 marques) ; EI 120 98/48
  2 plaques feu (Placo, Knauf) ; EI 60 en BA 15 feu sur M70 (Placo, Siniat) ; plafond autoportant REI 120 en 2 BA 25 (Placo, Siniat) ;
  exigence CF ½ h des gaines de logement, trappes et recoupements (FFB, Knauf, Siniat) ; bande et enduit standards (Placo, Siniat) ;
  boîtiers « décalés ou protégés » (Placo, Pladur).
- 1 source : quantités FDES des deux 98/48 EI 120 Placo ; 100/70 Placoflam BA 15 ; 120/70 EI 120 ; Easy Stil ; Siniat poteaux,
  caissons acier, plafond autoportant ; Stil Prim R 90 ; Knauf fixation des rails à 300 mm ; Knauf Oversize 2 × 2 KF 13 EI 120.
- À confirmer : liste ci-dessus (« Ce qui reste incertain »).
- Contradiction expliquée : 98/48 2 Placoflam EI 120, 3,00 m (avec laine, FDES 2024) / 3,10 m (sans isolant, fiche système).

## Sources

Consultation : 20/11/2026 pour toutes.

1. FDES Placo « Cloison distributive Placostil 98/48 – 2x Placoflam BA 13 avec M 48 – EI120 – 47dB – max 3,00m – PAR Phonic 45 mm », INIES 20240638678, réalisée 25/07/2024 — https://www.base-inies.fr/api/Produit/38678 ; PDF https://www.base-inies.fr/api/Document/96944/download.
2. FDES Placo « Cloisons – 98/48 – 1x Placoplatre BA 25 – … – Stil M 48 – 0,90 m – EI120 – 45 dB – 3,80 m – FLEX 40 40 mm », INIES 20260148876, réalisée 19/02/2026 — https://www.base-inies.fr/api/Document/126957/download.
3. Base INIES, liste des fiches en ligne (titres : 47773, 47775, 48877, 54013, 46575, 46801, 50569…) — https://www.base-inies.fr (copie de la liste du 20/11/2026).
4. Siniat, « Protection de poteaux par une contre-cloison Prégymétal sur montants – 3 BA15 Flam – R120 – M100-50 », 02/09/2026 — https://siniat.fr/-/print2pdf/system/pi80023/siniat-fiche-technique/fr-fr/protection-de-poteaux-par-une-contre-cloison-pregymetal-sur-montants---3-ba15-flam---r120---m100-50---isolant.pdf.
5. Siniat, « Protection des structures acier – 1 Prégyflam BA15 – R120 – massiveté < 46 m⁻¹ », 02/09/2026 — https://siniat.fr/-/print2pdf/system/pi80155/siniat-fiche-technique/fr-fr/protection-des-structures-acier---1-pregyflam-ba15---r120---massivete--46-m.pdf.
6. Siniat, « Plafond Prégymétal autoportant 2 BA25 S REI120 M125-50 10 daN LV », 16/11/2025 — https://www.siniat.fr/-/print2pdf/system/pi186868/siniat-fiche-technique/fr-fr/plafond-pregymetal-autoportant-2-ba25-s-rei120-m125-50-10dan-lv.pdf.
7. Siniat, D102/48 EI120 (pi79225) — erreur 500 ; titres des fiches D106/70 M70-35 (pi80282), Industrie D200/150 S (pi80725), autoportant M150-50 (pi186853), S180 EI 60 (pi79436) — résultats de recherche.
8. Siniat Belgique, « FireProtect » (trappe EI 60) — https://media.siniat.fr/pi612454/original/-258038225/si-pm-pds-fireprotection-be-fr.pdf (extrait).
9. Placo, fiches système (bibliothèque https://www.placo.fr/documents/fiche-systeme/, 403) : 100/70 1 Placoflam BA 15 EI 60 3,4 m ; 120/70 2 Placoflam BA 13 EI 120 3,90 m ; 72/48 Lisaflam simples 2,60 m ; Habito Hydro 72/48 EI 60 3,15 m ; fiches EI 60 « boîtiers décalés ou protégés par BA 13 » ; SP00012384 (Stil Prim 100, 2 Placoflam BA 15, R 90, 09/06/2026) — extraits moteur.
10. Placo, brochure « Isonat ERP » (RS15-019 / RS15-020 21/1) — https://www.placo.fr/documents/brochures/brochure-isonat-placo-erp-1.pdf (extrait).
11. Placo, brochure « Easy Stil » — https://www.placo.fr/documents/brochures/easy-stil-web.pdf (extrait).
12. Placo, L'Intégrale Second Œuvre 04/2023, Plafonds, p. 87 — https://dam.pim-cps.saint-gobain.com/MAM/assets/1/C1A269993195482DA567890D5C26E716/doc/CEDB5A77BEAE4BDA8E2753C0A9B3A813/SO03-Intgrale_Placo_Second_Oeuvre_04.2023_-_Plafonds.pdf (copie locale).
13. Placo, L'Intégrale 2021-2022, Cloisons distributives (jeu en tête, renvoi PV boîtiers) — https://www.placo.fr/sites/mac3.placo.fr/files/files/forum/L%27Int%C3%A9grale%20Placo%202021-2022%20-%20%20Cloisons%20distributives%20Placostil%C2%AE%20BA13-%20BA15-%20BA18.pdf (extrait).
14. Knauf, fiche système « Knauf Métal CC Oversize, feu côté plaque », V2 du 23/09/2015 — https://tools.knauf.fr/file/55422/download?token=htLZU9zO (copie locale).
15. Knauf, catalogue « Plaquiste / Plafiste 2020 — Cloisons » (rappel recherche/11 [K1]).
16. Batiproduits, « Knauf Oversize » (EI 120 en 2 × 2 KF 13) — https://www.batiproduits.com/fiche/produits/cloison-pour-hauteur-superieure-a-12-m-p68911943.html (extrait) ; Batiweb « Knauf Métal GH Futur » — https://www.batiweb.com/produit-btp/cloison-grande-hauteur-knauf-metal-gh-futur-349427 (extrait) ; Knauf GH fr-DZ (tête de cloison) — https://knauf.com/fr-DZ/systemes/systemes-de-construction-secs/systeme-cloison/cloisons-grande-hauteur-gh (extrait).
17. Knauf Belgique / Luxembourg, trappes EI 30 (2 × DF 12,5) et EI 60 (2 × DF 15) — https://knauf.com/fr-BE/p/produit/trappe-de-visite-resistante-au-feu-ei-30-2-x-df-12-5-24491_0217 (extrait).
18. FFB, « Sécurité incendie : gaines techniques des logements collectifs », 17/03/2016 — https://www.ffbatiment.fr/techniques-batiment/reglementation-construction/reglementation-securite-incendie/dossier-bam/securite-incendie-gaines-techniques-des-logements-collectifs (lue).
19. Hilti, manuel coupe-feu ; Bostik, livre blanc « étanchéité résistante au feu » 2023 — https://www.bostik.com/files/live/sites/shared_bostik/files/documents-brochures/Netherlands/Whitepapers/bostik-benelux-whitepaper-etancheite-resistante-au-feu-fr-2023.pdf (extraits).
20. Semin, trappes cloison / plafond EI 30 et EI 60 — https://www.batiproduits.com/fiche/produits/trappe-cloison-coupe-feu-ei-60-min-semin-p366065640.html (extrait).
21. Fermacell, guide de prescription (état 01/2012), copie Chausson — https://cdn.chausson.fr/catalog-document/02550c9b-d95f-48e4-a3d6-ac1949526784/guide-de-prescription-et-mise-en-oeuvre-plaque-fermacell-fibres-gypse.pdf ; brochure 2017 (Belgique) — https://eurabo.be/files/attachments/.5302/02FR_FERMACELL_Constructions_parois_plafonds_apercu_2017.PDF (extrait).
