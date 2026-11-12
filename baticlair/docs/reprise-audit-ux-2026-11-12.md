# Reprise : dossier de corrections UX du 12 novembre 2026

Source : « MOBIIZ — Dossier de corrections UX et produit » (Greg, 12 novembre 2026, 14 points, 22 captures) et la mission
en 5 lots. Ce fichier est LA première chose à lire à la reprise : vérifier le commit, puis reprendre au « Prochain geste ».

## Où
- Dossier : `/home/user/lovable/baticlair` · branche locale isolée `audit-ux-2026-11-12` (jamais poussée telle quelle).
- Base de départ : `4badcc4e` (branche de test `claude/saas-achat-artisans-prompt-1lyihx`, en ligne sur test.mobiiz.fr).
- Livraison : seulement quand TOUS les lots sûrs sont faits et la chaîne complète verte sur un commit exact ; alors
  avance rapide de la branche de test, push, attente des deux domaines, recette en ligne.

## Lots
| Lot | État |
|---|---|
| 1 Blocages et fiabilité | FAIT (commits locaux) |
| 2 Missions, aide, paramètres | non commencé |
| 3 Contenus, documents, MVP | non commencé |
| 4 Formules et facturation (test seulement) | non commencé |
| 5 Passe visuelle | non commencé |

## Fait
- Point 1 (case « Quels articles grouper ? ») : cause = la case d'un article « À préciser » était `disabled`, donc l'appui
  était ignoré en silence. Maintenant : l'appui dit ce qui manque, ouvre « Préciser », garde l'intention ; l'article se
  coche dès que la précision est complète. Fichiers : `apps/web/src/components/ag-v1-quantitatif.tsx`,
  `apps/web/e2e-ag-v1/achats-groupes-v1.spec.ts`. Test : `-g "depuis un quantitatif tapé|un seul circuit"` 6/6 (3 appareils).

- Point 2 (notifications) : cause = la pastille comptait toute action « À faire », impossible à lire ni à retirer.
  Maintenant : pastille = seulement du nouveau pas encore vu (état gardé par le serveur), ligne retirable par glissement
  ou bouton, « Annuler ». Migration additive `20261112200000_notifications_etat` (colonne `alerte_courte.supprimee_le`,
  table `etat_a_faire`). Fichiers : `apps/api/src/modules/missions/{application/boite.service.ts,http/missions.controller.ts}`,
  `apps/web/src/components/notifications.tsx` (nouveau), `apps/web/src/lib/notifications.ts`, `Cloche` dans
  `achat-groupe.tsx`. Tests : `apps/api/test/notifications-cycle.test.ts` 3/3 ; `e2e-ag-v1/notifications.spec.ts` 3/3.
- Point 3 (rattachement + « Mes reçus ») : l'étiquette sécurisée classe toujours seule. Sans repère : Mobiiz PROPOSE la
  demande (même adresse, ou même nom de domaine s'il désigne un seul négoce, jamais une messagerie grand public), dit
  pourquoi, l'artisan confirme ; « Ce n'est pas la bonne demande » corrige sans doublon de devis. `/recus` devient
  « Réponses à classer » ; « Messages et réponses » montre « N réponses à classer » en tête et l'état de chaque réponse.
  Fichiers : `reponses-recues.service.ts`, `adresse-mobiiz.controller.ts`, `recus.tsx`, `app/(app)/recus/page.tsx`,
  `messages.tsx`. Tests : `apps/api/test/adresse-mobiiz.test.ts` 20/20 ; `e2e/adresse-mobiiz.spec.ts -g R7` 4/4 ;
  `e2e-ag-v1/missions` 15/15.

## Rappels techniques
- Les e2e tournent sur le site CONSTRUIT : `pnpm -s build` dans `apps/web` avant chaque passe, puis
  `fuser -k 3000/tcp 4000/tcp`.
- e2e activés : `CI=true E2E_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/baticlair_e2e PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test -c playwright.ag-v1.config.ts --trace off`.
- Chaîne complète : voir `docs/REPRISE.md`.

## Interdits (toujours)
Production, `main`, e-mail réel, paiement réel, appel IA payant, suppression de données, Stripe en production, document
juridique validé, règles de facturation réelles : rien sans l'accord explicite de Greg.

## Prochain geste
Lot 2 : lire les captures 6, 7, 8, 11, 12, 14 à 17 du dossier (`scratchpad/dossier-ux/x/word/media/`), puis formulaires
Missions (code postal ↔ commune, sélecteur de métier), filtres Missions sans défilement, fenêtre d'aide des
quantitatifs, menu du compte et « Profil et paramètres » sans doublons.
