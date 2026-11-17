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

## Passe 5 : un modèle plus rapide pour lire le devis (16 novembre 2026, soir, site de test au commit `3124ef06`)

Même devis, petit iPhone, vraie IA, prompt de lecture version 6. Seuls le modèle et l'effort de la lecture changent
(`AI_EXTRACTION_MODEL`, `AI_EXTRACTION_EFFORT`, variables de la branche de test).

| Lecture | Temps à l'écran | Temps d'appel | Coût de la lecture | Lignes lues | Questions du modèle |
|---|---|---|---|---|---|
| Opus 5.5, effort haut (avant) | 72 s | 65 s | 0,328 $ | 5 | 5 |
| Sonnet 5.5, effort haut | 61 s | 53 s | 0,171 $ | 5 | 7 |
| Sonnet 5.5, effort moyen | 34 s | 27 s | 0,134 $ (0,051 $ quand le texte commun est encore en mémoire) | 5 | 7 |

Ce que cette passe montre :

- Les trois lectures trouvent les mêmes 5 lignes du devis, les mêmes quantités, et la même liste calculée (39 bacs de
  5,65 m, 4 longueurs de gouttière, 1 naissance, 96 m² de voliges, les feuilles des deux bandes).
- Le temps vient de la longueur de la réponse du modèle (8 300 jetons en effort haut, 4 700 en effort moyen), pas du
  devis. Baisser l'effort divise le temps par deux.
- Le texte commun (prompt et référentiel, 34 600 jetons) est mis en mémoire 5 minutes à chaque lecture. Deux lectures
  à moins de 5 minutes : la seconde coûte 0,05 $. Seule, la mise en mémoire est payée sans servir.
- Sonnet pose deux questions de plus qu'Opus sur ce devis : le façonnage de la bande de ventilation (Opus ne posait que
  celui de la rive) et les consommables. Les deux sont des questions du référentiel, rattachées par le code.
- La correction de la passe 4 tient en ligne : le façonnage de la rive n'est plus posé deux fois.
- Réglage gardé sur le site de test : Sonnet 5.5, effort moyen. Un seul devis ne suffit pas à trancher pour de bon :
  le choix final se fera sur les vrais devis de Greg et leurs listes attendues.

## Passe 6 : où part le temps de la lecture (17 novembre 2026, site de test au commit `d0f6ac3f`)

Greg : « Lecture du devis : 24 secondes, c'est trop long. Mesure où part le temps et descends sous 10 secondes. »
Même devis zinc, petit iPhone, vraie IA, chronomètre du clic « Analyser » à la première question
(`scratchpad/chrono-lecture.mjs`). Trois réglages, le même jour.

| Lecture | Du clic à la première question | Appel de lecture | Mots-jetons écrits | Coût de la lecture |
|---|---|---|---|---|
| Sonnet 5.5, effort moyen (réglage gardé) | 24 s | 15,1 s | 2 913 | 0,117 $ |
| Haiku 5.5, effort moyen | 49 s | 39,6 s | 9 902 | 0,009 $ |
| Haiku 5.5, effort bas | 36 s | 28,2 s | 7 247 | 0,004 $ |

Où partent les 24 secondes du réglage gardé :

| Étape | Durée |
|---|---|
| Envoi du devis et ouverture de l'écran de lecture | 2,8 s |
| Repérage des métiers (un petit appel avant la lecture) | 1,8 à 3,8 s |
| Lecture du devis (le modèle écrit la fiche, le bref, les questions, les lignes) | 15,1 s |
| Attente de l'écran (il regardait toutes les 3 secondes) | 0 à 3 s |

Ce que cette passe montre :

- Le temps de la lecture est celui des mots que le modèle ÉCRIT, pas celui du devis. La réponse utile pèse environ
  7 000 caractères (fiche 2 400, questions 2 100, lignes 2 500, bref 300), soit 2 300 mots-jetons : 12 secondes à la
  vitesse de Sonnet. Le reste est de la réflexion.
- Haiku est dix fois moins cher mais plus lent ici : il réfléchit trois fois plus longtemps avant d'écrire, même à
  l'effort le plus bas. Sans changement de code, il ne fait pas gagner de temps.
- Le mode rapide du fournisseur n'existe que pour Opus 5.5, au double de son prix : écarté.
- Aucun réglage ne passe sous 10 secondes. Le plancher, avec une seule lecture qui écrit tout, est d'environ
  12 secondes d'écriture, plus l'envoi et le repérage.

Ce qui est fait (lot « vitesse ») :

- L'écran regarde où en est la lecture chaque seconde (avant : toutes les 3 secondes).
- Réglage `AI_EXTRACTION_REFLEXION` (`auto` par défaut, `minimale` : le modèle écrit sans réfléchir d'abord, pour la
  lecture et pour le repérage). Éteint par défaut : à mesurer en ligne, puis à juger sur le jeu de test.

Ce qu'il faut pour passer sous 10 secondes (à faire avec les vrais devis de Greg comme jeu de test, parce que la
qualité de la lecture passe avant la vitesse) :

1. Faire écrire moins au modèle d'un seul tenant : deux lectures en même temps (les questions et les lignes d'un côté,
   la fiche et le bref de l'autre). Le temps devient celui de la plus longue, environ 6 à 8 secondes.
2. Montrer la première question dès qu'elle est écrite, pendant que le reste de la lecture se termine.
3. Lancer le repérage des métiers en même temps que la lecture, au lieu d'avant.
