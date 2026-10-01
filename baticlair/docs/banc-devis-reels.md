# Banc d'essai — vrais devis

La mesure de réussite avant de faire payer : **sur plusieurs vrais devis
rédigés par des entreprises différentes, combien de lignes BatiClair
transforme-t-il en liste d'achat, et avec combien de questions ?**

Score actuel : `banc-devis-reels-score.md` (fichier généré par les tests).

## Ce que mesure le banc

Chaque devis passe par le même chemin que dans l'application :
lignes du devis → ouvrages, emplacements, produits et données écrites
(`planQuote`) → moteur → liste d'achat (`scoreQuote`).

Chaque ligne a une issue, et une seule :

| Issue | Sens |
|---|---|
| commande connue | toutes ses quantités à commander sont connues |
| besoin connu | quantités connues (ml, m², pièces), unité de vente à confirmer |
| attend une réponse | une question à l'artisan la débloque |
| ne sait pas encore | il manque une donnée, une règle ou un produit (dit en une phrase) |
| ouvrage pas encore couvert | BatiClair n'a pas encore de règle pour cet ouvrage |
| hors achat | main-d'œuvre, location |

Deux colonnes : **aujourd'hui** (données vérifiées seulement, ce que voit
l'artisan) et **si les règles en attente étaient validées** (ce que la
documentation manquante débloquerait).

Les **questions** comptent : celles posées, celles où aucune proposition ne
convient, celles restées sans réponse connue.

## Règles du banc

- **Aucun réglage pour un devis.** Le moteur ne lit que le vocabulaire et
  les données du référentiel. Un devis qui casse le banc révèle un défaut
  général : on corrige le défaut, et on ajoute un test sur une
  formulation différente (`test/plan.test.ts`).
- **Réponses de l'artisan** : seulement quand le devis les justifie (le
  devis écrit « HP10 » → l'artisan confirme). Sinon la question reste
  ouverte et compte. Une réponse n'est jamais inventée pour faire monter
  le score.
- **Rien n'est supposé** : une valeur n'est lue que si elle est écrite
  avec son nom et son unité (« entraxe 90 cm »). « Pureau adapté » ou
  « 2 jeux de coudes » ne donnent rien.
- Chaque devis vérifie en permanence : aucune quantité sans donnée
  vérifiée pour un artisan ; une issue pour chaque ligne ; aucune question
  posée deux fois.

## Ajouter un vrai devis (10 minutes)

1. Anonymiser : garder seulement désignation, quantité, unité de chaque
   ligne (ni nom, ni adresse, ni prix, ni coordonnées).
2. Créer `packages/domain/test/devis-reels/<id>.ts` sur le modèle de
   `d2026-015.ts`.
3. L'ajouter à `REAL_QUOTES` (`test/devis-reels/index.ts`), avec les seules
   réponses justifiées par le devis et leur raison.
4. `pnpm --filter @baticlair/domain test -- -u` : le tableau de score est
   régénéré. Relire ce qui a bougé.
5. Si une ligne est mal rattachée : corriger le vocabulaire du référentiel
   (mots d'une famille) ou le pont, jamais un cas particulier.
