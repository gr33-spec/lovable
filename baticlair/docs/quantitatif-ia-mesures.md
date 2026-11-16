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

Ce que cette passe a appris, sur le devis réel (corrigé dans la passe 3) :

- « Calculer ma liste » n'aboutissait pas : le serveur refusait, l'écran reposait la même question en boucle. Cause : la
  question du façonnage écrite par le modèle de lecture avait sa propre clé, pas celle du calcul.
- Les dernières questions du calcul (descentes, diamètre, consommables, développé) n'arrivaient qu'après « Calculer ».
- Deux questions du modèle groupent deux sujets (« de 25, 28, 33 ou 40, et combien de descentes ? »). Une question,
  un sujet : cela demande de toucher au prompt de lecture (§41.1), donc l'accord de Greg.
- 59 s de lecture, c'est long : essai de Sonnet 5.5 à faire sur le jeu de test.

## Passe 3 : le devis réel va au bout (16 novembre 2026, site de test au commit `eeed3433`)

Même devis, petit iPhone, vraie IA : lecture 57 s, la phrase de Greg, 3 questions de plus dans le fil (développé de la
bande, diamètre des descentes, consommables), « Calculer ma liste », récapitulatif « 8 articles », la liste. Les bacs
sortent bien en « Bacs joint debout » (commandés façonnés), plus en bobine.

Ce qui a changé :

- La question du façonnage du modèle est rattachée à celle du calcul : elle n'est plus posée deux fois.
- Dès que tout est répondu, les réponses partent au serveur ; ce qui manque encore arrive dans le fil, avant
  « Calculer ma liste ». Une réponse déjà partie reste modifiable.
- Une question née d'une réponse ramène aux questions, sans message de refus.

Ce que cette passe a appris :

- Sur cet essai, l'épaisseur était déjà connue (« comme d'habitude ») et les descentes pas encore demandées. La phrase
  de Greg, écrite pour six autres questions, a rangé « 0,65 » comme un rampant de 0,65 m et « 1 » comme une gouttière
  de 1 cm. Corrigé au lot suivant : un nombre nu rangé par l'ordre n'est jamais pris pour une question à boutons dont
  il n'est aucun bouton ; cette question est reposée, seule (test `nombre-nu-hors-bouton.test.ts`).
- Le nombre de descentes reste « à préciser » sur la liste quand il n'a pas été demandé dans le fil : à poser.

## Passe 4 : une question, un sujet (16 novembre 2026, soir, site de test au commit `37691909`)

Même devis, petit iPhone, vraie IA, prompt de lecture version 6.

| Mesure | Valeur |
|---|---|
| Lecture | 72 s à l'écran (64 s d'appel) |
| Coût total du quantitatif | 0,37 $ (lecture 0,328 ; relecture 0,033 ; repérage 0,004 ; réponses 0,001) |
| Questions du modèle | 5, une par sujet (façonnage des bacs, rampant, développé de gouttière, nombre de descentes, façonnage de la rive) |
| Phrase de Greg | 4 réponses rangées sur 4 possibles : bacs commandés façonnés, 1 descente, rive pliée par lui, bord de mer |
| Reste demandé dans le fil | rampant, développé de gouttière, Ø des descentes, développé de la bande |
| Liste | 8 articles |

Ce que cette passe montre :

- « La gouttière et ses descentes » ne font plus une seule question : deux questions, deux jeux de boutons.
- « 0,65 » : l'épaisseur est connue (« Comme d'habitude : 0,65 mm »), aucune question. « chevron » : aucune question de
  crochets sur ce devis, le mot n'est rangé nulle part. « 1 » va bien au nombre de descentes, plus au rampant.
- Défaut trouvé : le façonnage de la rive a été posé deux fois. Le modèle l'avait écrit sous une clé à lui
  (« faconnage_rive ») en visant la ligne de la rive ; le calcul l'a reposé pour cette pièce. Corrigé : une clé du
  modèle qui prolonge une donnée du référentiel est cette donnée quand la ligne visée n'a qu'un ouvrage qui la porte
  (test `question-du-modele-rattachee.test.ts`).
- 72 s de lecture et 0,33 $ : toujours trop. Essai de Sonnet 5.5 à faire sur le jeu de test.
