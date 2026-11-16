# Le quantitatif par l'IA : les mesures

Le jeu de test (`apps/web/scripts/jeu-quantitatif.mjs`, cas dans `apps/web/scripts/jeu-quantitatif/cas.json`) se joue
contre le site de test avec un compte artisan. Chaque passe s'ajoute ici, la plus récente en bas. Une réponse « fausse »
(une valeur là où rien n'était attendu, ou une autre valeur) compte plus qu'une réponse manquée.

## Passe 0 : avant (16 novembre 2026, site de test au commit `ae208e4f`)

Réponses à des questions (étape D), 12 cas, 54 réponses attendues :

| Cas | Justes | Fausses | IA |
|---|---|---|---|
| Greg, zinc joint debout : six réponses d'un coup | 2/6 | 0 | non |
| Six réponses brèves, autre sens | 3/6 | 0 | non |
| Six réponses, une par ligne (dictée) | 4/6 | 2 | non |
| Deux réponses dans le désordre | 5/6 | 0 | non |
| Phrases de chantier, sans les mots des boutons | 2/6 | 0 | non |
| Dictée sans ponctuation | 0/6 | 0 | non |
| Descente : trois réponses courtes | 1/3 | 0 | non |
| Descente : dit autrement | 0/3 | 0 | non |
| Ardoise : bouton, valeur hors boutons, nombre | 2/3 | 0 | non |
| Ardoise écrite hors boutons | 2/3 | 1 | non |
| Pente en pour cent | 3/3 | 0 | non |
| Je ne sais pas | 3/3 | 0 | non |
| **Total** | **27/54 (50 %)** | **3** | jamais |

L'IA de secours n'a répondu à aucun cas : chaque appel était refusé par le fournisseur (réglage `effort` non accepté
par Haiku 4.5). Temps moyen : 0,5 s. Coût : 0.

Texte dicté (étape A), 7 cas, 10 lignes attendues (Sonnet 5.5, prompt `assistant_description`) :

| Cas | Lignes justes | Questions | Temps |
|---|---|---|---|
| Ardoises et crochets, dictés | 1/2 | 1 | 4,0 s |
| Le langage du chantier : « lito » | 1/1 | 0 | 2,2 s |
| Flou : rien n'entre avant la réponse | 0/0 | 1 | 2,4 s |
| Gouttière et descentes | 1/2 | 1 | 2,6 s |
| Peinture | 1/2 | 1 | 2,5 s |
| Sans quantité | 0/0 | 1 | 2,3 s |
| Zinc joint debout, dit en une phrase | 2/3 | 1 | 5,8 s |
| **Total** | **6/10 (60 %)** | 6 | 3,1 s en moyenne |

Aucune ligne en trop, aucune quantité inventée. Le défaut : une ligne qui attend une question disparaît de la liste
tant que la réponse n'est pas donnée (« 1000 ardoises 32×22 Espagne 1er choix » n'apparaît pas pendant que Mobiiz
demande le type de crochets). Environ 0,008 $ par message.

Devis (relevé du journal, essai de Greg du 16 novembre, devis zinc) : repérage du métier 0,006 $ et 2 s ; lecture
(Opus 5.5) 0,44 $ et 108 s.

## Passe 1 : après le premier lot (16 novembre 2026, site de test au commit `8ad50926`)

Réponses à des questions, mêmes 12 cas : **41/54 (76 %)**, 3 fausses, 7 appels à l'IA (Haiku 5.5), aucun en échec,
0,0018 $ pour toute la passe. Temps moyen : 0,2 s quand le code suffit, 1,4 à 5,3 s quand l'IA relit.

| Cas | Justes | Fausses | IA |
|---|---|---|---|
| Greg, zinc joint debout : six réponses d'un coup | 5/6 | 1 | non |
| Six réponses brèves, autre sens | 5/6 | 1 | non |
| Six réponses, une par ligne (dictée) | 5/6 | 1 | non |
| Deux réponses dans le désordre | 5/6 | 0 | oui |
| Phrases de chantier, sans les mots des boutons | 2/6 | 0 | oui |
| Dictée sans ponctuation | 2/6 | 0 | oui |
| Descente : trois réponses courtes | 3/3 | 0 | non |
| Descente : dit autrement | 2/3 | 0 | oui |
| Ardoise : bouton, valeur hors boutons, nombre | 3/3 | 0 | non |
| Ardoise écrite hors boutons | 3/3 | 0 | oui |
| Pente en pour cent | 3/3 | 0 | oui |
| Je ne sais pas | 3/3 | 0 | oui |

