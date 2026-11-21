# Point de retour : achats groupés V1 sur test.mobiiz.fr (7 novembre 2026)

Accord de Greg (7 novembre 2026) : sauvegarde de la base de TEST, push sur la branche de test, déploiement sur
test.mobiiz.fr et api-test.mobiiz.fr seulement, `ACHATS_GROUPES_V1=on` en Preview seulement. Aucune production touchée :
ni la branche git `main`, ni le projet en production, ni la branche Neon `main` (`br-nameless-hall-b2ytiscj`).

## Avant
- Commit en ligne avant : **c99cdc12** ; déploiements `dpl_D2QxkH2qrqCcUe9DBocnVCCpCafg` (site) et
  `dpl_Azf8YX5vM9dTWSN3zNzEbaQmJgrL` (API).
- Sauvegarde : **`sauvegarde-avant-achats-groupes-v1`** (`br-dark-fire-b2ubpn97`), copie de la branche de test
  `br-small-haze-b28xtqpf` au LSN 0/8744540, le 2026-11-07 à 19:39 UTC. Schéma identique (comparaison Neon) ; les
  nombres de lignes n'ont PAS pu être comparés (plafond de points d'accès Neon atteint ; accepté par Greg).
- Branche Neon supprimée avec l'accord de Greg pour faire la place : `sauvegarde-test-2026-10-26-avant-lot-b`
  (`br-snowy-dew-b28tvroy`).

## Ce déploiement
- Commit **915cc04f** (branche `claude/saas-achat-artisans-prompt-1lyihx`, avance rapide depuis c99cdc12).
- Migration ADDITIVE `20261108090000_achats_groupes_v1` appliquée par le build de l'API à la base de test.
- Variable `ACHATS_GROUPES_V1=on` : projet `baticlair-api`, cible Preview, branche `claude/saas-achat-artisans-prompt-1lyihx`.

## Retour arrière (dans l'ordre, sans rien détruire)
1. Couper le réglage : supprimer la variable `ACHATS_GROUPES_V1` (Preview) puis redéployer l'API : les routes `/v1/ag`
   répondent 404, l'application redevient celle d'avant, les tables restent (additives).
2. Code : remettre test.mobiiz.fr et api-test.mobiiz.fr sur `dpl_D2QxkH2qrqCcUe9DBocnVCCpCafg` et
   `dpl_Azf8YX5vM9dTWSN3zNzEbaQmJgrL` (« Assign domain », ou `POST /v2/deployments/<id>/aliases`). L'ancien code
   fonctionne sur le nouveau schéma.
3. Schéma ou base : seulement avec un nouvel accord de Greg (DROP écrit en tête de la migration ; Restore Neon depuis
   `br-dark-fire-b2ubpn97`).
