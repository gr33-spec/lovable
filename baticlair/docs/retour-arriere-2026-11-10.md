# Retour arrière du déploiement du 10 novembre 2026 (interface et parcours complets, test.mobiiz.fr seulement)

Rien ici ne concerne la production (branche git `main`, branche Neon `main`, mobiiz.fr).

## Avant ce déploiement

- En ligne sur test.mobiiz.fr : commit `fd157e1c`, site `dpl_CUeFuCfJ1rv6hhBkCmqhWfqyW3yj`, API `dpl_FbNKMJP9f7T9mWNkyt9tS9pECfEy`.
- Base de test (branche Neon `preview/claude/saas-achat-artisans-prompt-1lyihx`, `br-small-haze-b28xtqpf`) : 99 tables,
  5 056 lignes, dernière migration `20261108090000_achats_groupes_v1`, relevé le 10 novembre 2026 à 22 h 53 UTC.
- SAUVEGARDE : Neon a refusé une nouvelle branche de sauvegarde (plafond de 10 branches atteint ; aucune suppression n'a été
  faite, faute d'accord). Le point de retour est donc l'HISTORIQUE de la branche de test : restauration possible à
  l'instant du relevé pendant 6 heures. Les sauvegardes des 1er, 6 et 7 novembre existent toujours.

## Dans l'ordre, du plus léger au plus lourd

1. Couper les missions : retirer la variable `MISSIONS_V1` de Vercel (projet de l'API, Preview, branche de test), puis
   redéployer l'API. Les routes répondent 404, l'onglet « Missions » et ses rubriques disparaissent, les données restent.
2. Remettre le déploiement précédent : rattacher `test.mobiiz.fr` au site `dpl_CUeFuCfJ1rv6hhBkCmqhWfqyW3yj` et
   `api-test.mobiiz.fr` à l'API `dpl_FbNKMJP9f7T9mWNkyt9tS9pECfEy`. L'ancien code fonctionne sur le nouveau schéma (les
   treize tables en plus ne sont jamais lues).
3. Laisser les tables en place. Elles sont nouvelles et vides de toute donnée d'avant.
4. SEULEMENT SUR ACCORD EXPLICITE DE GREG : supprimer les treize tables (commande dans `docs/ux-complet.md`, partie 5), ou
   restaurer la branche de test à l'instant du relevé depuis la console Neon. Testé sur une copie locale : 25 entreprises
   et 7 e-mails reçus conservés après la migration, puis après le retour arrière.

## Après ce déploiement (état du 10 novembre 2026, 23 h 50 UTC)

- En ligne sur test.mobiiz.fr : commit `81409636`, site `dpl_FZUzof6me6hC8KRpyoTjrFcc4KgL`, API
  `dpl_J2WwqxXo83Q9SVaD8mAWASDWBy16` (rattachés à la main à `test.mobiiz.fr` et `api-test.mobiiz.fr`).
- `GET https://api-test.mobiiz.fr/v1/health` : `features.missions: true`.
- Base de test : 112 tables (les 99 d'avant et les 13 nouvelles), aucune table disparue. Seule `rate_limit` a perdu des
  lignes (18 → 16) : ce sont des compteurs de débit qui expirent seuls, pas des données.
- Un premier build de l'API (`b82864d9`) a échoué après avoir appliqué la migration : la compilation de l'hébergeur est en
  mode non strict. À VÉRIFIER AVANT CHAQUE POUSSÉE : `npx tsc -p tsconfig.vercel.json` dans `apps/api`.
