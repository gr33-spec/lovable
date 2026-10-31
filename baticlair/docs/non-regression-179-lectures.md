# Non-régression multimétier : les 179 lectures enregistrées

Plan du 20 octobre 2026, bloc 9. Rejoué le 20 octobre 2026 sur la branche de la PR #284 (`claude/saas-achat-artisans-prompt-1lyihx`) et sur `main` (commit de la PR #283).

## Comment

`packages/domain/test/banc-179-lectures.test.ts` rejoue chaque lecture enregistrée de `packages/domain/test/lectures/` (ce que le modèle a rendu pour un devis : fiche, questions, fourniture par ligne) dans le calcul (`ecranDeLecture`), sans réponse ni habitude, et fige le résultat dans `test/__snapshots__/banc-179-lectures.json` : pour chaque lecture, chaque ligne de la liste (désignation, quantité, unité, couleur, raison), les questions et les lignes « à chiffrer ». Le test est permanent : tout changement du moteur s'y voit ligne par ligne (`npx vitest run -u` pour accepter un changement voulu, après relecture du diff).

Le même fichier de test a été copié sur un arbre de travail de `main` et rejoué ; les deux résultats ont été comparés lecture par lecture.

## Résultat

| | #284 | `main` |
|---|---|---|
| Lectures rejouées | 179 | 179 |
| Métiers | 22 (couverture 153, peinture 4, carrelage 2, plâtrerie 2, puis un devis par métier) | 22 |
| Lignes de la liste | 590 (349 vertes, 232 orange, 9 grises) | 590 (idem) |
| Questions | 331 | 331 |
| Lignes à chiffrer par le fournisseur | 9 | 9 |
| **Lectures dont le résultat diffère** | **0** | — |

Aucun écart : le groupé (douze tables, services, routes, écrans) n'a touché ni la lecture ni le calcul. Rien à corriger.

## Couverture du domaine groupé

`npx vitest run --coverage --coverage.include='src/groupe/**'` (fournisseur `@vitest/coverage-v8`, ajouté au paquet domaine) :

| Mesure | Taux |
|---|---|
| Instructions | 97,9 % |
| Lignes | 98,8 % |
| Fonctions | 99,0 % |
| Branches | 86,3 % |

Objectif du plan : 90 % sur le domaine groupé ; atteint sur les instructions, les lignes et les fonctions. Les branches non couvertes sont des gardes (`?? ""`, valeurs absentes) dans `commande.ts` et `notifications.ts` ; à compléter si un retour de Greg les touche.
