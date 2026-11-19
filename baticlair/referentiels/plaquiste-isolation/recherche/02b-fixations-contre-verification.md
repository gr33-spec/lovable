# 02b — Fixations et contre-vérification (2e passe, plaquiste-isolation)

Recherche du 19 novembre 2026. Consignes : `_consignes.md`. Complète et corrige `02-ossatures-fixations.md`
(1re passe, non modifiée). Pour une ligne reprise de 02 : colonne « Ancien (02) » = ancienne valeur / ancien statut.
Abréviations : [Tn] renvoient à la liste « Sources » en fin de ce fichier ; [Sn] à celle de 02. « c. » = consulté le.

Rédigé au fur et à mesure.

---

## Note d'accès (2e passe)

placo.fr répond toujours 403. En revanche, les **fiches produit Placo officielles** sont servies sans blocage par
Samse (`medias.groupe-samse.fr/Fiche_technique/Fiche_technique_<n>.pdf`, numéros 903606 à 903646 = accessoires
et vis Placostil ; 7972-7988 = rails, fourrure, cornières ; 36320-36323 = montant M 70) et par BigMat
(`medias.bigmat.fr/.../<EAN>-<code>.pdf`). Elles ont été téléchargées et leur texte extrait en entier
(pdftotext). Ce sont des documents du fabricant (en-tête « www.placo.fr », date « Mise à jour le … »), donc
« source fabricant » ; quand deux hébergeurs (Samse, BigMat) servent deux éditions de la même fiche, elles
comptent pour une seule source fabricant, et la 2e source exigée vient d'un autre document (Intégrale, SNIP,
négoce, autre marque).

---

## C. Vis et fixations

### C.1 Vis TTPC Placo : compatibilité (épaisseur de parement) et conditionnements réels

