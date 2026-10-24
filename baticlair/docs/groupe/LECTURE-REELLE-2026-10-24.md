# Vraie lecture du 24 octobre 2026 (Opus, lot par lot)

Lancée par l'étiquette `lecture-reelle` sur la PR #284 (exécution 40101502619). Devis anonymisés, régénérés à la volée ; aucun PDF client.

| Devis | Chemin | Temps | Coût | Contrôle |
|---|---|---|---|---|
| DE00000071 (couverture, 10 lignes) | 1 appel | 93 s (repérage 2 s + lecture 91 s) | 0,40 $ | aucun écart ; « raccords pour bac acier isolé » gardé dans le bref, la fiche et la question |
| D.2026.105 (couverture, 4 lignes) | 1 appel | 25 s (2 s + 23 s) | 0,06 $ | aucun écart ; la question « Quelle tuile neuve… : modèle et teinte ? » |
| 7954 (électricité, VMC, sanitaire ; 324 lignes) | 16 appels en parallèle : électricité en 13 tranches, VMC 1, sanitaire 2 | 117 s (2 s + 115 s) ; tranches de 48 à 115 s | 4,49 $ | 56 écarts, voir ci-dessous |

## 7954 : ce qui va, ce qui ne va pas

- **Tout est lu.** Les 16 appels ont réussi ; 324 lignes rendues pour 324 lignes au devis ; les 3 lots sont là (électricité 274 lignes, VMC 12, sanitaire 38). Aucun « Je n'ai pas pu lire la partie … ».
- **Lignes « absentes » (environ 45)** : aucune n'est perdue. Dans certaines tranches, la désignation était réécrite (par exemple « Point lumineux simple » au lieu de « LAMPE SIMPLE 1 POINT LUMINEUX »). Le contrôle, qui compare le texte, ne retrouvait donc pas ces lignes. Corrigé dans la consigne de tranche : la désignation est recopiée telle quelle, jamais reformulée (test `lecture-par-lots.test.ts`). À vérifier par une nouvelle vraie lecture.
- **Bref** : chaque tranche écrit son propre bref, d'où plus de 100 phrases morcelées par logement. Il manque « 10 logements », « Paimpol », « un coffret de communication par logement » et « évacuation PVC 100 ». À décider (voir le rapport).
- **Questions** : 12 au lieu des 7 attendues.
  - Justes mais en plus : la teinte de l'appareillage, la pose (encastré ou saillie), les 10 alimentations de radiateur en trop.
  - Posées en deux fois au lieu d'une : les longueurs de gaine Ø80 et Ø125, les couronnes de PER 10×12 et 13×16.
  - Absentes : la répartition des 890 m de PER, le modèle des parois de douche, le logement de rattachement du bloc chambre / dégagement de la page 12.
- **Coût** : 4,49 $, presque tout en jetons rendus (environ 180 000 sur les 16 appels). Chaque tranche réécrit la fiche et le bref de ses 30 lignes.
- **Résultat rendu** : désormais gardé 7 jours dans la CI (artefact « lectures »), pour diagnostiquer un écart sans relancer.
