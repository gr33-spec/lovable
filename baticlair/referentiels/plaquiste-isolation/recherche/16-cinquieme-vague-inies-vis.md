# 16 — Cinquième vague : FDES INIES et vis par marque (20 novembre 2026)

Lot : FDES des systèmes Placo / Siniat / Knauf (quantités de composants par m²), puis les vis encore à une source ou en désaccord.
Consignes : `_consignes.md`. Rédigé au fur et à mesure. Abréviations : [Yn], liste en fin de fichier ; [V*] = `09`, [W*] = `13`, [X*] = `15`.
Aucune autre modification du dépôt.

## Journal (au fur et à mesure)

- Démarrage : fichier créé avant toute recherche.
- Base INIES : l'application publique (base-inies.fr) lit ses fiches par une API ouverte en lecture, `GET https://www.base-inies.fr/api/Produit/<id>` (JSON public, sans compte), qui donne la **liste des constituants de l'unité fonctionnelle avec leur masse en kg** (`tConstituantUfs`). Le téléchargement du PDF de la FDES n'a pas été tenté plus loin (point d'accès refusé par l'outil) : les chiffres ci-dessous viennent du JSON de la fiche publiée, identique au tableau « constituants » de la FDES. Consulté le 20/11/2026.
- Unités : toutes les masses sont en kg (idUnite 3) ; UF = 1 m² de paroi (idUnitUf 2) pour les systèmes, 1 ml (idUnitUf 5) pour les profilés, 1 pièce pour les appuis.
- Point clé : la FDES 48877 (Cloison 98/48 2 × 2 BA13, vérifiée le 19/02/2026) écrit elle-même le nombre de vis à côté de la masse : « Vis TTPC 35 (x22) 0,0418 kg » → **1,90 g par TTPC 35** ; « Vis TRPF 13 (x2) 0,0026 kg » → **1,30 g par TRPF 13**. Ce sont les masses unitaires de Placo, publiées.
- Limite : les autres FDES arrondissent la masse des vis à 10 g près (0,02 kg = de 15 à 25 g). Elles ne départagent donc pas 22 et 30 vis par m² ; elles bornent seulement.
- Masse d'une TTPC 25 : fiche produit Placo « Vis TTPC 25 » (18/12/2023, réf. E60261500, EAN 3496250214729, extrait moteur, placo.fr 403) : boîte de 1500 = **2,089 kg** de poids moyen, carton compris → 1,39 g par vis au plus ; boîte de 500 = 0,723 kg → 1,45 g carton compris. Retenu : **1,35 g** (carton déduit, ordre de 50 à 80 g ; cohérent avec 1,90 g pour la TTPC 35 de la FDES 48877, 10 mm de tige en plus). Semin (fiche négoce, vis de 35 mm) : 1,74 kg les 1000, autre marque, même ordre.
- Conversion : nombre de vis = masse FDES ÷ masse unitaire. Une masse écrite « 0,02 kg » couvre 0,015 à 0,025 kg, soit **11 à 18 TTPC 25** (14,8 au centre) ; « 0,03 kg » = 18 à 26 ; « 0,04 kg » = 26 à 33 ; « 0,01 kg » = 4 à 11.
- Ossatures (FDES de produit, UF = 1 ml) : Montant Stil M48 0,57 kg/ml (33775) ; Rail Stil R48 0,43 (33778) ; Fourrure Stil F530 0,43 (33851) ; Rail Stil F530 0,25 (33457) ; Siniat : Montant Prégymétal 48-35 0,59 (51733), Rail 36 et 48 0,44 (51729), Fourrure S47 0,46 (51734). Appui Optima 2 75-160 : 0,0535 kg de composite par pièce (37219). Ces masses linéiques convertissent les kg des FDES système en ml/m².
- Contrôle de cohérence : 72/48, BA13 = 18,48 kg = 2 × 9,24 kg = 2 × 1,05 m² × 8,8 kg/m² : la FDES compte bien **1,05 m² de plaque par face** (même majoration que la fiche).
- Siniat et Knauf : **aucune FDES de système** (cloison, doublage, plafond) sur INIES au 20/11/2026 ; seulement des FDES de produit (plaques, profilés Prégymétal, complexes Polyplac / Prégymax). Pas de 2e marque par cette voie.

