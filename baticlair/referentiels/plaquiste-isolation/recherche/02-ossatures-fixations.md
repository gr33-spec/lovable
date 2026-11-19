# 02 — Ossatures métalliques, fixations et quincaillerie (plaquiste-isolation)

Recherche du 19 novembre 2026. Consignes : `_consignes.md`. Rédigé au fur et à mesure.

Note d'accès : placo.fr (pages et PDF) répond 403 à WebFetch ; les chiffres Placo viennent alors des extraits
des moteurs de recherche ou des négoces qui reprennent la fiche Placo, et c'est dit à chaque fois.
Le document SNIP « Fiche conseil n° 18 » (décembre 2024) a été téléchargé et lu en entier (texte extrait du PDF) :
c'est le quantitatif officiel de la profession (syndicat des fabricants de plaques : Placo, Knauf, Siniat…),
il compte comme source « fabricant ».

Abréviations : [S1], [S2]… renvoient à la liste « Sources » en fin de fichier. « c. » = consulté le.

---

## D. Quantités au m² par système (traité en premier : source complète obtenue)

Source principale : SNIP, Fiche conseil n° 18 « Ouvrages en plaques de plâtre : quantitatifs estimés de produits »,
décembre 2024 [S1]. Hypothèses du document : chutes 5 % incluses ; vis métal-métal (TRPF) = fixation du montant
sur le rail en haut et en bas (à minorer si sertissage) ; montants toute hauteur (pas d'aboutage) en cloison et
contre-cloison ; plafonds : aboutage des montants tous les 4 m, éclisse sur fourrures ; vissage plaques 1200 :
30 cm sur montants, 6 vis par plaque sur les rails (5 vis/ml) ; plaques 900 : 25 cm sur montants.
Cloisons : longueur 4 m, hauteur 2,50 à 2,70 m (72/48) ou 3 m (98/48). Plafonds : 8 m × 10 m.

### D.1 Cloison distributive 72/48 (1 BA13 par face, M48, plaques 1200), par m² de cloison

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note |
|---|---|---|---|---|---|---|
| Plaques | 2,10 | m²/m² | [S1] p.5, c. 19/11/2026 | [S3] Batiland (chiffres Placo) c. 19/11/2026 ; BatiUnit [S4] | confirmé (2 sources) | 2 faces + 5 % |
| Montants, simples entraxe 0,60 | 2,10 | ml/m² | [S1] p.5 | [S3] Batiland « Montant 48 : 2,1 m » ; [S4] 2,10 | confirmé (2 sources) | |
| Montants, simples entraxe 0,40 | 2,89 | ml/m² | [S1] p.5 | — | 1 source | cohérent géométrie (1/0,40 + départ) ×1,05 |
| Montants, doubles 0,60 | 3,68 | ml/m² | [S1] p.5 | — | 1 source | |
| Montants, doubles 0,40 | 5,25 | ml/m² | [S1] p.5 | — | 1 source | |
| Rails | 0,84 | ml/m² | [S1] p.5 | [S3] 0,9 ml (ancienne fiche Placo) ; [S4] 0,80 | confirmé (2 sources), écart 0,80–0,90 | 2 rails / hauteur 2,50 m × 1,05 = 0,84 ; l'écart vient de la hauteur prise (2,50 vs 2,30) et des chutes |
| Vis TTPC (plaque), simples 0,60 | 30 | u/m² | [S1] p.5 | — | contradiction (détail) | Placo (via Batiland [S3] et l'ancienne piste interne) dit 22 TTPC 25 à 0,60 et 30 à 0,40. Le SNIP 2024 compte en plus 5 vis/ml sur les rails haut et bas (6 vis par plaque) : d'où 30. Retenir 30 (document le plus récent, NF DTU 25.41) et dire que 22 sous-estime |
| Vis TTPC, simples 0,40 | 37 | u/m² | [S1] p.5 | — | 1 source | Placo ancien : 30 |
| Vis TTPC, doubles 0,60 / 0,40 | 35 / 47 | u/m² | [S1] p.5 | — | 1 source | |
| Vis TRPF (métal-métal), simples 0,60 / 0,40 | 2 / 3 | u/m² | [S1] p.5 | piste interne platrerie-isolation.md (Placo : 2 simples) | confirmé (2 sources) pour 2 ; 1 source pour 3 | piste interne : à revérifier, Intégrale Placo inaccessible (403) |
| Vis TRPF, doubles 0,60 / 0,40 | 5 / 7 | u/m² | [S1] p.5 | piste interne : 6 / 10 (Placo) | contradiction (détail) | Placo compte aussi l'assemblage des montants doublés entre eux ; le SNIP ne compte que montant/rail. Garder SNIP + « à confirmer » si montants doublés vissés dos à dos |
| Isolant | 1,05 | m²/m² | [S1] | [S4] | confirmé (2 sources) | une couche |
| Bande à joint | 3,47 | ml/m² | [S1] | murmurapp/SNIP repris [S5] (3,47) | confirmé (2 sources) | hors thème (voir fichier joints) |

### D.2 Cloison 98/48 (2 BA13 par face, M48, plaques 1200), par m² — hauteur de calcul 3 m

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|
| Plaques | 4,20 | m²/m² | [S1] p.5 | — | 1 source | évident : 4 faces ×1,05 |
| Montants simples 0,60 / 0,40 | 2,10 / 2,89 | ml/m² | [S1] p.5 | — | 1 source | identique 72/48 |
| Montants doubles 0,60 / 0,40 | 3,68 / 5,25 | ml/m² | [S1] p.5 | — | 1 source | |
| Rails | 0,70 | ml/m² | [S1] p.5 | — | 1 source | 2 / 3 m × 1,05 : dépend de la hauteur (0,84 à 2,50 m) → à calculer 2 × L / H × 1,05 |
| Vis TTPC peau intérieure (TTPC 25), simples 0,60 / 0,40 | 10 / 14 | u/m² | [S1] p.5 | — | 1 source | 1re peau vissée à 60 cm (NF DTU 25.41) |
| Vis TTPC peau extérieure (TTPC 35/45), simples 0,60 / 0,40 | 27 / 34 | u/m² | [S1] p.5 | — | 1 source | longueur : voir C.1 (TTPC 35 mini ; 45 courant) |
| Vis TTPC int./ext., doubles 0,60 | 13 / 32 | u/m² | [S1] | — | 1 source | doubles 0,40 : 18 / 42 |
| Vis TRPF simples / doubles 0,60 | 2 / 4 | u/m² | [S1] | — | 1 source | doubles 0,40 : 6 |

### D.3 Contre-cloison (doublage) sur fourrures + appuis intermédiaires (type Placo Optima / Knauf), par m², H 2,50 m

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|
| Plaques (1 peau) | 1,05 | m²/m² | [S1] p.11 | — | 1 source | |
| Lisse ou cornière (périphérie) | 0,84 (fourrure verticale en départ) ; 1,37 (lisse verticale en départ) | ml/m² | [S1] p.11 | piste interne Placo « rail F530 1,1 ml/m² » | contradiction (détail) | dépend de ce qu'on met en départ ; Placo compte le rail F530 bas + haut et les retours |
| Appuis intermédiaires, fourrures 0,60 | 0,80 (variante fourrure de départ) / 0,60 (variante lisse) | u/m² | [S1] p.11 | piste interne Placo « 2 appuis/m² » | contradiction (détail) | SNIP : une ligne d'appuis tous les 1,25 m de haut ; 2/m² côté Placo probable si appui + clé comptés séparément, ou ligne tous les 0,60 — à confirmer sur fiche Placo Optima |
| Appuis, fourrures 0,40 | 1,10 / 0,90 | u/m² | [S1] | — | 1 source | |
| Fourrures, entraxe 0,60 | 2,52 (variante fourrure départ) / 2,00 (variante lisse) | ml/m² | [S1] p.11 | piste interne Placo « 2,5 ml/m² » | confirmé (2 sources) | inclut fourrure horizontale tous les 1,25 m |
| Fourrures, entraxe 0,40 | 3,31 / 2,78 | ml/m² | [S1] | — | 1 source | |
| Vis TTPC 25 (1 peau), 0,60 / 0,40 | 15 / 19 | u/m² | [S1] | piste interne Placo « 11 » | contradiction (détail) | même raison qu'en D.1 (vis en périphérie) |
| Vis TRPF | 2 (0,60) / 3 (0,40) | u/m² | [S1] | — | 1 source | |

### D.4 Contre-cloison sur montants (autoportante, sans appui), 1 BA13, plaques 1200, par m², H 2,50 m

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|
| Montants simples 0,60 / 0,40 | 2,10 / 2,89 | ml/m² | [S1] p.13 | piste interne Placo « 2,1 × S/H » | confirmé (2 sources) pour 0,60 | |
| Montants doubles 0,60 / 0,40 | 3,68 / 5,25 | ml/m² | [S1] | — | 1 source | |
| Rails | 0,84 | ml/m² | [S1] | piste interne Placo « 1 ml/m² » | contradiction (détail) | écart 0,84 / 1 : hauteur et chutes ; la règle 2L/H×1,05 vaut mieux qu'un ratio |
| Vis TTPC 25 simples 0,60 / 0,40 | 15 / 19 | u/m² | [S1] | piste interne Placo « 11 » | contradiction (détail) | idem D.1 |
| Vis TRPF simples / doubles 0,60 | 2 / 5 | u/m² | [S1] | piste interne Placo « 5 si doublés » | confirmé (2 sources) pour 5 | |
| 2 BA13 : TTPC int. / ext. simples 0,60 | 6 / 15 | u/m² | [S1] | — | 1 source | |

### D.5 Plafond sur fourrures F530 + suspentes, parement simple BA13, par m² (plafond 8 × 10 m)

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|
| Fourrures, entraxe 0,60 | 1,79 | ml/m² | [S1] p.15 | Placo solution plancher bois (piste interne, page placo.fr citée) 1,79 | confirmé (2 sources) | |
| Fourrures, entraxe 0,50 | 2,10 | ml/m² | [S1] | — | 1 source | |
| Suspentes, fourrures 0,60 | 1,56 | u/m² | [S1] p.15 | Placo solution plancher bois 1,56 (piste interne) | confirmé (2 sources) | portée (entraxe suspentes) 1,20 m ; piste interne « 1,8/m² » = ratio simplifié |
| Suspentes, fourrures 0,50 | 1,84 | u/m² | [S1] | — | 1 source | |
| Cornière ou lisse périphérique | 0,47 | ml/m² | [S1] p.15 | Placo (piste interne) 0,47 | confirmé (2 sources) | pour 8 × 10 m : petite pièce = beaucoup plus (périmètre / surface) → calculer au périmètre |
| Éclisses de renfort (aboutage fourrures) | 0,21 (0,60) / 0,25 (0,50) | u/m² | [S1] | — | 1 source | |
| Vis TTPC 25 (1 peau) | 12 (0,60) / 14 (0,50) | u/m² | [S1] | piste interne Placo « 15 » | contradiction (détail) | SNIP : vis à 30 cm sur fourrure ; Placo : 15 avec vis plus rapprochées en rive ; ordre de grandeur 12–15 |
| Vis TRPF | 4 (0,60) / 5 (0,50) | u/m² | [S1] | — | 1 source | fixation suspente-fourrure (clipsée en Stil : à confirmer si TRPF utile) |
| 2 BA13 : TTPC int. / ext. | 8 / 12 (0,60) | u/m² | [S1] | — | 1 source | 1re peau vissée à 60 cm |

### D.6 Plafond sur montants (M48 suspendus), 1 BA13, par m²

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Note |
|---|---|---|---|---|---|---|
| Montants simples 0,60 / 0,50 | 1,89 / 2,21 | ml/m² | [S1] p.16 | — | 1 source | |
| Montants doubles 0,60 / 0,50 | 3,57 / 4,20 | ml/m² | [S1] | — | 1 source | |
| Suspentes simples / doubles (0,60) | 1,56 / 0,87 | u/m² | [S1] | — | 1 source | portée 1,20 m (simples), 2 m (doubles) |
| Rail | 0,40–0,57 | ml/m² | [S1] | — | 1 source | |
| Vis TTPC / TRPF (0,60 simples) | 13 / 5 | u/m² | [S1] | — | 1 source | |

