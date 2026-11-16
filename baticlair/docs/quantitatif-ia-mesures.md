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
