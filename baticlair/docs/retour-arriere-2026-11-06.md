# Point de retour du déploiement du 6 novembre 2026 (test.mobiiz.fr seulement)

Accord de Greg (6 novembre 2026, « Oui pour les 3 ») : sauvegarde Neon de la base de test, push de la branche de test,
vérification en ligne. Rien vers `main` (production), aucune donnée réelle touchée, pas de Stripe, aucun e-mail aux négoces.

## Avant le déploiement

| Quoi | Valeur |
|---|---|
| Branche qui déploie test.mobiiz.fr | `claude/saas-achat-artisans-prompt-1lyihx` (déploiements « preview » Vercel) |
| Commit en ligne avant | `7b4d79ae` |
| Déploiement web en ligne avant | `dpl_DSTvoc5KChtTEt7PRS3TsJzSnXXw` (projet `baticlair`, READY) |
| Déploiement API en ligne avant | `dpl_CjtC2qj2BizBYecxvtwZ1A5fppD7` (projet `baticlair-api`, READY) |
| Base de test | Neon `baticlair-db`, branche `preview/claude/saas-achat-artisans-prompt-1lyihx` (`br-small-haze-b28xtqpf`) |
| Production (non touchée) | Neon `main` (`br-nameless-hall-b2ytiscj`) ; Vercel, branche de production `main` |
| État de la base de test | 90 tables, 3 443 lignes, 72 migrations, dernière `20261101090000_liste_supprimee` |
| Sauvegarde | branche Neon `sauvegarde-avant-rapprochement` (`br-gentle-darkness-b2oznf20`), parent `br-small-haze-b28xtqpf`, LSN `0/7EBD378`, créée le 2026-11-06 à 13:19:22 UTC ; vérifiée (mêmes tables, mêmes nombres de lignes, même dernière migration) par `SAUVEGARDE_NOM=sauvegarde-avant-rapprochement node docs/groupe/recette-en-ligne/sauvegarde-neon.mjs --verifier` |

## Migrations de ce déploiement

Deux, ADDITIVES, appliquées par le build Vercel de l'API (`migrate:deploy`, après la garde `garde-base-preview`) :

- `20261102090000_specialites_negoces` : colonne `supplier.specialites` (tableau, vide par défaut) et colonne `price_request_recipient.instantane` (JSON, vide) ;
- `20261106090000_rapprochement_continu` : tables `ligne_rapprochement` et `proposition_rapprochement`.

Aucune colonne supprimée, aucune donnée existante réécrite. L'ancien code les ignore : revenir au code d'avant ne demande
pas de toucher la base.

## Procédure de retour arrière

1. **Code** : sur la branche, `git revert --no-edit 7b4d79ae..HEAD`, puis
   `git push origin HEAD:claude/saas-achat-artisans-prompt-1lyihx`. En urgence : remettre l'alias de test.mobiiz.fr sur
   `dpl_DSTvoc5KChtTEt7PRS3TsJzSnXXw` (web) et celui de l'API sur `dpl_CjtC2qj2BizBYecxvtwZ1A5fppD7`.
2. **Base** (seulement si des données de test ont été abîmées) : API Neon
   `POST /projects/royal-mountain-39478482/branches/br-small-haze-b28xtqpf/restore` avec
   `{ "source_branch_id": "br-gentle-darkness-b2oznf20", "preserve_under_name": "preview-avant-retour-0611" }`. Jamais sur `main`.
3. La sauvegarde reste en place tant que Greg n'a pas validé le lot ; on ne la supprime qu'avec son accord.
