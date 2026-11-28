# Point de retour : déploiement du 7 novembre 2026 sur test.mobiiz.fr (lots du prompt maître)

Accord de Greg (7 novembre 2026) : sauvegarde Neon de la base de TEST, puis déploiement sur test.mobiiz.fr seulement.
Aucune production, aucune donnée réelle, aucune branche `main` touchée (`main` reste à 977823f0).

## Avant
- Commit en ligne avant : **e5d33e80** (déploiements READY `dpl_AzoP2b3RoUoVLLnTZvbcK6ZJcT3o` site, `dpl_4YBxSKADWdeGMy1o5va6Ny7j9VJs` API).
- Base de test : branche Neon `preview/claude/saas-achat-artisans-prompt-1lyihx` (`br-small-haze-b28xtqpf`) ; 92 tables,
  3 453 lignes, 74 migrations (dernière `20261106090000_rapprochement_continu`).
- Garde vérifiée dans le journal du dernier build API : « Base de la prévisualisation : distincte de la production ».
- Sauvegarde : **`sauvegarde-avant-lots-prompt-maitre`** (`br-noisy-frog-b2wy0xkl`), copie de la branche de test au
  LSN 0/81EBDC0, le 2026-11-07 à 05:38 UTC ; vérifiée identique (tables, lignes, dernière migration).

## Migrations appliquées par ce déploiement (toutes ADDITIVES)
`20261107090000_parcours_negoce`, `20261107100000_reconfirmation_groupe`, `20261107110000_recherche_geographique`,
`20261107120000_supervision`, `20261107130000_collectes_mobiiz`. Chacune porte sa commande de retour arrière en tête.
L'ancien code (e5d33e80) fonctionne sur le nouveau schéma (colonnes avec valeur par défaut, tables nouvelles) : un retour
du code n'oblige PAS à restaurer la base.

## Retour arrière
1. **Code seul (cas courant)** : remettre test.mobiiz.fr et api-test.mobiiz.fr sur les déploiements d'avant, sans réécrire
   l'historique : Vercel › projet › Deployments › `dpl_AzoP2b3RoUoVLLnTZvbcK6ZJcT3o` (site) et
   `dpl_4YBxSKADWdeGMy1o5va6Ny7j9VJs` (API) › « Assign domain » test.mobiiz.fr / api-test.mobiiz.fr (ou l'API
   `POST /v2/deployments/<id>/aliases`). Puis un commit qui annule (git revert) sur la branche de test.
2. **Base (seulement si des données de test sont abîmées)** : Neon › baticlair-db › branche
   `preview/claude/saas-achat-artisans-prompt-1lyihx` › Restore › depuis `sauvegarde-avant-lots-prompt-maitre`
   (l'état est copié ; la branche de production `main` n'est jamais visée). Revenir alors aussi au code d'avant (1).
3. Vérifier : `node docs/groupe/recette-en-ligne/sauvegarde-neon.mjs --verifier` (nom `SAUVEGARDE_NOM`) et les contrôles
   en ligne du rapport.
