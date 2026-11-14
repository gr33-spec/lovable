# Procédure : sauvegarde et déploiement des achats groupés V1 sur test.mobiiz.fr (base de TEST uniquement)

À NE LANCER QU'APRÈS L'ACCORD EXPLICITE DE GREG. Rien ici ne touche la production (branche Neon `main`, mobiiz.fr) ni
la branche git `main`.

## 0. État de départ (vérifié en local)

- Branche locale `achats-groupes-v1`, partie de `c99cdc12` = `origin/claude/saas-achat-artisans-prompt-1lyihx` (ce qui
  est en ligne) : avance rapide, aucun conflit.
- Une seule migration nouvelle, ADDITIVE : `20261108090000_achats_groupes_v1` (5 tables neuves, 2 colonnes facultatives
  sur `company`, un index unique partiel). Testée sur base vierge (81 migrations, aucun écart avec le schéma) et sur une
  copie au schéma précédent avec données (données gardées, aucun écart) ; retour arrière testé (données gardées).
- Le réglage `ACHATS_GROUPES_V1` est COUPÉ par défaut : déployé tel quel, test.mobiiz.fr reste identique (routes V1 en
  404), seules les tables vides existent en plus. L'ancien code fonctionne sur le nouveau schéma.

## 1. Sauvegarde Neon de la base de test

```
cd baticlair
SAUVEGARDE_NOM=sauvegarde-avant-achats-groupes-v1 node docs/groupe/recette-en-ligne/sauvegarde-neon.mjs
SAUVEGARDE_NOM=sauvegarde-avant-achats-groupes-v1 node docs/groupe/recette-en-ligne/sauvegarde-neon.mjs --verifier
```

Le script copie la branche Neon de prévisualisation `preview/claude/saas-achat-artisans-prompt-1lyihx` (et refuse
toute autre branche, `main` comprise), puis vérifie la copie : mêmes tables, mêmes nombres de lignes, même dernière
migration (`20261107140000_conditions_negoce`). Il n'imprime ni clé ni chaîne de connexion. Noter l'identifiant `br-…`
de la sauvegarde dans `docs/retour-arriere-<date>.md`. (Le plafond de points d'accès Neon était atteint le 7 novembre :
la sauvegarde peut être créée sans point d'accès ; elle reste restaurable.)

## 2. Mise en ligne du code (prévisualisation de test)

```
git checkout claude/saas-achat-artisans-prompt-1lyihx
git merge --ff-only achats-groupes-v1
git push -u origin claude/saas-achat-artisans-prompt-1lyihx
```

Vercel construit les deux projets (`vercel.json` : seule cette branche `claude/**` se construit). Le build de l'API
lance, dans l'ordre : `garde-base-preview.mjs` (refuse une base qui serait celle de la production ; le journal doit dire
« Base de la prévisualisation : distincte de la production »), la construction du domaine, `prisma migrate deploy`
(applique `20261108090000_achats_groupes_v1` à la base de test seulement), puis la compilation.

Puis rattacher test.mobiiz.fr et api-test.mobiiz.fr aux deux nouveaux déploiements READY (Vercel › Deployments ›
« Assign domain », comme le 7 novembre), en notant les identifiants `dpl_…` d'avant pour le retour arrière.

## 3. Allumer la V1 sur test seulement (décision de Greg)

Dans Vercel, projet de l'API, variable `ACHATS_GROUPES_V1=on` en environnement **Preview**, limitée à la branche
`claude/saas-achat-artisans-prompt-1lyihx` (jamais Production), puis « Redeploy » du déploiement API. Pour couper :
retirer la variable (ou `off`) et redéployer ; les données restent.

## 4. Vérifications après déploiement

- `GET https://api-test.mobiiz.fr/v1/health` : OK ; `GET /v1/ag/etat` connecté : 404 si coupé, 200 si allumé.
- La dernière migration de la base de test est `20261108090000_achats_groupes_v1` (`sauvegarde-neon.mjs --verifier`
  compare au moment de la sauvegarde).
- Parcours rapide sur iPhone et ordinateur (scénario de `docs/achats-groupes-v1.md`).
- Aucun e-mail aux négoces : la V1 n'en envoie aucun ; les rappels ne partent que vers les artisans de test, et
  seulement si la tâche `GET /v1/internal/achats-groupes-v1/rappels` est appelée (aucune tâche planifiée ajoutée : les
  tâches planifiées Vercel ne tournent qu'en production).

## 5. Retour arrière

1. Code seul (cas courant) : remettre test.mobiiz.fr et api-test.mobiiz.fr sur les `dpl_…` d'avant (« Assign
   domain »), ou couper `ACHATS_GROUPES_V1`. Le schéma peut rester : il est additif.
2. Schéma (si on veut l'effacer) : la commande écrite en tête de la migration, sur la base de test seulement :
   `DROP TABLE "lot_ligne_v1", "offre_achat_groupe_v1", "historique_besoin_groupe_v1", "besoin_groupe_v1",
   "achat_groupe_v1"; ALTER TABLE "company" DROP COLUMN "habilitation_ag", DROP COLUMN "habilitation_ag_le";` puis
   `DELETE FROM _prisma_migrations WHERE migration_name = '20261108090000_achats_groupes_v1';` (testé en local).
3. Base abîmée : Neon › branche `preview/claude/saas-achat-artisans-prompt-1lyihx` › Restore depuis
   `sauvegarde-avant-achats-groupes-v1`, et revenir au code d'avant (1).