## Constituants relevés (FDES INIES, 1 m² de paroi)

| FDES (n° d'enregistrement, vérif.) | Constituants utiles (kg/m²) | Converti |
|---|---|---|
| 38652 « Cloison Placostil 72/48 1 × BA13, M48, EI30, 37 dB, max 2,50 m, PAR Phonic 45 » (20240638652, 19/06/2024) — même chiffres dans 37036 (sans isolant) | BA13 18,48 ; M48 1,197 ; R48 0,387 ; TTPC 25 0,02 ; vis profilés 0,002 ; chevilles 0,001 ; enduit PR4 0,693 (+ eau 0,333) ; bande PP 0,019 | plaque 2,10 m² ; **montants 2,10 ml** ; **rails 0,90 ml** ; TTPC 25 ≈ 15 (11 à 18) ; enduit 0,693 = 0,66 × 1,05 |
| 54013 « Cloisons 72/48 1 × BA13, M48 0,60, EI30, 39 dB, 2,50 m, Flex 40 » (20261054013, 05/10/2026) | BA13 18,21 ; M48 1,2 ; R48 0,36 ; « vis acier (TTPC35/TRPF) » 0,03 ; enduit 0,70 (+ eau 0,34) ; bande 0,019 | **montants 2,105 ml** ; **rails 0,837 ml** (= 2 / 2,50 × 1,05) ; vis 25 à 35 g : 17 à 24 TTPC 25 + 2 TRPF (si TTPC 35 : 12 à 17) |
| 48877 « Cloisons 98/48 2 × 2 BA13, M48 0,60, EI60, 47 dB, 3,0 m » (20260148877, 19/02/2026) | BA13 36,96 ; M48 1,2 ; R48 0,3 ; vis (TTPC/TRPF) 0,05 dont **« Vis TTPC 35 (x22) 0,0418 »** et **« Vis TRPF 13 (x2) 0,0026 »** ; enduit 1,39 ; bande 0,038 | montants 2,105 ml ; rails 0,70 ml (= 2 / 3,0 × 1,05) ; **22 TTPC 35** (2e peaux, deux faces) ; **2 TRPF** ; reste 5,6 g ≈ 4 TTPC 25 (1res peaux) ; enduit et bande doublés (deux couches jointoyées) |
| 38681 « 98/48 2 × BA13, EI60, 45 dB, max 3,00 m » (20240638681, 19/06/2024) | M48 1,197 ; R48 0,387 ; TTPC 25/35 0,04 | 2,10 ml ; 0,90 ml ; vis 35 à 45 g |
| 38669 « Séparative SAA 120, 2 × BA13, EI60, 56 dB, 3,00 m » (20240638669, 19/06/2024) | M48 3,876 ; R70 0,598 ; TTPC 25/35 0,04 ; vis profilés 0,012 ; ruban résilient 0,011 | M48 6,8 ml/m² ; vis plaques 35 à 45 g |
| 38671 « Séparative SAD 180, 2 + 3 BA13 » (20240638671, 19/06/2024) | M48 5,985 ; R48 0,688 ; TTPC 25/35 0,05 ; vis profilés 0,019 | M48 10,5 ml ; R48 1,60 ml |
| 39762 « Plafond F530 plancher bois, 1 × BA13, 0,6 m, portée 1,2 m, REI15 » (20240739762, 09/09/2024) | fourrure 0,75 ; rail F530 0,28 ; suspente longue 0,06 ; éclisse 0,02 ; « vis (plaques et suspentes) » 0,04 ; enduit 0,35 ; bande 0,01 | **fourrures 1,74 ml** ; rail 1,12 ml ; vis 35 à 45 g, suspentes comprises |
| 39558 « Plafond F530 plancher bois, 2 × BA13, REI30 » (20240739558, 09/09/2024) | fourrure 0,75 ; « vis (plaques et suspentes) » 0,06 | 1,74 ml ; vis 55 à 65 g |
| 52811 « Plafonds sur fourrures F530, 2 × BA13, 0,6 m, portée 1,2 m, Flex 55 » (20260249011, 16/03/2026) | fourrure 0,77 ; rail F530 0,12 ; suspente 0,07 ; « vis acier (TTPC) » 0,06 ; enduit 0,69 ; bande 0,02 | **fourrures 1,79 ml** ; rail 0,48 ml ; vis 55 à 65 g |
| 35455 « Optima Murs, GR 30 kraft 101 + BA13 » (20231035455, 24/10/2023) | fourrure 0,9197 ; rail F530 0,1944 ; appui Optima 2 120 0,0251 ; **TTPC 25 0,01** ; vis 0,0059 | fourrures 2,14 ml ; lisses 0,78 ml ; appuis 0,68 ; **TTPC 25 : 4 à 11** |
| 40951 « Optima Murs avec membrane, GR 32 100 + BA13 » (20241140951, 04/12/2024) | fourrure 1,07 ; rail 0,194 ; appui 75-160 0,042 ; vis (plaques, profilés, pièces jaunes) 0,019 | fourrures 2,49 ml ; lisses 0,78 ml ; **appuis 0,79** |
| 49767 « Optima Murs sans membrane, GR 32 120 + BA13, entraxe 0,60 » (20260349767, 20/04/2026) | fourrure 1,08 ; lisse 0,21 ; appui 0,04 ; vis 0,02 | **fourrures 2,51 ml** ; **lisses 0,84 ml** ; **appuis 0,75** ; vis 15 à 25 g (appuis compris) |
| 47198 / 47199 « 72/48 Aquaroc / Glasroc, Hydrostil M48 **0,40 doubles**, 3,3 / 3,55 m » (20251047198 / 99, 03/12/2025) | montants 3,04 ; vis 0,09 (Aquaroc HB 25 + TRPF) / **0,03** (TTPC 35 + TRPF) | montants 5,33 ml (doubles 0,40) ; vis : les deux fiches sœurs, même ossature, diffèrent du triple |

## Tableau

| Sujet | Valeur retenue | Nouvelle valeur | Source 1 | Source 2 | Nouveau statut | Explication |
|---|---|---|---|---|---|---|
| 1. Montants 72/48 simples 0,60 | 2,10 ml/m² | — | [V1] SNIP fiche 18 : 2,10 | [Y1] FDES Placo 38652 (2024) : 1,197 kg ÷ 0,57 kg/ml [Y5] = **2,10** ; [Y2] FDES 54013 (2026) : **2,105** ; 98/48 de 3,0 m [Y3] : 2,105 | **confirmé (SNIP + FDES Placo vérifiée)** | La FDES compte 2,10 ml/m² quelle que soit la hauteur (2,50 ou 3,0 m) : c'est un ratio de surface, montants de départ et d'about compris, majoré de 5 %. Contradiction n° 35 de `09` (Pladur 1,75 « entraxe + 1 ») : 2,10 est la valeur Placo et SNIP. |
| 2. Rails 72/48 | 0,84 ml/m² | — (garder 0,84 à 2,50 m) | [V1] SNIP : 0,84 | [Y2] FDES 54013 (2026) : 0,36 ÷ 0,43 = **0,837** à 2,50 m ; [Y3] 48877 : 0,70 à 3,0 m ; ancienne [Y1] (2024) : 0,90 | **confirmé (2 sources) ; règle = 2 / H × 1,05** | 0,84 = 2 rails ÷ 2,50 m × 1,05 ; 0,70 = 2 ÷ 3,0 × 1,05 : la FDES 2026 confirme que le rail dépend de la hauteur. Proposer la formule `2 / hauteur × 1,05` plutôt qu'une constante (0,90 de 2024 = le même calcul à 2,33 m ou un arrondi). |
| 3. Plaques par face | 1,05 m²/m² | — | fiche (Placo, SNIP) | [Y1] 18,48 kg = 2 × 1,05 m² × 8,8 kg/m² | **confirmé** | La FDES applique la même chute de 5 %. |
| 4. Enduit à joint (poudre, 2 faces) | 0,66 kg/m² | — | Placo, fiche « Maison cloison Placostil 72 BA13 » : 0,66 kg [Y8] | [Y1] FDES 2024 : 0,693 ; [Y2] 2026 : 0,70 (+ 0,33 d'eau) | **même éditeur (Placo) : cohérent, pas une 2e source indépendante** | 0,693 = 0,66 × 1,05. La FDES compte l'enduit **en poudre** (Placojoint PR4) : 0,35 kg par face, ne pas le mélanger avec l'enduit en pâte (0,47 kg par face, contradiction n° 34). En 2 × 2 BA13 [Y3] : 1,39 kg (les deux couches jointoyées). |
| 5. Bande (2 faces) | 2,80 ml/m² | — | [V1] SNIP, Placo fiche maison : 2,80 | [Y1] 0,019 kg/m², non convertible : masse au mètre de la bande PP non trouvée | **inchangé (FDES non convertible)** | Si la bande papier pèse ≈ 6,8 g/m (≈ 130 g/m² × 52 mm, non sourcé), 0,019 kg = 2,8 ml. Indice seulement. Plafond 1 BA13 : 0,01 kg, la moitié (une face). |
| 6. Vis TTPC 25, 72/48 simples 0,60 | 30 u/m² (SNIP) ; Placo 22 | — (garder 30, contradiction maintenue) | [V1] SNIP : 30 (vis de rail comprises, 5/ml) | [Y1] FDES 2024 : 0,02 kg = **11 à 18** TTPC 25 (1,35 g [Y6]) ; [Y2] FDES 2026 : 0,03 kg « TTPC35/TRPF » = 17 à 24 TTPC 25 + 2 TRPF ; [Y8] Placo maison : 22 | **contradiction confirmée : aucune FDES ne s'approche de 30** | Les FDES Placo comptent comme les fiches Placo : sans les vis de rail (22, ou moins). 22 + 5 vis/ml × 0,84 ml × 2 faces ≈ 22 + 8 = 30 : l'écart SNIP / Placo est exactement les vis de rail. Les FDES ne tranchent pas (masses à 10 g près, et deux FDES sœurs de 2025, 47198 / 47199, même ossature, donnent 0,09 et 0,03 kg) : **une masse de vis de FDES n'est pas une source de comptage**, sauf quand le nombre est écrit (48877). |
| 7. 98/48, 2e peau (TTPC 35) | 27 u/m² (SNIP) | — | [V1] SNIP : 27 | [Y3] FDES 48877 (2026) : **« Vis TTPC 35 (x22) »** écrit en toutes lettres | **contradiction expliquée (Placo 22 sans vis de rail, SNIP 27 avec)** | Même logique que la 72/48 : Placo compte 22 sur les plaques extérieures des deux faces, sans rail. Garder 27 (SNIP, jamais à court) ; 22 est la valeur Placo, maintenant écrite par une FDES vérifiée. |
| 8. 98/48, 1re peau (TTPC 25) | 10 / 14 u/m² | — | [V1] SNIP 10 ; règle Chausson / CAPEB « plaques internes à 60 cm » (`15` 1a) | [Y3] FDES 48877 : 0,05 − 0,0418 − 0,0026 = 5,6 g ≈ **4 TTPC 25** pour les deux 1res peaux | **règle confirmée ; chiffre Placo plus bas** | Placo, dans sa FDES, vise encore moins la 1re peau que le SNIP. Cela confirme que la 1re peau est vissée large (contre Pladur 20 / 26). Garder 10 (SNIP : jamais à court). |
| 9. TRPF 13, 72/48 et 98/48 simples 0,60 | 2 u/m² | — | [V1] SNIP : 2 | [Y3] FDES 48877 : **« Vis TRPF 13 (x2) »** ; [Y8] Placo maison : 2 | **confirmé (SNIP + FDES Placo vérifiée)** | Masse unitaire déduite : 1,30 g par TRPF 13. |
| 10. TRPF montants doublés 0,40 | 7 (SNIP) / 8 (Chausson) / 10 (Placo) ; `15` propose 10 | — (10 proposé reste) | [X2] Placo Intégrale 2021-22 : 10 | [Y4] FDES 47198 / 47199 (2025, 72/48 doubles 0,40) : vis mêlées aux vis de plaque (0,09 et 0,03 kg), non séparables | **inchangé : pas de 2e source écrite** | Les deux FDES de la même ossature se contredisent du triple sur la masse totale de vis : inutilisables pour compter 7, 8 ou 10. Montants doubles 0,40 = 5,33 ml/m² (3,04 kg ÷ 0,57), cohérent avec 2 × (1 / 0,40) × 1,05 = 5,25 plus les abouts. |
| 11. Séparative SAA, 1re peau 12 (simples 0,60) | 12 (SNIP seul) | — | [V1] SNIP : 12 | [Y4b] FDES 38669 SAA 120 (2024) : TTPC 25/35 = 0,04 kg pour les 4 plaques | **toujours 1 source** | 0,04 kg ≈ 22 TTPC 35 (42 g) et presque rien en 1re peau, comme 48877. Le SNIP (12 + 30) pèserait ≈ 73 g (0,07). Placo vise la 1re peau beaucoup plus large : garder 12 (la valeur haute). |
| 12. Plafond simple BA13, vis à 0,60 | 12 (SNIP) / 10 / 15 / 8 | — | [V1] SNIP 12 | [Y7] FDES 39762 (plancher bois, 2024) : « vis plaques et suspentes » 0,04 kg = 35 à 45 g | **ne tranche pas** | Sans la masse des vis de suspente (vis à bois ou TRPF, non publiées), la part des plaques ne se sépare pas. Si les suspentes (≈ 1,8/m², 2 vis) prennent 10 à 15 g, il reste 20 à 35 g = 15 à 26 TTPC 25 : plutôt du côté de Placo sp00012110 « plancher bois » (15) que de 8 ou 10. Indice, pas une source. |
| 13. Plafond 2 × BA13, 1re peau à 0,60 : 3 (Placo / règle DTU, proposé en `15` 5c) ou 8 (SNIP) | 3 proposé | **3 remis « à confirmer »** | [V2] Placo 04/2023 : 3 ; [W3] CAPEB : 1ers parements tous les 600 mm | [Y7b] FDES 52811 (2026) : « vis acier (TTPC) » **0,06 kg** = 55 à 65 g ; [Y7] 39558 (2024) : 0,06 « plaques et suspentes » | **à confirmer (la FDES Placo 2026 pèse deux fois plus de vis que 3 + 12)** | 3 TTPC 25 (4 g) + 12 TTPC 35 (23 g) = 27 g → 0,03 ; SNIP 8 + 12 = 34 g ; vissage des deux peaux à 30 cm (12 + 12) = 39 g. Même avec les vis de suspente (non nommées dans 52811), 0,06 kg dépasse tout. La FDES ne prouve pas 8, mais elle ne soutient pas 3. Garder **8 (SNIP)** tant qu'un plaquiste n'a pas dit comment il visse la 1re peau. |
| 14. Plafond, fourrures à 0,60 | 1,79 ml/m² (SNIP) ; Placo Intégrale 2,0 | — | [V1] SNIP : 1,79 | [Y7b] FDES Placo 52811 (2026) : 0,77 ÷ 0,43 = **1,79** ; 39762 (2024) : 1,74 | **confirmé (SNIP + FDES Placo 2026)** | Contradiction n° 46 levée : Placo lui-même, dans sa FDES la plus récente, compte 1,79 ; le 2,0 de l'Intégrale est un arrondi supérieur (`15` 5d). |
| 15. Plafond, fourrures à 0,40 | 3,0 (Placo) ; calcul 2,63 | — | [V2] Placo 04/2023 : 3,0 | — : aucune FDES à 0,40 | **1 source** | Rien de neuf. |
| 16. Doublage sur fourrures, appuis | ≈ 0,8 /m² (SNIP) ; Placo ancien 2 | — | [V1] SNIP : 0,80 | [Y9] FDES Optima 40951 (2024) : 0,042 ÷ 0,0535 = **0,79** ; 49767 (2026) : **0,75** | **confirmé (SNIP + FDES Placo)** | Contradiction n° 42 levée : Placo (FDES 2024 et 2026) compte 0,75 à 0,79 appui par m², pas 2. |
| 17. Doublage sur fourrures, fourrures | 1,75 (calcul) ; Placo / SNIP 2,0 à 2,5 | — (à trancher : 2,5 Placo) | [W7] Placo Intégrale 2021-22 : 2,5 | [Y9] FDES 49767 (2026) : 1,08 ÷ 0,43 = **2,51** ; 40951 : 2,49 ; 35455 (2023) : 2,14 | **2,5 = valeur Placo (Intégrale + FDES, même éditeur)** | Hypothèse : la fourrure Optima 240 pèse comme la F530 (0,43 kg/ml), non vérifiée. Lisses haute et basse : 0,84 ml/m² (2 / 2,50 × 1,05), comme les rails de cloison. |
| 18. Vis doublage / contre-cloison, **Placo** | 11 | — | [W7] Placo Intégrale 2021-22 : 11 | [Y9] FDES Optima 35455 (2023) : **TTPC 25 0,01 kg = 4 à 11** ; 49767 (2026) : vis 0,02 (appuis compris) = 9 à 17 TTPC | **11 = valeur Placo, cohérente avec ses FDES (même éditeur)** | La FDES 2023 exclut 15 (20 g → 0,02) pour Placo : Placo vise sans les lisses (calcul `13` D1). |
| 19. Vis doublage, **Siniat** (Clipstar) | 12 | — | [X4] Siniat, fiche Clipstar (extrait moteur, PDF 404) : 12 à 0,60, 10 à 0,90 | [X1] Chausson Guide ABC 2020-21 : 12 (reprend Prégymétal) | **12 : 2 documents, mais Chausson recopie Siniat** | Pas de FDES système Siniat sur INIES. Valeur utilisable « par marque » avec la mention « fiche Siniat ». |
| 20. Vis doublage, **Knauf** | ? | **aucune** | — : catalogue Knauf 2020 (chapitre cloisons) renvoie à « Quantitatifs estimatifs p. 500 », page introuvable ; knauf.com 403 ; aucune FDES système Knauf sur INIES ; deltourmateriaux.com non trouvé par le moteur | — | **à confirmer (aucune source trouvée)** | Appliquer la décision du fondateur : sans valeur de marque, **15 (SNIP)**. |
| 21. Vis doublage, **Pladur** | 26 | — | [W14] Pladur « contre-cloisons fourrures » : 26 (vis à 25 cm et en rive) | — | **1 source fabricant (valeur de marque)** | Valable seulement si la marque Pladur est connue. |
| 22. Vis doublage, **sans marque** | 15 | — | [V1] SNIP : 15 | — | **1 source (décision du fondateur : repli syndicat)** | Inchangé. |
| 23. Périmètre d'un plafond | 4 √S | — | — | — | **impossible** (aucune règle de métré publiée) | Rien cherché de plus, comme demandé. Les FDES plafond donnent un rail F530 de 0,48 à 1,12 ml/m² : la pièce de référence change tout, ce qui confirme qu'on ne peut pas publier de ratio. |

## Bilan

**Chiffres examinés** : 23 sujets, dont 12 avec une valeur nouvelle tirée des FDES INIES (la voie a marché : l'API publique de base-inies.fr donne les constituants de chaque FDES).

**Passent à 2 sources indépendantes (SNIP + FDES Placo vérifiée)** (6) : montants 2,10 ml/m² (1) ; rails 0,84 ml/m² à 2,50 m, avec la règle 2 / H × 1,05 (2) ; TRPF 2 par m² (9) ; fourrures de plafond 1,79 ml/m² (14) ; appuis de doublage ≈ 0,8 par m² (16) ; plaques 1,05 m² par face (3).

**Contradictions levées** :
- n° 46, fourrures de plafond : 1,79 ;
- n° 42, appuis : 0,8, et non 2 ;
- n° 35, montants : 2,10 (Placo et SNIP), et non 1,75.

**Ce qui change (à valider par Greg)** :
1. Rails : une formule `2 / hauteur × 1,05` remplace la constante 0,84. Elle redonne 0,84 à 2,50 m et 0,70 à 3,0 m.
2. Plafond 2 × BA13, 1re peau : la proposition « 3 » de `15` (5c) repasse **à confirmer**. La FDES Placo 2026 pèse 0,06 kg de vis, soit deux fois ce que 3 + 12 vis pèseraient. Garder 8 (SNIP) en attendant un plaquiste.
3. Vis de doublage par marque :
   - Placo 11 ;
   - Siniat 12 ;
   - Pladur 26 ;
   - Knauf : **aucune valeur trouvée**, donc 15 (repli syndicat, décision du fondateur).

**Inchangé, avec un éclairage nouveau** :
- vis TTPC 72/48 : SNIP 30 contre Placo 22 ;
- 98/48 2e peau : SNIP 27 contre Placo 22, que la FDES 48877 écrit en toutes lettres ;
- 98/48 1re peau : 10 (la FDES Placo en compte ≈ 4) ;
- séparative 1re peau : 12 ;
- TRPF des montants doublés à 0,40 : 10 proposé, sans 2e source.

**Méthode à retenir** : une masse de vis de FDES est arrondie à 10 g. Deux FDES sœurs (47198 / 47199) diffèrent du triple. Ce n'est donc pas une source de comptage, sauf quand le nombre est écrit à côté (48877 : « x22 », « x2 »). En revanche, les masses d'ossature, divisées par la masse linéique publiée du profilé, donnent des ml/m² fiables.

**Toujours à confirmer** :
- vis Knauf de doublage ;
- vis de plafond à 0,60 (12 / 10 / 15 / 8) et à 0,40 (Placo seul) ;
- fourrures à 0,40 (Placo seul) ;
- TRPF des doublés à 0,40 ;
- 1re peau de séparative (12) ;
- 1re peau d'un plafond double (3 ou 8) ;
- bande : la masse au mètre manque pour convertir la FDES ;
- masse d'une fourrure Optima 240, supposée égale à celle d'une F530.

**Où j'en suis** : 8 recherches web et 3 lectures (dont 2 refusées, 403). Le budget n'est pas épuisé. Le téléchargement des PDF de FDES (`api/Document…/download`) a été refusé par l'outil : je n'ai lu que le JSON public des fiches. Sources Knauf : rien trouvé (catalogue 2020 p. 500 introuvable, deltourmateriaux.com non indexé, knauf.com 403).

## Sources

| Réf. | Document | Éditeur | Date du document | Consulté |
|---|---|---|---|---|
| V*, W*, X* | voir `09-ossature-vis.md`, `13-troisieme-vague.md`, `15-quatrieme-vague.md` | — | — | 20/11/2026 |
| Y1 | FDES « Cloison distributive Placostil 72/48 – 1x Placoplatre BA 13 avec M 48 – EI30 – 37 dB – max 2,50 m avec isolant PAR Phonic 45 mm », n° 20240638652, https://www.base-inies.fr/api/Produit/38652 (fiche https://www.base-inies.fr/consultation/infos-produit/38652) ; même ossature : n° 20240237036 (sans isolant), 20240940063 (Infinaé) | Placo (Saint-Gobain), vérif. ELYS | vérifiée 19/06/2024, valide au 31/12/2029 | 20/11/2026 |
| Y2 | FDES « Cloisons – 72/48 – 1x Placoplatre BA 13 – Stil M 48 – 0.60 m – EI30 – 39 dB – 2.50 m – Flex 40 », n° 20261054013, https://www.base-inies.fr/api/Produit/54013 (et 54014, Infinaé) | Placo | vérifiée 05/10/2026 | 20/11/2026 |
| Y3 | FDES « Cloisons – 98/48 – 2x Placoplatre BA 13 – Stil M 48 – 0.60 m – EI60 – 47 dB – 3.0 m », n° 20260148877, https://www.base-inies.fr/api/Produit/48877 ; et 98/48 2 × BA13 n° 20240638681 (/api/Produit/38681) | Placo | 19/02/2026 ; 19/06/2024 | 20/11/2026 |
| Y4 | FDES « Cloisons 72/48 Aquaroc 13 / Glasroc H Ocean 13 – Hydrostil+ M 48 500h – 0,4 – Double », n° 20251047198 et 20251047199 (/api/Produit/47198, 47199) | Placo | 03/12/2025 | 20/11/2026 |
| Y4b | FDES « Cloison séparative Placostil SAA 120 », n° 20240638669 ; SAA 140 n° 20240638670 ; SAD 180 n° 20240638671 (/api/Produit/38669, 38670, 38671) | Placo | 06-07/2024 | 20/11/2026 |
| Y5 | FDES de profilés : Montant Stil M48 (20230333775), Rail Stil R 48 (20230333778), Fourrure Stil F530 (20230233258), Rail Stil F 530 (20230233457), Appui Optima 2 75-160 (20230233293), Appui Optima 2 120 (20230634470) ; Siniat : Montant Prégymétal 48-35 (20260651733), Rail Prégymétal 36 et 48 (20260651729), Fourrure Prégymétal S47 (20260651734) | Placo ; Siniat | 2023 ; 2026 | 20/11/2026 |
| Y6 | Placo, fiche produit « Vis TTPC 25 » (réf. E60261500, boîte de 1500, 2,089 kg ; boîte de 500, 0,723 kg), https://www.placo.fr/documents/fiche-produit/ficheproduit-vis-ttpc-25.pdf (extrait moteur, 403 en direct) ; appoint : Semin, boîte de 1000 vis de 35 mm, 1,74 kg (fiche négoce cmesmat.fr, extrait moteur) | Placo ; Semin | 18/12/2023 | 20/11/2026 |
| Y7 | FDES « Plafond Placostil sur fourrures Stil F 530 – plancher bois – 1x / 2x Placoplatre BA 13 – 0,6 m – REI15 / REI30 », n° 20240739762 et 20240739558 (/api/Produit/39762, 39558) | Placo | 09/09/2024 | 20/11/2026 |
| Y7b | FDES « Plafonds sur fourrures Stil F 530 – 2x Placoplatre BA 13 – 0,6 m – portée 1,2 m – Flex 55 100 mm », n° 20260249011 (/api/Produit/52811) ; idem Placo Phonique n° 20260249012 | Placo | 16/03/2026 | 20/11/2026 |
| Y8 | Placo, fiche « Maison – Cloison Placostil ép. 72 BA13 39 dB » (quantitatif : 2,10 m² BA13, 2,10 ml M48, 0,90 ml R48, 2,80 ml bande, 0,66 kg enduit, 2 TRPF 13, 22 TTPC 25), https://www.placo.fr/sites/mac3.placo.fr/files/files/forum/Maison_Cloison_Placostil_Ep_72_BA13_39dB.pdf (extrait moteur) | Placo | non datée | 20/11/2026 |
| Y9 | FDES « Système Optima Murs » : GR 30 kraft 101 + BA13 n° 20231035455 ; avec membrane GR 32 100 n° 20241140951 ; sans membrane GR 32 120 n° 20260349767 et 140 n° 20260349797 (/api/Produit/35455, 40951, 49767, 49797) | Placo | 24/10/2023 ; 04/12/2024 ; 20/04/2026 | 20/11/2026 |
| Y10 | Liste des fiches publiées : https://www.base-inies.fr/api/GetOnlineProduitVMList (9 836 fiches ; aucune FDES de système Siniat ni Knauf) | Alliance HQE-GBC (INIES) | 20/11/2026 | 20/11/2026 |

Note : les FDES sont des déclarations environnementales vérifiées par un tiers (ELYS, AFNOR…). Elles ne sont pas des guides de pose. Leurs quantités de constituants sont celles du système décrit, chute comprise. Quand une FDES et un guide du même fabricant (Placo) disent la même chose, cela ne fait pas deux sources indépendantes. Ici, la 2e source indépendante est chaque fois le SNIP.
