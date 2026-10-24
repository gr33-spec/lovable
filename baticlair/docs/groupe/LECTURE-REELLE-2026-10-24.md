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

## Deuxième passage, après la décision de Greg (exécution 40105430977)

Tranches « lignes seules » en Sonnet, puis une synthèse en Opus (`lireLotParLot`).

| Devis | Appels | Temps | Coût | Contrôle |
|---|---|---|---|---|
| DE00000071 | 1 (inchangé) | 91 s | 0,39 $ | 1 écart : 6 questions au lieu de 5 (le choix du raccord ZWC ou Pratikal est posé deux fois, une pour les SK06, une pour la MK04). Ce chemin n'a pas changé : c'est une variation du modèle (5 questions au passage précédent). |
| D.2026.105 | 1 (inchangé) | 24 s | 0,06 $ | aucun écart |
| 7954 | 16 tranches Sonnet + 1 synthèse Opus | 149 s (tranches 12 à 23 s chacune, en deux vagues ; synthèse 103 s) | **1,14 $** (au lieu de 4,49 $) | 37 écarts (au lieu de 56) |

Sur le 7954 :
- **Coût** : 1,14 $, sous l'objectif de 1,50 $.
  - Tranches : environ 0,60 $ (59 000 jetons rendus en tout ; le référentiel est relu depuis le cache par 13 tranches sur 16).
  - Synthèse : environ 0,30 $ (11 500 jetons rendus).
- **Bref** : 11 phrases pour tout le devis, au lieu de plus de 100. « 10 logements à Paimpol », typologie (7 T3, 2 T2, 1 T1) et niveaux, ce que contient chaque logement, puis un fait par lot. Il manque encore « un coffret par logement » (il dit « 10 coffrets »), « 10 douches » (il dit 4 + 6 receveurs) et « évacuation PVC 100 » (il dit « évacuation PVC Ø100 »). Ce sont surtout des écarts de formulation avec le contrôle.
- **Questions** : 10 au lieu de 7, sans doublon cette fois.
  - Les trois attendues qui manquaient sont là : la répartition des 890 m de PER, les parois de douche, le logement du bloc page 12.
  - En plus : la teinte, la pose (encastré ou saillie), et les parois posées en deux questions (une par niveau).
  - Le contrôle refuse la question des 59 alimentations pour 49 radiateurs : pour lui, c'est une donnée écrite.
- **Lignes** : 333 rendues pour 324 au devis. Sonnet rend aussi des titres (« R+1 », « N°4 TYPE T3 », « DEGAGEMENT ») comme des lignes, et 22 désignations ne sont pas reconnues par le contrôle (45 au premier passage). La lecture rendue est gardée dans l'artefact « lectures » de l'exécution, pour le diagnostic.

## Troisième passage : titres écartés, réflexion moyenne (exécution 40109990078)

| Devis | Temps | Coût | Contrôle |
|---|---|---|---|
| DE00000071 | 72 s | 0,36 $ | 2 écarts de formulation du bref (« 4 fenêtres de toit Velux GGL SK06 » au lieu de « 4 Velux SK06 »). Les 5 questions sont justes, et « pour bac acier isolé » est gardé. Ce chemin n'a pas changé : c'est une variation du modèle. |
| D.2026.105 | 23 s | 0,05 $ | aucun écart |
| 7954 | 134 s | **1,18 $** | 18 écarts (au lieu de 37) |

Sur le 7954 :
- **Lignes** : 13 non reconnues (au lieu de 22), et les titres de section ont disparu. Mais il en rend **315 pour 324** : le modèle a marqué de vraies lignes comme « titre » (la mise à la terre et les prises du bloc lignes 249 à 264), et le code les a écartées. **Corrigé après ce passage** : seul un titre sans quantité ni fourniture est écarté, et une « suite » qui a sa propre quantité reste une ligne (test `titres-et-suites.test.ts`).
- **Questions** : 13 au lieu de 8. La teinte est posée deux fois. **Corrigé** : une seule question par donnée, et les lignes sont rattachées à celle qui reste (`uneQuestionParDonnee`). Le reste est en plus : rangées des tableaux, type des différentiels, distance des appareils à la nourrice, appareils livrés avec siphon et flexibles.
- **Bref** : complet, sauf deux formulations (« 10 coffrets » au lieu de « un coffret par logement », « évacuation PVC Ø100 »).
- Ces deux corrections ne sont pas encore vérifiées par une vraie lecture.