Lecture clé : chaque fiche Placo donne l'épaisseur totale de plaques que la vis peut fixer, sur métal et sur bois.
Cela vérifie la règle « longueur = épaisseur + 10 mm (métal) / + 20 mm (bois) » et tranche la 2e peau de 2 BA13.

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Ancien (02) | Note |
|---|---|---|---|---|---|---|---|
| TTPC 25 : parement admissible | 1 plaque de 13 mm sur profilé métallique (rien d'écrit pour le bois) | mm | fiche Placo Vis TTPC 25, MAJ 23/07/26, via Samse [T1], c. 19/11/2026 | Gypso/Chausson [S40] (BA13 sur métal → TTPC 25) | confirmé (2 sources) | confirmé | la TTPC 25 n'est PAS donnée pour une BA15 ni une BA18 |
| TTPC 35 : parement admissible | 25 mm total sur métal ; 13 mm sur bois | mm | fiche Placo Vis TTPC 35, MAJ 23/07/26, via Samse [T2] | Gypso [S40] (bois : 13 + 20 = 35) ; règle +10 mm Intégrale [S2] | confirmé (2 sources) | — | |
| TTPC 45 : parement admissible | 35 mm total sur métal ; 25 mm sur bois | mm | fiche Placo TTPC 45, MAJ 23/07/26 via Samse [T3] et MAJ 21/10/24 via BigMat [T4] | règle +10 mm [S2][S5b] | confirmé (2 sources) | — | |
| TTPC 55 : parement admissible | 45 mm sur métal ; 35 mm sur bois | mm | fiche Placo TTPC 55, MAJ 31/03/26 via Samse [T5] (et 18/12/23 via BigMat [T6]) | règle +10 mm [S2] | confirmé (2 sources) | — | |
| TTPC 70 : parement admissible | 60 mm sur métal ; 50 mm sur bois | mm | fiche Placo TTPC 70, MAJ 31/03/26 via Samse [T7] | règle +10 mm [S2] | confirmé (2 sources) | — | aussi TTPC 80 : 70 / 60 mm [T8] |
| 1 BA13 (12,5) sur métal | **TTPC 25** | — | [T1] | [S40] | confirmé (2 sources) | confirmé | |
| 1 BA15 (15) sur métal | **TTPC 35** (pas 25) | — | [T1] (TTPC 25 = 13 mm seulement) + [T2] (TTPC 35 jusqu'à 25 mm) | règle +10 mm : 15 + 10 = 25 = juste à la limite, Placo ne la retient pas | confirmé (2 sources) | à confirmer (02 disait TTPC 25) | **correction** de 02 |
| 1 BA18 (18) sur métal | TTPC 35 | — | [T2] | règle +10 mm (28 → 35) | confirmé (2 sources) | à confirmer (calcul) | |
| 1 BA25 (25) sur métal | TTPC 35 | — | [T2] (25 mm total) | règle +10 mm (35) | confirmé (2 sources) | — | à la limite : beaucoup de poseurs prennent 45 ; la fiche dit 35 |
| 2 BA13 : 1re peau / 2e peau | TTPC 25 / **TTPC 35** | — | [T1] + [T2] (« une ou plusieurs plaques d'épaisseur totale 25 mm ») | Intégrale [S2] règle +10 mm : 25 + 10 = 35 | confirmé (2 sources) | à confirmer (02 hésitait 35/45) | 45 n'est pas faux (plus long) mais pas nécessaire ; le SNIP [S1] dit « TTPC 35/45 » |
| 2 BA15 (30 mm) : 1re / 2e peau | TTPC 35 / TTPC 45 | — | [T2] + [T3] (35 mm) | règle +10 mm | confirmé (2 sources) | — | |
| 2 BA18 (36) / 3 BA13 (37,5) | TTPC 55 | — | [T5] (45 mm) ; [T3] limité à 35 | règle +10 mm | confirmé (2 sources) | 3 BA13 à confirmer | |
| Plaques sur ossature bois : 1 BA13 / 2 BA13 | TTPC 35 / TTPC 45 | — | [T2] / [T3] | Gypso [S40] (+20 mm) ; Siniat [S5b] | confirmé (2 sources) | confirmé | |
| TTPC 25 Placo : boîtes | 500 (E60260500), 1000 (E60261000), 1500 (E60261500) | u | [T1] (MAJ 23/07/26) | Brico Dépôt « TTPC 25 – 500 pièces » [T9] ; Castorama 1500 [S40-02] | confirmé (2 sources) | 02 : « boîte 1000 Placo non relevée » | la boîte de 1000 Placo est récente (EAN 3496250471917) |
| TTPC 35 Placo : boîtes | 500, 1000 (E60361000), 1500 ; palette 576 boîtes (500) / 160 (1500) | u | [T2] | Brico Dépôt « boîte de 500 TTPC 8 × 35 » [T9] ; Bricomarché/Castorama 1500 | confirmé (2 sources) | — | |
| TTPC 45 Placo : boîtes | 500 et 1500 (fiches 2024 et 2026) ; 1000 (E60461000) cité par un extrait moteur seulement | u | [T3][T4] | Bricomarché « TTPC 45 boîte de 500 » et « 1500 » [T9] | confirmé (2 sources) pour 500 et 1500 ; 1000 Placo : à confirmer (absente des deux fiches lues) | contradiction 1000 (Gypso) / 500 (Klimas) | la contradiction de 02 s'explique par la marque : Gypso 1000, Klimas 500, Placo 500/1500 |
| TTPC 55 Placo : boîte | 300 (E60560300) | u | [T5][T6] | Castorama « 300 TTPC 55 Placo » [T9] | confirmé (2 sources) | contradiction 500/300 | Gypso : 500 [S40] ; donc « dépend de la marque » |
| TTPC 70 Placo : boîte | 300 (E60710300), palette 320 | u | [T7] | Bricomarché « TTPC 70 boîte de 300 » | confirmé (2 sources) | 1 source | |
| TTPC 80 Placo : boîte | 300 | u | [T8] | — | 1 source | — | |
| TTPC en seau / en bande | seau 10 000 (Gypso), bande boîte 1000 (Gypso) | u | [S40] | — | 1 source (inchangé) | 1 source | aucune fiche Placo « bande » ni « seau » trouvée en TTPC (Placo vend THB 45 en « sea1000 » [T10]) |

### C.2 Vis métal-métal, vis spéciales, pointes

| Donnée | Valeur | Unité | Source 1 | Source 2 | Statut | Ancien (02) | Note |
|---|---|---|---|---|---|---|---|
| TRPF 13 Placo : usage | assemblage de 2 éléments métalliques, épaisseur cumulée 2 mm ; tête ronde Ø 6, pointe foret, longueur 13 mm | — | fiche Placo Vis TRPF 13, MAJ 05/11/24, via Samse [T11] | Intégrale [S2] p.109 | confirmé (2 sources) | confirmé usage ; dimension à confirmer | longueur 13 mm confirmée (pas 9,5 : c'est la TEX Klimas) |
| TRPF 13 Placo : boîte | 500 (« Vis TRPF 13/bte500P »), palette 768 boîtes | u | [T11] | extrait Bricomarché (boîte 500) [S-02] | confirmé (2 sources) | 1 source | la boîte de 1000 est Klimas (TEX 3,5 × 9,5) |
| TTPF 35 (vis pour acier épais) | parement 25 mm sur profilé métallique épais (pointe foret) | — | fiche Placo TTPF 35, MAJ 31/03/26 [T12] | — | 1 source | — | pour M 100, High-stil, ossatures > 0,8 mm ; les TTPC sont pour acier < 0,8 mm [T3][T7] |
| Vis HB 25 / HB 41 (Placocem) | boîte 500 | u | fiches Placo HB 25 / HB 41 [T13] | — | 1 source | — | plaques ciment (pièces humides extérieures), hors cloison courante |
| Vis THB 25 / THB 45 (Placo Impact) | boîte 1000 (THB 25) ; seau 1000 (THB 45) | u | fiches Placo THB [T10] | — | 1 source | — | vis à tête large pour plaques haute dureté Placo Impact |
| Pointes sur bois (plaques 10 à 12 mm) | Pointe TC 35 (tête creuse) ou TF 35 (tête fraisée) ; carton de 5 kg | — | fiches Placo pointes [T14] | — | 1 source | — | alternative au vissage sur bois (anciens usages) |
