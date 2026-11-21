# Point de retour du déploiement du 1er novembre 2026 (test.mobiiz.fr seulement)

Accord de Greg (1er novembre 2026) : déploiement sur l'environnement de test uniquement, après sauvegarde vérifiée et
suite complète au vert. Rien vers `main` (production), aucune donnée réelle touchée.

## Avant le déploiement

| Quoi | Valeur |
|---|---|
| Branche qui déploie test.mobiiz.fr | `claude/saas-achat-artisans-prompt-1lyihx` (déploiements « preview » Vercel de cette branche) |
| Commit en ligne avant | `ca00ab74` |
| Déploiement web en ligne avant | `dpl_3CNFpUNtchDb6CiDTQRZ4wdzYSn5` (projet `baticlair`, READY) |
| Déploiement API en ligne avant | `dpl_6rtsuArHM51xfPRoC5CBicueCFrs` (projet `baticlair-api`, READY) |
| Base de test | Neon, projet `baticlair-db`, branche `preview/claude/saas-achat-artisans-prompt-1lyihx` (`br-small-haze-b28xtqpf`), pas la branche par défaut |
| Production (non touchée) | Neon `main` (`br-nameless-hall-b2ytiscj`, branche par défaut) ; Vercel, branche de production `main` |
| État de la base de test | 89 tables, 3 363 lignes, 71 migrations, dernière `20261031180000_pdf_modele_couleur` ; `liste_supprimee` absente ; 26 chantiers, 17 entreprises, 17 utilisateurs, 8 demandes de prix |
| Sauvegarde | branche Neon `sauvegarde-avant-mes-listes` (`br-holy-violet-b22k4vng`), parent `br-small-haze-b28xtqpf`, LSN `0/732CB88`, créée le 2026-11-01 à 11:10:03 UTC ; vérifiée (mêmes tables, mêmes nombres de lignes, même dernière migration) par `docs/groupe/recette-en-ligne/sauvegarde-neon.mjs --verifier` |

## Migration de ce déploiement

Une seule, ADDITIVE : `20261101090000_liste_supprimee` (création de la table `liste_supprimee`, un index unique, une
clé étrangère vers `company` avec suppression en cascade). Aucune colonne modifiée ni supprimée, aucune donnée existante
réécrite. L'ancien code l'ignore : revenir au code d'avant ne demande pas de toucher la base.

## Procédure de retour arrière

1. **Code** (suffit dans la plupart des cas) : sur la branche, `git revert --no-edit ca00ab74..HEAD` (un commit qui
   annule le lot, l'historique reste), puis `git push origin HEAD:claude/saas-achat-artisans-prompt-1lyihx`. Vercel
   redéploie l'état de `ca00ab74`. En urgence, sans attendre la construction : remettre l'alias de test.mobiiz.fr sur
   `dpl_3CNFpUNtchDb6CiDTQRZ4wdzYSn5` (web) et celui de l'API sur `dpl_6rtsuArHM51xfPRoC5CBicueCFrs` (Vercel,
   « Promote / Assign domain » du déploiement, ou `POST /v2/deployments/<id>/aliases`).
2. **Base** (seulement si des données de test ont été abîmées) : restaurer la branche de test depuis la sauvegarde,
   par l'API Neon `POST /projects/royal-mountain-39478482/branches/br-small-haze-b28xtqpf/restore` avec
   `{ "source_branch_id": "br-holy-violet-b22k4vng", "preserve_under_name": "preview-avant-retour" }` (l'état abîmé est
   gardé sous ce nom). Puis relancer la vérification et redéployer le code de `ca00ab74`. Jamais sur `main`.
3. La sauvegarde reste en place tant que Greg n'a pas validé le lot ; on ne la supprime qu'avec son accord.