Ce que cette passe a appris :

- Les 3 fausses viennent du même défaut : avec la vraie phrase de la question (« Crochets de gouttière : sur les
  chevrons ou en façade (bandeau) ? »), « chevron » et « bandeau » n'étaient plus reconnus (la règle « Ardoise d'Angers »
  était trop large) et partaient en réponse écrite. Corrigé au commit suivant ; les cas du jeu sont maintenant joués
  aussi par les tests du moteur, contre le code seul : 44/54, 0 fausse.
- L'IA répond, mais n'apporte rien sur les phrases longues (2/6) : le prompt d'alors (version 2) n'avait ni vocabulaire
  ni exemples, et un nombre dit en lettres (« une seule descente ») était refusé à la relecture. Le prompt version 3
  (socle et blocs métier) et les nombres en lettres partent avec le lot suivant : à mesurer en passe 2.

## Passe 2 : après le deuxième lot (16 novembre 2026, site de test au commit `f7361378`)

Réponses à des questions, mêmes 12 cas : **49/54 (91 %)**, **0 fausse**, 7 appels à l'IA (Haiku 5.5, prompt
version 3), aucun en échec, 0,0023 $ pour toute la passe. 0,2 s quand le code suffit, 1,3 à 6 s quand l'IA relit.

| Cas | Justes | Fausses | IA |
|---|---|---|---|
| Greg, zinc joint debout : six réponses d'un coup | 6/6 | 0 | non |
| Six réponses brèves, autre sens | 6/6 | 0 | non |
| Six réponses, une par ligne (dictée) | 6/6 | 0 | non |
| Deux réponses dans le désordre | 6/6 | 0 | oui |
| Phrases de chantier, sans les mots des boutons | 3/6 | 0 | oui |
| Dictée sans ponctuation | 5/6 | 0 | oui |
| Descente : trois réponses courtes | 3/3 | 0 | non |
| Descente : dit autrement | 2/3 | 0 | oui |
| Ardoise : bouton, valeur hors boutons, nombre | 3/3 | 0 | non |
| Ardoise écrite hors boutons | 3/3 | 0 | oui |
| Pente en pour cent | 3/3 | 0 | oui |
| Je ne sais pas | 3/3 | 0 | oui |

Texte dicté, 7 cas : **7/10 lignes** (avant : 6/10), aucune ligne en trop, 6 questions, 2 à 6 s, 0,024 $ en tout
(0,003 $ par message en moyenne, Sonnet 5.5). Les 3 lignes manquantes viennent du même défaut : une ligne qui attend
sa réponse n'est pas encore dans la liste.

Un devis réel en ligne (zinc à joint debout, D-2026-018 anonymisé, petit iPhone) :

| Étape | Modèle | Temps | Coût |
|---|---|---|---|
| Repérage du métier | Sonnet 5.5 | 2 s | 0,004 $ |
| Lecture du devis | Opus 5.5 | 59 s | 0,312 $ |
| Lecture de la réponse brève | Haiku 5.5 | 5 s | 0,0004 $ |
| Calcul | code | immédiat | 0 |

Coût d'un quantitatif : **0,32 $ depuis un devis** (la lecture fait 99 % du coût), **environ 0,01 $ depuis un texte
ou une dictée**, 0 $ à la main.

Ce que cette passe a appris, sur le devis réel :

- La phrase de Greg a rangé 4 réponses d'un coup. Le « 1 » (descentes) a été perdu : la question des descentes n'est
  arrivée qu'après « Calculer ma liste ». Une réponse donnée en avance doit être gardée pour la question qui vient.
- Sur ce devis, Mobiiz a encore posé des questions après « Calculer ma liste » (5 de plus). Elles doivent toutes
  arriver avant.
- Deux questions groupent deux sujets (« de 25, 28, 33 ou 40, et combien de descentes (sous Autre) ? »). Une question,
  un sujet.
- La ligne des bacs sort « Bobine… 221 m » alors que la réponse est « Je commande façonné (bacs) » : à corriger.
- 59 s de lecture, c'est long : essai de Sonnet 5.5 à faire sur le jeu de test.
