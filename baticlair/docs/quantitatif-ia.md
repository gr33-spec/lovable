# Le quantitatif par l'IA : la solution retenue

Greg, 16 novembre 2026. Une page. Ce document dit comment Mobiiz fabrique un quantitatif depuis la discussion, ce que
fait l'IA, ce que fait le code, et comment on mesure. Il se met à jour à chaque lot.

## 1. Comment ça marchait (audit du 16 novembre 2026)

1. Trois mécaniques séparées, chacune avec son prompt, écrites à des dates différentes.
2. Texte ou voix (« Mobiiz m'aide ») : Sonnet 5.5, prompt `assistant_description`. Le modèle découpe la phrase en
   articles et pose UNE question, qu'il invente lui-même. Le code relit : aucune quantité non dite. Environ 0,008 $ et
   2 secondes par message.
3. Devis PDF ou photo de devis : d'abord un repérage du métier (Sonnet 5.5, 0,006 $, 2 s), puis la lecture (Opus 5.5,
   prompt `lecture_devis`, avec le référentiel du métier). Sur le devis zinc de Greg : 0,44 $ et 108 secondes.
4. Photo de liste : un troisième prompt (`lecture_liste`).
5. Les questions venaient de trois endroits : le modèle de lecture (« il manque telle donnée »), le moteur de calcul
   (façonnage, développé…), et les valeurs par défaut (zone, épaisseur). Rien ne les rangeait ensemble.
6. Les quantités déduites (bobines, pattes, crochets) sont déjà calculées par le CODE, avec les ratios du référentiel.
   L'IA ne calcule pas. C'est le point fort, on le garde.
7. Les réponses écrites étaient lues par le code, puis par un petit modèle de secours (Haiku 4.5).
8. Pourquoi « J'achète tout fait, 0,65, 1, chevron, ou je pli, bord de mer » n'a donné que 2 sur 6 : le code ne
   rangeait un morceau que s'il nommait mot pour mot un bouton d'une seule question (« 0,65 » et « bord de mer ») ; il
   ne lisait ni l'ordre, ni « tout fait », ni « je pli », ni « chevron » au singulier, ni « 1 ».
9. Et le modèle de secours n'a jamais tourné : le journal du site de test montre un refus du fournisseur (« This model
   does not support the effort parameter »). Notre code envoyait un réglage que Haiku 4.5 n'accepte pas.
10. L'écran : une discussion pour entrer, un autre écran pour les questions (une conversation et des cartes en double),
    une animation plein écran pendant la lecture, puis la liste. Trois changements d'écran.

## 2. La mécanique retenue

Une seule chaîne, cinq étapes, la même pour un texte, une dictée, une photo ou un devis.

| Étape | Qui | Ce qui en sort |
|---|---|---|
| A. Comprendre | IA, sortie en schéma strict | Des lignes : article, quantité, unité, caractéristiques dites, confiance, phrase d'origine |
| B. Rapprocher | Code | Chaque ligne rapprochée du catalogue du métier ; sans correspondance sûre, gardée telle que dite, « à vérifier » |
| C. Questions | Code | Les questions des règles (catalogue et référentiel), triées par ce qui change le plus la commande |
| D. Lire les réponses | Code, puis IA | Chaque réponse à sa question, avec une confiance ; un doute ne fait reposer que cette question |
| E. Calculer | Code | Les quantités déduites, chacune avec sa règle écrite |

Ce que je change par rapport à la demande, et pourquoi :

- **Étape C, l'IA ne formule pas les questions.** Les mots des questions sont écrits une fois dans le catalogue et le
  référentiel, en mots d'artisan, relus par Greg. Raisons : une question inventée ou mal tournée ne peut plus arriver,
  la question est la même pour tous (donc testable), elle s'affiche tout de suite et ne coûte rien. L'IA reste utile
  avant (A : elle dit ce que le document règle déjà, donc ce qu'on ne demande pas) et après (D).
- **Étape D, le code d'abord.** Une réponse au bouton ou une réponse claire ne coûte rien et ne prend pas de temps.
  L'IA ne lit que ce que le code n'a pas rangé. Ce qu'elle rend est toujours relu par le code.
- **L'origine sur chaque ligne** : « dit par toi », « calculé » (avec sa règle), « à vérifier ».

Interdits inchangés : jamais un article absent, jamais une quantité ni une caractéristique inventée.

## 3. Les prompts et les modèles

- Un socle commun et un bloc par métier, dans des fichiers versionnés : `packages/domain/src/ia/prompts/`
  (`socle.ts`, `couverture.ts`, `zinguerie.ts`, `peinture.ts`). Chaque bloc porte le vocabulaire du métier (dév. 33,
  32×22, joint debout, façonné…) et des exemples réels, dont des réponses très brèves.
- Le prompt et le catalogue sont mis en cache chez le fournisseur (c'est déjà le cas pour le prompt système).
- Modèle : le moins cher qui réussit le jeu de test. Point de départ : Haiku 5.5 pour les réponses et le texte
  (0,10 $ le million de jetons en entrée), Sonnet 5.5 pour les listes, Opus 5.5 seulement pour les devis si Sonnet
  échoue au jeu de test. La décision se prend sur les chiffres du jeu de test, pas à l'avance.
- `BUDGET_IA_JOUR` et les plafonds par compte restent vérifiés avant chaque appel.

## 4. L'écran : une seule discussion

- On entre ce qu'on veut : texte, voix, photo, document.
- Les étapes se voient pendant le travail (« Lecture… », « Vérification… »). L'animation plein écran est remplacée
  par ces étapes, plus sobres.
- Une question à la fois, ses boutons sous la bulle, réponse possible au clavier ou à la voix.
- Un bandeau discret en haut, « Ma liste · 5 articles », s'ouvre à tout moment.
- À la fin : un récapitulatif court, puis « Voir ma liste », qui ouvre l'écran de liste habituel.
- Si l'IA échoue ou si le budget est atteint : ce qui est compris est gardé, on continue à la main.

## 5. La mesure

Un jeu de test rejouable (`apps/api/scripts/jeu-quantitatif.ts`) : pour chaque cas, le résultat attendu, le taux de
lignes justes, le nombre de questions, le temps, le coût exact. Il se rejoue à chaque changement de prompt ou de
modèle, et les chiffres avant et après vont dans `docs/quantitatif-ia-mesures.md`. Cas de départ : le zinc à joint
debout de Greg, ses réponses brèves, les devis anonymisés déjà au dépôt ; les vrais devis de Greg s'y ajoutent.

## 6. L'apprentissage

Chaque correction d'un artisan sur sa liste (ligne proposée, ligne corrigée) est déjà au journal des corrections.
On ajoute dans l'admin la liste des corrections les plus fréquentes, pour corriger les règles et les prompts.

## 7. L'ordre des lots

| Lot | Contenu | État |
|---|---|---|
| 1 | Questions en une seule discussion ; réponses brèves par le sens et par l'ordre ; modèle de secours réparé | Fait le 16 novembre |
| 2 | Jeu de test et mesure de départ | À faire |
| 3 | Prompts versionnés par métier ; choix du modèle sur les chiffres | À faire |
| 4 | Écran unique de bout en bout : bandeau « Ma liste », récapitulatif, « Voir ma liste », étapes à la place de l'animation ; origine sur chaque ligne | À faire |
| 5 | Corrections les plus fréquentes dans l'admin | À faire |
